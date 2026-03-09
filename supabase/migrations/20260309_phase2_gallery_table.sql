-- Phase 2: Create gallery_items table for visual content optimization

CREATE TABLE public.gallery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  video_url text,
  type text NOT NULL CHECK (type IN ('image', 'video')) DEFAULT 'image',
  category text NOT NULL DEFAULT 'umroh',
  is_active boolean DEFAULT true,
  "order" integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- Everyone can view gallery items
CREATE POLICY "Anyone can view gallery items" 
ON public.gallery_items FOR SELECT 
USING (true);

-- Only admins can manage gallery items
CREATE POLICY "Admins can manage gallery items" 
ON public.gallery_items FOR ALL 
USING (is_admin(auth.uid()));

-- Create trigger for updated_at
CREATE TRIGGER update_gallery_items_updated_at
BEFORE UPDATE ON public.gallery_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample gallery items for Phase 2
INSERT INTO public.gallery_items (title, description, image_url, type, category, "order", is_active) VALUES
('Jamaah di Masjidil Haram', 'Pengalaman spiritual yang tak terlupakan di hadapan Kaabah dengan ribuan jamaah lainnya', 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070', 'image', 'umroh', 1, true),
('Tawaf Berjamaah', 'Momen indah saat melakukan tawaf bersama-sama dalam suasana khusyuk', 'https://images.unsplash.com/photo-1564507592333-c60657eea523?q=80&w=2070', 'image', 'umroh', 2, true),
('Bukit Safa dan Marwa', 'Melaksanakan sa\'i di antara Bukit Safa dan Marwa dengan penuh khusyuk', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?q=80&w=2070', 'image', 'umroh', 3, true),
('Kota Madinah', 'Kunjungan ke Masjid Nabawi dan kota suci Madinah', 'https://images.unsplash.com/photo-1518684029980-cf91ee70ee05?q=80&w=2070', 'image', 'umroh', 4, true),
('Jamaah Haji di Arafah', 'Wukuf di Padang Arafah - puncak ibadah haji yang penuh makna', 'https://images.unsplash.com/photo-1511379938547-c1f69b13d835?q=80&w=2070', 'image', 'haji', 5, true),
('Penyambutan Jamaah', 'Momen penuh kebahagiaan saat jamaah tiba di bandara dengan selamat', 'https://images.unsplash.com/photo-1552664730-d307ca884978?q=80&w=2070', 'image', 'dokumentasi', 6, true);
