# Perancangan Hak Akses Dinamis (Dynamic Access Control)

Sistem ini dirancang untuk memberikan fleksibilitas penuh dalam pengelolaan hak akses tanpa perlu mengubah kode (hardcoded). Sistem ini menggabungkan **Role-Based Access Control (RBAC)** dengan **User-Level Overrides**.

## Arsitektur Data

### 1. `permissions_list` (Master Data)
Menyimpan daftar semua permission yang tersedia di sistem.
- `key`: Identifier unik (contoh: `bookings.view_all`)
- `label`: Nama tampilan (contoh: "Lihat Semua Booking")
- `group_name`: Pengelompokan (contoh: "Booking & Jamaah")
- `description`: Penjelasan fungsi permission

### 2. `role_permissions` (Role Level)
Menentukan permission default untuk setiap role.
- `role`: Nama role (contoh: `sales`, `finance`)
- `permission_key`: Foreign key ke `permissions_list`
- `is_enabled`: Status aktif/nonaktif

### 3. `user_permissions` (User Level Override)
Memberikan fleksibilitas untuk mengubah akses individu tanpa mengubah role mereka.
- `user_id`: ID pengguna
- `permission_key`: Foreign key ke `permissions_list`
- `is_enabled`: Jika TRUE, memberikan akses. Jika FALSE, mencabut akses (meskipun role-nya punya akses tersebut).

## Logika Resolusi Permission

Sistem akan mengecek izin dengan urutan prioritas berikut:
1. **Super Admin Bypass**: Jika user adalah `super_admin`, semua akses diberikan.
2. **User Override**: Cek tabel `user_permissions`. Jika ditemukan entri untuk user tersebut, gunakan nilai `is_enabled` dari sana.
3. **Role Permissions**: Jika tidak ada override, cek tabel `role_permissions` berdasarkan semua role yang dimiliki user. Jika salah satu role memiliki akses aktif, maka akses diberikan.
4. **Default Deny**: Jika tidak ditemukan di mana pun, akses ditolak.

## Integrasi Menu Dinamis

Menu di Sidebar akan dirender berdasarkan permission:
- Setiap item menu memiliki properti `permission`.
- Frontend menggunakan hook `useUdacPermissions` untuk memvalidasi apakah user memiliki permission tersebut.
- Jika tidak punya akses, menu tidak akan muncul.

## Rencana Implementasi

1. **Sinkronisasi Otomatis**: Script untuk mengekstrak semua `permission` key dari `AdminLayout.tsx` dan memasukkannya ke `permissions_list`.
2. **Peningkatan UI**:
   - Halaman Manajemen Role: Untuk mengatur akses default per jabatan.
   - Halaman Manajemen User: Untuk memberikan "akses khusus" ke individu tertentu.
3. **Backend Validation**: Memastikan middleware API juga menggunakan logika resolusi yang sama.
