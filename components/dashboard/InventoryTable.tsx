/**
 * Inventory Table Component
 * 
 * Displays inventory status for products in a list format.
 * Shows product names, stock levels, and status badges (Healthy, Low, Critical).
 * 
 * @module InventoryTable
 * @description List view of product inventory with status indicators
 */

// Import UI Card components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Import utility function for conditional class names
import { cn } from "@/lib/utils"

/**
 * InventoryTable Component
 * 
 * Renders a list of products with their current stock levels and status.
 * Status badges are color-coded:
 * - Green (Healthy): Stock is good
 * - Amber (Low): Stock is running low
 * - Red (Critical): Stock is critically low
 * 
 * @param {Object} props - Component props
 * @param {Array} props.inventoryData - Array of inventory objects with product, stock, and status
 * @returns {JSX.Element} Inventory list component
 */
export function InventoryTable({ inventoryData }: { inventoryData: any[] }) {
  return (
    // Card container for the inventory list
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Inventory Status</CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Vertical list of inventory items */}
        <div className="space-y-4">
          {inventoryData.map((item) => (
            <div key={item.product} className="flex items-center justify-between">
              {/* Product Information */}
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">{item.product}</p>
                <p className="text-sm text-slate-500">
                  Stock: {item.stock} units
                </p>
              </div>
              
              {/* Status Badge */}
              <div className={cn(
                "px-2.5 py-0.5 rounded-full text-xs font-medium",
                // Conditional styling based on status
                item.status === 'Healthy' ? "bg-emerald-100 text-emerald-700" :  // Green for healthy
                item.status === 'Low' ? "bg-amber-100 text-amber-700" :          // Amber for low
                "bg-rose-100 text-rose-700"                                       // Red for critical
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
