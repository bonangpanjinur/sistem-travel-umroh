# 🚨 RENCANA DARURAT — Gap & Pekerjaan Belum Selesai
> **Dibuat:** 9 Juni 2026  
> **Sumber:** Audit menyeluruh terhadap `rencanabookingdetail.md`, `rencanacabangdanagensertasdm.md`, `rencanakeberangkatandanpaket.md`, dan `rencana.md`  
> **Metode:** Verifikasi langsung ke kode + migration files — bukan hanya dari dokumen rencana  

---

## ✅ KOREKSI STATUS — FITUR YANG SUDAH ADA TAPI SALAH DITANDAI BELUM

Sebelum membahas gap, berikut item yang di dokumen rencana masih ❌/❓ tapi **sebenarnya sudah ada di kode:**

| Item di Rencana | Status Aktual | Bukti |
|-----------------|---------------|-------|
| P3.2 Package Groups | ✅ SUDAH ADA | `AdminPackages.tsx` baca/tulis `package_groups` table; `BrowseByGroup.tsx` query groups; filter pills di `/packages` |
| P3.3 Duplikat Jadwal + Copy HPP | ✅ SUDAH ADA | `AdminDepartures.tsx` punya `copyHPP` state + checkbox "Salin HPP Template" di dialog duplikat |
| P3.5 Bulk Status Change Jadwal | ✅ SUDAH ADA | `bulkStatusMutation` di `AdminDepartures.tsx` line 411 |
| FIX-HR3 Rekap Absensi Bulanan | ✅ SUDAH ADA | `AdminHRAbsensiRekap.tsx` (412 baris, penuh fitur) |
| SDM-01 Training Staf Internal | ✅ SUDAH ADA | `target_audience` kolom, `staff_training_progress`, ESS training |
| SDM-02 ESS Portal | ✅ SUDAH ADA | 8 halaman: `ESSAbsensi`, `ESSCareerHistory`, `ESSDashboard`, `ESSLeaveRequest`, `ESSLogin`, `ESSPayrollSlips`, `ESSProfile`, `ESSTraining` |
| SDM-03 Payroll Komponen Dinamis | ✅ SUDAH ADA | `AdminPayroll.tsx` query `payroll_components` + `employee_payroll_components` |
| SDM-04 Surat Peringatan (SP) | ✅ SUDAH ADA | `AdminSP.tsx` + `disciplinary_records` di `AdminHR.tsx` |
| SDM-05 Riwayat Karir & Promosi | ✅ SUDAH ADA | `AdminHR.tsx` + `ESSCareerHistory.tsx` query `career_history` |
| SDM-06 Manajemen Kontrak | ✅ SUDAH ADA | `AdminHR.tsx` query `employee_contracts` CRUD |
| SDM-07 Rekrutmen / ATS | ✅ SUDAH ADA | `AdminRecruitment.tsx` |
| SDM-08 Dashboard Analitik SDM | ✅ SUDAH ADA | `AdminHRAnalytics.tsx` |
| Sprint A Komisi Otomatis (SQL) | ✅ SQL SIAP | `supabase/migrations/20260608_sdm_and_commission_triggers.sql` — **tapi perlu dijalankan manual di Supabase Dashboard** |
| C-01/C-02/C-03 KTP Sub-Agen | ✅ SUDAH ADA | `DaftarSubAgen.tsx` upload ke bucket `agent-ktp`; `AdminAgentDetail.tsx` preview KTP |

---

## 🔴 PRIORITAS 1 — KRITIS (Langsung Dikerjakan)

Gap nyata yang **menghalangi akurasi data atau operasional sehari-hari**.

---

### P1-A: DB Trigger Auto-Recalculate P&L Keberangkatan
**ID:** FIX-F1 / D-G2  
**Modul:** HPP & Keuangan Keberangkatan  
**Masalah:** Fungsi `recalculate_departure_financial_summary(p_departure_id)` sudah ada di DB, tapi **tidak pernah dipanggil otomatis**. Setiap kali ada booking baru, pembayaran baru, atau pengeluaran berubah — staff harus klik tombol "Hitung Ulang" manual. Kalau lupa, laporan P&L stale.  
**Solusi:** SQL migration — tambah trigger pada tabel `bookings` dan `payments`.  
**Estimasi:** 1 jam (hanya SQL)  
**SQL yang perlu dibuat:**
```sql
-- Trigger saat booking berubah (status, total_price)
CREATE OR REPLACE FUNCTION trg_refresh_departure_pl()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.departure_id IS NOT NULL THEN
    PERFORM recalculate_departure_financial_summary(NEW.departure_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_refresh_pl
  AFTER INSERT OR UPDATE OF booking_status, total_price, departure_id ON bookings
  FOR EACH ROW EXECUTE FUNCTION trg_refresh_departure_pl();

-- Trigger saat payment berubah
CREATE OR REPLACE FUNCTION trg_payment_refresh_departure_pl()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE v_dep_id UUID;
BEGIN
  SELECT departure_id INTO v_dep_id FROM bookings WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);
  IF v_dep_id IS NOT NULL THEN
    PERFORM recalculate_departure_financial_summary(v_dep_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payment_refresh_pl
  AFTER INSERT OR UPDATE OR DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION trg_payment_refresh_departure_pl();
```
**File target:** Buat `artifacts/umrah-haji/supabase/migrations/20260609_departure_pl_auto_triggers.sql`  
**Jalankan di:** Supabase Dashboard SQL Editor

---

### P1-B: Tab Kinerja di AdminHR — Tabel performance_reviews Tidak Ada di Schema
**ID:** HR-G2 (parsial)  
**Modul:** HR — Evaluasi Kinerja  
**Masalah:** `AdminHR.tsx` baris 523 punya comment `// Note: performance_reviews table not available in current schema`. UI form penilaian kinerja ada tapi tidak bisa menyimpan apapun.  
**Solusi:** SQL migration buat tabel + sambungkan ke UI.  
**Estimasi:** 1.5 jam  
**SQL yang perlu dibuat:**
```sql
CREATE TABLE IF NOT EXISTS performance_reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id      UUID REFERENCES auth.users(id),
  review_period    TEXT NOT NULL,  -- format: "2026-Q2" atau "2026-06"
  quality          INTEGER CHECK (quality BETWEEN 1 AND 5),
  productivity     INTEGER CHECK (productivity BETWEEN 1 AND 5),
  initiative       INTEGER CHECK (initiative BETWEEN 1 AND 5),
  teamwork         INTEGER CHECK (teamwork BETWEEN 1 AND 5),
  attendance       INTEGER CHECK (attendance BETWEEN 1 AND 5),
  overall_score    NUMERIC(3,2) GENERATED ALWAYS AS (
    (quality + productivity + initiative + teamwork + attendance)::NUMERIC / 5
  ) STORED,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, review_period)
);
```
**File target:** `artifacts/umrah-haji/supabase/migrations/20260609_performance_reviews.sql`  
**UI target:** `AdminHR.tsx` — hapus comment "not available", sambungkan form ke tabel baru.

---

### P1-C: Input Lembur (Overtime) di Payroll
**ID:** FIX-HR4 / HR-G3  
**Modul:** HR — Payroll  
**Masalah:** Kolom `overtime_hours` dan `overtime_pay` sudah ada di tabel `payroll_records`, tapi `AdminPayroll.tsx` tidak ada UI untuk mengisi nilai ini. Lembur tidak pernah terhitung.  
**Solusi:** Tambah form input `overtime_hours` + kalkulasi otomatis `overtime_pay = (salary / 173) × 1.5 × overtime_hours` di AdminPayroll.tsx.  
**Estimasi:** 2 jam  
**File target:** `artifacts/umrah-haji/src/pages/admin/AdminPayroll.tsx`

---

### P1-D: Warning Margin Negatif di DepartureCostItemsCard
**ID:** FIX-F2 / P-G2 / F-G2  
**Modul:** HPP Keberangkatan  
**Masalah:** Staff bisa input HPP total lebih besar dari harga jual (revenue) tanpa peringatan apapun. Departure bisa berjalan dengan margin merah dan tidak ada yang tahu.  
**Solusi:** Tambah validasi di `DepartureCostItemsCard.tsx` — tampilkan banner merah jika `total_cost_idr > gross_revenue`.  
**Estimasi:** 1 jam  
**File target:** `artifacts/umrah-haji/src/components/admin/DepartureCostItemsCard.tsx`

---

## 🟠 PRIORITAS 2 — PENTING (Kerjakan Minggu Ini)

Gap yang mempengaruhi keakuratan data atau pengalaman staff secara signifikan.

---

### P2-A: SQL Migration Commission Triggers Belum Dijalankan
**ID:** Sprint A (Komisi Otomatis)  
**Modul:** Komisi Agen & Cabang  
**Masalah:** File `supabase/migrations/20260608_sdm_and_commission_triggers.sql` sudah dibuat (trigger `trg_auto_commission`) tapi **belum dijalankan di Supabase**. Artinya komisi agen dan cabang masih tidak otomatis ter-insert saat booking dikonfirmasi.  
**Solusi:** Jalankan file migration tersebut di Supabase Dashboard SQL Editor.  
**Estimasi:** 5 menit  
**Action:** Copy isi file ke Supabase SQL Editor → Run  
**File:** `artifacts/umrah-haji/supabase/migrations/20260608_sdm_and_commission_triggers.sql`

---

### P2-B: booking_line_items Belum Diisi Saat Booking Dibuat
**ID:** FIX-P1 / F-G4 / P-G1  
**Modul:** Booking — Rincian Tagihan  
**Masalah:** Tabel `booking_line_items` sudah ada dan dibaca di `AdminBookingDetail.tsx`, tapi saat booking dibuat via wizard (`BookingPage.tsx`) tidak ada INSERT ke tabel ini. Total booking masih dari `bookings.total_price` langsung, bukan dari penjumlahan line items.  
**Solusi:** Di `StepReviewDynamic.tsx` atau submission handler booking, tambah INSERT ke `booking_line_items` (per tipe jamaah, per kamar, addon, diskon).  
**Estimasi:** 3 jam  
**File target:** `artifacts/umrah-haji/src/components/booking/StepReviewDynamic.tsx`

---

### P2-C: Biaya Equipment Tidak Otomatis Masuk HPP Departure
**ID:** E-G1  
**Modul:** Perlengkapan → HPP  
**Masalah:** Setiap distribusi perlengkapan punya harga satuan, tapi tidak ada mekanisme untuk mentransfer total biaya equipment ke `departure_cost_items`. HPP tidak mencerminkan biaya nyata perlengkapan.  
**Solusi:** Tombol "Impor ke HPP" di `EquipmentRealizationTab.tsx` — hitung total biaya per departure dari `equipment_distributions` × `equipment_master.unit_cost`, insert sebagai satu baris di `departure_cost_items` dengan kategori "Perlengkapan".  
**Estimasi:** 3 jam  
**File target:** `artifacts/umrah-haji/src/components/admin/EquipmentRealizationTab.tsx`

---

### P2-D: Auto Expiry Paket — Paket Kadaluarsa Masih Tampil Publik
**ID:** P-G3  
**Modul:** Paket — Website Publik  
**Masalah:** Tidak ada mekanisme untuk otomatis menonaktifkan paket yang semua jadwalnya sudah lewat. Paket lama terus tampil di website publik.  
**Solusi dua opsi:**
1. **Frontend filter** — di `PackageList.tsx` filter paket yang semua departure-nya `departure_date < today` (cepat, tidak butuh SQL)
2. **Supabase cron** — `check-package-expiry` edge function (lebih proper)  

**Rekomendasi:** Opsi 1 dulu (30 menit), opsi 2 nanti.  
**Estimasi:** 30 menit  
**File target:** `artifacts/umrah-haji/src/pages/public/PackageList.tsx`

---

## 🟡 PRIORITAS 3 — NICE TO HAVE (Bulan Ini)

Enhancement yang meningkatkan efisiensi operasional.

---

### P3-A: Bulk Edit HPP Cost Items
**ID:** D-G3 / FIX-D1  
**Modul:** HPP Keberangkatan  
**Masalah:** Staff harus edit cost items satu per satu. Jika ada perubahan harga massal (misal kurs dollar naik), harus edit 20+ baris manual.  
**Solusi:** Mode "Edit Semua" di `DepartureCostItemsCard.tsx` — tabel editable inline, satu tombol simpan semua.  
**Estimasi:** 4 jam

---

### P3-B: Analytics Conversion Rate Per Paket
**ID:** P3.4 / P-G6  
**Modul:** Paket — Analytics  
**Masalah:** `AdminPackageDetail.tsx` tidak menampilkan conversion rate (views → booking). Tidak bisa ukur efektivitas marketing per paket.  
**Solusi:** Tambah view counter saat halaman publik paket dibuka (`packages.view_count++`), lalu di `AdminPackageDetail.tsx` tampilkan `bookings / view_count × 100%`.  
**Estimasi:** 3 jam

---

### P3-C: Rekonsiliasi Otomatis Pembayaran vs Tagihan
**ID:** F-G5  
**Modul:** Keuangan  
**Masalah:** Tidak ada cron/check otomatis yang mendeteksi booking di mana `paid_amount ≠ total_price` tapi status `paid`. Selisih tidak terdeteksi secara periodik.  
**Solusi:** Halaman `AdminFinanceTerpadu.tsx` — tab "Rekonsiliasi" yang list semua booking dengan selisih > 0. Bisa juga sebagai Supabase edge function terjadwal.  
**Estimasi:** 4 jam

---

### P3-D: General Ledger / Chart of Accounts
**ID:** F-G3  
**Modul:** Keuangan  
**Masalah:** Tidak ada buku besar formal. Tidak bisa generate laporan akuntansi standar (neraca, laba-rugi formal).  
**Solusi:** Tabel `chart_of_accounts` + `journal_entries` + halaman `AdminGeneralLedger.tsx`.  
**Estimasi:** 5-7 hari (scope besar)

---

### P3-E: PO Khusus Equipment & Serial Number Tracking
**ID:** E-G2, E-G3  
**Modul:** Perlengkapan  
**Masalah:** PO equipment campur dengan PO umum. Barang mahal (koper) tidak bisa di-trace kondisinya.  
**Solusi:** Filter PO by kategori "equipment" + kolom `serial_number`, `condition` di `equipment_master`.  
**Estimasi:** 3 jam

---

## ❌ TIDAK BISA DIKERJAKAN (External Dependency)

| ID | Fitur | Alasan |
|----|-------|--------|
| D-G1 | SISKOHAT API Kemenag | Butuh akses API resmi dari Kementerian Agama — tidak bisa dikerjakan tanpa credentials |
| D-G4 | Live GPS Tracking Rombongan | Butuh integrasi GPS hardware atau provider tracking pihak ketiga |

---

## 📋 RINGKASAN PRIORITAS

```
┌─────────────────────────────────────────────────────────────────────┐
│  🔴 P1 — KRITIS (kerjakan segera, impact tinggi)                   │
│                                                                     │
│  P1-A  DB Trigger Auto P&L Departure         ~1 jam   (SQL only)   │
│  P1-B  Tabel performance_reviews + UI fix    ~1.5 jam              │
│  P1-C  Input Lembur/Overtime di Payroll       ~2 jam               │
│  P1-D  Warning Margin Negatif HPP             ~1 jam               │
│                                                                     │
│  TOTAL P1: ~5.5 jam                                                 │
├─────────────────────────────────────────────────────────────────────┤
│  🟠 P2 — PENTING (kerjakan minggu ini)                              │
│                                                                     │
│  P2-A  Jalankan SQL commission triggers       5 menit (manual)     │
│  P2-B  booking_line_items saat booking dibuat ~3 jam               │
│  P2-C  Biaya equipment → HPP departure        ~3 jam               │
│  P2-D  Auto expiry paket kadaluarsa           ~30 menit            │
│                                                                     │
│  TOTAL P2: ~6.5 jam                                                 │
├─────────────────────────────────────────────────────────────────────┤
│  🟡 P3 — NICE TO HAVE (bulan ini jika ada waktu)                   │
│                                                                     │
│  P3-A  Bulk edit HPP cost items               ~4 jam               │
│  P3-B  Analytics conversion rate paket        ~3 jam               │
│  P3-C  Rekonsiliasi otomatis pembayaran        ~4 jam               │
│  P3-D  General Ledger / Chart of Accounts     ~5-7 hari            │
│  P3-E  PO Equipment + Serial Number           ~3 jam               │
│                                                                     │
│  TOTAL P3: ~20 jam                                                  │
└─────────────────────────────────────────────────────────────────────┘

Grand Total P1+P2: ~12 jam kerja
```

---

## ⚡ URUTAN EKSEKUSI YANG DISARANKAN

1. **[5 mnt]** Jalankan `20260608_sdm_and_commission_triggers.sql` di Supabase SQL Editor → komisi agen otomatis aktif
2. **[1 jam]** Buat + jalankan SQL trigger P&L (`20260609_departure_pl_auto_triggers.sql`) → P&L selalu akurat
3. **[1.5 jam]** Buat + jalankan SQL `performance_reviews` + fix UI `AdminHR.tsx` → kinerja karyawan bisa dicatat
4. **[1 jam]** Warning margin negatif di `DepartureCostItemsCard.tsx` → proteksi margin
5. **[2 jam]** Input lembur di `AdminPayroll.tsx` → payroll akurat
6. **[30 mnt]** Auto-filter paket kadaluarsa di `PackageList.tsx` → website bersih
7. **[3 jam]** booking_line_items insert saat booking dibuat → rincian tagihan akurat
8. **[3 jam]** Tombol "Impor ke HPP" di equipment tab → HPP akurat

---

*Dokumen ini adalah panduan tindakan darurat. Update setiap item ke ✅ saat selesai dikerjakan.*
