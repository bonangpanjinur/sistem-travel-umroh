-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 030: Seed Data — Admin User & System Defaults
--
-- PENTING:
--   File ini TIDAK membuat user auth.users secara langsung (itu via Supabase Auth API).
--   File ini menyiapkan:
--     1. Fungsi helper untuk create admin user dari aplikasi
--     2. Seed notification templates
--     3. Seed company_settings default
--     4. Seed WA templates default
--     5. Seed email templates default
--     6. Seed bank_accounts placeholder
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. NOTIFICATION_TEMPLATES seed
-- ---------------------------------------------------------------------------
INSERT INTO public.notification_templates (key, title, body, channel, variables)
VALUES
  ('booking_confirmed', 'Booking Dikonfirmasi',
    'Booking {{booking_code}} Anda telah dikonfirmasi. Selamat bergabung!',
    'in_app', '{"booking_code":"string","customer_name":"string"}'::JSONB),
  ('payment_received', 'Pembayaran Diterima',
    'Pembayaran Rp {{amount}} untuk booking {{booking_code}} berhasil diverifikasi.',
    'in_app', '{"amount":"number","booking_code":"string"}'::JSONB),
  ('payment_reminder', 'Pengingat Pembayaran',
    'Booking {{booking_code}} akan jatuh tempo pada {{due_date}}. Sisa: Rp {{remaining}}',
    'whatsapp', '{"booking_code":"string","due_date":"string","remaining":"number"}'::JSONB),
  ('departure_approaching', 'Keberangkatan Sebentar Lagi',
    'Keberangkatan Anda {{departure_date}} sudah dekat! Pastikan semua dokumen siap.',
    'push', '{"departure_date":"string"}'::JSONB),
  ('document_verified', 'Dokumen Diverifikasi',
    'Dokumen {{document_type}} Anda telah diverifikasi oleh tim kami.',
    'in_app', '{"document_type":"string"}'::JSONB),
  ('sos_alert', 'Alert SOS',
    '⚠️ Alert SOS dari jamaah {{customer_name}} pada keberangkatan {{departure_date}}',
    'in_app', '{"customer_name":"string","departure_date":"string"}'::JSONB),
  ('equipment_distributed', 'Perlengkapan Siap Diambil',
    'Perlengkapan Anda ({{items}}) sudah siap diambil di {{location}}.',
    'whatsapp', '{"items":"string","location":"string"}'::JSONB),
  ('commission_approved', 'Komisi Disetujui',
    'Komisi sebesar Rp {{amount}} untuk booking {{booking_code}} telah disetujui.',
    'in_app', '{"amount":"number","booking_code":"string"}'::JSONB),
  ('savings_deposit_verified', 'Setoran Tabungan Dikonfirmasi',
    'Setoran Rp {{amount}} berhasil dikonfirmasi. Total tabungan: Rp {{total}}',
    'whatsapp', '{"amount":"number","total":"number"}'::JSONB),
  ('welcome_new_user', 'Selamat Datang di Vinstour',
    'Halo {{full_name}}! Akun Anda berhasil dibuat. Selamat bergabung di Vinstour Travel.',
    'email', '{"full_name":"string"}'::JSONB)
ON CONFLICT (key) DO UPDATE SET
  title = EXCLUDED.title,
  body = EXCLUDED.body,
  variables = EXCLUDED.variables;

-- ---------------------------------------------------------------------------
-- 2. COMPANY_SETTINGS seed — Konfigurasi sistem default
-- ---------------------------------------------------------------------------
INSERT INTO public.company_settings (setting_key, setting_value, setting_type, description, is_public)
VALUES
  ('company_name',         '"Vinstour Travel"',           'string',  'Nama perusahaan',             TRUE),
  ('company_phone',        '"+62821-0000-0000"',          'string',  'Nomor telepon utama',         TRUE),
  ('company_email',        '"info@vinstour.com"',         'string',  'Email perusahaan',            TRUE),
  ('company_address',      '"Jakarta Selatan"',            'string',  'Alamat kantor utama',         TRUE),
  ('company_wa',           '"6282100000000"',             'string',  'Nomor WA bisnis (no +)',       TRUE),
  ('app_currency',         '"IDR"',                       'string',  'Mata uang default',           TRUE),
  ('app_locale',           '"id-ID"',                     'string',  'Locale aplikasi',             TRUE),
  ('app_timezone',         '"Asia/Jakarta"',              'string',  'Timezone default',            TRUE),
  ('booking_expiry_hours', '72',                          'number',  'Jam sebelum booking expired', FALSE),
  ('seat_lock_minutes',    '15',                          'number',  'Menit lock kursi saat booking',FALSE),
  ('max_pax_per_booking',  '10',                          'number',  'Maks penumpang per booking',  FALSE),
  ('commission_mode',      '"auto"',                      'string',  'Mode hitung komisi: auto/manual', FALSE),
  ('payment_gateway',      '"midtrans"',                  'string',  'Gateway pembayaran aktif',    FALSE),
  ('wa_enabled',           'false',                       'boolean', 'WhatsApp notifikasi aktif',   FALSE),
  ('push_enabled',         'false',                       'boolean', 'Push notification aktif',     FALSE),
  ('email_enabled',        'false',                       'boolean', 'Email notification aktif',    FALSE),
  ('maintenance_mode',     'false',                       'boolean', 'Mode maintenance website',    TRUE),
  ('haji_registration_open','false',                     'boolean', 'Pendaftaran haji terbuka',    TRUE),
  ('savings_program_active','true',                      'boolean', 'Program tabungan aktif',      TRUE),
  ('loyalty_points_rate',  '1000',                       'number',  'IDR per 1 poin loyalitas',    FALSE)
ON CONFLICT (setting_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. WA_TEMPLATES seed — Template pesan WhatsApp
-- ---------------------------------------------------------------------------
INSERT INTO public.wa_templates (name, category, language, body, variables, status)
VALUES
  ('booking_confirmation', 'utility', 'id',
    'Assalamu''alaikum *{{1}}*,\n\nBooking Anda berhasil!\n\n*Kode Booking:* {{2}}\n*Paket:* {{3}}\n*Tanggal:* {{4}}\n*Total:* Rp {{5}}\n\nTim Vinstour Travel',
    ARRAY['customer_name','booking_code','package_name','departure_date','total_price'], 'draft'),
  ('payment_reminder', 'utility', 'id',
    'Halo *{{1}}*,\n\nIngatkan bahwa booking {{2}} akan jatuh tempo pada *{{3}}*.\n\nSisa pembayaran: Rp *{{4}}*\n\nSilakan transfer ke rekening berikut:\n{{5}}\n\nTerima kasih.',
    ARRAY['customer_name','booking_code','due_date','remaining_amount','bank_info'], 'draft'),
  ('departure_reminder', 'utility', 'id',
    'Assalamu''alaikum *{{1}}*,\n\nKeberangkatan Anda *{{2}} hari lagi!*\n\n✈️ Jadwal: {{3}}\n🕐 Berkumpul: {{4}}\n📍 Lokasi: {{5}}\n\nPastikan semua dokumen siap ya!',
    ARRAY['customer_name','days_left','departure_date','meeting_time','meeting_location'], 'draft'),
  ('welcome_agent', 'utility', 'id',
    'Halo *{{1}}*,\n\nSelamat datang sebagai Agen Mitra Vinstour! 🎉\n\n*Kode Agen:* {{2}}\n*Link Referral:* {{3}}\n\nSalam sukses!',
    ARRAY['agent_name','agent_code','referral_link'], 'draft')
ON CONFLICT (name) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. EMAIL_TEMPLATES seed
-- ---------------------------------------------------------------------------
INSERT INTO public.email_templates (key, name, subject, body_html, variables)
VALUES
  ('booking_confirmed', 'Konfirmasi Booking', 'Booking Anda Dikonfirmasi - {{booking_code}}',
    '<h2>Booking Dikonfirmasi!</h2><p>Halo {{customer_name}},</p><p>Booking <strong>{{booking_code}}</strong> Anda telah berhasil dikonfirmasi.</p><p><strong>Detail:</strong><br>Paket: {{package_name}}<br>Keberangkatan: {{departure_date}}<br>Total: Rp {{total_price}}</p>',
    '{"booking_code":"string","customer_name":"string","package_name":"string","departure_date":"string","total_price":"number"}'::JSONB),
  ('payment_receipt', 'Bukti Pembayaran', 'Bukti Pembayaran - {{payment_code}}',
    '<h2>Pembayaran Diterima</h2><p>Halo {{customer_name}},</p><p>Pembayaran <strong>Rp {{amount}}</strong> untuk booking {{booking_code}} telah kami terima dan diverifikasi.</p>',
    '{"payment_code":"string","customer_name":"string","amount":"number","booking_code":"string"}'::JSONB),
  ('welcome', 'Selamat Datang', 'Selamat Datang di Vinstour Travel!',
    '<h2>Selamat Datang!</h2><p>Halo {{full_name}},</p><p>Akun Anda berhasil dibuat. Selamat bergabung di keluarga besar Vinstour Travel.</p>',
    '{"full_name":"string"}'::JSONB)
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. EQUIPMENT_SETTINGS singleton seed
-- ---------------------------------------------------------------------------
INSERT INTO public.equipment_settings (id, auto_distribute, notify_on_low_stock, low_stock_threshold)
VALUES ('00000000-0000-0000-0000-000000000004', FALSE, TRUE, 5)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. HR_SETTINGS singleton seed
-- ---------------------------------------------------------------------------
INSERT INTO public.hr_settings (id, work_days, work_start, work_end, annual_leave_quota, sick_leave_quota)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  ARRAY['monday','tuesday','wednesday','thursday','friday'],
  '08:00',
  '17:00',
  12,
  12
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 7. HERO_STATS seed — Statistik hero section website
-- ---------------------------------------------------------------------------
INSERT INTO public.hero_stats (label, value, icon, sort_order)
VALUES
  ('Tahun Berpengalaman', '10+',     'Award',    1),
  ('Jamaah Diberangkatkan', '5.000+', 'Users',   2),
  ('Paket Tersedia', '20+',          'Package',  3),
  ('Cabang',         '5',            'MapPin',   4)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- 8. ABOUT_PAGE_CONTENT singleton seed
-- ---------------------------------------------------------------------------
INSERT INTO public.about_page_content (id, hero_title, hero_subtitle, vision, mission)
VALUES (
  '00000000-0000-0000-0000-000000000005',
  'Tentang Vinstour Travel',
  'Mitra Perjalanan Umroh & Haji Anda',
  'Menjadi biro perjalanan ibadah terpercaya dan terdepan di Indonesia.',
  ARRAY[
    'Memberikan layanan haji dan umroh yang berkualitas dan amanah',
    'Memastikan setiap jamaah mendapatkan pengalaman ibadah terbaik',
    'Membangun kepercayaan melalui transparansi dan profesionalisme'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 9. DASHBOARD_ACCESS_CONFIG seed — Widget default per role
-- ---------------------------------------------------------------------------
INSERT INTO public.dashboard_access_config (role, widget_key, is_visible, sort_order)
VALUES
  -- Admin dashboard
  ('admin', 'booking_stats',       TRUE, 1),
  ('admin', 'payment_summary',     TRUE, 2),
  ('admin', 'departure_upcoming',  TRUE, 3),
  ('admin', 'lead_pipeline',       TRUE, 4),
  ('admin', 'agent_performance',   TRUE, 5),
  -- Finance dashboard
  ('finance', 'cashflow_chart',    TRUE, 1),
  ('finance', 'ar_summary',        TRUE, 2),
  ('finance', 'payroll_status',    TRUE, 3),
  ('finance', 'departure_profit',  TRUE, 4),
  -- Operational dashboard
  ('operational', 'departure_upcoming', TRUE, 1),
  ('operational', 'equipment_status',   TRUE, 2),
  ('operational', 'manifest_status',    TRUE, 3),
  ('operational', 'sos_alerts',         TRUE, 4),
  -- Branch Manager dashboard
  ('branch_manager', 'branch_bookings', TRUE, 1),
  ('branch_manager', 'branch_revenue',  TRUE, 2),
  ('branch_manager', 'employee_status', TRUE, 3)
ON CONFLICT (role, widget_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 10. Helper function: setup_superadmin
-- Digunakan satu kali saat inisialisasi sistem untuk assign role super_admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.setup_superadmin(p_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Cari user berdasarkan email di profiles
  SELECT id INTO v_user_id FROM public.profiles WHERE email = p_email;

  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', FALSE, 'error', 'User tidak ditemukan. Buat akun dulu via Supabase Auth.');
  END IF;

  -- Assign super_admin role
  INSERT INTO public.user_roles (user_id, role, granted_by, granted_at)
  VALUES (v_user_id, 'super_admin'::public.app_role, v_user_id, NOW())
  ON CONFLICT (user_id, role, branch_id) DO UPDATE
    SET is_active = TRUE, granted_at = NOW();

  RETURN jsonb_build_object(
    'success', TRUE,
    'user_id', v_user_id,
    'email', p_email,
    'role', 'super_admin',
    'message', 'Jalankan: SELECT public.setup_superadmin(''admin@vinstour.com''); di SQL Editor setelah buat akun.'
  );
END;
$$;

COMMENT ON FUNCTION public.setup_superadmin IS
  'Jalankan SEKALI di SQL Editor setelah buat akun pertama: '
  'SELECT public.setup_superadmin(''superadmin@vinstour.com'');';

-- ---------------------------------------------------------------------------
-- 11. Tambahkan trigger booking_status_history (jika belum ada)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.log_booking_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.booking_status_history
      (booking_id, from_status, to_status, changed_by, metadata)
    VALUES
      (NEW.id, OLD.status, NEW.status, auth.uid(),
       jsonb_build_object('payment_status', NEW.payment_status, 'paid_amount', NEW.paid_amount));
  END IF;
  RETURN NEW;
END;
$$;

-- Buat tabel booking_status_history jika belum ada
CREATE TABLE IF NOT EXISTS public.booking_status_history (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  from_status  TEXT,
  to_status    TEXT        NOT NULL,
  changed_by   UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reason       TEXT,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.booking_status_history ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking
  ON public.booking_status_history(booking_id, created_at DESC);

CREATE POLICY "booking_status_history_select"
  ON public.booking_status_history FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "booking_status_history_insert"
  ON public.booking_status_history FOR INSERT
  WITH CHECK (TRUE);

DROP TRIGGER IF EXISTS trg_booking_status_history ON public.bookings;
CREATE TRIGGER trg_booking_status_history
  AFTER UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.log_booking_status_change();

-- ---------------------------------------------------------------------------
-- FIN: Output konfirmasi
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  RAISE NOTICE '✅ Migration 030 selesai. Langkah selanjutnya:';
  RAISE NOTICE '   1. Buat akun admin di Supabase Auth / portal app';
  RAISE NOTICE '   2. Jalankan: SELECT public.setup_superadmin(''email-admin'');';
  RAISE NOTICE '   3. Login dan ganti password default';
END $$;
