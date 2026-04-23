
-- Seed jenis dokumen master untuk jamaah (Idempotent via ON CONFLICT)
INSERT INTO public.document_types (code, name, description, is_required) VALUES
  ('ktp', 'KTP', 'Kartu Tanda Penduduk - wajib untuk semua jamaah', true),
  ('passport', 'Paspor', 'Paspor dengan masa berlaku minimal 6 bulan dari tanggal keberangkatan', true),
  ('photo', 'Pas Foto', 'Pas foto terbaru background putih ukuran 4x6', true),
  ('vaccine_meningitis', 'Sertifikat Vaksin Meningitis', 'Sertifikat vaksinasi meningitis (ICV) - wajib untuk umroh/haji', true),
  ('vaccine_covid', 'Sertifikat Vaksin COVID-19', 'Sertifikat vaksinasi COVID-19', false),
  ('kk', 'Kartu Keluarga', 'Kartu Keluarga (KK)', false),
  ('marriage_book', 'Buku Nikah', 'Buku Nikah (untuk pasangan suami-istri)', false),
  ('birth_certificate', 'Akta Kelahiran', 'Akta kelahiran (untuk anak/bayi)', false),
  ('mahram_letter', 'Surat Mahram', 'Surat keterangan hubungan mahram', false)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_required = EXCLUDED.is_required;
