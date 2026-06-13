---
name: Vinstour Missing Tables Discovery
description: 22 tabel yang direferensikan di migration tetapi tidak punya CREATE TABLE — dibuat via Supabase Dashboard
---

## Temuan
Audit mendalam Juni 2025 menemukan 22 tabel hilang dari 74 file migration Vinstour Travel Portal.
Tabel-tabel ini direferensikan di FK, trigger, RLS policy, tapi tidak punya CREATE TABLE mana pun.

**Penyebab:** Dibuat langsung via Supabase Dashboard, tidak pernah di-commit ke migration files.

## Tabel yang Hilang (sudah dibuatkan di v0_missing_tables/)
- Core: `payments`, `airlines`, `departure_hotels`, `loyalty_points`, `agent_commissions`
- Dokumen: `customer_documents`, `referral_codes`, `referral_usages`, `ticket_responses`, `audit_logs`, `user_permissions`
- Katalog: `package_types`, `equipment_items`, `theme_presets`
- Operasional: `bus_assignments`, `itineraries`, `manifests`, `luggage`, `vendor_costs`, `jamaah_live_locations`, `room_assignment_audit`, `savings_payments`

## Migration Files Baru
`database/migrations/v0_missing_tables/001-004_*.sql`

**Why:** grep CREATE TABLE missed these — mereka tidak ada karena dibuat via Dashboard.
**How to apply:** Jalankan setelah fase0_foundation.sql, sebelum fase16.
Jika Supabase DB sudah berjalan, SKIP (tabel sudah ada di DB).

## Hal Penting
- `user_permissions` setup error (42P01) terjadi karena tabel ini hilang — bukan masalah urutan
- `theme_presets` kolom-kolomnya sudah di-include di 003_catalog_tables.sql — jangan jalankan ALTER TABLE dari v4_patches/20260511053018 lagi
- `payments.transaction_id` & `payment_type` sudah di-include di 001 — jangan jalankan fase23 ALTER lagi untuk DB baru
