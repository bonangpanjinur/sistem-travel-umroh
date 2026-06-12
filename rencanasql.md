# Rencana SQL — Vinstour Travel Portal
## Analisis Komprehensif Semua SQL + Rencana Migrasi Fresh (PostgreSQL/Neon)
### Diperbarui: Juni 2025 — mencakup semua file fase0–fase32, numbered 063–068, timestamp 20260508–20260603, store, keuangan, branding

---

## 1. INVENTARIS LENGKAP SEMUA FILE SQL

### A. File Fase (Ordered Migrations)
| File | Isi Utama |
|------|-----------|
| `fase0_foundation.sql` | Core tables: profiles, user_roles, role_permissions, branches, agents, packages, departures, bookings, payments, customers, employees, muthawifs, hotels, airlines, vendors, dll. |
| `consolidated_all.sql` | Konsolidasi fase1–fase12 (semua tabel inti) |
| `consolidated_fase_13_14_15.sql` | Fase 13–15: equipment, manasik, dokumen, pelatihan agen |
| `fase16_new_tables.sql` | savings_plans, loyalty_points, customer_badges, sos_alerts, approval_requests, announcement, banners |
| `fase17_remaining_tables.sql` | Tabel-tabel tersisa dari sprint awal |
| `fase18_core_settings.sql` | company_settings, bank_accounts, website_settings, menu_items |
| `fase19_branch_kpi_targets.sql` | KPI targets, branch_monthly_targets |
| `fase20_chat_bubble_color.sql` | website_settings tambahan: chat_bubble_color |
| `fase20_webhooks_push.sql` | webhooks, webhook_logs, push_subscriptions, notifications |
| `fase21_integration_fixes.sql` | Fix RLS, FK, dan integrasi |
| `fase22_muthawif_evaluations.sql` | muthawif_evaluations |
| `fase23_payments_transaction_id.sql` | payments: transaction_id column |
| `fase24_payment_sync_trigger.sql` | sync_booking_payment_totals() trigger |
| `fase25_backfill_booking_payment_totals.sql` | Backfill existing booking totals |
| `fase26_public_booking_rpc_qr_settings.sql` | get_public_booking_details(), invoice_templates QR columns |
| `fase27_booking_line_items_rls_fixes.sql` | booking_line_items, fix RLS customer_documents/mahrams/profiles |
| `fase28_package_financials.sql` | departure_cost_items, departure_expenses, departure_other_revenues, departure_financial_summary |
| `fase29_passenger_pricing.sql` | departures: price_adult, child_price_percent, infant_price_percent |
| `fase30_auto_schedule_reminders.sql` | preview/auto_schedule_payment_reminders(), composite UNIQUE constraint |
| `fase31_wa_multiprovider.sql` | whatsapp_config multi-provider, get_wa_config_safe(), wa_feature_roadmap, role 'it' |
| `fase32_wa_broadcast_campaigns.sql` | wa_broadcast_campaigns, wa_broadcast_logs |

### B. File Numbered Migrations (063–068)
| File | Isi Utama |
|------|-----------|
| `063_hotel_room_numbers.sql` | booking_passengers: room_number_makkah, room_number_madinah, room_hotel_notes |
| `064_auto_pl_trigger.sql` | Trigger auto-recalculate P&L saat departure status → 'completed' |
| `064_mahram_room_compatibility.sql` | check_mahram_room_conflicts() function |
| `065_equipment_confirmation.sql` | equipment_distributions: confirmed_by_jamaah, confirmed_at columns |
| `065_hotel_room_capacities.sql` | hotel_room_capacities table (batas kamar per hotel per tipe) |
| `066_equipment_distribution_photo.sql` | equipment_distributions: distribution_photo_url columns |
| `066_multi_hotel_per_city.sql` | departure_hotels: city column, sync_departure_hotel_city() trigger |
| `067_package_hpp_templates.sql` | package_hpp_templates table (template HPP per paket) |
| `067_package_type_equipment.sql` | package_type_equipment table (perlengkapan default per tipe paket) |
| `068_comprehensive_pl_triggers.sql` | Trigger P&L otomatis pada bookings, cost_items, expenses, revenues |
| `068_withdrawal_requests_extra.sql` | withdrawal_requests: rejection_reason, processed_at, bank_details |

### C. File Timestamp Migrations (20260508–20260603)
| File | Isi Utama |
|------|-----------|
| `20260508000000_invoice_templates.sql` | invoice_templates table |
| `20260511_e411d2d6` | attribute_commission_to_parent() trigger, agent_commissions |
| `20260511_a74d5d05` | store_categories, store_products, store_orders, store_order_items, store_shipments, store_carts, store_order_counters |
| `20260511_3bc297d2` | push_subscriptions table |
| `20260511_688bca84` | ibadah_progress table |
| `20260511_916b4c99` | push_outbox table |
| `20260511_033505` | Various fixes |
| `20260513_*` | savings_plans/schedules, seat_holds, booking_access_tokens, booking_transfers, departure_surveys, exchange_rates, jamaah_badges, jamaah_daily_attendance, loyalty_point_expiry, midtrans_webhook_logs, package_labels, package_label_assignments, pwa_install_events, store_purchase_orders, store_purchase_order_items, store_suppliers, store_stock_movements, store_opname_sessions, store_opname_lines, store_low_stock_alerts, store_po_counters, tier_benefits, training_modules, training_quizzes, agent_training_progress, web_vitals_metrics, manasik_schedules, savings_schedules, baggage_policies, support_tickets |
| `20260517_create_web_vitals_metrics.sql` | web_vitals_metrics (versi lebih detail) |
| `20260530000000_add_package_discount.sql` | packages: discount_amount, discount_percentage |
| `20260531000000_fix_payment_deadline_reminders.sql` | payment_deadline_reminders (standalone) |
| `20260531000001_fix_package_labels.sql` | package_labels, package_label_assignments |
| `20260602_*` | Berbagai fixes dan tambahan |
| `20260603_*` | Fixes lanjutan |

### D. File Standalone
| File | Isi Utama |
|------|-----------|
| `store_ecommerce.sql` | store_categories, store_products, store_orders, store_order_items, store_shipments (versi lengkap) |
| `store_product_reviews.sql` | store_product_reviews |
| `doc_sprint2_branch_branding_templates.sql` | branches: signature_url, stamp_url, logo_url, letterhead_data; document_templates |

---

## 2. DAFTAR LENGKAP SEMUA TABEL (Inventaris Final)

### KATEGORI A — Core Auth & RBAC (4 tabel)
| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `profiles` | id (FK auth.users), full_name, avatar_url, phone, is_active | auth.users |
| `user_roles` | user_id, role (TEXT CHECK), branch_id | auth.users, branches |
| `role_permissions` | role, permission_key | — |
| `user_permissions` | user_id, permission_key | auth.users |

**app_role values (TEXT CHECK constraint):**
```
super_admin, owner, admin, branch_manager, finance, operational,
sales, marketing, hr, equipment, agent, sub_agent, customer,
jamaah, visa_officer, it
```

### KATEGORI B — Organisasi (12 tabel)
| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `branches` | id, name, slug, manager_id, logo_url, signature_url, stamp_url, letterhead_data | auth.users |
| `agents` | id, branch_id, user_id, parent_agent_id, tier, commission_rate | branches, auth.users, self |
| `agent_memberships` | agent_id, membership_plan_id, status | agents |
| `agent_leads` | agent_id, customer_id, status | agents, customers |
| `agent_monthly_targets` | agent_id, year, month, target_amount | agents |
| `agent_override_commissions` | agent_id, booking_id, override_rate | agents, bookings |
| `agent_training_progress` | agent_id, module_id, status, score | agents, training_modules |
| `employees` | id, branch_id, user_id, position, department | branches, auth.users |
| `muthawifs` | id, branch_id, user_id, certification_number | branches, auth.users |
| `muthawif_evaluations` | muthawif_id, departure_id, booking_id, rating | muthawifs, departures, bookings |
| `vendors` | id, type, name, contact_info | — |
| `vendor_contracts` | vendor_id, branch_id, start_date, end_date | vendors, branches |

### KATEGORI C — Paket & Keberangkatan (16 tabel)
| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `packages` | id, branch_id, name, code, type, price_quad/triple/double/single, quota, child_price_percent, infant_price_percent, discount_amount, discount_percentage, booking_mode | branches |
| `package_labels` | id, branch_id, slug, name, color, icon, sort_order | branches |
| `package_label_assignments` | package_id, label_id | packages, package_labels |
| `package_hpp_templates` | id, package_id, category, description, unit, quantity, unit_cost, currency | packages |
| `package_reviews` | package_id, user_id, rating, comment | packages, auth.users |
| `package_types` | id, name, code | — |
| `package_type_equipment` | package_type_id, equipment_item_id, default_quantity | package_types, equipment |
| `departures` | id, package_id, departure_date, return_date, quota, price_quad/triple/double/single, price_adult, price_child, price_infant, child_price_percent, infant_price_percent, status | packages |
| `departure_hotels` | departure_id, hotel_id, hotel_role, airline_id, city | departures, hotels, airlines |
| `departure_cost_items` | departure_id, category, location, hotel_id, airline_id, unit, quantity, unit_cost, currency, exchange_rate, total_cost_idr | departures, hotels, airlines |
| `departure_expenses` | departure_id, booking_id, category, amount, currency, exchange_rate, amount_idr | departures, bookings |
| `departure_other_revenues` | departure_id, booking_id, category, amount, currency, exchange_rate, amount_idr | departures, bookings |
| `departure_financial_summary` | departure_id, revenue_gross, hpp_total, expense_total, gross_profit, net_profit | departures |
| `departure_budgets` | departure_id, category, budgeted_amount | departures |
| `departure_surveys` | departure_id, booking_id, rating, feedback | departures, bookings |
| `departure_surveys` | departure_id, status | departures |
| `airlines` | id, name, iata_code | — |
| `hotels` | id, name, city, star_rating, address | — |
| `hotel_room_capacities` | hotel_id, room_type, total_rooms | hotels |

### KATEGORI D — Booking & Pembayaran (14 tabel)
| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `bookings` | id, booking_code, customer_id, departure_id, agent_id, status, payment_status, total_price, paid_amount, remaining_amount, total_pax, room_type, booking_type, dp_amount, dp_percentage, savings_mode, payment_deadline, bagasi_kg_allowed | customers, departures, agents |
| `booking_passengers` | booking_id, customer_id, passenger_type, seat_number, room_number_makkah, room_number_madinah, room_hotel_notes | bookings, customers |
| `booking_line_items` | booking_id, passenger_id, item_type, description, quantity, unit_price, total_price | bookings |
| `booking_status_history` | booking_id, old_status, new_status, changed_by | bookings, auth.users |
| `booking_access_tokens` | booking_id, token, expires_at, used_at | bookings |
| `booking_transfers` | from_booking_id, to_booking_id, reason, approved_by | bookings |
| `booking_document_logs` | booking_id, doc_type, generated_by, generated_at | bookings |
| `booking_feedback` | booking_id, rating, comment, submitted_at | bookings |
| `seat_holds` | departure_id, session_id, room_type, quantity, expires_at, released_at | departures |
| `payments` | booking_id, amount, method, status, transaction_id, proof_url, verified_by | bookings |
| `payment_deadline_reminders` | booking_id, days_before, status, phone, full_name, payment_deadline, remaining_amount — UNIQUE(booking_id, days_before) | bookings |
| `room_assignments` | departure_id, booking_id, passenger_id, hotel_id, room_type, room_number | departures, bookings |
| `room_group_audit` | departure_id, action, details | departures |
| `midtrans_webhook_logs` | order_id, event_type, status, payload, created_at | — |

### KATEGORI E — Customer & Jamaah (17 tabel)
| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `customers` | id, branch_id, user_id, full_name, nik, passport_number, nomor_porsi_haji, embarkasi_kode | branches, auth.users |
| `customer_documents` | customer_id, doc_type, file_url, expiry_date, status | customers |
| `customer_mahrams` | customer_id, mahram_customer_id, relation_type | customers |
| `customer_accounts` | customer_id, balance, loyalty_tier | customers |
| `customer_notifications` | customer_id, title, body, type, read_at | customers |
| `visa_applications` | booking_id, customer_id, departure_id, visa_type, status | bookings, customers, departures |
| `visa_status_logs` | visa_application_id, old_status, new_status | visa_applications |
| `siskohat_sync_logs` | branch_id, customer_id, status, response | branches, customers |
| `loyalty_points` | customer_id, points, tier, tier_expires_at | customers |
| `loyalty_point_expiry` | customer_id, points, expires_at | customers |
| `customer_badges` / `jamaah_badges` | user_id, badge_type, awarded_at | auth.users |
| `tier_benefits` | tier, benefit_type, benefit_value | — |
| `ibadah_progress` | user_id, ibadah_type, ibadah_date, count, target, completed | auth.users |
| `jamaah_daily_attendance` | booking_id, departure_id, attendance_date, status | bookings, departures |
| `jamaah_checklist` | booking_id, item_type, completed_at | bookings |
| `jamaah_ibadah_logs` | user_id, ibadah_type, notes, created_at | auth.users |
| `jamaah_ibadah_targets` | user_id, ibadah_type, daily_target | auth.users |
| `jamaah_jurnal` | user_id, content, created_at | auth.users |
| `jamaah_doa_sessions` | user_id, doa_type, duration | auth.users |

### KATEGORI F — Tabungan / Savings (3 tabel)
| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `savings_plans` | customer_id, target_amount, monthly_amount, status, departure_id | customers, departures |
| `savings_deposits` | savings_plan_id, amount, paid_at, method | savings_plans |
| `savings_schedules` | savings_plan_id, due_date, amount, status, paid_at | savings_plans |

### KATEGORI G — Perlengkapan & Procurement (7 tabel)
| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `equipment` / `equipment_items` | id, name, type, unit | — |
| `equipment_distributions` | customer_id, departure_id, status, confirmed_by_jamaah, confirmed_at, distribution_photo_url | customers, departures |
| `equipment_distribution_items` | distribution_id, item_id, quantity, confirmed | equipment_distributions |
| `equipment_damage` | equipment_id, reported_by, description | equipment |
| `equipment_maintenance` | equipment_id, scheduled_date, notes | equipment |
| `baggage_reference_items` | name, weight_gram, category | — |
| `baggage_policies` | departure_id, max_weight_kg, hand_carry_kg | departures |
| `package_type_equipment` | package_type_id, equipment_item_id, default_quantity, is_required | package_types, equipment |

### KATEGORI H — Pelatihan Agen (3 tabel)
| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `training_modules` | id, title, description, content_url, order_index | — |
| `training_quizzes` | module_id, question, options (JSONB), correct_answer | training_modules |
| `agent_training_progress` | agent_id, module_id, status, score, completed_at | agents, training_modules |

### KATEGORI I — Toko E-Commerce (17 tabel)
| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `store_categories` | id, name, slug, image_url, is_active, sort_order | — |
| `store_products` | id, category_id, branch_id, name, slug, price, original_price, stock, images (JSONB), is_featured, sold_count, sku | store_categories, branches |
| `store_orders` | id, order_number, customer_id, user_id, branch_id, status, payment_status, subtotal, shipping_cost, total_amount | customers, branches, auth.users |
| `store_order_items` | order_id, product_id, product_name, quantity, unit_price, subtotal | store_orders, store_products |
| `store_shipments` | order_id, courier_name, tracking_number, status, shipped_at | store_orders |
| `store_product_reviews` | order_id, product_id, user_id, rating, comment, is_published, admin_reply | store_orders, store_products, auth.users |
| `store_carts` | user_id (PK), items (JSONB), updated_at | auth.users |
| `store_order_counters` | date_key (PK), last_seq | — |
| `store_suppliers` | id, name, contact_info, address | — |
| `store_purchase_orders` | id, supplier_id, branch_id, status (po_status ENUM), order_date, total_amount | store_suppliers, branches |
| `store_purchase_order_items` | po_id, product_id, quantity_ordered, quantity_received, unit_cost | store_purchase_orders, store_products |
| `store_po_counters` | date_key (PK), last_seq | — |
| `store_stock_movements` | product_id, type (stock_movement_type ENUM), quantity, reference_id, notes | store_products |
| `store_opname_sessions` | id, branch_id, status (opname_status ENUM), opname_code | branches |
| `store_opname_lines` | session_id, product_id, stock_system, stock_physical, variance | store_opname_sessions, store_products |
| `store_low_stock_alerts` | product_id, current_stock, threshold, resolved_at | store_products |

**Store ENUMs:**
```
opname_status:      draft, submitted, approved, rejected
po_status:          draft, ordered, partial, received, cancelled
stock_movement_type: purchase_in, sale_out, adjustment, return_in, return_out, opname
```

### KATEGORI J — WhatsApp & Komunikasi (12 tabel)
| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `whatsapp_config` | id, provider, display_name, sender_number, api_key, provider_config (JSONB), is_active, webhook_secret, last_tested_at | auth.users |
| `whatsapp_message_templates` | id, name, content, variables (JSONB), category | — |
| `whatsapp_send_logs` | config_id, booking_id, phone, message, status, sent_at, error_msg | whatsapp_config, bookings |
| `wa_broadcast_campaigns` | id, name, segment_filters (JSONB), message_template, status, scheduled_at, success_count, fail_count | auth.users |
| `wa_broadcast_logs` | campaign_id, booking_id, phone, status, sent_at, error_msg | wa_broadcast_campaigns, bookings |
| `wa_feature_roadmap` | id, phase, code, title, status, sort_order | — |
| `push_subscriptions` | user_id, customer_id, endpoint (UNIQUE), p256dh, auth, is_active | auth.users |
| `push_outbox` | user_ids[], customer_ids[], title, body, type, status, scheduled_at | — |
| `notifications` | user_id, title, body, type, read_at | auth.users |
| `notification_templates` | id, type, title_tpl, body_tpl | — |
| `webhooks` | id, url, events[], secret, is_active | — |
| `webhook_logs` | webhook_id, event, payload, status, response_status | webhooks |

### KATEGORI K — Website & Marketing (15 tabel)
| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `website_settings` | id, agent_id, branch_id, theme, primary_color, chat_bubble_color, footer_text | agents, branches |
| `menu_items` | id, key (UNIQUE), label, path, icon, group_name, sort_order, required_permission, is_visible | — |
| `company_settings` / `app_settings` | id, key (UNIQUE), value, description | — |
| `bank_accounts` | id, bank_name, account_name, account_number, branch_id, is_default | branches |
| `media_gallery` | id, type, title, url, hotel_id, package_id | hotels, packages |
| `leads` | id, branch_id, agent_id, name, phone, source, status | branches, agents |
| `chat_leads` | id, branch_id, name, phone, message | branches |
| `agent_leads` | agent_id, customer_id | agents |
| `sales_targets` | branch_id, user_id, year, month, target_amount | branches, auth.users |
| `marketing_campaigns` | id, branch_id, name, channel, budget, start_date | branches |
| `marketing_conversions` | campaign_id, booking_id, converted_at | marketing_campaigns, bookings |
| `marketing_metrics` | campaign_id, impressions, clicks, conversions | marketing_campaigns |
| `announcements` | id, title, content, branch_id, role_targets[], expires_at | branches |
| `banners` | id, title, image_url, link_url, branch_id, is_active | branches |
| `contact_page_content` | branch_id, phone, email, address, maps_url | branches |
| `coupons` | id, code (UNIQUE), discount_type, discount_value, max_uses, used_count | — |
| `discount_requests` | booking_id, requested_by, amount, reason, status | bookings, auth.users |

### KATEGORI L — Keuangan (7 tabel)
| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `agent_commissions` | agent_id, booking_id, commission_amount, status, notes | agents, bookings |
| `withdrawal_requests` | agent_id, amount, status, bank_details (JSONB), rejection_reason, processed_at | agents |
| `exchange_rates` | id, currency_from, currency_to, rate, is_active, valid_from | — |
| `financial_summary` / `financial_monthly_summary` | branch_id, year, month, revenue, expense, profit | branches |
| `expenses` | branch_id, category, amount, description, expense_date | branches |
| `payroll_records` | employee_id, period_year, period_month, gross, net, paid_at | employees |
| `membership_plans` | id, name, min_bookings, commission_bonus_pct, benefits (JSONB) | — |
| `branch_commissions` | branch_id, rate, effective_from | branches |
| `branch_memberships` | branch_id, plan_id, joined_at | branches |
| `branch_monthly_targets` | branch_id, year, month, target_bookings, target_revenue | branches |

### KATEGORI M — HR & Karyawan (5 tabel)
| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `employee_leaves` / `leave_requests` | employee_id, leave_type, start_date, end_date, status, approved_by | employees, auth.users |
| `employee_schedules` | employee_id, date, shift_start, shift_end, notes | employees |
| `leave_quotas` | employee_id, year, leave_type, total_days, used_days | employees |
| `performance_reviews` | employee_id, period, rating, reviewer_id, notes | employees, auth.users |

### KATEGORI N — Operasional Lanjut (17 tabel)
| Tabel | Kolom Penting | Dependensi |
|-------|---------------|------------|
| `manasik_sessions` / `manasik_schedules` | departure_id, branch_id, session_date, location, topic | departures, branches |
| `manasik_attendance` / `manasik_attendances` | session_id, booking_passenger_id, status | manasik_sessions, booking_passengers |
| `sos_alerts` | customer_id, branch_id, muthawif_id, latitude, longitude, message, status | customers, branches, muthawifs |
| `approval_requests` | branch_id, requested_by, type, amount, reason, status | branches, auth.users |
| `approval_actions` | approval_request_id, actor_id, action, notes | approval_requests, auth.users |
| `approval_configs` | type, threshold_amount, required_roles[] | — |
| `dashboard_access_config` | role, widget_key, is_visible | — |
| `dashboard_access_audit_log` | user_id, widget_key, action, created_at | auth.users |
| `dashboard_stats` | key, value, last_updated | — |
| `invoice_templates` | id, name, is_default, accent_color, font_family, show_qr_code, qr_placement, payment_info_blocks (JSONB) | — |
| `document_templates` | id, doc_type, branch_id, name, is_default, settings_json (JSONB) | branches |
| `generated_documents` | booking_id, doc_type, file_url, generated_by, generated_at | bookings, auth.users |
| `email_logs` | to_email, template_id, status, sent_at | — |
| `email_templates` | id, key (UNIQUE), subject, html_body, variables[] | — |
| `support_tickets` | id, customer_id, subject, status, assigned_to | customers, auth.users |
| `web_vitals_metrics` | metric_name, metric_value, rating, route, device_type, branch_id, release_version | — |
| `pwa_install_events` | user_id, platform, install_date | auth.users |
| `permissions_list` | permission_key, label, group_name | — |
| `document_types` | id, code, name, description | — |

---

## 3. PETA DEPENDENSI FK (Topologi Lengkap)

```
[LAYER 0 — No FK / auth.users only]
  profiles            → auth.users
  user_roles          → auth.users, branches
  role_permissions    → (no FK)
  user_permissions    → auth.users
  hotels              → (no FK)
  vendors             → (no FK)
  airlines            → (no FK)
  store_categories    → (no FK)
  menu_items          → (no FK)
  company_settings    → (no FK)
  bank_accounts       → branches (setelah branches dibuat)
  training_modules    → (no FK)
  invoice_templates   → (no FK)
  baggage_reference_items → (no FK)
  whatsapp_config     → auth.users
  wa_feature_roadmap  → (no FK)
  webhooks            → (no FK)
  approval_configs    → (no FK)
  dashboard_access_config → (no FK)
  dashboard_stats     → (no FK)
  exchange_rates      → (no FK)
  store_suppliers     → (no FK)
  package_types       → (no FK)
  membership_plans    → (no FK)
  email_templates     → (no FK)
  notification_templates → (no FK)
  permissions_list    → (no FK)
  document_types      → (no FK)
  baggage_policies    → departures
  coupons             → (no FK)

[LAYER 1 — Branches]
  branches → auth.users

[LAYER 2 — Depends on branches]
  agents           → branches, auth.users, self(parent_agent_id)
  employees        → branches, auth.users
  muthawifs        → branches, auth.users
  customers        → branches, auth.users
  packages         → branches
  store_products   → store_categories, branches  ← FK KRITIS
  vendor_contracts → vendors, branches
  document_templates → branches
  media_gallery    → hotels, packages (setelah packages ada)
  website_settings → agents, branches
  announcements    → branches
  banners          → branches
  contact_page_content → branches
  leads            → branches, agents
  chat_leads       → branches
  sales_targets    → branches, auth.users
  marketing_campaigns → branches
  siskohat_sync_logs → branches, customers
  financial_monthly_summary → branches
  expenses         → branches
  branch_commissions → branches
  branch_memberships → branches, membership_plans
  branch_monthly_targets → branches
  agent_monthly_targets → agents
  agent_memberships → agents, membership_plans

[LAYER 3 — Depends on packages]
  package_labels        → branches (NULL = global)
  package_hpp_templates → packages
  package_reviews       → packages, auth.users
  departures            → packages
  training_quizzes      → training_modules
  hotel_room_capacities → hotels

[LAYER 4 — Depends on departures / agents / customers]
  departure_hotels       → departures, hotels, airlines
  departure_budgets      → departures
  departure_surveys      → departures, bookings
  manasik_sessions       → departures, branches
  seat_holds             → departures, customers
  room_assignments       → departures, bookings
  package_label_assignments → packages, package_labels
  package_type_equipment → package_types, equipment
  agent_training_progress → agents, training_modules
  withdrawal_requests    → agents

[LAYER 5 — Bookings (core transaction)]
  bookings → customers, departures, agents

[LAYER 6 — Depends on bookings]
  booking_passengers     → bookings, customers
  booking_line_items     → bookings
  booking_status_history → bookings, auth.users
  booking_access_tokens  → bookings
  booking_transfers      → bookings
  booking_document_logs  → bookings
  booking_feedback       → bookings
  payments               → bookings
  payment_deadline_reminders → bookings
  visa_applications      → bookings, customers, departures
  discount_requests      → bookings, auth.users

[LAYER 7 — Depends on bookings + passengers]
  manasik_attendances    → manasik_sessions, booking_passengers
  departure_cost_items   → departures, hotels, airlines, profiles
  departure_expenses     → departures, bookings, profiles
  departure_other_revenues → departures, bookings, profiles
  departure_financial_summary → departures
  muthawif_evaluations   → muthawifs, bookings, departures
  jamaah_daily_attendance → bookings, departures
  visa_status_logs       → visa_applications

[LAYER 8 — Customer support tables]
  customer_documents  → customers
  customer_mahrams    → customers
  customer_accounts   → customers
  customer_notifications → customers
  loyalty_points      → customers
  loyalty_point_expiry → customers
  customer_badges / jamaah_badges → auth.users
  tier_benefits       → (no FK)
  ibadah_progress     → auth.users
  jamaah_checklist    → bookings
  jamaah_ibadah_logs  → auth.users
  jamaah_ibadah_targets → auth.users
  jamaah_jurnal       → auth.users
  jamaah_doa_sessions → auth.users
  savings_plans       → customers, departures
  savings_deposits    → savings_plans
  savings_schedules   → savings_plans
  equipment_distributions → customers, departures
  equipment_distribution_items → equipment_distributions
  equipment_damage    → equipment
  equipment_maintenance → equipment

[LAYER 9 — Store]
  store_orders             → customers, branches, auth.users
  store_order_items        → store_orders, store_products
  store_shipments          → store_orders
  store_product_reviews    → store_orders, store_products, customers
  store_carts              → auth.users
  store_purchase_orders    → store_suppliers, branches
  store_purchase_order_items → store_purchase_orders, store_products
  store_opname_sessions    → branches
  store_opname_lines       → store_opname_sessions, store_products
  store_low_stock_alerts   → store_products
  store_stock_movements    → store_products
  agent_override_commissions → bookings, agents
  agent_commissions        → agents, bookings
  midtrans_webhook_logs    → (no FK, references order_id TEXT)

[LAYER 10 — Agen & Approval]
  approval_requests   → branches, auth.users
  approval_actions    → approval_requests, auth.users
  agent_leads         → agents, customers

[LAYER 11 — WA & Komunikasi]
  whatsapp_message_templates → (no FK)
  whatsapp_send_logs   → whatsapp_config, bookings
  wa_broadcast_campaigns → auth.users
  wa_broadcast_logs    → wa_broadcast_campaigns, bookings
  push_subscriptions   → auth.users
  notifications        → auth.users
  webhook_logs         → webhooks
  marketing_conversions → marketing_campaigns, bookings
  marketing_metrics    → marketing_campaigns

[LAYER 12 — Dashboard & Monitoring]
  web_vitals_metrics   → (no FK, optional branch_id)
  pwa_install_events   → auth.users
  dashboard_access_audit_log → auth.users
  email_logs           → (no FK)
  support_tickets      → customers, auth.users
  generated_documents  → bookings, auth.users
  sos_alerts           → customers, branches, muthawifs
  payroll_records      → employees
  leave_requests / employee_leaves → employees, auth.users
  leave_quotas         → employees
  employee_schedules   → employees
  performance_reviews  → employees, auth.users
```

---

## 4. RENCANA MIGRASI FRESH — URUTAN EKSEKUSI BENAR

### MASTER FILE: `sql/MASTER_FRESH_MIGRATION.sql`

```
══════════════════════════════════════════════════════════════════
TAHAP 0: EXTENSIONS & HELPER FUNCTIONS
══════════════════════════════════════════════════════════════════
  CREATE EXTENSION IF NOT EXISTS "uuid-ossp"
  CREATE EXTENSION IF NOT EXISTS "pgcrypto"
  
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  CREATE OR REPLACE FUNCTION slugify_text()
  CREATE OR REPLACE FUNCTION _create_updated_at_trigger() -- macro helper

══════════════════════════════════════════════════════════════════
TAHAP 1: STANDALONE TABLES (No FK ke custom tables)
══════════════════════════════════════════════════════════════════
  profiles              (→ auth.users)
  hotels                (no FK)
  vendors               (no FK)
  airlines              (no FK)
  store_categories      (no FK)
  menu_items            (no FK)
  company_settings      (no FK)
  training_modules      (no FK)
  training_quizzes      (→ training_modules)
  invoice_templates     (no FK)
  baggage_reference_items (no FK)
  whatsapp_config       (→ auth.users)
  wa_feature_roadmap    (no FK)
  webhooks              (no FK)
  approval_configs      (no FK)
  exchange_rates        (no FK)
  store_suppliers       (no FK)
  package_types         (no FK)
  membership_plans      (no FK)
  email_templates       (no FK)
  notification_templates (no FK)
  permissions_list      (no FK)
  document_types        (no FK)
  coupons               (no FK)

══════════════════════════════════════════════════════════════════
TAHAP 2: RBAC TABLES
══════════════════════════════════════════════════════════════════
  user_roles            (→ auth.users) -- branches FK ditambahkan setelah branches
  role_permissions      (no FK)
  user_permissions      (→ auth.users)

══════════════════════════════════════════════════════════════════
TAHAP 3: BRANCHES (Pivot Utama)
══════════════════════════════════════════════════════════════════
  branches              (→ auth.users)
    + ADD COLUMN: signature_url, stamp_url, logo_url, letterhead_data

══════════════════════════════════════════════════════════════════
TAHAP 4: ENTITAS BERGANTUNG BRANCHES
══════════════════════════════════════════════════════════════════
  agents                (→ branches, auth.users, self)
  employees             (→ branches, auth.users)
  muthawifs             (→ branches, auth.users)
  customers             (→ branches, auth.users)
    + ADD COLUMN: nomor_porsi_haji, embarkasi_kode, estimasi_keberangkatan_haji
  vendor_contracts      (→ vendors, branches)
  bank_accounts         (→ branches)
  announcements         (→ branches)
  banners               (→ branches)
  contact_page_content  (→ branches)
  leads                 (→ branches, agents)
  chat_leads            (→ branches)
  sales_targets         (→ branches, auth.users)
  marketing_campaigns   (→ branches)
  branch_commissions    (→ branches)
  branch_monthly_targets (→ branches)
  agent_monthly_targets  (→ agents)
  hotel_room_capacities  (→ hotels)

══════════════════════════════════════════════════════════════════
TAHAP 5: PACKAGES, STORE PRODUCTS (bergantung branches)
══════════════════════════════════════════════════════════════════
  packages              (→ branches)
    + ADD COLUMN: discount_amount, discount_percentage, booking_mode
    + ADD COLUMN: child_price_percent, infant_price_percent
  store_products        (→ store_categories, branches)

══════════════════════════════════════════════════════════════════
TAHAP 6: SUB-PAKET & WEBSITE
══════════════════════════════════════════════════════════════════
  package_labels          (→ branches)
  package_hpp_templates   (→ packages)
  package_reviews         (→ packages, auth.users)
  package_type_equipment  (→ package_types, equipment)
  website_settings        (→ agents, branches)
  document_templates      (→ branches)
  media_gallery           (→ hotels, packages)
  agent_memberships       (→ agents, membership_plans)
  branch_memberships      (→ branches, membership_plans)
  agent_training_progress (→ agents, training_modules)
  withdrawal_requests     (→ agents)
    + ADD COLUMN: rejection_reason, processed_at, bank_details

══════════════════════════════════════════════════════════════════
TAHAP 7: DEPARTURES
══════════════════════════════════════════════════════════════════
  departures              (→ packages)
    + ADD COLUMN: price_adult, price_child, price_infant
    + ADD COLUMN: child_price_percent, infant_price_percent
  departure_hotels        (→ departures, hotels, airlines)
    + ADD COLUMN: city
  departure_budgets       (→ departures)
  manasik_sessions/schedules (→ departures, branches)
  baggage_policies        (→ departures)

══════════════════════════════════════════════════════════════════
TAHAP 8: BOOKINGS (Core Transaction)
══════════════════════════════════════════════════════════════════
  seat_holds              (→ departures, customers)
  bookings                (→ customers, departures, agents)
    + ADD COLUMN: booking_type, dp_amount, dp_percentage, savings_mode
    + ADD COLUMN: payment_deadline, remaining_amount, total_pax
    + ADD COLUMN: bagasi_kg_allowed, booking_status

══════════════════════════════════════════════════════════════════
TAHAP 9: SUB-TABEL BOOKINGS
══════════════════════════════════════════════════════════════════
  booking_passengers      (→ bookings, customers)
    + ADD COLUMN: room_number_makkah, room_number_madinah, room_hotel_notes
  booking_line_items      (→ bookings)
  booking_status_history  (→ bookings, auth.users)
  booking_access_tokens   (→ bookings)
  booking_transfers       (→ bookings)
  booking_document_logs   (→ bookings)
  booking_feedback        (→ bookings)
  payments                (→ bookings)
    + ADD COLUMN: transaction_id
  payment_deadline_reminders (→ bookings)
    -- UNIQUE(booking_id, days_before) — composite
  visa_applications       (→ bookings, customers, departures)
  visa_status_logs        (→ visa_applications)
  room_assignments        (→ departures, bookings)
  room_group_audit        (→ departures)
  discount_requests       (→ bookings, auth.users)
  midtrans_webhook_logs   (no FK)

══════════════════════════════════════════════════════════════════
TAHAP 10: OPERASIONAL KEBERANGKATAN & KEUANGAN
══════════════════════════════════════════════════════════════════
  departure_cost_items     (→ departures, hotels, airlines, profiles)
  departure_expenses       (→ departures, bookings, profiles)
  departure_other_revenues (→ departures, bookings, profiles)
  departure_financial_summary (→ departures)
  departure_surveys        (→ departures, bookings)
  muthawif_evaluations     (→ muthawifs, bookings, departures)
  jamaah_daily_attendance  (→ bookings, departures)
  manasik_attendances      (→ manasik_sessions, booking_passengers)
  sos_alerts               (→ customers, branches, muthawifs)
  package_label_assignments (→ packages, package_labels)

══════════════════════════════════════════════════════════════════
TAHAP 11: CUSTOMER SUPPORT & PORTAL JAMAAH
══════════════════════════════════════════════════════════════════
  customer_documents      (→ customers)
  customer_mahrams        (→ customers)
  customer_accounts       (→ customers)
  customer_notifications  (→ customers)
  siskohat_sync_logs      (→ branches, customers)
  loyalty_points          (→ customers)
  loyalty_point_expiry    (→ customers)
  customer_badges / jamaah_badges (→ auth.users)
  tier_benefits           (no FK)
  ibadah_progress         (→ auth.users)
  jamaah_checklist        (→ bookings)
  jamaah_ibadah_logs      (→ auth.users)
  jamaah_ibadah_targets   (→ auth.users)
  jamaah_jurnal           (→ auth.users)
  jamaah_doa_sessions     (→ auth.users)
  savings_plans           (→ customers, departures)
  savings_deposits        (→ savings_plans)
  savings_schedules       (→ savings_plans)
  equipment_distributions (→ customers, departures)
    + ADD COLUMN: confirmed_by_jamaah, confirmed_at, distribution_photo_url
  equipment_distribution_items (→ equipment_distributions)
  equipment_damage        (→ equipment)
  equipment_maintenance   (→ equipment)

══════════════════════════════════════════════════════════════════
TAHAP 12: TOKO E-COMMERCE LANJUTAN
══════════════════════════════════════════════════════════════════
  store_orders             (→ customers, branches, auth.users)
  store_order_items        (→ store_orders, store_products)
  store_shipments          (→ store_orders)
  store_product_reviews    (→ store_orders, store_products, customers)
  store_carts              (→ auth.users)
  store_order_counters     (no FK)
  store_purchase_orders    (→ store_suppliers, branches)
  store_purchase_order_items (→ store_purchase_orders, store_products)
  store_po_counters        (no FK)
  store_stock_movements    (→ store_products)
  store_opname_sessions    (→ branches)
  store_opname_lines       (→ store_opname_sessions, store_products)
  store_low_stock_alerts   (→ store_products)

══════════════════════════════════════════════════════════════════
TAHAP 13: AGEN KEUANGAN & APPROVAL
══════════════════════════════════════════════════════════════════
  agent_commissions        (→ agents, bookings)
  agent_override_commissions (→ bookings, agents)
  agent_leads              (→ agents, customers)
  approval_requests        (→ branches, auth.users)
  approval_actions         (→ approval_requests, auth.users)
  financial_monthly_summary (→ branches)
  expenses                 (→ branches)
  payroll_records          (→ employees)
  leave_requests           (→ employees, auth.users)
  leave_quotas             (→ employees)
  employee_schedules       (→ employees)
  performance_reviews      (→ employees, auth.users)
  marketing_conversions    (→ marketing_campaigns, bookings)
  marketing_metrics        (→ marketing_campaigns)

══════════════════════════════════════════════════════════════════
TAHAP 14: WA & KOMUNIKASI
══════════════════════════════════════════════════════════════════
  whatsapp_message_templates (no FK)
  whatsapp_send_logs       (→ whatsapp_config, bookings)
  wa_broadcast_campaigns   (→ auth.users)
  wa_broadcast_logs        (→ wa_broadcast_campaigns, bookings)
  push_subscriptions       (→ auth.users)
  push_outbox              (no FK)
  notifications            (→ auth.users)
  webhook_logs             (→ webhooks)
  email_logs               (no FK)

══════════════════════════════════════════════════════════════════
TAHAP 15: DASHBOARD & MONITORING
══════════════════════════════════════════════════════════════════
  dashboard_access_config  (no FK)
  dashboard_access_audit_log (→ auth.users)
  web_vitals_metrics       (no FK, optional branch_id)
  pwa_install_events       (→ auth.users)
  support_tickets          (→ customers, auth.users)
  generated_documents      (→ bookings, auth.users)

══════════════════════════════════════════════════════════════════
TAHAP 16: FUNGSI & TRIGGER
══════════════════════════════════════════════════════════════════
  1. handle_new_user()                     — auto-create profile on auth.users INSERT
  2. sync_booking_payment_totals()         — update paid_amount & payment_status dari payments
  3. generate_booking_code()               — format: VTR-YYYYMMDD-XXXXX
  4. generate_store_order_number()         — format: ORDyymmddNNNN (pakai store_order_counters)
  5. generate_po_number()                  — format PO store purchase
  6. generate_opname_code()               — format opname session
  7. recalculate_departure_financial_summary() — P&L cache trigger
  8. trigger_recalculate_pl_on_complete() — auto-fire pada departure status='completed'
  9. trigger_pl_on_booking_change()        — auto P&L pada booking INSERT/UPDATE/DELETE
  10. trigger_pl_on_cost_change()          — auto P&L pada departure_cost_items
  11. trigger_pl_on_expense_change()       — auto P&L pada departure_expenses
  12. trigger_pl_on_revenue_change()       — auto P&L pada departure_other_revenues
  13. preview_auto_schedule_reminders()    — dry-run reminder H-x
  14. auto_schedule_payment_reminders()    — INSERT reminder otomatis
  15. get_wa_config_safe()                 — return WA config tanpa api_key
  16. get_public_booking_details()         — detail booking publik (masked phone)
  17. get_public_booking_by_token()        — via booking_access_tokens
  18. check_mahram_room_conflicts()        — validasi kompatibilitas kamar mahram
  19. get_room_group_members()             — anggota grup kamar per departure
  20. hold_departure_seats()               — reservasi kursi sementara
  21. release_seat_hold()                  — lepas reservasi kursi
  22. cleanup_expired_seat_holds()         — cron job cleanup expired holds
  23. apply_stock_movement()               — update stok produk
  24. apply_store_order_sale_out()         — kurangi stok saat order terkonfirmasi
  25. apply_payment_to_schedule()          — update savings_schedules saat bayar
  26. generate_savings_schedule()          — buat jadwal cicilan tabungan
  27. convert_savings_to_booking()         — konversi tabungan ke booking
  28. apply_tier_discount()               — terapkan diskon loyalty tier
  29. award_badge()                        — berikan badge ke customer
  30. tg_badge_booking_confirmed()         — trigger badge saat booking confirmed
  31. tg_badge_first_payment()             — trigger badge saat pembayaran pertama
  32. tg_badge_document_verified()         — trigger badge saat dokumen terverifikasi
  33. tg_badge_savings_started()           — trigger badge saat mulai menabung
  34. tg_badge_loyalty_tier()              — trigger badge saat naik tier loyalty
  35. tg_auto_upgrade_agent_membership()   — auto-upgrade membership agen
  36. tg_notify_branch_manager_new_booking() — notif ke branch manager
  37. tg_notify_branch_manager_payment_pending() — notif payment pending
  38. tg_store_product_low_stock()         — alert stok menipis
  39. attribute_commission_to_parent()     — royalti komisi ke parent agent (10%)
  40. receive_purchase_order()             — terima PO, update stok
  41. approve_opname_session()             — approve stock opname
  42. submit_opname_session()              — submit opname untuk review
  43. reject_opname_session()              — reject opname session
  44. redeem_booking_access_token()        — redeem booking token publik
  45. delete_departure_safely()            — safe delete departure (cek bookings)
  46. get_active_seat_holds()              — list active seat holds
  47. get_active_exchange_rate()           — kurs mata uang aktif
  48. is_branch_manager_only()             — helper RBAC
  49. is_store_admin()                     — helper RBAC toko
  50. bulk_confirm_equipment_departure()   — konfirmasi massal perlengkapan
  51. sync_departure_hotel_city()          — auto-fill city di departure_hotels
  52. update_distribution_photo()          — update foto distribusi perlengkapan
  53. pgrst_watch_ddl()                    — PostgREST DDL watcher

══════════════════════════════════════════════════════════════════
TAHAP 17: SEED DATA
══════════════════════════════════════════════════════════════════
  role_permissions     — semua role × semua permission_keys
  menu_items           — sidebar navigation items
  company_settings     — key-value defaults (brand, contact, config)
  store_categories     — 6 kategori default (ibadah, ihram, koper, dll.)
  approval_configs     — threshold per tipe approval
  baggage_reference_items — berat barang referensi
  wa_feature_roadmap   — roadmap fitur WA (fase 1–6)
  document_templates   — template invoice, eticket, sertifikat, surat
  package_labels       — label: best_seller, early_bird, flash_sale, new, limited
  membership_plans     — paket membership agen
  training_modules     — modul pelatihan awal
  tier_benefits        — keuntungan per tier loyalty
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
> Nilai 'it' dan 'marketing' ditambahkan via DROP CONSTRAINT + ADD CONSTRAINT.

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
CREATE TYPE po_status AS ENUM ('draft','ordered','partial','received','cancelled');
CREATE TYPE stock_movement_type AS ENUM ('purchase_in','sale_out','adjustment','return_in','return_out','opname');
CREATE TYPE opname_status AS ENUM ('draft','submitted','approved','rejected');
```

---

## 6. KOLOM ALTER TABLE (Ditambah di Migrasi Lanjutan)

| Tabel | Kolom Ditambah | Dari Migrasi |
|-------|---------------|-------------|
| `branches` | signature_url, stamp_url, logo_url, letterhead_data | doc_sprint2 |
| `customers` | nomor_porsi_haji, embarkasi_kode, estimasi_keberangkatan_haji | fase16+ |
| `bookings` | booking_type, dp_amount, dp_percentage, savings_mode, payment_deadline, remaining_amount, total_pax, bagasi_kg_allowed | fase16–fase20 |
| `booking_passengers` | room_number_makkah, room_number_madinah, room_hotel_notes | 063 |
| `departures` | price_adult, price_child, price_infant, child_price_percent, infant_price_percent | fase29 |
| `packages` | child_price_percent, infant_price_percent, discount_amount, discount_percentage, booking_mode | fase29, 20260530 |
| `payment_deadline_reminders` | UNIQUE(booking_id, days_before) — ganti dari UNIQUE(booking_id) | fase30 |
| `whatsapp_config` | display_name, provider_config, webhook_secret, updated_by, last_tested_at, last_test_ok | fase31 |
| `departure_hotels` | city | 066 |
| `invoice_templates` | show_qr_code, qr_placement | fase26 |
| `payments` | transaction_id | fase23 |
| `equipment_distributions` | confirmed_by_jamaah, confirmed_at, confirmed_by_admin_id, distribution_photo_url, distribution_photo_uploaded_at, distribution_photo_uploaded_by | 065, 066 |
| `withdrawal_requests` | rejection_reason, processed_at, bank_details | 068 |
| `store_products` | (FK created_by → auth.users) | store_ecommerce |
| `user_roles` | (role tambah 'it', 'marketing' via constraint) | fase31 |

---

## 7. TABEL YANG ADA DI SOURCE CODE TAPI PERLU DIVERIFIKASI

Dari analisis `20260513` migrations, tabel-tabel ini ditemukan tapi perlu validasi apakah sudah ada di foundation:
- `savings_plans`, `savings_schedules`, `savings_deposits`
- `booking_access_tokens`, `booking_transfers`
- `departure_surveys`
- `exchange_rates`
- `jamaah_badges` (vs `customer_badges` di fase16)
- `loyalty_point_expiry`
- `store_purchase_orders` (vs `store_procurement_orders` di rencana lama)
- `store_opname_sessions` (vs `store_stock_opname`)
- `support_tickets`
- `pwa_install_events`
- `ibadah_progress`
- `jamaah_daily_attendance`

---

## 8. CATATAN PENTING UNTUK MIGRASI KE NEON/POSTGRESQL BIASA

### 8.1 Penggantian `auth.users` dan `auth.uid()`
```
Supabase:  auth.users, auth.uid()
Neon/PG:   public.users (tabel sendiri), current_setting('app.current_user_id')::UUID
           ATAU: gunakan JWT claims di middleware Express
```

### 8.2 RLS di Neon
Di Neon, RLS tetap didukung. Tapi `auth.uid()` harus diganti dengan:
```sql
current_setting('app.current_user_id', true)::UUID
```
Dan diset di setiap request via:
```sql
SET LOCAL app.current_user_id = '<user_uuid>';
```

### 8.3 Fungsi `has_role()`, `is_admin()`, `user_belongs_to_branch()`
Fungsi helper ini harus dibuat di database karena digunakan di RLS policies:
```sql
CREATE OR REPLACE FUNCTION has_role(uid UUID, r TEXT) RETURNS BOOLEAN ...
CREATE OR REPLACE FUNCTION is_admin(uid UUID) RETURNS BOOLEAN ...
CREATE OR REPLACE FUNCTION user_belongs_to_branch(uid UUID, bid UUID) RETURNS BOOLEAN ...
```

### 8.4 `SECURITY DEFINER` Functions
Semua fungsi SECURITY DEFINER harus di-set `search_path = public` secara eksplisit untuk keamanan.

### 8.5 Extensions yang Dibutuhkan
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";   -- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";    -- gen_random_uuid() (sudah ada di PG 13+)
```

---

## 9. STATISTIK FINAL

| Kategori | Jumlah Tabel |
|----------|-------------|
| Core Auth & RBAC | 4 |
| Organisasi | 12 |
| Paket & Keberangkatan | 16 |
| Booking & Pembayaran | 14 |
| Customer & Jamaah | 17 |
| Savings | 3 |
| Perlengkapan | 8 |
| Pelatihan Agen | 3 |
| Toko E-Commerce | 16 |
| WhatsApp & Komunikasi | 12 |
| Website & Marketing | 15 |
| Keuangan | 9 |
| HR & Karyawan | 4 |
| Operasional Lanjut | 17 |
| **TOTAL** | **≈ 150 tabel** |

| Kategori | Jumlah |
|----------|--------|
| Functions/RPC | ≈ 53 fungsi |
| Triggers | ≈ 35+ triggers |
| Tahap migrasi | 17 tahap |
| File SQL sumber | 74 file |

---

## 10. CHECKLIST SEBELUM APPLY MIGRASI FRESH

- [ ] Database kosong / fresh (DROP SCHEMA public CASCADE jika perlu reset)
- [ ] Extension `uuid-ossp` diaktifkan
- [ ] Extension `pgcrypto` diaktifkan (opsional, PG13+ sudah built-in)
- [ ] Jalankan sebagai superuser / database owner
- [ ] Buat tabel `users` pengganti `auth.users` jika tidak pakai Supabase
- [ ] Set helper functions `has_role()`, `is_admin()`, `user_belongs_to_branch()` sebelum RLS
- [ ] Jalankan TAHAP 0 → 17 secara berurutan
- [ ] Verifikasi: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';`
- [ ] Expected: ≥ 130 tabel di schema public
- [ ] Test RLS: pastikan user biasa tidak bisa akses data branch lain
- [ ] Test functions: jalankan `SELECT get_public_booking_details('<uuid>');`
- [ ] Seed data check: `SELECT COUNT(*) FROM menu_items;` — expect ≥ 30 rows

---

## 11. FILE OUTPUT YANG DIHASILKAN

```
supabase_clean_migration/
├── MASTER_FRESH_MIGRATION.sql    ← File utama (tahap 0–17, idempotent)
├── 01_extensions_helpers.sql     ← Extensions + update_updated_at + slugify
├── 02_standalone_tables.sql      ← Tahap 1–2 (no FK)
├── 03_branches_orgs.sql          ← Tahap 3–4 (branches + entitas)
├── 04_packages_departures.sql    ← Tahap 5–7 (paket + keberangkatan)
├── 05_bookings_payments.sql      ← Tahap 8–9 (bookings + sub-tabel)
├── 06_operations_finance.sql     ← Tahap 10 (operasional keberangkatan)
├── 07_customers_portal.sql       ← Tahap 11 (customer + portal jamaah)
├── 08_ecommerce.sql              ← Tahap 12 (toko e-commerce)
├── 09_agents_hr.sql              ← Tahap 13 (agen + HR + keuangan)
├── 10_communications.sql         ← Tahap 14 (WA + notifikasi)
├── 11_dashboard_monitoring.sql   ← Tahap 15 (dashboard + monitoring)
├── 12_functions_triggers.sql     ← Tahap 16 (semua fungsi + triggers)
└── 13_seed_data.sql              ← Tahap 17 (seed data)
```
