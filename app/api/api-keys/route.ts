/**
 * API Keys — Create endpoint (POST /api/api-keys)
 *
 * Validates the request body, enforces the org's plan key limit, generates a
 * new key, persists the hash (never the plaintext), and returns the plaintext
 * exactly once so the caller can display it. CSRF-protected.
 *
 * @module ApiKeysCreateRoute
 */
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { checkCsrf } from '@/lib/security/csrf';
import { requireOrgApi } from '@/lib/auth/requireOrg';
import { generateApiKey, API_KEY_PREFIX } from '@/lib/auth/apiKeyAuth';
import { getOrgPlan } from '@/lib/billing/limits';
import { logAudit } from '@/lib/audit/log';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Body schema — name is required and bounded to a sane length.
const createSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(50, 'Name must be 50 characters or fewer'),
});

export async function POST(req: Request) {
  // CSRF: requires the custom x-requested-with header from our own client.
  const csrfError = checkCsrf(req);
  if (csrfError) return csrfError;

  // Auth + permission gate.
  const auth = await requireOrgApi('apikeys:manage');
  if ('error' in auth) return auth.error;
  const { ctx } = auth;

  // Parse + validate body.
  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0]?.message ?? 'Invalid input' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Plan limit: count active (not revoked) keys and compare to the plan cap.
  const { plan } = await getOrgPlan(ctx.orgId);
  const planLimit = plan.apiKeys;
  if (planLimit <= 0) {
    return NextResponse.json({ error: 'API keys are not available on your plan' }, { status: 403 });
  }
  const { count } = await supabaseAdmin
    .from('api_keys')
    .select('*', { count: 'exact', head: true })
    .eq('org_id', ctx.orgId)
    .is('revoked_at', null);
  if ((count ?? 0) >= planLimit) {
    return NextResponse.json(
      { error: `Plan limit reached (${planLimit} active key${planLimit === 1 ? '' : 's'})` },
      { status: 403 },
    );
  }

  // Generate the keypair (plaintext + sha256 hash + short prefix).
  const { plaintext, prefix, hash } = generateApiKey();

  // Persist only the hash + prefix; the plaintext is returned once below.
  const { data: row, error } = await supabaseAdmin
    .from('api_keys')
    .insert({
      org_id: ctx.orgId,
      name: body.name,
      hashed_key: hash,
      prefix,
    })
    .select('id, name, prefix')
    .single();

  if (error || !row) {
    return NextResponse.json({ error: 'Failed to create key' }, { status: 500 });
  }

  // Audit the creation (prefix only — never the plaintext or hash).
  await logAudit({
    orgId: ctx.orgId,
    userId: ctx.userId,
    action: 'apikey.create',
    resource: `api_keys/${row.id}`,
    metadata: { name: body.name, prefix: `${API_KEY_PREFIX}${prefix}` },
  });

  // Plaintext is returned exactly once; the client must persist it.
  return NextResponse.json({ id: row.id, name: row.name, prefix: row.prefix, plaintext });
}
