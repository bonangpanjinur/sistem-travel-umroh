# Rencana & Status Pengembangan — Vinstour Travel Portal
> Terakhir diperbarui: Mei 2026 | Stack: React 19 + Vite 7 + TypeScript + Supabase + Express
> **Ini adalah SATU-SATUNYA file rencana. Jangan buat file rencana lain.**

---

## Legenda

| Simbol | Artinya |
|--------|---------|
| ✅ | Selesai & berfungsi |
| ⚠️ | Ada catatan penting / menunggu aksi |
| 🔴 | Belum dibangun / direncanakan |

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
| PWA Settings + Upload Ikon | `/admin/pwa-settings` | ✅ Upload ikon PWA |
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

### Sesi Mei 2026 — Refund Activity Log + Perbaikan RBAC Sistem

| # | Perubahan | File |
|---|-----------|------|
| 1 | **Log otomatis saat refund dibuat** — `mutationFn` kini mengambil ID record refund via `.select('id').single()` setelah insert, lalu `onSuccess` memanggil `logActivity` dua kali: sekali untuk booking (`cancelled_with_refund`/`cancelled_no_refund`, dengan `old_value` status sebelumnya) dan sekali untuk refund (`refund_created`, `entity_type: 'refund'`, dengan metadata lengkap: jumlah, metode, rekening, kode booking) | `AdminBookingDetail.tsx` |
| 2 | **Tambah role `jamaah` ke `AppRole` type** — sebelumnya ada di `ROLE_LABELS` & `ROLE_PRIORITY` tapi tidak ada di type, menyebabkan ketidakkonsistenan TypeScript | `types/database.ts` |
| 3 | **Perbaikan `isStaff()`** — agent/sub_agent sebelumnya masuk grup staf internal; sekarang hanya staf kantor (super_admin, owner, branch_manager, finance, sales, marketing, operational, equipment). Ditambah `isAgent()` dan `isCustomer()` sebagai helper terpisah | `hooks/useAuth.tsx` |
| 4 | **Perbaikan `CustomerRoutes`** — celah keamanan: semua role bisa akses `/jamaah/*`. Sekarang dibatasi ke `customer`, `jamaah`, `super_admin` saja | `routes/CustomerRoutes.tsx` |
| 5 | **Perbaikan `/absensi` route** — sebelumnya tanpa role check; sekarang hanya `super_admin`, `owner`, `branch_manager`, `operational`, `finance` | `routes/OperationalRoutes.tsx` |
| 6 | **Granular permission AgentRoutes** — komisi & dompet hanya untuk `agent` (bukan `sub_agent`); manajemen jaringan & website hanya untuk `agent` | `routes/AgentRoutes.tsx` |
| 7 | **Login redirect berbasis role** — sebelumnya hanya admin→`/admin` atau semua→`/my-bookings`; sekarang: admin staf→`/admin`, agent/sub_agent→`/agent`, customer/jamaah→`/jamaah` | `pages/auth/Login.tsx`, `hooks/useRoleHomeRoute.ts` |
| 8 | **AccessDenied page kontekstual** — tampilkan nama role user + tombol "Ke Portal Saya" yang mengarah ke portal yang sesuai | `pages/AccessDenied.tsx` |
| 9 | **Perbaikan ROLE_HIERARCHY** — `sales` tidak lagi mewarisi `agent`; `sub_agent` mewarisi `agent`; `jamaah` dan `customer` tidak ada dalam hierarki | `lib/permissions.ts` |
| 10 | **Hook baru `useCanAccess`** — untuk cek permission di level komponen/UI (`can('payments')`, `isAgent()`, `isCustomer()`, dll) | `hooks/useCanAccess.ts` |
| 11 | **Hook baru `useRoleHomeRoute`** — mengembalikan URL portal yang tepat untuk role aktif user | `hooks/useRoleHomeRoute.ts` |
| 12 | **SQL migration RBAC** — tambah enum `jamaah`/`sub_agent`, update constraint `user_roles_role_check`, RLS policy sub_agent & absensi | `supabase-migrations/phase5-rbac-improvements.sql` |

---

### Sesi Mei 2026 — Multi Tipe Kamar Per Jamaah + Enhancement Booking Detail

**Perubahan yang diselesaikan:**

| # | Perubahan | File |
|---|-----------|------|
| 1 | Fix bug `remaining_amount` adalah generated column — hapus dari UPDATE di ChangeRoomTypeDialog | `ChangeRoomTypeDialog.tsx` |
| 2 | Ringkasan Pembayaran sidebar diganti versi rinci: harga/pax per tipe kamar × jumlah jamaah, add-ons, diskon, riwayat tiap pembayaran (metode/tanggal/status), progress bar, tombol tambah pembayaran | `AdminBookingDetail.tsx` |
| 3 | Section detail paket: tambah tanggal kembali, hotel Makkah & Madinah, durasi program | `AdminBookingDetail.tsx` |
| 4 | **Fitur baru: Alokasi Tipe Kamar Per Jamaah** — dialog `RoomTypeAssignmentDialog` dengan tabel harga referensi, selector per jamaah, tombol "Atur semua ke...", kalkulasi ulang total harga saat simpan, batch update `booking_passengers.room_preference` + update `bookings.total_price` | `RoomTypeAssignmentDialog.tsx` |
| 5 | Tampilan Tipe Kamar di detail booking: badge berwarna per tipe (Double ×2 / Triple ×3 / Quad ×1) baca dari `room_preference` aktual tiap jamaah, bukan satu badge saja | `AdminBookingDetail.tsx` |
| 6 | Payment summary sidebar membaca dari `room_preference` per jamaah — grup per tipe kamar, breakdown rinci jika tipe campur | `AdminBookingDetail.tsx` |
| 7 | Kolom "Kamar" ditambahkan ke tabel manifest jamaah dengan badge berwarna per tipe | `BulkPassengerExport.tsx` |

**Cara kerja RoomTypeAssignmentDialog:**
- Fetch departure untuk ambil harga per tipe (price_quad/triple/double/single)
- Tampilkan tabel referensi harga
- Tiap jamaah punya selector Quad / Triple / Double / Single
- Tombol "Atur semua ke X" untuk ubah sekaligus
- Preview kalkulasi total: "Double: 2 × Rp 15jt = Rp 30jt", "Triple: 3 × Rp 12jt = Rp 36jt"
- Saat Simpan: batch update `booking_passengers.room_preference`, hitung ulang total, update `bookings.total_price + base_price + room_type` (dominant)

---

### Sesi Mei 2026 — Integrasi Gap Fix (Analisis Menyeluruh)

| # | Gap | Fix | File Utama |
|---|-----|-----|------------|
| 1 | `AdminSentimenFeedback` baca dari tabel `feedback` yang tidak ada | Ganti ke `testimonials`, field `content` → `comment` | `AdminSentimenFeedback.tsx` |
| 2 | Verifikasi dokumen tidak memberi tahu jamaah | Tambah insert `customer_notifications` saat verify/reject | `AdminDocumentVerification.tsx` |
| 3 | Perubahan status booking tidak memberi tahu jamaah | Tambah insert `customer_notifications` untuk semua status | `AdminBookingDetail.tsx` |
| 4 | `JamaahChecklist` hanya simpan ke localStorage | Upgrade ke Supabase-persistent (`jamaah_checklist` table) + localStorage fallback | `JamaahChecklist.tsx` |
| 5 | Upload dokumen jamaah tidak memberi tahu admin | Tambah insert ke `notifications` setelah upload berhasil | `JamaahDocuments.tsx` |
| 6 | Nomor kamar tidak terlihat dari portal jamaah | Tampilkan `booking.room_number` + tipe kamar di card Detail Akomodasi | `JamaahPortal.tsx` |
| 7 | Tabel `jamaah_checklist`, `attendance`, `customer_notifications`, `feedback`, `visa_status_logs`, `room_occupants` belum ada | Migration SQL lengkap dengan RLS + policy | `supabase/migrations/fase21_integration_fixes.sql` |
| 8 | Kolom `booking_id` di `testimonials` dan `room_number` di `bookings` belum ada | ALTER TABLE via migration fase21 | `fase21_integration_fixes.sql` |

**Migration baru: `supabase/migrations/fase21_integration_fixes.sql`**

---

### Sesi Mei 2026 — E-Commerce Toko + Upload Bukti Bayar

| # | Perubahan | File |
|---|-----------|------|
| 1 | SQL migration toko e-commerce lengkap (store_categories, store_products, store_orders, store_order_items, store_shipments) | `supabase/migrations/store_ecommerce.sql` |
| 2 | Semua hooks store (useStore.ts) — CRUD produk, kategori, pesanan, pengiriman | `hooks/useStore.ts` |
| 3 | Halaman admin: Dashboard Toko, Produk, Pesanan+Resi, Kategori | `pages/admin/AdminStore*.tsx` |
| 4 | Halaman customer: Listing Toko, Checkout, Daftar Pesanan, Detail Pesanan | `pages/customer/Store*.tsx` |
| 5 | Upload bukti transfer dari halaman detail pesanan jamaah | `pages/customer/StoreOrderDetail.tsx` |
| 6 | Admin dapat melihat foto bukti bayar di dialog detail pesanan | `pages/admin/AdminStoreOrders.tsx` |
| 7 | 4 template WA: order confirmed, shipped, delivered, awaiting payment | `lib/whatsapp-notifier.ts` |
| 8 | Link Toko di navbar + Quick Menu Grid homepage | `DynamicNavbar.tsx`, `QuickMenuGrid.tsx` |
| 9 | Notifikasi admin otomatis saat jamaah upload bukti bayar | `hooks/useStore.ts` |

---

### Sesi Juni 2026 — Enhancement Navigation + PWA

| # | Perubahan | File |
|---|-----------|------|
| 1 | Merge PLAN.md + RENCANA.md → satu file | `RENCANA.md` |
| 2 | Menu "Layanan Utama", "Portal Jamaah", "Fitur Islami" dipindah ke header navbar sebagai mega dropdown | `DynamicNavbar.tsx` |
| 3 | PWA standalone mode detection — layout berbeda saat diinstall sebagai app | `usePWAMode.ts`, `DynamicPublicLayout.tsx` |
| 4 | Upload ikon PWA dari panel admin | `AdminPWASettings.tsx` |
| 5 | Admin panel dapat mengatur tampilan PWA (warna, ikon, splash) secara dinamis | `AdminPWASettings.tsx` |
| 6 | Fix workflows — pnpm install selesai, app berjalan | `.replit` |

---

## BAGIAN 6 — BACKLOG: PENINGKATAN HALAMAN BOOKING DETAIL

> Analisis menyeluruh `AdminBookingDetail.tsx` (`/admin/bookings/:id`).
> Diurutkan per kategori. Kerjakan sesuai prioritas.

### A — Data Ada di DB, Belum Ditampilkan

| # | Field | Tabel | Prioritas | Status |
|---|-------|-------|-----------|--------|
| A1 | `agent_id` → nama agen + kode agen + link ke halaman komisi | `bookings` → join `agents` | Tinggi | ✅ |
| A2 | `sales_id` → siapa staf yang input booking | `bookings` → join `profiles` | Sedang | 🔴 |
| A3 | `branch_id` → cabang mana | `bookings` → join `branches` | Sedang | ✅ |
| A4 | `payment_status` enum (terpisah dari `booking_status`) | `bookings` | Sedang | 🔴 |
| A5 | `adult_count / child_count / infant_count` sebagai breakdown pax eksplisit | `bookings` | Rendah | 🔴 |
| A6 | `currency` mata uang booking (IDR/USD/SAR) | `bookings` | Rendah | 🔴 |
| A7 | `passenger_type` (Dewasa/Anak/Bayi) per jamaah di tabel manifest | `booking_passengers` | Tinggi | ✅ |
| A8 | `room_number` nomor kamar hotel fisik per jamaah (beda dengan tipe kamar) | `booking_passengers` | Sedang | ✅ Tampil di tabel manifest |
| A9 | `roommate_id` tampilkan pasangan sekamar per jamaah | `booking_passengers` | Rendah | 🔴 |
| A10 | `special_requests` permintaan khusus per jamaah (kursi roda, diet, dll) | `booking_passengers` | Tinggi | ✅ |
| A11 | `is_main_passenger` tandai jamaah utama/pemesan di manifest | `booking_passengers` | Rendah | ✅ Badge PIC di tabel manifest |

### B — Tabel Terkait yang Belum Dipakai

| # | Tabel | Yang Bisa Ditampilkan | Prioritas | Status |
|---|-------|----------------------|-----------|--------|
| B1 | `booking_status_history` | Timeline aktivitas saat ini dibuat manual. Tabel ini menyimpan siapa yang ubah status, dari apa ke apa, kapan, dan notes — gunakan untuk timeline nyata | Tinggi | ✅ |
| B2 | `customer_mahrams` | Data mahram tiap jamaah (nama, relasi) — sangat relevan untuk booking umroh tapi tidak ditampilkan di manifest sama sekali | Sedang | 🔴 |

### C — Fitur Interaktif yang Belum Ada

| # | Fitur | Detail | Prioritas | Status |
|---|-------|--------|-----------|--------|
| C1 | Edit catatan booking inline | `booking.notes` tampil read-only; tambah tombol edit langsung tanpa buka dialog baru | Rendah | 🔴 |
| C2 | Edit payment deadline | Batas bayar tampil di sidebar tapi tidak bisa diubah dari halaman ini | Sedang | 🔴 |
| C3 | Klik WhatsApp langsung | Nomor HP customer tampil tapi tidak ada tombol "Chat WA" yang buka `wa.me/62xxx` | Tinggi | ✅ |
| C4 | Salin kode booking | Tidak ada tombol copy-to-clipboard di sebelah kode booking | Rendah | ✅ |
| C5 | Assign nomor kamar hotel | `room_number` ada di DB, belum ada UI untuk mengisinya per jamaah | Sedang | 🔴 |
| C6 | Checklist kelengkapan dokumen | Belum ada indikator apakah passport/KTP/foto sudah dikumpulkan per jamaah | Tinggi | ✅ Ikon perisai + skor per jamaah |
| C7 | Pelacakan refund | Jika status `refunded` — tidak ada info jumlah refund, metode, atau tanggal di halaman ini | Sedang | 🔴 |

### D — UX & Tampilan yang Bisa Dioptimalkan

| # | Item | Detail | Prioritas | Status |
|---|------|--------|-----------|--------|
| D1 | Timeline pakai data nyata dari `booking_status_history` | Tampilkan siapa yang ubah, dari status apa, kapan, dan notes | Tinggi | ✅ |
| D2 | Alert jika jumlah jamaah < `total_pax` | Misal total_pax = 5 tapi baru 3 jamaah terdaftar → warning banner | Sedang | ✅ |
| D3 | Konfirmasi ke cancelled → tanya refund otomatis | Saat admin ubah status ke cancelled, munculkan pilihan: proses refund? | Sedang | ✅ |
| D4 | Panel info agen di sidebar | Jika `agent_id` ada, tampilkan nama agen, kode, dan total komisi yang sudah dicatat | Tinggi | ✅ |
| D5 | Milestone progress pelunasan | Progress bar ada, tapi tanpa milestone (misal "DP 30% sudah terpenuhi") | Rendah | 🔴 |

### E — Halaman Admin Baru (Pasca D3)

| # | Halaman | Detail | Status |
|---|---------|--------|--------|
| E1 | Monitor Refund `/admin/refunds` | Daftar semua pengajuan refund, filter status/metode, update status, catatan admin, export Excel | ✅ |
| E2 | Log Aktivitas Admin `/admin/activity-log` | Riwayat semua perubahan status booking & refund oleh admin, filter, export Excel, auto-logged via helper `logActivity` | ✅ |
| E3 | Log siklus hidup refund lengkap | Saat refund dibuat dari dialog D3: (1) log `cancelled_with_refund` pada entity booking dengan `old_value` status sebelumnya, (2) log `refund_created` pada entity refund dengan metadata jumlah/metode/rekening/kode booking | ✅ |
| E4 | Halaman detail refund `/admin/refunds/:id` | Info lengkap jamaah + booking + rincian dana; panel aksi update status (proses/batalkan) dengan catatan admin; timeline aktivitas vertikal dari `admin_activity_log` untuk refund ini; link ke booking detail; link ke activity log global | ✅ |

### Status yang sudah ada & berfungsi di Booking Detail
- ✅ Update status booking + konfirmasi dialog + notifikasi jamaah otomatis
- ✅ Edit data customer (EditCustomerDialog)
- ✅ Alokasi tipe kamar per jamaah (RoomTypeAssignmentDialog) — baru dibangun
- ✅ Ubah tipe kamar global (ChangeRoomTypeDialog) — sudah fixed
- ✅ Pindah paket (ChangePackageDialogV2)
- ✅ Manifest jamaah + badge tipe kamar per orang (BulkPassengerExport)
- ✅ Tabel manifest enhanced: tipe jamaah (Dewasa/Anak/Bayi), kamar, dok. checklist, permintaan khusus
- ✅ Riwayat pembayaran tabel + approve pending payment + lihat bukti
- ✅ Ringkasan pembayaran rinci sidebar (per tipe kamar, progress bar, sisa tagihan)
- ✅ Cetak invoice + form transaksi PDF
- ✅ Buat surat (BookingDocumentActions)
- ✅ Notifikasi WA ke jamaah (booking confirmed, reminder)
- ✅ Email notifikasi otomatis (konfirmasi booking, verifikasi pembayaran)
- ✅ Auto-kalkulasi komisi agen saat status → confirmed
- ✅ Riwayat dokumen yang pernah dicetak (BookingDocumentHistory)
- ✅ Timeline aktivitas dari `booking_status_history` (siapa ubah, dari status apa, notes) — data nyata
- ✅ Hotel Makkah/Madinah, tanggal kembali, durasi program di section paket
- ✅ Tombol Chat WA langsung ke nomor customer
- ✅ Salin kode booking (copy-to-clipboard)
- ✅ Panel info agen & cabang di sidebar (nama, kode, link ke halaman komisi)
- ✅ Warning banner jika jumlah jamaah terdaftar < total_pax booking
- ✅ Checklist dokumen per jamaah (KTP/Passport/Foto) dengan skor visual 0-3
- ✅ Dialog konfirmasi refund saat status diubah ke "Cancelled" — pilih alasan, jumlah refund (shortcut %, 100/75/50/25), metode (Transfer Bank/DANA/GoPay/OVO/dll), detail rekening, notifikasi otomatis ke jamaah
- ✅ Activity log otomatis saat refund dibuat — log `cancelled_with_refund`/`cancelled_no_refund` pada booking (dengan status sebelumnya), log `refund_created` pada entitas refund (dengan ID refund nyata, jumlah, metode, rekening, kode booking) — siklus hidup refund kini tercatat penuh dari dibuat → diproses → dibatalkan
- ✅ Halaman detail refund `/admin/refunds/:id` — data jamaah, booking, rincian dana, panel update status, timeline aktivitas vertikal; link langsung dari daftar refund (tombol "Detail") dan dari activity log

---

## BAGIAN 7 — DATABASE MIGRATIONS (Urutan Eksekusi)

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

## BAGIAN 8 — CATATAN TEKNIS PENTING

- **Typecheck**: selalu `pnpm run typecheck:libs` dahulu sebelum typecheck api-server
- **Tabel baru Supabase**: wajib aktifkan RLS + buat policy per role
- **Notifikasi admin**: tambah listener di `useAdminNotifications.ts` (singleton pattern)
- **Routing**: lazy import di file Routes.tsx, daftarkan di `admin-menu-registry.ts`
- **PWA mode**: deteksi via `window.matchMedia('(display-mode: standalone)')` — hook `usePWAMode`
- **PWA icons**: tersimpan di `website_settings.pwa_icon_url`, manifest.json dinamis via `/api/manifest.json`
- **Mobile-responsive + dark mode + loading skeleton** wajib di setiap halaman baru
- **Tailwind**: gunakan v3 via PostCSS — JANGAN gunakan `@tailwindcss/vite` plugin
- **Quick Menu Grid**: link "Portal Jamaah" menuju `/jamaah-info`
- **`remaining_amount`** di tabel `bookings` adalah generated column (= total_price - paid_amount). JANGAN masukkan ke INSERT atau UPDATE
- **Multi-tipe kamar**: `booking_passengers.room_preference` adalah source of truth per jamaah. `bookings.room_type` hanya dominant/fallback
- **RoomTypeAssignmentDialog props**: `isOpen, onClose, bookingId, passengers, departure`

---

## BAGIAN 9 — AKSI YANG MASIH MENUNGGU USER

| Prioritas | Item | Catatan |
|-----------|------|---------|
| ⚠️ P1 | Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` | Auth & data tidak aktif tanpa ini |
| ⚠️ P2 | Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` | API server butuh ini |
| ⚠️ P3 | Jalankan SQL migrations (Bagian 7) ke Supabase | Manual di Supabase SQL Editor |
| ⚠️ P4 | Generate VAPID keys: `npx web-push generate-vapid-keys` | Untuk browser push |
| ⚠️ P5 | Set SMTP credentials | Opsional, untuk email |
| ⚠️ P6 | Set Midtrans keys | Opsional, untuk pembayaran |

---

## BAGIAN 10 — STRUKTUR FILE PENTING

```
artifacts/
  umrah-haji/src/
    pages/
      admin/          — semua halaman admin (80+ file)
      public/         — halaman publik + jamaah-info
      jamaah/         — portal jamaah mobile
      customer/       — portal customer
      agent/          — portal agen
    components/
      admin/
        AdminBookingDetail.tsx       — halaman detail booking utama
        RoomTypeAssignmentDialog.tsx — dialog alokasi tipe kamar per jamaah (BARU)
        ChangeRoomTypeDialog.tsx     — dialog ubah tipe kamar global
        ChangePackageDialogV2.tsx    — dialog pindah paket
        BulkPassengerExport.tsx      — manifest + export PDF/Excel
        ManagePaymentModal.tsx       — kelola pembayaran
        BookingDocumentActions.tsx   — generate surat
        BookingDocumentHistory.tsx   — riwayat dokumen dicetak
      layout/
        DynamicNavbar.tsx            — navbar dengan mega dropdown
        DynamicPublicLayout.tsx      — layout publik, aware PWA mode
      pwa/
        MobileBottomNav.tsx          — bottom nav saat PWA standalone
    routes/
      AdminRoutes.tsx      — semua route /admin/*
      PublicRoutes.tsx     — semua route publik + /jamaah-info
      CustomerRoutes.tsx   — semua route /jamaah/*
    hooks/
      usePWAMode.ts            — deteksi standalone PWA mode
      useAdminNotifications.ts — real-time notif (singleton)
      useAutoCommission.ts     — auto-hitung komisi saat booking confirmed
      useWhatsAppNotifier.ts   — kirim WA otomatis
      useEmailNotifier.ts      — kirim email otomatis
    lib/
      admin-menu-registry.ts   — daftar menu + grup + permission
      document-generator.ts    — generate invoice PDF
      transaction-form-generator.ts — generate form transaksi PDF

  api-server/src/
    routes/v1/         — kurs.ts, packages.ts, departures.ts, dll
```

---

## BAGIAN 11 — API EKSTERNAL (Gratis, Tanpa API Key)

| Layanan | Digunakan untuk |
|---------|----------------|
| Aladhan API | Jadwal waktu sholat |
| api.alquran.cloud | Teks Al-Quran + audio murottal |
| Open-Meteo | Cuaca Mekah/Madinah/Jeddah |
| Nominatim (OSM) | Reverse geocoding nama kota |
