
-- Create storage bucket for customer documents
INSERT INTO storage.buckets (id, name, public) VALUES ('customer-documents', 'customer-documents', false);

-- RLS policies for customer documents bucket
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'customer-documents' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'customer-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'customer-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'customer-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can manage all documents"
ON storage.objects FOR ALL
USING (
  bucket_id = 'customer-documents'
  AND is_admin(auth.uid())
);
