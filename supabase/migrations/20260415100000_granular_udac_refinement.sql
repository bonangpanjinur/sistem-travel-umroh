-- Granular UDAC Refinement
-- Adding more detailed permissions for Product and Operational menus

-- 1. Itinerary & Templates
INSERT INTO public.permissions_list (key, label, group_name, description) VALUES 
('itinerary.view', 'Lihat Itinerary', 'Paket & Keberangkatan', 'Melihat detail itinerary perjalanan'),
('itinerary.edit', 'Edit Itinerary', 'Paket & Keberangkatan', 'Mengubah detail itinerary perjalanan'),
('itinerary.template.manage', 'Kelola Template Itinerary', 'Paket & Keberangkatan', 'Mengelola master template itinerary')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, group_name = EXCLUDED.group_name, description = EXCLUDED.description;

-- 2. Pricing & Commission
INSERT INTO public.permissions_list (key, label, group_name, description) VALUES 
('packages.pricing.view', 'Lihat Harga & Komisi', 'Paket & Keberangkatan', 'Melihat detail harga dan struktur komisi'),
('packages.pricing.edit', 'Edit Harga & Komisi', 'Paket & Keberangkatan', 'Mengubah harga paket dan pengaturan komisi')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, group_name = EXCLUDED.group_name, description = EXCLUDED.description;

-- 3. Manifest & Visa (Detailed)
INSERT INTO public.permissions_list (key, label, group_name, description) VALUES 
('departures.manifest.view', 'Lihat Manifest', 'Operasional', 'Melihat manifest keberangkatan jamaah'),
('departures.manifest.edit', 'Edit Manifest', 'Operasional', 'Mengubah data manifest keberangkatan'),
('departures.manifest.export', 'Export Manifest', 'Operasional', 'Mengekspor manifest ke format Excel/PDF'),
('departures.visa.view', 'Lihat Status Visa', 'Operasional', 'Melihat status pengurusan visa jamaah'),
('departures.visa.edit', 'Update Status Visa', 'Operasional', 'Memperbarui status progress visa'),
('departures.visa.upload', 'Upload Dokumen Visa', 'Operasional', 'Mengunggah scan/copy visa yang sudah terbit')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, group_name = EXCLUDED.group_name, description = EXCLUDED.description;

-- 4. Room & Manasik
INSERT INTO public.permissions_list (key, label, group_name, description) VALUES 
('operational.rooms.view', 'Lihat Room List', 'Operasional', 'Melihat penempatan kamar hotel'),
('operational.rooms.manage', 'Atur Room List', 'Operasional', 'Mengatur pembagian kamar jamaah di hotel'),
('operational.manasik.view', 'Lihat Jadwal Manasik', 'Operasional', 'Melihat jadwal dan lokasi manasik'),
('operational.manasik.manage', 'Kelola Manasik', 'Operasional', 'Mengatur jadwal, lokasi, dan pembicara manasik')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, group_name = EXCLUDED.group_name, description = EXCLUDED.description;

-- 5. Equipment (Detailed)
INSERT INTO public.permissions_list (key, label, group_name, description) VALUES 
('equipment.view', 'Lihat Perlengkapan', 'Perlengkapan', 'Melihat daftar dan stok perlengkapan'),
('equipment.stock.edit', 'Update Stok', 'Perlengkapan', 'Menambah atau menyesuaikan stok perlengkapan'),
('equipment.distribution.view', 'Lihat Serah Terima', 'Perlengkapan', 'Melihat riwayat distribusi perlengkapan ke jamaah'),
('equipment.distribution.create', 'Catat Serah Terima', 'Perlengkapan', 'Mencatat pengambilan perlengkapan oleh jamaah')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, group_name = EXCLUDED.group_name, description = EXCLUDED.description;

-- 6. Booking & Documents
INSERT INTO public.permissions_list (key, label, group_name, description) VALUES 
('bookings.payment.view', 'Lihat Status Bayar', 'Booking & Jamaah', 'Melihat rincian pembayaran booking'),
('bookings.payment.confirm', 'Konfirmasi Bayar', 'Booking & Jamaah', 'Melakukan konfirmasi pembayaran manual'),
('bookings.document.view', 'Lihat Dokumen Jamaah', 'Booking & Jamaah', 'Melihat scan KTP, Paspor, dan dokumen lainnya'),
('bookings.document.verify', 'Verifikasi Dokumen', 'Booking & Jamaah', 'Melakukan validasi dokumen persyaratan jamaah')
ON CONFLICT (key) DO UPDATE SET label = EXCLUDED.label, group_name = EXCLUDED.group_name, description = EXCLUDED.description;

-- Assign these new permissions to super_admin and owner by default
DO $$
DECLARE
    new_perm RECORD;
    admin_role TEXT;
BEGIN
    FOR admin_role IN SELECT unnest(ARRAY['super_admin', 'owner']) LOOP
        FOR new_perm IN SELECT key FROM public.permissions_list WHERE key IN (
            'itinerary.view', 'itinerary.edit', 'itinerary.template.manage',
            'packages.pricing.view', 'packages.pricing.edit',
            'departures.manifest.view', 'departures.manifest.edit', 'departures.manifest.export',
            'departures.visa.view', 'departures.visa.edit', 'departures.visa.upload',
            'operational.rooms.view', 'operational.rooms.manage',
            'operational.manasik.view', 'operational.manasik.manage',
            'equipment.view', 'equipment.stock.edit', 'equipment.distribution.view', 'equipment.distribution.create',
            'bookings.payment.view', 'bookings.payment.confirm', 'bookings.document.view', 'bookings.document.verify'
        ) LOOP
            INSERT INTO public.role_permissions (role, permission_key, is_enabled)
            VALUES (admin_role, new_perm.key, true)
            ON CONFLICT (role, permission_key) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
