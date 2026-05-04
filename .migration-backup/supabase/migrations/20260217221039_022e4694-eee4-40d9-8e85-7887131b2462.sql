
-- ============================================
-- BLOK 2: White Label & Website Publik
-- ============================================

-- 1. Tabel static_pages untuk FAQ, Terms, Privacy, dll
CREATE TABLE public.static_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  meta_title TEXT,
  meta_description TEXT,
  is_published BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.static_pages ENABLE ROW LEVEL SECURITY;

-- Public can read published pages
CREATE POLICY "Published static pages are viewable by everyone"
  ON public.static_pages FOR SELECT
  USING (is_published = true);

-- Admins can manage all static pages
CREATE POLICY "Admins can manage static pages"
  ON public.static_pages FOR ALL
  USING (public.is_admin(auth.uid()));

-- 2. Tabel testimonials
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  package_name TEXT,
  content TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  photo_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Public can read published testimonials
CREATE POLICY "Published testimonials are viewable by everyone"
  ON public.testimonials FOR SELECT
  USING (is_published = true);

-- Admins can manage all testimonials
CREATE POLICY "Admins can manage testimonials"
  ON public.testimonials FOR ALL
  USING (public.is_admin(auth.uid()));

-- 3. Tambah kolom nav_links dan footer_links di website_settings
ALTER TABLE public.website_settings 
  ADD COLUMN IF NOT EXISTS nav_links JSONB DEFAULT '[
    {"href": "/", "label": "Beranda"},
    {"href": "/packages", "label": "Paket Umroh"},
    {"href": "/departures", "label": "Jadwal"},
    {"href": "/savings", "label": "Tabungan"},
    {"href": "/about", "label": "Tentang Kami"},
    {"href": "/contact", "label": "Hubungi Kami"}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS footer_links JSONB DEFAULT '{
    "layanan": [
      {"href": "/packages", "label": "Paket Umroh"},
      {"href": "/departures", "label": "Jadwal Keberangkatan"},
      {"href": "/savings", "label": "Tabungan Umroh"}
    ],
    "informasi": [
      {"href": "/about", "label": "Tentang Kami"},
      {"href": "/faq", "label": "FAQ"},
      {"href": "/terms", "label": "Syarat & Ketentuan"},
      {"href": "/privacy", "label": "Kebijakan Privasi"}
    ],
    "panduan": [
      {"href": "/contact", "label": "Hubungi Kami"}
    ]
  }'::jsonb,
  ADD COLUMN IF NOT EXISTS footer_description TEXT DEFAULT 'Melayani perjalanan ibadah Umroh dan Haji dengan pengalaman bertahun-tahun. Kami berkomitmen memberikan pengalaman ibadah yang nyaman, aman, dan penuh keberkahan.',
  ADD COLUMN IF NOT EXISTS footer_bottom_text TEXT DEFAULT 'Izin Resmi Kemenag RI';

-- 4. Insert default static pages
INSERT INTO public.static_pages (slug, title, content, is_published, sort_order) VALUES
('faq', 'Pertanyaan yang Sering Diajukan', '## Bagaimana cara mendaftar umroh?

Anda dapat mendaftar melalui website kami di halaman Paket Umroh, kemudian pilih paket yang sesuai dan ikuti langkah pendaftaran.

## Apa saja persyaratan umroh?

1. Paspor yang masih berlaku minimal 7 bulan
2. Pas foto terbaru ukuran 4x6
3. Surat keterangan sehat dari dokter
4. Bukti vaksinasi meningitis

## Berapa lama proses visa umroh?

Proses visa umroh biasanya memakan waktu 5-7 hari kerja setelah semua dokumen lengkap.

## Apakah bisa membayar secara cicilan?

Ya, kami menyediakan program tabungan umroh yang memungkinkan Anda menabung secara bertahap sebelum keberangkatan.

## Bagaimana jika ingin membatalkan?

Pembatalan dapat dilakukan dengan syarat dan ketentuan yang berlaku. Silakan hubungi customer service kami untuk informasi lebih lanjut.', true, 1),

('terms', 'Syarat & Ketentuan', '## Syarat & Ketentuan Layanan

### 1. Ketentuan Umum
Dengan menggunakan layanan kami, Anda menyetujui syarat dan ketentuan yang berlaku.

### 2. Pendaftaran
- Calon jamaah wajib mengisi formulir pendaftaran dengan data yang benar
- Pembayaran DP dilakukan paling lambat 3 hari setelah pendaftaran
- Pelunasan dilakukan paling lambat 30 hari sebelum keberangkatan

### 3. Pembatalan
- Pembatalan lebih dari 30 hari sebelum keberangkatan: pengembalian 75%
- Pembatalan 15-30 hari sebelum keberangkatan: pengembalian 50%
- Pembatalan kurang dari 15 hari: tidak ada pengembalian

### 4. Tanggung Jawab
Kami bertanggung jawab atas pelayanan sesuai paket yang dipilih. Perubahan jadwal penerbangan di luar kendali kami.', true, 2),

('privacy', 'Kebijakan Privasi', '## Kebijakan Privasi

### Pengumpulan Data
Kami mengumpulkan data pribadi yang diperlukan untuk proses pendaftaran dan pelayanan umroh/haji, termasuk:
- Nama lengkap, alamat, dan kontak
- Data paspor dan dokumen perjalanan
- Informasi kesehatan yang relevan

### Penggunaan Data
Data Anda digunakan untuk:
- Proses pendaftaran dan pembuatan visa
- Komunikasi terkait perjalanan
- Peningkatan layanan kami

### Keamanan Data
Kami menggunakan enkripsi dan langkah-langkah keamanan untuk melindungi data pribadi Anda.

### Hak Anda
Anda berhak mengakses, memperbarui, atau menghapus data pribadi Anda dengan menghubungi kami.', true, 3);

-- 5. Insert default testimonials
INSERT INTO public.testimonials (name, location, package_name, content, rating, is_featured, sort_order) VALUES
('Haji Ahmad Fauzi', 'Jakarta', 'Umroh Reguler 9 Hari', 'Alhamdulillah, perjalanan umroh bersama sangat nyaman. Hotel dekat Masjidil Haram, muthawif sangat baik dalam membimbing ibadah. Terima kasih atas pelayanan terbaiknya.', 5, true, 1),
('Ibu Siti Aminah', 'Surabaya', 'Umroh Plus Turki 12 Hari', 'MasyaAllah, pengalaman yang luar biasa! Selain beribadah di Tanah Suci, juga bisa mengunjungi Turki. Semua diatur dengan sangat baik dan profesional.', 5, true, 2),
('Bapak Ridwan', 'Bandung', 'Haji Plus ONH+ 2025', 'Sudah 2 kali berangkat bersama travel ini. Pelayanan konsisten baik, tidak pernah mengecewakan. Sangat direkomendasikan untuk keluarga dan kerabat.', 5, true, 3);

-- 6. Triggers for updated_at
CREATE TRIGGER update_static_pages_updated_at
  BEFORE UPDATE ON public.static_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
