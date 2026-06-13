# Branch Access Model — Vinstour Travel Portal
> Desain final multi-cabang berdasarkan analisis codebase aktual

---

## 1. Apakah User Bisa Berada di Banyak Cabang?

**Jawaban: Ya, secara teknis — tetapi tidak umum dalam praktik.**

Tabel `user_roles` memiliki kolom `branch_id` yang nullable:
```sql
user_roles (
  user_id UUID,
  role    app_role,
  branch_id UUID NULLABLE,  -- NULL = global access
  UNIQUE (user_id, role, branch_id)
)
```

Secara teknis, seorang user bisa memiliki:
```
user_id = X → role: branch_manager, branch_id: cabang-jakarta
user_id = X → role: sales,          branch_id: cabang-bandung
```

Namun `useAuth.tsx` hanya mengambil **satu** `branchId` dari semua role:
```typescript
const orderedBranchId =
  userRoles
    .map((r) => rolesRes.data.find((row) => row.role === r && row.branch_id)?.branch_id)
    .find((b): b is string => !!b) || null;
setBranchId(orderedBranchId);
```

Ini mengambil branch dari role pertama (sesuai prioritas sortRoles). Artinya user multi-cabang hanya akan mendapat satu `branchId` aktif per session.

**Rekomendasi:** Jika user perlu akses multi-cabang (misal: owner yang bisa switch cabang), implementasikan branch selector UI + simpan pilihan di sessionStorage.

---

## 2. Apakah Role Berlaku Global atau Per Cabang?

**Jawaban: Bergantung pada role.**

| Role | Berlaku | branch_id di user_roles |
|------|---------|------------------------|
| super_admin | Global | NULL |
| owner | Global | NULL |
| it | Global | NULL |
| finance | Global (semua cabang) | NULL |
| admin | Global atau per cabang | NULL atau diisi |
| branch_manager | **Per cabang** (WAJIB) | Harus diisi |
| operational | Per cabang | Opsional |
| sales | Per cabang | Opsional |
| marketing | Per cabang | Opsional |
| equipment | Per cabang | Opsional |
| operator | Per cabang | Opsional |
| agent | Cabang induk agen | Dari `agents.branch_id` |

**Model yang direkomendasikan:**

```
NULL branch_id = akses global (semua cabang)
non-NULL branch_id = akses terbatas ke cabang tersebut
```

---

## 3. Apakah branch_manager Hanya Melihat Cabangnya Sendiri?

**Jawaban: Ya, seharusnya — tapi implementasi saat ini masih campuran.**

### Implementasi saat ini:
- **Frontend:** `BranchManagerDashboard.tsx` menggunakan `branchId` dari `useAuth()` sebagai filter
- **API:** Beberapa endpoint filter by `branch_id` dari JWT
- **RLS:** Belum sepenuhnya enforce di DB level untuk branch_manager

### Yang perlu ditambahkan di RLS:
```sql
-- Policy untuk branch_manager (data harus difilter branch)
CREATE POLICY "branch_manager_bookings"
  ON public.bookings FOR SELECT
  USING (
    public.has_role(auth.uid(), 'branch_manager'::public.app_role)
    AND branch_id = (
      SELECT ur.branch_id FROM public.user_roles ur
      WHERE ur.user_id = auth.uid()
        AND ur.role = 'branch_manager'
        AND ur.is_active = TRUE
      LIMIT 1
    )
  );
```

### Helper function yang diperlukan:
```sql
CREATE OR REPLACE FUNCTION public.get_user_branch_id(p_user_id UUID)
RETURNS UUID AS $$
  SELECT branch_id FROM user_roles
  WHERE user_id = p_user_id AND is_active = TRUE
    AND branch_id IS NOT NULL
  ORDER BY
    CASE role
      WHEN 'branch_manager' THEN 1
      WHEN 'operational' THEN 2
      WHEN 'sales' THEN 3
      ELSE 10
    END
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

---

## 4. Apakah Finance Melihat Semua Cabang?

**Jawaban: Ya, finance memiliki akses global lintas cabang.**

Dari codebase:
- `finance` tidak memiliki `branch_id` di `user_roles`
- Laporan keuangan menampilkan data semua cabang (ada filter cabang opsional)
- `BranchManagerDashboard` pun hanya diakses oleh `branch_manager`, bukan finance

**Model yang direkomendasikan:**
- `finance` selalu mendapat `branch_id = NULL` → query tidak difilter cabang
- Filter cabang opsional bisa ditambahkan via UI dropdown untuk laporan

---

## 5. Apakah Sales Bisa Lintas Cabang?

**Jawaban: Bergantung pada konfigurasi. Default: per cabang.**

Saat ini `sales` bisa mendapat `branch_id` diisi (per cabang) atau NULL (global).

**Rekomendasi:**
- Sales internal kantor pusat → `branch_id = NULL`
- Sales di cabang spesifik → `branch_id = {cabang_id}`
- Data difilter otomatis berdasarkan `branchId` dari JWT

---

## 6. Apakah Agent Terikat Cabang?

**Jawaban: Ya, agen terikat ke satu cabang (atau tanpa cabang = bebas).**

```sql
agents (
  branch_id UUID → branches  -- agen induk cabang
  parent_agent_id UUID → agents  -- untuk sub-agen
)
```

Agen yang tidak punya `branch_id` adalah agen independen (langsung ke kantor pusat).

Sub-agen mengikuti branch dari agen induknya.

---

## Rekomendasi Model Final

### A. Tabel `user_roles` — Struktur Tetap

```sql
user_roles (
  id UUID PK,
  user_id UUID → auth.users (CASCADE),
  role app_role NOT NULL,
  branch_id UUID → branches (SET NULL),  -- NULL = global
  is_active BOOLEAN DEFAULT TRUE,
  granted_by UUID → auth.users,
  granted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  UNIQUE (user_id, role, branch_id)  -- NULL dianggap unik per user+role
)
```

### B. Peta Global vs Branch-Scoped

```
GLOBAL (branch_id = NULL):
  super_admin, owner, it, finance

BRANCH-SCOPED (branch_id = wajib diisi):
  branch_manager

FLEXIBLE (branch_id opsional):
  admin, operational, sales, marketing, equipment, operator

EXTERNAL (branch via tabel agen):
  agent → dari agents.branch_id
  sub_agent → dari parent agents.branch_id
```

### C. Helper Functions di DB (untuk RLS)

```sql
-- Apakah user punya global access?
public.has_global_access(p_user_id UUID) → BOOLEAN

-- Ambil branch_id aktif user
public.get_user_branch_id(p_user_id UUID) → UUID

-- Apakah user bisa akses data branch ini?
public.can_access_branch(p_user_id UUID, p_branch_id UUID) → BOOLEAN
```

### D. Pola RLS yang Direkomendasikan

```sql
-- Pattern 1: Global roles bypass branch check
CREATE POLICY "booking_branch_access"
  ON public.bookings FOR SELECT
  USING (
    -- Global access roles
    public.has_any_role(auth.uid(), ARRAY['super_admin','owner','it','finance']::app_role[])
    OR
    -- Branch-scoped roles dapat data branch sendiri
    (
      public.is_staff(auth.uid())
      AND (
        branch_id IS NULL
        OR branch_id = public.get_user_branch_id(auth.uid())
      )
    )
    OR
    -- Agent dapat booking dari agennya
    (
      public.has_role(auth.uid(), 'agent'::app_role)
      AND agent_id = (SELECT id FROM agents WHERE user_id = auth.uid() LIMIT 1)
    )
  );
```

### E. Mapping Branch dalam JWT

JWT payload harus menyertakan:
```typescript
interface JWTPayload {
  sub: string;        // user_id
  email: string;
  roles: string[];    // semua role aktif
  branch_id?: string; // branch aktif (null jika global)
  exp: number;
}
```

### F. Branch Switcher (Fitur Opsional)

Untuk user multi-cabang (misal super_admin yang ingin melihat perspektif cabang tertentu):
```typescript
// sessionStorage.setItem('active_branch_id', branchId)
// Komponen BranchSelector → update session tanpa re-login
```

---

## Ringkasan Keputusan

| Pertanyaan | Jawaban Final |
|-----------|--------------|
| User bisa di banyak cabang? | ✅ Ya (via multiple user_roles rows) |
| Role berlaku global atau per cabang? | Bergantung role — lihat tabel di atas |
| branch_manager hanya cabangnya? | ✅ Ya, wajib difilter |
| Finance melihat semua cabang? | ✅ Ya, global access |
| Sales bisa lintas cabang? | Opsional — bergantung branch_id |
| Agent terikat cabang? | ✅ Ya, via agents.branch_id |
| RLS enforce branch? | ⚠️ Belum penuh — perlu ditambahkan |
