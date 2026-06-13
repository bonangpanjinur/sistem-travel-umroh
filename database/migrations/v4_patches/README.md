# v4_patches — Timestamped Feature & Data Patches

## Purpose
Incremental patches applied on top of the foundation and sprint phases.
These are Supabase Studio auto-generated migration files (named with timestamp + UUID)
and a few manually named patch files. Each targets a specific column addition, table
creation, trigger fix, or data backfill.

Apply these **chronologically** (by filename prefix) after all foundation and sprint files.

## Contents (in chronological execution order)

| File | Date | Purpose | Status |
|---|---|---|---|
| `20260508000000_invoice_templates.sql` | 2026-05-08 | Creates `invoice_templates` table + default seed row | Active |
| `20260511000842_e411d2d6.sql` | 2026-05-11 | `attribute_commission_to_parent()` trigger — 10% royalty to parent agent from child commission | Active |
| `20260511013137_3bc297d2.sql` | 2026-05-11 | Creates `push_subscriptions` table + RLS policies | Active |
| `20260511014225_688bca84.sql` | 2026-05-11 | Creates `ibadah_progress` table — per-user spiritual tracking (salat, dzikir) | Active |
| `20260511031434_916b4c99.sql` | 2026-05-11 | Creates `push_outbox` + notification queue system | Active |
| `20260511034756_85990413.sql` | 2026-05-11 | Creates `customer_mahrams` + booking extras tables | Active |
| `20260511053018_7ec5b9d8.sql` | 2026-05-11 | Adds layout/theme columns to `website_settings` and `theme_presets`; seeds 7 themes | Active |
| `20260513111158_6897f5ed.sql` | 2026-05-13 | Adds `locked_price`, `price_lock_date` to `savings_plans`; creates `savings_schedules` | Active |
| `20260513114043_30604cc7.sql` | 2026-05-13 | Creates `jamaah_badges` table + 5 auto-badge award triggers (loyalty system) | Active |
| `20260513115449_195f75c8.sql` | 2026-05-13 | Creates `training_modules` + agent training completion tracking tables | Active |
| `20260513121719_d8c71ee7.sql` | 2026-05-13 | Branch-scoped RLS helpers: `is_branch_manager_only()` + branch-aware policies on multiple tables | Active |
| `20260513123505_6536670f.sql` | 2026-05-13 | Creates `pwa_install_events` + PWA analytics tables | Active |
| `20260513130746_2d3e4cf1.sql` | 2026-05-13 | Multi-currency fields on `bookings` (`exchange_rate`, `total_price_original`, `total_price_idr`) + backfill | Active |
| `20260513131651_4575cd92.sql` | 2026-05-13 | Adds `price_adult`, `price_child`, `price_infant` to `departures` | Active (overlaps with fase29, safe) |
| `20260513132826_d761930f.sql` | 2026-05-13 | Adds `payment_mode`, `dp_amount`, `savings_plan_id` to `bookings` | Active |
| `20260513134512_7988bcaa.sql` | 2026-05-13 | Creates `seat_holds` table — 15-min seat reservation during booking wizard | Active |
| `20260513143441_978c0550.sql` | 2026-05-13 | Store Procurement: `store_suppliers`, `store_po_counters`, `store_purchase_orders`, inventory movement log | Active |
| `20260513152135_9fd1b871.sql` | 2026-05-13 | Stock Opname Approval workflow: `store_opname_sessions` + approval state machine | Active |
| `20260513223955_2b02318f.sql` | 2026-05-13 | Fixes FK ON DELETE for `equipment_distributions` (CASCADE), `manasik_schedules` (CASCADE), `support_tickets` (SET NULL) | Active |
| `20260513230115_fddd400b.sql` | 2026-05-13 | Definitive `delete_departure_safely()` RPC — cascading cleanup with safety checks + NOTIFY pgrst | Active |
| `20260517153423_create_web_vitals_metrics.sql` | 2026-05-17 | Creates `web_vitals_metrics` table (performance telemetry: LCP, CLS, INP, FCP, TTFB) | Active (v3 — use this one) |
| `20260530000000_add_package_discount.sql` | 2026-05-30 | Adds `discount_amount`, `discount_percentage` to `packages` | Active |
| `20260531000000_fix_payment_deadline_reminders.sql` | 2026-05-31 | Creates `payment_deadline_reminders` table with UNIQUE(booking_id) — **must run before fase30** | Active |
| `20260531000001_fix_package_labels.sql` | 2026-05-31 | Recreates `package_labels` + `package_label_assignments`; seeds 5 global labels | Active |
| `20260603065020_5f82ff73.sql` | 2026-06-03 | Adds `public_token` to `bookings`; `get_public_booking_by_token()` RPC; revokes anon from UUID-based version | Active |

## Important Ordering Note
`20260531000000_fix_payment_deadline_reminders.sql` **must be applied before**
`v2_sprint_phases/fase30_auto_schedule_reminders.sql`, because fase30 alters the
UNIQUE constraint that this patch creates.

## Dependencies
- All v1, v2, v3 migrations must be applied first.
- Exception: `20260508000000_invoice_templates.sql` can run immediately after v1_foundation.

## Rollback
- No rollback scripts.
- Most patches use `ADD COLUMN IF NOT EXISTS` — idempotent and safe to re-apply.
