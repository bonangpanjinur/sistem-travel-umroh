# v0_missing_tables — 22 Tabel yang Tidak Ada di Migration Asli

## Konteks

Audit mendalam Juni 2025 menemukan **22 tabel** yang direferensikan FK, trigger, RLS policy,
dan RPC function di seluruh 74 file migration — tetapi tidak punya `CREATE TABLE` mana pun.

**Penyebab:** Dibuat langsung via **Supabase Dashboard** (bukan via migration file).

---

## File dalam Folder Ini

| File | Tabel | Jalankan Kapan |
|---|---|---|
| `001_core_business_tables.sql` | `airlines`, `payments`, `departure_hotels`, `loyalty_points`, `agent_commissions` | Setelah fase0_foundation |
| `002_documents_and_access.sql` | `customer_documents`, `referral_codes`, `referral_usages`, `ticket_responses`, `audit_logs`, `user_permissions` | Setelah fase0_foundation |
| `003_catalog_tables.sql` | `package_types`, `equipment_items`, `theme_presets` + seed data | Setelah fase0_foundation |
| `004_operational_tables.sql` | `bus_assignments`, `itineraries`, `manifests`, `luggage`, `vendor_costs`, `jamaah_live_locations`, `room_assignment_audit`, `savings_payments` | Setelah fase0_foundation |
| `005_post_v4patches.sql` | — (hanya ALTER TABLE, menambah FK constraint) | **SETELAH seluruh v4_patches** |

---

## Urutan Wajib

```
fase0_foundation.sql
    ↓
001 → 002 → 003 → 004   [Stage 2]
    ↓
consolidated_fase_11_15.sql
    ↓
v2/fase16 → fase29
    ↓ [⚠️ KRITIS: sebelum fase30]
v4_patches/20260531000000_fix_payment_deadline_reminders.sql
    ↓
v2/fase30 → fase32
    ↓
v3_numbered_features (063–store)
    ↓
v4_patches (semua, chronological, termasuk 20260513111158 yang membuat savings_schedules)
    ↓
005_post_v4patches.sql  ← savings_payments FK → savings_schedules
    ↓
patches/ (security)
    ↓
setup/ (Supabase only)
```

---

## Dependency Antar File

```
001: airlines (no dep)
     payments      → bookings, profiles           [fase0 ✅]
     departure_hotels → departures, hotels         [fase0 ✅]
     loyalty_points   → customers                  [fase0 ✅]
     agent_commissions → agents, bookings          [fase0 ✅]

002: customer_documents → customers, bookings, profiles   [fase0 ✅]
     referral_codes     → agents, profiles                [fase0 ✅]
     referral_usages    → referral_codes [002], bookings  [fase0 ✅]
     ticket_responses   → support_tickets, profiles       [fase0 ✅]
     audit_logs         → profiles                        [fase0 ✅]
     user_permissions   → profiles                        [fase0 ✅]

003: package_types  (no dep — seed: 4 tipe)
     equipment_items (no dep — seed: 12 item)
     theme_presets   (no dep — seed: 7 tema, kolom sudah include 20260511053018 ✅)

004: bus_assignments → departures, vendors         [fase0 ✅]
     itineraries     → departures                  [fase0 ✅]
     manifests       → departures, airlines [001], profiles [fase0 ✅]
     luggage         → departures, bookings, booking_passengers [fase0 ✅]
     vendor_costs    → departures, vendors          [fase0 ✅]
     jamaah_live_locations → departures, customers, profiles [fase0 ✅]
     room_assignment_audit → departures, room_assignments, booking_passengers [fase0 ✅]
     savings_payments → savings_plans [fase0 ✅]
       schedule_id: UUID — TANPA FK (ditambah di 005 setelah savings_schedules ada)

005: ALTER savings_payments ADD CONSTRAINT FK → savings_schedules
     ⚠️ savings_schedules dibuat di v4_patches/20260513111158
     ⚠️ Wajib run SETELAH patch itu
```

---

## Mengapa savings_payments Dipisah?

`savings_payments.schedule_id` butuh FK ke `savings_schedules`.
Tapi `savings_schedules` BARU DIBUAT oleh `v4_patches/20260513111158_6897f5ed.sql`.

Dan patch itu JUGA membuat `TRIGGER ON savings_payments` — jadi `savings_payments`
harus SUDAH ADA sebelum patch itu dijalankan.

**Chicken-and-egg yang diselesaikan dengan:**
1. Buat `savings_payments` di `004` tanpa FK ke `savings_schedules`
2. v4_patches/20260513111158 membuat `savings_schedules` + trigger ON savings_payments
3. Tambahkan FK di `005` setelah keduanya sudah ada

---

## Sifat Idempotent

Semua file menggunakan:
- `CREATE TABLE IF NOT EXISTS` — aman jika tabel sudah ada
- `DROP TRIGGER IF EXISTS X ON table; CREATE TRIGGER X ...` — aman jika trigger sudah ada
- `CREATE INDEX IF NOT EXISTS` — aman jika index sudah ada
- `INSERT ... ON CONFLICT DO NOTHING` — aman jika seed data sudah ada
- `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` — (fase23, v4/20260511053018) aman ✅

---

## Untuk Database Supabase yang Sudah Berjalan

Cek dulu apakah tabel sudah ada:

```sql
SELECT COUNT(*) FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'payments','airlines','departure_hotels','loyalty_points','agent_commissions',
    'customer_documents','referral_codes','referral_usages','ticket_responses',
    'audit_logs','user_permissions','package_types','equipment_items','theme_presets',
    'bus_assignments','itineraries','manifests','luggage','vendor_costs',
    'jamaah_live_locations','room_assignment_audit','savings_payments'
  );
-- Hasil 22 → SKIP folder ini (tabel sudah ada via Dashboard)
-- Hasil < 22 → jalankan file yang dibutuhkan saja
```
