-- Cleanup Menu Redundancy and Reorganize Groups
-- Tanggal: 2026-04-19

-- 1. Hide redundant or confusing menu items
UPDATE public.menu_items 
SET is_visible = FALSE 
WHERE key IN ('udac_management', 'master_data', 'hr_settings');

-- 2. Reorganize groups and labels for better UX
-- Overview -> Dashboard
UPDATE public.menu_items SET group_name = 'Dashboard', sort_order = 10 WHERE key = 'dashboard';
UPDATE public.menu_items SET group_name = 'Dashboard', sort_order = 20 WHERE key = 'analytics';

-- Sales & CRM -> Marketing & Sales
UPDATE public.menu_items SET group_name = 'Marketing & Sales', sort_order = 10 WHERE key = 'crm_leads';
UPDATE public.menu_items SET group_name = 'Marketing & Sales', sort_order = 20 WHERE key = 'coupons';
UPDATE public.menu_items SET group_name = 'Marketing & Sales', sort_order = 30 WHERE key = 'landing_pages';
UPDATE public.menu_items SET group_name = 'Marketing & Sales', sort_order = 40 WHERE key = 'loyalty';
UPDATE public.menu_items SET group_name = 'Marketing & Sales', sort_order = 50 WHERE key = 'referrals';
UPDATE public.menu_items SET group_name = 'Marketing & Sales', sort_order = 60 WHERE key = 'marketing_materials';

-- Produk & Operasional -> Operasional
UPDATE public.menu_items SET group_name = 'Operasional', sort_order = 10 WHERE key = 'packages';
UPDATE public.menu_items SET group_name = 'Operasional', sort_order = 20 WHERE key = 'departures';
UPDATE public.menu_items SET group_name = 'Operasional', sort_order = 30 WHERE key = 'bookings';
UPDATE public.menu_items SET group_name = 'Operasional', sort_order = 40 WHERE key = 'equipment';
UPDATE public.menu_items SET group_name = 'Operasional', sort_order = 50 WHERE key = 'itinerary_templates';
UPDATE public.menu_items SET group_name = 'Operasional', sort_order = 60 WHERE key = 'savings';
UPDATE public.menu_items SET group_name = 'Operasional', sort_order = 70 WHERE key = 'room_assignments';
UPDATE public.menu_items SET group_name = 'Operasional', sort_order = 80 WHERE key = 'haji';
UPDATE public.menu_items SET group_name = 'Operasional', sort_order = 90 WHERE key = 'manasik';
UPDATE public.menu_items SET group_name = 'Operasional', sort_order = 100 WHERE key = 'visa';

-- Keuangan & Akuntansi -> Keuangan
UPDATE public.menu_items SET group_name = 'Keuangan', sort_order = 10 WHERE key = 'payments';
UPDATE public.menu_items SET group_name = 'Keuangan', sort_order = 20 WHERE key = 'finance_cash';
UPDATE public.menu_items SET group_name = 'Keuangan', sort_order = 30 WHERE key = 'finance_ar';
UPDATE public.menu_items SET group_name = 'Keuangan', sort_order = 40 WHERE key = 'finance_ap';
UPDATE public.menu_items SET group_name = 'Keuangan', sort_order = 50 WHERE key = 'finance_reports';

-- Jamaah & Agent -> Database
UPDATE public.menu_items SET group_name = 'Database', sort_order = 10 WHERE key = 'customers';
UPDATE public.menu_items SET group_name = 'Database', sort_order = 20 WHERE key = 'agents';
UPDATE public.menu_items SET group_name = 'Database', sort_order = 30 WHERE key = 'branches';

-- SDM (HR) -> SDM
UPDATE public.menu_items SET group_name = 'SDM', sort_order = 10 WHERE key = 'hr_employees';
UPDATE public.menu_items SET group_name = 'SDM', sort_order = 20 WHERE key = 'hr_attendance';
UPDATE public.menu_items SET group_name = 'SDM', sort_order = 30 WHERE key = 'hr_payroll';
UPDATE public.menu_items SET group_name = 'SDM', sort_order = 40 WHERE key = 'hr_salary_slip';
UPDATE public.menu_items SET group_name = 'SDM', sort_order = 50 WHERE key = 'hr_departments';
UPDATE public.menu_items SET group_name = 'SDM', sort_order = 60 WHERE key = 'hr_positions';
UPDATE public.menu_items SET group_name = 'SDM', sort_order = 70 WHERE key = 'hr_schedules';
UPDATE public.menu_items SET group_name = 'SDM', sort_order = 80 WHERE key = 'hr_devices';

-- Support & Komunikasi -> Support
UPDATE public.menu_items SET group_name = 'Support', sort_order = 10 WHERE key = 'support_tickets';
UPDATE public.menu_items SET group_name = 'Support', sort_order = 20 WHERE key = 'whatsapp';

-- Dokumen & Surat -> Dokumen
UPDATE public.menu_items SET group_name = 'Dokumen', sort_order = 10 WHERE key = 'document_verification';
UPDATE public.menu_items SET group_name = 'Dokumen', sort_order = 20 WHERE key = 'documents_generator';
UPDATE public.menu_items SET group_name = 'Dokumen', sort_order = 30 WHERE key = 'offline_content';

-- Laporan -> Laporan
UPDATE public.menu_items SET group_name = 'Laporan', sort_order = 10 WHERE key = 'reports';
UPDATE public.menu_items SET group_name = 'Laporan', sort_order = 20 WHERE key = 'advanced_reports';
UPDATE public.menu_items SET group_name = 'Laporan', sort_order = 30 WHERE key = 'scheduled_reports';

-- Pengaturan -> Pengaturan
UPDATE public.menu_items SET group_name = 'Pengaturan', sort_order = 10 WHERE key = 'users';
UPDATE public.menu_items SET group_name = 'Pengaturan', sort_order = 20 WHERE key = 'role_management';
UPDATE public.menu_items SET group_name = 'Pengaturan', sort_order = 30 WHERE key = 'user_permissions';
UPDATE public.menu_items SET group_name = 'Pengaturan', sort_order = 40 WHERE key = 'security_audit';
UPDATE public.menu_items SET group_name = 'Pengaturan', sort_order = 50 WHERE key = '2fa_settings';
UPDATE public.menu_items SET group_name = 'Pengaturan', sort_order = 60 WHERE key = 'appearance';
UPDATE public.menu_items SET group_name = 'Pengaturan', sort_order = 70 WHERE key = 'static_pages';
UPDATE public.menu_items SET group_name = 'Pengaturan', sort_order = 80 WHERE key = 'testimonials';
UPDATE public.menu_items SET group_name = 'Pengaturan', sort_order = 90 WHERE key = 'package_types';
UPDATE public.menu_items SET group_name = 'Pengaturan', sort_order = 100 WHERE key = 'settings';

-- 3. Update Icons for better visual consistency
UPDATE public.menu_items SET icon = 'LayoutDashboard' WHERE key = 'dashboard';
UPDATE public.menu_items SET icon = 'BarChart3' WHERE key = 'analytics';
UPDATE public.menu_items SET icon = 'Target' WHERE key = 'crm_leads';
UPDATE public.menu_items SET icon = 'Gift' WHERE key = 'coupons';
UPDATE public.menu_items SET icon = 'Layout' WHERE key = 'landing_pages';
UPDATE public.menu_items SET icon = 'Package' WHERE key = 'packages';
UPDATE public.menu_items SET icon = 'Plane' WHERE key = 'departures';
UPDATE public.menu_items SET icon = 'Calendar' WHERE key = 'bookings';
UPDATE public.menu_items SET icon = 'Box' WHERE key = 'equipment';
UPDATE public.menu_items SET icon = 'MapPin' WHERE key = 'itinerary_templates';
UPDATE public.menu_items SET icon = 'Wallet' WHERE key = 'savings';
UPDATE public.menu_items SET icon = 'BedDouble' WHERE key = 'room_assignments';
UPDATE public.menu_items SET icon = 'CreditCard' WHERE key = 'payments';
UPDATE public.menu_items SET icon = 'Wallet' WHERE key = 'finance_cash';
UPDATE public.menu_items SET icon = 'FileText' WHERE key = 'finance_ar';
UPDATE public.menu_items SET icon = 'Truck' WHERE key = 'finance_ap';
UPDATE public.menu_items SET icon = 'DollarSign' WHERE key = 'finance_reports';
UPDATE public.menu_items SET icon = 'Users' WHERE key = 'customers';
UPDATE public.menu_items SET icon = 'UserCheck' WHERE key = 'agents';
UPDATE public.menu_items SET icon = 'Building2' WHERE key = 'branches';
UPDATE public.menu_items SET icon = 'Gift' WHERE key = 'loyalty';
UPDATE public.menu_items SET icon = 'Share2' WHERE key = 'referrals';
UPDATE public.menu_items SET icon = 'BookOpen' WHERE key = 'haji';
UPDATE public.menu_items SET icon = 'Calendar' WHERE key = 'manasik';
UPDATE public.menu_items SET icon = 'FileCheck' WHERE key = 'visa';
UPDATE public.menu_items SET icon = 'UserCog' WHERE key = 'hr_employees';
UPDATE public.menu_items SET icon = 'Clock' WHERE key = 'hr_attendance';
UPDATE public.menu_items SET icon = 'Banknote' WHERE key = 'hr_payroll';
UPDATE public.menu_items SET icon = 'FileText' WHERE key = 'hr_salary_slip';
UPDATE public.menu_items SET icon = 'Building2' WHERE key = 'hr_departments';
UPDATE public.menu_items SET icon = 'Briefcase' WHERE key = 'hr_positions';
UPDATE public.menu_items SET icon = 'Calendar' WHERE key = 'hr_schedules';
UPDATE public.menu_items SET icon = 'Smartphone' WHERE key = 'hr_devices';
UPDATE public.menu_items SET icon = 'HeadphonesIcon' WHERE key = 'support_tickets';
UPDATE public.menu_items SET icon = 'MessageSquare' WHERE key = 'whatsapp';
UPDATE public.menu_items SET icon = 'FileText' WHERE key = 'marketing_materials';
UPDATE public.menu_items SET icon = 'FileCheck' WHERE key = 'document_verification';
UPDATE public.menu_items SET icon = 'FileText' WHERE key = 'documents_generator';
UPDATE public.menu_items SET icon = 'BookOpen' WHERE key = 'offline_content';
UPDATE public.menu_items SET icon = 'FileBarChart' WHERE key = 'reports';
UPDATE public.menu_items SET icon = 'TrendingUp' WHERE key = 'advanced_reports';
UPDATE public.menu_items SET icon = 'Calendar' WHERE key = 'scheduled_reports';
UPDATE public.menu_items SET icon = 'Shield' WHERE key = 'users';
UPDATE public.menu_items SET icon = 'KeyRound' WHERE key = 'role_management';
UPDATE public.menu_items SET icon = 'UserCheck' WHERE key = 'user_permissions';
UPDATE public.menu_items SET icon = 'ShieldCheck' WHERE key = 'security_audit';
UPDATE public.menu_items SET icon = 'Key' WHERE key = '2fa_settings';
UPDATE public.menu_items SET icon = 'Palette' WHERE key = 'appearance';
UPDATE public.menu_items SET icon = 'FileType' WHERE key = 'static_pages';
UPDATE public.menu_items SET icon = 'Star' WHERE key = 'testimonials';
UPDATE public.menu_items SET icon = 'Settings2' WHERE key = 'package_types';
UPDATE public.menu_items SET icon = 'Settings' WHERE key = 'settings';
