
# Rencana Perbaikan: Bug Dashboard Admin & Alur Kerja Kamar

## A. BUG YANG DITEMUKAN

### BUG 1: Menu "Perlengkapan" Mengarah ke Halaman 404 (KRITIS)
Sidebar memiliki 2 link di grup "Perlengkapan":
- `/admin/equipment-assets` (Manajemen Aset)
- `/admin/equipment-maintenance` (Jadwal Maintenance)

Tetapi **tidak ada route** yang terdaftar di `AdminRoutes.tsx` untuk kedua path ini. Klik menu ini akan menampilkan halaman kosong/404.

**Fix:** Hapus grup "Perlengkapan" dari sidebar karena halaman belum dibuat, atau buat halaman placeholder.

---

### BUG 2: Dashboard - Label Status Tidak Diterjemahkan (RENDAH)
Di `AdminDashboard.tsx` baris 169 dan 265, status booking dan pembayaran ditampilkan mentah dalam bahasa Inggris (e.g. "Confirmed", "Pending", "Partial") tanpa label Indonesia.

**Fix:** Gunakan mapping label Indonesia seperti yang sudah ada di `AdminBookings.tsx`.

---

### BUG 3: Dashboard - Pending Payments Tidak Filter per Cabang (MEDIUM)
Di `useDashboardStats.ts` baris 27-30, query `pendingPayments` mengambil **semua** payment pending tanpa filter `branch_id`. Sehingga Branch Manager melihat jumlah pending payment dari seluruh cabang.

**Fix:** Filter pending payments berdasarkan booking yang terkait dengan branch_id.

---

### BUG 4: Dashboard - Upcoming Departures Tidak Filter per Cabang (MEDIUM)
`useUpcomingDepartures()` tidak menerima parameter `branchId` sama sekali. Branch Manager melihat keberangkatan dari semua cabang.

**Fix:** Tambahkan parameter `branchId` dan filter sesuai.

---

## B. ANALISIS ALUR KERJA KAMAR

### Mengapa Menu Kamar Kosong?

Halaman "Kamar" (`AdminRoomAssignments.tsx`) dirancang **hanya** untuk jamaah dengan `room_preference = 'double'` (baris 108). Ini karena tujuan fitur kamar adalah memasangkan 2 jamaah yang memilih tipe kamar sharing/double.

Masalah: Data dummy yang dibuat sebelumnya mengisi `room_preference` dengan nilai `'quad'` dan `'single'`, **bukan** `'double'`. Sehingga query filter `.eq('room_preference', 'double')` tidak mengembalikan hasil apapun.

### Alur Kerja Kamar yang Benar

```text
1. Jamaah booking paket --> pilih tipe kamar (quad/triple/double/single)
2. Admin buka menu Kamar --> pilih Paket --> pilih Keberangkatan
3. Sistem menampilkan jamaah yang perlu dipasangkan (double/sharing)
4. Admin klik "Pasangkan" --> pilih teman sekamar (gender sama)
5. Admin bisa atur nomor kamar
6. Jamaah quad/single tidak perlu pairing manual
```

### Masalah Desain Saat Ini
- Hanya menampilkan jamaah `double`, padahal semua tipe kamar butuh manajemen
- Tidak ada tombol export data kamar (PDF/Excel)
- Tidak ada ringkasan per tipe kamar (quad berapa, double berapa, dll)

---

## C. RENCANA PERBAIKAN

### Fix 1: Hapus Menu "Perlengkapan" yang 404
**File:** `src/components/admin/AdminLayout.tsx`
- Hapus grup "Perlengkapan" (baris 52-58) karena halaman belum ada
- Ini mencegah user mengklik link yang mengarah ke halaman kosong

### Fix 2: Terjemahkan Label Status di Dashboard
**File:** `src/pages/admin/AdminDashboard.tsx`
- Tambahkan mapping label Indonesia untuk status booking dan pembayaran
- Terapkan di chart legend (baris 169) dan recent bookings (baris 265)

### Fix 3: Filter Pending Payments per Cabang
**File:** `src/hooks/useDashboardStats.ts`
- Ubah query pending payments agar join ke bookings dan filter by branch_id
- Tambahkan branchId ke `useUpcomingDepartures()`

### Fix 4: Perbaiki Halaman Kamar - Tampilkan Semua Tipe Kamar
**File:** `src/pages/admin/AdminRoomAssignments.tsx`
- Ubah query agar menampilkan **semua** jamaah (tidak hanya `double`)
- Tampilkan jamaah dikelompokkan per tipe kamar (Quad, Triple, Double, Single)
- Tambahkan tab/filter per tipe kamar
- Tampilkan ringkasan statistik per tipe kamar
- Fitur pairing tetap hanya untuk tipe Double/Sharing

### Fix 5: Tambahkan Export Data Kamar
**File:** `src/pages/admin/AdminRoomAssignments.tsx`
- Tambahkan tombol Export Excel dan Export PDF
- Data export: Nama Jamaah, Gender, Tipe Kamar, Nomor Kamar, Teman Sekamar, Kode Booking

---

## D. DETAIL TEKNIS

| No | Fix | File | Dampak |
|----|-----|------|--------|
| 1 | Hapus menu Perlengkapan (404) | `AdminLayout.tsx` | Sidebar bersih |
| 2 | Label status Indonesia di dashboard | `AdminDashboard.tsx` | UX lebih baik |
| 3 | Filter branch di pending payments & departures | `useDashboardStats.ts` | Data akurat per cabang |
| 4 | Tampilkan semua tipe kamar + grouping | `AdminRoomAssignments.tsx` | Jamaah muncul di menu kamar |
| 5 | Export Excel/PDF data kamar | `AdminRoomAssignments.tsx` | Admin bisa cetak data |

**Total: 4 file diubah, 0 file baru, 0 migrasi database**
