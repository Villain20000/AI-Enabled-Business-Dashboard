/**
 * Row type aliases for the generated database schema.
 *
 * `types.ts` is generated from the migrations (`npm run db:types`) and should
 * not be edited by hand. These aliases give the rest of the app short names for
 * the table rows it passes around, so components never fall back to `any`.
 *
 * @module lib/supabase/rows
 */
import type { Database } from './types';

export type { Database };
export type { Json } from './types';

type PublicTables = Database['public']['Tables'];

/** Row returned by a `select('*')` on the given table. */
export type Row<T extends keyof PublicTables> = PublicTables[T]['Row'];

/** Insert payload accepted by the given table. */
export type Insert<T extends keyof PublicTables> = PublicTables[T]['Insert'];

/** Update payload accepted by the given table. */
export type Update<T extends keyof PublicTables> = PublicTables[T]['Update'];

// Business data shown on the dashboard and in the data manager.
export type SalesRow = Row<'sales_data'>;
export type InventoryRow = Row<'inventory_data'>;
export type KpiRow = Row<'kpis'>;

// Tenancy, access control, and audit.
//
// Tables whose page-level view models already define their own display type
// (audit_logs, import_jobs) intentionally have no alias here: use
// `Row<'audit_logs'>` / `Row<'import_jobs'>` when the raw row is needed, so a
// view model can never be confused with the database row.
export type OrganizationRow = Row<'organizations'>;
export type OrganizationMemberRow = Row<'organization_members'>;
export type OrganizationInvitationRow = Row<'organization_invitations'>;
export type ApiKeyRow = Row<'api_keys'>;
export type UsageEventRow = Row<'usage_events'>;

// Alerts and ingestion.
export type AlertRuleRow = Row<'alert_rules'>;
export type AlertEventRow = Row<'alert_events'>;
export type DataSourceRow = Row<'data_sources'>;

// AI persistence.
export type AiConversationRow = Row<'ai_conversations'>;
export type AiMessageRow = Row<'ai_messages'>;

/** The organization summary embedded in nested selects. */
export type OrganizationRef = Pick<OrganizationRow, 'id' | 'name' | 'slug'>;
