-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Master Migration v3
-- FILE M05: Customers, Bookings, Passengers, Payments, Leads
-- Depends on: M01, M02, M03, M04
-- =============================================================================

-- =============================================================================
-- 1. CUSTOMERS — Data jamaah/calon jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  agent_id        UUID REFERENCES agents(id) ON DELETE SET NULL,
  full_name       TEXT NOT NULL,
  phone           TEXT,
  email           TEXT,
  nik             TEXT,
  passport_number TEXT,
  passport_expiry DATE,
  birth_date      DATE,
  birth_place     TEXT,
  gender          TEXT CHECK (gender IN ('male','female')),
  address         TEXT,
  city            TEXT,
  province        TEXT,
  postal_code     TEXT,
  occupation      TEXT,
  education       TEXT,
  emergency_contact_name  TEXT,
  emergency_contact_phone TEXT,
  photo_url       TEXT,
  notes           TEXT,
  tags            TEXT[] DEFAULT '{}',
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_user_id   ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_agent_id  ON customers(agent_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone     ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_nik       ON customers(nik);
CREATE INDEX IF NOT EXISTS idx_customers_email     ON customers(email);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customers_staff_manage"  ON customers;
DROP POLICY IF EXISTS "customers_own_read"      ON customers;
DROP POLICY IF EXISTS "customers_agent_manage"  ON customers;

CREATE POLICY "customers_staff_manage" ON customers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','sales','finance','it'))
  );

CREATE POLICY "customers_own_read" ON customers
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "customers_agent_manage" ON customers
  FOR ALL USING (
    agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_customers_updated_at'
    AND tgrelid='customers'::regclass) THEN
    CREATE TRIGGER set_customers_updated_at
      BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON customers TO authenticated;


-- =============================================================================
-- 2. CUSTOMER_ACCOUNTS — Akun portal jamaah (self-service)
-- =============================================================================
CREATE TABLE IF NOT EXISTS customer_accounts (
  id                    UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id           UUID REFERENCES customers(id) ON DELETE SET NULL,
  referred_by_agent_id  UUID REFERENCES agents(id) ON DELETE SET NULL,
  referred_by_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  agent_slug            TEXT,
  branch_slug           TEXT,
  is_verified           BOOLEAN NOT NULL DEFAULT FALSE,
  verified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_accounts_user_id  ON customer_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_accounts_cust_id  ON customer_accounts(customer_id);

ALTER TABLE customer_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_accounts_own"        ON customer_accounts;
DROP POLICY IF EXISTS "customer_accounts_staff_read" ON customer_accounts;

CREATE POLICY "customer_accounts_own" ON customer_accounts
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "customer_accounts_staff_read" ON customer_accounts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','sales','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_customer_accounts_updated_at'
    AND tgrelid='customer_accounts'::regclass) THEN
    CREATE TRIGGER set_customer_accounts_updated_at
      BEFORE UPDATE ON customer_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE ON customer_accounts TO authenticated;


-- =============================================================================
-- 3. BOOKINGS — Pemesanan paket
-- =============================================================================
CREATE TABLE IF NOT EXISTS bookings (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_code      TEXT UNIQUE,
  customer_id       UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  departure_id      UUID REFERENCES departures(id) ON DELETE RESTRICT,
  agent_id          UUID REFERENCES agents(id) ON DELETE SET NULL,
  branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','completed','cancelled','waitlist')),
  total_price       NUMERIC(15,2) NOT NULL DEFAULT 0,
  paid_amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  remaining_amount  NUMERIC(15,2) GENERATED ALWAYS AS (GREATEST(0, total_price - paid_amount)) STORED,
  payment_status    TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid','partial','paid','refunded','overpaid')),
  payment_deadline  DATE,
  room_type         TEXT DEFAULT 'quad'
    CHECK (room_type IN ('quad','triple','double','single')),
  total_pax         INTEGER NOT NULL DEFAULT 1,
  dp_amount         NUMERIC(15,2),
  dp_percent        NUMERIC(5,2),
  discount_amount   NUMERIC(15,2) DEFAULT 0,
  discount_reason   TEXT,
  coupon_code       TEXT,
  notes             TEXT,
  internal_notes    TEXT,
  confirmed_at      TIMESTAMPTZ,
  confirmed_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  cancelled_at      TIMESTAMPTZ,
  cancelled_reason  TEXT,
  created_by        UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id    ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_departure_id   ON bookings(departure_id);
CREATE INDEX IF NOT EXISTS idx_bookings_agent_id       ON bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_branch_id      ON bookings(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status         ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code   ON bookings(booking_code);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at     ON bookings(created_at DESC);

ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookings_staff_manage"   ON bookings;
DROP POLICY IF EXISTS "bookings_own_read"       ON bookings;
DROP POLICY IF EXISTS "bookings_agent_read"     ON bookings;

CREATE POLICY "bookings_staff_manage" ON bookings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','sales','finance','it'))
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

GRANT SELECT ON bookings TO authenticated;


-- =============================================================================
-- 4. BOOKING_PASSENGERS — Data pax per booking
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_passengers (
  id                UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id        UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  customer_id       UUID REFERENCES customers(id) ON DELETE SET NULL,
  full_name         TEXT NOT NULL,
  nik               TEXT,
  passport_number   TEXT,
  passport_expiry   DATE,
  birth_date        DATE,
  gender            TEXT CHECK (gender IN ('male','female')),
  age_category      TEXT NOT NULL DEFAULT 'adult'
    CHECK (age_category IN ('adult','child','infant')),
  price_category    TEXT DEFAULT 'adult'
    CHECK (price_category IN ('adult','child','infant')),
  price_override    NUMERIC(15,2),
  room_type         TEXT DEFAULT 'quad',
  room_number       TEXT,
  seat_number       TEXT,
  mahram_id         UUID REFERENCES booking_passengers(id) ON DELETE SET NULL,
  visa_number       TEXT,
  visa_status       TEXT DEFAULT 'pending'
    CHECK (visa_status IN ('pending','submitted','approved','rejected','expired')),
  is_primary        BOOLEAN NOT NULL DEFAULT FALSE,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_passengers_booking_id  ON booking_passengers(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_passengers_customer_id ON booking_passengers(customer_id);
CREATE INDEX IF NOT EXISTS idx_booking_passengers_nik         ON booking_passengers(nik);

ALTER TABLE booking_passengers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_passengers_staff_manage" ON booking_passengers;
DROP POLICY IF EXISTS "booking_passengers_own_read"     ON booking_passengers;

CREATE POLICY "booking_passengers_staff_manage" ON booking_passengers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','sales','visa_officer','it'))
  );

CREATE POLICY "booking_passengers_own_read" ON booking_passengers
  FOR SELECT USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_booking_passengers_updated_at'
    AND tgrelid='booking_passengers'::regclass) THEN
    CREATE TRIGGER set_booking_passengers_updated_at
      BEFORE UPDATE ON booking_passengers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON booking_passengers TO authenticated;

-- ALTER TABLE guards
SELECT _add_column_if_not_exists('booking_passengers','price_category', 'TEXT', 'DEFAULT ''adult''');
SELECT _add_column_if_not_exists('booking_passengers','price_override',  'NUMERIC(15,2)', '');


-- =============================================================================
-- 5. BOOKING_LINE_ITEMS — Rincian harga per item booking
-- =============================================================================
CREATE TABLE IF NOT EXISTS booking_line_items (
  id           UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id   UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES booking_passengers(id) ON DELETE SET NULL,
  label        TEXT NOT NULL,
  category     TEXT NOT NULL DEFAULT 'package',
  unit_price   NUMERIC(15,2) NOT NULL DEFAULT 0,
  qty          INTEGER NOT NULL DEFAULT 1,
  subtotal     NUMERIC(15,2) GENERATED ALWAYS AS (unit_price * qty) STORED,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_line_items_booking_id   ON booking_line_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_line_items_passenger_id ON booking_line_items(passenger_id);

ALTER TABLE booking_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_line_items_staff_manage" ON booking_line_items;
DROP POLICY IF EXISTS "booking_line_items_own_read"     ON booking_line_items;

CREATE POLICY "booking_line_items_staff_manage" ON booking_line_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational','sales','finance','it'))
  );

CREATE POLICY "booking_line_items_own_read" ON booking_line_items
  FOR SELECT USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

GRANT SELECT ON booking_line_items TO authenticated;


-- =============================================================================
-- 6. PAYMENTS — Data pembayaran
-- =============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id               UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id       UUID NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  amount           NUMERIC(15,2) NOT NULL,
  payment_type     TEXT NOT NULL DEFAULT 'dp'
    CHECK (payment_type IN ('dp','installment','full','extra','refund')),
  payment_method   TEXT NOT NULL DEFAULT 'transfer'
    CHECK (payment_method IN ('transfer','cash','qris','virtual_account','credit_card','debit_card','other')),
  bank_account_id  UUID,
  proof_url        TEXT,
  notes            TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','verified','rejected','cancelled')),
  verified_by      UUID REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  payment_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_ref  TEXT,
  created_by       UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_booking_id  ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status      ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date DESC);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_staff_manage"  ON payments;
DROP POLICY IF EXISTS "payments_own_read"      ON payments;
DROP POLICY IF EXISTS "payments_customer_add"  ON payments;

CREATE POLICY "payments_staff_manage" ON payments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','finance','operational','it'))
  );

CREATE POLICY "payments_own_read" ON payments
  FOR SELECT USING (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

CREATE POLICY "payments_customer_add" ON payments
  FOR INSERT WITH CHECK (
    booking_id IN (
      SELECT b.id FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_payments_updated_at'
    AND tgrelid='payments'::regclass) THEN
    CREATE TRIGGER set_payments_updated_at
      BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT, INSERT ON payments TO authenticated;


-- =============================================================================
-- 7. BANK_ACCOUNTS — Rekening bank perusahaan untuk pembayaran
-- =============================================================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name       TEXT NOT NULL,
  account_number  TEXT NOT NULL,
  account_name    TEXT NOT NULL,
  branch_name     TEXT,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  is_primary      BOOLEAN NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  qr_code_url     TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bank_accounts_auth_read"    ON bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_admin_write"  ON bank_accounts;

CREATE POLICY "bank_accounts_auth_read" ON bank_accounts
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "bank_accounts_admin_write" ON bank_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','finance','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_bank_accounts_updated_at'
    AND tgrelid='bank_accounts'::regclass) THEN
    CREATE TRIGGER set_bank_accounts_updated_at
      BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON bank_accounts TO authenticated, anon;


-- =============================================================================
-- 8. SAVINGS_PLANS — Program tabungan haji/umroh
-- =============================================================================
CREATE TABLE IF NOT EXISTS savings_plans (
  id              UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  branch_id       UUID REFERENCES branches(id) ON DELETE SET NULL,
  plan_code       TEXT UNIQUE,
  target_package  TEXT,
  target_amount   NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  monthly_target  NUMERIC(15,2),
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','completed','cancelled','converted')),
  start_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date     DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_savings_plans_customer_id ON savings_plans(customer_id);
CREATE INDEX IF NOT EXISTS idx_savings_plans_status      ON savings_plans(status);

ALTER TABLE savings_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "savings_plans_admin_manage" ON savings_plans;
DROP POLICY IF EXISTS "savings_plans_own_read"     ON savings_plans;

CREATE POLICY "savings_plans_admin_manage" ON savings_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','finance','it'))
  );

CREATE POLICY "savings_plans_own_read" ON savings_plans
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_savings_plans_updated_at'
    AND tgrelid='savings_plans'::regclass) THEN
    CREATE TRIGGER set_savings_plans_updated_at
      BEFORE UPDATE ON savings_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON savings_plans TO authenticated;


-- =============================================================================
-- 9. SAVINGS_DEPOSITS — Setoran tabungan
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','finance'))
  );

CREATE POLICY "savings_deposits_own_read" ON savings_deposits
  FOR SELECT USING (
    plan_id IN (
      SELECT sp.id FROM savings_plans sp
      JOIN customers c ON c.id = sp.customer_id
      WHERE c.user_id = auth.uid()
    )
  );

GRANT SELECT ON savings_deposits TO authenticated;


-- =============================================================================
-- 10. LEADS — Data calon jamaah/prospek
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','sales','marketing'))
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

GRANT SELECT ON leads TO authenticated;


-- =============================================================================
-- 11. PAYMENT_DEADLINE_REMINDERS — Reminder jatuh tempo (fase30)
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','operational','finance','it'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_pdr_updated_at'
    AND tgrelid='payment_deadline_reminders'::regclass) THEN
    CREATE TRIGGER set_pdr_updated_at
      BEFORE UPDATE ON payment_deadline_reminders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

GRANT SELECT ON payment_deadline_reminders TO authenticated;


-- =============================================================================
-- 12. INVOICE_TEMPLATES — Template faktur (termasuk kolom QR fase26)
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
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','finance'))
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

GRANT SELECT ON invoice_templates TO authenticated;

-- ALTER TABLE guards
SELECT _add_column_if_not_exists('invoice_templates','show_qr_code',  'BOOLEAN', 'NOT NULL DEFAULT TRUE');
SELECT _add_column_if_not_exists('invoice_templates','qr_placement',   'TEXT',    'NOT NULL DEFAULT ''bottom-right''');


-- =============================================================================
-- SELESAI — File M05: Customers, Bookings & Payments
-- =============================================================================
SELECT 'v3_M05_customers_bookings: OK' AS result;
