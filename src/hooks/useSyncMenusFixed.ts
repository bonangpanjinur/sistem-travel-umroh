import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const RECOMMENDED_MENUS = [
  // Overview
  { key: 'dashboard', label: 'Dashboard', path: '/admin', icon: 'LayoutDashboard', group_name: 'Overview', sort_order: 10, required_permission: 'menu_dashboard' },
  { key: 'analytics', label: 'Analytics', path: '/admin/analytics', icon: 'BarChart3', group_name: 'Overview', sort_order: 20, required_permission: 'menu_analytics' },
  
  // Sales & CRM
  { key: 'leads', label: 'Leads', path: '/admin/leads', icon: 'UserPlus', group_name: 'Sales & CRM', sort_order: 10, required_permission: 'menu_leads' },
  { key: 'coupons', label: 'Kupon', path: '/admin/coupons', icon: 'Ticket', group_name: 'Sales & CRM', sort_order: 20, required_permission: 'menu_coupons' },
  { key: 'landing_pages', label: 'Landing Page', path: '/admin/landing-pages', icon: 'Globe', group_name: 'Sales & CRM', sort_order: 30, required_permission: 'menu_landing_pages' },
  
  // Operasional
  { key: 'packages', label: 'Paket', path: '/admin/packages', icon: 'Package', group_name: 'Operasional', sort_order: 10, required_permission: 'menu_packages' },
  { key: 'departures', label: 'Jadwal Keberangkatan', path: '/admin/departures', icon: 'CalendarDays', group_name: 'Operasional', sort_order: 20, required_permission: 'menu_departures' },
  { key: 'bookings', label: 'Booking', path: '/admin/bookings', icon: 'BookOpen', group_name: 'Operasional', sort_order: 30, required_permission: 'menu_bookings' },
  { key: 'equipment', label: 'Perlengkapan', path: '/admin/equipment', icon: 'Backpack', group_name: 'Operasional', sort_order: 40, required_permission: 'menu_equipment' },
  { key: 'room_assignments', label: 'Kamar', path: '/admin/room-assignments', icon: 'Bed', group_name: 'Operasional', sort_order: 50, required_permission: 'menu_room_assignments' },
  { key: 'itinerary_templates', label: 'Itinerary', path: '/admin/itinerary-templates', icon: 'Map', group_name: 'Operasional', sort_order: 60, required_permission: 'menu_itinerary_templates' },
  { key: 'haji', label: 'Manajemen Haji', path: '/admin/haji', icon: 'Mosque', group_name: 'Operasional', sort_order: 70, required_permission: 'menu_haji' },
  { key: 'manasik', label: 'Manasik', path: '/admin/manasik', icon: 'BookText', group_name: 'Operasional', sort_order: 80, required_permission: 'menu_manasik' },
  { key: 'visa', label: 'Manajemen Visa', path: '/admin/visa', icon: 'CreditCard', group_name: 'Operasional', sort_order: 90, required_permission: 'menu_visa' },
  { key: 'document_verification', label: 'Verifikasi Dokumen', path: '/admin/document-verification', icon: 'FileCheck', group_name: 'Operasional', sort_order: 100, required_permission: 'menu_document_verification' },
  { key: 'documents_generator', label: 'Generator Dokumen', path: '/admin/documents-generator', icon: 'FileText', group_name: 'Operasional', sort_order: 110, required_permission: 'menu_documents_generator' },

  // Keuangan
  { key: 'payments', label: 'Pembayaran', path: '/admin/payments', icon: 'CreditCard', group_name: 'Keuangan', sort_order: 10, required_permission: 'menu_payments' },
  { key: 'finance_cash', label: 'Kas & Bank', path: '/admin/finance-cash', icon: 'Wallet', group_name: 'Keuangan', sort_order: 20, required_permission: 'menu_finance_cash' },
  { key: 'finance_ar', label: 'Piutang Jamaah', path: '/admin/finance/ar', icon: 'ArrowUpRight', group_name: 'Keuangan', sort_order: 30, required_permission: 'menu_finance_ar' },
  { key: 'finance_ap', label: 'Hutang Vendor', path: '/admin/finance/ap', icon: 'ArrowDownLeft', group_name: 'Keuangan', sort_order: 40, required_permission: 'menu_finance_ap' },
  { key: 'finance_pl', label: 'Laba Rugi', path: '/admin/finance', icon: 'PieChart', group_name: 'Keuangan', sort_order: 50, required_permission: 'menu_finance' },
  
  // Database
  { key: 'customers', label: 'Jamaah', path: '/admin/customers', icon: 'Users', group_name: 'Database', sort_order: 10, required_permission: 'menu_customers' },
  { key: 'agents', label: 'Agent', path: '/admin/agents', icon: 'UserSquare2', group_name: 'Database', sort_order: 20, required_permission: 'menu_agents' },
  { key: 'branches', label: 'Cabang', path: '/admin/branches', icon: 'Network', group_name: 'Database', sort_order: 30, required_permission: 'menu_branches' },
  { key: 'master_data', label: 'Master Data', path: '/admin/master-data', icon: 'Database', group_name: 'Database', sort_order: 40, required_permission: 'menu_master_data' },
  
  // SDM (HR)
  { key: 'hr_employees', label: 'Data Karyawan', path: '/admin/hr', icon: 'Contact2', group_name: 'SDM (HR)', sort_order: 10, required_permission: 'menu_hr' },
  { key: 'hr_payroll', label: 'Payroll', path: '/admin/hr/payroll', icon: 'Banknote', group_name: 'SDM (HR)', sort_order: 20, required_permission: 'menu_hr_payroll' },
  
  // Komunikasi
  { key: 'whatsapp', label: 'WhatsApp', path: '/admin/whatsapp', icon: 'MessageSquare', group_name: 'Komunikasi', sort_order: 10, required_permission: 'menu_whatsapp' },
  { key: 'support_tickets', label: 'Support Ticket', path: '/admin/support', icon: 'LifeBuoy', group_name: 'Komunikasi', sort_order: 20, required_permission: 'menu_support' },
  { key: 'marketing_materials', label: 'Materi Marketing', path: '/admin/marketing-materials', icon: 'Image', group_name: 'Komunikasi', sort_order: 30, required_permission: 'menu_marketing_materials' },

  // Laporan
  { key: 'reports', label: 'Laporan Standar', path: '/admin/reports', icon: 'FileBarChart', group_name: 'Laporan', sort_order: 10, required_permission: 'menu_reports' },
  { key: 'advanced_reports', label: 'Laporan Lanjutan', path: '/admin/advanced-reports', icon: 'TrendingUp', group_name: 'Laporan', sort_order: 20, required_permission: 'menu_advanced_reports' },
  { key: 'scheduled_reports', label: 'Laporan Terjadwal', path: '/admin/scheduled-reports', icon: 'Clock', group_name: 'Laporan', sort_order: 30, required_permission: 'menu_scheduled_reports' },
  
  // Sistem
  { key: 'users', label: 'Manajemen User', path: '/admin/users', icon: 'UserCog', group_name: 'Sistem', sort_order: 10, required_permission: 'menu_users' },
  { key: 'security_audit', label: 'Audit Log', path: '/admin/security-audit', icon: 'ShieldCheck', group_name: 'Sistem', sort_order: 20, required_permission: 'menu_security_audit' },
  { key: '2fa', label: 'Keamanan (2FA)', path: '/admin/2fa', icon: 'Lock', group_name: 'Sistem', sort_order: 30, required_permission: 'menu_2fa' },
  { key: 'settings', label: 'Pengaturan', path: '/admin/settings', icon: 'Settings', group_name: 'Sistem', sort_order: 40, required_permission: 'menu_settings' },
  { key: 'appearance', label: 'Tampilan', path: '/admin/appearance', icon: 'Palette', group_name: 'Sistem', sort_order: 50, required_permission: 'menu_appearance' },
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

// TODO: Ensure syncMenus() is called upon application startup or relevant event to update the database.
