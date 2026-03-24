# RBAC (Role-Based Access Control) Implementation Guide

## Ringkasan Implementasi

Dokumen ini menjelaskan implementasi lengkap sistem pengaturan hak akses (RBAC) yang telah dilakukan pada proyek Umrah & Haji Magic.

## 📋 Daftar File yang Ditambahkan/Diubah

### 1. Hooks (Logika Bisnis)
- **`src/hooks/usePermissions.tsx`** (BARU)
  - Hook untuk mengambil dan cache permissions dari database
  - Real-time subscription ke perubahan permissions
  - Fungsi `hasPermission()` untuk cek akses

- **`src/hooks/usePermissionsRealtime.tsx`** (BARU)
  - Real-time subscription dengan Supabase Realtime
  - Tracking audit logs untuk perubahan permissions
  - Auto-invalidate cache saat ada perubahan

### 2. Komponen
- **`src/components/admin/AdminLayout.tsx`** (DIUBAH)
  - Integrasi `usePermissions` hook
  - Sidebar dinamis berdasarkan permissions database
  - Setiap menu item memiliki `permission` key
  - Filtering otomatis menu yang tidak diizinkan

- **`src/components/auth/PermissionGuard.tsx`** (BARU)
  - Komponen wrapper untuk proteksi rute
  - HOC `withPermissionGuard` untuk wrap halaman
  - Redirect otomatis jika tidak punya akses

### 3. Halaman
- **`src/pages/admin/AdminRolePermissions.tsx`** (DIUBAH)
  - UI/UX yang ditingkatkan dengan bulk actions
  - Tombol ✓/✕ untuk mengaktifkan/menonaktifkan semua
  - Indikator perubahan dengan highlight warna
  - Default permissions untuk setiap role
  - Tips penggunaan interaktif

### 4. Database
- **`supabase/migrations/20240324_create_permissions_list.sql`** (BARU)
  - Tabel `permissions_list` untuk master permissions
  - RLS policies untuk keamanan
  - Audit triggers untuk tracking changes
  - View `user_permissions` untuk query yang lebih mudah

## 🏗️ Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  AdminLayout (Sidebar Dinamis)                          │
│  ├─ usePermissions Hook                                 │
│  │  ├─ Query: user-permissions                          │
│  │  └─ Real-time: role_permissions changes             │
│  └─ Filter menu berdasarkan hasPermission()            │
│                                                           │
│  PermissionGuard (Route Protection)                     │
│  ├─ Check permission sebelum render                     │
│  └─ Redirect jika tidak punya akses                     │
│                                                           │
│  AdminRolePermissions (Matrix UI)                       │
│  ├─ Bulk actions untuk role/fitur                       │
│  ├─ Indikator perubahan                                 │
│  └─ Real-time sync dengan database                      │
│                                                           │
└─────────────────────────────────────────────────────────┘
                          ↓ API
┌─────────────────────────────────────────────────────────┐
│                  Supabase Backend                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Tables:                                                 │
│  ├─ role_permissions (Hak akses per role)              │
│  ├─ permissions_list (Master permissions)               │
│  ├─ user_roles (User ke role mapping)                   │
│  ├─ audit_logs (Tracking changes)                       │
│  └─ profiles (User profile)                             │
│                                                           │
│  Features:                                               │
│  ├─ RLS (Row Level Security)                            │
│  ├─ Realtime Subscriptions                              │
│  ├─ Audit Triggers                                      │
│  └─ Views (user_permissions)                            │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## 🔄 Alur Kerja

### 1. User Login
```
User Login → Fetch Profile → Fetch User Roles → Fetch Permissions
                                                        ↓
                                            Cache di React Query
                                            Subscribe ke Real-time
```

### 2. Sidebar Rendering
```
AdminLayout → usePermissions() → hasPermission() → Filter NAV_GROUPS
                                                        ↓
                                        Render hanya menu yang diizinkan
```

### 3. Route Protection
```
Navigate to /admin/payments → PermissionGuard
                                    ↓
                        Check hasPermission('payments')
                                    ↓
                    ✓ Render Page / ✗ Redirect to /admin
```

### 4. Permission Update
```
Admin ubah permissions → Save ke DB
                            ↓
                    Trigger audit log
                            ↓
                    Broadcast via Realtime
                            ↓
                    Invalidate cache
                            ↓
                    Sidebar auto-update
                    Halaman auto-redirect jika akses dicabut
```

## 📊 Permission Keys

Berikut adalah daftar permission keys yang tersedia:

| Key | Label | Group | Deskripsi |
|-----|-------|-------|-----------|
| dashboard | Dashboard | Overview | Akses halaman dashboard utama |
| analytics | Analytics | Overview | Lihat analitik dan statistik |
| leads | CRM Leads | Sales & CRM | Kelola calon jamaah |
| marketing | Marketing | Sales & CRM | Akses modul marketing |
| packages | Paket | Produk & Operasional | Kelola paket umroh/haji |
| departures | Keberangkatan | Produk & Operasional | Kelola jadwal keberangkatan |
| bookings | Booking | Produk & Operasional | Kelola booking jamaah |
| operational | Operasional | Produk & Operasional | Akses modul operasional |
| payments | Pembayaran | Keuangan & Akuntansi | Kelola verifikasi pembayaran |
| customers | Jamaah | Jamaah & Agent | Lihat data jamaah |
| agents | Agen | Jamaah & Agent | Kelola agen & komisi |
| master_data | Master Data | Master Data | Kelola hotel, maskapai, dll |
| users | Users | Pengaturan | Kelola pengguna & role |
| reports | Laporan | Laporan | Akses laporan & export |
| settings | Pengaturan | Pengaturan | Pengaturan sistem |

## 🛠️ Cara Menggunakan

### 1. Menambahkan Permission Baru

#### Step 1: Tambah ke `PERMISSION_LABELS` di AdminRolePermissions.tsx
```typescript
const PERMISSION_LABELS: Record<string, { label: string; description: string }> = {
  // ... existing
  new_feature: { label: "Fitur Baru", description: "Deskripsi fitur" },
};
```

#### Step 2: Tambah ke menu item di AdminLayout.tsx
```typescript
const NAV_GROUPS = [
  {
    label: 'New Group',
    items: [
      { label: 'New Feature', icon: NewIcon, path: '/admin/new-feature', permission: 'new_feature' },
    ]
  },
];
```

#### Step 3: Insert ke `permissions_list` table
```sql
INSERT INTO permissions_list (key, label, group_name, description, icon_name)
VALUES ('new_feature', 'Fitur Baru', 'New Group', 'Deskripsi fitur', 'IconName');
```

#### Step 4: Insert ke `role_permissions` untuk setiap role
```sql
INSERT INTO role_permissions (role, permission_key, is_enabled)
VALUES ('branch_manager', 'new_feature', true);
```

### 2. Melindungi Halaman dengan PermissionGuard

#### Opsi 1: Wrap komponen
```typescript
import { PermissionGuard } from '@/components/auth/PermissionGuard';

export default function AdminPayments() {
  return (
    <PermissionGuard permission="payments">
      <PaymentsContent />
    </PermissionGuard>
  );
}
```

#### Opsi 2: HOC
```typescript
import { withPermissionGuard } from '@/components/auth/PermissionGuard';

const ProtectedPayments = withPermissionGuard(AdminPayments, 'payments');
```

### 3. Cek Permission di Komponen

```typescript
import { usePermissions } from '@/hooks/usePermissions';

export default function MyComponent() {
  const { hasPermission } = usePermissions();
  
  return (
    <div>
      {hasPermission('payments') && (
        <button>Process Payment</button>
      )}
    </div>
  );
}
```

### 4. Real-time Monitoring

```typescript
import { usePermissionsRealtime, usePermissionAuditLog } from '@/hooks/usePermissionsRealtime';

export default function PermissionMonitor() {
  const { isSubscribed, lastUpdate } = usePermissionsRealtime();
  const { auditLogs } = usePermissionAuditLog();
  
  return (
    <div>
      <p>Status: {isSubscribed ? 'Connected' : 'Disconnected'}</p>
      <p>Last Update: {lastUpdate?.toLocaleString()}</p>
      <ul>
        {auditLogs.map(log => (
          <li key={log.id}>{log.action} on {log.table_name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## 🔐 Keamanan

### 1. Row Level Security (RLS)
- Semua tabel permission dilindungi dengan RLS
- User hanya bisa baca permissions mereka sendiri
- Super Admin dan Owner bisa manage semua permissions

### 2. Audit Logging
- Setiap perubahan permission tercatat di `audit_logs`
- Tracking siapa yang mengubah apa dan kapan
- Berguna untuk compliance dan troubleshooting

### 3. Real-time Validation
- Permissions di-cache dan di-validate di frontend
- Backend juga melakukan validasi di RLS
- Double-layer security untuk mencegah bypass

## 📈 Performance Optimization

### 1. Caching Strategy
- React Query cache dengan stale time 5 menit
- Automatic invalidation saat ada perubahan
- Background refetch untuk data terbaru

### 2. Real-time Subscription
- Efficient filtering dengan `filter` parameter
- Hanya subscribe ke permissions yang relevan
- Auto-cleanup subscription saat unmount

### 3. Lazy Loading
- Menu items di-render hanya yang diizinkan
- Tidak ada DOM bloat untuk menu tersembunyi
- Faster initial render

## 🐛 Troubleshooting

### Sidebar tidak update setelah ubah permissions
1. Cek apakah real-time subscription aktif
2. Refresh halaman untuk force invalidate cache
3. Check browser console untuk error messages

### User tidak bisa akses halaman meskipun punya permission
1. Verify permission di database
2. Check apakah permission key match di AdminLayout.tsx
3. Clear browser cache dan login ulang

### Performance issue saat load permissions
1. Check database query performance
2. Verify index pada `role_permissions` table
3. Consider pagination jika permissions sangat banyak

## 📚 Referensi

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [Supabase Realtime Documentation](https://supabase.com/docs/guides/realtime)
- [React Query Documentation](https://tanstack.com/query/latest)
- [React Router Documentation](https://reactrouter.com/)

## 🚀 Next Steps

### Fase Selanjutnya (Optional)
1. **Granular Permissions**: Tambah permission untuk aksi spesifik (create, read, update, delete)
2. **Permission Groups**: Group permissions untuk management yang lebih mudah
3. **Custom Roles**: Allow user membuat custom roles dengan kombinasi permissions
4. **Permission Analytics**: Dashboard untuk analisis penggunaan permissions
5. **Approval Workflow**: Require approval untuk permission changes tertentu

---

**Last Updated**: 24 March 2026
**Version**: 1.0
**Status**: ✅ Production Ready
