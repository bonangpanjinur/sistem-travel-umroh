# Laporan Perbaikan: Error Pesan Paket Tanpa Login (Guest Checkout)

## Masalah
Ditemukan bahwa pengguna yang tidak login (guest) mengalami error saat mencoba melakukan pemesanan (booking). Pesan error yang muncul di konsol browser adalah:
`new row violates row-level security policy for table "customers"`

## Analisis Penyebab
Setelah melakukan audit terhadap riwayat migrasi database Supabase di repositori ini, ditemukan bahwa:
1. Terdapat kebijakan **Row-Level Security (RLS)** yang sangat ketat pada tabel `customers`, `bookings`, `booking_passengers`, dan `payments`.
2. Meskipun sebelumnya sudah ada upaya perbaikan (migrasi bulan April), terdapat migrasi lain (misalnya `20260121115113_...sql` dan `20260122004935_...sql`) yang menimpa kebijakan tersebut dengan aturan `auth.uid() IS NOT NULL` atau `auth.uid() = user_id`.
3. Aturan tersebut secara otomatis memblokir peran `anon` (pengguna yang tidak login) untuk memasukkan data baru ke dalam database, sehingga proses booking terhenti di tahap awal.

## Solusi yang Diterapkan
Saya telah membuat file migrasi baru: `supabase/migrations/20260415040000_fix_guest_checkout_v2.sql`.

Migrasi ini melakukan hal-hal berikut:
- **Menghapus kebijakan lama** yang memblokir akses guest pada tabel-tabel terkait.
- **Membuat kebijakan baru** yang secara eksplisit mengizinkan peran `anon` (guest) dan `authenticated` untuk melakukan `INSERT`.
- **Memberikan izin (GRANT INSERT)** secara eksplisit kepada peran `anon` untuk tabel `customers`, `bookings`, `booking_passengers`, `payments`, dan `notifications`.
- **Memberikan akses ke sequence** database agar peran `anon` dapat menghasilkan ID otomatis.

## Langkah Selanjutnya
Silakan jalankan perintah berikut di terminal Anda untuk menerapkan perbaikan ini ke database Supabase Anda:

```bash
# Jika Anda menggunakan Supabase CLI secara lokal
supabase db push

# ATAU: Salin isi file berikut dan jalankan di SQL Editor di Dashboard Supabase Anda:
# Path: supabase/migrations/20260415040000_fix_guest_checkout_v2.sql
```

Setelah migrasi diterapkan, fitur pesan paket tanpa login seharusnya sudah berjalan normal kembali.
