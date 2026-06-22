/**
 * Root Layout — minimal HTML shell.
 *
 * The sidebar/header app chrome lives in app/(app)/layout.tsx so that
 * marketing + auth route groups can use their own chrome. ToastProvider
 * is kept at the root so toasts work everywhere.
 *
 * @module RootLayout
 */
import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast-context';

export const metadata: Metadata = {
  title: 'DataCore AI — Enterprise Business Intelligence',
  description:
    'Multi-tenant SaaS dashboard with AI insights, RBAC, Stripe billing, audit logs, and API keys.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900" suppressHydrationWarning>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
