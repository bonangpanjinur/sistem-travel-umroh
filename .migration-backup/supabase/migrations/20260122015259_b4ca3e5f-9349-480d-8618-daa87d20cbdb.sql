-- =====================================================
-- SECURITY ENHANCEMENT: AUDIT TRAIL & ACTIVITY LOG
-- =====================================================

-- 1. ACTIVITY LOG (Login/Logout tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL, -- LOGIN, LOGOUT, PASSWORD_CHANGE, 2FA_ENABLED, etc.
    ip_address INET,
    user_agent TEXT,
    device_info JSONB, -- browser, OS, device type
    location_info JSONB, -- country, city (from IP)
    status VARCHAR(20) DEFAULT 'success', -- success, failed, blocked
    failure_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for faster queries
CREATE INDEX idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX idx_activity_logs_action ON public.activity_logs(action);

-- 2. AUDIT TRAIL (Data change tracking)
-- =====================================================
-- Note: audit_logs table already exists, we'll enhance it
ALTER TABLE public.audit_logs 
ADD COLUMN IF NOT EXISTS entity_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS entity_id UUID,
ADD COLUMN IF NOT EXISTS action_type VARCHAR(50), -- CREATE, UPDATE, DELETE, VERIFY, APPROVE, REJECT
ADD COLUMN IF NOT EXISTS severity VARCHAR(20) DEFAULT 'info', -- info, warning, critical
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id),
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Index for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON public.audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs(severity);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON public.audit_logs(user_id);

-- 3. TWO-FACTOR AUTHENTICATION TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.user_2fa_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    is_enabled BOOLEAN DEFAULT false,
    method VARCHAR(20) DEFAULT 'email', -- email, sms, authenticator
    phone_number VARCHAR(20), -- for SMS method
    secret_key TEXT, -- for authenticator app (encrypted)
    backup_codes TEXT[], -- encrypted backup codes
    last_verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. OTP CODES TABLE (for 2FA verification)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    code VARCHAR(10) NOT NULL,
    purpose VARCHAR(50) NOT NULL, -- login_2fa, password_reset, email_verify
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN DEFAULT false,
    used_at TIMESTAMPTZ,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_otp_codes_user_purpose ON public.otp_codes(user_id, purpose);
CREATE INDEX idx_otp_codes_expires ON public.otp_codes(expires_at);

-- 5. FAILED LOGIN ATTEMPTS (Brute force protection)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    is_successful BOOLEAN DEFAULT false,
    failure_reason VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_login_attempts_email ON public.login_attempts(email);
CREATE INDEX idx_login_attempts_ip ON public.login_attempts(ip_address);
CREATE INDEX idx_login_attempts_created ON public.login_attempts(created_at DESC);

-- 6. ENABLE RLS
-- =====================================================
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_2fa_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- 7. RLS POLICIES
-- =====================================================

-- Activity Logs: Admin can view all, users can view own
CREATE POLICY "Admin view all activity logs" ON public.activity_logs
FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "Users view own activity logs" ON public.activity_logs
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "System insert activity logs" ON public.activity_logs
FOR INSERT WITH CHECK (true);

-- 2FA Settings: Users manage own settings
CREATE POLICY "Users view own 2fa settings" ON public.user_2fa_settings
FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users update own 2fa settings" ON public.user_2fa_settings
FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users insert own 2fa settings" ON public.user_2fa_settings
FOR INSERT WITH CHECK (user_id = auth.uid());

-- OTP Codes: System access only (via service role)
CREATE POLICY "System manage otp codes" ON public.otp_codes
FOR ALL USING (true);

-- Login Attempts: Admin view only
CREATE POLICY "Admin view login attempts" ON public.login_attempts
FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "System insert login attempts" ON public.login_attempts
FOR INSERT WITH CHECK (true);

-- 8. HELPER FUNCTION: Log Audit Action
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_audit_action(
    _table_name TEXT,
    _record_id UUID,
    _action TEXT,
    _action_type TEXT,
    _old_data JSONB DEFAULT NULL,
    _new_data JSONB DEFAULT NULL,
    _severity TEXT DEFAULT 'info',
    _metadata JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _audit_id UUID;
    _user_branch_id UUID;
BEGIN
    -- Get user's branch
    SELECT branch_id INTO _user_branch_id 
    FROM public.user_roles 
    WHERE user_id = auth.uid() 
    LIMIT 1;

    INSERT INTO public.audit_logs (
        user_id, table_name, record_id, action, action_type,
        old_data, new_data, severity, branch_id, metadata
    ) VALUES (
        auth.uid(), _table_name, _record_id, _action, _action_type,
        _old_data, _new_data, _severity, _user_branch_id, _metadata
    )
    RETURNING id INTO _audit_id;
    
    RETURN _audit_id;
END;
$$;

-- 9. HELPER FUNCTION: Log Activity
-- =====================================================
CREATE OR REPLACE FUNCTION public.log_activity(
    _action TEXT,
    _status TEXT DEFAULT 'success',
    _failure_reason TEXT DEFAULT NULL,
    _device_info JSONB DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _activity_id UUID;
BEGIN
    INSERT INTO public.activity_logs (
        user_id, action, status, failure_reason, device_info
    ) VALUES (
        auth.uid(), _action, _status, _failure_reason, _device_info
    )
    RETURNING id INTO _activity_id;
    
    RETURN _activity_id;
END;
$$;

-- 10. FUNCTION: Check if account is locked (brute force protection)
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_account_locked(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*) >= 5
    FROM public.login_attempts
    WHERE email = _email
      AND is_successful = false
      AND created_at > NOW() - INTERVAL '15 minutes'
$$;

-- 11. FUNCTION: Get failed attempts count
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_failed_attempts(_email TEXT)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT COUNT(*)::INTEGER
    FROM public.login_attempts
    WHERE email = _email
      AND is_successful = false
      AND created_at > NOW() - INTERVAL '15 minutes'
$$;