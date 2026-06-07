-- Migration 06: Fix app_settings schema + re-seed integration key rows
-- Idempotent: safe to run multiple times

-- Add optional columns if they don't exist (app_settings was created without them)
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE app_settings ADD COLUMN IF NOT EXISTS is_public   BOOLEAN NOT NULL DEFAULT FALSE;

-- Seed integration key rows (key + value only — description/is_public are optional)
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
