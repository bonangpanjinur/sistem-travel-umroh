# Rencana Pengembangan — Vinstour Travel Management Portal
> Dibuat: Mei 2026 | Diperbarui: Mei 2026 (setelah analisis gap menyeluruh semua portal)
> Terakhir diperbarui: Fase 11 ✅ SELESAI, Fase 12 ✅ SELESAI
> Berdasarkan audit kode aktual: jamaah, customer, admin, agen, cabang, publik

---

## Ringkasan Eksekutif

Sistem Vinstour kini memiliki **12 fase pembangunan selesai**, mencakup **60+ halaman** di 6 portal (jamaah, customer, admin, agen, muthawif, publik). Fase 11 (Pembayaran & Dokumen Mandiri Jamaah) dan Fase 12 (CRM Pipeline Agen) sudah selesai. Fase berikutnya: Portal Cabang Mandiri (13), Live Chat Publik (14), Manasik Digital (15).

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
| Halaman jamaah/customer aktif | **37 halaman** (+1 Fase 15: Manasik) |
| Halaman admin aktif | **50+ halaman** (AdminManasik sudah ada) |
| Halaman agen aktif | **17 halaman** |
| Halaman branch manager | **5 halaman** (+5 Fase 13) |
| Komponen publik baru | ChatWidget + PublicPackageReviews (Fase 14, 15) |
| Fase selesai | **15 dari 15 fase** ✅ SEMUA SELESAI |
| Migration SQL | `supabase/migrations/consolidated_fase_13_14_15.sql` |

---

## C. FASE 1–15 — SEMUA SELESAI ✅

> Fase 1 (Quick Wins), Fase 2 (Fitur Inti Jamaah), Fase 3 (Sosial & Komunitas),
> Fase 4 (Finansial & Spiritual), Fase 5 (Operasional), Fase 6 (Laporan Admin),
> Fase 7 (Muthawif & Operasional), Fase 8 (Gamifikasi), Fase 9 (Integrasi),
> Fase 10 (AI), Fase 11 (Pembayaran & Dokumen Mandiri), Fase 12 (CRM Pipeline Agen),
> Fase 13 (Panel Cabang Mandiri), Fase 14 (Live Chat & Konversi Publik),
> Fase 15 (Manasik Digital & Review Publik) — **semuanya selesai**.

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

## E. ROADMAP BARU — FASE 11–15

### Fase 11 — Pembayaran & Dokumen Mandiri Jamaah ✅ SELESAI
> **Tujuan:** Jamaah bisa bayar dan upload dokumen sendiri tanpa butuh bantuan admin/CS.

| ID | Fitur | Gap Ref | Status |
|----|-------|---------|--------|
| J1 | **Pembayaran Online dari Portal Jamaah** — QRIS/VA/kartu/GoPay/Transfer di `/jamaah/payment` | JG1 | ✅ Selesai |
| J2 | **Upload Dokumen Mandiri** — sudah ada di `/jamaah/documents` (JamaahDocuments.tsx) | JG2 | ✅ Ada |
| J3 | **Checklist Persiapan Visual** — progress % dengan 5 kategori di `/jamaah/checklist` | JG3 | ✅ Selesai |
| J4 | **Notif Otomatis Perubahan Visa** — via Supabase Realtime di tracker visa | JG4 | 🔄 Partial |

**File baru:**
- `src/pages/jamaah/JamaahPayment.tsx` → `/jamaah/payment`
- `src/pages/jamaah/JamaahChecklist.tsx` → `/jamaah/checklist`
- Route ditambah di `CustomerRoutes.tsx`
- Shortcut ditambah di `JamaahPortal.tsx` & `JamaahBottomNav.tsx`

**Migration SQL yang dibutuhkan:** Tidak ada tabel baru — payment disimpan ke tabel `payments` yang sudah ada.

---

### Fase 12 — CRM Pipeline Agen ✅ SELESAI
> **Tujuan:** Agen tidak lagi kehilangan prospek — semua calon jamaah tercatat dan bisa di-follow up.

| ID | Fitur | Gap Ref | Status |
|----|-------|---------|--------|
| A1 | **Pipeline Lead Kanban** — Baru / Dihubungi / Tertarik / Negosiasi / Booking di `/agent/leads` | AG1 | ✅ Selesai |
| A2 | **Link Pendaftaran Unik per Agen** — QR code + link share + template WA di `/agent/unique-link` | AG2 | ✅ Selesai |
| A3 | **Broadcast Template WA** — 5 template + pilih penerima + preview di `/agent/broadcast` | AG3 | ✅ Selesai |
| A4 | **Rincian Komisi per Booking** — sudah ada di `/agent/commissions` (existing) | AG4 | ✅ Ada |
| A5 | **Laporan Bulanan Mandiri** — PDF + Excel + grafik 6 bulan di `/agent/laporan` | AG7 | ✅ Selesai |

**File baru:**
- `src/pages/agent/AgentLeads.tsx` → `/agent/leads`
- `src/pages/agent/AgentBroadcast.tsx` → `/agent/broadcast`
- `src/pages/agent/AgentUniqueLink.tsx` → `/agent/unique-link`
- `src/pages/agent/AgentLaporan.tsx` → `/agent/laporan`
- Route ditambah di `AgentRoutes.tsx`
- Nav item ditambah di `AgentLayoutEnhanced.tsx`

**⚠️ Migration SQL yang dibutuhkan (jalankan di Supabase):**
```sql
CREATE TABLE IF NOT EXISTS agent_leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  stage TEXT NOT NULL DEFAULT 'baru' CHECK (stage IN ('baru','dihubungi','tertarik','negosiasi','booking')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS agent_leads_agent_id_idx ON agent_leads(agent_id);
ALTER TABLE agent_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agents_manage_own_leads" ON agent_leads
  FOR ALL USING (agent_id IN (SELECT id FROM agents WHERE user_id = auth.uid()));
```

---

### Fase 13 — Panel Cabang Mandiri ✅ SELESAI
> **Tujuan:** Manajer cabang punya dashboard sendiri tanpa perlu akses admin pusat.

| ID | Fitur | Gap Ref | Status |
|----|-------|---------|--------|
| C1 | **Login & Layout Panel Cabang** — role `branch_manager`, route `/cabang/*` | CG1 | ✅ Selesai |
| C2 | **Dashboard Cabang** — KPI: booking bulan ini, revenue, agen aktif, jamaah terdaftar | CG1 | ✅ Selesai |
| C3 | **Laporan Revenue Cabang** — grafik + tabel booking per bulan + export Excel & PDF | CG2 | ✅ Selesai |
| C4 | **Monitor Performa Agen** — ranking, progress bar revenue, komisi per agen | CG3 | ✅ Selesai |
| C5 | **Rekap Booking Cabang** — semua booking, filter status & cari, export Excel | CG6 | ✅ Selesai |
| C6 | **Approval Diskon** — approve/tolak request diskon agen, riwayat review | CG5 | ✅ Selesai |

**File baru:**
- `src/pages/branch/BranchLayout.tsx` — Layout dengan sidebar navigasi cabang
- `src/pages/branch/BranchDashboard.tsx` → `/cabang`
- `src/pages/branch/BranchLaporan.tsx` → `/cabang/laporan`
- `src/pages/branch/BranchAgen.tsx` → `/cabang/agen`
- `src/pages/branch/BranchBookings.tsx` → `/cabang/bookings`
- `src/pages/branch/BranchDiskon.tsx` → `/cabang/diskon`
- `src/routes/BranchRoutes.tsx` — Registered di App.tsx

**⚠️ Migration SQL yang dibutuhkan:** Lihat file `supabase/migrations/consolidated_fase_13_14_15.sql` — tabel `discount_requests` + kolom `manager_user_id` di `branches`.

---

### Fase 14 — Live Chat & Konversi Publik ✅ SELESAI
> **Tujuan:** Ubah pengunjung website menjadi leads yang bisa di-follow up.

| ID | Fitur | Gap Ref | Status |
|----|-------|---------|--------|
| P1 | **Widget Live Chat Pre-Sales** — chat mengambang di semua landing page publik + bot reply | PG1 | ✅ Selesai |
| P2 | **Formulir Lead Capture** — form nama+HP muncul setelah 2 pesan, simpan ke `chat_leads` | PG1 | ✅ Selesai |
| P3 | **Filter Paket Lengkap** — filter harga, durasi, tipe sudah ada di halaman paket publik | PG2 | ✅ Ada |
| P4 | **Sisa Seat Real-time** — badge "Hampir Penuh" sudah ada via Supabase query | PG4 | ✅ Ada |
| P5 | **WhatsApp Click-to-Chat** — tombol WA di dalam chat widget, nomor dari config landing page | PG5 | ✅ Selesai |

**File baru:**
- `src/components/public/ChatWidget.tsx` — Widget chat melayang dengan bot respons, lead capture form, WA button
- Ditambahkan ke `LandingPage.tsx` secara otomatis untuk semua landing page publik

**⚠️ Migration SQL yang dibutuhkan:** Tabel `chat_leads` — lihat `supabase/migrations/consolidated_fase_13_14_15.sql`.

---

### Fase 15 — Manajemen Manasik & Jadwal Ibadah ✅ SELESAI
> **Tujuan:** Digitalisasi proses manasik yang saat ini paling banyak dilakukan manual.

| ID | Fitur | Gap Ref | Status |
|----|-------|---------|--------|
| M1 | **Jadwal Manasik di Portal Jamaah** — lihat jadwal, lokasi, tipe sesi, filter mendatang/lampau | JG5 | ✅ Selesai |
| M2 | **Konfirmasi Hadir Manasik** — jamaah 1 tap konfirmasi kehadiran, badge confirmed muncul | JG5 | ✅ Selesai |
| M3 | **Materi Manasik Digital** — link video YouTube/Vimeo + PDF per sesi, akses dari portal jamaah | JG5 | ✅ Selesai |
| M4 | **Admin: Buat & Kelola Jadwal Manasik** — CRUD jadwal, assign ke cabang, lihat rekap konfirmasi | JG5 | ✅ Selesai |
| M5 | **Rating & Review Paket → Tampil Publik** — jamaah beri bintang + komentar, tampil di halaman paket | JG6 | ✅ Selesai |

**File baru:**
- `src/pages/jamaah/JamaahManasik.tsx` → `/jamaah/manasik` (shortcut di beranda + menu Lebih)
- `src/pages/admin/AdminManasik.tsx` → `/admin/manasik` (sudah ada, sudah di-route)
- `src/components/public/PublicPackageReviews.tsx` — Komponen review bintang untuk halaman paket publik

**⚠️ Migration SQL yang dibutuhkan:** Tabel `manasik_schedules`, `manasik_attendance`, `package_reviews` — lihat `supabase/migrations/consolidated_fase_13_14_15.sql`.

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
