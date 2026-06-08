-- P3.2: Package Groups
-- Tabel untuk mengelompokkan paket umroh/haji (Ramadhan, Reguler, Premium, Haji, Wisata, dll)

CREATE TABLE IF NOT EXISTS package_groups (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  color       TEXT        NOT NULL DEFAULT '#6366f1',
  description TEXT,
  display_order INT       NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default groups
INSERT INTO package_groups (name, slug, color, display_order) VALUES
  ('Ramadhan',  'ramadhan', '#7c3aed', 1),
  ('Reguler',   'reguler',  '#059669', 2),
  ('Premium',   'premium',  '#d97706', 3),
  ('Haji',      'haji',     '#dc2626', 4),
  ('Wisata',    'wisata',   '#0284c7', 5)
ON CONFLICT (slug) DO NOTHING;

-- Add group_id FK to packages
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES package_groups(id) ON DELETE SET NULL;

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS idx_packages_group_id ON packages (group_id);
