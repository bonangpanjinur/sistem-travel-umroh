-- Migration 37: Tabel log dedup pengingat deadline dokumen
-- Mencegah double-send reminder H-3 / H-1 untuk departure yang sama

CREATE TABLE IF NOT EXISTS doc_deadline_reminder_log (
  id              BIGSERIAL PRIMARY KEY,
  departure_id    UUID        NOT NULL,
  days_before     INT         NOT NULL,          -- 3 atau 1
  sent_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  sent_count      INT         NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (departure_id, days_before, sent_date)
);

CREATE INDEX IF NOT EXISTS idx_doc_deadline_reminder_log_departure
  ON doc_deadline_reminder_log (departure_id, days_before, sent_date);

COMMENT ON TABLE doc_deadline_reminder_log IS
  'Dedup log untuk reminder WA deadline upload dokumen jamaah (H-3 dan H-1 sebelum deadline)';
