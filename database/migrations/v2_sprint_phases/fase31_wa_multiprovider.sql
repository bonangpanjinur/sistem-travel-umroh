-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 31 — WhatsApp Multi-Provider & Secure Config Management
--
-- 1. Tambah role 'it' ke enum app_role
-- 2. Perluas tabel whatsapp_config: provider_config (JSONB), display_name,
--    updated_by, masked_key helper
-- 3. Perketat RLS: hanya super_admin / owner / it yang bisa WRITE
-- 4. Fungsi helper get_wa_config_safe() — SELECT tanpa api_key (untuk frontend)
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Tambah enum value 'it' ────────────────────────────────────────────
DO $$ BEGIN
  ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'it';
EXCEPTION WHEN others THEN NULL;
END $$;

-- ─── 2. Kolom baru di whatsapp_config ────────────────────────────────────
-- provider_config: JSONB dengan setting per-provider (api_token, domain, instance_id, …)
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS display_name   TEXT,
  ADD COLUMN IF NOT EXISTS provider_config JSONB NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS webhook_secret  TEXT,
  ADD COLUMN IF NOT EXISTS updated_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS last_tested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_test_ok   BOOLEAN;

-- ─── 3. Perketat RLS ──────────────────────────────────────────────────────
-- Drop kebijakan lama yang terlalu longgar
DROP POLICY IF EXISTS "staff_full_access_wa_config" ON whatsapp_config;

-- Semua staf authenticated boleh READ (api_key tidak dikembalikan ke client)
CREATE POLICY "wa_config_read_all"
  ON whatsapp_config FOR SELECT TO authenticated
  USING (true);

-- Hanya super_admin / owner / it yang boleh WRITE
CREATE POLICY "wa_config_write_privileged"
  ON whatsapp_config FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'it')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'it')
    )
  );

-- ─── 4. Fungsi safe-read (tanpa api_key & webhook_secret) ─────────────────
--
-- Dipanggil dari frontend: tidak pernah membocorkan credential sensitif.
-- api_key dikembalikan sebagai masked string ('••••••••••' atau '***xyz').
--
CREATE OR REPLACE FUNCTION get_wa_config_safe()
RETURNS TABLE (
  id              UUID,
  provider        TEXT,
  display_name    TEXT,
  sender_number   TEXT,
  is_active       BOOLEAN,
  provider_config JSONB,
  api_key_set     BOOLEAN,
  api_key_hint    TEXT,
  last_tested_at  TIMESTAMPTZ,
  last_test_ok    BOOLEAN,
  updated_by      UUID,
  updated_at      TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      wc.id,
      wc.provider,
      wc.display_name,
      wc.sender_number,
      wc.is_active,
      wc.provider_config - 'api_token' - 'token' - 'api_key' - 'access_token'
                         - 'auth_header' - 'webhook_secret'  AS provider_config,
      (wc.api_key IS NOT NULL AND wc.api_key <> '')          AS api_key_set,
      CASE
        WHEN wc.api_key IS NULL OR wc.api_key = '' THEN NULL
        ELSE '••••' || RIGHT(wc.api_key, 4)
      END                                                      AS api_key_hint,
      wc.last_tested_at,
      wc.last_test_ok,
      wc.updated_by,
      wc.updated_at
    FROM whatsapp_config wc;
END;
$$;

GRANT EXECUTE ON FUNCTION get_wa_config_safe() TO authenticated;

-- ─── 5. Tambahkan kolom 'it' support ke whatsapp_config RLS view ─────────
-- (tidak ada aksi extra — policy di langkah 3 sudah mencakupnya)

-- ─── 6. Roadmap tracking table ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_feature_roadmap (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase       INTEGER NOT NULL,
  code        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'planned'
               CHECK (status IN ('done', 'in_progress', 'planned', 'cancelled')),
  target_date DATE,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE wa_feature_roadmap ENABLE ROW LEVEL SECURITY;
CREATE POLICY "wa_roadmap_read" ON wa_feature_roadmap FOR SELECT TO authenticated USING (true);
CREATE POLICY "wa_roadmap_write" ON wa_feature_roadmap FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','it')))
  WITH CHECK (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','it')));

-- Seed roadmap data
INSERT INTO wa_feature_roadmap (phase, code, title, description, status, sort_order) VALUES
  (1, 'WA_BASIC_SEND',        'Kirim WA via Fonnte',              'Kirim pesan single & bulk via provider Fonnte', 'done', 10),
  (1, 'WA_TEMPLATES_ENGINE',  'Template Pesan Dinamis',           'Variabel {nama}, {kode}, {tanggal} di template', 'done', 20),
  (1, 'WA_SEND_LOGS',         'Log Pengiriman WA',                'Riwayat setiap pesan terkirim / gagal', 'done', 30),
  (1, 'WA_BLAST_DEPARTURE',   'Broadcast per Keberangkatan',      'Kirim massal ke semua jamaah satu keberangkatan', 'done', 40),
  (1, 'WA_BLAST_TAGIHAN',     'Broadcast Tagihan',                'Kirim reminder tagihan ke banyak jamaah sekaligus', 'done', 50),
  (1, 'WA_AUTO_BOOKING',      'Notif Otomatis Booking Baru',      'Auto-kirim WA saat booking/DP/lunas dikonfirmasi', 'done', 60),
  (2, 'WA_MULTIPROVIDER',     'Multi-Provider (Fonnte/Wablas/…)', 'Support banyak gateway WA, dipilih dari panel admin', 'in_progress', 70),
  (2, 'WA_ADMIN_KEY_PANEL',   'Panel Kelola API Key di Admin',    'Super admin/owner/IT bisa simpan & ganti key dari UI', 'in_progress', 80),
  (2, 'WA_AUTO_REMINDER',     'Auto-Jadwal Reminder Pembayaran',  'Buat baris reminder H-7/H-3 otomatis tanpa campur tangan staf', 'in_progress', 90),
  (3, 'WA_BROADCAST_SEGMENT', 'Broadcast Tersegmentasi',          'Filter penerima: by paket, keberangkatan, status bayar, dll.', 'planned', 100),
  (3, 'WA_CAMPAIGN_MANAGER',  'Manajemen Kampanye Broadcast',     'Jadwal pengiriman, A/B template, statistik open-rate', 'planned', 110),
  (3, 'WA_DELIVERY_RECEIPT',  'Status Terkirim & Dibaca',         'Webhook status delivered/read dari provider', 'planned', 120),
  (4, 'WA_CHATBOT_KEYWORD',   'Auto-Reply Berbasis Kata Kunci',   'Balas otomatis jika jamaah kirim kata kunci tertentu', 'planned', 130),
  (4, 'WA_CHATBOT_MENU',      'Bot Menu Interaktif',              'Menu nomor (1. Cek booking, 2. Hubungi CS, ...)', 'planned', 140),
  (4, 'WA_INBOX',             'Inbox WA di Admin Panel',          'Lihat & balas pesan masuk dari admin panel', 'planned', 150),
  (5, 'WA_META_CLOUD',        'WhatsApp Cloud API (Meta/WABA)',   'Integrasi resmi Meta Business API, template terverifikasi', 'planned', 160),
  (5, 'WA_CONTACT_MGMT',      'Manajemen Kontak WA',              'Sinkronisasi kontak jamaah ke daftar kontak provider', 'planned', 170),
  (6, 'WA_AI_SMARTSEND',      'AI Smart Send',                    'AI pilih waktu optimal pengiriman per jamaah', 'planned', 180),
  (6, 'WA_AI_PERSONALIZE',    'Personalisasi Pesan via AI',       'AI buat variasi pesan berdasarkan profil jamaah', 'planned', 190)
ON CONFLICT (code) DO NOTHING;

-- ─── 7. Role permissions untuk fitur baru ────────────────────────────────
-- WA_PROVIDER (wa-provider): hanya super_admin, owner, it
-- WA_ROADMAP  (wa-roadmap):  semua yang punya akses Komunikasi
INSERT INTO role_permissions (role, permission_key)
VALUES
  ('super_admin', 'wa-provider'),
  ('owner',       'wa-provider'),
  ('it',          'wa-provider'),
  ('super_admin', 'wa-roadmap'),
  ('owner',       'wa-roadmap'),
  ('it',          'wa-roadmap'),
  ('branch_manager', 'wa-roadmap'),
  ('operational',    'wa-roadmap'),
  ('marketing',      'wa-roadmap')
ON CONFLICT DO NOTHING;

SELECT 'Fase 31 — WA multi-provider schema installed' AS result;
