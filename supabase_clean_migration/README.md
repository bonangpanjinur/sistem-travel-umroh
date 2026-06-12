# Raka Travel Portal — Clean Supabase Migration

Folder ini berisi 7 file SQL yang siap dijalankan di project Supabase baru.
Urutan harus diikuti persis karena ada dependensi antar tabel.

## Urutan Eksekusi

| # | File | Isi |
|---|------|-----|
| 1 | `01_extensions_helpers.sql` | uuid-ossp, update_updated_at_column(), slugify_text(), _create_updated_at_trigger() |
| 2 | `02_core_entities.sql` | profiles, user_roles, airlines/hotels/vendors, branches, agents, muthawifs, employees, packages, departures, document_types, menu_items |
| 3 | `03_customers_bookings.sql` | customers, customer_documents, customer_mahrams, bookings (dengan GENERATED remaining_amount & qr_token), booking_passengers, booking_status_history, booking_document_logs, booking_line_items, room_assignments, equipment_distributions, savings_plans, savings_deposits, leads, payment_deadline_reminders, invoice_templates |
| 4 | `04_operations_portal.sql` | customer_accounts, customer_notifications, booking_feedback, email_templates/logs, notifications, support_tickets, announcements, banners, coupons, visa_applications, sos_alerts, whatsapp_config/templates/logs, wa_broadcast_campaigns/logs, wa_feature_roadmap, app_settings, virtual_accounts, agent_monthly_targets, jamaah digital (doa/jurnal/ibadah/badge), approval_requests/actions, notification_templates |
| 5 | `05_finance_hr_company.sql` | payroll_records, leave_requests, leave_quotas, performance_reviews, marketing_campaigns, sales_targets, training_modules/quizzes/progress, vendor_contracts, departure_budgets, media_gallery, baggage_reference_items, approval_configs, agent_override_commissions, membership_plans, agent_memberships, branch_memberships, branch_commissions, company_settings, bank_accounts, website_settings, contact_page_content, siskohat_sync_logs, departure_cost_items, departure_expenses, departure_other_revenues, departure_financial_summary |
| 6 | `06_ecommerce.sql` | store_categories, store_products, store_orders, store_order_items, store_shipments, store_product_reviews |
| 7 | `07_functions_rpc_seed.sql` | Semua stored functions, RPC, slug triggers, seed permissions_list, seed role_permissions, seed menu_items, seed airlines, seed company_settings, seed bank_accounts |

## Cara Pakai

### Via Supabase SQL Editor (Recommended)
1. Buka project Supabase baru di https://supabase.com/dashboard
2. Masuk ke **SQL Editor**
3. Copy-paste isi setiap file secara berurutan (01 → 07)
4. Jalankan satu per satu, pastikan tidak ada error sebelum lanjut ke file berikutnya

### Via Supabase CLI
```bash
supabase db execute --file supabase_clean_migration/01_extensions_helpers.sql
supabase db execute --file supabase_clean_migration/02_core_entities.sql
supabase db execute --file supabase_clean_migration/03_customers_bookings.sql
supabase db execute --file supabase_clean_migration/04_operations_portal.sql
supabase db execute --file supabase_clean_migration/05_finance_hr_company.sql
supabase db execute --file supabase_clean_migration/06_ecommerce.sql
supabase db execute --file supabase_clean_migration/07_functions_rpc_seed.sql
```

## Catatan Penting

### Keputusan Desain
- **Tidak ada `app_role` enum** — semua role menggunakan `TEXT CHECK(...)` agar mudah di-extend tanpa `ALTER TYPE`
- **Role 'it'** sudah disertakan di semua CHECK constraint (dari fase31)
- **`bookings.remaining_amount`** adalah `GENERATED ALWAYS AS (GREATEST(0, total_price - paid_amount)) STORED` — tidak perlu diisi manual
- **`bookings.qr_token`** diset otomatis dengan `gen_random_uuid()::TEXT`
- **`website_settings`** dibuat setelah `agents` dan `branches` di file 05 (urutan dependency benar)
- **`departure_cost_items.created_by`** referensi ke `profiles(id)` bukan `auth.users(id)`

### Fitur yang Termasuk
- ✅ Role-Based Access Control (RBAC) + Row Level Security (RLS) di semua tabel
- ✅ WhatsApp blast & broadcast tersegmentasi (fase31, fase32)
- ✅ Keuangan keberangkatan: HPP, pengeluaran, pendapatan lain, summary (fase28)
- ✅ Reminder deadline pembayaran otomatis (fase30)
- ✅ Invoice dengan QR code (fase26)
- ✅ Portal jamaah digital: doa, jurnal, ibadah tracker, badge
- ✅ Multi-level approval (refund, diskon, pembatalan, invoice vendor)
- ✅ Membership plans untuk agen & cabang
- ✅ E-commerce toko perlengkapan ibadah
- ✅ HR: gaji, cuti, penilaian kinerja, pelatihan agen
- ✅ Slug otomatis untuk agen & cabang
- ✅ 75+ tabel, 20+ stored functions/RPC

### Setelah Migrasi
1. Perbarui `company_settings` dengan data perusahaan yang nyata
2. Perbarui `bank_accounts` dengan rekening asli
3. Perbarui `whatsapp_config` dengan API key provider WA
4. Buat user super_admin pertama via Supabase Auth, lalu insert ke `user_roles`
5. Jalankan seed data manasik & paket contoh jika diperlukan
