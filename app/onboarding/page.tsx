/**
 * Onboarding Page — first-run organization creation.
 *
 * Shown to authenticated users who do not yet belong to any organization.
 * Redirects unauthenticated users to /login and users who already have an
 * org to /dashboard. Otherwise renders a centered card containing the
 * CreateOrgForm client component, passing the user's email along.
 *
 * @module app/onboarding/page
 */
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { listUserOrgs } from '@/lib/auth/rbac';
import { Card, CardContent } from '@/components/ui/card';
import { CreateOrgForm } from './CreateOrgForm';

export default async function OnboardingPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Not signed in -> send to login.
  if (!user) {
    redirect('/login');
  }

  // Already belongs to at least one org -> skip onboarding.
  const orgs = await listUserOrgs();
  if (orgs.length > 0) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md">
        <Card>
          <CardContent className="p-6">
            {/* Client form handles submission + active-org cookie is set by the API */}
            <CreateOrgForm userEmail={user.email ?? ''} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
