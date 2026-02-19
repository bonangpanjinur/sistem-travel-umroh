
-- Add deduction type (fixed amount or percentage of salary) to hr_settings
ALTER TABLE public.hr_settings 
  ADD COLUMN IF NOT EXISTS absent_deduction_type text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS late_deduction_type text NOT NULL DEFAULT 'fixed',
  ADD COLUMN IF NOT EXISTS absent_deduction_percentage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS late_deduction_percentage numeric DEFAULT 0;

COMMENT ON COLUMN public.hr_settings.absent_deduction_type IS 'fixed = nominal tetap, percentage = % dari gaji pokok';
COMMENT ON COLUMN public.hr_settings.late_deduction_type IS 'fixed = nominal tetap, percentage = % dari gaji pokok';

-- Add per-employee deduction overrides
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS custom_absent_deduction numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_absent_deduction_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_late_deduction numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_late_deduction_type text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS use_custom_deduction boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.employees.use_custom_deduction IS 'Jika true, gunakan aturan potongan khusus karyawan ini';
COMMENT ON COLUMN public.employees.custom_absent_deduction IS 'Override: nilai potongan absen (nominal atau %)';
COMMENT ON COLUMN public.employees.custom_absent_deduction_type IS 'Override: fixed atau percentage';
