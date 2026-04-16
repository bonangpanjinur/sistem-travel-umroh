
-- Create list_users_with_emails function
CREATE OR REPLACE FUNCTION public.list_users_with_emails()
RETURNS TABLE(id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT au.id, au.email::text
  FROM auth.users au;
$$;

-- Seed menu_items with all admin menus
INSERT INTO public.menu_items (key, label, path, icon, group_name, sort_order, required_permission) VALUES
  -- Overview
  ('dashboard', 'Dashboard', '/admin', 'LayoutDashboard', 'Overview', 1, 'dashboard'),
  ('analytics', 'Analytics', '/admin/analytics', 'BarChart3', 'Overview', 2, 'analytics'),
  -- Sales & CRM
  ('leads', 'CRM Leads', '/admin/leads', 'Target', 'Sales & CRM', 1, 'leads'),
  ('coupons', 'Kupon', '/admin/coupons', 'Gift', 'Sales & CRM', 2, 'coupons'),
  ('landing-pages', 'Landing Page', '/admin/landing-pages', 'Layout', 'Sales & CRM', 3, 'landing-pages'),
  -- Produk & Operasional
  ('packages', 'Paket', '/admin/packages', 'Package', 'Produk & Operasional', 1, 'packages'),
  ('departures', 'Keberangkatan', '/admin/departures', 'Plane', 'Produk & Operasional', 2, 'departures'),
  ('bookings', 'Booking', '/admin/bookings', 'Calendar', 'Produk & Operasional', 3, 'bookings'),
  ('equipment', 'Perlengkapan', '/admin/equipment', 'Box', 'Produk & Operasional', 4, 'equipment'),
  ('itinerary-templates', 'Template Itinerary', '/admin/itinerary-templates', 'MapPin', 'Produk & Operasional', 5, 'itinerary-templates'),
  ('savings', 'Tabungan', '/admin/savings', 'Wallet', 'Produk & Operasional', 6, 'savings'),
  ('room-assignments', 'Kamar', '/admin/room-assignments', 'BedDouble', 'Produk & Operasional', 7, 'room-assignments'),
  -- Keuangan & Akuntansi
  ('payments', 'Pembayaran', '/admin/payments', 'CreditCard', 'Keuangan & Akuntansi', 1, 'payments'),
  ('finance-cash', 'Kas & Bank', '/admin/finance-cash', 'Wallet', 'Keuangan & Akuntansi', 2, 'finance-cash'),
  ('finance-ar', 'Piutang Jamaah', '/admin/finance/ar', 'FileText', 'Keuangan & Akuntansi', 3, 'finance-ar'),
  ('finance-ap', 'Hutang Vendor', '/admin/finance/ap', 'Truck', 'Keuangan & Akuntansi', 4, 'finance-ap'),
  ('finance-pl', 'Laporan Laba Rugi', '/admin/finance', 'DollarSign', 'Keuangan & Akuntansi', 5, 'finance-pl'),
  -- Jamaah & Agent
  ('customers', 'Jamaah', '/admin/customers', 'Users', 'Jamaah & Agent', 1, 'customers'),
  ('agents', 'Agent', '/admin/agents', 'UserCheck', 'Jamaah & Agent', 2, 'agents'),
  ('branches', 'Cabang', '/admin/branches', 'Building2', 'Jamaah & Agent', 3, 'branches'),
  ('loyalty', 'Loyalty', '/admin/loyalty', 'Gift', 'Jamaah & Agent', 4, 'loyalty'),
  ('referrals', 'Referral', '/admin/referrals', 'Share2', 'Jamaah & Agent', 5, 'referrals'),
  ('haji', 'Haji', '/admin/haji', 'BookOpen', 'Jamaah & Agent', 6, 'haji'),
  ('manasik', 'Manasik', '/admin/manasik', 'Calendar', 'Jamaah & Agent', 7, 'manasik'),
  ('visa', 'Visa', '/admin/visa', 'FileCheck', 'Jamaah & Agent', 8, 'visa'),
  -- SDM (HR)
  ('hr', 'Data Karyawan', '/admin/hr', 'UserCog', 'SDM (HR)', 1, 'hr'),
  ('payroll', 'Penggajian / Payroll', '/admin/hr/payroll', 'Banknote', 'SDM (HR)', 2, 'payroll'),
  -- Support & Komunikasi
  ('support', 'Tiket Support', '/admin/support', 'Headphones', 'Support & Komunikasi', 1, 'support'),
  ('whatsapp', 'WhatsApp', '/admin/whatsapp', 'MessageSquare', 'Support & Komunikasi', 2, 'whatsapp'),
  ('marketing-materials', 'Materi Promosi', '/admin/marketing-materials', 'FileText', 'Support & Komunikasi', 3, 'marketing-materials'),
  -- Dokumen & Surat
  ('document-verification', 'Verifikasi Dokumen', '/admin/document-verification', 'FileCheck', 'Dokumen & Surat', 1, 'document-verification'),
  ('documents-generator', 'Generate Surat', '/admin/documents-generator', 'FileText', 'Dokumen & Surat', 2, 'documents-generator'),
  ('offline-content', 'Konten Offline', '/admin/offline-content', 'BookOpen', 'Dokumen & Surat', 3, 'offline-content'),
  -- Laporan
  ('reports', 'Laporan', '/admin/reports', 'FileBarChart', 'Laporan', 1, 'reports'),
  -- Pengaturan
  ('users', 'Users', '/admin/users', 'Shield', 'Pengaturan', 1, 'users'),
  ('user-permissions', 'Hak Akses User', '/admin/users', 'UserCog', 'Pengaturan', 2, 'user-permissions'),
  ('security-audit', 'Security Audit', '/admin/security-audit', 'ShieldCheck', 'Pengaturan', 3, 'security-audit'),
  ('2fa-settings', '2FA Settings', '/admin/2fa', 'Key', 'Pengaturan', 4, '2fa-settings'),
  ('appearance', 'Tampilan', '/admin/appearance', 'Palette', 'Pengaturan', 5, 'appearance'),
  ('static-pages', 'Halaman Statis', '/admin/static-pages', 'FileType', 'Pengaturan', 6, 'static-pages'),
  ('testimonials', 'Testimoni', '/admin/testimonials', 'Star', 'Pengaturan', 7, 'testimonials'),
  ('package-types', 'Tipe Paket', '/admin/package-types', 'Settings2', 'Pengaturan', 8, 'package-types'),
  ('settings', 'Pengaturan', '/admin/settings', 'Settings', 'Pengaturan', 9, 'settings'),
  -- Master Data
  ('airlines', 'Maskapai', '/admin/airlines', 'Plane', 'Master Data', 1, 'airlines'),
  ('airports', 'Bandara', '/admin/airports', 'MapPin', 'Master Data', 2, 'airports'),
  ('hotels', 'Hotel', '/admin/hotels', 'Hotel', 'Master Data', 3, 'hotels'),
  ('muthawifs', 'Muthawif', '/admin/muthawifs', 'UserCheck', 'Master Data', 4, 'muthawifs'),
  ('bus-providers', 'Bus Provider', '/admin/bus-providers', 'Truck', 'Master Data', 5, 'bus-providers'),
  ('vendors', 'Vendor', '/admin/vendors', 'Briefcase', 'Master Data', 6, 'vendors')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  path = EXCLUDED.path,
  icon = EXCLUDED.icon,
  group_name = EXCLUDED.group_name,
  sort_order = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission,
  updated_at = now();

-- Sync permissions_list from menu_items
INSERT INTO public.permissions_list (key, label, group_name, description)
SELECT 
  m.required_permission,
  m.label,
  m.group_name,
  'Akses menu ' || m.label
FROM public.menu_items m
WHERE m.required_permission IS NOT NULL AND m.required_permission != ''
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  group_name = EXCLUDED.group_name,
  description = EXCLUDED.description,
  updated_at = now();
