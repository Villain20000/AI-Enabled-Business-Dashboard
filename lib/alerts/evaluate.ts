/**
 * Pure alert evaluation helpers.
 *
 * @module lib/alerts/evaluate
 */

export type AlertCondition = '>' | '<' | '>=' | '<=' | '==';

export interface AlertRuleInput {
  id: string;
  kpi: string;
  condition: string;
  threshold: number;
  method: 'email' | 'slack';
  destination: string;
}

export interface AlertData {
  sales: Record<string, unknown>[];
  inventory: Record<string, unknown>[];
  kpis: Record<string, unknown>[];
}

function numberFrom(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = Number.parseFloat(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Resolve a rule's KPI name to a numeric value from the org's data.
 * Supports the dashboard's default KPI titles and common aliases.
 */
export function resolveMetric(kpi: string, data: AlertData): number | null {
  const label = kpi.toLowerCase();

  if (label.includes('revenue') || label.includes('sales')) {
    const total = data.sales.reduce((sum, row) => {
      const value = numberFrom(row.sales);
      return sum + (value ?? 0);
    }, 0);
    return data.sales.length > 0 ? total : null;
  }

  if (label.includes('inventory') || label.includes('stock')) {
    return data.inventory.filter((row) => {
      const status = String(row.status ?? '').toLowerCase();
      return status === 'low' || status === 'critical';
    }).length;
  }

  if (label.includes('user')) {
    const row = data.kpis.find((item) => String(item.title ?? '').toLowerCase().includes('user'));
    return row ? numberFrom(row.value) : null;
  }

  const row = data.kpis.find(
    (item) => String(item.title ?? '').toLowerCase() === label,
  );
  return row ? numberFrom(row.value) : null;
}

/** Compare a metric against a rule threshold. */
export function conditionMatches(
  value: number,
  condition: string,
  threshold: number,
): boolean {
  switch (condition) {
    case '>':
      return value > threshold;
    case '<':
      return value < threshold;
    case '>=':
      return value >= threshold;
    case '<=':
      return value <= threshold;
    case '==':
      return value === threshold;
    default:
      return false;
  }
}

export interface EvaluationResult {
  rule: AlertRuleInput;
  value: number | null;
  triggered: boolean;
}

/** Evaluate all rules against a single data snapshot. */
export function evaluateRules(
  rules: AlertRuleInput[],
  data: AlertData,
): EvaluationResult[] {
  return rules.map((rule) => {
    const value = resolveMetric(rule.kpi, data);
    return {
      rule,
      value,
      triggered: value !== null && conditionMatches(value, rule.condition, rule.threshold),
    };
  });
}
