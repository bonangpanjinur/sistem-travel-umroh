
# Rencana Perbaikan Menyeluruh — Travel Umrah & Haji

Deliverable utama: satu file markdown rinci di `docs/AUDIT_DAN_RENCANA_PERBAIKAN.md` berisi seluruh temuan + roadmap. Plan ini juga sekaligus mengeksekusi perbaikan dalam fase berurutan.

---

## A. Ruang Lingkup Audit

Empat permintaan inti:
1. Audit bug menyeluruh: panel **Admin (pusat)**, **Cabang (Branch)**, **Agen**, **Operasional**, **Jemaah**.
2. Audit **UI/UX**, fokus utama portal **Jemaah**.
3. Mode **dual-experience**: di browser = website, terinstal sebagai PWA = aplikasi modern. Tampilan aplikasi bisa diatur dinamis oleh **super_admin / owner**.
4. Fitur **ibadah harian** + **toko produk travel** untuk jemaah.

---

## B. Fase 1 — Audit & Dokumentasi (Deliverable: file markdown)

Buat `docs/AUDIT_DAN_RENCANA_PERBAIKAN.md` dengan struktur:

### B.1 Ringkasan Eksekutif
Status, severity matrix (Critical / High / Medium / Low), estimasi effort.

### B.2 Audit Bug per Panel

Untuk setiap panel: daftar halaman → temuan → severity → akar masalah → rekomendasi fix.

- **Admin (Pusat)** — `src/pages/admin/*` (~110 halaman). Fokus cek:
  - RBAC route protection (banyak halaman belum dibungkus `PermissionRoute`)
  - Sinkronisasi sidebar ↔ permission ↔ role
  - Halaman Role Management terpisah (`AdminRoleManagement`, `AdminRBACTools`, `AdminRBACStatus`, `Admin2FASettings`) → konsolidasi
  - Konsistensi pagination, search, export
  - State loading/error/empty
- **Cabang** — `src/pages/branch/*`. Cek branch-scoping (`branch_id` filter), KPI realtime.
- **Agen** — `src/pages/agent/*`. Cek hierarki agent/sub_agent, komisi, referral link.
- **Operasional** — `OperationalRoutes`, halaman muthawif, manifest, room assignment.
- **Jemaah** — `src/pages/jamaah/*` (~40 halaman). Cek auth guard, offline state, broken links, halaman duplikat.

### B.3 Audit UI/UX Jemaah
- Konsistensi spacing, typography (Amiri untuk Arab), warna (emerald/gold tokens)
- Touch target ≥44px, safe-area, gesture
- Bottom nav vs side nav, hierarki informasi
- Onboarding flow (`JamaahWelcome` → `JamaahPortal`)
- Empty/loading/error states
- Aksesibilitas (WCAG 2.1, prefers-reduced-motion)
- Performance (lazy load, code splitting, image optimization)

### B.4 Audit PWA & Dual Mode
- Service worker (`/sw.js`) saat ini manual register, belum kill-switch aman
- Manifest dinamis (sudah ada `usePWAConfig`) — perlu pengaturan layout per role
- Deteksi `display-mode: standalone` (`usePWAMode`) sudah ada — perlu route khusus app-mode
- Splash screen, app icons, theme color sinkron dengan branding

### B.5 Gap Fitur Ibadah & Toko
- Ibadah: kiblat compass, jadwal sholat realtime per kota, tasbih digital, doa harian, Al-Quran offline, zikir pagi-petang, pengingat sholat push notif
- Toko: katalog produk (`AdminStore*` sudah ada di admin), keranjang, checkout, riwayat order untuk jemaah → belum ada storefront jemaah

### B.6 Roadmap & Prioritas
Tabel fase, dependency, estimasi.

---

## C. Fase 2 — Perbaikan Bug Kritis

Prioritas (Critical → High):
1. **RBAC hardening**: bungkus semua route admin dengan `PermissionRoute`, sinkronkan key permission dengan sidebar, fix user-override permission.
2. **Konsolidasi Role Management**: satu halaman `AdminRoleManagementUnified` dengan tab (Roles, Permissions, User Overrides, Audit, 2FA).
3. **Branch scoping** verifikasi di semua query cabang.
4. **Auth guard** halaman jemaah & agen yang masih bocor.
5. **Console error sweep** & runtime error fixes.

---

## D. Fase 3 — UI/UX Jemaah Refresh

- Komponen baru: `JamaahAppShell` (mode aplikasi), `JamaahWebShell` (mode browser)
- Redesign `JamaahPortal` cards menggunakan design tokens
- Bottom nav modern dengan active indicator + haptic-style animation
- Skeleton loaders konsisten via `<LoadingState />`
- Pull-to-refresh pada halaman utama (PWA)

---

## E. Fase 4 — Dual Experience (Website ↔ PWA App)

### E.1 Deteksi Mode
Hook `usePWAMode` sudah ada → pakai sebagai single source of truth.

### E.2 Routing Adaptif
- `DynamicPublicLayout` sudah switch berdasarkan `isStandalone` — perluas ke seluruh app
- Saat standalone & user adalah jemaah → auto redirect `/` → `/jamaah`
- Saat browser → tampilkan landing page marketing seperti biasa

### E.3 Konfigurasi Dinamis App Mode
Tabel baru `pwa_app_layout` (JSONB) yang bisa diedit `super_admin`/`owner` di `AdminPWASettings`:
- Pilihan tema app (classic/modern/luxury/minimal)
- Susunan menu bottom nav (drag & drop)
- Quick actions di home aplikasi
- Splash screen, warna, logo
- Toggle modul (toko, ibadah, komunitas) on/off

### E.4 PWA Hardening
Sesuai panduan: `NetworkFirst` untuk HTML, `navigateFallbackDenylist` untuk `/~oauth`, kill-switch SW siap, devOptions disabled.

---

## F. Fase 5 — Modul Ibadah Harian (Jemaah App)

Halaman/komponen baru di `src/pages/jamaah/ibadah/`:
- `KiblatCompass.tsx` — DeviceOrientation API
- `JadwalSholatLive.tsx` — pakai data `JamaahWaktuSholat` + push reminder
- `TasbihDigital.tsx` — counter offline-first
- `AlQuranOffline.tsx` — surah list + bookmark (cache via SW)
- `DoaHarian.tsx` — kategori (pagi, petang, makan, tidur, dll)
- `ZikirPagiPetang.tsx` — checklist harian dengan streak
- `PengingatSholatPush.tsx` — integrasi `useNotifications` + service worker

Semua offline-capable (sesuai memori `jamaah-offline-content-pwa`).

---

## G. Fase 6 — Toko Produk untuk Jemaah

Storefront jemaah memanfaatkan tabel admin yang sudah ada (`AdminStoreProducts`, `AdminStoreCategories`, `AdminStoreOrders`):

Halaman baru:
- `JamaahStore.tsx` — katalog grid + filter kategori
- `JamaahStoreProductDetail.tsx` — detail + add to cart
- `JamaahStoreCart.tsx` — keranjang
- `JamaahStoreCheckout.tsx` — alamat, metode bayar (Midtrans/VA, sudah ada)
- `JamaahStoreOrders.tsx` — riwayat pesanan + tracking

Hook: `useStoreCart` (localStorage + sync DB saat login), `useStoreProducts`.

RLS: produk public read; orders user-scoped.

---

## H. Detail Teknis

### H.1 File baru
- `docs/AUDIT_DAN_RENCANA_PERBAIKAN.md` (Fase 1)
- `src/components/auth/PermissionRoute.tsx` (sudah ada di backup, perlu di-port)
- `src/pages/admin/AdminRoleManagementUnified.tsx`
- `src/pages/admin/AdminPWAAppLayout.tsx`
- `src/components/layout/JamaahAppShell.tsx`
- `src/pages/jamaah/ibadah/*` (7 halaman)
- `src/pages/jamaah/store/*` (5 halaman)
- `src/hooks/useStoreCart.ts`
- `src/hooks/usePWAAppLayout.ts`

### H.2 File diedit
- `AdminRoutes.tsx` — bungkus dengan `PermissionRoute`, tambah route konsolidasi
- `CustomerRoutes.tsx` — tambah route ibadah & toko
- `App.tsx` — auto-redirect berbasis `isStandalone` + role
- `useWebsiteSettings.ts` — tambah field `pwa_app_layout`
- `MobileBottomNav.tsx` — render dari konfigurasi dinamis

### H.3 Migrasi DB (Fase 4–6)
- Tambah kolom `pwa_app_layout JSONB` di `website_settings`
- Tabel `store_carts` (user_id, items JSONB, updated_at) + RLS user-scoped
- Pastikan tabel `store_products`/`store_orders` punya RLS read public / write owner
- Tabel `ibadah_progress` (user_id, type, count, date) untuk streak zikir/doa

### H.4 Standar yang dipatuhi
- Semua status pembayaran final = `'paid'` (bukan `'verified'`)
- Tidak pakai class `dark:` Tailwind, gunakan HSL token + deteksi lightness
- Radix Select pakai controlled `value`
- Zod cast `as unknown as InsertType` untuk Supabase
- Login terpusat `/auth/login`
- Edge function `create-agent` untuk create user admin

---

## I. Urutan Eksekusi yang Diusulkan

1. **Sekarang**: tulis `docs/AUDIT_DAN_RENCANA_PERBAIKAN.md` lengkap (Fase 1 — deliverable utama yang Anda minta).
2. Tunggu review Anda atas dokumen.
3. Eksekusi Fase 2 (bug kritis + RBAC) — perlu approval terpisah.
4. Eksekusi Fase 3 (UI/UX jemaah).
5. Eksekusi Fase 4 (dual mode + PWA dinamis) + migrasi DB.
6. Eksekusi Fase 5 (modul ibadah).
7. Eksekusi Fase 6 (toko jemaah) + migrasi DB.

Tiap fase di-deliver bertahap supaya bisa direview & tidak menumpuk konflik.

---

## J. Risiko & Catatan

- **Cakupan sangat besar** (~110 halaman admin + 40 halaman jemaah). Audit Fase 1 akan menyoroti area paling berisiko, bukan menyentuh setiap baris.
- PWA di preview Lovable dibatasi (iframe). Fitur app mode hanya berfungsi penuh di domain published.
- Push notification butuh konfigurasi VAPID + edge function — akan diusulkan di Fase 5.
- Toko butuh kepastian aturan pajak/kirim; default: digital + pickup, ekspansi nanti.

Setelah Anda setuju, saya mulai dari Fase 1 (menulis file markdown audit lengkap).
