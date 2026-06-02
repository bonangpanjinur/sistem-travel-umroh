-- ──────────────────────────────────────────────────────────────────────────────
-- fase27: booking_line_items table + fix RLS for customer_documents,
--         customer_mahrams, booking_status_history, profiles join
-- ──────────────────────────────────────────────────────────────────────────────

-- ─── 1. booking_line_items ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_line_items (
  id            UUID        NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
  booking_id    UUID        NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  passenger_id  UUID,
  item_type     TEXT        NOT NULL DEFAULT 'service',
  description   TEXT        NOT NULL DEFAULT '',
  quantity      NUMERIC     NOT NULL DEFAULT 1,
  unit_price    NUMERIC     NOT NULL DEFAULT 0,
  total_price   NUMERIC     NOT NULL DEFAULT 0,
  reference_id  UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_line_items_booking_id   ON booking_line_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_line_items_passenger_id ON booking_line_items(passenger_id);

ALTER TABLE booking_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_manage_booking_line_items" ON booking_line_items;
CREATE POLICY "authenticated_manage_booking_line_items" ON booking_line_items
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- ─── 2. Fix customer_documents RLS — allow staff/admin to read all ────────────
DROP POLICY IF EXISTS "admin_read_all_customer_documents"  ON customer_documents;
DROP POLICY IF EXISTS "staff_read_all_customer_documents"  ON customer_documents;
CREATE POLICY "staff_read_all_customer_documents" ON customer_documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','owner','branch_manager','finance','staff','operational')
    )
    OR customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "staff_write_customer_documents"    ON customer_documents;
CREATE POLICY "staff_write_customer_documents" ON customer_documents
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','owner','branch_manager','finance','staff','operational')
    )
    OR customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','owner','branch_manager','finance','staff','operational')
    )
    OR customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

-- ─── 3. Fix customer_mahrams RLS — allow staff/admin to read all ──────────────
DROP POLICY IF EXISTS "admin_read_all_customer_mahrams"   ON customer_mahrams;
DROP POLICY IF EXISTS "staff_read_all_customer_mahrams"   ON customer_mahrams;
CREATE POLICY "staff_read_all_customer_mahrams" ON customer_mahrams
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','owner','branch_manager','finance','staff','operational')
    )
    OR customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "staff_write_customer_mahrams"      ON customer_mahrams;
CREATE POLICY "staff_write_customer_mahrams" ON customer_mahrams
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','owner','branch_manager','finance','staff','operational')
    )
    OR customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','owner','branch_manager','finance','staff','operational')
    )
    OR customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

-- ─── 4. profiles — allow admins to read all profiles (needed for status history join) ──
DROP POLICY IF EXISTS "admin_read_all_profiles"           ON profiles;
DROP POLICY IF EXISTS "admin_read_profiles_for_status"    ON profiles;
CREATE POLICY "admin_read_profiles_for_status" ON profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_admin','admin','owner','branch_manager','finance','staff','operational')
    )
  );

-- ─── 5. booking_status_history — ensure all authenticated users can read ──────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'booking_status_history'
      AND policyname = 'auth_read_booking_status_history'
  ) THEN
    CREATE POLICY "auth_read_booking_status_history" ON booking_status_history
      FOR SELECT TO authenticated USING (true);
  END IF;
END $$;
