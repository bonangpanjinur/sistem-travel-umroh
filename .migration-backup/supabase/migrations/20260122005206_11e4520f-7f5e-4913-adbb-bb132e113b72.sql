
-- Add policies for Staff and Agents to manage customer documents

-- Drop existing limited staff policy
DROP POLICY IF EXISTS "Staff can view all documents" ON public.customer_documents;

-- Staff (admin, operational, sales, branch_manager, finance) can fully manage all documents
CREATE POLICY "Staff can manage all documents" 
ON public.customer_documents 
FOR ALL 
USING (
  is_admin(auth.uid()) 
  OR has_role(auth.uid(), 'operational'::app_role)
  OR has_role(auth.uid(), 'sales'::app_role)
  OR has_role(auth.uid(), 'branch_manager'::app_role)
  OR has_role(auth.uid(), 'finance'::app_role)
);

-- Update storage policies for customer-documents bucket
-- Allow staff to upload documents for any customer
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;

-- Staff and Agents can upload documents
CREATE POLICY "Staff and agents can upload customer documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'customer-documents' 
  AND auth.uid() IS NOT NULL
);

-- Staff can view all customer documents
CREATE POLICY "Staff can view all customer documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'customer-documents' 
  AND (
    is_admin(auth.uid()) 
    OR has_role(auth.uid(), 'operational'::app_role)
    OR has_role(auth.uid(), 'sales'::app_role)
    OR has_role(auth.uid(), 'branch_manager'::app_role)
    OR has_role(auth.uid(), 'finance'::app_role)
    OR has_role(auth.uid(), 'agent'::app_role)
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);

-- Staff can update customer documents
CREATE POLICY "Staff can update customer documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'customer-documents' 
  AND (
    is_admin(auth.uid()) 
    OR has_role(auth.uid(), 'operational'::app_role)
    OR has_role(auth.uid(), 'sales'::app_role)
    OR has_role(auth.uid(), 'branch_manager'::app_role)
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);

-- Staff can delete customer documents
CREATE POLICY "Staff can delete customer documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'customer-documents' 
  AND (
    is_admin(auth.uid()) 
    OR has_role(auth.uid(), 'operational'::app_role)
    OR has_role(auth.uid(), 'sales'::app_role)
    OR has_role(auth.uid(), 'branch_manager'::app_role)
    OR (auth.uid())::text = (storage.foldername(name))[1]
  )
);
