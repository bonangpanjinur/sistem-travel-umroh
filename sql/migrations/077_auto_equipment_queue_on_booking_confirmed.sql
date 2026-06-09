-- =============================================================================
-- Migration 077 — Auto-Queue Equipment Distribution saat Booking Dikonfirmasi
-- Tanggal  : 09 Juni 2026
-- Sprint   : A1
-- Deskripsi:
--   Trigger otomatis yang membuat record equipment_distributions (status='queued')
--   untuk setiap jamaah dalam booking yang baru dikonfirmasi, berdasarkan
--   package_type_equipment dari tipe paket yang dipilih.
--
-- Alur:
--   bookings.booking_status → 'confirmed'
--     └─ ambil departure → package → package_type_id
--     └─ loop package_type_equipment (item default per tipe)
--     └─ loop booking_passengers
--     └─ filter berdasarkan gender (L/P/all)
--     └─ INSERT equipment_distributions (status='queued') ON CONFLICT DO NOTHING
--
-- Idempotent: aman dijalankan berulang kali (IF NOT EXISTS, CREATE OR REPLACE,
--             ON CONFLICT DO NOTHING, EXCEPTION handler).
-- =============================================================================


-- ── 0. Pastikan tabel package_type_equipment ada (CREATE IF NOT EXISTS) ───────
-- Tabel ini mungkin sudah ada di schema Supabase lama. Ini bersifat safety net.
CREATE TABLE IF NOT EXISTS package_type_equipment (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  package_type_id   UUID        NOT NULL,
  equipment_item_id UUID        NOT NULL REFERENCES equipment_items (id) ON DELETE CASCADE,
  default_quantity  INTEGER     NOT NULL DEFAULT 1,
  is_required       BOOLEAN     NOT NULL DEFAULT TRUE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (package_type_id, equipment_item_id)
);

CREATE INDEX IF NOT EXISTS idx_pkg_type_equip_type_id
  ON package_type_equipment (package_type_id);

CREATE INDEX IF NOT EXISTS idx_pkg_type_equip_item_id
  ON package_type_equipment (equipment_item_id);


-- ── 1. Tambahkan nilai 'queued' ke CHECK constraint status ────────────────────
-- Status 'queued' = item sudah dijadwalkan tapi belum disiapkan/didistribusikan.
-- Urutan siklus: queued → pending → distributed → returned
--
-- Strategi: drop constraint lama (by name pattern) lalu recreate dengan nilai baru.
DO $$
DECLARE
  v_con_name TEXT;
BEGIN
  -- Cari nama constraint CHECK pada kolom status
  SELECT conname INTO v_con_name
  FROM   pg_constraint
  WHERE  conrelid = 'equipment_distributions'::regclass
    AND  contype  = 'c'
    AND  pg_get_constraintdef(oid) LIKE '%status%';

  -- Drop constraint lama jika ada
  IF v_con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE equipment_distributions DROP CONSTRAINT %I', v_con_name);
    RAISE NOTICE 'Dropped old status constraint: %', v_con_name;
  END IF;

  -- Recreate dengan 'queued' ditambahkan
  ALTER TABLE equipment_distributions
    ADD CONSTRAINT equipment_distributions_status_check
    CHECK (status IN ('queued', 'pending', 'distributed', 'returned'));

  RAISE NOTICE 'Status constraint recreated with queued|pending|distributed|returned';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '077: gagal update status constraint: % %', SQLSTATE, SQLERRM;
END;
$$;


-- ── 2. Tambah kolom booking_id ke equipment_distributions (jika belum ada) ────
-- Berguna untuk tracing: distribusi ini berasal dari booking mana.
ALTER TABLE equipment_distributions
  ADD COLUMN IF NOT EXISTS booking_id UUID REFERENCES bookings (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_equip_dist_booking_id
  ON equipment_distributions (booking_id)
  WHERE booking_id IS NOT NULL;

COMMENT ON COLUMN equipment_distributions.booking_id IS
  'Booking asal record ini. Diisi otomatis oleh trigger saat booking dikonfirmasi.';


-- ── 3. Fungsi trigger: auto_queue_equipment_on_booking_confirmed ──────────────
CREATE OR REPLACE FUNCTION public.auto_queue_equipment_on_booking_confirmed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_departure_id    UUID;
  v_package_type_id UUID;
  eq                RECORD;
  pax               RECORD;
  v_inserted_count  INTEGER := 0;
  v_skipped_count   INTEGER := 0;
  v_already_exists  BOOLEAN;
BEGIN
  -- ── Guard: hanya proses saat status baru saja berubah ke 'confirmed' ─────
  IF NEW.status <> 'confirmed' OR OLD.status = 'confirmed' THEN
    RETURN NEW;
  END IF;

  v_departure_id := NEW.departure_id;
  IF v_departure_id IS NULL THEN
    RAISE WARNING '077: booking % tidak punya departure_id, lewati', NEW.id;
    RETURN NEW;
  END IF;

  -- ── Ambil package_type_id dari departure → package ───────────────────────
  SELECT p.package_type_id
    INTO v_package_type_id
    FROM departures d
    JOIN packages   p ON p.id = d.package_id
   WHERE d.id = v_departure_id;

  IF v_package_type_id IS NULL THEN
    RAISE WARNING '077: departure % tidak punya package_type_id, lewati', v_departure_id;
    RETURN NEW;
  END IF;

  -- ── Loop setiap item perlengkapan untuk tipe paket ini ───────────────────
  FOR eq IN
    SELECT
      pte.equipment_item_id,
      COALESCE(pte.default_quantity, 1) AS qty,
      ei.gender_target,
      ei.name                           AS item_name
    FROM   package_type_equipment pte
    JOIN   equipment_items         ei  ON ei.id = pte.equipment_item_id
    WHERE  pte.package_type_id = v_package_type_id
    ORDER  BY ei.name
  LOOP

    -- ── Loop setiap penumpang dalam booking ────────────────────────────────
    FOR pax IN
      SELECT
        bp.customer_id,
        bp.passenger_type,
        COALESCE(c.gender, '') AS gender
      FROM   booking_passengers bp
      LEFT JOIN customers       c  ON c.id = bp.customer_id
      WHERE  bp.booking_id = NEW.id
    LOOP

      -- ── Filter berdasarkan gender target item ──────────────────────────
      IF eq.gender_target = 'all'
         OR (eq.gender_target = 'male'   AND pax.gender = 'L')
         OR (eq.gender_target = 'female' AND pax.gender = 'P')
      THEN

        -- ── Cek apakah sudah ada record queued untuk kombinasi ini ───────
        SELECT EXISTS (
          SELECT 1
          FROM   equipment_distributions
          WHERE  customer_id  = pax.customer_id
            AND  departure_id = v_departure_id
            AND  equipment_id = eq.equipment_item_id
            AND  status       = 'queued'
        ) INTO v_already_exists;

        IF NOT v_already_exists THEN
          INSERT INTO equipment_distributions (
            equipment_id,
            customer_id,
            departure_id,
            booking_id,
            item_name,
            quantity,
            status,
            notes
          ) VALUES (
            eq.equipment_item_id,
            pax.customer_id,
            v_departure_id,
            NEW.id,
            eq.item_name,
            eq.qty,
            'queued',
            format(
              'Auto-dibuat saat booking %s dikonfirmasi pada %s',
              COALESCE(NEW.booking_code, NEW.id::TEXT),
              TO_CHAR(NOW(), 'DD Mon YYYY HH24:MI')
            )
          );
          v_inserted_count := v_inserted_count + 1;
        ELSE
          v_skipped_count := v_skipped_count + 1;
        END IF;

      END IF; -- gender filter
    END LOOP; -- loop penumpang
  END LOOP; -- loop equipment items

  -- ── Log ringkasan ────────────────────────────────────────────────────────
  IF v_inserted_count > 0 OR v_skipped_count > 0 THEN
    RAISE NOTICE '077: booking % — % record equipment di-queue, % sudah ada (dilewati)',
      COALESCE(NEW.booking_code, NEW.id::TEXT),
      v_inserted_count,
      v_skipped_count;
  END IF;

  RETURN NEW;

EXCEPTION
  WHEN OTHERS THEN
    -- PENTING: jangan batalkan konfirmasi booking karena error equipment
    RAISE WARNING '077 auto_queue_equipment: error pada booking % — SQLSTATE=% MSG=%',
      NEW.id, SQLSTATE, SQLERRM;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_queue_equipment_on_booking_confirmed() IS
  'Sprint A1: Auto-queue equipment_distributions (queued) untuk setiap jamaah '
  'saat booking dikonfirmasi, berdasarkan package_type_equipment dari tipe paket.';


-- ── 4. Pasang trigger ke tabel bookings ──────────────────────────────────────
DROP TRIGGER IF EXISTS trg_auto_queue_equipment ON bookings;

CREATE TRIGGER trg_auto_queue_equipment
  AFTER UPDATE OF status
  ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_queue_equipment_on_booking_confirmed();

COMMENT ON TRIGGER trg_auto_queue_equipment ON bookings IS
  'Sprint A1: Saat booking_status → confirmed, otomatis buat queue perlengkapan '
  'untuk semua jamaah berdasarkan template tipe paket.';


-- ── 5. Backfill: queue equipment untuk booking confirmed yang sudah ada ───────
-- Jalankan sekali untuk booking lama yang sudah confirmed sebelum trigger ini ada.
-- Dibungkus dalam DO block agar error pada satu booking tidak menghentikan proses.
DO $$
DECLARE
  b        RECORD;
  eq       RECORD;
  pax      RECORD;
  v_pkg_type_id UUID;
  v_total  INTEGER := 0;
BEGIN
  FOR b IN
    SELECT id, booking_code, departure_id
    FROM   bookings
    WHERE  status = 'confirmed'
      AND  departure_id IS NOT NULL
  LOOP
    -- Ambil package_type_id
    SELECT p.package_type_id INTO v_pkg_type_id
    FROM   departures d
    JOIN   packages   p ON p.id = d.package_id
    WHERE  d.id = b.departure_id;

    IF v_pkg_type_id IS NULL THEN CONTINUE; END IF;

    FOR eq IN
      SELECT
        pte.equipment_item_id,
        COALESCE(pte.default_quantity, 1) AS qty,
        ei.gender_target,
        ei.name AS item_name
      FROM   package_type_equipment pte
      JOIN   equipment_items         ei ON ei.id = pte.equipment_item_id
      WHERE  pte.package_type_id = v_pkg_type_id
    LOOP
      FOR pax IN
        SELECT
          bp.customer_id,
          COALESCE(c.gender, '') AS gender
        FROM   booking_passengers bp
        LEFT JOIN customers       c ON c.id = bp.customer_id
        WHERE  bp.booking_id = b.id
      LOOP
        IF eq.gender_target = 'all'
           OR (eq.gender_target = 'male'   AND pax.gender = 'L')
           OR (eq.gender_target = 'female' AND pax.gender = 'P')
        THEN
          INSERT INTO equipment_distributions (
            equipment_id, customer_id, departure_id, booking_id,
            item_name, quantity, status, notes
          )
          SELECT
            eq.equipment_item_id, pax.customer_id, b.departure_id, b.id,
            eq.item_name, eq.qty, 'queued',
            format('Backfill migration 077 — booking %s', COALESCE(b.booking_code, b.id::TEXT))
          WHERE NOT EXISTS (
            SELECT 1 FROM equipment_distributions
            WHERE  customer_id  = pax.customer_id
              AND  departure_id = b.departure_id
              AND  equipment_id = eq.equipment_item_id
              AND  status       = 'queued'
          );

          IF FOUND THEN v_total := v_total + 1; END IF;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;

  IF v_total > 0 THEN
    RAISE NOTICE '077 backfill: % record equipment_distributions (queued) dibuat untuk booking confirmed yang sudah ada', v_total;
  ELSE
    RAISE NOTICE '077 backfill: tidak ada record baru (semua sudah ter-queue atau package_type_equipment kosong)';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING '077 backfill error: % %', SQLSTATE, SQLERRM;
END;
$$;
