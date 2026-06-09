-- Migration 036: Package view counter
-- Melacak jumlah kunjungan halaman publik per paket untuk analytics conversion rate

ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN packages.view_count IS 'Jumlah kunjungan halaman publik paket (incremented via RPC)';

-- RPC function to safely increment view_count (race-condition safe)
CREATE OR REPLACE FUNCTION increment_package_view_count(p_package_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE packages
     SET view_count = view_count + 1
   WHERE id = p_package_id;
END;
$$;
