# Migration Gap Report — Vinstour Travel Portal
> Gap analysis per migration file dalam `supabase_clean_migration/`
> Dibandingkan terhadap `database_audit/gap_analysis.md` & `database_audit/table_inventory.md`
> Generated: 2025-07-06

---

## Ringkasan Eksekutif

| Metrik | Nilai |
|--------|-------|
| Total file migration clean | 14 file (000–013) |
| Total tabel di clean migration | ~95 tabel |
| Total tabel di blueprint/audit | ~180 tabel |
| Tabel IMPLEMENTED (lengkap) | 71 |
| Tabel PARTIAL (ada tapi tidak lengkap) | 11 |
| Tabel MISSING (belum ada) | ~98 |
| Permission keys di seed | 30 dari 176+ |
| Gap permission keys | ~146 kunci |

---

## File 000 — `000_extensions.sql`

**Status: ✅ LENGKAP**

| Komponen | Status | Catatan |
|----------|--------|---------|
| uuid-ossp | ✅ | `gen_random_uuid()` ready |
| pgcrypto | ✅ | `gen_random_bytes()` ready |
| pg_trgm | ✅ | Full-text search ready |
| unaccent | ✅ | Accent-insensitive search |
| btree_gin | ✅ | JSONB indexing |
| Schema `public` grant | ✅ | |

**Gap:** Tidak ada gap pada file ini.

---

## File 001 — `001_enums.sql`

**Status: ⚠️ PARTIAL**

| Komponen | Status | Catatan |
|----------|--------|---------|
| `app_role` ENUM | ⚠️ | Hanya 8 role — blueprint membutuhkan 14 role |
| Role missing | ❌ | `owner`, `it`, `operational`, `sales`, `equipment`, `sub_agent` tidak ada |
| `booking_status` | ✅ | |
| `payment_status` | ✅ | |
| `visa_status` | ✅ | |
| `package_type` | ✅ | |

**Gap Kritis:**
- `app_role` hanya mencakup: `super_admin, admin, finance, marketing, operator, branch_manager, agent, customer`
- Blueprint/permission_matrix membutuhkan: `owner, it, operational, sales, equipment, sub_agent, jamaah` (tambahan 6 role)
- File `013_role_enum.sql` / `013_role_enum_fixed.sql` mencoba memperbaiki ini (lihat catatan file 013)

---

## File 002 — `002_tables_core.sql`

**Status: ✅ LENGKAP (untuk scope-nya)**

| Tabel | Status | Catatan |
|-------|--------|---------|
| `profiles` | ✅ | FK ke auth.users, RLS enabled |
| `user_roles` | ✅ | Fine-grained RBAC |
| `permissions_list` | ✅ | Master permission registry |
| `role_permissions` | ✅ | Role → permission mapping |
| `staff_invitations` | ✅ | |
| `menu_items` | ✅ | Dynamic navigation config |
| `audit_logs` | ✅ | Immutable change log |
| `rbac_audit_trail` | ✅ | RBAC-specific history |
| `notification_templates` | ✅ | |
| `notifications` | ✅ | In-app notification inbox |
| `otp_codes` | ✅ | |
| `user_2fa_settings` | ✅ | TOTP/SMS/Email |
| `push_subscriptions` | ✅ | Web-push endpoints |
| `push_outbox` | ✅ | Queued push delivery |
| `email_logs` | ✅ | Outgoing email records |

**Gap dari Blueprint:**
- `user_permission_overrides` — override per-user, ada di blueprint, TIDAK ADA di 002
- `login_attempts` — rate-limiting tabel, TIDAK ADA
- `dashboard_access_config` — config widget per role, TIDAK ADA
- `dashboard_access_audit_log` — TIDAK ADA
- `access_policies` — policy ABAC tingkat lanjut, TIDAK ADA
- `activity_logs` — beda dengan `audit_logs` (lebih granular), TIDAK ADA
- `company_features` — feature flags, TIDAK ADA

---

## File 003 — `003_tables_users.sql`

**Status: ⚠️ PARTIAL**

| Tabel | Status | Catatan |
|-------|--------|---------|
| `branches` | ✅ | Multi-cabang dengan meta_data |
| `agents` | ✅ | Lengkap dengan plan_type, commission_rate |
| `muthawifs` | ✅ | Tour guide pool |
| `employees` | ✅ | Staff internal |
| `website_settings` | ✅ | Per-agent/branch CMS config |
| `membership_plans` | ✅ | Agent & branch subscription |
| `agent_commission_tiers` | ✅ | Tiered commission brackets |
| `faqs` | ✅ | |
| `testimonials` | ✅ | |
| `contact_page_content` | ✅ | |
| `gallery_items` | ✅ | |
| `package_labels` | ✅ | |
| `package_groups` | ✅ | |

**Gap dari Blueprint:**
- `customers` — TIDAK ADA di 003 (kemungkinan ada di 004 atau di-skip)
- `departments` — departemen HR, TIDAK ADA
- `sub_agents` — relasi sub-agen ke agen, TIDAK ADA (agent table ada `max_sub_agents` tapi tidak ada tabel relasi)
- `agent_wallets` / `agent_wallet_transactions` — disebutkan di blueprint, TIDAK ADA
- `employee_contracts` — kontrak karyawan, TIDAK ADA
- `warning_letters` — surat peringatan, TIDAK ADA
- `job_openings` / `job_applications` — rekrutmen, TIDAK ADA

---

## File 004 — `004_tables_travel.sql`

**Status: ⚠️ PARTIAL (terbesar)**

| Tabel | Status | Catatan |
|-------|--------|---------|
| `packages` | ✅ | Lengkap dengan multi-harga kamar |
| `departures` | ✅ | |
| `airlines` | ✅ | iata_code + icao_code |
| `airports` | ✅ | |
| `hotels` | ✅ | star_rating + distance_to_haram |
| `hotel_room_capacities` | ✅ | |
| `vendors` | ✅ | |
| `bookings` | ✅ | |
| `booking_passengers` | ✅ | Detail jamaah per booking |
| `booking_line_items` | ✅ | |
| `booking_seat_locks` | ✅ | |
| `booking_access_tokens` | ✅ | |
| `booking_document_logs` | ✅ | |
| `booking_feedback` | ✅ | |
| `booking_installment_schedules` | ✅ | Cicilan |
| `approval_configs` | ✅ | Multi-level approval |
| `approval_requests` | ✅ | |
| `ibadah_progress` | ✅ | Tracking tawaf/sa/dll |
| `contact_messages` | ✅ | Form kontak website |
| `sos_alerts` | ✅ | Alert darurat jamaah |
| `payments` | ✅ | |
| `bank_accounts` | ✅ | |
| `savings_programs` | ✅ | Tabungan umroh |
| `saving_transactions` | ✅ | |
| `visa_applications` | ✅ | |
| `documents` | ✅ | |
| `room_assignments` | ✅ | |
| `equipment_items` | ✅ | Basic inventory |
| `equipment_distributions` | ✅ | Distribusi ke jamaah |
| `manasik_sessions` | ✅ | |
| `manasik_attendances` | ✅ | |
| `leads` | ✅ | CRM leads |
| `lead_activities` | ✅ | |
| `coupons` | ✅ | |
| `coupon_usages` | ✅ | |
| `announcements` | ✅ | |
| `banners` | ✅ | |
| `landing_page_sections` | ⚠️ | Ada di 004, tapi landing_pages sendiri TIDAK ADA |

**Gap Kritis (tabel TIDAK ADA di 004):**

| Tabel Missing | Kelompok | Dampak |
|---------------|----------|--------|
| `customers` | Jamaah | **KRITIS** — tidak ada tabel jamaah/customer utama |
| `customer_documents` | Jamaah | KRITIS |
| `customer_mahrams` | Jamaah | |
| `bus_providers` | Transportasi | Modul Bus tidak bisa berjalan |
| `bus_assignments` | Transportasi | |
| `bus_passengers` | Transportasi | |
| `manifests` | Operasional | Manifest keberangkatan |
| `departure_checklists` | Operasional | |
| `departure_itineraries` | Operasional | Bernama `trip_timeline` di blueprint lama |
| `departure_hotels` | Operasional | Bernama `departure_multi_hotels` di lama |
| `haji_registrations` | Haji | Modul Haji tidak bisa berjalan |
| `haji_waiting_progress` | Haji | |
| `jamaah_qr_codes` | Jamaah | QR check-in |
| `jamaah_live_locations` | Jamaah | GPS tracking |
| `booking_transfers` | Booking | Transfer booking antar paket |
| `customer_family_relations` | Jamaah | Hubungan keluarga |
| `luggage` | Operasional | Manajemen bagasi |
| `virtual_accounts` | Pembayaran | VA otomatis |
| `cash_transactions` | Keuangan | Kasir manual |

**Inkonsistensi Nama Tabel:**

| Nama di Clean Migration | Nama di Blueprint/Audit | Status |
|------------------------|------------------------|--------|
| `journal_lines` | `journal_entry_lines` | Perlu kesesuaian — clean migration pakai `journal_lines` |
| `equipment_items` | `equipment_items` | ✅ Sama |
| _(tidak ada)_ | `departure_itineraries` | MISSING |
| _(tidak ada)_ | `departure_hotels` | MISSING |

---

## File 005 — `005_tables_finance.sql`

**Status: ⚠️ PARTIAL**

| Tabel | Status | Catatan |
|-------|--------|---------|
| `chart_of_accounts` | ✅ | |
| `journal_entries` | ✅ | Double-entry |
| `journal_lines` | ✅ | Debit/kredit lines |
| `vendor_invoices` | ✅ | |
| `commissions` | ✅ | Agen + karyawan |
| `payroll` | ✅ | Periode penggajian |
| `payroll_slips` | ✅ | Slip gaji individual |
| `leave_requests` | ✅ | Pengajuan cuti |
| `performance_reviews` | ✅ | |
| `loyalty_points` | ✅ | Basic loyalty |
| `withdrawal_requests` | ✅ | |
| `departure_cost_items` | ✅ | HPP/biaya per departure |
| `departure_expenses` | ✅ | |
| `departure_other_revenues` | ✅ | |
| `departure_financial_summary` | ✅ | Aggregate P&L |
| `cashflow_entries` | ✅ | |
| `scheduled_reports` | ✅ | |
| `ar_reminder_log` | ✅ | |
| `store_categories` | ✅ | E-Commerce |
| `store_products` | ✅ | |
| `store_product_variants` | ✅ | |
| `store_orders` | ✅ | |
| `store_order_items` | ✅ | |
| `store_order_payments` | ✅ | |
| `store_shipments` | ✅ | |
| `store_product_reviews` | ✅ | |
| `whatsapp_config` | ✅ | |
| `wa_templates` | ✅ | |
| `wa_send_logs` | ✅ | |
| `whatsapp_logs` | ⚠️ | Legacy compat — harus dihapus di masa depan |
| `wa_broadcast_campaigns` | ✅ | |
| `wa_broadcast_logs` | ✅ | |
| `wa_feature_roadmap` | ✅ | |

**Gap dari Blueprint:**
- `payroll_components` — komponen gaji custom, TIDAK ADA
- `attendance_records` — absensi harian karyawan, TIDAK ADA
- `leave_quotas` — kuota cuti per karyawan, TIDAK ADA
- `loyalty_transactions` — riwayat transaksi poin, TIDAK ADA
- `loyalty_rewards` — katalog hadiah poin, TIDAK ADA
- `loyalty_point_expiry` — TIDAK ADA
- `vendor_contracts` — kontrak vendor, TIDAK ADA
- `marketing_campaigns` — kampanye marketing umum (berbeda dari wa_broadcast_campaigns), TIDAK ADA
- `marketing_materials` — materi marketing, TIDAK ADA
- `marketing_material_downloads` — TIDAK ADA

---

## File 006 — `006_indexes.sql`

**Status: ⚠️ PARTIAL**

- Index untuk tabel 002–005 ada, tapi index untuk tabel yang MISSING di 031+ belum ada
- Perlu ditambah file `040_indexes_extended.sql` setelah tabel baru dibuat

---

## File 007 — `007_functions.sql`

**Status: ✅ LENGKAP (untuk scope saat ini)**

| Fungsi | Status |
|--------|--------|
| `has_role(uuid, app_role)` | ✅ |
| `has_any_role(uuid, app_role[])` | ✅ |
| `can_access_branch(uuid, uuid)` | ✅ |
| `has_permission(uuid, text, text)` | ✅ |
| `get_user_branches(uuid)` | ✅ |
| `fn_update_timestamps()` | ✅ |
| `fn_audit_log()` | ✅ |
| Fungsi P&L / financial summary | ✅ |

**Gap:** Perlu tambahan fungsi utility untuk jamaah QR, live location, siskohat setelah tabel baru ada.

---

## File 008 — `008_triggers.sql`

**Status: ⚠️ PARTIAL**

- Trigger update_timestamps sudah dipasang di tabel 002–005
- Trigger audit_log sudah dipasang untuk tabel sensitif
- Trigger untuk tabel baru (031+) perlu ditambah ke `039_rls_extended.sql`

---

## File 009 — `009_rls_policies.sql`

**Status: ⚠️ PARTIAL — KRITIS**

- RLS policy sudah ada untuk tabel 002–005
- RLS policies **BELUM ADA** untuk semua tabel yang MISSING (031+)
- Semua policy sudah menggunakan `has_role()`, `has_any_role()`, `can_access_branch()` — ✅ BENAR
- Tidak ada inline `role = 'admin'` checks — ✅ BENAR

---

## File 010 — `010_views.sql`

**Status: ✅ LENGKAP (untuk scope saat ini)**

| View | Status |
|------|--------|
| `v_bookings_full` | ✅ |
| `v_departures_with_stats` | ✅ |
| `v_customers_summary` | ✅ |
| `v_departure_pl` | ✅ |
| `v_payments_pending` | ✅ |
| `v_agents_performance` | ✅ |
| `v_wa_send_logs_full` | ✅ |
| `v_inventory_alerts` | ✅ |
| `v_upcoming_departures` | ✅ |

**Gap:** View untuk manifest, haji, bus, equipment extended perlu ditambah setelah tabel 031+ ada.

---

## File 011 — `011_seed_admin.sql`

**Status: ❌ INCOMPLETE — KRITIS**

### Permission Keys Seed

| Aspek | Status | Detail |
|-------|--------|--------|
| Permission keys di-seed | ⚠️ | 30 dari 176+ yang dibutuhkan |
| Role super_admin | ✅ | Auto-assign semua permission |
| Role admin | ✅ | Auto-assign semua minus audit-logs delete |
| Role finance | ⚠️ | 11 permission keys (lengkap untuk modul ada) |
| Role marketing | ⚠️ | 11 permission keys |
| Role operator | ⚠️ | Partial |
| Role branch_manager | ⚠️ | Partial |
| Role agent | ⚠️ | Partial |
| Role owner | ❌ | Tidak ada di seed |
| Role it | ❌ | Tidak ada di seed |
| Role operational | ❌ | Tidak ada di seed |
| Role sales | ❌ | Tidak ada di seed |
| Role equipment | ❌ | Tidak ada di seed |
| Role sub_agent | ❌ | Tidak ada di seed |
| Role jamaah | ❌ | Tidak ada di seed |

### Permission Keys yang Belum Ada

Berdasarkan `permission_matrix.md`, permission key berikut BELUM ada di seed:
```
bookings.view, bookings.create, bookings.edit, bookings.cancel, bookings.confirm,
bookings.transfer, bookings.export, bookings.history,
payments.view, payments.input, payments.verify, payments.reject, payments.refund, payments.export,
customers.view, customers.create, customers.edit, customers.upload_docs,
customers.verify_docs, customers.view_location, customers.portal, customers.delete,
packages.view_draft, packages.view_public, packages.create, packages.edit,
packages.publish, packages.delete,
departures.view, departures.create, departures.edit, departures.itinerary,
departures.checklist, departures.manifest,
finance.view_report, finance.journal, finance.approve_journal, finance.hpp,
finance.input_hpp, finance.approve_expense, finance.vendor_invoice,
finance.view_coa, finance.manage_coa, finance.export,
employees.view, employees.create, employees.edit,
payroll.view_own_slip, payroll.process, leave.approve, leave.submit,
performance.review, attendance.view,
agents.view, agents.create, agents.edit, agents.commission, agents.wallet,
equipment.view, equipment.create, equipment.edit, equipment.distribute,
equipment.bulk_distribute, equipment.stock_opname, equipment.confirm, equipment.report,
marketing.view_lead, marketing.manage_lead, marketing.materials,
marketing.landing_page, marketing.campaign, marketing.coupons, marketing.loyalty,
cms.settings, cms.faqs, cms.testimonials, cms.banners, cms.gallery,
cms.announcements, cms.about, cms.knowledge_base,
system.manage_users, system.assign_roles, system.manage_permissions,
system.settings, system.feature_flags, system.audit_logs, system.dashboard_config,
system.invite_staff, system.export,
bus.manage_providers, bus.assign_departure, bus.passengers, bus.luggage,
haji.register, haji.edit, haji.monitor, haji.export,
store.view, store.manage_products, store.manage_orders, store.manage_shipments,
whatsapp.send, whatsapp.templates, whatsapp.broadcast, whatsapp.config,
vendor.view, vendor.create, vendor.edit, vendor.contracts,
savings.view, savings.manage,
visa.view, visa.process,
sos.view, sos.respond,
reports.view, reports.export, reports.schedule,
siskohat.sync, siskohat.view,
chatbot.view, chatbot.configure
```

**Total: ~146 permission keys hilang**

### Data Seed Lainnya

| Seed | Status | Catatan |
|------|--------|---------|
| Airlines | ✅ | 9 maskapai |
| Airports | ✅ | 9 bandara |
| Hotels | ✅ | 13 hotel |
| FAQs | ✅ | 5 FAQ |
| Package groups | ✅ | 6 grup |
| WA feature roadmap | ✅ | |
| Branches (default) | ❌ | Tidak ada branch seed |
| Chart of Accounts | ❌ | Tidak ada COA seed |
| Notification templates | ❌ | Tidak ada seed |

---

## File 012 — `012_link_auth_tables.sql`

**Status: ✅ LENGKAP**

- Link auth.users → profiles trigger terpasang
- Handle new user signup
- Fungsi dan trigger on_auth_user_created sudah benar

---

## File 013 — `013_role_enum.sql` / `013_role_enum_fixed.sql` / `013_audit_role_deps.sql`

**Status: ⚠️ KONFLIK — Ada 3 file dengan nomor sama**

| File | Status | Catatan |
|------|--------|---------|
| `013_audit_role_deps.sql` | ⚠️ | Audit dependencies role enum |
| `013_role_enum.sql` | ⚠️ | Mencoba tambah role baru ke enum |
| `013_role_enum_fixed.sql` | ⚠️ | Fixed version dari 013_role_enum |

**Masalah:**
1. Tiga file dengan nomor 013 — ambigu, tidak bisa dijalankan berurutan
2. Perubahan ENUM yang backward-compatible sangat sulit di PostgreSQL (ALTER TYPE ADD VALUE butuh non-transactional)
3. Solusi rekomendasi: gunakan TEXT column dengan CHECK constraint (sudah diterapkan di 002_tables_core), bukan ENUM
4. File 013 harus di-resolve sebelum deployment

---

## Subfolder `new/` dan `seeds/`

**Status: ❓ BELUM DIANALISIS**

- Subfolder `new/` dan `seeds/` ada tapi tidak dicek dalam scope audit ini
- Kemungkinan berisi draft tabel atau seed data tambahan
- Perlu di-review dan diintegrasikan ke chain utama

---

## Summary Gap Table

| File | Total Tabel | Implemented | Partial | Missing Gap |
|------|-------------|-------------|---------|-------------|
| 000 | — | ✅ | — | 0 |
| 001 | — | ⚠️ | 6 role hilang | Role enum incomplete |
| 002 | 15 | 15 | 0 | 7 tabel sistem |
| 003 | 13 | 13 | 0 | 7 tabel HR/org |
| 004 | 35+ | 27 | 8 | 19 tabel travel kritis |
| 005 | 34 | 33 | 1 | 10 tabel finance/HR |
| 006 | — | ⚠️ | — | Index untuk tabel baru |
| 007 | — | ✅ | — | Fungsi utility baru |
| 008 | — | ⚠️ | — | Trigger untuk tabel baru |
| 009 | — | ⚠️ | — | RLS untuk tabel baru |
| 010 | — | ✅ | — | View untuk modul baru |
| 011 | — | ❌ | — | 146 permission keys |
| 012 | — | ✅ | — | 0 |
| 013 | — | ⚠️ | — | Konflik 3 file + enum issue |

---

## Rekomendasi File Migration Tambahan

Berikut file yang harus ditambahkan untuk menutup semua gap:

| File | Konten |
|------|--------|
| `031_tables_travel_extended.sql` | customers, bus_providers/assignments/passengers, manifests, departure_checklists, departure_itineraries, departure_hotels, haji_registrations |
| `032_tables_hr_extended.sql` | departments, attendance_records, payroll_components, leave_quotas, employee_contracts, warning_letters |
| `033_tables_equipment_extended.sql` | equipment_categories, equipment_variants, equipment_photos, equipment_stock_history, equipment_stock_opname |
| `034_tables_crm_extended.sql` | customer_family_relations, jamaah_qr_codes, jamaah_live_locations, booking_transfers, marketing_campaigns, loyalty_transactions, loyalty_rewards |
| `035_tables_content.sql` | blog_posts, blog_categories, blog_tags, landing_pages, about_page_content, company_features, office_assets |
| `036_tables_system_extended.sql` | support_tickets, support_messages, vendor_contracts, cancellation_policies, virtual_accounts, access_policies, user_permission_overrides, dashboard_access_config |
| `037_tables_advanced.sql` | siskohat_registrations, siskohat_sync_logs, chatbot_conversations, chatbot_messages, cash_transactions, activity_logs |
| `038_seed_permissions_complete.sql` | 176+ permission keys + role_permissions untuk semua role |
| `039_rls_extended.sql` | RLS policies untuk semua tabel baru 031–037 |
| `040_indexes_extended.sql` | Indexes untuk tabel baru 031–037 |
