-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 014: Booking Participants, Room Assignments & Visa
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CUSTOMER_DOCUMENTS — Dokumen jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customer_documents (
  id              UUID                      PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID                      NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id      UUID,
  document_type   TEXT                      NOT NULL
                                            CHECK (document_type IN ('ktp','passport','photo','family_card',
                                                                      'birth_certificate','marriage_cert',
                                                                      'vaccination','other')),
  file_url        TEXT                      NOT NULL,
  file_name       TEXT,
  file_size       INTEGER,
  mime_type       TEXT,
  expiry_date     DATE,
  status          public.document_status_type NOT NULL DEFAULT 'pending',
  notes           TEXT,
  verified_by     UUID                      REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ               NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ               NOT NULL DEFAULT NOW()
);

ALTER TABLE public.customer_documents ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_customer_docs_customer
  ON public.customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_docs_booking
  ON public.customer_documents(booking_id);

-- Deferred FK ke bookings (circular ref guard)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'customer_documents_booking_id_fkey_v2'
      AND table_name = 'customer_documents'
  ) THEN
    ALTER TABLE public.customer_documents
      ADD CONSTRAINT customer_documents_booking_id_fkey_v2
      FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. BOOKING_PASSENGERS — Data penumpang per booking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_passengers (
  id               UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID              NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_id      UUID              REFERENCES public.customers(id) ON DELETE SET NULL,
  full_name        TEXT              NOT NULL,
  nik              TEXT,
  passport_no      TEXT,
  passport_expiry  DATE,
  gender           public.gender_type,
  birth_date       DATE,
  birth_place      TEXT,
  nationality      TEXT              NOT NULL DEFAULT 'Indonesia',
  mahram_of        UUID              REFERENCES public.booking_passengers(id) ON DELETE SET NULL,
  room_type        TEXT              CHECK (room_type IN ('quad','triple','double','single')),
  seat_number      TEXT,
  is_lead_passenger BOOLEAN          NOT NULL DEFAULT FALSE,
  notes            TEXT,
  created_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

ALTER TABLE public.booking_passengers ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_booking_passengers_booking
  ON public.booking_passengers(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_passengers_customer
  ON public.booking_passengers(customer_id);

-- Update deferred FK di booking_document_logs yang referensi booking_passengers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'booking_doc_logs_passenger_fkey_v2'
      AND table_name = 'booking_document_logs'
  ) THEN
    ALTER TABLE public.booking_document_logs
      ADD CONSTRAINT booking_doc_logs_passenger_fkey_v2
      FOREIGN KEY (passenger_id) REFERENCES public.booking_passengers(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. ROOM_ASSIGNMENTS — Penugasan kamar hotel per departure
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.room_assignments (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id    UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  room_number     TEXT        NOT NULL,
  room_type       TEXT        NOT NULL CHECK (room_type IN ('quad','triple','double','single')),
  hotel_id        UUID        REFERENCES public.hotels(id) ON DELETE SET NULL,
  floor           INTEGER,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (departure_id, room_number)
);

ALTER TABLE public.room_assignments ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_room_assignments_departure
  ON public.room_assignments(departure_id);

-- ---------------------------------------------------------------------------
-- 4. VISA_APPLICATIONS — Pengajuan visa per penumpang
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.visa_applications (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id        UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  passenger_id      UUID        REFERENCES public.booking_passengers(id) ON DELETE SET NULL,
  application_date  DATE,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','submitted','processing',
                                                   'approved','rejected','expired')),
  visa_number       TEXT,
  visa_expiry       DATE,
  submitted_at      TIMESTAMPTZ,
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  document_url      TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.visa_applications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_visa_applications_booking
  ON public.visa_applications(booking_id);

-- ---------------------------------------------------------------------------
-- 5. MANASIK_SESSIONS — Sesi manasik ibadah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.manasik_sessions (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id  UUID        REFERENCES public.departures(id) ON DELETE CASCADE,
  branch_id     UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  title         TEXT        NOT NULL,
  description   TEXT,
  session_date  TIMESTAMPTZ NOT NULL,
  location      TEXT,
  duration_mins INTEGER     NOT NULL DEFAULT 120,
  presenter     TEXT,
  materials_url TEXT,
  max_attendees INTEGER,
  status        TEXT        NOT NULL DEFAULT 'scheduled'
                            CHECK (status IN ('scheduled','completed','cancelled')),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.manasik_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_manasik_sessions_departure
  ON public.manasik_sessions(departure_id);

-- ---------------------------------------------------------------------------
-- 6. IBADAH_PROGRESS — Progress ibadah per departure per customer
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ibadah_progress (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id   UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  departure_id  UUID        REFERENCES public.departures(id) ON DELETE SET NULL,
  type          TEXT        NOT NULL CHECK (type IN ('tawaf','sai','wukuf','mabit','other')),
  completed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes         TEXT,
  verified_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ibadah_progress ENABLE ROW LEVEL SECURITY;
