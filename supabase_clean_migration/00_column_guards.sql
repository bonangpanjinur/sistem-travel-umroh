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
