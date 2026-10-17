/**
 * Alert runner.
 *
 * Fetches enabled rules and an org's data snapshot, evaluates thresholds, and
 * records/delivers notifications. Called by both the authenticated "Run check"
 * action and the cron endpoint.
 *
 * @module lib/alerts/run
 */
import { supabaseAdmin } from '@/lib/supabase/admin';
import { logAudit } from '@/lib/audit/log';
import { recordUsage } from '@/lib/usage';
import { deliverAlert } from './deliver';
import { evaluateRules, type AlertData, type AlertRuleInput } from './evaluate';

export interface AlertRunResult {
  ruleId: string;
  kpi: string;
  value: number | null;
  triggered: boolean;
  skippedCooldown: boolean;
  delivery: 'delivered' | 'failed' | 'skipped' | 'not_triggered';
  error?: string;
}

export interface AlertRunSummary {
  evaluated: number;
  triggered: number;
  delivered: number;
  results: AlertRunResult[];
}

/** Evaluate and deliver all enabled rules for one organization. */
export async function runAlertsForOrg(orgId: string): Promise<AlertRunSummary> {
  const { data: org } = await supabaseAdmin
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .maybeSingle();

  const { data: ruleRows, error: rulesError } = await supabaseAdmin
    .from('alert_rules')
    .select('id, kpi, condition, threshold, method, destination, enabled, last_triggered_at, cooldown_seconds')
    .eq('org_id', orgId)
    .eq('enabled', true);

  if (rulesError) throw new Error(rulesError.message);

  const rules = (ruleRows ?? []) as unknown as (AlertRuleInput & {
    enabled: boolean;
    last_triggered_at: string | null;
    cooldown_seconds: number;
  })[];

  const [{ data: sales }, { data: inventory }, { data: kpis }] = await Promise.all([
    supabaseAdmin.from('sales_data').select('*').eq('org_id', orgId),
    supabaseAdmin.from('inventory_data').select('*').eq('org_id', orgId),
    supabaseAdmin.from('kpis').select('*').eq('org_id', orgId),
  ]);

  const data: AlertData = {
    sales: (sales ?? []) as Record<string, unknown>[],
    inventory: (inventory ?? []) as Record<string, unknown>[],
    kpis: (kpis ?? []) as Record<string, unknown>[],
  };

  const evaluated = evaluateRules(rules, data);
  const results: AlertRunResult[] = [];
  const now = Date.now();

  for (const result of evaluated) {
    const rule = result.rule as AlertRuleInput & {
      last_triggered_at: string | null;
      cooldown_seconds: number;
    };

    await supabaseAdmin
      .from('alert_rules')
      .update({ last_checked_at: new Date().toISOString() })
      .eq('id', rule.id);

    if (!result.triggered) {
      results.push({
        ruleId: rule.id,
        kpi: rule.kpi,
        value: result.value,
        triggered: false,
        skippedCooldown: false,
        delivery: 'not_triggered',
      });
      continue;
    }

    const lastTriggered = rule.last_triggered_at
      ? new Date(rule.last_triggered_at).getTime()
      : 0;
    const cooldownMs = Math.max(0, Number(rule.cooldown_seconds ?? 3600)) * 1000;
    if (lastTriggered && now - lastTriggered < cooldownMs) {
      results.push({
        ruleId: rule.id,
        kpi: rule.kpi,
        value: result.value,
        triggered: true,
        skippedCooldown: true,
        delivery: 'skipped',
      });
      continue;
    }

    const { data: event } = await supabaseAdmin
      .from('alert_events')
      .insert({
        org_id: orgId,
        rule_id: rule.id,
        triggered_value: result.value,
        status: 'triggered',
        channel: rule.method,
        destination: rule.destination,
        payload: {
          kpi: rule.kpi,
          condition: rule.condition,
          threshold: rule.threshold,
          value: result.value,
        },
      })
      .select('id')
      .single();

    const delivery = await deliverAlert({
      orgName: org?.name ?? 'your organization',
      kpi: rule.kpi,
      condition: rule.condition,
      threshold: Number(rule.threshold),
      value: result.value ?? 0,
      destination: rule.destination,
      channel: rule.method,
    });

    const status = delivery.delivered ? 'delivered' : delivery.skipped ? 'skipped' : 'failed';
    if (event?.id) {
      await supabaseAdmin
        .from('alert_events')
        .update({
          status,
          error: delivery.error ?? null,
          delivered_at: delivery.delivered ? new Date().toISOString() : null,
        })
        .eq('id', event.id);
    }

    await supabaseAdmin
      .from('alert_rules')
      .update({ last_triggered_at: new Date().toISOString() })
      .eq('id', rule.id);

    await logAudit({
      orgId,
      userId: null,
      actorLabel: 'alert-runner',
      action: 'alert.triggered',
      resource: 'alert_rules',
      metadata: {
        ruleId: rule.id,
        kpi: rule.kpi,
        value: result.value,
        channel: rule.method,
        delivery: status,
      },
    });

    results.push({
      ruleId: rule.id,
      kpi: rule.kpi,
      value: result.value,
      triggered: true,
      skippedCooldown: false,
      delivery: status,
      error: delivery.error,
    });
  }

  await recordUsage(orgId, 'alert_check');

  return {
    evaluated: results.length,
    triggered: results.filter((result) => result.triggered && !result.skippedCooldown).length,
    delivered: results.filter((result) => result.delivery === 'delivered').length,
    results,
  };
}

/** Run alerts for every org that has at least one enabled rule. */
export async function runAlertsForAllOrgs(): Promise<Record<string, AlertRunSummary>> {
  const { data } = await supabaseAdmin
    .from('alert_rules')
    .select('org_id')
    .eq('enabled', true);

  const orgIds = Array.from(new Set((data ?? []).map((row) => row.org_id as string)));
  const summaries: Record<string, AlertRunSummary> = {};
  for (const orgId of orgIds) {
    summaries[orgId] = await runAlertsForOrg(orgId);
  }
  return summaries;
}
