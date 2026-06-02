-- ============================================================
-- Migration: Flexible Rooming Groups (Multi-select Roommates)
-- ============================================================
-- Purpose: Replace single roommate_id with flexible room_group_id
-- to support multi-select roommate selection based on room type capacity

-- 1. Add room_group_id column to booking_passengers
ALTER TABLE booking_passengers
  ADD COLUMN IF NOT EXISTS room_group_id UUID;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_booking_passengers_room_group
  ON booking_passengers(room_group_id)
  WHERE room_group_id IS NOT NULL;

COMMENT ON COLUMN booking_passengers.room_group_id IS
  'UUID yang mengelompokkan jamaah dalam satu kamar (menggantikan roommate_id untuk fleksibilitas multi-select)';

-- 2. Migrate existing roommate_id data to room_group_id
-- For each pair of roommates, create a unique room_group_id
DO $$
DECLARE
  pair RECORD;
  group_id UUID;
BEGIN
  -- Find all pairs of roommates
  FOR pair IN
    SELECT DISTINCT 
      LEAST(id, roommate_id) as first_id,
      GREATEST(id, roommate_id) as second_id
    FROM booking_passengers
    WHERE roommate_id IS NOT NULL
      AND id < roommate_id  -- Avoid duplicates
  LOOP
    -- Generate a new group ID for this pair
    group_id := gen_random_uuid();
    
    -- Update both passengers with the same room_group_id
    UPDATE booking_passengers
    SET room_group_id = group_id
    WHERE id = pair.first_id OR id = pair.second_id;
  END LOOP;
END $$;

-- 3. Add helper function to get roommates for a passenger
CREATE OR REPLACE FUNCTION get_roommates(passenger_id UUID)
RETURNS TABLE(
  id UUID,
  customer_id UUID,
  full_name TEXT,
  gender TEXT,
  room_preference TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id,
    bp.customer_id,
    c.full_name,
    c.gender,
    bp.room_preference
  FROM booking_passengers bp
  JOIN customers c ON bp.customer_id = c.id
  WHERE bp.room_group_id = (
    SELECT room_group_id FROM booking_passengers WHERE id = passenger_id
  )
  AND bp.id != passenger_id;
END;
$$ LANGUAGE plpgsql;

-- 4. Add helper function to validate room group capacity
CREATE OR REPLACE FUNCTION validate_room_group_capacity(
  group_id UUID,
  expected_room_type TEXT
)
RETURNS TABLE(
  is_valid BOOLEAN,
  current_count INT,
  max_capacity INT,
  message TEXT
) AS $$
DECLARE
  count INT;
  max_cap INT;
BEGIN
  -- Get current count
  SELECT COUNT(*) INTO count
  FROM booking_passengers
  WHERE room_group_id = group_id;

  -- Determine max capacity based on room type
  max_cap := CASE expected_room_type
    WHEN 'single' THEN 1
    WHEN 'double' THEN 2
    WHEN 'triple' THEN 3
    WHEN 'quad' THEN 4
    ELSE 4
  END;

  RETURN QUERY
  SELECT
    count <= max_cap as is_valid,
    count,
    max_cap,
    CASE
      WHEN count <= max_cap THEN 'Kapasitas valid'
      ELSE format('Melebihi kapasitas %s (%s/%s)', expected_room_type, count, max_cap)
    END as message;
END;
$$ LANGUAGE plpgsql;

-- 5. Add helper function to get all members of a room group
CREATE OR REPLACE FUNCTION get_room_group_members(group_id UUID)
RETURNS TABLE(
  id UUID,
  customer_id UUID,
  full_name TEXT,
  gender TEXT,
  room_preference TEXT,
  room_number TEXT,
  booking_code TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id,
    bp.customer_id,
    c.full_name,
    c.gender,
    bp.room_preference,
    bp.room_number,
    b.booking_code
  FROM booking_passengers bp
  JOIN customers c ON bp.customer_id = c.id
  JOIN bookings b ON bp.booking_id = b.id
  WHERE bp.room_group_id = group_id
  ORDER BY bp.created_at;
END;
$$ LANGUAGE plpgsql;

-- 6. Add RLS policy for room_group_id access
-- (Assuming existing RLS policies are in place for booking_passengers)

-- 7. Create audit table for room group changes
CREATE TABLE IF NOT EXISTS room_group_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_group_id UUID,
  passenger_id UUID,
  action TEXT NOT NULL, -- 'add_to_group', 'remove_from_group', 'create_group', 'delete_group'
  old_room_type TEXT,
  new_room_type TEXT,
  old_room_number TEXT,
  new_room_number TEXT,
  reason TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_room_group_audit_group_id
  ON room_group_audit(room_group_id);

CREATE INDEX IF NOT EXISTS idx_room_group_audit_passenger_id
  ON room_group_audit(passenger_id);

CREATE INDEX IF NOT EXISTS idx_room_group_audit_created_at
  ON room_group_audit(created_at DESC);

COMMENT ON TABLE room_group_audit IS
  'Audit trail untuk perubahan room group (teman sekamar)';

-- 8. Enable RLS on audit table
ALTER TABLE room_group_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_room_group_audit" ON room_group_audit;
CREATE POLICY "staff_read_room_group_audit" ON room_group_audit
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'operational')
    )
  );

DROP POLICY IF EXISTS "admin_manage_room_group_audit" ON room_group_audit
  FOR INSERT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role IN ('super_admin', 'owner', 'operational')
    )
  );
