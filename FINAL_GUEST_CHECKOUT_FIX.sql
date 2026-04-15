-- =================================================================
-- FINAL DEFINITIVE FIX FOR GUEST CHECKOUT RLS
-- =================================================================
-- Masalah: Error "new row violates row-level security policy for table customers"
-- Penyebab: Policy INSERT pada tabel customers memblokir role 'anon' (guest).
-- Solusi: Menghapus policy lama yang konflik dan membuat policy baru yang mengizinkan 'anon'.
-- =================================================================

BEGIN;

-- 1. MEMBERSIHKAN POLICY LAMA PADA TABEL CUSTOMERS
-- Kita hapus semua policy insert yang mungkin konflik
DROP POLICY IF EXISTS "Allow guest and authenticated customer insert" ON public.customers;
DROP POLICY IF EXISTS "Definitive guest and auth customer insert" ON public.customers;
DROP POLICY IF EXISTS "Allow guest and authenticated customer insertion" ON public.customers;
DROP POLICY IF EXISTS "Allow guest to insert customer" ON public.customers;
DROP POLICY IF EXISTS "Unified customer insert policy" ON public.customers;
DROP POLICY IF EXISTS "Simple guest checkout insert" ON public.customers;
DROP POLICY IF EXISTS "Users can insert customers based on permissions" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Customers can insert own data" ON public.customers;

-- 2. MEMBUAT POLICY BARU YANG DEFINITIF UNTUK CUSTOMERS
-- Mengizinkan 'anon' (guest) melakukan insert jika user_id NULL
-- Mengizinkan 'authenticated' melakukan insert untuk dirinya sendiri
CREATE POLICY "Definitive guest and auth customer insert"
ON public.customers FOR INSERT TO anon, authenticated
WITH CHECK (
  (user_id IS NULL) -- Kasus Guest
  OR (auth.uid() = user_id) -- Kasus User terdaftar (milik sendiri)
  OR public.is_admin(auth.uid()) -- Kasus Admin
);

-- 3. MEMASTIKAN TABEL PENDUKUNG LAINNYA JUGA BISA DI-INSERT OLEH GUEST
-- Tabel Bookings
DROP POLICY IF EXISTS "Definitive guest and auth booking insert" ON public.bookings;
DROP POLICY IF EXISTS "Allow guest and authenticated booking insert" ON public.bookings;
CREATE POLICY "Definitive guest and auth booking insert"
ON public.bookings FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Tabel Booking Passengers
DROP POLICY IF EXISTS "Definitive guest and auth passenger insert" ON public.booking_passengers;
DROP POLICY IF EXISTS "Allow guest and authenticated passenger insert" ON public.booking_passengers;
CREATE POLICY "Definitive guest and auth passenger insert"
ON public.booking_passengers FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- Tabel Payments
DROP POLICY IF EXISTS "Definitive guest and auth payment insert" ON public.payments;
DROP POLICY IF EXISTS "Allow guest and authenticated payment insert" ON public.payments;
CREATE POLICY "Definitive guest and auth payment insert"
ON public.payments FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 4. MEMBERIKAN IZIN INSERT SECARA EKSPLISIT KEPADA ROLE ANON
GRANT INSERT ON public.customers TO anon;
GRANT INSERT ON public.bookings TO anon;
GRANT INSERT ON public.booking_passengers TO anon;
GRANT INSERT ON public.payments TO anon;
GRANT INSERT ON public.notifications TO anon;

-- 5. MEMASTIKAN SEQUENCE BISA DIAKSES OLEH GUEST
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 6. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =================================================================
-- INSTRUKSI:
-- 1. Copy seluruh isi file ini.
-- 2. Buka Dashboard Supabase Anda.
-- 3. Masuk ke menu "SQL Editor".
-- 4. Paste skrip ini dan klik "Run".
-- =================================================================
