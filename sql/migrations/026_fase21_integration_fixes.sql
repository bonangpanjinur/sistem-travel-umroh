-- ═══════════════════════════════════════════════════════════════════════════
-- FASE 21 — Integration Fixes
-- Gap integrasi yang ditemukan dari analisis menyeluruh Mei 2026
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Tabel customer_notifications ─────────────────────────────────────────
-- Digunakan oleh useNotifications.ts dan useVisaStatusUpdate.ts
CREATE TABLE IF NOT EXISTS customer_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id     UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type            TEXT NOT NULL DEFAULT 'general',
  title           TEXT NOT NULL,
  message         TEXT NOT NULL,
  link            TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  read_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customer_notif_customer ON customer_notifications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_notif_unread   ON customer_notifications(customer_id, is_read) WHERE is_read = FALSE;

ALTER TABLE customer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jamaah baca notif sendiri" ON customer_notifications;
CREATE POLICY "jamaah baca notif sendiri" ON customer_notifications
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "jamaah update notif sendiri" ON customer_notifications;
CREATE POLICY "jamaah update notif sendiri" ON customer_notifications
  FOR UPDATE USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "admin insert notif" ON customer_notifications;
CREATE POLICY "admin insert notif" ON customer_notifications
  FOR INSERT WITH CHECK (TRUE);

-- ─── 2. Tabel jamaah_checklist ────────────────────────────────────────────────
-- Checklist persiapan jamaah — persistent ke DB, sinkron antar perangkat
CREATE TABLE IF NOT EXISTS jamaah_checklist (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  item_id     TEXT NOT NULL,
  is_checked  BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (customer_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_jamaah_checklist_customer ON jamaah_checklist(customer_id);

ALTER TABLE jamaah_checklist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jamaah baca checklist sendiri" ON jamaah_checklist;
CREATE POLICY "jamaah baca checklist sendiri" ON jamaah_checklist
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "jamaah upsert checklist sendiri" ON jamaah_checklist;
CREATE POLICY "jamaah upsert checklist sendiri" ON jamaah_checklist
  FOR ALL USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin baca semua checklist" ON jamaah_checklist;
CREATE POLICY "admin baca semua checklist" ON jamaah_checklist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

-- ─── 3. Tabel attendance (Muthawif) ──────────────────────────────────────────
-- Digunakan oleh MuthawifDashboard untuk pencatatan kehadiran jamaah per sesi
CREATE TABLE IF NOT EXISTS attendance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id    UUID REFERENCES departures(id) ON DELETE SET NULL,
  customer_id     UUID REFERENCES customers(id) ON DELETE CASCADE,
  session_type    TEXT NOT NULL DEFAULT 'lainnya',
  session_label   TEXT,
  status          TEXT NOT NULL DEFAULT 'hadir' CHECK (status IN ('hadir','absen','terlambat','izin')),
  notes           TEXT,
  recorded_by     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attendance_departure  ON attendance(departure_id);
CREATE INDEX IF NOT EXISTS idx_attendance_customer   ON attendance(customer_id);
CREATE INDEX IF NOT EXISTS idx_attendance_session    ON attendance(departure_id, session_type, recorded_at);

ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "muthawif bisa insert attendance" ON attendance;
CREATE POLICY "muthawif bisa insert attendance" ON attendance
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DROP POLICY IF EXISTS "muthawif bisa baca attendance" ON attendance;
CREATE POLICY "muthawif bisa baca attendance" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DROP POLICY IF EXISTS "muthawif bisa update attendance" ON attendance;
CREATE POLICY "muthawif bisa update attendance" ON attendance
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

-- ─── 4. Tabel visa_status_logs ────────────────────────────────────────────────
-- Log perubahan status visa (digunakan oleh useVisaStatusUpdate.ts)
CREATE TABLE IF NOT EXISTS visa_status_logs (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE,
  old_status   TEXT,
  new_status   TEXT NOT NULL,
  notes        TEXT,
  changed_by   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visa_logs_customer ON visa_status_logs(customer_id);

ALTER TABLE visa_status_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin kelola visa logs" ON visa_status_logs;
CREATE POLICY "admin kelola visa logs" ON visa_status_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DROP POLICY IF EXISTS "jamaah baca visa log sendiri" ON visa_status_logs;
CREATE POLICY "jamaah baca visa log sendiri" ON visa_status_logs
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- ─── 5. Tabel room_occupants ──────────────────────────────────────────────────
-- Digunakan oleh RoomingListPageImproved untuk data penghuni kamar
CREATE TABLE IF NOT EXISTS room_occupants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_assignment_id  UUID NOT NULL REFERENCES room_assignments(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bed_number          INT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_assignment_id, customer_id)
);

CREATE INDEX IF NOT EXISTS idx_room_occupants_room     ON room_occupants(room_assignment_id);
CREATE INDEX IF NOT EXISTS idx_room_occupants_customer ON room_occupants(customer_id);

ALTER TABLE room_occupants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin kelola room_occupants" ON room_occupants;
CREATE POLICY "admin kelola room_occupants" ON room_occupants
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager','operational')
    )
  );

DROP POLICY IF EXISTS "jamaah baca kamar sendiri" ON room_occupants;
CREATE POLICY "jamaah baca kamar sendiri" ON room_occupants
  FOR SELECT USING (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

-- ─── 6. Kolom room_number di bookings ────────────────────────────────────────
-- Simpan nomor kamar langsung di booking untuk lookup cepat dari portal jamaah
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bookings' AND column_name = 'room_number'
  ) THEN
    ALTER TABLE bookings ADD COLUMN room_number TEXT;
  END IF;
END $$;

-- ─── 7. Tabel feedback ────────────────────────────────────────────────────────
-- View alias dari testimonials agar AdminSentimenFeedback bisa pakai kedua nama
-- (sudah difix di kode untuk baca dari testimonials langsung)
-- Tabel feedback ini untuk catatan pengembang jika ada kebutuhan terpisah masa depan
CREATE TABLE IF NOT EXISTS feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id  UUID REFERENCES customers(id) ON DELETE CASCADE,
  rating       INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  aspects      JSONB DEFAULT '[]',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_customer  ON feedback(customer_id);
CREATE INDEX IF NOT EXISTS idx_feedback_booking   ON feedback(booking_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created   ON feedback(created_at);

ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "jamaah insert feedback sendiri" ON feedback;
CREATE POLICY "jamaah insert feedback sendiri" ON feedback
  FOR INSERT WITH CHECK (
    customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "semua baca feedback" ON feedback;
CREATE POLICY "semua baca feedback" ON feedback
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "admin kelola feedback" ON feedback;
CREATE POLICY "admin kelola feedback" ON feedback
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()
      AND ur.role IN ('super_admin','owner','admin','branch_manager')
    )
  );

-- ─── 8. Kolom di testimonials ─────────────────────────────────────────────────
-- Tambah kolom booking_id agar testimonials bisa di-join ke bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'testimonials' AND column_name = 'booking_id'
  ) THEN
    ALTER TABLE testimonials ADD COLUMN booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ─── 9. Tabel notifications (untuk admin channel) ────────────────────────────
-- Digunakan oleh useAdminNotifications.ts via realtime channel
-- Jika sudah ada dari fase0, hanya tambahkan kolom yang kurang
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'notifications' AND column_name = 'link'
  ) THEN
    ALTER TABLE notifications ADD COLUMN link TEXT;
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- CATATAN: Jalankan file ini setelah fase0_foundation.sql
-- Urutan: fase0 → fase16 → fase17 → fase18 → fase19 → fase20 → fase21
-- ═══════════════════════════════════════════════════════════════════════════
