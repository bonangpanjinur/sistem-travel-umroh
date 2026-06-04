## 1) Homepage — Banner Carousel + Hero (dinamis & konsisten)

### Konsep
Tambahkan satu kontrol di **Admin → Appearance** yang mengatur cara Hero & Banner ditampilkan, lalu pakai itu di `Index.tsx`.

`website_settings.hero_display_mode`:
- `banner_only` — hanya Banner Carousel (Hero disembunyikan)
- `hero_only` — hanya Hero Section klasik (gambar besar utama)
- `both` — Banner Carousel di atas, Hero di bawahnya (default)
- `banner_as_background` — Banner Carousel jadi background, search bar + judul Hero overlay di atasnya

### Perubahan file
- `src/hooks/useWebsiteSettingsOptimized.ts` & `useWebsiteSettings.ts` — tambah field `hero_display_mode` (default `both`)
- `src/pages/admin/AdminAppearance.tsx` — tambah Select 4-opsi + preview kecil
- `src/pages/Index.tsx` — render Banner/Hero/keduanya/overlay sesuai mode; jika `banner_as_background` jangan render gambar Hero, tapi render search bar di atas carousel
- `src/components/home/DynamicHeroSection.tsx` (+ `Modern/Luxury/Islamic/Futuristic/Nature/Royal` HeroSection) — terima prop `hideImage` untuk varian background mode; rapikan padding/typography breakpoints
- `src/components/home/BannerCarousel.tsx` — tambah prop `overlayMode` (saat true: tinggi lebih besar, dot ditempatkan tidak menutupi search bar)

### Polish 7 tema (classic, modern, luxury, islamic, futuristic, nature, royal)
Audit & perbaikan konsisten di semua varian Hero + CTA + Banner:
- Spacing & container width seragam (`max-w-7xl`, padding `py-16 md:py-24`)
- Tipografi: `text-4xl md:text-6xl` untuk H1, `text-base md:text-lg` body
- Tombol: tinggi 11/12, ikon ukuran konsisten
- Warna pakai token (`bg-primary`, `text-primary-foreground`) — tidak ada hard-coded yang menabrak token tema
- Hover/transition halus (`transition-all duration-300`)
- Mobile (≤640px) cek tidak ada teks terpotong
- Banner carousel: tambah subtle gradient overlay untuk legibility teks di semua tema

---

## 2) Manajemen Hak Akses — Refactor menyeluruh

### Diagnosis
- `permissions_list` di DB hanya 22 entri, sedangkan `src/lib/permissions.ts` punya ±70 key dan `AdminRoutes.tsx` punya ±60 route → **drift parah** sehingga banyak menu/permission tidak match.
- `menu_items` di DB hanya 22 baris → sidebar mengandalkan `RECOMMENDED_MENUS` fallback; akibatnya toggle visibility & permission tidak konsisten.
- Hampir semua route `/admin/*` **tidak diproteksi** — hanya 6 dashboard yang pakai `DashboardProtectedRoute`.
- 5 halaman RBAC terpisah membingungkan: `AdminRoleManagement`, `AdminRoleManagementEnhanced`, `AdminRBACTools`, `AdminRBACStatus`, `DashboardAccessManager`.
- User-level override (`user_permissions`) sudah ada RPC tapi tidak terlihat efeknya di sidebar karena drift key.

### A. Sinkronisasi DB ↔ Kode (migration)
1. Seed/upsert ke `permissions_list` semua key dari `PERMISSIONS` di `src/lib/permissions.ts` (label & group_name terisi).
2. Seed/upsert ke `menu_items` semua route admin dari `AdminRoutes.tsx` (key, label, path, icon, group, sort_order, required_permission). Tambahkan kolom `is_visible boolean default true` jika belum ada.
3. Seed default `role_permissions` per role mengikuti `ROLE_HIERARCHY` (super_admin tidak butuh row — di-handle di RPC).
4. Pastikan/upgrade RPC `get_user_effective_permissions_v2(_user_id, _roles)` mengembalikan gabungan `role_permissions` (semua role + inherited) **minus** override `user_permissions` yang `is_enabled=false`, **plus** override `is_enabled=true`. Super admin → semua key.

### B. Route Guard universal
- Buat `src/components/auth/PermissionRoute.tsx` — menerima `permissionKey`, cek via `useEffectivePermissions().has(key)`; jika tidak: redirect `/access-denied`.
- Bungkus **semua** route di `AdminRoutes.tsx` dengan `PermissionRoute` sesuai `PERMISSIONS.*` (kecuali index dashboard).
- Hapus `DashboardProtectedRoute` lama atau jadikan alias dari `PermissionRoute` agar konsisten.

### C. Konsolidasi UI menjadi 1 halaman
Halaman tunggal **`/admin/roles`** (rename `AdminRoleManagementEnhanced`) dengan 4 tab:
1. **Permission Matrix** — matrix Role × Permission (toggle `role_permissions`), search + group accordion (gabungan dari `AdminRoleManagement`).
2. **Pemetaan Menu** — `RoleMenuMapper` (existing) + toggle `is_visible` per menu.
3. **User Override** — pilih user → `UserPermissionsManager` (yang sekarang dialog di `/admin/users`, dipindahkan/duplikat di sini juga).
4. **Audit & Status** — gabungan `AdminRBACStatus` + ringkasan akses + tombol "Sync from registry" (tombol manual yg trigger seeding ulang permissions/menus dari registry).

Route lama (`/admin/rbac-tools`, `/admin/rbac-status`, `/admin/dashboard-access`) → redirect ke `/admin/roles?tab=...`.

### D. Sidebar konsistensi
- `useDynamicMenus` sudah punya `matchesPermission` yang tolerant — pertahankan, tapi setelah seeding key akan match 1:1.
- Hilangkan fallback `RECOMMENDED_MENUS` untuk non-super-admin (super_admin tetap pakai registry sebagai safety net) — supaya toggle visibility di DB benar-benar berlaku.
- Tambah invalidate cache `['user-effective-permissions']` & `['dynamic-menus']` setelah mutasi role/user permissions.

### E. Hard guard di API/RLS
Audit ringan: pastikan tabel sensitif (mis. `payments`, `users`, `audit_logs`) RLS-nya cek `has_role` / `has_permission`, bukan hanya UI.

---

## Out of scope
- Tidak menambah role baru
- Tidak mengubah skema `app_role` enum
- Tidak refaktor halaman individu admin selain proteksi route

## Dampak
- Homepage bisa diatur 4 mode tampilan tanpa coding
- 7 template tema tampak rapi & konsisten di mobile + desktop
- 1 halaman RBAC tunggal, drift permission hilang, route admin terlindungi end-to-end
