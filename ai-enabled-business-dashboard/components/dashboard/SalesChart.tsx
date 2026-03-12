"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"

export function SalesChart({ salesData }: { salesData: any[] }) {
  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Sales vs Target</CardTitle>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={salesData}>
            <XAxis
              dataKey="month"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `$${value}`}
            />
            <Tooltip 
              cursor={{fill: 'transparent'}}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
            />
            <Legend />
            <Bar dataKey="sales" fill="#2563eb" radius={[4, 4, 0, 0]} name="Actual Sales" />
            <Bar dataKey="target" fill="#94a3b8" radius={[4, 4, 0, 0]} name="Target" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
