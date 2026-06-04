# SQL Migrations — Vinstour Travel Portal

> **Satu-satunya folder SQL yang diakui.** Jangan buat folder SQL baru di tempat lain.

## Struktur

```
sql/
├── README.md                    ← file ini
├── MASTER_FRESH_INSTALL.sql     ← fresh install lengkap (001–061)
├── PATCHES_ONLY.sql             ← patch-patch saja (tanpa foundation)
├── CONSOLIDATED_fase1-20.sql    ← warisan lama (referensi)
└── migrations/                  ← SUMBER KEBENARAN (001–061)
    ├── 001_foundation.sql
    ├── 002_fase1_membership_branch_commission.sql
    ...
    └── 061_sos_departure_routing.sql
```

## Supabase Migrations

File di `supabase/migrations/` dikelola oleh Supabase CLI (UUID-named + named).
Jangan edit manual — gunakan `supabase db diff` untuk generate migrasi baru.

## Cara Pakai Fresh Install

```sql
-- Supabase SQL Editor: paste isi MASTER_FRESH_INSTALL.sql → Run
-- atau via psql:
psql -h HOST -U postgres -d DB -f sql/MASTER_FRESH_INSTALL.sql
```

## Urutan Migration (001–061)

| Rentang | Isi |
|---------|-----|
| 001–016 | Foundation, publik, portal, operasional, WA, settings, RBAC, HR, rooming |
| 017–025 | Leads/CRM, manasik, review, keuangan, tipe baru, fase 18-20 |
| 026–035 | Store e-commerce, review, fase21-22, payments, patch triggers |
| 036–049 | Patch RLS, storage, savings, bookings, 2FA, agent tier, seat lock, face |
| 050–061 | Payment sync trigger, backfill, public RPC, line items, HPP, invoice, FAQ, wisata, SOS |

## Konvensi Penamaan

```
NNN_nama_deskriptif.sql
└── NNN = 3 digit angka berurutan (001, 002, ... 061, 062, ...)
```

Untuk menambah migration baru:
1. Buat file `sql/migrations/062_nama_fitur.sql`
2. Isi dengan `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`
3. Update `sql/MASTER_FRESH_INSTALL.sql` di bagian akhir
4. (Opsional) Buat juga di `supabase/migrations/` dengan timestamp jika pakai Supabase CLI

## Tabel Utama

| Kelompok | Tabel-tabel Utama |
|----------|-------------------|
| Core Booking | `packages`, `departures`, `bookings`, `booking_passengers`, `payments`, `refunds` |
| Pelanggan | `customers`, `customer_documents`, `customer_mahrams`, `customer_notifications` |
| Keuangan | `departure_cost_items`, `departure_expenses`, `departure_financial_summary`, `savings_plans` |
| Keberangkatan | `room_assignments`, `room_occupants`, `attendance_records`, `seat_holds` |
| Equipment | `equipment_categories`, `equipment_items`, `equipment_distributions` |
| Toko | `store_categories`, `store_products`, `store_orders`, `store_order_items`, `store_shipments` |
| Komunikasi | `whatsapp_logs`, `push_subscriptions`, `push_outbox`, `customer_notifications` |
| Agen & Cabang | `agents`, `branches`, `agent_commissions`, `branch_monthly_targets` |
| Loyalitas | `loyalty_points`, `referral_codes`, `coupons`, `jamaah_badges` |
| Keamanan | `user_roles`, `role_permissions`, `audit_logs`, `rbac_audit_trail` |
| Muthawif | `muthawifs`, `muthawif_jamaah_evaluations`, `sos_alerts` |

---
*Terakhir diperbarui: Juni 2026 — 61 migration files*
