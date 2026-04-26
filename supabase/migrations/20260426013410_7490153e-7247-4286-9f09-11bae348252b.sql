-- Add new configuration columns to document_types
ALTER TABLE public.document_types
  ADD COLUMN IF NOT EXISTS max_file_size_mb integer NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS allowed_extensions text[] NOT NULL DEFAULT ARRAY['jpg','jpeg','png','pdf']::text[],
  ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();

-- Add validation: max_file_size_mb must be between 1 and 50
ALTER TABLE public.document_types
  DROP CONSTRAINT IF EXISTS document_types_max_file_size_check;
ALTER TABLE public.document_types
  ADD CONSTRAINT document_types_max_file_size_check
  CHECK (max_file_size_mb BETWEEN 1 AND 50);

-- Trigger: keep updated_at fresh
DROP TRIGGER IF EXISTS update_document_types_updated_at ON public.document_types;
CREATE TRIGGER update_document_types_updated_at
  BEFORE UPDATE ON public.document_types
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Backfill sort_order so required come first, then alphabetical
WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY is_required DESC, name) * 10 AS new_order
  FROM public.document_types
)
UPDATE public.document_types dt
SET sort_order = ordered.new_order
FROM ordered
WHERE dt.id = ordered.id AND dt.sort_order = 0;

-- Index for sorting
CREATE INDEX IF NOT EXISTS idx_document_types_sort_order
  ON public.document_types (sort_order, name);