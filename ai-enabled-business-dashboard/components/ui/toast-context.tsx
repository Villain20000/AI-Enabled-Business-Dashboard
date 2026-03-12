"use client"

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X } from 'lucide-react';

type Toast = { 
  id: string; 
  title: string; 
  description: string; 
  type?: 'default' | 'error' | 'success' | 'info' 
};

type ToastContextType = { 
  addToast: (toast: Omit<Toast, 'id'>) => void 
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div 
            key={t.id} 
            className={`flex items-start justify-between p-4 rounded-md shadow-lg border w-80 animate-in slide-in-from-bottom-5 ${
              t.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' : 
              t.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 
              t.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-900' :
              'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div>
              <h4 className="font-semibold text-sm">{t.title}</h4>
              <p className="text-sm opacity-90 mt-1">{t.description}</p>
            </div>
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

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
};
