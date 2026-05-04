
-- Create storage bucket for payment proofs
INSERT INTO storage.buckets (id, name, public) VALUES ('payment-proofs', 'payment-proofs', false);

-- RLS policies for payment proofs bucket
CREATE POLICY "Users can upload payment proofs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'payment-proofs' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can view their payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Finance can view all payment proofs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'payment-proofs'
  AND (is_admin(auth.uid()) OR has_role(auth.uid(), 'finance'))
);
