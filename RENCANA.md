# Rencana & Status Pengembangan — Vinstour Travel Portal

> **Terakhir diperbarui:** Mei 2026 (sesi terbaru: audit status semua backlog — F3 & P7 ternyata sudah selesai, prioritas Sprint 8 ditetapkan)
> **Stack:** React 19 + Vite 7 + TypeScript 5.9 + Supabase + Express (pnpm monorepo)
> **Ini adalah SATU-SATUNYA file rencana resmi. Jangan buat file rencana lain.**

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
| K9 | **Ringkasan anggaran di tab header** — `DepartureBudgetTab` sudah punya `totalBudgeted` & `totalRealized`, tapi tidak muncul di label tab. Tampilkan ringkasan mini (budget vs realisasi) di trigger tab "Budget" | Sedang | 🟡 P1 — kecil, tidak butuh migrasi DB |
| K7 | **Generate sertifikat massal** — tombol 1 klik generate + download sertifikat PDF untuk semua jamaah setelah departure status = `departed` | Rendah | 🟡 P2 — butuh template PDF, tidak butuh migrasi DB |

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
| J3 | **Offline mode dokumen & visa tracker** — `JamaahDocuments` dan `JamaahVisaTracker` masih online-only. Tambahkan cache `localStorage` + banner offline saat tidak ada koneksi, data tetap terbaca dari cache terakhir | 🟡 P2 — tidak butuh migrasi DB |
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

### Sprint 8 — Fitur Sisa & Polish (BERIKUTNYA)

> Urutan berdasarkan **tidak butuh migrasi DB dulu** → **butuh migrasi DB**. Kerjakan P1 ke P3 terlebih dahulu.

```
PRIORITAS 1 — Kecil, tidak butuh migrasi DB, langsung dikerjakan:
──────────────────────────────────────────────────────────────────
19. K9  → Ringkasan anggaran di tab trigger "Budget" di AdminDepartureDetail
           - Baca totalBudgeted & totalRealized dari useDepartureBudget (hook sudah ada)
           - Tampilkan angka mini di label tab: "Budget · Rp X vs Rp Y"
           - File: AdminDepartureDetail.tsx

PRIORITAS 2 — Sedang, tidak butuh migrasi DB:
──────────────────────────────────────────────
20. J3  → Offline cache untuk JamaahDocuments & JamaahVisaTracker
           - Simpan hasil query ke localStorage setelah berhasil fetch
           - Deteksi navigator.onLine → tampilkan banner "Mode Offline — data dari cache terakhir"
           - Data tetap terbaca dari cache saat tidak ada koneksi
           - File: JamaahDocuments.tsx, JamaahVisaTracker.tsx

21. K7  → Generate sertifikat massal di DepartureDetail
           - Tombol "Cetak Semua Sertifikat" muncul saat status departure = departed
           - Loop semua jamaah, generate PDF per jamaah (pakai pdfmake/jsPDF)
           - File: AdminDepartureDetail.tsx + komponen baru DepartureCertificateGenerator.tsx

PRIORITAS 3 — Butuh migrasi DB (ALTER TABLE packages ADD COLUMN label TEXT):
──────────────────────────────────────────────────────────────────────────────
22. P6  → Tag/label kustom paket (Best Seller, Early Bird, Flash Sale)
           - Tambah kolom label TEXT di tabel packages (migration baru: fase24_package_label.sql)
           - Dropdown label di form paket (RegularPackageForm, SavingsPackageForm)
           - Tampilkan badge label di kartu paket di AdminPackages + halaman publik
           - File: AdminPackages.tsx, RegularPackageForm.tsx, SavingsPackageForm.tsx, PackageCard.tsx

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
| AdminPackages | ✅ Sangat lengkap | Tag/label kustom (P6 di Sprint 8) |
| AdminPackageDetail | ✅ Lengkap | — |
| AdminDepartures | ✅ Sangat lengkap | — |
| AdminDepartureDetail | ✅ Sangat lengkap | K9: ringkasan budget di tab header |
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
