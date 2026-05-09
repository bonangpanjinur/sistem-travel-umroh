# Rencana Pengembangan — Vinstour Travel Management Portal
> Dibuat: Mei 2026 | Diperbarui: Mei 2026 (setelah analisis gap menyeluruh semua portal)
> Berdasarkan audit kode aktual: jamaah, customer, admin, agen, cabang, publik

---

## Ringkasan Eksekutif

Sistem Vinstour kini memiliki **10 fase pembangunan selesai**, mencakup **50+ halaman** di 6 portal (jamaah, customer, admin, agen, muthawif, publik). Fondasi sudah sangat kuat. Fase berikutnya berfokus pada **fitur yang benar-benar menggerakkan bisnis**: pembayaran online mandiri jamaah, portal cabang terpisah, CRM agen, live chat publik, dan upload dokumen mandiri.

---

## A. INVENTARIS LENGKAP — SEMUA HALAMAN AKTIF ✅

### Portal Publik (Website) — `/`
| Halaman | URL | Status |
|---------|-----|--------|
| Landing Page | `/` | ✅ Ada |
| Daftar Paket | `/packages` | ✅ Ada |
| Bandingkan Paket | `/packages/compare` | ✅ Ada |
| Detail Paket | `/packages/:idSlug` | ✅ Ada |
| Jadwal Keberangkatan | `/departures` | ✅ Ada |
| Blog | `/blog`, `/blog/:slug` | ✅ Ada |
| Kontak | `/contact` | ✅ Ada |
| Tentang Kami | `/about` | ✅ Ada |
| Tim | `/team` | ✅ Ada |
| FAQ | `/faq` | ✅ Ada |
| Testimoni | `/testimonials` | ✅ Ada |
| Kalkulator Biaya | `/kalkulator` | ✅ Ada + DP/cicilan |
| Kalkulator Cicilan | `/kalkulator-cicilan` | ✅ Ada |
| Cek Status Booking | `/cek-booking` | ✅ Ada + reminder card |
| Tabungan Umroh | `/savings` | ✅ Ada |
| Website Agen | `/a/:agentSlug` | ✅ Ada |
| Website Cabang | `/b/:branchSlug` | ✅ Ada |

### Customer Portal (Desktop) — `/customer/*` & `/my-bookings/*`
| Halaman | URL | Status |
|---------|-----|--------|
| Dashboard Customer | `/customer/dashboard` | ✅ Ada |
| Daftar Booking | `/my-bookings` | ✅ Ada + filter |
| Detail Booking | `/my-bookings/:id` | ✅ Ada + payment timeline |
| Upload Pembayaran | `/my-bookings/:id/payment` | ✅ Ada |
| Tabungan | `/customer/my-savings` | ✅ Ada + proyeksi lunas |
| Loyalitas | `/customer/my-loyalty` | ✅ Ada |
| Support | `/customer/support` | ✅ Ada + upload 3 lampiran |
| Pengaturan | `/customer/settings` | ✅ Ada + preferensi notif |
| Kalkulator Cicilan | `/kalkulator-cicilan` | ✅ Ada |

### Portal Jamaah (Mobile PWA) — `/jamaah/*`
| Halaman | URL | Status |
|---------|-----|--------|
| Beranda | `/jamaah` | ✅ Ada + cuaca, SOS, lokasi |
| ID Digital | `/jamaah/digital-id` | ✅ Ada |
| Itinerary | `/jamaah/itinerary` | ✅ Ada + info bus |
| Dokumen | `/jamaah/documents` | ✅ Ada + checklist |
| Riwayat Bayar | `/jamaah/payment-history` | ✅ Ada + filter |
| Feedback | `/jamaah/feedback/:id` | ✅ Ada |
| Notifikasi | `/jamaah/notifications` | ✅ Ada + deep link |
| Tracker Visa | `/jamaah/visa` | ✅ Ada |
| Panduan Ibadah | `/jamaah/panduan-ibadah` | ✅ Ada + tab kesehatan |
| Peta Lokasi | `/jamaah/peta-lokasi` | ✅ Ada — 14 titik |
| Doa & Panduan | `/jamaah/doa-panduan` | ✅ Ada + favorit + offline |
| Waktu Sholat | `/jamaah/waktu-sholat` | ✅ Ada — Aladhan API |
| Invoice Digital | `/jamaah/invoice/:id` | ✅ Ada — PDF download |
| Kalkulator Kurs | `/jamaah/kalkulator-kurs` | ✅ Ada — SAR↔IDR live |
| Welcome Onboarding | `/jamaah/welcome` | ✅ Ada — 5 langkah |
| Chat | `/jamaah/chat` | ✅ Ada — realtime Supabase |
| Rombongan | `/jamaah/rombongan` | ✅ Ada |
| Galeri Foto | `/jamaah/galeri` | ✅ Ada + like |
| Riwayat Perjalanan | `/jamaah/riwayat-perjalanan` | ✅ Ada |
| Referral | `/jamaah/referral` | ✅ Ada |
| Kalkulator Zakat | `/jamaah/kalkulator-zakat` | ✅ Ada |
| Check-in Mandiri | `/jamaah/checkin` | ✅ Ada — QR 5 tahap |
| Status Bagasi | `/jamaah/bagasi` | ✅ Ada |
| Kontrak PDF | `/jamaah/kontrak` | ✅ Ada — jsPDF |
| Badges & XP | `/jamaah/badges` | ✅ Ada — 15 badge, 5 kategori |
| Target Ibadah | `/jamaah/target-ibadah` | ✅ Ada + streak |
| Jurnal Ibadah | `/jamaah/jurnal` | ✅ Ada + mood + tags |
| Sertifikat Umroh | `/jamaah/sertifikat` | ✅ Ada — PDF branded |
| Doa Counter | `/jamaah/doa-counter` | ✅ Ada — haptic + multi-sesi |
| SISKOHAT | `/jamaah/siskohat` | ✅ Ada |
| Chatbot AI | `/jamaah/chatbot` | ✅ Ada |
| Ringkasan AI | `/jamaah/ringkasan-ai` | ✅ Ada |

### Portal Agen — `/agent/*`
| Halaman | URL | Status |
|---------|-----|--------|
| Dashboard | `/agent` | ✅ Ada |
| Komisi | `/agent/commissions` | ✅ Ada |
| Paket | `/agent/packages` | ✅ Ada |
| Digital Kit | `/agent/digital-kit` | ✅ Ada |
| Leaderboard | `/agent/leaderboard` | ✅ Ada |
| Membership | `/agent/membership` | ✅ Ada |
| Jaringan | `/agent/network` | ✅ Ada |
| Referral Saya | `/agent/referrals` | ✅ Ada |
| Daftar Jamaah | `/agent/jamaah` | ✅ Ada |
| Target | `/agent/targets` | ✅ Ada |
| Wallet | `/agent/wallet` | ✅ Ada |
| Website Agen | `/agent/website` | ✅ Ada |
| Daftar Jamaah Baru | `/agent/register` | ✅ Ada |
| Daftar Grup | `/agent/register-group` | ✅ Ada |

### Panel Muthawif — `/muthawif/*`
| Halaman | URL | Status |
|---------|-----|--------|
| Dashboard | `/muthawif/dashboard` | ✅ Ada |
| Detail Jamaah | `/muthawif/jamaah/:id` | ✅ Ada |
| Laporan Harian | `/muthawif/laporan-harian` | ✅ Ada |

### Admin — `/admin/*` (50+ halaman)
Semua modul bisnis utama sudah ada: booking, pembayaran, jamaah, keberangkatan, laporan, keuangan, HR, agen, cabang, dokumen, visa, manifest, absensi, kamar, WhatsApp, AI, analytics, marketing, dsb.

**Terbaru ditambahkan:**
| Halaman | URL | Status |
|---------|-----|--------|
| Pengingat Pelunasan | `/admin/pembayaran-reminder` | ✅ Ada — kelola & kirim WA |
| Export Keuangan Excel | di `/admin/departures/:id` → tab Jemaah | ✅ Ada — per keberangkatan |

---

## B. RINGKASAN STATUS SAAT INI

| Kategori | Jumlah |
|----------|--------|
| Halaman jamaah/customer aktif | **34 halaman** |
| Halaman admin aktif | **50+ halaman** |
| Halaman agen aktif | **13 halaman** |
| Fase selesai | **10 dari 10 fase awal** |
| Fitur tambahan pasca-fase 10 | WA Reminder, Export Keuangan, Dashboard Alert |

---

## C. FASE 1–10 — SEMUA SELESAI ✅

> Fase 1 (Quick Wins), Fase 2 (Fitur Inti Jamaah), Fase 3 (Sosial & Komunitas),
> Fase 4 (Finansial & Spiritual), Fase 5 (Operasional), Fase 6 (Laporan Admin),
> Fase 7 (Muthawif & Operasional), Fase 8 (Gamifikasi), Fase 9 (Integrasi),
> Fase 10 (AI) — **semuanya selesai**.

---

## D. ANALISIS GAP — FITUR YANG SEHARUSNYA ADA

Berdasarkan audit mendalam Mei 2026, ditemukan gap di 5 area:

### D1. Portal Jamaah — Gap

| # | Fitur | Prioritas | Catatan |
|---|-------|-----------|---------|
| JG1 | **Pembayaran Online Mandiri** — bayar DP/cicilan/pelunasan langsung dari portal via QRIS/VA/kartu | TINGGI | Ada halaman upload manual, tapi belum integrasi payment gateway penuh |
| JG2 | **Upload Dokumen Mandiri** — jamaah upload paspor, KTP, foto sendiri tanpa kirim WA ke admin | TINGGI | Ada halaman dokumen tapi upload belum fungsional dari sisi jamaah |
| JG3 | **Checklist Persiapan Lengkap** — progress: vaksin ✓, paspor valid ✓, perlengkapan ibadah ✓ | TINGGI | Jamaah sering tidak tahu apa yang masih kurang |
| JG4 | **Status Visa Real-time + Notif** — push/WA otomatis saat status visa berubah | SEDANG | Ada halaman tracker visa tapi notif perubahan belum otomatis |
| JG5 | **Jadwal Manasik + Daftar Hadir** — lihat jadwal bimbingan, konfirmasi kehadiran dari portal | SEDANG | Manasik wajib tapi tracking absensi hanya di admin |
| JG6 | **Rating & Review Paket Publik** — setelah completed, ulasan tampil di halaman paket publik | SEDANG | Feedback ada tapi tidak terintegrasi ke halaman publik |
| JG7 | **Tombol SOS dari Portal Jamaah** — trigger darurat yang terhubung ke admin/muthawif | SEDANG | Ada SOS di beranda tapi belum terhubung ke panel admin |
| JG8 | **Tracker Berat Bagasi Mandiri** — input daftar bawaan, hitung estimasi berat vs kuota | RENDAH | Ada halaman bagasi tapi hanya tracking status, bukan kalkulator |

### D2. Website Publik — Gap

| # | Fitur | Prioritas | Catatan |
|---|-------|-----------|---------|
| PG1 | **Live Chat Pre-Sales** — calon jamaah bisa tanya langsung sebelum daftar | TINGGI | Titik konversi tertinggi — orang mau daftar tapi ada pertanyaan |
| PG2 | **Filter Paket Lengkap** — filter bulan, harga, durasi, tipe Umroh/Haji/Plus | SEDANG | Ada halaman paket tapi filter mungkin terbatas |
| PG3 | **Video Testimoni & 360° Hotel** — video jamaah sebelumnya, preview hotel di Makkah/Madinah | SEDANG | Testimoni ada tapi hanya teks |
| PG4 | **Countdown per Paket** — hitung mundur sisa hari keberangkatan + sisa seat | RENDAH | Menciptakan urgensi booking |
| PG5 | **WhatsApp Click-to-Chat** — tombol WA per halaman paket, langsung ke CS | RENDAH | Konversi dari browsing ke tanya-tanya |

### D3. Portal Agen — Gap

| # | Fitur | Prioritas | Catatan |
|---|-------|-----------|---------|
| AG1 | **CRM Pipeline Lead** — kelola prospek: Baru → Tertarik → Follow-up → Booking, dengan reminder | TINGGI | Agen kehilangan calon jamaah karena tidak ada tracking sama sekali |
| AG2 | **Link Pendaftaran Personal** — agen punya link unik `/daftar?ref=KODEAGEN`, komisi auto-assign | TINGGI | Sekarang agen harus manual lapor ke admin |
| AG3 | **Broadcast Promo ke Prospek** — kirim info paket/promo ke daftar kontak via WA template | TINGGI | Agen broadcast manual, tidak terstruktur |
| AG4 | **Rincian Komisi per Booking** — breakdown: komisi confirmed, pending pencairan, jadwal cair | SEDANG | Ada halaman komisi tapi mungkin tidak detail |
| AG5 | **Modul Pelatihan Produk** — materi product knowledge, script penjualan, SOP versi digital | SEDANG | Agen baru tidak ada onboarding terstruktur |
| AG6 | **Template Pesan WA Resmi** — library template yang bisa langsung digunakan untuk promosi | SEDANG | Agen buat pesan sendiri yang tidak konsisten |
| AG7 | **Laporan Bulanan Agen** — ringkasan otomatis: booking bulan ini, komisi, performa vs target | SEDANG | Harus minta ke admin, tidak ada akses mandiri |
| AG8 | **Sub-Agen / Jaringan Rekrut** — agen senior bisa rekrut + monitor sub-agen dan komisinya | RENDAH | Berguna untuk sistem multi-level |

### D4. Panel Cabang — Gap (Belum Ada Portal Mandiri)

> Saat ini: cabang hanya dikelola dari panel admin pusat — belum ada login dan dashboard terpisah untuk manajer cabang.

| # | Fitur | Prioritas | Catatan |
|---|-------|-----------|---------|
| CG1 | **Login & Dashboard Cabang** — manajer cabang login sendiri, lihat data cabangnya saja | TINGGI | Wajib untuk skalabilitas multi-cabang |
| CG2 | **Laporan Revenue Cabang** — pemasukan, komisi agen binaan, target vs realisasi per bulan | TINGGI | Tidak ada visibilitas finansial per cabang |
| CG3 | **Manajemen Agen Cabang** — pantau performa agen yang terdaftar di cabang ini | SEDANG | Manajer cabang tidak bisa coach agen sendiri |
| CG4 | **Kelola Staf Cabang** — CS, marketing, admin lapangan — assign tugas | SEDANG | Pengelolaan SDM cabang masih di admin pusat |
| CG5 | **Approval Diskon Cabang** — manajer bisa approve diskon sampai batas yang ditentukan pusat | SEDANG | Semua diskon harus ke pusat, lambat |
| CG6 | **Rekap Booking Cabang** — semua booking masuk via cabang dengan filter & export | SEDANG | Sekarang hanya bisa lihat dari admin pusat |
| CG7 | **Broadcast Pengumuman Cabang** — kirim notif/WA ke jamaah yang masuk via cabang ini saja | RENDAH | Sekarang announcement bersifat global |

### D5. Admin Pusat — Gap (Penyempurnaan)

| # | Fitur | Prioritas | Catatan |
|---|-------|-----------|---------|
| ADG1 | **Integrasi SISKOHAT Kemenag** — sinkronisasi data jamaah haji ke sistem resmi Kemenag | TINGGI | Wajib untuk produk haji, sekarang manual |
| ADG2 | **Approval Workflow Berjenjang** — booking/refund/diskon butuh persetujuan bertingkat | SEDANG | Sekarang langsung diproses tanpa approval chain |
| ADG3 | **Manajemen Kontrak Vendor** — kontrak hotel, bus, katering dengan tanggal expired + reminder | SEDANG | Kontrak vendor dikelola di luar sistem |
| ADG4 | **Budget vs Realisasi Keberangkatan** — perencanaan biaya operasional vs yang terpakai | SEDANG | Tidak ada kontrol biaya per keberangkatan |

---

## E. ROADMAP BARU — FASE 11–15 🔴

### Fase 11 — Pembayaran & Dokumen Mandiri Jamaah (3-4 hari kerja)
> **Tujuan:** Jamaah bisa bayar dan upload dokumen sendiri tanpa butuh bantuan admin/CS.

| ID | Fitur | Gap Ref | Prioritas |
|----|-------|---------|-----------|
| J1 | **Pembayaran Online dari Portal Jamaah** — Midtrans QRIS/VA/kartu di `/jamaah/payment` | JG1 | TINGGI |
| J2 | **Upload Dokumen Mandiri** — jamaah upload paspor, KTP, foto di portal; admin notifikasi otomatis | JG2 | TINGGI |
| J3 | **Checklist Persiapan Visual** — progress % dengan kategori: Dokumen, Keuangan, Perlengkapan, Kesehatan | JG3 | TINGGI |
| J4 | **Notif Otomatis Perubahan Visa** — trigger notif WA/in-app saat status visa di-update admin | JG4 | SEDANG |

**Catatan teknis:**
- Midtrans Snap SDK sudah ada di package.json tapi belum terhubung ke portal jamaah
- Upload dokumen: Supabase Storage bucket `customer-documents` sudah ada
- Checklist: bisa disimpan di tabel `booking_checklist` atau `customer_profiles`

---

### Fase 12 — CRM Pipeline Agen (3-4 hari kerja)
> **Tujuan:** Agen tidak lagi kehilangan prospek — semua calon jamaah tercatat dan bisa di-follow up.

| ID | Fitur | Gap Ref | Prioritas |
|----|-------|---------|-----------|
| A1 | **Pipeline Lead** — board Kanban: Baru / Dihubungi / Tertarik / Negosiasi / Booking | AG1 | TINGGI |
| A2 | **Link Pendaftaran Unik per Agen** — `/daftar?ref=KODE` auto-assign komisi | AG2 | TINGGI |
| A3 | **Broadcast Template WA** — pilih template, pilih penerima (prospek/jamaah), preview & kirim | AG3 | TINGGI |
| A4 | **Rincian Komisi per Booking** — breakdown: pending/confirmed/dibayar, jadwal pencairan | AG4 | SEDANG |
| A5 | **Laporan Bulanan Mandiri** — PDF/Excel ringkasan booking + komisi yang bisa di-download | AG7 | SEDANG |

**Catatan teknis:**
- Tabel baru: `agent_leads` (id, agent_id, name, phone, stage, notes, created_at, updated_at)
- Link unik: sudah ada `agent_slug` di tabel agents — tinggal buat halaman daftar publik-nya
- Broadcast: gunakan pola yang sama dengan `/admin/wa-blast`

---

### Fase 13 — Panel Cabang Mandiri (4-5 hari kerja)
> **Tujuan:** Manajer cabang punya dashboard sendiri tanpa perlu akses admin pusat.

| ID | Fitur | Gap Ref | Prioritas |
|----|-------|---------|-----------|
| C1 | **Login & Layout Panel Cabang** — role `branch_manager`, route `/cabang/*` | CG1 | TINGGI |
| C2 | **Dashboard Cabang** — KPI: booking bulan ini, revenue, agen aktif, jamaah terdaftar | CG1 | TINGGI |
| C3 | **Laporan Revenue Cabang** — grafik pendapatan + tabel booking per bulan | CG2 | TINGGI |
| C4 | **Monitor Performa Agen** — tabel agen di cabang: booking, komisi, target, status aktif | CG3 | SEDANG |
| C5 | **Rekap Booking Cabang** — semua booking masuk via cabang, filter & export Excel | CG6 | SEDANG |
| C6 | **Approval Diskon** — request diskon dari agen bisa di-approve/tolak manajer cabang | CG5 | SEDANG |

**Catatan teknis:**
- Role `branch_manager` sudah ada di sistem RBAC
- RLS Supabase: filter semua query dengan `branch_id = auth.jwt().branch_id`
- Layout: mirip `/agent` tapi lebih kaya fitur

---

### Fase 14 — Live Chat & Konversi Publik (2-3 hari kerja)
> **Tujuan:** Ubah pengunjung website menjadi leads yang bisa di-follow up.

| ID | Fitur | Gap Ref | Prioritas |
|----|-------|---------|-----------|
| P1 | **Widget Live Chat Pre-Sales** — tombol chat melayang di semua halaman publik, terhubung ke admin | PG1 | TINGGI |
| P2 | **Formulir Lead Capture** — "Konsultasi Gratis" di setiap halaman paket → simpan ke leads admin | PG1 | TINGGI |
| P3 | **Filter Paket Lengkap** — filter: bulan keberangkatan, range harga, durasi, tipe (Umroh/Haji/Plus) | PG2 | SEDANG |
| P4 | **Sisa Seat Real-time** — tampilkan `(kuota - terisi)` di card paket + badge "Hampir Penuh" | PG4 | SEDANG |
| P5 | **WhatsApp Click-to-Chat** — tombol WA mengambang di halaman paket dengan pesan pre-fill | PG5 | RENDAH |

**Catatan teknis:**
- Chat widget: bisa Supabase Realtime atau integrasi Tawk.to
- Lead capture: tabel `leads` sudah ada di admin, tinggal hubungkan form publik
- Filter paket: query Supabase dengan `.gte('departure_date', ...)` + `.lte('price', ...)`

---

### Fase 15 — Manajemen Manasik & Jadwal Ibadah (2-3 hari kerja)
> **Tujuan:** Digitalisasi proses manasik yang saat ini paling banyak dilakukan manual.

| ID | Fitur | Gap Ref | Prioritas |
|----|-------|---------|-----------|
| M1 | **Jadwal Manasik di Portal Jamaah** — lihat jadwal, lokasi, deskripsi sesi | JG5 | SEDANG |
| M2 | **Konfirmasi Hadir Manasik** — jamaah konfirmasi kehadiran dari portal, admin lihat rekapnya | JG5 | SEDANG |
| M3 | **Materi Manasik Digital** — PDF/video per sesi bisa diakses jamaah | JG5 | SEDANG |
| M4 | **Admin: Buat & Kelola Jadwal Manasik** — admin input jadwal, assign ke keberangkatan | JG5 | SEDANG |
| M5 | **Rating & Review Paket → Tampil Publik** — setelah completed, ulasan masuk ke halaman paket | JG6 | SEDANG |

**Catatan teknis:**
- Tabel baru: `manasik_schedules` (departure_id, session_date, location, title, description)
- Tabel baru: `manasik_attendance` (schedule_id, customer_id, confirmed_at, attended)
- Review: tabel `booking_reviews` — sudah ada di feedback, tinggal expose ke halaman publik

---

## F. PRIORITAS PEMBANGUNAN

```
FASE 11 — SEGERA (dampak bisnis tertinggi):
  → Pembayaran & Dokumen Mandiri Jamaah
    Alasan: Mengurangi kerja admin 50%, jamaah lebih mandiri

FASE 12 — BERIKUTNYA:
  → CRM Pipeline Agen
    Alasan: Langsung tingkatkan konversi agen, mengurangi kehilangan prospek

FASE 13 — JANGKA MENENGAH:
  → Panel Cabang Mandiri
    Alasan: Syarat untuk skalabilitas multi-cabang

FASE 14 — PARALEL DENGAN FASE 13:
  → Live Chat & Konversi Publik
    Alasan: Meningkatkan lead dari website

FASE 15 — JANGKA MENENGAH:
  → Manasik Digital & Review Publik
    Alasan: Melengkapi siklus layanan jamaah end-to-end
```

---

## G. FITUR YANG BARU SELESAI (di luar Fase 1–10)

| Fitur | Lokasi | Keterangan |
|-------|--------|------------|
| Notifikasi Pengingat Pembayaran | `/admin/pembayaran-reminder` + `/cek-booking` | Jamaah aktifkan dari cek-booking, admin kelola & kirim WA |
| Alert Card Pengingat di Dashboard | `/admin` | Menampilkan count reminder hari ini, besok, overdue |
| Export Rekap Keuangan Excel | `/admin/departures/:id` tab Jemaah → dropdown Export | Per keberangkatan: total tagihan, bayar, sisa, deadline |
| Fix checkin_status di Excel Manifest | `/admin/departures/:id` | Sebelumnya selalu "-", kini otomatis dari data absensi |
| Dropdown Export Manifest | `/admin/departures/:id` | Konsolidasi 3 tombol → 1 dropdown 4 pilihan |
| Quick Actions JamaahPortal (5 kategori) | `/jamaah` | Perjalanan, Keuangan, Ibadah, Komunitas, Alat Bantu |
| BookingStatusPage enhanced | `/cek-booking` | Journey timeline, progress bar bayar, WA/Phone CTA |
| KalkulatorBiaya cicilan & WA dinamis | `/kalkulator` | DP + cicilan 3/6/12 bulan, nomor WA dari Supabase |

---

## H. QUICK REFERENCE — URL AKTIF SEMUA PORTAL

```
PUBLIK:
/                            ✅ Landing page
/packages                    ✅ Daftar paket + filter
/packages/compare            ✅ Bandingkan paket
/cek-booking                 ✅ Cek status + aktifkan reminder
/kalkulator                  ✅ Simulasi biaya + cicilan
/blog                        ✅ Blog
/a/:agentSlug                ✅ Website agen
/b/:branchSlug               ✅ Website cabang

CUSTOMER:
/customer/dashboard          ✅ Dashboard + countdown
/my-bookings                 ✅ List + filter
/my-bookings/:id             ✅ Detail + timeline bayar
/customer/my-savings         ✅ Tabungan + proyeksi
/customer/support            ✅ Support + upload lampiran

JAMAAH (34 halaman):
/jamaah                      ✅ Hub + cuaca + SOS
/jamaah/digital-id           ✅ QR ID
/jamaah/itinerary            ✅ Jadwal harian + bus
/jamaah/documents            ✅ Checklist dokumen
/jamaah/payment-history      ✅ Riwayat bayar
/jamaah/visa                 ✅ Tracker visa
/jamaah/panduan-ibadah       ✅ Panduan + kesehatan
/jamaah/checkin              ✅ QR check-in mandiri
/jamaah/bagasi               ✅ Status bagasi
/jamaah/kontrak              ✅ PDF perjanjian
/jamaah/chat                 ✅ Chat ↔ muthawif
/jamaah/galeri               ✅ Foto + like
/jamaah/badges               ✅ 15 badge + XP
/jamaah/target-ibadah        ✅ Target + streak
/jamaah/chatbot              ✅ AI FAQ
... (semua 34 halaman aktif)

AGEN:
/agent                       ✅ Dashboard
/agent/commissions           ✅ Komisi
/agent/jamaah                ✅ Daftar jamaah
/agent/targets               ✅ Target sales
/agent/wallet                ✅ Wallet
/agent/website               ✅ Website agen settings

CABANG:
(masih dikelola dari /admin/branches — panel mandiri belum ada)

MUTHAWIF:
/muthawif/dashboard          ✅ Dashboard muthawif
/muthawif/jamaah/:id         ✅ Detail jamaah

ADMIN (50+ halaman):
/admin                       ✅ Dashboard + alert cards
/admin/pembayaran-reminder   ✅ Kelola reminder WA
/admin/departures/:id        ✅ Detail + Export dropdown (PDF/Excel/Keuangan)
... (semua 50+ halaman aktif)
```

---

## I. CATATAN TEKNIS PENTING

- **Database**: Semua query via Supabase — gunakan `(supabase as any).from()` untuk tabel baru
- **TypeScript**: Gunakan `const supabaseRaw: any = supabase` untuk tabel yang belum di-type
- **File upload**: Bucket `payment-proofs`, `customer-documents`, `support-attachments`, `trip-photos` sudah ada
- **PDF**: `jspdf` + `jspdf-autotable` sudah terinstall
- **Excel**: `xlsx` + `xlsx-js-style` sudah terinstall
- **Charts**: `recharts` sudah terinstall
- **QR Code**: `qrcode` sudah terinstall
- **Real-time**: Supabase Realtime untuk chat, notifikasi, absensi
- **WhatsApp**: Gunakan pola `whatsapp-notifier` yang sudah ada di `/lib/whatsapp-notifier`
- **Tailwind**: v3 dengan PostCSS — jangan gunakan `@tailwindcss/vite`
- **Role**: `super_admin`, `owner`, `admin`, `branch_manager`, `agent`, `customer`, `jamaah`, `muthawif`
- **Permissions**: Tambah konstanta baru di `src/lib/permissions.ts` untuk fitur baru
- **Routing**: Lazy import di `AdminRoutes.tsx`, `AgentRoutes.tsx`, dll — jangan lupa tambahkan route setiap halaman baru
