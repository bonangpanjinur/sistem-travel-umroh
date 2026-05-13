-- Tabel untuk menyimpan permintaan pengingat pelunasan dari jamaah
-- Jamaah mendaftarkan diri di halaman /cek-booking agar diingatkan sebelum deadline pembayaran
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS payment_deadline_reminders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  booking_code     TEXT NOT NULL,
  phone            TEXT NOT NULL,
  full_name        TEXT,
  payment_deadline DATE,
  remaining_amount NUMERIC(15,2),
  days_before      INTEGER NOT NULL DEFAULT 3,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'sent', 'cancelled')),
  sent_at          TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT payment_deadline_reminders_booking_id_key UNIQUE (booking_id)
);

-- Index untuk query berdasarkan status & deadline
CREATE INDEX IF NOT EXISTS idx_pdr_status    ON payment_deadline_reminders (status);
CREATE INDEX IF NOT EXISTS idx_pdr_deadline  ON payment_deadline_reminders (payment_deadline);
CREATE INDEX IF NOT EXISTS idx_pdr_created   ON payment_deadline_reminders (created_at DESC);

-- RLS: Anon bisa INSERT (halaman publik /cek-booking), staf bisa semua
ALTER TABLE payment_deadline_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_insert_payment_reminder"
  ON payment_deadline_reminders FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "staff_all_payment_reminder"
  ON payment_deadline_reminders FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_payment_deadline_reminders_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_pdr_updated_at ON payment_deadline_reminders;
CREATE TRIGGER trg_pdr_updated_at
  BEFORE UPDATE ON payment_deadline_reminders
  FOR EACH ROW EXECUTE FUNCTION update_payment_deadline_reminders_updated_at();
