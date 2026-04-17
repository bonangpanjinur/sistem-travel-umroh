/**
 * Hook untuk mengelola menu dinamis dengan user-level permission filtering
 */

import { useEffect, useMemo, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface MenuItem {
  id: string;
  key: string;
  label: string;
  path: string;
  icon?: string;
  group_name: string;
  sort_order: number;
  required_permission: string;
}

export interface MenuGroup {
  name: string;
  items: MenuItem[];
}

// Singleton instance untuk menyimpan channel yang persistent
let menuChannelInstance: ReturnType<typeof supabase.channel> | null = null;
let menuChannelSubscriberCount = 0;

export const useDynamicMenus = () => {
  const { user, isAdmin, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = hasRole('super_admin');
  const isSubscribedRef = useRef(false);

  // Fetch user's revoked permissions (only relevant for staff users)
  const { data: revokedKeys = [] } = useQuery({
    queryKey: ['user-permissions-revoked', user?.id],
    queryFn: async () => {
      if (!user || isSuperAdmin) return [];
      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission_key')
        .eq('user_id', user.id)
        .eq('is_enabled', false);
      if (error) { console.error(error); return []; }
      return (data || []).map((d: any) => d.permission_key as string);
    },
    enabled: !!user && !isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch all menus
  const { data: menus = [], isLoading, error, refetch } = useQuery({
    queryKey: ['dynamic-menus', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('group_name', { ascending: true })
        .order('sort_order', { ascending: true });
      if (error) { console.error(error); throw error; }
      return (data || []).map((m: any) => ({
        id: m.id,
        key: m.key,
        label: m.label,
        path: m.path,
        icon: m.icon,
        group_name: m.group_name,
        sort_order: m.sort_order,
        required_permission: m.required_permission
      }));
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });

  // Realtime sync dengan persistent channel management
  useEffect(() => {
    if (!user) return;

    // Jika channel sudah ada dan sudah disubscribe, jangan buat yang baru
    if (menuChannelInstance && isSubscribedRef.current) {
      menuChannelSubscriberCount++;
      return () => {
        menuChannelSubscriberCount--;
        // Hanya hapus channel jika tidak ada subscriber lagi
        if (menuChannelSubscriberCount === 0 && menuChannelInstance) {
          supabase.removeChannel(menuChannelInstance);
          menuChannelInstance = null;
        }
      };
    }

    // Buat channel baru hanya jika belum ada
    if (!menuChannelInstance) {
      menuChannelInstance = supabase
        .channel('menu_items_changes_persistent')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
          queryClient.invalidateQueries({ queryKey: ['dynamic-menus', user.id] });
        })
        .subscribe((status) => {
          // Ubah console behavior untuk CLOSED status
          if (status === 'CLOSED' && process.env.NODE_ENV === 'development') {
            console.debug('[Dynamic Menus] Channel closed (expected behavior)');
          }
          if (status === 'CHANNEL_ERROR') {
            console.error('[Dynamic Menus] Channel error:', status);
          }
        });
    }

    isSubscribedRef.current = true;
    menuChannelSubscriberCount++;

    return () => {
      menuChannelSubscriberCount--;
      // Hanya hapus channel jika tidak ada subscriber lagi
      if (menuChannelSubscriberCount === 0 && menuChannelInstance) {
        supabase.removeChannel(menuChannelInstance);
        menuChannelInstance = null;
        isSubscribedRef.current = false;
      }
    };
  }, [user, queryClient]);

  // Super admin → all menus. Other staff → hide menus whose required_permission
  // appears in revokedKeys (user has explicit is_enabled=false override).
  const filteredMenus = useMemo(() => {
    if (isSuperAdmin) return menus;
    if (!revokedKeys || revokedKeys.length === 0) return menus;
    const revokedSet = new Set(revokedKeys);
    return menus.filter(m => !m.required_permission || !revokedSet.has(m.required_permission));
  }, [menus, revokedKeys, isSuperAdmin]);

  // Group menus
  const groupedMenus: MenuGroup[] = filteredMenus.reduce((acc: MenuGroup[], menu: MenuItem) => {
    const existing = acc.find(g => g.name === menu.group_name);
    if (existing) { existing.items.push(menu); }
    else { acc.push({ name: menu.group_name, items: [menu] }); }
    return acc;
  }, []);

  groupedMenus.forEach(g => g.items.sort((a, b) => a.sort_order - b.sort_order));

  /** Check if a given path is allowed for the current user.
   * Super admin → always allowed. Other staff → blocked if matching menu's
   * required_permission is in revokedKeys. Unknown paths default to allowed.
   */
  const isPathAllowed = (path: string): boolean => {
    if (isSuperAdmin) return true;
    if (!revokedKeys || revokedKeys.length === 0) return true;
    const revokedSet = new Set(revokedKeys);
    // Find the most-specific menu match (longest matching path)
    const match = menus
      .filter(m => path === m.path || (m.path !== '/admin' && path.startsWith(m.path)))
      .sort((a, b) => b.path.length - a.path.length)[0];
    if (!match || !match.required_permission) return true;
    return !revokedSet.has(match.required_permission);
  };

  return { menus: filteredMenus, groupedMenus, isLoading, error, refetch, revokedKeys, isPathAllowed };
};

/** @deprecated Always returns true — access is controlled via user_permissions */
export const useMenuAccess = (_menuKey: string) => ({ hasAccess: true, isLoading: false });

/** @deprecated Always returns true — access is controlled via user_permissions */
export const useMultipleMenuAccess = (menuKeys: string[]) => {
  const map: Record<string, boolean> = {};
  menuKeys.forEach(k => { map[k] = true; });
  return { accessMap: map, isLoading: false };
};

export const useSyncMenus = () => {
  const queryClient = useQueryClient();
  const syncMenus = async (menus: any[]) => {
    // Backend signature is bulk_sync_menu_items(_menu_items JSONB)
    // Sends JSON stringified array of menu items
    const { data, error } = await supabase.rpc('bulk_sync_menu_items', {
      _menu_items: JSON.stringify(menus),
    });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['dynamic-menus'] });
    return data;
  };
  return { syncMenus };
};
