# Dynamic Excel Export System - Panduan Lengkap

## Ringkasan

Sistem export Excel dinamis memungkinkan Anda untuk mengkustomisasi warna, font, dan styling export Excel langsung dari Admin Panel tanpa perlu mengubah kode. Semua pengaturan disimpan di database dan dapat diubah kapan saja.

---

## Fitur Utama

✅ **Customizable Colors**
- Warna judul, header, bagian, ringkasan, baris data, dan border
- Color picker UI untuk kemudahan penggunaan
- Preview warna real-time

✅ **Font Customization**
- Ukuran font untuk judul, header, bagian, body, dan footer
- Opsi bold/normal untuk elemen penting
- Gaya border (tipis, sedang, tebal)

✅ **Dynamic Loading**
- Pengaturan dimuat dari database saat export
- Fallback ke default jika setting tidak ada
- Perubahan langsung berlaku tanpa restart

✅ **Two Export Types**
- Export Booking dengan tabel lengkap
- Export Statistik dengan breakdown per status

---

## Struktur File

### Core Files

1. **src/lib/dynamic-excel-exporter.ts**
   - Fungsi export utama
   - Interface untuk style config
   - Helper functions

2. **src/components/admin/ExcelExportSettingsForm.tsx**
   - UI untuk mengkustomisasi pengaturan
   - Tabs untuk warna, font, dan preview
   - Integrasi dengan company_settings

3. **src/pages/admin/ExcelExportIntegration.tsx**
   - Panduan integrasi
   - Helper functions untuk loading config
   - Contoh penggunaan

---

## Konfigurasi Style

### ExcelStyleConfig Interface

```typescript
interface ExcelStyleConfig {
  // Title styling
  title_bg_color: string;           // Hex color (e.g., "1E40AF")
  title_text_color: string;         // Hex color (e.g., "FFFFFF")
  title_font_size: number;          // Font size (e.g., 14)
  title_bold: boolean;              // Bold text

  // Header styling
  header_bg_color: string;          // Hex color (e.g., "2563EB")
  header_text_color: string;        // Hex color (e.g., "FFFFFF")
  header_font_size: number;         // Font size (e.g., 10)
  header_bold: boolean;             // Bold text

  // Section header styling
  section_bg_color: string;         // Hex color (e.g., "DBEAFE")
  section_text_color: string;       // Hex color (e.g., "1E3A8A")
  section_font_size: number;        // Font size (e.g., 11)
  section_bold: boolean;            // Bold text

  // Summary/Highlight styling
  summary_bg_color: string;         // Hex color (e.g., "FEF3C7")
  summary_text_color: string;       // Hex color (e.g., "78350F")

  // Row styling
  row_bg_color: string;             // Hex color (e.g., "F9FAFB")
  row_text_color: string;           // Hex color (e.g., "1F2937")
  alt_row_bg_color: string;         // Hex color (e.g., "FFFFFF")

  // Border styling
  border_color: string;             // Hex color (e.g., "E5E7EB")
  border_style: string;             // 'thin', 'medium', 'thick'

  // Body font size
  body_font_size: number;           // Font size (e.g., 9)
  footer_font_size: number;         // Font size (e.g., 8)
}
```

### Default Configuration

```typescript
const DEFAULT_EXCEL_STYLE: ExcelStyleConfig = {
  title_bg_color: '1E40AF',
  title_text_color: 'FFFFFF',
  title_font_size: 14,
  title_bold: true,

  header_bg_color: '2563EB',
  header_text_color: 'FFFFFF',
  header_font_size: 10,
  header_bold: true,

  section_bg_color: 'DBEAFE',
  section_text_color: '1E3A8A',
  section_font_size: 11,
  section_bold: true,

  summary_bg_color: 'FEF3C7',
  summary_text_color: '78350F',

  row_bg_color: 'F9FAFB',
  row_text_color: '1F2937',
  alt_row_bg_color: 'FFFFFF',

  border_color: 'E5E7EB',
  border_style: 'thin',

  body_font_size: 9,
  footer_font_size: 8,
};
```

---

## Database Settings

Pengaturan disimpan di tabel `company_settings` dengan key-value pairs:

| Setting Key | Contoh Value | Tipe |
|---|---|---|
| `excel_title_bg_color` | 1E40AF | string |
| `excel_title_text_color` | FFFFFF | string |
| `excel_title_font_size` | 14 | string |
| `excel_title_bold` | true | string |
| `excel_header_bg_color` | 2563EB | string |
| `excel_header_text_color` | FFFFFF | string |
| `excel_header_font_size` | 10 | string |
| `excel_header_bold` | true | string |
| `excel_section_bg_color` | DBEAFE | string |
| `excel_section_text_color` | 1E3A8A | string |
| `excel_section_font_size` | 11 | string |
| `excel_section_bold` | true | string |
| `excel_summary_bg_color` | FEF3C7 | string |
| `excel_summary_text_color` | 78350F | string |
| `excel_row_bg_color` | F9FAFB | string |
| `excel_row_text_color` | 1F2937 | string |
| `excel_alt_row_bg_color` | FFFFFF | string |
| `excel_border_color` | E5E7EB | string |
| `excel_border_style` | thin | string |
| `excel_body_font_size` | 9 | string |
| `excel_footer_font_size` | 8 | string |

---

## Implementasi

### 1. Export Booking Excel

```typescript
import { exportDynamicBookingExcel } from "@/lib/dynamic-excel-exporter";
import { loadExcelStyleConfig } from "@/pages/admin/ExcelExportIntegration";

const handleExportBookingExcel = () => {
  const styleConfig = loadExcelStyleConfig(getSetting);
  const companyName = getSetting('company_name') || 'Vins Tour Travel';

  const bookingData = bookings.map(b => ({
    booking_code: b.booking_code,
    customer_name: b.customer?.full_name || '-',
    customer_phone: b.customer?.phone || '-',
    package_name: b.departure?.package?.name || '-',
    departure_date: b.departure?.departure_date,
    total_pax: b.total_pax,
    room_type: b.room_type,
    total_price: Number(b.total_price),
    paid_amount: Number(b.paid_amount),
    remaining_amount: Number(b.remaining_amount),
    booking_status: b.booking_status,
    payment_status: b.payment_status,
    created_at: b.created_at,
  }));

  exportDynamicBookingExcel(bookingData, companyName, styleConfig, dateFrom, dateTo);
};
```

### 2. Export Statistics Excel

```typescript
import { exportDynamicStatisticsExcel } from "@/lib/dynamic-excel-exporter";
import { loadExcelStyleConfig } from "@/pages/admin/ExcelExportIntegration";

const handleExportStatisticsExcel = () => {
  const styleConfig = loadExcelStyleConfig(getSetting);
  const companyName = getSetting('company_name') || 'Vins Tour Travel';

  const dateFromStr = format(dateFrom, 'd MMMM yyyy', { locale: id });
  const dateToStr = format(dateTo, 'd MMMM yyyy', { locale: id });

  exportDynamicStatisticsExcel(
    periodStats,
    companyName,
    periodLabel,
    dateFromStr,
    dateToStr,
    styleConfig
  );
};
```

### 3. Tambah ke AdminSettings

```typescript
import { ExcelExportSettingsForm } from "@/components/admin/ExcelExportSettingsForm";

// Di NAV_ITEMS array:
const NAV_ITEMS: NavItem[] = [
  // ... existing items ...
  { 
    id: "excel-export",
    label: "Export Excel",
    icon: FileSpreadsheet,
    description: "Kustomisasi warna & styling export",
    adminOnly: true
  },
];

// Di content section:
{activeSection === "excel-export" && (
  <>
    <SectionHead 
      icon={FileSpreadsheet} 
      title="Pengaturan Export Excel" 
      desc="Kustomisasi warna, font, dan styling untuk export Excel" 
    />
    <ExcelExportSettingsForm />
  </>
)}
```

---

## Penggunaan Admin Panel

### Akses Pengaturan

1. Buka **Pengaturan Sistem** → **Export Excel**
2. Pilih tab **Warna**, **Font**, atau **Preview**

### Kustomisasi Warna

1. Klik color picker atau masukkan hex code
2. Lihat preview real-time di tab Preview
3. Klik **Simpan Pengaturan**

### Kustomisasi Font

1. Ubah ukuran font untuk setiap elemen
2. Pilih bold/normal
3. Pilih gaya border
4. Klik **Simpan Pengaturan**

### Reset ke Default

1. Klik tombol **Reset ke Default**
2. Konfirmasi untuk mengembalikan ke pengaturan awal

---

## Contoh Warna Preset

### Blue Theme (Default)
```
Title: 1E40AF (Dark Blue)
Header: 2563EB (Blue)
Section: DBEAFE (Light Blue)
Summary: FEF3C7 (Light Yellow)
```

### Green Theme
```
Title: 065F46 (Dark Green)
Header: 059669 (Green)
Section: D1FAE5 (Light Green)
Summary: FEF3C7 (Light Yellow)
```

### Purple Theme
```
Title: 581C87 (Dark Purple)
Header: 7C3AED (Purple)
Section: EDE9FE (Light Purple)
Summary: FEF3C7 (Light Yellow)
```

### Red Theme
```
Title: 7F1D1D (Dark Red)
Header: DC2626 (Red)
Section: FEE2E2 (Light Red)
Summary: FEF3C7 (Light Yellow)
```

---

## Tips & Trik

### Memilih Warna yang Cocok

1. **Contrast**: Pastikan warna teks cukup kontras dengan background
2. **Konsistensi**: Gunakan palet warna yang harmonis
3. **Readability**: Hindari kombinasi warna yang sulit dibaca

### Font Size Guidelines

- **Title**: 12-16pt (biasanya 14pt)
- **Header**: 9-11pt (biasanya 10pt)
- **Section**: 10-12pt (biasanya 11pt)
- **Body**: 8-10pt (biasanya 9pt)
- **Footer**: 7-9pt (biasanya 8pt)

### Border Style

- **Thin**: Untuk dokumen formal
- **Medium**: Untuk dokumen standar
- **Thick**: Untuk dokumen yang perlu emphasis

---

## Troubleshooting

### Export tidak menggunakan pengaturan baru

**Solusi**: 
- Refresh halaman setelah menyimpan pengaturan
- Pastikan setting sudah tersimpan di database
- Cek browser console untuk error

### Warna tidak sesuai di Excel

**Solusi**:
- Pastikan format hex valid (6 karakter, 0-9, A-F)
- Beberapa versi Excel mungkin render warna berbeda
- Coba buka file di Excel terbaru

### Font size terlalu besar/kecil

**Solusi**:
- Sesuaikan ukuran font sesuai kebutuhan
- Ingat bahwa font size di Excel berbeda dengan web
- Test export untuk melihat hasil aktual

---

## Performance

- ✅ Pengaturan di-cache oleh React Query
- ✅ Tidak ada query database saat export
- ✅ Export berjalan di client-side
- ✅ File size Excel minimal

---

## Kompatibilitas

- ✅ Microsoft Excel 2016+
- ✅ Google Sheets
- ✅ LibreOffice Calc
- ✅ Apple Numbers

---

## Next Steps

1. ✅ Copy file `dynamic-excel-exporter.ts` ke `src/lib/`
2. ✅ Copy file `ExcelExportSettingsForm.tsx` ke `src/components/admin/`
3. ✅ Tambahkan form ke AdminSettings.tsx
4. ✅ Update AdminBookings.tsx dengan handler baru
5. ✅ Update AdminReports.tsx dengan handler baru
6. ✅ Test export dengan berbagai pengaturan
7. ✅ Dokumentasikan pengaturan default untuk tim

---

## Support

Untuk bantuan lebih lanjut, lihat:
- `ExcelExportIntegration.tsx` - Contoh implementasi
- `ExcelExportSettingsForm.tsx` - UI component
- `dynamic-excel-exporter.ts` - Core logic

---

Dibuat untuk Vins Tour Travel System
