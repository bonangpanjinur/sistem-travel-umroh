/**
 * useRoleHomeRoute
 *
 * Mengembalikan URL portal utama berdasarkan role prioritas user.
 * Digunakan setelah login untuk redirect otomatis ke portal yang sesuai.
 *
 * Urutan prioritas: super_admin/owner/branch_manager/finance/operational/
 * sales/marketing/equipment → /admin
 * agent/sub_agent → /agent
 * customer/jamaah → /jamaah
 */

import { useAuth } from '@/hooks/useAuth';
import { AppRole } from '@/types/database';

export function getRoleHomeRoute(roles: AppRole[]): string {
  const ADMIN_ROLES: AppRole[] = [
    'super_admin', 'owner', 'branch_manager',
    'finance', 'operational', 'sales', 'marketing', 'equipment',
  ];
  const AGENT_ROLES: AppRole[] = ['agent', 'sub_agent'];
  const CUSTOMER_ROLES: AppRole[] = ['customer', 'jamaah'];

  if (roles.some(r => ADMIN_ROLES.includes(r))) return '/admin';
  if (roles.some(r => AGENT_ROLES.includes(r))) return '/agent';
  if (roles.some(r => CUSTOMER_ROLES.includes(r))) return '/jamaah';
  return '/my-bookings';
}

export function useRoleHomeRoute(): string {
  const { roles } = useAuth();
  return getRoleHomeRoute(roles);
}
