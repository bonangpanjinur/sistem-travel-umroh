---
name: Branch & Agent Scoping
description: JWT claims, supabaseProxy branch scoping, dan route order untuk sistem agen/cabang.
---

## JWT Claims

- `branch_id` diinjeksi ke JWT untuk role `branch_manager` via `getBranchIdForRole(userId, role)` di `routes/auth.ts`
- `agent_id` diinjeksi untuk role `agent` dan `sub_agent` via `getAgentByUserId(userId)` di `routes/auth.ts`
- Helper di `lib/auth.ts`: `getBranchIdForRole`, `getAgentByUserId`

**Why:** Tanpa claims ini, setiap request harus query DB untuk cari branch_id — tidak efisien dan sulit di-scope.

## Branch Data Scoping di supabaseProxy

File: `artifacts/api-server/src/routes/supabaseProxy.ts`

`BRANCH_SCOPED_TABLES` = `bookings`, `agents`, `discount_requests`, `branch_commissions`

Untuk GET requests: jika caller adalah `branch_manager` dengan `branch_id` di JWT, proxy otomatis:
1. Hapus filter `branch_id` yang dikirim client (prevent bypass)
2. Inject filter `branch_id = jwt.branch_id`

**Why:** branch_manager tidak boleh melihat data cabang lain. Scoping di level proxy lebih aman dari scoping di frontend.

**How to apply:** Tambahkan tabel ke `BRANCH_SCOPED_TABLES` jika tabel baru punya kolom `branch_id` dan harus di-scope.

## Route Order di agents.ts KRITIS

Urutan route Express di `artifacts/api-server/src/routes/agents.ts` harus:
1. `/commission-tiers/list` (specific)
2. `/invitation` (specific)
3. `/invitation/:token` (specific)
4. `/invitation/register` (specific)
5. `/:agentId/commission-tier` (param)
6. `/:id` (param — paling akhir)

**Why:** Express mencocokkan route secara urutan. Jika `/:id` didaftarkan sebelum `/invitation`, maka `invitation` akan ditangkap sebagai `id = 'invitation'`.
