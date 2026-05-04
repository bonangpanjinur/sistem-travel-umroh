# Panduan Relasi Paket-Tanggal Keberangkatan dan Penetapan Harga

## 📋 Ringkasan Eksekutif

Sistem Umrah-Haji Magic telah mengimplementasikan relasi **paket-tanggal keberangkatan (departure)** di mana **harga paket ditentukan oleh tanggal keberangkatan yang dipilih**. Dokumentasi ini menjelaskan arsitektur, alur data, dan best practices untuk memastikan konsistensi di seluruh aplikasi.

---

## 🏗️ Arsitektur Database

### Tabel Utama

#### 1. **Packages (Paket)**
```sql
CREATE TABLE public.packages (
  id UUID PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  package_type package_type NOT NULL DEFAULT 'umroh',
  description TEXT,
  duration_days INTEGER NOT NULL DEFAULT 9,
  hotel_makkah_id UUID REFERENCES public.hotels(id),
  hotel_madinah_id UUID REFERENCES public.hotels(id),
  airline_id UUID REFERENCES public.airlines(id),
  muthawif_id UUID REFERENCES public.muthawifs(id),
  includes TEXT[],
  excludes TEXT[],
  itinerary JSONB,
  price_quad DECIMAL(15,2) NOT NULL DEFAULT 0,
  price_triple DECIMAL(15,2) NOT NULL DEFAULT 0,
  price_double DECIMAL(15,2) NOT NULL DEFAULT 0,
  price_single DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'IDR',
  featured_image TEXT,
  gallery TEXT[],
  is_featured BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Catatan:** Harga di tabel `packages` berfungsi sebagai **harga default/template** yang dapat ditimpa oleh harga spesifik keberangkatan.

#### 2. **Departures (Keberangkatan)**
```sql
CREATE TABLE public.departures (
  id UUID PRIMARY KEY,
  package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE,
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  quota INTEGER NOT NULL DEFAULT 45,
  booked_count INTEGER DEFAULT 0,
  departure_airport_id UUID REFERENCES public.airports(id),
  arrival_airport_id UUID REFERENCES public.airports(id),
  flight_number VARCHAR(50),
  departure_time TIME,
  airline_id UUID REFERENCES public.airlines(id),
  hotel_makkah_id UUID REFERENCES public.hotels(id),
  hotel_madinah_id UUID REFERENCES public.hotels(id),
  price_quad NUMERIC DEFAULT 0,
  price_triple NUMERIC DEFAULT 0,
  price_double NUMERIC DEFAULT 0,
  price_single NUMERIC DEFAULT 0,
  status VARCHAR(50) DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**Catatan:** Harga di tabel `departures` adalah **harga spesifik untuk keberangkatan tertentu** dan memiliki prioritas tertinggi dalam penetapan harga.

---

## 🔄 Alur Data Penetapan Harga

### Hirarki Penetapan Harga

```
┌─────────────────────────────────────────────────────┐
│  Harga Keberangkatan (departures.price_*)           │
│  ⬆️ Prioritas Tertinggi                             │
│  Digunakan jika > 0                                 │
└─────────────────────────────────────────────────────┘
                        ⬇️
┌─────────────────────────────────────────────────────┐
│  Harga Paket (packages.price_*)                     │
│  ⬆️ Prioritas Kedua                                 │
│  Fallback jika harga keberangkatan = 0              │
└─────────────────────────────────────────────────────┘
```

### Proses Pemilihan Harga

1. **Pengguna memilih paket** → Menampilkan daftar keberangkatan tersedia
2. **Pengguna memilih tanggal keberangkatan** → Sistem mengambil harga dari tabel `departures`
3. **Harga ditampilkan** → Jika `departures.price_quad > 0`, gunakan harga keberangkatan; jika tidak, gunakan `packages.price_quad`
4. **Pengguna memilih tipe kamar** → Harga dihitung berdasarkan tipe kamar yang dipilih

---

## 📱 Komponen & Implementasi

### 1. **PackageBookingForm.tsx**
**Lokasi:** `src/components/packages/PackageBookingForm.tsx`

**Fungsi:** Menampilkan form pemilihan keberangkatan dan alokasi kamar.

**Logika Penetapan Harga:**
```typescript
const prices = useMemo(() => {
  if (!selectedDepartureData) return { quad: 0, triple: 0, double: 0, single: 0 };
  return {
    quad: selectedDepartureData.price_quad || 0,
    triple: selectedDepartureData.price_triple || 0,
    double: selectedDepartureData.price_double || 0,
    single: selectedDepartureData.price_single || 0,
  };
}, [selectedDepartureData]);
```

**Fitur Utama:**
- ✅ Menampilkan daftar keberangkatan dengan tanggal dan kuota
- ✅ Menampilkan harga berdasarkan keberangkatan yang dipilih
- ✅ Validasi ketersediaan kursi
- ✅ Menampilkan badge "Harga TBA" jika harga belum ditetapkan

### 2. **BookingWizard.tsx**
**Lokasi:** `src/components/booking/BookingWizard.tsx`

**Fungsi:** Wizard pemesanan multi-step yang memandu pengguna melalui proses booking.

**Logika Penetapan Harga:**
```typescript
const { data: departureInfo } = useQuery({
  queryKey: ['departure-info', initialDepartureId],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('departures')
      .select('id, departure_date, return_date, flight_number, price_quad, price_triple, price_double, price_single')
      .eq('id', initialDepartureId)
      .single();
    if (error) throw error;
    return data;
  },
  enabled: !!initialDepartureId,
});
```

**Fitur Utama:**
- ✅ Mengambil harga keberangkatan dari parameter URL
- ✅ Menampilkan ringkasan harga di setiap step
- ✅ Menghitung total biaya berdasarkan alokasi kamar

### 3. **DepartureForm.tsx**
**Lokasi:** `src/components/admin/forms/DepartureForm.tsx`

**Fungsi:** Form admin untuk membuat/mengedit keberangkatan dengan penetapan harga.

**Fitur Utama:**
- ✅ Input field untuk `price_quad`, `price_triple`, `price_double`, `price_single`
- ✅ Validasi harga minimum (≥ 0)
- ✅ Penyimpanan harga spesifik keberangkatan

### 4. **StepReviewDynamic.tsx**
**Lokasi:** `src/components/booking/steps/StepReviewDynamic.tsx`

**Fungsi:** Menampilkan review pemesanan dengan rincian harga.

**Logika Penetapan Harga:**
```typescript
interface PriceSource {
  price_quad: number;
  price_triple: number;
  price_double: number;
  price_single: number;
}

const prices: PriceSource = {
  quad: priceSource.price_quad,
  triple: priceSource.price_triple,
  double: priceSource.price_double,
  single: priceSource.price_single,
};
```

---

## 🔐 Relasi & Constraints

### Foreign Key Relationships

```
packages (1) ──────────────── (N) departures
   │                              │
   ├─ id (PK)                     ├─ id (PK)
   ├─ code                        ├─ package_id (FK)
   ├─ name                        ├─ departure_date
   ├─ price_quad                  ├─ return_date
   ├─ price_triple                ├─ price_quad
   ├─ price_double                ├─ price_double
   └─ price_single                └─ price_single
```

### Constraints

| Constraint | Deskripsi |
|-----------|-----------|
| `ON DELETE CASCADE` | Jika paket dihapus, semua keberangkatan terkait otomatis dihapus |
| `package_id NOT NULL` | Setiap keberangkatan harus terkait dengan paket (dalam kebanyakan kasus) |
| `departure_date NOT NULL` | Tanggal keberangkatan wajib diisi |
| `return_date NOT NULL` | Tanggal kembali wajib diisi |
| `price_* >= 0` | Harga tidak boleh negatif |

---

## 📊 Alur Bisnis

### Skenario 1: Harga Keberangkatan Spesifik

```
Admin membuat paket "Umroh Plus" dengan harga default:
├─ price_quad: 25,000,000 IDR
├─ price_triple: 22,000,000 IDR
├─ price_double: 20,000,000 IDR
└─ price_single: 28,000,000 IDR

Admin membuat keberangkatan untuk paket tersebut:
├─ departure_date: 2026-05-15
├─ price_quad: 26,000,000 IDR (lebih mahal karena musim ramai)
├─ price_triple: 23,000,000 IDR
├─ price_double: 21,000,000 IDR
└─ price_single: 29,000,000 IDR

Hasil: Pengguna akan melihat harga keberangkatan (lebih mahal)
```

### Skenario 2: Harga Keberangkatan Kosong (Fallback)

```
Admin membuat keberangkatan tanpa mengisi harga:
├─ departure_date: 2026-06-20
├─ price_quad: 0 (kosong)
├─ price_triple: 0 (kosong)
├─ price_double: 0 (kosong)
└─ price_single: 0 (kosong)

Hasil: Sistem akan menggunakan harga paket default
└─ Menampilkan badge "Harga TBA" (To Be Announced)
```

---

## 🛠️ Best Practices

### 1. **Penetapan Harga**
- ✅ Selalu isi harga keberangkatan untuk keberangkatan yang akan dijual
- ✅ Gunakan harga paket sebagai template/default
- ✅ Tinjau harga keberangkatan secara berkala untuk memastikan akurasi
- ❌ Jangan biarkan harga keberangkatan kosong jika paket sedang dijual

### 2. **Validasi Data**
- ✅ Pastikan `departure_date < return_date`
- ✅ Pastikan harga > 0 untuk keberangkatan yang aktif
- ✅ Validasi kuota tidak melebihi kapasitas pesawat

### 3. **Penampilan UI**
- ✅ Tampilkan tanggal keberangkatan dengan format yang jelas
- ✅ Tampilkan harga per orang berdasarkan tipe kamar
- ✅ Tampilkan ketersediaan kursi
- ✅ Tampilkan badge "Harga TBA" jika harga belum ditetapkan

### 4. **Performa Query**
- ✅ Selalu select kolom yang diperlukan saja
- ✅ Gunakan `order_by` untuk mengurutkan keberangkatan
- ✅ Gunakan `gte` untuk filter keberangkatan yang akan datang
- ✅ Cache hasil query dengan React Query

---

## 📝 Query SQL Umum

### Mendapatkan Keberangkatan dengan Harga

```sql
SELECT 
  d.id,
  d.departure_date,
  d.return_date,
  d.quota,
  d.booked_count,
  COALESCE(d.price_quad, p.price_quad) as price_quad,
  COALESCE(d.price_triple, p.price_triple) as price_triple,
  COALESCE(d.price_double, p.price_double) as price_double,
  COALESCE(d.price_single, p.price_single) as price_single
FROM departures d
JOIN packages p ON d.package_id = p.id
WHERE d.package_id = $1
  AND d.status = 'open'
  AND d.departure_date >= CURRENT_DATE
ORDER BY d.departure_date ASC;
```

### Memperbarui Harga Keberangkatan

```sql
UPDATE departures
SET 
  price_quad = $1,
  price_triple = $2,
  price_double = $3,
  price_single = $4,
  updated_at = now()
WHERE id = $5;
```

---

## 🔍 Troubleshooting

### Masalah: Harga tidak berubah setelah diperbarui

**Solusi:**
1. Pastikan Anda memperbarui harga di tabel `departures`, bukan `packages`
2. Periksa apakah query menggunakan cache (React Query)
3. Refresh halaman atau invalidate query cache

### Masalah: Harga menunjukkan 0

**Solusi:**
1. Periksa apakah harga keberangkatan telah diisi
2. Jika kosong, periksa harga paket default
3. Gunakan query di atas untuk memverifikasi nilai sebenarnya

### Masalah: Keberangkatan tidak muncul di form pemesanan

**Solusi:**
1. Periksa status keberangkatan (harus 'open')
2. Periksa tanggal keberangkatan (harus >= hari ini)
3. Periksa apakah keberangkatan terkait dengan paket yang benar

---

## 📚 Referensi File

| File | Deskripsi |
|------|-----------|
| `src/components/packages/PackageBookingForm.tsx` | Form pemilihan keberangkatan |
| `src/components/booking/BookingWizard.tsx` | Wizard pemesanan |
| `src/components/admin/forms/DepartureForm.tsx` | Form admin keberangkatan |
| `src/components/booking/steps/StepReviewDynamic.tsx` | Review pemesanan |
| `supabase/migrations/20260122000754_*.sql` | Migrasi penambahan harga keberangkatan |

---

## ✅ Checklist Implementasi

- [x] Tabel `departures` memiliki kolom harga (`price_quad`, `price_triple`, `price_double`, `price_single`)
- [x] Relasi foreign key `departures.package_id` → `packages.id` sudah terdefinisi
- [x] Komponen `PackageBookingForm` mengambil harga dari keberangkatan yang dipilih
- [x] Komponen `BookingWizard` menggunakan harga keberangkatan dalam perhitungan
- [x] Form admin `DepartureForm` memungkinkan input harga keberangkatan
- [x] Review pemesanan menampilkan harga berdasarkan keberangkatan
- [x] Query menggunakan `COALESCE` untuk fallback ke harga paket
- [x] Validasi harga di level database dan aplikasi

---

## 🚀 Kesimpulan

Sistem Umrah-Haji Magic telah mengimplementasikan relasi paket-tanggal keberangkatan dengan penetapan harga yang fleksibel. Setiap keberangkatan dapat memiliki harga uniknya sendiri, memungkinkan penyesuaian harga berdasarkan musim, permintaan, atau faktor lainnya. Dokumentasi ini menyediakan panduan lengkap untuk memahami, menggunakan, dan memelihara sistem ini.

