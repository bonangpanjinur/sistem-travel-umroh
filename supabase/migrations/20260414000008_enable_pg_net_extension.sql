-- Enable pg_net extension to support net.http_post
-- Create schema net if it doesn't exist (Supabase standard)
CREATE SCHEMA IF NOT EXISTS net;

-- Enable the extension within the net schema
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;

-- Verify the extension is installed
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) THEN
    RAISE WARNING 'Extension pg_net could not be installed. Please enable it manually in the Supabase Dashboard (Database -> Extensions -> pg_net).';
  END IF;
END $$;
