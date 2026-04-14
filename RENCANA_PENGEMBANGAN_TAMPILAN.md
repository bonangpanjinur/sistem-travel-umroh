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

## Rencana Perbaikan dan Pengembangan
Berikut adalah rincian fitur yang diusulkan untuk pengembangan, beserta manfaat dan pertimbangan teknisnya:

### 1. SEO & Metadata Spesifik Halaman
**Manfaat**: Meningkatkan peringkat di mesin pencari, visibilitas online, dan kontrol atas bagaimana halaman muncul di hasil pencarian dan media sosial.

**Fitur yang Diusulkan**:
*   **SEO Per Halaman**: Menambahkan bidang untuk `Meta Title`, `Meta Description`, dan `OpenGraph Image URL` yang unik untuk setiap halaman publik (Beranda, Paket, Tentang Kami, Hubungi Kami, dll.).
*   **Kontrol Sitemap & Robots**: Opsi sederhana untuk mengaktifkan/menonaktifkan pengindeksan halaman tertentu oleh mesin pencari (misalnya, melalui `robots.txt` atau meta tag `noindex`).
*   **JSON-LD Schema Markup**: Implementasi otomatis atau semi-otomatis untuk skema JSON-LD (misalnya, `TravelAgency`, `Product`, `FAQPage`) untuk memperkaya tampilan hasil pencarian Google.

**Pertimbangan Teknis**:
*   Memperbarui skema `WebsiteSettings` atau membuat tabel terpisah untuk `PageSettings` yang menyimpan data SEO per halaman.
*   Integrasi dengan `react-helmet` atau sejenisnya untuk injeksi meta tag dinamis di sisi klien.
*   Logika untuk menghasilkan atau memperbarui `robots.txt` dan `sitemap.xml` jika diperlukan, atau panduan manual untuk pengguna.

### 2. Elemen Konversi & Kepercayaan
**Manfaat**: Membangun kredibilitas, mengurangi keraguan calon pelanggan, dan mendorong mereka untuk mengambil tindakan (misalnya, mendaftar, menghubungi).

**Fitur yang Diusulkan**:
*   **Manajemen Testimonial**: Bagian khusus di Pengaturan Tampilan untuk menambah, mengedit, menghapus, dan menampilkan testimonial pelanggan (dengan nama, foto, rating, dan ulasan).
*   **Lencana Kepercayaan/Sertifikasi**: Editor untuk mengunggah dan menampilkan logo lisensi resmi (misalnya, PPIU/Kemenag), mitra pembayaran, atau keanggotaan asosiasi di footer atau bagian relevan lainnya.
*   **Editor Bagian FAQ**: Antarmuka untuk membuat dan mengelola daftar pertanyaan yang sering diajukan (FAQ) yang dapat ditampilkan di halaman mana pun.
*   **Bilah Pengumuman (Announcement Bar)**: Bilah notifikasi yang dapat diaktifkan/dinonaktifkan di bagian atas website untuk pengumuman penting, promosi, atau informasi mendesak (misalnya, "Sisa 5 Seat untuk Keberangkatan Syawal!").

**Pertimbangan Teknis**:
*   Membuat tabel database baru untuk `Testimonials` dan `FAQs`.
*   Menambahkan komponen UI untuk menampilkan elemen-elemen ini di halaman publik.
*   Mengembangkan antarmuka admin untuk mengelola konten testimonial, lencana, dan FAQ.

### 3. Kustomisasi Header & Footer Lanjutan
**Manfaat**: Meningkatkan pengalaman navigasi pengguna, menyoroti informasi penting, dan memberikan akses cepat ke tindakan kunci.

**Fitur yang Diusulkan**:
*   **Header Lengket (Sticky Header) Toggle**: Opsi untuk membuat header tetap terlihat saat pengguna menggulir halaman.
*   **Tombol CTA di Header**: Kemampuan untuk menambahkan tombol Call-to-Action (misalnya, "Daftar Sekarang", "Hubungi Kami") yang dapat dikustomisasi di header.
*   **Formulir Berlangganan Newsletter di Footer**: Opsi untuk mengaktifkan/menonaktifkan formulir pendaftaran newsletter sederhana di footer.
*   **Generator Halaman Hukum**: Alat untuk membuat halaman "Syarat & Ketentuan" dan "Kebijakan Privasi" dasar yang dapat diakses dari footer.

**Pertimbangan Teknis**:
*   Menambahkan properti baru ke `WebsiteSettings` untuk konfigurasi header/footer.
*   Modifikasi komponen `DynamicNavbar` dan `DynamicFooter` untuk mendukung fitur-fitur baru ini.
*   Implementasi logika untuk formulir newsletter (misalnya, integrasi dengan layanan email marketing dasar).

### 4. Konten Dinamis & Pembangun Halaman yang Fleksibel
**Manfaat**: Memberikan kontrol lebih besar kepada administrator untuk menyusun tata letak halaman beranda dan halaman lainnya dengan blok konten yang beragam.

**Fitur yang Diusulkan**:
*   **Duplikasi Bagian Kustom**: Kemampuan untuk menambahkan beberapa bagian konten kustom dengan latar belakang (warna atau gambar) yang berbeda.
*   **Integrasi Formulir Prospek**: Opsi untuk menyematkan formulir pengumpulan prospek (misalnya, "Minta Informasi") di bagian mana pun dari halaman arahan.
*   **Tombol WhatsApp Mengambang**: Pengaturan global untuk mengaktifkan tombol WhatsApp mengambang dengan pesan sambutan yang dapat dikustomisasi.

**Pertimbangan Teknis**:
*   Memperluas skema `HomepageSection` untuk mendukung lebih banyak jenis bagian dan properti kustomisasi (misalnya, `backgroundColor`, `backgroundImage`).
*   Mengembangkan komponen formulir generik yang dapat dikonfigurasi.
*   Implementasi komponen tombol WhatsApp mengambang.

### 5. Peningkatan Tampilan Daftar Paket
**Manfaat**: Membuat tampilan kartu paket lebih menarik, informatif, dan sesuai dengan strategi pemasaran.

**Fitur yang Diusulkan**:
*   **Toggle Filter & Urutkan**: Opsi untuk mengaktifkan/menonaktifkan filter spesifik (Harga, Bulan, Maskapai) pada halaman `/packages`.
*   **Kustomisasi Lencana Paket**: Pengaturan untuk mendefinisikan dan menampilkan lencana seperti "Promo", "Terlaris", atau "Terbatas" pada kartu paket.
*   **Aturan Tampilan Harga**: Opsi untuk menampilkan "Mulai dari" atau menyembunyikan harga untuk paket yang memerlukan "Hubungi untuk Harga".

**Pertimbangan Teknis**:
*   Menambahkan properti baru ke `WebsiteSettings` untuk konfigurasi tampilan daftar paket.
*   Modifikasi komponen `PackageCard` dan halaman `/packages` untuk mendukung fitur-fitur ini.

## Prioritisasi
Pengembangan dapat diprioritaskan berdasarkan dampak bisnis dan kompleksitas implementasi. Urutan yang disarankan adalah:

1.  **SEO & Metadata Spesifik Halaman**: Dampak tinggi pada visibilitas dan akuisisi organik.
2.  **Elemen Konversi & Kepercayaan (Testimonial, FAQ, Lencana)**: Dampak tinggi pada konversi dan kredibilitas.
3.  **Bilah Pengumuman & Tombol CTA di Header**: Dampak langsung pada komunikasi promosi dan tindakan pengguna.
4.  **Kustomisasi Header & Footer Lanjutan**: Meningkatkan pengalaman pengguna dan profesionalisme.
5.  **Konten Dinamis & Pembangun Halaman yang Fleksibel**: Memberikan fleksibilitas jangka panjang untuk pemasaran.
6.  **Peningkatan Tampilan Daftar Paket**: Mengoptimalkan presentasi produk utama.

## Kesimpulan
Implementasi fitur-fitur yang diusulkan ini akan secara signifikan meningkatkan kemampuan platform untuk mengelola dan mengoptimalkan tampilan halaman publik. Dengan kontrol yang lebih granular atas SEO, elemen kepercayaan, dan fleksibilitas tata letak, platform akan lebih efektif dalam menarik pengunjung, membangun kredibilitas, dan mendorong konversi, yang pada akhirnya akan mendukung pertumbuhan bisnis.

---
