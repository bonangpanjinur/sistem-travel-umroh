# Rancangan Struktur Fitur Pengaturan Desain PDF

## 1. Analisis Kebutuhan

Berdasarkan permintaan pengguna, fitur ini bertujuan untuk menyediakan pengaturan tampilan atau desain yang fleksibel untuk berbagai jenis dokumen PDF yang dihasilkan oleh sistem, seperti invoice, surat paspor, dan surat izin cuti. Saat ini, beberapa pengaturan dasar terkait dokumen sudah ada di `DocumentSettingsForm.tsx`, termasuk pilihan font (`pdf_default_font`) dan warna aksen untuk invoice, e-ticket, dan sertifikat.

## 2. Identifikasi Elemen Desain Umum

Untuk mencapai fleksibilitas, kita perlu mengidentifikasi elemen-elemen desain yang umum di berbagai dokumen PDF dan yang dapat dikonfigurasi oleh pengguna. Elemen-elemen ini meliputi:

*   **Font**: Jenis font (misalnya, Helvetica, Times, Courier) dan ukuran font default untuk berbagai bagian (judul, subjudul, teks isi, footer).
*   **Warna**: Warna teks, warna latar belakang header/footer, warna aksen, warna garis tabel, dll.
*   **Tata Letak (Layout)**: Margin halaman, spasi antar baris/paragraf, perataan teks.
*   **Header & Footer**: Konten header/footer (teks, logo), posisi, visibilitas elemen (misalnya, nomor halaman, timestamp).
*   **Logo**: Ukuran, posisi, visibilitas logo perusahaan.
*   **Watermark**: Teks watermark, opasitas, rotasi, visibilitas (misalnya, watermark 'LUNAS' untuk invoice).

## 3. Proposal Struktur Data Pengaturan

Kita akan memperluas skema pengaturan yang sudah ada di `DocumentSettingsForm.tsx` dan `useCompanySettings` untuk menyimpan pengaturan desain PDF. Pendekatan key-value pair yang sudah ada dapat digunakan dengan menambahkan kunci-kunci baru. Pengaturan dapat dibagi menjadi dua kategori utama:

1.  **Pengaturan Global PDF**: Pengaturan yang berlaku untuk semua dokumen PDF secara default.
2.  **Pengaturan Spesifik Dokumen**: Pengaturan yang dapat menimpa pengaturan global untuk jenis dokumen tertentu (misalnya, invoice, surat paspor, surat izin cuti).

### Contoh Struktur Data (Penambahan pada `documentSettingsSchema`):

```typescript
z.object({
  // ... pengaturan yang sudah ada

  // Pengaturan Global PDF
  pdf_global_font_family: z.enum(["helvetica", "times", "courier"]).default("helvetica"),
  pdf_global_font_size_header: z.number().min(8).max(24).default(12),
  pdf_global_font_size_body: z.number().min(6).max(16).default(10),
  pdf_global_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").default("#333333"),
  pdf_global_accent_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").default("#16a34a"),
  pdf_global_margin_top: z.number().min(5).max(30).default(15),
  pdf_global_margin_bottom: z.number().min(5).max(30).default(15),
  pdf_global_margin_left: z.number().min(5).max(30).default(15),
  pdf_global_margin_right: z.number().min(5).max(30).default(15),
  pdf_global_show_logo: z.boolean().default(true),
  pdf_global_logo_position: z.enum(["left", "center", "right"]).default("left"),
  pdf_global_show_page_number: z.boolean().default(true),
  pdf_global_show_timestamp: z.boolean().default(true),

  // Pengaturan Spesifik Invoice
  invoice_font_family: z.enum(["helvetica", "times", "courier"]).optional(), // Jika tidak diisi, pakai global
  invoice_header_bg_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  invoice_table_header_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  invoice_watermark_text: z.string().optional(),
  invoice_watermark_opacity: z.number().min(0).max(1).optional(),

  // Pengaturan Spesifik Surat Paspor
  passport_letter_font_family: z.enum(["helvetica", "times", "courier"]).optional(),
  passport_letter_header_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  // ... pengaturan lain untuk surat paspor

  // Pengaturan Spesifik Surat Izin Cuti
  leave_permit_font_family: z.enum(["helvetica", "times", "courier"]).optional(),
  leave_permit_header_text_color: z.string().regex(/^#[0-9A-F]{6}$/i, "Format warna hex tidak valid").optional(),
  // ... pengaturan lain untuk surat izin cuti
})
```

**Catatan**: Pengaturan spesifik dokumen akan bersifat opsional. Jika tidak diatur, nilai dari pengaturan global akan digunakan.

## 4. Implementasi pada Antarmuka Pengguna (UI)

Antarmuka pengguna untuk pengaturan ini akan ditambahkan ke `DocumentSettingsForm.tsx`. Ini akan melibatkan:

*   Penambahan bagian baru untuk 
pengaturan global PDF dan bagian terpisah untuk pengaturan spesifik per jenis dokumen (Invoice, Surat Paspor, Surat Izin Cuti). Setiap bagian akan memiliki kontrol UI yang sesuai (input teks untuk warna hex, select untuk font, switch untuk boolean, dll.).

## 5. Implementasi pada Backend dan Logika PDF Generation

1.  **Pembaruan Skema Database**: Skema database perlu diperbarui untuk menyimpan pengaturan baru ini. Ini kemungkinan akan melibatkan penambahan kolom baru di tabel `company_settings` atau tabel terkait lainnya, atau memperbarui struktur data JSON jika pengaturan disimpan sebagai JSON.
2.  **API Endpoint**: Pastikan API endpoint yang digunakan oleh `useCompanySettings` dapat menangani penyimpanan dan pengambilan pengaturan baru ini.
3.  **Logika PDF Generation**: Pada file `booking-pdf-exporter.ts` dan `document-generator-v2.ts` (serta file generator PDF lainnya), logika pembuatan PDF perlu dimodifikasi untuk membaca pengaturan desain dari `useCompanySettings` dan menerapkannya. Ini akan melibatkan:
    *   Mengambil nilai pengaturan global dan spesifik dokumen.
    *   Menerapkan font, warna, margin, dan elemen desain lainnya berdasarkan pengaturan yang diambil.
    *   Menerapkan logika fallback: jika pengaturan spesifik dokumen tidak ada, gunakan pengaturan global.

## 6. Contoh Alur Kerja Pengaturan Desain

1.  Pengguna masuk ke halaman pengaturan dokumen.
2.  Pengguna melihat bagian 
pengaturan global PDF dan menyesuaikan font default, warna, margin, dll.
3.  Pengguna kemudian beralih ke bagian pengaturan spesifik untuk Invoice dan mengatur warna aksen yang berbeda hanya untuk invoice.
4.  Saat invoice dicetak, sistem akan menggunakan pengaturan warna aksen spesifik invoice, tetapi akan menggunakan font default global karena tidak ada pengaturan font spesifik invoice yang diatur.
5.  Saat surat paspor dicetak, sistem akan menggunakan semua pengaturan global karena tidak ada pengaturan spesifik yang diatur untuk surat paspor.

## 7. Pertimbangan Teknis

*   **jsPDF**: Pustaka `jsPDF` yang digunakan saat ini mendukung pengaturan font, warna, dan posisi. Kita perlu memastikan bahwa semua elemen desain yang diusulkan dapat diimplementasikan dengan `jsPDF` atau mencari alternatif jika ada batasan.
*   **Font Embedding**: Untuk memastikan konsistensi tampilan di berbagai perangkat, font yang digunakan dalam PDF harus di-embed. `jsPDF` memiliki mekanisme untuk ini.
*   **Modularitas**: Usahakan agar kode pengaturan desain modular dan mudah diperluas untuk jenis dokumen baru di masa mendatang.

## 8. Tahapan Implementasi

1.  **Pembaruan Skema**: Tambahkan field baru ke skema pengaturan di `documentSettingsSchema` dan `useCompanySettings`.
2.  **Pembaruan UI**: Modifikasi `DocumentSettingsForm.tsx` untuk menampilkan opsi pengaturan desain baru.
3.  **Pembaruan Logika PDF**: Sesuaikan `booking-pdf-exporter.ts`, `document-generator-v2.ts`, dan file generator PDF lainnya untuk menggunakan pengaturan desain yang baru.
4.  **Pengujian**: Uji setiap jenis dokumen PDF untuk memastikan pengaturan diterapkan dengan benar dan tidak ada regresi.

Dengan rancangan ini, kita dapat mulai mengimplementasikan fitur pengaturan desain PDF secara bertahap.
