"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { MessageSquare, Send, Bot, User } from "lucide-react"

interface Message {
  role: 'user' | 'ai';
  content: string;
}

export function NlqChat({ salesData, inventoryData, kpis }: { salesData: any[], inventoryData: any[], kpis: any[] }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'ai', content: 'Hello! I am your AI Data Assistant. Ask me anything about your sales, inventory, or KPIs.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg,
          contextData: { salesData, inventoryData, kpis }
        })
      })
      const data = await response.json()
      if (data.text) {
        setMessages(prev => [...prev, { role: 'ai', content: data.text }])
      }
    } catch (error) {
      console.error("Chat error", error)
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error processing your request.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="col-span-full md:col-span-4 flex flex-col h-[400px]">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="mr-2 h-5 w-5 text-slate-500" />
          Natural Language Query
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex items-start max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-100 text-blue-600 ml-2' : 'bg-slate-100 text-slate-600 mr-2'}`}>
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                <div className={`rounded-lg px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="flex items-start max-w-[85%] flex-row">
                <div className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 mr-2">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="rounded-lg px-3 py-2 text-sm bg-slate-100 text-slate-900 flex items-center">
                  <span className="animate-pulse">Thinking...</span>
                </div>
              </div>
            </div>
          )}
        </div>
        <form onSubmit={sendMessage} className="flex gap-2 mt-auto">
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="e.g., Which product has low stock?" 
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
