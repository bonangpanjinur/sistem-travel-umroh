# Database Cleanup Plan — Vinstour Travel Portal
> Identifikasi redundansi, overlap, duplikasi, dan rekomendasi tindakan

---

## Ringkasan Keputusan

| Kategori | Jumlah Tabel |
|----------|-------------|
| KEEP (pertahankan) | ~75 |
| MERGE (gabungkan) | ~15 pasang |
| REMOVE (hapus) | ~35 |
| REDESIGN (rancang ulang) | ~10 |

---

## KEEP — Pertahankan

Tabel ini sudah terdefinisi dengan baik, aktif digunakan, dan tidak redundant.

### Core Auth & Users
- `profiles` — pertahankan, tapi hapus kolom `role TEXT` → pindah ke `user_roles`
- `user_roles` — pertahankan, tapi **GANTI kolom `role` dari TEXT ke `public.app_role` ENUM**
- `permissions_list` — pertahankan
- `role_permissions` — pertahankan, **GANTI kolom `role` TEXT → `public.app_role`**
- `staff_invitations` — pertahankan, **GANTI kolom `role` TEXT → `public.app_role`**
- `otp_codes` — pertahankan
- `user_2fa_settings` — pertahankan

### Organisation
- `branches` — pertahankan
- `agents` — pertahankan
- `muthawifs` — pertahankan
- `employees` — pertahankan
- `membership_plans` — pertahankan
- `agent_commission_tiers` — pertahankan

### Travel Catalog
- `airlines` — pertahankan
- `airports` — pertahankan
- `hotels` — pertahankan
- `hotel_room_capacities` — pertahankan
- `vendors` — pertahankan
- `packages` — pertahankan
- `package_hpp_templates` — pertahankan
- `package_labels` — pertahankan
- `package_groups` — pertahankan
- `departures` — pertahankan
- `departure_multi_hotels` — pertahankan
- `trip_timeline` — pertahankan

### Customers & Jamaah
- `customers` — pertahankan
- `customer_accounts` — pertahankan
- `customer_documents` — pertahankan
- `customer_mahrams` — pertahankan
- `leads` — pertahankan
- `ibadah_progress` — pertahankan

### Bookings
- `bookings` — pertahankan
- `booking_passengers` — pertahankan
- `booking_line_items` — pertahankan
- `booking_seat_locks` — pertahankan
- `booking_access_tokens` — pertahankan
- `approval_configs` — pertahankan
- `approval_requests` — pertahankan

### Payments
- `bank_accounts` — pertahankan
- `payments` — pertahankan
- `coupons` — pertahankan
- `savings_plans` — pertahankan
- `savings_deposits` — pertahankan
- `savings_schedules` — pertahankan
- `payment_deadline_reminders` — pertahankan
- `midtrans_webhook_logs` — pertahankan
- `withdrawal_requests` — pertahankan
- `visa_applications` — pertahankan
- `invoice_templates` — pertahankan

### Finance
- `chart_of_accounts` — pertahankan
- `journal_entries` — pertahankan
- `journal_lines` — pertahankan
- `vendor_invoices` — pertahankan
- `commissions` — pertahankan
- `departure_cost_items` — pertahankan
- `departure_expenses` — pertahankan
- `departure_financial_summary` — pertahankan
- `cashflow_entries` — pertahankan
- `ar_reminder_log` — pertahankan (satu versi saja)
- `payroll` — pertahankan
- `payroll_slips` — pertahankan
- `leave_requests` — pertahankan
- `performance_reviews` — pertahankan

### Equipment
- `equipment_items` — pertahankan
- `equipment_distributions` — pertahankan
- `baggage_reference_items` — pertahankan

### Marketing & CRM
- `referral_codes` — pertahankan
- `referral_usages` — pertahankan
- `loyalty_points` — pertahankan
- `contact_messages` — pertahankan

### Notifications
- `notifications` — pertahankan
- `notification_templates` — pertahankan
- `push_subscriptions` — pertahankan
- `push_outbox` — pertahankan
- `email_logs` — pertahankan
- `email_templates` — pertahankan
- `announcements` — pertahankan
- `banners` — pertahankan
- `sos_alerts` — pertahankan
- `wa_broadcast_campaigns` — pertahankan
- `wa_broadcast_logs` — pertahankan
- `wa_send_logs` — pertahankan
- `wa_templates` — pertahankan
- `whatsapp_config` — pertahankan

### CMS
- `website_settings` — pertahankan
- `faqs` — pertahankan
- `testimonials` — pertahankan
- `gallery_items` — pertahankan
- `contact_page_content` — pertahankan
- `menu_items` — pertahankan
- `media_gallery` — pertahankan

### Audit
- `audit_logs` — pertahankan
- `rbac_audit_trail` — pertahankan

### Settings
- `company_settings` — pertahankan
- `agent_wallets` — pertahankan
- `agent_wallet_transactions` — pertahankan
- `agent_commissions` — pertahankan

### Jamaah App
- `jamaah_badges` — pertahankan
- `jamaah_ibadah_targets` — pertahankan
- `jamaah_jurnal` — pertahankan
- `manasik_sessions` — pertahankan
- `room_assignments` — pertahankan

---

## MERGE — Gabungkan

### 1. `company_settings` + `app_settings`
- **Masalah**: Dua tabel key-value store yang sama tujuannya
- **Aksi**: Merge semua data ke `company_settings`, hapus `app_settings`
- **Cara**: Kolom di `company_settings` sudah cukup (setting_key, setting_value, setting_type, is_public)

### 2. `whatsapp_logs` + `wa_send_logs`
- **Masalah**: Duplikasi log pengiriman WA (beda nama, sama tujuan)
- **Aksi**: Gunakan `wa_send_logs`, hapus `whatsapp_logs`
- **Cara**: Pastikan semua referensi codebase pakai `wa_send_logs`

### 3. `admin_activity_log` + `audit_logs`
- **Masalah**: `admin_activity_log` adalah subset dari `audit_logs`
- **Aksi**: Hapus `admin_activity_log`, gunakan `audit_logs` dengan filter `actor_role`

### 4. `document_audit_logs` + `booking_document_logs`
- **Masalah**: Dua tabel log dokumen yang overlap
- **Aksi**: Gunakan `booking_document_logs` saja, tambahkan kolom `action_type` jika perlu

### 5. `financial_summary` + `departure_financial_summary`
- **Masalah**: `financial_summary` adalah versi lama, tidak digunakan lagi
- **Aksi**: Hapus `financial_summary`, gunakan `departure_financial_summary`

### 6. `vendor_costs` + `departure_cost_items`
- **Masalah**: `vendor_costs` adalah tabel lama untuk HPP, `departure_cost_items` adalah pengganti yang lebih lengkap
- **Aksi**: Migrasikan data `vendor_costs` ke `departure_cost_items`, hapus `vendor_costs`

### 7. `cash_transactions` + `cashflow_entries`
- **Masalah**: Dua tabel untuk arus kas manual dengan struktur mirip
- **Aksi**: Standardkan ke `cashflow_entries` (lebih fleksibel dengan reference_type/reference_id)

### 8. `payroll_components` + `payroll_slips.components (JSONB)`
- **Masalah**: Data komponen gaji ada di JSONB column dan juga tabel terpisah
- **Aksi**: Standardkan ke `payroll_slips.components JSONB` untuk fleksibilitas

### 9. `departure_budgets` + `departure_cost_items`
- **Masalah**: Budget rencana vs aktual bisa digabung dalam satu tabel dengan kolom `is_planned`
- **Aksi**: Tambahkan kolom `is_planned BOOLEAN` di `departure_cost_items`

### 10. `manasik_schedules` + `manasik_sessions`
- **Masalah**: Nama berbeda untuk konsep yang sama
- **Aksi**: Standardkan ke `manasik_sessions`

---

## REMOVE — Hapus

Tabel-tabel ini tidak memiliki penggunaan aktif di codebase, atau sudah digantikan oleh tabel lain.

```
wa_feature_roadmap              — internal notes, bukan database produksi
cancellation_rule_audit_logs    — belum digunakan, cukup audit_logs
siskohat_sync_logs              — integrasi SISKOHAT belum diimplementasi
marketing_campaigns             — belum ada UI/logic
marketing_conversions           — belum ada UI/logic
marketing_metrics               — belum ada UI/logic
loyalty_rewards                 — belum ada UI/logic
loyalty_transactions            — merge ke loyalty_points
support_tickets                 — belum ada UI, gunakan contact_messages saja
chatbot_logs                    — belum ada chatbot
chat_leads                      — belum ada chatbot
exchange_rates                  — belum digunakan, gunakan nilai statis
hotel_contracts                 — belum ada UI/logic
baggage_policies                — belum ada UI/logic
guide_channels                  — fitur guide system tidak aktif
guide_broadcasts                — belum aktif
guide_broadcast_reads           — belum aktif
guide_sessions                  — belum aktif
guide_session_attendance        — belum aktif
guide_locations                 — belum aktif
guide_audio_sessions            — belum aktif (trigger error di migration)
guide_subgroups                 — belum aktif
guide_subgroup_members          — belum aktif
training_quizzes                — belum ada UI
onboarding_templates            — belum ada UI
onboarding_template_items       — belum ada UI
employee_onboarding_tasks       — belum ada UI
career_history                  — belum ada UI
disciplinary_records            — belum ada UI
leave_quotas                    — merge ke leave_requests
booking_feedback                — belum ada UI (gunakan testimonials)
payment_page_tokens             — fungsionalitas masih di booking_access_tokens
scheduled_report_logs           — belum ada scheduled reporting engine
webhook_configs                 — belum ada webhook engine
webhook_logs                    — belum ada webhook engine
discount_requests               — overlap dengan coupons
dashboard_access_config         — fungsionalitas bisa di role_permissions
dashboard_access_audit_log      — merge ke audit_logs
dashboard_stats                 — computed view, bukan tabel permanen
```

---

## REDESIGN — Rancang Ulang

### 1. Role System (KRITIS)
- **Masalah**: `profiles.role TEXT` + `user_roles.role TEXT` + CHECK constraints yang konflik dengan ENUM migration
- **Solusi**: 
  - Hapus `profiles.role` → pindahkan ke `user_roles`
  - Ganti semua kolom `role TEXT` → `public.app_role` ENUM
  - Semua policy gunakan `public.has_role()` bukan inline comparison
  - Tambahkan nilai ENUM baru: `owner`, `it`, `operational`, `operator`, `sales`, `marketing`, `equipment`, `sub_agent`, `jamaah`

### 2. Permission System
- **Masalah**: `role_permissions` pakai TEXT untuk `role`, tidak konsisten dengan ENUM
- **Solusi**: Ganti kolom `role` → `public.app_role`

### 3. Agents & Sub-Agents
- **Masalah**: Sub-agen tidak punya tabel sendiri, bergabung dengan `agents`
- **Solusi**: Tambahkan kolom `parent_agent_id UUID REFERENCES agents(id)` + kolom `type TEXT ('agent','sub_agent')`

### 4. Jamaah App Tables
- **Masalah**: `jamaah_*` tables tersebar tanpa konsistensi (jamaat vs customer naming)
- **Solusi**: Standardkan prefix, pastikan semua ada `customer_id` FK dan `departure_id` FK

### 5. Notifications
- **Masalah**: 4 channel notifikasi (push, WA, email, in-app) dengan tabel terpisah yang tidak konsisten
- **Solusi**: Tambahkan tabel `notification_deliveries` sebagai unified delivery log lintas channel

### 6. Finance - Double Entry Enforcement
- **Masalah**: Journal entries bisa tidak balanced (total_debit ≠ total_credit)
- **Solusi**: Tambahkan trigger CHECK balance sebelum status 'posted'

### 7. Savings System
- **Masalah**: `savings_payments` di codebase tapi tabel sebenarnya `savings_deposits`
- **Solusi**: Standardkan nama → `savings_deposits`, update semua referensi codebase

### 8. Equipment System
- **Masalah**: Tidak ada tracking stok, hanya distribusi
- **Solusi**: Tambahkan kolom `stock_qty`, `distributed_qty`, `returned_qty` di `equipment_items`

### 9. Booking Status Flow
- **Masalah**: `bookings.status` hanya 4 nilai, tidak cukup untuk flow kompleks
- **Solusi**: Tambahkan nilai: `awaiting_documents`, `documents_complete`, `visa_processing`

### 10. Agent Sub-Agent Hierarchy
- **Masalah**: Sub-agen tidak terstruktur di database
- **Solusi**: `agents` self-referencing dengan `parent_agent_id` + `type` enum
