---
name: Finance cross-module integration
description: Aturan integrasi data antar modul SDM/operasional ke laporan keuangan — anti-double-count dan sumber data prioritas.
---

## Aturan Integrasi Laporan Keuangan

### Sumber Data HPP (per keberangkatan)
Tiga sumber — urutan prioritas/kelengkapan:
1. `departure_cost_items` — HPP planned, diisi admin sebelum keberangkatan per kategori (airline/hotel/visa/equipment/dll)
2. `departure_expenses` — HPP realisasi, diisi saat operasional berjalan (amount_idr, expense_date, category)
3. `vendor_costs` — AP formal vendor, dibuat via AdminFinanceAP

**Why:** Sebelum integrasi, v_financial_summary hanya pakai vendor_costs → HPP tidak akurat karena banyak biaya lapangan tidak masuk ke AP formal.

### Anti Double-Count: Gaji Karyawan
- Jika `payroll_records` (status='paid') tersedia untuk periode yang sama → gunakan SUM(net_salary) dari payroll, SKIP cash_transactions.salary
- Jika payroll tidak tersedia → fallback ke cash_transactions.category='salary'
- Badge UI "Gaji dari Modul Payroll" muncul di AdminLabaRugi section C jika payroll dipakai

**Why:** cash_transactions.salary dan payroll_records.net_salary bisa keduanya ada untuk bulan yang sama → double count total gaji.

### PPh21 di Laporan Pajak
- Prioritas 1: `payroll_records.pph21_amount` jika kolom diisi (aktual per slip)
- Prioritas 2: 5% × `payroll_records.gross_salary` (estimasi dari payroll data)
- Fallback: 5% × cash_transactions.salary jika tidak ada payroll data

### Migration 084 — v_financial_summary v2
File: `sql/migrations/084_v_financial_summary_v2.sql`
Terdaftar di `runMigrations.ts` sebagai Step 084.
Kolom baru: `hpp_planned`, `hpp_realized`, `total_ap_vendor`, `net_margin_pct`, `hpp_variance`.
Menggunakan subquery per-departure (bukan JOIN) untuk menghindari Cartesian product di multi-table aggregation.

### Status INT-01 s/d INT-09 (per Juni 2026)
- INT-01 ✅ v_financial_summary v2 (migration 084)
- INT-02 ✅ AdminFinancePL: 4 tab (Vendor AP / HPP Plan / Realisasi / Perbandingan)
- INT-03 ✅ AdminLabaRugi: departure_expenses B.2 + payroll_records C anti-double
- INT-04 ✅ AdminArusKas: departure_expenses sebagai arus keluar lapangan
- INT-05 ⏳ Auto vendor_cost dari visa batch (belum)
- INT-06 ⏳ Import HPP dari hotel contract (belum)
- INT-07 ⏳ Equipment cost auto-sync (belum)
- INT-08 ✅ AdminBudget: tab "Budget Keberangkatan" (departure_budgets per bulan)
- INT-09 ✅ AdminLaporanPajak: payroll_records PPh21 lebih akurat
