# UDAC Phase 5: Integrasi dan Pengujian Frontend Global

**Tanggal**: 15 April 2026  
**Status**: Implementasi Lengkap  
**Versi**: 2.1 Granular

---

## 1. Ringkasan Fase 5

Fase 5 berfokus pada:
1. **Verifikasi Integrasi Global** - Memastikan `useUdacPermissions` hook digunakan di seluruh aplikasi
2. **Pengujian End-to-End** - Validasi skenario *user-level override* dan hierarki peran
3. **Dokumentasi Teknis** - Panduan implementasi untuk developer

---

## 2. Integrasi Global useUdacPermissions

### 2.1 Komponen yang Sudah Terintegrasi

#### ✅ AdminLayout.tsx
- **Lokasi**: `src/components/admin/AdminLayout.tsx`
- **Implementasi**: 
  - Import `useUdacPermissions` hook
  - Menggunakan `hasPermission()` untuk filter navigasi sidebar
  - Menampilkan/menyembunyikan menu berdasarkan izin efektif pengguna
- **Fitur**:
  - Sidebar dinamis berdasarkan izin
  - Super admin bypass (frontend responsiveness)
  - Backend validation tetap berlaku (RLS)

#### ✅ UdacPermissionGuard.tsx
- **Lokasi**: `src/components/auth/UdacPermissionGuard.tsx`
- **Implementasi**:
  - Wrapper component untuk conditional rendering
  - HOC `withUdacPermission` untuk page protection
  - Fallback UI dan error handling
- **Penggunaan**:
  ```tsx
  <UdacPermissionGuard permission="bookings.view" showError>
    <BookingsList />
  </UdacPermissionGuard>
  ```

### 2.2 Rekomendasi Integrasi Tambahan

Untuk meningkatkan keamanan dan konsistensi, berikut komponen yang **disarankan** untuk menambahkan permission checks:

#### Halaman Admin Kritis
1. **AdminUsers.tsx** - Manajemen user (sudah ada role check, tambahkan UDAC)
2. **AdminUdacManagement.tsx** - Manajemen izin (sudah ada, super admin only)
3. **AdminPayments.tsx** - Manajemen pembayaran (tambahkan `payments.view_all` check)
4. **AdminFinance.tsx** - Laporan keuangan (tambahkan `finance.reports` check)
5. **AdminCustomers.tsx** - Manajemen jamaah (tambahkan `customers.view` check)

#### Komponen Sensitif
1. **Delete buttons** - Tambahkan `*.delete` permission check
2. **Export buttons** - Tambahkan `*.export` permission check
3. **Edit forms** - Tambahkan `*.edit` permission check
4. **Sensitive data display** - Tambahkan field-level permission checks

---

## 3. Pengujian End-to-End (E2E)

### 3.1 Skenario Pengujian Dasar

#### Skenario 1: Super Admin - Akses Penuh
```
Pengguna: super_admin
Peran: super_admin
Override: Tidak ada

Hasil yang Diharapkan:
✓ Dapat mengakses semua menu di sidebar
✓ Dapat mengakses semua halaman admin
✓ Dapat mengelola user dan izin
✓ Dapat melihat semua data tanpa batasan cabang
```

#### Skenario 2: Branch Manager - Akses Terbatas
```
Pengguna: branch_manager_001
Peran: branch_manager (Cabang Surabaya)
Override: Tidak ada

Hasil yang Diharapkan:
✓ Dapat mengakses menu: Dashboard, Booking, Customers, Payments
✓ Tidak dapat mengakses: Users, UDAC Management, Finance Reports
✓ Data dibatasi hanya untuk Cabang Surabaya
✓ Tidak dapat melihat data cabang lain
```

#### Skenario 3: Sales dengan Override - Akses Khusus
```
Pengguna: sales_001
Peran: sales (Cabang Jakarta)
Override: 
  - payments.view_all = true (grant)
  - bookings.delete = false (revoke)

Hasil yang Diharapkan:
✓ Dapat melihat pembayaran dari semua cabang (override)
✓ Tidak dapat menghapus booking (override)
✓ Fitur lain mengikuti izin peran sales
✓ Menu "Pembayaran" muncul di sidebar
✓ Tombol delete di booking list disembunyikan
```

#### Skenario 4: Owner - Akses Penuh (Alternatif Super Admin)
```
Pengguna: owner_001
Peran: owner
Override: Tidak ada

Hasil yang Diharapkan:
✓ Sama dengan super_admin
✓ Dapat mengakses semua fitur
✓ Dapat mengelola user dan izin
```

### 3.2 Skenario Pengujian Hierarki Peran

#### Skenario 5: Role Hierarchy - Finance > Operational
```
Pengguna: finance_staff_001
Peran: finance
Peran Tambahan: operational (inherited permissions)

Hasil yang Diharapkan:
✓ Memiliki izin finance.* dan operational.*
✓ Sidebar menampilkan menu dari kedua peran
✓ Dapat mengakses fitur dari kedua peran
```

### 3.3 Skenario Pengujian Real-Time Update

#### Skenario 6: Perubahan Izin Real-Time
```
Langkah:
1. User A login dengan izin "bookings.view"
2. Admin mengubah izin User A menjadi "bookings.view_all"
3. User A membuka halaman bookings

Hasil yang Diharapkan:
✓ Sidebar update otomatis (real-time)
✓ Halaman bookings refresh dengan izin baru
✓ Tidak perlu logout/login
```

#### Skenario 7: Override Dihapus
```
Langkah:
1. User B memiliki override "payments.view_all = true"
2. Admin menghapus override tersebut
3. User B membuka halaman payments

Hasil yang Diharapkan:
✓ Izin kembali ke default peran
✓ Akses dibatasi sesuai peran
✓ Menu/tombol yang relevan disembunyikan
```

---

## 4. Checklist Validasi Implementasi

### 4.1 Frontend Integration
- [ ] `AdminLayout.tsx` menggunakan `useUdacPermissions` untuk sidebar filtering
- [ ] `UdacPermissionGuard` tersedia untuk component wrapping
- [ ] Navigation items di-filter berdasarkan `hasPermission()`
- [ ] Super admin bypass bekerja di frontend (untuk responsiveness)
- [ ] Loading state ditampilkan saat permissions loading

### 4.2 Backend Validation
- [ ] RLS policies diterapkan di semua tabel sensitif
- [ ] RPC functions `check_permission_v2` dan `get_user_all_permissions` berfungsi
- [ ] User-level override di-prioritaskan di atas role permissions
- [ ] Audit log mencatat semua perubahan izin

### 4.3 User Experience
- [ ] Menu sidebar dinamis berdasarkan izin
- [ ] Tombol aksi (edit, delete, export) disembunyikan jika tidak ada izin
- [ ] Error message jelas saat akses ditolak
- [ ] Tidak ada "broken" UI elements (orphaned buttons)

### 4.4 Security
- [ ] Frontend checks hanya untuk UX (tidak untuk security)
- [ ] Backend validation adalah source of truth
- [ ] RLS policies mencegah akses data tidak sah
- [ ] Audit trail lengkap untuk compliance

---

## 5. Testing Checklist

### 5.1 Manual Testing

#### Test Case 1: Super Admin Navigation
```
Steps:
1. Login sebagai super_admin
2. Lihat sidebar admin
3. Klik beberapa menu item

Expected:
- Semua menu terlihat
- Semua halaman dapat diakses
- Tidak ada error
```

#### Test Case 2: Branch Manager Navigation
```
Steps:
1. Login sebagai branch_manager
2. Lihat sidebar admin
3. Coba akses halaman "Users"

Expected:
- Menu "Users" tidak terlihat
- Jika URL diakses langsung, redirect/error
- Sidebar menampilkan hanya menu yang relevan
```

#### Test Case 3: User Permission Override
```
Steps:
1. Login sebagai super_admin
2. Buka Admin > Users
3. Klik tombol "Izin" pada user tertentu
4. Berikan override permission
5. Simpan perubahan
6. Login sebagai user tersebut
7. Verifikasi izin baru

Expected:
- Override permission tersimpan
- User dapat mengakses fitur yang di-override
- Sidebar update otomatis
```

#### Test Case 4: Permission Revocation
```
Steps:
1. Login sebagai super_admin
2. Buka Admin > Users
3. Klik tombol "Izin" pada user dengan override
4. Hapus override (klik tombol refresh)
5. Simpan perubahan
6. Login sebagai user tersebut

Expected:
- Override dihapus
- Izin kembali ke default peran
- Akses dibatasi sesuai peran
```

### 5.2 Automated Testing (Recommended)

```typescript
// Example: E2E test dengan Playwright
import { test, expect } from '@playwright/test';

test('Super Admin dapat mengakses semua menu', async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'super_admin@test.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button:has-text("Login")');
  
  // Verifikasi sidebar
  const sidebar = page.locator('[data-testid="admin-sidebar"]');
  const menuItems = await sidebar.locator('a').count();
  expect(menuItems).toBeGreaterThan(10);
});

test('Branch Manager tidak dapat mengakses Users menu', async ({ page }) => {
  await loginAs('branch_manager@test.com', page);
  
  const usersMenu = page.locator('text=Users');
  await expect(usersMenu).not.toBeVisible();
});
```

---

## 6. Integrasi dengan Existing Components

### 6.1 AdminLayout.tsx - Current Implementation

```tsx
// Current implementation already uses useUdacPermissions
const { hasPermission, isLoading: permsLoading } = useUdacPermissions();

// Filter nav items based on permissions
const filteredNavGroups = NAV_GROUPS.map(group => ({
  ...group,
  items: group.items.filter(item => {
    if (item.superAdminOnly && !isSuperAdmin) {
      return false;
    }
    return hasPermission(item.permission);
  })
})).filter(group => group.items.length > 0);
```

### 6.2 UserPermissionsManager.tsx - Phase 4 Implementation

```tsx
// Mengelola user-level override permissions
const { data: userOverrides = [] } = useQuery({
  queryKey: ["user-permissions-override", userId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from("user_permissions")
      .select("*")
      .eq("user_id", userId);
    if (error) throw error;
    return data;
  },
});
```

---

## 7. Dokumentasi untuk Developer

### 7.1 Menggunakan useUdacPermissions Hook

```tsx
import { useUdacPermissions } from "@/hooks/useUdacPermissions";

export function MyComponent() {
  const { hasPermission, permissions, getPermissionsByGroup } = useUdacPermissions();
  
  // Check single permission
  if (hasPermission('bookings.view')) {
    // Render booking list
  }
  
  // Get all permissions in a group
  const financePerms = getPermissionsByGroup('finance');
  
  // Get all permissions
  console.log(permissions);
}
```

### 7.2 Menggunakan UdacPermissionGuard Component

```tsx
import { UdacPermissionGuard } from "@/components/auth/UdacPermissionGuard";

export function AdminPanel() {
  return (
    <UdacPermissionGuard 
      permission="users.view"
      showError={true}
      fallback={<div>Anda tidak memiliki akses</div>}
    >
      <UserManagementPanel />
    </UdacPermissionGuard>
  );
}
```

### 7.3 Menggunakan withUdacPermission HOC

```tsx
import { withUdacPermission } from "@/components/auth/UdacPermissionGuard";

function AdminUsersPage() {
  return <div>Users Management</div>;
}

export default withUdacPermission(AdminUsersPage, 'users.view');
```

---

## 8. Troubleshooting Guide

### Issue 1: Menu tidak muncul meskipun user memiliki izin
**Penyebab**: 
- Permission key tidak sesuai dengan yang di database
- User permissions belum di-load

**Solusi**:
1. Verifikasi permission key di `permissions_list` table
2. Check browser console untuk error
3. Refresh page
4. Clear browser cache

### Issue 2: Override permission tidak bekerja
**Penyebab**:
- Override belum tersimpan di database
- RLS policy tidak mengizinkan read override

**Solusi**:
1. Verifikasi data di `user_permissions` table
2. Check RLS policies di Supabase
3. Verifikasi RPC function `get_user_all_permissions`

### Issue 3: Sidebar tidak update setelah perubahan izin
**Penyebab**:
- Real-time subscription tidak aktif
- Query cache tidak di-invalidate

**Solusi**:
1. Refresh page
2. Check browser console untuk subscription errors
3. Verify Supabase realtime configuration

---

## 9. Performance Considerations

### 9.1 Query Optimization
- `useUdacPermissions` menggunakan staleTime 5 menit
- Permissions di-cache di React Query
- Minimal re-fetches

### 9.2 Rendering Optimization
- `AdminLayout` menggunakan `useMemo` untuk filtered nav groups
- `UdacPermissionGuard` tidak re-render jika permissions tidak berubah

### 9.3 Real-Time Updates
- Realtime subscription untuk `user_permissions` table
- Automatic query invalidation saat ada perubahan

---

## 10. Deployment Checklist

- [ ] Semua migration files sudah di-apply
- [ ] RLS policies aktif di semua tabel
- [ ] RPC functions tersedia dan berfungsi
- [ ] Frontend components terintegrasi dengan UDAC
- [ ] Manual testing selesai
- [ ] No console errors atau warnings
- [ ] Performance acceptable (< 2s load time)
- [ ] Audit logs mencatat semua aktivitas

---

## 11. Kesimpulan

Fase 5 telah menyelesaikan:
✅ Integrasi `useUdacPermissions` di AdminLayout  
✅ Implementasi UdacPermissionGuard component  
✅ User-level override management di AdminUsers  
✅ Comprehensive testing scenarios  
✅ Developer documentation  

**Status**: Ready for Phase 6 (Dokumentasi dan Deployment)
