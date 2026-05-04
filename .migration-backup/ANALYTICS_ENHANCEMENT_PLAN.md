# Rencana Peningkatan Dashboard Analytics

Berdasarkan analisis pada `AdminAnalytics.tsx` dan screenshot yang diberikan, berikut adalah rencana untuk membuat dashboard lebih "bagus, kaya fitur, dan interaktif".

## 1. Peningkatan Visual & UI (Look & Feel)
*   **Gradien & Efek Glow**: Menambahkan gradien pada area chart dan efek glow pada card statistik utama.
*   **Ikon Berwarna**: Menggunakan warna yang lebih variatif untuk ikon pada Stat Cards (tidak hanya muted-foreground).
*   **Tipografi**: Memperjelas hierarki teks dengan ukuran font yang lebih dinamis.
*   **Animasi**: Menambahkan animasi masuk (entry animations) untuk setiap card menggunakan Framer Motion atau Tailwind Animate.

## 2. Fitur Baru (Kaya Fitur)
*   **Analisis Paket Terpopuler**: Menambahkan chart baru untuk melihat paket mana yang paling banyak dipesan.
*   **Statistik Pembayaran**: Menambahkan visualisasi untuk membandingkan `total_price` vs `paid_amount` (piutang).
*   **Target vs Realisasi**: Menambahkan indikator progress bar untuk target bulanan (jika ada data target).
*   **Tabel Detail Cepat**: Menambahkan tabel "Booking Terbaru" di bawah chart untuk konteks data langsung.

## 3. Interaktivitas (Interaktif)
*   **Tooltip Kustom**: Membuat tooltip yang lebih informatif dengan detail tambahan (misal: jumlah jamaah saat hover di revenue).
*   **Sinkronisasi Chart**: Saat hover di satu chart, chart lain yang berkaitan bisa memberikan highlight (opsional).
*   **Eksport Data**: Menambahkan tombol untuk mengunduh data analytics dalam format CSV atau PDF.
*   **Filter yang Lebih Cerdas**: Menambahkan filter cepat (7 hari terakhir, 30 hari terakhir, tahun ini).

## 4. Perbaikan Teknis
*   **Optimasi Query**: Memastikan query Supabase efisien dan menangani loading state dengan lebih halus.
*   **Error Handling**: Menambahkan state error yang lebih informatif jika data gagal dimuat.

---

## Langkah Eksekusi
1.  **Tahap 1**: Refaktor `StatCard` untuk mendukung tren warna dan ikon yang lebih hidup.
2.  **Tahap 2**: Implementasi chart "Paket Terpopuler" dan "Analisis Pembayaran".
3.  **Tahap 3**: Penambahan interaktivitas pada chart (Tooltip kustom & Filter cepat).
4.  **Tahap 4**: Final polish pada layout dan animasi.
