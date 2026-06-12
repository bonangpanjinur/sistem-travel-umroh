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

## Bug Fixes (Applied)

| File | Bug | Fix |
|------|-----|-----|
| `02_core_entities.sql` | **Root cause of ALL errors** — RLS policy `admin_read_profiles_for_status` on `profiles` referenced `user_roles` before it was created in the same file. File 02 aborted mid-run, so `user_roles`, `branches`, `employees` were never created → cascade-failed files 03–07. | Moved the `CREATE POLICY` to after the `user_roles` table definition. The `DROP POLICY` stays at the top (safe), but the `CREATE POLICY` is now deferred. |
| `07_functions_rpc_seed.sql` | `xmax = 0` used inside `auto_schedule_payment_reminders` to detect INSERT vs ON CONFLICT — this undocumented Postgres trick does not work reliably inside a function body. | Replaced with `GET DIAGNOSTICS v_inserted = ROW_COUNT`. |
| `07_functions_rpc_seed.sql` | Duplicate `iata_code 'SV'` for both "Saudi Arabian Airlines" and "Saudia" — would cause a unique constraint conflict. | Changed Saudia to `'XY'` and Flynas to `'F3'` (their correct IATA codes). |

## Troubleshooting

Setiap error di Supabase SQL Editor memiliki kode Postgres 5-karakter (`ERROR: XXXXX`).
Temukan kode atau kutipan pesan di tabel berikut, lalu ikuti langkah perbaikannya.

---

### Pola 1 — Tabel/Relasi Tidak Ditemukan

| Pesan error (contoh) | Kode | Penyebab | File yg gagal | Tindakan |
|---|---|---|---|---|
| `relation "user_roles" does not exist` | 42P01 | File 02 gagal sebelum membuat `user_roles` | **File 02** | Jalankan `09_rollback.sql`, lalu ulang dari file 01 |
| `relation "branches" does not exist` | 42P01 | File 02 gagal sebelum membuat `branches` | **File 02** | Sama seperti di atas |
| `relation "customers" does not exist` | 42P01 | File 03 gagal | **File 03** | Periksa output file 03, perbaiki, lalu ulang file 03–07 |
| `relation "bookings" does not exist` | 42P01 | File 03 gagal | **File 03** | Sama seperti di atas |
| `relation "savings_plans" does not exist` | 42P01 | File 03 gagal sebelum membuat `savings_plans` | **File 03** | Sama seperti di atas |
| `relation "employees" does not exist` | 42P01 | File 02 atau 05 gagal | **File 02 / 05** | Cek apakah `profiles` ada; jika tidak, rollback penuh |
| `relation "departures" does not exist` | 42P01 | File 02 gagal | **File 02** | Rollback penuh, ulang 01–07 |
| `relation "store_products" does not exist` | 42P01 | File 06 gagal | **File 06** | Ulang hanya file 06 (jika 01–05 sudah OK) |
| `relation "departure_financial_summary" does not exist` | 42P01 | File 05 gagal | **File 05** | Ulang file 05–07 |

**Cara cepat cek posisi kegagalan:**
```sql
-- Tempel di SQL Editor untuk melihat tabel mana yang sudah ada
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
ORDER BY table_name;
```
Bandingkan hasilnya dengan daftar di file 08. Tabel pertama yang hilang menunjukkan di mana file berhenti.

---

### Pola 2 — Tipe Data Tidak Ditemukan

| Pesan error | Kode | Penyebab | Tindakan |
|---|---|---|---|
| `type "savings_plans" does not exist` | 42704 | Tabel `savings_plans` belum ada saat file 07 dijalankan (file 03 gagal). Postgres menggunakan nama tabel sebagai row-type. | Pastikan file 03 berhasil dulu, lalu jalankan ulang file 07 |
| `type "app_role" does not exist` | 42704 | Kode lama masih menggunakan enum `app_role`. Migrasi bersih ini menggunakan `TEXT CHECK(...)`, bukan enum. | Hapus referensi `app_role` dari kode; gunakan string role langsung |

---

### Pola 3 — Duplikat / Konflik Unique

| Pesan error | Kode | Penyebab | Tindakan |
|---|---|---|---|
| `duplicate key value violates unique constraint "airlines_iata_code_key"` | 23505 | File 07 dijalankan dua kali (seed airline sudah ada) | Aman diabaikan — seed menggunakan `ON CONFLICT DO NOTHING`. Jika error fatal, jalankan `09_rollback.sql` lalu ulang |
| `duplicate key value violates unique constraint "permissions_list_pkey"` | 23505 | File 07 dijalankan dua kali | Sama seperti di atas |
| `duplicate key value violates unique constraint "menu_items_key_key"` | 23505 | File 07 dijalankan dua kali | Sama — `ON CONFLICT DO UPDATE` sudah ada, seharusnya tidak terjadi |
| `duplicate key value violates unique constraint "approval_configs_type_level_required_role_key"` | 23505 | File 05 dijalankan dua kali tanpa rollback | Jalankan `09_rollback.sql`, lalu ulang 01–07 |

---

### Pola 4 — Policy / RLS Bermasalah

| Pesan error | Kode | Penyebab | Tindakan |
|---|---|---|---|
| `policy "X" for table "Y" already exists` | 42710 | File dijalankan dua kali; `DROP POLICY IF EXISTS` tidak dijalankan | Jalankan `09_rollback.sql` lalu ulang; atau drop policy manual: `DROP POLICY "X" ON Y;` |
| `new row violates row-level security policy for table "X"` | 42501 | RLS aktif tapi policy tidak mengizinkan operasi yang sedang dilakukan | Pastikan user memiliki role yang sesuai di tabel `user_roles`. Cek hasil file 08 bagian 4. |
| `permission denied for table X` | 42501 | Sama seperti di atas | Sama |
| `infinite recursion detected in policy for relation "user_roles"` | 42P17 | Policy pada `user_roles` melakukan subquery ke `user_roles` sendiri tanpa alias berbeda | Periksa policy `user_roles_admin_manage` — harus menggunakan alias `ur` |

---

### Pola 5 — Fungsi Tidak Ditemukan

| Pesan error | Kode | Penyebab | Tindakan |
|---|---|---|---|
| `function update_updated_at_column() does not exist` | 42883 | File 01 belum dijalankan atau gagal | Jalankan ulang **file 01** terlebih dahulu |
| `function slugify_text(text) does not exist` | 42883 | File 01 gagal | Jalankan ulang **file 01** |
| `function handle_new_user() does not exist` | 42883 | File 02 gagal sebelum fungsi ini dibuat | Rollback, ulang file 01–02 |
| `function get_dashboard_stats() does not exist` | 42883 | File 07 belum dijalankan atau gagal | Jalankan ulang **file 07** |
| `function convert_savings_to_booking(uuid, uuid, text) does not exist` | 42883 | File 07 gagal | Ulang file 07 (pastikan file 03 sudah OK dulu) |

---

### Pola 6 — Syntax / Fitur Tidak Didukung

| Pesan error | Kode | Penyebab | Tindakan |
|---|---|---|---|
| `syntax error at or near "GENERATED"` | 42601 | Versi Postgres < 12. Supabase menggunakan Postgres 15 — tidak seharusnya terjadi. | Pastikan project Supabase tidak menggunakan versi lama. Cek: `SELECT version();` |
| `column "remaining_amount" can only be updated to DEFAULT` | 428C9 | Kode aplikasi mencoba menulis ke kolom `GENERATED ALWAYS`. | Hapus `remaining_amount` dari semua `INSERT`/`UPDATE` di kode aplikasi — nilainya otomatis dihitung |
| `cannot use subquery in check constraint` | 0A000 | Percobaan menambahkan `CHECK` yang berisi subquery | Gunakan RLS policy, bukan CHECK constraint, untuk validasi antar tabel |
| `there is no unique constraint matching given keys for referenced table` | 42830 | Foreign key merujuk ke kolom yang tidak memiliki UNIQUE/PRIMARY KEY | Cek definisi tabel induk; mungkin file induk gagal sebagian |

---

### Pola 7 — Error Saat DROP / Rollback

| Pesan error | Kode | Penyebab | Tindakan |
|---|---|---|---|
| `cannot drop table X because other objects depend on it` | 2BP01 | Mencoba drop manual tanpa CASCADE | Selalu gunakan file `09_rollback.sql` yang sudah menyertakan `CASCADE` |
| `cannot drop function X because other objects depend on it` | 2BP01 | Sama seperti di atas | Sama |
| `trigger "on_auth_user_created" for relation "users" does not exist` | 42704 | File 09 dijalankan di database yang belum pernah dimigrasikan | Aman diabaikan — semua DROP di file 09 menggunakan `IF EXISTS` |

---

### Alur Diagnosis Cepat

```
Error muncul saat menjalankan file N
        │
        ▼
Apakah pesan berisi "does not exist"?
   ├── Ya → Tabel/fungsi dari file sebelumnya tidak ada
   │         → Cek file N-1, N-2, dst. (lihat Pola 1 & 5)
   └── Tidak
        │
        ▼
Apakah pesan berisi "already exists" atau "duplicate key"?
   ├── Ya → File ini pernah dijalankan sebagian
   │         → Jalankan 09_rollback.sql, lalu ulang dari 01
   └── Tidak
        │
        ▼
Apakah pesan berisi "row-level security" atau "permission denied"?
   ├── Ya → RLS/policy issue (lihat Pola 4)
   └── Tidak
        │
        ▼
Jalankan 08_verify_rls.sql → lihat baris ❌ FAIL untuk petunjuk spesifik
```

---

### Reset Penuh (Cara Paling Aman)

Jika tidak yakin di mana kegagalan terjadi, reset bersih selalu berhasil:

```
1. Jalankan 09_rollback.sql   ← hapus semua objek
2. Jalankan 01_extensions_helpers.sql
3. Jalankan 02_core_entities.sql        ← perhatikan output "File 02 — OK"
4. Jalankan 03_customers_bookings.sql
5. Jalankan 04_operations_portal.sql
6. Jalankan 05_finance_hr_company.sql
7. Jalankan 06_ecommerce.sql
8. Jalankan 07_functions_rpc_seed.sql
9. Jalankan 08_verify_rls.sql           ← konfirmasi ✅ PASS
```

Setiap file diakhiri dengan `SELECT 'File XX — ... : OK'` — jika baris itu muncul, file tersebut berhasil penuh.

---

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
