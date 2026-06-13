-- =============================================================================
-- v2_P12 — Views Alias, Index Global, Bug Fixes
-- Modul : Perbaikan Lintas Modul
-- Aman  : CREATE OR REPLACE VIEW, CREATE INDEX IF NOT EXISTS
-- Harus dijalankan TERAKHIR (setelah P01–P11)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. VIEW ALIASES — Fix nama tabel yang salah di kode frontend/backend
--    Tidak hapus tabel asli, hanya membuat alias view
-- ---------------------------------------------------------------------------

-- BUG-03: Kode memakai savings_payments, tabel asli = savings_deposits
CREATE OR REPLACE VIEW savings_payments AS
  SELECT * FROM savings_deposits;

-- BUG-05: Kode memakai attendance_records, tabel asli = attendance
CREATE OR REPLACE VIEW attendance_records AS
  SELECT * FROM attendance;

-- BUG-08: Kode memakai audit_logs (generik), tabel = document_audit_logs + dashboard_access_audit_log
CREATE OR REPLACE VIEW audit_logs AS
  SELECT
    id,
    'document'::text                   AS log_type,
    event_type                         AS action,
    customer_name                      AS actor_name,
    NULL::UUID                         AS user_id,
    booking_id,
    customer_id,
    doc_type                           AS resource_type,
    NULL::TEXT                         AS resource_id,
    NULL::JSONB                        AS details,
    created_at
  FROM document_audit_logs
  UNION ALL
  SELECT
    id,
    'rbac'::text                       AS log_type,
    action,
    changed_by::text                   AS actor_name,
    changed_by                         AS user_id,
    NULL::UUID                         AS booking_id,
    NULL::UUID                         AS customer_id,
    module_key                         AS resource_type,
    NULL::TEXT                         AS resource_id,
    NULL::JSONB                        AS details,
    changed_at                         AS created_at
  FROM dashboard_access_audit_log;

-- ---------------------------------------------------------------------------
-- 2. PATCH: passenger_type CHECK CONSTRAINT
--    BUG-14: kode mengirim 'adult'/'child'/'infant' tapi DB hanya terima Bahasa
--    SUDAH ditangani di P05, tapi di sini di-enforce ulang dengan guard
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  -- Cek apakah constraint sudah mengandung 'adult'
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'booking_passengers_passenger_type_check'
      AND conrelid = 'booking_passengers'::regclass
      AND pg_get_constraintdef(oid) LIKE '%adult%'
  ) THEN
    ALTER TABLE booking_passengers
      DROP CONSTRAINT IF EXISTS booking_passengers_passenger_type_check;
    ALTER TABLE booking_passengers
      ADD CONSTRAINT booking_passengers_passenger_type_check
      CHECK (passenger_type IN (
        'dewasa','lansia','anak','mahram',
        'adult','child','infant','senior'
      ));
    RAISE NOTICE 'booking_passengers passenger_type CHECK updated';
  ELSE
    RAISE NOTICE 'booking_passengers passenger_type CHECK sudah OK';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'booking_passengers passenger_type check update: %', SQLERRM;
END $$;

-- ---------------------------------------------------------------------------
-- 3. INDEX GLOBAL PRIORITAS TINGGI
-- ---------------------------------------------------------------------------

-- Bookings
CREATE INDEX IF NOT EXISTS idx_bookings_branch_id        ON bookings(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_deadline ON bookings(payment_deadline);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at       ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_total_pax        ON bookings(total_pax);
CREATE INDEX IF NOT EXISTS idx_bookings_status           ON bookings(status);

-- Customers
CREATE INDEX IF NOT EXISTS idx_customers_full_name       ON customers(full_name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_customers_email           ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_passport        ON customers(passport_number);
CREATE INDEX IF NOT EXISTS idx_customers_phone           ON customers(phone);

-- Departures
CREATE INDEX IF NOT EXISTS idx_departures_hotel_makkah   ON departures(hotel_makkah_id);
CREATE INDEX IF NOT EXISTS idx_departures_hotel_madinah  ON departures(hotel_madinah_id);
CREATE INDEX IF NOT EXISTS idx_departures_airline        ON departures(airline_id);
CREATE INDEX IF NOT EXISTS idx_departures_departure_at   ON departures(departure_date);
CREATE INDEX IF NOT EXISTS idx_departures_status         ON departures(status);
CREATE INDEX IF NOT EXISTS idx_departures_is_active      ON departures(is_active);
CREATE INDEX IF NOT EXISTS idx_departures_month          ON departures(month);

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_payment_date     ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_created_at       ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id       ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status           ON payments(status);

-- Finance
CREATE INDEX IF NOT EXISTS idx_je_entry_date             ON journal_entries(entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_je_status                 ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_je_ref_id                 ON journal_entries(ref_id);
CREATE INDEX IF NOT EXISTS idx_jel_account_code          ON journal_entry_lines(account_code);

-- HR
CREATE INDEX IF NOT EXISTS idx_pr_payment_date           ON payroll_records(payment_date);
CREATE INDEX IF NOT EXISTS idx_lr_employee_status        ON leave_requests(employee_id, status);

-- Guide realtime
CREATE INDEX IF NOT EXISTS idx_gb_channel_at             ON guide_broadcasts(channel_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gl_recorded_at            ON guide_locations(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_created_at            ON sos_alerts(created_at DESC);

-- Store
CREATE INDEX IF NOT EXISTS idx_so_order_number           ON store_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_so_created_at             ON store_orders(created_at DESC);

-- Audit
CREATE INDEX IF NOT EXISTS idx_dal_created_at            ON document_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notif_created_at          ON notifications(created_at DESC);

-- Cash transactions
CREATE INDEX IF NOT EXISTS idx_ct_transaction_date       ON cash_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_ct_branch_id              ON cash_transactions(branch_id);

-- ---------------------------------------------------------------------------
-- 4. FUNCTION: Normalisasi passenger_type (English → Bahasa / canonical)
--    Digunakan sebagai helper di trigger jika diperlukan
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION normalize_passenger_type(raw TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE lower(trim(raw))
    WHEN 'adult'  THEN 'dewasa'
    WHEN 'senior' THEN 'lansia'
    WHEN 'child'  THEN 'anak'
    WHEN 'infant' THEN 'anak'
    ELSE lower(trim(raw))
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ---------------------------------------------------------------------------
-- 5. FUNCTION: Update booking total setelah payment
--    Sinkronisasi paid_amount dan remaining_amount
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_booking_payment_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_paid     NUMERIC;
  v_total    NUMERIC;
  v_status   TEXT;
BEGIN
  SELECT
    COALESCE(SUM(amount), 0),
    b.total_price
  INTO v_paid, v_total
  FROM payments p
  JOIN bookings b ON b.id = p.booking_id
  WHERE p.booking_id = NEW.booking_id
    AND p.status = 'approved'
  GROUP BY b.total_price;

  v_status := CASE
    WHEN v_paid >= v_total    THEN 'lunas'
    WHEN v_paid > 0           THEN 'dp'
    ELSE                           'belum_bayar'
  END;

  UPDATE bookings
  SET
    paid_amount      = COALESCE(v_paid, 0),
    remaining_amount = GREATEST(0, COALESCE(v_total,0) - COALESCE(v_paid,0)),
    payment_status   = v_status,
    updated_at       = NOW()
  WHERE id = NEW.booking_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='on_payment_approved'
    AND tgrelid='payments'::regclass) THEN
    CREATE TRIGGER on_payment_approved
      AFTER INSERT OR UPDATE OF status ON payments
      FOR EACH ROW
      WHEN (NEW.status = 'approved')
      EXECUTE FUNCTION sync_booking_payment_totals();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 6. FUNCTION: Auto-increment booked_count di departures saat booking confirmed
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION sync_departure_booked_count()
RETURNS TRIGGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO   v_count
  FROM   bookings
  WHERE  departure_id = COALESCE(NEW.departure_id, OLD.departure_id)
    AND  status NOT IN ('cancelled');

  UPDATE departures
  SET    booked_count = v_count,
         updated_at   = NOW()
  WHERE  id = COALESCE(NEW.departure_id, OLD.departure_id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='on_booking_status_change_update_departure'
    AND tgrelid='bookings'::regclass) THEN
    CREATE TRIGGER on_booking_status_change_update_departure
      AFTER INSERT OR UPDATE OF status, departure_id ON bookings
      FOR EACH ROW EXECUTE FUNCTION sync_departure_booked_count();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. VERIFY: Tampilkan hitungan tabel penting setelah semua migration
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_airports       INTEGER;
  v_cash_tx        INTEGER;
  v_agent_wallets  INTEGER;
  v_loyalty        INTEGER;
  v_qr_codes       INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_airports       FROM airports;
  SELECT COUNT(*) INTO v_cash_tx        FROM cash_transactions;
  SELECT COUNT(*) INTO v_agent_wallets  FROM agent_wallets;
  SELECT COUNT(*) INTO v_loyalty        FROM loyalty_rewards;
  SELECT COUNT(*) INTO v_qr_codes       FROM jamaah_qr_codes;

  RAISE NOTICE '=== v2 Migration Verify ===';
  RAISE NOTICE 'airports       : %', v_airports;
  RAISE NOTICE 'cash_transactions: %', v_cash_tx;
  RAISE NOTICE 'agent_wallets  : %', v_agent_wallets;
  RAISE NOTICE 'loyalty_rewards: %', v_loyalty;
  RAISE NOTICE 'jamaah_qr_codes: %', v_qr_codes;
  RAISE NOTICE '==========================';
END $$;

