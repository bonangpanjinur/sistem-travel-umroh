# Rencana SQL — Vinstour Travel Portal
## Analisis Lengkap Fitur + Peta Dependensi + Rencana Migrasi Terkonsolidasi

---

## 1. ROOT CAUSE ERROR "column branch_id does not exist"

### Masalah
File `supabase_clean_migration/COMPLETE_SETUP.sql` membuat tabel `store_products` (yang punya kolom `branch_id UUID REFERENCES branches(id)`) **sebelum** tabel `branches` dibuat. PostgreSQL langsung menolak karena FK reference ke tabel yang belum ada.

### Pola Salah (di COMPLETE_SETUP.sql)
```
06_ecommerce.sql → store_products → REFERENCES branches(id)  ← ERROR
02_core_entities.sql → branches                              ← belum dibuat
```

### Solusi
Tabel harus dibuat dalam urutan topologi dependensi FK yang benar. Lihat **Bagian 4** untuk urutan yang tepat.

---

## 2. DAFTAR LENGKAP FITUR SISTEM

### A. Fondasi & RBAC
| Fitur | Tabel Utama | Deskripsi |
|-------|-------------|-----------|
| User Auth Extension | profiles | Ekstensi auth.users, auto-create on register |
| Role-Based Access | user_roles | Multi-role per user (super_admin, owner, admin, branch_manager, finance, operational, sales, marketing, hr, equipment, agent, sub_agent, customer, jamaah, visa_officer, it) |
| Permission System | role_permissions | Granular permission key per role |
| Helper Functions | update_updated_at_column, handle_new_user, slugify_text | Trigger & utility functions |

### B. Manajemen Organisasi
| Fitur | Tabel Utama | Deskripsi |
|-------|-------------|-----------|
| Cabang | branches | Kantor cabang, manager, slug website, branding (signature, stamp, logo, letterhead) |
| Agen | agents | Hierarki multi-level (parent_agent_id), website bio, slug |
| Karyawan | employees | HR data, jabatan, departemen |
| Vendor/Mitra | vendors | Maskapai, hotel, bus, katering, asuransi, visa |
| Kontrak Vendor | vendor_contracts | Kontrak per vendor, reminder expiry |
| Pembimbing | muthawifs | Muthawif/pembimbing, evaluasi, rating |
| Evaluasi Muthawif | muthawif_evaluations | Rating per keberangkatan |

### C. Paket & Keberangkatan
| Fitur | Tabel Utama | Deskripsi |
|-------|-------------|-----------|
| Paket Umroh/Haji | packages | Paket wisata, harga multi-kamar, kuota, HPP template |
| HPP Template Paket | package_hpp_templates | Template biaya pokok per paket |
| Jadwal Keberangkatan | departures | Per package, kuota, harga adult/child/infant |
| Airlines | airlines | Data maskapai |
| Hotels | hotels | Data hotel multi-kota |
| Hotel Rooms | hotel_rooms, hotel_room_capacities, hotel_room_numbers | Nomor kamar, kapasitas, multi-hotel per kota |
| Multi-Hotel per Kota | departure_hotels | Hotel dinamis per keberangkatan (Makkah, Madinah, Istanbul, Dubai, dll.) |

### D. Booking & Pembayaran
| Fitur | Tabel Utama | Deskripsi |
|-------|-------------|-----------|
| Booking | bookings | Pemesanan jamaah, multi-penumpang, status, referral |
| Penumpang Booking | booking_passengers | Daftar penumpang per booking, check-in status |
| Line Items Booking | booking_line_items | Rincian item biaya per booking |
| Status History | booking_status_history | Riwayat perubahan status booking |
| Seat Hold | seat_holds | Reservasi kursi sementara sebelum booking final |
| Pembayaran | payments | Multi-payment per booking, bukti, status verifikasi |
| Sinkronisasi Total | payment_sync_trigger | Auto-update paid_amount & payment_status di bookings |
| Reminder Jatuh Tempo | payment_deadline_reminders | Jadwal reminder H-7/H-3, composite unique (booking_id, days_before) |

### E. Keuangan Keberangkatan
| Fitur | Tabel Utama | Deskripsi |
|-------|-------------|-----------|
| HPP per Item | departure_cost_items | Biaya pokok (hotel, maskapai, visa, handling, dll.) |
| Pengeluaran Operasional | departure_expenses | Realisasi pengeluaran per keberangkatan |
| Pendapatan Tambahan | departure_other_revenues | Revenue non-booking (upgrade, addon, dll.) |
| Ringkasan Keuangan | departure_financial_summary | Cache P&L per keberangkatan (auto-calculated) |
| Anggaran | departure_budgets | Perencanaan anggaran per kategori |
| Withdrawal Requests | withdrawal_requests | Permintaan pencairan komisi agen |

### F. Customer & Dokumen
| Fitur | Tabel Utama | Deskripsi |
|-------|-------------|-----------|
| Customer/Jamaah | customers | Data jamaah, NIK, paspor, haji porsi, SISKOHAT |
| Dokumen Jamaah | customer_documents | Upload dokumen (paspor, KTP, foto, visa) |
| Mahram | customer_mahrams | Data mahram jamaah wanita |
| Room Assignment | room_assignments | Penugasan kamar hotel per keberangkatan |
| Visa Application | visa_applications | Permohonan visa, status tracking |
| Visa Status Log | visa_status_logs | Riwayat perubahan status visa |
| SISKOHAT | siskohat_sync_logs | Log sinkronisasi data ke Kemenag |

### G. Manasik & Pelatihan
| Fitur | Tabel Utama | Deskripsi |
|-------|-------------|-----------|
| Sesi Manasik | manasik_sessions | Jadwal manasik per keberangkatan |
| Kehadiran Manasik | manasik_attendances | Presensi jamaah di manasik |
| Modul Pelatihan | training_modules | Materi pelatihan untuk agen |
| Kuis Modul | training_quizzes | Soal kuis per modul |
| Progress Pelatihan | agent_training_progress | Status belajar agen per modul |

### H. Perlengkapan & Procurement
| Fitur | Tabel Utama | Deskripsi |
|-------|-------------|-----------|
| Distribusi Perlengkapan | equipment_distributions | Distribusi item per jamaah |
| Item Distribusi | equipment_distribution_items | Konfirmasi terima per item (dengan foto) |
| Tipe Perlengkapan Paket | package_type_equipment | Item perlengkapan standar per tipe paket |
| Referensi Bagasi | baggage_reference_items | Referensi berat barang umum |

### I. Loyalitas & Gamifikasi
| Fitur | Tabel Utama | Deskripsi |
|-------|-------------|-----------|
| Loyalty Points | loyalty_points | Poin reward jamaah, sistem loyalitas |
| Badges | customer_badges | Badge/penghargaan berdasarkan kriteria |

### J. Toko E-Commerce
| Fitur | Tabel Utama | Deskripsi |
|-------|-------------|-----------|
| Kategori Produk | store_categories | Kategori toko online |
| Produk | store_products | Produk ibadah, ihram, koper, kesehatan, dll. (branch-aware) |
| Pesanan | store_orders | Order toko, multi-status, per customer |
| Item Pesanan | store_order_items | Detail produk per order |
| Pengiriman | store_shipments | Tracking pengiriman kurir |
| Ulasan Produk | store_product_reviews | Rating + komentar jamaah setelah delivered |
| Procurement | store_procurement_orders, store_procurement_items | Pembelian stok dari supplier |
| Opname Stok | store_stock_opname, store_stock_opname_items | Rekonsiliasi stok fisik vs sistem |

### K. WhatsApp & Komunikasi
| Fitur | Tabel Utama | Deskripsi |
|-------|-------------|-----------|
| Config WA | whatsapp_config | Multi-provider (Fonnte, Wablas, dll.), masked key |
| Template Pesan | whatsapp_message_templates | Template dengan variabel dinamis |
| Log Pengiriman | whatsapp_send_logs | Riwayat setiap pesan terkirim/gagal |
| Broadcast Kampanye | wa_broadcast_campaigns | Kampanye broadcast tersegmentasi |
| Log Broadcast | wa_broadcast_logs | Log per penerima per kampanye |
| Roadmap WA | wa_feature_roadmap | Tracking pengembangan fitur WA |
| Push Notifications | push_subscriptions | Subscription push notif browser/mobile |
| Notifikasi Internal | notifications | Notifikasi in-app |
| Webhook Config | webhooks, webhook_logs | Webhook outbound ke sistem lain |

### L. Website & Marketing
| Fitur | Tabel Utama | Deskripsi |
|-------|-------------|-----------|
| Website Settings | website_settings | Tema, warna, font, footer per agent/branch |
| Menu Items | menu_items | Konfigurasi menu sidebar admin |
| Company Settings | company_settings | Key-value konfigurasi global perusahaan |
| Bank Accounts | bank_accounts | Rekening pembayaran |
| Media Gallery | media_gallery | Video testimoni, virtual tour, foto hotel |
| Leads | leads | Data prospek customer |
| Sales Targets | sales_targets | Target penjualan per staff/agen |
| Broadcast WA | wa_blast_logs (alias whatsapp_send_logs) | Log blast WA massal |

### M. Operasional Lanjut
| Fitur | Tabel Utama | Deskripsi |
|-------|-------------|-----------|
| SOS Alert | sos_alerts | Darurat jamaah di lapangan (GPS location) |
| Approval Requests | approval_requests | Multi-level approval (refund, diskon, batal) |
| Approval Actions | approval_actions | Riwayat aksi per level approval |
| Approval Config | approval_configs | Aturan threshold per tipe approval |
| KPI Targets | (di company_settings) | Target KPI bulanan |
| Dashboard Config | dashboard_access_config | Konfigurasi widget per role |
| Dashboard Stats | dashboard_stats | Cache statistik dashboard |
| Financial Summary | financial_monthly_summary | Ringkasan keuangan bulanan |
| Invoice Templates | invoice_templates | Template invoice dengan field dinamis |
| Document Templates | document_templates | Template dokumen (invoice, e-ticket, sertifikat, surat) |
| Web Vitals | web_vitals_metrics | Monitoring performa halaman |

### N. HR & Karyawan
| Fitur | Tabel Utama | Deskripsi |
|-------|-------------|-----------|
| Cuti Karyawan | employee_leaves | Pengajuan cuti, approval multi-level |
| Jadwal Kerja | employee_schedules | Jadwal shift karyawan |
| Absensi | (in employee_leaves) | Rekap absensi |

---

## 3. PETA DEPENDENSI FOREIGN KEY

```
auth.users (Supabase internal)
  ├── profiles
  ├── user_roles → (branches FK diisi setelah branches ada)
  ├── role_permissions (no FK)
  ├── hotels (no FK ke tabel custom)
  ├── vendors (no FK ke tabel custom)
  ├── airlines (no FK ke tabel custom)
  ├── branches (→ auth.users)
  │     ├── agents (→ branches, auth.users, self)
  │     │     ├── website_settings (→ agents, branches)
  │     │     ├── agent_training_progress (→ agents, training_modules)
  │     │     ├── agent_override_commissions (→ agents, bookings)
  │     │     └── withdrawal_requests (→ agents)
  │     ├── muthawifs (→ branches)
  │     ├── employees (→ branches, auth.users)
  │     ├── customers (→ branches, auth.users)
  │     │     ├── customer_documents (→ customers)
  │     │     ├── customer_mahrams (→ customers)
  │     │     ├── loyalty_points (→ customers)
  │     │     ├── customer_badges (→ customers)
  │     │     ├── sos_alerts (→ customers, branches, muthawifs)
  │     │     └── store_orders (→ customers, branches, auth.users)
  │     ├── packages (→ branches)
  │     │     ├── package_hpp_templates (→ packages)
  │     │     └── departures (→ packages)
  │     │           ├── departure_hotels (→ departures, hotels, airlines)
  │     │           ├── departure_cost_items (→ departures, hotels, airlines, profiles)
  │     │           ├── departure_expenses (→ departures, bookings, profiles)
  │     │           ├── departure_other_revenues (→ departures, bookings, profiles)
  │     │           ├── departure_financial_summary (→ departures)
  │     │           ├── departure_budgets (→ departures, auth.users)
  │     │           ├── manasik_sessions (→ departures, branches)
  │     │           ├── seat_holds (→ departures, customers)
  │     │           └── bookings (→ customers, departures, agents)
  │     │                 ├── booking_passengers (→ bookings, customers)
  │     │                 ├── booking_line_items (→ bookings)
  │     │                 ├── booking_status_history (→ bookings, auth.users)
  │     │                 ├── payments (→ bookings)
  │     │                 ├── payment_deadline_reminders (→ bookings)
  │     │                 ├── visa_applications (→ bookings, customers, departures)
  │     │                 ├── manasik_attendances (→ manasik_sessions, booking_passengers)
  │     │                 └── store_orders (→ customers, branches)
  │     ├── store_categories (no FK)
  │     └── store_products (→ store_categories, branches)  ← INI YANG ERROR
  │           ├── store_orders (→ customers, branches)
  │           │     ├── store_order_items (→ store_orders, store_products)
  │           │     ├── store_shipments (→ store_orders)
  │           │     └── store_product_reviews (→ store_orders, store_products)
  │           └── store_procurement_orders (→ branches, vendors)
  │                 └── store_procurement_items (→ store_procurement_orders, store_products)
  ├── training_modules (no FK ke custom tabel)
  │     └── training_quizzes (→ training_modules)
  ├── media_gallery (→ hotels, packages)
  ├── whatsapp_config (no FK ke custom tabel)
  ├── wa_broadcast_campaigns (→ auth.users)
  │     └── wa_broadcast_logs (→ wa_broadcast_campaigns, bookings)
  ├── document_templates (→ branches)
  ├── approval_requests (→ branches, auth.users)
  │     └── approval_actions (→ approval_requests, auth.users)
  ├── vendor_contracts (→ vendors, branches)
  ├── menu_items (no FK)
  ├── company_settings (no FK)
  ├── bank_accounts (no FK)
  └── invoice_templates (no FK)
```

---

## 4. URUTAN EKSEKUSI YANG BENAR

```
TAHAP 1: Extensions & Helpers
  - uuid-ossp, pgcrypto
  - update_updated_at_column()
  - slugify_text()
  - _create_updated_at_trigger() (helper macro)

TAHAP 2: Tabel Standalone (no FK ke custom tables)
  - profiles              (→ auth.users only)
  - user_roles            (→ auth.users only)
  - role_permissions      (no FK)
  - hotels                (no FK)
  - vendors               (no FK)
  - airlines              (no FK)
  - store_categories      (no FK)
  - menu_items            (no FK)
  - company_settings      (no FK)
  - bank_accounts         (no FK)
  - training_modules      (no FK ke custom)
  - training_quizzes      (→ training_modules)
  - invoice_templates     (no FK)
  - baggage_reference_items (no FK)

TAHAP 3: Branches (pivot utama)
  - branches              (→ auth.users only)

TAHAP 4: Entities bergantung pada branches
  - agents                (→ branches)
  - muthawifs             (→ branches)
  - employees             (→ branches)
  - customers             (→ branches)

TAHAP 5: Products & Packages (bergantung branches)
  - store_products        (→ store_categories, branches)
  - packages              (→ branches)

TAHAP 6: Departures & Website
  - departures            (→ packages)
  - website_settings      (→ agents, branches)
  - whatsapp_config       (no deps)
  - wa_feature_roadmap    (no deps)
  - document_templates    (→ branches)
  - media_gallery         (→ hotels, packages)
  - vendor_contracts      (→ vendors, branches)

TAHAP 7: Bookings (bergantung customers, departures, agents)
  - seat_holds            (→ departures, customers)
  - bookings              (→ customers, departures, agents)

TAHAP 8: Sub-tabel bookings
  - booking_passengers    (→ bookings, customers)
  - booking_line_items    (→ bookings)
  - booking_status_history(→ bookings)
  - payments              (→ bookings)
  - payment_deadline_reminders (→ bookings)
  - visa_applications     (→ bookings, customers, departures)

TAHAP 9: Operasional keberangkatan
  - room_assignments      (→ departures)
  - manasik_sessions      (→ departures, branches)
  - manasik_attendances   (→ manasik_sessions, booking_passengers)
  - departure_hotels      (→ departures, hotels, airlines)
  - departure_cost_items  (→ departures, hotels, airlines, profiles)
  - departure_expenses    (→ departures, bookings, profiles)
  - departure_other_revenues (→ departures, bookings, profiles)
  - departure_financial_summary (→ departures)
  - departure_budgets     (→ departures)

TAHAP 10: Customer support
  - customer_documents    (→ customers)
  - customer_mahrams      (→ customers)
  - loyalty_points        (→ customers)
  - customer_badges       (→ customers)
  - sos_alerts            (→ customers, branches, muthawifs)
  - visa_status_logs      (→ visa_applications, customers)
  - equipment_distributions (→ customers, departures)

TAHAP 11: Toko E-Commerce
  - store_orders          (→ customers, branches)
  - store_order_items     (→ store_orders, store_products)
  - store_shipments       (→ store_orders)
  - store_product_reviews (→ store_orders, store_products, customers)
  - store_procurement_orders (→ branches, vendors)
  - store_procurement_items  (→ store_procurement_orders, store_products)
  - store_stock_opname    (→ branches)
  - store_stock_opname_items (→ store_stock_opname, store_products)

TAHAP 12: Agen & Approval
  - agent_training_progress (→ agents, training_modules)
  - agent_override_commissions (→ bookings, agents)
  - withdrawal_requests   (→ agents)
  - approval_requests     (→ branches)
  - approval_actions      (→ approval_requests)
  - approval_configs      (no FK ke custom)
  - muthawif_evaluations  (→ muthawifs, bookings, departures)

TAHAP 13: WA & Komunikasi
  - whatsapp_message_templates (no FK)
  - whatsapp_send_logs    (→ whatsapp_config, bookings)
  - wa_broadcast_campaigns (→ auth.users)
  - wa_broadcast_logs     (→ wa_broadcast_campaigns, bookings)
  - push_subscriptions    (→ auth.users)
  - notifications         (→ auth.users)
  - webhooks              (no FK)
  - webhook_logs          (→ webhooks)
  - siskohat_sync_logs    (→ branches)

TAHAP 14: Dashboard & Settings Lanjut
  - dashboard_access_config (no FK)
  - dashboard_stats       (no FK)
  - financial_monthly_summary (→ branches)
  - sales_targets         (→ branches, auth.users)
  - leads                 (→ branches, auth.users)
  - web_vitals_metrics    (no FK)

TAHAP 15: ALTER TABLE (tambah kolom ke tabel yang sudah ada)
  - branches: signature_url, stamp_url, logo_url, letterhead_data
  - customers: nomor_porsi_haji, embarkasi_kode, estimasi_keberangkatan_haji
  - bookings: bagasi_kg_allowed, booking_status, payment_deadline, remaining_amount, total_pax, booking_type, dp_amount, dp_percentage, savings_mode
  - departures: price_adult, price_child, price_infant, child_price_percent, infant_price_percent
  - packages: child_price_percent, infant_price_percent
  - payment_deadline_reminders: constraint UNIQUE (booking_id, days_before)
  - whatsapp_config: display_name, provider_config, webhook_secret, updated_by, last_tested_at, last_test_ok
  - user_roles: role enum tambah 'it', 'marketing'

TAHAP 16: Functions & Triggers
  - handle_new_user() trigger on auth.users
  - sync_booking_payment_totals() + trigger
  - generate_booking_code()
  - generate_store_order_number()
  - recalculate_departure_financial_summary()
  - preview_auto_schedule_reminders()
  - auto_schedule_payment_reminders()
  - get_wa_config_safe()
  - get_public_packages_with_departures()
  - get_booking_detail_public()
  - update_booking_seat_count()

TAHAP 17: Seed Data
  - role_permissions (semua role × semua permission keys)
  - menu_items
  - company_settings defaults
  - bank_accounts contoh
  - store_categories defaults
  - approval_configs defaults
  - baggage_reference_items
  - wa_feature_roadmap
  - document_templates defaults
```

---

## 5. ENUM & KONSTANTA PENTING

### app_role values (di user_roles.role CHECK)
```
super_admin, owner, admin, branch_manager, finance, operational,
sales, marketing, hr, equipment, agent, sub_agent, customer,
jamaah, visa_officer, it
```
> **Catatan:** `app_role` bukan PostgreSQL ENUM type — ini TEXT dengan CHECK constraint di user_roles. Tambahan nilai seperti `it` dan `marketing` dilakukan via ALTER TABLE user_roles DROP CONSTRAINT + ADD CONSTRAINT baru.

### booking_status values
```
pending, confirmed, cancelled, completed
```

### payment_status values
```
unpaid, partial, paid, refunded
```

### store_order status values
```
pending, confirmed, processing, shipped, delivered, cancelled, refunded
```

---

## 6. FILE SQL YANG DIHASILKAN

### Target: `supabase_clean_migration/MASTER_MIGRATION.sql`
- Satu file lengkap, fully idempotent (IF NOT EXISTS, ON CONFLICT DO NOTHING, DROP POLICY IF EXISTS)
- Urutan tahap 1–17 seperti di atas
- Semua tabel dari fase0 sampai fase32 + store + doc_sprint2 + numbered migrations
- Includes ALTER TABLE untuk kolom tambahan dari migrasi lanjutan
- Includes semua RLS policies
- Includes semua seed data
- Includes semua functions & triggers

---

## 7. CATATAN PENTING UNTUK MIGRASI

1. **`auth.users` dan `auth` schema** — tersedia di Supabase secara built-in. Di Neon/PostgreSQL biasa perlu dibuat manual atau digantikan dengan tabel `users` sendiri.

2. **`auth.uid()` dalam RLS** — fungsi Supabase. Di Neon perlu `current_setting('app.current_user_id', true)::UUID` atau JWT claims.

3. **`auth.role()` dalam RLS** — deprecated di Supabase, tapi masih berfungsi. Ganti dengan `auth.uid() IS NOT NULL` untuk cek authenticated.

4. **`SECURITY DEFINER` functions** — jalankan dengan hak superuser, search_path harus di-set eksplisit.

5. **uuid_generate_v4() vs gen_random_uuid()** — kedua digunakan secara mix. Pastikan ekstensi `uuid-ossp` sudah diaktifkan.

6. **GENERATED ALWAYS AS ... STORED** — PostgreSQL 12+, didukung penuh.

7. **Kolom `app_role` enum** — Beberapa migration menggunakan `CREATE TYPE app_role AS ENUM(...)` yang perlu `ALTER TYPE ... ADD VALUE IF NOT EXISTS`. Pastikan tipe dibuat sebelum digunakan.

---

## 8. CHECKLIST SEBELUM APPLY

- [ ] Database kosong / fresh (atau gunakan IF NOT EXISTS agar aman)
- [ ] Extension `uuid-ossp` diaktifkan
- [ ] Extension `pgcrypto` diaktifkan
- [ ] Jalankan sebagai superuser / database owner
- [ ] Jika Supabase: jalankan di SQL Editor
- [ ] Jika Neon/other: sesuaikan `auth.users` → tabel users sendiri
- [ ] Setelah apply: verify dengan `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;`
- [ ] Expected: ≥ 75 tabel di schema public
