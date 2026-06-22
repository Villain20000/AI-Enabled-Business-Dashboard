/**
 * AuditView — client view for the audit log page.
 *
 * Renders the heading, an action filter + page navigation bar, and a table of
 * audit entries. Prev/next navigation pushes updated query params via useRouter.
 *
 * @module app/(app)/audit/AuditView
 */
'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ScrollText, Search } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export interface AuditLogRow {
  id: string;
  action: string;
  resource: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  userEmail: string;
}

interface AuditViewProps {
  logs: AuditLogRow[];
  actions: string[];
  page: number;
  totalPages: number;
}

/** Format an ISO timestamp as a readable local string. */
function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function AuditView({ logs, actions, page, totalPages }: AuditViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentAction = searchParams.get('action') ?? '';

  /** Push a new page (and/or action filter) onto the URL. */
  function navigate(nextPage: number, action: string = currentAction) {
    const params = new URLSearchParams();
    if (nextPage > 1) params.set('page', String(nextPage));
    if (action) params.set('action', action);
    const qs = params.toString();
    router.push(qs ? `/audit?${qs}` : '/audit');
  }

  function onActionChange(value: string) {
    navigate(1, value);
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-blue-50 p-2 text-blue-600">
          <ScrollText className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Audit Log
          </h1>
          <p className="text-sm text-slate-500">
            A chronological record of mutating actions taken within this
            organization.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entries</CardTitle>
          <CardDescription>
            Filter by action or browse paginated history.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filter + pagination bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-slate-400" />
              <select
                value={currentAction}
                onChange={(e) => onActionChange(e.target.value)}
                className="h-9 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
              >
                <option value="">All actions</option>
                {actions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => navigate(page - 1)}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => navigate(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>

          {/* Table or empty state */}
          {logs.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 p-10 text-center">
              <p className="text-sm text-slate-500">No audit entries.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Time</th>
                    <th className="px-4 py-3 font-medium">User</th>
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Resource</th>
                    <th className="px-4 py-3 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                        {formatTime(row.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-slate-900">
                        {row.userEmail}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          {row.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-700">
                        {row.resource}
                      </td>
                      <td className="px-4 py-3">
                        {row.metadata &&
                        Object.keys(row.metadata).length > 0 ? (
                          <pre className="max-h-24 max-w-xs overflow-auto whitespace-pre-wrap break-all rounded bg-slate-50 p-2 font-mono text-xs text-slate-600">
                            {JSON.stringify(row.metadata)}
                          </pre>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
