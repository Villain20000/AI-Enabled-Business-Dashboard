import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
import { LayoutDashboard, Settings, Users, Database, LogOut, Bell } from 'lucide-react';
import { ToastProvider } from '@/components/ui/toast-context';

export const metadata: Metadata = {
  title: 'AI-Enabled Business Dashboard',
  description: 'Internal tool for data visualization and AI-driven insights.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 flex h-screen overflow-hidden" suppressHydrationWarning>
        <ToastProvider>
          {/* Sidebar */}
          <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
            <div className="h-16 flex items-center px-6 border-b border-slate-200">
              <div className="flex items-center gap-2 font-bold text-lg text-blue-600">
                <Database className="h-6 w-6" />
                <span>DataCore AI</span>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              <Link href="/" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-blue-700 rounded-md font-medium transition-colors">
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </Link>
              <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-blue-700 rounded-md font-medium transition-colors">
                <Bell className="h-5 w-5" />
                Alerts & Settings
              </Link>
              <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-md font-medium transition-colors">
                <Users className="h-5 w-5" />
                Team
              </a>
            </nav>
            <div className="p-4 border-t border-slate-200">
              <button className="flex items-center gap-3 px-3 py-2 w-full text-slate-600 hover:bg-slate-50 rounded-md font-medium transition-colors">
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Top Header */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
              <h1 className="text-xl font-semibold md:hidden">DataCore AI</h1>
              <div className="hidden md:block">
                {/* Breadcrumbs or Title */}
                <h1 className="text-xl font-semibold">Overview</h1>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium text-sm">
                    JD
                  </div>
                  <div className="hidden md:block text-sm">
                    <p className="font-medium leading-none">John Doe</p>
                    <p className="text-slate-500 text-xs">Admin</p>
                  </div>
                </div>
              </div>
            </header>

            {/* Page Content */}
            <main className="flex-1 overflow-y-auto p-6">
              <div className="max-w-7xl mx-auto">
                {children}
              </div>
            </main>
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
