"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles, Loader2 } from "lucide-react"

interface Insight {
  title: string;
  description: string;
}

export function AiInsights({ salesData, inventoryData, kpis }: { salesData: any[], inventoryData: any[], kpis: any[] }) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(false)

  const generateInsights = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { salesData, inventoryData, kpis } })
      })
      const data = await response.json()
      if (data.insights) {
        setInsights(data.insights)
      }
    } catch (error) {
      console.error("Failed to generate insights", error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center text-blue-600">
          <Sparkles className="mr-2 h-5 w-5" />
          AI Insights Engine
        </CardTitle>
        <Button onClick={generateInsights} disabled={loading} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generate Insights
        </Button>
      </CardHeader>
      <CardContent>
        {insights.length === 0 && !loading && (
          <div className="text-center py-6 text-slate-500 text-sm">
            Click the button above to analyze current dashboard data and generate actionable insights.
          </div>
        )}
        {insights.length > 0 && (
          <div className="grid gap-4 md:grid-cols-3">
            {insights.map((insight, i) => (
              <div key={i} className="rounded-lg border border-blue-100 bg-blue-50/50 p-4">
                <h4 className="font-semibold text-blue-900 mb-1">{insight.title}</h4>
                <p className="text-sm text-blue-800/80">{insight.description}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
