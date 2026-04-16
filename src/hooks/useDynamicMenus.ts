/**
 * Hook untuk mengelola menu dinamis berdasarkan hak akses user
 * 
 * Fitur:
 * - Fetch menu items yang dapat diakses user
 * - Grouping menu berdasarkan kategori
 * - Caching dan real-time sync
 * - Support untuk menu override per user
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
 * Hook untuk fetch menu items yang dapat diakses user
 */
export const useDynamicMenus = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch accessible menus
  const { data: menus = [], isLoading, error, refetch } = useQuery({
    queryKey: ['dynamic-menus', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Call RPC function to get accessible menus
      const { data, error } = await supabase.rpc('get_user_accessible_menus', {
        _user_id: user.id
      });

      if (error) {
        console.error('Error fetching dynamic menus:', error);
        throw error;
      }

      // Filter only accessible menus
      return (data || [])
        .filter((m: any) => m.has_access)
        .map((m: any) => ({
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
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Real-time sync: Invalidate cache when menu_items or permissions change
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

    // Subscribe to user_permissions changes
    const permChannel = supabase
      .channel('public:user_permissions_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'user_permissions',
        filter: `user_id=eq.${user.id}`
      }, () => {
        console.log('User permissions changed, invalidating cache...');
        queryClient.invalidateQueries({ queryKey: ['dynamic-menus', user.id] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(menuChannel);
      supabase.removeChannel(permChannel);
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
 * Hook untuk check akses ke menu tertentu
 */
export const useMenuAccess = (menuKey: string) => {
  const { user } = useAuth();

  const { data: hasAccess = false, isLoading } = useQuery({
    queryKey: ['menu-access', user?.id, menuKey],
    queryFn: async () => {
      if (!user) return false;

      // Get menu item
      const { data: menu, error: menuError } = await supabase
        .from('menu_items')
        .select('required_permission')
        .eq('key', menuKey)
        .single();

      if (menuError) {
        console.error('Error fetching menu:', menuError);
        return false;
      }

      // Check permission
      const { data: hasAccess, error: permError } = await supabase.rpc(
        'get_user_effective_permission',
        {
          _user_id: user.id,
          _permission_key: menu.required_permission
        }
      );

      if (permError) {
        console.error('Error checking permission:', permError);
        return false;
      }

      return hasAccess || false;
    },
    enabled: !!user && !!menuKey,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return { hasAccess, isLoading };
};

/**
 * Hook untuk check akses ke multiple menu items
 */
export const useMultipleMenuAccess = (menuKeys: string[]) => {
  const { user } = useAuth();

  const { data: accessMap = {}, isLoading } = useQuery({
    queryKey: ['menu-access-multiple', user?.id, menuKeys],
    queryFn: async () => {
      if (!user || menuKeys.length === 0) return {};

      // Get all menu items
      const { data: menus, error: menusError } = await supabase
        .from('menu_items')
        .select('key, required_permission')
        .in('key', menuKeys);

      if (menusError) {
        console.error('Error fetching menus:', menusError);
        return {};
      }

      // Check access for each menu
      const results: Record<string, boolean> = {};
      await Promise.all(
        menus.map(async (menu: any) => {
          const { data: hasAccess, error } = await supabase.rpc(
            'get_user_effective_permission',
            {
              _user_id: user.id,
              _permission_key: menu.required_permission
            }
          );

          results[menu.key] = (hasAccess || false);
        })
      );

      return results;
    },
    enabled: !!user && menuKeys.length > 0,
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
