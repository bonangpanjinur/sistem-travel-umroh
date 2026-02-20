
# Perbaikan: Featured Image, Menu Keuangan, dan Analisis Bug

## 1. Featured Image Paket (Sudah Upload)

Setelah diperiksa, form paket (`PackageForm.tsx`) **sudah menggunakan upload file** ke storage `website-assets`. Tidak ada input URL teks. Fitur ini sudah berfungsi dengan benar:
- Upload gambar dengan preview
- Validasi format dan ukuran (maks 5MB)
- Tombol hapus dan ganti gambar

**Status: Tidak perlu perubahan.**

---

## 2. Menu Keuangan yang Hilang

### Masalah Ditemukan
- Route `/admin/coupons` (Kupon/Diskon) **ada di router** tapi **tidak ada di sidebar** navigation
- "Pembayaran" berada di grup "Sales & CRM" padahal lebih cocok di grup "Keuangan"

### Perbaikan
Perbarui `AdminLayout.tsx` sidebar navigation:
- Pindahkan "Pembayaran" ke grup **Keuangan**
- Tambahkan "Kupon" ke grup **Sales & CRM** (karena kupon terkait promosi penjualan)

Struktur baru grup Keuangan:
```
Keuangan
  - Pembayaran (dipindahkan dari Sales & CRM)
  - Laba/Rugi
  - Kas & Gaji
  - Vendor
```

Grup Sales & CRM:
```
Sales & CRM
  - CRM Leads
  - Booking
  - Kupon (baru ditambahkan)
```

---

## 3. Analisis Bug dan Error

### Bug yang Teridentifikasi

| No | Masalah | Severity | File |
|----|---------|----------|------|
| 1 | Route `/admin/coupons` tidak muncul di sidebar | Medium | `AdminLayout.tsx` |
| 2 | `Select` komponen di `PackageForm.tsx` menggunakan `defaultValue` bukan `value` -- nilai tidak update saat edit | Medium | `PackageForm.tsx` |
| 3 | Verifikasi pembayaran di `AdminPayments.tsx` menghitung `paid_amount` manual padahal sudah ada trigger `update_booking_paid_amount` -- bisa terjadi double counting | High | `AdminPayments.tsx` |
| 4 | `useMemo` digunakan sebagai side effect (line 220 di AdminPayments) untuk reset `currentPage` -- seharusnya `useEffect` | Low | `AdminPayments.tsx` |
| 5 | `AdminFinancePL.tsx` cast `dep.package` sebagai `any` berulang kali -- rentan error jika `package` null | Low | `AdminFinancePL.tsx` |
| 6 | Employee device fingerprint berbasis UA/screen/timezone sangat mudah di-spoof | Info | `EmployeeAttendance.tsx` |

### Rencana Perbaikan per Item

**Bug #1 - Menu sidebar hilang** (Perbaikan utama)
- Tambahkan "Kupon" ke sidebar navigation dan pindahkan "Pembayaran"

**Bug #2 - Select defaultValue di PackageForm**
- Ganti `defaultValue` menjadi `value` pada Select untuk hotel, airline, muthawif agar nilai terupdate saat edit paket

**Bug #3 - Double counting pembayaran**
- Hapus logika manual update `paid_amount` di `AdminPayments.tsx` karena sudah ditangani oleh database trigger `update_booking_paid_amount` yang berjalan otomatis saat status payment berubah

**Bug #4 - useMemo sebagai side effect**
- Ganti `useMemo` ke `useEffect` untuk reset pagination saat filter berubah

**Bug #5 - Null safety di Finance P&L**
- Tambahkan null check pada akses `dep.package?.name` dan `dep.package?.code`

---

## Detail Teknis

### File yang Dimodifikasi

| File | Perubahan |
|------|-----------|
| `AdminLayout.tsx` | Tambah menu Kupon, pindahkan Pembayaran ke Keuangan |
| `PackageForm.tsx` | Ganti `defaultValue` ke `value` di Select komponen |
| `AdminPayments.tsx` | Hapus manual paid_amount update (sudah ada trigger DB), fix useMemo ke useEffect |
| `AdminFinancePL.tsx` | Null-safe access untuk package data |

### Urutan Implementasi

1. Fix sidebar navigation (AdminLayout.tsx)
2. Fix PackageForm Select values
3. Fix AdminPayments double-counting dan useMemo
4. Fix null safety di AdminFinancePL
