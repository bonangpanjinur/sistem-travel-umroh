-- =====================================================================
-- Migration 066: Equipment Distribution Photo Proof (E7)
-- =====================================================================
-- Add field for photo proof of equipment distribution (serah terima)
-- This allows staff to upload photo evidence when distributing equipment to jamaah

-- E7: Add photo field to equipment_distributions
ALTER TABLE equipment_distributions
  ADD COLUMN IF NOT EXISTS distribution_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS distribution_photo_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS distribution_photo_uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Index for quick lookup of distributions with photos
CREATE INDEX IF NOT EXISTS idx_equip_dist_with_photo
  ON equipment_distributions (departure_id, distribution_photo_url)
  WHERE distribution_photo_url IS NOT NULL;

-- Index for tracking who uploaded photos
CREATE INDEX IF NOT EXISTS idx_equip_dist_photo_uploader
  ON equipment_distributions (distribution_photo_uploaded_by, distribution_photo_uploaded_at DESC)
  WHERE distribution_photo_url IS NOT NULL;

-- RPC: Update distribution with photo proof
-- Allows staff to upload photo evidence when distributing equipment
CREATE OR REPLACE FUNCTION update_distribution_photo(
  p_distribution_id UUID,
  p_photo_url TEXT,
  p_uploader_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE equipment_distributions
  SET
    distribution_photo_url = p_photo_url,
    distribution_photo_uploaded_at = NOW(),
    distribution_photo_uploaded_by = COALESCE(p_uploader_id, auth.uid())
  WHERE
    id = p_distribution_id
    AND status = 'distributed';

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION update_distribution_photo(UUID, TEXT, UUID) TO authenticated;

-- RPC: Bulk update distributions with photos
-- Allows updating multiple distributions with photo proof in one call
CREATE OR REPLACE FUNCTION bulk_update_distribution_photos(
  p_distribution_ids UUID[],
  p_photo_urls TEXT[],
  p_uploader_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
  i INTEGER;
BEGIN
  FOR i IN 1..array_length(p_distribution_ids, 1)
  LOOP
    UPDATE equipment_distributions
    SET
      distribution_photo_url = p_photo_urls[i],
      distribution_photo_uploaded_at = NOW(),
      distribution_photo_uploaded_by = COALESCE(p_uploader_id, auth.uid())
    WHERE
      id = p_distribution_ids[i]
      AND status = 'distributed';

    IF FOUND THEN
      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_update_distribution_photos(UUID[], TEXT[], UUID) TO authenticated;

-- RPC: Get distribution with photo proof details
-- Returns distribution info along with photo metadata
CREATE OR REPLACE FUNCTION get_distribution_with_photo(
  p_distribution_id UUID
)
RETURNS TABLE (
  id UUID,
  customer_id UUID,
  equipment_id UUID,
  equipment_name TEXT,
  quantity INTEGER,
  size TEXT,
  status TEXT,
  distributed_at TIMESTAMPTZ,
  confirmed_by_jamaah BOOLEAN,
  distribution_photo_url TEXT,
  distribution_photo_uploaded_at TIMESTAMPTZ,
  uploader_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ed.id,
    ed.customer_id,
    ed.equipment_id,
    ei.name,
    ed.quantity,
    ed.size,
    ed.status,
    ed.distributed_at,
    ed.confirmed_by_jamaah,
    ed.distribution_photo_url,
    ed.distribution_photo_uploaded_at,
    au.email
  FROM equipment_distributions ed
  LEFT JOIN equipment_items ei ON ed.equipment_id = ei.id
  LEFT JOIN auth.users au ON ed.distribution_photo_uploaded_by = au.id
  WHERE ed.id = p_distribution_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_distribution_with_photo(UUID) TO authenticated;

-- Comments for documentation
COMMENT ON COLUMN equipment_distributions.distribution_photo_url IS 'URL foto bukti serah terima perlengkapan kepada jamaah (S3 atau storage URL)';
COMMENT ON COLUMN equipment_distributions.distribution_photo_uploaded_at IS 'Waktu foto bukti diunggah';
COMMENT ON COLUMN equipment_distributions.distribution_photo_uploaded_by IS 'User ID yang mengunggah foto bukti';
COMMENT ON FUNCTION update_distribution_photo IS 'Update foto bukti untuk satu distribusi perlengkapan';
COMMENT ON FUNCTION bulk_update_distribution_photos IS 'Update foto bukti untuk multiple distribusi perlengkapan sekaligus';
COMMENT ON FUNCTION get_distribution_with_photo IS 'Retrieve distribusi dengan detail foto bukti dan informasi uploader';
