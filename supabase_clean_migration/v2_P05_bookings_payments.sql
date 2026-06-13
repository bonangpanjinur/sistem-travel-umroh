-- =============================================================================
-- v2_P05 — ALTER: Bookings, Booking_Passengers, Payments
-- Modul : Booking & Pembayaran
-- Aman  : ADD COLUMN IF NOT EXISTS, tidak ada DROP/DELETE
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. BOOKINGS — Semua kolom yang hilang (dari analisis §17)
-- ---------------------------------------------------------------------------

-- FK ke cabang & sales
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS branch_id
  UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sales_id
  UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Rincian harga
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS base_price       NUMERIC(15,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS addons_price     NUMERIC(15,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount  NUMERIC(15,2) DEFAULT 0;

-- Penumpang per tipe
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS adult_count      INTEGER DEFAULT 1;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS child_count      INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS infant_count     INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS total_pax        INTEGER DEFAULT 1;

-- Pembayaran
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_deadline DATE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS currency         TEXT DEFAULT 'IDR';

-- Misc
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS room_number      TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bagasi_kg_allowed INTEGER DEFAULT 23;

-- Update CHECK constraint status untuk memastikan semua nilai valid
DO $$
BEGIN
  ALTER TABLE bookings DROP CONSTRAINT IF EXISTS bookings_status_check;
  ALTER TABLE bookings ADD CONSTRAINT bookings_status_check
    CHECK (status IN ('pending','confirmed','cancelled','completed'));
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'bookings status check: %', SQLERRM;
END $$;

-- Trigger sync total_pax saat adult/child/infant berubah
CREATE OR REPLACE FUNCTION sync_booking_total_pax()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_pax := COALESCE(NEW.adult_count,1)
                 + COALESCE(NEW.child_count,0)
                 + COALESCE(NEW.infant_count,0);
  NEW.remaining_amount := NEW.total_price - NEW.paid_amount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='sync_booking_totals'
    AND tgrelid='bookings'::regclass) THEN
    CREATE TRIGGER sync_booking_totals
      BEFORE INSERT OR UPDATE ON bookings
      FOR EACH ROW EXECUTE FUNCTION sync_booking_total_pax();
  END IF;
END $$;

-- Index baru bookings
CREATE INDEX IF NOT EXISTS idx_bookings_branch_id       ON bookings(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_deadline ON bookings(payment_deadline);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at      ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_total_pax       ON bookings(total_pax);

-- ---------------------------------------------------------------------------
-- 2. BOOKING_PASSENGERS — Kolom yang hilang
-- ---------------------------------------------------------------------------
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS nationality        TEXT;
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS seat_number        TEXT;
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS room_number_makkah TEXT;
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS room_group_id      UUID;
ALTER TABLE booking_passengers ADD COLUMN IF NOT EXISTS family_group_id    UUID;

-- Fix CHECK constraint passenger_type: tambah nilai English agar BUG-14 teratasi
DO $$
BEGIN
  ALTER TABLE booking_passengers DROP CONSTRAINT IF EXISTS booking_passengers_passenger_type_check;
  ALTER TABLE booking_passengers ADD CONSTRAINT booking_passengers_passenger_type_check
    CHECK (passenger_type IN (
      'dewasa','lansia','anak','mahram',   -- nilai Bahasa (schema lama)
      'adult','child','infant','senior'    -- nilai English (kode baru)
    ));
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'booking_passengers passenger_type check: %', SQLERRM;
END $$;

CREATE INDEX IF NOT EXISTS idx_bp_room_number  ON booking_passengers(room_number);
CREATE INDEX IF NOT EXISTS idx_bp_seat_number  ON booking_passengers(seat_number);

-- ---------------------------------------------------------------------------
-- 3. PAYMENTS — Kolom tambahan (dari migration 21 & 40)
-- ---------------------------------------------------------------------------
ALTER TABLE payments ADD COLUMN IF NOT EXISTS rejection_notes  TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_name     TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS proof_filename   TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS account_code     TEXT
  REFERENCES coa_categories(code) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_created_at   ON payments(created_at DESC);

-- ---------------------------------------------------------------------------
-- 4. VIRTUAL_ACCOUNTS — dari schema utama
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS virtual_accounts (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id  UUID    REFERENCES bookings(id) ON DELETE SET NULL,
  va_number   TEXT    NOT NULL UNIQUE,
  bank_code   TEXT    NOT NULL,
  amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  status      TEXT    DEFAULT 'pending'
                      CHECK (status IN ('pending','paid','expired','cancelled')),
  expires_at  TIMESTAMPTZ,
  paid_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_va_booking_id ON virtual_accounts(booking_id);

ALTER TABLE virtual_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "va_staff_manage" ON virtual_accounts;
DROP POLICY IF EXISTS "va_own_read"     ON virtual_accounts;

CREATE POLICY "va_staff_manage" ON virtual_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );

CREATE POLICY "va_own_read" ON virtual_accounts
  FOR SELECT USING (
    booking_id IN (
      SELECT id FROM bookings WHERE customer_id IN (
        SELECT id FROM customers WHERE user_id = auth.uid()
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 5. PAYMENT_PAGE_TOKENS — Link pembayaran sekali pakai
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS payment_page_tokens (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID    NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  token      TEXT    NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '24 hours'),
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ppt_booking_id ON payment_page_tokens(booking_id);

-- ---------------------------------------------------------------------------
-- 6. BANK_ACCOUNTS — Rekening bank perusahaan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bank_accounts (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name      TEXT    NOT NULL,
  account_number TEXT    NOT NULL,
  account_name   TEXT    NOT NULL,
  branch_name    TEXT,
  is_primary     BOOLEAN DEFAULT FALSE,
  is_active      BOOLEAN DEFAULT TRUE,
  opening_balance NUMERIC(15,2) DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bank_accounts_finance_manage" ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_public_read"    ON bank_accounts;

CREATE POLICY "bank_accounts_finance_manage" ON bank_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );

CREATE POLICY "bank_accounts_public_read" ON bank_accounts
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_bank_accounts_updated_at'
    AND tgrelid='bank_accounts'::regclass) THEN
    CREATE TRIGGER set_bank_accounts_updated_at
      BEFORE UPDATE ON bank_accounts
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

