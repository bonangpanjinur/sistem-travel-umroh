-- RBAC Improvements Migration
-- Date: 2026-03-26
-- Author: Manus AI

-- 1. Add new granular permissions to permissions_list
INSERT INTO public.permissions_list (key, label, group_name, description, icon_name) VALUES
-- HR Module
('hr.employees.view', 'Lihat Data Karyawan', 'SDM (HR)', 'Melihat daftar dan detail karyawan', 'Users'),
('hr.employees.manage', 'Kelola Data Karyawan', 'SDM (HR)', 'Tambah, edit, dan hapus data karyawan', 'UserCog'),
('hr.attendance.view', 'Lihat Absensi', 'SDM (HR)', 'Melihat riwayat absensi karyawan', 'Clock'),
('hr.attendance.manage', 'Kelola Absensi', 'SDM (HR)', 'Mengelola catatan absensi', 'Clock'),
('hr.payroll.view', 'Lihat Penggajian', 'SDM (HR)', 'Melihat data penggajian dan slip gaji', 'Banknote'),
('hr.payroll.manage', 'Kelola Penggajian', 'SDM (HR)', 'Mengelola payroll dan generate slip gaji', 'Banknote'),
('hr.departments.view', 'Lihat Departemen', 'SDM (HR)', 'Melihat daftar departemen', 'Building2'),
('hr.departments.manage', 'Kelola Departemen', 'SDM (HR)', 'Mengelola data departemen', 'Building2'),
('hr.positions.view', 'Lihat Posisi', 'SDM (HR)', 'Melihat daftar posisi/jabatan', 'Briefcase'),
('hr.positions.manage', 'Kelola Posisi', 'SDM (HR)', 'Mengelola data posisi/jabatan', 'Briefcase'),
('hr.schedules.view', 'Lihat Jadwal Kerja', 'SDM (HR)', 'Melihat jadwal kerja karyawan', 'Calendar'),
('hr.schedules.manage', 'Kelola Jadwal Kerja', 'SDM (HR)', 'Mengelola jadwal kerja karyawan', 'Calendar'),
('hr.devices.view', 'Lihat Perangkat', 'SDM (HR)', 'Melihat daftar perangkat absensi', 'Smartphone'),
('hr.devices.manage', 'Kelola Perangkat', 'SDM (HR)', 'Mengelola perangkat absensi', 'Smartphone'),
('hr.settings.view', 'Lihat Pengaturan HR', 'SDM (HR)', 'Melihat konfigurasi HR', 'Settings'),
('hr.settings.manage', 'Kelola Pengaturan HR', 'SDM (HR)', 'Mengelola konfigurasi HR', 'Settings'),

-- Support & Communication
('support.tickets.view', 'Lihat Tiket Support', 'Support', 'Melihat tiket bantuan', 'Headphones'),
('support.tickets.manage', 'Kelola Tiket Support', 'Support', 'Membalas dan mengelola tiket bantuan', 'Headphones'),
('whatsapp.view', 'Lihat Log WhatsApp', 'Komunikasi', 'Melihat riwayat pesan WhatsApp', 'MessageSquare'),
('whatsapp.send', 'Kirim Pesan WhatsApp', 'Komunikasi', 'Mengirim pesan WhatsApp manual/broadcast', 'MessageSquare'),
('marketing_materials.view', 'Lihat Materi Promosi', 'Marketing', 'Melihat dan download materi promosi', 'FileText'),
('marketing_materials.manage', 'Kelola Materi Promosi', 'Marketing', 'Upload dan kelola materi promosi', 'FileText'),

-- Documents & Letters
('documents.verification.view', 'Lihat Verifikasi Dokumen', 'Dokumen', 'Melihat status verifikasi dokumen', 'FileCheck'),
('documents.verification.manage', 'Kelola Verifikasi Dokumen', 'Dokumen', 'Melakukan verifikasi dokumen jamaah', 'FileCheck'),
('documents.generator.view', 'Lihat Generate Surat', 'Dokumen', 'Akses fitur generate surat', 'FileText'),
('documents.generator.generate', 'Generate Surat', 'Dokumen', 'Membuat surat otomatis', 'FileText'),
('offline_content.view', 'Lihat Konten Offline', 'Dokumen', 'Melihat konten panduan offline', 'BookOpen'),
('offline_content.manage', 'Kelola Konten Offline', 'Dokumen', 'Mengelola konten panduan offline', 'BookOpen')
ON CONFLICT (key) DO NOTHING;

-- 2. Update role_permissions for specific roles based on the new matrix

-- Operational role updates
INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'operational', key, true FROM public.permissions_list WHERE key LIKE 'hr.attendance.%'
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'operational', key, true FROM public.permissions_list WHERE key LIKE 'hr.schedules.%'
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'operational', key, true FROM public.permissions_list WHERE key LIKE 'documents.%'
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'operational', key, true FROM public.permissions_list WHERE key LIKE 'offline_content.%'
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Finance role updates
INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'finance', key, true FROM public.permissions_list WHERE key LIKE 'hr.payroll.%'
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Marketing role updates
INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'marketing', key, true FROM public.permissions_list WHERE key LIKE 'marketing_materials.%'
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- Branch Manager role updates
INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'branch_manager', key, true FROM public.permissions_list WHERE key LIKE 'hr.%'
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'branch_manager', key, true FROM public.permissions_list WHERE key LIKE 'support.%'
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;

-- 3. Row Level Security (RLS) Enhancements (Example for sensitive tables)
-- Note: In a real environment, we would need to ensure these tables exist.
-- Assuming tables: vendor_costs, cash_transactions, employees

-- Example for employees table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'employees') THEN
        ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view employees based on permissions" ON public.employees;
        CREATE POLICY "Users can view employees based on permissions" ON public.employees
        FOR SELECT USING (
            public.check_permission(auth.uid(), 'hr.employees.view') AND 
            (public.is_admin(auth.uid()) OR branch_id = public.get_user_branch_id(auth.uid()))
        );
    END IF;
END $$;

-- Example for cash_transactions table
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cash_transactions') THEN
        ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Users can view cash transactions based on permissions" ON public.cash_transactions;
        CREATE POLICY "Users can view cash transactions based on permissions" ON public.cash_transactions
        FOR SELECT USING (
            public.check_permission(auth.uid(), 'payments.view_all') OR
            (public.check_permission(auth.uid(), 'payments.view_branch') AND branch_id = public.get_user_branch_id(auth.uid()))
        );
    END IF;
END $$;
