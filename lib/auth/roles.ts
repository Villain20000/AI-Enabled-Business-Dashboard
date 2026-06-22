/**
 * Role + permission constants and pure helpers.
 *
 * This module is intentionally free of any `next/headers` or Supabase server
 * imports so it can be safely imported from client components. Server-only
 * membership resolution lives in lib/auth/rbac.ts.
 *
 * @module lib/auth/roles
 */
export type OrgRole = 'owner' | 'admin' | 'member' | 'viewer';

export const ROLE_RANK: Record<OrgRole, number> = {
  viewer: 0,
  member: 1,
  admin: 2,
  owner: 3,
};

export type Permission =
  | 'dashboard:view'
  | 'data:edit'
  | 'alerts:manage'
  | 'team:manage'
  | 'apikeys:manage'
  | 'audit:view'
  | 'billing:manage'
  | 'org:manage'
  | 'ai:use';

const PERMISSIONS: Record<Permission, OrgRole> = {
  'dashboard:view': 'viewer',
  'ai:use': 'member',
  'data:edit': 'member',
  'alerts:manage': 'member',
  'team:manage': 'admin',
  'apikeys:manage': 'admin',
  'audit:view': 'admin',
  'billing:manage': 'owner',
  'org:manage': 'owner',
};

export function can(role: OrgRole | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_RANK[role] >= ROLE_RANK[PERMISSIONS[permission]];
}
