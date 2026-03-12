/**
 * Root Layout Component
 * 
 * This is the main layout file for the Next.js application. It defines the
 * overall structure including the sidebar navigation, header, and main content area.
 * 
 * @module RootLayout
 * @description Main application shell with sidebar navigation and user interface
 * 
 * @see https://nextjs.org/docs/app/building-your-application/routing/pages-and-layouts
 */

// Import metadata API for SEO configuration
import type { Metadata } from 'next';

// Import Link component for client-side navigation
import Link from 'next/link';

// Import global CSS styles
import './globals.css';

// Import icons from lucide-react (icon library)
import { LayoutDashboard, Settings, Users, Database, LogOut, Bell } from 'lucide-react';

// Import ToastProvider for notification system
import { ToastProvider } from '@/components/ui/toast-context';

/**
 * Metadata configuration for the application
 * Used for SEO and browser tab title/description
 */
export const metadata: Metadata = {
  title: 'AI-Enabled Business Dashboard',
  description: 'Internal tool for data visualization and AI-driven insights.',
};

/**
 * RootLayout Component
 * 
 * The root layout defines the HTML structure and shared UI elements
 * that persist across all pages in the application.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child page components to render
 * @returns {JSX.Element} The complete application layout
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // HTML document structure with language setting
    <html lang="en">
      {/* 
        Body element with base styles:
        - bg-slate-50: Light gray background
        - text-slate-900: Dark gray text
        - flex h-screen overflow-hidden: Full height with hidden overflow
        - suppressHydrationWarning: Suppresses hydration warnings (required for some Next.js setups)
      */}
      <body className="bg-slate-50 text-slate-900 flex h-screen overflow-hidden" suppressHydrationWarning>
        {/* Wrap entire app in ToastProvider for notification functionality */}
        <ToastProvider>
          {/* Sidebar Navigation */}
          <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
            {/* Logo and Brand Header */}
            <div className="h-16 flex items-center px-6 border-b border-slate-200">
              <div className="flex items-center gap-2 font-bold text-lg text-blue-600">
                <Database className="h-6 w-6" />
                <span>DataCore AI</span>
              </div>
            </div>
            
            {/* Main Navigation Links */}
            <nav className="flex-1 p-4 space-y-1">
              {/* Dashboard Link - Active by default on home page */}
              <Link href="/" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-blue-700 rounded-md font-medium transition-colors">
                <LayoutDashboard className="h-5 w-5" />
                Dashboard
              </Link>
              
              {/* Settings/Alerts Link */}
              <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 hover:text-blue-700 rounded-md font-medium transition-colors">
                <Bell className="h-5 w-5" />
                Alerts & Settings
              </Link>
              
              {/* Team Link (placeholder - not implemented) */}
              <a href="#" className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:bg-slate-50 rounded-md font-medium transition-colors">
                <Users className="h-5 w-5" />
                Team
              </a>
            </nav>
            
            {/* Logout Button at Bottom of Sidebar */}
            <div className="p-4 border-t border-slate-200">
              <button className="flex items-center gap-3 px-3 py-2 w-full text-slate-600 hover:bg-slate-50 rounded-md font-medium transition-colors">
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </div>
          </aside>

          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Top Header Bar */}
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
              {/* Mobile Logo - shown only on small screens */}
              <h1 className="text-xl font-semibold md:hidden">DataCore AI</h1>
              
              {/* Desktop Title/Breadcrumb */}
              <div className="hidden md:block">
                {/* Breadcrumbs or Title */}
                <h1 className="text-xl font-semibold">Overview</h1>
              </div>
              
              {/* User Profile Section */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {/* User Avatar - initials displayed */}
                  <div className="h-8 w-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-medium text-sm">
                    JD
                  </div>
                  {/* User Name and Role */}
                  <div className="hidden md:block text-sm">
                    <p className="font-medium leading-none">John Doe</p>
                    <p className="text-slate-500 text-xs">Admin</p>
                  </div>
                </div>
              </div>
            </header>

            {/* Page Content - Where child routes are rendered */}
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
