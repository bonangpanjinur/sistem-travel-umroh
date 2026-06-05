-- ════════════════════════════════════════════════════════════════════════════
-- FASE 32 — WA Broadcast Tersegmentasi
-- Kampanye broadcast WA dengan segmentasi, penjadwalan, dan log pengiriman
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1. Tabel kampanye broadcast ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_broadcast_campaigns (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  segment_filters JSONB       NOT NULL DEFAULT '{}',
  -- segment_filters shape:
  --   { package_ids: [], departure_ids: [], payment_statuses: [] }
  --   empty array = tidak difilter (semua)
  message_template TEXT       NOT NULL,
  status          TEXT        NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','scheduled','sending','done','cancelled')),
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  total_recipients INT,
  success_count   INT         NOT NULL DEFAULT 0,
  fail_count      INT         NOT NULL DEFAULT 0,
  created_by      UUID        REFERENCES auth.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── 2. Log per penerima ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_broadcast_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID        NOT NULL REFERENCES wa_broadcast_campaigns(id) ON DELETE CASCADE,
  booking_id  UUID        REFERENCES bookings(id),
  phone       TEXT,
  message     TEXT,
  status      TEXT        NOT NULL DEFAULT 'queued'
              CHECK (status IN ('queued','sent','failed')),
  sent_at     TIMESTAMPTZ,
  error_msg   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_broadcast_logs_campaign ON wa_broadcast_logs (campaign_id);
CREATE INDEX IF NOT EXISTS idx_wa_broadcast_campaigns_status ON wa_broadcast_campaigns (status);

-- ─── 3. updated_at trigger ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_wa_broadcast_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_wa_broadcast_campaigns_updated_at ON wa_broadcast_campaigns;
CREATE TRIGGER trg_wa_broadcast_campaigns_updated_at
  BEFORE UPDATE ON wa_broadcast_campaigns
  FOR EACH ROW EXECUTE FUNCTION update_wa_broadcast_updated_at();

-- ─── 4. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE wa_broadcast_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE wa_broadcast_logs      ENABLE ROW LEVEL SECURITY;

-- Kampanye: super_admin / owner / it / operational / marketing bisa baca
CREATE POLICY "wa_broadcast_campaigns_select" ON wa_broadcast_campaigns
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','it','operational','marketing','sales')
    )
  );

-- Hanya super_admin / owner / it / operational yang bisa buat/ubah
CREATE POLICY "wa_broadcast_campaigns_write" ON wa_broadcast_campaigns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','it','operational','marketing')
    )
  );

CREATE POLICY "wa_broadcast_logs_select" ON wa_broadcast_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','it','operational','marketing','sales')
    )
  );

CREATE POLICY "wa_broadcast_logs_insert" ON wa_broadcast_logs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','it','operational','marketing')
    )
  );

-- ─── 5. Role permissions ─────────────────────────────────────────────────────
INSERT INTO role_permissions (role, permission_key)
VALUES
  ('super_admin', 'wa-broadcast'),
  ('owner',       'wa-broadcast'),
  ('it',          'wa-broadcast'),
  ('operational', 'wa-broadcast'),
  ('marketing',   'wa-broadcast')
ON CONFLICT DO NOTHING;

SELECT 'Fase 32 — WA Broadcast Tersegmentasi installed' AS result;
