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


---

## §24 — SCHEMA DATABASE FINAL

> Schema ini disusun berdasarkan seluruh migrasi Neon DB (`artifacts/api-server/dist/sql/`), query aktual di source code, dan analisis §17–§22.
> Kolom bertanda `-- [TAMBAH]` belum ada di DB dan perlu migration baru.
> Tabel bertanda `⚠️ DEPRECATED` kemungkinan tidak aktif dipakai.

---

### 24.1 — ERD (Entity Relationship Diagram)

```
╔══════════════════════════════════════════════════════════════════════╗
║                    VINSTOUR — CORE ERD                                ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  AUTH LAYER                                                           ║
║  auth.users ──────┬──────────────────────────────────────────────    ║
║                   │                                                   ║
║                   ├─< profiles (1:1)                                  ║
║                   ├─< user_roles (1:N) ──> branches                  ║
║                   └─< agents (via user_id)                           ║
║                                                                        ║
║  ORGANISATION                                                         ║
║  branches ──< agents ──< bookings                                    ║
║           └──< employees                                             ║
║           └──< packages ──< departures                              ║
║                                                                        ║
║  TRAVEL CORE                                                          ║
║  packages ──< departures ──< bookings ──< booking_passengers         ║
║                    │              │                                   ║
║                    ├──> hotels (hotel_makkah_id, hotel_madinah_id)   ║
║                    ├──> airlines (airline_id)                        ║
║                    ├──> airports (departure/arrival_airport_id)      ║
║                    ├──> muthawifs (muthawif_id)                      ║
║                    ├──< room_assignments ──< room_occupants          ║
║                    ├──< departure_cost_items                         ║
║                    ├──< departure_expenses                           ║
║                    ├──< departure_muthawifs                          ║
║                    └──< guide_channels ──< guide_sessions            ║
║                                                                        ║
║  CUSTOMER                                                             ║
║  customers ──< bookings                                              ║
║           ├──< customer_mahrams                                      ║
║           ├──< savings_plans ──< savings_deposits                    ║
║           ├──< visa_applications                                     ║
║           └──< attendance                                            ║
║                                                                        ║
║  BOOKING ─ PAYMENT                                                   ║
║  bookings ──< payments                                               ║
║          ├──< booking_passengers ──> customers                       ║
║          ├──< booking_feedback                                       ║
║          └──< booking_departure_checklists                           ║
║                                                                        ║
║  FINANCE                                                              ║
║  departures ──< departure_cost_items ──> coa_categories              ║
║             ├──< departure_expenses                                  ║
║             ├──< departure_other_revenues                            ║
║             └──── departure_financial_summary (1:1)                  ║
║  journal_entries ──< journal_entry_lines ──> coa_categories          ║
║                                                                        ║
║  HR/SDM                                                               ║
║  employees ──< payroll_records                                       ║
║           ├──< leave_requests                                        ║
║           ├──< employee_contracts                                    ║
║           ├──< performance_reviews                                   ║
║           └──< disciplinary_records                                  ║
║                                                                        ║
║  EQUIPMENT                                                            ║
║  equipment_items ──< equipment_variants                              ║
║                  └──< equipment_distributions ──> customers           ║
║                                                                        ║
╚══════════════════════════════════════════════════════════════════════╝
```

---

### 24.2 — Relasi Tabel (FK Map)

| Tabel | FK Kolom | → Referensi |
|---|---|---|
| profiles | id | → auth.users(id) |
| user_roles | user_id | → auth.users(id) |
| user_roles | branch_id | → branches(id) |
| agents | user_id | → auth.users(id) |
| agents | branch_id | → branches(id) |
| agents | parent_agent_id | → agents(id) |
| packages | branch_id | → branches(id) |
| packages | airline_id | → airlines(id) `[ADDED via 092]` |
| packages | cancellation_rule_id | → cancellation_rules(id) |
| departures | package_id | → packages(id) |
| departures | airline_id | → airlines(id) `[ADDED via 092]` |
| departures | hotel_makkah_id | → hotels(id) `[TAMBAH]` |
| departures | hotel_madinah_id | → hotels(id) `[TAMBAH]` |
| departures | departure_airport_id | → airports(id) `[TAMBAH]` |
| departures | arrival_airport_id | → airports(id) `[TAMBAH]` |
| departures | muthawif_id | → muthawifs(id) `[via 081]` |
| departures | team_leader_id | → profiles(id) `[TAMBAH]` |
| bookings | customer_id | → customers(id) |
| bookings | departure_id | → departures(id) |
| bookings | agent_id | → agents(id) |
| bookings | branch_id | → branches(id) `[TAMBAH]` |
| bookings | sales_id | → profiles(id) `[TAMBAH kolom]` |
| booking_passengers | booking_id | → bookings(id) |
| booking_passengers | customer_id | → customers(id) |
| payments | booking_id | → bookings(id) |
| customers | user_id | → auth.users(id) |
| customers | branch_id | → branches(id) |
| customer_mahrams | customer_id | → customers(id) |
| savings_plans | customer_id | → customers(id) |
| savings_deposits | plan_id | → savings_plans(id) |
| attendance | departure_id | → departures(id) |
| attendance | customer_id | → customers(id) |
| room_assignments | departure_id | → departures(id) |
| room_occupants | room_assignment_id | → room_assignments(id) |
| room_occupants | customer_id | → customers(id) |
| departure_cost_items | departure_id | → departures(id) |
| departure_cost_items | account_code | → coa_categories(code) |
| departure_expenses | departure_id | → departures(id) |
| departure_expenses | booking_id | → bookings(id) |
| departure_financial_summary | departure_id | → departures(id) |
| departure_muthawifs | departure_id | → departures(id) |
| departure_muthawifs | muthawif_id | → muthawifs(id) |
| journal_entries | branch_id | → branches(id) |
| journal_entry_lines | entry_id | → journal_entries(id) |
| employees | user_id | → auth.users(id) |
| employees | branch_id | → branches(id) |
| payroll_records | employee_id | → employees(id) |
| leave_requests | employee_id | → employees(id) |
| employee_contracts | employee_id | → employees(id) |
| performance_reviews | employee_id | → employees(id) |
| equipment_variants | equipment_id | → equipment_items(id) |
| equipment_distributions | customer_id | → customers(id) |
| equipment_distributions | departure_id | → departures(id) |
| equipment_distributions | booking_id | → bookings(id) |
| leads | branch_id | → branches(id) |
| leads | agent_id | → agents(id) |
| guide_channels | departure_id | → departures(id) |
| guide_sessions | departure_id | → departures(id) |
| guide_session_attendance | session_id | → guide_sessions(id) |
| hotel_contracts | hotel_id | → hotels(id) |
| hotel_contracts | departure_id | → departures(id) |
| coa_categories | parent_code | → coa_categories(code) |
| finance_budgets | account_code | → coa_categories(code) |


---

### 24.3 — CREATE TABLE: Domain AUTH & ORGANISASI

```sql
-- ============================================================
-- DOMAIN 1: AUTH & PROFIL PENGGUNA
-- ============================================================

-- auth.users (dikelola Neon / bcrypt auth — tidak dimodifikasi langsung)
-- id UUID PK, email TEXT, encrypted_password TEXT, created_at TIMESTAMPTZ

CREATE TABLE IF NOT EXISTS profiles (
  id           UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,
  avatar_url   TEXT,
  phone        TEXT,
  email        TEXT,
  role         TEXT        DEFAULT 'customer',
  jabatan      TEXT,                        -- [via 062] jabatan karyawan
  joined_at    DATE,                        -- [via 062]
  session_version INTEGER  NOT NULL DEFAULT 1, -- [via 87/092] invalidasi sesi
  totp_secret  TEXT,                        -- [via 095] TOTP 2FA
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id         UUID   DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       TEXT   NOT NULL CHECK (role IN (
    'super_admin','owner','admin','branch_manager','finance',
    'operational','sales','marketing','hr','equipment',
    'agent','sub_agent','customer','jamaah','visa_officer'
  )),
  branch_id  UUID   REFERENCES branches(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, role)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id             UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  role           TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  is_enabled     BOOLEAN DEFAULT TRUE,
  UNIQUE (role, permission_key)
);

CREATE TABLE IF NOT EXISTS permissions_list (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key         TEXT NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  group_name  TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOMAIN 2: CABANG & KARYAWAN
-- ============================================================

CREATE TABLE IF NOT EXISTS branches (
  id                   UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name                 TEXT    NOT NULL,
  code                 TEXT    NOT NULL UNIQUE,
  address              TEXT,
  city                 TEXT,
  province             TEXT,
  phone                TEXT,
  email                TEXT,
  manager_user_id      UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active            BOOLEAN DEFAULT TRUE,
  slug                 TEXT    UNIQUE,
  commission_rate      NUMERIC(5,2) DEFAULT 0,  -- [via 071]
  website_description  TEXT,
  website_banner_url   TEXT,
  website_gallery      JSONB   DEFAULT '[]',
  website_testimonials JSONB   DEFAULT '[]',
  featured_package_ids JSONB   DEFAULT '[]',
  view_count           INTEGER DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_branches_slug      ON branches(slug);
CREATE INDEX IF NOT EXISTS idx_branches_is_active ON branches(is_active);

CREATE TABLE IF NOT EXISTS employees (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id           UUID    REFERENCES branches(id)  ON DELETE SET NULL,
  full_name           TEXT    NOT NULL,
  employee_code       TEXT    UNIQUE,
  position            TEXT,
  department          TEXT,
  phone               TEXT,
  email               TEXT,
  join_date           DATE,
  status              TEXT    NOT NULL DEFAULT 'active'
                              CHECK (status IN ('active','inactive','resigned')),
  salary              NUMERIC(15,2) DEFAULT 0,
  basic_salary        NUMERIC(15,2) DEFAULT 0,
  allowances          JSONB   DEFAULT '{}',
  photo_url           TEXT,
  npwp                TEXT,
  nik                 TEXT,
  bank_name           TEXT,
  bank_account_number TEXT,
  bank_account_name   TEXT,
  tax_id              TEXT,
  bpjs_kes_number     TEXT,
  bpjs_tk_number      TEXT,
  face_descriptor     TEXT,               -- [via 049]
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_employees_user_id   ON employees(user_id);
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_status    ON employees(status);

-- ============================================================
-- DOMAIN 3: AGEN
-- ============================================================

CREATE TABLE IF NOT EXISTS agents (
  id                        UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                   UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  branch_id                 UUID    REFERENCES branches(id)  ON DELETE SET NULL,
  parent_agent_id           UUID    REFERENCES agents(id)   ON DELETE SET NULL,
  company_name              TEXT    NOT NULL,
  agent_code                TEXT    NOT NULL UNIQUE,
  contact_name              TEXT,
  phone                     TEXT,
  email                     TEXT,
  address                   TEXT,
  commission_rate           NUMERIC(5,2) DEFAULT 0,
  is_active                 BOOLEAN DEFAULT TRUE,
  slug                      TEXT    UNIQUE,
  featured_package_ids      JSONB   DEFAULT '[]',
  website_bio               TEXT,
  level                     INTEGER DEFAULT 1,
  -- [via 062] status & verifikasi
  status                    TEXT    NOT NULL DEFAULT 'active'
                                    CHECK (status IN ('pending','active','suspended','inactive')),
  ktp_number                TEXT,                      -- [TAMBAH]
  ktp_url                   TEXT,                      -- [TAMBAH]
  npwp                      TEXT,                      -- [TAMBAH]
  bank_name                 TEXT,                      -- [TAMBAH]
  bank_account_number       TEXT,                      -- [TAMBAH]
  bank_account_name         TEXT,                      -- [TAMBAH]
  -- [via 23_agent_membership_tiers] tier & statistik
  membership_tier           TEXT    NOT NULL DEFAULT 'bronze'
                                    CHECK (membership_tier IN ('bronze','silver','gold','platinum')),
  membership_tier_updated_at TIMESTAMPTZ,
  total_confirmed_bookings  INTEGER NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agents_user_id        ON agents(user_id);
CREATE INDEX IF NOT EXISTS idx_agents_branch_id      ON agents(branch_id);
CREATE INDEX IF NOT EXISTS idx_agents_status         ON agents(status);
CREATE INDEX IF NOT EXISTS idx_agents_membership_tier ON agents(membership_tier);
CREATE INDEX IF NOT EXISTS idx_agents_slug           ON agents(slug);
```


---

### 24.4 — CREATE TABLE: Domain PAKET & KEBERANGKATAN

```sql
-- ============================================================
-- DOMAIN 4: AIRLINES, HOTELS, AIRPORTS (Lookup)
-- ============================================================

CREATE TABLE IF NOT EXISTS airlines (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT    NOT NULL,
  code       TEXT    UNIQUE,               -- IATA code e.g. GA, QR
  logo_url   TEXT,
  country    TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hotels (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT    NOT NULL,
  stars       INTEGER DEFAULT 3 CHECK (stars BETWEEN 1 AND 7),
  city        TEXT    NOT NULL,             -- 'Makkah' | 'Madinah' | 'Jeddah' | lainnya
  country     TEXT    NOT NULL DEFAULT 'Saudi Arabia',
  address     TEXT,
  phone       TEXT,
  email       TEXT,
  description TEXT,
  photo_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_hotels_city ON hotels(city);

-- airports (lookup bandara untuk FK departures)
-- Diperlukan oleh: DepartureForm, BookingDocumentActions, BulkSendTab
CREATE TABLE IF NOT EXISTS airports (          -- [TAMBAH — tabel lookup belum ada di schema]
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT    NOT NULL,
  code       TEXT    NOT NULL UNIQUE,          -- IATA: CGK, JED, MED
  city       TEXT    NOT NULL,
  country    TEXT    NOT NULL DEFAULT 'Indonesia',
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOMAIN 5: PAKET PERJALANAN
-- ============================================================

CREATE TABLE IF NOT EXISTS packages (
  id                   UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id            UUID    REFERENCES branches(id)  ON DELETE SET NULL,
  airline_id           UUID    REFERENCES airlines(id)  ON DELETE SET NULL,  -- [via 092]
  name                 TEXT    NOT NULL,
  type                 TEXT    NOT NULL DEFAULT 'umroh'
                               CHECK (type IN ('umroh','haji','haji_plus','wisata')),
  description          TEXT,
  highlights           TEXT,
  price                NUMERIC(15,2) NOT NULL DEFAULT 0,
  price_double         NUMERIC(15,2),
  price_triple         NUMERIC(15,2),
  price_quad           NUMERIC(15,2),
  child_price_percent  NUMERIC(5,2) DEFAULT 75,  -- [via 09_passenger_pricing]
  infant_price_percent NUMERIC(5,2) DEFAULT 50,  -- [via 09_passenger_pricing]
  duration_days        INTEGER DEFAULT 9,
  departure_city       TEXT,
  airline              TEXT,                       -- ⚠️ deprecated → pakai airline_id
  hotel_mecca          TEXT,                       -- ⚠️ deprecated → pakai departures.hotel_makkah_id
  hotel_medina         TEXT,                       -- ⚠️ deprecated
  includes             JSONB   DEFAULT '[]',
  excludes             JSONB   DEFAULT '[]',
  terms                TEXT,
  is_active            BOOLEAN DEFAULT TRUE,
  photo_url            TEXT,
  gallery_urls         JSONB   DEFAULT '[]',
  quota                INTEGER DEFAULT 45,
  fee_branch           NUMERIC(5,2) DEFAULT 0,
  cancellation_rule_id UUID    REFERENCES cancellation_rules(id) ON DELETE SET NULL,
  meta_title           TEXT,                       -- [via 13_seo_fields_packages]
  meta_description     TEXT,
  keywords             TEXT[],
  view_count           INTEGER NOT NULL DEFAULT 0, -- [via 36_package_view_count]
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_packages_branch_id  ON packages(branch_id);
CREATE INDEX IF NOT EXISTS idx_packages_type       ON packages(type);
CREATE INDEX IF NOT EXISTS idx_packages_is_active  ON packages(is_active);

-- ============================================================
-- DOMAIN 6: KEBERANGKATAN (departures) — FINAL SCHEMA
-- ============================================================
-- ⚠️  Banyak kolom di bawah ini perlu ditambahkan via migration baru
--     karena belum ada di DB saat ini

CREATE TABLE IF NOT EXISTS departures (
  id                      UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id              UUID    NOT NULL REFERENCES packages(id) ON DELETE CASCADE,
  -- Tanggal & Penerbangan
  departure_date          DATE    NOT NULL,
  return_date             DATE,
  departure_time          TIME,                    -- [TAMBAH]
  flight_number           TEXT,                    -- [TAMBAH]
  airline_id              UUID    REFERENCES airlines(id) ON DELETE SET NULL,  -- [via 092]
  departure_airport_id    UUID,   -- [TAMBAH] FK → airports(id)
  arrival_airport_id      UUID,   -- [TAMBAH] FK → airports(id)
  -- Hotel
  hotel_makkah_id         UUID,   -- [TAMBAH] FK → hotels(id)
  hotel_madinah_id        UUID,   -- [TAMBAH] FK → hotels(id)
  -- Kapasitas & Status
  quota                   INTEGER DEFAULT 45,
  available_seats         INTEGER DEFAULT 45,
  booked_count            INTEGER NOT NULL DEFAULT 0,  -- [via 041]
  status                  TEXT    NOT NULL DEFAULT 'open'
                                  CHECK (status IN ('open','closed','full','cancelled')),
  -- Harga per Kamar
  price_single            NUMERIC(15,2),               -- [via 041]
  price_double            NUMERIC(15,2),               -- [TAMBAH]
  price_triple            NUMERIC(15,2),               -- [TAMBAH]
  price_quad              NUMERIC(15,2),               -- [TAMBAH]
  -- Harga per Tipe Penumpang
  price_adult             NUMERIC(15,2),               -- [via 09_passenger_pricing]
  price_child             NUMERIC(15,2),               -- [via 09_passenger_pricing]
  price_infant            NUMERIC(15,2),               -- [via 09_passenger_pricing]
  child_price_percent     NUMERIC(5,2),                -- [via 09_passenger_pricing]
  infant_price_percent    NUMERIC(5,2),                -- [via 09_passenger_pricing]
  -- Per-room child/infant pricing [via 88_passenger_per_room_pricing]
  price_child_quad        BIGINT,
  price_infant_quad       BIGINT,
  -- Operasional & Keuangan
  currency                TEXT    DEFAULT 'IDR',       -- [TAMBAH]
  break_even_pax          INTEGER,                     -- [TAMBAH]
  operational_cost_per_pax NUMERIC(15,2),              -- [TAMBAH]
  payment_deadline        DATE,                        -- [TAMBAH]
  document_deadline       DATE,                        -- [via 22_doc_security_features]
  visa_deadline           DATE,                        -- [TAMBAH]
  -- SDM
  muthawif_id             UUID    REFERENCES muthawifs(id) ON DELETE SET NULL,  -- [via 081]
  team_leader_id          UUID    REFERENCES profiles(id) ON DELETE SET NULL,   -- [TAMBAH]
  tour_leader_user_id     UUID    REFERENCES auth.users(id) ON DELETE SET NULL, -- [via 061]
  -- SEO & Display
  month                   TEXT,                        -- [TAMBAH] 'YYYY-MM' untuk filter
  slug                    TEXT,                        -- [via 14_seo_fields_departures]
  meta_title              TEXT,                        -- [via 14_seo_fields_departures]
  meta_description        TEXT,                        -- [via 14_seo_fields_departures]
  notes                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_departures_package_id     ON departures(package_id);
CREATE INDEX IF NOT EXISTS idx_departures_departure_date ON departures(departure_date);
CREATE INDEX IF NOT EXISTS idx_departures_status         ON departures(status);
CREATE INDEX IF NOT EXISTS idx_departures_muthawif_id    ON departures(muthawif_id);
CREATE INDEX IF NOT EXISTS idx_departures_airline_id     ON departures(airline_id);
CREATE INDEX IF NOT EXISTS idx_departures_month          ON departures(month);

-- Departure ↔ Muthawif (many-to-many — 1 departure bisa punya beberapa muthawif)
CREATE TABLE IF NOT EXISTS departure_muthawifs (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  muthawif_id  UUID    NOT NULL REFERENCES muthawifs(id)  ON DELETE CASCADE,
  role         TEXT    DEFAULT 'muthawif',  -- 'muthawif' | 'tour_leader' | 'assistant'
  notes        TEXT,
  assigned_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (departure_id, muthawif_id)
);
```


---

### 24.5 — CREATE TABLE: Domain BOOKING & PEMBAYARAN

```sql
-- ============================================================
-- DOMAIN 7: PELANGGAN (customers)
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id                          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                     UUID    REFERENCES auth.users(id)   ON DELETE SET NULL,
  branch_id                   UUID    REFERENCES branches(id)     ON DELETE SET NULL,
  full_name                   TEXT    NOT NULL,
  nik                         TEXT,
  gender                      TEXT    CHECK (gender IN ('L','P')),
  phone                       TEXT,
  email                       TEXT,
  address                     TEXT,
  city                        TEXT,
  province                    TEXT,
  district                    TEXT,                -- [via 036]
  village                     TEXT,                -- [via 036]
  postal_code                 TEXT,
  birth_date                  DATE,
  birth_place                 TEXT,
  -- Paspor
  passport_number             TEXT,
  passport_expiry             DATE,
  passport_issued             TEXT,
  -- Data tambahan dokumen
  mother_name                 TEXT,                -- [TAMBAH]
  father_name                 TEXT,                -- [TAMBAH]
  marital_status              TEXT CHECK (marital_status IN -- [TAMBAH]
                                ('single','married','widowed','divorced')),
  blood_type                  TEXT CHECK (blood_type IN     -- [TAMBAH]
                                ('A','B','AB','O','A+','A-','B+','B-','AB+','AB-','O+','O-')),
  -- Mahram (ringkasan — detail di customer_mahrams)
  mahram_name                 TEXT,                -- [TAMBAH]
  mahram_relation             TEXT,                -- [TAMBAH]
  -- Darurat
  emergency_contact_name      TEXT,                -- [TAMBAH]
  emergency_contact_phone     TEXT,                -- [TAMBAH]
  emergency_contact_relation  TEXT,                -- [TAMBAH]
  -- Flags
  is_active                   BOOLEAN DEFAULT TRUE,
  is_tour_leader              BOOLEAN DEFAULT FALSE,  -- [TAMBAH]
  -- Fisik & Perlengkapan
  height_cm                   INTEGER,             -- [via 083]
  weight_kg                   NUMERIC(5,2),        -- [via 083]
  clothing_size               TEXT,                -- [via 083]
  -- Haji
  nomor_porsi_haji            TEXT,
  embarkasi_kode              TEXT,
  estimasi_keberangkatan_haji INTEGER,
  photo_url                   TEXT,
  created_at                  TIMESTAMPTZ DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_customers_user_id   ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch_id ON customers(branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_nik       ON customers(nik);
CREATE INDEX IF NOT EXISTS idx_customers_phone     ON customers(phone);

CREATE TABLE IF NOT EXISTS customer_mahrams (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id         UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  mahram_name         TEXT NOT NULL,
  mahram_relation     TEXT NOT NULL,
  mahram_customer_id  UUID REFERENCES customers(id) ON DELETE SET NULL,
  relation_category   TEXT DEFAULT 'lainnya',
  notes               TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOMAIN 8: BOOKING
-- ============================================================

CREATE TABLE IF NOT EXISTS bookings (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id      UUID    NOT NULL REFERENCES customers(id)  ON DELETE RESTRICT,
  departure_id     UUID    REFERENCES departures(id)          ON DELETE SET NULL,
  agent_id         UUID    REFERENCES agents(id)              ON DELETE SET NULL,
  branch_id        UUID    REFERENCES branches(id)            ON DELETE SET NULL,  -- [TAMBAH]
  sales_id         UUID    REFERENCES profiles(id)            ON DELETE SET NULL,  -- [TAMBAH]
  booking_code     TEXT    NOT NULL UNIQUE,
  -- Status
  status           TEXT    NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','confirmed','cancelled','completed')),
  -- Harga & Pembayaran
  total_price      NUMERIC(15,2) NOT NULL DEFAULT 0,
  base_price       NUMERIC(15,2) DEFAULT 0,         -- [TAMBAH] harga dasar sebelum diskon
  addons_price     NUMERIC(15,2) DEFAULT 0,         -- [TAMBAH] tambahan layanan
  discount_amount  NUMERIC(15,2) DEFAULT 0,         -- [TAMBAH]
  paid_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  remaining_amount NUMERIC(15,2) GENERATED ALWAYS AS (total_price - paid_amount) STORED,
  payment_status   TEXT    NOT NULL DEFAULT 'unpaid'
                           CHECK (payment_status IN ('unpaid','partial','paid')),
  payment_deadline DATE,                            -- [TAMBAH]
  currency         TEXT    DEFAULT 'IDR',           -- [TAMBAH]
  -- Kamar & Penumpang
  room_type        TEXT    DEFAULT 'quad'
                           CHECK (room_type IN ('double','triple','quad')),
  room_number      TEXT,
  adult_count      INTEGER DEFAULT 1,               -- [TAMBAH]
  child_count      INTEGER DEFAULT 0,               -- [TAMBAH]
  infant_count     INTEGER DEFAULT 0,               -- [TAMBAH]
  total_pax        INTEGER GENERATED ALWAYS AS      -- [TAMBAH computed]
                           (COALESCE(adult_count,1) + COALESCE(child_count,0) + COALESCE(infant_count,0)) STORED,
  -- Lainnya
  notes            TEXT,
  referral_source  TEXT    DEFAULT 'direct'
                           CHECK (referral_source IN
                             ('direct','agent_website','branch_website','referral',
                              'whatsapp','instagram','facebook','other')),
  bagasi_kg_allowed INTEGER DEFAULT 23,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bookings_customer_id    ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_departure_id   ON bookings(departure_id);
CREATE INDEX IF NOT EXISTS idx_bookings_agent_id       ON bookings(agent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_branch_id      ON bookings(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status         ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_code   ON bookings(booking_code);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_deadline ON bookings(payment_deadline);

CREATE TABLE IF NOT EXISTS booking_passengers (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id        UUID    NOT NULL REFERENCES bookings(id)  ON DELETE CASCADE,
  customer_id       UUID    NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  is_main_passenger BOOLEAN DEFAULT FALSE,
  passenger_type    TEXT    DEFAULT 'dewasa'
                            CHECK (passenger_type IN ('dewasa','lansia','anak','mahram')),
  -- ⚠️ BUG-14: kode kirim 'adult'/'child'/'infant' — perlu normalisasi ke Bahasa
  nationality       TEXT,                           -- [TAMBAH]
  seat_number       TEXT,                           -- [TAMBAH] untuk boarding pass
  room_preference   TEXT,
  room_number       TEXT,
  room_number_makkah TEXT,                          -- [via 05]
  room_group_id     UUID,
  family_group_id   UUID,
  checkin_status    TEXT    DEFAULT 'not_checked',
  checkin_time      TIMESTAMPTZ,
  checkin_notes     TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bp_booking_id   ON booking_passengers(booking_id);
CREATE INDEX IF NOT EXISTS idx_bp_customer_id  ON booking_passengers(customer_id);
CREATE INDEX IF NOT EXISTS idx_bp_room_number  ON booking_passengers(room_number);

-- ============================================================
-- DOMAIN 9: PEMBAYARAN
-- ============================================================

CREATE TABLE IF NOT EXISTS payments (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id       UUID    NOT NULL REFERENCES bookings(id) ON DELETE RESTRICT,
  payment_code     TEXT    NOT NULL UNIQUE,
  amount           NUMERIC(15,2) NOT NULL DEFAULT 0,
  status           TEXT    NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','verified','rejected','cancelled')),
  payment_method   TEXT,
  payment_type     TEXT,   -- 'dp' | 'installment' | 'full' | 'refund'
  payment_date     DATE,
  bank_name        TEXT,
  account_name     TEXT,
  account_number   TEXT,
  proof_url        TEXT,
  proof_filename   TEXT,   -- [via 21_payment_architecture]
  notes            TEXT,
  rejection_notes  TEXT,   -- [via 21_payment_architecture]
  gateway_name     TEXT,   -- [via 21_payment_architecture]
  transaction_id   TEXT,
  verified_at      TIMESTAMPTZ,
  verified_by      UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  account_code     TEXT    REFERENCES coa_categories(code) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payments_booking_id ON payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status     ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

CREATE TABLE IF NOT EXISTS virtual_accounts (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id      UUID    REFERENCES bookings(id) ON DELETE SET NULL,
  va_number       TEXT    NOT NULL UNIQUE,
  bank_code       TEXT    NOT NULL,
  amount          NUMERIC(15,2) NOT NULL DEFAULT 0,
  status          TEXT    DEFAULT 'pending',
  expires_at      TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_page_tokens (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID    NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  token      TEXT    NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```


---

### 24.6 — CREATE TABLE: Domain KEUANGAN & AKUNTANSI

```sql
-- ============================================================
-- DOMAIN 10: KEUANGAN
-- ============================================================

CREATE TABLE IF NOT EXISTS coa_categories (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT    NOT NULL UNIQUE,
  name        TEXT    NOT NULL,
  parent_code TEXT    REFERENCES coa_categories(code) ON DELETE SET NULL,
  category_key TEXT,  -- 'revenue','expense','asset','liability','equity'
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order  INT     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_coa_categories_code       ON coa_categories(code);
CREATE INDEX IF NOT EXISTS idx_coa_categories_parent     ON coa_categories(parent_code);
CREATE INDEX IF NOT EXISTS idx_coa_categories_key        ON coa_categories(category_key);

-- Rencana HPP per keberangkatan
CREATE TABLE IF NOT EXISTS departure_cost_items (
  id              UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  category        TEXT    NOT NULL DEFAULT 'other',
  sub_category    TEXT,
  location        TEXT,
  hotel_id        UUID    REFERENCES hotels(id) ON DELETE SET NULL,
  nights          INTEGER,
  room_type       TEXT,
  check_in_date   DATE,
  check_out_date  DATE,
  airline_id      UUID    REFERENCES airlines(id) ON DELETE SET NULL,
  flight_route    TEXT,
  flight_class    TEXT,
  description     TEXT    NOT NULL DEFAULT '',
  unit            TEXT    NOT NULL DEFAULT 'per_pax',
  quantity        NUMERIC NOT NULL DEFAULT 1,
  unit_cost       NUMERIC NOT NULL DEFAULT 0,
  currency        TEXT    NOT NULL DEFAULT 'IDR',
  exchange_rate   NUMERIC NOT NULL DEFAULT 1,
  total_cost_idr  NUMERIC GENERATED ALWAYS AS (quantity * unit_cost * exchange_rate) STORED,
  account_code    TEXT    REFERENCES coa_categories(code) ON DELETE SET NULL,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  notes           TEXT,
  reference_id    UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dci_departure_id ON departure_cost_items(departure_id);
CREATE INDEX IF NOT EXISTS idx_dci_category     ON departure_cost_items(category);

-- Realisasi biaya per keberangkatan
CREATE TABLE IF NOT EXISTS departure_expenses (
  id              UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id      UUID    REFERENCES bookings(id) ON DELETE SET NULL,
  expense_date    DATE    NOT NULL DEFAULT CURRENT_DATE,
  category        TEXT    NOT NULL DEFAULT 'other',
  location        TEXT,
  description     TEXT    NOT NULL DEFAULT '',
  amount          NUMERIC NOT NULL DEFAULT 0,
  currency        TEXT    NOT NULL DEFAULT 'IDR',
  exchange_rate   NUMERIC NOT NULL DEFAULT 1,
  amount_idr      NUMERIC GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  payment_method  TEXT    DEFAULT 'transfer',
  receipt_url     TEXT,
  approval_status TEXT    DEFAULT 'pending_approval',  -- [via 085]
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_de_departure_id ON departure_expenses(departure_id);

-- Pendapatan lain-lain per keberangkatan
CREATE TABLE IF NOT EXISTS departure_other_revenues (
  id              UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id    UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  booking_id      UUID    REFERENCES bookings(id) ON DELETE SET NULL,
  revenue_date    DATE    NOT NULL DEFAULT CURRENT_DATE,
  category        TEXT    NOT NULL DEFAULT 'other',
  location        TEXT,
  description     TEXT    NOT NULL DEFAULT '',
  amount          NUMERIC NOT NULL DEFAULT 0,
  currency        TEXT    NOT NULL DEFAULT 'IDR',
  exchange_rate   NUMERIC NOT NULL DEFAULT 1,
  amount_idr      NUMERIC GENERATED ALWAYS AS (amount * exchange_rate) STORED,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ringkasan keuangan per keberangkatan (materialized summary)
CREATE TABLE IF NOT EXISTS departure_financial_summary (
  departure_id          UUID    NOT NULL PRIMARY KEY REFERENCES departures(id) ON DELETE CASCADE,
  quota                 INTEGER NOT NULL DEFAULT 0,
  pax_confirmed         INTEGER NOT NULL DEFAULT 0,
  pax_cancelled         INTEGER NOT NULL DEFAULT 0,
  revenue_gross         NUMERIC NOT NULL DEFAULT 0,
  revenue_paid          NUMERIC NOT NULL DEFAULT 0,
  revenue_outstanding   NUMERIC NOT NULL DEFAULT 0,
  revenue_refunded      NUMERIC NOT NULL DEFAULT 0,
  hpp_total             NUMERIC NOT NULL DEFAULT 0,
  expense_total         NUMERIC NOT NULL DEFAULT 0,
  other_revenue_total   NUMERIC NOT NULL DEFAULT 0,
  gross_profit          NUMERIC GENERATED ALWAYS AS (revenue_gross - hpp_total) STORED,
  net_profit            NUMERIC GENERATED ALWAYS AS
                          (revenue_gross + other_revenue_total - hpp_total - expense_total) STORED,
  gross_margin_pct      NUMERIC GENERATED ALWAYS AS (
                          CASE WHEN revenue_gross > 0
                            THEN ROUND(((revenue_gross-hpp_total)/revenue_gross)*100,2)
                            ELSE 0 END) STORED,
  hpp_planned           NUMERIC NOT NULL DEFAULT 0,   -- [via 084]
  hpp_realized          NUMERIC NOT NULL DEFAULT 0,   -- [via 084]
  net_margin_pct        NUMERIC,                       -- [via 084]
  hpp_variance          NUMERIC,                       -- [via 084]
  last_calculated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jurnal entri akuntansi
CREATE TABLE IF NOT EXISTS journal_entries (
  id              UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_number    TEXT    NOT NULL UNIQUE,
  entry_date      DATE    NOT NULL DEFAULT CURRENT_DATE,
  description     TEXT    NOT NULL DEFAULT '',
  ref_type        TEXT,    -- 'booking'|'payment'|'vendor_cost'|'cash'|'manual'
  ref_id          UUID,
  ref_code        TEXT,
  status          TEXT    NOT NULL DEFAULT 'posted'
                          CHECK (status IN ('draft','posted','voided')),
  total_debit     NUMERIC(18,2) NOT NULL DEFAULT 0,
  total_credit    NUMERIC(18,2) NOT NULL DEFAULT 0,
  branch_id       UUID    REFERENCES branches(id) ON DELETE SET NULL,
  created_by      UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by_name TEXT,
  voided_at       TIMESTAMPTZ,
  voided_reason   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_je_entry_date  ON journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_je_ref_type    ON journal_entries(ref_type);
CREATE INDEX IF NOT EXISTS idx_je_branch_id   ON journal_entries(branch_id);

CREATE TABLE IF NOT EXISTS journal_entry_lines (
  id           UUID    NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entry_id     UUID    NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  line_number  INTEGER NOT NULL DEFAULT 1,
  account_code TEXT    NOT NULL REFERENCES coa_categories(code),
  account_name TEXT,
  description  TEXT,
  debit        NUMERIC(18,2) NOT NULL DEFAULT 0,
  credit       NUMERIC(18,2) NOT NULL DEFAULT 0,
  ref_id       UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_jel_entry_id    ON journal_entry_lines(entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account_code ON journal_entry_lines(account_code);

-- Rekening bank perusahaan
CREATE TABLE IF NOT EXISTS bank_accounts (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name      TEXT    NOT NULL,
  account_number TEXT    NOT NULL,
  account_name   TEXT    NOT NULL,
  branch         TEXT,
  branch_name    TEXT,
  is_primary     BOOLEAN DEFAULT FALSE,
  is_active      BOOLEAN DEFAULT TRUE,
  opening_balance NUMERIC(15,2) DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Rekonsiliasi bank
CREATE TABLE IF NOT EXISTS bank_reconciliations (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id     UUID    REFERENCES bank_accounts(id) ON DELETE SET NULL,
  account_name   TEXT,
  period_date    DATE    NOT NULL,
  bank_balance   NUMERIC(15,2) NOT NULL DEFAULT 0,
  book_balance   NUMERIC(15,2) NOT NULL DEFAULT 0,
  difference     NUMERIC(15,2) GENERATED ALWAYS AS (bank_balance - book_balance) STORED,
  status         TEXT    DEFAULT 'draft'
                         CHECK (status IN ('draft','reconciled','discrepancy')),
  notes          TEXT,
  reconciled_by  UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  reconciled_at  TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Anggaran keuangan
CREATE TABLE IF NOT EXISTS finance_budgets (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  period_year    INTEGER NOT NULL,
  period_month   INTEGER NOT NULL,
  account_code   TEXT    REFERENCES coa_categories(code),
  budget_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  actual_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  branch_id      UUID    REFERENCES branches(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (period_year, period_month, account_code, branch_id)
);

-- Kas & Transaksi (PERLU DIBUAT — saat ini phantom di kode)
CREATE TABLE IF NOT EXISTS cash_transactions (   -- [TAMBAH — phantom saat ini]
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id      UUID    REFERENCES branches(id) ON DELETE SET NULL,
  transaction_date DATE  NOT NULL DEFAULT CURRENT_DATE,
  type           TEXT    NOT NULL CHECK (type IN ('income','expense','transfer')),
  category       TEXT    NOT NULL,   -- 'salary','operational','booking_payment','other'
  description    TEXT    NOT NULL,
  amount         NUMERIC(15,2) NOT NULL DEFAULT 0,
  reference_id   UUID,               -- booking_id, payment_id, dll
  account_code   TEXT    REFERENCES coa_categories(code) ON DELETE SET NULL,
  payment_method TEXT    DEFAULT 'cash',
  receipt_url    TEXT,
  recorded_by    UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ct_branch_id         ON cash_transactions(branch_id);
CREATE INDEX IF NOT EXISTS idx_ct_transaction_date  ON cash_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_ct_type              ON cash_transactions(type);
CREATE INDEX IF NOT EXISTS idx_ct_reference_id      ON cash_transactions(reference_id);

-- Ringkasan keuangan per periode
CREATE TABLE IF NOT EXISTS departure_budgets (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  category       TEXT    NOT NULL CHECK (category IN ('manasik','perlengkapan','lainnya')),
  description    TEXT,
  budgeted_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  pax_count      INTEGER,
  per_pax_amount NUMERIC(15,2),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```


---

### 24.7 — CREATE TABLE: Domain SDM & HR

```sql
-- ============================================================
-- DOMAIN 11: SDM (Sumber Daya Manusia)
-- ============================================================

CREATE TABLE IF NOT EXISTS payroll_records (
  id                  UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id         UUID    NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  period_year         INTEGER NOT NULL,
  period_month        INTEGER NOT NULL,
  basic_salary        NUMERIC(15,2) NOT NULL DEFAULT 0,
  allowances          NUMERIC(15,2) NOT NULL DEFAULT 0,
  overtime_pay        NUMERIC(15,2) NOT NULL DEFAULT 0,
  bonus               NUMERIC(15,2) NOT NULL DEFAULT 0,
  deductions          NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_kes            NUMERIC(15,2) NOT NULL DEFAULT 0,
  bpjs_tk             NUMERIC(15,2) NOT NULL DEFAULT 0,
  pph21_amount        NUMERIC(15,2) NOT NULL DEFAULT 0,   -- [via INT-09]
  gross_salary        NUMERIC(15,2) GENERATED ALWAYS AS
                        (basic_salary + allowances + overtime_pay + bonus) STORED,
  net_salary          NUMERIC(15,2) GENERATED ALWAYS AS
                        (basic_salary + allowances + overtime_pay + bonus - deductions - bpjs_kes - bpjs_tk - pph21_amount) STORED,
  status              TEXT    NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','finalized','paid')),
  payment_date        DATE,
  transfer_proof_url  TEXT,
  notes               TEXT,
  created_by          UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, period_year, period_month)
);
CREATE INDEX IF NOT EXISTS idx_pr_employee_id ON payroll_records(employee_id);
CREATE INDEX IF NOT EXISTS idx_pr_period      ON payroll_records(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_pr_status      ON payroll_records(status);

CREATE TABLE IF NOT EXISTS payroll_components (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name          TEXT    NOT NULL,
  code          TEXT    NOT NULL UNIQUE,
  type          TEXT    NOT NULL CHECK (type IN ('allowance','deduction')),
  calc_type     TEXT    CHECK (calc_type IN ('fixed','percentage','formula')),
  default_amount NUMERIC(15,2) DEFAULT 0,
  formula       TEXT,
  is_active     BOOLEAN DEFAULT TRUE,
  is_taxable    BOOLEAN DEFAULT FALSE,
  description   TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_payroll_components (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id  UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  component_id UUID    NOT NULL REFERENCES payroll_components(id) ON DELETE CASCADE,
  period       TEXT,   -- 'YYYY-MM' atau NULL untuk permanen
  amount       NUMERIC(15,2) NOT NULL DEFAULT 0,
  note         TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_slips (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID    NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  period_year     INTEGER NOT NULL,
  period_month    INTEGER NOT NULL,
  basic_salary    NUMERIC(15,2) DEFAULT 0,
  allowances      JSONB   DEFAULT '[]',
  deductions      JSONB   DEFAULT '[]',
  gross_salary    NUMERIC(15,2) DEFAULT 0,
  net_salary      NUMERIC(15,2) DEFAULT 0,
  pdf_url         TEXT,
  status          TEXT    DEFAULT 'draft'
                          CHECK (status IN ('draft','sent','confirmed')),
  sent_at         TIMESTAMPTZ,
  confirmed_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_requests (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  leave_type      TEXT    NOT NULL CHECK (leave_type IN
                            ('annual','sick','emergency','maternity','paternity','unpaid','other')),
  start_date      DATE    NOT NULL,
  end_date        DATE    NOT NULL,
  total_days      INTEGER NOT NULL,
  reason          TEXT,
  attachment_url  TEXT,
  status          TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','approved','rejected','cancelled')),
  approved_by     UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at     TIMESTAMPTZ,
  rejection_notes TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_quotas (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id   UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  year          INTEGER NOT NULL,
  annual_quota  INTEGER NOT NULL DEFAULT 12,
  carry_over    INTEGER NOT NULL DEFAULT 0,
  annual_used   INTEGER NOT NULL DEFAULT 0,
  sick_used     INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (employee_id, year)
);

CREATE TABLE IF NOT EXISTS disciplinary_records (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type            TEXT    NOT NULL,   -- 'sp1','sp2','sp3','warning','termination'
  violation_date  DATE    NOT NULL,
  description     TEXT    NOT NULL,
  action_taken    TEXT,
  witnesses       TEXT[],
  attachments     JSONB   DEFAULT '[]',
  issued_by       UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS disciplinary_letters (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  letter_type     TEXT    NOT NULL CHECK (letter_type IN ('sp1','sp2','sp3','warning','termination')),
  letter_number   TEXT    NOT NULL UNIQUE,
  issued_date     DATE    NOT NULL,
  violation       TEXT    NOT NULL,
  description     TEXT,
  action_taken    TEXT,
  signed_by       UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  pdf_url         TEXT,
  status          TEXT    DEFAULT 'draft' CHECK (status IN ('draft','signed','acknowledged')),
  acknowledged_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS career_history (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id      UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_date   DATE    NOT NULL,
  change_type      TEXT    NOT NULL,
  old_position     TEXT,
  new_position     TEXT,
  old_department   TEXT,
  new_department   TEXT,
  old_salary       NUMERIC(15,2),
  new_salary       NUMERIC(15,2),
  old_branch_id    UUID    REFERENCES branches(id) ON DELETE SET NULL,
  new_branch_id    UUID    REFERENCES branches(id) ON DELETE SET NULL,
  reason           TEXT,
  approved_by      UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_reviews (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id     UUID    REFERENCES employees(id) ON DELETE SET NULL,
  review_period   TEXT    NOT NULL,   -- 'YYYY-Q1' | 'YYYY-H1' | 'YYYY'
  review_type     TEXT    DEFAULT 'quarterly',
  quality         NUMERIC(3,1),
  productivity    NUMERIC(3,1),
  initiative      NUMERIC(3,1),
  teamwork        NUMERIC(3,1),
  attendance_score NUMERIC(3,1),
  overall_score   NUMERIC(3,1),
  strengths       TEXT,
  improvements    TEXT,
  goals           TEXT,
  status          TEXT    DEFAULT 'draft',
  finalized_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_contracts (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id     UUID    NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  contract_type   TEXT    NOT NULL CHECK (contract_type IN ('pkwt','pkwtt','freelance','intern')),
  start_date      DATE    NOT NULL,
  end_date        DATE,
  probation_end   DATE,
  salary          NUMERIC(15,2),
  file_url        TEXT,
  status          TEXT    DEFAULT 'active' CHECK (status IN ('draft','active','expired','terminated')),
  notes           TEXT,
  signed_at       DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Absensi jamaah (manasik) — [via 01_schema.sql line 6381]
-- ⚠️ PENTING: kode memakai nama 'attendance_records' — harus rename atau buat view
CREATE TABLE IF NOT EXISTS attendance (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID    REFERENCES departures(id)  ON DELETE SET NULL,
  customer_id  UUID    REFERENCES customers(id)   ON DELETE CASCADE,
  session_type TEXT    NOT NULL DEFAULT 'lainnya',
  session_label TEXT,
  status       TEXT    NOT NULL DEFAULT 'hadir'
                       CHECK (status IN ('hadir','absen','terlambat','izin')),
  notes        TEXT,
  recorded_by  UUID    REFERENCES profiles(id)    ON DELETE SET NULL,
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Alias view agar kode tidak rusak:
-- CREATE VIEW attendance_records AS SELECT * FROM attendance;

CREATE TABLE IF NOT EXISTS job_postings (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id    UUID    REFERENCES branches(id) ON DELETE SET NULL,
  title        TEXT    NOT NULL,
  department   TEXT,
  description  TEXT,
  requirements TEXT,
  status       TEXT    DEFAULT 'open' CHECK (status IN ('open','closed','draft')),
  deadline     DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_applicants (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  job_posting_id  UUID    REFERENCES job_postings(id) ON DELETE SET NULL,
  full_name       TEXT    NOT NULL,
  email           TEXT,
  phone           TEXT,
  cover_letter    TEXT,
  resume_url      TEXT,
  status          TEXT    DEFAULT 'new',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```


---

### 24.8 — CREATE TABLE: Domain PERLENGKAPAN & OPERASIONAL

```sql
-- ============================================================
-- DOMAIN 12: PERLENGKAPAN (Equipment)
-- ============================================================

CREATE TABLE IF NOT EXISTS equipment_items (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT    NOT NULL,
  category            TEXT    NOT NULL DEFAULT 'umum',
  description         TEXT,
  photo_url           TEXT,
  stock_quantity      INTEGER DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  gender_target       TEXT    NOT NULL DEFAULT 'all'
                              CHECK (gender_target IN ('all','male','female')),
  has_variants        BOOLEAN NOT NULL DEFAULT FALSE,
  has_sizes           BOOLEAN NOT NULL DEFAULT FALSE,
  available_sizes     TEXT[]  DEFAULT '{}',
  pic                 TEXT,
  pic_type            TEXT,
  qr_code             TEXT,
  unit_cost           INTEGER NOT NULL DEFAULT 0,  -- [via 35_equipment_unit_cost]
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ei_category ON equipment_items(category);

CREATE TABLE IF NOT EXISTS equipment_variants (
  id                  UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id        UUID    NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  size                TEXT,
  color               TEXT,
  sku                 TEXT,
  stock_good          INTEGER NOT NULL DEFAULT 0,
  stock_damaged       INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 2,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ev_equipment_id ON equipment_variants(equipment_id);

CREATE TABLE IF NOT EXISTS equipment_stock_history (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_item_id UUID    NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  change_type       TEXT    NOT NULL,  -- 'in','out','adjustment','damage'
  quantity_change   INTEGER NOT NULL,
  previous_quantity INTEGER NOT NULL DEFAULT 0,
  new_quantity      INTEGER NOT NULL DEFAULT 0,
  reason            TEXT,
  reference_id      UUID,
  created_by        UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment_stock_opname (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_item_id UUID    NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  opname_date       DATE    NOT NULL DEFAULT CURRENT_DATE,
  system_count      INTEGER NOT NULL DEFAULT 0,
  physical_count    INTEGER NOT NULL DEFAULT 0,
  difference        INTEGER GENERATED ALWAYS AS (physical_count - system_count) STORED,
  condition_notes   TEXT,
  status            TEXT    DEFAULT 'pending',
  verified_by       UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment_distributions (
  id                    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id           UUID    NOT NULL REFERENCES customers(id)    ON DELETE CASCADE,
  departure_id          UUID    REFERENCES departures(id)            ON DELETE SET NULL,
  booking_id            UUID    REFERENCES bookings(id)              ON DELETE SET NULL,
  equipment_id          UUID    REFERENCES equipment_items(id)       ON DELETE RESTRICT,
  item_name             TEXT    NOT NULL,
  quantity              INTEGER NOT NULL DEFAULT 1,
  size                  TEXT,
  distributed_at        TIMESTAMPTZ DEFAULT NOW(),
  distributed_by        UUID    REFERENCES auth.users(id)            ON DELETE SET NULL,
  returned_at           TIMESTAMPTZ,
  confirmed_by_jamaah   BOOLEAN NOT NULL DEFAULT FALSE,
  notes                 TEXT
);
CREATE INDEX IF NOT EXISTS idx_eddist_departure_id ON equipment_distributions(departure_id);
CREATE INDEX IF NOT EXISTS idx_eddist_customer_id  ON equipment_distributions(customer_id);
CREATE INDEX IF NOT EXISTS idx_eddist_booking_id   ON equipment_distributions(booking_id);

CREATE TABLE IF NOT EXISTS package_type_equipment (
  id                UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  package_type_id   UUID    NOT NULL,
  equipment_item_id UUID    NOT NULL REFERENCES equipment_items(id) ON DELETE CASCADE,
  default_quantity  INTEGER NOT NULL DEFAULT 1,
  is_required       BOOLEAN NOT NULL DEFAULT TRUE,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOMAIN 13: KAMAR & ROOMING
-- ============================================================

CREATE TABLE IF NOT EXISTS room_assignments (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id   UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  room_number    TEXT    NOT NULL,
  room_type      TEXT    NOT NULL DEFAULT 'quad'
                         CHECK (room_type IN ('double','triple','quad')),
  floor          INTEGER,
  capacity       INTEGER DEFAULT 4,
  hotel_name     TEXT,
  hotel_location TEXT    DEFAULT 'mecca'
                         CHECK (hotel_location IN ('mecca','medina')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (departure_id, room_number, hotel_location)
);
CREATE INDEX IF NOT EXISTS idx_ra_departure_id ON room_assignments(departure_id);

CREATE TABLE IF NOT EXISTS room_occupants (
  id                 UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  room_assignment_id UUID    NOT NULL REFERENCES room_assignments(id) ON DELETE CASCADE,
  customer_id        UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  bed_number         INT,
  mahram_validated   BOOLEAN DEFAULT FALSE,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (room_assignment_id, customer_id)
);
CREATE INDEX IF NOT EXISTS idx_ro_room_id    ON room_occupants(room_assignment_id);
CREATE INDEX IF NOT EXISTS idx_ro_customer_id ON room_occupants(customer_id);

CREATE TABLE IF NOT EXISTS room_group_audit (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  room_group_id   UUID    NOT NULL,
  passenger_id    UUID    NOT NULL REFERENCES booking_passengers(id) ON DELETE CASCADE,
  action          TEXT    NOT NULL,
  old_room_type   TEXT,
  new_room_type   TEXT,
  old_room_number TEXT,
  new_room_number TEXT,
  changed_by      UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at      TIMESTAMPTZ DEFAULT NOW(),
  notes           TEXT
);

-- ============================================================
-- DOMAIN 14: TABUNGAN JAMAAH
-- ============================================================

CREATE TABLE IF NOT EXISTS savings_plans (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id    UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  name           TEXT    NOT NULL DEFAULT 'Tabungan Umroh',
  target_amount  NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  target_date    DATE,
  status         TEXT    NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','completed','cancelled')),
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sp_customer_id ON savings_plans(customer_id);

-- ⚠️ KRITIS: tabel ini disebut 'savings_payments' di kode — perlu CREATE VIEW atau rename kode
CREATE TABLE IF NOT EXISTS savings_deposits (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id      UUID    NOT NULL REFERENCES savings_plans(id) ON DELETE CASCADE,
  amount       NUMERIC(15,2) NOT NULL,
  deposit_date DATE    NOT NULL DEFAULT CURRENT_DATE,
  notes        TEXT,
  created_by   UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
-- Solusi fix kode: CREATE VIEW savings_payments AS SELECT * FROM savings_deposits;

CREATE INDEX IF NOT EXISTS idx_sd_plan_id ON savings_deposits(plan_id);

-- ============================================================
-- DOMAIN 15: HOTEL CONTRACTS & VOUCHERS
-- ============================================================

CREATE TABLE IF NOT EXISTS hotel_contracts (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  hotel_id         UUID    REFERENCES hotels(id)     ON DELETE RESTRICT,
  departure_id     UUID    REFERENCES departures(id) ON DELETE CASCADE,
  contract_number  TEXT,
  contract_date    DATE,
  room_type        TEXT    CHECK (room_type IN ('double','triple','quad')),
  room_count       INTEGER NOT NULL DEFAULT 0,
  price_per_room   NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency         TEXT    DEFAULT 'SAR',
  check_in_date    DATE,
  check_out_date   DATE,
  nights           INTEGER,
  total_amount     NUMERIC(15,2) GENERATED ALWAYS AS (room_count * price_per_room) STORED,
  status           TEXT    DEFAULT 'draft' CHECK (status IN ('draft','confirmed','paid','cancelled')),
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hotel_vouchers (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  contract_id     UUID    REFERENCES hotel_contracts(id) ON DELETE SET NULL,
  voucher_number  TEXT    NOT NULL,
  issued_date     DATE,
  valid_from      DATE,
  valid_until     DATE,
  room_type       TEXT,
  pax_count       INTEGER,
  amount          NUMERIC(15,2),
  status          TEXT    DEFAULT 'active',
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```


---

### 24.9 — CREATE TABLE: Domain PANDUAN TOUR & PORTAL JAMAAH

```sql
-- ============================================================
-- DOMAIN 16: PANDUAN TOUR (Guide System)
-- ============================================================

CREATE TABLE IF NOT EXISTS guide_channels (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL DEFAULT 'Seluruh Rombongan',
  channel_type TEXT    NOT NULL DEFAULT 'all'
                       CHECK (channel_type IN ('all','bus_1','bus_2','bus_3','custom')),
  created_by   UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guide_broadcasts (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id      UUID    NOT NULL REFERENCES guide_channels(id) ON DELETE CASCADE,
  departure_id    UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  sender_user_id  UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  sender_role     TEXT,
  message_type    TEXT    NOT NULL DEFAULT 'text'
                          CHECK (message_type IN ('text','image','audio','location','system')),
  content         TEXT    NOT NULL,
  media_url       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gb_channel_id  ON guide_broadcasts(channel_id);
CREATE INDEX IF NOT EXISTS idx_gb_departure_id ON guide_broadcasts(departure_id);

CREATE TABLE IF NOT EXISTS guide_broadcast_reads (
  broadcast_id UUID NOT NULL REFERENCES guide_broadcasts(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  read_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (broadcast_id, user_id)
);

CREATE TABLE IF NOT EXISTS guide_sessions (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  session_type TEXT    NOT NULL DEFAULT 'custom'
                       CHECK (session_type IN
                         ('bus_boarding','sholat','ziarah','makan','hotel_checkin','airport','briefing','custom')),
  title        TEXT    NOT NULL,
  location     TEXT,
  scheduled_at TIMESTAMPTZ,
  started_at   TIMESTAMPTZ,
  ended_at     TIMESTAMPTZ,
  qr_token     TEXT    UNIQUE,
  qr_expires_at TIMESTAMPTZ,
  created_by   UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  notes        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gs_departure_id ON guide_sessions(departure_id);

CREATE TABLE IF NOT EXISTS guide_session_attendance (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id  UUID    NOT NULL REFERENCES guide_sessions(id) ON DELETE CASCADE,
  customer_id UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  status      TEXT    DEFAULT 'hadir' CHECK (status IN ('hadir','absen','terlambat')),
  notes       TEXT,
  UNIQUE (session_id, customer_id)
);

CREATE TABLE IF NOT EXISTS guide_subgroups (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  color        TEXT,
  created_by   UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guide_subgroup_members (
  subgroup_id UUID NOT NULL REFERENCES guide_subgroups(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  added_at    TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (subgroup_id, customer_id)
);

CREATE TABLE IF NOT EXISTS guide_locations (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  user_id      UUID    REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT,
  label        TEXT,
  latitude     NUMERIC(10,7) NOT NULL,
  longitude    NUMERIC(10,7) NOT NULL,
  accuracy_m   NUMERIC(8,2),
  recorded_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gl_departure_id ON guide_locations(departure_id);

CREATE TABLE IF NOT EXISTS guide_audio_sessions (
  id                    UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id          UUID    NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  title                 TEXT    NOT NULL,
  session_type          TEXT    NOT NULL DEFAULT 'murottal'
                                CHECK (session_type IN ('murottal','tausyiah','briefing','custom')),
  status                TEXT    NOT NULL DEFAULT 'idle'
                                CHECK (status IN ('idle','live','ended')),
  current_speaker_user_id UUID  REFERENCES auth.users(id) ON DELETE SET NULL,
  started_at            TIMESTAMPTZ,
  ended_at              TIMESTAMPTZ,
  recording_url         TEXT,
  created_by            UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DOMAIN 17: PORTAL JAMAAH
-- ============================================================

CREATE TABLE IF NOT EXISTS jamaah_checklist (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id      UUID    NOT NULL REFERENCES customers(id)  ON DELETE CASCADE,
  departure_id     UUID    REFERENCES departures(id)          ON DELETE SET NULL,
  has_passport     BOOLEAN DEFAULT FALSE,
  has_visa         BOOLEAN DEFAULT FALSE,
  has_ktp          BOOLEAN DEFAULT FALSE,
  has_kk           BOOLEAN DEFAULT FALSE,
  has_photo        BOOLEAN DEFAULT FALSE,
  has_vaccine_cert BOOLEAN DEFAULT FALSE,
  has_meningitis   BOOLEAN DEFAULT FALSE,
  has_mahram_cert  BOOLEAN DEFAULT FALSE,
  has_marriage_cert BOOLEAN DEFAULT FALSE,
  has_birth_cert   BOOLEAN DEFAULT FALSE,
  has_paid_full    BOOLEAN DEFAULT FALSE,
  items_received   BOOLEAN DEFAULT FALSE,
  is_complete      BOOLEAN GENERATED ALWAYS AS (
                     has_passport AND has_visa AND has_ktp AND has_kk AND has_photo
                   ) STORED,
  notes            TEXT,
  updated_by       UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_jc_customer_id  ON jamaah_checklist(customer_id);
CREATE INDEX IF NOT EXISTS idx_jc_departure_id ON jamaah_checklist(departure_id);

CREATE TABLE IF NOT EXISTS jamaah_ibadah_targets (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT    NOT NULL,
  icon         TEXT,
  unit         TEXT    NOT NULL DEFAULT 'kali',
  daily_target INTEGER NOT NULL DEFAULT 1,
  category     TEXT,
  active       BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jamaah_ibadah_logs (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_id  UUID    NOT NULL REFERENCES jamaah_ibadah_targets(id) ON DELETE CASCADE,
  log_date   DATE    NOT NULL DEFAULT CURRENT_DATE,
  count      INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, target_id, log_date)
);

CREATE TABLE IF NOT EXISTS jamaah_jurnal (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date       DATE    NOT NULL DEFAULT CURRENT_DATE,
  title      TEXT,
  content    TEXT    NOT NULL,
  mood       TEXT,
  location   TEXT,
  tags       TEXT[],
  is_private BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jamaah_doa_sessions (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  dzikir_id   TEXT,
  dzikir_name TEXT    NOT NULL,
  dzikir_arab TEXT,
  dzikir_latin TEXT,
  icon        TEXT,
  target      INTEGER DEFAULT 33,
  current     INTEGER DEFAULT 0,
  completed   BOOLEAN GENERATED ALWAYS AS (current >= target) STORED,
  session_date DATE   DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jamaah_badges (
  id        UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id   UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_id  TEXT    NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, badge_id)
);

CREATE TABLE IF NOT EXISTS ibadah_progress (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID    NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ibadah_type TEXT    NOT NULL,
  ibadah_date DATE    NOT NULL DEFAULT CURRENT_DATE,
  count       INTEGER NOT NULL DEFAULT 1,
  target      INTEGER DEFAULT 1,
  notes       TEXT,
  completed   BOOLEAN GENERATED ALWAYS AS (count >= target) STORED,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, ibadah_type, ibadah_date)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint   TEXT    NOT NULL UNIQUE,
  p256dh     TEXT    NOT NULL,
  auth       TEXT    NOT NULL,
  customer_id UUID   REFERENCES customers(id)     ON DELETE CASCADE,
  user_id    UUID    REFERENCES auth.users(id)     ON DELETE CASCADE,
  role       TEXT,                                -- [via 072]
  branch_id  UUID    REFERENCES branches(id)      ON DELETE SET NULL,
  agent_id   UUID    REFERENCES agents(id)        ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ps_customer_id ON push_subscriptions(customer_id);
CREATE INDEX IF NOT EXISTS idx_ps_user_id     ON push_subscriptions(user_id);

CREATE TABLE IF NOT EXISTS push_outbox (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  user_ids    UUID[],
  customer_ids UUID[],
  title       TEXT    NOT NULL,
  body        TEXT    NOT NULL,
  type        TEXT    DEFAULT 'info',
  url         TEXT,
  status      TEXT    DEFAULT 'pending' CHECK (status IN ('pending','processing','done','failed')),
  sent_count  INTEGER DEFAULT 0,
  fail_count  INTEGER DEFAULT 0,
  scheduled_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- DOMAIN 18: NOTIFIKASI & PENGUMUMAN
-- ============================================================

CREATE TABLE IF NOT EXISTS notifications (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT    NOT NULL,
  message     TEXT    NOT NULL,
  type        TEXT    DEFAULT 'info'
                      CHECK (type IN ('info','warning','success','error')),
  target_role TEXT,
  branch_id   UUID    REFERENCES branches(id) ON DELETE SET NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  user_id     UUID    REFERENCES auth.users(id) ON DELETE CASCADE,
  link        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user_id   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_is_read   ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notif_branch_id ON notifications(branch_id);

CREATE TABLE IF NOT EXISTS announcements (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  title        TEXT    NOT NULL,
  content      TEXT    NOT NULL,
  type         TEXT    DEFAULT 'info',
  target_roles TEXT[],
  branch_id    UUID    REFERENCES branches(id) ON DELETE SET NULL,
  is_active    BOOLEAN DEFAULT TRUE,
  starts_at    TIMESTAMPTZ,
  ends_at      TIMESTAMPTZ,
  created_by   UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);
```


---

### 24.10 — CREATE TABLE: Domain WHATSAPP, CRM, DOKUMEN & STORE

```sql
-- ============================================================
-- DOMAIN 19: WHATSAPP
-- ============================================================

CREATE TABLE IF NOT EXISTS whatsapp_config (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id    UUID    REFERENCES branches(id) ON DELETE CASCADE,
  provider     TEXT    DEFAULT 'fonnte',
  token        TEXT,
  phone_number TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT    NOT NULL,
  code        TEXT    NOT NULL UNIQUE,
  body        TEXT    NOT NULL,
  variables   TEXT[],
  trigger     TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_template_broadcasts (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT    NOT NULL,
  template_name   TEXT    NOT NULL,
  template_lang   TEXT    DEFAULT 'id',
  variable_map    JSONB   DEFAULT '{}',
  status          TEXT    DEFAULT 'draft'
                          CHECK (status IN ('draft','sending','sent','failed','partial')),
  target_type     TEXT    DEFAULT 'all',
  target_filter   JSONB   DEFAULT '{}',
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count      INTEGER DEFAULT 0,
  failed_count    INTEGER DEFAULT 0,
  created_by      UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_template_broadcast_recipients (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  broadcast_id  UUID    NOT NULL REFERENCES wa_template_broadcasts(id) ON DELETE CASCADE,
  booking_id    UUID    REFERENCES bookings(id) ON DELETE SET NULL,
  phone         TEXT    NOT NULL,
  full_name     TEXT,
  resolved_vars JSONB   DEFAULT '{}',
  status        TEXT    DEFAULT 'pending',
  sent_at       TIMESTAMPTZ,
  error_msg     TEXT,
  wa_message_id TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wabr_broadcast_id ON wa_template_broadcast_recipients(broadcast_id);

CREATE TABLE IF NOT EXISTS wa_scheduled_broadcasts (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT    NOT NULL,
  message         TEXT    NOT NULL,
  template_id     UUID    REFERENCES whatsapp_templates(id) ON DELETE SET NULL,
  target_type     TEXT    DEFAULT 'all',
  target_tags     TEXT[],
  target_filter   JSONB   DEFAULT '{}',
  scheduled_at    TIMESTAMPTZ,
  status          TEXT    DEFAULT 'draft',
  sent_at         TIMESTAMPTZ,
  total_recipients INTEGER DEFAULT 0,
  sent_count      INTEGER DEFAULT 0,
  created_by      UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_chatbot_keywords (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword       TEXT    NOT NULL,
  match_type    TEXT    DEFAULT 'exact' CHECK (match_type IN ('exact','contains','starts_with')),
  reply_message TEXT    NOT NULL,
  is_active     BOOLEAN DEFAULT TRUE,
  priority      INTEGER DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wa_incoming_messages (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  from_phone  TEXT    NOT NULL,
  from_name   TEXT,
  message     TEXT,
  message_id  TEXT,
  provider    TEXT    DEFAULT 'fonnte',
  is_read     BOOLEAN DEFAULT FALSE,
  replied     BOOLEAN DEFAULT FALSE,
  reply_text  TEXT,
  replied_at  TIMESTAMPTZ,
  customer_id UUID    REFERENCES customers(id) ON DELETE SET NULL,
  metadata    JSONB   DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wim_from_phone ON wa_incoming_messages(from_phone);

CREATE TABLE IF NOT EXISTS wa_contacts (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  phone       TEXT    NOT NULL UNIQUE,
  name        TEXT,
  customer_id UUID    REFERENCES customers(id) ON DELETE SET NULL,
  tags        TEXT[],
  notes       TEXT,
  is_blocked  BOOLEAN DEFAULT FALSE,
  last_msg_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOMAIN 20: CRM & LEADS
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name             TEXT    NOT NULL,
  phone            TEXT    NOT NULL,
  email            TEXT,
  source           TEXT    DEFAULT 'direct'
                           CHECK (source IN
                             ('direct','whatsapp','instagram','facebook','referral','website','lainnya')),
  branch_id        UUID    REFERENCES branches(id) ON DELETE SET NULL,
  agent_id         UUID    REFERENCES agents(id)   ON DELETE SET NULL,
  status           TEXT    DEFAULT 'new'
                           CHECK (status IN ('new','contacted','qualified','converted','lost')),
  notes            TEXT,
  package_interest TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_leads_branch_id ON leads(branch_id);
CREATE INDEX IF NOT EXISTS idx_leads_status    ON leads(status);

CREATE TABLE IF NOT EXISTS agent_leads (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id   UUID    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  phone      TEXT    NOT NULL,
  stage      TEXT    DEFAULT 'new',
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS discount_requests (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id     UUID    REFERENCES bookings(id)   ON DELETE SET NULL,
  agent_id       UUID    REFERENCES agents(id)     ON DELETE SET NULL,
  branch_id      UUID    REFERENCES branches(id)   ON DELETE SET NULL,
  discount_amount NUMERIC(15,2),
  discount_pct   NUMERIC(5,2),
  reason         TEXT,
  status         TEXT    DEFAULT 'pending'
                         CHECK (status IN ('pending','approved','rejected')),
  approved_by    UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at    TIMESTAMPTZ,
  rejection_notes TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOMAIN 21: DOKUMEN
-- ============================================================

CREATE TABLE IF NOT EXISTS document_types (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT    NOT NULL,
  description TEXT,
  is_required BOOLEAN DEFAULT FALSE,
  category    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS generated_documents (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   UUID    REFERENCES customers(id)  ON DELETE SET NULL,
  departure_id  UUID    REFERENCES departures(id) ON DELETE SET NULL,
  booking_id    UUID    REFERENCES bookings(id)   ON DELETE SET NULL,
  document_type TEXT    NOT NULL,
  document_number TEXT  UNIQUE,
  file_url      TEXT,
  generated_by  UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  generated_at  TIMESTAMPTZ DEFAULT NOW(),
  expires_at    TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_gd_booking_id ON generated_documents(booking_id);

CREATE TABLE IF NOT EXISTS document_verify_tokens (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  token         TEXT    NOT NULL UNIQUE,
  doc_type      TEXT    NOT NULL,
  booking_id    UUID    REFERENCES bookings(id)   ON DELETE CASCADE,
  customer_id   UUID    REFERENCES customers(id)  ON DELETE CASCADE,
  customer_name TEXT,
  doc_number    TEXT,
  expires_at    TIMESTAMPTZ NOT NULL,
  used_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_audit_logs (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type    TEXT    NOT NULL,
  doc_type      TEXT    NOT NULL,
  booking_id    UUID    REFERENCES bookings(id)   ON DELETE SET NULL,
  customer_id   UUID    REFERENCES customers(id)  ON DELETE SET NULL,
  customer_name TEXT,
  generated_by  UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address    TEXT,
  user_agent    TEXT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dal_booking_id ON document_audit_logs(booking_id);

CREATE TABLE IF NOT EXISTS document_numbering (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  year       INTEGER NOT NULL,
  month      INTEGER NOT NULL,
  doc_type   TEXT    NOT NULL,
  branch_key TEXT    NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (year, month, doc_type, branch_key)
);

CREATE TABLE IF NOT EXISTS customer_signatures (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id     UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  signature_base64 TEXT   NOT NULL,
  signed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address      TEXT,
  user_agent      TEXT
);

-- Audit log dokumen (alias untuk kode yang pakai 'audit_logs')
-- ⚠️ KRITIS: kode memakai 'audit_logs' — tabel ini tidak ada, pakai document_audit_logs atau rbac_audit_trail
-- Solusi: CREATE VIEW audit_logs AS SELECT * FROM document_audit_logs;

-- ============================================================
-- DOMAIN 22: STORE (Toko Online)
-- ============================================================

CREATE TABLE IF NOT EXISTS store_categories (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT    NOT NULL,
  slug        TEXT    NOT NULL UNIQUE,
  description TEXT,
  image_url   TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_products (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id    UUID    REFERENCES store_categories(id) ON DELETE SET NULL,
  name           TEXT    NOT NULL,
  slug           TEXT    NOT NULL UNIQUE,
  description    TEXT,
  price          NUMERIC(15,2) NOT NULL DEFAULT 0,
  original_price NUMERIC(15,2),
  stock          INTEGER NOT NULL DEFAULT 0,
  unit           TEXT    DEFAULT 'pcs',
  weight_gram    INTEGER DEFAULT 0,
  images         JSONB   DEFAULT '[]',
  is_active      BOOLEAN DEFAULT TRUE,
  is_featured    BOOLEAN DEFAULT FALSE,
  tags           TEXT[],
  branch_id      UUID    REFERENCES branches(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sp_category_id ON store_products(category_id);
CREATE INDEX IF NOT EXISTS idx_sp_is_active   ON store_products(is_active);

CREATE TABLE IF NOT EXISTS store_orders (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number    TEXT    NOT NULL UNIQUE,
  customer_id     UUID    REFERENCES customers(id) ON DELETE SET NULL,
  user_id         UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  status          TEXT    NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled','refunded')),
  payment_status  TEXT    NOT NULL DEFAULT 'unpaid'
                          CHECK (payment_status IN ('unpaid','paid','refunded')),
  subtotal        NUMERIC(15,2) NOT NULL DEFAULT 0,
  shipping_cost   NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  shipping_name   TEXT,
  shipping_phone  TEXT,
  shipping_address TEXT,
  shipping_city   TEXT,
  shipping_province TEXT,
  shipping_postal TEXT,
  notes           TEXT,
  payment_proof_url TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_so_customer_id ON store_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_so_status      ON store_orders(status);

CREATE TABLE IF NOT EXISTS store_order_items (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id      UUID    NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  product_id    UUID    REFERENCES store_products(id) ON DELETE SET NULL,
  product_name  TEXT    NOT NULL,
  product_image TEXT,
  quantity      INTEGER NOT NULL DEFAULT 1,
  unit_price    NUMERIC(15,2) NOT NULL DEFAULT 0,
  subtotal      NUMERIC(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

CREATE TABLE IF NOT EXISTS store_shipments (
  id                UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id          UUID    NOT NULL REFERENCES store_orders(id) ON DELETE CASCADE,
  courier_name      TEXT,
  courier_service   TEXT,
  tracking_number   TEXT,
  shipped_at        TIMESTAMPTZ,
  estimated_arrival DATE,
  delivered_at      TIMESTAMPTZ,
  status            TEXT    DEFAULT 'pending',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);
```


---

### 24.11 — CREATE TABLE: Domain OPERASIONAL LAPANGAN

```sql
-- ============================================================
-- DOMAIN 23: VISA & SOS
-- ============================================================

CREATE TABLE IF NOT EXISTS visa_applications (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id      UUID    NOT NULL REFERENCES customers(id)  ON DELETE CASCADE,
  booking_id       UUID    REFERENCES bookings(id)            ON DELETE SET NULL,
  departure_id     UUID    REFERENCES departures(id)          ON DELETE SET NULL,
  visa_type        TEXT    DEFAULT 'umroh' CHECK (visa_type IN ('umroh','haji','ziarah')),
  status           TEXT    NOT NULL DEFAULT 'draft'
                           CHECK (status IN ('draft','submitted','processing','approved','rejected','expired')),
  application_date DATE    DEFAULT CURRENT_DATE,
  submitted_at     TIMESTAMPTZ,
  approved_at      TIMESTAMPTZ,
  expiry_date      DATE,
  visa_number      TEXT,
  notes            TEXT,
  rejection_reason TEXT,
  handled_by       UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_va_customer_id  ON visa_applications(customer_id);
CREATE INDEX IF NOT EXISTS idx_va_departure_id ON visa_applications(departure_id);
CREATE INDEX IF NOT EXISTS idx_va_status       ON visa_applications(status);

CREATE TABLE IF NOT EXISTS visa_status_logs (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID  NOT NULL REFERENCES visa_applications(id) ON DELETE CASCADE,
  old_status   TEXT,
  new_status   TEXT    NOT NULL,
  notes        TEXT,
  changed_by   UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sos_alerts (
  id                   UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id          UUID    NOT NULL REFERENCES customers(id)  ON DELETE CASCADE,
  departure_id         UUID    REFERENCES departures(id)          ON DELETE SET NULL,
  message              TEXT    NOT NULL,
  location             TEXT,
  latitude             NUMERIC(10,7),
  longitude            NUMERIC(10,7),
  status               TEXT    NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','responded','resolved','false_alarm')),
  assigned_muthawif_id UUID    REFERENCES muthawifs(id) ON DELETE SET NULL,
  responded_at         TIMESTAMPTZ,
  resolved_at          TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sos_departure_id ON sos_alerts(departure_id);
CREATE INDEX IF NOT EXISTS idx_sos_status       ON sos_alerts(status);

CREATE TABLE IF NOT EXISTS sos_escalation_log (
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  sos_alert_id   UUID    NOT NULL REFERENCES sos_alerts(id) ON DELETE CASCADE,
  escalated_to   TEXT    NOT NULL,
  escalated_by   UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  reason         TEXT,
  notified_at    TIMESTAMPTZ DEFAULT NOW(),
  resolved_at    TIMESTAMPTZ,
  notes          TEXT
);

-- ============================================================
-- DOMAIN 24: MARKETING & KAMPANYE
-- ============================================================

CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id    UUID    REFERENCES branches(id) ON DELETE SET NULL,
  name         TEXT    NOT NULL,
  description  TEXT,
  channel      TEXT,   -- 'instagram','facebook','google','wa','email','offline'
  status       TEXT    DEFAULT 'draft',
  budget       NUMERIC(15,2) DEFAULT 0,
  spent        NUMERIC(15,2) DEFAULT 0,
  start_date   DATE,
  end_date     DATE,
  target_reach INTEGER DEFAULT 0,
  actual_reach INTEGER DEFAULT 0,
  clicks       INTEGER DEFAULT 0,
  conversions  INTEGER DEFAULT 0,
  created_by   UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_metrics (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id  UUID    REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  branch_id    UUID    REFERENCES branches(id) ON DELETE SET NULL,
  metric_date  DATE    NOT NULL,
  impressions  INTEGER DEFAULT 0,
  clicks       INTEGER DEFAULT 0,
  conversions  INTEGER DEFAULT 0,
  revenue      NUMERIC(15,2) DEFAULT 0,
  cost         NUMERIC(15,2) DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DOMAIN 25: SETTING & KONFIGURASI
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT    PRIMARY KEY,
  value       TEXT    NOT NULL,
  description TEXT,
  is_public   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS website_settings (
  id               UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id        UUID    REFERENCES branches(id) ON DELETE CASCADE,
  slug             TEXT    UNIQUE,
  title            TEXT,
  tagline          TEXT,
  profile_photo_url TEXT,
  banner_url       TEXT,
  bio              TEXT,
  testimonials     JSONB   DEFAULT '[]',
  gallery_urls     JSONB   DEFAULT '[]',
  seo_title        TEXT,
  seo_description  TEXT,
  view_count       INTEGER DEFAULT 0,
  social_facebook  TEXT,
  social_instagram TEXT,
  social_youtube   TEXT,
  social_tiktok    TEXT,
  maps_embed_url   TEXT,
  chat_bubble_color TEXT   NOT NULL DEFAULT 'violet',
  layout_variant   JSONB   DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS banners (
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT    NOT NULL,
  subtitle    TEXT,
  image_url   TEXT,
  link_url    TEXT,
  link_text   TEXT,
  position    TEXT    DEFAULT 'home_hero',
  is_active   BOOLEAN DEFAULT TRUE,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  branch_id   UUID    REFERENCES branches(id) ON DELETE SET NULL,
  sort_order  INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
  id              UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  code            TEXT    NOT NULL UNIQUE,
  name            TEXT    NOT NULL,
  discount_type   TEXT    NOT NULL CHECK (discount_type IN ('percentage','fixed')),
  discount_value  NUMERIC(15,2) NOT NULL DEFAULT 0,
  min_purchase    NUMERIC(15,2) DEFAULT 0,
  max_discount    NUMERIC(15,2),
  quota           INTEGER DEFAULT 1,
  used_count      INTEGER DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  valid_from      DATE,
  valid_until     DATE,
  target_type     TEXT    DEFAULT 'all',
  created_by      UUID    REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Aturan Pembatalan
CREATE TABLE IF NOT EXISTS cancellation_rules (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  name       TEXT    NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  sections   JSONB   NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cancellation_rule_audit_logs (
  id           UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  action       TEXT    NOT NULL,
  actor_name   TEXT,
  actor_email  TEXT,
  rule_id      UUID    REFERENCES cancellation_rules(id) ON DELETE SET NULL,
  rule_name    TEXT,
  changes      JSONB   DEFAULT '{}',
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_gallery (
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  type          TEXT    NOT NULL DEFAULT 'image'
                        CHECK (type IN ('hotel','package','departure','general')),
  media_type    TEXT    DEFAULT 'image',
  title         TEXT,
  description   TEXT,
  media_url     TEXT    NOT NULL,
  thumbnail_url TEXT,
  hotel_id      UUID    REFERENCES hotels(id)    ON DELETE SET NULL,
  package_id    UUID    REFERENCES packages(id)  ON DELETE SET NULL,
  departure_id  UUID    REFERENCES departures(id) ON DELETE SET NULL,
  sort_order    INTEGER DEFAULT 0,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Agent wallet (diperlukan kode — tabel belum ada)
CREATE TABLE IF NOT EXISTS agent_wallets (           -- [TAMBAH — phantom saat ini]
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id    UUID    NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  balance     NUMERIC(15,2) NOT NULL DEFAULT 0,
  currency    TEXT    DEFAULT 'IDR',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (agent_id)
);

CREATE TABLE IF NOT EXISTS agent_wallet_transactions (  -- [TAMBAH — phantom saat ini]
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id     UUID    NOT NULL REFERENCES agent_wallets(id) ON DELETE CASCADE,
  type          TEXT    NOT NULL CHECK (type IN ('credit','debit')),
  amount        NUMERIC(15,2) NOT NULL DEFAULT 0,
  balance_after NUMERIC(15,2) NOT NULL DEFAULT 0,
  description   TEXT    NOT NULL,
  reference_id  UUID,
  reference_type TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_awt_wallet_id ON agent_wallet_transactions(wallet_id);

-- Loyalty Program (diperlukan kode — tabel belum ada)
CREATE TABLE IF NOT EXISTS loyalty_rewards (         -- [TAMBAH — phantom saat ini]
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  tier        TEXT    DEFAULT 'bronze',
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (customer_id)
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (    -- [TAMBAH — phantom saat ini]
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  type          TEXT    NOT NULL CHECK (type IN ('earn','redeem','expire','bonus')),
  points        INTEGER NOT NULL DEFAULT 0,
  balance_after INTEGER NOT NULL DEFAULT 0,
  description   TEXT    NOT NULL,
  reference_id  UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lt_customer_id ON loyalty_transactions(customer_id);

-- QR Jamaah (diperlukan kode)
CREATE TABLE IF NOT EXISTS jamaah_qr_codes (         -- [TAMBAH — phantom saat ini]
  id            UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id   UUID    NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  departure_id  UUID    REFERENCES departures(id) ON DELETE SET NULL,
  qr_token      TEXT    NOT NULL UNIQUE,
  qr_type       TEXT    DEFAULT 'identity',
  expires_at    TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Referral (diperlukan kode)
CREATE TABLE IF NOT EXISTS referral_codes (          -- [TAMBAH — phantom saat ini]
  id          UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  code        TEXT    NOT NULL UNIQUE,
  customer_id UUID    REFERENCES customers(id) ON DELETE CASCADE,
  agent_id    UUID    REFERENCES agents(id)   ON DELETE CASCADE,
  discount_type TEXT  DEFAULT 'percentage',
  discount_value NUMERIC(5,2) DEFAULT 0,
  usage_limit INTEGER DEFAULT 0,
  used_count  INTEGER DEFAULT 0,
  is_active   BOOLEAN DEFAULT TRUE,
  expires_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS referral_usages (         -- [TAMBAH — phantom saat ini]
  id             UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code_id UUID  NOT NULL REFERENCES referral_codes(id) ON DELETE CASCADE,
  booking_id     UUID    REFERENCES bookings(id) ON DELETE SET NULL,
  customer_id    UUID    REFERENCES customers(id) ON DELETE CASCADE,
  discount_given NUMERIC(15,2) DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```


---

### 24.12 — TABEL DEPRECATED ⚠️

> Tabel-tabel berikut kemungkinan besar tidak aktif dipakai atau sudah digantikan oleh tabel/mekanisme lain.
> **Jangan di-DROP** sampai ada konfirmasi eksplisit. Tandai dengan komentar di schema.

| Tabel | Alasan Deprecated | Pengganti |
|---|---|---|
| `packages.airline` (kolom) | Teks bebas, digantikan `airline_id` FK | `airlines` + `packages.airline_id` |
| `packages.hotel_mecca` (kolom) | Teks bebas, digantikan FK per departure | `hotels` + `departures.hotel_makkah_id` |
| `packages.hotel_medina` (kolom) | ditto | `hotels` + `departures.hotel_madinah_id` |
| `manasik_attendance` | Hanya 6 kolom, duplikat dengan `attendance` | Pakai `attendance` (10 kolom, lebih lengkap) |
| `dashboard_access_config` | Digantikan oleh `permissions_list` + `role_permissions` | `role_permissions` |
| `dashboard_access_audit_log` | Duplikat, ada 2 kali di 01_schema.sql (line 2324 & 4170) | `rbac_audit_trail` |
| `financial_summary` | Digantikan `departure_financial_summary` (lebih lengkap) | `departure_financial_summary` |
| `transactions` (di 4296) | Schema lama, kini ada `journal_entries` + `journal_entry_lines` | `journal_entries` |
| `expenses` (di 4348) | Schema lama, kini ada `departure_expenses` | `departure_expenses` |
| `equipment` (di 4522) | Lama, digantikan `equipment_items` + `equipment_variants` | `equipment_items` |
| `booking_seat_locks` | Seat locking tidak dipakai di wizard | — |
| `booking_installment_schedules` | Cicilan tidak ada UI | — |
| `scheduled_reports` | Laporan terjadwal tidak ada UI aktif | — |
| `invoice_templates` | Template invoice tidak dipakai (PDF di-generate langsung jsPDF) | — |
| `trip_timeline_items` | Duplikat dengan `trip_timeline_entries` | `trip_timeline_entries` |
| `job_applications` | Digantikan `job_applicants` (29_sdm_contracts) | `job_applicants` |
| `recruitment_stages` | Tidak ada UI dan tidak diquery | — |
| `general_ledger` | Modul GL belum implementasi, ada `journal_entries` | `journal_entries` |
| `savings_accounts` | Frontend tidak pakai, pakai `savings_plans` | `savings_plans` |
| `wa_chatbot_conversation_history` | WA chatbot tidak dihubungkan ke UI | — |
| `web_vitals_metrics` | Monitoring frontend tidak aktif | — |
| `rate_limits` | Tidak ada UI atau API endpoint | — |
| `siskohat_sync_logs` | Modul SISKOHAT belum implementasi | — |
| `store_carts` | Checkout store belum implementasi | — |
| `store_order_counters` | Internal counter, tidak diquery | — |
| `payment_deadline_reminders` | Hanya insert-only dari trigger, tidak ada UI baca | — |
| `employee_onboarding_tasks` | Onboarding UI belum dibuat | — |
| `onboarding_templates` + `onboarding_template_items` | ditto | — |
| `training_quizzes` | Quiz training tidak ada UI | — |
| `agent_training_progress` | Training agen tidak ada UI | — |
| `position_training_curricula` | ditto | — |
| `training_notification_log` + `training_notification_settings` | Training notif tidak ada UI | — |
| `dashboard_stats` | Materialized snapshot, ada query langsung | — |
| `approval_configs` | Approval workflow tidak ada UI end-to-end | — |
| `approval_requests` + `approval_actions` | ditto | — |
| `sales_targets` | Target sales tidak ada tampilan UI aktif | — |
| `agent_commission_tiers` | Tier config ada (`agent_tier_config`), tabel ini duplikat | `agent_tier_config` |
| `baggage_reference_items` | Tidak ada halaman bagasi aktif | `baggage_policies` |
| `webhook_configs` + `webhook_logs` | Webhook belum diimplementasi | — |
| `departure_waiting_list` | Waiting list tidak ada UI | — |
| `doc_deadline_reminder_log` | Insert-only dari trigger | — |

---

### 24.13 — INDEX GLOBAL PRIORITAS TINGGI

```sql
-- Bookings: query utama di admin
CREATE INDEX IF NOT EXISTS idx_bookings_created_at    ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_branch_id     ON bookings(branch_id);
CREATE INDEX IF NOT EXISTS idx_bookings_total_pax     ON bookings(total_pax);

-- Departures: filter & join
CREATE INDEX IF NOT EXISTS idx_departures_hotel_makkah   ON departures(hotel_makkah_id);
CREATE INDEX IF NOT EXISTS idx_departures_hotel_madinah  ON departures(hotel_madinah_id);
CREATE INDEX IF NOT EXISTS idx_departures_departure_airport ON departures(departure_airport_id);
CREATE INDEX IF NOT EXISTS idx_departures_arrival_airport   ON departures(arrival_airport_id);

-- Payments: laporan keuangan
CREATE INDEX IF NOT EXISTS idx_payments_created_at    ON payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_payment_method ON payments(payment_method);

-- Customers: search
CREATE INDEX IF NOT EXISTS idx_customers_full_name    ON customers(full_name text_pattern_ops);
CREATE INDEX IF NOT EXISTS idx_customers_email        ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_passport     ON customers(passport_number);

-- Finance: jurnal
CREATE INDEX IF NOT EXISTS idx_je_status             ON journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_je_ref_id             ON journal_entries(ref_id);

-- HR: payroll
CREATE INDEX IF NOT EXISTS idx_pr_payment_date       ON payroll_records(payment_date);

-- Guide: real-time
CREATE INDEX IF NOT EXISTS idx_gb_created_at         ON guide_broadcasts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gl_recorded_at        ON guide_locations(recorded_at DESC);

-- Store
CREATE INDEX IF NOT EXISTS idx_so_order_number       ON store_orders(order_number);
CREATE INDEX IF NOT EXISTS idx_so_created_at         ON store_orders(created_at DESC);

-- Audit
CREATE INDEX IF NOT EXISTS idx_dal_created_at        ON document_audit_logs(created_at DESC);
```

---

### 24.14 — VIEW ALIAS UNTUK FIX BUG TANPA UBAH KODE

> Dibuat sebagai bridge agar kode yang pakai nama tabel lama tidak rusak.

```sql
-- Fix BUG-03: savings_payments → savings_deposits
CREATE OR REPLACE VIEW savings_payments AS
  SELECT * FROM savings_deposits;

-- Fix BUG-05: attendance_records → attendance
CREATE OR REPLACE VIEW attendance_records AS
  SELECT * FROM attendance;

-- Fix BUG-08: audit_logs → document_audit_logs
CREATE OR REPLACE VIEW audit_logs AS
  SELECT
    id, 'document' AS log_type, event_type AS action,
    customer_name AS actor_name, booking_id,
    customer_id, doc_type AS resource_type, created_at
  FROM document_audit_logs
  UNION ALL
  SELECT
    id, 'rbac' AS log_type, action,
    changed_by::text AS actor_name, NULL AS booking_id,
    NULL AS customer_id, module_key AS resource_type, changed_at AS created_at
  FROM dashboard_access_audit_log;

-- Fix BUG-02: Kolom harga di departures — harus diisi via migration, bukan view
-- Karena INSERT melalui DepartureForm, VIEW tidak cukup — perlu ALTER TABLE
```

---

### 24.15 — MIGRATION BARU YANG DIBUTUHKAN

Berdasarkan seluruh analisis §17–§24, berikut urutan migration yang harus dibuat:

```
087_fix_missing_columns.sql      ← departures: hotel/airport FKs, flight_number, price_double/triple/quad
088_bookings_missing_columns.sql ← bookings: branch_id, sales_id, base_price, adult/child/infant counts
089_customers_extra_fields.sql   ← customers: blood_type, emergency_contact, mother/father_name, mahram
090_agents_verification.sql      ← agents: ktp_number, ktp_url, npwp, bank fields
091_cash_transactions.sql        ← Buat tabel cash_transactions
092_alias_views.sql              ← View: savings_payments, attendance_records, audit_logs
093_loyalty_referral.sql         ← Buat tabel loyalty_rewards, loyalty_transactions
094_agent_wallets.sql            ← Buat tabel agent_wallets, agent_wallet_transactions
095_jamaah_qr_referral.sql       ← Buat tabel jamaah_qr_codes, referral_codes, referral_usages
096_airports_table.sql           ← Buat tabel airports (lookup bandara)
097_passenger_type_normalize.sql ← ALTER CHECK constraint atau fungsi normalisasi passenger_type
```


---

### 24.16 — RINGKASAN STATISTIK SCHEMA FINAL

```
Total tabel aktif (dipakai kode)  : ~95 tabel
Total tabel deprecated             : ~40 tabel
Total tabel baru yang harus dibuat : 10 tabel (lihat §24.15)
Total kolom missing dari DB        : 47 kolom (lihat §17)
Total view alias yang dibutuhkan   : 3 view (lihat §24.14)
Total migration baru yang dibutuhkan: 11 file SQL
```

#### Daftar Lengkap Tabel per Domain

| # | Domain | Tabel |
|---|---|---|
| 1 | Auth/User | `auth.users`, `profiles`, `user_roles`, `role_permissions`, `permissions_list` |
| 2 | Organisasi | `branches`, `employees`, `agents`, `agent_invitation_tokens`, `agent_tier_config` |
| 3 | Lookup | `airlines`, `hotels`, `airports`★, `vendors` |
| 4 | Paket | `packages`, `media_gallery`, `banners`, `coupons`, `cancellation_rules` |
| 5 | Keberangkatan | `departures`, `departure_muthawifs`, `departure_checklists`, `departure_waiting_list` |
| 6 | Booking | `bookings`, `booking_passengers`, `booking_feedback`, `booking_departure_checklists`, `booking_document_logs` |
| 7 | Pembayaran | `payments`, `virtual_accounts`, `payment_page_tokens`, `bank_accounts` |
| 8 | Customer | `customers`, `customer_mahrams`, `customer_accounts`, `customer_notifications` |
| 9 | Keuangan | `coa_categories`, `departure_cost_items`, `departure_expenses`, `departure_other_revenues`, `departure_financial_summary`, `departure_budgets`, `journal_entries`, `journal_entry_lines`, `finance_budgets`, `bank_reconciliations`, `cash_transactions`★ |
| 10 | SDM/HR | `employees`, `payroll_records`, `payroll_components`, `employee_payroll_components`, `payroll_slips`, `leave_requests`, `leave_quotas`, `disciplinary_records`, `disciplinary_letters`, `career_history`, `performance_reviews`, `employee_contracts`, `job_postings`, `job_applicants` |
| 11 | Perlengkapan | `equipment_items`, `equipment_variants`, `equipment_stock_history`, `equipment_stock_opname`, `equipment_distributions`, `package_type_equipment` |
| 12 | Kamar | `room_assignments`, `room_occupants`, `room_group_audit`, `hotel_contracts`, `hotel_vouchers` |
| 13 | Tabungan | `savings_plans`, `savings_deposits` |
| 14 | Panduan Tour | `guide_channels`, `guide_broadcasts`, `guide_broadcast_reads`, `guide_sessions`, `guide_session_attendance`, `guide_subgroups`, `guide_subgroup_members`, `guide_locations`, `guide_audio_sessions` |
| 15 | Portal Jamaah | `jamaah_checklist`, `jamaah_ibadah_targets`, `jamaah_ibadah_logs`, `jamaah_jurnal`, `jamaah_doa_sessions`, `jamaah_badges`, `ibadah_progress` |
| 16 | Notifikasi | `notifications`, `announcements`, `push_subscriptions`, `push_outbox`, `customer_notifications` |
| 17 | WhatsApp | `whatsapp_config`, `whatsapp_templates`, `wa_template_broadcasts`, `wa_template_broadcast_recipients`, `wa_scheduled_broadcasts`, `wa_scheduled_broadcast_logs`, `wa_chatbot_keywords`, `wa_incoming_messages`, `wa_contacts`, `wa_bot_menu_items` |
| 18 | CRM/Leads | `leads`, `agent_leads`, `discount_requests`, `chat_leads` |
| 19 | Dokumen | `document_types`, `generated_documents`, `document_verify_tokens`, `document_audit_logs`, `document_numbering`, `customer_signatures` |
| 20 | Visa/SOS | `visa_applications`, `visa_status_logs`, `sos_alerts`, `sos_escalation_log` |
| 21 | Store | `store_categories`, `store_products`, `store_orders`, `store_order_items`, `store_shipments`, `store_product_reviews` |
| 22 | Marketing | `marketing_campaigns`, `marketing_metrics`, `marketing_conversions` |
| 23 | Setting | `app_settings`, `website_settings`, `cancellation_rule_audit_logs`, `media_gallery` |
| 24 | Baru★ | `airports`, `cash_transactions`, `agent_wallets`, `agent_wallet_transactions`, `loyalty_rewards`, `loyalty_transactions`, `jamaah_qr_codes`, `referral_codes`, `referral_usages` |
| 25 | Training | `training_modules`, `employee_training_progress` |
| 26 | Approval | `approval_requests`, `approval_actions` (⚠️ no UI) |
| 27 | Manasik | `manasik_schedules`, `attendance`, `manasik_attendance` (⚠️ deprecated) |

★ = Tabel yang perlu dibuat (belum ada di DB)

