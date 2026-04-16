# Rancangan Arsitektur Sistem Izin Per-User Tanpa Duplikasi

## 1. Analisis Sistem Perizinan Saat Ini

Sistem perizinan yang ada di proyek `umrah-haji-magic` mengimplementasikan model hibrida yang menggabungkan **Role-Based Access Control (RBAC)** dengan **User-Level Overrides** (sering disebut sebagai Universal Dynamic Access Control atau UDAC). Berikut adalah komponen-komponen utamanya:

### 1.1. Basis Data (Supabase)

*   **`permissions_list`**: Tabel master yang mendefinisikan semua izin yang tersedia dalam sistem (misalnya, `dashboard.view`, `bookings.create`, `users.manage`). Setiap izin memiliki `key`, `label`, `group_name`, `description`, `type`, dan `resource_identifier`.
*   **`user_roles`**: Tabel yang memetakan pengguna ke satu atau lebih peran (misalnya, `super_admin`, `owner`, `finance`, `sales`, `customer`).
*   **`role_permissions`**: Tabel yang mendefinisikan izin default untuk setiap peran. Ini adalah inti dari RBAC, di mana setiap `role` memiliki daftar `permission_key` yang `is_enabled` secara default.
*   **`user_permissions`**: Tabel ini berfungsi sebagai mekanisme override per-pengguna. Jika ada entri di sini untuk `user_id` dan `permission_key` tertentu, status `is_enabled` di tabel ini akan mengesampingkan (override) izin yang diwarisi dari peran pengguna.
*   **Fungsi RPC `get_user_effective_permission(_user_id, _permission_key)`**: Fungsi ini adalah resolver utama di sisi database. Logikanya adalah sebagai berikut:
    1.  Periksa apakah pengguna adalah `super_admin`. Jika ya, kembalikan `TRUE` (bypass penuh).
    2.  Periksa apakah ada entri eksplisit di `user_permissions` untuk `_user_id` dan `_permission_key`. Jika ada, kembalikan nilai `is_enabled` dari entri tersebut.
    3.  Jika tidak ada override per-pengguna, periksa apakah ada peran yang dimiliki pengguna yang memiliki `_permission_key` yang `is_enabled` di `role_permissions`. Jika setidaknya satu peran mengaktifkannya, kembalikan `TRUE`.
*   **Fungsi RPC `get_user_all_permissions(_user_id)`**: Fungsi ini mengumpulkan semua izin efektif pengguna, dengan logika prioritas: user-level override > role-based permissions.
*   **Tabel `menu_items`**: Mendefinisikan struktur menu navigasi, termasuk `path`, `label`, `group_name`, dan `required_permission`.

### 1.2. Frontend (React/Next.js)

*   **`useAuth` Hook**: Menyediakan konteks otentikasi pengguna, termasuk `user` objek, `profile`, dan daftar `roles` yang dimiliki pengguna.
*   **`useUdacPermissions` Hook**: Mengambil izin efektif pengguna menggunakan `get_user_all_permissions` RPC. Ini menyediakan fungsi `hasPermission(permissionKey)` yang digunakan di seluruh aplikasi untuk memeriksa akses. Hook ini juga memiliki logika bypass `super_admin` di frontend.
*   **`AdminLayout.tsx`**: Komponen layout utama untuk area admin. Saat ini menggunakan daftar menu hardcoded (`NAV_GROUPS`) yang difilter berdasarkan `hasPermission` dari `useUdacPermissions` dan `superAdminOnly` flag.
*   **`AdminLayoutDynamic.tsx`**: Versi layout admin yang lebih baru, dirancang untuk mengambil menu secara dinamis dari tabel `menu_items` melalui `useDynamicMenus` hook. Ini menggunakan `get_user_accessible_menus` RPC yang pada gilirannya memanggil `get_user_effective_permission`.
*   **`UserPermissionsManager.tsx`**: Antarmuka pengguna untuk mengelola izin per-pengguna. Ini menampilkan daftar `masterPermissions` dan memungkinkan administrator untuk membuat atau menghapus override di tabel `user_permissions`. **Penting:** Komponen ini hanya menampilkan status override eksplisit dan tidak secara langsung menunjukkan izin yang diwarisi dari peran, yang dapat menyebabkan kebingungan.
*   **`ProtectedRoute.tsx`**: Komponen yang digunakan untuk melindungi rute, memeriksa `allowedRoles` atau `permission` tertentu menggunakan `hasPermission`.

### 1.3. Permasalahan Duplikasi dan Inkonsistensi

1.  **Dualisme AdminLayout**: Keberadaan `AdminLayout` (hardcoded) dan `AdminLayoutDynamic` (database-driven) menunjukkan transisi yang belum selesai atau potensi inkonsistensi dalam tampilan menu. `AdminRoutes.tsx` masih menggunakan `AdminLayout` yang hardcoded.
2.  **Manajemen Izin yang Tidak Jelas**: `UserPermissionsManager` hanya berfokus pada override. Administrator tidak dapat melihat izin efektif (gabungan dari peran dan override) secara langsung di UI ini, sehingga sulit untuk memahami mengapa seorang pengguna memiliki atau tidak memiliki akses ke fitur tertentu.
3.  **Logika Resolusi Izin yang Tersebar**: Meskipun ada fungsi RPC `get_user_effective_permission` yang solid, logika `hasPermission` di frontend (`useUdacPermissions`) juga memiliki bypass `super_admin` sendiri. Ini bisa menjadi sumber inkonsistensi jika logika database dan frontend tidak sinkron.
4.  **Redundansi Data**: `menu_items` dan `NAV_GROUPS` di `AdminLayout.tsx` pada dasarnya menyimpan informasi yang sama tentang struktur menu, meskipun `menu_items` lebih fleksibel.

## 2. Analisis AdminLayout dan Komponen Menu Terkait Akses

`AdminLayout.tsx` saat ini menggunakan array `NAV_GROUPS` yang didefinisikan secara statis. Setiap item menu dalam `NAV_GROUPS` memiliki properti `permission` (misalnya, `dashboard.view`) dan `superAdminOnly`. Logika pemfilteran menu di `AdminLayout` adalah sebagai berikut:

*   Jika `item.superAdminOnly` adalah `true`, menu hanya ditampilkan jika pengguna adalah `super_admin`.
*   Untuk izin `dashboard.view`, ada pengecualian: jika pengguna adalah `isAdmin()` (yaitu, bukan `customer`), menu dashboard akan ditampilkan terlepas dari izin spesifik. Ini adalah "fix" untuk memastikan staf dapat melihat dashboard.
*   Untuk izin yang berakhiran `.view_own`, sistem akan memeriksa `item.permission` itu sendiri, atau varian `view_branch`, `view_all`, atau `view` dasar. Ini menunjukkan upaya untuk mendukung granularitas izin yang lebih tinggi.
*   Akhirnya, `hasPermission(item.permission)` digunakan untuk memeriksa izin default.

`AdminLayoutDynamic.tsx` adalah arah yang benar karena mengambil data menu dari database (`menu_items`) melalui `useDynamicMenus`. Hook `useDynamicMenus` memanggil fungsi RPC `get_user_accessible_menus` yang mengembalikan daftar menu yang dapat diakses pengguna berdasarkan `get_user_effective_permission`. Ini berarti `AdminLayoutDynamic` secara inheren lebih fleksibel dan akan secara otomatis menyesuaikan menu berdasarkan izin efektif pengguna.

**Kesimpulan:** `AdminLayoutDynamic` adalah solusi yang lebih baik untuk manajemen menu yang adaptif, karena memisahkan definisi menu dari kode frontend dan mengintegrasikannya dengan sistem perizinan efektif di database.

## 3. Rancangan Arsitektur Sistem Izin Per-User yang Baru (Tanpa Duplikasi)

Untuk mencapai sistem izin per-user yang lebih bersih, tanpa duplikasi, dan lebih mudah dikelola, saya merekomendasikan arsitektur berikut:

### 3.1. Prinsip Utama

1.  **User-Centric Default**: Setiap pengguna secara default tidak memiliki izin apa pun. Izin diberikan secara eksplisit kepada pengguna atau melalui peran yang ditetapkan kepada pengguna.
2.  **Role sebagai Template/Grup**: Peran tidak lagi menjadi sumber izin langsung yang di-override. Sebaliknya, peran berfungsi sebagai *template* atau *grup* izin yang dapat diterapkan ke pengguna. Ketika peran diterapkan ke pengguna, izin-izin dari peran tersebut akan **disalin** ke `user_permissions` pengguna tersebut. Perubahan pada `role_permissions` tidak secara otomatis memengaruhi pengguna yang sudah memiliki peran tersebut, kecuali jika ada mekanisme sinkronisasi eksplisit.
3.  **Single Source of Truth untuk Izin Efektif**: Tabel `user_permissions` menjadi satu-satunya sumber kebenaran untuk izin efektif seorang pengguna. Fungsi `get_user_effective_permission` akan disederhanakan untuk hanya membaca dari `user_permissions` (setelah peran disalin).
4.  **Manajemen Menu Dinamis**: Semua menu navigasi harus sepenuhnya didorong oleh data dari tabel `menu_items` dan difilter berdasarkan `user_permissions`.

### 3.2. Perubahan pada Basis Data

*   **Tabel `user_permissions`**: Akan menjadi tabel utama untuk menyimpan semua izin yang dimiliki seorang pengguna. Setiap baris akan berisi `user_id`, `permission_key`, dan `is_enabled`.
*   **Tabel `role_permissions`**: Tetap ada, tetapi fungsinya berubah menjadi *template* izin untuk peran. Ini akan digunakan saat menetapkan peran baru ke pengguna atau saat melakukan sinkronisasi manual.
*   **Fungsi RPC `get_user_effective_permission(_user_id, _permission_key)`**: Akan disederhanakan untuk hanya memeriksa `user_permissions` untuk `_user_id` dan `_permission_key`. Bypass `super_admin` tetap dipertahankan sebagai pengecualian tingkat tinggi.
    ```sql
    CREATE OR REPLACE FUNCTION public.get_user_effective_permission(
      _user_id UUID,
      _permission_key VARCHAR
    )
    RETURNS BOOLEAN
    LANGUAGE plpgsql
    STABLE
    SECURITY DEFINER
    SET search_path = public
    AS $$
    DECLARE
      _is_super_admin BOOLEAN;
      _user_permission_status BOOLEAN;
    BEGIN
      -- 1. Check if user is super_admin (bypass all checks)
      SELECT EXISTS(
        SELECT 1 FROM public.user_roles 
        WHERE user_id = _user_id AND role = 'super_admin'
      ) INTO _is_super_admin;
      
      IF _is_super_admin THEN
        RETURN TRUE;
      END IF;
    
      -- 2. Check for explicit user-level permission
      SELECT is_enabled
      INTO _user_permission_status
      FROM public.user_permissions
      WHERE user_id = _user_id AND permission_key = _permission_key;
    
      RETURN COALESCE(_user_permission_status, FALSE); -- Default to FALSE if no explicit entry
    END;
    $$;
    ```
*   **Fungsi RPC `assign_role_to_user(_user_id, _role_name)`**: Fungsi baru yang akan melakukan hal berikut:
    1.  Menambahkan entri ke `user_roles` untuk `_user_id` dan `_role_name`.
    2.  Menyalin semua izin dari `role_permissions` untuk `_role_name` ke `user_permissions` untuk `_user_id`. Jika izin sudah ada di `user_permissions`, itu akan di-upsert.
*   **Fungsi RPC `remove_role_from_user(_user_id, _role_name)`**: Fungsi baru untuk menghapus peran dan secara opsional menghapus izin yang diwarisi dari peran tersebut (ini bisa menjadi kompleks jika pengguna memiliki banyak peran, jadi mungkin lebih baik hanya menghapus peran dan membiarkan izin di `user_permissions` tetap ada, atau memerlukan mekanisme 'reset permissions to role defaults').
*   **Tabel `menu_items`**: Tetap sama, menjadi sumber utama definisi menu.

### 3.3. Perubahan pada Frontend

*   **Hanya `AdminLayoutDynamic.tsx` yang Digunakan**: Hapus `AdminLayout.tsx` dan pastikan `AdminRoutes.tsx` menggunakan `AdminLayoutDynamic`.
*   **`useDynamicMenus` Hook**: Tetap menggunakan `get_user_accessible_menus` RPC, yang akan secara otomatis bekerja dengan `get_user_effective_permission` yang disederhanakan.
*   **`useUdacPermissions` Hook**: Akan disederhanakan untuk hanya memanggil `get_user_effective_permission` RPC untuk setiap izin yang diminta, atau mengambil semua izin dari `user_permissions` jika diperlukan. Logika bypass `super_admin` di frontend dapat dihapus karena sudah ditangani di database.
*   **`UserPermissionsManager.tsx`**: Ini adalah komponen kunci yang perlu dirombak. Daripada hanya menampilkan override, ia harus menampilkan **izin efektif** pengguna (dari `user_permissions`). Administrator harus dapat:
    *   Melihat semua izin yang dimiliki pengguna, dengan indikasi apakah izin tersebut berasal dari peran yang ditetapkan atau diberikan secara manual.
    *   Mengaktifkan/menonaktifkan izin secara langsung di `user_permissions`.
    *   Menerapkan peran sebagai template: Ketika peran baru ditambahkan ke pengguna, izin dari peran tersebut akan disalin ke `user_permissions` pengguna.
    *   Mungkin ada tombol "Reset to Role Defaults" untuk menghapus semua izin di `user_permissions` dan menyalin ulang dari peran yang saat ini dimiliki pengguna.

### 3.4. Alur Kerja yang Disederhanakan

1.  **Penetapan Peran**: Ketika seorang administrator menetapkan peran kepada pengguna (misalnya, `finance`), fungsi `assign_role_to_user` akan dipanggil. Ini akan menyalin semua izin `is_enabled=TRUE` dari `role_permissions` (`finance`) ke `user_permissions` pengguna tersebut.
2.  **Penyesuaian Izin Per-User**: Jika administrator ingin memberikan izin tambahan atau mencabut izin tertentu untuk pengguna tersebut, mereka akan menggunakan `UserPermissionsManager`. Perubahan ini akan langsung memodifikasi `user_permissions` pengguna.
3.  **Resolusi Izin**: Setiap kali aplikasi perlu memeriksa izin (misalnya, untuk menampilkan menu atau mengizinkan tindakan), ia akan memanggil `hasPermission` (yang pada akhirnya memanggil `get_user_effective_permission` RPC) yang hanya membaca dari `user_permissions`.
4.  **Sinkronisasi Menu**: `AdminLayoutDynamic` akan secara otomatis menampilkan menu yang sesuai karena `useDynamicMenus` mengambil menu berdasarkan izin efektif dari `user_permissions`.

### 3.5. Keuntungan Arsitektur Baru

*   **Tidak Ada Duplikasi Konseptual**: `user_permissions` menjadi satu-satunya sumber kebenaran untuk izin efektif. Peran berfungsi sebagai alat manajemen (template), bukan sumber izin langsung yang tumpang tindih.
*   **Manajemen yang Lebih Jelas**: Administrator dapat melihat dan mengelola semua izin pengguna di satu tempat, dengan pemahaman yang jelas tentang status izin efektif.
*   **Konsistensi**: Menghilangkan inkonsistensi antara `AdminLayout` dan `AdminLayoutDynamic` serta menyatukan logika resolusi izin di database.
*   **Fleksibilitas**: Tetap memungkinkan granularitas izin per-user yang tinggi, sambil menyediakan kemudahan manajemen melalui peran sebagai template.
*   **Performa**: Penyederhanaan `get_user_effective_permission` untuk hanya membaca satu tabel (setelah inisialisasi dari peran) dapat meningkatkan performa. 

Arsitektur ini akan memerlukan refactoring yang signifikan pada `UserPermissionsManager.tsx` dan beberapa fungsi database, tetapi akan menghasilkan sistem perizinan yang jauh lebih mudah dipahami, dikelola, dan diskalakan.
