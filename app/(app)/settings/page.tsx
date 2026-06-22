/**
 * Settings Page — server entry point.
 *
 * Renders the tabbed settings shell (Alerts / Profile / Organization) by
 * delegating to the client <SettingsView /> component. The server component
 * resolves the active org context via requireOrg() and passes org id, role,
 * and the signed-in user's email/name down as props so the client view can
 * scope its supabaseBrowser queries and gate actions by RBAC.
 *
 * @module app/(app)/settings/page
 */
import { requireOrg } from '@/lib/auth/requireOrg';
import { supabaseServer } from '@/lib/supabase/server';
import SettingsView from './SettingsView';

// Always render fresh — settings reflect live org/user state.
export const revalidate = 0;

export default async function SettingsPage() {
  const ctx = await requireOrg();

  // Resolve the signed-in user's display name from auth user_metadata so the
  // Profile tab can prefill it. requireOrg() exposes email but not the name.
  let userName = '';
  try {
    const supabase = await supabaseServer();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userName =
      (user?.user_metadata?.name as string | undefined) ??
      (user?.user_metadata?.full_name as string | undefined) ??
      '';
  } catch {
    // Non-fatal: the Profile tab simply starts with an empty name field.
  }

  return (
    <SettingsView
      orgId={ctx.orgId}
      orgName={ctx.orgName}
      role={ctx.role}
      userEmail={ctx.userEmail}
      userName={userName}
    />
  );
}
