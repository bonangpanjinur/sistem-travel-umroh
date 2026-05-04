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

export function useEffectivePermissions() {
  const { user, hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin');

  const { data = [], isLoading } = useQuery({
    queryKey: ['user-effective-permissions', user?.id],
    queryFn: async () => {
      if (!user) return [] as string[];
      const { data, error } = await (supabase.rpc as any)('get_user_effective_permissions', {
        _user_id: user.id,
      });
      if (error) { console.error(error); return [] as string[]; }
      return ((data || []) as Array<{ permission_key: string }>).map(r => r.permission_key);
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  const set = useMemo(() => new Set(data), [data]);

  const has = (key: string) => isSuperAdmin || set.has(key);

  return { keys: data, set, has, isLoading, isSuperAdmin };
}