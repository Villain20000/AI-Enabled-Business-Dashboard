'use client';

/**
 * Mobile navigation drawer.
 *
 * @module components/app/mobile-nav
 */
import { useState } from 'react';
import { Database, Menu, X } from 'lucide-react';
import { SidebarNav } from './sidebar';
import { UserMenu } from './user-menu';
import type { OrgRole } from '@/lib/auth/roles';

export function MobileNav({ role, userEmail }: { role: OrgRole; userEmail: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 md:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/30"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative flex h-full w-72 max-w-[80vw] flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
              <Database className="h-6 w-6 text-blue-600" />
              <span className="text-lg font-semibold text-slate-900">DataCore AI</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto" onClick={() => setOpen(false)}>
              <SidebarNav role={role} />
            </div>
            <div className="border-t border-slate-200 p-3">
              <UserMenu userEmail={userEmail} role={role} />
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
