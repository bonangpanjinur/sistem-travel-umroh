# User Model — Vinstour Travel Portal
> Desain final model user, ownership, dan relasi antar tabel identitas

---

## Model Aktual dari Codebase

### Alur Registrasi (dari Register.tsx & useAuth.tsx)

```
Supabase Auth → auth.users (auth layer)
                    ↓ (trigger: handle_new_user)
                profiles (basic info layer)
                    ↓ (via user_roles table)
            ┌───────────────────────────────┐
            │                               │
         employees                       customers
         (staf internal)            (jamaah / calon jamaah)
                │                          │
            user_roles               customer_accounts
         (role: admin, etc.)        (loyalty, referral, etc.)
                                          │
                                       agents
                                   (agen mitra eksternal)
```

---

## 1. Layer 1: `auth.users` (Supabase Auth)

```
auth.users {
  id UUID PK,
  email TEXT UNIQUE,
  encrypted_password TEXT,
  raw_user_meta_data JSONB { full_name, phone },
  created_at TIMESTAMPTZ,
  ...
}
```

**Tidak dimodifikasi** — ini adalah tabel internal Supabase Auth.  
Akses hanya via `auth.uid()` di RLS atau `auth.users` di SQL dengan SECURITY DEFINER.

---

## 2. Layer 2: `profiles` (Basic Identity)

```sql
profiles {
  id UUID PK → auth.users (CASCADE),   -- SAMA dengan auth.users.id
  email TEXT,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  face_descriptor FLOAT8[],           -- untuk face recognition
  session_version INT DEFAULT 0,      -- untuk invalidasi session
  last_sign_in_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at, updated_at TIMESTAMPTZ
}
```

**Penting:** `profiles.id = auth.users.id` (bukan FK biasa, tapi 1:1 identity).

**Dibuat otomatis** oleh trigger `handle_new_user` saat user baru mendaftar.

**Tidak ada kolom `role`** — semua role disimpan di `user_roles`.

---

## 3. Layer 3a: `user_roles` (RBAC)

```sql
user_roles {
  id UUID PK,
  user_id UUID → auth.users (CASCADE),
  role app_role NOT NULL,
  branch_id UUID → branches (SET NULL),
  is_active BOOLEAN DEFAULT TRUE,
  granted_by UUID → auth.users,
  expires_at TIMESTAMPTZ,
  UNIQUE (user_id, role, branch_id)
}
```

Satu user bisa punya **banyak role** sekaligus:
- `super_admin` tanpa branch
- `branch_manager` di cabang A
- `sales` di cabang B

Frontend `useAuth.tsx` membaca ini:
```typescript
supabase.from('user_roles')
  .select('role, branch_id')
  .eq('user_id', userId)
```

---

## 4. Layer 3b: `employees` (Staf Internal)

```sql
employees {
  id UUID PK,
  user_id UUID → auth.users (SET NULL),  -- link ke auth (opsional)
  branch_id UUID → branches,
  department_id UUID → departments,
  employee_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  email TEXT, phone TEXT,
  position TEXT, employment_type TEXT,
  base_salary NUMERIC,
  npwp TEXT,
  ...
}
```

**Relasi:** Tidak semua employee punya `user_id`. Employee bisa saja tidak memiliki akun login (karyawan lapangan yang tidak pakai sistem).

**Flow:**
```
HR admin buat employee record (tanpa user)
 → jika karyawan perlu login:
    → Buat akun di auth.users (via staff invitation)
    → Link employees.user_id = auth.users.id
    → Buat user_roles (role: operator/finance/dll)
```

---

## 5. Layer 3c: `customers` (Jamaah / Calon Jamaah)

```sql
customers {
  id UUID PK,
  user_id UUID → auth.users (SET NULL),  -- link ke auth (opsional)
  branch_id UUID → branches,
  agent_id UUID → agents,
  customer_code TEXT UNIQUE,
  full_name TEXT NOT NULL,
  nik TEXT, passport_no TEXT,
  ...
}
```

**Relasi:** Tidak semua customer punya `user_id`. Customer bisa didaftarkan oleh staf tanpa akun portal.

**Flow:**
```
1. Staf buat customer secara manual (tanpa akun)
2. Jamaah daftar sendiri via portal:
   → auth.users dibuat
   → profiles dibuat (trigger)
   → user_roles: role 'customer'
   → customer_accounts dibuat (link ke referring agent/branch)
   → customer record dibuat (atau dihubungkan ke yang sudah ada)
```

---

## 6. Layer 3d: `customer_accounts` (Portal Link)

```sql
customer_accounts {
  id UUID PK,
  user_id UUID UNIQUE → auth.users (CASCADE),
  customer_id UUID → customers (SET NULL),
  referred_by_agent_id UUID → agents,
  referred_by_branch_id UUID → branches,
  agent_slug TEXT, branch_slug TEXT,
  loyalty_points INT DEFAULT 0,
  total_bookings INT DEFAULT 0,
  total_spent NUMERIC DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
}
```

Ini adalah **bridge table** antara auth user (customer portal) dan data bisnis customer.

---

## 7. Layer 3e: `agents` (Mitra Eksternal)

```sql
agents {
  id UUID PK,
  user_id UUID → auth.users (SET NULL),
  branch_id UUID → branches,
  parent_agent_id UUID → agents,  -- sub-agent
  agent_type TEXT ('agent','sub_agent'),
  agent_code TEXT UNIQUE,
  slug TEXT UNIQUE,
  company_name TEXT NOT NULL,
  ...
}
```

**Flow:**
```
Admin buat agent record
 → Jika agen perlu akses portal:
    → Buat akun di auth.users
    → Link agents.user_id = auth.users.id
    → Buat user_roles: role 'agent', branch_id = agents.branch_id
```

---

## Model Final yang Direkomendasikan

### Diagram Lengkap

```
auth.users (1)
    │
    ├──── profiles (1:1, CASCADE)
    │         ↑ selalu dibuat via trigger
    │
    ├──── user_roles (1:N)
    │         ├── role: super_admin/owner/it → staf global
    │         ├── role: branch_manager/admin/operational → staf cabang
    │         ├── role: finance/sales/marketing/equipment → staf fungsional
    │         ├── role: agent/sub_agent → mitra eksternal
    │         └── role: customer/jamaah → portal publik
    │
    ├──── employees (1:1 optional, SET NULL)
    │         └── untuk karyawan yang punya akses sistem
    │
    ├──── customers (1:1 optional, SET NULL)
    │         └── untuk jamaah yang daftar sendiri
    │
    ├──── customer_accounts (1:1, CASCADE)
    │         └── bridge: user portal → customer bisnis + loyalty
    │
    └──── agents (1:1 optional, SET NULL)
              └── untuk agen yang punya akses portal
```

### Keputusan Desain

| Aspek | Keputusan | Alasan |
|-------|-----------|--------|
| `profiles.id = auth.users.id` | ✅ Pertahankan | Simpel, tidak perlu join extra |
| `profiles` punya kolom `role`? | ❌ Tidak | Role di `user_roles`, tidak di profiles |
| Employee tanpa akun? | ✅ Diizinkan | user_id nullable, karyawan lapangan |
| Customer tanpa akun? | ✅ Diizinkan | user_id nullable, input manual staf |
| Agent tanpa akun? | ✅ Diizinkan | user_id nullable, agen yang belum aktif |
| Satu user bisa jadi employee + customer? | ⚠️ Possible tapi tidak disarankan | Beda role, beda data |
| Multi-role per user? | ✅ Ya via user_roles | Diperlukan untuk owner + branch_manager |

### Flow Lengkap per Tipe User

#### Admin / Staf
```
1. HR/IT buat undangan (staff_invitations)
2. Karyawan klik link → daftar → auth.users dibuat
3. Trigger → profiles dibuat
4. IT assign user_roles: role='admin', branch_id='...'
5. (Opsional) Link ke employees.user_id
```

#### Agen Mitra
```
1. Admin buat agents record
2. Admin kirim undangan ke email agen
3. Agen daftar → auth.users dibuat → profiles dibuat
4. System assign user_roles: role='agent', branch_id=agents.branch_id
5. agents.user_id = auth.users.id di-update
```

#### Jamaah (Self-Register)
```
1. Jamaah klik link referral (agent_slug atau branch_slug)
2. Daftar → auth.users dibuat → profiles dibuat
3. System buat customer_accounts (dengan referring agent/branch)
4. System buat customers record dasar
5. user_roles: role='customer'
6. Setelah booking confirmed → user_roles tambah: role='jamaah'
```

#### Jamaah (Input Manual Staf)
```
1. Staf buat customers record
2. Tidak ada auth.users untuk jamaah ini
3. Jika jamaah ingin akses portal → self-register dan link via NIK/email
```
