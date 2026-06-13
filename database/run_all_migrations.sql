-- ══════════════════════════════════════════════════════════════════════════════
-- VINSTOUR TRAVEL PORTAL — MASTER MIGRATION SCRIPT
-- ══════════════════════════════════════════════════════════════════════════════
--
-- Jalankan file ini untuk setup database baru dari nol (PostgreSQL >= 14).
-- Untuk Supabase yang SUDAH BERJALAN: lihat MIGRATION_GUIDE.md bagian "Existing DB".
--
-- Cara menjalankan:
--   psql -U postgres -d nama_database -f run_all_migrations.sql
--   ATAU dari psql: \i database/run_all_migrations.sql
--
-- Estimasi waktu: 3–10 menit tergantung ukuran data
-- ══════════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on
\timing on

\echo ''
\echo '══════════════════════════════════════════════════════════'
\echo ' VINSTOUR DATABASE MIGRATION — START'
\echo '══════════════════════════════════════════════════════════'
\echo ''

-- ─────────────────────────────────────────────────────────────────────────────
-- PRE-FLIGHT: Extensions
-- ─────────────────────────────────────────────────────────────────────────────
\echo '[PRE-FLIGHT] Enabling extensions...'
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
\echo '[PRE-FLIGHT] ✓ Extensions ready'
\echo ''

-- ─────────────────────────────────────────────────────────────────────────────
-- STAGE 1: Foundation
-- Membuat: profiles, user_roles, role_permissions, hotels, vendors, branches,
--          agents, packages, departures, muthawifs, employees, customers,
--          bookings, booking_passengers, room_assignments, equipment_distributions,
--          savings_plans, savings_deposits, leads, notifications, support_tickets,
--          announcements, banners, coupons, document_types, menu_items,
--          visa_applications, sos_alerts
--          + fungsi: update_updated_at_column(), handle_new_user()
-- ─────────────────────────────────────────────────────────────────────────────
\echo '[STAGE 1] Foundation tables...'
\i migrations/v1_foundation/fase0_foundation.sql
\echo '[STAGE 1] ✓ Foundation complete'
\echo ''

-- ─────────────────────────────────────────────────────────────────────────────
-- STAGE 2: Missing Tables — Group A (Post-Foundation Core)
-- Tabel-tabel yang direferensikan di seluruh codebase tapi tidak ada di migration asli.
-- Semuanya bergantung pada tabel dari STAGE 1.
--
-- 001: airlines, payments, departure_hotels, loyalty_points, agent_commissions
-- 002: customer_documents, referral_codes, referral_usages, ticket_responses,
--      audit_logs, user_permissions
-- 003: package_types, equipment_items, theme_presets  (+ seed data)
-- 004: bus_assignments, itineraries, manifests, luggage, vendor_costs,
--      jamaah_live_locations, room_assignment_audit,
--      savings_payments (TANPA FK ke savings_schedules — ditambah di STAGE 8B)
-- ─────────────────────────────────────────────────────────────────────────────
\echo '[STAGE 2] Missing tables (post-foundation)...'
\i migrations/v0_missing_tables/001_core_business_tables.sql
\i migrations/v0_missing_tables/002_documents_and_access.sql
\i migrations/v0_missing_tables/003_catalog_tables.sql
\i migrations/v0_missing_tables/004_operational_tables.sql
\echo '[STAGE 2] ✓ Missing tables complete'
\echo ''

-- ─────────────────────────────────────────────────────────────────────────────
-- STAGE 3: Foundation Supplement (Fase 11–15)
-- Agent CRM, training, referrals, loyalty programs
-- ─────────────────────────────────────────────────────────────────────────────
\echo '[STAGE 3] Foundation supplement (fase 11-15)...'
\i migrations/v1_foundation/consolidated_fase_11_15.sql
\echo '[STAGE 3] ✓ Foundation supplement complete'
\echo ''

-- ─────────────────────────────────────────────────────────────────────────────
-- STAGE 4: Sprint Phases V2 (Fase 16–29)
-- ─────────────────────────────────────────────────────────────────────────────
\echo '[STAGE 4] Sprint phases v2 (fase 16-29)...'
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
\echo '[STAGE 4] ✓ Sprint phases v2 (16-29) complete'
\echo ''

-- ─────────────────────────────────────────────────────────────────────────────
-- STAGE 4B: ⚠️  CRITICAL PATCH — Harus dijalankan SEBELUM fase30
-- fix_payment_deadline_reminders.sql harus mendahului fase30_auto_schedule_reminders.sql
-- ─────────────────────────────────────────────────────────────────────────────
\echo '[STAGE 4B] Critical patch: fix_payment_deadline_reminders (MUST run before fase30)...'
\i migrations/v4_patches/20260531000000_fix_payment_deadline_reminders.sql
\echo '[STAGE 4B] ✓ Critical patch complete'
\echo ''

-- ─────────────────────────────────────────────────────────────────────────────
-- STAGE 4C: Sprint Phases V2 (Fase 30–32)
-- ─────────────────────────────────────────────────────────────────────────────
\echo '[STAGE 4C] Sprint phases v2 (fase 30-32)...'
\i migrations/v2_sprint_phases/fase30_auto_schedule_reminders.sql
\i migrations/v2_sprint_phases/fase31_wa_multiprovider.sql
\i migrations/v2_sprint_phases/fase32_wa_broadcast_campaigns.sql
\echo '[STAGE 4C] ✓ Sprint phases v2 (30-32) complete'
\echo ''

-- ─────────────────────────────────────────────────────────────────────────────
-- STAGE 5: Numbered Features V3
-- Hotel rooms, mahram compatibility, equipment, multi-hotel, P&L triggers,
-- withdrawal requests, store ecommerce, product reviews, branch branding
-- ─────────────────────────────────────────────────────────────────────────────
\echo '[STAGE 5] Numbered features v3...'
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
\echo '[STAGE 5] ✓ Numbered features v3 complete'
\echo ''

-- ─────────────────────────────────────────────────────────────────────────────
-- STAGE 6: V4 Patches — Chronological
-- ⚠️ 20260531000000 sudah dijalankan di STAGE 4B, di-skip di sini.
-- ⚠️ 20260513111158 membuat tabel savings_schedules + trigger ON savings_payments
-- ─────────────────────────────────────────────────────────────────────────────
\echo '[STAGE 6] V4 patches (chronological)...'
\i migrations/v4_patches/20260508000000_invoice_templates.sql
\i migrations/v4_patches/20260511000842_e411d2d6-c513-4f52-a215-d253fa3ae010.sql
\i migrations/v4_patches/20260511013137_3bc297d2-069e-4766-932e-d34bef33e1a7.sql
\i migrations/v4_patches/20260511014225_688bca84-8c8c-4680-8978-f7bdecf765f4.sql
\i migrations/v4_patches/20260511031434_916b4c99-5ffc-4aea-90b5-901a8c8f1a49.sql
\i migrations/v4_patches/20260511034756_85990413-54bd-4699-a937-f9922dbe50d0.sql
\i migrations/v4_patches/20260511053018_7ec5b9d8-7b02-47db-bab8-463eb7e1df91.sql
\i migrations/v4_patches/20260513111158_6897f5ed-beb4-4b88-b2a2-36c033bbd1d6.sql
-- ↑ 20260513111158 membuat: savings_schedules + trigger ON savings_payments
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
-- 20260531000000 SUDAH dijalankan di STAGE 4B — JANGAN dijalankan lagi
\i migrations/v4_patches/20260531000001_fix_package_labels.sql
\i migrations/v4_patches/20260603065020_5f82ff73-c0d5-4a04-a820-41fb321e2279.sql
\echo '[STAGE 6] ✓ V4 patches complete'
\echo ''

-- ─────────────────────────────────────────────────────────────────────────────
-- STAGE 6B: ⚠️  savings_payments FK — harus SETELAH savings_schedules ada
-- savings_schedules dibuat di STAGE 6 (patch 20260513111158)
-- FK ditambahkan di sini setelah savings_schedules pasti sudah ada.
-- ─────────────────────────────────────────────────────────────────────────────
\echo '[STAGE 6B] Adding savings_payments FK to savings_schedules...'
\i migrations/v0_missing_tables/005_post_v4patches.sql
\echo '[STAGE 6B] ✓ FK savings_payments → savings_schedules added'
\echo ''

-- ─────────────────────────────────────────────────────────────────────────────
-- STAGE 7: Security Patches
-- RLS tightening, GRANT/REVOKE, storage policies
-- ─────────────────────────────────────────────────────────────────────────────
\echo '[STAGE 7] Security patches...'
\i ../patches/20260511033505_dcb564bf-eead-49e8-afdb-5b368cc38dc6.sql
\i ../patches/20260511033624_5a1f0502-657c-4a7b-bc10-629af2c092c9.sql
\i ../patches/20260511040151_ee6ab98a-7b60-4b5d-b433-eb976f1ab403.sql
\i ../patches/20260511040450_0931417e-c9ac-4f95-a214-65187d636527.sql
\i ../patches/20260513143542_b6675e12-220c-45eb-aad8-6d71ad7fcc5d.sql
\echo '[STAGE 7] ✓ Security patches complete'
\echo ''

-- ─────────────────────────────────────────────────────────────────────────────
-- STAGE 8: Supabase-Specific Setup (OPSIONAL — skip pada Neon/RDS)
-- Realtime publication + PostgREST config
-- ─────────────────────────────────────────────────────────────────────────────
-- \echo '[STAGE 8] Supabase Realtime + PostgREST...'
-- \i migrations/setup/20260513121035_4ec556b0.sql
-- \i migrations/setup/20260513121035_4ec556b0_realtime.sql
-- \i migrations/setup/pgrst_config.sql
-- \echo '[STAGE 8] ✓ Supabase setup complete'

\echo ''
\echo '══════════════════════════════════════════════════════════'
\echo ' VINSTOUR DATABASE MIGRATION — COMPLETED SUCCESSFULLY'
\echo '══════════════════════════════════════════════════════════'
\echo ''
\echo 'Tabel yang sudah dibuat:'
SELECT schemaname, tablename, tableowner
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
