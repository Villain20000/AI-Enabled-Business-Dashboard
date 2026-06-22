/**
 * OrgSwitcher — dropdown for switching the active organization.
 *
 * Lists every org the user belongs to. Selecting one calls
 * `useOrg().switchOrg`, which POSTs to /api/org/switch (setting the
 * `active_org_id` cookie) and reloads the page so server data refreshes.
 *
 * @module components/app/org-switcher
 */
'use client';

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOrg } from '@/components/providers/OrgProvider';
import type { OrgRole } from '@/lib/auth/rbac';

export interface OrgOption {
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
}

export function OrgSwitcher({
  orgs,
  activeOrgId,
}: {
  orgs: OrgOption[];
  activeOrgId: string;
}) {
  const { switchOrg } = useOrg();
  const [open, setOpen] = useState(false);

  const active = orgs.find((o) => o.id === activeOrgId) ?? orgs[0];

  async function handleSelect(orgId: string) {
    setOpen(false);
    if (orgId !== activeOrgId) {
      await switchOrg(orgId);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors"
      >
        <span className="max-w-[160px] truncate">{active?.name ?? 'Select org'}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <>
          {/* Click-outside backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-40 mt-1 w-64 rounded-md border border-slate-200 bg-white shadow-lg">
            <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Your organizations
            </p>
            <ul className="max-h-72 overflow-y-auto py-1">
              {orgs.map((org) => (
                <li key={org.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(org.id)}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-slate-50',
                      org.id === activeOrgId
                        ? 'text-blue-700'
                        : 'text-slate-700',
                    )}
                  >
                    <span className="flex flex-col">
                      <span className="font-medium">{org.name}</span>
                      <span className="text-xs text-slate-400">{org.slug}</span>
                    </span>
                    {org.id === activeOrgId && <Check className="h-4 w-4" />}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
