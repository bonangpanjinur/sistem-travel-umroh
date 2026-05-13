# Panduan Migrasi SQL — Vinstour Travel Portal

> **Semua file SQL sudah terkumpul di satu tempat ini.**
> Jalankan di **Supabase Dashboard → SQL Editor**.

---

## Struktur Folder

```
sql/
├── README.md                    ← Panduan ini
├── MASTER_FRESH_INSTALL.sql     ← Untuk install BARU — jalankan satu kali
├── PATCHES_ONLY.sql             ← Untuk update existing DB (fase 21-39)
├── CONSOLIDATED_fase1-20.sql    ← Backup konsolidasi fase 1-20
└── migrations/                  ← Semua file individual berurutan (001–039)
    ├── 001_foundation.sql
    ├── 002_fase1_...sql
    ├── ...
    └── 039_patch_...sql
```

---

## Cara Pakai

### Pilihan A — Fresh Install (Database Kosong)
Gunakan jika database Supabase belum pernah diisi sebelumnya.

1. Buka **Supabase Dashboard** → project Anda → **SQL Editor**
2. Klik **New Query**
3. Buka file `sql/MASTER_FRESH_INSTALL.sql` (320KB, 7483 baris)
4. Paste seluruh isi → klik **Run**
5. Tunggu hingga selesai. Jika ada error, lihat bagian Troubleshooting di bawah.

> ✅ Semua perintah menggunakan `IF NOT EXISTS` — aman dijalankan ulang jika terjadi error di tengah.

---

### Pilihan B — Update Existing (Database Sudah Ada Fase 1-20)
Gunakan jika database sudah berjalan tapi belum punya fitur terbaru (toko, fase 21-23, patches).

1. Buka **Supabase Dashboard** → **SQL Editor**
2. Buka file `sql/PATCHES_ONLY.sql` (1502 baris)
3. Paste seluruh isi → klik **Run**

---

### Pilihan C — Jalankan Satu per Satu (Paling Aman)
Jika ingin kontrol penuh, jalankan file satu per satu dari folder `migrations/` sesuai urutan nomor.

| Urutan | File | Isi |
|--------|------|-----|
| 001 | `001_foundation.sql` | Tabel inti: packages, departures, bookings, customers, payments |
| 002 | `002_fase1_membership_branch_commission.sql` | Membership, cabang, komisi |
| 003 | `003_fase2_public_website.sql` | Blog, testimoni, halaman publik |
| 004 | `004_fase3_customer_portal.sql` | Tabungan, loyalitas, portal customer |
| 005 | `005_fase4_6_analytics_notif_operational.sql` | Analytics, notifikasi, komunikasi |
| 006 | `006_whatsapp_tables.sql` | Konfigurasi & log WhatsApp |
| 007 | `007_fase6_app_settings_va_targets.sql` | App settings, virtual accounts, target agen |
| 008 | `008_dashboard_access_config.sql` | Konfigurasi akses dashboard per role |
| 009 | `009_payment_deadline_reminders.sql` | Reminder deadline pembayaran |
| 010 | `010_fase4_push_visa.sql` | Push subscriptions, visa applications |
| 011 | `011_fase5_rbac_improvements.sql` | RBAC granular, permissions, role matrix |
| 012 | `012_hr_enhancements.sql` | Payroll, cuti, penilaian kinerja |
| 013 | `013_operational_integration.sql` | Integrasi jamaah-kamar-equipment |
| 014 | `014_flexible_rooming_groups.sql` | Pembagian kamar fleksibel (multi-select) |
| 015 | `015_multi_mahram_rooming.sql` | Multi-mahram & enhancement rooming |
| 016 | `016_fix_missing_fkeys.sql` | Perbaikan foreign key yang hilang |
| 017 | `017_fase11_15_leads_manasik_reviews.sql` | Leads CRM, manasik digital, ulasan |
| 018 | `018_fase16_new_tables.sql` | SOS alerts, visa status logs, approval requests |
| 019 | `019_fase17_remaining_tables.sql` | Vendor contracts, training modules, media |
| 020 | `020_fase18_core_settings.sql` | company_settings, bank_accounts, website_settings |
| 021 | `021_fase19_branch_kpi_targets.sql` | Target KPI bulanan per cabang |
| 022 | `022_fase20_webhooks_push.sql` | Webhook configs, push subscriptions |
| 023 | `023_fase20_chat_bubble_color.sql` | Kolom warna bubble chat |
| 024 | `024_store_ecommerce.sql` | Toko: categories, products, orders, shipments |
| 025 | `025_store_product_reviews.sql` | Ulasan produk toko |
| 026 | `026_fase21_integration_fixes.sql` | Perbaikan integrasi: customer_notifications, attendance |
| 027 | `027_fase22_muthawif_evaluations.sql` | Penilaian jamaah oleh muthawif |
| 028 | `028_fase23_payments_transaction_id.sql` | Kolom transaction_id & payment_type di payments |
| 029 | `029_patch_auto_commission_trigger.sql` | Trigger komisi otomatis ke parent agent |
| 030 | `030_patch_store_categories_extra.sql` | Tambahan kolom store_categories |
| 031 | `031_patch_push_subscriptions.sql` | Tambahan tabel push_subscriptions |
| 032 | `032_patch_ibadah_progress.sql` | Tabel ibadah_progress jamaah |
| 033 | `033_patch_push_outbox.sql` | Push outbox & antrian notifikasi |
| 034 | `034_patch_audit_logs_policy_fix.sql` | Perbaikan policy audit_logs |
| 035 | `035_patch_security_revoke_trigger_funcs.sql` | Keamanan: revoke execute trigger functions |
| 036 | `036_patch_customer_mahrams_rls.sql` | RLS policy customer_mahrams |
| 037 | `037_patch_referral_policies_fix.sql` | Perbaikan policy referral_codes & usages |
| 038 | `038_patch_storage_upload_policy.sql` | Policy upload dokumen customer |
| 039 | `039_patch_website_settings_layout.sql` | Kolom layout_variant & theme_overrides |

---

## Migrasi yang Perlu Dibuat di Masa Depan

File-file berikut **belum dibuat** tapi dibutuhkan oleh fitur yang sudah ada di frontend:

| Nomor Berikutnya | File (rencana) | Isi |
|------------------|----------------|-----|
| 040 | `040_fase24_view_financial_summary.sql` | Database VIEW `v_financial_summary` untuk AdminAdvancedReports |
| 041 | `041_fase24_approval_requests.sql` | Tabel `approval_requests` jika belum ada |
| 042 | `042_fase24_booking_installments.sql` | Tabel `booking_installment_schedules` |
| 043 | `043_fase24_package_label.sql` | Kolom `label` di tabel packages (Sprint 8 - P6) |
| 044 | `044_fase25_scheduled_reports.sql` | Tabel `scheduled_reports`, `scheduled_report_logs` |
| 045 | `045_fase25_totp_2fa.sql` | Kolom TOTP secret di profiles untuk 2FA |
| 046 | `046_fase25_cron_job_logs.sql` | Log eksekusi cron job (reminder, laporan) |

---

## Tips Supabase SQL Editor

- **Batasan ukuran**: Supabase SQL Editor bisa menangani file besar, tapi jika timeout, pecah menjadi beberapa bagian
- **Error `42P01` (relation does not exist)**: Jalankan file nomor lebih kecil dulu (dependency belum dibuat)
- **Error `42710` (already exists)**: Normal — `IF NOT EXISTS` melindungi dari ini, tapi beberapa kolom ALTER mungkin gagal. Abaikan saja
- **RLS Policy error**: Pastikan Anda login sebagai `postgres` atau `service_role`, bukan `anon`
- **Setelah migrasi**: Aktifkan **Realtime** untuk tabel: `bookings`, `customer_notifications`, `attendance_records`, `sos_alerts`, `chatbot_logs`

---

## Tabel Utama yang Dibuat (Ringkasan)

| Kelompok | Tabel-tabel Utama |
|----------|-------------------|
| **Core Booking** | `packages`, `departures`, `bookings`, `booking_passengers`, `payments`, `refunds` |
| **Pelanggan** | `customers`, `customer_documents`, `customer_mahrams`, `customer_notifications` |
| **Keuangan** | `bank_accounts`, `cash_transactions`, `vendor_costs`, `payroll_records`, `savings_plans`, `savings_payments` |
| **Keberangkatan** | `room_assignments`, `departure_itineraries`, `departure_budgets`, `attendance_records` |
| **CRM & Leads** | `leads`, `chat_leads`, `chatbot_logs`, `follow_up_logs` |
| **Komunikasi** | `whatsapp_config`, `whatsapp_logs`, `customer_notifications`, `push_subscriptions`, `push_outbox` |
| **Konten** | `blog_articles`, `banners`, `marketing_materials`, `faqs`, `testimonials`, `announcements` |
| **HR** | `employees`, `payroll_records`, `leave_requests`, `performance_reviews`, `training_modules`, `training_progress` |
| **Equipment** | `equipment_categories`, `equipment_items`, `equipment_distributions` |
| **Toko** | `store_categories`, `store_products`, `store_orders`, `store_order_items`, `store_shipments`, `store_product_reviews` |
| **Agen & Cabang** | `agents`, `branches`, `agent_commissions`, `branch_commissions`, `branch_monthly_targets` |
| **Loyalitas** | `loyalty_points`, `loyalty_redemptions`, `referral_codes`, `referral_usages`, `memberships`, `coupons` |
| **Pengaturan** | `company_settings`, `website_settings`, `app_settings`, `whatsapp_config`, `api_keys`, `webhooks` |
| **Keamanan** | `user_roles`, `permissions_list`, `role_permissions`, `audit_logs`, `activity_logs` |
| **Visa & Haji** | `visa_applications`, `visa_status_logs`, `haji_registrations`, `siskohat_sync_logs` |
| **Muthawif** | `muthawifs`, `muthawif_jamaah_evaluations`, `sos_alerts` |

---

*Folder ini dibuat otomatis dari konsolidasi semua file SQL yang tersebar. Terakhir diperbarui: Mei 2026.*
