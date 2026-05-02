## Diagnosis akar masalah

Console log menunjukkan auth berhasil (`SIGNED_IN`, profile + 3 roles ter-fetch), tetapi user tetap mendapat halaman **"Akses Ditolak"** (`/access-denied`).

Setelah inspeksi langsung ke database & kode, ditemukan **dua bug yang saling memperparah**:

### Bug 1 — Tabel `role_permissions` kosong total
```
SELECT role, count(*) FROM role_permissions WHERE is_enabled = true GROUP BY role;
→ (0 rows)
```
Padahal ada **22 user role aktif** (owner, branch_manager, finance, sales, marketing, operational, equipment) dan **22 permission key** terdaftar. Karena tidak ada satupun baris di `role_permissions`, RPC `get_user_effective_permissions` mengembalikan **array kosong** untuk semua user non-`super_admin`. Akibatnya `isPathAllowed()` di `useDynamicMenus` selalu false → `DynamicMenuGate` melempar ke `/access-denied`.

### Bug 2 — `reset_role_permissions` salah `group_name`
Fungsi DB `reset_role_permissions` menyebut group seperti `'Sales & CRM'`, `'Booking & Jamaah'`, `'Operasional'`, `'Pembayaran'`, `'Marketing'`, `'Landing Pages'`, `'Dashboard'`, `'Laporan'`. Tapi `permissions_list` aktualnya hanya berisi: **Overview, Penjualan, Keuangan, Keberangkatan, Jamaah, Master Data, Pengaturan**. Jadi tombol "Resync All" di Admin RBAC pun menghasilkan 0 baris untuk hampir semua role → bug 1 tidak pernah bisa diperbaiki dari UI.

### Bug 3 — `branch_id` hilang saat user punya multi-role
Di `fetchUserData`, `branchId` hanya diambil dari role pertama yang punya `branch_id`, tapi ditimpa setiap fetch. Jika user owner+branch_manager+sales, `branchId` bisa null → memengaruhi guard branch.

### Optimasi kecepatan terkait
- Setiap render `ProtectedRoute` mencetak `console.log` `DEBUG […]` (4–6 log per navigasi). Di production sangat ramai. Akan dijadikan opt-in via `?debug=auth`.
- `useDynamicMenus` memanggil 2 query Supabase setiap mount untuk staff. `staleTime` sudah 5–60 menit, sudah baik. Tetapi `useEffectivePermissions` (hook lain) memanggil RPC yang sama dengan `queryKey` identik → otomatis di-dedupe oleh React Query, tapi mari kita pastikan key benar-benar identik (sudah).
- `console.log` masif di `useAuth` (10+ per login) akan dijadikan debug-only.

## Rencana perbaikan

### A. Migrasi DB
1. **Perbaiki `reset_role_permissions`** — gunakan `group_name` yang benar:
   - operational → `Keberangkatan`, `Jamaah`, `Overview`
   - finance → `Keuangan`, `Overview`
   - sales → `Penjualan`, `Jamaah`, `Overview`
   - marketing → `Penjualan`, `Overview`
   - equipment → `Keberangkatan`, `Overview`
   - branch_manager / owner → semua key
   - agent → `Jamaah`, `Overview` (subset baca)
   - customer → tidak ada (atau hanya `dashboard`)
2. **Seed `role_permissions` saat ini** — jalankan `INSERT … SELECT` untuk semua role aktif sehingga 22 user existing langsung dapat akses. Idempotent dengan `ON CONFLICT … DO UPDATE SET is_enabled = true`.
3. (Opsional, recommended) tambahkan event trigger DDL/post-migration yang otomatis re-sync permissions jika `permissions_list` berubah, supaya tidak terjadi lagi.

### B. Frontend
1. **Kurangi noise log produksi** di `src/hooks/useAuth.tsx` & `src/components/auth/ProtectedRoute.tsx`:
   ```ts
   const DEBUG_AUTH = typeof window !== 'undefined' &&
     new URLSearchParams(window.location.search).get('debug') === 'auth';
   const dlog = (...a:any[]) => DEBUG_AUTH && console.log(...a);
   ```
   Pertahankan `console.warn`/`error` untuk error nyata. Hilangkan ~15 `console.log` rutin.
2. **Perbaiki `branchId`** di `fetchUserData` — pilih branch_id non-null pertama dari `sortRoles` (prioritas role tertinggi) supaya konsisten.
3. **Fallback yang ramah** di `DynamicMenuGate`: jika `effectiveKeys` kosong **dan** user adalah staff (owner/branch_manager/dll), tampilkan banner "Permission belum dikonfigurasi — minta super admin menjalankan Resync" daripada langsung redirect ke access-denied buta. Cegah lock-out total bila DB tidak ter-seed.
4. Tambahkan **early-allow** untuk route `/admin` (root dashboard) jika menu cocoknya tidak punya `required_permission`. Sudah benar, tapi tambahkan unit test ringan di `src/lib/rbac-resolver.test.ts`.

### C. Verifikasi
1. Jalankan migrasi → cek `SELECT role, count(*) FROM role_permissions WHERE is_enabled GROUP BY role;` semua role > 0.
2. Login sebagai user existing (mis. owner/finance) di preview, pastikan tidak lagi ke `/access-denied`.
3. Buka `/admin/rbac-tools` sebagai super_admin, klik "Resync All" → pastikan setiap role return jumlah > 0.
4. Buka `?debug=auth` untuk memastikan log lama bisa diaktifkan saat dibutuhkan.

## Daftar file yang akan disentuh

```text
supabase/migrations/<ts>_fix_rbac_role_permissions.sql   (baru)
src/hooks/useAuth.tsx                                    (kurangi log + fix branchId)
src/components/auth/ProtectedRoute.tsx                   (kurangi log + fallback)
src/hooks/useDynamicMenus.ts                             (fallback ketika effectiveKeys kosong, opsional)
src/lib/rbac-resolver.test.ts                            (test tambahan, opsional)
```

## Yang TIDAK akan disentuh
- `client.ts`, `EnvDiagnostic.tsx`, edge functions `rbac-e2e-test/*` — sudah stabil.
- Skema `app_role`, `permissions_list`, RPC `check_user_permission`, `get_user_effective_permissions` — sudah benar.
