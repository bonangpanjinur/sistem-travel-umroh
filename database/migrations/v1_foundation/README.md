# v1_foundation — Foundation & Consolidated Master Migrations

## Purpose
This folder contains the **authoritative baseline schema** for the Vinstour Travel Portal.
These files establish the core database structure: enums, RBAC, all primary tables, indexes,
triggers, RLS policies, and seed data. They should be run **before any other migration group**.

## Contents

| File | Description | Run Order |
|---|---|---|
| `fase0_foundation.sql` | Core schema: `app_role` enum, `profiles`, `user_roles`, `role_permissions`, `branches`, `agents`, `packages`, `departures`, `bookings`, `payments`, `customers`, `hotels`, `airlines`, `equipment_items`, `equipment_distributions`, `whatsapp_config`, `wa_messages`, `loyalty_points`, `muthawifs`, `support_tickets` + all base triggers and RLS | **1** |
| `consolidated_all.sql` | All-in-one master migration covering phases 0–27 (147 KB / 3,514 lines). Intended for **fresh database setup** — runs everything in one shot with full `IF NOT EXISTS` guards. | **1 (alternative to fase0 + v2 phases)** |
| `consolidated_fase_11_15.sql` | Consolidation of Fase 11–15: `agent_leads` CRM pipeline, training modules, referral system, loyalty enhancements, additional operational tables. | **2 (after fase0, before fase16)** |

## Usage

### Fresh install (recommended):
```sql
-- Option A: Single-file setup (covers v1 + v2 up to fase27)
\i v1_foundation/consolidated_all.sql

-- Then continue with v2_sprint_phases from fase28 onwards
-- and all of v3_numbered_features and v4_patches

-- Option B: Step-by-step
\i v1_foundation/fase0_foundation.sql
\i v1_foundation/consolidated_fase_11_15.sql
-- then proceed to v2_sprint_phases in order
```

## Dependencies
- None — this is the starting point for all other migrations.

## Rollback
- No individual rollback scripts provided.
- To rollback: restore from a database snapshot taken before this was applied.

## Notes
- `consolidated_all.sql` supersedes `fase0_foundation.sql` + `consolidated_fase_11_15.sql` combined.
  Do **not** run all three together — pick Option A or Option B above.
- All RLS policies use `auth.uid()` — this requires Supabase GoTrue.
  On standard PostgreSQL (Neon), remove or adapt RLS policies and `auth.*` references.
