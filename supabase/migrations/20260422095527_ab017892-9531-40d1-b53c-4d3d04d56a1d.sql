ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS resource_type TEXT;