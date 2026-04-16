# Permission System Fix - UDAC Sidebar Visibility Issue

## Problem Summary
Menu sidebar tidak muncul untuk role tertentu meskipun akses sudah diberikan melalui Universal Dynamic Access Control (UDAC), padahal di halaman admin menu permissions sudah di-enable.

## Root Causes Identified

### 1. Ketidaksinkronan Logika Pengecekan Permission
**Masalah:** Sistem menggunakan dua hook permission yang berbeda dengan logika berbeda:
- **Sidebar (`AdminLayout.tsx`)**: Menggunakan `useUdacPermissions` dengan fallback logic
  - Jika permission adalah `bookings.view_own`, sidebar juga muncul jika user punya `bookings.view_branch`, `bookings.view_all`, atau `bookings.view`
- **Route Guard (`ProtectedRoute.tsx`)**: Menggunakan `usePermissions` dengan exact match
  - Hanya menerima permission yang **persis sama** (string matching)
  - Jika route membutuhkan `bookings.view_own` tapi user hanya punya `bookings.view_all`, akses ditolak

**Dampak:** Sidebar muncul tapi halaman tidak bisa diakses, atau sebaliknya.

### 2. Cache Invalidation Tidak Lengkap
**Masalah:** Saat Admin menyimpan perubahan izin di UDAC Management:
- Hanya query `udac-permissions` yang di-invalidate
- Query `user-permissions` (digunakan oleh ProtectedRoute) tidak di-invalidate
- Hasil: User harus logout-login untuk melihat perubahan

### 3. Real-time Subscription Terbatas
**Masalah:** Real-time listener hanya mendengarkan perubahan di tabel `role_permissions`
- Jika izin diberikan via User-level Override, sidebar tidak refresh
- Jika izin diberikan via Role-level, tapi cache belum di-invalidate, sidebar tetap tidak muncul

## Solutions Implemented

### 1. Buat Hook Permission Baru dengan Fallback Logic
**File:** `src/hooks/usePermissionsFixed.tsx`

Fitur baru:
- Mendukung fallback logic yang sama dengan sidebar
- Jika permission adalah `*.view_own`, juga cek untuk `*.view_branch`, `*.view_all`, dan `*.view`
- Invalidate kedua cache (`udac-permissions` dan `user-permissions`) saat ada perubahan role_permissions
- Konsisten dengan logika sidebar di `AdminLayout.tsx`

```typescript
// Contoh: Jika user punya bookings.view_all, maka bookings.view_own juga akan return true
if (permissionKey.endsWith('.view_own')) {
  const base = permissionKey.replace('.view_own', '');
  return permissions.some(p => 
    (p.permission_key === `${base}.view_branch` || 
     p.permission_key === `${base}.view_all` ||
     p.permission_key === `${base}.view`) && 
    p.is_enabled
  );
}
```

### 2. Update ProtectedRoute untuk Gunakan Hook Baru
**File:** `src/components/auth/ProtectedRoute.tsx`

Perubahan:
- Ganti import dari `usePermissions` ke `usePermissionsFixed`
- Sekarang route guard menggunakan logika fallback yang sama dengan sidebar

### 3. Perbaiki Cache Invalidation di UDAC Management
**File:** `src/pages/admin/AdminUdacManagement.tsx`

Perubahan:
- Tambah invalidation untuk query key `user-permissions` saat menyimpan
- Sekarang saat Admin menyimpan izin, kedua cache akan di-refresh:
  ```typescript
  queryClient.invalidateQueries({ queryKey: ["role-permissions"] });
  queryClient.invalidateQueries({ queryKey: ["udac-permissions"] });
  queryClient.invalidateQueries({ queryKey: ["user-permissions"] }); // BARU
  ```

### 4. Perbaiki Real-time Subscription
**File:** `src/hooks/usePermissionsFixed.tsx`

Perubahan:
- Real-time listener sekarang invalidate kedua cache
- Memastikan sidebar dan route guard refresh bersamaan

## Testing Checklist

Setelah deploy, pastikan:
- [ ] Buat role baru (misal: `test_role`)
- [ ] Assign permission `bookings.view_all` ke role tersebut
- [ ] Buat user dengan role `test_role`
- [ ] Login dengan user tersebut
- [ ] Verifikasi menu "Booking" muncul di sidebar
- [ ] Klik menu "Booking" dan pastikan halaman bisa diakses (tidak redirect)
- [ ] Ubah permission di UDAC Management (misal: disable `bookings.view_all`)
- [ ] Verifikasi sidebar refresh otomatis (menu Booking hilang)
- [ ] Verifikasi halaman Booking tidak bisa diakses lagi

## Migration Notes

Jika sudah ada user yang login:
1. User harus logout dan login kembali untuk cache di-refresh
2. Atau bisa tunggu 5 menit (staleTime) untuk cache expire otomatis

Untuk immediate refresh, bisa trigger manual:
```typescript
// Di browser console
localStorage.clear(); // Clear local cache
location.reload(); // Reload page
```

## Files Modified
1. `src/hooks/usePermissionsFixed.tsx` - BARU
2. `src/components/auth/ProtectedRoute.tsx` - UPDATED
3. `src/pages/admin/AdminUdacManagement.tsx` - UPDATED

## Future Improvements
1. Pertimbangkan untuk deprecate `usePermissions` dan gunakan `usePermissionsFixed` di semua tempat
2. Tambah integration test untuk permission fallback logic
3. Dokumentasikan permission hierarchy dan fallback rules di wiki
