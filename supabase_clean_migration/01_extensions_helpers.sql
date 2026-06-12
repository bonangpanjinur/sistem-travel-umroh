-- =============================================================================
-- FILE 01 — Extensions & Helper Functions
-- Jalankan file ini PERTAMA sebelum semua file lainnya.
-- Supabase: jalankan di SQL Editor
-- =============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- HELPER: Auto-update updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- HELPER: Slugify text (untuk agent/branch website slug)
-- =============================================================================
CREATE OR REPLACE FUNCTION slugify_text(input TEXT)
RETURNS TEXT AS $$
DECLARE result TEXT;
BEGIN
  result := lower(input);
  result := regexp_replace(result, '[^a-z0-9\s-]', '', 'g');
  result := regexp_replace(result, '\s+', '-', 'g');
  result := regexp_replace(result, '-+', '-', 'g');
  result := trim(result, '-');
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =============================================================================
-- HELPER: Macro untuk buat trigger updated_at (idempotent)
-- =============================================================================
CREATE OR REPLACE FUNCTION _create_updated_at_trigger(p_table TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'set_' || p_table || '_updated_at'
      AND tgrelid = p_table::regclass
  ) THEN
    EXECUTE format(
      'CREATE TRIGGER set_%1$s_updated_at
       BEFORE UPDATE ON %1$s
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      p_table
    );
  END IF;
END;
$$;

-- =============================================================================
-- SELESAI — Extensions & Helpers siap.
-- =============================================================================
SELECT 'File 01 — Extensions & Helpers: OK' AS result;
