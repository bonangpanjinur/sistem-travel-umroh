/**
 * Canonical admin menu registry — cleaned up for simpler sidebar structure.
 * Grouped into: Overview, Penjualan, Keberangkatan, Keuangan, Jamaah, Master Data, Pengaturan
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

  // Penjualan
  { key: 'leads', label: 'Leads', path: '/admin/leads', icon: 'UserPlus', group_name: 'Penjualan', sort_order: 1, required_permission: 'leads' },
  { key: 'bookings', label: 'Booking', path: '/admin/bookings', icon: 'BookOpen', group_name: 'Penjualan', sort_order: 2, required_permission: 'bookings' },
  { key: 'packages', label: 'Paket', path: '/admin/packages', icon: 'Package', group_name: 'Penjualan', sort_order: 3, required_permission: 'packages' },

  // Keberangkatan
  { key: 'departures', label: 'Keberangkatan', path: '/admin/departures', icon: 'CalendarDays', group_name: 'Keberangkatan', sort_order: 1, required_permission: 'departures' },
  { key: 'room-assignments', label: 'Kamar', path: '/admin/room-assignments', icon: 'BedDouble', group_name: 'Keberangkatan', sort_order: 2, required_permission: 'room-assignments' },
  { key: 'equipment', label: 'Perlengkapan', path: '/admin/equipment', icon: 'Backpack', group_name: 'Keberangkatan', sort_order: 3, required_permission: 'equipment' },

  // Keuangan
  { key: 'payments', label: 'Pembayaran', path: '/admin/payments', icon: 'CreditCard', group_name: 'Keuangan', sort_order: 1, required_permission: 'payments' },
  { key: 'finance-cash', label: 'Kas & Bank', path: '/admin/finance-cash', icon: 'Coins', group_name: 'Keuangan', sort_order: 2, required_permission: 'finance-cash' },
  { key: 'reports', label: 'Laporan', path: '/admin/reports', icon: 'FileBarChart', group_name: 'Keuangan', sort_order: 3, required_permission: 'reports' },

  // Jamaah
  { key: 'customers', label: 'Jamaah', path: '/admin/customers', icon: 'Users', group_name: 'Jamaah', sort_order: 1, required_permission: 'customers' },
  { key: 'agents', label: 'Agent', path: '/admin/agents', icon: 'UserSquare2', group_name: 'Jamaah', sort_order: 2, required_permission: 'agents' },
  { key: 'branches', label: 'Cabang', path: '/admin/branches', icon: 'Network', group_name: 'Jamaah', sort_order: 3, required_permission: 'branches' },

  // Master Data
  { key: 'hotels', label: 'Hotel', path: '/admin/hotels', icon: 'Hotel', group_name: 'Master Data', sort_order: 1, required_permission: 'hotels' },
  { key: 'airlines', label: 'Maskapai', path: '/admin/airlines', icon: 'Plane', group_name: 'Master Data', sort_order: 2, required_permission: 'airlines' },
  { key: 'airports', label: 'Bandara', path: '/admin/airports', icon: 'Building', group_name: 'Master Data', sort_order: 3, required_permission: 'airports' },
  { key: 'vendors', label: 'Vendor', path: '/admin/vendors', icon: 'Store', group_name: 'Master Data', sort_order: 4, required_permission: 'vendors' },

  // Pengaturan
  { key: 'users', label: 'User', path: '/admin/users', icon: 'UserCog', group_name: 'Pengaturan', sort_order: 1, required_permission: 'users' },
  { key: 'document-types', label: 'Jenis Dokumen', path: '/admin/document-types', icon: 'FileCog', group_name: 'Pengaturan', sort_order: 2, required_permission: 'document-types' },
  { key: 'roles', label: 'Manajemen Role', path: '/admin/roles', icon: 'ShieldCheck', group_name: 'Pengaturan', sort_order: 3, required_permission: 'roles' },
  { key: 'rbac-tools', label: 'RBAC Tools', path: '/admin/rbac-tools', icon: 'ShieldAlert', group_name: 'Pengaturan', sort_order: 4, required_permission: 'rbac-tools' },
  { key: 'settings', label: 'Settings', path: '/admin/settings', icon: 'Settings', group_name: 'Pengaturan', sort_order: 4, required_permission: 'settings' },
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
