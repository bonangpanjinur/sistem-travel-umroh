# Rencana SQL — Vinstour Travel Portal
## Analisis Komprehensif Semua SQL + Rencana Migrasi Fresh (PostgreSQL/Neon)
### Diperbarui: Juni 2026 — mencakup semua file fase0–fase32, sql/migrations/ 001–086, timestamp 20260508–20260603, store, keuangan, branding, SDM lanjutan, Drizzle ORM

---

## 1. INVENTARIS LENGKAP SEMUA FILE SQL

### A. File Fase (supabase/migrations/)

| File | Isi Utama |
|------|-----------|
| `fase0_foundation.sql` | Core tables: profiles, user_roles, role_permissions, branches, agents, packages, departures, bookings, customers, employees, muthawifs, hotels, airlines, vendors, savings_plans, savings_deposits, leads, notifications, support_tickets, announcements, banners, coupons, document_types, menu_items, visa_applications, sos_alerts |
| `consolidated_all.sql` | Konsolidasi fase1–fase20: website_settings, payments, wa_templates, wa_send_logs, faqs, chatbot_logs, app_settings, cancellation_rules, dll. |
| `consolidated_fase_13_14_15.sql` | Fase 13–15: equipment, manasik, dokumen, pelatihan agen |
| `store_ecommerce.sql` | store_categories, store_products, store_orders, store_order_items, store_shipments, store_carts, store_order_counters |
| `store_product_reviews.sql` | store_product_reviews |
| `doc_sprint2_branch_branding_templates.sql` | branches: signature_url, stamp_url, logo_url, letterhead_data; document_templates |
| `fase16_new_tables.sql` | approval_requests, approval_actions, dashboard_access_config, dashboard_access_audit_log, dashboard_stats, financial_summary, transactions, expenses, marketing_campaigns, marketing_metrics, marketing_conversions, equipment (office assets), equipment_maintenance, equipment_damage, sales_targets, trip_timeline, booking_document_logs, notification_templates, sos_alerts (v2 — konflik), visa_status_logs (v1) |
| `fase17_remaining_tables.sql` | vendor_contracts, departure_budgets, training_modules, training_quizzes, agent_training_progress, media_gallery, siskohat_sync_logs, approval_configs, agent_override_commissions, baggage_reference_items |
| `fase18_core_settings.sql` | company_settings, bank_accounts, airlines (standalone), app_settings |
| `fase19_branch_kpi_targets.sql` | branch_kpi_targets, branch_monthly_targets |
| `fase20_chat_bubble_color.sql` | website_settings: chat_bubble_color |
| `fase20_webhooks_push.sql` | webhooks, webhook_logs, push_subscriptions, push_outbox |
| `fase21_integration_fixes.sql` | customer_notifications, jamaah_checklist, attendance, visa_status_logs (v2 — konflik), room_occupants, kolom room_number di bookings |
| `fase22_muthawif_evaluations.sql` | muthawif_evaluations |
| `fase23_payments_transaction_id.sql` | payments: transaction_id column |
| `fase24_payment_sync_trigger.sql` | sync_booking_payment_totals() trigger |
| `fase25_backfill_booking_payment_totals.sql` | Backfill existing booking totals |
| `fase26_public_booking_rpc_qr_settings.sql` | get_public_booking_details(), invoice_templates QR columns |
| `fase27_booking_line_items_rls_fixes.sql` | booking_line_items, fix RLS customer_documents/mahrams/profiles |
| `fase28_package_financials.sql` | departure_cost_items, departure_expenses, departure_other_revenues, departure_financial_summary |
| `fase29_passenger_pricing.sql` | departures: price_adult, child_price_percent, infant_price_percent |
| `fase30_auto_schedule_reminders.sql` | preview/auto_schedule_payment_reminders(), UNIQUE(booking_id, days_before) |
| `fase31_wa_multiprovider.sql` | whatsapp_config multi-provider, get_wa_config_safe(), wa_feature_roadmap, role 'it' |
| `fase32_wa_broadcast_campaigns.sql` | wa_broadcast_campaigns, wa_broadcast_logs |
| `20260517…web_vitals_metrics.sql` | web_vitals_metrics |
| `20260530…add_package_discount.sql` | packages: discount_amount, discount_percentage |
| `20260531…fix_payment_deadline_reminders.sql` | payment_deadline_reminders (standalone) |
| `20260531…fix_package_labels.sql` | package_labels, package_label_assignments |
| `20260602_*`, `20260603_*` | Patch kecil |

---

### B. File Numbered Migrations (sql/migrations/ — 001–086)

| File | Isi Utama |
|------|-----------|
| `001–020` | Foundation, branch, booking, payment, customer (salinan fase0) |
| `021_invoice_templates.sql` | invoice_templates |
| `022_doc_security_features.sql` | booking_verify_tokens, customer_signatures, audit_logs |
| `023_agent_membership_tiers.sql` | agent_tier_config, membership_tier column di agents, trigger auto-upgrade |
| `024_agent_tier_trigger_fix.sql` | Fix trigger tier tanpa column restriction |
| `025_sdm_sprint1.sql` | payroll_components, employee_payroll_components, disciplinary_letters, employee_training_progress |
| `026_sdm_disciplinary_career.sql` | disciplinary_records, career_history |
| `027_payroll_slips_ess.sql` | payroll_slips (ESS portal) |
| `028_leave_requests.sql` | leave_requests, leave_quotas + triggers |
| `029_sdm_contracts_recruitment.sql` | employee_contracts, job_postings, job_applicants |
| `030_onboarding_checklist.sql` | onboarding_templates, onboarding_template_items, employee_onboarding_tasks |
| `031_position_training_curricula.sql` | position_training_curricula |
| `032_training_notifications.sql` | training_notification_settings, training_notification_log |
| `033_auto_commission_booking_confirmed.sql` | agent_commissions, trigger auto-komisi |
| `033_departure_pl_triggers.sql` | Trigger P&L otomatis booking+payment |
| `034_performance_reviews.sql` | performance_reviews |
| `034_push_subscriptions_role_branch_agent.sql` | push_subscriptions: role+branch_id+agent_id columns |
| `035_document_numbering.sql` | document_numbering_sequences, get_next_document_number() |
| `035_equipment_unit_cost.sql` | equipment_items: unit_cost column |
| `036_package_view_count.sql` | packages: view_count, RPC analytics |
| `039_journal_entries.sql` | journal_entries (double-entry accounting) |
| `040_accounting_tables.sql` | chart_of_accounts, general_ledger, account_periods |
| `041_auto_journal_triggers.sql` | Trigger auto-jurnal dari payments & bookings |
| `042_v_financial_summary_view.sql` | VIEW v_financial_summary |
| `043_booking_installment_schedules.sql` | booking_installment_schedules |
| `046_agent_commission_tiers.sql` | agent_commission_tiers |
| `047_rbac_audit_trail.sql` | rbac_audit_trail |
| `048_booking_seat_lock.sql` | booking_seat_locks |
| `049_face_descriptor_column.sql` | customers: face_descriptor column (biometrik) |
| `063_hotel_room_numbers.sql` | booking_passengers: room_number_makkah, room_number_madinah, room_hotel_notes |
| `064_auto_pl_trigger.sql` | Trigger P&L saat departure status → 'completed' |
| `064_mahram_room_compatibility.sql` | check_mahram_room_conflicts() function |
| `065_equipment_confirmation.sql` | equipment_distributions: confirmed_by_jamaah, confirmed_at |
| `065_hotel_room_capacities.sql` | hotel_room_capacities |
| `066_equipment_distribution_photo.sql` | equipment_distributions: distribution_photo_url |
| `066_multi_hotel_per_city.sql` | departure_hotels: city, sync_departure_hotel_city() trigger |
| `067_package_hpp_templates.sql` | package_hpp_templates |
| `067_package_type_equipment.sql` | package_type_equipment |
| `068_comprehensive_pl_triggers.sql` | Trigger P&L menyeluruh pada bookings/cost/expense/revenue |
| `068_withdrawal_requests_extra.sql` | withdrawal_requests: rejection_reason, processed_at, bank_details |
| `069_sdm_sprint1_disciplinary_career.sql` | Salinan/perbaikan SDM sprint1 |
| `070_payroll_slips_ess.sql` | payroll_slips versi final |
| `073_document_numbering.sql` | Penomoran dokumen final |
| `081_waiting_list.sql` | departure_waiting_list |
| `082_sprint_c.sql` | departure_muthawifs, hotel_contracts, hotel_vouchers, sos_escalation_log |
| `083_sprint_d_height_clothing_size.sql` | customers: height_cm, weight_kg, clothing_size; suggest_clothing_size() |
| `084_v_financial_summary_v2.sql` | VIEW v_financial_summary v2 (hpp_planned+realized+margin) |
| `085_departure_expense_approval.sql` | departure_expenses: approval columns |
| `086_ar_reminder_log.sql` | ar_reminder_log |

---

### C. File Timestamp Migrations (supabase/migrations/ — 20260508–20260603)

| File | Isi Utama |
|------|-----------|
| `20260508_invoice_templates` | invoice_templates |
| `20260511_e411d2d6` | attribute_commission_to_parent() trigger, agent_commissions |
| `20260511_a74d5d05` | store_categories, store_products, store_orders, store_order_items, store_shipments, store_carts, store_order_counters |
| `20260511_3bc297d2` | push_subscriptions |
| `20260511_688bca84` | ibadah_progress |
| `20260511_916b4c99` | push_outbox |
| `20260513_*` | savings_schedules, seat_holds, booking_access_tokens, booking_transfers, departure_surveys, exchange_rates, jamaah_badges, jamaah_daily_attendance, loyalty_point_expiry, midtrans_webhook_logs, package_labels, package_label_assignments, pwa_install_events, store_purchase_orders, store_purchase_order_items, store_suppliers, store_stock_movements, store_opname_sessions, store_opname_lines, store_low_stock_alerts, store_po_counters, tier_benefits, training_modules, training_quizzes, agent_training_progress, web_vitals_metrics, manasik_schedules, savings_schedules, baggage_policies, support_tickets |

---

### D. File Standalone / Khusus

| File | Lokasi | Isi Utama |
|------|--------|-----------|
| `MASTER_FRESH_MIGRATION.sql` | `supabase_clean_migration/` | Master migrasi 17 tahap |
| `keuangan-fase1-accounting.sql` | `migrations/` | COA, journal_entries, account_periods, general_ledger |
| `keuangan-auto-journal-triggers.sql` | `migrations/` | Auto-jurnal dari payments/expenses |
| `passenger-type-pricing.sql` | `artifacts/umrah-haji/src/lib/migrations/` | price_adult, child/infant_price_percent di departures+packages |

---

### E. Skema Drizzle ORM (lib/db/src/schema/index.ts)

Tabel yang didefinisikan via Drizzle (digunakan API server — akses langsung ke Neon PostgreSQL):

| Drizzle Model | Tabel DB | Kolom Kunci Drizzle |
|---|---|---|
| `cancellationRules` | `cancellation_rules` | id, name, is_default, sections (JSONB) |
| `packages` | `packages` | + fee_branch, booking_mode |
| `departures` | `departures` | + price_adult, child_price_percent, infant_price_percent |
| `pushSubscriptions` | `push_subscriptions` | id, customer_id, endpoint (UNIQUE), p256dh, auth_key, muthawif_id, user_id, role, branch_id, agent_id |
| `websiteSettings` | `website_settings` | id, agent_id, branch_id, company_name, theme, colors, fonts, footer_*, testimonials/gallery_urls (JSONB) |
| `leads` | `leads` | id, name, phone, email, package_id, source, status, branch_id, agent_id |
| `apiKeys` | `api_keys` | id, key_hash, name, permissions (JSONB), is_active, last_used_at |
| `customers` | `customers` | id, user_id, branch_id, full_name, nik, passport_number, nomor_porsi_haji |
| `bookings` | `bookings` | id, booking_code, booking_status, room_type, adult/child/infant_count, total/paid/remaining_amount |
| `payments` | `payments` | id, booking_id, payment_code, amount, status, payment_method, proof_url |
| `appSettings` | `app_settings` | id, key (UNIQUE), value |
| `faqs` | `faqs` | id, question, answer, category, sort_order, is_published |
| `chatbotLogs` | `chatbot_logs` | id, session_id, message, answer, source, user_id, channel, rating |
| `waTemplates` | `wa_templates` | id, code (UNIQUE), name, message_template, variables (JSONB) |
| `bookingPassengers` | `booking_passengers` | id, booking_id, customer_id, is_main_passenger, passenger_type, room_number, roommate_id |
| `refunds` | `refunds` | id, booking_id, customer_id, amount, refund_method, reason, status |
| `waSendLogs` | `wa_send_logs` | id, recipient_phone, message_content, status, sent_at, template_code, departure_id |

---

## 2. DAFTAR LENGKAP SEMUA TABEL (Inventaris Final)

### KATEGORI A — Core Auth & RBAC (5 tabel)

| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `profiles` | id (FK auth.users), full_name, avatar_url, phone, is_active | auth.users |
| `user_roles` | user_id, role (TEXT CHECK), branch_id | auth.users, branches |
| `role_permissions` | role, permission_key | — |
| `user_permissions` | user_id, permission_key | auth.users |
| `api_keys` | key_hash, name, permissions (JSONB), is_active | — |

**app_role values (TEXT CHECK constraint):**
```
super_admin, owner, admin, branch_manager, finance, operational,
sales, marketing, hr, equipment, agent, sub_agent, customer,
jamaah, visa_officer, it
```

---

### KATEGORI B — Organisasi (15 tabel)

| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `branches` | id, name, slug, manager_user_id, logo_url, signature_url, stamp_url, letterhead_data, commission_rate | auth.users |
| `agents` | id, branch_id, user_id, parent_agent_id, agent_code, commission_rate, level, tier, membership_tier, slug | branches, auth.users, self |
| `agent_tier_config` | tier_name, min_bookings, commission_bonus_pct, benefits (JSONB) | — |
| `agent_memberships` | agent_id, membership_plan_id, status, started_at | agents, membership_plans |
| `agent_monthly_targets` | agent_id, year, month, target_amount | agents |
| `agent_commission_tiers` | agent_id, tier_level, min_bookings, rate | agents |
| `agent_override_commissions` | agent_id, booking_id, sub_agent_id, override_percentage | agents, bookings |
| `agent_training_progress` | agent_id, module_id, status, quiz_score | agents, training_modules |
| `employees` | id, branch_id, user_id, full_name, employee_code, position, department, npwp, height_cm, weight_kg, clothing_size | branches, auth.users |
| `muthawifs` | id, branch_id, user_id, certification_number, languages[], rating | branches, auth.users |
| `muthawif_evaluations` | muthawif_id, departure_id, booking_id, rating, notes | muthawifs, departures, bookings |
| `departure_muthawifs` | departure_id, muthawif_id, role | departures, muthawifs |
| `vendors` | id, type, name, npwp, bank_account, is_active | — |
| `vendor_contracts` | vendor_id, branch_id, contract_number, service_type, status | vendors, branches |
| `membership_plans` | id, name, min_bookings, commission_bonus_pct, benefits (JSONB) | — |

---

### KATEGORI C — Paket & Keberangkatan (20 tabel)

| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `packages` | id, branch_id, cancellation_rule_id, name, type, price_quad/triple/double/single, price_adult, child/infant_price_percent, quota, discount_amount, discount_percentage, booking_mode, fee_branch, view_count | branches, cancellation_rules |
| `cancellation_rules` | id, name, is_default, sections (JSONB) | — |
| `package_labels` | id, branch_id, slug, name, color, icon, sort_order | branches |
| `package_label_assignments` | package_id, label_id | packages, package_labels |
| `package_hpp_templates` | id, package_id, category, description, unit, quantity, unit_cost, currency | packages |
| `package_reviews` | package_id, user_id, rating, comment, is_published | packages, auth.users |
| `package_types` | id, name, code | — |
| `package_type_equipment` | package_type_id, equipment_item_id, default_quantity, is_required | package_types, equipment |
| `departures` | id, package_id, muthawif_id, departure_date, return_date, quota, price_adult, price_child, price_infant, child_price_percent, infant_price_percent, status | packages, muthawifs |
| `departure_hotels` | departure_id, hotel_id, hotel_role, airline_id, city | departures, hotels, airlines |
| `departure_cost_items` | departure_id, category, location, hotel_id, airline_id, unit, quantity, unit_cost, currency, exchange_rate, total_cost_idr (GENERATED) | departures, hotels, airlines |
| `departure_expenses` | departure_id, booking_id, category, amount, currency, exchange_rate, amount_idr (GENERATED), approved_by | departures, bookings |
| `departure_other_revenues` | departure_id, booking_id, category, amount, currency, exchange_rate, amount_idr (GENERATED) | departures, bookings |
| `departure_financial_summary` | departure_id, revenue_gross, hpp_total, expense_total, gross_profit, net_profit (GENERATED), gross_margin_pct | departures |
| `departure_budgets` | departure_id, category, budgeted_amount, pax_count, per_pax_amount — UNIQUE(departure_id, category) | departures |
| `departure_surveys` | departure_id, booking_id, rating, feedback | departures, bookings |
| `departure_waiting_list` | departure_id, customer_id, position, status | departures, customers |
| `airlines` | id, name, iata_code (UNIQUE), country, is_active, logo_url | — |
| `hotels` | id, name, city, country, stars, address, is_active | — |
| `hotel_room_capacities` | hotel_id, room_type, total_rooms | hotels |
| `hotel_contracts` | hotel_id, departure_id, contracted_rooms, contract_date, notes | hotels, departures |
| `hotel_vouchers` | hotel_contract_id, voucher_code, room_type, check_in, check_out | hotel_contracts |

---

### KATEGORI D — Booking & Pembayaran (17 tabel)

| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `bookings` | id, booking_code (UNIQUE), customer_id, departure_id, agent_id, branch_id, status, payment_status, room_type, total_pax, adult/child/infant_count, base_price, total_price, discount_amount, paid_amount, remaining_amount, payment_deadline, bagasi_kg_allowed, room_number | customers, departures, agents |
| `booking_passengers` | booking_id, customer_id, is_main_passenger, passenger_type, room_number, room_number_makkah, room_number_madinah, roommate_id, special_requests | bookings, customers |
| `booking_line_items` | booking_id, passenger_id, item_type, description, quantity, unit_price, total_price | bookings |
| `booking_status_history` | booking_id, old_status, new_status, changed_by | bookings, auth.users |
| `booking_access_tokens` | booking_id, token, expires_at, used_at | bookings |
| `booking_transfers` | from_booking_id, to_booking_id, reason, approved_by | bookings |
| `booking_document_logs` | booking_id, doc_type, file_url, generated_by, generated_at | bookings |
| `booking_installment_schedules` | booking_id, installment_number, amount, due_date, status, paid_at | bookings |
| `seat_holds` | departure_id, session_id, room_type, quantity, expires_at, released_at | departures |
| `booking_seat_locks` | departure_id, booking_id, room_type, locked_at, expires_at | departures, bookings |
| `payments` | booking_id, payment_code, amount, status, payment_method, bank_name, proof_url, transaction_id, verified_by | bookings |
| `refunds` | booking_id, customer_id, amount, refund_method, account_info, reason, status | bookings, customers |
| `payment_deadline_reminders` | booking_id, days_before, status, phone, full_name, payment_deadline, remaining_amount — UNIQUE(booking_id, days_before) | bookings |
| `room_assignments` | departure_id, room_number, room_type, hotel_name, hotel_location | departures |
| `room_occupants` | room_assignment_id, customer_id, bed_number — UNIQUE(room_assignment_id, customer_id) | room_assignments, customers |
| `midtrans_webhook_logs` | order_id (TEXT), event_type, status, payload (JSONB) | — |
| `ar_reminder_log` | booking_id, sent_at, days_before, channel, status | bookings |

---

### KATEGORI E — Customer & Jamaah (18 tabel)

| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `customers` | id, branch_id, user_id, full_name, nik, passport_number, nomor_porsi_haji, embarkasi_kode, height_cm, weight_kg, clothing_size | branches, auth.users |
| `customer_documents` | customer_id, document_type_id, file_url, expiry_date, status | customers, document_types |
| `customer_mahrams` | customer_id, mahram_customer_id, relationship | customers |
| `customer_accounts` | customer_id, balance, loyalty_tier, tier_expires_at | customers |
| `customer_notifications` | customer_id, type, title, message, link, is_read, read_at | customers |
| `visa_applications` | customer_id, booking_id, status (pending→approved→rejected), visa_number, passport_number | customers, bookings |
| `visa_status_logs` ⚠️ | customer_id, old_status, new_status, changed_by — *2 versi, lihat §8* | customers |
| `siskohat_sync_logs` | branch_id, sync_type, record_count, status, file_url | branches |
| `loyalty_points` | customer_id, points, tier | customers |
| `loyalty_point_expiry` | customer_id, points, expires_at | customers |
| `jamaah_badges` | user_id, badge_type, awarded_at | auth.users |
| `tier_benefits` | tier, benefit_type, benefit_value | — |
| `ibadah_progress` | user_id, ibadah_type, ibadah_date, count, target | auth.users |
| `jamaah_daily_attendance` | booking_id, departure_id, attendance_date, status | bookings, departures |
| `attendance` | departure_id, customer_id, session_type, status (hadir/absen/terlambat/izin), recorded_by | departures, customers, profiles |
| `jamaah_checklist` | customer_id, item_id, is_checked — UNIQUE(customer_id, item_id) | customers |
| `jamaah_ibadah_logs` | user_id, ibadah_type, notes | auth.users |
| `jamaah_jurnal` | user_id, content, entry_date | auth.users |

---

### KATEGORI F — Tabungan / Savings (3 tabel)

| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `savings_plans` | customer_id, name, target_amount, current_amount, target_date, status | customers |
| `savings_deposits` | plan_id, amount, deposit_date, notes, created_by | savings_plans |
| `savings_schedules` | plan_id, due_date, amount, status, paid_at | savings_plans |

---

### KATEGORI G — Perlengkapan & Procurement (9 tabel)

| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `equipment` | id, branch_id, name, category, status, condition, quantity, serial_no, purchase_price | branches |
| `equipment_maintenance` | equipment_id, maintenance_type, maintenance_date, cost, status, next_maintenance_date | equipment |
| `equipment_damage` | equipment_id, reported_by, severity, status, repair_cost | equipment |
| `equipment_distributions` | customer_id, departure_id, item_name, quantity, distributed_at, confirmed_by_jamaah, confirmed_at, distribution_photo_url | customers, departures |
| `equipment_distribution_items` | distribution_id, item_id, quantity, confirmed | equipment_distributions |
| `package_type_equipment` | package_type_id, equipment_item_id, default_quantity | package_types |
| `baggage_reference_items` | name, category, estimated_weight_kg, is_mandatory | — |
| `baggage_policies` | departure_id, max_weight_kg, hand_carry_kg | departures |
| `store_purchase_orders` | id, supplier_id, branch_id, status, order_date, total_amount | store_suppliers, branches |

---

### KATEGORI H — Pelatihan & SDM Lanjutan (18 tabel)

| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `training_modules` | id, title, content_type, content_url, duration_minutes, is_mandatory, is_active, order_index | — |
| `training_quizzes` | module_id, question, options (JSONB), explanation, order_index | training_modules |
| `agent_training_progress` | agent_id, module_id, status, quiz_score, completed_at — UNIQUE(agent_id, module_id) | agents, training_modules |
| `position_training_curricula` | position, training_module_id, is_required, order_index | training_modules |
| `training_notification_settings` | employee_id, notify_overdue, notify_new_curriculum | employees |
| `training_notification_log` | employee_id, module_id, notification_type, sent_at | employees |
| `payroll_components` | id, name, type (earning/deduction), is_default, is_taxable | — |
| `employee_payroll_components` | employee_id, component_id, amount, effective_from | employees, payroll_components |
| `payroll_slips` | employee_id, period_year, period_month, gross, net, pph21_amount, paid_at, file_url | employees |
| `payroll_records` | employee_id, period_year, period_month, gross, net, pph21_amount, status, paid_at | employees |
| `disciplinary_letters` | employee_id, letter_type (SP1/SP2/SP3), issue_date, reason, file_url | employees |
| `disciplinary_records` | employee_id, infraction_type, date, penalty, notes, issued_by | employees, auth.users |
| `career_history` | employee_id, position, department, start_date, end_date, notes | employees |
| `employee_contracts` | employee_id, contract_type, start_date, end_date, salary, file_url | employees |
| `job_postings` | id, title, department, description, status, deadline, branch_id | branches |
| `job_applicants` | posting_id, full_name, phone, email, status, cv_url, applied_at | job_postings |
| `onboarding_templates` | id, position, name, is_active | — |
| `onboarding_template_items` | template_id, title, description, due_days, assigned_role | onboarding_templates |
| `employee_onboarding_tasks` | employee_id, template_item_id, status, completed_at | employees, onboarding_template_items |

---

### KATEGORI I — Toko E-Commerce (17 tabel)

| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `store_categories` | id, name, slug (UNIQUE), image_url, is_active, sort_order | — |
| `store_products` | id, category_id, branch_id, name, slug (UNIQUE), price, original_price, stock, images (JSONB), is_featured, sold_count, sku | store_categories, branches |
| `store_orders` | id, order_number (UNIQUE), customer_id, user_id, branch_id, status, payment_status, subtotal, shipping_cost, total_amount, shipping_* | customers, branches, auth.users |
| `store_order_items` | order_id, product_id, product_name, quantity, unit_price, subtotal (GENERATED) | store_orders, store_products |
| `store_shipments` | order_id (UNIQUE), courier_name, tracking_number, status, shipped_at, delivered_at | store_orders |
| `store_product_reviews` | order_id, product_id, user_id, rating (1–5), comment, is_published, admin_reply — UNIQUE(order_id, product_id, user_id) | store_orders, store_products, auth.users |
| `store_carts` | user_id (PK), items (JSONB), updated_at | auth.users |
| `store_order_counters` | date_key (PK), last_seq | — |
| `store_suppliers` | id, name, contact_info, address, notes | — |
| `store_purchase_orders` | id, supplier_id, branch_id, status (po_status ENUM), order_date, total_amount | store_suppliers, branches |
| `store_purchase_order_items` | po_id, product_id, quantity_ordered, quantity_received, unit_cost | store_purchase_orders, store_products |
| `store_po_counters` | date_key (PK), last_seq | — |
| `store_stock_movements` | product_id, type (stock_movement_type ENUM), quantity, reference_id, notes | store_products |
| `store_opname_sessions` | id, branch_id, opname_code, status (opname_status ENUM) | branches |
| `store_opname_lines` | session_id, product_id, stock_system, stock_physical, variance | store_opname_sessions, store_products |
| `store_low_stock_alerts` | product_id, current_stock, threshold, resolved_at | store_products |
| `store_purchase_order_items` | po_id, product_id, qty_ordered, qty_received, unit_cost | store_purchase_orders, store_products |

**Store ENUMs:**
```sql
CREATE TYPE po_status           AS ENUM ('draft','ordered','partial','received','cancelled');
CREATE TYPE stock_movement_type AS ENUM ('purchase_in','sale_out','adjustment','return_in','return_out','opname');
CREATE TYPE opname_status       AS ENUM ('draft','submitted','approved','rejected');
```

---

### KATEGORI J — WhatsApp & Komunikasi (13 tabel)

| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `whatsapp_config` | id, provider, display_name, sender_number, api_key, provider_config (JSONB), webhook_secret, last_tested_at, last_test_ok | auth.users |
| `wa_templates` | id, code (UNIQUE), name, message_template, variables (JSONB), is_active | — |
| `wa_send_logs` | id, recipient_phone, recipient_name, message_content, status, sent_at, template_code, departure_id, message_id | — |
| `wa_broadcast_campaigns` | id, name, segment_filters (JSONB), message_template, status, scheduled_at, success_count, fail_count | auth.users |
| `wa_broadcast_logs` | campaign_id, booking_id, phone, message, status (queued/sent/failed), sent_at, error_msg | wa_broadcast_campaigns, bookings |
| `wa_feature_roadmap` | id, phase, code (UNIQUE), title, status, sort_order | — |
| `push_subscriptions` | user_id, customer_id, endpoint (UNIQUE), p256dh, auth_key, role, branch_id, agent_id | auth.users |
| `push_outbox` | user_ids[], customer_ids[], title, body, type, status, scheduled_at | — |
| `notifications` | user_id, title, message, type, target_role, branch_id, is_read, link | auth.users |
| `customer_notifications` | customer_id, type, title, message, link, is_read, read_at | customers |
| `notification_templates` | id, code (UNIQUE), name, channel (push/whatsapp/email/sms/in_app), title, body, variables[], trigger_event | — |
| `webhooks` | id, url, events[], secret, is_active | — |
| `webhook_logs` | webhook_id, event, payload (JSONB), status, response_status | webhooks |

---

### KATEGORI K — Website & Marketing (14 tabel)

| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `website_settings` | id, agent_id, branch_id, theme, primary_color, chat_bubble_color, footer_*, seo_title, social_youtube, social_tiktok, maps_embed_url | agents, branches |
| `menu_items` | id, key (UNIQUE), label, path, icon, group_name, sort_order, required_permission, is_visible | — |
| `app_settings` | id, key (UNIQUE), value | — |
| `bank_accounts` | id, bank_name, account_name, account_number, branch_id, is_default | branches |
| `media_gallery` | id, type (video_testimonial/virtual_tour/hotel_photo), title, url, hotel_id, package_id, is_active | hotels, packages |
| `leads` | id, branch_id, agent_id, name, phone, source, status (new→converted→lost), package_interest | branches, agents |
| `sales_targets` | user_id, branch_id, role, period_type, period_start, target_amount, target_bookings, achieved_amount — UNIQUE(user_id, period_type, period_start) | branches, auth.users |
| `marketing_campaigns` | id, branch_id, name, channel, status, budget, spent, impressions, clicks, conversions, start_date | branches |
| `marketing_conversions` | campaign_id, booking_id, customer_id, revenue, converted_at | marketing_campaigns, bookings |
| `marketing_metrics` | campaign_id, metric_date, impressions, clicks, conversions, cost — UNIQUE(campaign_id, metric_date) | marketing_campaigns |
| `announcements` | id, title, content, type, target_roles[], branch_id, is_active, starts_at, ends_at | branches |
| `banners` | id, title, image_url, link_url, branch_id, position, is_active, sort_order | branches |
| `coupons` | id, code (UNIQUE), discount_type, discount_value, quota, used_count, is_active | — |
| `faqs` | id, question, answer, category, sort_order, is_published | — |

---

### KATEGORI L — Keuangan & Akuntansi (13 tabel)

| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `agent_commissions` | agent_id, booking_id, commission_amount, status, notes, paid_at | agents, bookings |
| `withdrawal_requests` | agent_id, amount, status, bank_details (JSONB), rejection_reason, processed_at | agents |
| `transactions` | branch_id, booking_id, description, type (income/expense), category, amount, transaction_date, status, approved_by | branches, bookings |
| `expenses` | branch_id, departure_id, category, amount, expense_date, status (pending/approved/rejected/paid), submitted_by | branches, departures |
| `exchange_rates` | currency_from, currency_to, rate, is_active, valid_from | — |
| `financial_summary` | branch_id, period_type, period_start, total_revenue, total_expenses, net_profit (GENERATED) — UNIQUE(branch_id, period_type, period_start) | branches |
| `dashboard_stats` | branch_id, stat_date, total_revenue, total_bookings, new_leads — UNIQUE(branch_id, stat_date) | branches |
| `journal_entries` | id, entry_date, description, total_debit, total_credit, posted_by | — |
| `chart_of_accounts` | id, account_code, account_name, account_type, is_active | — |
| `general_ledger` | entry_id, account_id, debit_amount, credit_amount | journal_entries, chart_of_accounts |
| `account_periods` | id, period_name, start_date, end_date, is_closed | — |
| `sos_escalation_log` | sos_alert_id, escalated_to, escalated_by, notes | sos_alerts |
| `departure_waiting_list` | departure_id, customer_id, position, status, notified_at | departures, customers |

---

### KATEGORI M — Approval & Workflow (4 tabel)

| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `approval_requests` | branch_id, type (refund/discount/cancellation/vendor_invoice), amount, status, current_level, max_level | branches, auth.users |
| `approval_actions` | request_id, actor_id, actor_role, action, level, notes | approval_requests, auth.users |
| `approval_configs` | type, level, required_role, amount_threshold, auto_approve_below — UNIQUE(type, level, required_role) | — |
| `discount_requests` | booking_id, requested_by, amount, reason, status, approved_by | bookings, auth.users |

---

### KATEGORI N — Operasional & Portal Jamaah (11 tabel)

| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `manasik_schedules` | departure_id, branch_id, title, event_date, event_time, location, is_online, meeting_url | departures, branches |
| `manasik_attendances` | session_id, booking_passenger_id, status | manasik_schedules, booking_passengers |
| `sos_alerts` ⚠️ | customer_id, departure_id, message, latitude, longitude, status, assigned_muthawif_id — *2 versi, lihat §8* | customers |
| `trip_timeline` | departure_id, title, event_date, event_time, type (flight/hotel/activity/etc), is_public | departures |
| `ibadah_progress` | user_id, ibadah_type, ibadah_date, count, target | auth.users |
| `dashboard_access_config` | role (UNIQUE), enabled_modules[], disabled_modules[], default_dashboard | — |
| `dashboard_access_audit_log` | role, action, module_key, changed_by, changed_at, metadata (JSONB) | auth.users |
| `invoice_templates` | id, name, is_default, accent_color, show_qr_code, qr_placement, payment_info_blocks (JSONB) | — |
| `document_templates` | id, doc_type, branch_id, name, is_default, settings_json (JSONB) | branches |
| `document_numbering_sequences` | doc_type, branch_id, year, month, last_seq | — |
| `web_vitals_metrics` | metric_name, metric_value, rating, route, device_type, branch_id, release_version | — |

---

### KATEGORI O — Log & Monitoring (5 tabel)

| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `support_tickets` | customer_id, title, description, status (open→resolved→closed), priority, assigned_to | customers, auth.users |
| `chatbot_logs` | session_id, message, answer, source, user_id, channel, rating, is_unanswered | — |
| `rbac_audit_trail` | user_id, action, resource, details (JSONB), created_at | auth.users |
| `pwa_install_events` | user_id, platform, install_date | auth.users |
| `email_logs` | to_email, template_id, status, sent_at | — |

---

## 3. PETA DEPENDENSI FK (Topologi Lengkap)

```
[LAYER 0 — No FK / auth.users only]
  profiles, user_roles, role_permissions, api_keys
  hotels, vendors, airlines, store_categories
  menu_items, app_settings, faqs
  training_modules, training_quizzes → training_modules
  invoice_templates, baggage_reference_items
  whatsapp_config → auth.users
  wa_templates, wa_feature_roadmap, webhooks
  approval_configs, exchange_rates, store_suppliers
  package_types, membership_plans, agent_tier_config
  email_templates, notification_templates, coupons
  cancellation_rules, chart_of_accounts, account_periods
  hotel_room_capacities → hotels

[LAYER 1 — Branches]
  branches → auth.users

[LAYER 2 — Depends on branches]
  agents           → branches, auth.users, self(parent_agent_id)
  employees        → branches, auth.users
  muthawifs        → branches, auth.users
  customers        → branches, auth.users
  packages         → branches, cancellation_rules
  store_products   → store_categories, branches  ← FK KRITIS (branches harus ada dulu)
  vendor_contracts → vendors, branches
  document_templates, announcements, banners → branches
  leads            → branches, agents
  sales_targets    → branches, auth.users
  marketing_campaigns → branches
  bank_accounts, branch_commissions, branch_monthly_targets → branches
  website_settings → agents, branches
  agent_monthly_targets, agent_memberships → agents, membership_plans
  job_postings, store_opname_sessions → branches
  push_subscriptions → auth.users

[LAYER 3 — Depends on packages]
  package_labels           → branches
  package_hpp_templates    → packages
  package_reviews          → packages, auth.users
  departures               → packages, muthawifs
  training_quizzes         → training_modules
  agent_training_progress  → agents, training_modules
  withdrawal_requests      → agents

[LAYER 4 — Depends on departures]
  departure_hotels         → departures, hotels, airlines
  departure_budgets        → departures
  departure_waiting_list   → departures, customers
  manasik_schedules        → departures, branches
  baggage_policies         → departures
  seat_holds               → departures, customers
  departure_muthawifs      → departures, muthawifs
  hotel_contracts          → hotels, departures
  package_label_assignments → packages, package_labels
  package_type_equipment   → package_types

[LAYER 5 — Bookings (core transaction)]
  bookings → customers, departures, agents

[LAYER 6 — Depends on bookings]
  booking_passengers       → bookings, customers
  booking_line_items       → bookings
  booking_status_history   → bookings, auth.users
  booking_access_tokens    → bookings
  booking_transfers        → bookings
  booking_document_logs    → bookings
  booking_installment_schedules → bookings
  payments                 → bookings
  refunds                  → bookings, customers
  payment_deadline_reminders → bookings
  visa_applications        → bookings, customers, departures
  discount_requests        → bookings, auth.users
  ar_reminder_log          → bookings
  hotel_vouchers           → hotel_contracts

[LAYER 7 — Depends on bookings + passengers]
  manasik_attendances      → manasik_schedules, booking_passengers
  departure_cost_items     → departures, hotels, airlines, profiles
  departure_expenses       → departures, bookings, profiles
  departure_other_revenues → departures, bookings, profiles
  departure_financial_summary → departures
  muthawif_evaluations     → muthawifs, bookings, departures
  jamaah_daily_attendance  → bookings, departures
  attendance               → departures, customers, profiles
  visa_status_logs         → customers/visa_applications (tergantung versi)
  room_assignments         → departures
  room_occupants           → room_assignments, customers

[LAYER 8 — Customer support]
  customer_documents       → customers, document_types
  customer_mahrams         → customers
  customer_accounts        → customers
  customer_notifications   → customers
  loyalty_points, loyalty_point_expiry → customers
  jamaah_badges, ibadah_progress, jamaah_checklist → customers / auth.users
  savings_plans            → customers
  savings_deposits, savings_schedules → savings_plans
  equipment_distributions  → customers, departures
  equipment_maintenance, equipment_damage → equipment
  marketing_conversions, marketing_metrics → marketing_campaigns, bookings

[LAYER 9 — Store E-Commerce]
  store_orders             → customers, branches, auth.users
  store_order_items        → store_orders, store_products
  store_shipments          → store_orders
  store_product_reviews    → store_orders, store_products, customers
  store_purchase_orders    → store_suppliers, branches
  store_purchase_order_items → store_purchase_orders, store_products
  store_opname_lines       → store_opname_sessions, store_products
  store_low_stock_alerts, store_stock_movements → store_products
  agent_commissions, agent_override_commissions → agents, bookings

[LAYER 10 — Approval & SDM]
  approval_requests   → branches, auth.users
  approval_actions    → approval_requests, auth.users
  sos_escalation_log  → sos_alerts
  payroll_records, payroll_slips, payroll_components → employees
  employee_payroll_components → employees, payroll_components
  disciplinary_records, career_history → employees, auth.users
  employee_contracts  → employees
  job_applicants      → job_postings
  employee_onboarding_tasks → employees, onboarding_template_items
  onboarding_template_items → onboarding_templates
  training_notification_settings, training_notification_log → employees
  performance_reviews → employees, auth.users
  leave_requests, leave_quotas → employees

[LAYER 11 — WA & Komunikasi]
  wa_send_logs         → (no FK hard, departure_id soft)
  wa_broadcast_campaigns → auth.users
  wa_broadcast_logs    → wa_broadcast_campaigns, bookings
  webhook_logs         → webhooks
  notifications        → auth.users

[LAYER 12 — Akuntansi]
  journal_entries      → auth.users (posted_by)
  general_ledger       → journal_entries, chart_of_accounts
  account_periods      → (no FK)
  dashboard_access_audit_log → auth.users
  dashboard_stats      → branches
```

---

## 4. RENCANA MIGRASI FRESH — URUTAN EKSEKUSI BENAR

### MASTER FILE: `supabase_clean_migration/MASTER_FRESH_MIGRATION.sql`

```
══════════════════════════════════════════════════════════════════
TAHAP 0: EXTENSIONS & HELPER FUNCTIONS
══════════════════════════════════════════════════════════════════
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
  CREATE EXTENSION IF NOT EXISTS "pgcrypto"
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  CREATE OR REPLACE FUNCTION slugify_text()
  CREATE OR REPLACE FUNCTION _create_updated_at_trigger()

══════════════════════════════════════════════════════════════════
TAHAP 1: STANDALONE TABLES (No FK ke custom tables)
══════════════════════════════════════════════════════════════════
  profiles, user_roles, role_permissions, api_keys
  hotels, vendors, airlines, store_categories, store_suppliers
  menu_items, app_settings, faqs, cancellation_rules
  training_modules, training_quizzes → training_modules
  invoice_templates, document_types, baggage_reference_items
  whatsapp_config, wa_templates, wa_feature_roadmap
  webhooks, approval_configs, exchange_rates
  package_types, membership_plans, agent_tier_config
  notification_templates, coupons, account_periods
  chart_of_accounts
  hotel_room_capacities → hotels

══════════════════════════════════════════════════════════════════
TAHAP 2: RBAC TABLES
══════════════════════════════════════════════════════════════════
  role_permissions, user_permissions → auth.users
  permissions_list

══════════════════════════════════════════════════════════════════
TAHAP 3: BRANCHES (Pivot Utama)
══════════════════════════════════════════════════════════════════
  branches → auth.users
    + ADD COLUMN: signature_url, stamp_url, logo_url, letterhead_data, commission_rate

══════════════════════════════════════════════════════════════════
TAHAP 4: ENTITAS BERGANTUNG BRANCHES
══════════════════════════════════════════════════════════════════
  agents           → branches, auth.users, self
    + ADD COLUMN: level, tier, membership_tier, slug, view_count
  employees        → branches, auth.users
    + ADD COLUMN: npwp, employee_code, height_cm, weight_kg, clothing_size, face_descriptor
  muthawifs        → branches, auth.users
  customers        → branches, auth.users
    + ADD COLUMN: nomor_porsi_haji, embarkasi_kode, estimasi_keberangkatan_haji, height_cm, weight_kg, clothing_size
  vendor_contracts, bank_accounts, announcements, banners → branches
  leads            → branches, agents
  sales_targets    → branches, auth.users  (UNIQUE: user_id, period_type, period_start)
  marketing_campaigns → branches
  branch_commissions, branch_monthly_targets → branches
  agent_monthly_targets, agent_memberships → agents, membership_plans
  hotel_room_capacities → hotels
  job_postings → branches
  payroll_components

══════════════════════════════════════════════════════════════════
TAHAP 5: PACKAGES & STORE PRODUCTS
══════════════════════════════════════════════════════════════════
  packages → branches, cancellation_rules
    + ADD COLUMN: discount_amount, discount_percentage, booking_mode, view_count
    + ADD COLUMN: child_price_percent, infant_price_percent, fee_branch
  store_products → store_categories, branches  ← HARUS setelah branches

══════════════════════════════════════════════════════════════════
TAHAP 6: SUB-PAKET & WEBSITE
══════════════════════════════════════════════════════════════════
  package_labels, package_hpp_templates, package_reviews → packages
  package_label_assignments → packages, package_labels
  package_type_equipment → package_types
  website_settings → agents, branches
  document_templates → branches
  media_gallery → hotels, packages
  agent_training_progress → agents, training_modules  (UNIQUE: agent_id, module_id)
  withdrawal_requests → agents (+ rejection_reason, processed_at, bank_details)
  agent_commission_tiers, agent_tier_config

══════════════════════════════════════════════════════════════════
TAHAP 7: DEPARTURES
══════════════════════════════════════════════════════════════════
  departures → packages, muthawifs
    + ADD COLUMN: price_adult, price_child, price_infant, child_price_percent, infant_price_percent
  departure_hotels → departures, hotels, airlines (+ city)
  departure_budgets, manasik_schedules, baggage_policies → departures
  departure_muthawifs → departures, muthawifs
  hotel_contracts → hotels, departures
  hotel_vouchers → hotel_contracts

══════════════════════════════════════════════════════════════════
TAHAP 8: BOOKINGS (Core Transaction)
══════════════════════════════════════════════════════════════════
  seat_holds → departures, customers
  bookings → customers, departures, agents
    + ADD COLUMN: booking_type, dp_amount, dp_percentage, savings_mode
    + ADD COLUMN: payment_deadline, remaining_amount, total_pax
    + ADD COLUMN: bagasi_kg_allowed, booking_status, room_number
    + ADD COLUMN: adult_count, child_count, infant_count

══════════════════════════════════════════════════════════════════
TAHAP 9: SUB-TABEL BOOKINGS
══════════════════════════════════════════════════════════════════
  booking_passengers → bookings, customers
    + ADD COLUMN: room_number_makkah, room_number_madinah, room_hotel_notes
  booking_line_items, booking_status_history → bookings
  booking_access_tokens, booking_transfers, booking_document_logs → bookings
  booking_installment_schedules → bookings
  booking_seat_locks → departures, bookings
  payments → bookings (+ transaction_id)
  refunds → bookings, customers
  payment_deadline_reminders → bookings (UNIQUE: booking_id, days_before)
  ar_reminder_log → bookings
  visa_applications → bookings, customers, departures
  visa_status_logs → customers (+ visa_application_id jika pakai fase16)
  room_assignments → departures
  room_occupants → room_assignments, customers
  departure_surveys → departures, bookings
  departure_waiting_list → departures, customers
  midtrans_webhook_logs (no FK)

══════════════════════════════════════════════════════════════════
TAHAP 10: OPERASIONAL KEBERANGKATAN & KEUANGAN
══════════════════════════════════════════════════════════════════
  departure_cost_items  → departures, hotels, airlines, profiles
  departure_expenses    → departures, bookings, profiles (+ approval cols)
  departure_other_revenues → departures, bookings, profiles
  departure_financial_summary → departures
  muthawif_evaluations → muthawifs, bookings, departures
  attendance, jamaah_daily_attendance → departures, customers
  manasik_attendances → manasik_schedules, booking_passengers
  sos_alerts → customers, departures, muthawifs
  sos_escalation_log → sos_alerts
  trip_timeline → departures
  package_label_assignments → packages, package_labels
  journal_entries, general_ledger, account_periods → chart_of_accounts

══════════════════════════════════════════════════════════════════
TAHAP 11: CUSTOMER SUPPORT & PORTAL JAMAAH
══════════════════════════════════════════════════════════════════
  customer_documents → customers, document_types
  customer_mahrams → customers
  customer_accounts, customer_notifications → customers
  siskohat_sync_logs → branches
  loyalty_points, loyalty_point_expiry → customers
  jamaah_badges, ibadah_progress → auth.users
  jamaah_checklist → customers (UNIQUE: customer_id, item_id)
  savings_plans → customers; savings_deposits, savings_schedules → savings_plans
  equipment_distributions → customers, departures
    + ADD COLUMN: confirmed_by_jamaah, confirmed_at, distribution_photo_url
  equipment_distribution_items → equipment_distributions
  equipment_maintenance, equipment_damage → equipment

══════════════════════════════════════════════════════════════════
TAHAP 12: TOKO E-COMMERCE LANJUTAN
══════════════════════════════════════════════════════════════════
  store_orders → customers, branches, auth.users
  store_order_items → store_orders, store_products
  store_shipments → store_orders (UNIQUE: order_id)
  store_product_reviews → store_orders, store_products, customers
  store_carts → auth.users; store_order_counters (no FK)
  store_purchase_orders → store_suppliers, branches
  store_purchase_order_items → store_purchase_orders, store_products
  store_po_counters (no FK)
  store_stock_movements, store_low_stock_alerts → store_products
  store_opname_sessions → branches
  store_opname_lines → store_opname_sessions, store_products

══════════════════════════════════════════════════════════════════
TAHAP 13: AGEN KEUANGAN & SDM
══════════════════════════════════════════════════════════════════
  agent_commissions, agent_override_commissions → agents, bookings
  approval_requests, approval_actions, approval_configs → branches, auth.users
  transactions, expenses → branches
  financial_summary, dashboard_stats → branches
  payroll_records, payroll_slips → employees
  employee_payroll_components → employees, payroll_components
  disciplinary_letters, disciplinary_records, career_history → employees
  employee_contracts → employees
  job_applicants → job_postings
  leave_requests, leave_quotas → employees
  performance_reviews → employees, auth.users
  onboarding_templates, onboarding_template_items → onboarding_templates
  employee_onboarding_tasks → employees, onboarding_template_items
  position_training_curricula → training_modules
  training_notification_settings, training_notification_log → employees
  marketing_conversions → marketing_campaigns, bookings
  marketing_metrics → marketing_campaigns
  document_numbering_sequences (no FK)

══════════════════════════════════════════════════════════════════
TAHAP 14: WA & KOMUNIKASI
══════════════════════════════════════════════════════════════════
  wa_send_logs (no hard FK)
  wa_broadcast_campaigns → auth.users
  wa_broadcast_logs → wa_broadcast_campaigns, bookings
  push_subscriptions → auth.users; push_outbox (no FK)
  notifications → auth.users
  webhook_logs → webhooks
  email_logs (no FK)

══════════════════════════════════════════════════════════════════
TAHAP 15: DASHBOARD & MONITORING
══════════════════════════════════════════════════════════════════
  dashboard_access_config (no FK)
  dashboard_access_audit_log → auth.users
  web_vitals_metrics (no FK)
  pwa_install_events → auth.users
  support_tickets → customers, auth.users
  chatbot_logs, rbac_audit_trail → auth.users

══════════════════════════════════════════════════════════════════
TAHAP 16: FUNGSI & TRIGGER
══════════════════════════════════════════════════════════════════
  1.  handle_new_user()                          — auto-create profile on INSERT auth.users
  2.  sync_booking_payment_totals()              — update paid_amount & payment_status
  3.  generate_booking_code()                    — format: VTR-YYYYMMDD-XXXXX
  4.  generate_store_order_number()              — ORDyymmddNNNN via store_order_counters
  5.  recalculate_departure_financial_summary()  — P&L cache per departure
  6.  trigger_pl_on_booking_change()             — AFTER INSERT/UPDATE/DELETE bookings
  7.  trigger_pl_on_cost_change()                — AFTER INSERT/UPDATE/DELETE departure_cost_items
  8.  trigger_pl_on_expense_change()             — AFTER INSERT/UPDATE/DELETE departure_expenses
  9.  trigger_pl_on_revenue_change()             — AFTER INSERT/UPDATE/DELETE departure_other_revenues
  10. preview_auto_schedule_reminders(days[])    — dry-run payment reminders
  11. auto_schedule_payment_reminders(days[])    — INSERT H-x reminders
  12. get_wa_config_safe()                       — WA config tanpa api_key
  13. get_public_booking_details(uuid)           — detail booking publik (masked phone)
  14. check_mahram_room_conflicts()              — validasi kompatibilitas kamar mahram
  15. hold_departure_seats() / release_seat_hold() — seat reservation
  16. cleanup_expired_seat_holds()               — cron cleanup
  17. apply_stock_movement()                     — update stok produk toko
  18. apply_store_order_sale_out()               — kurangi stok saat order terkonfirmasi
  19. generate_savings_schedule()                — jadwal cicilan tabungan
  20. convert_savings_to_booking()               — konversi tabungan → booking
  21. award_badge() + trigger badge_*            — badge jamaah
  22. tg_auto_upgrade_agent_membership()         — upgrade tier agen otomatis
  23. attribute_commission_to_parent()           — royalti komisi ke parent agent (10%)
  24. auto_create_agent_commission()             — trigger komisi saat booking confirmed
  25. sync_departure_hotel_city()                — auto-fill city di departure_hotels
  26. get_next_document_number(type, branch_id)  — penomoran surat otomatis
  27. suggest_clothing_size(height_cm, weight_kg) — saran ukuran baju jamaah
  28. delete_departure_safely()                  — safe delete cek bookings ada
  29. get_active_exchange_rate(from, to)         — kurs aktif
  30. is_admin(uid) / has_role(uid, role)        — RBAC helper
  31. get_user_role(uid)                         — get role dari user_roles
  32. slugify_text(input)                        — text → URL slug

══════════════════════════════════════════════════════════════════
TAHAP 17: SEED DATA
══════════════════════════════════════════════════════════════════
  role_permissions       — semua role × semua permission_keys
  menu_items             — sidebar navigation (≥35 items)
  app_settings           — key-value defaults
  store_categories       — 6 kategori (ibadah, ihram, koper, dll.)
  approval_configs       — threshold per tipe approval (9 rows)
  baggage_reference_items — 20 referensi berat barang
  wa_feature_roadmap     — roadmap WA fase 1–6
  notification_templates — 7 template notifikasi
  agent_tier_config      — 3 tier (silver/gold/platinum)
  training_modules       — modul awal
```

---

## 5. ENUM & CONSTRAINT PENTING

### app_role (TEXT CHECK di user_roles)
```sql
CHECK (role IN (
  'super_admin', 'owner', 'admin', 'branch_manager', 'finance',
  'operational', 'sales', 'marketing', 'hr', 'equipment',
  'agent', 'sub_agent', 'customer', 'jamaah', 'visa_officer', 'it'
))
```
> **BUKAN PostgreSQL ENUM type** — ini TEXT + CHECK constraint.
> Nilai `'it'` ditambahkan via fase31 (DROP CONSTRAINT + ADD CONSTRAINT).

### booking_status
```
pending → confirmed → completed
                   ↘ cancelled
```

### payment_status
```
unpaid → partial → paid
                ↘ refunded
```

### Store ENUMs (PostgreSQL ENUM type)
```sql
CREATE TYPE po_status           AS ENUM ('draft','ordered','partial','received','cancelled');
CREATE TYPE stock_movement_type AS ENUM ('purchase_in','sale_out','adjustment','return_in','return_out','opname');
CREATE TYPE opname_status       AS ENUM ('draft','submitted','approved','rejected');
```

---

## 6. KOLOM ALTER TABLE (Ditambah di Migrasi Lanjutan)

| Tabel | Kolom Ditambah | Dari |
|-------|---------------|------|
| `branches` | signature_url, stamp_url, logo_url, letterhead_data, commission_rate | doc_sprint2, 033 |
| `customers` | nomor_porsi_haji, embarkasi_kode, estimasi_keberangkatan_haji, height_cm, weight_kg, clothing_size, face_descriptor | fase17, 083, 049 |
| `bookings` | booking_type, dp_amount, dp_percentage, savings_mode, payment_deadline, remaining_amount, total_pax, bagasi_kg_allowed, room_number, adult_count, child_count, infant_count | fase16–21 |
| `booking_passengers` | room_number_makkah, room_number_madinah, room_hotel_notes, passenger_type (adult/child/infant) | 063, fase29 |
| `departures` | price_adult, price_child, price_infant, child_price_percent, infant_price_percent, muthawif_id | fase29, 081 |
| `packages` | child_price_percent, infant_price_percent, discount_amount, discount_percentage, booking_mode, view_count | fase29, 20260530, 036 |
| `payment_deadline_reminders` | UNIQUE(booking_id, days_before) ganti UNIQUE(booking_id) | fase30 |
| `whatsapp_config` | display_name, provider_config (JSONB), webhook_secret, updated_by, last_tested_at, last_test_ok | fase31 |
| `departure_hotels` | city | 066 |
| `invoice_templates` | show_qr_code, qr_placement | fase26 |
| `payments` | transaction_id | fase23 |
| `departure_expenses` | approved_by, approved_at, approval_notes | 085 |
| `equipment_distributions` | confirmed_by_jamaah, confirmed_at, distribution_photo_url, distribution_photo_uploaded_at, distribution_photo_uploaded_by | 065, 066 |
| `withdrawal_requests` | rejection_reason, processed_at, bank_details (JSONB) | 068 |
| `agents` | level, membership_tier | fase17, 023 |

---

## 7. VIEW (SQL Views)

| View | File | Keterangan |
|------|------|-----------|
| `v_financial_summary` | `sql/migrations/042_v_financial_summary_view.sql` | Ringkasan keuangan per departure |
| `v_financial_summary_v2` | `sql/migrations/084_v_financial_summary_v2.sql` | v2: hpp_planned, hpp_realized, net_margin_pct, hpp_variance |

---

## 8. TABEL DUPLIKAT / KONFLIK SKEMA ⚠️

### 8.1 `sos_alerts` — 2 Definisi, Skema Berbeda

| Kolom | fase0_foundation.sql | fase16_new_tables.sql |
|---|---|---|
| customer_id | NOT NULL FK → customers | Nullable FK → customers |
| status values | pending / responded / resolved | active / responding / resolved |
| Kolom eksklusif fase0 | departure_id, assigned_muthawif_id, responded_at | — |
| Kolom eksklusif fase16 | — | emergency_type, accuracy, resolved_by, branch_id, response_notes |
| Tipe koordinat | NUMERIC(10,6) | FLOAT8 |

**Dampak:** Karena `IF NOT EXISTS`, fase0 yang menang jika dijalankan duluan. Kolom fase16 (emergency_type, branch_id, dll.) tidak akan ada di production.
**Fix:** Gunakan `ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS ...` untuk menambah kolom fase16 yang hilang.

---

### 8.2 `visa_status_logs` — 2 Definisi, FK Berbeda

| Kolom | fase16_new_tables.sql | fase21_integration_fixes.sql |
|---|---|---|
| visa_id | Ada (FK → visa_applications) | Tidak ada |
| changed_by | FK → auth.users | FK → profiles |
| changed_by_role | Ada | Tidak ada |

**Dampak:** Fase21 tidak mengubah tabel karena `IF NOT EXISTS`. Versi yang aktif tergantung urutan eksekusi.
**Fix:** Pakai satu definisi konsisten. Rekomendasi: gabungkan, pertahankan visa_id (nullable) + changed_by FK ke profiles.

---

### 8.3 Overlap Fungsional (Bukan Konflik, Tapi Perlu Diperhatikan)

| Situasi | Tabel A | Tabel B | Keterangan |
|---|---|---|---|
| Notifikasi | `notifications` | `customer_notifications` | Berbeda audience (staff vs jamaah). Pertahankan keduanya. |
| Pengeluaran | `expenses` (umum+approval) | `departure_expenses` (per departure, multi-currency) | Berbeda scope, tidak duplikat. |
| Ringkasan keuangan | `financial_summary` | `departure_financial_summary` | Per branch vs per departure. |
| Perlengkapan | `equipment` (inventaris) | `equipment_distributions` | item_name di distributions adalah TEXT, tidak FK ke equipment.id → data tidak terhubung. |
| WA Kampanye | `marketing_campaigns` (channel=whatsapp) | `wa_broadcast_campaigns` | Tidak ada FK antara keduanya → data siloed. |
| Kehadiran | `attendance` (muthawif/sesi) | `jamaah_daily_attendance` (per booking per hari) | Berbeda konteks tapi bisa overlap. |

---

## 9. CATATAN MIGRASI KE NEON/POSTGRESQL

### 9.1 Penggantian `auth.users` dan `auth.uid()`
```sql
-- Supabase:
auth.users, auth.uid()

-- Neon/Express (cara yang dipakai proyek ini):
public.auth_users (via tabel internal API server)
-- Auth dikontrol di Express middleware (JWT + bcrypt)
-- user_id diinject dari JWT di setiap request
-- RLS di Neon tidak aktif otomatis — akses dikontrol di middleware Express
```

### 9.2 Status RLS di Neon
RLS policies tetap ada di skema tapi **tidak berlaku otomatis** karena tidak ada Supabase Auth session.
Kontrol akses dilakukan di Express middleware:
- JWT decode → user_id, role, branch_id
- Supabase proxy auto-inject filter `branch_id` untuk branch_manager
- Route guards per permission_key

### 9.3 Extensions yang Dibutuhkan
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- uuid_generate_v4()
-- gen_random_uuid() sudah built-in di PG 13+
```

### 9.4 Trigger Status di Neon
Trigger `AFTER INSERT ON auth.users` (`handle_new_user`) **tidak berfungsi** di Neon karena tidak ada tabel `auth.users`.
Gantinya: API server membuat profile manual saat registrasi di route `POST /auth/v1/signup`.

---

## 10. STATISTIK FINAL

| Kategori | Jumlah Tabel |
|----------|-------------|
| Core Auth & RBAC | 5 |
| Organisasi | 15 |
| Paket & Keberangkatan | 22 |
| Booking & Pembayaran | 17 |
| Customer & Jamaah | 18 |
| Savings | 3 |
| Perlengkapan | 9 |
| Pelatihan & SDM Lanjutan | 18 |
| Toko E-Commerce | 17 |
| WhatsApp & Komunikasi | 13 |
| Website & Marketing | 14 |
| Keuangan & Akuntansi | 13 |
| Approval & Workflow | 4 |
| Operasional & Portal Jamaah | 11 |
| Log & Monitoring | 5 |
| **TOTAL** | **≈ 183 tabel** |

| Metrik | Jumlah |
|--------|--------|
| Functions/RPC | ≈ 53 fungsi |
| Triggers | ≈ 40+ triggers |
| SQL Views | 2 |
| Tahap migrasi fresh | 17 tahap |
| File SQL sumber | 234+ file |
| Drizzle ORM models | 17 |
| Store PostgreSQL ENUMs | 3 |
| Role values | 16 |

---

## 11. CHECKLIST SEBELUM APPLY MIGRASI FRESH

```
□ Database kosong / fresh (DROP SCHEMA public CASCADE jika perlu reset)
□ Extension uuid-ossp diaktifkan
□ Jalankan sebagai superuser / database owner
□ Jalankan TAHAP 0 → 17 secara berurutan
□ Fix sos_alerts: ALTER TABLE ADD COLUMN IF NOT EXISTS untuk kolom fase16
□ Fix visa_status_logs: pilih satu versi & terapkan ALTER TABLE
□ Tambahkan store_products SETELAH branches (bukan sebelum)
□ Verifikasi: SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
□ Expected: ≥ 150 tabel di schema public
□ Test: SELECT COUNT(*) FROM menu_items;  -- ≥ 35 rows
□ Test: SELECT COUNT(*) FROM role_permissions;  -- ≥ 200 rows
□ Test: SELECT COUNT(*) FROM baggage_reference_items;  -- 20 rows
□ Seed admin user: INSERT ke auth_users + user_roles (super_admin)
```

---

## 12. FILE OUTPUT YANG DIHASILKAN

```
supabase_clean_migration/
├── MASTER_FRESH_MIGRATION.sql    ← File utama (tahap 0–17, idempotent)
├── 00_extensions_helpers.sql     ← Extensions + update_updated_at + slugify
├── 01_standalone_tables.sql      ← Layer 0 (no FK tables)
├── 02_rbac.sql                   ← user_roles, role_permissions
├── 03_branches_orgs.sql          ← branches + semua entitas bergantung
├── 04_packages_departures.sql    ← packages, departures, hotels, airlines
├── 05_bookings_payments.sql      ← bookings + semua sub-tabel
├── 06_operations_finance.sql     ← departure_cost/expense/revenue, sos, trip
├── 07_customers_portal.sql       ← customer + portal jamaah + savings
├── 08_ecommerce.sql              ← store_* lengkap
├── 09_agents_hr.sql              ← agen + SDM + keuangan + akuntansi
├── 10_communications.sql         ← WA + push + notifikasi
├── 11_dashboard_monitoring.sql   ← dashboard + monitoring
├── 12_functions_triggers.sql     ← semua fungsi + triggers
└── 13_seed_data.sql              ← seed data

sql/migrations/                   ← Numbered migrations (001–086)
REPOSITORY_ANALYSIS.md            ← Analisis detail lengkap per tabel
```

---

## 13. MATRIX ANALISIS FITUR — HALAMAN × API × TABEL × KOLOM

> **Legenda:**
> - ✅ Tabel/kolom ada dan sesuai di schema
> - ❌ Tabel **TIDAK ADA** di schema (phantom table — query pasti gagal/silent error)
> - ⚠️ Tabel ada tapi nama kolom atau skema berbeda
> - 🔴 Fitur tidak memiliki tabel pendukung apapun di schema
> - `→` = nama yang benar di schema

---

### F-01 Dashboard Admin

| Item | Detail |
|------|--------|
| **Halaman** | `AdminDashboard.tsx` |
| **Hook** | `useDashboardStats.ts` |
| **API** | `GET /dashboard/stats`, `GET /dashboard/booking-trend`, `/rest/v1/bookings`, `/rest/v1/agents`, `/rest/v1/customers`, `/rest/v1/payments`, `/rest/v1/leads`, `/rest/v1/departures` |
| **Tabel ✅** | `bookings`, `customers`, `payments`, `leads`, `branches`, `departures`, `agents` |
| **Kolom akses** | `bookings`: id, booking_code, total_price, paid_amount, booking_status, payment_status, created_at, total_pax, agent_id, branch_id; `departures`: id, departure_date, quota, booked_count; `agents`: id, company_name, parent_agent_id, branch_id |

---

### F-02 Manajemen Paket

| Item | Detail |
|------|--------|
| **Halaman** | `AdminPackages.tsx`, `PackageList.tsx`, `PackageDetail.tsx`, `PackageCompare.tsx` |
| **API** | `/rest/v1/packages`, `/v1/packages`, `/rest/v1/departures`, `/rest/v1/departure_cost_items` |
| **Tabel ✅** | `packages`, `departures`, `departure_cost_items`, `package_labels`, `package_label_assignments`, `package_types`, `package_reviews`, `media_gallery` |
| **Tabel ❌** | `package_groups` (→ tidak ada di schema, cek `package_labels`) |
| **Kolom akses** | `packages`: *, departures(id, departure_date, quota, booked_count, status, price_*); `package_types`: id, name, display_order |
| **Catatan** | `package_groups` diakses di AdminPackages tapi tidak ada di schema |

---

### F-03 Manajemen Keberangkatan

| Item | Detail |
|------|--------|
| **Halaman** | `AdminDepartures.tsx`, `AdminDepartureDetail.tsx` (6 tab), `AdminDepartureTracking.tsx` |
| **API** | `/rest/v1/departures`, `/v1/departures`, `/rest/v1/departure_hotels`, `/rest/v1/departure_cost_items`, `/rest/v1/departure_financial_summary` |
| **Tabel ✅** | `departures`, `departure_hotels`, `departure_cost_items`, `departure_expenses`, `departure_other_revenues`, `departure_financial_summary`, `departure_budgets`, `hotels`, `airlines`, `muthawifs`, `booking_passengers`, `trip_timeline` |
| **Tabel ⚠️** | `jamaah_qr_codes` (❌ diakses di AdminDepartures.tsx tapi tidak ada di schema) |
| **Kolom ⚠️** | `departures.available_seats` (dipakai di /bookings/reserve-slot, tapi kolom di schema adalah `booked_count+quota`, tidak ada `available_seats`) |

---

### F-04 Manajemen Booking

| Item | Detail |
|------|--------|
| **Halaman** | `AdminBookings.tsx`, `AdminBookingDetail.tsx`, `AdminBookingCreate.tsx`, `AdminBookingTransfers.tsx`, `PublicBookingDetail.tsx`, `BookingStatusPage.tsx` |
| **API** | `/rest/v1/bookings`, `PATCH /bookings/:id/status`, `PATCH /bookings/:id/cancel`, `DELETE /bookings/:id`, `POST /bookings/sync-payment-totals` |
| **Tabel ✅** | `bookings`, `booking_passengers`, `booking_line_items`, `booking_status_history`, `booking_access_tokens`, `booking_transfers`, `booking_document_logs`, `payments`, `refunds`, `customer_documents`, `customer_mahrams`, `agents`, `airlines`, `hotels`, `bank_accounts`, `invoice_templates`, `profiles` |
| **Tabel ❌** | `audit_logs` (diakses di AdminBookingDetail → tidak ada, harusnya `rbac_audit_trail` atau `document_audit_logs`) |
| **Tabel ⚠️** | `customer-documents` (typo di AdminCustomerDetail — seharusnya `customer_documents`) |

---

### F-05 Manajemen Pelanggan / Jamaah (Admin)

| Item | Detail |
|------|--------|
| **Halaman** | `AdminCustomers.tsx`, `AdminCustomerDetail.tsx`, `AdminDocumentVerification.tsx`, `AdminIncompleteDocuments.tsx`, `AdminDocumentExpiryTracker.tsx` |
| **API** | `/rest/v1/customers`, `/rest/v1/customer_documents`, `/rest/v1/document_types` |
| **Tabel ✅** | `customers`, `customer_documents`, `customer_notifications`, `customer_mahrams`, `bookings`, `packages`, `departures`, `document_types` |
| **Tabel ❌** | `customer-documents` (typo/URL path digunakan sebagai tabel di beberapa komponen) |

---

### F-06 Manajemen Agen & Komisi

| Item | Detail |
|------|--------|
| **Halaman** | `AdminAgents.tsx`, `AdminAgentDetail.tsx`, `AdminAgentCommissionReport.tsx`, `AdminBranchCommissions.tsx`, `AdminWithdrawalManagement.tsx` |
| **API** | `GET /agents/:id`, `POST /agents/create`, `GET /agents/tiers/config`, `PUT /agents/tiers/config/:tier`, `GET /agents/commission-tiers/list`, `POST /agents/invitation` |
| **Tabel ✅** | `agents`, `agent_commissions`, `agent_tier_config`, `agent_memberships`, `withdrawal_requests`, `branches`, `profiles`, `bookings`, `packages`, `departures` |
| **Tabel ❌** | `agent_wallets` (diakses di useAgents.ts, AdminWithdrawalManagement, AgentWallet.tsx — **tidak ada di schema**), `agent_wallet_transactions` (di AgentWallet.tsx — **tidak ada**) |
| **Tabel ⚠️** | `agent_invitation_tokens` (dipakai di API server /agents/invitation tapi **tidak di schema**) |
| **Catatan** | Seluruh fitur dompet agen (Agent Wallet) tidak punya tabel pendukung |

---

### F-07 Keuangan — P&L & HPP Keberangkatan

| Item | Detail |
|------|--------|
| **Halaman** | `AdminFinancePL.tsx`, `AdminFinanceTerpadu.tsx`, `AdminHPPTerpadu.tsx`, `AdminLabaRugi.tsx`, `AdminLaporanKeberangkatan.tsx` |
| **API** | `/rest/v1/departure_financial_summary`, `/rest/v1/departure_cost_items`, `/rest/v1/departure_expenses`, `/rest/v1/departure_other_revenues` |
| **Tabel ✅** | `departure_financial_summary`, `departure_cost_items`, `departure_expenses`, `departure_other_revenues`, `departures`, `packages`, `payroll_records` |
| **Kolom ⚠️** | `departure_financial_summary.hpp_planned`, `.hpp_realized`, `.net_margin_pct`, `.hpp_variance` — hanya ada di **VIEW v_financial_summary_v2**, bukan di tabel basis |

---

### F-08 Keuangan — Kas & Arus Kas

| Item | Detail |
|------|--------|
| **Halaman** | `AdminFinanceCash.tsx`, `AdminArusKas.tsx`, `AdminNeraca.tsx`, `AdminRekonsiliasi.tsx` |
| **API** | `/rest/v1/cash_transactions`, `/rest/v1/salary_payments` |
| **Tabel ❌** | `cash_transactions` (**tidak ada di schema** — 3 halaman mengaksesnya) |
| **Tabel ❌** | `salary_payments` (**tidak ada di schema** — harusnya `payroll_records`) |
| **Tabel ✅** | `employees`, `bank_accounts` |
| **Status** | 🔴 Fitur Kas/Arus Kas **tidak punya tabel pendukung yang valid** |

---

### F-09 Akuntansi — COA & Jurnal

| Item | Detail |
|------|--------|
| **Halaman** | `AdminCOA.tsx`, `AdminJurnalUmum.tsx`, `AdminBukuBesar.tsx` |
| **API** | `GET /coa`, `POST /coa`, `GET /journal`, `POST /journal` |
| **Tabel ⚠️** | `coa_categories` (diakses di API route /coa — **tidak ada di schema**, schema punya `chart_of_accounts`) |
| **Tabel ✅** | `journal_entries` (ada di schema migration 039) |
| **Tabel ❌** | `general_ledger` (ada di schema tapi **tidak pernah diquery** di frontend/API) |
| **Catatan** | Nama tabel COA tidak konsisten: schema=`chart_of_accounts`, API=`coa_categories` |

---

### F-10 Laporan Keuangan & Pajak

| Item | Detail |
|------|--------|
| **Halaman** | `AdminLaporanKeuangan.tsx`, `AdminLaporanPajak.tsx`, `AdminLaporanAgen.tsx`, `AdminLaporanCabang.tsx`, `AdminKPIDashboard.tsx` |
| **API** | `GET /reports/*` |
| **Tabel ✅** | `bookings`, `payments`, `departures`, `departure_financial_summary`, `agent_commissions`, `payroll_records`, `employees`, `branches` |
| **Tabel ❌** | `cash_transactions` (diakses di AdminLaporanCabang, AdminLaporanPajak) |
| **Kolom ⚠️** | `payroll_records.pph21_amount` — ada di schema (migration 082 kolom), tapi perlu verifikasi apakah sudah di Neon |

---

### F-11 SDM — Data Karyawan

| Item | Detail |
|------|--------|
| **Halaman** | `AdminHR.tsx`, `AdminHRAnalytics.tsx` |
| **API** | `GET /hr/*` |
| **Tabel ✅** | `employees`, `branches`, `user_roles` |
| **Tabel ❌** | `attendance_records` (diakses di AdminHR.tsx dan AdminFinanceCash.tsx — **tidak ada di schema**, harusnya `attendance`) |

---

### F-12 SDM — Payroll & Pajak

| Item | Detail |
|------|--------|
| **Halaman** | `AdminHR.tsx` (tab payroll), `AdminLaporanPajak.tsx` |
| **API** | `GET /hr/payroll`, `POST /hr/payroll/finalize` |
| **Tabel ✅** | `payroll_records`, `employees` |
| **Tabel ❌** | `payroll_slips` (ada di schema migration 027/070 tapi **0 frontend hits**), `payroll_components` (0 hits), `employee_payroll_components` (0 hits) |
| **Status** | Schema punya 3 tabel payroll detail yang tidak digunakan UI |

---

### F-13 SDM — Absensi

| Item | Detail |
|------|--------|
| **Halaman** | `AdminHRAbsensi.tsx`, `AdminHRAbsensiRekap.tsx`, `AdminAbsensiDigital.tsx`, `AdminAbsensiHarianTanahSuci.tsx` |
| **API** | — |
| **Tabel ❌** | `attendance_records` (**tidak ada di schema** — harusnya `attendance`) |
| **Tabel ✅** | `attendance` (ada di schema fase21, tapi diakses dengan nama berbeda di halaman HR) |
| **Status** | 🔴 Halaman absensi admin mengakses tabel yang salah nama |

---

### F-14 SDM — Pelatihan Karyawan

| Item | Detail |
|------|--------|
| **Halaman** | `AdminHRTraining.tsx` |
| **API** | `GET /v1/training/notification-settings`, `POST /v1/training/run-notifications` |
| **Tabel ✅** | `training_modules`, `training_notification_settings`, `training_notification_log` |
| **Tabel ⚠️** | API mengakses `employee_training_progress` & `training_curricula` — schema punya `agent_training_progress` & `position_training_curricula` (nama berbeda) |

---

### F-15 SDM — Karir, Kontrak & Rekrutmen

| Item | Detail |
|------|--------|
| **Halaman** | Belum ada halaman yang mengakses tabel ini |
| **API** | — |
| **Tabel ❌ (ada di schema, 0 hits)** | `disciplinary_records`, `career_history`, `employee_contracts`, `job_postings`, `job_applicants`, `onboarding_templates`, `onboarding_template_items`, `employee_onboarding_tasks`, `position_training_curricula` |
| **Status** | 🔴 Seluruh modul rekrutmen & karir sudah ada di schema tapi **belum ada UI** |

---

### F-16 Portal Jamaah — Dashboard & Profil

| Item | Detail |
|------|--------|
| **Halaman** | `JamaahPortal.tsx`, `JamaahProfil.tsx`, `JamaahWelcome.tsx`, `JamaahDigitalID.tsx` |
| **API** | `/rest/v1/customers`, `/rest/v1/bookings`, `/rest/v1/departures` |
| **Tabel ✅** | `customers`, `bookings`, `departures`, `packages`, `booking_passengers`, `profiles`, `user_roles`, `customer_notifications` |
| **Tabel ❌** | `jamaah_qr_codes` (diakses di JamaahDigitalID — **tidak ada di schema**) |

---

### F-17 Portal Jamaah — Ibadah Tracker

| Item | Detail |
|------|--------|
| **Halaman** | `JamaahIbadah*.tsx`, `JamaahJurnal.tsx`, `TrackerIbadah.tsx` |
| **API** | `/rest/v1/ibadah_progress`, `/rest/v1/jamaah_ibadah_logs`, `/rest/v1/jamaah_ibadah_targets` |
| **Tabel ✅** | `ibadah_progress`, `jamaah_ibadah_logs`, `jamaah_ibadah_targets`, `jamaah_jurnal`, `jamaah_doa_sessions` |
| **Kolom ✅** | ibadah_progress: user_id, ibadah_date, ibadah_type, count, target, notes, completed |

---

### F-18 Portal Jamaah — SOS Alert

| Item | Detail |
|------|--------|
| **Halaman** | `JamaahSOSStatus.tsx`, `MuthawifSOS.tsx` |
| **API** | `/rest/v1/sos_alerts` |
| **Tabel ✅** | `sos_alerts` |
| **Tabel ❌** | `sos_escalation_log` (ada di schema migration 082 tapi 0 frontend hits) |
| **Kolom ⚠️** | `sos_alerts.emergency_type` — ada di fase16 tapi mungkin tidak di fase0 (konflik schema) |

---

### F-19 Portal Jamaah — Visa Tracker

| Item | Detail |
|------|--------|
| **Halaman** | `JamaahVisaTracker.tsx`, `AdminVisaManagement.tsx` |
| **API** | `/rest/v1/visa_applications` |
| **Tabel ✅** | `visa_applications` |
| **Tabel ⚠️** | `visa_status_logs` (skema ambigu — 2 definisi berbeda, lihat §8.2) |

---

### F-20 Portal Jamaah — Loyalty & Badge

| Item | Detail |
|------|--------|
| **Halaman** | `JamaahPortal.tsx`, `AdminLoyalty.tsx`, beberapa komponen portal |
| **API** | `/rest/v1/loyalty_points`, `/rest/v1/loyalty_rewards`, `/rest/v1/loyalty_transactions` |
| **Tabel ✅** | `loyalty_points`, `jamaah_badges`, `tier_benefits` |
| **Tabel ❌** | `loyalty_rewards` (**tidak ada di schema** — 6 hits di frontend) |
| **Tabel ❌** | `loyalty_transactions` (**tidak ada di schema** — 5 hits di frontend) |
| **Status** | 🔴 Fitur redeem loyalty reward & history transaksi tidak punya tabel |

---

### F-21 Tabungan (Savings)

| Item | Detail |
|------|--------|
| **Halaman** | `SavingsDashboard.tsx`, `SavingsRegister.tsx`, `AdminSavings.tsx`, `AdminSavingsPlans.tsx`, `AdminMonitoringTabungan.tsx`, `MySavings.tsx` |
| **API** | `/rest/v1/savings_plans`, `/rest/v1/savings_schedules` |
| **Tabel ✅** | `savings_plans`, `savings_schedules` |
| **Tabel ❌** | `savings_payments` (**tidak ada di schema** — 8 hits, harusnya `savings_deposits`) |
| **Tabel ❌** | `savings_page_content` (**tidak ada di schema** — 4 hits, data konten statis) |
| **Kolom ⚠️** | `savings_plans.current_amount` — mungkin tidak ada di schema (schema tidak menyebutkan kolom ini secara eksplisit, biasanya dihitung dari savings_deposits) |

---

### F-22 E-Commerce Toko

| Item | Detail |
|------|--------|
| **Halaman** | `TokoOnline.tsx`, `AdminStore.tsx`, `AdminInventory.tsx` (procurement) |
| **API** | `/rest/v1/store_*` |
| **Tabel ✅** | `store_products`, `store_categories`, `store_orders`, `store_order_items`, `store_shipments`, `store_product_reviews`, `store_carts`, `store_suppliers`, `store_purchase_orders`, `store_purchase_order_items`, `store_stock_movements`, `store_opname_sessions`, `store_opname_lines`, `store_low_stock_alerts` |
| **Catatan** | Modul e-commerce paling lengkap — semua tabel yang diquery tersedia di schema |

---

### F-23 WhatsApp Management

| Item | Detail |
|------|--------|
| **Halaman** | `AdminWhatsApp.tsx`, `AdminWABroadcast.tsx` |
| **API** | `GET /v1/whatsapp/config`, `POST /v1/whatsapp/send`, `GET /whatsapp/*` |
| **Tabel ✅** | `whatsapp_config`, `wa_templates`, `wa_send_logs`, `wa_broadcast_campaigns`, `wa_broadcast_logs` |
| **Tabel ⚠️** | `webhook_endpoints` (diakses di beberapa komponen — schema punya `webhooks`, bukan `webhook_endpoints`) |
| **Tabel ❌** | `wa_feature_roadmap` (ada di schema tapi 0 frontend hits — hanya data statis) |

---

### F-24 Push Notifications

| Item | Detail |
|------|--------|
| **Halaman** | `AdminPushNotifications.tsx` |
| **API** | `POST /push/send`, `GET /push/subscriptions` |
| **Tabel ✅** | `push_subscriptions`, `push_outbox`, `notifications` |

---

### F-25 Perlengkapan (Equipment)

| Item | Detail |
|------|--------|
| **Halaman** | `EquipmentPage.tsx`, `AdminEquipmentMaster.tsx`, `AdminEquipmentSettings.tsx`, `MasterItemTab.tsx`, `StockOpnameTab.tsx` |
| **API** | `/rest/v1/equipment`, `/rest/v1/equipment_distributions`, `/rest/v1/equipment_distribution_items` |
| **Tabel ✅** | `equipment`, `equipment_distributions`, `equipment_distribution_items`, `equipment_maintenance`, `equipment_damage` |
| **Tabel ⚠️** | `equipment_items` (diakses di frontend — schema punya `equipment` sebagai master, tidak ada `equipment_items` terpisah) |
| **Kolom ❌** | `equipment_distributions.item_name` → diquery sebagai TEXT, tapi tidak ada FK ke `equipment.id` — data tidak terhubung ke master |

---

### F-26 Rooming List

| Item | Detail |
|------|--------|
| **Halaman** | `AdminRoomAssignments.tsx`, `RoomingListPageImproved.tsx`, `DepartureRoomingTab.tsx` |
| **API** | `/rest/v1/room_assignments`, `/rest/v1/room_occupants`, `/rest/v1/booking_passengers` |
| **Tabel ✅** | `room_assignments`, `room_occupants`, `booking_passengers` |
| **Sistem Dual** | `booking_passengers.roommate_id` (double pairing) + `booking_passengers.room_number_makkah/madinah` (triple/quad grouping) + `room_assignments`+`room_occupants` (hotel system) |

---

### F-27 Operasional — Check-in & Manifes

| Item | Detail |
|------|--------|
| **Halaman** | `CheckinPage.tsx`, `OfflineCheckinPage.tsx`, `ManifestPage.tsx`, `AdminManifestJamaah.tsx`, `QRCodePage.tsx` |
| **API** | `GET /manifest/:departureId` |
| **Tabel ✅** | `bookings`, `booking_passengers`, `departures`, `attendance` |
| **Tabel ❌** | `manifests` (diakses di ManifestPage.tsx — **tidak ada di schema**), `qr_scans` (diakses di QRCodePage — **tidak ada**) |

---

### F-28 Operasional — Trip Timeline & Program

| Item | Detail |
|------|--------|
| **Halaman** | `TripTimelinePage.tsx`, `JamaahProgramLive.tsx`, `TourLeaderProgram.tsx` |
| **API** | `PATCH /guide/program/:itemId` |
| **Tabel ✅** | `trip_timeline` |
| **Kolom akses** | live_status, delay_minutes, live_notes, location_changed_to, event_time |

---

### F-29 Guide/Muthawif — Sesi & Broadcast

| Item | Detail |
|------|--------|
| **Halaman** | `MuthawifDashboard.tsx`, `MuthawifBroadcast.tsx`, `MuthawifAbsensiSesi.tsx`, `TourLeaderBroadcast.tsx`, `TourLeaderAttendance.tsx` |
| **API** | `GET /guide/channels/:departureId`, `POST /guide/broadcasts`, `POST /guide/sessions`, `POST /guide/sessions/:id/checkin` |
| **Tabel ❌** | `guide_channels` (**tidak ada di schema**), `guide_broadcasts` (**tidak ada**), `guide_sessions` (**tidak ada**), `guide_session_attendance` (**tidak ada**) |
| **Status** | 🔴 Seluruh fitur siaran muthawif/TL tidak punya tabel pendukung di schema |

---

### F-30 Manasik

| Item | Detail |
|------|--------|
| **Halaman** | `AdminManasik.tsx` |
| **API** | `/rest/v1/manasik_schedules`, `/rest/v1/manasik_attendances` |
| **Tabel ✅** | `manasik_schedules`, `manasik_attendances` |
| **Tabel ❌** | `manasik_attendances` (ada di schema sebagai `manasik_attendances` dari fase21 — perlu verifikasi nama pasti) |

---

### F-31 Dokumen & Template

| Item | Detail |
|------|--------|
| **Halaman** | `AdminDocumentGenerator.tsx`, `AdminDocumentTemplates.tsx`, `AdminDocumentAudit.tsx`, `AdminDocumentTypes.tsx`, `DocVerifyPage.tsx` |
| **API** | `POST /documents/next-number`, `POST /documents/audit`, `POST /documents/verify-tokens`, `POST /documents/signature/:id` |
| **Tabel ✅** | `document_templates`, `customer_documents`, `document_types` |
| **Tabel ❌** | `document_audit_logs` (diakses di /documents/audit — **tidak ada di schema**) |
| **Tabel ❌** | `document_verify_tokens` (diakses di /documents/verify-tokens — **tidak ada**) |
| **Tabel ❌** | `customer_signatures` (diakses di /documents/signature — **tidak ada**) |
| **Tabel ⚠️** | `document_numbering` (API menyebut `get_next_document_number` — schema punya `document_numbering_sequences` tapi function name berbeda) |

---

### F-32 Approval Workflow

| Item | Detail |
|------|--------|
| **Halaman** | `AdminApprovals.tsx` |
| **API** | `/rest/v1/approval_requests`, `/rest/v1/approval_actions` |
| **Tabel ✅** | `approval_requests`, `approval_actions`, `approval_configs` |

---

### F-33 Leads & CRM

| Item | Detail |
|------|--------|
| **Halaman** | `AdminLeads.tsx`, `AdminLeadDetail.tsx`, `AdminLeadAnalytics.tsx`, `AdminFollowUpReminder.tsx` |
| **API** | `/v1/leads`, `/rest/v1/leads` |
| **Tabel ✅** | `leads`, `packages` |
| **Kolom ⚠️** | Hook `useLeads` mencoba join `package_interest` sebagai FK tapi tidak ada tabel — `package_interest` mungkin TEXT column di `leads` |

---

### F-34 Website & Penampilan

| Item | Detail |
|------|--------|
| **Halaman** | `AdminAppearance.tsx`, `AdminLandingPageEditor.tsx`, `AdminLandingPages.tsx`, `AdminBanners.tsx`, `AdminBlog.tsx` |
| **API** | `/rest/v1/website_settings`, `/rest/v1/banners`, `/rest/v1/announcements`, `/rest/v1/media_gallery` |
| **Tabel ✅** | `website_settings`, `banners`, `announcements`, `media_gallery` |
| **Tabel ❌** | `hero_stats` (1 file — **tidak ada di schema**), `about_page_content` (4 files), `savings_page_content` (4 files), `testimonials` (useTestimonials hook) |
| **Status** | 🔴 Seluruh konten halaman publik statis (Hero, About, Testimonial) tidak punya tabel |

---

### F-35 Referral Jamaah

| Item | Detail |
|------|--------|
| **Halaman** | `JamaahReferral.tsx` |
| **API** | `/rest/v1/referral_codes`, `/rest/v1/referral_usages` |
| **Tabel ❌** | `referral_codes` (**tidak ada di schema** — 3 hits) |
| **Tabel ❌** | `referral_usages` (**tidak ada di schema** — 3 hits) |
| **Status** | 🔴 Fitur referral tidak punya tabel pendukung |

---

### F-36 Kalkulator Cicilan (CicilanGenerator)

| Item | Detail |
|------|--------|
| **Halaman** | `AdminCicilanGenerator.tsx`, `AdminCicilanReminder.tsx` |
| **API** | `/rest/v1/payment_deadline_reminders`, `/rest/v1/savings_payments` |
| **Tabel ✅** | `payment_deadline_reminders` |
| **Tabel ❌** | `savings_payments` (harusnya `savings_deposits`) |
| **Tabel ❌** | `booking_installment_schedules` (ada di schema tapi 0 frontend hits) |

---

### F-37 Hotel & Vendor Management

| Item | Detail |
|------|--------|
| **Halaman** | `AdminHotels.tsx`, `AdminHotelContracts.tsx` |
| **API** | `/rest/v1/hotels`, `/rest/v1/hotel_room_capacities` |
| **Tabel ✅** | `hotels`, `hotel_room_capacities` |
| **Tabel ❌** | `hotel_contracts`, `hotel_vouchers` (ada di schema migration 082 tapi 0 frontend hits) |
| **Tabel ✅** | `vendors`, `vendor_contracts` (diakses di AdminVendors) |
| **Tabel ❌** | `vendor_costs` (**tidak ada di schema** — 2 hits) |

---

### F-38 Cabang (Branches)

| Item | Detail |
|------|--------|
| **Halaman** | `AdminBranches.tsx`, `AdminBranchDetail.tsx`, `AdminBranchComparison.tsx` |
| **API** | `POST /branches/create`, `GET /branches/:id` |
| **Tabel ✅** | `branches`, `agents`, `departures`, `packages`, `bookings`, `user_roles`, `profiles`, `bank_accounts`, `branch_commissions`, `branch_monthly_targets` |
| **Tabel ⚠️** | `branch_memberships` (diakses di frontend, ada di schema) |

---

### F-39 Pengguna & RBAC

| Item | Detail |
|------|--------|
| **Halaman** | `AdminUsers.tsx`, `AdminAccessSimulator.tsx`, `AdminSecurityAudit.tsx`, `Admin2FASettings.tsx` |
| **API** | `POST /auth/admin/users`, `PATCH /auth/admin/users/:id`, `GET /permissions` |
| **Tabel ✅** | `profiles`, `user_roles`, `role_permissions`, `user_permissions`, `permissions_list` |
| **Tabel ❌** | `audit_logs` (AdminSecurityAudit — **tidak ada**, harusnya `rbac_audit_trail`), `login_attempts` (**tidak ada**), `user_2fa_settings` (**tidak ada**) |
| **Tabel ⚠️** | `rbac_audit_trail` (ada di schema migration 047 tapi tidak diakses di frontend) |

---

### F-40 Chatbot & FAQ

| Item | Detail |
|------|--------|
| **Halaman** | `AdminChatbotStats.tsx`, `AdminFAQManager.tsx`, `AdminChatLogs.tsx` |
| **API** | `POST /v1/chatbot`, `GET /v1/chatbot/stats` |
| **Tabel ✅** | `faqs` |
| **Tabel ✅** | `chatbot_logs` (ada di Drizzle schema, diakses via API) |

---

### F-41 Aturan Pembatalan

| Item | Detail |
|------|--------|
| **Halaman** | `AdminAturanPembatalan.tsx`, `AdminCancellationPolicies.tsx` |
| **API** | `GET /cancellation-rules`, `PUT /cancellation-rules/bulk-unassign` |
| **Tabel ✅** | `cancellation_rules`, `packages` (cancellation_rule_id) |
| **Tabel ❌** | `cancellation_rule_audit_logs` (diakses di API route tapi **tidak di schema**) |

---

### F-42 Exchange Rates & Kurs

| Item | Detail |
|------|--------|
| **Halaman** | `AdminExchangeRates.tsx`, `KursPage.tsx` |
| **API** | `/v1/kurs`, `/rest/v1/exchange_rates` |
| **Tabel ✅** | `exchange_rates` |

---

### F-43 Tabungan Haji (Savings Haji)

| Item | Detail |
|------|--------|
| **Halaman** | `AdminHajiManagement.tsx`, `JamaahSISKOHAT.tsx` |
| **API** | `/rest/v1/customers`, `/rest/v1/siskohat_sync_logs` |
| **Tabel ✅** | `customers` (kolom: nomor_porsi_haji, embarkasi_kode), `siskohat_sync_logs` |

---

### F-44 API Keys Management

| Item | Detail |
|------|--------|
| **Halaman** | `AdminApiConnect.tsx`, `AdminIntegrationSettings.tsx` |
| **API** | `/rest/v1/api_keys` |
| **Tabel ✅** | `api_keys` (ada di Drizzle schema) |

---

### F-45 Laporan Aset Kantor

| Item | Detail |
|------|--------|
| **Halaman** | `OfficeAssets.tsx` |
| **API** | `/rest/v1/equipment` (dengan filter tipe=office) |
| **Tabel ✅** | `equipment` |

---

## 14. RINGKASAN: TABEL TIDAK DIGUNAKAN DI FRONTEND/API

Tabel ada di schema tapi **0 query hits** di seluruh frontend dan API server:

| Tabel | Modul | Status |
|-------|-------|--------|
| `departure_waiting_list` | Keberangkatan | Belum ada UI |
| `hotel_contracts` | Hotel | Halaman ada tapi tidak query |
| `hotel_vouchers` | Hotel | Belum ada UI |
| `sos_escalation_log` | SOS | Belum ada UI |
| `booking_installment_schedules` | Booking | Belum ada UI |
| `booking_seat_locks` | Booking | Hanya di API server (reserve-slot) |
| `payroll_components` | SDM | Belum ada UI |
| `employee_payroll_components` | SDM | Belum ada UI |
| `payroll_slips` | SDM | Belum ada UI |
| `disciplinary_records` | SDM | Belum ada UI |
| `career_history` | SDM | Belum ada UI |
| `employee_contracts` | SDM | Belum ada UI |
| `job_postings` | Rekrutmen | Belum ada UI |
| `job_applicants` | Rekrutmen | Belum ada UI |
| `onboarding_templates` | Onboarding | Belum ada UI |
| `onboarding_template_items` | Onboarding | Belum ada UI |
| `employee_onboarding_tasks` | Onboarding | Belum ada UI |
| `position_training_curricula` | SDM | Belum ada UI (API pakai nama berbeda) |
| `agent_commission_tiers` | Agen | Belum ada UI |
| `rbac_audit_trail` | Auth | Belum ada UI (frontend pakai `audit_logs` ❌) |
| `account_periods` | Akuntansi | Belum ada UI |
| `general_ledger` | Akuntansi | Belum ada UI |
| `document_numbering_sequences` | Dokumen | API pakai nama fungsi berbeda |
| `tier_benefits` | Loyalty | Belum ada UI |
| `pwa_install_events` | Monitoring | Belum ada UI |
| `web_vitals_metrics` | Monitoring | Belum ada UI |
| `wa_feature_roadmap` | WhatsApp | Data statis, tidak ditampilkan |

---

## 15. RINGKASAN: TABEL PHANTOM (QUERY KE TABEL YANG TIDAK ADA)

Query ke tabel yang **tidak ada di schema** — akan selalu gagal/silent error:

| Tabel Phantom | Hit | Halaman Utama | Pengganti Yang Benar |
|---------------|-----|---------------|----------------------|
| `savings_payments` | 8 | AdminSavings, AdminPayments, SavingsDashboard | → `savings_deposits` |
| `loyalty_rewards` | 6 | AdminLoyalty, portal jamaah | → **buat tabel baru** |
| `loyalty_transactions` | 5 | AdminLoyalty, portal jamaah | → **buat tabel baru** |
| `salary_payments` | 5 | AdminFinanceCash | → `payroll_records` |
| `luggage` | 5 | LuggagePage, OperationalDashboard | → `baggage_policies` / `baggage_reference_items` |
| `cash_transactions` | 3+ | AdminArusKas, AdminFinanceCash, AdminLabaRugi, laporan | → **buat tabel baru** |
| `audit_logs` | 5 | AdminBookingDetail, AdminSecurityAudit | → `rbac_audit_trail` |
| `savings_page_content` | 4 | SavingsPageEditor, hooks | → **buat tabel** atau pakai `app_settings` |
| `about_page_content` | 4 | AdminAppearance | → **buat tabel** atau pakai `website_settings` |
| `agent_wallets` | 4 | AgentWallet, useAgents | → **buat tabel baru** |
| `jamaah_qr_codes` | 4 | JamaahDigitalID, AdminDepartures, QRCodePage | → **buat tabel baru** |
| `attendance_records` | 2 | AdminHR, AdminFinanceCash | → `attendance` |
| `referral_codes` | 3 | JamaahReferral | → **buat tabel baru** |
| `referral_usages` | 3 | JamaahReferral | → **buat tabel baru** |
| `preparation_checklists` | 3 | Portal jamaah persiapan | → `jamaah_checklist` |
| `virtual_accounts` | 3 | Pembayaran VA | → **buat tabel baru** |
| `hero_stats` | 1 | AdminAppearance (HeroStatsEditor) | → **buat tabel** atau pakai `website_settings` |
| `webhook_endpoints` | 3 | AdminApiConnect | → `webhooks` |
| `manifests` | 2 | ManifestPage | → query langsung dari `booking_passengers` |
| `vendor_costs` | 2 | AdminVendors | → **buat tabel baru** |
| `package_images` | 2 | Package gallery | → `media_gallery` |
| `package_groups` | — | AdminPackages | → `package_labels` |
| `login_attempts` | 1 | AdminSecurityAudit | → **buat tabel baru** |
| `user_2fa_settings` | 1 | Admin2FASettings | → **buat tabel baru** |
| `guide_channels` | API | MuthawifBroadcast | → **buat tabel baru** |
| `guide_broadcasts` | API | MuthawifBroadcast | → **buat tabel baru** |
| `guide_sessions` | API | MuthawifAbsensiSesi | → **buat tabel baru** |
| `guide_session_attendance` | API | MuthawifAbsensiSesi | → **buat tabel baru** |
| `coa_categories` | API | AdminCOA | → `chart_of_accounts` |
| `document_audit_logs` | API | AdminDocumentAudit | → **buat tabel baru** |
| `document_verify_tokens` | API | DocVerifyPage | → **buat tabel baru** |
| `customer_signatures` | API | DocSignaturePage | → **buat tabel baru** |
| `agent_invitation_tokens` | API | AgentInvite | → **buat tabel baru** |
| `testimonials` | Hook | LandingPage | → **buat tabel** atau pakai `media_gallery` |
| `theme_presets` | Hook | AdminAppearance | → **buat tabel baru** |

---

## 16. PRIORITAS PERBAIKAN

### P1 — Kritis (data hilang, fitur rusak)

1. **Ganti `savings_payments` → `savings_deposits`** di 8 file
2. **Ganti `attendance_records` → `attendance`** di AdminHR, AdminFinanceCash
3. **Ganti `coa_categories` → `chart_of_accounts`** di route /coa
4. **Ganti `audit_logs` → `rbac_audit_trail`** di AdminSecurityAudit, AdminBookingDetail
5. **Buat tabel `cash_transactions`** atau ganti query ke `transactions` (ada di schema)
6. **Buat tabel `loyalty_rewards` & `loyalty_transactions`** untuk fitur loyalty lengkap

### P2 — Penting (fitur tidak berfungsi)

7. **Buat tabel `guide_channels`, `guide_broadcasts`, `guide_sessions`, `guide_session_attendance`** untuk fitur muthawif/TL broadcast
8. **Buat tabel `agent_wallets` & `agent_wallet_transactions`** untuk fitur dompet agen
9. **Buat tabel `jamaah_qr_codes`** untuk digital ID jamaah
10. **Buat tabel `referral_codes` & `referral_usages`** untuk fitur referral
11. **Ganti `salary_payments` → `payroll_records`** di AdminFinanceCash
12. **Ganti `luggage` → `baggage_policies`** di LuggagePage
13. **Buat tabel `document_audit_logs`, `document_verify_tokens`, `customer_signatures`**

### P3 — Backlog (schema siap, UI belum)

14. Buat halaman untuk: `job_postings`, `job_applicants`, `employee_contracts`, `career_history`
15. Buat halaman untuk: `hotel_contracts`, `hotel_vouchers`
16. Buat halaman untuk: `booking_installment_schedules`
17. Hubungkan `rbac_audit_trail` ke halaman AdminSecurityAudit
18. Buat halaman untuk: `payroll_slips`, `payroll_components`

---

## §17 — KOLOM DIPAKAI DI KODE TAPI TIDAK ADA DI SCHEMA

> **Metode**: Bandingkan akses properti di source code (`artifacts/umrah-haji/src/`, `artifacts/api-server/src/`) vs skema DB aktual di `artifacts/api-server/dist/sql/01_schema.sql` + file migrasi bernomor.

---

### 17.1 — Tabel `bookings`

**Skema aktual Neon DB** (`01_schema.sql:639`): `id, customer_id, departure_id, agent_id, booking_code, status, total_price, paid_amount, payment_status, room_type, notes, referral_source, bagasi_kg_allowed, remaining_amount`

| Kolom Diakses | Pemakaian | File Lokasi | Status |
|---|---|---|---|
| `booking_status` | 69× | `useBookings.ts:18`, `AdminBookings.tsx:145,294`, `AdminReports.tsx:123`, `AdminVirtualAccount.tsx:69`, trigger DB | ❌ TIDAK ADA — schema punya `status` |
| `total_amount` | 2× | `AdminVirtualAccount.tsx:69`, `AdminFinanceAR.tsx:86` | ❌ TIDAK ADA — schema punya `total_price` |
| `base_price` | 12× | `QuickInvoiceSheet.tsx:111`, `ChangeRoomTypeDialog.tsx:105`, `RoomTypeAssignmentDialog.tsx:106`, `BulkSendTab.tsx:63` | ❌ Tidak ditemukan di migrasi Neon |
| `addons_price` | 5× | `QuickInvoiceSheet.tsx:116,168,173,174,197` | ❌ Tidak ditemukan di migrasi Neon |
| `adult_count` | 1× | `useBookingWizardDynamic.ts:303` | ❌ Tidak ditemukan di migrasi Neon |
| `child_count` | 1× | `useBookingWizardDynamic.ts` | ❌ Tidak ditemukan di migrasi Neon |
| `infant_count` | 1× | `useBookingWizardDynamic.ts` | ❌ Tidak ditemukan di migrasi Neon |
| `discount_amount` | 16× | `QuickInvoiceSheet.tsx`, `BulkSendTab.tsx:63` | ❌ Tidak ditemukan di migrasi Neon |
| `currency` | — | `BookingWizard.tsx` (via departure join) | ❌ Tidak ditemukan di migrasi Neon |
| `sales_id` | 3× | `AdminBookingCreate.tsx:482`, `AdminBookingDetail.tsx:399` | ⚠️ FK constraint added (016) tapi kolom tidak ada |
| `total_pax` | 42× | `AdminBookings.tsx`, `AdminReports.tsx`, departure triggers | ❌ Tidak ditemukan di migrasi Neon |
| `payment_deadline` | 15× | `AdminBookings.tsx`, `AdminPayments.tsx` | ❌ Tidak ditemukan di migrasi Neon |
| `branch_id` | 4× | `AdminBookings.tsx` | ❌ Tidak ditemukan di sql/migrations/ Neon |
| `remaining_amount` | 36× | `AdminBookings.tsx`, portal jamaah | ✅ Ada di `03_bookings_columns.sql` |

---

### 17.2 — Tabel `departures`

**Skema aktual Neon DB** (`01_schema.sql`): `id, package_id, departure_date, return_date, quota, available_seats, status, notes` + `price_single, booked_count` (041) + `tour_leader_user_id` (061) + `muthawif_id` (081)

| Kolom Diakses | Pemakaian | File Lokasi | Status |
|---|---|---|---|
| `flight_number` | 21× | `BoardingPassModal.tsx:240`, `DepartureForm.tsx:65,227,275,675`, `BookingWizard.tsx:147` | ❌ TIDAK ADA di Neon |
| `hotel_makkah_id` | 7+ | `DepartureForm.tsx:72,233,278,765`, `BookingWizard.tsx:147`, `LinkDepartureForm.tsx:53` | ❌ TIDAK ADA — FK ke `hotels` gagal |
| `hotel_madinah_id` | 7+ | `DepartureForm.tsx:73,234,279`, `BookingWizard.tsx:147` | ❌ TIDAK ADA |
| `departure_airport_id` | 6+ | `DepartureForm.tsx:63,225,273,691`, `LinkDepartureForm.tsx:50` | ❌ TIDAK ADA — FK ke `airports` gagal |
| `arrival_airport_id` | 4+ | `DepartureForm.tsx:64,226,274,716` | ❌ TIDAK ADA |
| `document_deadline` | 7× | `DocumentDeadlinePanel.tsx:37,116,129,215`, `DepartureForm.tsx:85` | ❌ TIDAK ADA |
| `visa_deadline` | 3× | `DepartureForm.tsx:87`, `DepartureVisaSummary` | ❌ TIDAK ADA |
| `break_even_pax` | 1× | `DepartureCommissionCard` | ❌ TIDAK ADA |
| `price_double` | 6+ | `AdminDepartureDetail.tsx`, `BookingWizard.tsx:147` | ❌ `price_double/triple/quad` ada di `packages`, bukan `departures` |
| `price_triple` | 6+ | ditto | ❌ TIDAK ADA di departures |
| `price_quad` | 8+ | ditto | ❌ TIDAK ADA di departures |
| `price_adult` | 3× | portal jamaah, pricing page | ⚠️ di `09_passenger_pricing.sql` (perlu verifikasi) |
| `price_child` | 3× | ditto | ⚠️ ditto |
| `price_infant` | 3× | ditto | ⚠️ ditto |
| `airline_id` | 5+ | `DepartureForm.tsx`, joins dalam select query | ❌ TIDAK ADA — FK ke `airlines` gagal |
| `departure_time` | 1× | `DepartureForm.tsx` | ❌ TIDAK ADA |
| `month` | 6× | filter kolom, dashboard stats | ❌ TIDAK ADA |
| `payment_deadline` | 1× | `DepartureForm.tsx` | ❌ TIDAK ADA |
| `meta_title` | 1× | SEO module | ⚠️ di `14_seo_fields_departures.sql` (perlu verifikasi) |
| `meta_description` | 1× | SEO module | ⚠️ ditto |
| `slug` | 1× | URL routing | ⚠️ ditto |
| `currency` | 1× | `BookingWizard.tsx:147` (select dari departures) | ❌ TIDAK ADA |
| `operational_cost_per_pax` | 1× | finance/HPP | ❌ TIDAK ADA |
| `team_leader_id` | 1× | FK di types.ts | ❌ TIDAK ADA |
| `booked_count` | 12× | `AdminDepartureDetail.tsx`, paxCount HPP | ✅ Ada di `041_tab_fix4_departures_price_single.sql` |
| `available_seats` | 5+ | `BookingWizard.tsx`, availability check | ✅ Ada di schema dasar |
| `muthawif_id` | 2× | `DepartureMuthawifPanel`, departure detail | ✅ Ada di `081_departure_muthawif_id.sql` |

---

### 17.3 — Tabel `customers`

**Skema aktual Neon DB** (`01_schema.sql`): `id, user_id, branch_id, full_name, nik, gender, phone, email, address, city, province, postal_code, birth_date, birth_place, passport_number, passport_expiry, passport_issued, photo_url, is_active, nomor_porsi_haji, embarkasi_kode, estimasi_keberangkatan_haji` + `district, village` (036) + `height_cm, weight_kg, clothing_size` (083)

| Kolom Diakses | Pemakaian | File Lokasi | Status |
|---|---|---|---|
| `blood_type` | 2× | `AdminCustomerDetail.tsx`, CustomerForm | ❌ TIDAK ADA di Neon |
| `emergency_contact_name` | 3× | CustomerForm, portal jamaah | ❌ TIDAK ADA |
| `emergency_contact_phone` | 5× | CustomerForm, portal jamaah | ❌ TIDAK ADA |
| `emergency_contact_relation` | 3× | CustomerForm | ❌ TIDAK ADA |
| `is_tour_leader` | 6× | portal jamaah, departure detail | ❌ TIDAK ADA |
| `mother_name` | 2× | dokumen PDF, form pasport | ❌ TIDAK ADA |
| `father_name` | 2× | dokumen PDF | ❌ TIDAK ADA |
| `mahram_name` | 2× | form mahram, BookingCreate | ❌ TIDAK ADA di customers (ada di tabel `mahrams`) |
| `mahram_relation` | 1× | form mahram | ❌ TIDAK ADA di customers |
| `marital_status` | 2× | CustomerForm | ❌ TIDAK ADA |
| `height_cm` | 2× | portal jamaah, admin customer | ✅ Ada di `083_sprint_d_height_clothing_size.sql` |
| `weight_kg` | — | — | ✅ Ada di `083` |
| `clothing_size` | 2× | portal jamaah | ✅ Ada di `083` |
| `district` | 1× | CustomerForm | ✅ Ada di `036_patch_customer_mahrams_rls.sql` |
| `village` | 1× | CustomerForm | ✅ Ada di `036` |
| `face_descriptor` | — | FaceDescriptor feature | ⚠️ `049` menambah ke `employees`, bukan `customers` |

---

### 17.4 — Tabel `agents`

**Skema aktual Neon DB**: `id, user_id, branch_id, parent_agent_id, company_name, agent_code, contact_name, phone, email, address, commission_rate, is_active, slug, featured_package_ids, website_bio, level`

| Kolom Diakses | Pemakaian | File Lokasi | Status |
|---|---|---|---|
| `membership_tier` | 3+ | `AdminAgentDetail.tsx`, `PICSelectionStep.tsx` | ❌ Tidak ada di sql/migrations/ Neon |
| `membership_tier_updated_at` | — | `types.ts` | ❌ TIDAK ADA |
| `total_confirmed_bookings` | 2+ | `AdminAgentDetail.tsx`, dashboard | ❌ TIDAK ADA |
| `ktp_number` | 1× | `AdminAgentDetail.tsx:472,496` | ❌ TIDAK ADA |
| `ktp_url` | 1× | `AdminAgentDetail.tsx:472` | ❌ TIDAK ADA |
| `status` (pending/active/suspended) | 3+ | `AdminAgents.tsx`, `types.ts` | ⚠️ `062_agent_status_branch_staff.sql` menambah kolom + index |
| `npwp` | — | `types.ts` | ❌ TIDAK ADA |
| `bank_name` | — | `types.ts` | ❌ `012_hr_enhancements.sql` tambah ke `employees`, bukan `agents` |
| `bank_account_number` | — | `types.ts` | ❌ ditto |
| `bank_account_name` | — | `types.ts` | ❌ ditto |

---

### 17.5 — Tabel `booking_passengers`

**Skema aktual**: `id, booking_id, customer_id, is_main_passenger, passenger_type, room_preference, room_number, room_group_id, family_group_id, checkin_status, checkin_time, checkin_notes`

| Kolom Diakses | Pemakaian | File Lokasi | Status |
|---|---|---|---|
| `seat_number` | 3× | `BoardingPassModal.tsx`, boarding pass PDF | ❌ TIDAK ADA |
| `nationality` | 2× | manifest, boarding pass | ❌ TIDAK ADA |
| `roommate_id` | — | rooming system | ⚠️ Perlu verifikasi (ada di supabase migration) |
| `passport_issued` | — | dokumen | ⚠️ Ada di `customers` bukan `booking_passengers` |

---

## §18 — TABEL PHANTOM (DIPAKAI DI KODE, TIDAK ADA DI SCHEMA NEON DB)

> Tabel phantom = `supabase.from('nama_tabel')` dipanggil di kode tapi tabel tidak ada di `01_schema.sql` maupun numbered migration files.

| Tabel Phantom | File Pemakai | Jumlah File | Tabel Seharusnya | Dampak |
|---|---|---|---|---|
| `savings_payments` | `AdminSavings.tsx`, `useJamaahSavings.ts`, `BookingDetail.tsx`, `useBookingWizardDynamic.ts`, + 1 | 5 | `savings_deposits` | 🔴 Semua query tabungan gagal |
| `attendance_records` | `AdminHR.tsx`, `AdminFinanceCash.tsx`, `useAttendance.ts`, `AdminPayroll.tsx`, + 3 | 7 | `attendance` | 🔴 Modul absensi HR rusak total |
| `audit_logs` | `AdminSecurity.tsx`, `AdminBookingDetail.tsx`, `useAuditLog.ts`, + 4 | 7 | `rbac_audit_trail` | 🔴 Log audit tidak tampil |
| `cash_transactions` | `AdminFinanceCash.tsx`, `AdminFinanceKas.tsx`, `useCashTransactions.ts`, + 6 | 9 | ❌ Tidak ada ekuivalen | 🔴 Modul kas keuangan rusak total |
| `agent_wallets` | `AdminAgentDetail.tsx`, `useAgentWallet.ts`, `AgentWallet.tsx` | 3 | ❌ Tidak ada | 🟠 Dompet agen kosong |
| `agent_wallet_transactions` | `AdminAgentDetail.tsx`, `AgentWallet.tsx` | 2 | ❌ Tidak ada | 🟠 Riwayat dompet agen kosong |
| `loyalty_rewards` | `AdminLoyalty.tsx`, `useJamaahLoyalty.ts`, `LoyaltyPage.tsx` | 3 | ❌ Tidak ada | 🟠 Fitur loyalty tidak berfungsi |
| `loyalty_transactions` | `AdminLoyalty.tsx`, `useJamaahLoyalty.ts`, `LoyaltyPage.tsx` | 3 | ❌ Tidak ada | 🟠 Riwayat poin kosong |
| `jamaah_qr_codes` | `JamaahQRCard.tsx`, `useJamaahQR.ts` | 2 | ❌ Tidak ada | 🟡 QR digital jamaah gagal generate |
| `referral_codes` | `ReferralPage.tsx`, `useReferral.ts` | 2 | ❌ Tidak ada | 🟡 Halaman referral error |
| `referral_usages` | `ReferralPage.tsx`, `useReferral.ts` | 2 | ❌ Tidak ada | 🟡 ditto |
| `guide_sessions` | `GuideSessionPage.tsx` | 1 | ❌ Tidak ada | 🟡 Halaman sesi guide error |
| `salary_payments` | `AdminFinanceCash.tsx` | 1 | `payroll_records` | 🟠 Gaji karyawan tidak tampil |
| `luggage` | `LuggagePage.tsx` | 1 | `baggage_policies` | 🟡 Halaman bagasi error |

---

## §19 — KOLOM DATABASE YANG TIDAK PERNAH DIPAKAI

> Kolom ada di schema tapi 0 akses di seluruh source code frontend + API server.

### 19.1 — `bookings`
| Kolom | Alasan Tidak Dipakai |
|---|---|
| `room_number` | Ditambah di migration 026 tapi frontend pakai `booking_passengers.room_number` |
| `bagasi_kg_allowed` | Ada di schema, hanya tampil di 1 form (tidak diquery secara aktif) |
| `referral_source` | Ada field di form tapi filter/report tidak memanfaatkan |

### 19.2 — `customers`
| Kolom | Alasan |
|---|---|
| `passport_issued` | Di schema tapi tidak tampil di form/dokumen manapun |
| `is_active` | Schema ada tapi filter aktif/nonaktif jarang dipakai di UI |
| `embarkasi_kode` | Haji-specific, modul haji belum selesai |
| `estimasi_keberangkatan_haji` | ditto |

### 19.3 — `departures`
| Kolom | Alasan |
|---|---|
| `available_seats` | Schema ada tapi UI kebanyakan pakai `booked_count` untuk display |
| `notes` | Field ada tapi tidak tampil di detail view departures |

### 19.4 — `packages`
| Kolom | Alasan |
|---|---|
| `price_double`, `price_triple`, `price_quad` | Di `packages` tapi frontend query dari `departures` (yang tidak punya kolom ini) → data tidak dipakai |
| `hotel_mecca`, `hotel_medina` | Kolom teks lama, UI pakai join ke `hotels` via `departures.hotel_makkah_id` |
| `airline` | Kolom teks lama, UI pakai join ke `airlines` via `departures.airline_id` |
| `fee_branch` | Ada di schema, tidak dipakai di perhitungan komisi aktual |

### 19.5 — Tabel lengkap dengan banyak kolom tidak terpakai
| Tabel | Kolom Tidak Terpakai |
|---|---|
| `muthawifs` | `bio`, `rating`, `total_reviews`, `languages` |
| `itinerary_templates` | `is_public`, `tags` |
| `manasik_sessions` | `max_attendees`, `location_detail`, `notes` |
| `push_subscriptions` | `device_id`, `os`, `browser` (sebagian) |

---

## §20 — TABEL DATABASE YANG TIDAK PERNAH DIPAKAI

> Tabel ada di schema Neon DB tapi 0 query di seluruh source code.

| Tabel | Migration | Alasan Tidak Dipakai | Prioritas Hapus |
|---|---|---|---|
| `job_applications` | 069_sdm | Rekrutmen belum diimplementasi di frontend | P3 |
| `recruitment_stages` | 069_sdm | ditto | P3 |
| `employee_onboarding` | 071_onboarding | Onboarding UI belum dibuat | P3 |
| `general_ledger` | keuangan fase1 | Modul GL belum implementasi | P3 |
| `trip_timeline_entries` | 057 | Trip timeline tidak diquery di frontend | P3 |
| `savings_accounts` | 001_foundation | Frontend pakai `savings_plans` bukan `savings_accounts` | ⚠️ Perlu reconcile |
| `savings_deposits` | 001_foundation | Frontend pakai `savings_payments` (phantom!) | 🔴 Perlu rename |
| `manasik_attendance` | 017 | Absensi manasik UI memakai `attendance_records` (phantom) | 🔴 Perlu reconcile |
| `dashboard_access_config` | 008 | Digantikan oleh permissions system | P3 |
| `web_vitals_metrics` | 20260517 | Monitoring frontend tidak aktif | P3 |
| `rate_limits` | rbac migration | Tidak ada UI atau API endpoint | P3 |
| `agent_commission_tiers` | 046 | Tabel ada tapi `AdminAgentDetail` tidak menampilkan tier table | P2 |
| `booking_seat_locks` | 048 | Seat locking tidak dipakai di booking wizard | P3 |
| `booking_installment_schedules` | 043 | Cicilan tidak ada UI | P3 |
| `scheduled_reports` | 044 | Laporan terjadwal tidak ada UI aktif | P2 |
| `invoice_templates` | 055 | Template invoice tidak dipakai (PDF di-generate langsung) | P3 |
| `trip_timeline_items` | 007_trip_timeline_v2 | ditto dengan trip_timeline_entries | P3 |
| `wa_chatbot_conversation_history` | 017_wa | WA chatbot modul tidak dihubungkan ke UI | P2 |
| `document_numbering_sequences` | 073 | Penomoran dokumen tidak dipakai secara aktif | P3 |

---

## §21 — RELASI YANG TIDAK KONSISTEN (FK ISSUES)

### 21.1 — FK di kode tapi kolom tidak ada di schema

| Relasi Digunakan | File | Masalah |
|---|---|---|
| `hotels!departures_hotel_makkah_id_fkey` | `BookingWizard.tsx:147`, `LinkDepartureForm.tsx:53`, `BulkSendTab.tsx:71`, `ItineraryPDFTab.tsx:238` | `departures.hotel_makkah_id` tidak ada → FK constraint tidak bisa dibuat → semua join ini return null |
| `hotels!departures_hotel_madinah_id_fkey` | `BookingWizard.tsx:147`, `LinkDepartureForm.tsx:54`, `BulkSendTab.tsx:72` | ditto |
| `airports!departures_departure_airport_id_fkey` | `LinkDepartureForm.tsx:50`, `StepReviewSimple.tsx:80`, `BulkSendTab.tsx:69` | `departures.departure_airport_id` tidak ada |
| `airports!departures_arrival_airport_id_fkey` | multiple | ditto |
| `profiles!bookings_sales_id_fkey` | `AdminBookingDetail.tsx:399` (kode bahkan ada komentar "FK doesn't exist") | `bookings.sales_id` kolom tidak ada di Neon → join gagal |
| `airlines!departures_airline_id_fkey` | `DepartureForm.tsx`, join queries | `departures.airline_id` tidak ada |

### 21.2 — Nama kolom inkonsisten antara tabel/view

| Pemakaian di Code | Schema Sebenarnya | Dampak |
|---|---|---|
| `bookings.booking_status` (69×) | `bookings.status` | Semua filter `.eq('booking_status', ...)` return error atau data salah |
| `bookings.total_amount` (2×) | `bookings.total_price` | AdminVirtualAccount tampilkan NULL/0 |
| `savings_deposits` (schema) vs `savings_payments` (code 5 files) | Nama tabel berbeda | Query tabungan selalu gagal |
| `attendance` (schema) vs `attendance_records` (code 7 files) | Nama tabel berbeda | Absensi tidak tampil |
| `rbac_audit_trail` (schema) vs `audit_logs` (code 7 files) | Nama tabel berbeda | Log audit tidak tampil |

### 21.3 — FK yang ada di kode tapi tidak punya migration CREATE TABLE

| FK / Join | Tabel Target | Status |
|---|---|---|
| `savings_plans.customer_id → customers.id` | Keduanya ada | ✅ OK |
| `bookings.agent_id → agents.id` | Keduanya ada | ✅ OK |
| `departures.muthawif_id → muthawifs.id` | ✅ `081` menambah kolom + FK | ✅ OK |
| `bookings.sales_id → profiles.id` | `sales_id` tidak ada di `bookings` | ❌ Migration 016 hanya tambah constraint, kolom tidak pernah dibuat |
| `departures.hotel_makkah_id → hotels.id` | Kolom tidak ada | ❌ FK tidak bisa dibuat |
| `departures.airline_id → airlines.id` | Kolom tidak ada | ❌ FK tidak bisa dibuat |

### 21.4 — CHECK constraint mismatch

| Kolom | CHECK di Schema | Nilai di Code |
|---|---|---|
| `bookings.status` | `('pending','confirmed','cancelled','completed')` | Kode juga kirim `'processing'`, `'rejected'` via `booking_status` field |
| `departures.status` | `('open','closed','full','cancelled')` | Kode juga handle `'draft'` di beberapa tempat |
| `booking_passengers.passenger_type` | `('dewasa','lansia','anak','mahram')` | `useBookingWizardDynamic.ts` juga kirim `'adult'`, `'child'`, `'infant'` (English) |

---

## §22 — POTENSI BUG AKIBAT KETIDAKSESUAIAN SCHEMA

> Dampak nyata ke pengguna / operator. Diurutkan dari paling kritis.

### 🔴 P0 — Fitur Utama Rusak Total

#### BUG-01: Filter status booking tidak berfungsi
- **File**: `useBookings.ts:18`, `AdminBookings.tsx:145,294`, `AdminReports.tsx:123`
- **Kode**: `.eq('booking_status', filters.status)`
- **Masalah**: Kolom `booking_status` tidak ada di tabel `bookings` (schema punya `status`). Query via proxy akan return error PostgreSQL `column "booking_status" does not exist` atau semua baris karena proxy fallback.
- **Dampak**: Admin tidak bisa filter booking berdasarkan status → semua booking tampil sekaligus

#### BUG-02: Harga departures selalu 0 di booking wizard
- **File**: `BookingWizard.tsx:147`
- **Kode**: `select('...price_quad, price_triple, price_double...')` dari `departures`
- **Masalah**: `price_double/triple/quad` ada di tabel `packages`, BUKAN `departures`. Departures di Neon hanya punya `price_single` (dari 041).
- **Dampak**: Booking wizard tampilkan harga 0 → jamaah tidak tahu harga paket

#### BUG-03: Semua query tabungan jamaah gagal
- **File**: `AdminSavings.tsx`, `useJamaahSavings.ts`, `BookingDetail.tsx`, `useBookingWizardDynamic.ts`
- **Kode**: `.from('savings_payments')`
- **Masalah**: Tabel bernama `savings_deposits` di schema, bukan `savings_payments`
- **Dampak**: Halaman tabungan error, riwayat setoran tidak tampil

#### BUG-04: Modul kas keuangan rusak total
- **File**: `AdminFinanceCash.tsx`, `AdminFinanceKas.tsx`, `useCashTransactions.ts` (9 file)
- **Kode**: `.from('cash_transactions')`
- **Masalah**: Tabel `cash_transactions` tidak ada di schema Neon DB sama sekali
- **Dampak**: Halaman Kas Keuangan selalu error

#### BUG-05: Modul absensi HR rusak
- **File**: `AdminHR.tsx`, `AdminFinanceCash.tsx`, `AdminPayroll.tsx` (7 file)
- **Kode**: `.from('attendance_records')`
- **Masalah**: Tabel adalah `attendance` di Neon DB
- **Dampak**: Data absensi tidak tampil di HR dan payroll

---

### 🟠 P1 — Fitur Penting Tidak Berfungsi

#### BUG-06: Invoice/PDF hitung harga salah
- **File**: `QuickInvoiceSheet.tsx:111-197`
- **Kode**: `booking.base_price`, `booking.addons_price`, `booking.discount_amount`
- **Masalah**: Ketiga kolom ini tidak ada di Neon DB → nilai selalu `undefined/null` → perhitungan total invoice salah (tampil 0 atau `NaN`)
- **Dampak**: Invoice yang dikirim ke jamaah mencantumkan harga salah

#### BUG-07: Form departures tidak menyimpan data penting
- **File**: `DepartureForm.tsx:273-279`
- **Kode**: Save `flight_number`, `hotel_makkah_id`, `hotel_madinah_id`, `departure_airport_id`, `arrival_airport_id`, `document_deadline`, `visa_deadline`
- **Masalah**: Kolom-kolom ini tidak ada di tabel `departures` Neon DB
- **Dampak**: Data penerbangan, hotel, dan deadline yang diisi admin hilang setelah save → tidak muncul di detail departure

#### BUG-08: Log audit tidak bisa dibuka
- **File**: `AdminSecurity.tsx`, `AdminBookingDetail.tsx`, + 5 file
- **Kode**: `.from('audit_logs')`
- **Masalah**: Schema punya `rbac_audit_trail`, bukan `audit_logs`
- **Dampak**: Halaman audit log selalu kosong atau error

#### BUG-09: AdminVirtualAccount tampilkan total salah
- **File**: `AdminVirtualAccount.tsx:69`
- **Kode**: `bookings(id, booking_code, booking_status, total_amount)`
- **Masalah**: (1) `booking_status` tidak ada, (2) `total_amount` tidak ada (schema: `total_price`)
- **Dampak**: Virtual account list tampilkan total 0 untuk semua booking

#### BUG-10: Form customer tidak menyimpan field penting
- **File**: `AdminCustomerForm.tsx`, `CustomerPortalProfile.tsx`
- **Kode**: Save `blood_type`, `emergency_contact_name/phone/relation`, `is_tour_leader`, `mother_name`, `father_name`, `mahram_name`, `marital_status`
- **Masalah**: Kolom-kolom ini tidak ada di tabel `customers` Neon DB
- **Dampak**: Data medis dan kontak darurat jamaah tidak tersimpan → risiko keselamatan

---

### 🟡 P2 — Fitur Tidak Sempurna / Data Hilang

#### BUG-11: Boarding pass dan manifest tidak ada nomor kursi
- **File**: `BoardingPassModal.tsx`
- **Kode**: `passenger.seat_number`
- **Masalah**: `booking_passengers.seat_number` tidak ada di schema
- **Dampak**: Boarding pass tidak menampilkan nomor kursi

#### BUG-12: Dokumen perjalanan tidak ada nama ibu/ayah/mahram
- **File**: `BulkSendTab.tsx`, dokumen PDF
- **Kode**: `customer.mother_name`, `customer.father_name`, `customer.mahram_name`
- **Masalah**: Kolom tidak ada di `customers` Neon DB
- **Dampak**: Dokumen paspor / visa tidak lengkap

#### BUG-13: Halaman referral, loyalty, dan QR jamaah error
- **File**: `ReferralPage.tsx`, `LoyaltyPage.tsx`, `JamaahQRCard.tsx`
- **Masalah**: Tabel `referral_codes`, `loyalty_rewards`, `jamaah_qr_codes` tidak ada
- **Dampak**: Halaman-halaman ini selalu throw error saat mount

#### BUG-14: Passenger type mismatch di booking wizard
- **File**: `useBookingWizardDynamic.ts`
- **Kode**: Kirim `passenger_type: 'adult'` / `'child'` / `'infant'`
- **Masalah**: CHECK constraint di `booking_passengers.passenger_type` hanya izinkan `'dewasa','lansia','anak','mahram'`
- **Dampak**: INSERT booking gagal dengan constraint violation jika menggunakan nilai English

#### BUG-15: Agen tidak punya membership tier & verifikasi KTP
- **File**: `AdminAgentDetail.tsx:472`, `PICSelectionStep.tsx`
- **Kode**: `agent.membership_tier`, `agent.ktp_number`, `agent.status`, `agent.total_confirmed_bookings`
- **Masalah**: Kolom tidak ada di Neon DB (kecuali `status` yang ditambah di `062`)
- **Dampak**: Profil agen tidak menampilkan tier, KTP, dan jumlah booking terkonfirmasi

---

## §23 — RINGKASAN PRIORITAS PERBAIKAN

### Total Temuan
| Kategori | Jumlah |
|---|---|
| Kolom dipakai tapi tidak ada di schema | **47 kolom** |
| Tabel phantom (query tapi tidak ada) | **14 tabel** |
| Kolom tidak pernah dipakai | **~25 kolom** |
| Tabel tidak pernah dipakai | **19 tabel** |
| FK inkonsisten / broken join | **6 relasi** |
| Bug aktif berdampak ke pengguna | **15 bug** |

### Aksi Prioritas

#### 🔴 P0 — Harus Fix Sekarang (sistem rusak)
1. **Tambah kolom `bookings`**: `booking_status` (alias untuk `status`), `base_price`, `addons_price`, `adult_count`, `child_count`, `infant_count`, `discount_amount`, `total_pax`, `payment_deadline`, `branch_id`, `sales_id`, `currency` → **1 migration baru**
2. **Tambah kolom `departures`**: `flight_number`, `hotel_makkah_id`, `hotel_madinah_id`, `departure_airport_id`, `arrival_airport_id`, `document_deadline`, `visa_deadline`, `break_even_pax`, `airline_id`, `departure_time`, `month`, `payment_deadline`, `price_double`, `price_triple`, `price_quad`, `currency`, `team_leader_id`, `operational_cost_per_pax` → **1 migration baru**
3. **Rename atau buat alias tabel**: `savings_payments` → query ke `savings_deposits`, `attendance_records` → `attendance`, `audit_logs` → `rbac_audit_trail`
4. **Buat tabel `cash_transactions`** atau refactor query ke tabel lain
5. **Tambah kolom `customers`**: `blood_type`, `emergency_contact_name/phone/relation`, `is_tour_leader`, `mother_name`, `father_name`, `mahram_name`, `mahram_relation`, `marital_status`
6. **Fix `booking_passengers.passenger_type` CHECK** atau normalize nilai English → Bahasa

#### 🟠 P1 — Fix Segera (fitur penting tidak berfungsi)
7. Tambah kolom `agents`: `membership_tier`, `ktp_number`, `ktp_url`, `total_confirmed_bookings`, `npwp`, `bank_name/account_number/name`
8. Tambah kolom `booking_passengers`: `seat_number`, `nationality`
9. Buat tabel `agent_wallets` + `agent_wallet_transactions`
10. Fix `AdminVirtualAccount.tsx:69` — ganti `total_amount` → `total_price`

#### 🟡 P2 — Plan (fitur baru)
11. Buat tabel `loyalty_rewards`, `loyalty_transactions`
12. Buat tabel `jamaah_qr_codes`
13. Buat tabel `referral_codes`, `referral_usages`
14. Buat tabel `guide_channels`, `guide_broadcasts`, `guide_sessions`

