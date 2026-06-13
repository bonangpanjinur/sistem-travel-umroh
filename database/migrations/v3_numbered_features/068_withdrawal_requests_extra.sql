-- B15: Kolom tambahan untuk withdrawal_requests
ALTER TABLE withdrawal_requests
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bank_details JSONB;

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_agent_status
  ON withdrawal_requests (agent_id, status, created_at DESC);
