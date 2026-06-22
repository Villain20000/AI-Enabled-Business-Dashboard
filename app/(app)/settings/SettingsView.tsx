/**
 * SettingsView — client-side tabbed settings shell.
 *
 * Renders three tabs (Alerts / Profile / Organization) for the active org.
 * Alert-rule CRUD is performed via supabaseBrowser (RLS scopes to the org),
 * profile/password updates go through supabaseBrowser.auth, and org rename
 * updates the `organizations` table. Mutating actions are gated by RBAC via
 * can(role, permission) and emit audit entries through the /api/audit route.
 *
 * @module app/(app)/settings/SettingsView
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Bell,
  Mail,
  Slack,
  Trash2,
  Play,
  Plus,
  Loader2,
  User,
  Building2,
  AlertTriangle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useToast } from '@/components/ui/toast-context';
import { supabaseBrowser } from '@/lib/supabase/client';
import { can, type OrgRole } from '@/lib/auth/roles';
import { kpis } from '@/lib/mock-data';

export interface SettingsViewProps {
  orgId: string;
  orgName: string;
  role: OrgRole;
  userEmail: string;
  userName: string;
}

type Tab = 'alerts' | 'profile' | 'organization';

type AlertMethod = 'email' | 'slack';

interface AlertRule {
  id: string;
  kpi: string;
  condition: string;
  threshold: number;
  method: AlertMethod;
  destination: string;
  org_id?: string;
}

const CONDITIONS = ['>', '<', '>=', '<=', '=='] as const;

/**
 * Fire-and-forget audit entry to the /api/audit route. The route resolves the
 * server session + active_org_id cookie, so only the action/resource/metadata
 * payload is required from the client.
 */
function recordAudit(
  action: string,
  resource: string,
  metadata: Record<string, unknown>,
): void {
  try {
    void fetch('/api/audit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      body: JSON.stringify({ action, resource, metadata }),
    });
  } catch {
    // Audit must never break the primary operation.
  }
}

export default function SettingsView({
  orgId,
  orgName,
  role,
  userEmail,
  userName,
}: SettingsViewProps) {
  const { addToast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('alerts');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage alerts, your profile, and organization settings.
        </p>
      </header>

      {/* Tab bar */}
      <div className="mb-6 flex gap-1 border-b border-slate-200">
        <TabButton
          active={activeTab === 'alerts'}
          onClick={() => setActiveTab('alerts')}
          icon={<Bell className="h-4 w-4" />}
          label="Alerts"
        />
        <TabButton
          active={activeTab === 'profile'}
          onClick={() => setActiveTab('profile')}
          icon={<User className="h-4 w-4" />}
          label="Profile"
        />
        <TabButton
          active={activeTab === 'organization'}
          onClick={() => setActiveTab('organization')}
          icon={<Building2 className="h-4 w-4" />}
          label="Organization"
        />
      </div>

      {activeTab === 'alerts' && (
        <AlertsTab orgId={orgId} role={role} addToast={addToast} />
      )}
      {activeTab === 'profile' && (
        <ProfileTab
          userEmail={userEmail}
          userName={userName}
          addToast={addToast}
        />
      )}
      {activeTab === 'organization' && (
        <OrganizationTab
          orgId={orgId}
          orgName={orgName}
          role={role}
          addToast={addToast}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Tab bar button                                                             */
/* -------------------------------------------------------------------------- */

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
        active
          ? 'border-blue-600 text-blue-600'
          : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Alerts tab                                                                 */
/* -------------------------------------------------------------------------- */

interface AlertsTabProps {
  orgId: string;
  role: OrgRole;
  addToast: (t: { title: string; description: string; type?: 'default' | 'error' | 'success' | 'info' }) => void;
}

function AlertsTab({ orgId, role, addToast }: AlertsTabProps) {
  const canManage = can(role, 'alerts:manage');

  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);

  // Form state
  const [kpi, setKpi] = useState(kpis[0]?.title ?? '');
  const [condition, setCondition] = useState<string>(CONDITIONS[0]);
  const [threshold, setThreshold] = useState<string>('');
  const [method, setMethod] = useState<AlertMethod>('email');
  const [destination, setDestination] = useState('');

  const loadRules = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabaseBrowser
      .from('alert_rules')
      .select('id, kpi, condition, threshold, method, destination, org_id')
      .eq('org_id', orgId)
      .order('created_at', { ascending: false });

    if (error) {
      addToast({
        title: 'Failed to load alert rules',
        description: error.message,
        type: 'error',
      });
    }
    setRules((data ?? []) as AlertRule[]);
    setLoading(false);
  }, [orgId, addToast]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await loadRules();
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    const thresholdNum = Number(threshold);
    if (!kpi || !destination || Number.isNaN(thresholdNum)) {
      addToast({
        title: 'Missing fields',
        description: 'KPI, threshold, and destination are required.',
        type: 'error',
      });
      return;
    }

    setSubmitting(true);
    const { data, error } = await supabaseBrowser
      .from('alert_rules')
      .insert({
        org_id: orgId,
        kpi,
        condition,
        threshold: thresholdNum,
        method,
        destination,
      })
      .select('id, kpi, condition, threshold, method, destination, org_id')
      .single();

    setSubmitting(false);

    if (error || !data) {
      addToast({
        title: 'Failed to create alert',
        description: error?.message ?? 'Unknown error',
        type: 'error',
      });
      return;
    }

    setRules((prev) => [data as AlertRule, ...prev]);
    recordAudit('alert.create', 'alert_rules', { kpi });
    addToast({
      title: 'Alert created',
      description: `Monitoring ${kpi} ${condition} ${thresholdNum}.`,
      type: 'success',
    });
    setThreshold('');
    setDestination('');
  }

  async function handleDelete(id: string, kpiName: string) {
    if (!canManage) return;
    const { error } = await supabaseBrowser
      .from('alert_rules')
      .delete()
      .eq('id', id);

    if (error) {
      addToast({
        title: 'Failed to delete alert',
        description: error.message,
        type: 'error',
      });
      return;
    }

    setRules((prev) => prev.filter((r) => r.id !== id));
    recordAudit('alert.delete', 'alert_rules', { kpi: kpiName });
    addToast({
      title: 'Alert removed',
      description: `Deleted alert for ${kpiName}.`,
      type: 'success',
    });
  }

  async function handleRunCheck() {
    setRunning(true);
    // Simulate an alert evaluation pass over the active rules.
    await new Promise((r) => setTimeout(r, 800));
    setRunning(false);

    if (rules.length === 0) {
      addToast({
        title: 'No alerts to check',
        description: 'Create an alert rule before running a check.',
        type: 'info',
      });
      return;
    }

    const triggered = rules[0];
    addToast({
      title: 'Check complete',
      description: `Evaluated ${rules.length} rule(s). Latest: ${triggered.kpi} ${triggered.condition} ${triggered.threshold}.`,
      type: 'success',
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Alert Rules
          </CardTitle>
          <CardDescription>
            Get notified when a KPI crosses a threshold.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {canManage ? (
            <form onSubmit={handleAdd} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label="KPI">
                  <select
                    value={kpi}
                    onChange={(e) => setKpi(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                  >
                    {kpis.map((k) => (
                      <option key={k.title} value={k.title}>
                        {k.title}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Condition">
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                  >
                    {CONDITIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Threshold">
                  <Input
                    type="number"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    placeholder="e.g. 1000"
                  />
                </Field>

                <Field label="Method">
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as AlertMethod)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                  >
                    <option value="email">Email</option>
                    <option value="slack">Slack</option>
                  </select>
                </Field>

                <Field label="Destination">
                  <Input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder={
                      method === 'email'
                        ? 'you@company.com'
                        : '#channel or webhook'
                    }
                  />
                </Field>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Add Alert
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRunCheck}
                  disabled={running}
                >
                  {running ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="mr-2 h-4 w-4" />
                  )}
                  Run Check Now
                </Button>
              </div>
            </form>
          ) : (
            <p className="text-sm text-slate-500">
              You need manager permissions to create or modify alert rules.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Active Rules</CardTitle>
          <CardDescription>
            {loading
              ? 'Loading...'
              : `${rules.length} rule(s) configured for this organization.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center text-sm text-slate-500">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading alert rules...
            </div>
          ) : rules.length === 0 ? (
            <p className="text-sm text-slate-500">
              No alert rules yet. Create one above to get started.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {rules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                      {rule.method === 'slack' ? (
                        <Slack className="h-4 w-4" />
                      ) : (
                        <Mail className="h-4 w-4" />
                      )}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {rule.kpi} {rule.condition} {rule.threshold}
                      </p>
                      <p className="text-xs text-slate-500">
                        {rule.method} &middot; {rule.destination}
                      </p>
                    </div>
                  </div>
                  {canManage && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(rule.id, rule.kpi)}
                      aria-label="Delete alert"
                    >
                      <Trash2 className="h-4 w-4 text-slate-500" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Profile tab                                                                */
/* -------------------------------------------------------------------------- */

interface ProfileTabProps {
  userEmail: string;
  userName: string;
  addToast: (t: { title: string; description: string; type?: 'default' | 'error' | 'success' | 'info' }) => void;
}

function ProfileTab({ userEmail, userName, addToast }: ProfileTabProps) {
  const [name, setName] = useState(userName);
  const [savingName, setSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingName(true);
    const { error } = await supabaseBrowser.auth.updateUser({
      data: { name },
    });
    setSavingName(false);

    if (error) {
      addToast({
        title: 'Profile update failed',
        description: error.message,
        type: 'error',
      });
      return;
    }
    addToast({
      title: 'Profile updated',
      description: 'Your display name has been saved.',
      type: 'success',
    });
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      addToast({
        title: 'Password too short',
        description: 'Use at least 6 characters.',
        type: 'error',
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast({
        title: 'Passwords do not match',
        description: 'Make sure the new password and confirmation match.',
        type: 'error',
      });
      return;
    }

    setSavingPassword(true);
    const { error } = await supabaseBrowser.auth.updateUser({
      password: newPassword,
    });
    setSavingPassword(false);

    if (error) {
      addToast({
        title: 'Password change failed',
        description: error.message,
        type: 'error',
      });
      return;
    }

    setNewPassword('');
    setConfirmPassword('');
    addToast({
      title: 'Password updated',
      description: 'Your password has been changed successfully.',
      type: 'success',
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </CardTitle>
          <CardDescription>
            Update your personal account information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <Field label="Email">
              <Input value={userEmail} readOnly disabled />
            </Field>
            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </Field>
            <Button type="submit" disabled={savingName}>
              {savingName && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update profile
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
          <CardDescription>
            Choose a new password for your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <Field label="New password">
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </Field>
            <Field label="Confirm password">
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
            </Field>
            <Button type="submit" disabled={savingPassword}>
              {savingPassword && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Change password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Organization tab                                                           */
/* -------------------------------------------------------------------------- */

interface OrganizationTabProps {
  orgId: string;
  orgName: string;
  role: OrgRole;
  addToast: (t: { title: string; description: string; type?: 'default' | 'error' | 'success' | 'info' }) => void;
}

function OrganizationTab({
  orgId,
  orgName,
  role,
  addToast,
}: OrganizationTabProps) {
  const canManage = can(role, 'org:manage');
  const [name, setName] = useState(orgName);
  const [saving, setSaving] = useState(false);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!canManage) return;
    if (!name.trim()) {
      addToast({
        title: 'Name required',
        description: 'Organization name cannot be empty.',
        type: 'error',
      });
      return;
    }

    setSaving(true);
    const { error } = await supabaseBrowser
      .from('organizations')
      .update({ name: name.trim() })
      .eq('id', orgId);
    setSaving(false);

    if (error) {
      addToast({
        title: 'Rename failed',
        description: error.message,
        type: 'error',
      });
      return;
    }

    recordAudit('org.rename', 'organizations', { name: name.trim() });
    addToast({
      title: 'Organization renamed',
      description: `Now known as "${name.trim()}".`,
      type: 'success',
    });
  }

  if (!canManage) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          <p className="text-sm font-medium text-slate-900">
            You don&apos;t have permission
          </p>
          <p className="text-sm text-slate-500">
            Only organization owners can manage organization settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Organization
          </CardTitle>
          <CardDescription>
            Rename your organization. This is visible to all members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRename} className="space-y-4">
            <Field label="Organization ID">
              <Input value={orgId} readOnly disabled />
            </Field>
            <Field label="Organization name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Organization name"
              />
            </Field>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Rename organization
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-rose-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="h-4 w-4" />
            Danger zone
          </CardTitle>
          <CardDescription>
            Irreversible and destructive actions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 rounded-md border border-rose-200 bg-rose-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-rose-900">
                Delete this organization
              </p>
              <p className="text-sm text-rose-700">
                Deleting an organization is irreversible and removes all data.
                This action is handled by support.
              </p>
            </div>
            <Button variant="secondary" disabled>
              Delete organization
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Shared field wrapper                                                       */
/* -------------------------------------------------------------------------- */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
