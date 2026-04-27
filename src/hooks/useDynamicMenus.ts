/**
 * Hook untuk mengelola menu dinamis dengan logika 2 lapis:
 *  1. Default per role (`role_permissions`)
 *  2. Override per user (`user_permissions`)
 * Resolusi dilakukan di server via RPC `get_user_effective_permissions`.
 */

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RECOMMENDED_MENUS } from '@/lib/admin-menu-registry';

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
  const { user, hasRole, isStaff } = useAuth();
  const isSuperAdmin = hasRole('super_admin');

  const isStaffUser = isStaff();

  // Fetch the effective permission set for the current user (role default + user overrides)
  const { data: effectiveKeys = [] } = useQuery({
    queryKey: ['user-effective-permissions', user?.id],
    queryFn: async () => {
      if (!user || isSuperAdmin || !isStaffUser) return [] as string[];
      const { data, error } = await (supabase.rpc as any)('get_user_effective_permissions', {
        _user_id: user.id,
      });
      if (error) { console.error(error); return [] as string[]; }
      return ((data || []) as Array<{ permission_key: string }>).map(r => r.permission_key);
    },
    enabled: !!user && !isSuperAdmin && isStaffUser,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60,
  });

  // Registry fallback (used when DB is empty / unreachable) — keeps sidebar usable.
  const fallbackMenus: MenuItem[] = useMemo(
    () => RECOMMENDED_MENUS.map((m, idx) => ({
      id: `fallback-${m.key}`,
      key: m.key,
      label: m.label,
      path: m.path,
      icon: m.icon,
      group_name: m.group_name,
      sort_order: m.sort_order,
      required_permission: m.required_permission,
    })),
    []
  );

  // Fetch all menus (DB) - with optimized caching
  const { data: dbMenus = [], isLoading, error, refetch } = useQuery({
    queryKey: ['dynamic-menus'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id,key,label,path,icon,group_name,sort_order,required_permission,is_visible')
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
        required_permission: m.required_permission,
        is_visible: m.is_visible
      })) as MenuItem[];
    },
    enabled: !!user && isStaffUser,
    staleTime: 1000 * 60 * 60, // 1 hour for menu items (rarely change)
    gcTime: 1000 * 60 * 60 * 24, // Keep in cache for 24 hours
  });

  // If DB returned empty (or query disabled), fall back to the static registry
  // so the sidebar always has menus to render.
  const menus: MenuItem[] = useMemo(
    () => (dbMenus && dbMenus.length > 0 ? dbMenus : fallbackMenus),
    [dbMenus, fallbackMenus]
  );

  // Realtime menu sync removed: menus rarely change and `staleTime: Infinity`
  // keeps the cache warm. Admins can manually refetch via React Query devtools or
  // by reloading after a permission/menu mutation. This eliminates an unused
  // websocket channel that was mounted for every staff session.

  // Super admin → all menus. Others → only menus whose required_permission is
  // present in the effective permission set. Menus without a required_permission
  // remain visible to every staff user (e.g. a generic admin landing).
  const allowedSet = useMemo(() => new Set(effectiveKeys), [effectiveKeys]);

  const filteredMenus = useMemo(() => {
    const visibleMenus = menus.filter(m => (m as any).is_visible !== false);
    if (isSuperAdmin) return visibleMenus;
    return visibleMenus.filter(m => !m.required_permission || allowedSet.has(m.required_permission));
  }, [menus, allowedSet, isSuperAdmin]);

  // Group menus - memoized for performance
  const groupedMenus: MenuGroup[] = useMemo(() => {
    const grouped: MenuGroup[] = filteredMenus.reduce((acc: MenuGroup[], menu: MenuItem) => {
      const existing = acc.find(g => g.name === menu.group_name);
      if (existing) { existing.items.push(menu); }
      else { acc.push({ name: menu.group_name, items: [menu] }); }
      return acc;
    }, []);

    grouped.forEach(g => g.items.sort((a, b) => a.sort_order - b.sort_order));
    return grouped;
  }, [filteredMenus]);

  // Group order logic:
  // We use the minimum sort_order of items within a group to determine the group's order.
  // This allows the Super Admin to reorder groups by moving items between them or 
  // by changing the sort_order of items.
  const sortedGroupedMenus = useMemo(() => {
    const sorted = [...groupedMenus];
    
    // Calculate the minimum sort_order for each group
    const groupMinSortOrder = groupedMenus.reduce((acc: Record<string, number>, group) => {
      acc[group.name] = Math.min(...group.items.map(item => item.sort_order));
      return acc;
    }, {});

    sorted.sort((a, b) => {
      const orderA = groupMinSortOrder[a.name] ?? 9999;
      const orderB = groupMinSortOrder[b.name] ?? 9999;
      
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.name.localeCompare(b.name);
    });
    
    return sorted;
  }, [groupedMenus]);

  /** Check if a given path is allowed for the current user.
   * Super admin → always allowed. Other staff → blocked if matching menu's
   * required_permission is in revokedKeys. Unknown paths default to allowed.
   * Memoized callback to prevent unnecessary re-creation.
   */
  const isPathAllowed = useCallback((path: string): boolean => {
    if (isSuperAdmin) return true;
    // Find the most-specific menu match (longest matching path)
    const match = menus
      .filter(m => path === m.path || (m.path !== '/admin' && path.startsWith(m.path)))
      .sort((a, b) => b.path.length - a.path.length)[0];
    if (!match || !match.required_permission) return true;
    return allowedSet.has(match.required_permission);
  }, [isSuperAdmin, menus, allowedSet]);

  return {
    menus: filteredMenus,
    groupedMenus: sortedGroupedMenus,
    isLoading,
    error,
    refetch,
    effectiveKeys,
    allowedSet,
    // Backward compat: legacy consumers expect `revokedKeys` (a list of denied keys)
    revokedKeys: [] as string[],
    isPathAllowed,
  };
};

