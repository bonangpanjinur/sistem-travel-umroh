# MASTER_INDEX — Vinstour Travel Portal Database Migrations

> Complete execution order, dependencies, and rollback availability for all 75 SQL files.
> Reorganized: June 2025
> Source audit: `docs/database_organization_report.md`

---

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Active — must be applied |
| 🔵 | Supabase-only — skip on Neon/RDS |
| 🟡 | Data migration — idempotent, can re-run |
| 🔒 | Security patch — GRANT/REVOKE only |
| ⚠️ | Has known overlap with another file (safe, both use IF NOT EXISTS) |
| 🗃️ | Archived — do NOT run |
| ↩️ | Rollback script available |

---

## STAGE 0 — Pre-flight Check

Before running any migration, verify:
1. PostgreSQL version ≥ 14 (for GENERATED ALWAYS AS STORED columns)
2. `uuid-ossp` extension enabled: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
3. `pgcrypto` extension enabled: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
4. (Supabase only) GoTrue auth schema present for `auth.uid()` functions
5. Database is empty OR you have taken a full backup

---

## STAGE 1 — Foundation (v1_foundation/)

Choose **one** of Option A or Option B. Do not run both.

### Option A — Single-file setup (recommended for fresh installs)

| # | File | Status | Rollback | Notes |
|---|---|---|---|---|
| 1 | `migrations/v1_foundation/consolidated_all.sql` | ✅ | — | 147 KB. Covers foundation + all phases up to ~fase27. Run this, then skip to STAGE 2 at fase28. |

### Option B — Step-by-step

| # | File | Status | Rollback | Notes |
|---|---|---|---|---|
| 1 | `migrations/v1_foundation/fase0_foundation.sql` | ✅ | — | Core enums, profiles, RBAC, all primary business tables |
| 2 | `migrations/v1_foundation/consolidated_fase_11_15.sql` | ✅ | — | Fase 11–15: agent CRM, training, referrals, loyalty |

---

## STAGE 2 — Sprint Phases (v2_sprint_phases/)

> Skip files covered by `consolidated_all.sql` if you used Option A.
> If you used Option B (fase0 only), run all of these in order.

| # | File | Status | Rollback | Depends On | Description |
|---|---|---|---|---|---|
| 3 | `v2_sprint_phases/fase16_new_tables.sql` | ✅ | — | Stage 1 | Loyalty, muthawif, visa apps, room assignments, WA config, badges, referrals, menu system |
| 4 | `v2_sprint_phases/fase17_remaining_tables.sql` | ✅ | — | fase16 | Audit logs, notifications, ibadah tracking, savings plans, withdrawal requests |
| 5 | `v2_sprint_phases/fase18_core_settings.sql` | ✅ | — | fase17 | `website_settings`, `theme_presets`, `menu_items`, `role_permissions` seed |
| 6 | `v2_sprint_phases/fase19_branch_kpi_targets.sql` | ✅ | — | fase18 | `branch_monthly_targets` — monthly KPI targets per branch |
| 7 | `v2_sprint_phases/fase20_webhooks_push.sql` | ✅ | — | fase19 | Webhook configs, webhook logs, push subscriptions |
| 8 | `v2_sprint_phases/fase20b_chat_bubble_color.sql` | ✅ | — | fase20_webhooks | `chat_bubble_color` column on `website_settings` |
| 9 | `v2_sprint_phases/fase21_integration_fixes.sql` | ✅ | — | fase20b | Store procurement: `store_suppliers`, `store_purchase_orders`, inventory |
| 10 | `v2_sprint_phases/fase22_muthawif_evaluations.sql` | ✅ | — | fase21 | `muthawif_jamaah_evaluations` — muthawif rates jamaah |
| 11 | `v2_sprint_phases/fase23_payments_transaction_id.sql` | ✅ | — | fase22 | Adds `transaction_id`, `payment_type` to `payments` (Midtrans) |
| 12 | `v2_sprint_phases/fase24_payment_sync_trigger.sql` | ✅ | — | fase23 | `sync_booking_payment_totals()` trigger on `payments` |
| 13 | `v2_sprint_phases/fase25_backfill_booking_payment_totals.sql` | 🟡 | — | fase24 | Data fix — backfills booking totals from payments table |
| 14 | `v2_sprint_phases/fase27_booking_line_items_rls_fixes.sql` | ✅ | — | fase25 | Creates `booking_line_items`; fixes RLS on customer_documents, customer_mahrams, profiles |
| 15 | `v2_sprint_phases/fase28_package_financials.sql` | ✅ | — | fase27 | HPP: `departure_cost_items`, `departure_expenses`, `departure_other_revenues`, `departure_financial_summary` |
| 16 | `v2_sprint_phases/fase29_passenger_pricing.sql` | ✅ ⚠️ | — | fase28 | `price_adult`, `child_price_percent`, `infant_price_percent` on departures (overlaps with #37) |
| 17 | `v2_sprint_phases/fase30_auto_schedule_reminders.sql` | ✅ | — | fase29 + **#38** | Requires `payment_deadline_reminders` table created in #38 |
| 18 | `v2_sprint_phases/fase31_wa_multiprovider.sql` | ✅ | — | fase30 | Adds `it` role; extends `whatsapp_config`; `get_wa_config_safe()`; `wa_feature_roadmap` |
| 19 | `v2_sprint_phases/fase32_wa_broadcast_campaigns.sql` | ✅ | — | fase31 | `wa_broadcast_campaigns` + `wa_broadcast_logs` |

> **⚠️ Dependency alert on #17:** `fase30` modifies the UNIQUE constraint on `payment_deadline_reminders`.
> This table is created in `v4_patches/20260531000000_fix_payment_deadline_reminders.sql` (#38).
> Run #38 **before** #17 even though #38 is in v4_patches.

---

## STAGE 3 — Numbered Feature Migrations (v3_numbered_features/)

| # | File | Status | Rollback | Depends On | Description |
|---|---|---|---|---|---|
| 20 | `v3_numbered_features/063_hotel_room_numbers.sql` | ✅ | — | Stage 1 | Room number columns on `booking_passengers` (Makkah, Madinah, etc.) |
| 21 | `v3_numbered_features/064_mahram_room_compatibility.sql` | ✅ | — | fase27 | `check_mahram_room_conflicts()` — detect unassigned mahram rooms |
| 22 | `v3_numbered_features/065_equipment_confirmation.sql` | ✅ | — | Stage 1 | Adds `confirmed_by_jamaah`, `confirmed_at` to `equipment_distributions` |
| 23 | `v3_numbered_features/065b_hotel_room_capacities.sql` | ✅ | — | Stage 1 | `hotel_room_capacities` table + capacity check function |
| 24 | `v3_numbered_features/066_equipment_distribution_photo.sql` | ✅ | — | #22 | Photo URL columns on `equipment_distributions` + helper functions |
| 25 | `v3_numbered_features/066b_multi_hotel_per_city.sql` | ✅ | — | Stage 1 | Documentation-only: extends `hotel_role` values in `departure_hotels` |
| 26 | `v3_numbered_features/067_package_hpp_templates.sql` | ✅ | — | fase28 (#15) | `package_hpp_templates` — cost-item templates copied to departures |
| 27 | `v3_numbered_features/067b_package_type_equipment.sql` | ✅ | — | Stage 1 | `package_type_equipment` — default equipment per package type |
| 28 | `v3_numbered_features/068_withdrawal_requests_extra.sql` | ✅ | — | Stage 1 | Adds `rejection_reason`, `processed_at`, `bank_details` to `withdrawal_requests` |
| 29 | `v3_numbered_features/068b_comprehensive_pl_triggers.sql` | ✅ | — | fase28 (#15) | Full auto P&L recalculation triggers on bookings, cost_items, expenses, revenues |
| 30 | `v3_numbered_features/store_ecommerce.sql` | ✅ | — | Stage 1 | Full e-commerce: categories, products, orders, order_items, shipments + seed |
| 31 | `v3_numbered_features/store_product_reviews.sql` | ✅ | — | #30 | `store_product_reviews` — customer ratings post-delivery |
| 32 | `v3_numbered_features/doc_sprint2_branch_branding_templates.sql` | ✅ | — | Stage 1 | `signature_url`, `stamp_url`, `logo_url`, `letterhead_data` on branches |

---

## STAGE 4 — Timestamped Patches (v4_patches/)

Apply **after** Stages 1–3, in chronological order by filename prefix.

> **Special ordering note:** Apply #38 (`20260531000000_fix_payment_deadline_reminders`) **before**
> Stage 2 #17 (`fase30_auto_schedule_reminders`).

| # | File | Status | Rollback | Depends On | Description |
|---|---|---|---|---|---|
| 33 | `v4_patches/20260508000000_invoice_templates.sql` | ✅ | — | Stage 1 | `invoice_templates` table + default seed row |
| 34 | `v4_patches/20260511000842_e411d2d6.sql` | ✅ | — | Stage 1 | `attribute_commission_to_parent()` trigger — 10% royalty to parent agent |
| 35 | `v4_patches/20260511013137_3bc297d2.sql` | ✅ | — | Stage 1 | `push_subscriptions` table + RLS ⚠️ (also in fase20_webhooks, IF NOT EXISTS) |
| 36 | `v4_patches/20260511014225_688bca84.sql` | ✅ | — | Stage 1 | `ibadah_progress` — per-user spiritual tracking |
| 37 | `v4_patches/20260511031434_916b4c99.sql` | ✅ | — | Stage 1 | `push_outbox` + notification queue system |
| 38 | `v4_patches/20260511034756_85990413.sql` | ✅ | — | Stage 1 | `customer_mahrams` + booking extras tables |
| 39 | `v4_patches/20260511053018_7ec5b9d8.sql` | ✅ | — | fase18 | Adds layout/theme columns to website_settings + theme_presets; seeds 7 themes |
| 40 | `v4_patches/20260513111158_6897f5ed.sql` | ✅ | — | Stage 1 | `locked_price`, `price_lock_date` on savings_plans; `savings_schedules` table |
| 41 | `v4_patches/20260513114043_30604cc7.sql` | ✅ | — | Stage 1 | `jamaah_badges` + 5 auto-badge triggers |
| 42 | `v4_patches/20260513115449_195f75c8.sql` | ✅ | — | Stage 1 | `training_modules` + agent training completion tracking |
| 43 | `v4_patches/20260513121719_d8c71ee7.sql` | ✅ | — | Stage 1 | Branch-scoped RLS helpers (`is_branch_manager_only()` + policies) |
| 44 | `v4_patches/20260513123505_6536670f.sql` | ✅ | — | Stage 1 | `pwa_install_events` + PWA analytics |
| 45 | `v4_patches/20260513130746_2d3e4cf1.sql` | ✅ | — | Stage 1 | Multi-currency fields on bookings + backfill |
| 46 | `v4_patches/20260513131651_4575cd92.sql` | ✅ ⚠️ | — | Stage 1 | `price_adult/child/infant` on departures (overlaps with fase29 #16, safe) |
| 47 | `v4_patches/20260513132826_d761930f.sql` | ✅ | — | Stage 1 | `payment_mode`, `dp_amount`, `savings_plan_id` on bookings |
| 48 | `v4_patches/20260513134512_7988bcaa.sql` | ✅ | — | Stage 1 | `seat_holds` — 15-min booking wizard seat reservation |
| 49 | `v4_patches/20260513143441_978c0550.sql` | ✅ | — | Stage 1 | Store procurement: `store_suppliers`, `store_purchase_orders`, inventory movements |
| 50 | `v4_patches/20260513152135_9fd1b871.sql` | ✅ | — | #30 (#49) | Stock opname approval: `store_opname_sessions` + state machine |
| 51 | `v4_patches/20260513223955_2b02318f.sql` | ✅ | — | Stage 1 | FK ON DELETE fix: equipment_distributions (CASCADE), manasik_schedules (CASCADE), support_tickets (SET NULL) |
| 52 | `v4_patches/20260513230115_fddd400b.sql` | ✅ | — | Stage 1 | `delete_departure_safely()` RPC — definitive version with full cascade + safety checks |
| 53 | `v4_patches/20260517153423_create_web_vitals_metrics.sql` | ✅ | — | Stage 1 | `web_vitals_metrics` table (v3 — performance telemetry: LCP, CLS, INP, FCP, TTFB) |
| 54 | `v4_patches/20260530000000_add_package_discount.sql` | ✅ | — | Stage 1 | `discount_amount`, `discount_percentage` on packages |
| **38** | **`v4_patches/20260531000000_fix_payment_deadline_reminders.sql`** | ✅ | — | Stage 1 | **`payment_deadline_reminders` table — run BEFORE fase30 (#17)** |
| 55 | `v4_patches/20260531000001_fix_package_labels.sql` | ✅ | — | Stage 1 | `package_labels` + `package_label_assignments` + 5 global label seeds |
| 56 | `v4_patches/20260603065020_5f82ff73.sql` | ✅ | — | Stage 1 | `public_token` on bookings; `get_public_booking_by_token()` RPC |

---

## STAGE 5 — Security Patches (patches/)

Apply **after** all schema migrations. Order within this stage does not matter.

| # | File | Status | Rollback | Depends On | Description |
|---|---|---|---|---|---|
| 57 | `patches/20260511033505_dcb564bf.sql` | 🔒 | Manual | Stage 1 | Tighten audit_logs INSERT; revoke anon EXECUTE on all SECURITY DEFINER functions |
| 58 | `patches/20260511033624_5a1f0502.sql` | 🔒 | Manual | Stage 1 | Revoke EXECUTE on all trigger-returning functions from public/anon/authenticated |
| 59 | `patches/20260511040151_ee6ab98a.sql` | 🔒 | Manual | Stage 1 | Fix referral_codes, referral_usages, ticket_responses RLS |
| 60 | `patches/20260511040450_0931417e.sql` | 🔒 🔵 | Manual | Stage 1 + Supabase Storage | Tighten Storage upload policies; restrict referral code read |
| 61 | `patches/20260513143542_b6675e12.sql` | 🔒 | Manual | Stage 3 (#30) | REVOKE/GRANT on store functions (receive_purchase_order, generate_po_number, etc.) |

---

## STAGE 6 — Supabase Setup (setup/) — SKIP on Neon/RDS

Apply **only on Supabase-hosted databases**, after all other stages.

| # | File | Status | Rollback | Depends On | Description |
|---|---|---|---|---|---|
| 62 | `setup/20260513121035_4ec556b0.sql` | 🔵 | See setup/README.md | Stage 1 | Enable Realtime for website_settings, user_permissions, user_roles |
| 63 | `setup/20260513121224_d1eabedd.sql` | 🔵 | See setup/README.md | Stage 1 | Enable Realtime for role_permissions |
| 64 | `setup/20260513230859_41afb4ce.sql` | 🔵 | See setup/README.md | All stages | PostgREST DDL watch event trigger — auto schema cache reload |

---

## STAGE 7 — Archived Files (archive/) — DO NOT RUN

These files are retained for historical reference only.

| File | Archived Reason |
|---|---|
| `archive/20260511005638_a74d5d05.sql` | `store_categories` v1 — no IF NOT EXISTS; crashes after `store_ecommerce.sql` |
| `archive/20260513104019_e8ed0e59.sql` | `package_labels` v1 — identical to fix version; fix version has seed data |
| `archive/20260513224928_1b3311e2.sql` | `delete_departure_safely()` v1 — superseded by v4_patches/20260513230115 |
| `archive/20260513225013_2b4c98b8.sql` | Standalone GRANT for above function — absorbed into 20260513230115 |
| `archive/20260514030830_68f8f4df.sql` | `web_vitals_metrics` v2 — conflicting RLS with v3 (20260517153423) |
| `archive/fase26_public_booking_rpc_qr_settings.sql` | `get_public_booking_details()` v1 — superseded by v4_patches chain |
| `archive/20260602095239_b86404c3.sql` | `get_public_booking_details()` v2 — anon access revoked by next file |
| `archive/064_auto_pl_trigger.sql` | Superseded by `v3_numbered_features/068b_comprehensive_pl_triggers.sql` |

---

## Full Ordered Execution Script

```sql
-- ═══════════════════════════════════════════════════════
-- VINSTOUR — Complete Migration Execution Order
-- Run from database/ directory
-- ═══════════════════════════════════════════════════════

-- STAGE 1: Foundation
\i migrations/v1_foundation/consolidated_all.sql
-- OR (step-by-step):
-- \i migrations/v1_foundation/fase0_foundation.sql
-- \i migrations/v1_foundation/consolidated_fase_11_15.sql

-- ⚠️ CRITICAL: Run this BEFORE fase30 (Stage 2 #17)
\i migrations/v4_patches/20260531000000_fix_payment_deadline_reminders.sql

-- STAGE 2: Sprint Phases (skip fase16-fase27 if using consolidated_all)
\i migrations/v2_sprint_phases/fase16_new_tables.sql
\i migrations/v2_sprint_phases/fase17_remaining_tables.sql
\i migrations/v2_sprint_phases/fase18_core_settings.sql
\i migrations/v2_sprint_phases/fase19_branch_kpi_targets.sql
\i migrations/v2_sprint_phases/fase20_webhooks_push.sql
\i migrations/v2_sprint_phases/fase20b_chat_bubble_color.sql
\i migrations/v2_sprint_phases/fase21_integration_fixes.sql
\i migrations/v2_sprint_phases/fase22_muthawif_evaluations.sql
\i migrations/v2_sprint_phases/fase23_payments_transaction_id.sql
\i migrations/v2_sprint_phases/fase24_payment_sync_trigger.sql
\i migrations/v2_sprint_phases/fase25_backfill_booking_payment_totals.sql
\i migrations/v2_sprint_phases/fase27_booking_line_items_rls_fixes.sql
\i migrations/v2_sprint_phases/fase28_package_financials.sql
\i migrations/v2_sprint_phases/fase29_passenger_pricing.sql
\i migrations/v2_sprint_phases/fase30_auto_schedule_reminders.sql
\i migrations/v2_sprint_phases/fase31_wa_multiprovider.sql
\i migrations/v2_sprint_phases/fase32_wa_broadcast_campaigns.sql

-- STAGE 3: Numbered Features
\i migrations/v3_numbered_features/063_hotel_room_numbers.sql
\i migrations/v3_numbered_features/064_mahram_room_compatibility.sql
\i migrations/v3_numbered_features/065_equipment_confirmation.sql
\i migrations/v3_numbered_features/065b_hotel_room_capacities.sql
\i migrations/v3_numbered_features/066_equipment_distribution_photo.sql
\i migrations/v3_numbered_features/066b_multi_hotel_per_city.sql
\i migrations/v3_numbered_features/067_package_hpp_templates.sql
\i migrations/v3_numbered_features/067b_package_type_equipment.sql
\i migrations/v3_numbered_features/068_withdrawal_requests_extra.sql
\i migrations/v3_numbered_features/068b_comprehensive_pl_triggers.sql
\i migrations/v3_numbered_features/store_ecommerce.sql
\i migrations/v3_numbered_features/store_product_reviews.sql
\i migrations/v3_numbered_features/doc_sprint2_branch_branding_templates.sql

-- STAGE 4: Timestamped Patches (chronological)
\i migrations/v4_patches/20260508000000_invoice_templates.sql
\i migrations/v4_patches/20260511000842_e411d2d6-c513-4f52-a215-d253fa3ae010.sql
\i migrations/v4_patches/20260511013137_3bc297d2-069e-4766-932e-d34bef33e1a7.sql
\i migrations/v4_patches/20260511014225_688bca84-8c8c-4680-8978-f7bdecf765f4.sql
\i migrations/v4_patches/20260511031434_916b4c99-5ffc-4aea-90b5-901a8c8f1a49.sql
\i migrations/v4_patches/20260511034756_85990413-54bd-4699-a937-f9922dbe50d0.sql
\i migrations/v4_patches/20260511053018_7ec5b9d8-7b02-47db-bab8-463eb7e1df91.sql
\i migrations/v4_patches/20260513111158_6897f5ed-beb4-4b88-b2a2-36c033bbd1d6.sql
\i migrations/v4_patches/20260513114043_30604cc7-99b5-4f94-84f8-8a15b21dfa83.sql
\i migrations/v4_patches/20260513115449_195f75c8-b979-4e48-865e-ed4e86a128aa.sql
\i migrations/v4_patches/20260513121719_d8c71ee7-8a40-4e55-9169-45e5f71c425d.sql
\i migrations/v4_patches/20260513123505_6536670f-a7d0-4bf4-85e6-f57fd00afffe.sql
\i migrations/v4_patches/20260513130746_2d3e4cf1-e483-4919-82da-514d8ed4ecd0.sql
\i migrations/v4_patches/20260513131651_4575cd92-f6a4-40ac-8e17-59828d2948fd.sql
\i migrations/v4_patches/20260513132826_d761930f-0807-413e-b524-8bf1ae810e5a.sql
\i migrations/v4_patches/20260513134512_7988bcaa-2f8a-493d-b489-9376959b45fd.sql
\i migrations/v4_patches/20260513143441_978c0550-16f1-481b-b837-e4da41d45f81.sql
\i migrations/v4_patches/20260513152135_9fd1b871-8089-4d23-ac2c-b49309921872.sql
\i migrations/v4_patches/20260513223955_2b02318f-e799-489e-b332-b9860460484e.sql
\i migrations/v4_patches/20260513230115_fddd400b-e462-489b-8257-9ffe0435285d.sql
\i migrations/v4_patches/20260517153423_create_web_vitals_metrics.sql
\i migrations/v4_patches/20260530000000_add_package_discount.sql
-- 20260531000000 already run above (before fase30)
\i migrations/v4_patches/20260531000001_fix_package_labels.sql
\i migrations/v4_patches/20260603065020_5f82ff73-c0d5-4a04-a820-41fb321e2279.sql

-- STAGE 5: Security Patches
\i patches/20260511033505_dcb564bf-eead-49e8-afdb-5b368cc38dc6.sql
\i patches/20260511033624_5a1f0502-657c-4a7b-bc10-629af2c092c9.sql
\i patches/20260511040151_ee6ab98a-7b60-4b5d-b433-eb976f1ab403.sql
\i patches/20260511040450_0931417e-c9ac-4f95-a214-65187d636527.sql
\i patches/20260513143542_b6675e12-220c-45eb-aad8-6d71ad7fcc5d.sql

-- STAGE 6: Supabase Only (skip for Neon/RDS)
-- \i setup/20260513121035_4ec556b0-0d5b-4591-96be-2f1d6562c67c.sql
-- \i setup/20260513121224_d1eabedd-cfd5-4ce9-928b-2b866c3f7304.sql
-- \i setup/20260513230859_41afb4ce-2a07-46a7-a1f2-23be52d8eb46.sql
```

---

## Dependency Graph (simplified)

```
                    ┌─────────────────────┐
                    │  v1_foundation       │
                    │  (fase0 / consolidated_all) │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼──────────────────┐
              ▼                ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ v2_sprint    │  │ v3_numbered  │  │ v4_patches   │
    │ fase16–fase32│  │ 063–068      │  │ timestamped  │
    └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
           │                 │                  │
           │    ┌────────────┘                  │
           │    │                               │
           ▼    ▼                               ▼
    ┌─────────────────────────────────────────────┐
    │         patches/ (security hardening)        │
    └─────────────────────────────────────────────┘
                               │
                               ▼
    ┌─────────────────────────────────────────────┐
    │      setup/ (Supabase only — optional)       │
    └─────────────────────────────────────────────┘
```

---

## Rollback Strategy

No individual rollback scripts exist for this project. Recommended approach:

1. **Before any migration batch:** `pg_dump -Fc mydb > backup_$(date +%Y%m%d_%H%M%S).dump`
2. **To rollback to a prior state:** `pg_restore -d mydb backup_<timestamp>.dump`
3. **For column additions only:** Manually run `ALTER TABLE <table> DROP COLUMN IF EXISTS <column>;`
4. **For RLS policies:** `DROP POLICY IF EXISTS "<policy_name>" ON <table>;` then recreate original

---

## Known Issues & Warnings

| Issue | Affected Files | Risk | Workaround |
|---|---|---|---|
| `web_vitals_metrics` created twice | archive/20260514030830 + v4_patches/20260517153423 | HIGH | Only run the v4_patches version (archive version excluded) |
| `store_categories` v1 has no IF NOT EXISTS | archive/20260511005638 | HIGH | Excluded from archive — do not run |
| `departures.price_adult` added twice | v4_patches/20260513131651 + v2/fase29 | LOW | Both use IF NOT EXISTS — safe |
| `push_subscriptions` created twice | v4_patches/20260511013137 + v2/fase20_webhooks | LOW | Both use IF NOT EXISTS — safe |
| `update_updated_at_column()` defined in 4 files | Multiple | LOW | All use CREATE OR REPLACE — safe |
| `fase30` requires `payment_deadline_reminders` | v2/fase30 + v4/20260531000000 | MEDIUM | See STAGE 4 note — run 20260531000000 before fase30 |

---

*End of MASTER_INDEX*
*Generated: June 2025 — Vinstour Travel Portal Database Reorganization*
