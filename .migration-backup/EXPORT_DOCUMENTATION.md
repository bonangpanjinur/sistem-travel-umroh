# Dokumentasi Export PDF Profesional - Vins Tour Travel

## Ringkasan

Dua modul PDF export baru telah ditambahkan ke sistem Vins Tour Travel untuk menghasilkan laporan yang profesional dan bermerek:

1. **booking-pdf-exporter.ts** - Export Laporan Booking dengan desain profesional
2. **statistics-pdf-exporter.ts** - Export Statistik Jamaah per Periode dengan desain profesional

Kedua modul mengintegrasikan informasi perusahaan dari database (`company_settings`) dan menghasilkan PDF dengan tata letak yang konsisten, profesional, dan mudah dibaca.

---

## 1. Booking PDF Exporter

### File: `src/lib/booking-pdf-exporter.ts`

#### Fungsi Utama

```typescript
export async function exportBookingsToPDF(
  bookings: BookingData[],
  companyInfo: CompanyInfo,
  options: ExportOptions
)
```

#### Parameter

**bookings** (BookingData[])
- Array data booking yang akan diekspor
- Setiap booking harus memiliki:
  - `booking_code`: Kode unik booking
  - `customer_name`: Nama customer
  - `customer_phone`: Nomor telepon customer
  - `package_name`: Nama paket umroh
  - `departure_date`: Tanggal keberangkatan
  - `return_date`: Tanggal kembali
  - `total_pax`: Jumlah jamaah
  - `room_type`: Tipe kamar
  - `total_price`: Harga total
  - `paid_amount`: Jumlah yang sudah dibayar
  - `remaining_amount`: Sisa pembayaran
  - `booking_status`: Status booking (pending, confirmed, processing, completed, cancelled, refunded)
  - `payment_status`: Status pembayaran (pending, partial, paid, refunded, failed)
  - `created_at`: Tanggal pembuatan booking

**companyInfo** (CompanyInfo)
- Informasi perusahaan yang ditampilkan di header
- Struktur:
  ```typescript
  {
    company_name: string;      // Nama perusahaan
    company_address: string;   // Alamat lengkap
    company_phone: string;     // Nomor telepon
    company_email: string;     // Email perusahaan
    logo_url?: string;         // URL logo (opsional)
  }
  ```

**options** (ExportOptions)
- Konfigurasi laporan
- Struktur:
  ```typescript
  {
    title: string;             // Judul laporan (misal: "Laporan Data Booking")
    subtitle?: string;         // Subtitle opsional
    dateFrom?: Date;           // Tanggal mulai periode
    dateTo?: Date;             // Tanggal akhir periode
  }
  ```

#### Fitur

✅ **Header Profesional**
- Nama perusahaan dengan styling bold dan warna primary
- Alamat lengkap
- Nomor telepon dan email

✅ **Ringkasan Statistik**
- Total booking
- Total jamaah
- Total pendapatan
- Total terbayar

✅ **Tabel Data Lengkap**
- Kode booking
- Informasi customer (nama, telepon)
- Detail paket dan keberangkatan
- Informasi kamar dan jamaah
- Rincian pembayaran (total, dibayar, sisa)
- Status booking dan pembayaran
- Tanggal booking

✅ **Footer Profesional**
- Garis pemisah
- Timestamp pencetakan
- Nomor halaman

✅ **Desain**
- Orientasi landscape untuk tabel yang lebar
- Warna konsisten (Blue-700 sebagai primary)
- Styling header dan body yang berbeda
- Border dan padding yang rapi

#### Contoh Penggunaan

```typescript
import { exportBookingsToPDF } from "@/lib/booking-pdf-exporter";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export function AdminBookings() {
  const { getSetting } = useCompanySettings();

  const handleExportBookingsPDF = async () => {
    const companyInfo = {
      company_name: getSetting('company_name') || 'Vins Tour Travel',
      company_address: getSetting('company_address') || 'Alamat Perusahaan',
      company_phone: getSetting('company_phone') || '0812-3456-7890',
      company_email: getSetting('company_email') || 'info@vinstour.com',
    };

    const bookingData = bookings.map(b => ({
      booking_code: b.booking_code,
      customer_name: b.customer?.full_name || '-',
      customer_phone: b.customer?.phone || '-',
      package_name: b.departure?.package?.name || '-',
      departure_date: b.departure?.departure_date,
      return_date: b.departure?.return_date,
      total_pax: b.total_pax,
      room_type: b.room_type,
      total_price: Number(b.total_price),
      paid_amount: Number(b.paid_amount),
      remaining_amount: Number(b.remaining_amount),
      booking_status: b.booking_status,
      payment_status: b.payment_status,
      created_at: b.created_at,
    }));

    await exportBookingsToPDF(bookingData, companyInfo, {
      title: 'Laporan Data Booking',
      subtitle: `Periode: ${formatDateRange(dateRange.from, dateRange.to)}`,
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
    });
  };

  return (
    <Button onClick={handleExportBookingsPDF}>
      Export PDF Profesional
    </Button>
  );
}
```

---

## 2. Statistics PDF Exporter

### File: `src/lib/statistics-pdf-exporter.ts`

#### Fungsi Utama

```typescript
export function exportStatisticsToPDF(
  stats: PeriodStats,
  companyInfo: CompanyInfo,
  options: ExportOptions
)
```

#### Parameter

**stats** (PeriodStats)
- Statistik jamaah untuk periode tertentu
- Struktur:
  ```typescript
  {
    totalPax: number;                    // Total jamaah
    totalBookings: number;               // Total booking
    totalRevenue: number;                // Total pendapatan
    byStatus: Record<string, {           // Breakdown per status
      pax: number;                       // Jumlah jamaah
      bookings: number;                  // Jumlah booking
    }>;
  }
  ```

**companyInfo** (CompanyInfo)
- Sama seperti di Booking PDF Exporter

**options** (ExportOptions)
- Konfigurasi laporan
- Struktur:
  ```typescript
  {
    periodLabel: string;   // Label periode (misal: "Bulan Ini", "3 Bulan")
    dateFrom: string;      // Tanggal mulai (format: "d MMMM yyyy")
    dateTo: string;        // Tanggal akhir (format: "d MMMM yyyy")
  }
  ```

#### Fitur

✅ **Header Profesional**
- Sama seperti Booking PDF Exporter

✅ **Ringkasan Keseluruhan**
- Total jamaah dengan icon
- Total booking dengan icon
- Total pendapatan dengan icon
- Ditampilkan dalam box yang menarik

✅ **Tabel Komposisi Status**
- Status booking
- Jumlah jamaah per status
- Jumlah booking per status
- Persentase jamaah
- Rata-rata jamaah per booking

✅ **Insight & Analisis**
- Rata-rata jamaah per booking
- Status terbanyak
- Total pendapatan periode

✅ **Footer Profesional**
- Sama seperti Booking PDF Exporter

✅ **Desain**
- Orientasi portrait untuk laporan ringkas
- Warna konsisten dengan Booking PDF
- Box summary yang eye-catching
- Tabel yang mudah dibaca

#### Contoh Penggunaan

```typescript
import { exportStatisticsToPDF } from "@/lib/statistics-pdf-exporter";
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { format } from "date-fns";
import { id } from "date-fns/locale";

export function AdminBookings() {
  const { getSetting } = useCompanySettings();

  const handleExportStatisticsPDF = async () => {
    const companyInfo = {
      company_name: getSetting('company_name') || 'Vins Tour Travel',
      company_address: getSetting('company_address') || 'Alamat Perusahaan',
      company_phone: getSetting('company_phone') || '0812-3456-7890',
      company_email: getSetting('company_email') || 'info@vinstour.com',
    };

    const dateFromStr = periodRange?.from 
      ? format(periodRange.from, 'd MMMM yyyy', { locale: id })
      : 'Awal Periode';
    
    const dateToStr = periodRange?.to
      ? format(periodRange.to, 'd MMMM yyyy', { locale: id })
      : 'Akhir Periode';

    await exportStatisticsToPDF(periodStats, companyInfo, {
      periodLabel: periodRange?.label || 'Periode Kustom',
      dateFrom: dateFromStr,
      dateTo: dateToStr,
    });
  };

  return (
    <Button onClick={handleExportStatisticsPDF}>
      Export PDF Profesional
    </Button>
  );
}
```

---

## 3. Integrasi dengan Existing Code

### Update AdminReports.tsx

Tambahkan import:
```typescript
import { exportBookingsToPDF } from "@/lib/booking-pdf-exporter";
import { useCompanySettings } from "@/hooks/useCompanySettings";
```

Gunakan hook:
```typescript
const { getSetting } = useCompanySettings();
```

Buat handler untuk export PDF:
```typescript
const handleExportBookingsPDF = async () => {
  if (!bookings) return;
  setIsExporting(true);

  try {
    const companyInfo = {
      company_name: getSetting('company_name') || 'Vins Tour Travel',
      company_address: getSetting('company_address') || 'Alamat Perusahaan',
      company_phone: getSetting('company_phone') || '0812-3456-7890',
      company_email: getSetting('company_email') || 'info@vinstour.com',
    };

    const bookingData = bookings.map((b: any) => ({
      booking_code: b.booking_code,
      customer_name: b.customer?.full_name || '-',
      customer_phone: b.customer?.phone || '-',
      package_name: b.departure?.package?.name || '-',
      departure_date: b.departure?.departure_date || new Date().toISOString(),
      return_date: b.departure?.return_date || new Date().toISOString(),
      total_pax: b.total_pax || 0,
      room_type: b.room_type || '-',
      total_price: Number(b.total_price) || 0,
      paid_amount: Number(b.paid_amount) || 0,
      remaining_amount: Number(b.remaining_amount) || 0,
      booking_status: b.booking_status || 'pending',
      payment_status: b.payment_status || 'pending',
      created_at: b.created_at || new Date().toISOString(),
    }));

    await exportBookingsToPDF(bookingData, companyInfo, {
      title: 'Laporan Data Booking',
      subtitle: `Periode: ${formatDateRange(dateRange.from, dateRange.to)}`,
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
    });
  } finally {
    setIsExporting(false);
  }
};
```

### Update AdminBookings.tsx

Tambahkan import:
```typescript
import { exportStatisticsToPDF } from "@/lib/statistics-pdf-exporter";
import { useCompanySettings } from "@/hooks/useCompanySettings";
```

Gunakan hook:
```typescript
const { getSetting } = useCompanySettings();
```

Buat handler untuk export PDF statistik:
```typescript
const handleExportStatisticsPDF = async () => {
  if (!periodStats) return;

  const companyInfo = {
    company_name: getSetting('company_name') || 'Vins Tour Travel',
    company_address: getSetting('company_address') || 'Alamat Perusahaan',
    company_phone: getSetting('company_phone') || '0812-3456-7890',
    company_email: getSetting('company_email') || 'info@vinstour.com',
  };

  const dateFromStr = periodRange?.from 
    ? format(periodRange.from, 'd MMMM yyyy', { locale: id })
    : 'Awal Periode';
  
  const dateToStr = periodRange?.to
    ? format(periodRange.to, 'd MMMM yyyy', { locale: id })
    : 'Akhir Periode';

  await exportStatisticsToPDF(periodStats, companyInfo, {
    periodLabel: periodRange?.label || 'Periode Kustom',
    dateFrom: dateFromStr,
    dateTo: dateToStr,
  });
};
```

---

## 4. Konfigurasi Company Settings

Pastikan informasi perusahaan sudah diatur di `company_settings` table:

| Setting Key | Contoh Value | Deskripsi |
|---|---|---|
| `company_name` | Vins Tour Travel | Nama perusahaan |
| `company_address` | Jl. Contoh No. 123, Jakarta | Alamat lengkap |
| `company_phone` | 0812-3456-7890 | Nomor telepon |
| `company_email` | info@vinstour.com | Email perusahaan |

Jika setting tidak ditemukan, sistem akan menggunakan nilai default.

---

## 5. Styling & Warna

### Palet Warna

```typescript
const COLORS = {
  primary: { r: 25, g: 64, b: 175 },      // Blue-700
  secondary: { r: 37, g: 99, b: 235 },    // Blue-600
  accent: { r: 59, g: 130, b: 246 },      // Blue-500
  headerBg: { r: 25, g: 64, b: 175 },     // Header background
  headerText: { r: 255, g: 255, b: 255 }, // Header text (white)
  rowBg: { r: 249, g: 250, b: 251 },      // Alternate row background
  rowText: { r: 31, g: 41, b: 55 },       // Row text
  borderColor: { r: 229, g: 231, b: 235 },// Border color
};
```

### Font Sizes

```typescript
const FONTS = {
  title: 16,      // Judul laporan
  subtitle: 11,   // Subtitle
  header: 10,     // Header tabel
  body: 9,        // Body text
  footer: 8,      // Footer text
};
```

---

## 6. Troubleshooting

### PDF tidak terunduh
- Pastikan browser tidak memblokir popup
- Cek console untuk error messages
- Verifikasi data tidak kosong

### Data tidak muncul di PDF
- Pastikan data memiliki semua field yang diperlukan
- Cek format tanggal (harus ISO string)
- Verifikasi company info tidak null

### Layout tidak rapi
- Untuk Booking PDF: gunakan orientasi landscape
- Untuk Statistics PDF: gunakan orientasi portrait
- Jangan ubah margin default

### Font tidak tampil
- Pastikan date-fns dan locale id sudah terinstall
- Cek import statement

---

## 7. Dependencies

Pastikan package berikut sudah terinstall:

```json
{
  "jspdf": "^2.5.0",
  "jspdf-autotable": "^3.5.31",
  "date-fns": "^2.30.0"
}
```

Install dengan:
```bash
npm install jspdf jspdf-autotable date-fns
```

---

## 8. File yang Ditambahkan

1. **src/lib/booking-pdf-exporter.ts** - Export booking dengan desain profesional
2. **src/lib/statistics-pdf-exporter.ts** - Export statistik dengan desain profesional
3. **src/pages/admin/AdminReports_Updated.tsx** - Contoh integrasi di AdminReports
4. **src/pages/admin/AdminBookings_Updated.tsx** - Contoh integrasi di AdminBookings

---

## 9. Next Steps

1. ✅ Copy file `booking-pdf-exporter.ts` dan `statistics-pdf-exporter.ts` ke folder `src/lib/`
2. ✅ Update `AdminReports.tsx` dengan handler export PDF baru
3. ✅ Update `AdminBookings.tsx` dengan handler export PDF statistik
4. ✅ Test export functionality
5. ✅ Verifikasi styling dan layout PDF
6. ✅ Pastikan company settings sudah diisi lengkap

---

## 10. Catatan Penting

- **Lokalisasi**: Semua teks menggunakan bahasa Indonesia
- **Format Tanggal**: Menggunakan format Indonesia (d MMMM yyyy)
- **Format Mata Uang**: Menggunakan format IDR dengan pemisah ribuan
- **Responsive**: PDF dioptimalkan untuk A4 landscape (booking) dan A4 portrait (statistics)
- **Performance**: Export berjalan di client-side, tidak memerlukan server

---

Untuk pertanyaan atau bantuan lebih lanjut, hubungi tim development.
