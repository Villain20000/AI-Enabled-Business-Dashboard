/**
 * Org-Scoped Dashboard Page
 *
 * Migrated from the original single-user dashboard into the (app) route group.
 * Server Component that resolves the active org via requireOrg(), fetches
 * org-scoped sales / inventory / KPI rows from Supabase (RLS-scoped to the
 * current session), falls back to mock data for brand-new orgs, and renders
 * the dashboard with AI features gated by the org's plan.
 *
 * @module DashboardPage
 * @description Org-scoped, feature-gated business intelligence dashboard
 */
import Link from 'next/link';
import { Sparkles, Database } from 'lucide-react';

import { requireOrg } from '@/lib/auth/requireOrg';
import { supabaseServer } from '@/lib/supabase/server';
import { getOrgPlan } from '@/lib/billing/limits';
import {
  salesData as mockSales,
  inventoryData as mockInventory,
  kpis as mockKpis,
} from '@/lib/mock-data';

import { KpiCards } from '@/components/dashboard/KpiCards';
import { SalesChart } from '@/components/dashboard/SalesChart';
import { InventoryTable } from '@/components/dashboard/InventoryTable';
import { AiInsights } from '@/components/dashboard/AiInsights';
import { NlqChat } from '@/components/dashboard/NlqChat';

// Always render fresh per-request so org-scoped data + plan changes are reflected.
export const revalidate = 0;

export default async function DashboardPage() {
  // Resolve the active org context (redirects to /onboarding if none).
  const ctx = await requireOrg();

  // Fetch org-scoped data. RLS policies already restrict rows to the active
  // org; the explicit .eq('org_id', ...) is for clarity only.
  const supabase = await supabaseServer();
  const [{ data: salesDataDb }, { data: inventoryDataDb }, { data: kpisDb }] =
    await Promise.all([
      supabase.from('sales_data').select('*').eq('org_id', ctx.orgId).order('id'),
      supabase.from('inventory_data').select('*').eq('org_id', ctx.orgId).order('id'),
      supabase.from('kpis').select('*').eq('org_id', ctx.orgId).order('id'),
    ]);

  // Fall back to mock data for brand-new orgs with no rows yet.
  const salesData = salesDataDb?.length ? salesDataDb : mockSales;
  const inventoryData = inventoryDataDb?.length ? inventoryDataDb : mockInventory;
  const kpis = kpisDb?.length ? kpisDb : mockKpis;

  // Live data present -> "connected"; otherwise mock fallback.
  const connected = Boolean(salesDataDb?.length || inventoryDataDb?.length || kpisDb?.length);

  // Resolve the org's plan + effective feature flags.
  const { plan, features } = await getOrgPlan(ctx.orgId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-slate-500">
          Welcome back to {ctx.orgName}. Here&apos;s an overview of your business
          metrics and AI-driven insights.
        </p>
      </div>

      {/* AI Insights — gated to plans with the ai_insights feature flag. */}
      {features.ai_insights ? (
        <AiInsights salesData={salesData} inventoryData={inventoryData} kpis={kpis} />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Sparkles className="mb-3 h-8 w-8 text-blue-500" />
            <h3 className="font-medium text-slate-900">AI Insights is a Pro feature</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Upgrade to a plan that includes AI Insights to analyze your sales,
              inventory, and KPIs for actionable recommendations.
            </p>
            <Link
              href="/billing"
              className="mt-4 inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Upgrade plan
            </Link>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <KpiCards kpis={kpis} />

      {/* Sales Chart + Inventory Table */}
      <div className="grid gap-4 md:grid-cols-7">
        <SalesChart salesData={salesData} />
        <InventoryTable inventoryData={inventoryData} />
      </div>

      {/* NLQ Chat (gated) + Data Connection status */}
      <div className="grid gap-4 md:grid-cols-7">
        {features.nlq ? (
          <NlqChat salesData={salesData} inventoryData={inventoryData} kpis={kpis} />
        ) : (
          <div className="col-span-full md:col-span-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col items-center justify-center text-center text-slate-500">
            <h3 className="font-medium text-slate-900">Natural Language Query unavailable</h3>
            <p className="mt-1 max-w-sm text-sm">
              NLQ is not enabled for your current plan.
            </p>
          </div>
        )}

        {/* Data Connection status card */}
        <div className="col-span-full md:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 h-full flex flex-col justify-center items-center text-center text-slate-500 shadow-sm">
            <Database className="mb-3 h-8 w-8 text-slate-400" />
            <h3 className="font-medium text-slate-900">{ctx.orgName}</h3>
            <p className="mt-1 text-sm">
              Plan: <span className="font-medium text-slate-900">{plan.name}</span>
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-slate-100">
              {/* Green dot when live data is present, amber when on mock fallback. */}
              <span
                className={`h-2 w-2 rounded-full ${
                  connected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
              {connected ? 'Connected to Supabase' : 'Using mock data'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
