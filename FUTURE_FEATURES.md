# Rencana Pengembangan Fitur Kelola Paket Selanjutnya

Dokumen ini menguraikan rencana pengembangan fitur-fitur lanjutan untuk modul **Kelola Paket** pada aplikasi Vins Tour Travel. Fitur-fitur ini akan diimplementasikan setelah Fase 1 dan Fase 2 selesai, dengan tujuan untuk mengoptimalkan manajemen operasional, finansial, dan logistik paket umroh.

## Fitur yang Telah Diimplementasikan (Fase 1 & 2)

Sebelum melanjutkan ke fitur-fitur berikutnya, berikut adalah ringkasan fitur yang telah berhasil diimplementasikan pada fase awal:

### Fase 1: Analisis Struktur Kode dan Persiapan Aset/Helper

Pada fase ini, dilakukan analisis mendalam terhadap struktur kode yang ada di repositori `bonangpanjinur/vinstourtravel-2e21443d`, khususnya pada komponen `AdminPackages.tsx` dan `AdminPackageDetail.tsx`. Tujuannya adalah untuk memahami alur data, komponen UI yang relevan, serta mengidentifikasi titik integrasi yang tepat untuk fitur-fitur baru. Beberapa helper dan komponen dasar juga disiapkan untuk mendukung pengembangan selanjutnya.

### Fase 2: WhatsApp Share Tool & Auto-Generated Flyer (Marketing Tools)

Fase ini berfokus pada penyediaan alat bantu pemasaran yang terintegrasi langsung ke dalam halaman manajemen paket. Fitur-fitur yang dikembangkan meliputi:

1.  **WhatsApp Share Tool**: Memungkinkan admin untuk membagikan detail paket secara cepat melalui WhatsApp. Pesan promosi telah diformat secara otomatis dengan informasi penting seperti nama paket, harga, hotel, durasi, dan maskapai. Admin juga dapat menyalin teks promosi yang dapat diedit sebelum dibagikan.
2.  **Auto-Generated Flyer**: Fitur untuk mengunduh gambar promosi (flyer) secara otomatis berdasarkan data paket. Flyer ini dihasilkan secara dinamis menggunakan canvas HTML, menampilkan informasi kunci paket dengan desain yang profesional dan siap dibagikan di media sosial.
3.  **Integrasi**: Kedua fitur ini diintegrasikan ke dalam `DropdownMenu` pada setiap kartu paket di `AdminPackages.tsx`, memberikan akses mudah kepada admin untuk melakukan aktivitas pemasaran langsung dari daftar paket.

## Rencana Fitur Selanjutnya (Fase 3, 4, dan 5)

Berikut adalah detail fitur-fitur yang akan dikembangkan pada fase-fase berikutnya:

### Fase 3: Milestone & Deadline Alert Tracker

**Deskripsi Kekurangan Saat Ini:**
Manajemen keberangkatan umroh melibatkan banyak tenggat waktu penting (misalnya, batas akhir setor paspor, pelunasan, pengurusan visa). Admin saat ini harus mengecek tenggat waktu ini secara manual, yang rentan terhadap kesalahan dan keterlambatan.

**Solusi yang Diusulkan:**
Menambahkan fitur **"Milestone Tracker"** pada detail paket. Fitur ini akan menampilkan peringatan otomatis jika mendekati atau melewati tenggat waktu penting. Peringatan akan disesuaikan dengan jadwal keberangkatan paket.

**Detail Implementasi:**
*   **Data Model**: Perluasan skema data `departures` atau tabel baru untuk menyimpan `milestones` (misalnya, `document_deadline`, `payment_deadline`, `visa_deadline`). Setiap milestone akan memiliki tanggal target dan status (misalnya, `pending`, `completed`, `overdue`).
*   **Logika Peringatan**: Implementasi logika di sisi frontend (React) untuk menghitung selisih hari antara tanggal saat ini dan tanggal milestone. Tampilan peringatan visual (misalnya, badge berwarna, ikon) akan ditambahkan pada kartu paket atau halaman detail paket.
*   **Notifikasi**: Pertimbangkan integrasi dengan sistem notifikasi (misalnya, `toast` atau notifikasi dalam aplikasi) untuk memberi tahu admin tentang milestone yang akan datang atau yang terlewat.
*   **UI/UX**: Penambahan komponen UI seperti progress bar atau daftar checklist milestone di halaman detail paket (`AdminPackageDetail.tsx`) atau pada kartu paket (`AdminPackages.tsx`) untuk memberikan gambaran visual tentang status tenggat waktu.

### Fase 4: Equipment Readiness Bar (Manajemen Inventaris & Logistik)

**Deskripsi Kekurangan Saat Ini:**
Paket yang ada saat ini hanya fokus pada keberangkatan dan hotel. Admin sering kesulitan melacak perlengkapan jamaah (koper, kain ihram, buku doa) per paket. Belum ada visualisasi status perlengkapan per jamaah atau per paket.

**Solusi yang Diusulkan:**
Menambahkan **"Equipment Readiness Bar"** di kartu paket atau halaman detail paket. Bar ini akan menunjukkan persentase jamaah dalam paket tersebut yang sudah menerima atau memiliki status perlengkapan yang lengkap.

**Detail Implementasi:**
*   **Data Model**: Perluasan skema data `bookings` atau tabel baru (`jamaah_equipment_status`) untuk melacak status perlengkapan setiap jamaah (misalnya, `koper_status`, `ihram_status`, `buku_doa_status`). Status bisa berupa `belum_diberikan`, `sudah_diberikan`, `diterima_jamaah`.
*   **Agregasi Data**: Logika backend (Supabase functions/views) untuk menghitung persentase kelengkapan perlengkapan per paket berdasarkan status jamaah yang terkait dengan keberangkatan paket tersebut.
*   **UI/UX**: Implementasi komponen progress bar (mirip dengan progress bar kuota) di kartu paket (`AdminPackages.tsx`) atau di bagian logistik pada halaman detail paket (`AdminPackageDetail.tsx`). Bar ini akan menampilkan persentase dan mungkin ikon untuk setiap jenis perlengkapan.

### Fase 5: Break-even Indicator (Profitability Monitoring)

**Deskripsi Kekurangan Saat Ini:**
Admin perlu mengetahui apakah sebuah paket sudah menguntungkan atau belum berdasarkan tingkat keterisiannya. Harga paket saat ini hanya ditampilkan sebagai angka statis, tanpa konteks biaya operasional atau titik impas.

**Solusi yang Diusulkan:**
Menambahkan fitur **"Break-even Indicator"**. Ini bisa berupa progress bar yang memiliki penanda khusus (garis putus-putus atau warna berbeda) yang menunjukkan kapan paket tersebut mulai menghasilkan profit berdasarkan kuota dan biaya operasional.

**Detail Implementasi:**
*   **Data Model**: Perluasan skema data `packages` atau `departures` untuk menyimpan informasi `break_even_pax` (jumlah jamaah untuk mencapai titik impas) dan `operational_cost_per_pax` (biaya operasional per jamaah).
*   **Perhitungan Titik Impas**: Logika backend atau frontend untuk menghitung titik impas berdasarkan total biaya operasional paket dan harga jual per jamaah. Ini bisa menjadi angka statis atau dinamis tergantung pada kompleksitas biaya.
*   **UI/UX**: Modifikasi progress bar keterisian kuota yang sudah ada di `AdminPackages.tsx` atau `AdminPackageDetail.tsx`. Penanda visual akan ditambahkan pada progress bar untuk menunjukkan titik impas. Warna bar bisa berubah setelah melewati titik impas untuk menunjukkan profitabilitas.
*   **Visualisasi Keuntungan**: Mungkin juga menampilkan estimasi keuntungan atau kerugian saat ini berdasarkan jumlah jamaah yang sudah terdaftar dan titik impas.

---
