-- =============================================================================
-- FILE 05 — Finance, HR, Training & Company Settings
-- Meliputi: payroll, cuti, kinerja, pemasaran, dashboard, pelatihan,
--           vendor, perlengkapan, media, pengaturan perusahaan,
--           departure financials, membership, approval configs
-- Jalankan setelah 04_operations_portal.sql
-- =============================================================================

-- =============================================================================
-- 1. PAYROLL_RECORDS — Data penggajian karyawan
-- =============================================================================
CREATE TABLE IF NOT EXISTS payroll_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  period_year       INTEGER NOT NULL,
  period_month      INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  basic_salary      NUMERIC(15,2) NOT NULL DEFAULT 0,
  allowances        NUMERIC(15,2) NOT NULL DEFAULT 0,
  overtime_pay      NUMERIC(15,2) NOT NULL DEFAULT 0,
  bonus             NUMERIC(15,2) NOT NULL DEFAULT 0,
  deductions        NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_kes_employee NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_kes_employer NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_tk_employee  NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_tk_employer  NUMERIC(15,2) NOT NULL DEFAULT 0,
  tax_pph21         NUMERIC(15,2) NOT NULL DEFAULT 0,
  net_salary        NUMERIC(15,2) NOT NULL DEFAULT 0,
  working_days      INTEGER DEFAULT 0,
  present_days      INTEGER DEFAULT 0,
  absent_days       INTEGER DEFAULT 0,
  late_days         INTEGER DEFAULT 0,
  overtime_hours    NUMERIC(5,2)  DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','approved','paid')),
  notes             TEXT,
  paid_at           TIMESTAMPTZ,
  approved_by       UUID REFERENCES auth.users(id),
  created_by        UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, period_year, period_month)
);

CREATE INDEX IF NOT EXISTS idx_payroll_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_period      ON payroll_records(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_status      ON payroll_records(status);

ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_can_manage_payroll" ON payroll_records;
CREATE POLICY "hr_can_manage_payroll" ON payroll_records
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','branch_manager','finance'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_payroll_records_updated_at'
    AND tgrelid='payroll_records'::regclass) THEN
    CREATE TRIGGER set_payroll_records_updated_at
      BEFORE UPDATE ON payroll_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 2. LEAVE_REQUESTS — Permohonan cuti karyawan
-- =============================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type       TEXT NOT NULL DEFAULT 'annual'
    CHECK (leave_type IN ('annual','sick','maternity','paternity','emergency','unpaid','other')),
  start_date       DATE NOT NULL,
  end_date         DATE NOT NULL,
  total_days       INTEGER GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
  reason           TEXT NOT NULL,
  attachment_url   TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by      UUID REFERENCES auth.users(id),
  approved_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_employee_id ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_status      ON leave_requests(status);

ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_can_view_own_leaves"  ON leave_requests;
DROP POLICY IF EXISTS "employee_can_create_leave"     ON leave_requests;
DROP POLICY IF EXISTS "hr_can_manage_leaves"          ON leave_requests;

CREATE POLICY "employee_can_view_own_leaves" ON leave_requests
  FOR SELECT USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "employee_can_create_leave" ON leave_requests
  FOR INSERT WITH CHECK (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));

CREATE POLICY "hr_can_manage_leaves" ON leave_requests
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','branch_manager'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_leave_requests_updated_at'
    AND tgrelid='leave_requests'::regclass) THEN
    CREATE TRIGGER set_leave_requests_updated_at
      BEFORE UPDATE ON leave_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 3. LEAVE_QUOTAS — Kuota cuti tahunan
-- =============================================================================
CREATE TABLE IF NOT EXISTS leave_quotas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year         INTEGER NOT NULL,
  annual_quota INTEGER NOT NULL DEFAULT 12,
  annual_used  INTEGER NOT NULL DEFAULT 0,
  sick_used    INTEGER NOT NULL DEFAULT 0,
  carry_over   INTEGER NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, year)
);

ALTER TABLE leave_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_can_manage_leave_quotas" ON leave_quotas;
CREATE POLICY "hr_can_manage_leave_quotas" ON leave_quotas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','branch_manager','finance'))
  );


-- =============================================================================
-- 4. PERFORMANCE_REVIEWS — Penilaian kinerja karyawan
-- =============================================================================
CREATE TABLE IF NOT EXISTS performance_reviews (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id         UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id         UUID REFERENCES auth.users(id),
  review_period       TEXT NOT NULL,
  review_type         TEXT NOT NULL DEFAULT 'quarterly'
    CHECK (review_type IN ('monthly','quarterly','semi_annual','annual')),
  score_quality       NUMERIC(3,1) CHECK (score_quality BETWEEN 1 AND 5),
  score_productivity  NUMERIC(3,1) CHECK (score_productivity BETWEEN 1 AND 5),
  score_initiative    NUMERIC(3,1) CHECK (score_initiative BETWEEN 1 AND 5),
  score_teamwork      NUMERIC(3,1) CHECK (score_teamwork BETWEEN 1 AND 5),
  score_attendance    NUMERIC(3,1) CHECK (score_attendance BETWEEN 1 AND 5),
  overall_score       NUMERIC(3,1) GENERATED ALWAYS AS (
    (COALESCE(score_quality,0) + COALESCE(score_productivity,0) +
     COALESCE(score_initiative,0) + COALESCE(score_teamwork,0) +
     COALESCE(score_attendance,0)) / 5.0
  ) STORED,
  grade               TEXT,
  strengths           TEXT,
  improvements        TEXT,
  goals               TEXT,
  comments            TEXT,
  status              TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','submitted','acknowledged')),
  acknowledged_at     TIMESTAMPTZ,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_perf_employee_id ON performance_reviews(employee_id);

ALTER TABLE performance_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hr_can_manage_performance"    ON performance_reviews;
DROP POLICY IF EXISTS "employee_can_view_own_review" ON performance_reviews;

CREATE POLICY "hr_can_manage_performance" ON performance_reviews
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','branch_manager'))
  );

CREATE POLICY "employee_can_view_own_review" ON performance_reviews
  FOR SELECT USING (employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid()));


-- =============================================================================
-- 5. MARKETING_CAMPAIGNS — Kampanye pemasaran
-- =============================================================================
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'digital'
    CHECK (type IN ('digital','print','event','referral','whatsapp','email','other')),
  status        TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','paused','completed','cancelled')),
  budget        NUMERIC(15,2) DEFAULT 0,
  spent         NUMERIC(15,2) DEFAULT 0,
  start_date    DATE,
  end_date      DATE,
  target_leads  INTEGER DEFAULT 0,
  target_bookings INTEGER DEFAULT 0,
  branch_id     UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status    ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_branch_id ON marketing_campaigns(branch_id);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "marketing_manage_campaigns" ON marketing_campaigns;
CREATE POLICY "marketing_manage_campaigns" ON marketing_campaigns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','marketing'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_marketing_campaigns_updated_at'
    AND tgrelid='marketing_campaigns'::regclass) THEN
    CREATE TRIGGER set_marketing_campaigns_updated_at
      BEFORE UPDATE ON marketing_campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 6. SALES_TARGETS — Target penjualan
-- =============================================================================
CREATE TABLE IF NOT EXISTS sales_targets (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  branch_id        UUID REFERENCES branches(id) ON DELETE SET NULL,
  period           TEXT NOT NULL,
  target_bookings  INTEGER DEFAULT 0,
  target_revenue   NUMERIC(15,2) DEFAULT 0,
  target_leads     INTEGER DEFAULT 0,
  actual_bookings  INTEGER DEFAULT 0,
  actual_revenue   NUMERIC(15,2) DEFAULT 0,
  actual_leads     INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, period)
);

CREATE INDEX IF NOT EXISTS idx_sales_targets_user_id  ON sales_targets(user_id);
CREATE INDEX IF NOT EXISTS idx_sales_targets_period   ON sales_targets(period);

ALTER TABLE sales_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_sales_targets" ON sales_targets;
DROP POLICY IF EXISTS "sales_read_own_targets"     ON sales_targets;

CREATE POLICY "admin_manage_sales_targets" ON sales_targets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

CREATE POLICY "sales_read_own_targets" ON sales_targets
  FOR SELECT USING (user_id = auth.uid());


-- =============================================================================
-- 7. TRAINING_MODULES — Modul pelatihan agen
-- =============================================================================
CREATE TABLE IF NOT EXISTS training_modules (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title            TEXT NOT NULL,
  description      TEXT,
  category         TEXT NOT NULL
    CHECK (category IN ('product_knowledge','script_penjualan','sop','regulasi','lainnya')),
  content_type     TEXT NOT NULL
    CHECK (content_type IN ('text','video','pdf','mixed')),
  content_url      TEXT,
  content_text     TEXT,
  thumbnail_url    TEXT,
  duration_minutes INTEGER,
  is_mandatory     BOOLEAN DEFAULT FALSE,
  order_index      INTEGER DEFAULT 0,
  is_active        BOOLEAN DEFAULT TRUE,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_modules_category ON training_modules(category);
CREATE INDEX IF NOT EXISTS idx_training_modules_active   ON training_modules(is_active);

ALTER TABLE training_modules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_training_modules" ON training_modules;
DROP POLICY IF EXISTS "agent_read_training_modules"   ON training_modules;

CREATE POLICY "admin_manage_training_modules" ON training_modules
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

CREATE POLICY "agent_read_training_modules" ON training_modules
  FOR SELECT USING (is_active = TRUE AND auth.role() = 'authenticated');

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_training_modules_updated_at'
    AND tgrelid='training_modules'::regclass) THEN
    CREATE TRIGGER set_training_modules_updated_at
      BEFORE UPDATE ON training_modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 8. TRAINING_QUIZZES — Kuis per modul
-- =============================================================================
CREATE TABLE IF NOT EXISTS training_quizzes (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id   UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  question    TEXT NOT NULL,
  options     JSONB NOT NULL,
  explanation TEXT,
  order_index INTEGER DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_training_quizzes_module_id ON training_quizzes(module_id);

ALTER TABLE training_quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_training_quizzes" ON training_quizzes;
DROP POLICY IF EXISTS "agent_read_training_quizzes"   ON training_quizzes;

CREATE POLICY "admin_manage_training_quizzes" ON training_quizzes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );

CREATE POLICY "agent_read_training_quizzes" ON training_quizzes
  FOR SELECT USING (auth.role() = 'authenticated');


-- =============================================================================
-- 9. AGENT_TRAINING_PROGRESS — Progres pelatihan agen
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_training_progress (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id     UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  module_id    UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','completed','failed')),
  quiz_score   INTEGER,
  started_at   TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agent_id, module_id)
);

CREATE INDEX IF NOT EXISTS idx_agent_training_agent_id  ON agent_training_progress(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_training_module_id ON agent_training_progress(module_id);

ALTER TABLE agent_training_progress ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_manage_own_training" ON agent_training_progress;
DROP POLICY IF EXISTS "admin_read_all_training"   ON agent_training_progress;

CREATE POLICY "agent_manage_own_training" ON agent_training_progress
  FOR ALL USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "admin_read_all_training" ON agent_training_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager'))
  );


-- =============================================================================
-- 10. VENDOR_CONTRACTS — Kontrak dengan vendor
-- =============================================================================
CREATE TABLE IF NOT EXISTS vendor_contracts (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id       UUID REFERENCES vendors(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  service_type    TEXT NOT NULL,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  value           NUMERIC(15,2),
  currency        TEXT DEFAULT 'IDR',
  payment_terms   TEXT,
  auto_renew      BOOLEAN DEFAULT FALSE,
  document_url    TEXT,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','expired','terminated')),
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id       UUID REFERENCES branches(id)  ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vendor_contracts_vendor_id  ON vendor_contracts(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_end_date   ON vendor_contracts(end_date);
CREATE INDEX IF NOT EXISTS idx_vendor_contracts_status     ON vendor_contracts(status);

ALTER TABLE vendor_contracts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_vendor_contracts"        ON vendor_contracts;
DROP POLICY IF EXISTS "branch_manager_read_vendor_contracts" ON vendor_contracts;

CREATE POLICY "admin_manage_vendor_contracts" ON vendor_contracts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance','operational'))
  );

CREATE POLICY "branch_manager_read_vendor_contracts" ON vendor_contracts
  FOR SELECT USING (branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid()));

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_vendor_contracts_updated_at'
    AND tgrelid='vendor_contracts'::regclass) THEN
    CREATE TRIGGER set_vendor_contracts_updated_at
      BEFORE UPDATE ON vendor_contracts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 11. DEPARTURE_BUDGETS — Anggaran per keberangkatan
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_budgets (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  category        TEXT NOT NULL
    CHECK (category IN ('hotel','tiket','visa','katering','transportasi','handling','manasik','perlengkapan','lainnya')),
  description     TEXT,
  budgeted_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  pax_count       INTEGER,
  per_pax_amount  NUMERIC(15,2),
  notes           TEXT,
  created_by      UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (departure_id, category)
);

CREATE INDEX IF NOT EXISTS idx_departure_budgets_departure_id ON departure_budgets(departure_id);

ALTER TABLE departure_budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_budgets" ON departure_budgets;
CREATE POLICY "staff_manage_departure_budgets" ON departure_budgets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','branch_manager','finance','operational'))
  );


-- =============================================================================
-- 12. MEDIA_GALLERY — Galeri video/foto hotel & testimonial
-- =============================================================================
CREATE TABLE IF NOT EXISTS media_gallery (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type             TEXT NOT NULL
    CHECK (type IN ('video_testimonial','virtual_tour','hotel_photo')),
  title            TEXT,
  description      TEXT,
  media_url        TEXT NOT NULL,
  thumbnail_url    TEXT,
  hotel_id         UUID REFERENCES hotels(id)   ON DELETE SET NULL,
  package_id       UUID REFERENCES packages(id) ON DELETE SET NULL,
  jamaah_name      TEXT,
  departure_year   INTEGER,
  duration_seconds INTEGER,
  is_active        BOOLEAN DEFAULT TRUE,
  order_index      INTEGER DEFAULT 0,
  created_by       UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_media_gallery_type       ON media_gallery(type);
CREATE INDEX IF NOT EXISTS idx_media_gallery_hotel_id   ON media_gallery(hotel_id);
CREATE INDEX IF NOT EXISTS idx_media_gallery_package_id ON media_gallery(package_id);
CREATE INDEX IF NOT EXISTS idx_media_gallery_active     ON media_gallery(is_active);

ALTER TABLE media_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_media_gallery" ON media_gallery;
DROP POLICY IF EXISTS "public_read_media_gallery"  ON media_gallery;

CREATE POLICY "admin_manage_media_gallery" ON media_gallery
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','marketing'))
  );

CREATE POLICY "public_read_media_gallery" ON media_gallery
  FOR SELECT USING (is_active = TRUE);


-- =============================================================================
-- 13. BAGGAGE_REFERENCE_ITEMS — Referensi bawaan jamaah
-- =============================================================================
CREATE TABLE IF NOT EXISTS baggage_reference_items (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                TEXT NOT NULL,
  category            TEXT NOT NULL,
  estimated_weight_kg NUMERIC(5,2) NOT NULL,
  is_mandatory        BOOLEAN DEFAULT FALSE,
  notes               TEXT
);

CREATE INDEX IF NOT EXISTS idx_baggage_reference_category ON baggage_reference_items(category);

ALTER TABLE baggage_reference_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_baggage_reference"  ON baggage_reference_items;
DROP POLICY IF EXISTS "admin_manage_baggage_reference" ON baggage_reference_items;

CREATE POLICY "public_read_baggage_reference"  ON baggage_reference_items FOR SELECT USING (TRUE);
CREATE POLICY "admin_manage_baggage_reference" ON baggage_reference_items
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );


-- =============================================================================
-- 14. APPROVAL_CONFIGS — Konfigurasi approval multi-level
-- =============================================================================
CREATE TABLE IF NOT EXISTS approval_configs (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type                 TEXT NOT NULL
    CHECK (type IN ('refund','discount','cancellation','vendor_invoice')),
  level                SMALLINT NOT NULL DEFAULT 1,
  required_role        TEXT NOT NULL,
  amount_threshold     NUMERIC(15,2),
  percentage_threshold NUMERIC(5,2),
  auto_approve_below   NUMERIC(15,2),
  is_active            BOOLEAN DEFAULT TRUE,
  notes                TEXT,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (type, level, required_role)
);

ALTER TABLE approval_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_approval_configs" ON approval_configs;
DROP POLICY IF EXISTS "staff_read_approval_configs"   ON approval_configs;

CREATE POLICY "admin_manage_approval_configs" ON approval_configs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner'))
  );

CREATE POLICY "staff_read_approval_configs" ON approval_configs
  FOR SELECT USING (auth.role() = 'authenticated');


-- =============================================================================
-- 15. AGENT_OVERRIDE_COMMISSIONS — Override komisi agen ke sub-agen
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_override_commissions (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id          UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  agent_id            UUID NOT NULL REFERENCES agents(id)   ON DELETE CASCADE,
  sub_agent_id        UUID NOT NULL REFERENCES agents(id)   ON DELETE CASCADE,
  override_percentage NUMERIC(5,2) NOT NULL,
  override_amount     NUMERIC(15,2) NOT NULL,
  status              TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','paid','cancelled')),
  paid_at             TIMESTAMPTZ,
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_override_agent_id     ON agent_override_commissions(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_override_sub_agent_id ON agent_override_commissions(sub_agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_override_booking_id   ON agent_override_commissions(booking_id);

ALTER TABLE agent_override_commissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_read_own_override" ON agent_override_commissions;
DROP POLICY IF EXISTS "admin_manage_override"   ON agent_override_commissions;

CREATE POLICY "agent_read_own_override" ON agent_override_commissions
  FOR SELECT USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "admin_manage_override" ON agent_override_commissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );


-- =============================================================================
-- 16. MEMBERSHIP_PLANS — Paket keanggotaan agen & cabang
-- =============================================================================
CREATE TABLE IF NOT EXISTS membership_plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  plan_type       TEXT NOT NULL CHECK (plan_type IN ('agent','branch')),
  price_yearly    NUMERIC(15,2) NOT NULL DEFAULT 0,
  max_sub_agents  INTEGER DEFAULT NULL,
  commission_rate NUMERIC(5,2) DEFAULT 0,
  description     TEXT,
  features        JSONB DEFAULT '[]',
  is_active       BOOLEAN DEFAULT true,
  sort_order      INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE membership_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_membership_plans"   ON membership_plans;
DROP POLICY IF EXISTS "admin_manage_membership_plans"  ON membership_plans;

CREATE POLICY "public_read_membership_plans" ON membership_plans
  FOR SELECT USING (is_active = TRUE);

CREATE POLICY "admin_manage_membership_plans" ON membership_plans
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );


-- =============================================================================
-- 17. AGENT_MEMBERSHIPS & BRANCH_MEMBERSHIPS
-- =============================================================================
CREATE TABLE IF NOT EXISTS agent_memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id          UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  plan_id           UUID NOT NULL REFERENCES membership_plans(id),
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','expired','rejected')),
  payment_proof_url TEXT,
  start_date        DATE,
  end_date          DATE,
  approved_by       UUID REFERENCES auth.users(id),
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_memberships_agent_id ON agent_memberships(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memberships_status   ON agent_memberships(status);

ALTER TABLE agent_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_agent_memberships" ON agent_memberships;
CREATE POLICY "admin_manage_agent_memberships" ON agent_memberships
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
    OR agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid())
  );


CREATE TABLE IF NOT EXISTS branch_memberships (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id         UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  plan_id           UUID NOT NULL REFERENCES membership_plans(id),
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','active','expired','rejected')),
  payment_proof_url TEXT,
  start_date        DATE,
  end_date          DATE,
  approved_by       UUID REFERENCES auth.users(id),
  approved_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_branch_memberships_branch_id ON branch_memberships(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_memberships_status    ON branch_memberships(status);

ALTER TABLE branch_memberships ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_branch_memberships" ON branch_memberships;
CREATE POLICY "admin_manage_branch_memberships" ON branch_memberships
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
    OR branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid())
  );


-- =============================================================================
-- 18. BRANCH_COMMISSIONS — Komisi cabang dari booking
-- =============================================================================
CREATE TABLE IF NOT EXISTS branch_commissions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id         UUID NOT NULL REFERENCES branches(id)  ON DELETE CASCADE,
  booking_id        UUID NOT NULL REFERENCES bookings(id)  ON DELETE CASCADE,
  commission_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  commission_rate   NUMERIC(5,2)  NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','paid','rejected')),
  notes             TEXT,
  approved_by       UUID REFERENCES auth.users(id),
  approved_at       TIMESTAMPTZ,
  paid_at           TIMESTAMPTZ,
  payment_reference TEXT,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now(),
  UNIQUE (branch_id, booking_id)
);

CREATE INDEX IF NOT EXISTS idx_branch_commissions_branch_id ON branch_commissions(branch_id);
CREATE INDEX IF NOT EXISTS idx_branch_commissions_status    ON branch_commissions(status);

ALTER TABLE branch_commissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_branch_commissions" ON branch_commissions;
CREATE POLICY "admin_manage_branch_commissions" ON branch_commissions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
    OR branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid())
  );


-- =============================================================================
-- 19. COMPANY_SETTINGS — Konfigurasi perusahaan (key-value)
-- =============================================================================
CREATE TABLE IF NOT EXISTS company_settings (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key   TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  setting_type  TEXT NOT NULL DEFAULT 'string'
    CHECK (setting_type IN ('string','number','boolean','json','color','url')),
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_settings_key ON company_settings(setting_key);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_company_settings" ON company_settings;
DROP POLICY IF EXISTS "public_read_company_settings"  ON company_settings;

CREATE POLICY "admin_manage_company_settings" ON company_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "public_read_company_settings" ON company_settings
  FOR SELECT USING (TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_company_settings_updated_at'
    AND tgrelid='company_settings'::regclass) THEN
    CREATE TRIGGER set_company_settings_updated_at
      BEFORE UPDATE ON company_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 20. BANK_ACCOUNTS — Rekening bank perusahaan
-- =============================================================================
CREATE TABLE IF NOT EXISTS bank_accounts (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name      TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name   TEXT NOT NULL,
  branch_name    TEXT,
  is_primary     BOOLEAN DEFAULT FALSE,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_primary ON bank_accounts(is_primary) WHERE is_primary = TRUE;
CREATE INDEX IF NOT EXISTS idx_bank_accounts_active  ON bank_accounts(is_active)  WHERE is_active  = TRUE;

ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_bank_accounts" ON bank_accounts;
DROP POLICY IF EXISTS "public_read_bank_accounts"  ON bank_accounts;

CREATE POLICY "admin_manage_bank_accounts" ON bank_accounts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );

CREATE POLICY "public_read_bank_accounts" ON bank_accounts
  FOR SELECT USING (is_active = TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_bank_accounts_updated_at'
    AND tgrelid='bank_accounts'::regclass) THEN
    CREATE TRIGGER set_bank_accounts_updated_at
      BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 21. WEBSITE_SETTINGS — Tema & konfigurasi tampilan (termasuk kolom fase1&fase2)
-- =============================================================================
CREATE TABLE IF NOT EXISTS website_settings (
  id                 UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id           UUID REFERENCES agents(id) ON DELETE CASCADE,
  branch_id          UUID REFERENCES branches(id) ON DELETE CASCADE,
  company_name       TEXT,
  logo_url           TEXT,
  favicon_url        TEXT,
  active_theme       TEXT NOT NULL DEFAULT 'default',
  primary_color      TEXT,
  accent_color       TEXT,
  foreground_color   TEXT,
  background_color   TEXT,
  body_font          TEXT,
  heading_font       TEXT,
  footer_description TEXT,
  footer_address     TEXT,
  footer_phone       TEXT,
  footer_email       TEXT,
  footer_whatsapp    TEXT,
  footer_bottom_text TEXT,
  footer_links       JSONB,
  custom_sections    JSONB,
  profile_photo_url  TEXT,
  banner_url         TEXT,
  bio                TEXT,
  testimonials       JSONB DEFAULT '[]',
  gallery_urls       JSONB DEFAULT '[]',
  seo_title          TEXT,
  seo_description    TEXT,
  view_count         INTEGER DEFAULT 0,
  social_youtube     TEXT,
  social_tiktok      TEXT,
  maps_embed_url     TEXT,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_agent
  ON website_settings(agent_id)  WHERE agent_id  IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_branch
  ON website_settings(branch_id) WHERE branch_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_website_settings_global
  ON website_settings((1)) WHERE agent_id IS NULL AND branch_id IS NULL;

ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_website_settings"      ON website_settings;
DROP POLICY IF EXISTS "agent_manage_own_website_settings"  ON website_settings;
DROP POLICY IF EXISTS "branch_manage_own_website_settings" ON website_settings;
DROP POLICY IF EXISTS "public_read_website_settings"       ON website_settings;

CREATE POLICY "admin_manage_website_settings" ON website_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "agent_manage_own_website_settings" ON website_settings
  FOR ALL USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));

CREATE POLICY "branch_manage_own_website_settings" ON website_settings
  FOR ALL USING (branch_id IN (SELECT id FROM branches WHERE manager_user_id = auth.uid()));

CREATE POLICY "public_read_website_settings" ON website_settings
  FOR SELECT USING (TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_website_settings_updated_at'
    AND tgrelid='website_settings'::regclass) THEN
    CREATE TRIGGER set_website_settings_updated_at
      BEFORE UPDATE ON website_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 22. CONTACT_PAGE_CONTENT — Konten halaman kontak website
-- =============================================================================
CREATE TABLE IF NOT EXISTS contact_page_content (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  settings_id     UUID REFERENCES website_settings(id) ON DELETE CASCADE,
  hero_title      TEXT,
  hero_subtitle   TEXT,
  form_title      TEXT,
  map_url         TEXT,
  operating_hours JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE contact_page_content ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_contact_content" ON contact_page_content;
DROP POLICY IF EXISTS "public_read_contact_content"  ON contact_page_content;

CREATE POLICY "admin_manage_contact_content" ON contact_page_content
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "public_read_contact_content" ON contact_page_content
  FOR SELECT USING (TRUE);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_contact_page_updated_at'
    AND tgrelid='contact_page_content'::regclass) THEN
    CREATE TRIGGER set_contact_page_updated_at
      BEFORE UPDATE ON contact_page_content FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 23. SISKOHAT_SYNC_LOGS — Log sinkronisasi data SISKOHAT Kemenag
-- =============================================================================
CREATE TABLE IF NOT EXISTS siskohat_sync_logs (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type     TEXT NOT NULL CHECK (sync_type IN ('export','manual_input','validation')),
  record_count  INTEGER,
  status        TEXT NOT NULL DEFAULT 'success'
    CHECK (status IN ('success','partial','failed')),
  error_message TEXT,
  file_url      TEXT,
  exported_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id     UUID REFERENCES branches(id)   ON DELETE SET NULL,
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_siskohat_sync_logs_created_at ON siskohat_sync_logs(created_at DESC);

ALTER TABLE siskohat_sync_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_siskohat_logs" ON siskohat_sync_logs;
CREATE POLICY "admin_manage_siskohat_logs" ON siskohat_sync_logs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','operational'))
  );


-- =============================================================================
-- 24. DEPARTURE_COST_ITEMS — HPP per item keberangkatan (fase28)
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_cost_items (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  category       TEXT NOT NULL DEFAULT 'other',
  sub_category   TEXT,
  location       TEXT,
  hotel_id       UUID REFERENCES hotels(id)   ON DELETE SET NULL,
  nights         INTEGER,
  room_type      TEXT,
  check_in_date  DATE,
  check_out_date DATE,
  airline_id     UUID REFERENCES airlines(id) ON DELETE SET NULL,
  flight_route   TEXT,
  flight_class   TEXT,
  description    TEXT NOT NULL DEFAULT '',
  unit           TEXT NOT NULL DEFAULT 'per_pax',
  quantity       NUMERIC NOT NULL DEFAULT 1,
  unit_cost      NUMERIC NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'IDR',
  exchange_rate  NUMERIC NOT NULL DEFAULT 1,
  total_cost_idr NUMERIC GENERATED ALWAYS AS (quantity * unit_cost * exchange_rate) STORED,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  notes          TEXT,
  reference_id   UUID,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_cost_items_departure_id ON departure_cost_items(departure_id);
CREATE INDEX IF NOT EXISTS idx_departure_cost_items_category     ON departure_cost_items(category);

ALTER TABLE departure_cost_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_cost_items" ON departure_cost_items;
CREATE POLICY "staff_manage_departure_cost_items" ON departure_cost_items
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_cost_items_updated_at'
    AND tgrelid='departure_cost_items'::regclass) THEN
    CREATE TRIGGER set_departure_cost_items_updated_at
      BEFORE UPDATE ON departure_cost_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 25. DEPARTURE_EXPENSES — Pengeluaran operasional realisasi (fase28)
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_expenses (
  id             UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id     UUID REFERENCES bookings(id) ON DELETE SET NULL,
  expense_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  category       TEXT NOT NULL DEFAULT 'other',
  location       TEXT,
  description    TEXT NOT NULL DEFAULT '',
  amount         NUMERIC NOT NULL DEFAULT 0,
  currency       TEXT NOT NULL DEFAULT 'IDR',
  exchange_rate  NUMERIC NOT NULL DEFAULT 1,
  amount_idr     NUMERIC GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  payment_method TEXT DEFAULT 'transfer',
  receipt_url    TEXT,
  notes          TEXT,
  approved_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_expenses_departure_id ON departure_expenses(departure_id);
CREATE INDEX IF NOT EXISTS idx_departure_expenses_expense_date ON departure_expenses(expense_date);

ALTER TABLE departure_expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_expenses" ON departure_expenses;
CREATE POLICY "staff_manage_departure_expenses" ON departure_expenses
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_expenses_updated_at'
    AND tgrelid='departure_expenses'::regclass) THEN
    CREATE TRIGGER set_departure_expenses_updated_at
      BEFORE UPDATE ON departure_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 26. DEPARTURE_OTHER_REVENUES — Pendapatan tambahan keberangkatan (fase28)
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_other_revenues (
  id            UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id  UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id    UUID REFERENCES bookings(id) ON DELETE SET NULL,
  revenue_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  category      TEXT NOT NULL DEFAULT 'other',
  location      TEXT,
  description   TEXT NOT NULL DEFAULT '',
  amount        NUMERIC NOT NULL DEFAULT 0,
  currency      TEXT NOT NULL DEFAULT 'IDR',
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  amount_idr    NUMERIC GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  notes         TEXT,
  created_by    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_departure_other_revenues_departure_id ON departure_other_revenues(departure_id);

ALTER TABLE departure_other_revenues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_departure_other_revenues" ON departure_other_revenues;
CREATE POLICY "staff_manage_departure_other_revenues" ON departure_other_revenues
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_other_revenues_updated_at'
    AND tgrelid='departure_other_revenues'::regclass) THEN
    CREATE TRIGGER set_departure_other_revenues_updated_at
      BEFORE UPDATE ON departure_other_revenues FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 27. DEPARTURE_FINANCIAL_SUMMARY — Cache ringkasan keuangan keberangkatan (fase28)
-- =============================================================================
CREATE TABLE IF NOT EXISTS departure_financial_summary (
  departure_id            UUID NOT NULL PRIMARY KEY REFERENCES departures(id) ON DELETE CASCADE,
  quota                   INTEGER NOT NULL DEFAULT 0,
  pax_confirmed           INTEGER NOT NULL DEFAULT 0,
  pax_cancelled           INTEGER NOT NULL DEFAULT 0,
  revenue_gross           NUMERIC NOT NULL DEFAULT 0,
  revenue_paid            NUMERIC NOT NULL DEFAULT 0,
  revenue_outstanding     NUMERIC NOT NULL DEFAULT 0,
  revenue_refunded        NUMERIC NOT NULL DEFAULT 0,
  hpp_total               NUMERIC NOT NULL DEFAULT 0,
  expense_total           NUMERIC NOT NULL DEFAULT 0,
  other_revenue_total     NUMERIC NOT NULL DEFAULT 0,
  gross_profit            NUMERIC GENERATED ALWAYS AS (revenue_gross - hpp_total) STORED,
  net_profit              NUMERIC GENERATED ALWAYS AS (revenue_gross + other_revenue_total - hpp_total - expense_total) STORED,
  gross_margin_pct        NUMERIC GENERATED ALWAYS AS (
    CASE WHEN revenue_gross > 0
      THEN ROUND(((revenue_gross - hpp_total) / revenue_gross) * 100, 2)
      ELSE 0
    END
  ) STORED,
  last_calculated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE departure_financial_summary ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_departure_financial_summary"  ON departure_financial_summary;
DROP POLICY IF EXISTS "staff_write_departure_financial_summary" ON departure_financial_summary;

CREATE POLICY "staff_read_departure_financial_summary" ON departure_financial_summary
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );

CREATE POLICY "staff_write_departure_financial_summary" ON departure_financial_summary
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager','operational'))
  );


-- =============================================================================
-- SEED: default data
-- =============================================================================

-- Default approval configs
INSERT INTO approval_configs (type, level, required_role, amount_threshold, percentage_threshold, auto_approve_below)
VALUES
  ('refund',         1,'branch_manager',5000000,  NULL,  500000),
  ('refund',         2,'admin',         50000000, NULL, 5000000),
  ('refund',         3,'owner',         NULL,     NULL,    NULL),
  ('discount',       1,'branch_manager',NULL,     10.0,    NULL),
  ('discount',       2,'admin',         NULL,     30.0,    NULL),
  ('cancellation',   1,'branch_manager',NULL,     NULL,    NULL),
  ('cancellation',   2,'admin',         NULL,     NULL,    NULL),
  ('vendor_invoice', 1,'finance',       10000000, NULL, 1000000),
  ('vendor_invoice', 2,'owner',         NULL,     NULL,10000000)
ON CONFLICT (type, level, required_role) DO NOTHING;

-- Default baggage reference items
INSERT INTO baggage_reference_items (name, category, estimated_weight_kg, is_mandatory) VALUES
  ('Koper besar (kosong)',      'koper',      3.50, TRUE),
  ('Koper kabin (kosong)',      'koper',      2.00, FALSE),
  ('Tas ransel',                'tas',        0.80, FALSE),
  ('Baju ihram pria (2 lembar)','pakaian',    0.80, TRUE),
  ('Mukena',                    'pakaian',    0.40, FALSE),
  ('Sandal',                    'alas_kaki',  0.40, TRUE),
  ('Al-Quran',                  'ibadah',     0.50, FALSE),
  ('Sajadah travel',            'ibadah',     0.30, FALSE),
  ('Masker (kotak)',            'kesehatan',  0.20, TRUE),
  ('Obat-obatan pribadi',       'kesehatan',  0.50, FALSE),
  ('Charger & kabel',           'elektronik', 0.30, FALSE),
  ('Power bank',                'elektronik', 0.25, FALSE)
ON CONFLICT DO NOTHING;

-- Default company settings
INSERT INTO company_settings (setting_key, setting_value, setting_type, description) VALUES
  ('company_name',         '"Vinstour Travel"',            'string',  'Nama resmi perusahaan'),
  ('company_tagline',      '"Perjalanan Suci Anda"',       'string',  'Tagline perusahaan'),
  ('company_phone',        '"021-1234567"',                'string',  'Nomor telepon utama'),
  ('company_email',        '"info@vinstour.com"',          'string',  'Email utama perusahaan'),
  ('company_address',      '"Jakarta, Indonesia"',         'string',  'Alamat kantor pusat'),
  ('company_logo_url',     'null',                         'url',     'URL logo perusahaan'),
  ('company_wa_number',    '"628111234567"',               'string',  'Nomor WhatsApp utama (format 62xxx)'),
  ('kpi_targets_monthly',  '{"bookings":150,"revenue":3500000000,"leads":500,"conversion":30}', 'json', 'Target KPI bulanan'),
  ('fonnte_api_key',       'null',                         'string',  'API key Fonnte untuk kirim WhatsApp'),
  ('max_booking_dp_pct',   '30',                           'number',  'Persentase minimal DP booking (%)'),
  ('booking_expiry_hours', '24',                           'number',  'Jam sebelum booking pending kadaluarsa')
ON CONFLICT (setting_key) DO NOTHING;

-- Default bank accounts (ganti dengan rekening nyata setelah migrasi)
INSERT INTO bank_accounts (bank_name, account_number, account_name, branch_name, is_primary, is_active)
VALUES
  ('Bank BCA',    '1234567890', 'PT Vinstour Wisata Utama', 'KCP Jakarta Pusat',   TRUE,  TRUE),
  ('Bank Mandiri','0987654321', 'PT Vinstour Wisata Utama', 'KC Jakarta Selatan',  FALSE, TRUE)
ON CONFLICT DO NOTHING;

-- Default website settings global
INSERT INTO website_settings (company_name, active_theme, primary_color, accent_color,
  footer_description, footer_bottom_text)
VALUES (
  'Vinstour Travel', 'default', '#16a34a', '#0d9488',
  'Layanan perjalanan Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun.',
  '© 2025 Vinstour Travel. All rights reserved.'
)
ON CONFLICT DO NOTHING;

-- Default contact page content
INSERT INTO contact_page_content (hero_title, hero_subtitle, form_title, operating_hours)
VALUES (
  'Hubungi Kami',
  'Tim kami siap membantu Anda merencanakan perjalanan ibadah terbaik.',
  'Kirim Pesan',
  '{"senin_jumat":"08.00 - 17.00 WIB","sabtu":"08.00 - 13.00 WIB","minggu":"Tutup"}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Membership plans default
INSERT INTO membership_plans (name, plan_type, price_yearly, max_sub_agents, commission_rate, description, features, sort_order) VALUES
  ('Silver',   'agent',  500000,  5,    2, 'Paket dasar untuk agen baru',         '["Dashboard portal agen","Website agen dasar","Maksimal 5 sub agen","Komisi 2%"]', 1),
  ('Gold',     'agent',  1500000, 20,   3, 'Paket menengah dengan fitur lengkap', '["Dashboard portal agen","Website agen lengkap","Laporan komisi","Maksimal 20 sub agen","Komisi 3%"]', 2),
  ('Platinum', 'agent',  3000000, NULL, 4, 'Paket premium tanpa batas sub agen',  '["Semua fitur Gold","Sub agen tidak terbatas","Priority support","Komisi 4%"]', 3),
  ('Reguler',  'branch', 5000000, 50,   1, 'Paket cabang standar',                '["Dashboard cabang","Website cabang","Maksimal 50 agen","Komisi cabang 1%"]', 1),
  ('Premium',  'branch', 12000000,NULL, 2, 'Paket cabang premium',                '["Semua fitur Reguler","Agen tidak terbatas","CRM & laporan lanjutan","Komisi cabang 2%"]', 2)
ON CONFLICT DO NOTHING;

-- WA Feature Roadmap seed
INSERT INTO wa_feature_roadmap (phase, code, title, description, status, sort_order) VALUES
  (1,'WA_BASIC_SEND',       'Kirim WA via Fonnte',              'Kirim pesan single & bulk via provider Fonnte', 'done', 10),
  (1,'WA_TEMPLATES_ENGINE', 'Template Pesan Dinamis',           'Variabel {nama}, {kode}, {tanggal} di template', 'done', 20),
  (1,'WA_SEND_LOGS',        'Log Pengiriman WA',                'Riwayat setiap pesan terkirim / gagal', 'done', 30),
  (1,'WA_BLAST_DEPARTURE',  'Broadcast per Keberangkatan',      'Kirim massal ke semua jamaah satu keberangkatan', 'done', 40),
  (1,'WA_AUTO_BOOKING',     'Notif Otomatis Booking Baru',      'Auto-kirim WA saat booking/DP/lunas dikonfirmasi', 'done', 60),
  (2,'WA_MULTIPROVIDER',    'Multi-Provider (Fonnte/Wablas/…)', 'Support banyak gateway WA, dipilih dari panel admin', 'in_progress', 70),
  (2,'WA_AUTO_REMINDER',    'Auto-Jadwal Reminder Pembayaran',  'Buat baris reminder H-7/H-3 otomatis', 'in_progress', 90),
  (3,'WA_BROADCAST_SEGMENT','Broadcast Tersegmentasi',          'Filter penerima: by paket, keberangkatan, status bayar', 'planned', 100),
  (4,'WA_CHATBOT_KEYWORD',  'Auto-Reply Berbasis Kata Kunci',   'Balas otomatis jika jamaah kirim kata kunci tertentu', 'planned', 130),
  (5,'WA_META_CLOUD',       'WhatsApp Cloud API (Meta/WABA)',   'Integrasi resmi Meta Business API', 'planned', 160)
ON CONFLICT (code) DO NOTHING;

-- =============================================================================
-- SELESAI — File 05: Finance, HR & Company Settings
-- =============================================================================
SELECT 'File 05 — Finance, HR & Company Settings: OK' AS result;
