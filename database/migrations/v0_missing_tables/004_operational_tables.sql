-- ============================================================
-- V0 MISSING TABLES — 004: Operational Departure Tables
-- Tabel-tabel operasional yang direferensikan di
-- delete_departure_safely() tapi belum ada migration-nya.
-- Semua di-DELETE saat departure dihapus (cascade manual).
--
-- Tabel: bus_assignments, itineraries, manifests, luggage,
--        vendor_costs, jamaah_live_locations,
--        room_assignment_audit, savings_payments
-- ============================================================

-- ── 1. BUS_ASSIGNMENTS ───────────────────────────────────────
-- Penugasan bus untuk angkutan jamaah per keberangkatan.
CREATE TABLE IF NOT EXISTS bus_assignments (
  id             UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id   UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  bus_number     TEXT        NOT NULL,
  capacity       INTEGER     NOT NULL DEFAULT 40,
  driver_name    TEXT,
  driver_phone   TEXT,
  vendor_id      UUID        REFERENCES vendors(id) ON DELETE SET NULL,
  route_notes    TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bus_assignments_departure_id ON bus_assignments(departure_id);

DROP TRIGGER IF EXISTS set_bus_assignments_updated_at ON bus_assignments;
CREATE TRIGGER set_bus_assignments_updated_at
  BEFORE UPDATE ON bus_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE bus_assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read bus_assignments"
  ON bus_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage bus_assignments"
  ON bus_assignments FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );


-- ── 2. ITINERARIES ───────────────────────────────────────────
-- Jadwal perjalanan per keberangkatan (hari-per-hari).
CREATE TABLE IF NOT EXISTS itineraries (
  id             UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id   UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  day_number     INTEGER     NOT NULL,
  date           DATE,
  title          TEXT        NOT NULL DEFAULT '',
  description    TEXT,
  location       TEXT,
  activity_type  TEXT        DEFAULT 'ibadah'
                             CHECK (activity_type IN ('ibadah','perjalanan','hotel','makan','bebas','lainnya')),
  sort_order     INTEGER     NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_itineraries_departure_id ON itineraries(departure_id);
CREATE INDEX IF NOT EXISTS idx_itineraries_day          ON itineraries(departure_id, day_number);

DROP TRIGGER IF EXISTS set_itineraries_updated_at ON itineraries;
CREATE TRIGGER set_itineraries_updated_at
  BEFORE UPDATE ON itineraries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read itineraries"
  ON itineraries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage itineraries"
  ON itineraries FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );


-- ── 3. MANIFESTS ─────────────────────────────────────────────
-- Manifest keberangkatan (daftar resmi jamaah per penerbangan).
CREATE TABLE IF NOT EXISTS manifests (
  id             UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id   UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  manifest_type  TEXT        NOT NULL DEFAULT 'embarkasi'
                             CHECK (manifest_type IN ('embarkasi','debarkasi','transit')),
  flight_number  TEXT,
  airline_id     UUID        REFERENCES airlines(id) ON DELETE SET NULL,
  flight_date    DATE,
  origin_airport TEXT,
  dest_airport   TEXT,
  generated_at   TIMESTAMPTZ,
  generated_by   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  file_url       TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manifests_departure_id ON manifests(departure_id);

DROP TRIGGER IF EXISTS set_manifests_updated_at ON manifests;
CREATE TRIGGER set_manifests_updated_at
  BEFORE UPDATE ON manifests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE manifests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read manifests"
  ON manifests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage manifests"
  ON manifests FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );


-- ── 4. LUGGAGE ───────────────────────────────────────────────
-- Tracking koper/bagasi jamaah.
CREATE TABLE IF NOT EXISTS luggage (
  id              UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id    UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id      UUID        REFERENCES bookings(id) ON DELETE CASCADE,
  passenger_id    UUID        REFERENCES booking_passengers(id) ON DELETE SET NULL,
  tag_number      TEXT,
  weight_kg       NUMERIC,
  status          TEXT        NOT NULL DEFAULT 'registered'
                              CHECK (status IN ('registered','checked_in','in_transit','delivered','lost','damaged')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_luggage_departure_id ON luggage(departure_id);
CREATE INDEX IF NOT EXISTS idx_luggage_booking_id   ON luggage(booking_id);

DROP TRIGGER IF EXISTS set_luggage_updated_at ON luggage;
CREATE TRIGGER set_luggage_updated_at
  BEFORE UPDATE ON luggage
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE luggage ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read luggage"
  ON luggage FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff manage luggage"
  ON luggage FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );


-- ── 5. VENDOR_COSTS ──────────────────────────────────────────
-- Biaya vendor per keberangkatan (bus, guide, katering, dll).
CREATE TABLE IF NOT EXISTS vendor_costs (
  id             UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id   UUID        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  vendor_id      UUID        REFERENCES vendors(id) ON DELETE SET NULL,
  cost_type      TEXT        NOT NULL DEFAULT 'other'
                             CHECK (cost_type IN ('bus','guide','catering','hotel','handling','visa','other')),
  description    TEXT        NOT NULL DEFAULT '',
  amount         NUMERIC     NOT NULL DEFAULT 0,
  currency       TEXT        NOT NULL DEFAULT 'IDR',
  paid_at        TIMESTAMPTZ,
  receipt_url    TEXT,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_costs_departure_id ON vendor_costs(departure_id);
CREATE INDEX IF NOT EXISTS idx_vendor_costs_vendor_id    ON vendor_costs(vendor_id);

DROP TRIGGER IF EXISTS set_vendor_costs_updated_at ON vendor_costs;
CREATE TRIGGER set_vendor_costs_updated_at
  BEFORE UPDATE ON vendor_costs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE vendor_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read vendor_costs"
  ON vendor_costs FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );
CREATE POLICY "Staff manage vendor_costs"
  ON vendor_costs FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );


-- ── 6. JAMAAH_LIVE_LOCATIONS ────────────────────────────────
-- GPS tracking lokasi jamaah secara real-time saat di lapangan.
CREATE TABLE IF NOT EXISTS jamaah_live_locations (
  id             UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id   UUID        REFERENCES departures(id) ON DELETE SET NULL,
  customer_id    UUID        REFERENCES customers(id)  ON DELETE CASCADE,
  user_id        UUID        REFERENCES profiles(id)   ON DELETE CASCADE,
  latitude       NUMERIC     NOT NULL,
  longitude      NUMERIC     NOT NULL,
  accuracy_m     NUMERIC,
  battery_pct    INTEGER,
  is_sos         BOOLEAN     NOT NULL DEFAULT false,
  recorded_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_loc_departure_id  ON jamaah_live_locations(departure_id);
CREATE INDEX IF NOT EXISTS idx_live_loc_customer_id   ON jamaah_live_locations(customer_id);
CREATE INDEX IF NOT EXISTS idx_live_loc_recorded_at   ON jamaah_live_locations(recorded_at DESC);

ALTER TABLE jamaah_live_locations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff track jamaah locations"
  ON jamaah_live_locations FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );
CREATE POLICY "Jamaah insert own location"
  ON jamaah_live_locations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());


-- ── 7. ROOM_ASSIGNMENT_AUDIT ────────────────────────────────
-- Audit trail perubahan penugasan kamar jamaah.
CREATE TABLE IF NOT EXISTS room_assignment_audit (
  id              UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  departure_id    UUID        REFERENCES departures(id) ON DELETE SET NULL,
  room_assignment_id UUID     REFERENCES room_assignments(id) ON DELETE SET NULL,
  passenger_id    UUID        REFERENCES booking_passengers(id) ON DELETE SET NULL,
  action          TEXT        NOT NULL CHECK (action IN ('assigned','unassigned','moved','swapped')),
  old_room        TEXT,
  new_room        TEXT,
  changed_by      UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  reason          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_audit_departure_id ON room_assignment_audit(departure_id);
CREATE INDEX IF NOT EXISTS idx_room_audit_created_at   ON room_assignment_audit(created_at DESC);

ALTER TABLE room_assignment_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff read room audit"
  ON room_assignment_audit FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );
CREATE POLICY "Staff insert room audit"
  ON room_assignment_audit FOR INSERT TO authenticated
  WITH CHECK (true);


-- ── 8. SAVINGS_PAYMENTS ──────────────────────────────────────
-- Rekaman setoran tabungan haji/umroh.
--
-- ⚠️ CATATAN DEPENDENCY KRITIS:
-- Kolom schedule_id mereferensikan tabel savings_schedules.
-- savings_schedules DIBUAT di v4_patches/20260513111158_6897f5ed.sql.
-- v4_patches/20260513111158 juga membuat TRIGGER ON savings_payments.
--
-- Solusi: savings_payments dibuat di sini TANPA FK constraint ke savings_schedules.
-- FK ditambahkan di: v0_missing_tables/005_post_v4patches.sql (setelah savings_schedules ada).
--
-- Urutan wajib:
--   004 (file ini)  →  [v4_patches/20260513111158 membuat savings_schedules]  →  005 (tambah FK)
CREATE TABLE IF NOT EXISTS savings_payments (
  id              UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  savings_plan_id UUID        NOT NULL REFERENCES savings_plans(id) ON DELETE CASCADE,
  schedule_id     UUID,                 -- FK ke savings_schedules ditambah di file 005 setelah tabel itu ada
  amount          NUMERIC     NOT NULL DEFAULT 0,
  payment_date    DATE        NOT NULL DEFAULT CURRENT_DATE,
  method          TEXT        NOT NULL DEFAULT 'transfer'
                              CHECK (method IN ('transfer','cash','auto_debit','qris')),
  reference_no    TEXT,
  proof_url       TEXT,
  status          TEXT        NOT NULL DEFAULT 'verified'
                              CHECK (status IN ('pending','verified','rejected')),
  notes           TEXT,
  recorded_by     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_savings_payments_plan_id     ON savings_payments(savings_plan_id);
CREATE INDEX IF NOT EXISTS idx_savings_payments_schedule_id ON savings_payments(schedule_id);
CREATE INDEX IF NOT EXISTS idx_savings_payments_date        ON savings_payments(payment_date DESC);

DROP TRIGGER IF EXISTS set_savings_payments_updated_at ON savings_payments;
CREATE TRIGGER set_savings_payments_updated_at
  BEFORE UPDATE ON savings_payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE savings_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Customers see own savings payments"
  ON savings_payments FOR SELECT TO authenticated
  USING (
    savings_plan_id IN (
      SELECT sp.id FROM savings_plans sp
      JOIN customers c ON c.id = sp.customer_id
      WHERE c.user_id = auth.uid()
    )
    OR EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','sales'))
  );
CREATE POLICY "Staff manage savings payments"
  ON savings_payments FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational','sales'))
  );
