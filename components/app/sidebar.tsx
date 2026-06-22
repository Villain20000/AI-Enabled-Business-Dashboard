/**
 * SidebarNav — client-side primary navigation for the app shell.
 *
 * Highlights the active link based on `usePathname()` and hides nav items
 * the current role cannot access. Role gating here is cosmetic only; real
 * enforcement happens in Server Components / Route Handlers via requireOrg.
 *
 * @module components/app/sidebar
 */
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  KeyRound,
  ScrollText,
  CreditCard,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OrgRole } from '@/lib/auth/roles';
import { ROLE_RANK } from '@/lib/auth/roles';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Minimum role required to see this item. */
  minRole: OrgRole;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, minRole: 'viewer' },
  { label: 'Team', href: '/team', icon: Users, minRole: 'admin' },
  { label: 'API Keys', href: '/api-keys', icon: KeyRound, minRole: 'admin' },
  { label: 'Audit Log', href: '/audit', icon: ScrollText, minRole: 'admin' },
  { label: 'Billing', href: '/billing', icon: CreditCard, minRole: 'owner' },
  { label: 'Settings', href: '/settings', icon: Settings, minRole: 'viewer' },
];

/**
 * Returns true when `role` meets or exceeds the `minRole` requirement.
 */
function hasAccess(role: OrgRole, minRole: OrgRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export function SidebarNav({ role }: { role: OrgRole }) {
  const pathname = usePathname();

  const visible = NAV_ITEMS.filter((item) => hasAccess(role, item.minRole));

  return (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {visible.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
              active
                ? 'bg-blue-50 text-blue-700'
                : 'text-slate-600 hover:bg-slate-50',
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
