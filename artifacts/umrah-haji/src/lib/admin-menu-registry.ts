/**
 * Canonical admin menu registry.
 *
 * Groups (in display order):
 *   Overview · Penjualan · Konten & Marketing · Keberangkatan · Keuangan
 *   Jamaah & Agen · SDM · Dokumen · Master Data · Pengaturan
 *
 * Sort order uses 100-based offsets per group to guarantee correct group ordering.
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
  // ── Overview (100s) ──────────────────────────────────────────────────────
  { key: 'dashboard',           label: 'Dashboard',             path: '/admin',                      icon: 'LayoutDashboard', group_name: 'Overview',           sort_order: 101, required_permission: 'dashboard' },
  { key: 'analytics',           label: 'Analytics',             path: '/admin/analytics',            icon: 'BarChart3',       group_name: 'Overview',           sort_order: 102, required_permission: 'analytics' },

  // ── Penjualan (200s) ─────────────────────────────────────────────────────
  { key: 'leads',               label: 'Leads & Prospek',       path: '/admin/leads',                icon: 'UserPlus',        group_name: 'Penjualan',          sort_order: 201, required_permission: 'leads' },
  { key: 'bookings',            label: 'Booking',               path: '/admin/bookings',             icon: 'BookOpen',        group_name: 'Penjualan',          sort_order: 202, required_permission: 'bookings' },
  { key: 'packages',            label: 'Paket Umroh & Haji',    path: '/admin/packages',             icon: 'Package',         group_name: 'Penjualan',          sort_order: 203, required_permission: 'packages' },
  { key: 'package-types',       label: 'Tipe Paket',            path: '/admin/package-types',        icon: 'Tag',             group_name: 'Penjualan',          sort_order: 204, required_permission: 'package-types' },
  { key: 'coupons',             label: 'Kupon & Promo',         path: '/admin/coupons',              icon: 'Ticket',          group_name: 'Penjualan',          sort_order: 205, required_permission: 'coupons' },

  // ── Konten & Marketing (300s) ─────────────────────────────────────────────
  { key: 'banners',             label: 'Banner Carousel',       path: '/admin/banners',              icon: 'Image',           group_name: 'Konten & Marketing', sort_order: 301, required_permission: 'banners' },
  { key: 'landing-pages',       label: 'Landing Page',          path: '/admin/landing-pages',        icon: 'Globe',           group_name: 'Konten & Marketing', sort_order: 302, required_permission: 'landing-pages' },
  { key: 'marketing-materials', label: 'Materi Marketing',      path: '/admin/marketing-materials',  icon: 'Megaphone',       group_name: 'Konten & Marketing', sort_order: 303, required_permission: 'marketing-materials' },
  { key: 'whatsapp',            label: 'WhatsApp Blast',        path: '/admin/whatsapp',             icon: 'MessageSquare',   group_name: 'Konten & Marketing', sort_order: 304, required_permission: 'whatsapp' },

  // ── Keberangkatan (400s) ──────────────────────────────────────────────────
  { key: 'departures',          label: 'Jadwal Keberangkatan',  path: '/admin/departures',           icon: 'CalendarDays',    group_name: 'Keberangkatan',      sort_order: 401, required_permission: 'departures' },
  { key: 'room-assignments',    label: 'Kamar & Rooming',       path: '/admin/room-assignments',     icon: 'BedDouble',       group_name: 'Keberangkatan',      sort_order: 402, required_permission: 'room-assignments' },
  { key: 'haji',                label: 'Manajemen Haji',        path: '/admin/haji',                 icon: 'MapPin',          group_name: 'Keberangkatan',      sort_order: 403, required_permission: 'haji' },
  { key: 'manasik',             label: 'Manasik',               path: '/admin/manasik',              icon: 'BookMarked',      group_name: 'Keberangkatan',      sort_order: 404, required_permission: 'manasik' },
  { key: 'itinerary-templates', label: 'Template Itinerary',    path: '/admin/itinerary-templates',  icon: 'ListOrdered',     group_name: 'Keberangkatan',      sort_order: 405, required_permission: 'itinerary-templates' },
  { key: 'equipment',           label: 'Perlengkapan',          path: '/admin/equipment',            icon: 'Backpack',        group_name: 'Keberangkatan',      sort_order: 406, required_permission: 'equipment' },

  // ── Keuangan (500s) ───────────────────────────────────────────────────────
  { key: 'payments',            label: 'Pembayaran',            path: '/admin/payments',             icon: 'CreditCard',      group_name: 'Keuangan',           sort_order: 501, required_permission: 'payments' },
  { key: 'finance-cash',        label: 'Kas & Bank',            path: '/admin/finance-cash',         icon: 'Coins',           group_name: 'Keuangan',           sort_order: 502, required_permission: 'finance-cash' },
  { key: 'finance-ar',          label: 'Piutang (AR)',          path: '/admin/finance/ar',           icon: 'ArrowDownToLine', group_name: 'Keuangan',           sort_order: 503, required_permission: 'finance-ar' },
  { key: 'finance-ap',          label: 'Hutang (AP)',           path: '/admin/finance/ap',           icon: 'ArrowUpFromLine', group_name: 'Keuangan',           sort_order: 504, required_permission: 'finance-ap' },
  { key: 'finance',             label: 'Laporan P&L',           path: '/admin/finance',              icon: 'TrendingUp',      group_name: 'Keuangan',           sort_order: 505, required_permission: 'finance' },
  { key: 'savings',             label: 'Program Tabungan',      path: '/admin/savings',              icon: 'PiggyBank',       group_name: 'Keuangan',           sort_order: 506, required_permission: 'savings' },
  { key: 'reports',             label: 'Laporan',               path: '/admin/reports',              icon: 'FileBarChart',    group_name: 'Keuangan',           sort_order: 507, required_permission: 'reports' },
  { key: 'advanced-reports',    label: 'Laporan Lanjutan',      path: '/admin/advanced-reports',     icon: 'ChartLine',       group_name: 'Keuangan',           sort_order: 508, required_permission: 'advanced-reports' },
  { key: 'scheduled-reports',   label: 'Laporan Terjadwal',     path: '/admin/scheduled-reports',    icon: 'CalendarClock',   group_name: 'Keuangan',           sort_order: 509, required_permission: 'scheduled-reports' },

  // ── Jamaah & Agen (600s) ──────────────────────────────────────────────────
  { key: 'customers',           label: 'Data Jamaah',           path: '/admin/customers',            icon: 'Users',           group_name: 'Jamaah & Agen',      sort_order: 601, required_permission: 'customers' },
  { key: 'agents',              label: 'Agen',                  path: '/admin/agents',               icon: 'UserSquare2',     group_name: 'Jamaah & Agen',      sort_order: 602, required_permission: 'agents' },
  { key: 'branches',            label: 'Cabang',                path: '/admin/branches',             icon: 'Network',         group_name: 'Jamaah & Agen',      sort_order: 603, required_permission: 'branches' },
  { key: 'loyalty',             label: 'Program Loyalitas',     path: '/admin/loyalty',              icon: 'Award',           group_name: 'Jamaah & Agen',      sort_order: 604, required_permission: 'loyalty' },
  { key: 'referrals',           label: 'Referral',              path: '/admin/referrals',            icon: 'Share2',          group_name: 'Jamaah & Agen',      sort_order: 605, required_permission: 'referrals' },
  { key: 'visa',                label: 'Visa',                  path: '/admin/visa',                 icon: 'FileCheck',       group_name: 'Jamaah & Agen',      sort_order: 606, required_permission: 'visa' },

  // ── SDM (700s) ────────────────────────────────────────────────────────────
  { key: 'hr',                  label: 'SDM / HR',              path: '/admin/hr',                   icon: 'UserCog',         group_name: 'SDM',                sort_order: 701, required_permission: 'hr' },
  { key: 'payroll',             label: 'Penggajian',            path: '/admin/hr/payroll',           icon: 'Wallet',          group_name: 'SDM',                sort_order: 702, required_permission: 'payroll' },

  // ── Dokumen (800s) ────────────────────────────────────────────────────────
  { key: 'document-verification', label: 'Verifikasi Dokumen', path: '/admin/document-verification', icon: 'FileSearch',     group_name: 'Dokumen',            sort_order: 801, required_permission: 'document-verification' },
  { key: 'document-types',      label: 'Jenis Dokumen',        path: '/admin/document-types',        icon: 'FileCog',        group_name: 'Dokumen',            sort_order: 802, required_permission: 'document-types' },
  { key: 'documents-generator', label: 'Generator Surat',      path: '/admin/documents-generator',  icon: 'FileText',        group_name: 'Dokumen',            sort_order: 803, required_permission: 'documents-generator' },
  { key: 'offline-content',     label: 'Konten Offline',       path: '/admin/offline-content',       icon: 'WifiOff',        group_name: 'Dokumen',            sort_order: 804, required_permission: 'offline-content' },
  { key: 'support',             label: 'Tiket Support',        path: '/admin/support',               icon: 'LifeBuoy',       group_name: 'Dokumen',            sort_order: 805, required_permission: 'support' },

  // ── Master Data (900s) ────────────────────────────────────────────────────
  { key: 'hotels',              label: 'Hotel',                 path: '/admin/hotels',               icon: 'Hotel',           group_name: 'Master Data',        sort_order: 901, required_permission: 'hotels' },
  { key: 'airlines',            label: 'Maskapai',              path: '/admin/airlines',             icon: 'Plane',           group_name: 'Master Data',        sort_order: 902, required_permission: 'airlines' },
  { key: 'airports',            label: 'Bandara',               path: '/admin/airports',             icon: 'Building',        group_name: 'Master Data',        sort_order: 903, required_permission: 'airports' },
  { key: 'vendors',             label: 'Vendor',                path: '/admin/vendors',              icon: 'Store',           group_name: 'Master Data',        sort_order: 904, required_permission: 'vendors' },
  { key: 'muthawifs',           label: 'Muthawif',              path: '/admin/muthawifs',            icon: 'PersonStanding',  group_name: 'Master Data',        sort_order: 905, required_permission: 'muthawifs' },
  { key: 'bus-providers',       label: 'Penyedia Bus',          path: '/admin/bus-providers',        icon: 'Bus',             group_name: 'Master Data',        sort_order: 906, required_permission: 'bus-providers' },
  { key: 'master-data',         label: 'Master Data Lainnya',   path: '/admin/master-data',          icon: 'Database',        group_name: 'Master Data',        sort_order: 907, required_permission: 'master-data' },

  // ── Pengaturan (1000s) ────────────────────────────────────────────────────
  { key: 'users',               label: 'Manajemen User',        path: '/admin/users',                icon: 'Users2',          group_name: 'Pengaturan',         sort_order: 1001, required_permission: 'users' },
  { key: 'roles',               label: 'Manajemen Role',        path: '/admin/roles',                icon: 'ShieldCheck',     group_name: 'Pengaturan',         sort_order: 1002, required_permission: 'roles' },
  { key: 'dashboard-access',    label: 'Akses Dashboard',       path: '/admin/dashboard-access',     icon: 'LayoutGrid',      group_name: 'Pengaturan',         sort_order: 1003, required_permission: 'dashboard-access' },
  { key: 'rbac-tools',          label: 'RBAC Tools',            path: '/admin/rbac-tools',           icon: 'ShieldAlert',     group_name: 'Pengaturan',         sort_order: 1004, required_permission: 'rbac-tools' },
  { key: 'rbac-status',         label: 'Status RBAC',           path: '/admin/rbac-status',          icon: 'ShieldQuestion',  group_name: 'Pengaturan',         sort_order: 1005, required_permission: 'rbac-status' },
  { key: 'security-audit',      label: 'Audit Keamanan',        path: '/admin/security-audit',       icon: 'ScanSearch',      group_name: 'Pengaturan',         sort_order: 1006, required_permission: 'security-audit' },
  { key: '2fa',                 label: 'Pengaturan 2FA',        path: '/admin/2fa',                  icon: 'KeyRound',        group_name: 'Pengaturan',         sort_order: 1007, required_permission: '2fa' },
  { key: 'appearance',          label: 'Tampilan & Tema',       path: '/admin/appearance',           icon: 'Palette',         group_name: 'Pengaturan',         sort_order: 1008, required_permission: 'appearance' },
  { key: 'settings',            label: 'Pengaturan Umum',       path: '/admin/settings',             icon: 'Settings',        group_name: 'Pengaturan',         sort_order: 1009, required_permission: 'settings' },
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
    'users', 'support',
  ],

  finance: [
    'dashboard',
    'payments', 'finance-cash', 'finance', 'finance-ar', 'finance-ap',
    'savings', 'reports', 'advanced-reports',
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
    'coupons', 'referrals', 'loyalty', 'whatsapp',
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
