
# Analisis Lengkap Sistem Travel Umrah & Haji - Rencana Perbaikan dan Pengembangan

## Ringkasan Sistem

Sistem ini adalah ERP & E-Commerce untuk travel Umrah/Haji dengan modul: Booking, CRM, Keuangan, Operasional, HR, Agent, Jamaah Portal, dan Website Builder. Setelah analisis menyeluruh terhadap seluruh fitur, berikut temuan bug dan fitur yang belum lengkap.

---

## BAGIAN A: BUG YANG HARUS DIPERBAIKI

### Bug #1 - useMemo sebagai Side Effect di AdminBookings
**Severity: Medium**
**File:** `src/pages/admin/AdminBookings.tsx` (line 158)

```
useMemo(() => { setCurrentPage(1); }, [...]);
```

Bug ini sama dengan yang sudah diperbaiki di AdminPayments. `useMemo` tidak boleh digunakan untuk side effect (setState). Harus diganti `useEffect`.

### Bug #2 - Tombol "Generate Dokumen" Link Salah di Dashboard
**Severity: Low**  
**File:** `src/pages/admin/AdminDashboard.tsx` (line 71)

Link mengarah ke `/admin/document-generator` (pakai strip) tapi route-nya `/admin/documents-generator` (pakai "s-"). Tombol Quick Action tidak akan bekerja.

### Bug #3 - Tidak Ada Tombol "Buat Booking dari Admin"
**Severity: High**

Admin tidak bisa membuat booking baru untuk jamaah dari dashboard admin. Semua booking harus melalui website publik. Untuk travel umrah, admin sering mendaftarkan jamaah secara manual (walk-in, telepon, WhatsApp).

### Bug #4 - Customer Portal Tidak Ada Navigasi ke /jamaah
**Severity: Medium**

Setelah customer login, tidak ada menu yang jelas mengarahkan ke portal jamaah (`/jamaah`). Customer hanya bisa akses `/my-bookings` dan `/customer/*`. Portal jamaah (Digital ID, Itinerary, Doa) sulit ditemukan.

### Bug #5 - Vendor Cost Belum Terkoneksi ke Keberangkatan
**Severity: Medium**
**File:** `src/pages/admin/AdminVendors.tsx`

Tabel `vendor_costs` ada di database tapi belum ada UI untuk input biaya vendor per keberangkatan. Laporan P&L tidak bisa akurat tanpa data ini.

---

## BAGIAN B: FITUR YANG BELUM ADA TAPI SEHARUSNYA ADA

### Fitur #1 - Buat Booking dari Admin (Admin-side Booking)
**Prioritas: Tinggi**

Travel umrah sangat bergantung pada pendaftaran manual. Admin harus bisa:
- Pilih paket dan keberangkatan
- Input data jamaah (baru atau existing)
- Set tipe kamar dan jumlah pax
- Langsung buat booking tanpa harus melalui website

### Fitur #2 - Invoice / Kwitansi PDF untuk Jamaah
**Prioritas: Tinggi**

Sistem sudah punya `document-generator` tapi belum ada tombol "Cetak Invoice" atau "Cetak Kwitansi" yang mudah diakses dari halaman booking detail admin. Invoice harus bisa:
- Dicetak dari AdminBookingDetail
- Menampilkan info perusahaan, rekening tujuan, rincian paket
- Menyertakan QR code atau nomor referensi

### Fitur #3 - Manajemen Vendor Cost per Keberangkatan
**Prioritas: Tinggi**

Untuk P&L yang akurat, perlu UI untuk mencatat biaya vendor per keberangkatan:
- Biaya hotel Makkah & Madinah
- Biaya tiket pesawat
- Biaya visa
- Biaya handling, transportasi lokal, katering
- Total cost vs total revenue per keberangkatan

### Fitur #4 - Notifikasi Email/WhatsApp Otomatis
**Prioritas: Sedang**

Tabel `whatsapp_templates` dan `email_logs` sudah ada, tapi belum ada trigger otomatis:
- Notifikasi saat booking dibuat
- Reminder pembayaran mendekati deadline
- Konfirmasi pembayaran terverifikasi
- Info keberangkatan H-7, H-3, H-1

### Fitur #5 - Customer Bisa Submit Tiket Support dari Portal
**Prioritas: Sedang**

Tabel `support_tickets` ada dan admin bisa kelola, tapi tidak ada UI di sisi customer/jamaah untuk membuat tiket baru. Customer harus bisa mengajukan keluhan dari portal mereka.

### Fitur #6 - Dashboard Customer yang Lebih Lengkap
**Prioritas: Sedang**

Saat ini customer hanya punya `/my-bookings` dan halaman terpisah. Perlu halaman dashboard utama customer yang menampilkan:
- Ringkasan booking aktif
- Status pembayaran
- Link ke portal jamaah (jika sudah ada keberangkatan)
- Poin loyalty
- Tabungan aktif

### Fitur #7 - Print Manifest & Rooming List ke PDF
**Prioritas: Sedang**

Halaman operasional (Manifest, Rooming List) sudah menampilkan data tapi belum bisa di-export ke PDF yang siap cetak untuk dibawa saat keberangkatan.

---

## BAGIAN C: DETAIL TEKNIS IMPLEMENTASI

### Urutan Implementasi (berdasarkan prioritas)

| No | Item | Tipe | Estimasi |
|----|------|------|----------|
| 1 | Fix useMemo di AdminBookings | Bug Fix | Kecil |
| 2 | Fix link Dashboard "Generate Dokumen" | Bug Fix | Kecil |
| 3 | Admin-side Booking Creation | Fitur Baru | Besar |
| 4 | Vendor Cost per Keberangkatan | Fitur Baru | Sedang |
| 5 | Cetak Invoice dari Booking Detail | Fitur Baru | Sedang |
| 6 | Customer Dashboard + Link Jamaah Portal | Fitur Baru | Sedang |
| 7 | Customer Submit Support Ticket | Fitur Baru | Sedang |
| 8 | Export Manifest/Rooming ke PDF | Fitur Baru | Sedang |
| 9 | Notifikasi Otomatis (WhatsApp/Email) | Fitur Baru | Besar |

### File yang Perlu Diubah/Dibuat

**Bug Fixes:**
- `src/pages/admin/AdminBookings.tsx` - Ganti useMemo ke useEffect
- `src/pages/admin/AdminDashboard.tsx` - Fix link `/admin/document-generator` -> `/admin/documents-generator`

**Fitur Baru - Admin Booking:**
- `src/pages/admin/AdminBookingCreate.tsx` (BARU) - Form booking dari admin
- `src/routes/AdminRoutes.tsx` - Tambah route `/admin/bookings/create`
- `src/pages/admin/AdminBookings.tsx` - Tambah tombol "Buat Booking Baru"

**Fitur Baru - Vendor Cost:**
- `src/pages/admin/AdminDepartures.tsx` - Tambah tab/dialog input biaya vendor per keberangkatan
- Migrasi: Pastikan tabel `vendor_costs` memiliki kolom yang tepat

**Fitur Baru - Invoice:**
- `src/pages/admin/AdminBookingDetail.tsx` - Tambah tombol "Cetak Invoice"
- `src/lib/document-generator.ts` - Pastikan fungsi `generateInvoice` lengkap

**Fitur Baru - Customer Dashboard:**
- `src/pages/customer/CustomerDashboard.tsx` (BARU) - Dashboard utama customer
- `src/routes/CustomerRoutes.tsx` - Tambah route `/customer/dashboard`
- Redirect setelah login ke dashboard yang sesuai role

**Fitur Baru - Support Ticket Customer:**
- `src/pages/customer/CustomerSupport.tsx` (BARU) - Form buat tiket
- `src/routes/CustomerRoutes.tsx` - Tambah route

**Fitur Baru - Export PDF Operasional:**
- `src/pages/operational/ManifestPage.tsx` - Tambah tombol export PDF
- `src/pages/operational/RoomingListPage.tsx` - Tambah tombol export PDF

### Catatan Penting
- Sistem sudah sangat lengkap untuk Fase 2. Perbaikan bug dan fitur di atas adalah penyempurnaan untuk operasional sehari-hari.
- Fitur Admin-side Booking adalah yang paling kritis karena mayoritas travel umrah mendaftarkan jamaah secara manual, bukan online.
- Vendor Cost management sangat penting agar laporan keuangan (P&L) akurat dan bisa digunakan untuk pengambilan keputusan bisnis.
