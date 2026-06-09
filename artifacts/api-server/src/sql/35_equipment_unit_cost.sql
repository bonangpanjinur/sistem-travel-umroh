-- Migration 035: Add unit_cost to equipment_items
-- Untuk keperluan kalkulasi HPP perlengkapan per keberangkatan

ALTER TABLE equipment_items
  ADD COLUMN IF NOT EXISTS unit_cost INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN equipment_items.unit_cost IS 'Harga satuan perlengkapan (IDR). Digunakan untuk kalkulasi biaya di HPP departure.';
