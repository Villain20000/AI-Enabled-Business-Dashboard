/**
 * Auth Route Group Layout
 *
 * Minimal, centered chrome for authentication pages (login, signup,
 * forgot/reset password, invite acceptance). No sidebar or app header —
 * just a full-height flex center containing the DataCore AI brand mark
 * above the page content (children).
 *
 * @module AuthLayout
 */
import { Database } from 'lucide-react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand mark */}
        <div className="mb-6 flex items-center justify-center gap-2">
          <Database className="h-7 w-7 text-blue-600" />
          <span className="text-xl font-semibold text-blue-600">DataCore AI</span>
        </div>
        {/* Page content */}
        {children}
      </div>
    </div>
  );
}
