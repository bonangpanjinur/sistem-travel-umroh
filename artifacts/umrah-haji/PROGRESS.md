# Progress Pengembangan Vinstour Travel Portal

## Status Keseluruhan

| Fase | Nama | Status | SQL Migration |
|------|------|--------|---------------|
| Fase 1 | Membership & Komisi Cabang | ✅ Kode Selesai | ⏳ Perlu dijalankan |
| Fase 2 | Website Publik Agen & Cabang + Atribusi | ✅ Kode Selesai | ⏳ Perlu dijalankan |
| Fase 3 | Portal Customer (Jamaah) | ✅ Kode Selesai | ⏳ Perlu dijalankan |

---

## SQL Migrations yang Perlu Dijalankan di Supabase

> **PENTING:** Jalankan SQL berikut di **Supabase SQL Editor** sesuai urutan:

### 1. Fase 1 — Membership & Komisi
File: `src/lib/migrations/fase1-membership-commissions.sql`

### 2. Fase 2 — Slug Agen & Cabang (Website Publik)
File: `src/lib/migrations/fase2-public-website.sql`

### 3. Fase 3 — Portal Customer
File: `src/lib/migrations/fase3-customer-portal.sql`

---

## Fase 1: Membership & Komisi Cabang

### Fitur yang Sudah Selesai (Kode)
- **AdminMemberships** (`/admin/memberships`) — kelola tier Silver/Gold/Platinum
- **AdminBranchCommissions** (`/admin/branch-commissions`) — lihat & kelola komisi cabang
- **AgentMembership** (`/agent/membership`) — halaman membership agen, benefits, upgrade
- **BranchManagerDashboard** — enhanced dengan stats komisi
- **AgentWebsiteSettings** — settings website agen (templates, sections, etc.)
- **Permissions.ts** — MEMBERSHIPS & BRANCH_COMMISSIONS permissions
- **admin-menu-registry.ts** — menu entries untuk Memberships & Komisi Cabang

### File Penting
- `src/pages/admin/AdminMemberships.tsx`
- `src/pages/admin/AdminBranchCommissions.tsx`  
- `src/pages/agent/AgentMembership.tsx`
- `src/pages/agent/AgentWebsiteSettings.tsx`
- `src/lib/permissions.ts`
- `src/lib/admin-menu-registry.ts`

---

## Fase 2: Website Publik Agen & Cabang + Atribusi Booking

### Fitur yang Sudah Selesai (Kode)

#### Attribution System (Baru)
- **`useAgentRef.ts`** — localStorage hook dengan TTL 30 hari
  - `saveAgentRef()` — simpan agentId/branchId ke localStorage
  - `getAgentRef()` — baca ref yang tersimpan
  - `clearAgentRef()` — hapus setelah konversi
  - `buildBookingUrlWithRef()` — build URL booking dengan agent ref
  - `useSaveAgentRef()` — React hook untuk auto-save saat halaman agen/cabang dibuka
- **`useCustomerAccount.ts`** — hook untuk customer_accounts table
  - `useCustomerAccount()` — query customer account
  - `useEnsureCustomerAccount()` — create/upsert dengan atribusi agen
  - `useCustomerBookings()` — booking history per customer
  - `useCustomerNotifications()` — notifikasi jamaah

#### Attribution Chain (Lengkap)
```
User kunjungi /a/{slug} atau /b/{slug}
    → AgentWebsite.tsx / BranchWebsite.tsx
    → useSaveAgentRef() simpan ke localStorage
    
User klik "Pesan Sekarang" di PackageBookingFormSimple
    → getAgentRef() baca dari localStorage
    → Tambah ?agent_id=... atau ?branch_id=... ke URL booking
    → Navigate ke /booking/{packageId}?agent_id=...&pic_source=agen
    
BookingWizard membaca params
    → picState.agentId = searchParams.get('agent_id')
    → picState.picSource = 'agen'
    
useBookingWizardDynamic.submitBooking()
    → INSERT INTO bookings SET agent_id = agentId
    → INSERT INTO bookings SET branch_id = branchId
```

#### Pages & Components
- **AgentWebsite.tsx** — updated: `useSaveAgentRef` dipanggil saat agen load
- **BranchWebsite.tsx** — updated: `useSaveAgentRef` dipanggil saat cabang load
- **PackageBookingFormSimple.tsx** — updated: include `agent_id`/`branch_id` di booking URL
- **Register.tsx** — updated: simpan customer_account dengan atribusi agen saat register
- **`AgentMyReferrals`** (`/agent/referrals`) — halaman agen: lihat semua booking via website agen
- **`AgentAttributionBadge`** — badge kecil di portal jamaah menampilkan nama agen/cabang
- **AgentLayoutEnhanced.tsx** — tambah nav "Referral & Booking"
- **AgentRoutes.tsx** — tambah route `/agent/referrals`

#### SQL Migration
File: `src/lib/migrations/fase2-public-website.sql`
- Kolom `slug` di `agents` dan `branches`
- `slugify_text()` function
- Auto-slug triggers untuk INSERT/UPDATE
- Backfill slug untuk data existing

---

## Fase 3: Portal Customer (Portal Jamaah)

### Fitur yang Sudah Ada (Sebelumnya)
- `/jamaah` — JamaahPortal (dashboard utama)
- `/jamaah/documents` — JamaahDocuments
- `/jamaah/itinerary` — JamaahItinerary
- `/jamaah/payments` — JamaahPaymentHistory
- `/jamaah/digital-id` — JamaahDigitalID
- `/jamaah/doa` — JamaahDoaPanduan
- `/jamaah/feedback` — JamaahFeedback
- `/customer` — CustomerDashboard, MyBookings, MySavings, MyLoyalty, PaymentUpload, CustomerSupport, CustomerSettings

### SQL Tables (Baru via Migration)
- **`customer_accounts`** — link user → customer + atribusi agen/cabang saat registrasi
- **`customer_notifications`** — notifikasi push ke jamaah
- **`booking_feedback`** — rating & review per booking
- Kolom `referral_source` di `bookings`
- Function `create_customer_account()`

---

## Cara Test Attribution System

1. Buka URL agen: `http://localhost:5173/a/{agent-slug}`
2. Pastikan ada paket → klik "Pesan Sekarang"
3. Cek URL booking → harus ada `?agent_id=...&pic_source=agen`
4. Lanjut booking → di step "Sumber Pendaftaran" harus sudah auto-select agen

---

## Next Steps (Fase Selanjutnya)

### Fase 4: Admin Analytics & Reporting
- Dashboard booking per agen/cabang dengan grafik
- Laporan komisi detail per periode
- Export PDF/Excel

### Fase 5: Notifikasi & Komunikasi
- WhatsApp integration via Fonnte/Wablas
- Email template otomatis (konfirmasi booking, invoice)
- Push notification ke jamaah

### Fase 6: Operational Excellence
- Manajemen visa & dokumen digital
- Tracking keberangkatan real-time
- SOS system improvement
