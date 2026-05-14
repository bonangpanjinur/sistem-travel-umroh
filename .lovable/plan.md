## Analisis Kebutuhan

**Masalah saat ini:**
1. **PWA terasa "Access Denied"** — saat user install PWA dan membukanya, `StandaloneHomeGate` langsung redirect ke `/auth/login` jika belum login, dan banyak menu jamaah dibungkus `CustomerRoute` (ProtectedRoute dengan `CUSTOMER_PORTAL_ROLES`). User yang baru install langsung kena dinding login + role check.
2. **Tampilan belum "app-like"** — Banyak halaman jamaah masih memakai layout web/marketing, card paket pakai grid web standar, bukan card vertikal khas mobile app.
3. **Navigasi kurang aplikatif** — `MobileBottomNav` sudah ada tapi konten halaman belum dirancang khusus PWA (header tinggi, padding web, tombol kecil, dll).

**Tujuan user:**
- Buka PWA = langsung masuk aplikasi (mode tamu / guest), tidak ada gate.
- Semua menu inti (paket, sholat, panduan, kalkulator, dll) **bisa diakses tanpa login**.
- Tampilan full app: header compact, card paket gaya mobile (vertikal, gambar besar di atas, badge harga, tombol full-width), bottom nav konsisten, transisi halus.
- Login hanya diminta saat user mau aksi privat (booking, dokumen, riwayat pembayaran).

---

## Rencana Pengembangan

### FASE 1 — Buka Akses PWA (Hilangkan Access Denied)
1. **Ubah `StandaloneHomeGate`**: kalau standalone + belum login → arahkan ke `/jamaah` (mode tamu), bukan `/auth/login`.
2. **Buat `/jamaah` (JamaahPortal) bisa diakses tanpa login**:
   - Pindahkan route `/jamaah` keluar dari `CustomerRoute`, jadi public.
   - Di dalam komponen, deteksi `user`: kalau ada → tampilkan personalisasi (nama, booking, dokumen). Kalau tidak ada → tampilkan versi tamu (paket populer, jadwal sholat, panduan, kalkulator + tombol "Login untuk fitur lengkap").
3. **Public-kan menu informatif** (tidak perlu login):
   - `/jamaah/waktu-sholat`, `/jamaah/kiblat`, `/jamaah/al-quran`, `/jamaah/panduan-ibadah`, `/jamaah/doa-panduan`, `/jamaah/zikir`, `/jamaah/manasik`, `/jamaah/kalkulator-kurs`, `/jamaah/kalkulator-zakat`, `/jamaah/chatbot`.
   - (Sebagian sudah `LazyPage` tanpa `CustomerRoute` — pastikan konsisten.)
4. **Login soft-prompt**: untuk fitur privat (`/jamaah/documents`, `/jamaah/payment-history`, `/jamaah/digital-id`, `/jamaah/visa`, `/jamaah/checkin`, dll) tetap `CustomerRoute`, tapi kalau belum login tampilkan **bottom-sheet "Masuk untuk lanjut"** alih-alih halaman Access Denied — minimal tombol Login + tombol Kembali ke beranda.

### FASE 2 — UI Full Aplikasi
5. **Shell PWA seragam** (`DynamicPublicLayout` mode standalone):
   - Header compact sudah ada — perhalus: tambahkan tombol back (kecuali di home), notifikasi bell, avatar.
   - Beri `pb-20` global di area konten supaya tidak ketutup bottom nav.
   - Konsisten safe-area top/bottom (notch).
6. **Redesign `JamaahPortal` jadi Home App**:
   - Greeting card (nama / "Tamu") + lokasi + waktu sholat berikut (countdown).
   - Quick-action grid 4 kolom (Sholat • Quran • Kiblat • Panduan).
   - Carousel "Paket Pilihan" memakai `PackageCardPWA` (sudah ada — pakai ulang & rapikan).
   - Section "Untuk Anda" (booking aktif / progress dokumen) muncul kalau login.
   - Section "Tools" (kalkulator, zakat, manasik, chatbot AI).
7. **Kartu paket "app style"** (`PackageCardPWA`):
   - Gambar 16:9 dengan overlay gradient, badge tipe (Umroh/Haji), badge "Popular".
   - Harga besar + "mulai dari" kecil, sisa kursi, tombol "Lihat Detail" full-width primary.
   - Pakai `framer-motion` untuk press effect (`whileTap: { scale: 0.97 }`).
8. **Halaman menu lain** (Sholat, Quran, Kiblat, Panduan, Kalkulator):
   - Header sticky dengan judul + back.
   - Konten card-based, padding mobile (px-4), font scale mobile.
   - Loading skeleton skeleton-mobile.

### FASE 3 — Polish & QA
9. Tambahkan transisi halaman ringan (fade/slide) antar route saat standalone.
10. Pastikan `MobileBottomNav` highlight item aktif sesuai route, dan tetap muncul untuk user tamu.
11. Test alur: install PWA → buka → langsung di home jamaah (tamu) → klik paket → klik kalkulator → klik dokumen → muncul prompt login (bukan halaman denied).

---

## Detail Teknis (untuk referensi developer)

- **File diubah:**
  - `artifacts/umrah-haji/src/components/pwa/StandaloneHomeGate.tsx` — hapus redirect ke `/auth/login`, ganti ke `/jamaah`.
  - `artifacts/umrah-haji/src/routes/CustomerRoutes.tsx` — pindahkan route public-friendly keluar dari `CustomerRoute`, atau bungkus dengan komponen baru `OptionalAuthRoute`.
  - `artifacts/umrah-haji/src/pages/jamaah/JamaahPortal.tsx` — refactor jadi home app (guest + authed view).
  - `artifacts/umrah-haji/src/components/pwa/PackageCardPWA.tsx` — restyle app-card.
  - `artifacts/umrah-haji/src/components/layout/DynamicPublicLayout.tsx` — perhalus PWA header, padding bawah, safe-area.
  - Buat `artifacts/umrah-haji/src/components/pwa/LoginPromptSheet.tsx` — bottom sheet lembut menggantikan halaman Access Denied untuk fitur privat.
  - Buat `artifacts/umrah-haji/src/components/auth/OptionalAuthRoute.tsx` — wrapper yang render anak tanpa redirect, menyuntikkan flag `isGuest`.
- **Tidak ada perubahan database/RLS** — semua di sisi frontend & routing. RLS existing tetap melindungi data privat (query kosong saat tamu, aman).
- **Tidak menyentuh** alur admin/owner (`/dashboard`) — mereka tetap diarahkan login seperti biasa.

Apakah saya lanjutkan implementasi sesuai rencana di atas?