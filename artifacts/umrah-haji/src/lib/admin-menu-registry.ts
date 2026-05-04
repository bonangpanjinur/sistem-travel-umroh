/**
 * Canonical admin menu registry.
 *
 * Groups:
 *   Overview · Penjualan · Keberangkatan · Keuangan · Jamaah & Agen
 *   SDM · Marketing · Dokumen · Master Data · Pengaturan
 *
 * Each permission key is UNIQUE — no two items share the same key.
 * Super-admin always receives every item regardless of DB state.
 */

export interface AdminMenuItem {
  key: string;
  label: string;
  path: string;
  icon: string;
  group_name: string;
  sort_order: number;
  required_permission: string;
}

export const RECOMMENDED_MENUS: AdminMenuItem[] = [
  // ── Overview ──────────────────────────────────────────────────────────────
  { key: 'dashboard',         label: 'Dashboard',          path: '/admin',                  icon: 'LayoutDashboard',  group_name: 'Overview',        sort_order: 1,  required_permission: 'dashboard' },
  { key: 'analytics',         label: 'Analytics',          path: '/admin/analytics',         icon: 'BarChart3',        group_name: 'Overview',        sort_order: 2,  required_permission: 'analytics' },

  // ── Penjualan ─────────────────────────────────────────────────────────────
  { key: 'leads',             label: 'Leads',              path: '/admin/leads',             icon: 'UserPlus',         group_name: 'Penjualan',       sort_order: 1,  required_permission: 'leads' },
  { key: 'bookings',          label: 'Booking',            path: '/admin/bookings',          icon: 'BookOpen',         group_name: 'Penjualan',       sort_order: 2,  required_permission: 'bookings' },
  { key: 'packages',          label: 'Paket',              path: '/admin/packages',          icon: 'Package',          group_name: 'Penjualan',       sort_order: 3,  required_permission: 'packages' },
  { key: 'coupons',           label: 'Kupon',              path: '/admin/coupons',           icon: 'Ticket',           group_name: 'Penjualan',       sort_order: 4,  required_permission: 'coupons' },
  { key: 'landing-pages',     label: 'Landing Page',       path: '/admin/landing-pages',     icon: 'Globe',            group_name: 'Penjualan',       sort_order: 5,  required_permission: 'landing-pages' },
  { key: 'banners',           label: 'Banner Carousel',    path: '/admin/banners',           icon: 'Image',            group_name: 'Penjualan',       sort_order: 6,  required_permission: 'banners' },

  // ── Keberangkatan ─────────────────────────────────────────────────────────
  { key: 'departures',        label: 'Keberangkatan',      path: '/admin/departures',        icon: 'CalendarDays',     group_name: 'Keberangkatan',   sort_order: 1,  required_permission: 'departures' },
  { key: 'room-assignments',  label: 'Kamar',              path: '/admin/room-assignments',  icon: 'BedDouble',        group_name: 'Keberangkatan',   sort_order: 2,  required_permission: 'room-assignments' },
  { key: 'equipment',         label: 'Perlengkapan',       path: '/admin/equipment',         icon: 'Backpack',         group_name: 'Keberangkatan',   sort_order: 3,  required_permission: 'equipment' },
  { key: 'haji',              label: 'Haji',               path: '/admin/haji',              icon: 'MapPin',           group_name: 'Keberangkatan',   sort_order: 4,  required_permission: 'haji' },
  { key: 'manasik',           label: 'Manasik',            path: '/admin/manasik',           icon: 'BookMarked',       group_name: 'Keberangkatan',   sort_order: 5,  required_permission: 'manasik' },
  { key: 'itinerary-templates', label: 'Itinerary',        path: '/admin/itinerary-templates', icon: 'ListOrdered',    group_name: 'Keberangkatan',   sort_order: 6,  required_permission: 'itinerary-templates' },

  // ── Keuangan ──────────────────────────────────────────────────────────────
  { key: 'payments',          label: 'Pembayaran',         path: '/admin/payments',          icon: 'CreditCard',       group_name: 'Keuangan',        sort_order: 1,  required_permission: 'payments' },
  { key: 'finance-cash',      label: 'Kas & Bank',         path: '/admin/finance-cash',      icon: 'Coins',            group_name: 'Keuangan',        sort_order: 2,  required_permission: 'finance-cash' },
  { key: 'finance',           label: 'Keuangan (P&L)',     path: '/admin/finance',           icon: 'TrendingUp',       group_name: 'Keuangan',        sort_order: 3,  required_permission: 'finance' },
  { key: 'savings',           label: 'Tabungan',           path: '/admin/savings',           icon: 'PiggyBank',        group_name: 'Keuangan',        sort_order: 4,  required_permission: 'savings' },
  { key: 'reports',           label: 'Laporan',            path: '/admin/reports',           icon: 'FileBarChart',     group_name: 'Keuangan',        sort_order: 5,  required_permission: 'reports' },
  { key: 'advanced-reports',  label: 'Laporan Lanjutan',   path: '/admin/advanced-reports',  icon: 'ChartLine',        group_name: 'Keuangan',        sort_order: 6,  required_permission: 'advanced-reports' },

  // ── Jamaah & Agen ─────────────────────────────────────────────────────────
  { key: 'customers',         label: 'Jamaah',             path: '/admin/customers',         icon: 'Users',            group_name: 'Jamaah & Agen',   sort_order: 1,  required_permission: 'customers' },
  { key: 'agents',            label: 'Agen',               path: '/admin/agents',            icon: 'UserSquare2',      group_name: 'Jamaah & Agen',   sort_order: 2,  required_permission: 'agents' },
  { key: 'branches',          label: 'Cabang',             path: '/admin/branches',          icon: 'Network',          group_name: 'Jamaah & Agen',   sort_order: 3,  required_permission: 'branches' },
  { key: 'loyalty',           label: 'Program Loyalitas',  path: '/admin/loyalty',           icon: 'Award',            group_name: 'Jamaah & Agen',   sort_order: 4,  required_permission: 'loyalty' },
  { key: 'referrals',         label: 'Referral',           path: '/admin/referrals',         icon: 'Share2',           group_name: 'Jamaah & Agen',   sort_order: 5,  required_permission: 'referrals' },
  { key: 'visa',              label: 'Visa',               path: '/admin/visa',              icon: 'FileCheck',        group_name: 'Jamaah & Agen',   sort_order: 6,  required_permission: 'visa' },

  // ── SDM ───────────────────────────────────────────────────────────────────
  { key: 'hr',                label: 'SDM / HR',           path: '/admin/hr',                icon: 'UserCog',          group_name: 'SDM',             sort_order: 1,  required_permission: 'hr' },
  { key: 'payroll',           label: 'Penggajian',         path: '/admin/hr/payroll',        icon: 'Wallet',           group_name: 'SDM',             sort_order: 2,  required_permission: 'payroll' },

  // ── Marketing & Komunikasi ────────────────────────────────────────────────
  { key: 'marketing-materials', label: 'Materi Marketing', path: '/admin/marketing-materials', icon: 'Megaphone',      group_name: 'Marketing',       sort_order: 1,  required_permission: 'marketing-materials' },
  { key: 'whatsapp',          label: 'WhatsApp',           path: '/admin/whatsapp',          icon: 'MessageSquare',    group_name: 'Marketing',       sort_order: 2,  required_permission: 'whatsapp' },

  // ── Dokumen ───────────────────────────────────────────────────────────────
  { key: 'document-verification', label: 'Verifikasi Dokumen', path: '/admin/document-verification', icon: 'FileSearch', group_name: 'Dokumen',      sort_order: 1,  required_permission: 'document-verification' },
  { key: 'document-types',    label: 'Jenis Dokumen',      path: '/admin/document-types',    icon: 'FileCog',          group_name: 'Dokumen',         sort_order: 2,  required_permission: 'document-types' },
  { key: 'documents-generator', label: 'Generator Surat',  path: '/admin/documents-generator', icon: 'FileText',       group_name: 'Dokumen',         sort_order: 3,  required_permission: 'documents-generator' },

  // ── Master Data ───────────────────────────────────────────────────────────
  { key: 'hotels',            label: 'Hotel',              path: '/admin/hotels',            icon: 'Hotel',            group_name: 'Master Data',     sort_order: 1,  required_permission: 'hotels' },
  { key: 'airlines',          label: 'Maskapai',           path: '/admin/airlines',          icon: 'Plane',            group_name: 'Master Data',     sort_order: 2,  required_permission: 'airlines' },
  { key: 'airports',          label: 'Bandara',            path: '/admin/airports',          icon: 'Building',         group_name: 'Master Data',     sort_order: 3,  required_permission: 'airports' },
  { key: 'vendors',           label: 'Vendor',             path: '/admin/vendors',           icon: 'Store',            group_name: 'Master Data',     sort_order: 4,  required_permission: 'vendors' },
  { key: 'muthawifs',         label: 'Muthawif',           path: '/admin/muthawifs',         icon: 'PersonStanding',   group_name: 'Master Data',     sort_order: 5,  required_permission: 'muthawifs' },
  { key: 'bus-providers',     label: 'Penyedia Bus',       path: '/admin/bus-providers',     icon: 'Bus',              group_name: 'Master Data',     sort_order: 6,  required_permission: 'bus-providers' },

  // ── Pengaturan ────────────────────────────────────────────────────────────
  { key: 'users',             label: 'Manajemen User',     path: '/admin/users',             icon: 'Users2',           group_name: 'Pengaturan',      sort_order: 1,  required_permission: 'users' },
  { key: 'roles',             label: 'Manajemen Role',     path: '/admin/roles',             icon: 'ShieldCheck',      group_name: 'Pengaturan',      sort_order: 2,  required_permission: 'roles' },
  { key: 'dashboard-access',  label: 'Akses Dashboard',    path: '/admin/dashboard-access',  icon: 'LayoutGrid',       group_name: 'Pengaturan',      sort_order: 3,  required_permission: 'dashboard-access' },
  { key: 'rbac-tools',        label: 'RBAC Tools',         path: '/admin/rbac-tools',        icon: 'ShieldAlert',      group_name: 'Pengaturan',      sort_order: 4,  required_permission: 'rbac-tools' },
  { key: 'rbac-status',       label: 'Status RBAC',        path: '/admin/rbac-status',       icon: 'ShieldQuestion',   group_name: 'Pengaturan',      sort_order: 5,  required_permission: 'rbac-status' },
  { key: 'security-audit',    label: 'Audit Keamanan',     path: '/admin/security-audit',    icon: 'ScanSearch',       group_name: 'Pengaturan',      sort_order: 6,  required_permission: 'security-audit' },
  { key: '2fa',               label: 'Pengaturan 2FA',     path: '/admin/2fa',               icon: 'KeyRound',         group_name: 'Pengaturan',      sort_order: 7,  required_permission: '2fa' },
  { key: 'appearance',        label: 'Tampilan',           path: '/admin/appearance',        icon: 'Palette',          group_name: 'Pengaturan',      sort_order: 8,  required_permission: 'appearance' },
  { key: 'settings',          label: 'Pengaturan Umum',    path: '/admin/settings',          icon: 'Settings',         group_name: 'Pengaturan',      sort_order: 9,  required_permission: 'settings' },
];

/**
 * Get menu items filtered by a set of granted permission keys.
 */
export const getMenusByPermissions = (permissionKeys: string[]): AdminMenuItem[] => {
  const permissionSet = new Set(permissionKeys);
  return RECOMMENDED_MENUS.filter(menu => permissionSet.has(menu.required_permission));
};

/** Get menu item by path */
export const getMenuByPath = (path: string): AdminMenuItem | undefined =>
  RECOMMENDED_MENUS.find(menu => menu.path === path);

/** All unique group names, in definition order */
export const getMenuGroups = (): string[] => {
  const seen = new Set<string>();
  return RECOMMENDED_MENUS.reduce<string[]>((acc, m) => {
    if (!seen.has(m.group_name)) { seen.add(m.group_name); acc.push(m.group_name); }
    return acc;
  }, []);
};

/**
 * Default permission sets per role.
 * Used to seed role_permissions when the table is empty.
 * Roles listed in priority order (highest → lowest).
 */
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  super_admin: RECOMMENDED_MENUS.map(m => m.required_permission),

  owner: RECOMMENDED_MENUS.map(m => m.required_permission),

  branch_manager: [
    'dashboard', 'analytics',
    'leads', 'bookings', 'packages', 'coupons', 'banners',
    'departures', 'room-assignments', 'equipment', 'haji', 'manasik',
    'payments', 'finance-cash', 'savings', 'reports',
    'customers', 'agents', 'branches', 'visa',
    'document-verification', 'document-types',
    'hotels', 'airlines', 'airports',
    'users',
  ],

  finance: [
    'dashboard',
    'payments', 'finance-cash', 'finance', 'savings', 'reports', 'advanced-reports',
    'bookings', 'customers',
  ],

  sales: [
    'dashboard',
    'leads', 'bookings', 'packages', 'coupons',
    'customers', 'agents',
    'payments',
    'document-verification',
  ],

  marketing: [
    'dashboard', 'analytics',
    'leads', 'landing-pages', 'banners', 'marketing-materials',
    'coupons', 'referrals', 'loyalty',
  ],

  operational: [
    'dashboard',
    'departures', 'room-assignments', 'equipment', 'haji', 'manasik', 'itinerary-templates',
    'customers', 'bookings',
    'document-verification', 'documents-generator',
    'visa',
  ],

  equipment: [
    'dashboard',
    'equipment',
    'departures',
    'customers',
  ],

  agent: [
    'dashboard',
    'leads', 'bookings', 'packages',
    'customers',
    'payments',
  ],
};
