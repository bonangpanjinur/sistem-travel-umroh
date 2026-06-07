-- SEO fields untuk tabel departures
-- Digunakan untuk meta title, meta description, dan slug URL per jadwal keberangkatan

ALTER TABLE public.departures
  ADD COLUMN IF NOT EXISTS meta_title        TEXT,
  ADD COLUMN IF NOT EXISTS meta_description  TEXT,
  ADD COLUMN IF NOT EXISTS slug              TEXT;

-- Constraint: slug hanya huruf kecil, angka, dan tanda -
ALTER TABLE public.departures
  ADD CONSTRAINT departures_slug_format
  CHECK (slug IS NULL OR slug ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$');

-- Unique slug per departure
CREATE UNIQUE INDEX IF NOT EXISTS departures_slug_unique
  ON public.departures (slug)
  WHERE slug IS NOT NULL;

-- Index untuk query SEO cepat
CREATE INDEX IF NOT EXISTS departures_meta_title_idx
  ON public.departures (meta_title)
  WHERE meta_title IS NOT NULL;

COMMENT ON COLUMN public.departures.meta_title IS 'Custom meta title untuk SEO halaman publik jadwal ini (maks 70 karakter). Jika kosong, sistem generate otomatis.';
COMMENT ON COLUMN public.departures.meta_description IS 'Custom meta description untuk SEO (maks 160 karakter). Jika kosong, sistem generate otomatis.';
COMMENT ON COLUMN public.departures.slug IS 'Slug URL unik untuk halaman publik jadwal ini, cth: umroh-reguler-januari-2025. Jika kosong, digunakan ID jadwal.';
