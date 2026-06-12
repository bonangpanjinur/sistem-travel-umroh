-- =============================================================================
-- FILE 03 — Customers, Bookings & Payments
-- Urutan: customers → customer_documents → customer_mahrams →
--         bookings → booking_passengers → booking_status_history →
--         booking_document_logs → booking_line_items →
--         room_assignments → equipment_distributions →
--         savings_plans → savings_deposits → leads →
--         payment_deadline_reminders → invoice_templates
-- Jalankan setelah 02_core_entities.sql
-- =============================================================================

-- =============================================================================
-- 1. CUSTOMERS — Data jamaah/pelanggan
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id                           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id                    UUID REFERENCES branches(id) ON DELETE SET NULL,
  full_name                    TEXT NOT NULL,
  nik                          TEXT,
  gender                       TEXT CHECK (gender IN ('L','P')),
  phone                        TEXT,
  email                        TEXT,
  address                      TEXT,
  city                         TEXT,
  province                     TEXT,
  postal_code                  TEXT,
  birth_date                   DATE,
  birth_place                  TEXT,
  passport_number              TEXT,
  passport_expiry              DATE,
  passport_issued              TEXT,
  photo_url                    TEXT,
  is_active                    BOOLEAN DEFAULT TRUE,
  nomor_porsi_haji             TEXT,
  embarkasi_kode               TEXT,
  estimasi_keberangkatan_haji  INTEGER,
  created_at                   TIMESTAMPTZ DEFAULT NOW(),
  updated_at                   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id   ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_is_active ON customers(is_active);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_admin_manage" ON customers;
DROP POLICY IF EXISTS "customers_own_read"     ON customers;

CREATE POLICY "customers_admin_manage" ON customers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','sales','finance')
    )
  );

CREATE POLICY "customers_own_read" ON customers
  FOR SELECT USING (user_id = auth.uid());

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_customers_updated_at'
    AND tgrelid='customers'::regclass) THEN
    CREATE TRIGGER set_customers_updated_at
      BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 2. CUSTOMER_DOCUMENTS — Dokumen jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_documents (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  file_url    TEXT,
  status      TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','verified','rejected')),
  notes       TEXT,
  verified_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_docs_customer_id ON customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_docs_type        ON customer_documents(type);
CREATE INDEX IF NOT EXISTS idx_customer_docs_status      ON customer_documents(status);

ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_all_customer_documents"  ON customer_documents;
DROP POLICY IF EXISTS "staff_write_customer_documents"     ON customer_documents;

CREATE POLICY "staff_read_all_customer_documents" ON customer_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "staff_write_customer_documents" ON customer_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_customer_docs_updated_at'
    AND tgrelid='customer_documents'::regclass) THEN
    CREATE TRIGGER set_customer_docs_updated_at
      BEFORE UPDATE ON customer_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 3. CUSTOMER_MAHRAMS — Data mahram jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_mahrams (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  mahram_customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
  full_name         TEXT NOT NULL,
  relation          TEXT NOT NULL,
  relation_category TEXT DEFAULT 'lainnya'
    CHECK (relation_category IN ('suami','istri','anak','ayah','ibu','saudara','kakek','nenek','cucu','lainnya')),
  nik               TEXT,
  passport_number   TEXT,
  phone             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_mahrams_customer_id ON customer_mahrams(customer_id);

ALTER TABLE customer_mahrams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_all_customer_mahrams"  ON customer_mahrams;
DROP POLICY IF EXISTS "staff_write_customer_mahrams"     ON customer_mahrams;

CREATE POLICY "staff_read_all_customer_mahrams" ON customer_mahrams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "staff_write_customer_mahrams" ON customer_mahrams
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_customer_mahrams_updated_at'
    AND tgrelid='customer_mahrams'::regclass) THEN
    CREATE TRIGGER set_customer_mahrams_updated_at
      BEFORE UPDATE ON customer_mahrams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 4. BOOKINGS — Pemesanan (termasuk kolom fase3, fase29)
-- =============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id        UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  departure_id       UUID REFERENCES departures(id) ON DELETE SET NULL,
  agent_id           UUID REFERENCES agents(id) ON DELETE SET NULL,
  booking_code       TEXT NOT NULL UNIQUE,
  status             TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled','completed')),
  total_price        NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  remaining_amount   NUMERIC(15,2) GENERATED ALWAYS AS (GREATEST(0, total_price - paid_amount)) STORED,
  payment_status     TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','partial','paid','refunded')),
  room_type          TEXT DEFAULT 'quad'
    CHECK (room_type IN ('double','triple','quad')),
  total_pax          INTEGER DEFAULT 1,
  notes              TEXT,
  referral_source    TEXT DEFAULT 'direct'
    CHECK (referral_source IN ('direct','agent_website','branch_website','referral','whatsapp','instagram','facebook','other')),
  bagasi_kg_allowed  INTEGER DEFAULT 23,
  payment_deadline   DATE,
  qr_token           TEXT UNIQUE DEFAULT gen_random_uuid()::TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id    ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_departure_id   ON bookings(departure_id);
CREATE INDEX IF NOT EXISTS idx_bookings_agent_id       ON bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status         ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code   ON bookings(booking_code);
CREATE INDEX IF NOT EXISTS idx_bookings_qr_token       ON bookings(qr_token);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_admin_manage"  ON bookings;
DROP POLICY IF EXISTS "bookings_own_read"      ON bookings;
DROP POLICY IF EXISTS "bookings_agent_read"    ON bookings;

CREATE POLICY "bookings_admin_manage" ON bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','finance','sales')
    )
  );

CREATE POLICY "bookings_own_read" ON bookings
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "bookings_agent_read" ON bookings
  FOR SELECT USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_bookings_updated_at'
    AND tgrelid='bookings'::regclass) THEN
    CREATE TRIGGER set_bookings_updated_at
      BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 5. BOOKING_PASSENGERS — Penumpang per booking (termasuk kolom fase8 & fase29)
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_passengers (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  is_main_passenger BOOLEAN DEFAULT FALSE,
  passenger_type    TEXT DEFAULT 'dewasa'
    CHECK (passenger_type IN ('dewasa','lansia','anak','mahram')),
  room_preference   TEXT,
  room_number       TEXT,
  room_group_id     UUID,
  family_group_id   UUID,
  checkin_status    TEXT DEFAULT 'not_checked',
  checkin_time      TIMESTAMPTZ,
  checkin_notes     TEXT,
  price_override    NUMERIC(15,2),
  price_category    TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_passengers_booking_id   ON booking_passengers(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_passengers_customer_id  ON booking_passengers(customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_passengers_family_group ON booking_passengers(family_group_id) WHERE family_group_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_booking_passengers_room_group   ON booking_passengers(room_group_id) WHERE room_group_id IS NOT NULL;

ALTER TABLE booking_passengers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_passengers_admin_manage" ON booking_passengers;
DROP POLICY IF EXISTS "booking_passengers_own_read"     ON booking_passengers;

CREATE POLICY "booking_passengers_admin_manage" ON booking_passengers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','finance','sales')
    )
  );

CREATE POLICY "booking_passengers_own_read" ON booking_passengers
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );


-- =============================================================================
-- 6. BOOKING_STATUS_HISTORY — Riwayat perubahan status booking
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_status_history (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id  UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking_id ON booking_status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_created_at ON booking_status_history(created_at DESC);

ALTER TABLE booking_status_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_booking_status_history" ON booking_status_history;
DROP POLICY IF EXISTS "auth_read_booking_status_history"    ON booking_status_history;

CREATE POLICY "staff_manage_booking_status_history" ON booking_status_history
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','finance','sales')
    )
  );

CREATE POLICY "auth_read_booking_status_history" ON booking_status_history
  FOR SELECT TO authenticated USING (true);


-- =============================================================================
-- 7. BOOKING_DOCUMENT_LOGS — Log dokumen yang dibuat per booking
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_document_logs (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  doc_type     TEXT NOT NULL,
  doc_label    TEXT,
  file_url     TEXT,
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  notes        TEXT
);

CREATE INDEX IF NOT EXISTS idx_booking_doc_logs_booking_id   ON booking_document_logs(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_doc_logs_customer_id  ON booking_document_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_doc_logs_generated_at ON booking_document_logs(generated_at DESC);

ALTER TABLE booking_document_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_booking_doc_logs" ON booking_document_logs;
DROP POLICY IF EXISTS "customer_read_own_doc_logs"    ON booking_document_logs;

CREATE POLICY "staff_manage_booking_doc_logs" ON booking_document_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','finance')
    )
  );

CREATE POLICY "customer_read_own_doc_logs" ON booking_document_logs
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );


-- =============================================================================
-- 8. BOOKING_LINE_ITEMS — Rincian harga per item per booking (fase27)
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_line_items (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  passenger_id UUID,
  item_type    TEXT NOT NULL DEFAULT 'service',
  description  TEXT NOT NULL DEFAULT '',
  quantity     NUMERIC NOT NULL DEFAULT 1,
  unit_price   NUMERIC NOT NULL DEFAULT 0,
  total_price  NUMERIC NOT NULL DEFAULT 0,
  reference_id UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_line_items_booking_id   ON booking_line_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_line_items_passenger_id ON booking_line_items(passenger_id);

ALTER TABLE booking_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_manage_booking_line_items" ON booking_line_items;
CREATE POLICY "authenticated_manage_booking_line_items" ON booking_line_items
  FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- =============================================================================
-- 9. ROOM_ASSIGNMENTS — Penugasan kamar hotel
-- =============================================================================
CREATE TABLE IF NOT EXISTS room_assignments (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID REFERENCES departures(id) ON DELETE CASCADE,
  room_number    TEXT NOT NULL,
  room_type      TEXT NOT NULL DEFAULT 'quad'
    CHECK (room_type IN ('double','triple','quad')),
  floor          INTEGER,
  capacity       INTEGER DEFAULT 4,
  hotel_name     TEXT,
  hotel_location TEXT DEFAULT 'mecca'
    CHECK (hotel_location IN ('mecca','medina')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_assignments_departure_id ON room_assignments(departure_id);
CREATE INDEX IF NOT EXISTS idx_room_assignments_room_type    ON room_assignments(room_type);

ALTER TABLE room_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "room_assignments_staff_manage" ON room_assignments;
CREATE POLICY "room_assignments_staff_manage" ON room_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_room_assignments_updated_at'
    AND tgrelid='room_assignments'::regclass) THEN
    CREATE TRIGGER set_room_assignments_updated_at
      BEFORE UPDATE ON room_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 10. EQUIPMENT_DISTRIBUTIONS — Distribusi perlengkapan jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS equipment_distributions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id    UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  departure_id   UUID REFERENCES departures(id) ON DELETE SET NULL,
  item_name      TEXT NOT NULL,
  quantity       INTEGER DEFAULT 1,
  distributed_at TIMESTAMPTZ DEFAULT NOW(),
  distributed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_equip_dist_customer_id  ON equipment_distributions(customer_id);
CREATE INDEX IF NOT EXISTS idx_equip_dist_departure_id ON equipment_distributions(departure_id);

ALTER TABLE equipment_distributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "equip_dist_staff_manage" ON equipment_distributions;
DROP POLICY IF EXISTS "equip_dist_own_read"     ON equipment_distributions;

CREATE POLICY "equip_dist_staff_manage" ON equipment_distributions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

CREATE POLICY "equip_dist_own_read" ON equipment_distributions
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );


-- =============================================================================
-- 11. SAVINGS_PLANS — Program tabungan perjalanan
-- =============================================================================
CREATE TABLE IF NOT EXISTS savings_plans (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id    UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name           TEXT NOT NULL DEFAULT 'Tabungan Umroh',
  target_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  target_date    DATE,
  status         TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','cancelled')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_plans_customer_id ON savings_plans(customer_id);
CREATE INDEX IF NOT EXISTS idx_savings_plans_status      ON savings_plans(status);

ALTER TABLE savings_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "savings_plans_admin_manage" ON savings_plans;
DROP POLICY IF EXISTS "savings_plans_own_manage"   ON savings_plans;

CREATE POLICY "savings_plans_admin_manage" ON savings_plans
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance')
    )
  );

CREATE POLICY "savings_plans_own_manage" ON savings_plans
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_savings_plans_updated_at'
    AND tgrelid='savings_plans'::regclass) THEN
    CREATE TRIGGER set_savings_plans_updated_at
      BEFORE UPDATE ON savings_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 12. SAVINGS_DEPOSITS — Setoran tabungan
-- =============================================================================
CREATE TABLE IF NOT EXISTS savings_deposits (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id      UUID NOT NULL REFERENCES savings_plans(id) ON DELETE CASCADE,
  amount       NUMERIC(15,2) NOT NULL,
  deposit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_deposits_plan_id ON savings_deposits(plan_id);

ALTER TABLE savings_deposits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "savings_deposits_admin_manage" ON savings_deposits;
DROP POLICY IF EXISTS "savings_deposits_own_read"     ON savings_deposits;

CREATE POLICY "savings_deposits_admin_manage" ON savings_deposits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance')
    )
  );

CREATE POLICY "savings_deposits_own_read" ON savings_deposits
  FOR SELECT USING (
    plan_id IN (
      SELECT sp.id FROM savings_plans sp
      JOIN customers c ON c.id = sp.customer_id
      WHERE c.user_id = auth.uid()
    )
  );


-- =============================================================================
-- 13. LEADS — Data calon jamaah/prospek
-- =============================================================================
CREATE TABLE IF NOT EXISTS leads (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  phone            TEXT NOT NULL,
  email            TEXT,
  source           TEXT DEFAULT 'direct'
    CHECK (source IN ('direct','whatsapp','instagram','facebook','referral','website','lainnya')),
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  agent_id         UUID REFERENCES agents(id) ON DELETE SET NULL,
  status           TEXT DEFAULT 'new'
    CHECK (status IN ('new','contacted','qualified','converted','lost')),
  notes            TEXT,
  package_interest TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON leads(branch_id);
CREATE INDEX IF NOT EXISTS idx_leads_agent_id  ON leads(agent_id);
CREATE INDEX IF NOT EXISTS idx_leads_status    ON leads(status);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leads_staff_manage"     ON leads;
DROP POLICY IF EXISTS "leads_agent_own_manage" ON leads;

CREATE POLICY "leads_staff_manage" ON leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','sales','marketing')
    )
  );

CREATE POLICY "leads_agent_own_manage" ON leads
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_leads_updated_at'
    AND tgrelid='leads'::regclass) THEN
    CREATE TRIGGER set_leads_updated_at
      BEFORE UPDATE ON leads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 14. PAYMENT_DEADLINE_REMINDERS — Reminder jatuh tempo pembayaran (fase30)
-- =============================================================================
CREATE TABLE IF NOT EXISTS payment_deadline_reminders (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  booking_code     TEXT NOT NULL,
  phone            TEXT NOT NULL,
  full_name        TEXT,
  payment_deadline DATE,
  remaining_amount NUMERIC(15,2),
  days_before      INTEGER NOT NULL DEFAULT 7,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','sent','cancelled')),
  sent_at          TIMESTAMPTZ,
  error_message    TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (booking_id, days_before)
);

CREATE INDEX IF NOT EXISTS idx_pdr_booking_id   ON payment_deadline_reminders(booking_id);
CREATE INDEX IF NOT EXISTS idx_pdr_status       ON payment_deadline_reminders(status);
CREATE INDEX IF NOT EXISTS idx_pdr_booking_days ON payment_deadline_reminders(booking_id, days_before);

ALTER TABLE payment_deadline_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_payment_reminders" ON payment_deadline_reminders;
CREATE POLICY "staff_manage_payment_reminders" ON payment_deadline_reminders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','operational','finance','it')
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_pdr_updated_at'
    AND tgrelid='payment_deadline_reminders'::regclass) THEN
    CREATE TRIGGER set_pdr_updated_at
      BEFORE UPDATE ON payment_deadline_reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 15. INVOICE_TEMPLATES — Template faktur (termasuk kolom QR fase26)
-- =============================================================================
CREATE TABLE IF NOT EXISTS invoice_templates (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT NOT NULL,
  header_text      TEXT,
  footer_text      TEXT,
  logo_url         TEXT,
  signature_url    TEXT,
  is_default       BOOLEAN DEFAULT FALSE,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  show_qr_code     BOOLEAN NOT NULL DEFAULT TRUE,
  qr_placement     TEXT NOT NULL DEFAULT 'bottom-right',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_invoice_templates" ON invoice_templates;
DROP POLICY IF EXISTS "staff_read_invoice_templates"   ON invoice_templates;

CREATE POLICY "staff_manage_invoice_templates" ON invoice_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','finance')
    )
  );

CREATE POLICY "staff_read_invoice_templates" ON invoice_templates
  FOR SELECT USING (auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_invoice_templates_updated_at'
    AND tgrelid='invoice_templates'::regclass) THEN
    CREATE TRIGGER set_invoice_templates_updated_at
      BEFORE UPDATE ON invoice_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- =============================================================================
-- SELESAI — File 03: Customers, Bookings & Payments
-- =============================================================================
SELECT 'File 03 — Customers, Bookings & Payments: OK' AS result;
