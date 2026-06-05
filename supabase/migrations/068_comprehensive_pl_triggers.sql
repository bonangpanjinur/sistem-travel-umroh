-- =============================================================================
-- Migration 068: Comprehensive Auto-Trigger P&L Recalculation
-- =============================================================================
-- Otomatis memanggil recalculate_departure_financial_summary() setiap kali ada
-- perubahan pada tabel yang mempengaruhi P&L sebuah departure:
--   1. bookings        — pendapatan bruto, pax, paid_amount, payment_status
--   2. departure_cost_items    — HPP / biaya paket
--   3. departure_expenses      — pengeluaran operasional
--   4. departure_other_revenues — pendapatan tambahan
--
-- Rantai yang sudah ada (Migration 050):
--   payments INSERT/UPDATE/DELETE
--     → sync_booking_payment_totals()  (update bookings.paid_amount/payment_status)
--       → trigger ini fires pada bookings UPDATE
--         → recalculate_departure_financial_summary()
--
-- Dengan demikian setiap pembayaran baru otomatis memperbarui laporan P&L.
-- =============================================================================

-- ─── 1. Shared trigger function: bookings ────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_pl_on_booking_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_departure_id UUID;
BEGIN
  -- Ambil departure_id dari baris yang berubah (NEW atau OLD)
  IF TG_OP = 'DELETE' THEN
    v_departure_id := OLD.departure_id;
  ELSE
    v_departure_id := NEW.departure_id;
  END IF;

  IF v_departure_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Hanya recalculate jika kolom relevan berubah (optimasi performa)
  IF TG_OP = 'UPDATE' THEN
    IF (OLD.booking_status    IS NOT DISTINCT FROM NEW.booking_status)
   AND (OLD.total_pax         IS NOT DISTINCT FROM NEW.total_pax)
   AND (OLD.total_price       IS NOT DISTINCT FROM NEW.total_price)
   AND (OLD.paid_amount       IS NOT DISTINCT FROM NEW.paid_amount)
   AND (OLD.payment_status    IS NOT DISTINCT FROM NEW.payment_status)
   AND (OLD.departure_id      IS NOT DISTINCT FROM NEW.departure_id) THEN
      -- Tidak ada perubahan yang relevan — lewati
      RETURN NEW;
    END IF;
  END IF;

  -- Jika departure berubah, recalculate keduanya (pindah departure)
  IF TG_OP = 'UPDATE' AND OLD.departure_id IS DISTINCT FROM NEW.departure_id
     AND OLD.departure_id IS NOT NULL THEN
    PERFORM recalculate_departure_financial_summary(OLD.departure_id);
  END IF;

  PERFORM recalculate_departure_financial_summary(v_departure_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION trigger_pl_on_booking_change IS
  'Memanggil recalculate_departure_financial_summary() saat booking berubah status, pax, harga, atau pembayaran';

-- ─── 2. Shared trigger function: departure_cost_items ────────────────────────
CREATE OR REPLACE FUNCTION trigger_pl_on_cost_item_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_departure_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_departure_id := OLD.departure_id;
  ELSE
    v_departure_id := NEW.departure_id;
  END IF;

  IF v_departure_id IS NOT NULL THEN
    PERFORM recalculate_departure_financial_summary(v_departure_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION trigger_pl_on_cost_item_change IS
  'Memanggil recalculate_departure_financial_summary() saat departure_cost_items berubah (HPP)';

-- ─── 3. Shared trigger function: departure_expenses ──────────────────────────
CREATE OR REPLACE FUNCTION trigger_pl_on_expense_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_departure_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_departure_id := OLD.departure_id;
  ELSE
    v_departure_id := NEW.departure_id;
  END IF;

  IF v_departure_id IS NOT NULL THEN
    PERFORM recalculate_departure_financial_summary(v_departure_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION trigger_pl_on_expense_change IS
  'Memanggil recalculate_departure_financial_summary() saat departure_expenses berubah';

-- ─── 4. Shared trigger function: departure_other_revenues ────────────────────
CREATE OR REPLACE FUNCTION trigger_pl_on_other_revenue_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_departure_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_departure_id := OLD.departure_id;
  ELSE
    v_departure_id := NEW.departure_id;
  END IF;

  IF v_departure_id IS NOT NULL THEN
    PERFORM recalculate_departure_financial_summary(v_departure_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

COMMENT ON FUNCTION trigger_pl_on_other_revenue_change IS
  'Memanggil recalculate_departure_financial_summary() saat departure_other_revenues berubah';

-- ─── 5. Drop triggers lama jika sudah ada ────────────────────────────────────
DROP TRIGGER IF EXISTS trg_pl_on_booking_change          ON bookings;
DROP TRIGGER IF EXISTS trg_pl_on_cost_item_change        ON departure_cost_items;
DROP TRIGGER IF EXISTS trg_pl_on_expense_change          ON departure_expenses;
DROP TRIGGER IF EXISTS trg_pl_on_other_revenue_change    ON departure_other_revenues;

-- ─── 6. Pasang trigger pada bookings ─────────────────────────────────────────
-- Fires pada INSERT (booking baru), UPDATE (status/harga/pembayaran berubah),
-- DELETE (booking dibatalkan/dihapus)
CREATE TRIGGER trg_pl_on_booking_change
  AFTER INSERT OR UPDATE OF
    booking_status, total_pax, total_price,
    paid_amount, payment_status, departure_id
  OR DELETE
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_pl_on_booking_change();

-- ─── 7. Pasang trigger pada departure_cost_items (HPP) ───────────────────────
CREATE TRIGGER trg_pl_on_cost_item_change
  AFTER INSERT OR UPDATE OR DELETE
  ON departure_cost_items
  FOR EACH ROW
  EXECUTE FUNCTION trigger_pl_on_cost_item_change();

-- ─── 8. Pasang trigger pada departure_expenses ───────────────────────────────
CREATE TRIGGER trg_pl_on_expense_change
  AFTER INSERT OR UPDATE OR DELETE
  ON departure_expenses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_pl_on_expense_change();

-- ─── 9. Pasang trigger pada departure_other_revenues ─────────────────────────
CREATE TRIGGER trg_pl_on_other_revenue_change
  AFTER INSERT OR UPDATE OR DELETE
  ON departure_other_revenues
  FOR EACH ROW
  EXECUTE FUNCTION trigger_pl_on_other_revenue_change();

-- ─── 10. Grant execute permissions ───────────────────────────────────────────
GRANT EXECUTE ON FUNCTION trigger_pl_on_booking_change()       TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_pl_on_cost_item_change()     TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_pl_on_expense_change()       TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_pl_on_other_revenue_change() TO authenticated;

-- ─── 11. Backfill: recalculate semua departure yang sudah ada ────────────────
-- Jalankan sekali saat migration ini diapply agar data lama ikut ter-update.
DO $$
DECLARE
  v_dep RECORD;
  v_count INTEGER := 0;
BEGIN
  FOR v_dep IN
    SELECT DISTINCT d.id
    FROM departures d
    WHERE EXISTS (
      SELECT 1 FROM bookings            WHERE departure_id = d.id
      UNION ALL
      SELECT 1 FROM departure_cost_items WHERE departure_id = d.id
      UNION ALL
      SELECT 1 FROM departure_expenses   WHERE departure_id = d.id
    )
  LOOP
    BEGIN
      PERFORM recalculate_departure_financial_summary(v_dep.id);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Gagal recalculate departure %: %', v_dep.id, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'Backfill selesai: % departure direcalculate', v_count;
END;
$$;

-- ─── Verifikasi ───────────────────────────────────────────────────────────────
SELECT
  tgname       AS trigger_name,
  tgrelid::regclass AS on_table,
  tgenabled    AS enabled,
  CASE tgtype & 28
    WHEN  4 THEN 'INSERT'
    WHEN  8 THEN 'DELETE'
    WHEN 16 THEN 'UPDATE'
    WHEN 12 THEN 'INSERT OR DELETE'
    WHEN 20 THEN 'INSERT OR UPDATE'
    WHEN 24 THEN 'UPDATE OR DELETE'
    WHEN 28 THEN 'INSERT OR UPDATE OR DELETE'
    ELSE        tgtype::text
  END           AS events
FROM pg_trigger
WHERE tgname IN (
  'trg_pl_on_booking_change',
  'trg_pl_on_cost_item_change',
  'trg_pl_on_expense_change',
  'trg_pl_on_other_revenue_change',
  'trg_auto_recalculate_pl_on_complete'
)
ORDER BY on_table, trigger_name;
