-- ─── Tour Guide System — Sub-grup Rombongan (F3.1) ───────────────────────────
-- Tabel untuk manajemen sub-grup per bus / kelompok ibadah

CREATE TABLE IF NOT EXISTS guide_subgroups (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    uuid NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  name            text NOT NULL,
  color           text NOT NULL DEFAULT '#6b7280',
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guide_subgroups_departure ON guide_subgroups(departure_id);

CREATE TABLE IF NOT EXISTS guide_subgroup_members (
  subgroup_id   uuid NOT NULL REFERENCES guide_subgroups(id) ON DELETE CASCADE,
  customer_id   uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  added_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subgroup_id, customer_id)
);
CREATE INDEX IF NOT EXISTS idx_guide_subgroup_members_sg ON guide_subgroup_members(subgroup_id);

ALTER TABLE guide_subgroups         DISABLE ROW LEVEL SECURITY;
ALTER TABLE guide_subgroup_members  DISABLE ROW LEVEL SECURITY;
