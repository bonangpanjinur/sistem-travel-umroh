-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 30 — Auto-Schedule Payment Deadline Reminders
--
-- 1. Ubah UNIQUE constraint dari (booking_id) → (booking_id, days_before)
--    sehingga satu booking bisa punya reminder H-7 DAN H-3 secara bersamaan.
-- 2. Fungsi preview_auto_schedule_reminders   — dry-run, hanya menghitung
-- 3. Fungsi auto_schedule_payment_reminders   — eksekusi, INSERT + skip existing
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Migrasi UNIQUE constraint ─────────────────────────────────────────
-- Drop old single-column unique (booking_id only)
ALTER TABLE payment_deadline_reminders
  DROP CONSTRAINT IF EXISTS payment_deadline_reminders_booking_id_key;

-- New composite unique: satu booking boleh punya satu reminder per H-x
ALTER TABLE payment_deadline_reminders
  ADD CONSTRAINT payment_deadline_reminders_booking_days_key
  UNIQUE (booking_id, days_before);

-- Index tambahan untuk lookup cepat
CREATE INDEX IF NOT EXISTS idx_pdr_booking_days
  ON payment_deadline_reminders (booking_id, days_before);

-- ─── 2. Helper type untuk return value ───────────────────────────────────
-- Gunakan tipe SETOF RECORD supaya kompatibel dengan semua versi PG

-- ─── 3. Fungsi PREVIEW (hanya baca, tidak INSERT) ─────────────────────────
--
-- Mengembalikan booking yang AKAN dijadwalkan jika auto_schedule dijalankan.
-- Parameter: array H-x, contoh ARRAY[7, 3]
-- Return: jumlah booking baru per H-x, plus detail baris
--
CREATE OR REPLACE FUNCTION preview_auto_schedule_reminders(
  p_days_before INTEGER[] DEFAULT ARRAY[7, 3]
)
RETURNS TABLE (
  days_before     INTEGER,
  booking_id      UUID,
  booking_code    TEXT,
  full_name       TEXT,
  phone           TEXT,
  payment_deadline DATE,
  remaining_amount NUMERIC,
  already_exists  BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day INTEGER;
BEGIN
  FOREACH v_day IN ARRAY p_days_before LOOP
    RETURN QUERY
      SELECT
        v_day                              AS days_before,
        b.id                               AS booking_id,
        b.booking_code                     AS booking_code,
        c.full_name                        AS full_name,
        c.phone                            AS phone,
        b.payment_deadline                 AS payment_deadline,
        b.remaining_amount                 AS remaining_amount,
        EXISTS (
          SELECT 1 FROM payment_deadline_reminders pdr
          WHERE pdr.booking_id = b.id
            AND pdr.days_before = v_day
            AND pdr.status IN ('pending', 'sent')
        )                                  AS already_exists
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.payment_status IN ('pending', 'partial')
        AND b.booking_status NOT IN ('cancelled', 'completed')
        AND b.payment_deadline IS NOT NULL
        AND b.payment_deadline >= CURRENT_DATE
        AND b.payment_deadline <= CURRENT_DATE + (v_day || ' days')::INTERVAL
        AND c.phone IS NOT NULL
      ORDER BY b.payment_deadline ASC;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION preview_auto_schedule_reminders(INTEGER[]) TO authenticated;

-- ─── 4. Fungsi EKSEKUSI (INSERT dengan skip duplikat) ─────────────────────
--
-- Menjadwalkan reminder otomatis untuk booking yang mendekati jatuh tempo.
-- Lewati booking yang sudah punya reminder pending/sent untuk H-x ybs.
-- Booking yang remindernya 'cancelled' akan di-reset ke 'pending'.
--
-- Return: (created_count, skipped_count)
--
CREATE OR REPLACE FUNCTION auto_schedule_payment_reminders(
  p_days_before INTEGER[] DEFAULT ARRAY[7, 3]
)
RETURNS TABLE (created_count INTEGER, skipped_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day          INTEGER;
  v_created      INTEGER := 0;
  v_skipped      INTEGER := 0;
  v_row          RECORD;
  v_inserted     INTEGER;
BEGIN
  FOREACH v_day IN ARRAY p_days_before LOOP
    FOR v_row IN
      SELECT
        b.id               AS booking_id,
        b.booking_code,
        b.payment_deadline,
        b.remaining_amount,
        c.phone,
        c.full_name
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.payment_status IN ('pending', 'partial')
        AND b.booking_status NOT IN ('cancelled', 'completed')
        AND b.payment_deadline IS NOT NULL
        AND b.payment_deadline >= CURRENT_DATE
        AND b.payment_deadline <= CURRENT_DATE + (v_day || ' days')::INTERVAL
        AND c.phone IS NOT NULL
    LOOP
      -- Coba INSERT; jika konflik (sudah ada) cek status lama:
      --   - Jika 'cancelled' → reset ke pending (reactivate)
      --   - Jika 'pending' atau 'sent' → DO NOTHING (skip)
      INSERT INTO payment_deadline_reminders (
        booking_id, booking_code, phone, full_name,
        payment_deadline, remaining_amount, days_before, status
      ) VALUES (
        v_row.booking_id,
        v_row.booking_code,
        v_row.phone,
        v_row.full_name,
        v_row.payment_deadline,
        v_row.remaining_amount,
        v_day,
        'pending'
      )
      ON CONFLICT (booking_id, days_before) DO UPDATE
        SET
          remaining_amount = EXCLUDED.remaining_amount,
          phone            = EXCLUDED.phone,
          full_name        = EXCLUDED.full_name,
          payment_deadline = EXCLUDED.payment_deadline,
          status           = CASE
                               WHEN payment_deadline_reminders.status = 'cancelled'
                               THEN 'pending'
                               ELSE payment_deadline_reminders.status
                             END,
          updated_at       = NOW()
        WHERE payment_deadline_reminders.status = 'cancelled';

      GET DIAGNOSTICS v_inserted = ROW_COUNT;

      IF v_inserted > 0 THEN
        v_created := v_created + 1;
      ELSE
        v_skipped := v_skipped + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN QUERY SELECT v_created, v_skipped;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_schedule_payment_reminders(INTEGER[]) TO authenticated;

-- ─── 5. Konfirmasi ────────────────────────────────────────────────────────
SELECT 'Fase 30 — auto-schedule reminder functions installed' AS result;
