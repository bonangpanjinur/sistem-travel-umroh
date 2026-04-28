/**
 * Pure-TS mirror of the Postgres permission resolver.
 * Used by tests AND can be used client-side for optimistic checks.
 * Logic MUST stay in sync with public.check_user_permission /
 * public.get_user_effective_permissions in the database.
 */

export type RolePerm = { role: string; permission_key: string; is_enabled: boolean };
export type UserPerm = { user_id: string; permission_key: string; is_enabled: boolean };
export type UserRole = { user_id: string; role: string };

export interface RbacInput {
  userId: string;
  userRoles: UserRole[];
  rolePermissions: RolePerm[];
  userPermissions: UserPerm[];
  /** master list of every permission key (used for super_admin = all) */
  allPermissionKeys: string[];
}

export function isSuperAdmin(input: Pick<RbacInput, 'userId' | 'userRoles'>) {
  return input.userRoles.some(r => r.user_id === input.userId && r.role === 'super_admin');
}

/** Mirrors check_user_permission(_user_id, _permission_key) */
export function checkUserPermission(input: RbacInput, permissionKey: string): boolean {
  if (isSuperAdmin(input)) return true;

  // 1) user override wins (grant or revoke)
  const override = input.userPermissions.find(
    p => p.user_id === input.userId && p.permission_key === permissionKey
  );
  if (override) return override.is_enabled;

  // 2) any of the user's roles allows it?
  const myRoles = new Set(input.userRoles.filter(r => r.user_id === input.userId).map(r => r.role));
  return input.rolePermissions.some(
    rp => myRoles.has(rp.role) && rp.permission_key === permissionKey && rp.is_enabled
  );
}

/** Mirrors get_user_effective_permissions(_user_id) */
export function getUserEffectivePermissions(input: RbacInput): string[] {
  if (isSuperAdmin(input)) return [...input.allPermissionKeys];

  const myRoles = new Set(input.userRoles.filter(r => r.user_id === input.userId).map(r => r.role));
  const roleAllowed = new Set(
    input.rolePermissions
      .filter(rp => myRoles.has(rp.role) && rp.is_enabled)
      .map(rp => rp.permission_key)
  );

  const userOverrides = input.userPermissions.filter(p => p.user_id === input.userId);
  const revoked = new Set(userOverrides.filter(o => !o.is_enabled).map(o => o.permission_key));
  const granted = new Set(userOverrides.filter(o => o.is_enabled).map(o => o.permission_key));

  // (role allowed - revoked) UNION granted
  const result = new Set<string>();
  for (const k of roleAllowed) if (!revoked.has(k)) result.add(k);
  for (const k of granted) result.add(k);
  return [...result];
}