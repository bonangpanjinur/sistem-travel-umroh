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

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Dashboard, paket, jamaah, komisi | `pages/agent/` |
| ✅ | CRM leads, jaringan sub-agen | `pages/agent/` |
| ✅ | Membership, target, leaderboard | `pages/agent/` |
| ✅ | Training module + quiz | `training_modules`, `training_quizzes` |
| ✅ | Kit digital, broadcast WA, link unik | `pages/agent/` |
| ✅ | Wallet, referral, website agen | `pages/agent/` |
| ✅ | Withdrawal otomatis wallet agen | `AdminWithdrawalManagement.tsx` |

---

## MODUL 11 — CABANG (BRANCH)

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Dashboard, booking, agen, staff | `pages/branch/` |
| ✅ | Laporan, KPI targets, perbandingan | `pages/branch/` |
| ✅ | branch_monthly_targets table | |
| ✅ | Website cabang + settings | `pages/branch/BranchWebsiteSettings.tsx` |
| ✅ | Persetujuan, diskon per cabang | `pages/branch/` |

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

*Terakhir diperbarui: Juni 2026 — Analisis mendalam modul paket, keberangkatan, perlengkapan, HPP, keuangan, dan HR*  
*SQL kanonikal: `sql/migrations/` (001–061) + `sql/MASTER_FRESH_INSTALL.sql`*  
*Supabase migrations: `supabase/migrations/`*
