-- Attempt to enable pg_net extension if the schema exists or can be created
-- This migration is now non-blocking to prevent failures in the Supabase SQL editor
DO $$
BEGIN
    -- Try to create schema net if it doesn't exist
    BEGIN
        CREATE SCHEMA IF NOT EXISTS net;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not create schema net, it might be managed by Supabase.';
    END;

    -- Try to enable pg_net extension
    BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA net;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Extension pg_net could not be installed. WhatsApp notifications will be disabled, but bookings will still work.';
    END;
END $$;
