# Database Table Inventory — Vinstour Travel Portal
> Generated from audit of `supabase_clean_migration/` (002–005) and `sql/migrations/` (001–050+)
> Legend: ✅ Aktif digunakan codebase | ⚠️ Partial / tidak langsung | ❌ Tidak ditemukan penggunaan

---

## Authentication

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `auth.users` | ~20 (Supabase managed) | Supabase native auth — email/password, OAuth, JWT | Auth | ✅ via supabase.auth |

---

## Users

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `profiles` | 12 | Extended profile 1:1 dengan auth.users. Menyimpan nama, avatar, role (TEXT — akan diganti ENUM), is_active, session_version | Users | ✅ useAuth.tsx |
| `user_2fa_settings` | 6 | Konfigurasi TOTP/2FA per user | Users / Security | ⚠️ UI belum ada |
| `otp_codes` | 7 | OTP sementara untuk verifikasi | Users / Security | ⚠️ |

---

## Roles & Permissions

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `user_roles` | 5 | Fine-grained role assignment user ↔ role. Kolom `role` TEXT (perlu dimigrasi ke ENUM `app_role`) | RBAC | ✅ |
| `permissions_list` | 5 | Master registry semua permission key | RBAC | ✅ role_permissions page |
| `role_permissions` | 7 | Mapping role → permission dengan CRUD flags (can_view, can_create, can_edit, can_delete) | RBAC | ✅ |
| `staff_invitations` | 9 | Token undangan onboarding staf baru | RBAC | ⚠️ |
| `rbac_audit_trail` | ~8 | Log perubahan role assignment | Audit/RBAC | ❌ belum digunakan |

---

## Branches

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `branches` | 15 | Data kantor cabang (kota, manajer, slug untuk portal) | Organisation | ✅ BranchForm, AdminBranches |
| `branch_commissions` | ~8 | Komisi tingkat cabang dari booking | Finance/Branch | ❌ |
| `branch_memberships` | ~6 | Paket membership per cabang | Branch | ❌ |
| `branch_monthly_targets` | ~7 | Target bulanan penjualan per cabang | Branch/KPI | ⚠️ |

---

## Agents

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `agents` | 22 | Data agen mitra (company_name, commission_rate, plan_type, slug) | Agents | ✅ useAgents.ts, AdminAgents |
| `agent_commission_tiers` | ~8 | Tier komisi agen berdasarkan jumlah booking | Agents/Finance | ✅ |
| `agent_commissions` | ~9 | Riwayat komisi per agen per booking | Agents/Finance | ✅ useAgents.ts, AdminLaporanAgen |
| `agent_wallets` | ~6 | Saldo dompet digital agen | Agents/Finance | ✅ useAgents.ts |
| `agent_wallet_transactions` | ~9 | Riwayat transaksi wallet agen | Agents/Finance | ⚠️ |
| `agent_memberships` | ~6 | Riwayat langganan membership agen | Agents | ❌ |
| `agent_monthly_targets` | ~7 | Target bulanan per agen | Agents/KPI | ❌ |
| `agent_override_commissions` | ~8 | Override komisi khusus per agen | Agents/Finance | ❌ |
| `agent_invitation_tokens` | ~7 | Token undangan sub-agen | Agents | ⚠️ |
| `agent_training_progress` | ~6 | Progress pelatihan agen | Agents/HR | ❌ |
| `agent_leads` | ~9 | Lead yang dimiliki / dihandle agen | Agents/CRM | ❌ |

---

## Jamaah

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `customers` | 30 | Data jamaah (NIK, paspor, alamat, emergency contact) | Jamaah | ✅ AdminCustomers, JamaahProfil |
| `customer_accounts` | 12 | Akun portal jamaah — loyalty, total_spent, referral | Jamaah/CRM | ✅ useCustomerAccount.ts |
| `customer_documents` | 14 | Upload dokumen jamaah (KTP, paspor, foto, vaksin) | Jamaah/Docs | ✅ AgentDocuments, JamaahProfil |
| `customer_mahrams` | 6 | Relasi mahram antar jamaah | Jamaah | ⚠️ |
| `muthawifs` | 17 | Data muthawif / tour guide (sertifikasi, bahasa, ketersediaan) | Jamaah/Operations | ✅ AdminMuthawifs |
| `muthawif_jamaah_evaluations` | ~10 | Evaluasi muthawif oleh jamaah | Jamaah/Operations | ❌ |
| `jamaah_badges` | ~6 | Badge / pencapaian gamifikasi jamaah | Jamaah/App | ✅ JamaahBadges.tsx |
| `jamaah_checklist` | ~7 | Checklist persiapan keberangkatan jamaah | Jamaah/App | ⚠️ |
| `jamaah_doa_sessions` | ~6 | Sesi doa bersama jamaah | Jamaah/App | ❌ |
| `jamaah_ibadah_logs` | ~7 | Log aktivitas ibadah jamaah | Jamaah/App | ⚠️ |
| `jamaah_ibadah_targets` | ~7 | Target ibadah pribadi jamaah | Jamaah/App | ✅ useIbadahProgress.ts |
| `jamaah_jurnal` | ~6 | Jurnal perjalanan pribadi jamaah | Jamaah/App | ✅ jamaah_jurnal rpc |
| `jamaah_qr_codes` | ~5 | QR code identitas jamaah | Jamaah/Operations | ⚠️ |
| `ibadah_progress` | ~8 | Progress ibadah umum per departure | Jamaah/Operations | ⚠️ |

---

## Packages

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `packages` | 30 | Paket umroh/haji (harga quad/triple/double/single, SEO, foto) | Packages | ✅ AdminPackages, public website |
| `package_hpp_templates` | 9 | Template harga pokok per paket per item | Packages/Finance | ⚠️ |
| `package_labels` | ~5 | Label/tag visual paket (warna, nama) | Packages/CMS | ✅ package_label_assignments |
| `package_groups` | ~5 | Grup paket untuk pengelompokan | Packages/CMS | ⚠️ |
| `package_type_equipment` | ~5 | Relasi tipe paket → perlengkapan wajib | Packages/Equipment | ❌ |
| `package_reviews` | ~10 | Ulasan jamaah untuk paket | Packages/CRM | ❌ |

---

## Package Departures

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `departures` | 22 | Jadwal keberangkatan (tanggal, kuota, harga override, status) | Departures | ✅ DepartureForm, AdminDepartures |
| `departure_multi_hotels` | 8 | Multiple hotel stops untuk itinerary kompleks | Departures | ⚠️ |
| `trip_timeline` | 9 | Timeline event harian per departure | Departures | ⚠️ |
| `departure_waiting_list` | ~7 | Waiting list untuk departure penuh | Departures | ⚠️ |
| `departure_budgets` | ~8 | Anggaran rencana per departure | Departures/Finance | ❌ |
| `departure_checklists` | ~7 | Checklist operasional per departure | Departures/Operations | ❌ |
| `departure_cost_items` | 13 | Komponen HPP aktual per departure | Departures/Finance | ⚠️ |
| `departure_expenses` | 13 | Pengeluaran operasional per departure | Departures/Finance | ⚠️ |
| `departure_other_revenues` | 9 | Pendapatan tambahan per departure | Departures/Finance | ❌ |
| `departure_financial_summary` | 16 | Ringkasan keuangan (auto-generated, STORED columns) | Departures/Finance | ✅ PackageFinancialSummaryCard rpc |

---

## Airlines

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `airlines` | 9 | Data maskapai (IATA, ICAO, logo) | Airlines | ✅ AirlineForm, DepartureForm |

---

## Airports

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `airports` | 11 | Referensi bandara IATA (kota, timezone, koordinat) | Airports | ✅ AirportForm, DepartureForm |

---

## Hotels

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `hotels` | 13 | Hotel Mekkah/Madinah/Jeddah (bintang, jarak Haram, foto) | Hotels | ✅ AdminHotels, HotelForm |
| `hotel_room_capacities` | 4 | Kapasitas kamar per tipe per hotel | Hotels | ⚠️ |
| `hotel_contracts` | ~10 | Kontrak harga dengan hotel | Hotels/Finance | ❌ |

---

## Transportation

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `baggage_reference_items` | ~7 | Item referensi bagasi per paket | Transportation | ⚠️ |
| `baggage_policies` | ~6 | Kebijakan bagasi per maskapai/paket | Transportation | ❌ |
| `room_assignments` | ~10 | Penugasan kamar hotel per departure | Operations | ✅ room_occupants in frontend |

---

## Bookings

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `bookings` | 22 | Pemesanan utama (kode unik, status, total_price, remaining_amount GENERATED) | Bookings | ✅ AdminBookings, useBookingWizard |
| `booking_passengers` | 15 | Data penumpang per booking | Bookings | ✅ useBookingWizardDynamic |
| `booking_line_items` | ~9 | Item detail billing per booking | Bookings/Finance | ⚠️ |
| `booking_seat_locks` | ~6 | Lock seat sementara saat proses booking | Bookings | ⚠️ |
| `booking_access_tokens` | ~6 | Token akses portal publik per booking | Bookings | ⚠️ |
| `booking_document_logs` | ~8 | Log upload/verifikasi dokumen per booking | Bookings/Docs | ⚠️ |
| `booking_feedback` | ~8 | Feedback jamaah setelah perjalanan | Bookings/CRM | ❌ |
| `booking_installment_schedules` | ~9 | Jadwal cicilan pembayaran | Bookings/Finance | ⚠️ |
| `approval_configs` | ~8 | Konfigurasi workflow approval per tipe | Bookings/Operations | ⚠️ |
| `approval_requests` | ~10 | Permintaan approval (cancel, refund, dll) | Bookings/Operations | ✅ useApprovalWorkflow.ts |

---

## Payments

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `payments` | ~18 | Transaksi pembayaran booking (bukti, metode, tanggal) | Payments | ✅ useBookingWizardDynamic |
| `bank_accounts` | 9 | Rekening bank perusahaan untuk terima transfer | Payments | ✅ AdminSavingsPlans |
| `coupons` | 16 | Kode kupon diskon (persentase/fixed, max_usage) | Payments/Marketing | ✅ CouponForm |
| `savings_plans` | ~12 | Program tabungan haji/umroh jamaah | Payments | ✅ AdminSavingsPlans |
| `savings_deposits` | ~9 | Setoran tabungan | Payments | ✅ |
| `savings_schedules` | ~8 | Jadwal setoran terjadwal | Payments | ⚠️ |
| `payment_deadline_reminders` | ~8 | Konfigurasi reminder deadline bayar | Payments | ⚠️ |
| `midtrans_webhook_logs` | ~8 | Log webhook Midtrans payment gateway | Payments | ⚠️ |
| `payment_page_tokens` | ~6 | Token akses halaman pembayaran publik | Payments | ⚠️ |
| `virtual_accounts` | ~8 | Virtual account untuk pembayaran | Payments | ✅ |
| `withdrawal_requests` | 14 | Permintaan pencairan (tabungan, komisi, refund) | Payments/Finance | ⚠️ |
| `visa_applications` | ~12 | Proses pengajuan visa jamaah | Operations | ⚠️ |
| `invoice_templates` | ~8 | Template invoice PDF | CMS/Finance | ⚠️ |

---

## Finance

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `chart_of_accounts` | 9 | Bagan akun COA (asset/liability/equity/revenue/expense) | Finance | ⚠️ |
| `journal_entries` | 14 | Header jurnal double-entry akuntansi | Finance | ⚠️ |
| `journal_lines` | 9 | Baris debit/kredit jurnal | Finance | ⚠️ |
| `vendor_invoices` | 15 | Tagihan dari vendor/supplier | Finance | ⚠️ |
| `vendor_costs` | ~10 | Biaya vendor per keberangkatan (lama) | Finance | ✅ AdminFinanceAP |
| `commissions` | 13 | Komisi agen/karyawan per booking | Finance | ⚠️ |
| `departure_cost_items` | 13 | HPP aktual per departure | Finance | ⚠️ |
| `departure_expenses` | 13 | Pengeluaran operasional per departure | Finance | ⚠️ |
| `departure_financial_summary` | 16 | Summary profit/loss per departure | Finance | ✅ rpc |
| `cashflow_entries` | 11 | Arus kas manual | Finance | ⚠️ |
| `scheduled_reports` | 11 | Laporan otomatis terjadwal | Finance | ⚠️ |
| `ar_reminder_log` | 9 | Log reminder AR ke jamaah | Finance/CRM | ⚠️ |
| `payroll` | 14 | Periode penggajian per cabang | HR/Finance | ⚠️ |
| `payroll_slips` | 15 | Slip gaji individual | HR/Finance | ⚠️ |
| `leave_requests` | 13 | Pengajuan cuti karyawan | HR | ⚠️ |
| `performance_reviews` | 14 | Penilaian kinerja karyawan | HR | ⚠️ |
| `exchange_rates` | ~6 | Referensi kurs mata uang | Finance | ❌ |
| `cash_transactions` | ~12 | Transaksi kas (lama, tumpang tindih journal_entries) | Finance | ✅ AdminFinanceAP |
| `financial_summary` | ~10 | Ringkasan keuangan (deprecated, ganti departure_financial_summary) | Finance | ❌ |

---

## Equipment

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `equipment_items` | ~10 | Inventaris perlengkapan jamaah (koper, baju, dll) | Equipment | ✅ EquipmentPage, queries.ts |
| `equipment_distributions` | ~9 | Distribusi perlengkapan ke jamaah | Equipment | ✅ bulk_distribute_equipment rpc |
| `equipment_maintenance` | ~7 | Log maintenance/perbaikan perlengkapan | Equipment | ❌ |
| `equipment_damage` | ~7 | Laporan kerusakan perlengkapan | Equipment | ❌ |
| `baggage_reference_items` | ~7 | Referensi item bagasi standar | Equipment | ⚠️ |

---

## Marketing

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `leads` | 16 | Prospek calon jamaah (source, status pipeline, assigned_to) | Marketing/CRM | ✅ AdminLeadDetail |
| `marketing_campaigns` | ~12 | Kampanye pemasaran digital | Marketing | ❌ |
| `marketing_conversions` | ~8 | Konversi kampanye ke booking | Marketing | ❌ |
| `marketing_metrics` | ~8 | Metrik performa marketing | Marketing | ❌ |
| `referral_codes` | ~7 | Kode referral agen/jamaah | Marketing | ⚠️ |
| `referral_usages` | ~6 | Penggunaan kode referral | Marketing | ⚠️ |
| `loyalty_points` | 8 | Poin loyalitas jamaah | Marketing/CRM | ⚠️ |
| `loyalty_rewards` | ~8 | Hadiah program loyalitas | Marketing | ❌ |
| `loyalty_transactions` | ~7 | Riwayat transaksi poin | Marketing | ❌ |
| `discount_requests` | ~8 | Permintaan diskon khusus | Marketing | ❌ |

---

## CRM

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `leads` | 16 | (lihat Marketing) | CRM | ✅ |
| `support_tickets` | ~12 | Tiket support jamaah | CRM | ❌ |
| `feedback` | ~8 | Feedback umum (berbeda dari booking_feedback) | CRM | ❌ |
| `contact_messages` | ~8 | Pesan dari form kontak website | CRM | ⚠️ |
| `chat_leads` | ~8 | Lead dari chatbot/live chat | CRM | ❌ |
| `chatbot_logs` | ~8 | Log percakapan chatbot | CRM | ❌ |

---

## Website CMS

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `website_settings` | ~15 | Konfigurasi website (nama, logo, warna, social) | CMS | ✅ public homepage fetch |
| `faqs` | ~8 | FAQ yang tampil di website | CMS | ✅ AdminFAQManager |
| `testimonials` | ~10 | Testimoni jamaah untuk website | CMS | ✅ AdminSentimenFeedback |
| `gallery_items` | ~8 | Galeri foto website | CMS | ⚠️ |
| `contact_page_content` | ~8 | Konten halaman kontak | CMS | ⚠️ |
| `menu_items` | 9 | Konfigurasi navigasi sidebar dinamis | CMS | ⚠️ |
| `announcements` | ~10 | Banner pengumuman website | CMS | ✅ public website |
| `banners` | ~10 | Slider banner homepage | CMS | ✅ public website |
| `media_gallery` | ~9 | Galeri media (trip photos, umum) | CMS | ✅ media_gallery in frontend |
| `invoice_templates` | ~8 | Template PDF invoice kustom | CMS/Finance | ⚠️ |

---

## Notifications

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `notifications` | ~10 | Notifikasi in-app per user | Notifications | ⚠️ |
| `notification_templates` | ~8 | Template notifikasi (judul, body per event) | Notifications | ⚠️ |
| `push_subscriptions` | ~7 | Langganan push notification (WebPush) | Notifications | ⚠️ |
| `push_outbox` | ~8 | Queue pengiriman push notification | Notifications | ⚠️ |
| `email_logs` | ~9 | Log pengiriman email | Notifications | ⚠️ |
| `email_templates` | ~10 | Template email HTML | Notifications | ✅ AdminEmailTemplates |
| `whatsapp_config` | ~10 | Konfigurasi WA Business API | Notifications | ✅ whatsapp_config in frontend |
| `wa_templates` | ~8 | Template pesan WhatsApp | Notifications | ⚠️ |
| `wa_send_logs` | ~8 | Log pengiriman WA | Notifications | ⚠️ |
| `whatsapp_logs` | ~8 | Log WA (duplikasi wa_send_logs) | Notifications | ❌ REDUNDANT |
| `wa_broadcast_campaigns` | ~9 | Kampanye broadcast WA | Notifications | ⚠️ |
| `wa_broadcast_logs` | ~8 | Log per-recipient broadcast WA | Notifications | ⚠️ |
| `wa_feature_roadmap` | ~6 | Roadmap fitur WA (internal notes) | Internal | ❌ REMOVE |
| `sos_alerts` | ~8 | Alert darurat jamaah di lapangan | Operations | ⚠️ |
| `ar_reminder_log` | 9 | Log reminder AR (juga ada di Finance) | Notifications | ⚠️ |

---

## Audit & Security

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `audit_logs` | ~12 | Log aksi penting (tabel, action, before/after JSON) | Security | ✅ AdminSecurityAudit |
| `rbac_audit_trail` | ~8 | Log perubahan role/permission | Security | ❌ |
| `login_attempts` | ~8 | Log percobaan login (sukses/gagal, IP) | Security | ❌ |
| `admin_activity_log` | ~10 | Log aktivitas admin (duplikasi audit_logs) | Security | ❌ REDUNDANT |
| `cancellation_rule_audit_logs` | ~8 | Log perubahan aturan pembatalan | Security | ❌ |
| `document_audit_logs` | ~8 | Log verifikasi dokumen | Security | ❌ REDUNDANT dgn booking_document_logs |
| `siskohat_sync_logs` | ~8 | Log sinkronisasi data dengan SISKOHAT Kemenag | Security/Gov | ❌ |

---

## System Settings

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `company_settings` | 8 | Key-value store konfigurasi sistem global | Settings | ✅ JamaahKontrak |
| `app_settings` | ~8 | Setting aplikasi (duplikasi company_settings) | Settings | ✅ app_settings in frontend |
| `membership_plans` | ~10 | Paket membership agen (silver/gold/platinum) | Settings/Agents | ⚠️ |
| `dashboard_access_config` | ~8 | Konfigurasi akses widget dashboard per role | Settings | ⚠️ |
| `webhook_configs` | ~8 | Konfigurasi webhook outbound | Settings | ❌ |
| `webhook_logs` | ~8 | Log webhook | Settings | ❌ |
| `otp_codes` | 7 | OTP sementara | Security/Settings | ⚠️ |
| `user_2fa_settings` | 6 | Setting 2FA per user | Security/Settings | ⚠️ |

---

## HR (Human Resources)

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `employees` | 25 | Data karyawan internal | HR | ✅ AdminEmployees |
| `payroll` | 14 | Periode penggajian | HR/Finance | ⚠️ |
| `payroll_slips` | 15 | Slip gaji per karyawan | HR/Finance | ⚠️ |
| `payroll_components` | ~8 | Komponen gaji (tunjangan, potongan) | HR/Finance | ⚠️ |
| `leave_requests` | 13 | Pengajuan cuti | HR | ⚠️ |
| `leave_quotas` | ~6 | Jatah cuti per karyawan | HR | ❌ |
| `performance_reviews` | 14 | Penilaian kinerja | HR | ⚠️ |
| `attendance` | ~10 | Absensi karyawan | HR | ✅ attendance in frontend |
| `career_history` | ~8 | Riwayat jabatan karyawan | HR | ❌ |
| `disciplinary_records` | ~8 | Catatan disiplin karyawan | HR | ❌ |
| `training_modules` | ~9 | Modul pelatihan | HR | ✅ training_modules |
| `training_quizzes` | ~8 | Kuis pelatihan | HR | ❌ |
| `staff_training_sessions` | ~8 | Sesi pelatihan staf | HR | ⚠️ |
| `staff_training_attendance` | ~6 | Kehadiran pelatihan | HR | ⚠️ |
| `onboarding_templates` | ~8 | Template onboarding karyawan baru | HR | ❌ |
| `onboarding_template_items` | ~7 | Item checklist onboarding | HR | ❌ |
| `employee_onboarding_tasks` | ~8 | Tugas onboarding per karyawan | HR | ❌ |

---

## Guide System (Operational)

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `guide_channels` | ~8 | Channel audio broadcast muthawif | Operations | ❌ |
| `guide_broadcasts` | ~8 | Broadcast audio aktif | Operations | ❌ |
| `guide_broadcast_reads` | ~6 | Tanda-terima broadcast oleh jamaah | Operations | ❌ |
| `guide_sessions` | ~9 | Sesi panduan lapangan | Operations | ❌ |
| `guide_session_attendance` | ~6 | Kehadiran sesi | Operations | ❌ |
| `guide_locations` | ~7 | Tracking lokasi muthawif/jamaah | Operations | ❌ |
| `guide_audio_sessions` | ~8 | Sesi audio live broadcast | Operations | ❌ |
| `guide_subgroups` | ~7 | Sub-grup jamaah dalam satu departure | Operations | ❌ |
| `guide_subgroup_members` | ~5 | Anggota sub-grup | Operations | ❌ |
| `manasik_sessions` | ~10 | Sesi manasik (latihan ibadah pra-keberangkatan) | Operations | ✅ manasik_schedules |
| `manasik_attendance` | ~7 | Kehadiran manasik | Operations | ⚠️ |
| `sos_alerts` | ~8 | Alarm darurat lapangan | Operations | ⚠️ |

---

## E-Commerce (Store)

| Tabel | Kolom | Tujuan | Domain | Status |
|-------|-------|--------|--------|--------|
| `store_categories` | ~7 | Kategori produk toko | E-Commerce | ✅ |
| `store_products` | ~15 | Produk (koper, pakaian, dll) | E-Commerce | ✅ AdminStore |
| `store_product_variants` | ~9 | Varian produk (ukuran, warna) | E-Commerce | ⚠️ |
| `store_orders` | ~14 | Pesanan toko | E-Commerce | ✅ StoreOrderDetail |
| `store_order_items` | ~8 | Item pesanan | E-Commerce | ⚠️ |
| `store_order_payments` | ~9 | Pembayaran pesanan toko | E-Commerce | ⚠️ |
| `store_shipments` | ~10 | Pengiriman pesanan | E-Commerce | ⚠️ |
| `store_product_reviews` | ~8 | Ulasan produk | E-Commerce | ⚠️ |
| `store_carts` | ~6 | Keranjang belanja | E-Commerce | ⚠️ |
| `store_order_counters` | ~5 | Counter nomor pesanan per tanggal | E-Commerce | ⚠️ |

---

**Total tabel teridentifikasi: ~180 tabel**
- Aktif digunakan: ~55 tabel (✅)
- Partial/indirect: ~65 tabel (⚠️)
- Tidak digunakan / redundant: ~60 tabel (❌)
