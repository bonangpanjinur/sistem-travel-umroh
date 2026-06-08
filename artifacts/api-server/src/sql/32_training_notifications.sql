-- ── Migration 32: Training Notification Settings & Log ──────────────────────

-- Single-row settings table (ID fixed so upsert always hits same row)
CREATE TABLE IF NOT EXISTS training_notification_settings (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  channels             TEXT[]      NOT NULL DEFAULT '{"whatsapp"}',
  notify_on_assignment BOOLEAN     NOT NULL DEFAULT true,
  reminder_days_before INTEGER[]   NOT NULL DEFAULT '{3,1}',
  notify_on_overdue    BOOLEAN     NOT NULL DEFAULT true,
  overdue_repeat_days  INTEGER     NOT NULL DEFAULT 3,
  is_active            BOOLEAN     NOT NULL DEFAULT true,
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insert default settings row (idempotent)
INSERT INTO training_notification_settings
  (channels, notify_on_assignment, reminder_days_before, notify_on_overdue, overdue_repeat_days, is_active)
SELECT '{"whatsapp"}', true, '{3,1}', true, 3, true
WHERE NOT EXISTS (SELECT 1 FROM training_notification_settings);

-- Per-notification log (prevents duplicate sends)
CREATE TABLE IF NOT EXISTS training_notification_log (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id       UUID        REFERENCES employees(id) ON DELETE CASCADE,
  module_id         UUID        REFERENCES training_modules(id) ON DELETE CASCADE,
  notification_type TEXT        NOT NULL,  -- new_assignment | deadline_3d | deadline_1d | overdue
  channel           TEXT        NOT NULL,  -- whatsapp | email
  status            TEXT        NOT NULL DEFAULT 'sent',  -- sent | failed | skipped
  recipient_phone   TEXT,
  recipient_email   TEXT,
  message_preview   TEXT,
  error_message     TEXT,
  sent_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tnl_employee ON training_notification_log(employee_id);
CREATE INDEX IF NOT EXISTS idx_tnl_sent_at  ON training_notification_log(sent_at DESC);
-- Composite index for fast duplicate-check lookups (dedup handled in application layer)
CREATE INDEX IF NOT EXISTS idx_tnl_dedup_lookup
  ON training_notification_log(employee_id, module_id, notification_type, sent_at)
  WHERE status = 'sent';
