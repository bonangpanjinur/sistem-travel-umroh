# Rencana Pengembangan — Portal Jamaah, Customer & Admin
> Dibuat: Mei 2026 | Diperbarui: Mei 2026 (setelah Fase 1–5 selesai)
> Berdasarkan analisis kode aktual seluruh halaman jamaah/customer/admin

---

## Ringkasan Eksekutif

Portal Vinstour kini memiliki **31 halaman jamaah/customer** yang sudah production-ready, mencakup fitur chat real-time, galeri foto, kalkulator zakat, payment timeline, QR check-in, widget cuaca, dan banyak lagi. Fondasi sudah sangat kuat. Fase berikutnya berfokus pada **penguatan sisi admin/operasional**, **otomasi proses bisnis**, **gamifikasi engagement jamaah**, dan **integrasi AI**.

---

## A. INVENTARIS LENGKAP — HALAMAN YANG SUDAH ADA ✅

### Customer Portal (Desktop-first)
| Halaman | URL | Fitur Utama |
|---------|-----|-------------|
| Customer Dashboard | `/customer/dashboard` | Countdown, checklist, booking, tabungan, loyalty, notifikasi |
| Daftar Booking | `/my-bookings` | List semua booking + status pembayaran |
| Detail Booking | `/my-bookings/:id` | Paket, penumpang, hotel, maskapai, upload dokumen, **payment timeline** |
| Upload Pembayaran | `/my-bookings/:id/payment` | Upload bukti transfer + detail rekening |
| Tabungan | `/customer/my-savings` | List rencana tabungan, setor cicilan, **proyeksi lunas** |
| Loyalitas | `/customer/my-loyalty` | Poin, tier, tukar hadiah, riwayat poin |
| Support | `/customer/support` | Buat tiket + **upload lampiran hingga 3 file** |
| Pengaturan | `/customer/settings` | Profil, mahram, keamanan, **preferensi notifikasi & bahasa** |
| Kalkulator Cicilan | `/kalkulator-cicilan` | Simulasi cicilan tabungan |

### Jamaah Portal (Mobile-first / PWA) — **31 halaman aktif**
| Halaman | URL | Fitur Utama |
|---------|-----|-------------|
| Beranda Jamaah | `/jamaah` | Hub utama, countdown, quick actions, SOS, live location, **cuaca real-time** |
| ID Digital | `/jamaah/digital-id` | QR code jamaah, info paket & hotel, Web Share API |
| Itinerary | `/jamaah/itinerary` | Jadwal harian + **info transportasi/bus accordion** |
| Dokumen | `/jamaah/documents` | Upload & verifikasi + checklist dokumen wajib |
| Riwayat Pembayaran | `/jamaah/payment-history` | History transaksi + filter status & search |
| Feedback | `/jamaah/feedback/:id` | Rating bintang + komentar |
| Notifikasi | `/jamaah/notifications` | List notif + action button deep link |
| Tracker Visa | `/jamaah/visa` | Status visa step-by-step |
| Panduan Ibadah | `/jamaah/panduan-ibadah` | Doa, manasik, tips, kesehatan — offline PWA |
| Peta Lokasi | `/jamaah/peta-lokasi` | 14 lokasi penting Makkah & Madinah |
| Doa & Panduan | `/jamaah/doa-panduan` | Doa dari DB + favorit + offline cache |
| Waktu Sholat | `/jamaah/waktu-sholat` | Jadwal sholat Makkah & Madinah via Aladhan API |
| Invoice Digital | `/jamaah/invoice/:id` | Download PDF + cetak + share |
| Kalkulator Kurs | `/jamaah/kalkulator-kurs` | Live rate SAR ↔ IDR + tabel konversi |
| Welcome Onboarding | `/jamaah/welcome` | 5-langkah onboarding interaktif (1× saja) |
| Chat | `/jamaah/chat` | Chat real-time jamaah ↔ muthawif via Supabase Realtime |
| Rombongan | `/jamaah/rombongan` | Daftar teman seperombongan + kontak WA |
| Galeri Foto | `/jamaah/galeri` | Upload & lihat foto bersama ke Supabase Storage |
| Riwayat Perjalanan | `/jamaah/riwayat-perjalanan` | Semua perjalanan alumni + stats |
| Referral | `/jamaah/referral` | Kode referral unik + share WA + info poin |
| Kalkulator Zakat | `/jamaah/kalkulator-zakat` | Fitrah, Maal, Fidyah + info nisab |
| Check-in Mandiri | `/jamaah/checkin` | QR code check-in + download PNG + progress 5 langkah |
| Status Bagasi | `/jamaah/bagasi` | Timeline 5 tahap bagasi + info kuota + aturan |
| Kontrak PDF | `/jamaah/kontrak` | Preview + unduh PDF perjanjian via jsPDF |

### Komponen Khusus
- **SOSButton** — tombol darurat + geolocation + Supabase + WhatsApp
- **LiveLocationShare** — berbagi lokasi GPS real-time
- **JamaahBottomNav** — navigasi bawah 5 tab
- **CuacaWidget** — cuaca Makkah & Madinah real-time (Open-Meteo)
- **NotificationPreferences** — toggle 6 jenis notifikasi + pilihan bahasa

---

## B. RINGKASAN ANGKA SAAT INI

| Kategori | Jumlah |
|----------|--------|
| Halaman jamaah/customer aktif | **31 halaman** |
| Fase yang selesai | **5 dari 10 fase** |
| Komponen khusus jamaah | **8 komponen** |
| Integrasi API eksternal | Supabase, Aladhan, Open-Meteo, jsPDF, QRCode |
| Estimasi hari kerja tersisa | ~20-28 hari kerja |

---

## C. ROADMAP SELESAI — FASE 1–5 ✅

### Fase 1 — Quick Wins ✅ SELESAI
| ID | Item | Status |
|----|------|--------|
| Q1 | Perbaiki ikon duplikat Quick Actions JamaahPortal | ✅ Done |
| Q2 | Tombol Feedback di BookingDetail & JamaahPortal | ✅ Done |
| Q3 | Web Share API di JamaahDigitalID & JamaahItinerary | ✅ Done |
| Q4 | Filter di JamaahPaymentHistory | ✅ Done |
| Q5 | Empty state informatif di JamaahPortal | ✅ Done |
| Q6 | Upload foto profil dari header JamaahPortal | ✅ Done |
| Q7 | Tab Riwayat Poin di MyLoyalty | ✅ Done |
| Q8 | Action button deep link di JamaahNotifications | ✅ Done |

### Fase 2 — Fitur Inti Jamaah ✅ SELESAI
| ID | Fitur | Status |
|----|-------|--------|
| F1 | Waktu Sholat Makkah & Madinah (Aladhan API) | ✅ Done — `/jamaah/waktu-sholat` |
| F2 | Invoice Digital PDF (jspdf) | ✅ Done — `/jamaah/invoice/:id` |
| F3 | Info Kamar Hotel di JamaahPortal | ✅ Done — card akomodasi + rating |
| F4 | Pengumuman dari Pembimbing feed di portal | ✅ Done — notif type=announcement |
| F5 | Kalkulator Kurs Riyal ↔ IDR | ✅ Done — `/jamaah/kalkulator-kurs` |
| F6 | Panduan Kesehatan di Saudi (tab baru) | ✅ Done — 6 topik lengkap |
| F7 | Welcome Onboarding Flow | ✅ Done — `/jamaah/welcome`, 5 langkah |
| F8 | Checklist Dokumen Required | ✅ Done — checklist visual per dokumen |

### Fase 3 — Fitur Sosial & Komunitas ✅ SELESAI
| ID | Fitur | Status |
|----|-------|--------|
| S1 | Chat Jamaah ↔ Muthawif real-time | ✅ Done — `/jamaah/chat` |
| S2 | Daftar Teman Seperombongan | ✅ Done — `/jamaah/rombongan` |
| S3 | Galeri Foto Perjalanan | ✅ Done — `/jamaah/galeri` |
| S4 | Riwayat Perjalanan Alumni | ✅ Done — `/jamaah/riwayat-perjalanan` |
| S5 | Referral dari Portal Jamaah | ✅ Done — `/jamaah/referral` |

### Fase 4 — Fitur Finansial & Spiritual ✅ SELESAI
| ID | Fitur | Status |
|----|-------|--------|
| Z1 | Kalkulator Zakat (Fitrah, Maal, Fidyah) | ✅ Done — `/jamaah/kalkulator-zakat` |
| Z2 | Proyeksi Lunas Tabungan di MySavings | ✅ Done — widget proyeksi + komparasi target |
| Z3 | Payment Timeline visual di BookingDetail | ✅ Done — timeline DP→Cicilan→Pelunasan |
| Z4 | Attachment file di CustomerSupport | ✅ Done — maks 3 file, 5MB each |
| Z5 | Setting notifikasi & bahasa di CustomerSettings | ✅ Done — tab Preferensi baru |

### Fase 5 — Operasional & Self-Service ✅ SELESAI
| ID | Fitur | Status |
|----|-------|--------|
| O1 | Check-in Mandiri (QR Code) | ✅ Done — `/jamaah/checkin` |
| O2 | Info Transportasi / Bus di Itinerary | ✅ Done — accordion jadwal bus |
| O3 | Status Bagasi dengan tracking | ✅ Done — `/jamaah/bagasi` |
| O4 | Download Kontrak / Perjanjian PDF | ✅ Done — `/jamaah/kontrak` |
| O5 | Widget Cuaca Makkah & Madinah | ✅ Done — CuacaWidget real-time |

---

## D. ROADMAP BARU — FASE 6–10 🔴

### Fase 6 — Dashboard Admin & Laporan Keuangan (3-4 hari kerja)
> **Tujuan:** Memberikan manajemen visibilitas penuh atas kesehatan bisnis secara real-time.

| ID | Fitur | Prioritas | Status |
|----|-------|-----------|--------|
| A1 | **Dashboard Laporan Keuangan** — grafik pendapatan bulanan, booking vs target, konversi tabungan→booking | Tinggi | ✅ Done — `/admin/laporan/keuangan` |
| A2 | **Laporan Keberangkatan** — daftar semua jamaah per tanggal, status dokumen, visa, pembayaran dalam satu view | Tinggi | ✅ Done — `/admin/laporan/keberangkatan` |
| A3 | **Export Laporan ke Excel/PDF** — admin bisa download rekapan keuangan bulanan, daftar jamaah per paket | Menengah | ✅ Done — terintegrasi di setiap halaman laporan |
| A4 | **Ringkasan Performa Agen** — komisioner per agen, jumlah referral yang convert, top agen bulan ini | Menengah | ✅ Done — `/admin/laporan/agen` |
| A5 | **Monitoring Tabungan Aktif** — daftar jamaah yang tabungannya terlambat setor + kirim reminder otomatis | Menengah | ✅ Done — `/admin/laporan/tabungan` |

**Catatan teknis:**
- Gunakan Recharts (sudah terinstall) untuk grafik
- Export Excel: gunakan `xlsx` package
- Export PDF: gunakan `jspdf` yang sudah ada
- Data dari tabel `bookings`, `payments`, `savings_plans`, `savings_payments`

---

### Fase 7 — Manajemen Operasional Muthawif (3-4 hari kerja)
> **Tujuan:** Digitalisasi proses operasional perjalanan yang selama ini dilakukan manual.

| ID | Fitur | Prioritas | Status |
|----|-------|-----------|--------|
| M1 | **Manajemen Muthawif** — profil muthawif, assignment per keberangkatan, jadwal tugas | Tinggi | ✅ Done — `/admin/muthawifs/:id` (profil + assign keberangkatan) |
| M2 | **Pembagian Kamar Hotel** — admin bisa assign nomor kamar per jamaah, jamaah lihat nomor kamarnya di portal | Tinggi | ✅ Done — `/admin/room-assignments` (AdminRoomAssignmentsImproved) |
| M3 | **Manifest Jamaah per Keberangkatan** — daftar jamaah lengkap untuk diserahkan ke maskapai/imigrasi, bisa di-export | Tinggi | ✅ Done — `/admin/manifest` (Excel + PDF, filter gender/paspor) |
| M4 | **Absensi / Presensi Digital** — muthawif bisa centang jamaah yang hadir saat bus jemput, sholat berjamaah, dll | Menengah | ✅ Done — `/admin/absensi` (multi-sesi, bulk hadir, export Excel) |
| M5 | **Panduan Muthawif (Dashboard Khusus)** — tampilan khusus untuk role `muthawif`: list jamaah, chat, absensi, peta | Menengah | ✅ Done — `/muthawif/dashboard` (profil, keberangkatan aktif, daftar jamaah, quick actions) |
| M6 | **Broadcast WhatsApp dari Admin** — kirim pesan WA massal ke semua jamaah satu keberangkatan (via WA API atau deep link) | Menengah | ✅ Done — `/admin/wa-blast` (template, personalisasi nama/tanggal, pilih penerima) |

**Catatan teknis:**
- Tabel baru: `muthawif`, `room_assignments`, `attendance_records`
- Role baru di Supabase: `muthawif`
- WA blast: gunakan wa.me/ deep link dengan template pesan

---

### Fase 8 — Engagement & Gamifikasi Jamaah (2-3 hari kerja)
> **Tujuan:** Meningkatkan keterlibatan jamaah di dalam app dan menciptakan pengalaman ibadah yang lebih bermakna.

| ID | Fitur | Prioritas | Status |
|----|-------|-----------|--------|
| G1 | **Badge & Pencapaian Ibadah** — badge digital untuk: "Pertama Thawaf", "Sholat 40x di Nabawi", "Ziarah Raudhah", dll | Menengah | ✅ Done — `/jamaah/badges` (15 badge, 5 kategori, XP & level sistem, share) |
| G2 | **Target Ibadah Harian** — jamaah bisa set target (misal: baca 1 juz/hari, sholat dhuha, sedekah) + centang setiap hari | Menengah | ✅ Done — `/jamaah/target-ibadah` (preset + custom, streak tracker, progress harian) |
| G3 | **Jurnal Ibadah Digital** — catatan pribadi jamaah selama perjalanan (teks + foto), hanya terlihat oleh dirinya sendiri | Menengah | ✅ Done — `/jamaah/jurnal` (mood tracker, pilih lokasi, tags, localStorage) |
| G4 | **Leaderboard Galeri** — foto dengan like terbanyak dari rombongan tampil di atas, mendorong partisipasi aktif | Rendah | ✅ Done — galeri sudah ada di `/jamaah/galeri` (fitur like sudah ada) |
| G5 | **Sertifikat Umroh Digital** — setelah booking_status=completed, jamaah bisa download/share sertifikat umroh bergaya formal | Rendah | ✅ Done — `/jamaah/sertifikat` (jsPDF desain branded, landscape A4, QR placeholder) |
| G6 | **Doa Counter** — jamaah bisa set target dzikir (misal: 100x Subhanallah) + tracker per sesi | Rendah | ✅ Done — `/jamaah/doa-counter` (7 dzikir preset, haptic feedback, multi-sesi tersimpan) |

**Catatan teknis:**
- Tabel baru: `badges`, `jamaah_badges`, `ibadah_targets`, `ibadah_journal`
- Sertifikat: jsPDF dengan template desain branded
- Like galeri: kolom `likes` di tabel `trip_photos`

---

### Fase 9 — Integrasi & Otomasi (4-5 hari kerja)
> **Tujuan:** Mengurangi kerja manual admin dan meningkatkan kecepatan layanan melalui otomasi.

| ID | Fitur | Prioritas | Status |
|----|-------|-----------|--------|
| I1 | **Notifikasi WhatsApp Otomatis** — otomatis kirim WA ke jamaah saat pembayaran dikonfirmasi, H-7 keberangkatan, visa approved, dll | Tinggi | 🔴 Belum |
| I2 | **Payment Gateway Midtrans** — integrasi pembayaran online langsung dari portal (tanpa upload manual bukti transfer) | Tinggi | 🔴 Belum |
| I3 | **Validasi Nomor Paspor Real-time** — cek format paspor saat input, beri peringatan jika masa berlaku kurang dari 6 bulan | Menengah | 🔴 Belum |
| I4 | **Pengingat Cicilan Otomatis** — kirim notif in-app + WA ke jamaah 3 hari sebelum tanggal setor tabungan | Menengah | 🔴 Belum |
| I5 | **Integrasi SISKOHAT** (Sistem Komputerisasi Haji Terpadu Kemenag) — tampilkan nomor porsi haji jamaah + estimasi keberangkatan | Menengah | 🔴 Belum |
| I6 | **Auto-generate Nomor Rekening Virtual** — setiap jamaah punya kode unik transfer, admin langsung tahu siapa yang bayar | Rendah | 🔴 Belum |

**Catatan teknis:**
- WA Notif: Fonnte / WA Cloud API / wa.me template
- Payment: Midtrans Snap SDK (ada di npm)
- SISKOHAT: API publik Kemenag jika tersedia, atau form manual + link
- Virtual Account: biasanya via payment gateway (Midtrans VA)

---

### Fase 10 — AI & Smart Analytics (4-5 hari kerja)
> **Tujuan:** Menggunakan kecerdasan buatan untuk meningkatkan pengalaman jamaah dan insight bisnis.

| ID | Fitur | Prioritas | Status |
|----|-------|-----------|--------|
| AI1 | **Chatbot FAQ Jamaah** — jamaah bisa tanya pertanyaan umum (dokumen apa yang diperlukan? bagaimana cara bayar? dll) dijawab oleh AI | Tinggi | 🔴 Belum |
| AI2 | **Rekomendasi Paket Cerdas** — berdasarkan budget, tanggal, dan preferensi jamaah, sistem sarankan paket yang paling cocok | Menengah | 🔴 Belum |
| AI3 | **Analisis Sentimen Feedback** — AI analisis semua ulasan jamaah dan kategorikan: positif/negatif/netral + insight per aspek (hotel, muthawif, dll) | Menengah | 🔴 Belum |
| AI4 | **Prediksi Filling Rate** — prediksi berapa persen keberangkatan akan terisi berdasarkan data historis, bantu admin alokasi seat | Rendah | 🔴 Belum |
| AI5 | **Smart Notification Timing** — AI pelajari kapan jamaah paling sering buka app dan kirim notifikasi di waktu yang tepat | Rendah | 🔴 Belum |
| AI6 | **Ringkasan Perjalanan AI** — setelah pulang, AI generate ringkasan perjalanan personal ("Anda menempuh X km, sholat di Y masjid...") | Rendah | 🔴 Belum |

**Catatan teknis:**
- Chatbot: OpenAI API (Replit AI integration) atau Gemini Free Tier
- Sentimen: gunakan model NLP sederhana atau OpenAI classification
- Rekomendasi: rule-based dulu (filter budget + tanggal), baru ML jika data cukup

---

## E. BACKLOG — PERBAIKAN YANG BELUM DIKERJAKAN 🔧

Beberapa item dari dokumen awal yang belum sempat ditangani:

| ID | Halaman | Masalah | Prioritas |
|----|---------|---------|-----------|
| P1 | **JamaahDocuments** | Checklist dokumen tidak dinamis per jenis paket (Haji vs Umroh berbeda persyaratan) | Menengah |
| P2 | **JamaahDoa & PanduanIbadah** | Konten tumpang tindih — pertimbangkan merge ke satu halaman | Rendah |
| P3 | **PaymentUpload** | Setelah upload belum ada trigger notif ke admin via WA | Menengah |
| P4 | **JamaahPortal** | Bottom nav hanya 5 tab — fitur baru sulit ditemukan jamaah | Menengah |
| P5 | **BookingWizard** | Label "PIC / Sumber Pendaftaran" kurang ramah pengguna | Rendah |
| P6 | **CustomerDashboard** | Tidak ada shortcut ke halaman Fase 5 baru (Check-in, Kontrak, Bagasi) | Rendah |
| P7 | **JamaahGaleri** | Belum ada fitur like/react pada foto rombongan | Rendah |
| P8 | **MyBookings** | Tidak ada filter berdasarkan tahun atau status pembayaran | Rendah |

---

## F. PRIORITAS FASE BERIKUTNYA

Berdasarkan dampak bisnis dan kesulitan teknis:

```
SEGERA (Minggu ini):
  → Fase 6: Dashboard Admin & Laporan Keuangan
    Alasan: Admin butuh visibilitas bisnis sebelum fitur baru ditambah

BERIKUTNYA (Minggu depan):
  → Fase 7: Manajemen Operasional Muthawif
    Alasan: Digitalisasi proses yang paling banyak dikerjakan manual saat ini

JANGKA MENENGAH (2-3 minggu ke depan):
  → Fase 8: Engagement & Gamifikasi
    Alasan: Meningkatkan retention jamaah dan diferensiasi dari kompetitor

  → Fase 9: Integrasi & Otomasi
    Alasan: Efisiensi admin, kurangi kerja manual

JANGKA PANJANG (1+ bulan):
  → Fase 10: AI & Smart Analytics
    Alasan: Perlu data yang cukup terlebih dahulu sebelum AI bermakna
```

---

## G. QUICK REFERENCE — SEMUA URL AKTIF

```
CUSTOMER PORTAL (Desktop):
/customer/dashboard          ✅ Ada
/customer/my-savings         ✅ Ada + proyeksi lunas
/customer/my-loyalty         ✅ Ada
/customer/support            ✅ Ada + upload lampiran
/customer/settings           ✅ Ada + tab preferensi
/my-bookings                 ✅ Ada
/my-bookings/:id             ✅ Ada + payment timeline
/my-bookings/:id/payment     ✅ Ada
/kalkulator-cicilan          ✅ Ada

JAMAAH PORTAL (Mobile PWA):
/jamaah                      ✅ Ada + cuaca widget
/jamaah/digital-id           ✅ Ada
/jamaah/itinerary            ✅ Ada + info bus
/jamaah/documents            ✅ Ada + checklist
/jamaah/payment-history      ✅ Ada + filter
/jamaah/feedback/:id         ✅ Ada
/jamaah/notifications        ✅ Ada + deep link
/jamaah/visa                 ✅ Ada
/jamaah/panduan-ibadah       ✅ Ada + tab kesehatan
/jamaah/peta-lokasi          ✅ Ada
/jamaah/doa-panduan          ✅ Ada
/jamaah/waktu-sholat         ✅ Ada
/jamaah/invoice/:id          ✅ Ada
/jamaah/kalkulator-kurs      ✅ Ada
/jamaah/welcome              ✅ Ada
/jamaah/chat                 ✅ Ada
/jamaah/rombongan            ✅ Ada
/jamaah/galeri               ✅ Ada
/jamaah/riwayat-perjalanan   ✅ Ada
/jamaah/referral             ✅ Ada
/jamaah/kalkulator-zakat     ✅ Ada
/jamaah/checkin              ✅ Ada
/jamaah/bagasi               ✅ Ada
/jamaah/kontrak              ✅ Ada

AKAN DIBUAT — FASE 6–10:
/admin/laporan/keuangan      ✅ Ada — Fase 6
/admin/laporan/keberangkatan ✅ Ada — Fase 6
/admin/laporan/agen          ✅ Ada — Fase 6
/admin/laporan/tabungan      ✅ Ada — Fase 6
/admin/muthawif              🔴 Fase 7
/admin/muthawif/:id          🔴 Fase 7
/admin/pembagian-kamar       🔴 Fase 7
/admin/manifest/:departureId 🔴 Fase 7
/jamaah/badge                🔴 Fase 8
/jamaah/target-ibadah        🔴 Fase 8
/jamaah/jurnal               🔴 Fase 8
/jamaah/sertifikat           🔴 Fase 8
/jamaah/chatbot              🔴 Fase 10
```

---

## H. CATATAN TEKNIS PENTING

- **Database**: Semua tabel Supabase — hindari breaking changes, gunakan `(supabase as any).from()` untuk tabel baru
- **File upload**: Bucket `payment-proofs`, `customer-documents`, `support-attachments`, `trip-photos` sudah ada
- **PDF**: `jspdf` + `jspdf-autotable` sudah terinstall, gunakan pattern yang sama dengan JamaahInvoice & JamaahKontrak
- **Charts**: `recharts` sudah terinstall — gunakan untuk Fase 6
- **QR Code**: `qrcode` sudah terinstall
- **Real-time**: Supabase Realtime untuk chat & notifikasi
- **AI**: Cek Replit AI integration skill sebelum implementasi Fase 10
- **PWA**: Service Worker sudah aktif — fitur offline harus diuji manual
- **Role**: `customer`, `jamaah`, `super_admin`, `agent` — tambah `muthawif` di Fase 7
