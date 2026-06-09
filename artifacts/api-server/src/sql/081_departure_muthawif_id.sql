-- ============================================================
-- Migration 081: Tambah kolom muthawif_id ke departures
-- Diperlukan oleh trigger A5 (fn_auto_guide_channel_on_muthawif_assign)
-- yang gagal di migration 080 karena kolom belum ada.
-- ============================================================

-- Tambah kolom muthawif_id ke departures
ALTER TABLE departures
  ADD COLUMN IF NOT EXISTS muthawif_id UUID REFERENCES muthawifs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_departures_muthawif_id
  ON departures(muthawif_id)
  WHERE muthawif_id IS NOT NULL;

COMMENT ON COLUMN departures.muthawif_id IS 'Muthawif/pembimbing yang ditugaskan untuk keberangkatan ini. Saat diisi, trigger A5 otomatis membuat guide channel.';

-- Pasang ulang trigger A5 (function sudah dibuat di migration 080)
DROP TRIGGER IF EXISTS trg_auto_guide_channel_on_muthawif_assign ON departures;
CREATE TRIGGER trg_auto_guide_channel_on_muthawif_assign
  AFTER UPDATE OF muthawif_id ON departures
  FOR EACH ROW EXECUTE FUNCTION fn_auto_guide_channel_on_muthawif_assign();

COMMENT ON TRIGGER trg_auto_guide_channel_on_muthawif_assign ON departures IS
  'Sprint A5: Saat muthawif_id diisi/diubah, otomatis buat guide_channel "Seluruh Rombongan" untuk keberangkatan ini.';
