/**
 * Supabase Client Configuration
 * 
 * Initializes and exports a Supabase client instance for database operations.
 * Uses environment variables for configuration with mock fallbacks for development.
 * 
 * @module supabase
 * @description Supabase client initialization for database access
 * 
 * @see https://supabase.com/docs/library/getting-started
 */

// Import Supabase client creator from SDK
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase URL
 * 
 * The URL of your Supabase project.
 * Falls back to a mock URL when not configured.
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';

/**
 * Supabase Anon Key
 * 
 * The anonymous (public) key for your Supabase project.
 * Used for client-side database access.
 * Falls back to a mock key when not configured.
 */
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

/**
 * Create and Export Supabase Client
 * 
 * Initializes a single Supabase client instance that can be used
 * throughout the application for database queries and operations.
 * 
 * The client is configured with:
 * - auth: Disables auto-refreshing of sessions (handled by server in Next.js)
 * 
 * @type {SupabaseClient}
 * 
 * @example
 * ```typescript
 * // Fetch data from a table
 * const { data, error } = await supabase.from('sales_data').select('*');
 * 
 * // Insert new record
 * const { data, error } = await supabase.from('kpis').insert([{ title: 'New KPI', value: '100' }]);
 * ```
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
