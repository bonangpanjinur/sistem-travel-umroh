-- Operational Integration Migration
-- Integrasi data jamaah dengan kamar, perlengkapan, keuangan, dan dokumen

-- ─── JAMAAH OPERATIONAL STATUS VIEW ──────────────────────────────────────────
-- View untuk melihat status lengkap setiap jamaah dalam satu keberangkatan

CREATE OR REPLACE VIEW jamaah_operational_status AS
SELECT
  bp.id AS booking_passenger_id,
  bp.customer_id,
  bp.booking_id,
  bp.is_main_passenger,
  bp.passenger_type,
  c.full_name,
  c.nik,
  c.gender,
  c.passport_number,
  c.passport_expiry,
  c.phone,
  c.email,
  b.departure_id,
  b.booking_code,
  b.total_price,
  b.paid_amount,
  b.payment_status,
  b.room_type,
  -- Kamar / Room assignment
  (
    SELECT ro.room_number || ' (' || ra.room_type || ')'
    FROM room_occupants roc
    JOIN room_assignments ra ON roc.room_assignment_id = ra.id
    LEFT JOIN (
      SELECT DISTINCT ON (room_assignment_id) room_assignment_id, room_number
      FROM room_assignments
    ) ro ON ro.room_assignment_id = ra.id
    WHERE roc.customer_id = bp.customer_id
    LIMIT 1
  ) AS room_info,
  -- Equipment distribution status
  (
    SELECT COUNT(*) > 0
    FROM equipment_distributions ed
    WHERE ed.customer_id = bp.customer_id
    AND ed.departure_id = b.departure_id
  ) AS has_equipment,
  -- Document status
  (
    SELECT COUNT(*)
    FROM generated_documents gd
    WHERE gd.customer_id = bp.customer_id
    AND gd.departure_id = b.departure_id
  ) AS document_count,
  -- Finance summary
  ROUND((b.paid_amount / NULLIF(b.total_price, 0)) * 100) AS payment_percent,
  b.total_price - b.paid_amount AS remaining_amount
FROM booking_passengers bp
JOIN bookings b ON bp.booking_id = b.id
JOIN customers c ON bp.customer_id = c.id
WHERE b.status NOT IN ('cancelled');

-- ─── GENERATED DOCUMENTS TRACKING ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS generated_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  departure_id UUID REFERENCES departures(id),
  booking_id UUID REFERENCES bookings(id),
  document_type TEXT NOT NULL, -- 'cuti_jamaah','paspor','invoice','eticket','sertifikat','umum'
  document_number TEXT,
  file_url TEXT,
  generated_by UUID REFERENCES auth.users(id),
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_gendocs_customer ON generated_documents(customer_id);
CREATE INDEX IF NOT EXISTS idx_gendocs_departure ON generated_documents(departure_id);
CREATE INDEX IF NOT EXISTS idx_gendocs_type ON generated_documents(document_type);

ALTER TABLE generated_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_can_manage_generated_docs" ON generated_documents FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('super_admin','owner','branch_manager','operational','finance')));


-- ─── EQUIPMENT DISTRIBUTIONS ─────────────────────────────────────────────────
-- Ensure departure_id exists on equipment_distributions
ALTER TABLE equipment_distributions ADD COLUMN IF NOT EXISTS departure_id UUID REFERENCES departures(id);
ALTER TABLE equipment_distributions ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE equipment_distributions ADD COLUMN IF NOT EXISTS distributed_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_equip_dist_departure ON equipment_distributions(departure_id);


-- ─── ROOM ASSIGNMENT IMPROVEMENT ─────────────────────────────────────────────
-- Add departure_id to room_assignments for better filtering
ALTER TABLE room_assignments ADD COLUMN IF NOT EXISTS departure_id UUID REFERENCES departures(id);

CREATE INDEX IF NOT EXISTS idx_room_assign_departure ON room_assignments(departure_id);


-- ─── JAMAAH CHECKLIST ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS jamaah_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  departure_id UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  -- Dokumen
  has_passport BOOLEAN DEFAULT FALSE,
  has_visa BOOLEAN DEFAULT FALSE,
  has_ktp BOOLEAN DEFAULT FALSE,
  has_kk BOOLEAN DEFAULT FALSE,
  has_photo BOOLEAN DEFAULT FALSE,
  has_meningitis_vaccine BOOLEAN DEFAULT FALSE,
  -- Perlengkapan
  has_ihram BOOLEAN DEFAULT FALSE,
  has_bag BOOLEAN DEFAULT FALSE,
  has_id_card BOOLEAN DEFAULT FALSE,
  has_insurance BOOLEAN DEFAULT FALSE,
  -- Manasik
  has_attended_manasik BOOLEAN DEFAULT FALSE,
  -- Keuangan
  is_fully_paid BOOLEAN DEFAULT FALSE,
  -- Akomodasi
  room_assigned BOOLEAN DEFAULT FALSE,
  -- Notes
  notes TEXT,
  checked_by UUID REFERENCES auth.users(id),
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (customer_id, departure_id)
);

CREATE INDEX IF NOT EXISTS idx_checklist_departure ON jamaah_checklist(departure_id);
CREATE INDEX IF NOT EXISTS idx_checklist_customer ON jamaah_checklist(customer_id);

ALTER TABLE jamaah_checklist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "operational_can_manage_checklist" ON jamaah_checklist FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('super_admin','owner','branch_manager','operational','equipment')));
