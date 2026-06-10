# Rencana Perbaikan & Pengembangan Modul Keuangan
> Vinstour Travel — Umroh & Haji Management Portal
> Terakhir diperbarui: Juni 2026

---

## Status Implementasi Saat Ini

### ✅ Fitur Akuntansi Dasar (K-01 s/d K-13) — Semua SELESAI

| K-# | Fitur | Route | File | Status |
|-----|-------|-------|------|--------|
| K-01 | Jurnal Umum | `/admin/finance/jurnal` | AdminJurnalUmum.tsx | ✅ DONE |
| K-02 | Buku Besar | `/admin/finance/buku-besar` | AdminBukuBesar.tsx | ✅ DONE |
| K-03 | Neraca Saldo | `/admin/finance/neraca-saldo` | AdminNeracaSaldo.tsx | ✅ DONE |
| K-04 | Laba Rugi Formal | `/admin/finance/laba-rugi` | AdminLabaRugi.tsx | ✅ DONE |
| K-05 | Neraca (Balance Sheet) | `/admin/finance/neraca` | AdminNeraca.tsx | ✅ DONE |
| K-06 | Arus Kas | `/admin/finance/arus-kas` | AdminArusKas.tsx | ✅ DONE |
| K-07 | AR Aging Analysis | `/admin/finance/ar` | AdminFinanceAR.tsx | ✅ DONE |
| K-08 | AP Kalender Jatuh Tempo | `/admin/finance/ap` | AdminFinanceAP.tsx | ✅ DONE |
| K-09 | Kas Proyeksi 30 Hari | `/admin/finance-cash` | AdminFinanceCash.tsx | ✅ DONE |
| K-10 | COA Integrasi Transaksi | — | `40_accounting_tables.sql` + `41_auto_journal_triggers.sql` | ✅ DONE |
| K-11 | Budget vs Aktual | `/admin/finance/budget` | AdminBudget.tsx | ✅ DONE |
| K-12 | Rekonsiliasi Bank | `/admin/finance/rekonsiliasi` | AdminRekonsiliasi.tsx | ✅ DONE |
| K-13 | Laporan Pajak | `/admin/finance/laporan-pajak` | AdminLaporanPajak.tsx | ✅ DONE |

### ✅ Infrastruktur Tabel Keuangan — Ada

| Tabel | Migration | Keterangan |
|-------|-----------|-----------|
| `journal_entries` + `journal_entry_lines` | 40_accounting_tables.sql | Double-entry accounting |
| `departure_cost_items` | 054_fase28_package_financials.sql | HPP per item per keberangkatan |
| `departure_expenses` | 054_fase28_package_financials.sql | Realisasi biaya operasional per keberangkatan |
| `departure_budgets` | 019_fase17_remaining_tables.sql | Budget per kategori per keberangkatan |
| `finance_budgets` | (K-11) | Budget tahunan/bulanan berbasis COA |
| `vendor_costs` | 001_foundation.sql | Biaya vendor/hutang dagang (AP) |
| `cash_transactions` | 001_foundation.sql | Kas masuk/keluar operasional kantor |
| `expenses` | 018_fase16_new_tables.sql | Pengeluaran umum kantor per cabang |
| `payroll_records` | 012_hr_enhancements.sql | Data penggajian karyawan |
| `payroll_slips` | 070_payroll_slips_ess.sql | Slip gaji bulanan |
| `payroll_components` + `employee_payroll_components` | 071_onboarding_and_payroll_components.sql | Komponen gaji fleksibel |
| `bank_reconciliations` + `reconciliation_items` | (K-12) | Rekonsiliasi bank |
| `v_financial_summary` | 042_v_financial_summary_view.sql | VIEW ringkasan keuangan per keberangkatan |

---

## ⚠️ GAP ANALYSIS — Integrasi yang Belum Terhubung

> Hasil audit Juni 2026: K-01 s/d K-13 selesai secara UI, namun **integrasi data antar modul** masih banyak yang terputus. Laporan keuangan formal (Laba Rugi, Arus Kas, Neraca) menggunakan data yang **tidak lengkap** karena tidak semua sumber biaya terhubung.

---

### GAP-01 🔴 KRITIS: departure_cost_items TIDAK masuk v_financial_summary & AdminFinancePL

**Masalah:**
- Tabel `departure_cost_items` adalah HPP terperinci per keberangkatan (airline, hotel, visa, transport, handling, equipment, dll) — sudah diisi admin via DepartureBudgetTab
- Namun `v_financial_summary` VIEW (migration 042) **hanya** menggunakan `vendor_costs`, bukan `departure_cost_items`
- `AdminFinancePL.tsx` (P&L per Keberangkatan) juga **hanya** query `vendor_costs`
- Artinya: perencanaan HPP yang detail tidak pernah muncul di laporan keuangan manapun

**Dampak:** Laporan P&L per keberangkatan tidak akurat — HPP riil tidak terhitung

**Fix yang Diperlukan:**
```sql
-- Update v_financial_summary untuk include departure_cost_items
-- departure_cost_items.total_cost_idr = HPP planned
-- departure_expenses.amount_idr = HPP realisasi
```

---

### GAP-02 🔴 KRITIS: departure_expenses TIDAK terhubung ke laporan keuangan apapun

**Masalah:**
- Tabel `departure_expenses` = realisasi pengeluaran operasional per keberangkatan (tiket, hotel, transport, visa, guide, meals, tips, dll)
- `AdminLabaRugi.tsx` query: `payments` + `vendor_costs` + `cash_transactions` — **tidak query `departure_expenses`**
- `AdminArusKas.tsx` query: `payments` + `vendor_costs` + `cash_transactions` — **tidak query `departure_expenses`**
- `AdminFinancePL.tsx` — **tidak query `departure_expenses`**
- `v_financial_summary` — **tidak join `departure_expenses`**

**Dampak:** Biaya operasional perjalanan yang sudah terjadi (realisasi lapangan) tidak tampil di P&L maupun Arus Kas

---

### GAP-03 🔴 KRITIS: departure_budgets ↔ finance_budgets = Dua Sistem Terputus

**Masalah:**
- `departure_budgets`: budget per keberangkatan, per kategori (hotel/tiket/visa/katering/transportasi/handling/manasik/perlengkapan)
- `finance_budgets`: budget tahunan/bulanan berbasis COA account_code — digunakan `AdminBudget.tsx`
- **Tidak ada relasi atau konsolidasi antara keduanya**
- AdminBudget tidak tahu berapa total departure_budgets bulan ini
- Departure detail tidak tahu posisi budget kantor secara keseluruhan

**Dampak:** Budget vs Aktual di AdminBudget tidak mencerminkan biaya keberangkatan yang direncanakan

---

### GAP-04 🟠 PENTING: Payroll → Laporan Keuangan Formal

**Masalah:**
- `AdminPayroll.tsx` sudah menghitung gaji, PPh21, BPJS lengkap
- `payroll_records` dan `payroll_slips` menyimpan data penggajian
- Namun `AdminLabaRugi.tsx` tidak query `payroll_records` — hanya mengandalkan `cash_transactions` dengan kategori "salary"
- Ini artinya: biaya gaji hanya masuk Laba Rugi jika admin **secara manual** membuat cash_transaction kategori "salary" setelah payroll diproses
- `AdminLaporanPajak.tsx` (K-13) seharusnya pull PPh21 dari `payroll_records`, tapi belum diverifikasi integrasinya

**Dampak:** Biaya SDM tidak otomatis masuk ke Laba Rugi; laporan pajak PPh21 mungkin tidak akurat

---

### GAP-05 🟠 PENTING: Hotel Kontrak → AP (Vendor Cost) Tidak Otomatis

**Masalah:**
- `AdminHotelContracts.tsx` mengelola kontrak hotel (tarif, periode, kapasitas)
- Saat kontrak hotel ditandatangani/digunakan untuk keberangkatan, **tidak otomatis membuat vendor_cost**
- Admin harus manual input vendor_cost setiap kali hotel perlu dibayar
- Tidak ada link antara `hotel_contracts.room_type_rates` dan `departure_cost_items.hotel_id`

**Dampak:** Biaya hotel tidak tertrack di AP secara konsisten; risiko lupa input

---

### GAP-06 🟠 PENTING: Visa Management → AP (Vendor Cost) Tidak Otomatis

**Masalah:**
- `AdminVisaManagement.tsx` track status visa per jamaah (submitted/approved/rejected)
- Biaya visa per jamaah tidak otomatis membuat `vendor_cost` atau `departure_cost_items`
- Admin harus manual input biaya visa

**Dampak:** Biaya visa tidak tertrack di AP; underreporting biaya keberangkatan

---

### GAP-07 🟡 SEDANG: Equipment Costs → departure_cost_items Belum Otomatis

**Masalah:**
- `equipment_items.unit_cost` ada tapi tidak otomatis masuk `departure_cost_items`
- `EquipmentRealizationTab` CAN insert ke `departure_cost_items` tapi masih manual
- Tidak ada perhitungan: `unit_cost × jumlah_jamaah × jenis_paket` → auto HPP perlengkapan

**Dampak:** Biaya perlengkapan sering tidak tercatat di HPP keberangkatan

---

### GAP-08 🟡 SEDANG: AdminFinancePL Tidak Menampilkan HPP Plan vs Realisasi

**Masalah:**
- AdminFinancePL (P&L per keberangkatan) hanya query `vendor_costs`
- Tidak ada kolom: HPP Direncanakan (dari departure_cost_items) vs HPP Realisasi (departure_expenses + vendor_costs)
- Tidak ada varian/selisih antara planning dan realisasi per kategori

**Dampak:** Tidak bisa tahu apakah biaya keberangkatan over/under budget per item

---

### GAP-09 🟡 SEDANG: v_financial_summary VIEW — Data Tidak Lengkap

**Masalah:**
Current VIEW:
```sql
-- Hanya menggunakan vendor_costs, bukan departure_cost_items atau departure_expenses
COALESCE(SUM(vc.amount), 0) AS total_vendor_costs
```

Seharusnya:
```sql
-- HPP planned dari departure_cost_items
COALESCE(SUM(dci.total_cost_idr), 0) AS hpp_planned,
-- Realisasi dari departure_expenses  
COALESCE(SUM(de.amount_idr), 0) AS hpp_realized,
-- Vendor costs (AP yang sudah dibuat)
COALESCE(SUM(vc.amount), 0) AS total_ap_vendor,
```

**Dampak:** AdminAdvancedReports menampilkan data cost yang tidak akurat

---

### GAP-10 🟡 SEDANG: Tidak Ada Working Capital / Cash Timing per Keberangkatan

**Masalah:**
- Tidak ada analisis: kapan jamaah bayar vs kapan perusahaan bayar vendor
- Gap waktu antara penerimaan DP → pelunasan → pembayaran hotel/airline/visa tidak divisualisasikan
- Risk kas negatif per keberangkatan tidak terdeteksi dini

**Dampak:** Risiko cashflow tidak termonitor per keberangkatan

---

### GAP-11 🟢 MINOR: AR Reminder Masih Manual

**Masalah:**
- AdminFinanceAR ada tombol "Kirim Reminder" tapi masih klik manual per jamaah
- Tidak ada cron job untuk auto-reminder H-7, H-3, H+0 (overdue)
- Backend sudah punya cron infrastructure (cicilan+payment @08:00 WIB)

---

### GAP-12 🟢 MINOR: AdminPackageProfitabilityComparison Belum Pakai departure_cost_items

**Masalah:**
- `AdminPackageProfitabilityComparison.tsx` query `departure_cost_items` tapi perbandingan antar paket belum memasukkan komponen biaya per paket yang sudah distandarisasi via HPP Template

---

## Roadmap Pengembangan Integrasi

> Disusun berdasarkan dampak bisnis dan urgensi. Setiap item harus diselesaikan berurutan dalam fasenya karena ada dependensi antar fitur.

---

### 🔴 FASE KRITIS — Fondasi Data (Kerjakan Pertama)

#### INT-01: Upgrade v_financial_summary VIEW ✅ SELESAI
**Prioritas:** KRITIS | **Effort:** S
**Dependensi:** Tidak ada
**Status:** ✅ Diimplementasikan di `sql/migrations/084_v_financial_summary_v2.sql` — VIEW sekarang mencakup hpp_planned (departure_cost_items), hpp_realized (departure_expenses), total_ap_vendor (vendor_costs), net_margin_pct, hpp_variance. Terdaftar di runMigrations.ts (Step 084).

Update `sql/migrations/042_v_financial_summary_view.sql`:
```sql
CREATE OR REPLACE VIEW v_financial_summary AS
SELECT
  d.id                AS departure_id,
  d.departure_date,
  d.return_date,
  p.name              AS package_name,
  p.code              AS package_code,
  COALESCE(d.quota, 0) AS quota,
  COUNT(DISTINCT b.id) AS total_bookings,
  COUNT(DISTINCT bp.id) AS total_pax,

  -- Revenue
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status IN ('verified','paid')), 0) AS collected_revenue,
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status IN ('pending','dp_paid')), 0) AS outstanding_ar,

  -- HPP Planned (dari departure_cost_items)
  COALESCE(SUM(DISTINCT dci.total_cost_idr), 0) AS hpp_planned,

  -- HPP Realisasi (dari departure_expenses)
  COALESCE(SUM(DISTINCT de.amount_idr), 0) AS hpp_realized,

  -- Vendor Costs / AP yang sudah dibuat
  COALESCE(SUM(DISTINCT vc.amount), 0) AS total_ap_vendor,

  -- Net Profit (Revenue - Total Costs)
  COALESCE(SUM(pay.amount) FILTER (WHERE pay.status IN ('verified','paid')), 0)
    - COALESCE(SUM(DISTINCT de.amount_idr), 0)
    - COALESCE(SUM(DISTINCT vc.amount), 0) AS net_profit_realized,

  -- Margin %
  CASE WHEN COALESCE(SUM(pay.amount) FILTER (WHERE pay.status IN ('verified','paid')), 0) > 0
    THEN ROUND(
      (COALESCE(SUM(pay.amount) FILTER (WHERE pay.status IN ('verified','paid')), 0)
        - COALESCE(SUM(DISTINCT de.amount_idr), 0)
        - COALESCE(SUM(DISTINCT vc.amount), 0))
      / SUM(pay.amount) FILTER (WHERE pay.status IN ('verified','paid')) * 100, 2)
    ELSE 0
  END AS net_margin_pct

FROM departures d
LEFT JOIN packages p            ON p.id = d.package_id
LEFT JOIN bookings b            ON b.departure_id = d.id AND b.status != 'cancelled'
LEFT JOIN booking_passengers bp ON bp.booking_id = b.id
LEFT JOIN payments pay          ON pay.booking_id = b.id
LEFT JOIN departure_cost_items dci ON dci.departure_id = d.id
LEFT JOIN departure_expenses de ON de.departure_id = d.id
LEFT JOIN vendor_costs vc       ON vc.departure_id = d.id
GROUP BY d.id, d.departure_date, d.return_date, p.name, p.code, d.quota;
```

**File yang perlu diubah:**
- `sql/migrations/042_v_financial_summary_view.sql` — update VIEW
- Buat migration baru `sql/migrations/083_v_financial_summary_v2.sql`
- `artifacts/umrah-haji/src/pages/admin/AdminAdvancedReports.tsx` — gunakan kolom baru

---

#### INT-02: AdminFinancePL — Tampilkan HPP Plan vs Realisasi vs Vendor ✅ SELESAI
**Prioritas:** KRITIS | **Effort:** M
**Dependensi:** INT-01
**Status:** ✅ AdminFinancePL.tsx sekarang punya 4 tab di panel Detail Biaya: "Vendor AP", "HPP Plan" (departure_cost_items per kategori), "Realisasi" (departure_expenses per kategori), "Perbandingan" (3-kolom Plan vs Realisasi vs AP + estimasi profit). Lazy load dengan `enabled: !!selectedDeparture?.id`.

Tambahkan query ke `departure_cost_items` dan `departure_expenses` di `AdminFinancePL.tsx`:

```typescript
// Query departure_cost_items (HPP Planned)
const { data: costItems } = useQuery({
  queryKey: ['departure_cost_items', selectedDep],
  queryFn: () => supabase
    .from('departure_cost_items')
    .select('category, total_cost_idr, description')
    .eq('departure_id', selectedDep)
});

// Query departure_expenses (Realisasi)
const { data: expenses } = useQuery({
  queryKey: ['departure_expenses', selectedDep],
  queryFn: () => supabase
    .from('departure_expenses')
    .select('category, amount_idr, description, expense_date')
    .eq('departure_id', selectedDep)
});
```

Tampilan baru tabel P&L per keberangkatan:

| Kategori | HPP Plan | Realisasi | Vendor (AP) | Selisih | Status |
|----------|----------|-----------|-------------|---------|--------|
| Hotel Makkah | Rp X | Rp Y | Rp Z | ±Rp | 🟢/🔴 |
| Tiket Penerbangan | ... | ... | ... | ... | ... |
| Visa | ... | ... | ... | ... | ... |
| Perlengkapan | ... | ... | ... | ... | ... |

**File yang perlu diubah:**
- `artifacts/umrah-haji/src/pages/admin/AdminFinancePL.tsx`

---

#### INT-03: AdminLabaRugi — Integrasikan departure_expenses + payroll_records ✅ SELESAI
**Prioritas:** KRITIS | **Effort:** M
**Dependensi:** Tidak ada (bisa paralel)
**Status:** ✅ AdminLabaRugi.tsx sekarang query departure_expenses (HPP lapangan B.2 per kategori) + payroll_records (Gaji Modul Payroll). Anti-double-count: jika payroll data ada, skip cash_transactions.salary. Badge "Gaji dari Modul Payroll" muncul di section C.

`AdminLabaRugi.tsx` saat ini query:
- ✅ `payments` → Pendapatan
- ✅ `vendor_costs` → HPP vendor
- ✅ `cash_transactions` → Biaya operasional kantor

Tambahkan:
- ❌ `departure_expenses` → HPP realisasi keberangkatan (dikelompokkan per kategori)
- ❌ `payroll_records` SUM(net_salary) per bulan → Biaya Gaji & Tunjangan yang akurat

```typescript
// Tambah ke AdminLabaRugi.tsx
const { data: depExpenses } = useQuery({
  queryKey: ['departure_expenses_period', year, month],
  queryFn: () => supabase
    .from('departure_expenses')
    .select('category, amount_idr')
    .gte('expense_date', dateFrom)
    .lte('expense_date', dateTo)
});

const { data: payrollData } = useQuery({
  queryKey: ['payroll_records_period', year, month],
  queryFn: () => supabase
    .from('payroll_records')
    .select('net_salary, gross_salary, total_deductions, period_month, period_year')
    .eq('period_year', year)
    .eq('period_month', month)
    .eq('status', 'paid')
});
```

**File yang perlu diubah:**
- `artifacts/umrah-haji/src/pages/admin/AdminLabaRugi.tsx`

---

#### INT-04: AdminArusKas — Tambahkan departure_expenses ✅ SELESAI
**Prioritas:** KRITIS | **Effort:** S
**Dependensi:** Tidak ada
**Status:** ✅ AdminArusKas.tsx sekarang query departure_expenses per periode (l6). Masuk ke operasionalNet sebagai "Pengeluaran Keberangkatan (Lapangan)" di Cash Flow Statement bagian I.

`AdminArusKas.tsx` saat ini:
- ✅ Arus Masuk: payments verified
- ✅ Arus Keluar: vendor_costs paid + cash_transactions out

Tambahkan:
- ❌ `departure_expenses` per bulan → bagian arus keluar operasional keberangkatan

```typescript
// Bagian Arus Keluar — Biaya Operasional Keberangkatan
const depExpTotal = depExpData?.reduce((s: number, e: any) => s + e.amount_idr, 0) ?? 0;
```

**File yang perlu diubah:**
- `artifacts/umrah-haji/src/pages/admin/AdminArusKas.tsx`

---

### 🟠 FASE PENTING — Otomasi Biaya Operasional

#### ✅ INT-05: Auto-create vendor_cost dari Visa Batch — SELESAI
**Prioritas:** PENTING | **Effort:** M
**Dependensi:** Tidak ada

Di `AdminVisaManagement.tsx`, saat admin ubah status visa ke **"submitted"**:
1. Dialog update status kini menampilkan section **"Catat Biaya Visa ke Hutang Dagang"** (toggle on/off)
2. Admin pilih vendor/konsulat + input biaya IDR → auto-create `vendor_costs` entry (cost_type=VISA, status=pending)
3. Link ke departure_id — warning tampil jika visa tidak terhubung ke keberangkatan
4. Biaya otomatis masuk ke AP dan invalidate query `vendor-costs` + `finance-ap`

```typescript
// Saat visa batch submitted/approved, trigger:
const createVisaVendorCost = async (batch: VisaBatch) => {
  await supabase.from('vendor_costs').insert({
    departure_id: batch.departure_id,
    vendor_id: batch.visa_vendor_id,
    cost_type: 'visa',
    amount: batch.total_visa_fee,
    quantity: batch.pax_count,
    unit_price: batch.per_pax_fee,
    status: 'pending',
    account_code: '6200',
    description: `Biaya visa batch ${batch.batch_number} - ${batch.pax_count} jamaah`,
    due_date: batch.submission_date
  });
};
```

**File yang perlu diubah:**
- `artifacts/umrah-haji/src/pages/admin/AdminVisaManagement.tsx`
- Tambah `visa_vendor_id` dan `per_pax_fee` ke tabel visa batches jika belum ada

---

#### ✅ INT-06: Auto-create departure_cost_items dari Hotel Contract — SELESAI
**Prioritas:** PENTING | **Effort:** M
**Dependensi:** Tidak ada

Di `DepartureBudgetTab.tsx`, ditambahkan fitur lengkap:
1. **Card "Import HPP Hotel dari Kontrak"** — muncul otomatis jika ada hotel_contracts untuk keberangkatan ini
2. Tabel kontrak dengan: nama hotel, kota, tipe kamar, harga/kamar/malam, check-in → check-out, kolom "Malam" (editable, auto-hitung dari tanggal), total biaya
3. **Checkbox per kontrak** + tombol "Pilih Semua" (skip yang sudah diimpor)
4. Tombol **"Import ke HPP"** → batch insert ke `departure_cost_items` (category=hotel, unit=per_room, reference_id=contract.id untuk dedup)
5. Badge **"✓ Sudah Diimpor"** pada kontrak yang reference_id-nya sudah ada di departure_cost_items
6. **Tabel "HPP Terencana"** baru — menampilkan semua departure_cost_items dengan total + tombol hapus per item

---

#### ✅ INT-07: Equipment Cost Auto-flow ke departure_cost_items — SELESAI
**Prioritas:** PENTING | **Effort:** S
**Dependensi:** Tidak ada
**Status:** ✅ EquipmentRealizationTab.tsx diperbarui (2026-07-09):
- Fetch `departures.booked_count` sebagai `paxCount` — digunakan untuk HPP Rencana = `unit_cost × paxCount`
- Panel HPP Comparison: HPP Direncanakan vs HPP Realisasi vs Tersimpan di departure_cost_items
- Drift detection: warning amber jika selisih > Rp 1.000 antara tersimpan vs rencana
- Tombol **"Sync HPP Rencana"** — upsert `unit_cost × pax_count` ke departure_cost_items (hapus dulu, insert baru)
- Tombol **"Impor HPP Realisasi"** — upsert `unit_cost × distributed_quantity` (alternatif)
- Tabel realisasi diperluas dengan kolom HPP Rencana & HPP Realisasi per item, footer totals + selisih under/over
- SQL: `departure_cost_items.notes` kolom ditambah via `20260709_finance_integration.sql`

Di `EquipmentRealizationTab.tsx`, sudah ada insert ke `departure_cost_items`. Perlu diperkuat:
1. Saat equipment set di-approve untuk keberangkatan → auto-calculate: `equipment_items.unit_cost × jumlah_jamaah`
2. Auto-insert ke `departure_cost_items` dengan `category = 'equipment'`
3. Jika sudah ada entry sebelumnya, update (replace) bukan duplicate insert

```typescript
const autoSyncEquipmentCost = async (departureId: string, items: EquipmentItem[], paxCount: number) => {
  const totalCost = items.reduce((sum, item) => sum + (item.unit_cost * paxCount), 0);
  
  // Upsert: hapus existing equipment entry, insert baru
  await supabase.from('departure_cost_items')
    .delete()
    .eq('departure_id', departureId)
    .eq('category', 'equipment');
    
  await supabase.from('departure_cost_items').insert({
    departure_id: departureId,
    category: 'equipment',
    description: `Perlengkapan jamaah (${paxCount} pax)`,
    unit: 'per_pax',
    quantity: paxCount,
    unit_cost: items.reduce((s, i) => s + i.unit_cost, 0),
    currency: 'IDR',
    exchange_rate: 1
  });
};
```

---

#### INT-08: Konsolidasi departure_budgets → AdminBudget (finance_budgets) ✅ SELESAI
**Prioritas:** PENTING | **Effort:** M
**Dependensi:** Tidak ada
**Status:** ✅ AdminBudget.tsx sekarang punya 2 tab: "Budget Operasional" (COA/finance_budgets, existing) + "Budget Keberangkatan" (departure_budgets per bulan). Tab baru menampilkan KPI 3-kolom (Budget/Realisasi AP/Sisa), progress bar penyerapan, tabel per kategori Plan vs AP vs Selisih, daftar keberangkatan bulan ini.

Tambahkan tab baru di `AdminBudget.tsx`: **"Budget Keberangkatan"**
- Tampilkan total `departure_budgets` per bulan (digroup dari `departures.departure_date`)
- Mapping kategori: `departure_budgets.category` → `account_code` COA
  - hotel → 6210, tiket → 6220, visa → 6230, katering → 6240, transportasi → 6250, handling → 6260
- Agregat otomatis dari semua keberangkatan bulan berjalan
- Tampil berdampingan dengan `finance_budgets` manual

```typescript
// AdminBudget.tsx — tambah query
const { data: departureBudgets } = useQuery({
  queryKey: ['departure_budgets_monthly', year, month],
  queryFn: async () => {
    const { data } = await supabase
      .from('departure_budgets')
      .select('category, budgeted_amount, departure_id, departures!inner(departure_date)')
      .gte('departures.departure_date', `${year}-${month}-01`)
      .lte('departures.departure_date', lastDay);
    return data;
  }
});
```

---

#### ✅ INT-09: Payroll → Laporan Pajak (AdminLaporanPajak) Integration — SELESAI PENUH
**Prioritas:** PENTING | **Effort:** S
**Dependensi:** Tidak ada
**Status:** ✅ AdminLaporanPajak.tsx query payroll_records (pph21_amount, gross_salary, net_salary per tahun, status=paid).
  PPh21 logic: pph21_amount aktual (dari Finalize Payroll) → fallback estimasi 5% × gross → fallback cash_transactions.salary.
  Badge "Data Payroll Tersedia" + tampilan kondisional.
**Data layer fix (2026-07-09):**
  - SQL migration `20260709_finance_integration.sql` menambah `pph21_amount NUMERIC DEFAULT 0` & `pph21_annual NUMERIC DEFAULT 0` ke `payroll_records`
  - AdminPayroll.tsx diperkuat dengan **"Finalize Payroll"** button di Overview tab:
    - upsert per karyawan ke `payroll_records` (employee_id, period_year, period_month, gross_salary, net_salary, pph21_amount, pph21_annual, status='paid')
    - konflik key `(employee_id, period_year, period_month)` → update
    - setelah Finalize → AdminLaporanPajak.tsx otomatis baca pph21_amount aktual (bukan estimasi)

Pastikan `AdminLaporanPajak.tsx` pull PPh21 dari `payroll_records`:
```typescript
const { data: pph21Data } = useQuery({
  queryKey: ['pph21_payroll', year],
  queryFn: () => supabase
    .from('payroll_records')
    .select('employee_id, gross_salary, pph21_amount, period_month, period_year, profiles!inner(full_name, nik)')
    .eq('period_year', year)
    .eq('status', 'paid')
});
```
- Tampil per karyawan: nama, NIK, gross salary, PPh21 terutang, per bulan
- Total PPh21 setahun per karyawan (untuk SPT 1721-A1)
- Export Excel format e-SPT

**File yang perlu diubah:**
- `artifacts/umrah-haji/src/pages/admin/AdminLaporanPajak.tsx`

---

### 🟡 FASE SEDANG — Dashboard & Analitik

#### INT-10: AdminFinanceTerpadu — Upgrade Data Sources
**Prioritas:** SEDANG | **Effort:** M
**Dependensi:** INT-01, INT-03

`AdminFinanceTerpadu.tsx` (executive dashboard) perlu:
- Gunakan data dari `v_financial_summary` yang sudah diupgrade (INT-01)
- Tambahkan panel: **HPP Plan vs Realisasi Total** (dari departure_cost_items vs departure_expenses)
- Tambahkan panel: **Biaya SDM** (dari payroll_records)
- Tambahkan KPI: **Net Margin per Keberangkatan** (top 5 terbaik & terburuk)

---

#### INT-11: Working Capital per Keberangkatan
**Prioritas:** SEDANG | **Effort:** L
**Dependensi:** INT-02

Halaman baru atau tab di AdminDepartureDetail: **"Cash Timing"**

Timeline per keberangkatan:
```
[DP Terkumpul] → [Pelunasan] → [Bayar Hotel] → [Bayar Tiket] → [Bayar Visa] → [Keberangkatan]
     ↑                ↑              ↑                ↑               ↑
  payments         payments      vendor_cost       vendor_cost    vendor_cost
```

Fitur:
- Proyeksi cash in: cicilan jamaah tersisa (dari booking_installment_schedules)
- Proyeksi cash out: vendor_costs jatuh tempo (departure_budgets × dates)
- Chart: saldo kas khusus keberangkatan ini per minggu
- Alert: jika projected saldo negatif sebelum keberangkatan

**File baru:**
- `artifacts/umrah-haji/src/components/departure/DepartureCashTimingTab.tsx`

---

#### INT-12: Laporan HPP Terpadu (HPP per Paket, per Periode)
**Prioritas:** SEDANG | **Effort:** M
**Dependensi:** INT-01, INT-02

Halaman baru: `/admin/finance/hpp-terpadu` → `AdminHPPTerpadu.tsx`

Fitur:
- HPP per Keberangkatan: tabel semua departure, kolom HPP Plan vs Realisasi vs Margin
- HPP per Paket: rata-rata HPP per package type (Umroh Economy vs VIP vs Haji)
- Trend HPP: grafik perubahan HPP per kategori dari waktu ke waktu
- Export Excel untuk analisis lebih lanjut

---

#### INT-13: Auto AR Reminder (Cron Job)
**Prioritas:** SEDANG | **Effort:** S
**Dependensi:** Backend cron infrastructure sudah ada

Tambahkan cron job di `artifacts/api-server/src/cron/` atau extend `paymentReminder.ts`:

```typescript
// Cron: setiap hari 09:00 WIB — AR reminder otomatis
const sendARReminders = async () => {
  // H-7 dari due_date cicilan
  const upcoming = await db.select()
    .from(bookings)
    .where(/* due_date = today + 7 days, status = dp_paid */);
  
  // H+1, H+3, H+7 overdue
  const overdue = await db.select()
    .from(bookings)
    .where(/* due_date sudah lewat, belum lunas */);
    
  // Kirim WhatsApp via Fonnte API untuk setiap jamaah
  for (const booking of [...upcoming, ...overdue]) {
    await sendWhatsAppReminder(booking);
  }
};
```

---

#### INT-14: departure_expenses Approval Workflow
**Prioritas:** SEDANG | **Effort:** M
**Dependensi:** Tidak ada

`departure_expenses` sudah punya kolom `approved_by`. Buat workflow approval:
1. Staff operational input departure_expense (status = 'pending_approval')
2. Manager/Branch Manager approve → status = 'approved'
3. Setelah approved → expense masuk ke laporan keuangan
4. Notifikasi ke finance manager

Manfaat: expense yang belum diapprove tidak mempengaruhi laporan keuangan resmi

---

### 🟢 FASE LANJUTAN — Peningkatan Analitik

#### INT-15: Package Profitability Benchmark
**Prioritas:** LANJUTAN | **Effort:** M
**Dependensi:** INT-11, INT-12

Update `AdminPackageProfitabilityComparison.tsx`:
- Benchmark HPP per kategori antar paket (Economy vs VIP vs Premium)
- Identifikasi kategori biaya tertinggi yang membedakan paket
- Rekomendasi harga jual berdasarkan HPP + target margin

---

#### INT-16: Laporan Keuangan per Cabang (Multi-Branch)
**Prioritas:** LANJUTAN | **Effort:** L
**Dependensi:** INT-03, INT-04

Filter semua laporan keuangan per `branch_id`:
- Laba Rugi per Cabang
- Kas per Cabang
- AR/AP per Cabang
- Konsolidasi semua cabang untuk owner

---

#### INT-17: Finance KPI Dashboard Widget
**Prioritas:** LANJUTAN | **Effort:** S
**Dependensi:** INT-10

Tambah widget di AdminDashboard utama (atau FinanceDashboard):
- 💰 Revenue bulan ini vs target
- 📊 Margin rata-rata keberangkatan aktif
- ⚠️ Jumlah booking overdue (AR)
- 📋 Vendor jatuh tempo minggu ini (AP)
- 💸 Biaya SDM vs budget

---

## Ringkasan Roadmap

```
FASE KRITIS (Kerjakan Sekarang — Fondasi Data Akurat):
  INT-01 → Upgrade v_financial_summary VIEW
  INT-02 → AdminFinancePL: HPP Plan vs Realisasi vs Vendor
  INT-03 → AdminLabaRugi: + departure_expenses + payroll_records
  INT-04 → AdminArusKas: + departure_expenses

FASE PENTING (Otomasi Biaya — Kurangi Kerja Manual):
  INT-05 → Auto vendor_cost dari Visa Batch
  INT-06 → Import HPP dari Hotel Contract
  INT-07 → Equipment Cost auto-sync ke departure_cost_items
  INT-08 → departure_budgets → AdminBudget konsolidasi
  INT-09 → Payroll → Laporan Pajak PPh21

FASE SEDANG (Dashboard & Analitik):
  INT-10 → AdminFinanceTerpadu upgrade
  INT-11 → Working Capital per Keberangkatan
  INT-12 → Laporan HPP Terpadu
  INT-13 → Auto AR Reminder cron job
  INT-14 → departure_expenses Approval Workflow

FASE LANJUTAN (Peningkatan):
  INT-15 → Package Profitability Benchmark
  INT-16 → Laporan per Cabang (Multi-Branch)
  INT-17 → Finance KPI Dashboard Widget
```

---

## Mapping Integrasi Antar Modul

```
MODUL             → TABEL SUMBER              → TABEL KEUANGAN           → LAPORAN
──────────────────────────────────────────────────────────────────────────────────
SDM/Payroll       payroll_records             cash_transactions(salary)   AdminLabaRugi [GAP-04]
                  payroll_records             (langsung)                  AdminLaporanPajak [INT-09]

Hotel             hotels, hotel_contracts     departure_cost_items        AdminFinancePL [INT-06]
                  hotel reservations          vendor_costs                AdminFinanceAP

Visa              visa_applications           vendor_costs                AdminFinanceAP [INT-05]
                  visa_applications           departure_cost_items        AdminFinancePL

Penerbangan       airlines, flight_schedules  departure_cost_items        AdminFinancePL
                  tiket pembelian             vendor_costs                AdminFinanceAP

Perlengkapan      equipment_items(unit_cost)  departure_cost_items        AdminFinancePL [INT-07]
                  equipment_orders            departure_expenses          AdminLabaRugi

Keberangkatan     departure_budgets           finance_budgets             AdminBudget [INT-08]
                  departure_cost_items        v_financial_summary         AdminAdvancedReports [INT-01]
                  departure_expenses          AdminLabaRugi               AdminArusKas [INT-03,04]

Booking/Jamaah    payments(verified)          v_financial_summary         AdminFinancePL
                  bookings(outstanding)       AdminFinanceAR              AdminLabaRugi

Biaya Kantor      cash_transactions(out)      finance_budgets             AdminBudget
                  expenses                    AdminLabaRugi               AdminArusKas
```

---

## SQL Migration Baru yang Diperlukan

| Migration | Isi | Terkait |
|-----------|-----|---------|
| `083_v_financial_summary_v2.sql` | Recreate VIEW dengan departure_cost_items + departure_expenses | INT-01 |
| `084_departure_expense_approval.sql` | Tambah kolom status + approval ke departure_expenses | INT-14 |
| `085_visa_cost_auto_trigger.sql` | Trigger auto-create vendor_cost saat visa batch submitted | INT-05 |

---

## Catatan Teknis

1. **Sumber kebenaran biaya**: `departure_cost_items` = HPP planned; `departure_expenses` = realisasi lapangan; `vendor_costs` = AP yang diformalkan ke vendor. Ketiga tabel ini mewakili 3 tahap berbeda dari siklus biaya keberangkatan.

2. **Urutan siklus biaya keberangkatan**:
   ```
   departure_cost_items (HPP plan) 
   → departure_expenses (realisasi saat operasional berlangsung)
   → vendor_costs (invoice/tagihan formal dari vendor)
   → payments to vendor (jurnal kas keluar)
   ```

3. **Double-entry**: Auto-journal trigger sudah ada di migration 41 untuk `vendor_costs`. Perlu ditambahkan trigger serupa untuk `departure_expenses` approved.

4. **Payroll → Jurnal**: Saat payroll di-pay, otomatis buat `cash_transactions` dengan kategori 'salary' DAN `journal_entries` dengan debit Biaya Gaji (6100), kredit Kas/Bank (1100).

5. **Tidak ada tabel baru untuk hotel contract → departure_cost_items**: cukup dengan form dialog di UI yang membaca `hotel_contracts` dan menulis ke `departure_cost_items`.
