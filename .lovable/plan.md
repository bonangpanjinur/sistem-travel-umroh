# Sistem Hak Akses 2 Lapis: Role Default + Override User

## Tujuan
Saat ini sistem hanya punya override per-user (semua user default ALLOW, lalu admin bisa cabut satu per satu). Ini menyusahkan ketika role seperti "Operasional" atau "Equipment" punya banyak menu yang seharusnya tidak boleh diakses.

Sistem baru akan punya **2 lapis**:
1. **Default per Role** — misal role `operational` default boleh akses A, B, C, D. Role `equipment` default boleh akses X, Y.
2. **Override per User** — manager operasional bisa diberi tambahan akses E, sementara staff operasional bisa dicabut akses D-nya.

## Logika Resolusi Akses (urutan prioritas)
```text
1. Super Admin                → ALLOW semua (bypass)
2. user_permissions ada?      → pakai is_enabled dari sini (override final)
3. Salah satu role user ALLOW di role_permissions? → ALLOW
4. Default                    → DENY
```

## Perubahan Database

### Tabel baru `role_permissions`
| Kolom          | Tipe           | Catatan |
|----------------|----------------|---------|
| id             | uuid           | PK |
| role           | app_role       | enum role |
| permission_key | text           | FK ke `permissions_list.key` |
| is_enabled     | boolean        | default true |
| timestamps     |                | |
| UNIQUE         | (role, permission_key) | |

RLS: super_admin manage; semua authenticated SELECT (untuk evaluasi sidebar).

### Fungsi DB baru
- `check_user_permission(_user_id, _permission_key)` — diperbarui untuk implementasi logika 4 langkah di atas.
- `get_user_effective_permissions(_user_id)` — return semua permission_key aktif untuk user (gabungan role + override). Dipakai frontend untuk satu kali fetch.

### Seed default per role
Setelah tabel dibuat, isi default yang masuk akal:
- `operational` → menu Produk & Operasional (manifest, rooming, checkin, luggage, bus)
- `equipment`   → menu Perlengkapan + master equipment
- `finance`     → Keuangan & Akuntansi, Payments, Reports keuangan
- `sales`       → Sales & CRM, Leads, Bookings (lihat saja)
- `marketing`   → Landing Pages, Coupons, Testimonials
- `branch_manager` → semua di cabangnya
- `owner`       → semua kecuali setting super_admin
- `agent` / `customer` → tidak masuk admin (tetap)

## Perubahan Frontend

### Hook `useDynamicMenus` (refactor)
Ganti pendekatan "hanya filter revoked" jadi:
1. Panggil RPC `get_user_effective_permissions(user.id)` → `Set<string>` permission aktif.
2. Filter `menu_items` → hanya tampilkan jika `required_permission` ada di set, atau jika menu tidak punya `required_permission` (menu publik admin).
3. Super admin tetap bypass (tampil semua).
4. `isPathAllowed` ikut logika baru.

### Hook baru `useEffectivePermissions`
Reusable di luar sidebar (untuk guard tombol/aksi spesifik).

### `ProtectedRoute`
Sudah panggil `isPathAllowed` — otomatis ikut logika baru. Tidak perlu rombak.

### Halaman baru: Admin → Manajemen Role (`/admin/roles`)
Tabel role × permission dengan toggle. Mirip `UserPermissionsManager` tapi untuk role:
- Tab per role (Operational, Equipment, Finance, Sales, Marketing, Branch Manager, Owner)
- Switch di setiap permission, dikelompokkan per group
- Tombol "Aktifkan semua grup", "Matikan semua grup", search
- Preset cepat: tombol "Terapkan Default Operational" dll yang reset ke template bawaan

### `UserPermissionsManager` (penyesuaian)
Tampilan per permission menunjukkan **3 state visual**:
- ✅ Aktif (dari role default)
- ✅ Aktif (override user — badge "Tambahan")
- ❌ Dicabut (override user — badge "Dicabut")
- Tombol "Reset ke default role" mengembalikan user ke perilaku role-nya.

### Registrasi menu sidebar
Tambah item menu "Manajemen Role" (group Pengaturan) yang hanya tampil untuk super_admin.

## Migrasi & Backfill
1. Buat tabel + fungsi via migration.
2. Seed `role_permissions` dengan default yang masuk akal (script SQL di migration).
3. Tidak ada perubahan data `user_permissions` yang ada — tetap berlaku sebagai override.

## Catatan Penting
- Default berubah dari "semua ALLOW" menjadi "ALLOW hanya jika role mengizinkan". Ini lebih aman tapi setelah deploy, **user staff yang belum di-seed role-nya tidak akan lihat menu apa pun**. Karena itu seed default wajib lengkap untuk semua role aktif.
- Menu `menu_items` yang `required_permission`-nya NULL akan tetap tampil ke semua staff (mis. dashboard `/admin`).

## Detail Teknis
- File baru: `src/pages/admin/AdminRoleManagement.tsx`, `src/components/admin/RolePermissionsManager.tsx`, `src/hooks/useEffectivePermissions.ts`
- File diubah: `src/hooks/useDynamicMenus.ts`, `src/components/admin/UserPermissionsManager.tsx`, `src/routes/AdminRoutes.tsx`, `src/lib/admin-menu-registry.ts`
- Migration: tambah tabel `role_permissions`, RLS, fungsi `check_user_permission` (replace), `get_user_effective_permissions`, seed default.
