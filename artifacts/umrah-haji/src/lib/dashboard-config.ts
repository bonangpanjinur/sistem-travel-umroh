/**
 * dashboard-config.ts
 * 
 * Konfigurasi dashboard berbasis peran.
 * Mendefinisikan modul dashboard yang tersedia untuk setiap peran.
 */

import { AppRole } from "@/types/database";

export interface DashboardModule {
  id: string;
  key: string;
  label: string;
  description: string;
  component: string; // Component path
  icon: string;
  requiredPermission: string;
  requiredRoles: AppRole[];
}

export interface RoleDashboardConfig {
  role: AppRole;
  label: string;
  description: string;
  defaultDashboard: string; // Module key
  availableModules: string[]; // Module keys
}

/**
 * Dashboard modules yang tersedia dalam sistem
 */
export const DASHBOARD_MODULES: Record<string, DashboardModule> = {
  // Admin Dashboards
  admin_main: {
    id: 'admin-main',
    key: 'admin_main',
    label: 'Dashboard Utama',
    description: 'Dashboard ringkasan untuk super admin dan owner',
    component: 'AdminDashboard',
    icon: 'LayoutDashboard',
    requiredPermission: 'dashboard',
    requiredRoles: ['super_admin', 'owner'],
  },
  admin_analytics: {
    id: 'admin-analytics',
    key: 'admin_analytics',
    label: 'Analytics',
    description: 'Analisis mendalam data bisnis',
    component: 'AdminAnalytics',
    icon: 'BarChart3',
    requiredPermission: 'analytics',
    requiredRoles: ['super_admin', 'owner'],
  },

  // Branch Manager Dashboard
  branch_manager_dashboard: {
    id: 'branch-manager-dashboard',
    key: 'branch_manager_dashboard',
    label: 'Dashboard Cabang',
    description: 'Dashboard khusus untuk manajer cabang',
    component: 'BranchManagerDashboard',
    icon: 'Building2',
    requiredPermission: 'branch_manager_dashboard',
    requiredRoles: ['branch_manager'],
  },

  // Finance Dashboard
  finance_dashboard: {
    id: 'finance-dashboard',
    key: 'finance_dashboard',
    label: 'Dashboard Keuangan',
    description: 'Dashboard untuk tim keuangan',
    component: 'FinanceDashboard',
    icon: 'PieChart',
    requiredPermission: 'finance_dashboard',
    requiredRoles: ['finance'],
  },

  // Sales Dashboard
  sales_dashboard: {
    id: 'sales-dashboard',
    key: 'sales_dashboard',
    label: 'Dashboard Penjualan',
    description: 'Dashboard untuk tim sales',
    component: 'SalesDashboard',
    icon: 'TrendingUp',
    requiredPermission: 'sales_dashboard',
    requiredRoles: ['sales'],
  },

  // Marketing Dashboard
  marketing_dashboard: {
    id: 'marketing-dashboard',
    key: 'marketing_dashboard',
    label: 'Dashboard Marketing',
    description: 'Dashboard untuk tim marketing',
    component: 'MarketingDashboard',
    icon: 'Megaphone',
    requiredPermission: 'marketing_dashboard',
    requiredRoles: ['marketing'],
  },

  // Equipment Dashboard
  equipment_dashboard: {
    id: 'equipment-dashboard',
    key: 'equipment_dashboard',
    label: 'Dashboard Perlengkapan',
    description: 'Dashboard untuk manajemen perlengkapan',
    component: 'EquipmentDashboard',
    icon: 'Backpack',
    requiredPermission: 'equipment_dashboard',
    requiredRoles: ['equipment'],
  },

  // Operational Dashboard
  operational_dashboard: {
    id: 'operational-dashboard',
    key: 'operational_dashboard',
    label: 'Dashboard Operasional',
    description: 'Dashboard untuk tim operasional',
    component: 'OperationalDashboard',
    icon: 'Activity',
    requiredPermission: 'operational_dashboard',
    requiredRoles: ['operational'],
  },

  // Agent Dashboard
  agent_dashboard: {
    id: 'agent-dashboard',
    key: 'agent_dashboard',
    label: 'Dashboard Agen',
    description: 'Dashboard untuk agen',
    component: 'AgentDashboard',
    icon: 'UserSquare2',
    requiredPermission: 'agent_dashboard',
    requiredRoles: ['agent'],
  },

  // Customer Dashboard
  customer_dashboard: {
    id: 'customer-dashboard',
    key: 'customer_dashboard',
    label: 'Dashboard Jamaah',
    description: 'Dashboard untuk pelanggan',
    component: 'CustomerDashboard',
    icon: 'Users',
    requiredPermission: 'customer_dashboard',
    requiredRoles: ['customer'],
  },
};

/**
 * Konfigurasi dashboard untuk setiap peran
 */
export const ROLE_DASHBOARD_CONFIG: Record<AppRole, RoleDashboardConfig> = {
  super_admin: {
    role: 'super_admin',
    label: 'Super Admin',
    description: 'Akses penuh ke semua dashboard',
    defaultDashboard: 'admin_main',
    availableModules: [
      'admin_main',
      'admin_analytics',
      'branch_manager_dashboard',
      'finance_dashboard',
      'sales_dashboard',
      'marketing_dashboard',
      'equipment_dashboard',
      'operational_dashboard',
    ],
  },
  owner: {
    role: 'owner',
    label: 'Owner',
    description: 'Akses penuh ke semua dashboard',
    defaultDashboard: 'admin_main',
    availableModules: [
      'admin_main',
      'admin_analytics',
      'branch_manager_dashboard',
      'finance_dashboard',
      'sales_dashboard',
      'marketing_dashboard',
      'equipment_dashboard',
      'operational_dashboard',
    ],
  },
  branch_manager: {
    role: 'branch_manager',
    label: 'Manajer Cabang',
    description: 'Dashboard khusus untuk manajer cabang',
    defaultDashboard: 'branch_manager_dashboard',
    availableModules: ['branch_manager_dashboard'],
  },
  finance: {
    role: 'finance',
    label: 'Tim Keuangan',
    description: 'Dashboard khusus untuk tim keuangan',
    defaultDashboard: 'finance_dashboard',
    availableModules: ['finance_dashboard'],
  },
  sales: {
    role: 'sales',
    label: 'Tim Sales',
    description: 'Dashboard khusus untuk tim sales',
    defaultDashboard: 'sales_dashboard',
    availableModules: ['sales_dashboard'],
  },
  marketing: {
    role: 'marketing',
    label: 'Tim Marketing',
    description: 'Dashboard khusus untuk tim marketing',
    defaultDashboard: 'marketing_dashboard',
    availableModules: ['marketing_dashboard'],
  },
  operational: {
    role: 'operational',
    label: 'Tim Operasional',
    description: 'Dashboard khusus untuk tim operasional',
    defaultDashboard: 'operational_dashboard',
    availableModules: ['operational_dashboard'],
  },
  equipment: {
    role: 'equipment',
    label: 'Tim Perlengkapan',
    description: 'Dashboard khusus untuk manajemen perlengkapan',
    defaultDashboard: 'equipment_dashboard',
    availableModules: ['equipment_dashboard'],
  },
  agent: {
    role: 'agent',
    label: 'Agen',
    description: 'Dashboard khusus untuk agen',
    defaultDashboard: 'agent_dashboard',
    availableModules: ['agent_dashboard'],
  },
  customer: {
    role: 'customer',
    label: 'Jamaah',
     description: 'Dashboard khusus untuk jamaah',
    defaultDashboard: 'customer_dashboard',
    availableModules: ['customer_dashboard'],
  },
  sub_agent: {
    role: 'sub_agent',
    label: 'Sub Agen',
    description: 'Dashboard untuk sub-agen di bawah agen induk',
    defaultDashboard: 'agent_dashboard',
    availableModules: ['agent_dashboard'],
  },
};

/**
 * Get default dashboard untuk sebuah peran
 */
export const getDefaultDashboardForRole = (role: AppRole): string => {
  return ROLE_DASHBOARD_CONFIG[role]?.defaultDashboard || 'admin_main';
};

/**
 * Get available modules untuk sebuah peran
 */
export const getAvailableModulesForRole = (role: AppRole): string[] => {
  return ROLE_DASHBOARD_CONFIG[role]?.availableModules || [];
};

/**
 * Get dashboard module by key
 */
export const getDashboardModule = (key: string): DashboardModule | undefined => {
  return DASHBOARD_MODULES[key];
};

/**
 * Check if role dapat mengakses module
 */
export const canAccessDashboardModule = (role: AppRole, moduleKey: string): boolean => {
  const availableModules = getAvailableModulesForRole(role);
  return availableModules.includes(moduleKey);
};
