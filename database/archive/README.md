# archive/ — Deprecated & Superseded SQL Files

## Purpose
Contains SQL files that have been **superseded, replaced, or made redundant** by later
migrations. These files are retained for historical reference and audit trail only.

**Do NOT run any file in this folder** against a current database — they will either
fail, cause conflicts, or apply outdated logic that later files have corrected.

## Contents

| File | Original Purpose | Why Archived |
|---|---|---|
| `20260511005638_a74d5d05.sql` | Store categories + products schema (initial version) | Uses `CREATE TABLE` **without** `IF NOT EXISTS` — will crash with "table already exists" if run after `store_ecommerce.sql`. Superseded by `v3_numbered_features/store_ecommerce.sql`. |
| `20260513104019_e8ed0e59.sql` | `package_labels` + `package_label_assignments` tables (Sprint 8 P6 original) | Identical schema to `v4_patches/20260531000001_fix_package_labels.sql` which also includes seed data. The fix version is the active one. |
| `20260513224928_1b3311e2.sql` | First version of `delete_departure_safely()` RPC | Superseded by `v4_patches/20260513230115_fddd400b.sql` which has improved cascading logic, better error handling, and a `NOTIFY pgrst` call. |
| `20260513225013_2b4c98b8.sql` | Standalone GRANT for `delete_departure_safely()` | Logic absorbed into `v4_patches/20260513230115_fddd400b.sql`. Redundant as a standalone file. |
| `20260514030830_68f8f4df.sql` | `web_vitals_metrics` table (v2 — stricter constraints) | Superseded by `v4_patches/20260517153423_create_web_vitals_metrics.sql` (v3). The v3 version has relaxed constraints for broader telemetry compatibility. Running both creates conflicting RLS policies. |
| `fase26_public_booking_rpc_qr_settings.sql` | First version of `get_public_booking_details()` RPC + invoice QR settings | RPC logic was improved in `20260602095239` and then `20260603065020`. The QR invoice columns it adds are still valid but can be applied via the later files. |
| `20260602095239_b86404c3.sql` | `get_public_booking_details(uuid)` RPC v2 — public anonymous read | Anonymous (`anon`) access to this function is **revoked** by the very next file (`20260603065020`). Running this in isolation would grant then immediately lose anon access. Both are effectively a two-step sequence; only the final state (`20260603065020`) matters. |
| `064_auto_pl_trigger.sql` | Auto-trigger P&L recalculation when departure → 'completed' | Superseded by `v3_numbered_features/068b_comprehensive_pl_triggers.sql` which covers the same trigger plus bookings, cost_items, expenses, and other_revenues triggers — a complete superset. |

## Restoration
If you need to reference or restore any archived file, copy it out of this folder
and apply any necessary modifications to make it compatible with the current schema
before running it.

## Date Archived
June 2025 — during database reorganization (see `docs/database_organization_report.md`).
