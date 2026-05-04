-- Create website-assets bucket for branding (logo, favicon, etc.)
INSERT INTO storage.buckets (id, name, public)
VALUES ('website-assets', 'website-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Website assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'website-assets');

-- Allow admin users to upload website assets
CREATE POLICY "Admin can upload website assets"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'website-assets'
  AND public.is_admin(auth.uid())
);

-- Allow admin users to update website assets
CREATE POLICY "Admin can update website assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'website-assets'
  AND public.is_admin(auth.uid())
);

-- Allow admin users to delete website assets
CREATE POLICY "Admin can delete website assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'website-assets'
  AND public.is_admin(auth.uid())
);