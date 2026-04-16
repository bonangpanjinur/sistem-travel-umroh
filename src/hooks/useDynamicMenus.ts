/**
 * Hook untuk mengelola menu dinamis dengan user-level permission filtering
 */

import { useEffect } from 'react';
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

export const useDynamicMenus = () => {
  const { user, isAdmin, hasRole } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = hasRole('super_admin');

  // Fetch user's revoked permissions
  const { data: revokedKeys = [] } = useQuery({
    queryKey: ['user-permissions-revoked', user?.id],
    queryFn: async () => {
      if (!user || isSuperAdmin) return []; // super admin bypasses
      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission_key')
        .eq('user_id', user.id)
        .eq('is_enabled', false);
      if (error) { console.error(error); return []; }
      return (data || []).map((d: any) => d.permission_key as string);
    },
    enabled: !!user && isAdmin && !isSuperAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // Fetch all menus
  const { data: menus = [], isLoading, error, refetch } = useQuery({
    queryKey: ['dynamic-menus', user?.id],
    queryFn: async () => {
      if (!user || !isAdmin()) return [];
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
    enabled: !!user && isAdmin,
    staleTime: 1000 * 60 * 5,
  });

  // Realtime sync
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel('menu_items_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        queryClient.invalidateQueries({ queryKey: ['dynamic-menus', user.id] });
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, queryClient]);

  // Filter out revoked menus (super admin sees all)
  const filteredMenus = isSuperAdmin
    ? menus
    : menus.filter((m: MenuItem) => !revokedKeys.includes(m.required_permission));

  // Group menus
  const groupedMenus: MenuGroup[] = filteredMenus.reduce((acc: MenuGroup[], menu: MenuItem) => {
    const existing = acc.find(g => g.name === menu.group_name);
    if (existing) { existing.items.push(menu); }
    else { acc.push({ name: menu.group_name, items: [menu] }); }
    return acc;
  }, []);

  groupedMenus.forEach(g => g.items.sort((a, b) => a.sort_order - b.sort_order));

  /** Check if a given path is allowed for the current user */
  const isPathAllowed = (path: string): boolean => {
    if (isSuperAdmin) return true;
    if (revokedKeys.length === 0) return true;
    // Find menu item matching this path
    const menuItem = menus.find((m: MenuItem) => m.path === path || (m.path !== '/admin' && path.startsWith(m.path)));
    if (!menuItem) return true; // no matching menu = allow (e.g. detail pages)
    return !revokedKeys.includes(menuItem.required_permission);
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
    const { data, error } = await supabase.rpc('bulk_sync_menu_items', {
      _menu_items: JSON.stringify(menus)
    });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['dynamic-menus'] });
    return data;
  };
  return { syncMenus };
};
