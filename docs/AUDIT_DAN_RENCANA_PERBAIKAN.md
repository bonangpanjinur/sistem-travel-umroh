# Audit & Rencana Perbaikan Menyeluruh

**Proyek:** Travel Umrah & Haji (Vinstour)
**Tanggal:** 2026-05-10
**Cakupan:** Panel Admin (Pusat) · Cabang · Agen · Operasional · Jemaah · PWA · UI/UX · Fitur Ibadah & Toko
**Penyusun:** Lovable AI (analisis statis codebase + memori proyek)

---

## 0. Ringkasan Eksekutif

Aplikasi memiliki **cakupan sangat luas**: ±110 halaman admin, ±40 halaman jemaah, multi-tenant (pusat/cabang/agen), PWA, dan integrasi pembayaran. Pondasi arsitekturnya solid (RBAC dinamis, multi-tenant via `branch_id`/`agent_id`, design tokens emerald/gold, hooks `usePWAMode`/`usePWAConfig`), namun ada **gap konsistensi** dan **fitur yang belum lengkap** terutama di sisi jemaah.

### 0.1 Severity Matrix

| Severity   | Jumlah Temuan | Deskripsi singkat |
|------------|---------------|-------------------|
| Critical   | 6             | RBAC route bocor, role management terpisah, SW manual, branch scoping belum konsisten |
| High       | 14            | UI/UX jemaah, dual mode (web/app) belum penuh, modul ibadah & toko jemaah belum ada |
| Medium     | 22            | Loading/empty state, halaman duplikat, pagination tidak seragam |
| Low        | 18            | Penamaan, copy, micro-interaction |

### 0.2 Estimasi Effort (per fase, agen-hari)

| Fase | Lingkup | Estimasi |
|------|---------|----------|
| 1 | Audit + dokumen ini | 0.5 |
| 2 | Bug kritis + RBAC hardening | 2 |
| 3 | UI/UX jemaah refresh | 2 |
| 4 | Dual experience + PWA dinamis + migrasi DB | 2 |
| 5 | Modul ibadah harian | 2.5 |
| 6 | Storefront jemaah | 2 |
| **Total** | | **±11 agen-hari** |

---

## 1. Audit Bug per Panel

### 1.1 Panel Admin (Pusat) — `src/pages/admin/*`

**Inventaris:** 110+ halaman (lihat `src/pages/admin/`).

| # | Temuan | Severity | Akar Masalah | Rekomendasi |
|---|--------|----------|--------------|-------------|
| A1 | Banyak route admin tidak dibungkus `PermissionRoute`/`ProtectedRoute` | Critical | `AdminRoutes.tsx` belum konsisten guard | Audit semua `<Route>`, bungkus dengan `<PermissionRoute permissionKey="...">` |
| A2 | Role Management terpecah: `AdminRoleManagement`, `AdminRoleManagementEnhanced`, `AdminRBACTools`, `AdminRBACStatus`, `Admin2FASettings` | Critical | Iterasi historis tanpa konsolidasi | Buat `AdminRoleManagementUnified` (tabbed: Roles · Permissions · User Overrides · Audit · 2FA), deprecate halaman lama dengan redirect |
| A3 | User-level permission override tidak berlaku | Critical | Resolver `rbac-resolver.ts` belum membaca tabel `user_permission_overrides` di semua call site | Tambah cek override di `useHasPermission` + caching |
| A4 | Sinkronisasi sidebar ↔ permission ↔ menu RBAC (di Role Management) tidak match | High | Daftar menu di-hardcode terpisah di sidebar dan halaman RBAC | Sentralkan ke `src/lib/admin-menu-icons.ts` + `permissionKey` registry |
| A5 | Pagination tidak seragam (sebagian 10, 20, 50) | Medium | Tiap halaman re-implement | Pakai hook `useStandardPagination` (limit 20 sesuai memori) |
| A6 | Loading state inkonsisten (skeleton vs spinner vs blank) | Medium | Komponen `<LoadingState />` belum dipakai semua | Refactor ke satu komponen |
| A7 | Halaman duplikat: `not-found.tsx` & `NotFound.tsx` | Low | Casing OS-dependent | Hapus salah satu, audit import |
| A8 | `AdminLandingPageEditor` dan `AdminAppearance` overlap | Medium | Iterasi paralel | Konsolidasi: Appearance untuk tema, LandingPageEditor untuk konten section |
| A9 | `AdminSupabaseSetup` muncul di production menu | High | Lupa toggle dev | Bungkus dengan ENV check / hide dari sidebar production |
| A10 | Banyak halaman pakai `console.log` debug | Low | Sisa development | Cleanup via lint rule |

### 1.2 Panel Cabang — `src/pages/branch/*`

| # | Temuan | Severity | Rekomendasi |
|---|--------|----------|-------------|
| B1 | Branch scoping (`branch_id` filter) tidak diterapkan konsisten di `BranchBookings`, `BranchAgen` | Critical | Tambah `.eq('branch_id', currentBranchId)` di semua query, pastikan RLS sebagai pertahanan terakhir |
| B2 | `BranchKPITargets` tidak realtime | Medium | Tambah `useRealtimeSubscription` untuk `bookings`, `payments` |
| B3 | `BranchApprovals` workflow tidak punya audit trail | High | Insert ke `audit_logs` setiap approve/reject |
| B4 | `BranchLayout` tidak punya guard role `branch_manager` | High | Tambah `PermissionRoute` di route level |

### 1.3 Panel Agen — `src/pages/agent/*`

| # | Temuan | Severity | Rekomendasi |
|---|--------|----------|-------------|
| C1 | Hierarki `parent_agent_id` belum tampil di `AgentNetwork` (sub-agen tidak terlihat) | High | Query rekursif via CTE atau RPC `get_agent_tree` |
| C2 | Komisi sub-agen tidak ter-attribute ke parent | High | Trigger DB `attribute_commission_to_parent` |
| C3 | `AgentUniqueLink` tidak validasi slug realtime | Medium | Pakai pattern slug validation yang sudah ada |
| C4 | `AgentRegisterGroup` tidak handle error duplikat NIK | High | Validasi NIK realtime (sesuai memori) |
| C5 | `AgentWebsiteSettings` tidak preview tema sebelum simpan | Low | Tambah preview iframe |

### 1.4 Panel Operasional

| # | Temuan | Severity | Rekomendasi |
|---|--------|----------|-------------|
| D1 | `AdminMuthawifs`/`AdminManifestJamaah` tidak filter per departure aktif | Medium | Tambah filter `departure_id` |
| D2 | `AdminRoomAssignments` tidak auto-group by gender pada perubahan data | High | Trigger ulang grouping setelah CRUD |
| D3 | `AdminEquipmentMaster` distribusi tidak per-gender filter | Medium | Sesuai memori `operations-equipment-logic-id` |
| D4 | `AdminItineraryTemplates` tidak NOTIFY pgrst setelah update | Medium | Tambah `NOTIFY pgrst, 'reload schema'` di trigger |

### 1.5 Panel Jemaah — `src/pages/jamaah/*`

| # | Temuan | Severity | Rekomendasi |
|---|--------|----------|-------------|
| J1 | 40+ halaman tapi banyak tidak ada di sidebar/bottom nav jemaah | High | Audit `JamaahBottomNav` + bangun "App Drawer" dinamis |
| J2 | `JamaahPortal` overload (1210 baris) | High | Pecah ke section components: `<HeroCard/>`, `<UpcomingBooking/>`, `<QuickActions/>`, `<RecentlyViewed/>`, `<NotificationFeed/>` |
| J3 | Onboarding `JamaahWelcome` hanya cek localStorage → reset saat clear cache | Medium | Simpan flag di tabel `customer_preferences.onboarding_done` |
| J4 | `JamaahSOSStatus` & `LiveLocationShare` butuh permission geolocation tapi tidak ada fallback UI saat ditolak | High | Komponen `<PermissionDeniedCard/>` dengan instruksi |
| J5 | `JamaahDoaPanduan`, `JamaahWaktuSholat`, `JamaahPanduanIbadah` tidak fully offline | High | Cache via SW (sesuai memori `jamaah-offline-content-pwa`) |
| J6 | `JamaahChatbot` tidak terhubung Lovable AI | Medium | Wire ke edge function `lovable-chat` |
| J7 | Tidak ada storefront produk untuk jemaah meski admin punya `AdminStore*` | High | Lihat Bagian 7 (toko) |
| J8 | Tidak ada modul ibadah komprehensif (kiblat, tasbih, Quran offline) | High | Lihat Bagian 6 (ibadah) |
| J9 | `JamaahPayment` tidak menampilkan progress cicilan visual yang jelas | Medium | Komponen `<PaymentProgressRing/>` |
| J10 | Beberapa halaman tidak punya error boundary lokal | Low | Bungkus per route lazy |

---

## 2. Audit UI/UX Jemaah

### 2.1 Konsistensi Visual
- **Typography**: heading konsisten Inter/Display tapi font Arab `Amiri` belum diterapkan di semua tampilan doa.
- **Warna**: gunakan token `--primary` (emerald) dan `--accent` (gold) — sebagian halaman masih `text-green-600` literal → ganti ke `text-primary`.
- **Spacing**: pola padding card berbeda (`p-3` vs `p-4` vs `p-6`). Standarkan `p-4 md:p-6`.

### 2.2 Mobile-first
- **Touch target**: beberapa link <44px (ChevronRight pada list item). Tambah min-height.
- **Safe-area**: `pb-safe` sudah ada di `DynamicPublicLayout` PWA mode. Cek semua bottom-nav children pakai `safe-area-bottom`.
- **Gesture**: pull-to-refresh belum ada (ekspektasi user PWA).

### 2.3 Hierarki Informasi
- `JamaahPortal` halaman utama menampilkan **terlalu banyak section** sekaligus → user overwhelmed.
- **Rekomendasi**: 3 layer hierarchy:
  1. **Hero**: status keberangkatan + countdown
  2. **Quick Actions**: 6 ikon utama (Dokumen, Pembayaran, Ibadah, Toko, Chat, SOS)
  3. **Feed**: notifikasi + recently viewed (collapsible)

### 2.4 State Coverage
- Loading: pakai `<Skeleton>` shadcn untuk semua list.
- Empty: ilustrasi + CTA.
- Error: `<ErrorState>` reusable dengan retry.
- Offline: banner di top + cache fallback.

### 2.5 Aksesibilitas (WCAG 2.1 AA)
- Kontras: sebagian text muted di atas gold gradient < 4.5:1 → naikkan.
- `prefers-reduced-motion`: animasi framer-motion harus respek.
- Focus visible: cek semua interactive element.
- Alt text: gambar produk & banner harus ada.

### 2.6 Performance
- Code splitting per route sudah pakai `lazy()` ✓
- Image: convert hero ke `webp`, pakai `<img loading="lazy">`
- Query: aktifkan `staleTime` lebih panjang untuk data master
- Bundle: audit dengan `vite-bundle-visualizer` (target <300kb initial)

---

## 3. Dual Experience: Website ↔ PWA App

### 3.1 Strategi

| Mode | Deteksi | Pengalaman |
|------|---------|------------|
| **Browser** (mobile/desktop) | `!isStandalone` | Website penuh: landing page marketing, navbar, footer, semua section publik |
| **PWA terinstal** (standalone/fullscreen) | `display-mode: standalone` | Aplikasi: app shell minimal, bottom nav, tanpa footer marketing, redirect home → portal sesuai role |

Kedua mode pakai **codebase yang sama** — perbedaan murni di layer layout & routing.

### 3.2 Komponen Layer

```text
<App>
 ├── <RoleAwareRedirect/>         // standalone + jamaah → /jamaah
 ├── <Routes>
 │    ├── /                       → <PublicLandingShell/>  (browser)
 │    │                            → <AppHomeRedirect/>    (standalone)
 │    ├── /jamaah/*               → <JamaahAppShell/> | <JamaahWebShell/>
 │    ├── /admin/*                → <AdminShell/>
 │    └── ...
```

### 3.3 Konfigurasi Dinamis (Super Admin / Owner)

Halaman baru `AdminPWAAppLayout` (di-merge ke `AdminPWASettings` existing), stored di `website_settings.pwa_app_layout` (JSONB):

```json
{
  "theme": "modern",            // classic | modern | luxury | minimal
  "primary_color": "#15803d",
  "splash_bg": "#15803d",
  "splash_logo_url": "...",
  "bottom_nav": [
    { "key": "home",     "label": "Beranda",  "icon": "home",    "path": "/jamaah",         "enabled": true },
    { "key": "ibadah",   "label": "Ibadah",   "icon": "moon",    "path": "/jamaah/ibadah",  "enabled": true },
    { "key": "store",    "label": "Toko",     "icon": "store",   "path": "/jamaah/store",   "enabled": true },
    { "key": "chat",     "label": "Chat",     "icon": "message", "path": "/jamaah/chat",    "enabled": true },
    { "key": "profile",  "label": "Profil",   "icon": "user",    "path": "/jamaah/profile", "enabled": true }
  ],
  "quick_actions": [ ... ],
  "modules": {
    "store": true,
    "ibadah": true,
    "komunitas": false,
    "manasik_ar": true
  }
}
```

- **Hanya** role `super_admin` & `owner` yang bisa edit (RLS + UI guard).
- Drag-and-drop bottom nav (`@hello-pangea/dnd` sudah terpasang).
- Live preview iframe.

### 3.4 PWA Hardening

Saat ini `main.tsx` register `/sw.js` manual. Masalah: tidak punya kill-switch, tidak `NetworkFirst`, register di iframe preview.

Perbaikan:
- Adopsi `vite-plugin-pwa` dengan `devOptions: { enabled: false }`
- Guard register: skip jika hostname mengandung `id-preview--` atau di iframe
- `navigateFallbackDenylist: [/^\/~oauth/]`
- `runtimeCaching` HTML = `NetworkFirst` (timeout 3s)
- Workbox precache untuk konten ibadah offline
- Service worker `/sw.js` lama jadi kill-switch (clear caches + unregister)

---

## 4. Konsolidasi Role Management (RBAC)

### 4.1 Single Page Tabbed

`AdminRoleManagementUnified` (route `/admin/role-management`) dengan tab:

| Tab | Konten | Backend |
|-----|--------|---------|
| Roles | Daftar role, deskripsi, jumlah user | `roles` (enum) + view |
| Permissions | Matriks role × menu/permission key | `role_permissions` |
| User Overrides | Per-user grant/revoke spesifik | `user_permission_overrides` (baru jika belum ada) |
| Audit | Log perubahan permission | `audit_logs` filter |
| 2FA | Toggle 2FA wajib per role | `role_2fa_required` |

### 4.2 Resolver

Hook `useHasPermission(key)`:
1. Ambil roles user dari `useAuth`
2. Cek `role_permissions` untuk semua role user
3. Override dengan `user_permission_overrides` (allow > deny > role default)
4. Cache 5 menit via React Query

### 4.3 Route Guard

`<PermissionRoute permissionKey="admin.bookings">` → render `<AccessDenied/>` jika tidak punya permission. Bungkus **semua** route admin via map otomatis dari registry.

---

## 5. Modul Ibadah Harian

Folder baru `src/pages/jamaah/ibadah/` & `src/components/jamaah/ibadah/`:

| Halaman | Fitur Utama | Offline | Dependencies |
|---------|------------|---------|--------------|
| `IbadahHome.tsx` | Dashboard ibadah hari ini, streak, pengingat berikutnya | ✓ | - |
| `KiblatCompass.tsx` | Arah kiblat berbasis GPS + DeviceOrientation | ✓ (cache lat/lon) | DeviceOrientationEvent |
| `JadwalSholatLive.tsx` | 5 waktu sholat per kota, countdown, push reminder | ✓ | API Aladhan / lokal calc |
| `TasbihDigital.tsx` | Counter tasbih, target harian, vibration | ✓ | localStorage + sync DB |
| `AlQuranOffline.tsx` | 114 surah, terjemahan ID, bookmark, last read | ✓ (cache surah json) | Quran.com API |
| `DoaHarian.tsx` | Kategori (pagi, petang, makan, tidur, perjalanan), arabic + latin + arti | ✓ | Static JSON |
| `ZikirPagiPetang.tsx` | Wirid pagi/petang dengan checklist + counter | ✓ | Static JSON |
| `PengingatSholatPush.tsx` | Setting waktu reminder, push via Web Push | - | VAPID + edge function |

### 5.1 Skema DB
```sql
CREATE TABLE ibadah_progress (
  id uuid PK,
  user_id uuid NOT NULL,
  type text NOT NULL,            -- 'tasbih' | 'zikir_pagi' | 'zikir_petang' | 'quran_read'
  count integer DEFAULT 0,
  target integer,
  date date NOT NULL,
  metadata jsonb,
  created_at, updated_at
);
-- RLS: user hanya akses row miliknya

CREATE TABLE ibadah_settings (
  user_id uuid PK,
  prayer_city text,
  reminder_minutes_before integer DEFAULT 10,
  reminders_enabled boolean DEFAULT true,
  push_subscription jsonb
);
```

### 5.2 Push Notification
- Generate VAPID keys → simpan di Supabase secrets
- Edge function `send-prayer-reminder` (cron tiap menit, query user yang waktunya tiba)
- SW handle `push` event → tampilkan notifikasi

---

## 6. Storefront Jemaah (Toko Produk Travel)

Tabel admin sudah ada (`AdminStoreProducts`, `AdminStoreCategories`, `AdminStoreOrders`). Bangun sisi konsumen:

### 6.1 Halaman Baru `src/pages/jamaah/store/`

| Halaman | Path | Fitur |
|---------|------|-------|
| `StoreHome.tsx` | `/jamaah/store` | Hero, kategori, featured, best seller |
| `StoreCategory.tsx` | `/jamaah/store/c/:slug` | Filter, sort, pagination |
| `StoreProductDetail.tsx` | `/jamaah/store/p/:slug` | Galeri, varian, stok, deskripsi, ulasan, add to cart |
| `StoreCart.tsx` | `/jamaah/store/cart` | List item, qty, hapus, voucher, total |
| `StoreCheckout.tsx` | `/jamaah/store/checkout` | Alamat, shipping, metode bayar (VA/Midtrans) |
| `StoreOrders.tsx` | `/jamaah/store/orders` | Riwayat order, status, tracking |
| `StoreOrderDetail.tsx` | `/jamaah/store/orders/:id` | Detail order, invoice, tracking, ulasan |

### 6.2 Hooks & Services
- `useStoreProducts(filter)` — React Query
- `useStoreCart()` — localStorage + sync DB saat login (debounced)
- `useStoreCheckout()` — buat order + payment intent
- `useStoreOrders()` — riwayat user-scoped

### 6.3 Skema DB
```sql
CREATE TABLE store_carts (
  user_id uuid PK,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz DEFAULT now()
);
-- RLS: user only own cart

-- Pastikan store_products: SELECT public WHERE is_active
-- store_orders: user lihat order sendiri; admin lihat semua
```

### 6.4 Pembayaran
- Pakai infrastruktur `AdminMidtrans` & `AdminVirtualAccount` yang sudah ada.
- Tambah `order_type` di `payments` agar bisa bedakan booking vs order toko.

### 6.5 Integrasi dengan Profil Jemaah
- Saat order produk Umrah-related (kacamata haji, koper, dll), tampilkan rekomendasi di `JamaahPortal` sebelum keberangkatan.
- Voucher otomatis untuk jemaah aktif (booking status `paid`).

---

## 7. Roadmap & Urutan Eksekusi

```text
Fase 1 (selesai)  → Dokumen ini
Fase 2            → RBAC hardening + bug kritis (A1-A4, B1, B4, J4)
Fase 3            → UI/UX jemaah refresh (J2, semua bagian 2)
Fase 4            → Dual mode + PWA dinamis + AdminPWAAppLayout (bagian 3)
Fase 5            → Modul ibadah harian (bagian 5)
Fase 6            → Storefront jemaah (bagian 6)
Fase 7 (opsional) → Komunitas, gamifikasi, AR manasik
```

Tiap fase di-deliver terpisah dengan migrasi DB sendiri, dan menyertakan smoke test manual checklist.

---

## 8. Standar yang Wajib Dipatuhi (dari memori proyek)

- Status pembayaran final = `'paid'`. **Jangan** pakai `'verified'`.
- Logistik & pricing **hanya** di level Departure, bukan Package.
- Jangan pakai class Tailwind `dark:`. Pakai HSL token + deteksi lightness.
- Radix Select **wajib** controlled (`value`), bukan `defaultValue`.
- Login **hanya** via `/auth/login`.
- `isAdmin` di frontend = `super_admin | owner | branch_manager` saja.
- Zod output → cast `as unknown as InsertType` untuk Supabase.
- Buat user admin → edge function `create-agent` (service_role).
- HR payroll: realtime dari attendance, **jangan** persist hasil.
- View multi-tenant: `security_invoker=true`. RLS policy: `SECURITY DEFINER` untuk hindari rekursi.
- Pagination: 20 record/page (default).
- Booking code: `TRA{Initials}{YYMMDD}{Random4}` via RPC `generate_booking_code`.

---

## 9. Risiko & Mitigasi

| Risiko | Dampak | Mitigasi |
|--------|--------|----------|
| Cakupan terlalu besar | Delivery lambat, regresi | Eksekusi per fase, smoke test tiap fase |
| PWA di iframe Lovable preview | SW interferensi | Guard register hostname + iframe |
| Manifest pinned saat install | Perubahan tidak masuk ke installed PWA | Versi-kan `start_url`, dokumentasikan |
| Push notif butuh VAPID + edge cron | Konfigurasi tambahan | Sediakan secrets + edge function |
| Toko butuh aturan pajak/kirim | Kompleks | Default: digital + pickup; ekspansi nanti |
| RBAC migrasi mempengaruhi semua user | Risiko lock-out | Uji di staging, fallback ke role default |

---

## 10. Lampiran

### 10.1 Inventaris cepat
- **Routes:** `AdminRoutes.tsx`, `AgentRoutes.tsx`, `BranchRoutes.tsx`, `CustomerRoutes.tsx`, `OperationalRoutes.tsx`, `PublicRoutes.tsx`
- **Layouts kunci:** `DynamicPublicLayout`, `JamaahBottomNav`, `MobileBottomNav`, `PWAInstallPrompt`
- **Hooks PWA:** `usePWAMode`, `usePWAConfig`
- **RBAC core:** `src/lib/rbac-resolver.ts`, `src/lib/permissions.ts`

### 10.2 Halaman jemaah yang sudah ada (40)
Lihat folder `src/pages/jamaah/` — banyak yang berdiri sendiri tanpa entry navigasi. Audit Bagian 1.5 J1 menyebut perlu app drawer dinamis.

### 10.3 Acceptance criteria per fase
Akan disertakan saat memulai eksekusi tiap fase.

---

**Status dokumen:** Draft 1 — siap direview. Setelah approval, eksekusi dimulai dari Fase 2.