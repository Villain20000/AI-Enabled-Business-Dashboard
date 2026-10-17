/**
 * App Shell Layout — chrome for all authenticated routes under (app).
 *
 * Server Component: resolves the session + active org, then renders the
 * sidebar (brand, nav, user menu) and main column (header with org switcher
 * + user menu, scrollable content). Wraps children in OrgProvider so client
 * components can read/switch the active org.
 *
 * @module app/(app)/layout
 */
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { Database } from 'lucide-react';
import { supabaseServer } from '@/lib/supabase/server';
import { listUserOrgs, getOrgMember } from '@/lib/auth/rbac';
import { OrgProvider } from '@/components/providers/OrgProvider';
import { SidebarNav } from '@/components/app/sidebar';
import { OrgSwitcher } from '@/components/app/org-switcher';
import { UserMenu } from '@/components/app/user-menu';
import { MobileNav } from '@/components/app/mobile-nav';

// Always render fresh so the session + active org stay current.
export const revalidate = 0;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Session check — unauthenticated users are sent to login.
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }

  // All orgs for the switcher dropdown and for fallback resolution.
  const orgs = await listUserOrgs();

  // Active org comes from the `active_org_id` cookie set by /api/org/switch.
  // If the cookie is missing or stale, send the user to the org picker rather
  // than onboarding (which would immediately redirect back to the dashboard and
  // create an infinite loop).
  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get('active_org_id')?.value;
  if (!activeOrgId) {
    redirect(orgs.length > 0 ? '/select-org' : '/onboarding');
  }

  // Validate membership for the active org.
  const membership = await getOrgMember(activeOrgId);
  if (!membership) {
    redirect(orgs.length > 0 ? '/select-org' : '/onboarding');
  }

  const { orgId, orgName, role, userEmail } = membership;

  return (
    <OrgProvider initial={{ orgId, orgName, role }}>
      <div className="flex h-screen w-full bg-slate-50">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col border-r border-slate-200 bg-white md:flex">
          {/* Brand */}
          <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
            <Database className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-semibold text-slate-900">DataCore AI</span>
            <span className="ml-auto rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
              Enterprise
            </span>
          </div>

          {/* Primary navigation (role-gated) */}
          <div className="flex-1 overflow-y-auto">
            <SidebarNav role={role} />
          </div>

          {/* Footer user menu */}
          <div className="border-t border-slate-200 p-3">
            <UserMenu userEmail={userEmail} role={role} />
          </div>
        </aside>

        {/* Main column */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top header */}
          <header className="flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4">
            <div className="flex items-center gap-1">
              <MobileNav role={role} userEmail={userEmail} />
              <OrgSwitcher orgs={orgs} activeOrgId={orgId} />
            </div>
            <div className="hidden sm:block">
              <UserMenu userEmail={userEmail} role={role} />
            </div>
          </header>

          {/* Page content */}
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-7xl">{children}</div>
          </main>
        </div>
      </div>
    </OrgProvider>
  );
}
