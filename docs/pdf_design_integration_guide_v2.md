# Panduan Integrasi Pengaturan Desain PDF (Versi 2.0)

## Ringkasan Perubahan

Fitur pengaturan desain PDF telah dirombak total untuk memberikan pengalaman pengguna yang lebih profesional dan terorganisir, sesuai dengan referensi gambar yang diberikan. Perubahan utama meliputi:

1. **Skema Pengaturan Non-Redundan**: Pemisahan jelas antara pengaturan global (berlaku untuk semua dokumen) dan pengaturan spesifik dokumen (menimpa global).
2. **UI yang Intuitif**: Navigasi berbasis kartu untuk memilih jenis dokumen, dengan panel pengaturan dinamis yang berubah sesuai pilihan.
3. **Integrasi Lengkap**: Semua pengaturan disimpan di database dan dapat digunakan oleh semua generator PDF dalam aplikasi.

## Struktur File yang Diubah

### 1. `DocumentSettingsForm.extended.tsx` (Komponen UI)

**Lokasi**: `artifacts/umrah-haji/src/components/admin/DocumentSettingsForm.extended.tsx`

**Fitur Utama**:
- Navigasi 6 jenis dokumen: Invoice, Surat Paspor, Surat Cuti, Sertifikat, Surat Umum, dan Global PDF
- Panel pengaturan dinamis yang menampilkan kontrol yang relevan untuk setiap dokumen
- Pengaturan global yang selalu terlihat (Informasi Perusahaan, Kop Surat, Footer)
- Area preview placeholder untuk menampilkan hasil desain (dapat dikembangkan lebih lanjut)
- Validasi form menggunakan Zod dengan aturan ketat untuk warna hex, angka, dan format

**Zod Schema**:
- Semua pengaturan global dimulai dengan prefix `pdf_global_`
- Pengaturan spesifik dokumen menggunakan prefix sesuai tipe: `invoice_`, `passport_letter_`, `leave_permit_`, `certificate_`, `general_letter_`
- Pengaturan opsional ditandai dengan `.optional()` untuk memungkinkan fallback ke global

### 2. `pdf-design-settings.ts` (Utility Library)

**Lokasi**: `artifacts/umrah-haji/src/lib/pdf-design-settings.ts`

**Fungsi Utama**:

#### `mergeDesignSettings(globalSettings, documentSettings)`
Menggabungkan pengaturan global dengan pengaturan spesifik dokumen. Pengaturan spesifik akan menimpa global jika didefinisikan.

```typescript
const finalSettings = mergeDesignSettings(globalSettings, invoiceSettings);
// finalSettings akan menggunakan invoiceSettings.fontFamily jika ada, 
// jika tidak akan menggunakan globalSettings.fontFamily
```

#### `hexToRgb(hex)`
Mengkonversi warna hex menjadi array RGB untuk digunakan oleh jsPDF.

```typescript
const [r, g, b] = hexToRgb("#16a34a");
doc.setTextColor(r, g, b);
```

#### `getFontNameForJsPDF(fontFamily)`
Mengembalikan nama font yang kompatibel dengan jsPDF.

```typescript
doc.setFont(getFontNameForJsPDF("times"));
```

#### `applyDesignSettingsToDoc(doc, settings)`
Menerapkan pengaturan desain ke dokumen jsPDF.

```typescript
applyDesignSettingsToDoc(doc, finalSettings);
```

### 3. `booking-pdf-exporter.ts` (Generator PDF)

**Lokasi**: `artifacts/umrah-haji/src/lib/booking-pdf-exporter.ts`

**Perubahan**:
- Fungsi `exportBookingsToPDF` sekarang menerima parameter `globalDesignSettings` dan `invoiceDesignSettings`
- Semua warna, font, margin, dan orientasi halaman sekarang menggunakan pengaturan dari database
- Watermark, header color, dan elemen visual lainnya dapat dikustomisasi melalui pengaturan invoice spesifik

**Contoh Penggunaan**:

```typescript
import { useCompanySettings } from "@/hooks/useCompanySettings";
import { exportBookingsToPDF } from "@/lib/booking-pdf-exporter";

function MyComponent() {
  const { getSetting } = useCompanySettings();

  const handleExport = () => {
    // Ambil pengaturan global
    const globalSettings = {
      fontFamily: getSetting("pdf_global_font_family") || "helvetica",
      fontSizeHeader: parseInt(getSetting("pdf_global_font_size_header")) || 12,
      fontSizeBody: parseInt(getSetting("pdf_global_font_size_body")) || 10,
      textColor: getSetting("pdf_global_text_color") || "#333333",
      accentColor: getSetting("pdf_global_accent_color") || "#16a34a",
      marginTop: parseInt(getSetting("pdf_global_margin_top")) || 15,
      marginBottom: parseInt(getSetting("pdf_global_margin_bottom")) || 15,
      marginLeft: parseInt(getSetting("pdf_global_margin_left")) || 15,
      marginRight: parseInt(getSetting("pdf_global_margin_right")) || 15,
      showLogo: getSetting("pdf_global_show_logo") !== "false",
      logoPosition: getSetting("pdf_global_logo_position") || "left",
      pageOrientation: getSetting("pdf_global_page_orientation") || "portrait",
      showPageNumber: getSetting("pdf_global_show_page_number") !== "false",
      showTimestamp: getSetting("pdf_global_show_timestamp") !== "false",
    };

    // Ambil pengaturan spesifik invoice
    const invoiceSettings = {
      pageOrientation: getSetting("invoice_page_orientation") || undefined,
      fontFamily: getSetting("invoice_font_family") || undefined,
      headerBgColor: getSetting("invoice_header_bg_color") || undefined,
      headerTextColor: getSetting("invoice_table_header_text_color") || undefined,
      watermarkText: getSetting("invoice_watermark_text") || undefined,
      watermarkOpacity: getSetting("invoice_watermark_opacity") || undefined,
    };

    exportBookingsToPDF(bookings, companyInfo, options, globalSettings, invoiceSettings);
  };

  return <button onClick={handleExport}>Export Invoice</button>;
}
```

## Implementasi untuk Generator PDF Lainnya

Untuk mengintegrasikan pengaturan desain ke generator PDF lainnya (misalnya, untuk Surat Paspor, Surat Cuti, dll.), ikuti pola berikut:

### 1. Buat Fungsi Generator Baru

```typescript
import { PDFDesignSettings, DocumentSpecificSettings, mergeDesignSettings, hexToRgb, getFontNameForJsPDF } from "./pdf-design-settings";

export async function generatePassportLetterPDF(
  data: PassportLetterData,
  companyInfo: CompanyInfo,
  globalDesignSettings: PDFDesignSettings,
  passportLetterSettings?: DocumentSpecificSettings
) {
  const finalSettings = mergeDesignSettings(globalDesignSettings, passportLetterSettings);

  const doc = new jsPDF({
    orientation: finalSettings.pageOrientation,
    unit: "mm",
    format: "a4",
  });

  // Apply font and color
  doc.setFont(getFontNameForJsPDF(finalSettings.fontFamily));
  const [r, g, b] = hexToRgb(finalSettings.textColor);
  doc.setTextColor(r, g, b);

  // Use margins and other settings
  let currentY = finalSettings.marginTop;
  const contentWidth = doc.internal.pageSize.getWidth() - finalSettings.marginLeft - finalSettings.marginRight;

  // ... rest of PDF generation logic
}
```

### 2. Ambil Pengaturan di Component

```typescript
const passportLetterSettings = {
  pageOrientation: getSetting("passport_letter_page_orientation") || undefined,
  fontFamily: getSetting("passport_letter_font_family") || undefined,
  headerTextColor: getSetting("passport_letter_header_text_color") || undefined,
  accentColor: getSetting("passport_letter_accent_color") || undefined,
  showPhoto: getSetting("passport_letter_show_photo") !== "false",
  showQrCode: getSetting("passport_letter_show_qr_code") !== "false",
};

generatePassportLetterPDF(data, companyInfo, globalSettings, passportLetterSettings);
```

## Alur Kerja Pengguna

### Mengatur Desain PDF

1. **Buka Halaman Pengaturan**: Navigasi ke admin panel → "Dokumen & Template Surat"
2. **Pilih Tipe Dokumen**: Klik salah satu kartu (Invoice, Surat Paspor, dll.) atau "Global PDF"
3. **Sesuaikan Pengaturan**:
   - Untuk **Global PDF**: Atur font, ukuran, warna, margin, dan orientasi yang berlaku untuk semua dokumen
   - Untuk **Dokumen Spesifik**: Atur hanya pengaturan yang ingin menimpa global (opsional)
4. **Lihat Preview**: Area preview menampilkan bagaimana dokumen akan terlihat (dapat dikembangkan)
5. **Simpan**: Klik "Simpan Perubahan" untuk menyimpan semua pengaturan ke database

### Menggunakan Pengaturan saat Generate PDF

1. **Ambil Pengaturan**: Gunakan `useCompanySettings` hook untuk mengambil nilai dari database
2. **Merge Settings**: Gunakan `mergeDesignSettings` untuk menggabungkan global dan spesifik
3. **Generate PDF**: Gunakan pengaturan yang sudah digabung dalam generator PDF

## Skema Database

Semua pengaturan disimpan di tabel `company_settings` dengan struktur:

| Kolom | Tipe | Deskripsi |
| --- | --- | --- |
| `setting_key` | `string` (Primary Key) | Kunci pengaturan (contoh: `pdf_global_font_family`) |
| `setting_value` | `any` (JSON) | Nilai pengaturan |
| `created_at` | `timestamp` | Waktu pembuatan |
| `updated_at` | `timestamp` | Waktu pembaruan terakhir |

## Contoh Nilai Pengaturan

### Pengaturan Global

```
pdf_global_font_family = "helvetica"
pdf_global_font_size_header = 12
pdf_global_font_size_body = 10
pdf_global_text_color = "#333333"
pdf_global_accent_color = "#16a34a"
pdf_global_margin_top = 15
pdf_global_margin_bottom = 15
pdf_global_margin_left = 15
pdf_global_margin_right = 15
pdf_global_show_logo = true
pdf_global_logo_position = "left"
pdf_global_page_orientation = "portrait"
pdf_global_show_page_number = true
pdf_global_show_timestamp = true
```

### Pengaturan Invoice

```
invoice_page_orientation = "landscape"  (menimpa global portrait)
invoice_font_family = "times"           (menimpa global helvetica)
invoice_header_bg_color = "#1F2937"     (warna header spesifik)
invoice_watermark_text = "DRAFT"
invoice_watermark_opacity = 0.1
invoice_show_bank_info = true
invoice_show_notes_section = true
invoice_show_package_info = true
invoice_watermark_paid = true
invoice_number_prefix = "INV"
invoice_number_format = "YYYY-MM-{SEQ}"
```

## Tips & Best Practices

1. **Mulai dari Global**: Atur pengaturan global terlebih dahulu untuk konsistensi di semua dokumen
2. **Gunakan Override Spesifik Secara Bijak**: Hanya override pengaturan global jika benar-benar diperlukan untuk dokumen tertentu
3. **Test Preview**: Selalu lihat preview sebelum menggunakan pengaturan di production
4. **Dokumentasi Warna**: Simpan palet warna yang digunakan untuk referensi di masa depan
5. **Backup Pengaturan**: Pertimbangkan untuk mengekspor pengaturan secara berkala sebagai backup

## Troubleshooting

### Pengaturan Tidak Tersimpan

- Pastikan form validation lolos (periksa error message di UI)
- Periksa browser console untuk error API
- Verifikasi bahwa user memiliki permission untuk update settings

### PDF Tidak Menampilkan Warna yang Benar

- Pastikan format hex valid (contoh: `#RRGGBB`)
- Gunakan `isValidHexColor()` untuk validasi
- Periksa bahwa RGB conversion bekerja dengan `hexToRgb()`

### Font Tidak Berubah

- jsPDF hanya mendukung font: `helvetica`, `times`, `courier`
- Pastikan nama font yang digunakan sesuai dengan enum yang didefinisikan
- Gunakan `getFontNameForJsPDF()` untuk konversi yang benar

## Pengembangan Lebih Lanjut

### Preview Area

Area preview saat ini adalah placeholder. Untuk mengembangkannya:

1. Gunakan library PDF viewer seperti `react-pdf` atau `pdfjs-dist`
2. Generate PDF preview secara real-time saat user mengubah pengaturan
3. Tampilkan preview di iframe atau canvas

### Template Editor

Pertimbangkan untuk menambahkan:

1. Drag-and-drop layout builder untuk elemen PDF
2. Visual color picker yang lebih canggih
3. Font preview sebelum apply
4. Undo/Redo functionality

### Multi-Language Support

Untuk mendukung multiple bahasa:

1. Tambahkan kolom `language` ke pengaturan
2. Simpan pengaturan terpisah untuk setiap bahasa
3. Gunakan language context untuk memilih pengaturan yang tepat

---

**Versi**: 2.0  
**Tanggal Update**: Mei 2026  
**Author**: Manus AI
