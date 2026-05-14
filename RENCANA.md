# Rencana & Status Pengembangan — Vinstour Travel Portal

> **Terakhir diperbarui:** 14 Mei 2026 (Sprint 14 — TAB-FIX3, NOTIF-TAB, K9, J3, K7)
> **Stack:** React 19 + Vite 7 + TypeScript 5.9 + Supabase + Express (pnpm monorepo)
> **Ini adalah SATU-SATUNYA file rencana resmi. Jangan buat file rencana lain.**

---

## 🚀 DAFTAR PRIORITAS (BELUM SELESAI)

| Prioritas | Kode | Fitur | Keterangan |
| :--- | :--- | :--- | :--- |
| ✅ **SELESAI** | PAK-F6 | Harga per Orang Mandiri | Model haji: kalkulasi dari price_adult/child/infant, StepPassengersDynamic, StepReviewDynamic (Sprint 12) |
| ✅ **SELESAI** | TAB-FIX1 | Konversi Tabungan → Booking | Flow pilih jadwal + tipe kamar + locked_price + WA notif setelah konversi |
| ✅ **SELESAI** | TAB-FIX2 | Harga Terkunci + Notifikasi | Tab "Harga Terkunci" di AdminSavingsPlans — monitoring locked_price vs harga saat ini + WA alert |
| ✅ **SELESAI** | PAK-F7 | Bandingkan Paket | `PackageCompare.tsx` + route `/packages/compare` + link di PackageList |
| ✅ **SELESAI** | PAK-F8 | Filter Currency di Listing | Dropdown filter `?currency=` di `/packages` (CUR-8, Sprint 10) |
| ✅ **SELESAI** | BOOK-FIX7 | Guest Checkout Recovery | Edge function `send-booking-recovery` + `booking_access_tokens` + `/booking/recover` (Sprint 11) |
| ✅ **SELESAI** | TAB-FIX6 | Tabungan Fleksibel | `SavingsFlexibleRegister.tsx` + route `/savings/register/flexible` + kartu di SavingsPackages |
| ✅ **SELESAI** | KEP-FIX6 | Manajemen Bagasi | `AdminBaggagePolicies.tsx` — UI proper, dialog create/edit, tabel lengkap, konfirmasi hapus |
| ✅ **SELESAI** | TAB-FIX3 | Tab "Tabungan Dikonversi" | Tab baru di `AdminSavings` — daftar converted plans + sisa tagihan highlighted + WA follow-up (Sprint 14) |
| ✅ **SELESAI** | NOTIF-TAB | Notifikasi Admin — Savings Converted | Listener realtime di `useAdminNotifications` untuk savings_plans status→converted + tipe baru `savings_converted` + PiggyBank pill di NotificationBell (Sprint 14) |
| ✅ **SELESAI** | K9 | Ringkasan Budget di Tab Header | `DepartureBudgetTab` — totalBudgeted/totalRealized sudah muncul di label trigger tab "Budget" di AdminDepartureDetail |
| ✅ **SELESAI** | J3 | Offline Mode Dokumen & Visa Tracker | `JamaahDocuments` + `JamaahVisaTracker` — cache localStorage via `useOfflineCache` + `OfflineBanner` saat tidak ada koneksi |
| ✅ **SELESAI** | K7 | Generate Sertifikat Massal | `DepartureCertificateGenerator` — tombol 1-klik generate + zip seluruh jamaah setelah status departed |

---

## LEGENDA

| Simbol | Artinya |
|--------|---------|
| ✅ | Selesai & berfungsi |
| ⚠️ | Ada catatan penting / sebagian selesai |
| 🔴 | Belum dibangun |
| 🟡 | Prioritas sedang — direncanakan |
| 🟠 | Prioritas tinggi — harus dikerjakan segera |

---

## RINGKASAN BATCH PERBAIKAN (Sprint 9)

### ✅ Sudah Selesai (30 item)

| Kode | Fitur | Catatan |
|------|-------|---------|
| GAP-PWA-01 | Manifest dinamis dari DB | Edge function `manifest` baca `website_settings`; index.html link ke `…/functions/v1/manifest` |
| GAP-PWA-04 | Splash screen dinamis dari Admin | Event `theme-ready` dari ThemeProvider |
| GAP-PWA-05 | Bottom Nav role-aware | `RoleAwareBottomNav.tsx` |
| GAP-PWA-06 | SW update notification | `PWAUpdateNotifier.tsx` |
| CSS-FIX-1 | Loader disembunyikan setelah tema siap | event `theme-ready` + fallback 1.5s |
| CSS-FIX-2 | Font cache di localStorage | `website-fonts-cache` ditulis ThemeProvider, di-restore script di `<head>` sebelum React mount |
| CSS-FIX-3 | Realtime invalidation tema | Subscribe `website_settings` → clear cache + invalidate query |
| CSS-FIX-6 | Critical CSS inline di `<head>` | Box-sizing reset, sr-only utility, app-shell skeleton — first paint tidak menunggu CSS bundle |
| RBAC-F1 | Sumber roles dari `useAuth().roles` | `useDynamicMenus.ts` |
| RBAC-F2 | VAPID private key pindah ke `Deno.env` secret | `send-push`, `process-push-queue` |
| RBAC-F3 | Fallback permission ke localStorage cache | `useDynamicMenus.ts` |
| RBAC-F4 | Realtime invalidation permission | Subscribe `user_permissions`, `user_roles`, `role_permissions` → invalidate query `user-effective-permissions` |
| AGEN-ADD1 | Manajemen rekening bank agen | Form di `AgentSettings` |
| AGEN-ADD2 | Migration training_modules + quizzes + progress | RLS + seed 3 modul |
| AGEN-ADD3 | Notifikasi real-time agen (push + bell) | `useAgentNotifications` + `AgentNotificationBell` di `AgentLayoutEnhanced` |
| AGEN-ADD4 | Halaman jamaah sub-agen | `/agent/sub-agent-jamaah` (`AgentSubAgentJamaah.tsx`) |
| CAB-ADD1 | RLS per cabang | Policy `Branch managers see only own branch …` di `bookings`, `customers`, `payments` + helper `is_branch_manager_only(uid)` |
| CAB-ADD2 | Manajemen staff cabang | `/cabang/staff` |
| CAB-ADD3 | Dashboard perbandingan cabang | `/admin/branches/comparison` (KPI + chart + leaderboard) |
| CAB-ADD4 | Export laporan cabang | xlsx + jsPDF autoTable di `BranchLaporan` |
| CAB-ADD5 | Notifikasi branch manager | Trigger DB `tg_notify_branch_manager_new_booking` + `tg_notify_branch_manager_payment_pending` |
| LOY-FIX1 | Auto-hitung poin loyalitas | Trigger `tr_award_loyalty_points` di `payments`: 1 poin per Rp 100.000 + auto-tier upgrade |
| LOY-FIX2 | Benefit tier (diskon nyata) | Tabel `tier_benefits` + RPC `apply_tier_discount` + halaman admin `/admin/loyalty/tier-benefits` |
| LOY-FIX3 | Trigger badge otomatis | 5 trigger DB + tabel `jamaah_badges` |
| LOY-FIX4 | Reminder tabungan (H-3 + overdue) | edge `check-savings-reminders` + pg_cron 02:00 UTC |
| KEP-FIX1 | Reminder deadline dokumen/visa | edge `check-document-deadlines` + pg_cron 00:00 UTC |
| KEP-FIX2 | Validasi mahram di manifest haji | Banner peringatan di `AdminManifestJamaah` (pakai tabel `customer_mahrams`) |
| KEP-FIX4 | Dashboard jamaah belum lengkap dokumen | `/admin/documents-incomplete` (`AdminIncompleteDocuments.tsx`) |
| KEP-FIX5 | Absensi harian jamaah di tanah suci | Tabel `jamaah_daily_attendance` + `/admin/absensi-harian` (Mekkah/Madinah/Mina/Arafah/Muzdalifah/Jeddah) |
| BUILD-FIX | TS error `PackageCompare.tsx` (`pkg` undefined di `PriceBadge`) | prop `currency` ditambah |
| BUILD-FIX-2 | TS error `useIbadahReminder.ts` (`setPrayerTimes` undefined) | Diganti ke `setFetchedPrayerTimes` |
| BUILD-FIX-3 | TS error `JamaahBottomNav.tsx` (`Trophy` undefined) | Import `Trophy` dari `lucide-react` |

### 🟠 Belum Selesai — Prioritas Tinggi

_(kosong — semua item prioritas tinggi sudah selesai ✅)_

### ✅ Tambahan Selesai (Sprint 9 — batch prioritas sedang)

| Kode | Fitur | Catatan |
|------|-------|---------|
| GAP-PWA-07 | Manifest shortcuts dinamis | Tertangani oleh GAP-PWA-01 (manifest edge function) |
| GAP-PWA-09 | Deteksi mode fullscreen/minimal-ui | `usePWAMode.ts` matchMedia diperluas |
| GAP-PWA-10 | Statistik install PWA | Tabel `pwa_install_events` + hook `usePWAInstallTracker` (dipasang di `App.tsx`) + halaman `/admin/pwa-install-stats` |
| GAP-RBAC-08 | Simulasi akses user | `/admin/access-simulator` (`AdminAccessSimulator.tsx`) — pilih user, lihat menu allowed/denied |
| GAP-RBAC-09 | Dokumentasi customer vs jamaah | Komentar di `permissions.ts` & alias hook konsisten |
| GAP-RBAC-10 | Permission `pwa-settings` terpisah | Constant `PERMISSIONS.PWA_SETTINGS` + entri di `permissions_list` + route diperbarui |
| GAP-RBAC-11 | Fallback registry → cache localStorage | Sudah ditangani RBAC-F3 (cache hit terakhir, bukan full access) |
| CSS-FIX-4 | Cache 5 menit + staleTime 2 menit | `useWebsiteSettingsOptimized.ts` |
| CSS-FIX-5 | Hapus duplikasi hook lama | `useWebsiteSettings.ts` sekarang re-export dari Optimized |
| AGEN-ADD5 | Kalkulator komisi | `/admin/commission-calculator` |
| AGEN-ADD8 | Leaderboard realtime | `useRealtimeSubscription` ke `bookings` & `agent_commissions` di `AgentLeaderboard` |
| CAB-ADD8 | Transfer booking antar cabang | Tabel `booking_transfers` + halaman `/admin/booking-transfers` (request → approve/reject + auto-update branch) |
| LOY-FIX5 | Auto-upgrade tier agen | Trigger `tg_auto_upgrade_agent_membership` di `agent_commissions` (bronze→silver→gold→platinum berdasar komisi YTD) |
| LOY-FIX7 | Expiry poin loyalitas | Tabel `loyalty_point_expiry` (status active/expired/consumed) |
| KEP-FIX6 | Manajemen bagasi per maskapai | Tabel `baggage_policies` + `/admin/baggage-policies` |
| KEP-FIX7 | Survey pasca keberangkatan | Tabel `departure_surveys` + `/admin/post-departure-survey` (rating overall/hotel/food/muthawif + komentar) |
| KEP-FIX8 | Export ICS | Utility `lib/ics-export.ts` (`buildIcs`, `downloadIcs`) |
| GAP-PWA-08 | Preview "Tampilan App" iframe | Tab `Live App` di `AdminPWASettings` dengan iframe `/?preview=standalone` |
| AGEN-ADD6 | Generate booking link dari lead CRM | Tombol "Generate Link Booking" di `AdminLeadDetail` (auto copy + WA) |
| CAB-ADD6 | Iframe preview website cabang | Tombol Preview + dialog iframe di `BranchWebsiteSettings` |
| CAB-ADD7 | Date range filter dashboard cabang | Filter periode (Bulan Ini / Bulan Lalu / 3 Bulan / custom) di `BranchDashboard` |
| LOY-FIX6 | Download Digital ID sebagai gambar | Integrasi `html2canvas` di `JamaahDigitalID` |
| LOY-FIX8 | Reward image upload UI | Field `image_url` di form + preview + render di katalog (`AdminLoyalty`) |

### 🟡 Belum Selesai — Prioritas Sedang (sisa)

| Kode | Fitur | Catatan |
|------|-------|---------|
| AGEN-ADD7 | SSR/meta tag website agen | Tidak feasible di SPA Vite tanpa migrasi ke Next/Remix — ditunda |

### ✅ Tambahan Selesai (Sprint 10 — sebagian Multi-Currency)

| Kode | Fitur | Catatan |
|------|-------|---------|
| CUR-1 | Tabel `exchange_rates` + RLS (read all, write admin) | Migrasi 13 Mei 2026 + seed default USD/SAR/EUR/MYR |
| CUR-2 | Kolom `bookings.exchange_rate / total_price_original / total_price_idr` | Backfill IDR 1:1 untuk booking lama |
| CUR-2b | Kolom `packages.booking_mode` (umroh/haji/wisata) | Backfill otomatis dari `package_type` |
| CUR-3 | Halaman `/admin/exchange-rates` | Admin input kurs harian, auto-deactivate kurs lama, riwayat lengkap |
| CUR-3b | Permission `exchange-rates` + entry menu_items + role super_admin/owner/branch_manager/finance |
| CUR-3c | Field `booking_mode` di `RegularPackageForm` |
| CUR-7 | Wizard snapshot kurs saat submit | `useBookingWizardDynamic` panggil RPC `get_active_exchange_rate` & simpan ke booking |

### 🟠 Sisa Sprint 10 (lanjutan)

| Kode | Fitur |
|------|-------|
| ✅ BOOK-FIX2 | Wizard branching: skip alokasi kamar untuk Haji (STEPS_HAJI di `BookingWizard`) |
| ✅ CUR-4 | Kolom `departures.price_adult/child/infant` ditambahkan (migrasi 13 Mei 2026) |
| ✅ CUR-5 | Helper `lib/currency.ts` (`getExchangeRate`, `formatPriceWithIDR`) |
| ✅ CUR-6 | Badge IDR ekuivalen di Step Review (di total saat currency paket ≠ IDR, pakai `getExchangeRate`) |
| ✅ CUR-8 | Filter currency di `/packages` (dropdown URL param `?currency=`) |
| ✅ BOOK-FIX4 | Step 4 wizard: opsi DP / Lunas / Tabungan + auto-create payment record sesuai mode |

### 🟠 Sisa Sprint 11

| Kode | Fitur | Catatan |
|------|-------|---------|
| ✅ BOOK-FIX3 | Seat hold 15 menit + countdown banner di wizard (tabel `seat_holds` + RPC `hold_departure_seats` / `release_seat_hold` + hook `useSeatHold`) |
| ✅ BOOK-FIX6 | Edge function `midtrans-webhook` (verifikasi SHA512 signature, auto-update payment status, log ke `midtrans_webhook_logs`) |
| ✅ BOOK-FIX7 | Edge function `send-booking-recovery` + tabel `booking_access_tokens` + page `/booking/recover` (token 30 hari) |
| AGEN-ADD7 | SSR/meta tag website agen | Tidak feasible di SPA — ditunda |

### ✅ Selesai Sprint 14 (14 Mei 2026 — TAB-FIX3, NOTIF-TAB, K9, J3, K7)

| Kode | Fitur | Catatan |
|------|-------|---------|
| ✅ TAB-FIX3 | Tab "Tabungan Dikonversi" di AdminSavings | Tab baru dengan query `savings_plans WHERE status='converted'` + join customers/bookings/packages; 3 summary cards (total, sisa tagihan, total outstanding); amber alert banner; tabel dengan sisa tagihan highlighted; tombol WA follow-up per baris dengan pesan pre-filled; badge counter amber di trigger tab |
| ✅ NOTIF-TAB | Notifikasi Admin — Savings Converted | Listener realtime `useAdminNotifications` untuk event UPDATE `savings_plans` → `status='converted'`; tipe baru `savings_converted`; PiggyBank icon + pill "Tabungan" teal di NotificationBell; notifikasi link ke `/admin/bookings/:id` |
| ✅ K9 | Ringkasan Budget di Tab Header | `DepartureBudgetTab` sudah menampilkan `totalBudgeted` & `totalRealized` di trigger tab "Budget" — konfirmasi implementasi sudah ada |
| ✅ J3 | Offline Mode Dokumen & Visa Tracker | `JamaahDocuments` + `JamaahVisaTracker` menggunakan `useOfflineCache` + `OfflineBanner` — konfirmasi implementasi sudah ada |
| ✅ K7 | Generate Sertifikat Massal | `DepartureCertificateGenerator.tsx` — tombol 1-klik generate + zip seluruh jamaah setelah status `departed` — konfirmasi implementasi sudah ada |

---

### ✅ Selesai Sprint 13 (14 Mei 2026 — TAB-FIX1, TAB-FIX2, TAB-FIX6, KEP-FIX6)

| Kode | Fitur | Catatan |
|------|-------|---------|
| ✅ TAB-FIX1 | Konversi Tabungan → Booking | `AdminSavingsPlans.tsx`: state `convRoomType`, grid pilih tipe kamar (quad/triple/double/single), query departure include price columns + status open/confirmed/active, tampil sisa kursi, ringkasan harga (booking/terbayar/sisa), `locked_price` ditampilkan di dialog, WA notif otomatis via `sendBookingConfirm` setelah konversi |
| ✅ TAB-FIX2 | Harga Terkunci + Notifikasi | `AdminSavingsPlans.tsx`: tab ketiga "Harga Terkunci", badge counter jumlah jamaah terdampak, summary cards (harga naik/stabil/total hemat), tabel perbandingan `locked_price` vs harga paket saat ini, tombol "Notif WA" per baris, row highlight amber untuk harga naik |
| ✅ TAB-FIX6 | Tabungan Fleksibel | `SavingsFlexibleRegister.tsx` (baru): slider target Rp 5–100 juta, label tujuan custom, tenor 6–36 bln, DP 0–30%, insert `savings_plans` dengan `package_id: null`; kartu amber "Baru" ditambahkan ke `SavingsPackages.tsx`; route `/savings/register/flexible` didaftarkan sebelum `/:packageId` di `PublicRoutes.tsx` |
| ✅ KEP-FIX6 | Manajemen Bagasi per Maskapai | `AdminBaggagePolicies.tsx` (rewrite): tabel shadcn + dialog create/edit dengan Select maskapai proper + field max_pieces + Textarea notes + preview badge; AlertDialog konfirmasi hapus; info card panduan penggunaan; fallback "Default (Global)" untuk semua maskapai |

> **Catatan teknis KEP-FIX6:** Kolom `max_pieces` mungkin perlu ditambah ke tabel `baggage_policies` via Supabase SQL: `ALTER TABLE baggage_policies ADD COLUMN IF NOT EXISTS max_pieces integer;`

---

### ✅ Selesai Sprint 12 (14 Mei 2026 — PAK-F4 & PAK-F5)

| Kode | Fitur | Catatan |
|------|-------|---------|
| ✅ PAK-F4 | Sistem Kurs Mata Uang — upgrade `AdminExchangeRates` | Tombol "Ambil dari API" (Frankfurter/ECB proxy), simpan semua sekaligus, % perubahan dari kurs sebelumnya (TrendingUp/Down + alert > 1%), klik kartu untuk load ke form, fallback seed kurs default |
| ✅ PAK-F5-A | Label wisata di `format.ts` | Tambah: `wisata`, `wisata_religi`, `wisata_turki`, `wisata_maroko`, `wisata_jordan`, `wisata_palestina`, `wisata_mesir`, `wisata_eropa` + helper `getBookingModeLabel`, `getBookingModeBadgeColor` |
| ✅ PAK-F5-B | Field `booking_mode` di `PackageTypeForm` | Select umroh/haji/wisata + deskripsi impak wizard per mode |
| ✅ PAK-F5-C | Kolom `booking_mode` di `AdminPackageTypes` | Badge berwarna per mode, filter card 3 mode, tampilkan jumlah per mode |
| ✅ PAK-F5-D | SQL migration `20260514_wisata_package_types_and_booking_mode.sql` | Kolom `booking_mode` di tabel `package_types`, seed 7 tipe wisata, RPC `get_active_exchange_rate` (idempotent), seed kurs default |
| ✅ BUG-FIX | Install `web-vitals` + fallback loader 500ms | Package hilang menyebabkan error overlay; loader fallback dipercepat dari 1500ms ke 500ms |
| ✅ PAK-F6 | Harga per Orang Mandiri (Model Haji) | `StepPassengersDynamic` mode haji: tambah/hapus jamaah per tipe usia (Dewasa/Anak/Bayi), price tag per orang. `StepReviewDynamic` isHaji: rincian harga per tipe usia. `useBookingWizardDynamic` submit: deteksi `booking_mode=haji` → kalkulasi total dari `price_adult/child/infant`, bukan per tipe kamar. `bookingMode` dari URL param → hook |

> Detail lengkap setiap item ada di section masing-masing di bawah.

---

## BAGIAN 1 — CARA MENJALANKAN

```bash
# Frontend (port 5000)
pnpm --filter @workspace/umrah-haji run dev

# API Server (port 8080)
PORT=8080 pnpm --filter @workspace/api-server run dev

# Typecheck semua paket
pnpm run typecheck

# Build library (wajib sebelum typecheck api-server)
pnpm run typecheck:libs

# Regenerate API hooks dari OpenAPI spec
pnpm --filter @workspace/api-spec run codegen
```

---

## BAGIAN 2 — INFRASTRUKTUR & TEKNIS

| Item | Status | Catatan |
|------|--------|---------|
| pnpm monorepo (umrah-haji + api-server + api-spec + lib/) | ✅ | Port 5000 / 8080 |
| React 19 + Vite 7 + TypeScript 5.9 + Tailwind v3 | ✅ | 0 error TS |
| Supabase Auth + Database (graceful demo mode) | ✅ | App jalan tanpa Supabase, fitur data mati |
| RBAC granular — Visual Permission Matrix + Audit Log | ✅ | |
| Role redirect berbasis role (admin→`/admin`, agent→`/agent`, jamaah→`/jamaah`) | ✅ | |
| PWA / Service Worker + standalone mode detection | ✅ | Layout beda saat diinstall |
| Dark Mode global | ✅ | |
| Multi-tenant (branch/agent subdomain) | ✅ | |
| Export Excel (xlsx, xlsx-js-style) — 15+ halaman | ✅ | |
| Export PDF (jsPDF + autoTable) — 10+ halaman | ✅ | |
| OpenAPI Spec + Codegen (Orval) — type-safe hooks | ✅ | |
| Error Boundary global | ✅ | |
| Supabase Realtime (attendance, notifikasi) | ✅ | |
| QR Code generation (qrcode) + scanning (html5-qrcode) | ✅ | |
| Workflow Replit — Start application + Start API server | ✅ | Keduanya RUNNING |

### Catatan Teknis Kritis

- **`remaining_amount`** di `bookings` adalah generated column → JANGAN masukkan ke INSERT/UPDATE
- **Multi-tipe kamar**: `booking_passengers.room_preference` adalah source of truth per jamaah
- **Tabel Supabase baru**: wajib aktifkan RLS + buat policy per role
- **Airport FK hints**: gunakan `airports!departure_airport_id` (nama kolom), BUKAN nama constraint penuh
- **Tabel extra**: gunakan pola `(supabase as any).from("table_name")` untuk tabel tanpa type
- **Tailwind**: gunakan v3 via PostCSS — JANGAN gunakan `@tailwindcss/vite` plugin
- **`bookings.agent_id`**: tidak ada FK constraint ke `agents`, selalu fetch agent secara terpisah
- **Mobile-responsive + dark mode + loading skeleton** wajib di setiap halaman baru
- **Routing**: lazy import di file Routes.tsx, daftarkan di `admin-menu-registry.ts`

---

## BAGIAN 3 — ENVIRONMENT VARIABLES (Replit Secrets)

| Secret | Keterangan | Status |
|--------|-----------|--------|
| `VITE_SUPABASE_URL` | URL project Supabase (`https://xxx.supabase.co`) | ⚠️ Perlu diset |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/public key dari Supabase | ⚠️ Perlu diset |
| `SUPABASE_URL` | URL yang sama untuk API server | ⚠️ Perlu diset |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (jangan expose ke frontend!) | ⚠️ Perlu diset |
| `SMTP_HOST` | Host SMTP (`smtp.gmail.com`) | ⚠️ Opsional |
| `SMTP_PORT` | Port SMTP (`587`) | ⚠️ Opsional |
| `SMTP_USER` | Username/email SMTP | ⚠️ Opsional |
| `SMTP_PASS` | Password SMTP atau App Password | ⚠️ Opsional |
| `SMTP_FROM` | Alamat pengirim (`noreply@vinstour.com`) | ⚠️ Opsional |
| `MIDTRANS_SERVER_KEY` | Server key dari dashboard Midtrans | ⚠️ Opsional |
| `MIDTRANS_CLIENT_KEY` | Client key (untuk Snap.js di frontend) | ⚠️ Opsional |
| `MIDTRANS_ENV` | `sandbox` (default) atau `production` | ⚠️ Opsional |
| `VAPID_PUBLIC_KEY` | Generate: `npx web-push generate-vapid-keys` | ⚠️ Opsional |
| `VAPID_PRIVATE_KEY` | Generate: `npx web-push generate-vapid-keys` | ⚠️ Opsional |
| `VAPID_EMAIL` | `mailto:admin@vinstour.com` | ⚠️ Opsional |

> **Tanpa Supabase:** app berjalan dalam demo mode. Auth tidak aktif, data tidak tersimpan.

---

## BAGIAN 4 — SEMUA HALAMAN (Status Lengkap)

### 4A — Portal Publik (`/`)

| Halaman | URL | Status |
|---------|-----|--------|
| Landing Page + Banner Carousel | `/` | ✅ |
| Quick Menu Grid (Layanan, Portal, Fitur Islami) | `/` (section) | ✅ |
| Daftar Paket | `/packages` | ✅ |
| Bandingkan Paket | `/packages/compare` | ✅ |
| Detail Paket | `/packages/:idSlug` | ✅ |
| Jadwal Keberangkatan Publik | `/departures` | ✅ |
| Blog | `/blog`, `/blog/:slug` | ✅ |
| Kontak | `/contact` | ✅ |
| Tentang Kami | `/about` | ✅ |
| Tim | `/team` | ✅ |
| FAQ | `/faq` | ✅ |
| Testimoni | `/testimonials` | ✅ |
| Kalkulator Biaya Umroh | `/kalkulator` | ✅ |
| Kalkulator Cicilan | `/kalkulator-cicilan` | ✅ |
| Cek Status Booking | `/cek-booking` | ✅ |
| Kurs Mata Uang Real-time | `/kurs` | ✅ |
| Fitur Portal | `/fitur` | ✅ |
| Landing Jamaah | `/jamaah-info` | ✅ |
| Tabungan Umroh | `/savings` | ✅ |
| Website Agen | `/a/:agentSlug` | ✅ |
| Website Cabang | `/b/:branchSlug` | ✅ |
| Landing Page Kustom | `/lp/:slug` | ✅ |

### 4B — Fitur Islami (`/`)

| Halaman | URL | Status |
|---------|-----|--------|
| Jadwal Sholat | `/sholat` | ✅ |
| Al-Quran Digital | `/alquran` | ✅ |
| Arah Kiblat | `/kiblat` | ✅ |
| Cuaca Tanah Suci | `/cuaca` | ✅ |
| Tracker Ibadah Harian | `/tracker-ibadah` | ✅ |
| Kalkulator Islami | `/kalkulator-islami` | ✅ |
| Tasbih Digital | `/tasbih` | ✅ |
| Toko Perlengkapan (E-commerce) | `/store` | ✅ |

### 4C — Portal Customer (`/customer/*`)

| Halaman | URL | Status |
|---------|-----|--------|
| Dashboard | `/customer/dashboard` | ✅ |
| Daftar Booking | `/my-bookings` | ✅ |
| Detail Booking | `/my-bookings/:id` | ✅ |
| Upload Pembayaran | `/my-bookings/:id/payment` | ✅ |
| Tabungan | `/customer/my-savings` | ✅ |
| Loyalitas | `/customer/my-loyalty` | ✅ |
| Support | `/customer/support` | ✅ |
| Pengaturan | `/customer/settings` | ✅ |
| Status Refund/Pembatalan | `/customer/refund-status` | ✅ |

### 4D — Toko E-Commerce (`/store/*`)

| Halaman | URL | Status |
|---------|-----|--------|
| Listing Produk | `/store` | ✅ |
| Checkout | `/store/checkout` | ✅ |
| Daftar Pesanan Jamaah | `/store/orders` | ✅ |
| Detail Pesanan + Upload Bukti Bayar | `/store/orders/:id` | ✅ |
| Admin — Dashboard Toko | `/admin/store` | ✅ |
| Admin — Manajemen Produk | `/admin/store/products` | ✅ |
| Admin — Manajemen Pesanan + Resi | `/admin/store/orders` | ✅ |
| Admin — Kategori Produk | `/admin/store/categories` | ✅ |

### 4E — Portal Jamaah / Mobile PWA (`/jamaah/*`)

| Halaman | URL | Status | Catatan |
|---------|-----|--------|---------|
| Portal Hub | `/jamaah` | ✅ | |
| Digital ID | `/jamaah/digital-id` | ✅ | |
| Itinerary | `/jamaah/itinerary` | ✅ | |
| Dokumen | `/jamaah/documents` | ✅ | Upload + notif admin |
| Riwayat Pembayaran | `/jamaah/payment-history` | ✅ | Timeline + progress bar |
| Feedback | `/jamaah/feedback` | ✅ | |
| Notifikasi | `/jamaah/notifications` | ✅ | Real-time via Supabase |
| Tracker Visa | `/jamaah/visa-tracker` | ✅ | |
| Peta Lokasi | `/jamaah/peta-lokasi` | ✅ | |
| Doa & Panduan | `/jamaah/doa-panduan` | ✅ | |
| Panduan Ibadah | `/jamaah/panduan-ibadah` | ✅ | |
| Waktu Sholat | `/jamaah/waktu-sholat` | ✅ | |
| Invoice | `/jamaah/invoice` | ✅ | |
| Bagasi | `/jamaah/bagasi` | ✅ | |
| Kontrak PDF | `/jamaah/kontrak` | ✅ | |
| Badges / Gamifikasi | `/jamaah/badges` | ✅ | |
| Target Ibadah | `/jamaah/target-ibadah` | ✅ | |
| Jurnal Perjalanan | `/jamaah/jurnal` | ✅ | |
| Doa Counter | `/jamaah/doa-counter` | ✅ | |
| Sertifikat | `/jamaah/sertifikat` | ✅ | |
| SISKOHAT Jamaah | `/jamaah/siskohat` | ✅ | |
| Chatbot AI | `/jamaah/chatbot` | ✅ | |
| Ringkasan AI | `/jamaah/ringkasan-ai` | ⚠️ | Template lokal, bukan LLM sungguhan |
| Pembayaran Mandiri | `/jamaah/payment` | ✅ | |
| Checklist | `/jamaah/checklist` | ✅ | Persistent ke Supabase |
| Manasik Digital + Kuis | `/jamaah/manasik` | ✅ | |
| SOS Status | `/jamaah/sos-status` | ✅ | |
| Profil Kesehatan | `/jamaah/kesehatan` | ✅ | |
| Tracker Ibadah Harian | `/jamaah/tracker-ibadah` | ✅ | |
| Galeri | `/jamaah/galeri` | ✅ | |
| Rombongan | `/jamaah/rombongan` | ✅ | |
| Zakat Calculator | `/jamaah/zakat` | ✅ | |
| QR Check-in | `/jamaah/checkin` | ✅ | |
| Al-Quran | `/jamaah/alquran` | ✅ | |
| Kalkulator Kurs | `/jamaah/kalkulator-kurs` | ✅ | |
| Referral | `/jamaah/referral` | ✅ | |
| Riwayat Perjalanan | `/jamaah/riwayat` | ✅ | |
| Pantau Keluarga | `/jamaah/pantau-keluarga` | ✅ | |
| Wishlist | `/jamaah/wishlist` | ✅ | |

### 4F — Portal Admin (`/admin/*`) — 121 Halaman

| Kelompok | Status |
|----------|--------|
| **Dashboard & Analytics** | |
| Dashboard utama + KPI + Analytics | ✅ |
| Finance Dashboard | ✅ |
| Sales Dashboard | ✅ |
| Marketing Dashboard | ✅ |
| Equipment Dashboard | ✅ |
| Branch Manager Dashboard | ✅ |
| AI Summary | ✅ |
| **CRM & Leads** | |
| Leads + Lead Detail + Follow Up | ✅ |
| Chat Leads (Widget) | ✅ |
| Sentimen & Feedback | ✅ |
| Rekomendasi Paket AI | ✅ |
| **Booking & Pembayaran** | |
| Daftar Booking + Buat Booking | ✅ |
| Booking Detail (fitur lengkap) | ✅ |
| Kelola Pembayaran | ✅ |
| Refund + Detail Refund | ✅ |
| Virtual Account | ✅ |
| Finance AR / AP / Cash / P&L / Terpadu | ✅ |
| **Paket & Keberangkatan** | |
| Kelola Paket + Tipe Paket | ✅ |
| Detail Paket | ✅ |
| Jadwal Keberangkatan + Detail | ✅ |
| Departure Tracking (Live) | ✅ |
| Manifest Jamaah | ✅ |
| Room Assignments | ✅ |
| **Jamaah & Dokumen** | |
| Data Jamaah + Detail Jamaah | ✅ |
| Verifikasi Dokumen | ✅ |
| Tipe Dokumen | ✅ |
| Document Generator | ✅ |
| Document Expiry Tracker | ✅ |
| Manasik | ✅ |
| Visa Management | ✅ |
| SISKOHAT | ✅ |
| Haji Management | ✅ |
| Absensi Digital | ✅ |
| **Tabungan & Loyalitas** | |
| Paket Tabungan | ✅ |
| Monitoring Tabungan | ✅ |
| Program Loyalitas | ✅ |
| Referral | ✅ |
| **SDM & Operasional** | |
| HR (Karyawan) | ✅ |
| Payroll | ✅ |
| Muthawif + Detail Muthawif | ✅ |
| Peralatan (Equipment) | ✅ |
| Stock Opname | ✅ |
| Vendor Contracts | ✅ |
| Bus Providers | ✅ |
| Training | ✅ |
| **Marketing & Konten** | |
| Landing Pages + Editor | ✅ |
| Blog | ✅ |
| Banners | ✅ |
| Marketing Materials | ✅ |
| Media Gallery | ✅ |
| Kupon & Promo | ✅ |
| Announcements | ✅ |
| **Agen & Cabang** | |
| Agen | ✅ |
| Cabang | ✅ |
| Komisi Cabang | ✅ |
| Laporan Agen | ✅ |
| **Laporan** | |
| Laporan Keuangan | ✅ |
| Laporan Keberangkatan | ✅ |
| Laporan Agen | ✅ |
| Laporan Tabungan | ✅ |
| Advanced Reports | ✅ |
| Scheduled Reports | ✅ |
| Agent Commission Report | ✅ |
| **Komunikasi** | |
| WhatsApp (WA Config + Blast) | ✅ |
| WA Blast Keberangkatan | ✅ |
| WA Otomatis | ✅ |
| Korespondensi Hub | ✅ |
| Email Templates | ✅ |
| Push Notifications | ✅ |
| Push Outbox | ✅ |
| Smart Notif | ✅ |
| Cicilan Reminder | ✅ |
| Pembayaran Reminder | ✅ |
| SOS Alerts Monitor | ✅ |
| Support Tickets | ✅ |
| **Pengaturan & Keamanan** | |
| Settings | ✅ |
| Appearance + Tema | ✅ |
| PWA Settings + Upload Ikon | ✅ |
| Role Management + RBAC Matrix | ✅ |
| Users | ✅ |
| Security Audit | ✅ |
| 2FA Settings | ✅ |
| Activity Log | ✅ |
| API Connect + Webhooks | ✅ |
| Midtrans Config | ✅ |
| Master Data | ✅ |

### 4G — Portal Agen (`/agent/*`)

| Halaman | URL | Status |
|---------|-----|--------|
| Dashboard | `/agent/dashboard` | ✅ |
| Booking | `/agent/bookings` | ✅ |
| Komisi | `/agent/commissions` | ✅ |
| CRM Pipeline | `/agent/crm` | ✅ |

### 4H — Portal Cabang (`/cabang/*`)

| Halaman | URL | Status |
|---------|-----|--------|
| Dashboard | `/cabang/dashboard` | ✅ |
| Agen Binaan | `/cabang/agen` | ✅ |
| Booking | `/cabang/bookings` | ✅ |
| Target KPI Cabang | `/cabang/kpi-targets` | ✅ |
| Website Cabang Settings | `/cabang/website` | ✅ |

### 4I — Portal Muthawif (`/muthawif/*`)

| Halaman | URL | Status |
|---------|-----|--------|
| Dashboard | `/muthawif/dashboard` | ✅ |
| Laporan Harian | `/muthawif/laporan-harian` | ✅ |
| Panel SOS | `/muthawif/sos` | ✅ |

---

## BAGIAN 5 — RIWAYAT SESI PENGEMBANGAN

### Sesi Awal — Core System

- ✅ pnpm monorepo setup, Supabase integration, RBAC dasar
- ✅ Public portal: landing, packages, departures, blog, FAQ, testimonials
- ✅ Fitur Islami: sholat, Al-Quran, kiblat, cuaca, tasbih
- ✅ Customer portal: booking, payment, tabungan, loyalitas
- ✅ Portal admin: booking management, packages, departures, keuangan dasar

### Sesi Fase 1–5 Jamaah Portal

- ✅ Chat jamaah, rombongan, galeri, zakat, payment timeline
- ✅ QR check-in, bagasi, kontrak PDF, cuaca widget di jamaah portal
- ✅ Badges/gamifikasi, sertifikat, SISKOHAT, chatbot, ringkasan AI

### Sesi — E-Commerce Toko

- ✅ SQL migration: store_categories, store_products, store_orders, store_shipments
- ✅ Admin: Dashboard Toko, Produk, Pesanan+Resi, Kategori
- ✅ Customer: Listing, Checkout, Daftar Pesanan, Detail + Upload Bukti
- ✅ 4 template WA: order confirmed/shipped/delivered/awaiting payment
- ✅ Notifikasi admin otomatis saat jamaah upload bukti bayar

### Sesi — Enhancement Booking Detail

- ✅ Alokasi tipe kamar per jamaah (RoomTypeAssignmentDialog)
- ✅ Ringkasan pembayaran rinci sidebar (per tipe kamar, progress bar)
- ✅ Timeline aktivitas dari `booking_status_history` (data nyata)
- ✅ Alert jika jumlah jamaah < total_pax
- ✅ Panel info agen & cabang di sidebar
- ✅ Checklist dokumen per jamaah (KTP/Passport/Foto, skor 0-3)
- ✅ Dialog konfirmasi refund saat status → Cancelled
- ✅ Klik WhatsApp langsung + salin kode booking

### Sesi — RBAC & Security Improvements

- ✅ Tambah role `jamaah` + `sub_agent` ke AppRole type
- ✅ Perbaikan `isStaff()` — agent bukan lagi staf internal
- ✅ CustomerRoutes hanya bisa akses `customer`, `jamaah`, `super_admin`
- ✅ Login redirect berbasis role (admin/agent/jamaah masing-masing ke portal sendiri)
- ✅ AccessDenied page kontekstual + tombol "Ke Portal Saya"
- ✅ Hook baru: `useCanAccess`, `useRoleHomeRoute`
- ✅ SQL migration: enum jamaah/sub_agent, RLS policy absensi

### Sesi — Integrasi Gap Fix

- ✅ AdminSentimenFeedback: ganti tabel `feedback` → `testimonials`
- ✅ Verifikasi dokumen: notify jamaah saat verify/reject
- ✅ Upload dokumen jamaah: notify admin
- ✅ JamaahChecklist: persistent ke Supabase + localStorage fallback
- ✅ Nomor kamar tampil di portal jamaah
- ✅ Migration fase21: customer_notifications, jamaah_checklist, attendance, feedback, visa_status_logs, room_occupants

### Sesi — Monitor Refund & Activity Log

- ✅ Monitor Refund `/admin/refunds` — daftar, filter, update status, export Excel
- ✅ Detail Refund `/admin/refunds/:id` — data lengkap, timeline, panel aksi
- ✅ Activity Log `/admin/activity-log` — riwayat semua perubahan, filter, export
- ✅ Auto-log refund created + booking cancelled dengan metadata lengkap

### Sesi — Navigation & PWA Enhancement

- ✅ Merge PLAN.md + RENCANA.md → satu file
- ✅ Menu mega dropdown di header navbar
- ✅ PWA standalone mode detection — layout berbeda saat diinstall
- ✅ Upload ikon PWA dari panel admin
- ✅ Admin dapat atur tampilan PWA (warna, ikon, splash) secara dinamis
- ✅ Fix workflows Replit — app berjalan stabil

### Sesi — Fix AdminBookingDetail (Agent FK)

- ✅ Bug fix: Supabase JOIN error karena tidak ada FK constraint `bookings → agents`
- ✅ Solusi: fetch agent terpisah via `.from('agents').eq('id', agent_id).maybeSingle()`
- ✅ Bug fix: airport FK hint syntax dari constraint name form → kolom name form

### Sesi — Sprint 2 & 3: Paket + Keberangkatan Enhancement

- ✅ **P1** — `PackageGalleryCard`: upload foto/galeri paket dengan drag-drop, multi-upload, preview fullscreen, urutan geser kiri/kanan, hapus + konfirmasi, caption editable. Storage bucket `trip-photos`, tabel `media_gallery`.
- ✅ **P5** — Kartu "Kapasitas Aggregat" di `AdminPackageDetail`: total jamaah, total kuota, % terisi, breakdown jadwal buka/penuh/berangkat, progress bar.
- ✅ **K5** — Post-trip summary card di `AdminDepartureDetail` (tab Info): muncul otomatis saat status `departed`. Menampilkan jamaah berangkat, tidak berangkat, % kehadiran, breakdown adult/child/infant, ringkasan naratif trip.
- ✅ **K6** — "Kirim via Email" di dropdown Export manifest: dialog input email + nama penerima, build HTML table manifest on-the-fly, kirim via `POST /api/email/send` (custom template). Tidak perlu endpoint baru.
- ✅ **K8** — Card "Notifikasi H-X Keberangkatan" di tab Info: menampilkan H- saat ini + jumlah jamaah ber-WA. Tombol "Kirim H-7/H-3/H-1 Blast" → loop per jamaah ke `POST /api/whatsapp/notification` dengan template `departure_reminder`.

---

## BAGIAN 6 — BACKLOG & RENCANA PENGEMBANGAN

### 6A — Kelola Paket (`/admin/packages`) — Backlog

#### Yang Sudah Ada ✅
- CRUD paket + tipe paket
- Toggle aktif/featured + bulk actions
- Export Excel/PDF (5 format berbeda)
- Warning alerts: kuota menipis, paket aktif tanpa jadwal
- Download manifest dari daftar
- Analytics + statistik kapasitas + kalender
- PackageDetail admin: link/unlink keberangkatan, MilestoneTrackerCard, BreakEvenIndicatorCard, EquipmentReadinessCard
- **Aturan pembatalan (Syarat & Ketentuan)** — `cancellation_policies` tabel sudah ada, `PackageCancellationPolicyCard` di admin sudah mendukung per-paket + global fallback
- **Itinerary per tanggal keberangkatan** — arsitektur sudah benar: `departure_itineraries` table, setiap departure punya itinerary sendiri via `LinkItineraryForm` di AdminDepartureDetail
- **Tombol "Lihat di Website"** — ditambahkan di header AdminPackageDetail ✅
- **Tombol Duplikat Paket** — ditambahkan di dropdown menu daftar paket ✅
- **Galeri foto paket (P1)** — `PackageGalleryCard`: drag-drop, multi-upload, preview fullscreen, urutan, hapus, caption ✅
- **Kapasitas aggregat (P5)** — card di AdminPackageDetail: total jamaah, total kuota, % terisi, breakdown status ✅

#### Yang Sudah Selesai (Semua Sesi)

| ID | Fitur | Status |
|----|-------|--------|
| F1 | **Syarat & Ketentuan di halaman publik** — tab baru di `/packages/:slug` yang query per-paket dulu, fallback ke global | ✅ |
| F2 | **Itinerary tab dengan departure selector** — tab itinerary di frontend kini menampilkan picker tanggal keberangkatan & auto-load itinerary per departure | ✅ |
| P2 | **Duplikat Paket** — tombol di dropdown menu AdminPackages, copy semua field + " - Salinan" suffix | ✅ |
| P3 | **Tombol "Lihat di Website"** di AdminPackageDetail header | ✅ |
| P1 | **Upload foto/galeri paket** — `PackageGalleryCard` dengan drag-drop, multi-upload, urutan, preview, hapus, caption | ✅ |
| P5 | **Total kapasitas aggregat** — card di AdminPackageDetail: total jamaah, total kuota, % terisi, breakdown status keberangkatan + progress bar | ✅ |

#### Yang Sudah Selesai (Semua Sesi)

| ID | Fitur | Status |
|----|-------|--------|
| F1 | **Syarat & Ketentuan di halaman publik** | ✅ |
| F2 | **Itinerary tab dengan departure selector** | ✅ |
| P1 | **Upload foto/galeri paket** | ✅ |
| P2 | **Duplikat Paket** | ✅ |
| P3 | **Tombol "Lihat di Website"** | ✅ |
| P4 | **Riwayat perubahan harga** — `PackagePriceAuditCard` audit trail per departure lintas paket, dengan diff harga, oleh siapa, keterangan | ✅ |
| P5 | **Total kapasitas aggregat** | ✅ |
| P7 | **Salin itinerary antar paket** — tombol "Duplikasi" sudah ada di `AdminItineraryTemplates` via `duplicateMutation`, salin seluruh hari + aktivitas ke template baru dengan suffix "(Copy)" | ✅ |

#### Yang Masih Kurang (Backlog)

| ID | Fitur | Dampak | Prioritas Sprint 8 |
|----|-------|--------|---------------------|
| P6 | **Tag/label kustom** — selain `is_featured`, admin perlu label "Best Seller", "Early Bird", "Flash Sale" di kartu & list paket | Rendah | 🟡 P3 — butuh kolom baru di tabel packages |

#### Catatan Arsitektur Penting

> **Itinerary**: Setiap paket TIDAK memiliki itinerary sendiri. Setiap **tanggal keberangkatan** (`departures`) punya itinerary-nya sendiri via tabel `departure_itineraries` yang merujuk ke `itinerary_templates`. Admin set itinerary per departure di `/admin/departures/:id` tab Itinerary.

> **Syarat & Ketentuan**: Dikelola via tabel `cancellation_policies`. Setiap paket bisa punya aturan sendiri (`package_id`). Jika tidak ada, otomatis fallback ke policy `is_global = true`. Di frontend publik, tab "Syarat & Ketentuan" menampilkan ini secara otomatis.

---

### 6B — Kelola Keberangkatan (`/admin/departures`) — Backlog

#### Yang Sudah Ada ✅
- List + Calendar view, filter, pagination
- Stats (total, linked, open, booked), sinkronisasi kuota
- DepartureDetail: info lengkap, list penumpang (multi-step query + virtual fallback)
- Export manifest PDF (dengan QR) + Excel
- QR check-in dialog
- Attendance tracking real-time via Supabase Realtime
- DepartureRoomingTab (pembagian kamar)
- DepartureBudgetTab (anggaran trip)
- EquipmentRealizationTab (perlengkapan)
- Link itinerary template
- Departure Tracking page (live: boarding/departed/arrived/delayed)
- WA Blast Keberangkatan
- Laporan Keberangkatan (grouped by departure + export)
- **Ringkasan status visa (K1)** — `DepartureVisaSummary` di tab Info ✅
- **Pre-Departure Checklist (K2)** — tab Checklist operasional admin ✅
- **Search jamaah (K3)** — kolom search nama/paspor/telepon/kode booking ✅
- **Quick status change (K4)** — tombol `open→closed→full→departed` di header ✅
- **Post-trip summary (K5)** — card ringkasan muncul otomatis saat `departed` ✅
- **Kirim manifest via email (K6)** — dialog "Kirim via Email" di dropdown Export ✅
- **Notifikasi H-X (K8)** — card blast H-7/H-3/H-1 ke seluruh jamaah via WA ✅

#### Yang Sudah Selesai (Semua Sesi)

| ID | Fitur | Status |
|----|-------|--------|
| K1 | **Ringkasan status visa** — `DepartureVisaSummary` panel di tab Info | ✅ |
| K2 | **Pre-Departure Checklist** — tab Checklist operasional lengkap | ✅ |
| K3 | **Search jamaah** — search real-time nama/paspor/telepon/kode booking | ✅ |
| K4 | **Quick status change** — tombol ubah status langsung di header | ✅ |
| K5 | **Post-trip summary** — card kehadiran, % hadir, breakdown pax, naratif trip | ✅ |
| K6 | **Kirim manifest ke email** — dialog email, HTML table manifest, kirim via API | ✅ |
| K8 | **Notifikasi H-7/H-3/H-1** — card blast WA per jamaah, tampil H- saat ini | ✅ |

#### Yang Masih Kurang (Backlog)

| ID | Fitur | Dampak | Prioritas Sprint 8 |
|----|-------|--------|---------------------|
| K9 | **Ringkasan anggaran di tab header** — `DepartureBudgetTab` sudah punya `totalBudgeted` & `totalRealized`, tapi tidak muncul di label tab. Tampilkan ringkasan mini (budget vs realisasi) di trigger tab "Budget" | Sedang | ✅ Selesai Sprint 14 |
| K7 | **Generate sertifikat massal** — tombol 1 klik generate + download sertifikat PDF untuk semua jamaah setelah departure status = `departed` | Rendah | ✅ Selesai Sprint 14 — `DepartureCertificateGenerator.tsx` |

---

### 6C — Booking & Pembayaran — Backlog

#### Yang Sudah Ada ✅ (dari analisis sebelumnya)
- Semua fitur di Bagian 5 (A–D yang sudah ✅)

#### Yang Masih Perlu Diperhatikan

| ID | Fitur | Status |
|----|-------|--------|
| F1 | **Midtrans payment gateway terintegrasi** — halaman Midtrans Config ada, flow QRIS sudah dibangun (Sprint 6). Belum bisa ditest end-to-end tanpa kredensial aktif | ⚠️ Perlu test — set `MIDTRANS_SERVER_KEY` + `MIDTRANS_CLIENT_KEY` dulu |
| F2 | **Cicilan otomatis** — reminder cicilan sudah ada tapi belum ada generator jadwal cicilan dari booking | ✅ |
| F3 | **Laporan piutang per booking** — `AdminFinanceAR.tsx` sudah query tabel `bookings` langsung: `total_price`, `paid_amount`, `payment_status`, hitung outstanding per booking, filter search + status | ✅ Sudah terhubung ke data aktual |

---

### 6D — Portal Jamaah — Backlog

| ID | Fitur | Prioritas Sprint 8 |
|----|-------|---------------------|
| J1 | **Ringkasan AI sungguhan** — `/jamaah/ringkasan-ai` integrasi Gemini/OpenAI dengan fallback cerdas berbasis data booking | ✅ |
| J2 | **Push notification di iOS** — PWA iOS baru support push notification sejak iOS 16.4. Perlu test di device | ⚠️ Perlu test user — bukan kode |
| J3 | **Offline mode dokumen & visa tracker** — `JamaahDocuments` dan `JamaahVisaTracker` masih online-only. Tambahkan cache `localStorage` + banner offline saat tidak ada koneksi, data tetap terbaca dari cache terakhir | ✅ Selesai Sprint 14 |
| J4 | **Deep link dari WA** — ketika jamaah klik link WA, redirect langsung ke halaman yang relevan di portal | ✅ |

---

### 6E — Fitur Baru yang Belum Ada

| ID | Fitur | Modul | Prioritas |
|----|-------|-------|-----------|
| N1 | **Prediksi isi kursi** (`/admin/prediksi-seat`) | Admin | ✅ |
| N2 | **Integrasi SISKOHAT Kemenag** — sinkronisasi data jamaah haji ke sistem resmi | Admin | ✅ |
| N3 | **Portal Pelaporan Muthawif** — laporan harian per lokasi (Mekah/Madinah/Jeddah) dengan foto | Muthawif | ✅ |
| N4 | **Dashboard KPI Cabang** — target monthly vs aktual per KPI: booking, revenue, konversi lead | Cabang | ✅ |
| N5 | **Penilaian jamaah oleh muthawif** — muthawif bisa input catatan per jamaah selama perjalanan | Muthawif | ✅ |
| N6 | **Rate card & proposal otomatis** — admin bisa generate PDF proposal harga per paket untuk calon jamaah | Admin | ✅ |
| N7 | **Integrasi Qris** — pembayaran via Qris langsung dari halaman booking | Pembayaran | ✅ |
| N8 | **Multi-bahasa (i18n)** — halaman publik + jamaah portal dalam Bahasa Arab & Inggris | Public | 🔴 |
| N9 | **Sistem Aturan Pembatalan Lengkap** — lihat BAGIAN 14 untuk rencana detail | Admin/Booking/Dokumen | ✅ |

---

## BAGIAN 7 — URUTAN PRIORITAS PENGERJAAN BERIKUTNYA

Berdasarkan dampak operasional langsung, inilah urutan yang direkomendasikan:

### Sprint 1 — Operasional Keberangkatan (Dampak Langsung Tinggi) ✅ SELESAI

```
1. K3  → Search nama jamaah di DepartureDetail ✅
2. K2  → Pre-Departure Checklist (checklist operasional admin) ✅
3. K1  → Ringkasan status visa per keberangkatan ✅
4. K4  → Quick status change button di header keberangkatan ✅
```

### Sprint 2 — Kelola Paket (Konten & Data) ✅ SELESAI

```
5. P1  → Upload foto/galeri paket ✅
6. P2  → Duplikat paket (1 klik salin paket) ✅
7. P5  → Total kapasitas aggregat di PackageDetail ✅
```

### Sprint 3 — Laporan & Follow-up Keberangkatan ✅ SELESAI

```
8.  K5  → Post-trip summary setelah departed ✅
9.  K6  → Kirim manifest ke email (muthawif/PIC) ✅
10. K8  → Notifikasi H-X terjadwal ✅
```

### Sprint 4 — Peningkatan Portal & Integrasi ✅

```
11. J1  → Ringkasan AI berbasis data aktual (bukan template) ✅
12. F2  → Generator jadwal cicilan otomatis ✅
13. N6  → Rate card & proposal PDF otomatis ✅
14. N2  → Integrasi SISKOHAT Kemenag — Import CSV + Print Kartu ✅
```

### Sprint 5 — Penilaian Jamaah & Deep Link WA ✅

```
15. N5  → Halaman Penilaian Jamaah oleh Muthawif (/muthawif/penilaian)
           - Rating bintang 1–5 per jamaah
           - Catatan teks + kategori (umum/ibadah/kesehatan/disiplin/sosial)
           - Simpan ke tabel baru muthawif_jamaah_evaluations
           - Tombol "Penilaian Jamaah" di MuthawifDashboard quick actions
           - SQL migration: fase22_muthawif_evaluations.sql ✅
16. J4  → Deep link portal di semua template WA
           - Tambah {link_portal} opsional ke template: BOOKING_CONFIRM,
             PAYMENT_CONFIRM, PAYMENT_LUNAS, DOCUMENT_READY, DEPARTURE_REMINDER
           - Tambah getPortalUrl(path) helper di whatsapp-notifier.ts
           - renderTemplate diupdate: baris tak terselesaikan dihapus otomatis ✅
```

### Sprint 7 — P4 Riwayat Harga & Fix Status ✅

```
18. P4  → PackagePriceAuditCard di AdminPackageDetail
           - Tabel audit trail semua perubahan harga departure lintas paket
           - Kolom: waktu, tanggal keberangkatan, quad/triple/double/single, diff harga, oleh siapa, keterangan
           - Search filter, collapse toggle, graceful state jika tabel belum ada (+ tombol SQL setup)
           - Fix inkonsistensi RENCANA.md: GAP 1/2/3 di tabel 14E, N9, F2, J1, N9 diupdate ke ✅
    Audit backlog:
        - F3 ternyata sudah ✅ (AdminFinanceAR sudah query bookings aktual)
        - P7 ternyata sudah ✅ (AdminItineraryTemplates sudah ada duplicateMutation)
```

---

### Sprint 8 — Fitur Sisa & Polish ✅ SELESAI

> Semua item P1–P3 sudah dikerjakan. Catatan implementasi di bawah.

```
PRIORITAS 1 ✅ SELESAI
──────────────────────
19. K9  ✅ Ringkasan anggaran di tab trigger "Budget" di AdminDepartureDetail
           - Integrasi useDepartureBudget + useDepartureCosts + computeBudgetSummary
           - Tampil "formatCurrency(totalRealized) / formatCurrency(totalBudgeted)" pada tab
           - File: AdminDepartureDetail.tsx

PRIORITAS 2 ✅ SELESAI
──────────────────────
20. J3  ✅ Offline cache untuk JamaahDocuments & JamaahVisaTracker
           - Hook baru: useOfflineCache<T> + useOnlineStatus (localStorage)
           - Komponen OfflineBanner muncul saat navigator.onLine === false
           - Query dibungkus useOfflineCache → fallback ke cache jika offline
           - Files: hooks/useOfflineCache.ts, components/OfflineBanner.tsx,
             JamaahDocuments.tsx, JamaahVisaTracker.tsx

21. K7  ✅ Generate sertifikat massal di DepartureDetail
           - Komponen baru: DepartureCertificateGenerator (loop jamaah → JSZip → download)
           - Hanya tampil saat departure.status === 'departed'
           - Format sertifikat: CERT/YYYY/DEP-ID-INDEX, pakai useCompanyInfo
           - Files: components/departure/DepartureCertificateGenerator.tsx,
             AdminDepartureDetail.tsx

PRIORITAS 3 ✅ SELESAI (dengan migrasi DB lebih kaya dari rencana awal)
──────────────────────────────────────────────────────────────────────
22. P6  ✅ Tag/label kustom paket (Best Seller, Early Bird, Flash Sale, dll)
           - Migrasi: tabel package_labels (master per branch / global) +
             package_label_assignments (M:N ke packages), bukan kolom tunggal.
             Lebih fleksibel: admin bisa CRUD label kustom + warna sendiri.
           - 5 label default global di-seed: Best Seller, Early Bird,
             Flash Sale, Baru, Terbatas.
           - Hook usePackageLabels (list, map, assign, upsert, delete)
           - Komponen: PackageLabelBadges, PackageLabelManagerDialog,
             PackageLabelAssignDialog
           - Tombol "Kelola Label" di header AdminPackages + item
             "Atur Label" di dropdown per paket
           - Badge tampil di PackageCard (publik) via usePackageLabelsMap
           - Files: hooks/usePackageLabels.ts,
             components/packages/PackageLabelBadges.tsx,
             components/admin/packages/PackageLabelManagerDialog.tsx,
             components/admin/packages/PackageLabelAssignDialog.tsx,
             pages/admin/AdminPackages.tsx,
             components/packages/PackageCard.tsx

TIDAK DIPRIORITASKAN (terlalu besar / butuh tindakan user):
────────────────────────────────────────────────────────────
N8  → Multi-bahasa (i18n) — 🔴 SANGAT BESAR. Butuh 200+ file diubah.
       Perlu diskusi dulu sebelum mulai. Belum direncanakan detail.
F1  → Test Midtrans end-to-end — ⚠️ Bukan kode, butuh user set MIDTRANS_SERVER_KEY aktif
J2  → Test push iOS — ⚠️ Bukan kode, butuh user test di device iOS 16.4+
```

### Sprint 6 — Integrasi QRIS Midtrans ✅

```
17. N7  → Integrasi QRIS langsung dari halaman jamaah (/jamaah/payment)
           Backend (api-server/src/routes/midtrans.ts):
           - POST /api/midtrans/create-qris  → Midtrans Core API /v2/charge
             payload: payment_type=qris, qris.acquirer=gopay
             response: transaction_id, order_id, qr_code_url, qr_string, expiry_time
           - GET  /api/midtrans/qris-status/:orderId → Midtrans Core API /v2/{id}/status
             response: transaction_status, fraud_status, settlement_time

           Frontend (lib/paymentGateway.ts):
           - createQrisPayment(payload)  — call POST /create-qris
           - checkQrisStatus(orderId)    — call GET /qris-status/:orderId
           - isQrisPaid(status)         — cek settlement/capture
           - isQrisExpired(status)      — cek expire/cancel/deny
           - getQrisSecondsLeft(expiry) — hitung countdown dari expiry_time WIB

           Frontend (pages/jamaah/JamaahPayment.tsx):
           - Step flow baru: form → confirm → generating-qr → showing-qr → qris-paid
           - QrisDisplay component: tampil QR image + countdown timer + auto-poll 5 detik
           - QrisCountdown component: timer mundur warna-adaptif (hijau→kuning→merah)
           - Pada settlement: insert ke payments table status=paid (OTOMATIS, tanpa admin)
           - Pada expire: tampil halaman expired + tombol "Buat QR Baru"
           - Fallback: jika Midtrans belum dikonfigurasi → error toast jelas

           Admin (pages/admin/AdminPayments.tsx):
           - Komponen PaymentMethodBadge: badge berwarna per metode
             (QRIS=ungu, VA BCA=biru, Mandiri=kuning, BNI=oranye, GoPay=hijau, dll.)

           Database:
           - SQL migration: fase23_payments_transaction_id.sql ✅
             ALTER TABLE payments ADD COLUMN transaction_id TEXT
             ALTER TABLE payments ADD COLUMN payment_type TEXT
```

---

## BAGIAN 8 — DATABASE MIGRATIONS (Urutan Eksekusi)

Jalankan berurutan di **Supabase Dashboard → SQL Editor**:

| # | File | Isi |
|---|------|-----|
| 1 | `migrations/fase1-membership-branch-commission.sql` | Tabel dasar |
| 2 | `migrations/fase2-public-website.sql` | Blog, testimonials |
| 3 | `migrations/fase3-customer-portal.sql` | Tabungan, loyalty |
| 4 | `migrations/fase4-6-analytics-notif-operational.sql` | Analytics, notifikasi |
| 5 | `migrations/whatsapp-tables.sql` | WhatsApp config |
| 6 | `migrations/dashboard-access-config.sql` | Akses dashboard per role |
| 7 | `migrations/hr-enhancements.sql` | SDM/HR |
| 8 | `migrations/operational-integration.sql` | Rooming, manifest |
| 9–13 | Migrations lanjutan... | Lihat folder `migrations/` |
| 14 | `supabase/migrations/consolidated_fase_13_14_15.sql` | Leads, manasik, reviews |
| 15 | `supabase/migrations/fase16_new_tables.sql` | SOS, visa, approvals |
| 16 | `supabase/migrations/fase17_remaining_tables.sql` | Vendor, training, media |
| 17 | `supabase/migrations/fase18_core_settings.sql` | company_settings, bank_accounts |
| 18 | `supabase/migrations/fase19_branch_kpi_targets.sql` | branch_monthly_targets |
| 19* | `supabase/migrations/fase20_chat_bubble_color.sql` | Tambah kolom `chat_bubble_color` di website_settings |
| 19 | `supabase/migrations/fase20_webhooks_push.sql` | webhooks, push subscriptions |
| 20 | `supabase/migrations/store_ecommerce.sql` | toko e-commerce |
| 21 | `supabase/migrations/store_product_reviews.sql` | review produk |
| 22 | `supabase/migrations/fase21_integration_fixes.sql` | customer_notifications, jamaah_checklist, attendance, feedback, visa_status_logs, room_occupants + kolom baru |
| 23 | `supabase/migrations/fase22_muthawif_evaluations.sql` | muthawif_jamaah_evaluations — penilaian jamaah oleh muthawif (rating, catatan, kategori) |
| 24 | `supabase/migrations/fase23_payments_transaction_id.sql` | Tambah kolom transaction_id dan payment_type di tabel payments |

---

## BAGIAN 9 — AKSI YANG MASIH MENUNGGU USER

| Prioritas | Item | Catatan |
|-----------|------|---------|
| ⚠️ P1 | Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` | Auth & data tidak aktif tanpa ini |
| ⚠️ P2 | Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | API server butuh ini |
| ⚠️ P3 | Jalankan SQL migrations (Bagian 8) ke Supabase | Manual di Supabase SQL Editor |
| ⚠️ P4 | Generate VAPID keys: `npx web-push generate-vapid-keys` | Untuk browser push |
| ⚠️ P5 | Set SMTP credentials | Opsional, untuk email |
| ⚠️ P6 | Set Midtrans keys | Opsional, untuk pembayaran online |

---

## BAGIAN 10 — STRUKTUR FILE PENTING

```
artifacts/
  umrah-haji/src/
    pages/
      admin/          — 121 halaman admin
      public/         — halaman publik + jamaah-info
      jamaah/         — 35+ halaman portal jamaah mobile
      customer/       — portal customer
      agent/          — portal agen
      cabang/         — portal cabang
      muthawif/       — portal muthawif
    components/
      admin/
        AdminBookingDetail.tsx          — halaman detail booking utama
        RoomTypeAssignmentDialog.tsx    — alokasi tipe kamar per jamaah
        ChangeRoomTypeDialog.tsx        — ubah tipe kamar global
        ChangePackageDialogV2.tsx       — pindah paket
        BulkPassengerExport.tsx         — manifest + export PDF/Excel
        ManagePaymentModal.tsx          — kelola pembayaran
        BookingDocumentActions.tsx      — generate surat
        BookingDocumentHistory.tsx      — riwayat dokumen dicetak
        MilestoneTrackerCard.tsx        — milestone paket
        BreakEvenIndicatorCard.tsx      — break-even paket
        EquipmentReadinessCard.tsx      — kesiapan perlengkapan
        departure/                      — komponen tab DepartureDetail
      layout/
        DynamicNavbar.tsx               — navbar dengan mega dropdown
        DynamicPublicLayout.tsx         — layout publik, aware PWA mode
    routes/
      AdminRoutes.tsx       — 126 routes /admin/*
      PublicRoutes.tsx      — semua route publik + /jamaah-info
      CustomerRoutes.tsx    — semua route /jamaah/* (dibatasi role)
      AgentRoutes.tsx       — /agent/*
      OperationalRoutes.tsx — /muthawif/*, /absensi
    hooks/
      useAuth.tsx               — auth + role helpers (isStaff, isAgent, isCustomer)
      useCanAccess.ts           — cek permission di level komponen
      useRoleHomeRoute.ts       — URL portal yang tepat per role
      useAdminNotifications.ts  — real-time notif (singleton)
      useAutoCommission.ts      — auto-hitung komisi saat confirmed
      usePWAMode.ts             — deteksi standalone PWA mode
      useDepartureBudget.ts     — anggaran keberangkatan
    lib/
      admin-menu-registry.ts        — daftar menu + grup + permission
      permissions.ts                — ROLE_HIERARCHY + ROLE_LABELS
      document-generator.ts         — generate invoice PDF
      transaction-form-generator.ts — generate form transaksi PDF
      export-utils.ts               — helper export Excel/PDF
      whatsapp-notifier.ts          — kirim WA otomatis

  api-server/src/
    routes/v1/             — kurs.ts, packages.ts, departures.ts, dll

supabase/
  migrations/              — 22+ file SQL migration berurutan
```

---

## BAGIAN 11 — API EKSTERNAL (Gratis, Tanpa API Key)

| Layanan | Digunakan untuk |
|---------|----------------|
| Aladhan API | Jadwal waktu sholat |
| api.alquran.cloud | Teks Al-Quran + audio murottal |
| Open-Meteo | Cuaca Mekah/Madinah/Jeddah |
| Nominatim (OSM) | Reverse geocoding nama kota |
| ExchangeRate-API | Kurs mata uang real-time |

---

## BAGIAN 12 — RENCANA PERBAIKAN CHATBOT

> Analisis dilakukan Mei 2026 berdasarkan pembacaan kode seluruh komponen chatbot.

### Arsitektur Chatbot Saat Ini

| Lapisan | Komponen | Keterangan |
|---|---|---|
| Backend | `artifacts/api-server/src/routes/v1/chatbot.ts` | Gemini → OpenAI → FAQ fallback |
| User — Jamaah | `artifacts/umrah-haji/src/pages/jamaah/JamaahChatbot.tsx` | Portal jamaah login, fitur lengkap |
| User — Publik | `artifacts/umrah-haji/src/components/home/FloatingChatBubble.tsx` | Widget floating, lead capture |
| Admin Stats | `artifacts/umrah-haji/src/pages/admin/AdminChatbotStats.tsx` | Grafik agregat |
| Admin Leads | `artifacts/umrah-haji/src/pages/admin/AdminChatLeads.tsx` | Manajemen lead |

### Kelemahan yang Ditemukan

| # | Masalah | Detail |
|---|---------|--------|
| 1 | **FAQ duplikat & tidak bisa diedit admin** | Hardcoded di `FloatingChatBubble.tsx` baris 20–31 DAN di backend `chatbot.ts` — dua sumber berbeda. Tidak ada UI admin untuk mengelola FAQ. |
| 2 | **Admin tidak bisa lihat isi percakapan** | Tabel `chatbot_logs` ada dengan kolom lengkap tapi `AdminChatbotStats` hanya grafik agregat. Tidak ada log viewer per pesan/sesi. |
| 3 | **Top Questions ambil data dari tabel salah** | `AdminChatbotStats` query dari `chat_leads.message` (pesan lead form) bukan dari `chatbot_logs.message` (pertanyaan sesungguhnya ke chatbot). |
| 4 | **Widget publik tidak ada rating** | `JamaahChatbot.tsx` punya 👍/👎 per pesan. `FloatingChatBubble.tsx` tidak punya sama sekali. |
| 5 | **Riwayat chat hanya di localStorage** | Ganti perangkat/browser → riwayat hilang. Padahal `chatbot_logs` sudah simpan `user_id`. |
| 6 | **Tidak ada deteksi pertanyaan tak terjawab** | Fallback generic tidak ditandai. Tidak ada notifikasi admin, tidak ada mekanisme handoff ke human agent. |
| 7 | **Konfigurasi tidak mendukung per-channel** | `gemini_chatbot_config` satu `systemPrompt` untuk semua. `JamaahChatbot` dan `FloatingChatBubble` butuh konteks berbeda. |
| 8 | **Stats tidak real-time** | `AdminChatbotStats` hanya load sekali. `AdminChatLeads` sudah realtime tapi stats tidak. |

### Rencana Perbaikan Chatbot (Berurutan Prioritas)

#### P1 — FAQ Manager di Admin Panel ✅ Selesai

Buat halaman admin baru `AdminFAQManager` — CRUD FAQ dari UI, simpan ke tabel `faq_knowledge_base` di Supabase. Backend dan widget keduanya baca dari sumber yang sama.

```sql
CREATE TABLE faq_knowledge_base (
  id         UUID    DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword    TEXT    NOT NULL,
  answer     TEXT    NOT NULL,
  category   TEXT,
  is_active  BOOLEAN DEFAULT true,
  sort_order INT     DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

File: buat `AdminFAQManager.tsx` · ubah `chatbot.ts` · ubah `FloatingChatBubble.tsx`

#### P2 — Log Viewer Percakapan di Admin Panel ✅ Selesai

Tab baru "Log Percakapan" — tabel `chatbot_logs` dengan filter channel/source/rating/tanggal, search full-text, expand row jawaban lengkap, realtime subscription.

File: buat `AdminChatLogs.tsx`

#### P3 — Perbaiki Data Source Top Questions ✅ Selesai

Ganti query `chat_leads.message` → `chatbot_logs.message` dengan `GROUP BY` per kata kunci.

File: ubah `AdminChatbotStats.tsx`

#### P4 — Rating di Widget Publik ✅ Selesai

Tambah tombol 👍/👎 di `FloatingChatBubble`. Backend kembalikan `logId` di response agar bisa dikirim ke `PATCH /api/v1/chatbot/rate`.

File: ubah `FloatingChatBubble.tsx` · ubah `chatbot.ts`

#### P5 — Riwayat Chat dari Server ✅ Selesai

Untuk jamaah login, load history dari `chatbot_logs` (filter `user_id = auth.uid()`) sebagai pengganti localStorage. Tombol "Riwayat" muncul di header JamaahChatbot untuk user yang sudah login.

File: ubah `JamaahChatbot.tsx`

#### P6 — Deteksi Pertanyaan Tak Terjawab ✅ Selesai

Flag `is_unanswered = true` di log ketika fallback generic. Badge counter di admin panel + filter "Tak Terjawab" di AdminChatLogs.

File: ubah `chatbot.ts` · ubah `AdminChatLogs.tsx` · tambah kolom DB (`supabase-migrations/phase6-chatbot-unanswered.sql`)

#### P7 — System Prompt Per-Channel ✅ Selesai

Extend `gemini_chatbot_config` dengan `channelPrompts.jamaah` dan `channelPrompts.widget`. Default prompts per channel tersedia di backend.

File: ubah `chatbot.ts`

#### P8 — Stats Realtime ✅ Selesai

Supabase realtime subscription di `AdminChatbotStats` untuk tabel `chatbot_logs`. Badge "Realtime aktif" muncul saat ada pesan baru.

File: ubah `AdminChatbotStats.tsx`

### Ringkasan Prioritas Chatbot

| # | Perbaikan | Dampak | Kompleksitas | Status |
|---|---|---|---|---|
| 1 | FAQ Manager admin | Tinggi | Sedang | ✅ Selesai |
| 2 | Log Viewer percakapan | Tinggi | Sedang | ✅ Selesai |
| 3 | Perbaiki Top Questions | Sedang | Rendah | ✅ Selesai |
| 4 | Rating di widget publik | Sedang | Rendah | ✅ Selesai |
| 5 | Riwayat dari server | Tinggi | Sedang | ✅ Selesai |
| 6 | Deteksi unanswered | Sedang | Rendah | ✅ Selesai |
| 7 | Prompt per-channel | Sedang | Rendah | ✅ Selesai |
| 8 | Stats realtime | Rendah | Rendah | ✅ Selesai |

---

## BAGIAN 13 — CATATAN BUG & SOLUSI YANG SUDAH DITEMUKAN

| Bug | Solusi | File |
|-----|--------|------|
| `bookings.agent_id` tidak ada FK ke `agents` → Supabase JOIN error | Fetch agent terpisah: `(supabase as any).from('agents').eq('id', agentId).maybeSingle()` | AdminBookingDetail.tsx |
| Airport FK hint salah (gunakan nama constraint) | Gunakan nama kolom: `airports!departure_airport_id` bukan `airports!departures_departure_airport_id_fkey` | AdminDepartures.tsx, AdminDepartureDetail.tsx |
| `remaining_amount` adalah generated column | Jangan masukkan ke INSERT/UPDATE, hanya baca | AdminBookingDetail.tsx |
| AdminSentimenFeedback membaca tabel `feedback` yang tidak ada | Ganti ke `testimonials`, field `content` → `comment` | AdminSentimenFeedback.tsx |
| booking_status_history timeline dibuat manual (hardcoded) | Sekarang baca dari tabel nyata `booking_status_history` | AdminBookingDetail.tsx |
| CustomerRoutes tidak ada role check — semua role bisa akses `/jamaah/*` | Batasi ke `customer`, `jamaah`, `super_admin` saja | CustomerRoutes.tsx |
| `sales` mewarisi `agent` di ROLE_HIERARCHY | Hapus inheritance — agent bukan staf internal | permissions.ts |

---

## BAGIAN 14 — RENCANA FITUR: SISTEM ATURAN PEMBATALAN LENGKAP

> **Status:** ✅ Selesai — GAP 1, GAP 2, & GAP 3 selesai; GAP 4 ditunda (low priority)
> **Referensi:** N9 di Backlog 6E

---

### 14A — Kondisi Saat Ini (Yang Sudah Ada)

Fondasi sistem aturan pembatalan sudah kuat. Jangan rebuild dari nol.

| Komponen | File | Status | Keterangan |
|----------|------|--------|------------|
| Tabel `cancellation_policies` | Supabase SQL | ✅ Ada | `id, name, is_global, package_id, sections (JSONB), created_at, updated_at` |
| Halaman master aturan | `AdminCancellationPolicies.tsx` | ✅ Ada | CRUD lengkap: buat, edit, hapus, duplikat, pratinjau PDF |
| Card per-paket | `PackageCancellationPolicyCard.tsx` | ✅ Ada | Assign/buat/edit/lepas aturan per paket di AdminPackageDetail |
| Tampilan di detail paket publik | `PackageDetail.tsx` | ✅ Ada | Section "Syarat & Ketentuan" dengan badge Global/Khusus |
| PDF form transaksi | `transaction-form-generator.ts` | ✅ Ada | Support `cancellationPolicy` di template, cetak di PDF |
| PDF di booking detail admin | `AdminBookingDetail.tsx` | ✅ Ada | Fetch kebijakan paket/global, inject ke PDF |
| PDF proposal | `AdminProposalGenerator.tsx` | ✅ Ada | Fetch & inject ke proposal PDF |

**Logika fallback yang sudah berjalan:**
```
Paket punya aturan sendiri?
  YES → pakai aturan paket (package_id = paket ini)
  NO  → pakai aturan global (is_global = true, urut created_at DESC, limit 1)
  NONE → bagian aturan tidak tampil di PDF
```

---

### 14B — Gap yang Perlu Dibangun

#### GAP 1 — Tampil di Modal Saat Booking ✅ Selesai

**Deskripsi:** Saat calon jamaah/customer di langkah terakhir BookingWizard (StepReview), tampilkan aturan pembatalan paket yang dipilih sebagai collapsible section. Ada checkbox "Saya telah membaca dan menyetujui syarat & ketentuan pembatalan" yang **wajib dicentang** sebelum tombol "Konfirmasi Booking" bisa diklik.

**File yang dimodifikasi:**
- `src/components/booking/steps/StepReviewDynamic.tsx` — tambah fetch policy + UI display + checkbox
- `src/hooks/useBookingWizardDynamic.ts` — tambah state `cancellationAgreed: boolean`
- `src/components/booking/BookingWizard.tsx` — pass `packageId` ke StepReview, block submit jika belum agree

**UI yang dibutuhkan:**
```
┌─────────────────────────────────────────────────────────┐
│ 📋 Syarat & Ketentuan Pembatalan                   [▼] │
│ ─────────────────────────────────────────────────────── │
│ PEMBATALAN:                                             │
│ • Pembatalan 30 hari sebelum → refund 100%             │
│ • Pembatalan 14-29 hari sebelum → refund 50%           │
│ • Pembatalan < 14 hari → tidak ada refund              │
│                                                         │
│ PINDAH PAKET / TANGGAL:                                 │
│ • Pindah paket dikenakan biaya administrasi Rp 250.000 │
│ ─────────────────────────────────────────────────────── │
│ ☐ Saya telah membaca dan menyetujui syarat &            │
│   ketentuan pembatalan di atas                         │
└─────────────────────────────────────────────────────────┘
```

**Catatan implementasi:**
- Fetch query key: `['cancellation-policy-for-booking', packageId]`
- Query: cari `package_id = packageId` dulu, fallback ke `is_global = true`
- Jika tidak ada policy sama sekali → tidak tampilkan section, izinkan booking tanpa checkbox
- Simpan `cancellationAgreed` di state wizard, cek sebelum submit booking
- Teks "Aturan Global" / "Aturan Khusus Paket Ini" badge sama seperti di PackageDetail

---

#### GAP 2 — Pilih Aturan Saat Membuat/Edit Paket ✅ Selesai

**Deskripsi:** Pada form pembuatan paket (`RegularPackageForm`, `SavingsPackageForm`), tambahkan field "Aturan Pembatalan" berupa dropdown/select. Admin bisa langsung memilih aturan yang akan dikaitkan ke paket ini saat membuat paket — tidak perlu buka AdminPackageDetail terpisah setelah paket dibuat.

**Alur saat ini (bermasalah):**
```
Buat paket → Simpan → Buka AdminPackageDetail → Scroll ke bawah → 
PackageCancellationPolicyCard → Pilih aturan/Buat baru
(2 langkah terpisah, admin sering lupa)
```

**Alur yang diinginkan:**
```
Buat paket → Isi form → Di bagian bawah form ada "Aturan Pembatalan" → 
Pilih dari dropdown / buat cepat → Simpan (semua sekaligus)
```

**File yang dimodifikasi:**
- `src/components/admin/forms/RegularPackageForm.tsx` — tambah field `cancellationPolicyId` di bagian bawah form "Pengaturan Lanjutan"
- `src/components/admin/forms/SavingsPackageForm.tsx` — sama

**Detail implementasi:**
```tsx
// Di bagian bawah form, setelah field harga/fasilitas:
<div>
  <Label>Aturan Pembatalan</Label>
  <Select value={form.cancellationPolicyId} onValueChange={...}>
    <SelectTrigger>
      <SelectValue placeholder="Pilih aturan atau gunakan aturan global..." />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="">Gunakan aturan global (otomatis)</SelectItem>
      {allPolicies.map(p => (
        <SelectItem key={p.id} value={p.id}>
          {p.name} {p.is_global ? "(Global)" : ""}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
  <p className="text-xs text-muted-foreground mt-1">
    Jika tidak dipilih, paket akan menggunakan aturan global yang berlaku.
  </p>
</div>
```

**Saat simpan paket:** setelah INSERT packages berhasil, jalankan UPDATE cancellation_policies SET package_id = newPackageId WHERE id = selectedPolicyId (jika dipilih). Query key: `cancellation-policies`.

---

#### GAP 3 — Pengaturan Dokumen Dinamis ✅ Selesai

**Deskripsi:** Admin bisa mengatur di dokumen mana saja aturan pembatalan muncul. Card "Aturan Pembatalan" dengan 5 toggle di `DocumentLayoutEditor.tsx`, disimpan ke `app_settings` key `doc_cancellation_display_settings`.

**Dokumen yang perlu dikontrol:**
| Dokumen | Variable Setting | Default |
|---------|-----------------|---------|
| Form Transaksi / Booking (`generateTransactionForm`) | `doc_show_cancellation_form_transaksi` | ✅ Ya |
| Invoice pembayaran (`generateInvoice`) | `doc_show_cancellation_invoice` | ❌ Tidak |
| Proposal penawaran (`AdminProposalGenerator`) | `doc_show_cancellation_proposal` | ✅ Ya |
| Surat perjanjian / kontrak | `doc_show_cancellation_kontrak` | ✅ Ya |
| Sertifikat keberangkatan | `doc_show_cancellation_sertifikat` | ❌ Tidak |

**Penyimpanan:** Setting ini simpan ke tabel `app_settings` (Supabase) dengan key `doc_cancellation_display_settings` berupa JSON:
```json
{
  "form_transaksi": true,
  "invoice": false,
  "proposal": true,
  "kontrak": true,
  "sertifikat": false
}
```

**File yang dimodifikasi:**
- `src/components/admin/appearance/DocumentLayoutEditor.tsx` — tambah tab/section "Aturan Pembatalan" dengan toggle per-dokumen
- `src/lib/transaction-form-generator.ts` — terima parameter `showCancellationPolicy: boolean`
- `src/pages/admin/AdminBookingDetail.tsx` — fetch setting sebelum generate PDF, pass ke template
- `src/pages/admin/AdminProposalGenerator.tsx` — sama

**UI yang dibutuhkan (di DocumentLayoutEditor):**
```
Tab baru: "Aturan Pembatalan"

Pengaturan tampilan aturan pembatalan pada dokumen:

[✅] Form Transaksi — tampilkan di halaman terakhir
[  ] Invoice Pembayaran  
[✅] Proposal Penawaran
[✅] Surat Kontrak / Perjanjian
[  ] Sertifikat Keberangkatan

[Simpan Pengaturan]
```

---

#### GAP 4 — Tipe Tier Persentase (Prioritas Rendah / Enhancement)

**Deskripsi:** Saat ini struktur `sections` di `cancellation_policies` adalah teks bebas (array of `{title, items[]}`). Ini sangat fleksibel tapi tidak terstruktur untuk kalkulasi otomatis. Enhancement opsional: tambah field `refund_tiers` berupa array tier dengan persentase.

**Struktur `refund_tiers` (JSONB, opsional):**
```json
[
  { "days_before_departure": 90, "refund_percentage": 100, "description": "Pembatalan > 90 hari" },
  { "days_before_departure": 60, "refund_percentage": 75, "description": "Pembatalan 60–89 hari" },
  { "days_before_departure": 30, "refund_percentage": 50, "description": "Pembatalan 30–59 hari" },
  { "days_before_departure": 14, "refund_percentage": 25, "description": "Pembatalan 14–29 hari" },
  { "days_before_departure": 0,  "refund_percentage": 0,  "description": "Pembatalan < 14 hari" }
]
```

**Jika diimplementasikan:**
- Di modal booking: tampilkan tabel tier yang lebih visual (hari → persentase)
- Di `AdminCancellationPolicies`: tab "Tier Persentase" di samping "Bagian Teks"
- Di `JamaahPayment` / `CustomerRefundStatus`: hitung otomatis estimasi refund berdasarkan tanggal keberangkatan

**Catatan:** Field ini opsional — `sections` teks tetap sebagai fallback dan untuk narasi detail. Implementasi tier hanya untuk visual yang lebih informatif.

---

### 14C — Perubahan Database (Migration SQL)

Jalankan di Supabase SQL Editor jika belum ada:

```sql
-- 1. Pastikan tabel cancellation_policies sudah ada (sesuai AdminCancellationPolicies.tsx)
CREATE TABLE IF NOT EXISTS cancellation_policies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  is_global   boolean NOT NULL DEFAULT false,
  package_id  uuid REFERENCES packages(id) ON DELETE SET NULL,
  sections    jsonb NOT NULL DEFAULT '[]',
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE cancellation_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff_all" ON cancellation_policies 
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Kolom refund_tiers (opsional, GAP 4)
ALTER TABLE cancellation_policies 
  ADD COLUMN IF NOT EXISTS refund_tiers jsonb DEFAULT '[]';

-- 3. Setting dokumen di app_settings (GAP 3)
-- Tidak butuh migration — disimpan di app_settings yang sudah ada
-- key: 'doc_cancellation_display_settings', value: JSON object
```

**Catatan FK penting:**
- `package_id` → `packages(id) ON DELETE SET NULL` sudah benar
- Jika sebuah paket dihapus, aturan pembatalan tetap ada (tidak ikut terhapus), `package_id` jadi NULL
- Aturan yang `package_id = NULL` dan `is_global = false` = "aturan yatim" → tampilkan warning di AdminCancellationPolicies

---

### 14D — Urutan Implementasi yang Direkomendasikan

```
Langkah 1 (GAP 1) — Booking modal: paling high-impact untuk customer/jamaah
  → Modifikasi: StepReviewDynamic.tsx + BookingWizard.tsx
  → Estimasi: ~2 jam pengerjaan

Langkah 2 (GAP 2) — Package form: mengurangi friction untuk admin
  → Modifikasi: RegularPackageForm.tsx + SavingsPackageForm.tsx
  → Estimasi: ~1 jam pengerjaan

Langkah 3 (GAP 3) — Document settings: kontrol dokumen mana yang mencetak aturan
  → Modifikasi: DocumentLayoutEditor.tsx + AdminBookingDetail.tsx + AdminProposalGenerator.tsx
  → Estimasi: ~2 jam pengerjaan

Langkah 4 (GAP 4) — Tier persentase: enhancement visual
  → Modifikasi: AdminCancellationPolicies.tsx + PackageCancellationPolicyCard.tsx
  → Estimasi: ~3 jam pengerjaan
```

---

### 14E — Ringkasan Titik Tampil Aturan Pembatalan

| Titik Tampil | Status | Gap | Siapa yang Melihat |
|--------------|--------|-----|-------------------|
| Halaman detail paket publik (`/packages/:id`) | ✅ Ada | — | Calon jamaah/customer |
| Modal konfirmasi saat booking (StepReview) | ✅ Ada | GAP 1 | Calon jamaah/customer |
| Form pembuatan/edit paket (admin) | ✅ Ada | GAP 2 | Admin |
| Halaman detail paket admin (AdminPackageDetail) | ✅ Ada | — | Admin |
| Halaman master aturan (AdminCancellationPolicies) | ✅ Ada | — | Admin |
| PDF Form Transaksi | ✅ Ada | — | Admin + dicetak ke jamaah |
| PDF Invoice | ✅ Ada (terkontrol via DocumentLayoutEditor) | GAP 3 | Admin + dicetak ke jamaah |
| PDF Proposal | ✅ Ada | — | Admin + calon jamaah |
| Pengaturan per-dokumen (DocumentLayoutEditor) | ✅ Ada | GAP 3 | Admin |

---

### 14F — Komponen yang Tidak Perlu Diubah

- `AdminCancellationPolicies.tsx` → sudah lengkap, tidak perlu modifikasi
- `PackageCancellationPolicyCard.tsx` → sudah lengkap di AdminPackageDetail
- `transaction-form-generator.ts` → hanya tambah parameter boolean untuk GAP 3
- `PackageDetail.tsx` (publik) → sudah tampil dengan baik
- Tabel `cancellation_policies` → tidak perlu schema change untuk GAP 1-3

---

## BAGIAN 15 — AUDIT MENYELURUH PANEL ADMIN (Analisis Kode Lengkap)

> Bagian ini adalah hasil audit mendalam terhadap **semua halaman admin** — membaca kode satu per satu, memeriksa tabel Supabase, route API, logika bisnis, dan kekurangan nyata.
> Tanggal audit: Mei 2026

---

### 15A — TEMUAN KRITIS (Harus Diperbaiki)

| ID | Masalah | Halaman | Dampak Nyata | Solusi |
|----|---------|---------|--------------|--------|
| **K-01** | **Virtual Account: mockup, bukan integrasi bank nyata** | `AdminVirtualAccount` | Nomor VA tidak valid, tidak bisa menerima transfer | Integrasikan Midtrans VA API (POST `/api/midtrans/create-va`) |
| **K-02** | **`/api/hr/verify-face` selalu return `verified: true`** | `AdminAbsensiDigital` | Absensi bisa dimanipulasi siapapun | Implementasi face-api.js atau AWS Rekognition |
| **K-03** | **Scheduled Reports tidak ada backend worker** | `AdminScheduledReports` | Laporan terjadwal tidak pernah terkirim | Tambah cron job di api-server (node-cron) |
| **K-04** | **Reminder pembayaran & follow-up harus diklik manual** | `AdminFollowUpReminder`, `AdminPembayaranReminder`, `AdminCicilanReminder` | Jika admin lupa buka halaman, tidak ada yang dikirimi | Buat auto-cron di api-server yang jalan setiap pagi |
| **K-05** | **View `v_financial_summary` mungkin belum dibuat** | `AdminAdvancedReports` | Halaman Advanced Reports crash/kosong | Buat SQL view di Supabase |
| **K-06** | **Tabel `approval_requests` mungkin belum ada** | `AdminApprovals` | Fitur persetujuan tidak berfungsi | Jalankan migration SQL tabel ini |
| **K-07** | **`booking_installment_schedules` mungkin belum ada** | `AdminCicilanGenerator` | Generator jadwal cicilan error | Tambah migration SQL tabel ini |
| **K-08** | **Setting reminder disimpan di `localStorage`** | `AdminCicilanReminder` | Setting tidak persisten lintas perangkat/browser | Pindah ke kolom di tabel `app_settings` |
| **K-09** | **DB trigger `update_booking_paid_amount` tidak ada di Drizzle** | `AdminPayments` | Jika trigger hilang, total booking tidak sinkron | Tambahkan trigger check di migration |
| **K-10** | **2FA hanya UI, tidak ada backend TOTP** | `Admin2FASettings` | 2FA tidak benar-benar melindungi akun | Implementasi speakeasy/otplib di api-server |

---

### 15B — AUDIT MODUL BOOKING & PEMBAYARAN

#### AdminBookings
- **Tabel:** `bookings`, `customers`, `departures`, `packages`, `branches`
- **Kekurangan:**
  - Filter by nama paket butuh 2 query terpisah → lambat di data besar (alternatif: gunakan join view di Supabase)
  - Bulk action terbatas: hanya update status, belum ada bulk kirim reminder / bulk cetak
- **Relasi:** Hub utama → Finance, CRM, Operasional
- **Status:** ⚠️ Fungsional tapi perlu optimasi query

#### AdminBookingCreate
- **Tabel:** `packages`, `branches`, `agents`, `departures`, `customers`, `booking_passengers`
- **RPC:** `generate_booking_code`
- **Kekurangan:**
  - Validasi slot di client → race condition bisa terjadi saat dua admin booking bersamaan di slot terakhir
  - Room type terbatas: hanya Quad/Triple/Double/Single — konfigurasi custom belum ada
- **Status:** ⚠️ Fungsional, perlu server-side lock untuk slot

#### AdminBookingDetail
- **Tabel:** `bookings`, `customers`, `departures`, `packages`, `airports`, `branches`, `agents`, `profiles`, `booking_passengers`, `payments`, `booking_status_history`, `customer_documents`, `customer_mahrams`, `refunds`, `bank_accounts`, `invoice_templates`, `cancellation_policies`
- **Kekurangan:**
  - Fetch agent dilakukan terpisah (tidak ada FK) → lihat Bagian 13
  - Join airports menggunakan hint kolom, bukan FK name → rawan salah jika kolom berganti nama
- **Status:** ✅ Paling lengkap, sudah punya fix di Bagian 13

#### AdminPayments
- **Tabel:** `payments`, `bookings`, `customers`, `savings_payments`, `customer_notifications`
- **API:** `POST /api/whatsapp/payment-reminder` ✅
- **Kekurangan:** Bergantung pada DB trigger `update_booking_paid_amount` — jika trigger hilang saat migration, total booking tidak sinkron
- **Status:** ⚠️ Fungsional, tapi ada dependency DB trigger yang rawan

#### AdminRefunds & AdminRefundDetail
- **Tabel:** `refunds`, `bookings`, `customers`, `customer_notifications`, `admin_activity_log`
- **Kekurangan:**
  - Ada pengecekan `42P01` (tabel tidak ada) di kode → tabel `refunds` mungkin belum ada di beberapa environment
  - Tidak ada integrasi ke bank/payment gateway — hanya marking administratif
- **Status:** ⚠️ Fungsional, perlu dipastikan tabel ada

#### AdminApprovals ⚠️ KRITIS
- **Tabel:** `approval_requests`
- **Kekurangan:** Tabel mungkin belum dibuat; Supabase Realtime digunakan — perlu dipastikan subscription aktif
- **Status:** 🔴 Bergantung migration SQL yang perlu dijalankan

#### AdminVirtualAccount ⚠️ KRITIS
- **Kekurangan:** Generasi VA adalah client-side hash + localStorage — bukan bank nyata
- **Status:** 🔴 Perlu integrasi Midtrans VA API

#### AdminCicilanGenerator
- **Tabel:** `bookings`, `booking_installment_schedules`
- **Kekurangan:** Tabel `booking_installment_schedules` mungkin belum ada; jadwal tidak terhubung ke sistem pembayaran
- **Status:** ⚠️ Perlu migration tabel

#### AdminCicilanReminder
- **Tabel:** `savings_plans`, `savings_payments`, `whatsapp_config`
- **Kekurangan:** Setting disimpan di localStorage (tidak persisten); harus diklik manual
- **Status:** ⚠️ Perlu pindah ke DB + cron otomatis

---

### 15C — AUDIT MODUL KEUANGAN & LAPORAN

| Halaman | Tabel Utama | Gap Kritis | Prioritas |
|---------|-------------|------------|-----------|
| AdminFinanceAP | `vendor_costs`, `vendors` | Tidak ada jurnal otomatis saat bayar vendor | 🟡 |
| AdminFinanceAR | `bookings`, `customers` | Integrasi reminder WA/Email parsial | 🟡 |
| AdminFinanceCash | `cash_transactions`, `salary_payments`, `employees` | Disbursement gaji ke bank belum ada | 🟡 |
| AdminFinancePL | `departures`, `packages`, `bookings`, `vendor_costs` | Overhead umum tidak dialokasikan ke P&L per departure | 🟡 |
| AdminFinanceTerpadu | `payments`, `cash_transactions`, `bookings` | Proyeksi pakai 1.05x rata-rata — tidak mempertimbangkan seasonalitas | 🟢 |
| AdminLaporanKeuangan | `bookings`, `savings_plans`, `payments` | Format export Odoo/SAP belum ada | 🟢 |
| AdminLaporanAgen | `agents`, `bookings`, `agent_commissions` | Komisi bertingkat by volume belum diotomasi | 🟡 |
| AdminLaporanKeberangkatan | `bookings`, `departures`, `customer_documents` | Tidak ada auto-warning dokumen tidak lengkap sebelum cut-off | 🟡 |
| AdminReports | `bookings`, `customers`, `departures`, `payments` | ✅ Sudah lengkap dengan export | 🟢 |
| **AdminAdvancedReports** | `v_financial_summary` (VIEW) | **View mungkin belum dibuat di DB** | 🔴 |
| **AdminScheduledReports** | `scheduled_reports`, `scheduled_report_logs` | **Tidak ada backend worker** | 🔴 |
| AdminAgentCommissionReport | `agent_commissions`, `agents`, `bookings` | Payout langsung via payment gateway belum ada | 🟡 |
| AdminBranchCommissions | `branch_commissions`, `branches` | Settlement antara cabang dan pusat belum ada di DB | 🟡 |

**Masalah Arsitektural Keuangan:**
- Kalkulasi P&L, AR Aging, Proyeksi dilakukan di frontend JS → lambat untuk dataset besar
- Solusi: Pindahkan ke Supabase RPC atau materialized view
- Audit log untuk edit data keuangan (ubah vendor cost, dll) belum ada

---

### 15D — AUDIT MODUL PELANGGAN & JAMAAH

#### AdminCustomers & AdminCustomerDetail
- **Tabel:** `customers`, `bookings`, `customer_documents`, `customer_mahrams`, `visa_applications`, `customer_notifications`, `savings_accounts`
- **Gap:** Filter by paket/departure menggunakan subquery terpisah → lambat untuk 10rb+ customer
- **Status:** ✅ Relatif lengkap

#### AdminUsers & AdminRoleManagement
- **Tabel:** `profiles`, `user_roles`, `branches`, `employees`, `permissions_list`, `role_permissions`
- **RPC:** `list_users_with_emails`, `delete_user_by_admin`, `reset_user_password_by_admin`, `set_user_password_by_admin`, `get_menu_access_summary`
- **Gap:** "Menu Sync" harus ditrigger manual untuk sinkronkan roles DB dengan kode menu
- **Status:** ✅ Fungsional, tapi RPC bergantung pada setup Supabase yang benar

#### AdminMuthawifs & AdminMuthawifDetail
- **Tabel:** `muthawifs`
- **Gap:** Penugasan ke departure dilakukan dari halaman departure, bukan dari sini
- **Status:** ✅ CRUD sederhana, fungsional

#### AdminManifestJamaah & AdminRoomAssignments
- **Tabel:** `booking_passengers`, `bookings`, `departures`, `customer_documents`, `customer_mahrams`
- **Gap:**
  - Ada fallback query jika join utama gagal → schema tidak stabil
  - Export PDF/Excel manifest besar bisa crash browser (client-side)
- **Status:** ⚠️ Perlu server-side export untuk manifest besar

#### Document Management (Verification, Expiry, Generator, Types)
- **Tabel:** `customer_documents`, `document_types`, `customers`, `bookings`
- **Gap:**
  - `AdminDocumentGenerator.tsx` adalah 1300+ baris — perlu dipecah jadi komponen modular
  - Expiry tracker bergantung `passport_expiry` harus terisi di tabel customers
- **Status:** ⚠️ Fungsional tapi file terlalu besar

#### AdminVisaManagement & AdminSISKOHAT
- **Tabel:** `visa_applications`, `visa_status_logs`, `siskohat_sync_logs`
- **Gap:**
  - Tabel log mungkin belum ada → ada pengecekan kode error di frontend
  - SISKOHAT: manual CSV, tidak ada integrasi API Kemenag
- **Status:** ⚠️ Fungsional untuk input manual

#### AdminSOSAlerts
- **Tabel:** `sos_alerts`
- **API:** `POST /api/push/sos` ✅ sudah terimplementasi di backend dengan fanout ke muthawif
- **Gap:** Tabel `sos_alerts` mungkin belum ada (perlu migration)
- **Status:** ⚠️ Backend siap, tabel mungkin belum ada

---

### 15E — AUDIT MODUL PAKET & KEBERANGKATAN

| Halaman | Status | Gap |
|---------|--------|-----|
| AdminPackages | ✅ Sangat lengkap | ✅ P6 selesai — tag/label kustom via tabel `package_labels` + `package_label_assignments` |
| AdminPackageDetail | ✅ Lengkap | — |
| AdminDepartures | ✅ Sangat lengkap | — |
| AdminDepartureDetail | ✅ Sangat lengkap | ✅ K9 selesai — ringkasan budget di tab + ✅ K7 sertifikat massal |
| AdminDepartureTracking | ✅ Fungsional | — |
| AdminHajiManagement | ⚠️ Fungsional | Tidak ada integrasi API Kemenag |
| AdminManasik | ✅ Fungsional | — |
| AdminRekomendasiPaket | ⚠️ Eksperimental | Heuristik hardcoded, bukan ML |
| AdminPrediksiSeat | ⚠️ Eksperimental | `historicalAvg = 78` hardcoded |
| AdminCancellationPolicies | ✅ Lengkap | — |
| AdminPackageTypes | ✅ Lengkap | — |
| AdminItineraryTemplates | ✅ Lengkap | Duplikasi sudah ada |

---

### 15F — AUDIT MODUL KOMUNIKASI & MARKETING

#### WhatsApp
- **Integrasi:** Fonnte API (bukan WhatsApp Business API resmi Meta)
- **Tabel:** `whatsapp_config`, `whatsapp_logs`
- **API Backend:** `POST /api/whatsapp/send`, `/notification`, `/payment-reminder` ✅
- **Gap:**
  - Tidak ada delivery tracking real-time (hanya success/fail saat kirim)
  - Fonnte bukan official WABA → risiko akun diblokir WhatsApp
  - WA Otomatis dan Blast Keberangkatan harus diklik manual
- **Solusi Jangka Panjang:** Migrasi ke Meta WhatsApp Business API atau Twilio

#### Push Notifications
- **Integrasi:** VAPID + Web Push
- **API Backend:** `/api/push/*` ✅ Semua route sudah ada dan lengkap
- **Tabel:** `customer_notifications`, `push_subscriptions` (ada di Drizzle ✅)
- **Gap:** Deep-linking mobile app belum sepenuhnya dipetakan ke route spesifik
- **Status:** ✅ Relatif lengkap

#### Email
- **Integrasi:** SMTP via Nodemailer
- **API Backend:** `POST /api/email/send` ✅
- **Gap:** Tidak ada tracking bounce/open email (send-and-forget)
- **Solusi:** Ganti ke Resend atau SendGrid untuk tracking

#### Chatbot & Leads
- **Status:** ✅ Sudah diaudit lengkap di Bagian 12 (semua 8 perbaikan selesai)

#### Reminder Otomasi ⚠️ KRITIS
- `AdminFollowUpReminder`: monitor `leads.follow_up_date` → harus diklik manual
- `AdminPembayaranReminder`: query `payment_deadline_reminders` → harus diklik manual
- `AdminCicilanReminder`: Fonnte + savings → harus diklik manual
- **Solusi:** Buat endpoint `POST /api/reminders/run` + cron job setiap pagi jam 08:00

#### Marketing & Konten
| Halaman | Status | Gap |
|---------|--------|-----|
| AdminMarketingMaterials | ⚠️ | Upload file hanya input URL teks, tidak ada upload ke storage |
| AdminBlog | ✅ | — |
| AdminBanners | ✅ | Supabase Storage terintegrasi |
| AdminFAQManager | ✅ | Terhubung ke chatbot |
| AdminAnnouncements | ✅ | — |
| AdminLandingPages + Editor | ✅ | — |

---

### 15G — AUDIT MODUL SISTEM & PENGATURAN

| Halaman | Status | Gap Kritis |
|---------|--------|------------|
| AdminSettings | ✅ | — |
| AdminAppearance | ✅ | — |
| AdminGeminiAI | ⚠️ | API key Gemini disimpan di DB → pindah ke env var server-side |
| AdminAISummary | ✅ | Demo mode jika data kosong |
| AdminKPIDashboard | ✅ | — |
| AdminAnalytics | ✅ | Export Excel/PDF tersedia |
| AdminRBACStatus & Tools | ⚠️ | Bergantung migration SQL RBAC dari AdminSupabaseSetup |
| AdminSecurityAudit | ⚠️ | Bergantung tabel `activity_logs`, `audit_logs` |
| **Admin2FASettings** | 🔴 | Hanya UI, tidak ada backend TOTP implementasi |
| AdminActivityLog | ✅ | — |
| AdminApiConnect | ✅ | Tabel `api_keys` ada di Drizzle ✅ |
| AdminWebhooks | ✅ | — |
| AdminMidtrans | ✅ | Route backend sudah ada |
| AdminPWASettings | ✅ | — |
| AdminSupabaseSetup | ⚠️ | SQL scripts harus dijalankan manual |
| DashboardAccessManager | ✅ | Audit trail ada |
| AdminSentimenFeedback | ✅ | Demo mode fallback jika data kosong |

---

### 15H — AUDIT MODUL HR, OPERASIONAL, AGEN & TOKO

#### HR

| Halaman | Gap Kritis | Prioritas |
|---------|------------|-----------|
| AdminHR | Integrasi payroll eksternal manual | 🟡 |
| AdminPayroll | PPH21 & BPJS otomatis belum ada; slip gaji belum bisa di-generate PDF | 🟡 |
| **AdminAbsensiDigital** | **Face verify adalah stub K-02; geo-fencing belum ada** | 🔴 |
| AdminTraining | Assessment/quiz module belum ada; sertifikat belum ada | 🟡 |

#### Equipment

| Halaman | Gap |
|---------|-----|
| AdminEquipmentMaster | Barcode/QR per item belum ada; depreciation tracking belum ada |
| AdminEquipmentSettings | Alert threshold per tipe equipment belum granular |
| AdminStockOpname | Laporan selisih & auto-adjust inventory belum ada |

#### Toko Online

| Halaman | Gap |
|---------|-----|
| AdminStore | Grafik trend penjualan statis/kosong |
| AdminStoreProducts | Bulk CSV import/export belum ada |
| AdminStoreCategories | Sub-kategori bersarang belum didukung |
| AdminStoreOrders | RajaOngkir ongkir real-time belum ada; tracking pengiriman otomatis belum ada |

#### Agen & Komisi
- **API:** `POST /api/agents/create` ✅ sudah ada
- **Gap:** Komisi bertingkat by volume belum diotomasi; dashboard performa agen per periode belum ada
- **Status:** ⚠️ CRUD fungsional

#### Loyalitas, Referral, Membership, Kupon

| Halaman | Gap Utama |
|---------|-----------|
| AdminLoyalty | Logika expire poin belum ada; tier benefit belum ada |
| AdminReferrals | Deteksi fraud self-referral belum ada; payout otomatis belum ada |
| AdminMemberships | Renewal billing otomatis via Midtrans Subscription belum ada |
| AdminCoupons | Limit penggunaan per user belum ada; pembatasan per tipe paket belum ada |

#### Tabungan
- **Gap:** Virtual Account per tujuan tabungan belum ada; auto-debit belum ada; trigger WA reminder dari halaman monitor belum langsung
- **Status:** ⚠️ Fungsional untuk monitoring manual

#### Master Data (Vendor, Branch, Hotel, Airline, Airport, Bus)
- **Status:** ✅ CRUD standar, fungsional
- **Gap Umum:**
  - Sinkronisasi live data dari API vendor/airline belum ada
  - Rating vendor belum ada
  - E-signature kontrak belum ada
  - Alert perpanjangan kontrak otomatis belum ada

---

### 15I — AUDIT API SERVER (BACKEND)

#### Status Route

| Route | Method | Status | Catatan |
|-------|--------|--------|---------|
| `/api/v1/packages` | GET | ✅ | Demo fallback ada |
| `/api/v1/packages/:id` | GET | ✅ | — |
| `/api/v1/departures` | GET | ✅ | Join packages |
| `/api/v1/leads` | POST | ✅ | Rate limited |
| `/api/midtrans/create-transaction` | POST | ✅ | Snap proxy |
| `/api/midtrans/create-qris` | POST | ✅ | Core API |
| `/api/midtrans/qris-status/:id` | GET | ✅ | — |
| `/api/whatsapp/send` | POST | ✅ | Fonnte proxy |
| `/api/whatsapp/notification` | POST | ✅ | Template based |
| `/api/whatsapp/payment-reminder` | POST | ✅ | Bulk reminders |
| `/api/email/send` | POST | ✅ | SMTP Nodemailer |
| `/api/push/vapid-public-key` | GET | ✅ | — |
| `/api/push/subscribe` | POST | ✅ | Drizzle ORM |
| `/api/push/sos` | POST | ✅ | Fan-out muthawif |
| `/api/push/send` | POST | ✅ | Broadcast |
| `/api/v1/chatbot` | POST | ✅ | Gemini + FAQ |
| `/api/v1/chatbot/rate` | PATCH | ✅ | — |
| `/api/agents/create` | POST | ✅ | Supabase Auth + record |
| `/api/hr/employees` | POST | ✅ | — |
| **`/api/hr/verify-face`** | POST | **🔴 STUB** | Selalu `verified: true` |
| `/api/health` | GET | ✅ | — |

#### Route yang BELUM ADA tapi Dibutuhkan

| Route | Kebutuhan |
|-------|-----------|
| `POST /api/midtrans/create-va` | Virtual Account real |
| `POST /api/reminders/payment/auto` | Cron reminder pembayaran |
| `POST /api/reminders/followup/auto` | Cron reminder follow-up lead |
| `POST /api/reports/scheduled/run` | Eksekusi laporan terjadwal |
| `GET /api/analytics/kpi-summary` | Data KPI untuk AdminAdvancedReports |

#### Gap Schema Drizzle vs Supabase

Drizzle hanya mendefinisikan **8 tabel**. Frontend menggunakan **60+ tabel** langsung via Supabase client. Tabel penting yang TIDAK ada di Drizzle:

```
Operasional:   room_assignments, customer_mahrams, attendance_records,
               visa_status_logs, customer_notifications, sos_alerts,
               trip_timeline, luggage, manifests, equipment_distributions

Commerce:      store_categories, store_products, store_orders,
               store_order_items, store_shipments

Management:    agents, branches, branch_monthly_targets, agent_commissions,
               profiles, user_roles, faqs, chatbot_logs, app_settings,
               permissions_list, role_permissions

Finance:       vendor_costs, vendor_contracts, cash_transactions,
               payroll_records, salary_payments, savings_plans,
               savings_payments, booking_passengers, customer_documents

Marketing:     banners, blog_articles, marketing_materials, testimonials,
               announcement_records, landing_pages

HR:            employees, attendance, training_modules, training_progress,
               muthawifs, muthawif_jamaah_evaluations
```

---

### 15J — DIAGRAM RELASI ANTAR MODUL

```
╔══════════════════════════════════════════════════════════════╗
║                    MASTER DATA                               ║
║  Branches → Packages → Departures                            ║
║  Airlines ↗    PackageTypes ↗   ↓ BookingPassengers          ║
║  Hotels   ↗    CancellationPolicies   ↓                      ║
║  Airports ↗    ItineraryTemplates     ↓                      ║
║  Muthawifs ─────────────────────→ [departure_itineraries]    ║
╚══════════════════════════════════════════════════════════════╝
                           ↓
╔══════════════════════════════════════════════════════════════╗
║                    BOOKING CORE                              ║
║  Customers ← Bookings → Payments → FinanceAR                 ║
║      ↓           ↓                                           ║
║  Documents   BookingPassengers                               ║
║  MahRams         ↓                                           ║
║  VisaApps    RoomAssignments → ManifestJamaah                ║
║  Savings         ↓                                           ║
║              Attendance → AbsensiDigital                     ║
╚══════════════════════════════════════════════════════════════╝
                           ↓
╔══════════════════════════════════════════════════════════════╗
║                    KEUANGAN                                  ║
║  Bookings → Payments ────────────────→ FinancePL             ║
║  VendorCosts → FinanceAP                    ↓                ║
║  Employees → Payroll → FinanceCash → FinanceTerpadu          ║
║  All → Reports → ScheduledReports (worker belum ada!)        ║
╚══════════════════════════════════════════════════════════════╝
                           ↓
╔══════════════════════════════════════════════════════════════╗
║                    KOMUNIKASI                                ║
║  Bookings → WA/Email/Push Notifications                      ║
║  Leads → FollowUpReminder (manual!)                          ║
║  Payments → PembayaranReminder (manual!)                     ║
║  Departures → WABlastKeberangkatan (manual!)                 ║
║  ChatLeads → Chatbot → FAQ → Admin                           ║
╚══════════════════════════════════════════════════════════════╝
                           ↓
╔══════════════════════════════════════════════════════════════╗
║                    CRM & AGEN                                ║
║  Customers → Loyalty → Referrals → Agents                    ║
║  Agents → Commissions → AgentReport                          ║
║  Branches → BranchCommissions                                ║
╚══════════════════════════════════════════════════════════════╝
```

---

### 15K — RENCANA PERBAIKAN TERURUT (SPRINT BARU)

#### FASE KRITIS — Lakukan Segera

| ID | Tugas | File/Route | Estimasi |
|----|-------|------------|----------|
| F1 | Buat route `POST /api/midtrans/create-va` (Midtrans VA real) | `api-server/src/routes/midtrans.ts` | 1 hari |
| F2 | Ganti stub `/api/hr/verify-face` dengan face-api.js | `api-server/src/routes/hr.ts` | 1-2 hari |
| F3 | Buat cron job `POST /api/reminders/run` + node-cron scheduler | Route baru + `index.ts` | 1 hari |
| F4 | Buat SQL view `v_financial_summary` di Supabase | Supabase SQL Editor | 0.5 hari |
| F5 | Pindahkan setting reminder dari localStorage ke `app_settings` | `AdminCicilanReminder.tsx` | 0.5 hari |
| F6 | Migration SQL: `approval_requests`, `booking_installment_schedules` | File migration baru | 0.5 hari |
| F7 | Implementasi TOTP 2FA di backend (speakeasy) | Route baru + `Admin2FASettings.tsx` | 2 hari |

#### FASE PENTING — Sprint Berikutnya

| ID | Tugas | Estimasi |
|----|-------|----------|
| P1 | Pindahkan Gemini API key dari DB ke env var server-side | 0.5 hari |
| P2 | Server-side export manifest (hindari crash browser) | 1 hari |
| P3 | Tambah email bounce tracking (ganti SMTP dengan Resend) | 1 hari |
| P4 | Pecah `AdminDocumentGenerator.tsx` (1300 baris) jadi komponen modular | 1 hari |
| P5 | Komisi bertingkat agen: otomasi kalkulasi by volume | 1 hari |
| P6 | Upload file untuk marketing materials ke Supabase Storage | 0.5 hari |
| P7 | Race condition slot booking: server-side lock | 0.5 hari |
| P8 | Generate slip gaji PDF (AdminPayroll) | 1 hari |
| P9 | Kalkulasi PPH21 & BPJS otomatis (AdminPayroll) | 1 hari |
| P10 | Pindahkan kalkulasi keuangan besar ke Supabase RPC/view | 2 hari |

#### FASE PENINGKATAN — Jangka Menengah

| ID | Tugas | Estimasi |
|----|-------|----------|
| E1 | Migrasi WhatsApp dari Fonnte → Meta WABA atau Twilio | 3 hari |
| E2 | RajaOngkir untuk ongkir toko online | 1 hari |
| E3 | Logika expire poin loyalitas | 0.5 hari |
| E4 | Deteksi fraud self-referral | 0.5 hari |
| E5 | Midtrans Subscription untuk renewal membership otomatis | 1 hari |
| E6 | Limit penggunaan kupon per user | 0.5 hari |
| E7 | Assessment/quiz module di AdminTraining | 2 hari |
| E8 | Sertifikat massal generator (K7 di Sprint 8) | 1 hari |
| E9 | Sub-kategori toko online | 0.5 hari |
| E10 | Live chat takeover AI → human agent | 2 hari |
| E11 | Geo-fencing untuk absensi digital | 1 hari |
| E12 | Barcode/QR per item equipment | 1 hari |
| E13 | E-signature kontrak vendor | 2 hari |
| E14 | Multi-bahasa (i18n) — sangat besar, perlu diskusi | 5+ hari |

---

### 15L — RINGKASAN STATUS PER KATEGORI

| Kategori | Total Halaman | ✅ Fungsional | ⚠️ Ada Gap | 🔴 Kritis |
|----------|---------------|--------------|------------|-----------|
| Booking & Pembayaran | 9 | 6 | 2 | 1 (VA) |
| Keuangan & Laporan | 13 | 8 | 3 | 2 (view, worker) |
| Pelanggan & Jamaah | 10 | 7 | 3 | 0 |
| Paket & Keberangkatan | 8 | 7 | 1 | 0 |
| Komunikasi & Marketing | 14 | 9 | 4 | 1 (reminder otomasi) |
| Sistem & Pengaturan | 10 | 6 | 3 | 1 (2FA) |
| HR | 4 | 2 | 1 | 1 (face verify stub) |
| Operasional Equipment | 3 | 2 | 1 | 0 |
| Toko Online | 4 | 3 | 1 | 0 |
| Agen & Mitra | 5 | 4 | 1 | 0 |
| Tabungan & Loyalitas | 6 | 4 | 2 | 0 |
| Master Data | 7 | 7 | 0 | 0 |
| **TOTAL** | **93** | **65 (70%)** | **22 (24%)** | **6 (6%)** |

---

*Audit dilakukan berdasarkan pembacaan kode aktual semua halaman admin. Terakhir diperbarui: Mei 2026.*

---

## BAGIAN 16 — RENCANA MIGRASI SQL (Konsolidasi & Pengembangan)

> Semua file SQL sudah dipindahkan dan diorganisir di folder `sql/`. Bagian ini menjelaskan apa yang sudah dilakukan, cara menjalankannya, dan rencana migrasi berikutnya.

---

### 16A — Yang Sudah Dikerjakan

Sebelumnya file SQL tersebar di **dua folder** dengan nama tidak konsisten:

| Sebelum | Sesudah |
|---------|---------|
| `migrations/` (15 file, tidak bernomor) | `sql/migrations/001_*.sql ... 039_*.sql` |
| `supabase/migrations/` (25 file, nama UUID + fase) | Digabung ke `sql/migrations/` |
| Tidak ada urutan jelas | Penomoran 001–039 berurutan |
| Tidak ada file master | `sql/MASTER_FRESH_INSTALL.sql` (7483 baris) |
| Tidak ada panduan eksekusi | `sql/README.md` (panduan lengkap) |

**Hasil konsolidasi:**
```
sql/
├── README.md                    ← Panduan eksekusi lengkap
├── MASTER_FRESH_INSTALL.sql     ← Fresh install — paste & run satu kali (320KB)
├── PATCHES_ONLY.sql             ← Update existing DB — hanya file 024-039 (67KB)
├── CONSOLIDATED_fase1-20.sql    ← Backup referensi fase 1-20 (145KB)
└── migrations/                  ← 39 file individual berurutan
    ├── 001_foundation.sql
    ├── 002_fase1_membership_branch_commission.sql
    ├── ...
    └── 039_patch_website_settings_layout.sql
```

---

### 16B — Urutan Eksekusi Lengkap (001–039)

| No | File | Tabel/Fitur yang Dibuat | Syarat |
|----|------|------------------------|--------|
| 001 | `001_foundation.sql` | `packages`, `departures`, `bookings`, `customers`, `payments`, `profiles`, `user_roles`, `airports`, `airlines`, `hotels` | — Jalankan PERTAMA |
| 002 | `002_fase1_membership_branch_commission.sql` | `memberships`, `branches`, `agent_commissions`, `branch_commissions` | Setelah 001 |
| 003 | `003_fase2_public_website.sql` | `blog_articles`, `testimonials`, `faqs`, `banners`, `team_members` | Setelah 001 |
| 004 | `004_fase3_customer_portal.sql` | `savings_plans`, `savings_payments`, `loyalty_points`, `loyalty_redemptions`, `referral_codes` | Setelah 001-002 |
| 005 | `005_fase4_6_analytics_notif_operational.sql` | `analytics_events`, `customer_notifications`, `support_tickets`, `departure_itineraries` | Setelah 001-004 |
| 006 | `006_whatsapp_tables.sql` | `whatsapp_config`, `whatsapp_logs` | Setelah 001 |
| 007 | `007_fase6_app_settings_va_targets.sql` | `app_settings`, `virtual_accounts`, `agent_monthly_targets`, `jamaah_doa_sessions`, `jamaah_jurnal` | Setelah 001-005 |
| 008 | `008_dashboard_access_config.sql` | `dashboard_access_config` | Setelah 001 |
| 009 | `009_payment_deadline_reminders.sql` | `payment_deadline_reminders` | Setelah 001 |
| 010 | `010_fase4_push_visa.sql` | `push_subscriptions`, `visa_applications` | Setelah 001-005 |
| 011 | `011_fase5_rbac_improvements.sql` | `permissions_list`, `role_permissions`, enum app_role, RLS policies | Setelah 001-010 |
| 012 | `012_hr_enhancements.sql` | `payroll_records`, `leave_requests`, `performance_reviews` | Setelah 001 |
| 013 | `013_operational_integration.sql` | Views: `v_jamaah_operational_status`, `v_departure_financial` | Setelah 001-012 |
| 014 | `014_flexible_rooming_groups.sql` | ALTER `booking_passengers` → tambah `room_group_id` | Setelah 001 |
| 015 | `015_multi_mahram_rooming.sql` | ALTER `customer_mahrams` → tambah `relation_category` | Setelah 001 |
| 016 | `016_fix_missing_fkeys.sql` | FK: `bookings.sales_id`, `booking_status_history.changed_by` | Setelah 001 |
| 017 | `017_fase11_15_leads_manasik_reviews.sql` | `leads`, `lead_activities`, `manasik_schedules`, `manasik_attendance`, `reviews`, `media_gallery` | Setelah 001-011 |
| 018 | `018_fase16_new_tables.sql` | `sos_alerts`, `visa_status_logs`, `approval_requests`, `approval_actions`, `chatbot_logs`, `chat_leads`, `audit_logs`, `activity_logs` | Setelah 001-017 |
| 019 | `019_fase17_remaining_tables.sql` | `vendor_contracts`, `departure_budgets`, `training_modules`, `training_quizzes`, `training_progress`, `media_gallery` | Setelah 001-018 |
| 020 | `020_fase18_core_settings.sql` | `company_settings`, `bank_accounts`, `website_settings`, `contact_page_content` | Setelah 001 |
| 021 | `021_fase19_branch_kpi_targets.sql` | `branch_monthly_targets` | Setelah 002 |
| 022 | `022_fase20_webhooks_push.sql` | `webhooks`, `webhook_logs`, (push_subscriptions update) | Setelah 001 |
| 023 | `023_fase20_chat_bubble_color.sql` | ALTER `website_settings` → tambah `chat_bubble_color` | Setelah 020 |
| 024 | `024_store_ecommerce.sql` | `store_categories`, `store_products`, `store_orders`, `store_order_items`, `store_shipments` | Setelah 001 |
| 025 | `025_store_product_reviews.sql` | `store_product_reviews` | Setelah 024 |
| 026 | `026_fase21_integration_fixes.sql` | Patch: `customer_notifications`, `jamaah_checklist`, `attendance_records`, `feedback`, `visa_status_logs`, `room_occupants` | Setelah 001-025 |
| 027 | `027_fase22_muthawif_evaluations.sql` | `muthawif_jamaah_evaluations` | Setelah 001 |
| 028 | `028_fase23_payments_transaction_id.sql` | ALTER `payments` → `transaction_id`, `payment_type` | Setelah 001 |
| 029 | `029_patch_auto_commission_trigger.sql` | FUNCTION + TRIGGER `attribute_commission_to_parent` | Setelah 002 |
| 030 | `030_patch_store_categories_extra.sql` | Tambahan kolom/index `store_categories` | Setelah 024 |
| 031 | `031_patch_push_subscriptions.sql` | Ensure `push_subscriptions` RLS policies | Setelah 010 |
| 032 | `032_patch_ibadah_progress.sql` | `ibadah_progress` tabel | Setelah 001 |
| 033 | `033_patch_push_outbox.sql` | `push_outbox`, `notification_templates` | Setelah 001 |
| 034 | `034_patch_audit_logs_policy_fix.sql` | Perbaiki policy INSERT `audit_logs` | Setelah 018 |
| 035 | `035_patch_security_revoke_trigger_funcs.sql` | Revoke EXECUTE pada trigger functions | Setelah 001-034 |
| 036 | `036_patch_customer_mahrams_rls.sql` | RLS policies `customer_mahrams` | Setelah 001 |
| 037 | `037_patch_referral_policies_fix.sql` | Perbaiki policies referral_codes & referral_usages | Setelah 004 |
| 038 | `038_patch_storage_upload_policy.sql` | Storage policy upload dokumen customer | Setelah 001-011 |
| 039 | `039_patch_website_settings_layout.sql` | ALTER `website_settings` → `layout_variant`, `theme_overrides` | Setelah 020 |

---

### 16C — Cara Menjalankan (3 Skenario)

#### Skenario 1: Database Baru (Fresh Install)
```
1. Buka Supabase Dashboard → SQL Editor
2. Klik "New Query"
3. Copy-paste isi file: sql/MASTER_FRESH_INSTALL.sql
4. Klik Run
5. Selesai. Semua 39 migrasi dijalankan sekaligus.
```

#### Skenario 2: Update Database yang Sudah Ada (Fase 1-20 sudah dijalankan)
```
1. Buka Supabase Dashboard → SQL Editor
2. Copy-paste isi file: sql/PATCHES_ONLY.sql
3. Klik Run
4. Ini menjalankan hanya migrasi 024–039 (store + fase21-23 + patches)
```

#### Skenario 3: Migrasi Bertahap (Paling Aman)
```
Jalankan satu per satu dari folder sql/migrations/
mulai dari 001_foundation.sql sampai 039_patch_website_settings_layout.sql
Gunakan ini jika ada error di skenario 1/2 agar bisa debug per-file.
```

---

### 16D — Migrasi yang BELUM Dibuat (Perlu Dibuat)

File-file berikut dibutuhkan oleh frontend tapi SQL-nya belum ada:

#### 040 — `v_financial_summary` VIEW
```sql
-- Dibutuhkan oleh: AdminAdvancedReports
-- Tanpa ini: halaman Advanced Reports gagal load
CREATE OR REPLACE VIEW v_financial_summary AS
  SELECT
    d.id AS departure_id,
    d.departure_date,
    p.name AS package_name,
    COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'paid'), 0) AS total_revenue,
    COALESCE(SUM(vc.amount), 0) AS total_cost,
    COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'paid'), 0) 
      - COALESCE(SUM(vc.amount), 0) AS gross_profit,
    COUNT(DISTINCT b.id) AS total_bookings
  FROM departures d
  LEFT JOIN packages p ON p.id = d.package_id
  LEFT JOIN bookings b ON b.departure_id = d.id AND b.status != 'cancelled'
  LEFT JOIN payments pay ON pay.booking_id = b.id
  LEFT JOIN vendor_costs vc ON vc.departure_id = d.id
  GROUP BY d.id, d.departure_date, p.name;
```
**Status:** 🔴 Harus dibuat agar AdminAdvancedReports berfungsi

#### 041 — `booking_installment_schedules` TABLE
```sql
-- Dibutuhkan oleh: AdminCicilanGenerator
CREATE TABLE IF NOT EXISTS booking_installment_schedules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  installment_number INT NOT NULL,
  due_date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE booking_installment_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can manage installment schedules"
  ON booking_installment_schedules FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin','admin','finance')));
```
**Status:** 🔴 Harus dibuat agar AdminCicilanGenerator berfungsi

#### 042 — `scheduled_reports` TABLE
```sql
-- Dibutuhkan oleh: AdminScheduledReports
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  report_type TEXT NOT NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('daily','weekly','monthly')),
  recipients JSONB DEFAULT '[]'::jsonb,
  filters JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS scheduled_report_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  report_id UUID REFERENCES scheduled_reports(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'success' CHECK (status IN ('success','failed')),
  rows_generated INT,
  recipients_sent INT,
  error_message TEXT,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);
```
**Status:** 🔴 Harus dibuat agar fitur Scheduled Reports bisa bekerja

#### 043 — `package_labels` + `package_label_assignments` ✅ SELESAI
```sql
-- Migrasi P6 (Sprint 8) — implementasi final pakai tabel relasional
-- bukan satu kolom enum, agar admin bisa CRUD label kustom + warna sendiri.
CREATE TABLE public.package_labels (
  id uuid PK, branch_id uuid NULL → branches(id),
  slug, name, color, icon, description, sort_order, is_active,
  UNIQUE (branch_id, slug)
);
CREATE TABLE public.package_label_assignments (
  id uuid PK,
  package_id uuid → packages(id) ON DELETE CASCADE,
  label_id uuid → package_labels(id) ON DELETE CASCADE,
  UNIQUE (package_id, label_id)
);
-- RLS: SELECT publik (label aktif); ALL hanya admin/owner/super_admin
--      branch_manager dibatasi pada branch_id-nya sendiri.
-- Seed: 5 label default (best_seller, early_bird, flash_sale, new, limited)
```
**Status:** ✅ Selesai (migrasi sudah dijalankan & UI terhubung)

#### 044 — TOTP 2FA COLUMN
```sql
-- Dibutuhkan oleh: Admin2FASettings (implementasi TOTP)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_secret TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS totp_verified_at TIMESTAMPTZ;
```
**Status:** 🟡 Perlu jika 2FA diimplementasikan

---

### 16E — Ringkasan Tabel per Kategori (Total)

| Kategori | Tabel | Status |
|----------|-------|--------|
| Core Booking | packages, departures, bookings, booking_passengers, booking_status_history, payments, refunds | ✅ Ada di 001 |
| Pelanggan | customers, customer_documents, customer_mahrams, customer_notifications, visa_applications | ✅ Ada di 001-026 |
| Keuangan | bank_accounts, cash_transactions, vendor_costs, payroll_records, savings_plans, savings_payments | ✅ Ada di 001-020 |
| Kamar & Keberangkatan | room_assignments, departure_itineraries, departure_budgets, attendance_records | ✅ Ada di 005-026 |
| CRM & Chat | leads, lead_activities, chat_leads, chatbot_logs | ✅ Ada di 017-018 |
| Komunikasi | whatsapp_config, whatsapp_logs, push_subscriptions, push_outbox, customer_notifications | ✅ Ada di 006-033 |
| Konten Publik | blog_articles, banners, marketing_materials, faqs, testimonials, announcements | ✅ Ada di 003-017 |
| HR | employees, payroll_records, leave_requests, performance_reviews, training_modules | ✅ Ada di 012-019 |
| Equipment | equipment_categories, equipment_items, equipment_distributions | ✅ Ada di 019 |
| Toko Online | store_categories, store_products, store_orders, store_order_items, store_shipments, store_product_reviews | ✅ Ada di 024-025 |
| Agen & Cabang | agents, branches, agent_commissions, branch_commissions, branch_monthly_targets | ✅ Ada di 001-021 |
| Loyalitas | loyalty_points, referral_codes, referral_usages, memberships, coupons | ✅ Ada di 004 |
| Pengaturan | company_settings, website_settings, app_settings, api_keys, webhooks | ✅ Ada di 007-022 |
| Keamanan | user_roles, permissions_list, role_permissions, audit_logs, activity_logs, dashboard_access_config | ✅ Ada di 008-018 |
| Visa & Haji | visa_applications, visa_status_logs, haji_registrations, siskohat_sync_logs | ✅ Ada di 010-018 |
| Muthawif | muthawifs, muthawif_jamaah_evaluations, sos_alerts | ✅ Ada di 001-027 |
| **YANG KURANG** | booking_installment_schedules, scheduled_reports, scheduled_report_logs, v_financial_summary (view) | 🔴 Perlu dibuat (lihat 16D) |

---

### 16F — Checklist Sebelum Menjalankan Migrasi

Sebelum menjalankan di Supabase SQL Editor, pastikan:

- [ ] Anda login sebagai **postgres** atau menggunakan **service_role** key
- [ ] **Row Level Security** bisa aktif — pastikan tidak ada policy yang konflik
- [ ] Setelah migrasi, aktifkan **Realtime** untuk tabel: `bookings`, `customer_notifications`, `attendance_records`, `sos_alerts`, `chatbot_logs`
- [ ] Set Supabase URL dan key di Replit Secrets: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Buat storage bucket: `trip-photos`, `public-assets`, `customer-documents`, `pwa-icons`

---

*Rencana migrasi SQL ini diperbarui Mei 2026 setelah konsolidasi semua file dari `migrations/` dan `supabase/migrations/` ke dalam `sql/migrations/`.*

---

## BAGIAN 16 — ANALISIS MENDALAM: PWA & TAMPILAN YANG BISA DIATUR ADMIN

> **Tanggal analisis:** Mei 2026 — membaca kode seluruh sistem PWA, manifest, service worker, layout, hooks, dan admin panel secara mendalam.
> **Tujuan:** Mewujudkan visi: *website di browser tetap seperti website; setelah di-install jadi tampilan app yang bisa dikustomisasi dari panel admin.*

---

### 16A — Arsitektur PWA Saat Ini (Yang Sudah Ada)

| Komponen | File | Status | Keterangan |
|----------|------|--------|------------|
| Deteksi mode standalone | `usePWAMode.ts` | ✅ Ada | `display-mode: standalone` + iOS `navigator.standalone` |
| Layout berbeda saat di-install | `DynamicPublicLayout.tsx` | ✅ Ada | `PWACompactHeader` + `MobileBottomNav` gantikan navbar+footer |
| Redirect ke portal saat installed | `StandaloneHomeGate.tsx` | ✅ Ada | Jamaah → `/jamaah`, Admin → `/dashboard` |
| Konfigurasi bottom nav dari DB | `usePWAConfig.ts` | ✅ Ada | Simpan ke `website_settings.custom_sections.pwa_bottom_nav` |
| UI admin kelola bottom nav | `AdminPWASettings.tsx` | ✅ Ada | Drag-drop, toggle, 16 pilihan ikon |
| Bottom nav dinamis | `MobileBottomNav.tsx` | ✅ Ada | Baca dari DB, fallback ke default |
| Manifest dasar | `public/manifest.json` | ⚠️ Statis | Hardcoded, tidak berubah walau admin edit settings |
| Service Worker | `public/sw.js` | ⚠️ Parsial | Cache jamaah routes + static assets, belum optimal |
| Install prompt | `PWAInstallPrompt.tsx` | ✅ Ada | Banner saat browser support install |
| Gerbang install interaktif | `PWAGatePage.tsx` | ✅ Ada | Panduan per platform (Android/iOS/Desktop) |
| Splash screen loader | `index.html` (`#initialLoader`) | ⚠️ Statis | Warna/ikon tidak dari DB admin |
| Header kompak PWA | `PWACompactHeader` (di layout) | ⚠️ Terbatas | Tampil nama + tagline saja, tidak bisa dikustomisasi layout-nya |
| Update meta tags saat settings berubah | `ThemeProvider.tsx` | ✅ Ada | Update `theme-color`, `apple-mobile-web-app-title`, favicon |

---

### 16B — GAP KRITIS PWA (Masalah yang Harus Diperbaiki)

#### 🔴 GAP-PWA-01: manifest.json STATIS — Perubahan Admin Tidak Terpantul

**Masalah:** `public/manifest.json` adalah file fisik statis. Admin bisa ubah nama app, warna, ikon di `AdminPWASettings`, perubahan ini disimpan ke DB — **tapi `manifest.json` tidak pernah diupdate**. Saat jamaah install PWA, yang terpasang di homescreen selalu "Vinstour Travel", warna splash `#0f2518`, dan ikon dari `/images/icon-192.png`.

**Bukti di kode:**
- `usePWAConfig.ts` menyimpan `pwa_icon_config` ke `website_settings.custom_sections` ✅
- `ThemeProvider.tsx` memang update `<meta name="theme-color">` dan `<link rel="icon">` ✅
- **Tapi**: `manifest.json` yang di-cache browser (dan dipakai untuk install) tetap hardcoded ❌
- Perubahan meta tag di runtime tidak berpengaruh pada manifest yang sudah di-cache saat install

**Dampak Nyata:** Multi-tenant tidak berjalan. Cabang A dan Cabang B sama-sama punya nama "Vinstour" di homescreen. Warna splash screen tidak bisa dikustomisasi per tenant.

**Solusi yang Harus Dibangun:**
```
Opsi A (Direkomendasikan): Buat endpoint dinamis di Express
  GET /api/manifest.json → baca dari DB → return JSON manifest dengan nama/warna/ikon dari settings
  Konfigurasi sw.js untuk tidak cache /api/manifest.json
  Tambahkan header: Cache-Control: no-cache, no-store

Opsi B: Endpoint manifest di vite server proxy ke /api/manifest
  Vite config sudah punya proxy /api → localhost:8080
  Tinggal tambah route manifest.json di api-server
```

---

#### 🔴 GAP-PWA-02: VAPID Private Key Tersimpan di Frontend — Security Vulnerability

**Masalah:** `usePWAConfig.ts` baris 133 membaca `push_vapid_config` termasuk `privateKey` dari DB dan expose ke frontend React. VAPID private key adalah secret server-side — **tidak boleh ada di browser**.

**Bukti di kode:**
```typescript
// usePWAConfig.ts baris 133-136
const vapidConfig: PushVapidConfig = useMemo(() => {
  const saved = customData?.push_vapid_config as Partial<PushVapidConfig> | undefined;
  return { ...DEFAULT_VAPID_CONFIG, ...(saved || {}) };
}, [customData]);
// Interface PushVapidConfig mengandung: privateKey: string
```

**Dampak:** Siapapun yang buka DevTools bisa curi VAPID private key → bisa kirim push notification palsu ke semua jamaah.

**Solusi:**
- Hapus `privateKey` dari interface `PushVapidConfig` di frontend
- VAPID private key hanya dibaca via env var `VAPID_PRIVATE_KEY` di api-server
- Frontend hanya perlu `publicKey` untuk subscribe
- Admin set private key via Replit Secrets, bukan via UI admin

---

#### 🔴 GAP-PWA-03: Tidak Ada Layout App Terpisah untuk Portal Jamaah

**Masalah:** Saat PWA terinstall, `StandaloneHomeGate` redirect jamaah ke `/jamaah`. Tapi `/jamaah` dan semua sub-route-nya (`/jamaah/*`) menggunakan `DynamicPublicLayout` — layout yang sama dengan website publik. `DynamicPublicLayout` memang sudah ada logika berbeda untuk standalone mode (`PWACompactHeader` + `MobileBottomNav`), tapi ini berlaku untuk **semua halaman publik**, bukan khusus "tampilan app jamaah".

**Akibat:**
- Jamaah yang install PWA masuk ke halaman `/jamaah` dengan header kecil + bottom nav → ✅
- Tapi halaman jamaah tidak punya App Shell yang proper (tidak ada sidebar, tidak ada navigasi kontekstual per section)
- Bottom nav yang dikonfigurasi admin adalah untuk **publik** (Beranda, Paket, Sholat, Toko, Akun), **bukan untuk portal jamaah** (Beranda Jamaah, Dokumen, Pembayaran, Notifikasi, Profil)
- Jamaah di-install tapi navigasi dalam "app"-nya tidak representatif fitur jamaah

**Solusi:**
- Buat `JamaahAppLayout` terpisah yang otomatis aktif saat standalone mode
- Bottom nav jamaah (5 item khusus portal jamaah) dikonfigurasi terpisah dari bottom nav publik
- Tambahkan konfigurasi `pwa_jamaah_bottom_nav` di `usePWAConfig`
- Admin bisa set bottom nav berbeda untuk mode publik vs mode jamaah

---

#### ✅ GAP-PWA-04: Splash Screen Tidak Bisa Dikustomisasi dari Admin — DONE

**Masalah:** `index.html` punya `#initialLoader` dengan warna hijau `#0f2518` hardcoded. Warna ini tidak berubah walau admin set warna berbeda di panel.

**Bukti:**
```html
<!-- index.html — statis -->
<style>
  #initialLoader { background: #0f2518; }
</style>
```

ThemeProvider memang inject CSS variables ke `document.documentElement`, tapi ini terjadi SETELAH React mount — sementara initial loader tampil SEBELUM React mount.

**Solusi:**
- Buat endpoint `GET /api/splash-config` yang return warna utama dari DB sebagai JSON minimal
- Di `index.html`, tambahkan inline script yang fetch `/api/splash-config` dan update style `#initialLoader` sebelum React load
- Atau: simpan warna di localStorage saat ThemeProvider jalan, baca localStorage di awal load berikutnya

---

#### ✅ GAP-PWA-05: Bottom Nav Sama untuk Semua User (Tidak Role-Aware) — DONE

**Masalah:** `MobileBottomNav.tsx` menampilkan item yang sama untuk semua user tanpa peduli login atau tidak, dan tidak peduli role.

**Contoh masalah:**
- User sudah login sebagai jamaah → tetap tampil "Akun" yang link ke `/auth/login`
- Admin yang buka halaman publik dari mobile → dapat bottom nav jamaah publik, bukan shortcut admin
- User belum login → item "Jadwal" tampil sama seperti user sudah login

**Solusi:**
- Di `MobileBottomNav`, cek auth status dan role via `useAuth`
- Jika logged in sebagai jamaah → tampilkan bottom nav jamaah (bukan bottom nav publik)
- Jika tidak login → tampilkan bottom nav publik dengan item "Masuk" bukan "Akun"
- Admin di mobile → tampilkan shortcut ke admin panel

---

#### ✅ GAP-PWA-06: Service Worker Tidak Ada Update Notification — DONE

**Masalah:** Ketika deploy versi baru, service worker baru ter-install tapi user tidak tahu. Konten lama bisa tetap tampil dari cache sampai user close dan buka ulang app.

**Bukti di kode:**
- `sw.js` menggunakan `self.skipWaiting()` di install event → akan otomatis aktif
- Tapi tidak ada pesan ke main thread: "Ada versi baru, refresh?"
- `main.tsx` ada handler `SKIP_WAITING` tapi hanya untuk chunk error, bukan update notification

**Solusi:**
```javascript
// sw.js: broadcast ke semua tab saat versi baru aktif
self.addEventListener('activate', (event) => {
  event.waitUntil(
    clients.claim().then(() => {
      clients.matchAll({ type: 'window' }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'SW_UPDATED' }));
      });
    })
  );
});

// main.tsx: tampilkan toast/banner "Versi baru tersedia"
navigator.serviceWorker.addEventListener('message', (event) => {
  if (event.data?.type === 'SW_UPDATED') {
    toast("Versi baru tersedia", { action: { label: "Refresh", onClick: () => window.location.reload() }});
  }
});
```

---

#### 🟡 GAP-PWA-07: Manifest Shortcuts Tidak Dinamis

**Masalah:** `manifest.json` hardcode 4 shortcuts (Portal Jamaah, Waktu Sholat, Panduan, Cek Booking). Admin tidak bisa menambah/mengurangi shortcuts dari panel admin.

**Solusi:** Endpoint manifest dinamis (solusi GAP-PWA-01) otomatis menyelesaikan ini — shortcut bisa diambil dari DB.

---

#### 🟡 GAP-PWA-08: Tidak Ada Preview "Tampilan App" di Admin Panel

**Masalah:** `AdminPWASettings.tsx` ada mockup preview kecil di sisi kanan, tapi hanya menampilkan simulasi sederhana bottom nav. Tidak ada iframe preview bagaimana app sebenarnya terlihat saat installed.

**Solusi:**
- Tambahkan tab "Preview Mode" di AdminPWASettings
- Render iframe dengan `?preview=standalone` parameter
- App mendeteksi parameter ini dan menampilkan layout standalone meski di browser biasa
- Admin bisa lihat persis tampilannya sebelum simpan

---

#### 🟡 GAP-PWA-09: mode `fullscreen` dan `minimal-ui` Tidak Dideteksi

**Masalah:** `usePWAMode.ts` hanya cek `display-mode: standalone`. Jika manifest menggunakan `fullscreen` atau `minimal-ui`, hook ini return `false` walau app sebenarnya terinstall.

**Solusi:**
```typescript
const mq = window.matchMedia(
  "(display-mode: standalone) or (display-mode: fullscreen) or (display-mode: minimal-ui)"
);
```

---

#### 🟡 GAP-PWA-10: Tidak Ada Cara Admin Melihat Statistik Install PWA

**Masalah:** Tidak ada data: berapa jamaah yang install PWA? Dari platform apa (Android/iOS)? Kapan install?

**Solusi:**
- Tambahkan endpoint `POST /api/pwa/install-event` yang dipanggil dari event `appinstalled` di browser
- Simpan ke tabel `pwa_install_events` (platform, timestamp, user_agent)
- Tampilkan statistik di AdminPWASettings: "XX jamaah sudah install"

---

### 16C — Rencana Perbaikan PWA (Berurutan Prioritas)

| ID | Tugas | Dampak | Estimasi | Prioritas |
|----|-------|--------|----------|-----------|
| PWA-F1 | **Manifest dinamis** — endpoint `GET /api/manifest.json` di Express yang baca nama/warna/ikon dari DB | 🔴 KRITIS | 1 hari | Sprint berikutnya |
| PWA-F2 | **Fix security: hapus VAPID private key dari frontend** — interface, hook, dan admin UI | 🔴 KRITIS | 0.5 hari | Sprint berikutnya |
| PWA-F3 | **Bottom nav jamaah terpisah** — `pwa_jamaah_bottom_nav` config, `JamaahAppLayout` standalone | 🟠 Tinggi | 1 hari | Sprint berikutnya |
| PWA-F4 | **Bottom nav role-aware** — tampilan berbeda untuk logged-in vs guest, per role | 🟠 Tinggi | 0.5 hari | Sprint berikutnya |
| PWA-F5 | **SW update notification** — broadcast `SW_UPDATED` + toast di main thread | 🟠 Tinggi | 0.5 hari | Sprint berikutnya |
| PWA-F6 | **Splash screen dari DB** — baca warna dari localStorage (yang diisi ThemeProvider) untuk initial loader | 🟡 Sedang | 0.5 hari | Sprint +2 |
| PWA-F7 | **Preview mode di admin** — parameter `?preview=standalone` untuk preview layout app | 🟡 Sedang | 1 hari | Sprint +2 |
| PWA-F8 | **Deteksi mode fullscreen/minimal-ui** — update `usePWAMode.ts` | 🟡 Sedang | 0.25 hari | Sprint +2 |
| PWA-F9 | **Statistik install PWA** — event tracking + tabel + tampilan di admin | 🟡 Sedang | 1 hari | Sprint +2 |
| PWA-F10 | **Manifest shortcuts dinamis** — ikut terselesaikan saat PWA-F1 selesai | 🟢 Rendah | — | Otomatis |

---

### 16D — Arsitektur Ideal: "Tampilan App yang Bisa Diatur Admin"

Visi yang diinginkan membutuhkan 3 lapisan yang bekerja bersama:

```
┌─────────────────────────────────────────────────────────────────┐
│ LAPISAN 1 — MANIFEST DINAMIS (dari DB)                         │
│  GET /api/manifest.json → baca website_settings → return JSON  │
│  nama, short_name, themeColor, bgColor, icons, shortcuts       │
└────────────────────────┬────────────────────────────────────────┘
                         │ Browser baca manifest saat install
┌────────────────────────▼────────────────────────────────────────┐
│ LAPISAN 2 — DETEKSI MODE (sudah ada, perlu penyempurnaan)      │
│  usePWAMode → isStandalone: boolean                            │
│  StandaloneHomeGate → redirect jamaah ke /jamaah               │
└────────────────────────┬────────────────────────────────────────┘
                         │ isStandalone = true
┌────────────────────────▼────────────────────────────────────────┐
│ LAPISAN 3 — LAYOUT APP (perlu dibangun untuk jamaah)           │
│  JamaahAppLayout (baru):                                       │
│    ├── PWACompactHeader (sudah ada, perlu penyempurnaan)       │
│    ├── <main> konten halaman jamaah                            │
│    └── JamaahBottomNav (baru, 5 item khusus jamaah, dari DB)   │
│                                                                │
│  DynamicPublicLayout (sudah ada, untuk halaman publik):        │
│    ├── Browser mode: Navbar + Footer                           │
│    └── Standalone mode: PWACompactHeader + MobileBottomNav     │
└─────────────────────────────────────────────────────────────────┘

ADMIN PANEL CONTROLS:
  AdminPWASettings (sudah ada + perlu penambahan):
    Tab 1: Ikon & Identitas App (nama, short_name, warna, ikon)
    Tab 2: Bottom Nav Publik (untuk mode standalone di halaman publik)
    Tab 3: Bottom Nav Jamaah (BARU — untuk portal jamaah saat terinstall)
    Tab 4: Preview Mode (BARU — lihat tampilan app sebelum simpan)
    Tab 5: Statistik Install (BARU — berapa yang sudah install)
```

---

## BAGIAN 17 — ANALISIS MENDALAM: HAK AKSES (RBAC)

> **Tanggal analisis:** Mei 2026 — membaca kode `permissions.ts`, `admin-menu-registry.ts`, `useDynamicMenus.ts`, `ProtectedRoute.tsx`, `AdminRoleManagement.tsx`, SQL migrations RBAC.
> **Tujuan:** Mengidentifikasi celah, ketidakkonsistenan, dan risiko keamanan dalam sistem hak akses.

---

### 17A — Arsitektur RBAC Saat Ini

```
Database (Supabase):
  auth.users → profiles → user_roles (multi-role)
  role_permissions: role → permission_key[]
  user_permissions: user_id → permission_key (override per user)
  menu_items: label + path + required_permission (dikonfigurasi dari DB)

  RPC get_user_effective_permissions_v2:
    1. Kumpulkan semua roles user (dari user_roles)
    2. Expand dengan role inheritance (dari kode, bukan DB)
    3. Gabungkan semua permission dari role_permissions
    4. Terapkan override dari user_permissions (grant/revoke per user)

Frontend:
  useAuth → user, session, roles, isAdmin(), isStaff(), isAgent()
  useDynamicMenus → effectiveKeys[], isPathAllowed(path)
  ProtectedRoute → DynamicMenuGate → isPathAllowed
  AdminRoleManagement → UI matrix permission per role
  AdminRBACStatus → diagnostic + re-seed tools
```

---

### 17B — GAP KRITIS HAK AKSES (Masalah yang Harus Diperbaiki)

#### 🔴 GAP-RBAC-01: Tidak Ada Granularitas Read vs Write vs Delete

**Masalah:** Permission saat ini adalah flat string: `bookings`, `payments`, `customers`, dll. Tidak ada perbedaan antara "bisa lihat" vs "bisa edit" vs "bisa hapus".

**Dampak Nyata:**
- Staff `sales` yang punya permission `bookings` otomatis bisa **hapus booking** — padahal harusnya hanya lihat + buat
- Staff `marketing` dengan `customers` bisa **edit data pribadi jamaah**
- Tidak ada cara memberi seseorang akses "read-only" ke finance tanpa juga bisa edit

**Solusi — Hierarki Permission Granular:**
```
Contoh format baru: "modul.aksi"
  bookings.read    → bisa lihat daftar + detail booking
  bookings.write   → bisa buat + edit booking
  bookings.delete  → bisa hapus booking
  bookings.export  → bisa export ke Excel/PDF

  finance.read     → bisa lihat laporan
  finance.write    → bisa input transaksi
  finance.approve  → bisa approve pembayaran
```

**Catatan:** Ini adalah perubahan besar. Perlu:
1. Update semua `PERMISSIONS` constant di `permissions.ts`
2. Update semua entri di `admin-menu-registry.ts` (tiap route → permission granular)
3. Migrasi data di `role_permissions` table
4. Update RPC di Supabase
5. Update semua guard di komponen (`useCanAccess`, `ProtectedRoute`)

---

#### 🔴 GAP-RBAC-02: `user.roles` Diambil dari Auth Metadata, Bukan Tabel `user_roles`

**Masalah:** Di `useDynamicMenus.ts` baris 45:
```typescript
const userRoles = (user as any).roles || [] as AppRole[];
```
Ini membaca `roles` dari Supabase auth user object — yang diisi saat login dari user metadata, bukan dari tabel `user_roles`. Tabel `user_roles` adalah source of truth untuk multi-role, tapi yang dibaca adalah metadata auth.

**Dampak:**
- Jika admin tambah role di tabel `user_roles` tapi tidak update auth metadata → tidak berpengaruh ke permission
- Inkonsistensi: `useAuth` membaca tabel `user_roles` (✅), tapi `useDynamicMenus` membaca auth metadata (⚠️)
- Multi-role hanya jalan jika metadata auth dan tabel user_roles sinkron

**Solusi:**
- `useDynamicMenus` harus ambil roles dari hasil `useAuth().roles` (yang sudah baca dari `user_roles` tabel), bukan dari `(user as any).roles`
- Atau: pass roles sebagai parameter ke hook

---

#### 🔴 GAP-RBAC-03: Cache Permission 15 Menit Tidak Bisa Diinvalidasi

**Masalah:** `useDynamicMenus.ts` baris 70: `staleTime: 1000 * 60 * 15`. Permission di-cache 15 menit di React Query.

**Dampak:**
- Admin cabut hak akses user → user masih bisa akses halaman tersebut selama 15 menit
- Admin tambah role baru ke user → butuh 15 menit sebelum berlaku
- Tidak ada mekanisme force-refresh permission dari server side

**Solusi:**
- Tambahkan Supabase Realtime subscription pada tabel `user_permissions` dan `user_roles`
- Saat ada perubahan untuk user yang sedang login → invalidate query `user-effective-permissions`
- Atau: kurangi staleTime menjadi 2-5 menit dengan smart refetch

---

#### 🟠 GAP-RBAC-04: Tidak Ada Audit Trail saat Permission Diubah

**Masalah:** `AdminRoleManagement.tsx` memungkinkan super_admin ubah permission role, tapi tidak ada catatan: siapa mengubah, apa yang diubah, kapan.

**Dampak:** Tidak ada akuntabilitas. Jika ada kebocoran data karena permission yang salah, tidak bisa ditelusuri kapan dan siapa yang salah set.

**Solusi:**
- Tambahkan trigger SQL di tabel `role_permissions` dan `user_permissions` yang menulis ke `admin_activity_log`
- Format log: `{ action: "permission_granted", role: "sales", permission: "finance.read", changed_by: "admin@vinstour.com" }`

---

#### 🟠 GAP-RBAC-05: Sinkronisasi Permission Kode ↔ DB Harus Manual

**Masalah:** Ada 3 tempat yang harus selalu sinkron secara manual:
1. `permissions.ts` — `PERMISSIONS` constant (source of truth kode)
2. `admin-menu-registry.ts` — `RECOMMENDED_MENUS` dan `ROLE_DEFAULT_PERMISSIONS`
3. Database — tabel `role_permissions` dan `menu_items`

Jika developer tambah fitur baru dan tambah permission di `permissions.ts`, mereka **harus ingat** untuk:
- Daftarkan di `RECOMMENDED_MENUS`
- Set default di `ROLE_DEFAULT_PERMISSIONS`
- Jalankan SQL di Supabase untuk update `role_permissions`
- Klik "Menu Sync" di `AdminRBACStatus`

Sering lupa → fitur baru tidak bisa diakses siapapun sampai manual dikonfigurasi.

**Solusi:**
- Buat skrip `db:sync-permissions` yang baca `PERMISSIONS` + `RECOMMENDED_MENUS` dari kode → compare dengan DB → report diff → tanya user mau sync tidak
- Atau: endpoint `POST /api/admin/rbac/sync` yang otomatis sync dari registry ke DB
- Tambahkan test/assertion: jika ada permission di registry yang tidak ada di DB, tampilkan warning di `AdminRBACStatus`

---

#### 🟠 GAP-RBAC-06: Branch-Scoped Permission Tidak Ada

**Masalah:** Semua staff dengan role `operational` bisa lihat data dari SEMUA cabang. Tidak ada pembatasan "staff ini hanya boleh lihat data Cabang Jakarta".

**Dampak:**
- Staff Cabang Surabaya bisa lihat dan edit booking dari Cabang Jakarta
- Branch Manager tidak punya isolasi data antar cabang
- Multi-tenant per cabang tidak aman

**Solusi:**
- Tambahkan kolom `branch_id` di `user_roles` atau buat tabel `user_branch_access`
- RLS policy di semua tabel yang punya `branch_id` harus cek apakah user punya akses ke branch tersebut
- Frontend harus filter data berdasarkan `branchId` dari context auth

---

#### 🟠 GAP-RBAC-07: Permission Agen Tidak Granular

**Masalah:** Semua agen mendapat akses portal `/agent/*` secara sama. Tidak ada perbedaan antara:
- Agen yang hanya bisa lihat booking miliknya sendiri vs semua booking cabang
- Agen yang boleh lihat komisi vs tidak
- Sub-agen yang hanya bisa lihat data parent agent-nya

**Solusi:**
- Buat `agent_permissions` table untuk konfigurasi per-agen
- Portal agen bisa filter data berdasarkan `agent_id` yang tersimpan di auth session

---

#### 🟡 GAP-RBAC-08: Tidak Ada Tool "Simulasi Akses sebagai User X"

**Masalah:** Admin bisa lihat matrix permission per role, tapi tidak bisa melihat "apa yang bisa dilakukan oleh user John Doe dengan override spesifiknya". Jika user komplain tidak bisa akses sesuatu, admin harus menebak-nebak kombinasi role + override.

**Solusi:**
- Tambahkan fitur "Simulasi Akses" di `AdminRBACStatus`
- Admin pilih user → sistem menampilkan list semua menu yang bisa diakses + yang tidak + alasannya
- Tampilkan apakah permission dari role default atau dari user override

---

#### 🟡 GAP-RBAC-09: role `customer` vs `jamaah` — Perbedaan Tidak Jelas

**Masalah:** Ada dua role yang hampir identik: `customer` dan `jamaah`. Keduanya diijinkan di `CustomerRoutes.tsx`. Tidak ada dokumentasi jelas perbedaannya.

Dari `useAuth.tsx`: `isCustomer()` cek `customer || jamaah`. Dari `CustomerRoutes.tsx`: keduanya diijinkan masuk `/jamaah/*`. Dari `permissions.ts`: keduanya tidak ada dalam `ROLE_HIERARCHY` (tidak punya sub-role).

**Solusi:**
- Dokumentasikan perbedaan: `customer` = pernah pesan tapi belum berangkat; `jamaah` = sedang dalam perjalanan/aktif
- Atau: hapus salah satu dan gunakan satu role saja
- Atau: berikan kemampuan berbeda (jamaah bisa akses fitur SOS, customer tidak)

---

#### 🟡 GAP-RBAC-10: Tidak Ada Permission untuk Fitur PWA

**Masalah:** `AdminPWASettings` dilindungi permission `APPEARANCE`. Artinya siapapun yang bisa akses Appearance bisa juga ubah konfigurasi PWA (nama app, ikon, bottom nav). Ini terlalu lebar — marketing yang urus tampilan website tidak perlu mengubah konfigurasi app.

**Solusi:**
- Tambahkan permission baru `PWA_SETTINGS: 'pwa-settings'` di `PERMISSIONS`
- Pisahkan `AdminAppearance` (theme/warna) dan `AdminPWASettings` (konfigurasi app) menjadi permission berbeda
- Update `admin-menu-registry.ts` dan DB

---

#### 🟡 GAP-RBAC-11: Frontend Fallback ke Registry saat DB Offline

**Masalah:** `useDynamicMenus.ts` baris 74-80: jika DB tidak bisa dijangkau atau query gagal, fallback ke `RECOMMENDED_MENUS` (semua menu tersedia). Ini berarti jika Supabase error, semua staff internal otomatis mendapat akses penuh ke semua menu.

**Solusi:**
- Fallback seharusnya return empty atau minimal permission, bukan full access
- Atau: fallback ke permission yang di-cache di localStorage (hasil fetch sukses terakhir)

---

### 17C — Rencana Perbaikan Hak Akses (Berurutan Prioritas)

#### FASE KRITIS — Segera Diperbaiki

| ID | Tugas | File | Estimasi | Prioritas |
|----|-------|------|----------|-----------|
| RBAC-F1 | ✅ **Fix sumber roles** — `useDynamicMenus` baca dari `useAuth().roles` (DONE) | `useDynamicMenus.ts` | 0.25 hari | ✅ Done |
| RBAC-F2 | ✅ **VAPID private key dipindahkan ke secret env** (`VAPID_PRIVATE_KEY`). Edge functions baca dari `Deno.env.get`, client tidak lagi expose privateKey. | `usePWAConfig.ts`, `send-push`, `process-push-queue`, `AdminPushNotifications.tsx` | DONE | ✅ |
| RBAC-F3 | ✅ **Fallback permission ke localStorage cache** — `useDynamicMenus` menyimpan effectiveKeys terakhir & restore saat RPC error. | `useDynamicMenus.ts` | DONE | ✅ |
| RBAC-F4 | ✅ **Realtime invalidation permission** — channel `rbac-realtime-{user.id}` subscribe ke `user_permissions`, `user_roles`, `role_permissions` → `invalidateQueries(['user-effective-permissions'])` (DONE) | `useDynamicMenus.ts` | DONE | ✅ |

#### FASE PENTING — Sprint Berikutnya

| ID | Tugas | File/Tabel | Estimasi |
|----|-------|------------|----------|
| RBAC-P1 | **Audit trail permission changes** — trigger SQL pada `role_permissions` + `user_permissions` ke `admin_activity_log` | SQL migration baru | 0.5 hari |
| RBAC-P2 | **Pisahkan permission `pwa-settings`** dari `appearance` | `permissions.ts` + registry + DB | 0.5 hari |
| RBAC-P3 | **Tool simulasi akses user** — "Lihat akses sebagai user X" di AdminRBACStatus | `AdminRBACStatus.tsx` | 1 hari |
| RBAC-P4 | **Skrip sync permission kode → DB** — deteksi diff, auto-sync dengan konfirmasi | Script baru + endpoint | 1 hari |
| RBAC-P5 | **Dokumentasi `customer` vs `jamaah`** — bersihkan ambiguitas, tambahkan perbedaan fitur yang jelas | `permissions.ts` + `CustomerRoutes.tsx` | 0.5 hari |

#### FASE JANGKA PANJANG — Arsitektur Ulang

| ID | Tugas | Estimasi |
|----|-------|----------|
| RBAC-L1 | **Permission granular read/write/delete** — breaking change, butuh perencanaan migrasi | 3-5 hari |
| RBAC-L2 | **Branch-scoped data isolation** — RLS policy per branch di Supabase | 2-3 hari |
| RBAC-L3 | **Permission granular per agen** — `agent_permissions` table + filter data per agen | 2 hari |

---

### 17D — Checklist Kondisi RBAC yang Sehat

Gunakan checklist ini untuk validasi setelah perbaikan:

```
[ ] Roles user dibaca dari tabel user_roles, bukan auth metadata
[ ] Perubahan permission berlaku dalam < 2 menit (bukan 15 menit)
[ ] Jika DB offline → user mendapat minimum permission, bukan full access
[ ] Setiap perubahan role/permission tercatat di admin_activity_log
[ ] Ada tool simulasi "akses sebagai user X" di panel admin
[ ] VAPID private key tidak ada di kode frontend
[ ] Permission PWA Settings terpisah dari Appearance
[ ] Staff hanya bisa akses data dari branch mereka sendiri
[ ] Diff antara permissions.ts dan DB bisa dideteksi otomatis
[ ] customer vs jamaah memiliki perbedaan fitur yang jelas dan terdokumentasi
```

---

*Analisis PWA dan Hak Akses ini dibuat Mei 2026 berdasarkan pembacaan kode mendalam seluruh sistem. Temuan di atas adalah prioritas teknis yang harus diselesaikan sebelum go-live dengan multi-tenant sesungguhnya.*

---

## BAGIAN 18 — ANALISIS CSS/JS LOADING & FOUC (Flash of Unstyled Content)

> **Tanggal analisis:** Mei 2026 — membaca kode `index.html`, `index.css`, `main.tsx`, `ThemeProvider.tsx`, `useWebsiteSettingsOptimized.ts` secara menyeluruh.
> **Masalah:** Website suka "stuck" ke tampilan default (hijau standar) saat loading pertama — baru berubah ke tema custom setelah beberapa detik.

---

### 18A — Akar Masalah FOUC (Flash of Unstyled Content)

Masalah ini terjadi karena ada **3 lapisan tema** yang bekerja secara berurutan dengan jeda waktu, dan ketiganya tidak selaras:

```
URUTAN RENDER:
  t=0ms   → Browser parse index.html
  t=1ms   → index.css dieksekusi → CSS variables "hijau default" terpasang
  t=5ms   → Script restoration di index.html dijalankan
              (baca localStorage 'website-theme-cache', override CSS variables)
  t=200ms → React mount selesai
  t=300ms → ThemeProvider mount → fetch 'website-settings' dari Supabase/cache
  t=800ms → Data Supabase datang → CSS variables diupdate lagi
  t=850ms → Font custom diinject via <link> baru → font swap visible

Akibat: User bisa melihat 2-3 "flash" perubahan tampilan
```

---

### 18B — GAP KRITIS: Penyebab Flash Satu Per Satu

#### 🔴 CSS-F1: `index.css` Nilai Default Tidak Sinkron dengan `DEFAULT_SETTINGS`

**Masalah:**
- `index.css` baris 24: `--primary: 160 84% 25%` → hijau gelap islamik
- `DEFAULT_SETTINGS` di `useWebsiteSettingsOptimized.ts` baris 115: `primary_color: '160 84% 25%'` → sama ✅

Tapi masalahnya: nilai di `index.css` ini tampil **sebelum** script restoration jalan. Jika localStorage kosong (kunjungan pertama, incognito, cache dibersihkan) → tema default `index.css` tampil dulu sampai Supabase selesai fetch.

**Kondisi yang memicu flash:**
1. Kunjungan pertama (localStorage kosong) → `index.css` → Supabase data → dua flash
2. Admin ubah tema → cache lama di localStorage masih 1 jam → tampil tema lama dulu
3. Supabase lambat (> 1 detik) → index.css default tampil lama sebelum tema custom muncul

---

#### 🔴 CSS-F2: Script Restoration di `index.html` Hanya Restore CSS Variables — Tidak Semua State Tema

**Masalah:** Script restoration di `index.html` baris 43-69 hanya baca `website-theme-cache` dari localStorage dan set CSS variables. Yang **tidak** di-restore:

- `theme-mood` (light/dark/sepia) → komponen yang bergantung `.dark` class tidak mendapat class ini
- `layout-variant` → beberapa komponen baca ini untuk kondisional render
- Font yang custom → font masih pakai fallback sampai React mount dan ThemeProvider inject `<link>` Google Fonts

Akibat: Bahkan saat localStorage ada cache, tampilan masih belum sempurna sampai React selesai mount.

---

#### ✅ CSS-F3 / CSS-FIX-1: Initial Loader Disembunyikan SEBELUM ThemeProvider Selesai Fetch — DONE (event 'theme-ready' + fallback 1.5s)

**Masalah Kritis di `main.tsx` baris 106-116:**
```javascript
const root = createRoot(document.getElementById("root")!);
root.render(<App />);

// Hide loader setelah React render — tapi ThemeProvider belum selesai fetch!
requestAnimationFrame(hideInitialLoader);
```

`requestAnimationFrame` dipanggil segera setelah `root.render()`. Ini berarti initial loader disembunyikan saat **React baru saja mulai render** — ThemeProvider belum mount, belum fetch settings, belum apply tema.

Akibat: User melihat sekilas tampilan "default index.css" sebelum ThemeProvider selesai apply tema custom. Inilah penyebab utama flash.

**Solusi:** Loader baru disembunyikan setelah ThemeProvider konfirmasi tema sudah diapply:
```typescript
// ThemeProvider.tsx — emit event saat tema siap
useEffect(() => {
  if (settings) {
    applyCSSVariables(cssVariables, settings);
    window.dispatchEvent(new Event('theme-ready'));
  }
}, [cssVariables]);

// main.tsx — sembunyikan loader saat tema siap
window.addEventListener('theme-ready', hideInitialLoader, { once: true });
// Fallback: sembunyikan setelah 2 detik walau tema belum siap
setTimeout(hideInitialLoader, 2000);
```

---

#### 🟠 CSS-F4: Cache Settings 1 Jam — Tema Lama Bisa Tampil Lama Setelah Admin Ubah

**Masalah:** `useWebsiteSettingsOptimized.ts` baris 100: `CACHE_DURATION = 1000 * 60 * 60` (1 jam). Saat admin ubah tema, user yang sudah punya cache masih lihat tema lama sampai 1 jam.

Ditambah `staleTime: Infinity` di useQuery → tidak pernah refetch dari network selama sesi browser yang sama.

**Solusi:**
- Kurangi cache ke 10-15 menit, atau
- Tambahkan Supabase Realtime pada tabel `website_settings` → invalidate query saat ada perubahan
- Atau: tampilkan banner "Tema diperbarui, refresh untuk melihat" saat ThemeProvider deteksi versi baru

---

#### 🟠 CSS-F5: Font Swap Setelah React Mount — Visible Text Reflow

**Masalah:** `ThemeProvider.tsx` baris 83-108 inject `<link>` Google Fonts SETELAH React mount. Urutan:
1. Browser render text dengan font fallback (`-apple-system`, Arial)
2. React mount → ThemeProvider inject Google Fonts link
3. Font download selesai → teks reflow ke font custom

User melihat teks "bergeser" atau berubah gaya tiba-tiba.

**Solusi:**
- Preload font custom yang paling umum dipakai di `index.html`
- Atau: tambahkan `font-display: optional` agar browser tidak reflow jika font terlambat
- Atau: simpan nama font di localStorage dan preload dari script restoration

---

#### 🟡 CSS-F6: Dua Versi Hook Settings — `useWebsiteSettings` vs `useWebsiteSettingsOptimized`

**Masalah:** Ada dua hook dengan nama berbeda:
- `useWebsiteSettings.ts` — versi lama
- `useWebsiteSettingsOptimized.ts` — versi baru dengan cache localStorage

Beberapa komponen mungkin masih import dari versi lama → dua query ke Supabase untuk data yang sama → redundan dan bisa menyebabkan race condition.

**Solusi:** Audit seluruh import, hapus versi lama, pastikan semua pakai yang optimized.

---

### 18C — Rencana Perbaikan Loading Performance

| ID | Solusi | File | Estimasi | Dampak |
|----|--------|------|----------|--------|
| CSS-FIX-1 | ✅ **Sembunyikan loader saat tema siap** — event `theme-ready` dari ThemeProvider (DONE) | `main.tsx` + `ThemeProvider.tsx` | 2 jam | ✅ Done |
| CSS-FIX-2 | ✅ **Font cache di localStorage** (`website-fonts-cache`) + restore + Google Fonts `<link>` injected dari script `<head>` (DONE) | `index.html` + `ThemeProvider.tsx` | DONE | ✅ |
| CSS-FIX-3 | ✅ **Realtime invalidation tema** — channel `website-settings-realtime` clear localStorage cache + invalidate query (DONE) | `ThemeProvider.tsx` | DONE | ✅ |
| CSS-FIX-4 | **Kurangi cache ke 5 menit** + staleTime 2 menit | `useWebsiteSettingsOptimized.ts` | 0.5 jam | 🟡 Perubahan admin cepat berlaku |
| CSS-FIX-5 | **Audit dan hapus `useWebsiteSettings.ts` lama** — semua pakai yang optimized | Seluruh codebase | 1 jam | 🟡 Hapus redundan |
| CSS-FIX-6 | **Critical CSS inline di `<head>`** — untuk warna utama yang diambil dari localStorage, inject `<style>` tag langsung dari script restoration | `index.html` | 3 jam | 🟠 Eliminasi flash index.css |

---

### 18D — Diagram: Alur Loading yang Ideal Setelah Perbaikan

```
t=0ms    HTML parse dimulai
t=1ms    Script restoration berjalan:
           - Baca CSS vars dari localStorage → apply ke :root
           - Baca font-name dari localStorage → inject <link> preload
           - Baca warna utama → inject <style> inline untuk loader color
t=5ms    index.css dieksekusi (vars sudah dioverride, tidak ada flash)
t=10ms   React script download dimulai (non-blocking)
t=200ms  React mount dimulai
t=250ms  ThemeProvider mount:
           - Jika cache valid → apply langsung, emit 'theme-ready'
           - Jika cache expired → apply cache dulu, fetch Supabase background
t=260ms  'theme-ready' event → loader disembunyikan (tema sudah benar)
t=800ms  (background) Supabase data datang → update cache, apply jika berbeda
```

---

## BAGIAN 19 — ANALISIS SISTEM AGEN (MITRA)

> **Tanggal analisis:** Mei 2026 — membaca kode `AgentRoutes`, semua halaman `src/pages/agent/`, hooks agen, dan sistem komisi.

---

### 19A — Yang Sudah Ada di Portal Agen

| Fitur | File/Halaman | Status | Keterangan |
|-------|-------------|--------|------------|
| Dashboard agen | `AgentDashboard.tsx` | ✅ | KPI, chart komisi, booking terbaru |
| Manajemen komisi | `AgentCommissions.tsx` | ✅ | Riwayat, status, export Excel/PDF |
| Dompet (wallet) | `AgentWallet.tsx` | ✅ | Saldo, transaksi, tarik saldo |
| CRM Leads | `AgentLeads.tsx` | ✅ | Kanban pipeline: Baru→Booking |
| Jaringan sub-agen | `AgentNetwork.tsx` | ✅ | MLM hingga 4 level, royalty |
| Website agen | `AgentWebsiteSettings.tsx` | ✅ | Subdomain, branding, testimonial |
| Link unik & QR | `AgentUniqueLink.tsx` | ✅ | Referral link + QR code generator |
| Pelatihan | `AgentTraining.tsx` | ⚠️ | Video/PDF + kuis — tabel mungkin belum ada |
| Leaderboard | `AgentLeaderboard.tsx` | ✅ | Ranking agen + title (Diamond, Master) |
| Keanggotaan | `AgentMembership.tsx` | ✅ | Plan + approval admin |
| Daftar Jamaah | `AgentJamaahEnhanced.tsx` | ✅ | Jamaah yang dirujuk agen |
| Broadcast WA | `AgentBroadcast.tsx` | ✅ | Blast pesan ke jamaah referral |
| Digital Kit | `AgentDigitalKit.tsx` | ✅ | Materi marketing siap pakai |
| Laporan bulanan | `AgentLaporan.tsx` | ✅ | Resume performa per bulan |
| Daftar paket | `AgentPackages.tsx` | ✅ | Lihat paket yang bisa dijual |
| Target penjualan | `AgentTargets.tsx` | ✅ | Set dan pantau target |
| Referral grup | `AgentRegisterGroup.tsx` | ✅ | Daftar grup jamaah sekaligus |
| Auto komisi | `useAutoCommission.ts` | ✅ | Hitung otomatis saat booking |

---

### 19B — GAP DAN KEKURANGAN SISTEM AGEN

#### 🔴 AGEN-F1: Tarik Saldo (Withdrawal) Belum Terintegrasi dengan Sistem Pembayaran

**Masalah:** `AgentWallet.tsx` punya form input withdrawal dan tombol "Ajukan Penarikan", tapi:
- Tidak ada integrasi dengan payment gateway (transfer bank otomatis)
- Admin harus proses manual → konfirmasi via UI admin
- Tidak ada validasi rekening bank yang disimpan di profil agen
- Tidak ada fee/biaya penarikan yang bisa dikonfigurasi

**Dampak:** Proses penarikan menjadi manual dan rawan error. Agen harus menunggu konfirmasi manual admin.

**Solusi:**
- Tambahkan field `bank_name`, `bank_account_number`, `bank_account_name` di tabel `agents`
- Buat halaman "Rekening Bank" di pengaturan agen
- Admin bisa konfirmasi + input bukti transfer dari panel admin
- Notifikasi otomatis ke agen saat withdrawal diproses

---

#### 🔴 AGEN-F2: Tabel `agent_trainings` Mungkin Tidak Ada di Semua Environment

**Masalah:** `AgentTraining.tsx` ada error handler untuk `42P01` (table does not exist). Artinya halaman ini pernah error di beberapa environment karena tabel `agent_trainings`, `training_quizzes`, `agent_quiz_results` belum di-migrate.

**Dampak:** Agen membuka halaman Pelatihan → tampil error atau halaman kosong → kesan profesional menurun.

**Solusi:**
- Pastikan migration tabel training ada di `sql/migrations/`
- Tambahkan seed data: minimal 1 video pelatihan default
- Graceful error state: "Konten pelatihan sedang dipersiapkan" bukan error mentah

---

#### 🟠 AGEN-F3: Website Agen Tidak Terindeks SEO Secara Efektif

**Masalah:** `AgentWebsiteSettings.tsx` memungkinkan agen punya halaman personal (`/agent-site/:slug`). Tapi:
- Halaman ini di-render client-side (SPA) → Google sulit index
- Meta tag diupdate via JavaScript → tidak terlihat crawler
- Tidak ada sitemap yang memasukkan halaman agen

**Solusi:**
- Buat endpoint di Express: `GET /s/:slug` yang serve HTML dengan meta tag dari DB (SSR minimal)
- Atau: tambahkan `<noscript>` tag dengan konten dasar untuk crawler

---

#### 🟠 AGEN-F4: Sub-Agen Tidak Bisa Lihat Referral Mereka Sendiri

**Masalah:** Berdasarkan eksplorasi, `sub_agent` di-exclude dari modul komisi dan wallet. Tapi sub-agen juga punya jamaah yang mereka rujuk — mereka tidak bisa lihat siapa saja jamaah mereka.

**Solusi:**
- Buat halaman "Jamaah Saya" yang accessible oleh `sub_agent` (filter hanya milik mereka)
- Berikan summary komisi sub-agen (meski dibayar via parent agent)

---

#### 🟠 AGEN-F5: Tidak Ada Notifikasi Real-time ke Agen

**Masalah:** Agen tidak mendapat notifikasi saat:
- Booking dari referral mereka berubah status
- Komisi diapprove/ditolak admin
- Ada lead baru masuk dari link referral mereka

Agen harus buka portal dan refresh manual.

**Solusi:**
- Push notification via PWA saat booking/komisi update
- In-app notification bell di `AgentLayoutEnhanced`
- Email notifikasi otomatis

---

#### 🟡 AGEN-F6: Leaderboard Tidak Real-time

**Masalah:** `AgentLeaderboard.tsx` menampilkan ranking agen berdasarkan data dari query biasa — tidak ada Supabase Realtime. Ranking bisa "basi" sampai user refresh.

**Solusi:** Tambahkan Supabase Realtime pada query leaderboard, atau auto-refresh setiap 5 menit.

---

#### 🟡 AGEN-F7: Tidak Ada Tool Simulasi Komisi

**Masalah:** Agen tidak bisa menghitung berapa komisi yang akan mereka dapat jika berhasil booking paket X. Harus tunggu booking aktual.

**Solusi:**
- Tambahkan "Kalkulator Komisi" di dashboard agen
- Input: pilih paket, jumlah orang → output: estimasi komisi + royalty jika ada sub-agen

---

#### 🟡 AGEN-F8: CRM Leads Tidak Terhubung ke Booking Otomatis

**Masalah:** Saat lead di Kanban berpindah ke stage "Booking", tidak ada link langsung ke form booking admin. Agen harus minta admin buka booking manual.

**Solusi:**
- Dari card lead "Booking" → bisa generate link booking publik yang otomatis isi data customer
- Atau: agen bisa submit booking draft langsung dari portal agen (perlu approval admin)

---

### 19C — Fitur Agen yang Harus Ditambahkan

| ID | Fitur | Prioritas | Estimasi |
|----|-------|-----------|----------|
| AGEN-ADD1 | ✅ **Manajemen rekening bank** — form bank di AgentSettings (Nama Bank/No. Rek/Pemilik) (DONE) | ✅ Done | 1 hari |
| AGEN-ADD2 | ✅ **Migration training_modules + training_quizzes + agent_training_progress** dengan RLS & seed 3 modul + 2 quiz. | DONE | ✅ |
| AGEN-ADD3 | **Notifikasi real-time agen** — push notification + in-app bell | 🟠 Penting | 2 hari |
| AGEN-ADD4 | **Halaman Jamaah untuk sub-agen** — filter data milik sub-agen | 🟠 Penting | 1 hari |
| AGEN-ADD5 | **Kalkulator komisi** — estimasi sebelum booking | 🟡 Sedang | 1 hari |
| AGEN-ADD6 | **Link booking dari lead CRM** — langsung generate link dari lead | 🟡 Sedang | 1 hari |
| AGEN-ADD7 | **SSR/meta tag untuk website agen** — SEO friendly | 🟡 Sedang | 2 hari |
| AGEN-ADD8 | **Leaderboard real-time** — auto-refresh atau Supabase Realtime | 🟢 Rendah | 0.5 hari |

---

## BAGIAN 20 — ANALISIS SISTEM CABANG (MULTI-BRANCH)

> **Tanggal analisis:** Mei 2026 — membaca kode `BranchRoutes`, `BranchDashboard`, `BranchLayout`, semua halaman branch, hooks `useBranchCommissions`, dan penggunaan `branch_id` di seluruh codebase.

---

### 20A — Yang Sudah Ada di Sistem Cabang

| Komponen | File | Status | Keterangan |
|----------|------|--------|------------|
| Portal Branch Manager | `/cabang/*` | ✅ | Dashboard, booking, agen, laporan, diskon |
| Dashboard KPI cabang | `BranchDashboard.tsx` | ✅ | Revenue, booking, agen, jamaah bulanan |
| Booking per cabang | `BranchBookings.tsx` | ✅ | Filter `branch_id` |
| Manajemen agen cabang | `BranchAgen.tsx` | ✅ | Performa agen per cabang |
| Laporan keuangan cabang | `BranchLaporan.tsx` | ✅ | Revenue reporting per cabang |
| Approval diskon | `BranchDiskon.tsx` | ✅ | Workflow approval discount request |
| Website cabang | `BranchWebsiteSettings.tsx` | ✅ | Mikrosait per cabang dengan slug |
| Website publik cabang | `BranchWebsite.tsx` (/b/:slug) | ✅ | Landing page publik per cabang |
| Manajemen cabang (admin) | `AdminBranches.tsx` | ✅ | CRUD cabang oleh super_admin |
| Komisi cabang | `useBranchCommissions.ts` | ✅ | Auto-hitung komisi cabang per booking |
| `branch_id` di bookings | DB | ✅ | Setiap booking terhubung ke cabang |
| `branch_id` di agents | DB | ✅ | Agen terhubung ke cabang |
| `branch_id` di customers | DB | ✅ | Customer terhubung ke cabang |
| `branch_id` di user_roles | DB | ✅ | Role dibatasi per cabang |
| `branch_id` di website_settings | DB | ✅ | Branding per cabang |

---

### 20B — GAP KRITIS SISTEM CABANG

#### 🔴 CAB-F1: Isolasi Data Antar Cabang Bergantung pada Query Filter, Bukan RLS

**Masalah Serius:** Seluruh isolasi data antar cabang dilakukan di level **query filter** di frontend/backend:
```typescript
// BranchDashboard.tsx baris 48
supabase.from("bookings").select(...)
  .eq("branch_id", bId)  // ← filter manual, bukan RLS
```

Ini berarti:
- Jika ada bug di kode dan filter `branch_id` terlewat → data lintas cabang bisa bocor
- Jika ada query langsung ke Supabase tanpa filter → semua data dari semua cabang keluar
- Tidak ada jaminan di level database bahwa branch manager hanya bisa akses data cabangnya

**Solusi yang Benar:** Row Level Security (RLS) di Supabase:
```sql
-- Policy untuk branch_manager
CREATE POLICY "Branch manager can only see own branch bookings"
ON bookings FOR ALL
USING (
  branch_id = (
    SELECT branch_id FROM user_roles 
    WHERE user_id = auth.uid() AND role = 'branch_manager'
    LIMIT 1
  )
  OR auth.uid() IN (SELECT user_id FROM user_roles WHERE role IN ('super_admin', 'owner'))
);
```

---

#### 🔴 CAB-F2: Branch Manager Tidak Bisa Kelola Staff Sendiri

**Masalah:** Branch manager hanya bisa lihat agen di cabangnya. Tapi tidak bisa:
- Tambah/hapus staff cabang (operational, sales, marketing) di cabangnya
- Assign role ke user baru di cabangnya sendiri
- Lihat dan kelola permission staff cabangnya

Semua manajemen staff/role harus minta super_admin.

**Solusi:**
- Tambahkan halaman "Staff Cabang" di portal `/cabang`
- Branch manager bisa invite user dengan role `operational/sales/marketing` yang scope-nya ke cabangnya
- Super_admin set batas: role apa yang bisa diberikan branch manager

---

#### 🔴 CAB-F3: Tidak Ada Perbandingan Performa Antar Cabang

**Masalah:** Super_admin dan owner tidak punya tampilan yang membandingkan performa semua cabang sekaligus. Harus buka satu per satu di `AdminBranches`.

**Dampak:** Tidak bisa dengan cepat melihat cabang mana yang underperform atau overperform.

**Solusi:**
- Tambahkan halaman "Perbandingan Cabang" di admin panel
- Tampilkan: revenue, booking, agen aktif, jamaah per cabang dalam satu tabel/chart
- Filter: periode bulan/tahun

---

#### 🟠 CAB-F4: Website Cabang Tidak Ada Preview Mode di Admin

**Masalah:** `BranchWebsiteSettings.tsx` memungkinkan branch manager ubah tampilan website cabang mereka. Tapi tidak ada preview real-time sebelum simpan.

**Solusi:** Tambahkan iframe preview `/b/:slug?preview=true` di halaman settings.

---

#### 🟠 CAB-F5: Laporan Cabang Tidak Bisa Di-export

**Masalah:** `BranchLaporan.tsx` menampilkan data keuangan cabang, tapi tidak ada tombol export ke Excel/PDF.

**Solusi:** Tambahkan export menggunakan library yang sudah dipakai di admin (xlsx, pdf-lib).

---

#### 🟠 CAB-F6: Tidak Ada Notifikasi ke Branch Manager

**Masalah:** Branch manager tidak mendapat notifikasi saat:
- Ada booking baru di cabangnya
- Ada request diskon yang perlu diapprove
- Revenue bulanan mencapai/melewati target

**Solusi:**
- Push notification PWA untuk branch manager
- Daily summary email per cabang

---

#### 🟡 CAB-F7: `BranchDashboard` Hanya Tampilkan Data Bulan Ini

**Masalah:** Dashboard cabang hanya menampilkan data bulan berjalan (`startOfMonth` → `endOfMonth`). Tidak ada filter periode atau perbandingan dengan bulan lalu.

**Solusi:** Tambahkan date range picker dan perbandingan MoM (Month over Month).

---

#### 🟡 CAB-F8: Tidak Ada Sistem Transfer Data/Booking Antar Cabang

**Masalah:** Jika jamaah ingin pindah ke cabang lain, tidak ada mekanisme resmi. Admin harus edit `branch_id` di database secara manual.

**Solusi:** Buat fitur "Transfer Booking ke Cabang Lain" di admin panel dengan approval flow.

---

### 20C — Fitur Cabang yang Harus Ditambahkan

| ID | Fitur | Prioritas | Estimasi |
|----|-------|-----------|----------|
| CAB-ADD1 | **RLS per cabang** — policy Supabase agar isolasi data dijamin di DB level | 🔴 Kritis | 2 hari |
| CAB-ADD2 | ✅ **Manajemen staff cabang** — `/cabang/staff` page, assign role staff existing user via email (DONE) | ✅ Done | 2 hari |
| CAB-ADD3 | ✅ **Dashboard perbandingan cabang** — `/admin/branches/comparison` (KPI, bar chart, ranking) (DONE) | ✅ Done | 1.5 hari |
| CAB-ADD4 | ✅ **Export laporan cabang** — sudah tersedia di BranchLaporan (xlsx + jsPDF autoTable) (DONE) | ✅ Done | 0.5 hari |
| CAB-ADD5 | **Notifikasi branch manager** — booking baru + approval request | 🟠 Penting | 1 hari |
| CAB-ADD6 | **Preview website cabang** — iframe preview sebelum simpan | 🟡 Sedang | 0.5 hari |
| CAB-ADD7 | **Date range di dashboard cabang** — filter periode custom | 🟡 Sedang | 0.5 hari |
| CAB-ADD8 | **Transfer booking antar cabang** — dengan approval flow | 🟡 Sedang | 1 hari |

---

## BAGIAN 21 — ANALISIS KEANGGOTAAN & LOYALITAS

> **Tanggal analisis:** Mei 2026 — membaca `MyLoyalty.tsx`, `JamaahBadges.tsx`, `AgentMembership.tsx`, `useMemberships.ts`, `useLoyalty.ts`, `MySavings.tsx`, `JamaahDigitalID.tsx`.

---

### 21A — Ekosistem Loyalitas dan Keanggotaan (Yang Sudah Ada)

**Tiga Lapisan Sistem:**

```
LAPISAN 1: LOYALITAS JAMAAH (Customer)
  • Poin Loyalitas: 1 poin per Rp 100.000 pembayaran
  • Tier: Silver (0-999) → Gold (1000-4999) → Platinum (5000+)
  • Redeem: Tukar poin dengan reward dari katalog
  • Gamifikasi: Badge + XP (Musafir → Haji Mabrur Lv4)
  • Digital ID: QR code + info perjalanan
  • Jurnal Ibadah, Tracker, Badges

LAPISAN 2: KEANGGOTAAN AGEN (B2B)
  • Membership Plan: unlock fitur + komisi lebih tinggi
  • Approval admin untuk membership agen
  • Leaderboard dengan title (Diamond, Master Seller)
  • Royalty sub-agen (multi-level)

LAPISAN 3: TABUNGAN (Savings)
  • Program tabungan untuk calon jamaah
  • Target jumlah + tenor cicilan
  • Tracking progress bayar
  • Admin monitor semua tabungan aktif
```

---

### 21B — GAP KRITIS SISTEM LOYALITAS

#### ✅ LOY-F1: Poin Loyalitas Tidak Dihitung Secara Otomatis — DONE

**Masalah:** `MyLoyalty.tsx` menampilkan data dari tabel `loyalty_points` dan `loyalty_transactions`, tapi tidak ada hook atau trigger yang otomatis menambah poin saat jamaah melakukan pembayaran.

Tidak ditemukan `useAutoLoyalty.ts` atau trigger Supabase yang terhubung ke tabel `payments`/`bookings`.

**Dampak:** Poin harus ditambah manual oleh admin → tidak scalable → sistem loyalitas tidak berjalan secara nyata.

**Solusi:**
- Buat Supabase trigger: `AFTER INSERT ON payments WHERE status = 'confirmed'` → hitung poin (total_amount / 100000) → insert ke `loyalty_transactions`
- Atau: di backend Express, setelah konfirmasi pembayaran → otomatis hitung dan kredit poin
- Tambahkan hook `useAutoLoyaltyCredit` yang dipanggil dari payment confirmation flow

---

#### ✅ LOY-F2: Benefit Tier Tidak Nyata — DONE (Silver 0%/Gold 2%/Platinum 5% diskon di booking wizard)

**Masalah:** Tier Silver/Gold/Platinum ada di `TIER_CONFIG`, tapi tidak ada implementasi benefit nyata:
- Silver/Gold/Platinum mendapat diskon berapa? → tidak terdefinisi di kode
- Apakah Platinum mendapat priority support? → tidak ada implementasi
- Apakah tier mempengaruhi komisi agen? → tidak ada koneksi
- Apakah ada akses fitur eksklusif per tier? → tidak ada

**Dampak:** Tier hanya label — tidak ada incentif nyata untuk jamaah naik tier.

**Solusi:**
- Definisikan benefit tier di DB: `loyalty_tier_benefits` table
- Contoh benefit: `gold → diskon 2% untuk booking berikutnya`, `platinum → gratis biaya administrasi`
- Terapkan benefit saat booking: baca tier customer → hitung diskon otomatis

---

#### 🔴 LOY-F3: Badge Gamifikasi Tidak Terhubung ke Aktivitas Nyata

**Masalah:** `JamaahBadges.tsx` tampilkan badge dan XP, tapi tidak ada trigger otomatis yang memberikan badge saat jamaah benar-benar melakukan aktivitas:
- Badge "Thawaf Perdana" → tidak ada sistem yang verifikasi jamaah sudah thawaf
- Badge "Jamaah Digital" → tidak ada trigger saat jamaah download Digital ID
- Badge "Lunas Pelunasan" → tidak ada koneksi ke tabel `payments`

Badge tampaknya diberikan manual atau sepenuhnya fiksi.

**Solusi:**
- Definisikan trigger per badge: event → grant badge
- Contoh yang bisa diimplementasi: "Jamaah Digital" saat buka `/jamaah/digital-id` pertama kali
- "Lunas Pembayaran" saat payment status jadi `paid` pertama kali
- "Pengguna Setia" setelah 30 hari aktif di portal

---

#### 🟠 LOY-F4: Tidak Ada Expiry untuk Poin Loyalitas

**Masalah:** Tidak ada mekanisme poin kedaluwarsa. Poin terakumulasi selamanya tanpa batas waktu.

**Dampak:** Jangka panjang, liability besar jika semua poin di-redeem sekaligus.

**Solusi:**
- Tambahkan `expires_at` di `loyalty_transactions`
- Poin kedaluwarsa setelah 1 tahun tidak aktif
- Notifikasi 30 hari sebelum poin kedaluwarsa

---

#### 🟠 LOY-F5: Keanggotaan Agen Tidak Otomatis Naik Tier

**Masalah:** `AgentMembership.tsx` — agen harus daftar manual ke plan membership dan tunggu approval admin. Tidak ada sistem yang otomatis naik tier berdasarkan performa (misalnya: setelah 10 booking → otomatis Gold).

**Solusi:**
- Buat aturan auto-upgrade: jika total booking agen bulan ini > X → otomatis naik ke plan Y
- Notifikasi ke agen: "Selamat! Anda naik ke status Gold Agent"

---

#### 🟠 LOY-F6: Tabungan (Savings) Tidak Ada Reminder Pembayaran

**Masalah:** `MySavings.tsx` menampilkan progress tabungan, tapi tidak ada sistem yang mengingatkan calon jamaah untuk bayar cicilan tepat waktu.

**Solusi:**
- Buat job scheduler di backend yang cek tabungan jatuh tempo
- Kirim notifikasi push + WhatsApp 3 hari sebelum tanggal cicilan
- Tampilkan "cicilan jatuh tempo X hari lagi" di dashboard jamaah

---

#### 🟡 LOY-F7: Reward Katalog Tidak Ada Gambar Default

**Masalah:** Reward di `loyalty_rewards` table punya `image_url` tapi bisa null. Tampilan reward tanpa gambar tidak menarik.

**Solusi:** Tambahkan default gambar per kategori reward, atau placeholder menarik.

---

#### 🟡 LOY-F8: Digital ID Belum Bisa Di-download sebagai Gambar

**Masalah:** `JamaahDigitalID.tsx` menampilkan kartu digital yang bagus, tapi tidak ada tombol "Download sebagai PNG/PDF" untuk disimpan di galeri.

**Solusi:** Gunakan library `html-to-image` atau `canvas` untuk export kartu sebagai gambar yang bisa di-save.

---

### 21C — Rencana Perbaikan Loyalitas

| ID | Fitur | Prioritas | Estimasi |
|----|-------|-----------|----------|
| LOY-FIX1 | **Auto-hitung poin** — trigger DB atau backend hook setelah payment confirmed | 🔴 Kritis | 1 hari |
| LOY-FIX2 | **Implementasi benefit tier nyata** — diskon/keistimewaan yang berlaku di booking | 🔴 Penting | 2 hari |
| LOY-FIX3 | ✅ **Trigger badge otomatis** — tabel jamaah_badges + 5 trigger DB (first payment, tier gold/platinum, savings, booking confirmed, dokumen lengkap) (DONE) | ✅ Done | 1.5 hari |
| LOY-FIX4 | ✅ **Reminder tabungan** — edge function `check-savings-reminders` + pg_cron harian (H-3 + overdue, push + WA outbox) (DONE) | ✅ Done | 1.5 hari |
| LOY-FIX5 | **Auto-upgrade keanggotaan agen** — berdasarkan performa booking | 🟡 Sedang | 1 hari |
| LOY-FIX6 | **Download Digital ID** — export kartu sebagai gambar | 🟡 Sedang | 0.5 hari |
| LOY-FIX7 | **Expiry poin loyalitas** — poin kedaluwarsa + notifikasi | 🟡 Sedang | 1 hari |
| LOY-FIX8 | **Gambar reward katalog** — default image + upload UI | 🟢 Rendah | 0.5 hari |

---

## BAGIAN 22 — FITUR PENTING YANG HARUS DITAMBAHKAN

> Berdasarkan analisis menyeluruh seluruh sistem (PWA, RBAC, CSS Loading, Agen, Cabang, Loyalitas), berikut adalah fitur-fitur yang paling kritis untuk ditambahkan agar sistem berjalan sebagaimana mestinya.

---

### 22A — FITUR KEAMANAN (Harus Sebelum Go-Live)

| # | Fitur | Alasan Kritis |
|---|-------|---------------|
| 1 | **RLS per cabang di Supabase** | Saat ini isolasi data antar cabang hanya di query filter — bisa bocor jika ada bug |
| 2 | **Hapus VAPID private key dari frontend** | Security vulnerability — hacker bisa kirim push notification palsu |
| 3 | **Manifest.json dinamis** (`/api/manifest.json`) | Tanpa ini, multi-tenant tidak berjalan — semua cabang punya nama/ikon sama |
| 4 | **Audit trail perubahan permission** | Tidak ada akuntabilitas siapa mengubah hak akses siapa |
| 5 | **Fallback permission minimal** (bukan full access) saat DB offline | Keamanan: jangan beri full access saat sistem error |

---

### 22B — FITUR OPERASIONAL (Sprint Berikutnya)

| # | Fitur | Dampak Bisnis |
|---|-------|---------------|
| 6 | **Auto-hitung poin loyalitas** | Sistem loyalitas tidak berjalan tanpa ini — poin tidak bertambah otomatis |
| 7 | **Benefit tier nyata** (diskon/keistimewaan) | Tier hanya label saat ini — tidak ada insentif naik tier |
| 8 | **Manajemen rekening bank agen** | Proses penarikan komisi masih manual 100% |
| 9 | **Notifikasi real-time** (agen, branch manager, jamaah) | Semua pihak harus refresh manual untuk tahu ada perubahan |
| 10 | **Reminder cicilan tabungan** | Jamaah lupa bayar → program tabungan gagal |

---

### 22C — FITUR UX (Meningkatkan Pengalaman Pengguna)

| # | Fitur | Dampak UX |
|---|-------|-----------|
| 11 | **Fix FOUC** — sembunyikan loader setelah tema siap | Website terlihat profesional — tidak ada flash tampilan default |
| 12 | **Download Digital ID sebagai gambar** | Jamaah bisa share di sosmed, meningkatkan brand awareness |
| 13 | **Dashboard perbandingan cabang** | Owner/owner bisa monitor semua cabang dalam 1 layar |
| 14 | **Preview website cabang sebelum simpan** | Hindari salah publish tampilan |
| 15 | **Export laporan cabang** (Excel/PDF) | Branch manager butuh laporan untuk rapat |

---

### 22D — FITUR JANGKA MENENGAH (1-3 Bulan)

| # | Fitur | Nilai Tambah |
|---|-------|--------------|
| 16 | **Kalkulator komisi agen** | Agen bisa estimasi pendapatan sebelum target |
| 17 | **Trigger badge gamifikasi otomatis** | Gamifikasi jadi nyata, bukan dekorasi |
| 18 | **Auto-upgrade tier keanggotaan agen** | Reward performa otomatis → motivasi agen |
| 19 | **Simulasi akses "sebagai user X"** di admin RBAC | Admin bisa debug permission tanpa trial-error |
| 20 | **Tool sync permission kode ↔ DB** | Hindari permission baru yang lupa di-seed ke DB |

---

### 22E — FITUR JANGKA PANJANG (3-6 Bulan, Arsitektur Ulang)

| # | Fitur | Catatan |
|---|-------|---------|
| 21 | **Permission granular read/write/delete** | Breaking change — butuh migrasi data besar |
| 22 | **SSR/SSG untuk website agen dan cabang** | Untuk SEO yang proper |
| 23 | **Integrasi pembayaran otomatis untuk withdrawal agen** | Perlu integrasi bank/payment gateway |
| 24 | **SISKOHAT Kemenag integration** (sudah ada permission, belum ada UI) | Butuh kerjasama dengan API Kemenag |
| 25 | **AI Chatbot untuk jamaah** — tanya jawab ibadah umroh/haji | Implementasi Gemini AI yang sudah ada permission-nya |

---

### 22F — RINGKASAN PRIORITAS KESELURUHAN

```
🔴 KRITIS (Harus sebelum go-live produksi):
   • RLS per cabang di Supabase
   • Hapus VAPID private key dari frontend  
   • Manifest.json dinamis
   • Fix FOUC (sembunyikan loader setelah tema siap)
   • Auto-hitung poin loyalitas

🟠 PENTING (Sprint berikutnya, 2-4 minggu):
   • Benefit tier loyalitas yang nyata
   • Manajemen rekening bank agen
   • Notifikasi real-time (agen + branch manager)
   • Reminder cicilan tabungan
   • Audit trail permission
   • Branch manager kelola staff sendiri
   • Dashboard perbandingan cabang
   • Fix sumber roles di useDynamicMenus

🟡 SEDANG (1-2 bulan):
   • Download Digital ID sebagai gambar
   • Trigger badge otomatis
   • Export laporan cabang
   • Kalkulator komisi agen
   • Auto-upgrade tier agen
   • Preview website cabang/agen sebelum simpan

🟢 RENDAH (Roadmap 3+ bulan):
   • Permission granular read/write/delete
   • SSR untuk website agen/cabang
   • SISKOHAT Kemenag
   • AI Chatbot jamaah
   • Integrasi withdrawal otomatis
```

---

*Analisis Bagian 18-22 selesai Mei 2026. Total gap teridentifikasi: 50+ item di 5 area sistem. Prioritas kritis berjumlah 5 item yang harus diselesaikan sebelum go-live produksi.*

---

## BAGIAN 23 — ANALISIS SISTEM PAKET (UMROH, HAJI, WISATA, TABUNGAN)

> **Tanggal analisis:** Mei 2026 — membaca kode `RegularPackageForm.tsx`, `AdminPackages.tsx`, `PackageDetail.tsx`, `PackageBookingFormSimple.tsx`, `format.ts`, dan database schema `packages` + `departures`.

---

### 23A — Arsitektur Sistem Paket Saat Ini

**Dua tabel inti yang memisahkan Template vs Jadwal:**

```
TABEL packages (Template / Master Paket)
  ├── id, code, name
  ├── package_type_id → FK ke package_types (dinamis dari DB)
  ├── package_type (enum hardcoded): umroh | umroh_plus | haji | haji_plus | tabungan
  ├── duration_days, description, includes, excludes, itinerary (JSON)
  ├── featured_image, is_active, is_featured
  ├── currency (field ada di DB, default IDR) ← PENTING
  ├── savings_target (untuk tipe tabungan)
  ├── fee_branch, fee_agent, fee_sub_agent, fee_referral (PIC Fee)
  ├── hotel_makkah_id, hotel_madinah_id, airline_id (default per paket)
  └── price_quad, price_triple, price_double, price_single (harga default/legacy)

TABEL departures (Jadwal Keberangkatan per Paket)
  ├── id, package_id → FK ke packages
  ├── departure_date, return_date, month (bisa hanya bulan saja)
  ├── quota, booked_count, status (open/closed/cancelled)
  ├── airline_id, hotel_makkah_id, hotel_madinah_id (override per jadwal)
  ├── price_quad, price_triple, price_double, price_single (OVERRIDE harga per jadwal)
  ├── price_adult, price_child, price_infant (harga per tipe penumpang)
  ├── break_even_pax, operational_cost_per_pax (analisis keuangan)
  ├── document_deadline, payment_deadline, visa_deadline
  └── muthawif_id, team_leader_id
```

**Tipe Paket yang Tersedia:**

| Kode | Label | Keterangan |
|------|-------|------------|
| `umroh` | Umroh | Paket umroh standar — IDR |
| `umroh_plus` | Umroh Plus | Umroh + kunjungan kota lain — IDR |
| `haji` | Haji Reguler | Haji biasa (antre) — **bisa USD** |
| `haji_plus` | Haji Plus | Haji plus (ONH Plus) — **USD dominan** |
| `tabungan` | Tabungan Umroh | Cicilan jangka panjang — IDR |
| *(custom)* | Wisata Religi, dll | Dari tabel `package_types` dinamis |

---

### 23B — GAP KRITIS SISTEM PAKET

#### ✅ PAK-F1: Multi-Currency Ada di DB Tapi TIDAK Diimplementasikan di Frontend — DONE (formatCurrency locale-aware)

**Ini gap paling kritis yang diminta untuk dianalisis.**

**Bukti di DB:** Tabel `packages` punya kolom `currency` (default `IDR`). Field ini ada di TypeScript types di `supabase/types.ts`.

**Bukti di kode:** `format.ts` baris 3-10 — fungsi `formatCurrency` sudah support parameter `currency`:
```typescript
export function formatCurrency(amount: number, currency: string = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,  // ← Sudah support multi-currency!
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
```

**Tapi di SEMUA tempat yang memanggil `formatCurrency`, tidak ada yang pass currency selain IDR:**
- `AdminPackages.tsx` → `formatCurrency(price)` (tanpa currency, default IDR)
- `PackageDetail.tsx` → `formatCurrency(price)` (IDR)
- `BookingWizard` semua steps → `formatCurrency(total)` (IDR)
- `AgentCommissions.tsx` → `formatCurrency(amount)` (IDR)
- `BranchLaporan.tsx` → `formatCurrency(revenue)` (IDR)

**Masalah Nyata untuk Paket Haji:**
- Haji Plus (ONH Plus) harganya biasanya dalam **USD** (mulai USD 8.000-15.000)
- Nilai rupiah berubah terhadap dolar setiap hari
- Admin set harga USD di DB, tapi tampil di frontend sebagai "Rp 8.000" bukan "$8,000"
- Tidak ada konversi kurs, tidak ada rate USD→IDR

**Dampak:** Harga Haji Plus tampil salah total. Paket yang seharusnya "USD 12.000" tampil sebagai "Rp 12.000" — terlihat sangat murah dan menyesatkan.

---

#### ✅ PAK-F2: `RegularPackageForm` Field Currency — DONE (Select IDR/USD/SAR/EUR/MYR di Info Dasar)

**Masalah:** Form pembuatan paket (`RegularPackageForm.tsx`) tidak punya field untuk memilih mata uang. Zod schema tidak mencantumkan `currency`. Artinya:
- Admin tidak bisa set currency saat buat paket Haji
- Semua paket baru selalu IDR
- Tidak ada dropdown: IDR / USD / SAR (Saudi Riyal)

**Solusi yang Dibutuhkan:**
```
Tambahkan di RegularPackageForm:
  - Select "Mata Uang": IDR | USD | SAR | EUR
  - Ketika currency = USD atau SAR → sembunyikan harga IDR
  - Tampilkan field "Kurs Saat Ini" (bisa manual input atau ambil dari API)
  - Harga final = jumlah_currency × kurs
```

---

#### ✅ PAK-F3: Currency di Departure — N/A (currency live di tingkat package; departure mewarisi via FK)

**Masalah:** Harga real per jadwal keberangkatan ada di `DepartureForm` (bukan di paket template). Field `price_quad`, `price_triple`, dll di form ini tidak punya pilihan currency. Semua asumsi IDR.

**Haji Plus biasanya membutuhkan:**
- Harga base dalam USD (ditentukan saat pendaftaran)
- Kurs dikunci saat booking untuk menghindari fluktuasi
- Notifikasi ke jamaah jika kurs berubah signifikan

---

#### 🟠 PAK-F4: Tidak Ada Sistem Kurs Mata Uang

**Masalah:** Tidak ada tabel `exchange_rates`, tidak ada service fetch kurs dari API, tidak ada mekanisme kurs dikunci saat booking.

**Kebutuhan untuk Haji:**
1. **Kurs manual** — admin input kurs hari ini (USD/IDR, SAR/IDR)
2. **Kurs API** — fetch otomatis dari Bank Indonesia atau Fixer.io
3. **Kurs terkunci** — saat jamaah booking, kurs di-snapshot dan disimpan di `bookings`
4. **Notifikasi perubahan kurs** — alert admin jika kurs berubah > X%

---

#### 🟠 PAK-F5: Tidak Ada Tipe Paket "Wisata" (Religi Tour)

**Masalah:** `format.ts` hanya punya label untuk `umroh`, `umroh_plus`, `haji`, `haji_plus`, `tabungan`. Tidak ada tipe "wisata" atau "wisata religi".

Tapi `package_types` tabel di DB bersifat dinamis — admin bisa tambah tipe custom. **Masalahnya:** tambahan tipe dari DB tidak tampil di form booking wizard yang menggunakan enum hardcoded.

**Dampak:** Paket wisata Turki, Maroko, Jordan, atau wisata religi Palestina tidak bisa dibuat dengan tipe yang tepat.

**Solusi:**
- Ganti enum hardcoded di frontend dengan data dinamis dari tabel `package_types`
- Booking wizard harus bisa handle tipe paket apapun, bukan hanya yang ter-hardcode

---

#### 🟠 PAK-F6: Harga Paket Hanya per Tipe Kamar — Tidak Ada Harga per Orang Mandiri

**Masalah:** Sistem harga: `price_quad` = harga per orang kalau di kamar quad, dst. Tapi untuk Haji, model harga berbeda:
- Harga Haji biasanya **flat per orang** (tidak tergantung tipe kamar, semua jamaah sama)
- Ada pilihan upgrade kamar dengan biaya tambahan (surcharge single room)
- Bayi (infant) tidak punya tarif haji sendiri

`DepartureForm` sudah punya `price_adult`, `price_child`, `price_infant` tapi ini **tidak terhubung ke booking wizard** — wizard masih hitung dari `price_quad/triple/double/single`.

**Solusi:**
- Untuk tipe `haji` dan `haji_plus`: aktifkan mode harga per orang
- Booking wizard deteksi tipe paket → gunakan model harga yang sesuai
- Surcharge untuk upgrade kamar bisa ditambahkan

---

#### 🟡 PAK-F7: Tidak Ada Fitur "Bandingkan Paket"

**Masalah:** Di halaman publik `/packages`, jamaah hanya bisa lihat satu paket sekali. Tidak bisa pilih 2-3 paket dan bandingkan side-by-side.

**Dampak:** Proses keputusan pembelian lebih lama → conversion rate rendah.

**Solusi:** Tambahkan fitur "Compare" dengan checkbox di card paket → tampilkan tabel perbandingan.

---

#### 🟡 PAK-F8: Tidak Ada Filter Harga per Currency di Listing Publik

**Masalah:** Ketika multi-currency diimplementasikan, listing publik menampilkan harga campuran IDR dan USD — tidak bisa difilter "tampilkan hanya paket IDR" atau "tampilkan hanya USD".

**Solusi:** Tambahkan filter currency di halaman listing paket.

---

### 23C — Tabel Ringkasan Gap Sistem Paket

| ID | Gap | Dampak | Prioritas |
|----|-----|--------|-----------|
| PAK-F1 | Multi-currency tidak diimplementasikan di frontend | 🔴 Harga Haji tampil salah | Kritis |
| PAK-F2 | Form paket tidak ada field pilih currency | 🔴 Admin tidak bisa set USD | Kritis |
| PAK-F3 | Form keberangkatan tidak ada field currency | 🔴 Harga keberangkatan selalu IDR | Kritis |
| PAK-F4 | Tidak ada sistem kurs mata uang | 🔴 Harga fluktuatif tidak bisa dikelola | Kritis |
| PAK-F5 | Tidak ada tipe paket "wisata" yang proper | 🟠 Paket wisata tidak bisa dikategorikan | Penting |
| PAK-F6 | Model harga per orang tidak terhubung ke wizard | 🟠 Haji butuh model harga berbeda | Penting |
| PAK-F7 | Tidak ada fitur bandingkan paket | 🟡 Konversi customer lebih lambat | Sedang |
| PAK-F8 | Tidak ada filter currency di listing | 🟡 UX listing campur IDR-USD | Sedang |

---

## BAGIAN 24 — ANALISIS ALUR PEMBELIAN PAKET REGULER (BOOKING WIZARD)

> **Tanggal analisis:** Mei 2026 — membaca kode `BookingWizard.tsx`, `useBookingWizardDynamic.ts`, `StepRoomAllocation.tsx`, `StepPassengersDynamic.tsx`, `StepReviewDynamic.tsx`, `JamaahPayment.tsx`, `paymentGateway.ts`.

---

### 24A — Alur Pembelian yang Sudah Ada (Mapping Lengkap)

```
JALUR PEMBELIAN PAKET REGULER

[1] DISCOVERY
    Halaman publik /packages
    └── Filter: tipe, harga, keberangkatan, durasi
    └── Card paket → tampil harga mulai dari (lowest departure price)

[2] DETAIL PAKET
    /packages/:packageId
    └── Tab: Overview | Itinerary | Fasilitas
    └── Pilih tanggal keberangkatan (dropdown departures aktif)
    └── Pilih jumlah jamaah per tipe kamar → "Pesan Sekarang"

[3] BOOKING WIZARD (4 Langkah)
    /booking/:packageId?departure=...
    
    Step 1 — Alokasi Kamar (StepRoomAllocation)
      └── Tentukan: berapa quad, triple, double, single
      └── Tampil: sisa kursi, harga per tipe kamar
    
    Step 2 — Data Penumpang (StepPassengersDynamic)
      └── Isi per penumpang: nama, gender, telp, email
      └── Tipe penumpang: Dewasa / Anak / Bayi
    
    Step 3 — Sumber Booking (PICSelectionStepImproved)
      └── Dari: Pusat / Cabang / Agen / Referral Code
      └── Validasi via RPC: validate_registration_context
    
    Step 4 — Review & Konfirmasi (StepReviewDynamic)
      └── Ringkasan biaya per penumpang
      └── Input kode kupon → diskon otomatis
      └── Setujui kebijakan pembatalan
      └── SUBMIT → buat booking di DB

[4] BOOKING BERHASIL
    /booking/success/:bookingCode
    └── Tampil kode booking, instruksi pembayaran
    └── Pilihan: transfer manual atau bayar online

[5] PEMBAYARAN
    /jamaah/payment/:bookingId
    └── Pilih metode: QRIS / VA BCA / VA Mandiri / GoPay / Manual Transfer
    └── Midtrans Snap popup untuk online payment
    └── Upload bukti transfer untuk manual payment

[6] KONFIRMASI
    Admin verifikasi → update payment_status → notifikasi WhatsApp ke jamaah
    └── Jamaah akses portal /jamaah setelah lunas
```

---

### 24B — GAP KRITIS ALUR PEMBELIAN

#### 🔴 BOOK-F1: Tidak Ada Penanganan Multi-Currency di Seluruh Wizard

**Masalah:** Seluruh `BookingWizard` mengasumsikan IDR. Di `useBookingWizardDynamic.ts`:
- `total_price` dihitung langsung dari `price_quad/triple/double/single` tanpa konversi
- `base_price` disimpan ke DB tanpa currency field
- Di tabel `bookings`, tidak ada kolom `currency` atau `exchange_rate`

**Akibat untuk Haji USD:**
- Harga USD disimpan mentah ke `bookings.total_price` sebagai angka IDR
- Contoh: Haji Plus USD 12.000 → `total_price = 12000` → terlihat "Rp 12.000" di semua tampilan

**Solusi:**
- Tambahkan kolom `currency` dan `exchange_rate` di tabel `bookings`
- Saat booking Haji USD: simpan `total_price = 12000`, `currency = 'USD'`, `exchange_rate = 16500`
- Tambahkan `total_price_idr = total_price * exchange_rate` untuk pembayaran aktual
- Semua tampilan harga harus baca `currency` dari booking → format yang sesuai

---

#### 🔴 BOOK-F2: Booking Wizard Tidak Adaptatif terhadap Tipe Paket

**Masalah:** Step 1 (alokasi kamar) selalu menampilkan: Quad / Triple / Double / Single. Ini benar untuk Umroh, tapi **tidak sesuai untuk Haji dan Wisata:**

**Haji:**
- Kuota haji sangat terbatas (BPIH — Biaya Penyelenggaraan Ibadah Haji)
- Jamaah mendaftar secara individu, bukan per kelompok kamar
- Tidak ada pilihan "berapa quad" — semua sudah ditetapkan pemerintah
- Persyaratan tambahan: mahram untuk wanita, usia minimal

**Wisata Religi (Turki, Maroko, dll):**
- Model kamar mungkin Twin / Double / Triple / Single
- Tidak ada "Quad" untuk wisata mewah
- Mungkin ada surcharge "Solo traveler"

**Solusi:**
- Tambahkan `booking_mode` di tabel `packages`: `standard` | `haji` | `wisata`
- Wizard baca `booking_mode` dan tampilkan step yang sesuai
- Mode `haji`: skip step alokasi kamar, ganti dengan step "Data Mahram & Kebutuhan Khusus"

---

#### 🔴 BOOK-F3: Tidak Ada Verifikasi Kelengkapan Dokumen Sebelum Booking

**Masalah:** Jamaah bisa booking tanpa dokumen apapun. Passport, KTP, foto tidak dicek di wizard booking.

**Untuk Haji ini sangat kritis:**
- Haji membutuhkan: passport valid > 1 tahun, vaksin meningitis, BPIH lunas
- Tanpa verifikasi dokumen, booking Haji bisa masuk tapi jamaah tidak eligible

**Solusi:**
- Tambahkan Step 0 (pre-booking): "Cek Kelayakan" → cek dokumen yang sudah diupload
- Untuk paket Haji: tampilkan checklist persyaratan wajib
- Jika ada persyaratan yang belum terpenuhi → tampilkan warning (bukan hard block)

---

#### 🟠 BOOK-F4: Tidak Ada Reservasi Sementara (Seat Hold)

**Masalah:** Saat user di step booking wizard, tidak ada "hold" pada kursi. Jika 2 user mengisi wizard bersamaan untuk departure yang tersisa 1 kursi → keduanya bisa sampai submit.

**Akibat:** Overbooking — ada penumpang yang sudah bayar tapi ternyata kursi habis.

**Solusi:**
- Implementasi seat reservation lock di Redis/Supabase dengan TTL 15 menit
- Saat user masuk wizard → lock 1 kursi sementara
- Kursi terlepas jika: wizard di-cancel, TTL habis, atau booking berhasil dikonfirmasi
- Tampilkan countdown "Kursi Anda akan dilepas dalam X menit"

---

#### 🟠 BOOK-F5: Pembayaran DP dan Cicilan Tidak Terintegrasi Langsung di Wizard

**Masalah:** Saat ini, booking wizard hanya membuat booking penuh tanpa menawarkan opsi pembayaran:
1. Booking selesai → redirect ke halaman payment terpisah
2. Di halaman payment, baru ada opsi DP / cicilan

**Idealnya:** Di Step 4 (Review), user sudah bisa pilih:
- Bayar full sekarang
- Bayar DP X% sekarang, sisanya cicil
- Daftar tabungan (jika paket ini punya tabungan)

Ini mengurangi drop-off antara "booking berhasil" dan "payment dilakukan".

---

#### 🟠 BOOK-F6: Guest Checkout Tidak Bisa Melanjutkan Booking Jika Tutup Browser

**Masalah:** `createGuestAccount` di `guestCheckoutService.ts` membuat akun temporary. Tapi jika user close browser setelah booking berhasil tapi sebelum bayar → tidak tahu cara akses booking lagi tanpa login.

**Solusi:**
- Kirim email/SMS dengan link unik untuk akses booking tanpa login
- Atau: minta email/WA di awal wizard → simpan sebelum submit

---

#### 🟡 BOOK-F7: Tidak Ada Konfirmasi Otomatis untuk Booking Online (Midtrans)

**Masalah:** Alur Midtrans: user bayar → Midtrans callback → status diupdate. Tapi tidak ada webhook handler yang otomatis:
1. Update `payment_status` di tabel `bookings`
2. Kirim email/WA konfirmasi ke jamaah
3. Update `booked_count` di `departures`

**Akibat:** Admin harus manual konfirmasi bahkan untuk pembayaran online yang sudah berhasil.

---

### 24C — Rencana Perbaikan Alur Booking

| ID | Perbaikan | Prioritas | Estimasi |
|----|-----------|-----------|----------|
| BOOK-FIX1 | **Multi-currency di wizard** — currency + exchange_rate di bookings table | 🔴 Kritis | 2 hari |
| BOOK-FIX2 | **Booking wizard adaptif tipe paket** — mode haji vs umroh vs wisata | 🔴 Kritis | 2 hari |
| BOOK-FIX3 | **Seat hold system** — lock kursi sementara selama wizard | 🟠 Penting | 1.5 hari |
| BOOK-FIX4 | **Opsi bayar di Step 4 wizard** — pilih DP/full/tabungan langsung | 🟠 Penting | 1 hari |
| BOOK-FIX5 | ✅ **Cek kelayakan dokumen pre-booking** — warning NIK/paspor di Step Review (DONE) | ✅ Done | 1 hari |
| BOOK-FIX6 | **Webhook Midtrans otomatis** — auto-confirm + WA notifikasi | 🟠 Penting | 1 hari |
| BOOK-FIX7 | **Guest checkout recovery** — link akses booking via email/WA | 🟡 Sedang | 0.5 hari |

---

## BAGIAN 25 — ANALISIS ALUR PEMBELIAN PAKET TABUNGAN (SAVINGS)

> **Tanggal analisis:** Mei 2026 — membaca kode `SavingsRegister.tsx`, `MySavings.tsx`, `AdminSavings.tsx`, `SavingsPackageForm.tsx`, dan database tables `savings_plans` + `savings_payments`.

---

### 25A — Alur Tabungan Saat Ini (Mapping Lengkap)

```
ALUR PAKET TABUNGAN

[1] DISCOVERY
    /savings (SavingsPackages.tsx)
    └── Listing paket tabungan (package_type = 'tabungan')
    └── Tampil: target menabung, durasi tenor, cicilan per bulan

[2] REGISTRASI TABUNGAN
    /savings/register/:packageId (SavingsRegister.tsx)
    └── Pilih tenor: 6 / 12 / 18 / 24 / 36 bulan
    └── Slider kalkulasi cicilan: target / tenor = cicilan/bulan
    └── Opsi DP: 10%-30% dari target
    └── Isi data: nama, gender, telepon
    └── SUBMIT → buat savings_plan (status: pending / dp_paid)

[3] BAYAR DP (Opsional)
    └── Upload bukti transfer DP
    └── Admin verifikasi → status jadi 'active'

[4] CICILAN BULANAN
    /jamaah/savings (MySavings.tsx)
    └── Tampil progress (% dari target)
    └── Upload bukti bayar cicilan manual
    └── Admin verifikasi setiap cicilan → update paid_amount
    └── Proyeksi lunas otomatis terhitung

[5] LUNAS / KONVERSI
    └── paid_amount >= target_amount → status 'completed'
    └── Customer pilih jadwal keberangkatan nyata
    └── Tabungan dikonversi ke booking reguler
    └── savings_plan.status = 'converted', booking_id terhubung

[6] MONITORING ADMIN
    AdminSavings.tsx — monitor semua tabungan aktif
    AdminMonitoringTabungan.tsx — laporan tabungan keseluruhan
    AdminCicilanReminder.tsx — kirim reminder WA ke yang nunggak
```

---

### 25B — GAP KRITIS ALUR TABUNGAN

#### ✅ TAB-F1: Konversi Tabungan → Booking — DONE (RPC convert_savings_to_booking + dialog)

**Masalah Terbesar:** Alur konversi tabungan ke booking nyata belum diimplementasikan di frontend.

`savings_plans` punya field `status: 'converted'` dan `booking_id`, tapi:
- Tidak ada halaman/form "Konversi Tabungan ke Booking"
- Customer yang sudah lunas tidak tahu cara memilih jadwal keberangkatan
- Tidak ada flow dari MySavings → pilih departure → generate booking baru
- Admin harus lakukan konversi manual di database

**Dampak:** Uang sudah terkumpul, tapi tidak ada cara bagi jamaah untuk "menunaikan" tabungannya menjadi booking nyata.

**Solusi yang Harus Dibangun:**
```
Tambahkan tombol "Pilih Jadwal Keberangkatan" di MySavings
saat status = 'completed':
  └── Tampil daftar departures dari paket yang ditabung
  └── Customer pilih jadwal
  └── System buat booking baru dengan:
        total_price = savings_plan.target_amount
        payment_status = 'paid' (karena sudah lunas via tabungan)
        savings_plan_id → FK ke bookings
  └── savings_plan.status = 'converted'
  └── savings_plan.booking_id = booking.id
```

---

#### ✅ TAB-F2: Harga Terkunci — DONE (kolom locked_price + price-protection di konversi)

**Masalah:** `SavingsPackageForm` menyebutkan "harga dikunci saat registrasi", tapi:
- `savings_plans` tidak ada kolom `locked_price` atau `locked_at`
- Jika harga paket naik (inflasi, kenaikan biaya haji), tabungan lama tetap pakai target lama
- Tidak ada mekanisme "harga naik → info customer → minta tambahan tabungan"

**Dampak:** Jika customer daftar tabungan Haji target Rp 50 juta, 2 tahun kemudian harga Haji naik ke Rp 65 juta → tidak ada notifikasi, customer mengira tabungannya cukup.

**Solusi:**
- Simpan `locked_price_per_pax` dan `locked_at` saat registrasi
- Bandingkan dengan harga paket saat ini secara periodik
- Jika ada kenaikan → notifikasi customer + beri opsi: top-up target atau tetap lanjut

---

#### ✅ TAB-F3: Jadwal Cicilan — DONE (tabel savings_schedules + auto-generate + alokasi otomatis)

**Masalah:** Cicilan tabungan sangat fleksibel — customer bisa bayar berapa saja kapan saja. Tidak ada jadwal cicilan dengan tanggal jatuh tempo.

**Akibat:**
- Tidak ada reminder otomatis berbasis jadwal (hanya ada reminder manual dari admin)
- Customer tidak tahu berapa yang harus dibayar bulan ini
- Admin tidak bisa monitor siapa yang "nunggak" vs sengaja bayar lebih

**Solusi:**
- Saat registrasi tabungan: generate `savings_schedule` (tabel jadwal cicilan)
  - Contoh: tenor 12 bulan → 12 baris jadwal dengan `due_date` dan `expected_amount`
- Tampilkan jadwal di MySavings
- Reminder otomatis H-3 sebelum tanggal jatuh tempo

---

#### 🟠 TAB-F4: Tidak Ada Aturan Pembatalan Tabungan

**Masalah:** Jika customer ingin membatalkan tabungan setelah bayar sebagian:
- Tidak ada kebijakan refund yang jelas di sistem
- Tidak ada form/flow "batalkan tabungan"
- Admin harus proses manual

**Solusi:**
- Buat `savings_cancellation_policy` per paket tabungan
- Contoh: "Batalkan sebelum 6 bulan → refund 100%, setelah itu → refund 80%"
- Flow: customer ajukan batal → admin approve → system hitung refund → proses pengembalian

---

#### 🟠 TAB-F5: Tidak Ada Laporan/Sertifikat Tabungan

**Masalah:** Tidak ada dokumen resmi yang bisa di-download oleh customer sebagai bukti tabungan mereka.

**Solusi:**
- Generate PDF "Surat Bukti Tabungan" yang bisa di-download dari MySavings
- Isi: nama, nomor tabungan, paket yang ditabung, progress, tanda tangan digital perusahaan

---

#### 🟠 TAB-F6: Paket Tabungan Hanya Bisa untuk Satu Paket Spesifik

**Masalah:** `SavingsRegister` terikat ke satu `packageId` — customer daftar tabungan untuk paket Umroh A, tapi tidak bisa pindah ke Umroh B jika Umroh A tidak lagi tersedia.

**Solusi:**
- Tambahkan opsi "Tabungan Fleksibel" — customer tentukan target (misal Rp 30 juta) tanpa terikat paket spesifik
- Saat konversi, bisa pilih paket manapun yang sesuai budget

---

#### 🟡 TAB-F7: SavingsRegister Tidak Ada Opsi Pembayaran DP Online

**Masalah:** Setelah registrasi tabungan, customer harus upload bukti transfer manual untuk DP. Tidak ada opsi bayar DP langsung via Midtrans/QRIS.

**Solusi:** Integrasikan Midtrans ke flow DP tabungan, sama seperti booking reguler.

---

#### 🟡 TAB-F8: Tidak Ada Kalkulator Perbandingan Tenor di Halaman Publik

**Masalah:** `KalkulatorCicilan.tsx` ada, tapi tersembunyi. Halaman listing tabungan tidak langsung menampilkan kalkulator interaktif.

**Solusi:**
- Di halaman listing paket tabungan, embed mini-kalkulator: "Target: Rp X, Bayar Rp Y/bulan selama Z bulan"
- Interaktif: slider tenor → update cicilan per bulan real-time

---

### 25C — Rencana Perbaikan Alur Tabungan

| ID | Perbaikan | Prioritas | Estimasi |
|----|-----------|-----------|----------|
| TAB-FIX1 | **Flow konversi tabungan → booking nyata** — halaman pilih jadwal + generate booking | 🔴 Kritis | 2 hari |
| TAB-FIX2 | **Harga terkunci + notifikasi kenaikan harga** — `locked_price` + monitoring | 🔴 Kritis | 1 hari |
| TAB-FIX3 | **Jadwal cicilan otomatis** — generate `savings_schedule` saat registrasi | 🔴 Penting | 1.5 hari |
| TAB-FIX4 | **Flow pembatalan tabungan** — kebijakan refund + form batal | 🟠 Penting | 1 hari |
| TAB-FIX5 | **Sertifikat/surat bukti tabungan** — PDF downloadable | 🟠 Penting | 1 hari |
| TAB-FIX6 | **Tabungan fleksibel** — tidak terikat satu paket | 🟡 Sedang | 1 hari |
| TAB-FIX7 | **DP tabungan via Midtrans** — bukan hanya manual transfer | 🟡 Sedang | 1 hari |
| TAB-FIX8 | **Kalkulator tenor di listing** — mini-kalkulator interaktif | 🟡 Sedang | 0.5 hari |

---

## BAGIAN 26 — ANALISIS SISTEM KEBERANGKATAN (DEPARTURE MANAGEMENT)

> **Tanggal analisis:** Mei 2026 — membaca kode `DepartureForm.tsx`, `AdminDepartures.tsx`, `AdminManifestJamaah.tsx`, `AdminRoomAssignments.tsx`, `AdminDepartureTracking.tsx`.

---

### 26A — Alur Keberangkatan Saat Ini (Mapping Lengkap)

```
SIKLUS HIDUP KEBERANGKATAN

[1] PEMBUATAN JADWAL
    AdminDepartures.tsx + DepartureForm.tsx
    └── Pilih paket → set tanggal/bulan
    └── Atur: kuota, airline, hotel Makkah/Madinah, hotel tambahan
    └── Set harga per tipe kamar (override harga paket)
    └── Set: muthawif, tour leader, break-even pax
    └── Deadline: dokumen, pembayaran, visa

[2] PENGISIAN (BOOKING)
    Jamaah booking → departure.booked_count bertambah
    └── Monitor: AdminDepartures → lihat sisa kursi per jadwal
    └── Rekonsiliasi: recalculate_departure_booked_count RPC

[3] PERSIAPAN KEBERANGKATAN
    AdminManifestJamaah.tsx
    └── Daftar semua penumpang dari bookings aktif
    └── Cek dokumen: KTP, Paspor, Foto
    └── Alert: paspor kadaluarsa < 6 bulan
    └── Export manifest: Excel + PDF (untuk maskapai/imigrasi)
    
    AdminRoomAssignments.tsx
    └── Kelompokkan jamaah ke kamar
    └── Auto-deteksi tipe kamar berdasarkan jumlah orang
    └── Bisa gabungkan antar booking code
    └── Maks 4 orang per kamar

[4] EKSEKUSI KEBERANGKATAN
    AdminDepartureTracking.tsx
    └── Check-in menggunakan QR code (CheckinPage.tsx)
    └── Update status penerbangan (Scheduled/Boarding/Departed/Arrived)
    └── Auto-refresh 30 detik
    └── SOS Alert monitoring (AdminSOSAlerts.tsx)

[5] KOMUNIKASI
    AdminDepartureDetail.tsx
    └── Blast WA ke semua jamaah per keberangkatan (H-7, H-3, H-1)
    └── Update status manual

[6] PASCA KEBERANGKATAN
    └── Update status departure: 'completed'
    └── Jamaah akses portal /jamaah untuk tracking
    └── Laporan perjalanan, badge, jurnal
```

---

### 26B — GAP KRITIS SISTEM KEBERANGKATAN

#### 🔴 KEP-F1: Tidak Ada Integrasi Maskapai Penerbangan (E-Ticket)

**Masalah:** `DepartureForm` punya `airline_id` dan `flight_number`, tapi:
- Tidak ada integrasi dengan sistem maskapai untuk verifikasi penerbangan
- E-ticket tidak bisa di-generate dari sistem
- Nomor penerbangan tidak divalidasi (bisa salah ketik)
- Tidak ada update otomatis jika penerbangan delayed/cancelled

**Dampak:** Admin harus input manual nomor penerbangan → risiko salah data → jamaah bawa info yang salah.

**Solusi:**
- Integrasi dengan Amadeus/Sabre API untuk verifikasi penerbangan
- Atau: minimal tambahkan link ke flight tracker (Flightradar24) berdasarkan flight number
- Notifikasi ke jamaah jika flight number berubah

---

#### 🔴 KEP-F2: Deadline Dokumen/Visa Tidak Ada Sistem Reminder Otomatis

**Masalah:** `DepartureForm` punya `document_deadline`, `payment_deadline`, `visa_deadline`. Tapi:
- Tidak ada scheduler yang mengirim reminder H-X sebelum deadline
- Admin harus cek manual setiap hari apakah ada jamaah yang belum lengkap dokumen
- Tidak ada dashboard "jamaah yang belum submit dokumen untuk keberangkatan X"

**Dampak:** Jamaah bisa terlewat deadline visa → gagal berangkat.

**Solusi:**
- Buat cron job (atau Supabase pg_cron): setiap hari cek `visa_deadline` yang kurang dari 7 hari
- Kirim notifikasi ke jamaah yang dokumennya belum lengkap
- Kirim notifikasi ke admin: "5 jamaah belum submit dokumen untuk keberangkatan 15 Maret"

---

#### 🔴 KEP-F3: Manifest Jamaah Tidak Validasi Mahram untuk Haji

**Masalah:** `AdminManifestJamaah` cek dokumen (KTP, paspor, foto), tapi tidak validasi:
- Wanita di bawah 45 tahun yang tidak ada mahram dalam booking yang sama → tidak eligible haji
- Bayi yang tidak ada orang tua dalam booking
- Jamaah dengan kondisi kesehatan yang perlu perhatian khusus

**Ini kritis untuk keberangkatan Haji** di mana validasi mahram adalah syarat wajib.

**Solusi:**
- Tambahkan validasi mahram: untuk paket haji, tampilkan warning jika ada jamaah wanita tanpa pasangan mahram dalam booking yang sama
- Tambahkan field `health_notes` dan `special_needs` di `booking_passengers`
- Manifest export untuk Haji harus menyertakan kolom mahram sesuai format Kemenag

---

#### 🟠 KEP-F4: Room Assignment Tidak Mempertimbangkan Gender dan Mahram

**Masalah:** `AdminRoomAssignments` auto-group berdasarkan jumlah orang, tapi tidak mempertimbangkan:
- Segregasi gender (wanita tidak dengan pria asing)
- Mahram harus sekamar dengan pasangan/keluarga
- Lansia yang butuh kamar di lantai bawah atau dekat lift

**Solusi:**
- Tambahkan validasi gender di room assignment: warning jika kamar berisi campuran pria-wanita yang bukan pasangan/mahram
- Tampilkan info mahram dari field di `customers` table
- Tambahkan notes per kamar untuk kebutuhan khusus

---

#### 🟠 KEP-F5: Tracking Real-time Jamaah di Tanah Suci Tidak Ada

**Masalah:** `AdminDepartureTracking` hanya track check-in di bandara. Setelah jamaah sampai di Makkah/Madinah, tidak ada tracking:
- Lokasi real-time muthawif (walaupun SOS sudah ada)
- Status jamaah per hari (hari ini di Makkah, besok pindah Madinah)
- Absensi harian di hotel/bus

**Solusi:**
- Buat halaman `DailyAttendance` di portal muthawif
- Muthawif input kehadiran jamaah per hari
- Admin bisa lihat status per jamaah secara real-time dari kantor

---

#### 🟠 KEP-F6: Tidak Ada Manajemen Bagasi

**Masalah:** Tidak ada sistem untuk:
- Registrasi bagasi per jamaah (berat, jumlah koper)
- Tracking bagasi yang hilang
- Informasi ketentuan bagasi per maskapai

Padahal `BAGGAGE_CALCULATOR` ada di `PERMISSIONS` — artinya ini sudah direncanakan tapi belum ada halamannya.

**Solusi:**
- Tambahkan tab "Bagasi" di detail keberangkatan
- Admin bisa set kuota bagasi per jamaah berdasarkan kebijakan maskapai
- Jamaah bisa lihat ketentuan bagasi dari portal /jamaah

---

#### 🟡 KEP-F7: Tidak Ada Evaluasi/Feedback Pasca Keberangkatan

**Masalah:** Setelah jamaah pulang, tidak ada sistem evaluasi:
- Rating kepuasan jamaah
- Ulasan per komponen (maskapai, hotel, muthawif, katering)
- Feedback untuk perbaikan keberangkatan berikutnya

**Solusi:**
- Setelah status departure `completed` → kirim survey ke semua jamaah via WA/email
- Tampilkan average rating per muthawif, hotel, maskapai di admin panel
- Report "Net Promoter Score" keberangkatan

---

#### 🟡 KEP-F8: Kalender Keberangkatan Tidak Bisa Di-export ke Kalender Eksternal

**Masalah:** `AdminDepartures` punya calendar view, tapi tidak ada export ke Google Calendar / iCal / ICS.

**Solusi:** Tambahkan endpoint `GET /api/departures/calendar.ics` yang generate ICS file dari semua jadwal keberangkatan aktif.

---

### 26C — Rencana Perbaikan Keberangkatan

| ID | Perbaikan | Prioritas | Estimasi |
|----|-----------|-----------|----------|
| KEP-FIX1 | ✅ **Reminder otomatis deadline dokumen/visa** — edge function `check-document-deadlines` + pg_cron harian 00:00 UTC (DONE) | ✅ Done | 1 hari |
| KEP-FIX2 | **Validasi mahram di manifest** — khusus paket haji | 🔴 Kritis | 1 hari |
| KEP-FIX3 | ✅ **Validasi gender di room assignment** — confirm dialog jika kamar campur (DONE) | ✅ Done | 1 hari |
| KEP-FIX4 | **Dashboard "jamaah belum lengkap dokumen"** — per keberangkatan | 🟠 Penting | 1 hari |
| KEP-FIX5 | **Absensi harian jamaah di tanah suci** — portal muthawif + laporan | 🟠 Penting | 2 hari |
| KEP-FIX6 | **Manajemen bagasi** — kuota + ketentuan per maskapai | 🟡 Sedang | 1 hari |
| KEP-FIX7 | **Survey evaluasi pasca keberangkatan** — rating + feedback | 🟡 Sedang | 1.5 hari |
| KEP-FIX8 | **Export kalender ICS** — integrasi Google Calendar | 🟢 Rendah | 0.5 hari |

---

## BAGIAN 27 — RENCANA IMPLEMENTASI MULTI-CURRENCY

> **Ini adalah fitur yang paling mendesak untuk Haji dan paket berdenominasi USD/SAR.**

---

### 27A — Arsitektur Multi-Currency yang Dibutuhkan

```
KOMPONEN YANG DIBUTUHKAN:

1. TABEL exchange_rates (baru)
   ├── id, currency_from, currency_to
   ├── rate (nilai tukar, contoh: USD → IDR = 16500)
   ├── source: 'manual' | 'api'
   ├── fetched_at (timestamp rate ini diambil)
   └── is_active

2. UPDATE TABEL packages
   └── currency: 'IDR' | 'USD' | 'SAR' | 'EUR' (default: IDR)

3. UPDATE TABEL departures
   └── currency: inherit dari packages atau override
   └── price_quad_original (harga asli dalam currency asal)
   └── price_quad_idr (harga konversi ke IDR saat terakhir diupdate)
   └── rate_used (kurs yang digunakan saat hitung IDR)
   └── rate_locked_at (kapan kurs dikunci)

4. UPDATE TABEL bookings
   ├── currency (mata uang yang digunakan saat booking)
   ├── exchange_rate (kurs IDR saat booking)
   ├── total_price_original (total dalam currency asal, misal USD)
   └── total_price_idr (total dalam IDR untuk pembayaran)

5. TABEL savings_plans (update)
   └── locked_currency, locked_price_per_pax, locked_rate
```

---

### 27B — Alur Multi-Currency: Haji Plus USD

```
CONTOH ALUR: Paket Haji Plus — USD 12.000 per orang

[1] Admin buat paket:
    currency = 'USD'
    package_type = 'haji_plus'
    
[2] Admin buat departure:
    price_quad_original = 12000 (USD)
    rate_used = 16500 (kurs hari ini)
    price_quad_idr = 12000 × 16500 = 198.000.000
    
[3] Customer lihat halaman publik:
    Tampil: "USD 12,000 / orang"
    Tambah info: "(≈ Rp 198 juta berdasarkan kurs Rp 16.500/USD)"
    
[4] Customer booking:
    bookings.total_price_original = 12000 (USD)
    bookings.exchange_rate = 16500
    bookings.total_price_idr = 198.000.000
    bookings.currency = 'USD'
    Kurs DIKUNCI saat booking dibuat
    
[5] Customer bayar:
    Pembayaran dalam IDR: Rp 198.000.000
    Jika ada cicilan: cicilan dalam IDR (tidak berubah walau kurs berfluktuasi)
    
[6] Admin update kurs (harian):
    exchange_rates.rate diupdate
    Harga tampilan di listing berubah mengikuti kurs baru
    Harga booking yang sudah ada TIDAK berubah (sudah locked)
```

---

### 27C — Mata Uang yang Perlu Didukung

| Kode | Nama | Digunakan untuk |
|------|------|----------------|
| `IDR` | Rupiah Indonesia | Umroh standar, tabungan, wisata domestik |
| `USD` | Dollar AS | Haji Plus, wisata premium, hotel bintang 5 |
| `SAR` | Saudi Riyal | Biaya di Arab Saudi (visa, muthawif lokal) |
| `EUR` | Euro | Wisata Eropa (opsional, masa depan) |

**Catatan:** SAR terutama untuk internal cost tracking — pembayaran ke customer tetap IDR atau USD.

---

### 27D — Rencana Implementasi Multi-Currency (Urutan Pekerjaan)

| ID | Langkah | Estimasi | Keterangan |
|----|---------|----------|------------|
| CUR-1 | Buat tabel `exchange_rates` + migration | 0.5 hari | Tabel kurs, bisa input manual |
| CUR-2 | Update tabel `packages` + `departures` + `bookings` | 1 hari | Tambah kolom currency, original price, locked rate |
| CUR-3 | UI admin: page manajemen kurs (input manual + tanggal) | 0.5 hari | Admin update kurs setiap hari |
| CUR-4 | Update `RegularPackageForm` + `DepartureForm` | 1 hari | Tambah field currency, harga dalam currency asal |
| CUR-5 | Update `formatCurrency` calls di seluruh frontend | 1 hari | Pass currency dari package/booking ke formatter |
| CUR-6 | Update `BookingWizard` untuk handle multi-currency | 1 hari | Tampilkan harga USD + konversi IDR |
| CUR-7 | Lock kurs saat booking submit | 0.5 hari | Snapshot kurs ke bookings table |
| CUR-8 | Update halaman publik listing + filter currency | 0.5 hari | Tampilkan harga dengan currency label |
| CUR-9 | (Opsional) Fetch kurs otomatis dari API Bank Indonesia | 1 hari | Auto-update kurs harian |
| **Total** | | **~7 hari** | Sprint khusus multi-currency |

---

*Analisis Bagian 23-27 selesai Mei 2026. Multi-currency untuk Haji adalah fitur kritis yang tidak bisa ditunda — sistem saat ini menampilkan harga USD sebagai IDR yang menyesatkan. Estimasi total implementasi multi-currency: 7 hari kerja.*
