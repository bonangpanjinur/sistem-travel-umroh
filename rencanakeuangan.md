# Rencana Perbaikan & Pengembangan Modul Keuangan
> Vinstour Travel — Umroh & Haji Management Portal
> Terakhir diperbarui: Juni 2026

---

## Status Saat Ini (Update Juni 2026)

### ✅ Semua Fase Selesai Diimplementasikan

| K-# | Fitur | Route | File | Status |
|-----|-------|-------|------|--------|
| K-01 | Jurnal Umum | `/admin/finance/jurnal` | AdminJurnalUmum.tsx | ✅ DONE |
| K-02 | Buku Besar | `/admin/finance/buku-besar` | AdminBukuBesar.tsx | ✅ DONE |
| K-03 | Neraca Saldo | `/admin/finance/neraca-saldo` | AdminNeracaSaldo.tsx | ✅ DONE |
| K-04 | Laba Rugi Formal | `/admin/finance/laba-rugi` | AdminLabaRugi.tsx | ✅ DONE |
| K-05 | Neraca (Balance Sheet) | `/admin/finance/neraca` | AdminNeraca.tsx | ✅ DONE |
| K-06 | Arus Kas | `/admin/finance/arus-kas` | AdminArusKas.tsx | ✅ DONE |
| K-07 | AR Aging Analysis | `/admin/finance/ar` | AdminFinanceAR.tsx | ✅ DONE (aging cards + filter + kolom) |
| K-08 | AP Kalender Jatuh Tempo | `/admin/finance/ap` | AdminFinanceAP.tsx | ✅ DONE (tab kalender + timeline) |
| K-09 | Kas Proyeksi 30 Hari | `/admin/finance-cash` | AdminFinanceCash.tsx | ✅ DONE (tab proyeksi + alert negatif) |
| K-10 | COA Integrasi Transaksi | — | `40_accounting_tables.sql` | ✅ DONE (account_code di cash_transactions, payments, vendor_costs) |
| K-11 | Budget vs Aktual | `/admin/finance/budget` | AdminBudget.tsx | ✅ DONE |
| K-12 | Rekonsiliasi Bank | `/admin/finance/rekonsiliasi` | AdminRekonsiliasi.tsx | ✅ DONE |
| K-13 | Laporan Pajak | `/admin/finance/laporan-pajak` | AdminLaporanPajak.tsx | ✅ DONE (PPN + PPh 21/23) |

### SQL Migration
File: `migrations/keuangan-fase1-accounting.sql`
Tabel baru: `journal_entries`, `journal_entry_lines`, `finance_budgets`, `bank_reconciliations`, `reconciliation_items`

### ✅ Semua Selesai — Tidak Ada Pending

K-10 diselesaikan via `40_accounting_tables.sql`:
- `account_code` ditambah ke `cash_transactions`, `payments`, `vendor_costs`
- Auto-populate account_code dari transaction type (income=4100, expense=6100, vendor=6200)
- Migration dijalankan otomatis via `runMigrations.ts` (step 40)
- Auto-journal posting dari transaksi: bisa dikerjakan di fase lanjutan via DB trigger

---

## Rencana Perbaikan (Prioritas)

---

### 🔴 PRIORITAS 1 — Akuntansi Dasar (Fondasi)

#### K-01: Jurnal Umum (General Journal)
**Route:** `/admin/finance/jurnal`
**Halaman:** `AdminJurnalUmum.tsx`

Fitur:
- Input jurnal manual (debit/kredit per baris)
- Validasi total debit = total kredit
- Pilih akun dari COA
- Referensi ke transaksi sumber (booking/payment/expense)
- Filter per tanggal, akun, jenis
- Export PDF & Excel
- Nomor jurnal otomatis (JU-2026-XXXX)

Tabel DB baru:
```sql
journal_entries (id, entry_date, entry_number, description, ref_type, ref_id, created_by)
journal_entry_lines (id, entry_id, account_code, debit, credit, description)
```

---

#### K-02: Buku Besar (General Ledger)
**Route:** `/admin/finance/buku-besar`
**Halaman:** `AdminBukuBesar.tsx`

Fitur:
- Pilih akun COA → tampil semua mutasi
- Saldo awal, total debit, total kredit, saldo akhir
- Filter per periode
- Tampilan tabel kronologis
- Export PDF per akun

Sumber data: `journal_entry_lines` JOIN `journal_entries`

---

#### K-03: Neraca Saldo (Trial Balance)
**Route:** `/admin/finance/neraca-saldo`
**Halaman:** `AdminNeracaSaldo.tsx`

Fitur:
- Tampil semua akun dengan total debit & kredit
- Validasi total debit = total kredit
- Filter per periode
- Export Excel/PDF
- Highlight akun yang salah saldo

---

### 🟠 PRIORITAS 2 — Laporan Keuangan Formal

#### K-04: Laporan Laba Rugi Formal (Income Statement)
**Route:** `/admin/finance/laba-rugi`
**Halaman:** `AdminLabaRugi.tsx`

Fitur:
- Pendapatan usaha (booking revenue)
- HPP per keberangkatan (biaya operasional perjalanan)
- Laba Kotor
- Biaya Operasional (overhead, marketing, gaji)
- Laba Bersih
- Perbandingan antar bulan/tahun
- Export PDF format PSAK

---

#### K-05: Laporan Neraca (Balance Sheet)
**Route:** `/admin/finance/neraca`
**Halaman:** `AdminNeraca.tsx`

Fitur:
- Aset Lancar: kas, piutang, tabungan jamaah
- Aset Tidak Lancar: aset tetap, deposito
- Kewajiban Lancar: hutang vendor, hutang jangka pendek
- Ekuitas: modal, laba ditahan
- Validasi Aset = Kewajiban + Ekuitas
- Export PDF format standar

---

#### K-06: Laporan Arus Kas (Cash Flow Statement)
**Route:** `/admin/finance/arus-kas`
**Halaman:** `AdminArusKas.tsx`

Fitur:
- Arus Kas Operasional (penerimaan booking, pembayaran vendor)
- Arus Kas Investasi (aset tetap)
- Arus Kas Pendanaan (modal, pinjaman)
- Metode langsung (direct method)
- Filter per periode
- Chart visualisasi
- Export PDF

---

### 🟡 PRIORITAS 3 — Peningkatan Fitur yang Sudah Ada

#### K-07: AR — Aging Analysis
**Halaman:** `AdminFinanceAR.tsx` (perbaikan)

Tambahan:
- Kolom aging: 0-30 hari, 31-60 hari, 61-90 hari, >90 hari
- Summary card per bucket aging
- Highlight booking overdue merah
- Kirim reminder WA langsung dari tabel

---

#### K-08: AP — Kalender Jatuh Tempo
**Halaman:** `AdminFinanceAP.tsx` (perbaikan)

Tambahan:
- Tab "Kalender" — timeline visual jatuh tempo vendor
- Alert vendor yang jatuh tempo H-7 dan H-3
- Total hutang jatuh tempo bulan ini vs bulan depan
- Tombol "Tandai Lunas" langsung dari daftar

---

#### K-09: Kas — Proyeksi Arus Kas
**Halaman:** `AdminFinanceCash.tsx` (perbaikan)

Tambahan:
- Tab "Proyeksi" — perkiraan cash in/out 30 hari ke depan
- Ambil data dari: cicilan jatuh tempo, AP jatuh tempo, keberangkatan upcoming
- Chart proyeksi saldo kas
- Alert jika proyeksi saldo negatif

---

#### K-10: COA — Integrasi ke Semua Transaksi
Pekerjaan backend:
- Tambah `account_code` ke tabel `cash_transactions`
- Tambah `account_code` ke tabel `payments`
- Tambah `account_code` ke tabel `vendor_costs`
- Auto-posting jurnal saat transaksi terjadi
- Tampil akun COA di form input kas/AP/AR

---

### 🟢 PRIORITAS 4 — Fitur Lanjutan

#### K-11: Budget vs Aktual
**Route:** `/admin/finance/budget`
**Halaman:** `AdminBudget.tsx`

Fitur:
- Input anggaran per bulan per kategori COA
- Tampil realisasi vs anggaran
- % penyerapan anggaran
- Alert kategori yang melebihi budget
- Chart bar grouped

Tabel DB baru:
```sql
finance_budgets (id, period_year, period_month, account_code, budget_amount, notes)
```

---

#### K-12: Rekonsiliasi Bank
**Route:** `/admin/finance/rekonsiliasi`
**Halaman:** `AdminRekonsiliasi.tsx`

Fitur:
- Input saldo bank per rekening
- Cocokkan dengan saldo buku kas
- Tandai transaksi yang sudah reconciled
- Laporan selisih rekonsiliasi
- Simpan rekonsiliasi per bulan

Tabel DB baru:
```sql
bank_reconciliations (id, account_id, period_date, bank_balance, book_balance, difference, status)
reconciliation_items (id, reconciliation_id, transaction_id, is_reconciled, notes)
```

---

#### K-13: Laporan Pajak (Tax Report)
**Route:** `/admin/finance/pajak`
**Halaman:** `AdminLaporanPajak.tsx`

Fitur:
- PPh 21 karyawan (dari data payroll)
- PPh 23 jasa vendor
- PPN jika berlaku
- Export e-SPT compatible

---

## Ringkasan Urutan Pengerjaan

```
Fase 1 (Fondasi Akuntansi):
  K-01 → Jurnal Umum
  K-02 → Buku Besar
  K-03 → Neraca Saldo

Fase 2 (Laporan Formal):
  K-04 → Laba Rugi Formal
  K-05 → Neraca (Balance Sheet)
  K-06 → Arus Kas

Fase 3 (Penyempurnaan):
  K-07 → AR Aging
  K-08 → AP Kalender
  K-09 → Kas Proyeksi
  K-10 → COA Integrasi Transaksi

Fase 4 (Lanjutan):
  K-11 → Budget vs Aktual
  K-12 → Rekonsiliasi Bank
  K-13 → Laporan Pajak
```

---

## Tabel DB yang Perlu Dibuat

| Tabel | Kebutuhan | Prioritas |
|-------|-----------|-----------|
| `journal_entries` | Jurnal Umum (K-01) | P1 |
| `journal_entry_lines` | Jurnal Umum (K-01) | P1 |
| `finance_budgets` | Budget (K-11) | P4 |
| `bank_reconciliations` | Rekonsiliasi (K-12) | P4 |
| `reconciliation_items` | Rekonsiliasi (K-12) | P4 |

Kolom tambahan di tabel yang ada:
| Tabel | Kolom Tambahan | Kebutuhan |
|-------|---------------|-----------|
| `cash_transactions` | `account_code` | K-10 |
| `payments` | `account_code` | K-10 |
| `vendor_costs` | `account_code` | K-10 (sudah ada sebagian) |

---

## Catatan Teknis

- Semua laporan formal (K-04, K-05, K-06) bergantung pada data jurnal (K-01)
- COA yang sudah ada (`coa_categories`) dipakai sebagai basis — tidak perlu tabel baru untuk akun
- Nomor jurnal: format `JU-YYYY-NNNN` (auto-increment per tahun)
- Double-entry: setiap jurnal harus balance (total debit = total kredit)
- Sumber data jurnal: bisa manual atau auto-generated dari transaksi kas/AR/AP
