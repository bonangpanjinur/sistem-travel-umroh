-- Add allowed_extensions column to document_types table
ALTER TABLE public.document_types
ADD COLUMN allowed_extensions text[] NOT NULL DEFAULT ARRAY["jpg", "jpeg", "png", "pdf"];

-- Update existing rows to have a default value for allowed_extensions
UPDATE public.document_types
SET allowed_extensions = ARRAY["jpg", "jpeg", "png", "pdf"]
WHERE allowed_extensions IS NULL;
