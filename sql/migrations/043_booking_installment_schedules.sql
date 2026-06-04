-- Migration 043: booking_installment_schedules TABLE
-- Dibutuhkan oleh: AdminCicilanGenerator
-- Tanpa ini: fitur generate jadwal cicilan booking tidak bisa menyimpan data

CREATE TABLE IF NOT EXISTS booking_installment_schedules (
  id                  UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id          UUID         REFERENCES bookings(id) ON DELETE CASCADE NOT NULL,
  installment_number  INT          NOT NULL,
  due_date            DATE         NOT NULL,
  amount              NUMERIC      NOT NULL CHECK (amount > 0),
  status              TEXT         DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  paid_at             TIMESTAMPTZ,
  payment_id          UUID         REFERENCES payments(id) ON DELETE SET NULL,
  notes               TEXT,
  created_at          TIMESTAMPTZ  DEFAULT NOW(),
  updated_at          TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bis_booking_id ON booking_installment_schedules(booking_id);
CREATE INDEX IF NOT EXISTS idx_bis_due_date   ON booking_installment_schedules(due_date);
CREATE INDEX IF NOT EXISTS idx_bis_status     ON booking_installment_schedules(status);

-- Update updated_at otomatis
CREATE OR REPLACE FUNCTION update_bis_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS tg_bis_updated_at ON booking_installment_schedules;
CREATE TRIGGER tg_bis_updated_at
  BEFORE UPDATE ON booking_installment_schedules
  FOR EACH ROW EXECUTE FUNCTION update_bis_updated_at();

-- Row Level Security
ALTER TABLE booking_installment_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage installment schedules"
  ON booking_installment_schedules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin','admin','finance','operational')
    )
  );

CREATE POLICY "Customers view own installment schedules"
  ON booking_installment_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.id = booking_installment_schedules.booking_id
        AND c.user_id = auth.uid()
    )
  );
