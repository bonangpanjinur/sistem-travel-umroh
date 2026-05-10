# Vinstour Travel Portal — Rencana Pengembangan

## Gambaran Proyek
Platform manajemen Umroh & Haji digital berbasis React + Vite (port 5000) dengan Express API (port 8080) dan Supabase untuk auth/database. Monorepo pnpm workspace.

---

## Status: 🟢 AKTIF

---

## ✅ Selesai

### Fondasi & Setup
- [x] Instalasi dependensi (`pnpm install`)
- [x] Workflow "Start application" (port 5000) berjalan
- [x] Workflow "Start API server" (port 8080) berjalan
- [x] Perbaikan error sintaks di `JamaahTrackerIbadah.tsx` (apostrophe di nama properti)
- [x] Utilitas `formatCurrency` tersedia di `src/lib/format.ts`

### Fitur Islami — Halaman Baru
- [x] **Jadwal Sholat** (`/sholat`) — jam langsung, hitung mundur ke sholat berikutnya, berbasis lokasi GPS via Aladhan API
- [x] **Al-Quran Digital** (`/alquran`) — 114 surah, teks Arab, terjemahan Indonesia, audio murottal Alafasy
- [x] **Arah Kiblat** (`/kiblat`) — kompas GPS + sensor orientasi perangkat, jarak ke Ka'bah
- [x] **Cuaca Tanah Suci** (`/cuaca`) — prakiraan 7 hari Mekah/Madinah/Jeddah via Open-Meteo (tanpa API key)
- [x] **Tracker Ibadah Harian** (`/tracker-ibadah`) — 14 item ibadah, tab kategori, streak, progress bar, disimpan di localStorage
- [x] **Kalkulator Islami** (`/kalkulator-islami`) — 6 kalkulator: Zakat Maal, Fidyah, Qadha Puasa, Khatam Quran, Tabungan Umroh, Cicilan Syariah
- [x] **Tasbih Digital** (`/tasbih`) — cincin progress lingkaran, 7 pilihan dzikir, suara Web Audio API, getar, sesi tersimpan
- [x] **Toko Perlengkapan Umroh** (`/toko`) — 12 produk, filter kategori, favorit, keranjang, diskon, rating

### Navigasi & Integrasi
- [x] Route baru ditambahkan di `PublicRoutes.tsx` (semua 8 halaman baru)
- [x] Dropdown "Islami" di navbar desktop dengan ikon & deskripsi
- [x] Bagian Islami di menu hamburger mobile
- [x] Seksi "Fitur Islami" baru di `QuickMenuGrid` halaman beranda
- [x] Konfigurasi bottom nav PWA diperbarui dengan item Sholat, Toko, dll.
- [x] `MobileBottomNav` diperbarui dengan ikon-ikon baru (Moon, Compass, ShoppingBag, dll.)

### PWA & Push Notification
- [x] Service worker (`public/sw.js`) sudah ada dengan `SCHEDULE_NOTIF` / `CANCEL_NOTIF`
- [x] Hook `useIbadahReminder` lengkap — jadwal notifikasi, pilih kota, menit sebelum, toggle per waktu sholat
- [x] Komponen `PrayerNotificationCard` dibuat — UI pengaturan notifikasi sholat
- [x] **Integrasi `PrayerNotificationCard` ke halaman `/sholat`** (langkah ini)

---

## 🔄 Sedang Dikerjakan

_Tidak ada — semua fitur terencana sudah selesai._ 🎉

---

## 📋 Backlog (Bisa Dikerjakan Berikutnya)

### Fitur Potensial
- [ ] **Notifikasi Geolokasi** — kirim notifikasi push saat jamaah mendekati lokasi tertentu (Masjidil Haram, dll.)
- [ ] **Halaman Panduan Manasik Interaktif** — langkah-langkah tawaf, sa'i, dll. dengan animasi
- [ ] **Live Tracking Jamaah** — admin pantau posisi rombongan di peta
- [ ] **Sertifikat Umroh Digital** — generate PDF sertifikat setelah ibadah
- [ ] **Fitur Offline** — cache lebih banyak konten untuk mode pesawat
- [ ] **Dark Mode** — toggle tema gelap/terang

### Infrastruktur
- [ ] Konfigurasi Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Optimasi gambar & lazy loading
- [ ] Error monitoring (Sentry atau sejenisnya)

---

## 🏗️ Arsitektur

```
artifacts/
├── umrah-haji/          # Frontend React + Vite (port 5000)
│   ├── src/
│   │   ├── pages/public/    # Halaman publik (sholat, alquran, kiblat, dll.)
│   │   ├── components/
│   │   │   ├── pwa/         # PWA: MobileBottomNav, PWAInstallPrompt, PrayerNotificationCard
│   │   │   ├── layout/      # DynamicNavbar, DynamicPublicLayout
│   │   │   └── home/        # QuickMenuGrid (beranda)
│   │   ├── hooks/           # useIbadahReminder, usePWAConfig, dll.
│   │   └── routes/          # PublicRoutes.tsx
│   └── public/
│       ├── sw.js            # Service Worker (cache + push notif)
│       └── manifest.json    # PWA manifest
└── api-server/          # Express API (port 8080)
```

## 🔌 API Eksternal (Gratis, Tanpa API Key)
| Layanan | Digunakan untuk |
|---------|----------------|
| Aladhan API | Jadwal waktu sholat |
| api.alquran.cloud | Teks Al-Quran + audio murottal |
| Open-Meteo | Cuaca Mekah/Madinah/Jeddah |
| Nominatim (OSM) | Reverse geocoding nama kota |
