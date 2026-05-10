# Rencana & Status Pengembangan — Vinstour Travel Portal
> Terakhir diperbarui: Juni 2026 | Stack: React 19 + Vite 7 + TypeScript + Supabase + Express
> **Ini adalah SATU-SATUNYA file rencana. Jangan buat file rencana lain.**

---

## Legenda

| Simbol | Artinya |
|--------|---------|
| ✅ | Selesai & berfungsi |
| ⚠️ | Ada catatan penting / menunggu aksi |
| 🔴 | Belum dibangun |

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

## BAGIAN 2 — INFRASTRUKTUR

| Item | Status | Catatan |
|------|--------|---------|
| pnpm monorepo (umrah-haji + api-server + api-spec + lib/) | ✅ | Port 5000 / 8080 |
| React 19 + Vite 7 + TypeScript 5.9 + Tailwind v3 | ✅ | 0 error TS — typecheck bersih |
| Supabase Auth + Database (graceful demo mode) | ✅ | App jalan tanpa Supabase, fitur data mati |
| RBAC granular — Visual Permission Matrix + Audit Log | ✅ | |
| PWA / Service Worker | ✅ | Deteksi standalone mode, layout beda |
| Dark Mode global | ✅ | |
| Multi-tenant (branch/agent subdomain) | ✅ | |
| Export Excel (xlsx) — 15+ halaman | ✅ | |
| Export PDF (jsPDF + autoTable) — 10+ halaman | ✅ | |
| OpenAPI Spec + Codegen (Orval) — type-safe hooks | ✅ | |
| Error Boundary global | ✅ | |
| Workflow Replit — Start application + Start API server | ✅ | Keduanya RUNNING |

---

## BAGIAN 3 — ENVIRONMENT VARIABLES (Replit Secrets)

| Secret | Keterangan | Status |
|--------|-----------|--------|
| `VITE_SUPABASE_URL` | URL project Supabase (`https://xxx.supabase.co`) | ⚠️ Perlu diset |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/public key dari Supabase | ⚠️ Perlu diset |
| `SUPABASE_URL` | URL yang sama untuk API server | ⚠️ Perlu diset |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (jangan expose ke frontend!) | ⚠️ Perlu diset |
| `SMTP_HOST` | Host SMTP (`smtp.gmail.com`) | ⚠️ Opsional — untuk email |
| `SMTP_PORT` | Port SMTP (`587`) | ⚠️ Opsional |
| `SMTP_USER` | Username/email SMTP | ⚠️ Opsional |
| `SMTP_PASS` | Password SMTP atau App Password | ⚠️ Opsional |
| `SMTP_FROM` | Alamat pengirim (`noreply@vinstour.com`) | ⚠️ Opsional |
| `MIDTRANS_SERVER_KEY` | Server key dari dashboard Midtrans | ⚠️ Opsional — untuk payment online |
| `MIDTRANS_CLIENT_KEY` | Client key (untuk Snap.js di frontend) | ⚠️ Opsional |
| `MIDTRANS_ENV` | `sandbox` (default) atau `production` | ⚠️ Opsional |
| `VAPID_PUBLIC_KEY` | Generate: `npx web-push generate-vapid-keys` | ⚠️ Opsional — untuk browser push |
| `VAPID_PRIVATE_KEY` | Generate: `npx web-push generate-vapid-keys` | ⚠️ Opsional |
| `VAPID_EMAIL` | `mailto:admin@vinstour.com` | ⚠️ Opsional |

> **Catatan:** Tanpa Supabase, app jalan dalam demo mode. Auth tidak aktif, data tidak tersimpan.

---

## BAGIAN 4 — SEMUA HALAMAN (80+ Halaman)

### Portal Publik — `/`
| Halaman | URL | Status |
|---------|-----|--------|
| Landing Page + Banner Carousel | `/` | ✅ |
| Quick Menu Grid (Layanan Utama, Portal Jamaah, Informasi) | `/` (section) | ✅ |
| Daftar Paket | `/packages` | ✅ |
| Bandingkan Paket | `/packages/compare` | ✅ |
| Detail Paket | `/packages/:idSlug` | ✅ |
| Jadwal Keberangkatan | `/departures` | ✅ |
| Blog | `/blog`, `/blog/:slug` | ✅ |
| Kontak | `/contact` | ✅ |
| Tentang Kami | `/about` | ✅ |
| Tim | `/team` | ✅ |
| FAQ | `/faq` | ✅ |
| Testimoni | `/testimonials` | ✅ |
| Kalkulator Biaya | `/kalkulator` | ✅ |
| Kalkulator Cicilan | `/kalkulator-cicilan` | ✅ |
| Cek Status Booking | `/cek-booking` | ✅ |
| Kurs Mata Uang Real-time | `/kurs` | ✅ |
| Fitur Portal | `/fitur` | ✅ |
| **Landing Jamaah** | `/jamaah-info` | ✅ |
| Tabungan Umroh | `/savings` | ✅ |
| Website Agen | `/a/:agentSlug` | ✅ |
| Website Cabang | `/b/:branchSlug` | ✅ |
| Landing Page Kustom | `/lp/:slug` | ✅ |

### Fitur Islami — `/`
| Halaman | URL | Status |
|---------|-----|--------|
| Jadwal Sholat | `/sholat` | ✅ |
| Al-Quran Digital | `/alquran` | ✅ |
| Arah Kiblat | `/kiblat` | ✅ |
| Cuaca Tanah Suci | `/cuaca` | ✅ |
| Tracker Ibadah Harian | `/tracker-ibadah` | ✅ |
| Kalkulator Islami | `/kalkulator-islami` | ✅ |
| Tasbih Digital | `/tasbih` | ✅ |
| Toko Perlengkapan (E-commerce) | `/store` | ✅ Redirect dari `/toko` |

### Portal Customer — `/customer/*`
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

### Toko E-Commerce — `/store/*`
| Halaman | URL | Status |
|---------|-----|--------|
| Toko (Listing Produk) | `/store` | ✅ |
| Checkout | `/store/checkout` | ✅ |
| Daftar Pesanan Jamaah | `/store/orders` | ✅ |
| Detail Pesanan + Upload Bukti Bayar | `/store/orders/:id` | ✅ |
| Admin — Manajemen Produk | `/admin/store/products` | ✅ |
| Admin — Manajemen Pesanan + Resi | `/admin/store/orders` | ✅ |
| Admin — Kategori Produk | `/admin/store/categories` | ✅ |
| Admin — Dashboard Toko | `/admin/store` | ✅ |

### Portal Jamaah (Mobile PWA) — `/jamaah/*`
| Halaman | URL | Status |
|---------|-----|--------|
| Portal Hub | `/jamaah` | ✅ |
| Digital ID | `/jamaah/digital-id` | ✅ |
| Itinerary | `/jamaah/itinerary` | ✅ |
| Dokumen | `/jamaah/documents` | ✅ |
| Riwayat Bayar | `/jamaah/payment-history` | ✅ |
| Feedback | `/jamaah/feedback` | ✅ |
| Notifikasi | `/jamaah/notifications` | ✅ |
| Tracker Visa | `/jamaah/visa-tracker` | ✅ |
| Peta Lokasi | `/jamaah/peta-lokasi` | ✅ |
| Doa & Panduan | `/jamaah/doa-panduan` | ✅ |
| Panduan Ibadah | `/jamaah/panduan-ibadah` | ✅ |
| Waktu Sholat | `/jamaah/waktu-sholat` | ✅ |
| Invoice | `/jamaah/invoice` | ✅ |
| Bagasi | `/jamaah/bagasi` | ✅ |
| Kontrak | `/jamaah/kontrak` | ✅ |
| Badges | `/jamaah/badges` | ✅ |
| Target Ibadah | `/jamaah/target-ibadah` | ✅ |
| Jurnal | `/jamaah/jurnal` | ✅ |
| Doa Counter | `/jamaah/doa-counter` | ✅ |
| Sertifikat | `/jamaah/sertifikat` | ✅ |
| SISKOHAT Jamaah | `/jamaah/siskohat` | ✅ |
| Chatbot AI | `/jamaah/chatbot` | ✅ |
| Ringkasan AI | `/jamaah/ringkasan-ai` | ⚠️ Template lokal, bukan LLM sungguhan |
| Pembayaran Mandiri | `/jamaah/payment` | ✅ |
| Checklist | `/jamaah/checklist` | ✅ |
| Manasik Digital + Kuis Mandiri | `/jamaah/manasik` | ✅ |
| SOS Status | `/jamaah/sos-status` | ✅ |
| Profil Kesehatan Jamaah | `/jamaah/kesehatan` | ✅ |
| Tracker Ibadah Harian | `/jamaah/tracker-ibadah` | ✅ |

### Portal Admin — `/admin/*`
| Halaman | URL | Status |
|---------|-----|--------|
| Dashboard | `/admin` | ✅ |
| Analytics | `/admin/analytics` | ✅ |
| KPI Dashboard | `/admin/kpi-dashboard` | ✅ |
| Notification Bell | Header admin | ✅ |
| Leads & Prospek | `/admin/leads`, `/admin/leads/:id` | ✅ |
| Chat Leads (Widget) | `/admin/chat-leads` | ✅ |
| Booking | `/admin/bookings`, `/admin/bookings/:id` | ✅ |
| Paket Umroh & Haji | `/admin/packages` | ✅ |
| Kupon & Promo | `/admin/coupons` | ✅ |
| Jadwal Keberangkatan | `/admin/departures` | ✅ |
| Monitor SOS | `/admin/sos-alerts` | ✅ |
| Dashboard Keuangan | `/admin/finance-terpadu` | ✅ |
| Data Jamaah | `/admin/customers` | ✅ |
| Agen | `/admin/agents` | ✅ |
| Cabang | `/admin/branches` | ✅ |
| SDM / HR | `/admin/hr` | ✅ |
| Tampilan & Tema | `/admin/appearance` | ✅ |
| **PWA Settings + Upload Ikon** | `/admin/pwa-settings` | ✅ Upload ikon PWA |
| Pengaturan Umum | `/admin/settings` | ✅ |

### Portal Agen — `/agent/*`
| Halaman | URL | Status |
|---------|-----|--------|
| Dashboard | `/agent/dashboard` | ✅ |
| Booking | `/agent/bookings` | ✅ |
| Komisi | `/agent/commissions` | ✅ |
| CRM Pipeline | `/agent/crm` | ✅ |

### Portal Cabang — `/cabang/*`
| Halaman | URL | Status |
|---------|-----|--------|
| Dashboard | `/cabang/dashboard` | ✅ |
| Agen Binaan | `/cabang/agen` | ✅ |
| Booking | `/cabang/bookings` | ✅ |
| Target KPI Cabang | `/cabang/kpi-targets` | ✅ |

### Portal Muthawif — `/muthawif/*`
| Halaman | URL | Status |
|---------|-----|--------|
| Dashboard | `/muthawif/dashboard` | ✅ |
| Laporan Harian | `/muthawif/laporan-harian` | ✅ |
| Panel SOS | `/muthawif/sos` | ✅ |

---

## BAGIAN 5 — RIWAYAT PERUBAHAN TERKINI

### Sesi Mei 2026 — Integrasi Gap Fix (Analisis Menyeluruh)

**Gap yang ditemukan & diperbaiki:**

| # | Gap | Fix | File Utama |
|---|-----|-----|------------|
| 1 | `AdminSentimenFeedback` baca dari tabel `feedback` yang tidak ada | Ganti ke `testimonials` (yang diisi JamaahFeedback), field `content` → `comment` | `AdminSentimenFeedback.tsx` |
| 2 | Verifikasi dokumen tidak memberi tahu jamaah | Tambah insert `customer_notifications` saat verify/reject | `AdminDocumentVerification.tsx` |
| 3 | Perubahan status booking tidak memberi tahu jamaah | Tambah insert `customer_notifications` untuk semua status | `AdminBookingDetail.tsx` |
| 4 | `JamaahChecklist` hanya simpan ke localStorage | Upgrade ke Supabase-persistent (`jamaah_checklist` table) + localStorage fallback | `JamaahChecklist.tsx` |
| 5 | Upload dokumen jamaah tidak memberi tahu admin | Tambah insert ke `notifications` setelah upload berhasil | `JamaahDocuments.tsx` |
| 6 | Nomor kamar tidak terlihat dari portal jamaah | Tampilkan `booking.room_number` + tipe kamar di card Detail Akomodasi | `JamaahPortal.tsx` |
| 7 | Tabel `jamaah_checklist`, `attendance`, `customer_notifications`, `feedback`, `visa_status_logs`, `room_occupants` belum ada | Migration SQL lengkap dengan RLS + policy | `supabase/migrations/fase21_integration_fixes.sql` |
| 8 | Kolom `booking_id` di `testimonials` dan `room_number` di `bookings` belum ada | ALTER TABLE via migration fase21 | `fase21_integration_fixes.sql` |

**Migration baru: `supabase/migrations/fase21_integration_fixes.sql`**
Jalankan setelah fase20 di Supabase SQL Editor.

---

### Sesi Mei 2026 — E-Commerce Toko + Upload Bukti Bayar

| # | Perubahan | File |
|---|-----------|------|
| 1 | SQL migration toko e-commerce lengkap (store_categories, store_products, store_orders, store_order_items, store_shipments) | `supabase/migrations/store_ecommerce.sql` |
| 2 | Semua hooks store (useStore.ts) — CRUD produk, kategori, pesanan, pengiriman | `hooks/useStore.ts` |
| 3 | Halaman admin: Dashboard Toko, Produk, Pesanan+Resi, Kategori | `pages/admin/AdminStore*.tsx` |
| 4 | Halaman customer: Listing Toko, Checkout, Daftar Pesanan, Detail Pesanan | `pages/customer/Store*.tsx`, `pages/customer/MyStoreOrders.tsx` |
| 5 | Upload bukti transfer dari halaman detail pesanan jamaah | `pages/customer/StoreOrderDetail.tsx` |
| 6 | Admin dapat melihat foto bukti bayar langsung di dialog detail pesanan | `pages/admin/AdminStoreOrders.tsx` |
| 7 | 4 template WA: order confirmed, shipped (dengan resi), delivered, awaiting payment | `lib/whatsapp-notifier.ts`, `hooks/useWhatsAppNotifier.ts` |
| 8 | Link Toko di navbar Layanan → `/store`; Pesanan Toko di dropdown profil (desktop+mobile) | `DynamicNavbar.tsx` |
| 9 | Quick Menu Grid homepage: Toko Umroh → `/store` | `QuickMenuGrid.tsx` |
| 10 | Redirect `/toko` → `/store` | `PublicRoutes.tsx` |
| 11 | Route admin `/admin/store/*` + permission STORE_* | `AdminRoutes.tsx`, `permissions.ts` |
| 12 | Notifikasi admin otomatis saat jamaah upload bukti bayar | `hooks/useStore.ts` |
| 13 | Hapus duplikat import `formatCurrency` di AdminStoreOrders | `AdminStoreOrders.tsx` |

### Sesi Juni 2026 — Enhancement Navigation + PWA

| # | Perubahan | File |
|---|-----------|------|
| 1 | Merge PLAN.md + RENCANA.md → satu file | `RENCANA.md` |
| 2 | Menu "Layanan Utama", "Portal Jamaah", "Fitur Islami" dipindah ke header navbar sebagai mega dropdown | `DynamicNavbar.tsx` |
| 3 | PWA standalone mode detection — layout berbeda saat diinstall sebagai app | `usePWAMode.ts`, `DynamicPublicLayout.tsx` |
| 4 | Upload ikon PWA dari panel admin | `AdminPWASettings.tsx` |
| 5 | Admin panel dapat mengatur tampilan PWA (warna, ikon, splash) secara dinamis | `AdminPWASettings.tsx` |
| 6 | Fix workflows — pnpm install selesai, app berjalan | `.replit` |

### Sesi Juni 2026 — Replit Migration + Enhancement sebelumnya

| # | Perubahan | File |
|---|-----------|------|
| 1 | Fix TS errors — kurs.ts, KursPage.tsx | `api-server/src/routes/v1/kurs.ts`, `KursPage.tsx` |
| 2 | QuickMenuGrid — 4 seksi: Layanan Utama, Portal Jamaah, Fitur Islami, Informasi | `QuickMenuGrid.tsx` |
| 3 | Buat halaman `/jamaah-info` | `JamaahInfoPage.tsx` |
| 4 | Sidebar Desktop Portal Jamaah responsive | `JamaahBottomNav.tsx`, `index.css` |
| 5 | Ikon PWA beresolusi tinggi (192×192, 512×512) | `favicon.svg`, `manifest.json` |
| 6 | Offline Cache Service Worker vinstour-v4 | `sw.js` |

---

## BAGIAN 6 — DATABASE MIGRATIONS (Urutan Eksekusi)

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
| 19 | `supabase/migrations/fase20_webhooks_push.sql` | webhooks, push subscriptions |
| 20 | `supabase/migrations/store_ecommerce.sql` | toko e-commerce |
| 21 | `supabase/migrations/store_product_reviews.sql` | review produk |
| 22 | `supabase/migrations/fase21_integration_fixes.sql` | **customer_notifications, jamaah_checklist, attendance, feedback, visa_status_logs, room_occupants** + kolom baru |

---

## BAGIAN 7 — CATATAN TEKNIS PENTING

- **Typecheck**: selalu `pnpm run typecheck:libs` dahulu sebelum typecheck api-server
- **Tabel baru Supabase**: wajib aktifkan RLS + buat policy per role
- **Notifikasi admin**: tambah listener di `useAdminNotifications.ts` (singleton pattern)
- **Routing**: lazy import di file Routes.tsx, daftarkan di `admin-menu-registry.ts`
- **PWA mode**: deteksi via `window.matchMedia('(display-mode: standalone)')` — hook `usePWAMode`
- **PWA icons**: tersimpan di `website_settings.pwa_icon_url`, manifest.json dinamis via `/api/manifest.json`
- **Mobile-responsive + dark mode + loading skeleton** wajib di setiap halaman baru
- **Tailwind**: gunakan v3 via PostCSS — JANGAN gunakan `@tailwindcss/vite` plugin
- **Quick Menu Grid**: link "Portal Jamaah" menuju `/jamaah-info`

---

## BAGIAN 8 — AKSI YANG MASIH MENUNGGU USER

| Prioritas | Item | Catatan |
|-----------|------|---------|
| ⚠️ P1 | Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` | Auth & data tidak aktif tanpa ini |
| ⚠️ P2 | Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | API server butuh ini |
| ⚠️ P3 | Jalankan SQL migrations (Bagian 6) ke Supabase | Manual di Supabase SQL Editor |
| ⚠️ P4 | Generate VAPID keys: `npx web-push generate-vapid-keys` | Untuk browser push |
| ⚠️ P5 | Set SMTP credentials | Opsional, untuk email |
| ⚠️ P6 | Set Midtrans keys | Opsional, untuk pembayaran |

---

## BAGIAN 9 — STRUKTUR FILE PENTING

```
artifacts/
  umrah-haji/src/
    pages/
      admin/          — semua halaman admin (80+ file)
      public/         — halaman publik + jamaah-info
      jamaah/         — portal jamaah mobile
      customer/       — portal customer
      agent/          — portal agen
    routes/
      AdminRoutes.tsx      — semua route /admin/*
      PublicRoutes.tsx     — semua route publik + /jamaah-info
      CustomerRoutes.tsx   — semua route /jamaah/*
    hooks/
      usePWAMode.ts            — deteksi standalone PWA mode
      useAdminNotifications.ts — real-time notif (singleton)
      usePWAConfig.ts          — konfigurasi bottom nav PWA
    components/
      layout/
        DynamicNavbar.tsx      — navbar dengan mega dropdown Layanan/Jamaah/Islami
        DynamicPublicLayout.tsx — layout publik, aware PWA mode
      pwa/
        MobileBottomNav.tsx    — bottom nav saat PWA standalone
        PWAInstallPrompt.tsx   — prompt pasang aplikasi
      home/
        QuickMenuGrid.tsx      — grid menu homepage 4 seksi
    lib/
      admin-menu-registry.ts  — daftar menu + grup + permission

  api-server/src/
    routes/v1/         — kurs.ts, packages.ts, departures.ts, dll
```

## BAGIAN 10 — API EKSTERNAL (Gratis, Tanpa API Key)

| Layanan | Digunakan untuk |
|---------|----------------|
| Aladhan API | Jadwal waktu sholat |
| api.alquran.cloud | Teks Al-Quran + audio murottal |
| Open-Meteo | Cuaca Mekah/Madinah/Jeddah |
| Nominatim (OSM) | Reverse geocoding nama kota |
