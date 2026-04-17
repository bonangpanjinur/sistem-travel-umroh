

## Akar Masalah

**1. Database kosong total** — `menu_items: 0`, `permissions_list: 0`, `user_permissions: 0`. Inilah penyebab utama loading lama dan dashboard hilang. Sidebar terus query DB tapi balasannya kosong, jadi:
- Layout menampilkan spinner "Memuat menu..."
- Dashboard tidak punya entri menu sehingga sidebar quick-access tetap render tapi grup menu lain kosong
- Permission modal tidak punya data untuk ditampilkan

**2. Sinkronisasi menu tidak pernah dijalankan** — `useSyncMenusFixed` ada tapi hanya dipanggil manual (tombol admin). Setelah remix, tidak ada yang menjalankannya, jadi tabel tetap kosong.

**3. Redundansi izin akses** ada di 3 tempat:
- `useHasPermission` (dummy, selalu return true) — file mati
- `useDynamicMenus` (sumber kebenaran aktif)
- `AdminUserPermissions` page (shim redirect, tidak dipakai)
- `useMenuAccess` & `useMultipleMenuAccess` deprecated

**4. Loading lambat tambahan**:
- `AdminLayoutDynamicImproved` memanggil `useAdminNotifications` tapi datanya tidak dipakai (`notifications={[]}` hardcoded)
- Realtime channel `menu_items_changes_persistent` di-mount untuk semua user staff walau tabel kosong
- `ProtectedRoute` menunggu `menusLoading` selesai sebelum render, sementara query menunggu RPC kosong

**5. Bug minor**:
- `useSyncMenus` (deprecated) masih mengirim ke RPC dengan signature lama
- `RECOMMENDED_MENUS` di registry tidak persis sama dengan `AdminRoutes.tsx` (mis. `advanced-reports`, `scheduled-reports`, `package-types` perlu disinkronkan)

---

## Rencana Perbaikan

### Tahap 1 — Seed database (kritis, paling pertama)
Migration SQL yang melakukan:
- Seed `permissions_list` dari registry (~45 permission dengan label, group, description Indonesia)
- Seed `menu_items` dari registry yang sudah disesuaikan dengan rute aktif di `AdminRoutes.tsx`
- Pakai `INSERT ... ON CONFLICT (key) DO UPDATE` agar idempoten dan aman dijalankan ulang
- Tambah entry yang sebelumnya tertinggal: `advanced-reports`, `scheduled-reports`, `manasik`, `visa`, `package-types`, `master-data`

### Tahap 2 — Hapus redundansi izin
- Hapus `src/hooks/useHasPermission.ts` (dummy, tidak dipakai berarti)
- Hapus `src/hooks/useSyncMenusFixed.ts` (digantikan seed migration)
- Hapus `useSyncMenus` & `useMenuAccess` & `useMultipleMenuAccess` deprecated dari `useDynamicMenus.ts`
- Hapus halaman `AdminUserPermissions.tsx` + route-nya — modal sudah ada di `AdminUsers`
- Hasil: **satu sumber kebenaran** = `useDynamicMenus` + tabel `user_permissions`

### Tahap 3 — Percepat loading
- `useAuth.tsx`: profile + roles sudah paralel, tambah cache lokal session agar tidak re-fetch
- `AdminLayoutDynamicImproved`: hapus pemanggilan `useAdminNotifications` (datanya tidak dipakai, hanya unread count yang ditampilkan); ganti dengan badge count ringan via single query
- `useDynamicMenus`: tambah fallback ke `RECOMMENDED_MENUS` registry kalau query selesai dengan array kosong (jaga-jaga jika seed gagal di tenant lain)
- `ProtectedRoute`: jangan blok render menunggu `menusLoading` jika user adalah super_admin (super admin bypass total)
- Set `staleTime: Infinity` untuk menus & permissions list (data jarang berubah; invalidasi via realtime)

### Tahap 4 — Bersihkan bug kecil
- `useDynamicMenus`: realtime channel hanya subscribe jika user benar-benar staff (sudah ada cek, pastikan tidak bocor)
- Hapus `console.log` "Menu sync completed" yang membandel
- Pastikan `useIsSuperAdmin.tsx` & `useAuth.isSuperAdmin()` konsisten
- Validasi semua entry `RECOMMENDED_MENUS` punya rute aktif di `AdminRoutes.tsx`

### Tahap 5 — Rapikan UX sidebar (kecil)
- Pisahkan `mobileOpen` (drawer) dan `desktopCollapsed` (sidebar mini)
- Simpan preferensi expand grup di `localStorage`
- Skeleton sidebar lebih rapi saat loading

---

## File yang Akan Diubah

**Migration baru:**
- `supabase/migrations/<timestamp>_seed_menus_and_permissions.sql`

**Dihapus (redundan):**
- `src/hooks/useHasPermission.ts`
- `src/hooks/useSyncMenusFixed.ts`
- `src/pages/admin/AdminUserPermissions.tsx`

**Diedit:**
- `src/hooks/useDynamicMenus.ts` — hapus deprecated exports, tambah fallback registry, super admin skip query
- `src/hooks/useAuth.tsx` — micro-optimize, hapus log
- `src/components/admin/AdminLayoutDynamicImproved.tsx` — hapus notif hook tidak terpakai, perbaiki state sidebar
- `src/components/auth/ProtectedRoute.tsx` — bypass cepat untuk super admin
- `src/routes/AdminRoutes.tsx` — hapus `user-permissions` route + import-nya
- `src/lib/admin-menu-registry.ts` — sinkron dengan `AdminRoutes.tsx`

---

## Hasil yang Ditargetkan
- **Loading awal turun drastis** — dashboard tampil di bawah ~1 detik untuk super admin
- **Menu lengkap dan konsisten** — semua 40+ menu admin tampil sesuai rute aktif
- **Tidak ada redundansi izin** — satu hook (`useDynamicMenus`), satu tabel (`user_permissions`), satu modal (di `AdminUsers`)
- **Super admin selalu bisa akses semua fitur** — bypass total di sidebar dan route
- **Console bersih** — tidak ada lagi "Menu sync completed", error 400, atau payload undefined

