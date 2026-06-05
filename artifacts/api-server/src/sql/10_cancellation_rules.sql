-- ============================================================
-- Migrasi: Aturan Pembatalan (Cancellation Rules)
-- Tabel baru: cancellation_rules
-- Kolom baru: packages.cancellation_rule_id
-- ============================================================

-- 1. Buat tabel aturan pembatalan
CREATE TABLE IF NOT EXISTS cancellation_rules (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  is_default BOOLEAN     NOT NULL DEFAULT FALSE,
  sections   JSONB       NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Pastikan hanya satu aturan yang boleh jadi default
CREATE UNIQUE INDEX IF NOT EXISTS cancellation_rules_unique_default
  ON cancellation_rules (is_default)
  WHERE is_default = TRUE;

-- 3. Tambah kolom FK ke tabel packages
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS cancellation_rule_id UUID
    REFERENCES cancellation_rules(id) ON DELETE SET NULL;

-- 4. Trigger updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_cancellation_rules_updated_at'
      AND tgrelid = 'cancellation_rules'::regclass
  ) THEN
    CREATE TRIGGER set_cancellation_rules_updated_at
      BEFORE UPDATE ON cancellation_rules
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

SELECT 'Migrasi cancellation_rules selesai' AS result;
