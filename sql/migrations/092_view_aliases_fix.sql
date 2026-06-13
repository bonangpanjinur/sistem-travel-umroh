-- ============================================================
-- Migration 092: VIEW aliases — backward compat tanpa ubah kode
-- Berdasarkan rencanasql.md §24.14
-- Fix semua phantom table references yang bisa diselesaikan
-- dengan VIEW alias (kode pakai nama lama, schema punya nama baru)
-- ============================================================

-- ============================================================
-- FIX 1: savings_payments → savings_deposits
-- 8 file hits: AdminSavings, useJamaahSavings, BookingDetail, dll
-- ============================================================
CREATE OR REPLACE VIEW savings_payments AS
  SELECT
    id,
    plan_id,
    amount,
    deposit_date     AS payment_date,
    deposit_date,
    notes,
    created_by,
    created_at
  FROM savings_deposits;

-- ============================================================
-- FIX 2: attendance_records → attendance
-- 7 file hits: AdminHR, AdminFinanceCash, useAttendance, dll
-- ============================================================
CREATE OR REPLACE VIEW attendance_records AS
  SELECT
    id,
    departure_id,
    customer_id,
    session_type,
    status,
    recorded_by,
    -- alias kolom yang mungkin diakses di kode
    session_type    AS session,
    recorded_by     AS created_by,
    created_at
  FROM attendance;

-- ============================================================
-- FIX 3: audit_logs → gabungan document_audit_logs + rbac_audit_trail
-- 7 file hits: AdminSecurity, AdminBookingDetail, useAuditLog
-- ============================================================
CREATE OR REPLACE VIEW audit_logs AS
  SELECT
    id,
    'document'                 AS log_type,
    event_type                 AS action,
    customer_name              AS actor_name,
    NULL::UUID                 AS actor_id,
    booking_id,
    customer_id,
    doc_type                   AS resource_type,
    NULL::TEXT                 AS resource_id,
    NULL::JSONB                AS metadata,
    created_at
  FROM document_audit_logs
  UNION ALL
  SELECT
    id,
    'rbac'                     AS log_type,
    action,
    changed_by::TEXT           AS actor_name,
    NULL::UUID                 AS actor_id,
    NULL::UUID                 AS booking_id,
    NULL::UUID                 AS customer_id,
    module_key                 AS resource_type,
    NULL::TEXT                 AS resource_id,
    NULL::JSONB                AS metadata,
    changed_at                 AS created_at
  FROM dashboard_access_audit_log;

-- ============================================================
-- FIX 4: webhook_endpoints → webhooks
-- 3 file hits: AdminApiConnect
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'webhooks' AND table_schema = 'public'
  ) THEN
    EXECUTE '
      CREATE OR REPLACE VIEW webhook_endpoints AS
        SELECT
          id,
          name,
          url,
          secret_hash  AS secret,
          events,
          is_active,
          branch_id,
          created_at,
          updated_at
        FROM webhooks
    ';
  END IF;
END $$;

-- ============================================================
-- FIX 5: preparation_checklists → jamaah_checklist
-- 3 file hits: portal jamaah persiapan
-- ============================================================
CREATE OR REPLACE VIEW preparation_checklists AS
  SELECT
    id,
    customer_id,
    departure_id,
    has_passport,
    has_visa,
    has_ktp,
    has_kk,
    has_photo,
    has_vaccine_cert,
    has_meningitis,
    has_mahram_cert,
    has_marriage_cert,
    has_birth_cert,
    has_paid_full,
    items_received,
    is_complete,
    notes,
    updated_by,
    updated_at,
    created_at
  FROM jamaah_checklist;

-- ============================================================
-- FIX 6: package_images → media_gallery (filter type='package')
-- 2 file hits: package gallery
-- ============================================================
CREATE OR REPLACE VIEW package_images AS
  SELECT
    id,
    package_id,
    media_url    AS image_url,
    thumbnail_url,
    title,
    description,
    sort_order,
    is_active,
    created_at
  FROM media_gallery
  WHERE type = 'package' AND package_id IS NOT NULL;

-- ============================================================
-- FIX 7: salary_payments → payroll_records
-- 5 file hits: AdminFinanceCash
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'payroll_records' AND table_schema = 'public'
  ) THEN
    EXECUTE '
      CREATE OR REPLACE VIEW salary_payments AS
        SELECT
          id,
          employee_id,
          period_year    AS year,
          period_month   AS month,
          gross          AS gross_amount,
          net            AS net_amount,
          gross,
          net,
          pph21_amount,
          status,
          paid_at        AS payment_date,
          paid_at,
          created_at
        FROM payroll_records
    ';
  END IF;
END $$;
