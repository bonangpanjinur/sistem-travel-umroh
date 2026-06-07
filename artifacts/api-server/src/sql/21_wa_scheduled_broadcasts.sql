-- Migration 21: WA Scheduled Broadcasts
-- Jadwal kirim broadcast WA otomatis (per waktu atau H-N sebelum keberangkatan)
-- Note: template_id stored as UUID only (no FK to wa_templates — avoids cross-migration dependency)

CREATE TABLE IF NOT EXISTS wa_scheduled_broadcasts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  message           text,
  template_id       uuid,                              -- references wa_templates(id) logically
  -- Penerima
  target_type       text NOT NULL DEFAULT 'all'        CHECK (target_type IN ('all','tags','departure')),
  target_tags       text[]   DEFAULT '{}',
  departure_id      uuid REFERENCES departures(id) ON DELETE SET NULL,
  offset_days       int      DEFAULT 0,                -- negatif = H-N sebelum keberangkatan
  -- Jadwal
  scheduled_at      timestamptz NOT NULL,
  -- Status
  status            text NOT NULL DEFAULT 'pending'    CHECK (status IN ('pending','running','done','cancelled','failed')),
  recipient_count   int  DEFAULT 0,
  sent_count        int  DEFAULT 0,
  failed_count      int  DEFAULT 0,
  -- Audit
  created_at        timestamptz NOT NULL DEFAULT now(),
  executed_at       timestamptz,
  error_msg         text
);

CREATE INDEX IF NOT EXISTS idx_wa_sched_status        ON wa_scheduled_broadcasts(status);
CREATE INDEX IF NOT EXISTS idx_wa_sched_scheduled_at  ON wa_scheduled_broadcasts(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_wa_sched_departure     ON wa_scheduled_broadcasts(departure_id);

-- Log per-penerima agar bisa tracking pengiriman per kontak
CREATE TABLE IF NOT EXISTS wa_scheduled_broadcast_logs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id    uuid NOT NULL REFERENCES wa_scheduled_broadcasts(id) ON DELETE CASCADE,
  phone           text NOT NULL,
  name            text,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed')),
  error_msg       text,
  sent_at         timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wa_sched_log_broadcast ON wa_scheduled_broadcast_logs(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_wa_sched_log_phone     ON wa_scheduled_broadcast_logs(phone);
