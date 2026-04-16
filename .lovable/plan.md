

# Plan: Hapus Manajemen Hak Akses Per Role, Pertahankan Per User

## Summary

Menghapus sistem `role_permissions` (hak akses berdasarkan jabatan) dan menggantinya dengan `user_permissions` (hak akses per individu, hanya bisa dikelola oleh Super Admin). Sidebar tetap menampilkan semua menu untuk semua staff, tapi Super Admin bisa membatasi akses user tertentu.

## Current State

- Tabel `role_permissions` ada di DB tapi tidak aktif digunakan di frontend (sidebar sudah menampilkan semua menu)
- Tabel `user_permissions` dan `permissions_list` belum ada di DB
- `AdminUsers.tsx` sudah punya tombol "Izin" tapi dialog-nya placeholder ("Fitur Belum Tersedia")
- `audit-logger.ts` punya fungsi `logPermissionChange` (role-based) dan `logUserPermissionChange` (user-based)

## Changes

### 1. Database Migration
- **Drop** tabel `role_permissions`
- **Create** tabel `permissions_list` (master daftar permission: key, label, group_name, description)
- **Create** tabel `user_permissions` (user_id, permission_key FK, is_enabled) with RLS (super_admin only)
- **Create** function `check_user_permission(uuid, text)` — returns true if user has specific permission override enabled, or true by default if no override exists
- **Seed** `permissions_list` with menu keys extracted from `menu_items` table

### 2. Create `UserPermissionsManager` Component
- New component shown in dialog when Super Admin clicks "Izin" on a user
- Displays all permissions grouped by `group_name`
- Toggle switches for each permission (ON = granted, OFF = revoked)
- Only shows overrides — default is "all access" for staff roles

### 3. Update `AdminUsers.tsx`
- Replace placeholder permissions dialog with actual `UserPermissionsManager`
- Keep Super Admin-only guard on the "Izin" button

### 4. Update `useDynamicMenus.ts`
- Add permission filtering: after fetching menu items, check `user_permissions` for current user
- If a user has `is_enabled = false` for a menu's `required_permission`, hide that menu item
- If no override exists, menu is shown (default allow)

### 5. Clean Up `audit-logger.ts`
- Remove `logPermissionChange` and `logBatchPermissionChanges` (role-based)
- Keep `logUserPermissionChange` (user-based)

### 6. Update Memory
- Update `mem://auth/dynamic-role-permissions` to reflect user-only permissions
- Update `mem://auth/sidebar-rbac-filtering-id` accordingly

## Technical Detail

Permission resolution logic (simplified from RBAC+override to user-only):
1. Super Admin → all access (bypass)
2. Check `user_permissions` for specific user + permission_key
3. If found → use `is_enabled` value
4. If not found → default ALLOW (all staff see everything unless explicitly restricted)

