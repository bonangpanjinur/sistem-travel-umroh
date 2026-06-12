-- =============================================================================
-- FILE 07 — Stored Functions, RPCs & Final Seed Data
-- Meliputi: semua function PostgreSQL, trigger functions, seed permissions,
--           seed menu_items, slug triggers, dan views
-- Jalankan TERAKHIR setelah semua file 01-06 berhasil dijalankan.
-- =============================================================================

-- =============================================================================
-- 1. GENERATE_BOOKING_CODE — Buat kode booking unik
-- =============================================================================
CREATE OR REPLACE FUNCTION generate_booking_code()
RETURNS TEXT AS $$
DECLARE v_code TEXT;
BEGIN
  LOOP
    v_code := 'VT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
              LPAD(FLOOR(RANDOM() * 99999 + 1)::TEXT, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM bookings WHERE booking_code = v_code);
  END LOOP;
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 2. GENERATE_STORE_ORDER_NUMBER — Buat nomor pesanan toko unik
-- =============================================================================
CREATE OR REPLACE FUNCTION generate_store_order_number()
RETURNS TEXT AS $$
DECLARE v_number TEXT;
BEGIN
  LOOP
    v_number := 'TK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
                LPAD(FLOOR(RANDOM() * 99999 + 1)::TEXT, 5, '0');
    EXIT WHEN NOT EXISTS (SELECT 1 FROM store_orders WHERE order_number = v_number);
  END LOOP;
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 3. HOLD_DEPARTURE_SEATS — Kurangi kursi tersedia saat booking dikonfirmasi
-- =============================================================================
CREATE OR REPLACE FUNCTION hold_departure_seats(p_departure_id UUID, p_seats INTEGER)
RETURNS BOOLEAN AS $$
DECLARE v_available INTEGER;
BEGIN
  SELECT available_seats INTO v_available FROM departures WHERE id = p_departure_id FOR UPDATE;
  IF v_available < p_seats THEN
    RETURN FALSE;
  END IF;
  UPDATE departures
  SET available_seats = available_seats - p_seats,
      status = CASE WHEN available_seats - p_seats <= 0 THEN 'full' ELSE status END
  WHERE id = p_departure_id;
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- 4. RELEASE_DEPARTURE_SEATS — Kembalikan kursi saat booking dibatalkan
-- =============================================================================
CREATE OR REPLACE FUNCTION release_departure_seats(p_departure_id UUID, p_seats INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE departures
  SET available_seats = LEAST(quota, available_seats + p_seats),
      status = CASE WHEN status = 'full' THEN 'open' ELSE status END
  WHERE id = p_departure_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- 5. DELETE_DEPARTURE_SAFELY — Hapus departure hanya jika tidak ada booking aktif
-- =============================================================================
CREATE OR REPLACE FUNCTION delete_departure_safely(p_departure_id UUID)
RETURNS JSONB AS $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM bookings
  WHERE departure_id = p_departure_id
    AND status NOT IN ('cancelled');

  IF v_count > 0 THEN
    RETURN jsonb_build_object('success', false,
      'message', 'Tidak dapat menghapus: terdapat ' || v_count || ' booking aktif');
  END IF;

  DELETE FROM departures WHERE id = p_departure_id;
  RETURN jsonb_build_object('success', true, 'message', 'Keberangkatan berhasil dihapus');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION delete_departure_safely(UUID) TO authenticated;


-- =============================================================================
-- 6. CONVERT_SAVINGS_TO_BOOKING — Konversi tabungan menjadi booking
-- =============================================================================
CREATE OR REPLACE FUNCTION convert_savings_to_booking(
  p_plan_id    UUID,
  p_departure_id UUID,
  p_room_type  TEXT DEFAULT 'quad'
)
RETURNS JSONB AS $$
DECLARE
  v_plan    savings_plans;
  v_customer customers;
  v_booking_code TEXT;
  v_booking_id   UUID;
BEGIN
  SELECT * INTO v_plan FROM savings_plans WHERE id = p_plan_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Tabungan tidak ditemukan');
  END IF;

  SELECT * INTO v_customer FROM customers WHERE id = v_plan.customer_id;

  v_booking_code := generate_booking_code();

  INSERT INTO bookings (
    customer_id, departure_id, booking_code, status,
    total_price, paid_amount, payment_status, room_type
  ) VALUES (
    v_plan.customer_id, p_departure_id, v_booking_code, 'pending',
    0, v_plan.current_amount, 'partial', p_room_type
  ) RETURNING id INTO v_booking_id;

  UPDATE savings_plans SET status = 'completed' WHERE id = p_plan_id;

  RETURN jsonb_build_object(
    'success', true,
    'booking_id', v_booking_id,
    'booking_code', v_booking_code
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION convert_savings_to_booking(UUID, UUID, TEXT) TO authenticated;


-- =============================================================================
-- 7. CREATE_CUSTOMER_ACCOUNT — Buat akun portal jamaah
-- =============================================================================
CREATE OR REPLACE FUNCTION create_customer_account(
  p_user_id     UUID,
  p_agent_id    UUID DEFAULT NULL,
  p_branch_id   UUID DEFAULT NULL,
  p_agent_slug  TEXT DEFAULT NULL,
  p_branch_slug TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE v_account_id UUID;
BEGIN
  INSERT INTO customer_accounts (
    user_id, referred_by_agent_id, referred_by_branch_id, agent_slug, branch_slug
  ) VALUES (
    p_user_id, p_agent_id, p_branch_id, p_agent_slug, p_branch_slug
  )
  ON CONFLICT (user_id) DO UPDATE SET
    referred_by_agent_id  = COALESCE(customer_accounts.referred_by_agent_id,  EXCLUDED.referred_by_agent_id),
    referred_by_branch_id = COALESCE(customer_accounts.referred_by_branch_id, EXCLUDED.referred_by_branch_id),
    agent_slug  = COALESCE(customer_accounts.agent_slug,  EXCLUDED.agent_slug),
    branch_slug = COALESCE(customer_accounts.branch_slug, EXCLUDED.branch_slug),
    updated_at  = now()
  RETURNING id INTO v_account_id;
  RETURN v_account_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- 8. INCREMENT_WEBSITE_VIEW — Tambah view count website agen/cabang
-- =============================================================================
CREATE OR REPLACE FUNCTION increment_website_view(
  p_agent_id  UUID DEFAULT NULL,
  p_branch_id UUID DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  IF p_agent_id IS NOT NULL THEN
    UPDATE website_settings
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE agent_id = p_agent_id;
  ELSIF p_branch_id IS NOT NULL THEN
    UPDATE website_settings
    SET view_count = COALESCE(view_count, 0) + 1
    WHERE branch_id = p_branch_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- =============================================================================
-- 9. GET_PUBLIC_BOOKING_DETAILS — Data booking publik tanpa data sensitif (fase26)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_public_booking_details(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result   JSONB;
  v_booking  RECORD;
  v_customer RECORD;
  v_departure RECORD;
  v_package  RECORD;
  v_phone_masked TEXT;
  v_remaining    NUMERIC;
  v_total_pax    INTEGER;
BEGIN
  SELECT b.id, b.booking_code, b.status AS booking_status, b.payment_status,
         b.total_price, b.paid_amount, b.room_type, b.created_at,
         b.customer_id, b.departure_id
  INTO v_booking
  FROM bookings b WHERE b.id = p_booking_id LIMIT 1;

  IF NOT FOUND THEN RETURN NULL; END IF;

  v_remaining := GREATEST(0, COALESCE(v_booking.total_price, 0) - COALESCE(v_booking.paid_amount, 0));

  SELECT c.full_name, c.phone INTO v_customer
  FROM customers c WHERE c.id = v_booking.customer_id LIMIT 1;

  IF v_customer.phone IS NOT NULL AND length(v_customer.phone) >= 4 THEN
    v_phone_masked := repeat('*', GREATEST(0, length(v_customer.phone) - 4))
                      || right(v_customer.phone, 4);
  ELSE
    v_phone_masked := v_customer.phone;
  END IF;

  SELECT COUNT(*)::INTEGER INTO v_total_pax
  FROM booking_passengers bp WHERE bp.booking_id = p_booking_id;
  IF v_total_pax IS NULL OR v_total_pax = 0 THEN v_total_pax := 1; END IF;

  IF v_booking.departure_id IS NOT NULL THEN
    SELECT d.departure_date, d.return_date, d.package_id INTO v_departure
    FROM departures d WHERE d.id = v_booking.departure_id LIMIT 1;
    IF FOUND AND v_departure.package_id IS NOT NULL THEN
      SELECT p.name, p.code INTO v_package
      FROM packages p WHERE p.id = v_departure.package_id LIMIT 1;
    END IF;
  END IF;

  v_result := jsonb_build_object(
    'id',               v_booking.id,
    'booking_code',     v_booking.booking_code,
    'booking_status',   v_booking.booking_status,
    'payment_status',   CASE v_booking.payment_status
                          WHEN 'unpaid'  THEN 'pending'
                          WHEN 'partial' THEN 'partial'
                          WHEN 'paid'    THEN 'paid'
                          ELSE v_booking.payment_status
                        END,
    'total_price',      COALESCE(v_booking.total_price, 0),
    'paid_amount',      COALESCE(v_booking.paid_amount, 0),
    'remaining_amount', v_remaining,
    'currency',         'IDR',
    'room_type',        COALESCE(v_booking.room_type, 'quad'),
    'total_pax',        v_total_pax,
    'created_at',       v_booking.created_at,
    'customer',         CASE WHEN v_customer IS NOT NULL THEN
                          jsonb_build_object(
                            'full_name',    COALESCE(v_customer.full_name, '—'),
                            'phone_masked', v_phone_masked
                          )
                        ELSE NULL END,
    'departure',        CASE WHEN v_departure IS NOT NULL THEN
                          jsonb_build_object(
                            'departure_date', v_departure.departure_date,
                            'return_date',    v_departure.return_date,
                            'package',        CASE WHEN v_package IS NOT NULL THEN
                                                jsonb_build_object(
                                                  'name', COALESCE(v_package.name, '—'),
                                                  'code', COALESCE(v_package.code, '—')
                                                )
                                              ELSE NULL END
                          )
                        ELSE NULL END
  );
  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION get_public_booking_details(UUID) TO anon, authenticated;


-- =============================================================================
-- 10. GET_WA_CONFIG_SAFE — Baca config WA tanpa api_key (fase31)
-- =============================================================================
CREATE OR REPLACE FUNCTION get_wa_config_safe()
RETURNS TABLE (
  id              UUID,
  provider        TEXT,
  display_name    TEXT,
  sender_number   TEXT,
  is_active       BOOLEAN,
  provider_config JSONB,
  api_key_set     BOOLEAN,
  api_key_hint    TEXT,
  last_tested_at  TIMESTAMPTZ,
  last_test_ok    BOOLEAN,
  updated_by      UUID,
  updated_at      TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
    SELECT
      wc.id,
      wc.provider,
      wc.display_name,
      wc.sender_number,
      wc.is_active,
      wc.provider_config - 'api_token' - 'token' - 'api_key' - 'access_token'
                         - 'auth_header' - 'webhook_secret'  AS provider_config,
      (wc.api_key IS NOT NULL AND wc.api_key <> '')          AS api_key_set,
      CASE
        WHEN wc.api_key IS NULL OR wc.api_key = '' THEN NULL
        ELSE '••••' || RIGHT(wc.api_key, 4)
      END                                                      AS api_key_hint,
      wc.last_tested_at,
      wc.last_test_ok,
      wc.updated_by,
      wc.updated_at
    FROM whatsapp_config wc;
END;
$$;

GRANT EXECUTE ON FUNCTION get_wa_config_safe() TO authenticated;


-- =============================================================================
-- 11. PREVIEW_AUTO_SCHEDULE_REMINDERS — Dry-run reminder pembayaran (fase30)
-- =============================================================================
CREATE OR REPLACE FUNCTION preview_auto_schedule_reminders(
  p_days_before INTEGER[] DEFAULT ARRAY[7, 3]
)
RETURNS TABLE (
  days_before      INTEGER,
  booking_id       UUID,
  booking_code     TEXT,
  full_name        TEXT,
  phone            TEXT,
  payment_deadline DATE,
  remaining_amount NUMERIC,
  already_exists   BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_day INTEGER;
BEGIN
  FOREACH v_day IN ARRAY p_days_before LOOP
    RETURN QUERY
      SELECT
        v_day                              AS days_before,
        b.id                               AS booking_id,
        b.booking_code                     AS booking_code,
        c.full_name                        AS full_name,
        c.phone                            AS phone,
        b.payment_deadline                 AS payment_deadline,
        b.remaining_amount                 AS remaining_amount,
        EXISTS (
          SELECT 1 FROM payment_deadline_reminders pdr
          WHERE pdr.booking_id = b.id
            AND pdr.days_before = v_day
            AND pdr.status IN ('pending','sent')
        )                                  AS already_exists
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.payment_status IN ('unpaid','partial')
        AND b.status NOT IN ('cancelled','completed')
        AND b.payment_deadline IS NOT NULL
        AND b.payment_deadline >= CURRENT_DATE
        AND b.payment_deadline <= CURRENT_DATE + (v_day || ' days')::INTERVAL
        AND c.phone IS NOT NULL
      ORDER BY b.payment_deadline ASC;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION preview_auto_schedule_reminders(INTEGER[]) TO authenticated;


-- =============================================================================
-- 12. AUTO_SCHEDULE_PAYMENT_REMINDERS — Jadwalkan reminder pembayaran (fase30)
-- =============================================================================
CREATE OR REPLACE FUNCTION auto_schedule_payment_reminders(
  p_days_before INTEGER[] DEFAULT ARRAY[7, 3]
)
RETURNS TABLE (created_count INTEGER, skipped_count INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_day      INTEGER;
  v_created  INTEGER := 0;
  v_skipped  INTEGER := 0;
  v_row      RECORD;
  v_inserted INTEGER;
BEGIN
  FOREACH v_day IN ARRAY p_days_before LOOP
    FOR v_row IN
      SELECT b.id AS booking_id, b.booking_code, b.payment_deadline,
             b.remaining_amount, c.phone, c.full_name
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      WHERE b.payment_status IN ('unpaid','partial')
        AND b.status NOT IN ('cancelled','completed')
        AND b.payment_deadline IS NOT NULL
        AND b.payment_deadline >= CURRENT_DATE
        AND b.payment_deadline <= CURRENT_DATE + (v_day || ' days')::INTERVAL
        AND c.phone IS NOT NULL
    LOOP
      INSERT INTO payment_deadline_reminders (
        booking_id, booking_code, phone, full_name,
        payment_deadline, remaining_amount, days_before, status
      ) VALUES (
        v_row.booking_id, v_row.booking_code, v_row.phone, v_row.full_name,
        v_row.payment_deadline, v_row.remaining_amount, v_day, 'pending'
      )
      ON CONFLICT (booking_id, days_before) DO UPDATE
        SET remaining_amount = EXCLUDED.remaining_amount,
            phone            = EXCLUDED.phone,
            full_name        = EXCLUDED.full_name,
            payment_deadline = EXCLUDED.payment_deadline,
            status           = CASE
                                 WHEN payment_deadline_reminders.status = 'cancelled'
                                 THEN 'pending'
                                 ELSE payment_deadline_reminders.status
                               END,
            updated_at = NOW()
        WHERE payment_deadline_reminders.status = 'cancelled';

      GET DIAGNOSTICS v_inserted = ROW_COUNT;

      IF v_inserted > 0 THEN
        v_created := v_created + 1;
      ELSE
        v_skipped := v_skipped + 1;
      END IF;
    END LOOP;
  END LOOP;
  RETURN QUERY SELECT v_created, v_skipped;
END;
$$;

GRANT EXECUTE ON FUNCTION auto_schedule_payment_reminders(INTEGER[]) TO authenticated;


-- =============================================================================
-- 13. RECALCULATE_DEPARTURE_FINANCIAL_SUMMARY (fase28)
-- =============================================================================
CREATE OR REPLACE FUNCTION recalculate_departure_financial_summary(p_departure_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_quota         INTEGER;
  v_pax_confirmed INTEGER;
  v_pax_cancelled INTEGER;
  v_rev_gross     NUMERIC;
  v_rev_paid      NUMERIC;
  v_rev_refunded  NUMERIC;
  v_hpp           NUMERIC;
  v_expense       NUMERIC;
  v_other_rev     NUMERIC;
BEGIN
  SELECT COALESCE(quota, 0) INTO v_quota FROM departures WHERE id = p_departure_id;

  SELECT
    COALESCE(SUM(CASE WHEN status IN ('confirmed','completed') THEN total_pax   ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status = 'cancelled'               THEN total_pax   ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status IN ('confirmed','completed') THEN total_price ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN status IN ('confirmed','completed') THEN paid_amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN payment_status = 'refunded'        THEN paid_amount ELSE 0 END), 0)
  INTO v_pax_confirmed, v_pax_cancelled, v_rev_gross, v_rev_paid, v_rev_refunded
  FROM bookings WHERE departure_id = p_departure_id;

  SELECT COALESCE(SUM(total_cost_idr), 0) INTO v_hpp
  FROM departure_cost_items WHERE departure_id = p_departure_id;

  SELECT COALESCE(SUM(amount_idr), 0) INTO v_expense
  FROM departure_expenses WHERE departure_id = p_departure_id;

  SELECT COALESCE(SUM(amount_idr), 0) INTO v_other_rev
  FROM departure_other_revenues WHERE departure_id = p_departure_id;

  INSERT INTO departure_financial_summary (
    departure_id, quota, pax_confirmed, pax_cancelled,
    revenue_gross, revenue_paid, revenue_outstanding, revenue_refunded,
    hpp_total, expense_total, other_revenue_total, last_calculated_at, updated_at
  ) VALUES (
    p_departure_id, v_quota, v_pax_confirmed, v_pax_cancelled,
    v_rev_gross, v_rev_paid, v_rev_gross - v_rev_paid, v_rev_refunded,
    v_hpp, v_expense, v_other_rev, NOW(), NOW()
  )
  ON CONFLICT (departure_id) DO UPDATE SET
    quota               = EXCLUDED.quota,
    pax_confirmed       = EXCLUDED.pax_confirmed,
    pax_cancelled       = EXCLUDED.pax_cancelled,
    revenue_gross       = EXCLUDED.revenue_gross,
    revenue_paid        = EXCLUDED.revenue_paid,
    revenue_outstanding = EXCLUDED.revenue_outstanding,
    revenue_refunded    = EXCLUDED.revenue_refunded,
    hpp_total           = EXCLUDED.hpp_total,
    expense_total       = EXCLUDED.expense_total,
    other_revenue_total = EXCLUDED.other_revenue_total,
    last_calculated_at  = NOW(),
    updated_at          = NOW();
END;
$$;


-- =============================================================================
-- 14. SLUG TRIGGERS — Auto-set slug untuk agen & cabang
-- =============================================================================
CREATE OR REPLACE FUNCTION set_agent_slug()
RETURNS TRIGGER AS $$
DECLARE base_slug TEXT; final_slug TEXT; counter INTEGER := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug  := slugify_text(COALESCE(NEW.company_name, NEW.agent_code, NEW.id::TEXT));
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM agents WHERE slug = final_slug AND id != NEW.id) LOOP
      final_slug := base_slug || '-' || counter; counter := counter + 1;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_slug ON agents;
CREATE TRIGGER trg_agent_slug
  BEFORE INSERT OR UPDATE ON agents
  FOR EACH ROW EXECUTE FUNCTION set_agent_slug();


CREATE OR REPLACE FUNCTION set_branch_slug()
RETURNS TRIGGER AS $$
DECLARE base_slug TEXT; final_slug TEXT; counter INTEGER := 1;
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    base_slug  := slugify_text(COALESCE(NEW.name, NEW.code, NEW.id::TEXT));
    final_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM branches WHERE slug = final_slug AND id != NEW.id) LOOP
      final_slug := base_slug || '-' || counter; counter := counter + 1;
    END LOOP;
    NEW.slug := final_slug;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_branch_slug ON branches;
CREATE TRIGGER trg_branch_slug
  BEFORE INSERT OR UPDATE ON branches
  FOR EACH ROW EXECUTE FUNCTION set_branch_slug();


-- =============================================================================
-- 15. SEED: PERMISSIONS_LIST
-- =============================================================================
INSERT INTO permissions_list (key, label, group_name, description) VALUES
  ('dashboard','Dashboard','Overview','Halaman utama dashboard'),
  ('analytics','Analytics','Overview','Laporan analitik'),
  ('leads','Leads & Prospek','Penjualan','Manajemen lead calon jamaah'),
  ('bookings','Booking','Penjualan','Manajemen pemesanan paket'),
  ('packages','Paket Umroh & Haji','Penjualan','Manajemen paket wisata'),
  ('coupons','Kupon & Promo','Penjualan','Kode diskon & promosi'),
  ('announcements','Pengumuman','Konten & Marketing','Pengumuman ke jamaah'),
  ('banners','Banner Carousel','Konten & Marketing','Banner halaman depan'),
  ('whatsapp','WhatsApp Blast','Konten & Marketing','Pengiriman WA massal'),
  ('wa-broadcast','WA Broadcast','Konten & Marketing','Broadcast WA tersegmentasi'),
  ('departures','Jadwal Keberangkatan','Keberangkatan','Manajemen jadwal keberangkatan'),
  ('room-assignments','Kamar & Rooming','Keberangkatan','Penempatan kamar jamaah'),
  ('manasik','Manasik','Keberangkatan','Jadwal dan materi manasik'),
  ('equipment','Perlengkapan','Keberangkatan','Distribusi perlengkapan jamaah'),
  ('payments','Pembayaran','Keuangan','Verifikasi & rekap pembayaran'),
  ('finance','Laporan P&L','Keuangan','Laporan laba rugi'),
  ('savings','Program Tabungan','Keuangan','Tabungan umroh'),
  ('reports','Laporan','Keuangan','Laporan keuangan'),
  ('customers','Data Jamaah','Jamaah & Agen','Profil & data jamaah'),
  ('agents','Agen','Jamaah & Agen','Mitra agen'),
  ('branches','Cabang','Jamaah & Agen','Kantor cabang'),
  ('visa','Visa','Jamaah & Agen','Proses visa jamaah'),
  ('hr','SDM / HR','SDM','Manajemen sumber daya manusia'),
  ('payroll','Penggajian','SDM','Gaji dan tunjangan staf'),
  ('hotels','Hotel','Master Data','Data hotel mitra'),
  ('airlines','Maskapai','Master Data','Data maskapai penerbangan'),
  ('vendors','Vendor','Master Data','Data vendor & supplier'),
  ('muthawifs','Muthawif','Master Data','Data muthawif/guide'),
  ('users','Manajemen User','Pengaturan','Akun dan akses staf'),
  ('roles','Manajemen Role','Pengaturan','Hak akses per role'),
  ('appearance','Tampilan & Tema','Pengaturan','Desain dan branding aplikasi'),
  ('settings','Pengaturan Umum','Pengaturan','Konfigurasi sistem'),
  ('store','Toko Online','Penjualan','Toko e-commerce'),
  ('store-products','Produk Toko','Penjualan','Manajemen produk toko'),
  ('store-orders','Pesanan Toko','Penjualan','Manajemen pesanan toko'),
  ('store-categories','Kategori Produk','Penjualan','Kategori produk toko'),
  ('finance-departure','HPP & Keuangan Keberangkatan','Keuangan','HPP, pengeluaran, pendapatan per keberangkatan'),
  ('wa-provider','WA Provider Config','Pengaturan','Konfigurasi provider WhatsApp')
ON CONFLICT (key) DO UPDATE SET
  label       = EXCLUDED.label,
  group_name  = EXCLUDED.group_name,
  description = EXCLUDED.description;


-- =============================================================================
-- 16. SEED: ROLE_PERMISSIONS
-- =============================================================================

-- super_admin & owner: semua akses
INSERT INTO role_permissions (role, permission_key)
SELECT r.role, p.key FROM (VALUES ('super_admin'),('owner')) AS r(role)
CROSS JOIN permissions_list p
ON CONFLICT DO NOTHING;

-- admin
INSERT INTO role_permissions (role, permission_key)
SELECT 'admin', p FROM (VALUES
  ('dashboard'),('analytics'),('leads'),('bookings'),('packages'),('coupons'),
  ('announcements'),('banners'),('whatsapp'),('wa-broadcast'),
  ('departures'),('room-assignments'),('manasik'),('equipment'),
  ('payments'),('finance'),('savings'),('reports'),
  ('customers'),('agents'),('branches'),('visa'),
  ('hr'),('payroll'),('hotels'),('airlines'),('vendors'),('muthawifs'),
  ('users'),('roles'),('appearance'),('settings'),
  ('store'),('store-products'),('store-orders'),('store-categories'),
  ('finance-departure')
) AS t(p)
ON CONFLICT DO NOTHING;

-- branch_manager
INSERT INTO role_permissions (role, permission_key)
SELECT 'branch_manager', p FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('packages'),('departures'),
  ('payments'),('reports'),('agents'),('leads'),('employees'),
  ('vendors'),('hotels'),('muthawifs'),('visa'),('manasik'),
  ('equipment'),('room-assignments'),('finance-departure')
) AS t(p)
ON CONFLICT DO NOTHING;

-- operational
INSERT INTO role_permissions (role, permission_key)
SELECT 'operational', p FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('departures'),
  ('vendors'),('hotels'),('muthawifs'),('visa'),('manasik'),
  ('equipment'),('room-assignments'),('whatsapp'),('wa-broadcast')
) AS t(p)
ON CONFLICT DO NOTHING;

-- finance
INSERT INTO role_permissions (role, permission_key)
SELECT 'finance', p FROM (VALUES
  ('dashboard'),('bookings'),('payments'),('reports'),('finance'),
  ('savings'),('finance-departure')
) AS t(p)
ON CONFLICT DO NOTHING;

-- sales
INSERT INTO role_permissions (role, permission_key)
SELECT 'sales', p FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('leads'),('agents'),('packages'),('coupons')
) AS t(p)
ON CONFLICT DO NOTHING;

-- marketing
INSERT INTO role_permissions (role, permission_key)
SELECT 'marketing', p FROM (VALUES
  ('dashboard'),('leads'),('packages'),('announcements'),('banners'),
  ('whatsapp'),('wa-broadcast'),('store'),('store-products'),('store-categories')
) AS t(p)
ON CONFLICT DO NOTHING;

-- hr
INSERT INTO role_permissions (role, permission_key)
SELECT 'hr', p FROM (VALUES
  ('dashboard'),('hr'),('payroll')
) AS t(p)
ON CONFLICT DO NOTHING;

-- agent
INSERT INTO role_permissions (role, permission_key)
SELECT 'agent', p FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('packages')
) AS t(p)
ON CONFLICT DO NOTHING;

-- sub_agent
INSERT INTO role_permissions (role, permission_key)
SELECT 'sub_agent', p FROM (VALUES ('packages'),('bookings')) AS t(p)
ON CONFLICT DO NOTHING;

-- visa_officer
INSERT INTO role_permissions (role, permission_key)
SELECT 'visa_officer', p FROM (VALUES
  ('dashboard'),('bookings'),('customers'),('visa')
) AS t(p)
ON CONFLICT DO NOTHING;

-- it
INSERT INTO role_permissions (role, permission_key)
SELECT 'it', p FROM (VALUES
  ('dashboard'),('settings'),('users'),('roles'),('whatsapp'),('wa-broadcast'),
  ('wa-provider')
) AS t(p)
ON CONFLICT DO NOTHING;


-- =============================================================================
-- 17. SEED: MENU_ITEMS
-- =============================================================================
INSERT INTO menu_items (key, label, path, icon, group_name, sort_order, required_permission, is_visible) VALUES
  ('dashboard',          'Dashboard',            '/admin',                      'LayoutDashboard',   'Overview',             10,  'dashboard',          true),
  ('analytics',          'Analytics',            '/admin/analytics',            'BarChart3',         'Overview',             20,  'analytics',          true),
  ('leads',              'Leads',                '/admin/leads',                'Users',             'Penjualan',            110, 'leads',              true),
  ('bookings',           'Booking',              '/admin/bookings',             'BookOpen',          'Penjualan',            120, 'bookings',           true),
  ('packages',           'Paket',                '/admin/packages',             'Package',           'Penjualan',            130, 'packages',           true),
  ('coupons',            'Kupon',                '/admin/coupons',              'Tag',               'Penjualan',            140, 'coupons',            true),
  ('store',              'Toko Online',          '/admin/store',                'ShoppingBag',       'Penjualan',            210, 'store',              true),
  ('store-products',     'Produk Toko',          '/admin/store/products',       'Package',           'Penjualan',            211, 'store-products',     true),
  ('store-orders',       'Pesanan Toko',         '/admin/store/orders',         'ShoppingCart',      'Penjualan',            212, 'store-orders',       true),
  ('store-categories',   'Kategori Produk',      '/admin/store/categories',     'Tag',               'Penjualan',            213, 'store-categories',   true),
  ('announcements',      'Pengumuman',           '/admin/announcements',        'Bell',              'Konten & Marketing',   310, 'announcements',      true),
  ('banners',            'Banner',               '/admin/banners',              'Image',             'Konten & Marketing',   320, 'banners',            true),
  ('whatsapp',           'WhatsApp Blast',       '/admin/whatsapp',             'MessageCircle',     'Konten & Marketing',   330, 'whatsapp',           true),
  ('wa-broadcast',       'WA Broadcast',         '/admin/whatsapp/broadcast',   'Send',              'Konten & Marketing',   340, 'wa-broadcast',       true),
  ('departures',         'Keberangkatan',        '/admin/departures',           'Plane',             'Keberangkatan',        410, 'departures',         true),
  ('room-assignments',   'Kamar & Rooming',      '/admin/room-assignments',     'Hotel',             'Keberangkatan',        420, 'room-assignments',   true),
  ('manasik',            'Manasik',              '/admin/manasik',              'BookOpen',          'Keberangkatan',        430, 'manasik',            true),
  ('equipment',          'Perlengkapan',         '/admin/equipment',            'Package2',          'Keberangkatan',        440, 'equipment',          true),
  ('payments',           'Pembayaran',           '/admin/payments',             'CreditCard',        'Keuangan',             510, 'payments',           true),
  ('finance',            'Laporan P&L',          '/admin/finance',              'TrendingUp',        'Keuangan',             520, 'finance',            true),
  ('finance-departure',  'HPP Keberangkatan',    '/admin/finance/departure',    'Calculator',        'Keuangan',             525, 'finance-departure',  true),
  ('savings',            'Program Tabungan',     '/admin/savings',              'PiggyBank',         'Keuangan',             530, 'savings',            true),
  ('reports',            'Laporan',              '/admin/reports',              'FileText',          'Keuangan',             540, 'reports',            true),
  ('customers',          'Data Jamaah',          '/admin/customers',            'Users',             'Jamaah & Agen',        610, 'customers',          true),
  ('agents',             'Agen',                 '/admin/agents',               'Handshake',         'Jamaah & Agen',        620, 'agents',             true),
  ('branches',           'Cabang',               '/admin/branches',             'Building2',         'Jamaah & Agen',        630, 'branches',           true),
  ('visa',               'Visa',                 '/admin/visa',                 'FileCheck',         'Jamaah & Agen',        640, 'visa',               true),
  ('hr',                 'SDM / HR',             '/admin/hr',                   'UserCheck',         'SDM',                  710, 'hr',                 true),
  ('payroll',            'Penggajian',            '/admin/payroll',              'Wallet',            'SDM',                  720, 'payroll',            true),
  ('hotels',             'Hotel',                '/admin/hotels',               'Hotel',             'Master Data',          810, 'hotels',             true),
  ('airlines',           'Maskapai',             '/admin/airlines',             'Plane',             'Master Data',          820, 'airlines',           true),
  ('vendors',            'Vendor',               '/admin/vendors',              'Building',          'Master Data',          830, 'vendors',            true),
  ('muthawifs',          'Muthawif',             '/admin/muthawifs',            'UserCircle',        'Master Data',          840, 'muthawifs',          true),
  ('users',              'Manajemen User',       '/admin/users',                'Users',             'Pengaturan',           910, 'users',              true),
  ('roles',              'Manajemen Role',       '/admin/roles',                'Shield',            'Pengaturan',           920, 'roles',              true),
  ('wa-provider',        'WA Provider',          '/admin/settings/wa-provider', 'Settings',          'Pengaturan',           930, 'wa-provider',        true),
  ('appearance',         'Tampilan & Tema',      '/admin/appearance',           'Palette',           'Pengaturan',           940, 'appearance',         true),
  ('settings',           'Pengaturan Umum',      '/admin/settings',             'Settings',          'Pengaturan',           950, 'settings',           true)
ON CONFLICT (key) DO UPDATE SET
  label               = EXCLUDED.label,
  path                = EXCLUDED.path,
  icon                = EXCLUDED.icon,
  group_name          = EXCLUDED.group_name,
  sort_order          = EXCLUDED.sort_order,
  required_permission = EXCLUDED.required_permission,
  is_visible          = EXCLUDED.is_visible;


-- =============================================================================
-- 18. AIRLINE SEED — Maskapai umum Indonesia & Timur Tengah
-- =============================================================================
INSERT INTO airlines (name, iata_code, is_active) VALUES
  ('Garuda Indonesia',     'GA',  true),
  ('Saudi Arabian Airlines','SV', true),
  ('Emirates',             'EK',  true),
  ('Qatar Airways',        'QR',  true),
  ('Etihad Airways',       'EY',  true),
  ('Turkish Airlines',     'TK',  true),
  ('Lion Air',             'JT',  true),
  ('Batik Air',            'ID',  true),
  ('Saudia',               'XY',  true),
  ('Flynas',               'F3',  true)
ON CONFLICT (iata_code) DO NOTHING;


-- =============================================================================
-- 19. UPDATE TRIGGER ON departure_financial_summary
-- =============================================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_departure_financial_summary_updated_at'
    AND tgrelid='departure_financial_summary'::regclass) THEN
    CREATE TRIGGER set_departure_financial_summary_updated_at
      BEFORE UPDATE ON departure_financial_summary
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;


-- =============================================================================
-- 20. RPC: CHECK EMAIL / PHONE AVAILABILITY (untuk form registrasi)
-- SECURITY DEFINER agar anon (belum login) bisa memanggil tanpa masalah RLS.
-- Mengembalikan TRUE jika nilai TERSEDIA (belum dipakai), FALSE jika sudah dipakai.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.check_email_available(p_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM customers
    WHERE lower(trim(email)) = lower(trim(p_email))
    LIMIT 1
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.check_phone_available(p_phone TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_normalised TEXT;
BEGIN
  -- Normalisasi: +628xx → 08xx, 628xx → 08xx, 08xx tetap
  v_normalised :=
    CASE
      WHEN p_phone LIKE '+62%' THEN '0' || substr(trim(p_phone), 4)
      WHEN p_phone LIKE '62%'  THEN '0' || substr(trim(p_phone), 3)
      ELSE trim(p_phone)
    END;

  RETURN NOT EXISTS (
    SELECT 1 FROM customers
    WHERE trim(phone) = trim(p_phone)
       OR trim(phone) = v_normalised
    LIMIT 1
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_email_available(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_phone_available(TEXT) TO anon, authenticated;


-- =============================================================================
-- VERIFIKASI AKHIR — Hitung tabel yang berhasil dibuat
-- =============================================================================
SELECT
  COUNT(*) AS total_tables_created,
  string_agg(table_name, ', ' ORDER BY table_name) AS tables
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
  AND table_name IN (
    'profiles','user_roles','role_permissions','permissions_list',
    'airlines','hotels','vendors','branches','agents','muthawifs','employees',
    'packages','departures','document_types','menu_items',
    'customers','customer_documents','customer_mahrams',
    'bookings','booking_passengers','booking_status_history','booking_document_logs','booking_line_items',
    'room_assignments','equipment_distributions',
    'savings_plans','savings_deposits','leads',
    'payment_deadline_reminders','invoice_templates',
    'customer_accounts','customer_notifications','booking_feedback',
    'email_templates','email_logs','notifications','support_tickets',
    'announcements','banners','coupons',
    'visa_applications','sos_alerts',
    'whatsapp_config','whatsapp_templates','whatsapp_logs',
    'wa_broadcast_campaigns','wa_broadcast_logs','wa_feature_roadmap',
    'app_settings','virtual_accounts','agent_monthly_targets',
    'jamaah_doa_sessions','jamaah_jurnal','jamaah_ibadah_targets','jamaah_ibadah_logs','jamaah_badges',
    'approval_requests','approval_actions','notification_templates',
    'payroll_records','leave_requests','leave_quotas','performance_reviews',
    'marketing_campaigns','sales_targets',
    'training_modules','training_quizzes','agent_training_progress',
    'vendor_contracts','departure_budgets','media_gallery','baggage_reference_items',
    'approval_configs','agent_override_commissions',
    'membership_plans','agent_memberships','branch_memberships','branch_commissions',
    'company_settings','bank_accounts','website_settings','contact_page_content','siskohat_sync_logs',
    'departure_cost_items','departure_expenses','departure_other_revenues','departure_financial_summary',
    'store_categories','store_products','store_orders','store_order_items','store_shipments','store_product_reviews'
  );

-- =============================================================================
-- SELESAI — File 07: Functions, RPC & Seed Data
-- Migrasi Vinstour Travel Portal selesai!
-- =============================================================================
SELECT 'File 07 — Functions, RPC & Seed: OK. Migrasi Vinstour selesai!' AS result;
