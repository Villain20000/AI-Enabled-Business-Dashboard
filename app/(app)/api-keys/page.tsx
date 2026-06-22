/**
 * API Keys Management Page (Server Component)
 *
 * Lists the org's API keys and gates the create/revoke UI by plan limit.
 * The interactive client view is rendered via <ApiKeysView/>. We never
 * select hashed_key — only display-safe columns.
 *
 * @module ApiKeysPage
 */
import { requireOrg } from '@/lib/auth/requireOrg';
import { supabaseServer } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/billing/limits';
import ApiKeysView from './ApiKeysView';

// Always render fresh — key state (revoked/created) must reflect immediately.
export const revalidate = 0;

/** Row shape passed to the client view (no hashed_key ever leaves the server). */
export interface ApiKeyRow {
  id: string;
  name: string;
  prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export default async function ApiKeysPage() {
  // Enforce membership + 'apikeys:manage' permission (redirects on failure).
  const ctx = await requireOrg('apikeys:manage');

  // Resolve the plan's API key cap (0 on free => upgrade banner).
  const { plan } = await getOrgPlan(ctx.orgId);
  const planLimit = plan.apiKeys;

  // Fetch display-safe columns only — never hashed_key.
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from('api_keys')
    .select('id, name, prefix, last_used_at, created_at, revoked_at')
    .eq('org_id', ctx.orgId)
    .order('created_at', { ascending: false });

  const keys: ApiKeyRow[] = (data ?? []) as ApiKeyRow[];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <ApiKeysView
        orgId={ctx.orgId}
        role={ctx.role}
        keys={keys}
        planLimit={planLimit}
      />
    </div>
  );
}
