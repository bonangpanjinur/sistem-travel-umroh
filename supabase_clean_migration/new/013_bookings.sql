-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 013: Bookings & Related Tables
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. COUPONS — Kode kupon diskon
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

-- Guard: kolom baru di coupons jika tabel sudah ada
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS usage_per_user    INTEGER     DEFAULT 1;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS applicable_to     TEXT        DEFAULT 'all';
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS package_ids       UUID[];
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS created_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_coupons_code     ON public.coupons(code);
CREATE INDEX IF NOT EXISTS idx_coupons_active   ON public.coupons(is_active);

-- ---------------------------------------------------------------------------
-- 2. BOOKINGS — Pemesanan utama
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bookings (
  id                  UUID                     PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code        TEXT                     NOT NULL UNIQUE,
  customer_id         UUID                     NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  departure_id        UUID                     REFERENCES public.departures(id) ON DELETE SET NULL,
  agent_id            UUID                     REFERENCES public.agents(id) ON DELETE SET NULL,
  branch_id           UUID                     REFERENCES public.branches(id) ON DELETE SET NULL,
  handled_by          UUID                     REFERENCES public.profiles(id) ON DELETE SET NULL,
  coupon_id           UUID                     REFERENCES public.coupons(id) ON DELETE SET NULL,
  status              TEXT                     NOT NULL DEFAULT 'pending'
                                               CHECK (status IN ('pending','confirmed','awaiting_documents',
                                                                  'documents_complete','visa_processing',
                                                                  'completed','cancelled')),
  room_type           TEXT                     NOT NULL DEFAULT 'quad'
                                               CHECK (room_type IN ('quad','triple','double','single')),
  total_pax           INTEGER                  NOT NULL DEFAULT 1,
  total_price         NUMERIC                  NOT NULL DEFAULT 0,
  discount_amount     NUMERIC                  NOT NULL DEFAULT 0,
  paid_amount         NUMERIC                  NOT NULL DEFAULT 0,
  payment_status      TEXT                     NOT NULL DEFAULT 'unpaid'
                                               CHECK (payment_status IN ('unpaid','partial','paid','refunded','overpaid')),
  payment_deadline    DATE,
  special_requests    TEXT,
  internal_notes      TEXT,
  cancelled_at        TIMESTAMPTZ,
  cancellation_reason TEXT,
  confirmed_at        TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  source              TEXT                     DEFAULT 'staff'
                                               CHECK (source IN ('staff','portal','agent','website','api')),
  created_at          TIMESTAMPTZ              NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ              NOT NULL DEFAULT NOW()
);

-- Guard: kolom baru di bookings jika tabel sudah ada
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS agent_id            UUID REFERENCES public.agents(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS branch_id           UUID REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS handled_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS coupon_id           UUID REFERENCES public.coupons(id) ON DELETE SET NULL;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS discount_amount     NUMERIC     DEFAULT 0;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_deadline    DATE;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS special_requests    TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS internal_notes      TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancelled_at        TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS confirmed_at        TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS completed_at        TIMESTAMPTZ;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS source              TEXT DEFAULT 'staff';

-- Guard: tambah kolom remaining_amount sebagai kolom biasa jika belum ada
-- (GENERATED ALWAYS AS tidak bisa di-ALTER, jadi kita buat sebagai kolom computed via trigger)
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS remaining_amount    NUMERIC     DEFAULT 0;

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_bookings_customer    ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_departure   ON public.bookings(departure_id);
CREATE INDEX IF NOT EXISTS idx_bookings_agent       ON public.bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_branch      ON public.bookings(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_code        ON public.bookings(booking_code);
CREATE INDEX IF NOT EXISTS idx_bookings_status      ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment     ON public.bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_created     ON public.bookings(created_at DESC);

-- ---------------------------------------------------------------------------
-- 3. BOOKING_LINE_ITEMS — Item detail billing per booking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_line_items (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  description  TEXT        NOT NULL,
  category     TEXT        NOT NULL DEFAULT 'package'
                           CHECK (category IN ('package','addon','insurance','visa',
                                               'transport','other')),
  quantity     INTEGER     NOT NULL DEFAULT 1,
  unit_price   NUMERIC     NOT NULL DEFAULT 0,
  total_price  NUMERIC     NOT NULL DEFAULT 0,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guard: kolom baru di booking_line_items jika tabel sudah ada
ALTER TABLE public.booking_line_items ADD COLUMN IF NOT EXISTS category    TEXT DEFAULT 'package';
ALTER TABLE public.booking_line_items ADD COLUMN IF NOT EXISTS unit_price  NUMERIC DEFAULT 0;
ALTER TABLE public.booking_line_items ADD COLUMN IF NOT EXISTS notes       TEXT;

ALTER TABLE public.booking_line_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_booking_line_items_booking
  ON public.booking_line_items(booking_id);

-- ---------------------------------------------------------------------------
-- 4. BOOKING_SEAT_LOCKS — Lock seat sementara
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_seat_locks (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id  UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  user_id       UUID        REFERENCES auth.users(id) ON DELETE CASCADE,
  seats_locked  INTEGER     NOT NULL DEFAULT 1,
  locked_until  TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '15 minutes',
  booking_id    UUID        REFERENCES public.bookings(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guard: kolom baru di booking_seat_locks jika tabel sudah ada
ALTER TABLE public.booking_seat_locks ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ DEFAULT NOW() + INTERVAL '15 minutes';
ALTER TABLE public.booking_seat_locks ADD COLUMN IF NOT EXISTS booking_id   UUID REFERENCES public.bookings(id) ON DELETE CASCADE;

ALTER TABLE public.booking_seat_locks ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_seat_locks_departure
  ON public.booking_seat_locks(departure_id);
CREATE INDEX IF NOT EXISTS idx_seat_locks_expiry
  ON public.booking_seat_locks(locked_until);

-- ---------------------------------------------------------------------------
-- 5. BOOKING_ACCESS_TOKENS — Token akses portal publik per booking
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_access_tokens (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  token        TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  purpose      TEXT        NOT NULL DEFAULT 'view'
                           CHECK (purpose IN ('view','payment','document_upload','status')),
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '30 days',
  last_used_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guard: kolom baru di booking_access_tokens jika tabel sudah ada
ALTER TABLE public.booking_access_tokens ADD COLUMN IF NOT EXISTS purpose      TEXT DEFAULT 'view';
ALTER TABLE public.booking_access_tokens ADD COLUMN IF NOT EXISTS expires_at   TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days';
ALTER TABLE public.booking_access_tokens ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ;

ALTER TABLE public.booking_access_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_booking_tokens_token
  ON public.booking_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_booking_tokens_booking
  ON public.booking_access_tokens(booking_id);

-- ---------------------------------------------------------------------------
-- 6. BOOKING_DOCUMENT_LOGS — Log dokumen per booking
-- CATATAN: kolom passenger_id tidak punya FK inline di sini karena
-- tabel booking_passengers baru dibuat di file 014.
-- FK-nya di-attach secara deferred di 014_booking_participants.sql.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.booking_document_logs (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id    UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  passenger_id  UUID,
  document_type TEXT        NOT NULL,
  action        TEXT        NOT NULL CHECK (action IN ('uploaded','verified','rejected','expired')),
  file_url      TEXT,
  notes         TEXT,
  performed_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guard: kolom baru di booking_document_logs jika tabel sudah ada
ALTER TABLE public.booking_document_logs ADD COLUMN IF NOT EXISTS passenger_id  UUID;
ALTER TABLE public.booking_document_logs ADD COLUMN IF NOT EXISTS document_type TEXT;
ALTER TABLE public.booking_document_logs ADD COLUMN IF NOT EXISTS file_url      TEXT;
ALTER TABLE public.booking_document_logs ADD COLUMN IF NOT EXISTS notes         TEXT;
ALTER TABLE public.booking_document_logs ADD COLUMN IF NOT EXISTS performed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.booking_document_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_booking_doc_logs_booking
  ON public.booking_document_logs(booking_id);

-- ---------------------------------------------------------------------------
-- 7. APPROVAL_CONFIGS — Konfigurasi workflow approval
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.approval_configs (
  id                 UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type        TEXT            NOT NULL UNIQUE
                                     CHECK (action_type IN ('cancel_booking','refund','discount',
                                                             'override_price','reschedule','other')),
  requires_role      public.app_role NOT NULL DEFAULT 'admin',
  auto_approve       BOOLEAN         NOT NULL DEFAULT FALSE,
  auto_approve_below NUMERIC,
  notify_roles       public.app_role[],
  notes              TEXT,
  is_active          BOOLEAN         NOT NULL DEFAULT TRUE,
  created_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

-- Guard: kolom baru di approval_configs jika tabel sudah ada
ALTER TABLE public.approval_configs ADD COLUMN IF NOT EXISTS auto_approve_below NUMERIC;
ALTER TABLE public.approval_configs ADD COLUMN IF NOT EXISTS notify_roles       public.app_role[];
ALTER TABLE public.approval_configs ADD COLUMN IF NOT EXISTS notes              TEXT;

ALTER TABLE public.approval_configs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 8. APPROVAL_REQUESTS — Permintaan approval
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.approval_requests (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id      UUID        REFERENCES public.approval_configs(id) ON DELETE SET NULL,
  action_type    TEXT        NOT NULL,
  reference_type TEXT        NOT NULL,
  reference_id   UUID        NOT NULL,
  requested_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reason         TEXT,
  amount         NUMERIC,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','approved','rejected','cancelled')),
  reviewed_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  reviewer_notes TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Guard: kolom baru di approval_requests jika tabel sudah ada
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS config_id      UUID REFERENCES public.approval_configs(id) ON DELETE SET NULL;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS reference_type TEXT;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS amount         NUMERIC;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS reviewed_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS reviewed_at    TIMESTAMPTZ;
ALTER TABLE public.approval_requests ADD COLUMN IF NOT EXISTS reviewer_notes TEXT;

ALTER TABLE public.approval_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_approval_requests_status
  ON public.approval_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approval_requests_reference
  ON public.approval_requests(reference_type, reference_id);
