/**
 * useCanAccess — hook untuk cek permission di level komponen/UI.
 *
 * Digunakan untuk menyembunyikan/menampilkan tombol, tab, atau bagian halaman
 * berdasarkan permission efektif user saat ini.
 *
 * Contoh penggunaan:
 *   const { can, isAdmin, isAgent, isCustomer } = useCanAccess();
 *   if (!can('payments')) return null; // sembunyikan tombol bayar
 *   if (!isAdmin()) return null;       // hanya admin
 *
 * Super admin selalu mendapat akses ke semua permission.
 */

import { useAuth } from '@/hooks/useAuth';
import { useEffectivePermissions } from '@/hooks/useEffectivePermissions';
import { AppRole } from '@/types/database';

const INTERNAL_STAFF_ROLES: AppRole[] = [
  'super_admin', 'owner', 'branch_manager',
  'finance', 'operational', 'sales', 'marketing', 'equipment',
];
const AGENT_ROLES: AppRole[] = ['agent', 'sub_agent'];
const CUSTOMER_ROLES: AppRole[] = ['customer', 'jamaah'];

export function useCanAccess() {
  const { roles, hasRole, isSuperAdmin } = useAuth();
  const { has, isLoading } = useEffectivePermissions();

  /** Cek permission key (misal: 'payments', 'bookings') */
  const can = (permissionKey: string): boolean => {
    if (isSuperAdmin()) return true;
    return has(permissionKey);
  };

  /** Apakah user adalah staf internal (bukan agen eksternal, bukan customer) */
  const isInternalStaff = (): boolean =>
    roles.some(r => INTERNAL_STAFF_ROLES.includes(r));

  /** Apakah user adalah admin (owner ke atas) */
  const isAdmin = (): boolean =>
    roles.some(r => (['super_admin', 'owner', 'branch_manager'] as AppRole[]).includes(r));

  /** Apakah user adalah agen atau sub-agen */
  const isAgent = (): boolean =>
    roles.some(r => AGENT_ROLES.includes(r));

  /** Apakah user adalah customer atau jamaah */
  const isCustomer = (): boolean =>
    roles.some(r => CUSTOMER_ROLES.includes(r));

  /** Cek apakah user memiliki salah satu role yang diberikan */
  const hasAnyRole = (...checkRoles: AppRole[]): boolean =>
    checkRoles.some(r => hasRole(r));

  /** Cek apakah user memiliki semua role yang diberikan */
  const hasAllRoles = (...checkRoles: AppRole[]): boolean =>
    checkRoles.every(r => hasRole(r));

  return {
    can,
    isLoading,
    isInternalStaff,
    isAdmin,
    isAgent,
    isCustomer,
    hasAnyRole,
    hasAllRoles,
    isSuperAdmin: isSuperAdmin(),
  };
}
