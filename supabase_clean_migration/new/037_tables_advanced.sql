-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 037: Advanced Feature Tables
--   siskohat_registrations, siskohat_sync_logs,
--   chatbot_conversations, chatbot_messages,
--   cash_transactions, activity_logs
-- Run AFTER 036. Idempotent — IF NOT EXISTS throughout.
-- RLS policies: see 039_rls_extended.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. SISKOHAT_REGISTRATIONS — Data jamaah yang terdaftar di SISKOHAT
--    (Sistem Komputerisasi Haji Terpadu — Kemenag RI)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.siskohat_registrations (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  haji_registration_id  UUID        REFERENCES public.haji_registrations(id) ON DELETE SET NULL,
  customer_id           UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  porsi_number          TEXT        UNIQUE,
  registration_year     INTEGER,
  province              TEXT,
  city                  TEXT,
  kbih_code             TEXT,
  bpih_status           TEXT        NOT NULL DEFAULT 'belum_lunas'
                                    CHECK (bpih_status IN ('belum_lunas','lunas_dp','lunas_penuh','batal')),
  embarkation_code      TEXT,
  embarkation_city      TEXT,
  departure_wave        INTEGER,
  departure_batch       INTEGER,
  estimated_year        INTEGER,
  status                TEXT        NOT NULL DEFAULT 'terdaftar'
                                    CHECK (status IN ('terdaftar','batal_daftar','menunggu','dipanggil',
                                                       'berangkat','gagal_berangkat','selesai')),
  siskohat_data         JSONB,
  synced_at             TIMESTAMPTZ,
  sync_status           TEXT        NOT NULL DEFAULT 'pending'
                                    CHECK (sync_status IN ('pending','synced','failed','outdated')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.siskohat_registrations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_siskohat_registrations_customer_id ON public.siskohat_registrations(customer_id);
CREATE INDEX IF NOT EXISTS idx_siskohat_registrations_porsi_number ON public.siskohat_registrations(porsi_number);

-- ---------------------------------------------------------------------------
-- 2. SISKOHAT_SYNC_LOGS — Log sinkronisasi data dengan SISKOHAT
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.siskohat_sync_logs (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id     UUID        REFERENCES public.siskohat_registrations(id) ON DELETE CASCADE,
  sync_type           TEXT        NOT NULL DEFAULT 'check_status'
                                  CHECK (sync_type IN ('check_status','update_data','fetch_list','bulk_sync')),
  request_payload     JSONB,
  response_payload    JSONB,
  http_status         INTEGER,
  status              TEXT        NOT NULL DEFAULT 'success'
                                  CHECK (status IN ('success','failed','timeout','error')),
  error_message       TEXT,
  records_processed   INTEGER     NOT NULL DEFAULT 0,
  records_updated     INTEGER     NOT NULL DEFAULT 0,
  duration_ms         INTEGER,
  performed_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.siskohat_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_siskohat_sync_logs_registration_id ON public.siskohat_sync_logs(registration_id);
CREATE INDEX IF NOT EXISTS idx_siskohat_sync_logs_created_at      ON public.siskohat_sync_logs(created_at);

-- ---------------------------------------------------------------------------
-- 3. CHATBOT_CONVERSATIONS — Percakapan chatbot WhatsApp / web
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chatbot_conversations (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  phone           TEXT,
  channel         TEXT        NOT NULL DEFAULT 'whatsapp'
                              CHECK (channel IN ('whatsapp','web','telegram','instagram')),
  session_id      TEXT        UNIQUE,
  status          TEXT        NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','waiting_human','handed_over','closed','expired')),
  context         JSONB,
  intent          TEXT,
  language        TEXT        NOT NULL DEFAULT 'id',
  message_count   INTEGER     NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  handed_to       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  handed_at       TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  rating          INTEGER     CHECK (rating BETWEEN 1 AND 5),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chatbot_conversations ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_customer_id ON public.chatbot_conversations(customer_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_phone       ON public.chatbot_conversations(phone);
CREATE INDEX IF NOT EXISTS idx_chatbot_conversations_status      ON public.chatbot_conversations(status);

-- ---------------------------------------------------------------------------
-- 4. CHATBOT_MESSAGES — Pesan individual dalam percakapan chatbot
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chatbot_messages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id  UUID        NOT NULL REFERENCES public.chatbot_conversations(id) ON DELETE CASCADE,
  sender           TEXT        NOT NULL DEFAULT 'user'
                               CHECK (sender IN ('user','bot','agent')),
  message_type     TEXT        NOT NULL DEFAULT 'text'
                               CHECK (message_type IN ('text','image','document','button','list',
                                                        'location','audio','video','sticker')),
  content          TEXT,
  media_url        TEXT,
  buttons          JSONB,
  intent           TEXT,
  confidence       NUMERIC,
  provider_msg_id  TEXT,
  is_read          BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at          TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chatbot_messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_conversation_id ON public.chatbot_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_messages_created_at      ON public.chatbot_messages(created_at);

-- ---------------------------------------------------------------------------
-- 5. CASH_TRANSACTIONS — Transaksi kasir tunai / manual
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cash_transactions (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id         UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  cashier_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  booking_id        UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id       UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  type              TEXT        NOT NULL CHECK (type IN ('in','out','transfer','opening','closing')),
  category          TEXT        NOT NULL DEFAULT 'booking_payment'
                                CHECK (category IN ('booking_payment','refund','expense','commission',
                                                     'other_income','other_expense','transfer')),
  amount            NUMERIC     NOT NULL,
  description       TEXT        NOT NULL,
  reference_number  TEXT,
  drawer_balance_before NUMERIC NOT NULL DEFAULT 0,
  drawer_balance_after  NUMERIC NOT NULL DEFAULT 0,
  shift             TEXT        CHECK (shift IN ('morning','afternoon','evening','night')),
  verified_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at       TIMESTAMPTZ,
  receipt_url       TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_cash_transactions_branch_id    ON public.cash_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_booking_id   ON public.cash_transactions(booking_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_cashier_id   ON public.cash_transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_created_at   ON public.cash_transactions(created_at);

-- ---------------------------------------------------------------------------
-- 6. ACTIVITY_LOGS — Log aktivitas granular per user (lebih detail dari audit_logs)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id      UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  session_id     TEXT,
  ip_address     TEXT,
  user_agent     TEXT,
  device_type    TEXT        CHECK (device_type IN ('desktop','mobile','tablet','api','unknown')),
  action         TEXT        NOT NULL,
  module         TEXT,
  entity_type    TEXT,
  entity_id      UUID,
  description    TEXT,
  metadata       JSONB,
  duration_ms    INTEGER,
  http_method    TEXT        CHECK (http_method IN ('GET','POST','PUT','PATCH','DELETE')),
  http_path      TEXT,
  http_status    INTEGER,
  is_error       BOOLEAN     NOT NULL DEFAULT FALSE,
  error_message  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id     ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module      ON public.activity_logs(module);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_type ON public.activity_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at  ON public.activity_logs(created_at);

-- Grant permissions
DO $$
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
  GRANT ALL    ON ALL TABLES IN SCHEMA public TO service_role;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'GRANT on tables/sequences skipped: %', SQLERRM;
END;
$$;

SELECT '037_tables_advanced: OK' AS result;
