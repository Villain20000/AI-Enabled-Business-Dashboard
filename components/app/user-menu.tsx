/**
 * UserMenu — avatar + dropdown with account info and sign-out.
 *
 * Shows the user's initials, email, and role. "Sign out" calls
 * `supabaseBrowser.auth.signOut()` then hard-navigates to /login so the
 * auth cookies are cleared and the server redirects take over.
 *
 * @module components/app/user-menu
 */
'use client';

import { useState } from 'react';
import { LogOut, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { OrgRole } from '@/lib/auth/rbac';

/** Derive up to two uppercase initials from an email address. */
function initialsFromEmail(email: string): string {
  const base = email.split('@')[0] || '';
  const parts = base.split(/[._-]/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : base.slice(0, 2);
  return letters.toUpperCase() || 'U';
}

export function UserMenu({ userEmail, role }: { userEmail: string; role: OrgRole }) {
  const [open, setOpen] = useState(false);
  const initials = initialsFromEmail(userEmail);

  async function handleSignOut() {
    await supabaseBrowser.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-100 transition-colors"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
          {initials}
        </span>
        <span className="hidden flex-col items-start leading-tight sm:flex">
          <span className="max-w-[140px] truncate font-medium text-slate-700">
            {userEmail}
          </span>
          <span className="text-xs capitalize text-slate-400">{role}</span>
        </span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <>
          {/* Click-outside backdrop */}
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-40 mt-1 w-56 rounded-md border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-3 py-2">
              <p className="truncate text-sm font-medium text-slate-700">{userEmail}</p>
              <p className="text-xs capitalize text-slate-400">{role}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className={cn(
                'flex w-full items-center gap-2 px-3 py-2 text-left text-sm',
                'text-slate-700 hover:bg-slate-50',
              )}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
