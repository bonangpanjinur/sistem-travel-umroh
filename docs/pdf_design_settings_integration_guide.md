# Panduan Integrasi Pengaturan Desain PDF

## Ringkasan

Fitur pengaturan desain PDF memungkinkan pengguna untuk mengkonfigurasi tampilan dan desain berbagai jenis dokumen PDF yang dihasilkan oleh sistem, seperti invoice, surat paspor, dan surat izin cuti. Fitur ini dirancang dengan pendekatan **pengaturan global dengan override spesifik per dokumen**, sehingga memberikan fleksibilitas maksimal.

## File-File yang Ditambahkan

### 1. **DocumentSettingsForm.extended.tsx**
   - **Lokasi**: `src/components/admin/DocumentSettingsForm.extended.tsx`
   - **Deskripsi**: Komponen React yang diperluas dengan tab-tab baru untuk mengelola pengaturan desain PDF
   - **Fitur Utama**:
     - Tab "Dasar" untuk pengaturan informasi perusahaan dan footer
     - Tab "Desain Global" untuk pengaturan font, warna, margin yang berlaku untuk semua dokumen
     - Tab "Invoice" untuk pengaturan spesifik invoice
     - Tab "Surat-Surat" untuk pengaturan surat paspor dan surat izin cuti

### 2. **pdf-design-settings.ts**
   - **Lokasi**: `src/lib/pdf-design-settings.ts`
   - **Deskripsi**: Utility library yang menyediakan fungsi-fungsi untuk mengelola pengaturan desain PDF
   - **Fungsi Utama**:
     - `hexToRgb()`: Konversi warna hex ke RGB untuk jsPDF
     - `mergeDesignSettings()`: Menggabungkan pengaturan global dengan override spesifik
     - `getFontNameForJsPDF()`: Mendapatkan nama font yang kompatibel dengan jsPDF
     - `applyDesignSettingsToDoc()`: Menerapkan pengaturan ke dokumen jsPDF

### 3. **booking-pdf-exporter.enhanced.ts**
   - **Lokasi**: `src/lib/booking-pdf-exporter.enhanced.ts`
   - **Deskripsi**: Contoh implementasi pengaturan desain dalam PDF exporter
   - **Fungsi Utama**:
     - `extractDesignSettings()`: Mengekstrak pengaturan desain global dari company settings
     - `extractInvoiceSettings()`: Mengekstrak pengaturan spesifik invoice
     - `exportBookingsToPDFEnhanced()`: Fungsi export yang menggunakan pengaturan desain

## Langkah-Langkah Integrasi

### Langkah 1: Mengganti Komponen DocumentSettingsForm

Ganti penggunaan `DocumentSettingsForm` dengan `DocumentSettingsFormExtended` di halaman pengaturan admin.

**Sebelum:**
```typescript
import { DocumentSettingsForm } from "@/components/admin/DocumentSettingsForm";

export function AdminSettings() {
  return <DocumentSettingsForm />;
}
```

**Sesudah:**
```typescript
import { DocumentSettingsFormExtended } from "@/components/admin/DocumentSettingsForm.extended";

export function AdminSettings() {
  return <DocumentSettingsFormExtended />;
}
```

### Langkah 2: Mengintegrasikan Pengaturan ke PDF Exporters

Untuk setiap file PDF exporter (misalnya `booking-pdf-exporter.ts`, `document-generator.ts`, dll.), lakukan langkah-langkah berikut:

#### 2.1 Import Utility Functions
```typescript
import {
  PDFDesignSettings,
  hexToRgb,
  mergeDesignSettings,
  getFontNameForJsPDF,
} from './pdf-design-settings';
```

#### 2.2 Extract Design Settings
Di dalam komponen React yang memanggil export function, ekstrak pengaturan desain:

```typescript
import { useCompanySettings } from "@/hooks/useCompanySettings";

export function BookingExportComponent() {
  const { getSetting } = useCompanySettings();

  // Extract global settings
  const globalSettings: PDFDesignSettings = {
    fontFamily: (getSetting("pdf_global_font_family") || "helvetica") as any,
    fontSizeHeader: parseInt(getSetting("pdf_global_font_size_header") || "12"),
    fontSizeBody: parseInt(getSetting("pdf_global_font_size_body") || "10"),
    textColor: getSetting("pdf_global_text_color") || "#333333",
    accentColor: getSetting("pdf_global_accent_color") || "#16a34a",
    marginTop: parseInt(getSetting("pdf_global_margin_top") || "15"),
    marginBottom: parseInt(getSetting("pdf_global_margin_bottom") || "15"),
    marginLeft: parseInt(getSetting("pdf_global_margin_left") || "15"),
    marginRight: parseInt(getSetting("pdf_global_margin_right") || "15"),
    showLogo: getSetting("pdf_global_show_logo") !== "false",
    logoPosition: (getSetting("pdf_global_logo_position") || "left") as any,
    showPageNumber: getSetting("pdf_global_show_page_number") !== "false",
    showTimestamp: getSetting("pdf_global_show_timestamp") !== "false",
  };

  // Extract invoice-specific settings
  const invoiceSettings = {
    fontFamily: getSetting("invoice_font_family"),
    headerBgColor: getSetting("invoice_header_bg_color"),
    tableHeaderTextColor: getSetting("invoice_table_header_text_color"),
    watermarkText: getSetting("invoice_watermark_text"),
    watermarkOpacity: parseFloat(getSetting("invoice_watermark_opacity") || "1"),
  };

  // Pass to export function
  handleExport(globalSettings, invoiceSettings);
}
```

#### 2.3 Modifikasi Export Function
Update signature export function untuk menerima pengaturan desain:

```typescript
export async function exportBookingsToPDF(
  bookings: BookingData[],
  companyInfo: CompanyInfo,
  options: ExportOptions,
  designSettings: PDFDesignSettings,  // ADD THIS
  documentSettings?: any                // ADD THIS
) {
  // ... existing code ...

  // Use design settings for margins
  const margin = {
    top: designSettings.marginTop,
    bottom: designSettings.marginBottom,
    left: designSettings.marginLeft,
    right: designSettings.marginRight,
  };

  // Apply font
  doc.setFont(getFontNameForJsPDF(designSettings.fontFamily));

  // Apply text color
  const [r, g, b] = hexToRgb(designSettings.textColor);
  doc.setTextColor(r, g, b);

  // Use font sizes from settings
  doc.setFontSize(designSettings.fontSizeHeader);
  // ... rest of implementation
}
```

### Langkah 3: Update Database Schema (Jika Diperlukan)

Jika menggunakan database untuk menyimpan company settings, pastikan kolom-kolom berikut ada:

```sql
-- Contoh untuk PostgreSQL
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pdf_global_font_family VARCHAR(50) DEFAULT 'helvetica';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pdf_global_font_size_header INTEGER DEFAULT 12;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pdf_global_font_size_body INTEGER DEFAULT 10;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pdf_global_text_color VARCHAR(7) DEFAULT '#333333';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pdf_global_accent_color VARCHAR(7) DEFAULT '#16a34a';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pdf_global_margin_top INTEGER DEFAULT 15;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pdf_global_margin_bottom INTEGER DEFAULT 15;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pdf_global_margin_left INTEGER DEFAULT 15;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pdf_global_margin_right INTEGER DEFAULT 15;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pdf_global_show_logo BOOLEAN DEFAULT true;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pdf_global_logo_position VARCHAR(20) DEFAULT 'left';
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pdf_global_show_page_number BOOLEAN DEFAULT true;
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS pdf_global_show_timestamp BOOLEAN DEFAULT true;

-- Invoice-specific settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS invoice_font_family VARCHAR(50);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS invoice_header_bg_color VARCHAR(7);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS invoice_table_header_text_color VARCHAR(7);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS invoice_watermark_text VARCHAR(255);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS invoice_watermark_opacity DECIMAL(3,2);

-- Passport letter settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS passport_letter_font_family VARCHAR(50);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS passport_letter_header_text_color VARCHAR(7);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS passport_letter_accent_color VARCHAR(7);

-- Leave permit settings
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS leave_permit_font_family VARCHAR(50);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS leave_permit_header_text_color VARCHAR(7);
ALTER TABLE company_settings ADD COLUMN IF NOT EXISTS leave_permit_accent_color VARCHAR(7);
```

## Contoh Implementasi Lengkap

Berikut adalah contoh lengkap untuk mengintegrasikan pengaturan desain ke dalam PDF exporter:

```typescript
// src/lib/invoice-pdf-generator.ts
import jsPDF from 'jspdf';
import { PDFDesignSettings, hexToRgb, getFontNameForJsPDF } from './pdf-design-settings';

export async function generateInvoicePDF(
  invoiceData: InvoiceData,
  designSettings: PDFDesignSettings,
  invoiceSettings?: any
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Setup margins from design settings
  const margin = {
    top: designSettings.marginTop,
    bottom: designSettings.marginBottom,
    left: designSettings.marginLeft,
    right: designSettings.marginRight,
  };

  let currentY = margin.top;

  // Apply font and colors
  doc.setFont(getFontNameForJsPDF(designSettings.fontFamily));
  const [textR, textG, textB] = hexToRgb(designSettings.textColor);
  const [accentR, accentG, accentB] = hexToRgb(
    invoiceSettings?.accentColor || designSettings.accentColor
  );

  // Header
  doc.setFontSize(designSettings.fontSizeHeader);
  doc.setTextColor(accentR, accentG, accentB);
  doc.setFont(getFontNameForJsPDF(designSettings.fontFamily), 'bold');
  doc.text('INVOICE', margin.left, currentY);
  currentY += 10;

  // Body content
  doc.setFontSize(designSettings.fontSizeBody);
  doc.setTextColor(textR, textG, textB);
  doc.setFont(getFontNameForJsPDF(designSettings.fontFamily), 'normal');
  doc.text(`Invoice No: ${invoiceData.invoiceNo}`, margin.left, currentY);
  currentY += 5;

  // ... more content ...

  // Footer
  if (designSettings.showPageNumber || designSettings.showTimestamp) {
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);

    if (designSettings.showTimestamp) {
      const now = new Date().toLocaleString('id-ID');
      doc.text(`Generated: ${now}`, margin.left, pageHeight - margin.bottom);
    }

    if (designSettings.showPageNumber) {
      doc.text(
        'Page 1',
        pageWidth - margin.right,
        pageHeight - margin.bottom,
        { align: 'right' }
      );
    }
  }

  doc.save(`Invoice_${invoiceData.invoiceNo}.pdf`);
}
```

## Pengaturan yang Tersedia

### Global Settings
- **Font Family**: helvetica, times, courier
- **Font Size Header**: 8-24 pt
- **Font Size Body**: 6-16 pt
- **Text Color**: Hex color (#RRGGBB)
- **Accent Color**: Hex color (#RRGGBB)
- **Margin Top/Bottom/Left/Right**: 5-30 mm
- **Show Logo**: Boolean
- **Logo Position**: left, center, right
- **Show Page Number**: Boolean
- **Show Timestamp**: Boolean

### Invoice-Specific Settings
- **Font Family**: helvetica, times, courier (optional)
- **Header Background Color**: Hex color (optional)
- **Table Header Text Color**: Hex color (optional)
- **Watermark Text**: String (optional)
- **Watermark Opacity**: 0-1 (optional)

### Letter-Specific Settings (Passport & Leave Permit)
- **Font Family**: helvetica, times, courier (optional)
- **Header Text Color**: Hex color (optional)
- **Accent Color**: Hex color (optional)

## Testing

Untuk menguji integrasi:

1. Akses halaman pengaturan admin
2. Buka tab "Desain Global" dan ubah beberapa pengaturan (font, warna, margin)
3. Simpan perubahan
4. Generate PDF (invoice, surat paspor, surat izin cuti)
5. Verifikasi bahwa pengaturan diterapkan dengan benar
6. Buka tab "Invoice" dan ubah pengaturan spesifik invoice
7. Generate invoice dan verifikasi override bekerja dengan baik

## Troubleshooting

### Font tidak berubah
- Pastikan font yang dipilih didukung oleh jsPDF
- Verifikasi bahwa `getFontNameForJsPDF()` mengembalikan nama font yang benar

### Warna tidak diterapkan
- Pastikan format hex color valid (#RRGGBB)
- Verifikasi bahwa `hexToRgb()` mengkonversi dengan benar
- Periksa bahwa `setTextColor()` dipanggil dengan nilai RGB yang benar

### Margin tidak bekerja
- Pastikan nilai margin dalam mm (bukan px)
- Verifikasi bahwa margin diterapkan ke semua elemen (header, body, footer)

### Settings tidak tersimpan
- Periksa bahwa API endpoint untuk menyimpan settings berfungsi
- Verifikasi bahwa field baru ada di database
- Periksa console browser untuk error messages

## Referensi

- [jsPDF Documentation](https://github.com/parallax/jsPDF)
- [jsPDF-AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable)
- [React Hook Form](https://react-hook-form.com/)
- [Zod Validation](https://zod.dev/)
