

# Rencana Perbaikan & Pengembangan 10 Poin

## 1. Fix Tabungan: Savings Plan Insert Error

**Masalah**: `savings_plans` table has `remaining_amount` column (numeric). Saat insert dari `SavingsRegister.tsx` line 114-127, field `remaining_amount` tidak diisi -- tapi kolom ini mungkin NOT NULL tanpa default, sehingga gagal insert. Juga, jika `price_quad = 0` dan `savings_target = 0` maka `targetAmount = 0` yang tidak valid.

**Solusi**:
- Tambah `remaining_amount: targetAmount` di insert statement `SavingsRegister.tsx`
- Validasi `targetAmount > 0` sebelum submit, tampilkan error jika 0
- Pastikan `SavingsPackages.tsx` filter hanya paket dengan target > 0

**File**: `SavingsRegister.tsx`

---

## 2. Booking Page: Card Harga Tertutup saat Scroll

**Masalah**: Card ringkasan harga di `SavingsRegister.tsx` menggunakan `sticky top-24`. Di `BookingWizard.tsx` tidak ada card bantuan/harga sticky, tapi di `PackageDetail` mungkin ada. Perlu cek apakah ini tentang booking wizard atau package detail page.

**Solusi**: 
- Pada card sticky summary, tambah `z-10` dan `max-h-[calc(100vh-120px)] overflow-y-auto` agar tidak menutupi konten dan tetap scrollable
- Tambah `pb-20` pada container utama untuk memberi ruang scroll bawah

**File**: `SavingsRegister.tsx`, dan halaman booking terkait

---

## 3. Tabungan: Rencana Perbaikan & Pengembangan Lengkap

**Masalah**: Fitur tabungan belum lengkap -- tidak ada fitur bayar cicilan, progress tracking di portal jamaah, dan konversi ke booking.

**Pengembangan**:
- **Admin**: Tambah tombol "Input Pembayaran Manual" di `AdminSavingsPlans.tsx` untuk cicilan cash
- **Portal Jamaah**: Buat halaman `MySavings.tsx` yang menampilkan progress bar, riwayat cicilan, dan upload bukti bayar
- **Notifikasi**: Kirim reminder cicilan mendekati jatuh tempo
- **Konversi**: Tombol "Konversi ke Booking" sudah ada di plan sebelumnya, pastikan functional

**File**: `AdminSavingsPlans.tsx`, `MySavings.tsx`

---

## 4. Kamar: Auto-Pair Cross-Booking & Room Sync

**Masalah**: Saat ini auto-pair hanya untuk tipe Double. User ingin:
1. Isi nomor kamar di A → teman sekamar B otomatis ikut nomor yang sama
2. Cross-booking: jamaah dari transaksi berbeda dengan tipe kamar sama + gender sama → otomatis disatukan
3. Frontend (website buyer) juga harus support pairing

**Solusi**:
- **Room Number Sync**: Di `updateRoomMutation`, jika passenger punya `roommate_id`, update `room_number` roommate juga secara otomatis
- **Auto-Group untuk Triple/Quad**: Tambah logik auto-assign yang mengelompokkan jamaah per gender untuk triple (3 orang) dan quad (4 orang) lintas booking
- **Auto-Pair Double Cross-Booking**: Sudah ada di `autoAssignMutation` tapi hanya untuk booking yang sama departure. Perluas untuk cross-booking (sudah cross karena query by departure_id, bukan booking_id -- **sudah benar**)
- **Room number sync**: Saat save room_number untuk 1 orang, update semua roommate/groupmate yang punya roommate_id saling terkait

**File**: `AdminRoomAssignments.tsx` (updateRoomMutation, autoAssignMutation diperluas ke triple/quad)

---

## 5. PIC (Person In Charge) di Booking

**Masalah**: Tabel `bookings` sudah punya `branch_id`, `agent_id`, `sales_id`. Tapi form booking (frontend & admin) tidak mengisi field ini. User ingin setiap booking punya PIC (pusat/cabang/agen).

**Solusi**:
- **Frontend (BookingWizard)**: Jika user mengakses via branch website (`/b/:slug`), auto-set `branch_id`. Jika via agent website (`/a/:slug`), auto-set `agent_id`. Jika via pusat, branch_id = null (pusat)
- **Admin (AdminBookingCreate)**: Tambah dropdown PIC (Pusat/Cabang/Agen) di step 4 atau di form
- **Display**: Tampilkan PIC di `AdminBookings.tsx` dan `AdminBookingDetail.tsx`
- **Database**: Field sudah ada, hanya perlu diisi saat insert

**File**: `useBookingWizardDynamic.ts`, `AdminBookingCreate.tsx`, `BookingWizard.tsx`, `AdminBookings.tsx`

---

## 6. Reminder Piutang Jamaah

**Masalah**: Piutang (AR) di `AdminFinanceAR.tsx` hanya menampilkan data. Tidak ada fitur reminder.

**Solusi**:
- Tambah tombol "Kirim Reminder" per row di tabel piutang
- Opsi kirim via: WhatsApp (edge function sudah ada), notifikasi in-app (tabel `notifications`)
- Tambah kolom "Terakhir Diingatkan" di display
- Untuk reminder otomatis: buat cron job yang cek piutang > 7 hari jatuh tempo → kirim notifikasi

**File**: `AdminFinanceAR.tsx`, edge function baru atau gunakan yang ada

---

## 7. Website Cabang/Agen: Auto-Set PIC saat Booking

**Masalah**: Cabang dan agen punya website masing-masing (`/b/:slug`, `/a/:slug`). Saat booking dari website mereka, PIC harus otomatis terisi.

**Solusi**:
- `BranchWebsite.tsx` dan `AgentWebsite.tsx` sudah ada. Saat user klik booking dari sana, URL harus membawa parameter `branch_id` atau `agent_id`
- Di `useBookingWizardDynamic.ts`, baca parameter dari URL dan include di booking insert
- Alternatively, detect dari current route path (`/b/:slug` → lookup branch_id, `/a/:slug` → lookup agent_id)

**File**: `BookingWizard.tsx`, `useBookingWizardDynamic.ts`, `PackageDetail.tsx`

---

## 8. Integrasi PIC di Semua Menu

**Masalah**: PIC (branch_id, agent_id, sales_id) harus konsisten di seluruh sistem.

**Solusi**:
- **Bookings list**: Tampilkan kolom PIC (nama cabang/agen/sales)
- **Payments**: Filter by PIC
- **Reports**: Breakdown per PIC
- **Dashboard**: Stats per PIC jika user = branch_manager

**File**: `AdminBookings.tsx`, `AdminPayments.tsx`, `AdminDashboard.tsx`

---

## 9. Absensi Manual oleh HR/Owner

**Masalah**: Saat ini absensi hanya via GPS/face recognition. Perlu fallback manual.

**Solusi**:
- Tambah tombol "Absen Manual" di tab Absensi (`AdminHR.tsx`)
- Dialog: pilih karyawan, tanggal, jam masuk/keluar, status (hadir/izin/sakit/cuti), alasan
- Insert ke `attendance_records` dengan flag `is_manual = true`
- Akses: hanya `super_admin` dan `owner` (cek di frontend via `useAuth` roles)
- Untuk pengaturan hak akses: tambah toggle di HR Settings "Izinkan Absensi Manual"

**File**: `AdminHR.tsx` (tab attendance), migration untuk kolom `is_manual`

---

## 10. Bug Tema Reload: Flash of Default Theme

**Masalah**: Saat halaman di-reload, CSS variables dari `index.css` diterapkan dulu (emerald green theme). Lalu `ThemeProvider` fetch `website_settings` dari database dan override -- tapi ada delay ~500ms sehingga user melihat "flash" tema berbeda.

**Solusi**:
- Cache settings di `localStorage` pada `ThemeProvider`
- Saat mount, baca dari localStorage dulu dan terapkan CSS variables segera (sebelum fetch)
- Setelah fetch selesai, update localStorage dan CSS variables
- Ini menghilangkan flash karena cached theme diterapkan synchronously

**File**: `ThemeProvider.tsx`

---

## Prioritas Implementasi

| # | Prioritas | Item |
|:--|:----------|:-----|
| 1 | **KRITIS** | Fix tabungan insert error (remaining_amount) |
| 10 | **KRITIS** | Fix tema flash on reload (localStorage cache) |
| 4 | **TINGGI** | Kamar auto-sync room number & cross-booking grouping |
| 5+7 | **TINGGI** | PIC di booking (frontend + admin + auto dari branch/agent website) |
| 2 | **SEDANG** | Fix card sticky overlap saat scroll |
| 9 | **SEDANG** | Absensi manual HR |
| 3 | **SEDANG** | Pengembangan tabungan (cicilan manual, progress) |
| 6 | **SEDANG** | Reminder piutang |
| 8 | **RENDAH** | PIC display di semua menu |

## File yang Dimodifikasi

| File | Perubahan |
|:---|:---|
| `SavingsRegister.tsx` | Fix insert (remaining_amount), validasi target > 0 |
| `SavingsPackages.tsx` | Filter paket valid, fix sticky card |
| `ThemeProvider.tsx` | LocalStorage cache untuk prevent flash |
| `AdminRoomAssignments.tsx` | Room sync, auto-group triple/quad, cross-booking |
| `useBookingWizardDynamic.ts` | Tambah branch_id/agent_id dari context |
| `AdminBookingCreate.tsx` | Dropdown PIC |
| `BookingWizard.tsx` | Pass PIC dari route context |
| `AdminHR.tsx` | Absensi manual dialog |
| `AdminFinanceAR.tsx` | Tombol reminder piutang |
| `AdminBookings.tsx` | Tampilkan kolom PIC |
| Migration SQL | Kolom `is_manual` di attendance_records |

