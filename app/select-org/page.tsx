/**
 * Organization picker.
 *
 * Reached when an authenticated user belongs to at least one organization but
 * has no valid `active_org_id` cookie. This breaks the previous
 * dashboard/onboarding redirect loop and gives users an explicit choice.
 *
 * @module app/select-org/page
 */
import { redirect } from 'next/navigation';
import { Database } from 'lucide-react';
import { supabaseServer } from '@/lib/supabase/server';
import { listUserOrgs } from '@/lib/auth/rbac';
import OrgPicker from './OrgPicker';

export const revalidate = 0;

export default async function SelectOrgPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?redirect=/select-org');

  const orgs = await listUserOrgs();
  if (orgs.length === 0) redirect('/onboarding');

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Database className="h-7 w-7 text-blue-600" />
          <span className="text-xl font-semibold text-blue-600">DataCore AI</span>
        </div>
        <OrgPicker orgs={orgs} userEmail={user.email ?? ''} />
      </div>
    </div>
  );
}
