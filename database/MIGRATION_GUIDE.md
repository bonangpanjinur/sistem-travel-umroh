# Panduan Migrasi Database — Vinstour Travel Portal

> Dokumen ini menjelaskan cara setup database Vinstour dari nol maupun
> cara menambahkan missing tables ke database Supabase yang sudah berjalan.
> Dibuat berdasarkan audit mendalam Juni 2025.

---

## Daftar Isi

1. [Syarat Sistem](#syarat-sistem)
2. [Skenario A — Database Baru (PostgreSQL / Neon / RDS)](#skenario-a--database-baru)
3. [Skenario B — Supabase yang Sudah Berjalan](#skenario-b--supabase-yang-sudah-berjalan)
4. [Urutan Migrasi Lengkap & Alasan](#urutan-migrasi-lengkap--alasan)
5. [Dependency Map Semua Tabel](#dependency-map-semua-tabel)
6. [Masalah Umum & Solusinya](#masalah-umum--solusinya)
7. [Verifikasi Setelah Migrasi](#verifikasi-setelah-migrasi)

---

## Syarat Sistem

| Komponen | Versi Minimum | Catatan |
|---|---|---|
| PostgreSQL | 14+ | Butuh `GENERATED ALWAYS AS STORED`, `uuid_generate_v4()` |
| Extension `uuid-ossp` | — | `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"` |
| Extension `pgcrypto` | — | `CREATE EXTENSION IF NOT EXISTS pgcrypto` |
| (Supabase) GoTrue auth | — | Untuk `auth.uid()` dan `auth.users` FK |

---

## Skenario A — Database Baru

Untuk database PostgreSQL baru (Neon, RDS, Supabase project baru, local dev).

### Cara Tercepat — 1 Perintah

```bash
# Dari root project, masuk ke folder database/
cd database

# Jalankan master script (ON_ERROR_STOP aktif — akan berhenti jika ada error)
psql -U postgres -d vinstour_db -f run_all_migrations.sql
```

Script ini akan:
1. Mengaktifkan extensions yang dibutuhkan
2. Menjalankan semua migration dalam urutan yang benar
3. Menampilkan daftar semua tabel yang berhasil dibuat di akhir

### Cara Manual — Step by Step

Jika ingin kontrol penuh, jalankan tiap stage secara manual:

```sql
-- ── STAGE 1: Foundation ─────────────────────────────────────────────────────
-- 27 tabel dasar + fungsi trigger
\i migrations/v1_foundation/fase0_foundation.sql

-- ── STAGE 2: Missing Tables ──────────────────────────────────────────────────
-- 22 tabel yang sebelumnya dibuat via Dashboard (kini ter-dokumentasikan)
\i migrations/v0_missing_tables/001_core_business_tables.sql
\i migrations/v0_missing_tables/002_documents_and_access.sql
\i migrations/v0_missing_tables/003_catalog_tables.sql
\i migrations/v0_missing_tables/004_operational_tables.sql   -- savings_payments TANPA FK savings_schedules

-- ── STAGE 3: Foundation Supplement ──────────────────────────────────────────
\i migrations/v1_foundation/consolidated_fase_11_15.sql

-- ── STAGE 4: Sprint Phases (fase 16–29) ─────────────────────────────────────
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

-- ⚠️ KRITIS: Patch ini WAJIB sebelum fase30
\i migrations/v4_patches/20260531000000_fix_payment_deadline_reminders.sql

\i migrations/v2_sprint_phases/fase30_auto_schedule_reminders.sql
\i migrations/v2_sprint_phases/fase31_wa_multiprovider.sql
\i migrations/v2_sprint_phases/fase32_wa_broadcast_campaigns.sql

-- ── STAGE 5: Numbered Features (v3) ─────────────────────────────────────────
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

-- ── STAGE 6: V4 Patches (chronological) ─────────────────────────────────────
-- ⚠️ 20260531000000 SUDAH dijalankan di STAGE 4 — JANGAN ulangi
-- ⚠️ 20260513111158 membuat savings_schedules + trigger ON savings_payments
\i migrations/v4_patches/20260508000000_invoice_templates.sql
\i migrations/v4_patches/20260511000842_e411d2d6-c513-4f52-a215-d253fa3ae010.sql
\i migrations/v4_patches/20260511013137_3bc297d2-069e-4766-932e-d34bef33e1a7.sql
\i migrations/v4_patches/20260511014225_688bca84-8c8c-4680-8978-f7bdecf765f4.sql
\i migrations/v4_patches/20260511031434_916b4c99-5ffc-4aea-90b5-901a8c8f1a49.sql
\i migrations/v4_patches/20260511034756_85990413-54bd-4699-a937-f9922dbe50d0.sql
\i migrations/v4_patches/20260511053018_7ec5b9d8-7b02-47db-bab8-463eb7e1df91.sql
\i migrations/v4_patches/20260513111158_6897f5ed-beb4-4b88-b2a2-36c033bbd1d6.sql   -- ← savings_schedules dibuat di sini
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
-- 20260531000000 SUDAH dijalankan di STAGE 4 — LEWATI
\i migrations/v4_patches/20260531000001_fix_package_labels.sql
\i migrations/v4_patches/20260603065020_5f82ff73-c0d5-4a04-a820-41fb321e2279.sql

-- ── STAGE 6B: savings_payments FK (setelah savings_schedules ada) ────────────
\i migrations/v0_missing_tables/005_post_v4patches.sql

-- ── STAGE 7: Security Patches ────────────────────────────────────────────────
\i patches/20260511033505_dcb564bf-eead-49e8-afdb-5b368cc38dc6.sql
\i patches/20260511033624_5a1f0502-657c-4a7b-bc10-629af2c092c9.sql
\i patches/20260511040151_ee6ab98a-7b60-4b5d-b433-eb976f1ab403.sql
\i patches/20260511040450_0931417e-c9ac-4f95-a214-65187d636527.sql
\i patches/20260513143542_b6675e12-220c-45eb-aad8-6d71ad7fcc5d.sql

-- ── STAGE 8: Supabase-specific (SKIP jika bukan Supabase) ───────────────────
-- \i migrations/setup/20260513121035_4ec556b0.sql
-- \i migrations/setup/20260513121035_4ec556b0_realtime.sql
-- \i migrations/setup/pgrst_config.sql
```

---

## Skenario B — Supabase yang Sudah Berjalan

> Database Supabase yang sudah aktif SUDAH MEMILIKI semua 22 tabel missing
> (dibuat via Dashboard). File-file di `v0_missing_tables/` menggunakan
> `CREATE TABLE IF NOT EXISTS` sehingga aman dijalankan, tapi tidak wajib.

### Yang Perlu Dilakukan

1. **Cek apakah 22 tabel missing sudah ada:**

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'payments', 'airlines', 'departure_hotels', 'loyalty_points', 'agent_commissions',
    'customer_documents', 'referral_codes', 'referral_usages', 'ticket_responses',
    'audit_logs', 'user_permissions', 'package_types', 'equipment_items', 'theme_presets',
    'bus_assignments', 'itineraries', 'manifests', 'luggage', 'vendor_costs',
    'jamaah_live_locations', 'room_assignment_audit', 'savings_payments'
  )
ORDER BY table_name;
```

Jika hasilnya 22 baris → semua tabel ada, **SKIP** seluruh `v0_missing_tables/`.

2. **Jalankan hanya migration yang belum diapply:**

Supabase menyimpan history migration di tabel `supabase_migrations.schema_migrations`.
Cek migration mana yang belum dijalankan dan jalankan sesuai urutan di MASTER_INDEX.md.

3. **Untuk setup Realtime/PostgREST:**

```sql
-- Hanya pada Supabase — jalankan di SQL Editor Dashboard
\i migrations/setup/20260513121035_4ec556b0.sql
```

---

## Urutan Migrasi Lengkap & Alasan

### Mengapa urutan ini penting?

PostgreSQL menolak `REFERENCES tabel_lain(id)` jika `tabel_lain` belum ada saat `CREATE TABLE` dieksekusi. Ini bukan warning — ini error yang membatalkan seluruh transaksi.

### Diagram Dependency Kritis

```
uuid-ossp + pgcrypto
    │
    ▼
fase0_foundation.sql
    ├── profiles (depends on: auth.users)
    ├── branches (no FK)
    ├── agents (depends on: profiles, branches)
    ├── packages (depends on: branches)
    ├── departures (depends on: packages)
    ├── customers (depends on: profiles, branches)
    ├── bookings (depends on: departures, customers, agents)
    ├── booking_passengers (depends on: bookings, customers)
    ├── room_assignments (depends on: departures, booking_passengers)
    ├── equipment_distributions (depends on: customers, departures)
    ├── savings_plans (depends on: customers)
    ├── support_tickets (depends on: customers, departures)
    └── ... (17 tabel lainnya)
    │
    ▼
v0_missing_tables/001 → 004
    ├── 001: airlines (no FK)
    │         payments → bookings, profiles
    │         departure_hotels → departures, hotels
    │         loyalty_points → customers
    │         agent_commissions → agents, bookings
    ├── 002: customer_documents → customers, bookings, profiles
    │         referral_codes → agents, profiles
    │         referral_usages → referral_codes, bookings, customers   ← internal dep ke 002
    │         ticket_responses → support_tickets, profiles
    │         audit_logs → profiles
    │         user_permissions → profiles
    ├── 003: package_types (no FK) [seed: 4 tipe]
    │         equipment_items (no FK) [seed: 12 item]
    │         theme_presets (no FK) [seed: 7 tema]
    └── 004: bus_assignments → departures, vendors
              itineraries → departures
              manifests → departures, airlines ← dep ke 001
              luggage → departures, bookings, booking_passengers
              vendor_costs → departures, vendors
              jamaah_live_locations → departures, customers, profiles
              room_assignment_audit → departures, room_assignments, booking_passengers, profiles
              savings_payments → savings_plans [schedule_id TANPA FK—ditambah di 005]
    │
    ▼
consolidated_fase_11_15.sql
    │
    ▼
v2_sprint_phases (fase16 → fase29)
    ├── fase16: equipment (inventaris fisik, berbeda dari equipment_items)
    ├── fase23: ALTER payments ADD transaction_id, payment_type
    ├── fase28: departure_cost_items → airlines ← butuh airlines dari 001 ✅
    └── fase29: booking_passengers pricing columns
    │
    ▼ [⚠️ KRITIS: sebelum fase30]
v4_patches/20260531000000_fix_payment_deadline_reminders.sql
    │
    ▼
v2_sprint_phases (fase30 → fase32)
    │
    ▼
v3_numbered_features (063 → store)
    ├── 067b: package_type_equipment → package_types, equipment_items ← butuh dari 003 ✅
    └── store_ecommerce: store_products, store_orders, dll
    │
    ▼
v4_patches (chronological, semua kecuali 20260531000000)
    ├── 20260511000842: trigger ON agent_commissions ← butuh dari 001 ✅
    ├── 20260511031434: trigger ON payments, store_orders ← butuh dari 001 + v3 ✅
    ├── 20260513111158: CREATE savings_schedules + trigger ON savings_payments ← butuh dari 004 ✅
    ├── 20260513114043: trigger ON customer_documents, loyalty_points ← butuh dari 001,002 ✅
    ├── 20260513123505: pwa tabel → airlines ← butuh dari 001 ✅
    └── 20260513143441: ALTER store_* ← butuh dari v3 store_ecommerce ✅
    │
    ▼ [⚠️ savings_schedules baru ada setelah 20260513111158]
v0_missing_tables/005_post_v4patches.sql
    └── ALTER savings_payments ADD CONSTRAINT FK → savings_schedules
    │
    ▼
patches/ (security only — RLS, GRANT, REVOKE)
    ├── 20260511033505: tighten audit_logs RLS ← butuh dari 002 ✅
    ├── 20260511040151: tighten referral_codes/usages RLS ← butuh dari 002 ✅
    └── 20260513143542: GRANT/REVOKE store functions ← butuh dari v3 ✅
    │
    ▼
setup/ (Supabase only — Realtime + PostgREST)
    └── user_permissions ← butuh dari 002 ✅
```

---

## Dependency Map Semua Tabel

### Tabel Tanpa FK (bisa dibuat kapan saja)

| Tabel | Dibuat Di |
|---|---|
| `airlines` | v0_missing_tables/001 |
| `hotels` | fase0_foundation |
| `vendors` | fase0_foundation |
| `branches` | fase0_foundation |
| `package_types` | v0_missing_tables/003 |
| `equipment_items` | v0_missing_tables/003 |
| `theme_presets` | v0_missing_tables/003 |

### Tabel Dengan FK — Layer 1 (depends on auth.users only)

| Tabel | FK |
|---|---|
| `profiles` | auth.users |
| `membership_plans` | (none) |

### Tabel Dengan FK — Layer 2

| Tabel | Depends On |
|---|---|
| `agents` | profiles, branches |
| `packages` | branches |
| `customers` | profiles, branches |
| `muthawifs` | profiles |
| `employees` | branches |
| `leads` | branches, agents |

### Tabel Dengan FK — Layer 3

| Tabel | Depends On |
|---|---|
| `departures` | packages |
| `loyalty_points` | customers |
| `referral_codes` | agents, profiles |
| `savings_plans` | customers |
| `support_tickets` | customers, departures |

### Tabel Dengan FK — Layer 4

| Tabel | Depends On |
|---|---|
| `bookings` | departures, customers, agents |
| `departure_hotels` | departures, hotels |
| `bus_assignments` | departures, vendors |
| `itineraries` | departures |
| `manifests` | departures, airlines, profiles |
| `vendor_costs` | departures, vendors |
| `jamaah_live_locations` | departures, customers, profiles |
| `agent_commissions` | agents, bookings |

### Tabel Dengan FK — Layer 5

| Tabel | Depends On |
|---|---|
| `booking_passengers` | bookings, customers |
| `payments` | bookings, profiles |
| `customer_documents` | customers, bookings, profiles |
| `referral_usages` | referral_codes, bookings, customers |
| `ticket_responses` | support_tickets, profiles |
| `luggage` | departures, bookings, booking_passengers |

### Tabel Dengan FK — Layer 6

| Tabel | Depends On |
|---|---|
| `room_assignments` | departures, booking_passengers |
| `savings_payments` | savings_plans, profiles, savings_schedules (FK: layer 8) |
| `equipment_distributions` | customers, departures |

### Tabel Dengan FK — Layer 7+

| Tabel | Depends On |
|---|---|
| `room_assignment_audit` | departures, room_assignments, booking_passengers, profiles |
| `package_type_equipment` | package_types, equipment_items |
| `savings_schedules` | savings_plans (dibuat di v4_patches/20260513111158) |

---

## Masalah Umum & Solusinya

### ERROR: relation "X" does not exist

**Penyebab:** Tabel X direferensikan sebagai FK sebelum dibuat.

| Tabel X | File yang Gagal | Solusi |
|---|---|---|
| `airlines` | fase28, v4_patches/20260513123505 | Pastikan v0_missing/001 sudah jalan |
| `package_types` | v3/067b_package_type_equipment | Pastikan v0_missing/003 sudah jalan |
| `equipment_items` | v3/067b_package_type_equipment | Pastikan v0_missing/003 sudah jalan |
| `savings_schedules` | v0_missing/004 (versi lama) | Sudah diperbaiki: 004 tidak punya FK lagi |
| `user_permissions` | setup/20260513121035 | Pastikan v0_missing/002 sudah jalan |
| `audit_logs` | patches/ | Pastikan v0_missing/002 sudah jalan |
| `referral_codes` | patches/20260511040151 | Pastikan v0_missing/002 sudah jalan |
| `savings_payments` | v4_patches/20260513111158 | Pastikan v0_missing/004 sudah jalan |

### ERROR: column "X" of relation "Y" does not exist (saat ALTER TABLE)

**Penyebab:** ALTER TABLE mencoba menambah kolom yang sudah ada di v0_missing_tables (karena di v0_missing kolom sudah dibuat lengkap).

| Kolom | Tabel | Di v0_missing | Di Migration |
|---|---|---|---|
| `payment_type`, `transaction_id` | `payments` | 001 (sudah ada) | fase23 (ALTER) |
| `mood`, `radius_style`, dll | `theme_presets` | 003 (sudah ada) | v4_patches/20260511053018 |

**Solusi:** Semua ALTER TABLE menggunakan `ADD COLUMN IF NOT EXISTS` — aman jika kolom sudah ada.
Verifikasi di file fase23 dan v4_patches/20260511053018.

### duplicate key value violates unique constraint (saat INSERT seed)

**Penyebab:** Seed data di v0_missing/003 (package_types, equipment_items, theme_presets) sudah ada.

**Solusi:** Semua INSERT menggunakan `ON CONFLICT DO NOTHING` — aman jika data sudah ada.

---

## Verifikasi Setelah Migrasi

Jalankan query ini untuk memverifikasi semua tabel penting sudah ada:

```sql
-- Cek 22 missing tables
SELECT
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅ ADA' ELSE '❌ MISSING' END AS status
FROM (
  VALUES
    ('payments'), ('airlines'), ('departure_hotels'), ('loyalty_points'),
    ('agent_commissions'), ('customer_documents'), ('referral_codes'),
    ('referral_usages'), ('ticket_responses'), ('audit_logs'),
    ('user_permissions'), ('package_types'), ('equipment_items'),
    ('theme_presets'), ('bus_assignments'), ('itineraries'), ('manifests'),
    ('luggage'), ('vendor_costs'), ('jamaah_live_locations'),
    ('room_assignment_audit'), ('savings_payments')
) AS expected(table_name)
WHERE table_name IN (
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public'
);

-- Hitung total tabel
SELECT COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = 'public';
-- Ekspektasi: ≥ 80 tabel

-- Cek FK savings_payments → savings_schedules
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'savings_payments'
  AND constraint_name = 'fk_savings_payments_schedule_id';
-- Harus muncul 1 baris

-- Cek seed data
SELECT COUNT(*) AS pkg_types FROM package_types;   -- ekspektasi: 4
SELECT COUNT(*) AS equip_items FROM equipment_items; -- ekspektasi: 12
SELECT COUNT(*) AS themes FROM theme_presets;         -- ekspektasi: 7
```

---

## Catatan Penting untuk Neon/RDS (Non-Supabase)

1. **`auth.uid()`** tidak ada → semua RLS policy akan gagal saat dieksekusi.
   Ganti `auth.uid()` dengan implementasi custom (misalnya dari JWT claim atau session variable).

2. **`auth.users`** tidak ada → FK di `profiles.id REFERENCES auth.users(id)` harus diubah.
   Buat tabel `auth_users` sendiri, atau hapus FK tersebut dan kelola di application layer.

3. **`setup/` folder** (Supabase Realtime + PostgREST config) — **SKIP sepenuhnya** pada Neon/RDS.

4. **`storage.objects`** (di patches/20260511040450) → tidak ada pada Neon/RDS, lewati file itu.

---

*Dokumen ini di-generate dari audit mendalam 22 tabel missing, Juni 2025.*
*Update jika ada migration baru yang menambah dependency.*
