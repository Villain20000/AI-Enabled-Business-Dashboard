/**
 * Toast Context and Provider
 * 
 * A React context-based notification system for displaying temporary
 * toast messages. Supports multiple toast types (default, error, success, info)
 * with auto-dismissal after 5 seconds.
 * 
 * @module ToastContext
 * @description Global toast notification system for the application
 */

// "use client" - This is a client component using React hooks
"use client"

// Import React hooks and context API
import React, { createContext, useContext, useState, useCallback } from 'react';

// Import X icon for close button
import { X } from 'lucide-react';

/**
 * Toast Type Definition
 * 
 * Represents a single toast notification with:
 * - id: Unique identifier
 * - title: Main heading
 * - description: Detailed message
 * - type: Visual style (default, error, success, info)
 */
type Toast = { 
  id: string; 
  title: string; 
  description: string; 
  type?: 'default' | 'error' | 'success' | 'info' 
};

/**
 * ToastContextType Definition
 * 
 * Defines the shape of the context value provided to consumers.
 * Contains the addToast function for creating new notifications.
 */
type ToastContextType = { 
  addToast: (toast: Omit<Toast, 'id'>) => void 
};

/**
 * Create Toast Context
 * 
 * Initializes the context with undefined as default value.
 * Will be populated by ToastProvider in the component tree.
 */
const ToastContext = createContext<ToastContextType | undefined>(undefined);

/**
 * ToastProvider Component
 * 
 * Wraps the application to provide toast notification functionality.
 * Maintains state for active toasts and provides addToast function to children.
 * 
 * @param {React.ReactNode} props.children - Child components that can access toast context
 * @returns {JSX.Element} Context provider with toast UI
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  // State to track all active toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  /**
   * Add Toast Function
   * 
   * Creates a new toast with a unique ID and schedules auto-dismissal.
   * Uses useCallback for optimization to prevent unnecessary re-renders.
   * 
   * @param {Omit<Toast, 'id'>} toast - Toast data without ID
   */
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    // Generate unique ID from random string
    const id = Math.random().toString(36).substring(2, 9);
    
    // Add new toast to state
    setToasts((prev) => [...prev, { ...toast, id }]);
    
    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    // Provide addToast function to children
    <ToastContext.Provider value={{ addToast }}>
      {children}
      
      {/* Toast Container - Fixed position in bottom-right corner */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          // Individual toast with type-based styling
          <div 
            key={t.id} 
            className={`flex items-start justify-between p-4 rounded-md shadow-lg border w-80 animate-in slide-in-from-bottom-5 ${
              // Color coding based on toast type
              t.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' : 
              t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 
              t.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-900' :
              'bg-white border-slate-200 text-slate-900'
            }`}
          >
            {/* Toast Content */}
            <div>
              <h4 className="font-semibold text-sm">{t.title}</h4>
              <p className="text-sm opacity-90 mt-1">{t.description}</p>
            </div>
            
            {/* Close Button */}
            <button 
              onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))} 
              className="text-slate-500 hover:text-slate-900 ml-4 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/**
 * useToast Hook
 * 
 * Custom hook for accessing toast functionality in any component.
 * Must be used within a ToastProvider.
 * 
 * @returns {ToastContextType} Toast context value with addToast function
 * @throws {Error} If used outside of ToastProvider
 */
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};
