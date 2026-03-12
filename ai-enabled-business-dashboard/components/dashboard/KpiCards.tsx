import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowDownRight, ArrowUpRight, DollarSign, Users, AlertTriangle } from "lucide-react"

const icons = {
  'Total Revenue': DollarSign,
  'Active Users': Users,
  'Inventory Alerts': AlertTriangle,
}

export function KpiCards({ kpis }: { kpis: any[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {kpis.map((kpi) => {
        const Icon = icons[kpi.title as keyof typeof icons]
        return (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-slate-500">
                {kpi.title}
              </CardTitle>
              {Icon && <Icon className="h-4 w-4 text-slate-400" />}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className="text-xs text-slate-500 flex items-center mt-1">
                {kpi.trend === 'up' ? (
                  <ArrowUpRight className="mr-1 h-4 w-4 text-emerald-500" />
                ) : (
                  <ArrowDownRight className="mr-1 h-4 w-4 text-rose-500" />
                )}
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
