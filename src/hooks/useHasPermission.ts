import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

/**
 * Hook to check if the current user has a specific permission.
 * Calls the RPC function 'get_user_effective_permission' in Supabase.
 * 
 * @param permissionKey The key of the permission to check (e.g., 'bookings.view')
 * @returns { hasPermission: boolean, isLoading: boolean }
 */
export function useHasPermission(permissionKey: string | undefined) {
  const { user } = useAuth();

  const { data: hasPermission, isLoading } = useQuery({
    queryKey: ['permission', user?.id, permissionKey],
    queryFn: async () => {
      if (!user || !permissionKey) return false;

      const { data, error } = await supabase.rpc('get_user_effective_permission', {
        p_user_id: user.id,
        p_permission_key: permissionKey
      });

      if (error) {
        console.error('Error checking permission:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user && !!permissionKey,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  return {
    hasPermission: !!hasPermission,
    isLoading
  };
}

/**
 * Hook to get all effective permissions for the current user.
 * Useful for sidebar menus and UI visibility control.
 */
export function useAllPermissions() {
  const { user } = useAuth();

  const { data: permissions = [], isLoading } = useQuery({
    queryKey: ['all-permissions', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_user_all_effective_permissions', {
        p_user_id: user.id
      });

      if (error) {
        console.error('Error fetching all permissions:', error);
        return [];
      }

      return data as { permission_key: string; is_enabled: boolean; source: string }[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const checkPermission = (key: string) => {
    return permissions.some(p => p.permission_key === key && p.is_enabled);
  };

  return {
    permissions,
    isLoading,
    checkPermission
  };
}
