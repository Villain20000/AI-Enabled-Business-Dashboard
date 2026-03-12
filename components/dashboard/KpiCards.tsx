/**
 * KPI Cards Component
 * 
 * Displays key performance indicators (KPIs) in a card format with icons,
 * values, and trend indicators showing month-over-month changes.
 * 
 * @module KpiCards
 * @description Card-based display of key business metrics
 */

// Import UI Card components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Import icons from lucide-react
import { ArrowDownRight, ArrowUpRight, DollarSign, Users, AlertTriangle } from "lucide-react"

/**
 * Icon Mapping
 * 
 * Maps KPI titles to their corresponding icons for visual representation.
 * Each KPI type gets a distinctive icon for quick visual identification.
 */
const icons = {
  'Total Revenue': DollarSign,    // Dollar icon for financial metrics
  'Active Users': Users,          // Users icon for engagement metrics
  'Inventory Alerts': AlertTriangle, // Warning icon for alerts
}

/**
 * KpiCards Component
 * 
 * Renders a grid of KPI cards, each displaying:
 * - A title (e.g., "Total Revenue")
 * - A formatted value (e.g., "$1.2M")
 * - Trend indicator (up/down arrow with percentage change)
 * 
 * @param {Object} props - Component props
 * @param {Array} props.kpis - Array of KPI objects with title, value, change, and trend
 * @returns {JSX.Element} Grid of KPI cards
 */
export function KpiCards({ kpis }: { kpis: any[] }) {
  return (
    // Three-column grid layout for KPI cards
    <div className="grid gap-4 md:grid-cols-3">
      {kpis.map((kpi) => {
        // Get the icon for this KPI based on its title
        const Icon = icons[kpi.title as keyof typeof icons]
        return (
          <Card key={kpi.title}>
            {/* Card Header with Title and Icon */}
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {kpi.title}
              </CardTitle>
              {/* Show icon if one is mapped for this KPI */}
              {Icon && <Icon className="h-4 w-4 text-slate-400" />}
            </CardHeader>
            
            {/* Card Content with Value and Trend */}
            <CardContent>
              {/* KPI Value */}
              <div className="text-2xl font-bold">{kpi.value}</div>
              
              {/* Trend Indicator */}
              <p className="text-xs text-slate-500 flex items-center mt-1">
                {/* Up or Down Arrow based on trend direction */}
                {kpi.trend === 'up' ? (
                  <ArrowUpRight className="mr-1 h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="mr-1 h-4 w-4 text-rose-500" />
                )}
                {/* Change percentage with color coding */}
                <span className={kpi.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}>
                  {kpi.change}
                </span>
                <span className="ml-1">from last month</span>
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
