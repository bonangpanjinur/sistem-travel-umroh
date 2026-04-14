-- Attempt to enable pg_net extension using strictly dynamic SQL
-- This ensures the migration never fails even if the schema 'net' cannot be created manually
DO $$
BEGIN
    -- Try to create schema net if it doesn't exist using EXECUTE
    BEGIN
        EXECUTE 'CREATE SCHEMA IF NOT EXISTS net';
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not create schema net, it might be managed by Supabase or permissions are restricted.';
    END;

    -- Try to enable pg_net extension using EXECUTE
    BEGIN
        EXECUTE 'CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net';
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Extension pg_net could not be installed. WhatsApp notifications will be disabled, but bookings will still work.';
    END;
END $$;
