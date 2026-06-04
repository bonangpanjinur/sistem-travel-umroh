-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 26 — Public Booking RPC + Invoice QR Settings
-- 1. RPC get_public_booking_details — akses publik tanpa login (anon)
-- 2. Kolom show_qr_code & qr_placement di invoice_templates
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Tambah kolom QR ke invoice_templates ─────────────────────────────────
ALTER TABLE invoice_templates
  ADD COLUMN IF NOT EXISTS show_qr_code  BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS qr_placement  TEXT    NOT NULL DEFAULT 'bottom-right';

-- ─── 2. RPC get_public_booking_details ───────────────────────────────────────
-- Mengembalikan data booking yang aman untuk tampil publik (tanpa data sensitif).
-- Phone jamaah dimasking: hanya 4 digit akhir yang terlihat.
-- Fungsi ini SECURITY DEFINER agar bisa membaca di balik RLS.
CREATE OR REPLACE FUNCTION get_public_booking_details(p_booking_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_booking RECORD;
  v_customer RECORD;
  v_departure RECORD;
  v_package RECORD;
  v_phone_masked TEXT;
  v_remaining NUMERIC;
  v_total_pax INTEGER;
BEGIN
  -- Ambil data booking
  SELECT
    b.id,
    b.booking_code,
    b.status            AS booking_status,
    b.payment_status,
    b.total_price,
    b.paid_amount,
    b.room_type,
    b.created_at,
    b.customer_id,
    b.departure_id
  INTO v_booking
  FROM bookings b
  WHERE b.id = p_booking_id
  LIMIT 1;

  -- Booking tidak ditemukan
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Hitung remaining
  v_remaining := GREATEST(0, COALESCE(v_booking.total_price, 0) - COALESCE(v_booking.paid_amount, 0));

  -- Ambil data customer (dengan phone masking)
  SELECT
    c.full_name,
    c.phone
  INTO v_customer
  FROM customers c
  WHERE c.id = v_booking.customer_id
  LIMIT 1;

  -- Masking phone: tampilkan **** + 4 digit terakhir
  IF v_customer.phone IS NOT NULL AND length(v_customer.phone) >= 4 THEN
    v_phone_masked := repeat('*', GREATEST(0, length(v_customer.phone) - 4))
                      || right(v_customer.phone, 4);
  ELSE
    v_phone_masked := v_customer.phone;
  END IF;

  -- Hitung total pax dari tabel bookings (atau booking_passengers jika ada)
  SELECT COUNT(*)::INTEGER
  INTO v_total_pax
  FROM booking_passengers bp
  WHERE bp.booking_id = p_booking_id;

  IF v_total_pax IS NULL OR v_total_pax = 0 THEN
    v_total_pax := 1;
  END IF;

  -- Ambil data keberangkatan & paket
  IF v_booking.departure_id IS NOT NULL THEN
    SELECT
      d.departure_date,
      d.return_date,
      d.package_id
    INTO v_departure
    FROM departures d
    WHERE d.id = v_booking.departure_id
    LIMIT 1;

    IF FOUND AND v_departure.package_id IS NOT NULL THEN
      SELECT
        p.name,
        p.code
      INTO v_package
      FROM packages p
      WHERE p.id = v_departure.package_id
      LIMIT 1;
    END IF;
  END IF;

  -- Susun JSON hasil
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
    'payment_deadline', NULL,
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

-- Izinkan anon & authenticated menggunakan fungsi ini
GRANT EXECUTE ON FUNCTION get_public_booking_details(UUID) TO anon, authenticated;
