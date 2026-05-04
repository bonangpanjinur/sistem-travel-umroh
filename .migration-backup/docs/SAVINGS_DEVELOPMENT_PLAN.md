# Rencana Pengembangan Fitur Tabungan (Savings)

## Overview

Aplikasi tabungan umroh adalah fitur yang memungkinkan calon jamaaah untuk menabung secara bertahap menuju paket umroh pilihan mereka.

---

## Alur Sekarang (Existing)

### 1. Pembuatan Paket Tabungan (Admin)
- **Lokasi**: `src/pages/admin/AdminPackages.tsx`
- **Status**: Sudah ada - admin membuat paket dengan `package_type = 'tabungan'`
- **Field penting**:
  - `savings_target` - Target jumlah tabungan
  - `savings_min_monthly` - Minimal cicilan per bulan
  - `savings_max_months` - Maksimal tenor

### 2. Pemesanan Paket Tabungan (Customer)
- **Halaman**:
  - `/tabungan/paket` → Pilih paket tabungan
  - `/tabungan/daftar` → Isi formulir registrasi
  - `/tabungan/success` → Konfirmasi成功

---

## Alur yang Diinginkan (Proposed)

### 1. Pembuatan Paket Tabungan (Admin)

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN: AdminPackages.tsx                                   │
├─────────────────────────────────────────────────────────────┤
│  Step 1: Pilih "Tabungan" sebagai package_type             │
│  Step 2: Isi detail paket:                               │
│          - Nama paket                                    │
│          - Harga/Target tabungan (savings_target)         │
│          - Minimal cicilan/bulan (savings_min_monthly)     │
│          - Tenor maksimal (savings_max_months)             │
│          - Bonus/sharing jika tercapai                    │
│          - Upload banner/gambar                         │
│  Step 3: Preview dan Publish                            │
└─────────────────────────────────────────────────────────────┘
```

**Components yang diperlukan**:
- [x] AdminPackages.tsx - edit untuk tabungan
- [ ] TabunganForm.tsx - form khusus tabungan
- [ ] PackagePreview.tsx - preview paket

### 2. Pemesanan Paket Tabungan (Customer)

```
┌─────────────────────────────────────────────────────────────┐
│  CUSTOMER: Tabungan Journey                                │
├─────────────────────────────────────────────────────────────┤
│  Step 1: /tabungan/paket                                  │
│          - Lihat daftar paket tabungan                  │
│          - Bandingkan paket                             │
│          - Klik "Pilih Paket"                          │
│                                                         │
│  Step 2: /tabungan/daftar                             │
│          - Pilih tenor (6/9/12 bulan)                  │
│          - Pilih nominal cicilan/month                 │
│          - Isi data jamaaah                           │
│          - Upload KK/KTP                             │
│          - Pilih metode setor awal                    │
│                                                         │
│  Step 3: /tabungan/payment                            │
│          - Instructions setor awal                    │
│          - Upload bukti setor                        │
│          - Generate kode booking                     │
│                                                         │
│  Step 4: /tabungan/dashboard                          │
│          - Progress tabungan                          │
│          - Riwayat cicilan                            │
│          - Upload bukti cicilan                       │
│          - Notifikasi due date                       │
└─────────────────────────────────────────────────────────────┘
```

### 3. Manajemen Tabungan (Admin)

```
┌─────────────────────────────────────────────────────────────┐
│  ADMIN: AdminSavings.tsx (NEW)                             │
├─────────────────────────────────────────────────────────────┤
│  Tab 1: Rencana Tabungan                                │
│        - View semua savings_plans                        │
│        - Filter: status, paket, bulan                  │
│        - Search: nama customer                          │
│        - Actions: View, Convert ke Booking, Cancel      │
│                                                         │
│  Tab 2: Pembayaran Cicilan                             │
│        - View semua savings_payments                   │
│        - Actions: Verify, Reject                         │
│        - Bulk verify                                    │
│                                                         │
│  Tab 3: Laporan                                       │
│        - Total tabungan aktif                          │
│        - Total terkumpulkan                           │
│        - Rencana terkonversi ke berangkat             │
│        - Conversion rate                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Detail Fitur per Phase

### Phase 1: Pembuatan Paket Tabungan Admin

| Fitur | Deskripsi | Priority | Status |
|-------|----------|----------|--------|
| Form paket tabungan | Input field khusus tabungan | High | [x] Existing |
| Preview paket | Tampilan di halaman customer | High | [ ] Needed |
| Package image upload | Upload banner/gambar paket | Medium | [ ] Needed |
| Dynamic pricing | Harga berbeda per musim | Low | [ ] Later |

### Phase 2: Pendaftaran Customer

| Fitur | Deskripsi | Priority | Status |
|-------|----------|----------|--------|
| Select tenor | Pilih tenor 6/9/12 bulan | High | [x] Existing |
| Calculate cicilan | Kalkulasi cicilan/month | High | [x] Existing |
| Customer form | Data jamaaah + keluarga | High | [x] Existing |
| Document upload | Upload KK/KTP | Medium | [ ] Needed |
| Payment instruction | Cara pembayaran | High | [ ] Needed |
| Booking confirmation | Kode booking | High | [x] Existing |

### Phase 3: Dashboard Customer

| Fitur | Deskripsi | Priority | Status |
|-------|----------|----------|--------|
| Progress indicator | Visual progress bar | High | [ ] Needed |
| Payment history | List cicilan yang sudah dibayar | High | [ ] Needed |
| Upload proof | Upload bukti transfer | High | [ ] Needed |
| Reminder system | Notifikasi due date | Medium | [ ] Needed |
| Simulation | Kalkulasi profit | Low | [ ] Later |

### Phase 4: Verifikasi Admin

| Fitur | Deskripsi | Priority | Status |
|-------|----------|----------|--------|
| Payment verification | Verify/reject cicilan | High | [ ] Needed |
| Bulk actions | Verify multiple | Medium | [ ] Needed |
| Auto-verify | Via webhook bank | Low | [ ] Later |
| Convert to booking | Konversi ke booking umroh | High | [ ] Needed |

---

## Database Schema (Existing)

```sql
-- packages table (sudah ada)
CREATE TABLE public.packages (
  id UUID PRIMARY KEY,
  package_type VARCHAR(20) DEFAULT 'umroh', -- termasuk 'tabungan'
  name VARCHAR(255),
  savings_target NUMERIC,       -- Target tabungan
  savings_min_monthly NUMERIC,  -- Minimal cicilan/bulan
  savings_max_months INTEGER,   -- Tenor maksimal
  savings_bonus NUMERIC,    -- Bonus jika tercapai
  is_active BOOLEAN DEFAULT true,
  ...
);

-- savings_plans (sudah ada)
CREATE TABLE public.savings_plans (
  id UUID PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  package_id UUID REFERENCES packages(id),
  target_amount NUMERIC,
  monthly_amount NUMERIC,
  tenor_months INTEGER,
  paid_amount NUMERIC DEFAULT 0,
  status VARCHAR(20) CHECK (status IN ('active', 'completed', 'cancelled', 'converted')),
  ...
);

-- savings_payments (sudah ada)
CREATE TABLE public.savings_payments (
  id UUID PRIMARY KEY,
  savings_plan_id UUID REFERENCES savings_plans(id),
  payment_code VARCHAR(50),
  amount NUMERIC,
  status VARCHAR(20) CHECK (status IN ('pending', 'verified', 'rejected')),
  ...
);
```

---

## API Endpoints Needed

```typescript
// Customer
GET  /api/savings/packages        // List paket tabungan
POST /api/savings/plans         // Buat rencana tabungan
GET  /api/savings/plans/:id     // Detail rencana
POST /api/savings/payments     // Upload payment proof

// Admin
GET  /api/admin/savings/plans          // Semua rencana
PATCH /api/admin/savings/plans/:id    // Update status
GET  /api/admin/savings/payments      // Semua payments
PATCH /api/admin/savings/payments/:id // Verify/reject
POST /api/admin/savings/convert/:id   // Convert ke booking
```

---

## File Changes Required

### New Files
- `src/pages/admin/AdminSavings.tsx` - Admin management
- `src/pages/savings/SavingsDashboard.tsx` - Customer dashboard
- `src/pages/savings/SavingsPayment.tsx` - Payment page
- `src/components/savings/TabunganForm.tsx` - Tabungan form
- `src/components/savings/PaymentVerify.tsx` - Admin verification

### Modified Files
- `src/pages/admin/AdminPackages.tsx` - Add tabungan form fields
- `src/pages/savings/SavingsRegister.tsx` - Enhance registration
- `src/pages/savings/SavingsPackages.tsx` - Add preview modal
- `src/lib/api.ts` - Add savings API calls

### Edge Functions Needed
- `send-savings-reminder` - Kirim reminder cicilan
- `auto-verify-payment` - Auto verify via bank webhook
- `convert-savings-to-booking` - Konversi ke booking

---

## Timeline Estimation

| Phase | Fitur | Estimasi |
|-------|-------|---------|
| Phase 1 | Paket tabungan admin | 1-2 hari |
| Phase 2 | Pendaftaran | 1-2 hari |
| Phase 3 | Dashboard customer | 2-3 hari |
| Phase 4 | Verifikasi admin | 1-2 hari |
| **Total** | | **5-9 hari** |

---

## Acceptance Criteria

### Pembuatan Paket Tabungan
- [ ] Admin bisa membuat paket dengan type "tabungan"
- [ ] Admin bisa set savings_target, min monthly, tenor
- [ ] Paket tampil di halaman /tabungan/paket
- [ ] Customer bisa bandingkan paket

### Pendaftaran
- [ ] Customer bisa pilih paket dan tenor
- [ ] Sistem kalkulasi cicilan/month
- [ ] Customer isi data dengan benar
- [ ] Dapat booking confirmation

### Dashboard
- [ ] Customer melihat progress tabungan
- [ ] Customer bisa upload bukti cicilan
- [ ] Riwayat pembayaran terlihat
- [ ] Notifikasi due date

### Verifikasi Admin
- [ ] Admin melihat semua plans
- [ ] Admin bisa verify/reject payment
- [ ] Admin bisa convert ke booking
- [ ] Laporan tersedia