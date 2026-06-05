-- ── Migration 11: cancellation rule audit log ──────────────────────────────
-- Tracks every bulk-assign / bulk-unassign action performed by admins.

CREATE TABLE IF NOT EXISTS cancellation_rule_audit_logs (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action         TEXT        NOT NULL,
  actor_name     TEXT,
  actor_email    TEXT,
  rule_id        UUID        REFERENCES cancellation_rules(id) ON DELETE SET NULL,
  rule_name      TEXT,
  package_count  INT         NOT NULL DEFAULT 0,
  package_names  TEXT[]      NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cr_audit_created_at
  ON cancellation_rule_audit_logs (created_at DESC);
