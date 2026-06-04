-- ─── Migration 067: Template HPP per Paket ────────────────────────────────────
--
-- Stores cost-item templates at the package level.
-- When a new departure is created, admins can apply the package template
-- to pre-fill departure_cost_items without re-entering from scratch.
--
-- Table: package_hpp_templates
--   One row per cost-item "slot" in the template.
--   On apply → rows are copied into departure_cost_items for the target departure.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Table ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS package_hpp_templates (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id      UUID          NOT NULL REFERENCES packages(id) ON DELETE CASCADE,

  -- Mirror departure_cost_items columns (except departure_id & date fields)
  category        TEXT          NOT NULL,
  sub_category    TEXT,
  description     TEXT          NOT NULL,
  location        TEXT,
  nights          INTEGER,
  room_type       TEXT,
  flight_route    TEXT,
  flight_class    TEXT,
  unit            TEXT          NOT NULL DEFAULT 'per_pax',
  quantity        NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_cost       NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency        TEXT          NOT NULL DEFAULT 'IDR',
  exchange_rate   NUMERIC(12,4) NOT NULL DEFAULT 1,
  sort_order      INTEGER       NOT NULL DEFAULT 0,
  notes           TEXT,

  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── 2. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_package_hpp_templates_package_id
  ON package_hpp_templates(package_id);

CREATE INDEX IF NOT EXISTS idx_package_hpp_templates_category
  ON package_hpp_templates(package_id, category);

-- ── 3. Updated-at trigger ─────────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_package_hpp_templates_updated_at'
  ) THEN
    CREATE TRIGGER set_package_hpp_templates_updated_at
      BEFORE UPDATE ON package_hpp_templates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ── 4. Row-Level Security ─────────────────────────────────────────────────────
ALTER TABLE package_hpp_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_manage_package_hpp_templates" ON package_hpp_templates;
CREATE POLICY "staff_manage_package_hpp_templates" ON package_hpp_templates
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','finance','operational')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('super_admin','owner','branch_manager','finance','operational')
    )
  );

-- Read access for sales & agent (to display HPP totals, not edit)
DROP POLICY IF EXISTS "sales_read_package_hpp_templates" ON package_hpp_templates;
CREATE POLICY "sales_read_package_hpp_templates" ON package_hpp_templates
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role IN ('sales','agent','marketing','hr')
    )
  );

-- ── 5. Helper view: template summary per package ──────────────────────────────
CREATE OR REPLACE VIEW package_hpp_template_summary AS
  SELECT
    package_id,
    COUNT(*)                                            AS item_count,
    SUM(quantity * unit_cost * exchange_rate)           AS total_cost_idr,
    MAX(updated_at)                                     AS last_updated
  FROM package_hpp_templates
  GROUP BY package_id;
