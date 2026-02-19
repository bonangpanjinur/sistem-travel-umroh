
-- Table for registered employee devices
CREATE TABLE public.employee_devices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  device_name TEXT NOT NULL DEFAULT 'Unknown Device',
  user_agent TEXT,
  screen_info TEXT,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  registered_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  UNIQUE(employee_id, device_fingerprint)
);

-- Enable RLS
ALTER TABLE public.employee_devices ENABLE ROW LEVEL SECURITY;

-- Admins/HR can manage all devices
CREATE POLICY "Admins can manage all devices"
  ON public.employee_devices FOR ALL
  USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(), 'operational'));

-- Employees can view their own devices
CREATE POLICY "Employees can view own devices"
  ON public.employee_devices FOR SELECT
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- Add column to hr_settings to toggle device restriction
ALTER TABLE public.hr_settings 
  ADD COLUMN IF NOT EXISTS require_device_registration BOOLEAN NOT NULL DEFAULT false;

-- Enable realtime for device table (for admin monitoring)
ALTER PUBLICATION supabase_realtime ADD TABLE public.employee_devices;
