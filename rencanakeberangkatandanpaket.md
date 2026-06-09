# Rencana Perbaikan: Menu Paket Umroh & Haji + Keberangkatan
**Tanggal:** Juni 2025  
**Platform:** Vinstour Travel Portal

---

## ANALISIS KONDISI SAAT INI

### Menu Paket Umroh & Haji (`/admin/packages`)

#### ✅ Yang Sudah Ada
- Daftar paket (card view + tabel analitik)
- Tab Tipe Paket — kelola jenis paket
- Filter: pencarian, tipe (regular/tabungan), status, quick filter (hampir penuh / segera)
- Bulk aksi: toggle aktif/nonaktif massal, pilih semua
- Export data: Excel, PDF, Statistik Kapasitas, Jadwal Keberangkatan, Laporan Ringkas PDF
- Tambah Paket: form Regular + Tabungan
- Kelola Label (badge khusus per paket)
- Duplikat paket
- Download Manifest PDF per paket
- Statistik paket (usePackageStats + usePackageAnalytics)

#### Detail Paket (`/admin/packages/:id`)
- Info paket + harga per tipe kamar
- Daftar keberangkatan terhubung + detail booking per departure
- Milestone Tracker (deadline dokumen/visa/pembayaran)
- Break-even Indicator
- Equipment Readiness
- Cancellation Policy
- Gallery foto paket
- Price Trend Chart
- Price Audit Log
- Departure Price Comparison

#### ❌ Yang Kurang / Perlu Diperbaiki

| No | Masalah | Dampak |
|----|---------|--------|
| 1 | Tidak ada shortcut "Tambah Jadwal" dari card paket | Harus buka menu Keberangkatan terpisah → kurang efisien |
| 2 | Form paket tidak punya field hotel/maskapai/muthawif (di level paket) | Data paket tidak lengkap, hotel/maskapai hanya bisa diset per jadwal |
| 3 | Tidak ada HPP Template preview dari level paket sebelum jadwal dibuat | Staff harus masuk ke jadwal dulu untuk lihat template HPP |
| 4 | Tidak ada SEO fields (meta title, meta description) per paket | Website tidak optimal untuk SEO |
| 5 | Tidak ada pengelompokan paket (grup: Ramadhan, Regular, Premium) | Sulit navigasi jika paket banyak |
| 6 | Analytics paket tidak menampilkan conversion rate (views → booking) | Tidak bisa ukur efektivitas marketing per paket |
| 7 | Informasi harga anak/bayi tidak terlihat di list paket | Calon jamaah yang ada anak perlu tanya manual |

---

### Menu Keberangkatan (`/admin/departures`)

#### ✅ Yang Sudah Ada
- Daftar jadwal (tabel) + Calendar View (kalender bulanan)
- Stats cards: Total, Terhubung Paket, Belum Terhubung, Masih Buka, Total Jamaah
- Filter: pencarian, status, bulan, koneksi (linked/unlinked)
- Sinkronkan Kuota (recalc booked_count dari booking aktif)
- Export Kalender ICS (Google Calendar / iCal)
- Tambah Jadwal (form lengkap)
- Edit, Hapus jadwal (dengan safety check booking)
- Notifikasi WA: pengingat berangkat, info manasik
- Link Itinerary per jadwal

#### Detail Jadwal (`/admin/departures/:id`)
- Tab Informasi: detail jadwal, penerbangan, hotel, kuota
- Tab Jemaah: daftar penumpang, filter, search, export (PDF manifest, Rooming List PDF, Excel, Keuangan Excel)
- Tab Checklist: pre-departure checklist + bulk apply template
- Tab Kamar: DepartureRoomingTab
- Tab Perlengkapan: EquipmentRealizationTab
- Tab Itinerary: link template itinerary
- Tab Budget: DepartureBudgetTab (budget vs realisasi)
- Tab Riwayat Harga: Margin Calculator + PriceHistoryCard
- Tab Operasional: shortcut ke fitur operasional

#### ❌ Yang Kurang / Perlu Diperbaiki

| No | Masalah | Dampak |
|----|---------|--------|
| 1 | **Tab Keuangan P&L belum ada** di detail jadwal | Komponen DeparturePLSummaryCard, DepartureCostItemsCard, DepartureExpensesCard, DepartureOtherRevenuesCard sudah dibuat tapi tidak diintegrasikan |
| 2 | Tidak ada fitur **Duplikat Jadwal** | Harus isi ulang semua data jika ingin buat jadwal serupa (mis. jadwal bulan depan) |
| 3 | Tidak ada **indikator HPP** di daftar jadwal | Staff tidak tahu mana jadwal yang sudah/belum diisi HPP-nya |
| 4 | Tidak ada **filter tahun** di daftar jadwal | Jika jadwal banyak, sulit filter per tahun |
| 5 | Tidak ada **bulk status change** | Harus ubah status satu per satu |
| 6 | Tidak ada tombol **"Tambah Booking"** langsung dari detail jadwal | Harus buka menu Booking terpisah |
| 7 | Tab Operasional hanya berisi text statis | Seharusnya berisi shortcut link yang bisa diklik langsung |
| 8 | Mismatch booked_count tidak ada tombol auto-fix di detail | Hanya ada banner peringatan, tidak ada tombol rekonsiliasi |
| 9 | Visa summary dan dokumen jamaah belum dalam tab tersendiri | Tersembunyi, tidak mudah ditemukan |
| 10 | Tidak ada **departure cloning dengan HPP** | Harus input HPP dari nol untuk setiap jadwal baru |

---

## PRIORITAS IMPLEMENTASI

### 🔴 PRIORITAS 1 — Segera (Dampak Tinggi, Effort Rendah-Sedang)

#### P1.1 ✅ Tab Keuangan P&L di Detail Jadwal
**Lokasi:** `AdminDepartureDetail.tsx`  
**Komponen siap pakai:** DeparturePLSummaryCard, DepartureCostItemsCard, DepartureExpensesCard, DepartureOtherRevenuesCard  
**Estimasi:** 30 menit  
**Nilai:** Staff keuangan bisa monitor HPP, pengeluaran, pendapatan tambahan, dan P&L dari satu tempat

#### P1.2 ✅ Duplikat Jadwal
**Lokasi:** `AdminDepartures.tsx` — dropdown menu per row  
**Logika:** Copy semua field kecuali booked_count (=0), status (='open'), departure_date (=null)  
**Estimasi:** 30 menit  
**Nilai:** Hemat 80% waktu saat buat jadwal serupa

#### P1.3 ✅ Indikator HPP di Daftar Jadwal
**Lokasi:** `AdminDepartures.tsx` — kolom status  
**Logika:** Query departure_cost_items, tampilkan ✅ jika sudah ada, ⚠️ jika belum  
**Estimasi:** 20 menit  
**Nilai:** Staff bisa langsung tahu mana jadwal yang belum diisi HPP

#### P1.4 ✅ Tombol "Tambah Jadwal" dari Card Paket
**Lokasi:** `AdminPackages.tsx` — dropdown action per card paket  
**Logika:** Buka DepartureForm dengan `package_id` sudah terisi  
**Estimasi:** 20 menit  
**Nilai:** Workflow lebih cepat, tidak perlu pindah menu

### 🟡 PRIORITAS 2 — Minggu Depan (Dampak Sedang, Effort Sedang)

#### P2.1 ✅ Filter Tahun di Daftar Jadwal
**Lokasi:** `AdminDepartures.tsx`  
**Logika:** Tambah select filter tahun di samping filter bulan

#### P2.2 ✅ Tombol "Tambah Booking" dari Detail Jadwal
**Lokasi:** `AdminDepartureDetail.tsx` — header  
**Logika:** Link ke `/admin/bookings/create?departure_id=xxx`, AdminBookingCreate baca param dan auto-fill paket + jadwal

#### P2.3 ✅ Tab Operasional Fungsional
**Lokasi:** `AdminDepartureDetail.tsx` — tab Operasional  
**Logika:** Card shortcut: Manifest PDF, Penugasan Kamar, Perlengkapan, Check-in QR, Email Manifest, Daftar Jamaah, Keuangan P&L, Pre-Departure Checklist

#### P2.4 ✅ Rekonsiliasi Kuota dari Detail Jadwal
**Lokasi:** `AdminDepartureDetail.tsx` — header + tab Operasional  
**Logika:** Tombol "Sinkronkan Kuota" memanggil recalculate_departure_booked_count

#### P2.5 ✅ Harga Anak/Bayi di Card Paket
**Lokasi:** `AdminPackages.tsx` — card paket  
**Logika:** Tampilkan persentase harga anak/bayi (child_price_percent / infant_price_percent) jika diisi

### 🟢 PRIORITAS 3 — Bulan Depan (Enhancement)

#### P3.1 ✅ SEO Fields per Paket & Jadwal
- meta_title, meta_description di PackageForm dan DepartureForm (SEO editor sudah ada)
- Digunakan di halaman publik

#### P3.2 ✅ Pengelompokan Paket (Package Groups) — SELESAI
- Tabel `package_groups` sudah ada + CRUD di AdminPackages.tsx
- Filter + grouping di list paket sudah berfungsi
- Tab "Grup Paket" di AdminPackages dengan tambah/edit/hapus grup

#### P3.3 Duplikat Jadwal + Copy HPP
- Saat duplikat jadwal, tawarkan pilihan: salin HPP template juga
- Hemat waktu input HPP untuk jadwal baru dari paket yang sama

#### P3.4 Analytics Paket Terintegrasi
- View counter dari website publik
- Conversion rate (views → inquiry → booking)
- Ditampilkan di detail paket

#### P3.5 Bulk Status Change Jadwal
- Select multiple jadwal, ubah status sekaligus
- Berguna saat menutup semua jadwal tahun lama

---

## STATUS IMPLEMENTASI

| ID | Fitur | Status | Tanggal |
|----|-------|--------|---------|
| P1.1 | Tab Keuangan P&L di Detail Jadwal | ✅ DONE | Juni 2025 |
| P1.2 | Duplikat Jadwal | ✅ DONE | Juni 2025 |
| P1.3 | Indikator HPP di Daftar Jadwal | ✅ DONE | Juni 2025 |
| P1.4 | Tombol Tambah Jadwal dari Card Paket | ✅ DONE | Juni 2025 |
| P2.1 | Filter Tahun | ✅ DONE | Juni 2025 |
| P2.2 | Tombol Tambah Booking dari Detail | ✅ DONE | Juni 2025 |
| P2.3 | Tab Operasional Fungsional | ✅ DONE | Juni 2025 |
| P2.4 | Rekonsiliasi Kuota dari Detail | ✅ DONE | Juni 2025 |
| P2.5 | Harga Anak/Bayi di Card | ✅ DONE | Juni 2025 |
| P3.1 | SEO Fields Paket & Jadwal (PackageForm, DepartureForm) | ✅ DONE | Juni 2025 |
| P3.2 | Package Groups | ✅ DONE | Juni 2025 |
| P3.3 | Duplikat + Copy HPP | ✅ DONE | Juni 2025 |
| P3.4 | Analytics Terintegrasi | ✅ DONE | Juni 2025 |
| P3.5 | Bulk Status Change | ✅ DONE | Juni 2025 |

---

---

# Analisis & Rencana SEO — Keberangkatan & Paket (Tambahan Juni 2025)

## Hasil Analisis SEO

### Status Halaman Publik

| Halaman | URL | useSEO | Status |
|---|---|---|---|
| PackageDetail | `/packages/:id` | ✅ | ✅ DONE |
| PackageList | `/packages` | ❓ Perlu verifikasi | ❓ |
| DeparturesPage | `/departures` | ✅ (import ditemukan di file) | ✅ DONE |

---

## Gap SEO & Status Implementasi

### ✅ SEO-1 — `useSEO` Hook (utilitas bersama)
**File:** `src/hooks/useSEO.ts` — VERIFIED EXISTS  
**Status:** ✅ DONE

### ❓ SEO-2 — SEO Halaman PackageList (`/packages`)
**Status:** Perlu verifikasi langsung ke file PackageList.tsx

### ✅ SEO-3 — SEO Halaman DeparturesPage (`/departures`)
**Status:** ✅ DONE — DeparturesPage.tsx import dan gunakan `useSEO`

### ❓ SEO-4 — Fix Bug PackageDetail
**Status:** Perlu verifikasi

### ❓ SEO-5 — Migrasi DB: SEO Fields untuk Departures
**Status:** DepartureForm sudah punya `meta_title`/`meta_description` fields → kemungkinan DONE

### ❓ SEO-6 — TouristTrip Schema di PackageDetail
**Status:** Perlu verifikasi

### ✅ SEO-7 — Admin SEO Editor untuk Departures
**File:** `src/components/admin/forms/DepartureForm.tsx` — punya meta_title/meta_description  
**Status:** ✅ DONE

### ❓ SEO-8 — Sitemap.xml Dinamis
**File:** `artifacts/api-server/src/routes/sitemap.ts` — file EXISTS  
**Status:** ✅ DONE (file sitemap.ts ditemukan di API server)

### ❓ SEO-9 — og:image Fallback Chain
**Status:** Perlu verifikasi di PackageDetail.tsx

---

## Fitur Publik Tambahan

| ID | Fitur | Status | Catatan |
|----|-------|--------|---------|
| PUB-1 | Halaman Cek Booking (`/cek-booking`) | ✅ DONE | Sudah ada + diperbarui Juni 2025 |

### PUB-1 ✅ Public Booking Status Tracker (`/cek-booking`)
- Jamaah masukkan kode booking → lihat status tanpa login
- Data via `GET /api/public/booking-status?code=xxx` (API server, bukan Supabase langsung)
- Keamanan: nama jamaah disamarkan server, tidak expose NIK/HP/email
- Fitur: journey timeline, progress pembayaran + riwayat, checklist dokumen, pengingat pelunasan WA, tombol bantuan WA/Telepon
- URL bookmarkable: `/cek-booking?code=BOOK-xxx`
- Style: `DynamicPublicLayout` + global tokens (`section-padded`, `container-page`, `heading-1`)

---

---

# Rencana Tour Guide System — Transmisi Digital Umroh & Haji

**Tanggal:** Juni 2026  
**Platform:** Vinstour Travel Portal  
**Scope:** Sistem komunikasi & operasional lapangan antara Tour Leader, Muthawif, dan Jamaah selama perjalanan umroh/haji — pengganti transmisi analog (walkie-talkie/HT)

---

## 1. ANALISIS KONDISI SAAT INI

### 1.1 Yang Sudah Ada

#### Infrastruktur Database
| Tabel | Keterangan | Status |
|-------|-----------|--------|
| `muthawifs` | Profil muthawif (nama, HP, foto, rating) | ✅ Ada |
| `departures.muthawif_id` | Penugasan muthawif ke keberangkatan | ✅ Ada |
| `departures.tour_leader_user_id` | User ID tour leader per keberangkatan | ✅ Ada |
| `customers.is_tour_leader` | Flag jamaah yang berperan sebagai tour leader | ✅ Ada |
| `sos_alerts` + `departure_id` | SOS darurat dengan routing per keberangkatan | ✅ Ada |
| `trip_timeline` | Timeline aktivitas per hari per keberangkatan | ✅ Ada |
| `manasik_schedules` + `manasik_attendance` | Jadwal & absensi manasik | ✅ Ada |
| `muthawif_jamaah_evaluations` | Penilaian muthawif terhadap jamaah | ✅ Ada |

#### Portal Muthawif (`/muthawif/*`) — Sudah Ada
| Halaman | Fitur | Status |
|---------|-------|--------|
| `MuthawifDashboard.tsx` | Dashboard, sesi absensi, notifikasi SOS real-time | ✅ Ada |
| `MuthawifSOS.tsx` | Monitor SOS masuk, respons penanganan | ✅ Ada |
| `MuthawifJamaahProfil.tsx` | Profil detail tiap jamaah di rombongan | ✅ Ada |
| `MuthawifPenilaianJamaah.tsx` | Input evaluasi jamaah | ✅ Ada |
| `MuthawifLaporanHarian.tsx` | Laporan harian ke kantor | ✅ Ada |

#### Portal Jamaah (`/jamaah/*`) — Sudah Ada
| Halaman | Fitur | Status |
|---------|-------|--------|
| `JamaahRombongan.tsx` | Daftar anggota rombongan | ✅ Ada |
| `JamaahPetaLokasi.tsx` | Peta lokasi penting (statis) | ✅ Ada |
| `JamaahItinerary.tsx` | Jadwal perjalanan (statis) | ✅ Ada |
| `JamaahCheckin.tsx` | Check-in keberangkatan | ✅ Ada |
| `JamaahSOSStatus.tsx` | Status SOS jamaah | ✅ Ada |
| `JamaahChat.tsx` | Chat (implementasi awal) | ✅ Ada |

---

### 1.2 Gap Analysis — Yang Belum Ada

| # | Gap | Dampak Operasional |
|---|-----|--------------------|
| G1 | **Portal Tour Leader** terpisah dari muthawif | Tour leader tidak punya akses panel khusus; harus pakai akun admin penuh |
| G2 | **Transmisi / Broadcast real-time** ke seluruh rombongan | Harus hubungi satu per satu via WA; tidak efisien saat di lapangan |
| G3 | **Live location sharing** guide → jamaah | Jamaah tidak tahu posisi guide; mudah terpisah |
| G4 | **Absensi QR per sesi** di lapangan | Tidak ada bukti kehadiran per aktivitas; laporan manual |
| G5 | **Program harian live** yang bisa diupdate real-time | Jamaah lihat itinerary statis; tidak ada info delay/perubahan mendadak |
| G6 | **Pengelompokan rombongan** (sub-grup bus/kamar/kelompok ibadah) | Semua jamaah dalam satu grup; sulit koordinasi bus berbeda |
| G7 | **Notifikasi push** dari guide ke jamaah | Tidak ada push dari sisi guide; hanya WA manual |
| G8 | **Histori transmisi** tersimpan per keberangkatan | Semua komunikasi hanya di WA, tidak ter-log di sistem |
| G9 | **Dashboard admin** monitor semua rombongan aktif secara bersamaan | Admin tidak tahu kondisi lapangan secara real-time |
| G10 | **Digital name tag** / identitas jamaah yang bisa di-scan guide | Identifikasi jamaah masih manual, rawan kesalahan |

---

## 2. ARSITEKTUR SISTEM

### 2.1 Aktor & Peran

```
ADMIN (kantor)
  ├── Lihat semua rombongan aktif
  ├── Monitor transmisi semua group
  └── Intervensi darurat dari kantor

TOUR LEADER (Pimpinan Rombongan — biasanya jamaah senior / staff kantor)
  ├── Akses: /tour-leader/* (portal khusus)
  ├── Tanggung jawab: koordinasi seluruh rombongan dari Indonesia
  ├── Bisa kirim broadcast ke SEMUA jamaah rombongan
  ├── Bisa buat sub-grup (per bus, per kelompok)
  └── Lihat semua absensi + laporan muthawif

MUTHAWIF (Guide lokal Arab Saudi — pihak Saudi)
  ├── Akses: /muthawif/* (portal sudah ada, perlu diperluas)
  ├── Tanggung jawab: panduan ibadah, ziarah, lokasi
  ├── Bisa kirim broadcast ke rombongannya
  ├── Input absensi per sesi ibadah / ziarah
  └── Laporan harian ke tour leader + admin

JAMAAH
  ├── Akses: /jamaah/* (portal sudah ada, perlu diperluas)
  ├── Terima broadcast dari TL & muthawif
  ├── Lihat program harian live (bisa berubah real-time)
  ├── Scan QR absensi tiap sesi
  ├── Tombol SOS darurat
  └── Lihat posisi guide di peta (jika guide share lokasi)
```

### 2.2 Konsep "Transmisi Digital"

> Transmisi dalam konteks ini adalah sistem **broadcast satu-ke-banyak** (guide → jamaah), ditambah **komunikasi dua-arah terbatas** (jamaah → guide via tombol panic/SOS/pertanyaan). Ini adalah pengganti digital dari alat HT/walkie-talkie yang biasa dipakai saat umroh.

**Tiga mode transmisi:**
1. **Broadcast teks** — Guide tulis pesan singkat → semua jamaah terima notifikasi push + muncul di portal
2. **Live program update** — Guide update status aktivitas hari ini (delay, lokasi ganti, tambahan sesi)
3. **Siaran darurat** — Alert merah ke semua jamaah (SOS balik: dari guide ke jamaah, bukan hanya sebaliknya)

---

## 3. DATABASE SCHEMA — TABEL BARU

### Migration: `074_tour_guide_system.sql`

```sql
-- ─── 1. Group Channels (saluran per rombongan) ───────────────────────────────
CREATE TABLE IF NOT EXISTS guide_channels (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    uuid NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  name            text NOT NULL DEFAULT 'Rombongan',
  channel_type    text NOT NULL DEFAULT 'all'  -- 'all' | 'bus_1' | 'bus_2' | 'custom'
                  CHECK (channel_type IN ('all','bus_1','bus_2','bus_3','custom')),
  created_by      uuid REFERENCES auth.users(id),
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 2. Transmisi Messages (broadcast dari guide) ────────────────────────────
CREATE TABLE IF NOT EXISTS guide_broadcasts (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id      uuid NOT NULL REFERENCES guide_channels(id) ON DELETE CASCADE,
  departure_id    uuid NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  sender_user_id  uuid NOT NULL REFERENCES auth.users(id),
  sender_role     text NOT NULL CHECK (sender_role IN ('tour_leader','muthawif','admin')),
  message_type    text NOT NULL DEFAULT 'info'
                  CHECK (message_type IN ('info','warning','emergency','program_update','location_share')),
  title           text,
  body            text NOT NULL,
  metadata        jsonb,         -- { location: {lat,lng,label}, program_item_id, etc. }
  is_pinned       boolean NOT NULL DEFAULT false,
  expires_at      timestamptz,   -- pesan sementara (mis. "Bus tiba 10 menit lagi")
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 3. Broadcast Reads (tracking siapa sudah baca) ──────────────────────────
CREATE TABLE IF NOT EXISTS guide_broadcast_reads (
  broadcast_id    uuid NOT NULL REFERENCES guide_broadcasts(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (broadcast_id, user_id)
);

-- ─── 4. Session Attendance (absensi per sesi lapangan) ───────────────────────
CREATE TABLE IF NOT EXISTS guide_sessions (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    uuid NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  session_type    text NOT NULL  -- 'bus_boarding' | 'sholat' | 'ziarah' | 'makan' | 'hotel_checkin' | 'custom'
                  CHECK (session_type IN ('bus_boarding','sholat','ziarah','makan','hotel_checkin','airport','custom')),
  title           text NOT NULL,
  location        text,
  scheduled_at    timestamptz,
  started_at      timestamptz,
  ended_at        timestamptz,
  qr_token        text UNIQUE,   -- token untuk QR scan absensi jamaah
  qr_expires_at   timestamptz,
  created_by      uuid REFERENCES auth.users(id),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guide_session_attendance (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id      uuid NOT NULL REFERENCES guide_sessions(id) ON DELETE CASCADE,
  customer_id     uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status          text NOT NULL DEFAULT 'absent'
                  CHECK (status IN ('present','absent','late','excused')),
  check_in_at     timestamptz,
  check_in_method text  CHECK (check_in_method IN ('qr_scan','manual','auto')),
  notes           text,
  UNIQUE (session_id, customer_id)
);

-- ─── 5. Live Location (guide share posisi ke jamaah) ─────────────────────────
CREATE TABLE IF NOT EXISTS guide_locations (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    uuid NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('tour_leader','muthawif')),
  label           text,          -- "Saya di pintu 79 Masjidil Haram"
  latitude        double precision NOT NULL,
  longitude       double precision NOT NULL,
  accuracy        double precision,
  shared_until    timestamptz,   -- otomatis stop share setelah waktu ini
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ─── 6. Sub-grup Rombongan (per bus / kelompok) ───────────────────────────────
CREATE TABLE IF NOT EXISTS guide_subgroups (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    uuid NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  channel_id      uuid REFERENCES guide_channels(id) ON DELETE SET NULL,
  name            text NOT NULL,  -- "Bus 1", "Kelompok Madinah"
  color           text,           -- warna badge di UI
  created_by      uuid REFERENCES auth.users(id),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guide_subgroup_members (
  subgroup_id     uuid NOT NULL REFERENCES guide_subgroups(id) ON DELETE CASCADE,
  customer_id     uuid NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  PRIMARY KEY (subgroup_id, customer_id)
);

-- ─── 7. Daily Program (program harian live, bisa diubah real-time) ────────────
-- Menggunakan trip_timeline yang sudah ada (migration 057), ditambah:
ALTER TABLE trip_timeline ADD COLUMN IF NOT EXISTS is_delayed     boolean DEFAULT false;
ALTER TABLE trip_timeline ADD COLUMN IF NOT EXISTS delay_minutes  integer;
ALTER TABLE trip_timeline ADD COLUMN IF NOT EXISTS location_changed_to text;
ALTER TABLE trip_timeline ADD COLUMN IF NOT EXISTS updated_by     uuid REFERENCES auth.users(id);
ALTER TABLE trip_timeline ADD COLUMN IF NOT EXISTS updated_at     timestamptz DEFAULT now();
ALTER TABLE trip_timeline ADD COLUMN IF NOT EXISTS visible_to_jamaah boolean DEFAULT true;

-- ─── RLS Policies ─────────────────────────────────────────────────────────────
ALTER TABLE guide_channels           ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_broadcasts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_broadcast_reads    ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_session_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_locations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_subgroups          ENABLE ROW LEVEL SECURITY;
ALTER TABLE guide_subgroup_members   ENABLE ROW LEVEL SECURITY;

-- Broadcast: jamaah baca milik departure-nya sendiri
CREATE POLICY "jamaah_read_broadcasts" ON guide_broadcasts FOR SELECT USING (
  departure_id IN (
    SELECT b.departure_id FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    WHERE c.user_id = auth.uid() AND b.status NOT IN ('cancelled')
  )
  OR EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
             AND role IN ('super_admin','owner','branch_manager','operational'))
  OR departure_id IN (
    SELECT d.id FROM departures d
    JOIN muthawifs m ON m.id = d.muthawif_id
    WHERE m.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
  OR departure_id IN (SELECT id FROM departures WHERE tour_leader_user_id = auth.uid())
);

-- Guide/TL/admin bisa insert broadcast
CREATE POLICY "guide_insert_broadcasts" ON guide_broadcasts FOR INSERT WITH CHECK (
  sender_user_id = auth.uid()
  AND (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
            AND role IN ('super_admin','owner','branch_manager','operational'))
    OR departure_id IN (SELECT id FROM departures WHERE tour_leader_user_id = auth.uid())
    OR departure_id IN (
      SELECT d.id FROM departures d JOIN muthawifs m ON m.id = d.muthawif_id
      WHERE m.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
);
```

---

## 4. HALAMAN BARU — PORTAL TOUR LEADER

### Portal: `/tour-leader/*`

```
/tour-leader                  → TourLeaderDashboard (ringkasan rombongan + broadcast cepat)
/tour-leader/broadcast        → TourLeaderBroadcast (kirim pesan ke semua/sub-grup)
/tour-leader/attendance       → TourLeaderAttendance (buat sesi + lihat absensi per sesi)
/tour-leader/program          → TourLeaderProgram (program harian live, bisa edit jadwal)
/tour-leader/map              → TourLeaderMap (share lokasi + lihat jamaah yang SOS)
/tour-leader/rombongan        → TourLeaderRombongan (daftar jamaah + sub-grup manajemen)
/tour-leader/subgroups        → TourLeaderSubgroups (kelola bus/kelompok)
/tour-leader/laporan          → TourLeaderLaporan (buat laporan harian ke admin)
```

#### TourLeaderDashboard
- Stats: Total jamaah, hadir hari ini, SOS aktif, pesan belum dibaca guide
- Widget Transmisi Cepat: input 1 baris → kirim broadcast ke semua
- Widget SOS aktif (merah, jika ada)
- Live program hari ini (checklist aktivitas)
- Daftar sub-grup dengan status kehadiran ringkas
- Status lokasi guide (apakah sedang di-share)

#### TourLeaderBroadcast
- Pilih channel: Semua Rombongan / Bus 1 / Bus 2 / Custom
- Tipe pesan: Info (biru) / Perhatian (kuning) / Darurat (merah) / Update Program (hijau)
- Input judul + isi pesan
- Opsi: pin pesan, atur waktu kedaluwarsa (misal 2 jam)
- Histori broadcast: semua transmisi hari ini + berapa jamaah sudah baca (%)

#### TourLeaderAttendance
- Buat sesi baru: nama sesi, jenis, lokasi, waktu
- Generate QR code (refresh token tiap 5 menit untuk keamanan)
- Tampilkan QR besar di layar untuk jamaah scan
- Live counter: hadir / belum hadir
- Daftar yang belum check-in (merah) vs sudah (hijau)
- Tandai manual (untuk jamaah yang tidak bisa scan)
- Export absensi ke PDF/Excel

#### TourLeaderProgram (live itinerary)
- Timeline hari ini dengan status tiap item (belum / sedang / selesai / ditunda)
- Edit inline: ubah jam, tambah catatan, tandai delay
- Semua perubahan otomatis tampil di portal jamaah
- Tombol "Tandai Selesai" per item → broadcast otomatis ke jamaah

#### TourLeaderMap
- Tombol "Share Lokasi Sekarang" → GPS browser → simpan ke `guide_locations`
- Auto-stop setelah X jam (default 4 jam)
- Lihat jamaah yang aktif SOS di peta
- Tampilkan nama + jarak tiap jamaah dari posisi guide (jika jamaah share lokasi)

---

## 5. HALAMAN BARU — PERLUASAN PORTAL MUTHAWIF

Muthawif sudah punya portal. Tambahan yang diperlukan:

```
/muthawif/broadcast           → MuthawifBroadcast (kirim transmisi ke rombongannya)
/muthawif/attendance/:id      → MuthawifAbsensiSesi (absensi per sesi ibadah/ziarah)
/muthawif/program             → MuthawifProgram (lihat + update program ibadah)
/muthawif/location            → MuthawifShareLokasi (share posisi ke jamaah)
```

> **Perbedaan TL vs Muthawif:**  
> Tour Leader → koordinasi keseluruhan (transport, hotel, jadwal)  
> Muthawif → panduan ibadah spesifik (ziarah, manasik, doa, lokasi suci)

---

## 6. HALAMAN BARU — PERLUASAN PORTAL JAMAAH

Jamaah sudah punya portal. Tambahan yang diperlukan:

```
/jamaah/transmisi             → JamaahTransmisi (terima broadcast dari TL & muthawif)
/jamaah/absensi               → JamaahAbsensi (scan QR absensi sesi)
/jamaah/program-live          → JamaahProgramLive (program harian real-time)
/jamaah/lokasi-guide          → JamaahLokasiGuide (posisi guide di peta live)
/jamaah/id-digital            → JamaahDigitalID (sudah ada, perlu QR barcode untuk scan)
```

#### JamaahTransmisi (halaman utama penerima transmisi)
- Feed broadcast terbaru (kartu warna-warni per tipe: info/warning/darurat)
- Badge merah di BottomNav jika ada pesan belum dibaca
- Pesan darurat selalu di paling atas + warna merah + auto-notifikasi push
- Pesan kedaluwarsa diarsip (collapse, bisa dibuka)
- Tombol "Tandai Semua Dibaca"

#### JamaahAbsensi (scan QR sesi)
- Scan QR dari layar guide
- Konfirmasi hadir: "✅ Kehadiran Anda di sesi [nama] berhasil dicatat"
- Riwayat kehadiran semua sesi hari ini

#### JamaahProgramLive (itinerary real-time)
- Timeline hari ini, otomatis update jika guide ubah jadwal
- Indikator: ✅ Selesai / 🕐 Sedang berlangsung / ⏳ Akan datang / ⚠️ Ditunda X menit
- Notifikasi push saat ada perubahan program

#### JamaahLokasiGuide (peta posisi guide)
- Tampil posisi guide real-time (update setiap 30 detik dari DB)
- Link ke Google Maps untuk navigasi ke posisi guide
- Label dari guide ("Saya di pintu King Fahd Masjidil Haram")
- Jika guide tidak share lokasi: "Posisi belum dibagikan saat ini"

---

## 7. KOMPONEN ADMIN — MONITOR LAPANGAN

### Halaman baru: `/admin/lapangan`

Untuk admin kantor memantau semua rombongan yang sedang aktif di lapangan:

```
/admin/lapangan               → AdminLapangan (dashboard semua rombongan aktif)
/admin/lapangan/:departure_id → AdminLapanganDetail (detail 1 rombongan: broadcast, absensi, SOS)
```

#### AdminLapangan
- Grid kartu per rombongan aktif (status: Dalam Perjalanan, Di Makkah, Di Madinah, Kembali)
- Per kartu: nama jadwal, jumlah jamaah, % hadir sesi terakhir, SOS aktif, last broadcast
- Filter: tanggal keberangkatan, status
- Tombol kirim broadcast dari kantor ke rombongan tertentu

#### AdminLapanganDetail
- Tab: Transmisi | Absensi | Program | SOS | Lokasi Guide
- Broadcast dari kantor ke rombongan ini
- Monitor real-time semua aktivitas rombongan

---

## 8. PRIORITAS IMPLEMENTASI

### FASE 1 — Fondasi ✅ SELESAI (Juni 2026)

#### F1.1 Migration Database (`075_tour_guide_system.sql`)
- Semua tabel baru: `guide_channels`, `guide_broadcasts`, `guide_broadcast_reads`, `guide_sessions`, `guide_session_attendance`, `guide_locations`, `guide_subgroups`
- Alter `trip_timeline` dengan kolom tambahan
- RLS policies lengkap

#### F1.2 Portal Tour Leader — 3 halaman inti
- `TourLeaderDashboard` — ringkasan + broadcast cepat
- `TourLeaderBroadcast` — kirim + histori transmisi
- `TourLeaderAttendance` — buat sesi + generate QR + input manual

#### F1.3 Portal Jamaah — 2 halaman baru
- `JamaahTransmisi` — feed broadcast dengan badge unread
- `JamaahAbsensi` — scan QR sesi

#### F1.4 Notifikasi Push
- Saat ada broadcast baru → push notification ke semua jamaah di channel
- Saat ada broadcast darurat → push ke seluruh jamaah rombongan (bypass do-not-disturb)
- Gunakan `push_subscriptions` + VAPID yang sudah ada di sistem

---

### FASE 2 — Program Live & Lokasi (1 minggu) 🟡

#### F2.1 Live Program Board
- `TourLeaderProgram` — edit timeline hari ini real-time
- `JamaahProgramLive` — view jamaah yang auto-update
- Alter `trip_timeline` (kolom delay, location_changed_to)

#### F2.2 Live Location Sharing
- `TourLeaderMap` — tombol share GPS
- `JamaahLokasiGuide` — view posisi guide
- Auto-expire lokasi setelah 4 jam tidak di-update

#### F2.3 Perluasan Portal Muthawif
- `MuthawifBroadcast` — transmisi dari muthawif
- `MuthawifAbsensiSesi` — input absensi sesi ibadah

---

### FASE 3 — Sub-grup & Admin Monitor (1 minggu) 🟢

#### F3.1 Sub-grup Rombongan
- `TourLeaderSubgroups` — kelola bus/kelompok
- Broadcast per sub-grup (Bus 1, Bus 2, dll)
- Warna badge per sub-grup di daftar jamaah

#### F3.2 Admin Monitor Lapangan
- `AdminLapangan` — dashboard semua rombongan aktif
- `AdminLapanganDetail` — detail per rombongan

#### F3.3 Analytics Transmisi
- Rata-rata % baca per broadcast
- Kehadiran per sesi (grafik per hari)
- Response time SOS (dari kirim → muthawif respons)

---

## 9. SPESIFIKASI TEKNIS

### 9.1 Real-time (Polling vs WebSocket)

Karena sistem sudah menggunakan Neon PostgreSQL + Express (bukan Supabase Realtime), opsi yang realistis:

| Fitur | Mekanisme | Interval |
|-------|-----------|----------|
| Broadcast baru | **Polling** via `useQuery` | 15 detik |
| Live program update | **Polling** | 30 detik |
| Posisi guide | **Polling** | 30 detik |
| SOS masuk (guide) | **Polling** | 10 detik |
| Absensi counter (TL) | **Polling** | 5 detik saat sesi aktif |

> Polling cukup untuk use-case ini. Guide tidak mengetik setiap detik; broadcast tipikal 1–5x per hari per sesi. Supabase Realtime bisa ditambahkan di fase berikutnya jika latency jadi masalah.

### 9.2 QR Absensi

- Token QR: `{session_id}:{random_token}:{expires_ts}` → di-hash + encode base64
- Divalidasi di endpoint: `POST /api/v1/guide/sessions/:id/checkin`
- Token expire setiap 5 menit, guide bisa regenerate
- QR tampil sebagai gambar (gunakan library `qrcode` di frontend)
- Jamaah buka `/jamaah/absensi`, scan dengan kamera → submit token → konfirmasi

### 9.3 Role Guard

| URL Prefix | Role yang Diizinkan |
|------------|---------------------|
| `/tour-leader/*` | `tour_leader_user_id` di departures = user login, ATAU `is_tour_leader = true` di customers |
| `/muthawif/*` | email user = `muthawifs.email` dengan departure aktif |
| `/jamaah/*` | jamaah dengan booking aktif |
| `/admin/lapangan/*` | super_admin, owner, branch_manager, operational |

### 9.4 Struktur Notifikasi Push

```typescript
// Broadcast biasa
{
  title: "[Vinstour] Info Rombongan",
  body: "Bus sudah tiba di depan hotel. Mohon berkumpul 5 menit lagi.",
  icon: "/logo-192.png",
  badge: "/badge.png",
  data: { url: "/jamaah/transmisi", broadcast_id: "..." }
}

// Broadcast darurat
{
  title: "⚠️ PERHATIAN PENTING — Rombongan",
  body: "Harap tidak meninggalkan area Masjidil Haram. Ada situasi yang perlu diperhatikan.",
  requireInteraction: true,  // tidak hilang sendiri
  vibrate: [300, 100, 300, 100, 300],
  data: { url: "/jamaah/transmisi", urgent: true }
}
```

### 9.5 API Endpoints Baru

```
GET    /api/v1/guide/channels/:departure_id           → daftar channels per keberangkatan
POST   /api/v1/guide/broadcasts                       → kirim broadcast baru
GET    /api/v1/guide/broadcasts/:departure_id         → riwayat broadcast (dengan unread flag)
POST   /api/v1/guide/broadcasts/:id/read             → tandai satu broadcast dibaca
POST   /api/v1/guide/broadcasts/read-all             → tandai semua dibaca
POST   /api/v1/guide/sessions                         → buat sesi absensi baru
GET    /api/v1/guide/sessions/:departure_id           → daftar sesi hari ini
POST   /api/v1/guide/sessions/:id/checkin             → jamaah scan QR → check in
GET    /api/v1/guide/sessions/:id/attendance          → daftar hadir/absen per sesi
POST   /api/v1/guide/sessions/:id/attendance/:cust    → input manual kehadiran
POST   /api/v1/guide/locations                        → update/share posisi guide
GET    /api/v1/guide/locations/:departure_id          → posisi guide aktif
DELETE /api/v1/guide/locations/:id                    → stop share lokasi
GET    /api/v1/guide/subgroups/:departure_id          → daftar sub-grup
POST   /api/v1/guide/subgroups                        → buat sub-grup
POST   /api/v1/guide/subgroups/:id/members            → tambah anggota sub-grup
PATCH  /api/v1/guide/program/:departure_id/:day       → update program harian live
```

---

## 10. STATUS IMPLEMENTASI

| ID | Fitur | Status | Target |
|----|-------|--------|--------|
| F1.1 | Migration 075 (`guide_channels`, `guide_broadcasts`, `guide_sessions`, `guide_session_attendance`, `guide_locations`) | ✅ Selesai | Fase 1 |
| F1.2a | TourLeaderDashboard (`/tour-leader`) | ✅ Selesai | Fase 1 |
| F1.2b | TourLeaderBroadcast (`/tour-leader/broadcast`) | ✅ Selesai | Fase 1 |
| F1.2c | TourLeaderAttendance + QR (`/tour-leader/attendance`) | ✅ Selesai | Fase 1 |
| F1.3a | JamaahTransmisi (`/jamaah/transmisi`) | ✅ Selesai | Fase 1 |
| F1.3b | JamaahAbsensi (`/jamaah/absensi`) | ✅ Selesai | Fase 1 |
| F1.4 | Push notif broadcast darurat | ✅ DONE | Juni 2025 |
| F2.1 | TourLeaderProgram + JamaahProgramLive | ✅ DONE | Juni 2025 |
| F2.2 | Live location sharing (TL + jamaah view) | ✅ DONE | Juni 2025 |
| F2.3 | MuthawifBroadcast + MuthawifAbsensi | ✅ DONE | Juni 2025 |
| F3.1 | Sub-grup rombongan (per bus/kelompok) | ✅ DONE | Juni 2025 |
| F3.2 | AdminLapangan (monitor semua rombongan) | ✅ DONE | Juni 2025 |
| F3.3 | Analytics transmisi & kehadiran | ✅ DONE | Juni 2025 |

---

*Terakhir diperbarui: Juni 2026 — Rencana Tour Guide System (Transmisi Digital) Umroh & Haji*
