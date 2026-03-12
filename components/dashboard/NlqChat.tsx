/**
 * Natural Language Query (NLQ) Chat Component
 * 
 * Provides a chat interface for users to ask questions about their business data
 * in natural language. The AI assistant responds based on the current dashboard data.
 * 
 * @module NlqChat
 * @description Chat interface for natural language queries to AI data assistant
 */

// "use client" - This component uses React state and fetches from API
"use client"

// Import React hooks for state management
import { useState } from "react"

// Import UI components
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// Import icons from lucide-react
import { MessageSquare, Send, Bot, User } from "lucide-react"

/**
 * Message Interface
 * 
 * Defines the structure of a chat message.
 * Each message has a role (user or AI) and content.
 */
interface Message {
  role: 'user' | 'ai';
  content: string;
}

/**
 * NlqChat Component
 * 
 * Renders a chat interface with:
 * - Message history display
 * - Input field for user queries
 * - Loading state during AI responses
 * - Automatic context injection (sales, inventory, KPI data)
 * 
 * @param {Object} props - Component props
 * @param {Array} props.salesData - Sales data to provide context
 * @param {Array} props.inventoryData - Inventory data to provide context
 * @param {Array} props.kpis - KPI data to provide context
 * @returns {JSX.Element} Chat interface component
 */
export function NlqChat({ salesData, inventoryData, kpis }: { salesData: any[], inventoryData: any[], kpis: any[] }) {
  // State for chat messages
  const [messages, setMessages] = useState<Message[]>([
    // Initial welcome message from AI assistant
    { role: 'ai', content: 'Hello! I am your AI Data Assistant. Ask me anything about your sales, inventory, or KPIs.' }
  ])
  
  // State for input field value
  const [input, setInput] = useState('')
  
  // State for loading indicator during API calls
  const [loading, setLoading] = useState(false)

  /**
   * Send Message Handler
   * 
   * Handles form submission to send user message to AI chat API.
   * Includes current dashboard data as context for the AI.
   * 
   * @param {React.FormEvent} e - Form submission event
   */
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validate input
    if (!input.trim() || loading) return

    // Store user message and clear input
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      // Call the chat API endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg,
          // Include dashboard data as context for AI
          contextData: { salesData, inventoryData, kpis }
        })
      })
      
      const data = await response.json()
      if (data.text) {
        // Add AI response to messages
        setMessages(prev => [...prev, { role: 'ai', content: data.text }])
      }
    } catch (error) {
      console.error("Chat error", error)
      // Show error message in chat
      setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error processing your request.' }])
    } finally {
      setLoading(false)
    }
  }

  return (
    // Card container for chat interface
    <Card className="col-span-full md:col-span-4 flex flex-col h-[400px]">
      <CardHeader>
        <CardTitle className="flex items-center">
          <MessageSquare className="mr-2 h-5 w-5 text-slate-500" />
          Natural Language Query
        </CardTitle>
      </CardHeader>
      
      {/* Flexible content area for messages */}
      <CardContent className="flex-1 flex flex-col overflow-hidden">
        {/* Message List - Scrollable area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {/* Message bubble with avatar */}
              <div className={`flex items-start max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-blue-100 text-blue-600 ml-2' : 'bg-slate-100 text-slate-600 mr-2'}`}>
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>
                {/* Message Bubble */}
                <div className={`rounded-lg px-3 py-2 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-900'}`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
          
          {/* Loading indicator */}
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
        
        {/* Message Input Form */}
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
