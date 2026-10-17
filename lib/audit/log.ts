/**
 * Audit logging — inserts a row into audit_logs for every mutating action.
 *
 * @module lib/audit/log
 */
import { supabaseAdmin } from '@/lib/supabase/admin';

export interface AuditEntry {
  orgId: string;
  /** Authenticated actor. Null for system/webhook actions. */
  userId?: string | null;
  /** Human-readable system actor, e.g. "stripe-webhook". */
  actorLabel?: string;
  action: string;
  resource: string;
  metadata?: Record<string, unknown>;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    await supabaseAdmin.from('audit_logs').insert({
      org_id: entry.orgId,
      user_id: entry.userId ?? null,
      actor_label: entry.actorLabel ?? null,
      action: entry.action,
      resource: entry.resource,
      metadata: entry.metadata ?? {},
    });
  } catch (err) {
    // Audit logging must never break the primary operation.
    console.error('audit log failed:', err);
  }
}
