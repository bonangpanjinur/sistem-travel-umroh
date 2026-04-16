import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Hook untuk mengelola peran pengguna
 * 
 * Fitur:
 * - Assign role ke user (dengan otomatis menyalin izin dari role)
 * - Remove role dari user
 * - Reset user permissions ke default role
 * - Fetch user roles
 */

export interface UserRole {
  user_id: string;
  role: string;
  created_at?: string;
}

export const useUserRoleManagement = (userId: string) => {
  const queryClient = useQueryClient();

  // Fetch user roles
  const { data: userRoles = [], isLoading: isLoadingRoles } = useQuery({
    queryKey: ["user-roles", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId);

      if (error) throw error;
      return data as UserRole[];
    },
    enabled: !!userId,
  });

  // Assign role mutation
  const assignRoleMutation = useMutation({
    mutationFn: async (roleName: string) => {
      const { data, error } = await supabase.rpc("assign_role_to_user", {
        _user_id: userId,
        _role_name: roleName,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(`Role berhasil ditambahkan. ${data[0]?.permissions_copied || 0} izin disalin.`);
      queryClient.invalidateQueries({ queryKey: ["user-roles", userId] });
      queryClient.invalidateQueries({ queryKey: ["user-permissions-override", userId] });
      queryClient.invalidateQueries({ queryKey: ["udac-permissions", userId] });
    },
    onError: (error: any) => {
      toast.error(`Gagal menambahkan role: ${error.message}`);
    },
  });

  // Remove role mutation
  const removeRoleMutation = useMutation({
    mutationFn: async (roleName: string) => {
      const { data, error } = await supabase.rpc("remove_role_from_user", {
        _user_id: userId,
        _role_name: roleName,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Role berhasil dihapus.");
      queryClient.invalidateQueries({ queryKey: ["user-roles", userId] });
      // Izin di user_permissions tetap ada, tidak dihapus otomatis
    },
    onError: (error: any) => {
      toast.error(`Gagal menghapus role: ${error.message}`);
    },
  });

  // Reset permissions to role defaults mutation
  const resetPermissionsMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc(
        "reset_user_permissions_to_role_defaults",
        {
          _user_id: userId,
        }
      );

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast.success(
        `Izin berhasil direset ke default. ${data[0]?.permissions_reset || 0} izin diatur ulang.`
      );
      queryClient.invalidateQueries({ queryKey: ["user-permissions-override", userId] });
      queryClient.invalidateQueries({ queryKey: ["udac-permissions", userId] });
    },
    onError: (error: any) => {
      toast.error(`Gagal mereset izin: ${error.message}`);
    },
  });

  return {
    userRoles,
    isLoadingRoles,
    assignRole: assignRoleMutation.mutate,
    assignRoleAsync: assignRoleMutation.mutateAsync,
    isAssigningRole: assignRoleMutation.isPending,
    removeRole: removeRoleMutation.mutate,
    removeRoleAsync: removeRoleMutation.mutateAsync,
    isRemovingRole: removeRoleMutation.isPending,
    resetPermissions: resetPermissionsMutation.mutate,
    resetPermissionsAsync: resetPermissionsMutation.mutateAsync,
    isResettingPermissions: resetPermissionsMutation.isPending,
  };
};

/**
 * Hook untuk grant/revoke izin individual kepada user
 */
export const useUserPermissionControl = (userId: string) => {
  const queryClient = useQueryClient();

  // Grant permission mutation
  const grantPermissionMutation = useMutation({
    mutationFn: async (permissionKey: string) => {
      const { data, error } = await supabase.rpc("grant_user_permission", {
        _user_id: userId,
        _permission_key: permissionKey,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions-override", userId] });
      queryClient.invalidateQueries({ queryKey: ["udac-permissions", userId] });
    },
    onError: (error: any) => {
      toast.error(`Gagal memberikan izin: ${error.message}`);
    },
  });

  // Revoke permission mutation
  const revokePermissionMutation = useMutation({
    mutationFn: async (permissionKey: string) => {
      const { data, error } = await supabase.rpc("revoke_user_permission", {
        _user_id: userId,
        _permission_key: permissionKey,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-permissions-override", userId] });
      queryClient.invalidateQueries({ queryKey: ["udac-permissions", userId] });
    },
    onError: (error: any) => {
      toast.error(`Gagal mencabut izin: ${error.message}`);
    },
  });

  return {
    grantPermission: grantPermissionMutation.mutate,
    grantPermissionAsync: grantPermissionMutation.mutateAsync,
    isGranting: grantPermissionMutation.isPending,
    revokePermission: revokePermissionMutation.mutate,
    revokePermissionAsync: revokePermissionMutation.mutateAsync,
    isRevoking: revokePermissionMutation.isPending,
  };
};
