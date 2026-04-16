import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type PermissionType = 'UI_COMPONENT' | 'API_ENDPOINT' | 'DATA_FIELD' | 'ACTION';

export interface Permission {
  permission_key: string;
  label: string;
  group_name: string;
  is_enabled: boolean;
  source: 'user';
}

/**
 * Simplified UDAC Permissions Hook
 * 
 * Perubahan utama:
 * - Menggunakan get_user_all_permissions yang hanya membaca dari user_permissions
 * - Menghilangkan logika bypass super_admin di frontend (sudah ditangani di database)
 * - Fokus pada user_permissions sebagai sumber kebenaran tunggal
 */
export const useUdacPermissions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: permissions = [], isLoading, refetch } = useQuery({
    queryKey: ["udac-permissions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      // Menggunakan RPC function get_user_all_permissions yang sudah disederhanakan
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

  // Sinkronisasi Real-time: Invalidate cache saat ada perubahan di tabel user_permissions
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('public:user_permissions_changes')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'user_permissions',
        filter: `user_id=eq.${user.id}`
      }, () => {
        console.log("User permissions changed, invalidating cache...");
        queryClient.invalidateQueries({ queryKey: ["udac-permissions", user.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  /**
   * Periksa apakah pengguna memiliki izin tertentu
   * Logika bypass super_admin sudah ditangani di database (get_user_effective_permission)
   */
  const hasPermission = (permissionKey: string): boolean => {
    const permission = permissions.find(p => p.permission_key === permissionKey);
    return permission?.is_enabled ?? false;
  };

  /**
   * Periksa apakah pengguna memiliki SEMUA izin dari daftar yang diberikan
   */
  const hasAllPermissions = (permissionKeys: string[]): boolean => {
    return permissionKeys.every(key => hasPermission(key));
  };

  /**
   * Periksa apakah pengguna memiliki SALAH SATU izin dari daftar yang diberikan
   */
  const hasAnyPermission = (permissionKeys: string[]): boolean => {
    return permissionKeys.some(key => hasPermission(key));
  };

  /**
   * Dapatkan izin berdasarkan grup
   */
  const getPermissionsByGroup = (groupName: string) => {
    return permissions.filter(p => p.group_name === groupName);
  };

  /**
   * Dapatkan semua izin yang diaktifkan
   */
  const getEnabledPermissions = () => {
    return permissions.filter(p => p.is_enabled);
  };

  /**
   * Dapatkan semua izin yang dinonaktifkan
   */
  const getDisabledPermissions = () => {
    return permissions.filter(p => !p.is_enabled);
  };

  return {
    permissions,
    isLoading,
    hasPermission,
    hasAllPermissions,
    hasAnyPermission,
    getPermissionsByGroup,
    getEnabledPermissions,
    getDisabledPermissions,
    refetch
  };
};
