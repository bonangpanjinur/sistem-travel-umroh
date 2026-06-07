-- =============================================================================
-- 19_wa_bot_menu_interactive.sql
-- WA Phase 4: Meta WABA Interactive List & Button Messages
-- =============================================================================

-- ── 1. Tambah kolom description ke wa_bot_menu_items ─────────────────────────
ALTER TABLE wa_bot_menu_items
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';

-- ── 2. Seed konfigurasi interactive ke app_settings ──────────────────────────
INSERT INTO app_settings (key, value, description, is_public)
VALUES
  ('wa_bot_menu_interactive',  'false',    'Gunakan Meta WABA Interactive List Message (hanya Meta Cloud API)', false),
  ('wa_bot_menu_button_text',  'Pilih Menu', 'Teks tombol pada Interactive List Message', false),
  ('wa_bot_menu_section_title','Layanan Kami', 'Judul seksi pada Interactive List Message', false)
ON CONFLICT (key) DO NOTHING;
