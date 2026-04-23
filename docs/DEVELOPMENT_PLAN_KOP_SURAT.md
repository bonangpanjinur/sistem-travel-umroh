# Analisis dan Rencana Pengembangan: Kop Surat & Invoice Dinamis

Dokumen ini berisi analisis teknis dan rencana pengembangan untuk mengintegrasikan pengaturan profil travel ke dalam sistem pembuatan dokumen (kop surat, invoice, sertifikat, dll) agar identitas travel bersifat dinamis.

## 1. Analisis Kondisi Saat Ini

Berdasarkan analisis pada kode sumber, ditemukan kondisi sebagai berikut:

*   **Penyimpanan Data Profil**: Data profil travel (Nama, Alamat, Logo, Kontak) sudah tersimpan di database pada tabel `website_settings`.
*   **Antarmuka Pengaturan**: Sudah terdapat UI untuk mengelola profil ini di menu **Admin > Appearance > Branding**.
*   **Sistem Dokumen**: Fitur pembuatan PDF menggunakan library `jsPDF` yang dipusatkan di `src/lib/document-generator.ts`.
*   **Masalah Utama**: Data perusahaan pada dokumen masih bersifat **hardcoded** (statis) menggunakan objek `defaultCompanyInfo` di dalam file `document-generator.ts`.

| Komponen | Status Saat Ini | Target Pengembangan |
| :--- | :--- | :--- |
| **Nama Travel** | Hardcoded: "PT. Umrah Haji Travel" | Dinamis dari `website_settings.company_name` |
| **Alamat** | Hardcoded: Jakarta Selatan | Dinamis dari `website_settings.footer_address` |
| **Kontak (Telp/Email)** | Hardcoded | Dinamis dari `footer_phone` & `footer_email` |
| **Logo** | Tidak muncul di Kop | Muncul di Kop menggunakan `logo_url` |

## 2. Rencana Pengembangan

### Tahap 1: Refaktor Utility Document Generator
Memodifikasi `src/lib/document-generator.ts` agar fungsi `addLetterhead` dapat menerima URL logo dan merendernya ke dalam PDF.
*   Menambahkan logika `doc.addImage()` untuk mendukung logo travel.
*   Memastikan fallback (data default) tetap ada jika data pengaturan kosong.

### Tahap 2: Integrasi Data pada Komponen Admin
Memodifikasi `src/pages/admin/AdminDocumentGenerator.tsx` untuk:
*   Memanggil hook `useWebsiteSettings()` guna mengambil data profil terbaru.
*   Mengirimkan data profil tersebut sebagai argumen ke fungsi generator dokumen.

### Tahap 3: Optimasi Invoice & Sertifikat
*   Memastikan `generateInvoice` dan `generateUmrahCertificate` menggunakan helper `addLetterhead` yang sudah diperbarui.
*   Menyesuaikan layout invoice agar tetap rapi saat logo travel ditambahkan.

## 3. Langkah Implementasi Teknis (Code Snippet)

```typescript
// Contoh integrasi di AdminDocumentGenerator.tsx
const { data: settings } = useWebsiteSettings();

const handleGenerateInvoice = (data: InvoiceData) => {
  const companyInfo = {
    name: settings?.company_name || "Travel Kami",
    address: settings?.footer_address || "",
    phone: settings?.footer_phone || "",
    email: settings?.footer_email || "",
    logo: settings?.logo_url || ""
  };
  
  const doc = generateInvoice(data, companyInfo);
  doc.save(`Invoice-${data.invoiceNumber}.pdf`);
};
```

## 4. Kesimpulan
Dengan rencana ini, admin travel tidak perlu lagi mengubah kode program untuk mengganti identitas pada surat atau invoice. Cukup dengan memperbarui profil di menu pengaturan, seluruh dokumen yang dicetak akan otomatis menyesuaikan.
