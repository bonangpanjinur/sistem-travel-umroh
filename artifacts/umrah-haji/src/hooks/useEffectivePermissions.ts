/**
 * useEffectivePermissions
 * Mengambil semua permission_key aktif untuk user saat ini melalui RPC
 * `get_user_effective_permissions` (gabungan role default + override user).
 *
 * Super admin di-handle di sisi DB (RPC mengembalikan semua permission).
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getInheritedRoles } from '@/lib/permissions';
import { AppRole } from '@/types/database';

export function useEffectivePermissions() {
  const { user, hasRole, roles } = useAuth();
  const isSuperAdmin = hasRole('super_admin');

  const { data = [], isLoading } = useQuery({
    queryKey: ['user-effective-permissions', user?.id],
    queryFn: async () => {
      if (!user) return [] as string[];
      
      // Get all roles for the user including inherited ones
      const userRoles = roles || [];
      const expandedRoles: AppRole[] = [...userRoles];
      userRoles.forEach(role => {
        expandedRoles.push(...getInheritedRoles(role));
      });
      const uniqueRoles = Array.from(new Set(expandedRoles));

      const { data, error } = await (supabase.rpc as any)('get_user_effective_permissions_v2', {
        _user_id: user.id,
        _roles: uniqueRoles
      });
      
      // Fallback to legacy RPC if v2 doesn't exist yet (PGRST202, 404, or message check)
      const isFunctionNotFoundError = error && (
        error.code === 'PGRST202' || 
        error.status === 404 ||
        (error.message && error.message.includes('function') && error.message.includes('does not exist'))
      );

      if (isFunctionNotFoundError) {
        const { data: legacyData, error: legacyError } = await (supabase.rpc as any)('get_user_effective_permissions', {
          _user_id: user.id,
        });
        
        if (legacyError) { 
          // If both fail, it's a serious missing migration issue
          if (import.meta.env.DEV) {
            console.error('[Permissions] Both v2 and legacy RPC failed. Ensure migrations are applied.', legacyError);
          }
          return [] as string[]; 
        }
        return ((legacyData || []) as Array<{ permission_key: string }>).map(r => r.permission_key);
      }

      if (error) { console.error(error); return [] as string[]; }
      return ((data || []) as Array<{ permission_key: string }>).map(r => r.permission_key);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 15, // Increase staleTime to 15 minutes
    gcTime: 1000 * 60 * 60,    // Keep in cache for 1 hour
  });

  const set = useMemo(() => new Set(data), [data]);

  const has = (key: string) => isSuperAdmin || set.has(key);

  return { keys: data, set, has, isLoading, isSuperAdmin };
}