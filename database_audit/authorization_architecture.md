# Authorization Architecture — Vinstour Travel Portal
> Desain final sistem otorisasi: roles, permissions, dan tabel yang dibutuhkan

---

## Kesimpulan Utama

Berdasarkan analisis codebase, sistem otorisasi membutuhkan **semua 6 tabel** yang sudah ada, dengan beberapa perbaikan pada helper functions dan RLS policies.

---

## Tabel yang Diperlukan (dan Alasannya)

### 1. `user_roles` ✅ WAJIB

```sql
user_roles (
  user_id   UUID → auth.users,
  role      app_role NOT NULL,
  branch_id UUID → branches (NULL = global),
  is_active BOOLEAN DEFAULT TRUE,
  granted_by UUID → auth.users,
  expires_at TIMESTAMPTZ,
  UNIQUE (user_id, role, branch_id)
)
```

**Mengapa diperlukan:**
- Satu user bisa punya multiple roles
- Role bisa di-scope ke cabang tertentu
- Perlu audit trail (granted_by, expires_at)
- Frontend `useAuth.tsx` membaca tabel ini untuk session

**Tidak bisa disederhanakan** menjadi kolom tunggal di `profiles` karena multi-role dan branch-scoping.

---

### 2. `permissions_list` ✅ WAJIB

```sql
permissions_list (
  key       TEXT UNIQUE NOT NULL,
  label     TEXT NOT NULL,
  group_name TEXT,
  description TEXT
)
```

**Mengapa diperlukan:**
- Ini adalah registry semua permission yang valid
- Frontend `PERMISSIONS` constant (`permissions.ts`) harus sinkron dengan tabel ini
- Memungkinkan UI RBAC menampilkan daftar permission yang bisa di-assign
- Mencegah typo permission key di role_permissions

**Bisa disederhanakan?** Tidak — tanpa tabel ini, RBAC UI tidak bisa listing permission yang tersedia.

---

### 3. `role_permissions` ✅ WAJIB

```sql
role_permissions (
  role           app_role NOT NULL,
  permission_key TEXT → permissions_list,
  can_view       BOOLEAN DEFAULT FALSE,
  can_create     BOOLEAN DEFAULT FALSE,
  can_edit       BOOLEAN DEFAULT FALSE,
  can_delete     BOOLEAN DEFAULT FALSE,
  UNIQUE (role, permission_key)
)
```

**Mengapa diperlukan:**
- Mendefinisikan default permission untuk setiap role
- Bisa diubah admin tanpa deploy ulang (dynamic RBAC)
- Frontend `useDynamicMenus` hook membaca ini untuk menentukan menu mana yang tampil
- `ProtectedRoute` → `DynamicMenuGate` membaca ini

**Alternatif yang lebih sederhana?** Bisa hardcode di kode, tapi kehilangan kemampuan customisasi tanpa deploy.

---

### 4. `user_permission_overrides` ✅ WAJIB (untuk kasus edge)

```sql
user_permission_overrides (
  user_id        UUID → auth.users,
  permission_key TEXT → permissions_list,
  can_view       BOOLEAN,
  can_create     BOOLEAN,
  can_edit       BOOLEAN,
  can_delete      BOOLEAN,
  reason         TEXT,
  granted_by     UUID,
  expires_at     TIMESTAMPTZ,
  UNIQUE (user_id, permission_key)
)
```

**Mengapa diperlukan:**
- Kasus: operator tertentu perlu approve pembayaran (biasanya hanya finance)
- Kasus: branch_manager tertentu perlu akses laporan global
- Kasus: sementara cabut permission dari user tanpa ganti role
- Frontend `RBACSimulator` sudah mengantisipasi ini

**Bisa dihilangkan?** Bisa, tapi akan kehilangan fleksibilitas untuk edge cases tanpa harus create role baru.

---

### 5. `staff_invitations` ✅ WAJIB

```sql
staff_invitations (
  email     TEXT NOT NULL,
  role      app_role NOT NULL,
  invited_by UUID → auth.users,
  branch_id UUID → branches,
  token     TEXT UNIQUE,
  expires_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ
)
```

**Mengapa diperlukan:**
- Flow onboarding staf tidak bisa tanpa ini
- Token-based invitation (bukan open registration)
- Audit siapa mengundang siapa

---

### 6. `access_policies` ✅ WAJIB (dari Supabase lama)

```sql
access_policies (
  user_id    UUID → auth.users,
  resource   TEXT NOT NULL,     -- 'departure', 'booking', 'report'
  resource_id UUID,             -- NULL = semua resource jenis ini
  action     TEXT NOT NULL,     -- 'view', 'edit', 'export'
  is_allowed BOOLEAN DEFAULT TRUE,
  granted_by UUID,
  expires_at TIMESTAMPTZ
)
```

**Mengapa diperlukan:**
- Level kontrol paling granular (per-resource, bukan per-role)
- Contoh: user tertentu HANYA bisa lihat departure ID X, bukan semua
- Untuk keperluan: auditor eksternal, akses terbatas, whitelist/blacklist

---

## Alur Resolusi Permission

Ketika sistem memverifikasi apakah user bisa melakukan action:

```
1. Cek user_roles → dapatkan semua roles aktif
2. Jika super_admin → IZINKAN semua
3. Cek user_permission_overrides → override spesifik user ini
4. Cek role_permissions untuk setiap role user → gabungkan (OR logic)
5. Cek access_policies → resource-specific override
6. Hasilkan keputusan: IZIN atau TOLAK
```

```typescript
// Pseudo-code resolusi permission
function canUser(userId, permission, action = 'view') {
  const roles = getUserRoles(userId);
  
  if (roles.includes('super_admin')) return true;
  
  // Check personal override first
  const override = getUserPermissionOverride(userId, permission);
  if (override !== null) return override[action];
  
  // Check role permissions (OR: any role that allows = allowed)
  for (const role of roles) {
    const rp = getRolePermission(role, permission);
    if (rp && rp[action]) return true;
  }
  
  return false;
}
```

---

## Helper Functions di Database

### A. Core Permission Helpers

```sql
-- Apakah user punya role ini?
CREATE FUNCTION public.has_role(p_uid UUID, p_role app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_uid AND role = p_role AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Apakah user punya salah satu dari role-role ini?
CREATE FUNCTION public.has_any_role(p_uid UUID, p_roles app_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_uid AND role = ANY(p_roles) AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Apakah user adalah staf internal?
CREATE FUNCTION public.is_staff(p_uid UUID)
RETURNS BOOLEAN AS $$
  SELECT public.has_any_role(p_uid, ARRAY[
    'super_admin','owner','it','admin','branch_manager',
    'finance','operational','operator','sales','marketing','equipment'
  ]::app_role[]);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Apakah user adalah admin atau lebih tinggi?
CREATE FUNCTION public.is_admin_or_above(p_uid UUID)
RETURNS BOOLEAN AS $$
  SELECT public.has_any_role(p_uid, ARRAY[
    'super_admin','owner','it','admin'
  ]::app_role[]);
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### B. Permission Check Helper

```sql
-- Apakah user punya permission ini (dengan override)?
CREATE FUNCTION public.has_permission(
  p_uid UUID,
  p_permission TEXT,
  p_action TEXT DEFAULT 'view'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_roles app_role[];
  v_override RECORD;
  v_rp RECORD;
BEGIN
  -- Super admin bypass
  IF public.has_role(p_uid, 'super_admin'::app_role) THEN
    RETURN TRUE;
  END IF;

  -- Check personal override
  SELECT * INTO v_override FROM user_permission_overrides
  WHERE user_id = p_uid AND permission_key = p_permission
    AND (expires_at IS NULL OR expires_at > NOW());

  IF FOUND THEN
    RETURN CASE p_action
      WHEN 'view'   THEN COALESCE(v_override.can_view, FALSE)
      WHEN 'create' THEN COALESCE(v_override.can_create, FALSE)
      WHEN 'edit'   THEN COALESCE(v_override.can_edit, FALSE)
      WHEN 'delete' THEN COALESCE(v_override.can_delete, FALSE)
      ELSE FALSE
    END;
  END IF;

  -- Check role permissions (OR across all roles)
  SELECT array_agg(role) INTO v_roles
  FROM user_roles
  WHERE user_id = p_uid AND is_active = TRUE;

  FOR v_rp IN
    SELECT * FROM role_permissions rp
    WHERE rp.role = ANY(v_roles) AND rp.permission_key = p_permission
  LOOP
    IF (p_action = 'view'   AND v_rp.can_view)   THEN RETURN TRUE; END IF;
    IF (p_action = 'create' AND v_rp.can_create) THEN RETURN TRUE; END IF;
    IF (p_action = 'edit'   AND v_rp.can_edit)   THEN RETURN TRUE; END IF;
    IF (p_action = 'delete' AND v_rp.can_delete) THEN RETURN TRUE; END IF;
  END LOOP;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;
```

### C. Branch Access Helper

```sql
-- Ambil branch_id aktif user
CREATE FUNCTION public.get_user_branch_id(p_uid UUID)
RETURNS UUID AS $$
  SELECT branch_id FROM user_roles
  WHERE user_id = p_uid AND is_active = TRUE AND branch_id IS NOT NULL
  ORDER BY
    CASE role
      WHEN 'branch_manager' THEN 1
      WHEN 'admin' THEN 2
      WHEN 'operational' THEN 3
      WHEN 'sales' THEN 4
      ELSE 10
    END
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Apakah user punya akses ke branch ini?
CREATE FUNCTION public.can_access_branch(p_uid UUID, p_branch_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    -- Global roles: selalu bisa
    public.has_any_role(p_uid, ARRAY['super_admin','owner','it','finance']::app_role[])
    OR
    -- Staff dengan branch_id NULL: bisa akses semua
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = p_uid AND branch_id IS NULL AND is_active = TRUE
    )
    OR
    -- Staff dengan branch_id cocok
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = p_uid AND branch_id = p_branch_id AND is_active = TRUE
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Apakah user adalah global (tidak terikat cabang)?
CREATE FUNCTION public.has_global_access(p_uid UUID)
RETURNS BOOLEAN AS $$
  SELECT public.has_any_role(p_uid, ARRAY['super_admin','owner','it','finance']::app_role[])
  OR EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = p_uid AND branch_id IS NULL AND is_active = TRUE
      AND role NOT IN ('customer','jamaah','agent','sub_agent')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### D. Role Utility Helpers

```sql
-- Dapatkan primary role (role tertinggi dalam hierarki)
CREATE FUNCTION public.get_user_primary_role(p_uid UUID)
RETURNS app_role AS $$
  SELECT role FROM user_roles
  WHERE user_id = p_uid AND is_active = TRUE
  ORDER BY
    CASE role
      WHEN 'super_admin'   THEN 1
      WHEN 'owner'         THEN 2
      WHEN 'it'            THEN 3
      WHEN 'admin'         THEN 4
      WHEN 'branch_manager' THEN 5
      WHEN 'finance'       THEN 6
      WHEN 'operational'   THEN 7
      WHEN 'sales'         THEN 8
      WHEN 'marketing'     THEN 9
      WHEN 'equipment'     THEN 10
      WHEN 'operator'      THEN 11
      WHEN 'agent'         THEN 12
      WHEN 'sub_agent'     THEN 13
      WHEN 'customer'      THEN 14
      WHEN 'jamaah'        THEN 15
      ELSE 99
    END
  LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Untuk write_audit_log
CREATE FUNCTION public.is_admin_or_above(p_uid UUID)
RETURNS BOOLEAN AS $$
  SELECT public.has_any_role(p_uid, ARRAY['super_admin','owner','it','admin']::app_role[]);
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## Arsitektur Akhir — Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     REQUEST LIFECYCLE                           │
│                                                                 │
│  HTTP Request                                                   │
│       ↓                                                         │
│  JWT Middleware (api-server/lib/auth.ts)                        │
│       ↓ Extract: user_id, roles, branch_id                      │
│  Route Handler                                                  │
│       ↓                                                         │
│  PostgreSQL RLS (27_rls.sql)                                    │
│       ↓ Calls: has_role(), has_permission(), can_access_branch()│
│  Data Layer                                                     │
│       ↓                                                         │
│  Response                                                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND PERMISSION FLOW                      │
│                                                                 │
│  useAuth() → roles, branchId                                    │
│       ↓                                                         │
│  ProtectedRoute                                                 │
│       ↓ isSuperAdmin? → bypass                                  │
│  DynamicMenuGate                                                │
│       ↓ useDynamicMenus() → reads role_permissions from DB     │
│  AdminLayout + Sidebar                                          │
│       ↓ RECOMMENDED_MENUS filtered by user permissions         │
│  Page Component                                                 │
│       ↓ PermissionRoute (permissionKey)                        │
│  UI Elements (buttons show/hide based on can_create, etc.)     │
└─────────────────────────────────────────────────────────────────┘
```

---

## Kesimpulan: Apakah Perlu Semua Tabel?

| Tabel | Perlu? | Alasan |
|-------|--------|--------|
| `user_roles` | ✅ Ya | Multi-role + branch scoping |
| `permissions_list` | ✅ Ya | Registry permission, RBAC UI |
| `role_permissions` | ✅ Ya | Dynamic RBAC tanpa deploy |
| `user_permission_overrides` | ✅ Ya | Edge cases per-user |
| `staff_invitations` | ✅ Ya | Secure onboarding flow |
| `access_policies` | ✅ Ya | Resource-level granularity |

**Tidak perlu disederhanakan.** Semua tabel ini digunakan dan diperlukan untuk sistem RBAC yang scalable.
