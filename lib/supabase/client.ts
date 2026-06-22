/**
 * Browser Supabase Client
 *
 * Used by client components ("use client") for auth state, queries, and
 * mutations subject to RLS based on the current user's session.
 *
 * @module lib/supabase/client
 */
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

export const supabaseBrowser = createBrowserClient(supabaseUrl, supabaseAnonKey);
