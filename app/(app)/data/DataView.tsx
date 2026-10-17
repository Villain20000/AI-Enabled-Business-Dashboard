/**
 * DataView — client UI for CSV import/export and sample data.
 *
 * @module app/(app)/data/DataView
 */
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  Download,
  FileUp,
  Gauge,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast-context';
import { apiFetch } from '@/lib/api/client';
import { can, type OrgRole } from '@/lib/auth/roles';
import { IMPORT_KINDS, type ImportKind } from '@/lib/data/csv';

export interface ImportJobRow {
  id: string;
  kind: string;
  status: string;
  rowCount: number;
  errorCount: number;
  createdAt: string;
  completedAt: string | null;
}

export interface DataViewProps {
  role: OrgRole;
  counts: { sales: number; inventory: number; kpis: number };
  jobs: ImportJobRow[];
}

const KIND_LABEL: Record<ImportKind, string> = {
  sales: 'Sales',
  inventory: 'Inventory',
  kpis: 'KPIs',
};

export default function DataView({ role, counts, jobs }: DataViewProps) {
  const router = useRouter();
  const { addToast } = useToast();
  const canEdit = can(role, 'data:edit');

  const [kind, setKind] = useState<ImportKind>('sales');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadingSample, setLoadingSample] = useState(false);

  const totalRows = counts.sales + counts.inventory + counts.kpis;

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      addToast({ title: 'Choose a CSV file', description: 'Select a file before uploading.', type: 'error' });
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', file);
      form.set('kind', kind);
      const res = await apiFetch('/api/data/import', { method: 'POST', body: form });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const details = Array.isArray(data.errors)
          ? data.errors.slice(0, 3).map((error: { row: number; message: string }) => `Row ${error.row}: ${error.message}`).join(' ')
          : '';
        throw new Error(`${data.error ?? 'Import failed.'}${details ? ` ${details}` : ''}`);
      }

      addToast({
        title: 'Import complete',
        description: `${data.imported} ${KIND_LABEL[kind].toLowerCase()} row(s) imported.`,
        type: 'success',
      });
      setFile(null);
      router.refresh();
    } catch (err) {
      addToast({
        title: 'Import failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  }

  async function loadSample() {
    setLoadingSample(true);
    try {
      const res = await apiFetch('/api/data/sample', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Could not load sample data.');
      addToast({ title: 'Sample data loaded', description: 'The dashboard now has demo metrics.', type: 'success' });
      router.refresh();
    } catch (err) {
      addToast({
        title: 'Could not load sample data',
        description: err instanceof Error ? err.message : 'Please try again.',
        type: 'error',
      });
    } finally {
      setLoadingSample(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Data</h1>
        <p className="mt-1 text-sm text-slate-500">
          Import CSV data into this organization or export what is already here.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <CountCard icon={BarChart3} label="Sales rows" value={counts.sales} />
        <CountCard icon={Boxes} label="Inventory rows" value={counts.inventory} />
        <CountCard icon={Gauge} label="KPI rows" value={counts.kpis} />
      </div>

      {totalRows === 0 && (
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-slate-900">Your dashboard is empty</p>
              <p className="mt-1 text-sm text-slate-600">
                Import a CSV or load sample data to see charts and AI insights.
              </p>
            </div>
            {canEdit && (
              <Button onClick={loadSample} disabled={loadingSample}>
                {loadingSample ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Load sample data
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="h-4 w-4" /> Import CSV
            </CardTitle>
            <CardDescription>
              Upload up to 5,000 rows. Imports are all-or-nothing; fix validation errors and retry.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700">Data type</span>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as ImportKind)}
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                  >
                    {IMPORT_KINDS.map((value) => (
                      <option key={value} value={value}>
                        {KIND_LABEL[value]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium text-slate-700">CSV file</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                    className="block w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 file:mr-3 file:rounded file:border-0 file:bg-slate-100 file:px-2 file:py-1 file:text-xs file:font-medium"
                  />
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={uploading || !file}>
                  {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                  Import
                </Button>
                <a
                  href={`/api/data/template?kind=${kind}`}
                  className="inline-flex h-9 items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Download className="h-4 w-4" /> Download {KIND_LABEL[kind]} template
                </a>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Export
          </CardTitle>
          <CardDescription>Download the current organization’s rows as CSV.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {IMPORT_KINDS.map((value) => (
            <a
              key={value}
              href={`/api/data/export?kind=${value}`}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-4 w-4" /> {KIND_LABEL[value]}
            </a>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Import history</CardTitle>
          <CardDescription>Recent uploads for this organization.</CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">No imports yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                    <th className="pb-2 pr-4 font-medium">Type</th>
                    <th className="pb-2 pr-4 font-medium">Status</th>
                    <th className="pb-2 pr-4 font-medium">Rows</th>
                    <th className="pb-2 pr-4 font-medium">Errors</th>
                    <th className="pb-2 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="py-3 pr-4 capitalize text-slate-900">{job.kind}</td>
                      <td className="py-3 pr-4 capitalize text-slate-600">{job.status}</td>
                      <td className="py-3 pr-4 text-slate-600">{job.rowCount}</td>
                      <td className="py-3 pr-4 text-slate-600">{job.errorCount}</td>
                      <td className="py-3 text-slate-500">{new Date(job.createdAt).toLocaleString()}</td>
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

function CountCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{value.toLocaleString()}</p>
        </div>
        <Icon className="h-5 w-5 text-slate-400" />
      </CardContent>
    </Card>
  );
}
