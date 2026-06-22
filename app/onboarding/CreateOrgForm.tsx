/**
 * CreateOrgForm — client component for creating the user's first org.
 *
 * Submits the organization name to POST /api/org. The route handler creates
 * the org, adds the user as owner, and sets the active_org_id cookie, so on
 * success we simply navigate to /dashboard. Errors are surfaced via toasts.
 *
 * @module app/onboarding/CreateOrgForm
 */
'use client';

import { useState, FormEvent } from 'react';
import { Building2, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast-context';

export function CreateOrgForm({ userEmail }: { userEmail: string }) {
  const { addToast } = useToast();
  const [name, setName] = useState('My Company');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      addToast({ title: 'Name required', description: 'Please enter a workspace name.', type: 'error' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/org', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ name: trimmed }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Request failed (${res.status})`);
      }

      // API sets the active_org_id cookie; just navigate to the dashboard.
      window.location.href = '/dashboard';
    } catch (err) {
      setSubmitting(false);
      addToast({
        title: 'Could not create workspace',
        description: err instanceof Error ? err.message : 'Unexpected error.',
        type: 'error',
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Heading + brand mark */}
      <div className="flex flex-col items-center text-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-600 text-white">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            Welcome to DataCore AI
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Name your first workspace to get started.
          </p>
        </div>
      </div>

      {/* Organization name field */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="org-name" className="text-sm font-medium text-slate-700">
          Workspace name
        </label>
        <Input
          id="org-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="My Company"
          autoFocus
          disabled={submitting}
          maxLength={80}
        />
        {userEmail && (
          <p className="text-xs text-slate-400">Signed in as {userEmail}</p>
        )}
      </div>

      {/* Submit */}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Creating workspace...
          </>
        ) : (
          <>
            Create workspace
            <ArrowRight className="ml-2 h-4 w-4" />
          </>
        )}
      </Button>
    </form>
  );
}
