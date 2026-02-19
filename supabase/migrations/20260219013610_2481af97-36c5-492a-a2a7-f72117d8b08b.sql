
-- Departments table
CREATE TABLE public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read departments" ON public.departments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage departments" ON public.departments FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Positions table
CREATE TABLE public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  level INT DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read positions" ON public.positions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage positions" ON public.positions FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Work schedules table
CREATE TABLE public.work_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME DEFAULT '08:00',
  end_time TIME DEFAULT '17:00',
  is_day_off BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(employee_id, day_of_week)
);
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read schedules" ON public.work_schedules FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage schedules" ON public.work_schedules FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- HR settings (singleton-like, one row)
CREATE TABLE public.hr_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  absent_deduction_per_day NUMERIC DEFAULT 50000,
  late_deduction_per_incident NUMERIC DEFAULT 25000,
  overtime_rate_per_hour NUMERIC DEFAULT 30000,
  holiday_overtime_multiplier NUMERIC DEFAULT 2.0,
  work_start_time TIME DEFAULT '08:00',
  work_end_time TIME DEFAULT '17:00',
  late_threshold_minutes INT DEFAULT 15,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.hr_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read hr_settings" ON public.hr_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage hr_settings" ON public.hr_settings FOR ALL TO authenticated USING (public.is_admin(auth.uid()));

-- Insert default HR settings
INSERT INTO public.hr_settings (absent_deduction_per_day, late_deduction_per_incident, overtime_rate_per_hour, holiday_overtime_multiplier, work_start_time, work_end_time, late_threshold_minutes)
VALUES (50000, 25000, 30000, 2.0, '08:00', '17:00', 15);

-- Seed default departments
INSERT INTO public.departments (name, code) VALUES
  ('Operasional', 'OPS'),
  ('Keuangan', 'FIN'),
  ('Penjualan', 'SALES'),
  ('Marketing', 'MKT'),
  ('HRD', 'HRD'),
  ('IT', 'IT');

-- Seed default positions for each department
INSERT INTO public.positions (department_id, name, level) VALUES
  ((SELECT id FROM public.departments WHERE code = 'OPS'), 'Staff Operasional', 1),
  ((SELECT id FROM public.departments WHERE code = 'OPS'), 'Muthawif', 2),
  ((SELECT id FROM public.departments WHERE code = 'OPS'), 'Tour Leader', 2),
  ((SELECT id FROM public.departments WHERE code = 'OPS'), 'Manager Operasional', 3),
  ((SELECT id FROM public.departments WHERE code = 'FIN'), 'Staff Keuangan', 1),
  ((SELECT id FROM public.departments WHERE code = 'FIN'), 'Manager Keuangan', 3),
  ((SELECT id FROM public.departments WHERE code = 'SALES'), 'Sales', 1),
  ((SELECT id FROM public.departments WHERE code = 'SALES'), 'Manager Sales', 3),
  ((SELECT id FROM public.departments WHERE code = 'MKT'), 'Staff Marketing', 1),
  ((SELECT id FROM public.departments WHERE code = 'HRD'), 'Staff HRD', 1),
  ((SELECT id FROM public.departments WHERE code = 'HRD'), 'Manager HRD', 3),
  ((SELECT id FROM public.departments WHERE code = 'IT'), 'Staff IT', 1);

-- Add indexes
CREATE INDEX idx_positions_department ON public.positions(department_id);
CREATE INDEX idx_work_schedules_employee ON public.work_schedules(employee_id);
