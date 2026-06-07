-- =============================================================================
-- 062 — Agent status field, invitation tokens, profile jabatan
-- =============================================================================

-- 1. Kolom status di tabel agents
ALTER TABLE agents ADD COLUMN IF NOT EXISTS
  status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('pending', 'active', 'suspended', 'inactive'));

CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- 2. Kolom jabatan & joined_at di profiles (untuk staff cabang)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS jabatan TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS joined_at DATE;

-- 3. Tabel token undangan sub-agen
CREATE TABLE IF NOT EXISTS agent_invitation_tokens (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  token            TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  used_at          TIMESTAMPTZ,
  used_by_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
  expires_at       TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_inv_agent_id ON agent_invitation_tokens(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_inv_token    ON agent_invitation_tokens(token);

ALTER TABLE agent_invitation_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agent_manage_own_tokens"  ON agent_invitation_tokens;
DROP POLICY IF EXISTS "admin_manage_all_tokens"  ON agent_invitation_tokens;

CREATE POLICY "admin_manage_all_tokens" ON agent_invitation_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','operational')
    )
  );

CREATE POLICY "agent_manage_own_tokens" ON agent_invitation_tokens
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM agents
      WHERE agents.id = agent_invitation_tokens.agent_id
        AND agents.user_id = auth.uid()
    )
  );

-- 4. View helper: daftar sub-agen beserta nama parent
CREATE OR REPLACE VIEW agent_hierarchy_view AS
SELECT
  a.id,
  a.user_id,
  a.agent_code,
  COALESCE(a.company_name, p.full_name, a.email) AS display_name,
  a.email,
  a.phone,
  a.commission_rate,
  a.level,
  a.status,
  a.is_active,
  a.branch_id,
  b.name  AS branch_name,
  a.parent_agent_id,
  COALESCE(pp.full_name, pa.company_name, pa.email) AS parent_name,
  a.created_at
FROM agents a
LEFT JOIN profiles p  ON p.id  = a.user_id
LEFT JOIN branches b  ON b.id  = a.branch_id
LEFT JOIN agents   pa ON pa.id = a.parent_agent_id
LEFT JOIN profiles pp ON pp.id = pa.user_id;
