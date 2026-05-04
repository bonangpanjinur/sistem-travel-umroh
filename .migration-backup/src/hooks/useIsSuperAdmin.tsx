import { useAuth } from '@/hooks/useAuth';

/**
 * Hook to check if the current user is a Super Admin
 * 
 * This hook provides a strict check for Super Admin role only.
 * Unlike isAdmin() which includes owner, branch_manager, etc.,
 * this hook only returns true for users with the 'super_admin' role.
 * 
 * Usage:
 * const isSuperAdmin = useIsSuperAdmin();
 * if (!isSuperAdmin) {
 *   return <AccessDenied />;
 * }
 */
export function useIsSuperAdmin(): boolean {
  const { roles } = useAuth();
  return roles.includes('super_admin');
}
