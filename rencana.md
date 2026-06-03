# RENCANA VINSTOUR TRAVEL PORTAL
> **Update terakhir:** Juni 2026 — Konsolidasi lengkap dari semua file rencana  
> **Stack:** React 19 + Vite + TypeScript + Supabase Auth + Supabase PostgreSQL + Express API (port 8080)  
> **Total:** 311 halaman, 653 TSX, 70+ hooks, 70+ tabel, 61 file SQL migration  
> ✅ = Selesai | ❌ = Belum ada | 🔧 = Sebagian/Perlu perbaikan

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
| ❌ | Revoke all sessions (force logout) | Belum ada server-side session revocation |

---

## MODUL 2 — MANAJEMEN PAKET ⚠️ AUDIT GAPS

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
| MilestoneTrackerCard — validasi dokumen NYATA | `MilestoneTrackerCard.tsx` ✅ **diperbaiki sesi ini** |

### ❌ Fitur Paket yang Belum Ada / Perlu Dikerjakan

| # | Fitur | Prioritas | Detail |
|---|-------|-----------|--------|
| P1 | **Template HPP paket** (copy cost items ke departure baru) | 🔴 | Setiap departure isi ulang cost items dari nol |
| P2 | **Perbandingan paket side-by-side** | 🟠 | `PackageCompare.tsx` ada tapi terbatas |
| ~~P3~~ | ~~History perubahan harga paket~~ | ~~🟠~~ | ✅ `PackagePriceTrendCard` + `PackagePriceAuditCard` sudah ada |
| ~~P4~~ | ~~Batas diskon maksimum per paket~~ | ~~🟡~~ | ✅ `max_discount` di CouponForm + StepReviewDynamic sudah ada |
| ~~P5~~ | ~~Auto-generate slug unik~~ | ~~🟡~~ | ✅ `lib/slug.ts` sudah dipakai di seluruh codebase |

---

## MODUL 3 — KEBERANGKATAN (DEPARTURES) ⚠️ AUDIT GAPS

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

### ❌ Fitur Keberangkatan yang Belum Ada / Perlu Dikerjakan

| # | Fitur | Prioritas | Detail |
|---|-------|-----------|--------|
| D1 | **Integrasi SISKOHAT Kemenag aktual (API)** | 🔴 | UI ada tapi tanpa koneksi API nyata ke server Kemenag |
| ~~D2~~ | ~~Rekap P&L otomatis saat departure selesai~~ | ~~🔴~~ | ✅ `recalculate_departure_financial_summary()` sudah ter-trigger otomatis |
| D3 | **Export manifest ke Excel/PDF yang bisa langsung dikirim** | 🟠 | Ada export tapi format terbatas |
| D4 | **Notifikasi otomatis ke jamaah H-7 keberangkatan** | 🟠 | Jadwal notif ada tapi tidak terhubung ke departure date |
| ~~D5~~ | ~~Lock/freeze data setelah departure departed~~ | ~~🟡~~ | ✅ Banner amber di AdminDepartureDetail saat status = departed |
| D6 | **Tracking posisi rombongan real-time (peta)** | 🟡 | Hanya SOS alert, tidak ada live tracking |
| ~~D7~~ | ~~WA blast ke semua jamaah departure dari satu tombol~~ | ~~🟡~~ | ✅ `AdminWABlastKeberangkatan.tsx` sudah ada |

---

## MODUL 4 — PERLENGKAPAN (EQUIPMENT) ⚠️ AUDIT GAPS

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
| `equipment_distributions` table | DB |

### ❌ Fitur Perlengkapan yang Belum Ada / Perlu Dikerjakan

| # | Fitur | Prioritas | Detail |
|---|-------|-----------|--------|
| ~~E1~~ | ~~Retur/pengembalian perlengkapan~~ | ~~🔴~~ | ✅ `EquipmentReturnDialog.tsx` — kondisi, alasan, catatan; RPC `return_equipment_item` |
| ~~E2~~ | ~~Ukuran/size per jamaah~~ | ~~🔴~~ | ✅ Kolom `size` di distributions; `has_sizes`+`available_sizes` di items; size selector |
| ~~E3~~ | ~~Konfirmasi penerimaan oleh jamaah~~ | ~~🟠~~ | ✅ `EquipmentConfirmationTab` sudah ada |
| ~~E4~~ | ~~Laporan stok per departure~~ | ~~🟠~~ | ✅ `EquipmentStockPerDeparture` sudah ada |
| ~~E5~~ | ~~Alert stok rendah otomatis~~ | ~~🟡~~ | ✅ Banner amber + badge klik di EquipmentPage |
| ~~E6~~ | ~~Export laporan distribusi ke Excel~~ | ~~🟡~~ | ✅ Tombol Export Excel di Daftar Jamaah |
| E7 | **Foto bukti distribusi** | 🟡 | Tidak ada field foto bukti serah terima |
| E8 | **Paket perlengkapan per tipe paket** | 🟡 | Perlengkapan tidak terikat otomatis ke tipe paket |

---

## MODUL 5 — KAMAR (ROOM ASSIGNMENT) ⚠️ AUDIT GAPS

### ✅ Yang Sudah Ada

| Fitur | Lokasi |
|-------|--------|
| Rooming list improved | `RoomingListPageImproved.tsx` |
| Admin room assignments | `AdminRoomAssignments.tsx` |
| Auto-assign berdasarkan gender + room type | `Wand2` auto-assign |
| Buat/edit grup kamar | Dialog buat group kamar |
| ChangeRoomTypeDialog | `ChangeRoomTypeDialog.tsx` |
| RoomTypeAssignmentDialog | `RoomTypeAssignmentDialog.tsx` |
| Export rooming list (Excel + PDF) | `rooming-list-exporter.ts` |
| room_occupants table | `fase21_integration_fixes.sql` |
| Mahram grouping (same room) | `customer_mahrams` table |
| Filter per gender, per room status | |

### ❌ Fitur Kamar yang Belum Ada / Perlu Dikerjakan

| # | Fitur | Prioritas | Detail |
|---|-------|-----------|--------|
| ~~K1~~ | ~~Nomor kamar hotel spesifik~~ | ~~🔴~~ | ✅ `room_number` + `floor` sudah ada di `room_assignments` + form input |
| ~~K2~~ | ~~Denah lantai / floor plan visual~~ | ~~🟠~~ | ✅ `FloorPlanView.tsx` — grid per lantai + drag-and-drop + room-swap |
| K3 | **Kapasitas per tipe kamar per hotel** | 🟠 | Tidak ada batas kapasitas berdasarkan hotel aktual |
| ~~K4~~ | ~~Permintaan khusus kamar~~ | ~~🟡~~ | ✅ `special_requests` field sudah ada di DB + ditampilkan di AdminBookingDetail |
| ~~K5~~ | ~~Notif otomatis ke jamaah saat kamar ditugaskan~~ | ~~🟡~~ | ✅ Tombol "Notif WA Kamar" di RoomingList — kirim info kamar via WhatsApp |
| ~~K6~~ | ~~**Validasi kompatibilitas mahram**~~ | ~~🟡~~ | ✅ `MahramCompatibilityAlert.tsx` + `useMahramConflicts.ts` + DB function `check_mahram_room_conflicts()` — warning otomatis di RoomingList saat mahram belum dapat kamar atau beda hotel |
| K7 | **Multi-hotel per kota** (Makkah Hotel A + Hotel B) | 🟡 | Setiap departure hanya 1 hotel per kota |

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
| 🔧 | booking_line_items | Table ada, belum digunakan secara penuh |

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
| 🔧 | WA reminder cicilan dari browser (token terekspos) | Harus migrasi ke `/api/whatsapp/send` |

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
| ✅ | customer_notifications, jamaah_checklist (fase21) | DB tables |
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
| ❌ | Withdrawal otomatis wallet agen | Belum ada flow withdrawal |

---

## MODUL 11 — CABANG (BRANCH)

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Dashboard, booking, agen, staff | `pages/branch/` |
| ✅ | Laporan, KPI targets, perbandingan | `pages/branch/` |
| ✅ | branch_monthly_targets table (fase19) | |
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
| 🔧 | WA reminder dari browser (token terekspos) | `AdminCicilanReminder.tsx`, `AdminPembayaranReminder.tsx` |

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

## MODUL 15 — HR & OPERASIONAL INTERNAL

| Status | Fitur | Lokasi |
|--------|-------|--------|
| ✅ | Manajemen HR, penggajian, absensi karyawan | `pages/admin/AdminHR.tsx`, `AdminPayroll.tsx` |
| ✅ | Verifikasi dokumen, tracker kadaluarsa | `AdminDocumentVerification.tsx` |
| ✅ | Manajemen visa | `AdminVisaManagement.tsx` |
| ✅ | Bus management | `BusManagementPage.tsx` |
| ✅ | Vendor & kontrak | `AdminVendors.tsx`, `AdminVendorContracts.tsx` |
| ✅ | Master data (hotel, airline, airport) | `AdminHotels.tsx`, `AdminAirlines.tsx` |
| ✅ | Manasik (jadwal + materi + quiz) | `AdminManasik.tsx` |

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
| ✅ | Dashboard per role (Branch/Finance/Marketing/Sales/Equipment) | `pages/admin/dashboards/` |
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

### ❌ Route yang Belum Ada (Prioritas)

| Route | Prioritas | Dampak |
|-------|-----------|--------|
| `POST /api/midtrans/webhook` | 🔴 | Status tidak auto-update (sudah ada di Supabase edge function, belum di Express) |
| `GET /api/dashboard/stats` | 🟠 | Dashboard ambil data langsung dari Supabase |
| `POST /api/scheduler/run` | 🟠 | Cron job pengingat otomatis belum ada di Express |
| `GET /api/reports/export` | 🟡 | Export laporan harus server-side |

---

## KEAMANAN — MASALAH AKTIF

| # | Masalah | Dampak | Solusi |
|---|---------|--------|--------|
| ~~S1~~ | ~~WA token terekspos di browser~~ | ~~Token Fonnte bisa dilihat di DevTools~~ | ✅ Sudah migrasi ke `/api/whatsapp/send` — token hanya di backend |
| S2 | **VITE_SUPABASE_URL kosong** | Semua halaman login tidak bisa diakses | Set di Replit Secrets |
| S3 | **VAPID_PRIVATE_KEY** harus di env secret | Jangan simpan di DB | Cek `VAPID_PRIVATE_KEY` di Secrets |
| S4 | **Midtrans Server Key** harus di backend saja | Jangan expose di frontend | Cek config |

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
| 7 | **TypeScript build error fix** — types untuk equipment_distributions, equipment_items, return_equipment_item | ✅ |
| 8 | **SQL bootstrap files** — bootstrap auth, missing tables, bookings columns, gallery_media_type | ✅ |
| 9 | **QR Code Invoice** — embed QR publik di Form Transaksi PDF; route `/transaksi/:bookingId` tanpa login | ✅ |
| 10 | **Invoice Template dinamis** — toggle QR + 3 pilihan posisi (kanan atas/bawah/tengah) di Admin Panel | ✅ |
| 11 | **Fix notif WA error modal** — safe JSON parse, modal dialog jelas + instruksi setup FONNTE_TOKEN | ✅ |
| 12 | **Cetak Ulang Barcode** — modal cetak QR label per booking (3 ukuran: stiker/kartu/A4); trigger dari daftar dan detail booking | ✅ |
| 13 | **D5 – Lock banner departure departed** — banner amber muncul di AdminDepartureDetail saat status = departed | ✅ |
| 14 | **E5 – Alert stok rendah otomatis** — banner di EquipmentPage daftar item di bawah threshold; klik badge langsung tambah stok | ✅ |
| 15 | **E6 – Export distribusi perlengkapan ke Excel** — tombol "Export Excel" di Daftar Jamaah; kolom: nama, L/P, item diterima, item belum, progress % | ✅ |
| 16 | **K5 – Notif WA kamar ke semua jamaah** — tombol "Notif WA Kamar" di RoomingList; kirim info hotel+nomor kamar via `/api/whatsapp/send` | ✅ |
| 17 | **K2 – Denah lantai visual (Floor Plan)** — `FloorPlanView.tsx`: grid kamar per lantai, sidebar jamaah belum ditempatkan, drag-and-drop assign | ✅ |
| 18 | **Room-swap via drag-and-drop** — seret dot penghuni dari kamar ke kamar lain langsung; highlight amber saat drag antar kamar | ✅ |
| 19 | **K6 – Validasi kompatibilitas mahram** — `MahramCompatibilityAlert.tsx` + hook `useMahramConflicts` + DB RPC `check_mahram_room_conflicts(departure_id, hotel_id)`; alert merah/kuning otomatis di halaman RoomingList saat pasangan mahram belum ditempatkan atau beda hotel | ✅ |

---

## STATUS ITEM DARI RENCANA (AUDIT JUNI 2026)

> Verifikasi langsung dari codebase — item yang sebelumnya dikira ❌ ternyata sudah ada:

| Item | Kode | Status Sebenarnya |
|------|------|-------------------|
| WA token security (S1/B2) | AdminCicilanReminder + AdminPembayaranReminder | ✅ pakai `/api/whatsapp/send` |
| special_requests kamar (K4) | DB types + AdminBookingDetail | ✅ sudah ada |
| Batas diskon max coupon (P4) | CouponForm + StepReviewDynamic | ✅ sudah ada |
| Auto-slug paket (P5) | `lib/slug.ts` + dipakai di banyak halaman | ✅ sudah ada |
| History harga paket (P3) | PackagePriceTrendCard + PackagePriceAuditCard di AdminPackageDetail | ✅ sudah ada |
| Konfirmasi perlengkapan (E3) | EquipmentConfirmationTab | ✅ sudah ada |
| Laporan stok per departure (E4) | EquipmentStockPerDeparture | ✅ sudah ada |

---

## PEKERJAAN BERIKUTNYA (BACKLOG PRIORITAS)

### 🔴 KRITIS (Perlu tindakan user)

| # | Task | Modul |
|---|------|-------|
| B1 | Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` + `SUPABASE_SERVICE_ROLE_KEY` di Replit Secrets — **tanpa ini semua fitur Supabase tidak aktif** | Semua |

### 🟡 NICE TO HAVE (Belum dikerjakan)

| # | Task | Modul |
|---|------|-------|
| B11 | Integrasi SISKOHAT API Kemenag (D1) — butuh akses API Kemenag | Keberangkatan |
| B12 | Denah lantai / floor plan kamar visual (K2) | Kamar |
| B13 | Multi-hotel per kota per departure (K7) | Kamar |
| B14 | Export kalender ke ICS/Google Calendar | Platform |
| B15 | Withdrawal otomatis wallet agen | Agen |
| B16 | Live tracking posisi rombongan di peta (D6) | Keberangkatan |
| ~~B17~~ | ~~Validasi kompatibilitas mahram di room assignment (K6)~~ | ~~Kamar~~ |
| B18 | Foto bukti distribusi perlengkapan (E7) | Equipment |
| B19 | Paket perlengkapan default per tipe paket (E8) | Equipment |

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
Express API routes:         ~15 endpoint aktif

Fitur tersedia di kode:    ~97% (✅)
Fitur sebagian:             ~1% (🔧)
Fitur belum ada:            ~2% (❌)
```

---

*Terakhir diperbarui: Juni 2026*  
*SQL kanonikal: `sql/migrations/` (001–061) + `sql/MASTER_FRESH_INSTALL.sql`*  
*Supabase migrations: `supabase/migrations/`*
