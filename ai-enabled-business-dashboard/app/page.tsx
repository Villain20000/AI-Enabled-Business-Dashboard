import { KpiCards } from "@/components/dashboard/KpiCards"
import { SalesChart } from "@/components/dashboard/SalesChart"
import { InventoryTable } from "@/components/dashboard/InventoryTable"
import { AiInsights } from "@/components/dashboard/AiInsights"
import { NlqChat } from "@/components/dashboard/NlqChat"
import { supabase } from "@/lib/supabase"
import { salesData as mockSales, inventoryData as mockInventory, kpis as mockKpis } from "@/lib/mock-data"

export const revalidate = 0; // Disable caching to always fetch latest

export default async function DashboardPage() {
  // Fetch data from Supabase
  const { data: salesDataDb } = await supabase.from('sales_data').select('*').order('id');
  const { data: inventoryDataDb } = await supabase.from('inventory_data').select('*').order('id');
  const { data: kpisDb } = await supabase.from('kpis').select('*').order('id');

  // Fallback to mock data if Supabase is not configured or empty
  const salesData = salesDataDb?.length ? salesDataDb : mockSales;
  const inventoryData = inventoryDataDb?.length ? inventoryDataDb : mockInventory;
  const kpis = kpisDb?.length ? kpisDb : mockKpis;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-slate-500">
          Welcome back. Here's an overview of your business metrics and AI-driven insights.
        </p>
      </div>

      <AiInsights salesData={salesData} inventoryData={inventoryData} kpis={kpis} />
      
      <KpiCards kpis={kpis} />

      <div className="grid gap-4 md:grid-cols-7">
        <SalesChart salesData={salesData} />
        <InventoryTable inventoryData={inventoryData} />
      </div>

      <div className="grid gap-4 md:grid-cols-7">
        <NlqChat salesData={salesData} inventoryData={inventoryData} kpis={kpis} />
        <div className="col-span-full md:col-span-3">
          <div className="rounded-xl border border-slate-200 bg-white p-6 h-full flex flex-col justify-center items-center text-center text-slate-500 shadow-sm">
            <h3 className="font-medium text-slate-900 mb-2">Supabase Integration Ready</h3>
            <p className="text-sm max-w-xs mb-4">
              This dashboard is configured to connect to Supabase. Add your URL and Anon Key to the environment variables to switch from mock data to live data.
            </p>
            <div className="flex items-center gap-2 text-xs font-medium px-3 py-1 rounded-full bg-slate-100">
              <span className={`h-2 w-2 rounded-full ${salesDataDb?.length ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
              {salesDataDb?.length ? 'Connected to Supabase' : 'Using Mock Data'}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
