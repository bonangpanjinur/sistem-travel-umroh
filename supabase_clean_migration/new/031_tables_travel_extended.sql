-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 031: Travel Extended Tables
--   customers, customer_documents, customer_mahrams,
--   departure_hotels, departure_itineraries, departure_checklists,
--   manifests, luggage,
--   bus_providers, bus_assignments, bus_passengers,
--   haji_registrations, haji_waiting_progress
-- Run AFTER 013. Idempotent — IF NOT EXISTS throughout.
-- RLS policies: see 039_rls_extended.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CUSTOMERS — Data utama jamaah / pelanggan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id         UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  agent_id          UUID        REFERENCES public.agents(id) ON DELETE SET NULL,
  customer_code     TEXT        UNIQUE,
  full_name         TEXT        NOT NULL,
  email             TEXT,
  phone             TEXT,
  phone_alternative TEXT,
  nik               TEXT,
  gender            TEXT        CHECK (gender IN ('male','female')),
  birth_date        DATE,
  birth_place       TEXT,
  address           TEXT,
  city              TEXT,
  province          TEXT,
  postal_code       TEXT,
  country           TEXT        NOT NULL DEFAULT 'Indonesia',
  religion          TEXT,
  marital_status    TEXT        CHECK (marital_status IN ('single','married','divorced','widowed')),
  occupation        TEXT,
  education         TEXT,
  blood_type        TEXT        CHECK (blood_type IN ('A','B','AB','O','A+','A-','B+','B-','AB+','AB-','O+','O-')),
  photo_url         TEXT,
  passport_number   TEXT,
  passport_expiry   DATE,
  passport_country  TEXT,
  is_active         BOOLEAN     NOT NULL DEFAULT TRUE,
  notes             TEXT,
  meta_data         JSONB,
  created_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_customers_user_id    ON public.customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch_id  ON public.customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_agent_id   ON public.customers(agent_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone      ON public.customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_nik        ON public.customers(nik);
CREATE INDEX IF NOT EXISTS idx_customers_full_name  ON public.customers USING gin(full_name gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- 2. CUSTOMER_DOCUMENTS — Dokumen jamaah (passport, KTP, vaksin, dll)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_documents (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  document_type   TEXT        NOT NULL
                              CHECK (document_type IN ('passport','ktp','kk','birth_certificate',
                                                        'vaccine_card','visa','photo','other')),
  document_number TEXT,
  issue_date      DATE,
  expiry_date     DATE,
  issued_by       TEXT,
  file_url        TEXT,
  thumbnail_url   TEXT,
  is_verified     BOOLEAN     NOT NULL DEFAULT FALSE,
  verified_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at     TIMESTAMPTZ,
  rejection_note  TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','verified','rejected','expired')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_customer_documents_customer_id ON public.customer_documents(customer_id);

-- ---------------------------------------------------------------------------
-- 3. CUSTOMER_MAHRAMS — Data mahram (pendamping wanita)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_mahrams (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  mahram_id     UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  full_name     TEXT        NOT NULL,
  relation      TEXT        NOT NULL
                            CHECK (relation IN ('husband','father','brother','son','father_in_law',
                                                 'grandfather','uncle','nephew','other')),
  nik           TEXT,
  phone         TEXT,
  is_verified   BOOLEAN     NOT NULL DEFAULT FALSE,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customer_mahrams ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_customer_mahrams_customer_id ON public.customer_mahrams(customer_id);

-- ---------------------------------------------------------------------------
-- 4. DEPARTURE_HOTELS — Hotel per segment keberangkatan
--    (Blueprint: departure_hotels | Old name: departure_multi_hotels)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departure_hotels (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id   UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  hotel_id       UUID        NOT NULL REFERENCES public.hotels(id) ON DELETE RESTRICT,
  city           TEXT        NOT NULL CHECK (city IN ('makkah','madinah','jeddah','other')),
  check_in_date  DATE        NOT NULL,
  check_out_date DATE        NOT NULL,
  nights         INTEGER     GENERATED ALWAYS AS (check_out_date - check_in_date) STORED,
  room_type      TEXT        CHECK (room_type IN ('quad','triple','double','single')),
  total_rooms    INTEGER     NOT NULL DEFAULT 1,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (departure_id, hotel_id, city)
);

ALTER TABLE public.departure_hotels ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_departure_hotels_departure_id ON public.departure_hotels(departure_id);

-- ---------------------------------------------------------------------------
-- 5. DEPARTURE_ITINERARIES — Program perjalanan per hari
--    (Blueprint: departure_itineraries | Old name: trip_timeline)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departure_itineraries (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id    UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  day_number      INTEGER     NOT NULL CHECK (day_number >= 1),
  date            DATE,
  title           TEXT        NOT NULL,
  description     TEXT,
  location        TEXT,
  city            TEXT,
  activities      JSONB,
  hotel_id        UUID        REFERENCES public.hotels(id) ON DELETE SET NULL,
  meal_plan       TEXT        CHECK (meal_plan IN ('none','breakfast','half_board','full_board')),
  transport_notes TEXT,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (departure_id, day_number)
);

ALTER TABLE public.departure_itineraries ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_departure_itineraries_departure_id ON public.departure_itineraries(departure_id);

-- ---------------------------------------------------------------------------
-- 6. DEPARTURE_CHECKLISTS — Checklist operasional keberangkatan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departure_checklists (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id    UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  category        TEXT        NOT NULL DEFAULT 'general'
                              CHECK (category IN ('general','document','health','equipment',
                                                   'transport','hotel','communication','other')),
  title           TEXT        NOT NULL,
  description     TEXT,
  is_required     BOOLEAN     NOT NULL DEFAULT TRUE,
  is_completed    BOOLEAN     NOT NULL DEFAULT FALSE,
  completed_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at    TIMESTAMPTZ,
  due_date        DATE,
  notes           TEXT,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.departure_checklists ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_departure_checklists_departure_id ON public.departure_checklists(departure_id);

-- ---------------------------------------------------------------------------
-- 7. MANIFESTS — Manifest penumpang per keberangkatan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manifests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id     UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  manifest_number  TEXT        UNIQUE,
  type             TEXT        NOT NULL DEFAULT 'departure'
                               CHECK (type IN ('departure','return','transit')),
  status           TEXT        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','submitted','approved','finalized')),
  total_passengers INTEGER     NOT NULL DEFAULT 0,
  flight_number    TEXT,
  flight_date      DATE,
  airport_origin   TEXT,
  airport_dest     TEXT,
  submitted_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  submitted_at     TIMESTAMPTZ,
  approved_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  file_url         TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.manifests ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_manifests_departure_id ON public.manifests(departure_id);

-- ---------------------------------------------------------------------------
-- 8. LUGGAGE — Manajemen bagasi jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.luggage (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id    UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  customer_id     UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id      UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  bag_tag         TEXT        UNIQUE,
  weight_kg       NUMERIC,
  bag_count       INTEGER     NOT NULL DEFAULT 1,
  status          TEXT        NOT NULL DEFAULT 'registered'
                              CHECK (status IN ('registered','tagged','loaded','arrived','claimed','lost')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.luggage ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_luggage_departure_id ON public.luggage(departure_id);
CREATE INDEX IF NOT EXISTS idx_luggage_customer_id  ON public.luggage(customer_id);

-- ---------------------------------------------------------------------------
-- 9. BUS_PROVIDERS — Penyedia bus transportasi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bus_providers (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  city         TEXT,
  country      TEXT        NOT NULL DEFAULT 'Indonesia',
  bus_type     TEXT        NOT NULL DEFAULT 'coach'
                           CHECK (bus_type IN ('minibus','coach','double_decker','midi','micro','other')),
  capacity     INTEGER     NOT NULL DEFAULT 40,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  notes        TEXT,
  meta_data    JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bus_providers ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 10. BUS_ASSIGNMENTS — Bus yang ditugaskan per keberangkatan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bus_assignments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id    UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  provider_id     UUID        NOT NULL REFERENCES public.bus_providers(id) ON DELETE RESTRICT,
  bus_number      TEXT,
  plate_number    TEXT,
  driver_name     TEXT,
  driver_phone    TEXT,
  capacity        INTEGER     NOT NULL DEFAULT 40,
  group_label     TEXT,
  route_notes     TEXT,
  status          TEXT        NOT NULL DEFAULT 'scheduled'
                              CHECK (status IN ('scheduled','confirmed','in_progress','completed','cancelled')),
  departure_date  DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.bus_assignments ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bus_assignments_departure_id ON public.bus_assignments(departure_id);
CREATE INDEX IF NOT EXISTS idx_bus_assignments_provider_id  ON public.bus_assignments(provider_id);

-- ---------------------------------------------------------------------------
-- 11. BUS_PASSENGERS — Penugasan jamaah ke bus
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bus_passengers (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id   UUID        NOT NULL REFERENCES public.bus_assignments(id) ON DELETE CASCADE,
  customer_id     UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id      UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  seat_number     TEXT,
  status          TEXT        NOT NULL DEFAULT 'assigned'
                              CHECK (status IN ('assigned','confirmed','boarded','absent')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (assignment_id, customer_id)
);

ALTER TABLE public.bus_passengers ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_bus_passengers_assignment_id ON public.bus_passengers(assignment_id);
CREATE INDEX IF NOT EXISTS idx_bus_passengers_customer_id   ON public.bus_passengers(customer_id);

-- ---------------------------------------------------------------------------
-- 12. HAJI_REGISTRATIONS — Pendaftaran haji (plus / ONH+)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.haji_registrations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id       UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  branch_id         UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  agent_id          UUID        REFERENCES public.agents(id) ON DELETE SET NULL,
  registration_code TEXT        UNIQUE,
  registration_type TEXT        NOT NULL DEFAULT 'haji_plus'
                                CHECK (registration_type IN ('haji_regular','haji_plus','haji_furoda')),
  registration_date DATE        NOT NULL DEFAULT CURRENT_DATE,
  preferred_year    INTEGER,
  estimated_year    INTEGER,
  package_id        UUID        REFERENCES public.packages(id) ON DELETE SET NULL,
  status            TEXT        NOT NULL DEFAULT 'registered'
                                CHECK (status IN ('registered','waiting','called','departing',
                                                   'cancelled','completed')),
  queue_number      INTEGER,
  province_quota    TEXT,
  kbih_name         TEXT,
  bpih_amount       NUMERIC,
  down_payment      NUMERIC     NOT NULL DEFAULT 0,
  mahram_id         UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  mahram_relation   TEXT,
  is_group          BOOLEAN     NOT NULL DEFAULT FALSE,
  group_name        TEXT,
  notes             TEXT,
  meta_data         JSONB,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.haji_registrations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_haji_registrations_customer_id ON public.haji_registrations(customer_id);
CREATE INDEX IF NOT EXISTS idx_haji_registrations_status      ON public.haji_registrations(status);

-- ---------------------------------------------------------------------------
-- 13. HAJI_WAITING_PROGRESS — Riwayat perubahan status antrian haji
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.haji_waiting_progress (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id  UUID        NOT NULL REFERENCES public.haji_registrations(id) ON DELETE CASCADE,
  status           TEXT        NOT NULL,
  note             TEXT,
  changed_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.haji_waiting_progress ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_haji_waiting_progress_registration_id ON public.haji_waiting_progress(registration_id);

-- Grant permissions
DO $$
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
  GRANT ALL    ON ALL TABLES IN SCHEMA public TO service_role;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'GRANT on tables/sequences skipped: %', SQLERRM;
END;
$$;

SELECT '031_tables_travel_extended: OK' AS result;
