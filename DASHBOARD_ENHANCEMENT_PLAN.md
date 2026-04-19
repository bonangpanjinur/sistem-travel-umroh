# Rencana Peningkatan Dashboard Admin Interaktif

Berdasarkan analisis pada `AdminDashboard.tsx` dan `DashboardCharts.tsx`, berikut adalah rencana untuk membuat dashboard utama menjadi lebih interaktif dan dinamis.

## 1. Peningkatan UI & Interaktivitas (Look & Feel)
*   **Interactive Quick Actions**: Menambahkan efek hover yang lebih hidup dan animasi transisi pada tombol aksi cepat.
*   **Dynamic Stats Cards**: Menambahkan visualisasi mini (sparklines) di dalam card statistik untuk menunjukkan tren secara instan tanpa harus melihat chart besar.
*   **Real-time Indicators**: Menambahkan indikator "Live" yang berkedip halus saat data diperbarui secara real-time melalui Supabase.
*   **Interactive Tables**: Menambahkan fitur pencarian cepat dan filter langsung pada tabel "Booking Terbaru".

## 2. Fitur Baru (Kaya Fitur)
*   **Widget Notifikasi Cepat**: Menampilkan alert untuk stok peralatan rendah dan dokumen yang perlu verifikasi secara lebih menonjol.
*   **Interactive Leaderboard**: Memungkinkan admin untuk mengklik agen di leaderboard untuk melihat detail performa mereka.
*   **Drill-down Charts**: Memungkinkan klik pada bagian chart untuk melihat data mentah yang mendasarinya.

## 3. Optimasi Pengalaman Pengguna (UX)
*   **Skeleton Loading yang Lebih Halus**: Memperbaiki transisi antara state loading dan data siap.
*   **Empty States yang Informatif**: Menambahkan ilustrasi dan tombol aksi pada area yang belum memiliki data.
*   **Responsive Layout Refinement**: Memastikan semua widget interaktif tetap mudah digunakan di perangkat tablet.

---

## Langkah Eksekusi
1.  **Tahap 1**: Refaktor `StatsCard` untuk mendukung sparklines (grafik mini) dan animasi.
2.  **Tahap 2**: Peningkatan `QuickActionButton` dengan animasi Framer Motion.
3.  **Tahap 3**: Implementasi interaktivitas pada `DashboardCharts` (Tooltip kustom & sinkronisasi).
4.  **Tahap 4**: Penambahan widget "System Health" atau "Quick Alerts" yang interaktif.
