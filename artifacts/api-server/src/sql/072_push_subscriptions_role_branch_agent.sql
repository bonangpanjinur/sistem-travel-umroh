-- Migration 072: tambah kolom role, branch_id, agent_id ke push_subscriptions
-- Untuk targeting push notification berdasarkan role (branch_manager, agent, dll.)

ALTER TABLE push_subscriptions
  ADD COLUMN IF NOT EXISTS role        TEXT,
  ADD COLUMN IF NOT EXISTS branch_id   UUID,
  ADD COLUMN IF NOT EXISTS agent_id    UUID;

CREATE INDEX IF NOT EXISTS idx_push_subs_role       ON push_subscriptions(role)        WHERE role IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_push_subs_branch_id  ON push_subscriptions(branch_id)   WHERE branch_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_push_subs_agent_id   ON push_subscriptions(agent_id)    WHERE agent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_push_subs_user_id    ON push_subscriptions(user_id)     WHERE user_id IS NOT NULL;
