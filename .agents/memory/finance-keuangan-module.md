---
name: Finance Keuangan K-01 to K-13
description: Status implementasi semua 13 modul akuntansi/keuangan di Vinstour Portal
---

# Finance Keuangan Module — K-01 to K-13

**Why:** Semua 13 modul diimplementasikan dalam satu sesi; detail ini membantu sesi berikutnya untuk melanjutkan dari sini tanpa re-discovery.

## Semua Files yang Dibuat/Dimodifikasi

| K-# | File | Route |
|-----|------|-------|
| K-01 | AdminJurnalUmum.tsx (sudah ada) | /admin/finance/jurnal |
| K-02 | AdminBukuBesar.tsx (baru) | /admin/finance/buku-besar |
| K-03 | AdminNeracaSaldo.tsx (baru) | /admin/finance/neraca-saldo |
| K-04 | AdminLabaRugi.tsx (baru) | /admin/finance/laba-rugi |
| K-05 | AdminNeraca.tsx (baru) | /admin/finance/neraca |
| K-06 | AdminArusKas.tsx (baru) | /admin/finance/arus-kas |
| K-07 | AdminFinanceAR.tsx (enhanced) | /admin/finance/ar |
| K-08 | AdminFinanceAP.tsx (enhanced + calendar tab) | /admin/finance/ap |
| K-09 | AdminFinanceCash.tsx (enhanced + proyeksi tab) | /admin/finance-cash |
| K-11 | AdminBudget.tsx (baru) | /admin/finance/budget |
| K-12 | AdminRekonsiliasi.tsx (baru) | /admin/finance/rekonsiliasi |
| K-13 | AdminLaporanPajak.tsx (baru) | /admin/finance/laporan-pajak |

## K-10 Status
K-10 (COA integrasi otomatis ke transaksi) masih PARTIAL — COA table ada (`coa_categories`), tapi auto-posting jurnal dari transaksi kas/AP/AR belum di-wire. Perlu event-driven hooks atau trigger di API server.

## SQL Migration
`migrations/keuangan-fase1-accounting.sql` — buat tabel: journal_entries, journal_entry_lines, finance_budgets, bank_reconciliations, reconciliation_items. Harus dirun di Neon database.

## Permissions
Semua permission key di `artifacts/umrah-haji/src/lib/permissions.ts`: JURNAL_UMUM, BUKU_BESAR, NERACA_SALDO, LABA_RUGI, NERACA, ARUS_KAS, BUDGET, REKONSILIASI, LAPORAN_PAJAK.

## Navigation
- SuperAdminPanel.tsx — finance shortcuts ditambah 9 item baru
- CommandPalette.tsx — search keywords ditambah 9 entri baru
- Sidebar nav tidak berubah (role-based, otomatis dari permissions)

## AP Calendar Tab (K-08)
APKalenderTab function di bawah export default di AdminFinanceAP.tsx. Menggunakan `apData` sebagai prop (bukan `costs`). APKalenderTab menampilkan timeline jatuh tempo + overdue/7hari/30hari summary cards.

## Proyeksi Tab (K-09)
ProyeksiTab function di bawah SummaryTab di AdminFinanceCash.tsx. Fetch vendor_costs dengan due_date dalam 30 hari ke depan + cash balance. Alert jika proyeksi saldo negatif.

## Tax Report (K-13)
AdminLaporanPajak.tsx — 3 tabs: Rekapitulasi (per bulan), PPN (11%), PPh 21/23. Semua angka adalah ESTIMASI (disclaimer sudah ada di UI). Basis: payments approved (revenue), vendor_costs (PPh 23), salary cash_transactions (PPh 21).

**How to apply:** Jika ada perlu menambah fitur baru ke modul keuangan, cek file-file di atas dulu sebelum membuat yang baru. Hindari duplikasi.
