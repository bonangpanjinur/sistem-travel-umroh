# patches/ — Security-Only Patches

## Purpose
Contains SQL files that **only modify permissions and RLS policies** — no schema changes,
no new tables, no column additions. These harden the security posture of the database
by tightening GRANT/REVOKE rules and fixing overly permissive policies.

These can be applied independently of schema migration order, but must be applied
**after the objects they reference exist** (i.e., after v1_foundation at minimum).

## Contents

| File | Purpose | When to Apply |
|---|---|---|
| `20260511033505_dcb564bf.sql` | Tightens `audit_logs` INSERT policy; revokes EXECUTE from `anon` and `public` on all SECURITY DEFINER functions; re-grants to `authenticated` | After v1_foundation |
| `20260511033624_5a1f0502.sql` | Revokes EXECUTE on all trigger-returning functions (RETURNS trigger) from `public`, `anon`, `authenticated` — these should never be called via RPC | After v1_foundation |
| `20260511040151_ee6ab98a.sql` | Fixes RLS on `referral_codes`, `referral_usages`, `ticket_responses` — replaces broad policies with scoped ones | After v1_foundation |
| `20260511040450_0931417e.sql` | Tightens Storage upload policies for `customer-documents` and `payment-proofs` buckets; restricts referral code read to authenticated only | After v1_foundation (requires Supabase Storage) |
| `20260513143542_b6675e12.sql` | REVOKE/GRANT on store functions: `receive_purchase_order`, `generate_po_number`, `is_store_admin`, `apply_stock_movement`, `apply_store_order_sale_out` | After v3_numbered_features/store_ecommerce.sql |

## Usage
```sql
-- Apply after foundation (at minimum):
\i patches/20260511033505_dcb564bf.sql
\i patches/20260511033624_5a1f0502.sql
\i patches/20260511040151_ee6ab98a.sql
\i patches/20260511040450_0931417e.sql
-- Apply after store_ecommerce.sql:
\i patches/20260513143542_b6675e12.sql
```

## Notes
- `20260511040450_0931417e.sql` references `storage.objects` — this only works on **Supabase** (Storage is a Supabase-managed schema). Skip on Neon/standard PostgreSQL.
- All other patch files are standard PostgreSQL compatible.
- These patches are **idempotent** — safe to re-apply (DROP POLICY IF EXISTS + CREATE POLICY pattern).

## Rollback
- To undo: manually re-grant `EXECUTE` to `anon` or `public` on the relevant functions.
- Re-create any dropped RLS policies with the original (broader) definitions.
