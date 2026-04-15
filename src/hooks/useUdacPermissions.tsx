import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PermissionType = 'UI_COMPONENT' | 'API_ENDPOINT' | 'DATA_FIELD' | 'ACTION';

export interface Permission {
  key: string;
  label: string;
  group_name: string;
  description: string;
  type: PermissionType;
  resource_identifier: string;
  is_enabled: boolean;
  source: 'role' | 'user' | 'policy';
}

export const useUdacPermissions = () => {
  const { user } = useAuth();

  const { data: permissions = [], isLoading, refetch } = useQuery({
    queryKey: ["udac-permissions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Menggunakan RPC function get_user_all_permissions yang sudah diperbarui (Fase 1)
      const { data, error } = await supabase.rpc('get_user_all_permissions', {
        _user_id: user.id
      });

      if (error) {
        console.error("Error fetching UDAC permissions:", error);
        throw error;
      }

      return data as Permission[];
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const { roles } = useAuth();
  const isSuperAdmin = roles.includes('super_admin');

  const hasPermission = (permissionKey: string): boolean => {
    // Super admin bypass di frontend (untuk responsivitas)
    // Namun tetap divalidasi di backend (RLS/RPC)
    if (isSuperAdmin) return true;
    
    const permission = permissions.find(p => p.key === permissionKey);
    return permission?.is_enabled ?? false;
  };

  const getPermissionsByGroup = (groupName: string) => {
    return permissions.filter(p => p.group_name === groupName);
  };

  const getPermissionsByResource = (resourceIdentifier: string) => {
    return permissions.filter(p => p.resource_identifier === resourceIdentifier);
  };

  return {
    permissions,
    isLoading,
    hasPermission,
    getPermissionsByGroup,
    getPermissionsByResource,
    refetch
  };
};
