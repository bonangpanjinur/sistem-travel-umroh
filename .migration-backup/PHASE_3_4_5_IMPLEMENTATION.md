# Implementasi Fase 3, 4, dan 5 - Modul Kelola Paket

## Ringkasan Implementasi

Dokumen ini menjelaskan implementasi fitur-fitur lanjutan untuk modul **Kelola Paket** pada aplikasi Vins Tour Travel, mencakup Fase 3 (Milestone & Deadline Alert Tracker), Fase 4 (Equipment Readiness Bar), dan Fase 5 (Break-even Indicator).

---

## Fase 3: Milestone & Deadline Alert Tracker

### Deskripsi Fitur

Fitur ini memungkinkan admin untuk melacak tenggat waktu penting dalam manajemen keberangkatan umroh, seperti:
- **Batas Pengumpulan Dokumen** (document_deadline)
- **Batas Pelunasan Pembayaran** (payment_deadline)
- **Batas Pengurusan Visa** (visa_deadline)

### Implementasi Teknis

#### 1. Database Schema
Kolom baru ditambahkan ke tabel `departures`:
```sql
ALTER TABLE public.departures 
ADD COLUMN IF NOT EXISTS document_deadline DATE,
ADD COLUMN IF NOT EXISTS payment_deadline DATE,
ADD COLUMN IF NOT EXISTS visa_deadline DATE;
```

#### 2. Frontend Components

**File: `src/components/admin/forms/DepartureForm.tsx`**
- Ditambahkan 3 input field untuk milestone deadlines
- Menggunakan date input untuk kemudahan pengisian
- Dikelompokkan dalam section "Fase 3: Milestone & Deadline Tracker" dengan styling biru

**File: `src/pages/admin/AdminPackageDetail.tsx`**
- Fungsi `getMilestoneStatus()` menghitung status milestone berdasarkan selisih hari
- Status milestone:
  - **Terlewati** (merah): Jika deadline sudah lewat
  - **Mendekati** (oranye): Jika deadline dalam 7 hari ke depan
  - **Aman** (hijau): Jika deadline masih jauh
  - **Belum diatur** (abu-abu): Jika deadline belum diatur

#### 3. UI/UX Features

**Di AdminPackageDetail.tsx:**
- Card "Milestone & Deadline" menampilkan ketiga deadline dengan status visual
- Ikon dinamis berubah sesuai status (CheckCircle2, AlertCircle, Clock)
- Warna teks berubah sesuai status urgency
- Format tanggal menggunakan `formatDate()` untuk konsistensi

**Integrasi:**
- Milestone tracker terintegrasi di bagian "Jadwal Keberangkatan & Daftar Jamaah"
- Ditampilkan dalam grid 3 kolom bersama Break-even Indicator dan Equipment Readiness

### Fitur Notifikasi (Future Enhancement)

Untuk fase selanjutnya, dapat ditambahkan:
- Toast notification ketika mendekati deadline
- Email/SMS reminder otomatis
- Dashboard alert untuk admin

---

## Fase 4: Equipment Readiness Bar

### Deskripsi Fitur

Fitur ini menampilkan persentase jamaah dalam paket yang sudah menerima atau memiliki status perlengkapan lengkap. Perlengkapan yang dilacak meliputi:
- Koper (luggage)
- Kain ihram
- Buku doa

### Implementasi Teknis

#### 1. Database Schema

**Kolom baru di `booking_passengers`:**
```sql
ALTER TABLE public.booking_passengers
ADD COLUMN IF NOT EXISTS equipment_status VARCHAR(50) DEFAULT 'pending';
-- Status: pending, partial, completed
```

**Existing table yang digunakan:**
- `equipment_items`: Daftar jenis perlengkapan
- `equipment_distributions`: Tracking distribusi perlengkapan per jamaah

#### 2. Frontend Components

**File: `src/pages/admin/AdminPackageDetail.tsx`**
- Card "Equipment Readiness" menampilkan persentase kelengkapan
- Progress bar menunjukkan visual status
- Placeholder untuk fase ini: 45% dengan 20 dari 45 jamaah

**Logika Perhitungan (Future):**
```typescript
const equipmentReadiness = (
  completedJamaah / totalJamaah
) * 100;
```

#### 3. UI/UX Features

**Di AdminPackageDetail.tsx:**
- Card dengan styling oranye untuk membedakan dari fitur lain
- Progress bar dengan warna oranye
- Menampilkan jumlah jamaah yang sudah menerima perlengkapan
- Responsive design untuk mobile dan desktop

### Data Aggregation (Future Enhancement)

Untuk fase selanjutnya, dapat ditambahkan:
- Supabase view untuk menghitung equipment readiness per departure
- RPC function untuk update status equipment secara bulk
- Integration dengan equipment management module

---

## Fase 5: Break-even Indicator

### Deskripsi Fitur

Fitur ini menampilkan indikator profitabilitas paket berdasarkan titik impas (break-even point). Admin dapat melihat:
- **Titik Impas (BEP)**: Jumlah jamaah minimum untuk mencapai profitabilitas
- **Biaya Operasional per Pax**: Biaya per jamaah untuk perhitungan BEP
- **Status Profitabilitas**: Apakah paket sudah menguntungkan atau belum

### Implementasi Teknis

#### 1. Database Schema

**Kolom baru di `packages` dan `departures`:**
```sql
ALTER TABLE public.packages
ADD COLUMN IF NOT EXISTS break_even_pax INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS operational_cost_per_pax DECIMAL(15,2) DEFAULT 0;

ALTER TABLE public.departures
ADD COLUMN IF NOT EXISTS break_even_pax INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS operational_cost_per_pax DECIMAL(15,2) DEFAULT 0;
```

#### 2. Frontend Components

**File: `src/components/admin/forms/DepartureForm.tsx`**
- Input field untuk "Titik Impas (Pax)"
- Input field untuk "Biaya Ops per Pax"
- Dikelompokkan dalam section "Fase 5: Break-even Indicator" dengan styling hijau

**File: `src/pages/admin/AdminPackageDetail.tsx`**
- Fungsi perhitungan profitabilitas:
  ```typescript
  const isProfitable = breakEven > 0 && totalBooked >= breakEven;
  ```
- Progress bar dengan visual break-even marker
- Status badge "PROFIT" atau "BELUM BEP"

**File: `src/pages/admin/AdminPackages.tsx`**
- Break-even indicator di card paket
- Badge menampilkan "BEP: X" jika sudah ditetapkan
- Garis putus-putus (vertical line) pada progress bar menunjukkan posisi BEP
- Warna berubah menjadi hijau setelah melewati BEP

#### 3. UI/UX Features

**Di AdminPackageDetail.tsx:**
- Card "Profitability Monitoring" dengan styling hijau
- Progress bar dengan:
  - Warna biru sebelum mencapai BEP
  - Warna hijau setelah mencapai BEP
  - Garis vertikal merah menunjukkan posisi BEP
- Menampilkan informasi:
  - Titik impas (BEP)
  - Progress keterisian (Pax)
  - Estimasi kekurangan/kelebihan jamaah untuk mencapai BEP

**Di AdminPackages.tsx:**
- Break-even badge di samping quota badge
- Visual break-even marker pada progress bar
- Equipment readiness indicator (placeholder)

### Perhitungan Break-even

**Formula:**
```
Break-even Point (Pax) = Total Operational Cost / Price per Pax
```

**Contoh:**
- Total operational cost: Rp 450.000.000
- Price per pax (quad): Rp 10.000.000
- Break-even pax: 45 jamaah

### Visualisasi Keuntungan (Future Enhancement)

Untuk fase selanjutnya, dapat ditambahkan:
- Estimasi keuntungan/kerugian real-time
- Chart profitabilitas per room type
- Comparison dengan target profit margin

---

## Integrasi Antar Fitur

### AdminPackageDetail.tsx - Departure Expansion

Ketika admin membuka detail keberangkatan, akan menampilkan 3 card sekaligus:

1. **Milestone & Deadline Card** (Biru)
   - Menampilkan 3 milestone dengan status
   - Ikon dan warna berubah sesuai urgency

2. **Profitability Monitoring Card** (Hijau)
   - Progress bar dengan BEP marker
   - Status PROFIT/BELUM BEP
   - Estimasi kekurangan/kelebihan jamaah

3. **Equipment Readiness Card** (Oranye)
   - Progress bar kelengkapan
   - Jumlah jamaah yang sudah menerima perlengkapan

### AdminPackages.tsx - Package Card Enhancement

Pada card paket, ditampilkan:
- Progress bar dengan BEP marker (garis vertikal)
- Equipment readiness indicator (45%)
- Break-even badge (BEP: X)

---

## File-file yang Dimodifikasi

### 1. Database Migration
- `supabase/migrations/20260421_phase_3_4_5_implementation.sql`
  - Menambahkan kolom untuk Fase 3, 4, dan 5

### 2. Components
- `src/components/admin/forms/DepartureForm.tsx`
  - Menambahkan input fields untuk milestone dan break-even

### 3. Pages
- `src/pages/admin/AdminPackageDetail.tsx`
  - Menambahkan milestone status calculator
  - Menampilkan 3 cards untuk Fase 3, 4, dan 5
  - Enhanced departure expansion UI

- `src/pages/admin/AdminPackages.tsx`
  - Enhanced progress bar dengan BEP marker
  - Equipment readiness indicator
  - Break-even badge

---

## Testing Checklist

### Fase 3: Milestone & Deadline Alert Tracker
- [ ] Dapat menambahkan deadline pada form departure
- [ ] Status milestone berubah sesuai tanggal
- [ ] Ikon dan warna berubah sesuai status
- [ ] Format tanggal konsisten

### Fase 4: Equipment Readiness Bar
- [ ] Progress bar menampilkan persentase
- [ ] Responsive di mobile dan desktop
- [ ] Placeholder data menampilkan dengan benar

### Fase 5: Break-even Indicator
- [ ] Dapat menambahkan break-even pax dan operational cost
- [ ] Progress bar menampilkan BEP marker
- [ ] Status badge berubah sesuai profitabilitas
- [ ] Warna progress bar berubah setelah melewati BEP

### Integration Testing
- [ ] Ketiga card menampilkan bersama di expansion
- [ ] Data persisten setelah save
- [ ] Query performance optimal

---

## Future Enhancements

### Fase 3 Enhancements
- [ ] Automated email/SMS reminders untuk deadline
- [ ] Dashboard alert untuk overdue milestones
- [ ] Milestone completion tracking
- [ ] Historical milestone data

### Fase 4 Enhancements
- [ ] Equipment distribution workflow
- [ ] Per-item equipment tracking
- [ ] Equipment return management
- [ ] Equipment inventory alerts

### Fase 5 Enhancements
- [ ] Dynamic BEP calculation based on costs
- [ ] Profit margin visualization
- [ ] Multi-room-type BEP calculation
- [ ] Financial forecasting

---

## Deployment Notes

1. **Database Migration:**
   - Jalankan migration: `20260421_phase_3_4_5_implementation.sql`
   - Verify kolom berhasil ditambahkan

2. **Frontend Build:**
   - Pastikan tidak ada TypeScript errors
   - Test responsiveness di berbagai ukuran screen

3. **Backward Compatibility:**
   - Kolom baru menggunakan DEFAULT values
   - Existing data tidak terpengaruh
   - Existing queries tetap berfungsi

---

## Dokumentasi API (Future)

Untuk API endpoints yang akan dikembangkan:
- `GET /api/departures/:id/milestones` - Get milestone status
- `PUT /api/departures/:id/milestones` - Update milestones
- `GET /api/departures/:id/equipment-readiness` - Get equipment status
- `GET /api/departures/:id/profitability` - Get break-even info

---

## Kesimpulan

Implementasi Fase 3, 4, dan 5 memberikan admin tools yang komprehensif untuk:
- Melacak tenggat waktu penting (Fase 3)
- Memantau status perlengkapan jamaah (Fase 4)
- Mengukur profitabilitas paket (Fase 5)

Ketiga fitur terintegrasi dengan baik dalam UI dan memberikan insights yang actionable untuk manajemen operasional paket umroh.
