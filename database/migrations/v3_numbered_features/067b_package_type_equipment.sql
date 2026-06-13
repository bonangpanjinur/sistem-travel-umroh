-- E8: Paket perlengkapan default per tipe paket
CREATE TABLE IF NOT EXISTS package_type_equipment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_type_id UUID NOT NULL REFERENCES package_types(id) ON DELETE CASCADE,
  equipment_item_id UUID NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  default_quantity INTEGER NOT NULL DEFAULT 1,
  is_required BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (package_type_id, equipment_item_id)
);

CREATE INDEX IF NOT EXISTS idx_pkg_type_equip_type ON package_type_equipment (package_type_id);
CREATE INDEX IF NOT EXISTS idx_pkg_type_equip_item ON package_type_equipment (equipment_item_id);

ALTER TABLE package_type_equipment ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can manage package_type_equipment"
  ON package_type_equipment FOR ALL TO authenticated USING (true) WITH CHECK (true);
