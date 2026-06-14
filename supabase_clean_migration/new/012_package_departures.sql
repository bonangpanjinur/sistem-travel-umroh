-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 012: Package Departures & Timeline
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. DEPARTURES — Jadwal keberangkatan per paket
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departures (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id           UUID        NOT NULL REFERENCES public.packages(id) ON DELETE RESTRICT,
  airline_id           UUID        REFERENCES public.airlines(id) ON DELETE SET NULL,
  hotel_makkah_id      UUID        REFERENCES public.hotels(id) ON DELETE SET NULL,
  hotel_madinah_id     UUID        REFERENCES public.hotels(id) ON DELETE SET NULL,
  departure_date       DATE        NOT NULL,
  return_date          DATE        NOT NULL,
  quota                INTEGER     NOT NULL DEFAULT 40,
  available_seats      INTEGER     NOT NULL DEFAULT 40,
  status               TEXT        NOT NULL DEFAULT 'draft'
                                   CHECK (status IN ('draft','open','full','closed',
                                                      'departed','completed','cancelled')),
  price_quad           NUMERIC,
  price_triple         NUMERIC,
  price_double         NUMERIC,
  price_single         NUMERIC,
  flight_number        TEXT,
  flight_number_return TEXT,
  embarkation_city     TEXT,
  notes                TEXT,
  internal_notes       TEXT,
  lead_pic             UUID        REFERENCES public.profiles(id) ON DELETE SET NULL,
  branch_id            UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  created_by           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (return_date >= departure_date)
);

-- Jika tabel sudah ada dari schema lama, tambahkan kolom baru secara idempotent
ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS airline_id           UUID REFERENCES public.airlines(id) ON DELETE SET NULL;
ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS hotel_makkah_id      UUID REFERENCES public.hotels(id) ON DELETE SET NULL;
ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS hotel_madinah_id     UUID REFERENCES public.hotels(id) ON DELETE SET NULL;
ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS price_quad           NUMERIC;
ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS price_triple         NUMERIC;
ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS price_double         NUMERIC;
ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS price_single         NUMERIC;
ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS flight_number        TEXT;
ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS flight_number_return TEXT;
ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS embarkation_city     TEXT;
ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS internal_notes       TEXT;
ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS lead_pic             UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS branch_id            UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.departures ADD COLUMN IF NOT EXISTS created_by           UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.departures ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_departures_package    ON public.departures(package_id);
CREATE INDEX IF NOT EXISTS idx_departures_status     ON public.departures(status, departure_date);
CREATE INDEX IF NOT EXISTS idx_departures_branch     ON public.departures(branch_id);
CREATE INDEX IF NOT EXISTS idx_departures_date       ON public.departures(departure_date);

-- ---------------------------------------------------------------------------
-- 2. DEPARTURE_MULTI_HOTELS — Multiple hotel per departure (kompleks)
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

CREATE INDEX IF NOT EXISTS idx_dep_multi_hotels_departure
  ON public.departure_multi_hotels(departure_id);

-- ---------------------------------------------------------------------------
-- 3. TRIP_TIMELINE — Event harian per departure
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
                             CHECK (event_type IN ('flight','hotel','ibadah','activity',
                                                    'transfer','free')),
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.trip_timeline ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_trip_timeline_departure
  ON public.trip_timeline(departure_id, day_number);

-- ---------------------------------------------------------------------------
-- 4. DEPARTURE_WAITING_LIST — Waiting list untuk departure penuh
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departure_waiting_list (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id   UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  customer_id    UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  full_name      TEXT        NOT NULL,
  phone          TEXT,
  email          TEXT,
  pax_count      INTEGER     NOT NULL DEFAULT 1,
  room_type      TEXT        CHECK (room_type IN ('quad','triple','double','single')),
  notes          TEXT,
  status         TEXT        NOT NULL DEFAULT 'waiting'
                             CHECK (status IN ('waiting','contacted','converted','cancelled')),
  notified_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.departure_waiting_list ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_waiting_list_departure
  ON public.departure_waiting_list(departure_id);

-- ---------------------------------------------------------------------------
-- 5. DEPARTURE_FINANCIAL_SUMMARY — Ringkasan keuangan per departure
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departure_financial_summary (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id         UUID        NOT NULL UNIQUE REFERENCES public.departures(id) ON DELETE CASCADE,
  quota                INTEGER     NOT NULL DEFAULT 0,
  pax_confirmed        INTEGER     NOT NULL DEFAULT 0,
  pax_cancelled        INTEGER     NOT NULL DEFAULT 0,
  revenue_gross        NUMERIC     NOT NULL DEFAULT 0,
  revenue_paid         NUMERIC     NOT NULL DEFAULT 0,
  revenue_outstanding  NUMERIC     NOT NULL DEFAULT 0,
  revenue_refunded     NUMERIC     NOT NULL DEFAULT 0,
  hpp_total            NUMERIC     NOT NULL DEFAULT 0,
  expense_total        NUMERIC     NOT NULL DEFAULT 0,
  other_revenue_total  NUMERIC     NOT NULL DEFAULT 0,
  gross_profit         NUMERIC     GENERATED ALWAYS AS
                         (revenue_gross - hpp_total - expense_total + other_revenue_total) STORED,
  gross_margin_pct     NUMERIC     GENERATED ALWAYS AS
                         (CASE WHEN revenue_gross > 0
                               THEN ROUND(((revenue_gross - hpp_total - expense_total + other_revenue_total)
                                           / revenue_gross * 100)::NUMERIC, 2)
                               ELSE 0 END) STORED,
  last_calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.departure_financial_summary ENABLE ROW LEVEL SECURITY;
