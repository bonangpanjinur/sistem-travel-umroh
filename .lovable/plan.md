## Analisis Menu "Kelola Booking"

### Cakupan analisis
1. `pages/admin/AdminBookings.tsx` — daftar booking (955 baris)
2. `pages/admin/AdminBookingCreate.tsx` — wizard pembuatan booking (1.115 baris)
3. `pages/admin/AdminBookingDetail.tsx` — halaman detail (2.572 baris)
4. `lib/document-generator.ts` (1.262), `document-generator-v2.ts` (976), `transaction-form-generator.ts` (634), `booking-pdf-exporter*.ts` — generator dokumen PDF
5. Relasi data ke `bookings`, `booking_passengers`, `departures`, `customers`, `payments`, `agents`, `branches`, `invoice_templates`, `bank_accounts`

---

### Temuan utama

**A. Halaman Daftar (`AdminBookings.tsx`)**
- Konfigurasi gaya Excel di-build inline 2x (sekitar 80 baris terduplikasi di tombol Export & tombol Unduh Statistik) — wajib diekstrak.
- Filter `packageFilter` melakukan query tambahan ke `departures` untuk resolve ID — bekerja, tapi `filterOptions.packages` hanya dibangun dari halaman aktif (20 baris) sehingga dropdown filter tidak konsisten antar halaman.
- Pencarian pakai `customer_id.in.(select id from customers ...)` lewat PostgREST — rapuh & tidak mendukung sanitasi penuh; lebih baik pakai RPC search atau view.
- Statistik "halaman ini" (`stats.total/pending/confirmed`) menyesatkan: hanya menghitung 20 baris terlihat, bukan total filter.
- Warna status hard-coded (`text-yellow-600`, `text-green-600`, dll.) — bukan token semantik.
- Reminder WA via `fetch('/api/whatsapp/...')` di list — tidak ada loading state per-baris.

**B. Wizard Pembuatan (`AdminBookingCreate.tsx`)**
- Step 4 (Jamaah) bekerja, tapi: harga ditaruh di `base_price = prices[dominantRoom]` — salah konsep saat kombinasi kamar campuran (Quad+Single). `total_price` benar (terjumlah), tapi `base_price` tidak merepresentasikan apapun.
- `room_type` booking = "dominant" → kehilangan informasi alokasi sebenarnya. Semua passenger menerima `room_preference` benar, tapi field `bookings.room_type` jadi tidak akurat untuk laporan.
- `useEffect` resync passenger dependency hanya `[roomAllocation]` → eslint-deps tidak dideklarasikan; bisa overwrite saat user sudah memilih jamaah lalu mengubah jumlah.
- Pencarian customer pakai `.or(...)` raw string tanpa sanitasi — risiko broken query.
- Tidak ada validasi NIK ganda di slot, hanya `customer_id` ganda.
- PIC (pusat/cabang/agen) tidak menyimpan `sales_id` (siapa staf yang input) — padahal kolom tersedia.
- Tidak ada konfirmasi pre-submit (review akhir) — langsung submit di step 4.

**C. Halaman Detail (`AdminBookingDetail.tsx`) — 2.572 baris, file paling kritis**
- File monolitik: 7+ mutation, 10+ dialog, timeline, dokumen, refund, ganti paket, ganti kamar, kelola pembayaran. Wajib dipecah jadi sub-komponen: `BookingHeader`, `PassengersPanel`, `PaymentsPanel`, `BookingActionsSidebar`, `BookingTimeline`, `BookingDocumentsPanel`.
- Banyak `(booking as any)` & `(p as any)` → tipe sudah lemah; tipe `Booking` di `types/database.ts` belum mencakup `payment_deadline`, `addons_price`, `discount_amount`, `discount_label`, `agent_name`, dll.
- Inline color hard-coded di 50+ tempat (`bg-amber-50`, `text-emerald-600`, `text-violet-700`, `bg-blue-50`...). Tidak ikut design system.
- Dua dokumen "Invoice" dan "Form Transaksi" memakai 2 generator berbeda dan template field berbeda — desain output tidak konsisten (font, header style, accent color).

**D. Generator Dokumen — desain yang "acak-acakan"**
- Ada 4 generator paralel: `document-generator.ts`, `document-generator-v2.ts`, `transaction-form-generator.ts`, `booking-pdf-exporter(.enhanced).ts`. Tidak ada sumber gaya tunggal.
- `transaction-form-generator.ts` membangun layout manual lewat `doc.rect / doc.text` dengan koordinat magic-number → tidak responsif terhadap teks panjang (alamat panjang/nama paket panjang akan tabrakan).
- `invoice_templates` menyimpan `accent_color`, `font_family`, `header_style`, `payment_info_blocks`, `terms_text`, `footer_text` — tapi hanya `transaction-form-generator` memakainya. Invoice (`generateInvoice`) **tidak** memakai template → keluaran beda gaya.
- Tidak ada preview PDF di UI; admin harus download dulu untuk melihat hasil.
- Tidak ada nomor dokumen sekuensial (sudah ada `get_next_document_number` RPC tapi tidak dipakai untuk invoice / form transaksi). Kode dokumen di-generate ad-hoc (`INV-${booking_code}`).
- Tidak ada watermark "DRAFT/PAID/CANCELLED" sesuai status pembayaran.

**E. Relasi data**
- `bookings.sales_id` ada di skema tapi tidak diisi saat create.
- `booking_passengers.room_number` dipakai (C5), tapi tidak divalidasi terhadap kapasitas kamar.
- `payment_status` di-update otomatis oleh trigger `update_booking_paid_amount` (bagus), tapi `AdminBookingDetail` di beberapa tempat menghitung ulang manual `paidAmount >= total_price ? 'paid' : ...` — sumber kebenaran ganda.
- `departures.booked_count` disinkron trigger; tidak ada masalah.
- `agents` ↔ `bookings`: detail menampilkan `bookingAgent` tapi link "Lihat Komisi Agen" mengarah ke `/agent/commissions` (route customer/agent), bukan halaman admin → salah konteks.
- Tidak ada relasi `bookings ↔ documents` (history dokumen pakai `booking_document_logs` — sudah ada, tapi tidak ada storage path; hanya log nama).

---

### Rencana perbaikan (bertahap)

**Fase 1 — Refaktor struktur (frontend, no-DB)**
1. Pecah `AdminBookingDetail.tsx` menjadi:
   - `components/admin/booking-detail/BookingHeader.tsx`
   - `components/admin/booking-detail/BookingPassengersPanel.tsx`
   - `components/admin/booking-detail/BookingPaymentsPanel.tsx`
   - `components/admin/booking-detail/BookingTimeline.tsx`
   - `components/admin/booking-detail/BookingActionsSidebar.tsx`
   - `components/admin/booking-detail/BookingDocumentsPanel.tsx`
   - `hooks/useBookingDetail.ts` (semua query/mutation)
2. Ekstrak Excel style builder yang duplikat di `AdminBookings.tsx` ke `lib/excel-style-resolver.ts`.
3. Perbaiki tipe `Booking` di `types/database.ts`: tambah `payment_deadline`, `addons_price`, `discount_amount`, `discount_label`, `sales_id`, dst. Hilangkan `(booking as any)` di file detail.
4. Ganti seluruh warna hard-coded (`text-emerald-600`, `bg-amber-50`...) ke token semantik (`text-success`, `bg-warning/10`, `text-info`, dll.) — tambahkan token yang belum ada di `index.css` & `tailwind.config.ts`.

**Fase 2 — Konsolidasi dokumen PDF**
1. Buat `lib/pdf/` baru sebagai single source:
   - `pdf/template-resolver.ts` (membaca `invoice_templates` + cancellation policy + bank accounts sekali)
   - `pdf/layout-primitives.ts` (header, footer, signature block, watermark, table)
   - `pdf/invoice.ts` — pakai template
   - `pdf/transaction-form.ts` — pakai template yang sama (gaya seragam)
   - `pdf/document-numbering.ts` — pakai RPC `get_next_document_number('invoice','INV')` & `('transaction_form','FRM')`
2. Tambah watermark dinamis (`LUNAS / DP / BELUM BAYAR / BATAL`) berdasarkan status.
3. Hapus / deprecate `document-generator-v2.ts` dan `booking-pdf-exporter.enhanced.ts` setelah migrasi (2 versi paralel membingungkan).
4. Tambahkan dialog "Preview PDF" sebelum download di `BookingDocumentsPanel` (pakai `<iframe>` dari `doc.output('bloburl')`).

**Fase 3 — Wizard pembuatan**
1. `base_price` ditiadakan / dihitung sebagai harga rata-rata ter-weighted; simpan rincian `room_breakdown` di JSONB (kolom baru `bookings.room_breakdown`).
2. Tambah Step 5 "Review & Konfirmasi" sebelum submit.
3. Isi `sales_id = auth.uid()` saat PIC = pusat/cabang.
4. Validasi NIK & passport ganda di slot passenger.
5. Sanitasi `customerSearch` untuk PostgREST `.or()`.
6. Hapus `room_type` "dominant" dari `bookings`; gantikan dengan field `primary_room_type` (eksplisit) atau biarkan dari `room_breakdown`.

**Fase 4 — Halaman daftar**
1. Statistik header diganti memakai query agregat ke server (`select count, sum group by status`) — bukan dari halaman aktif.
2. `filterOptions` (paket, keberangkatan, cabang) diambil via query terpisah, bukan dari hasil halaman.
3. Sanitasi & RPC `search_bookings` untuk full-text search aman.
4. Loading state per-baris untuk tombol reminder WA.

**Fase 5 — Migrasi DB pendukung**
- Tambah kolom `bookings.room_breakdown jsonb`, `bookings.primary_room_type` (opsional), backfill dari `booking_passengers`.
- Tambah trigger validasi `payment_status` (sudah ada) — pastikan kode FE tidak menghitung ulang.
- Pastikan `get_next_document_number` mendukung tipe `'invoice'` dan `'transaction_form'`.

---

### Prioritas eksekusi yang direkomendasikan
1. **Fase 1 (refaktor + tipe + token warna)** → fondasi, tidak menyentuh data.
2. **Fase 2 (PDF konsolidasi)** → langsung menjawab keluhan "desain dokumen acak-acakan".
3. **Fase 3 (wizard)** → memperbaiki kualitas data baru.
4. **Fase 4 (daftar)** → akurasi statistik & filter.
5. **Fase 5 (DB)** → finalisasi.

Setiap fase bisa di-deliver terpisah & build lulus.

---

Setelah Anda setuju, saya akan mulai dari **Fase 1** kecuali Anda ingin urutan lain (misal langsung Fase 2 untuk PDF dulu).