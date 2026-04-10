-- Phase 1: Perbaikan Kritis - Migrasi Database (RLS & Atomic Update)

-- Bug #1: DELETE policy pada customers
-- Halaman admin memiliki tombol hapus jamaah, namun tabel customers tidak memiliki kebijakan DELETE di database.
CREATE POLICY "Admins and operational can delete customers"
ON public.customers FOR DELETE TO authenticated
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operational'));

-- Bug #2: Atomic coupon used_count increment
-- Pembaruan used_count kupon tidak atomik, berpotensi menyebabkan race condition.
CREATE OR REPLACE FUNCTION public.increment_coupon_used(p_code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public'
AS $$ 
BEGIN
  UPDATE coupons SET used_count = COALESCE(used_count, 0) + 1 WHERE code = p_code;
END; 
$$;

-- Phase 2: Perbaikan Prioritas Tinggi - Kebijakan RLS & Penanganan File

-- Bug #3: Fix INSERT policy untuk customers tanpa user_id
-- Memperbolehkan authenticated user insert customer tanpa user_id (untuk pendaftaran group booking).
DROP POLICY IF EXISTS "Customers can insert own data" ON public.customers;
CREATE POLICY "Authenticated users can insert customers"
ON public.customers FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL OR is_admin(auth.uid()));

-- Phase 3: Perbaikan Prioritas Tinggi & Sedang - Konsistensi UI & Logika Bisnis

-- Bug #7: remaining_amount Tidak Di-update Setelah Pembayaran Ditolak
-- Modifikasi fungsi trigger update_booking_paid_amount untuk menyertakan pembaruan remaining_amount.
CREATE OR REPLACE FUNCTION public.update_booking_paid_amount()
RETURNS TRIGGER AS $$
DECLARE
  total_paid NUMERIC;
  booking_total NUMERIC;
  new_payment_status payment_status;
BEGIN
  -- Calculate total paid amount ONLY from 'paid' OR 'verified' payments
  SELECT COALESCE(SUM(amount), 0) INTO total_paid
  FROM public.payments
  WHERE booking_id = NEW.booking_id AND status IN ('paid', 'verified');

  -- Get booking total price
  SELECT total_price INTO booking_total
  FROM public.bookings
  WHERE id = NEW.booking_id;

  -- Determine payment status
  IF total_paid >= booking_total THEN
    new_payment_status := 'paid';
  ELSIF total_paid > 0 THEN
    new_payment_status := 'partial';
  ELSE
    new_payment_status := 'pending';
  END IF;

  -- Update booking with new paid amount, payment status, and remaining_amount
  UPDATE public.bookings
  SET 
    paid_amount = total_paid,
    remaining_amount = GREATEST(0, booking_total - total_paid),
    payment_status = new_payment_status,
    updated_at = now()
  WHERE id = NEW.booking_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Phase 4: Perbaikan Prioritas Sedang & Rendah - Optimalisasi UI & Dokumentasi

-- Bug #8: Klarifikasi RLS policy
-- Tambahkan komentar pada kebijakan RLS Users can view own bookings.
COMMENT ON POLICY "Users can view own bookings" ON public.bookings IS 'Hanya penanggung jawab (customer yang membuat booking) yang dapat melihat data booking ini. Ini adalah desain yang disengaja untuk group booking.';
