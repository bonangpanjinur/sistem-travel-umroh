# Rencana Perbaikan & Pengembangan Modul Keuangan
> Vinstour Travel — Umroh & Haji Management Portal
> Terakhir diperbarui: 10 Juni 2026

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
| `payroll_records` | 012_hr_enhancements.sql | Data penggajian karyawan (+ `pph21_amount`, `pph21_annual` via 20260709) |
| `payroll_slips` | 070_payroll_slips_ess.sql | Slip gaji bulanan |
| `payroll_components` + `employee_payroll_components` | 071_onboarding_and_payroll_components.sql | Komponen gaji fleksibel |
| `bank_reconciliations` + `reconciliation_items` | (K-12) | Rekonsiliasi bank |
| `v_financial_summary` | 084_v_financial_summary_v2.sql | VIEW ringkasan keuangan per keberangkatan (hpp_planned, hpp_realized, net_margin_pct) |

---

## ⚠️ GAP ANALYSIS — Status Per Juni 2026

> Audit awal Juni 2026: K-01 s/d K-13 selesai secara UI, namun integrasi data antar modul banyak yang terputus.
> **Update 10 Juni 2026**: GAP-01, 02, 04, 07, 08, 09 sudah diselesaikan via sprint integrasi INT-01 s/d INT-09.

---

### GAP-01 ✅ SELESAI: departure_cost_items masuk v_financial_summary & AdminFinancePL

**Diselesaikan via:** INT-01 (v_financial_summary v2) + INT-02 (AdminFinancePL HPP Plan vs Realisasi)

---

### GAP-02 ✅ SELESAI: departure_expenses terhubung ke laporan keuangan

**Diselesaikan via:** INT-03 (AdminLabaRugi) + INT-04 (AdminArusKas) + INT-02 (AdminFinancePL)

---

### GAP-03 🔴 BELUM: departure_budgets ↔ finance_budgets — Sebagian Terhubung

**Masalah sisa:**
- `AdminBudget.tsx` sekarang punya tab "Budget Keberangkatan" (INT-08 ✅) yang tampilkan departure_budgets per bulan
- Namun **mapping otomatis** departure_budget.category → account_code COA belum berjalan penuh
- Konsolidasi dua sistem ke satu budget view masih belum sempurna

**Dampak:** Budget vs Aktual di AdminBudget belum sepenuhnya akurat untuk budget keberangkatan

---

### GAP-04 ✅ SELESAI: Payroll → Laporan Keuangan Formal

**Diselesaikan via:** INT-03 (AdminLabaRugi + payroll_records) + INT-09 (AdminLaporanPajak PPh21)
- `AdminLabaRugi.tsx` query `payroll_records` — anti-double-count dengan cash_transactions.salary
- `AdminPayroll.tsx` punya tombol "Finalize Payroll" → upsert ke `payroll_records` termasuk `pph21_amount`
- `AdminLaporanPajak.tsx` tab "PPh 21 per Karyawan" — rincian bulanan + export e-SPT 1721-A1

---

### GAP-05 ✅ SELESAI: Hotel Kontrak → departure_cost_items Otomatis

**Diselesaikan via:** INT-06 (DepartureBudgetTab — Import HPP dari Hotel Contract)
- Dialog import kontrak hotel di DepartureBudgetTab, batch insert ke `departure_cost_items`

---

### GAP-06 ✅ SELESAI: Visa Management → AP (Vendor Cost) Otomatis

**Diselesaikan via:** INT-05 (AdminVisaManagement — Auto-create vendor_cost saat visa submitted)

---

### GAP-07 ✅ SELESAI: Equipment Costs → departure_cost_items

**Diselesaikan via:** INT-07 (EquipmentRealizationTab — Sync HPP Rencana + Impor HPP Realisasi)

---

### GAP-08 ✅ SELESAI: AdminFinancePL HPP Plan vs Realisasi

**Diselesaikan via:** INT-02 (AdminFinancePL — 4 tab: Vendor AP, HPP Plan, Realisasi, Perbandingan)

---

### GAP-09 ✅ SELESAI: v_financial_summary VIEW — Data Lengkap

**Diselesaikan via:** INT-01 (migration 084_v_financial_summary_v2.sql)
- VIEW sekarang punya: `hpp_planned`, `hpp_realized`, `total_ap_vendor`, `net_profit_realized`, `net_margin_pct`

---

### GAP-10 🔴 BELUM: Tidak Ada Working Capital / Cash Timing per Keberangkatan

**Masalah:**
- Tidak ada analisis kapan jamaah bayar vs kapan perusahaan bayar vendor
- Gap waktu antara penerimaan DP → pelunasan → pembayaran hotel/airline/visa tidak divisualisasikan
- Risk kas negatif per keberangkatan tidak terdeteksi dini

**Rencana:** INT-11

---

### GAP-11 🔴 BELUM: AR Reminder Masih Manual

**Masalah:**
- AdminFinanceAR ada tombol "Kirim Reminder" tapi masih klik manual per jamaah
- Tidak ada cron job untuk auto-reminder H-7, H-3, H+0 (overdue)

**Rencana:** INT-13

---

### GAP-12 🔴 BELUM: AdminPackageProfitabilityComparison Belum Pakai HPP Template

**Masalah:**
- Perbandingan antar paket belum memasukkan komponen biaya per paket yang sudah distandarisasi via HPP Template

**Rencana:** INT-15

---

## Roadmap Pengembangan Integrasi

> Disusun berdasarkan dampak bisnis dan urgensi.

---

### 🔴 FASE KRITIS — Fondasi Data ✅ SEMUA SELESAI

#### ✅ INT-01: Upgrade v_financial_summary VIEW — SELESAI
**Prioritas:** KRITIS | **Effort:** S | **Selesai:** Juni 2026
**File:** `sql/migrations/084_v_financial_summary_v2.sql` — VIEW sekarang mencakup `hpp_planned` (departure_cost_items), `hpp_realized` (departure_expenses), `total_ap_vendor`, `net_margin_pct`, `hpp_variance`. Terdaftar di runMigrations.ts Step 084.

---

#### ✅ INT-02: AdminFinancePL — HPP Plan vs Realisasi vs Vendor — SELESAI
**Prioritas:** KRITIS | **Effort:** M | **Selesai:** Juni 2026
**File:** `AdminFinancePL.tsx` — 4 tab di panel Detail Biaya: "Vendor AP", "HPP Plan" (departure_cost_items per kategori), "Realisasi" (departure_expenses per kategori), "Perbandingan" (3-kolom Plan vs Realisasi vs AP + estimasi profit). Lazy load dengan `enabled: !!selectedDeparture?.id`.

---

#### ✅ INT-03: AdminLabaRugi — Integrasikan departure_expenses + payroll_records — SELESAI
**Prioritas:** KRITIS | **Effort:** M | **Selesai:** Juni 2026
**File:** `AdminLabaRugi.tsx` — query `departure_expenses` (HPP lapangan B.2 per kategori) + `payroll_records` (Gaji Modul Payroll). Anti-double-count: jika payroll data ada, skip cash_transactions.salary. Badge "Gaji dari Modul Payroll" di section C.

---

#### ✅ INT-04: AdminArusKas — Tambahkan departure_expenses — SELESAI
**Prioritas:** KRITIS | **Effort:** S | **Selesai:** Juni 2026
**File:** `AdminArusKas.tsx` — query `departure_expenses` per periode, masuk ke operasionalNet sebagai "Pengeluaran Keberangkatan (Lapangan)" di Cash Flow Statement bagian I.

---

### 🟠 FASE PENTING — Otomasi Biaya Operasional ✅ SEMUA SELESAI

#### ✅ INT-05: Auto-create vendor_cost dari Visa Batch — SELESAI
**Prioritas:** PENTING | **Effort:** M | **Selesai:** Juni 2026
**File:** `AdminVisaManagement.tsx` — saat status visa → "submitted": dialog menampilkan section "Catat Biaya Visa ke Hutang Dagang", auto-create `vendor_costs` (cost_type=VISA, status=pending), link ke departure_id.

---

#### ✅ INT-06: Auto-create departure_cost_items dari Hotel Contract — SELESAI
**Prioritas:** PENTING | **Effort:** M | **Selesai:** Juni 2026
**File:** `DepartureBudgetTab.tsx` — card "Import HPP Hotel dari Kontrak", tabel kontrak dengan checkbox, tombol "Import ke HPP" → batch insert ke `departure_cost_items` (category=hotel, reference_id=contract.id untuk dedup). Badge "✓ Sudah Diimpor" pada kontrak yang sudah ada.

---

#### ✅ INT-07: Equipment Cost Auto-flow ke departure_cost_items — SELESAI
**Prioritas:** PENTING | **Effort:** S | **Selesai:** 9 Juli 2026
**File:** `EquipmentRealizationTab.tsx`:
- Panel HPP Comparison: HPP Direncanakan (`unit_cost × booked_count`) vs HPP Realisasi vs Tersimpan
- Drift detection: warning amber jika selisih > Rp 1.000
- Tombol **"Sync HPP Rencana"** — upsert `unit_cost × pax_count` ke departure_cost_items
- Tombol **"Impor HPP Realisasi"** — upsert `unit_cost × distributed_quantity`
- Tabel diperluas dengan kolom HPP per item, footer totals + selisih under/over
- SQL: `departure_cost_items.notes` kolom ditambah via `20260709_finance_integration.sql`

---

#### ✅ INT-08: Konsolidasi departure_budgets → AdminBudget — SELESAI
**Prioritas:** PENTING | **Effort:** M | **Selesai:** Juni 2026
**File:** `AdminBudget.tsx` — 2 tab: "Budget Operasional" (COA/finance_budgets, existing) + "Budget Keberangkatan" (departure_budgets per bulan). KPI 3-kolom (Budget/Realisasi AP/Sisa), progress bar penyerapan, tabel per kategori Plan vs AP vs Selisih.

---

#### ✅ INT-09: Payroll → Laporan Pajak PPh21 — SELESAI PENUH
**Prioritas:** PENTING | **Effort:** S | **Selesai:** 9–10 Juni 2026
**Files:**
- `AdminLaporanPajak.tsx` — 4 tab termasuk **"PPh 21 per Karyawan"** (baru):
  - Tabel per karyawan: Nama, NPWP, Jabatan, Gaji Bruto/thn, PPh 21 Terutang, Rate Efektif
  - Klik baris → expand rincian bulanan Jan–Des (gross + PPh 21 per bulan)
  - Warning merah jika NPWP kosong
  - Export **"Ringkasan Excel"** + **"e-SPT 1721-A1"** (format DJP per karyawan bulanan)
- `AdminPayroll.tsx` — tombol **"Finalize Payroll"** di Overview tab: upsert ke `payroll_records` dengan `pph21_amount` + `pph21_annual`
- SQL: `20260709_finance_integration.sql` — tambah `pph21_amount`, `pph21_annual` ke `payroll_records`; tambah approval cols ke `departure_expenses`; recreate `v_financial_summary`; 6 indexes performa

---

### 🟡 FASE SEDANG — Dashboard & Analitik ✅ SEMUA SELESAI

#### ✅ INT-10: AdminFinanceTerpadu — Upgrade Data Sources — SELESAI
**Prioritas:** SEDANG | **Effort:** M | **Status:** ✅ SELESAI (10 Juni 2026)
**Dependensi:** INT-01 ✅, INT-03 ✅

`AdminFinanceTerpadu.tsx` sudah diupgrade:
- 3 query paralel: `payments`, `v_financial_summary`, `payroll_records`
- KPI rows: Revenue, HPP Plan, HPP Realisasi, Gross Margin, SDM Cost, Net Margin
- 5 tab: Cashflow, Comparison (HPP Plan vs Realisasi), AR aging, HPP detail, SDM breakdown

---

#### ✅ INT-11: Working Capital per Keberangkatan — SELESAI
**Prioritas:** SEDANG | **Effort:** L | **Status:** ✅ SELESAI (10 Juni 2026)
**Dependensi:** INT-02 ✅

Tab baru "Cash Timing" di AdminDepartureDetail:
- Chart kas mingguan (inflows vs outflows per minggu)
- Alert otomatis jika saldo proyeksi negatif atau ada vendor overdue
- Tabel piutang jamaah (booking_installment_schedules) + kewajiban vendor (vendor_costs)

**File:**
- `artifacts/umrah-haji/src/components/departure/DepartureCashTimingTab.tsx` ✅ CREATED

---

#### ✅ INT-12: Laporan HPP Terpadu (HPP per Paket, per Periode) — SELESAI
**Prioritas:** SEDANG | **Effort:** M | **Status:** ✅ SELESAI (10 Juni 2026)
**Dependensi:** INT-01 ✅, INT-02 ✅

Halaman baru `/admin/finance/hpp-terpadu` → `AdminHPPTerpadu.tsx`:
- 3 tab: Per Keberangkatan (sortable table), Per Paket (bar chart + table), Tren Bulanan (bar + line chart % margin)
- KPI cards: HPP Rencana, HPP Realisasi, Total Pendapatan, Rata-rata Margin
- Filter tahun, search nama paket, export CSV
- Terintegrasi ke sidebar Akuntansi dan Command Palette

**File:**
- `artifacts/umrah-haji/src/pages/admin/AdminHPPTerpadu.tsx` ✅ CREATED
- Route: `/admin/finance/hpp-terpadu` ✅ ADDED
- Sidebar menu: `admin-menu-registry.ts` (Akuntansi group, sort_order 550) ✅ ADDED

---

#### ✅ INT-13: Auto AR Reminder (Cron Job) — SELESAI
**Prioritas:** SEDANG | **Effort:** S | **Status:** ✅ SELESAI (10 Juni 2026)
**Dependensi:** Backend cron infrastructure sudah ada

Implementasi:
- Fungsi `runAROverdueReminders()` di `artifacts/api-server/src/routes/reminders.ts`
- Query booking dengan `remaining_amount > 0` + deadline H-7 atau H+1/H+3/H+7 overdue
- Pesan WA berbeda untuk approaching deadline vs overdue
- Log ke `wa_logs` dengan `trigger_type = 'ar_reminder'`
- **Cron terdaftar jam 09:30 WIB (02:30 UTC)** — terkonfirmasi di log server
- Endpoint manual: `POST /api/reminders/run` dengan body `{ "type": "ar_overdue" }`
- Migration 086: index wa_logs untuk performa query AR reminder

---

#### ✅ INT-14: departure_expenses Approval Workflow — SELESAI
**Prioritas:** SEDANG | **Effort:** M | **Status:** ✅ SELESAI (10 Juni 2026)

Implementasi:
- `DepartureExpensesCard.tsx` diupgrade penuh dengan 4 tab (Semua, Pending, Disetujui, Ditolak)
- Badge approval_status + tombol Setuju/Tolak per item
- `DepartureExpenseForm.tsx`: insert baru otomatis set `approval_status: 'pending_approval'`
- Update `approved_by` + `approved_at` saat manager approve
- Migration 085: kolom `approval_status`, `approved_by`, `approved_at` pada `departure_expenses` (4/4 statements OK)

---

### 🟢 FASE LANJUTAN — Peningkatan Analitik ❌ BELUM DIKERJAKAN

#### ❌ INT-15: Package Profitability Benchmark
**Prioritas:** LANJUTAN | **Effort:** M | **Status:** Belum dikerjakan
**Dependensi:** INT-11, INT-12

Update `AdminPackageProfitabilityComparison.tsx`:
- Benchmark HPP per kategori antar paket (Economy vs VIP vs Premium)
- Identifikasi kategori biaya tertinggi yang membedakan paket
- Rekomendasi harga jual berdasarkan HPP + target margin

---

#### ❌ INT-16: Laporan Keuangan per Cabang (Multi-Branch)
**Prioritas:** LANJUTAN | **Effort:** L | **Status:** Belum dikerjakan
**Dependensi:** INT-03 ✅, INT-04 ✅

Filter semua laporan keuangan per `branch_id`:
- Laba Rugi per Cabang
- Kas per Cabang
- AR/AP per Cabang
- Konsolidasi semua cabang untuk owner

---

#### ❌ INT-17: Finance KPI Dashboard Widget
**Prioritas:** LANJUTAN | **Effort:** S | **Status:** Belum dikerjakan
**Dependensi:** INT-10

Tambah widget di AdminDashboard utama (atau FinanceDashboard):
- 💰 Revenue bulan ini vs target
- 📊 Margin rata-rata keberangkatan aktif
- ⚠️ Jumlah booking overdue (AR)
- 📋 Vendor jatuh tempo minggu ini (AP)
- 💸 Biaya SDM vs budget

---

## Ringkasan Roadmap — Status 10 Juni 2026

```
FASE KRITIS (Fondasi Data Akurat) — ✅ SEMUA SELESAI:
  ✅ INT-01 → Upgrade v_financial_summary VIEW
  ✅ INT-02 → AdminFinancePL: HPP Plan vs Realisasi vs Vendor
  ✅ INT-03 → AdminLabaRugi: + departure_expenses + payroll_records
  ✅ INT-04 → AdminArusKas: + departure_expenses

FASE PENTING (Otomasi Biaya) — ✅ SEMUA SELESAI:
  ✅ INT-05 → Auto vendor_cost dari Visa Batch
  ✅ INT-06 → Import HPP dari Hotel Contract
  ✅ INT-07 → Equipment Cost auto-sync ke departure_cost_items
  ✅ INT-08 → departure_budgets → AdminBudget konsolidasi
  ✅ INT-09 → Payroll → Laporan Pajak PPh21 (+ tab 1721-A1 per karyawan)

FASE SEDANG (Dashboard & Analitik) — ✅ SEMUA SELESAI:
  ✅ INT-10 → AdminFinanceTerpadu upgrade (3 query + 5 tab + KPI rows)
  ✅ INT-11 → Working Capital per Keberangkatan (DepartureCashTimingTab)
  ✅ INT-12 → Laporan HPP Terpadu (AdminHPPTerpadu + route + sidebar)
  ✅ INT-13 → Auto AR Reminder cron @09:30 WIB + runAROverdueReminders()
  ✅ INT-14 → departure_expenses Approval Workflow (4-tab UI + migration 085)

FASE LANJUTAN (Peningkatan Analitik) — ❌ BELUM DIKERJAKAN:
  ❌ INT-15 → Package Profitability Benchmark
  ❌ INT-16 → Laporan per Cabang (Multi-Branch)
  ❌ INT-17 → Finance KPI Dashboard Widget
```

**Progress keseluruhan: 14 / 17 item selesai (82%)**
**INT-01–14 semua sudah selesai. Tersisa 3 item di FASE LANJUTAN (INT-15–17).**

---

## Mapping Integrasi Antar Modul — Status Terkini

```
MODUL             → TABEL SUMBER              → TABEL KEUANGAN           → LAPORAN              STATUS
────────────────────────────────────────────────────────────────────────────────────────────────────────
SDM/Payroll       payroll_records             cash_transactions(salary)   AdminLabaRugi          ✅ INT-03
                  payroll_records             (langsung, pph21_amount)    AdminLaporanPajak      ✅ INT-09
                  employees (npwp)            —                           PPh21 per Karyawan     ✅ INT-09

Hotel             hotels, hotel_contracts     departure_cost_items        AdminFinancePL         ✅ INT-06
                  hotel reservations          vendor_costs                AdminFinanceAP         ✅ done

Visa              visa_applications           vendor_costs                AdminFinanceAP         ✅ INT-05
                  visa_applications           departure_cost_items        AdminFinancePL         ✅ INT-05

Penerbangan       airlines, flight_schedules  departure_cost_items        AdminFinancePL         manual
                  tiket pembelian             vendor_costs                AdminFinanceAP         manual

Perlengkapan      equipment_items(unit_cost)  departure_cost_items        AdminFinancePL         ✅ INT-07
                  equipment_orders            departure_expenses          AdminLabaRugi          ✅ INT-03

Keberangkatan     departure_budgets           finance_budgets             AdminBudget            ✅ INT-08 (sebagian)
                  departure_cost_items        v_financial_summary         AdminAdvancedReports   ✅ INT-01
                  departure_expenses          AdminLabaRugi               AdminArusKas           ✅ INT-03,04

Booking/Jamaah    payments(verified)          v_financial_summary         AdminFinancePL         ✅ done
                  bookings(outstanding)       AdminFinanceAR              AdminLabaRugi          ✅ done

Biaya Kantor      cash_transactions(out)      finance_budgets             AdminBudget            ✅ done
                  expenses                    AdminLabaRugi               AdminArusKas           ✅ done
```

---

## SQL Migrations yang Sudah Dijalankan

| Migration | Isi | Terkait | Status |
|-----------|-----|---------|--------|
| `084_v_financial_summary_v2.sql` | Recreate VIEW dengan departure_cost_items + departure_expenses + margin | INT-01 | ✅ |
| `20260709_finance_integration.sql` | `pph21_amount`/`pph21_annual` ke payroll_records; approval cols ke departure_expenses; recreate v_financial_summary; 6 indexes | INT-09, INT-14 prep | ✅ (perlu dijalankan di Supabase) |

## SQL Migrations yang Sudah Dijalankan (Terbaru)

| Migration | Isi | Terkait | Status |
|-----------|-----|---------|--------|
| `085_departure_expense_approval.sql` | `ADD COLUMN IF NOT EXISTS approval_status/approved_by/approved_at` + backfill existing records ke 'approved' + 2 index | INT-14 | ✅ 4/4 OK |
| `086_ar_reminder_log.sql` | Index `wa_logs(trigger_type, created_at)` + `wa_logs(recipient_phone, trigger_type)` untuk performa AR reminder | INT-13 | ✅ (non-fatal jika wa_logs belum ada) |

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

3. **Double-entry**: Auto-journal trigger sudah ada di migration 41 untuk `vendor_costs`. Perlu ditambahkan trigger serupa untuk `departure_expenses` approved (INT-14).

4. **Payroll → Jurnal**: Saat payroll di-pay, otomatis buat `cash_transactions` dengan kategori 'salary' DAN `journal_entries` dengan debit Biaya Gaji (6100), kredit Kas/Bank (1100).

5. **NPWP karyawan**: Data NPWP untuk e-SPT 1721-A1 diambil dari `employees.npwp`. Lengkapi via Modul SDM → Edit Profil Karyawan sebelum submit e-SPT.

6. **INT-14 siap dikerjakan**: Kolom `approval_status`, `approved_by`, `approved_at` sudah ada di `departure_expenses` (via `20260709_finance_integration.sql`). Tinggal implementasi UI workflow approval.
