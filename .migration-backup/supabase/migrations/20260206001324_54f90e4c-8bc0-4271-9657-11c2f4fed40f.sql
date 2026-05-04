-- =============================================
-- 1. EMPLOYEES TABLE (HR Module)
-- =============================================
CREATE TABLE public.employees (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    branch_id UUID REFERENCES public.branches(id),
    employee_code TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    position TEXT,
    department TEXT,
    hire_date DATE,
    birth_date DATE,
    gender public.gender_type,
    address TEXT,
    city TEXT,
    province TEXT,
    photo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    salary NUMERIC(15,2),
    bank_name TEXT,
    bank_account_number TEXT,
    bank_account_name TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- 2. ATTENDANCE RECORDS TABLE
-- =============================================
CREATE TABLE public.attendance_records (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    check_in_location JSONB,
    check_out_location JSONB,
    check_in_photo_url TEXT,
    check_out_photo_url TEXT,
    status TEXT DEFAULT 'present' CHECK (status IN ('present', 'absent', 'late', 'half_day', 'leave', 'sick')),
    notes TEXT,
    verified_by UUID REFERENCES auth.users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(employee_id, attendance_date)
);

-- =============================================
-- 3. LEAVE REQUESTS TABLE
-- =============================================
CREATE TABLE public.leave_requests (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    leave_type TEXT NOT NULL CHECK (leave_type IN ('annual', 'sick', 'maternity', 'paternity', 'unpaid', 'other')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INTEGER GENERATED ALWAYS AS (end_date - start_date + 1) STORED,
    reason TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    approved_by UUID REFERENCES auth.users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- 4. PAYMENT REMINDERS TABLE
-- =============================================
CREATE TABLE public.payment_reminders (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    reminder_type TEXT NOT NULL CHECK (reminder_type IN ('whatsapp', 'email', 'both')),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    message_content TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- 5. EMAIL LOGS TABLE
-- =============================================
CREATE TABLE public.email_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    subject TEXT NOT NULL,
    body_html TEXT,
    template_type TEXT,
    reference_type TEXT,
    reference_id UUID,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =============================================
-- 6. ENABLE RLS
-- =============================================
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- 7. RLS POLICIES - Employees
-- =============================================
CREATE POLICY "Admins can manage employees"
ON public.employees FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Employees can view own profile"
ON public.employees FOR SELECT
USING (user_id = auth.uid());

-- =============================================
-- 8. RLS POLICIES - Attendance Records
-- =============================================
CREATE POLICY "Admins can manage attendance"
ON public.attendance_records FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Employees can view own attendance"
ON public.attendance_records FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.employees e 
        WHERE e.id = attendance_records.employee_id 
        AND e.user_id = auth.uid()
    )
);

CREATE POLICY "Employees can insert own attendance"
ON public.attendance_records FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.employees e 
        WHERE e.id = attendance_records.employee_id 
        AND e.user_id = auth.uid()
    )
);

-- =============================================
-- 9. RLS POLICIES - Leave Requests
-- =============================================
CREATE POLICY "Admins can manage leave requests"
ON public.leave_requests FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Employees can view own leave requests"
ON public.leave_requests FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.employees e 
        WHERE e.id = leave_requests.employee_id 
        AND e.user_id = auth.uid()
    )
);

CREATE POLICY "Employees can create own leave requests"
ON public.leave_requests FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.employees e 
        WHERE e.id = leave_requests.employee_id 
        AND e.user_id = auth.uid()
    )
);

-- =============================================
-- 10. RLS POLICIES - Payment Reminders
-- =============================================
CREATE POLICY "Admins can manage payment reminders"
ON public.payment_reminders FOR ALL
USING (public.is_admin(auth.uid()));

-- =============================================
-- 11. RLS POLICIES - Email Logs
-- =============================================
CREATE POLICY "Admins can view email logs"
ON public.email_logs FOR SELECT
USING (public.is_admin(auth.uid()));

CREATE POLICY "Service can insert email logs"
ON public.email_logs FOR INSERT
WITH CHECK (true);

-- =============================================
-- 12. TRIGGERS FOR UPDATED_AT
-- =============================================
CREATE TRIGGER update_employees_updated_at
BEFORE UPDATE ON public.employees
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_attendance_records_updated_at
BEFORE UPDATE ON public.attendance_records
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- 13. GENERATE EMPLOYEE CODE FUNCTION
-- =============================================
CREATE OR REPLACE FUNCTION public.generate_employee_code()
RETURNS TEXT
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
    new_code TEXT;
    code_exists BOOLEAN;
BEGIN
    LOOP
        new_code := 'EMP' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
        SELECT EXISTS(SELECT 1 FROM public.employees WHERE employee_code = new_code) INTO code_exists;
        EXIT WHEN NOT code_exists;
    END LOOP;
    RETURN new_code;
END;
$$;

-- =============================================
-- 14. INDEXES FOR PERFORMANCE
-- =============================================
CREATE INDEX idx_employees_branch_id ON public.employees(branch_id);
CREATE INDEX idx_employees_user_id ON public.employees(user_id);
CREATE INDEX idx_employees_is_active ON public.employees(is_active);
CREATE INDEX idx_attendance_employee_date ON public.attendance_records(employee_id, attendance_date);
CREATE INDEX idx_leave_requests_employee_id ON public.leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX idx_payment_reminders_booking_id ON public.payment_reminders(booking_id);
CREATE INDEX idx_payment_reminders_status ON public.payment_reminders(status);
CREATE INDEX idx_email_logs_reference ON public.email_logs(reference_type, reference_id);