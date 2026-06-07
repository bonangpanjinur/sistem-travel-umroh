# RENCANA VINSTOUR TRAVEL PORTAL
> **Update terakhir:** Juni 2026 — Analisis Mendalam + Perbaikan Prioritas HR, Paket, Keberangkatan, HPP, Keuangan  
> **Stack:** React 19 + Vite + TypeScript + Supabase Auth + Supabase PostgreSQL + Express API (port 8080)  
> **Total:** 311 halaman, 653 TSX, 70+ hooks, 70+ tabel, 61 file SQL migration  
> ✅ = Selesai | ❌ = Belum ada | 🔧 = UI ada tapi tidak terhubung DB | ⚠️ = Sebagian

---

## STRUKTUR SQL (SATU SUMBER)

> **Folder kanonikal:** `sql/migrations/` — 61 file bernomor urut  
> **Master install:** `sql/MASTER_FRESH_INSTALL.sql` — satu file untuk fresh install  
> **Supabase CLI:** `supabase/migrations/` — dikelola oleh Supabase CLI  
> ⚠️ Jangan buat folder SQL baru di tempat lain.

| Rentang | Isi |
|---------|-----|
| 001–016 | Foundation, publik, portal, operasional, WA, settings, RBAC, HR, rooming |
| 017–025 | Leads/CRM, manasik, review, keuangan, tipe baru, fase 18-20 |
| 026–035 | Store e-commerce, review, fase21-22, payments, patch triggers |
| 036–054 | Patch RLS, storage, savings, bookings, 2FA, agent tier, seat lock, face |
| 055–061 | Invoice template, dokumen log, trip timeline, FAQ, wisata, chatbot, SOS |

---

## ARSITEKTUR SISTEM

```
Frontend  : React 19 + Vite 7 + TypeScript + TailwindCSS + shadcn/ui (port 5000)
State     : TanStack Query v5
Routing   : React Router v6
Auth      : Supabase Auth (JWT) → useAuth.tsx
Database  : Supabase PostgreSQL (70+ tabel)
Backend   : Express 5 API (port 8080)
Payments  : Midtrans Snap (QRIS, VA, GoPay)
WhatsApp  : Fonnte API (whatsapp_logs outbox pattern)
Push Notif: VAPID Web Push (push_outbox + push_subscriptions)
PWA       : Service Worker + manifest edge function
AI        : Google Gemini API (summary, chatbot, FAQ)
Struktur  : Monorepo pnpm — artifacts/umrah-haji/ (app utama)

RBAC (15 role):
  super_admin | owner | admin | branch_manager | finance
  operational | sales | marketing | hr | equipment
  agent | sub_agent | customer | jamaah | visa_officer
```

---

## MODUL 1 — AUTENTIKASI & RBAC

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Login / Register email+password | `pages/auth/Login.tsx`, `Register.tsx` |
| ✅ | Forgot Password / Reset Password | `ForgotPassword.tsx`, `ResetPassword.tsx` |
| ✅ | Multi-role system (15 role) | `hooks/useAuth.tsx`, `user_roles` table |
| ✅ | role_permissions + user_permissions | DB tables |
| ✅ | useCanAccess.ts, useEffectivePermissions.ts | `hooks/` |
| ✅ | AdminRoleManagement, AdminRBACStatus, AdminRBACTools | `pages/admin/` |
| ✅ | AdminAccessSimulator — simulasi akses | `pages/admin/AdminAccessSimulator.tsx` |
| ✅ | DashboardAccessManager | `pages/admin/DashboardAccessManager.tsx` |
| ✅ | 2FA (TOTP + OTP via edge function) | `supabase/functions/request-2fa-otp/`, `verify-2fa-otp/` |
| ✅ | Admin2FASettings, AdminSecurityAudit | `pages/admin/` |
| ✅ | Guest checkout | `services/guestCheckoutService.ts` |
| ✅ | Revoke all sessions (force logout) | `revoke-all-sessions` edge function + session versioning |

---

## MODUL 2 — MANAJEMEN PAKET

### ✅ Yang Sudah Ada

| Fitur | Lokasi |
|-------|--------|
| Daftar & kelola paket | `pages/admin/AdminPackages.tsx` |
| Detail paket + linked departures | `pages/admin/AdminPackageDetail.tsx` |
| Tipe paket dinamis (umroh/haji/wisata) | `pages/admin/AdminPackageTypes.tsx` |
| Form buat/edit paket (regular & tabungan) | `RegularPackageForm.tsx`, `SavingsPackageForm.tsx` |
| Label/tag paket kustom | `usePackageLabels.ts`, `package_labels` table |
| Price audit & trend | `PackagePriceAuditCard`, `PackagePriceTrendCard` |
| Multi-currency + exchange rates | `AdminExchangeRates.tsx`, `exchange_rates` table |
| Itinerary template | `AdminItineraryTemplates.tsx` |
| Cancellation policies | `AdminCancellationPolicies.tsx` |
| Aturan ganti paket | `usePackageChangeRules.ts`, `PackageChangeRulesManager.tsx` |
| Rekomendasi AI, prediksi seat | `AdminRekomendasiPaket.tsx`, `AdminPrediksiSeat.tsx` |
| HPP / Cost items per keberangkatan | `DepartureCostItemsCard.tsx`, `departure_cost_items` table |
| Gallery paket | `PackageGalleryCard.tsx` |
| MilestoneTrackerCard — validasi dokumen NYATA | `MilestoneTrackerCard.tsx` ✅ |
| Template HPP paket (copy ke departure baru) | `package_hpp_templates` + `usePackageHPPTemplate` + `PackageHPPTemplateDialog` |
| Perbandingan paket side-by-side | `PackageCompare.tsx` |
| Batas diskon maksimum | `max_discount` di CouponForm + StepReviewDynamic |
| Auto-generate slug unik | `lib/slug.ts` |

### 🔧 Gap Analisis — Paket

| # | Temuan | Dampak | Prioritas |
|---|--------|--------|-----------|
| P-G1 | `booking_line_items` table ada tapi belum digunakan penuh di booking workflow — masih hardcoded total | Laporan per-item tidak akurat | 🟠 |
| P-G2 | Tidak ada validasi HPP > Harga Jual saat input cost items | Paket bisa dijual di bawah HPP tanpa warning | 🟡 |
| P-G3 | Tidak ada fitur expiry/masa berlaku paket otomatis (hanya manual) | Paket kadaluarsa masih tampil publik | 🟡 |
| P-G4 | Copy HPP template tidak validasi kolom baru (currency, exchange_rate) di departure baru | Potensi nilai HPP salah saat copy | 🟡 |

---

## MODUL 3 — KEBERANGKATAN (DEPARTURES)

### ✅ Yang Sudah Ada

| Fitur | Lokasi |
|-------|--------|
| Daftar & kelola keberangkatan | `AdminDepartures.tsx` |
| Detail keberangkatan (tab: jamaah, dokumen, perlengkapan, keuangan) | `AdminDepartureDetail.tsx` |
| Tracking real-time | `AdminDepartureTracking.tsx` |
| Seat hold system (15 menit) | `seat_holds` table, `useSeatHold.ts` |
| Manifest jamaah (cetak/export) | `ManifestPage.tsx`, `AdminManifestJamaah.tsx` |
| Rooming list + auto-assign kamar | `RoomingListPageImproved.tsx`, `AdminRoomAssignments.tsx` |
| Timeline perjalanan | `TripTimelinePage.tsx` |
| Check-in jamaah + QR scan | `CheckinPage.tsx`, `CheckinQRDialog.tsx` |
| Kesiapan keberangkatan (pre-checklist) | `DepartureReadinessPage.tsx`, `DeparturePreChecklist.tsx` |
| Absensi digital + harian tanah suci | `AdminAbsensiDigital.tsx`, `AdminAbsensiHarianTanahSuci.tsx` |
| Manajemen muthawif + penugasan | `AdminMuthawifs.tsx`, `AdminMuthawifDetail.tsx` |
| Penilaian jamaah oleh muthawif | `muthawif_jamaah_evaluations` table |
| Alert SOS | `AdminSOSAlerts.tsx` |
| Manajemen haji + SISKOHAT UI | `AdminHajiManagement.tsx`, `AdminSISKOHAT.tsx` |
| Kebijakan bagasi | `AdminBaggagePolicies.tsx` |
| Survey pasca keberangkatan | `AdminPostDepartureSurvey.tsx` |
| Laporan P&L per departure | `DeparturePLSummaryCard.tsx`, `departure_financial_summary` |
| HPP + biaya operasional | `DepartureCostItemsCard.tsx`, `DepartureExpensesCard.tsx` |
| Pendapatan lain-lain | `DepartureOtherRevenuesCard.tsx` |
| Margin calculator + comparison | `DepartureMarginCalculator.tsx`, `DepartureMarginComparison.tsx` |
| delete_departure_safely() — hapus aman | migration 20260513224928 |
| Visa summary | `DepartureVisaSummary.tsx` |
| Lock/freeze banner saat departed | Banner amber di AdminDepartureDetail |
| WA blast ke semua jamaah departure | `AdminWABlastKeberangkatan.tsx` |
| Export manifest ke Excel/PDF profesional | Format header, summary box, landscape PDF |

### 🔧 Gap Analisis — Keberangkatan

| # | Temuan | Dampak | Prioritas |
|---|--------|--------|-----------|
| D-G1 | SISKOHAT API Kemenag: UI ada tapi tanpa koneksi API nyata | Data SISKOHAT tidak sinkron | 🔴 |
| D-G2 | `recalculate_departure_financial_summary()` belum dipanggil otomatis via DB trigger saat ada perubahan di booking/payment — harus manual | Laporan P&L bisa stale | 🟠 |
| D-G3 | Bulk edit HPP cost items tidak tersedia — harus satu per satu | Lambat saat input puluhan item HPP | 🟡 |
| D-G4 | Live tracking posisi rombongan via peta GPS | Tidak ada live tracking | 🟡 |

---

## MODUL 4 — PERLENGKAPAN (EQUIPMENT)

### ✅ Yang Sudah Ada

| Fitur | Lokasi |
|-------|--------|
| Halaman utama perlengkapan | `pages/operational/EquipmentPage.tsx` |
| Master data perlengkapan | `AdminEquipmentMaster.tsx`, `MasterDataTab.tsx` |
| Pengaturan perlengkapan | `AdminEquipmentSettings.tsx` |
| Dashboard equipment | `dashboards/EquipmentDashboard.tsx` |
| Distribusi perlengkapan per jamaah | `EquipmentDistributionDialog.tsx` |
| Realisasi distribusi | `EquipmentRealizationTab.tsx` |
| Tambah stok | `AddStockDialog.tsx` |
| Cetak manifest perlengkapan | `PrintManifest.tsx` |
| Kesiapan equipment (card) | `EquipmentReadinessCard.tsx` |
| Retur/pengembalian perlengkapan | `EquipmentReturnDialog.tsx`, RPC `return_equipment_item` |
| Ukuran/size per jamaah | Kolom `size` + `has_sizes` + `available_sizes` |
| Konfirmasi penerimaan jamaah | `EquipmentConfirmationTab.tsx` |
| Laporan stok per departure | `EquipmentStockPerDeparture.tsx` |
| Alert stok rendah otomatis | Banner amber + badge klik |
| Export distribusi ke Excel | Tombol Export di Daftar Jamaah |
| Foto bukti distribusi | `EquipmentDistributionDialogWithPhoto.tsx` + kolom `distribution_photo_url` |
| Paket perlengkapan per tipe paket | `PackageTypeEquipmentCard.tsx` + `package_type_equipment` table |

### 🔧 Gap Analisis — Perlengkapan

| # | Temuan | Dampak | Prioritas |
|---|--------|--------|-----------|
| E-G1 | Biaya perlengkapan tidak otomatis masuk ke HPP departure — tidak ada link antara equipment cost dan departure_cost_items | HPP tidak mencerminkan biaya equipment | 🟠 |
| E-G2 | Tidak ada PO (Purchase Order) khusus equipment — hanya general PO | Tracking pengadaan equipment tidak terpisah | 🟡 |
| E-G3 | Tidak ada pelacakan serial number / kondisi barang per item | Untuk barang mahal (koper, dll) tidak bisa di-trace | 🟡 |

---

## MODUL 5 — HPP & KEUANGAN KEBERANGKATAN

### ✅ Yang Sudah Ada

| Fitur | Lokasi / Tabel |
|-------|----------------|
| HPP per item per keberangkatan | `departure_cost_items` (generated `total_cost_idr`) |
| Pengeluaran realisasi operasional | `departure_expenses` (generated `amount_idr`) |
| Pendapatan tambahan | `departure_other_revenues` (generated `amount_idr`) |
| Ringkasan keuangan (cache) | `departure_financial_summary` (generated: `gross_profit`, `net_profit`, `gross_margin_pct`) |
| Fungsi rekap otomatis | `recalculate_departure_financial_summary(p_departure_id)` |
| UI HPP: input, list, delete | `DepartureCostItemsCard.tsx` |
| UI Pengeluaran | `DepartureExpensesCard.tsx` |
| UI Pendapatan lain | `DepartureOtherRevenuesCard.tsx` |
| UI P&L Summary | `DeparturePLSummaryCard.tsx` |
| Margin Calculator & Comparison | `DepartureMarginCalculator.tsx`, `DepartureMarginComparison.tsx` |
| Keuangan terpadu (AR/AP/Cash/P&L) | `AdminFinanceTerpadu.tsx` |
| Finance sub-modules | `AdminFinanceAR.tsx`, `AdminFinanceAP.tsx`, `AdminFinanceCash.tsx`, `AdminFinancePL.tsx` |
| Generator & reminder cicilan | `AdminCicilanGenerator.tsx`, `AdminCicilanReminder.tsx` |
| Refund management | `AdminRefunds.tsx` |
| Laporan keuangan | `AdminLaporanKeuangan.tsx` |
| Export laporan (server-side PDF/Excel) | `GET /api/reports/export` |

### 🔧 Gap Analisis — HPP & Keuangan

| # | Temuan | Dampak | Prioritas |
|---|--------|--------|-----------|
| F-G1 | `recalculate_departure_financial_summary()` tidak dipanggil otomatis oleh DB trigger — harus dipanggil manual dari UI | Ringkasan P&L bisa tidak akurat jika lupa recalculate | 🔴 |
| F-G2 | Tidak ada warning/validasi saat HPP total > Harga Jual (margin negatif) sebelum departure dikonfirmasi | Departure bisa berjalan dengan margin merah tanpa alert | 🟠 |
| F-G3 | Tidak ada buku besar (general ledger) / chart of accounts formal | Tidak bisa generate laporan akuntansi standar | 🟠 |
| F-G4 | `booking_line_items` ada di DB tapi belum diintegrasikan — total booking masih dari `bookings.total_price` langsung | Detail rincian tagihan per item tidak akurat | 🟠 |
| F-G5 | Tidak ada rekonsiliasi otomatis antara pembayaran masuk vs total tagihan booking secara periodik | Selisih tidak terdeteksi dini | 🟡 |

---

## MODUL 6 — BOOKING

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Booking Wizard multi-step | `pages/booking/BookingPage.tsx` |
| ✅ | Step 1: Alokasi kamar | `StepRoomAllocation` |
| ✅ | Step 2: Data penumpang | `StepPassengersDynamic` |
| ✅ | Step 3: Sumber booking | `PICSelectionStep` |
| ✅ | Step 4: Review & submit | `StepReviewDynamic` |
| ✅ | AdminBookings, AdminBookingDetail, AdminBookingCreate | `pages/admin/` |
| ✅ | Multi-currency booking | migration 20260513130746 |
| ✅ | Booking mode: full/dp/savings | migration 20260513132826 |
| ✅ | Kupon diskon | `useCoupons.ts` |
| ✅ | Referral code tracking | `referral_codes`, `referral_usages` |
| ✅ | Approval workflow | `AdminApprovals.tsx` |
| ✅ | Seat hold 15 menit | `seat_holds` table |
| 🔧 | `booking_line_items` | Tabel ada, belum digunakan penuh — total masih dari `bookings.total_price` |

---

## MODUL 7 — PEMBAYARAN

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Midtrans Snap (QRIS, VA, GoPay) | `JamaahPayment.tsx` |
| ✅ | Upload bukti transfer manual | `PaymentUpload.tsx` |
| ✅ | Midtrans webhook handler | `supabase/functions/midtrans-webhook/` |
| ✅ | Sync paid_amount otomatis via trigger | `fase24_payment_sync_trigger.sql` |
| ✅ | transaction_id + payment_type | `fase23_payments_transaction_id.sql` |
| ✅ | Keuangan terpadu (AR/AP/Cash/P&L) | `AdminFinanceTerpadu.tsx` |
| ✅ | Generator & reminder cicilan | `AdminCicilanGenerator.tsx`, `AdminCicilanReminder.tsx` |
| ✅ | Refund management | `AdminRefunds.tsx` |
| ✅ | Laporan keuangan | `AdminLaporanKeuangan.tsx` |
| ✅ | WA reminder cicilan via `/api/whatsapp/payment-reminder` | Token aman di backend |

---

## MODUL 8 — TABUNGAN (SAVINGS)

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Dashboard, paket, daftar, fleksibel | `pages/savings/` |
| ✅ | savings_schedules, locked_price | migration 20260513111158 |
| ✅ | check-savings-reminders edge function | `supabase/functions/` |
| ✅ | Admin monitoring tabungan | `AdminMonitoringTabungan.tsx` |

---

## MODUL 9 — JAMAAH PORTAL

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Portal lengkap jamaah (35+ halaman) | `pages/jamaah/` |
| ✅ | ID Digital, dokumen, pembayaran, invoice | `pages/jamaah/` |
| ✅ | Checklist, notifikasi, tracking visa | `pages/jamaah/` |
| ✅ | Badge loyalitas, referral, sertifikat | `pages/jamaah/` |
| ✅ | Alat ibadah (kiblat, sholat, quran, tasbih) | `pages/jamaah/ibadah/` |
| ✅ | Jurnal ibadah, progress wall, kuis manasik | `pages/jamaah/` |
| ✅ | Pantau keluarga, SOS, peta lokasi | `pages/jamaah/` |
| ✅ | customer_notifications, jamaah_checklist | DB tables |
| ✅ | ibadah_progress table | migration 20260511014225 |

---

## MODUL 10 — AGEN

> Detail lengkap: lihat bagian **RENCANA MATANG: SISTEM AGEN, CABANG & SUB-AGEN** di bawah

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Dashboard, paket, jamaah, komisi | `pages/agent/` (22 halaman) |
| ✅ | CRM leads, jaringan sub-agen | `AgentLeads.tsx`, `AgentNetwork.tsx` |
| ✅ | Membership, target, leaderboard | `AgentMembership.tsx`, `AgentTargets.tsx`, `AgentLeaderboard.tsx` |
| ✅ | Training module + quiz | `AgentTraining.tsx`, `training_modules` table |
| ✅ | Kit digital, broadcast WA, link unik | `AgentDigitalKit.tsx`, `AgentBroadcast.tsx`, `AgentUniqueLink.tsx` |
| ✅ | Wallet, referral, website agen | `AgentWallet.tsx`, `AgentMyReferrals.tsx`, `AgentWebsiteSettings.tsx` |
| ✅ | Withdrawal management admin | `AdminWithdrawalManagement.tsx` |
| ✅ | API create agent (user+record+role) | `POST /api/agents/create` |
| ✅ | Tier komisi (Bronze→Platinum) | `agent_commission_tiers` table |
| ✅ | Override komisi (parent←sub) | `agent_override_commissions` table (schema only) |
| 🔧 | Kirim kredensial via WA saat buat akun | Logic belum ada |
| 🔧 | Override commission UI | Tabel ada, UI belum menampilkan data |
| ❌ | Form pendaftaran sub-agen publik | `/daftar-sub-agen?ref=KODE` belum ada |
| ❌ | Notif booking baru ke agen | Push notif belum terintegrasi |
| ❌ | Admin reset password agen | UI belum ada |

---

## MODUL 11 — CABANG (BRANCH)

> Detail lengkap: lihat bagian **RENCANA MATANG: SISTEM AGEN, CABANG & SUB-AGEN** di bawah

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Dashboard, booking, agen, staff | `pages/branch/` (9 halaman) |
| ✅ | Laporan, KPI targets | `BranchLaporan.tsx`, `BranchKPITargets.tsx` |
| ✅ | branch_monthly_targets table | SQL migration |
| ✅ | Website cabang + settings | `BranchWebsiteSettings.tsx` |
| ✅ | Persetujuan, diskon per cabang | `BranchApprovals.tsx`, `BranchDiskon.tsx` |
| ✅ | Komisi cabang per booking | `branch_commissions` table + triggers |
| 🔧 | Real-time KPI progress chart | Tabel ada, data fetch minimal |
| 🔧 | Branch comparison report | `AdminBranchComparison.tsx` ada, data fetch minimal |
| ❌ | Buat akun user saat tambah cabang | API baru support create agent, belum branch |
| ❌ | Branch data scoping di API | Branch manager masih bisa lihat data semua cabang |
| ❌ | Branch manager tambah staff dari portal | `BranchStaff.tsx` ada, create-user belum |

---

## MODUL 12 — WEBSITE PUBLIK

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Landing page + editor | `LandingPage.tsx`, `AdminLandingPageEditor.tsx` |
| ✅ | 7 tema + customisasi warna | `AdminAppearance.tsx`, `theme_presets` |
| ✅ | Website agen/cabang (multi-tenant) | `AgentWebsite.tsx`, `BranchWebsite.tsx` |
| ✅ | Blog, testimonial, banner, FAQ | `pages/admin/` |
| ✅ | Keberangkatan publik, search paket | `DeparturesPage.tsx`, `PackageSearch.tsx` |
| ✅ | Fitur islami publik (kiblat, sholat, quran, cuaca) | `pages/public/` |
| ✅ | Status booking publik (QR code) | `PublicBookingDetail.tsx` |
| ✅ | Kalkulator biaya + islami + kurs | `pages/public/` |

---

## MODUL 13 — NOTIFIKASI & KOMUNIKASI

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | WA Fonnte (outbox pattern) | `useWhatsAppNotifier.ts`, `whatsapp_logs` |
| ✅ | WA blast keberangkatan & tagihan | `AdminWABlastKeberangkatan.tsx` |
| ✅ | Push notification VAPID | `AdminPushNotifications.tsx`, `push_subscriptions` |
| ✅ | Push outbox + queue processor | `push_outbox`, edge function `process-push-queue` |
| ✅ | Template email | `AdminEmailTemplates.tsx` |
| ✅ | Pengumuman admin | `AdminAnnouncements.tsx` |
| ✅ | Smart notif, follow-up reminder | `AdminSmartNotif.tsx`, `AdminFollowUpReminder.tsx` |

### Fase 4 — WhatsApp Bot & Inbox (Multi-Provider)

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Multi-provider WA (Fonnte, Meta, Wablas, UltraMsg, Watzap, Custom) | `AdminWAProvider.tsx`, `whatsapp_config` |
| ✅ | Test koneksi non-destructive per provider | `POST /api/v1/whatsapp/provider/test`, `POST /api/v1/whatsapp/provider/:id/test` |
| ✅ | Broadcast tersegmentasi + template broadcast | `AdminWABroadcast.tsx`, `AdminWATemplateBroadcast.tsx` |
| ✅ | Chatbot auto-reply berbasis kata kunci | `AdminWAChatbot.tsx`, `wa_chatbot_keywords` |
| ✅ | Bot menu interaktif (nomor 1,2,3…) + Meta WABA interactive list | `AdminWABotMenu.tsx`, `wa_bot_menu_items` |
| ✅ | Inbox WA — lihat & balas pesan masuk dari admin panel | `AdminWAInbox.tsx`, `wa_incoming_messages` |
| ✅ | Kontak WA — daftar, opt-out, tags, sync dari data jamaah | `AdminWAContacts.tsx`, `wa_contacts` |
| ✅ | Riwayat percakapan per kontak (incoming + outgoing) | `AdminWAContacts.tsx` — panel riwayat, `GET /contacts/:id/messages` |
| ✅ | Webhook handler — incoming messages, delivery receipt, auto-reply | `POST /api/v1/whatsapp/webhook` |

---

## MODUL 14 — TOKO ONLINE (E-COMMERCE)

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Produk, kategori, pesanan, laporan | `pages/admin/AdminStore*.tsx` |
| ✅ | Stock opname + sesi + pergerakan stok | `AdminStoreOpname*.tsx` |
| ✅ | Purchase order, supplier | `AdminPurchaseOrders.tsx`, `AdminSuppliers.tsx` |
| ✅ | Toko publik + checkout + pesanan saya | `pages/customer/Store*.tsx` |
| ✅ | store_product_reviews | `store_product_reviews.sql` |
| ✅ | receive_purchase_order() | migration 20260513143441 |

---

## MODUL 15 — HR & KARYAWAN

### Struktur Database HR

| Tabel | Isi | Status |
|-------|-----|--------|
| `employees` | Data karyawan (gaji, jabatan, dept, devices) | ✅ Ada |
| `departments` | Master departemen | ✅ Ada |
| `positions` | Master jabatan per departemen | ✅ Ada |
| `attendance_records` | Rekam absensi harian | ✅ Ada |
| `work_schedules` | Jadwal kerja per karyawan per hari | ✅ Ada |
| `employee_devices` | Perangkat terdaftar untuk absensi | ✅ Ada |
| `hr_settings` | Pengaturan global HR (jam kerja, toleransi telat, dll) | ✅ Ada |
| `payroll_records` | Slip gaji per bulan per karyawan | ✅ Ada |
| `leave_requests` | Pengajuan cuti/izin (7 jenis) | ✅ Ada (DB) |
| `leave_quotas` | Kuota cuti tahunan per karyawan | ✅ Ada (DB) |
| `performance_reviews` | Penilaian kinerja (5 dimensi, overall_score generated) | ✅ Ada (DB) |

### UI AdminHR.tsx — 9 Tab

| Tab | Status UI | Status Koneksi DB |
|-----|-----------|-------------------|
| Karyawan | ✅ Lengkap | ✅ Terhubung ke `employees` |
| Absensi | ✅ Lengkap | ✅ Terhubung ke `attendance_records` |
| Penggajian | ✅ Lengkap | ⚠️ Link ke AdminPayroll (halaman terpisah) |
| **Cuti & Izin** | 🔧 UI ada, nilai hardcoded | ❌ **TIDAK terhubung** ke `leave_requests` + `leave_quotas` |
| **Kinerja** | 🔧 UI ada, semua nilai `—` | ❌ **TIDAK terhubung** ke `performance_reviews` |
| Departemen | ✅ Lengkap | ✅ Terhubung |
| Jadwal | ✅ Lengkap | ✅ Terhubung ke `work_schedules` |
| Perangkat | ✅ Lengkap | ✅ Terhubung ke `employee_devices` |
| Pengaturan | ✅ Lengkap | ✅ Terhubung ke `hr_settings` |

### UI AdminPayroll.tsx — 4 Tab

| Tab | Status |
|-----|--------|
| Overview (ringkasan per bulan) | ✅ Terhubung ke `payroll_records` |
| Slip Gaji (generate + cetak) | ✅ Terhubung |
| BPJS (kalkulasi BPJS Kes + TK) | ✅ Kalkulasi sudah benar (PPH21 tarif 2022) |
| Reports (PDF export) | ✅ Export PDF via jsPDF |

### 🔧 Gap Analisis — HR (Terperinci)

| # | Temuan | Dampak | Prioritas |
|---|--------|--------|-----------|
| **HR-G1** | **Tab Cuti & Izin tidak terhubung ke DB** — quota hardcoded 12, used hardcoded 0, tidak ada query ke `leave_requests` / `leave_quotas`, tombol "Ajukan Cuti" tidak ada handler | Cuti tidak bisa dicatat, disetujui, atau dipantau | 🔴 |
| **HR-G2** | **Tab Kinerja tidak terhubung ke DB** — semua nilai `—`, tidak ada query ke `performance_reviews`, tombol "Buat Review" tidak ada handler | Penilaian kinerja tidak bisa disimpan | 🔴 |
| HR-G3 | Overtime (lembur) tidak ada UI input — kolom `overtime_hours` + `overtime_pay` ada di `payroll_records` tapi tidak bisa diinput | Lembur tidak terhitung otomatis di payroll | 🟠 |
| HR-G4 | Rekap absensi bulanan tidak ada — hanya query per hari, tidak ada laporan trend kehadiran | Tidak bisa monitor kehadiran per bulan | 🟠 |
| HR-G5 | Training karyawan internal belum ada — hanya agent training yang tersedia | Karyawan tidak punya modul onboarding/pelatihan | 🟡 |
| HR-G6 | Tidak ada modul rekrutmen (applicant tracking) | Proses hiring tidak terdokumentasi | 🟡 |
| HR-G7 | PPH21 dihitung di frontend (AdminPayroll.tsx) — bisa di-bypass | Keamanan kalkulasi pajak | 🟡 |
| HR-G8 | RLS `leave_requests`: karyawan bisa ajukan cuti tapi HR harus approve — policy sudah ada tapi UI approval belum ada | Cuti diajukan tapi tidak bisa diproses | 🔴 (sama dengan G1) |

---

## MODUL 16 — LOYALITAS & GAMIFIKASI

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Program loyalitas + tier benefits | `AdminLoyalty.tsx`, `AdminTierBenefits.tsx` |
| ✅ | jamaah_badges + 5 auto-trigger | migration 20260513114043 |
| ✅ | Referral admin + kode kupon | `AdminReferrals.tsx`, `AdminCoupons.tsx` |

---

## MODUL 17 — ANALITIK & LAPORAN

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Dashboard utama, KPI, analitik lanjutan | `pages/admin/` |
| ✅ | Laporan terjadwal | `AdminScheduledReports.tsx` |
| ✅ | Analisis sentimen feedback | `AdminSentimenFeedback.tsx` |
| ✅ | Dashboard per role | `pages/admin/dashboards/` |
| ✅ | Ringkasan AI (Gemini) | `AdminAISummary.tsx`, `AdminGeminiAI.tsx` |
| ✅ | Web Vitals + PWA install stats | `AdminWebVitals.tsx`, `AdminPWAInstallStats.tsx` |

---

## MODUL 18 — MUTHAWIF PORTAL

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Dashboard, profil jamaah, laporan harian | `pages/muthawif/` |
| ✅ | Penilaian jamaah + evaluasi | `muthawif_jamaah_evaluations` table |
| ✅ | SOS alert | `MuthawifSOS.tsx` |

---

## MODUL 19 — PENGATURAN SISTEM

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Pengaturan umum (company_settings) | `AdminSettings.tsx` |
| ✅ | Manajemen user + RBAC | `AdminUsers.tsx`, `AdminRoleManagement.tsx` |
| ✅ | Koneksi API + webhook | `AdminApiConnect.tsx`, `AdminWebhooks.tsx` |
| ✅ | PWA settings + offline content | `AdminPWASettings.tsx` |
| ✅ | Log aktivitas (audit_logs) | `AdminActivityLog.tsx` |
| ✅ | Menu sync manager (dynamic sidebar) | `MenuSyncManager.tsx`, `menu_items` |
| ✅ | PDF & invoice template | `AdminPDFLayout.tsx`, `AdminInvoiceTemplate.tsx` |

---

## BACKEND API ROUTES (EXPRESS PORT 8080)

### ✅ Sudah Ada

| Route | Method | Keterangan |
|-------|--------|------------|
| `/api/manifest.webmanifest` | GET | PWA manifest dinamis |
| `/api/v1/packages` | GET | Paket dari DB |
| `/api/v1/departures` | GET | Jadwal keberangkatan |
| `/api/v1/leads` | POST | Simpan lead/prospek |
| `/api/v1/chatbot` | POST | Chatbot AI |
| `/api/v1/kurs` | GET | Kurs real-time |
| `/api/email/send` | POST | Kirim email SMTP |
| `/api/midtrans/create-transaction` | POST | Token Midtrans Snap |
| `/api/push/*` | GET/POST | Push notification VAPID |
| `/api/whatsapp/send` | POST | Proxy Fonnte (token aman di backend) |
| `/api/whatsapp/notification` | POST | WA notifikasi 6 template |
| `/api/whatsapp/payment-reminder` | POST | WA reminder pembayaran massal |
| `/api/agents/create` | POST | Buat agent + Supabase auth user |
| `/api/hr/employees` | POST/DELETE | Kelola karyawan |
| `GET /api/dashboard/stats` | GET | Stats booking/payment/departure/customer |
| `POST /api/scheduler/run` | POST | Trigger manual cron |
| `GET /api/reports/export` | GET | Export PDF/Excel server-side |

### ❌ Route yang Belum Ada (Prioritas)

| Route | Prioritas | Dampak |
|-------|-----------|--------|
| `POST /api/midtrans/webhook` | 🔴 | Status tidak auto-update (sudah ada di Supabase EF, belum di Express) |

---

## KEAMANAN — STATUS

| # | Masalah | Status |
|---|---------|--------|
| S1 | WA token terekspos di browser | ✅ Sudah migrasi ke `/api/whatsapp/send` |
| S2 | **VITE_SUPABASE_URL + PUBLISHABLE_KEY kosong** | ⚠️ Set di Replit Secrets |
| S3 | **VAPID_PRIVATE_KEY** harus di env secret | ⚠️ Cek Secrets |
| S4 | PPH21 dihitung di frontend | 🟡 Risiko rendah, bisa pindah ke API |

---

## RENCANA PERBAIKAN TERPERINCI

### 🔴 PRIORITAS 1 — KRITIS (Fitur ada di DB, UI tidak terhubung)

| ID | Perbaikan | Modul | Status |
|----|-----------|-------|--------|
| **FIX-HR1** | **Sambungkan Tab Cuti & Izin ke DB** — query `leave_requests` + `leave_quotas`, form ajukan cuti, approval flow (approve/reject), kuota real dari DB | HR | ✅ **SELESAI** |
| **FIX-HR2** | **Sambungkan Tab Kinerja ke DB** — query `performance_reviews`, form input penilaian (5 dimensi), hitung overall_score, grade otomatis | HR | ✅ **SELESAI** |
| **FIX-F1** | **Trigger otomatis `recalculate_departure_financial_summary`** — tambahkan DB trigger pada `bookings` dan `payments` yang memanggil fungsi ini | HPP/Keuangan | ❌ Belum |

### 🟠 PRIORITAS 2 — PENTING (Meningkatkan akurasi data)

| ID | Perbaikan | Modul |
|----|-----------|-------|
| FIX-HR3 | Rekap absensi bulanan — agregasi `attendance_records` per bulan per karyawan, tampilkan chart trend kehadiran | HR |
| FIX-HR4 | Input lembur (overtime) di payroll — UI form input jam lembur, kalkulasi `overtime_pay` otomatis | HR |
| FIX-F2 | Warning margin negatif — alert otomatis di DepartureCostItemsCard saat `hpp_total > revenue_gross` | HPP |
| FIX-P1 | Integrasi `booking_line_items` ke booking workflow — simpan per item saat booking dibuat | Paket/Booking |

### 🟡 PRIORITAS 3 — NICE TO HAVE

| ID | Perbaikan | Modul |
|----|-----------|-------|
| FIX-D1 | Bulk edit HPP cost items | Keberangkatan |
| FIX-E1 | Link biaya equipment ke HPP departure | Perlengkapan |
| FIX-HR5 | Modul training internal karyawan | HR |
| FIX-D2 | SISKOHAT API Kemenag (butuh akses API resmi) | Keberangkatan |

---

## PERBAIKAN YANG SUDAH DIKERJAKAN

| # | Item | Status |
|---|------|--------|
| 1 | **SQL konsolidasi** — hapus folder duplikat | ✅ |
| 2 | **MilestoneTrackerCard** — validasi dokumen nyata dari `customer_documents` DB | ✅ |
| 3 | **AdminPackageDetail** — pass `departureId` ke MilestoneTrackerCard | ✅ |
| 4 | **build.mjs (API server)** — tidak crash saat `src/sql` tidak ada | ✅ |
| 5 | **Rencana.md** — satu file tunggal | ✅ |
| 6 | **pnpm install** — dependencies terinstall, kedua workflow running | ✅ |
| 7 | **TypeScript build error fix** — types equipment_distributions, return_equipment_item | ✅ |
| 8 | **SQL bootstrap files** — bootstrap auth, missing tables, bookings columns, gallery_media_type | ✅ |
| 9 | **QR Code Invoice** — embed QR publik di Form Transaksi PDF | ✅ |
| 10 | **Invoice Template dinamis** — toggle QR + 3 pilihan posisi | ✅ |
| 11 | **Fix notif WA error modal** — safe JSON parse, modal dialog + instruksi setup FONNTE_TOKEN | ✅ |
| 12 | **Cetak Ulang Barcode** — modal cetak QR label per booking (3 ukuran) | ✅ |
| 13 | **D5 – Lock banner departure departed** | ✅ |
| 14 | **E5 – Alert stok rendah otomatis** | ✅ |
| 15 | **E6 – Export distribusi perlengkapan ke Excel** | ✅ |
| 16 | **K5 – Notif WA kamar ke semua jamaah** | ✅ |
| 17 | **K2 – Denah lantai visual (Floor Plan)** | ✅ |
| 18 | **Room-swap via drag-and-drop** | ✅ |
| 19 | **K6 – Validasi kompatibilitas mahram** | ✅ |
| 20 | **K3 – Batas kapasitas kamar per hotel** | ✅ |
| **21** | **FIX-HR1: Tab Cuti & Izin terhubung ke DB** — query `leave_requests` + `leave_quotas`, form pengajuan, approval flow | ✅ |
| **22** | **FIX-HR2: Tab Kinerja terhubung ke DB** — query `performance_reviews`, form input 5 dimensi, grade otomatis | ✅ |

---

## BACKLOG AKTIF

### 🔴 KRITIS (Perlu tindakan user)

| # | Task | Modul |
|---|------|-------|
| B1 | Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` + `SUPABASE_SERVICE_ROLE_KEY` di Replit Secrets — **tanpa ini semua fitur Supabase tidak aktif** | Semua |

### 🟠 SEGERA DIKERJAKAN

| # | Task | Modul |
|---|------|-------|
| FIX-F1 | Trigger DB otomatis recalculate P&L saat booking/payment berubah | HPP/Keuangan |
| FIX-HR3 | Rekap absensi bulanan + trend chart | HR |
| FIX-HR4 | Input lembur di payroll | HR |
| FIX-F2 | Warning margin negatif di DepartureCostItemsCard | HPP |

### 🟡 NICE TO HAVE

| # | Task | Modul |
|---|------|-------|
| B11 | Integrasi SISKOHAT API Kemenag (D-G1) — butuh akses API Kemenag | Keberangkatan |
| B16 | Live tracking posisi rombongan GPS (D-G4) | Keberangkatan |
| FIX-HR5 | Modul training internal karyawan | HR |
| FIX-E1 | Link biaya equipment ke HPP departure | Perlengkapan |
| FIX-P1 | Integrasi `booking_line_items` ke booking workflow | Paket |

---

## EDGE FUNCTIONS (SUPABASE)

| Status | Nama | Fungsi |
|--------|------|--------|
| ✅ | `check-document-deadlines` | Reminder deadline dokumen jamaah |
| ✅ | `check-savings-reminders` | Reminder cicilan tabungan |
| ✅ | `manifest` | PWA manifest.json dinamis per tenant |
| ✅ | `midtrans-webhook` | Auto-update status booking setelah bayar |
| ✅ | `process-push-queue` | Proses antrian push notification (cron) |
| ✅ | `push-subscribe` | Daftar/hapus push subscription browser |
| ✅ | `request-2fa-otp` | Kirim OTP untuk 2FA |
| ✅ | `send-booking-recovery` | Email recovery booking terbengkalai |
| ✅ | `send-push` | Kirim push notification VAPID |
| ✅ | `verify-2fa-otp` | Verifikasi OTP 2FA |

---

## RINGKASAN KODE

```
Total halaman (pages):     311 file
Total komponen (TSX):      653 file
Total hooks:                70+ hooks
Total migration files:      61 file SQL (sql/migrations/001–061)
Total tabel database:       70+ tabel
Total role RBAC:            15 role
Edge functions (Supabase):  10 function
Express API routes:         ~18 endpoint aktif

Fitur tersedia di kode:    ~96% (✅)
Fitur UI ada tapi DB kosong: ~2% (🔧) → sedang diperbaiki
Fitur belum ada:            ~2% (❌)
```

---

## RENCANA MATANG: SISTEM AGEN, CABANG & SUB-AGEN

> **Diperbarui:** Juni 2026  
> **Tujuan:** Peta lengkap arsitektur, gap analisis, dan sprint plan fitur Agen-Cabang-Sub-Agen

---

### A. ARSITEKTUR AKUN & HIERARKI

Setiap agen dan cabang **memiliki akun user sendiri** (email + password) yang terhubung ke tabel `auth.users`. Menu yang bisa diakses dikontrol oleh `role_permissions` — yang bisa diubah oleh `super_admin`, `owner`, atau role berotorisasi.

```
HIRARKI SISTEM
══════════════════════════════════════════════════════════
Pusat (Kantor Pusat)
│  Role: super_admin / owner / IT / operational / finance / sales / HR
│  Akses: SEMUA modul
│
├── Cabang Kota A  (branch_id = uuid-A)
│   │  Role: branch_manager  →  user_roles.branch_id = uuid-A
│   │  Portal: /cabang/*
│   │  Akses: booking, agen, staff, KPI, laporan — HANYA scope cabang
│   │
│   ├── Staff Operasional A  (role: operational, branch_id = uuid-A)
│   │      Akses: jadwal, equipment, keberangkatan — HANYA cabang A
│   │
│   ├── Staff Sales A  (role: sales, branch_id = uuid-A)
│   │      Akses: leads, booking baru — HANYA cabang A
│   │
│   ├── Agen A1  (agents.user_id, agents.branch_id = uuid-A)
│   │   │  Role: agent  →  Portal: /agent/*
│   │   │  Akses: paket, jamaah sendiri, komisi, wallet, CRM
│   │   │
│   │   ├── Sub-Agen A1.1  (agents.parent_agent_id = A1)
│   │   │      Role: sub_agent  →  Portal: /agent/*  (akses terbatas)
│   │   │      Akses: paket, jamaah sendiri, link unik — NO komisi/wallet
│   │   │
│   │   └── Sub-Agen A1.2
│   │
│   └── Agen A2  (independen di cabang A)
│
├── Cabang Kota B  (branch_id = uuid-B)
│   └── ...
│
└── Agen Independen  (agents.branch_id = NULL)
       Langsung di bawah kantor pusat
══════════════════════════════════════════════════════════
```

**Mapping Tabel Database:**
| Entitas | Tabel Akun | FK Hierarki | Role di user_roles |
|---------|-----------|-------------|-------------------|
| Branch Manager | `auth.users` | `branches.manager_user_id` | `branch_manager` + `branch_id` |
| Branch Staff | `auth.users` | `user_roles.branch_id` | `operational`/`sales`/`finance` + `branch_id` |
| Agen | `auth.users` | `agents.user_id` | `agent` |
| Sub-Agen | `auth.users` | `agents.parent_agent_id` | `sub_agent` |

---

### B. RBAC & MENU ACCESS CONTROL (Kunci Sistem)

**Cara kerja saat ini:**
- Tabel `menu_items` → daftar semua item menu dengan `required_permission`
- Tabel `role_permissions` → mapping `(role, permission_key)`
- Hook `useCanAccess(permissionKey)` di frontend → cek apakah user role punya akses
- Super admin sudah bisa kelola via `AdminRoleManagement.tsx`

**Yang masih kurang:**
| Gap | Deskripsi | Prioritas |
|-----|-----------|-----------|
| 🔧 Per-branch scoping di API | Branch manager masih bisa lihat data cabang lain | P1 URGENT |
| ❌ Per-user permission override | Override izin untuk user spesifik (bukan hanya per role) | P2 |
| ❌ Sub-agent menu kustom | Super admin bisa define menu mana yang tampil ke sub_agent | P2 |
| ❌ Agen dapat lihat status persetujuan akun | Saat akun dibuat, agen perlu notif bahwa akun aktif | P2 |
| ❌ Self-service password reset admin | Admin bisa reset password agen/cabang | P2 |

**Alur yang diinginkan (sudah ada schema, perlu UI):**
```
Super Admin / Owner / IT
  → Buka menu "Manajemen Role & Izin"
  → Pilih role: agent | sub_agent | branch_manager
  → Toggle on/off setiap menu item
  → Simpan → role_permissions terupdate
  → Semua user dengan role tersebut langsung terdampak
```

---

### C. ANALISIS STATUS FITUR LENGKAP

#### C1. MANAJEMEN CABANG (Admin → /admin/branches)

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | CRUD cabang (nama, kode, kota, provinsi, alamat) | `AdminBranches.tsx` |
| ✅ | Assign branch manager (set manager_user_id) | `AdminBranches.tsx` |
| ✅ | Website cabang (hero, tagline, logo, galeri) | `BranchWebsiteSettings.tsx` |
| ✅ | Perbandingan antar cabang (basic) | `AdminBranchComparison.tsx` |
| ✅ | Komisi per cabang di booking | `branch_commissions` table |
| 🔧 | **Buat akun user otomatis saat buat cabang** | `POST /api/agents/create` ada, belum untuk branch |
| 🔧 | **Kirim kredensial ke branch manager via WA/email** | Logic belum ada |
| ❌ | **Branch data scoping di API** | API masih return data semua cabang |
| ❌ | **Tambah staff ke cabang dari admin panel** | UI ada (`BranchStaff.tsx`) tapi tidak ada create-user |
| ❌ | **Laporan keuangan konsolidasi per cabang** | Placeholder ada, data kosong |

#### C2. PORTAL CABANG (/cabang/*)

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Dashboard cabang (stats dasar) | `BranchDashboard.tsx` |
| ✅ | Daftar booking scope cabang | `BranchBookings.tsx` |
| ✅ | Manajemen agen di cabang | `BranchAgen.tsx` |
| ✅ | Manajemen staff cabang | `BranchStaff.tsx` |
| ✅ | KPI Targets bulanan | `BranchKPITargets.tsx` |
| ✅ | Persetujuan (approval) booking | `BranchApprovals.tsx` |
| ✅ | Diskon cabang | `BranchDiskon.tsx` |
| ✅ | Laporan cabang | `BranchLaporan.tsx` |
| 🔧 | **Real-time KPI progress** | Tabel ada, data fetch minimal |
| ❌ | **Buat akun user staff dari portal cabang** | Branch manager tidak bisa tambah staff sendiri |
| ❌ | **Komisi cabang real-time** | Dashboard tidak tampilkan angka komisi terkini |
| ❌ | **Notifikasi booking baru ke branch manager** | Belum ada event listener |

#### C3. MANAJEMEN AGEN (Admin → /admin/agents)

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Daftar agen + hierarki sub-agen (expandable) | `AdminAgents.tsx` |
| ✅ | Tambah agen → buat user + set role + buat record agent | `POST /api/agents/create` |
| ✅ | Edit komisi rate agen | `AdminAgents.tsx` |
| ✅ | Approval komisi agen | `AdminAgentCommissionReport.tsx` |
| ✅ | Laporan komisi agen | `AdminLaporanAgen.tsx` |
| ✅ | Tier komisi (berdasarkan volume booking) | `agent_commission_tiers` table |
| 🔧 | **Kirim kredensial ke agen via WA/email** | API buat user sudah ada, notif belum |
| 🔧 | **Override commission UI** | Tabel `agent_override_commissions` ada, UI belum |
| ❌ | **Performance analitik per agen** | Hanya stats dasar (total booking, total komisi) |
| ❌ | **Laporan master komisi** | Gabungan agen+cabang+sub-agen untuk CFO/Finance |
| ❌ | **Suspend/reaktivasi agen** | Hanya soft-delete, tidak ada flow suspend dengan notif |

#### C4. PORTAL AGEN (/agent/*)

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Dashboard (stats bookings, komisi, leads) | `AgentDashboard.tsx` |
| ✅ | Daftar & cari paket | `AgentPackages.tsx` |
| ✅ | Daftarkan jamaah (booking baru) | `AgentRegister.tsx`, `AgentRegisterGroup.tsx` |
| ✅ | Daftar jamaah sendiri | `AgentJamaahEnhanced.tsx` |
| ✅ | Komisi & history pencairan | `AgentCommissions.tsx` |
| ✅ | Wallet & withdrawal request | `AgentWallet.tsx` |
| ✅ | Jaringan sub-agen | `AgentNetwork.tsx` |
| ✅ | Jamaah dari sub-agen | `AgentSubAgentJamaah.tsx` |
| ✅ | CRM leads pipeline | `AgentLeads.tsx` |
| ✅ | Broadcast WA massal | `AgentBroadcast.tsx` |
| ✅ | Link unik + landing page | `AgentUniqueLink.tsx` |
| ✅ | Kit digital (materi promosi) | `AgentDigitalKit.tsx` |
| ✅ | Training modul + quiz | `AgentTraining.tsx` |
| ✅ | Membership tier (Silver/Gold/Platinum) | `AgentMembership.tsx` |
| ✅ | Referral & tracking | `AgentMyReferrals.tsx` |
| ✅ | Leaderboard & gamifikasi | `AgentLeaderboard.tsx` |
| ✅ | Target bulanan | `AgentTargets.tsx` |
| ✅ | Settings profil agen | `AgentSettings.tsx` |
| ✅ | Website agen (landing page kustom) | `AgentWebsiteSettings.tsx` |
| ✅ | Laporan pribadi | `AgentLaporan.tsx` |
| 🔧 | **Override commission tampil ke agen** | Tabel ada, UI belum tampilkan earning dari sub-agen |
| ❌ | **Undang sub-agen via form publik** | Link unik ada, tapi form pendaftaran sub-agen belum terintegrasi |
| ❌ | **Notif booking baru dari link agen** | Agen tidak ternotif saat ada booking masuk dari linknya |

#### C5. PORTAL SUB-AGEN (subset /agent/*)

| Status | Fitur | Akses |
|--------|-------|-------|
| ✅ | Dashboard (terbatas) | role: sub_agent |
| ✅ | Lihat paket | sub_agent |
| ✅ | Daftarkan jamaah | sub_agent |
| ✅ | Link unik sendiri | sub_agent |
| ❌ | **Komisi untuk sub-agen** | sub_agent tidak dapat komisi langsung (perlu kebijakan bisnis) |
| ❌ | **Onboarding publik sub-agen** | Form pendaftaran melalui link agen belum ada |
| ❌ | **Batasan menu sub-agen** | Masih menggunakan menu yang sama dengan agen utama |

---

### D. FITUR YANG PERLU DIBANGUN (Prioritas)

#### 🔴 P1 — CRITICAL (Blokir operasional)

| ID | Fitur | Deskripsi | Sprint |
|----|-------|-----------|--------|
| P1-A | **Branch Data Scoping** | API filter semua query berdasarkan `branch_id` untuk `branch_manager` | Sprint 1 |
| P1-B | **Create Branch User Account** | Saat admin buat cabang baru, otomatis buat akun user untuk manager | Sprint 1 |
| P1-C | **Kirim Kredensial via WA** | Setelah akun agen/cabang dibuat, kirim username+temp-password via WA | Sprint 1 |
| P1-D | **Admin Reset Password Agen** | Admin bisa reset password agen/branch dari halaman user management | Sprint 1 |

#### 🟡 P2 — HIGH (Segera setelah P1)

| ID | Fitur | Deskripsi | Sprint |
|----|-------|-----------|--------|
| P2-A | **Override Commission UI** | UI untuk lihat & approve komisi override parent-agen dari sub-agen | Sprint 2 |
| P2-B | **Sub-Agent Onboarding Form** | Form pendaftaran sub-agen via link unik agen, approval oleh admin | Sprint 2 |
| P2-C | **Branch Staff Create User** | Branch manager bisa tambah staff (operational/sales) + buat akun user | Sprint 2 |
| P2-D | **Notif Booking Baru ke Agen** | Push notif ke agen saat ada booking masuk via link/referral mereka | Sprint 2 |
| P2-E | **KPI Real-Time Dashboard** | Branch manager lihat progress KPI bulan ini vs target (chart) | Sprint 2 |

#### 🟢 P3 — MEDIUM (Nilai tambah)

| ID | Fitur | Deskripsi | Sprint |
|----|-------|-----------|--------|
| P3-A | **Master Laporan Komisi** | Satu halaman gabungan: komisi agen + branch + sub-agen untuk CFO | Sprint 3 |
| P3-B | **Analitik Performa Agen** | Per-agen: grafik booking/komisi per bulan, trending, konversi lead | Sprint 3 |
| P3-C | **Per-User Permission Override** | Izin spesifik per user (override role default) via admin panel | Sprint 3 |
| P3-D | **Branch Comparison Report** | Bandingkan kinerja 2+ cabang (booking, revenue, agen aktif) | Sprint 3 |
| P3-E | **Suspend/Reaktivasi Agen** | Admin suspend agen (block login) dengan notif WA otomatis | Sprint 3 |

---

### E. ALUR ONBOARDING AGEN & CABANG

#### E1. Admin Buat Cabang Baru
```
Admin → /admin/branches → Tambah Cabang
  → Isi: nama, kode, kota, alamat
  → Isi: email manager + no. HP manager
  → [Backend] Buat auth.users (email, temp password)
  → [Backend] Buat record branches (manager_user_id = user baru)
  → [Backend] Set user_roles: role=branch_manager, branch_id=cabang baru
  → [Backend] Buat profil (profiles table)
  → [Backend] Kirim WA ke manager: "Akun Anda telah dibuat. Login: {email} Password: {tempPass}"
  → Manager login → wajib ganti password → mulai kelola cabang
```

#### E2. Admin Buat Agen Baru
```
Admin → /admin/agents → Tambah Agen
  → Isi: nama perusahaan agen, kode agen, no. HP, email
  → Pilih: cabang (opsional, untuk agen independen: kosongkan)
  → Isi: tarif komisi (%)
  → [Backend] Buat auth.users (email, temp password)
  → [Backend] Buat record agents (user_id = user baru, parent_agent_id = NULL)
  → [Backend] Set user_roles: role=agent
  → [Backend] Kirim WA: "Akun agen Anda aktif. Login: {email} Pass: {tempPass}"
  → Agen login → akses /agent/* → mulai promosi
```

#### E3. Agen Undang Sub-Agen
```
Agen → /agent/network → Salin Link Undang Sub-Agen
  → Link: /daftar-sub-agen?ref={agent_code}
  → Calon sub-agen buka link → isi form (nama, HP, email, KTP)
  → [Backend] Buat record pending di agents (status=pending, parent_agent_id=agen)
  → Admin mendapat notif → review → approve/tolak
  → Jika approve:
    → [Backend] Buat auth.users + set role=sub_agent
    → [Backend] Update agents.status = active, user_id = user baru
    → Notif WA ke sub-agen: "Pendaftaran disetujui. Login: {email} Pass: {tempPass}"
    → Notif WA ke parent agen: "Sub-agen {nama} telah disetujui"
```

#### E4. Branch Manager Tambah Staff
```
Branch Manager → /cabang/staff → Tambah Anggota Tim
  → Isi: nama, jabatan (operational/sales/finance), email, HP
  → [Backend] Buat auth.users (email, temp password)
  → [Backend] Set user_roles: role={jabatan}, branch_id={cabang manager}
  → [Backend] Buat profil
  → [Backend] Kirim WA ke staff: "Selamat bergabung. Login: {email} Pass: {tempPass}"
  → Staff login → akses menu sesuai jabatan, hanya scope cabang sendiri
```

---

### F. SISTEM KOMISI

#### F1. Jenis Komisi
| Jenis | Dari Siapa | Ke Siapa | Tabel |
|-------|-----------|----------|-------|
| Komisi Agen | Booking via agen | Agen | `agent_commissions` |
| Komisi Cabang | Booking di cabang | Cabang | `branch_commissions` |
| Override Agen | Booking sub-agen | Parent agen | `agent_override_commissions` |
| Fee Referral | Booking via kode referral | Referrer | `referral_usages` |
| Bonus Tier | Bulanan, capai target tier | Agen | `agent_commission_tiers` |

#### F2. Alur Approval Komisi
```
Booking LUNAS
  → Trigger: sync_booking_payment_totals()
  → Jika booking.agent_id ada:
      INSERT agent_commissions (status=pending, amount=harga×rate)
  → Jika agents.parent_agent_id ada:
      INSERT agent_override_commissions (status=pending, amount=komisi×override_rate)
  → Admin Finance → /admin/commissions → Review → Approve
  → Status → 'approved' → Siap dicairkan
  → Agen request withdrawal → Admin proses transfer → status 'paid'
```

#### F3. Tier Komisi (Sudah Ada Schema)
| Tier | Min Booking | Rate | Bonus |
|------|------------|------|-------|
| Bronze | 0 | 3% | 0 |
| Silver | 5 | 4% | Rp 500rb |
| Gold | 15 | 5% | Rp 1.5jt |
| Platinum | 30 | 6% | Rp 3jt |

*(Rate dan threshold bisa diubah oleh admin di `agent_commission_tiers`)*

---

### G. MENU ACCESS CONTROL — DESAIN LENGKAP

**Tabel yang digunakan:**
- `menu_items` — daftar semua menu dengan `required_permission` & `group_name`
- `role_permissions` — `(role, permission_key)` — admin bisa edit via UI

**Flow menu visibility:**
```
User login (role=agent)
  → useCanAccess("dashboard") → cek role_permissions → return true/false
  → Sidebar: tampilkan hanya menu yang user punya akses
  → PermissionRoute: block halaman jika tidak punya izin

Super Admin / Owner / IT
  → /admin/role-management → pilih role
  → Toggle on/off setiap permission_key
  → Simpan → langsung berlaku (no cache invalidation needed)
```

**Menu yang bisa di-toggle per role:**

| Grup Menu | Agent | Sub-Agen | Branch Mgr | Default |
|-----------|-------|----------|-----------|---------|
| Dashboard | ✅ wajib | ✅ wajib | ✅ wajib | ON |
| Daftar Paket | ✅ | ✅ | ✅ | ON |
| Daftar Jamaah | ✅ | ✅ | ✅ | ON |
| Komisi & Wallet | ✅ | ❌ OFF | ❌ OFF | agent=ON |
| Jaringan Sub-Agen | ✅ | ❌ OFF | ❌ OFF | agent=ON |
| CRM Leads | ✅ | ❌ OFF | ✅ | agent=ON |
| Broadcast WA | ✅ | ❌ OFF | ❌ OFF | agent=ON |
| Link Unik | ✅ | ✅ | ❌ OFF | ON |
| Training | ✅ | ✅ | ✅ | ON |
| Leaderboard | ✅ | ✅ | ❌ OFF | agent=ON |
| Target KPI | ✅ | ❌ OFF | ✅ | ON |
| Website Agen | ✅ | ❌ OFF | ✅ | ON |
| Laporan | ✅ | ❌ OFF | ✅ | ON |
| Kit Digital | ✅ | ✅ | ❌ OFF | ON |
| Approval | ❌ | ❌ | ✅ | branch=ON |
| Staff Cabang | ❌ | ❌ | ✅ | branch=ON |

*Admin/owner bisa toggle setiap baris ini via UI → `role_permissions` diupdate*

---

### H. SCHEMA TAMBAHAN YANG DIBUTUHKAN

File SQL baru yang perlu dibuat:

```sql
-- 062_agent_status_field.sql
-- Tambah kolom status ke tabel agents untuk support pending/suspended
ALTER TABLE agents ADD COLUMN IF NOT EXISTS
  status TEXT NOT NULL DEFAULT 'active'
  CHECK (status IN ('pending', 'active', 'suspended', 'inactive'));

-- 063_branch_staff_management.sql
-- Tabel untuk tracking staff di cabang (sudah ada user_roles.branch_id)
-- tapi perlu kolom tambahan: jabatan, tanggal bergabung, dll
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS jabatan TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS joined_at DATE;

-- 064_agent_invitation_tokens.sql
-- Token undangan untuk sub-agen mendaftar via link
CREATE TABLE IF NOT EXISTS agent_invitation_tokens (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  token           TEXT NOT NULL UNIQUE,
  used_at         TIMESTAMPTZ,
  used_by_agent_id UUID REFERENCES agents(id),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### I. SPRINT PLAN IMPLEMENTASI

#### Sprint 1 — Fondasi Akun (1–2 minggu)
1. **P1-B**: Update `POST /api/agents/create` → support buat branch+user sekaligus
2. **P1-A**: Branch data scoping di supabaseProxy — filter `branch_id` untuk `branch_manager`
3. **P1-C**: Integrasi WA Fonnte untuk kirim kredensial saat akun dibuat
4. **P1-D**: Halaman admin "Reset Password User" (`AdminUsers.tsx`)
5. **SQL**: Migration `062_agent_status_field.sql`

#### Sprint 2 — Onboarding & Kolaborasi (1–2 minggu)
1. **P2-B**: Form pendaftaran sub-agen publik (`/daftar-sub-agen?ref=KODE`)
2. **P2-C**: `BranchStaff.tsx` → tambah fungsi create user + assign ke cabang
3. **P2-D**: Push notif ke agen saat booking baru masuk
4. **P2-E**: KPI real-time chart di `BranchDashboard.tsx`
5. **SQL**: Migration `064_agent_invitation_tokens.sql`

#### Sprint 3 — Laporan & Analitik (1–2 minggu)
1. **P2-A**: Override commission UI di portal agen + admin approval
2. **P3-A**: Halaman "Master Laporan Komisi" untuk Finance/CFO
3. **P3-B**: Chart analitik per-agen (konversi, trend, top packages)
4. **P3-D**: Branch comparison report yang penuh data
5. **P3-E**: Suspend/reaktivasi agen + notif WA otomatis

---

*Rencana ini mencakup seluruh sistem Agen-Cabang-Sub-Agen. Implementasi mulai dari Sprint 1.*

---

*Terakhir diperbarui: Juni 2026 — Analisis mendalam modul paket, keberangkatan, perlengkapan, HPP, keuangan, dan HR + Rencana Agen-Cabang-Sub-Agen*  
*SQL kanonikal: `sql/migrations/` (001–061) + `sql/MASTER_FRESH_INSTALL.sql`*  
*Supabase migrations: `supabase/migrations/`*
