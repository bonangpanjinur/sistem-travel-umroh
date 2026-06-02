-- Migration: Tambah foreign key yang hilang untuk bookings.sales_id dan booking_status_history.changed_by
-- Tujuan: Memungkinkan PostgREST join langsung dengan nama FK eksplisit di Supabase
-- Aman dijalankan berkali-kali (idempotent via DO $$ ... END $$)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. bookings.sales_id → public.profiles(id)
--    Nama FK: bookings_sales_id_fkey
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'bookings_sales_id_fkey'
      AND table_name      = 'bookings'
      AND table_schema    = 'public'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_sales_id_fkey
      FOREIGN KEY (sales_id)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. booking_status_history.changed_by → public.profiles(id)
--    Nama FK: booking_status_history_changed_by_fkey
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'booking_status_history_changed_by_fkey'
      AND table_name      = 'booking_status_history'
      AND table_schema    = 'public'
  ) THEN
    ALTER TABLE public.booking_status_history
      ADD CONSTRAINT booking_status_history_changed_by_fkey
      FOREIGN KEY (changed_by)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- CARA MENJALANKAN DI SUPABASE DASHBOARD
-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Buka https://supabase.com/dashboard → pilih project Anda
-- 2. Di sidebar kiri → klik "SQL Editor"
-- 3. Klik "+ New query"
-- 4. Paste seluruh isi file ini → klik "Run" (atau Ctrl+Enter)
-- 5. Hasilnya: "Success. No rows returned." — artinya FK berhasil ditambah
--
-- SETELAH MIGRASI:
-- Jalankan di terminal untuk regenerate types (opsional tapi disarankan):
--   pnpm supabase gen types typescript --project-id <project-id> > artifacts/umrah-haji/src/integrations/supabase/types.ts
--
-- JOIN yang kini berfungsi kembali:
--   .from('bookings').select('*, sales_profile:profiles!bookings_sales_id_fkey(id, full_name)')
--   .from('booking_status_history').select('*, changed_by_profile:profiles!booking_status_history_changed_by_fkey(id, full_name)')
