'use client';

/**
 * Org picker client component.
 *
 * Switching writes the `active_org_id` cookie via /api/org/switch, then does a
 * full navigation so every server component re-resolves under the new tenant.
 *
 * @module app/select-org/OrgPicker
 */
import { useState } from 'react';
import { Building2, Loader2, ArrowRight } from 'lucide-react';
import type { OrgRole } from '@/lib/auth/roles';
import { apiFetch } from '@/lib/api/client';
import { useToast } from '@/components/ui/toast-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface OrgOption {
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
}

export default function OrgPicker({
  orgs,
  userEmail,
}: {
  orgs: OrgOption[];
  userEmail: string;
}) {
  const { addToast } = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function choose(orgId: string) {
    setBusyId(orgId);
    try {
      const res = await apiFetch('/api/org/switch', {
        method: 'POST',
        json: { orgId },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Unable to switch organization.');
      }
      window.location.href = '/dashboard';
    } catch (err) {
      addToast({
        title: 'Could not open organization',
        description: err instanceof Error ? err.message : 'Please try again.',
        type: 'error',
      });
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Choose an organization</CardTitle>
        <CardDescription>
          Signed in as {userEmail}. Pick the workspace you want to open.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {orgs.map((org) => (
          <button
            key={org.id}
            type="button"
            onClick={() => choose(org.id)}
            disabled={busyId !== null}
            className="flex w-full items-center justify-between rounded-lg border border-slate-200 p-4 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
                <Building2 className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-medium text-slate-900">{org.name}</span>
                <span className="block text-xs text-slate-500">
                  {org.slug} · {org.role}
                </span>
              </span>
            </span>
            {busyId === org.id ? (
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            ) : (
              <ArrowRight className="h-4 w-4 text-slate-400" />
            )}
          </button>
        ))}

        <div className="pt-2">
          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              window.location.href = '/onboarding?new=1';
            }}
            disabled={busyId !== null}
          >
            Create another organization
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
