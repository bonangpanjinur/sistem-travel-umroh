-- =============================================================================
-- 17_wa_chatbot_inbox_contacts.sql
-- WA Phase 4 & 5: Chatbot Keywords, Incoming Messages (Inbox), Contacts
-- =============================================================================

-- ── 1. Chatbot keyword rules ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_chatbot_keywords (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword       TEXT        NOT NULL,
  match_type    TEXT        NOT NULL DEFAULT 'contains',  -- exact | contains | startswith
  reply_message TEXT        NOT NULL,
  is_active     BOOLEAN     NOT NULL DEFAULT true,
  priority      INTEGER     NOT NULL DEFAULT 0,
  trigger_count INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wa_chatbot_keywords_active_idx ON wa_chatbot_keywords (is_active, priority DESC);

-- ── 2. Incoming WA messages (Inbox) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_incoming_messages (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_phone    TEXT        NOT NULL,
  from_name     TEXT,
  message       TEXT        NOT NULL,
  message_id    TEXT,
  provider      TEXT,
  is_read       BOOLEAN     NOT NULL DEFAULT false,
  is_replied    BOOLEAN     NOT NULL DEFAULT false,
  reply_message TEXT,
  replied_at    TIMESTAMPTZ,
  chatbot_matched BOOLEAN   NOT NULL DEFAULT false,
  chatbot_keyword_id UUID   REFERENCES wa_chatbot_keywords(id) ON DELETE SET NULL,
  received_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wa_incoming_from_phone_idx ON wa_incoming_messages (from_phone, received_at DESC);
CREATE INDEX IF NOT EXISTS wa_incoming_unread_idx    ON wa_incoming_messages (is_read, received_at DESC);

-- ── 3. WA Contacts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wa_contacts (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phone         TEXT        NOT NULL UNIQUE,
  name          TEXT,
  customer_id   UUID        REFERENCES customers(id) ON DELETE SET NULL,
  tags          TEXT[]      NOT NULL DEFAULT '{}',
  notes         TEXT,
  opt_out       BOOLEAN     NOT NULL DEFAULT false,
  last_sent_at  TIMESTAMPTZ,
  last_reply_at TIMESTAMPTZ,
  message_count INTEGER     NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wa_contacts_phone_idx       ON wa_contacts (phone);
CREATE INDEX IF NOT EXISTS wa_contacts_customer_id_idx ON wa_contacts (customer_id);

-- ── 4. Update wa_feature_roadmap statuses ─────────────────────────────────────
-- Phase 2: mark done
UPDATE wa_feature_roadmap SET status = 'done', updated_at = NOW()
  WHERE code IN ('WA_MULTIPROVIDER', 'WA_ADMIN_KEY_PANEL', 'WA_AUTO_REMINDER');

-- Phase 3: mark done (broadcast/campaign/delivery all implemented)
UPDATE wa_feature_roadmap SET status = 'done', updated_at = NOW()
  WHERE code IN ('WA_BROADCAST_SEGMENT', 'WA_CAMPAIGN_MANAGER', 'WA_DELIVERY_RECEIPT');

-- Phase 4: mark in_progress (pages now exist)
UPDATE wa_feature_roadmap SET status = 'in_progress', updated_at = NOW()
  WHERE code IN ('WA_CHATBOT_KEYWORD', 'WA_CHATBOT_MENU', 'WA_INBOX');

-- Phase 5: Meta provider done, contacts in_progress
UPDATE wa_feature_roadmap SET status = 'done', updated_at = NOW()
  WHERE code = 'WA_META_CLOUD';
UPDATE wa_feature_roadmap SET status = 'in_progress', updated_at = NOW()
  WHERE code = 'WA_CONTACT_MGMT';

-- ── 5. Seed sample chatbot keywords (safe to run multiple times) ──────────────
INSERT INTO wa_chatbot_keywords (keyword, match_type, reply_message, is_active, priority) VALUES
  ('cek booking', 'contains',
   'Assalamu''alaikum! 🙏 Untuk cek status booking, silakan login ke portal jamaah di {portal_url} atau hubungi CS kami. Jazakallah khair.',
   true, 100),
  ('harga', 'contains',
   'Assalamu''alaikum! 💰 Untuk info harga paket Umroh/Haji, silakan kunjungi {portal_url} atau hubungi kami. Barakallahu fiikum 🌙',
   true, 90),
  ('info paket', 'contains',
   'Assalamu''alaikum! 📦 Kami menyediakan berbagai paket Umroh & Haji dengan harga terjangkau. Silakan kunjungi {portal_url} untuk detail lengkap. 🕌',
   true, 85),
  ('jadwal', 'contains',
   'Assalamu''alaikum! 📅 Untuk jadwal keberangkatan terbaru, silakan cek di {portal_url} atau hubungi CS kami. Jazakallah khair 🤲',
   true, 80),
  ('hubungi', 'contains',
   'Assalamu''alaikum! 📞 Tim kami siap membantu Anda. Silakan tunggu, CS kami akan segera merespons. Barakallahu fiikum 🌙',
   true, 70),
  ('halo', 'startswith',
   'Wa''alaikumsalam warahmatullahi wabarakatuh! 🤲 Selamat datang di Vinstour Travel. Ada yang bisa kami bantu?',
   true, 50),
  ('assalamualaikum', 'startswith',
   'Wa''alaikumsalam warahmatullahi wabarakatuh! 🤲 Selamat datang di Vinstour Travel. Ada yang bisa kami bantu?',
   true, 50)
ON CONFLICT DO NOTHING;
