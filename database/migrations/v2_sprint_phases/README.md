# v2_sprint_phases — Sprint Phase Migrations (Fase 16–32)

## Purpose
Sprint-by-sprint schema additions authored during development. Each `fase##` file
corresponds to a defined development sprint and must be applied **in numeric order**.
These files build on top of `v1_foundation` and extend the schema with new features.

## Contents (in execution order)

| File | Sprint | Purpose | Dependencies |
|---|---|---|---|
| `fase16_new_tables.sql` | Sprint 16 | Large batch: loyalty, muthawif, visa apps, room assignments, WA config, badges, referrals, menu system, role_permissions | v1_foundation |
| `fase17_remaining_tables.sql` | Sprint 17 | Remaining tables: audit_logs, notifications, ibadah tracking, savings plans, withdrawal requests | fase16 |
| `fase18_core_settings.sql` | Sprint 18 | Core settings: `website_settings`, `theme_presets`, `menu_items`, `role_permissions` seed | fase17 |
| `fase19_branch_kpi_targets.sql` | Sprint 19 | `branch_monthly_targets` — monthly KPI targets per branch, branch_manager editable | fase18 |
| `fase20_webhooks_push.sql` | Sprint 20 | Webhook configs, webhook logs, push subscriptions | fase19 |
| `fase20b_chat_bubble_color.sql` | Sprint 20b | Adds `chat_bubble_color` column to `website_settings` | fase20_webhooks_push |
| `fase21_integration_fixes.sql` | Sprint 21 | Store procurement & inventory integration: `store_suppliers`, `store_purchase_orders`, inventory movements | fase20b |
| `fase22_muthawif_evaluations.sql` | Sprint 22 | `muthawif_jamaah_evaluations` — muthawif rates jamaah during departure | fase21 |
| `fase23_payments_transaction_id.sql` | Sprint 23 | Adds `transaction_id`, `payment_type` to `payments` (Midtrans QRIS/VA/GoPay) | fase22 |
| `fase24_payment_sync_trigger.sql` | Sprint 24 | `sync_booking_payment_totals()` trigger — auto-syncs paid_amount/remaining_amount/payment_status | fase23 |
| `fase25_backfill_booking_payment_totals.sql` | Sprint 25 | **Data fix** — backfills existing bookings with correct totals (idempotent, safe to re-run) | fase24 |
| `fase27_booking_line_items_rls_fixes.sql` | Sprint 27 | Creates `booking_line_items`; fixes RLS on customer_documents, customer_mahrams, profiles | fase25 |
| `fase28_package_financials.sql` | Sprint 28 | HPP system: `departure_cost_items`, `departure_expenses`, `departure_other_revenues`, `departure_financial_summary` + `recalculate_departure_financial_summary()` | fase27 |
| `fase29_passenger_pricing.sql` | Sprint 29 | Adds `price_adult`, `child_price_percent`, `infant_price_percent` to `departures` and `packages` | fase28 |
| `fase30_auto_schedule_reminders.sql` | Sprint 30 | Updates UNIQUE constraint on `payment_deadline_reminders`; adds `preview_auto_schedule_reminders()` and `auto_schedule_payment_reminders()` | fase29 + v4_patches/20260531000000 |
| `fase31_wa_multiprovider.sql` | Sprint 31 | Adds `it` role to `app_role`; extends `whatsapp_config`; tightens RLS; `get_wa_config_safe()`; `wa_feature_roadmap` + seed | fase30 |
| `fase32_wa_broadcast_campaigns.sql` | Sprint 32 | Creates `wa_broadcast_campaigns` + `wa_broadcast_logs` | fase31 |

> **Note:** `fase26` has been moved to `archive/` — it was superseded by later RPC implementations in v4_patches.

## Usage
```sql
-- Run in order after v1_foundation:
\i v2_sprint_phases/fase16_new_tables.sql
\i v2_sprint_phases/fase17_remaining_tables.sql
\i v2_sprint_phases/fase18_core_settings.sql
\i v2_sprint_phases/fase19_branch_kpi_targets.sql
\i v2_sprint_phases/fase20_webhooks_push.sql
\i v2_sprint_phases/fase20b_chat_bubble_color.sql
\i v2_sprint_phases/fase21_integration_fixes.sql
\i v2_sprint_phases/fase22_muthawif_evaluations.sql
\i v2_sprint_phases/fase23_payments_transaction_id.sql
\i v2_sprint_phases/fase24_payment_sync_trigger.sql
\i v2_sprint_phases/fase25_backfill_booking_payment_totals.sql
\i v2_sprint_phases/fase27_booking_line_items_rls_fixes.sql
\i v2_sprint_phases/fase28_package_financials.sql
\i v2_sprint_phases/fase29_passenger_pricing.sql
\i v2_sprint_phases/fase30_auto_schedule_reminders.sql
\i v2_sprint_phases/fase31_wa_multiprovider.sql
\i v2_sprint_phases/fase32_wa_broadcast_campaigns.sql
```

## Dependencies
- All files in `v1_foundation/` must be applied first.

## Rollback
- No rollback scripts exist for these phases.
- Recommended: take a DB snapshot before applying each sprint batch.

## Notes
- `fase25_backfill_booking_payment_totals.sql` is a **data migration**, not a schema change.
  It is idempotent and safe to re-run.
- All files use `IF NOT EXISTS` / `CREATE OR REPLACE` guards throughout.
