-- =============================================================================
-- Migration 079 — Fix trigger trg_auto_queue_equipment
-- Tanggal  : 09 Juni 2026
-- Deskripsi:
--   Migration 078 gagal membuat trigger karena kolom di tabel bookings adalah
--   `status` (bukan `booking_status`). Patch ini membuat ulang trigger dengan
--   nama kolom yang benar.
--
-- Idempotent: DROP TRIGGER IF EXISTS + CREATE TRIGGER
-- =============================================================================

-- ── 1. Hapus trigger lama (jika entah bagaimana sempat terbuat) ───────────────
DROP TRIGGER IF EXISTS trg_auto_queue_equipment ON bookings;

-- ── 2. Buat ulang trigger dengan kolom 'status' (nama asli di Neon) ───────────
CREATE TRIGGER trg_auto_queue_equipment
  AFTER UPDATE OF status
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_queue_equipment_on_booking_confirmed();

COMMENT ON TRIGGER trg_auto_queue_equipment ON bookings IS
  'Sprint A1 (fix 079): Saat status booking berubah → confirmed, otomatis buat '
  'queue perlengkapan untuk semua jamaah berdasarkan template tipe paket.';

-- ── 3. Verifikasi trigger terpasang ──────────────────────────────────────────
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_auto_queue_equipment'
      AND tgrelid = 'bookings'::regclass
  ) THEN
    RAISE NOTICE '079: trigger trg_auto_queue_equipment berhasil dipasang pada tabel bookings';
  ELSE
    RAISE WARNING '079: trigger trg_auto_queue_equipment GAGAL dipasang — periksa fungsi auto_queue_equipment_on_booking_confirmed';
  END IF;
END;
$$;
