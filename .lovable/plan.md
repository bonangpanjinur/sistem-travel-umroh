

# Rencana Perbaikan 5 Fitur

## 1. Fix Kamar: Error `.single()` pada Update Room Number

**Masalah**: `updateRoomMutation` di `AdminRoomAssignments.tsx` line 134 menggunakan `.select().single()`. Jika update tidak match row (misal RLS block), `.single()` throw error "Cannot coerce the result to a single JSON object".

**Solusi**: Ganti `.select('id, room_number').single()` menjadi `.select('id, room_number').maybeSingle()` dan handle null result.

**File**: `src/pages/admin/AdminRoomAssignments.tsx` (line 134)

---

## 2. Pembayaran: Perjelas Aksi Verifikasi

**Masalah**: Tombol aksi di tabel "Semua Pembayaran" hanya ikon kecil tanpa label -- sulit dibedakan. Pending card sudah bagus, tapi tabel kurang jelas.

**Solusi**:
- Ganti tombol ikon di tabel (lines 589-624) menjadi tombol dengan label teks: "Lihat Bukti", "Setujui", "Tolak"
- Tambah kolom "Progress Booking" di tabel showing paid_amount/total_price progress
- Disable "Setujui" jika `proof_url` null (sudah ada di pending card, belum di tabel)
- Tambah tooltip pada tombol disabled

**File**: `src/pages/admin/AdminPayments.tsx`

---

## 3. Slip Gaji Auto-Generate dari Data HR/Absensi

**Masalah**: Slip gaji di `SalaryTab` (AdminFinanceCash.tsx) harus manual input per karyawan. Padahal data absensi dan gaji pokok sudah ada di HR.

**Solusi**: Tambah tombol **"Generate Semua Slip Gaji"** yang:
1. Fetch semua `employees` aktif
2. Fetch `attendance_records` untuk bulan/tahun terpilih
3. Hitung otomatis: `base_salary` dari employee, `deductions` dari absen/telat (menggunakan logika yang sudah ada di `AdminPayroll.tsx` lines 82-130), `overtime_pay` dan `allowances` dari data HR
4. Bulk insert ke `salary_payments` untuk semua karyawan yang belum punya slip di periode tersebut
5. Skip karyawan yang sudah punya slip gaji di periode itu

**File**: `src/pages/admin/AdminFinanceCash.tsx` (SalaryTab function)

---

## 4. Hapus Menu Vendor dari Keuangan & Akuntansi

**Masalah**: Menu "Vendor" sudah ada di Master Data, duplikasi di Keuangan & Akuntansi tidak perlu.

**Solusi**: Hapus entry `{ label: 'Vendor', icon: Building2, path: '/admin/vendors' }` dari group "Keuangan & Akuntansi" di `NAV_GROUPS` (line 62).

**File**: `src/components/admin/AdminLayout.tsx`

---

## 5. Integrasi HR dengan Keuangan

**Masalah**: Menu SDM (HR) dan Keuangan terpisah. Payroll ada di HR (`/admin/hr/payroll`) tapi slip gaji ada di Kas & Bank.

**Solusi**:
- Tambah link **"Slip Gaji"** di menu SDM (HR) yang mengarah ke `/admin/finance-cash?tab=salary`
- Tambah link **"Data Karyawan"** di menu Keuangan yang mengarah ke `/admin/hr?tab=employees`
- Di `AdminPayroll.tsx`: tambah tombol navigasi "Lihat Slip Gaji di Keuangan" yang redirect ke `/admin/finance-cash?tab=salary`
- Di `SalaryTab`: tambah tombol "Lihat Detail Absensi" yang redirect ke `/admin/hr?tab=attendance`

**File**: `src/components/admin/AdminLayout.tsx`, `src/pages/admin/AdminPayroll.tsx`, `src/pages/admin/AdminFinanceCash.tsx`

---

## Ringkasan File

| File | Perubahan |
|:---|:---|
| `AdminRoomAssignments.tsx` | `.single()` → `.maybeSingle()` |
| `AdminPayments.tsx` | Perjelas tombol aksi di tabel, disable setujui tanpa bukti |
| `AdminFinanceCash.tsx` | Auto-generate slip gaji dari data HR, link ke absensi |
| `AdminLayout.tsx` | Hapus Vendor dari Keuangan, tambah cross-link HR↔Keuangan |
| `AdminPayroll.tsx` | Tambah navigasi ke slip gaji di Keuangan |

