/**
 * Dashboard Page Component
 * 
 * This is the main dashboard page that displays business metrics, sales data,
 * inventory status, AI-generated insights, and a natural language query interface.
 * 
 * @module DashboardPage
 * @description Main dashboard with KPIs, charts, tables, and AI features
 * 
 * @see https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts
 */

// Import dashboard components
import { KpiCards } from "@/components/dashboard/KpiCards"
import { SalesChart } from "@/components/dashboard/SalesChart"
import { InventoryTable } from "@/components/dashboard/InventoryTable"
import { AiInsights } from "@/components/dashboard/AiInsights"
import { NlqChat } from "@/components/dashboard/NlqChat"

// Import Supabase client for database operations
import { supabase } from "@/lib/supabase"

// Import mock data as fallback when Supabase is not configured
import { salesData as mockSales, inventoryData as mockInventory, kpis as mockKpis } from "@/lib/mock-data"

/**
 * Cache Control Configuration
 * 
 * Setting revalidate to 0 disables static generation caching.
 * This ensures the dashboard always fetches fresh data on each request.
 * Use this for real-time data that changes frequently.
 */
export const revalidate = 0; // Disable caching to always fetch latest

/**
 * DashboardPage Component
 * 
 * Server component that fetches data from Supabase (or falls back to mock data)
 * and renders the complete dashboard with all visualizations.
 * 
 * @returns {Promise<JSX.Element>} The complete dashboard page
 */
export default async function DashboardPage() {
  // Fetch data from Supabase database tables
  // These queries fetch all records ordered by ID
  const { data: salesDataDb } = await supabase.from('sales_data').select('*').order('id');
  const { data: inventoryDataDb } = await supabase.from('inventory_data').select('*').order('id');
  const { data: kpisDb } = await supabase.from('kpis').select('*').order('id');

  /**
   * Data Fallback Logic
   * 
   * If Supabase is not configured or returns empty data, fall back to mock data.
   * This ensures the dashboard is functional for demonstration purposes
   * without requiring a full Supabase setup.
   */
  const salesData = salesDataDb?.length ? salesDataDb : mockSales;
  const inventoryData = inventoryDataDb?.length ? inventoryDataDb : mockInventory;
  const kpis = kpisDb?.length ? kpisDb : mockKpis;

  return (
    // Main container with vertical spacing
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-slate-500">
          Welcome back. Here's an overview of your business metrics and AI-driven insights.
        </p>
      </div>

      {/* AI Insights Engine - Generates actionable insights from data */}
      <AiInsights salesData={salesData} inventoryData={inventoryData} kpis={kpis} />
      
      {/* KPI Cards - Show key business metrics */}
      <KpiCards kpis={kpis} />

      {/* Two Column Layout: Sales Chart and Inventory Table */}
      <div className="grid gap-4 md:grid-cols-7">
        <SalesChart salesData={salesData} />
        <InventoryTable inventoryData={inventoryData} />
      </div>

      {/* Two Column Layout: NLQ Chat and Supabase Status */}
      <div className="grid gap-4 md:grid-cols-7">
        <NlqChat salesData={salesData} inventoryData={inventoryData} kpis={kpis} />
        
        {/* Supabase Integration Status Card */}
        <div className="col-span-full md:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 h-full flex flex-col justify-center items-center text-center text-slate-500 shadow-sm">
            <h3 className="font-medium text-slate-900 mb-2">Supabase Integration Ready</h3>
            <p className="text-sm max-w-xs mb-4">
              This dashboard is configured to connect to Supabase. Add your URL and Anon Key to the environment variables to switch from mock data to live data.
            </p>
            {/* Connection Status Indicator */}
            <div className="flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-slate-100">
              {/* Green dot if connected, amber if using mock data */}
              <span className={`h-2 w-2 rounded-full ${salesDataDb?.length ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              {salesDataDb?.length ? 'Connected to Supabase' : 'Using Mock Data'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
