

# Rencana Perbaikan Bug & Kekurangan Fitur

## Temuan Kritis

### BUG 1: Kamar -- Nomor Kamar Tidak Bisa Disimpan (ROOT CAUSE DITEMUKAN)
**Penyebab**: Tabel `booking_passengers` **tidak punya RLS policy UPDATE**. Hanya ada policy SELECT (3) dan INSERT (1). Saat admin update `room_number`, Supabase diam-diam menolak karena tidak ada policy yang mengizinkan UPDATE.

**Solusi**: Tambah migration SQL:
```sql
CREATE POLICY "Staff can update passengers"
ON public.booking_passengers FOR UPDATE
TO public
USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operational'::app_role))
WITH CHECK (is_admin(auth.uid()) OR has_role(auth.uid(), 'operational'::app_role));
```

**File**: Migration SQL baru saja.

---

### BUG 2: Tabungan -- Masih Pakai `price_quad` dari Packages (Null/0 untuk Paket Baru)
**Penyebab**: `SavingsPackages.tsx` line 25 filter `.gt('price_quad', 0)` dan line 142 tampilkan `pkg.price_quad / 12`. `SavingsRegister.tsx` line 64 `target = pkg.price_quad`. Paket baru yang dibuat setelah refaktor form akan punya `price_quad = 0`.

**Solusi**: 
- Karena `savings_target` dan `savings_installment` semua = 0 di database, dan `price_quad` masih ada data (20jt, 25jt, dst), maka gunakan fallback: `savings_target > 0 ? savings_target : price_quad`
- `SavingsPackages.tsx`: ubah filter dan display
- `SavingsRegister.tsx`: ubah kalkulasi target

**File**: `SavingsPackages.tsx`, `SavingsRegister.tsx`

---

### BUG 3: Kode Booking -- Fungsi Lama Belum Dihapus
Ada 2 versi `generate_booking_code` di database. Yang lama (tanpa parameter) masih ada. Hooks masih memanggil versi lama karena tidak pass parameter.

**Solusi**: Periksa semua caller dan pastikan memanggil versi baru dengan parameter.

**File**: `useBookingWizard.ts`, `useBookingWizardDynamic.ts`, `useBookingWizardSimple.ts`

---

### BUG 4: PackageCard -- forwardRef Warning
`PackageCard.tsx` meneruskan ref ke `Badge` yang bukan forwardRef component. Warning muncul di console.

**Solusi**: Wrap Badge content atau hapus ref passing.

**File**: `PackageCard.tsx`

---

### BUG 5: Tabungan Admin -- Tidak Ada Tombol "Konversi ke Booking"
Saat savings plan status `completed`, seharusnya ada opsi untuk mengonversi ke booking. Saat ini hanya ada tombol "Detail".

**Solusi**: Tambah tombol "Konversi ke Booking" di kolom aksi untuk plan dengan status `completed`.

**File**: `AdminSavingsPlans.tsx`

---

### BUG 6: Agent Register -- Masih Pakai `price_quad` dari Packages
`AgentRegister.tsx` dan `AgentRegisterGroup.tsx` ambil harga dari `packages.price_quad` bukan dari `departures`. Setelah refaktor, harga ada di departures.

**Solusi**: Ubah untuk ambil harga dari departure yang dipilih, bukan dari package.

**File**: `AgentRegister.tsx`, `AgentRegisterGroup.tsx`

---

### BUG 7: BookingWizard -- Masih Fetch `price_quad` dari Packages
`BookingWizard.tsx` line 52 masih fetch `price_quad, price_triple, price_double, price_single` dari packages. Padahal sudah refaktor harga ke departures.

**Solusi**: Hapus fetch harga dari packages, gunakan harga dari departures saja.

**File**: `BookingWizard.tsx`

---

## Kekurangan Fitur

### 1. Pembayaran (AdminPayments) -- Proof Dialog Tidak Bisa Approve/Reject dari Tabel
Tab "Semua Pembayaran" sudah punya tombol Setujui/Tolak yang baik. Proof dialog juga bisa approve. Namun **tidak ada konfirmasi ulang** sebelum approve -- langsung eksekusi. Sebaiknya tambah konfirmasi.

### 2. Keberangkatan (AdminDepartures) -- Tabel Terlalu Padat
Kolom Hotel dan Penerbangan memakan banyak space. Bisa diperbaiki dengan expandable rows.

### 3. Tabungan -- Tidak Ada Fitur Input Pembayaran Manual
Admin hanya bisa verifikasi pembayaran yang sudah ada, tapi tidak bisa input pembayaran cicilan secara manual (misalnya pembayaran cash di kantor).

---

## Ringkasan Perbaikan yang Akan Diimplementasi

| # | Prioritas | Perbaikan | File |
|:--|:----------|:----------|:-----|
| 1 | **KRITIS** | Tambah UPDATE RLS policy pada `booking_passengers` | Migration SQL |
| 2 | **KRITIS** | Fix tabungan pakai fallback `savings_target \|\| price_quad` | `SavingsPackages.tsx`, `SavingsRegister.tsx` |
| 3 | **TINGGI** | Fix agent register ambil harga dari departures | `AgentRegister.tsx`, `AgentRegisterGroup.tsx` |
| 4 | **TINGGI** | Fix BookingWizard hapus harga packages, pakai departures | `BookingWizard.tsx` |
| 5 | **SEDANG** | Tambah tombol "Konversi ke Booking" di tabungan lunas | `AdminSavingsPlans.tsx` |
| 6 | **SEDANG** | Fix PackageCard forwardRef warning | `PackageCard.tsx` |
| 7 | **RENDAH** | Hapus fungsi `generate_booking_code` lama (tanpa parameter) | Migration SQL |

