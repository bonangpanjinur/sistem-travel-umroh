-- Migration 044: scheduled_reports + scheduled_report_logs TABLES
-- Dibutuhkan oleh: AdminScheduledReports
-- Tanpa ini: fitur Scheduled Reports tidak bisa menyimpan jadwal laporan

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id           UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  name         TEXT         NOT NULL,
  report_type  TEXT         NOT NULL,
  frequency    TEXT         NOT NULL CHECK (frequency IN ('daily','weekly','monthly')),
  recipients   JSONB        DEFAULT '[]'::jsonb,
  filters      JSONB        DEFAULT '{}'::jsonb,
  is_active    BOOLEAN      DEFAULT true,
  last_run_at  TIMESTAMPTZ,
  next_run_at  TIMESTAMPTZ,
  created_by   UUID         REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ  DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_report_logs (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id        UUID         REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  status           TEXT         DEFAULT 'success' CHECK (status IN ('success','failed')),
  rows_generated   INT,
  recipients_sent  INT,
  error_message    TEXT,
  executed_at      TIMESTAMPTZ  DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sr_is_active    ON scheduled_reports(is_active);
CREATE INDEX IF NOT EXISTS idx_sr_next_run_at  ON scheduled_reports(next_run_at);
CREATE INDEX IF NOT EXISTS idx_srl_report_id   ON scheduled_report_logs(report_id);

-- Update updated_at otomatis
CREATE OR REPLACE FUNCTION update_sr_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS tg_sr_updated_at ON scheduled_reports;
CREATE TRIGGER tg_sr_updated_at
  BEFORE UPDATE ON scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION update_sr_updated_at();

-- Row Level Security
ALTER TABLE scheduled_reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_report_logs  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage scheduled reports"
  ON scheduled_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin','admin','finance')
    )
  );

CREATE POLICY "Admins view report logs"
  ON scheduled_report_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin','admin','finance')
    )
  );

CREATE POLICY "System can insert report logs"
  ON scheduled_report_logs FOR INSERT
  WITH CHECK (true);
