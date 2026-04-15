# Universal Dynamic Access Control (UDAC) - Implementation Guide

**Version**: 1.0  
**Last Updated**: 15 April 2026  
**Status**: ✅ Production Ready (Phases 1-4 Complete)

## 📋 Daftar Isi

1. [Pengenalan UDAC](#pengenalan-udac)
2. [Arsitektur Sistem](#arsitektur-sistem)
3. [Komponen Utama](#komponen-utama)
4. [Cara Menggunakan](#cara-menggunakan)
5. [API & Functions](#api--functions)
6. [Contoh Implementasi](#contoh-implementasi)
7. [Troubleshooting](#troubleshooting)

## Pengenalan UDAC

Universal Dynamic Access Control (UDAC) adalah sistem manajemen izin akses yang sangat granular dan dinamis. Setiap fitur, aksi, dan komponen dalam sistem dapat dikelola izin aksesnya secara individual untuk setiap pengguna atau peran.

### Fitur Utama

- ✅ **Otomatisasi Penemuan Izin**: Script discovery secara otomatis mendaftarkan setiap fitur dari kode.
- ✅ **Matriks Izin Multi-Lapis**: User-Level, Role-Based (dengan Hierarki), dan ABAC.
- ✅ **ABAC (Attribute-Based Access Control)**: Keputusan akses berdasarkan atribut pengguna, sumber daya, dan lingkungan.
- ✅ **UI Manajemen Terpadu**: Dashboard untuk mengelola ribuan izin dengan mudah.
- ✅ **Audit & Monitoring**: Pencatatan lengkap setiap akses dan perubahan izin.
- ✅ **Simulasi Akses**: Test keputusan akses sebelum diterapkan.

## Arsitektur Sistem

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  useUdacPermissions Hook                                │
│  ├─ Query: permissions_list + role_permissions         │
│  ├─ Real-time: Realtime subscriptions                  │
│  └─ hasPermission(key) - Check akses                   │
│                                                           │
│  UdacPermissionGuard Component                          │
│  ├─ Proteksi UI berdasarkan izin                       │
│  └─ HOC withUdacPermission untuk halaman               │
│                                                           │
│  Admin Pages                                             │
│  ├─ AdminUdacManagement - Kelola izin per role         │
│  ├─ AdminUdacAudit - Monitor akses & perubahan         │
│  └─ AdminUdacSimulator - Simulasi keputusan akses      │
│                                                           │
└─────────────────────────────────────────────────────────┘
                          ↓ API/RPC
┌─────────────────────────────────────────────────────────┐
│                  Supabase Backend                        │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  Tables:                                                 │
│  ├─ permissions_list - Master izin dengan metadata     │
│  ├─ permission_groups - Grup izin                      │
│  ├─ permission_group_members - Anggota grup            │
│  ├─ role_permissions - Izin per peran                  │
│  ├─ user_permissions - Override per pengguna           │
│  ├─ role_hierarchy - Hierarki peran                    │
│  ├─ access_policies - Kebijakan ABAC                   │
│  └─ audit_logs - Log akses & perubahan                 │
│                                                           │
│  Functions:                                              │
│  ├─ check_permission_v3 - Evaluasi izin multi-lapis    │
│  ├─ evaluate_abac_condition - Evaluasi kondisi ABAC    │
│  └─ get_user_all_permissions - Ambil semua izin user   │
│                                                           │
│  RLS Policies:                                           │
│  └─ Proteksi data berdasarkan role & izin              │
│                                                           │
└─────────────────────────────────────────────────────────┘
```

## Komponen Utama

### 1. Database Schema

#### permissions_list
Master daftar semua izin dalam sistem.

```sql
CREATE TABLE permissions_list (
  key VARCHAR(255) PRIMARY KEY,           -- bookings.view, payments.refund
  label VARCHAR(255) NOT NULL,            -- "Lihat Booking"
  group_name VARCHAR(100),                -- "Booking", "Keuangan"
  description TEXT,                       -- Penjelasan detail
  type VARCHAR(50),                       -- UI_COMPONENT, API_ENDPOINT, ACTION
  resource_identifier VARCHAR(255),       -- bookings, payments
  default_enabled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

#### role_permissions
Pemetaan izin ke peran.

```sql
CREATE TABLE role_permissions (
  role VARCHAR(50),                       -- branch_manager, finance
  permission_key VARCHAR(255),            -- bookings.view
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (role, permission_key)
);
```

#### user_permissions
Override izin untuk pengguna spesifik.

```sql
CREATE TABLE user_permissions (
  user_id UUID,                           -- ID pengguna
  permission_key VARCHAR(255),            -- bookings.view
  is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  PRIMARY KEY (user_id, permission_key)
);
```

#### access_policies (ABAC)
Kebijakan akses berbasis atribut.

```sql
CREATE TABLE access_policies (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  policy_definition JSONB,                -- { "condition": "...", "effect": "permit/deny" }
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Backend Functions

#### check_permission_v3
Fungsi utama untuk evaluasi izin dengan dukungan multi-lapis.

```sql
check_permission_v3(
  _user_id UUID,
  _permission_key TEXT,
  _resource_attrs JSONB DEFAULT '{}'
) RETURNS BOOLEAN
```

**Alur Evaluasi**:
1. Check super_admin/owner (bypass semua)
2. Check user-level override (tertinggi prioritas)
3. Check ABAC policies
4. Check role-based permissions (dengan hierarki)
5. Default deny

### 3. Frontend Hooks

#### useUdacPermissions
Hook untuk mengambil dan mengelola izin.

```typescript
const { 
  permissions,                    // Array semua izin user
  isLoading,                      // Status loading
  hasPermission,                  // (key: string) => boolean
  getPermissionsByGroup,          // (group: string) => Permission[]
  getPermissionsByResource,       // (resource: string) => Permission[]
  refetch                         // () => void
} = useUdacPermissions();
```

### 4. Frontend Components

#### UdacPermissionGuard
Wrapper untuk melindungi UI berdasarkan izin.

```typescript
<UdacPermissionGuard 
  permission="bookings.delete"
  fallback={<p>Akses Ditolak</p>}
  showError={true}
>
  <Button>Hapus Booking</Button>
</UdacPermissionGuard>
```

#### withUdacPermission (HOC)
HOC untuk melindungi halaman.

```typescript
const ProtectedPage = withUdacPermission(MyPage, 'admin.settings.view');
```

## Cara Menggunakan

### 1. Menambahkan Izin Baru

#### Step 1: Tandai di Kode
```typescript
// @withPermission('bookings.approve', { 
//   label: 'Setujui Booking', 
//   group: 'Booking', 
//   description: 'Menyetujui booking yang pending',
//   type: 'ACTION',
//   resource: 'bookings'
// })
function ApproveBookingButton() { ... }
```

#### Step 2: Jalankan Discovery Script
```bash
npm run discover:permissions
```

Ini akan menghasilkan file SQL migrasi otomatis.

#### Step 3: Deploy Migrasi
```bash
supabase migration up
```

#### Step 4: Assign ke Roles (Optional)
```sql
INSERT INTO role_permissions (role, permission_key, is_enabled)
VALUES ('branch_manager', 'bookings.approve', true);
```

### 2. Melindungi UI

```typescript
import { UdacPermissionGuard } from "@/components/auth/UdacPermissionGuard";

export function BookingActions() {
  return (
    <div className="flex gap-2">
      <UdacPermissionGuard permission="bookings.edit">
        <Button>Edit</Button>
      </UdacPermissionGuard>
      
      <UdacPermissionGuard permission="bookings.delete">
        <Button variant="destructive">Hapus</Button>
      </UdacPermissionGuard>
    </div>
  );
}
```

### 3. Cek Izin di Logika

```typescript
import { useUdacPermissions } from "@/hooks/useUdacPermissions";

export function PaymentVerification() {
  const { hasPermission } = useUdacPermissions();
  
  if (!hasPermission('payments.verify')) {
    return <p>Anda tidak memiliki izin untuk verifikasi pembayaran</p>;
  }
  
  return <VerificationForm />;
}
```

### 4. Melindungi Halaman

```typescript
import { withUdacPermission } from "@/components/auth/UdacPermissionGuard";

function AdminSettings() {
  return <div>Pengaturan Admin</div>;
}

export default withUdacPermission(AdminSettings, 'settings.manage');
```

## API & Functions

### RPC Functions (Supabase)

#### check_permission_v3
```typescript
const { data, error } = await supabase.rpc('check_permission_v3', {
  _user_id: userId,
  _permission_key: 'bookings.view',
  _resource_attrs: { branch_id: 'branch-123' }
});
```

#### get_user_all_permissions
```typescript
const { data, error } = await supabase.rpc('get_user_all_permissions', {
  _user_id: userId
});
```

## Contoh Implementasi

### Contoh 1: Dashboard dengan Fitur Dinamis

```typescript
import { useUdacPermissions } from "@/hooks/useUdacPermissions";

export function AdminDashboard() {
  const { getPermissionsByGroup } = useUdacPermissions();
  
  const bookingPerms = getPermissionsByGroup('Booking');
  const paymentPerms = getPermissionsByGroup('Keuangan');
  
  return (
    <div className="grid grid-cols-3 gap-4">
      {bookingPerms.length > 0 && <BookingWidget />}
      {paymentPerms.length > 0 && <PaymentWidget />}
    </div>
  );
}
```

### Contoh 2: Simulasi Akses

Kunjungi `/admin/udac/simulator` untuk test keputusan akses.

### Contoh 3: Monitor Audit

Kunjungi `/admin/udac/audit` untuk melihat log akses dan perubahan izin.

## Troubleshooting

### Izin tidak muncul di UI
1. Pastikan izin sudah ada di `permissions_list`
2. Cek apakah user memiliki role yang sesuai
3. Refresh halaman atau clear cache browser
4. Check browser console untuk error

### Simulasi menunjukkan akses ditolak padahal seharusnya diberikan
1. Cek `user_permissions` untuk override
2. Cek `role_permissions` untuk role user
3. Cek `role_hierarchy` untuk peran yang diwarisi
4. Cek `access_policies` untuk ABAC yang mungkin menolak

### Performance issue
1. Pastikan index sudah dibuat di `role_permissions` dan `user_permissions`
2. Limit jumlah ABAC policies yang aktif
3. Gunakan pagination untuk audit logs

## 🚀 Next Steps

- Implementasi approval workflows untuk perubahan izin sensitif
- Delegasi administrasi untuk administrator non-super admin
- Dashboard analytics untuk penggunaan izin
- Export/Import konfigurasi izin

---

**Untuk pertanyaan atau kontribusi, silakan hubungi tim development.**
