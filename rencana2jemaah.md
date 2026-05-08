# Rencana Pengembangan — Modul Jamaah & Customer
> Dibuat: Mei 2026 | Berdasarkan analisis kode aktual seluruh halaman jamaah/customer

---

## Ringkasan Eksekutif

Portal jamaah saat ini sudah memiliki fondasi yang kuat — **20 halaman**, fitur SOS, live location, panduan offline, peta lokasi, dan checklist persiapan. Namun masih ada **18 fitur belum dibangun** dan **13 poin yang perlu diperbaiki** untuk menjadikannya pengalaman jamaah yang benar-benar komprehensif dan kompetitif.

---

## A. INVENTARIS — APA YANG SUDAH ADA ✅

### Customer Portal (Desktop-first)
| Halaman | URL | Fitur Utama |
|---------|-----|-------------|
| Customer Dashboard | `/customer/dashboard` | Countdown, checklist persiapan, booking, tabungan, manasik, loyalty, notifikasi, simulasi cicilan |
| Daftar Booking | `/my-bookings` | List semua booking + status |
| Detail Booking | `/my-bookings/:id` | Info paket, penumpang, hotel, maskapai, upload KTP/paspor |
| Upload Pembayaran | `/my-bookings/:id/payment` | Upload bukti transfer + detail bank |
| Tabungan | `/customer/my-savings` | List rencana tabungan, setor setoran |
| Loyalitas | `/customer/my-loyalty` | Poin, tier, tukar hadiah |
| Support | `/customer/support` | Buka tiket support |
| Pengaturan | `/customer/settings` | Profil, ganti password, data mahram |
| Kalkulator Cicilan | `/kalkulator-cicilan` | Simulasi cicilan tabungan |

### Jamaah Portal (Mobile-first / PWA)
| Halaman | URL | Fitur Utama |
|---------|-----|-------------|
| Beranda Jamaah | `/jamaah` | Hub utama, countdown hari, quick actions, SOS, live location, kontak darurat |
| ID Digital | `/jamaah/digital-id` | QR code jamaah, info paket & hotel |
| Itinerary | `/jamaah/itinerary` | Jadwal harian perjalanan per hari |
| Dokumen | `/jamaah/documents` | Upload & status verifikasi dokumen |
| Riwayat Pembayaran | `/jamaah/payment-history` | History semua transaksi |
| Feedback | `/jamaah/feedback/:bookingId` | Rating bintang + komentar |
| Notifikasi | `/jamaah/notifications` | List semua notifikasi |
| Tracker Visa | `/jamaah/visa` | Status proses visa step-by-step |
| Panduan Ibadah | `/jamaah/panduan-ibadah` | Doa, manasik, tips — offline PWA |
| Peta Lokasi | `/jamaah/peta-lokasi` | Peta Makkah & Madinah, 14 lokasi + tips |
| Doa & Panduan (Alt) | `/jamaah/doa-panduan` | Doa dari database + favorit + offline cache |

### Komponen Khusus
- **SOSButton** — tombol darurat + geolocation + kirim ke Supabase + WhatsApp
- **LiveLocationShare** — berbagi lokasi GPS real-time (toggle on/off)
- **JamaahBottomNav** — navigasi bawah 5 tab
- **CountdownTimer** — hitung mundur detik ke keberangkatan
- **AgentAttributionBadge** — badge agen perujuk

---

## B. YANG BELUM ADA — FITUR BARU 🔴

Diurutkan berdasarkan **dampak langsung ke jamaah selama proses ibadah**:

### PRIORITAS TINGGI (Harus Ada)

| # | Fitur | Kenapa Penting | URL Rencana |
|---|-------|----------------|-------------|
| 1 | **Chat Jamaah ↔ Tim/Muthawif** | Saat ini hanya tiket support — lambat & tidak real-time. Jamaah di Saudi butuh respons instan dari muthawif | `/jamaah/chat` |
| 2 | **Kwitansi / Invoice Digital PDF** | Jamaah tidak bisa download bukti pembayaran. Diperlukan untuk klaim asuransi, reimburse kantor, atau arsip pribadi | `/jamaah/invoice/:bookingId` |
| 3 | **Daftar Teman Seperombongan** | Jamaah tidak tahu siapa saja yang ada dalam satu rombongan/keberangkatan. Penting untuk koordinasi di lapangan | `/jamaah/rombongan` |
| 4 | **Info Kamar Hotel** | Jamaah tidak tahu nomor kamarnya di Makkah/Madinah. Sering terjadi kebingungan saat tiba | Tambah di `/jamaah` & `/jamaah/digital-id` |
| 5 | **Jadwal Waktu Sholat Makkah & Madinah** | Ibadah utama. Jamaah perlu tahu waktu sholat di lokasi tujuan, bukan di Indonesia | `/jamaah/waktu-sholat` |
| 6 | **Onboarding / Welcome Flow** | Jamaah baru masuk langsung ke dashboard kosong tanpa panduan. Perlu flow 3-4 langkah untuk orientasi | `/jamaah/welcome` |
| 7 | **Pengumuman dari Pembimbing / Feed** | Tidak ada channel untuk muthawif kirim pengumuman mendadak (perubahan jadwal, instruksi darurat) ke jamaahnya | Komponen di `/jamaah` |

### PRIORITAS MENENGAH (Sangat Direkomendasikan)

| # | Fitur | Kenapa Penting | URL Rencana |
|---|-------|----------------|-------------|
| 8 | **Kalkulator Kurs Riyal (SAR ↔ IDR)** | Jamaah butuh konversi mata uang saat belanja di Saudi. Sederhana tapi sangat sering dibutuhkan | `/jamaah/kalkulator-kurs` |
| 9 | **Info Transportasi / Bus Rombongan** | Jamaah tidak tahu nomor bus, jadwal shuttle Makkah-Madinah, rute transportasi selama di Saudi | Tambah di itinerary atau halaman baru |
| 10 | **Panduan Kesehatan di Saudi** | Hawa panas ekstrem, dehidrasi, penyakit yang sering muncul. Tidak ada panduan medis sama sekali | Tab baru di `/jamaah/panduan-ibadah` |
| 11 | **Galeri Foto Perjalanan (Shared)** | Jamaah bisa upload foto selama perjalanan, dilihat oleh sesama rombongan. Kenangan ibadah | `/jamaah/galeri` |
| 12 | **Kalkulator Zakat** | Relevan tinggi untuk jamaah haji/umroh — zakat fitrah, zakat maal, fidyah. Nilai spiritual + praktis | `/jamaah/kalkulator-zakat` |
| 13 | **Riwayat Perjalanan (Alumni)** | Jamaah yang sudah selesai umroh tidak punya "kenangan" digital. Perlu halaman history semua perjalanan | `/jamaah/riwayat-perjalanan` |
| 14 | **Referral dari Portal Jamaah** | Jamaah yang puas bisa refer teman, tapi tidak ada halaman referral khusus di portal jamaah | `/jamaah/referral` |

### PRIORITAS TAMBAHAN (Nice to Have)

| # | Fitur | Kenapa Penting | URL Rencana |
|---|-------|----------------|-------------|
| 15 | **Check-in Mandiri (Self Check-in QR)** | Jamaah scan QR di bandara/hotel untuk check-in sendiri tanpa antri ke meja admin | `/jamaah/checkin` |
| 16 | **Status Bagasi** | Tracking posisi bagasi selama perjalanan. Berguna saat bagasi terpisah dari jamaah | Tambah di `/jamaah` |
| 17 | **Download Kontrak / Perjanjian** | Jamaah perlu akses dokumen perjanjian perjalanan untuk keperluan asuransi/klaim | Tambah di `/jamaah/documents` |
| 18 | **Cuaca Makkah & Madinah** | Widget cuaca real-time di tujuan — bantu jamaah bersiapkan pakaian dan persiapan fisik | Widget di `/jamaah` |

---

## C. YANG PERLU DIPERBAIKI — PERBAIKAN 🔧

### UX & Navigasi

| # | Masalah | Dampak | Solusi |
|---|---------|--------|--------|
| U1 | **Dua portal terpisah membingungkan** — `/customer/dashboard` (desktop) vs `/jamaah` (mobile) tanpa unified navigation. Jamaah tidak tahu harus masuk ke mana | Tinggi | Buat unified entry point dengan auto-redirect berdasarkan device + header yang menunjukkan kedua portal terhubung |
| U2 | **JamaahBottomNav hanya 5 tab** — tidak ada akses langsung ke Panduan Ibadah, Peta Lokasi, atau Itinerary dari bottom nav | Tinggi | Tambah tab "Ibadah" yang berisi submenu: Panduan, Peta, Waktu Sholat, atau ganti icon yang lebih relevan |
| U3 | **Ikon duplikat di Quick Actions** — ada 2x FileText (FAQ & Dokumen), dan MapPin dipakai untuk Itinerary & Peta. Membingungkan jamaah | Sedang | Ganti ikon: Dokumen → FolderOpen, Itinerary → CalendarDays, Peta → Map, Panduan → BookOpen |
| U4 | **Empty state saat belum ada booking** — JamaahPortal menampilkan halaman kosong tanpa panduan langkah berikutnya | Sedang | Tampilkan onboarding card: "Belum ada booking aktif — Lihat Paket → Booking → Tunggu Konfirmasi" |
| U5 | **JamaahFeedback tidak bisa diakses dari portal** — URL-nya `/jamaah/feedback/:bookingId` tapi tidak ada tombol di mana pun untuk navigasi ke sana | Tinggi | Tambah tombol "Beri Feedback" di BookingDetail dan JamaahPortal setelah keberangkatan selesai |

### Fitur yang Sudah Ada tapi Kurang Lengkap

| # | Halaman | Masalah | Solusi |
|---|---------|---------|--------|
| F1 | **JamaahItinerary** | Tidak ada tombol download/share itinerary. Jamaah harus screenshot manual | Tambah tombol share native + download PDF |
| F2 | **JamaahDigitalID** | Ada tombol Share tapi tidak ada share ke WhatsApp atau share native API | Implementasi Web Share API + tombol WhatsApp langsung |
| F3 | **CustomerSettings** | Tidak ada setting notifikasi, pilihan bahasa (sudah ada LanguageContext), atau toggle dark mode dari sisi jamaah | Tambah tab Preferensi: Bahasa, Notifikasi, Tema |
| F4 | **CustomerSupport** | Tidak bisa attach file/screenshot saat buat tiket. Sering jamaah perlu lampirkan bukti | Tambah field upload file di form tiket |
| F5 | **BookingDetail** | Informasi pembayaran tidak ada timeline visual — kapan DP, kapan cicilan, kapan pelunasan | Tambah payment timeline/milestone di halaman detail |
| F6 | **JamaahPaymentHistory** | Tidak ada filter berdasarkan status, tanggal, atau booking. Susah dicari untuk booking lama | Tambah filter + search |
| F7 | **JamaahDocuments** | Tidak ada checklist dokumen yang diperlukan (paspor, KTP, foto, surat nikah, dll). Jamaah tidak tahu apa yang harus disiapkan | Tambah required documents checklist per jenis paket |
| F8 | **MyLoyalty** | Tidak ada riwayat penukaran poin. Setelah redeem tidak ada jejak transaksi poin | Tambah tab Riwayat Poin & Penukaran |
| F9 | **JamaahPortal** — Upload foto profil | Jamaah tidak bisa ganti foto profil dari portal jamaah. Hanya admin yang bisa via `/admin/customers` | Tambah tombol ganti foto profil di header JamaahPortal |
| F10 | **BookingWizard** | Step "Sumber Pendaftaran (PIC)" kurang jelas bagi jamaah awam — terminologinya teknis | Ubah label menjadi lebih ramah pengguna: "Siapa yang merekomendasikan Anda?" |
| F11 | **JamaahNotifications** | Tidak ada aksi dari notifikasi — hanya baca saja. Tidak ada deep link ke halaman terkait | Tambah action button di notifikasi (mis. "Bayar Sekarang", "Lihat Dokumen") |
| F12 | **PaymentUpload** | Setelah upload tidak ada konfirmasi via WhatsApp ke admin. Admin harus cek manual | Tambah trigger notifikasi ke admin setelah upload berhasil |
| F13 | **MySavings** | Tidak ada proyeksi kapan tabungan lunas berdasarkan setoran rata-rata yang sudah masuk | Tambah widget proyeksi lunas berdasarkan historis setoran |

---

## D. PRIORITAS & ROADMAP

### Fase 1 — Quick Wins (1-2 hari kerja)
*Perbaikan yang mudah tapi dampak besar bagi jamaah:*

| ID | Item | Jenis |
|----|------|-------|
| Q1 | Perbaiki ikon duplikat di Quick Actions JamaahPortal | Perbaikan |
| Q2 | Tambah tombol Feedback di BookingDetail & JamaahPortal | Perbaikan |
| Q3 | Tambah Web Share API di JamaahDigitalID & JamaahItinerary | Perbaikan |
| Q4 | Tambah filter di JamaahPaymentHistory | Perbaikan |
| Q5 | Empty state yang informatif di JamaahPortal saat tidak ada booking | Perbaikan |
| Q6 | Upload foto profil dari JamaahPortal header | Perbaikan |
| Q7 | Tambah tab Riwayat di MyLoyalty | Perbaikan |
| Q8 | Action button di notifikasi (deep link ke halaman terkait) | Perbaikan |

### Fase 2 — Fitur Inti Jamaah (3-5 hari kerja)
*Fitur yang paling sering dibutuhkan jamaah saat aktif perjalanan:*

| ID | Fitur | Prioritas |
|----|-------|-----------|
| F1 | **Jadwal Waktu Sholat Makkah & Madinah** | Tinggi |
| F2 | **Kwitansi / Invoice Digital PDF** | Tinggi |
| F3 | **Info Kamar Hotel** (tambah di JamaahPortal & Digital ID) | Tinggi |
| F4 | **Pengumuman dari Pembimbing** (feed di JamaahPortal) | Tinggi |
| F5 | **Kalkulator Kurs Riyal ↔ IDR** | Menengah |
| F6 | **Panduan Kesehatan di Saudi** (tab baru di PanduanIbadah) | Menengah |
| F7 | **Onboarding / Welcome Flow** untuk jamaah baru | Tinggi |
| F8 | **Checklist Dokumen Required** di JamaahDocuments | Menengah |

### Fase 3 — Fitur Sosial & Komunitas (5-7 hari kerja)
*Fitur yang membangun koneksi antar jamaah dan dengan tim:*

| ID | Fitur | Prioritas |
|----|-------|-----------|
| S1 | **Chat Jamaah ↔ Tim/Muthawif** (real-time via Supabase Realtime) | Tinggi |
| S2 | **Daftar Teman Seperombongan** | Tinggi |
| S3 | **Galeri Foto Perjalanan** (upload + lihat bersama) | Menengah |
| S4 | **Riwayat Perjalanan Alumni** | Menengah |
| S5 | **Referral dari Portal Jamaah** | Rendah |

### Fase 4 — Fitur Finansial & Spiritual (3-4 hari kerja)

| ID | Fitur | Prioritas |
|----|-------|-----------|
| Z1 | **Kalkulator Zakat** (fitrah, maal, fidyah) | Menengah |
| Z2 | **Proyeksi lunas tabungan** di MySavings | Menengah |
| Z3 | **Payment Timeline** visual di BookingDetail | Sedang |
| Z4 | **Attachment file** di CustomerSupport | Sedang |
| Z5 | **Setting notifikasi & bahasa** di CustomerSettings | Sedang |

### Fase 5 — Operasional & Self-Service (2-3 hari kerja)

| ID | Fitur | Prioritas |
|----|-------|-----------|
| O1 | **Check-in Mandiri (QR)** | Menengah |
| O2 | **Info Transportasi / Bus** di itinerary | Menengah |
| O3 | **Status Bagasi** | Rendah |
| O4 | **Download Kontrak/Perjanjian** | Rendah |
| O5 | **Widget Cuaca Makkah & Madinah** | Rendah |

---

## E. RINGKASAN ANGKA

| Kategori | Jumlah |
|----------|--------|
| Halaman jamaah/customer yang sudah ada | 20 halaman |
| Fitur baru yang belum ada | 18 fitur |
| Poin yang perlu diperbaiki | 13 poin |
| Total item di roadmap | 31 item |
| Estimasi total hari kerja | ~18-22 hari |

---

## F. QUICK REFERENCE — HALAMAN YANG HARUS ADA (Target)

```
/jamaah                     ✅ Ada — perlu perbaikan empty state & ikon
/jamaah/digital-id          ✅ Ada — perlu Web Share API
/jamaah/itinerary           ✅ Ada — perlu download/share
/jamaah/documents           ✅ Ada — perlu required docs checklist
/jamaah/payment-history     ✅ Ada — perlu filter
/jamaah/feedback/:id        ✅ Ada — perlu akses dari dashboard
/jamaah/notifications       ✅ Ada — perlu action button
/jamaah/visa                ✅ Ada — cukup baik
/jamaah/panduan-ibadah      ✅ Ada — perlu tab Kesehatan
/jamaah/peta-lokasi         ✅ Ada — baru dibangun
/jamaah/doa-panduan         ✅ Ada — duplikat dengan panduan-ibadah, pertimbangkan merge
/jamaah/chat                🔴 Belum ada — PRIORITAS TINGGI
/jamaah/rombongan           🔴 Belum ada — PRIORITAS TINGGI
/jamaah/waktu-sholat        🔴 Belum ada — PRIORITAS TINGGI
/jamaah/invoice/:id         🔴 Belum ada — PRIORITAS TINGGI
/jamaah/kalkulator-kurs     🔴 Belum ada — PRIORITAS MENENGAH
/jamaah/kalkulator-zakat    🔴 Belum ada — PRIORITAS MENENGAH
/jamaah/galeri              🔴 Belum ada — PRIORITAS MENENGAH
/jamaah/riwayat-perjalanan  🔴 Belum ada — PRIORITAS MENENGAH
/jamaah/referral            🔴 Belum ada — PRIORITAS RENDAH
/jamaah/checkin             🔴 Belum ada — PRIORITAS RENDAH
/jamaah/welcome             🔴 Belum ada — PRIORITAS TINGGI
```

---

## G. CATATAN TEKNIS

- **Chat real-time**: Gunakan Supabase Realtime (subscription ke tabel `chat_messages`) — tidak perlu backend tambahan
- **Invoice PDF**: Gunakan `jspdf` + `jspdf-autotable` yang sudah terinstall — tinggal buat template
- **Waktu Sholat**: Gunakan API publik Aladhan (`api.aladhan.com`) yang gratis dan reliable, atau data statis untuk mode offline
- **Kurs Riyal**: Gunakan API publik Exchange Rate atau data statis yang diupdate manual mingguan
- **Web Share API**: Sudah didukung di semua browser modern dan iOS Safari — untuk share digital ID & itinerary
- **Galeri Foto**: Upload ke Supabase Storage (sudah ada infrastrukturnya), tabel baru `trip_photos`
- **Kalkulator Zakat**: Pure frontend — tidak perlu backend, hanya formula kalkulasi
- **Merge Panduan**: `/jamaah/doa-panduan` dan `/jamaah/panduan-ibadah` punya konten tumpang tindih — pertimbangkan merge ke satu halaman dengan lebih banyak tab
