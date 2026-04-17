

## Akar masalah

**1. Duplikasi Dashboard di sidebar**
Sidebar punya "Dashboard Quick Access" hardcoded (baris 182-206 `AdminLayoutDynamicImproved.tsx`), tapi DB juga punya menu Dashboard di group "Overview". Hasilnya: Dashboard tampil 2× — sekali di atas, sekali di group Overview.

**2. Drift antara `permissions_list`, `menu_items`, dan `AdminRoutes`**
- `permissions_list` (51 entries) punya `static-pages`, `testimonials` → tapi `menu_items` (48) tidak punya, dan `AdminRoutes` tidak punya route-nya.
- `menu_items` punya `master-data` (Master Data Hub) → tapi sudah redundan karena sub-menu Master Data (airlines/airports/hotels/dst) sudah lengkap.
- Group "Pengaturan" di DB tidak menampilkan `static-pages` & `testimonials` walau ada di permissions.
- Path `/admin/finance-cash` di group Keuangan, tapi semua finance lain pakai `/admin/finance/*`. Inconsistent path scheme (kosmetik, tidak fatal).

**3. Performa lambat**
- Public homepage spam request error: `hero_stats` (404, table tidak ada), `website_settings` ID hardcoded 0000... (406, row tidak ada), `departures.packages.category` (400, kolom tidak ada). Tiap error retry → bandwidth & CPU client habis.
- Auth state-change listener tidak dibatasi, tiap navigation/refocus bisa memicu re-fetch profile + roles.
- Realtime channel `menu_items_changes_persistent` di-mount untuk semua staff walau menu jarang berubah.
- React Query default retry = 3 → 1 query gagal jadi 4 request.

**4. Permission system rapi tapi fallback registry bisa "membocorkan" menu**
`useDynamicMenus` fallback ke `RECOMMENDED_MENUS` bila DB kosong. DB sekarang TIDAK kosong, jadi fallback tidak aktif — tapi `RECOMMENDED_MENUS` di registry punya entries `static-pages` & `testimonials` yang tidak ada route-nya. Bila DB sempat kosong, sidebar bisa render menu yang 404.

**5. Bug minor**
- `useRoles`/`profiles` kosong di DB (0 rows) → setiap user baru harus pakai trigger `handle_new_user`. Pastikan trigger aktif. (Saat ini tabel `profiles` memang 0, kemungkinan test env.)
- `console.debug` di realtime channel masih nyala di production build kalau `process.env.NODE_ENV` tidak ter-set Vite (Vite pakai `import.meta.env`).

---

## Rencana perbaikan

### A. Hilangkan duplikasi Dashboard
Hapus blok "Dashboard Quick Access" hardcoded di `AdminLayoutDynamicImproved.tsx`. Dashboard tetap muncul lewat group Overview dari DB. Konsistensi: semua menu satu sumber.

### B. Sinkronisasi DB ↔ Routes ↔ Registry (single source of truth)
Buat satu migration SQL yang:
1. Hapus dari `permissions_list`: `static-pages`, `testimonials` (tidak ada route).
2. Hapus dari `menu_items`: `master-data` (redundan dengan sub-menu).
3. Hapus dari `RECOMMENDED_MENUS` registry: `static-pages`, `testimonials`, `master-data`.
4. Pastikan tidak ada `user_permissions` yang merefer key yang dihapus (delete cascade/orphan cleanup).

Hasil: 47 menu, 47 permission, 47 route — **1:1 mapping**.

### C. Bersihkan public-page errors yang membebani jaringan
- `useHeroStats`: stop query bila table tidak ada; tangkap error PGRST205 dan disable retry.
- `useWebsiteSettings` (id=`0000…0001`): ganti `.single()` jadi `.maybeSingle()` agar 0 row tidak jadi 406, dan cache dengan `staleTime: Infinity`.
- `useDepartures` public: hapus `packages(category)` dari select karena kolom `category` tidak ada di tabel `packages`. Ganti pakai kolom yang valid (mis. `name` saja, atau join `package_types`).
- Set React Query global default: `retry: 1`, `refetchOnWindowFocus: false`.

### D. Optimasi loading admin
- `useDynamicMenus`: tambah cek `process.env.NODE_ENV` → ganti `import.meta.env.DEV`. Hapus realtime channel atau jadikan opt-in (pakai `staleTime: Infinity` sudah cukup).
- `useAuth`: profile + roles sudah paralel; tambah `staleTime` pada query terkait user supaya tidak re-fetch saat fokus jendela.
- Lazy-load `CommandPalette` (komponen berat dengan banyak ikon).
- Tambah `Suspense` boundary di layout supaya skeleton tampil selama lazy import.

### E. Permission flow konsisten
- `ProtectedRoute`: super admin sudah bypass `menusLoading`. Untuk non-super-admin, tampilkan skeleton sidebar (bukan spinner full-screen) supaya perceived performance lebih baik.
- `UserPermissionsManager`: pastikan key yang ditampilkan = key dari `permissions_list` aktif (setelah cleanup).

### F. Best practice tambahan (akan diterapkan)
- **Indeks DB**: tambah index `user_permissions(user_id, permission_key)` untuk lookup cepat.
- **Naming menu**: standar "Indonesian Title Case" (sudah konsisten — pertahankan).
- **Path scheme**: konsisten `/admin/{kebab-case}`. Migrasi `/admin/finance/ar` → tetap karena AR/AP secara nested logis di bawah finance; tidak ubah path agar tidak break bookmark.

---

## File yang akan diubah

**Migration baru (data cleanup):**
- `supabase/migrations/<ts>_cleanup_menu_permission_drift.sql` — DELETE 3 entri redundan + cascade orphan `user_permissions`.

**Diedit:**
- `src/components/admin/AdminLayoutDynamicImproved.tsx` — hapus Dashboard Quick Access, lazy-load CommandPalette, skeleton loader.
- `src/hooks/useDynamicMenus.ts` — pakai `import.meta.env.DEV`, opsional realtime, perketat fallback.
- `src/lib/admin-menu-registry.ts` — hapus 3 entri redundan, samakan persis dengan DB final.
- `src/hooks/useHeroStats.ts` — handle table-missing gracefully, retry 0.
- `src/hooks/useWebsiteSettings.ts` — `.maybeSingle()`, staleTime Infinity.
- `src/hooks/useDepartures.ts` (atau pemanggil di public) — buang select `packages.category` yang invalid.
- `src/main.tsx` atau setup QueryClient — set default `retry: 1`, `refetchOnWindowFocus: false`, `staleTime: 5min`.

---

## Hasil yang ditargetkan
- **0 duplikasi menu** di sidebar (Dashboard hanya 1×).
- **47 permission ↔ 47 menu ↔ 47 route**, 1:1 tanpa drift.
- **Public homepage**: 0 request error berulang, loading turun signifikan.
- **Admin dashboard**: render < 1s untuk super admin.
- **Console bersih** dari error 400/404/406.
- **Permission super admin** tetap bypass total; role lain mengikuti override DB.
- **Struktur scalable**: tambah menu baru = 1 INSERT ke `menu_items` + 1 INSERT ke `permissions_list` + 1 Route. Selesai.

---

## Best practice (rekomendasi pasca-implementasi)
1. **Source of truth tunggal**: semua menu admin lewat `menu_items`. Hindari hardcoded link di layout.
2. **Naming convention**: `key` = kebab-case, sama dengan `required_permission`, sama dengan path tail. Mudah di-grep.
3. **Add-menu workflow**: 1 SQL migration berisi `INSERT menu_items` + `INSERT permissions_list` + commit `AdminRoutes.tsx`. Buat helper script bila perlu.
4. **Caching**: gunakan `staleTime: Infinity` untuk data referensi (menus, permissions, settings). Invalidasi manual saat user/admin ubah data.
5. **Indexing**: index pada `(user_id, permission_key)` di `user_permissions`; index pada `(group_name, sort_order)` di `menu_items`.
6. **Avoid `.single()` di public**: pakai `.maybeSingle()` untuk fetch yang boleh 0 row.

