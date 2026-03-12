import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function InventoryTable({ inventoryData }: { inventoryData: any[] }) {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Inventory Status</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {inventoryData.map((item) => (
            <div key={item.product} className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">{item.product}</p>
                <p className="text-sm text-slate-500">
                  Stock: {item.stock} units
                </p>
              </div>
              <div className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium",
                item.status === 'Healthy' ? "bg-emerald-100 text-emerald-700" :
                item.status === 'Low' ? "bg-amber-100 text-amber-700" :
                "bg-rose-100 text-rose-700"
              )}>
                {item.status}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
