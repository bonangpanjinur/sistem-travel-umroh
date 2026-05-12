# Rencana & Status Pengembangan — Vinstour Travel Portal

> **Terakhir diperbarui:** Mei 2026
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

#### Yang Masih Kurang (Backlog)

| ID | Fitur | Dampak | Prioritas |
|----|-------|--------|-----------|
| P4 | **Riwayat perubahan harga** — audit trail: siapa ubah harga, dari berapa ke berapa, kapan | Menengah | 🟡 |
| P6 | **Tag/label kustom** — selain `is_featured`, admin perlu label "Best Seller", "Early Bird", "Flash Sale" | Rendah | - |
| P7 | **Salin itinerary antar paket** — copy template itinerary dari paket A ke paket B 1 klik | Rendah | - |

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

| ID | Fitur | Dampak | Prioritas |
|----|-------|--------|-----------|
| K7 | **Generate sertifikat massal** — tombol 1 klik generate sertifikat untuk semua jamaah setelah trip completed | Rendah | - |
| K9 | **Ringkasan anggaran di header** — DepartureBudgetTab ada tapi tidak muncul di overview. Tampilkan total aktual vs anggaran di tab header | Rendah | - |

---

### 6C — Booking & Pembayaran — Backlog

#### Yang Sudah Ada ✅ (dari analisis sebelumnya)
- Semua fitur di Bagian 5 (A–D yang sudah ✅)

#### Yang Masih Perlu Diperhatikan

| ID | Fitur | Status |
|----|-------|--------|
| F1 | **Midtrans payment gateway terintegrasi** — halaman Midtrans Config ada, tapi belum tentu flow payment online berjalan end-to-end | ⚠️ Perlu test |
| F2 | **Cicilan otomatis** — reminder cicilan sudah ada tapi belum ada generator jadwal cicilan dari booking | 🟡 |
| F3 | **Laporan piutang per booking** — Finance AR ada tapi apakah terhubung ke data booking aktual? | ⚠️ Perlu cek |

---

### 6D — Portal Jamaah — Backlog

| ID | Fitur | Prioritas |
|----|-------|-----------|
| J1 | **Ringkasan AI sungguhan** — `/jamaah/ringkasan-ai` saat ini template lokal, bukan LLM. Perlu integrasi OpenAI/Gemini atau fallback cerdas berbasis data booking | 🟡 |
| J2 | **Push notification di iOS** — PWA iOS baru support push notification sejak iOS 16.4. Perlu test | ⚠️ |
| J3 | **Offline mode** — checklist & itinerary sudah bisa offline, tapi dokumen dan visa tracker masih online-only | 🟡 |
| J4 | **Deep link dari WA** — ketika jamaah klik link WA, redirect langsung ke halaman yang relevan di portal | 🟡 |

---

### 6E — Fitur Baru yang Belum Ada

| ID | Fitur | Modul | Prioritas |
|----|-------|-------|-----------|
| N1 | **Prediksi isi kursi** (`/admin/prediksi-seat`) | Admin | 🟡 Route sudah ada di AdminPrediksiSeat |
| N2 | **Integrasi SISKOHAT Kemenag** — sinkronisasi data jamaah haji ke sistem resmi | Admin | 🟡 |
| N3 | **Portal Pelaporan Muthawif** — laporan harian per lokasi (Mekah/Madinah/Jeddah) dengan foto | Muthawif | 🟡 |
| N4 | **Dashboard KPI Cabang** — target monthly vs aktual per KPI: booking, revenue, konversi lead | Cabang | ⚠️ Perlu cek apakah KPI targets terhubung ke data aktual |
| N5 | **Penilaian jamaah oleh muthawif** — muthawif bisa input catatan per jamaah selama perjalanan | Muthawif | 🟡 |
| N6 | **Rate card & proposal otomatis** — admin bisa generate PDF proposal harga per paket untuk calon jamaah | Admin | 🟡 |
| N7 | **Integrasi Qris** — pembayaran via Qris langsung dari halaman booking | Pembayaran | 🔴 |
| N8 | **Multi-bahasa (i18n)** — halaman publik + jamaah portal dalam Bahasa Arab & Inggris | Public | 🔴 |

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

### Sprint 4 — Peningkatan Portal & Integrasi

```
11. J1  → Ringkasan AI berbasis data aktual (bukan template)
12. F2  → Generator jadwal cicilan otomatis
13. N6  → Rate card & proposal PDF otomatis
14. N2  → Integrasi SISKOHAT Kemenag
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
| 19 | `supabase/migrations/fase20_webhooks_push.sql` | webhooks, push subscriptions |
| 20 | `supabase/migrations/store_ecommerce.sql` | toko e-commerce |
| 21 | `supabase/migrations/store_product_reviews.sql` | review produk |
| 22 | `supabase/migrations/fase21_integration_fixes.sql` | customer_notifications, jamaah_checklist, attendance, feedback, visa_status_logs, room_occupants + kolom baru |

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

## BAGIAN 12 — CATATAN BUG & SOLUSI YANG SUDAH DITEMUKAN

| Bug | Solusi | File |
|-----|--------|------|
| `bookings.agent_id` tidak ada FK ke `agents` → Supabase JOIN error | Fetch agent terpisah: `(supabase as any).from('agents').eq('id', agentId).maybeSingle()` | AdminBookingDetail.tsx |
| Airport FK hint salah (gunakan nama constraint) | Gunakan nama kolom: `airports!departure_airport_id` bukan `airports!departures_departure_airport_id_fkey` | AdminDepartures.tsx, AdminDepartureDetail.tsx |
| `remaining_amount` adalah generated column | Jangan masukkan ke INSERT/UPDATE, hanya baca | AdminBookingDetail.tsx |
| AdminSentimenFeedback membaca tabel `feedback` yang tidak ada | Ganti ke `testimonials`, field `content` → `comment` | AdminSentimenFeedback.tsx |
| booking_status_history timeline dibuat manual (hardcoded) | Sekarang baca dari tabel nyata `booking_status_history` | AdminBookingDetail.tsx |
| CustomerRoutes tidak ada role check — semua role bisa akses `/jamaah/*` | Batasi ke `customer`, `jamaah`, `super_admin` saja | CustomerRoutes.tsx |
| `sales` mewarisi `agent` di ROLE_HIERARCHY | Hapus inheritance — agent bukan staf internal | permissions.ts |
