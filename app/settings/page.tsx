/**
 * Settings Page Component
 * 
 * This page allows users to configure automated alert rules for monitoring KPIs.
 * Users can create, view, and delete alert rules that trigger notifications
 * via email or Slack when specified thresholds are exceeded.
 * 
 * @module SettingsPage
 * @description Alert configuration and management interface
 * 
 * @see https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts
 */

// "use client" directive - This is a client component (uses React hooks and event handlers)
"use client"

// Import React hooks for state management and side effects
import { useState, useEffect } from "react"

// Import UI components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Import toast notification hook
import { useToast } from "@/components/ui/toast-context"

// Import Supabase client
import { supabase } from "@/lib/supabase"

// Import mock KPI data as fallback
import { kpis as mockKpis } from "@/lib/mock-data"

// Import icons from lucide-react
import { Bell, Mail, Slack, Trash2, Play, Plus, Loader2 } from "lucide-react"

/**
 * AlertRule Interface
 * 
 * Defines the structure of an alert rule object stored in the database.
 * Each rule specifies a KPI to monitor, a condition, threshold, and notification method.
 */
interface AlertRule {
  id: string;              // Unique identifier for the alert rule
  kpi: string;             // The KPI title to monitor
  condition: '>' | '<';    // Comparison operator (greater than or less than)
  threshold: number;      // Numeric threshold that triggers the alert
  method: 'email' | 'slack'; // Notification delivery method
  destination: string;    // Email address or Slack channel/webhook
}

/**
 * SettingsPage Component
 * 
 * Client component that provides a form for creating alert rules and a list
 * of active rules. Includes functionality to test alerts by running a check.
 * 
 * @returns {JSX.Element} The settings page with alert management interface
 */
export default function SettingsPage() {
  // Access toast notification system
  const { addToast } = useToast()
  
  // State for storing alert rules fetched from database
  const [alerts, setAlerts] = useState<AlertRule[]>([])
  
  // State for available KPIs (loaded from database or mock data)
  const [kpis, setKpis] = useState<any[]>(mockKpis)
  
  // Loading state for initial data fetch
  const [loadingData, setLoadingData] = useState(true)

  // Form state for creating new alerts
  const [newKpi, setNewKpi] = useState('')
  const [newCondition, setNewCondition] = useState<'>' | '<'>('>')
  const [newThreshold, setNewThreshold] = useState('')
  const [newMethod, setNewMethod] = useState<'email' | 'slack'>('email')
  const [newDestination, setNewDestination] = useState('')

  /**
   * Data Fetching Effect
   * 
   * On component mount, fetch KPIs and alert rules from Supabase.
   * Falls back to mock data if Supabase is not configured.
   */
  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch KPIs from database
        const { data: kpisDb } = await supabase.from('kpis').select('*').order('id');
        if (kpisDb?.length) {
          setKpis(kpisDb);
          setNewKpi(kpisDb[0].title);
        } else {
          setNewKpi(mockKpis[0].title);
        }

        // Fetch alert rules from database
        const { data: alertsDb } = await supabase.from('alert_rules').select('*').order('created_at');
        if (alertsDb?.length) {
          setAlerts(alertsDb);
        } else {
          // Fallback to mock alerts for demonstration
          setAlerts([
            { id: '1', kpi: 'Inventory Alerts', condition: '>', threshold: 10, method: 'slack', destination: '#supply-chain-alerts' },
            { id: '2', kpi: 'Total Revenue', condition: '<', threshold: 1000000, method: 'email', destination: 'manager@pfizer.com' }
          ])
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        setNewKpi(mockKpis[0].title);
      } finally {
        setLoadingData(false);
      }
    }
    fetchData();
  }, [])

  /**
   * Handle New Alert Creation
   * 
   * Validates form input, inserts new alert rule into database,
   * and updates the local state. Shows success/error toast notifications.
   * 
   * @param {React.FormEvent} e - Form submission event
   */
  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate required fields
    if (!newThreshold || !newDestination) {
      addToast({ title: "Missing fields", description: "Please fill in all fields to create an alert.", type: "error" })
      return
    }

    // Create new alert object
    const newAlert = {
      kpi: newKpi,
      condition: newCondition,
      threshold: Number(newThreshold),
      method: newMethod,
      destination: newDestination
    }

    try {
      // Attempt to insert into database
      const { data, error } = await supabase.from('alert_rules').insert([newAlert]).select()
      if (!error && data) {
        setAlerts([...alerts, data[0]])
      } else {
        // Fallback if DB insert fails - add with generated ID
        setAlerts([...alerts, { ...newAlert, id: Math.random().toString(36).substring(2, 9) } as AlertRule])
      }
    } catch (error) {
      // Fallback for any errors - add with generated ID
      setAlerts([...alerts, { ...newAlert, id: Math.random().toString(36).substring(2, 9) } as AlertRule])
    }

    // Reset form fields
    setNewThreshold('')
    setNewDestination('')
    
    // Show success notification
    addToast({ title: "Alert Created", description: `Monitoring ${newKpi} ${newCondition} ${newThreshold}`, type: "success" })
  }

  /**
   * Handle Alert Deletion
   * 
   * Removes an alert rule from the database and local state.
   * Shows confirmation toast notification.
   * 
   * @param {string} id - The ID of the alert to delete
   */
  const handleDeleteAlert = async (id: string) => {
    try {
      // Delete from database
      await supabase.from('alert_rules').delete().eq('id', id)
    } catch (error) {
      console.error("Error deleting alert:", error)
    }
    
    // Update local state to remove deleted alert
    setAlerts(alerts.filter(a => a.id !== id))
    
    // Show info notification
    addToast({ title: "Alert Deleted", description: "The notification rule has been removed.", type: "info" })
  }

  /**
   * Run Alert Check (Simulation)
   * 
   * Simulates the background job that would run in production.
   * Checks current KPI values against alert thresholds and triggers
   * notifications if thresholds are exceeded.
   */
  const runAlertCheck = () => {
    let triggeredCount = 0;

    // Iterate through all alert rules
    alerts.forEach(alert => {
      // Find the corresponding KPI data
      const kpiData = kpis.find(k => k.title === alert.kpi);
      if (!kpiData) return;

      // Parse KPI value (handle K and M suffixes for thousands/millions)
      let numValue = 0;
      const rawStr = kpiData.value.replace(/[^0-9.]/g, '');
      
      if (kpiData.value.includes('M')) {
        numValue = parseFloat(rawStr) * 1000000;
      } else if (kpiData.value.includes('K')) {
        numValue = parseFloat(rawStr) * 1000;
      } else {
        numValue = parseFloat(rawStr);
      }

      // Check if alert condition is met
      let isTriggered = false;
      if (alert.condition === '>') isTriggered = numValue > alert.threshold;
      if (alert.condition === '<') isTriggered = numValue < alert.threshold;

      // If triggered, show error notification
      if (isTriggered) {
        triggeredCount++;
        addToast({
          title: `🚨 Alert Triggered: ${alert.kpi}`,
          description: `Current value (${kpiData.value}) is ${alert.condition} ${alert.threshold}. Notification sent via ${alert.method.toUpperCase()} to ${alert.destination}.`,
          type: 'error'
        });
      }
    });

    // If no alerts triggered, show success notification
    if (triggeredCount === 0) {
      addToast({
        title: "Check Complete",
        description: "All KPIs are within normal thresholds. No alerts triggered.",
        type: "success"
      });
    }
  }

  // Show loading spinner while fetching initial data
  if (loadingData) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold tracking-tight">Alerts & Notifications</h2>
        <p className="text-slate-500">
          Configure automated alerts to monitor your KPIs and receive notifications via Email or Slack.
        </p>
      </div>

      {/* Two Column Layout: Create Form and Active Rules */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Create Alert Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600" />
              Create New Alert Rule
            </CardTitle>
            <CardDescription>Set thresholds for KPIs to trigger automated notifications.</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Alert Creation Form */}
            <form onSubmit={handleAddAlert} className="space-y-4">
              {/* KPI Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select KPI</label>
                <select 
                  className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                  value={newKpi}
                  onChange={(e) => setNewKpi(e.target.value)}
                >
                  {kpis.map(kpi => (
                    <option key={kpi.title} value={kpi.title}>{kpi.title}</option>
                  ))}
                </select>
              </div>

              {/* Condition and Threshold */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Condition</label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-slate-200 bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-blue-600"
                    value={newCondition}
                    onChange={(e) => setNewCondition(e.target.value as '>' | '<')}
                  >
                    <option value=">">&gt;</option>
                    <option value="<">&lt;</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Threshold Value</label>
                  <Input 
                    type="number" 
                    placeholder="e.g. 1000" 
                    value={newThreshold}
                    onChange={(e) => setNewThreshold(e.target.value)}
                  />
                </div>
              </div>

              {/* Notification Method Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Notification Method</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setNewMethod('email')}
                    className={`flex items-center justify-center gap-2 rounded-md border p-2 text-sm font-medium transition-colors ${newMethod === 'email' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <Mail className="h-4 w-4" /> Email
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewMethod('slack')}
                    className={`flex items-center justify-center gap-2 rounded-md border p-2 text-sm font-medium transition-colors ${newMethod === 'slack' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-50'}`}
                  >
                    <Slack className="h-4 w-4" /> Slack
                  </button>
                </div>
              </div>

              {/* Destination Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {newMethod === 'email' ? 'Email Address' : 'Slack Webhook / Channel'}
                </label>
                <Input 
                  type={newMethod === 'email' ? 'email' : 'text'} 
                  placeholder={newMethod === 'email' ? 'manager@pfizer.com' : '#alerts-channel'} 
                  value={newDestination}
                  onChange={(e) => setNewDestination(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <Button type="submit" className="w-full">
                <Plus className="mr-2 h-4 w-4" /> Add Alert Rule
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Active Alerts List */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Active Rules</CardTitle>
                <CardDescription>Currently monitoring {alerts.length} KPIs.</CardDescription>
              </div>
              <Button onClick={runAlertCheck} variant="outline" size="sm" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <Play className="mr-2 h-4 w-4" /> Run Check Now
              </Button>
            </CardHeader>
            <CardContent>
              {/* Empty State */}
              {alerts.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm border-2 border-dashed rounded-lg">
                  No active alert rules.
                </div>
              ) : (
                /* Alert Rules List */
                <div className="space-y-3">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg bg-white shadow-sm">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-medium text-sm">
                          <span>{alert.kpi}</span>
                          <span className="text-slate-400">{alert.condition}</span>
                          <span className="text-blue-600">{alert.threshold.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          {alert.method === 'email' ? <Mail className="h-3 w-3" /> : <Slack className="h-3 w-3" />}
                          <span>{alert.destination}</span>
                        </div>
                      </div>
                      {/* Delete Button */}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteAlert(alert.id)}
                        className="text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* How It Works Explanation Card */}
          <Card className="bg-blue-50 border-blue-100">
            <CardContent className="p-4 text-sm text-blue-800">
              <strong>How this works:</strong> In a production environment, a background worker (e.g., Supabase Edge Functions + pg_cron) evaluates these rules every hour. For this demo, use the <strong>Run Check Now</strong> button to simulate the background job and trigger notifications.
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
