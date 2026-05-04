-- =====================================================
-- FIX AUDIT LOGS: SCHEMA UNIFICATION & TRIGGER REPAIR
-- =====================================================

-- 1. Ensure audit_logs table has all necessary columns from all previous versions
-- and add missing relationship to profiles if needed (though profiles is usually linked via user_id)
DO $$ 
BEGIN
    -- Core columns from first version
    -- id, user_id, action, table_name, record_id, old_data, new_data, ip_address, user_agent, created_at
    
    -- Columns from second version (20260122015259)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'entity_name') THEN
        ALTER TABLE public.audit_logs ADD COLUMN entity_name VARCHAR(100);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'entity_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN entity_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'action_type') THEN
        ALTER TABLE public.audit_logs ADD COLUMN action_type VARCHAR(50);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'severity') THEN
        ALTER TABLE public.audit_logs ADD COLUMN severity VARCHAR(20) DEFAULT 'info';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'branch_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN branch_id UUID REFERENCES public.branches(id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'metadata') THEN
        ALTER TABLE public.audit_logs ADD COLUMN metadata JSONB;
    END IF;

    -- Columns from third version (20260324000011) - mapping to existing columns
    -- resource_type -> table_name or entity_name
    -- resource_id -> record_id or entity_id
    -- old_values -> old_data
    -- new_values -> new_data
    
    -- Ensure user_id has foreign key to auth.users
    -- (Usually already there, but let's be safe)
END $$;

-- 2. Fix the Audit Trigger Function for role_permissions
-- This function was failing because it used columns that might not exist or had naming mismatches
CREATE OR REPLACE FUNCTION public.handle_role_permissions_audit()
RETURNS TRIGGER AS $$
DECLARE
    _user_id UUID;
BEGIN
    _user_id := auth.uid();
    NEW.updated_at = NOW();
    NEW.updated_by = _user_id;
    
    -- Insert to audit_logs with robust column handling
    INSERT INTO public.audit_logs (
        user_id,
        table_name,
        record_id,
        action,
        action_type,
        old_data,
        new_data,
        severity,
        created_at
    ) VALUES (
        _user_id,
        'role_permissions',
        NEW.id,
        'Update role permission: ' || NEW.permission_key || ' for ' || NEW.role,
        CASE 
            WHEN TG_OP = 'INSERT' THEN 'CREATE'
            WHEN TG_OP = 'UPDATE' THEN 'UPDATE'
            WHEN TG_OP = 'DELETE' THEN 'DELETE'
            ELSE TG_OP
        END,
        to_jsonb(OLD),
        to_jsonb(NEW),
        'warning',
        NOW()
    );
    
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- If audit fails, don't block the actual permission change, but log to stderr for Supabase logs
    RAISE WARNING 'Audit log failed for role_permissions: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure RLS allows Admins to view audit logs
DROP POLICY IF EXISTS "Admins can view audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can only read audit logs" ON public.audit_logs;

CREATE POLICY "Admins can view audit logs" ON public.audit_logs
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner')
    )
);

-- 4. Ensure RLS allows system/authenticated to insert audit logs
DROP POLICY IF EXISTS "Authenticated can insert audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated can insert audit logs" ON public.audit_logs
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 5. Fix permissions_list audit trigger as well
CREATE OR REPLACE FUNCTION public.handle_permissions_list_audit()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.audit_logs (
        user_id,
        table_name,
        record_id,
        action,
        action_type,
        old_data,
        new_data,
        severity,
        created_at
    ) VALUES (
        auth.uid(),
        'permissions_list',
        NULL, -- key is text, record_id is UUID in some versions, using metadata for key
        'Modify permission definition: ' || COALESCE(NEW.key, OLD.key),
        TG_OP,
        to_jsonb(OLD),
        to_jsonb(NEW),
        'info',
        NOW()
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Audit log failed for permissions_list: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Explicitly define relationship to profiles via user_id
-- This helps PostgREST understand the relationship for joins
-- We'll try to add a foreign key if it doesn't exist, but profiles table uses user_id as the link to auth.users
-- Since audit_logs.user_id and profiles.user_id both point to auth.users.id, we can join them.
-- To make it easier for PostgREST, we can ensure the FK is there.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'audit_logs_user_id_fkey' 
        AND table_name = 'audit_logs'
    ) THEN
        ALTER TABLE public.audit_logs 
        ADD CONSTRAINT audit_logs_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 7. Add a helper view for audit logs with profile names
-- This is a more robust way to get the data if the direct join continues to fail
CREATE OR REPLACE VIEW public.audit_logs_with_profiles AS
SELECT 
    al.*,
    p.full_name as user_full_name
FROM 
    public.audit_logs al
LEFT JOIN 
    public.profiles p ON al.user_id = p.user_id;

-- Grant access to the view
GRANT SELECT ON public.audit_logs_with_profiles TO authenticated;

-- Add RLS to the view (it will inherit from the underlying tables if defined as security invoker, 
-- but let's be explicit if needed. PostgREST views usually need explicit grants)
-- Note: Views in Supabase/PostgreSQL don't have RLS themselves, but they respect underlying RLS 
-- if they are created with "security invoker".
ALTER VIEW public.audit_logs_with_profiles SET (security_invoker = on);
