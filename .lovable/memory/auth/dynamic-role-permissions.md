---
name: User-Level Permissions (No Role-Based)
description: Hak akses per user via user_permissions table, role_permissions dihapus. Super Admin only.
type: feature
---
Sistem role_permissions telah dihapus. Hak akses dikelola per user melalui tabel `user_permissions`.

Logika resolusi:
1. Super Admin → bypass, semua akses diberikan
2. Cek `user_permissions` untuk user + permission_key
3. Jika ditemukan `is_enabled = false` → akses ditolak
4. Jika tidak ditemukan → default ALLOW (semua staff punya akses)

Tabel: `permissions_list` (master), `user_permissions` (override per user).
Fungsi DB: `check_user_permission(uuid, text)` returns boolean.
Hanya Super Admin yang bisa mengelola `user_permissions`.
