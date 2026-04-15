-- Migration untuk memperbaiki RLS dan izin pada tabel public.agents

-- Pastikan RLS diaktifkan untuk tabel agents
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Drop kebijakan yang mungkin ada untuk menghindari konflik
DROP POLICY IF EXISTS "Enable read access for all users" ON public.agents;

-- Kebijakan RLS: Izinkan semua pengguna untuk membaca data agen
-- Sesuaikan ini jika Anda memiliki persyaratan keamanan yang lebih ketat
CREATE POLICY "Enable read access for all users" ON public.agents FOR SELECT USING (true);

-- Berikan izin SELECT pada tabel agents ke peran authenticated
GRANT SELECT ON public.agents TO authenticated;

-- Opsional: Refresh PostgREST schema cache (biasanya otomatis setelah migrasi)
-- SELECT pg_notify('pgrst', 'reload schema');
