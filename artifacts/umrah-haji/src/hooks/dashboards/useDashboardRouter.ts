/**
 * useDashboardRouter.ts
 *
 * Hook untuk mengelola routing dinamis ke dashboard berdasarkan peran dan konfigurasi.
 * Digunakan untuk mengarahkan pengguna ke dashboard yang sesuai setelah login.
 */

import { useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDashboardAccess } from '@/hooks/dashboards/useDashboardAccess';
import { DASHBOARD_MODULES } from '@/lib/dashboard-config';

const ROUTE_MAP: Record<string, string> = {
  admin_main: '/admin',
  admin_analytics: '/admin/analytics',
  branch_manager_dashboard: '/admin/branch-manager',
  finance_dashboard: '/admin/finance-dashboard',
  sales_dashboard: '/admin/sales-dashboard',
  marketing_dashboard: '/admin/marketing-dashboard',
  equipment_dashboard: '/admin/equipment-dashboard',
  operational_dashboard: '/operational',
  agent_dashboard: '/agent',
  customer_dashboard: '/customer',
};

export const useDashboardRouter = () => {
  useAuth();
  const { primaryRole, effectiveConfig, canAccessModule, getDefaultDashboard } = useDashboardAccess();

  const getDefaultDashboardPath = useCallback((): string => {
    if (!primaryRole) return '/admin';
    const defaultModuleKey = getDefaultDashboard();
    if (!defaultModuleKey) return '/admin';
    const module = DASHBOARD_MODULES[defaultModuleKey];
    if (!module) return '/admin';
    return ROUTE_MAP[defaultModuleKey] || '/admin';
  }, [primaryRole, getDefaultDashboard]);

  const getAvailableDashboardRoutes = useCallback(() => {
    if (!effectiveConfig) return [];
    const routes: Array<{ path: string; label: string; moduleKey: string }> = [];
    effectiveConfig.enabledModules.forEach((moduleKey: string) => {
      if (!effectiveConfig.disabledModules.includes(moduleKey)) {
        const module = DASHBOARD_MODULES[moduleKey];
        if (module) {
          routes.push({
            path: ROUTE_MAP[moduleKey] || '/admin',
            label: module.label,
            moduleKey,
          });
        }
      }
    });
    return routes;
  }, [effectiveConfig]);

  const canAccessDashboardRoute = useCallback((path: string): boolean => {
    const inverse: Record<string, string> = Object.fromEntries(
      Object.entries(ROUTE_MAP).map(([k, v]) => [v, k])
    );
    const moduleKey = inverse[path];
    if (!moduleKey) return false;
    return canAccessModule(moduleKey);
  }, [canAccessModule]);

  return {
    primaryRole,
    getDefaultDashboardPath,
    getAvailableDashboardRoutes,
    canAccessDashboardRoute,
  };
};

export default useDashboardRouter;
