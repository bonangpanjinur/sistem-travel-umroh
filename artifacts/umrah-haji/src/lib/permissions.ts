import { AppRole } from '@/types/database';

/**
 * Centralized Permission Keys
 * 
 * Using constants for permission keys ensures type safety, avoids typos,
 * and makes it easy to find all references to a specific permission.
 */

export const PERMISSIONS = {
  // Overview
  DASHBOARD: 'dashboard',
  ANALYTICS: 'analytics',

  // Penjualan
  LEADS: 'leads',
  BOOKINGS: 'bookings',
  PACKAGES: 'packages',
  PACKAGE_TYPES: 'package-types',
  COUPONS: 'coupons',

  // Konten & Marketing
  ANNOUNCEMENTS: 'announcements',
  BANNERS: 'banners',
  LANDING_PAGES: 'landing-pages',
  MARKETING_MATERIALS: 'marketing-materials',
  WHATSAPP: 'whatsapp',

  // Keberangkatan
  DEPARTURES: 'departures',
  ROOM_ASSIGNMENTS: 'room-assignments',
  HAJI: 'haji',
  MANASIK: 'manasik',
  ITINERARY_TEMPLATES: 'itinerary-templates',
  EQUIPMENT: 'equipment',

  // Keuangan
  PAYMENTS: 'payments',
  FINANCE_CASH: 'finance-cash',
  FINANCE_AR: 'finance-ar',
  FINANCE_AP: 'finance-ap',
  FINANCE: 'finance',
  SAVINGS: 'savings',
  REPORTS: 'reports',
  ADVANCED_REPORTS: 'advanced-reports',
  SCHEDULED_REPORTS: 'scheduled-reports',

  // Jamaah & Agen
  CUSTOMERS: 'customers',
  AGENTS: 'agents',
  BRANCHES: 'branches',
  LOYALTY: 'loyalty',
  REFERRALS: 'referrals',
  VISA: 'visa',

  // SDM
  HR: 'hr',
  PAYROLL: 'payroll',

  // Dokumen
  DOCUMENT_VERIFICATION: 'document-verification',
  DOCUMENT_TYPES: 'document-types',
  DOCUMENTS_GENERATOR: 'documents-generator',
  OFFLINE_CONTENT: 'offline-content',
  SUPPORT: 'support',

  // Master Data
  HOTELS: 'hotels',
  AIRLINES: 'airlines',
  AIRPORTS: 'airports',
  VENDORS: 'vendors',
  MUTHAWIFS: 'muthawifs',
  BUS_PROVIDERS: 'bus-providers',
  MASTER_DATA: 'master-data',

  // Pengaturan
  USERS: 'users',
  ROLES: 'roles',
  DASHBOARD_ACCESS: 'dashboard-access',
  RBAC_TOOLS: 'rbac-tools',
  RBAC_STATUS: 'rbac-status',
  SECURITY_AUDIT: 'security-audit',
  TWO_FA: '2fa',
  APPEARANCE: 'appearance',
  SETTINGS: 'settings',
  API_CONNECT: 'api-connect',
  SUPABASE_SETUP: 'supabase-setup',
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Helper to get all permission keys as an array
 */
export const ALL_PERMISSION_KEYS = Object.values(PERMISSIONS);

/**
 * Role Hierarchy Definition
 * 
 * Defines which roles inherit permissions from other roles.
 * Format: [role]: [inherited_roles]
 */
export const ROLE_HIERARCHY: Record<string, string[]> = {
  super_admin: ['owner'],
  owner: ['branch_manager', 'finance'],
  branch_manager: ['operational', 'sales', 'marketing'],
  finance: [],
  operational: ['equipment'],
  sales: ['agent'],
  marketing: [],
  equipment: [],
  agent: [],
};

/**
 * Helper to get all inherited roles for a given role (recursive)
 */
export function getInheritedRoles(role: AppRole): AppRole[] {
  const inherited = (ROLE_HIERARCHY[role] || []) as AppRole[];
  let allInherited = [...inherited];
  
  for (const childRole of inherited) {
    allInherited = [...allInherited, ...getInheritedRoles(childRole)];
  }
  
  return Array.from(new Set(allInherited));
}
