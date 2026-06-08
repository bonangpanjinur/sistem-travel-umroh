# Rencana Pengembangan: Sistem Agen, Cabang & SDM (Human Resources)

> **Terakhir diperbarui:** Juni 2026  
> **Scope:** Arsitektur lengkap, status implementasi, sprint plan, API, database, alur bisnis, dan rencana perbaikan SDM

---

## DAFTAR ISI

1. [Arsitektur & Hierarki](#1-arsitektur--hierarki)
2. [Database Schema](#2-database-schema)
3. [Status Implementasi Saat Ini — Agen & Cabang](#3-status-implementasi-saat-ini--agen--cabang)
4. [API Endpoints](#4-api-endpoints)
5. [Sprint Plan — Agen & Cabang](#5-sprint-plan--agen--cabang)
6. [Alur Bisnis & Onboarding](#6-alur-bisnis--onboarding)
7. [Sistem Komisi](#7-sistem-komisi)
8. [RBAC & Akses Kontrol](#8-rbac--akses-kontrol)
9. [Notifikasi & WhatsApp](#9-notifikasi--whatsapp)
10. [Catatan Teknis & Gotchas](#10-catatan-teknis--gotchas)
11. [🔴 Gap Analysis & Rencana Perbaikan — Agen & Cabang](#11-gap-analysis--rencana-perbaikan--agen--cabang)
12. [🟦 Analisis SDM — Status Implementasi](#12-analisis-sdm--status-implementasi)
13. [🔴 Gap Analysis & Rencana Pengembangan SDM](#13-gap-analysis--rencana-pengembangan-sdm)
14. [Sprint Plan SDM](#14-sprint-plan-sdm)

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
  name                 TEXT NOT NULL
  code                 TEXT NOT NULL UNIQUE
  address              TEXT
  city                 TEXT
  province             TEXT
  phone                TEXT
  email                TEXT
  manager_user_id      UUID REFERENCES auth.users(id) ON DELETE SET NULL
  is_active            BOOLEAN DEFAULT true
  slug                 TEXT UNIQUE
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
  parent_agent_id   UUID REFERENCES agents(id) ON DELETE SET NULL
  company_name      TEXT NOT NULL
  agent_code        TEXT NOT NULL UNIQUE
  contact_name      TEXT
  phone             TEXT
  email             TEXT
  address           TEXT
  commission_rate   NUMERIC(5,2) DEFAULT 0
  is_active         BOOLEAN DEFAULT true
  status            TEXT DEFAULT 'active'
                    CHECK (status IN ('pending','active','suspended','inactive'))
  slug              TEXT UNIQUE
  featured_package_ids JSONB DEFAULT '[]'
  website_bio       TEXT
  level             INTEGER DEFAULT 1
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
  used_at           TIMESTAMPTZ
  used_by_agent_id  UUID REFERENCES agents(id) ON DELETE SET NULL
  expires_at        TIMESTAMPTZ DEFAULT now() + INTERVAL '7 days'
  created_at        TIMESTAMPTZ DEFAULT now()
)
```

### 2.4 Tabel `user_roles`

```sql
user_roles (
  id         UUID PK DEFAULT gen_random_uuid()
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
  role       TEXT NOT NULL
  branch_id  UUID REFERENCES branches(id) ON DELETE SET NULL
  created_at TIMESTAMPTZ DEFAULT now()
  UNIQUE (user_id, role)
)
```

### 2.5 Tabel `branch_commissions`

```sql
branch_commissions (
  id                 UUID PK
  branch_id          UUID REFERENCES branches(id) ON DELETE CASCADE
  booking_id         UUID
  commission_amount  NUMERIC
  commission_rate    NUMERIC
  status             TEXT  -- pending|approved|paid|rejected
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
  booking_id          UUID
  agent_id            UUID REFERENCES agents(id)
  sub_agent_id        UUID REFERENCES agents(id)
  override_percentage NUMERIC
  override_amount     NUMERIC
  status              TEXT  -- pending|approved|paid
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
  bookings_target       INTEGER
  revenue_target        NUMERIC
  new_customers_target  INTEGER
  agents_booking_target INTEGER
  conversion_target     NUMERIC
  notes                 TEXT
  set_by                UUID
  created_at            TIMESTAMPTZ
  updated_at            TIMESTAMPTZ
)
```

### 2.8 Tabel `agent_monthly_targets`

```sql
agent_monthly_targets (
  id                UUID PK
  agent_id          UUID REFERENCES agents(id) ON DELETE CASCADE
  month_key         TEXT NOT NULL
  booking_target    INTEGER
  commission_target BIGINT
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

## 3. STATUS IMPLEMENTASI SAAT INI — AGEN & CABANG

### 3.1 Admin Panel (`/admin/*`)

#### Manajemen Cabang (`/admin/branches`)

| Status | Fitur | File | Catatan |
|--------|-------|------|---------|
| ✅ | CRUD cabang | `AdminBranches.tsx` | |
| ✅ | Buat akun branch manager saat tambah cabang | `AddBranchDialog.tsx` + `POST /api/branches/create` | |
| ✅ | Kirim kredensial manager via WhatsApp | `whatsapp.ts` | |
| ✅ | Tombol reset password manager | `ResetPasswordDialog.tsx` | |
| ✅ | Halaman detail cabang | `AdminBranchDetail.tsx` | |
| ✅ | Tab Info, Staff, Agent, Statistik | `AdminBranchDetail.tsx` | |
| ✅ | Pengaturan website cabang | `BranchWebsiteDialog` | |
| ✅ | Branch data scoping di API | `supabaseProxy.ts` | |
| ✅ | Laporan keuangan konsolidasi per cabang | Tab "Keuangan" di `AdminBranchDetail.tsx` | |
| ✅ | Bandingkan kinerja 2+ cabang | `AdminBranchComparison.tsx` | |

#### Manajemen Agen (`/admin/agents`)

| Status | Fitur | File | Catatan |
|--------|-------|------|---------|
| ✅ | Daftar agen + expand sub-agen | `AdminAgents.tsx` | |
| ✅ | Tambah agen: buat user + record + role + WA | `AddAgentDialog.tsx` | |
| ✅ | Filter: cabang, status, tier | `AdminAgents.tsx` | |
| ✅ | Approval komisi agen | `AdminAgentCommissionReport.tsx` | |
| ✅ | Tier komisi berdasarkan volume | `agent_commission_tiers` table | |
| ✅ | Detail agen 5 tab | `AdminAgentDetail.tsx` | |
| ✅ | Suspend / reaktivasi agen | `PATCH /api/agents/:id/status` | |
| ✅ | Override commission UI | `AdminAgentDetail.tsx` | |
| ✅ | Performance analitik per agen | Tab Performa | |
| ✅ | Export data agen CSV | `AdminAgents.tsx` | |
| ✅ | Master laporan komisi (agen+cabang+sub) | `AdminMasterKomisi.tsx` | |

### 3.2 Portal Cabang (`/cabang/*`)

| Status | Fitur | File |
|--------|-------|------|
| ✅ | Dashboard cabang (KPI real-time) | `BranchDashboard.tsx` |
| ✅ | Daftar booking scope cabang | `BranchBookings.tsx` |
| ✅ | Manajemen agen di cabang | `BranchAgen.tsx` |
| ✅ | Manajemen staff cabang | `BranchStaff.tsx` |
| ✅ | KPI targets bulanan | `BranchKPITargets.tsx` |
| ✅ | Persetujuan booking | `BranchApprovals.tsx` |
| ✅ | Diskon cabang | `BranchDiskon.tsx` |
| ✅ | Laporan cabang | `BranchLaporan.tsx` |
| ✅ | Pengaturan website cabang | `BranchWebsiteSettings.tsx` |
| ✅ | Notifikasi booking baru real-time | polling 30 detik + toast |
| ✅ | Komisi cabang real-time di dashboard | `branch_commissions` |

### 3.3 Portal Agen (`/agent/*`)

| Status | Fitur | File |
|--------|-------|------|
| ✅ | Dashboard (booking, komisi, leads stats) | `AgentDashboard.tsx` |
| ✅ | Jelajah & cari paket | `AgentPackages.tsx` |
| ✅ | Daftarkan jamaah (individual & grup) | `AgentRegister.tsx` / `AgentRegisterGroup.tsx` |
| ✅ | Daftar jamaah sendiri | `AgentJamaahEnhanced.tsx` |
| ✅ | Komisi & history pencairan | `AgentCommissions.tsx` |
| ✅ | Wallet & permintaan withdrawal | `AgentWallet.tsx` |
| ✅ | Jaringan sub-agen | `AgentNetwork.tsx` |
| ✅ | CRM leads pipeline | `AgentLeads.tsx` |
| ✅ | Broadcast WA massal ke leads | `AgentBroadcast.tsx` |
| ✅ | Link unik + landing page kustom | `AgentUniqueLink.tsx` |
| ✅ | Kit digital (materi promosi) | `AgentDigitalKit.tsx` |
| ✅ | Training modul + quiz | `AgentTraining.tsx` |
| ✅ | Membership tier (Silver/Gold/Platinum) | `AgentMembership.tsx` |
| ✅ | Referral & tracking | `AgentMyReferrals.tsx` |
| ✅ | Leaderboard & gamifikasi | `AgentLeaderboard.tsx` |
| ✅ | Target bulanan | `AgentTargets.tsx` |
| ✅ | Website agen (landing page kustom) | `AgentWebsiteSettings.tsx` |
| ✅ | Sub-agen: menu terbatas | `AgentLayoutEnhanced.tsx` |

---

## 4. API ENDPOINTS

### Sudah Ada

| Method | Endpoint | Fungsi |
|--------|----------|--------|
| `POST` | `/api/branches/create` | Buat cabang + akun manager + WA |
| `POST` | `/api/branches/:id/staff` | Tambah staff + buat akun + WA |
| `GET`  | `/api/branches/:id` | Detail cabang: info, manager, staff, agents |
| `POST` | `/api/branches/reset-password` | Reset password user |
| `GET`  | `/api/agents/:id` | Detail agen: info, jamaah, booking, komisi |
| `PATCH`| `/api/agents/:id/status` | Suspend / aktifkan |
| `POST` | `/api/agents/:id/reset-password` | Reset password agen |
| `POST` | `/api/agents/:id/approve` | Approve sub-agen |
| `POST` | `/api/agents/:id/reject` | Tolak sub-agen |
| `POST` | `/api/agents/invitation` | Generate token undangan |
| `GET`  | `/api/agents/invitation/:token` | Validasi token |
| `POST` | `/api/agents/invitation/register` | Daftar sub-agen via token |

---

## 5. SPRINT PLAN — AGEN & CABANG

### ✅ Sprint 1, 2, 3 — Selesai

| Sprint | Tema | Status |
|--------|------|--------|
| Sprint 1 | Buat akun, kirim WA, reset password, detail cabang | ✅ |
| Sprint 2 | JWT scoping, detail agen, suspend, sub-agen onboarding | ✅ |
| Sprint 3 (batch 1) | Branch data scoping, performa agen, export CSV, KPI cabang | ✅ |
| Sprint 3 (batch 2) | Override commission UI, sub-agen menu kustom, master laporan komisi | ✅ |

---

## 6. ALUR BISNIS & ONBOARDING

### 6.1 Admin Buat Cabang Baru

```
1. Admin → /admin/branches → Klik "Tambah Cabang"
2. Isi form: Nama, Kode, Kota, Provinsi, Alamat, Nama/Email/HP Manager
3. Backend: BEGIN → buat auth.users → profiles → user_roles (branch_manager)
            → insert branches → update user_roles.branch_id → COMMIT
4. Non-blocking: kirim WA kredensial ke HP manager
5. Manager login → kelola cabang
```

### 6.2 Admin Buat Agen Baru

```
1. Admin → /admin/agents → Klik "Tambah Agen"
2. Isi form: Nama, Email, HP, Perusahaan, Rate Komisi, Cabang (opsional)
3. Backend: generate agent_code → buat auth.users + profiles → insert agents
            → insert user_roles (agent) → COMMIT
4. Non-blocking: kirim WA kredensial
5. Dialog tampilkan: agent_code, email, tempPassword, status WA
```

### 6.3 Agen Undang Sub-Agen

```
1. Agen → /agent/network → Generate token (7 hari)
2. Link: /daftar-sub-agen?ref={agent_code}&token={token}
3. Calon sub-agen isi form → insert agents (status='pending')
4. Admin approve → buat auth.users → status='active' → kirim WA ke sub-agen + agen induk
```

---

## 7. SISTEM KOMISI

### 7.1 Komisi Agen
- Dihitung saat booking dikonfirmasi: `total_price × commission_rate / 100`
- Tier komisi otomatis berdasarkan volume (Bronze → Silver → Gold → Platinum)
- Status: pending → approved → paid (transfer manual)

### 7.2 Override Commission (Sub-Agen → Agen Induk)
- Agen induk dapat persentase dari komisi sub-agennya
- Tabel: `agent_override_commissions`
- Contoh: Sub-agen dapat Rp 1.000.000, override 20% → agen induk dapat Rp 200.000

### 7.3 Komisi Cabang
- Setiap booking dari agen cabang → cabang dapat komisi
- Entry di `branch_commissions` (saat ini masih manual — belum ada trigger otomatis)
- Admin pusat approve + bayar ke rekening cabang

### 7.4 Wallet Agen
- Saldo akumulasi komisi yang diapprove
- Request withdrawal → admin approve → transfer manual ke rekening bank

---

## 8. RBAC & AKSES KONTROL

### 8.1 Valid Roles

```
super_admin | owner | branch_manager | finance | operational | sales |
marketing | equipment | agent | sub_agent | customer | jamaah |
hr | admin | visa_officer | it
```

> **PENTING:** `admin` dan `staff` sudah **tidak valid** — gunakan `branch_manager` atau role spesifik.

### 8.2 Cara Kerja

```typescript
const canAccess = useCanAccess(PERMISSIONS.BRANCHES);
// Permission key → role_permissions table → user_roles table
```

---

## 9. NOTIFIKASI & WHATSAPP

### 9.1 Konfigurasi
- Token disimpan di `whatsapp_config` (bukan env var)
- Admin kelola di `/admin/whatsapp` → multi-provider (Fonnte/Wablas)

### 9.2 Template Aktif

| Trigger | Penerima |
|---------|----------|
| Buat akun baru (agen/manager/staff) | User baru |
| Sub-agen diapprove | Sub-agen + agen induk |
| Agen di-suspend | Agen |
| Komisi diapprove/dibayar | Agen |
| Booking baru via link agen | Agen (in-app polling) |

---

## 10. CATATAN TEKNIS & GOTCHAS

### 10.1 Struktur Tabel Agents
- Kolom nama adalah **`contact_name`** (bukan `full_name`)
- `company_name` wajib NOT NULL — isi dengan `fullName` jika tidak ada company
- Info bank belum ada di tabel `agents` — perlu tabel `agent_bank_accounts`

### 10.2 Transaksi Database
- Semua operasi create user + record + roles **harus dalam satu transaksi**
- WA dikirim **setelah** COMMIT — non-blocking, fire-and-forget

### 10.3 Password Sementara
- Format: `random 8 char + 'Aa1!'` — selalu memenuhi syarat kompleksitas
- **Tidak disimpan** di DB — hanya muncul sekali di response + WA

### 10.4 Route Order
- Specific routes (e.g. `/api/branches/create`) harus SEBELUM dynamic routes (`/api/branches/:id`)

### 10.5 JWT Claims
- JWT menyertakan `branch_id` (branch_manager) dan `agent_id` (agen/sub-agen)
- `supabaseProxy.ts` auto-filter data by `branch_id` untuk tabel scoped

---

## 11. GAP ANALYSIS & RENCANA PERBAIKAN — AGEN & CABANG

### 11.1 Gap yang Ditemukan

| # | Area | Gap | Prioritas |
|---|------|-----|-----------|
| G1 | Komisi Agen | Tidak ada integrasi payment gateway untuk pencairan otomatis — masih manual transfer | 🔴 P1 |
| G2 | Training Agen | Modul training ada tapi konten placeholder / embed YouTube saja, tidak ada sistem kurikulum terstruktur | 🟡 P2 |
| G3 | Verifikasi KTP Sub-Agen | KTP disimpan di field `notes`, tidak ada validasi/penyimpanan aman | 🟡 P2 |
| G4 | Transfer Antar Cabang | `AdminBookingTransfers.tsx` ada tapi rekonsiliasi keuangan antar cabang masih rudimentary | 🔴 P1 |
| G5 | Inventaris per Cabang | Equipment management ada, tapi stock opname per-cabang tidak terintegrasi penuh | 🟡 P2 |
| G6 | Harga Regional | Tidak ada harga khusus per cabang untuk paket yang sama | 🟢 P3 |
| G7 | Komisi Cabang Otomatis | Tidak ada trigger otomatis — entry `branch_commissions` masih manual | 🔴 P1 |
| G8 | Payout Agen Wallet | Approval manual — tidak ada konfirmasi transfer balik ke sistem | 🟡 P2 |
| G9 | Notifikasi Push (VAPID) | S3-12 belum selesai — push notif ke branch manager belum aktif | 🟡 P2 |

### 11.2 Rencana Perbaikan Agen & Cabang

#### Sprint A — Komisi & Keuangan Otomatis

| ID | Fitur | File Target | Estimasi |
|----|-------|-------------|----------|
| A-01 | Trigger otomatis insert `branch_commissions` saat booking confirmed | SQL migration | 1 hari |
| A-02 | Trigger otomatis insert `agent_commissions` saat booking confirmed | SQL migration | 1 hari |
| A-03 | UI konfirmasi bukti transfer untuk payout wallet agen | `AgentWallet.tsx` + `AdminAgentDetail.tsx` | 2 hari |
| A-04 | Rekonsiliasi keuangan transfer booking antar cabang | `AdminBookingTransfers.tsx` + API | 3 hari |

**SQL Trigger yang Perlu Dibuat:**
```sql
-- Auto-create agent_commissions saat booking confirmed
CREATE OR REPLACE FUNCTION auto_create_agent_commission()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.booking_status = 'confirmed' AND OLD.booking_status != 'confirmed' THEN
    INSERT INTO agent_commissions (booking_id, agent_id, commission_amount, status)
    SELECT NEW.id, b.agent_id,
           NEW.total_price * a.commission_rate / 100,
           'pending'
    FROM bookings b JOIN agents a ON a.id = b.agent_id
    WHERE b.id = NEW.id AND b.agent_id IS NOT NULL
    ON CONFLICT DO NOTHING;

    -- Komisi cabang
    INSERT INTO branch_commissions (booking_id, branch_id, commission_amount, status)
    SELECT NEW.id, br.id,
           NEW.total_price * 0.02,  -- 2% default rate — konfigurasikan per cabang
           'pending'
    FROM bookings bk
    JOIN agents ag ON ag.id = bk.agent_id
    JOIN branches br ON br.id = ag.branch_id
    WHERE bk.id = NEW.id AND ag.branch_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_commission
  AFTER UPDATE OF booking_status ON bookings
  FOR EACH ROW EXECUTE FUNCTION auto_create_agent_commission();
```

#### Sprint B — Training Agen Terstruktur

| ID | Fitur | File Target | Estimasi |
|----|-------|-------------|----------|
| B-01 | Kurikulum training bertahap (Level 1 → 2 → 3) dengan lock per level | `AdminTraining.tsx` + DB | 3 hari |
| B-02 | Quiz wajib sebelum unlock materi berikutnya | `AgentTraining.tsx` | 2 hari |
| B-03 | Sertifikat digital otomatis setelah lulus semua modul | PDF gen via `pdfkit` | 2 hari |
| B-04 | Dashboard progres training per agen di admin | `AdminAgentDetail.tsx` | 1 hari |

**Schema Baru:**
```sql
ALTER TABLE training_modules
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS prerequisite_module_id UUID REFERENCES training_modules(id),
  ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'agent'; -- 'agent'|'staff'|'all'

CREATE TABLE IF NOT EXISTS training_certificates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  agent_id    UUID REFERENCES agents(id),
  issued_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  cert_url    TEXT,
  modules_completed INT NOT NULL DEFAULT 0
);
```

#### Sprint C — Verifikasi & Keamanan Sub-Agen

| ID | Fitur | File Target | Estimasi |
|----|-------|-------------|----------|
| C-01 | Upload KTP ke object storage (Supabase Storage / S3) saat daftar sub-agen | `DaftarSubAgen.tsx` + API | 2 hari |
| C-02 | Admin preview KTP sebelum approve sub-agen | `AdminAgentDetail.tsx` | 1 hari |
| C-03 | Field `ktp_url` + `ktp_verified_at` di tabel `agents` | SQL migration | 0.5 hari |

#### Sprint D — Push Notifikasi (S3-12 Penyelesaian)

| ID | Fitur | File Target | Estimasi |
|----|-------|-------------|----------|
| D-01 | Setup VAPID keys + service worker | `public/sw.js` | 1 hari |
| D-02 | Subscribe push notif di login (branch manager + agen) | `useAuth.tsx` | 1 hari |
| D-03 | API trigger push saat booking baru | `bookings.ts` route | 1 hari |

---

## 12. ANALISIS SDM — STATUS IMPLEMENTASI

### 12.1 Fitur SDM yang Sudah Ada

#### Core HR (`/admin/hr`)

| Status | Fitur | File |
|--------|-------|------|
| ✅ | CRUD karyawan (nama, jabatan, departemen, gaji, tanggal masuk) | `AdminHR.tsx` |
| ✅ | Manajemen departemen & jabatan | `AdminHR.tsx` |
| ✅ | Link user `profiles` ke record karyawan | `AdminHR.tsx` |
| ✅ | Pengajuan & approval cuti karyawan | `leave_requests` table |
| ✅ | Surat cuti (cetak via PDF) | dokumen generator |
| ✅ | Evaluasi kinerja periodik (scoring: kualitas, produktivitas, inisiatif, teamwork, absensi) | `AdminHR.tsx` |
| ✅ | Manajemen perangkat karyawan | `employee_devices` table |
| ✅ | Tab Absensi dalam HR | `AdminHR.tsx` |

#### Payroll (`/admin/hr/payroll`)

| Status | Fitur | File |
|--------|-------|------|
| ✅ | Kalkulasi payroll bulanan (gaji pokok + kehadiran + keterlambatan) | `AdminPayroll.tsx` |
| ✅ | Kalkulasi PPh 21 (UU HPP 2022, PTKP status TK/K) | `AdminPayroll.tsx` |
| ✅ | Kalkulasi BPJS (Kesehatan, JHT, JP, JKK, JKM) — porsi karyawan + perusahaan | `AdminPayroll.tsx` |
| ✅ | Cetak slip gaji PDF | `AdminPayroll.tsx` + `jspdf` |
| ✅ | Export laporan payroll bulanan | `AdminPayroll.tsx` |

#### Absensi

| Status | Fitur | File |
|--------|-------|------|
| ✅ | Absensi harian staf kantor | dalam modul HR |
| ✅ | Absensi operasional Tanah Suci (QR/barcode scan + manual bulk) | `AdminAbsensiDigital.tsx` |
| ✅ | Real-time tracking GPS field staff (Muthawif/Tour Leader) | terintegrasi |
| ✅ | Absensi khusus: sholat, ziarah, manasik | `AdminAbsensiDigital.tsx` |

#### Training

| Status | Fitur | File |
|--------|-------|------|
| ✅ | CRUD modul training (video YouTube, PDF, Markdown) | `AdminTraining.tsx` |
| ✅ | Tracking progres per agen | `agent_training_progress` table |
| ✅ | Modul wajib (mandatory flag) | `AdminTraining.tsx` |
| ✅ | Skor kuis per modul | `AgentTraining.tsx` |

### 12.2 Fitur SDM yang BELUM Ada / Belum Selesai

| # | Area | Keterangan |
|---|------|------------|
| M1 | **Training Staf Internal** | Modul training hanya untuk agen — tidak ada kurikulum onboarding staf kantor/cabang |
| M2 | **Rekrutmen / ATS** | Tidak ada: job posting, form lamaran, tracking pelamar, jadwal interview |
| M3 | **Employee Self-Service (ESS)** | Tidak ada portal mandiri untuk staf: lihat slip gaji, ajukan cuti, lihat jadwal |
| M4 | **Bonus & Komponen Payroll Dinamis** | Tidak ada: bonus kinerja, komisi sales terintegrasi, tunjangan variabel |
| M5 | **Surat Peringatan (SP) / Sanksi** | Tidak ada modul disiplin karyawan: SP1, SP2, SP3, PHK |
| M6 | **Riwayat Karir / Promosi** | Tidak ada: history jabatan, mutasi cabang, kenaikan gaji terstruktur |
| M7 | **Jadwal Kerja / Shift** | Tidak ada manajemen shift kerja — hanya absensi hadir/tidak |
| M8 | **Kontrak Karyawan** | Tidak ada manajemen kontrak: PKWT/PKWTT, masa percobaan, perpanjangan |
| M9 | **Dashboard Analitik SDM** | Tidak ada: turnover rate, headcount trend, cost of HR per cabang |
| M10 | **Multi-Currency Payroll** | Tidak ada dukungan payroll untuk staf berbasis di Saudi Arabia (SAR) |

---

## 13. GAP ANALYSIS & RENCANA PENGEMBANGAN SDM

### 13.1 Prioritas Pengembangan SDM

```
🔴 P1 (Kritis — langsung dibutuhkan operasional)
  - Training staf internal (onboarding)
  - Employee Self-Service (ESS) portal
  - Bonus & komponen payroll dinamis

🟡 P2 (Penting — dalam 1-3 bulan)
  - Surat Peringatan (SP) & sanksi
  - Manajemen kontrak karyawan
  - Riwayat karir & promosi

🟢 P3 (Jangka menengah — 3-6 bulan)
  - Rekrutmen / ATS
  - Jadwal kerja & shift
  - Dashboard analitik SDM
  - Multi-currency payroll
```

### 13.2 Rencana Detail per Fitur

---

#### SDM-01: Training Staf Internal

**Deskripsi:** Pisahkan modul training antara "untuk agen" dan "untuk staf internal". Tambahkan kurikulum onboarding wajib untuk karyawan baru per jabatan.

**Schema Baru:**
```sql
ALTER TABLE training_modules
  ADD COLUMN IF NOT EXISTS target_audience TEXT DEFAULT 'agent'
    CHECK (target_audience IN ('agent','staff','all'));

-- Progress staf internal
CREATE TABLE IF NOT EXISTS staff_training_progress (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id  UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  module_id    UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','completed')),
  score        INTEGER,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, module_id)
);
```

**Halaman Baru:**
- `/admin/hr/training` — Admin assign modul per jabatan/departemen
- `/staff/training` (ESS) — Staf akses modul yang diwajibkan

**Estimasi:** 3 hari

---

#### SDM-02: Employee Self-Service (ESS)

**Deskripsi:** Portal mandiri untuk karyawan — tanpa perlu minta ke admin untuk info dasar.

**Fitur ESS:**
- Lihat slip gaji bulan ini & history 12 bulan
- Ajukan cuti online (form + status approval)
- Lihat saldo cuti tersisa
- Update profil (no HP, alamat, nomor darurat)
- Akses modul training yang diwajibkan

**Halaman Baru:**
```
/staff/dashboard       — Ringkasan: slip gaji terbaru, saldo cuti, modul pending
/staff/payslips        — List & download slip gaji
/staff/leave           — Ajukan cuti + riwayat + status
/staff/training        — Modul training wajib
/staff/profile         — Edit profil mandiri
```

**Route tambahan di API:**
```
GET  /api/hr/staff/me                 — Data karyawan dari JWT
GET  /api/hr/staff/me/payslips        — Slip gaji sendiri
POST /api/hr/staff/me/leave-request   — Ajukan cuti
GET  /api/hr/staff/me/leave-balance   — Saldo cuti
```

**Estimasi:** 5 hari

---

#### SDM-03: Komponen Payroll Dinamis (Bonus & Tunjangan Variabel)

**Deskripsi:** Tambah komponen pendapatan dan potongan yang bisa dikonfigurasi per bulan per karyawan — tidak hanya gaji pokok + BPJS + PPh.

**Schema Baru:**
```sql
CREATE TABLE IF NOT EXISTS payroll_components (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,           -- "Bonus Ramadan", "Tunjangan Transport"
  type         TEXT NOT NULL            -- 'allowance'|'bonus'|'deduction'
    CHECK (type IN ('allowance','bonus','deduction')),
  is_taxable   BOOLEAN NOT NULL DEFAULT TRUE,
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_employee_components (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id  UUID NOT NULL REFERENCES payroll_runs(id) ON DELETE CASCADE,
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  component_id    UUID NOT NULL REFERENCES payroll_components(id),
  amount          NUMERIC NOT NULL DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**UI Baru:**
- Tambah tab "Komponen" di `AdminPayroll.tsx` — input bonus/tunjangan per karyawan per run payroll
- Komponen otomatis masuk kalkulasi PPh 21 jika `is_taxable = true`

**Estimasi:** 3 hari

---

#### SDM-04: Surat Peringatan (SP) & Manajemen Disiplin

**Deskripsi:** Modul untuk mendokumentasikan pelanggaran dan sanksi secara formal.

**Schema Baru:**
```sql
CREATE TABLE IF NOT EXISTS disciplinary_records (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type           TEXT NOT NULL
    CHECK (type IN ('sp1','sp2','sp3','phk','warning','memo')),
  violation_date DATE NOT NULL,
  description    TEXT NOT NULL,
  action_taken   TEXT,
  issued_by      UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMPTZ,  -- karyawan tanda tangan digital
  document_url   TEXT,          -- PDF surat
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**UI Baru:**
- Tab "Disiplin" di halaman detail karyawan
- Form tambah SP (pilih tipe, tanggal, deskripsi, upload bukti)
- Generate PDF surat peringatan otomatis
- Timeline riwayat SP per karyawan

**Estimasi:** 2 hari

---

#### SDM-05: Riwayat Karir & Promosi

**Deskripsi:** Catat setiap perubahan jabatan, departemen, cabang, atau gaji secara historis.

**Schema Baru:**
```sql
CREATE TABLE IF NOT EXISTS career_history (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  effective_date DATE NOT NULL,
  change_type    TEXT NOT NULL
    CHECK (change_type IN ('hire','promotion','demotion','transfer','salary_change','resign','terminate')),
  old_position   TEXT,
  new_position   TEXT,
  old_department TEXT,
  new_department TEXT,
  old_branch_id  UUID REFERENCES branches(id),
  new_branch_id  UUID REFERENCES branches(id),
  old_salary     NUMERIC,
  new_salary     NUMERIC,
  notes          TEXT,
  approved_by    UUID REFERENCES auth.users(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**UI Baru:**
- Tab "Riwayat Karir" di detail karyawan
- Form mutasi/promosi (pilih perubahan, efektif tanggal)
- Timeline visual riwayat per karyawan

**Estimasi:** 2 hari

---

#### SDM-06: Manajemen Kontrak Karyawan

**Deskripsi:** Catat dan pantau kontrak kerja: PKWT/PKWTT, masa probasi, perpanjangan.

**Schema Baru:**
```sql
CREATE TABLE IF NOT EXISTS employee_contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id     UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  contract_type   TEXT NOT NULL
    CHECK (contract_type IN ('pkwtt','pkwt','probation','freelance')),
  start_date      DATE NOT NULL,
  end_date        DATE,              -- NULL = PKWTT (tidak terbatas)
  probation_end   DATE,
  document_url    TEXT,
  status          TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active','expired','terminated','renewed')),
  reminder_sent   BOOLEAN DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Fitur Otomatis:**
- Alert H-30 sebelum kontrak berakhir (cron job)
- Notifikasi WA ke HRD + Branch Manager

**Estimasi:** 2 hari

---

#### SDM-07: Rekrutmen / ATS (Applicant Tracking System)

**Deskripsi:** Sistem lowongan pekerjaan dan tracking pelamar dari lamaran hingga onboarding.

**Schema Baru:**
```sql
CREATE TABLE IF NOT EXISTS job_postings (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  department   TEXT,
  branch_id    UUID REFERENCES branches(id),
  description  TEXT,
  requirements TEXT,
  salary_min   NUMERIC,
  salary_max   NUMERIC,
  status       TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','open','closed','filled')),
  deadline     DATE,
  created_by   UUID REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_applicants (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_posting_id UUID NOT NULL REFERENCES job_postings(id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL,
  email          TEXT NOT NULL,
  phone          TEXT,
  cv_url         TEXT,
  cover_letter   TEXT,
  status         TEXT NOT NULL DEFAULT 'applied'
    CHECK (status IN ('applied','screening','interview','offered','hired','rejected')),
  interview_date TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Halaman Baru:**
- `/admin/hr/recruitment` — Daftar lowongan + daftar pelamar
- Kanban board per lowongan: Applied → Screening → Interview → Offered → Hired

**Estimasi:** 4 hari

---

#### SDM-08: Dashboard Analitik SDM

**Deskripsi:** Halaman ringkasan metrik SDM untuk manajemen.

**Metrik yang Ditampilkan:**
- Headcount per departemen / cabang (chart donut)
- Turnover rate bulanan (karyawan resign / total karyawan)
- Distribusi jabatan (treemap)
- Biaya payroll per bulan (area chart 12 bulan)
- Karyawan masa percobaan yang akan habis
- Status kontrak yang mendekati kadaluarsa
- Saldo cuti rata-rata per departemen

**Halaman Baru:** `/admin/hr/analytics`  
**Estimasi:** 3 hari

---

## 14. SPRINT PLAN SDM

### Sprint SDM-1 — Quick Wins (Minggu 1-2)

| ID | Fitur | Estimasi | Prioritas |
|----|-------|----------|-----------|
| SDM-1-01 | Komponen payroll dinamis (bonus/tunjangan) | 3 hari | 🔴 |
| SDM-1-02 | Training staf internal (target_audience + progress table) | 3 hari | 🔴 |
| SDM-1-03 | Surat Peringatan (SP) — DB + UI tab karyawan + PDF | 2 hari | 🟡 |
| SDM-1-04 | Riwayat karir & promosi — DB + UI timeline | 2 hari | 🟡 |

### Sprint SDM-2 — Self-Service & Kontrak (Minggu 3-4)

| ID | Fitur | Estimasi | Prioritas |
|----|-------|----------|-----------|
| SDM-2-01 | Employee Self-Service portal (`/staff/*`) | 5 hari | 🔴 |
| SDM-2-02 | Manajemen kontrak + alert H-30 | 2 hari | 🟡 |
| SDM-2-03 | Dashboard analitik SDM | 3 hari | 🟡 |

### Sprint SDM-3 — Rekrutmen & Lanjutan (Bulan 2)

| ID | Fitur | Estimasi | Prioritas |
|----|-------|----------|-----------|
| SDM-3-01 | ATS (job postings + applicants + kanban) | 4 hari | 🟢 |
| SDM-3-02 | Manajemen shift kerja | 3 hari | 🟢 |
| SDM-3-03 | Multi-currency payroll (IDR + SAR) | 3 hari | 🟢 |

### Ringkasan Total Estimasi SDM

| Sprint | Estimasi | Prioritas |
|--------|----------|-----------|
| Sprint SDM-1 | ~10 hari | 🔴 Kritis |
| Sprint SDM-2 | ~10 hari | 🔴🟡 |
| Sprint SDM-3 | ~10 hari | 🟢 |
| **Total** | **~30 hari kerja** | |

---

## RINGKASAN STATUS KESELURUHAN

| Modul | Status | Sprint Berikutnya |
|-------|--------|-------------------|
| Manajemen Cabang | ✅ Core selesai | Sprint A: trigger komisi otomatis |
| Manajemen Agen | ✅ Core selesai | Sprint B: training terstruktur |
| Portal Cabang | ✅ Selesai | Sprint D: push notifikasi |
| Portal Agen | ✅ Selesai | Sprint C: verifikasi KTP |
| SDM Core (HR, Payroll, Absensi) | ✅ Core selesai | Sprint SDM-1: bonus + SP + karir |
| Training SDM | ✅ Selesai (target_audience + staff progress) | — |
| ESS (Employee Self-Service) | ✅ Selesai (7 halaman + route) | — |
| Rekrutmen / ATS | ✅ Selesai (AdminRecruitment.tsx) | — |

---

*Dokumen ini adalah sumber kebenaran tunggal untuk pengembangan sistem Agen, Cabang & SDM Vinstour Travel.*  
*Update dokumen setiap kali ada perubahan arsitektur atau sprint baru selesai.*
