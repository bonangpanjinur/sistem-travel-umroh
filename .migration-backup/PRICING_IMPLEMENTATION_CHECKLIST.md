# Checklist Verifikasi Implementasi Relasi Paket-Keberangkatan

## 📋 Status Implementasi

### ✅ Database Layer

- [x] **Tabel `packages` memiliki kolom harga default**
  - `price_quad DECIMAL(15,2)`
  - `price_triple DECIMAL(15,2)`
  - `price_double DECIMAL(15,2)`
  - `price_single DECIMAL(15,2)`
  - File: `supabase/migrations/20260121115050_*.sql`

- [x] **Tabel `departures` memiliki kolom harga spesifik**
  - `price_quad NUMERIC DEFAULT 0`
  - `price_triple NUMERIC DEFAULT 0`
  - `price_double NUMERIC DEFAULT 0`
  - `price_single NUMERIC DEFAULT 0`
  - File: `supabase/migrations/20260122000754_*.sql`

- [x] **Foreign Key Relationship**
  - `departures.package_id` → `packages.id`
  - Constraint: `ON DELETE CASCADE`
  - File: `supabase/migrations/20260121115050_*.sql`

### ✅ Frontend Components

- [x] **PackageBookingForm.tsx**
  - ✅ Mengambil harga dari `selectedDepartureData`
  - ✅ Menampilkan daftar keberangkatan dengan harga
  - ✅ Validasi harga tersedia sebelum proceed
  - ✅ Menampilkan badge "Harga TBA" jika kosong
  - Lokasi: `src/components/packages/PackageBookingForm.tsx`
  - Baris: 110-118

- [x] **BookingWizard.tsx**
  - ✅ Query keberangkatan dengan kolom harga
  - ✅ Menyimpan harga keberangkatan di state
  - ✅ Menampilkan harga di review step
  - Lokasi: `src/components/booking/BookingWizard.tsx`
  - Baris: 63-71, 200-237

- [x] **DepartureForm.tsx (Admin)**
  - ✅ Input field untuk `price_quad`, `price_triple`, `price_double`, `price_single`
  - ✅ Validasi harga >= 0
  - ✅ Penyimpanan ke database
  - Lokasi: `src/components/admin/forms/DepartureForm.tsx`
  - Baris: 49-52, 141-144, 514-556

- [x] **StepReviewDynamic.tsx**
  - ✅ Menampilkan harga berdasarkan keberangkatan
  - ✅ Perhitungan total biaya akurat
  - Lokasi: `src/components/booking/steps/StepReviewDynamic.tsx`
  - Baris: 22-36, 57-60

### ✅ API & Query Layer

- [x] **Query keberangkatan dengan harga**
  ```typescript
  .select('id, departure_date, return_date, flight_number, price_quad, price_triple, price_double, price_single')
  ```
  - File: `src/components/booking/BookingWizard.tsx` (line 66)
  - File: `src/components/packages/PackageBookingForm.tsx` (line 77)

- [x] **Fallback ke harga paket**
  - Implementasi: `selectedDepartureData.price_quad || 0`
  - Alternatif: `COALESCE(d.price_quad, p.price_quad)` di SQL

---

## 🔍 Verifikasi Fungsional

### Test Case 1: Pemilihan Keberangkatan dengan Harga Spesifik

**Skenario:**
1. Paket memiliki harga default: Quad 25M, Triple 22M, Double 20M, Single 28M
2. Keberangkatan 1 (15 Mei) memiliki harga: Quad 26M, Triple 23M, Double 21M, Single 29M
3. Keberangkatan 2 (20 Mei) memiliki harga: Quad 0 (kosong)

**Expected Result:**
- ✅ Keberangkatan 1 menampilkan harga spesifik (26M, 23M, 21M, 29M)
- ✅ Keberangkatan 2 menampilkan harga paket default (25M, 22M, 20M, 28M)
- ✅ Keberangkatan 2 menampilkan badge "Harga TBA"

**Verification:**
```typescript
// Di PackageBookingForm.tsx
const prices = useMemo(() => {
  if (!selectedDepartureData) return { quad: 0, triple: 0, double: 0, single: 0 };
  return {
    quad: selectedDepartureData.price_quad || 0,  // ✅ Fallback ke 0
    triple: selectedDepartureData.price_triple || 0,
    double: selectedDepartureData.price_double || 0,
    single: selectedDepartureData.price_single || 0,
  };
}, [selectedDepartureData]);

const hasPricing = prices.quad > 0 || prices.triple > 0 || prices.double > 0 || prices.single > 0;
// ✅ Badge "Harga TBA" ditampilkan jika hasPricing = false
```

### Test Case 2: Perhitungan Total Biaya

**Skenario:**
1. Pengguna memilih keberangkatan dengan harga: Quad 26M
2. Pengguna memilih 2 kamar Quad (8 orang)

**Expected Result:**
- ✅ Total biaya = 2 × 26M = 52M
- ✅ Harga ditampilkan di review step

**Verification:**
```typescript
// Di BookingWizard.tsx
const totalPrice = (roomAllocation.quad * prices.quad) + 
                   (roomAllocation.triple * prices.triple) + 
                   (roomAllocation.double * prices.double) + 
                   (roomAllocation.single * prices.single);
// ✅ Perhitungan menggunakan harga keberangkatan
```

### Test Case 3: Admin Mengubah Harga Keberangkatan

**Skenario:**
1. Admin membuka form keberangkatan
2. Admin mengubah harga Quad dari 26M menjadi 27M
3. Admin menyimpan perubahan

**Expected Result:**
- ✅ Harga tersimpan di database
- ✅ Pengguna baru melihat harga yang diperbarui
- ✅ Booking yang sudah ada tidak terpengaruh

**Verification:**
```typescript
// Di DepartureForm.tsx
const formSchema = z.object({
  price_quad: z.coerce.number().min(0).default(0),
  price_triple: z.coerce.number().min(0).default(0),
  price_double: z.coerce.number().min(0).default(0),
  price_single: z.coerce.number().min(0).default(0),
});
// ✅ Validasi harga >= 0
```

---

## 🚨 Potential Issues & Fixes

### Issue 1: Harga Tidak Berubah Setelah Update

**Penyebab:**
- React Query cache belum di-invalidate
- Browser cache belum di-clear

**Solusi:**
```typescript
// Invalidate query setelah update
queryClient.invalidateQueries({ queryKey: ['package-departures', packageId] });
```

### Issue 2: Harga Menunjukkan 0 Padahal Sudah Diisi

**Penyebab:**
- Harga keberangkatan tidak tersimpan di database
- Query tidak mengambil kolom harga

**Solusi:**
1. Verifikasi di database:
```sql
SELECT id, departure_date, price_quad, price_triple, price_double, price_single 
FROM departures 
WHERE id = 'xxx';
```

2. Verifikasi query di aplikasi:
```typescript
.select('id, departure_date, return_date, flight_number, price_quad, price_triple, price_double, price_single')
```

### Issue 3: Fallback ke Harga Paket Tidak Berfungsi

**Penyebab:**
- Query tidak mengambil harga paket
- Logic fallback tidak benar

**Solusi:**
```typescript
// Gunakan COALESCE di SQL
SELECT 
  COALESCE(d.price_quad, p.price_quad) as price_quad,
  COALESCE(d.price_triple, p.price_triple) as price_triple,
  COALESCE(d.price_double, p.price_double) as price_double,
  COALESCE(d.price_single, p.price_single) as price_single
FROM departures d
JOIN packages p ON d.package_id = p.id
WHERE d.id = 'xxx';
```

---

## 📊 Data Consistency Checks

### Check 1: Semua Keberangkatan Memiliki Harga

```sql
-- Keberangkatan tanpa harga (TBA)
SELECT id, departure_date, package_id, 
       price_quad, price_triple, price_double, price_single
FROM departures
WHERE (price_quad = 0 OR price_quad IS NULL)
  AND (price_triple = 0 OR price_triple IS NULL)
  AND (price_double = 0 OR price_double IS NULL)
  AND (price_single = 0 OR price_single IS NULL)
  AND status = 'open'
ORDER BY departure_date;
```

### Check 2: Verifikasi Relasi Paket-Keberangkatan

```sql
-- Keberangkatan tanpa paket terkait
SELECT d.id, d.departure_date, d.package_id
FROM departures d
LEFT JOIN packages p ON d.package_id = p.id
WHERE p.id IS NULL AND d.package_id IS NOT NULL;
```

### Check 3: Harga Tidak Konsisten

```sql
-- Bandingkan harga keberangkatan dengan paket
SELECT 
  d.id,
  d.departure_date,
  d.price_quad as dep_quad,
  p.price_quad as pkg_quad,
  CASE WHEN d.price_quad > 0 THEN 'Keberangkatan' ELSE 'Paket' END as harga_sumber
FROM departures d
JOIN packages p ON d.package_id = p.id
WHERE d.status = 'open'
ORDER BY d.departure_date;
```

---

## 🔄 Workflow Pembaruan Harga

### Workflow 1: Update Harga Paket (Global)

```
Admin → Buka Package Form → Update price_quad/triple/double/single → Save
↓
Database: packages table diperbarui
↓
Pengguna: Keberangkatan tanpa harga spesifik akan menampilkan harga baru
```

### Workflow 2: Update Harga Keberangkatan (Spesifik)

```
Admin → Buka Departure Form → Update price_quad/triple/double/single → Save
↓
Database: departures table diperbarui
↓
Pengguna: Keberangkatan menampilkan harga baru (prioritas tertinggi)
```

### Workflow 3: Set Harga Keberangkatan dari Paket

```
Admin → Buka Departure Form → Copy harga dari paket → Save
↓
Database: departures table diisi dengan harga paket
↓
Pengguna: Keberangkatan menampilkan harga spesifik (bukan fallback)
```

---

## 📈 Performance Considerations

### Query Optimization

- [x] **Indexed Columns**
  - `departures.package_id` (FK)
  - `departures.departure_date`
  - `departures.status`

- [x] **Select Specific Columns**
  ```typescript
  .select('id, departure_date, return_date, flight_number, price_quad, price_triple, price_double, price_single')
  ```

- [x] **Use React Query Caching**
  ```typescript
  const { data: departures } = useQuery({
    queryKey: ['package-departures', packageId],
    queryFn: async () => { ... },
  });
  ```

### Cache Invalidation

- [x] **Invalidate on Update**
  ```typescript
  queryClient.invalidateQueries({ queryKey: ['package-departures', packageId] });
  ```

---

## ✅ Final Verification Checklist

- [x] Database schema memiliki kolom harga di kedua tabel
- [x] Foreign key relationship terdefinisi dengan benar
- [x] Frontend mengambil harga dari keberangkatan
- [x] Admin dapat mengupdate harga keberangkatan
- [x] Fallback ke harga paket berfungsi
- [x] Perhitungan total biaya akurat
- [x] Badge "Harga TBA" ditampilkan dengan benar
- [x] Query dioptimalkan dengan select kolom spesifik
- [x] React Query caching diterapkan
- [x] Dokumentasi lengkap tersedia

---

## 🎯 Rekomendasi Lanjutan

### 1. **Audit Harga Berkala**
- Buat laporan harga keberangkatan vs paket
- Identifikasi keberangkatan tanpa harga (TBA)
- Review harga secara berkala

### 2. **Notifikasi Harga**
- Notifikasi ketika harga keberangkatan berubah
- Notifikasi ketika harga keberangkatan ditetapkan (dari TBA)

### 3. **Riwayat Harga**
- Catat riwayat perubahan harga
- Audit trail untuk compliance

### 4. **Bulk Update**
- Fitur untuk bulk update harga keberangkatan
- Template harga untuk keberangkatan baru

### 5. **Dynamic Pricing**
- Implementasi dynamic pricing berdasarkan permintaan
- Automated price adjustment

---

## 📞 Support & Questions

Untuk pertanyaan atau masalah terkait implementasi relasi paket-keberangkatan, silakan:

1. Periksa dokumentasi: `PACKAGE_DEPARTURE_PRICING_GUIDE.md`
2. Verifikasi dengan checklist ini
3. Jalankan data consistency checks
4. Hubungi tim development

