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
- [x] Perbaikan error sintaks di `JamaahTrackerIbadah.tsx`
- [x] Utilitas `formatCurrency` tersedia di `src/lib/format.ts`

### Fitur Islami — Halaman Baru
- [x] **Jadwal Sholat** (`/sholat`) — jam langsung, hitung mundur ke sholat berikutnya, berbasis lokasi GPS via Aladhan API
- [x] **Al-Quran Digital** (`/alquran`) — 114 surah, teks Arab, terjemahan Indonesia, audio murottal Alafasy
- [x] **Arah Kiblat** (`/kiblat`) — kompas GPS + sensor orientasi perangkat, jarak ke Ka'bah
- [x] **Cuaca Tanah Suci** (`/cuaca`) — prakiraan 7 hari Mekah/Madinah/Jeddah via Open-Meteo
- [x] **Tracker Ibadah Harian** (`/tracker-ibadah`) — 14 item ibadah, tab kategori, streak, progress bar
- [x] **Kalkulator Islami** (`/kalkulator-islami`) — 6 kalkulator: Zakat, Fidyah, Qadha, Khatam, Tabungan, Cicilan
- [x] **Tasbih Digital** (`/tasbih`) — cincin progress, 7 dzikir, suara Web Audio API, getar
- [x] **Toko Perlengkapan Umroh** (`/toko`) — 12 produk, filter, favorit, keranjang

### Navigasi & Integrasi
- [x] Route baru di `PublicRoutes.tsx`
- [x] Dropdown "Islami" di navbar desktop
- [x] Bagian Islami di menu hamburger mobile
- [x] Seksi "Fitur Islami" di `QuickMenuGrid` beranda
- [x] Konfigurasi bottom nav PWA diperbarui

### PWA & Push Notification
- [x] Service worker dengan `SCHEDULE_NOTIF` / `CANCEL_NOTIF`
- [x] Hook `useIbadahReminder` — jadwal notifikasi, pilih kota, toggle per sholat
- [x] Komponen `PrayerNotificationCard` — UI pengaturan pengingat
- [x] Integrasi `PrayerNotificationCard` ke halaman `/sholat`

### AI Chatbot — Perbaikan (Sesi Ini)
- [x] **Analisis kekurangan AI chatbot** (lihat seksi Analisis di bawah)
- [x] **Link bisa diklik** — `formatContent()` sekarang parse `[teks](url)` Markdown menjadi `<a>` tag
- [x] **FAQ answers diperbarui** — semua jawaban kini sertakan link nyata ke halaman terkait:
  - "harga" → link ke `/packages`
  - "visa" → link ke `/jamaah`
  - "hotel" → link ke `/packages`
  - "jadwal" → link ke `/packages`
  - "daftar" → link ke `/packages`
  - "ibadah" → link ke `/jamaah`
- [x] **ChatWidget (Gemini) render markdown** — bot messages sekarang render bold, italic, dan link
- [x] **Click handler navigasi internal** — klik link di chat langsung navigasi ke halaman tujuan
- [x] **packageContext sertakan URL** — Gemini kini tahu URL `/packages/ID` tiap paket
- [x] **System prompt Gemini diperbarui** — instruksi agar Gemini selalu sertakan link Markdown ke halaman website

---

## 🔍 Analisis Kekurangan AI Chatbot (Ditemukan)

### Masalah yang Ditemukan
1. **`formatContent()` tidak parse Markdown links** — Fungsi di `FloatingChatBubble.tsx` dan `TenantChatBubble.tsx` hanya handle `**bold**` dan `*italic*`, tapi TIDAK parse `[teks](url)`. Teks "daftar paket lengkap" hanya cetak tebal, tidak bisa diklik.

2. **FAQ jawaban tanpa URL** — Jawaban FAQ menyebut "halaman Paket" atau "portal jamaah" tapi tanpa link aktual yang bisa diklik.

3. **ChatWidget (Gemini) render plain text** — Bot messages ditampilkan dengan `<p>{m.text}</p>` tanpa markdown parsing sama sekali. Bold, italic, dan link dari respons Gemini tampil sebagai teks mentah `**bold**`.

4. **packageContext tanpa URL paket** — Saat membangun konteks paket untuk Gemini, data paket tidak disertakan URL-nya (`/packages/ID`), sehingga Gemini tidak bisa menyertakan link ke detail paket spesifik.

5. **System prompt Gemini tidak tahu struktur URL** — Gemini tidak diberitahu URL website sehingga tidak bisa generate link yang benar dalam responnya.

6. **Tidak ada click handler navigasi** — Bahkan jika link berhasil dirender sebagai `<a>` tag, klik tidak dihandle untuk SPA navigation.

### Solusi Diterapkan
- Tambah regex `[text](url)` di `formatContent()` → render `<a>` tag dengan warna dan underline
- Tambah `onClick` handler pada message container → intercept klik `<a>`, navigasi internal via `window.location.href`, eksternal via `window.open`
- Semua FAQ answers diperbarui dengan Markdown links
- `formatBotMessage()` ditambahkan ke `ChatWidget.tsx` dengan dukungan bold+link
- `packageContext.ts` tambahkan baris `URL Paket: /packages/ID`
- `DEFAULT_SYSTEM_PROMPT` di `AdminGeminiAI.tsx` diperbarui dengan panduan URL dan contoh format link

---

## 📋 Backlog (Bisa Dikerjakan Berikutnya)

### Fitur AI Chatbot Lanjutan
- [ ] **Kartu paket interaktif** — respons AI untuk pertanyaan paket menampilkan kartu visual (gambar, harga, tombol) bukan teks biasa
- [ ] **Konteks percakapan persisten** — simpan riwayat chat di localStorage agar tidak hilang saat halaman di-refresh
- [ ] **Typed responses** — animasi karakter-per-karakter untuk respons bot agar terasa lebih natural
- [ ] **Multi-language support** — deteksi bahasa user dan jawab dalam bahasa yang sama (Indonesia/English/Arabic)

### Fitur Platform
- [ ] **Live Tracking Jamaah** — admin pantau posisi rombongan di peta real-time
- [ ] **Sertifikat Umroh Digital** — generate PDF sertifikat setelah ibadah
- [ ] **Panduan Manasik Interaktif** — step-by-step tawaf, sa'i dengan animasi
- [ ] **Dark Mode** — toggle tema gelap/terang

### Infrastruktur
- [ ] Konfigurasi Supabase (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
- [ ] Konfigurasi Gemini AI Key (`gemini_api_key` di app_settings Supabase)
- [ ] Error monitoring (Sentry)

---

## 🏗️ Arsitektur

```
artifacts/umrah-haji/          # Frontend React + Vite (port 5000)
├── src/
│   ├── pages/public/          # Halaman publik (sholat, alquran, kiblat, dll.)
│   ├── components/
│   │   ├── pwa/               # PrayerNotificationCard, MobileBottomNav, PWAInstallPrompt
│   │   ├── public/            # TenantChatBubble, ChatWidget
│   │   ├── home/              # FloatingChatBubble, QuickMenuGrid
│   │   └── layout/            # DynamicNavbar, DynamicPublicLayout
│   ├── hooks/                 # useIbadahReminder, usePWAConfig, dll.
│   ├── lib/                   # packageContext.ts, formatBotMessage
│   └── routes/                # PublicRoutes.tsx
└── public/
    ├── sw.js                  # Service Worker (cache + push notif)
    └── manifest.json          # PWA manifest

artifacts/api-server/          # Express API (port 8080)
```

## 🔌 API Eksternal (Gratis, Tanpa API Key)
| Layanan | Digunakan untuk |
|---------|----------------|
| Aladhan API | Jadwal waktu sholat |
| api.alquran.cloud | Teks Al-Quran + audio murottal |
| Open-Meteo | Cuaca Mekah/Madinah/Jeddah |
| Nominatim (OSM) | Reverse geocoding nama kota |
| Google Gemini API | AI chatbot (butuh API key di Supabase) |
