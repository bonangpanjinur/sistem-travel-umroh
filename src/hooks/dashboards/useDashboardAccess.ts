/**
 * useDashboardAccess.ts
 * 
 * Hook untuk mengelola akses dashboard berbasis peran dan konfigurasi dinamis.
 * Mengintegrasikan role-based access dengan dynamic configuration dari super_admin.
 */

import { useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fromExtra } from '@/integrations/supabase/extra-tables';
import { useAuth } from '@/hooks/useAuth';
import {
  DASHBOARD_MODULES,
  ROLE_DASHBOARD_CONFIG,
  getAvailableModulesForRole,
  getDefaultDashboardForRole,
  canAccessDashboardModule,
} from '@/lib/dashboard-config';
import { AppRole } from '@/types/database';

export interface DashboardAccessConfig {
  role: AppRole;
  enabledModules: string[];
  disabledModules: string[];
  defaultDashboard: string;
}

export const useDashboardAccess = () => {
  const { user, hasRole, roles } = useAuth();
  const isSuperAdmin = hasRole('super_admin') || hasRole('owner');

  // Get primary role (first role in the list)
  const primaryRole = useMemo(() => {
    if (!roles || roles.length === 0) return null;
    return roles[0] as AppRole;
  }, [roles]);

  // Fetch dynamic dashboard access configuration from database
  const { data: dynamicConfig = null, isLoading: configLoading } = useQuery({
    queryKey: ['dashboard-access-config', primaryRole],
    queryFn: async () => {
      if (!primaryRole) return null;

      const { data, error } = await fromExtra('dashboard_access_config')
        .select('*')
        .eq('role', primaryRole)
        .maybeSingle();

      if (error) {
        // PGRST116 = no rows returned, which is OK
        // 42P01 = table does not exist
        // 404 = table not found
        if (error.code !== 'PGRST116' && error.code !== '42P01' && (error as any).status !== 404) {
          console.error('Error fetching dashboard config:', error);
        }
      }

      return data;
    },
    enabled: !!primaryRole && !isSuperAdmin,
    staleTime: 1000 * 60 * 30, // 30 minutes
    gcTime: 1000 * 60 * 60 * 2, // 2 hours
  });

  // Compute effective access configuration
  const effectiveConfig = useMemo((): DashboardAccessConfig | null => {
    if (!primaryRole) return null;

    // Super admin has access to all modules
    if (isSuperAdmin) {
      const allModules = Object.keys(DASHBOARD_MODULES);
      return {
        role: primaryRole,
        enabledModules: allModules,
        disabledModules: [],
        defaultDashboard: getDefaultDashboardForRole(primaryRole),
      };
    }

    // For other roles, combine default config with dynamic overrides
    const defaultModules = getAvailableModulesForRole(primaryRole);
    const enabledModules = dynamicConfig?.enabled_modules ?? defaultModules;
    const disabledModules = dynamicConfig?.disabled_modules ?? [];

    return {
      role: primaryRole,
      enabledModules,
      disabledModules,
      defaultDashboard: dynamicConfig?.default_dashboard ?? getDefaultDashboardForRole(primaryRole),
    };
  }, [primaryRole, isSuperAdmin, dynamicConfig]);

  // Get list of accessible dashboard modules
  const accessibleModules = useMemo(() => {
    if (!effectiveConfig) return [];

    return effectiveConfig.enabledModules
      .filter(moduleKey => !effectiveConfig.disabledModules.includes(moduleKey))
      .map(moduleKey => DASHBOARD_MODULES[moduleKey])
      .filter(Boolean);
  }, [effectiveConfig]);

  // Check if user can access a specific dashboard module
  const canAccessModule = useCallback((moduleKey: string): boolean => {
    if (!effectiveConfig) return false;
    if (isSuperAdmin) return true;

    return (
      effectiveConfig.enabledModules.includes(moduleKey) &&
      !effectiveConfig.disabledModules.includes(moduleKey)
    );
  }, [effectiveConfig, isSuperAdmin]);

  // Get default dashboard for current role
  const getDefaultDashboard = useCallback((): string => {
    if (!effectiveConfig) return 'admin_main';
    return effectiveConfig.defaultDashboard;
  }, [effectiveConfig]);

  // Get dashboard module by key
  const getModule = useCallback((moduleKey: string) => {
    return DASHBOARD_MODULES[moduleKey];
  }, []);

  return {
    primaryRole,
    effectiveConfig,
    accessibleModules,
    canAccessModule,
    getDefaultDashboard,
    getModule,
    isLoading: configLoading,
    isSuperAdmin,
  };
};

export default useDashboardAccess;
