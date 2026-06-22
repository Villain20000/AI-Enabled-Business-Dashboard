/**
 * Marketing Layout — public site chrome.
 *
 * Renders a sticky top nav bar (brand + nav links + auth actions), the page
 * body, and a footer. Used by all routes in the `(marketing)` route group
 * (e.g. the landing page at `/`). Kept as a Server Component since none of
 * the elements here require client interactivity.
 *
 * @module MarketingLayout
 */
import Link from 'next/link';
import { Database } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Anchor links rendered in the top navigation bar. */
const NAV_LINKS = [
  { href: '/#features', label: 'Features' },
  { href: '/#pricing', label: 'Pricing' },
] as const;

/**
 * Marketing layout component.
 *
 * @param children - The route's page content, rendered inside `<main>`.
 * @returns The marketing chrome wrapping the page.
 */
export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Top navigation bar — sticky, white, bottom border */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2">
            <Database className="h-6 w-6 text-blue-600" />
            <span className="text-lg font-semibold text-blue-600">
              DataCore AI
            </span>
          </Link>

          {/* Right side: section links + auth actions */}
          <nav className="flex items-center gap-2 sm:gap-4">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              Log in
            </Link>
            <Link href="/signup">
              <Button>Get started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-8 text-sm text-slate-500">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
            <p>&copy; {new Date().getFullYear()} DataCore AI. All rights reserved.</p>
            <p>Built with Next.js, Supabase, Stripe, and Google Gemini</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
