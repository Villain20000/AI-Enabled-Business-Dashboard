/**
 * ApiKeysView — interactive client view for the API Keys page.
 *
 * Renders the create-key form (gated by plan limit), the one-time plaintext
 * reveal banner, and the keys table with revoke actions. All mutations go
 * through the /api/api-keys route handlers (CSRF-protected).
 *
 * @module ApiKeysView
 */
'use client';

import * as React from 'react';
import Link from 'next/link';
import { KeyRound, Plus, Trash2, Copy, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/toast-context';
import type { ApiKeyRow } from './page';
import type { OrgRole } from '@/lib/auth/rbac';

export interface ApiKeysViewProps {
  orgId: string;
  role: OrgRole;
  keys: ApiKeyRow[];
  planLimit: number;
}

export default function ApiKeysView({ orgId, role, keys, planLimit }: ApiKeysViewProps) {
  const { addToast } = useToast();

  // Local copy of keys so revoke reflects immediately without a refetch.
  const [rows, setRows] = React.useState<ApiKeyRow[]>(keys);
  const [name, setName] = React.useState('');
  const [creating, setCreating] = React.useState(false);
  const [revokingId, setRevokingId] = React.useState<string | null>(null);

  // The plaintext returned once after creation; cleared on dismiss.
  const [newKey, setNewKey] = React.useState<{ plaintext: string; name: string } | null>(null);
  const [copied, setCopied] = React.useState(false);

  const activeCount = rows.filter((k) => !k.revoked_at).length;
  const limitReached = planLimit > 0 && activeCount >= planLimit;

  /** Create a new key via POST /api/api-keys. */
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    try {
      const res = await fetch('/api/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        addToast({ title: 'Failed to create key', description: data.error ?? 'Unknown error', type: 'error' });
        return;
      }
      // Prepend the new row and reveal the one-time plaintext.
      setRows((prev) => [
        {
          id: data.id,
          name: data.name,
          prefix: data.prefix,
          last_used_at: null,
          created_at: new Date().toISOString(),
          revoked_at: null,
        },
        ...prev,
      ]);
      setNewKey({ plaintext: data.plaintext, name: data.name });
      setName('');
      addToast({ title: 'API key created', description: 'Copy it now — it will not be shown again.', type: 'success' });
    } catch {
      addToast({ title: 'Failed to create key', description: 'Network error', type: 'error' });
    } finally {
      setCreating(false);
    }
  }

  /** Revoke a key via DELETE /api/api-keys/[id]. */
  async function handleRevoke(id: string) {
    setRevokingId(id);
    try {
      const res = await fetch(`/api/api-keys/${id}`, {
        method: 'DELETE',
        headers: { 'x-requested-with': 'XMLHttpRequest' },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        addToast({ title: 'Failed to revoke key', description: data.error ?? 'Unknown error', type: 'error' });
        return;
      }
      // Mark revoked locally (row is retained for audit).
      setRows((prev) => prev.map((k) => (k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k)));
      addToast({ title: 'Key revoked', description: 'The key can no longer be used.', type: 'success' });
    } catch {
      addToast({ title: 'Failed to revoke key', description: 'Network error', type: 'error' });
    } finally {
      setRevokingId(null);
    }
  }

  async function copyPlaintext() {
    if (!newKey) return;
    try {
      await navigator.clipboard.writeText(newKey.plaintext);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      addToast({ title: 'Copy failed', description: 'Copy the key manually.', type: 'error' });
    }
  }

  return (
    <div className="space-y-6">
      {/* Heading */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">API Keys</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage keys used to authenticate requests to the public API. Keys are stored hashed and
          cannot be recovered once created.
        </p>
      </div>

      {/* Plan not entitled to API keys — show upgrade banner instead of the form. */}
      {planLimit === 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-start gap-3 p-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
            <div className="space-y-1">
              <p className="font-medium text-amber-900">API keys are not available on your plan</p>
              <p className="text-sm text-amber-800">
                Upgrade to a plan that includes API access to create and manage keys.
              </p>
              <Link
                href="/billing"
                className="mt-3 inline-flex h-8 items-center justify-center rounded-md bg-blue-600 px-3 text-xs font-medium text-white shadow hover:bg-blue-700"
              >
                Upgrade plan
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* One-time plaintext reveal — shown only right after creation. */}
          {newKey && (
            <Card className="border-blue-300 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <KeyRound className="h-4 w-4" />
                  Your new API key: {newKey.name}
                </CardTitle>
                <CardDescription className="text-blue-800">
                  Copy this key now. You will not see it again.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-white px-3 py-2">
                  <code className="flex-1 break-all font-mono text-sm text-slate-900">{newKey.plaintext}</code>
                  <Button size="sm" variant="outline" onClick={copyPlaintext}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setNewKey(null)}>
                  I have saved my key
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Create form */}
          <Card>
            <CardHeader>
              <CardTitle>Create new key</CardTitle>
              <CardDescription>
                Give your key a name to identify where it is used.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                  <label htmlFor="key-name" className="text-sm font-medium text-slate-700">
                    Key name
                  </label>
                  <Input
                    id="key-name"
                    placeholder="e.g. Production server"
                    maxLength={50}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={limitReached || creating}
                  />
                </div>
                <Button type="submit" disabled={limitReached || creating || !name.trim()}>
                  {creating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
                  Create key
                </Button>
              </form>
              {limitReached && (
                <p className="mt-2 text-sm text-amber-600">
                  You have reached your plan limit of {planLimit} active key{planLimit === 1 ? '' : 's'}.
                  Revoke an existing key or upgrade your plan.
                </p>
              )}
              <p className="mt-2 text-xs text-slate-500">
                {activeCount} of {planLimit} active keys used.
              </p>
            </CardContent>
          </Card>
        </>
      )}

      {/* Keys list */}
      <Card>
        <CardHeader>
          <CardTitle>Your keys</CardTitle>
          <CardDescription>Active and revoked keys for this organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">No API keys yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="py-2 pr-4 font-medium">Name</th>
                    <th className="py-2 pr-4 font-medium">Prefix</th>
                    <th className="py-2 pr-4 font-medium">Created</th>
                    <th className="py-2 pr-4 font-medium">Last used</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 pr-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((k) => {
                    const revoked = !!k.revoked_at;
                    return (
                      <tr key={k.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-3 pr-4 font-medium text-slate-900">{k.name}</td>
                        <td className="py-3 pr-4">
                          <code className="font-mono text-xs text-slate-600">dcai_{k.prefix}…</code>
                        </td>
                        <td className="py-3 pr-4 text-slate-600">
                          {new Date(k.created_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 pr-4 text-slate-600">
                          {k.last_used_at ? new Date(k.last_used_at).toLocaleDateString() : 'Never'}
                        </td>
                        <td className="py-3 pr-4">
                          {revoked ? (
                            <span className="inline-flex items-center rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700">
                              Revoked
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                              Active
                            </span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {!revoked && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleRevoke(k.id)}
                              disabled={revokingId === k.id}
                              className="text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            >
                              {revokingId === k.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                                  Revoke
                                </>
                              )}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
