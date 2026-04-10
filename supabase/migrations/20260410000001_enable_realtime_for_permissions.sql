-- Enable Realtime for role_permissions and audit_logs tables
-- This is required for the usePermissionsRealtime hook to work correctly

DO $$
BEGIN
    -- Add role_permissions to supabase_realtime publication if it exists
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        -- Check if the table is already in the publication
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = 'role_permissions'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.role_permissions;
        END IF;

        -- Check if audit_logs is already in the publication
        IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables 
            WHERE pubname = 'supabase_realtime' 
            AND schemaname = 'public' 
            AND tablename = 'audit_logs'
        ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
        END IF;
    END IF;
END $$;
