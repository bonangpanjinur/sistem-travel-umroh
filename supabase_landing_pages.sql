-- Tabel Landing Pages
CREATE TABLE IF NOT EXISTS public.landing_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    meta_title TEXT,
    meta_description TEXT,
    og_image_url TEXT,
    is_published BOOLEAN DEFAULT false,
    sections JSONB DEFAULT '[]'::jsonb, -- Menyimpan array objek section
    
    -- Konfigurasi WhatsApp Dinamis
    whatsapp_source_type TEXT DEFAULT 'global' CHECK (whatsapp_source_type IN ('global', 'agent', 'custom')),
    whatsapp_agent_id UUID REFERENCES public.agents(id) ON DELETE SET NULL,
    whatsapp_custom_number TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexing untuk SEO & Performa
CREATE INDEX IF NOT EXISTS idx_lp_slug ON public.landing_pages(slug);

-- RLS (Row Level Security)
ALTER TABLE public.landing_pages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid errors on re-run
DROP POLICY IF EXISTS "Public view published" ON public.landing_pages;
DROP POLICY IF EXISTS "Admin full access" ON public.landing_pages;

CREATE POLICY "Public view published" ON public.landing_pages FOR SELECT USING (is_published = true);
CREATE POLICY "Admin full access" ON public.landing_pages FOR ALL TO authenticated USING (true);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.landing_pages;
