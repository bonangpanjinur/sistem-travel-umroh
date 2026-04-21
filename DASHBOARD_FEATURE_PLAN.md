# Rencana Pengembangan: Role-Based Dashboard Configuration

## Status Fitur Saat Ini
- ✅ Infrastruktur dashboard berbasis role sudah ada
- ✅ Tabel database `dashboard_access_config` sudah dibuat
- ✅ Hook `useDashboardAccess` sudah diimplementasikan
- ✅ Komponen `DashboardAccessManager` sudah dibuat
- ❌ **Integrasi ke halaman Manajemen User belum dilakukan**
- ❌ **Routing dinamis belum sepenuhnya terintegrasi**

## Tujuan Pengembangan
Mengintegrasikan fitur pengaturan dashboard per role ke dalam halaman **Manajemen User** (Pengaturan > Manajemen User) sehingga Super Admin dapat dengan mudah mengatur dashboard mana yang dapat diakses oleh setiap role.

## Rencana Implementasi

### 1. Integrasi ke AdminUsers.tsx
**File**: `src/pages/admin/AdminUsers.tsx`

**Perubahan**:
- Tambahkan tab baru "Pengaturan Dashboard" di halaman Manajemen User
- Integrasikan `DashboardAccessManager` sebagai tab di dalam dialog atau section terpisah
- Alternatif: Tambahkan tombol "Kelola Dashboard" yang membuka modal dengan DashboardAccessManager

**Alasan**: User sudah berada di halaman Manajemen User, jadi lebih intuitif untuk mengatur dashboard di sana daripada di rute terpisah.

### 2. Penyempurnaan DashboardAccessManager.tsx
**File**: `src/pages/admin/DashboardAccessManager.tsx`

**Perubahan**:
- Ubah dari full-page component menjadi reusable component yang bisa diintegrasikan ke AdminUsers
- Tambahkan prop untuk mode (standalone vs embedded)
- Perbaiki styling agar sesuai dengan AdminUsers
- Tambahkan toast notifications untuk feedback

### 3. Update AdminRoutes.tsx
**File**: `src/routes/AdminRoutes.tsx`

**Perubahan**:
- Pertahankan rute `/admin/dashboard-access` untuk akses langsung (backward compatibility)
- Rute ini akan redirect ke `/admin/users` dengan tab "Pengaturan Dashboard" terbuka

### 4. Implementasi Dynamic Route Protection
**File**: `src/routes/AdminRoutes.tsx`

**Perubahan**:
- Wrap dashboard routes dengan `DashboardProtectedRoute`
- Pastikan user hanya bisa akses dashboard yang sudah diaktifkan untuk role mereka

### 5. Update DashboardRedirect.tsx
**File**: `src/pages/admin/DashboardRedirect.tsx`

**Perubahan**:
- Pastikan redirect logic menggunakan `useDashboardRouter` hook
- Redirect user ke default dashboard berdasarkan konfigurasi

## File yang Perlu Dimodifikasi

1. **src/pages/admin/AdminUsers.tsx** - Tambahkan tab/section untuk dashboard settings
2. **src/pages/admin/DashboardAccessManager.tsx** - Buat reusable component
3. **src/routes/AdminRoutes.tsx** - Update routing dan add protection
4. **src/hooks/dashboards/useDashboardRouter.ts** - Pastikan logic sudah benar
5. **src/components/dashboards/DashboardProtectedRoute.tsx** - Pastikan sudah siap digunakan

## Database Schema
Sudah ada di: `src/lib/migrations/dashboard-access-config.sql`

Tabel yang digunakan:
- `dashboard_access_config` - Menyimpan konfigurasi dashboard per role
- `dashboard_access_audit_log` - Audit trail untuk perubahan

## Testing Checklist
- [ ] Super Admin dapat membuka tab "Pengaturan Dashboard" di Manajemen User
- [ ] Super Admin dapat enable/disable dashboard modules untuk setiap role
- [ ] Super Admin dapat set default dashboard untuk setiap role
- [ ] Audit log mencatat setiap perubahan
- [ ] User dengan role yang berbeda hanya bisa akses dashboard yang diaktifkan
- [ ] Redirect ke default dashboard berfungsi dengan benar
- [ ] Backward compatibility: `/admin/dashboard-access` masih bisa diakses

## Timeline
1. Modifikasi AdminUsers.tsx - 30 menit
2. Refactor DashboardAccessManager.tsx - 20 menit
3. Update AdminRoutes.tsx - 20 menit
4. Testing dan perbaikan - 30 menit

**Total: ~2 jam**
