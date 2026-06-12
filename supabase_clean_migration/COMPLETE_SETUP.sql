
-- ============================================================
-- 01_extensions_helpers.sql
-- ============================================================
-- =============================================================================
-- FILE 01 — Extensions & Helper Functions
-- Jalankan file ini PERTAMA sebelum semua file lainnya.
-- Supabase: jalankan di SQL Editor
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- HELPER: Auto-update updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- HELPER: Slugify text (untuk agent/branch website slug)
-- =============================================================================
CREATE OR REPLACE FUNCTION slugify_text(input TEXT)
RETURNS TEXT AS $$
DECLARE result TEXT;
BEGIN
  result := lower(input);
  result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
  result := regexp_replace(result, '\s+', '-', 'g');
  result := regexp_replace(result, '-+', '-', 'g');
  result := trim(result, '-');
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- HELPER: Macro untuk buat trigger updated_at (idempotent)
-- =============================================================================
CREATE OR REPLACE FUNCTION _create_updated_at_trigger(p_table TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_' || p_table || '_updated_at'
      AND tgrelid = p_table::regclass
  ) THEN
    EXECUTE format(
      'CREATE TRIGGER set_%1$s_updated_at
       BEFORE UPDATE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      p_table
    );
  END IF;
END;
$$;

-- =============================================================================
-- SELESAI — Extensions & Helpers siap.
-- =============================================================================
SELECT 'File 01 — Extensions & Helpers: OK' AS result;

-- ============================================================
-- 00_column_guards.sql
-- ============================================================
-- =============================================================================
-- 00_column_guards.sql — Vinstour Travel Portal
-- Tambahkan semua kolom yang mungkin tidak ada di tabel lama.
-- Aman di DB baru (tabel belum ada → EXCEPTION diabaikan) dan di DB lama
-- (tabel ada → kolom ditambahkan jika belum ada).
-- =============================================================================

-- Setiap ALTER TABLE dibungkus DO block + EXCEPTION WHEN undefined_table
-- agar tidak error saat tabel belum dibuat (akan dibuat di file 02–06).

-- ─── PROFILES ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone      TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email      TEXT;
  ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role       TEXT DEFAULT 'customer';
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── USER_ROLES ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS branch_id UUID;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── BRANCHES ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS slug                 TEXT;
  ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS website_description  TEXT;
  ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS website_banner_url   TEXT;
  ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS website_gallery      JSONB DEFAULT '[]';
  ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS website_testimonials JSONB DEFAULT '[]';
  ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS featured_package_ids JSONB DEFAULT '[]';
  ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS view_count           INTEGER DEFAULT 0;
  ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS manager_user_id      UUID;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── AGENTS ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS parent_agent_id      UUID;
  ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS slug                 TEXT;
  ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS featured_package_ids JSONB DEFAULT '[]';
  ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS website_bio          TEXT;
  ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS level                INTEGER DEFAULT 1;
  ALTER TABLE public.agents ADD COLUMN IF NOT EXISTS commission_rate      NUMERIC(5,2) DEFAULT 0;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── EMPLOYEES ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS basic_salary        NUMERIC(15,2) DEFAULT 0;
  ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS allowances          JSONB DEFAULT '{}';
  ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bank_name           TEXT;
  ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bank_account_number TEXT;
  ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bank_account_name   TEXT;
  ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS tax_id              TEXT;
  ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bpjs_kes_number     TEXT;
  ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS bpjs_tk_number      TEXT;
  ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS photo_url           TEXT;
  ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS salary              NUMERIC(15,2) DEFAULT 0;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── PACKAGES ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS code           TEXT;
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS price_double   NUMERIC(15,2);
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS price_triple   NUMERIC(15,2);
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS price_quad     NUMERIC(15,2);
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS gallery_urls   JSONB DEFAULT '[]';
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS fee_branch     NUMERIC(5,2) DEFAULT 0;
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS highlights     TEXT;
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS departure_city TEXT;
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS terms          TEXT;
  ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS quota          INTEGER DEFAULT 45;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── DEPARTURES ──────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS return_date     DATE;
  ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS available_seats INTEGER DEFAULT 45;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── DOCUMENT_TYPES ──────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.document_types ADD COLUMN IF NOT EXISTS code        TEXT;
  ALTER TABLE public.document_types ADD COLUMN IF NOT EXISTS description TEXT;
  ALTER TABLE public.document_types ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT FALSE;
  ALTER TABLE public.document_types ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT TRUE;
  ALTER TABLE public.document_types ADD COLUMN IF NOT EXISTS sort_order  INTEGER DEFAULT 0;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'document_types_code_key'
      AND conrelid = 'document_types'::regclass
  ) THEN
    ALTER TABLE public.document_types ADD CONSTRAINT document_types_code_key UNIQUE (code);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── CUSTOMERS ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS birth_place                  TEXT;
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS passport_number              TEXT;
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS passport_expiry              DATE;
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS passport_issued              TEXT;
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS photo_url                    TEXT;
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS nomor_porsi_haji             TEXT;
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS embarkasi_kode               TEXT;
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS estimasi_keberangkatan_haji  INTEGER;
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS postal_code                  TEXT;
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS province                     TEXT;
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS city                         TEXT;
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address                      TEXT;
  ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_active                    BOOLEAN DEFAULT TRUE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── BOOKINGS ────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS room_type         TEXT DEFAULT 'quad';
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS total_pax         INTEGER DEFAULT 1;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS referral_source   TEXT DEFAULT 'direct';
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS bagasi_kg_allowed INTEGER DEFAULT 23;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_deadline  DATE;
  ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS qr_token          TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- remaining_amount adalah GENERATED ALWAYS — perlu handling khusus
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'remaining_amount'
  ) AND EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'bookings'
  ) THEN
    EXECUTE 'ALTER TABLE public.bookings ADD COLUMN remaining_amount NUMERIC(15,2) GENERATED ALWAYS AS (GREATEST(0, total_price - paid_amount)) STORED';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'bookings.remaining_amount skip: %', SQLERRM;
END $$;

-- ─── BOOKING_PASSENGERS ──────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.booking_passengers ADD COLUMN IF NOT EXISTS passenger_type  TEXT DEFAULT 'dewasa';
  ALTER TABLE public.booking_passengers ADD COLUMN IF NOT EXISTS room_preference TEXT;
  ALTER TABLE public.booking_passengers ADD COLUMN IF NOT EXISTS room_number     TEXT;
  ALTER TABLE public.booking_passengers ADD COLUMN IF NOT EXISTS room_group_id   UUID;
  ALTER TABLE public.booking_passengers ADD COLUMN IF NOT EXISTS family_group_id UUID;
  ALTER TABLE public.booking_passengers ADD COLUMN IF NOT EXISTS checkin_status  TEXT DEFAULT 'not_checked';
  ALTER TABLE public.booking_passengers ADD COLUMN IF NOT EXISTS checkin_time    TIMESTAMPTZ;
  ALTER TABLE public.booking_passengers ADD COLUMN IF NOT EXISTS checkin_notes   TEXT;
  ALTER TABLE public.booking_passengers ADD COLUMN IF NOT EXISTS price_override  NUMERIC(15,2);
  ALTER TABLE public.booking_passengers ADD COLUMN IF NOT EXISTS price_category  TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── BOOKING_LINE_ITEMS ──────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.booking_line_items ADD COLUMN IF NOT EXISTS passenger_id UUID;
  ALTER TABLE public.booking_line_items ADD COLUMN IF NOT EXISTS item_type    TEXT DEFAULT 'service';
  ALTER TABLE public.booking_line_items ADD COLUMN IF NOT EXISTS reference_id UUID;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── ROOM_ASSIGNMENTS ────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.room_assignments ADD COLUMN IF NOT EXISTS floor          INTEGER;
  ALTER TABLE public.room_assignments ADD COLUMN IF NOT EXISTS capacity       INTEGER DEFAULT 4;
  ALTER TABLE public.room_assignments ADD COLUMN IF NOT EXISTS hotel_name     TEXT;
  ALTER TABLE public.room_assignments ADD COLUMN IF NOT EXISTS hotel_location TEXT DEFAULT 'mecca';
  ALTER TABLE public.room_assignments ADD COLUMN IF NOT EXISTS notes          TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── INVOICE_TEMPLATES ───────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.invoice_templates ADD COLUMN IF NOT EXISTS show_qr_code BOOLEAN DEFAULT TRUE;
  ALTER TABLE public.invoice_templates ADD COLUMN IF NOT EXISTS qr_placement  TEXT DEFAULT 'bottom-right';
  ALTER TABLE public.invoice_templates ADD COLUMN IF NOT EXISTS signature_url TEXT;
  ALTER TABLE public.invoice_templates ADD COLUMN IF NOT EXISTS branch_id     UUID;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── LEADS ───────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS package_interest TEXT;
  ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS agent_id         UUID;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── MUTHAWIFS ───────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.muthawifs ADD COLUMN IF NOT EXISTS specialization TEXT;
  ALTER TABLE public.muthawifs ADD COLUMN IF NOT EXISTS languages      TEXT[] DEFAULT '{}';
  ALTER TABLE public.muthawifs ADD COLUMN IF NOT EXISTS photo_url      TEXT;
  ALTER TABLE public.muthawifs ADD COLUMN IF NOT EXISTS bio            TEXT;
  ALTER TABLE public.muthawifs ADD COLUMN IF NOT EXISTS rating         NUMERIC(3,2) DEFAULT 0;
  ALTER TABLE public.muthawifs ADD COLUMN IF NOT EXISTS total_reviews  INTEGER DEFAULT 0;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── WEBSITE_SETTINGS ────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS banner_url        TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS bio               TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS testimonials      JSONB DEFAULT '[]';
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS gallery_urls      JSONB DEFAULT '[]';
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS seo_title         TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS seo_description   TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS view_count        INTEGER DEFAULT 0;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS social_youtube    TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS social_tiktok     TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS maps_embed_url    TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS chat_bubble_color TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS layout_variant    JSONB DEFAULT '{}';
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS theme_overrides   JSONB DEFAULT '{}';
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS favicon_url       TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS foreground_color  TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS background_color  TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS body_font         TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS heading_font      TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS footer_address    TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS footer_phone      TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS footer_email      TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS footer_whatsapp   TEXT;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS footer_links      JSONB;
  ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS custom_sections   JSONB;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── VISA_APPLICATIONS ───────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.visa_applications ADD COLUMN IF NOT EXISTS notes            TEXT;
  ALTER TABLE public.visa_applications ADD COLUMN IF NOT EXISTS submitted_at     TIMESTAMPTZ;
  ALTER TABLE public.visa_applications ADD COLUMN IF NOT EXISTS approved_at      TIMESTAMPTZ;
  ALTER TABLE public.visa_applications ADD COLUMN IF NOT EXISTS rejected_at      TIMESTAMPTZ;
  ALTER TABLE public.visa_applications ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
  ALTER TABLE public.visa_applications ADD COLUMN IF NOT EXISTS visa_number      TEXT;
  ALTER TABLE public.visa_applications ADD COLUMN IF NOT EXISTS visa_expiry      DATE;
  ALTER TABLE public.visa_applications ADD COLUMN IF NOT EXISTS officer_id       UUID;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── ANNOUNCEMENTS ───────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS branch_id   UUID;
  ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS is_pinned   BOOLEAN DEFAULT FALSE;
  ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS target_role TEXT;
  ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS expires_at  TIMESTAMPTZ;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── BANNERS ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS branch_id  UUID;
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS agent_id   UUID;
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS starts_at  TIMESTAMPTZ;
  ALTER TABLE public.banners ADD COLUMN IF NOT EXISTS ends_at    TIMESTAMPTZ;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── COUPONS ─────────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS branch_id        UUID;
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS agent_id         UUID;
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_uses         INTEGER;
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS current_uses     INTEGER DEFAULT 0;
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS min_order_amount NUMERIC(15,2);
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS starts_at        TIMESTAMPTZ;
  ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS expires_at       TIMESTAMPTZ;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── APP_SETTINGS ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS branch_id UUID;
  ALTER TABLE public.app_settings ADD COLUMN IF NOT EXISTS value     JSONB;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── VIRTUAL_ACCOUNTS ────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.virtual_accounts ADD COLUMN IF NOT EXISTS bank_code TEXT;
  ALTER TABLE public.virtual_accounts ADD COLUMN IF NOT EXISTS bank_name TEXT;
  ALTER TABLE public.virtual_accounts ADD COLUMN IF NOT EXISTS va_number TEXT;
  ALTER TABLE public.virtual_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
  ALTER TABLE public.virtual_accounts ADD COLUMN IF NOT EXISTS branch_id UUID;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── WHATSAPP_CONFIG ─────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.whatsapp_config ADD COLUMN IF NOT EXISTS device_id TEXT;
  ALTER TABLE public.whatsapp_config ADD COLUMN IF NOT EXISTS api_key   TEXT;
  ALTER TABLE public.whatsapp_config ADD COLUMN IF NOT EXISTS provider  TEXT DEFAULT 'fonnte';
  ALTER TABLE public.whatsapp_config ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
  ALTER TABLE public.whatsapp_config ADD COLUMN IF NOT EXISTS branch_id UUID;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── PAYROLL_RECORDS ─────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS allowances   JSONB DEFAULT '{}';
  ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS deductions   JSONB DEFAULT '{}';
  ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS net_salary   NUMERIC(15,2) DEFAULT 0;
  ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS period_month INTEGER;
  ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS period_year  INTEGER;
  ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS paid_at      TIMESTAMPTZ;
  ALTER TABLE public.payroll_records ADD COLUMN IF NOT EXISTS notes        TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── LEAVE_REQUESTS ──────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS approved_by UUID;
  ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
  ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS rejected_by UUID;
  ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
  ALTER TABLE public.leave_requests ADD COLUMN IF NOT EXISTS reject_note TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── MEMBERSHIP_PLANS ────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS plan_type       TEXT DEFAULT 'agent';
  ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS price_yearly    NUMERIC(15,2) DEFAULT 0;
  ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS max_sub_agents  INTEGER;
  ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(5,2) DEFAULT 0;
  ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS features        JSONB DEFAULT '[]';
  ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS sort_order      INTEGER DEFAULT 0;
  ALTER TABLE public.membership_plans ADD COLUMN IF NOT EXISTS is_active       BOOLEAN DEFAULT TRUE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── AGENT_MEMBERSHIPS ───────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.agent_memberships ADD COLUMN IF NOT EXISTS plan_id     UUID;
  ALTER TABLE public.agent_memberships ADD COLUMN IF NOT EXISTS starts_at   DATE;
  ALTER TABLE public.agent_memberships ADD COLUMN IF NOT EXISTS expires_at  DATE;
  ALTER TABLE public.agent_memberships ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT TRUE;
  ALTER TABLE public.agent_memberships ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── MEDIA_GALLERY ───────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.media_gallery ADD COLUMN IF NOT EXISTS branch_id UUID;
  ALTER TABLE public.media_gallery ADD COLUMN IF NOT EXISTS agent_id  UUID;
  ALTER TABLE public.media_gallery ADD COLUMN IF NOT EXISTS file_type TEXT DEFAULT 'image';
  ALTER TABLE public.media_gallery ADD COLUMN IF NOT EXISTS file_size INTEGER;
  ALTER TABLE public.media_gallery ADD COLUMN IF NOT EXISTS alt_text  TEXT;
  ALTER TABLE public.media_gallery ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── COMPANY_SETTINGS ────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS value       TEXT;
  ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS value_json  JSONB;
  ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS description TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── BANK_ACCOUNTS ───────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS branch_name TEXT;
  ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS is_primary  BOOLEAN DEFAULT FALSE;
  ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT TRUE;
  ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS logo_url    TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── STORE_PRODUCTS ──────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS weight_gram  INTEGER DEFAULT 0;
  ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS is_featured  BOOLEAN DEFAULT FALSE;
  ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS gallery_urls JSONB DEFAULT '[]';
  ALTER TABLE public.store_products ADD COLUMN IF NOT EXISTS sku          TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── STORE_ORDERS ────────────────────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;
  ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS shipping_cost    NUMERIC(15,2) DEFAULT 0;
  ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS discount_amount  NUMERIC(15,2) DEFAULT 0;
  ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS coupon_code      TEXT;
  ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS notes            TEXT;
  ALTER TABLE public.store_orders ADD COLUMN IF NOT EXISTS paid_at          TIMESTAMPTZ;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ─── DEPARTURE_FINANCIAL_SUMMARY ─────────────────────────────────────────────
DO $$ BEGIN
  ALTER TABLE public.departure_financial_summary ADD COLUMN IF NOT EXISTS total_revenue  NUMERIC(15,2) DEFAULT 0;
  ALTER TABLE public.departure_financial_summary ADD COLUMN IF NOT EXISTS total_expenses NUMERIC(15,2) DEFAULT 0;
  ALTER TABLE public.departure_financial_summary ADD COLUMN IF NOT EXISTS net_profit     NUMERIC(15,2) DEFAULT 0;
  ALTER TABLE public.departure_financial_summary ADD COLUMN IF NOT EXISTS notes          TEXT;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

SELECT 'Column guards OK — kolom yang hilang sudah ditambahkan, tabel baru diabaikan' AS result;

-- ============================================================
-- 02_core_entities.sql
-- ============================================================
-- =============================================================================
-- FILE 02 — Core Entities
-- Urutan: profiles → user_roles → airlines/hotels/vendors →
--         branches → agents → muthawifs → employees →
--         packages → departures → document_types → menu_items
-- Jalankan setelah 01_extensions_helpers.sql
-- =============================================================================

-- =============================================================================
-- 1. PROFILES — Ekstensi dari auth.users
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name  TEXT,
  avatar_url TEXT,
  phone      TEXT,
  email      TEXT,
  role       TEXT DEFAULT 'customer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_own"             ON profiles;
DROP POLICY IF EXISTS "staff_read_profiles"       ON profiles;
DROP POLICY IF EXISTS "admin_read_profiles_for_status" ON profiles;

CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (id = auth.uid());

CREATE POLICY "staff_read_profiles" ON profiles
  FOR SELECT USING (auth.role() = 'authenticated');
-- NOTE: "admin_read_profiles_for_status" policy is added AFTER user_roles table
-- is created below, because it references the user_roles table.

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_profiles_updated_at'
    AND tgrelid='profiles'::regclass) THEN
    CREATE TRIGGER set_profiles_updated_at
      BEFORE UPDATE ON profiles
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Auto-create profile saat user baru register
-- PENTING: dibungkus BEGIN/EXCEPTION agar error DB tidak pernah membatalkan auth signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO profiles (id, full_name, email, avatar_url)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: gagal buat profil untuk %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- =============================================================================
-- 2. USER_ROLES — RBAC: role per user (termasuk 'it' dari fase31)
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_roles (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN (
    'super_admin','owner','admin','branch_manager','finance',
    'operational','sales','marketing','hr','equipment',
    'agent','sub_agent','customer','jamaah','visa_officer','it'
  )),
  branch_id  UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role    ON user_roles(role);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_roles_admin_manage" ON user_roles;
DROP POLICY IF EXISTS "user_roles_read_own"     ON user_roles;

CREATE POLICY "user_roles_admin_manage" ON user_roles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','admin')
    )
  );

CREATE POLICY "user_roles_read_own" ON user_roles
  FOR SELECT USING (user_id = auth.uid());

-- Add profile policy that references user_roles (deferred to here so user_roles exists)
CREATE POLICY "admin_read_profiles_for_status" ON profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
  );


-- =============================================================================
-- 3. ROLE_PERMISSIONS — Izin per role
-- =============================================================================
CREATE TABLE IF NOT EXISTS role_permissions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role           TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  is_enabled     BOOLEAN DEFAULT TRUE,
  UNIQUE (role, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_role_perms_role ON role_permissions(role);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "role_perms_admin_manage" ON role_permissions;
DROP POLICY IF EXISTS "role_perms_staff_read"   ON role_permissions;

CREATE POLICY "role_perms_admin_manage" ON role_permissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "role_perms_staff_read" ON role_permissions
  FOR SELECT USING (auth.role() = 'authenticated');


-- =============================================================================
-- 4. PERMISSIONS_LIST — Daftar semua izin yang tersedia
-- =============================================================================
CREATE TABLE IF NOT EXISTS permissions_list (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key         TEXT UNIQUE NOT NULL,
  label       TEXT NOT NULL,
  group_name  TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE permissions_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_permissions_list"   ON permissions_list;
DROP POLICY IF EXISTS "admin_manage_permissions_list" ON permissions_list;

CREATE POLICY "staff_read_permissions_list" ON permissions_list
  FOR SELECT USING (true);

CREATE POLICY "admin_manage_permissions_list" ON permissions_list
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner'))
  );


-- =============================================================================
-- 5. AIRLINES — Data maskapai penerbangan
-- =============================================================================
CREATE TABLE IF NOT EXISTS airlines (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT NOT NULL,
  iata_code  TEXT UNIQUE,
  logo_url   TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_airlines_is_active ON airlines(is_active);

ALTER TABLE airlines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "airlines_admin_manage" ON airlines;
DROP POLICY IF EXISTS "airlines_public_read"  ON airlines;

CREATE POLICY "airlines_admin_manage" ON airlines
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','operational'))
  );

CREATE POLICY "airlines_public_read" ON airlines
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_airlines_updated_at'
    AND tgrelid='airlines'::regclass) THEN
    CREATE TRIGGER set_airlines_updated_at
      BEFORE UPDATE ON airlines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 6. HOTELS — Data hotel mitra
-- =============================================================================
CREATE TABLE IF NOT EXISTS hotels (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  stars       INTEGER DEFAULT 3 CHECK (stars BETWEEN 1 AND 7),
  city        TEXT NOT NULL,
  country     TEXT NOT NULL DEFAULT 'Saudi Arabia',
  address     TEXT,
  phone       TEXT,
  email       TEXT,
  description TEXT,
  photo_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotels_city      ON hotels(city);
CREATE INDEX IF NOT EXISTS idx_hotels_is_active ON hotels(is_active);

ALTER TABLE hotels ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hotels_admin_manage" ON hotels;
DROP POLICY IF EXISTS "hotels_public_read"  ON hotels;

CREATE POLICY "hotels_admin_manage" ON hotels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','operational'))
  );

CREATE POLICY "hotels_public_read" ON hotels
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_hotels_updated_at'
    AND tgrelid='hotels'::regclass) THEN
    CREATE TRIGGER set_hotels_updated_at
      BEFORE UPDATE ON hotels FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 7. VENDORS — Mitra/vendor eksternal
-- =============================================================================
CREATE TABLE IF NOT EXISTS vendors (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  type         TEXT NOT NULL DEFAULT 'lainnya'
    CHECK (type IN ('maskapai','hotel','bus','katering','asuransi','visa','lainnya')),
  contact_name TEXT,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  npwp         TEXT,
  bank_account TEXT,
  bank_name    TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  notes        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendors_type      ON vendors(type);
CREATE INDEX IF NOT EXISTS idx_vendors_is_active ON vendors(is_active);

ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vendors_admin_manage" ON vendors;
DROP POLICY IF EXISTS "vendors_staff_read"   ON vendors;

CREATE POLICY "vendors_admin_manage" ON vendors
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','finance','operational'))
  );

CREATE POLICY "vendors_staff_read" ON vendors
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_vendors_updated_at'
    AND tgrelid='vendors'::regclass) THEN
    CREATE TRIGGER set_vendors_updated_at
      BEFORE UPDATE ON vendors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 8. BRANCHES — Kantor cabang
-- =============================================================================
CREATE TABLE IF NOT EXISTS branches (
  id                    UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                  TEXT NOT NULL,
  code                  TEXT NOT NULL UNIQUE,
  address               TEXT,
  city                  TEXT,
  province              TEXT,
  phone                 TEXT,
  email                 TEXT,
  manager_user_id       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active             BOOLEAN DEFAULT TRUE,
  slug                  TEXT UNIQUE,
  website_description   TEXT,
  website_banner_url    TEXT,
  website_gallery       JSONB DEFAULT '[]',
  website_testimonials  JSONB DEFAULT '[]',
  featured_package_ids  JSONB DEFAULT '[]',
  view_count            INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branches_code               ON branches(code);
CREATE INDEX IF NOT EXISTS idx_branches_is_active          ON branches(is_active);
CREATE INDEX IF NOT EXISTS idx_branches_slug               ON branches(slug);
CREATE INDEX IF NOT EXISTS branches_manager_user_id_idx    ON branches(manager_user_id);

ALTER TABLE branches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "branches_admin_manage"       ON branches;
DROP POLICY IF EXISTS "branches_manager_manage_own" ON branches;
DROP POLICY IF EXISTS "branches_public_read"        ON branches;

CREATE POLICY "branches_admin_manage" ON branches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "branches_manager_manage_own" ON branches
  FOR ALL USING (manager_user_id = auth.uid());

CREATE POLICY "branches_public_read" ON branches
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_branches_updated_at'
    AND tgrelid='branches'::regclass) THEN
    CREATE TRIGGER set_branches_updated_at
      BEFORE UPDATE ON branches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 9. AGENTS — Agen perjalanan (termasuk kolom fase2 & fase17)
-- =============================================================================
CREATE TABLE IF NOT EXISTS agents (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id              UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id            UUID REFERENCES branches(id) ON DELETE SET NULL,
  parent_agent_id      UUID REFERENCES agents(id) ON DELETE SET NULL,
  company_name         TEXT NOT NULL,
  agent_code           TEXT NOT NULL UNIQUE,
  contact_name         TEXT,
  phone                TEXT,
  email                TEXT,
  address              TEXT,
  commission_rate      NUMERIC(5,2) DEFAULT 0,
  is_active            BOOLEAN DEFAULT TRUE,
  slug                 TEXT UNIQUE,
  featured_package_ids JSONB DEFAULT '[]',
  website_bio          TEXT,
  level                INTEGER DEFAULT 1,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agents_user_id   ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_branch_id ON agents(branch_id);
CREATE INDEX IF NOT EXISTS idx_agents_is_active ON agents(is_active);
CREATE INDEX IF NOT EXISTS idx_agents_slug      ON agents(slug);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents_admin_manage" ON agents;
DROP POLICY IF EXISTS "agents_own_manage"   ON agents;
DROP POLICY IF EXISTS "agents_public_read"  ON agents;

CREATE POLICY "agents_admin_manage" ON agents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','branch_manager'))
  );

CREATE POLICY "agents_own_manage" ON agents
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "agents_public_read" ON agents
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_agents_updated_at'
    AND tgrelid='agents'::regclass) THEN
    CREATE TRIGGER set_agents_updated_at
      BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 10. MUTHAWIFS — Pembimbing ibadah
-- =============================================================================
CREATE TABLE IF NOT EXISTS muthawifs (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name           TEXT NOT NULL,
  phone          TEXT,
  email          TEXT,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  specialization TEXT,
  languages      TEXT[] DEFAULT '{}',
  is_active      BOOLEAN DEFAULT TRUE,
  photo_url      TEXT,
  bio            TEXT,
  rating         NUMERIC(3,2) DEFAULT 0,
  total_reviews  INTEGER DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_muthawifs_branch_id ON muthawifs(branch_id);
CREATE INDEX IF NOT EXISTS idx_muthawifs_is_active ON muthawifs(is_active);

ALTER TABLE muthawifs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "muthawifs_admin_manage" ON muthawifs;
DROP POLICY IF EXISTS "muthawifs_public_read"  ON muthawifs;

CREATE POLICY "muthawifs_admin_manage" ON muthawifs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );

CREATE POLICY "muthawifs_public_read" ON muthawifs
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_muthawifs_updated_at'
    AND tgrelid='muthawifs'::regclass) THEN
    CREATE TRIGGER set_muthawifs_updated_at
      BEFORE UPDATE ON muthawifs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 11. EMPLOYEES — Data karyawan (termasuk kolom HR dari fase10)
-- =============================================================================
CREATE TABLE IF NOT EXISTS employees (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id           UUID REFERENCES branches(id) ON DELETE SET NULL,
  full_name           TEXT NOT NULL,
  employee_code       TEXT UNIQUE,
  position            TEXT,
  department          TEXT,
  phone               TEXT,
  email               TEXT,
  join_date           DATE,
  status              TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','inactive','resigned')),
  salary              NUMERIC(15,2) DEFAULT 0,
  photo_url           TEXT,
  basic_salary        NUMERIC(15,2) DEFAULT 0,
  allowances          JSONB DEFAULT '{}',
  bank_name           TEXT,
  bank_account_number TEXT,
  bank_account_name   TEXT,
  tax_id              TEXT,
  bpjs_kes_number     TEXT,
  bpjs_tk_number      TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_user_id   ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_status    ON employees(status);

ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_admin_manage" ON employees;
DROP POLICY IF EXISTS "employees_hr_manage"    ON employees;
DROP POLICY IF EXISTS "employees_own_read"     ON employees;

CREATE POLICY "employees_admin_manage" ON employees
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','hr'))
  );

CREATE POLICY "employees_hr_manage" ON employees
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('branch_manager'))
  );

CREATE POLICY "employees_own_read" ON employees
  FOR SELECT USING (user_id = auth.uid());

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_employees_updated_at'
    AND tgrelid='employees'::regclass) THEN
    CREATE TRIGGER set_employees_updated_at
      BEFORE UPDATE ON employees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 12. PACKAGES — Paket umroh/haji (termasuk fee_branch dari fase1)
-- =============================================================================
CREATE TABLE IF NOT EXISTS packages (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  code           TEXT,
  type           TEXT NOT NULL DEFAULT 'umroh'
    CHECK (type IN ('umroh','haji','haji_plus','wisata')),
  description    TEXT,
  highlights     TEXT,
  price          NUMERIC(15,2) NOT NULL DEFAULT 0,
  price_double   NUMERIC(15,2),
  price_triple   NUMERIC(15,2),
  price_quad     NUMERIC(15,2),
  duration_days  INTEGER DEFAULT 9,
  departure_city TEXT,
  airline        TEXT,
  hotel_mecca    TEXT,
  hotel_medina   TEXT,
  includes       JSONB DEFAULT '[]',
  excludes       JSONB DEFAULT '[]',
  terms          TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  photo_url      TEXT,
  gallery_urls   JSONB DEFAULT '[]',
  quota          INTEGER DEFAULT 45,
  fee_branch     NUMERIC(5,2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_packages_branch_id ON packages(branch_id);
CREATE INDEX IF NOT EXISTS idx_packages_type      ON packages(type);
CREATE INDEX IF NOT EXISTS idx_packages_is_active ON packages(is_active);

ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "packages_admin_manage" ON packages;
DROP POLICY IF EXISTS "packages_public_read"  ON packages;

CREATE POLICY "packages_admin_manage" ON packages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );

CREATE POLICY "packages_public_read" ON packages
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_packages_updated_at'
    AND tgrelid='packages'::regclass) THEN
    CREATE TRIGGER set_packages_updated_at
      BEFORE UPDATE ON packages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 13. DEPARTURES — Jadwal keberangkatan
-- =============================================================================
CREATE TABLE IF NOT EXISTS departures (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id       UUID NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  departure_date   DATE NOT NULL,
  return_date      DATE,
  quota            INTEGER DEFAULT 45,
  available_seats  INTEGER DEFAULT 45,
  status           TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','closed','full','cancelled')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departures_package_id     ON departures(package_id);
CREATE INDEX IF NOT EXISTS idx_departures_departure_date ON departures(departure_date);
CREATE INDEX IF NOT EXISTS idx_departures_status         ON departures(status);

ALTER TABLE departures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departures_admin_manage" ON departures;
DROP POLICY IF EXISTS "departures_public_read"  ON departures;

CREATE POLICY "departures_admin_manage" ON departures
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );

CREATE POLICY "departures_public_read" ON departures
  FOR SELECT USING (status IN ('open','full'));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departures_updated_at'
    AND tgrelid='departures'::regclass) THEN
    CREATE TRIGGER set_departures_updated_at
      BEFORE UPDATE ON departures FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 14. DOCUMENT_TYPES — Jenis dokumen jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS document_types (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  description TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tambah kolom jika tabel sudah ada dari migrasi lama tanpa kolom ini
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS code        TEXT;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS is_required BOOLEAN DEFAULT FALSE;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS is_active   BOOLEAN DEFAULT TRUE;
ALTER TABLE document_types ADD COLUMN IF NOT EXISTS sort_order  INTEGER DEFAULT 0;

-- Pastikan constraint UNIQUE pada code ada
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'document_types_code_key'
      AND conrelid = 'document_types'::regclass
  ) THEN
    ALTER TABLE document_types ADD CONSTRAINT document_types_code_key UNIQUE (code);
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE document_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_types_admin_manage" ON document_types;
DROP POLICY IF EXISTS "document_types_staff_read"   ON document_types;

CREATE POLICY "document_types_admin_manage" ON document_types
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "document_types_staff_read" ON document_types
  FOR SELECT USING (auth.role() = 'authenticated');

INSERT INTO document_types (name, code, is_required, sort_order) VALUES
  ('Paspor',              'passport',       TRUE,  1),
  ('KTP',                 'ktp',            TRUE,  2),
  ('Kartu Keluarga',      'kk',             FALSE, 3),
  ('Foto 3x4',            'foto',           TRUE,  4),
  ('Akta Kelahiran',      'akta',           FALSE, 5),
  ('Buku Nikah',          'buku_nikah',     FALSE, 6),
  ('Surat Keterangan Sehat', 'surat_sehat', FALSE, 7),
  ('Vaksin Meningitis',   'vaksin',         TRUE,  8)
ON CONFLICT (code) DO NOTHING;


-- =============================================================================
-- 15. MENU_ITEMS — Konfigurasi menu sidebar admin
-- =============================================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key                 TEXT NOT NULL UNIQUE,
  label               TEXT NOT NULL,
  path                TEXT NOT NULL,
  icon                TEXT,
  group_name          TEXT,
  sort_order          INTEGER DEFAULT 0,
  required_permission TEXT,
  is_visible          BOOLEAN DEFAULT TRUE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "menu_items_staff_read"   ON menu_items;
DROP POLICY IF EXISTS "menu_items_admin_manage" ON menu_items;

CREATE POLICY "menu_items_staff_read" ON menu_items
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "menu_items_admin_manage" ON menu_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner'))
  );

-- =============================================================================
-- SELESAI — File 02: Core Entities
-- =============================================================================
SELECT 'File 02 — Core Entities: OK' AS result;

-- ============================================================
-- 03_customers_bookings.sql
-- ============================================================
-- =============================================================================
-- FILE 03 — Customers, Bookings & Payments
-- Urutan: customers → customer_documents → customer_mahrams →
--         bookings → booking_passengers → booking_status_history →
--         booking_document_logs → booking_line_items →
--         room_assignments → equipment_distributions →
--         savings_plans → savings_deposits → leads →
--         payment_deadline_reminders → invoice_templates
-- Jalankan setelah 02_core_entities.sql
-- =============================================================================

-- =============================================================================
-- 1. CUSTOMERS — Data jamaah/pelanggan
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id                           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id                    UUID REFERENCES branches(id) ON DELETE SET NULL,
  full_name                    TEXT NOT NULL,
  nik                          TEXT,
  gender                       TEXT CHECK (gender IN ('L','P')),
  phone                        TEXT,
  email                        TEXT,
  address                      TEXT,
  city                         TEXT,
  province                     TEXT,
  postal_code                  TEXT,
  birth_date                   DATE,
  birth_place                  TEXT,
  passport_number              TEXT,
  passport_expiry              DATE,
  passport_issued              TEXT,
  photo_url                    TEXT,
  is_active                    BOOLEAN DEFAULT TRUE,
  nomor_porsi_haji             TEXT,
  embarkasi_kode               TEXT,
  estimasi_keberangkatan_haji  INTEGER,
  created_at                   TIMESTAMPTZ DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id   ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_admin_manage" ON customers;
DROP POLICY IF EXISTS "customers_own_read"     ON customers;

CREATE POLICY "customers_admin_manage" ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','sales','finance')
    )
  );

CREATE POLICY "customers_own_read" ON customers
  FOR SELECT USING (user_id = auth.uid());

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_customers_updated_at'
    AND tgrelid='customers'::regclass) THEN
    CREATE TRIGGER set_customers_updated_at
      BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 2. CUSTOMER_DOCUMENTS — Dokumen jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_documents (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  file_url    TEXT,
  status      TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','verified','rejected')),
  notes       TEXT,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_docs_customer_id ON customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_docs_type        ON customer_documents(type);
CREATE INDEX IF NOT EXISTS idx_customer_docs_status      ON customer_documents(status);

ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_all_customer_documents"  ON customer_documents;
DROP POLICY IF EXISTS "staff_write_customer_documents"     ON customer_documents;

CREATE POLICY "staff_read_all_customer_documents" ON customer_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "staff_write_customer_documents" ON customer_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_customer_docs_updated_at'
    AND tgrelid='customer_documents'::regclass) THEN
    CREATE TRIGGER set_customer_docs_updated_at
      BEFORE UPDATE ON customer_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 3. CUSTOMER_MAHRAMS — Data mahram jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_mahrams (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  mahram_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  full_name         TEXT NOT NULL,
  relation          TEXT NOT NULL,
  relation_category TEXT DEFAULT 'lainnya'
    CHECK (relation_category IN ('suami','istri','anak','ayah','ibu','saudara','kakek','nenek','cucu','lainnya')),
  nik               TEXT,
  passport_number   TEXT,
  phone             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_mahrams_customer_id ON customer_mahrams(customer_id);

ALTER TABLE customer_mahrams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_all_customer_mahrams"  ON customer_mahrams;
DROP POLICY IF EXISTS "staff_write_customer_mahrams"     ON customer_mahrams;

CREATE POLICY "staff_read_all_customer_mahrams" ON customer_mahrams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "staff_write_customer_mahrams" ON customer_mahrams
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_customer_mahrams_updated_at'
    AND tgrelid='customer_mahrams'::regclass) THEN
    CREATE TRIGGER set_customer_mahrams_updated_at
      BEFORE UPDATE ON customer_mahrams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 4. BOOKINGS — Pemesanan (termasuk kolom fase3, fase29)
-- =============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id        UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  departure_id       UUID REFERENCES departures(id) ON DELETE SET NULL,
  agent_id           UUID REFERENCES agents(id) ON DELETE SET NULL,
  booking_code       TEXT NOT NULL UNIQUE,
  status             TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled','completed')),
  total_price        NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  remaining_amount   NUMERIC(15,2) GENERATED ALWAYS AS (GREATEST(0, total_price - paid_amount)) STORED,
  payment_status     TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','partial','paid','refunded')),
  room_type          TEXT DEFAULT 'quad'
    CHECK (room_type IN ('double','triple','quad')),
  total_pax          INTEGER DEFAULT 1,
  notes              TEXT,
  referral_source    TEXT DEFAULT 'direct'
    CHECK (referral_source IN ('direct','agent_website','branch_website','referral','whatsapp','instagram','facebook','other')),
  bagasi_kg_allowed  INTEGER DEFAULT 23,
  payment_deadline   DATE,
  qr_token           TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id    ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_departure_id   ON bookings(departure_id);
CREATE INDEX IF NOT EXISTS idx_bookings_agent_id       ON bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status         ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code   ON bookings(booking_code);
CREATE INDEX IF NOT EXISTS idx_bookings_qr_token       ON bookings(qr_token);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_admin_manage"  ON bookings;
DROP POLICY IF EXISTS "bookings_own_read"      ON bookings;
DROP POLICY IF EXISTS "bookings_agent_read"    ON bookings;

CREATE POLICY "bookings_admin_manage" ON bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','finance','sales')
    )
  );

CREATE POLICY "bookings_own_read" ON bookings
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "bookings_agent_read" ON bookings
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_bookings_updated_at'
    AND tgrelid='bookings'::regclass) THEN
    CREATE TRIGGER set_bookings_updated_at
      BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 5. BOOKING_PASSENGERS — Penumpang per booking (termasuk kolom fase8 & fase29)
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_passengers (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  is_main_passenger BOOLEAN DEFAULT FALSE,
  passenger_type    TEXT DEFAULT 'dewasa'
    CHECK (passenger_type IN ('dewasa','lansia','anak','mahram')),
  room_preference   TEXT,
  room_number       TEXT,
  room_group_id     UUID,
  family_group_id   UUID,
  checkin_status    TEXT DEFAULT 'not_checked',
  checkin_time      TIMESTAMPTZ,
  checkin_notes     TEXT,
  price_override    NUMERIC(15,2),
  price_category    TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_passengers_booking_id   ON booking_passengers(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_passengers_customer_id  ON booking_passengers(customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_passengers_family_group ON booking_passengers(family_group_id) WHERE family_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_passengers_room_group   ON booking_passengers(room_group_id) WHERE room_group_id IS NOT NULL;

ALTER TABLE booking_passengers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_passengers_admin_manage" ON booking_passengers;
DROP POLICY IF EXISTS "booking_passengers_own_read"     ON booking_passengers;

CREATE POLICY "booking_passengers_admin_manage" ON booking_passengers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','finance','sales')
    )
  );

CREATE POLICY "booking_passengers_own_read" ON booking_passengers
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );


-- =============================================================================
-- 6. BOOKING_STATUS_HISTORY — Riwayat perubahan status booking
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_status_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking_id ON booking_status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_created_at ON booking_status_history(created_at DESC);

ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_booking_status_history" ON booking_status_history;
DROP POLICY IF EXISTS "auth_read_booking_status_history"    ON booking_status_history;

CREATE POLICY "staff_manage_booking_status_history" ON booking_status_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','finance','sales')
    )
  );

CREATE POLICY "auth_read_booking_status_history" ON booking_status_history
  FOR SELECT TO authenticated USING (true);


-- =============================================================================
-- 7. BOOKING_DOCUMENT_LOGS — Log dokumen yang dibuat per booking
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_document_logs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  doc_type     TEXT NOT NULL,
  doc_label    TEXT,
  file_url     TEXT,
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_booking_doc_logs_booking_id   ON booking_document_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_doc_logs_customer_id  ON booking_document_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_doc_logs_generated_at ON booking_document_logs(generated_at DESC);

ALTER TABLE booking_document_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_booking_doc_logs" ON booking_document_logs;
DROP POLICY IF EXISTS "customer_read_own_doc_logs"    ON booking_document_logs;

CREATE POLICY "staff_manage_booking_doc_logs" ON booking_document_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','finance')
    )
  );

CREATE POLICY "customer_read_own_doc_logs" ON booking_document_logs
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );


-- =============================================================================
-- 8. BOOKING_LINE_ITEMS — Rincian harga per item per booking (fase27)
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_line_items (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  passenger_id UUID,
  item_type    TEXT NOT NULL DEFAULT 'service',
  description  TEXT NOT NULL DEFAULT '',
  quantity     NUMERIC NOT NULL DEFAULT 1,
  unit_price   NUMERIC NOT NULL DEFAULT 0,
  total_price  NUMERIC NOT NULL DEFAULT 0,
  reference_id UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_line_items_booking_id   ON booking_line_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_line_items_passenger_id ON booking_line_items(passenger_id);

ALTER TABLE booking_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_manage_booking_line_items" ON booking_line_items;
CREATE POLICY "authenticated_manage_booking_line_items" ON booking_line_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- =============================================================================
-- 9. ROOM_ASSIGNMENTS — Penugasan kamar hotel
-- =============================================================================
CREATE TABLE IF NOT EXISTS room_assignments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID REFERENCES departures(id) ON DELETE CASCADE,
  room_number    TEXT NOT NULL,
  room_type      TEXT NOT NULL DEFAULT 'quad'
    CHECK (room_type IN ('double','triple','quad')),
  floor          INTEGER,
  capacity       INTEGER DEFAULT 4,
  hotel_name     TEXT,
  hotel_location TEXT DEFAULT 'mecca'
    CHECK (hotel_location IN ('mecca','medina')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_assignments_departure_id ON room_assignments(departure_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_room_type    ON room_assignments(room_type);

ALTER TABLE room_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "room_assignments_staff_manage" ON room_assignments;
CREATE POLICY "room_assignments_staff_manage" ON room_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_room_assignments_updated_at'
    AND tgrelid='room_assignments'::regclass) THEN
    CREATE TRIGGER set_room_assignments_updated_at
      BEFORE UPDATE ON room_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 10. EQUIPMENT_DISTRIBUTIONS — Distribusi perlengkapan jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS equipment_distributions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id    UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  departure_id   UUID REFERENCES departures(id) ON DELETE SET NULL,
  item_name      TEXT NOT NULL,
  quantity       INTEGER DEFAULT 1,
  distributed_at TIMESTAMPTZ DEFAULT NOW(),
  distributed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equip_dist_customer_id  ON equipment_distributions(customer_id);
CREATE INDEX IF NOT EXISTS idx_equip_dist_departure_id ON equipment_distributions(departure_id);

ALTER TABLE equipment_distributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equip_dist_staff_manage" ON equipment_distributions;
DROP POLICY IF EXISTS "equip_dist_own_read"     ON equipment_distributions;

CREATE POLICY "equip_dist_staff_manage" ON equipment_distributions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE POLICY "equip_dist_own_read" ON equipment_distributions
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );


-- =============================================================================
-- 11. SAVINGS_PLANS — Program tabungan perjalanan
-- =============================================================================
CREATE TABLE IF NOT EXISTS savings_plans (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id    UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name           TEXT NOT NULL DEFAULT 'Tabungan Umroh',
  target_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  target_date    DATE,
  status         TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','cancelled')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_plans_customer_id ON savings_plans(customer_id);
CREATE INDEX IF NOT EXISTS idx_savings_plans_status      ON savings_plans(status);

ALTER TABLE savings_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "savings_plans_admin_manage" ON savings_plans;
DROP POLICY IF EXISTS "savings_plans_own_manage"   ON savings_plans;

CREATE POLICY "savings_plans_admin_manage" ON savings_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance')
    )
  );

CREATE POLICY "savings_plans_own_manage" ON savings_plans
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_savings_plans_updated_at'
    AND tgrelid='savings_plans'::regclass) THEN
    CREATE TRIGGER set_savings_plans_updated_at
      BEFORE UPDATE ON savings_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 12. SAVINGS_DEPOSITS — Setoran tabungan
-- =============================================================================
CREATE TABLE IF NOT EXISTS savings_deposits (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id      UUID NOT NULL REFERENCES savings_plans(id) ON DELETE CASCADE,
  amount       NUMERIC(15,2) NOT NULL,
  deposit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_deposits_plan_id ON savings_deposits(plan_id);

ALTER TABLE savings_deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "savings_deposits_admin_manage" ON savings_deposits;
DROP POLICY IF EXISTS "savings_deposits_own_read"     ON savings_deposits;

CREATE POLICY "savings_deposits_admin_manage" ON savings_deposits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance')
    )
  );

CREATE POLICY "savings_deposits_own_read" ON savings_deposits
  FOR SELECT USING (
    plan_id IN (
      SELECT sp.id FROM savings_plans sp
      JOIN customers c ON c.id = sp.customer_id
      WHERE c.user_id = auth.uid()
    )
  );


-- =============================================================================
-- 13. LEADS — Data calon jamaah/prospek
-- =============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  email            TEXT,
  source           TEXT DEFAULT 'direct'
    CHECK (source IN ('direct','whatsapp','instagram','facebook','referral','website','lainnya')),
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  agent_id         UUID REFERENCES agents(id) ON DELETE SET NULL,
  status           TEXT DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','converted','lost')),
  notes            TEXT,
  package_interest TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON leads(branch_id);
CREATE INDEX IF NOT EXISTS idx_leads_agent_id  ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_status    ON leads(status);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_staff_manage"     ON leads;
DROP POLICY IF EXISTS "leads_agent_own_manage" ON leads;

CREATE POLICY "leads_staff_manage" ON leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','sales','marketing')
    )
  );

CREATE POLICY "leads_agent_own_manage" ON leads
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_leads_updated_at'
    AND tgrelid='leads'::regclass) THEN
    CREATE TRIGGER set_leads_updated_at
      BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 14. PAYMENT_DEADLINE_REMINDERS — Reminder jatuh tempo pembayaran (fase30)
-- =============================================================================
CREATE TABLE IF NOT EXISTS payment_deadline_reminders (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  booking_code     TEXT NOT NULL,
  phone            TEXT NOT NULL,
  full_name        TEXT,
  payment_deadline DATE,
  remaining_amount NUMERIC(15,2),
  days_before      INTEGER NOT NULL DEFAULT 7,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','cancelled')),
  sent_at          TIMESTAMPTZ,
  error_message    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (booking_id, days_before)
);

CREATE INDEX IF NOT EXISTS idx_pdr_booking_id   ON payment_deadline_reminders(booking_id);
CREATE INDEX IF NOT EXISTS idx_pdr_status       ON payment_deadline_reminders(status);
CREATE INDEX IF NOT EXISTS idx_pdr_booking_days ON payment_deadline_reminders(booking_id, days_before);

ALTER TABLE payment_deadline_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_payment_reminders" ON payment_deadline_reminders;
CREATE POLICY "staff_manage_payment_reminders" ON payment_deadline_reminders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','operational','finance','it')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_pdr_updated_at'
    AND tgrelid='payment_deadline_reminders'::regclass) THEN
    CREATE TRIGGER set_pdr_updated_at
      BEFORE UPDATE ON payment_deadline_reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 15. INVOICE_TEMPLATES — Template faktur (termasuk kolom QR fase26)
-- =============================================================================
CREATE TABLE IF NOT EXISTS invoice_templates (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  header_text      TEXT,
  footer_text      TEXT,
  logo_url         TEXT,
  signature_url    TEXT,
  is_default       BOOLEAN DEFAULT FALSE,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  show_qr_code     BOOLEAN NOT NULL DEFAULT TRUE,
  qr_placement     TEXT NOT NULL DEFAULT 'bottom-right',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_invoice_templates" ON invoice_templates;
DROP POLICY IF EXISTS "staff_read_invoice_templates"   ON invoice_templates;

CREATE POLICY "staff_manage_invoice_templates" ON invoice_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance')
    )
  );

CREATE POLICY "staff_read_invoice_templates" ON invoice_templates
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_invoice_templates_updated_at'
    AND tgrelid='invoice_templates'::regclass) THEN
    CREATE TRIGGER set_invoice_templates_updated_at
      BEFORE UPDATE ON invoice_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- SELESAI — File 03: Customers, Bookings & Payments
-- =============================================================================
SELECT 'File 03 — Customers, Bookings & Payments: OK' AS result;

-- ============================================================
-- 04_operations_portal.sql
-- ============================================================
-- =============================================================================
-- FILE 04 — Operations & Customer Portal
-- Meliputi: customer portal, notifikasi, WhatsApp, SOS, Visa,
--           approval, jamaah digital, membership, email
-- Jalankan setelah 03_customers_bookings.sql
-- =============================================================================

-- =============================================================================
-- 1. CUSTOMER_ACCOUNTS — Akun portal jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_accounts (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  customer_id           UUID REFERENCES customers(id) ON DELETE SET NULL,
  referred_by_agent_id  UUID REFERENCES agents(id) ON DELETE SET NULL,
  referred_by_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  agent_slug            TEXT,
  branch_slug           TEXT,
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_accounts_user_id     ON customer_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_customer_id ON customer_accounts(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_agent_id    ON customer_accounts(referred_by_agent_id);

ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_accounts_own" ON customer_accounts;
CREATE POLICY "customer_accounts_own" ON customer_accounts
  FOR ALL USING (auth.uid() = user_id);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_customer_accounts_updated_at'
    AND tgrelid='customer_accounts'::regclass) THEN
    CREATE TRIGGER set_customer_accounts_updated_at
      BEFORE UPDATE ON customer_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 2. CUSTOMER_NOTIFICATIONS — Notifikasi per jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT,
  type        TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','error','urgent')),
  link        TEXT,
  icon        TEXT,
  is_read     BOOLEAN DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notif_customer_id ON customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notif_is_read     ON customer_notifications(is_read);

ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_notif_own"        ON customer_notifications;
DROP POLICY IF EXISTS "customer_notif_update"     ON customer_notifications;
DROP POLICY IF EXISTS "staff_manage_notifications" ON customer_notifications;

CREATE POLICY "customer_notif_own" ON customer_notifications
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "customer_notif_update" ON customer_notifications
  FOR UPDATE USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "staff_manage_notifications" ON customer_notifications
  FOR ALL USING (auth.role() = 'authenticated');


-- =============================================================================
-- 3. BOOKING_FEEDBACK — Ulasan & rating booking
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID REFERENCES bookings(id) ON DELETE CASCADE UNIQUE NOT NULL,
  customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE NOT NULL,
  rating       INTEGER CHECK (rating BETWEEN 1 AND 5),
  review       TEXT,
  aspects      JSONB DEFAULT '{}',
  is_published BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now(),
  updated_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_feedback_booking_id  ON booking_feedback(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_feedback_customer_id ON booking_feedback(customer_id);

ALTER TABLE booking_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_feedback_own"   ON booking_feedback;
DROP POLICY IF EXISTS "admin_read_feedback"    ON booking_feedback;

CREATE POLICY "booking_feedback_own" ON booking_feedback
  FOR ALL USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "admin_read_feedback" ON booking_feedback
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','marketing'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_booking_feedback_updated_at'
    AND tgrelid='booking_feedback'::regclass) THEN
    CREATE TRIGGER set_booking_feedback_updated_at
      BEFORE UPDATE ON booking_feedback FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 4. EMAIL_TEMPLATES — Template email
-- =============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  subject    TEXT NOT NULL,
  body       TEXT NOT NULL,
  variables  TEXT[] DEFAULT '{}',
  trigger    TEXT DEFAULT 'manual',
  is_active  BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_email_templates"   ON email_templates;
DROP POLICY IF EXISTS "staff_manage_email_templates" ON email_templates;

CREATE POLICY "staff_read_email_templates" ON email_templates
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "staff_manage_email_templates" ON email_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','branch_manager','marketing'))
  );


-- =============================================================================
-- 5. EMAIL_LOGS — Log pengiriman email
-- =============================================================================
CREATE TABLE IF NOT EXISTS email_logs (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_code   TEXT,
  recipient_email TEXT NOT NULL,
  recipient_name  TEXT,
  subject         TEXT,
  status          TEXT DEFAULT 'pending',
  error_message   TEXT,
  sent_at         TIMESTAMPTZ,
  booking_id      UUID REFERENCES bookings(id)  ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_customer_id ON email_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status      ON email_logs(status);

ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_email_logs"   ON email_logs;
DROP POLICY IF EXISTS "staff_insert_email_logs" ON email_logs;

CREATE POLICY "staff_read_email_logs"   ON email_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "staff_insert_email_logs" ON email_logs
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- =============================================================================
-- 6. NOTIFICATIONS — Notifikasi sistem ke user
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  type        TEXT DEFAULT 'info'
    CHECK (type IN ('info','success','warning','error','urgent')),
  target_role TEXT,
  branch_id   UUID REFERENCES branches(id) ON DELETE SET NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  link        TEXT,
  icon        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_own_manage" ON notifications;
DROP POLICY IF EXISTS "notifications_admin_send" ON notifications;

CREATE POLICY "notifications_own_manage" ON notifications
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "notifications_admin_send" ON notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );


-- =============================================================================
-- 7. SUPPORT_TICKETS — Tiket dukungan jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','in_progress','resolved','closed')),
  priority    TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','urgent')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status      ON support_tickets(status);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "support_tickets_staff_manage" ON support_tickets;
DROP POLICY IF EXISTS "support_tickets_own_manage"   ON support_tickets;

CREATE POLICY "support_tickets_staff_manage" ON support_tickets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );

CREATE POLICY "support_tickets_own_manage" ON support_tickets
  FOR ALL USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_support_tickets_updated_at'
    AND tgrelid='support_tickets'::regclass) THEN
    CREATE TRIGGER set_support_tickets_updated_at
      BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 8. ANNOUNCEMENTS — Pengumuman internal
-- =============================================================================
CREATE TABLE IF NOT EXISTS announcements (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  type         TEXT DEFAULT 'info'
    CHECK (type IN ('info','warning','success','urgent')),
  target_roles TEXT[] DEFAULT '{}',
  branch_id    UUID REFERENCES branches(id) ON DELETE SET NULL,
  is_active    BOOLEAN DEFAULT TRUE,
  starts_at    TIMESTAMPTZ DEFAULT NOW(),
  ends_at      TIMESTAMPTZ,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_branch_id ON announcements(branch_id);
CREATE INDEX IF NOT EXISTS idx_announcements_is_active ON announcements(is_active);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "announcements_admin_manage" ON announcements;
DROP POLICY IF EXISTS "announcements_staff_read"   ON announcements;

CREATE POLICY "announcements_admin_manage" ON announcements
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

CREATE POLICY "announcements_staff_read" ON announcements
  FOR SELECT USING (is_active = TRUE AND auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_announcements_updated_at'
    AND tgrelid='announcements'::regclass) THEN
    CREATE TRIGGER set_announcements_updated_at
      BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 9. BANNERS — Banner promosi website
-- =============================================================================
CREATE TABLE IF NOT EXISTS banners (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title      TEXT NOT NULL,
  subtitle   TEXT,
  image_url  TEXT,
  link_url   TEXT,
  link_text  TEXT,
  position   TEXT DEFAULT 'home'
    CHECK (position IN ('home','packages','about','contact')),
  is_active  BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  branch_id  UUID REFERENCES branches(id) ON DELETE SET NULL,
  starts_at  TIMESTAMPTZ,
  ends_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_banners_position  ON banners(position);
CREATE INDEX IF NOT EXISTS idx_banners_is_active ON banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_branch_id ON banners(branch_id);

ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "banners_admin_manage" ON banners;
DROP POLICY IF EXISTS "banners_public_read"  ON banners;

CREATE POLICY "banners_admin_manage" ON banners
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','marketing'))
  );

CREATE POLICY "banners_public_read" ON banners
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_banners_updated_at'
    AND tgrelid='banners'::regclass) THEN
    CREATE TRIGGER set_banners_updated_at
      BEFORE UPDATE ON banners FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 10. COUPONS — Kupon diskon
-- =============================================================================
CREATE TABLE IF NOT EXISTS coupons (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  discount_type  TEXT NOT NULL DEFAULT 'percentage'
    CHECK (discount_type IN ('percentage','fixed')),
  discount_value NUMERIC(15,2) NOT NULL,
  min_purchase   NUMERIC(15,2) DEFAULT 0,
  max_discount   NUMERIC(15,2),
  quota          INTEGER,
  used_count     INTEGER DEFAULT 0,
  is_active      BOOLEAN DEFAULT TRUE,
  starts_at      TIMESTAMPTZ,
  ends_at        TIMESTAMPTZ,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coupons_code      ON coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_is_active ON coupons(is_active);

ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coupons_admin_manage" ON coupons;
DROP POLICY IF EXISTS "coupons_public_read"  ON coupons;

CREATE POLICY "coupons_admin_manage" ON coupons
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','marketing'))
  );

CREATE POLICY "coupons_public_read" ON coupons
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_coupons_updated_at'
    AND tgrelid='coupons'::regclass) THEN
    CREATE TRIGGER set_coupons_updated_at
      BEFORE UPDATE ON coupons FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 11. VISA_APPLICATIONS — Permohonan visa jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS visa_applications (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id      UUID REFERENCES bookings(id) ON DELETE SET NULL,
  visa_type       TEXT NOT NULL DEFAULT 'umroh'
    CHECK (visa_type IN ('umroh','haji','visit')),
  status          TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','approved','rejected','cancelled')),
  submitted_at    TIMESTAMPTZ,
  approved_at     TIMESTAMPTZ,
  rejected_at     TIMESTAMPTZ,
  expiry_date     DATE,
  visa_number     TEXT,
  rejection_notes TEXT,
  notes           TEXT,
  processed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visa_applications_customer_id ON visa_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_visa_applications_booking_id  ON visa_applications(booking_id);
CREATE INDEX IF NOT EXISTS idx_visa_applications_status      ON visa_applications(status);

ALTER TABLE visa_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_visa_applications" ON visa_applications;
DROP POLICY IF EXISTS "customer_view_own_visas"        ON visa_applications;

CREATE POLICY "staff_manage_visa_applications" ON visa_applications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational','visa_officer'))
  );

CREATE POLICY "customer_view_own_visas" ON visa_applications
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_visa_applications_updated_at'
    AND tgrelid='visa_applications'::regclass) THEN
    CREATE TRIGGER set_visa_applications_updated_at
      BEFORE UPDATE ON visa_applications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 12. SOS_ALERTS — Darurat jamaah (termasuk kolom fase17)
-- =============================================================================
CREATE TABLE IF NOT EXISTS sos_alerts (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id          UUID REFERENCES customers(id) ON DELETE SET NULL,
  booking_code         TEXT,
  emergency_type       TEXT NOT NULL
    CHECK (emergency_type IN ('medical','lost','security','other')),
  message              TEXT,
  latitude             FLOAT8,
  longitude            FLOAT8,
  accuracy             FLOAT8,
  status               TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','responding','resolved')),
  response_notes       TEXT,
  resolved_at          TIMESTAMPTZ,
  resolved_by          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id            UUID REFERENCES branches(id) ON DELETE SET NULL,
  assigned_muthawif_id UUID REFERENCES muthawifs(id) ON DELETE SET NULL,
  responded_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sos_alerts_status      ON sos_alerts(status);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_customer_id ON sos_alerts(customer_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_branch_id   ON sos_alerts(branch_id);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_created_at  ON sos_alerts(created_at DESC);

ALTER TABLE sos_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_insert_sos"   ON sos_alerts;
DROP POLICY IF EXISTS "customer_read_own_sos" ON sos_alerts;
DROP POLICY IF EXISTS "staff_manage_sos"      ON sos_alerts;

CREATE POLICY "customer_insert_sos" ON sos_alerts
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "customer_read_own_sos" ON sos_alerts
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid())
  );

CREATE POLICY "staff_manage_sos" ON sos_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','operational'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_sos_alerts_updated_at'
    AND tgrelid='sos_alerts'::regclass) THEN
    CREATE TRIGGER set_sos_alerts_updated_at
      BEFORE UPDATE ON sos_alerts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 13. WHATSAPP_CONFIG — Konfigurasi provider WA (termasuk kolom fase31)
-- =============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_config (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider        TEXT NOT NULL DEFAULT 'fonnte'
    CHECK (provider IN ('fonnte','wablas','wapanels','maytapi','other')),
  api_key         TEXT,
  sender_number   TEXT,
  is_active       BOOLEAN DEFAULT TRUE,
  display_name    TEXT,
  provider_config JSONB NOT NULL DEFAULT '{}',
  webhook_secret  TEXT,
  updated_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  last_tested_at  TIMESTAMPTZ,
  last_test_ok    BOOLEAN,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE whatsapp_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_config_read_all"         ON whatsapp_config;
DROP POLICY IF EXISTS "wa_config_write_privileged"  ON whatsapp_config;

CREATE POLICY "wa_config_read_all" ON whatsapp_config
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "wa_config_write_privileged" ON whatsapp_config
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','it'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_whatsapp_config_updated_at'
    AND tgrelid='whatsapp_config'::regclass) THEN
    CREATE TRIGGER set_whatsapp_config_updated_at
      BEFORE UPDATE ON whatsapp_config FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 14. WHATSAPP_TEMPLATES — Template pesan WhatsApp
-- =============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT NOT NULL,
  code         TEXT NOT NULL UNIQUE,
  message      TEXT NOT NULL,
  variables    TEXT[] DEFAULT '{}',
  category     TEXT DEFAULT 'general'
    CHECK (category IN ('general','booking','payment','reminder','promo','other')),
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_templates_code      ON whatsapp_templates(code);
CREATE INDEX IF NOT EXISTS idx_wa_templates_is_active ON whatsapp_templates(is_active);

ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_wa_templates" ON whatsapp_templates;
DROP POLICY IF EXISTS "staff_read_wa_templates"   ON whatsapp_templates;

CREATE POLICY "staff_manage_wa_templates" ON whatsapp_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','operational','marketing'))
  );

CREATE POLICY "staff_read_wa_templates" ON whatsapp_templates
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_wa_templates_updated_at'
    AND tgrelid='whatsapp_templates'::regclass) THEN
    CREATE TRIGGER set_wa_templates_updated_at
      BEFORE UPDATE ON whatsapp_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 15. WHATSAPP_LOGS — Log pengiriman WA
-- =============================================================================
CREATE TABLE IF NOT EXISTS whatsapp_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id   UUID REFERENCES customers(id) ON DELETE SET NULL,
  phone         TEXT NOT NULL,
  message       TEXT NOT NULL,
  template_code TEXT,
  status        TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','sent','failed','delivered')),
  error_message TEXT,
  sent_at       TIMESTAMPTZ,
  provider      TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_logs_booking_id  ON whatsapp_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_customer_id ON whatsapp_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_wa_logs_status      ON whatsapp_logs(status);
CREATE INDEX IF NOT EXISTS idx_wa_logs_created_at  ON whatsapp_logs(created_at DESC);

ALTER TABLE whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_wa_logs" ON whatsapp_logs;
CREATE POLICY "staff_manage_wa_logs" ON whatsapp_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','operational','marketing','it'))
  );


-- =============================================================================
-- 16. WA_BROADCAST_CAMPAIGNS — Kampanye broadcast WA tersegmentasi (fase32)
-- =============================================================================
CREATE TABLE IF NOT EXISTS wa_broadcast_campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  segment_filters  JSONB NOT NULL DEFAULT '{}',
  message_template TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','sending','done','cancelled')),
  scheduled_at     TIMESTAMPTZ,
  sent_at          TIMESTAMPTZ,
  total_recipients INT,
  success_count    INT NOT NULL DEFAULT 0,
  fail_count       INT NOT NULL DEFAULT 0,
  created_by       UUID REFERENCES auth.users(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_broadcast_campaigns_status ON wa_broadcast_campaigns(status);

ALTER TABLE wa_broadcast_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_broadcast_campaigns_select" ON wa_broadcast_campaigns;
DROP POLICY IF EXISTS "wa_broadcast_campaigns_write"  ON wa_broadcast_campaigns;

CREATE POLICY "wa_broadcast_campaigns_select" ON wa_broadcast_campaigns
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','it','operational','marketing','sales'))
  );

CREATE POLICY "wa_broadcast_campaigns_write" ON wa_broadcast_campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','it','operational','marketing'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_wa_broadcast_campaigns_updated_at'
    AND tgrelid='wa_broadcast_campaigns'::regclass) THEN
    CREATE TRIGGER set_wa_broadcast_campaigns_updated_at
      BEFORE UPDATE ON wa_broadcast_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 17. WA_BROADCAST_LOGS — Log per penerima broadcast
-- =============================================================================
CREATE TABLE IF NOT EXISTS wa_broadcast_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES wa_broadcast_campaigns(id) ON DELETE CASCADE,
  booking_id  UUID REFERENCES bookings(id),
  phone       TEXT,
  message     TEXT,
  status      TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued','sent','failed')),
  sent_at     TIMESTAMPTZ,
  error_msg   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_broadcast_logs_campaign ON wa_broadcast_logs(campaign_id);

ALTER TABLE wa_broadcast_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_broadcast_logs_select" ON wa_broadcast_logs;
DROP POLICY IF EXISTS "wa_broadcast_logs_insert" ON wa_broadcast_logs;

CREATE POLICY "wa_broadcast_logs_select" ON wa_broadcast_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','it','operational','marketing','sales'))
  );

CREATE POLICY "wa_broadcast_logs_insert" ON wa_broadcast_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','it','operational','marketing'))
  );


-- =============================================================================
-- 18. WA_FEATURE_ROADMAP — Roadmap fitur WhatsApp (fase31)
-- =============================================================================
CREATE TABLE IF NOT EXISTS wa_feature_roadmap (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase       INTEGER NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'planned'
    CHECK (status IN ('done','in_progress','planned','cancelled')),
  target_date DATE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wa_feature_roadmap ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_roadmap_read"  ON wa_feature_roadmap;
DROP POLICY IF EXISTS "wa_roadmap_write" ON wa_feature_roadmap;

CREATE POLICY "wa_roadmap_read" ON wa_feature_roadmap
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "wa_roadmap_write" ON wa_feature_roadmap
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','it')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','it')));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_wa_feature_roadmap_updated_at'
    AND tgrelid='wa_feature_roadmap'::regclass) THEN
    CREATE TRIGGER set_wa_feature_roadmap_updated_at
      BEFORE UPDATE ON wa_feature_roadmap FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 19. APP_SETTINGS — Setting key-value sistem
-- =============================================================================
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_settings_admin" ON app_settings;
CREATE POLICY "app_settings_admin" ON app_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );


-- =============================================================================
-- 20. VIRTUAL_ACCOUNTS — Nomor VA per customer
-- =============================================================================
CREATE TABLE IF NOT EXISTS virtual_accounts (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bank_code   TEXT NOT NULL,
  va_number   TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE (customer_id, bank_code)
);

CREATE INDEX IF NOT EXISTS va_customer_idx ON virtual_accounts(customer_id);

ALTER TABLE virtual_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "va_admin"        ON virtual_accounts;
DROP POLICY IF EXISTS "va_customer_read" ON virtual_accounts;

CREATE POLICY "va_admin" ON virtual_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','finance'))
  );

CREATE POLICY "va_customer_read" ON virtual_accounts
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));


-- =============================================================================
-- 21. AGENT_MONTHLY_TARGETS — Target bulanan agen
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_monthly_targets (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id          UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  month_key         TEXT NOT NULL,
  booking_target    INT NOT NULL DEFAULT 10,
  commission_target BIGINT NOT NULL DEFAULT 10000000,
  jamaah_target     INT NOT NULL DEFAULT 10,
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (agent_id, month_key)
);

CREATE INDEX IF NOT EXISTS amt_agent_month_idx ON agent_monthly_targets(agent_id, month_key);

ALTER TABLE agent_monthly_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "amt_agent_own" ON agent_monthly_targets;
CREATE POLICY "amt_agent_own" ON agent_monthly_targets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM agents WHERE id = agent_id AND user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );


-- =============================================================================
-- 22. JAMAAH DIGITAL — Doa, Jurnal, Ibadah, Badge
-- =============================================================================
CREATE TABLE IF NOT EXISTS jamaah_doa_sessions (
  id           TEXT PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dzikir_id    TEXT NOT NULL,
  dzikir_name  TEXT NOT NULL,
  dzikir_arab  TEXT,
  dzikir_latin TEXT,
  icon         TEXT,
  target       INT NOT NULL DEFAULT 33,
  count        INT NOT NULL DEFAULT 0,
  completed    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jds_user_idx ON jamaah_doa_sessions(user_id);

ALTER TABLE jamaah_doa_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jds_own" ON jamaah_doa_sessions;
CREATE POLICY "jds_own" ON jamaah_doa_sessions FOR ALL USING (user_id = auth.uid());


CREATE TABLE IF NOT EXISTS jamaah_jurnal (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  mood       TEXT,
  location   TEXT,
  tags       TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jj_user_idx  ON jamaah_jurnal(user_id);
CREATE INDEX IF NOT EXISTS jj_date_idx  ON jamaah_jurnal(user_id, date);

ALTER TABLE jamaah_jurnal ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jj_own" ON jamaah_jurnal;
CREATE POLICY "jj_own" ON jamaah_jurnal FOR ALL USING (user_id = auth.uid());


CREATE TABLE IF NOT EXISTS jamaah_ibadah_targets (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  icon         TEXT,
  unit         TEXT NOT NULL DEFAULT 'kali',
  daily_target INT NOT NULL DEFAULT 1,
  category     TEXT,
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jit_user_idx ON jamaah_ibadah_targets(user_id);

ALTER TABLE jamaah_ibadah_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jit_own" ON jamaah_ibadah_targets;
CREATE POLICY "jit_own" ON jamaah_ibadah_targets FOR ALL USING (user_id = auth.uid());


CREATE TABLE IF NOT EXISTS jamaah_ibadah_logs (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id  UUID NOT NULL REFERENCES jamaah_ibadah_targets(id) ON DELETE CASCADE,
  log_date   DATE NOT NULL,
  count      INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (target_id, log_date)
);

CREATE INDEX IF NOT EXISTS jil_user_date_idx ON jamaah_ibadah_logs(user_id, log_date);

ALTER TABLE jamaah_ibadah_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jil_own" ON jamaah_ibadah_logs;
CREATE POLICY "jil_own" ON jamaah_ibadah_logs FOR ALL USING (user_id = auth.uid());


CREATE TABLE IF NOT EXISTS jamaah_badges (
  id        UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id  TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS jb_user_idx ON jamaah_badges(user_id);

ALTER TABLE jamaah_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "jb_own" ON jamaah_badges;
CREATE POLICY "jb_own" ON jamaah_badges FOR ALL USING (user_id = auth.uid());


-- =============================================================================
-- 23. APPROVAL_REQUESTS & APPROVAL_ACTIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS approval_requests (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type          TEXT NOT NULL
    CHECK (type IN ('refund','discount','cancellation','vendor_invoice')),
  reference_id  UUID,
  amount        NUMERIC(15,2),
  percentage    NUMERIC(5,2),
  requested_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  current_level SMALLINT NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  notes         TEXT,
  branch_id     UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type   ON approval_requests(type);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_approval_requests" ON approval_requests;
CREATE POLICY "staff_manage_approval_requests" ON approval_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','finance'))
    OR requested_by = auth.uid()
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_approval_requests_updated_at'
    AND tgrelid='approval_requests'::regclass) THEN
    CREATE TRIGGER set_approval_requests_updated_at
      BEFORE UPDATE ON approval_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


CREATE TABLE IF NOT EXISTS approval_actions (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id  UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  level       SMALLINT NOT NULL,
  action      TEXT NOT NULL CHECK (action IN ('approved','rejected')),
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_actions_request_id ON approval_actions(request_id);

ALTER TABLE approval_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_approval_actions" ON approval_actions;
CREATE POLICY "staff_manage_approval_actions" ON approval_actions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','finance'))
  );


-- =============================================================================
-- 24. NOTIFICATION_TEMPLATES — Template notifikasi multi-channel
-- =============================================================================
CREATE TABLE IF NOT EXISTS notification_templates (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code           TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL,
  channel        TEXT NOT NULL DEFAULT 'push'
    CHECK (channel IN ('push','whatsapp','email','sms','in_app')),
  title          TEXT,
  body           TEXT NOT NULL,
  variables      TEXT[] DEFAULT '{}',
  trigger_event  TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_templates_code    ON notification_templates(code);
CREATE INDEX IF NOT EXISTS idx_notif_templates_channel ON notification_templates(channel);
CREATE INDEX IF NOT EXISTS idx_notif_templates_active  ON notification_templates(is_active);

ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_notif_templates" ON notification_templates;
DROP POLICY IF EXISTS "staff_read_notif_templates"   ON notification_templates;

CREATE POLICY "admin_manage_notif_templates" ON notification_templates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "staff_read_notif_templates" ON notification_templates
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_notification_templates_updated_at'
    AND tgrelid='notification_templates'::regclass) THEN
    CREATE TRIGGER set_notification_templates_updated_at
      BEFORE UPDATE ON notification_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Seed: template notifikasi default
INSERT INTO notification_templates (code, name, channel, title, body, variables, trigger_event) VALUES
  ('booking_confirmed',   'Booking Dikonfirmasi',    'push',   'Booking Dikonfirmasi ✅',      'Booking {{booking_code}} Anda telah dikonfirmasi.', ARRAY['booking_code'], 'booking.confirmed'),
  ('payment_received',    'Pembayaran Diterima',     'push',   'Pembayaran Diterima 💰',       'Kami telah menerima pembayaran Anda sebesar Rp {{amount}}.', ARRAY['amount'], 'payment.received'),
  ('visa_status_changed', 'Status Visa Berubah',     'push',   'Update Status Visa 🛂',        'Status visa Anda berubah menjadi: {{status}}.', ARRAY['status'], 'visa.status_changed'),
  ('sos_received',        'SOS Diterima',            'in_app', 'SOS ALERT 🆘',                 'Alert darurat dari jamaah {{customer_name}}: {{message}}', ARRAY['customer_name','message'], 'sos.received'),
  ('departure_reminder',  'Pengingat Keberangkatan', 'push',   'Pengingat Keberangkatan ✈️',  'Keberangkatan Anda {{days}} hari lagi. Pastikan dokumen sudah lengkap.', ARRAY['days'], 'departure.reminder'),
  ('approval_needed',     'Persetujuan Dibutuhkan',  'in_app', 'Menunggu Persetujuan Anda',    'Ada {{type}} senilai Rp {{amount}} yang membutuhkan persetujuan Anda.', ARRAY['type','amount'], 'approval.created'),
  ('manasik_reminder',    'Pengingat Manasik',       'push',   'Jadwal Manasik Besok 📿',      'Jangan lupa manasik besok: {{title}} pukul {{time}} di {{location}}.', ARRAY['title','time','location'], 'manasik.reminder')
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- SELESAI — File 04: Operations & Customer Portal
-- =============================================================================
SELECT 'File 04 — Operations & Customer Portal: OK' AS result;

-- ============================================================
-- 05_finance_hr_company.sql
-- ============================================================
-- =============================================================================
-- FILE 05 — Finance, HR, Training & Company Settings
-- Meliputi: payroll, cuti, kinerja, pemasaran, dashboard, pelatihan,
--           vendor, perlengkapan, media, pengaturan perusahaan,
--           departure financials, membership, approval configs
-- Jalankan setelah 04_operations_portal.sql
-- =============================================================================

-- =============================================================================
-- 1. PAYROLL_RECORDS — Data penggajian karyawan
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_year       INTEGER NOT NULL,
  period_month      INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  basic_salary      NUMERIC(15,2) NOT NULL DEFAULT 0,
  allowances        NUMERIC(15,2) NOT NULL DEFAULT 0,
  overtime_pay      NUMERIC(15,2) NOT NULL DEFAULT 0,
  bonus             NUMERIC(15,2) NOT NULL DEFAULT 0,
  deductions        NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_kes_employee NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_kes_employer NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_tk_employee  NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_tk_employer  NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_pph21         NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_salary        NUMERIC(15,2) NOT NULL DEFAULT 0,
  working_days      INTEGER DEFAULT 0,
  present_days      INTEGER DEFAULT 0,
  absent_days       INTEGER DEFAULT 0,
  late_days         INTEGER DEFAULT 0,
  overtime_hours    NUMERIC(5,2)  DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','approved','paid')),
  notes             TEXT,
  paid_at           TIMESTAMPTZ,
  approved_by       UUID REFERENCES auth.users(id),
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period      ON payroll_records(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_status      ON payroll_records(status);

ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_can_manage_payroll" ON payroll_records;
CREATE POLICY "hr_can_manage_payroll" ON payroll_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','branch_manager','finance'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_payroll_records_updated_at'
    AND tgrelid='payroll_records'::regclass) THEN
    CREATE TRIGGER set_payroll_records_updated_at
      BEFORE UPDATE ON payroll_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 2. LEAVE_REQUESTS — Permohonan cuti karyawan
-- =============================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type       TEXT NOT NULL DEFAULT 'annual'
    CHECK (leave_type IN ('annual','sick','maternity','paternity','emergency','unpaid','other')),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  total_days       INTEGER GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
  reason           TEXT NOT NULL,
  attachment_url   TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by      UUID REFERENCES auth.users(id),
  approved_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_status      ON leave_requests(status);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_can_view_own_leaves"  ON leave_requests;
DROP POLICY IF EXISTS "employee_can_create_leave"     ON leave_requests;
DROP POLICY IF EXISTS "hr_can_manage_leaves"          ON leave_requests;

CREATE POLICY "employee_can_view_own_leaves" ON leave_requests
  FOR SELECT USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "employee_can_create_leave" ON leave_requests
  FOR INSERT WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "hr_can_manage_leaves" ON leave_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','branch_manager'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_leave_requests_updated_at'
    AND tgrelid='leave_requests'::regclass) THEN
    CREATE TRIGGER set_leave_requests_updated_at
      BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 3. LEAVE_QUOTAS — Kuota cuti tahunan
-- =============================================================================
CREATE TABLE IF NOT EXISTS leave_quotas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year         INTEGER NOT NULL,
  annual_quota INTEGER NOT NULL DEFAULT 12,
  annual_used  INTEGER NOT NULL DEFAULT 0,
  sick_used    INTEGER NOT NULL DEFAULT 0,
  carry_over   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, year)
);

ALTER TABLE leave_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_can_manage_leave_quotas" ON leave_quotas;
CREATE POLICY "hr_can_manage_leave_quotas" ON leave_quotas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','branch_manager','finance'))
  );


-- =============================================================================
-- 4. PERFORMANCE_REVIEWS — Penilaian kinerja karyawan
-- =============================================================================
CREATE TABLE IF NOT EXISTS performance_reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id         UUID REFERENCES auth.users(id),
  review_period       TEXT NOT NULL,
  review_type         TEXT NOT NULL DEFAULT 'quarterly'
    CHECK (review_type IN ('monthly','quarterly','semi_annual','annual')),
  score_quality       NUMERIC(3,1) CHECK (score_quality BETWEEN 1 AND 5),
  score_productivity  NUMERIC(3,1) CHECK (score_productivity BETWEEN 1 AND 5),
  score_initiative    NUMERIC(3,1) CHECK (score_initiative BETWEEN 1 AND 5),
  score_teamwork      NUMERIC(3,1) CHECK (score_teamwork BETWEEN 1 AND 5),
  score_attendance    NUMERIC(3,1) CHECK (score_attendance BETWEEN 1 AND 5),
  overall_score       NUMERIC(3,1) GENERATED ALWAYS AS (
    (COALESCE(score_quality,0) + COALESCE(score_productivity,0) +
     COALESCE(score_initiative,0) + COALESCE(score_teamwork,0) +
     COALESCE(score_attendance,0)) / 5.0
  ) STORED,
  grade               TEXT,
  strengths           TEXT,
  improvements        TEXT,
  goals               TEXT,
  comments            TEXT,
  status              TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','acknowledged')),
  acknowledged_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_employee_id ON performance_reviews(employee_id);

ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_can_manage_performance"    ON performance_reviews;
DROP POLICY IF EXISTS "employee_can_view_own_review" ON performance_reviews;

CREATE POLICY "hr_can_manage_performance" ON performance_reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','branch_manager'))
  );

CREATE POLICY "employee_can_view_own_review" ON performance_reviews
  FOR SELECT USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));


-- =============================================================================
-- 5. MARKETING_CAMPAIGNS — Kampanye pemasaran
-- =============================================================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'digital'
    CHECK (type IN ('digital','print','event','referral','whatsapp','email','other')),
  status        TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','paused','completed','cancelled')),
  budget        NUMERIC(15,2) DEFAULT 0,
  spent         NUMERIC(15,2) DEFAULT 0,
  start_date    DATE,
  end_date      DATE,
  target_leads  INTEGER DEFAULT 0,
  target_bookings INTEGER DEFAULT 0,
  branch_id     UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status    ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_branch_id ON marketing_campaigns(branch_id);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_manage_campaigns" ON marketing_campaigns;
CREATE POLICY "marketing_manage_campaigns" ON marketing_campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','marketing'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_marketing_campaigns_updated_at'
    AND tgrelid='marketing_campaigns'::regclass) THEN
    CREATE TRIGGER set_marketing_campaigns_updated_at
      BEFORE UPDATE ON marketing_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 6. SALES_TARGETS — Target penjualan
-- =============================================================================
CREATE TABLE IF NOT EXISTS sales_targets (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  period           TEXT NOT NULL,
  target_bookings  INTEGER DEFAULT 0,
  target_revenue   NUMERIC(15,2) DEFAULT 0,
  target_leads     INTEGER DEFAULT 0,
  actual_bookings  INTEGER DEFAULT 0,
  actual_revenue   NUMERIC(15,2) DEFAULT 0,
  actual_leads     INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, period)
);

CREATE INDEX IF NOT EXISTS idx_sales_targets_user_id  ON sales_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_period   ON sales_targets(period);

ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_sales_targets" ON sales_targets;
DROP POLICY IF EXISTS "sales_read_own_targets"     ON sales_targets;

CREATE POLICY "admin_manage_sales_targets" ON sales_targets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

CREATE POLICY "sales_read_own_targets" ON sales_targets
  FOR SELECT USING (user_id = auth.uid());


-- =============================================================================
-- 7. TRAINING_MODULES — Modul pelatihan agen
-- =============================================================================
CREATE TABLE IF NOT EXISTS training_modules (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT NOT NULL,
  description      TEXT,
  category         TEXT NOT NULL
    CHECK (category IN ('product_knowledge','script_penjualan','sop','regulasi','lainnya')),
  content_type     TEXT NOT NULL
    CHECK (content_type IN ('text','video','pdf','mixed')),
  content_url      TEXT,
  content_text     TEXT,
  thumbnail_url    TEXT,
  duration_minutes INTEGER,
  is_mandatory     BOOLEAN DEFAULT FALSE,
  order_index      INTEGER DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_modules_category ON training_modules(category);
CREATE INDEX IF NOT EXISTS idx_training_modules_active   ON training_modules(is_active);

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_training_modules" ON training_modules;
DROP POLICY IF EXISTS "agent_read_training_modules"   ON training_modules;

CREATE POLICY "admin_manage_training_modules" ON training_modules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

CREATE POLICY "agent_read_training_modules" ON training_modules
  FOR SELECT USING (is_active = TRUE AND auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_training_modules_updated_at'
    AND tgrelid='training_modules'::regclass) THEN
    CREATE TRIGGER set_training_modules_updated_at
      BEFORE UPDATE ON training_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 8. TRAINING_QUIZZES — Kuis per modul
-- =============================================================================
CREATE TABLE IF NOT EXISTS training_quizzes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id   UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,
  explanation TEXT,
  order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_training_quizzes_module_id ON training_quizzes(module_id);

ALTER TABLE training_quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_training_quizzes" ON training_quizzes;
DROP POLICY IF EXISTS "agent_read_training_quizzes"   ON training_quizzes;

CREATE POLICY "admin_manage_training_quizzes" ON training_quizzes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

CREATE POLICY "agent_read_training_quizzes" ON training_quizzes
  FOR SELECT USING (auth.role() = 'authenticated');


-- =============================================================================
-- 9. AGENT_TRAINING_PROGRESS — Progres pelatihan agen
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_training_progress (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id     UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  module_id    UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','completed','failed')),
  quiz_score   INTEGER,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agent_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_training_agent_id  ON agent_training_progress(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_training_module_id ON agent_training_progress(module_id);

ALTER TABLE agent_training_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_manage_own_training" ON agent_training_progress;
DROP POLICY IF EXISTS "admin_read_all_training"   ON agent_training_progress;

CREATE POLICY "agent_manage_own_training" ON agent_training_progress
  FOR ALL USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "admin_read_all_training" ON agent_training_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );


-- =============================================================================
-- 10. VENDOR_CONTRACTS — Kontrak dengan vendor
-- =============================================================================
CREATE TABLE IF NOT EXISTS vendor_contracts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id       UUID REFERENCES vendors(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  service_type    TEXT NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  value           NUMERIC(15,2),
  currency        TEXT DEFAULT 'IDR',
  payment_terms   TEXT,
  auto_renew      BOOLEAN DEFAULT FALSE,
  document_url    TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','expired','terminated')),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id       UUID REFERENCES branches(id)  ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_contracts_vendor_id  ON vendor_contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_end_date   ON vendor_contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_status     ON vendor_contracts(status);

ALTER TABLE vendor_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_vendor_contracts"        ON vendor_contracts;
DROP POLICY IF EXISTS "branch_manager_read_vendor_contracts" ON vendor_contracts;

CREATE POLICY "admin_manage_vendor_contracts" ON vendor_contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance','operational'))
  );

CREATE POLICY "branch_manager_read_vendor_contracts" ON vendor_contracts
  FOR SELECT USING (branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid()));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_vendor_contracts_updated_at'
    AND tgrelid='vendor_contracts'::regclass) THEN
    CREATE TRIGGER set_vendor_contracts_updated_at
      BEFORE UPDATE ON vendor_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 11. DEPARTURE_BUDGETS — Anggaran per keberangkatan
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_budgets (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  category        TEXT NOT NULL
    CHECK (category IN ('hotel','tiket','visa','katering','transportasi','handling','manasik','perlengkapan','lainnya')),
  description     TEXT,
  budgeted_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  pax_count       INTEGER,
  per_pax_amount  NUMERIC(15,2),
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (departure_id, category)
);

CREATE INDEX IF NOT EXISTS idx_departure_budgets_departure_id ON departure_budgets(departure_id);

ALTER TABLE departure_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_budgets" ON departure_budgets;
CREATE POLICY "staff_manage_departure_budgets" ON departure_budgets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','finance','operational'))
  );


-- =============================================================================
-- 12. MEDIA_GALLERY — Galeri video/foto hotel & testimonial
-- =============================================================================
CREATE TABLE IF NOT EXISTS media_gallery (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type             TEXT NOT NULL
    CHECK (type IN ('video_testimonial','virtual_tour','hotel_photo')),
  title            TEXT,
  description      TEXT,
  media_url        TEXT NOT NULL,
  thumbnail_url    TEXT,
  hotel_id         UUID REFERENCES hotels(id)   ON DELETE SET NULL,
  package_id       UUID REFERENCES packages(id) ON DELETE SET NULL,
  jamaah_name      TEXT,
  departure_year   INTEGER,
  duration_seconds INTEGER,
  is_active        BOOLEAN DEFAULT TRUE,
  order_index      INTEGER DEFAULT 0,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_gallery_type       ON media_gallery(type);
CREATE INDEX IF NOT EXISTS idx_media_gallery_hotel_id   ON media_gallery(hotel_id);
CREATE INDEX IF NOT EXISTS idx_media_gallery_package_id ON media_gallery(package_id);
CREATE INDEX IF NOT EXISTS idx_media_gallery_active     ON media_gallery(is_active);

ALTER TABLE media_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_media_gallery" ON media_gallery;
DROP POLICY IF EXISTS "public_read_media_gallery"  ON media_gallery;

CREATE POLICY "admin_manage_media_gallery" ON media_gallery
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','marketing'))
  );

CREATE POLICY "public_read_media_gallery" ON media_gallery
  FOR SELECT USING (is_active = TRUE);


-- =============================================================================
-- 13. BAGGAGE_REFERENCE_ITEMS — Referensi bawaan jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS baggage_reference_items (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  estimated_weight_kg NUMERIC(5,2) NOT NULL,
  is_mandatory        BOOLEAN DEFAULT FALSE,
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_baggage_reference_category ON baggage_reference_items(category);

ALTER TABLE baggage_reference_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_baggage_reference"  ON baggage_reference_items;
DROP POLICY IF EXISTS "admin_manage_baggage_reference" ON baggage_reference_items;

CREATE POLICY "public_read_baggage_reference"  ON baggage_reference_items FOR SELECT USING (TRUE);
CREATE POLICY "admin_manage_baggage_reference" ON baggage_reference_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );


-- =============================================================================
-- 14. APPROVAL_CONFIGS — Konfigurasi approval multi-level
-- =============================================================================
CREATE TABLE IF NOT EXISTS approval_configs (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type                 TEXT NOT NULL
    CHECK (type IN ('refund','discount','cancellation','vendor_invoice')),
  level                SMALLINT NOT NULL DEFAULT 1,
  required_role        TEXT NOT NULL,
  amount_threshold     NUMERIC(15,2),
  percentage_threshold NUMERIC(5,2),
  auto_approve_below   NUMERIC(15,2),
  is_active            BOOLEAN DEFAULT TRUE,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (type, level, required_role)
);

ALTER TABLE approval_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_approval_configs" ON approval_configs;
DROP POLICY IF EXISTS "staff_read_approval_configs"   ON approval_configs;

CREATE POLICY "admin_manage_approval_configs" ON approval_configs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner'))
  );

CREATE POLICY "staff_read_approval_configs" ON approval_configs
  FOR SELECT USING (auth.role() = 'authenticated');


-- =============================================================================
-- 15. AGENT_OVERRIDE_COMMISSIONS — Override komisi agen ke sub-agen
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_override_commissions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  agent_id            UUID NOT NULL REFERENCES agents(id)   ON DELETE CASCADE,
  sub_agent_id        UUID NOT NULL REFERENCES agents(id)   ON DELETE CASCADE,
  override_percentage NUMERIC(5,2) NOT NULL,
  override_amount     NUMERIC(15,2) NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','paid','cancelled')),
  paid_at             TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_override_agent_id     ON agent_override_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_override_sub_agent_id ON agent_override_commissions(sub_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_override_booking_id   ON agent_override_commissions(booking_id);

ALTER TABLE agent_override_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_read_own_override" ON agent_override_commissions;
DROP POLICY IF EXISTS "admin_manage_override"   ON agent_override_commissions;

CREATE POLICY "agent_read_own_override" ON agent_override_commissions
  FOR SELECT USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "admin_manage_override" ON agent_override_commissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );


-- =============================================================================
-- 16. MEMBERSHIP_PLANS — Paket keanggotaan agen & cabang
-- =============================================================================
CREATE TABLE IF NOT EXISTS membership_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  plan_type       TEXT NOT NULL CHECK (plan_type IN ('agent','branch')),
  price_yearly    NUMERIC(15,2) NOT NULL DEFAULT 0,
  max_sub_agents  INTEGER DEFAULT NULL,
  commission_rate NUMERIC(5,2) DEFAULT 0,
  description     TEXT,
  features        JSONB DEFAULT '[]',
  is_active       BOOLEAN DEFAULT true,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_membership_plans"   ON membership_plans;
DROP POLICY IF EXISTS "admin_manage_membership_plans"  ON membership_plans;

CREATE POLICY "public_read_membership_plans" ON membership_plans
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "admin_manage_membership_plans" ON membership_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );


-- =============================================================================
-- 17. AGENT_MEMBERSHIPS & BRANCH_MEMBERSHIPS
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  plan_id           UUID NOT NULL REFERENCES membership_plans(id),
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','expired','rejected')),
  payment_proof_url TEXT,
  start_date        DATE,
  end_date          DATE,
  approved_by       UUID REFERENCES auth.users(id),
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_memberships_agent_id ON agent_memberships(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memberships_status   ON agent_memberships(status);

ALTER TABLE agent_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_agent_memberships" ON agent_memberships;
CREATE POLICY "admin_manage_agent_memberships" ON agent_memberships
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
    OR agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );


CREATE TABLE IF NOT EXISTS branch_memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id         UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  plan_id           UUID NOT NULL REFERENCES membership_plans(id),
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','expired','rejected')),
  payment_proof_url TEXT,
  start_date        DATE,
  end_date          DATE,
  approved_by       UUID REFERENCES auth.users(id),
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branch_memberships_branch_id ON branch_memberships(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_memberships_status    ON branch_memberships(status);

ALTER TABLE branch_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_branch_memberships" ON branch_memberships;
CREATE POLICY "admin_manage_branch_memberships" ON branch_memberships
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
    OR branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid())
  );


-- =============================================================================
-- 18. BRANCH_COMMISSIONS — Komisi cabang dari booking
-- =============================================================================
CREATE TABLE IF NOT EXISTS branch_commissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id         UUID NOT NULL REFERENCES branches(id)  ON DELETE CASCADE,
  booking_id        UUID NOT NULL REFERENCES bookings(id)  ON DELETE CASCADE,
  commission_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  commission_rate   NUMERIC(5,2)  NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','paid','rejected')),
  notes             TEXT,
  approved_by       UUID REFERENCES auth.users(id),
  approved_at       TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  payment_reference TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch_id, booking_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_commissions_branch_id ON branch_commissions(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_commissions_status    ON branch_commissions(status);

ALTER TABLE branch_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_branch_commissions" ON branch_commissions;
CREATE POLICY "admin_manage_branch_commissions" ON branch_commissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
    OR branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid())
  );


-- =============================================================================
-- 19. COMPANY_SETTINGS — Konfigurasi perusahaan (key-value)
-- =============================================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key   TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  setting_type  TEXT NOT NULL DEFAULT 'string'
    CHECK (setting_type IN ('string','number','boolean','json','color','url')),
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_settings_key ON company_settings(setting_key);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_company_settings" ON company_settings;
DROP POLICY IF EXISTS "public_read_company_settings"  ON company_settings;

CREATE POLICY "admin_manage_company_settings" ON company_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "public_read_company_settings" ON company_settings
  FOR SELECT USING (TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_company_settings_updated_at'
    AND tgrelid='company_settings'::regclass) THEN
    CREATE TRIGGER set_company_settings_updated_at
      BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 20. BANK_ACCOUNTS — Rekening bank perusahaan
-- =============================================================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name      TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name   TEXT NOT NULL,
  branch_name    TEXT,
  is_primary     BOOLEAN DEFAULT FALSE,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_primary ON bank_accounts(is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active  ON bank_accounts(is_active)  WHERE is_active  = TRUE;

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "public_read_bank_accounts"  ON bank_accounts;

CREATE POLICY "admin_manage_bank_accounts" ON bank_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );

CREATE POLICY "public_read_bank_accounts" ON bank_accounts
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_bank_accounts_updated_at'
    AND tgrelid='bank_accounts'::regclass) THEN
    CREATE TRIGGER set_bank_accounts_updated_at
      BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 21. WEBSITE_SETTINGS — Tema & konfigurasi tampilan (termasuk kolom fase1&fase2)
-- =============================================================================
CREATE TABLE IF NOT EXISTS website_settings (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id           UUID REFERENCES agents(id) ON DELETE CASCADE,
  branch_id          UUID REFERENCES branches(id) ON DELETE CASCADE,
  company_name       TEXT,
  logo_url           TEXT,
  favicon_url        TEXT,
  active_theme       TEXT NOT NULL DEFAULT 'default',
  primary_color      TEXT,
  accent_color       TEXT,
  foreground_color   TEXT,
  background_color   TEXT,
  body_font          TEXT,
  heading_font       TEXT,
  footer_description TEXT,
  footer_address     TEXT,
  footer_phone       TEXT,
  footer_email       TEXT,
  footer_whatsapp    TEXT,
  footer_bottom_text TEXT,
  footer_links       JSONB,
  custom_sections    JSONB,
  profile_photo_url  TEXT,
  banner_url         TEXT,
  bio                TEXT,
  testimonials       JSONB DEFAULT '[]',
  gallery_urls       JSONB DEFAULT '[]',
  seo_title          TEXT,
  seo_description    TEXT,
  view_count         INTEGER DEFAULT 0,
  social_youtube     TEXT,
  social_tiktok      TEXT,
  maps_embed_url     TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_agent
  ON website_settings(agent_id)  WHERE agent_id  IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_branch
  ON website_settings(branch_id) WHERE branch_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_global
  ON website_settings((1)) WHERE agent_id IS NULL AND branch_id IS NULL;

ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_website_settings"      ON website_settings;
DROP POLICY IF EXISTS "agent_manage_own_website_settings"  ON website_settings;
DROP POLICY IF EXISTS "branch_manage_own_website_settings" ON website_settings;
DROP POLICY IF EXISTS "public_read_website_settings"       ON website_settings;

CREATE POLICY "admin_manage_website_settings" ON website_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "agent_manage_own_website_settings" ON website_settings
  FOR ALL USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "branch_manage_own_website_settings" ON website_settings
  FOR ALL USING (branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid()));

CREATE POLICY "public_read_website_settings" ON website_settings
  FOR SELECT USING (TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_website_settings_updated_at'
    AND tgrelid='website_settings'::regclass) THEN
    CREATE TRIGGER set_website_settings_updated_at
      BEFORE UPDATE ON website_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 22. CONTACT_PAGE_CONTENT — Konten halaman kontak website
-- =============================================================================
CREATE TABLE IF NOT EXISTS contact_page_content (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settings_id     UUID REFERENCES website_settings(id) ON DELETE CASCADE,
  hero_title      TEXT,
  hero_subtitle   TEXT,
  form_title      TEXT,
  map_url         TEXT,
  operating_hours JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_page_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_contact_content" ON contact_page_content;
DROP POLICY IF EXISTS "public_read_contact_content"  ON contact_page_content;

CREATE POLICY "admin_manage_contact_content" ON contact_page_content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "public_read_contact_content" ON contact_page_content
  FOR SELECT USING (TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_contact_page_updated_at'
    AND tgrelid='contact_page_content'::regclass) THEN
    CREATE TRIGGER set_contact_page_updated_at
      BEFORE UPDATE ON contact_page_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 23. SISKOHAT_SYNC_LOGS — Log sinkronisasi data SISKOHAT Kemenag
-- =============================================================================
CREATE TABLE IF NOT EXISTS siskohat_sync_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type     TEXT NOT NULL CHECK (sync_type IN ('export','manual_input','validation')),
  record_count  INTEGER,
  status        TEXT NOT NULL DEFAULT 'success'
    CHECK (status IN ('success','partial','failed')),
  error_message TEXT,
  file_url      TEXT,
  exported_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id     UUID REFERENCES branches(id)   ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_siskohat_sync_logs_created_at ON siskohat_sync_logs(created_at DESC);

ALTER TABLE siskohat_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_siskohat_logs" ON siskohat_sync_logs;
CREATE POLICY "admin_manage_siskohat_logs" ON siskohat_sync_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','operational'))
  );


-- =============================================================================
-- 24. DEPARTURE_COST_ITEMS — HPP per item keberangkatan (fase28)
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_cost_items (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  category       TEXT NOT NULL DEFAULT 'other',
  sub_category   TEXT,
  location       TEXT,
  hotel_id       UUID REFERENCES hotels(id)   ON DELETE SET NULL,
  nights         INTEGER,
  room_type      TEXT,
  check_in_date  DATE,
  check_out_date DATE,
  airline_id     UUID REFERENCES airlines(id) ON DELETE SET NULL,
  flight_route   TEXT,
  flight_class   TEXT,
  description    TEXT NOT NULL DEFAULT '',
  unit           TEXT NOT NULL DEFAULT 'per_pax',
  quantity       NUMERIC NOT NULL DEFAULT 1,
  unit_cost      NUMERIC NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'IDR',
  exchange_rate  NUMERIC NOT NULL DEFAULT 1,
  total_cost_idr NUMERIC GENERATED ALWAYS AS (quantity * unit_cost * exchange_rate) STORED,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  notes          TEXT,
  reference_id   UUID,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_cost_items_departure_id ON departure_cost_items(departure_id);
CREATE INDEX IF NOT EXISTS idx_departure_cost_items_category     ON departure_cost_items(category);

ALTER TABLE departure_cost_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_cost_items" ON departure_cost_items;
CREATE POLICY "staff_manage_departure_cost_items" ON departure_cost_items
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_cost_items_updated_at'
    AND tgrelid='departure_cost_items'::regclass) THEN
    CREATE TRIGGER set_departure_cost_items_updated_at
      BEFORE UPDATE ON departure_cost_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 25. DEPARTURE_EXPENSES — Pengeluaran operasional realisasi (fase28)
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_expenses (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id     UUID REFERENCES bookings(id) ON DELETE SET NULL,
  expense_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  category       TEXT NOT NULL DEFAULT 'other',
  location       TEXT,
  description    TEXT NOT NULL DEFAULT '',
  amount         NUMERIC NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'IDR',
  exchange_rate  NUMERIC NOT NULL DEFAULT 1,
  amount_idr     NUMERIC GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  payment_method TEXT DEFAULT 'transfer',
  receipt_url    TEXT,
  notes          TEXT,
  approved_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_expenses_departure_id ON departure_expenses(departure_id);
CREATE INDEX IF NOT EXISTS idx_departure_expenses_expense_date ON departure_expenses(expense_date);

ALTER TABLE departure_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_expenses" ON departure_expenses;
CREATE POLICY "staff_manage_departure_expenses" ON departure_expenses
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_expenses_updated_at'
    AND tgrelid='departure_expenses'::regclass) THEN
    CREATE TRIGGER set_departure_expenses_updated_at
      BEFORE UPDATE ON departure_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 26. DEPARTURE_OTHER_REVENUES — Pendapatan tambahan keberangkatan (fase28)
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_other_revenues (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id  UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  revenue_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  category      TEXT NOT NULL DEFAULT 'other',
  location      TEXT,
  description   TEXT NOT NULL DEFAULT '',
  amount        NUMERIC NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'IDR',
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  amount_idr    NUMERIC GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  notes         TEXT,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_other_revenues_departure_id ON departure_other_revenues(departure_id);

ALTER TABLE departure_other_revenues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_other_revenues" ON departure_other_revenues;
CREATE POLICY "staff_manage_departure_other_revenues" ON departure_other_revenues
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_other_revenues_updated_at'
    AND tgrelid='departure_other_revenues'::regclass) THEN
    CREATE TRIGGER set_departure_other_revenues_updated_at
      BEFORE UPDATE ON departure_other_revenues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 27. DEPARTURE_FINANCIAL_SUMMARY — Cache ringkasan keuangan keberangkatan (fase28)
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_financial_summary (
  departure_id            UUID NOT NULL PRIMARY KEY REFERENCES departures(id) ON DELETE CASCADE,
  quota                   INTEGER NOT NULL DEFAULT 0,
  pax_confirmed           INTEGER NOT NULL DEFAULT 0,
  pax_cancelled           INTEGER NOT NULL DEFAULT 0,
  revenue_gross           NUMERIC NOT NULL DEFAULT 0,
  revenue_paid            NUMERIC NOT NULL DEFAULT 0,
  revenue_outstanding     NUMERIC NOT NULL DEFAULT 0,
  revenue_refunded        NUMERIC NOT NULL DEFAULT 0,
  hpp_total               NUMERIC NOT NULL DEFAULT 0,
  expense_total           NUMERIC NOT NULL DEFAULT 0,
  other_revenue_total     NUMERIC NOT NULL DEFAULT 0,
  gross_profit            NUMERIC GENERATED ALWAYS AS (revenue_gross - hpp_total) STORED,
  net_profit              NUMERIC GENERATED ALWAYS AS (revenue_gross + other_revenue_total - hpp_total - expense_total) STORED,
  gross_margin_pct        NUMERIC GENERATED ALWAYS AS (
    CASE WHEN revenue_gross > 0
      THEN ROUND(((revenue_gross - hpp_total) / revenue_gross) * 100, 2)
      ELSE 0
    END
  ) STORED,
  last_calculated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE departure_financial_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_departure_financial_summary"  ON departure_financial_summary;
DROP POLICY IF EXISTS "staff_write_departure_financial_summary" ON departure_financial_summary;

CREATE POLICY "staff_read_departure_financial_summary" ON departure_financial_summary
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );

CREATE POLICY "staff_write_departure_financial_summary" ON departure_financial_summary
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );


-- =============================================================================
-- SEED: default data
-- =============================================================================

-- Default approval configs
INSERT INTO approval_configs (type, level, required_role, amount_threshold, percentage_threshold, auto_approve_below)
VALUES
  ('refund',         1,'branch_manager',5000000,  NULL,  500000),
  ('refund',         2,'admin',         50000000, NULL, 5000000),
  ('refund',         3,'owner',         NULL,     NULL,    NULL),
  ('discount',       1,'branch_manager',NULL,     10.0,    NULL),
  ('discount',       2,'admin',         NULL,     30.0,    NULL),
  ('cancellation',   1,'branch_manager',NULL,     NULL,    NULL),
  ('cancellation',   2,'admin',         NULL,     NULL,    NULL),
  ('vendor_invoice', 1,'finance',       10000000, NULL, 1000000),
  ('vendor_invoice', 2,'owner',         NULL,     NULL,10000000)
ON CONFLICT (type, level, required_role) DO NOTHING;

-- Default baggage reference items
INSERT INTO baggage_reference_items (name, category, estimated_weight_kg, is_mandatory) VALUES
  ('Koper besar (kosong)',      'koper',      3.50, TRUE),
  ('Koper kabin (kosong)',      'koper',      2.00, FALSE),
  ('Tas ransel',                'tas',        0.80, FALSE),
  ('Baju ihram pria (2 lembar)','pakaian',    0.80, TRUE),
  ('Mukena',                    'pakaian',    0.40, FALSE),
  ('Sandal',                    'alas_kaki',  0.40, TRUE),
  ('Al-Quran',                  'ibadah',     0.50, FALSE),
  ('Sajadah travel',            'ibadah',     0.30, FALSE),
  ('Masker (kotak)',            'kesehatan',  0.20, TRUE),
  ('Obat-obatan pribadi',       'kesehatan',  0.50, FALSE),
  ('Charger & kabel',           'elektronik', 0.30, FALSE),
  ('Power bank',                'elektronik', 0.25, FALSE)
ON CONFLICT DO NOTHING;

-- Default company settings
INSERT INTO company_settings (setting_key, setting_value, setting_type, description) VALUES
  ('company_name',         '"Vinstour Travel"',            'string',  'Nama resmi perusahaan'),
  ('company_tagline',      '"Perjalanan Suci Anda"',       'string',  'Tagline perusahaan'),
  ('company_phone',        '"021-1234567"',                'string',  'Nomor telepon utama'),
  ('company_email',        '"info@vinstour.com"',          'string',  'Email utama perusahaan'),
  ('company_address',      '"Jakarta, Indonesia"',         'string',  'Alamat kantor pusat'),
  ('company_logo_url',     'null',                         'url',     'URL logo perusahaan'),
  ('company_wa_number',    '"628111234567"',               'string',  'Nomor WhatsApp utama (format 62xxx)'),
  ('kpi_targets_monthly',  '{"bookings":150,"revenue":3500000000,"leads":500,"conversion":30}', 'json', 'Target KPI bulanan'),
  ('fonnte_api_key',       'null',                         'string',  'API key Fonnte untuk kirim WhatsApp'),
  ('max_booking_dp_pct',   '30',                           'number',  'Persentase minimal DP booking (%)'),
  ('booking_expiry_hours', '24',                           'number',  'Jam sebelum booking pending kadaluarsa')
ON CONFLICT (setting_key) DO NOTHING;

-- Default bank accounts (ganti dengan rekening nyata setelah migrasi)
INSERT INTO bank_accounts (bank_name, account_number, account_name, branch_name, is_primary, is_active)
VALUES
  ('Bank BCA',    '1234567890', 'PT Vinstour Wisata Utama', 'KCP Jakarta Pusat',   TRUE,  TRUE),
  ('Bank Mandiri','0987654321', 'PT Vinstour Wisata Utama', 'KC Jakarta Selatan',  FALSE, TRUE)
ON CONFLICT DO NOTHING;

-- Default website settings global
-- UUID '00000000-0000-0000-0000-000000000001' adalah ID yang selalu diquery frontend
-- Jika tidak ada, frontend akan 404 dan jatuh ke default; sebaiknya row ini selalu ada.
INSERT INTO website_settings (
  id,
  company_name,
  active_theme,
  template,
  primary_color,
  secondary_color,
  accent_color,
  background_color,
  foreground_color,
  heading_font,
  body_font,
  tagline,
  footer_description,
  footer_bottom_text,
  meta_title,
  meta_description,
  hero_title,
  hero_subtitle,
  hero_cta_text,
  hero_cta_link,
  hero_display_mode,
  featured_packages_count,
  package_card_layout,
  package_card_image_ratio,
  package_card_show_airline,
  package_card_show_hotel,
  package_card_show_duration,
  package_card_show_departure
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Vinstour Travel',
  'classic',
  'classic',
  '160 84% 25%',
  '160 20% 96%',
  '45 93% 47%',
  '0 0% 100%',
  '160 50% 5%',
  'Plus Jakarta Sans',
  'Inter',
  'Perjalanan Suci Anda',
  'Layanan perjalanan Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun.',
  '© 2025 Vinstour Travel. All rights reserved.',
  'Vinstour Travel - Perjalanan Umroh Terpercaya',
  'Layanan perjalanan umroh berkualitas dengan harga terjangkau',
  'Perjalanan Umroh Impian Anda',
  'Nikmati pengalaman spiritual yang tak terlupakan',
  'Pesan Sekarang',
  '/packages',
  'both',
  6,
  'modern',
  '16/10',
  true,
  true,
  true,
  true
)
ON CONFLICT (id) DO UPDATE SET
  company_name  = COALESCE(EXCLUDED.company_name, website_settings.company_name),
  active_theme  = COALESCE(EXCLUDED.active_theme,  website_settings.active_theme),
  template      = COALESCE(EXCLUDED.template,      website_settings.template),
  updated_at    = NOW();

-- Default contact page content
INSERT INTO contact_page_content (hero_title, hero_subtitle, form_title, operating_hours)
VALUES (
  'Hubungi Kami',
  'Tim kami siap membantu Anda merencanakan perjalanan ibadah terbaik.',
  'Kirim Pesan',
  '{"senin_jumat":"08.00 - 17.00 WIB","sabtu":"08.00 - 13.00 WIB","minggu":"Tutup"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Membership plans default
INSERT INTO membership_plans (name, plan_type, price_yearly, max_sub_agents, commission_rate, description, features, sort_order) VALUES
  ('Silver',   'agent',  500000,  5,    2, 'Paket dasar untuk agen baru',         '["Dashboard portal agen","Website agen dasar","Maksimal 5 sub agen","Komisi 2%"]', 1),
  ('Gold',     'agent',  1500000, 20,   3, 'Paket menengah dengan fitur lengkap', '["Dashboard portal agen","Website agen lengkap","Laporan komisi","Maksimal 20 sub agen","Komisi 3%"]', 2),
  ('Platinum', 'agent',  3000000, NULL, 4, 'Paket premium tanpa batas sub agen',  '["Semua fitur Gold","Sub agen tidak terbatas","Priority support","Komisi 4%"]', 3),
  ('Reguler',  'branch', 5000000, 50,   1, 'Paket cabang standar',                '["Dashboard cabang","Website cabang","Maksimal 50 agen","Komisi cabang 1%"]', 1),
  ('Premium',  'branch', 12000000,NULL, 2, 'Paket cabang premium',                '["Semua fitur Reguler","Agen tidak terbatas","CRM & laporan lanjutan","Komisi cabang 2%"]', 2)
ON CONFLICT DO NOTHING;

-- WA Feature Roadmap seed
INSERT INTO wa_feature_roadmap (phase, code, title, description, status, sort_order) VALUES
  (1,'WA_BASIC_SEND',       'Kirim WA via Fonnte',              'Kirim pesan single & bulk via provider Fonnte', 'done', 10),
  (1,'WA_TEMPLATES_ENGINE', 'Template Pesan Dinamis',           'Variabel {nama}, {kode}, {tanggal} di template', 'done', 20),
  (1,'WA_SEND_LOGS',        'Log Pengiriman WA',                'Riwayat setiap pesan terkirim / gagal', 'done', 30),
  (1,'WA_BLAST_DEPARTURE',  'Broadcast per Keberangkatan',      'Kirim massal ke semua jamaah satu keberangkatan', 'done', 40),
  (1,'WA_AUTO_BOOKING',     'Notif Otomatis Booking Baru',      'Auto-kirim WA saat booking/DP/lunas dikonfirmasi', 'done', 60),
  (2,'WA_MULTIPROVIDER',    'Multi-Provider (Fonnte/Wablas/…)', 'Support banyak gateway WA, dipilih dari panel admin', 'in_progress', 70),
  (2,'WA_AUTO_REMINDER',    'Auto-Jadwal Reminder Pembayaran',  'Buat baris reminder H-7/H-3 otomatis', 'in_progress', 90),
  (3,'WA_BROADCAST_SEGMENT','Broadcast Tersegmentasi',          'Filter penerima: by paket, keberangkatan, status bayar', 'planned', 100),
  (4,'WA_CHATBOT_KEYWORD',  'Auto-Reply Berbasis Kata Kunci',   'Balas otomatis jika jamaah kirim kata kunci tertentu', 'planned', 130),
  (5,'WA_META_CLOUD',       'WhatsApp Cloud API (Meta/WABA)',   'Integrasi resmi Meta Business API', 'planned', 160)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- SELESAI — File 05: Finance, HR & Company Settings
-- =============================================================================
SELECT 'File 05 — Finance, HR & Company Settings: OK' AS result;

-- ============================================================
-- 06_ecommerce.sql
-- ============================================================
-- =============================================================================
-- FILE 06 — Store / E-Commerce
-- Meliputi: store_categories, store_products, store_orders,
--           store_order_items, store_shipments, store_product_reviews
-- Jalankan setelah 05_finance_hr_company.sql
-- =============================================================================

-- =============================================================================
-- 1. STORE_CATEGORIES — Kategori produk toko
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_categories (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_categories_active ON store_categories(is_active);
CREATE INDEX IF NOT EXISTS idx_store_categories_slug   ON store_categories(slug);

ALTER TABLE store_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_store_categories" ON store_categories;
DROP POLICY IF EXISTS "public_read_store_categories"  ON store_categories;

CREATE POLICY "admin_manage_store_categories" ON store_categories
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','marketing'))
  );

CREATE POLICY "public_read_store_categories" ON store_categories
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_categories_updated_at'
    AND tgrelid='store_categories'::regclass) THEN
    CREATE TRIGGER set_store_categories_updated_at
      BEFORE UPDATE ON store_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

INSERT INTO store_categories (name, slug, description, sort_order) VALUES
  ('Perlengkapan Ibadah', 'perlengkapan-ibadah', 'Peralatan sholat, Al-Quran, tasbih dan lainnya', 1),
  ('Pakaian Ihram',       'pakaian-ihram',        'Kain ihram pria dan mukena wanita berkualitas', 2),
  ('Koper & Tas',         'koper-tas',             'Koper, tas kabin, dan tas ransel untuk perjalanan', 3),
  ('Kesehatan & Vitamin', 'kesehatan-vitamin',     'Suplemen, obat-obatan, dan kebutuhan kesehatan jamaah', 4),
  ('Buku & Panduan',      'buku-panduan',          'Buku doa, panduan manasik, dan literatur islami', 5),
  ('Souvenir',            'souvenir',              'Oleh-oleh dan souvenir dari Tanah Suci', 6)
ON CONFLICT (slug) DO NOTHING;


-- =============================================================================
-- 2. STORE_PRODUCTS — Produk toko
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_products (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id    UUID REFERENCES store_categories(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  description    TEXT,
  price          NUMERIC(15,2) NOT NULL DEFAULT 0,
  original_price NUMERIC(15,2),
  stock          INTEGER NOT NULL DEFAULT 0,
  weight_gram    INTEGER DEFAULT 0,
  images         JSONB DEFAULT '[]',
  is_active      BOOLEAN DEFAULT TRUE,
  is_featured    BOOLEAN DEFAULT FALSE,
  sold_count     INTEGER DEFAULT 0,
  sku            TEXT,
  branch_id      UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_products_category  ON store_products(category_id);
CREATE INDEX IF NOT EXISTS idx_store_products_active    ON store_products(is_active);
CREATE INDEX IF NOT EXISTS idx_store_products_featured  ON store_products(is_featured);
CREATE INDEX IF NOT EXISTS idx_store_products_slug      ON store_products(slug);

ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_store_products" ON store_products;
DROP POLICY IF EXISTS "public_read_store_products"  ON store_products;

CREATE POLICY "admin_manage_store_products" ON store_products
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','marketing','operational'))
  );

CREATE POLICY "public_read_store_products" ON store_products
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_products_updated_at'
    AND tgrelid='store_products'::regclass) THEN
    CREATE TRIGGER set_store_products_updated_at
      BEFORE UPDATE ON store_products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 3. STORE_ORDERS — Pesanan toko
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_orders (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number      TEXT NOT NULL UNIQUE,
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  payment_status    TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','paid','refunded')),
  subtotal          NUMERIC(15,2) NOT NULL DEFAULT 0,
  shipping_cost     NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  shipping_name     TEXT,
  shipping_phone    TEXT,
  shipping_address  TEXT,
  shipping_city     TEXT,
  shipping_province TEXT,
  shipping_postal   TEXT,
  notes             TEXT,
  payment_proof_url TEXT,
  paid_at           TIMESTAMPTZ,
  confirmed_at      TIMESTAMPTZ,
  confirmed_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_orders_customer_id    ON store_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_store_orders_status         ON store_orders(status);
CREATE INDEX IF NOT EXISTS idx_store_orders_payment_status ON store_orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_store_orders_order_number   ON store_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_store_orders_created_at     ON store_orders(created_at DESC);

ALTER TABLE store_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_read_own_store_orders"   ON store_orders;
DROP POLICY IF EXISTS "customer_insert_store_orders"     ON store_orders;
DROP POLICY IF EXISTS "customer_update_own_store_orders" ON store_orders;
DROP POLICY IF EXISTS "admin_manage_store_orders"        ON store_orders;

CREATE POLICY "customer_read_own_store_orders" ON store_orders
  FOR SELECT USING (
    user_id = auth.uid()
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "customer_insert_store_orders" ON store_orders
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "customer_update_own_store_orders" ON store_orders
  FOR UPDATE USING (user_id = auth.uid() AND status = 'pending');

CREATE POLICY "admin_manage_store_orders" ON store_orders
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','operational','finance'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_orders_updated_at'
    AND tgrelid='store_orders'::regclass) THEN
    CREATE TRIGGER set_store_orders_updated_at
      BEFORE UPDATE ON store_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 4. STORE_ORDER_ITEMS — Item pesanan toko
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_order_items (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id      UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id    UUID NOT NULL REFERENCES store_products(id) ON DELETE RESTRICT,
  product_name  TEXT NOT NULL,
  product_image TEXT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  unit_price    NUMERIC(15,2) NOT NULL,
  subtotal      NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_order_items_order_id   ON store_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_store_order_items_product_id ON store_order_items(product_id);

ALTER TABLE store_order_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_read_own_order_items" ON store_order_items;
DROP POLICY IF EXISTS "customer_insert_order_items"   ON store_order_items;
DROP POLICY IF EXISTS "admin_manage_order_items"      ON store_order_items;

CREATE POLICY "customer_read_own_order_items" ON store_order_items
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM store_orders
      WHERE user_id = auth.uid()
        OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "customer_insert_order_items" ON store_order_items
  FOR INSERT WITH CHECK (
    order_id IN (SELECT id FROM store_orders WHERE user_id = auth.uid())
  );

CREATE POLICY "admin_manage_order_items" ON store_order_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','operational','finance'))
  );


-- =============================================================================
-- 5. STORE_SHIPMENTS — Pengiriman / tracking pesanan
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_shipments (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id          UUID NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE UNIQUE,
  courier_name      TEXT NOT NULL,
  courier_service   TEXT,
  tracking_number   TEXT,
  shipped_at        TIMESTAMPTZ,
  estimated_arrival DATE,
  delivered_at      TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'preparing'
    CHECK (status IN ('preparing','picked_up','in_transit','out_for_delivery','delivered','failed','returned')),
  notes             TEXT,
  created_by        UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_shipments_order_id        ON store_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_store_shipments_tracking_number ON store_shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_store_shipments_status          ON store_shipments(status);

ALTER TABLE store_shipments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_read_own_shipment" ON store_shipments;
DROP POLICY IF EXISTS "admin_manage_shipments"     ON store_shipments;

CREATE POLICY "customer_read_own_shipment" ON store_shipments
  FOR SELECT USING (
    order_id IN (
      SELECT id FROM store_orders
      WHERE user_id = auth.uid()
        OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "admin_manage_shipments" ON store_shipments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','operational'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_store_shipments_updated_at'
    AND tgrelid='store_shipments'::regclass) THEN
    CREATE TRIGGER set_store_shipments_updated_at
      BEFORE UPDATE ON store_shipments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 6. STORE_PRODUCT_REVIEWS — Ulasan & rating produk toko
-- =============================================================================
CREATE TABLE IF NOT EXISTS store_product_reviews (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id       UUID NOT NULL REFERENCES store_orders(id)   ON DELETE CASCADE,
  product_id     UUID NOT NULL REFERENCES store_products(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES auth.users(id)     ON DELETE CASCADE,
  customer_id    UUID REFERENCES customers(id) ON DELETE SET NULL,
  rating         SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT,
  is_published   BOOLEAN NOT NULL DEFAULT TRUE,
  admin_reply    TEXT,
  admin_reply_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (order_id, product_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_spr_product_id   ON store_product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_spr_order_id     ON store_product_reviews(order_id);
CREATE INDEX IF NOT EXISTS idx_spr_user_id      ON store_product_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_spr_is_published ON store_product_reviews(is_published);
CREATE INDEX IF NOT EXISTS idx_spr_rating       ON store_product_reviews(rating);

ALTER TABLE store_product_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_insert_review"   ON store_product_reviews;
DROP POLICY IF EXISTS "customer_update_review"   ON store_product_reviews;
DROP POLICY IF EXISTS "customer_read_own_review" ON store_product_reviews;
DROP POLICY IF EXISTS "public_read_reviews"      ON store_product_reviews;
DROP POLICY IF EXISTS "admin_manage_reviews"     ON store_product_reviews;

CREATE POLICY "customer_insert_review" ON store_product_reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "customer_update_review" ON store_product_reviews
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "customer_read_own_review" ON store_product_reviews
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "public_read_reviews" ON store_product_reviews
  FOR SELECT USING (is_published = TRUE);

CREATE POLICY "admin_manage_reviews" ON store_product_reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','marketing'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_spr_updated_at'
    AND tgrelid='store_product_reviews'::regclass) THEN
    CREATE TRIGGER set_spr_updated_at
      BEFORE UPDATE ON store_product_reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- SELESAI — File 06: Store / E-Commerce
-- =============================================================================
SELECT 'File 06 — Store E-Commerce: OK' AS result;

-- ============================================================
-- 07_functions_rpc_seed.sql
-- ============================================================
-- =============================================================================
-- FILE 07 — Stored Functions, RPCs & Final Seed Data
-- Meliputi: semua function PostgreSQL, trigger functions, seed permissions,
--           seed menu_items, slug triggers, dan views
-- Jalankan TERAKHIR setelah semua file 01-06 berhasil dijalankan.
-- =============================================================================

-- =============================================================================
-- 1. GENERATE_BOOKING_CODE — Buat kode booking unik
-- =============================================================================
CREATE OR REPLACE FUNCTION generate_booking_code()
RETURNS TEXT AS $$
DECLARE v_code TEXT;
BEGIN
  LOOP
    v_code := 'VT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
              LPAD(FLOOR(RANDOM() * 99999 + 1)::TEXT, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM bookings WHERE booking_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 2. GENERATE_STORE_ORDER_NUMBER — Buat nomor pesanan toko unik
-- =============================================================================
CREATE OR REPLACE FUNCTION generate_store_order_number()
RETURNS TEXT AS $$
DECLARE v_number TEXT;
BEGIN
  LOOP
    v_number := 'TK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                LPAD(FLOOR(RANDOM() * 99999 + 1)::TEXT, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM store_orders WHERE order_number = v_number);
  END LOOP;
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 3. HOLD_DEPARTURE_SEATS — Kurangi kursi tersedia saat booking dikonfirmasi
-- =============================================================================
CREATE OR REPLACE FUNCTION hold_departure_seats(p_departure_id UUID, p_seats INTEGER)
RETURNS BOOLEAN AS $$
DECLARE v_available INTEGER;
BEGIN
  SELECT available_seats INTO v_available FROM departures WHERE id = p_departure_id FOR UPDATE;
  IF v_available < p_seats THEN
    RETURN FALSE;
  END IF;
  UPDATE departures
  SET available_seats = available_seats - p_seats,
      status = CASE WHEN available_seats - p_seats <= 0 THEN 'full' ELSE status END
  WHERE id = p_departure_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- 4. RELEASE_DEPARTURE_SEATS — Kembalikan kursi saat booking dibatalkan
-- =============================================================================
CREATE OR REPLACE FUNCTION release_departure_seats(p_departure_id UUID, p_seats INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE departures
  SET available_seats = LEAST(quota, available_seats + p_seats),
      status = CASE WHEN status = 'full' THEN 'open' ELSE status END
  WHERE id = p_departure_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- 5. DELETE_DEPARTURE_SAFELY — Hapus departure hanya jika tidak ada booking aktif
-- =============================================================================
CREATE OR REPLACE FUNCTION delete_departure_safely(p_departure_id UUID)
RETURNS JSONB AS $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM bookings
  WHERE departure_id = p_departure_id
    AND status NOT IN ('cancelled');

  IF v_count > 0 THEN
    RETURN jsonb_build_object('success', false,
      'message', 'Tidak dapat menghapus: terdapat ' || v_count || ' booking aktif');
  END IF;

  DELETE FROM departures WHERE id = p_departure_id;
  RETURN jsonb_build_object('success', true, 'message', 'Keberangkatan berhasil dihapus');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_departure_safely(UUID) TO authenticated;


-- =============================================================================
-- 6. CONVERT_SAVINGS_TO_BOOKING — Konversi tabungan menjadi booking
-- =============================================================================
CREATE OR REPLACE FUNCTION convert_savings_to_booking(
  p_plan_id    UUID,
  p_departure_id UUID,
  p_room_type  TEXT DEFAULT 'quad'
)
RETURNS JSONB AS $$
DECLARE
  v_plan    savings_plans;
  v_customer customers;
  v_booking_code TEXT;
  v_booking_id   UUID;
BEGIN
  SELECT * INTO v_plan FROM savings_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tabungan tidak ditemukan');
  END IF;

  SELECT * INTO v_customer FROM customers WHERE id = v_plan.customer_id;

  v_booking_code := generate_booking_code();

  INSERT INTO bookings (
    customer_id, departure_id, booking_code, status,
    total_price, paid_amount, payment_status, room_type
  ) VALUES (
    v_plan.customer_id, p_departure_id, v_booking_code, 'pending',
    0, v_plan.current_amount, 'partial', p_room_type
  ) RETURNING id INTO v_booking_id;

  UPDATE savings_plans SET status = 'completed' WHERE id = p_plan_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'booking_code', v_booking_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION convert_savings_to_booking(UUID, UUID, TEXT) TO authenticated;


-- =============================================================================
-- 7. CREATE_CUSTOMER_ACCOUNT — Buat akun portal jamaah
-- =============================================================================
CREATE OR REPLACE FUNCTION create_customer_account(
  p_user_id     UUID,
  p_agent_id    UUID DEFAULT NULL,
  p_branch_id   UUID DEFAULT NULL,
  p_agent_slug  TEXT DEFAULT NULL,
  p_branch_slug TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE v_account_id UUID;
BEGIN
  INSERT INTO customer_accounts (
    user_id, referred_by_agent_id, referred_by_branch_id, agent_slug, branch_slug
  ) VALUES (
    p_user_id, p_agent_id, p_branch_id, p_agent_slug, p_branch_slug
  )
  ON CONFLICT (user_id) DO UPDATE SET
    referred_by_agent_id  = COALESCE(customer_accounts.referred_by_agent_id,  EXCLUDED.referred_by_agent_id),
    referred_by_branch_id = COALESCE(customer_accounts.referred_by_branch_id, EXCLUDED.referred_by_branch_id),
    agent_slug  = COALESCE(customer_accounts.agent_slug,  EXCLUDED.agent_slug),
    branch_slug = COALESCE(customer_accounts.branch_slug, EXCLUDED.branch_slug),
    updated_at  = now()
  RETURNING id INTO v_account_id;
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- 8. INCREMENT_WEBSITE_VIEW — Tambah view count website agen/cabang
-- =============================================================================
CREATE OR REPLACE FUNCTION increment_website_view(
  p_agent_id  UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF p_agent_id IS NOT NULL THEN
    UPDATE website_settings
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE agent_id = p_agent_id;
  ELSIF p_branch_id IS NOT NULL THEN
    UPDATE website_settings
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE branch_id = p_branch_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- 9. GET_PUBLIC_BOOKING_DETAILS — Data booking publik tanpa data sensitif (fase26)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_public_booking_details(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result   JSONB;
  v_booking  RECORD;
  v_customer RECORD;
  v_departure RECORD;
  v_package  RECORD;
  v_phone_masked TEXT;
  v_remaining    NUMERIC;
  v_total_pax    INTEGER;
BEGIN
  SELECT b.id, b.booking_code, b.status AS booking_status, b.payment_status,
         b.total_price, b.paid_amount, b.room_type, b.created_at,
         b.customer_id, b.departure_id
  INTO v_booking
  FROM bookings b WHERE b.id = p_booking_id LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  v_remaining := GREATEST(0, COALESCE(v_booking.total_price, 0) - COALESCE(v_booking.paid_amount, 0));

  SELECT c.full_name, c.phone INTO v_customer
  FROM customers c WHERE c.id = v_booking.customer_id LIMIT 1;

  IF v_customer.phone IS NOT NULL AND length(v_customer.phone) >= 4 THEN
    v_phone_masked := repeat('*', GREATEST(0, length(v_customer.phone) - 4))
                      || right(v_customer.phone, 4);
  ELSE
    v_phone_masked := v_customer.phone;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_total_pax
  FROM booking_passengers bp WHERE bp.booking_id = p_booking_id;
  IF v_total_pax IS NULL OR v_total_pax = 0 THEN v_total_pax := 1; END IF;

  IF v_booking.departure_id IS NOT NULL THEN
    SELECT d.departure_date, d.return_date, d.package_id INTO v_departure
    FROM departures d WHERE d.id = v_booking.departure_id LIMIT 1;
    IF FOUND AND v_departure.package_id IS NOT NULL THEN
      SELECT p.name, p.code INTO v_package
      FROM packages p WHERE p.id = v_departure.package_id LIMIT 1;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'id',               v_booking.id,
    'booking_code',     v_booking.booking_code,
    'booking_status',   v_booking.booking_status,
    'payment_status',   CASE v_booking.payment_status
                          WHEN 'unpaid'  THEN 'pending'
                          WHEN 'partial' THEN 'partial'
                          WHEN 'paid'    THEN 'paid'
                          ELSE v_booking.payment_status
                        END,
    'total_price',      COALESCE(v_booking.total_price, 0),
    'paid_amount',      COALESCE(v_booking.paid_amount, 0),
    'remaining_amount', v_remaining,
    'currency',         'IDR',
    'room_type',        COALESCE(v_booking.room_type, 'quad'),
    'total_pax',        v_total_pax,
    'created_at',       v_booking.created_at,
    'customer',         CASE WHEN v_customer IS NOT NULL THEN
                          jsonb_build_object(
                            'full_name',    COALESCE(v_customer.full_name, '—'),
                            'phone_masked', v_phone_masked
                          )
                        ELSE NULL END,
    'departure',        CASE WHEN v_departure IS NOT NULL THEN
                          jsonb_build_object(
                            'departure_date', v_departure.departure_date,
                            'return_date',    v_departure.return_date,
                            'package',        CASE WHEN v_package IS NOT NULL THEN
                                                jsonb_build_object(
                                                  'name', COALESCE(v_package.name, '—'),
                                                  'code', COALESCE(v_package.code, '—')
                                                )
                                              ELSE NULL END
                          )
                        ELSE NULL END
  );
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_booking_details(UUID) TO anon, authenticated;


-- =============================================================================
-- 10. GET_WA_CONFIG_SAFE — Baca config WA tanpa api_key (fase31)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_wa_config_safe()
RETURNS TABLE (
  id              UUID,
  provider        TEXT,
  display_name    TEXT,
  sender_number   TEXT,
  is_active       BOOLEAN,
  provider_config JSONB,
  api_key_set     BOOLEAN,
  api_key_hint    TEXT,
  last_tested_at  TIMESTAMPTZ,
  last_test_ok    BOOLEAN,
  updated_by      UUID,
  updated_at      TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      wc.id,
      wc.provider,
      wc.display_name,
      wc.sender_number,
      wc.is_active,
      wc.provider_config - 'api_token' - 'token' - 'api_key' - 'access_token'
                         - 'auth_header' - 'webhook_secret'  AS provider_config,
      (wc.api_key IS NOT NULL AND wc.api_key <> '')          AS api_key_set,
      CASE
        WHEN wc.api_key IS NULL OR wc.api_key = '' THEN NULL
        ELSE '••••' || RIGHT(wc.api_key, 4)
      END                                                      AS api_key_hint,
      wc.last_tested_at,
      wc.last_test_ok,
      wc.updated_by,
      wc.updated_at
    FROM whatsapp_config wc;
END;
$$;

GRANT EXECUTE ON FUNCTION get_wa_config_safe() TO authenticated;


-- =============================================================================
-- 11. PREVIEW_AUTO_SCHEDULE_REMINDERS — Dry-run reminder pembayaran (fase30)
-- =============================================================================
CREATE OR REPLACE FUNCTION preview_auto_schedule_reminders(
  p_days_before INTEGER[] DEFAULT ARRAY[7, 3]
)
RETURNS TABLE (
  days_before      INTEGER,
  booking_id       UUID,
  booking_code     TEXT,
  full_name        TEXT,
  phone            TEXT,
  payment_deadline DATE,
  remaining_amount NUMERIC,
  already_exists   BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_day INTEGER;
BEGIN
  FOREACH v_day IN ARRAY p_days_before LOOP
    RETURN QUERY
      SELECT
        v_day                              AS days_before,
        b.id                               AS booking_id,
        b.booking_code                     AS booking_code,
        c.full_name                        AS full_name,
        c.phone                            AS phone,
        b.payment_deadline                 AS payment_deadline,
        b.remaining_amount                 AS remaining_amount,
        EXISTS (
          SELECT 1 FROM payment_deadline_reminders pdr
          WHERE pdr.booking_id = b.id
            AND pdr.days_before = v_day
            AND pdr.status IN ('pending','sent')
        )                                  AS already_exists
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.payment_status IN ('unpaid','partial')
        AND b.status NOT IN ('cancelled','completed')
        AND b.payment_deadline IS NOT NULL
        AND b.payment_deadline >= CURRENT_DATE
        AND b.payment_deadline <= CURRENT_DATE + (v_day || ' days')::INTERVAL
        AND c.phone IS NOT NULL
      ORDER BY b.payment_deadline ASC;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION preview_auto_schedule_reminders(INTEGER[]) TO authenticated;


-- =============================================================================
-- 12. AUTO_SCHEDULE_PAYMENT_REMINDERS — Jadwalkan reminder pembayaran (fase30)
-- =============================================================================
CREATE OR REPLACE FUNCTION auto_schedule_payment_reminders(
  p_days_before INTEGER[] DEFAULT ARRAY[7, 3]
)
RETURNS TABLE (created_count INTEGER, skipped_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day      INTEGER;
  v_created  INTEGER := 0;
  v_skipped  INTEGER := 0;
  v_row      RECORD;
  v_inserted INTEGER;
BEGIN
  FOREACH v_day IN ARRAY p_days_before LOOP
    FOR v_row IN
      SELECT b.id AS booking_id, b.booking_code, b.payment_deadline,
             b.remaining_amount, c.phone, c.full_name
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.payment_status IN ('unpaid','partial')
        AND b.status NOT IN ('cancelled','completed')
        AND b.payment_deadline IS NOT NULL
        AND b.payment_deadline >= CURRENT_DATE
        AND b.payment_deadline <= CURRENT_DATE + (v_day || ' days')::INTERVAL
        AND c.phone IS NOT NULL
    LOOP
      INSERT INTO payment_deadline_reminders (
        booking_id, booking_code, phone, full_name,
        payment_deadline, remaining_amount, days_before, status
      ) VALUES (
        v_row.booking_id, v_row.booking_code, v_row.phone, v_row.full_name,
        v_row.payment_deadline, v_row.remaining_amount, v_day, 'pending'
      )
      ON CONFLICT (booking_id, days_before) DO UPDATE
        SET remaining_amount = EXCLUDED.remaining_amount,
            phone            = EXCLUDED.phone,
            full_name        = EXCLUDED.full_name,
            payment_deadline = EXCLUDED.payment_deadline,
            status           = CASE
                                 WHEN payment_deadline_reminders.status = 'cancelled'
                                 THEN 'pending'
                                 ELSE payment_deadline_reminders.status
                               END,
            updated_at = NOW()
        WHERE payment_deadline_reminders.status = 'cancelled';

      GET DIAGNOSTICS v_inserted = ROW_COUNT;

      IF v_inserted > 0 THEN
        v_created := v_created + 1;
      ELSE
        v_skipped := v_skipped + 1;
      END IF;
    END LOOP;
  END LOOP;
  RETURN QUERY SELECT v_created, v_skipped;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_schedule_payment_reminders(INTEGER[]) TO authenticated;


-- =============================================================================
-- 13. RECALCULATE_DEPARTURE_FINANCIAL_SUMMARY (fase28)
-- =============================================================================
CREATE OR REPLACE FUNCTION recalculate_departure_financial_summary(p_departure_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_quota         INTEGER;
  v_pax_confirmed INTEGER;
  v_pax_cancelled INTEGER;
  v_rev_gross     NUMERIC;
  v_rev_paid      NUMERIC;
  v_rev_refunded  NUMERIC;
  v_hpp           NUMERIC;
  v_expense       NUMERIC;
  v_other_rev     NUMERIC;
BEGIN
  SELECT COALESCE(quota, 0) INTO v_quota FROM departures WHERE id = p_departure_id;

  SELECT
    COALESCE(SUM(CASE WHEN status IN ('confirmed','completed') THEN total_pax   ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'cancelled'               THEN total_pax   ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status IN ('confirmed','completed') THEN total_price ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status IN ('confirmed','completed') THEN paid_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_status = 'refunded'        THEN paid_amount ELSE 0 END), 0)
  INTO v_pax_confirmed, v_pax_cancelled, v_rev_gross, v_rev_paid, v_rev_refunded
  FROM bookings WHERE departure_id = p_departure_id;

  SELECT COALESCE(SUM(total_cost_idr), 0) INTO v_hpp
  FROM departure_cost_items WHERE departure_id = p_departure_id;

  SELECT COALESCE(SUM(amount_idr), 0) INTO v_expense
  FROM departure_expenses WHERE departure_id = p_departure_id;

  SELECT COALESCE(SUM(amount_idr), 0) INTO v_other_rev
  FROM departure_other_revenues WHERE departure_id = p_departure_id;

  INSERT INTO departure_financial_summary (
    departure_id, quota, pax_confirmed, pax_cancelled,
    revenue_gross, revenue_paid, revenue_outstanding, revenue_refunded,
    hpp_total, expense_total, other_revenue_total, last_calculated_at, updated_at
  ) VALUES (
    p_departure_id, v_quota, v_pax_confirmed, v_pax_cancelled,
    v_rev_gross, v_rev_paid, v_rev_gross - v_rev_paid, v_rev_refunded,
    v_hpp, v_expense, v_other_rev, NOW(), NOW()
  )
  ON CONFLICT (departure_id) DO UPDATE SET
    quota               = EXCLUDED.quota,
    pax_confirmed       = EXCLUDED.pax_confirmed,
    pax_cancelled       = EXCLUDED.pax_cancelled,
    revenue_gross       = EXCLUDED.revenue_gross,
    revenue_paid        = EXCLUDED.revenue_paid,
    revenue_outstanding = EXCLUDED.revenue_outstanding,
    revenue_refunded    = EXCLUDED.revenue_refunded,
    hpp_total           = EXCLUDED.hpp_total,
    expense_total       = EXCLUDED.expense_total,
    other_revenue_total = EXCLUDED.other_revenue_total,
    last_calculated_at  = NOW(),
    updated_at          = NOW();
END;
$$;


-- =============================================================================
-- 14. SLUG TRIGGERS — Auto-set slug untuk agen & cabang
-- =============================================================================
CREATE OR REPLACE FUNCTION set_agent_slug()
RETURNS TRIGGER AS $$
DECLARE base_slug TEXT; final_slug TEXT; counter INTEGER := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug  := slugify_text(COALESCE(NEW.company_name, NEW.agent_code, NEW.id::TEXT));
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM agents WHERE slug = final_slug AND id != NEW.id) LOOP
      final_slug := base_slug || '-' || counter; counter := counter + 1;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_slug ON agents;
CREATE TRIGGER trg_agent_slug
  BEFORE INSERT OR UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION set_agent_slug();


CREATE OR REPLACE FUNCTION set_branch_slug()
RETURNS TRIGGER AS $$
DECLARE base_slug TEXT; final_slug TEXT; counter INTEGER := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug  := slugify_text(COALESCE(NEW.name, NEW.code, NEW.id::TEXT));
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM branches WHERE slug = final_slug AND id != NEW.id) LOOP
      final_slug := base_slug || '-' || counter; counter := counter + 1;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_branch_slug ON branches;
CREATE TRIGGER trg_branch_slug
  BEFORE INSERT OR UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION set_branch_slug();


-- =============================================================================
-- 15. SEED: PERMISSIONS_LIST
-- =============================================================================
INSERT INTO permissions_list (key, label, group_name, description) VALUES
  ('dashboard','Dashboard','Overview','Halaman utama dashboard'),
  ('analytics','Analytics','Overview','Laporan analitik'),
  ('leads','Leads & Prospek','Penjualan','Manajemen lead calon jamaah'),
  ('bookings','Booking','Penjualan','Manajemen pemesanan paket'),
  ('packages','Paket Umroh & Haji','Penjualan','Manajemen paket wisata'),
  ('coupons','Kupon & Promo','Penjualan','Kode diskon & promosi'),
  ('announcements','Pengumuman','Konten & Marketing','Pengumuman ke jamaah'),
  ('banners','Banner Carousel','Konten & Marketing','Banner halaman depan'),
  ('whatsapp','WhatsApp Blast','Konten & Marketing','Pengiriman WA massal'),
  ('wa-broadcast','WA Broadcast','Konten & Marketing','Broadcast WA tersegmentasi'),
  ('departures','Jadwal Keberangkatan','Keberangkatan','Manajemen jadwal keberangkatan'),
  ('room-assignments','Kamar & Rooming','Keberangkatan','Penempatan kamar jamaah'),
  ('manasik','Manasik','Keberangkatan','Jadwal dan materi manasik'),
  ('equipment','Perlengkapan','Keberangkatan','Distribusi perlengkapan jamaah'),
  ('payments','Pembayaran','Keuangan','Verifikasi & rekap pembayaran'),
  ('finance','Laporan P&L','Keuangan','Laporan laba rugi'),
  ('savings','Program Tabungan','Keuangan','Tabungan umroh'),
  ('reports','Laporan','Keuangan','Laporan keuangan'),
  ('customers','Data Jamaah','Jamaah & Agen','Profil & data jamaah'),
  ('agents','Agen','Jamaah & Agen','Mitra agen'),
  ('branches','Cabang','Jamaah & Agen','Kantor cabang'),
  ('visa','Visa','Jamaah & Agen','Proses visa jamaah'),
  ('hr','SDM / HR','SDM','Manajemen sumber daya manusia'),
  ('payroll','Penggajian','SDM','Gaji dan tunjangan staf'),
  ('hotels','Hotel','Master Data','Data hotel mitra'),
  ('airlines','Maskapai','Master Data','Data maskapai penerbangan'),
  ('vendors','Vendor','Master Data','Data vendor & supplier'),
  ('muthawifs','Muthawif','Master Data','Data muthawif/guide'),
  ('users','Manajemen User','Pengaturan','Akun dan akses staf'),
  ('roles','Manajemen Role','Pengaturan','Hak akses per role'),
  ('appearance','Tampilan & Tema','Pengaturan','Desain dan branding aplikasi'),
  ('settings','Pengaturan Umum','Pengaturan','Konfigurasi sistem'),
  ('store','Toko Online','Penjualan','Toko e-commerce'),
  ('store-products','Produk Toko','Penjualan','Manajemen produk toko'),
  ('store-orders','Pesanan Toko','Penjualan','Manajemen pesanan toko'),
  ('store-categories','Kategori Produk','Penjualan','Kategori produk toko'),
  ('finance-departure','HPP & Keuangan Keberangkatan','Keuangan','HPP, pengeluaran, pendapatan per keberangkatan'),
  ('wa-provider','WA Provider Config','Pengaturan','Konfigurasi provider WhatsApp')
ON CONFLICT (key) DO UPDATE SET
  label       = EXCLUDED.label,
  group_name  = EXCLUDED.group_name,
  description = EXCLUDED.description;


-- =============================================================================
-- 16. SEED: ROLE_PERMISSIONS
-- =============================================================================

-- super_admin & owner: semua akses
INSERT INTO role_permissions (role, permission_key)
SELECT r.role, p.key FROM (VALUES ('super_admin'),('owner')) AS r(role)
CROSS JOIN permissions_list p
ON CONFLICT DO NOTHING;

-- admin
INSERT INTO role_permissions (role, permission_key)
SELECT 'admin', p FROM (VALUES
  ('dashboard'),('analytics'),('leads'),('bookings'),('packages'),('coupons'),
  ('announcements'),('banners'),('whatsapp'),('wa-broadcast'),
  ('departures'),('room-assignments'),('manasik'),('equipment'),
  ('payments'),('finance'),('savings'),('reports'),
  ('customers'),('agents'),('branches'),('visa'),
  ('hr'),('payroll'),('hotels'),('airlines'),('vendors'),('muthawifs'),
  ('users'),('roles'),('appearance'),('settings'),
  ('store'),('store-products'),('store-orders'),('store-categories'),
  ('finance-departure')
) AS t(p)
ON CONFLICT DO NOTHING;

-- branch_manager
INSERT INTO role_permissions (role, permission_key)
SELECT 'branch_manager', p FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('packages'),('departures'),
  ('payments'),('reports'),('agents'),('leads'),('employees'),
  ('vendors'),('hotels'),('muthawifs'),('visa'),('manasik'),
  ('equipment'),('room-assignments'),('finance-departure')
) AS t(p)
ON CONFLICT DO NOTHING;

-- operational
INSERT INTO role_permissions (role, permission_key)
SELECT 'operational', p FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('departures'),
  ('vendors'),('hotels'),('muthawifs'),('visa'),('manasik'),
  ('equipment'),('room-assignments'),('whatsapp'),('wa-broadcast')
) AS t(p)
ON CONFLICT DO NOTHING;

-- finance
INSERT INTO role_permissions (role, permission_key)
SELECT 'finance', p FROM (VALUES
  ('dashboard'),('bookings'),('payments'),('reports'),('finance'),
  ('savings'),('finance-departure')
) AS t(p)
ON CONFLICT DO NOTHING;

-- sales
INSERT INTO role_permissions (role, permission_key)
SELECT 'sales', p FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('leads'),('agents'),('packages'),('coupons')
) AS t(p)
ON CONFLICT DO NOTHING;

-- marketing
INSERT INTO role_permissions (role, permission_key)
SELECT 'marketing', p FROM (VALUES
  ('dashboard'),('leads'),('packages'),('announcements'),('banners'),
  ('whatsapp'),('wa-broadcast'),('store'),('store-products'),('store-categories')
) AS t(p)
ON CONFLICT DO NOTHING;

-- hr
INSERT INTO role_permissions (role, permission_key)
SELECT 'hr', p FROM (VALUES
  ('dashboard'),('hr'),('payroll')
) AS t(p)
ON CONFLICT DO NOTHING;

-- agent
INSERT INTO role_permissions (role, permission_key)
SELECT 'agent', p FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('packages')
) AS t(p)
ON CONFLICT DO NOTHING;

-- sub_agent
INSERT INTO role_permissions (role, permission_key)
SELECT 'sub_agent', p FROM (VALUES ('packages'),('bookings')) AS t(p)
ON CONFLICT DO NOTHING;

-- visa_officer
INSERT INTO role_permissions (role, permission_key)
SELECT 'visa_officer', p FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('visa')
) AS t(p)
ON CONFLICT DO NOTHING;

-- it
INSERT INTO role_permissions (role, permission_key)
SELECT 'it', p FROM (VALUES
  ('dashboard'),('settings'),('users'),('roles'),('whatsapp'),('wa-broadcast'),
  ('wa-provider')
) AS t(p)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 17. SEED: MENU_ITEMS
-- =============================================================================
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible) VALUES
  ('dashboard',          'Dashboard',            '/admin',                      'LayoutDashboard',   'Overview',             10,  'dashboard',          true),
  ('analytics',          'Analytics',            '/admin/analytics',            'BarChart3',         'Overview',             20,  'analytics',          true),
  ('leads',              'Leads',                '/admin/leads',                'Users',             'Penjualan',            110, 'leads',              true),
  ('bookings',           'Booking',              '/admin/bookings',             'BookOpen',          'Penjualan',            120, 'bookings',           true),
  ('packages',           'Paket',                '/admin/packages',             'Package',           'Penjualan',            130, 'packages',           true),
  ('coupons',            'Kupon',                '/admin/coupons',              'Tag',               'Penjualan',            140, 'coupons',            true),
  ('store',              'Toko Online',          '/admin/store',                'ShoppingBag',       'Penjualan',            210, 'store',              true),
  ('store-products',     'Produk Toko',          '/admin/store/products',       'Package',           'Penjualan',            211, 'store-products',     true),
  ('store-orders',       'Pesanan Toko',         '/admin/store/orders',         'ShoppingCart',      'Penjualan',            212, 'store-orders',       true),
  ('store-categories',   'Kategori Produk',      '/admin/store/categories',     'Tag',               'Penjualan',            213, 'store-categories',   true),
  ('announcements',      'Pengumuman',           '/admin/announcements',        'Bell',              'Konten & Marketing',   310, 'announcements',      true),
  ('banners',            'Banner',               '/admin/banners',              'Image',             'Konten & Marketing',   320, 'banners',            true),
  ('whatsapp',           'WhatsApp Blast',       '/admin/whatsapp',             'MessageCircle',     'Konten & Marketing',   330, 'whatsapp',           true),
  ('wa-broadcast',       'WA Broadcast',         '/admin/whatsapp/broadcast',   'Send',              'Konten & Marketing',   340, 'wa-broadcast',       true),
  ('departures',         'Keberangkatan',        '/admin/departures',           'Plane',             'Keberangkatan',        410, 'departures',         true),
  ('room-assignments',   'Kamar & Rooming',      '/admin/room-assignments',     'Hotel',             'Keberangkatan',        420, 'room-assignments',   true),
  ('manasik',            'Manasik',              '/admin/manasik',              'BookOpen',          'Keberangkatan',        430, 'manasik',            true),
  ('equipment',          'Perlengkapan',         '/admin/equipment',            'Package2',          'Keberangkatan',        440, 'equipment',          true),
  ('payments',           'Pembayaran',           '/admin/payments',             'CreditCard',        'Keuangan',             510, 'payments',           true),
  ('finance',            'Laporan P&L',          '/admin/finance',              'TrendingUp',        'Keuangan',             520, 'finance',            true),
  ('finance-departure',  'HPP Keberangkatan',    '/admin/finance/departure',    'Calculator',        'Keuangan',             525, 'finance-departure',  true),
  ('savings',            'Program Tabungan',     '/admin/savings',              'PiggyBank',         'Keuangan',             530, 'savings',            true),
  ('reports',            'Laporan',              '/admin/reports',              'FileText',          'Keuangan',             540, 'reports',            true),
  ('customers',          'Data Jamaah',          '/admin/customers',            'Users',             'Jamaah & Agen',        610, 'customers',          true),
  ('agents',             'Agen',                 '/admin/agents',               'Handshake',         'Jamaah & Agen',        620, 'agents',             true),
  ('branches',           'Cabang',               '/admin/branches',             'Building2',         'Jamaah & Agen',        630, 'branches',           true),
  ('visa',               'Visa',                 '/admin/visa',                 'FileCheck',         'Jamaah & Agen',        640, 'visa',               true),
  ('hr',                 'SDM / HR',             '/admin/hr',                   'UserCheck',         'SDM',                  710, 'hr',                 true),
  ('payroll',            'Penggajian',            '/admin/payroll',              'Wallet',            'SDM',                  720, 'payroll',            true),
  ('hotels',             'Hotel',                '/admin/hotels',               'Hotel',             'Master Data',          810, 'hotels',             true),
  ('airlines',           'Maskapai',             '/admin/airlines',             'Plane',             'Master Data',          820, 'airlines',           true),
  ('vendors',            'Vendor',               '/admin/vendors',              'Building',          'Master Data',          830, 'vendors',            true),
  ('muthawifs',          'Muthawif',             '/admin/muthawifs',            'UserCircle',        'Master Data',          840, 'muthawifs',          true),
  ('users',              'Manajemen User',       '/admin/users',                'Users',             'Pengaturan',           910, 'users',              true),
  ('roles',              'Manajemen Role',       '/admin/roles',                'Shield',            'Pengaturan',           920, 'roles',              true),
  ('wa-provider',        'WA Provider',          '/admin/settings/wa-provider', 'Settings',          'Pengaturan',           930, 'wa-provider',        true),
  ('appearance',         'Tampilan & Tema',      '/admin/appearance',           'Palette',           'Pengaturan',           940, 'appearance',         true),
  ('settings',           'Pengaturan Umum',      '/admin/settings',             'Settings',          'Pengaturan',           950, 'settings',           true)
ON CONFLICT (key) DO UPDATE SET
  label               = EXCLUDED.label,
  path                = EXCLUDED.path,
  icon                = EXCLUDED.icon,
  group_name          = EXCLUDED.group_name,
  sort_order          = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission,
  is_visible          = EXCLUDED.is_visible;


-- =============================================================================
-- 18. AIRLINE SEED — Maskapai umum Indonesia & Timur Tengah
-- =============================================================================
INSERT INTO airlines (name, iata_code, is_active) VALUES
  ('Garuda Indonesia',     'GA',  true),
  ('Saudi Arabian Airlines','SV', true),
  ('Emirates',             'EK',  true),
  ('Qatar Airways',        'QR',  true),
  ('Etihad Airways',       'EY',  true),
  ('Turkish Airlines',     'TK',  true),
  ('Lion Air',             'JT',  true),
  ('Batik Air',            'ID',  true),
  ('Saudia',               'XY',  true),
  ('Flynas',               'F3',  true)
ON CONFLICT (iata_code) DO NOTHING;


-- =============================================================================
-- 19. UPDATE TRIGGER ON departure_financial_summary
-- =============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_financial_summary_updated_at'
    AND tgrelid='departure_financial_summary'::regclass) THEN
    CREATE TRIGGER set_departure_financial_summary_updated_at
      BEFORE UPDATE ON departure_financial_summary
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 20. RPC: CHECK EMAIL / PHONE AVAILABILITY (untuk form registrasi)
-- SECURITY DEFINER agar anon (belum login) bisa memanggil tanpa masalah RLS.
-- Mengembalikan TRUE jika nilai TERSEDIA (belum dipakai), FALSE jika sudah dipakai.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.check_email_available(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM customers
    WHERE lower(trim(email)) = lower(trim(p_email))
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_phone_available(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalised TEXT;
BEGIN
  -- Normalisasi: +628xx → 08xx, 628xx → 08xx, 08xx tetap
  v_normalised :=
    CASE
      WHEN p_phone LIKE '+62%' THEN '0' || substr(trim(p_phone), 4)
      WHEN p_phone LIKE '62%'  THEN '0' || substr(trim(p_phone), 3)
      ELSE trim(p_phone)
    END;

  RETURN NOT EXISTS (
    SELECT 1 FROM customers
    WHERE trim(phone) = trim(p_phone)
       OR trim(phone) = v_normalised
    LIMIT 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_available(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_phone_available(TEXT) TO anon, authenticated;


-- =============================================================================
-- VERIFIKASI AKHIR — Hitung tabel yang berhasil dibuat
-- =============================================================================
SELECT
  COUNT(*) AS total_tables_created,
  string_agg(table_name, ', ' ORDER BY table_name) AS tables
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'profiles','user_roles','role_permissions','permissions_list',
    'airlines','hotels','vendors','branches','agents','muthawifs','employees',
    'packages','departures','document_types','menu_items',
    'customers','customer_documents','customer_mahrams',
    'bookings','booking_passengers','booking_status_history','booking_document_logs','booking_line_items',
    'room_assignments','equipment_distributions',
    'savings_plans','savings_deposits','leads',
    'payment_deadline_reminders','invoice_templates',
    'customer_accounts','customer_notifications','booking_feedback',
    'email_templates','email_logs','notifications','support_tickets',
    'announcements','banners','coupons',
    'visa_applications','sos_alerts',
    'whatsapp_config','whatsapp_templates','whatsapp_logs',
    'wa_broadcast_campaigns','wa_broadcast_logs','wa_feature_roadmap',
    'app_settings','virtual_accounts','agent_monthly_targets',
    'jamaah_doa_sessions','jamaah_jurnal','jamaah_ibadah_targets','jamaah_ibadah_logs','jamaah_badges',
    'approval_requests','approval_actions','notification_templates',
    'payroll_records','leave_requests','leave_quotas','performance_reviews',
    'marketing_campaigns','sales_targets',
    'training_modules','training_quizzes','agent_training_progress',
    'vendor_contracts','departure_budgets','media_gallery','baggage_reference_items',
    'approval_configs','agent_override_commissions',
    'membership_plans','agent_memberships','branch_memberships','branch_commissions',
    'company_settings','bank_accounts','website_settings','contact_page_content','siskohat_sync_logs',
    'departure_cost_items','departure_expenses','departure_other_revenues','departure_financial_summary',
    'store_categories','store_products','store_orders','store_order_items','store_shipments','store_product_reviews'
  );

-- =============================================================================
-- SELESAI — File 07: Functions, RPC & Seed Data
-- Migrasi Vinstour Travel Portal selesai!
-- =============================================================================
SELECT 'File 07 — Functions, RPC & Seed: OK. Migrasi Vinstour selesai!' AS result;

-- ============================================================
-- PATCH_fix_register_and_settings.sql
-- ============================================================
-- =============================================================================
-- PATCH: Fix Registrasi Pengguna Baru + Global Website Settings
--
-- Aman dijalankan di project Supabase yang SUDAH berjalan maupun yang BARU.
-- Semua statement idempotent (bisa dijalankan berkali-kali tanpa efek samping).
--
-- Masalah yang diperbaiki:
--   1. auth/v1/signup 500  — handle_new_user() sekarang tidak pernah abort signup
--   2. website_settings 404 — seed row dengan UUID yang dicari frontend
--   3. customers 500 (email/phone check) — RPC SECURITY DEFINER aman untuk anon
-- =============================================================================


-- ─── PRASYARAT: pastikan helper update_updated_at_column() ada ────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─── 1. Robust handle_new_user() ──────────────────────────────────────────────
-- Dibungkus BEGIN/EXCEPTION agar error DB tidak pernah membatalkan auth signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  BEGIN
    INSERT INTO public.profiles (id, full_name, email, avatar_url)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
      NEW.email,
      NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user: gagal buat profil untuk %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ─── 2. Buat tabel website_settings jika belum ada ───────────────────────────
-- Sengaja tanpa FK ke agents/branches agar PATCH bisa jalan di DB fresh.
-- Jika tabel sudah ada, CREATE TABLE IF NOT EXISTS ini tidak melakukan apa-apa.
CREATE TABLE IF NOT EXISTS public.website_settings (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id           UUID,
  branch_id          UUID,
  company_name       TEXT,
  logo_url           TEXT,
  favicon_url        TEXT,
  active_theme       TEXT NOT NULL DEFAULT 'default',
  primary_color      TEXT,
  accent_color       TEXT,
  foreground_color   TEXT,
  background_color   TEXT,
  body_font          TEXT,
  heading_font       TEXT,
  footer_description TEXT,
  footer_address     TEXT,
  footer_phone       TEXT,
  footer_email       TEXT,
  footer_whatsapp    TEXT,
  footer_bottom_text TEXT,
  footer_links       JSONB,
  custom_sections    JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- Index unik untuk baris global (agent_id IS NULL AND branch_id IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_agent
  ON public.website_settings(agent_id)  WHERE agent_id  IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_branch
  ON public.website_settings(branch_id) WHERE branch_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_global
  ON public.website_settings((1))       WHERE agent_id IS NULL AND branch_id IS NULL;

ALTER TABLE public.website_settings ENABLE ROW LEVEL SECURITY;

-- Kolom-kolom yang ditambahkan oleh migrasi lanjutan — aman jika sudah ada
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS profile_photo_url  TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS banner_url         TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS bio                TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS testimonials       JSONB DEFAULT '[]';
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS gallery_urls       JSONB DEFAULT '[]';
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS seo_title          TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS seo_description    TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS view_count         INTEGER DEFAULT 0;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS social_youtube     TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS social_tiktok      TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS maps_embed_url     TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS chat_bubble_color  TEXT;
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS layout_variant     JSONB DEFAULT '{}';
ALTER TABLE public.website_settings ADD COLUMN IF NOT EXISTS theme_overrides    JSONB DEFAULT '{}';

-- RLS policies (idempotent)
DROP POLICY IF EXISTS "admin_manage_website_settings"      ON public.website_settings;
DROP POLICY IF EXISTS "agent_manage_own_website_settings"  ON public.website_settings;
DROP POLICY IF EXISTS "branch_manage_own_website_settings" ON public.website_settings;
DROP POLICY IF EXISTS "public_read_website_settings"       ON public.website_settings;

CREATE POLICY "admin_manage_website_settings" ON public.website_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "agent_manage_own_website_settings" ON public.website_settings
  FOR ALL USING (
    agent_id IN (SELECT id FROM public.agents WHERE user_id = auth.uid())
  );

CREATE POLICY "branch_manage_own_website_settings" ON public.website_settings
  FOR ALL USING (
    branch_id IN (SELECT id FROM public.branches WHERE manager_user_id = auth.uid())
  );

CREATE POLICY "public_read_website_settings" ON public.website_settings
  FOR SELECT USING (TRUE);

-- Updated-at trigger
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_website_settings_updated_at'
      AND tgrelid = 'public.website_settings'::regclass
  ) THEN
    CREATE TRIGGER set_website_settings_updated_at
      BEFORE UPDATE ON public.website_settings
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;


-- ─── 3. Seed global row dengan UUID yang selalu dicari frontend ───────────────
-- Frontend: .eq("id", "00000000-0000-0000-0000-000000000001")
-- Migrasi lama menyisipkan row dengan UUID acak → 404. Row ini memperbaikinya.
INSERT INTO public.website_settings (
  id,
  company_name,
  active_theme,
  primary_color,
  accent_color,
  footer_description,
  footer_bottom_text
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Vinstour Travel',
  'classic',
  '#16a34a',
  '#0d9488',
  'Layanan perjalanan Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun.',
  '© 2025 Vinstour Travel. All rights reserved.'
)
ON CONFLICT (id) DO UPDATE SET
  company_name       = COALESCE(EXCLUDED.company_name,       website_settings.company_name),
  active_theme       = COALESCE(EXCLUDED.active_theme,       website_settings.active_theme),
  primary_color      = COALESCE(EXCLUDED.primary_color,      website_settings.primary_color),
  accent_color       = COALESCE(EXCLUDED.accent_color,       website_settings.accent_color),
  footer_description = COALESCE(EXCLUDED.footer_description, website_settings.footer_description),
  updated_at         = NOW();


-- ─── 4. RPC aman untuk cek email & telepon dari form registrasi ──────────────
-- SECURITY DEFINER → bypass RLS, aman dipanggil oleh anon (belum login).
-- Kembalikan TRUE  = tersedia (belum dipakai)
-- Kembalikan FALSE = sudah terdaftar
CREATE OR REPLACE FUNCTION public.check_email_available(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM customers
    WHERE lower(trim(email)) = lower(trim(p_email))
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_phone_available(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalised TEXT;
BEGIN
  -- Normalisasi: +628xx → 08xx, 628xx → 08xx, 08xx tetap
  v_normalised :=
    CASE
      WHEN p_phone LIKE '+62%' THEN '0' || substr(trim(p_phone), 4)
      WHEN p_phone LIKE '62%'  THEN '0' || substr(trim(p_phone), 3)
      ELSE trim(p_phone)
    END;

  RETURN NOT EXISTS (
    SELECT 1 FROM customers
    WHERE trim(phone) = trim(p_phone)
       OR trim(phone) = v_normalised
    LIMIT 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_available(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_phone_available(TEXT) TO anon, authenticated;


SELECT 'PATCH berhasil — handle_new_user, website_settings, dan RPC sudah diperbaiki' AS result;
