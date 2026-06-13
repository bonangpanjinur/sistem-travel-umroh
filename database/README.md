# Vinstour Travel Portal — Database

> Umroh/Haji Travel Management System — PostgreSQL Schema
> Reorganized: June 2025

## Folder Structure

```
database/
├── migrations/
│   ├── v1_foundation/       Core schema — enums, RBAC, all base tables
│   ├── v2_sprint_phases/    Sprint-by-sprint schema additions (fase16–fase32)
│   ├── v3_numbered_features/ Feature migrations (063–068) + store + branding
│   └── v4_patches/          Timestamped column/table/trigger patches
├── patches/                 Security-only: GRANT/REVOKE, RLS tightening
├── setup/                   Supabase-only: Realtime + PostgREST (skip on Neon/RDS)
├── archive/                 Deprecated & superseded files — do NOT run
├── docs/                    Documentation artifacts
├── README.md                This file
└── MASTER_INDEX.md          Complete migration index with execution order
```

## Quick Start — Fresh Database

```sql
-- Option A: Single-shot (recommended)
\i migrations/v1_foundation/consolidated_all.sql

-- Then apply sprint phases 28–32 (covered after consolidated_all):
\i migrations/v2_sprint_phases/fase28_package_financials.sql
\i migrations/v2_sprint_phases/fase29_passenger_pricing.sql
\i migrations/v2_sprint_phases/fase30_auto_schedule_reminders.sql
\i migrations/v2_sprint_phases/fase31_wa_multiprovider.sql
\i migrations/v2_sprint_phases/fase32_wa_broadcast_campaigns.sql

-- Then numbered features:
\i migrations/v3_numbered_features/063_hotel_room_numbers.sql
-- ... (see MASTER_INDEX.md for full ordered list)

-- Then patches (chronological):
-- ... (see MASTER_INDEX.md)

-- Security hardening:
\i patches/20260511033505_dcb564bf.sql
-- ... (see MASTER_INDEX.md)

-- Supabase only (skip for Neon/RDS):
\i setup/20260513121035_4ec556b0.sql
-- ...
```

See **MASTER_INDEX.md** for the complete ordered execution list.

## Key Statistics

| Metric | Value |
|---|---|
| Total SQL files | 75 |
| Active migrations | 47 |
| Archived (superseded) | 8 |
| Security patches | 5 |
| Supabase-only setup | 3 |
| Core schema size | 147 KB (consolidated_all.sql) |
| Total tables | ~80+ |
| Roles defined | 14 (super_admin, owner, branch_manager, operational, sales, marketing, hr, equipment, agent, sub_agent, customer, jamaah, visa_officer, it) |

## Domain Coverage

| Domain | Tables |
|---|---|
| Auth & RBAC | profiles, user_roles, role_permissions, user_permissions |
| Branches & Agents | branches, agents, agent_commissions, agent_leads, withdrawal_requests |
| Packages & Departures | packages, package_types, departures, departure_hotels, departure_financial_summary |
| Bookings & Payments | bookings, booking_passengers, booking_line_items, payments, booking_status_history |
| Customers (Jamaah) | customers, customer_documents, customer_mahrams |
| Hotels & Airlines | hotels, airlines, hotel_room_capacities |
| Equipment | equipment_items, equipment_distributions, package_type_equipment |
| Financial | departure_cost_items, departure_expenses, departure_other_revenues |
| WhatsApp | whatsapp_config, wa_messages, payment_deadline_reminders, wa_broadcast_campaigns |
| Store / E-Commerce | store_categories, store_products, store_orders, store_order_items, store_shipments |
| Loyalty | loyalty_points, jamaah_badges, referral_codes, referral_usages |
| Muthawif | muthawifs, muthawif_jamaah_evaluations |
| Training | training_modules, agent_training_completions |
| Settings | website_settings, theme_presets, invoice_templates, menu_items |
| Monitoring | web_vitals_metrics, audit_logs, pwa_install_events |
