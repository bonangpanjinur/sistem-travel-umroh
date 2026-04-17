import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const RECOMMENDED_MENUS = [
  // Overview
  { key: 'dashboard', label: 'Dashboard', path: '/admin', icon: 'LayoutDashboard', group_name: 'Overview', sort_order: 10, required_permission: 'menu_dashboard' },
  { key: 'analytics', label: 'Analytics', path: '/admin/analytics', icon: 'BarChart3', group_name: 'Overview', sort_order: 20, required_permission: 'menu_analytics' },
  
  // Sales & CRM
  { key: 'leads', label: 'Leads', path: '/admin/leads', icon: 'UserPlus', group_name: 'Sales & CRM', sort_order: 10, required_permission: 'menu_leads' },
  { key: 'landing_pages', label: 'Landing Page', path: '/admin/landing-pages', icon: 'Globe', group_name: 'Sales & CRM', sort_order: 20, required_permission: 'menu_landing_pages' },
  
  // Operasional
  { key: 'packages', label: 'Paket', path: '/admin/packages', icon: 'Package', group_name: 'Operasional', sort_order: 10, required_permission: 'menu_packages' },
  { key: 'departures', label: 'Jadwal Keberangkatan', path: '/admin/departures', icon: 'CalendarDays', group_name: 'Operasional', sort_order: 20, required_permission: 'menu_departures' },
  { key: 'bookings', label: 'Booking', path: '/admin/bookings', icon: 'BookOpen', group_name: 'Operasional', sort_order: 30, required_permission: 'menu_bookings' },
  { key: 'savings', label: 'Tabungan', path: '/admin/savings', icon: 'Wallet', group_name: 'Operasional', sort_order: 40, required_permission: 'menu_savings' },
  { key: 'haji', label: 'Manajemen Haji', path: '/admin/haji', icon: 'Mosque', group_name: 'Operasional', sort_order: 50, required_permission: 'menu_haji' },
  
  // Keuangan
  { key: 'payments', label: 'Pembayaran', path: '/admin/payments', icon: 'CreditCard', group_name: 'Keuangan', sort_order: 10, required_permission: 'menu_payments' },
  { key: 'finance_cash', label: 'Kas & Bank', path: '/admin/finance-cash', icon: 'Wallet', group_name: 'Keuangan', sort_order: 20, required_permission: 'menu_finance_cash' },
  { key: 'finance_pl', label: 'Laba Rugi', path: '/admin/finance', icon: 'PieChart', group_name: 'Keuangan', sort_order: 30, required_permission: 'menu_finance' },
  
  // Database
  { key: 'customers', label: 'Jamaah', path: '/admin/customers', icon: 'Users', group_name: 'Database', sort_order: 10, required_permission: 'menu_customers' },
  { key: 'agents', label: 'Agent', path: '/admin/agents', icon: 'UserSquare2', group_name: 'Database', sort_order: 20, required_permission: 'menu_agents' },
  { key: 'branches', label: 'Cabang', path: '/admin/branches', icon: 'Network', group_name: 'Database', sort_order: 30, required_permission: 'menu_branches' },
  { key: 'master_data', label: 'Master Data', path: '/admin/master-data', icon: 'Database', group_name: 'Database', sort_order: 40, required_permission: 'menu_master_data' },
  
  // SDM (HR)
  { key: 'hr_employees', label: 'Data Karyawan', path: '/admin/hr', icon: 'Contact2', group_name: 'SDM (HR)', sort_order: 10, required_permission: 'menu_hr' },
  
  // Komunikasi
  { key: 'whatsapp', label: 'WhatsApp', path: '/admin/whatsapp', icon: 'MessageSquare', group_name: 'Komunikasi', sort_order: 10, required_permission: 'menu_whatsapp' },
  { key: 'support_tickets', label: 'Support Ticket', path: '/admin/support', icon: 'LifeBuoy', group_name: 'Komunikasi', sort_order: 20, required_permission: 'menu_support' },

  // Laporan
  { key: 'reports', label: 'Laporan', path: '/admin/reports', icon: 'FileBarChart', group_name: 'Laporan', sort_order: 10, required_permission: 'menu_reports' },
  
  // Sistem
  { key: 'users', label: 'Manajemen User', path: '/admin/users', icon: 'UserCog', group_name: 'Sistem', sort_order: 10, required_permission: 'menu_users' },
  { key: 'user_permissions', label: 'Hak Akses User', path: '/admin/user-permissions', icon: 'ShieldCheck', group_name: 'Sistem', sort_order: 20, required_permission: 'menu_user_permissions' },
  { key: 'settings', label: 'Pengaturan', path: '/admin/settings', icon: 'Settings', group_name: 'Sistem', sort_order: 30, required_permission: 'menu_settings' },
];

export const useSyncMenusFixed = () => {
  const queryClient = useQueryClient();
  const syncMenus = async () => {
    const { data, error } = await supabase.rpc('bulk_sync_menu_items', {
      _menu_items: JSON.stringify(RECOMMENDED_MENUS)
    });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['dynamic-menus'] });
    return data;
  };
  return { syncMenus };
};
