/**
 * Canonical admin menu registry — kept aligned with `menu_items` table in DB.
 * Used as fallback when DB query fails, as source for command palette,
 * and as reference for menu seeding operations.
 *
 * This is the single source of truth for admin menu structure across the application.
 * All components (sidebar, command palette, permission modals) should reference this registry.
 *
 * IMPORTANT: This registry MUST stay in sync with the `menu_items` table in the database.
 * Last sync: 2026-04-20 — 48 entries identical to DB.
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
  // Overview
  { key: 'dashboard', label: 'Dashboard', path: '/admin', icon: 'LayoutDashboard', group_name: 'Overview', sort_order: 1, required_permission: 'dashboard' },
  { key: 'analytics', label: 'Analytics', path: '/admin/analytics', icon: 'BarChart3', group_name: 'Overview', sort_order: 2, required_permission: 'analytics' },

  // Sales & CRM
  { key: 'leads', label: 'CRM Leads', path: '/admin/leads', icon: 'UserPlus', group_name: 'Sales & CRM', sort_order: 1, required_permission: 'leads' },
  { key: 'coupons', label: 'Kupon', path: '/admin/coupons', icon: 'Ticket', group_name: 'Sales & CRM', sort_order: 2, required_permission: 'coupons' },
  { key: 'landing-pages', label: 'Landing Page', path: '/admin/landing-pages', icon: 'Globe', group_name: 'Sales & CRM', sort_order: 3, required_permission: 'landing-pages' },

  // Produk & Operasional
  { key: 'packages', label: 'Paket', path: '/admin/packages', icon: 'Package', group_name: 'Produk & Operasional', sort_order: 1, required_permission: 'packages' },
  { key: 'departures', label: 'Keberangkatan', path: '/admin/departures', icon: 'CalendarDays', group_name: 'Produk & Operasional', sort_order: 2, required_permission: 'departures' },
  { key: 'bookings', label: 'Booking', path: '/admin/bookings', icon: 'BookOpen', group_name: 'Produk & Operasional', sort_order: 3, required_permission: 'bookings' },
  { key: 'room-assignments', label: 'Kamar', path: '/admin/room-assignments', icon: 'BedDouble', group_name: 'Produk & Operasional', sort_order: 4, required_permission: 'room-assignments' },
  { key: 'equipment', label: 'Perlengkapan', path: '/admin/equipment', icon: 'Backpack', group_name: 'Produk & Operasional', sort_order: 5, required_permission: 'equipment' },
  { key: 'itinerary-templates', label: 'Template Itinerary', path: '/admin/itinerary-templates', icon: 'Map', group_name: 'Produk & Operasional', sort_order: 6, required_permission: 'itinerary-templates' },
  { key: 'savings', label: 'Tabungan', path: '/admin/savings', icon: 'Wallet', group_name: 'Produk & Operasional', sort_order: 7, required_permission: 'savings' },

  // Keuangan & Akuntansi
  { key: 'payments', label: 'Pembayaran', path: '/admin/payments', icon: 'CreditCard', group_name: 'Keuangan & Akuntansi', sort_order: 1, required_permission: 'payments' },
  { key: 'finance-cash', label: 'Kas & Bank', path: '/admin/finance-cash', icon: 'Coins', group_name: 'Keuangan & Akuntansi', sort_order: 2, required_permission: 'finance-cash' },
  { key: 'finance-ar', label: 'Piutang Jamaah', path: '/admin/finance/ar', icon: 'TrendingUp', group_name: 'Keuangan & Akuntansi', sort_order: 3, required_permission: 'finance-ar' },
  { key: 'finance-ap', label: 'Hutang Vendor', path: '/admin/finance/ap', icon: 'TrendingDown', group_name: 'Keuangan & Akuntansi', sort_order: 4, required_permission: 'finance-ap' },
  { key: 'finance-pl', label: 'Laporan Laba Rugi', path: '/admin/finance', icon: 'PieChart', group_name: 'Keuangan & Akuntansi', sort_order: 5, required_permission: 'finance-pl' },

  // Jamaah & Agent
  { key: 'customers', label: 'Jamaah', path: '/admin/customers', icon: 'Users', group_name: 'Jamaah & Agent', sort_order: 1, required_permission: 'customers' },
  { key: 'agents', label: 'Agent', path: '/admin/agents', icon: 'UserSquare2', group_name: 'Jamaah & Agent', sort_order: 2, required_permission: 'agents' },
  { key: 'branches', label: 'Cabang', path: '/admin/branches', icon: 'Network', group_name: 'Jamaah & Agent', sort_order: 3, required_permission: 'branches' },
  { key: 'loyalty', label: 'Loyalty', path: '/admin/loyalty', icon: 'Gift', group_name: 'Jamaah & Agent', sort_order: 4, required_permission: 'loyalty' },
  { key: 'referrals', label: 'Referral', path: '/admin/referrals', icon: 'Share2', group_name: 'Jamaah & Agent', sort_order: 5, required_permission: 'referrals' },
  { key: 'haji', label: 'Haji', path: '/admin/haji', icon: 'Star', group_name: 'Jamaah & Agent', sort_order: 6, required_permission: 'haji' },
  { key: 'manasik', label: 'Manasik', path: '/admin/manasik', icon: 'GraduationCap', group_name: 'Jamaah & Agent', sort_order: 7, required_permission: 'manasik' },
  { key: 'visa', label: 'Visa', path: '/admin/visa', icon: 'StickyNote', group_name: 'Jamaah & Agent', sort_order: 8, required_permission: 'visa' },

  // Master Data
  { key: 'airlines', label: 'Maskapai', path: '/admin/airlines', icon: 'Plane', group_name: 'Master Data', sort_order: 1, required_permission: 'airlines' },
  { key: 'airports', label: 'Bandara', path: '/admin/airports', icon: 'Building', group_name: 'Master Data', sort_order: 2, required_permission: 'airports' },
  { key: 'hotels', label: 'Hotel', path: '/admin/hotels', icon: 'Hotel', group_name: 'Master Data', sort_order: 3, required_permission: 'hotels' },
  { key: 'muthawifs', label: 'Muthawif', path: '/admin/muthawifs', icon: 'UserCheck', group_name: 'Master Data', sort_order: 4, required_permission: 'muthawifs' },
  { key: 'bus-providers', label: 'Bus Provider', path: '/admin/bus-providers', icon: 'Bus', group_name: 'Master Data', sort_order: 5, required_permission: 'bus-providers' },
  { key: 'vendors', label: 'Vendor', path: '/admin/vendors', icon: 'Store', group_name: 'Master Data', sort_order: 6, required_permission: 'vendors' },

  // SDM (HR)
  { key: 'hr', label: 'Data Karyawan', path: '/admin/hr', icon: 'Contact2', group_name: 'SDM (HR)', sort_order: 1, required_permission: 'hr' },
  { key: 'payroll', label: 'Penggajian / Payroll', path: '/admin/hr/payroll', icon: 'Banknote', group_name: 'SDM (HR)', sort_order: 2, required_permission: 'payroll' },

  // Support & Komunikasi
  { key: 'support', label: 'Tiket Support', path: '/admin/support', icon: 'LifeBuoy', group_name: 'Support & Komunikasi', sort_order: 1, required_permission: 'support' },
  { key: 'whatsapp', label: 'WhatsApp', path: '/admin/whatsapp', icon: 'MessageSquare', group_name: 'Support & Komunikasi', sort_order: 2, required_permission: 'whatsapp' },
  { key: 'marketing-materials', label: 'Materi Promosi', path: '/admin/marketing-materials', icon: 'Megaphone', group_name: 'Support & Komunikasi', sort_order: 3, required_permission: 'marketing-materials' },

  // Dokumen & Surat
  { key: 'document-verification', label: 'Verifikasi Dokumen', path: '/admin/document-verification', icon: 'FileCheck', group_name: 'Dokumen & Surat', sort_order: 1, required_permission: 'document-verification' },
  { key: 'documents-generator', label: 'Generate Surat', path: '/admin/documents-generator', icon: 'FileText', group_name: 'Dokumen & Surat', sort_order: 2, required_permission: 'documents-generator' },
  { key: 'offline-content', label: 'Konten Offline', path: '/admin/offline-content', icon: 'BookMarked', group_name: 'Dokumen & Surat', sort_order: 3, required_permission: 'offline-content' },

  // Laporan
  { key: 'reports', label: 'Laporan', path: '/admin/reports', icon: 'FileBarChart', group_name: 'Laporan', sort_order: 1, required_permission: 'reports' },
  { key: 'advanced-reports', label: 'Laporan Lanjutan', path: '/admin/advanced-reports', icon: 'BarChart2', group_name: 'Laporan', sort_order: 2, required_permission: 'advanced-reports' },
  { key: 'scheduled-reports', label: 'Laporan Terjadwal', path: '/admin/scheduled-reports', icon: 'CalendarClock', group_name: 'Laporan', sort_order: 3, required_permission: 'scheduled-reports' },

  // Pengaturan
  { key: 'users', label: 'Manajemen User', path: '/admin/users', icon: 'UserCog', group_name: 'Pengaturan', sort_order: 1, required_permission: 'users' },
  { key: 'security-audit', label: 'Security Audit', path: '/admin/security-audit', icon: 'ShieldAlert', group_name: 'Pengaturan', sort_order: 2, required_permission: 'security-audit' },
  { key: '2fa-settings', label: '2FA Settings', path: '/admin/2fa', icon: 'KeyRound', group_name: 'Pengaturan', sort_order: 3, required_permission: '2fa-settings' },
  { key: 'appearance', label: 'Tampilan', path: '/admin/appearance', icon: 'Palette', group_name: 'Pengaturan', sort_order: 4, required_permission: 'appearance' },
  { key: 'package-types', label: 'Tipe Paket', path: '/admin/package-types', icon: 'Layers', group_name: 'Pengaturan', sort_order: 5, required_permission: 'package-types' },
  { key: 'settings', label: 'Pengaturan', path: '/admin/settings', icon: 'Settings', group_name: 'Pengaturan', sort_order: 6, required_permission: 'settings' },
];

/**
 * Get menu items filtered by permission keys
 */
export const getMenusByPermissions = (permissionKeys: string[]): AdminMenuItem[] => {
  const permissionSet = new Set(permissionKeys);
  return RECOMMENDED_MENUS.filter(menu => permissionSet.has(menu.required_permission));
};

/**
 * Get menu item by path
 */
export const getMenuByPath = (path: string): AdminMenuItem | undefined => {
  return RECOMMENDED_MENUS.find(menu => menu.path === path);
};

/**
 * Get all unique menu groups
 */
export const getMenuGroups = (): string[] => {
  const groups = new Set(RECOMMENDED_MENUS.map(menu => menu.group_name));
  return Array.from(groups);
};
