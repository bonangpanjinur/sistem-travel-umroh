-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 019: CRM — Contact Messages & SOS Alerts
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CONTACT_MESSAGES — Pesan dari form kontak website
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.contact_messages (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name    TEXT        NOT NULL,
  phone        TEXT,
  email        TEXT,
  subject      TEXT,
  message      TEXT        NOT NULL,
  source       TEXT        NOT NULL DEFAULT 'website'
                           CHECK (source IN ('website','whatsapp','email','other')),
  is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
  replied_at   TIMESTAMPTZ,
  replied_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reply_note   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_contact_messages_is_read
  ON public.contact_messages(is_read, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. SOS_ALERTS — Alert darurat jamaah di lapangan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sos_alerts (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  departure_id     UUID        REFERENCES public.departures(id) ON DELETE SET NULL,
  message          TEXT,
  location_lat     NUMERIC,
  location_lng     NUMERIC,
  location_name    TEXT,
  status           TEXT        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','acknowledged','resolved')),
  acknowledged_by  UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at  TIMESTAMPTZ,
  resolved_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at      TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sos_alerts ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_sos_alerts_status
  ON public.sos_alerts(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sos_alerts_departure
  ON public.sos_alerts(departure_id);
