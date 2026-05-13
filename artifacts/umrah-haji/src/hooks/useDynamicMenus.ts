/**
 * Hook untuk mengelola menu dinamis dengan logika 2 lapis:
 *  1. Default per role (`role_permissions`)
 *  2. Override per user (`user_permissions`)
 * Resolusi dilakukan di server via RPC `get_user_effective_permissions`.
 */

import { useMemo, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { RECOMMENDED_MENUS, ROLE_DEFAULT_PERMISSIONS } from '@/lib/admin-menu-registry';
import { getInheritedRoles } from '@/lib/permissions';
import { AppRole } from '@/types/database';

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
  const { user, roles, hasRole, isStaff } = useAuth();
  const isSuperAdmin = hasRole('super_admin');
  const queryClient = useQueryClient();

  const isStaffUser = isStaff();

  // RBAC-F3: persist last-known-good effective permissions to localStorage so that
  // when the DB / RPC fails (offline, network error) we restore from cache instead
  // of falling back to the registry defaults (which would grant near-full access).
  const cacheKey = user?.id ? `rbac.effective.${user.id}` : null;

  // RBAC-F4: realtime invalidation — listen to user_permissions & user_roles
  // changes for the current user so granted/revoked permissions take effect
  // immediately without waiting for the 15-minute staleTime.
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`rbac-realtime-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_permissions', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_roles', filter: `user_id=eq.${user.id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'role_permissions' },
        () => {
          // Role-wide change affects every user with that role.
          queryClient.invalidateQueries({ queryKey: ['user-effective-permissions'] });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, queryClient]);

  const readCache = (): string[] => {
    if (!cacheKey || typeof window === 'undefined') return [];
    try {
      const raw = window.localStorage.getItem(cacheKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed?.keys) ? parsed.keys : [];
    } catch { return []; }
  };
  const writeCache = (keys: string[]) => {
    if (!cacheKey || typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(cacheKey, JSON.stringify({ keys, ts: Date.now() }));
    } catch { /* ignore quota errors */ }
  };

  // Fetch the effective permission set for the current user (role default + user overrides)
  const { data: effectiveKeys = [] } = useQuery({
    queryKey: ['user-effective-permissions', user?.id, roles?.join(',')],
    queryFn: async () => {
      if (!user || isSuperAdmin || !isStaffUser) return [] as string[];

      // RBAC-F1: Source roles from useAuth().roles (DB user_roles table) — not auth metadata.
      const userRoles: AppRole[] = roles || [];
      const expandedRoles: AppRole[] = [...userRoles];
      userRoles.forEach((role: AppRole) => {
        expandedRoles.push(...getInheritedRoles(role));
      });
      const uniqueRoles = Array.from(new Set(expandedRoles));

      const { data, error } = await (supabase.rpc as any)('get_user_effective_permissions_v2', {
        _user_id: user.id,
        _roles: uniqueRoles
      });

      // Fallback to legacy RPC if v2 doesn't exist
      if (error && error.message.includes('function') && error.message.includes('does not exist')) {
        const { data: legacyData, error: legacyError } = await (supabase.rpc as any)('get_user_effective_permissions', {
          _user_id: user.id,
        });
        if (legacyError) {
          console.error('[RBAC-F3] legacy RPC failed, using localStorage cache', legacyError);
          return readCache();
        }
        const keys = ((legacyData || []) as Array<{ permission_key: string }>).map((r: any) => r.permission_key);
        writeCache(keys);
        return keys;
      }

      if (error) {
        console.error('[RBAC-F3] permission RPC failed, using localStorage cache', error);
        return readCache();
      }
      const keys = ((data || []) as Array<{ permission_key: string }>).map((r: any) => r.permission_key);
      writeCache(keys);
      return keys;
    },
    enabled: !!user && !isSuperAdmin && isStaffUser,
    staleTime: 1000 * 60 * 15, // Sync with useEffectivePermissions (15m)
    gcTime: 1000 * 60 * 60,    // 1 hour
  });

  // Registry fallback (used when DB is empty / unreachable) — keeps sidebar usable.
  const fallbackMenus: MenuItem[] = useMemo(
    () => RECOMMENDED_MENUS.map((m) => ({
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

  // Role-based fallback for effectiveKeys when Supabase is not connected
  // or role_permissions table is empty. Uses ROLE_DEFAULT_PERMISSIONS as the default.
  const roleBasedFallbackKeys = useMemo(() => {
    if (isSuperAdmin || !isStaffUser || !user) return [] as string[];
    const userRoles: string[] = roles || [];
    const keys = new Set<string>();
    userRoles.forEach((role) => {
      const defaults = ROLE_DEFAULT_PERMISSIONS[role] || [];
      defaults.forEach((k) => keys.add(k));
    });
    return Array.from(keys);
  }, [isSuperAdmin, isStaffUser, user, roles]);

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
  // If effectiveKeys is empty (DB unreachable / no permissions seeded),
  // fall back to the role-based defaults so the sidebar is always usable.
  const resolvedEffectiveKeys = useMemo(
    () => (effectiveKeys.length > 0 ? effectiveKeys : roleBasedFallbackKeys),
    [effectiveKeys, roleBasedFallbackKeys]
  );

  const allowedSet = useMemo(() => new Set(resolvedEffectiveKeys), [resolvedEffectiveKeys]);

  /**
   * Tolerant permission match — handles drift between menu_items.required_permission
   * (simple keys: "customers", "payments") and role_permissions.permission_key,
   * which may still contain legacy granular keys ("customers.view", "payments.verify").
   *
   * A menu's required_permission `req` is granted if ANY of these are in effectiveSet:
   *   - req itself                            (e.g. "customers")
   *   - req + ".view"  / ".list" / ".read"    (e.g. "customers.view")
   *   - any key starting with `req + "."`     (legacy granular keys)
   *   - the prefix before "." matches req     (reverse case)
   */
  const matchesPermission = useCallback(
    (req: string | null | undefined, set: Set<string>): boolean => {
      if (!req) return true;
      if (set.has(req)) return true;
      const variants = [`${req}.view`, `${req}.list`, `${req}.read`, `${req}.manage`];
      if (variants.some((v) => set.has(v))) return true;
      // Any key starting with "<req>." → granular legacy key
      for (const k of set) {
        if (k.startsWith(`${req}.`)) return true;
        const root = k.split('.')[0];
        if (root === req) return true;
      }
      return false;
    },
    []
  );

  const filteredMenus = useMemo(() => {
    if (isSuperAdmin) {
      // Super admin always sees the COMPLETE registry, regardless of what is in the DB.
      // DB menus are used for custom labels/ordering; registry fills any gaps.
      const dbKeys = new Set(dbMenus.map(m => m.key));
      const merged = [...dbMenus];
      fallbackMenus.forEach(m => {
        if (!dbKeys.has(m.key)) merged.push(m);
      });
      return merged;
    }
    const visibleMenus = menus.filter(m => (m as any).is_visible !== false);
    return visibleMenus.filter(m => matchesPermission(m.required_permission, allowedSet));
  }, [menus, dbMenus, fallbackMenus, allowedSet, isSuperAdmin, matchesPermission]);

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
    return matchesPermission(match.required_permission, allowedSet);
  }, [isSuperAdmin, menus, allowedSet, matchesPermission]);

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

