/**
 * TeamView — client component for the team management page.
 *
 * Renders the member roster, an invite form, and the pending invitations list.
 * Mutating actions (invite / change role / remove / revoke) hit the
 * /api/team/* routes and reload the page on success so the server-fetched
 * roster stays authoritative. Action controls are gated by `can(role,
 * 'team:manage')`; the route handlers re-enforce RBAC regardless.
 *
 * @module app/(app)/team/TeamView
 */
'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Users, UserPlus, Trash2, Shield, Crown, Loader2, Mail } from 'lucide-react';
import { can, type OrgRole } from '@/lib/auth/roles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast-context';
import { cn } from '@/lib/utils';

export interface TeamMember {
  userId: string;
  email: string;
  role: OrgRole;
  createdAt: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: OrgRole;
  expiresAt: string;
}

export interface TeamViewProps {
  orgId: string;
  role: OrgRole;
  members: TeamMember[];
  invitations: TeamInvitation[];
}

const ROLE_BADGE: Record<OrgRole, string> = {
  owner: 'bg-amber-50 text-amber-700 border-amber-200',
  admin: 'bg-blue-50 text-blue-700 border-blue-200',
  member: 'bg-slate-100 text-slate-700 border-slate-200',
  viewer: 'bg-slate-50 text-slate-500 border-slate-200',
};

function RoleIcon({ role }: { role: OrgRole }) {
  if (role === 'owner') return <Crown className="h-3.5 w-3.5" />;
  if (role === 'admin') return <Shield className="h-3.5 w-3.5" />;
  return null;
}

function RoleBadge({ role }: { role: OrgRole }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium capitalize',
        ROLE_BADGE[role],
      )}
    >
      <RoleIcon role={role} />
      {role}
    </span>
  );
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export default function TeamView({ orgId, role, members, invitations }: TeamViewProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const [pending, startTransition] = useTransition();

  // Invite form state.
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'member' | 'admin'>('member');
  const [inviting, setInviting] = useState(false);

  // Per-row loading state for role changes / removals.
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [busyInviteId, setBusyInviteId] = useState<string | null>(null);

  const canManage = can(role, 'team:manage');

  /** Wrapper: run a mutation, toast the result, then refresh the roster. */
  async function runMutation(
    fn: () => Promise<Response>,
    okTitle: string,
    okDesc: string,
  ): Promise<boolean> {
    try {
      const res = await fn();
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        addToast({
          title: 'Error',
          description: data?.error ?? 'Request failed',
          type: 'error',
        });
        return false;
      }
      addToast({ title: okTitle, description: okDesc, type: 'success' });
      // Reload server-fetched roster.
      startTransition(() => router.refresh());
      return true;
    } catch (err) {
      addToast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Network error',
        type: 'error',
      });
      return false;
    }
  }

  /** POST /api/team/invite — create a new pending invitation. */
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    const ok = await runMutation(
      () =>
        fetch('/api/team/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
          body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
        }),
      'Invitation sent',
      `Invited ${inviteEmail.trim()} as ${inviteRole}.`,
    );
    if (ok) setInviteEmail('');
    setInviting(false);
  }

  /** PATCH /api/team/[userId] — change a member's role. */
  async function handleRoleChange(userId: string, newRole: 'admin' | 'member' | 'viewer') {
    setBusyUserId(userId);
    await runMutation(
      () =>
        fetch(`/api/team/${userId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-requested-with': 'XMLHttpRequest' },
          body: JSON.stringify({ role: newRole }),
        }),
      'Role updated',
      'Member role has been updated.',
    );
    setBusyUserId(null);
  }

  /** DELETE /api/team/[userId] — remove a member from the org. */
  async function handleRemove(userId: string, email: string) {
    if (!confirm(`Remove ${email || 'this member'} from the team?`)) return;
    setBusyUserId(userId);
    await runMutation(
      () =>
        fetch(`/api/team/${userId}`, {
          method: 'DELETE',
          headers: { 'x-requested-with': 'XMLHttpRequest' },
        }),
      'Member removed',
      `${email || 'Member'} has been removed.`,
    );
    setBusyUserId(null);
  }

  /** DELETE /api/team/invite/[id] — revoke a pending invitation. */
  async function handleRevoke(inviteId: string, email: string) {
    if (!confirm(`Revoke the invitation to ${email}?`)) return;
    setBusyInviteId(inviteId);
    await runMutation(
      () =>
        fetch(`/api/team/invite/${inviteId}`, {
          method: 'DELETE',
          headers: { 'x-requested-with': 'XMLHttpRequest' },
        }),
      'Invitation revoked',
      `Invitation to ${email} has been revoked.`,
    );
    setBusyInviteId(null);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      {/* Heading */}
      <div className="flex items-center gap-2">
        <Users className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Team</h1>
          <p className="text-sm text-slate-500">
            Manage members and invitations for this organization.
          </p>
        </div>
      </div>

      {/* Invite member card — admins only */}
      {canManage && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-blue-600" />
              Invite member
            </CardTitle>
            <CardDescription>
              Send an invitation to join this organization.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Email</label>
                <Input
                  type="email"
                  required
                  placeholder="teammate@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={inviting}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-600">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'member' | 'admin')}
                  disabled={inviting}
                  className="h-9 rounded-md border border-slate-200 bg-transparent px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button type="submit" disabled={inviting || pending} className="sm:w-auto">
                {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                Send invite
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Members list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members</CardTitle>
          <CardDescription>{members.length} member{members.length === 1 ? '' : 's'} in this organization.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="pb-2 pr-4 font-medium">Email</th>
                  <th className="pb-2 pr-4 font-medium">Role</th>
                  <th className="pb-2 pr-4 font-medium">Joined</th>
                  <th className="pb-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m) => {
                  const isOwner = m.role === 'owner';
                  const rowBusy = busyUserId === m.userId;
                  return (
                    <tr key={m.userId} className="group">
                      <td className="py-3 pr-4 text-slate-900">
                        {m.email || <span className="text-slate-400">Unknown email</span>}
                      </td>
                      <td className="py-3 pr-4">
                        <RoleBadge role={m.role} />
                      </td>
                      <td className="py-3 pr-4 text-slate-500">{formatDate(m.createdAt)}</td>
                      <td className="py-3 text-right">
                        {canManage && !isOwner ? (
                          <div className="flex items-center justify-end gap-2">
                            <select
                              value={m.role === 'viewer' ? 'viewer' : m.role === 'admin' ? 'admin' : 'member'}
                              onChange={(e) =>
                                handleRoleChange(
                                  m.userId,
                                  e.target.value as 'admin' | 'member' | 'viewer',
                                )
                              }
                              disabled={rowBusy || pending}
                              className="h-8 rounded-md border border-slate-200 bg-transparent px-2 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                            >
                              <option value="admin">Admin</option>
                              <option value="member">Member</option>
                              <option value="viewer">Viewer</option>
                            </select>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemove(m.userId, m.email)}
                              disabled={rowBusy || pending}
                              aria-label="Remove member"
                              className="text-slate-500 hover:text-rose-600"
                            >
                              {rowBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        ) : isOwner ? (
                          <span className="text-xs text-slate-400">Owner</span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pending invitations</CardTitle>
            <CardDescription>
              {invitations.length} pending invitation{invitations.length === 1 ? '' : 's'}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 pr-4 font-medium">Email</th>
                    <th className="pb-2 pr-4 font-medium">Role</th>
                    <th className="pb-2 pr-4 font-medium">Expires</th>
                    <th className="pb-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.map((inv) => {
                    const rowBusy = busyInviteId === inv.id;
                    return (
                      <tr key={inv.id}>
                        <td className="py-3 pr-4 text-slate-900">{inv.email}</td>
                        <td className="py-3 pr-4">
                          <RoleBadge role={inv.role} />
                        </td>
                        <td className="py-3 pr-4 text-slate-500">{formatDate(inv.expiresAt)}</td>
                        <td className="py-3 text-right">
                          {canManage && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevoke(inv.id, inv.email)}
                              disabled={rowBusy || pending}
                              className="text-slate-500 hover:text-rose-600"
                            >
                              {rowBusy ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                              Revoke
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
