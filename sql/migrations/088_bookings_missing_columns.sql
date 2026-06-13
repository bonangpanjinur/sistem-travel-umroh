-- ============================================================
-- Migration 088: Fix bookings table — semua kolom yang hilang
-- Berdasarkan analisis rencanasql.md §17.1 & §24.5
-- Idempotent: ADD COLUMN IF NOT EXISTS
-- ============================================================

-- Relasi organisasi (diakses di AdminBookings tapi belum ada)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS branch_id        UUID REFERENCES branches(id)  ON DELETE SET NULL;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS sales_id         UUID REFERENCES profiles(id)  ON DELETE SET NULL;

-- Breakdown harga (QuickInvoiceSheet.tsx, BulkSendTab.tsx)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS base_price       NUMERIC(15,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS addons_price     NUMERIC(15,2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount  NUMERIC(15,2) DEFAULT 0;

-- Jumlah penumpang per tipe (BookingWizard, trigger P&L)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS adult_count      INTEGER DEFAULT 1;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS child_count      INTEGER DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS infant_count     INTEGER DEFAULT 0;

-- Deadline pembayaran
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_deadline DATE;

-- Mata uang
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS currency         TEXT    DEFAULT 'IDR';

-- total_pax sebagai generated column (adult + child + infant)
-- Cek dulu apakah sudah ada sebelum menambahkan
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'total_pax'
  ) THEN
    ALTER TABLE bookings
      ADD COLUMN total_pax INTEGER GENERATED ALWAYS AS
        (COALESCE(adult_count,1) + COALESCE(child_count,0) + COALESCE(infant_count,0)) STORED;
  END IF;
END $$;

-- booking_status: kode frontend pakai 'booking_status' tapi schema pakai 'status'
-- Dibuat sebagai generated column alias agar tidak perlu ubah kode
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'booking_status'
  ) THEN
    -- Tidak bisa buat generated column dari kolom teks langsung di PG,
    -- gunakan VIEW alias di 092 atau tambah kolom biasa yang di-sync via trigger
    ALTER TABLE bookings ADD COLUMN booking_status TEXT;
  END IF;
END $$;

-- Sync booking_status dari status (data lama)
UPDATE bookings SET booking_status = status WHERE booking_status IS NULL;

-- Trigger untuk keep booking_status sinkron dengan status
CREATE OR REPLACE FUNCTION sync_booking_status_alias()
RETURNS TRIGGER AS $$
BEGIN
  NEW.booking_status := NEW.status;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_booking_status ON bookings;
CREATE TRIGGER trg_sync_booking_status
  BEFORE INSERT OR UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION sync_booking_status_alias();

-- total_amount alias (kode pakai total_amount, schema pakai total_price)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE bookings ADD COLUMN total_amount NUMERIC(15,2) DEFAULT 0;
  END IF;
END $$;

UPDATE bookings SET total_amount = total_price WHERE total_amount = 0 OR total_amount IS NULL;

CREATE OR REPLACE FUNCTION sync_booking_total_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_amount := NEW.total_price;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_booking_total_amount ON bookings;
CREATE TRIGGER trg_sync_booking_total_amount
  BEFORE INSERT OR UPDATE OF total_price ON bookings
  FOR EACH ROW EXECUTE FUNCTION sync_booking_total_amount();

-- Index baru
CREATE INDEX IF NOT EXISTS idx_bookings_branch_id        ON bookings(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_sales_id         ON bookings(sales_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_deadline ON bookings(payment_deadline);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at       ON bookings(created_at DESC);
