-- =============================================================================
-- 18_wa_bot_menu.sql
-- WA Phase 4: Interactive Bot Menu (numbered menu system)
-- =============================================================================

-- ── 1. Bot Menu Items ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_bot_menu_items (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_number   INTEGER     NOT NULL,          -- 1, 2, 3, ...
  label         TEXT        NOT NULL,          -- "Cek Booking", "Info Paket", ...
  reply_message TEXT        NOT NULL,          -- reply when user picks this number
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  sort_order    INTEGER     NOT NULL DEFAULT 0,
  trigger_count INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS wa_bot_menu_number_idx ON wa_bot_menu_items (menu_number) WHERE is_active = true;

-- ── 2. Bot Menu Config ────────────────────────────────────────────────────────
-- Stored in app_settings: key = 'wa_bot_menu_enabled', value = 'true'/'false'
-- Stored in app_settings: key = 'wa_bot_menu_trigger',  value = 'menu' (keyword to show menu)
-- Stored in app_settings: key = 'wa_bot_menu_header',   value = greeting text
-- Stored in app_settings: key = 'wa_bot_menu_footer',   value = footer/CTA text

-- ── 3. Seed default menu items ────────────────────────────────────────────────
INSERT INTO wa_bot_menu_items (menu_number, label, reply_message, is_active, sort_order) VALUES
  (1, 'Cek Status Booking',
   E'Assalamu\'alaikum! 📋 Untuk cek status booking Anda, silakan login ke portal jamaah kami.\n\nPortal: {portal_url}\n\nAtau kirim kode booking Anda ke CS kami. Barakallahu fiikum 🤲',
   true, 10),
  (2, 'Info Paket Umroh & Haji',
   E'Assalamu\'alaikum! 🕌 Kami memiliki berbagai pilihan paket Umroh & Haji:\n\n• Paket Reguler — ekonomis, nyaman\n• Paket Plus — hotel bintang 4\n• Paket VIP — hotel bintang 5, fasilitas premium\n\nKunjungi {portal_url} untuk info lengkap & harga. Barakallahu fiikum 🌙',
   true, 20),
  (3, 'Jadwal Keberangkatan',
   E'Assalamu\'alaikum! ✈️ Untuk melihat jadwal keberangkatan terbaru, silakan kunjungi:\n\n{portal_url}\n\nAtau hubungi CS kami untuk info ketersediaan kursi. Jazakallah khair 🤲',
   true, 30),
  (4, 'Syarat & Kelengkapan Dokumen',
   E'Assalamu\'alaikum! 📄 Dokumen yang perlu disiapkan untuk Umroh/Haji:\n\n✅ Paspor (berlaku min. 6 bulan)\n✅ KTP asli\n✅ Kartu Keluarga\n✅ Buku Nikah / Akta Lahir\n✅ Pas foto background putih\n✅ Suntik meningitis\n\nHubungi CS untuk info lebih lengkap. Barakallahu fiikum 🌙',
   true, 40),
  (5, 'Hubungi Customer Service',
   E'Assalamu\'alaikum! 📞 Tim Customer Service kami siap membantu Anda.\n\nSilakan tunggu sebentar, CS kami akan segera merespons pesan ini. Terima kasih atas kesabaran Anda.\n\nJazakallah khair 🤲',
   true, 50)
ON CONFLICT DO NOTHING;

-- ── 4. Seed default menu config in app_settings ───────────────────────────────
INSERT INTO app_settings (key, value) VALUES
  ('wa_bot_menu_enabled', 'true'),
  ('wa_bot_menu_trigger', 'menu'),
  ('wa_bot_menu_header',  E'Assalamu\'alaikum! 👋 Selamat datang di *Vinstour Travel*.\n\nSilakan pilih menu berikut dengan mengetik nomornya:'),
  ('wa_bot_menu_footer',  E'\n_Atau ketik pesan langsung dan CS kami akan segera membalas. Barakallahu fiikum 🕌_')
ON CONFLICT (key) DO NOTHING;

-- ── 5. Update roadmap statuses ────────────────────────────────────────────────
-- Phase 4: mark fully done items
UPDATE wa_feature_roadmap SET status = 'done', updated_at = NOW()
  WHERE code IN ('WA_CHATBOT_KEYWORD', 'WA_INBOX');

-- WA_CHATBOT_MENU now in_progress (this migration implements it)
UPDATE wa_feature_roadmap SET status = 'in_progress', updated_at = NOW()
  WHERE code = 'WA_CHATBOT_MENU';

-- Phase 5: mark contacts done
UPDATE wa_feature_roadmap SET status = 'done', updated_at = NOW()
  WHERE code = 'WA_CONTACT_MGMT';
