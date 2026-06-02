-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — SCHEMA LENGKAP BAGIAN 1: TABEL FONDASI
-- Tambahan untuk booking_line_items
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_line_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  passenger_id UUID REFERENCES booking_passengers(id) ON DELETE SET NULL, -- Opsional, jika item terkait penumpang spesifik
  description TEXT NOT NULL, -- Contoh: 'Paket Umroh Quad', 'Biaya Visa', 'Diskon Kupon'
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(15,2) NOT NULL DEFAULT 0, -- quantity * unit_price
  item_type TEXT NOT NULL CHECK (item_type IN ('package', 'addon', 'discount', 'tax', 'other')),
  reference_id UUID, -- Opsional, referensi ke add-on_id, coupon_id, dll.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE booking_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "booking_line_items_admin_manage" ON booking_line_items;
DROP POLICY IF EXISTS "booking_line_items_read_own"     ON booking_line_items;

CREATE POLICY "booking_line_items_admin_manage" ON booking_line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin','owner','admin','branch_manager','operational','finance','sales')
    )
  );

CREATE POLICY "booking_line_items_read_own" ON booking_line_items
  FOR SELECT USING (
    booking_id IN (SELECT id FROM bookings WHERE customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
  );

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='set_booking_line_items_updated_at'
    AND tgrelid='booking_line_items'::regclass) THEN
    CREATE TRIGGER set_booking_line_items_updated_at
      BEFORE UPDATE ON booking_line_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
