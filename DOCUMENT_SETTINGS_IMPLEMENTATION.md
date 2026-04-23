# Implementasi Pengaturan Dinamis untuk Kop Surat dan Invoice

## Ringkasan Perubahan

Sistem telah diperbaharui untuk mendukung pengaturan dinamis kop surat, invoice, dan dokumen lainnya. Sebelumnya, semua informasi perusahaan dan format dokumen di-hardcode dalam kode. Sekarang semuanya dapat dikonfigurasi melalui Admin Settings.

## File yang Dimodifikasi/Ditambahkan

### 1. Database Migration
**File:** `supabase/migrations/20260423033528_add_document_letterhead_settings.sql`

Menambahkan 13 pengaturan baru ke tabel `company_settings`:
- `company_city` - Kota untuk tanda tangan dokumen
- `company_website` - Website perusahaan
- `letterhead_show_logo` - Tampilkan logo di kop surat
- `letterhead_show_website` - Tampilkan website di kop surat
- `invoice_number_prefix` - Prefix nomor invoice (default: "INV")
- `invoice_number_format` - Format nomor invoice (default: "YYYY-MM-{SEQ}")
- `invoice_show_bank_info` - Tampilkan info bank di invoice
- `invoice_show_notes_section` - Tampilkan bagian catatan di invoice
- `eticket_header_color` - Warna header e-ticket (hex color)
- `certificate_border_color` - Warna border sertifikat (hex color)
- `certificate_text_color` - Warna teks sertifikat (hex color)
- `document_footer_show_timestamp` - Tampilkan waktu cetak
- `document_footer_show_page_number` - Tampilkan nomor halaman

### 2. Hook yang Diperbarui
**File:** `src/hooks/useCompanyInfo.ts`

**Perubahan:**
- Ditambahkan interface `DocumentSettings` untuk mengelompokkan semua pengaturan dokumen
- Memperbaiki field name dari `company_logo` menjadi `company_logo_url` (sesuai database)
- Menambahkan fungsi `unwrapBoolean()` untuk parsing nilai boolean dari JSONB
- Menambahkan query untuk semua pengaturan dokumen
- Return object sekarang mencakup `documentSettings` dan `city`

**Penggunaan:**
```typescript
const { company, city, documentSettings, bankAccount, isLoading } = useCompanyInfo();

// Akses pengaturan
console.log(documentSettings.letterhead_show_logo);
console.log(documentSettings.eticket_header_color);
```

### 3. Document Generator V2
**File:** `src/lib/document-generator-v2.ts` (BARU)

**Fitur Utama:**
- Semua fungsi generate sekarang menerima parameter `DocumentSettings`
- Fungsi `addLetterhead()` mendukung opsi `showLogo` dan `showWebsite`
- Fungsi `addFooter()` mendukung opsi `showTimestamp` dan `showPageNumber`
- Fungsi `generateETicket()` menggunakan warna dinamis dari `eticket_header_color`
- Fungsi `generateUmrahCertificate()` menggunakan warna dinamis untuk border dan teks
- Fungsi helper `hexToRgb()` untuk konversi warna hex ke RGB

**Signature Fungsi:**
```typescript
// Sebelumnya
generateLeaveLetter(data, letterNumber, company)

// Sekarang
generateLeaveLetter(data, letterNumber, company, settings)
generateETicket(data, company, settings)
generateUmrahCertificate(data, company, settings)
```

### 4. Admin Settings Form
**File:** `src/components/admin/DocumentSettingsForm.tsx` (BARU)

Komponen form untuk mengelola semua pengaturan dokumen:
- **Informasi Dasar:** Kota, Website
- **Pengaturan Kop Surat:** Toggle logo dan website
- **Pengaturan Invoice:** Prefix, format nomor, toggle info bank dan catatan
- **Pengaturan Warna:** Color picker untuk header e-ticket, border sertifikat, teks sertifikat
- **Pengaturan Footer:** Toggle timestamp dan nomor halaman

### 5. Admin Settings Page
**File:** `src/pages/admin/AdminSettings.tsx`

**Perubahan:**
- Ditambahkan import untuk `DocumentSettingsForm`
- Ditambahkan `<DocumentSettingsForm />` di antara Change Password dan Certificate Settings

## Cara Menggunakan

### Untuk Admin

1. Buka **Pengaturan** → **Pengaturan Dokumen & Kop Surat**
2. Atur informasi dasar:
   - Kota (untuk tanda tangan dokumen)
   - Website perusahaan
3. Atur kop surat:
   - Pilih apakah logo dan website ditampilkan
4. Atur invoice:
   - Tentukan prefix dan format nomor
   - Pilih apakah info bank dan catatan ditampilkan
5. Atur warna dokumen:
   - Warna header e-ticket
   - Warna border sertifikat
   - Warna teks sertifikat
6. Atur footer dokumen:
   - Pilih apakah waktu cetak dan nomor halaman ditampilkan
7. Klik **Simpan Perubahan**

### Untuk Developer

#### Menggunakan Document Generator V2

```typescript
import { useCompanyInfo } from '@/hooks/useCompanyInfo';
import { generateLeaveLetter } from '@/lib/document-generator-v2';

function MyComponent() {
  const { company, city, documentSettings } = useCompanyInfo();

  const handleGenerateLetter = () => {
    const doc = generateLeaveLetter(
      {
        employeeName: "John Doe",
        employeePosition: "Manager",
        employeeNik: "1234567890123456",
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-10'),
        reason: "Cuti tahunan",
      },
      "CUTI/001/2024",
      company,
      documentSettings  // Pengaturan dinamis
    );

    doc.save('surat-cuti.pdf');
  };

  return <button onClick={handleGenerateLetter}>Generate Surat</button>;
}
```

#### Migrasi dari Document Generator Lama

Jika masih menggunakan `document-generator.ts` lama:

1. Ganti import:
```typescript
// Dari
import { generateLeaveLetter } from '@/lib/document-generator';

// Ke
import { generateLeaveLetter } from '@/lib/document-generator-v2';
```

2. Tambahkan parameter `documentSettings`:
```typescript
// Dari
generateLeaveLetter(data, letterNumber, company)

// Ke
const { company, documentSettings } = useCompanyInfo();
generateLeaveLetter(data, letterNumber, company, documentSettings)
```

## Format Nomor Invoice

Format nomor invoice menggunakan placeholder:
- `YYYY` - Tahun 4 digit (contoh: 2024)
- `MM` - Bulan 2 digit (contoh: 01)
- `{SEQ}` - Nomor urut (contoh: 001)

**Contoh Format:**
- `YYYY-MM-{SEQ}` → `2024-01-001`
- `INV-{SEQ}-YYYY` → `INV-001-2024`
- `{SEQ}/YYYY/MM` → `001/2024/01`

## Warna Dokumen

Semua warna menggunakan format hex (6 digit):
- `#16a34a` - Hijau (default e-ticket header)
- `#daa520` - Emas (default certificate border)
- `#165634` - Hijau gelap (default certificate text)

Gunakan color picker di form untuk memilih warna dengan mudah.

## Backward Compatibility

**File lama `document-generator.ts` masih tersedia** untuk backward compatibility, tetapi tidak akan menerima update pengaturan dinamis. Disarankan untuk migrasi ke `document-generator-v2.ts`.

## Testing

Untuk menguji pengaturan yang telah dibuat:

1. Buka Admin Settings
2. Ubah pengaturan dokumen
3. Generate dokumen (surat, invoice, e-ticket, sertifikat)
4. Verifikasi bahwa dokumen menggunakan pengaturan yang baru disimpan

## Troubleshooting

### Pengaturan tidak tersimpan
- Pastikan user memiliki role `super_admin`
- Cek browser console untuk error messages

### Warna tidak berubah di dokumen
- Pastikan format warna hex benar (contoh: `#16a34a`)
- Refresh halaman setelah menyimpan pengaturan
- Clear browser cache jika perlu

### Logo tidak muncul di kop surat
- Pastikan `letterhead_show_logo` diaktifkan
- Verifikasi URL logo di pengaturan branding
- Cek bahwa URL logo accessible dari browser

## Roadmap Pengembangan

Fitur yang dapat ditambahkan di masa depan:
- [ ] Template kop surat yang dapat dikustomisasi
- [ ] Nomor seri otomatis untuk invoice
- [ ] Signature digital di dokumen
- [ ] Watermark custom
- [ ] Multiple company profiles (untuk multi-branch)
- [ ] Export template ke format lain (Word, Excel)
