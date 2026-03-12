/**
 * Sales Chart Component
 * 
 * Displays sales data vs targets in a bar chart format using Recharts library.
 * Allows visual comparison between actual sales and target values across months.
 * 
 * @module SalesChart
 * @description Bar chart showing sales performance vs targets
 */

// "use client" - This component uses client-side hooks and Recharts (which requires client rendering)
"use client"

// Import UI Card components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Import Recharts components for data visualization
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"

/**
 * SalesChart Component
 * 
 * Renders a responsive bar chart comparing actual sales to target values.
 * The chart displays:
 * - Monthly data on the X-axis
 * - Dollar values on the Y-axis
 * - Blue bars for actual sales
 * - Gray bars for targets
 * - Interactive tooltips on hover
 * 
 * @param {Object} props - Component props
 * @param {Array} props.salesData - Array of objects with month, sales, and target properties
 * @returns {JSX.Element} Bar chart component
 */
export function SalesChart({ salesData }: { salesData: any[] }) {
  return (
    // Card container for the chart
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Sales vs Target</CardTitle>
      </CardHeader>
      
      <CardContent className="pl-2">
        {/* Responsive container ensures chart scales to parent */}
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={salesData}>
            {/* X-Axis: Month labels */}
            <XAxis
              dataKey="month"
              stroke="#888888"    // Gray color for axis
              fontSize={12}       // Small font for readability
              tickLine={false}    // Hide tick marks
              axisLine={false}    // Hide axis line
            />
            
            {/* Y-Axis: Dollar amounts */}
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              // Format values as currency
              tickFormatter={(value) => `$${value}`}
            />
            
            {/* Interactive tooltip on hover */}
            <Tooltip 
              cursor={{fill: 'transparent'}}  // Transparent cursor highlight
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            
            {/* Legend for bar colors */}
            <Legend />
            
            {/* Actual Sales Bar - Blue */}
            <Bar dataKey="sales" fill="#2563eb" radius={[4, 4, 0, 0]} name="Actual Sales" />
            
            {/* Target Bar - Gray */}
            <Bar dataKey="target" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Target" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
