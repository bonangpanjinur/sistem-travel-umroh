-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 004: Travel Catalog, Customers, Bookings & Operations
--   airlines, hotels, hotel_room_capacities, vendors, packages,
--   package_hpp_templates, departures, departure_multi_hotels,
--   customers, customer_accounts, customer_documents, customer_mahrams,
--   leads, bookings, booking_passengers, booking_line_items,
--   booking_seat_locks, booking_access_tokens, booking_document_logs,
--   payments, bank_accounts, savings_plans, savings_deposits,
--   savings_schedules, payment_deadline_reminders, coupons, waiting_list,
--   visa_applications, invoice_templates, midtrans_webhook_logs,
--   announcements, banners, manasik_sessions, room_assignments,
--   equipment_items, equipment_distributions, baggage_reference_items,
--   sos_alerts, approval_configs, approval_requests,
--   airports, ibadah_progress, trip_timeline, contact_messages
-- Run AFTER 003. Idempotent — IF NOT EXISTS throughout.
-- RLS policies: see 009_rls_policies.sql
-- Triggers:     see 008_triggers.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. AIRLINES — Maskapai penerbangan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.airlines (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  iata_code    TEXT        UNIQUE,
  icao_code    TEXT,
  logo_url     TEXT,
  country      TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.airlines ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. AIRPORTS — Data bandara (IATA reference)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.airports (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  iata_code    TEXT        NOT NULL UNIQUE,
  icao_code    TEXT,
  name         TEXT        NOT NULL,
  city         TEXT,
  country      TEXT,
  country_code TEXT,
  timezone     TEXT,
  latitude     NUMERIC,
  longitude    NUMERIC,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.airports ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. HOTELS — Hotel database Mekkah & Madinah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotels (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  city             TEXT        NOT NULL CHECK (city IN ('makkah','madinah','jeddah','other')),
  address          TEXT,
  star_rating      INTEGER     CHECK (star_rating BETWEEN 1 AND 5),
  distance_to_haram NUMERIC,
  photo_url        TEXT,
  photos           TEXT[],
  amenities        TEXT[],
  description      TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.hotels ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. HOTEL_ROOM_CAPACITIES — Kapasitas kamar per tipe
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.hotel_room_capacities (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id     UUID        NOT NULL REFERENCES public.hotels(id) ON DELETE CASCADE,
  room_type    TEXT        NOT NULL CHECK (room_type IN ('quad','triple','double','single')),
  capacity     INTEGER     NOT NULL DEFAULT 4,
  UNIQUE (hotel_id, room_type)
);

ALTER TABLE public.hotel_room_capacities ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. VENDORS — Supplier / vendor penyedia layanan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendors (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  vendor_type      TEXT        NOT NULL DEFAULT 'general'
                               CHECK (vendor_type IN ('airline','hotel','transport','visa',
                                                       'insurance','catering','general')),
  contact_person   TEXT,
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  country          TEXT,
  currency         TEXT        NOT NULL DEFAULT 'IDR',
  payment_terms    TEXT,
  tax_number       TEXT,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 6. PACKAGES — Paket umroh & haji
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.packages (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT        NOT NULL,
  code                TEXT        UNIQUE,
  slug                TEXT        UNIQUE,
  package_type        TEXT        NOT NULL DEFAULT 'umroh'
                                  CHECK (package_type IN ('umroh','haji','wisata','haji_plus')),
  duration_days       INTEGER     NOT NULL DEFAULT 9,
  airline_id          UUID        REFERENCES public.airlines(id) ON DELETE SET NULL,
  hotel_makkah_id     UUID        REFERENCES public.hotels(id) ON DELETE SET NULL,
  hotel_madinah_id    UUID        REFERENCES public.hotels(id) ON DELETE SET NULL,
  hotel_makkah_nights INTEGER     NOT NULL DEFAULT 4,
  hotel_madinah_nights INTEGER    NOT NULL DEFAULT 4,
  room_type_default   TEXT        NOT NULL DEFAULT 'quad'
                                  CHECK (room_type_default IN ('quad','triple','double','single')),
  base_price_quad     NUMERIC     NOT NULL DEFAULT 0,
  base_price_triple   NUMERIC     NOT NULL DEFAULT 0,
  base_price_double   NUMERIC     NOT NULL DEFAULT 0,
  base_price_single   NUMERIC     NOT NULL DEFAULT 0,
  includes            TEXT[],
  excludes            TEXT[],
  description         TEXT,
  highlights          TEXT[],
  itinerary           JSONB,
  photo_url           TEXT,
  photos              TEXT[],
  thumbnail_url       TEXT,
  label_id            UUID        REFERENCES public.package_labels(id) ON DELETE SET NULL,
  group_id            UUID        REFERENCES public.package_groups(id) ON DELETE SET NULL,
  is_published        BOOLEAN     NOT NULL DEFAULT FALSE,
  is_featured         BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order          INTEGER     NOT NULL DEFAULT 0,
  seo_title           TEXT,
  seo_description     TEXT,
  seo_keywords        TEXT[],
  created_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 7. PACKAGE_HPP_TEMPLATES — Template harga pokok paket
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.package_hpp_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id   UUID        NOT NULL REFERENCES public.packages(id) ON DELETE CASCADE,
  item_name    TEXT        NOT NULL,
  item_type    TEXT        NOT NULL DEFAULT 'per_pax'
                           CHECK (item_type IN ('per_pax','fixed','per_room','per_night')),
  cost_usd     NUMERIC     NOT NULL DEFAULT 0,
  cost_idr     NUMERIC     NOT NULL DEFAULT 0,
  vendor_id    UUID        REFERENCES public.vendors(id) ON DELETE SET NULL,
  notes        TEXT,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.package_hpp_templates ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 8. DEPARTURES — Jadwal keberangkatan per paket
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departures (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id       UUID        NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  airline_id       UUID        REFERENCES public.airlines(id) ON DELETE SET NULL,
  hotel_makkah_id  UUID        REFERENCES public.hotels(id) ON DELETE SET NULL,
  hotel_madinah_id UUID        REFERENCES public.hotels(id) ON DELETE SET NULL,
  departure_date   DATE        NOT NULL,
  return_date      DATE        NOT NULL,
  quota            INTEGER     NOT NULL DEFAULT 40,
  available_seats  INTEGER     NOT NULL DEFAULT 40,
  status           TEXT        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','open','full','closed',
                                                  'departed','completed','cancelled')),
  price_quad       NUMERIC,
  price_triple     NUMERIC,
  price_double     NUMERIC,
  price_single     NUMERIC,
  flight_number    TEXT,
  flight_number_return TEXT,
  embarkation_city TEXT,
  notes            TEXT,
  internal_notes   TEXT,
  lead_pic         UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  branch_id        UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  created_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.departures ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 9. DEPARTURE_MULTI_HOTELS — Multiple hotel stops for complex departures
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departure_multi_hotels (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id   UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  city           TEXT        NOT NULL,
  hotel_id       UUID        REFERENCES public.hotels(id) ON DELETE SET NULL,
  check_in_date  DATE,
  check_out_date DATE,
  nights         INTEGER,
  notes          TEXT,
  sort_order     INTEGER     NOT NULL DEFAULT 0
);

ALTER TABLE public.departure_multi_hotels ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 10. TRIP_TIMELINE — Event timeline for a departure
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.trip_timeline (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id   UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  day_number     INTEGER     NOT NULL,
  event_date     DATE,
  title          TEXT        NOT NULL,
  description    TEXT,
  location       TEXT,
  event_type     TEXT        DEFAULT 'activity'
                             CHECK (event_type IN ('flight','hotel','ibadah','activity','transfer','free')),
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.trip_timeline ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 11. CUSTOMERS — Data jamaah / calon jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id        UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  agent_id         UUID        REFERENCES public.agents(id) ON DELETE SET NULL,
  customer_code    TEXT        UNIQUE,
  full_name        TEXT        NOT NULL,
  nik              TEXT,
  passport_no      TEXT,
  passport_expiry  DATE,
  gender           TEXT        CHECK (gender IN ('male','female')),
  birth_date       DATE,
  birth_place      TEXT,
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  city             TEXT,
  province         TEXT,
  postal_code      TEXT,
  nationality      TEXT        NOT NULL DEFAULT 'Indonesia',
  education        TEXT,
  occupation       TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relation TEXT,
  photo_url        TEXT,
  health_notes     TEXT,
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','inactive','blacklisted')),
  notes            TEXT,
  meta_data        JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 12. CUSTOMER_ACCOUNTS — Portal access record for customers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_accounts (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id           UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  referred_by_agent_id  UUID        REFERENCES public.agents(id) ON DELETE SET NULL,
  referred_by_branch_id UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  agent_slug            TEXT,
  branch_slug           TEXT,
  loyalty_points        INTEGER     NOT NULL DEFAULT 0,
  total_bookings        INTEGER     NOT NULL DEFAULT 0,
  total_spent           NUMERIC     NOT NULL DEFAULT 0,
  is_verified           BOOLEAN     NOT NULL DEFAULT FALSE,
  verified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customer_accounts ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 13. CUSTOMER_DOCUMENTS — Upload dokumen jamaah (paspor, KTP, dll)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_documents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id      UUID,
  document_type   TEXT        NOT NULL
                              CHECK (document_type IN ('ktp','passport','photo','family_card',
                                                        'birth_certificate','marriage_cert',
                                                        'vaccination','other')),
  file_url        TEXT        NOT NULL,
  file_name       TEXT,
  file_size       INTEGER,
  mime_type       TEXT,
  expiry_date     DATE,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','verified','rejected','expired')),
  notes           TEXT,
  verified_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 14. CUSTOMER_MAHRAMS — Mahram relationship between customers
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_mahrams (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  mahram_id      UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  relationship   TEXT        NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, mahram_id)
);

ALTER TABLE public.customer_mahrams ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 15. LEADS — Prospek / calon jamaah belum booking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leads (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name      TEXT        NOT NULL,
  phone          TEXT,
  email          TEXT,
  source         TEXT        DEFAULT 'website'
                             CHECK (source IN ('website','whatsapp','referral','walk_in',
                                               'social_media','agent','other')),
  interest       TEXT,
  package_id     UUID        REFERENCES public.packages(id) ON DELETE SET NULL,
  branch_id      UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  agent_id       UUID        REFERENCES public.agents(id) ON DELETE SET NULL,
  assigned_to    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  status         TEXT        NOT NULL DEFAULT 'new'
                             CHECK (status IN ('new','contacted','interested','negotiating',
                                               'converted','lost','inactive')),
  notes          TEXT,
  last_contact   TIMESTAMPTZ,
  converted_at   TIMESTAMPTZ,
  customer_id    UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 16. COUPONS — Kode kupon & promosi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.coupons (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code              TEXT        NOT NULL UNIQUE,
  name              TEXT        NOT NULL,
  description       TEXT,
  discount_type     TEXT        NOT NULL DEFAULT 'percentage'
                                CHECK (discount_type IN ('percentage','fixed')),
  discount_value    NUMERIC     NOT NULL,
  min_booking_value NUMERIC     NOT NULL DEFAULT 0,
  max_discount      NUMERIC,
  max_usage         INTEGER,
  usage_count       INTEGER     NOT NULL DEFAULT 0,
  usage_per_user    INTEGER     NOT NULL DEFAULT 1,
  valid_from        TIMESTAMPTZ,
  valid_until       TIMESTAMPTZ,
  applicable_to     TEXT        NOT NULL DEFAULT 'all'
                                CHECK (applicable_to IN ('all','package','departure')),
  package_ids       UUID[],
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 17. BANK_ACCOUNTS — Rekening bank perusahaan untuk pembayaran
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bank_accounts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name      TEXT        NOT NULL,
  account_number TEXT        NOT NULL,
  account_name   TEXT        NOT NULL,
  branch_name    TEXT,
  is_primary     BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  qr_code_url    TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 18. BOOKINGS — Pemesanan paket oleh jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code        TEXT        NOT NULL UNIQUE,
  customer_id         UUID        NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  departure_id        UUID        REFERENCES public.departures(id) ON DELETE SET NULL,
  agent_id            UUID        REFERENCES public.agents(id) ON DELETE SET NULL,
  branch_id           UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  handled_by          UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  coupon_id           UUID        REFERENCES public.coupons(id) ON DELETE SET NULL,
  status              TEXT        NOT NULL DEFAULT 'pending'
                                  CHECK (status IN ('pending','confirmed','completed','cancelled')),
  room_type           TEXT        NOT NULL DEFAULT 'quad'
                                  CHECK (room_type IN ('quad','triple','double','single')),
  total_pax           INTEGER     NOT NULL DEFAULT 1,
  total_price         NUMERIC     NOT NULL DEFAULT 0,
  discount_amount     NUMERIC     NOT NULL DEFAULT 0,
  paid_amount         NUMERIC     NOT NULL DEFAULT 0,
  remaining_amount    NUMERIC     GENERATED ALWAYS AS (GREATEST(0, total_price - discount_amount - paid_amount)) STORED,
  payment_status      TEXT        NOT NULL DEFAULT 'unpaid'
                                  CHECK (payment_status IN ('unpaid','partial','paid','refunded','overpaid')),
  payment_deadline    DATE,
  special_requests    TEXT,
  internal_notes      TEXT,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  confirmed_at        TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  source              TEXT        DEFAULT 'staff'
                                  CHECK (source IN ('staff','portal','agent','website','api')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- FK from customer_documents back to bookings (circular reference guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'customer_documents_booking_id_fkey'
      AND table_name = 'customer_documents'
  ) THEN
    ALTER TABLE public.customer_documents
      ADD CONSTRAINT customer_documents_booking_id_fkey
      FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- ---------------------------------------------------------------------------
-- 19. BOOKING_PASSENGERS — Data penumpang per booking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_passengers (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id      UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  full_name        TEXT        NOT NULL,
  nik              TEXT,
  passport_no      TEXT,
  passport_expiry  DATE,
  gender           TEXT        CHECK (gender IN ('male','female')),
  birth_date       DATE,
  birth_place      TEXT,
  nationality      TEXT        NOT NULL DEFAULT 'Indonesia',
  relationship     TEXT        NOT NULL DEFAULT 'primary'
                               CHECK (relationship IN ('primary','spouse','child','parent','sibling','other')),
  mahram_id        UUID,
  room_assignment  TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.booking_passengers ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 20. BOOKING_LINE_ITEMS — Rincian harga per item dalam booking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_line_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  item_type    TEXT        NOT NULL DEFAULT 'package'
                           CHECK (item_type IN ('package','addon','surcharge','discount','fee')),
  description  TEXT        NOT NULL,
  quantity     INTEGER     NOT NULL DEFAULT 1,
  unit_price   NUMERIC     NOT NULL DEFAULT 0,
  total_price  NUMERIC     GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.booking_line_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 21. BOOKING_SEAT_LOCKS — Temporary seat holds (to prevent overbooking)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_seat_locks (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  session_id   TEXT        NOT NULL,
  seats        INTEGER     NOT NULL DEFAULT 1,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.booking_seat_locks ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 22. BOOKING_ACCESS_TOKENS — Tokenised public access to booking status
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_access_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  token        TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32),'hex'),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  used_count   INTEGER     NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.booking_access_tokens ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 23. BOOKING_DOCUMENT_LOGS — History of document submission per booking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_document_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  action       TEXT        NOT NULL,
  document_id  UUID,
  actor_id     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.booking_document_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 24. PAYMENTS — Riwayat pembayaran per booking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  amount           NUMERIC     NOT NULL CHECK (amount > 0),
  payment_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  payment_method   TEXT        NOT NULL DEFAULT 'transfer'
                               CHECK (payment_method IN ('transfer','cash','midtrans',
                                                          'qris','debit','credit_card','other')),
  bank_account_id  UUID        REFERENCES public.bank_accounts(id) ON DELETE SET NULL,
  reference_no     TEXT,
  proof_url        TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','verified','rejected','refunded')),
  verified_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  notes            TEXT,
  is_dp            BOOLEAN     NOT NULL DEFAULT FALSE,
  midtrans_order_id TEXT,
  midtrans_data    JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 25. MIDTRANS_WEBHOOK_LOGS — Payment gateway incoming webhooks
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.midtrans_webhook_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       TEXT        NOT NULL,
  transaction_id TEXT,
  status_code    TEXT,
  gross_amount   NUMERIC,
  payment_type   TEXT,
  fraud_status   TEXT,
  transaction_status TEXT,
  raw_payload    JSONB,
  processed      BOOLEAN     NOT NULL DEFAULT FALSE,
  processed_at   TIMESTAMPTZ,
  error          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.midtrans_webhook_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 26. INVOICE_TEMPLATES — Printable invoice layout templates
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  type         TEXT        NOT NULL DEFAULT 'booking'
                           CHECK (type IN ('booking','payment','proforma','receipt')),
  html_content TEXT,
  variables    TEXT[],
  is_default   BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 27. PAYMENT_DEADLINE_REMINDERS — Scheduled payment deadline reminders
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_deadline_reminders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  booking_code     TEXT        NOT NULL,
  phone            TEXT,
  full_name        TEXT,
  payment_deadline DATE,
  remaining_amount NUMERIC,
  days_before      INTEGER     NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','sent','failed','cancelled')),
  sent_at          TIMESTAMPTZ,
  error_msg        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (booking_id, days_before)
);

ALTER TABLE public.payment_deadline_reminders ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 28. SAVINGS_PLANS — Program tabungan umroh bertahap
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_plans (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID        NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  plan_code        TEXT        UNIQUE,
  target_amount    NUMERIC     NOT NULL CHECK (target_amount > 0),
  current_amount   NUMERIC     NOT NULL DEFAULT 0,
  monthly_target   NUMERIC,
  start_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  target_date      DATE,
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','paused','completed','cancelled')),
  package_id       UUID        REFERENCES public.packages(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.savings_plans ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 29. SAVINGS_DEPOSITS — Setoran tabungan per periode
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_deposits (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id        UUID        NOT NULL REFERENCES public.savings_plans(id) ON DELETE CASCADE,
  amount         NUMERIC     NOT NULL CHECK (amount > 0),
  deposit_date   DATE        NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT        NOT NULL DEFAULT 'transfer'
                             CHECK (payment_method IN ('transfer','cash','debit','qris','other')),
  reference_no   TEXT,
  proof_url      TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','verified','rejected')),
  verified_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at    TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.savings_deposits ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 30. SAVINGS_SCHEDULES — Jadwal setoran otomatis
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.savings_schedules (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id        UUID        NOT NULL REFERENCES public.savings_plans(id) ON DELETE CASCADE,
  due_date       DATE        NOT NULL,
  amount         NUMERIC     NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'upcoming'
                             CHECK (status IN ('upcoming','paid','overdue','skipped')),
  reminder_sent  BOOLEAN     NOT NULL DEFAULT FALSE,
  reminded_at    TIMESTAMPTZ,
  paid_at        TIMESTAMPTZ,
  deposit_id     UUID        REFERENCES public.savings_deposits(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.savings_schedules ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 31. WAITING_LIST — Antrean booking saat departure penuh
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.waiting_list (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  customer_id  UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  room_type    TEXT        DEFAULT 'quad'
                           CHECK (room_type IN ('quad','triple','double','single')),
  seats        INTEGER     NOT NULL DEFAULT 1,
  status       TEXT        NOT NULL DEFAULT 'waiting'
                           CHECK (status IN ('waiting','offered','confirmed','expired','cancelled')),
  offered_at   TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.waiting_list ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 32. ANNOUNCEMENTS — Pengumuman kepada jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  content      TEXT        NOT NULL,
  type         TEXT        NOT NULL DEFAULT 'info'
                           CHECK (type IN ('info','warning','urgent','event')),
  target       TEXT        NOT NULL DEFAULT 'all'
                           CHECK (target IN ('all','confirmed','departed','branch')),
  departure_id UUID        REFERENCES public.departures(id) ON DELETE SET NULL,
  branch_id    UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  is_published BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 33. BANNERS — Banner carousel halaman depan website
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banners (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT        NOT NULL,
  subtitle     TEXT,
  image_url    TEXT        NOT NULL,
  link_url     TEXT,
  link_text    TEXT,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  starts_at    TIMESTAMPTZ,
  ends_at      TIMESTAMPTZ,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 34. VISA_APPLICATIONS — Pengajuan & tracking visa jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.visa_applications (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id      UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  departure_id     UUID        REFERENCES public.departures(id) ON DELETE SET NULL,
  passport_no      TEXT,
  passport_expiry  DATE,
  application_date DATE,
  status           TEXT        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','submitted','in_review',
                                                  'approved','rejected','expired')),
  visa_number      TEXT,
  visa_expiry      DATE,
  rejection_reason TEXT,
  submitted_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  submission_ref   TEXT,
  notes            TEXT,
  meta_data        JSONB,
  submitted_at     TIMESTAMPTZ,
  approved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.visa_applications ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 35. MANASIK_SESSIONS — Sesi bimbingan ibadah / manasik
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manasik_sessions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id   UUID        REFERENCES public.departures(id) ON DELETE SET NULL,
  branch_id      UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  title          TEXT        NOT NULL,
  description    TEXT,
  session_date   TIMESTAMPTZ NOT NULL,
  duration_min   INTEGER     NOT NULL DEFAULT 120,
  location       TEXT,
  location_maps  TEXT,
  is_online      BOOLEAN     NOT NULL DEFAULT FALSE,
  meeting_url    TEXT,
  speaker        TEXT,
  materials_url  TEXT[],
  max_attendees  INTEGER,
  is_mandatory   BOOLEAN     NOT NULL DEFAULT FALSE,
  status         TEXT        NOT NULL DEFAULT 'scheduled'
                             CHECK (status IN ('scheduled','ongoing','completed','cancelled')),
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.manasik_sessions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 36. ROOM_ASSIGNMENTS — Penempatan kamar jamaah di hotel
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_assignments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id     UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  hotel_id         UUID        REFERENCES public.hotels(id) ON DELETE SET NULL,
  room_number      TEXT        NOT NULL,
  floor            TEXT,
  room_type        TEXT        NOT NULL DEFAULT 'quad'
                               CHECK (room_type IN ('quad','triple','double','single')),
  capacity         INTEGER     NOT NULL DEFAULT 4,
  city             TEXT        CHECK (city IN ('makkah','madinah','jeddah','other')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.room_assignments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 37. EQUIPMENT_ITEMS — Master data perlengkapan jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment_items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  category         TEXT,
  description      TEXT,
  stock_quantity   INTEGER     NOT NULL DEFAULT 0,
  unit             TEXT        NOT NULL DEFAULT 'pcs',
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.equipment_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 38. EQUIPMENT_DISTRIBUTIONS — Distribusi perlengkapan per booking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.equipment_distributions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id     UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  booking_id       UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id      UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  equipment_id     UUID        NOT NULL REFERENCES public.equipment_items(id) ON DELETE RESTRICT,
  quantity         INTEGER     NOT NULL DEFAULT 1,
  distributed_at   TIMESTAMPTZ,
  distributed_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','distributed','returned','damaged')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.equipment_distributions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 39. BAGGAGE_REFERENCE_ITEMS — Referensi bawaan standar jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.baggage_reference_items (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT        NOT NULL,
  category             TEXT,
  estimated_weight_kg  NUMERIC,
  is_mandatory         BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.baggage_reference_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 40. SOS_ALERTS — Emergency SOS alert dari jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sos_alerts (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id    UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id     UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  departure_id   UUID        REFERENCES public.departures(id) ON DELETE SET NULL,
  message        TEXT        NOT NULL,
  severity       TEXT        NOT NULL DEFAULT 'medium'
                             CHECK (severity IN ('low','medium','high','critical')),
  location_text  TEXT,
  latitude       NUMERIC,
  longitude      NUMERIC,
  status         TEXT        NOT NULL DEFAULT 'open'
                             CHECK (status IN ('open','acknowledged','resolved','false_alarm')),
  acknowledged_by UUID       REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at    TIMESTAMPTZ,
  resolution_note TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 41. APPROVAL_CONFIGS — Konfigurasi alur persetujuan multi-level
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.approval_configs (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type                  TEXT        NOT NULL
                                    CHECK (type IN ('refund','discount','cancellation',
                                                     'vendor_invoice','expense','payroll')),
  level                 INTEGER     NOT NULL CHECK (level BETWEEN 1 AND 5),
  required_role         TEXT        NOT NULL,
  amount_threshold      NUMERIC,
  percentage_threshold  NUMERIC,
  auto_approve_below    NUMERIC,
  is_active             BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (type, level, required_role)
);

ALTER TABLE public.approval_configs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 42. APPROVAL_REQUESTS — Permintaan persetujuan (refund, diskon, dll)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type             TEXT        NOT NULL
                               CHECK (type IN ('refund','discount','cancellation',
                                               'vendor_invoice','expense','payroll')),
  reference_id     UUID        NOT NULL,
  reference_table  TEXT        NOT NULL,
  amount           NUMERIC,
  percentage       NUMERIC,
  reason           TEXT,
  current_level    INTEGER     NOT NULL DEFAULT 1,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','rejected','escalated','cancelled')),
  requested_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  rejected_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  rejected_at      TIMESTAMPTZ,
  approver_notes   TEXT,
  meta_data        JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 43. IBADAH_PROGRESS — Tracking ibadah jamaah selama perjalanan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ibadah_progress (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id   UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  customer_id    UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  ibadah_type    TEXT        NOT NULL
                             CHECK (ibadah_type IN ('tawaf','sai','tahallul','sa','wukuf',
                                                     'mabit','jamarat','other')),
  completed      BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_at   TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (departure_id, customer_id, ibadah_type)
);

ALTER TABLE public.ibadah_progress ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 44. CONTACT_MESSAGES — Pesan dari form kontak website
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    TEXT        NOT NULL,
  email        TEXT,
  phone        TEXT,
  subject      TEXT,
  message      TEXT        NOT NULL,
  source       TEXT        DEFAULT 'website',
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  replied_at   TIMESTAMPTZ,
  replied_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Grant permissions
DO $$
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
  GRANT ALL    ON ALL TABLES IN SCHEMA public TO service_role;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'GRANT on tables skipped: %', SQLERRM;
END;
$$;

SELECT '004_tables_travel: OK' AS result;
