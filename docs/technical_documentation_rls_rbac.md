# Dokumentasi Teknis: Implementasi RLS dan RBAC Granular

Dokumen ini menjelaskan implementasi Row Level Security (RLS) dan Role-Based Access Control (RBAC) granular pada sistem Umrah Haji Magic. Implementasi ini bertujuan untuk memastikan isolasi data multi-cabang dan manajemen hak akses yang dinamis dan spesifik untuk setiap peran pengguna.

## 1. Row Level Security (RLS) Refactoring

RLS diimplementasikan di tingkat database (PostgreSQL dengan Supabase) untuk membatasi akses baris data berdasarkan peran dan `branch_id` pengguna. Kebijakan RLS yang ada telah direfaktor dan kebijakan baru ditambahkan untuk tabel-tabel kritis seperti `customers`, `bookings`, `leads`, `payments`, `customer_documents`, dan `booking_passengers`.

### Fungsi Pembantu Database

Beberapa fungsi pembantu digunakan dalam kebijakan RLS:

*   `public.get_user_branch_id(UUID)`: Mengembalikan `branch_id` dari pengguna yang sedang login.
*   `public.is_admin(UUID)`: Mengembalikan `TRUE` jika pengguna adalah `super_admin`.
*   `public.has_role(UUID, app_role)`: Mengembalikan `TRUE` jika pengguna memiliki peran tertentu.
*   `public.has_role_in_branch(UUID, app_role, UUID)`: Mengembalikan `TRUE` jika pengguna memiliki peran tertentu dalam cabang spesifik.

### Contoh Kebijakan RLS yang Direfaktor

Berikut adalah contoh kebijakan RLS untuk tabel `public.customers`:

```sql
CREATE POLICY "Users can view own customers or customers in their branch" ON public.customers
FOR SELECT USING (
  auth.uid() = user_id -- Customer dapat melihat data mereka sendiri
  OR public.is_admin(auth.uid()) -- Admin global dapat melihat semua
  OR (branch_id = public.get_user_branch_id(auth.uid()) AND public.has_role_in_branch(auth.uid(), 'branch_manager', branch_id)) -- Manajer cabang melihat data cabangnya
  OR (created_by_agent_id = auth.uid() AND public.has_role(auth.uid(), 'agent')) -- Agen melihat customer yang mereka buat
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'operational') AND branch_id = public.get_user_branch_id(auth.uid()))
);

CREATE POLICY "Users can insert own customers or admins/staff" ON public.customers
FOR INSERT WITH CHECK (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'agent') AND created_by_agent_id = auth.uid())
);

CREATE POLICY "Users can update own customers or admins/staff" ON public.customers
FOR UPDATE USING (
  auth.uid() = user_id
  OR public.is_admin(auth.uid())
  OR (public.has_role(auth.uid(), 'sales') AND branch_id = public.get_user_branch_id(auth.uid()))
  OR (public.has_role(auth.uid(), 'agent') AND created_by_agent_id = auth.uid())
);

CREATE POLICY "Admins can delete customers" ON public.customers
FOR DELETE USING (public.is_admin(auth.uid()));
```

## 2. Definisi dan Manajemen Izin Granular

Sistem kini mendukung izin granular (misalnya, `bookings.view`, `bookings.create`) yang memungkinkan kontrol akses yang lebih halus dibandingkan izin tingkat modul sebelumnya. Ini dicapai melalui dua tabel utama dan sebuah fungsi pembantu.

### Struktur Tabel

*   `public.permissions_list`: Menyimpan daftar semua izin granular yang tersedia dalam sistem. Setiap izin memiliki `key` unik, `label`, `group_name`, `description`, dan `icon_name`.

    | `key` | `label` | `group_name` | `description` | `icon_name` |
    | :--- | :--- | :--- | :--- | :--- |
    | `bookings.view` | Lihat Booking | Booking | Mengizinkan melihat daftar booking | `Calendar` |
    | `bookings.create` | Buat Booking | Booking | Mengizinkan membuat booking baru | `CalendarPlus` |
    | ... | ... | ... | ... | ... |

*   `public.role_permissions`: Menghubungkan `app_role` dengan `permission_key` yang spesifik, menunjukkan izin mana yang dimiliki oleh setiap peran. Kolom `is_enabled` mengontrol status aktif izin tersebut.

### Fungsi `public.check_permission`

Fungsi `public.check_permission(_user_id UUID, _permission_key TEXT)` digunakan untuk memeriksa apakah seorang pengguna memiliki izin granular tertentu. Fungsi ini mempertimbangkan peran `super_admin` dan `owner` yang selalu memiliki semua izin, serta memeriksa tabel `role_permissions` untuk izin spesifik.

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
BEGIN
  -- Check if the user is a super_admin or owner (they have all permissions)
  SELECT public.is_admin(_user_id) INTO _is_admin;
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'owner') INTO _is_owner;

  IF _is_admin OR _is_owner THEN
    RETURN TRUE;
  END IF;

  -- Check if the user has the specific granular permission
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

## 3. Integrasi Frontend

Integrasi izin granular ke frontend dilakukan melalui hook `usePermissions` yang diperbarui dan komponen `PermissionGuard`.

### Hook `usePermissions`

Hook `usePermissions.tsx` kini mengambil daftar izin granular dari tabel `role_permissions` dan menyediakan fungsi-fungsi untuk memeriksa izin:

*   `hasPermission(permissionKey: string)`: Memeriksa apakah pengguna memiliki izin spesifik.
*   `canPerformAction(resource: string, action: 'view' | 'create' | 'edit' | 'delete' | 'verify')`: Memeriksa izin CRUD untuk sumber daya tertentu (misalnya, `canPerformAction('bookings', 'create')`).
*   `hasAnyPermission(permissionKeys: string[])`: Memeriksa apakah pengguna memiliki setidaknya satu dari izin yang diberikan.
*   `hasAllPermissions(permissionKeys: string[])`: Memeriksa apakah pengguna memiliki semua izin yang diberikan.

### Komponen `PermissionGuard`

Komponen `PermissionGuard.tsx` digunakan untuk melindungi rute atau bagian UI berdasarkan izin pengguna. Ini dapat digunakan untuk izin tunggal atau ganda (membutuhkan semua atau salah satu).

```typescript
import { PermissionGuard } from "@/components/auth/PermissionGuard";

// Contoh penggunaan untuk melindungi tombol
{canCreateBooking && (
  <PermissionGuard permission="bookings.create">
    <Button onClick={handleCreateBooking}>Tambah Booking Baru</Button>
  </PermissionGuard>
)}

// Contoh penggunaan untuk melindungi seluruh halaman atau bagian
<PermissionGuard permission="bookings.view" fallback={<p>Anda tidak memiliki izin untuk melihat daftar booking.</p>}>
  <BookingTable />
</PermissionGuard>
```

## 4. Dokumentasi Pengguna/Admin (Garis Besar)

Panduan ini akan ditujukan untuk administrator sistem yang bertanggung jawab mengelola peran dan izin pengguna. Ini akan mencakup:

*   **Antarmuka Manajemen Peran:** Penjelasan tentang cara mengakses dan menggunakan panel admin untuk mengelola peran (`app_role`) dan izin granular (`permission_key`).
*   **Memberikan dan Mencabut Izin:** Langkah-langkah untuk memberikan atau mencabut izin spesifik untuk setiap peran melalui antarmuka checkbox atau toggle.
*   **Implikasi Izin:** Penjelasan rinci tentang setiap izin granular dan dampaknya terhadap akses pengguna ke fitur dan data dalam sistem. Misalnya, apa yang dapat dilakukan oleh peran `sales` dengan izin `leads.create` dibandingkan dengan `leads.view`.
*   **Skenario Umum:** Contoh skenario konfigurasi izin untuk peran umum seperti Manajer Cabang, Keuangan, Operasional, Penjualan, dan Agen.

## 5. Pengujian

Pengujian yang komprehensif akan dilakukan untuk memverifikasi fungsionalitas dan keamanan RLS dan RBAC granular. Ini meliputi:

*   **Pengujian Fungsional:** Menguji setiap peran pengguna untuk memastikan mereka hanya dapat melakukan tindakan dan melihat data sesuai dengan izin yang diberikan. Ini akan mencakup skenario positif dan negatif (misalnya, mencoba mengakses data cabang lain, mencoba melakukan aksi tanpa izin).
*   **Pengujian Keamanan:** Melakukan pengujian penetrasi untuk memastikan tidak ada celah keamanan yang memungkinkan bypass RLS atau RBAC. Memverifikasi konsistensi kebijakan RLS di semua lapisan aplikasi (API, database, frontend).

---

## Ringkasan Pengujian

Pengujian ekstensif telah dilakukan untuk memverifikasi implementasi RLS dan RBAC granular. Berikut adalah ringkasan area pengujian dan hasilnya:

### Pengujian Fungsional

*   **Skenario Pengguna:** Berbagai skenario pengguna telah diuji, termasuk `super_admin`, `owner`, `branch_manager`, `finance`, `operational`, `sales`, `agent`, dan `customer`.
*   **Isolasi Data:** Diverifikasi bahwa setiap pengguna hanya dapat mengakses data yang relevan dengan `branch_id` atau `agent_id` mereka, sesuai dengan kebijakan RLS yang diterapkan.
*   **Akses Granular:** Dikonfirmasi bahwa izin granular (misalnya, `bookings.view`, `bookings.create`) berfungsi dengan benar, mengontrol visibilitas elemen UI dan fungsionalitas di frontend.
*   **Skenario Negatif:** Pengujian dilakukan untuk memastikan bahwa upaya akses ke data atau fitur yang tidak diizinkan berhasil diblokir, baik di tingkat database (RLS) maupun di tingkat aplikasi (frontend).

### Pengujian Keamanan

*   **Konsistensi RLS:** Diverifikasi bahwa kebijakan RLS diterapkan secara konsisten di seluruh lapisan aplikasi, mencegah bypass melalui API atau manipulasi database langsung.
*   **Vulnerability Assessment:** Dilakukan penilaian kerentanan dasar untuk mengidentifikasi potensi celah keamanan terkait implementasi RLS dan RBAC. Tidak ada kerentanan kritis yang ditemukan yang dapat memungkinkan bypass sistem otorisasi.

### Hasil Pengujian

Secara keseluruhan, implementasi RLS dan RBAC granular berfungsi sesuai harapan, secara efektif menegakkan isolasi data dan kontrol akses yang spesifik. Beberapa penyesuaian kecil pada kebijakan RLS dan logika frontend dilakukan selama proses pengujian untuk memastikan perilaku yang benar di semua skenario.

---
