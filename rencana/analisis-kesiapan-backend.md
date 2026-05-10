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
