/**
 * API Key Auth — authenticates public API requests (/api/v1/*) via
 * `Authorization: Bearer dcai_<prefix>_<secret>`. Keys are stored as
 * sha256 hashes; the plaintext is shown once at creation time.
 *
 * @module lib/auth/apiKeyAuth
 */
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { OrgMembership } from './rbac';

export const API_KEY_PREFIX = 'dcai_';

export function hashApiKey(plaintext: string): string {
  return createHash('sha256').update(plaintext).digest('hex');
}

export function generateApiKey(): { plaintext: string; prefix: string; hash: string } {
  const rand = createHash('sha256')
    .update(`${Date.now()}-${Math.random()}-${crypto.randomUUID()}`)
    .digest('hex');
  const prefix = rand.slice(0, 8);
  const secret = rand.slice(8, 40);
  const plaintext = `${API_KEY_PREFIX}${prefix}_${secret}`;
  const hash = hashApiKey(plaintext);
  return { plaintext, prefix, hash };
}

export interface ApiKeyAuthResult {
  ctx: OrgMembership & { keyId: string; keyName: string };
}

/**
 * Validate an incoming Bearer token against hashed api_keys.
 * Returns the org context (role: 'member') on success, or null.
 */
export async function authenticateApiKey(authHeader: string | null): Promise<ApiKeyAuthResult['ctx'] | null> {
  if (!authHeader) return null;
  const match = /^Bearer\s+(.+)$/.exec(authHeader);
  if (!match) return null;
  const token = match[1].trim();
  if (!token.startsWith(API_KEY_PREFIX)) return null;

  const hash = hashApiKey(token);
  const { data: keyRow } = await supabaseAdmin
    .from('api_keys')
    .select('id, name, org_id, revoked_at, organization:organizations(id, name, slug)')
    .eq('hashed_key', hash)
    .is('revoked_at', null)
    .single();

  if (!keyRow || !keyRow.organization) return null;

  // Update last_used_at (fire-and-forget)
  await supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRow.id);

  const org = keyRow.organization as unknown as { id: string; name: string; slug: string };
  return {
    orgId: org.id,
    orgName: org.name,
    orgSlug: org.slug,
    role: 'member',
    userId: 'api-key',
    userEmail: keyRow.name,
    keyId: keyRow.id,
    keyName: keyRow.name,
  };
}
