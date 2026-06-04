-- =============================================================================
-- MIGRASI: web_vitals_metrics — Telemetri Performa Web
-- Menyimpan data LCP, CLS, INP, FCP, TTFB untuk monitoring performa real-time
-- =============================================================================

CREATE TABLE IF NOT EXISTS web_vitals_metrics (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  metric_name      TEXT NOT NULL,
  metric_value     NUMERIC NOT NULL,
  rating           TEXT,
  metric_id        TEXT,
  navigation_type  TEXT,
  route            TEXT,
  device_type      TEXT,
  user_agent       TEXT,
  branch_id        UUID, -- Optional: jika ingin filter per cabang
  release_version  TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing untuk mempermudah analisis
CREATE INDEX IF NOT EXISTS idx_wvm_metric_name ON web_vitals_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_wvm_created_at  ON web_vitals_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_wvm_route       ON web_vitals_metrics(route);

-- Aktifkan RLS
ALTER TABLE web_vitals_metrics ENABLE ROW LEVEL SECURITY;

-- Policy: Anonim bisa insert (untuk telemetri publik)
-- Kita batasi hanya INSERT agar data tidak bisa dibaca/diubah oleh publik
DROP POLICY IF EXISTS "allow_anon_insert_metrics" ON web_vitals_metrics;
CREATE POLICY "allow_anon_insert_metrics" ON web_vitals_metrics
  FOR INSERT WITH CHECK (true);

-- Policy: Admin bisa baca semua data untuk dashboard monitoring
-- Menggunakan role yang valid sesuai enum app_role: super_admin, owner, branch_manager, dll.
DROP POLICY IF EXISTS "admin_read_metrics" ON web_vitals_metrics;
CREATE POLICY "admin_read_metrics" ON web_vitals_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin'::app_role, 'owner'::app_role, 'branch_manager'::app_role)
    )
  );

SELECT 'web_vitals_metrics migration updated' AS result;
