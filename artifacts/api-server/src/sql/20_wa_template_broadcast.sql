-- =============================================================================
-- 20_wa_template_broadcast.sql
-- WA Phase 5: Meta WABA Template Broadcast logging table
-- =============================================================================

CREATE TABLE IF NOT EXISTS wa_template_broadcasts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL DEFAULT '',
  template_name   TEXT        NOT NULL,
  template_lang   TEXT        NOT NULL DEFAULT 'id',
  variable_map    JSONB       NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending','sending','done','failed')),
  total_recipients INT        NOT NULL DEFAULT 0,
  sent_count      INT         NOT NULL DEFAULT 0,
  failed_count    INT         NOT NULL DEFAULT 0,
  created_by      UUID,
  started_at      TIMESTAMPTZ,
  finished_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_template_broadcast_recipients (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id    UUID        NOT NULL REFERENCES wa_template_broadcasts(id) ON DELETE CASCADE,
  booking_id      UUID,
  phone           TEXT        NOT NULL,
  full_name       TEXT,
  resolved_vars   JSONB       NOT NULL DEFAULT '{}',
  status          TEXT        NOT NULL DEFAULT 'queued'
                                CHECK (status IN ('queued','sent','failed')),
  error_message   TEXT,
  message_id      TEXT,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_template_bcast_status ON wa_template_broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_wa_template_bcast_rcpt_broadcast ON wa_template_broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_wa_template_bcast_rcpt_status  ON wa_template_broadcast_recipients(status);
