import { describe, expect, it } from 'vitest';
import { can, isOrgRole, parseOrgRole } from './roles';

describe('RBAC permissions', () => {
  it('allows viewers to view the dashboard only', () => {
    expect(can('viewer', 'dashboard:view')).toBe(true);
    expect(can('viewer', 'team:manage')).toBe(false);
    expect(can('viewer', 'billing:manage')).toBe(false);
  });

  it('allows members to use AI and alerts', () => {
    expect(can('member', 'ai:use')).toBe(true);
    expect(can('member', 'alerts:manage')).toBe(true);
    expect(can('member', 'apikeys:manage')).toBe(false);
  });

  it('restricts billing and organization management to owners', () => {
    expect(can('admin', 'billing:manage')).toBe(false);
    expect(can('owner', 'billing:manage')).toBe(true);
    expect(can('owner', 'org:manage')).toBe(true);
  });

  it('rejects a missing role', () => {
    expect(can(null, 'dashboard:view')).toBe(false);
  });
});

describe('parseOrgRole', () => {
  it('accepts every role the database check constraint allows', () => {
    for (const role of ['owner', 'admin', 'member', 'viewer']) {
      expect(isOrgRole(role)).toBe(true);
      expect(parseOrgRole(role)).toBe(role);
    }
  });

  it('returns null for unknown, empty, and missing values', () => {
    expect(parseOrgRole('superadmin')).toBeNull();
    expect(parseOrgRole('OWNER')).toBeNull();
    expect(parseOrgRole('')).toBeNull();
    expect(parseOrgRole(null)).toBeNull();
    expect(parseOrgRole(undefined)).toBeNull();
  });
});
