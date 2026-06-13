-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 002: Enums
-- All application-wide enumerations defined here.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. app_role — Role pengguna sistem
--    Digunakan di: user_roles, role_permissions, staff_invitations,
--    rbac_audit_trail, audit_logs, menu_items
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'super_admin',    -- akses penuh semua fitur & pengaturan sistem
    'owner',          -- pemilik perusahaan, akses semua laporan keuangan
    'it',             -- tim IT: manajemen user, RBAC, sistem
    'admin',          -- admin operasional harian
    'branch_manager', -- manajer cabang
    'finance',        -- tim keuangan & akuntansi
    'operational',    -- tim operasional keberangkatan
    'operator',       -- operator booking & data entry
    'sales',          -- tim penjualan / CS
    'marketing',      -- tim marketing & konten
    'equipment',      -- tim perlengkapan
    'agent',          -- agen mitra travel
    'sub_agent',      -- sub-agen di bawah agen
    'customer',       -- portal customer (legacy, pra-booking)
    'jamaah'          -- jamaah aktif (memiliki booking aktif)
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 2. payment_method_type — Metode pembayaran
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.payment_method_type AS ENUM (
    'transfer', 'cash', 'virtual_account', 'credit_card',
    'debit_card', 'qris', 'midtrans', 'other'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 3. booking_status_type — Status pemesanan
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.booking_status_type AS ENUM (
    'pending', 'confirmed', 'awaiting_documents',
    'documents_complete', 'visa_processing',
    'completed', 'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 4. payment_status_type — Status pembayaran booking
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.payment_status_type AS ENUM (
    'unpaid', 'partial', 'paid', 'refunded', 'overpaid'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 5. document_status_type — Status dokumen jamaah
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.document_status_type AS ENUM (
    'pending', 'verified', 'rejected', 'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 6. gender_type
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.gender_type AS ENUM ('male', 'female');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 7. notification_channel_type
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.notification_channel_type AS ENUM (
    'in_app', 'push', 'email', 'whatsapp', 'sms'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
