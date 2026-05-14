# RENCANA VINSTOUR TRAVEL PORTAL
> **Update terakhir:** Juli 2026 — Analisis lengkap berdasarkan kode aktual  
> **Stack:** React 19 + Vite + TypeScript + Supabase Auth + Supabase PostgreSQL  
> **Total:** 311 halaman, 653 TSX, 70+ hooks, 70+ tabel, 47 SQL migration files  
> ✅ = Ada di kode | ❌ = Belum ada | 🔧 = Sebagian ada

---

## STATUS SQL MIGRATION

> **✅ Fresh SQL tersedia:** `migration_fresh.sql` (11.054 baris)  
> Gabungan SEMUA migration dari fase0 → fase23 → store → 32x timestamp migrations  
> Aman dijalankan ulang: semua pakai `CREATE TABLE IF NOT EXISTS` / `DROP POLICY IF EXISTS`

### Urutan migration yang digabung di `migration_fresh.sql`:

| # | File | Isi |
|---|------|-----|
| 1 | `fase0_foundation.sql` | profiles, user_roles, role_permissions, hotels, vendors, branches, agents |
| 2 | `consolidated_all.sql` | customers, bookings, packages, departures, payments, airlines, dll (fase 1-15) |
| 3 | `consolidated_fase_13_14_15.sql` | agent_leads, CRM pipeline agen |
| 4 | `fase16_new_tables.sql` | muthawifs, manasik_schedules, room_assignments, savings_plans, notifications |
| 5 | `fase17_remaining_tables.sql` | documents, testimonials, menu_items, theme_presets, dll |
| 6 | `fase18_core_settings.sql` | company_settings, bank_accounts, website_settings, contact_page_content |
| 7 | `fase19_branch_kpi_targets.sql` | branch_monthly_targets |
| 8 | `fase20_chat_bubble_color.sql` | Kolom chat_bubble_color di website_settings |
| 9 | `fase20_webhooks_push.sql` | webhook_configs, webhook_logs, push_subscriptions |
| 10 | `fase21_integration_fixes.sql` | customer_notifications, jamaah_checklist, attendance, visa_status_logs, room_occupants, feedback |
| 11 | `fase22_muthawif_evaluations.sql` | muthawif_jamaah_evaluations |
| 12 | `fase23_payments_transaction_id.sql` | transaction_id, payment_type di tabel payments |
| 13 | `store_ecommerce.sql` | store_categories, store_products, store_orders, store_order_items, store_shipments |
| 14 | `store_product_reviews.sql` | store_product_reviews |
| 15 | 32x timestamp migrations | Multi-currency, seat hold, badges, procurement, stock opname, web vitals, dll |

### Cara pakai `migration_fresh.sql`:

```bash
# Opsi 1: psql CLI
psql -h HOST -U postgres -d DBNAME -f migration_fresh.sql

# Opsi 2: Supabase SQL Editor
# Dashboard → SQL Editor → New query → paste isi file → Run

# Opsi 3: supabase CLI
supabase db reset --db-url "postgresql://user:pass@host:5432/dbname"
```

> **Catatan:** File ini membutuhkan Supabase Auth (auth.users, auth.uid()).  
> Jika migrasi ke PostgreSQL biasa, ganti referensi `auth.users` & `auth.uid()` dengan tabel users sendiri.

---

## ARSITEKTUR SISTEM

```
Frontend  : React 19 + Vite 7 + TypeScript + TailwindCSS + shadcn/ui
State     : TanStack Query v5
Routing   : React Router v6
Auth      : Supabase Auth (JWT) → useAuth.tsx
Database  : Supabase PostgreSQL (70+ tabel)
Payments  : Midtrans Snap (QRIS, VA, GoPay)
WhatsApp  : Fonnte API (whatsapp_logs outbox pattern)
Push Notif: VAPID Web Push (push_outbox + push_subscriptions)
PWA       : Service Worker + manifest edge function
AI        : Google Gemini API (summary, chatbot, FAQ)
Struktur  : Monorepo — artifacts/umrah-haji/ (app utama)

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
| ✅ | role_permissions — izin granular per role | `role_permissions` table |
| ✅ | user_permissions — override per user | `user_permissions` table |
| ✅ | useCanAccess.ts — cek izin fitur | `hooks/useCanAccess.ts` |
| ✅ | useEffectivePermissions.ts | `hooks/useEffectivePermissions.ts` |
| ✅ | AdminRoleManagement.tsx | `pages/admin/AdminRoleManagement.tsx` |
| ✅ | AdminRBACStatus.tsx + AdminRBACTools.tsx | `pages/admin/` |
| ✅ | AdminAccessSimulator.tsx — simulasi akses | `pages/admin/AdminAccessSimulator.tsx` |
| ✅ | DashboardAccessManager.tsx | `pages/admin/DashboardAccessManager.tsx` |
| ✅ | PermissionAuditLog.tsx | `components/admin/PermissionAuditLog.tsx` |
| ✅ | 2FA (two-factor auth) | `supabase/functions/request-2fa-otp/`, `verify-2fa-otp/` |
| ✅ | Admin2FASettings.tsx | `pages/admin/Admin2FASettings.tsx` |
| ✅ | AdminSecurityAudit.tsx | `pages/admin/AdminSecurityAudit.tsx` |
| ✅ | Guest checkout | `services/guestCheckoutService.ts` |
| ✅ | SuperAdminGuard.tsx | `components/admin/SuperAdminGuard.tsx` |

---

## MODUL 2 — MANAJEMEN PAKET

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Daftar & kelola paket | `pages/admin/AdminPackages.tsx` |
| ✅ | Detail paket admin | `pages/admin/AdminPackageDetail.tsx` |
| ✅ | Tipe paket dinamis | `pages/admin/AdminPackageTypes.tsx` |
| ✅ | Form buat/edit paket | `components/admin/forms/RegularPackageForm` |
| ✅ | Form keberangkatan | `components/admin/departure/DepartureForm` |
| ✅ | usePackages.ts, usePackageTypes.ts | `hooks/` |
| ✅ | usePackageStats.ts, usePackageAnalytics.ts | `hooks/` |
| ✅ | Label/tag paket kustom | `hooks/usePackageLabels.ts`, `package_labels` table |
| ✅ | PackagePriceAuditCard, PackagePriceTrendCard | `components/admin/` |
| ✅ | Multi-currency (kolom `currency` di packages) | migration 20260513130746 |
| ✅ | AdminExchangeRates.tsx — manajemen kurs | `pages/admin/AdminExchangeRates.tsx` |
| ✅ | exchange_rates table | migration 20260513130746 |
| ✅ | AdminItineraryTemplates.tsx | `pages/admin/AdminItineraryTemplates.tsx` |
| ✅ | AdminCancellationPolicies.tsx | `pages/admin/AdminCancellationPolicies.tsx` |
| ✅ | usePackageChangeRules.ts | `hooks/usePackageChangeRules.ts` |
| ✅ | ChangePackageDialog.tsx, ChangePackageDialogV2.tsx | `components/admin/` |
| ✅ | AdminRekomendasiPaket.tsx — rekomendasi AI | `pages/admin/AdminRekomendasiPaket.tsx` |
| ✅ | AdminPrediksiSeat.tsx — prediksi kursi | `pages/admin/AdminPrediksiSeat.tsx` |
| ✅ | useRecentlyViewedPackages.ts | `hooks/` |
| ✅ | booking_mode di packages (standard/haji/wisata) | migration 20260513130746 |

---

## MODUL 3 — KEBERANGKATAN (DEPARTURES)

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Daftar & kelola keberangkatan | `pages/admin/AdminDepartures.tsx` |
| ✅ | Detail keberangkatan | `pages/admin/AdminDepartureDetail.tsx` |
| ✅ | Tracking keberangkatan | `pages/admin/AdminDepartureTracking.tsx` |
| ✅ | Laporan keberangkatan | `pages/admin/AdminLaporanKeberangkatan.tsx` |
| ✅ | useDepartures.ts, useDepartureBudget.ts | `hooks/` |
| ✅ | Seat hold system (15 menit) | `seat_holds` table, `hooks/useSeatHold.ts` |
| ✅ | Manifest jamaah | `pages/operational/ManifestPage.tsx` |
| ✅ | AdminManifestJamaah.tsx — manifest admin | `pages/admin/AdminManifestJamaah.tsx` |
| ✅ | Rooming list & room assignment | `RoomingListPageImproved.tsx`, `AdminRoomAssignments.tsx` |
| ✅ | room_occupants table (fase21) | `supabase/migrations/fase21_integration_fixes.sql` |
| ✅ | Timeline perjalanan | `pages/operational/TripTimelinePage.tsx` |
| ✅ | Kesiapan keberangkatan | `pages/operational/DepartureReadinessPage.tsx` |
| ✅ | Check-in jamaah | `pages/operational/CheckinPage.tsx` |
| ✅ | Absensi digital | `pages/admin/AdminAbsensiDigital.tsx` |
| ✅ | Absensi harian tanah suci | `pages/admin/AdminAbsensiHarianTanahSuci.tsx` |
| ✅ | attendance table (fase21) | `supabase/migrations/fase21_integration_fixes.sql` |
| ✅ | Manajemen muthawif | `pages/admin/AdminMuthawifs.tsx`, `AdminMuthawifDetail.tsx` |
| ✅ | Penilaian jamaah oleh muthawif | `muthawif_jamaah_evaluations` table (fase22) |
| ✅ | Alert SOS | `pages/admin/AdminSOSAlerts.tsx` |
| ✅ | AdminHajiManagement.tsx — manajemen haji | `pages/admin/AdminHajiManagement.tsx` |
| ✅ | AdminSISKOHAT.tsx (UI placeholder) | `pages/admin/AdminSISKOHAT.tsx` |
| ❌ | Integrasi SISKOHAT Kemenag aktual (API) | Belum ada server-side integration |
| ✅ | Kebijakan bagasi | `pages/admin/AdminBaggagePolicies.tsx`, `baggage_policies` table |
| ✅ | Manajemen bagasi operasional | `pages/operational/LuggagePage.tsx` |
| ✅ | Survey pasca keberangkatan | `pages/admin/AdminPostDepartureSurvey.tsx` |
| ✅ | delete_departure_safely() — fungsi hapus aman | migration 20260513224928 |
| ✅ | price_adult/child/infant di departures | migration 20260513131651 |

---

## MODUL 4 — BOOKING

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Booking Wizard multi-step | `pages/booking/BookingPage.tsx` |
| ✅ | useBookingWizardDynamic.ts | `hooks/useBookingWizardDynamic.ts` |
| ✅ | Step 1: Alokasi kamar | `StepRoomAllocation` |
| ✅ | Step 2: Data penumpang | `StepPassengersDynamic` |
| ✅ | Step 3: Sumber booking (pusat/cabang/agen) | `PICSelectionStep` |
| ✅ | Step 4: Review & submit | `StepReviewDynamic` |
| ✅ | BookingSuccess.tsx, BookingRecover.tsx | `pages/booking/` |
| ✅ | AdminBookings.tsx — daftar booking | `pages/admin/AdminBookings.tsx` |
| ✅ | AdminBookingDetail.tsx | `pages/admin/AdminBookingDetail.tsx` |
| ✅ | AdminBookingCreate.tsx — buat booking manual | `pages/admin/AdminBookingCreate.tsx` |
| ✅ | AdminBookingTransfers.tsx | `pages/admin/AdminBookingTransfers.tsx` |
| ✅ | Multi-currency booking (exchange_rate, total_price_idr) | migration 20260513130746 |
| ✅ | Booking mode: full / dp / savings | migration 20260513132826 |
| ✅ | Kode kupon di booking | `hooks/useCoupons.ts` |
| ✅ | Referral code tracking | `referral_codes`, `referral_usages` tables |
| ✅ | Approval workflow booking | `pages/admin/AdminApprovals.tsx` |
| ✅ | ChangeRoomTypeDialog.tsx — ubah kamar | `components/admin/ChangeRoomTypeDialog.tsx` |
| ✅ | useBookings.ts | `hooks/useBookings.ts` |

---

## MODUL 5 — PEMBAYARAN

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Pembayaran jamaah (Midtrans Snap) | `pages/jamaah/JamaahPayment.tsx` |
| ✅ | Upload bukti transfer manual | `pages/customer/PaymentUpload.tsx` |
| ✅ | Daftar pembayaran admin | `pages/admin/AdminPayments.tsx` |
| ✅ | Konfigurasi Midtrans | `pages/admin/AdminMidtrans.tsx` |
| ✅ | Virtual account management | `pages/admin/AdminVirtualAccount.tsx` |
| ✅ | Generator cicilan | `pages/admin/AdminCicilanGenerator.tsx` |
| ✅ | Reminder cicilan | `pages/admin/AdminCicilanReminder.tsx` |
| ✅ | Reminder pembayaran | `pages/admin/AdminPembayaranReminder.tsx` |
| ✅ | Keuangan terpadu (AR/AP/Cash/P&L) | `AdminFinanceTerpadu.tsx`, `AdminFinanceAP/AR/Cash/PL.tsx` |
| ✅ | Laporan keuangan | `pages/admin/AdminLaporanKeuangan.tsx` |
| ✅ | Refund management | `pages/admin/AdminRefunds.tsx`, `AdminRefundDetail.tsx` |
| ✅ | Midtrans webhook handler | `supabase/functions/midtrans-webhook/` |
| ✅ | transaction_id & payment_type di payments | `supabase/migrations/fase23_payments_transaction_id.sql` |
| ✅ | Kalkulator cicilan | `pages/customer/KalkulatorCicilan.tsx` |
| ✅ | ManagePaymentModal, AddManualPaymentDialog | `components/admin/` |

---

## MODUL 6 — TABUNGAN (SAVINGS)

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Dashboard tabungan jamaah | `pages/savings/SavingsDashboard.tsx` |
| ✅ | Paket tabungan | `pages/savings/SavingsPackages.tsx` |
| ✅ | Daftar tabungan reguler | `pages/savings/SavingsRegister.tsx` |
| ✅ | Tabungan fleksibel | `pages/savings/SavingsFlexibleRegister.tsx` |
| ✅ | Tabungan saya (portal customer) | `pages/customer/MySavings.tsx` |
| ✅ | Admin tabungan & monitoring | `pages/admin/AdminSavings.tsx`, `AdminSavingsPlans.tsx`, `AdminMonitoringTabungan.tsx` |
| ✅ | savings_schedules table — jadwal cicilan otomatis | migration 20260513111158 |
| ✅ | locked_price — harga terkunci saat daftar | migration 20260513111158 |
| ✅ | check-savings-reminders edge function | `supabase/functions/check-savings-reminders/` |
| ✅ | useSavingsPageContent.ts | `hooks/useSavingsPageContent.ts` |
| ✅ | savings_plan_id di bookings | migration 20260513132826 |

---

## MODUL 7 — JAMAAH PORTAL

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Portal utama jamaah | `pages/jamaah/JamaahPortal.tsx` |
| ✅ | ID Digital jamaah | `pages/jamaah/JamaahDigitalID.tsx` |
| ✅ | Dokumen jamaah | `pages/jamaah/JamaahDocuments.tsx` |
| ✅ | Pembayaran & riwayat pembayaran | `JamaahPayment.tsx`, `JamaahPaymentHistory.tsx` |
| ✅ | Invoice digital | `pages/jamaah/JamaahInvoice.tsx` |
| ✅ | Itinerary perjalanan | `pages/jamaah/JamaahItinerary.tsx` |
| ✅ | Kontrak jamaah | `pages/jamaah/JamaahKontrak.tsx` |
| ✅ | Checklist persiapan | `pages/jamaah/JamaahChecklist.tsx` |
| ✅ | jamaah_checklist table (fase21) | persisten ke DB |
| ✅ | Notifikasi jamaah | `pages/jamaah/JamaahNotifications.tsx` |
| ✅ | customer_notifications table (fase21) | |
| ✅ | Tracking visa | `pages/jamaah/JamaahVisaTracker.tsx` |
| ✅ | visa_status_logs table (fase21) | |
| ✅ | Info SISKOHAT jamaah | `pages/jamaah/JamaahSISKOHAT.tsx` |
| ✅ | Badge loyalitas | `pages/jamaah/JamaahBadges.tsx` |
| ✅ | Referral jamaah | `pages/jamaah/JamaahReferral.tsx` |
| ✅ | Sertifikat ibadah | `pages/jamaah/JamaahSertifikat.tsx` |
| ✅ | Feedback & ulasan | `pages/jamaah/JamaahFeedback.tsx` |
| ✅ | Info rombongan | `pages/jamaah/JamaahRombongan.tsx` |
| ✅ | Kesehatan jamaah | `pages/jamaah/JamaahKesehatan.tsx` |
| ✅ | Arah kiblat | `pages/jamaah/JamaahKiblat.tsx` |
| ✅ | Waktu sholat | `pages/jamaah/JamaahWaktuSholat.tsx` |
| ✅ | Al-Quran digital | `pages/jamaah/JamaahAlQuran.tsx` |
| ✅ | Jurnal ibadah | `pages/jamaah/JamaahJurnal.tsx` |
| ✅ | Progress wall ibadah | `pages/jamaah/JamaahProgressWall.tsx` |
| ✅ | ibadah_progress table | migration 20260511014225 |
| ✅ | Galeri foto | `pages/jamaah/JamaahGaleri.tsx` |
| ✅ | Ringkasan AI | `pages/jamaah/JamaahRingkasanAI.tsx` |
| ✅ | Kalkulator kurs | `pages/jamaah/JamaahKalkulatorKurs.tsx` |
| ✅ | Kalkulator zakat | `pages/jamaah/JamaahKalkulatorZakat.tsx` |
| ✅ | Pantau keluarga (live share) | `pages/jamaah/JamaahPantauKeluarga.tsx` |
| ✅ | Status SOS | `pages/jamaah/JamaahSOSStatus.tsx` |
| ✅ | Riwayat perjalanan | `pages/jamaah/JamaahRiwayatPerjalanan.tsx` |
| ✅ | Wishlist paket | `pages/jamaah/JamaahWishlist.tsx` |
| ✅ | Chatbot AI | `pages/jamaah/JamaahChatbot.tsx` |
| ✅ | Chat support | `pages/jamaah/JamaahChat.tsx` |
| ✅ | Bagasi jamaah | `pages/jamaah/JamaahBagasi.tsx` |
| ✅ | Check-in mandiri | `pages/jamaah/JamaahCheckin.tsx` |
| ✅ | Peta lokasi | `pages/jamaah/JamaahPetaLokasi.tsx` |
| ✅ | Progress manasik | `components/jamaah/ManasikProgressCard.tsx` |
| ✅ | Kuis manasik | `components/jamaah/JamaahManasikKuis.tsx` |

---

## MODUL 8 — AGEN

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Dashboard agen | `pages/agent/AgentDashboard.tsx` |
| ✅ | Paket agen | `pages/agent/AgentPackages.tsx` |
| ✅ | Jamaah agen | `pages/agent/AgentJamaahEnhanced.tsx` |
| ✅ | Komisi agen | `pages/agent/AgentCommissions.tsx` |
| ✅ | Komisi cabang | `pages/admin/AdminBranchCommissions.tsx` |
| ✅ | Kalkulator komisi | `pages/admin/AdminCommissionCalculator.tsx` |
| ✅ | Laporan agen | `pages/agent/AgentLaporan.tsx`, `pages/admin/AdminLaporanAgen.tsx` |
| ✅ | Leads CRM agen | `pages/agent/AgentLeads.tsx` |
| ✅ | Lead management admin | `AdminLeads.tsx`, `AdminLeadDetail.tsx`, `AdminLeadAnalytics.tsx` |
| ✅ | Jaringan agen (sub-agen) | `pages/agent/AgentNetwork.tsx` |
| ✅ | Royalti sub-agen (attribute_commission_to_parent) | migration 20260511000842 |
| ✅ | Membership agen | `pages/agent/AgentMembership.tsx` |
| ✅ | Target agen | `pages/agent/AgentTargets.tsx` |
| ✅ | Leaderboard agen | `pages/agent/AgentLeaderboard.tsx` |
| ✅ | Training agen | `pages/agent/AgentTraining.tsx` |
| ✅ | training_modules, training_quizzes tables | migration 20260513115449 |
| ✅ | Kit digital agen | `pages/agent/AgentDigitalKit.tsx` |
| ✅ | Broadcast WA agen | `pages/agent/AgentBroadcast.tsx` |
| ✅ | Link unik agen | `pages/agent/AgentUniqueLink.tsx` |
| ✅ | Wallet agen | `pages/agent/AgentWallet.tsx` |
| ✅ | Referral agen | `pages/agent/AgentMyReferrals.tsx` |
| ✅ | Website agen (publik + settings) | `AgentWebsite.tsx`, `AgentWebsiteSettings.tsx` |
| ✅ | AdminAgents.tsx — kelola agen | `pages/admin/AdminAgents.tsx` |
| ❌ | Withdrawal otomatis wallet agen | Belum ada |

---

## MODUL 9 — CABANG (BRANCH)

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Dashboard cabang | `pages/branch/BranchDashboard.tsx` |
| ✅ | Booking cabang | `pages/branch/BranchBookings.tsx` |
| ✅ | Agen cabang | `pages/branch/BranchAgen.tsx` |
| ✅ | Staff cabang | `pages/branch/BranchStaff.tsx` |
| ✅ | Laporan cabang | `pages/branch/BranchLaporan.tsx` |
| ✅ | Target KPI cabang | `pages/branch/BranchKPITargets.tsx` |
| ✅ | branch_monthly_targets table (fase19) | |
| ✅ | Perbandingan antar cabang | `pages/admin/AdminBranchComparison.tsx` |
| ✅ | Kelola cabang | `pages/admin/AdminBranches.tsx` |
| ✅ | Website cabang (publik + settings) | `BranchWebsite.tsx`, `BranchWebsiteSettings.tsx` |
| ✅ | Persetujuan cabang | `pages/branch/BranchApprovals.tsx` |
| ✅ | Diskon per cabang | `pages/branch/BranchDiskon.tsx` |

---

## MODUL 10 — WEBSITE PUBLIK & LANDING PAGE

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Landing page utama | `pages/public/LandingPage.tsx` |
| ✅ | Editor landing page | `AdminLandingPages.tsx`, `AdminLandingPageEditor.tsx` |
| ✅ | Tema & tampilan (7 tema) | `pages/admin/AdminAppearance.tsx` |
| ✅ | website_settings table (fase18) | company_name, logo, colors, footer |
| ✅ | theme_presets table (7 preset tema) | migration 20260511053018 |
| ✅ | chat_bubble_color kolom (fase20) | |
| ✅ | layout_variant, theme_overrides | migration 20260511053018 |
| ✅ | Website publik agen | `pages/public/AgentWebsite.tsx` |
| ✅ | Website publik cabang | `pages/public/BranchWebsite.tsx` |
| ✅ | Halaman tentang | `pages/public/AboutPage.tsx` |
| ✅ | Halaman kontak | `pages/public/ContactPage.tsx` |
| ✅ | contact_page_content table (fase18) | |
| ✅ | Halaman statis | `pages/public/StaticPage.tsx` |
| ✅ | Blog publik | `pages/public/PublicBlog.tsx`, `PublicBlogDetail.tsx` |
| ✅ | Kelola blog | `pages/admin/AdminBlog.tsx` |
| ✅ | Testimonial publik | `pages/public/Testimonials.tsx` |
| ✅ | Banner/spanduk | `pages/admin/AdminBanners.tsx` |
| ✅ | FAQ | `pages/admin/AdminFAQManager.tsx`, `pages/public/PublicFAQPage.tsx` |
| ✅ | Halaman tim | `pages/public/TeamPage.tsx` |
| ✅ | Materi marketing | `pages/admin/AdminMarketingMaterials.tsx` |
| ✅ | Galeri media | `pages/admin/AdminMediaGallery.tsx` |
| ✅ | Generator proposal | `pages/admin/AdminProposalGenerator.tsx` |
| ✅ | Halaman keberangkatan publik | `pages/public/DeparturesPage.tsx` |
| ✅ | Pencarian paket | `components/packages/PackageSearch.tsx` |

---

## MODUL 11 — NOTIFIKASI & KOMUNIKASI

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Konfigurasi WhatsApp (Fonnte) | `pages/admin/AdminWhatsApp.tsx` |
| ✅ | WA otomatis | `pages/admin/AdminWAOtomatis.tsx` |
| ✅ | WA blast keberangkatan | `pages/admin/AdminWABlastKeberangkatan.tsx` |
| ✅ | WA blast tagihan | `pages/admin/AdminWABlastTagihan.tsx` |
| ✅ | useWhatsAppNotifier.ts (outbox pattern) | `hooks/useWhatsAppNotifier.ts` |
| ✅ | whatsapp_logs table — antrian WA | DB tabel |
| ✅ | Push notification browser | `pages/admin/AdminPushNotifications.tsx` |
| ✅ | Push outbox (antrian broadcast) | `pages/admin/AdminPushOutbox.tsx` |
| ✅ | push_subscriptions table (fase20) | |
| ✅ | push_outbox table | migration 20260511031434 |
| ✅ | process-push-queue edge function | `supabase/functions/process-push-queue/` |
| ✅ | send-push edge function | `supabase/functions/send-push/` |
| ✅ | push-subscribe edge function | `supabase/functions/push-subscribe/` |
| ✅ | usePushSubscription.ts | `hooks/usePushSubscription.ts` |
| ✅ | Notifikasi cerdas | `pages/admin/AdminSmartNotif.tsx` |
| ✅ | Pengumuman admin | `pages/admin/AdminAnnouncements.tsx` |
| ✅ | Template email | `pages/admin/AdminEmailTemplates.tsx` |
| ✅ | useEmailNotifier.ts | `hooks/useEmailNotifier.ts` |
| ✅ | Chatbot stats | `pages/admin/AdminChatbotStats.tsx` |
| ✅ | Chat leads & logs | `AdminChatLeads.tsx`, `AdminChatLogs.tsx` |
| ✅ | NotificationBell.tsx | `components/admin/NotificationBell.tsx` |
| ✅ | useAdminNotifications.ts | `hooks/useAdminNotifications.ts` |
| ✅ | check-document-deadlines edge function | `supabase/functions/check-document-deadlines/` |
| ✅ | send-booking-recovery edge function | `supabase/functions/send-booking-recovery/` |

---

## MODUL 12 — LOYALITAS & GAMIFIKASI

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Program loyalitas admin | `pages/admin/AdminLoyalty.tsx` |
| ✅ | Manfaat tier | `pages/admin/AdminTierBenefits.tsx` |
| ✅ | Loyalitas jamaah | `pages/customer/MyLoyalty.tsx` |
| ✅ | useLoyalty.ts, useLoyaltyTier.ts | `hooks/` |
| ✅ | jamaah_badges table + 5 trigger otomatis | migration 20260513114043 |
| ✅ | JamaahBadges.tsx | `pages/jamaah/JamaahBadges.tsx` |
| ✅ | Referral admin | `pages/admin/AdminReferrals.tsx` |
| ✅ | referral_codes, referral_usages tables | DB |
| ✅ | Kupon diskon | `pages/admin/AdminCoupons.tsx` |
| ✅ | useCoupons.ts | `hooks/useCoupons.ts` |

---

## MODUL 13 — TOKO ONLINE (E-COMMERCE)

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Dashboard toko | `pages/admin/AdminStore.tsx` |
| ✅ | Produk toko | `pages/admin/AdminStoreProducts.tsx` |
| ✅ | Kategori produk | `pages/admin/AdminStoreCategories.tsx` |
| ✅ | Pesanan toko | `pages/admin/AdminStoreOrders.tsx` |
| ✅ | Laporan penjualan | `pages/admin/AdminStoreSalesReport.tsx` |
| ✅ | Stok menipis | `pages/admin/AdminStoreLowStock.tsx` |
| ✅ | Stock opname + sesi + detail | `AdminStoreStockOpname.tsx`, `AdminStoreOpnameSessions.tsx`, `AdminStoreOpnameSessionDetail.tsx` |
| ✅ | Pergerakan stok | `pages/admin/AdminStoreStockMovements.tsx` |
| ✅ | Purchase order | `pages/admin/AdminPurchaseOrders.tsx` |
| ✅ | Supplier | `pages/admin/AdminSuppliers.tsx` |
| ✅ | Toko publik customer | `pages/customer/StorePage.tsx` |
| ✅ | Checkout | `pages/customer/StoreCheckout.tsx` |
| ✅ | Detail pesanan | `pages/customer/StoreOrderDetail.tsx` |
| ✅ | Pesanan saya | `pages/customer/MyStoreOrders.tsx` |
| ✅ | Toko online halaman publik | `pages/public/TokoOnline.tsx` |
| ✅ | store_categories, store_products, store_orders tables | `store_ecommerce.sql` |
| ✅ | store_order_items, store_shipments tables | `store_ecommerce.sql` |
| ✅ | store_product_reviews table | `store_product_reviews.sql` |
| ✅ | store_suppliers, store_purchase_orders tables | migration 20260513143441 |
| ✅ | store_opname_sessions, opname_status enum | migration 20260513152135 |
| ✅ | receive_purchase_order() function | migration 20260513143441 |

---

## MODUL 14 — HR & OPERASIONAL INTERNAL

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Manajemen HR | `pages/admin/AdminHR.tsx` |
| ✅ | Penggajian | `pages/admin/AdminPayroll.tsx` |
| ✅ | Absensi karyawan | `pages/hr/EmployeeAttendance.tsx` |
| ✅ | useHRSettings.ts | `hooks/useHRSettings.ts` |
| ✅ | Dashboard operasional | `pages/operational/OperationalDashboard.tsx` |
| ✅ | Verifikasi dokumen | `pages/admin/AdminDocumentVerification.tsx` |
| ✅ | Tracker kadaluarsa dokumen | `pages/admin/AdminDocumentExpiryTracker.tsx` |
| ✅ | Dokumen belum lengkap | `pages/admin/AdminIncompleteDocuments.tsx` |
| ✅ | Generator dokumen | `pages/admin/AdminDocumentGenerator.tsx` |
| ✅ | Manajemen visa | `pages/admin/AdminVisaManagement.tsx` |
| ✅ | QR Code check-in | `pages/operational/QRCodePage.tsx` |
| ✅ | Perlengkapan jamaah (equipment) | `pages/operational/EquipmentPage.tsx` |
| ✅ | AdminEquipmentMaster.tsx, AdminEquipmentSettings.tsx | `pages/admin/` |
| ✅ | equipment feature module | `src/features/equipment/` |
| ✅ | Manajemen bus | `pages/operational/BusManagementPage.tsx` |
| ✅ | AdminBusProviders.tsx | `pages/admin/AdminBusProviders.tsx` |
| ✅ | Vendor & kontrak | `AdminVendors.tsx`, `AdminVendorContracts.tsx` |
| ✅ | Master data (hotel, airline, airport) | `AdminHotels.tsx`, `AdminAirlines.tsx`, `AdminAirports.tsx` |
| ✅ | AdminManasik.tsx | `pages/admin/AdminManasik.tsx` |
| ✅ | manasik_schedules table | DB |
| ✅ | Pengadaan / procurement | `hooks/useProcurement.ts` |

---

## MODUL 15 — ANALITIK & LAPORAN

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Dashboard utama admin | `pages/admin/AdminDashboard.tsx` |
| ✅ | KPI Dashboard | `pages/admin/AdminKPIDashboard.tsx` |
| ✅ | Analitik lanjutan | `pages/admin/AdminAnalytics.tsx` |
| ✅ | Laporan lanjutan | `pages/admin/AdminAdvancedReports.tsx` |
| ✅ | Laporan terjadwal | `pages/admin/AdminScheduledReports.tsx` |
| ✅ | Analisis sentimen feedback | `pages/admin/AdminSentimenFeedback.tsx` |
| ✅ | Analitik leads | `pages/admin/AdminLeadAnalytics.tsx` |
| ✅ | Dashboard per role (Branch, Finance, Marketing, Sales, Equipment) | `pages/admin/dashboards/` |
| ✅ | Ringkasan AI (Gemini) | `pages/admin/AdminAISummary.tsx`, `AdminGeminiAI.tsx` |
| ✅ | Web Vitals monitoring | `pages/admin/AdminWebVitals.tsx` |
| ✅ | web_vitals_metrics table | migration 20260514030830 |
| ✅ | PWA install stats | `pages/admin/AdminPWAInstallStats.tsx` |
| ✅ | pwa_install_events table | migration 20260513123505 |
| ✅ | Follow-up reminder | `pages/admin/AdminFollowUpReminder.tsx` |
| ✅ | useDashboardStats.ts, useDashboardAlerts.ts | `hooks/` |
| ✅ | usePackageAnalytics.ts | `hooks/usePackageAnalytics.ts` |

---

## MODUL 16 — PENGATURAN SISTEM

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Pengaturan umum perusahaan | `pages/admin/AdminSettings.tsx` |
| ✅ | company_settings table (fase18) | key-value store |
| ✅ | bank_accounts table (fase18) | |
| ✅ | Manajemen user | `pages/admin/AdminUsers.tsx` |
| ✅ | Koneksi API eksternal | `pages/admin/AdminApiConnect.tsx` |
| ✅ | Webhook konfigurasi | `pages/admin/AdminWebhooks.tsx` |
| ✅ | webhook_configs, webhook_logs tables (fase20) | |
| ✅ | Pengaturan PWA | `pages/admin/AdminPWASettings.tsx` |
| ✅ | Konten offline | `pages/admin/AdminOfflineContent.tsx` |
| ✅ | Log aktivitas | `pages/admin/AdminActivityLog.tsx` |
| ✅ | audit_logs table | DB |
| ✅ | Menu sync manager | `components/admin/MenuSyncManager.tsx` |
| ✅ | menu_items table | DB |
| ✅ | useDynamicMenus.ts | `hooks/useDynamicMenus.ts` |
| ✅ | SidebarManager.tsx | `components/admin/SidebarManager.tsx` |
| ✅ | usePWAConfig.ts, usePWAMode.ts | `hooks/` |
| ✅ | manifest edge function (PWA manifest dinamis) | `supabase/functions/manifest/` |

---

## MODUL 17 — FITUR PUBLIK ISLAMI

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Arah kiblat | `pages/public/ArahKiblat.tsx` |
| ✅ | Jadwal sholat | `pages/public/JadwalSholat.tsx` |
| ✅ | Al-Quran digital | `pages/public/AlQuran.tsx` |
| ✅ | Kalkulator biaya umroh | `pages/public/KalkulatorBiaya.tsx` |
| ✅ | Kalkulator islami | `pages/public/KalkulatorIslami.tsx` |
| ✅ | Tasbih digital | `pages/public/TasbihDigital.tsx` |
| ✅ | Tracker ibadah publik | `pages/public/TrackerIbadah.tsx` |
| ✅ | Panduan manasik umroh | `pages/public/PanduanManasikUmroh.tsx` |
| ✅ | Cuaca Mekkah | `pages/public/CuacaMekkah.tsx` |
| ✅ | Halaman kurs | `pages/public/KursPage.tsx` |
| ✅ | Pantau jamaah (keluarga) | `pages/public/PantauJamaahPage.tsx` |
| ✅ | Status booking publik | `pages/public/BookingStatusPage.tsx` |

---

## MODUL 18 — MUTHAWIF PORTAL

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Dashboard muthawif | `pages/muthawif/MuthawifDashboard.tsx` |
| ✅ | Profil jamaah | `pages/muthawif/MuthawifJamaahProfil.tsx` |
| ✅ | Laporan harian | `pages/muthawif/MuthawifLaporanHarian.tsx` |
| ✅ | SOS alert | `pages/muthawif/MuthawifSOS.tsx` |
| ✅ | Penilaian jamaah oleh muthawif | `pages/muthawif/MuthawifPenilaianJamaah.tsx` |
| ✅ | muthawif_jamaah_evaluations table (fase22) | rating + kategori per jamaah |
| ✅ | useMuthawifNotifications.ts | `hooks/useMuthawifNotifications.ts` |

---

## MODUL 19 — SUPPORT & TIKET

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Tiket support admin | `pages/admin/AdminSupportTickets.tsx` |
| ✅ | Support customer | `pages/customer/CustomerSupport.tsx` |
| ✅ | support_tickets, ticket_responses tables | DB |
| ✅ | Status refund customer | `pages/customer/CustomerRefundStatus.tsx` |
| ✅ | Refund admin | `AdminRefunds.tsx`, `AdminRefundDetail.tsx` |

---

## EDGE FUNCTIONS (SUPABASE)

| Status | Nama | Fungsi |
|--------|------|--------|
| ✅ | `check-document-deadlines` | Cek & kirim reminder deadline dokumen jamaah |
| ✅ | `check-savings-reminders` | Reminder cicilan tabungan yang jatuh tempo |
| ✅ | `manifest` | PWA manifest.json dinamis per tenant |
| ✅ | `midtrans-webhook` | Handler webhook pembayaran Midtrans |
| ✅ | `process-push-queue` | Proses antrian push notification (cron) |
| ✅ | `push-subscribe` | Daftar/hapus push subscription browser |
| ✅ | `request-2fa-otp` | Kirim OTP untuk 2FA |
| ✅ | `send-booking-recovery` | Kirim email recovery booking terbengkalai |
| ✅ | `send-push` | Kirim push notification VAPID |
| ✅ | `verify-2fa-otp` | Verifikasi OTP 2FA |

---

## FITUR YANG BELUM ADA (❌)

| Fitur | Keterangan | Prioritas |
|-------|------------|-----------|
| ❌ | Integrasi SISKOHAT Kemenag aktual | API server-side belum ada | 🔴 |
| ❌ | AI Chatbot terintegrasi real-time | Hanya placeholder UI | 🟠 |
| ❌ | Withdrawal otomatis wallet agen | Belum ada flow withdrawal | 🟡 |
| ❌ | SSR/ISR untuk website agen/cabang | Saat ini SPA murni | 🟡 |
| ❌ | Fitur bandingkan paket side-by-side | UI comparison belum ada | 🟡 |
| ❌ | Export kalender ke ICS/Google Calendar | Endpoint .ics belum ada | 🟢 |
| ❌ | Fetch kurs otomatis dari API BI | Input kurs masih manual | 🟢 |
| ❌ | Email transaksional nyata (SMTP) | Hanya log, belum kirim email | 🟠 |

---

## RINGKASAN

```
Total halaman (pages):           311 file
Total komponen (TSX):            653 file  
Total hooks:                      70+ hooks
Total migration files:            47 file SQL
migration_fresh.sql:           11.054 baris (satu file siap pakai)
Total tabel database:             70+ tabel
Total role RBAC:                  15 role
Edge functions (Supabase):        10 function

Fitur tersedia di kode:    ~97% (✅)
Fitur belum ada:            ~3% (❌)
```

---

*Diperbarui Juli 2026 berdasarkan analisis kode aktual di `artifacts/umrah-haji/src/`*  
*File SQL lengkap: `migration_fresh.sql` (root directory)*
