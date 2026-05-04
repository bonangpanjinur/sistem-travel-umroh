# Rencana Perbaikan dan Pengembangan Sistem `umrah-haji-magic`

Dokumen ini merinci langkah-langkah strategis untuk mengatasi kekurangan yang teridentifikasi dalam analisis desain dan konsistensi sistem. Fokus utama adalah pada peningkatan pengalaman pengguna (UX), konsistensi branding, dan aksesibilitas.

## 1. Konsolidasi Branding dan Navigasi (Prioritas Tinggi)

**Masalah:** Duplikasi komponen `Navbar`/`Footer` (statis) dan `DynamicNavbar`/`DynamicFooter` (dinamis) menyebabkan inkonsistensi visual antara halaman publik dan halaman tenant.

**Rencana Perbaikan:**
*   **Penyatuan Komponen:** Menghapus `Navbar.tsx` dan `Footer.tsx` yang bersifat statis.
*   **Migrasi ke Dinamis:** Mengarahkan semua penggunaan layout ke `DynamicNavbar` dan `DynamicFooter`.
*   **Fallback Branding:** Memastikan `DynamicNavbar` memiliki nilai default yang elegan (menggunakan logo 'ع' dan nama 'UmrohTravel') jika data dari database belum tersedia.
*   **Refaktor Layout:** Memperbarui `PublicLayout.tsx` dan `AdminLayout.tsx` untuk menggunakan komponen dinamis secara konsisten.

## 2. Optimasi Pemuatan Font dan Pencegahan FOUT (Prioritas Menengah)

**Masalah:** Pemuatan font Google melalui JavaScript di `ThemeProvider.tsx` menyebabkan perubahan font yang tiba-tiba (*Flash of Unstyled Text*).

**Rencana Perbaikan:**
*   **Preload Font Utama:** Menambahkan tag `<link rel="preconnect">` dan `<link rel="dns-prefetch">` untuk Google Fonts di `index.html`.
*   **CSS Font-Display:** Memastikan penggunaan `display=swap` pada URL Google Fonts (sudah ada, namun perlu dioptimalkan).
*   **Sistem Fallback:** Memperhalus transisi font dengan mendefinisikan font sistem yang serupa di variabel CSS `--font-sans` dan `--font-display`.

## 3. Peningkatan Aksesibilitas dan Fokus Visual (Prioritas Tinggi)

**Masalah:** Kurangnya indikator fokus keyboard yang jelas dan potensi masalah kontras warna.

**Rencana Perbaikan:**
*   **Global Focus Styles:** Menambahkan gaya fokus global di `index.css` menggunakan `:focus-visible` untuk memberikan outline yang jelas namun estetis pada elemen interaktif.
*   **Audit Kontras:** Melakukan pengecekan manual pada palet warna utama (terutama teks di atas warna `primary`) dan menyesuaikan variabel HSL jika diperlukan untuk memenuhi standar WCAG AA.
*   **Atribut ARIA:** Menambahkan label aksesibilitas pada tombol ikon (seperti tombol menu mobile) yang saat ini hanya berupa ikon tanpa teks.

## 4. Standarisasi Komponen UI dan Ikonografi (Prioritas Menengah)

**Masalah:** Potensi penggunaan komponen non-standar dan variasi ikon yang tidak konsisten.

**Rencana Perbaikan:**
*   **Audit Komponen:** Memastikan seluruh aplikasi menggunakan komponen dari `src/components/ui`.
*   **Konsistensi Ikon:** Menetapkan `lucide-react` sebagai standar tunggal dan mengganti ikon kustom (jika ada) dengan padanan dari Lucide.
*   **Varian Tombol:** Menstandarkan penggunaan varian `Button` (misal: `default` untuk aksi utama, `outline` untuk aksi sekunder).

## 5. Optimalisasi Form Mobile (Prioritas Menengah)

**Masalah:** Form kompleks seperti `BookingWizard` mungkin sulit digunakan di layar kecil.

**Rencana Perbaikan:**
*   **Touch-Friendly Inputs:** Meningkatkan ukuran target sentuh pada elemen form di mobile.
*   **Responsive Grid:** Menyesuaikan tata letak grid pada form agar lebih vertikal di layar sangat kecil untuk menghindari pemotongan teks.

---

## Jadwal Implementasi (Estimasi)

| Fase | Deskripsi | Status |
| :--- | :--- | :--- |
| **Fase 1** | Konsolidasi Navbar & Footer | Akan Datang |
| **Fase 2** | Optimasi Font & FOUT | Akan Datang |
| **Fase 3** | Aksesibilitas & Fokus Visual | Akan Datang |
| **Fase 4** | Standarisasi UI & Ikon | Akan Datang |
| **Fase 5** | Review & Testing | Akan Datang |

---
**Catatan:** Rencana ini bersifat iteratif dan dapat disesuaikan berdasarkan temuan selama proses pengembangan.
