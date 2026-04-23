-- Add document and letterhead settings to company_settings
INSERT INTO public.company_settings (setting_key, setting_value, setting_type, description) VALUES
('company_city', '"Jakarta"', 'text', 'Kota perusahaan untuk tanda tangan dokumen'),
('company_website', '""', 'text', 'Website perusahaan'),
('letterhead_show_logo', 'true', 'boolean', 'Tampilkan logo di kop surat'),
('letterhead_show_website', 'true', 'boolean', 'Tampilkan website di kop surat'),
('invoice_number_prefix', '"INV"', 'text', 'Prefix nomor invoice (contoh: INV)'),
('invoice_number_format', '"YYYY-MM-{SEQ}"', 'text', 'Format nomor invoice (YYYY=tahun, MM=bulan, {SEQ}=nomor urut)'),
('invoice_show_bank_info', 'true', 'boolean', 'Tampilkan informasi bank di invoice'),
('invoice_show_notes_section', 'true', 'boolean', 'Tampilkan bagian catatan di invoice'),
('eticket_header_color', '"#16a34a"', 'text', 'Warna header e-ticket (format hex)'),
('certificate_border_color', '"#daa520"', 'text', 'Warna border sertifikat (format hex)'),
('certificate_text_color', '"#165634"', 'text', 'Warna teks judul sertifikat (format hex)'),
('document_footer_show_timestamp', 'true', 'boolean', 'Tampilkan waktu cetak di footer dokumen'),
('document_footer_show_page_number', 'true', 'boolean', 'Tampilkan nomor halaman di footer dokumen')
ON CONFLICT (setting_key) DO NOTHING;
