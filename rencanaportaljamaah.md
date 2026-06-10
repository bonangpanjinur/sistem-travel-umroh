# Rencana Portal Jamaah — `/jamaah`

> **Dokumen perencanaan utama** untuk pengembangan Portal Jamaah.
> Diperbarui: Mei 2025 | Status: Aktif
>
> **Prinsip Utama:** Portal ini adalah **pendamping ibadah**, bukan etalase promosi.
> Promosi dan katalog paket ada, tapi diletakkan di bawah — bukan yang pertama dilihat.

---

## 1. Filosofi & Tujuan

### Tujuan Primer
Memudahkan **ibadah di tanah suci (Umroh/Haji)** dan **ibadah sehari-hari** di mana pun jamaah berada.

### Tujuan Sekunder
Memudahkan koordinasi antara jamaah, muthawif, dan tour leader selama keberangkatan.

### Yang BUKAN tujuan utama (de-prioritas sekarang)
- Promosi paket wisata
- Akuisisi pelanggan baru
- Landing page marketing

---

## 2. Satu URL, Tiga Wajah

URL: `/jamaah` — sama untuk semua.
**Yang membedakan: peran (role) saat login.**

```
/jamaah
  ├── Belum login            → Tampilan Tamu: ibadah publik + tombol login
  ├── Login sebagai Jamaah   → Mode Jamaah
  ├── Login sebagai Muthawif → Mode Muthawif
  └── Login sebagai Tour Leader → Mode Tour Leader
```

### Implementasi Teknis
File utama: `JamaahPortal.tsx`
Gunakan hook `useAuth()` untuk baca `user?.role` dan tentukan mode tampilan.

```tsx
// Pseudocode di JamaahPortal.tsx
const { user } = useAuth();

if (user?.role === "muthawif") return <MuthawifHomeView />;
if (user?.role === "tour_leader") return <TourLeaderHomeView />;
return <JamaahHomeView />;  // jamaah, customer, tamu
```

---

## 3. Mode Perjalanan (Trip Mode)

Selain role, tampilan juga berubah berdasarkan **status perjalanan aktif**.

### Deteksi Mode Otomatis
Cek dari booking jamaah yang sedang berjalan:
```
SELECT * FROM bookings 
WHERE customer_id = $userId 
  AND status = 'confirmed'
  AND departure_date <= NOW() 
  AND return_date >= NOW()
LIMIT 1
```

### Dua Mode Jamaah

| Mode | Kondisi | Tampilan Utama |
|------|---------|----------------|
| **ON_TRIP** (Di Tanah Suci) | Ada booking aktif + tanggal sekarang dalam range perjalanan | Itinerary hari ini, sholat, panduan ibadah di sana |
| **OFF_TRIP** (Harian) | Tidak ada perjalanan aktif | Ibadah harian, jadwal sholat lokal, Al-Quran, zikir |

---

## 4. Tampilan per Role

---

### 4A. Mode JAMAAH — OFF_TRIP (Tampilan Default / Harian)

Ini tampilan saat jamaah tidak sedang dalam perjalanan.

#### Prioritas Konten (urutan dari atas ke bawah):

**Blok 1 — Header Sholat (PALING ATAS)**
- Waktu sholat berikutnya + countdown
- Nama waktu sholat sekarang
- Lokasi otomatis (GPS atau kota terakhir)

**Blok 2 — Quick Access Ibadah**
```
[ Jadwal Sholat ]  [ Kiblat ]  [ Al-Quran ]  [ Zikir ]
[ Doa Harian ]    [ Kalender ] [ Target ]    [ Panduan ]
```

**Blok 3 — Tracker Ibadah Pribadi**
- Progress sholat hari ini (berapa yang sudah dikerjakan)
- Target zikir harian
- Streak ibadah (gamifikasi ringan)

**Blok 4 — Persiapan Perjalanan** (jika ada booking upcoming)
- Countdown keberangkatan
- Checklist dokumen
- Status visa
- Checklist perlengkapan

**Blok 5 — Status Booking** (jika ada)
- Status pembayaran
- Nomor booking

**Blok 6 — Konten Islami Ringan**
- Ayat/hadith hari ini
- Artikel tips ibadah

**Blok 7 — Promosi & Paket** ← PALING BAWAH, tidak wajib dilihat

---

### 4B. Mode JAMAAH — ON_TRIP (Sedang di Tanah Suci)

Ini tampilan saat jamaah sedang dalam perjalanan aktif (umroh/haji).

#### Prioritas Konten (urutan dari atas ke bawah):

**Blok 1 — Status Hari Ini** ← HERO SECTION
```
┌─────────────────────────────────────┐
│  Hari ke-3 dari 12 hari             │
│  Makkah Al-Mukarramah               │
│  Kamis, 15 Mei 2025                 │
└─────────────────────────────────────┘
```

**Blok 2 — Jadwal Sholat Makkah/Madinah**
- Waktu sholat setempat (real-time, bukan estimasi)
- Waktu Maghrib khusus (penting untuk buka puasa jika Ramadhan)
- Azan countdown

**Blok 3 — Itinerary Hari Ini**
```
┌─────────────────────────────────────┐
│  HARI INI                           │
│  06:00  Sarapan di Hotel Hilton     │
│  08:00  Tawaf Wajib ← (sekarang)   │ ← highlight yang sedang/akan berlangsung
│  10:00  Sa'i                        │
│  12:00  Istirahat                   │
│  16:00  Ziarah Jabal Nur            │
└─────────────────────────────────────┘
```

**Blok 4 — Info Hotel & Transportasi**
- Nama hotel + lantai + nomor kamar
- Nomor bus rombongan
- Jadwal bus berikutnya

**Blok 5 — Rombongan & Kontak Darurat**
- Nama tour leader + nomor HP
- Nama muthawif + nomor HP
- Tombol SOS (merah, selalu visible)
- Jumlah anggota rombongan

**Blok 6 — Panduan Ibadah Kontekstual**
Konten berubah sesuai lokasi/jadwal:
- Jika di Makkah: Panduan Tawaf, Sa'i, Istilam Hajar Aswad
- Jika di Madinah: Adab Ziarah Nabi, doa di Raudhah
- Jika mendekati Arafah: Panduan Wuquf
- Doa-doa spesifik tempat tersebut

**Blok 7 — Cuaca & Kondisi**
- Suhu udara Makkah/Madinah
- Peringatan panas terik (>40°C)
- Status kepadatan Masjidil Haram

**Blok 8 — Jurnal Perjalanan**
- Catatan/foto hari ini
- Kenangan yang bisa disimpan

---

### 4C. Mode MUTHAWIF

Muthawif adalah pemandu lokal yang mendampingi rombongan di Tanah Suci.

#### Kebutuhan Utama Muthawif:
1. Lihat daftar jamaah rombongan yang dipegangnya
2. Rekap absensi & kehadiran kegiatan
3. Laporkan kondisi/kejadian hari ini
4. Pantau SOS dari jamaah
5. Kirim pengumuman ke rombongan

#### Tampilan Home Muthawif:

**Blok 1 — Header Operasional**
```
┌─────────────────────────────────────┐
│  Assalamu'alaykum, Ustadz Mahmud    │
│  Rombongan: Kloter 3-A (24 orang)  │
│  Hari ini: Rabu, 15 Mei 2025        │
└─────────────────────────────────────┘
```

**Blok 2 — Quick Action**
```
[ ✓ Absensi ]  [ 📢 Pengumuman ]  [ 🆘 SOS Alert ]
[ 📋 Laporan ] [ 👥 Profil Jamaah]
```

**Blok 3 — Jadwal Kegiatan Hari Ini**
Program yang harus dipandu hari ini

**Blok 4 — Status Rombongan**
- Berapa yang sudah check-in kegiatan
- Peringatan jika ada jamaah yang belum konfirmasi
- Riwayat kehadiran

**Blok 5 — Laporan Harian**
Form singkat: kondisi jamaah, insiden, catatan

---

### 4D. Mode TOUR LEADER

Tour leader memimpin seluruh rombongan dari Indonesia.

#### Kebutuhan Utama Tour Leader:
1. Broadcast pengumuman ke semua jamaah
2. Pantau status seluruh rombongan (kesehatan, SOS, kehadiran)
3. Kelola itinerary (update real-time jika ada perubahan)
4. Koordinasi dengan muthawif
5. Tanda tangani/approve dokumen operasional

#### Tampilan Home Tour Leader:

**Blok 1 — Command Center**
```
┌─────────────────────────────────────┐
│  Tour Leader Dashboard              │
│  Rombongan: 48 jamaah               │
│  Muthawif: 2 orang                  │
│  Hari ke-5 / 12 hari                │
└─────────────────────────────────────┘
```

**Blok 2 — Status Real-time Rombongan**
- ✅ Hadir: 45 | ⚠️ Absen: 2 | 🆘 SOS aktif: 1
- Notifikasi SOS langsung menonjol di atas

**Blok 3 — Broadcast Pengumuman**
Form cepat kirim pesan ke semua jamaah

**Blok 4 — Itinerary Hari Ini + Esok**
Dengan kemampuan edit langsung

**Blok 5 — Koordinasi Muthawif**
Status masing-masing muthawif

---

## 5. Navigasi Bottom Tab (Mobile-First)

### Jamaah OFF_TRIP (5 tab):
```
[ 🏠 Beranda ] [ 🕌 Ibadah ] [ 📖 Al-Quran ] [ 🗂️ Booking ] [ 👤 Profil ]
```

### Jamaah ON_TRIP (5 tab):
```
[ 📅 Hari Ini ] [ 🕌 Sholat ] [ 🗺️ Peta ] [ 👥 Rombongan ] [ 🆘 SOS ]
```

### Muthawif (4 tab):
```
[ 🏠 Beranda ] [ ✓ Absensi ] [ 📢 Pengumuman ] [ 👥 Jamaah ]
```

### Tour Leader (4 tab):
```
[ 📊 Overview ] [ 📅 Itinerary ] [ 📢 Broadcast ] [ 👥 Rombongan ]
```

---

## 6. Fitur Ibadah — Rincian

Semua fitur berikut sudah ada halamannya. Yang perlu dilakukan: **memastikan aksesnya mudah dari dashboard, bukan tersembunyi di menu.**

### Fitur Aktif (sudah ada, perlu diprioritaskan di UI):

| Fitur | File | Mode | Keterangan |
|-------|------|------|------------|
| Jadwal Sholat | `JamaahWaktuSholat.tsx` | Semua | Lokasi GPS otomatis |
| Arah Kiblat | `JamaahKiblat.tsx` | Semua | Kompas digital |
| Al-Quran | `JamaahAlQuran.tsx` | Semua | Baca + audio |
| Zikir Digital | `JamaahZikir.tsx` | Semua | Counter + panduan |
| Doa-doa | `JamaahDoaPanduan.tsx` | Semua | Berdasarkan situasi |
| Panduan Ibadah | `JamaahPanduanIbadah.tsx` | Semua | Umroh/Haji step by step |
| Manasik Interaktif | `JamaahManasikInteraktif.tsx` | OFF_TRIP | Persiapan sebelum berangkat |
| Tracker Ibadah | `JamaahTrackerIbadah.tsx` | Semua | Log ibadah harian |
| Target Ibadah | `JamaahTargetIbadah.tsx` | Semua | Streak & gamifikasi |
| Kalkulator Zakat | `JamaahKalkulatorZakat.tsx` | Semua | Hitung zakat |
| Itinerary | `JamaahItinerary.tsx` | ON_TRIP | Jadwal per hari |
| Peta Lokasi | `JamaahPetaLokasi.tsx` | ON_TRIP | Peta tanah suci |

### Fitur yang Perlu Dibangun / Disempurnakan:

| Kode | Fitur | Prioritas | Keterangan |
|------|-------|-----------|------------|
| **PJ-01** | Dashboard berbasis role (jamaah/muthawif/tourleader) | 🔴 KRITIS | Refactor `JamaahPortal.tsx` jadi role-aware |
| **PJ-02** | Deteksi ON_TRIP otomatis dari booking aktif | 🔴 KRITIS | Query booking table, tampilkan mode yang tepat |
| **PJ-03** | Itinerary hari ini sebagai HERO section saat ON_TRIP | 🔴 KRITIS | Ambil dari `itinerary` tabel, highlight kegiatan sekarang |
| **PJ-04** | Jadwal sholat kontekstual (Makkah/Madinah saat ON_TRIP) | 🔴 KRITIS | Override lokasi ke Makkah/Madinah saat di tanah suci |
| **PJ-05** | Bottom nav berganti sesuai mode (ON_TRIP vs OFF_TRIP) | 🟠 PENTING | Update `JamaahBottomNav.tsx` |
| **PJ-06** | Info hotel + kamar di header saat ON_TRIP | 🟠 PENTING | Ambil dari `bookings` table (hotel_name, room_type) |
| **PJ-07** | Kontak darurat (tour leader + muthawif) selalu visible | 🟠 PENTING | Fixed FAB atau sticky section |
| **PJ-08** | Panduan ibadah kontekstual (berubah sesuai lokasi/hari) | 🟡 NORMAL | Engine: pilih panduan berdasarkan itinerary hari ini |
| **PJ-09** | Muthawif home view tersendiri | 🟡 NORMAL | Saat ini MuthawifDashboard terpisah — gabungkan ke /jamaah |
| **PJ-10** | Tour leader home view tersendiri | 🟡 NORMAL | Saat ini TourLeaderDashboard terpisah — gabungkan ke /jamaah |
| **PJ-11** | Jurnal perjalanan harian (catatan + foto) | 🟡 NORMAL | `JamaahJurnal.tsx` sudah ada, tambahkan akses cepat |
| **PJ-12** | Cuaca Makkah/Madinah real-time | 🟢 MINOR | `CuacaWidget.tsx` sudah ada |
| **PJ-13** | Hapus/sembunyikan promosi dari homepage saat ON_TRIP | 🟠 PENTING | `FeaturedPackages`, `BannerCarousel` → sembunyikan mode ON_TRIP |

---

## 7. Struktur Data yang Dibutuhkan

### Query: deteksi ON_TRIP
```sql
-- Cek apakah jamaah sedang dalam perjalanan aktif
SELECT 
  b.id,
  b.departure_date,
  b.return_date,
  b.hotel_name,
  b.room_type,
  b.bus_number,
  p.name AS package_name,
  p.destination_city,
  tl.full_name AS tour_leader_name,
  tl.phone AS tour_leader_phone
FROM bookings b
JOIN packages p ON b.package_id = p.id
LEFT JOIN profiles tl ON b.tour_leader_id = tl.id
WHERE b.customer_id = :userId
  AND b.status = 'confirmed'
  AND b.departure_date <= CURRENT_DATE
  AND b.return_date >= CURRENT_DATE
LIMIT 1
```

### Query: itinerary hari ini
```sql
SELECT *
FROM package_itinerary
WHERE package_id = :packageId
  AND day_number = (CURRENT_DATE - :departureDate + 1)
ORDER BY start_time ASC
```

### Query: rombongan untuk muthawif/tour leader
```sql
SELECT b.*, p.full_name, p.phone, p.photo_url
FROM bookings b
JOIN profiles p ON b.customer_id = p.id
WHERE b.departure_id = :departureId
  AND b.status = 'confirmed'
ORDER BY p.full_name ASC
```

---

## 8. Urutan Pengerjaan (Sprint)

### Sprint 16 — Fondasi Role-Based Portal (KRITIS)
**Target: Portal punya tampilan berbeda per role dan per mode perjalanan.**

- [ ] **PJ-01**: Refactor `JamaahPortal.tsx` — deteksi role, render view yang sesuai
- [ ] **PJ-02**: Hook `useActiveTrip()` — query booking aktif, return trip data atau null
- [ ] **PJ-03**: Komponen `TripHeroSection` — itinerary hari ini saat ON_TRIP
- [ ] **PJ-04**: Integrasi jadwal sholat Makkah/Madinah saat ON_TRIP
- [ ] **PJ-05**: `JamaahBottomNav` berubah berdasarkan mode
- [ ] **PJ-13**: Sembunyikan promosi saat ON_TRIP

### Sprint 17 — Penyempurnaan Ibadah Harian
**Target: OFF_TRIP experience terasa seperti companion ibadah harian.**

- [ ] **PJ-06**: Info hotel di hero saat ON_TRIP
- [ ] **PJ-07**: Kontak darurat sticky/FAB
- [ ] Sholat countdown widget di halaman utama (bukan hanya di halaman WaktuSholat)
- [ ] Shortcut ibadah 1-tap di homepage (sholat, kiblat, quran, zikir)

### Sprint 18 — Muthawif & Tour Leader Terintegrasi
**Target: Muthawif dan TL bisa akses fungsi mereka dari /jamaah, bukan URL terpisah.**

- [ ] **PJ-09**: Muthawif home view di /jamaah
- [ ] **PJ-10**: Tour Leader home view di /jamaah
- [ ] **PJ-08**: Panduan ibadah kontekstual

### Sprint 19 — Penyempurnaan UX & Konten
- [ ] **PJ-11**: Jurnal perjalanan mudah diakses
- [ ] **PJ-12**: Widget cuaca
- [ ] Konten Islami harian (ayat, hadith) tanpa API eksternal
- [ ] Mode offline untuk panduan ibadah (PWA cache)

---

## 9. Yang TIDAK Dikerjakan Dulu

Fitur-fitur ini ditunda sampai core ibadah selesai:

- Katalog paket / promosi di homepage jamaah
- Referral & reward points
- Wishlist paket
- Banner marketing
- Testimoni pelanggan di portal jamaah

> Alasan: Jamaah yang sudah booking dan sedang ibadah tidak butuh iklan. Promosi akan mengganggu fokus ibadah mereka.

---

## 10. Komponen Baru yang Perlu Dibuat

### `useActiveTrip.ts`
```typescript
// Hook untuk deteksi apakah user sedang dalam perjalanan aktif
// Return: { trip: TripData | null, isOnTrip: boolean, daysLeft: number }
```

### `TripHeroSection.tsx`
```typescript
// Komponen hero saat ON_TRIP
// Props: trip, itinerary (hari ini), waktuSholat
// Tampilkan: hari ke-X, itinerary aktif, hotel, cuaca
```

### `JamaahHomeOffTrip.tsx`
```typescript
// View jamaah saat OFF_TRIP (tidak sedang di tanah suci)
// Fokus: ibadah harian, jadwal sholat, upcoming trip (jika ada)
```

### `JamaahHomeOnTrip.tsx`
```typescript
// View jamaah saat ON_TRIP (sedang di tanah suci)
// Fokus: TripHeroSection, itinerary, sholat setempat, kontak darurat
```

### `MuthawifHomeView.tsx`
```typescript
// View muthawif di /jamaah (pindah dari /muthawif)
// Atau: tetap di /muthawif, tapi /jamaah redirect ke sana untuk role muthawif
```

### `TourLeaderHomeView.tsx`
```typescript
// View tour leader di /jamaah (pindah dari /tour-leader/dashboard)
// Atau: tetap di /tour-leader, tapi /jamaah redirect ke sana untuk role tour_leader
```

---

## 11. Keputusan Arsitektur

### Opsi A: Satu file, if/else per role (direkomendasikan Sprint 16)
```tsx
// JamaahPortal.tsx
if (role === "muthawif") return <MuthawifHomeView />;
if (role === "tour_leader") return <TourLeaderHomeView />;
if (isOnTrip) return <JamaahHomeOnTrip trip={trip} />;
return <JamaahHomeOffTrip />;
```
✅ Satu entry point, mudah di-maintain
✅ URL tetap `/jamaah` untuk semua

### Opsi B: Redirect ke URL masing-masing
```
/jamaah → redirect ke /muthawif (jika role muthawif)
/jamaah → redirect ke /tour-leader (jika role tour_leader)
```
✅ File lebih kecil, separation of concerns
❌ URL berbeda — kurang konsisten dengan visi "satu URL"

**Keputusan: Opsi A untuk Sprint 16, bisa refactor ke Opsi B nanti jika terlalu besar.**

---

## 12. File yang Akan Diubah

| File | Perubahan |
|------|-----------|
| `JamaahPortal.tsx` | Tambah role detection + trip mode detection. Render view berbeda. |
| `JamaahBottomNav.tsx` | Tab berbeda untuk ON_TRIP vs OFF_TRIP |
| `CustomerRoutes.tsx` | Tidak ada perubahan routing — semua tetap lewat `/jamaah` |

| File Baru | Tujuan |
|-----------|--------|
| `hooks/useActiveTrip.ts` | Deteksi perjalanan aktif dari DB |
| `pages/jamaah/JamaahHomeOnTrip.tsx` | View saat di tanah suci |
| `pages/jamaah/JamaahHomeOffTrip.tsx` | View ibadah harian |
| `components/jamaah/TripHeroSection.tsx` | Hero section itinerary hari ini |
| `components/jamaah/EmergencyContactBar.tsx` | Kontak darurat sticky |
| `components/jamaah/IbadahShortcuts.tsx` | Grid shortcut ibadah (4-8 tombol) |
| `components/jamaah/SholatCountdownWidget.tsx` | Countdown sholat berikutnya |

---

*Dokumen ini adalah rencana hidup — perbarui setiap sprint selesai.*
