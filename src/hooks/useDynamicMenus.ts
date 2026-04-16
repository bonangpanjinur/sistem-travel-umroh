/**
 * Hook untuk mengelola menu dinamis
 * 
 * Fitur:
 * - Fetch semua menu items untuk user yang bukan customer
 * - Grouping menu berdasarkan kategori
 * - Caching dan real-time sync
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

/**
 * Hook untuk fetch semua menu items (tanpa filtering permission)
 */
export const useDynamicMenus = () => {
  const { user, isAdmin } = useAuth();
  const queryClient = useQueryClient();

  // Fetch all menus - no permission filtering
  const { data: menus = [], isLoading, error, refetch } = useQuery({
    queryKey: ['dynamic-menus', user?.id],
    queryFn: async () => {
      if (!user || !isAdmin()) return [];

      // Get all menu items from database
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('group_name', { ascending: true })
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching dynamic menus:', error);
        throw error;
      }

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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Real-time sync: Invalidate cache when menu_items change
  useEffect(() => {
    if (!user) return;

    // Subscribe to menu_items changes
    const menuChannel = supabase
      .channel('public:menu_items_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'menu_items'
      }, () => {
        console.log('Menu items changed, invalidating cache...');
        queryClient.invalidateQueries({ queryKey: ['dynamic-menus', user.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(menuChannel);
    };
  }, [user, queryClient]);

  // Group menus by group_name
  const groupedMenus: MenuGroup[] = menus.reduce((acc: MenuGroup[], menu: MenuItem) => {
    const existingGroup = acc.find(g => g.name === menu.group_name);
    if (existingGroup) {
      existingGroup.items.push(menu);
    } else {
      acc.push({
        name: menu.group_name,
        items: [menu]
      });
    }
    return acc;
  }, []);

  // Sort items within each group
  groupedMenus.forEach(group => {
    group.items.sort((a, b) => a.sort_order - b.sort_order);
  });

  return {
    menus,
    groupedMenus,
    isLoading,
    error,
    refetch
  };
};

/**
 * Hook untuk check akses ke menu tertentu (deprecated - always returns true for non-customer roles)
 */
export const useMenuAccess = (menuKey: string) => {
  const { user, isAdmin } = useAuth();

  const { data: hasAccess = false, isLoading } = useQuery({
    queryKey: ['menu-access', user?.id, menuKey],
    queryFn: async () => {
      if (!user || !isAdmin()) return false;
      // All non-customer roles have access to all menus
      return true;
    },
    enabled: !!user && isAdmin,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return { hasAccess, isLoading };
};

/**
 * Hook untuk check akses ke multiple menu items (deprecated - always returns true for non-customer roles)
 */
export const useMultipleMenuAccess = (menuKeys: string[]) => {
  const { user, isAdmin } = useAuth();

  const { data: accessMap = {}, isLoading } = useQuery({
    queryKey: ['menu-access-multiple', user?.id, menuKeys],
    queryFn: async () => {
      if (!user || !isAdmin() || menuKeys.length === 0) return {};

      // All non-customer roles have access to all menus
      const results: Record<string, boolean> = {};
      menuKeys.forEach(key => {
        results[key] = true;
      });
      return results;
    },
    enabled: !!user && isAdmin && menuKeys.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return { accessMap, isLoading };
};

/**
 * Hook untuk sync menu items dari frontend ke database
 * Hanya untuk admin
 */
export const useSyncMenus = () => {
  const queryClient = useQueryClient();

  const syncMenus = async (menus: any[]) => {
    try {
      const { data, error } = await supabase.rpc('bulk_sync_menu_items', {
        _menu_items: JSON.stringify(menus)
      });

      if (error) {
        throw error;
      }

      // Invalidate cache
      queryClient.invalidateQueries({ queryKey: ['dynamic-menus'] });

      return data;
    } catch (error) {
      console.error('Error syncing menus:', error);
      throw error;
    }
  };

  return { syncMenus };
};
