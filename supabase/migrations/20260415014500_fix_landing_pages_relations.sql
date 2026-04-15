-- Migration untuk memastikan relasi dan izin yang benar pada landing_pages dan agents

-- 1. Pastikan foreign key whatsapp_agent_id ada dan benar
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'landing_pages_whatsapp_agent_id_fkey' 
        AND table_name = 'landing_pages'
    ) THEN
        ALTER TABLE public.landing_pages 
        ADD CONSTRAINT landing_pages_whatsapp_agent_id_fkey 
        FOREIGN KEY (whatsapp_agent_id) 
        REFERENCES public.agents(id) 
        ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Pastikan RLS diaktifkan untuk kedua tabel
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- 3. Kebijakan RLS untuk landing_pages (Publik bisa baca yang sudah dipublikasikan)
DROP POLICY IF EXISTS "Public view published" ON public.landing_pages;
CREATE POLICY "Public view published" ON public.landing_pages 
FOR SELECT USING (is_published = true);

-- 4. Kebijakan RLS untuk agents (Publik bisa baca data agen dasar)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.agents;
CREATE POLICY "Enable read access for all users" ON public.agents 
FOR SELECT USING (true);

-- 5. Berikan izin SELECT ke peran anon dan authenticated
GRANT SELECT ON public.landing_pages TO anon, authenticated;
GRANT SELECT ON public.agents TO anon, authenticated;

-- 6. Berikan izin SELECT pada tabel profiles (untuk mengambil nomor telepon)
GRANT SELECT ON public.profiles TO anon, authenticated;

-- 7. Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
