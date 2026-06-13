-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 020: Notifications — In-App, Push, Email, WhatsApp
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. NOTIFICATIONS — In-app notification per user
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          TEXT        NOT NULL,
  message        TEXT,
  type           TEXT        NOT NULL DEFAULT 'system'
                             CHECK (type IN ('booking','payment','system','reminder',
                                             'marketing','equipment','approval')),
  reference_type TEXT,
  reference_id   UUID,
  action_url     TEXT,
  is_read        BOOLEAN     NOT NULL DEFAULT FALSE,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. NOTIFICATION_TEMPLATES — Template notifikasi per event
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_templates (
  id           UUID                             PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT                             NOT NULL UNIQUE,
  title        TEXT                             NOT NULL,
  body         TEXT                             NOT NULL,
  channel      public.notification_channel_type NOT NULL DEFAULT 'in_app',
  variables    JSONB,
  is_active    BOOLEAN                          NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ                      NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ                      NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notification_templates ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. PUSH_SUBSCRIPTIONS — WebPush subscription per user
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint     TEXT        NOT NULL,
  p256dh       TEXT        NOT NULL,
  auth         TEXT        NOT NULL,
  device_name  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions(user_id);

-- ---------------------------------------------------------------------------
-- 4. PUSH_OUTBOX — Queue pengiriman push notification
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.push_outbox (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  title        TEXT        NOT NULL,
  body         TEXT,
  url          TEXT,
  data         JSONB,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','sent','failed')),
  attempts     INTEGER     NOT NULL DEFAULT 0,
  sent_at      TIMESTAMPTZ,
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.push_outbox ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_push_outbox_status
  ON public.push_outbox(status, created_at);

-- ---------------------------------------------------------------------------
-- 5. EMAIL_LOGS — Log pengiriman email
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email     TEXT        NOT NULL,
  subject      TEXT        NOT NULL,
  template_key TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','sent','failed')),
  error        TEXT,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_email_logs_status ON public.email_logs(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- 6. EMAIL_TEMPLATES — Template email HTML
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.email_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  key          TEXT        NOT NULL UNIQUE,
  name         TEXT        NOT NULL,
  subject      TEXT        NOT NULL,
  body_html    TEXT        NOT NULL,
  body_text    TEXT,
  variables    JSONB,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 7. ANNOUNCEMENTS — Banner pengumuman website
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.announcements (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  message      TEXT        NOT NULL,
  bg_color     TEXT        NOT NULL DEFAULT '#1e40af',
  text_color   TEXT        NOT NULL DEFAULT '#ffffff',
  link_url     TEXT,
  link_text    TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  starts_at    TIMESTAMPTZ,
  ends_at      TIMESTAMPTZ,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 8. BANNERS — Slider banner homepage
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.banners (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT,
  subtitle     TEXT,
  image_url    TEXT        NOT NULL,
  link_url     TEXT,
  cta_text     TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 9. WHATSAPP_CONFIG — Konfigurasi WA Business API
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT        NOT NULL DEFAULT 'official'
                              CHECK (provider IN ('official','wablas','fonnte','other')),
  api_url         TEXT,
  api_token       TEXT,
  phone_number    TEXT,
  business_id     TEXT,
  webhook_token   TEXT,
  is_active       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 10. WA_TEMPLATES — Template pesan WhatsApp
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wa_templates (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL UNIQUE,
  category     TEXT        NOT NULL DEFAULT 'utility'
                           CHECK (category IN ('marketing','utility','authentication')),
  language     TEXT        NOT NULL DEFAULT 'id',
  header       TEXT,
  body         TEXT        NOT NULL,
  footer       TEXT,
  variables    TEXT[],
  status       TEXT        NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft','pending','approved','rejected')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wa_templates ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 11. WA_SEND_LOGS — Log pengiriman WA individual
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wa_send_logs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id       UUID        REFERENCES public.wa_templates(id) ON DELETE SET NULL,
  recipient_phone   TEXT        NOT NULL,
  recipient_name    TEXT,
  variables         JSONB,
  status            TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','sent','delivered','read','failed')),
  sent_at           TIMESTAMPTZ,
  error             TEXT,
  reference_type    TEXT,
  reference_id      UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wa_send_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_wa_send_logs_status ON public.wa_send_logs(status, created_at DESC);

-- ---------------------------------------------------------------------------
-- 12. WA_BROADCAST_CAMPAIGNS — Kampanye broadcast WA
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wa_broadcast_campaigns (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT        NOT NULL,
  template_id    UUID        REFERENCES public.wa_templates(id) ON DELETE SET NULL,
  target_filter  JSONB,
  scheduled_at   TIMESTAMPTZ,
  sent_count     INTEGER     NOT NULL DEFAULT 0,
  failed_count   INTEGER     NOT NULL DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft','scheduled','running','completed','cancelled')),
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wa_broadcast_campaigns ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 13. WA_BROADCAST_LOGS — Log per-recipient broadcast
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wa_broadcast_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID        NOT NULL REFERENCES public.wa_broadcast_campaigns(id) ON DELETE CASCADE,
  recipient_phone  TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','sent','failed')),
  sent_at          TIMESTAMPTZ,
  error            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wa_broadcast_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_wa_broadcast_logs_campaign
  ON public.wa_broadcast_logs(campaign_id);
