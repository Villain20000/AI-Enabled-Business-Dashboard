/**
 * Supabase Client (browser) — backward-compat re-export.
 *
 * Existing components import from "@/lib/supabase". This now re-exports the
 * SSR-aware browser client from lib/supabase/client so session cookies are
 * shared with the server client. For server contexts, import from
 * "@/lib/supabase/server" instead.
 *
 * @module lib/supabase
 */
export { supabaseBrowser as supabase } from './supabase/client';
