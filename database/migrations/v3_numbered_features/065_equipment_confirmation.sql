-- ─── Migration 065: Equipment confirmation by jamaah (E3) ────────────────────
-- Jamaah can confirm receipt of equipment; admin can track who confirmed.

-- ─── 1. Add confirmation columns to equipment_distributions ──────────────────
ALTER TABLE equipment_distributions
  ADD COLUMN IF NOT EXISTS confirmed_by_jamaah     BOOLEAN   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS confirmed_at            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS confirmed_by_admin_id   UUID REFERENCES auth.users(id);

-- ─── 2. Index for quick lookup ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_equipment_dist_confirmed
  ON equipment_distributions (departure_id, confirmed_by_jamaah)
  WHERE status = 'distributed';

-- ─── 3. Function: bulk confirm all distributed for a departure ────────────────
CREATE OR REPLACE FUNCTION bulk_confirm_equipment_departure(
  p_departure_id UUID,
  p_admin_id     UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE equipment_distributions
  SET
    confirmed_by_jamaah   = TRUE,
    confirmed_at          = NOW(),
    confirmed_by_admin_id = p_admin_id
  WHERE
    departure_id        = p_departure_id
    AND status          = 'distributed'
    AND confirmed_by_jamaah = FALSE;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION bulk_confirm_equipment_departure(UUID, UUID) TO authenticated;

-- ─── 4. Function: confirm single distribution ─────────────────────────────────
CREATE OR REPLACE FUNCTION confirm_equipment_receipt(
  p_distribution_id UUID,
  p_admin_id        UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE equipment_distributions
  SET
    confirmed_by_jamaah   = TRUE,
    confirmed_at          = NOW(),
    confirmed_by_admin_id = p_admin_id
  WHERE
    id     = p_distribution_id
    AND status = 'distributed';

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION confirm_equipment_receipt(UUID, UUID) TO authenticated;

COMMENT ON COLUMN equipment_distributions.confirmed_by_jamaah IS 'TRUE jika jamaah/admin sudah konfirmasi terima perlengkapan';
COMMENT ON COLUMN equipment_distributions.confirmed_at IS 'Waktu konfirmasi penerimaan';
