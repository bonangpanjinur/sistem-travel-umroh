# Database Dependency Map — Vinstour Travel Portal (v2)
> Diperbarui dengan tabel dari database Supabase lama
> Foreign keys, fungsi, trigger, view, policy yang saling terhubung

---

## Foreign Key Graph (TABLE → TABLE)

```
auth.users ──────────────────────────────────────────────────────────────────
  ├── profiles (1:1, ON DELETE CASCADE)
  ├── user_roles.user_id (CASCADE)
  ├── user_roles.granted_by (SET NULL)
  ├── access_policies.user_id (CASCADE)
  ├── staff_invitations.invited_by (SET NULL)
  ├── agents.user_id (SET NULL)
  ├── muthawifs.user_id (SET NULL)
  ├── employees.user_id (SET NULL)
  ├── customers.user_id (SET NULL)
  ├── customer_accounts.user_id (UNIQUE, CASCADE)
  ├── bookings.created_by (SET NULL)
  ├── payments.confirmed_by (SET NULL)
  ├── journal_entries.posted_by, voided_by, created_by (SET NULL)
  ├── leads.assigned_to (SET NULL)
  ├── audit_logs.user_id (SET NULL)
  ├── activity_logs.user_id (SET NULL)
  └── booking_status_history.changed_by (SET NULL)

profiles ──────────────────────────────────────────────────────────────────
  ├── branches.manager_id (SET NULL)
  ├── bookings.handled_by (SET NULL)
  └── departures.lead_pic (SET NULL)

branches ──────────────────────────────────────────────────────────────────
  ├── agents.branch_id (SET NULL)
  ├── muthawifs.branch_id (SET NULL)
  ├── employees.branch_id (SET NULL)
  ├── departments.branch_id (SET NULL)
  ├── customers.branch_id (SET NULL)
  ├── departures.branch_id (SET NULL)
  ├── bookings.branch_id (SET NULL)
  ├── leads.branch_id (SET NULL)
  ├── payroll.branch_id (SET NULL)
  ├── commissions.branch_id (SET NULL)
  ├── user_roles.branch_id (SET NULL)
  ├── company_features.branch_id (SET NULL)
  ├── savings_plans.branch_id (SET NULL)
  └── landing_pages.branch_id (SET NULL)

agents ────────────────────────────────────────────────────────────────────
  ├── agents.parent_agent_id (self-ref, SET NULL)
  ├── active_pics.agent_id (CASCADE)
  ├── customers.agent_id (SET NULL)
  ├── bookings.agent_id (SET NULL)
  ├── commissions.agent_id (SET NULL)
  ├── leads.agent_id (SET NULL)
  ├── customer_accounts.referred_by_agent_id (SET NULL)
  ├── savings_plans.agent_id (SET NULL)
  ├── referral_codes.owner_id (agent type)
  ├── landing_pages.agent_id (SET NULL)
  ├── marketing_material_downloads.agent_id (SET NULL)
  ├── agent_wallets.agent_id (UNIQUE, CASCADE)
  └── agent_commissions.agent_id (CASCADE)

airlines ───────────────────────────────────────────────────────────────────
  ├── packages.airline_id (SET NULL)
  ├── departures.airline_id (SET NULL)
  └── manifests.airline_id (SET NULL)

hotels ────────────────────────────────────────────────────────────────────
  ├── hotel_room_capacities.hotel_id (CASCADE)
  ├── packages.hotel_makkah_id, hotel_madinah_id (SET NULL)
  ├── departures.hotel_makkah_id, hotel_madinah_id (SET NULL)
  ├── departure_hotels.hotel_id (SET NULL)
  └── room_assignments.hotel_id (SET NULL)

packages ───────────────────────────────────────────────────────────────────
  ├── package_hpp_templates.package_id (CASCADE)
  ├── departures.package_id (RESTRICT)
  ├── leads.package_id (SET NULL)
  ├── savings_plans.target_package_id (SET NULL)
  ├── coupons.package_ids (UUID[])
  ├── marketing_materials.package_id (SET NULL)
  └── landing_pages.package_id (SET NULL)

departures ─────────────────────────────────────────────────────────────────
  ├── departure_hotels.departure_id (CASCADE)
  ├── departure_itineraries.departure_id (CASCADE)
  ├── departure_checklists.departure_id (CASCADE)
  ├── departure_cost_items.departure_id (CASCADE)
  ├── departure_expenses.departure_id (CASCADE)
  ├── departure_other_revenues.departure_id (CASCADE)
  ├── departure_financial_summary.departure_id (UNIQUE, CASCADE)
  ├── manifests.departure_id (UNIQUE, CASCADE)
  ├── bookings.departure_id (SET NULL)
  ├── vendor_invoices.departure_id (SET NULL)
  ├── room_assignments.departure_id (CASCADE)
  ├── bus_assignments.departure_id (CASCADE)
  ├── manasik_sessions.departure_id (CASCADE)
  ├── departure_waiting_list.departure_id (CASCADE)
  ├── jamaah_live_locations.departure_id (SET NULL)
  ├── jamaah_qr_codes.departure_id (SET NULL)
  ├── offline_content.departure_id (SET NULL)
  └── media_gallery.departure_id (SET NULL)

customers ───────────────────────────────────────────────────────────────────
  ├── customer_documents.customer_id (CASCADE)
  ├── customer_mahrams.customer_id + mahram_id (CASCADE)
  ├── customer_family_relations.customer_id + related_customer_id (CASCADE)
  ├── customer_accounts.customer_id (SET NULL)
  ├── bookings.customer_id (RESTRICT)
  ├── leads.customer_id (SET NULL)
  ├── loyalty_points.customer_id (CASCADE)
  ├── loyalty_transactions.customer_id (CASCADE)
  ├── loyalty_point_expiry.customer_id (CASCADE)
  ├── booking_passengers.customer_id (SET NULL)
  ├── jamaah_qr_codes.customer_id (CASCADE)
  ├── jamaah_live_locations.customer_id (CASCADE)
  ├── jamaah_ibadah_targets.customer_id (CASCADE)
  ├── jamaah_jurnal.customer_id (CASCADE)
  ├── jamaah_badges.customer_id (CASCADE)
  ├── haji_registrations.customer_id (CASCADE)
  └── savings_plans.customer_id (CASCADE)

bookings ────────────────────────────────────────────────────────────────────
  ├── booking_passengers.booking_id (CASCADE)
  ├── booking_line_items.booking_id (CASCADE)
  ├── booking_seat_locks.booking_id (CASCADE)
  ├── booking_access_tokens.booking_id (CASCADE)
  ├── booking_document_logs.booking_id (CASCADE)
  ├── booking_status_history.booking_id (CASCADE)
  ├── booking_transfers.original_booking_id (SET NULL)
  ├── booking_transfers.new_booking_id (SET NULL)
  ├── booking_installment_schedules.booking_id (CASCADE)
  ├── customer_documents.booking_id (SET NULL)
  ├── payments.booking_id (RESTRICT)
  ├── commissions.booking_id (SET NULL)
  ├── agent_commissions.booking_id (SET NULL)
  ├── loyalty_points.booking_id (SET NULL)
  ├── visa_applications.booking_id (CASCADE)
  ├── ar_reminder_log.booking_id (CASCADE)
  └── savings_plans.converted_booking_id (SET NULL)

booking_passengers ──────────────────────────────────────────────────────────
  ├── booking_passengers.mahram_of (self-ref, SET NULL)
  ├── booking_document_logs.passenger_id (SET NULL)
  ├── equipment_distributions.booking_passenger_id (SET NULL)
  ├── bus_passengers.booking_passenger_id (SET NULL)
  ├── visa_applications.passenger_id (SET NULL)
  └── luggage.booking_passenger_id (CASCADE)

vendors ────────────────────────────────────────────────────────────────────
  ├── package_hpp_templates.vendor_id (SET NULL)
  ├── vendor_invoices.vendor_id (RESTRICT)
  ├── departure_cost_items.vendor_id (SET NULL)
  └── departure_expenses.vendor_id (SET NULL)

employees ───────────────────────────────────────────────────────────────────
  ├── departments.head_id (SET NULL)
  ├── payroll_slips.employee_id (RESTRICT)
  ├── leave_requests.employee_id (CASCADE)
  ├── leave_quotas.employee_id (CASCADE)
  ├── attendance_records.employee_id (CASCADE)
  ├── employee_devices.employee_id (CASCADE)
  ├── performance_reviews.employee_id (CASCADE)
  └── commissions.employee_id (SET NULL)

departments ─────────────────────────────────────────────────────────────────
  └── employees.department_id (SET NULL)

chart_of_accounts ───────────────────────────────────────────────────────────
  ├── chart_of_accounts.parent_code (self-ref, SET NULL)
  └── journal_entry_lines.account_code (RESTRICT)

journal_entries ─────────────────────────────────────────────────────────────
  └── journal_entry_lines.journal_id (CASCADE)

equipment_categories ────────────────────────────────────────────────────────
  ├── equipment_categories.parent_id (self-ref, SET NULL)
  └── equipment_items.category_id (SET NULL)

equipment_items ─────────────────────────────────────────────────────────────
  ├── equipment_variants.item_id (CASCADE)
  ├── equipment_distributions.equipment_item_id (RESTRICT)
  ├── equipment_photos.item_id (SET NULL)
  ├── equipment_stock_history.item_id (CASCADE)
  └── equipment_stock_opname.item_id (CASCADE)

equipment_variants ──────────────────────────────────────────────────────────
  ├── equipment_distributions.variant_id (SET NULL)
  ├── equipment_stock_history.variant_id (SET NULL)
  └── equipment_stock_opname.variant_id (SET NULL)

equipment_distributions ─────────────────────────────────────────────────────
  └── equipment_photos.distribution_id (CASCADE)

bus_providers ────────────────────────────────────────────────────────────────
  └── bus_assignments.provider_id (SET NULL)

bus_assignments ──────────────────────────────────────────────────────────────
  └── bus_passengers.assignment_id (CASCADE)

haji_registrations ───────────────────────────────────────────────────────────
  └── haji_waiting_progress.registration_id (CASCADE)

menu_items ────────────────────────────────────────────────────────────────────
  └── menu_items.parent_id (self-ref, CASCADE)

permissions_list ────────────────────────────────────────────────────────────
  ├── role_permissions.permission_key (CASCADE)
  └── user_permission_overrides.permission_key (CASCADE)

marketing_materials ─────────────────────────────────────────────────────────
  └── marketing_material_downloads.material_id (CASCADE)

loyalty_points ──────────────────────────────────────────────────────────────
  └── loyalty_transactions.loyalty_point_id (SET NULL)
```

---

## Circular References & Deferred FKs

| Table A | Column | Table B | Solusi |
|---------|--------|---------|--------|
| `customer_documents` | `booking_id` | `bookings` | Deferred FK (DO $$ IF NOT EXISTS) |
| `booking_document_logs` | `passenger_id` | `booking_passengers` | Deferred FK (DO $$ IF NOT EXISTS) |
| `departments` | `head_id` | `employees` | SET NULL + create employees first |
| `agents` | `parent_agent_id` | `agents` | Self-ref, SET NULL OK |

---

## Functions (FUNCTION → TABLE)

| Fungsi | Tabel yang Diakses | Keterangan |
|--------|-------------------|------------|
| `generate_booking_code()` | `bookings` | Generate kode unik |
| `generate_payment_code()` | `payments` | Generate kode payment |
| `generate_savings_payment_code()` | `savings_deposits` | Kode setoran |
| `validate_registration_context()` | `agents`, `branches` | Validasi slug |
| `convert_savings_to_booking()` | `savings_plans`, `savings_deposits`, `bookings`, `payments` | Konversi tabungan |
| `recalculate_departure_financial_summary()` | `bookings`, `payments`, `departure_cost_items`, `departure_expenses`, `departure_other_revenues`, `departure_financial_summary` | Recalculate |
| `bulk_distribute_equipment()` | `equipment_items`, `equipment_distributions`, `booking_passengers` | Distribusi massal |
| `increment_package_view_count()` | `packages` | UPDATE view_count++ |
| `create_customer_account()` | `customers`, `customer_accounts`, `agents`, `branches` | Buat akun portal |
| `list_users_with_emails()` | `auth.users`, `profiles`, `user_roles` | Admin only |
| `confirm_equipment_receipt()` | `equipment_distributions` | Konfirmasi terima |
| `has_role(uid, role)` | `user_roles` | Helper RLS |
| `has_any_role(uid, roles[])` | `user_roles` | Helper RLS multi |
| `is_staff(uid)` | `user_roles` | Cek staf internal |
| `write_audit_log(...)` | `audit_logs`, `user_roles` | Tulis audit |

---

## Triggers (TRIGGER → TABLE)

| Trigger | Tabel | Event | Efek |
|---------|-------|-------|------|
| `trg_set_updated_at` | Semua tabel `updated_at` | BEFORE UPDATE | Auto-update timestamp |
| `trg_handle_new_user` | `auth.users` | AFTER INSERT | Buat `profiles` otomatis |
| `trg_sync_booking_paid` | `payments` | AFTER INSERT/UPDATE | Update `bookings.paid_amount` + `payment_status` |
| `trg_sync_departure_seats` | `bookings` | AFTER INSERT/UPDATE/DELETE | Update `departures.available_seats` |
| `trg_init_agent_wallet` | `agents` | AFTER INSERT | Buat `agent_wallets` otomatis |
| `trg_wallet_on_commission` | `agent_commissions` | AFTER UPDATE | Kredit `agent_wallets` |
| `trg_validate_journal` | `journal_entries` | BEFORE UPDATE status | Validasi debit = kredit |
| `trg_booking_status_history` | `bookings` | AFTER UPDATE status | INSERT ke `booking_status_history` |
| `trg_equipment_stock_history` | `equipment_distributions` | AFTER INSERT/UPDATE | INSERT ke `equipment_stock_history` |

---

## Views (VIEW → TABLE)

| View | Tabel Sumber | Keterangan |
|------|-------------|------------|
| `v_booking_detail` | `bookings`, `customers`, `departures`, `packages`, `agents`, `airlines`, `hotels` | Detail booking lengkap |
| `v_agent_performance` | `agents`, `bookings`, `agent_commissions`, `agent_wallets` | Performa penjualan agen |
| `v_departure_summary` | `departures`, `packages`, `airlines`, `hotels`, `departure_financial_summary`, `bookings` | Ringkasan departure |
| `v_customer_portal` | `customers`, `customer_accounts` | Data jamaah untuk portal (tanpa sensitif) |
| `v_financial_overview` | `payments`, `bookings` | Ringkasan keuangan harian |
| `v_equipment_stock` | `equipment_items`, `equipment_variants`, `equipment_distributions` | Status stok perlengkapan |

---

## RLS Policy Matrix

### Pola policy yang wajib digunakan:

```sql
-- ✅ BENAR
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
USING (public.has_any_role(auth.uid(), ARRAY['admin','finance']::public.app_role[]))
USING (public.is_staff(auth.uid()))

-- ❌ SALAH — jangan gunakan ini
USING (role = 'admin')
USING (EXISTS (SELECT 1 FROM user_roles WHERE role = 'admin'))
```

### Pola akses per domain:

| Domain | Anon Read | Auth Read | Write | Delete |
|--------|-----------|-----------|-------|--------|
| packages | published only | published + draft (staff) | admin,it | admin,owner |
| departures | open/full only | all (staff) | admin,operational | admin |
| bookings | ❌ | own (agent) + staff | admin,operator,sales | ❌ |
| payments | ❌ | own (customer via booking) + finance | staff | finance,owner |
| customers | ❌ | own + staff | admin,operator,sales,agent | ❌ |
| employees | ❌ | own + HR | admin,branch_manager | super_admin |
| equipment | ❌ | staff | admin,equipment,operational | admin |
| audit_logs | ❌ | admin,it,owner | trigger only | ❌ |
| website CMS | public | all | admin,marketing | admin |
| wa config | ❌ | staff | admin | super_admin |
