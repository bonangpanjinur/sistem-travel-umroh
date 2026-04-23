-- Add package change settings permission
INSERT INTO public.permissions_list (key, label, group_name, description) VALUES
('settings-package-change', 'Pengaturan Pindah Paket', 'Pengaturan', 'Akses untuk mengatur batas hari dan denda pindah paket')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  group_name = EXCLUDED.group_name,
  description = EXCLUDED.description;
