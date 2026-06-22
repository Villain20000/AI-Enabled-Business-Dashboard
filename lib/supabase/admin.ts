/**
 * Admin Supabase Client (service role)
 *
 * Server-only. Bypasses RLS. Used for webhooks, invite emails, and
 * cross-tenant admin operations. NEVER import from a client component
 * and NEVER expose the service role key to the browser.
 *
 * @module lib/supabase/admin
 */
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'mock-key';

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
