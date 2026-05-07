# Rancangan Skema Pengaturan Desain PDF yang Komprehensif

## 1. Prinsip Desain Skema

Skema pengaturan ini dirancang dengan prinsip **"Don't Repeat Yourself (DRY)"** untuk menghindari redundansi. Pengaturan akan dibagi menjadi dua kategori utama:

1.  **Pengaturan Global (Global Settings)**: Ini adalah pengaturan dasar yang berlaku untuk semua jenis dokumen PDF secara default. Contohnya termasuk jenis font default, ukuran font umum, warna teks utama, margin halaman, dan visibilitas elemen dasar seperti logo atau nomor halaman.
2.  **Pengaturan Spesifik Dokumen (Document-Specific Overrides)**: Pengaturan ini memungkinkan penyesuaian untuk jenis dokumen tertentu (misalnya, Invoice, Surat Paspor, Surat Cuti). Jika sebuah pengaturan didefinisikan di sini, ia akan menimpa pengaturan global yang sesuai. Jika tidak didefinisikan, pengaturan global akan digunakan sebagai *fallback*.

Pendekatan ini memastikan bahwa pengguna hanya perlu mengatur nilai sekali untuk semua dokumen, dan hanya perlu menyesuaikan jika ada kebutuhan spesifik untuk dokumen tertentu.

## 2. Struktur Data Pengaturan

Pengaturan akan disimpan sebagai pasangan `key-value` di database, mirip dengan implementasi `useCompanySettings` yang sudah ada. Kunci pengaturan akan mengikuti konvensi penamaan yang jelas (`pdf_global_...` untuk global, `invoice_...` untuk invoice, `passport_letter_...` untuk surat paspor, dll.).

### 2.1. Tipe Dokumen yang Didukung

Berdasarkan referensi gambar, tipe dokumen yang akan memiliki pengaturan spesifik adalah:

*   **Invoice**
*   **Surat Paspor**
*   **Surat Cuti**
*   **Sertifikat**
*   **Surat Umum**

### 2.2. Skema Pengaturan Global (Prefix: `pdf_global_`)

Pengaturan ini akan menjadi dasar untuk semua dokumen.

| Kunci Pengaturan                 | Tipe Data      | Deskripsi                                                               | Nilai Default | Contoh Nilai                                 |
| :------------------------------- | :------------- | :---------------------------------------------------------------------- | :------------ | :------------------------------------------- |
| `pdf_global_font_family`         | `enum`         | Jenis font default untuk semua dokumen.                                 | `helvetica`   | `helvetica`, `times`, `courier`              |
| `pdf_global_font_size_header`    | `number`       | Ukuran font default untuk judul/header (pt).                            | `12`          | `8` - `24`                                   |
| `pdf_global_font_size_body`      | `number`       | Ukuran font default untuk teks isi (pt).                                | `10`          | `6` - `16`                                   |
| `pdf_global_text_color`          | `string` (hex) | Warna teks utama default.                                               | `#333333`     | `#RRGGBB`                                    |
| `pdf_global_accent_color`        | `string` (hex) | Warna aksen default (misalnya untuk garis, highlight).                  | `#16a34a`     | `#RRGGBB`                                    |
| `pdf_global_margin_top`          | `number`       | Margin atas halaman (mm).                                               | `15`          | `5` - `30`                                   |
| `pdf_global_margin_bottom`       | `number`       | Margin bawah halaman (mm).                                              | `15`          | `5` - `30`                                   |
| `pdf_global_margin_left`         | `number`       | Margin kiri halaman (mm).                                               | `15`          | `5` - `30`                                   |
| `pdf_global_margin_right`        | `number`       | Margin kanan halaman (mm).                                              | `15`          | `5` - `30`                                   |
| `pdf_global_show_logo`           | `boolean`      | Menampilkan logo perusahaan di header.                                  | `true`        | `true`, `false`                              |
| `pdf_global_logo_position`       | `enum`         | Posisi logo di header.                                                  | `left`        | `left`, `center`, `right`                    |
| `pdf_global_show_page_number`    | `boolean`      | Menampilkan nomor halaman di footer.                                    | `true`        | `true`, `false`                              |
| `pdf_global_show_timestamp`      | `boolean`      | Menampilkan waktu cetak di footer.                                      | `true`        | `true`, `false`                              |
| `pdf_global_page_orientation`    | `enum`         | Orientasi halaman default.                                              | `portrait`    | `portrait`, `landscape`                      |

### 2.3. Skema Pengaturan Spesifik Dokumen

Pengaturan ini akan menimpa pengaturan global jika diisi. Jika tidak diisi, nilai global akan digunakan. Semua pengaturan ini bersifat `optional`.

#### 2.3.1. Pengaturan Invoice (Prefix: `invoice_`)

| Kunci Pengaturan                     | Tipe Data      | Deskripsi                                                               | Nilai Default | Contoh Nilai                                 |
| :----------------------------------- | :------------- | :---------------------------------------------------------------------- | :------------ | :------------------------------------------- |
| `invoice_page_orientation`           | `enum`         | Orientasi halaman khusus untuk invoice.                                 | `(global)`    | `portrait`, `landscape`                      |
| `invoice_font_family`                | `enum`         | Jenis font khusus untuk invoice.                                        | `(global)`    | `helvetica`, `times`, `courier`              |
| `invoice_header_bg_color`            | `string` (hex) | Warna latar belakang header invoice.                                    | `(global)`    | `#RRGGBB`                                    |
| `invoice_table_header_text_color`    | `string` (hex) | Warna teks header tabel invoice.                                        | `(global)`    | `#RRGGBB`                                    |
| `invoice_watermark_text`             | `string`       | Teks watermark kustom untuk invoice.                                    | `(global)`    | `DRAFT`, `SAMPLE`                            |
| `invoice_watermark_opacity`          | `number`       | Opasitas watermark (0-1).                                               | `(global)`    | `0.1`, `0.5`                                 |
| `invoice_show_bank_info`             | `boolean`      | Menampilkan informasi bank di invoice.                                  | `true`        | `true`, `false`                              |
| `invoice_show_notes_section`         | `boolean`      | Menampilkan bagian catatan di invoice.                                  | `true`        | `true`, `false`                              |
| `invoice_show_package_info`          | `boolean`      | Menampilkan informasi paket di invoice.                                 | `true`        | `true`, `false`                              |
| `invoice_watermark_paid`             | `boolean`      | Menampilkan watermark "LUNAS" jika invoice sudah lunas.                 | `true`        | `true`, `false`                              |
| `invoice_number_prefix`              | `string`       | Prefix nomor invoice.                                                   | `INV`         | `INV`, `FAK`                                 |
| `invoice_number_format`              | `string`       | Format nomor invoice (YYYY-MM-{SEQ}).                                   | `YYYY-MM-{SEQ}` | `YYYY-MM-{SEQ}`, `INV-{SEQ}/MM/YYYY`         |

#### 2.3.2. Pengaturan Surat Paspor (Prefix: `passport_letter_`)

| Kunci Pengaturan                     | Tipe Data      | Deskripsi                                                               | Nilai Default | Contoh Nilai                                 |
| :----------------------------------- | :------------- | :---------------------------------------------------------------------- | :------------ | :------------------------------------------- |
| `passport_letter_page_orientation`   | `enum`         | Orientasi halaman khusus untuk surat paspor.                            | `(global)`    | `portrait`, `landscape`                      |
| `passport_letter_font_family`        | `enum`         | Jenis font khusus untuk surat paspor.                                   | `(global)`    | `helvetica`, `times`, `courier`              |
| `passport_letter_header_text_color`  | `string` (hex) | Warna teks header surat paspor.                                         | `(global)`    | `#RRGGBB`                                    |
| `passport_letter_accent_color`       | `string` (hex) | Warna aksen khusus untuk surat paspor.                                  | `(global)`    | `#RRGGBB`                                    |
| `passport_letter_show_photo`         | `boolean`      | Menampilkan foto di surat paspor.                                       | `true`        | `true`, `false`                              |
| `passport_letter_show_qr_code`       | `boolean`      | Menampilkan QR Code di surat paspor.                                    | `true`        | `true`, `false`                              |

#### 2.3.3. Pengaturan Surat Cuti (Prefix: `leave_permit_`)

| Kunci Pengaturan                     | Tipe Data      | Deskripsi                                                               | Nilai Default | Contoh Nilai                                 |
| :----------------------------------- | :------------- | :---------------------------------------------------------------------- | :------------ | :------------------------------------------- |
| `leave_permit_page_orientation`      | `enum`         | Orientasi halaman khusus untuk surat cuti.                              | `(global)`    | `portrait`, `landscape`                      |
| `leave_permit_font_family`           | `enum`         | Jenis font khusus untuk surat cuti.                                     | `(global)`    | `helvetica`, `times`, `courier`              |
| `leave_permit_header_text_color`     | `string` (hex) | Warna teks header surat cuti.                                           | `(global)`    | `#RRGGBB`                                    |
| `leave_permit_accent_color`          | `string` (hex) | Warna aksen khusus untuk surat cuti.                                    | `(global)`    | `#RRGGBB`                                    |
| `leave_permit_include_company_logo`  | `boolean`      | Menyertakan logo perusahaan di surat cuti.                              | `true`        | `true`, `false`                              |

#### 2.3.4. Pengaturan Sertifikat (Prefix: `certificate_`)

| Kunci Pengaturan                     | Tipe Data      | Deskripsi                                                               | Nilai Default | Contoh Nilai                                 |
| :----------------------------------- | :------------- | :---------------------------------------------------------------------- | :------------ | :------------------------------------------- |
| `certificate_page_orientation`       | `enum`         | Orientasi halaman khusus untuk sertifikat.                              | `(global)`    | `portrait`, `landscape`                      |
| `certificate_font_family`            | `enum`         | Jenis font khusus untuk sertifikat.                                     | `(global)`    | `helvetica`, `times`, `courier`              |
| `certificate_border_color`           | `string` (hex) | Warna border sertifikat.                                                | `#daa520`     | `#RRGGBB`                                    |
| `certificate_text_color`             | `string` (hex) | Warna teks sertifikat.                                                  | `#165634`     | `#RRGGBB`                                    |
| `certificate_background_image_url`   | `string` (URL) | URL gambar latar belakang untuk sertifikat.                             | `(none)`      | `https://example.com/bg.png`                 |

#### 2.3.5. Pengaturan Surat Umum (Prefix: `general_letter_`)

| Kunci Pengaturan                     | Tipe Data      | Deskripsi                                                               | Nilai Default | Contoh Nilai                                 |
| :----------------------------------- | :------------- | :---------------------------------------------------------------------- | :------------ | :------------------------------------------- |
| `general_letter_page_orientation`    | `enum`         | Orientasi halaman khusus untuk surat umum.                              | `(global)`    | `portrait`, `landscape`                      |
| `general_letter_font_family`         | `enum`         | Jenis font khusus untuk surat umum.                                     | `(global)`    | `helvetica`, `times`, `courier`              |
| `general_letter_header_text_color`   | `string` (hex) | Warna teks header surat umum.                                           | `(global)`    | `#RRGGBB`                                    |
| `general_letter_accent_color`        | `string` (hex) | Warna aksen khusus untuk surat umum.                                    | `(global)`    | `#RRGGBB`                                    |
| `general_letter_show_letterhead`     | `boolean`      | Menampilkan kop surat di surat umum.                                    | `true`        | `true`, `false`                              |

## 3. Implementasi UI (Revisi `DocumentSettingsForm.extended.tsx`)

Komponen `DocumentSettingsForm.extended.tsx` akan direvisi untuk mencerminkan struktur skema ini. Ini akan melibatkan:

*   **Bagian Pemilihan Dokumen**: Menggunakan komponen `Card` atau `Button` yang dapat dipilih untuk setiap jenis dokumen (Invoice, Surat Paspor, dll.) seperti yang terlihat pada gambar referensi. Ini akan menjadi navigasi utama.
*   **Area Pengaturan Dinamis**: Berdasarkan dokumen yang dipilih, bagian pengaturan di bawahnya akan berubah secara dinamis untuk menampilkan pengaturan global dan pengaturan spesifik dokumen yang relevan.
*   **Preview Area**: Sebuah panel di sisi kanan yang akan menampilkan pratinjau visual dari dokumen yang sedang diatur. Ini akan membutuhkan integrasi dengan fungsi rendering PDF di *frontend* (mungkin menggunakan iframe atau pustaka *viewer* PDF).
*   **Input Kontrol**: Menggunakan `Input` (untuk teks, angka, warna hex), `Select` (untuk enum seperti font family, orientasi), dan `Switch` (untuk boolean) dari `@/components/ui/`.

## 4. Logika Pengambilan dan Penerapan Pengaturan

*   **`useCompanySettings` Hook**: Hook ini akan diperbarui untuk mengambil semua pengaturan yang didefinisikan dalam skema ini. Fungsi `getSetting` akan tetap digunakan untuk mengambil nilai berdasarkan kunci.
*   **Fungsi `mergeDesignSettings`**: Fungsi ini (dari `pdf-design-settings.ts`) akan menjadi kunci untuk menerapkan prinsip non-redundansi. Ia akan mengambil pengaturan global dan pengaturan spesifik dokumen, lalu menggabungkannya, dengan pengaturan spesifik menimpa yang global.
*   **Generator PDF**: Setiap generator PDF (misalnya `booking-pdf-exporter.ts`, `document-generator-v2.ts`) akan menerima objek pengaturan yang sudah digabungkan ini dan menggunakannya untuk merender PDF.

## 5. Alur Kerja Pengguna yang Diharapkan

1.  Pengguna membuka halaman "Dokumen & Template Surat".
2.  Mereka melihat daftar jenis dokumen (Invoice, Surat Paspor, dll.) sebagai kartu.
3.  Pengguna memilih "Invoice".
4.  Panel pengaturan akan menampilkan:
    *   Pengaturan global (misalnya, font default, margin) yang dapat diubah.
    *   Pengaturan spesifik invoice (misalnya, prefix nomor, warna aksen invoice, watermark) yang dapat menimpa pengaturan global.
5.  Area pratinjau akan menampilkan bagaimana invoice akan terlihat dengan pengaturan saat ini.
6.  Pengguna dapat beralih ke "Surat Paspor" dan menyesuaikan pengaturannya, melihat pratinjau yang sesuai.
7.  Setelah selesai, pengguna menyimpan semua pengaturan.

Skema ini akan menjadi dasar untuk implementasi UI dan logika backend yang baru, memastikan fitur yang kuat dan mudah digunakan.
