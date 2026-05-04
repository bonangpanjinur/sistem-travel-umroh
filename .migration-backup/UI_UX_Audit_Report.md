# Laporan Audit UI/UX & Rencana Perbaikan
**Proyek:** Sistem Manajemen Umrah & Haji
**Tanggal:** 9 Maret 2026

## 1. Analisis Masalah Utama: Tidak Bisa Scroll
### Temuan
Masalah utama di mana website dan sistem tidak bisa di-scroll disebabkan oleh kode CSS global di file `index.html`.
- **Lokasi Kode:** `index.html` baris 62-68.
- **Penyebab:** Properti `overflow: hidden` diterapkan pada elemen `html` dan `body` di dalam blok `<style>` untuk animasi loading awal.
- **Masalah:** Properti ini tidak pernah dihapus atau diubah kembali menjadi `auto` atau `visible` setelah aplikasi React selesai dimuat, sehingga mengunci seluruh halaman.

### Rencana Perbaikan
1.  Ubah `index.html` untuk hanya menerapkan `overflow: hidden` saat kelas tertentu (misal: `.is-loading`) ada pada `body`.
2.  Perbarui `src/main.tsx` untuk menghapus kelas tersebut setelah aplikasi siap.

---

## 2. Audit UI/UX Tambahan
Berdasarkan tinjauan kode pada halaman Admin Master Data dan Layout utama, berikut adalah beberapa poin perbaikan UI/UX:

### A. Navigasi & Layout
| Fitur | Masalah | Saran Perbaikan |
| :--- | :--- | :--- |
| **Tabs Master Data** | Label teks disembunyikan pada layar kecil (`hidden sm:inline`), hanya menyisakan ikon. | Gunakan tooltip untuk ikon tanpa label, atau buat tab yang bisa di-scroll secara horizontal agar teks tetap terlihat. |
| **Sidebar Admin** | Sidebar menggunakan `fixed` dan `z-30`, namun pada mobile seringkali menutupi konten tanpa indikasi tutup yang jelas selain tombol hamburger. | Tambahkan overlay yang lebih kontras dan pastikan area klik di luar sidebar otomatis menutup sidebar. |
| **Breadcrumb** | Jarak antar elemen breadcrumb cukup rapat. | Tingkatkan padding dan ukuran font sedikit untuk keterbacaan yang lebih baik. |

### B. Komponen Form & Data
| Fitur | Masalah | Saran Perbaikan |
| :--- | :--- | :--- |
| **Search Input** | Lebar tetap `w-64` mungkin terlalu lebar untuk beberapa layar mobile. | Gunakan `w-full sm:w-64` agar responsif. |
| **Aksi Tabel/Card** | Tombol Edit dan Hapus sangat berdekatan. | Berikan margin yang lebih besar atau gunakan menu dropdown (ellipsis) untuk aksi pada layar mobile guna menghindari salah klik. |
| **Dialog/Modal** | `max-w-lg` pada dialog mungkin terlalu sempit untuk form yang kompleks. | Gunakan lebar yang lebih dinamis atau full-screen modal pada perangkat mobile. |

---

## 3. Rencana Implementasi Perbaikan

### Fase 1: Perbaikan Kritis (Scroll)
- [ ] Modifikasi `index.html` untuk memindahkan `overflow: hidden` ke kelas `.loading-state`.
- [ ] Update `src/main.tsx` untuk menghapus kelas tersebut saat `hideInitialLoader` dipanggil.

### Fase 2: Optimasi Responsif
- [ ] Update `AdminMasterData.tsx` untuk meningkatkan navigasi tab pada mobile.
- [ ] Sesuaikan input pencarian di seluruh halaman admin agar lebih fleksibel.

### Fase 3: Peningkatan Aksesibilitas & Usability
- [ ] Tambahkan tooltip pada elemen-elemen yang hanya menampilkan ikon.
- [ ] Perbaiki jarak antar elemen interaktif (button, link) untuk mematuhi standar "touch target size".

---
**Disusun oleh:** Manus AI
