
-- VISA APPLICATIONS
CREATE TABLE public.visa_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  departure_id UUID REFERENCES public.departures(id) ON DELETE SET NULL,
  visa_type TEXT NOT NULL DEFAULT 'umrah',
  status TEXT NOT NULL DEFAULT 'pending',
  passport_number TEXT,
  passport_expiry DATE,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,
  visa_number TEXT,
  visa_expiry DATE,
  notes TEXT,
  processed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.visa_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage visa" ON public.visa_applications
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view own visa" ON public.visa_applications
  FOR SELECT USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

-- PREPARATION CHECKLISTS
CREATE TABLE public.preparation_checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  item_key TEXT NOT NULL,
  item_label TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'document',
  is_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_id, booking_id, item_key)
);

ALTER TABLE public.preparation_checklists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage checklists" ON public.preparation_checklists
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can manage own checklists" ON public.preparation_checklists
  FOR ALL USING (
    customer_id IN (SELECT id FROM public.customers WHERE user_id = auth.uid())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.visa_applications;
