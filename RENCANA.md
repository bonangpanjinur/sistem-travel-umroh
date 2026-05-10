# Rencana & Status Pengembangan — Vinstour Travel Portal
> Terakhir diperbarui: Juni 2026 (Fase 1 & Fase 2 selesai) | Stack: React 19 + Vite 7 + TypeScript + Supabase + Express
> **Ini adalah satu-satunya file rencana. Jangan buat file rencana lain.**

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
| PWA / Service Worker | ✅ | |
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
| **Landing Jamaah** | `/jamaah-info` | ✅ Baru — hero, 8 fitur, cara pakai, testimoni |
| Tabungan Umroh | `/savings` | ✅ |
| Website Agen | `/a/:agentSlug` | ✅ |
| Website Cabang | `/b/:branchSlug` | ✅ |
| Landing Page Kustom | `/lp/:slug` | ✅ |

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
| Manasik Digital + Kuis Mandiri | `/jamaah/manasik` | ✅ Fase 2 — tab Kuis 27 soal, 6 topik, skor localStorage |
| SOS Status | `/jamaah/sos-status` | ✅ |
| Profil Kesehatan Jamaah | `/jamaah/kesehatan` | ✅ Fase 2 — gol darah, alergi, obat, vaksin, kartu darurat |

### Portal Admin — `/admin/*`
| Halaman | URL | Status |
|---------|-----|--------|
| Dashboard | `/admin` | ✅ |
| Analytics | `/admin/analytics` | ✅ |
| KPI Dashboard | `/admin/kpi-dashboard` | ✅ |
| Ringkasan AI | `/admin/ai-summary` | ⚠️ Kalkulasi statistik, bukan AI |
| **Notification Bell** | Header admin (semua halaman) | ✅ Baru — summary pills, lead + dokumen alerts |
| Leads & Prospek | `/admin/leads`, `/admin/leads/:id` | ✅ |
| Leads Analytics | `/admin/leads/analytics` | ✅ |
| Follow-up Reminder | `/admin/follow-up` | ✅ |
| Chat Leads (Widget) | `/admin/chat-leads` | ✅ |
| Booking | `/admin/bookings`, `/admin/bookings/:id` | ✅ |
| Buat Booking | `/admin/bookings/create` | ✅ |
| Paket Umroh & Haji | `/admin/packages`, `/admin/packages/:id` | ✅ |
| Tipe Paket | `/admin/package-types` | ✅ |
| Kupon & Promo | `/admin/coupons` | ✅ |
| Jadwal Keberangkatan | `/admin/departures`, `/admin/departures/:id` | ✅ |
| Tracking Real-time | `/admin/departure-tracking` | ✅ |
| Monitor SOS | `/admin/sos-alerts` | ✅ |
| Kamar & Rooming | `/admin/room-assignments` | ✅ |
| Manajemen Haji | `/admin/haji` | ✅ |
| Manasik | `/admin/manasik` | ✅ |
| Template Itinerary | `/admin/itinerary-templates` | ✅ |
| Perlengkapan | `/admin/equipment` | ✅ |
| Master Perlengkapan | `/admin/equipment-master` | ✅ |
| Setting Perlengkapan | `/admin/equipment-settings` | ✅ |
| Stock Opname | `/admin/stock-opname` | ✅ |
| **Aset Kantor** | `/admin/office-assets` | ✅ Dipindahkan dari /operational ke dalam admin |
| Dashboard Keuangan | `/admin/finance-terpadu` | ✅ |
| Pembayaran | `/admin/payments` | ✅ |
| Kas & Bank | `/admin/finance-cash` | ✅ |
| Piutang (AR) | `/admin/finance/ar` | ✅ |
| Hutang (AP) | `/admin/finance/ap` | ✅ |
| Laporan P&L | `/admin/finance` | ✅ |
| Program Tabungan | `/admin/savings`, `/admin/savings-management` | ✅ |
| Laporan | `/admin/reports` | ✅ |
| Laporan Lanjutan | `/admin/advanced-reports` | ✅ |
| Laporan Terjadwal | `/admin/scheduled-reports` | ✅ |
| Laporan Keuangan | `/admin/laporan/keuangan` | ✅ |
| Laporan Keberangkatan | `/admin/laporan/keberangkatan` | ✅ |
| Performa Agen | `/admin/laporan/agen` | ✅ |
| Monitoring Tabungan | `/admin/laporan/tabungan` | ✅ |
| Data Jamaah | `/admin/customers`, `/admin/customers/:id` | ✅ |
| Agen | `/admin/agents` | ✅ |
| Cabang | `/admin/branches` | ✅ |
| Keanggotaan | `/admin/memberships` | ✅ |
| Komisi Cabang | `/admin/branch-commissions` | ✅ |
| Laporan Komisi Agen | `/admin/agent-commission-report` | ✅ |
| Program Loyalitas | `/admin/loyalty` | ✅ |
| Referral | `/admin/referrals` | ✅ |
| Visa | `/admin/visa` | ✅ |
| Manifest Jamaah | `/admin/manifest` | ✅ |
| Absensi Digital | `/admin/absensi` | ✅ |
| WA Blast Keberangkatan | `/admin/wa-blast` | ✅ |
| SDM / HR | `/admin/hr` | ✅ |
| Penggajian | `/admin/hr/payroll` | ✅ |
| Verifikasi Dokumen | `/admin/document-verification` | ✅ |
| Jenis Dokumen | `/admin/document-types` | ✅ |
| Generator Surat | `/admin/documents-generator` | ✅ |
| Hub Korespondensi | `/admin/correspondence` | ✅ |
| Konten Offline | `/admin/offline-content` | ✅ |
| Tiket Support | `/admin/support` | ✅ |
| Blog & Artikel | `/admin/blog` | ✅ |
| Pengumuman | `/admin/announcements` | ✅ |
| Banner Carousel | `/admin/banners` | ✅ |
| Landing Page | `/admin/landing-pages`, `/admin/landing-pages/:id` | ✅ |
| Materi Marketing | `/admin/marketing-materials` | ✅ |
| WhatsApp Blast | `/admin/whatsapp` | ✅ |
| Template Email | `/admin/email-templates` | ✅ |
| Push Notifikasi | `/admin/push-notifications` | ✅ |
| WA Otomatis | `/admin/wa-otomatis` | ✅ |
| Midtrans Payment | `/admin/midtrans` | ✅ |
| Reminder Cicilan | `/admin/cicilan-reminder` | ✅ |
| Virtual Account | `/admin/virtual-account` | ✅ |
| Analisis Sentimen | `/admin/sentimen-feedback` | ✅ |
| Prediksi Seat | `/admin/prediksi-seat` | ✅ |
| Smart Notifikasi | `/admin/smart-notif` | ⚠️ Pengaturan localStorage, bukan AI sungguhan |
| Rekomendasi Paket AI | `/admin/rekomendasi-paket` | ✅ |
| Hotel | `/admin/hotels` | ✅ |
| Maskapai | `/admin/airlines` | ✅ |
| Bandara | `/admin/airports` | ✅ |
| Vendor | `/admin/vendors` | ✅ |
| Muthawif | `/admin/muthawifs`, `/admin/muthawifs/:id` | ✅ |
| Penyedia Bus | `/admin/bus-providers` | ✅ |
| Master Data Lainnya | `/admin/master-data` | ✅ |
| SISKOHAT Kemenag | `/admin/siskohat` | ✅ |
| Approval Workflow | `/admin/approvals` | ✅ |
| Kontrak Vendor | `/admin/vendor-contracts` | ✅ |
| Pelatihan Agen | `/admin/training` | ✅ |
| Galeri Media | `/admin/media-gallery` | ✅ |
| Manajemen User | `/admin/users` | ✅ |
| Manajemen Role | `/admin/roles` | ✅ |
| Audit Keamanan | `/admin/security-audit` | ✅ |
| Pengaturan 2FA | `/admin/2fa` | ⚠️ Toggle tersimpan, enforcement TOTP belum |
| Tampilan & Tema | `/admin/appearance` | ✅ |
| Pengaturan Umum | `/admin/settings` | ✅ |
| API Connect | `/admin/api-connect` | ✅ |
| Webhook Outgoing | `/admin/webhooks` | ✅ |
| PWA Settings | `/admin/pwa-settings` | ✅ |

### Portal Agen — `/agent/*`
| Halaman | URL | Status |
|---------|-----|--------|
| Dashboard | `/agent/dashboard` | ✅ |
| Booking | `/agent/bookings` | ✅ |
| Pelanggan | `/agent/customers` | ✅ |
| Komisi | `/agent/commissions` | ✅ |
| Jaringan Sub-Agen | `/agent/network` | ✅ |
| CRM Pipeline | `/agent/crm` | ✅ |
| Marketing Kit | `/agent/marketing` | ✅ |
| Pengaturan | `/agent/settings` | ✅ |
| Pelatihan | `/agent/training` | ✅ |

### Portal Cabang — `/cabang/*`
| Halaman | URL | Status |
|---------|-----|--------|
| Dashboard | `/cabang/dashboard` | ✅ |
| Agen Binaan | `/cabang/agen` | ✅ |
| Booking | `/cabang/bookings` | ✅ |
| Laporan | `/cabang/laporan` | ✅ |
| Diskon | `/cabang/diskon` | ✅ |
| Approval | `/cabang/approvals` | ✅ |
| Target KPI Cabang | `/cabang/kpi-targets` | ✅ |

### Portal Muthawif — `/muthawif/*`
| Halaman | URL | Status |
|---------|-----|--------|
| Dashboard | `/muthawif/dashboard` | ✅ |
| Laporan Harian | `/muthawif/laporan-harian` | ✅ |
| Profil Jamaah | `/muthawif/jamaah/:id` | ✅ |
| Panel SOS | `/muthawif/sos` | ✅ |

---

## BAGIAN 5 — RIWAYAT PERUBAHAN TERKINI

### Sesi Juni 2026 (Replit Migration + Enhancement)

| # | Perubahan | File |
|---|-----------|------|
| 1 | Fix TS7030 di `kurs.ts` — tambah `return` ke semua `res.json()` | `api-server/src/routes/v1/kurs.ts` |
| 2 | Fix TS2339 di `KursPage.tsx` — hapus `.toLocaleFixed` yang tidak valid | `pages/public/KursPage.tsx` |
| 3 | Build lib (`tsc --build`) — `lib/api-zod/dist/index.d.ts` ter-generate | `tsconfig.json` |
| 4 | Tambah `QuickMenuGrid` di homepage — 3 seksi: Layanan Utama, Portal Jamaah, Informasi | `components/home/QuickMenuGrid.tsx` |
| 5 | Bottom nav defaults diperbarui — path yang benar ke `/packages`, `/departures`, dll | `hooks/usePWAConfig.ts` |
| 6 | Buat halaman `/jamaah-info` — landing page jamaah lengkap dengan 8 fitur, cara pakai, testimoni, CTA | `pages/public/JamaahInfoPage.tsx` |
| 7 | Admin menu registry dibersihkan — hapus group "Aset & Inventaris" terpisah, pindahkan "Aset Kantor" ke group Dokumen dengan path `/admin/office-assets` | `lib/admin-menu-registry.ts` |
| 8 | Route `/admin/office-assets` ditambahkan ke AdminRoutes | `routes/AdminRoutes.tsx` |
| 9 | Link "Pelajari / Buka Portal" di QuickMenuGrid → `/jamaah-info` | `components/home/QuickMenuGrid.tsx` |
| 10 | `useAdminNotifications` — tambah listener `leads` (INSERT) dan `customer_documents` (INSERT) | `hooks/useAdminNotifications.ts` |
| 11 | `NotificationBell` redesign — summary pills per kategori (Leads/Support/Dokumen/Pembayaran/SOS), ikon per tipe, dismiss per item, SOS pulse merah | `components/admin/NotificationBell.tsx` |

### Fase 1 — UX Portal Jamaah (selesai Juni 2026)

| # | Item | Perubahan | File |
|---|------|-----------|------|
| P1 | ✅ Sidebar Desktop Portal Jamaah | `JamaahBottomNav.tsx` sekarang responsif: sidebar fixed kiri (collapsed/expanded, bisa di-toggle) di ≥ md, bottom nav + overlay "Lebih" di mobile. Body mendapat class `jamaah-portal-active` + `jamaah-sidebar-open/collapsed` via `useEffect`. CSS di `index.css` menambah `padding-left` otomatis ke seluruh 26 halaman jamaah tanpa menyentuh satu per satu. | `components/jamaah/JamaahBottomNav.tsx`, `src/index.css` |
| P2 | ✅ Ikon PWA Beresolusi Tinggi | Favicon SVG diganti — ikon bulan sabit + bintang di atas background hijau (#15803d, rounded corners). PNG 192×192 dan 512×512 digenerate via ImageMagick. `manifest.json` diperbarui: `start_url` → `/jamaah`, shortcuts baru (Portal Jamaah, Waktu Sholat, Panduan Ibadah, Cek Booking), ikon PNG dipisah `purpose: any` dan `purpose: maskable`. | `public/favicon.svg`, `public/images/icon-192.png`, `public/images/icon-512.png`, `public/manifest.json` |
| P3 | ✅ Offline Cache Konten Kritis | `sw.js` diperbarui ke `vinstour-v3`: STATIC_ASSETS mencakup ikon PNG baru; `JAMAAH_ROUTES` mendefinisikan 7 route kritis yang di-cache saat navigasi berhasil; push notification menggunakan ikon PNG dan membuka `/jamaah` saat diklik; `message` handler baru: `CACHE_JAMAAH` untuk pre-cache on demand. | `public/sw.js` |
| P4 | ✅ Onboarding Jamaah Baru | `JamaahPortal.tsx`: auto-redirect ke `/jamaah/welcome` jika `localStorage["jamaah-welcome-seen"]` belum ada — user baru langsung lihat onboarding 5 langkah. `JamaahWelcome.tsx` sudah lengkap (sudah ada sebelumnya, tidak diubah). Wrapper utama portal: `pb-20 md:pb-4`. | `pages/jamaah/JamaahPortal.tsx` |

---

## BAGIAN 6 — DATABASE MIGRATIONS (Urutan Eksekusi)

Jalankan berurutan di **Supabase Dashboard → SQL Editor**:

| # | File | Isi |
|---|------|-----|
| 1 | `migrations/fase1-membership-branch-commission.sql` | Tabel dasar: profiles, packages, bookings, payments, agents, branches, commissions |
| 2 | `migrations/fase2-public-website.sql` | Blog, testimonials, landing page settings |
| 3 | `migrations/fase3-customer-portal.sql` | Tabungan, loyalty, support tickets |
| 4 | `migrations/fase4-6-analytics-notif-operational.sql` | Analytics, notifikasi, operasional |
| 5 | `migrations/whatsapp-tables.sql` | Konfigurasi & log WhatsApp (Fonnte) |
| 6 | `migrations/dashboard-access-config.sql` | Konfigurasi akses dashboard per role |
| 7 | `migrations/hr-enhancements.sql` | SDM/HR: rekrutmen, kontrak, absensi |
| 8 | `migrations/operational-integration.sql` | Rooming, manifest |
| 9 | `migrations/flexible-rooming-groups.sql` | Grup kamar fleksibel |
| 10 | `migrations/multi-mahram-rooming.sql` | Penempatan kamar multi-mahram |
| 11 | `migrations/phase4-push-visa.sql` | Proses push visa & tracking |
| 12 | `migrations/phase5-rbac-improvements.sql` | Penyempurnaan RBAC & audit log |
| 13 | `migrations/fase6-app-settings-va-targets-jamaah.sql` | app_settings, virtual_accounts, targets jamaah |
| 14 | `supabase/migrations/consolidated_fase_13_14_15.sql` | agent_leads, discount_requests, chat_leads, manasik_schedules, package_reviews |
| 15 | `supabase/migrations/fase16_new_tables.sql` | sos_alerts, visa_status_logs, approval_requests, financial_summary, equipment, sales_targets |
| 16 | `supabase/migrations/fase17_remaining_tables.sql` | vendor_contracts, departure_budgets, training_modules, media_gallery, siskohat_sync_logs |
| 17 | `supabase/migrations/fase18_core_settings.sql` | company_settings, bank_accounts, website_settings |
| 18 | `supabase/migrations/fase19_branch_kpi_targets.sql` | branch_monthly_targets |
| 19 | `supabase/migrations/fase20_webhooks_push.sql` | webhook_configs, webhook_logs, push_subscriptions |

---

## BAGIAN 7 — CATATAN TEKNIS PENTING

- **Typecheck**: selalu jalankan `pnpm run typecheck:libs` dahulu sebelum `pnpm --filter @workspace/api-server run typecheck`
- **Tabel baru Supabase**: wajib aktifkan RLS + buat policy per role
- **Notifikasi admin**: tambahkan listener baru di `useAdminNotifications.ts` — JANGAN buat channel terpisah (singleton pattern)
- **Routing**: lazy import di file Routes.tsx, daftarkan di `admin-menu-registry.ts`
- **WhatsApp**: gunakan pola `whatsapp-notifier.ts` yang sudah ada
- **PDF/Excel**: gunakan `jspdf` + `jspdf-autotable` / `xlsx` yang sudah terinstall
- **Mobile-responsive + dark mode + loading skeleton** wajib di setiap halaman baru
- **TypeScript**: gunakan `const supabase: any = supabaseRaw` untuk tabel baru yang belum di-type
- **Permissions**: tambahkan permission key baru di `src/lib/permissions.ts` DAN `admin-menu-registry.ts`
- **Demo mode**: error `42P01` (table not found) ditangani gracefully — app tidak crash
- **Webhook test**: dikirim via `/api/v1/webhook-test` (server-side) agar tidak kena CORS
- **Browser push**: endpoint `/api/push/send` butuh `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`
- **Tailwind**: gunakan v3 via PostCSS — JANGAN gunakan `@tailwindcss/vite` plugin
- **Quick Menu Grid**: link "Portal Jamaah" menuju `/jamaah-info` (bukan `/jamaah` langsung)
- **Aset Kantor**: path admin sekarang `/admin/office-assets` (sebelumnya `/operational/assets`)

---

## BAGIAN 8 — AKSI YANG MASIH MENUNGGU USER

| Prioritas | Item | Catatan |
|-----------|------|---------|
| ⚠️ P1 | Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` di Replit Secrets | Auth & data tidak aktif tanpa ini |
| ⚠️ P2 | Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` di Replit Secrets | API server butuh ini |
| ⚠️ P3 | Jalankan SQL migrations (Bagian 6) ke Supabase — urutan 1–19 | Manual di Supabase SQL Editor |
| ⚠️ P4 | Generate VAPID keys: `npx web-push generate-vapid-keys` | Untuk browser push notifications |
| ⚠️ P5 | Set SMTP credentials untuk kirim email | Opsional, untuk notifikasi email |
| ⚠️ P6 | Set Midtrans keys untuk payment online | Opsional, untuk pembayaran digital |
| ⚠️ P7 | Putuskan: AI Summary — pakai LLM sungguhan atau tetap kalkulasi statistik? | Saat ini: template lokal |

---

## BAGIAN 8B — FASE 2 UX JAMAAH PORTAL (Selesai)

> Dikerjakan setelah Fase 1. Target: P5–P8 peningkatan pengalaman jamaah.

### P5 — Kuis Manasik Interaktif ✅
- **Komponen baru:** `src/components/jamaah/JamaahManasikKuis.tsx`
- **Diintegrasikan di:** `src/pages/jamaah/JamaahManasik.tsx` — tab "Kuis Mandiri"
- **Konten:** 27 soal pilihan ganda, 6 topik (Ihram, Tawaf, Sa'i, Wukuf, Jumrah, Tahallul)
- **Fitur:** 3-screen flow (pilih topik → quiz → hasil), skor terbaik disimpan localStorage, penjelasan setiap jawaban, progress bar per topik

### P6 — Widget Countdown Keberangkatan Real-time ✅
- **Diubah di:** `src/pages/jamaah/JamaahPortal.tsx`
- **Fitur baru:** Hitungan mundur Hari : Jam : Menit : Detik (update setiap 1 detik via setInterval)
- **Tambahan:** Mini-checklist 3 item (Pembayaran, Dokumen, Kesehatan) sebagai shortcut di bawah countdown

### P7 — Profil Kesehatan Jamaah ✅
- **Halaman baru:** `src/pages/jamaah/JamaahKesehatan.tsx` → route `/jamaah/kesehatan`
- **Fitur:** 4 tab — Profil (gol. darah, alergi, kondisi kronis, obat rutin), Kontak (kontak darurat, dokter, nomor darurat Saudi), Vaksin (7 vaksin + status checklist), Kartu (preview kartu darurat cetak/bagikan)
- **Storage:** localStorage — data pribadi tidak dikirim ke server
- **Sidebar:** ditambahkan ke grup Ibadah di `JamaahBottomNav.tsx`

### P8 — SOS Emergency Upgrade ✅
- **Diubah di:** `src/components/jamaah/SOSButton.tsx`
- **Fitur baru:**
  - Hold-to-Send: tekan & tahan 3 detik untuk kirim (cegah kirim tidak sengaja)
  - Progress bar visual saat holding
  - Vibration API saat tahan & saat SOS terkirim
  - 4 nomor darurat Arab Saudi dengan tap-to-call (Ambulans 997, Polisi 999, KJRI Jeddah, KBRI Riyadh)
  - UI baru: header merah, type selector lebih jelas, tombol quick-call & share lokasi terpisah

---

## BAGIAN 9 — STRUKTUR FILE PENTING

```
artifacts/
  umrah-haji/src/
    pages/
      admin/          — semua halaman admin (80+ file)
      public/         — halaman publik termasuk /jamaah-info (JamaahInfoPage.tsx)
      jamaah/         — portal jamaah mobile
      customer/       — portal customer
      agent/          — portal agen
    routes/
      AdminRoutes.tsx      — semua route /admin/*
      PublicRoutes.tsx     — semua route publik + /jamaah-info
      JamaahRoutes.tsx     — semua route /jamaah/*
    hooks/
      useAdminNotifications.ts  — real-time notif (10 listener, singleton channel)
      useDynamicMenus.ts        — menu admin dari DB/registry
    components/
      admin/
        AdminLayoutDynamicImproved.tsx  — layout utama admin
        NotificationBell.tsx            — bell dengan summary pills
      home/
        QuickMenuGrid.tsx  — grid menu homepage
    lib/
      admin-menu-registry.ts  — daftar menu + grup + permission
      permissions.ts          — semua permission key

  api-server/src/
    routes/v1/         — kurs.ts, packages.ts, departures.ts, leads.ts, dll

lib/
  api-zod/   — Zod schemas (wajib build dulu: pnpm run typecheck:libs)
  api-spec/  — openapi.yaml (source of truth untuk codegen)
  db/        — Drizzle schema (belum dipakai, masih Supabase direct)
```
