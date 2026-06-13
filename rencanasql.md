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
