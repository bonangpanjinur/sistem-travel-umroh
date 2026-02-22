

# Rencana Perbaikan Bug & UI/UX - Jamaah Portal & Sistem Admin

## Bug yang Ditemukan

### BUG 1: Link "/jamaah/documents" Tidak Ada Route-nya (CRITICAL)

**Lokasi:** `JamaahPortal.tsx` baris 278

Quick action "Dokumen" di portal jamaah mengarah ke `/jamaah/documents`, tetapi route ini **tidak terdaftar** di `CustomerRoutes.tsx` maupun file route lainnya. Klik tombol ini akan menampilkan halaman 404.

**Fix:** Buat halaman `JamaahDocuments.tsx` dan daftarkan route-nya, atau arahkan link ke halaman yang sudah ada (misalnya BookingDetail yang sudah punya section dokumen).

---

### BUG 2: Link "/settings" di Bottom Nav Tidak Ada Route (CRITICAL)

**Lokasi:** `JamaahPortal.tsx` baris 444, `JamaahDigitalID.tsx` baris 302, `JamaahItinerary.tsx` baris 274

Semua bottom navigation bar di portal jamaah punya link "Profil" ke `/settings`, tetapi route `/settings` **tidak ada** di seluruh aplikasi. Ini akan menampilkan 404.

**Fix:** Buat halaman `CustomerSettings.tsx` atau arahkan ke `/customer/dashboard` yang sudah ada. Atau buat route alias.

---

### BUG 3: Notifikasi Tidak Filter by User (MEDIUM)

**Lokasi:** `useNotifications.ts` baris 12-18

Query notifikasi mengambil SEMUA notifikasi tanpa filter `user_id`. Jika RLS tidak membatasi per user, jamaah bisa melihat notifikasi milik orang lain.

```typescript
// BUG: tidak ada filter user_id
const { data, error } = await supabase
  .from("notifications")
  .select("*")
  .order("created_at", { ascending: false })
  .limit(20);
```

**Fix:** Tambahkan `.eq("user_id", user.id)` pada query.

---

### BUG 4: LiveLocationShare Menggunakan `as any` Type Cast (LOW)

**Lokasi:** `LiveLocationShare.tsx` baris 67

```typescript
.from("jamaah_live_locations" as any)
```

Tabel `jamaah_live_locations` sudah ada di types, jadi cast `as any` tidak diperlukan dan menyembunyikan potensi error tipe.

**Fix:** Hapus `as any`.

---

### BUG 5: Kontak Darurat Hardcoded (LOW)

**Lokasi:** `JamaahPortal.tsx` baris 399-425, `SOSButton.tsx` baris 205

Nomor telepon darurat (`+6281234567890`, `+966123456789`) di-hardcode. Seharusnya diambil dari `company_settings` atau konfigurasi yang bisa diubah admin.

**Fix:** Query `company_settings` untuk nomor darurat, gunakan hardcoded sebagai fallback.

---

### BUG 6: Bottom Nav Tidak Konsisten antar Halaman Jamaah (MINOR UX)

**Lokasi:** Bottom nav di `JamaahPortal.tsx`, `JamaahDigitalID.tsx`, `JamaahItinerary.tsx`

- `JamaahPortal.tsx` menggunakan icon `Home` untuk Beranda
- `JamaahDigitalID.tsx` menggunakan icon `Plane` untuk Beranda
- `JamaahItinerary.tsx` menggunakan icon `Plane` untuk Beranda
- `JamaahDoaPanduan.tsx` tidak punya bottom nav sama sekali

Inkonsistensi ini membingungkan pengguna.

**Fix:** Buat komponen `JamaahBottomNav` yang dipakai bersama di semua halaman jamaah.

---

### BUG 7: CustomerDashboard Cascade Query Tanpa Loading Guard (MEDIUM)

**Lokasi:** `CustomerDashboard.tsx` baris 33-50

Query bookings bergantung pada `customer?.id` dengan `enabled: !!customer?.id`, tetapi jika user login tanpa data customer (belum terdaftar sebagai jamaah), halaman tetap menampilkan "Belum ada booking" tanpa penjelasan bahwa mereka belum terdaftar sebagai jamaah.

**Fix:** Tambahkan empty state khusus untuk user yang belum punya profil customer.

---

## Kekurangan UI/UX

### UX 1: Tidak Ada Empty State yang Informatif di Portal Jamaah

Ketika jamaah belum punya booking aktif (confirmed/completed), portal hanya menampilkan kartu-kartu tanpa konten. Tidak ada panduan atau CTA untuk membuat booking.

**Fix:** Tampilkan card khusus "Belum ada perjalanan aktif" dengan tombol "Lihat Paket".

### UX 2: Admin Customers Tidak Ada Pagination

`AdminCustomers.tsx` menampilkan semua jamaah tanpa pagination. Dengan ratusan/ribuan jamaah, halaman akan sangat lambat dan sulit digunakan.

**Fix:** Tambahkan pagination seperti yang sudah ada di `AdminBookings.tsx`.

### UX 3: Doa & Panduan Tidak Ada Navigasi Kembali ke Bottom Nav

`JamaahDoaPanduan.tsx` hanya punya tombol back di header tapi tidak ada bottom navigation, berbeda dengan halaman jamaah lainnya.

---

## Rencana Implementasi

### Prioritas 1 - Critical (Route & Link Rusak)

1. Buat komponen `JamaahBottomNav.tsx` yang reusable dengan prop `activeTab`
2. Buat halaman `JamaahDocuments.tsx` sederhana yang menampilkan daftar dokumen jamaah
3. Buat halaman `CustomerSettings.tsx` untuk profil/pengaturan
4. Daftarkan route `/jamaah/documents` dan `/settings` di `CustomerRoutes.tsx`
5. Ganti bottom nav di semua halaman jamaah dengan komponen bersama

### Prioritas 2 - Medium (Data & Logic)

6. Fix `useNotifications.ts`: tambah filter `.eq("user_id", user.id)`
7. Tambahkan empty state informatif di `JamaahPortal.tsx` saat tidak ada booking aktif
8. Tambahkan empty state di `CustomerDashboard.tsx` saat customer belum terdaftar

### Prioritas 3 - Low/Cosmetic

9. Hapus `as any` di `LiveLocationShare.tsx`
10. Tambahkan pagination di `AdminCustomers.tsx`
11. Query nomor darurat dari `company_settings` di `JamaahPortal.tsx` dan `SOSButton.tsx`

---

## Detail Teknis per File

| File | Perubahan |
|------|-----------|
| `src/components/jamaah/JamaahBottomNav.tsx` | **BARU** - Komponen bottom nav reusable |
| `src/pages/jamaah/JamaahDocuments.tsx` | **BARU** - Halaman dokumen jamaah |
| `src/pages/customer/CustomerSettings.tsx` | **BARU** - Halaman pengaturan profil |
| `src/routes/CustomerRoutes.tsx` | Tambah 2 route baru |
| `src/pages/jamaah/JamaahPortal.tsx` | Ganti bottom nav, tambah empty state, fix link |
| `src/pages/jamaah/JamaahDigitalID.tsx` | Ganti bottom nav dengan komponen bersama |
| `src/pages/jamaah/JamaahItinerary.tsx` | Ganti bottom nav dengan komponen bersama |
| `src/pages/jamaah/JamaahDoaPanduan.tsx` | Tambah bottom nav |
| `src/hooks/useNotifications.ts` | Tambah filter user_id |
| `src/pages/customer/CustomerDashboard.tsx` | Tambah empty state untuk user tanpa customer profile |
| `src/components/jamaah/LiveLocationShare.tsx` | Hapus `as any` type cast |
| `src/pages/admin/AdminCustomers.tsx` | Tambah pagination |

Total: **3 file baru** + **9 file diubah**, **0 migrasi database**

