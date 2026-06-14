# Final Database Coverage Report — Vinstour Travel Portal
> Status implementasi setiap tabel terhadap blueprint lengkap
> Legend: ✅ IMPLEMENTED | ⚠️ PARTIAL | ❌ MISSING
> Generated: 2025-07-06

---

## Domain 1: Core Infrastructure (Infrastruktur Inti)

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 1 | `profiles` | ✅ IMPLEMENTED | 002 | FK auth.users, session_version |
| 2 | `user_roles` | ✅ IMPLEMENTED | 002 | Fine-grained RBAC |
| 3 | `permissions_list` | ✅ IMPLEMENTED | 002 | Master registry |
| 4 | `role_permissions` | ✅ IMPLEMENTED | 002 | can_view/create/edit/delete |
| 5 | `user_permission_overrides` | ❌ MISSING | → 036 | Override per-user |
| 6 | `staff_invitations` | ✅ IMPLEMENTED | 002 | Token-based invite |
| 7 | `menu_items` | ✅ IMPLEMENTED | 002 | Dynamic navigation |
| 8 | `audit_logs` | ✅ IMPLEMENTED | 002 | Immutable change log |
| 9 | `rbac_audit_trail` | ✅ IMPLEMENTED | 002 | RBAC history |
| 10 | `activity_logs` | ❌ MISSING | → 037 | Granular activity (beda dgn audit_logs) |
| 11 | `login_attempts` | ❌ MISSING | → 036 | Rate-limit brute force |
| 12 | `dashboard_access_config` | ❌ MISSING | → 036 | Widget config per role |
| 13 | `dashboard_access_audit_log` | ❌ MISSING | → 036 | |
| 14 | `access_policies` | ❌ MISSING | → 036 | ABAC policy tingkat lanjut |
| 15 | `company_features` | ❌ MISSING | → 035 | Feature flags |
| 16 | `notification_templates` | ✅ IMPLEMENTED | 002 | |
| 17 | `notifications` | ✅ IMPLEMENTED | 002 | In-app inbox |
| 18 | `otp_codes` | ✅ IMPLEMENTED | 002 | |
| 19 | `user_2fa_settings` | ✅ IMPLEMENTED | 002 | TOTP/SMS/Email |
| 20 | `push_subscriptions` | ✅ IMPLEMENTED | 002 | Web-push endpoints |
| 21 | `push_outbox` | ✅ IMPLEMENTED | 002 | Queued delivery |
| 22 | `email_logs` | ✅ IMPLEMENTED | 002 | Outgoing email log |

**Domain 1 Summary: 15 IMPLEMENTED | 0 PARTIAL | 7 MISSING**

---

## Domain 2: Organisation & Branch (Organisasi & Cabang)

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 23 | `branches` | ✅ IMPLEMENTED | 003 | Multi-cabang |
| 24 | `departments` | ❌ MISSING | → 032 | Departemen HR |
| 25 | `employees` | ✅ IMPLEMENTED | 003 | Staff internal |
| 26 | `employee_contracts` | ❌ MISSING | → 032 | Kontrak karyawan |
| 27 | `warning_letters` | ❌ MISSING | → 032 | SP1/SP2/SP3 |
| 28 | `job_openings` | ❌ MISSING | → 032 | Rekrutmen |
| 29 | `job_applications` | ❌ MISSING | → 032 | Lamaran kerja |
| 30 | `muthawifs` | ✅ IMPLEMENTED | 003 | Tour guide |
| 31 | `agents` | ✅ IMPLEMENTED | 003 | Mitra agen |
| 32 | `agent_commission_tiers` | ✅ IMPLEMENTED | 003 | Tiered commission |
| 33 | `agent_wallets` | ❌ MISSING | → 034 | Dompet agen |
| 34 | `agent_wallet_transactions` | ❌ MISSING | → 034 | Transaksi dompet |
| 35 | `membership_plans` | ✅ IMPLEMENTED | 003 | Subscription plan |
| 36 | `website_settings` | ✅ IMPLEMENTED | 003 | CMS per-agent/branch |

**Domain 2 Summary: 8 IMPLEMENTED | 0 PARTIAL | 6 MISSING**

---

## Domain 3: Customers / Jamaah

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 37 | `customers` | ❌ MISSING | → 031 | **KRITIS** — tabel jamaah utama |
| 38 | `customer_documents` | ❌ MISSING | → 031 | Passport, KTP, dll |
| 39 | `customer_mahrams` | ❌ MISSING | → 031 | Data mahram |
| 40 | `customer_family_relations` | ❌ MISSING | → 034 | Relasi keluarga |
| 41 | `jamaah_qr_codes` | ❌ MISSING | → 034 | QR code check-in |
| 42 | `jamaah_live_locations` | ❌ MISSING | → 034 | GPS live tracking |

**Domain 3 Summary: 0 IMPLEMENTED | 0 PARTIAL | 6 MISSING**

---

## Domain 4: Travel — Packages & Departures

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 43 | `packages` | ✅ IMPLEMENTED | 004 | Umroh/Haji/Wisata |
| 44 | `package_labels` | ✅ IMPLEMENTED | 003 | Badge/label |
| 45 | `package_groups` | ✅ IMPLEMENTED | 003 | Kategori paket |
| 46 | `airlines` | ✅ IMPLEMENTED | 004 | iata+icao |
| 47 | `airports` | ✅ IMPLEMENTED | 004 | 9 bandara |
| 48 | `hotels` | ✅ IMPLEMENTED | 004 | star_rating + distance |
| 49 | `hotel_room_capacities` | ✅ IMPLEMENTED | 004 | Kapasitas kamar |
| 50 | `departures` | ✅ IMPLEMENTED | 004 | Jadwal keberangkatan |
| 51 | `departure_hotels` | ❌ MISSING | → 031 | Hotel per segment (lama: departure_multi_hotels) |
| 52 | `departure_itineraries` | ❌ MISSING | → 031 | Program perjalanan (lama: trip_timeline) |
| 53 | `departure_checklists` | ❌ MISSING | → 031 | Checklist operasional |
| 54 | `manifests` | ❌ MISSING | → 031 | Manifest penumpang |
| 55 | `room_assignments` | ✅ IMPLEMENTED | 004 | Penempatan kamar |
| 56 | `bus_providers` | ❌ MISSING | → 031 | Penyedia bus |
| 57 | `bus_assignments` | ❌ MISSING | → 031 | Bus per keberangkatan |
| 58 | `bus_passengers` | ❌ MISSING | → 031 | Penumpang per bus |
| 59 | `luggage` | ❌ MISSING | → 031 | Manajemen bagasi |

**Domain 4 Summary: 9 IMPLEMENTED | 0 PARTIAL | 8 MISSING**

---

## Domain 5: Haji

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 60 | `haji_registrations` | ❌ MISSING | → 031 | Pendaftaran haji |
| 61 | `haji_waiting_progress` | ❌ MISSING | → 031 | Antrian haji |
| 62 | `siskohat_registrations` | ❌ MISSING | → 037 | Integrasi SISKOHAT |
| 63 | `siskohat_sync_logs` | ❌ MISSING | → 037 | Log sinkronisasi |

**Domain 5 Summary: 0 IMPLEMENTED | 0 PARTIAL | 4 MISSING**

---

## Domain 6: Bookings & Payments

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 64 | `bookings` | ✅ IMPLEMENTED | 004 | |
| 65 | `booking_passengers` | ✅ IMPLEMENTED | 004 | Jamaah per booking |
| 66 | `booking_line_items` | ✅ IMPLEMENTED | 004 | |
| 67 | `booking_seat_locks` | ✅ IMPLEMENTED | 004 | Seat reservation |
| 68 | `booking_access_tokens` | ✅ IMPLEMENTED | 004 | Self-service link |
| 69 | `booking_document_logs` | ✅ IMPLEMENTED | 004 | |
| 70 | `booking_feedback` | ✅ IMPLEMENTED | 004 | Rating & komentar |
| 71 | `booking_installment_schedules` | ✅ IMPLEMENTED | 004 | Cicilan |
| 72 | `booking_transfers` | ❌ MISSING | → 034 | Pindah paket/departure |
| 73 | `payments` | ✅ IMPLEMENTED | 004 | Verifikasi pembayaran |
| 74 | `bank_accounts` | ✅ IMPLEMENTED | 004 | Rekening tujuan |
| 75 | `virtual_accounts` | ❌ MISSING | → 036 | VA otomatis per booking |
| 76 | `cash_transactions` | ❌ MISSING | → 037 | Kasir manual |
| 77 | `approval_configs` | ✅ IMPLEMENTED | 004 | Multi-level approval |
| 78 | `approval_requests` | ✅ IMPLEMENTED | 004 | Permintaan persetujuan |

**Domain 6 Summary: 12 IMPLEMENTED | 0 PARTIAL | 3 MISSING**

---

## Domain 7: Finance & Accounting

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 79 | `chart_of_accounts` | ✅ IMPLEMENTED | 005 | Double-entry COA |
| 80 | `journal_entries` | ✅ IMPLEMENTED | 005 | |
| 81 | `journal_lines` | ✅ IMPLEMENTED | 005 | Alias: journal_entry_lines |
| 82 | `vendor_invoices` | ✅ IMPLEMENTED | 005 | |
| 83 | `vendor_contracts` | ❌ MISSING | → 036 | Kontrak vendor |
| 84 | `cancellation_policies` | ❌ MISSING | → 036 | Kebijakan pembatalan |
| 85 | `departure_cost_items` | ✅ IMPLEMENTED | 005 | HPP per departure |
| 86 | `departure_expenses` | ✅ IMPLEMENTED | 005 | Pengeluaran operasional |
| 87 | `departure_other_revenues` | ✅ IMPLEMENTED | 005 | Pendapatan lain |
| 88 | `departure_financial_summary` | ✅ IMPLEMENTED | 005 | Aggregate P&L |
| 89 | `cashflow_entries` | ✅ IMPLEMENTED | 005 | Arus kas |
| 90 | `scheduled_reports` | ✅ IMPLEMENTED | 005 | Laporan terjadwal |
| 91 | `ar_reminder_log` | ✅ IMPLEMENTED | 005 | Reminder AR |
| 92 | `commissions` | ✅ IMPLEMENTED | 005 | Komisi agen/karyawan |

**Domain 7 Summary: 11 IMPLEMENTED | 0 PARTIAL | 2 MISSING**

---

## Domain 8: HR & Payroll

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 93 | `payroll` | ✅ IMPLEMENTED | 005 | Periode penggajian |
| 94 | `payroll_slips` | ✅ IMPLEMENTED | 005 | Slip gaji individual |
| 95 | `payroll_components` | ❌ MISSING | → 032 | Komponen gaji custom |
| 96 | `leave_requests` | ✅ IMPLEMENTED | 005 | Pengajuan cuti |
| 97 | `leave_quotas` | ❌ MISSING | → 032 | Kuota cuti per karyawan |
| 98 | `attendance_records` | ❌ MISSING | → 032 | Absensi harian |
| 99 | `performance_reviews` | ✅ IMPLEMENTED | 005 | Penilaian kinerja |
| 100 | `training_sessions` | ❌ MISSING | → 032 | Sesi pelatihan |
| 101 | `training_participants` | ❌ MISSING | → 032 | Peserta pelatihan |

**Domain 8 Summary: 4 IMPLEMENTED | 0 PARTIAL | 5 MISSING**

---

## Domain 9: Equipment / Perlengkapan

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 102 | `equipment_items` | ⚠️ PARTIAL | 004 | Basic — tanpa category/variant |
| 103 | `equipment_distributions` | ✅ IMPLEMENTED | 004 | Distribusi ke jamaah |
| 104 | `equipment_categories` | ❌ MISSING | → 033 | Kategori perlengkapan |
| 105 | `equipment_variants` | ❌ MISSING | → 033 | Varian (ukuran, warna) |
| 106 | `equipment_photos` | ❌ MISSING | → 033 | Foto produk |
| 107 | `equipment_stock_history` | ❌ MISSING | → 033 | Riwayat stok |
| 108 | `equipment_stock_opname` | ❌ MISSING | → 033 | Stock opname |
| 109 | `equipment_notification_settings` | ❌ MISSING | → 033 | Alert stok minimum |

**Domain 9 Summary: 1 IMPLEMENTED | 1 PARTIAL | 6 MISSING**

---

## Domain 10: Savings & Loyalty

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 110 | `savings_programs` | ✅ IMPLEMENTED | 004 | Program tabungan umroh |
| 111 | `saving_transactions` | ✅ IMPLEMENTED | 004 | Transaksi tabungan |
| 112 | `loyalty_points` | ✅ IMPLEMENTED | 005 | Saldo poin |
| 113 | `loyalty_transactions` | ❌ MISSING | → 034 | Riwayat transaksi poin |
| 114 | `loyalty_rewards` | ❌ MISSING | → 034 | Katalog hadiah poin |
| 115 | `loyalty_point_expiry` | ❌ MISSING | → 034 | Kadaluarsa poin |
| 116 | `withdrawal_requests` | ✅ IMPLEMENTED | 005 | Penarikan tabungan/poin |

**Domain 10 Summary: 4 IMPLEMENTED | 0 PARTIAL | 3 MISSING**

---

## Domain 11: E-Commerce (Toko Online)

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 117 | `store_categories` | ✅ IMPLEMENTED | 005 | |
| 118 | `store_products` | ✅ IMPLEMENTED | 005 | |
| 119 | `store_product_variants` | ✅ IMPLEMENTED | 005 | |
| 120 | `store_orders` | ✅ IMPLEMENTED | 005 | |
| 121 | `store_order_items` | ✅ IMPLEMENTED | 005 | |
| 122 | `store_order_payments` | ✅ IMPLEMENTED | 005 | |
| 123 | `store_shipments` | ✅ IMPLEMENTED | 005 | |
| 124 | `store_product_reviews` | ✅ IMPLEMENTED | 005 | |

**Domain 11 Summary: 8 IMPLEMENTED | 0 PARTIAL | 0 MISSING**

---

## Domain 12: WhatsApp & Communications

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 125 | `whatsapp_config` | ✅ IMPLEMENTED | 005 | Multi-provider |
| 126 | `wa_templates` | ✅ IMPLEMENTED | 005 | Template dinamis |
| 127 | `wa_send_logs` | ✅ IMPLEMENTED | 005 | Log pengiriman |
| 128 | `whatsapp_logs` | ⚠️ PARTIAL | 005 | Legacy compat — harus dihapus |
| 129 | `wa_broadcast_campaigns` | ✅ IMPLEMENTED | 005 | Kampanye broadcast |
| 130 | `wa_broadcast_logs` | ✅ IMPLEMENTED | 005 | Log per penerima |
| 131 | `wa_feature_roadmap` | ✅ IMPLEMENTED | 005 | Roadmap fitur |
| 132 | `chatbot_conversations` | ❌ MISSING | → 037 | Auto-reply chatbot |
| 133 | `chatbot_messages` | ❌ MISSING | → 037 | Pesan chatbot |

**Domain 12 Summary: 6 IMPLEMENTED | 1 PARTIAL | 2 MISSING**

---

## Domain 13: CRM & Marketing

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 134 | `leads` | ✅ IMPLEMENTED | 004 | Prospek calon jamaah |
| 135 | `lead_activities` | ✅ IMPLEMENTED | 004 | Riwayat follow-up |
| 136 | `coupons` | ✅ IMPLEMENTED | 004 | Kode diskon |
| 137 | `coupon_usages` | ✅ IMPLEMENTED | 004 | Pemakaian kupon |
| 138 | `announcements` | ✅ IMPLEMENTED | 004 | Pengumuman ke jamaah |
| 139 | `banners` | ✅ IMPLEMENTED | 004 | Banner carousel |
| 140 | `marketing_campaigns` | ❌ MISSING | → 034 | Kampanye marketing umum |
| 141 | `marketing_materials` | ❌ MISSING | → 034 | Materi marketing |
| 142 | `marketing_material_downloads` | ❌ MISSING | → 034 | Download materi |

**Domain 13 Summary: 6 IMPLEMENTED | 0 PARTIAL | 3 MISSING**

---

## Domain 14: Content Management (CMS)

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 143 | `faqs` | ✅ IMPLEMENTED | 003 | FAQ website |
| 144 | `testimonials` | ✅ IMPLEMENTED | 003 | Ulasan jamaah |
| 145 | `gallery_items` | ✅ IMPLEMENTED | 003 | Galeri foto |
| 146 | `contact_page_content` | ✅ IMPLEMENTED | 003 | Konten halaman kontak |
| 147 | `blog_posts` | ❌ MISSING | → 035 | Artikel blog |
| 148 | `blog_categories` | ❌ MISSING | → 035 | Kategori blog |
| 149 | `blog_tags` | ❌ MISSING | → 035 | Tag blog |
| 150 | `landing_pages` | ❌ MISSING | → 035 | Halaman landing custom |
| 151 | `landing_page_sections` | ⚠️ PARTIAL | 004 | Section ada, parent table tidak |
| 152 | `about_page_content` | ❌ MISSING | → 035 | Konten halaman About |
| 153 | `hero_stats` | ❌ MISSING | → 035 | Statistik hero section |

**Domain 14 Summary: 4 IMPLEMENTED | 1 PARTIAL | 6 MISSING**

---

## Domain 15: Operations & Ibadah

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 154 | `ibadah_progress` | ✅ IMPLEMENTED | 004 | Tracking tawaf/sa/dll |
| 155 | `manasik_sessions` | ✅ IMPLEMENTED | 004 | Sesi manasik |
| 156 | `manasik_attendances` | ✅ IMPLEMENTED | 004 | Absensi manasik |
| 157 | `sos_alerts` | ✅ IMPLEMENTED | 004 | Alert darurat |
| 158 | `contact_messages` | ✅ IMPLEMENTED | 004 | Pesan form kontak |

**Domain 15 Summary: 5 IMPLEMENTED | 0 PARTIAL | 0 MISSING**

---

## Domain 16: Visa & Documents

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 159 | `visa_applications` | ✅ IMPLEMENTED | 004 | Pengajuan visa |
| 160 | `documents` | ✅ IMPLEMENTED | 004 | Dokumen jamaah |
| 161 | `vendors` | ✅ IMPLEMENTED | 004 | Vendor/supplier |

**Domain 16 Summary: 3 IMPLEMENTED | 0 PARTIAL | 0 MISSING**

---

## Domain 17: Assets & Support

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 162 | `office_assets` | ❌ MISSING | → 035 | Aset kantor (inventaris) |
| 163 | `office_asset_maintenance` | ❌ MISSING | → 035 | Log perawatan aset |
| 164 | `support_tickets` | ❌ MISSING | → 036 | Tiket dukungan |
| 165 | `support_messages` | ❌ MISSING | → 036 | Pesan tiket |

**Domain 17 Summary: 0 IMPLEMENTED | 0 PARTIAL | 4 MISSING**

---

## Domain 18: Savings Advanced & Notifications

| # | Tabel | Status | Migration File | Catatan |
|---|-------|--------|----------------|---------|
| 166 | `notification_templates` | ✅ IMPLEMENTED | 002 | |
| 167 | `notifications` | ✅ IMPLEMENTED | 002 | In-app |
| 168 | `push_subscriptions` | ✅ IMPLEMENTED | 002 | Web-push |
| 169 | `push_outbox` | ✅ IMPLEMENTED | 002 | Queue |
| 170 | `email_logs` | ✅ IMPLEMENTED | 002 | |

**Domain 18 Summary: 5 IMPLEMENTED | 0 PARTIAL | 0 MISSING**

---

## Grand Summary

| Domain | Implemented | Partial | Missing | Total |
|--------|------------|---------|---------|-------|
| 1. Core Infrastructure | 15 | 0 | 7 | 22 |
| 2. Organisation & Branch | 8 | 0 | 6 | 14 |
| 3. Customers / Jamaah | 0 | 0 | 6 | 6 |
| 4. Travel — Packages & Departures | 9 | 0 | 8 | 17 |
| 5. Haji | 0 | 0 | 4 | 4 |
| 6. Bookings & Payments | 12 | 0 | 3 | 15 |
| 7. Finance & Accounting | 11 | 0 | 2 | 13 |
| 8. HR & Payroll | 4 | 0 | 5 | 9 |
| 9. Equipment / Perlengkapan | 1 | 1 | 6 | 8 |
| 10. Savings & Loyalty | 4 | 0 | 3 | 7 |
| 11. E-Commerce | 8 | 0 | 0 | 8 |
| 12. WhatsApp & Comms | 6 | 1 | 2 | 9 |
| 13. CRM & Marketing | 6 | 0 | 3 | 9 |
| 14. Content Management | 4 | 1 | 6 | 11 |
| 15. Operations & Ibadah | 5 | 0 | 0 | 5 |
| 16. Visa & Documents | 3 | 0 | 0 | 3 |
| 17. Assets & Support | 0 | 0 | 4 | 4 |
| 18. Notifications | 5 | 0 | 0 | 5 |
| **TOTAL** | **101** | **3** | **65** | **169** |

---

## Coverage Chart

```
IMPLEMENTED ████████████████████████████████████████████ 59.8% (101/169)
PARTIAL     ██                                            1.8%  (3/169)
MISSING     ██████████████████████████████               38.5% (65/169)
```

---

## Tabel Missing — Urutan Prioritas

### 🔴 KRITIS (blocker untuk sistem berjalan)
1. `customers` — tabel jamaah utama, semua booking bergantung pada ini
2. `haji_registrations` — modul haji tidak bisa berfungsi
3. `bus_providers`, `bus_assignments`, `bus_passengers` — modul transportasi lumpuh
4. `manifests` — manifest keberangkatan tidak bisa dibuat
5. `departure_checklists`, `departure_itineraries` — operasional keberangkatan tidak lengkap
6. `attendance_records` — HR tidak bisa mencatat absensi

### 🟠 PENTING (fitur utama tidak lengkap)
7. `equipment_categories`, `equipment_variants`, `equipment_stock_history`, `equipment_stock_opname`
8. `loyalty_transactions`, `loyalty_rewards`
9. `booking_transfers` — transfer paket tidak bisa dilakukan
10. `jamaah_qr_codes`, `jamaah_live_locations`
11. `virtual_accounts`
12. `support_tickets`, `support_messages`

### 🟡 STANDARD (fitur pendukung)
13. `blog_posts`, `blog_categories`, `blog_tags`
14. `marketing_campaigns`, `marketing_materials`
15. `vendor_contracts`, `cancellation_policies`
16. `payroll_components`, `leave_quotas`
17. `departments`, `employee_contracts`
18. `office_assets`, `office_asset_maintenance`
19. `about_page_content`, `landing_pages`, `company_features`
20. `user_permission_overrides`, `dashboard_access_config`, `access_policies`

### 🟢 ADVANCED (fase berikutnya)
21. `siskohat_registrations`, `siskohat_sync_logs`
22. `chatbot_conversations`, `chatbot_messages`
23. `activity_logs`, `cash_transactions`
24. `agent_wallets`, `agent_wallet_transactions`
