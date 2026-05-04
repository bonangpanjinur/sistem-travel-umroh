import { describe, it, expect } from 'vitest';
import {
  checkUserPermission,
  getUserEffectivePermissions,
  type RbacInput,
} from './rbac-resolver';

const ALL_KEYS = ['bookings.view', 'bookings.delete', 'finance.view', 'reports.export'];

function base(overrides: Partial<RbacInput> = {}): RbacInput {
  return {
    userId: 'u1',
    userRoles: [{ user_id: 'u1', role: 'sales' }],
    rolePermissions: [
      { role: 'sales', permission_key: 'bookings.view', is_enabled: true },
      { role: 'sales', permission_key: 'finance.view', is_enabled: false }, // disabled at role
    ],
    userPermissions: [],
    allPermissionKeys: ALL_KEYS,
    ...overrides,
  };
}

describe('RBAC resolver — priority rules', () => {
  it('super_admin always wins (returns true for any key + all keys in effective)', () => {
    const input = base({
      userRoles: [{ user_id: 'u1', role: 'super_admin' }],
      rolePermissions: [],
      userPermissions: [{ user_id: 'u1', permission_key: 'bookings.view', is_enabled: false }], // even revoke
    });
    expect(checkUserPermission(input, 'bookings.delete')).toBe(true);
    expect(checkUserPermission(input, 'bookings.view')).toBe(true);
    expect(getUserEffectivePermissions(input).sort()).toEqual([...ALL_KEYS].sort());
  });

  it('user override (grant) outranks role default deny', () => {
    const input = base({
      userPermissions: [{ user_id: 'u1', permission_key: 'finance.view', is_enabled: true }],
    });
    expect(checkUserPermission(input, 'finance.view')).toBe(true);
    expect(getUserEffectivePermissions(input)).toContain('finance.view');
  });

  it('user override (revoke) outranks role default allow', () => {
    const input = base({
      userPermissions: [{ user_id: 'u1', permission_key: 'bookings.view', is_enabled: false }],
    });
    expect(checkUserPermission(input, 'bookings.view')).toBe(false);
    expect(getUserEffectivePermissions(input)).not.toContain('bookings.view');
  });

  it('role allow with no override → granted', () => {
    const input = base();
    expect(checkUserPermission(input, 'bookings.view')).toBe(true);
  });

  it('no role match and no override → denied (default deny)', () => {
    const input = base();
    expect(checkUserPermission(input, 'reports.export')).toBe(false);
    expect(getUserEffectivePermissions(input)).not.toContain('reports.export');
  });

  it('multiple roles: union of allowed permissions', () => {
    const input = base({
      userRoles: [
        { user_id: 'u1', role: 'sales' },
        { user_id: 'u1', role: 'finance' },
      ],
      rolePermissions: [
        { role: 'sales', permission_key: 'bookings.view', is_enabled: true },
        { role: 'finance', permission_key: 'finance.view', is_enabled: true },
      ],
    });
    const eff = getUserEffectivePermissions(input).sort();
    expect(eff).toEqual(['bookings.view', 'finance.view']);
  });

  it('isolation: another user’s overrides do not leak', () => {
    const input = base({
      userPermissions: [{ user_id: 'someone-else', permission_key: 'reports.export', is_enabled: true }],
    });
    expect(checkUserPermission(input, 'reports.export')).toBe(false);
  });
});