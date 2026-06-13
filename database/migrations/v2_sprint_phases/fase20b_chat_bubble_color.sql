-- =============================================================================
-- MIGRASI FASE 20 — Tambah kolom chat_bubble_color di website_settings
-- Kolom ini menyimpan key preset warna bubble chat per agen/cabang
-- Jalankan setelah fase19_branch_kpi_targets.sql
-- =============================================================================

ALTER TABLE website_settings
  ADD COLUMN IF NOT EXISTS chat_bubble_color TEXT NOT NULL DEFAULT 'violet';

COMMENT ON COLUMN website_settings.chat_bubble_color IS
  'Preset warna chat bubble: violet | emerald | blue | rose | amber | cyan | fuchsia | slate';

SELECT 'Fase 20 migration completed — chat_bubble_color column added to website_settings' AS result;
