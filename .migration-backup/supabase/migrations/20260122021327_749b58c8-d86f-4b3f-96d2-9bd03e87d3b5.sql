-- =============================================
-- ADVANCED REPORTING VIEWS (fixed)
-- =============================================

-- View for financial summary per departure
CREATE OR REPLACE VIEW public.v_financial_summary AS
SELECT 
    d.id as departure_id,
    p.name as package_name,
    d.departure_date,
    d.return_date,
    COUNT(DISTINCT b.id) as total_bookings,
    SUM(b.total_pax) as total_pax,
    SUM(b.total_price) as gross_revenue,
    SUM(b.paid_amount) as collected_amount,
    SUM(b.remaining_amount) as outstanding_amount,
    COALESCE(SUM(vc.amount), 0) as total_vendor_costs,
    SUM(b.paid_amount) - COALESCE(SUM(vc.amount), 0) as net_profit
FROM public.departures d
LEFT JOIN public.packages p ON d.package_id = p.id
LEFT JOIN public.bookings b ON b.departure_id = d.id AND b.booking_status != 'cancelled'
LEFT JOIN public.vendor_costs vc ON vc.departure_id = d.id
GROUP BY d.id, p.name, d.departure_date, d.return_date;

-- =============================================
-- HAJI FEATURES
-- =============================================

-- Haji Registrations (internal tracking)
CREATE TABLE IF NOT EXISTS public.haji_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    registration_number TEXT UNIQUE,
    haji_type TEXT NOT NULL DEFAULT 'regular',
    portion_number TEXT,
    registration_year INTEGER DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    estimated_departure_year INTEGER,
    status TEXT DEFAULT 'registered',
    passport_status TEXT DEFAULT 'pending',
    visa_status TEXT DEFAULT 'pending',
    health_status TEXT DEFAULT 'pending',
    manasik_completed BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Haji Waiting List Progress
CREATE TABLE IF NOT EXISTS public.haji_waiting_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registration_id UUID NOT NULL REFERENCES public.haji_registrations(id) ON DELETE CASCADE,
    progress_date DATE NOT NULL DEFAULT CURRENT_DATE,
    estimated_position INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Manasik Training
CREATE TABLE IF NOT EXISTS public.manasik_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    departure_id UUID REFERENCES public.departures(id),
    title TEXT NOT NULL,
    description TEXT,
    schedule_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,
    instructor TEXT,
    max_participants INTEGER DEFAULT 100,
    is_mandatory BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Manasik Attendance
CREATE TABLE IF NOT EXISTS public.manasik_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_id UUID NOT NULL REFERENCES public.manasik_schedules(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    attended BOOLEAN DEFAULT false,
    attended_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(schedule_id, customer_id)
);

-- =============================================
-- RLS POLICIES FOR HAJI & MANASIK
-- =============================================

ALTER TABLE public.haji_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.haji_waiting_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manasik_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manasik_attendance ENABLE ROW LEVEL SECURITY;

-- Haji Registrations
CREATE POLICY "Admins can manage haji registrations"
ON public.haji_registrations FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Customers can view own haji registration"
ON public.haji_registrations FOR SELECT
TO authenticated
USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

-- Haji Waiting Progress
CREATE POLICY "Admins can manage haji progress"
ON public.haji_waiting_progress FOR ALL
USING (public.is_admin(auth.uid()));

-- Manasik Schedules
CREATE POLICY "Admins can manage manasik schedules"
ON public.manasik_schedules FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Authenticated users can view manasik schedules"
ON public.manasik_schedules FOR SELECT
TO authenticated
USING (true);

-- Manasik Attendance
CREATE POLICY "Admins can manage manasik attendance"
ON public.manasik_attendance FOR ALL
USING (public.is_admin(auth.uid()));

CREATE POLICY "Customers can view own manasik attendance"
ON public.manasik_attendance FOR SELECT
TO authenticated
USING (customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid()));

-- Triggers
CREATE TRIGGER update_haji_registrations_updated_at
BEFORE UPDATE ON public.haji_registrations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();