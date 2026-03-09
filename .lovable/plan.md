

# Rencana Perbaikan 5 Fitur Utama

## 1. Paket Tabungan: Perbaikan Alur Lengkap

### Masalah
- SavingsPackages.tsx menggunakan `pkg.price_quad` yang sudah dihapus dari packages (harga kini di departures)
- SavingsRegister.tsx sama: `targetAmount = pkg.price_quad` -- field ini null/0
- Admin SavingsPlans verifikasi menggunakan status `'verified'` yang bukan enum valid (harusnya `'paid'`)
- Tidak ada tombol "Konversi ke Booking" saat tabungan lunas

### Solusi
- **SavingsPackages.tsx**: Filter hanya paket bertipe `umroh` yang punya `savings_target > 0` (kolom sudah ada). Tampilkan `savings_target` sebagai harga, bukan `price_quad`. Cicilan = `savings_target / 12`
- **SavingsRegister.tsx**: Gunakan `savings_target` atau `savings_installment` dari packages sebagai basis kalkulasi
- **AdminSavingsPlans.tsx**: 
  - Ganti status `'verified'` -> `'paid'` di verifyMutation
  - Tambah tombol "Konversi ke Booking" pada plan yang status `completed`
  - Konversi = buat booking baru dari data savings plan (customer, package, amount)

## 2. Tabel Keberangkatan: Perbaikan Layout

### Masalah
Data terlalu padat, kolom hotel dan harga sulit dibaca.

### Solusi
Refaktor tabel menjadi format card-list hybrid:
- **Baris utama**: Tanggal | Paket (nama+kode) | Status | Kuota | Aksi
- **Sub-baris expandable** (klik row): Detail penerbangan, hotel, harga (grid 2x2 yang sudah ada tapi lebih besar)
- Atau: tetap tabel tapi hapus kolom Hotel dari tabel utama, pindahkan ke tooltip/expand. Fokus tabel pada: **Tanggal, Paket, Harga (grid), Kuota, Status, Aksi**
- Tambah indikator warna pada kuota (hijau: banyak, kuning: hampir penuh, merah: penuh)

## 3. Kode Booking: Format TRA + Inisial Paket + Tanggal

### Masalah
Kode saat ini `TRA260301-XXXX` (tanggal+random), tidak ada inisial paket.

### Solusi
- Update fungsi database `generate_booking_code` untuk menerima parameter: `_package_code TEXT`, `_departure_date DATE`
- Format baru: `TRA{package_code}{YYMMDD}{random4}` contoh: `TRAUMR260315A7B2`
- Update semua caller (3 hooks + AdminBookingCreate + AdminLeadDetail) untuk pass parameter baru
- Fallback tetap format lama jika parameter kosong

### Migration SQL
```sql
CREATE OR REPLACE FUNCTION public.generate_booking_code(_package_code TEXT DEFAULT '', _departure_date DATE DEFAULT CURRENT_DATE)
RETURNS TEXT LANGUAGE plpgsql SET search_path TO 'public' AS $$
DECLARE
  new_code TEXT;
  code_exists BOOLEAN;
  pkg_init TEXT;
  date_part TEXT;
BEGIN
  pkg_init := UPPER(SUBSTRING(COALESCE(NULLIF(_package_code, ''), 'XX'), 1, 3));
  date_part := TO_CHAR(_departure_date, 'YYMMDD');
  LOOP
    new_code := 'TRA' || pkg_init || date_part || UPPER(SUBSTRING(md5(random()::text), 1, 4));
    SELECT EXISTS(SELECT 1 FROM public.bookings WHERE booking_code = new_code) INTO code_exists;
    EXIT WHEN NOT code_exists;
  END LOOP;
  RETURN new_code;
END;
$$;
```

## 4. Pengaturan Kamar (Room Number) Tidak Tersimpan

### Masalah
`updateRoomMutation` memanggil `supabase.from('booking_passengers').update({ room_number })` tapi query invalidation mungkin tidak me-refresh data karena RLS atau karena update tidak match.

### Solusi
- Tambah `.select()` pada update mutation untuk memastikan data kembali
- Pastikan `RoomNumberInput` component me-sync `currentValue` saat data berubah (tambah `useEffect` untuk sync state internal)
- Tambah `key={p.room_number}` pada RoomNumberInput agar re-render saat data berubah
- Juga update roommate's room_number saat ada pasangan (double)

## 5. Verifikasi Pembayaran: Perbaikan Alur

### Masalah
- Alur approve/reject sudah ada tapi bukti pembayaran yang belum di-upload tidak ada indikasi yang jelas
- Tidak ada progress pembayaran booking (berapa % sudah dibayar) di halaman ini
- Setelah approve, tidak ada feedback visual bahwa booking status berubah
- Tab "Menunggu" tidak menampilkan konteks booking (total harga, sisa pembayaran)

### Solusi
- **PendingPaymentCard**: Tambah progress bar pembayaran booking (paid_amount/total_price)
- Tambah badge "Belum Ada Bukti" yang mencolok jika `proof_url` null
- Setelah approve/reject, tampilkan toast yang lebih informatif (sisa pembayaran booking)
- Tambah kolom "Sisa Pembayaran" di tabel all-payments
- Tambah alert jika pembayaran ini akan melunasi booking (paid_amount + amount >= total_price)
- Disable tombol "Setujui" jika tidak ada bukti pembayaran

---

## File yang Dimodifikasi

| File | Perubahan |
|:---|:---|
| `src/pages/savings/SavingsPackages.tsx` | Gunakan `savings_target` bukan `price_quad` |
| `src/pages/savings/SavingsRegister.tsx` | Gunakan `savings_target` untuk kalkulasi |
| `src/pages/admin/AdminSavingsPlans.tsx` | Fix status enum, tambah konversi ke booking |
| `src/pages/admin/AdminDepartures.tsx` | Simplify tabel, fokus data penting |
| `src/pages/admin/AdminRoomAssignments.tsx` | Fix RoomNumberInput sync, mutation select |
| `src/pages/admin/AdminPayments.tsx` | Progress bar booking, bukti upload check |
| `src/pages/admin/AdminBookingCreate.tsx` | Pass package_code + departure_date ke RPC |
| `src/hooks/useBookingWizard.ts` | Update generate_booking_code call |
| `src/hooks/useBookingWizardDynamic.ts` | Update generate_booking_code call |
| `src/hooks/useBookingWizardSimple.ts` | Update generate_booking_code call |
| Migration SQL | Update fungsi `generate_booking_code` |

