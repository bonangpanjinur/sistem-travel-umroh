-- E7: Foto bukti distribusi perlengkapan
ALTER TABLE equipment_distributions
  ADD COLUMN IF NOT EXISTS distribution_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS distribution_photo_uploaded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS distribution_photo_uploaded_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_equip_dist_with_photo
  ON equipment_distributions (departure_id, distribution_photo_url)
  WHERE distribution_photo_url IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_equip_dist_photo_uploader
  ON equipment_distributions (distribution_photo_uploaded_by, distribution_photo_uploaded_at DESC)
  WHERE distribution_photo_url IS NOT NULL;

CREATE OR REPLACE FUNCTION update_distribution_photo(
  p_distribution_id UUID,
  p_photo_url TEXT,
  p_uploader_id UUID DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE equipment_distributions SET
    distribution_photo_url = p_photo_url,
    distribution_photo_uploaded_at = NOW(),
    distribution_photo_uploaded_by = COALESCE(p_uploader_id, auth.uid())
  WHERE id = p_distribution_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_distribution_with_photo(p_distribution_id UUID)
RETURNS TABLE (
  id UUID, customer_id UUID, departure_id UUID, equipment_item_id UUID,
  quantity INTEGER, distributed_at TIMESTAMPTZ, distributed_by UUID,
  is_confirmed BOOLEAN, confirmed_at TIMESTAMPTZ,
  distribution_photo_url TEXT, distribution_photo_uploaded_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
    SELECT d.id, d.customer_id, d.departure_id, d.equipment_item_id,
           d.quantity, d.distributed_at, d.distributed_by,
           d.is_confirmed, d.confirmed_at,
           d.distribution_photo_url, d.distribution_photo_uploaded_at
    FROM equipment_distributions d
    WHERE d.id = p_distribution_id;
END;
$$;
