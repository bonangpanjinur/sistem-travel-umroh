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

#### P3.2 ❌ Pengelompokan Paket (Package Groups) — BELUM DIKERJAKAN
- Tabel `package_groups` (Ramadhan, Regular, Premium, Haji, Wisata)
- Filter + grouping di list paket
- Belum ada di codebase sama sekali

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
| P3.2 | Package Groups | ❌ BELUM | - |
| P3.3 | Duplikat + Copy HPP | ❓ Perlu verifikasi | - |
| P3.4 | Analytics Terintegrasi | ❓ Perlu verifikasi | - |
| P3.5 | Bulk Status Change | ❓ Perlu verifikasi | - |

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
