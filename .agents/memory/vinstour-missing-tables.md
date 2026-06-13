---
name: Vinstour Missing Tables Discovery & Migration Order
description: 22 tabel yang direferensikan di migration tetapi tidak punya CREATE TABLE — dibuat via Supabase Dashboard. Termasuk fix kritis savings_payments FK ordering.
---

## Temuan
Audit mendalam Juni 2025 menemukan 22 tabel hilang dari 74 file migration Vinstour Travel Portal.

## Tabel yang Hilang (ada di v0_missing_tables/)
- Core: `payments`, `airlines`, `departure_hotels`, `loyalty_points`, `agent_commissions`
- Dokumen: `customer_documents`, `referral_codes`, `referral_usages`, `ticket_responses`, `audit_logs`, `user_permissions`
- Katalog: `package_types`, `equipment_items`, `theme_presets`
- Operasional: `bus_assignments`, `itineraries`, `manifests`, `luggage`, `vendor_costs`, `jamaah_live_locations`, `room_assignment_audit`, `savings_payments`

## Masalah Kritis: savings_payments ↔ savings_schedules

**CHICKEN-AND-EGG:**
- `savings_payments` (v0/004) harus ada SEBELUM v4_patches/20260513111158 (patch itu pasang trigger ON savings_payments)
- `savings_schedules` baru dibuat di v4_patches/20260513111158
- savings_payments.schedule_id punya FK ke savings_schedules → circular!

**SOLUSI:** 
- 004 buat savings_payments TANPA FK ke savings_schedules (kolom `schedule_id UUID` saja)
- 005_post_v4patches.sql tambahkan FK setelah savings_schedules ada

## Urutan Wajib (Error-Free)
```
fase0_foundation → v0/001-004 → consolidated_fase_11_15
→ v2/fase16-29 → v4_patches/20260531000000 → v2/fase30-32
→ v3_numbered_features → v4_patches (semua chronological)
→ v0/005_post_v4patches → patches/ → setup/
```

## FK Dependencies Kritis Terverifikasi
- `airlines` → fase28 (v2) dan v4/20260513123505 → dibuat di 001 (Stage 2, sebelum v2 ✅)
- `package_types`, `equipment_items` → v3/067b → dibuat di 003 (Stage 2, sebelum v3 ✅)
- `savings_payments` → v4/20260513111158 (trigger) → dibuat di 004 tanpa FK ✅
- `agent_commissions` → v4/20260511000842 (trigger) → dibuat di 001 ✅
- `customer_documents`, `loyalty_points` → v4/20260513114043 (trigger) → dibuat di 001/002 ✅
- store_* → v4/20260513143441 (ALTER) → dibuat di v3/store_ecommerce ✅
- patches/ file `audit_logs`, `referral_*` → ada di v0/002 ✅

## Trigger Safety
Semua 17 trigger di v0/001-004 menggunakan `DROP TRIGGER IF EXISTS` sebelum `CREATE TRIGGER`.
Semua 22 tabel menggunakan `CREATE TABLE IF NOT EXISTS` + `INSERT ... ON CONFLICT DO NOTHING`.

## Files Kunci
- `database/run_all_migrations.sql` — master script, jalankan 1 file ini
- `database/MIGRATION_GUIDE.md` — dokumentasi lengkap
- `database/MASTER_INDEX.md` — urutan detail + penjelasan tiap stage
- `database/migrations/v0_missing_tables/005_post_v4patches.sql` — HANYA FK constraint

**Why:** savings_schedules tidak ada di fase0 atau v0_missing, hanya ada setelah v4 patch tertentu.
**How to apply:** Selalu jalankan 005 SETELAH seluruh v4_patches, bukan bersama 001-004.
