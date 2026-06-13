# Vinstour Travel Portal — Clean Migration Chain (v4)

**Authoritative, idempotent, single-chain migration for Supabase / PostgreSQL.**

## Overview

This directory contains the complete, ordered migration chain that recreates
the entire Vinstour database from scratch on a fresh Supabase project.
It supersedes all previous migration series (v1, v2, v3_Mxx).

## Execution Order

Run files **in sequence** in the Supabase SQL Editor or via `psql`:

| File | Contents |
|------|----------|
| `000_extensions.sql` | Extensions (uuid-ossp, pgcrypto, unaccent, pg_trgm), auth schema stub, roles, utility functions |
| `001_enums.sql` | Domain type documentation (uses TEXT+CHECK, not native ENUMs) |
| `002_tables_core.sql` | profiles, user_roles, permissions_list, role_permissions, staff_invitations, menu_items, audit_logs, notifications, notification_templates, OTP, 2FA, push, email_logs |
| `003_tables_users.sql` | branches, agents, muthawifs, employees, website_settings, membership_plans, agent_commission_tiers, FAQs, testimonials, contact_page_content, gallery_items, package_labels/groups |
| `004_tables_travel.sql` | airlines, airports, hotels, vendors, packages, departures, customers, bookings, payments, savings, operations (visa, manasik, equipment, SOS, approvals), and 30+ related tables |
| `005_tables_finance.sql` | COA, journals, vendor_invoices, commissions, payroll, company_settings, loyalty, departure financials, e-commerce store, WhatsApp/WA tables |
| `006_indexes.sql` | All performance indexes (CREATE INDEX IF NOT EXISTS) |
| `007_functions.sql` | Stored functions & RPCs (generate_booking_code, hold_departure_seats, convert_savings_to_booking, get_public_booking_details, get_wa_config_safe, etc.) |
| `008_triggers.sql` | All triggers (updated_at, slug auto-generation, booking code, payment sync, savings sync, order number) |
| `009_rls_policies.sql` | All Row Level Security policies |
| `010_views.sql` | v_bookings_full, v_departures_with_stats, v_customers_summary, v_departure_pl, v_payments_pending, v_agents_performance, v_wa_send_logs_full, v_inventory_alerts, v_upcoming_departures |
| `011_seed_admin.sql` | Permissions, role_permissions defaults, notification templates, approval configs, COA, bank accounts, website settings, membership plans, airlines, airports, hotels |

## Seed Files

In `seeds/` — run AFTER the 000–011 chain:

| File | Purpose | Environment |
|------|---------|-------------|
| `seed_admin.sql` | Creates super_admin user profile. **Edit UUID before running!** | All |
| `seed_roles.sql` | Standalone role+permission seed (for role resets) | All |
| `seed_master_data.sql` | Full master data (COA, settings, plans, WA roadmap, templates, FAQs) | All |
| `seed_dummy_data.sql` | Demo data: sample packages, departures, store products, banners | **Dev/Staging ONLY** |

## How to Run (Supabase Dashboard)

1. Open **Supabase Dashboard → SQL Editor**
2. For each file in order (000 → 011), paste the contents and click **Run**
3. Confirm each step shows `OK` in the result

## How to Run (psql / CLI)

```bash
# Using psql with your Supabase connection string
PGURL="postgres://postgres:[password]@[host]:5432/postgres"

for f in supabase_clean_migration/0{00..11}*.sql; do
  echo "Running $f..."
  psql "$PGURL" -f "$f"
done

# Then seeds (in order)
psql "$PGURL" -f supabase_clean_migration/seeds/seed_admin.sql
psql "$PGURL" -f supabase_clean_migration/seeds/seed_master_data.sql
# (Optional dev/staging only:)
psql "$PGURL" -f supabase_clean_migration/seeds/seed_dummy_data.sql
```

## Key Design Decisions

### Why TEXT + CHECK instead of PostgreSQL ENUMs?
Adding a new value to a PostgreSQL ENUM requires `ALTER TYPE … ADD VALUE`, which is DDL
and cannot be rolled back in a transaction. TEXT + CHECK allows adding values by simply
updating the constraint, with no downtime risk.

### Why separated RLS policies (009) instead of inline?
Clean separation lets you reset policies without touching table definitions. Each table
file only does `ALTER TABLE … ENABLE ROW LEVEL SECURITY` (no policies). All `CREATE POLICY`
statements live in 009 and are idempotent (DROP IF EXISTS + CREATE).

### Why separate indexes (006)?
Indexes can be created and dropped independently without table changes. Keeping them in
a dedicated file makes it easy to tune performance without touching schema.

### Idempotency
Every file is safe to re-run:
- Tables: `CREATE TABLE IF NOT EXISTS`
- Indexes: `CREATE INDEX IF NOT EXISTS`
- Functions: `CREATE OR REPLACE FUNCTION`
- Triggers: `DROP TRIGGER IF EXISTS` + `CREATE TRIGGER`
- Policies: `DROP POLICY IF EXISTS` + `CREATE POLICY`
- Seeds: `ON CONFLICT DO NOTHING` / `ON CONFLICT DO UPDATE`

## Table Count Summary

| Category | Tables |
|----------|--------|
| Core / Auth | 15 |
| Users / Organisations | 13 |
| Travel / Bookings / Operations | 44 |
| Finance / HR / E-Commerce / WA | 33+ |
| **Total** | **~105** |

## Module Coverage

- ✅ Auth & RBAC (profiles, user_roles, permissions_list, role_permissions)
- ✅ Branch & Agent management
- ✅ Employee & HR (payroll, leave, performance reviews)
- ✅ Travel catalog (airlines, airports, hotels, packages, departures)
- ✅ Customer management & portal
- ✅ Booking lifecycle (confirmed → completed → archived)
- ✅ Payments & payment deadline reminders
- ✅ Tabungan Umroh (savings plans)
- ✅ Visa management
- ✅ Manasik sessions
- ✅ Room assignments
- ✅ Equipment distribution
- ✅ SOS alerts
- ✅ Multi-level approvals (refund, discount, cancellation, vendor_invoice)
- ✅ Finance: COA, double-entry journals, vendor invoices, commissions
- ✅ Departure P&L (cost_items, expenses, other_revenues, financial_summary)
- ✅ E-Commerce (store_categories, products, variants, orders, shipments, reviews)
- ✅ WhatsApp integration (config, templates, send_logs, broadcast campaigns)
- ✅ Notifications (in-app, push, email_logs)
- ✅ Website CMS (website_settings, banners, announcements, FAQs, testimonials, gallery)
- ✅ Audit trail & RBAC audit
