-- 1. Tambahkan kolom legacy yang masih dipakai jalur lama
ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS old_values JSONB;

ALTER TABLE public.audit_logs
ADD COLUMN IF NOT EXISTS new_values JSONB;

-- 2. Backfill data historis agar konsisten
UPDATE public.audit_logs
SET old_values = old_data
WHERE old_values IS NULL AND old_data IS NOT NULL;

UPDATE public.audit_logs
SET new_values = new_data
WHERE new_values IS NULL AND new_data IS NOT NULL;

-- 3. Fungsi sinkronisasi dua arah antara kolom legacy dan kanonis
CREATE OR REPLACE FUNCTION public.sync_audit_logs_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  -- old_data <-> old_values
  IF NEW.old_data IS NULL AND NEW.old_values IS NOT NULL THEN
    NEW.old_data := NEW.old_values;
  ELSIF NEW.old_values IS NULL AND NEW.old_data IS NOT NULL THEN
    NEW.old_values := NEW.old_data;
  END IF;

  -- new_data <-> new_values
  IF NEW.new_data IS NULL AND NEW.new_values IS NOT NULL THEN
    NEW.new_data := NEW.new_values;
  ELSIF NEW.new_values IS NULL AND NEW.new_data IS NOT NULL THEN
    NEW.new_values := NEW.new_data;
  END IF;

  -- resource_type / table_name kompatibilitas
  IF NEW.table_name IS NULL AND NEW.resource_type IS NOT NULL THEN
    NEW.table_name := NEW.resource_type;
  ELSIF NEW.resource_type IS NULL AND NEW.table_name IS NOT NULL THEN
    NEW.resource_type := NEW.table_name;
  END IF;

  -- resource_id / record_id kompatibilitas
  IF NEW.record_id IS NULL AND NEW.resource_id IS NOT NULL THEN
    NEW.record_id := NEW.resource_id;
  ELSIF NEW.resource_id IS NULL AND NEW.record_id IS NOT NULL THEN
    NEW.resource_id := NEW.record_id;
  END IF;

  RETURN NEW;
END;
$$;

-- 4. Trigger sebelum insert/update agar caller lama dan baru sama-sama aman
DROP TRIGGER IF EXISTS audit_logs_sync_columns ON public.audit_logs;
CREATE TRIGGER audit_logs_sync_columns
BEFORE INSERT OR UPDATE ON public.audit_logs
FOR EACH ROW
EXECUTE FUNCTION public.sync_audit_logs_columns();