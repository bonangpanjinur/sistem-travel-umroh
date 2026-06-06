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

### Gap #1 — Notifikasi ke Finance saat Pembayaran Masuk ✅
- File: `src/components/admin/ManagePaymentModal.tsx`
- Saat customer upload bukti bayar (status → pending), `notifyFinance()` dipanggil
- Toast info menampilkan jumlah staf yang berhasil dinotifikasi via WA

### Gap #2 — Refund Bank Account Form ✅
- File: `src/pages/admin/AdminBookingDetail.tsx` (Refund Dialog)
- Dialog pembatalan booking dengan: alasan pembatalan, jumlah refund (quick %-), metode refund, info rekening/akun tujuan (label adaptif per metode), preview notifikasi ke jamaah
- Mencatat ke tabel `booking_refunds` via `processRefundMutation`

### Gap #3 — Verifikasi Pembayaran: Notif ke Finance ✅
- File: `src/pages/admin/AdminBookingDetail.tsx` (`verifyPaymentMutation.onSuccess`)
- Saat admin approve pembayaran (status → paid), `notifyFinance()` dipanggil agar finance mencatat/mengarsipkan

### Gap #4 — Booking Line Items Detail ✅
- File: `src/pages/admin/AdminBookingDetail.tsx` (sidebar Rincian Tagihan)
- Query ke `booking_line_items` — jika ada, render per baris; jika tidak ada, fallback ke breakdown per tipe jamaah (dewasa/anak/bayi) × tipe kamar dari `booking_passengers`

### Gap #5 — Validasi Kapasitas saat Pindah Paket ✅
- File: `src/components/admin/ChangePackageDialogV2.tsx`
- Menampilkan sisa kuota keberangkatan tujuan
- Kuota penuh → tombol submit diblokir + warning merah
- Kuota hampir habis (≤5) → warning amber tapi tetap bisa submit

### Gap #6 — Note/Catatan History ✅
- File: `src/pages/admin/AdminBookingDetail.tsx` (C1 — Catatan Admin)
- `updateNotesMutation` memanggil `logActivity({ action: 'notes_updated', old_value, new_value })`
- `noteHistory` query dari `audit_logs` ditampilkan di bawah editor catatan

### Gap #7 — Tombol "Catat Pembayaran" di Empty State ✅
- File: `src/pages/admin/AdminBookingDetail.tsx` (Riwayat Pembayaran)
- Tombol "+ Catat Pembayaran" tampil di empty state jika belum ada pembayaran
- Tersedia di dua lokasi: card "Riwayat Pembayaran" (main content) + sidebar (akordion kosong)

### Gap #8 — Company Info Warning ✅
- File: `src/pages/admin/AdminBookingDetail.tsx` (Quick Actions sidebar)
- Banner amber muncul jika nama perusahaan masih default ATAU rekening bank belum dikonfigurasi
- Pesan adaptif tergantung apa yang kosong, dengan link "Lengkapi Sekarang" ke `/admin/settings`

### Gap #9 — Konflik Nomor Kamar ✅
- File: `src/pages/admin/AdminBookingDetail.tsx` (Passenger Manifest)
- `roomNumberConflicts` useMemo mendeteksi nomor kamar yang dipakai lebih dari 1 pax
- Nomor yang bentrok ditampilkan dengan ikon TriangleAlert + warna merah di baris manifest
- Banner warning global juga muncul di header card passengers jika ada konflik

### Gap #10 — Share Link Booking ✅
- File: `src/components/admin/BookingBarcodeModal.tsx`
- Salin link ke clipboard dengan feedback "Tersalin!"
- Tombol "Bagikan WA" membuka wa.me dengan pesan berformat (kode booking, nama, paket, tanggal, link)

### Gap #11 — Timeline Visual ✅
- File: `src/pages/admin/AdminBookingDetail.tsx` (Timeline Aktivitas)
- Merge status history + payment history + booking creation menjadi satu timeline kronologis
- Setiap event punya ikon + warna dot berbeda per tipe status
- Fallback ke status saat ini jika `booking_status_history` kosong

### Gap #12 — Checklist Keberangkatan ✅
- File: `src/components/admin/BookingDepartureChecklist.tsx`
- Dirender di AdminBookingDetail di bawah Timeline Aktivitas
- Paspor, visa, yellow card per jamaah

---

## SARAN FITUR LANJUTAN

### 1. Laporan Reminder ✅
- Daftar semua scheduled + sent reminders lintas booking
- Filter: by status (pending/sent/failed), by booking, by tanggal
- Bulk-send untuk booking yang mendekati jatuh tempo
- **SELESAI** — `AdminLaporanReminder.tsx`, route `/admin/laporan/reminder`

### 2. Boarding Pass Digital ✅
- QR code per jamaah yang bisa discan di counter keberangkatan
- Include: nama, passport no, flight, seat, hotel
- **SELESAI** — `BoardingPassModal.tsx` + `boarding-pass-generator.ts`
- QR code real (bukan placeholder) sekarang tampil di preview card modal
- QR encode URL `/transaksi/:public_token` untuk verifikasi jamaah
- PDF download per jamaah & ZIP bulk download

### 3. Notifikasi Real-time ✅
- Push notification ke browser staf saat pembayaran masuk
- Badge counter di menu admin
- **SELESAI** — `useAdminNotifications.ts` + `AdminLayoutDynamicImproved.tsx`
- Browser Notification API: izin diminta otomatis saat login admin, OS-level popup saat ada pembayaran baru / bukti pembayaran diupload
- Badge counter hijau di sidebar item Pembayaran & Booking (angka = notif belum dibaca)
- Badge juga muncul di grup yang sedang di-collapse

### 4. Komisi Auto-Calculate ✅
- Otomatis hitung komisi agen saat status = 'confirmed'
- Log komisi di tabel terpisah
- **SELESAI** — `useAutoCommission.ts` + `AdminBookingCommissionCard.tsx`
- Auto-trigger sudah terpasang di `AdminBookingDetail.tsx` saat status → 'confirmed'
- Panel **Komisi Booking** baru muncul di sidebar booking detail: tampilkan daftar komisi yang sudah tercatat (agen + parent agen), status masing-masing (pending/approved/paid/rejected), total, tanggal
- Tombol **Hitung Ulang Komisi** jika ingin re-trigger manual
- Jika belum ada komisi, tampil tombol **Hitung Komisi Sekarang** (idempoten — tidak duplikat)

### 5. E-Ticket Generator ✅
- Generate e-ticket PDF per jamaah dari booking detail
- Include QR, flight info, hotel, itinerary
- **SELESAI** — `document-generator.ts` + `BookingDocumentActions.tsx`
- **QR Code** otomatis di-embed di kanan atas e-ticket (encode: `bookingCode|nama|paspor`)
- **Itinerary** — membaca `packages.itinerary` JSON dan menampilkan program hari-per-hari (multi-page jika panjang)
- **Per-jamaah bulk** — jika booking punya 2+ jamaah di manifest, tombol **E-TICKET SEMUA JAMAAH (ZIP)** muncul: satu PDF per jamaah, dikemas jadi ZIP download
- Single download tetap tersedia untuk booking holder

---

## ARSITEKTUR DATA PENTING

### Tabel Utama
- `bookings` — data booking utama
- `booking_passengers` — daftar jamaah per booking
- `payments` — riwayat pembayaran
- `payment_reminders` — jadwal reminder (id, booking_id, reminder_type, scheduled_at, status)
- `booking_status_history` — timeline perubahan status
- `audit_logs` — log hapus pembayaran & edit catatan

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
