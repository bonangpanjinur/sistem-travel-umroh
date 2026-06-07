# Rencana Pengembangan: Sistem Agen, Cabang & Sub-Agen

> **Terakhir diperbarui:** Juni 2026  
> **Scope:** Arsitektur lengkap, status implementasi, sprint plan, API, database, dan alur bisnis

---

## DAFTAR ISI

1. [Arsitektur & Hierarki](#1-arsitektur--hierarki)
2. [Database Schema](#2-database-schema)
3. [Status Implementasi Saat Ini](#3-status-implementasi-saat-ini)
4. [API Endpoints](#4-api-endpoints)
5. [Sprint Plan](#5-sprint-plan)
6. [Alur Bisnis & Onboarding](#6-alur-bisnis--onboarding)
7. [Sistem Komisi](#7-sistem-komisi)
8. [RBAC & Akses Kontrol](#8-rbac--akses-kontrol)
9. [Notifikasi & WhatsApp](#9-notifikasi--whatsapp)
10. [Catatan Teknis & Gotchas](#10-catatan-teknis--gotchas)

---

## 1. ARSITEKTUR & HIERARKI

### 1.1 Struktur Hierarki Lengkap

```
KANTOR PUSAT (Vinstour)
│  Role: super_admin / owner / operational / finance / sales / HR / IT
│  Portal: /admin/*
│  Akses: SEMUA modul, semua data
│
├── CABANG KOTA A  (branches.id = uuid-A)
│   │  Manager: branches.manager_user_id → auth.users
│   │  Role:    branch_manager + user_roles.branch_id = uuid-A
│   │  Portal:  /cabang/*
│   │  Akses:   booking, agen, staff, KPI, laporan — SCOPE cabang sendiri saja
│   │
│   ├── Staff Operasional A
│   │      user_roles.role = 'operational', branch_id = uuid-A
│   │      Akses: keberangkatan, equipment, checkin — hanya cabang A
│   │
│   ├── Staff Sales A
│   │      user_roles.role = 'sales', branch_id = uuid-A
│   │      Akses: leads, booking baru — hanya cabang A
│   │
│   ├── Staff Keuangan A
│   │      user_roles.role = 'finance', branch_id = uuid-A
│   │      Akses: pembayaran, invoice — hanya cabang A
│   │
│   ├── AGEN A1  (agents.id, agents.branch_id = uuid-A)
│   │   │  User:   agents.user_id → auth.users
│   │   │  Role:   'agent' di user_roles
│   │   │  Portal: /agent/*
│   │   │  Akses:  paket, jamaah sendiri, komisi, wallet, CRM, broadcast WA
│   │   │
│   │   ├── Sub-Agen A1.1  (agents.parent_agent_id = A1.id)
│   │   │      Role: 'sub_agent'
│   │   │      Portal: /agent/* (menu terbatas)
│   │   │      Akses: paket, jamaah sendiri, link unik — TIDAK bisa lihat komisi/wallet
│   │   │
│   │   └── Sub-Agen A1.2
│   │
│   └── AGEN A2  (agents.branch_id = uuid-A, parent_agent_id = NULL)
│
├── CABANG KOTA B  (branches.id = uuid-B)
│   └── (struktur sama)
│
└── AGEN INDEPENDEN  (agents.branch_id = NULL, parent_agent_id = NULL)
       Langsung di bawah kantor pusat
       Bisa diassign ke cabang kapan saja
```

### 1.2 Mapping Akun & Tabel

| Entitas | Akun di | FK Hierarki | Role di `user_roles` | Portal |
|---------|---------|-------------|----------------------|--------|
| Super Admin / Owner | `auth.users` | — | `super_admin` / `owner` | `/admin/*` |
| Branch Manager | `auth.users` | `branches.manager_user_id` | `branch_manager` + `branch_id` | `/cabang/*` |
| Branch Staff | `auth.users` | `user_roles.branch_id` | `operational`/`sales`/`finance` + `branch_id` | tergantung role |
| Agen | `auth.users` | `agents.user_id` | `agent` | `/agent/*` |
| Sub-Agen | `auth.users` | `agents.parent_agent_id` | `sub_agent` | `/agent/*` (terbatas) |
| Jamaah / Customer | `auth.users` | `customers.user_id` | `customer` / `jamaah` | `/jamaah-info/*` |

---

## 2. DATABASE SCHEMA

### 2.1 Tabel `branches`

```sql
branches (
  id                   UUID PK DEFAULT gen_random_uuid()
  name                 TEXT NOT NULL              -- "Cabang Jakarta Utara"
  code                 TEXT NOT NULL UNIQUE       -- "JKU01"
  address              TEXT
  city                 TEXT
  province             TEXT
  phone                TEXT
  email                TEXT
  manager_user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL
  is_active            BOOLEAN DEFAULT true
  slug                 TEXT UNIQUE                -- "jakarta-utara" (auto-generated)
  website_description  TEXT
  website_banner_url   TEXT
  website_gallery      JSONB DEFAULT '[]'
  website_testimonials JSONB DEFAULT '[]'
  featured_package_ids JSONB DEFAULT '[]'
  view_count           INTEGER DEFAULT 0
  created_at           TIMESTAMPTZ DEFAULT now()
  updated_at           TIMESTAMPTZ DEFAULT now()
)
```

### 2.2 Tabel `agents`

```sql
agents (
  id                UUID PK DEFAULT gen_random_uuid()
  user_id           UUID REFERENCES auth.users(id) ON DELETE SET NULL
  branch_id         UUID REFERENCES branches(id) ON DELETE SET NULL
  parent_agent_id   UUID REFERENCES agents(id) ON DELETE SET NULL   -- NULL = agen utama
  company_name      TEXT NOT NULL                -- nama perusahaan atau nama agen
  agent_code        TEXT NOT NULL UNIQUE         -- "AGT20260001"
  contact_name      TEXT                         -- nama contact person
  phone             TEXT
  email             TEXT
  address           TEXT
  commission_rate   NUMERIC(5,2) DEFAULT 0       -- persen, mis. 5.00
  is_active         BOOLEAN DEFAULT true
  status            TEXT DEFAULT 'active'         -- pending|active|suspended|inactive
                    CHECK (status IN ('pending','active','suspended','inactive'))
  slug              TEXT UNIQUE                  -- untuk website agen
  featured_package_ids JSONB DEFAULT '[]'
  website_bio       TEXT
  level             INTEGER DEFAULT 1            -- level hierarki (1=utama, 2=sub)
  created_at        TIMESTAMPTZ DEFAULT now()
  updated_at        TIMESTAMPTZ DEFAULT now()
)
```

### 2.3 Tabel `agent_invitation_tokens`

```sql
agent_invitation_tokens (
  id                UUID PK DEFAULT gen_random_uuid()
  agent_id          UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE
  token             TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32),'hex')
  used_at           TIMESTAMPTZ                          -- NULL = belum dipakai
  used_by_agent_id  UUID REFERENCES agents(id) ON DELETE SET NULL
  expires_at        TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days'
  created_at        TIMESTAMPTZ DEFAULT now()
)
```
> Token ini dipakai oleh agen untuk mengundang sub-agen melalui link unik.

### 2.4 Tabel `user_roles`

```sql
user_roles (
  id         UUID PK DEFAULT gen_random_uuid()
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
  role       TEXT NOT NULL  -- enum: super_admin|owner|branch_manager|finance|operational|
                            --        sales|marketing|equipment|agent|sub_agent|customer|
                            --        jamaah|hr|admin|visa_officer
  branch_id  UUID REFERENCES branches(id) ON DELETE SET NULL  -- untuk staff cabang
  created_at TIMESTAMPTZ DEFAULT now()
  UNIQUE (user_id, role)
)
```

### 2.5 Tabel `branch_commissions`

```sql
branch_commissions (
  id                 UUID PK
  branch_id          UUID REFERENCES branches(id) ON DELETE CASCADE
  booking_id         UUID                       -- booking yang menghasilkan komisi
  commission_amount  NUMERIC                    -- nominal rupiah
  commission_rate    NUMERIC                    -- persen yang berlaku saat itu
  status             TEXT                       -- pending|approved|paid|rejected
  notes              TEXT
  approved_by        UUID
  approved_at        TIMESTAMPTZ
  paid_at            TIMESTAMPTZ
  payment_reference  TEXT
  created_at         TIMESTAMPTZ
  updated_at         TIMESTAMPTZ
)
```

### 2.6 Tabel `agent_override_commissions`

```sql
agent_override_commissions (
  id                  UUID PK
  booking_id          UUID                       -- booking yang menghasilkan override
  agent_id            UUID REFERENCES agents(id)  -- agen induk yang terima override
  sub_agent_id        UUID REFERENCES agents(id)  -- sub-agen yang melakukan booking
  override_percentage NUMERIC                    -- persen override dari komisi sub-agen
  override_amount     NUMERIC                    -- nominal rupiah
  status              TEXT                       -- pending|approved|paid
  paid_at             TIMESTAMPTZ
  notes               TEXT
  created_at          TIMESTAMPTZ
)
```

### 2.7 Tabel `branch_monthly_targets`

```sql
branch_monthly_targets (
  id                    UUID PK
  branch_id             UUID REFERENCES branches(id) ON DELETE CASCADE
  month_key             TEXT NOT NULL    -- format: "2026-07"
  bookings_target       INTEGER          -- target jumlah booking
  revenue_target        NUMERIC          -- target pendapatan (Rp)
  new_customers_target  INTEGER          -- target jamaah baru
  agents_booking_target INTEGER          -- target booking dari agen
  conversion_target     NUMERIC          -- target konversi leads (persen)
  notes                 TEXT
  set_by                UUID             -- user_id yang set target
  created_at            TIMESTAMPTZ
  updated_at            TIMESTAMPTZ
)
```

### 2.8 Tabel `agent_monthly_targets`

```sql
agent_monthly_targets (
  id                UUID PK
  agent_id          UUID REFERENCES agents(id) ON DELETE CASCADE
  month_key         TEXT NOT NULL      -- format: "2026-07"
  booking_target    INTEGER
  commission_target BIGINT             -- dalam Rupiah
  jamaah_target     INTEGER
  updated_at        TIMESTAMPTZ
)
```

### 2.9 Tabel Tambahan Terkait

| Tabel | Kegunaan |
|-------|----------|
| `agent_memberships` | Tier membership agen (Silver/Gold/Platinum) |
| `membership_plans` | Definisi tier dan benefit |
| `agent_leads` | CRM leads milik agen |
| `agent_training_progress` | Progress modul pelatihan agen |
| `profiles` | Data profil user (full_name, phone, jabatan, joined_at) |

---

## 3. STATUS IMPLEMENTASI SAAT INI

### 3.1 Admin Panel (`/admin/*`)

#### Manajemen Cabang (`/admin/branches`)

| Status | Fitur | File | Catatan |
|--------|-------|------|---------|
| ✅ | CRUD cabang (nama, kode, kota, provinsi, alamat) | `AdminBranches.tsx` | |
| ✅ | Buat akun branch manager saat tambah cabang | `AddBranchDialog.tsx` + `POST /api/branches/create` | Sprint 1 done |
| ✅ | Kirim kredensial manager via WhatsApp (Fonnte) | `whatsapp.ts` + branches route | Sprint 1 done |
| ✅ | Tombol reset password manager | `ResetPasswordDialog.tsx` + `POST /api/branches/reset-password` | Sprint 1 done |
| ✅ | Halaman detail cabang (`/admin/branches/:id`) | `AdminBranchDetail.tsx` | Sprint 1 done |
| ✅ | Tab Info: data cabang + manager | `AdminBranchDetail.tsx` | Sprint 1 done |
| ✅ | Tab Staff: daftar + tambah staff + reset password per-staff | `AdminBranchDetail.tsx` | Sprint 1 done |
| ✅ | Tab Agent: daftar agen terhubung ke cabang | `AdminBranchDetail.tsx` | Sprint 1 done |
| ✅ | Tab Statistik: keberangkatan + booking + revenue per cabang | `AdminBranchDetail.tsx` | Sprint 1 done |
| ✅ | Pengaturan website cabang | `BranchWebsiteDialog` in `AdminBranches.tsx` | |
| 🔧 | Branch data scoping di API | API masih return data semua cabang | Sprint 2 |
| ❌ | Laporan keuangan konsolidasi per cabang | Placeholder ada, data kosong | Sprint 3 |
| ❌ | Bandingkan kinerja 2+ cabang | `AdminBranchComparison.tsx` minimal | Sprint 3 |

#### Manajemen Agen (`/admin/agents`)

| Status | Fitur | File | Catatan |
|--------|-------|------|---------|
| ✅ | Daftar agen + expand sub-agen | `AdminAgents.tsx` | |
| ✅ | Tambah agen: buat user + record + role + WA | `AddAgentDialog.tsx` + `POST /api/agents/create` | Sprint 1 done |
| ✅ | Tampil kredensial + status WA setelah buat agen | `AddAgentDialog.tsx` | Sprint 1 done |
| ✅ | Filter: cabang, status, tier | `AdminAgents.tsx` | |
| ✅ | Approval komisi agen | `AdminAgentCommissionReport.tsx` | |
| ✅ | Laporan komisi agen | `AdminLaporanAgen.tsx` | |
| ✅ | Tier komisi berdasarkan volume | `agent_commission_tiers` table | |
| ✅ | Detail agen (`/admin/agents/:id`) | 5 tab: Info, Booking, Komisi, Sub-Agen, Performa | Sprint 2 ✅ |
| ✅ | Suspend / reaktivasi agen | `PATCH /api/agents/:id/status` + konfirmasi dialog | Sprint 2 ✅ |
| ❌ | Override commission UI | Tabel ada, UI belum | Sprint 3 |
| ✅ | Performance analitik per agen | Tab Performa: bar chart booking + area chart revenue/komisi | Sprint 3 ✅ |
| ✅ | Export data agen CSV | Tombol Export di header `/admin/agents` | Sprint 3 ✅ |
| ❌ | Master laporan komisi (agen+cabang+sub) | Belum ada | Sprint 3 |

### 3.2 Portal Cabang (`/cabang/*`)

| Status | Fitur | File | Catatan |
|--------|-------|------|---------|
| ✅ | Dashboard cabang (stats dasar) | `BranchDashboard.tsx` | |
| ✅ | Daftar booking scope cabang | `BranchBookings.tsx` | |
| ✅ | Manajemen agen di cabang | `BranchAgen.tsx` | |
| ✅ | Manajemen staff cabang (lihat) | `BranchStaff.tsx` | |
| ✅ | KPI targets bulanan | `BranchKPITargets.tsx` | |
| ✅ | Persetujuan (approval) booking | `BranchApprovals.tsx` | |
| ✅ | Diskon cabang | `BranchDiskon.tsx` | |
| ✅ | Laporan cabang | `BranchLaporan.tsx` | |
| ✅ | Pengaturan website cabang | `BranchWebsiteSettings.tsx` | |
| ✅ | KPI progress real-time | 6 KPI card: booking, revenue, agen aktif, jamaah, komisi pending/dibayar | Sprint 3 ✅ |
| ✅ | Buat akun user staff dari portal cabang | `AddStaffDialog` baru: form + buat akun via API + tampil kredensial | Sprint 2 ✅ |
| ✅ | Komisi cabang real-time di dashboard | Query `branch_commissions` — KPI "Komisi Pending" + "Komisi Dibayar" | Sprint 3 ✅ |
| ❌ | Notifikasi booking baru ke branch manager | Butuh push notif / realtime listener | Sprint 3 |
| ✅ | Data scoping (branch_id filter di API) | `supabaseProxy.ts`: branch_manager auto-disaring by JWT branch_id | Sprint 3 ✅ |

### 3.3 Portal Agen (`/agent/*`)

| Status | Fitur | File | Catatan |
|--------|-------|------|---------|
| ✅ | Dashboard (booking, komisi, leads stats) | `AgentDashboard.tsx` | |
| ✅ | Jelajah & cari paket | `AgentPackages.tsx` | |
| ✅ | Daftarkan jamaah (individual) | `AgentRegister.tsx` | |
| ✅ | Daftarkan jamaah (grup) | `AgentRegisterGroup.tsx` | |
| ✅ | Daftar jamaah sendiri | `AgentJamaahEnhanced.tsx` | |
| ✅ | Komisi & history pencairan | `AgentCommissions.tsx` | |
| ✅ | Wallet & permintaan withdrawal | `AgentWallet.tsx` | |
| ✅ | Jaringan sub-agen | `AgentNetwork.tsx` | |
| ✅ | Jamaah dari sub-agen | `AgentSubAgentJamaah.tsx` | |
| ✅ | CRM leads pipeline | `AgentLeads.tsx` | |
| ✅ | Broadcast WA massal ke leads | `AgentBroadcast.tsx` | |
| ✅ | Link unik + landing page | `AgentUniqueLink.tsx` | |
| ✅ | Kit digital (materi promosi) | `AgentDigitalKit.tsx` | |
| ✅ | Training modul + quiz | `AgentTraining.tsx` | |
| ✅ | Membership tier (Silver/Gold/Platinum) | `AgentMembership.tsx` | |
| ✅ | Referral & tracking | `AgentMyReferrals.tsx` | |
| ✅ | Leaderboard & gamifikasi | `AgentLeaderboard.tsx` | |
| ✅ | Target bulanan | `AgentTargets.tsx` | |
| ✅ | Settings profil agen | `AgentSettings.tsx` | |
| ✅ | Website agen (landing page kustom) | `AgentWebsiteSettings.tsx` | |
| ✅ | Laporan pribadi | `AgentLaporan.tsx` | |
| 🔧 | Override commission tampil ke agen induk | Tabel ada, UI belum | Sprint 3 |
| ✅ | Undang sub-agen via form publik + approval | `/daftar-sub-agen?ref=KODE` + tombol "Buat Link" di AgentNetwork | Sprint 2 ✅ |
| ❌ | Notifikasi booking masuk dari link agen | Butuh push notif / VAPID | Sprint 3 |
| ❌ | Sub-agen: batasan menu kustom | Masih sama dengan menu agen utama | Sprint 3 |

### 3.4 API Endpoints

#### Sudah Ada

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| `POST` | `/api/agents/create` | Buat agen: auth.users + agents record + user_roles + WA kredensial |
| `POST` | `/api/branches/create` | Buat cabang: branches record + akun manager + user_roles + WA kredensial |
| `POST` | `/api/branches/:id/staff` | Tambah staff ke cabang: auth.users + user_roles + WA kredensial |
| `GET`  | `/api/branches/:id` | Detail cabang: info, manager, staff, agents, departure stats |
| `POST` | `/api/branches/reset-password` | Reset password user (agen/manager/staff) oleh admin |

#### Sprint 2 — Sudah Selesai

| Method | Endpoint | Fungsi | Status |
|--------|----------|--------|--------|
| `GET`  | `/api/agents/:id` | Detail agen: info, jamaah, booking, komisi, sub-agen | ✅ |
| `PATCH`| `/api/agents/:id/status` | Suspend / aktifkan / nonaktifkan agen | ✅ |
| `POST` | `/api/agents/:id/reset-password` | Admin reset password agen + kirim WA | ✅ |
| `POST` | `/api/agents/:id/approve` | Approve pendaftaran sub-agen: buat user + kirim WA | ✅ |
| `POST` | `/api/agents/:id/reject` | Tolak pendaftaran sub-agen | ✅ |
| `POST` | `/api/agents/invitation` | Generate token undangan sub-agen (7 hari) | ✅ |
| `GET`  | `/api/agents/invitation/:token` | Validasi token + ambil info agen induk | ✅ |
| `POST` | `/api/agents/invitation/register` | Daftar sub-agen via token → status pending | ✅ |

#### Belum Ada (Sprint 3)

| Method | Endpoint | Fungsi | Sprint |
|--------|----------|--------|--------|
| `GET`  | `/api/branches/:id/stats` | Statistik KPI real-time per cabang | Sprint 3 |
| `GET`  | `/api/commission/report` | Master laporan komisi gabungan | Sprint 3 |

---

## 4. API ENDPOINTS

### 4.1 `POST /api/branches/create`

**Request Body:**
```json
{
  "name": "Cabang Jakarta Utara",
  "code": "JKU01",
  "city": "Jakarta",
  "province": "DKI Jakarta",
  "address": "Jl. Mangga Dua No. 5",
  "phone": "02111223344",
  "email": "jakut@vinstour.com",
  "managerName": "Budi Santoso",
  "managerEmail": "budi@vinstour.com",
  "managerPhone": "08123456789"
}
```

**Response:**
```json
{
  "success": true,
  "branchId": "uuid",
  "branchCode": "JKU01",
  "managerUserId": "uuid",
  "tempPassword": "abc123Aa1!",
  "managerEmail": "budi@vinstour.com",
  "waSent": true,
  "waError": null
}
```

**Alur Backend:**
1. `BEGIN` transaksi
2. Cek duplikasi email manager → error jika sudah ada
3. `createUser(email, tempPass, fullName, phone)` → insert ke `auth.users` + `profiles`
4. Insert `user_roles`: role=`branch_manager`, branch_id=cabang baru
5. Update `profiles.role = 'branch_manager'`
6. Insert `branches` dengan `manager_user_id`
7. Update `user_roles.branch_id = branchId` (set FK setelah cabang dibuat)
8. `COMMIT`
9. Kirim WA via Fonnte (non-blocking, fire-and-forget)

---

### 4.2 `POST /api/agents/create`

**Request Body:**
```json
{
  "fullName": "Andi Wijaya",
  "email": "andi@travelkita.com",
  "phone": "08987654321",
  "companyName": "PT. Travel Kita",
  "commissionRate": "5",
  "bankName": "BCA",
  "bankAccountNumber": "1234567890",
  "bankAccountName": "Andi Wijaya",
  "npwp": "12.345.678.9-012.000",
  "branchId": "uuid-cabang-atau-null",
  "parentAgentId": "uuid-agen-induk-atau-null"
}
```

**Response:**
```json
{
  "success": true,
  "agentCode": "AGT20260001",
  "email": "andi@travelkita.com",
  "userId": "uuid",
  "agentId": "uuid",
  "tempPassword": "xyz789Aa1!",
  "waSent": false,
  "waError": "Konfigurasi WhatsApp belum diatur"
}
```

**Catatan:**
- Kolom di tabel `agents` menggunakan `contact_name` (bukan `full_name`)
- Field bank (bank_name, bank_account_number, dll.) **belum ada** di tabel `agents` — perlu migration atau tabel terpisah `agent_bank_accounts`

---

### 4.3 `GET /api/branches/:id`

**Response:**
```json
{
  "success": true,
  "branch": {
    "id": "uuid",
    "name": "Cabang Jakarta",
    "code": "JKT01",
    "manager_name": "Budi",
    "manager_email": "budi@vinstour.com",
    "manager_phone": "081234",
    ...
  },
  "staff": [
    { "user_id": "uuid", "role": "sales", "full_name": "Siti", "email": "...", "phone": "..." }
  ],
  "agents": [
    { "agent_code": "AGT001", "contact_name": "Andi", "commission_rate": 5, "status": "active" }
  ],
  "departureStats": [
    { "status": "upcoming", "count": 3, "total_quota": 120, "filled_seats": 85 }
  ],
  "recentDepartures": [
    { "package_name": "Umroh Rajab 2026", "departure_date": "2026-07-15", "status": "upcoming" }
  ],
  "bookingStats": { "total_bookings": 142, "total_revenue": "2150000000" }
}
```

---

### 4.4 `POST /api/branches/:id/staff`

**Request Body:**
```json
{
  "fullName": "Siti Rahayu",
  "email": "siti@jkt.vinstour.com",
  "phone": "08234567890",
  "jabatan": "sales"
}
```

**Jabatan valid:** `operational` | `sales` | `finance` | `hr` | `marketing`

**Response:**
```json
{
  "success": true,
  "userId": "uuid",
  "email": "siti@jkt.vinstour.com",
  "tempPassword": "def456Aa1!",
  "jabatan": "sales",
  "branchId": "uuid",
  "waSent": true,
  "waError": null
}
```

---

### 4.5 `POST /api/branches/reset-password`

**Request Body:**
```json
{
  "userId": "uuid",
  "newPassword": "NewPassword@123"
}
```

**Catatan:** Jika `newPassword` dikosongkan, sistem generate password acak.

**Response:**
```json
{
  "success": true,
  "tempPassword": "abc789Aa1!"
}
```

---

## 5. SPRINT PLAN

### ✅ Sprint 1 — Selesai (Juni 2026)

**Tema: Buat Akun, Kirim Kredensial, Reset Password**

| ID | Fitur | Status | File |
|----|-------|--------|------|
| S1-01 | `POST /api/branches/create` — buat cabang + akun manager | ✅ | `branches.ts` |
| S1-02 | `POST /api/branches/:id/staff` — tambah staff + buat akun | ✅ | `branches.ts` |
| S1-03 | `POST /api/branches/reset-password` — admin reset password | ✅ | `branches.ts` |
| S1-04 | `GET /api/branches/:id` — detail cabang dengan semua data | ✅ | `branches.ts` |
| S1-05 | `POST /api/agents/create` — buat agen + akun user + WA | ✅ | `agents.ts` |
| S1-06 | WhatsApp sender utility (`sendWA` + `credentialMessage`) | ✅ | `whatsapp.ts` |
| S1-07 | `AddBranchDialog.tsx` — form tambah cabang + akun manager + tampil kredensial | ✅ | `AddBranchDialog.tsx` |
| S1-08 | `AddAgentDialog.tsx` — form tambah agen + tampil kredensial + status WA | ✅ | `AddAgentDialog.tsx` |
| S1-09 | `ResetPasswordDialog.tsx` — dialog reset password universal | ✅ | `ResetPasswordDialog.tsx` |
| S1-10 | `AdminBranchDetail.tsx` — halaman detail cabang (4 tab) | ✅ | `AdminBranchDetail.tsx` |
| S1-11 | Routing `/admin/branches/:id` | ✅ | `AdminRoutes.tsx` |
| S1-12 | Migration 062: `agents.status`, `agent_invitation_tokens`, `profiles.jabatan` | ✅ | `062_agent_status_branch_staff.sql` |

---

### ✅ Sprint 2 — Selesai (Juni 2026)

**Tema: Data Scoping, Portal Cabang Lengkap, Sub-Agen**

| ID | Fitur | Status | File |
|----|-------|--------|------|
| S2-A1 | Inject `branch_id` + `agent_id` ke JWT payload saat login | ✅ | `auth.ts`, `routes/auth.ts` |
| S2-A2 | `getBranchIdForRole`, `getAgentByUserId` helpers di JWT auth | ✅ | `auth.ts` |
| S2-A3 | Block login untuk agen `suspended` | ✅ | `routes/auth.ts` |
| S2-B | Update `BranchStaff.tsx` AddStaffDialog → buat user baru via `POST /api/branches/:id/staff` + tampil kredensial | ✅ | `BranchStaff.tsx` |
| S2-C1 | `GET /api/agents/:id` endpoint detail agen | ✅ | `agents.ts` |
| S2-C2 | `AdminAgentDetail.tsx` — 4 tab: Info, Booking, Komisi, Sub-Agen | ✅ | `AdminAgentDetail.tsx` |
| S2-C3 | Routing `/admin/agents/:id` | ✅ | `AdminRoutes.tsx` |
| S2-C4 | Tombol Detail (eye) di `AdminAgents.tsx` → navigate ke `/admin/agents/:id` | ✅ | `AdminAgents.tsx` |
| S2-D1 | `PATCH /api/agents/:id/status` — suspend/aktifkan/nonaktifkan | ✅ | `agents.ts` |
| S2-D2 | Tombol Suspend/Aktifkan + konfirmasi di `AdminAgentDetail.tsx` | ✅ | `AdminAgentDetail.tsx` |
| S2-D3 | `POST /api/agents/:id/reset-password` — reset password agen | ✅ | `agents.ts` |
| S2-E1 | `POST /api/agents/invitation` — generate token undangan sub-agen | ✅ | `agents.ts` |
| S2-E2 | Halaman publik `/daftar-sub-agen` — form pendaftaran via link | ✅ | `DaftarSubAgen.tsx` |
| S2-E3 | `GET /api/agents/invitation/:token` + `POST /api/agents/invitation/register` | ✅ | `agents.ts` |
| S2-E4 | Admin approval: `POST /api/agents/:id/approve` + `POST /api/agents/:id/reject` | ✅ | `agents.ts` |
| S2-E5 | Routing publik `/daftar-sub-agen` | ✅ | `PublicRoutes.tsx` |
| S2-G | Tombol "Buat Link Undangan" di `AgentNetwork.tsx` → generate + tampil link | ✅ | `AgentNetwork.tsx` |

**Catatan implementasi:**
- JWT sekarang membawa `branch_id` dan `agent_id` — penting untuk scoping data di proxy
- Route order di `agents.ts` KRITIS: `/invitation`, `/invitation/:token`, `/commission-tiers/list` harus SEBELUM `/:id`
- Branch data scoping (filter `branch_id` di supabaseProxy) masih pending — masuk Sprint 3
- Override commission UI masih pending — masuk Sprint 3

---

#### 🔵 Pending dari Sprint 2 → Sprint 3

| ID | Task | Catatan |
|----|------|---------|
| S2-A3 | Supabase proxy filter by `branch_id` untuk branch_manager | Komplex — perlu perubahan supabaseProxy.ts |
| S2-F | Override Commission UI + DB trigger | Butuh SQL migration + UI |
| S2-G | Push notifikasi booking baru ke agen | Butuh VAPID setup |

---

### 🟢 Sprint 3 — Jangka Menengah

**Tema: Analitik, Laporan Master, Perbandingan Cabang**

| ID | Fitur | Deskripsi | File | Status |
|----|-------|-----------|------|--------|
| S3-01 | Master Laporan Komisi | Satu halaman gabung: agen + cabang + sub-agen, export CSV/Excel | `AdminMasterKomisi.tsx` | ❌ |
| S3-02 | Analitik Performa Agen | Grafik booking/komisi per bulan di tab Performa | `AdminAgentDetail.tsx` | ✅ |
| S3-03 | Branch Comparison Report | Bandingkan 2+ cabang: booking, revenue, agen aktif, KPI | `AdminBranchComparison.tsx` | ❌ |
| S3-04 | KPI Real-Time Dashboard Cabang | 6 KPI card real-time: booking, revenue, agen, jamaah, komisi | `BranchDashboard.tsx` | ✅ |
| S3-05 | Per-User Permission Override | Super admin override izin untuk user spesifik | `AdminRoleManagement.tsx` | ❌ |
| S3-06 | Komisi Cabang di Dashboard | KPI "Komisi Pending" + "Komisi Dibayar" dari `branch_commissions` | `BranchDashboard.tsx` | ✅ |
| S3-07 | Export Data Agen | Export CSV daftar agen + stats, BOM UTF-8, tombol di header | `AdminAgents.tsx` | ✅ |
| S3-08 | Membership Tier Otomatis | Otomatis upgrade tier agen berdasarkan volume booking | DB trigger | ❌ |
| S3-09 | Branch Data Scoping | `supabaseProxy.ts` inject `branch_id` filter untuk `branch_manager` | `supabaseProxy.ts` | ✅ |
| S3-10 | Override Commission UI | Tabel `agent_override_commissions` sudah ada, UI admin + agen perlu dibuat | `AdminAgentDetail.tsx` | ❌ |
| S3-11 | Sub-Agen Menu Kustom | Batasi menu sub_agent vs agen utama di sidebar portal agen | `AgentLayoutEnhanced.tsx` | ❌ |
| S3-12 | Notifikasi Booking ke Branch Manager | Push notif saat booking baru di cabang | VAPID setup | ❌ |

---

## 6. ALUR BISNIS & ONBOARDING

### 6.1 Admin Buat Cabang Baru

```
1. Admin → /admin/branches → Klik "Tambah Cabang"
2. Isi form: Nama Cabang, Kode, Kota, Provinsi, Alamat (opsional)
3. Isi: Nama Manager, Email Manager, HP Manager (untuk WA kredensial)
4. Klik "Buat Cabang"

[Backend — satu transaksi atomik]
5. Validasi: kode cabang unik, email manager belum terdaftar
6. Buat auth.users (email, password random)
7. Buat profiles (full_name, phone)
8. Insert user_roles: role='branch_manager'
9. Insert branches: manager_user_id = user baru
10. Update user_roles.branch_id = branches.id
11. COMMIT

[Non-blocking]
12. Kirim WA ke HP manager:
    "Akun Branch Manager Anda di [Nama Cabang] telah dibuat.
     Email: manager@email.com
     Password: abc123Aa1!
     Login: [URL]/login"

5. Admin melihat kartu cabang baru + tombol "Detail"
6. Manager login → wajib ganti password → mulai kelola cabang
```

### 6.2 Admin Buat Agen Baru

```
1. Admin → /admin/agents → Klik "Tambah Agen"
2. Isi form: Nama Lengkap, Email, HP (untuk WA), Nama Perusahaan
3. Pilih: Cabang (opsional — untuk agen independen biarkan kosong)
4. Isi: Rate Komisi (%), Info Rekening Bank
5. Klik "Tambah Agent"

[Backend]
6. Generate agent_code: "AGT{YYYY}{random 4 digit}"
7. Buat auth.users + profiles
8. Insert agents (user_id, agent_code, contact_name, commission_rate, branch_id)
9. Insert user_roles: role='agent'
10. COMMIT

[Non-blocking]
11. Kirim WA: kredensial login ke HP agen

6. Dialog tampilkan: agent_code, email, tempPassword, status WA
7. Admin salin kredensial lalu klik "Selesai"
8. Agen login → akses /agent/* → profil setup
```

### 6.3 Branch Manager Tambah Staff

```
1. Admin (atau Branch Manager) → /admin/branches/:id → Tab "Staff"
2. Klik "Tambah Staff"
3. Isi: Nama, Email, HP, Pilih Jabatan (Operasional/Sales/Keuangan/HR/Marketing)
4. Klik "Tambah Staff"

[Backend — POST /api/branches/:id/staff]
5. Buat auth.users + profiles
6. Insert user_roles: role=jabatan, branch_id=cabang ini
7. Update profiles.role = jabatan
8. COMMIT
9. Kirim WA kredensial (jika ada HP)

5. Dialog tampilkan tempPassword + tombol salin
```

### 6.4 Agen Undang Sub-Agen (Sprint 2)

```
1. Agen → /agent/network → Klik "Undang Sub-Agen"
2. Sistem generate token (expired 7 hari) di agent_invitation_tokens
3. Tampilkan link: /daftar-sub-agen?ref={agent_code}&token={token}
4. Agen kirim link ke calon sub-agen

5. Calon sub-agen buka link → validasi token aktif
6. Isi form: Nama, HP, Email, No. KTP (opsional foto KTP)
7. Submit → insert agents (status='pending', parent_agent_id=agen)
8. Tandai agent_invitation_tokens.used_at = now()

9. Admin notif → review → Approve atau Tolak
10. Jika Approve:
    a. Buat auth.users + set role='sub_agent'
    b. Update agents.status = 'active', agents.user_id = user baru
    c. Kirim WA ke sub-agen: kredensial login
    d. Kirim WA ke agen induk: "Sub-agen [nama] Anda telah disetujui"
```

---

## 7. SISTEM KOMISI

### 7.1 Komisi Agen

**Cara Kerja:**
1. Saat booking dikonfirmasi (`status = confirmed`), sistem hitung komisi agen
2. Komisi = `booking.total_price × agents.commission_rate / 100`
3. Record masuk ke tabel komisi (belum ada tabel khusus — saat ini via trigger)
4. Admin review → approve → bayar via transfer

**Tier Komisi:**
- Komisi rate bisa bervariasi per tier membership (Silver/Gold/Platinum)
- Tabel `agent_commission_tiers` menyimpan mapping tier → rate
- Auto-upgrade tier berdasarkan volume booking total

### 7.2 Override Commission (Sub-Agen → Agen Induk)

**Konsep:** Agen induk mendapat persentase dari komisi yang dihasilkan sub-agennya.

```
Contoh:
  Sub-Agen A1.1 booking jamaah → komisi 5% dari total = Rp 1.000.000
  Agen induk A1 punya override_percentage = 20%
  Override A1 = 20% × Rp 1.000.000 = Rp 200.000

  Sub-agen A1.1 menerima: Rp 1.000.000 - Rp 200.000 = Rp 800.000
  Agen induk A1 menerima: Rp 200.000 sebagai override
```

**Tabel:** `agent_override_commissions`
**Status:** Schema sudah ada, UI belum (Sprint 2)

### 7.3 Komisi Cabang

**Cara Kerja:**
1. Setiap booking yang dihasilkan oleh agen cabang tersebut, cabang mendapat komisi
2. Rate komisi cabang dikonfigurasi di level cabang
3. Record di `branch_commissions` (booking_id, branch_id, commission_amount, status)
4. Admin pusat approve + bayar ke rekening cabang

**Status:** Tabel ada, tidak ada trigger otomatis — entry manual saat ini.

### 7.4 Wallet Agen

**Cara Kerja (sudah ada):**
- Agen punya saldo wallet (akumulasi komisi yang sudah diapprove)
- Bisa request withdrawal via `AgentWallet.tsx`
- Admin approve → transfer manual ke rekening bank agen

---

## 8. RBAC & AKSES KONTROL

### 8.1 Tabel Kunci

| Tabel | Fungsi |
|-------|--------|
| `menu_items` | Daftar semua menu beserta `required_permission` key |
| `role_permissions` | Mapping `(role, permission_key)` — siapa boleh apa |
| `user_roles` | Mapping `(user_id, role, branch_id)` — user ini punya role apa di cabang mana |

### 8.2 Valid Roles (Enum Check di `user_roles.role`)

```
super_admin | owner | branch_manager | finance | operational | sales |
marketing | equipment | agent | sub_agent | customer | jamaah |
hr | admin | visa_officer
```

> **PENTING:** Nilai `admin` dan `staff` sudah **tidak valid** — gunakan `branch_manager` atau role spesifik (`operational`, `sales`, dll).

### 8.3 Cara Kerja Akses Frontend

```typescript
// Hook yang digunakan di setiap halaman
const canAccess = useCanAccess(PERMISSIONS.BRANCHES);

// Permission key dipetakan ke role di role_permissions table
// Super admin bisa kelola via /admin/role-management
```

### 8.4 Gap yang Perlu Ditutup

| Gap | Prioritas | Sprint |
|-----|-----------|--------|
| Branch data scoping (API filter by branch_id untuk branch_manager) | 🔴 P1 | ✅ Sprint 3 Done |
| Sub-agent menu kustom (batasi akses vs agen utama) | 🟡 P2 | Sprint 3 |
| Per-user permission override | 🟢 P3 | Sprint 3 |
| JWT claims menyertakan `branch_id` + `agent_id` | 🔴 P1 | ✅ Sprint 2 Done |

---

## 9. NOTIFIKASI & WHATSAPP

### 9.1 Konfigurasi WA (Fonnte)

- **Token:** Disimpan di tabel `whatsapp_config` (bukan environment variable)
- **Admin kelola:** `/admin/whatsapp` → setting token Fonnte
- **Fallback:** API server cek env var `FONNTE_TOKEN` jika DB tidak punya config

### 9.2 Template Pesan yang Sudah Ada

**Kredensial Login (Agen/Staff/Manager):**
```
Selamat datang di Vinstour Travel!

Akun {Role} Anda telah dibuat.
Login: {email}
Password sementara: {password}

Segera ganti password setelah login pertama.
Portal: [URL]
```

### 9.3 Template yang Akan Ditambahkan (Sprint 2)

| Trigger | Penerima | Pesan |
|---------|----------|-------|
| Booking baru via link agen | Agen | "Ada booking baru dari link Anda: [nama jamaah]" |
| Sub-agen mendaftar | Agen induk | "Ada calon sub-agen baru: [nama]. Menunggu approval admin." |
| Sub-agen diapprove | Agen induk | "Sub-agen [nama] Anda telah aktif." |
| Agen di-suspend | Agen | "Akun agen Anda telah ditangguhkan. Hubungi admin." |
| Komisi diapprove | Agen | "Komisi Rp [nominal] untuk booking [kode] telah disetujui." |
| Komisi dibayar | Agen | "Komisi Rp [nominal] telah ditransfer ke rekening Anda." |

---

## 10. CATATAN TEKNIS & GOTCHAS

### 10.1 Struktur Tabel Agents

- Kolom nama adalah **`contact_name`** (bukan `full_name`)
- Tidak ada kolom bank (`bank_name`, `bank_account_number`) di tabel `agents` — perlu buat tabel `agent_bank_accounts` atau tambah kolom via migration
- `company_name` wajib NOT NULL — isi dengan `fullName` jika tidak ada company name

### 10.2 Transaksi Database

- Semua operasi create user + create record + set roles **harus dalam satu transaksi** (`BEGIN` ... `COMMIT`/`ROLLBACK`)
- Pengiriman WA dilakukan **setelah** `COMMIT` — non-blocking, log error jika gagal

### 10.3 WhatsApp

- WA bersifat **fire-and-forget** — gagal kirim WA tidak gagalkan create user
- Response API selalu sertakan `waSent: bool` dan `waError: string|null`
- Jika `FONNTE_TOKEN` tidak ada dan tabel `whatsapp_config` kosong → `waSent: false` dengan waError yang informatif

### 10.4 Password Sementara

- Format: `Math.random().toString(36).slice(-10) + 'Aa1!'` (12 karakter)
- Selalu penuhi syarat: ada huruf besar, huruf kecil, angka, simbol
- **Tidak disimpan** di database — hanya muncul sekali di response API dan dikirim via WA

### 10.5 Migration 062

**File:** `sql/migrations/062_agent_status_branch_staff.sql`  
**Sudah diapply:** Ya (via psql langsung + terdaftar di `runMigrations.ts` sebagai `22_agent_status_branch_staff`)

**Menambahkan:**
- `agents.status TEXT CHECK (pending|active|suspended|inactive)` DEFAULT 'active'
- `profiles.jabatan TEXT`
- `profiles.joined_at DATE`
- Tabel `agent_invitation_tokens`

### 10.6 Route Order Issue

Express route `POST /api/branches/create` dan `POST /api/branches/reset-password` harus didaftarkan **sebelum** `GET/POST /api/branches/:id` agar tidak tertangkap sebagai `:id = 'create'`.  
→ Urutan yang aman: specific routes dulu, dynamic routes belakangan.

### 10.7 Branch Manager Role di JWT ✅

JWT sekarang menyertakan `branch_id` (untuk branch_manager) dan `agent_id` (untuk agen/sub-agen). Disuntikkan di `routes/auth.ts` saat login menggunakan `getBranchIdForRole` dan `getAgentByUserId` dari `auth.ts`.

`supabaseProxy.ts` membaca `branch_id` dari JWT dan otomatis menyaring data untuk tabel yang masuk `BRANCH_SCOPED_TABLES` (`bookings`, `agents`, `discount_requests`, `branch_commissions`).

---

## RINGKASAN STATUS PER SPRINT

| Sprint | Tema | Status |
|--------|------|--------|
| **Sprint 1** | Buat akun, kirim WA, reset password, detail cabang | ✅ **Selesai** |
| **Sprint 2** | JWT scoping, detail agen, suspend/aktifkan, sub-agen onboarding via link | ✅ **Selesai** |
| **Sprint 3 (batch 1)** | Branch data scoping, Performa agen, Export CSV, KPI cabang, Komisi cabang | ✅ **Selesai** |
| **Sprint 3 (batch 2)** | Override commission UI, sub-agen menu, master laporan komisi | 🔵 Berikutnya |

---

*Dokumen ini adalah sumber kebenaran tunggal untuk pengembangan sistem Agen, Cabang & Sub-Agen Vinstour Travel.*  
*Update dokumen ini setiap kali ada perubahan arsitektur atau sprint baru selesai.*
