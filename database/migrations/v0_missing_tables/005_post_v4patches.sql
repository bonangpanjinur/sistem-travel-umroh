-- ============================================================
-- V0 MISSING TABLES — 005: Post-V4 Constraint Additions
--
-- File ini dijalankan SETELAH seluruh v4_patches selesai.
--
-- Mengapa terpisah?
-- savings_payments (file 004) butuh kolom schedule_id yang mereferensikan
-- savings_schedules. Tetapi savings_schedules BARU DIBUAT oleh:
--   v4_patches/20260513111158_6897f5ed-beb4-4b88-b2a2-36c033bbd1d6.sql
--
-- Jika FK langsung dimasukkan di file 004, CREATE TABLE akan gagal dengan:
--   ERROR: relation "savings_schedules" does not exist
--
-- Solusi: savings_payments dibuat tanpa FK di file 004, FK ditambahkan di sini
-- setelah savings_schedules sudah pasti ada.
--
-- URUTAN WAJIB:
--   fase0_foundation.sql
--   → v0_missing_tables/004_operational_tables.sql   (savings_payments tanpa FK)
--   → ... v2, v3 ...
--   → v4_patches/20260513111158 (membuat savings_schedules + trigger ON savings_payments)
--   → ... sisa v4_patches ...
--   → FILE INI (tambah FK savings_payments → savings_schedules)
--   → patches/
-- ============================================================

-- ── savings_payments.schedule_id → savings_schedules ─────────
-- Tambahkan FK setelah savings_schedules sudah pasti ada.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_savings_payments_schedule_id'
      AND table_name = 'savings_payments'
  ) THEN
    ALTER TABLE public.savings_payments
      ADD CONSTRAINT fk_savings_payments_schedule_id
      FOREIGN KEY (schedule_id)
      REFERENCES public.savings_schedules(id)
      ON DELETE SET NULL;

    RAISE NOTICE 'FK fk_savings_payments_schedule_id berhasil ditambahkan.';
  ELSE
    RAISE NOTICE 'FK fk_savings_payments_schedule_id sudah ada, dilewati.';
  END IF;
END $$;
