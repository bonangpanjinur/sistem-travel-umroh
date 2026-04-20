

## Akar Masalah Ditemukan

### 🔴 Bug 1 — `Maximum update depth exceeded` di AdminSettings (infinite loop)
File `src/pages/admin/AdminSettings.tsx` punya 3 `useEffect` yang dependencynya **tidak stabil**:

```ts
// line 94-103
useEffect(() => { ... companyForm.reset(...) }, [isLoading, getSetting, companyForm]);
// line 106-124
useEffect(() => { ... bankForm.reset(...) }, [editingBank, bankForm]);
// line 126-132
useEffect(() => { ... certificateForm.reset(...) }, [isLoading, getSetting, certificateForm]);
```

- `getSetting` adalah function baru tiap render `useCompanySettings` (tidak `useCallback`).
- `companyForm`/`bankForm`/`certificateForm` adalah objek `useForm()` baru tiap render.
- Setiap `form.reset()` → trigger re-render → effect run lagi → reset lagi → **infinite loop**.

Console log mengkonfirmasi: warning `Maximum update depth exceeded` muncul DI `AdminSettings`. Ini juga yang membuat user perceive "halaman berat" + memblok thread.

### 🔴 Bug 2 — `Invalid Refresh Token` di deployment
- Setelah token expired (>1 jam), Supabase auto-refresh gagal kalau token storage corrupted/expired beyond limit.
- AuthProvider tidak handle event `TOKEN_REFRESHED` failure → query tetap jalan dengan token mati → 400/401 ke endpoint `menu_items`, `user_permissions`, dll.
- Tidak ada fallback "kalau refresh gagal → signOut + redirect ke /auth/login".

### 🔴 Bug 3 — 404 `/admin/user-permissions`
Tidak ada route `/admin/user-permissions` di `AdminRoutes.tsx`. UserPermissionsManager hanya digunakan **di dalam Dialog** di `/admin/users` (line 698-702 AdminUsers.tsx). Suatu kode/Link/redirect masih mereferensikan path lama yang sudah dihapus.

### 🔴 Bug 4 — Perbedaan Sidebar Menu antara Lovable preview & Deployment
**Akar masalah: Bug #2 → fallback registry yang outdated.**

Saya bandingkan DB vs `RECOMMENDED_MENUS` (`src/lib/admin-menu-registry.ts`):

| Kondisi | Yang ditampilkan |
|---|---|
| Query `menu_items` sukses (DB hidup) | **48 menu** dari DB termasuk grup "Master Data" (Maskapai, Bandara, Hotel, Muthawif, Bus, Vendor), "Dokumen & Surat", `advanced-reports`, `scheduled-reports`, dll |
| Query gagal (token expired / RLS error) | Fallback ke `RECOMMENDED_MENUS` = **39 menu** TANPA grup Master Data, TANPA Dokumen & Surat, TANPA advanced/scheduled reports |

**Plus** beda label/key di registry (kasus tidak konsisten):
- Key `2fa_settings` (registry, underscore) vs `2fa-settings` (DB, dash)
- Label "Manajemen HR" (registry) vs "Data Karyawan" (DB)
- Path `/admin/finance` di registry mapping ke key berbeda dari DB

Di Lovable preview token fresh → DB hit → menu lengkap. Di deployment yang sudah lama dibuka → token expired → fallback registry → **menu lebih sedikit**.

---

## Rencana Perbaikan

### A. Fix infinite loop di `src/pages/admin/AdminSettings.tsx`
- Hapus `getSetting`, `companyForm`, `bankForm`, `certificateForm` dari dependency arrays (mereka tidak stable, dan reset hanya perlu trigger sekali per kondisi).
- Ganti deps jadi: `[isLoading, settings]` (settings array dari hook = stable references via React Query). Atau gunakan flag `useRef` untuk "sudah pernah init form?".
- Pola final:
  ```ts
  useEffect(() => {
    if (!isLoading) {
      companyForm.reset({ ... });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, settings]);
  ```

### B. Fix `useCompanySettings.ts` — stabilize `getSetting`
- Bungkus `getSetting` dengan `useCallback([settings])` agar reference stable. Ini juga mencegah komponen consumer lain ikut infinite loop.

### C. Fix Refresh Token error di `src/hooks/useAuth.tsx`
- Handle event `TOKEN_REFRESHED` & explicit `SIGNED_OUT`:
  - Jika `event === 'TOKEN_REFRESHED'` dan `!session` → token gagal refresh → bersihkan state + redirect.
  - Tambah catch global: bila `getSession()` return error "refresh token not found" → call `supabase.auth.signOut()` + redirect.
- Tambahkan listener pada window `storage` event untuk sync logout antar tab.

### D. Sinkronkan `RECOMMENDED_MENUS` dengan DB
File `src/lib/admin-menu-registry.ts`:
- Tambah grup **"Master Data"** dengan: airlines, airports, hotels, muthawifs, bus-providers, vendors.
- Tambah grup **"Dokumen & Surat"** dengan: document-verification, documents-generator, offline-content.
- Tambah ke "Laporan": advanced-reports, scheduled-reports.
- Perbaiki key inconsistencies: `2fa_settings` → `2fa-settings`, label `Manajemen HR` → `Data Karyawan`, dll, biar key cocok dengan DB.
- Hasil akhir: registry punya 48 entri identik dengan DB → fallback aman.

### E. Hapus referensi `/admin/user-permissions` (404)
- Search global: cari semua `Link to="/admin/user-permissions"`, `navigate('/admin/user-permissions')`, `href="/admin/user-permissions"`.
- Ganti ke `/admin/users` (di sana ada tombol "Kelola Izin" yang membuka dialog UserPermissionsManager).
- Atau tambah redirect route: `<Route path="user-permissions" element={<Navigate to="/admin/users" replace />} />` di AdminRoutes.tsx sebagai safety net.

### F. (Optional) Tambah error boundary untuk auth failures
- Saat ini `useDynamicMenus` swallow error & return registry. Tambah toast notification 1× kalau token failure terdeteksi: "Sesi berakhir, silakan login kembali" + auto-redirect ke `/auth/login`.

---

## File yang akan diubah
- `src/pages/admin/AdminSettings.tsx` — fix dep arrays di 3 useEffect (utama infinite loop).
- `src/hooks/useCompanySettings.ts` — `useCallback` untuk `getSetting`.
- `src/hooks/useAuth.tsx` — handle TOKEN_REFRESHED failure + auto-signOut on refresh error.
- `src/lib/admin-menu-registry.ts` — sync penuh dengan DB (48 entri, key/label/group identik).
- `src/routes/AdminRoutes.tsx` — tambah redirect dari `user-permissions` → `users` (safety net).
- (Search & fix referensi `/admin/user-permissions` di komponen yang masih menggunakannya.)

## Hasil yang ditargetkan
- ✅ Tidak ada lagi warning `Maximum update depth exceeded` → AdminSettings tidak freeze.
- ✅ Refresh token expired ditangani gracefully → auto-redirect login, bukan request 400 berulang.
- ✅ Tidak ada 404 `/admin/user-permissions`.
- ✅ Sidebar Lovable preview = Sidebar deployment (48 menu identik), bahkan kalau token sempat gagal → fallback registry juga lengkap.
- ✅ **Tidak ada perubahan UI/fungsional menu** — hanya konsistensi data.

