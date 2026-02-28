
# Audit Bug Keseluruhan & Rencana Perbaikan

## A. BUG KRITIS (Menyebabkan Error / Crash)

### BUG 1: EquipmentPage - Query Salah untuk Customer
**File:** `src/pages/operational/EquipmentPage.tsx` baris 110
**Masalah:** Query filter menggunakan `.eq("booking_id", selectedDeparture)` tapi `selectedDeparture` adalah ID dari tabel `departures`, bukan `bookings`. Ini menyebabkan query selalu gagal dan fallback ke semua customer.
**Dampak:** Distribusi perlengkapan tidak bisa menampilkan jamaah per keberangkatan yang benar.
**Fix:** Ubah query agar join via bookings yang punya `departure_id` = selectedDeparture:
```sql
booking_passengers.select('customer:customers(id, full_name), booking:bookings!inner(departure_id)')
  .eq('booking.departure_id', selectedDeparture)
```

### BUG 2: DB Error - "column bookings.status does not exist"
**Sumber:** Error di Postgres logs. Kolom yang benar adalah `booking_status` dan `payment_status`, bukan `status`.
**Investigasi:** Error ini muncul dari query yang masuk via API. Setelah audit semua file frontend, tidak ditemukan query `.status` langsung di bookings. Kemungkinan berasal dari edge function `send-whatsapp-trigger` atau `send-whatsapp-notification` yang mengakses `booking.status` alih-alih `booking.booking_status`.
**Fix:** Periksa dan perbaiki edge functions yang mengakses `booking.status`.

### BUG 3: DB Error - "column employees.employee_id does not exist"
**Sumber:** Error di Postgres logs. Kolom yang benar di tabel `employees` adalah `id`, bukan `employee_id`. Kolom `employee_id` hanya ada di tabel lain yang mereferensikan employees.
**Investigasi:** Kemungkinan dari query di halaman HR atau Payroll yang salah mengakses `employees.employee_id`.
**Fix:** Cari dan perbaiki query yang menggunakan `employees.employee_id` menjadi `employees.id`.

---

## B. BUG MEDIUM (Fitur Tidak Berfungsi Optimal)

### BUG 4: useUpcomingDepartures - branchId Diterima tapi Tidak Digunakan
**File:** `src/hooks/useDashboardStats.ts` baris 135-155
**Masalah:** Function menerima parameter `branchId` tapi tidak pernah menerapkan filter `.eq('branch_id', branchId)` ke query. Branch Manager tetap melihat semua keberangkatan.
**Fix:** Tambahkan filter:
```typescript
if (branchId) query = query.eq('branch_id', branchId);
```
Catatan: Tabel `departures` mungkin tidak memiliki kolom `branch_id`. Jika demikian, perlu join via packages atau bookings.

### BUG 5: EquipmentPage - Distribusi Tidak Terintegrasi dengan Keberangkatan
**File:** `src/pages/operational/EquipmentPage.tsx`
**Masalah:** Selain bug query (BUG 1), alur kerja distribusi perlengkapan tidak menampilkan daftar jamaah berdasarkan keberangkatan yang dipilih dengan benar. Customer list selalu fallback ke semua customer.
**Fix:** Perbaiki query agar mengambil passenger list berdasarkan departure_id via inner join ke bookings.

### BUG 6: AdminPayroll - Status Selalu "pending"
**File:** `src/pages/admin/AdminPayroll.tsx` baris 128
**Masalah:** Payroll data selalu di-set `status: 'pending'` secara hardcoded. Tidak ada mekanisme untuk menyimpan status payroll (processed/paid) ke database. Data payroll dihitung on-the-fly dari employees dan attendance, tanpa persistensi.
**Dampak:** Filter status di payroll tidak berguna karena semua data selalu "pending".
**Fix:** Ini adalah limitasi desain. Untuk sekarang, biarkan sebagai kalkulasi. Atau buat tabel `payroll_records` untuk menyimpan hasil payroll yang sudah diproses.

---

## C. BUG RINGAN (UI/UX)

### BUG 7: Sidebar - Menu "Perlengkapan" Route Salah
**File:** `src/components/admin/AdminLayout.tsx` baris 47
**Masalah:** Menu "Perlengkapan" mengarah ke `/admin/equipment`, tapi route di `AdminRoutes.tsx` terdaftar sebagai `/admin/equipment` (baris dari route). Perlu diverifikasi path ini cocok. Dari AdminRoutes, route equipment sudah ada di path `equipment`.
**Status:** Route sudah benar (`/admin/equipment` di sidebar, `equipment` di AdminRoutes). Tidak ada bug di sini.

### BUG 8: AdminBookings - Search Query Rentan SQL Injection-like Issues
**File:** `src/pages/admin/AdminBookings.tsx` baris 99
**Masalah:** Query menggunakan string interpolation langsung:
```typescript
query.or(`booking_code.ilike.%${searchTerm}%,...`)
```
Karakter khusus di searchTerm (seperti `%`, `_`, `(`, `)`) bisa menyebabkan query error atau hasil tidak terduga.
**Fix:** Sanitize searchTerm sebelum digunakan dalam query.

---

## D. RENCANA PERBAIKAN

### Prioritas 1: Fix DB Error (BUG 1, 2, 3)

**File yang diubah:**
1. `src/pages/operational/EquipmentPage.tsx` - Perbaiki query customer agar menggunakan `booking.departure_id` bukan `booking_id`
2. `supabase/functions/send-whatsapp-trigger/index.ts` - Ganti `booking.status` menjadi `booking.booking_status`
3. `supabase/functions/send-whatsapp-notification/index.ts` - Ganti `booking.status` menjadi `booking.booking_status`

### Prioritas 2: Fix Branch Filter (BUG 4)

**File yang diubah:**
1. `src/hooks/useDashboardStats.ts` - Tambahkan filter branchId di `useUpcomingDepartures`. Periksa apakah `departures` punya kolom `branch_id`, jika tidak gunakan subquery via packages.

### Prioritas 3: Sanitize Search (BUG 8)

**File yang diubah:**
1. `src/pages/admin/AdminBookings.tsx` - Escape karakter khusus di searchTerm

---

## E. RINGKASAN

| No | Bug | Severity | File | Status |
|----|-----|----------|------|--------|
| 1 | Equipment query salah (booking_id vs departure_id) | KRITIS | EquipmentPage.tsx | Perlu fix |
| 2 | bookings.status tidak ada (harus booking_status) | KRITIS | Edge functions | Perlu fix |
| 3 | employees.employee_id tidak ada (harus id) | KRITIS | Perlu investigasi | Perlu fix |
| 4 | branchId tidak difilter di upcoming departures | MEDIUM | useDashboardStats.ts | Perlu fix |
| 5 | Distribusi perlengkapan tidak terintegrasi | MEDIUM | EquipmentPage.tsx | Fix via BUG 1 |
| 6 | Payroll status selalu pending | MEDIUM | AdminPayroll.tsx | Desain limitasi |
| 8 | Search query tidak di-sanitize | RINGAN | AdminBookings.tsx | Perlu fix |

**Total: 5-6 file diperbaiki, 0 file baru, 0 migrasi database**
