# Rencana & Status Pengembangan — Vinstour Travel Portal
> Terakhir diperbarui: Mei 2026 | Stack: React 19 + Vite 7 + TypeScript + Supabase + Express
> File ini menggabungkan semua dokumen rencana sebelumnya menjadi satu sumber kebenaran tunggal.

---

## Legenda

| Simbol | Artinya |
|--------|---------|
| ✅ | Selesai & terhubung ke data nyata |
| ⚠️ | UI ada tapi ada catatan penting |
| 🔴 | Belum dibangun / tidak berfungsi |

---

## BAGIAN 1 — INFRASTRUKTUR

| Item | Status | Catatan |
|------|--------|---------|
| pnpm monorepo (umrah-haji + api-server + api-spec) — Port 5000 / 8080 | ✅ | |
| React 19 + Vite 7 + TypeScript + Tailwind v3 — 0 error TS | ✅ | Typecheck pass setelah 7 bugfix deployment |
| Supabase Auth + Database (demo mode graceful) | ✅ | App jalan tanpa Supabase, tapi fitur mati |
| RBAC granular — Visual Permission Matrix + Audit Log | ✅ | |
| PWA / Service Worker | ✅ | |
| Dark Mode global | ✅ | |
| Multi-tenant (branch/agent subdomain) | ✅ | |
| Export Excel (xlsx) — 15+ halaman | ✅ | |
| Export PDF (jsPDF + autoTable) — 10+ halaman | ✅ | |
| OpenAPI Spec + Codegen (Orval) — type-safe hooks | ✅ | |
| Error Boundary global | ✅ | |

---

## BAGIAN 2 — SEMUA HALAMAN AKTIF (70+ Halaman)

### Portal Publik — `/`
| Halaman | URL | Status |
|---------|-----|--------|
| Landing Page | `/` | ✅ |
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
| Tabungan Umroh | `/savings` | ✅ |
| Website Agen | `/a/:agentSlug` | ✅ |
| Website Cabang | `/b/:branchSlug` | ✅ |

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
| Ringkasan AI | `/jamaah/ringkasan-ai` | ✅ ⚠️ Template lokal, bukan LLM sungguhan |
| Pembayaran Mandiri | `/jamaah/payment` | ✅ |
| Checklist | `/jamaah/checklist` | ✅ |
| Manasik Digital | `/jamaah/manasik` | ✅ |
| SOS Status | `/jamaah/sos-status` | ✅ |

### Portal Admin — `/admin/*`
| Halaman | URL | Status |
|---------|-----|--------|
| Dashboard | `/admin/dashboard` | ✅ |
| Analytics | `/admin/analytics` | ✅ |
| KPI Dashboard | `/admin/kpi-dashboard` | ✅ Target disimpan ke DB via tombol "Atur Target" |
| Dashboard Keuangan | `/admin/keuangan-dashboard` | ✅ |
| Booking | `/admin/bookings`, `/admin/bookings/:id` | ✅ |
| Paket | `/admin/packages` | ✅ |
| Lead Scoring | `/admin/leads` | ✅ |
| CRM Kanban | `/admin/crm` | ✅ |
| Keberangkatan | `/admin/departures`, `/admin/departures/:id` | ✅ |
| Keuangan P&L | `/admin/keuangan` | ✅ |
| Keuangan Kas | `/admin/kas` | ✅ |
| Keuangan AR | `/admin/ar` | ✅ |
| Hotel | `/admin/hotels` | ✅ |
| Vendor | `/admin/vendors` | ✅ |
| Agen | `/admin/agents` | ✅ |
| Cabang | `/admin/branches` | ✅ |
| Pelanggan | `/admin/customers` | ✅ |
| Muthawif | `/admin/muthawif` | ✅ |
| Komisi | `/admin/commissions` | ✅ |
| SDM/HR | `/admin/hr` | ✅ |
| Notifikasi (In-App) | `/admin/notifications` | ✅ |
| Push Notifikasi Jamaah | `/admin/push-notifications` | ✅ Tersimpan ke Supabase `customer_notifications`. Browser push butuh VAPID keys |
| Webhook Outgoing | `/admin/webhooks` | ✅ **DIPERBAIKI** — Tersimpan ke Supabase `webhook_configs`. Test Ping sungguhan via server proxy |
| Smart Notif | `/admin/smart-notif` | ⚠️ Pengaturan ke localStorage. Open-rate hardcoded, bukan AI |
| AI Summary | `/admin/ai-summary` | ⚠️ Data dari Supabase nyata, "AI Insight" adalah kalkulasi statistik biasa |
| Laporan | `/admin/reports` | ✅ |
| Log Audit | `/admin/audit` | ✅ |
| Pengaturan | `/admin/settings` | ✅ |
| SOS Alerts | `/admin/sos-alerts` | ✅ |
| SISKOHAT Kemenag | `/admin/siskohat` | ✅ Log ke Supabase. API Kemenag resmi butuh akun PPIU |
| Approval Workflow | `/admin/approvals` | ✅ |
| Kontrak Vendor | `/admin/vendor-contracts` | ✅ |
| Pelatihan Agen | `/admin/training` | ✅ |
| Galeri Media | `/admin/media-gallery` | ✅ |
| 2FA Settings | `/admin/settings` (tab) | ⚠️ Toggle tersimpan ke Supabase, enforcement TOTP belum diimplementasi |

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

## BAGIAN 3 — FITUR LANJUTAN (Fase 16+)

### Fitur 01 — SOS Real-time ✅ SELESAI
- JamaahSOSStatus.tsx — jamaah kirim dan pantau SOS
- MuthawifSOS.tsx — muthawif terima dan tangani SOS
- sos_alerts table dengan RLS

### Fitur 02 — Notifikasi Otomatis Perubahan Status Visa ✅ SELESAI
- `useVisaStatusUpdate.ts` — hook update visa + WhatsApp notif + log

### Fitur 03 — Integrasi SISKOHAT Kemenag ✅ SELESAI
- `AdminSISKOHAT.tsx` — ekspor data jamaah haji ke format Kemenag
- `siskohat_sync_logs` table (fase17)

### Fitur 04 — Approval Workflow Berjenjang ✅ SELESAI
- `AdminApprovals.tsx` — multi-level approval untuk refund/diskon/pembatalan
- `BranchApprovals.tsx` — approval di level cabang
- `CustomerRefundStatus.tsx` — customer pantau status pengajuan mereka
- `useApprovalWorkflow.ts` — logika approval + eskalasi
- `approval_requests`, `approval_actions`, `approval_configs` tables (fase16+17)

### Fitur 05 — Manajemen Kontrak Vendor ✅ SELESAI
- `AdminVendorContracts.tsx` — CRUD kontrak + reminder expired
- `vendor_contracts` table (fase17)

### Fitur 06 — Budget vs Realisasi per Keberangkatan ✅ SELESAI
- `DepartureBudgetTab` di `AdminDepartureDetail.tsx`
- `useDepartureBudget.ts` — hook CRUD budget + variance kalkulasi
- `departure_budgets` table (fase17)

### Fitur 07 — Modul Pelatihan Produk Agen ✅ SELESAI
- `AdminTraining.tsx` — admin kelola modul + kuis
- `AgentTraining.tsx` — agen ikuti pelatihan + kuis
- `training_modules`, `training_quizzes`, `agent_training_progress` tables (fase17)

### Fitur 08 — Video Testimoni & Virtual Tour 360° ✅ SELESAI
- `AdminMediaGallery.tsx` — admin kelola video + virtual tour + foto hotel
- `media_gallery` table (fase17)
- Koneksi ke `/testimonials` dan detail paket publik

### Fitur 09 — Jaringan Sub-Agen Multi-Level ✅ SELESAI (UI)
- `AgentNetwork.tsx` upgrade: tree view + rekrut + performa
- `agent_override_commissions` table (fase17)
- Kolom `level` di `agents` (fase17)

### Fitur 10 — Kalkulator Bagasi Mandiri Jamaah ✅ SELESAI (UI)
- `JamaahBagasi.tsx` upgrade: tab kalkulator bawaan
- `baggage_reference_items` table + seed 20 item (fase17)
- Kolom `bagasi_kg_allowed` di `bookings` (fase17)

### Fitur 11 — Target KPI Cabang Mandiri ✅ SELESAI
- `BranchKPITargets.tsx` — halaman baru di `/cabang/kpi-targets`
- `branch_monthly_targets` table dengan RLS (fase19)

### Fitur 12 — Webhook Outgoing ✅ DIPERBAIKI
- `AdminWebhooks.tsx` — CRUD tersimpan ke Supabase `webhook_configs` (bukan localStorage)
- Test Ping sungguhan via server proxy `/api/v1/webhook-test` dengan HMAC-SHA256 signature
- Log tersimpan ke `webhook_logs`, stats (success/fail count) diperbarui otomatis
- `webhook_configs`, `webhook_logs` tables (fase20)

### Fitur 13 — Browser Push Notifications ✅ ENDPOINT DIBUAT
- `POST /api/push/send` — kirim web push ke semua subscriber (web-push + VAPID)
- `POST /api/push/subscribe` — simpan subscription browser
- `GET /api/push/vapid-public-key` — frontend ambil public key
- `push_subscriptions` table (fase20)
- **Perlu**: `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY` di Replit Secrets (generate: `npx web-push generate-vapid-keys`)

---

## BAGIAN 4 — DATABASE MIGRATIONS

### Urutan Eksekusi SQL (jalankan berurutan di Supabase SQL Editor)

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
| 14 | `supabase/migrations/consolidated_fase_13_14_15.sql` | agent_leads, discount_requests, chat_leads, manasik_schedules, manasik_attendance, package_reviews |
| 15 | `supabase/migrations/fase16_new_tables.sql` | sos_alerts, visa_status_logs, approval_requests/actions, dashboard_access_config, financial_summary, transactions, expenses, marketing, equipment, sales_targets, trip_timeline |
| 16 | `supabase/migrations/fase17_remaining_tables.sql` | vendor_contracts, departure_budgets, training_modules/quizzes/progress, media_gallery, siskohat_sync_logs, approval_configs, agent_override_commissions, baggage_reference_items |
| 17 | `supabase/migrations/fase18_core_settings.sql` | company_settings (+ KPI targets seed), bank_accounts, website_settings, contact_page_content |
| 18 | `supabase/migrations/fase19_branch_kpi_targets.sql` | branch_monthly_targets — target KPI per cabang per bulan |
| 19 | `supabase/migrations/fase20_webhooks_push.sql` | webhook_configs, webhook_logs, push_subscriptions |

### Cara Menjalankan

1. Buka [Supabase Dashboard](https://app.supabase.com) → pilih project
2. Klik **SQL Editor** → **New query**
3. Copy-paste isi file SQL → klik **Run**
4. Ulangi sesuai urutan di atas

---

## BAGIAN 5 — ENVIRONMENT VARIABLES (Replit Secrets)

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

---

## BAGIAN 6 — CATATAN TEKNIS

- **Tabel baru**: semua wajib aktifkan RLS + buat policy per role
- **Notifikasi**: lewat `useAdminNotifications.ts` — tambahkan tipe baru, jangan buat channel terpisah
- **Routing**: lazy import di file Routes, daftarkan di `menu_items` via SQL seed
- **WhatsApp**: gunakan pola `whatsapp-notifier.ts` yang sudah ada
- **PDF/Excel**: gunakan `jspdf` + `jspdf-autotable` / `xlsx` yang sudah terinstall
- **Mobile-responsive + dark mode + loading skeleton** wajib di setiap halaman baru
- **TypeScript**: gunakan `const supabase: any = supabaseRaw` untuk tabel baru yang belum di-type
- **Permissions**: tambahkan permission key baru di `src/lib/permissions.ts`
- **Demo mode**: app jalan tanpa Supabase — error `42P01` (table not found) ditangani gracefully
- **Webhook test**: dikirim via `/api/v1/webhook-test` (server-side) agar tidak kena CORS
- **Browser push**: endpoint `/api/push/send` butuh `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`

---

## BAGIAN 7 — STATUS PENGERJAAN

| Prioritas | Item | Status |
|-----------|------|--------|
| ✅ P1 | Semua halaman 11 fitur lanjutan | **SELESAI** |
| ✅ P2 | `CustomerRefundStatus.tsx` + route | **SELESAI** |
| ✅ P3 | SQL migrations fase 16–20 | **SELESAI** |
| ✅ P4 | Endpoint `/api/push/send` (browser push) | **SELESAI** — butuh VAPID keys di Secrets |
| ✅ P5 | AdminWebhooks → Supabase (bukan localStorage) | **SELESAI** — tabel `webhook_configs` + `webhook_logs` |
| ✅ P6 | Test Ping webhook sungguhan | **SELESAI** — server proxy + HMAC signature |
| ✅ P7 | UI Integrasi & API Keys di AdminSettings | **SELESAI** — 5 grup: Supabase, VAPID, Midtrans, Fonnte, SMTP |
| ✅ P8 | Tombol Test Koneksi per integrasi | **SELESAI** — Supabase (HTTP real), VAPID/Midtrans (format), Fonnte (HTTP real) |
| ✅ P9 | Kirim Email Test sungguhan dari UI | **SELESAI** — endpoint `/api/v1/test-smtp` + dialog di AdminSettings |
| ⚠️ P10 | Jalankan SQL migrations ke Supabase (fase 1–20) | **Menunggu user** (aksi manual di dashboard Supabase) |
| ⚠️ P11 | Set env vars: Supabase, VAPID, Midtrans, SMTP | **Menunggu user** (aksi manual di Replit Secrets) |
| ⚠️ P12 | JamaahRingkasanAI — gunakan AI sungguhan? | **Keputusan user** — saat ini template lokal |
| ⚠️ P13 | AdminSmartNotif — gunakan AI sungguhan? | **Keputusan user** — saat ini localStorage + angka hardcoded |

---

## BAGIAN 8 — FITUR INTEGRASI & API KEYS (Baru)

> Semua diakses di: **Admin → Pengaturan → Integrasi & API Keys** (khusus Super Admin)

| Grup | Tombol Test | Kirim Test Sungguhan | Keterangan |
|------|-------------|----------------------|------------|
| Supabase | ✅ HTTP fetch ke `/rest/v1/` | — | Cek URL + Anon Key valid |
| VAPID Push | ✅ Validasi format kunci | — | Panjang & prefix base64url |
| Midtrans | ✅ Validasi prefix key | — | Deteksi Sandbox vs Produksi |
| WhatsApp (Fonnte) | ✅ HTTP ke `/get-devices` | — | Tampilkan perangkat terhubung |
| SMTP Email | ✅ Validasi format konfigurasi | ✅ Kirim email HTML via server | Endpoint `/api/v1/test-smtp` |

**Endpoint server-side baru:**
- `POST /api/v1/test-smtp` — Kirim email test menggunakan nodemailer. Params: `{ host, port, user, pass, to }`. Fallback ke env vars jika kosong.
- Email HTML berisi tabel konfigurasi + timestamp WIB.

---

*File ini adalah satu-satunya dokumen rencana. File lama (RENCANA_PENGEMBANGAN_LANJUTAN.md, rencana2jemaah.md, migrations/README.md) telah dihapus dan dikonsolidasi ke sini.*
