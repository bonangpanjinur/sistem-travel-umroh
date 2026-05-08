-- ============================================================
-- Migration: Multi-Mahram + Rooming Enhancements
-- ============================================================

-- 1. Add relation_category to customer_mahrams
ALTER TABLE customer_mahrams
  ADD COLUMN IF NOT EXISTS relation_category TEXT DEFAULT 'lainnya';

ALTER TABLE customer_mahrams
  DROP CONSTRAINT IF EXISTS customer_mahrams_relation_category_check;

ALTER TABLE customer_mahrams
  ADD CONSTRAINT customer_mahrams_relation_category_check
    CHECK (relation_category IN ('suami','istri','anak','ayah','ibu','saudara','kakek','nenek','cucu','lainnya'));

COMMENT ON TABLE customer_mahrams IS
  'Multi-mahram: setiap jamaah bisa punya banyak mahram (suami, istri, anak, ayah, ibu, dll)';
COMMENT ON COLUMN customer_mahrams.relation_category IS
  'suami | istri | anak | ayah | ibu | saudara | kakek | nenek | cucu | lainnya';

-- 2. Add family_group_id to booking_passengers (for family room grouping)
ALTER TABLE booking_passengers
  ADD COLUMN IF NOT EXISTS family_group_id UUID;

CREATE INDEX IF NOT EXISTS idx_booking_passengers_family_group
  ON booking_passengers(family_group_id)
  WHERE family_group_id IS NOT NULL;

COMMENT ON COLUMN booking_passengers.family_group_id IS
  'UUID yang mengelompokkan anggota keluarga agar lebih mudah ditempatkan satu kamar';

-- 3. Add mahram_validated to room_occupants
ALTER TABLE room_occupants
  ADD COLUMN IF NOT EXISTS mahram_validated BOOLEAN DEFAULT false;

COMMENT ON COLUMN room_occupants.mahram_validated IS
  'Apakah kompatibilitas mahram sudah dikonfirmasi oleh admin';

-- 4. Create permissions_list if not exists
CREATE TABLE IF NOT EXISTS permissions_list (
  id          UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
  key         TEXT      UNIQUE NOT NULL,
  label       TEXT      NOT NULL,
  group_name  TEXT      NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- 5. Create role_permissions if not exists
CREATE TABLE IF NOT EXISTS role_permissions (
  id             UUID      DEFAULT gen_random_uuid() PRIMARY KEY,
  role           TEXT      NOT NULL,
  permission_key TEXT      NOT NULL,
  is_enabled     BOOLEAN   DEFAULT true,
  created_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, permission_key)
);

-- 6. RLS for permissions_list
ALTER TABLE permissions_list ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_permissions_list" ON permissions_list;
CREATE POLICY "staff_read_permissions_list" ON permissions_list
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_manage_permissions_list" ON permissions_list;
CREATE POLICY "admin_manage_permissions_list" ON permissions_list
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner')
    )
  );

-- 7. RLS for role_permissions
ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_role_permissions" ON role_permissions;
CREATE POLICY "staff_read_role_permissions" ON role_permissions
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "admin_manage_role_permissions" ON role_permissions;
CREATE POLICY "admin_manage_role_permissions" ON role_permissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner')
    )
  );

-- 8. Seed permissions_list from registry (re-runnable)
-- Run this after applying the above to populate the permission list
INSERT INTO permissions_list (key, label, group_name, description) VALUES
  ('dashboard','Dashboard','Overview','Halaman utama dashboard'),
  ('analytics','Analytics','Overview','Laporan analitik'),
  ('leads','Leads & Prospek','Penjualan','Manajemen lead calon jamaah'),
  ('bookings','Booking','Penjualan','Manajemen pemesanan paket'),
  ('packages','Paket Umroh & Haji','Penjualan','Manajemen paket wisata'),
  ('package-types','Tipe Paket','Penjualan','Jenis-jenis paket'),
  ('coupons','Kupon & Promo','Penjualan','Kode diskon & promosi'),
  ('announcements','Pengumuman','Konten & Marketing','Pengumuman ke jamaah'),
  ('banners','Banner Carousel','Konten & Marketing','Banner halaman depan'),
  ('landing-pages','Landing Page','Konten & Marketing','Halaman pendaratan'),
  ('marketing-materials','Materi Marketing','Konten & Marketing','Brosur & materi digital'),
  ('whatsapp','WhatsApp Blast','Konten & Marketing','Pengiriman WA massal'),
  ('departures','Jadwal Keberangkatan','Keberangkatan','Manajemen jadwal keberangkatan'),
  ('room-assignments','Kamar & Rooming','Keberangkatan','Penempatan kamar jamaah'),
  ('haji','Manajemen Haji','Keberangkatan','Fitur khusus haji'),
  ('manasik','Manasik','Keberangkatan','Jadwal dan materi manasik'),
  ('itinerary-templates','Template Itinerary','Keberangkatan','Template jadwal perjalanan'),
  ('equipment','Perlengkapan','Keberangkatan','Distribusi perlengkapan jamaah'),
  ('payments','Pembayaran','Keuangan','Verifikasi & rekap pembayaran'),
  ('finance-cash','Kas & Bank','Keuangan','Manajemen kas dan rekening'),
  ('finance-ar','Piutang (AR)','Keuangan','Accounts receivable'),
  ('finance-ap','Hutang (AP)','Keuangan','Accounts payable'),
  ('finance','Laporan P&L','Keuangan','Laporan laba rugi'),
  ('savings','Program Tabungan','Keuangan','Tabungan umroh'),
  ('reports','Laporan','Keuangan','Laporan keuangan'),
  ('advanced-reports','Laporan Lanjutan','Keuangan','Analitik lanjutan'),
  ('scheduled-reports','Laporan Terjadwal','Keuangan','Laporan otomatis'),
  ('customers','Data Jamaah','Jamaah & Agen','Profil & data jamaah'),
  ('agents','Agen','Jamaah & Agen','Mitra agen'),
  ('branches','Cabang','Jamaah & Agen','Kantor cabang'),
  ('loyalty','Program Loyalitas','Jamaah & Agen','Poin & reward jamaah'),
  ('referrals','Referral','Jamaah & Agen','Program referral'),
  ('visa','Visa','Jamaah & Agen','Proses visa jamaah'),
  ('hr','SDM / HR','SDM','Manajemen sumber daya manusia'),
  ('payroll','Penggajian','SDM','Gaji dan tunjangan staf'),
  ('document-verification','Verifikasi Dokumen','Dokumen','Verifikasi dokumen jamaah'),
  ('document-types','Jenis Dokumen','Dokumen','Konfigurasi jenis dokumen'),
  ('documents-generator','Generator Surat','Dokumen','Cetak surat & dokumen'),
  ('offline-content','Konten Offline','Dokumen','Konten untuk jamaah offline'),
  ('support','Tiket Support','Dokumen','Layanan dukungan pelanggan'),
  ('hotels','Hotel','Master Data','Data hotel mitra'),
  ('airlines','Maskapai','Master Data','Data maskapai penerbangan'),
  ('airports','Bandara','Master Data','Data bandara'),
  ('vendors','Vendor','Master Data','Data vendor & supplier'),
  ('muthawifs','Muthawif','Master Data','Data muthawif/guide'),
  ('bus-providers','Penyedia Bus','Master Data','Data penyedia transportasi'),
  ('master-data','Master Data Lainnya','Master Data','Data referensi lainnya'),
  ('users','Manajemen User','Pengaturan','Akun dan akses staf'),
  ('roles','Manajemen Role','Pengaturan','Hak akses per role'),
  ('dashboard-access','Akses Dashboard','Pengaturan','Konfigurasi akses dashboard'),
  ('rbac-tools','RBAC Tools','Pengaturan','Alat manajemen akses'),
  ('rbac-status','Status RBAC','Pengaturan','Status sistem RBAC'),
  ('security-audit','Audit Keamanan','Pengaturan','Log dan audit keamanan'),
  ('2fa','Pengaturan 2FA','Pengaturan','Autentikasi dua faktor'),
  ('appearance','Tampilan & Tema','Pengaturan','Desain dan branding aplikasi'),
  ('settings','Pengaturan Umum','Pengaturan','Konfigurasi sistem'),
  ('api-connect','API Connect ke Apps','Pengaturan','Integrasi API eksternal'),
  ('supabase-setup','Panduan Setup Supabase','Pengaturan','Konfigurasi database')
ON CONFLICT (key) DO UPDATE
  SET label = EXCLUDED.label,
      group_name = EXCLUDED.group_name,
      description = EXCLUDED.description;
