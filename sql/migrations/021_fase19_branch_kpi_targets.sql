-- =============================================================================
-- MIGRASI FASE 19 — branch_monthly_targets
-- Target KPI bulanan per cabang, bisa diatur mandiri oleh branch_manager
-- Jalankan setelah fase18_core_settings.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS branch_monthly_targets (
  id                   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id            UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  month_key            TEXT NOT NULL,                  -- format: "yyyy-MM"
  bookings_target      INTEGER NOT NULL DEFAULT 50,    -- booking terkonfirmasi
  revenue_target       NUMERIC(18, 2) NOT NULL DEFAULT 500000000, -- Rp
  new_customers_target INTEGER NOT NULL DEFAULT 100,   -- customer baru
  agents_booking_target INTEGER NOT NULL DEFAULT 30,   -- agen aktif booking
  conversion_target    NUMERIC(5, 2) NOT NULL DEFAULT 25, -- % lead → booking
  notes                TEXT,
  set_by               UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (branch_id, month_key)
);

CREATE INDEX IF NOT EXISTS idx_bmt_branch_id  ON branch_monthly_targets(branch_id);
CREATE INDEX IF NOT EXISTS idx_bmt_month_key  ON branch_monthly_targets(month_key);

ALTER TABLE branch_monthly_targets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_branch_targets"        ON branch_monthly_targets;
DROP POLICY IF EXISTS "branch_manager_manage_own_targets"  ON branch_monthly_targets;
DROP POLICY IF EXISTS "branch_manager_read_own_targets"    ON branch_monthly_targets;

CREATE POLICY "admin_manage_branch_targets" ON branch_monthly_targets
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin'))
  );

CREATE POLICY "branch_manager_manage_own_targets" ON branch_monthly_targets
  FOR ALL USING (
    branch_id IN (
      SELECT id FROM branches WHERE manager_user_id = auth.uid()
    )
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_bmt_updated_at'
    AND tgrelid = 'branch_monthly_targets'::regclass) THEN
    CREATE TRIGGER set_bmt_updated_at
      BEFORE UPDATE ON branch_monthly_targets
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

SELECT 'Fase 19 migration completed — branch_monthly_targets created' AS result;
