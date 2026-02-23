-- Create marketing materials table for agents to download promotional materials
CREATE TABLE IF NOT EXISTS public.marketing_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  
  -- Material metadata
  name text NOT NULL,
  description text,
  material_type text NOT NULL, -- 'brochure', 'flyer', 'banner', 'poster', 'video', 'template'
  category text, -- 'umrah', 'hajj', 'general'
  
  -- File information
  file_url text NOT NULL,
  file_name text NOT NULL,
  file_size integer, -- in bytes
  file_type text, -- 'pdf', 'image', 'video', 'document'
  
  -- Availability
  is_active boolean DEFAULT true,
  available_for_agents boolean DEFAULT true,
  available_for_customers boolean DEFAULT false,
  
  -- Tracking
  download_count integer DEFAULT 0,
  
  -- Metadata
  tags text[] DEFAULT '{}',
  created_by uuid REFERENCES public.profiles(id),
  
  CONSTRAINT valid_material_type CHECK (material_type IN ('brochure', 'flyer', 'banner', 'poster', 'video', 'template'))
);

-- Create index for faster queries
CREATE INDEX idx_marketing_materials_active ON public.marketing_materials(is_active);
CREATE INDEX idx_marketing_materials_type ON public.marketing_materials(material_type);
CREATE INDEX idx_marketing_materials_category ON public.marketing_materials(category);

-- Create download tracking table
CREATE TABLE IF NOT EXISTS public.marketing_material_downloads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone DEFAULT now(),
  
  material_id uuid NOT NULL REFERENCES public.marketing_materials(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Download metadata
  ip_address text,
  user_agent text,
  
  UNIQUE(material_id, user_id, created_at::date)
);

-- Create index for tracking
CREATE INDEX idx_marketing_downloads_material ON public.marketing_material_downloads(material_id);
CREATE INDEX idx_marketing_downloads_user ON public.marketing_material_downloads(user_id);
CREATE INDEX idx_marketing_downloads_date ON public.marketing_material_downloads(created_at);

-- Enable RLS
ALTER TABLE public.marketing_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_material_downloads ENABLE ROW LEVEL SECURITY;

-- RLS Policies for marketing_materials
CREATE POLICY "Anyone can view active marketing materials"
  ON public.marketing_materials
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Only admins can create marketing materials"
  ON public.marketing_materials
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'owner', 'marketing')
    )
  );

CREATE POLICY "Only admins can update marketing materials"
  ON public.marketing_materials
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'owner', 'marketing')
    )
  );

CREATE POLICY "Only admins can delete marketing materials"
  ON public.marketing_materials
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'owner', 'marketing')
    )
  );

-- RLS Policies for marketing_material_downloads
CREATE POLICY "Users can view their own downloads"
  ON public.marketing_material_downloads
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own downloads"
  ON public.marketing_material_downloads
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Only admins can view all downloads"
  ON public.marketing_material_downloads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('super_admin', 'owner', 'marketing')
    )
  );

-- Create function to increment download count
CREATE OR REPLACE FUNCTION public.increment_material_download_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.marketing_materials
  SET download_count = download_count + 1
  WHERE id = NEW.material_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for download tracking
DROP TRIGGER IF EXISTS trg_increment_material_downloads ON public.marketing_material_downloads;
CREATE TRIGGER trg_increment_material_downloads
  AFTER INSERT ON public.marketing_material_downloads
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_material_download_count();
