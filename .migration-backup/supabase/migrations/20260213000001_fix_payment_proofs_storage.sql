
-- Ensure payment-proofs bucket exists
INSERT INTO storage.buckets (id, name, public)
SELECT 'payment-proofs', 'payment-proofs', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'payment-proofs'
);

-- Update bucket to be public if it already exists but is private
UPDATE storage.buckets 
SET public = true 
WHERE id = 'payment-proofs';

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Finance can view all payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Create robust policies
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'payment-proofs' );

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'payment-proofs' );

CREATE POLICY "Users can update their own uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1] );

CREATE POLICY "Users can delete their own uploads"
ON storage.objects FOR DELETE
TO authenticated
USING ( bucket_id = 'payment-proofs' AND auth.uid()::text = (storage.foldername(name))[1] );
