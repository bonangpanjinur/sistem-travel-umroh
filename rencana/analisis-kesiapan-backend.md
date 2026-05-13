# Analisis Kesiapan Backend & Integrasi Fitur — Vinstour Travel Portal

> **Tanggal:** Mei 2025  
> **Stack:** React 19 + Vite (frontend) · Express 5 (backend) · Drizzle ORM + Replit Postgres · Supabase Auth + DB

---

## Ringkasan Eksekutif

Portal ini adalah sistem **Umrah & Haji management** yang sangat kaya fitur — 114 halaman admin, 35 halaman jamaah, 13 halaman customer, 1 halaman HR. Sebagian besar data masih mengalir langsung dari frontend ke Supabase, sementara backend Express baru menangani ~10% dari total kebutuhan API. Aplikasi dapat berjalan setelah secrets dikonfigurasi, namun banyak fitur kritis yang belum terhubung dengan benar.

---

## 1. Status Backend Routes (Express API)

### ✅ Sudah Ada & Berjalan

| Route | Method | Keterangan |
|-------|--------|------------|
| `/api/manifest.webmanifest` | GET | PWA manifest dinamis dari DB |
| `/api/v1/packages` | GET | Paket umroh dari Replit Postgres |
| `/api/v1/departures` | GET | Jadwal keberangkatan dari Replit Postgres |
| `/api/v1/leads` | POST | Simpan lead/prospek ke Replit Postgres |
| `/api/v1/chatbot` | POST | Chatbot AI (OpenAI + FAQ fallback) |
| `/api/v1/kurs` | GET | Kurs mata uang real-time (ECB + SAR peg) |
| `/api/v1/test-smtp` | POST | Test koneksi SMTP |
| `/api/v1/webhook-test` | POST | Test webhook receiver |
| `/api/email/send` | POST | Kirim email via SMTP (4 template) |
| `/api/midtrans/create-transaction` | POST | Token pembayaran Midtrans Snap |
| `/api/push/*` | GET/POST | Push notification via VAPID |
| `/api/whatsapp/send` | POST | Proxy Fonnte (token di backend) |
| `/api/whatsapp/notification` | POST | WA notifikasi terstruktur (6 template) |
| `/api/whatsapp/payment-reminder` | POST | WA reminder pembayaran massal |
| `/api/agents/create` | POST | Buat agent baru + Supabase auth user |
| `/api/hr/employees` | POST | Buat karyawan baru + Supabase auth user |
| `/api/hr/employees/:id` | DELETE | Hapus karyawan + auth user |
| `/api/hr/verify-face` | POST | Face verification (bypass graceful) |

### ❌ Route Kritis yang Belum Ada

| Route yang Diperlukan | Prioritas | Dampak |
|-----------------------|-----------|--------|
| `POST /api/midtrans/webhook` | **KRITIS** | Pembayaran tidak auto-update setelah bayar |
| `GET/POST /api/bookings` | **KRITIS** | Booking CRUD semua via Supabase langsung |
| `GET/PUT /api/bookings/:id` | **KRITIS** | Update status booking |
| `GET/POST /api/payments` | **KRITIS** | Verifikasi pembayaran manual |
| `GET /api/customers` | Tinggi | CRUD customer semua via Supabase |
| `POST /api/upload` | Tinggi | Upload file (sekarang ke Supabase Storage) |
| `GET /api/dashboard/stats` | Tinggi | Statistik dashboard dari DB |
| `GET/POST /api/finance/*` | Sedang | Keuangan semua via Supabase |
| `GET/POST /api/hr/attendance` | Sedang | Absensi langsung ke Supabase |
| `GET/POST /api/visa` | Sedang | Manajemen visa via Supabase |
| `GET/POST /api/documents` | Sedang | Dokumen jamaah via Supabase |
| `POST /api/scheduler/run` | Sedang | Cron job pengingat otomatis |

---

## 2. Relasi Antar Fitur & Status Integrasi

### 2.1 Alur Pembayaran (KRITIS — Belum Sempurna)

```
Jamaah → Klik Bayar
    → Frontend: createMidtransPaymentToken()
    → POST /api/midtrans/create-transaction ✅
    → Midtrans Snap terbuka
    → Jamaah bayar
    → Midtrans kirim webhook ke ??? ❌ (TIDAK ADA ENDPOINT)
    → Status booking TIDAK auto-update
    → Admin harus verifikasi manual
```

**Yang Hilang:** `POST /api/midtrans/webhook` untuk auto-update status booking setelah pembayaran berhasil.

### 2.2 Alur WhatsApp Notifikasi (PARSIAL)

```
Admin klik "Kirim Notif"
    → AdminBookingDetail → POST /api/whatsapp/notification ✅
    → AdminDepartures → POST /api/whatsapp/notification ✅
    → AdminBookings → POST /api/whatsapp/payment-reminder ✅
    → AdminPayments → POST /api/whatsapp/payment-reminder ✅
    
useWhatsAppNotifier (hook) ⚠️ MASALAH:
    → Masih ambil token dari Supabase (whatsapp_config table)
    → Kirim Fonnte LANGSUNG dari browser (token terekspos)
    → Perlu migrasi ke /api/whatsapp/send
    
AdminCicilanReminder ❌:
    → Ambil token dari Supabase
    → Kirim Fonnte langsung dari browser
    
AdminPembayaranReminder ❌:
    → Ambil token dari Supabase  
    → Kirim Fonnte langsung dari browser
```

**Yang Masih Bermasalah:**
- `useWhatsAppNotifier` hook belum diubah untuk pakai `/api/whatsapp/send`
- `AdminCicilanReminder` dan `AdminPembayaranReminder` masih panggil Fonnte langsung dari browser
- Token WhatsApp masih terekspos di browser DevTools dari 2 halaman ini

### 2.3 Alur Autentikasi

```
User login/register → Supabase Auth ⚠️ (butuh VITE_SUPABASE_URL + KEY)
    → Session tersimpan di browser
    → Frontend query Supabase DB dengan session token
    → Admin dapat akses berdasarkan role (user_roles table)
```

**Status:** Berfungsi jika `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` di-set. Saat ini keduanya kosong — semua halaman yang butuh login tidak bisa diakses.

### 2.4 Alur Dashboard Admin

```
AdminDashboard → useDashboardStats() hook
    → supabase.from('bookings').select() ⚠️ langsung ke Supabase
    → supabase.from('customers').select()
    → supabase.from('payments').select()
    → Tidak ada Express route untuk statistik
```

**Yang Hilang:** Endpoint `/api/dashboard/stats` yang mengagregasi data dari Replit Postgres.

### 2.5 Alur Upload File (RUSAK)

```
Upload foto paket → supabase.storage.from('packages').upload() ❌
Upload bukti bayar → supabase.storage.from('payments').upload() ❌
Upload foto profil → supabase.storage.from('avatars').upload() ❌
Upload dokumen jamaah → supabase.storage.from('documents').upload() ❌
Upload logo branding → supabase.storage.from('branding').upload() ❌
```

**Status:** Semua upload file menuju Supabase Storage. Tanpa `VITE_SUPABASE_URL`, semua upload **gagal diam-diam**. Tidak ada fallback storage. Butuh endpoint `/api/upload` atau konfigurasi Supabase.

**20+ komponen** terpengaruh:
`AddManualPaymentDialog`, `EditCustomerDialog`, `ManagePaymentModal`, `BrandingSettings`, `PageBuilder`, `TestimonialEditor`, `AirlineForm`, `PackageForm`, `RegularPackageForm`, `SavingsPackageForm`, dan lebih banyak lagi.

---

## 3. Database — Tabel yang Digunakan

### Replit Postgres (Drizzle ORM) — 8 Tabel

| Tabel | Digunakan Oleh |
|-------|----------------|
| `packages` | `/api/v1/packages` |
| `departures` | `/api/v1/departures` |
| `push_subscriptions` | `/api/push/*` |
| `website_settings` | `/api/manifest.webmanifest` |
| `leads` | `/api/v1/leads` |
| `api_keys` | middleware `requireApiKey` |
| `bookings` | `/api/push/*` (untuk fanout notif) |
| `customers` | `/api/push/*` (untuk fanout notif) |

### Supabase DB — 60+ Tabel (Semua Langsung dari Frontend)

**Data Operasional (harus tetap di Supabase atau dimigrasikan):**

| Kategori | Tabel |
|----------|-------|
| Booking | `bookings`, `booking_passengers`, `payments`, `customer_documents` |
| Pelanggan | `customers`, `profiles`, `customer_notifications`, `customer_mahrams` |
| Karyawan | `employees`, `employee_devices`, `departments`, `attendance_records` |
| Keuangan | `cash_transactions`, `departure_budgets`, `agent_commissions`, `agent_wallets` |
| HR | `hr_settings`, `work_schedules`, `payroll_records` |
| Visa | `visa_status_logs` |
| Akomodasi | `hotels`, `airlines`, `airports`, `bus_providers` |
| Ibadah Jamaah | `jamaah_ibadah_logs`, `jamaah_ibadah_targets`, `jamaah_badges`, `jamaah_doa_sessions` |
| Loyalitas | `loyalty_points`, `loyalty_rewards`, `loyalty_transactions` |
| Toko | `store_products`, `store_orders`, `store_order_items`, `store_categories` |
| Konten | `blog_articles`, `email_templates`, `landing_pages` |
| Sistem | `app_settings`, `user_roles`, `branches`, `whatsapp_config` |
| Persetujuan | `approval_requests`, `approval_actions` |
| Tabungan | `savings_plans` (via hooks) |
| Agen | `agents`, `agent_training_progress` |

---

## 4. Konfigurasi yang Disimpan di localStorage (MASALAH KEAMANAN & UX)

Berikut pengaturan penting yang hilang saat ganti browser atau buka di perangkat lain:

| Halaman | Data di localStorage | Seharusnya Di |
|---------|---------------------|---------------|
| `AdminMidtrans.tsx` | Server key Midtrans, metode pembayaran, mode sandbox | Backend Secrets |
| `AdminWAOtomatis.tsx` | WA trigger config, template pesan | `app_settings` Supabase |
| `AdminCicilanReminder.tsx` | Jumlah hari reminder, template | `app_settings` Supabase |
| `AdminSmartNotif.tsx` | Status aktif, jendela waktu, tipe notif | `app_settings` Supabase |
| `AdminVirtualAccount.tsx` | Nomor VA per pelanggan | `virtual_accounts` Supabase |
| `AdminBookingDetail.tsx` | WA auto trigger rules | `app_settings` Supabase |

> ⚠️ **Risiko:** Admin A set konfigurasi di laptop → Admin B buka di komputer lain → semua setting hilang.

---

## 5. Environment Variables — Status & Kebutuhan

### Frontend (`.env` atau Replit Secrets dengan prefix `VITE_`)

| Variable | Status | Dampak Jika Kosong |
|----------|--------|--------------------|
| `VITE_SUPABASE_URL` | ❌ Belum diset | Auth gagal, semua data tidak tampil |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | ❌ Belum diset | Auth gagal, semua data tidak tampil |
| `VITE_VAPID_PUBLIC_KEY` | ❌ Belum diset | Push notification tidak bisa subscribe |
| `VITE_API_BASE_URL` / `VITE_API_URL` | ⚠️ Variabel ganda | Perlu distandarkan ke satu nama |

### Backend (Replit Secrets)

| Variable | Status | Dampak Jika Kosong |
|----------|--------|--------------------|
| `DATABASE_URL` | ✅ Sudah diset | - |
| `MIDTRANS_SERVER_KEY` | ❌ Belum diset | Pembayaran Midtrans gagal |
| `MIDTRANS_ENV` | ❌ Belum diset | Default ke sandbox (OK untuk test) |
| `FONNTE_TOKEN` | ❌ Belum diset | Semua WA notifikasi gagal |
| `SMTP_HOST` | ❌ Belum diset | Email tidak bisa dikirim |
| `SMTP_PORT` | ❌ Belum diset | Email tidak bisa dikirim |
| `SMTP_USER` | ❌ Belum diset | Email tidak bisa dikirim |
| `SMTP_PASS` | ❌ Belum diset | Email tidak bisa dikirim |
| `SMTP_FROM` | ❌ Belum diset | Email tidak bisa dikirim |
| `OPENAI_API_KEY` | ❌ Belum diset | Chatbot pakai FAQ fallback saja |
| `VAPID_PUBLIC_KEY` | ❌ Belum diset | Push notification gagal |
| `VAPID_PRIVATE_KEY` | ❌ Belum diset | Push notification gagal |
| `VAPID_EMAIL` | ❌ Belum diset | Push notification gagal |
| `SUPABASE_URL` | ❌ Belum diset | Agent/employee create dari backend gagal |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ Belum diset | Agent/employee create dari backend gagal |
| `FRONTEND_URL` | ❌ Belum diset | Midtrans callback URL salah |

---

## 6. Masalah Keamanan

| # | Masalah | Tingkat | Lokasi |
|---|---------|---------|--------|
| 1 | Token WhatsApp Fonnte masih dikirim dari browser di 2 halaman | 🔴 Kritis | `AdminCicilanReminder`, `AdminPembayaranReminder` |
| 2 | `useWhatsAppNotifier` hook ambil token dari Supabase, kirim langsung ke Fonnte | 🔴 Kritis | `useWhatsAppNotifier.ts` + semua komponen yang pakai hook ini |
| 3 | `requireApiKey` middleware pass-through jika tidak ada header (opsional) | 🟡 Sedang | `/api/v1/*` routes |
| 4 | Midtrans Server Key tersimpan di localStorage via `AdminMidtrans` | 🔴 Kritis | `AdminMidtrans.tsx` |
| 5 | Tidak ada validasi webhook signature dari Midtrans | 🔴 Kritis | Belum ada webhook endpoint |
| 6 | CORS tidak dikonfigurasi eksplisit di backend | 🟡 Sedang | `artifacts/api-server/src/index.ts` |
| 7 | Tidak ada rate limiting di endpoint publik | 🟡 Sedang | `/api/v1/leads`, `/api/v1/chatbot` |

---

## 7. Fitur per Halaman — Status Integrasi

### Admin (114 halaman)

| Halaman | Status | Masalah Utama |
|---------|--------|---------------|
| `AdminDashboard` | ⚠️ Parsial | Data dari Supabase langsung, perlu backend |
| `AdminBookings` | ⚠️ Parsial | List dari Supabase, reminder ke Express ✅ |
| `AdminBookingDetail` | ⚠️ Parsial | Data Supabase, WA notif ke Express ✅ |
| `AdminBookingCreate` | ⚠️ Supabase | Tidak ada backend route |
| `AdminPayments` | ⚠️ Parsial | List Supabase, reminder ke Express ✅ |
| `AdminPackages` | ⚠️ Parsial | GET via Express ✅, CRUD masih Supabase |
| `AdminDepartures` | ⚠️ Parsial | GET via Express ✅, WA notif ke Express ✅ |
| `AdminCustomers` | ❌ Supabase | Semua via Supabase langsung |
| `AdminHR` | ⚠️ Parsial | Create/delete via Express ✅, data Supabase |
| `AdminPayroll` | ❌ Supabase | Semua via Supabase langsung |
| `AdminFinanceTerpadu` | ❌ Supabase | Semua via Supabase langsung |
| `AdminFinanceCash` | ❌ Supabase | Semua via Supabase langsung |
| `AdminFinanceAP/AR/PL` | ❌ Supabase | Semua via Supabase langsung |
| `AdminAgents` | ⚠️ Parsial | Create via Express ✅, data Supabase |
| `AdminMidtrans` | 🔴 Rusak | Server key tersimpan di localStorage! |
| `AdminWAOtomatis` | ⚠️ Parsial | Sebagian localStorage, sebagian Supabase |
| `AdminWhatsApp` | ❌ Supabase | Token dari Supabase, kirim langsung browser |
| `AdminCicilanReminder` | 🔴 Rusak | Token Fonnte terekspos di browser |
| `AdminPembayaranReminder` | 🔴 Rusak | Token Fonnte terekspos di browser |
| `AdminVirtualAccount` | 🔴 Rusak | Data VA di localStorage, bukan DB |
| `AdminSmartNotif` | ⚠️ Parsial | Config di localStorage |
| `AdminAISummary` | ⚠️ Parsial | Analisis data Supabase, AI summary |
| `AdminAnalytics` | ❌ Supabase | Semua via Supabase langsung |
| `AdminReports` | ❌ Supabase | Semua via Supabase langsung |
| `AdminLeads` | ✅ OK | Data dari Replit Postgres via Express |
| `AdminDocumentGenerator` | ⚠️ Parsial | Generate PDF dari data Supabase |
| `AdminVisaManagement` | ❌ Supabase | Semua via Supabase langsung |
| `AdminManifestJamaah` | ⚠️ Parsial | Data manifest dari Supabase |
| `AdminLandingPageEditor` | ❌ Supabase | Semua via Supabase langsung |
| `AdminPushNotifications` | ✅ OK | Via Express `/api/push/*` |
| `AdminEmailTemplates` | ❌ Supabase | Template dari Supabase, kirim via Express |

### Jamaah (35 halaman)

| Halaman | Status | Masalah Utama |
|---------|--------|---------------|
| `JamaahPortal` | ⚠️ Parsial | Data dari Supabase, upload ke Supabase Storage |
| `JamaahPayment` | ⚠️ Parsial | List dari Supabase, Midtrans via Express ✅ |
| `JamaahDocuments` | 🔴 Rusak | Upload ke Supabase Storage (gagal tanpa config) |
| `JamaahChatbot` | ✅ OK | Via Express `/api/v1/chatbot` |
| `JamaahSISKOHAT` | ❌ Supabase | Semua via Supabase |
| `JamaahKalkulatorKurs` | ✅ OK | Via Express `/api/v1/kurs` |
| `JamaahTrackerIbadah` | ❌ Supabase | Log ibadah via Supabase |
| `JamaahManasik` | ❌ Supabase | Materi manasik dari Supabase |
| `JamaahNotifications` | ❌ Supabase | Notifikasi dari Supabase |
| `JamaahGaleri` | 🔴 Rusak | Foto dari Supabase Storage |
| `JamaahRingkasanAI` | ❌ Supabase | Data Supabase + AI |

### Customer (13 halaman)

| Halaman | Status | Masalah Utama |
|---------|--------|---------------|
| `BookingDetail` | ⚠️ Parsial | Data Supabase, upload bukti ke Supabase Storage |
| `PaymentUpload` | 🔴 Rusak | Upload ke Supabase Storage |
| `MyBookings` | ❌ Supabase | Data booking dari Supabase |
| `CustomerDashboard` | ❌ Supabase | Statistik dari Supabase |
| `CustomerSupport` | ❌ Supabase | Tiket dari Supabase |
| `MySavings` | 🔴 Rusak | Upload dokumen ke Supabase Storage |

### HR (1 halaman)

| Halaman | Status | Masalah Utama |
|---------|--------|---------------|
| `EmployeeAttendance` | ✅ OK | Face verify via Express bypass ✅ |

---

## 8. Daftar Perbaikan yang Diprioritaskan

### 🔴 Prioritas 1 — Darurat (Rusak Total / Keamanan)

1. **Set VITE_SUPABASE_URL & VITE_SUPABASE_PUBLISHABLE_KEY** → Auth dan semua data tidak tampil
2. **Tambah `POST /api/midtrans/webhook`** → Pembayaran tidak auto-update
3. **Pindahkan Fonnte token ke backend** di `useWhatsAppNotifier`, `AdminCicilanReminder`, `AdminPembayaranReminder` → Token API terekspos di browser
4. **Pindahkan Midtrans Server Key dari localStorage ke backend** (sudah di `MIDTRANS_SERVER_KEY` env, tapi `AdminMidtrans` simpan ke localStorage — konflik)
5. **Set FONNTE_TOKEN** di Replit Secrets → WA notifikasi semua gagal

### 🟠 Prioritas 2 — Tinggi (Fitur Utama Tidak Berfungsi)

6. **Set MIDTRANS_SERVER_KEY** → Pembayaran Midtrans tidak bisa dibuat
7. **Set SMTP secrets** → Email notifikasi semua gagal
8. **Perbaiki file upload** → Buat endpoint `/api/upload` atau pastikan Supabase Storage terkonfigurasi
9. **Perbaiki localStorage config** → Pindah `AdminMidtrans`, `AdminWAOtomatis`, `AdminCicilanReminder`, `AdminVirtualAccount` ke DB/secrets
10. **Set SUPABASE_SERVICE_ROLE_KEY** → Create agent & employee dari backend tidak bisa

### 🟡 Prioritas 3 — Sedang (Fitur Penting Tapi Bisa Manual)

11. **Tambah `GET /api/dashboard/stats`** → Dashboard stats via backend
12. **Tambah `POST /api/midtrans/webhook`** → Auto-update pembayaran
13. **Scheduler/cron** → WA blast keberangkatan, reminder H-7, H-3, H-1
14. **Set VAPID keys** → Push notification tidak bisa dikirim
15. **Set OPENAI_API_KEY** → Chatbot masih pakai FAQ fallback, AI Summary tidak berfungsi

### 🟢 Prioritas 4 — Rendah (Penyempurnaan)

16. **Rate limiting** → Lindungi `/api/v1/leads` dari spam
17. **CORS eksplisit** → Konfigurasi origin yang diizinkan di backend
18. **Standardisasi `VITE_API_BASE_URL`** → Dua nama variabel berbeda digunakan
19. **Health check endpoint** → `/api/health` saat ini mengembalikan HTML error
20. **Webhook signature validation** → Validasi `x-midtrans-signature` di webhook handler

---

## 9. Arsitektur yang Direkomendasikan

### Saat Ini (Bermasalah)
```
Browser → Supabase DB (60+ tabel langsung)
Browser → Supabase Auth
Browser → Supabase Storage (upload file)
Browser → Fonnte API (token terekspos)
Browser → Express API (hanya 8 tabel + 5 fitur)
```

### Target (Aman & Scalable)
```
Browser → Express API (semua operasi data)
  Express → Supabase Auth (verifikasi token)
  Express → Replit Postgres (data operasional)
  Express → Supabase Storage (upload via server)
  Express → Fonnte (token aman di server)
  Express → Midtrans (server key aman di server)
  Express → OpenAI (key aman di server)
```

---

## 10. Ringkasan Cepat

| Aspek | Kondisi Sekarang | Target |
|-------|-----------------|--------|
| Backend routes aktif | 18 routes | ~40 routes |
| Supabase tabel diakses langsung | 60+ tabel | 0 (semua via Express) |
| Secrets yang sudah diset | 1 (DATABASE_URL) | 15 secrets |
| Halaman fully integrated | ~8 | 163 |
| Halaman dengan masalah keamanan | 5 | 0 |
| localStorage untuk config kritis | 6 halaman | 0 |
| File upload endpoint | 0 | 1 (+ Supabase Storage) |
| Auto-scheduler | 0 | 1 (cron job) |
| Webhook endpoint | 0 | 1 (Midtrans) |

---

*Dokumen ini dibuat dari analisis statis terhadap 200+ file sumber. Update dokumen ini setiap kali ada perubahan arsitektur signifikan.*

---

---

# Analisis UX Jamaah — Website & PWA

> **Tanggal Update:** Mei 2025  
> **Cakupan:** 45 halaman jamaah (36 di `/jamaah/` + 9 halaman customer terkait) · PWA manifest & service worker · Navigasi · Offline capability · User journey

---

## 11. Inventaris Halaman Jamaah (Lengkap)

### Fase 1 — Onboarding & Portal Utama

| Halaman | Route | Data Source | Offline? | Status UX |
|---------|-------|-------------|----------|-----------|
| `JamaahWelcome` | `/jamaah/welcome` | Supabase (booking, customer) | ✅ Bisa | ✅ Baik — onboarding 5 slide, simpan flag di localStorage |
| `JamaahPortal` | `/jamaah` | Supabase (booking, departure, payments) | ❌ Butuh data | ⚠️ Parsial — dashboard utama, ada cuaca live, countdown, SOS button |

### Fase 2 — Identitas & Dokumen Resmi

| Halaman | Route | Data Source | Offline? | Status UX |
|---------|-------|-------------|----------|-----------|
| `JamaahDigitalID` | `/jamaah/digital-id` | Supabase (customers, bookings, departures) | ❌ | ✅ Baik — QR code, info booking, share via Web Share API |
| `JamaahDocuments` | `/jamaah/documents` | Supabase Storage (upload) | ❌ | 🔴 Rusak — upload gagal tanpa Supabase Storage |
| `JamaahVisaTracker` | `/jamaah/visa` | Supabase (visa_status_logs) | ❌ | ✅ Baik — status step progress, riwayat perubahan, online/offline indicator |
| `JamaahCheckin` | `/jamaah/checkin` | Supabase (bookings, check-in status) | ❌ | ⚠️ Parsial — QR self check-in, status step keberangkatan |
| `JamaahKontrak` | `/jamaah/kontrak` | Supabase (booking contracts) | ❌ | ⚠️ Parsial — viewer kontrak digital |
| `JamaahSISKOHAT` | `/jamaah/siskohat` | Static demo data + Supabase | ✅ Demo | ⚠️ Parsial — cek nomor porsi haji, data real perlu API Kemenag |

### Fase 3 — Keuangan

| Halaman | Route | Data Source | Offline? | Status UX |
|---------|-------|-------------|----------|-----------|
| `JamaahPayment` | `/jamaah/payment` | Supabase (bookings) + Express (`/api/midtrans/create-transaction`) | ❌ | ✅ Baik — multi-metode: QRIS, VA BCA/Mandiri/BNI, GoPay, transfer manual |
| `JamaahPaymentHistory` | `/jamaah/payment-history` | Supabase (payments) | ❌ | ✅ Baik — riwayat transaksi lengkap |
| `JamaahInvoice` | `/jamaah/invoice` | Supabase (bookings, payments) | ❌ | ✅ Baik — generate PDF invoice |
| `JamaahKalkulatorKurs` | `/jamaah/kalkulator-kurs` | Express (`/api/v1/kurs`) | ❌ | ✅ Baik — konversi IDR↔SAR live |
| `JamaahKalkulatorZakat` | `/jamaah/kalkulator-zakat` | Static (kalkulasi lokal) | ✅ | ✅ Baik — kalkulator zakat standalone, fully offline |

### Fase 4 — Perjalanan & Logistik

| Halaman | Route | Data Source | Offline? | Status UX |
|---------|-------|-------------|----------|-----------|
| `JamaahItinerary` | `/jamaah/itinerary` | Supabase (departures, itinerary_items) | ❌ | ⚠️ Parsial — jadwal harian, perlu data dari DB |
| `JamaahChecklist` | `/jamaah/checklist` | Supabase (booking_checklist) | ⚠️ Sebagian | ✅ Baik — 5 kategori: dokumen, keuangan, perlengkapan, kesehatan, spiritual |
| `JamaahBagasi` | `/jamaah/bagasi` | Supabase (bookings, baggage status) | ⚠️ Kalkulator | ✅ Baik — kalkulator berat bagasi + status step, batas 32kg/7kg kabin |
| `JamaahPetaLokasi` | `/jamaah/peta-lokasi` | Static data (koordinat Makkah/Madinah) | ✅ | ✅ Baik — peta lokasi penting statis, link ke Google Maps |
| `JamaahRombongan` | `/jamaah/rombongan` | Supabase (bookings, customers) | ❌ | ✅ Baik — daftar anggota rombongan, search, info kontak |

### Fase 5 — Ibadah (Sub-folder `/ibadah/`)

| Halaman | Route | Data Source | Offline? | Status UX |
|---------|-------|-------------|----------|-----------|
| `JamaahDoaPanduan` | `/jamaah/doa-panduan` | Supabase → **cache localStorage** | ✅ | ✅ Baik — doa & dzikir dengan cache offline, cari, favorit |
| `JamaahPanduanIbadah` | `/jamaah/panduan-ibadah` | Supabase (offline_content) | ⚠️ Cache | ✅ Baik — panduan umroh/haji step-by-step |
| `JamaahManasik` | `/jamaah/manasik` | Supabase (manasik_materials) | ❌ | ⚠️ Parsial — materi manasik dari DB |
| `JamaahManasikInteraktif` | `/jamaah/manasik-interaktif` | Local quiz data | ✅ | ✅ Baik — kuis interaktif manasik, data hardcoded |
| `JamaahTrackerIbadah` | `/jamaah/tracker-ibadah` | **localStorage** (daily logs) | ✅ | ✅ Baik — log harian: shalat, tawaf, sa'i, dzikir, Al-Quran, sedekah |
| `JamaahTargetIbadah` | `/jamaah/target-ibadah` | Supabase (jamaah_ibadah_targets) | ❌ | ⚠️ Parsial — set target ibadah harian |
| `JamaahDoaCounter` | `/jamaah/doa-counter` | **localStorage** | ✅ | ✅ Baik — tasbih digital, multiple counter, vibration API |
| `JamaahZikir` | `/jamaah/zikir` | Local static data | ✅ | ✅ Baik — zikir pagi/petang, counter |
| `JamaahPengingatIbadah` | `/jamaah/pengingat-ibadah` | Prayer API (aladhan.com) + **localStorage** | ⚠️ | ✅ Baik — reminder shalat dengan jadwal lokal |

### Fase 6 — Tools Islami

| Halaman | Route | Data Source | Offline? | Status UX |
|---------|-------|-------------|----------|-----------|
| `JamaahWaktuSholat` | `/jamaah/waktu-sholat` | aladhan.com API + **localStorage cache** | ⚠️ Cache | ✅ Baik — waktu sholat akurat, countdown ke sholat berikutnya |
| `JamaahKiblat` | `/jamaah/kiblat` | Device Geolocation + DeviceOrientation API | ✅ | ✅ Baik — kompas kiblat real-time, kalkulasi geodesi lokal |
| `JamaahAlQuran` | `/jamaah/alquran` | **Hardcoded** (surah pendek) + API (full surah) | ✅ Partial | ⚠️ Parsial — hanya 10 surah pendek hardcoded, surah panjang butuh internet |

### Fase 7 — Sosial & Komunitas

| Halaman | Route | Data Source | Offline? | Status UX |
|---------|-------|-------------|----------|-----------|
| `JamaahChat` | `/jamaah/chat` | Supabase Realtime (chat_rooms, chat_messages) | ❌ | ⚠️ Parsial — group chat rombongan, ada offline indicator tapi pesan gagal terkirim |
| `JamaahGaleri` | `/jamaah/galeri` | Supabase Storage (trip_photos) | ❌ | 🔴 Rusak — upload foto gagal tanpa Supabase Storage |
| `JamaahRombongan` | `/jamaah/rombongan` | Supabase (bookings, passengers) | ❌ | ✅ Baik — lihat anggota rombongan |
| `JamaahPantauKeluarga` | `/jamaah/pantau-keluarga` | Supabase + localStorage (tracking toggle) | ❌ | ⚠️ Parsial — aktifkan berbagi lokasi, link ke keluarga |
| `JamaahFeedback` | `/jamaah/feedback` | Supabase (feedback) | ❌ | ✅ Baik — form feedback layanan |

### Fase 8 — Gamifikasi & Pencapaian

| Halaman | Route | Data Source | Offline? | Status UX |
|---------|-------|-------------|----------|-----------|
| `JamaahBadges` | `/jamaah/badges` | Supabase (jamaah_badges) | ❌ | ✅ Baik — badge pencapaian ibadah, progress visual |
| `JamaahJurnal` | `/jamaah/jurnal` | Supabase (jamaah_journals) | ❌ | ✅ Baik — jurnal perjalanan harian, editor teks |
| `JamaahSertifikat` | `/jamaah/sertifikat` | Supabase (bookings) + **jsPDF lokal** | ⚠️ | ✅ Baik — generate sertifikat PDF bergaya formal, gold frame |

### Fase 9 — AI & Analytics

| Halaman | Route | Data Source | Offline? | Status UX |
|---------|-------|-------------|----------|-----------|
| `JamaahChatbot` | `/jamaah/chatbot` | Express (`/api/v1/chatbot`) | ❌ | ✅ Baik — AI chatbot umroh/haji, fallback FAQ jika OpenAI tidak diset |
| `JamaahRingkasanAI` | `/jamaah/ringkasan-ai` | Supabase (booking data) + **jsPDF lokal** | ❌ | ✅ Baik — AI summary perjalanan, export PDF |

### Fase 10 — Keselamatan & Kesehatan

| Halaman | Route | Data Source | Offline? | Status UX |
|---------|-------|-------------|----------|-----------|
| `JamaahSOSStatus` | `/jamaah/sos-status` | Supabase (sos_alerts) | ❌ | ⚠️ Parsial — lihat status SOS yang dikirim |
| `JamaahKesehatan` | `/jamaah/kesehatan` | **localStorage** (health profile) | ✅ | ⚠️ Masalah — profil kesehatan hanya di localStorage, tidak tersinkron ke server |

### Lainnya

| Halaman | Route | Data Source | Offline? | Status UX |
|---------|-------|-------------|----------|-----------|
| `JamaahNotifications` | `/jamaah/notifications` | Supabase (customer_notifications) | ❌ | ✅ Baik — list notif dengan kategori, mark read |
| `JamaahRiwayatPerjalanan` | `/jamaah/riwayat-perjalanan` | Supabase (bookings) | ❌ | ✅ Baik — histori perjalanan jamaah |
| `JamaahReferral` | `/jamaah/referral` | Supabase (referrals) | ❌ | ✅ Baik — program referral, kode unik, share |

---

## 12. Komponen Pendukung Jamaah

| Komponen | Deskripsi | Status |
|----------|-----------|--------|
| `JamaahBottomNav` | Navigasi bawah mobile 4 tab + "More" modal | ✅ Baik — dinamis via `usePWAConfig`, dark mode, badge notifikasi |
| `SOSButton` | Tombol darurat hold-3-detik → kirim lokasi GPS ke Supabase | ⚠️ Butuh Supabase — hold progress, 4 tipe darurat, nomor darurat Saudi |
| `TourLeaderSOSPanel` | Panel muthawif melihat SOS jamaah real-time | ⚠️ Butuh Supabase Realtime |
| `LiveLocationShare` | Berbagi lokasi live ke keluarga | ⚠️ Butuh Supabase |
| `CuacaWidget` | Widget cuaca Makkah & Madinah (open-meteo.com API) | ✅ Baik — gratis, no API key, fallback graceful |
| `AgentAttributionBadge` | Badge agen yang mereferral jamaah | ✅ Baik |
| `JamaahManasikKuis` | Kuis manasik interaktif | ✅ Baik — data lokal |
| `PWAInstallPrompt` | Prompt install PWA (beforeinstallprompt) | ✅ Ada — di `DynamicPublicLayout`, `JamaahPortal`, `PWAGatePage` |
| `StandaloneHomeGate` | Deteksi PWA installed vs browser biasa | ✅ Ada — redirect ke app jika standalone |
| `PWAGatePage` | Gate page khusus sebelum masuk portal jamaah | ✅ Ada — instruksi install untuk Android & iOS |

---

## 13. Analisis PWA (Progressive Web App)

### 13.1 Status Manifest

```json
// public/manifest.json — dikonfigurasi dengan baik
{
  "name": "Vinstour — Umrah & Haji",
  "short_name": "Vinstour",
  "start_url": "/jamaah",             ✅ Langsung ke portal jamaah
  "display": "standalone",            ✅ Full-screen mode
  "theme_color": "#16a34a",           ✅ Hijau brand
  "background_color": "#f0fdf4",      ✅ Sesuai brand
  "icons": [192px, 512px],            ✅ File ada di /images/
  "shortcuts": [4 shortcut],         ✅ ID Digital, Waktu Sholat, Doa, SOS
  "categories": ["travel", "lifestyle", "utilities"],  ✅
  "lang": "id"                        ✅
}
```

**⚠️ Catatan:** `<link rel="manifest" href="/api/manifest.json" />` — manifest dilayani dari Express server, bukan file statis. Ini bagus untuk konfigurasi dinamis, tapi **membutuhkan backend berjalan** agar PWA bisa diinstall.

### 13.2 Status Service Worker (`public/sw.js`)

| Fitur | Status | Keterangan |
|-------|--------|------------|
| Install + skipWaiting | ✅ | Cache version `vinstour-v4` |
| Cache static assets | ✅ | JS, CSS, images cache-first |
| Offline shell caching | ✅ | 23 rute jamaah dalam daftar JAMAAH_ROUTES |
| Network-first untuk API | ✅ | Skip `/api/` — selalu ke network |
| Cache navigation/HTML | ✅ | Stale-while-revalidate untuk HTML |
| Background sync | ❌ | Tidak ada — sync manual via `useOfflineQueue` |
| Push notification handler | ❌ | Tidak ada `push` event listener di SW |
| Notification click handler | ❌ | Tidak ada `notificationclick` handler |
| Periodic background sync | ❌ | Tidak ada |

**❌ Masalah Kritis:** Service worker **tidak bisa menampilkan push notification** karena tidak ada handler `push` event. Meskipun backend sudah bisa kirim via VAPID (`/api/push/*`), notifikasi tidak akan muncul di perangkat jamaah.

### 13.3 Meta Tags iOS PWA

```html
<!-- index.html — sudah lengkap -->
<meta name="apple-mobile-web-app-capable" content="yes" />        ✅
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />  ✅
<meta name="apple-mobile-web-app-title" content="Vinstour" />     ✅
<meta name="theme-color" content="#16a34a" />                     ✅
<link rel="apple-touch-icon" href="/favicon.svg" />               ⚠️ SVG tidak didukung iOS
```

**⚠️ Masalah:** `apple-touch-icon` menunjuk ke `/favicon.svg`. iOS **tidak mendukung SVG** untuk home screen icon — harus PNG. File `/images/icon-192.png` sudah ada, cukup ganti referensinya.

### 13.4 PWA Install Flow

```
Android Chrome:
    beforeinstallprompt → ditangkap di JamaahPortal + PWAInstallPrompt ✅
    Tombol install custom tersedia ✅
    PWAGatePage menampilkan instruksi install ✅

iOS Safari:
    Tidak ada beforeinstallprompt (tidak didukung iOS)
    PWAGatePage menampilkan instruksi manual "Share → Add to Home Screen" ✅
    apple-touch-icon → perlu ganti ke PNG ⚠️

Standalone detection:
    StandaloneHomeGate deteksi display-mode: standalone ✅
    Redirect ke /jamaah saat dibuka dari home screen ✅
```

### 13.5 Offline Queue (`useOfflineQueue`)

Hook ini sudah solid secara teknis:
- Simpan aksi yang gagal ke localStorage
- Retry otomatis saat `online` event terpicu
- Max 3 retry per aksi
- Toast informatif saat sync berhasil

**❌ Masalah:** Hook ini **tidak digunakan** di hampir semua halaman jamaah yang butuh offline support. Hanya dideklarasikan, tidak diintegrasikan ke form/submit jamaah.

---

## 14. User Journey Map Jamaah

### 14.1 Pra-Keberangkatan (T-30 hari hingga hari H)

```
1. Daftar & Login (Supabase Auth) ❌ [Butuh VITE_SUPABASE_URL]
    ↓
2. Onboarding JamaahWelcome (5 slide) ✅ [Sekali tampil, localStorage flag]
    ↓
3. Lihat JamaahPortal — dashboard utama ⚠️ [Butuh Supabase]
    ↓
4. Isi/upload dokumen (JamaahDocuments) 🔴 [Upload Supabase Storage rusak]
    ↓
5. Bayar cicilan (JamaahPayment → Midtrans) ✅ [Express sudah ada]
    ↓
6. Pantau status visa (JamaahVisaTracker) ⚠️ [Butuh Supabase]
    ↓
7. Pelajari manasik (JamaahManasik, JamaahManasikInteraktif) ⚠️/✅
    ↓
8. Ceklis persiapan (JamaahChecklist) ✅ [UI baik]
    ↓
9. Hitung berat bagasi (JamaahBagasi) ✅ [Kalkulator lokal]
    ↓
10. Lihat itinerary keberangkatan (JamaahItinerary) ⚠️ [Butuh Supabase]
    ↓
11. Download ID Digital (JamaahDigitalID) ⚠️ [Butuh Supabase]
```

### 14.2 Selama Ibadah di Saudi (Hari H hingga H+14)

```
12. Aktifkan PWA dari home screen ✅ [Sudah dikonfigurasi]
    ↓
13. Cek waktu sholat (JamaahWaktuSholat) ✅ [Offline dengan cache]
    ↓
14. Arahkan kiblat (JamaahKiblat) ✅ [Fully offline, device sensor]
    ↓
15. Baca doa & dzikir (JamaahDoaPanduan) ✅ [Offline dengan cache localStorage]
    ↓
16. Catat ibadah harian (JamaahTrackerIbadah) ✅ [Fully offline, localStorage]
    ↓
17. Tasbih digital (JamaahDoaCounter) ✅ [Fully offline, vibration API]
    ↓
18. Lihat peta lokasi (JamaahPetaLokasi) ✅ [Static data, offline]
    ↓
19. Chat dengan muthawif (JamaahChat) ❌ [Butuh Supabase Realtime]
    ↓
20. Foto kenangan (JamaahGaleri) 🔴 [Upload Supabase Storage rusak]
    ↓
21. SOS darurat (SOSButton di JamaahPortal) ❌ [Butuh Supabase]
    ↓
22. Pantau cuaca Makkah/Madinah (CuacaWidget) ✅ [open-meteo.com gratis]
    ↓
23. Baca Al-Quran (JamaahAlQuran) ⚠️ [10 surah pendek offline]
    ↓
24. Catat jurnal perjalanan (JamaahJurnal) ❌ [Butuh Supabase]
```

### 14.3 Pasca-Kepulangan

```
25. Lihat riwayat perjalanan (JamaahRiwayatPerjalanan) ❌ [Butuh Supabase]
    ↓
26. Dapatkan badge pencapaian (JamaahBadges) ❌ [Butuh Supabase]
    ↓
27. Download sertifikat (JamaahSertifikat) ⚠️ [Butuh data dari Supabase]
    ↓
28. Baca ringkasan AI (JamaahRingkasanAI) ❌ [Butuh Supabase + OpenAI]
    ↓
29. Beri feedback layanan (JamaahFeedback) ❌ [Butuh Supabase]
    ↓
30. Daftarkan anggota keluarga (JamaahReferral) ❌ [Butuh Supabase]
```

---

## 15. Matriks Offline Capability

```
FULLY OFFLINE (tidak butuh internet sama sekali):
✅ JamaahKiblat            — Device sensor + kalkulasi lokal
✅ JamaahDoaCounter        — localStorage counter
✅ JamaahTrackerIbadah     — localStorage daily log
✅ JamaahKalkulatorZakat   — kalkulasi lokal
✅ JamaahZikir             — data statis
✅ JamaahManasikInteraktif — quiz data hardcoded
✅ JamaahKesehatan         — localStorage (⚠️ tidak tersinkron ke server)
✅ JamaahAlQuran (parsial) — 10 surah pendek hardcoded
✅ JamaahPetaLokasi        — koordinat statis (peta butuh internet)
✅ JamaahSISKOHAT (demo)   — demo data statis

PARTIALLY OFFLINE (bekerja dengan cache, expire saat cache basi):
⚠️ JamaahDoaPanduan        — cache localStorage (dari Supabase, perlu sekali online)
⚠️ JamaahPanduanIbadah     — cache localStorage
⚠️ JamaahWaktuSholat       — cache localStorage (24 jam, perlu refresh)
⚠️ JamaahPengingatIbadah   — settings localStorage, jadwal dari cache
⚠️ JamaahChecklist         — UI bisa tampil, data dari Supabase (perlu cache)
⚠️ JamaahSertifikat        — jsPDF lokal, tapi data booking dari Supabase

REQUIRES INTERNET (tidak bisa digunakan offline):
❌ JamaahPortal             — booking, departure data
❌ JamaahDigitalID          — data customer & booking
❌ JamaahPayment            — Midtrans
❌ JamaahChat               — Supabase Realtime
❌ JamaahGaleri             — Supabase Storage
❌ JamaahNotifications      — Supabase
❌ JamaahRombongan          — Supabase
❌ JamaahItinerary          — Supabase
❌ JamaahBadges             — Supabase
❌ JamaahJurnal             — Supabase
❌ JamaahSOSStatus          — Supabase
❌ SOSButton                — Supabase sos_alerts
```

**Masalah Kritis Ibadah di Saudi:** Koneksi internet di Arab Saudi bisa lambat/terputus saat jamaah sedang di Masjidil Haram atau area ramai. 4 dari 5 fitur yang paling dibutuhkan saat ibadah **sudah bisa offline** (kiblat, waktu sholat, doa, tasbih) — ini bagian yang baik. Namun **SOS dan Chat sama sekali tidak bisa offline** — ini risiko keselamatan nyata.

---

## 16. Analisis Navigasi & Discoverability

### 16.1 Bottom Navigation (Mobile)

```
DEFAULT 4 TABS:                    MORE MODAL (15 item):
┌────┬────┬────┬──────────┐       ┌─────────────────────────┐
│🏠  │QR  │🛡️  │🔔(badge)  │       │ Bayar Online (CreditCard)│
│Brnd│ID  │Visa│Notif     │       │ Checklist (FileText)     │
└────┴────┴────┴──────────┘       │ Check-in (LogIn)         │
                                   │ Bagasi (Luggage)         │
Dynamic via usePWAConfig ✅        │ Kontrak (FileSignature)  │
Dark mode support ✅               │ Dokumen (FileText)       │
Badge notifikasi ✅                │ Galeri (Camera)          │
                                   │ Doa & Panduan (BookOpen) │
                                   │ Riwayat Bayar (Wallet)   │
                                   │ Manasik (GradCap)        │
                                   │ Pengingat (BellRing)     │
                                   │ Pantau Keluarga          │
                                   │ Wishlist (Heart)         │
                                   │ Feedback (MessageCircle) │
                                   │ Profil (User)            │
                                   └─────────────────────────┘
```

**⚠️ Masalah Discoverability:** 15 menu di "More" terlalu banyak. Jamaah harus scroll/scroll untuk menemukan fitur. Fitur kritis seperti **Tracker Ibadah, Kiblat, Waktu Sholat, SOS** tidak ada di bottom nav default — padahal ini yang paling dibutuhkan saat ibadah berlangsung.

### 16.2 PWA Shortcuts (dari Home Screen)

```json
// manifest.json shortcuts:
1. /jamaah/digital-id      → "ID Digital"     ✅ Relevan
2. /jamaah/waktu-sholat    → "Waktu Sholat"   ✅ Relevan
3. /jamaah/doa-panduan     → "Doa & Panduan"  ✅ Relevan
4. /jamaah/sos-status      → "SOS Darurat"    ✅ Sangat Relevan
```

PWA shortcuts sudah tepat sasaran. Tapi shortcut ke `/jamaah/sos-status` hanya menampilkan STATUS SOS yang sudah dikirim — bukan tombol SOS aktif (SOSButton ada di JamaahPortal). Perlu dipikirkan ulang.

### 16.3 Deep Link dari Push Notification

**❌ Masalah:** Service worker tidak punya handler `notificationclick`. Saat jamaah tap notifikasi push, tidak ada navigasi ke halaman yang relevan. Notifikasi hanya membuka tab baru ke `/jamaah` tanpa routing ke halaman spesifik.

### 16.4 Sidebar (Desktop/Tablet)

```
Navigasi sidebar tersedia dengan 4 grup:
- Perjalanan: 6 item
- Keuangan: 4 item
- Ibadah: 7 item
- Info: 6 item + Toggle dark/light mode ✅
```

Sidebar hanya muncul di lebar layar ≥ 768px (md breakpoint). Baik untuk admin yang buka dari laptop, tapi jamaah mayoritas pakai HP.

---

## 17. Masalah UX Kritis per Kategori

### 17.1 Keselamatan (🔴 Kritis)

| Masalah | Dampak | Lokasi |
|---------|--------|--------|
| SOSButton tidak bisa offline | Jamaah darurat di area tanpa sinyal tidak bisa minta tolong | `SOSButton.tsx` |
| Service worker tidak handle push event | Notifikasi darurat dari admin tidak tampil di layar jamaah | `public/sw.js` |
| Shortcut SOS di PWA menuju /sos-status bukan tombol SOS aktif | Bingung jamaah saat darurat | `manifest.json` shortcuts |
| Tidak ada nomor darurat offline yang mudah diakses | Jamaah tidak tahu harus hubungi siapa | Tidak ada halaman dedicated |

### 17.2 Keuangan (🔴 Kritis)

| Masalah | Dampak | Lokasi |
|---------|--------|--------|
| Tidak ada Midtrans webhook | Status booking tidak auto-update setelah bayar | Backend |
| Upload bukti transfer gagal | Jamaah tidak bisa kirim bukti bayar manual | Supabase Storage |
| Invoice tidak bisa diunduh offline | Jamaah perlu bukti di Saudi tanpa internet | `JamaahInvoice.tsx` |

### 17.3 Dokumen (🔴 Kritis)

| Masalah | Dampak | Lokasi |
|---------|--------|--------|
| Upload dokumen gagal | Paspor, KTP, dll tidak bisa diunggah | Supabase Storage |
| Digital ID perlu internet | Tidak bisa scan ID saat offline | `JamaahDigitalID.tsx` |
| Sertifikat gagal jika booking tidak ada | Jamaah completed tidak dapat sertifikat | `JamaahSertifikat.tsx` |

### 17.4 Sinkronisasi Data (🟡 Sedang)

| Masalah | Dampak | Lokasi |
|---------|--------|--------|
| Profil kesehatan hanya di localStorage | Data hilang jika ganti HP atau clear cache | `JamaahKesehatan.tsx` |
| Jurnal tersimpan di Supabase, tracker ibadah di localStorage | Inkonsistensi — bagian bisa offline, bagian tidak | Arsitektur |
| Checklist state dari Supabase, tidak ada fallback lokal | List persiapan tidak tampil offline | `JamaahChecklist.tsx` |
| `useOfflineQueue` ada tapi tidak dipakai di halaman jamaah | Queue tidak fungsional | Hook tidak terintegrasi |

### 17.5 PWA (🟡 Sedang)

| Masalah | Dampak | Lokasi |
|---------|--------|--------|
| `apple-touch-icon` → SVG (iOS tidak support) | Icon rusak di iOS home screen | `index.html` |
| SW tidak ada push event handler | Push notifikasi tidak tampil di perangkat | `public/sw.js` |
| Manifest dari `/api/manifest.json` (bukan static) | PWA install gagal jika backend mati | `index.html` |
| Tidak ada deeplink handler di SW | Tap notifikasi tidak buka halaman yang benar | `public/sw.js` |
| Tidak ada splash screen kustom untuk iOS | Layar putih saat load di iPhone | Tidak ada |

### 17.6 UX/Aksesibilitas (🟢 Penyempurnaan)

| Masalah | Dampak | Lokasi |
|---------|--------|--------|
| More menu 15 item terlalu panjang | Overwhelming, susah menemukan fitur | `JamaahBottomNav.tsx` |
| Tidak ada mode font besar | Jamaah lansia susah baca | Tidak ada |
| Tracker ibadah tidak ada data visualisasi kemajuan | Kurang motivasi | `JamaahTrackerIbadah.tsx` |
| SISKOHAT data demo tidak nyambung ke API real Kemenag | Data estimasi tidak akurat | `JamaahSISKOHAT.tsx` |
| Al-Quran hanya 10 surah pendek | Tidak memadai untuk ibadah di Saudi | `JamaahAlQuran.tsx` |

---

## 18. Rekomendasi Perbaikan Jamaah (Prioritas)

### 🔴 P1 — Darurat (Keselamatan & Fungsi Inti)

```
1. Tambah push event handler di service worker (sw.js)
   → self.addEventListener('push', ...) + self.registration.showNotification()
   → notificationclick → clients.openWindow('/jamaah/...')
   Dampak: Push notifikasi dari admin sampai ke jamaah

2. Ganti apple-touch-icon dari SVG ke PNG di index.html
   → <link rel="apple-touch-icon" href="/images/icon-192.png" />
   Dampak: Icon benar di iOS home screen

3. Perbaiki PWA shortcut SOS
   → Ubah shortcut ke /jamaah (yang punya SOSButton) atau buat halaman /jamaah/sos
   Dampak: Tombol SOS langsung bisa diakses dari home screen

4. Tambah halaman "Kontak Darurat" offline
   → Nomor ambulan Saudi (997), polisi (999), KJRI Jeddah, KBRI Riyadh
   → Data statis, fully offline
   Dampak: Jamaah punya referensi darurat tanpa internet
```

### 🟠 P2 — Tinggi (Fitur Utama Rusak)

```
5. Set VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY
   → Auth berfungsi → semua data jamaah tampil
   
6. Konfigurasi Supabase Storage untuk upload dokumen & galeri
   → JamaahDocuments, JamaahGaleri, PaymentUpload berfungsi

7. Tambah Midtrans webhook (POST /api/midtrans/webhook)
   → Status booking auto-update setelah pembayaran

8. Pindahkan profil kesehatan dari localStorage ke Supabase
   → Tabel: jamaah_health_profiles
   → Data tidak hilang saat ganti perangkat

9. Integrasikan useOfflineQueue ke halaman jamaah kritis
   → JamaahTrackerIbadah, JamaahJurnal, JamaahDoaCounter
   → Aksi di-queue saat offline, sync saat online
```

### 🟡 P3 — Sedang (Pengalaman Lebih Baik)

```
10. Cache digital ID & itinerary untuk offline access
    → Simpan ke IndexedDB saat online pertama kali
    → Tampilkan read-only saat offline

11. Perbaiki bottom nav: pisah "Ibadah Mode" vs "Admin Mode"
    → Saat di Saudi: tab Kiblat, Waktu Sholat, Doa, Tracker, SOS
    → Saat pra-keberangkatan: tab Dokumen, Checklist, Bayar, Visa

12. Tambah Al-Quran lengkap via quran.com API dengan caching
    → Cache surah yang sudah dibuka untuk offline
    → Target minimal 30 juz tersedia

13. Perbaiki SISKOHAT: integrasikan API Kemenag resmi
    → https://haji.kemenag.go.id/ (perlu key)
    → Atau buat fallback "cek manual" dengan link eksternal

14. Tambah splash screen custom untuk iOS
    → <link rel="apple-touch-startup-image"> per resolusi device

15. Set VAPID keys + tambah push handler di SW
    → Notifikasi "5 menit lagi Maghrib" dari server
    → Notifikasi status dokumen approved
```

### 🟢 P4 — Penyempurnaan UX

```
16. Tambah ukuran font besar (accessibility setting)
    → Simpan di localStorage, apply via CSS class
    → Target jamaah lansia

17. Sederhanakan More menu menjadi 8 item teratas
    → Sisanya dalam sub-kategori atau halaman dedicated

18. Tambah animasi loading skeleton di semua halaman jamaah
    → Sudah ada LoadingState component, perlu dipakai konsisten

19. Tambah tombol "Download untuk offline" di halaman kunci
    → Itinerary, Digital ID, Invoice
    → Simpan ke IndexedDB

20. Gamifikasi: tambah streak tracker di JamaahBadges
    → Badge berurutan berdasarkan konsistensi log ibadah
```

---

## 19. Ringkasan Kesiapan Jamaah UX

| Dimensi | Skor | Keterangan |
|---------|------|------------|
| **Fitur tersedia** | 8/10 | 45 halaman, cakupan sangat lengkap |
| **Fitur berfungsi** | 4/10 | ~50% halaman butuh Supabase yang belum terkonfigurasi |
| **Offline support** | 5/10 | Ibadah tools offline ✅, tapi data penting tidak |
| **PWA install** | 6/10 | Manifest baik, iOS icon perlu perbaikan |
| **Push notification** | 1/10 | SW tidak handle push event |
| **Keselamatan (SOS)** | 3/10 | Ada SOSButton, tapi butuh internet & Supabase |
| **Navigasi** | 6/10 | Bottom nav ada tapi More menu overwhelming |
| **Performa** | 7/10 | React.lazy + Suspense, split code sudah baik |
| **Aksesibilitas** | 4/10 | Tidak ada opsi font besar untuk lansia |
| **Overall** | **5.4/10** | Fondasi kuat, perlu konfigurasi & beberapa perbaikan |

**Paling Urgent:** Set Supabase secrets → Perbaiki SW push handler → Fix apple-touch-icon → Upload dokumen/galeri → Midtrans webhook.

---

*Analisis jamaah UX ditambahkan Mei 2025. Dibuat dari inspeksi langsung 45 file halaman, 10 komponen jamaah, manifest.json, sw.js, dan hooks terkait.*
