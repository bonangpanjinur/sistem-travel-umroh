# Panduan Developer: Implementasi RBAC
**Versi**: 1.0  
**Tanggal**: 16 April 2026

---

## 1. Arsitektur Sistem RBAC

### 1.1 Model User-Centric Architecture (UDAC)

Sistem RBAC menggunakan model **User-Centric** di mana `user_permissions` adalah sumber kebenaran tunggal:

```
┌─────────────────────────────────────────────────────────┐
│ Frontend Component / API Request                        │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ Permission Check             │
        │ (useUdacPermissions hook)    │
        └──────────────┬───────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ get_user_effective_permission│
        │ RPC Function                 │
        └──────────────┬───────────────┘
                       │
        ┌──────────────┴──────────────┐
        │                             │
        ▼                             ▼
    Is Super   Check user_permissions
    Admin?     (Source of Truth)
        │                             │
        └──────────────┬──────────────┘
                       │
                       ▼
        ┌──────────────────────────────┐
        │ Return Permission Result     │
        │ (true/false)                 │
        └──────────────────────────────┘
```

### 1.2 Data Flow

**Saat User Diberikan Role:**

```
1. Admin klik "Assign Role"
   ↓
2. Frontend call RPC: assign_role_to_user(_user_id, _role_name)
   ↓
3. RPC:
   - Insert ke user_roles (jika belum ada)
   - Copy permissions dari role_permissions ke user_permissions
   ↓
4. Trigger: audit_role_assignment mencatat perubahan
   ↓
5. Frontend invalidate cache & refetch permissions
   ↓
6. User mendapat akses sesuai izin yang disalin
```

**Saat Admin Memberikan Izin Individual:**

```
1. Admin toggle checkbox izin
   ↓
2. Frontend call RPC: grant_user_permission(_user_id, _permission_key)
   ↓
3. RPC:
   - Upsert ke user_permissions dengan is_enabled = true
   ↓
4. Frontend invalidate cache
   ↓
5. User mendapat akses ke izin tersebut
```

---

## 2. Database Schema

### 2.1 Tabel Utama

#### `auth.users` (Supabase)
```sql
-- Tabel bawaan Supabase untuk autentikasi
id UUID PRIMARY KEY
email VARCHAR
encrypted_password VARCHAR
email_confirmed_at TIMESTAMP
created_at TIMESTAMP
```

#### `public.profiles`
```sql
CREATE TABLE profiles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR,
  phone VARCHAR,
  created_at TIMESTAMP DEFAULT now()
);
```

#### `public.user_roles`
```sql
CREATE TABLE user_roles (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(100) NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, role)
);
```

#### `public.role_permissions` (Template)
```sql
CREATE TABLE role_permissions (
  id BIGSERIAL PRIMARY KEY,
  role VARCHAR(100) NOT NULL,
  permission_key VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE(role, permission_key)
);
```

#### `public.user_permissions` (Source of Truth)
```sql
CREATE TABLE user_permissions (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key VARCHAR(100) NOT NULL,
  is_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, permission_key)
);
```

#### `public.permissions_list` (Master Data)
```sql
CREATE TABLE permissions_list (
  id BIGSERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  label VARCHAR(255) NOT NULL,
  group_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT now()
);
```

#### `public.role_assignment_audit` (Audit Trail)
```sql
CREATE TABLE role_assignment_audit (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_name VARCHAR(100) NOT NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('ASSIGNED', 'REMOVED')),
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 3. RPC Functions

### 3.1 Permission Check Functions

#### `get_user_effective_permission(_user_id UUID, _permission_key VARCHAR)`

**Deskripsi**: Memeriksa apakah user memiliki izin tertentu

**Logic**:
1. Jika user adalah super_admin → return TRUE
2. Jika ada entry di user_permissions dengan permission_key → return is_enabled
3. Jika tidak ada → return FALSE

**Penggunaan**:
```sql
SELECT public.get_user_effective_permission(
  'user-uuid-here',
  'bookings.view_all'
) AS has_permission;
```

#### `get_user_all_permissions(_user_id UUID)`

**Deskripsi**: Mengambil semua izin user dengan metadata

**Return Columns**:
- `permission_key`: Kode izin
- `label`: Label izin
- `group_name`: Kategori izin
- `is_enabled`: Status izin
- `source`: Sumber (selalu 'user')

**Penggunaan**:
```sql
SELECT * FROM public.get_user_all_permissions('user-uuid-here');
```

### 3.2 Role Management Functions

#### `assign_role_to_user(_user_id UUID, _role_name VARCHAR)`

**Deskripsi**: Memberikan role ke user dan menyalin izin template

**Return Columns**:
- `success`: Boolean
- `message`: Pesan hasil
- `permissions_copied`: Jumlah izin yang disalin

**Penggunaan**:
```sql
SELECT * FROM public.assign_role_to_user(
  'user-uuid-here',
  'finance'
);
```

**Behavior**:
- Jika role sudah diberikan → skip insert, tetap copy permissions
- Permissions dari role_permissions di-copy ke user_permissions
- Jika ada conflict → update dengan nilai dari role_permissions

#### `remove_role_from_user(_user_id UUID, _role_name VARCHAR)`

**Deskripsi**: Menghapus role dari user

**Return Columns**:
- `success`: Boolean
- `message`: Pesan hasil

**Penggunaan**:
```sql
SELECT * FROM public.remove_role_from_user(
  'user-uuid-here',
  'finance'
);
```

**Catatan**: Izin individual di user_permissions TIDAK dihapus otomatis

#### `reset_user_permissions_to_role_defaults(_user_id UUID)`

**Deskripsi**: Mereset semua izin user ke default berdasarkan role yang dimiliki

**Return Columns**:
- `success`: Boolean
- `message`: Pesan hasil
- `permissions_reset`: Jumlah izin yang direset

**Penggunaan**:
```sql
SELECT * FROM public.reset_user_permissions_to_role_defaults('user-uuid-here');
```

**Behavior**:
- Delete semua entry di user_permissions untuk user
- Copy permissions dari semua role yang dimiliki user
- Jika multiple roles → union dari semua permissions

### 3.3 Permission Management Functions

#### `grant_user_permission(_user_id UUID, _permission_key VARCHAR)`

**Deskripsi**: Memberikan izin individual kepada user

**Return Columns**:
- `success`: Boolean
- `message`: Pesan hasil

**Penggunaan**:
```sql
SELECT * FROM public.grant_user_permission(
  'user-uuid-here',
  'bookings.approve'
);
```

**Behavior**:
- Upsert ke user_permissions dengan is_enabled = true
- Jika sudah ada → update is_enabled menjadi true

#### `revoke_user_permission(_user_id UUID, _permission_key VARCHAR)`

**Deskripsi**: Mencabut izin individual dari user

**Return Columns**:
- `success`: Boolean
- `message`: Pesan hasil

**Penggunaan**:
```sql
SELECT * FROM public.revoke_user_permission(
  'user-uuid-here',
  'payments.refund'
);
```

**Behavior**:
- Update user_permissions dengan is_enabled = false
- Jika tidak ada entry → insert dengan is_enabled = false

---

## 4. Frontend Integration

### 4.1 Permission Hook: `useUdacPermissions`

**Penggunaan**:
```typescript
import { useUdacPermissions } from '@/hooks/useUdacPermissions';

function MyComponent() {
  const { 
    permissions, 
    isLoading, 
    hasPermission, 
    hasAllPermissions,
    hasAnyPermission,
    getPermissionsByGroup,
    getEnabledPermissions,
    getDisabledPermissions
  } = useUdacPermissions();

  if (isLoading) return <div>Loading...</div>;

  return (
    <>
      {hasPermission('bookings.view_all') && (
        <div>Anda bisa lihat semua booking</div>
      )}
      
      {hasAllPermissions(['bookings.view_all', 'bookings.approve']) && (
        <div>Anda bisa lihat dan approve booking</div>
      )}
      
      {hasAnyPermission(['payments.verify', 'payments.refund']) && (
        <div>Anda punya akses ke payment management</div>
      )}
    </>
  );
}
```

**Methods**:

| Method | Deskripsi | Return |
|--------|-----------|--------|
| `hasPermission(key)` | Cek satu izin | Boolean |
| `hasAllPermissions(keys)` | Cek semua izin | Boolean |
| `hasAnyPermission(keys)` | Cek salah satu izin | Boolean |
| `getPermissionsByGroup(name)` | Ambil izin per grup | Permission[] |
| `getEnabledPermissions()` | Ambil izin yang aktif | Permission[] |
| `getDisabledPermissions()` | Ambil izin yang tidak aktif | Permission[] |

### 4.2 Role Management Hook: `useUserRoleManagement`

**Penggunaan**:
```typescript
import { useUserRoleManagement } from '@/hooks/useUserRoleManagement';

function UserRoleManager({ userId }) {
  const {
    userRoles,
    isLoadingRoles,
    assignRole,
    removeRole,
    resetPermissions,
    isAssigningRole,
    isRemovingRole,
    isResettingPermissions
  } = useUserRoleManagement(userId);

  return (
    <>
      <button 
        onClick={() => assignRole('finance')}
        disabled={isAssigningRole}
      >
        Assign Finance Role
      </button>

      <button 
        onClick={() => removeRole('finance')}
        disabled={isRemovingRole}
      >
        Remove Finance Role
      </button>

      <button 
        onClick={() => resetPermissions()}
        disabled={isResettingPermissions}
      >
        Reset Permissions
      </button>
    </>
  );
}
```

### 4.3 Permission Control Hook: `useUserPermissionControl`

**Penggunaan**:
```typescript
import { useUserPermissionControl } from '@/hooks/useUserRoleManagement';

function PermissionToggle({ userId }) {
  const {
    grantPermission,
    revokePermission,
    isGranting,
    isRevoking
  } = useUserPermissionControl(userId);

  return (
    <>
      <button 
        onClick={() => grantPermission('bookings.approve')}
        disabled={isGranting}
      >
        Grant Approve Permission
      </button>

      <button 
        onClick={() => revokePermission('bookings.approve')}
        disabled={isRevoking}
      >
        Revoke Approve Permission
      </button>
    </>
  );
}
```

### 4.4 Permission Guard Component

**Penggunaan**:
```typescript
import { UdacPermissionGuard } from '@/components/auth/UdacPermissionGuard';

function AdminPanel() {
  return (
    <UdacPermissionGuard permission="users.edit">
      <div>Admin Panel - Hanya bisa dilihat jika punya izin users.edit</div>
    </UdacPermissionGuard>
  );
}

// Atau dengan HOC
const ProtectedComponent = withUdacPermission(
  MyComponent,
  'users.edit',
  true // show error alert
);
```

---

## 5. Adding New Permissions

### 5.1 Langkah-langkah Menambah Permission Baru

**1. Tambahkan ke `permissions_list`**:
```sql
INSERT INTO public.permissions_list (key, label, group_name, description)
VALUES (
  'bookings.bulk_approve',
  'Bulk Approve Booking',
  'Booking & Jamaah',
  'Menyetujui multiple booking sekaligus'
);
```

**2. Tambahkan ke `role_permissions` untuk role yang relevan**:
```sql
INSERT INTO public.role_permissions (role, permission_key, is_enabled)
VALUES ('branch_manager', 'bookings.bulk_approve', true);
```

**3. Update frontend AdminRolePermissionsEnhanced.tsx**:
```typescript
const PERMISSION_GROUPS: Record<string, PermissionGroup> = {
  bookings: {
    label: "Booking & Jamaah",
    permissions: [
      // ... existing permissions
      { 
        key: 'bookings.bulk_approve', 
        label: 'Bulk Approve Booking',
        description: 'Menyetujui multiple booking sekaligus'
      },
    ]
  },
};
```

**4. Gunakan di komponen**:
```typescript
import { useUdacPermissions } from '@/hooks/useUdacPermissions';

function BookingList() {
  const { hasPermission } = useUdacPermissions();

  return (
    <>
      {hasPermission('bookings.bulk_approve') && (
        <button>Bulk Approve</button>
      )}
    </>
  );
}
```

---

## 6. Adding New Roles

### 6.1 Langkah-langkah Menambah Role Baru

**1. Update enum di database** (jika menggunakan enum):
```sql
ALTER TYPE app_role ADD VALUE 'new_role' BEFORE 'customer';
```

**2. Tambahkan ke `role_permissions`**:
```sql
INSERT INTO public.role_permissions (role, permission_key, is_enabled)
VALUES 
  ('new_role', 'bookings.view_all', true),
  ('new_role', 'bookings.create', true),
  ('new_role', 'bookings.edit', true),
  -- ... more permissions
;
```

**3. Update frontend type definitions**:
```typescript
// src/types/database.ts
export type AppRole = 
  | 'super_admin'
  | 'owner'
  | 'branch_manager'
  | 'finance'
  | 'operational'
  | 'sales'
  | 'marketing'
  | 'equipment'
  | 'agent'
  | 'new_role'  // Add here
  | 'customer';
```

**4. Update ROLE_LABELS dan ROLE_COLORS**:
```typescript
const ROLE_LABELS: Record<AppRole, string> = {
  // ... existing roles
  new_role: "New Role",
};

const ROLE_COLORS: Record<AppRole, string> = {
  // ... existing roles
  new_role: "bg-teal-100 text-teal-800 border-teal-200",
};
```

---

## 7. Testing

### 7.1 Unit Test untuk RPC Functions

**Contoh dengan Jest**:
```typescript
describe('RBAC RPC Functions', () => {
  describe('assign_role_to_user', () => {
    it('should assign role and copy permissions', async () => {
      const { data, error } = await supabase.rpc('assign_role_to_user', {
        _user_id: testUserId,
        _role_name: 'finance'
      });

      expect(error).toBeNull();
      expect(data[0].success).toBe(true);
      expect(data[0].permissions_copied).toBeGreaterThan(0);
    });

    it('should not duplicate role if already assigned', async () => {
      // First assignment
      await supabase.rpc('assign_role_to_user', {
        _user_id: testUserId,
        _role_name: 'finance'
      });

      // Second assignment
      const { data, error } = await supabase.rpc('assign_role_to_user', {
        _user_id: testUserId,
        _role_name: 'finance'
      });

      expect(error).toBeNull();
      expect(data[0].success).toBe(true);
    });
  });

  describe('grant_user_permission', () => {
    it('should grant permission to user', async () => {
      const { data, error } = await supabase.rpc('grant_user_permission', {
        _user_id: testUserId,
        _permission_key: 'bookings.approve'
      });

      expect(error).toBeNull();
      expect(data[0].success).toBe(true);
    });
  });

  describe('get_user_effective_permission', () => {
    it('should return true for super_admin', async () => {
      const result = await supabase.rpc('get_user_effective_permission', {
        _user_id: superAdminUserId,
        _permission_key: 'any.permission'
      });

      expect(result).toBe(true);
    });

    it('should return permission status from user_permissions', async () => {
      // Grant permission
      await supabase.rpc('grant_user_permission', {
        _user_id: testUserId,
        _permission_key: 'bookings.view_all'
      });

      const result = await supabase.rpc('get_user_effective_permission', {
        _user_id: testUserId,
        _permission_key: 'bookings.view_all'
      });

      expect(result).toBe(true);
    });
  });
});
```

### 7.2 Integration Test untuk Permission Flow

```typescript
describe('RBAC Permission Flow', () => {
  it('should grant permission through role assignment', async () => {
    // 1. Assign role
    await supabase.rpc('assign_role_to_user', {
      _user_id: testUserId,
      _role_name: 'finance'
    });

    // 2. Check if user has permission from role
    const hasPermission = await supabase.rpc('get_user_effective_permission', {
      _user_id: testUserId,
      _permission_key: 'payments.verify'
    });

    expect(hasPermission).toBe(true);

    // 3. Revoke permission
    await supabase.rpc('revoke_user_permission', {
      _user_id: testUserId,
      _permission_key: 'payments.verify'
    });

    // 4. Verify permission is revoked
    const hasPermissionAfter = await supabase.rpc('get_user_effective_permission', {
      _user_id: testUserId,
      _permission_key: 'payments.verify'
    });

    expect(hasPermissionAfter).toBe(false);
  });
});
```

---

## 8. Performance Optimization

### 8.1 Indexes

Pastikan indexes ada untuk query performance:

```sql
-- Indexes for user_roles
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_role ON public.user_roles(role);

-- Indexes for user_permissions
CREATE INDEX idx_user_permissions_user_id ON public.user_permissions(user_id);
CREATE INDEX idx_user_permissions_permission_key ON public.user_permissions(permission_key);

-- Indexes for role_permissions
CREATE INDEX idx_role_permissions_role ON public.role_permissions(role);
CREATE INDEX idx_role_permissions_permission_key ON public.role_permissions(permission_key);

-- Indexes for audit trail
CREATE INDEX idx_role_assignment_audit_user ON public.role_assignment_audit(user_id);
CREATE INDEX idx_role_assignment_audit_role ON public.role_assignment_audit(role_name);
```

### 8.2 Caching Strategy

Frontend menggunakan React Query untuk caching:

```typescript
// Cache invalidation saat ada perubahan
queryClient.invalidateQueries({ queryKey: ["udac-permissions", userId] });
queryClient.invalidateQueries({ queryKey: ["user-roles", userId] });
queryClient.invalidateQueries({ queryKey: ["user-permissions-override", userId] });
```

### 8.3 Real-time Sync

Gunakan Supabase Realtime untuk sync otomatis:

```typescript
const channel = supabase
  .channel('public:user_permissions_changes')
  .on('postgres_changes', { 
    event: '*', 
    schema: 'public', 
    table: 'user_permissions',
    filter: `user_id=eq.${user.id}`
  }, () => {
    queryClient.invalidateQueries({ queryKey: ["udac-permissions", user.id] });
  })
  .subscribe();
```

---

## 9. Security Considerations

### 9.1 RLS Policies

Semua tabel permission harus memiliki RLS:

```sql
-- Only super_admin can modify role_permissions
CREATE POLICY "Super Admins can manage role permissions" 
ON public.role_permissions 
FOR ALL 
USING (public.is_super_admin(auth.uid()));

-- Only super_admin can modify user_permissions
CREATE POLICY "Super Admins can manage user permissions" 
ON public.user_permissions 
FOR ALL 
USING (public.is_super_admin(auth.uid()));
```

### 9.2 Audit Logging

Semua perubahan role harus dicatat:

```sql
CREATE TRIGGER trigger_audit_role_assignment
AFTER INSERT OR DELETE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.audit_role_assignment();
```

### 9.3 Super Admin Bypass

Super admin harus bypass semua checks:

```typescript
const isSuperAdmin = roles.includes('super_admin');
if (isSuperAdmin) return true; // Bypass all permission checks
```

---

## 10. Troubleshooting

### Issue: Permission tidak ter-update di frontend

**Solusi**:
1. Check cache invalidation di hook
2. Verify real-time subscription aktif
3. Minta user logout/login untuk refresh

### Issue: RPC function returns error

**Solusi**:
1. Check user exists di auth.users
2. Check role/permission exists di database
3. Check RLS policies allow access
4. Check function permissions (GRANT EXECUTE)

### Issue: Super admin tidak bisa akses fitur

**Solusi**:
1. Verify user memiliki role 'super_admin' di user_roles
2. Check is_super_admin() function returns true
3. Check RLS policies allow super_admin bypass

---

## 11. Referensi

- **Database Schema**: `/supabase/migrations/20260419000000_simplify_permission_resolution.sql`
- **Frontend Hooks**: `/src/hooks/useUserRoleManagement.tsx`, `/src/hooks/useUdacPermissions.tsx`
- **Components**: `/src/pages/admin/AdminUsers.tsx`, `/src/components/admin/UserPermissionsManagerEnhanced.tsx`
- **Types**: `/src/types/database.ts`

---

**Versi**: 1.0  
**Last Updated**: 16 April 2026  
**Prepared by**: Manus AI
