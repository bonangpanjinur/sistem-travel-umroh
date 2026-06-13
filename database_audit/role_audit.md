# Role Audit — Vinstour Travel Portal
> Berdasarkan analisis codebase aktual (permissions.ts, useAuth.tsx, admin-menu-registry.ts, AdminRoutes.tsx, CustomerRoutes.tsx)

---

## Hierarki Role (dari permissions.ts)

```
super_admin
  ├── owner
  │   ├── branch_manager
  │   │   ├── operational
  │   │   │   └── equipment
  │   │   ├── sales
  │   │   └── marketing
  │   └── finance
  └── it

agent
  └── sub_agent (mewarisi agent)

customer   (portal pribadi, tidak ada hierarki)
jamaah     (portal pribadi, tidak ada hierarki)
```

---

## 1. super_admin

**Tujuan:** Akses penuh ke seluruh sistem, termasuk konfigurasi RBAC, pengaturan sistem, dan audit log.

**Karakteristik khusus:**
- Bypass seluruh dynamic menu gate (`ProtectedRoute` memeriksa isSuperAdmin() → skip DynamicMenuGate)
- Menerima SEMUA menu item tanpa tergantung DB
- Tidak dibatasi cabang manapun (`branch_id = NULL`)

**Halaman yang diakses:** Semua halaman admin, jamaah, operational, HR, agent

**Menu utama:**
- Semua 100+ menu item di admin-menu-registry.ts
- Pengaturan → RBAC Management, RBAC Status, Simulator Akses, Keamanan & 2FA

**Tabel yang diakses:** Semua tabel tanpa pengecualian

**API yang digunakan:** Semua endpoint `/api/*`

**Fungsi helper:**
```typescript
isSuperAdmin() → roles.includes('super_admin')
```

---

## 2. owner

**Tujuan:** Pemilik perusahaan — akses laporan keuangan, performa cabang, komisi, dan manajemen tingkat tinggi tanpa akses konfigurasi sistem.

**Mewarisi dari:** branch_manager, finance (via role hierarchy)

**Halaman yang diakses:**
- Dashboard utama + Analytics + KPI
- Semua laporan keuangan (P&L, Neraca, Laba Rugi, Arus Kas)
- Laporan Komisi Agen, Perbandingan Cabang
- Semua Keberangkatan dan Booking
- SDM: Payroll, Review Kinerja (read-only)

**Menu utama:**
- Beranda: Dashboard, Analytics, KPI Real-time
- Keuangan: Dashboard Keuangan, Laporan P&L, Laporan Terpusat
- Jamaah & Agen: Agen, Cabang, Komisi
- Akuntansi: Semua laporan (K-01 s/d K-13)

**Tabel yang diakses:**
- `bookings`, `payments`, `departures`, `packages`
- `journal_entries`, `journal_lines`, `payroll`, `payroll_slips`
- `agents`, `agent_commissions`, `branches`
- `departure_financial_summary`, semua laporan

**API:** Semua `/api/finance/*`, `/api/reports/*`, `/api/bookings/*`

---

## 3. it

**Tujuan:** Tim teknologi — manajemen user, RBAC, integrasi sistem, setup teknis. BUKAN melihat data bisnis keuangan.

**Mewarisi dari:** Tidak ada

**Halaman yang diakses:**
- Pengaturan: Users, Roles, RBAC Management, RBAC Status
- Integrasi: API Connect, Midtrans, Xendit, Supabase Setup, Webhooks
- CMS: Semua halaman konten
- Activity Log, Audit Log (read-only)

**Menu utama:**
```
Pengaturan → Users, Roles, RBAC Tools, Keamanan & 2FA, PWA Settings
Integrasi → API Connect, Webhooks, Midtrans, Xendit, Supabase Setup
```

**TIDAK diizinkan:**
- Melihat laporan keuangan detail
- Mengakses payroll atau data gaji
- Memproses booking atau pembayaran

**Tabel yang diakses:**
- `user_roles`, `role_permissions`, `permissions_list`
- `user_permission_overrides`, `staff_invitations`
- `audit_logs`, `activity_logs`, `login_attempts`
- `company_settings`, `dashboard_access_config`

**API:** `/api/users/*`, `/api/roles/*`, `/api/settings/*`

---

## 4. admin

**Tujuan:** Operasional harian — mengelola booking, jamaah, paket, keberangkatan. Jembatan antara sales/operational.

**Mewarisi dari:** Tidak ada (berdiri sendiri, akses lebih luas dari operator/sales)

**Halaman yang diakses:**
- Penjualan: Leads, Booking, Kupon
- Operasional: Paket, Keberangkatan, Manifest, Perlengkapan, Haji
- Jamaah & Agen: Data Jamaah, Agen, Visa
- Keuangan: Pembayaran, Verifikasi Transfer, Kas & Bank
- Konten: Blog, Pengumuman, Banner, FAQ
- SDM: Data karyawan (read), Leave approval

**Menu utama:** Hampir semua grup kecuali Akuntansi penuh dan Pengaturan

**Tabel yang diakses:**
- `bookings`, `booking_passengers`, `booking_status_history`
- `customers`, `customer_documents`, `visa_applications`
- `departures`, `departure_hotels`, `departure_checklists`
- `payments`, `bank_accounts`
- `equipment_items`, `equipment_distributions`
- `leads`, `agents`, `packages`

**API:** Mayoritas `/api/bookings/*`, `/api/customers/*`, `/api/departures/*`

---

## 5. branch_manager

**Tujuan:** Manajer cabang — mengawasi semua aktivitas di cabangnya sendiri. Memiliki akses operational, sales, marketing di scope cabang.

**Mewarisi dari:** operational, sales, marketing

**Pembatasan cabang:** Data selalu difilter dengan `branch_id` dari JWT token

**Halaman yang diakses:**
- Dashboard Cabang (BranchManagerDashboard.tsx)
- Booking cabang, Agen cabang, Laporan cabang
- Karyawan di cabangnya, Payroll (view), Approval cuti
- Komisi cabang

**Menu utama:**
```
Beranda → Dashboard (scoped to branch)
Penjualan → Booking (branch filter)
Jamaah & Agen → Agen (branch), Komisi Cabang
Laporan → Laporan P&L (branch), Performa Agen (branch)
SDM → SDM, Payroll (view)
```

**Tabel yang diakses (selalu dengan branch_id filter):**
- `bookings WHERE branch_id = ?`
- `agents WHERE branch_id = ?`
- `employees WHERE branch_id = ?`
- `departures WHERE branch_id = ?`
- `departure_financial_summary` (via departure)

**API:**
- `/api/branches/:id` — data cabang sendiri
- `/api/branches/:id/stats` — statistik cabang

---

## 6. finance

**Tujuan:** Tim keuangan — semua aspek finansial, akuntansi double-entry, payroll, laporan pajak.

**Mewarisi dari:** Tidak ada

**Halaman yang diakses:**
- Keuangan: Dashboard Keuangan, Pembayaran, Verifikasi Transfer, Kas & Bank, AR, AP, Refund
- Akuntansi: Jurnal Umum (K-01), Buku Besar (K-02), Neraca Saldo (K-03), Laba Rugi (K-04), Neraca (K-05), Arus Kas (K-06), Budget (K-11), Rekonsiliasi Bank (K-12), Laporan Pajak (K-13), HPP Terpadu
- Laporan: Semua laporan keuangan
- COA, Rekening Bank

**TIDAK diizinkan:**
- Mengelola user/roles
- Akses CMS website

**Menu utama:**
```
Keuangan (semua) + Akuntansi (semua) + Laporan (semua)
```

**Tabel yang diakses:**
- `journal_entries`, `journal_lines` (insert + approve)
- `payments` (verify, refund)
- `payroll`, `payroll_slips`
- `vendor_invoices`, `departure_cost_items`, `departure_expenses`
- `chart_of_accounts`, `cashflow_entries`
- `departure_financial_summary`

**API:** `/api/finance/*`, `/api/payments/*`, `/api/payroll/*`

---

## 7. operational

**Tujuan:** Tim operasional keberangkatan — mengelola semua aspek teknis pra/pasca keberangkatan.

**Mewarisi dari:** equipment

**Halaman yang diakses:**
- Jadwal Keberangkatan (full access)
- Kamar & Rooming, Manifest Jamaah
- Perlengkapan (distribusi, stock opname)
- Monitor SOS, Monitor Lapangan, Tracking Real-time
- Absensi Digital, Template Itinerary
- WA Blast Keberangkatan

**Menu utama:**
```
Operasional (semua menu)
Perlengkapan
Komunikasi → WA Blast Keberangkatan
```

**Tabel yang diakses:**
- `departures` (CRUD)
- `departure_hotels`, `departure_itineraries`, `departure_checklists`
- `manifests`, `room_assignments`
- `equipment_items`, `equipment_distributions`
- `bus_assignments`, `bus_passengers`
- `sos_alerts`, `jamaah_live_locations`

**Portal khusus:** `/operational/*`, `/muthawif/*`, `/tour-leader/*`

**API:** `/api/departures/*`, `/api/equipment/*`, `/api/manifests/*`

---

## 8. operator

**Tujuan:** Data entry booking dan jamaah — fokus input data, bukan approval.

**Mewarisi dari:** Tidak ada

**Halaman yang diakses:**
- Booking (buat + edit, tidak bisa cancel)
- Data Jamaah (tambah + edit)
- Pembayaran (input bukti, tidak bisa verifikasi)
- Leads (lihat + update)

**TIDAK diizinkan:**
- Verifikasi pembayaran
- Approve atau cancel booking
- Akses laporan keuangan
- Akses SDM

**Tabel yang diakses:**
- `bookings` (INSERT + UPDATE terbatas)
- `booking_passengers`, `customer_documents`
- `customers` (INSERT + UPDATE)
- `payments` (INSERT saja, status pending)
- `leads` (UPDATE status)

---

## 9. sales

**Tujuan:** Tim penjualan — fokus prospek, booking baru, dan relasi agen.

**Mewarisi dari:** Tidak ada

**Halaman yang diakses:**
- Leads & Prospek (full), Leads Chat Widget
- Booking (buat baru, lihat — tidak bisa edit setelah buat)
- Data Jamaah (tambah, lihat)
- Paket (lihat saja)
- Agen (lihat saja)
- Laporan performa agen

**TIDAK diizinkan:**
- Verifikasi pembayaran
- Akses keuangan
- Edit/cancel booking yang sudah ada
- Akses SDM

**Tabel yang diakses:**
- `leads` (CRUD)
- `bookings` (SELECT + INSERT)
- `customers` (SELECT + INSERT)
- `agents` (SELECT)
- `packages`, `departures` (SELECT)

---

## 10. marketing

**Tujuan:** Tim marketing — konten website, komunikasi massal, analitik performa paket.

**Mewarisi dari:** Tidak ada

**Halaman yang diakses:**
- Konten: Blog, Pengumuman, Banner, Landing Page, FAQ
- Komunikasi: WA Blast, WA Otomatis, Broadcast Tersegmentasi, Template Email, Push Notifikasi
- AI & Analytics: Gemini AI, Statistik Chatbot, Analisis Sentimen, Prediksi Seat, Rekomendasi Paket
- Materi Marketing
- Paket (edit deskripsi, publish/unpublish)
- Leads (lihat, buat kampanye)

**TIDAK diizinkan:**
- Akses booking / pembayaran
- Akses SDM
- Akses keuangan

**Tabel yang diakses:**
- `announcements`, `banners`, `faqs`, `gallery_items`
- `marketing_materials`, `landing_pages`
- `wa_templates`, `wa_broadcast_campaigns`, `wa_broadcast_logs`
- `email_templates`, `packages` (UPDATE is_published)
- `leads` (SELECT + INSERT)

---

## 11. equipment

**Tujuan:** Tim perlengkapan — manajemen inventaris, distribusi ke jamaah, stock opname.

**Mewarisi dari:** Tidak ada

**Halaman yang diakses:**
- Perlengkapan (full access)
- Setting Perlengkapan
- Stock Opname
- Manifest (lihat saja untuk referensi distribusi)
- Keberangkatan (lihat saja untuk jadwal distribusi)

**TIDAK diizinkan:**
- Akses keuangan
- Akses booking
- Akses SDM

**Tabel yang diakses:**
- `equipment_items`, `equipment_categories`, `equipment_variants`
- `equipment_distributions` (CRUD)
- `equipment_photos`, `equipment_stock_history`
- `equipment_stock_opname`, `equipment_settings`
- `booking_passengers` (SELECT untuk distribusi)
- `departures` (SELECT)

---

## 12. agent

**Tujuan:** Mitra agen eksternal — mengelola booking dan jamaah dari clientnya sendiri via portal agen.

**Portal:** `/agent/*` (bukan `/admin/*`)

**Mewarisi dari:** Tidak ada (mewarisi sub_agent)

**Halaman yang diakses:**
- Dashboard Agen (booking dari agen ini)
- Buat booking baru untuk client
- Data Jamaah (client agen ini)
- Laporan Komisi (komisi agen ini)
- Wallet Agen

**Batasan data:** Selalu difilter `agent_id = agent_id milik user ini`

**Tabel yang diakses (selalu dengan agent_id filter):**
- `bookings WHERE agent_id = ?`
- `customers WHERE agent_id = ?`
- `leads WHERE agent_id = ?`
- `agent_commissions WHERE agent_id = ?`
- `agent_wallets WHERE agent_id = ?`
- `packages`, `departures` (SELECT, published only)

**Helper codebase:**
```typescript
isAgent() → roles.some(r => ['agent','sub_agent'].includes(r))
```

---

## 13. sub_agent

**Tujuan:** Sub-agen di bawah agen induk — akses lebih terbatas, hanya bisa lihat data sendiri. Booking atas nama agen induk.

**Mewarisi dari:** agent

**Batasan tambahan:**
- Tidak bisa lihat wallet agen induk
- Komisi diteruskan ke agen induk
- `parent_agent_id` diisi dengan ID agen induk

**Tabel yang diakses:** Subset dari agent, dengan `agent_id = parent_agent_id`

---

## 14. customer

**Tujuan:** Portal calon jamaah yang sudah daftar tapi belum memiliki booking aktif.

**Portal:** `/customer/*`, `/jamaah/*` (public features)

**Halaman yang diakses:**
- `/jamaah` — halaman publik: Paket, Doa & Panduan, Waktu Sholat, Kiblat, Al-Quran
- `/jamaah/profil` — profil pribadi
- Tidak ada akses ke booking (belum booking)

**Tabel yang diakses:**
- `customers` (data sendiri, via customer_accounts)
- `packages`, `departures` (SELECT published only)
- `customer_accounts` (sendiri)

**Helper codebase:**
```typescript
isCustomer() → roles.some(r => ['customer','jamaah'].includes(r))
```

---

## 15. jamaah

**Tujuan:** Jamaah aktif dengan booking — akses penuh fitur portal jamaah termasuk tracking keberangkatan, dokumen, dan ibadah.

**Portal:** `/jamaah/*` (private features via `JamaahPrivateGate`)

**Halaman yang diakses:**
- `/jamaah/profil` — profil + edit
- `/jamaah/booking` — riwayat booking sendiri
- `/jamaah/itinerary` — itinerary keberangkatan
- `/jamaah/documents` — upload + lihat dokumen
- `/jamaah/payment-history` — riwayat pembayaran
- `/jamaah/digital-id` — QR Code jamaah
- `/jamaah/checkin` — check-in keberangkatan
- Doa, Al-Quran, Waktu Sholat, Kiblat (semua publik)

**Tabel yang diakses:**
- `customers` (sendiri)
- `bookings` (milik sendiri, via customer_id)
- `booking_passengers` (milik sendiri)
- `customer_documents` (sendiri, upload)
- `payments` (milik sendiri, INSERT bukti)
- `jamaah_qr_codes` (sendiri)
- `jamaah_ibadah_targets`, `jamaah_jurnal`, `jamaah_badges`
- `departures`, `departure_itineraries` (via booking)

---

## Catatan Penting dari Codebase

### 1. `isStaff()` — tidak termasuk agent/jamaah
```typescript
const internalStaffRoles = [
  'super_admin', 'owner', 'branch_manager',
  'finance', 'sales', 'marketing', 'operational', 'equipment'
];
// 'admin' TIDAK ADA di sini! Ini bug potensial atau by design.
```
> ⚠️ **GAP**: Role `admin` tidak terdapat dalam `isStaff()`. Perlu diklarifikasi apakah `admin` adalah alias dari beberapa role atau role terpisah.

### 2. `isAdmin()` — hanya super_admin, owner, branch_manager
```typescript
const adminRoles = ['super_admin', 'owner', 'branch_manager'];
// 'admin' tidak ada di sini juga!
```
> ⚠️ **GAP**: Role `admin` yang ada di ENUM tidak terdefinisi dalam helper `isAdmin()`.

### 3. Multi-role user
- Satu user bisa punya banyak role (via `user_roles` table)
- `branchId` dipilih berdasarkan prioritas role (sortRoles)
- Contoh: user dengan `owner + branch_manager` tetap mendapat branch_id

### 4. Role `admin` vs `operator`
Dari codebase, `admin` dan `operator` sering digunakan bergantian. Rekomendasi: definisikan dengan jelas perbedaannya di authorization_architecture.md.
