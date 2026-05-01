-- RBAC Improvements Phase 1 & 2
-- Based on Strategic Access System Fix Plan

-- ==========================================
-- FASE 1: STANDARDIZATION & AUDIT
-- ==========================================

-- 1. Normalisasi Nama Role di tabel user_roles (Case-Sensitive)
-- Karena database menggunakan ENUM app_role, data sebenarnya sudah terikat ke nilai enum.
-- Namun kita pastikan konsistensi jika ada input manual di masa depan.
-- (Catatan: ENUM app_role di sistem ini sudah menggunakan huruf kecil: super_admin, admin, agent, dll.)

-- 2. Audit Menu Terdaftar
-- Memastikan tabel menu_items terisi dengan path yang benar.
-- Berdasarkan file 20260417_enhanced_menu_access_control.sql, menu_items sudah terisi.
-- Kita tambahkan/pastikan menu dasar agent tersedia.

INSERT INTO public.menu_items (key, label, path, group_name, sort_order, required_permission) VALUES
('agent_dashboard', 'Dashboard Agent', '/agent', 'Agent Area', 10, 'agent.dashboard'),
('agent_bookings', 'Booking Saya', '/agent/bookings', 'Agent Area', 20, 'agent.bookings'),
('agent_customers', 'Jamaah Saya', '/agent/customers', 'Agent Area', 30, 'agent.customers'),
('agent_commissions', 'Komisi Saya', '/agent/commissions', 'Agent Area', 40, 'agent.commissions')
ON CONFLICT (key) DO UPDATE SET
  path = EXCLUDED.path,
  label = EXCLUDED.label;

-- 3. Pembersihan Permission List (Audit)
-- Pastikan permission keys yang dibutuhkan tersedia di permissions_list.
INSERT INTO public.permissions_list (key, description, module) VALUES
('agent.dashboard', 'Akses ke dashboard agent', 'Agent'),
('agent.bookings', 'Akses ke manajemen booking agent', 'Agent'),
('agent.customers', 'Akses ke data jamaah agent', 'Agent'),
('agent.commissions', 'Akses ke laporan komisi agent', 'Agent'),
('admin.access', 'Akses dasar area admin', 'Admin')
ON CONFLICT (key) DO NOTHING;

-- ==========================================
-- FASE 2: PERMISSION MAPPING (BRIDGE)
-- ==========================================

-- Sistem ini menggunakan role_permissions (role -> permission_key) 
-- dan menu_items (menu -> required_permission).
-- Jadi kita memetakan role ke permission_key agar menu bisa terbuka.

-- 1. Hak Akses Admin (Role: owner, branch_manager, finance, operational, sales, marketing)
-- Memberikan akses ke menu yang relevan.
-- Kita gunakan permission 'admin.access' sebagai flag umum jika diperlukan, 
-- tapi sistem sudah menggunakan granular permissions.

-- 2. Hak Akses Spesifik Agent
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('agent', 'agent.dashboard', true),
('agent', 'agent.bookings', true),
('agent', 'agent.customers', true),
('agent', 'agent.commissions', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 3. Verifikasi & Perbaikan Pemetaan Role Admin
-- Memastikan role 'operational' (sebagai contoh staff admin) memiliki akses ke menu inti.
INSERT INTO public.role_permissions (role, permission_key, is_enabled) VALUES
('operational', 'dashboard.view', true),
('operational', 'packages.view', true),
('operational', 'bookings.view_own', true),
('operational', 'customers.view', true)
ON CONFLICT (role, permission_key) DO UPDATE SET is_enabled = true;

-- 4. Sinkronisasi metadata jika ada role di profiles (opsional, untuk kompatibilitas)
-- Jika tabel profiles memiliki kolom role, kita sinkronkan.
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        UPDATE public.profiles p
        SET role = LOWER(ur.role::text)
        FROM public.user_roles ur
        WHERE p.user_id = ur.user_id;
    END IF;
END $$;
