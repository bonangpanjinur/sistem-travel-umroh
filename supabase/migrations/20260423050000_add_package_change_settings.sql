-- Add package change settings
INSERT INTO public.company_settings (setting_key, setting_value, setting_type, description) VALUES
('package_change_deadline_days', '60', 'number', 'Batas hari untuk pindah paket tanpa denda (H-X)'),
('package_change_penalty_fee', '0', 'number', 'Nominal denda pindah paket jika melewati batas hari')
ON CONFLICT (setting_key) DO NOTHING;
