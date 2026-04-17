/**
 * Canonical admin menu registry — kept aligned with `menu_items` table in DB.
 * Used as fallback when DB query fails, as source for command palette,
 * and as reference for menu seeding operations.
 * 
 * This is the single source of truth for admin menu structure across the application.
 * All components (sidebar, command palette, permission modals) should reference this registry.
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
  { key: 'dashboard', label: 'Dashboard', path: '/admin', icon: 'LayoutDashboard', group_name: 'Overview', sort_order: 10, required_permission: 'dashboard.view' },
  { key: 'analytics', label: 'Analytics', path: '/admin/analytics', icon: 'BarChart3', group_name: 'Overview', sort_order: 20, required_permission: 'analytics.view' },

  // Sales & CRM
  { key: 'crm_leads', label: 'CRM Leads', path: '/admin/leads', icon: 'UserPlus', group_name: 'Sales & CRM', sort_order: 10, required_permission: 'leads.view' },
  { key: 'coupons', label: 'Kupon', path: '/admin/coupons', icon: 'Ticket', group_name: 'Sales & CRM', sort_order: 20, required_permission: 'marketing.view' },
  { key: 'landing_pages', label: 'Landing Page', path: '/admin/landing-pages', icon: 'Globe', group_name: 'Sales & CRM', sort_order: 30, required_permission: 'settings.manage' },

  // Produk & Operasional
  { key: 'packages', label: 'Paket', path: '/admin/packages', icon: 'Package', group_name: 'Produk & Operasional', sort_order: 10, required_permission: 'packages.view' },
  { key: 'departures', label: 'Keberangkatan', path: '/admin/departures', icon: 'CalendarDays', group_name: 'Produk & Operasional', sort_order: 20, required_permission: 'departures.view' },
  { key: 'bookings', label: 'Booking', path: '/admin/bookings', icon: 'BookOpen', group_name: 'Produk & Operasional', sort_order: 30, required_permission: 'bookings.view_own' },
  { key: 'equipment', label: 'Perlengkapan', path: '/admin/equipment', icon: 'Backpack', group_name: 'Produk & Operasional', sort_order: 40, required_permission: 'operational.view' },
  { key: 'itinerary_templates', label: 'Template Itinerary', path: '/admin/itinerary-templates', icon: 'Map', group_name: 'Produk & Operasional', sort_order: 50, required_permission: 'itinerary.view' },
  { key: 'savings', label: 'Tabungan', path: '/admin/savings', icon: 'Wallet', group_name: 'Produk & Operasional', sort_order: 60, required_permission: 'packages.view' },
  { key: 'room_assignments', label: 'Kamar', path: '/admin/room-assignments', icon: 'BedDouble', group_name: 'Produk & Operasional', sort_order: 70, required_permission: 'operational.rooms.view' },

  // Keuangan & Akuntansi
  { key: 'payments', label: 'Pembayaran', path: '/admin/payments', icon: 'CreditCard', group_name: 'Keuangan & Akuntansi', sort_order: 10, required_permission: 'payments.view_own' },
  { key: 'finance_cash', label: 'Kas & Bank', path: '/admin/finance-cash', icon: 'Coins', group_name: 'Keuangan & Akuntansi', sort_order: 20, required_permission: 'payments.view_own' },
  { key: 'finance_ar', label: 'Piutang Jamaah', path: '/admin/finance/ar', icon: 'TrendingUp', group_name: 'Keuangan & Akuntansi', sort_order: 30, required_permission: 'payments.view_all' },
  { key: 'finance_ap', label: 'Hutang Vendor', path: '/admin/finance/ap', icon: 'TrendingDown', group_name: 'Keuangan & Akuntansi', sort_order: 40, required_permission: 'payments.view_all' },
  { key: 'finance_reports', label: 'Laporan Laba Rugi', path: '/admin/finance', icon: 'PieChart', group_name: 'Keuangan & Akuntansi', sort_order: 50, required_permission: 'finance.reports' },

  // Jamaah & Agent
  { key: 'customers', label: 'Jamaah', path: '/admin/customers', icon: 'Users', group_name: 'Jamaah & Agent', sort_order: 10, required_permission: 'customers.view' },
  { key: 'agents', label: 'Agent', path: '/admin/agents', icon: 'UserSquare2', group_name: 'Jamaah & Agent', sort_order: 20, required_permission: 'agents.view' },
  { key: 'branches', label: 'Cabang', path: '/admin/branches', icon: 'Network', group_name: 'Jamaah & Agent', sort_order: 30, required_permission: 'settings.view' },
  { key: 'loyalty', label: 'Loyalty', path: '/admin/loyalty', icon: 'Gift', group_name: 'Jamaah & Agent', sort_order: 40, required_permission: 'marketing.view' },
  { key: 'referrals', label: 'Referral', path: '/admin/referrals', icon: 'Share2', group_name: 'Jamaah & Agent', sort_order: 50, required_permission: 'marketing.view' },
  { key: 'haji', label: 'Haji', path: '/admin/haji', icon: 'Star', group_name: 'Jamaah & Agent', sort_order: 60, required_permission: 'operational.view' },
  { key: 'manasik', label: 'Manasik', path: '/admin/manasik', icon: 'GraduationCap', group_name: 'Jamaah & Agent', sort_order: 70, required_permission: 'operational.manasik.view' },
  { key: 'visa', label: 'Visa', path: '/admin/visa', icon: 'StickyNote', group_name: 'Jamaah & Agent', sort_order: 80, required_permission: 'departures.visa.view' },

  // SDM (HR)
  { key: 'hr_employees', label: 'Manajemen HR', path: '/admin/hr', icon: 'Contact2', group_name: 'SDM (HR)', sort_order: 10, required_permission: 'hr.employees.view' },
  { key: 'hr_payroll', label: 'Payroll', path: '/admin/hr/payroll', icon: 'Banknote', group_name: 'SDM (HR)', sort_order: 30, required_permission: 'hr.payroll.view' },

  // Support & Komunikasi
  { key: 'support', label: 'Tiket Support', path: '/admin/support', icon: 'LifeBuoy', group_name: 'Support & Komunikasi', sort_order: 10, required_permission: 'support.view' },
  { key: 'whatsapp', label: 'WhatsApp', path: '/admin/whatsapp', icon: 'MessageSquare', group_name: 'Support & Komunikasi', sort_order: 20, required_permission: 'marketing.view' },
  { key: 'marketing_materials', label: 'Materi Promosi', path: '/admin/marketing-materials', icon: 'Megaphone', group_name: 'Support & Komunikasi', sort_order: 30, required_permission: 'marketing.view' },

  // Laporan
  { key: 'reports', label: 'Laporan', path: '/admin/reports', icon: 'FileBarChart', group_name: 'Laporan', sort_order: 10, required_permission: 'reports.view' },

  // Pengaturan
  { key: 'users', label: 'Manajemen User', path: '/admin/users', icon: 'UserCog', group_name: 'Pengaturan', sort_order: 10, required_permission: 'settings.manage' },
  { key: 'security_audit', label: 'Security Audit', path: '/admin/security-audit', icon: 'ShieldAlert', group_name: 'Pengaturan', sort_order: 30, required_permission: 'settings.manage' },
  { key: '2fa_settings', label: '2FA Settings', path: '/admin/2fa', icon: 'KeyRound', group_name: 'Pengaturan', sort_order: 40, required_permission: 'settings.manage' },
  { key: 'appearance', label: 'Tampilan', path: '/admin/appearance', icon: 'Palette', group_name: 'Pengaturan', sort_order: 50, required_permission: 'settings.manage' },
  { key: 'package_types', label: 'Tipe Paket', path: '/admin/package-types', icon: 'Layers', group_name: 'Pengaturan', sort_order: 80, required_permission: 'settings.manage' },
  { key: 'settings', label: 'Pengaturan', path: '/admin/settings', icon: 'Settings', group_name: 'Pengaturan', sort_order: 90, required_permission: 'settings.manage' },
];

/**
 * Get menu items filtered by permission keys
 * @param permissionKeys - Array of permission keys to include
 * @returns Filtered menu items
 */
export const getMenusByPermissions = (permissionKeys: string[]): AdminMenuItem[] => {
  const permissionSet = new Set(permissionKeys);
  return RECOMMENDED_MENUS.filter(menu => permissionSet.has(menu.required_permission));
};

/**
 * Get menu item by path
 * @param path - The path to search for
 * @returns Menu item or undefined
 */
export const getMenuByPath = (path: string): AdminMenuItem | undefined => {
  return RECOMMENDED_MENUS.find(menu => menu.path === path);
};

/**
 * Get all unique menu groups
 * @returns Array of unique group names
 */
export const getMenuGroups = (): string[] => {
  const groups = new Set(RECOMMENDED_MENUS.map(menu => menu.group_name));
  return Array.from(groups);
};
