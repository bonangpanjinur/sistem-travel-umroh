# RLS Strategy — Vinstour Travel Portal
> Desain Row Level Security: helper functions, pola, dan strategi per domain

---

## Prinsip Dasar RLS

1. **Semua tabel `ENABLE ROW LEVEL SECURITY`** tanpa pengecualian
2. **Gunakan SECURITY DEFINER functions** untuk avoid permission escalation
3. **Cache-friendly:** Helper function menggunakan `STABLE` dan `SECURITY DEFINER`
4. **Fail-closed:** Tidak ada policy = tidak ada akses (default deny)
5. **Tidak ada inline role check:** `USING (role = 'admin')` DILARANG
6. **super_admin bypass di aplikasi** (bukan di DB) untuk keamanan

---

## Helper Functions (Lengkap)

### A. Core Role Helpers

```sql
-- ════════════════════════════════════════════════════════
-- has_role: cek apakah user punya TEPAT satu role ini
-- ════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.has_role(
  p_uid  UUID,
  p_role public.app_role
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_uid
      AND role = p_role
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$;

-- ════════════════════════════════════════════════════════
-- has_any_role: cek apakah user punya SALAH SATU role
-- ════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.has_any_role(
  p_uid   UUID,
  p_roles public.app_role[]
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_uid
      AND role = ANY(p_roles)
      AND is_active = TRUE
      AND (expires_at IS NULL OR expires_at > NOW())
  );
$$;

-- ════════════════════════════════════════════════════════
-- is_staff: staf internal (tidak termasuk agent/jamaah)
-- ════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_staff(p_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_role(p_uid, ARRAY[
    'super_admin','owner','it','admin','branch_manager',
    'finance','operational','operator','sales','marketing','equipment'
  ]::public.app_role[]);
$$;

-- ════════════════════════════════════════════════════════
-- is_admin_or_above: admin dan role di atasnya
-- ════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_admin_or_above(p_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_role(p_uid, ARRAY[
    'super_admin','owner','it','admin'
  ]::public.app_role[]);
$$;
```

### B. Permission Helper

```sql
-- ════════════════════════════════════════════════════════
-- has_permission: cek permission dengan override support
-- ════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.has_permission(
  p_uid        UUID,
  p_permission TEXT,
  p_action     TEXT DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_override RECORD;
  v_allowed  BOOLEAN := FALSE;
BEGIN
  -- super_admin bypass
  IF public.has_role(p_uid, 'super_admin'::public.app_role) THEN
    RETURN TRUE;
  END IF;

  -- Personal override (paling prioritas)
  SELECT * INTO v_override
  FROM public.user_permission_overrides
  WHERE user_id = p_uid
    AND permission_key = p_permission
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

  -- Role permissions (OR logic: satu role yang izinkan = diizinkan)
  SELECT bool_or(
    CASE p_action
      WHEN 'view'   THEN COALESCE(rp.can_view, FALSE)
      WHEN 'create' THEN COALESCE(rp.can_create, FALSE)
      WHEN 'edit'   THEN COALESCE(rp.can_edit, FALSE)
      WHEN 'delete' THEN COALESCE(rp.can_delete, FALSE)
      ELSE FALSE
    END
  ) INTO v_allowed
  FROM public.role_permissions rp
  WHERE rp.permission_key = p_permission
    AND rp.role IN (
      SELECT ur.role FROM public.user_roles ur
      WHERE ur.user_id = p_uid AND ur.is_active = TRUE
    );

  RETURN COALESCE(v_allowed, FALSE);
END;
$$;
```

### C. Branch Access Helpers

```sql
-- ════════════════════════════════════════════════════════
-- get_user_branch_id: ambil branch_id aktif user
-- ════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_user_branch_id(p_uid UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id FROM public.user_roles
  WHERE user_id = p_uid
    AND is_active = TRUE
    AND branch_id IS NOT NULL
  ORDER BY
    CASE role
      WHEN 'branch_manager' THEN 1
      WHEN 'admin'          THEN 2
      WHEN 'operational'    THEN 3
      WHEN 'sales'          THEN 4
      WHEN 'finance'        THEN 5
      ELSE 10
    END
  LIMIT 1;
$$;

-- ════════════════════════════════════════════════════════
-- can_access_branch: apakah user bisa akses branch ini?
-- ════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.can_access_branch(p_uid UUID, p_branch_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Global roles: selalu bisa
    public.has_any_role(p_uid, ARRAY[
      'super_admin','owner','it','finance'
    ]::public.app_role[])
    OR
    -- NULL branch_id = global staf internal
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = p_uid
        AND branch_id IS NULL
        AND is_active = TRUE
        AND role NOT IN ('customer','jamaah','agent','sub_agent')
    )
    OR
    -- Branch-specific staf
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = p_uid
        AND branch_id = p_branch_id
        AND is_active = TRUE
    );
$$;

-- ════════════════════════════════════════════════════════
-- has_global_access: apakah user tidak terikat cabang?
-- ════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.has_global_access(p_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_any_role(p_uid, ARRAY[
    'super_admin','owner','it','finance'
  ]::public.app_role[])
  OR EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_uid
      AND branch_id IS NULL
      AND is_active = TRUE
      AND role NOT IN ('customer','jamaah','agent','sub_agent')
  );
$$;
```

### D. Customer / Jamaah Ownership Helpers

```sql
-- ════════════════════════════════════════════════════════
-- is_own_customer: apakah customer ini milik user ini?
-- ════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_own_customer(p_uid UUID, p_customer_id UUID)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.customers
    WHERE id = p_customer_id AND user_id = p_uid
  );
$$;

-- ════════════════════════════════════════════════════════
-- get_user_agent_id: ambil agent_id milik user ini
-- ════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_user_agent_id(p_uid UUID)
RETURNS UUID
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.agents WHERE user_id = p_uid LIMIT 1;
$$;
```

---

## Pola RLS per Domain

### Pattern 1: Public Read (Website)

```sql
-- Digunakan untuk: packages, departures, hotels, faqs, dll
CREATE POLICY "public_read"
  ON public.packages FOR SELECT
  TO anon, authenticated
  USING (is_published = TRUE AND is_active = TRUE);
```

### Pattern 2: Staff Full Read + Admin Write

```sql
-- Digunakan untuk: customers, bookings, leads
CREATE POLICY "staff_read"
  ON public.customers FOR SELECT
  USING (public.is_staff(auth.uid()));

CREATE POLICY "admin_write"
  ON public.customers FOR ALL
  USING (public.is_admin_or_above(auth.uid()));
```

### Pattern 3: Own Data Only (Jamaah)

```sql
-- Digunakan untuk: notifications, booking_passengers
CREATE POLICY "own_data"
  ON public.notifications FOR ALL
  USING (user_id = auth.uid());
```

### Pattern 4: Agent Scoped

```sql
-- Digunakan untuk: bookings yang dibuat agen, leads agen
CREATE POLICY "agent_scoped"
  ON public.bookings FOR SELECT
  USING (
    public.is_staff(auth.uid())
    OR (
      public.has_any_role(auth.uid(), ARRAY['agent','sub_agent']::public.app_role[])
      AND agent_id = public.get_user_agent_id(auth.uid())
    )
  );
```

### Pattern 5: Branch Scoped

```sql
-- Digunakan untuk: tabel yang punya branch_id
CREATE POLICY "branch_scoped_read"
  ON public.bookings FOR SELECT
  USING (
    public.has_global_access(auth.uid())
    OR public.can_access_branch(auth.uid(), branch_id)
  );
```

### Pattern 6: Finance Global Read

```sql
-- Finance bisa baca semua data keuangan tanpa filter cabang
CREATE POLICY "finance_read"
  ON public.payments FOR SELECT
  USING (
    public.has_any_role(auth.uid(), ARRAY[
      'super_admin','owner','it','admin','finance','branch_manager'
    ]::public.app_role[])
  );
```

### Pattern 7: Immutable Audit Log

```sql
-- Audit log: hanya INSERT, tidak bisa UPDATE/DELETE
CREATE POLICY "audit_insert"
  ON public.audit_logs FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "audit_select"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin_or_above(auth.uid()));

-- TIDAK ADA UPDATE policy
-- TIDAK ADA DELETE policy
```

### Pattern 8: Customer Owns Resource

```sql
-- Booking dilihat jamaah sendiri
CREATE POLICY "customer_own_booking"
  ON public.bookings FOR SELECT
  USING (
    public.is_staff(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.customers c
      WHERE c.id = customer_id AND c.user_id = auth.uid()
    )
  );
```

---

## Mapping Domain → Pattern RLS

| Domain / Tabel | Pattern | Catatan |
|---------------|---------|---------|
| `profiles` | Own + Staff Read | UPDATE hanya own data atau admin |
| `user_roles` | Admin Only | IT + super_admin manage |
| `permissions_list` | Auth Read + IT Write | — |
| `role_permissions` | Auth Read + IT Write | — |
| `branches` | Public Read + Admin Write | — |
| `agents` | Staff + Own Agent | Agent baca data sendiri |
| `customers` | Staff + Own Customer | Customer baca data sendiri |
| `customer_accounts` | Own Only + Staff | — |
| `packages` | Public Published + Staff All | — |
| `departures` | Public Open + Staff All + Branch | — |
| `bookings` | Staff (branch) + Agent (own) + Customer (own) | Triple policy |
| `booking_passengers` | Staff + Own Booking | — |
| `payments` | Finance/Admin + Own (customer input) | — |
| `payment_receipt` | Finance Only | — |
| `journal_entries` | Finance Only | — |
| `journal_lines` | Finance Only | — |
| `payroll` | Finance + Own Employee | — |
| `payroll_slips` | Finance + Own Employee | Slip gaji lihat sendiri |
| `equipment_items` | Staff Read + Equipment/Admin Write | — |
| `equipment_distributions` | Staff Read + Equipment/Operational Write | — |
| `leads` | Staff + Agent (own) | — |
| `marketing_materials` | Marketing Write + Agent Read | — |
| `audit_logs` | Admin Read + Insert Only | Immutable |
| `website_settings` | Public Read + IT Write | — |
| `faqs` | Public Published + Admin Write | — |
| `notifications` | Own Only + Admin Insert | — |
| `company_settings` | Public (is_public) + Staff + Admin Write | — |

---

## Catatan Penting

### 1. Performance RLS
```sql
-- Helper functions harus STABLE (bisa di-cache per query)
-- TIDAK boleh VOLATILE di dalam policy expression

-- ✅ BENAR
CREATE POLICY ... USING (public.has_role(auth.uid(), 'admin'::app_role));
-- → has_role() adalah STABLE, aman untuk RLS

-- ❌ SALAH — jangan gunakan NOW() di dalam has_role
-- → Karena NOW() volatile, tapi sudah diantisipasi dengan parameter expires_at
```

### 2. NULL handling di branch_id
```sql
-- branch_id = NULL artinya global, bukan "tidak punya branch"
-- Policy harus handle NULL eksplisit:
USING (
  branch_id IS NULL  -- resource global
  OR public.can_access_branch(auth.uid(), branch_id)
)
```

### 3. Service Role bypass
```sql
-- API Server menggunakan service_role atau anon key
-- Service role bypass semua RLS
-- Pastikan Express middleware enforce role check di level aplikasi
-- JANGAN bergantung hanya pada RLS untuk service role calls
```

### 4. Multi-tenancy isolation
```sql
-- Untuk strict isolation per branch:
-- Tambahkan branch_id di SET clause JWT custom claims
-- Sehingga bisa diakses via: current_setting('request.jwt.claims', true)::jsonb
```
