
# Roadmap Penyempurnaan Sistem ERP Umroh/Haji

## Ringkasan

Roadmap ini mencakup perbaikan dan penyempurnaan seluruh fitur yang sudah ada, penambahan fitur baru yang dibutuhkan, serta penyempurnaan White Label. Dibagi menjadi 5 blok prioritas yang bisa dikerjakan bertahap.

---

## BLOK 1: Penyempurnaan Document Generator (Prioritas Tinggi)

### Masalah Saat Ini
- Surat Cuti Jamaah: pilih jamaah langsung dari daftar semua customer (ratusan/ribuan), tanpa konteks paket atau keberangkatan
- Tanggal berangkat/kembali harus diisi manual, padahal data sudah ada di departure
- Invoice, E-Ticket, Sertifikat: pilih dari daftar booking yang flat, sulit dicari

### Perbaikan
1. **Filter Bertingkat untuk Surat Cuti Jamaah**: Pilih Paket --> Pilih Keberangkatan --> Otomatis tampilkan jamaah yang terdaftar di keberangkatan tersebut. Tanggal berangkat/kembali otomatis terisi dari data departure
2. **Filter Bertingkat untuk Invoice/E-Ticket/Sertifikat**: Pilih Paket --> Pilih Keberangkatan --> Pilih Booking. Tampilkan info ringkas (nama jamaah, tipe kamar, status bayar)
3. **Batch Generate**: Tombol "Generate Semua" untuk E-Ticket dan Sertifikat per keberangkatan (semua jamaah sekaligus dalam 1 PDF multi-halaman)
4. **Preview PDF di Dialog**: Tampilkan preview dokumen sebelum download, bukan langsung download
5. **Nomor Surat Otomatis & Berurutan**: Simpan counter nomor surat di database agar tidak acak

### Detail Teknis
- Tambah state `selectedPackageId` dan `selectedDepartureId` di form Cuti Jamaah
- Query `booking_passengers` JOIN `bookings` JOIN `departures` untuk mendapat daftar jamaah per keberangkatan
- Auto-fill `startDate` dan `endDate` dari `departure.departure_date` dan `departure.return_date`
- Buat tabel `document_counters` untuk tracking nomor surat

---

## BLOK 2: Penyempurnaan White Label & Website Publik

### Masalah Saat Ini
- Footer memiliki link ke halaman yang belum ada (FAQ, Terms, Privacy, Blog, Manasik, Checklist, Tips)
- Navbar link statis, tidak bisa dikustomisasi dari admin
- Halaman About dan Contact menggunakan data hardcoded
- Tidak ada halaman Jadwal Keberangkatan publik
- SEO metadata belum dinamis

### Perbaikan
1. **Halaman Publik yang Belum Ada**: Buat halaman FAQ, Syarat & Ketentuan, Kebijakan Privasi dengan konten yang bisa diedit dari admin (simpan di `website_settings` atau tabel baru `pages`)
2. **Navbar & Footer Link Dinamis**: Admin bisa mengelola menu navigasi dan link footer dari pengaturan tampilan
3. **Halaman Jadwal Keberangkatan Publik**: Tampilkan upcoming departures dengan info paket, kuota tersedia, dan tombol booking
4. **About & Contact Dinamis**: Tarik data dari `company_settings` -- nama, alamat, telepon, email, deskripsi
5. **SEO & Meta Tags Dinamis**: Title, description, OG image per halaman dari `website_settings`
6. **Testimonial Dinamis**: Admin bisa kelola testimonial dari dashboard (saat ini hardcoded)

### Detail Teknis
- Buat tabel `static_pages` (slug, title, content_html, is_published)
- Tambah kolom `nav_links` (JSONB) dan `footer_links` (JSONB) di `website_settings`
- Buat tabel `testimonials` (name, content, rating, photo_url, is_featured)
- Buat halaman `/departures` publik

---

## BLOK 3: Penyempurnaan Fitur Operasional & Admin

### 3A. Booking & Payment Flow
1. **Email Notifikasi Booking**: Kirim email otomatis saat booking dibuat, dikonfirmasi, dan saat pembayaran diverifikasi
2. **Deadline Pembayaran**: Tampilkan countdown/batas waktu pembayaran di halaman customer
3. **Pembatalan Otomatis**: Auto-cancel booking yang tidak dibayar dalam X hari (configurable)
4. **Riwayat Status Booking**: Log setiap perubahan status booking (timeline/history)

### 3B. Customer Experience
1. **Dashboard Customer yang Lebih Informatif**: Progress bar perjalanan (Booking --> Bayar --> Dokumen --> Manasik --> Berangkat), countdown hari menuju keberangkatan
2. **Notifikasi Customer**: Bell notification untuk status booking, payment reminder, info keberangkatan
3. **Upload Dokumen Langsung**: Customer bisa upload KTP/Paspor dari portal mereka sendiri (bukan hanya admin)

### 3C. Admin UX
1. **Bulk Actions di Tabel**: Select multiple bookings/customers untuk aksi massal (export, ubah status, kirim notif)
2. **Dashboard Widget Customizable**: Admin bisa pilih widget mana yang tampil di dashboard
3. **Quick Actions**: Tombol cepat di dashboard untuk aksi yang sering dilakukan (tambah booking, verifikasi pembayaran, dll)

### Detail Teknis
- Buat tabel `booking_status_history` (booking_id, old_status, new_status, changed_by, changed_at, notes)
- Trigger otomatis saat status booking berubah
- Edge function untuk email transaksional
- Tambah kolom `payment_deadline` di bookings

---

## BLOK 4: Penyempurnaan Agent & Jamaah Portal

### 4A. Agent Portal
1. **Form Booking oleh Agent**: Agent bisa membuat booking untuk jamaah mereka langsung dari portal agent (bukan harus lewat admin)
2. **Tracking Komisi Real-time**: Dashboard komisi dengan grafik dan detail per booking
3. **Marketing Material**: Agent bisa download brosur/flyer digital per paket
4. **Referral Link**: Setiap agent punya link unik yang bisa dishare

### 4B. Jamaah Portal
1. **Checklist Perlengkapan**: Checklist interaktif (bisa dicentang) untuk persiapan umroh
2. **Panduan Doa Offline**: Konten doa dan panduan ibadah yang bisa diakses offline (PWA)
3. **Galeri Foto Perjalanan**: Upload dan lihat foto perjalanan per keberangkatan
4. **Rating & Review**: Jamaah bisa memberikan rating setelah perjalanan selesai

### Detail Teknis
- Extend agent routes untuk booking flow
- Buat tabel `travel_checklists` dan `travel_reviews`
- Optimasi PWA service worker untuk cache konten panduan

---

## BLOK 5: Keamanan, Performa & Infrastruktur

### 5A. Keamanan
1. **Audit Trail Lengkap**: Pastikan semua aksi CRUD penting tercatat di audit_logs
2. **Rate Limiting**: Batasi percobaan login dan API calls
3. **Session Management**: Tampilkan sesi aktif, bisa logout dari perangkat lain
4. **Data Encryption**: Encrypt data sensitif (NIK, paspor) di database

### 5B. Performa
1. **Pagination Server-side**: Semua tabel admin gunakan server-side pagination (saat ini limit 100)
2. **Image Optimization**: Compress dan resize gambar upload sebelum simpan
3. **Lazy Loading**: Optimasi loading komponen dan gambar
4. **Cache Strategy**: Stale-while-revalidate untuk data yang jarang berubah

### 5C. Infrastruktur
1. **Backup & Restore**: Dokumentasi prosedur backup database
2. **Monitoring**: Alert otomatis jika ada error rate tinggi
3. **Multi-language**: Persiapan i18n untuk bahasa Inggris dan Arab

### Detail Teknis
- Implement cursor-based pagination untuk query besar
- Gunakan Supabase image transformation untuk resize
- Review semua RLS policies untuk konsistensi

---

## Urutan Pengerjaan yang Disarankan

| Prioritas | Blok | Estimasi Pesan |
|-----------|------|---------------|
| 1 | Blok 1 - Document Generator | 3-5 pesan |
| 2 | Blok 2 - White Label | 5-8 pesan |
| 3 | Blok 3A - Booking Flow | 3-5 pesan |
| 4 | Blok 3B - Customer UX | 3-4 pesan |
| 5 | Blok 3C - Admin UX | 2-3 pesan |
| 6 | Blok 4 - Agent & Jamaah | 5-7 pesan |
| 7 | Blok 5 - Keamanan & Performa | 4-6 pesan |

Rekomendasi: mulai dari Blok 1 (Document Generator) karena ini langsung memperbaiki masalah yang sudah Anda rasakan, lalu lanjut ke Blok 2 (White Label) untuk menyempurnakan website publik.
