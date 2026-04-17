import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const RECOMMENDED_MENUS = [
  // Overview
  { key: 'dashboard', label: 'Dashboard', path: '/admin', icon: 'LayoutDashboard', group_name: 'Overview', sort_order: 10, required_permission: 'dashboard' },
  { key: 'analytics', label: 'Analytics', path: '/admin/analytics', icon: 'BarChart3', group_name: 'Overview', sort_order: 20, required_permission: 'analytics' },
  
  // Sales & CRM
  { key: 'leads', label: 'Leads', path: '/admin/leads', icon: 'UserPlus', group_name: 'Sales & CRM', sort_order: 10, required_permission: 'leads' },
  { key: 'landing_pages', label: 'Landing Page', path: '/admin/landing-pages', icon: 'Globe', group_name: 'Sales & CRM', sort_order: 20, required_permission: 'settings' },
  
  // Operasional
  { key: 'packages', label: 'Paket', path: '/admin/packages', icon: 'Package', group_name: 'Operasional', sort_order: 10, required_permission: 'packages' },
  { key: 'departures', label: 'Jadwal Keberangkatan', path: '/admin/departures', icon: 'CalendarDays', group_name: 'Operasional', sort_order: 20, required_permission: 'departures' },
  { key: 'bookings', label: 'Booking', path: '/admin/bookings', icon: 'BookOpen', group_name: 'Operasional', sort_order: 30, required_permission: 'bookings' },
  { key: 'savings', label: 'Tabungan', path: '/admin/savings', icon: 'Wallet', group_name: 'Operasional', sort_order: 40, required_permission: 'packages' },
  { key: 'haji', label: 'Manajemen Haji', path: '/admin/haji', icon: 'Mosque', group_name: 'Operasional', sort_order: 50, required_permission: 'operational' },
  
  // Keuangan
  { key: 'payments', label: 'Pembayaran', path: '/admin/payments', icon: 'CreditCard', group_name: 'Keuangan', sort_order: 10, required_permission: 'payments' },
  { key: 'finance_cash', label: 'Kas & Bank', path: '/admin/finance-cash', icon: 'Wallet', group_name: 'Keuangan', sort_order: 20, required_permission: 'payments' },
  { key: 'finance_pl', label: 'Laba Rugi', path: '/admin/finance', icon: 'PieChart', group_name: 'Keuangan', sort_order: 30, required_permission: 'reports' },
  
  // Database
  { key: 'customers', label: 'Jamaah', path: '/admin/customers', icon: 'Users', group_name: 'Database', sort_order: 10, required_permission: 'customers' },
  { key: 'agents', label: 'Agent', path: '/admin/agents', icon: 'UserSquare2', group_name: 'Database', sort_order: 20, required_permission: 'agents' },
  { key: 'branches', label: 'Cabang', path: '/admin/branches', icon: 'Network', group_name: 'Database', sort_order: 30, required_permission: 'settings' },
  { key: 'master_data', label: 'Master Data', path: '/admin/master-data', icon: 'Database', group_name: 'Database', sort_order: 40, required_permission: 'master_data' },
  
  // SDM (HR)
  { key: 'hr_employees', label: 'Data Karyawan', path: '/admin/hr', icon: 'Contact2', group_name: 'SDM (HR)', sort_order: 10, required_permission: 'operational' },
  
  // Komunikasi
  { key: 'whatsapp', label: 'WhatsApp', path: '/admin/whatsapp', icon: 'MessageSquare', group_name: 'Komunikasi', sort_order: 10, required_permission: 'operational' },
  { key: 'support_tickets', label: 'Support Ticket', path: '/admin/support', icon: 'LifeBuoy', group_name: 'Komunikasi', sort_order: 20, required_permission: 'operational' },

  // Laporan
  { key: 'reports', label: 'Laporan', path: '/admin/reports', icon: 'FileBarChart', group_name: 'Laporan', sort_order: 10, required_permission: 'reports' },
  
  // Dokumen & Surat
  { key: 'document_verification', label: 'Verifikasi Dokumen', path: '/admin/document-verification', icon: 'FileCheck', group_name: 'Dokumen & Surat', sort_order: 10, required_permission: 'operational' },
  { key: 'documents_generator', label: 'Generate Surat', path: '/admin/documents-generator', icon: 'FileText', group_name: 'Dokumen & Surat', sort_order: 20, required_permission: 'operational' },
  { key: 'offline_content', label: 'Konten Offline', path: '/admin/offline-content', icon: 'BookOpen', group_name: 'Dokumen & Surat', sort_order: 30, required_permission: 'operational' },
  
  // Sistem
  { key: 'users', label: 'Manajemen User', path: '/admin/users', icon: 'UserCog', group_name: 'Sistem', sort_order: 10, required_permission: 'users' },
  { key: 'user_permissions', label: 'Hak Akses User', path: '/admin/user-permissions', icon: 'ShieldCheck', group_name: 'Sistem', sort_order: 20, required_permission: 'users' },
  { key: 'settings', label: 'Pengaturan', path: '/admin/settings', icon: 'Settings', group_name: 'Sistem', sort_order: 30, required_permission: 'settings' },
];

export const useSyncMenusFixed = () => {
  const queryClient = useQueryClient();
  const syncMenus = async () => {
    // Send array directly as JSONB - Supabase will handle JSON serialization
    const { data, error } = await supabase.rpc('bulk_sync_menu_items', {
      _menu_items: RECOMMENDED_MENUS
    });
    if (error) throw error;
    queryClient.invalidateQueries({ queryKey: ['dynamic-menus'] });
    return data;
  };
  return { syncMenus };
};
