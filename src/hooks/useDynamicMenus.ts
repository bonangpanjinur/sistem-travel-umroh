/**
 * Hook untuk mengelola menu dinamis dengan user-level permission filtering.
 * Single source of truth: `menu_items` + `user_permissions` (revocations only).
 */

import { useMemo } from 'react';
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

  // Fetch user's revoked permissions (only relevant for staff users)
  const { data: revokedKeys = [] } = useQuery({
    queryKey: ['user-permissions-revoked', user?.id],
    queryFn: async () => {
      if (!user || isSuperAdmin || !isStaffUser) return [];
      const { data, error } = await supabase
        .from('user_permissions')
        .select('permission_key')
        .eq('user_id', user.id)
        .eq('is_enabled', false);
      if (error) { console.error(error); return []; }
      return (data || []).map((d: any) => d.permission_key as string);
    },
    enabled: !!user && !isSuperAdmin && isStaffUser,
    staleTime: 1000 * 60 * 30, // Increase staleTime to 30 mins
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
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

  // Fetch all menus (DB)
  const { data: dbMenus = [], isLoading, error, refetch } = useQuery({
    queryKey: ['dynamic-menus'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_items')
        .select('id,key,label,path,icon,group_name,sort_order,required_permission')
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
      })) as MenuItem[];
    },
    enabled: !!user && isStaffUser,
    staleTime: Infinity,
    gcTime: 1000 * 60 * 60,
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

