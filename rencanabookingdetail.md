# Rencana Pengembangan: Booking Detail

## Status Per: Juni 2026

---

## FITUR YANG SUDAH SELESAI ✅

### Fase 6 — Booking UX
- **Passenger avatar previews** — avatar inisial di manifest jamaah
- **Departure quota progress bar** — visual sisa kursi di form tambah booking
- **Konfirmasi sebelum submit** — dialog konfirmasi di AdminBookingCreate

### Quick Invoice Sheet
- File: `src/components/admin/QuickInvoiceSheet.tsx`
- Slide-over panel dari booking detail
- Preview inline invoice, atur due date, kirim WA/email, download PDF
- Terintegrasi ke AdminBookingDetail menggantikan tombol "CETAK INVOICE PDF"

### Payment Reminder Scheduler
- File: `src/components/admin/PaymentReminderScheduler.tsx`
- Slot H-7, H-3, H-1 sebelum jatuh tempo
- Toggle WA + email per slot, simpan ke tabel `payment_reminders`
- Tombol "Kirim Sekarang" → API server → fallback wa.me
- Tampil di AdminBookingDetail di bawah Riwayat Pembayaran (hanya jika belum lunas)

### Halaman Transparansi Transaksi (Public)
- File: `src/pages/public/PublicBookingDetail.tsx`
- Route: `/transaksi/:token` — tidak memerlukan login
- Diakses via QR Code di invoice
- Menampilkan:
  - Company branding (logo, nama, tagline, badge Terverifikasi)
  - Kode booking + status booking + status bayar
  - Paket, tanggal, hotel Makkah, maskapai, durasi, pax, kamar
  - Daftar jamaah (nama, tipe, kamar) dengan avatar inisial
  - Progress bayar: total/dibayar/sisa + bar + riwayat setoran
  - Countdown jatuh tempo (merah jika lewat)
  - Info rekening pembayaran
  - Dokumen: ringkasan inline + Download Invoice PDF + Cetak Halaman
  - Hubungi Kami: WhatsApp, telepon, email, alamat
  - Trust footer + print CSS

### Alert Jatuh Tempo Terlewat (BARU)
- Banner merah besar di atas halaman AdminBookingDetail
- Tampil jika payment_deadline sudah lewat DAN payment_status bukan 'paid'
- Menampilkan: hari keterlambatan, sisa bayar, quick link ke reminder scheduler
- Juga ada highlight pada baris "Batas Bayar" di card pembayaran

### Hotel & Maskapai di AdminBookingDetail (BARU)
- Query terpisah untuk objek hotel dan airline menggunakan FK IDs
- Tampil di seksi Detail Paket & Keberangkatan
- Menampilkan: nama hotel, kota, bintang (star rating), nama maskapai
- Fallback ke string fields jika objek tidak tersedia

---

## GAP YANG DITEMUKAN (Belum Diimplementasikan)

### 🔴 Prioritas Tinggi

| # | Gap | Lokasi | Catatan |
|---|-----|--------|---------|
| 1 | **Notifikasi ke Finance saat ada pembayaran masuk** | ManagePaymentModal | Customer submit bukti → auto notif WA ke staff finance |
| 2 | **Refund Bank Account Form** | Cancellation workflow | Saat ubah status → "refunded", paksa isi no. rek tujuan + nama |
| 3 | **Verifikasi pembayaran: notif ke finance** | AdminBookingDetail | Tombol "Verifikasi" hanya ada, tapi tidak ada notif menunggu verifikasi |

### 🟡 Prioritas Menengah

| # | Gap | Lokasi | Catatan |
|---|-----|--------|---------|
| 4 | **Booking Line Items Detail** | Seksi pembayaran | Tabel dewasa/anak/bayi dengan harga masing-masing dari `booking_line_items` |
| 5 | **Validasi kapasitas saat Pindah Paket** | ChangePackageDialogV2 | Cek sisa quota sebelum allow pindah |
| 6 | **Note/Catatan history** | AdminBookingDetail | Log siapa edit, kapan, dari isi apa ke apa |
| 7 | **Tombol "Catat Pembayaran" di empty state** | Seksi Riwayat Pembayaran | Shortcut langsung ke form tambah jika belum ada pembayaran |
| 8 | **Company info warning** | AdminBookingDetail | Peringatan jika company_settings kosong sebelum generate PDF |

### 🟢 Nice to Have

| # | Gap | Lokasi | Catatan |
|---|-----|--------|---------|
| 9 | **Konflik nomor kamar** | Passenger manifest | Warning jika 2 pax di nomor kamar yang sama |
| 10 | **Share link booking** | BookingBarcodeModal | Tombol salin link + kirim WA dari dalam modal |
| 11 | **Timeline visual** | Riwayat Status | Format timeline vertikal bergambar, bukan list teks |
| 12 | **Checklist keberangkatan** | Passenger manifest | Paspor/visa/yellow card sudah lengkap semua pax? |

---

## SARAN FITUR LANJUTAN

### 1. Laporan Reminder
- Daftar semua scheduled + sent reminders lintas booking
- Filter: by status (pending/sent/failed), by booking, by tanggal
- Bulk-send untuk booking yang mendekati jatuh tempo

### 2. Boarding Pass Digital
- QR code per jamaah yang bisa discan di counter keberangkatan
- Include: nama, passport no, flight, seat, hotel

### 3. Notifikasi Real-time
- Push notification ke browser staf saat pembayaran masuk
- Badge counter di menu admin

### 4. Komisi Auto-Calculate
- Otomatis hitung komisi agen saat status = 'confirmed'
- Log komisi di tabel terpisah

### 5. E-Ticket Generator
- Generate e-ticket PDF per jamaah dari booking detail
- Include QR, flight info, hotel, itinerary

---

## ARSITEKTUR DATA PENTING

### Tabel Utama
- `bookings` — data booking utama
- `booking_passengers` — daftar jamaah per booking
- `payments` — riwayat pembayaran
- `payment_reminders` — jadwal reminder (id, booking_id, reminder_type, scheduled_at, status)
- `booking_status_history` — timeline perubahan status
- `audit_logs` — log hapus pembayaran

### Field Kritis
- `bookings.public_token` — token untuk URL QR publik `/transaksi/:token`
- `bookings.payment_deadline` — jatuh tempo pembayaran
- `departures.hotel_makkah_id` / `hotel_madinah_id` / `airline_id` — FK ke objek hotel/airline
- `payment_reminders.reminder_type` — encoding: "h7_wa", "h3_wa", "h1_wa", "h7_email", "h3_email", "h1_email"

### RPC Functions
- `get_public_booking_by_token(p_token)` — data publik booking via token (tanpa auth)

### File Generator
- `src/lib/document-generator.ts` — `generateInvoice()`, `InvoiceDataExtended`
- `src/lib/transaction-form-generator.ts` — `generateTransactionForm()`, `previewTransactionForm()`

---

## CATATAN TEKNIS

- **vite.config.ts** — JANGAN dimodifikasi, hot-reload menyebabkan crash
- **API server** — FAILED (pre-existing missing packages), semua operasi Supabase langsung dari frontend
- **app_role enum valid** — hanya: `super_admin`, `owner`, `branch_manager`, `operational`, `sales`, `agent`
- **Migration pattern** — file SQL di `api-server/src/sql/`, step eksplisit di `runMigrations.ts`
- Harga anak/balita menggunakan `child_price_percent` / `infant_price_percent` di departures + packages
