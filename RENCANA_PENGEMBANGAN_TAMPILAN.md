# Rencana Pengembangan Fitur Pengaturan Tampilan & Halaman Publik

## Pendahuluan
Dokumen ini menguraikan rencana pengembangan dan perbaikan untuk menu **Pengaturan Tampilan** (Appearance Settings) dan halaman-halaman publik pada platform. Tujuan utama dari pengembangan ini adalah untuk meningkatkan fleksibilitas kustomisasi, mengoptimalkan konversi pengunjung menjadi pelanggan, serta memperkuat kehadiran digital melalui fitur-fitur yang lebih komprehensif dan dinamis.

## Gambaran Umum Kondisi Saat Ini
Sistem Pengaturan Tampilan yang ada saat ini menyediakan dasar yang kuat untuk branding dan tata letak dasar. Fitur yang tersedia meliputi:
*   **Branding**: Pengaturan nama perusahaan, tagline, URL logo, dan favicon.
*   **Tema & Warna**: Pemilihan tema preset dan kustomisasi warna dasar (primer, sekunder, aksen, latar belakang, teks).
*   **Tipografi**: Pemilihan kombinasi font untuk judul dan teks tubuh.
*   **Navigasi**: Pengelolaan tautan menu header (label dan URL).
*   **Tata Letak Halaman**: Pengaturan dasar untuk bagian-bagian halaman beranda (hero, paket unggulan, dll.) dan jumlah paket yang ditampilkan.
*   **Editor Halaman Spesifik**: Editor konten dasar untuk halaman Tentang Kami, Tabungan, dan Hubungi Kami.
*   **Pratinjau Langsung**: Fitur pratinjau halaman beranda dalam berbagai ukuran layar.

Meskipun fungsional, kustomisasi yang tersedia cenderung bersifat umum dan belum sepenuhnya mengakomodasi kebutuhan spesifik untuk optimasi halaman publik yang berorientasi pada konversi dan SEO.

## Kesenjangan Fitur yang Teridentifikasi
Berdasarkan analisis, beberapa kesenjangan fitur utama yang perlu ditangani untuk meningkatkan performa halaman publik adalah:

1.  **SEO & Metadata Spesifik Halaman**: Kurangnya kontrol SEO yang granular untuk setiap halaman publik.
2.  **Elemen Konversi & Kepercayaan**: Ketiadaan fitur untuk membangun kredibilitas dan mendorong tindakan pengguna.
3.  **Kustomisasi Header & Footer Lanjutan**: Keterbatasan dalam pengaturan elemen navigasi dan informasi kontak.
4.  **Konten Dinamis & Pembangun Halaman yang Fleksibel**: Keterbatasan dalam mengelola dan menyusun bagian-bagian halaman.
5.  **Peningkatan Tampilan Daftar Paket**: Kurangnya opsi kustomisasi untuk tampilan kartu paket yang lebih menarik dan informatif.

## Rencana Perbaikan dan Pengembangan Berfase
Berikut adalah rincian fitur yang diusulkan untuk pengembangan, beserta manfaat, pertimbangan teknis, dan pembagian fasenya:

### Fase 1: Fondasi SEO & Kepercayaan Esensial
**Fokus**: Membangun dasar yang kuat untuk visibilitas di mesin pencari dan kredibilitas awal.

**Fitur yang Diusulkan**:
*   **SEO Per Halaman**:
    *   **Manfaat**: Meningkatkan peringkat di mesin pencari, visibilitas online, dan kontrol atas bagaimana halaman muncul di hasil pencarian dan media sosial.
    *   **Detail**: Menambahkan bidang untuk `Meta Title`, `Meta Description`, dan `OpenGraph Image URL` yang unik untuk setiap halaman publik (Beranda, Paket, Tentang Kami, Hubungi Kami, dll.).
    *   **Pertimbangan Teknis**: Memperbarui skema `WebsiteSettings` atau membuat tabel terpisah untuk `PageSettings` yang menyimpan data SEO per halaman. Integrasi dengan `react-helmet` atau sejenisnya untuk injeksi meta tag dinamis di sisi klien.
*   **Manajemen Testimonial**:
    *   **Manfaat**: Membangun kredibilitas dan mengurangi keraguan calon pelanggan.
    *   **Detail**: Bagian khusus di Pengaturan Tampilan untuk menambah, mengedit, menghapus, dan menampilkan testimonial pelanggan (dengan nama, foto, rating, dan ulasan).
    *   **Pertimbangan Teknis**: Membuat tabel database baru untuk `Testimonials`. Menambahkan komponen UI untuk menampilkan elemen ini di halaman publik. Mengembangkan antarmuka admin untuk mengelola konten testimonial.
*   **Editor Bagian FAQ**:
    *   **Manfaat**: Memberikan informasi yang cepat dan relevan kepada pengguna, mengurangi beban dukungan pelanggan.
    *   **Detail**: Antarmuka untuk membuat dan mengelola daftar pertanyaan yang sering diajukan (FAQ) yang dapat ditampilkan di halaman mana pun.
    *   **Pertimbangan Teknis**: Membuat tabel database baru untuk `FAQs`. Menambahkan komponen UI untuk menampilkan elemen ini di halaman publik. Mengembangkan antarmuka admin untuk mengelola konten FAQ.
*   **Lencana Kepercayaan/Sertifikasi**:
    *   **Manfaat**: Meningkatkan kepercayaan pengunjung dengan menampilkan bukti legalitas dan afiliasi.
    *   **Detail**: Editor untuk mengunggah dan menampilkan logo lisensi resmi (misalnya, PPIU/Kemenag), mitra pembayaran, atau keanggotaan asosiasi di footer atau bagian relevan lainnya.
    *   **Pertimbangan Teknis**: Menambahkan properti ke `WebsiteSettings` untuk URL gambar lencana. Mengembangkan komponen UI untuk menampilkan lencana.

### Fase 2: Peningkatan Konversi Cepat
**Fokus**: Mendorong tindakan pengguna dan meningkatkan tingkat konversi dengan fitur-fitur yang menonjol.

**Fitur yang Diusulkan**:
*   **Bilah Pengumuman (Announcement Bar)**:
    *   **Manfaat**: Mengkomunikasikan informasi penting, promosi, atau penawaran mendesak secara efektif.
    *   **Detail**: Bilah notifikasi yang dapat diaktifkan/dinonaktifkan di bagian atas website untuk pengumuman penting, promosi, atau informasi mendesak (misalnya, "Sisa 5 Seat untuk Keberangkatan Syawal!").
    *   **Pertimbangan Teknis**: Menambahkan properti ke `WebsiteSettings` untuk teks, warna, dan status aktif bilah pengumuman. Modifikasi komponen `DynamicNavbar` atau membuat komponen terpisah.
*   **Tombol CTA di Header**:
    *   **Manfaat**: Memberikan akses cepat ke tindakan kunci, meningkatkan peluang konversi.
    *   **Detail**: Kemampuan untuk menambahkan tombol Call-to-Action (misalnya, "Daftar Sekarang", "Hubungi Kami") yang dapat dikustomisasi di header.
    *   **Pertimbangan Teknis**: Menambahkan properti ke `WebsiteSettings` untuk teks, URL, dan status aktif tombol CTA header. Modifikasi komponen `DynamicNavbar`.
*   **Tombol WhatsApp Mengambang**:
    *   **Manfaat**: Mempermudah komunikasi langsung dengan calon pelanggan, meningkatkan dukungan dan konversi.
    *   **Detail**: Pengaturan global untuk mengaktifkan tombol WhatsApp mengambang dengan pesan sambutan yang dapat dikustomisasi.
    *   **Pertimbangan Teknis**: Menambahkan properti ke `WebsiteSettings` untuk nomor WhatsApp dan pesan. Implementasi komponen tombol WhatsApp mengambang yang persisten di seluruh halaman publik.

### Fase 3: Kustomisasi & Fleksibilitas Tata Letak
**Fokus**: Memberikan kontrol lebih besar atas struktur dan konten halaman, serta meningkatkan pengalaman pengguna.

**Fitur yang Diusulkan**:
*   **Header Lengket (Sticky Header) Toggle**:
    *   **Manfaat**: Meningkatkan pengalaman navigasi pengguna dengan menjaga menu utama tetap terlihat.
    *   **Detail**: Opsi untuk membuat header tetap terlihat saat pengguna menggulir halaman.
    *   **Pertimbangan Teknis**: Menambahkan properti boolean ke `WebsiteSettings`. Modifikasi CSS/JavaScript pada komponen `DynamicNavbar`.
*   **Formulir Berlangganan Newsletter di Footer**:
    *   **Manfaat**: Membangun daftar email untuk pemasaran di masa mendatang.
    *   **Detail**: Opsi untuk mengaktifkan/menonaktifkan formulir pendaftaran newsletter sederhana di footer.
    *   **Pertimbangan Teknis**: Menambahkan properti boolean ke `WebsiteSettings`. Implementasi komponen formulir newsletter dan integrasi dasar dengan layanan email marketing (jika ada).
*   **Duplikasi Bagian Kustom**:
    *   **Manfaat**: Memberikan fleksibilitas tak terbatas dalam menyusun tata letak halaman dengan blok konten yang beragam.
    *   **Detail**: Kemampuan untuk menambahkan beberapa bagian konten kustom dengan latar belakang (warna atau gambar) yang berbeda.
    *   **Pertimbangan Teknis**: Memperluas skema `HomepageSection` untuk mendukung lebih banyak jenis bagian dan properti kustomisasi (misalnya, `backgroundColor`, `backgroundImage`).
*   **Integrasi Formulir Prospek**:
    *   **Manfaat**: Memungkinkan pengumpulan informasi prospek secara langsung di berbagai bagian halaman.
    *   **Detail**: Opsi untuk menyematkan formulir pengumpulan prospek (misalnya, "Minta Informasi") di bagian mana pun dari halaman arahan.
    *   **Pertimbangan Teknis**: Mengembangkan komponen formulir generik yang dapat dikonfigurasi dan dapat disematkan dalam `CustomSectionEditor`.

### Fase 4: Optimalisasi Produk & Legalitas
**Fokus**: Menyempurnakan presentasi produk utama dan memastikan kepatuhan hukum serta visibilitas teknis.

**Fitur yang Diusulkan**:
*   **Toggle Filter & Urutkan (untuk daftar paket)**:
    *   **Manfaat**: Meningkatkan pengalaman pengguna dalam mencari paket yang relevan.
    *   **Detail**: Opsi untuk mengaktifkan/menonaktifkan filter spesifik (Harga, Bulan, Maskapai) pada halaman `/packages`.
    *   **Pertimbangan Teknis**: Menambahkan properti ke `WebsiteSettings` untuk konfigurasi filter. Modifikasi halaman `/packages`.
*   **Kustomisasi Lencana Paket**:
    *   **Manfaat**: Menyoroti penawaran khusus dan menarik perhatian pada paket tertentu.
    *   **Detail**: Pengaturan untuk mendefinisikan dan menampilkan lencana seperti "Promo", "Terlaris", atau "Terbatas" pada kartu paket.
    *   **Pertimbangan Teknis**: Menambahkan properti ke `WebsiteSettings` atau skema `Package` untuk lencana. Modifikasi komponen `PackageCard`.
*   **Aturan Tampilan Harga**:
    *   **Manfaat**: Fleksibilitas dalam menampilkan harga sesuai strategi pemasaran.
    *   **Detail**: Opsi untuk menampilkan "Mulai dari" atau menyembunyikan harga untuk paket yang memerlukan "Hubungi untuk Harga".
    *   **Pertimbangan Teknis**: Menambahkan properti ke `WebsiteSettings` atau skema `Package` untuk aturan tampilan harga. Modifikasi komponen `PackageCard`.
*   **Generator Halaman Hukum**:
    *   **Manfaat**: Memastikan kepatuhan hukum dan membangun kepercayaan dengan menyediakan dokumen legal yang mudah diakses.
    *   **Detail**: Alat untuk membuat halaman "Syarat & Ketentuan" dan "Kebijakan Privasi" dasar yang dapat diakses dari footer.
    *   **Pertimbangan Teknis**: Implementasi editor teks kaya untuk halaman statis. Menambahkan tautan ke `DynamicFooter`.
*   **Kontrol Sitemap & Robots**:
    *   **Manfaat**: Mengoptimalkan cara mesin pencari mengindeks situs, mencegah pengindeksan konten duplikat atau tidak relevan.
    *   **Detail**: Opsi sederhana untuk mengaktifkan/menonaktifkan pengindeksan halaman tertentu oleh mesin pencari (misalnya, melalui `robots.txt` atau meta tag `noindex`).
    *   **Pertimbangan Teknis**: Logika untuk menghasilkan atau memperbarui `robots.txt` dan `sitemap.xml` jika diperlukan, atau panduan manual untuk pengguna.
*   **JSON-LD Schema Markup**:
    *   **Manfaat**: Meningkatkan visibilitas dan tampilan di hasil pencarian Google dengan *rich snippets*.
    *   **Detail**: Implementasi otomatis atau semi-otomatis untuk skema JSON-LD (misalnya, `TravelAgency`, `Product`, `FAQPage`) untuk memperkaya tampilan hasil pencarian Google.
    *   **Pertimbangan Teknis**: Integrasi dengan `react-helmet` atau sejenisnya untuk injeksi skema JSON-LD dinamis.

## Kesimpulan
Implementasi fitur-fitur yang diusulkan ini, yang dibagi ke dalam fase-fase yang terstruktur, akan secara signifikan meningkatkan kemampuan platform untuk mengelola dan mengoptimalkan tampilan halaman publik. Dengan kontrol yang lebih granular atas SEO, elemen kepercayaan, dan fleksibilitas tata letak, platform akan lebih efektif dalam menarik pengunjung, membangun kredibilitas, dan mendorong konversi, yang pada akhirnya akan mendukung pertumbuhan bisnis.

---
