
# Analisis Bug Frontend Booking & Customer - Rencana Perbaikan

## Bug yang Ditemukan

### BUG 1: Harga di Review Menggunakan Harga Paket, Bukan Harga Keberangkatan (CRITICAL)

**Lokasi:** `StepReviewDynamic.tsx` baris 37-42

Halaman review menampilkan harga dari `packageInfo` (harga paket), padahal harga seharusnya dari tabel `departures` yang sudah dipilih. Sementara `useBookingWizardDynamic.ts` sudah benar menggunakan harga departure saat submit, **UI review menunjukkan harga yang salah** kepada jamaah.

```
// BUG: Menggunakan packageInfo.price_quad bukan departure price
const priceMap = {
  quad: packageInfo.price_quad,    // SALAH
  triple: packageInfo.price_triple, // SALAH
  ...
};
```

**Dampak:** Jamaah melihat harga berbeda di review vs yang sebenarnya di-charge. Ini masalah kepercayaan.

**Fix:** Teruskan harga departure ke `StepReviewDynamic`, bukan harga paket.

---

### BUG 2: Duplikasi Header & Tombol Kembali di Halaman Booking (MINOR)

**Lokasi:** `BookingPage.tsx` + `BookingWizard.tsx`

`BookingPage.tsx` menampilkan header paket + tombol "Kembali ke Detail Paket", lalu `BookingWizard.tsx` juga menampilkan header yang sama + tombol kembali yang sama. Hasilnya ada **dua header dan dua tombol kembali** yang membingungkan.

**Fix:** Hapus header dan tombol kembali dari `BookingPage.tsx` karena `BookingWizard.tsx` sudah menanganinya.

---

### BUG 3: Login Redirect Tidak Menyimpan Query Params Booking (MEDIUM)

**Lokasi:** `ProtectedRoute.tsx` baris 35

Ketika user belum login dan mengakses `/booking/PKG123?departure=DEP1&quad=2`, ProtectedRoute hanya menyimpan `pathname` (`/booking/PKG123`) tanpa query string. Setelah login, user kehilangan pilihan departure dan room allocation.

```
// BUG: Hanya pathname, query params hilang
return <Navigate to={`/auth/login?redirect=${encodeURIComponent(location.pathname)}`} />
```

**Fix:** Sertakan `location.search` dalam redirect URL.

---

### BUG 4: Tombol Upload KTP/Paspor Tidak Berfungsi (MEDIUM)

**Lokasi:** `BookingDetail.tsx` baris 356-382

Tombol "Upload KTP" dan "Upload Paspor" di sidebar hanya tampilan visual tanpa event handler. Tidak ada `onClick` atau `onChange` yang terhubung ke upload logic.

**Fix:** Implementasikan upload handler yang menyimpan dokumen ke storage dan mencatat di tabel `customer_documents`.

---

### BUG 5: Payment Code Dibuat di Client-Side (LOW)

**Lokasi:** `PaymentUpload.tsx` baris 111

```
const paymentCode = `PAY${Date.now().toString(36).toUpperCase()}`;
```

Kode pembayaran dibuat di client, rentan terhadap duplikasi. Seharusnya menggunakan fungsi database `generate_payment_code()` yang sudah ada.

**Fix:** Gunakan `supabase.rpc('generate_payment_code')`.

---

### BUG 6: Validasi Form Booking Lemah (LOW)

**Lokasi:** `BookingWizard.tsx` `canProceed()` baris 255-264

Hanya mengecek nama tidak kosong. Tidak validasi:
- Nomor HP format salah
- Nama terlalu pendek (1 karakter lolos)
- Tipe jamaah bayi/anak tanpa dewasa pendamping

**Fix:** Tambahkan validasi minimum nama 3 karakter dan pastikan ada minimal 1 dewasa.

---

### BUG 7: BookingSuccess Menampilkan room_type Tunggal (COSMETIC)

**Lokasi:** `BookingSuccess.tsx` baris 139

```
Kamar {booking.room_type.charAt(0).toUpperCase() + booking.room_type.slice(1)}
```

Untuk booking multi-tipe kamar, hanya menampilkan tipe kamar "utama" (yang paling banyak), bukan breakdown lengkap. Ini membingungkan jika jamaah pesan campuran Quad + Double.

**Fix:** Tampilkan ringkasan kamar dari `booking_passengers` per tipe.

---

## Rencana Implementasi

### Prioritas 1 - Critical (Harga Salah di Review)

1. Fetch harga departure di `BookingWizard.tsx` (sudah ada query `departure-info`, tinggal tambah field harga)
2. Teruskan `departurePrices` ke `StepReviewDynamic` sebagai prop baru
3. `StepReviewDynamic` gunakan departure prices, bukan package prices

### Prioritas 2 - Medium (Login Redirect & Upload Dokumen)

4. Fix `ProtectedRoute.tsx`: sertakan `location.search` di redirect
5. Fix `PackageBookingForm.tsx` redirect: sertakan query params saat redirect ke login
6. Implementasi upload KTP/Paspor di `BookingDetail.tsx` dengan handler ke Supabase Storage

### Prioritas 3 - Minor/Low

7. Hapus duplikasi header di `BookingPage.tsx`
8. Ganti payment code ke server-side `generate_payment_code()` di `PaymentUpload.tsx`
9. Perbaiki validasi `canProceed()` di `BookingWizard.tsx`
10. Perbaiki tampilan kamar di `BookingSuccess.tsx` untuk multi-tipe

---

## Detail Teknis per File

| File | Perubahan |
|------|-----------|
| `src/components/booking/BookingWizard.tsx` | Tambah departure prices ke query, teruskan ke StepReviewDynamic, perbaiki validasi |
| `src/components/booking/steps/StepReviewDynamic.tsx` | Terima departurePrices prop, gunakan untuk kalkulasi |
| `src/pages/booking/BookingPage.tsx` | Hapus duplikasi header & back button |
| `src/components/auth/ProtectedRoute.tsx` | Tambah `location.search` ke redirect URL |
| `src/pages/customer/BookingDetail.tsx` | Implementasi upload KTP/Paspor |
| `src/pages/customer/PaymentUpload.tsx` | Gunakan RPC `generate_payment_code` |
| `src/pages/booking/BookingSuccess.tsx` | Tampilkan breakdown kamar multi-tipe |

Total: **7 file** yang perlu diubah, **0 migrasi database** (semua fix di frontend).
