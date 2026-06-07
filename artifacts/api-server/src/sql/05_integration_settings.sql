-- Migration 05: Integration API keys stored in app_settings
-- Idempotent: safe to run multiple times

-- Ensure app_settings exists (minimal schema)
CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add optional columns if they don't exist yet (idempotent)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS is_public   BOOLEAN NOT NULL DEFAULT FALSE;

-- Seed default rows for integration keys (do nothing on conflict)
INSERT INTO app_settings (key, value) VALUES
  ('integration_gemini_api_key',       ''),
  ('integration_openai_api_key',       ''),
  ('integration_midtrans_server_key',  ''),
  ('integration_midtrans_client_key',  ''),
  ('integration_midtrans_mode',        'sandbox'),
  ('integration_smtp_host',            ''),
  ('integration_smtp_port',            '587'),
  ('integration_smtp_user',            ''),
  ('integration_smtp_pass',            ''),
  ('integration_smtp_from',            '')
ON CONFLICT (key) DO NOTHING;
