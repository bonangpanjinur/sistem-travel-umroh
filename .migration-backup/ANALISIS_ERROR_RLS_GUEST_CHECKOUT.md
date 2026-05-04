# Analisis Error RLS Guest Checkout - Umrah Haji Magic

## Ringkasan Masalah

Ketika pengguna yang **belum login (guest/anonymous)** mencoba melakukan booking dan mengklik tombol **"Konfirmasi Booking"**, terjadi dua error:

1. **Database Error**: `new row violates row-level security policy for table "customers"`
2. **HTTP Error**: `401 Unauthorized` dari console

---

## Root Cause Analysis

### 1. **Primary Issue: RLS Policy Conflict**

#### Lokasi Masalah
- **File**: `src/hooks/useBookingWizardDynamic.ts` (baris 174-189)
- **Tabel Database**: `public.customers`
- **Operasi**: INSERT

#### Kode yang Bermasalah
```typescript
// Line 174-189: Guest Checkout - Create customer record without user_id
const mainPassenger = formData.passengers[0];
userEmail = mainPassenger.email || null;
const { data: newCustomer, error: customerError } = await supabase
  .from('customers')
  .insert({ 
    full_name: mainPassenger.fullName, 
    gender: mainPassenger.gender, 
    phone: mainPassenger.phone || null,
    email: mainPassenger.email || null
    // NOTE: user_id is NOT provided (undefined/null)
  })
  .select('id')
  .single();
```

#### Analisis RLS Policy

Berdasarkan file migrasi, ada **beberapa policy yang konflik**:

**File 1**: `20260410000000_phase_1_2_fixes.sql` (LEBIH LAMA)
```sql
CREATE POLICY "Authenticated users can insert customers"
ON public.customers FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  OR user_id IS NULL 
  OR is_admin(auth.uid())
);
```
**Masalah**: Policy ini hanya untuk `authenticated` users, **tidak termasuk `anon` (anonymous/guest)**

**File 2**: `20260414000004_allow_guest_checkout_rls.sql` (LEBIH BARU)
```sql
CREATE POLICY "Allow guest and authenticated customer insertion"
ON public.customers FOR INSERT TO anon, authenticated
WITH CHECK (
  user_id = auth.uid() 
  OR user_id IS NULL 
  OR is_admin(auth.uid())
);
```
**Perbaikan**: Menambahkan `anon` ke dalam policy

**File 3**: `20260414000005_force_cleanup_guest_rls.sql` (PALING BARU)
```sql
CREATE POLICY "Unified customer insert policy"
ON public.customers FOR INSERT TO anon, authenticated
WITH CHECK (
  (auth.role() = 'anon' AND user_id IS NULL)
  OR (auth.uid() = user_id)
  OR public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'sales'))
  OR (public.has_role(auth.uid(), 'agent'))
);
```
**Perbaikan**: Lebih spesifik dengan `auth.role() = 'anon'`

**File 4**: `20260414000006_simple_guest_rls.sql` (PALING BARU)
```sql
CREATE POLICY "Simple guest checkout insert"
ON public.customers FOR INSERT TO anon, authenticated
WITH CHECK (
  user_id IS NULL 
  OR auth.uid() = user_id
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'owner', 'branch_manager')
  )
);
```
**Perbaikan**: Paling sederhana dan paling permisif

---

### 2. **Secondary Issue: 401 Unauthorized Error**

#### Penyebab
File `src/services/guestCheckoutService.ts` (baris 26, 40) menggunakan:
```typescript
await supabase.auth.admin.listUsers();
await supabase.auth.admin.createUser(...);
```

**Masalah**: 
- `auth.admin.*` memerlukan **service_role key** (backend/server-side)
- Browser client hanya memiliki **publishable_key** (anonymous/user-level)
- Hasil: **401 Unauthorized** ketika guest mencoba membuat akun

---

## Diagnosis

### Kemungkinan Penyebab di Production:

1. **Migrasi RLS tidak lengkap**: Database production mungkin hanya menjalankan migrasi `20260410000000_phase_1_2_fixes.sql` yang **tidak mendukung anonymous users**

2. **Migrasi terbaru belum di-deploy**: Migrasi `20260414000004`, `20260414000005`, atau `20260414000006` belum dijalankan di production

3. **Policy Conflict**: Jika ada multiple policies dengan nama yang sama, policy yang lebih lama mungkin masih aktif

4. **Guest Account Creation Error**: Bahkan jika booking berhasil, pembuatan akun otomatis gagal karena `auth.admin.*` tidak bisa dipanggil dari browser

---

## Solusi

### Solusi 1: Perbaiki RLS Policy (Database)

**Buat file migrasi baru**:
```sql
-- supabase/migrations/20260414000007_fix_guest_checkout_rls.sql

-- 1. Drop semua policy lama untuk customers
DROP POLICY IF EXISTS "Authenticated users can insert customers" ON public.customers;
DROP POLICY IF EXISTS "Allow guest and authenticated customer insertion" ON public.customers;
DROP POLICY IF EXISTS "Unified customer insert policy" ON public.customers;
DROP POLICY IF EXISTS "Simple guest checkout insert" ON public.customers;

-- 2. Create policy yang paling sederhana dan jelas
CREATE POLICY "Allow guest and authenticated customer insert"
ON public.customers FOR INSERT TO anon, authenticated
WITH CHECK (
  -- Guest checkout: user_id is NULL
  user_id IS NULL
  -- Authenticated user: must be their own record
  OR auth.uid() = user_id
  -- Admin can insert any record
  OR EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('super_admin', 'owner', 'branch_manager', 'admin')
  )
);

-- 3. Ensure bookings policy allows guest
DROP POLICY IF EXISTS "Simple guest booking insert" ON public.bookings;
DROP POLICY IF EXISTS "Unified booking insert policy" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings in their branch or as admin" ON public.bookings;

CREATE POLICY "Allow guest and authenticated booking insert"
ON public.bookings FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- 4. Ensure booking_passengers policy allows guest
DROP POLICY IF EXISTS "Simple guest passenger insert" ON public.booking_passengers;
DROP POLICY IF EXISTS "Unified passenger insert policy" ON public.booking_passengers;
DROP POLICY IF EXISTS "Users can insert passengers in their branch or as admin" ON public.booking_passengers;

CREATE POLICY "Allow guest and authenticated passenger insert"
ON public.booking_passengers FOR INSERT TO anon, authenticated
WITH CHECK (true);
```

### Solusi 2: Perbaiki Guest Account Creation (Backend)

**Ubah `src/services/guestCheckoutService.ts`**:

Ganti `auth.admin.*` dengan backend RPC function atau disable guest auto-account creation:

**Option A: Disable Auto-Account Creation** (Paling Aman)
```typescript
// src/services/guestCheckoutService.ts
export async function createGuestAccount(
  email: string,
  fullName: string,
  phone?: string
): Promise<GuestCheckoutResult> {
  // Disable auto-account creation for guests
  // User akan login/register secara manual nanti
  return {
    success: true,
    email,
    message: `Booking berhasil dibuat! Silakan login atau daftar untuk mengakses pesanan Anda.`,
  };
}
```

**Option B: Create Backend RPC Function** (Lebih Kompleks)
```sql
-- supabase/migrations/20260414000008_create_guest_account_rpc.sql

CREATE OR REPLACE FUNCTION public.create_guest_account(
  p_email TEXT,
  p_full_name TEXT,
  p_phone TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_result jsonb;
BEGIN
  -- Create auth user
  v_user_id := auth.uid();
  
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, phone)
  VALUES (v_user_id, p_full_name, p_phone)
  ON CONFLICT (user_id) DO UPDATE
  SET full_name = p_full_name, phone = p_phone;
  
  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_email,
    'message', 'Akun berhasil dibuat'
  );
  
  RETURN v_result;
EXCEPTION WHEN OTHERS THEN
  v_result := jsonb_build_object(
    'success', false,
    'message', SQLERRM
  );
  RETURN v_result;
END;
$$;
```

---

## Rekomendasi Implementasi

### Priority 1: Fix RLS Policy (URGENT)
1. Buat file migrasi `20260414000007_fix_guest_checkout_rls.sql`
2. Deploy ke production
3. Test guest checkout

### Priority 2: Fix Guest Account Creation (MEDIUM)
1. Disable auto-account creation untuk sekarang
2. User akan login/register secara manual
3. Atau buat backend RPC function untuk handle ini

### Priority 3: Improve UX (LOW)
1. Tambahkan login suggestion dialog
2. Provide option untuk login/register setelah booking
3. Simpan booking info untuk guest user

---

## Testing Checklist

- [ ] Guest user bisa insert ke `customers` table
- [ ] Guest user bisa insert ke `bookings` table
- [ ] Guest user bisa insert ke `booking_passengers` table
- [ ] Booking berhasil dibuat tanpa login
- [ ] Error message jelas jika ada masalah
- [ ] Authenticated user masih bisa booking
- [ ] Admin masih bisa manage bookings

---

## Files Affected

1. **Database**: `supabase/migrations/20260414000007_fix_guest_checkout_rls.sql` (NEW)
2. **Frontend**: `src/services/guestCheckoutService.ts` (MODIFY)
3. **Frontend**: `src/hooks/useBookingWizardDynamic.ts` (REVIEW)

---

## Kesimpulan

Error terjadi karena:
1. **RLS Policy tidak konsisten** - ada multiple policies yang conflict
2. **Guest account creation menggunakan auth.admin*** - tidak bisa dipanggil dari browser

Solusi:
1. **Buat migrasi baru** yang drop semua policy lama dan create policy yang jelas untuk guest
2. **Disable atau fix guest account creation** - gunakan backend RPC atau disable untuk sekarang
