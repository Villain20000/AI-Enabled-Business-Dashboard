/**
 * Usage metering — records events for plan-limit enforcement + billing.
 *
 * @module lib/usage
 */
import { supabaseAdmin } from '@/lib/supabase/admin';

export type UsageEventType = 'ai_call' | 'api_call' | 'alert_check';

export async function recordUsage(orgId: string, eventType: UsageEventType): Promise<void> {
  try {
    await supabaseAdmin.from('usage_events').insert({
      org_id: orgId,
      event_type: eventType,
    });
  } catch (err) {
    console.error('usage record failed:', err);
  }
}
