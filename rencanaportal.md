# Rencana Portal Jamaah — Vinstour Travel

> **Status**: Implementasi aktif | Terakhir diperbarui: 2026-06-09

Portal jamaah (`/jamaah`) adalah aplikasi mandiri untuk jamaah umroh & haji Vinstour. Tujuan: semua fitur yang jamaah butuhkan tersedia di dalam portal — tidak ada navigasi keluar ke halaman website utama.

---

## 🔴 Masalah yang Ditemukan (Audit)

### Route Keluar dari Portal (KRITIS)
| Menu / Link | Route Lama | Seharusnya |
|---|---|---|
| Booking Saya (bottom nav) | `/my-bookings` | `/jamaah/booking` ✅ |
| Profil & Akun (sidebar/more menu) | `/customer/settings` | `/jamaah/profil` ✅ |
| Semua Paket (empty state card) | `/packages` | `/jamaah/paket` ✅ |
| Lihat Detail Booking | `/my-bookings/:id` | `/jamaah/booking/:id` ✅ |
| Upload Bukti Bayar | `/my-bookings/:id/payment` | `/jamaah/payment` (sudah ada) ✅ |
| Link Paket di Recently Viewed | `/packages/:slug` | `/jamaah/paket/:slug` ✅ |
| Toko (IslamicHomeSections) | `/store` | `/jamaah/toko` (phase 2) |
| Katalog Paket (IslamicHomeSections) | `/packages` | `/jamaah/paket` ✅ |

### Komponen Website yang Muncul di Portal (MASALAH UX)
- `BannerCarousel` — banner promosi website, tidak relevan untuk jamaah yang sudah booking
- `QuickMenuGrid` — menu cepat website (link ke `/packages`, `/store`, dll)
- `FeaturedPackages` — katalog paket website (bukan portal)
- `WhyChooseUs` — konten marketing website
- `Testimonials` — review website
- `ThemedCTASection` — CTA website

> Semua section di atas sebaiknya **dinonaktifkan secara default** dari admin PWA Settings agar portal jamaah tidak terlihat seperti website.

---

## 🗺️ Struktur Route Portal Jamaah (Target)

```
/jamaah                     → Dashboard / Beranda Portal
/jamaah/welcome             → Onboarding (first-time login)
/jamaah/booking             → Daftar Booking Saya (BARU)
/jamaah/booking/:id         → Detail Booking (BARU — sebelumnya /my-bookings/:id)
/jamaah/paket               → Katalog Paket Umroh & Haji (BARU — bukan /packages)
/jamaah/paket/:slug         → Detail Paket (BARU)
/jamaah/profil              → Profil & Pengaturan Akun (BARU — sebelumnya /customer/settings)
/jamaah/payment             → Bayar Online (sudah ada)
/jamaah/payment-history     → Riwayat Pembayaran (sudah ada)
/jamaah/itinerary           → Jadwal Perjalanan Live (sudah ada)
/jamaah/documents           → Dokumen & Upload (sudah ada)
/jamaah/checklist           → Checklist Persiapan (sudah ada)
/jamaah/digital-id          → ID Digital / QR Card (sudah ada)
/jamaah/rombongan           → Info Rombongan & Anggota (sudah ada)
/jamaah/visa                → Tracker Status Visa (sudah ada)
/jamaah/bagasi              → Info Bagasi & Ketentuan (sudah ada)
/jamaah/kontrak             → Kontrak Perjalanan (sudah ada)
/jamaah/checkin             → Check-in Digital (sudah ada)
/jamaah/manasik             → Manasik Digital (sudah ada)
/jamaah/panduan-ibadah      → Panduan Ibadah Lengkap (sudah ada)
/jamaah/waktu-sholat        → Jadwal Sholat Realtime (sudah ada)
/jamaah/doa-panduan         → Doa & Dzikir (sudah ada)
/jamaah/tracker-ibadah      → Tracker Ibadah Harian (sudah ada)
/jamaah/pengingat-ibadah    → Pengingat & Alarm Ibadah (sudah ada)
/jamaah/kiblat              → Kompas Kiblat (sudah ada)
/jamaah/galeri              → Galeri Foto Perjalanan (sudah ada)
/jamaah/progress-wall       → Progress Wall Komunitas (sudah ada)
/jamaah/feedback            → Feedback & Rating (sudah ada)
/jamaah/kesehatan           → Profil Kesehatan Jamaah (sudah ada)
/jamaah/notifications       → Notifikasi (sudah ada)
/jamaah/pantau-keluarga     → Pantau Lokasi Keluarga (sudah ada)
/jamaah/chatbot             → Chatbot AI Umroh (sudah ada)
```

---

## 🎯 Fitur Unggulan Portal Jamaah

### Kelompok: Perjalanan Saya
| Fitur | Route | Status | Prioritas |
|---|---|---|---|
| Dashboard Beranda | `/jamaah` | ✅ Ada (perlu perbaikan) | P0 |
| Daftar Booking Saya | `/jamaah/booking` | ✅ Dibuat | P0 |
| Detail Booking | `/jamaah/booking/:id` | ✅ Dibuat | P0 |
| Hitung Mundur Keberangkatan | (di dashboard) | ✅ Ada | P0 |
| Jadwal Perjalanan Live | `/jamaah/itinerary` | ✅ Ada | P0 |
| ID Digital / QR Jamaah | `/jamaah/digital-id` | ✅ Ada | P0 |
| Tracker Status Visa | `/jamaah/visa` | ✅ Ada | P1 |
| Info Rombongan | `/jamaah/rombongan` | ✅ Ada | P1 |
| Check-in Digital | `/jamaah/checkin` | ✅ Ada | P1 |
| Info Bagasi | `/jamaah/bagasi` | ✅ Ada | P2 |

### Kelompok: Administrasi & Keuangan
| Fitur | Route | Status | Prioritas |
|---|---|---|---|
| Bayar Online / Cicilan | `/jamaah/payment` | ✅ Ada | P0 |
| Riwayat Pembayaran | `/jamaah/payment-history` | ✅ Ada | P0 |
| Invoice PDF | `/jamaah/invoice` | ✅ Ada | P0 |
| Upload Dokumen | `/jamaah/documents` | ✅ Ada | P0 |
| Checklist Persiapan | `/jamaah/checklist` | ✅ Ada | P1 |
| Kontrak Perjalanan | `/jamaah/kontrak` | ✅ Ada | P1 |

### Kelompok: Ibadah & Spiritual
| Fitur | Route | Status | Prioritas |
|---|---|---|---|
| Manasik Digital Interaktif | `/jamaah/manasik` | ✅ Ada | P0 |
| Panduan Ibadah Lengkap | `/jamaah/panduan-ibadah` | ✅ Ada | P0 |
| Waktu Sholat Realtime | `/jamaah/waktu-sholat` | ✅ Ada | P0 |
| Doa & Dzikir | `/jamaah/doa-panduan` | ✅ Ada | P1 |
| Kompas Kiblat | `/jamaah/kiblat` | ✅ Ada | P1 |
| Al-Quran Digital | `/jamaah/al-quran` | ✅ Ada | P1 |
| Tracker Ibadah Harian | `/jamaah/tracker-ibadah` | ✅ Ada | P1 |
| Zikir Counter | `/jamaah/zikir` | ✅ Ada | P2 |
| Pengingat Alarm Ibadah | `/jamaah/pengingat-ibadah` | ✅ Ada | P2 |

### Kelompok: Komunitas & Sosial
| Fitur | Route | Status | Prioritas |
|---|---|---|---|
| Galeri Foto Perjalanan | `/jamaah/galeri` | ✅ Ada | P1 |
| Info Sesama Rombongan | `/jamaah/rombongan` | ✅ Ada | P1 |
| Progress Wall | `/jamaah/progress-wall` | ✅ Ada | P2 |
| Pantau Lokasi Keluarga | `/jamaah/pantau-keluarga` | ✅ Ada | P2 |
| Feedback & Rating | `/jamaah/feedback` | ✅ Ada | P2 |

### Kelompok: Paket & Informasi
| Fitur | Route | Status | Prioritas |
|---|---|---|---|
| Katalog Paket Portal | `/jamaah/paket` | ✅ Dibuat | P1 |
| Detail Paket Portal | `/jamaah/paket/:slug` | ✅ Dibuat | P1 |
| Profil & Pengaturan Akun | `/jamaah/profil` | ✅ Dibuat | P0 |
| Kalkulator Kurs | `/jamaah/kalkulator-kurs` | ✅ Ada | P2 |
| Kalkulator Zakat | `/jamaah/kalkulator-zakat` | ✅ Ada | P2 |
| Profil Kesehatan | `/jamaah/kesehatan` | ✅ Ada | P2 |

---

## 🎨 Panduan UI/UX Portal Jamaah

### Prinsip Desain
1. **Mobile-first** — mayoritas jamaah akses via HP
2. **Tidak ada link keluar** — semua navigasi tetap di `/jamaah/*`
3. **Bottom nav 4 item** — Beranda, Booking, Pembayaran, Profil (konsisten)
4. **Warna tema**: Emerald/Teal (primary) + Gold (aksen) untuk nuansa islami
5. **Dark mode** — wajib didukung semua halaman

### Bottom Nav (Mobile) — Target
```
[ 🏠 Beranda ]  [ 📋 Booking ]  [ 💳 Bayar ]  [ 👤 Profil ]
   /jamaah       /jamaah/booking  /jamaah/payment  /jamaah/profil
```

### Sidebar (Desktop) — Struktur Group
```
Perjalanan      Ibadah          Komunitas       Akun
─────────────   ─────────────   ─────────────   ─────────────
Beranda         Manasik         Galeri Foto     Notifikasi
Booking Saya    Panduan Ibadah  Progress Wall   Pantau Keluarga
Itinerary       Waktu Sholat    Rombongan       Profil & Akun
ID Digital      Doa & Dzikir    Feedback
Tracker Visa    Tracker Ibadah
```

### Dashboard Beranda — Komponen Prioritas
1. **Header personal** (greeting + avatar + quick stats strip)
2. **Hitung mundur keberangkatan** (jika sudah booking)
3. **Status Card Booking Aktif** (paket, tanggal, hotel, muthawif)
4. **Quick Actions** (bayar, dokumen, itinerary, checklist)
5. **Notifikasi terbaru** (top 3)
6. **Waktu Sholat hari ini** (selalu berguna)
7. **Widget Ibadah** (doa harian, zikir counter)
8. **Info Cuaca** (CuacaWidget — sudah ada)
9. **Katalog Paket** (hanya jika belum booking / untuk jamaah yang ingin booking lagi)

---

## 📋 Sprint Implementasi

### ✅ Sprint 1 — Fix Routes Kritis (SELESAI)
- [x] Buat `/jamaah/booking` (JamaahBookingList.tsx) — daftar booking portal
- [x] Buat `/jamaah/booking/:id` (JamaahBookingDetail.tsx) — detail booking portal
- [x] Buat `/jamaah/paket` (JamaahKatalogPaket.tsx) — katalog paket portal
- [x] Buat `/jamaah/profil` (JamaahProfil.tsx) — profil & pengaturan portal
- [x] Update JamaahBottomNav — ganti semua route keluar
- [x] Update JamaahPortal — fix link `/my-bookings`, `/packages`
- [x] Update IslamicHomeSections — fix link `/packages`, `/store`
- [x] Register route baru di CustomerRoutes.tsx

### 🔲 Sprint 2 — Redesign Dashboard Portal (UI/UX)
- [ ] Ganti komponen website (BannerCarousel, QuickMenuGrid, FeaturedPackages, dll) dengan komponen portal
- [ ] Buat `PortalBookingCard.tsx` — card booking aktif di dashboard
- [ ] Buat `PortalQuickActions.tsx` — 4 tombol aksi cepat portal
- [ ] Buat `PortalWaktuSholat.tsx` — mini widget waktu sholat di dashboard
- [ ] Buat `PortalNotifCard.tsx` — card notifikasi terbaru di dashboard
- [ ] Desain ulang header portal — lebih compact, lebih personal
- [ ] Hapus semua komponen marketing website dari pwa_layout portal

### 🔲 Sprint 3 — Halaman Booking Portal
- [ ] `JamaahBookingList.tsx` — tampilkan semua booking (multi-booking support)
- [ ] `JamaahBookingDetail.tsx` — detail lengkap: paket, hotel, jadwal, rombongan
- [ ] Aksi di detail: upload bukti bayar, download invoice, lihat kontrak
- [ ] Status tracker booking (pending → confirmed → completed)

### 🔲 Sprint 4 — Halaman Profil Portal
- [ ] Edit data diri jamaah (nama, NIK, passport, nomor HP)
- [ ] Upload foto profil
- [ ] Ubah password
- [ ] Pengaturan notifikasi push
- [ ] Pengaturan tema (gelap/terang)
- [ ] Keluar akun

### 🔲 Sprint 5 — Fitur Tambahan Berguna
- [ ] Widget cuaca Makkah & Madinah real-time di dashboard
- [ ] Reminder check-in otomatis H-1
- [ ] Tips & artikel persiapan umroh/haji di portal
- [ ] Doa harian (rotasi otomatis setiap hari)
- [ ] Progress bar persiapan keberangkatan (dokumen, kesehatan, manasik)

---

## 🏗️ Arsitektur Teknis

### Komponen yang Perlu Dibuat
```
artifacts/umrah-haji/src/
├── pages/jamaah/
│   ├── JamaahBookingList.tsx       # /jamaah/booking (BARU)
│   ├── JamaahBookingDetail.tsx     # /jamaah/booking/:id (BARU)
│   ├── JamaahKatalogPaket.tsx      # /jamaah/paket (BARU)
│   ├── JamaahDetailPaket.tsx       # /jamaah/paket/:slug (BARU)
│   └── JamaahProfil.tsx            # /jamaah/profil (BARU)
└── components/jamaah/
    ├── portal/
    │   ├── PortalBookingCard.tsx    # Card booking aktif
    │   ├── PortalQuickActions.tsx   # 4 aksi cepat
    │   └── PortalSholatWidget.tsx   # Widget waktu sholat
    └── ...
```

### Aturan Route — WAJIB DIIKUTI
- Semua link internal di dalam portal **WAJIB** pakai prefix `/jamaah/`
- **DILARANG** link ke `/my-bookings`, `/packages`, `/store`, `/customer/settings` dari dalam portal
- Halaman website bisa tetap ada, tapi portal tidak boleh mengarah ke sana
- `JamaahBottomNav` dan `JamaahPortal` adalah gerbang utama — audit rutin diperlukan

---

## 📊 Metrik Keberhasilan
- Tidak ada satu pun link dari portal yang mengarah ke luar `/jamaah/*` (kecuali `/auth/login`)
- Bottom nav 4 item: Beranda, Booking, Bayar, Profil — semua ke route `/jamaah/`
- Dashboard portal menampilkan informasi yang relevan untuk jamaah (bukan marketing website)
- Semua halaman portal dark mode ready
- Waktu load halaman < 2 detik (lazy loading sudah diterapkan)
