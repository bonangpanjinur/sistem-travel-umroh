# Vinstour Travel Portal — Analisis Repository Lengkap

> Dihasilkan dari analisis menyeluruh seluruh file SQL, migrasi database, skema ORM, dan source code.

---

## Daftar Isi

1. [File SQL Ditemukan](#1-file-sql-ditemukan)
2. [Migration Database](#2-migration-database)
3. [Query SQL di Source Code](#3-query-sql-di-source-code)
4. [Skema ORM (Drizzle)](#4-skema-orm-drizzle)
5. [Daftar Tabel Lengkap](#5-daftar-tabel-lengkap)
6. [View & Fungsi RPC](#6-view--fungsi-rpc)
7. [Trigger](#7-trigger)
8. [Laporan Tabel Duplikat / Overlapping](#8-laporan-tabel-duplikat--overlapping)

---

## 1. File SQL Ditemukan

### Lokasi & Jumlah

| Direktori | Jumlah File | Keterangan |
|---|---|---|
| `supabase/migrations/` | ~55 file | Migrasi utama (fase0–fase32 + store + patches) |
| `sql/migrations/` | ~90 file | Salinan/kopi migrasi fase lanjutan (001–086) |
| `sql/` | 3 file | `MASTER_FRESH_INSTALL.sql`, `CONSOLIDATED_fase1-20.sql`, `PATCHES_ONLY.sql` |
| `supabase_clean_migration/` | 12 file | Versi bersih terkonsolidasi (00–11 + COMPLETE_SETUP.sql) |
| `artifacts/api-server/src/sql/` | ~60 file | SQL artefak API server lanjutan (sprint 1–41+) |
| `artifacts/umrah-haji/src/lib/migrations/` | 3 file | Migrasi fitur HR, Operational, WhatsApp |
| `artifacts/umrah-haji/supabase/migrations/` | 8 file | Migrasi sub-artefak (portal jamaah, finance, dll) |
| `migrations/` | 2 file | `keuangan-auto-journal-triggers.sql`, `keuangan-fase1-accounting.sql` |
| `.migration-backup/` | 1 file | Backup migrasi dashboard-access-config |

**Total: ±234 file SQL**

---

## 2. Migration Database

### Urutan Eksekusi Resmi (supabase/migrations/)

```
fase0_foundation.sql              → Core: profiles, branches, agents, packages, bookings, dll
consolidated_all.sql              → Konsolidasi fase 1–20 (website_settings, payments, dll)
consolidated_fase_13_14_15.sql    → Leads, manasik, reviews
store_ecommerce.sql               → E-commerce: store_*
store_product_reviews.sql         → store_product_reviews
doc_sprint2_branch_branding_templates.sql
fase16_new_tables.sql             → SOS, approval, equipment, marketing, dll
fase17_remaining_tables.sql       → vendor_contracts, training_modules, dll
fase18_core_settings.sql          → app_settings, airlines, dll
fase19_branch_kpi_targets.sql     → branch KPI targets
fase20_webhooks_push.sql          → webhooks, push subscriptions
fase20_chat_bubble_color.sql
fase21_integration_fixes.sql      → customer_notifications, attendance, room_occupants
fase22_muthawif_evaluations.sql   → muthawif_evaluations
fase23_payments_transaction_id.sql
fase24_payment_sync_trigger.sql
fase25_backfill_booking_payment_totals.sql
fase26_public_booking_rpc_qr_settings.sql
fase27_booking_line_items_rls_fixes.sql → booking_line_items + RLS fix
fase28_package_financials.sql     → departure_cost_items, departure_expenses, dll
fase29_passenger_pricing.sql      → Kolom price_adult, child/infant %
fase30_auto_schedule_reminders.sql
fase31_wa_multiprovider.sql       → wa_feature_roadmap + enum role 'it'
fase32_wa_broadcast_campaigns.sql → wa_broadcast_campaigns, wa_broadcast_logs
20260517…create_web_vitals_metrics.sql
20260530…add_package_discount.sql
20260531…fix_payment_deadline_reminders.sql
20260531…fix_package_labels.sql
20260602…, 20260603…              → Patch kecil
```

### Direktori `sql/migrations/` (Salinan + Lanjutan)

File 001–086 mencakup semua fase di atas **plus** fitur lanjutan:

| File | Fitur |
|---|---|
| `039_journal_entries.sql` | Journal Entries (double-entry) |
| `040_accounting_tables.sql` | COA, ledger akuntansi |
| `041_auto_journal_triggers.sql` | Trigger auto-jurnal dari payments |
| `043_booking_installment_schedules.sql` | Jadwal cicilan booking |
| `046_agent_commission_tiers.sql` | Tier komisi agen |
| `047_rbac_audit_trail.sql` | RBAC audit trail |
| `048_booking_seat_lock.sql` | Seat lock booking |
| `049_face_descriptor_column.sql` | Face descriptor (biometrik) |
| `069_sdm_sprint1_disciplinary_career.sql` | Disiplin & karier karyawan |
| `070_payroll_slips_ess.sql` | Slip gaji & ESS |
| `073_document_numbering.sql` | Penomoran dokumen otomatis |
| `081_waiting_list.sql` | Waiting list keberangkatan |
| `085_departure_expense_approval.sql` | Approval pengeluaran departure |
| `086_ar_reminder_log.sql` | Reminder log AR |

---

## 3. Query SQL di Source Code

### ORM / Client Supabase (Direct Query via `supabase.from()`)

File TypeScript/TSX yang menggunakan Supabase client secara langsung:

| Kategori | File |
|---|---|
| **Equipment** | `features/equipment/queries.ts` |
| **Services** | `services/packageChangeRulesService.ts`, `services/guestCheckoutService.ts` |
| **Komponen Publik** | `components/public/PublicPackageReviews.tsx`, `ChatWidget.tsx`, `AnnouncementBar.tsx` |
| **Tour Leader** | `pages/tour-leader/TourLeaderSubgroups.tsx`, `TourLeaderProgram.tsx`, `TourLeaderMap.tsx`, `TourLeaderDashboard.tsx`, `TourLeaderBroadcast.tsx`, `TourLeaderAttendance.tsx` |
| **Packages** | `components/packages/PackageBookingForm*.tsx` (3 varian) |
| **Operational** | `components/operational/equipment/VariantManagerDialog.tsx`, `ReturnTab.tsx`, dll |
| **Savings** | `pages/savings/SavingsSuccess.tsx`, `SavingsRegister.tsx`, dll |
| **Edge Functions** | `supabase/functions/verify-2fa-otp/index.ts`, `send-push/index.ts` |

### Pola Query yang Digunakan

```typescript
// Contoh pola utama:
supabase.from('table').select('...')
supabase.from('table').insert({...})
supabase.from('table').update({...}).eq('id', id)
supabase.rpc('function_name', { params })
```

---

## 4. Skema ORM (Drizzle)

**File:** `lib/db/src/schema/index.ts`  
**Dialek:** PostgreSQL  
**Config:** `lib/db/drizzle.config.ts` — menggunakan `DATABASE_URL` dari env

### Tabel yang Didefinisikan di Drizzle

| Tabel Drizzle | Nama Tabel DB | Kolom Kunci |
|---|---|---|
| `cancellationRules` | `cancellation_rules` | id, name, is_default, sections (JSONB) |
| `packages` | `packages` | id, branch_id, name, type, price, price_double/triple/quad, duration_days, airline, hotel_mecca/medina, includes/excludes (JSONB), quota, fee_branch |
| `departures` | `departures` | id, package_id, departure_date, return_date, quota, available_seats, status, muthawif_id |
| `pushSubscriptions` | `push_subscriptions` | id, customer_id, endpoint (UNIQUE), p256dh, auth_key, muthawif_id, user_id, role, branch_id, agent_id |
| `websiteSettings` | `website_settings` | id, agent_id, branch_id, company_name, logo_url, active_theme, primary/accent/fg/bg colors, fonts, footer_*, footer_links/custom_sections (JSONB) |
| `leads` | `leads` | id, name, phone, email, package_id, notes, source, status, branch_id, agent_id |
| `apiKeys` | `api_keys` | id, key_hash, name, permissions (JSONB), is_active, last_used_at |
| `customers` | `customers` | id, user_id, branch_id, agent_id, full_name, phone, email, address, city, province, country, postal_code, date_of_birth, place_of_birth, gender, national_id, passport_number, passport_expiry, photo_url, is_tour_leader, is_active |
| `bookings` | `bookings` | id, departure_id, customer_id, agent_id, branch_id, sales_id, booking_code, booking_status, room_type, total_pax, adult/child/infant_count, base_price, total_price, discount_amount, addons_price, paid_amount, remaining_amount, payment_status, payment_deadline, currency, room_number |
| `payments` | `payments` | id, booking_id, payment_code, amount, status, payment_method, bank_name, account_name, account_number, proof_url, verified_at, verified_by, payment_date |
| `appSettings` | `app_settings` | id, key (UNIQUE), value |
| `faqs` | `faqs` | id, question, answer, category, sort_order, is_published |
| `chatbotLogs` | `chatbot_logs` | id, session_id, message, answer, source, user_id, customer_id, channel, rating, is_unanswered |
| `waTemplates` | `wa_templates` | id, code (UNIQUE), name, message_template, variables (JSONB), is_active |
| `bookingPassengers` | `booking_passengers` | id, booking_id, customer_id, is_main_passenger, passenger_type, room_number, room_preference, roommate_id, special_requests |
| `refunds` | `refunds` | id, booking_id, customer_id, amount, refund_method, account_info, reason, status, created_by, processed_at |
| `waSendLogs` | `wa_send_logs` | id, recipient_phone, recipient_name, message_content, status, error_message, sent_at, template_code, departure_id, message_id |

---

## 5. Daftar Tabel Lengkap

> **Total tabel unik: ~120+**. Dikelompokkan berdasarkan domain fungsional.

---

### A. AUTH & AKSES (RBAC)

#### `profiles`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | FK → auth.users(id) ON DELETE CASCADE |
| full_name | TEXT | |
| avatar_url | TEXT | |
| phone | TEXT | |
| email | TEXT | |
| role | TEXT | Default 'customer' |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**Trigger:** `set_profiles_updated_at`, `on_auth_user_created` (pada auth.users)

---

#### `user_roles`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| user_id | UUID | FK → auth.users(id) ON DELETE CASCADE |
| role | TEXT | CHECK: super_admin, owner, admin, branch_manager, finance, operational, sales, marketing, hr, equipment, agent, sub_agent, customer, jamaah, visa_officer, it |
| branch_id | UUID | (nullable, tidak FK) |
| created_at | TIMESTAMPTZ | |

**Index:** `idx_user_roles_user_id`, `idx_user_roles_role`  
**Unique:** (user_id, role)

---

#### `role_permissions`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| role | TEXT | |
| permission_key | TEXT | |
| is_enabled | BOOLEAN | Default TRUE |

**Index:** `idx_role_perms_role`  
**Unique:** (role, permission_key)

---

#### `menu_items`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| key | TEXT UNIQUE | |
| label | TEXT | |
| path | TEXT | |
| icon | TEXT | |
| group_name | TEXT | |
| sort_order | INTEGER | |
| required_permission | TEXT | |
| is_visible | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

**Index:** `idx_menu_items_sort_order`, `idx_menu_items_is_visible`

---

#### `dashboard_access_config`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| role | TEXT UNIQUE | |
| enabled_modules | TEXT[] | |
| disabled_modules | TEXT[] | |
| default_dashboard | TEXT | |
| is_active | BOOLEAN | |
| updated_by | UUID | FK → auth.users |
| created_at, updated_at | TIMESTAMPTZ | |

**Trigger:** `set_dashboard_access_config_updated_at`

---

#### `dashboard_access_audit_log`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| role | TEXT | |
| action | TEXT | |
| module_key | TEXT | |
| old_value, new_value | TEXT | |
| changed_by | UUID | FK → auth.users ON DELETE CASCADE |
| changed_at | TIMESTAMPTZ | |
| metadata | JSONB | |

---

#### `api_keys`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| key_hash | TEXT | |
| name | TEXT | |
| permissions | JSONB | |
| is_active | BOOLEAN | |
| last_used_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

---

### B. ORGANISASI

#### `branches`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| code | TEXT UNIQUE | |
| address, city, province | TEXT | |
| phone, email | TEXT | |
| manager_user_id | UUID | FK → auth.users |
| is_active | BOOLEAN | |
| slug | TEXT UNIQUE | |
| website_description | TEXT | |
| website_banner_url | TEXT | |
| website_gallery | JSONB | |
| website_testimonials | JSONB | |
| featured_package_ids | JSONB | |
| view_count | INTEGER | |
| created_at, updated_at | TIMESTAMPTZ | |

**Index:** `idx_branches_code`, `idx_branches_is_active`, `idx_branches_slug`  
**Trigger:** `set_branches_updated_at`

---

#### `agents`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| user_id | UUID | FK → auth.users |
| branch_id | UUID | FK → branches |
| parent_agent_id | UUID | FK → agents (self-referential) |
| company_name | TEXT | |
| agent_code | TEXT UNIQUE | |
| contact_name, phone, email, address | TEXT | |
| commission_rate | NUMERIC(5,2) | |
| is_active | BOOLEAN | |
| slug | TEXT UNIQUE | |
| featured_package_ids | JSONB | |
| website_bio | TEXT | |
| level | INTEGER | Default 1 |
| created_at, updated_at | TIMESTAMPTZ | |

**Index:** `idx_agents_user_id`, `idx_agents_branch_id`, `idx_agents_is_active`, `idx_agents_slug`  
**Trigger:** `set_agents_updated_at`

---

#### `employees`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| user_id | UUID | FK → auth.users |
| branch_id | UUID | FK → branches |
| full_name | TEXT | |
| employee_code | TEXT UNIQUE | |
| position, department | TEXT | |
| phone, email | TEXT | |
| join_date | DATE | |
| status | TEXT | CHECK: active, inactive, resigned |
| salary | NUMERIC(15,2) | |
| photo_url | TEXT | |
| created_at, updated_at | TIMESTAMPTZ | |

**Index:** `idx_employees_user_id`, `idx_employees_branch_id`, `idx_employees_status`  
**Trigger:** `set_employees_updated_at`

---

#### `muthawifs`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| phone, email | TEXT | |
| branch_id | UUID | FK → branches |
| specialization | TEXT | |
| languages | TEXT[] | |
| is_active | BOOLEAN | |
| photo_url, bio | TEXT | |
| rating | NUMERIC(3,2) | |
| total_reviews | INTEGER | |
| created_at, updated_at | TIMESTAMPTZ | |

**Trigger:** `set_muthawifs_updated_at`

---

### C. PRODUK & KEBERANGKATAN

#### `packages`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| branch_id | UUID | FK → branches |
| cancellation_rule_id | UUID | FK → cancellation_rules |
| name | TEXT | |
| type | TEXT | CHECK: umroh, haji, haji_plus, wisata |
| description, highlights | TEXT | |
| price | NUMERIC(15,2) | |
| price_double/triple/quad | NUMERIC(15,2) | |
| duration_days | INTEGER | Default 9 |
| departure_city, airline | TEXT | |
| hotel_mecca, hotel_medina | TEXT | |
| includes, excludes | JSONB | |
| terms | TEXT | |
| is_active | BOOLEAN | |
| photo_url | TEXT | |
| gallery_urls | JSONB | |
| quota | INTEGER | Default 45 |
| fee_branch | NUMERIC(5,2) | |
| child_price_percent | NUMERIC | Default 75 (fase29) |
| infant_price_percent | NUMERIC | Default 10 (fase29) |
| created_at, updated_at | TIMESTAMPTZ | |

**Index:** `idx_packages_branch_id`, `idx_packages_type`, `idx_packages_is_active`  
**Trigger:** `set_packages_updated_at`

---

#### `departures`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| package_id | UUID NOT NULL | FK → packages ON DELETE CASCADE |
| departure_date | DATE NOT NULL | |
| return_date | DATE | |
| quota | INTEGER | Default 45 |
| available_seats | INTEGER | Default 45 |
| status | TEXT | CHECK: open, closed, full, cancelled |
| notes | TEXT | |
| muthawif_id | UUID | FK → muthawifs (fase81) |
| price_adult | NUMERIC | (fase29) |
| price_child, price_infant | NUMERIC | |
| child_price_percent | NUMERIC | Default 75 (fase29) |
| infant_price_percent | NUMERIC | Default 10 (fase29) |
| created_at, updated_at | TIMESTAMPTZ | |

**Index:** `idx_departures_package_id`, `idx_departures_departure_date`, `idx_departures_status`  
**Trigger:** `set_departures_updated_at`

---

#### `hotels`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| stars | INTEGER | CHECK 1–7 |
| city, country | TEXT | |
| address, phone, email | TEXT | |
| description, photo_url | TEXT | |
| is_active | BOOLEAN | |
| created_at, updated_at | TIMESTAMPTZ | |

**Index:** `idx_hotels_city`, `idx_hotels_is_active`  
**Trigger:** `set_hotels_updated_at`

---

#### `airlines`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| iata_code | TEXT | UNIQUE |
| country | TEXT | |
| is_active | BOOLEAN | |
| logo_url | TEXT | |
| created_at | TIMESTAMPTZ | |

_(Didefinisikan di fase18_core_settings.sql, direferensikan di fase28)_

---

#### `vendors`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| type | TEXT | CHECK: maskapai, hotel, bus, katering, asuransi, visa, lainnya |
| contact_name, phone, email, address | TEXT | |
| npwp, bank_account, bank_name | TEXT | |
| is_active | BOOLEAN | |
| notes | TEXT | |
| created_at, updated_at | TIMESTAMPTZ | |

**Trigger:** `set_vendors_updated_at`

---

#### `cancellation_rules`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| is_default | BOOLEAN | |
| sections | JSONB | |
| created_at, updated_at | TIMESTAMPTZ | |

---

### D. PELANGGAN & BOOKING

#### `customers`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| user_id | UUID | FK → auth.users |
| branch_id | UUID | FK → branches |
| full_name | TEXT NOT NULL | |
| nik | TEXT | |
| gender | TEXT | CHECK: L, P |
| phone, email | TEXT | |
| address, city, province, postal_code | TEXT | |
| birth_date | DATE | |
| birth_place | TEXT | |
| passport_number | TEXT | |
| passport_expiry | DATE | |
| passport_issued | TEXT | |
| photo_url | TEXT | |
| is_active | BOOLEAN | |
| nomor_porsi_haji | TEXT | |
| embarkasi_kode | TEXT | |
| estimasi_keberangkatan_haji | INTEGER | |
| created_at, updated_at | TIMESTAMPTZ | |

**Index:** `idx_customers_user_id`, `idx_customers_branch_id`, `idx_customers_is_active`  
**Trigger:** `set_customers_updated_at`

---

#### `bookings`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| customer_id | UUID NOT NULL | FK → customers ON DELETE RESTRICT |
| departure_id | UUID | FK → departures |
| agent_id | UUID | FK → agents |
| branch_id | UUID | FK → branches |
| sales_id | UUID | FK → auth.users |
| booking_code | TEXT UNIQUE NOT NULL | |
| booking_status | TEXT | CHECK: pending, confirmed, cancelled, completed |
| status | TEXT | (alias/duplikasi booking_status) |
| room_type | TEXT | CHECK: double, triple, quad |
| total_pax | INTEGER | |
| adult_count, child_count, infant_count | INTEGER | |
| base_price | NUMERIC(15,2) | |
| total_price | NUMERIC(15,2) | |
| discount_amount | NUMERIC(15,2) | |
| addons_price | NUMERIC(15,2) | |
| paid_amount | NUMERIC(15,2) | |
| remaining_amount | NUMERIC(15,2) | |
| payment_status | TEXT | CHECK: unpaid, partial, paid, refunded |
| payment_deadline | TIMESTAMPTZ | |
| currency | TEXT | Default IDR |
| notes | TEXT | |
| referral_source | TEXT | CHECK: direct, agent_website, branch_website, referral, whatsapp, instagram, facebook, other |
| bagasi_kg_allowed | INTEGER | Default 23 |
| room_number | TEXT | (fase21) |
| created_at, updated_at | TIMESTAMPTZ | |

**Index:** `idx_bookings_customer_id`, `idx_bookings_departure_id`, `idx_bookings_agent_id`, `idx_bookings_status`, `idx_bookings_payment_status`, `idx_bookings_booking_code`  
**Trigger:** `set_bookings_updated_at`

---

#### `booking_passengers`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| booking_id | UUID NOT NULL | FK → bookings ON DELETE CASCADE |
| customer_id | UUID NOT NULL | FK → customers ON DELETE RESTRICT |
| is_main_passenger | BOOLEAN | |
| passenger_type | TEXT | CHECK: dewasa, lansia, anak, mahram |
| room_preference, room_number | TEXT | |
| room_group_id, family_group_id | UUID | |
| checkin_status | TEXT | |
| checkin_time | TIMESTAMPTZ | |
| checkin_notes | TEXT | |
| roommate_id | UUID | |
| special_requests | TEXT | |
| created_at | TIMESTAMPTZ | |

**Index:** `idx_booking_passengers_booking_id`, `idx_booking_passengers_customer_id`

---

#### `booking_line_items`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| booking_id | UUID NOT NULL | FK → bookings ON DELETE CASCADE |
| passenger_id | UUID | |
| item_type | TEXT | Default 'service' |
| description | TEXT | |
| quantity, unit_price, total_price | NUMERIC | |
| reference_id | UUID | |
| created_at, updated_at | TIMESTAMPTZ | |

**Index:** `idx_booking_line_items_booking_id`, `idx_booking_line_items_passenger_id`

---

#### `booking_status_history`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| booking_id | UUID | FK → bookings |
| old_status, new_status | TEXT | |
| changed_by | UUID | FK → auth.users |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

---

#### `payments`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| booking_id | UUID NOT NULL | FK → bookings |
| payment_code | TEXT NOT NULL | |
| amount | NUMERIC(15,2) | |
| status | TEXT | Check: pending, verified, rejected |
| payment_method | TEXT | |
| bank_name, account_name, account_number | TEXT | |
| proof_url | TEXT | |
| notes | TEXT | |
| verified_at | TIMESTAMPTZ | |
| verified_by | UUID | FK → auth.users |
| payment_date | DATE | |
| transaction_id | TEXT | (fase23) |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `refunds`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| booking_id | UUID NOT NULL | FK → bookings |
| customer_id | UUID | FK → customers |
| amount | NUMERIC(15,2) | |
| refund_method | TEXT | Default 'transfer_bank' |
| account_info | TEXT | |
| reason | TEXT | |
| status | TEXT | |
| created_by | UUID | |
| processed_at | TIMESTAMPTZ | |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `payment_deadline_reminders`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| booking_id | UUID | FK → bookings |
| booking_code | TEXT | |
| phone, full_name | TEXT | |
| payment_deadline | DATE | |
| remaining_amount | NUMERIC | |
| days_before | INTEGER | |
| status | TEXT | Check: pending, sent, cancelled |
| created_at, updated_at | TIMESTAMPTZ | |

**Unique:** (booking_id, days_before) — fase30

---

#### `booking_installment_schedules`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| booking_id | UUID | FK → bookings |
| installment_number | INTEGER | |
| amount | NUMERIC | |
| due_date | DATE | |
| status | TEXT | |
| paid_at | TIMESTAMPTZ | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

---

#### `room_assignments`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| departure_id | UUID | FK → departures |
| room_number | TEXT | |
| room_type | TEXT | CHECK: double, triple, quad |
| floor | INTEGER | |
| capacity | INTEGER | |
| hotel_name | TEXT | |
| hotel_location | TEXT | CHECK: mecca, medina |
| notes | TEXT | |
| created_at, updated_at | TIMESTAMPTZ | |

**Index:** `idx_room_assignments_departure_id`, `idx_room_assignments_room_type`  
**Trigger:** `set_room_assignments_updated_at`

---

#### `room_occupants`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| room_assignment_id | UUID NOT NULL | FK → room_assignments ON DELETE CASCADE |
| customer_id | UUID NOT NULL | FK → customers ON DELETE CASCADE |
| bed_number | INT | |
| created_at | TIMESTAMPTZ | |

**Unique:** (room_assignment_id, customer_id)

---

#### `customer_documents`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| customer_id | UUID | FK → customers |
| document_type_id | UUID | FK → document_types |
| file_url | TEXT | |
| status | TEXT | Check: pending, approved, rejected |
| notes | TEXT | |
| uploaded_at | TIMESTAMPTZ | |
| reviewed_by | UUID | |
| reviewed_at | TIMESTAMPTZ | |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `customer_mahrams`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| customer_id | UUID | FK → customers |
| mahram_customer_id | UUID | FK → customers |
| relationship | TEXT | |
| created_at | TIMESTAMPTZ | |

---

### E. VISA & DOKUMEN

#### `visa_applications`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| customer_id | UUID NOT NULL | FK → customers |
| booking_id | UUID | FK → bookings |
| status | TEXT | CHECK: pending, submitted, processing, approved, rejected, expired |
| applied_date, approved_date | DATE | |
| rejection_reason | TEXT | |
| visa_number, passport_number | TEXT | |
| notes | TEXT | |
| created_at, updated_at | TIMESTAMPTZ | |

**Index:** `idx_visa_apps_customer_id`, `idx_visa_apps_booking_id`, `idx_visa_apps_status`  
**Trigger:** `set_visa_apps_updated_at`

---

#### `visa_status_logs` ⚠️ DUPLIKAT
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| visa_id | UUID | FK → visa_applications (hanya di fase16) |
| customer_id | UUID | FK → customers |
| old_status, new_status | TEXT | |
| notes | TEXT | |
| changed_by | UUID | FK → auth.users (fase16) / profiles (fase21) |
| changed_by_role | TEXT | (hanya di fase16) |
| created_at | TIMESTAMPTZ | |

**⚠️ Didefinisikan di dua tempat:** `fase16_new_tables.sql` (dengan FK ke visa_applications) dan `fase21_integration_fixes.sql` (tanpa visa_id FK, changed_by FK ke profiles). Pakai `IF NOT EXISTS` sehingga fase16 menang.

---

#### `document_types`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| description | TEXT | |
| is_required | BOOLEAN | |
| category | TEXT | CHECK: identitas, perjalanan, kesehatan, keuangan, umum |
| created_at | TIMESTAMPTZ | |

---

#### `booking_document_logs`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| booking_id | UUID NOT NULL | FK → bookings |
| customer_id | UUID | FK → customers |
| doc_type | TEXT | |
| doc_label | TEXT | |
| file_url | TEXT | |
| generated_by | UUID | FK → auth.users |
| generated_at | TIMESTAMPTZ | |
| notes | TEXT | |

---

### F. KEUANGAN

#### `transactions`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| branch_id | UUID | FK → branches |
| booking_id | UUID | FK → bookings |
| description | TEXT | |
| type | TEXT | CHECK: income, expense |
| category | TEXT | |
| amount | NUMERIC(20,2) | |
| transaction_date | DATE | |
| status | TEXT | CHECK: pending, completed, failed, cancelled |
| reference_no | TEXT | |
| created_by, approved_by | UUID | FK → auth.users |
| approved_at | TIMESTAMPTZ | |
| notes | TEXT | |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `expenses`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| branch_id | UUID | FK → branches |
| departure_id | UUID | FK → departures |
| category | TEXT | |
| description | TEXT | |
| amount | NUMERIC(20,2) | |
| expense_date | DATE | |
| receipt_url | TEXT | |
| status | TEXT | CHECK: pending, approved, rejected, paid |
| submitted_by, approved_by | UUID | FK → auth.users |
| approved_at | TIMESTAMPTZ | |
| notes | TEXT | |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `financial_summary`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| period_type | TEXT | CHECK: daily, weekly, monthly, yearly |
| period_start, period_end | DATE | |
| branch_id | UUID | FK → branches |
| total_revenue, total_expenses, total_outstanding | NUMERIC(20,2) | |
| net_profit | NUMERIC | GENERATED ALWAYS AS (revenue − expenses) |
| created_at | TIMESTAMPTZ | |

**Unique:** (branch_id, period_type, period_start)

---

#### `departure_cost_items` (HPP)
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| departure_id | UUID NOT NULL | FK → departures |
| category | TEXT | Check: airline, hotel, land_transport, visa, handling, muthawif, equipment, manasik, insurance, document, marketing, pic_fee, overhead, other |
| sub_category, location | TEXT | |
| hotel_id | UUID | FK → hotels |
| nights | INTEGER | |
| room_type | TEXT | |
| check_in_date, check_out_date | DATE | |
| airline_id | UUID | FK → airlines |
| flight_route, flight_class | TEXT | |
| description | TEXT | |
| unit | TEXT | Check: per_pax, per_seat, per_room, per_night, fixed |
| quantity, unit_cost | NUMERIC | |
| currency | TEXT | |
| exchange_rate | NUMERIC | |
| total_cost_idr | NUMERIC | GENERATED AS (quantity * unit_cost * exchange_rate) |
| sort_order | INTEGER | |
| notes | TEXT | |
| reference_id | UUID | |
| created_by | UUID | FK → profiles |
| created_at, updated_at | TIMESTAMPTZ | |

**Index:** departure_id, category, location

---

#### `departure_expenses`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| departure_id | UUID NOT NULL | FK → departures |
| booking_id | UUID | FK → bookings |
| expense_date | DATE | |
| category | TEXT | airline_ticket, hotel, transport, visa_fee, guide, meals, tips, souvenir, printing, refund, penalty, medical, operational, other |
| location, description | TEXT | |
| amount | NUMERIC | |
| currency | TEXT | |
| exchange_rate | NUMERIC | |
| amount_idr | NUMERIC | GENERATED AS (amount * exchange_rate) |
| payment_method | TEXT | |
| receipt_url | TEXT | |
| notes | TEXT | |
| approved_by, created_by | UUID | FK → profiles |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `departure_other_revenues`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| departure_id | UUID NOT NULL | FK → departures |
| booking_id | UUID | FK → bookings |
| revenue_date | DATE | |
| category | TEXT | room_upgrade, extra_night, addon_service, visa_extra, transport_extra, insurance_extra, equipment_extra, penalty_fee, other |
| location, description | TEXT | |
| amount | NUMERIC | |
| currency | TEXT | |
| exchange_rate | NUMERIC | |
| amount_idr | NUMERIC | GENERATED |
| notes | TEXT | |
| created_by | UUID | FK → profiles |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `departure_financial_summary`
| Kolom | Tipe | Keterangan |
|---|---|---|
| departure_id | UUID PK | FK → departures |
| quota, pax_confirmed, pax_cancelled | INTEGER | |
| revenue_gross, revenue_paid, revenue_outstanding, revenue_refunded | NUMERIC | |
| hpp_total, expense_total, other_revenue_total | NUMERIC | |
| gross_profit | NUMERIC | GENERATED AS (revenue_gross − hpp_total) |
| net_profit | NUMERIC | GENERATED AS (revenue_gross + other_rev − hpp − expense) |
| gross_margin_pct | NUMERIC | GENERATED |
| last_calculated_at, updated_at | TIMESTAMPTZ | |

---

#### `departure_budgets`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| departure_id | UUID NOT NULL | FK → departures |
| category | TEXT | hotel, tiket, visa, katering, transportasi, handling, manasik, perlengkapan, lainnya |
| description | TEXT | |
| budgeted_amount | NUMERIC(15,2) | |
| pax_count | INTEGER | |
| per_pax_amount | NUMERIC(15,2) | |
| notes | TEXT | |
| created_by | UUID | FK → auth.users |
| created_at, updated_at | TIMESTAMPTZ | |

**Unique:** (departure_id, category)

---

#### `dashboard_stats`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| branch_id | UUID | FK → branches |
| stat_date | DATE | |
| total_revenue, total_outstanding | NUMERIC(20,2) | |
| total_bookings, total_pax, new_leads, new_customers | INTEGER | |
| created_at, updated_at | TIMESTAMPTZ | |

**Unique:** (branch_id, stat_date)

---

### G. KOMISI & AGEN

#### `agent_override_commissions`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| booking_id | UUID NOT NULL | FK → bookings |
| agent_id | UUID NOT NULL | FK → agents |
| sub_agent_id | UUID NOT NULL | FK → agents |
| override_percentage | NUMERIC(5,2) | |
| override_amount | NUMERIC(15,2) | |
| status | TEXT | CHECK: pending, approved, paid, cancelled |
| paid_at | TIMESTAMPTZ | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

---

#### `approval_requests`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| type | TEXT | CHECK: refund, discount, cancellation, vendor_invoice |
| reference_id | UUID | |
| reference_code | TEXT | |
| requester_id | UUID NOT NULL | FK → auth.users |
| requester_role | TEXT | |
| amount | NUMERIC(15,2) | |
| percentage | NUMERIC(5,2) | |
| reason | TEXT | |
| status | TEXT | CHECK: pending, approved, rejected, escalated, cancelled |
| current_level, max_level | SMALLINT | |
| branch_id | UUID | FK → branches |
| resolved_at | TIMESTAMPTZ | |
| resolved_by | UUID | FK → auth.users |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `approval_actions`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| request_id | UUID NOT NULL | FK → approval_requests ON DELETE CASCADE |
| actor_id | UUID NOT NULL | FK → auth.users |
| actor_role | TEXT | |
| action | TEXT | CHECK: approved, rejected, escalated, noted |
| level | SMALLINT | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

---

#### `approval_configs`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| type | TEXT | CHECK: refund, discount, cancellation, vendor_invoice |
| level | SMALLINT | |
| required_role | TEXT | |
| amount_threshold | NUMERIC(15,2) | |
| percentage_threshold | NUMERIC(5,2) | |
| auto_approve_below | NUMERIC(15,2) | |
| is_active | BOOLEAN | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

**Unique:** (type, level, required_role)

---

### H. SDM (HR)

#### `sales_targets`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| user_id | UUID NOT NULL | FK → auth.users |
| branch_id | UUID | FK → branches |
| role | TEXT | |
| period_type | TEXT | CHECK: weekly, monthly, quarterly, yearly |
| period_start, period_end | DATE | |
| target_amount | NUMERIC(20,2) | |
| target_bookings, target_leads | INTEGER | |
| achieved_amount | NUMERIC(20,2) | |
| achieved_bookings | INTEGER | |
| notes | TEXT | |
| created_by | UUID | FK → auth.users |
| created_at, updated_at | TIMESTAMPTZ | |

**Unique:** (user_id, period_type, period_start)

---

#### `vendor_contracts`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| vendor_id | UUID | FK → vendors |
| contract_number | TEXT | |
| service_type | TEXT | |
| start_date, end_date | DATE | |
| value | NUMERIC(15,2) | |
| currency | TEXT | |
| payment_terms | TEXT | |
| auto_renew | BOOLEAN | |
| document_url | TEXT | |
| notes | TEXT | |
| status | TEXT | CHECK: draft, active, expired, terminated |
| created_by | UUID | FK → auth.users |
| branch_id | UUID | FK → branches |
| created_at, updated_at | TIMESTAMPTZ | |

---

### I. OPERASIONAL

#### `equipment_distributions`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| customer_id | UUID NOT NULL | FK → customers |
| departure_id | UUID | FK → departures |
| item_name | TEXT | |
| quantity | INTEGER | |
| distributed_at | TIMESTAMPTZ | |
| distributed_by | UUID | FK → auth.users |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

---

#### `equipment`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| branch_id | UUID | FK → branches |
| name | TEXT | |
| category | TEXT | |
| description | TEXT | |
| status | TEXT | CHECK: available, in_use, maintenance, damaged, retired |
| condition | TEXT | CHECK: new, good, fair, damaged |
| quantity | INTEGER | |
| serial_no, purchase_date | TEXT/DATE | |
| purchase_price | NUMERIC(15,2) | |
| notes | TEXT | |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `equipment_maintenance`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| equipment_id | UUID | FK → equipment |
| equipment_name | TEXT | |
| maintenance_type | TEXT | CHECK: preventive, corrective, calibration, inspection, other |
| maintenance_date | DATE | |
| performed_by | TEXT | |
| cost | NUMERIC(15,2) | |
| status | TEXT | CHECK: scheduled, in_progress, completed, cancelled |
| notes | TEXT | |
| next_maintenance_date | DATE | |
| created_by | UUID | FK → auth.users |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `equipment_damage`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| equipment_id | UUID | FK → equipment |
| equipment_name | TEXT | |
| reported_by | UUID | FK → auth.users |
| damage_date | DATE | |
| description | TEXT | |
| severity | TEXT | CHECK: low, medium, high, critical |
| status | TEXT | CHECK: reported, in_progress, repaired, written_off |
| repair_cost | NUMERIC(15,2) | |
| repaired_at | TIMESTAMPTZ | |
| notes | TEXT | |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `sos_alerts` ⚠️ DUPLIKAT
Terdefinisi di **dua tempat** dengan skema berbeda:

**Versi fase0_foundation.sql:**
| Kolom | Tipe |
|---|---|
| customer_id | FK → customers NOT NULL |
| departure_id | FK → departures |
| message | TEXT NOT NULL |
| latitude, longitude | NUMERIC(10,6) |
| location | TEXT |
| status | CHECK: pending, responded, resolved |
| assigned_muthawif_id | FK → muthawifs |
| responded_at | TIMESTAMPTZ |

**Versi fase16_new_tables.sql:**
| Kolom | Tipe |
|---|---|
| customer_id | FK → customers (nullable) |
| emergency_type | CHECK: medical, lost, security, other |
| message | TEXT |
| latitude, longitude, accuracy | FLOAT8 |
| status | CHECK: active, responding, resolved |
| response_notes | TEXT |
| resolved_at | TIMESTAMPTZ |
| resolved_by | FK → auth.users |
| branch_id | FK → branches |

> Kolom berbeda signifikan. `IF NOT EXISTS` menyebabkan fase16 **tidak membuat tabel baru** jika fase0 sudah dijalankan duluan. Perlu merge manual.

---

#### `attendance`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| departure_id | UUID | FK → departures |
| customer_id | UUID | FK → customers |
| session_type | TEXT | |
| session_label | TEXT | |
| status | TEXT | CHECK: hadir, absen, terlambat, izin |
| notes | TEXT | |
| recorded_by | UUID | FK → profiles |
| recorded_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

---

#### `trip_timeline`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| departure_id | UUID NOT NULL | FK → departures |
| title | TEXT | |
| description | TEXT | |
| event_date | DATE | |
| event_time | TEXT | |
| location | TEXT | |
| type | TEXT | CHECK: info, flight, hotel, activity, ceremony, warning, milestone |
| sort_order | INTEGER | |
| is_public | BOOLEAN | |
| created_by | UUID | FK → auth.users |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `manasik_schedules`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| departure_id | UUID | FK → departures |
| branch_id | UUID | FK → branches |
| title | TEXT | |
| description | TEXT | |
| event_date | DATE | |
| event_time | TEXT | |
| location | TEXT | |
| is_online | BOOLEAN | |
| meeting_url | TEXT | |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `siskohat_sync_logs`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| sync_type | TEXT | CHECK: export, manual_input, validation |
| record_count | INTEGER | |
| status | TEXT | CHECK: success, partial, failed |
| error_message, file_url | TEXT | |
| exported_by | UUID | FK → auth.users |
| branch_id | UUID | FK → branches |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

---

### J. NOTIFIKASI & KOMUNIKASI

#### `notifications`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| title, message | TEXT | |
| type | TEXT | CHECK: info, success, warning, error, urgent |
| target_role | TEXT | |
| branch_id | UUID | FK → branches |
| is_read | BOOLEAN | |
| user_id | UUID | FK → auth.users |
| link, icon | TEXT | |
| created_at | TIMESTAMPTZ | |

---

#### `customer_notifications`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| customer_id | UUID NOT NULL | FK → customers ON DELETE CASCADE |
| type | TEXT | Default 'general' |
| title, message | TEXT | |
| link | TEXT | |
| is_read | BOOLEAN | |
| read_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

---

#### `notification_templates`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| code | TEXT UNIQUE | |
| name | TEXT | |
| channel | TEXT | CHECK: push, whatsapp, email, sms, in_app |
| title, body | TEXT | |
| variables | TEXT[] | |
| trigger_event | TEXT | |
| is_active | BOOLEAN | |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `whatsapp_config`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| provider | TEXT | fonnte, wablas, dll |
| api_key | TEXT | Sensitif (masked di frontend) |
| sender_number | TEXT | |
| is_active | BOOLEAN | |
| display_name | TEXT | (fase31) |
| provider_config | JSONB | (fase31) |
| webhook_secret | TEXT | (fase31) |
| updated_by | UUID | FK → auth.users (fase31) |
| last_tested_at | TIMESTAMPTZ | |
| last_test_ok | BOOLEAN | |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `wa_templates` / `wa_send_logs`
| Tabel | Keterangan |
|---|---|
| `wa_templates` | Template pesan WA: code (UNIQUE), name, message_template, variables (JSONB) |
| `wa_send_logs` | Log setiap pengiriman WA: recipient_phone, status, sent_at, template_code, departure_id |

---

#### `wa_broadcast_campaigns`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| segment_filters | JSONB | {package_ids, departure_ids, payment_statuses} |
| message_template | TEXT | |
| status | TEXT | CHECK: draft, scheduled, sending, done, cancelled |
| scheduled_at, sent_at | TIMESTAMPTZ | |
| total_recipients, success_count, fail_count | INT | |
| created_by | UUID | FK → auth.users |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `wa_broadcast_logs`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| campaign_id | UUID NOT NULL | FK → wa_broadcast_campaigns |
| booking_id | UUID | FK → bookings |
| phone, message | TEXT | |
| status | TEXT | CHECK: queued, sent, failed |
| sent_at | TIMESTAMPTZ | |
| error_msg | TEXT | |
| created_at | TIMESTAMPTZ | |

---

#### `wa_feature_roadmap`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| phase | INTEGER | |
| code | TEXT UNIQUE | |
| title, description | TEXT | |
| status | TEXT | CHECK: done, in_progress, planned, cancelled |
| target_date | DATE | |
| sort_order | INTEGER | |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `push_subscriptions`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| customer_id | UUID | FK → customers |
| endpoint | TEXT UNIQUE | |
| p256dh, auth_key | TEXT | |
| user_agent | TEXT | |
| muthawif_id, user_id | UUID | |
| role | TEXT | |
| branch_id, agent_id | UUID | |
| created_at, updated_at | TIMESTAMPTZ | |

---

### K. MARKETING & LEADS

#### `leads`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| name | TEXT | |
| phone | TEXT NOT NULL | |
| email | TEXT | |
| source | TEXT | CHECK: direct, whatsapp, instagram, facebook, referral, website, lainnya |
| branch_id | UUID | FK → branches |
| agent_id | UUID | FK → agents |
| status | TEXT | CHECK: new, contacted, qualified, converted, lost |
| notes, package_interest | TEXT | |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `marketing_campaigns`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| branch_id | UUID | FK → branches |
| name, description | TEXT | |
| channel | TEXT | CHECK: social_media, whatsapp, email, sms, offline, referral, other |
| status | TEXT | CHECK: draft, active, paused, completed, cancelled |
| budget, spent | NUMERIC(20,2) | |
| impressions, clicks | BIGINT | |
| conversions | INTEGER | |
| start_date, end_date | DATE | |
| created_by | UUID | FK → auth.users |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `marketing_metrics`, `marketing_conversions`
- **marketing_metrics**: Metrik harian per kampanye (impressions, clicks, conversions, revenue, cost). Unique: (campaign_id, metric_date)
- **marketing_conversions**: Denormalized view konversi per kampanye — campaign_id, booking_id, customer_id, revenue, converted_at

---

### L. PELATIHAN AGEN

#### `training_modules`
| Kolom | Tipe | Keterangan |
|---|---|---|
| id | UUID PK | |
| title, description | TEXT | |
| category | TEXT | CHECK: product_knowledge, script_penjualan, sop, regulasi, lainnya |
| content_type | TEXT | CHECK: text, video, pdf, mixed |
| content_url, content_text, thumbnail_url | TEXT | |
| duration_minutes | INTEGER | |
| is_mandatory, is_active | BOOLEAN | |
| order_index | INTEGER | |
| created_by | UUID | FK → auth.users |
| created_at, updated_at | TIMESTAMPTZ | |

---

#### `training_quizzes`, `agent_training_progress`
- **training_quizzes**: Soal kuis per modul — module_id (FK), question, options (JSONB), explanation, order_index
- **agent_training_progress**: Progress per agen per modul — agent_id, module_id, status, quiz_score, started_at, completed_at. Unique: (agent_id, module_id)

---

### M. E-COMMERCE (TOKO ONLINE)

#### `store_categories`
Kolom: id, name, slug (UNIQUE), description, image_url, is_active, sort_order, created_at, updated_at

#### `store_products`
Kolom: id, category_id (FK→store_categories), name, slug (UNIQUE), description, price, original_price, stock, weight_gram, images (JSONB), is_active, is_featured, sold_count, sku, branch_id, created_by, created_at, updated_at

#### `store_orders`
Kolom: id, order_number (UNIQUE), customer_id, user_id, status (CHECK: pending/confirmed/processing/shipped/delivered/cancelled/refunded), payment_status (CHECK: unpaid/paid/refunded), subtotal, shipping_cost, discount_amount, total_amount, shipping_name/phone/address/city/province/postal, notes, payment_proof_url, paid_at, confirmed_at, confirmed_by, branch_id, created_at, updated_at

#### `store_order_items`
Kolom: id, order_id (FK CASCADE), product_id (FK RESTRICT), product_name, product_image, quantity, unit_price, subtotal (GENERATED), created_at

#### `store_shipments`
Kolom: id, order_id (UNIQUE FK CASCADE), courier_name, courier_service, tracking_number, shipped_at, estimated_arrival, delivered_at, status (CHECK: preparing/picked_up/in_transit/out_for_delivery/delivered/failed/returned), notes, created_by, created_at, updated_at

#### `store_product_reviews`
Kolom: id, order_id (FK CASCADE), product_id (FK CASCADE), user_id (FK CASCADE), customer_id, rating (SMALLINT 1–5), comment, is_published, admin_reply, admin_reply_at, created_at, updated_at. Unique: (order_id, product_id, user_id)

---

### N. TABUNGAN PERJALANAN

#### `savings_plans`
Kolom: id, customer_id (FK NOT NULL), name, target_amount, current_amount, target_date, status (CHECK: active, completed, cancelled), notes, created_at, updated_at

#### `savings_deposits`
Kolom: id, plan_id (FK CASCADE NOT NULL), amount, deposit_date, notes, created_by, created_at

---

### O. LAINNYA

#### `banners`
Kolom: id, title, subtitle, image_url, link_url, link_text, position (CHECK: home, packages, about, contact), is_active, sort_order, branch_id, starts_at, ends_at, created_at, updated_at

#### `announcements`
Kolom: id, title, content, type (CHECK: info, warning, success, urgent), target_roles (TEXT[]), branch_id, is_active, starts_at, ends_at, created_by, created_at, updated_at

#### `coupons`
Kolom: id, code (UNIQUE), name, discount_type (CHECK: percentage, fixed), discount_value, min_purchase, max_discount, quota, used_count, is_active, starts_at, ends_at, created_by, created_at, updated_at

#### `support_tickets`
Kolom: id, customer_id (FK CASCADE NOT NULL), title, description, status (CHECK: open, in_progress, resolved, closed), priority (CHECK: low, medium, high, urgent), assigned_to, resolved_at, created_at, updated_at

#### `media_gallery`
Kolom: id, type (CHECK: video_testimonial, virtual_tour, hotel_photo), title, description, media_url, thumbnail_url, hotel_id, package_id, jamaah_name, departure_year, duration_seconds, is_active, order_index, created_by, created_at

#### `faqs`
Kolom: id, question, answer, category, sort_order, is_published, created_at, updated_at

#### `website_settings`
Kolom: id, agent_id, branch_id, company_name, logo_url, favicon_url, active_theme, primary_color, accent_color, fg/bg_color, body_font, heading_font, footer_*, footer_links (JSONB), custom_sections (JSONB), profile_photo_url, banner_url, bio, testimonials/gallery_urls (JSONB), seo_title, seo_description, view_count, social_youtube, social_tiktok, maps_embed_url, created_at, updated_at

#### `app_settings`
Kolom: id, key (UNIQUE), value, updated_at

#### `jamaah_checklist`
Kolom: id, customer_id (FK CASCADE), item_id (TEXT), is_checked, updated_at. Unique: (customer_id, item_id)

#### `baggage_reference_items`
Kolom: id, name, category, estimated_weight_kg, is_mandatory, notes

#### `siskohat_sync_logs`
_(Lihat bagian Operasional)_

---

## 6. View & Fungsi RPC

### View (SQL Views)

| View | Didefinisikan Di | Keterangan |
|---|---|---|
| `v_financial_summary` | `sql/migrations/042_v_financial_summary_view.sql` | Ringkasan keuangan per departure |
| `v_financial_summary_v2` | `sql/migrations/084_v_financial_summary_v2.sql` | Versi v2 dengan margin % |

### Fungsi SECURITY DEFINER (RPC)

| Fungsi | File | Keterangan |
|---|---|---|
| `update_updated_at_column()` | fase0 | Trigger helper — auto update updated_at |
| `handle_new_user()` | fase0 | Auto-create profile saat user baru register |
| `slugify_text(text)` | consolidated_all | Konversi teks ke slug URL |
| `generate_store_order_number()` | store_ecommerce | Generate nomor order unik |
| `recalculate_departure_financial_summary(UUID)` | fase28 | Hitung ulang P&L per departure |
| `preview_auto_schedule_reminders(INTEGER[])` | fase30 | Dry-run jadwal reminder |
| `auto_schedule_payment_reminders(INTEGER[])` | fase30 | Insert reminder H-7/H-3 otomatis |
| `get_wa_config_safe()` | fase31 | Baca config WA tanpa api_key (aman untuk frontend) |
| `is_admin(UUID)` | sql/093_fix_is_admin_drop_create.sql | Cek apakah user adalah admin |
| `get_user_role(UUID)` | consolidated_all | Ambil role user |
| `generate_booking_code()` | consolidated_all | Generate kode booking unik |

---

## 7. Trigger

| Trigger | Tabel | Aksi | Fungsi |
|---|---|---|---|
| `on_auth_user_created` | `auth.users` | AFTER INSERT | `handle_new_user()` |
| `set_profiles_updated_at` | `profiles` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_branches_updated_at` | `branches` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_agents_updated_at` | `agents` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_packages_updated_at` | `packages` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_departures_updated_at` | `departures` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_hotels_updated_at` | `hotels` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_vendors_updated_at` | `vendors` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_employees_updated_at` | `employees` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_customers_updated_at` | `customers` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_bookings_updated_at` | `bookings` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_room_assignments_updated_at` | `room_assignments` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_savings_plans_updated_at` | `savings_plans` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_leads_updated_at` | `leads` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_support_tickets_updated_at` | `support_tickets` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_announcements_updated_at` | `announcements` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_banners_updated_at` | `banners` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_coupons_updated_at` | `coupons` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_visa_apps_updated_at` | `visa_applications` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_vendor_contracts_updated_at` | `vendor_contracts` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_departure_budgets_updated_at` | `departure_budgets` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_training_modules_updated_at` | `training_modules` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_agent_training_updated_at` | `agent_training_progress` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_store_categories_updated_at` | `store_categories` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_store_products_updated_at` | `store_products` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_store_orders_updated_at` | `store_orders` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_store_shipments_updated_at` | `store_shipments` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_spr_updated_at` | `store_product_reviews` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_departure_cost_items_updated_at` | `departure_cost_items` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_departure_expenses_updated_at` | `departure_expenses` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_departure_other_revenues_updated_at` | `departure_other_revenues` | BEFORE UPDATE | `update_updated_at_column()` |
| `trg_wa_broadcast_campaigns_updated_at` | `wa_broadcast_campaigns` | BEFORE UPDATE | `update_wa_broadcast_updated_at()` |
| `set_dashboard_access_config_updated_at` | `dashboard_access_config` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_dashboard_stats_updated_at` | `dashboard_stats` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_transactions_updated_at` | `transactions` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_expenses_updated_at` | `expenses` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_marketing_campaigns_updated_at` | `marketing_campaigns` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_sales_targets_updated_at` | `sales_targets` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_trip_timeline_updated_at` | `trip_timeline` | BEFORE UPDATE | `update_updated_at_column()` |
| `set_notification_templates_updated_at` | `notification_templates` | BEFORE UPDATE | `update_updated_at_column()` |
| `trg_auto_commission_booking_confirmed` | `bookings` | AFTER UPDATE | Auto-insert komisi saat booking dikonfirmasi |
| `trg_auto_equipment_queue_on_booking_confirmed` | `bookings` | AFTER UPDATE | Auto-queue distribusi perlengkapan |
| `trg_departure_pl_update` | `bookings`/`payments` | AFTER INSERT/UPDATE | Update departure P&L summary |

---

## 8. Laporan Tabel Duplikat / Overlapping

### 🔴 KONFLIK KRITIS — Tabel yang Didefinisikan Lebih dari Sekali dengan Skema Berbeda

#### 1. `sos_alerts` — 2 definisi dengan kolom berbeda

| Aspek | fase0_foundation.sql | fase16_new_tables.sql |
|---|---|---|
| customer_id | NOT NULL FK | Nullable FK |
| Status values | pending, responded, resolved | active, responding, resolved |
| Kolom unik | departure_id, assigned_muthawif_id, message | emergency_type, accuracy, resolved_by, branch_id, response_notes |
| Koordinat tipe | NUMERIC(10,6) | FLOAT8 |

**Dampak:** Karena `IF NOT EXISTS`, hanya fase0 yang aktif jika dijalankan berurutan. fase16 tidak menambah kolom baru secara otomatis. Perlu migrasi `ALTER TABLE` manual.

---

#### 2. `visa_status_logs` — 2 definisi dengan FK berbeda

| Aspek | fase16_new_tables.sql | fase21_integration_fixes.sql |
|---|---|---|
| visa_id | Ada (FK → visa_applications) | Tidak ada |
| changed_by | FK → auth.users | FK → profiles |
| changed_by_role | Ada | Tidak ada |

**Dampak:** `IF NOT EXISTS` menyebabkan fase21 tidak mengubah tabel. Kolom `changed_by` FK ke tabel berbeda bergantung mana yang dijalankan duluan.

---

### 🟡 OVERLAP FUNGSIONAL — Tabel dengan Fungsi Serupa

#### 3. `notifications` vs `customer_notifications`

| Aspek | `notifications` | `customer_notifications` |
|---|---|---|
| Target | user_id (auth.users) — staff & customer | customer_id — jamaah saja |
| Fungsi | Notifikasi sistem umum | Notifikasi khusus jamaah |
| Rekomendasi | Pertahankan keduanya, beda audience |

---

#### 4. `expenses` vs `departure_expenses`

| Aspek | `expenses` (fase16) | `departure_expenses` (fase28) |
|---|---|---|
| Scope | Per branch / general | Per departure, detail realisasi |
| Approval | Ya (status: pending/approved/rejected/paid) | Tidak (langsung) |
| Currency | Tidak | Ya (multi-currency dengan exchange_rate) |
| Rekomendasi | `expenses` untuk pengeluaran umum, `departure_expenses` untuk realisasi HPP per keberangkatan. Tidak duplikat, tapi bisa membingungkan. |

---

#### 5. `transactions` vs `expenses` vs `departure_expenses`

Tiga tabel yang semuanya merekam pengeluaran uang:
- `transactions` — ledger umum income/expense per branch
- `expenses` — operasional dengan approval workflow
- `departure_expenses` — realisasi biaya per keberangkatan

**Rekomendasi:** Buat hubungan FK eksplisit antara `departure_expenses.id` → `transactions.id` atau `expenses.id` untuk menghindari data tidak sinkron.

---

#### 6. `financial_summary` vs `departure_financial_summary` vs `dashboard_stats`

| Tabel | Granularitas | Diperbarui |
|---|---|---|
| `financial_summary` | Per branch per periode | Manual |
| `departure_financial_summary` | Per departure | Melalui fungsi `recalculate_*` |
| `dashboard_stats` | Per branch per hari | Manual / cache |

Ketiga tabel adalah cache/materialized snapshot. Bisa inconsistent jika tidak semua diperbarui bersamaan.

---

#### 7. `training_modules` — Disebutkan di fase17 dan fase19

fase17 mendefinisikan tabel `training_modules`. fase19 (`branch_kpi_targets`) merefer ke training_modules dalam konteks target KPI. Tidak konflik, tapi perlu diperhatikan.

---

#### 8. `equipment` vs `equipment_distributions`

| Tabel | Fungsi |
|---|---|
| `equipment` | Inventaris/master data alat (status, kondisi, jumlah) |
| `equipment_distributions` | Log distribusi alat ke jamaah per departure |

Tidak duplikat, tapi `equipment_distributions.item_name` adalah TEXT biasa — tidak FK ke `equipment.id`. Ini menyebabkan **data tidak terhubung** antara master inventaris dan distribusi aktual.

---

#### 9. `store_product_reviews` — Overlap dengan `testimonials`/`muthawif_evaluations`

| Tabel | Fungsi |
|---|---|
| `store_product_reviews` | Ulasan produk toko e-commerce |
| `muthawif_evaluations` (fase22) | Penilaian kinerja muthawif oleh jamaah |
| (testimonials di branches/website_settings JSONB) | Testimoni umum tersimpan sebagai JSONB |

Tidak konflik teknis, tapi arsitektur testimonial tersebar di 3 tempat berbeda.

---

#### 10. `wa_broadcast_campaigns` vs `marketing_campaigns`

| Tabel | Fungsi |
|---|---|
| `marketing_campaigns` (fase16) | Kampanye marketing umum (semua channel) |
| `wa_broadcast_campaigns` (fase32) | Kampanye broadcast WA khusus dengan segmentasi |

Overlap pada channel WhatsApp. `marketing_campaigns` memiliki channel='whatsapp' tapi tidak terintegrasi dengan `wa_broadcast_campaigns`. Sebaiknya `wa_broadcast_campaigns` memiliki FK ke `marketing_campaigns`.

---

### 📋 Ringkasan Jumlah Tabel Unik per Domain

| Domain | Jumlah Tabel |
|---|---|
| Auth & RBAC | 6 |
| Organisasi (Branch, Agent, Employee, Muthawif) | 4 |
| Produk & Keberangkatan | 6 |
| Pelanggan & Booking | 10 |
| Visa & Dokumen | 4 |
| Keuangan | 8 |
| Komisi & Approval | 4 |
| SDM (HR) | 2 |
| Operasional | 8 |
| Notifikasi & Komunikasi | 9 |
| Marketing & Leads | 4 |
| Pelatihan Agen | 3 |
| E-Commerce (Toko) | 5 |
| Tabungan | 2 |
| Lainnya (Banner, FAQ, Coupon, dll) | 9 |
| **Total** | **~94 tabel unik** |

> _(Belum termasuk tabel lanjutan di `artifacts/api-server/src/sql/` yang menambah ~30+ tabel untuk akuntansi, payroll, SDM lanjutan, journal entries, dll.)_

---

*Dokumen ini dihasilkan dari analisis 234+ file SQL, migrasi fase0–fase32, skema Drizzle ORM, dan source code TypeScript.*
