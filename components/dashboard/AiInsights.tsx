/**
 * AI Insights Component
 * 
 * Provides an interface to generate AI-powered business insights from dashboard data.
 * Uses Google Gemini AI to analyze sales, inventory, and KPI data and return
 * actionable insights about trends, anomalies, and alerts.
 * 
 * @module AiInsights
 * @description AI-powered insights generation interface
 */

// "use client" - This component uses React state and fetches from API
"use client"

// Import React useState hook for managing component state
import { useState } from "react"

// Import UI components
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Import icons from lucide-react
import { Sparkles, Loader2 } from "lucide-react"

/**
 * Insight Interface
 * 
 * Defines the structure of an AI-generated insight object.
 * Each insight has a title and detailed description.
 */
interface Insight {
  title: string;
  description: string;
}

/**
 * AiInsights Component
 * 
 * Displays a card with a button to generate AI insights. When clicked,
 * it sends current dashboard data to the /api/insights endpoint and
 * displays the returned insights.
 * 
 * @param {Object} props - Component props
 * @param {Array} props.salesData - Sales data to analyze
 * @param {Array} props.inventoryData - Inventory data to analyze
 * @param {Array} props.kpis - KPI data to analyze
 * @returns {JSX.Element} AI insights generation interface
 */
export function AiInsights({ salesData, inventoryData, kpis }: { salesData: any[], inventoryData: any[], kpis: any[] }) {
  // State for storing generated insights
  const [insights, setInsights] = useState<Insight[]>([])
  
  // State for loading indicator
  const [loading, setLoading] = useState(false)

  /**
   * Generate Insights Handler
   * 
   * Fetches AI-generated insights from the server API.
   * Sends current dashboard data and displays returned insights.
   */
  const generateInsights = async () => {
    setLoading(true)
    try {
      // Call the insights API endpoint
      const response = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send all dashboard data for analysis
        body: JSON.stringify({ data: { salesData, inventoryData, kpis } })
      })
      
      // Parse response and update state
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
    // Full-width card for AI insights
    <Card className="col-span-full">
      <CardHeader className="flex flex-row items-center justify-between">
        {/* Title with Sparkle icon */}
        <CardTitle className="flex items-center text-blue-600">
          <Sparkles className="mr-2 h-5 w-5" />
          AI Insights Engine
        </CardTitle>
        
        {/* Generate Button */}
        <Button onClick={generateInsights} disabled={loading} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
          Generate Insights
        </Button>
      </CardHeader>
      
      <CardContent>
        {/* Empty State - Show when no insights generated yet */}
        {insights.length === 0 && !loading && (
          <div className="text-center py-6 text-slate-500 text-sm">
            Click the button above to analyze current dashboard data and generate actionable insights.
          </div>
        )}
        
        {/* Insights Display - Show when insights are available */}
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
