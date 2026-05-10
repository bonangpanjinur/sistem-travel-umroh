-- ─── SOS Departure Routing Migration ─────────────────────────────────────
-- Run this in Supabase SQL Editor AFTER the base sos_alerts table exists.
-- Adds departure_id to sos_alerts so SOS can be routed to the right
-- muthawif / tour leader in the same departure group.

-- 1. Add departure_id column to sos_alerts
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS departure_id uuid REFERENCES departures(id) ON DELETE SET NULL;

-- 2. Index for fast departure-based lookups
CREATE INDEX IF NOT EXISTS idx_sos_alerts_departure_id ON sos_alerts(departure_id);

-- 3. Add tour_leader_user_id to departures (optional override: point to a specific user)
--    If empty, tour leader is detected via customers.is_tour_leader + bookings.departure_id
ALTER TABLE departures ADD COLUMN IF NOT EXISTS tour_leader_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_departures_tour_leader_user_id ON departures(tour_leader_user_id);

-- 4. Drop old read policy (too permissive / too narrow)
DROP POLICY IF EXISTS "customer_read_own_sos"   ON sos_alerts;
DROP POLICY IF EXISTS "read_own_or_group_sos"   ON sos_alerts;

-- 5. New RLS read policy — role-aware departure routing
CREATE POLICY "read_own_or_group_sos" ON sos_alerts
  FOR SELECT USING (
    -- Jamaah reads their own SOS history
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
    -- Admin / operational staff read everything
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'branch_manager', 'operational')
    )
    -- ── Muthawif reads SOS from their assigned departure groups ──────────
    OR departure_id IN (
      SELECT d.id
      FROM   departures d
      JOIN   muthawifs  m ON m.id = d.muthawif_id
      WHERE  m.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    -- ── Tour leader reads SOS from their departure group ─────────────────
    -- (tour_leader_user_id explicit override on departure)
    OR departure_id IN (
      SELECT id FROM departures
      WHERE tour_leader_user_id = auth.uid()
    )
    -- (tour leader detected via customers.is_tour_leader flag + active booking)
    OR departure_id IN (
      SELECT b.departure_id
      FROM   bookings  b
      JOIN   customers c ON c.id = b.customer_id
      WHERE  c.user_id      = auth.uid()
        AND  c.is_tour_leader = true
        AND  b.booking_status NOT IN ('cancelled', 'refunded')
    )
  );

-- 6. Muthawif can also UPDATE (respond to) SOS from their departure groups
DROP POLICY IF EXISTS "muthawif_update_group_sos" ON sos_alerts;
CREATE POLICY "muthawif_update_group_sos" ON sos_alerts
  FOR UPDATE USING (
    -- Admin
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'branch_manager', 'operational')
    )
    -- Muthawif from same departure
    OR departure_id IN (
      SELECT d.id
      FROM   departures d
      JOIN   muthawifs  m ON m.id = d.muthawif_id
      WHERE  m.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
    -- Tour leader from same departure
    OR departure_id IN (
      SELECT id FROM departures
      WHERE tour_leader_user_id = auth.uid()
    )
    OR departure_id IN (
      SELECT b.departure_id
      FROM   bookings  b
      JOIN   customers c ON c.id = b.customer_id
      WHERE  c.user_id      = auth.uid()
        AND  c.is_tour_leader = true
        AND  b.booking_status NOT IN ('cancelled', 'refunded')
    )
  );

-- 7. Add helpful comment
COMMENT ON COLUMN sos_alerts.departure_id IS
  'Keberangkatan asal jamaah yang mengirim SOS. Digunakan untuk routing ke muthawif dan tour leader yang tepat.';
COMMENT ON COLUMN departures.tour_leader_user_id IS
  'User auth yang ditunjuk sebagai Tour Leader untuk keberangkatan ini (override eksplisit).';
