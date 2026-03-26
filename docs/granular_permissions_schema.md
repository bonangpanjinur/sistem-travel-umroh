# Desain Skema Hak Akses Granular

Dokumen ini menjelaskan desain skema database untuk implementasi hak akses granular (per-pengguna) dalam proyek `umrah-haji-magic`. Tujuannya adalah untuk memungkinkan konfigurasi izin yang lebih rinci untuk setiap pengguna, melampaui hak akses berbasis peran tradisional.

## Tabel yang Ada

### `public.permissions_list`

Tabel ini mendefinisikan semua izin granular yang tersedia dalam sistem. Setiap izin memiliki kunci unik, label yang dapat dibaca manusia, grup, deskripsi, dan ikon.

| Kolom         | Tipe Data     | Keterangan                                     |
| :------------ | :------------ | :--------------------------------------------- |
| `key`         | `VARCHAR(100)`| Kunci unik untuk izin (misalnya, `packages.create`) |
| `label`       | `VARCHAR(255)`| Label yang ditampilkan di UI                   |
| `group_name`  | `VARCHAR(100)`| Kategori izin (misalnya, `Paket`)              |
| `description` | `TEXT`        | Deskripsi rinci izin                           |
| `icon_name`   | `VARCHAR(50)` | Nama ikon terkait                              |
| `created_at`  | `TIMESTAMPTZ` | Waktu pembuatan catatan                        |
| `updated_at`  | `TIMESTAMPTZ` | Waktu pembaruan catatan terakhir               |

### `public.user_roles`

Tabel ini menghubungkan pengguna dengan peran mereka dalam sistem.

| Kolom     | Tipe Data | Keterangan                               |
| :-------- | :-------- | :--------------------------------------- |
| `user_id` | `UUID`    | ID pengguna (FK ke `auth.users.id`)      |
| `role`    | `TEXT`    | Nama peran (misalnya, `super_admin`, `operational`) |

### `public.role_permissions`

Tabel ini menetapkan izin granular untuk setiap peran. Ini adalah dasar dari sistem hak akses berbasis peran.

| Kolom            | Tipe Data     | Keterangan                                     |
| :--------------- | :------------ | :--------------------------------------------- |
| `role`           | `TEXT`        | Nama peran (FK ke `user_roles.role`)           |
| `permission_key` | `VARCHAR(100)`| Kunci izin (FK ke `permissions_list.key`)      |
| `is_enabled`     | `BOOLEAN`     | Menunjukkan apakah izin diaktifkan untuk peran ini |

## Tabel Baru: `public.user_permissions`

Tabel ini akan memungkinkan penetapan izin secara langsung ke pengguna individu, memberikan kontrol granular yang diminta. Ini akan berfungsi sebagai penimpaan atau penambahan pada izin berbasis peran.

| Kolom            | Tipe Data     | Keterangan                                     |
| :--------------- | :------------ | :--------------------------------------------- |
| `user_id`        | `UUID`        | ID pengguna (FK ke `auth.users.id`)            |
| `permission_key` | `VARCHAR(100)`| Kunci izin (FK ke `permissions_list.key`)      |
| `is_enabled`     | `BOOLEAN`     | `TRUE` jika izin diberikan secara eksplisit, `FALSE` jika dicabut secara eksplisit |
| `created_at`     | `TIMESTAMPTZ` | Waktu pembuatan catatan                        |
| `updated_at`     | `TIMESTAMPTZ` | Waktu pembaruan catatan terakhir               |

**Indeks Unik**: `(user_id, permission_key)` untuk memastikan setiap pengguna hanya memiliki satu entri untuk setiap izin.

## Pembaruan Fungsi `public.check_permission`

Fungsi `public.check_permission` akan dimodifikasi untuk mempertimbangkan tabel `user_permissions` terlebih dahulu. Logika baru akan sebagai berikut:

1.  **Periksa Super Admin/Owner**: Jika pengguna adalah `super_admin` atau `owner`, kembalikan `TRUE` (mereka memiliki semua izin).
2.  **Periksa Izin Pengguna Eksplisit**: Cari entri di `public.user_permissions` untuk `_user_id` dan `_permission_key` yang diberikan:
    *   Jika ditemukan entri dengan `is_enabled = TRUE`, kembalikan `TRUE`.
    *   Jika ditemukan entri dengan `is_enabled = FALSE`, kembalikan `FALSE` (izin dicabut secara eksplisit).
3.  **Periksa Izin Berbasis Peran**: Jika tidak ada entri eksplisit di `public.user_permissions`, periksa `public.role_permissions` (seperti logika saat ini).
    *   Jika peran pengguna memiliki `_permission_key` dengan `is_enabled = TRUE`, kembalikan `TRUE`.
4.  **Default**: Jika tidak ada aturan yang cocok, kembalikan `FALSE`.

### Pseudocode untuk `check_permission` yang Diperbarui

```sql
CREATE OR REPLACE FUNCTION public.check_permission(_user_id UUID, _permission_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin BOOLEAN;
  _is_owner BOOLEAN;
  _user_permission_status BOOLEAN;
BEGIN
  -- 1. Check if the user is a super_admin or owner (they have all permissions)
  SELECT public.is_admin(_user_id) INTO _is_admin;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'owner') INTO _is_owner;

  IF _is_admin OR _is_owner THEN
    RETURN TRUE;
  END IF;

  -- 2. Check for explicit user-level permission override
  SELECT is_enabled
  INTO _user_permission_status
  FROM public.user_permissions
  WHERE user_id = _user_id AND permission_key = _permission_key;

  IF FOUND THEN
    RETURN _user_permission_status; -- Explicitly granted or denied for this user
  END IF;

  -- 3. Fallback to role-based permissions
  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    JOIN public.role_permissions rp ON ur.role = rp.role
    WHERE ur.user_id = _user_id
      AND rp.permission_key = _permission_key
      AND rp.is_enabled = TRUE
  );
END;
$$;
```

## Kebijakan Keamanan Tingkat Baris (RLS) untuk `user_permissions`

Kebijakan RLS akan diterapkan pada tabel `user_permissions` untuk memastikan bahwa hanya `super_admin` atau `owner` yang dapat membuat, mengedit, atau menghapus izin pengguna. Pengguna terautentikasi dapat melihat izin mereka sendiri.

*   **SELECT**: Pengguna terautentikasi dapat melihat izin mereka sendiri. `super_admin` dan `owner` dapat melihat semua.
*   **INSERT, UPDATE, DELETE**: Hanya `super_admin` dan `owner` yang dapat melakukan operasi ini.

Dengan desain ini, sistem dapat mengakomodasi skenario seperti Nida (manajer operasional) memiliki izin `packages.create`, `packages.edit`, dan `packages.delete`, sementara Sandi (staf operasional) hanya memiliki `packages.create`, terlepas dari peran operasional mereka yang mungkin sama.
