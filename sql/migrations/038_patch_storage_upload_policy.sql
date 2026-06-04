-- Tighten storage uploads
DROP POLICY IF EXISTS "Staff and agents can upload customer documents" ON storage.objects;
CREATE POLICY "Staff and agents can upload customer documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'customer-documents'
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operational'::public.app_role)
    OR public.has_role(auth.uid(), 'sales'::public.app_role)
    OR public.has_role(auth.uid(), 'agent'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.user_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  )
);

DROP POLICY IF EXISTS "Users can upload payment proofs" ON storage.objects;
CREATE POLICY "Users can upload payment proofs"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs'
  AND (
    public.is_admin(auth.uid())
    OR public.has_role(auth.uid(), 'operational'::public.app_role)
    OR public.has_role(auth.uid(), 'sales'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.user_id = auth.uid()
        AND (storage.foldername(name))[1] = c.id::text
    )
  )
);

-- Restrict referral_codes public listing to authenticated users only
DROP POLICY IF EXISTS "Anyone can view referral codes for validation" ON public.referral_codes;
CREATE POLICY "Authenticated users can validate referral codes"
ON public.referral_codes
FOR SELECT
TO authenticated
USING (is_active = true);
