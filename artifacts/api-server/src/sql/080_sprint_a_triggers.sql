-- ============================================================
-- Migration 080: Sprint A — Koneksi Data Kritis
-- Mengimplementasikan 5 trigger otomatis:
--   A2: Booking Confirmed → Visa Auto-Create
--   A4: Departure Status → Booking Status Cascade
--   A5: Muthawif Assign → Guide Channel Auto-Init
--   A6: Room Occupants → booking_passengers Sync
--   B7: Equipment Distributed → departure_expenses Auto
-- ============================================================

-- ─── A2: Visa Auto-Create saat Booking Confirmed ──────────────────────────────

CREATE OR REPLACE FUNCTION fn_auto_visa_on_booking_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_passenger RECORD;
  v_customer  RECORD;
BEGIN
  -- Only fire when status changes TO 'confirmed'
  IF (NEW.status = 'confirmed' AND (OLD.status IS DISTINCT FROM 'confirmed')) THEN
    FOR v_passenger IN
      SELECT bp.customer_id, bp.id AS passenger_id
        FROM booking_passengers bp
       WHERE bp.booking_id = NEW.id
    LOOP
      -- Get customer passport data
      SELECT passport_number, passport_expiry
        INTO v_customer
        FROM customers
       WHERE id = v_passenger.customer_id;

      -- Insert visa application if not already exists for this customer+departure
      INSERT INTO visa_applications (
        customer_id,
        departure_id,
        visa_type,
        passport_number,
        passport_expiry,
        status
      )
      SELECT
        v_passenger.customer_id,
        NEW.departure_id,
        COALESCE(
          (SELECT CASE WHEN pt.name ILIKE '%haji%' THEN 'haji' ELSE 'umrah' END
             FROM departures d
             JOIN packages pkg ON pkg.id = d.package_id
             JOIN package_types pt ON pt.id = pkg.package_type_id
            WHERE d.id = NEW.departure_id
            LIMIT 1),
          'umrah'
        ),
        v_customer.passport_number,
        v_customer.passport_expiry,
        'pending_documents'
      WHERE NOT EXISTS (
        SELECT 1 FROM visa_applications
         WHERE customer_id = v_passenger.customer_id
           AND departure_id = NEW.departure_id
      );
    END LOOP;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block booking confirmation — log silently
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_visa_on_booking_confirmed ON bookings;
CREATE TRIGGER trg_auto_visa_on_booking_confirmed
  AFTER UPDATE OF status ON bookings
  FOR EACH ROW EXECUTE FUNCTION fn_auto_visa_on_booking_confirmed();


-- ─── A4: Departure Status → Booking Cascade ───────────────────────────────────

CREATE OR REPLACE FUNCTION fn_cascade_booking_on_departure_status()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- When departure moves to 'departed' → complete all confirmed bookings
  IF (NEW.status = 'departed' AND OLD.status IS DISTINCT FROM 'departed') THEN
    UPDATE bookings
       SET status = 'completed',
           updated_at = now()
     WHERE departure_id = NEW.id
       AND status IN ('confirmed', 'pending');
  END IF;

  -- When departure moves to 'cancelled' → mark pending bookings as cancelled
  IF (NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled') THEN
    UPDATE bookings
       SET status = 'cancelled',
           updated_at = now()
     WHERE departure_id = NEW.id
       AND status = 'pending';
    -- Note: confirmed bookings need manual refund review — NOT auto-cancelled
  END IF;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cascade_booking_on_departure_status ON departures;
CREATE TRIGGER trg_cascade_booking_on_departure_status
  AFTER UPDATE OF status ON departures
  FOR EACH ROW EXECUTE FUNCTION fn_cascade_booking_on_departure_status();


-- ─── A5: Muthawif Assign → Guide Channel Auto-Init ────────────────────────────

CREATE OR REPLACE FUNCTION fn_auto_guide_channel_on_muthawif_assign()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_dep_date TEXT;
BEGIN
  -- Fire when muthawif_id is set (non-null) for the first time or changed
  IF (NEW.muthawif_id IS NOT NULL AND NEW.muthawif_id IS DISTINCT FROM OLD.muthawif_id) THEN
    -- Get departure date for channel name
    v_dep_date := to_char(NEW.departure_date, 'DD Mon YYYY');

    -- Create the main "all" channel if not already exists
    INSERT INTO guide_channels (departure_id, name, channel_type, is_active)
    SELECT
      NEW.id,
      'Seluruh Rombongan — ' || v_dep_date,
      'all',
      true
    WHERE NOT EXISTS (
      SELECT 1 FROM guide_channels
       WHERE departure_id = NEW.id AND channel_type = 'all'
    );
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_guide_channel_on_muthawif_assign ON departures;
CREATE TRIGGER trg_auto_guide_channel_on_muthawif_assign
  AFTER UPDATE OF muthawif_id ON departures
  FOR EACH ROW EXECUTE FUNCTION fn_auto_guide_channel_on_muthawif_assign();


-- ─── A6: Room Occupants → booking_passengers Sync ────────────────────────────

CREATE OR REPLACE FUNCTION fn_sync_room_number_on_occupant()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_customer_id     UUID;
  v_room_number     TEXT;
  v_hotel_city      TEXT;
  v_room_id         UUID;
BEGIN
  -- Determine which customer and room we're dealing with
  IF (TG_OP = 'DELETE') THEN
    v_customer_id := OLD.customer_id;
    v_room_id     := OLD.room_assignment_id;
  ELSE
    v_customer_id := NEW.customer_id;
    v_room_id     := NEW.room_assignment_id;
  END IF;

  -- Get room number and hotel city
  SELECT ra.room_number, h.city
    INTO v_room_number, v_hotel_city
    FROM room_assignments ra
    JOIN hotels h ON h.id = ra.hotel_id
   WHERE ra.id = v_room_id;

  IF TG_OP = 'DELETE' THEN
    -- On delete: clear the room number
    IF v_hotel_city ILIKE '%madinah%' OR v_hotel_city ILIKE '%medina%' THEN
      UPDATE booking_passengers
         SET room_number_madinah = NULL
       WHERE customer_id = v_customer_id AND room_number_madinah = v_room_number;
    ELSE
      UPDATE booking_passengers
         SET room_number_makkah = NULL
       WHERE customer_id = v_customer_id AND room_number_makkah = v_room_number;
    END IF;
  ELSE
    -- On insert/update: sync room number to booking_passengers
    IF v_hotel_city ILIKE '%madinah%' OR v_hotel_city ILIKE '%medina%' THEN
      UPDATE booking_passengers
         SET room_number_madinah = v_room_number
       WHERE customer_id = v_customer_id;
    ELSE
      UPDATE booking_passengers
         SET room_number_makkah = v_room_number
       WHERE customer_id = v_customer_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- room_occupants might use 'room_id' or 'room_assignment_id' as FK column name
-- We create both safely using a DO block
DO $$
BEGIN
  -- Check which column name is used
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'room_occupants' AND column_name = 'room_assignment_id'
  ) THEN
    DROP TRIGGER IF EXISTS trg_sync_room_number_on_occupant ON room_occupants;
    EXECUTE '
      CREATE TRIGGER trg_sync_room_number_on_occupant
        AFTER INSERT OR UPDATE OR DELETE ON room_occupants
        FOR EACH ROW EXECUTE FUNCTION fn_sync_room_number_on_occupant()
    ';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'room_occupants' AND column_name = 'room_id'
  ) THEN
    -- Column is room_id — create alternative function
    CREATE OR REPLACE FUNCTION fn_sync_room_number_on_occupant_v2()
    RETURNS TRIGGER LANGUAGE plpgsql AS $fn$
    DECLARE
      v_customer_id UUID;
      v_room_number TEXT;
      v_hotel_city  TEXT;
      v_room_id     UUID;
    BEGIN
      IF (TG_OP = 'DELETE') THEN
        v_customer_id := OLD.customer_id;
        v_room_id     := OLD.room_id;
      ELSE
        v_customer_id := NEW.customer_id;
        v_room_id     := NEW.room_id;
      END IF;

      SELECT ra.room_number, h.city
        INTO v_room_number, v_hotel_city
        FROM room_assignments ra
        JOIN hotels h ON h.id = ra.hotel_id
       WHERE ra.id = v_room_id;

      IF TG_OP = 'DELETE' THEN
        IF v_hotel_city ILIKE '%madinah%' OR v_hotel_city ILIKE '%medina%' THEN
          UPDATE booking_passengers SET room_number_madinah = NULL
           WHERE customer_id = v_customer_id AND room_number_madinah = v_room_number;
        ELSE
          UPDATE booking_passengers SET room_number_makkah = NULL
           WHERE customer_id = v_customer_id AND room_number_makkah = v_room_number;
        END IF;
      ELSE
        IF v_hotel_city ILIKE '%madinah%' OR v_hotel_city ILIKE '%medina%' THEN
          UPDATE booking_passengers SET room_number_madinah = v_room_number WHERE customer_id = v_customer_id;
        ELSE
          UPDATE booking_passengers SET room_number_makkah = v_room_number WHERE customer_id = v_customer_id;
        END IF;
      END IF;
      RETURN COALESCE(NEW, OLD);
    EXCEPTION WHEN OTHERS THEN RETURN COALESCE(NEW, OLD);
    END;
    $fn$;

    DROP TRIGGER IF EXISTS trg_sync_room_number_on_occupant ON room_occupants;
    EXECUTE '
      CREATE TRIGGER trg_sync_room_number_on_occupant
        AFTER INSERT OR UPDATE OR DELETE ON room_occupants
        FOR EACH ROW EXECUTE FUNCTION fn_sync_room_number_on_occupant_v2()
    ';
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END;
$$;


-- ─── B7: Equipment Distributed → departure_expenses Auto ─────────────────────

CREATE OR REPLACE FUNCTION fn_equipment_dist_to_expenses()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_departure_id  UUID;
  v_unit_cost     NUMERIC;
  v_qty           INTEGER;
  v_item_name     TEXT;
  v_amount        NUMERIC;
BEGIN
  -- Only fire when status changes TO 'distributed'
  IF (NEW.status = 'distributed' AND (OLD.status IS DISTINCT FROM 'distributed')) THEN
    -- Get equipment info
    SELECT ei.unit_cost, ei.name, COALESCE(NEW.quantity, 1)
      INTO v_unit_cost, v_item_name, v_qty
      FROM equipment_items ei
     WHERE ei.id = NEW.equipment_id;

    -- Get departure_id
    v_departure_id := NEW.departure_id;

    -- Only record if unit_cost is set and we have a departure
    IF v_departure_id IS NOT NULL AND v_unit_cost IS NOT NULL AND v_unit_cost > 0 THEN
      v_amount := v_unit_cost * v_qty;

      -- Upsert to departure_expenses (deduplicate by distribution_id reference in description)
      INSERT INTO departure_expenses (
        departure_id,
        expense_date,
        category,
        description,
        amount,
        currency,
        exchange_rate
      )
      SELECT
        v_departure_id,
        CURRENT_DATE,
        'perlengkapan',
        'Distribusi: ' || v_item_name || ' ×' || v_qty || ' [dist:' || NEW.id || ']',
        v_amount,
        'IDR',
        1
      WHERE NOT EXISTS (
        SELECT 1 FROM departure_expenses
         WHERE description LIKE '%[dist:' || NEW.id || ']%'
      );
    END IF;
  END IF;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_equipment_dist_to_expenses ON equipment_distributions;
CREATE TRIGGER trg_equipment_dist_to_expenses
  AFTER UPDATE OF status ON equipment_distributions
  FOR EACH ROW EXECUTE FUNCTION fn_equipment_dist_to_expenses();
