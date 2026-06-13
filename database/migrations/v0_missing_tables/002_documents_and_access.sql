-- ============================================================
-- V0 MISSING TABLES — 002: Documents & Access Control
-- Tabel: customer_documents, referral_codes, referral_usages,
--        ticket_responses, audit_logs, user_permissions
-- ============================================================

-- ── 1. CUSTOMER_DOCUMENTS ─────────────────────────────────────
-- Dokumen jamaah: paspor, KTP, foto, visa, dll.
-- status dipakai oleh trigger tg_badge_document_verified.
-- RLS diperbaiki di v2_sprint_phases/fase27_booking_line_items_rls_fixes.sql
CREATE TABLE IF NOT EXISTS customer_documents (
  id              UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  customer_id     UUID        NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  booking_id      UUID        REFERENCES bookings(id) ON DELETE SET NULL,
  document_type   TEXT        NOT NULL
                              CHECK (document_type IN ('passport','ktp','foto','visa','vaksin','mahram_cert','other')),
  file_url        TEXT,
  file_name       TEXT,
  status          TEXT        NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','verified','rejected')),
  rejection_notes TEXT,
  verified_by     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  verified_at     TIMESTAMPTZ,
  expires_at      DATE,                                         -- masa berlaku dokumen
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_docs_customer_id ON customer_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_docs_booking_id  ON customer_documents(booking_id);
CREATE INDEX IF NOT EXISTS idx_customer_docs_status      ON customer_documents(status);

CREATE TRIGGER set_customer_documents_updated_at
  BEFORE UPDATE ON customer_documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE customer_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_read_all_customer_documents" ON customer_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

CREATE POLICY "staff_write_customer_documents" ON customer_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational','sales','agent')
    )
    OR customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- ── 2. REFERRAL_CODES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_codes (
  id             UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  agent_id       UUID        REFERENCES agents(id) ON DELETE SET NULL,
  user_id        UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  code           TEXT        NOT NULL UNIQUE,
  description    TEXT,
  discount_type  TEXT        DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value NUMERIC     DEFAULT 0,
  usage_count    INTEGER     NOT NULL DEFAULT 0,
  max_usage      INTEGER,                                       -- NULL = unlimited
  is_active      BOOLEAN     NOT NULL DEFAULT true,
  expires_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_code      ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_agent_id  ON referral_codes(agent_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_is_active ON referral_codes(is_active);

CREATE TRIGGER set_referral_codes_updated_at
  BEFORE UPDATE ON referral_codes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can validate referral codes"
  ON referral_codes FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Admins manage referral_codes"
  ON referral_codes FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager'))
  );

-- ── 3. REFERRAL_USAGES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referral_usages (
  id                UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  referral_code_id  UUID        NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  booking_id        UUID        REFERENCES bookings(id)  ON DELETE SET NULL,
  customer_id       UUID        REFERENCES customers(id) ON DELETE SET NULL,
  discount_applied  NUMERIC     DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_usages_code_id    ON referral_usages(referral_code_id);
CREATE INDEX IF NOT EXISTS idx_referral_usages_booking_id ON referral_usages(booking_id);

ALTER TABLE referral_usages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage referral_usages"
  ON referral_usages FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','branch_manager'))
  );

-- ── 4. TICKET_RESPONSES ───────────────────────────────────────
-- Balasan/percakapan dalam tiket support.
CREATE TABLE IF NOT EXISTS ticket_responses (
  id          UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticket_id   UUID        NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  message     TEXT        NOT NULL DEFAULT '',
  is_staff    BOOLEAN     NOT NULL DEFAULT false,
  attachments JSONB       DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_responses_ticket_id ON ticket_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_responses_user_id   ON ticket_responses(user_id);

ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ticket responses"
  ON ticket_responses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM support_tickets t
      WHERE t.id = ticket_responses.ticket_id
        AND t.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational')
    )
  );

CREATE POLICY "Staff can manage ticket responses"
  ON ticket_responses FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','operational')
    )
  );

-- ── 5. AUDIT_LOGS ─────────────────────────────────────────────
-- Log audit aktivitas sistem.
-- RLS diperbaiki di patches/20260511033505_dcb564bf.sql
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id     UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,                             -- INSERT | UPDATE | DELETE | LOGIN | etc
  table_name  TEXT,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- NOTE: patches/20260511033505_dcb564bf.sql will tighten this policy
CREATE POLICY "Authenticated can insert audit logs"
  ON audit_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can read audit logs"
  ON audit_logs FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner'))
  );

-- ── 6. USER_PERMISSIONS ───────────────────────────────────────
-- Override permission per-user (di luar role_permissions).
-- Dipakai oleh Supabase Realtime di setup/20260513121035_4ec556b0.sql
CREATE TABLE IF NOT EXISTS user_permissions (
  id           UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  permission   TEXT        NOT NULL,                            -- e.g. 'bookings:approve', 'payments:verify'
  granted      BOOLEAN     NOT NULL DEFAULT true,
  granted_by   UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, permission)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id    ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_permission ON user_permissions(permission);

CREATE TRIGGER set_user_permissions_updated_at
  BEFORE UPDATE ON user_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage user_permissions"
  ON user_permissions FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner'))
  );

CREATE POLICY "Users see own permissions"
  ON user_permissions FOR SELECT TO authenticated
  USING (user_id = auth.uid());
