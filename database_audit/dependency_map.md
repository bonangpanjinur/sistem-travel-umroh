# Database Dependency Map — Vinstour Travel Portal
> Foreign keys, fungsi, trigger, view, policy yang saling terhubung

---

## Foreign Key Graph (TABLE → TABLE)

```
auth.users ──────────────────────────────────────────────────────────────────┐
  ├── profiles (1:1, ON DELETE CASCADE)                                       │
  ├── user_roles.user_id (ON DELETE CASCADE)                                  │
  ├── user_roles.granted_by (ON DELETE SET NULL)                              │
  ├── staff_invitations.invited_by                                            │
  ├── agents.user_id                                                          │
  ├── muthawifs.user_id                                                       │
  ├── employees.user_id                                                       │
  ├── customers.user_id                                                       │
  ├── customer_accounts.user_id (UNIQUE, ON DELETE CASCADE)                   │
  ├── bookings.created_by                                                     │
  ├── payments.confirmed_by                                                   │
  ├── journal_entries.posted_by, voided_by, created_by                        │
  ├── leads.assigned_to                                                       │
  ├── audit_logs.user_id                                                      │
  └── [semua tabel admin] .created_by                                         │

profiles ────────────────────────────────────────────────────────────────────┤
  ├── branches.manager_id                                                     │
  ├── bookings.handled_by                                                     │
  └── departures.lead_pic                                                     │

branches ─────────────────────────────────────────────────────────────────────┤
  ├── agents.branch_id                                                        │
  ├── muthawifs.branch_id                                                     │
  ├── employees.branch_id                                                     │
  ├── customers.branch_id                                                     │
  ├── departures.branch_id                                                    │
  ├── bookings.branch_id                                                      │
  ├── leads.branch_id                                                         │
  ├── payroll.branch_id                                                       │
  └── commissions.branch_id                                                   │

agents ───────────────────────────────────────────────────────────────────────┤
  ├── customers.agent_id                                                      │
  ├── bookings.agent_id                                                       │
  ├── commissions.agent_id                                                    │
  ├── leads.agent_id                                                          │
  └── customer_accounts.referred_by_agent_id                                  │

airlines ─────────────────────────────────────────────────────────────────────┤
  ├── packages.airline_id                                                     │
  └── departures.airline_id                                                   │

hotels ───────────────────────────────────────────────────────────────────────┤
  ├── hotel_room_capacities.hotel_id (CASCADE)                                │
  ├── packages.hotel_makkah_id                                                │
  ├── packages.hotel_madinah_id                                               │
  ├── departures.hotel_makkah_id                                              │
  ├── departures.hotel_madinah_id                                             │
  └── departure_multi_hotels.hotel_id                                         │

packages ─────────────────────────────────────────────────────────────────────┤
  ├── package_hpp_templates.package_id (CASCADE)                              │
  ├── departures.package_id (RESTRICT)                                        │
  ├── leads.package_id                                                        │
  └── coupons.package_ids (UUID[])                                            │

departures ───────────────────────────────────────────────────────────────────┤
  ├── departure_multi_hotels.departure_id (CASCADE)                           │
  ├── trip_timeline.departure_id (CASCADE)                                    │
  ├── departure_cost_items.departure_id (CASCADE)                             │
  ├── departure_expenses.departure_id (CASCADE)                               │
  ├── departure_other_revenues.departure_id (CASCADE)                         │
  ├── departure_financial_summary.departure_id (UNIQUE, CASCADE)              │
  ├── bookings.departure_id                                                   │
  ├── vendor_invoices.departure_id                                            │
  ├── room_assignments.departure_id                                           │
  ├── manasik_sessions.departure_id                                           │
  └── waiting_list.departure_id                                               │

customers ─────────────────────────────────────────────────────────────────────┤
  ├── customer_documents.customer_id (CASCADE)                                │
  ├── customer_mahrams.customer_id + mahram_id (CASCADE)                      │
  ├── customer_accounts.customer_id                                           │
  ├── bookings.customer_id (RESTRICT)                                         │
  ├── leads.customer_id                                                       │
  ├── loyalty_points.customer_id (CASCADE)                                    │
  └── booking_passengers.customer_id                                          │

bookings ─────────────────────────────────────────────────────────────────────┤
  ├── booking_passengers.booking_id (CASCADE)                                 │
  ├── booking_line_items.booking_id (CASCADE)                                 │
  ├── booking_seat_locks.booking_id (CASCADE)                                 │
  ├── booking_access_tokens.booking_id (CASCADE)                              │
  ├── booking_document_logs.booking_id (CASCADE)                              │
  ├── customer_documents.booking_id (SET NULL)                                │
  ├── payments.booking_id                                                     │
  ├── commissions.booking_id                                                  │
  ├── loyalty_points.booking_id                                               │
  └── ar_reminder_log.booking_id (CASCADE)                                    │

vendors ──────────────────────────────────────────────────────────────────────┤
  ├── package_hpp_templates.vendor_id                                         │
  ├── vendor_invoices.vendor_id (RESTRICT)                                    │
  ├── departure_cost_items.vendor_id                                          │
  └── departure_expenses.vendor_id                                            │

employees ─────────────────────────────────────────────────────────────────────┤
  ├── payroll_slips.employee_id                                               │
  ├── leave_requests.employee_id (CASCADE)                                    │
  ├── performance_reviews.employee_id (CASCADE)                               │
  └── commissions.employee_id                                                 │

chart_of_accounts ─────────────────────────────────────────────────────────────┤
  ├── chart_of_accounts.parent_code (self-ref)                                │
  └── journal_lines.account_code (RESTRICT)                                   │

journal_entries ───────────────────────────────────────────────────────────────┤
  └── journal_lines.journal_id (CASCADE)                                      │

menu_items ────────────────────────────────────────────────────────────────────┤
  └── menu_items.parent_id (self-ref, CASCADE)                                │

permissions_list ──────────────────────────────────────────────────────────────┤
  └── role_permissions.permission_key (CASCADE)                               │
```

---

## Functions (FUNCTION → TABLE)

| Fungsi | Tabel yang Diakses | Keterangan |
|--------|-------------------|------------|
| `generate_booking_code()` | `bookings` | SELECT MAX kode, generate sequence |
| `generate_payment_code()` | `payments` | Generate kode payment unik |
| `validate_registration_context()` | `agents`, `branches` | Validasi slug agen/cabang |
| `convert_savings_to_booking()` | `savings_plans`, `savings_deposits`, `bookings`, `booking_passengers`, `payments` | Konversi tabungan ke booking resmi |
| `recalculate_departure_financial_summary()` | `bookings`, `payments`, `departure_cost_items`, `departure_expenses`, `departure_other_revenues`, `departure_financial_summary` | Recalculate summary keuangan |
| `bulk_distribute_equipment()` | `equipment_items`, `equipment_distributions`, `booking_passengers` | Distribusi massal |
| `increment_package_view_count()` | `packages` | UPDATE view_count++ |
| `generate_savings_payment_code()` | `savings_deposits` | Generate kode setoran |
| `create_customer_account()` | `customers`, `customer_accounts`, `auth.users` | Buat akun portal jamaah |
| `list_users_with_emails()` | `auth.users`, `profiles`, `user_roles` | Join auth + profiles (admin only) |
| `confirm_equipment_receipt()` | `equipment_distributions` | UPDATE status received |
| `has_role(uid, role)` | `user_roles` | Helper RLS: cek role user |
| `has_any_role(uid, roles[])` | `user_roles` | Helper RLS: cek salah satu dari banyak role |

---

## Triggers (TRIGGER → TABLE)

| Trigger | Tabel | Event | Fungsi | Keterangan |
|---------|-------|-------|--------|------------|
| `trg_update_timestamps` | Semua tabel dengan `updated_at` | BEFORE UPDATE | `set_updated_at()` | Auto-update timestamp |
| `trg_booking_payment_sync` | `payments` | AFTER INSERT/UPDATE | `sync_booking_paid_amount()` | Sync paid_amount ke bookings |
| `trg_departure_seat_sync` | `bookings` | AFTER INSERT/UPDATE/DELETE | `sync_departure_available_seats()` | Update available_seats di departures |
| `trg_auto_journal_payment` | `payments` | AFTER INSERT/UPDATE | `trg_auto_journal_payments()` | Auto double-entry journal dari payment |
| `trg_create_profile` | `auth.users` | AFTER INSERT | `handle_new_user()` | Auto-create profile saat user baru |
| `trg_agent_wallet_init` | `agents` | AFTER INSERT | `init_agent_wallet()` | Buat wallet agen otomatis |

---

## Views (VIEW → TABLE)

| View | Tabel Sumber | Keterangan |
|------|-------------|------------|
| `v_financial_summary` | `bookings`, `payments`, `departures`, `packages` | Summary keuangan per departure |
| `v_booking_detail` | `bookings`, `customers`, `departures`, `agents`, `payments` | Detail booking lengkap |
| `v_agent_performance` | `agents`, `bookings`, `commissions` | Performa penjualan agen |

---

## RLS Policies (POLICY → TABLE)

### Pola umum policies saat ini (bermasalah):
```sql
-- CARA LAMA (berpotensi error enum):
USING (role = 'admin')                    -- langsung di profiles
USING (EXISTS (SELECT 1 FROM user_roles
  WHERE user_id = auth.uid()
  AND role = 'admin'::text))              -- TEXT comparison → error setelah ALTER TYPE
```

### Pola baru yang akan digunakan:
```sql
-- CARA BARU (aman, via helper function):
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
USING (public.has_any_role(auth.uid(), ARRAY['admin','finance']::public.app_role[]))
```

### Policy per tabel (ringkasan):

| Tabel | Policy Tipe | Role yang Diizinkan |
|-------|------------|---------------------|
| `profiles` | SELECT own | Semua authenticated |
| `profiles` | UPDATE own | Semua authenticated |
| `profiles` | SELECT all | admin, super_admin |
| `user_roles` | SELECT | admin, super_admin, it |
| `user_roles` | INSERT/UPDATE/DELETE | super_admin, it |
| `bookings` | SELECT | admin, finance, operational, owner, branch_manager |
| `bookings` | SELECT own | agent (booking oleh agen tersebut) |
| `payments` | SELECT | admin, finance, owner |
| `customers` | SELECT/INSERT/UPDATE | admin, operator, sales, agent |
| `packages` | SELECT | public (anon) |
| `packages` | INSERT/UPDATE/DELETE | admin, owner, it |
| `departures` | SELECT | public (anon) |
| `departures` | INSERT/UPDATE/DELETE | admin, operational |
| `audit_logs` | SELECT | admin, super_admin, it |
| `audit_logs` | INSERT | service_role only |
| `permissions_list` | SELECT | authenticated |
| `permissions_list` | INSERT/UPDATE/DELETE | super_admin, it |
| `role_permissions` | SELECT | authenticated |
| `role_permissions` | INSERT/UPDATE/DELETE | super_admin, it |
| `website_settings` | SELECT | public (anon) |
| `website_settings` | UPDATE | admin, super_admin |
| `faqs` | SELECT | public (anon) |
| `faqs` | ALL | admin |
| `employees` | SELECT/UPDATE | admin, owner, branch_manager |
| `payroll` | SELECT/ALL | finance, owner |
| `chart_of_accounts` | SELECT/ALL | finance, owner, admin |
| `store_*` | SELECT | public (anon / authenticated) |
| `store_orders` | INSERT/UPDATE | customer (own), admin |

---

## Circular Reference

`customer_documents` ↔ `bookings`
- `customer_documents.booking_id` → `bookings.id`
- Ditangani dengan `DO $$ IF NOT EXISTS` guard di migration (deferred FK)
