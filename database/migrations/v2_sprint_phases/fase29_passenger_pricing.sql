-- fase29: Harga per tipe penumpang (Dewasa / Anak / Balita)
-- Menambahkan price_adult yang sebelumnya tidak ada di departures,
-- serta kolom persentase sebagai fallback kalkulasi otomatis.

-- Departures: tambah price_adult (sebelumnya belum ada) + persentase helper
ALTER TABLE departures
  ADD COLUMN IF NOT EXISTS price_adult  numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS child_price_percent  numeric DEFAULT 75,
  ADD COLUMN IF NOT EXISTS infant_price_percent numeric DEFAULT 10;

-- Packages: default persentase untuk departure baru
ALTER TABLE packages
  ADD COLUMN IF NOT EXISTS child_price_percent  numeric DEFAULT 75,
  ADD COLUMN IF NOT EXISTS infant_price_percent numeric DEFAULT 10;

COMMENT ON COLUMN departures.price_adult  IS 'Harga per orang untuk dewasa (>12 th). Jika 0, gunakan harga kamar.';
COMMENT ON COLUMN departures.price_child  IS 'Harga per orang untuk anak (2-12 th). Jika 0, hitung dari child_price_percent.';
COMMENT ON COLUMN departures.price_infant IS 'Harga per orang untuk balita (<2 th). Jika 0, hitung dari infant_price_percent.';
COMMENT ON COLUMN departures.child_price_percent  IS 'Persentase harga anak dari harga kamar (default 75%).';
COMMENT ON COLUMN departures.infant_price_percent IS 'Persentase harga balita dari harga kamar (default 10%).';
COMMENT ON COLUMN packages.child_price_percent  IS 'Default persentase harga anak untuk departure baru (default 75%).';
COMMENT ON COLUMN packages.infant_price_percent IS 'Default persentase harga balita untuk departure baru (default 10%).';
