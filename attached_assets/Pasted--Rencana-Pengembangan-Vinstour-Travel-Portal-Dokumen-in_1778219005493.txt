# Rencana Pengembangan Vinstour Travel Portal

> Dokumen ini merangkum status fitur saat ini, apa yang harus segera diselesaikan, dan visi pengembangan jangka panjang sistem manajemen Umroh & Haji Vinstour Travel.

---

## Status Saat Ini (Sudah Selesai)

### Modul Admin
- [x] Dashboard admin dengan statistik (booking, revenue, jamaah)
- [x] Manajemen booking lengkap (buat, edit, ubah status, detail)
- [x] Wizard booking jamaah (individu & rombongan)
- [x] Manajemen jamaah & data penumpang
- [x] Manajemen paket umroh/haji (CRUD, tipe kamar, harga)
- [x] Manajemen keberangkatan (departure)
- [x] Manajemen pembayaran (verifikasi, multi-payment)
- [x] Manajemen agen & sub agen (hierarki, rate komisi)
- [x] Manajemen cabang (CRUD)
- [x] Komisi agen otomatis saat booking dikonfirmasi
- [x] Alur approve → bayar komisi
- [x] Laporan keuangan & P&L
- [x] Dokumen (invoice, sertifikat, manifest)
- [x] Tiket support (admin balas)
- [x] Notifikasi WhatsApp (template)
- [x] Command palette (pencarian cepat)
- [x] Dark mode toggle
- [x] Halaman cek booking publik (/cek-booking)
- [x] Calendar view keberangkatan

### Modul Portal Agen
- [x] Dashboard agen (statistik, booking terbaru)
- [x] Daftarkan jamaah individu & rombongan
- [x] Data jamaah milik agen
- [x] Halaman komisi & riwayat
- [x] Dompet & request penarikan
- [x] **Jaringan sub agen** (halaman baru)
- [x] Paket tersedia
- [x] Digital kit (materi promosi)
- [x] Setting website agen
- [x] Notifikasi agen (realtime)

### Modul Publik
- [x] Landing page utama
- [x] Daftar paket
- [x] Detail paket + form booking
- [x] Website agen personal (/a/{slug})
- [x] Website cabang personal (/b/{slug})
- [x] Halaman cek status booking

---

## Harus Diselesaikan Segera (Prioritas Tinggi)

### 1. Sistem Keanggotaan Agen & Cabang
> Agen dan cabang harus membayar biaya pendaftaran/keanggotaan sebelum aktif

- [ ] Tabel `membership_plans` — paket keanggotaan (Silver, Gold, Platinum) dengan harga dan durasi
- [ ] Tabel `agent_memberships` — rekam keanggotaan aktif agen
- [ ] Tabel `branch_memberships` — rekam keanggotaan aktif cabang
- [ ] Halaman pendaftaran agen dengan pilih paket keanggotaan + upload bukti bayar
- [ ] Admin: approve/tolak keanggotaan, set tanggal aktif
- [ ] Notifikasi email/WA saat keanggotaan disetujui
- [ ] Reminder otomatis H-30/H-7 sebelum keanggotaan habis
- [ ] Portal agen: status keanggotaan, tanggal expired, tombol perpanjang

### 2. Website Agen — Fitur Lengkap
> Website /a/{slug} harus benar-benar fungsional dan bisa dikustomisasi

- [ ] Builder website agen yang lebih lengkap (saat ini minimal)
  - [ ] Upload foto profil & banner
  - [ ] Edit bio/deskripsi agen
  - [ ] Pilih paket yang ditampilkan di website
  - [ ] Form kontak/WhatsApp langsung ke agen
  - [ ] Testimoni jamaah (agen bisa input manual)
  - [ ] Galeri foto perjalanan
- [ ] SEO meta tags per agen (judul, deskripsi)
- [ ] Tombol share ke WhatsApp, Instagram, Facebook
- [ ] QR Code website agen (untuk digital kit)
- [ ] Tracking pengunjung website agen (view count)

### 3. Website Cabang — Fitur Lengkap
> Website /b/{slug} serupa dengan website agen tapi untuk cabang

- [ ] Builder website cabang (logo, banner, about, kontak)
- [ ] Tampilkan daftar agen di bawah cabang
- [ ] Tampilkan paket pilihan cabang
- [ ] Form inquiry/leads langsung ke cabang
- [ ] Integrasi maps (lokasi kantor cabang)
- [ ] Tracking pengunjung website cabang

### 4. Dashboard Branch Manager
> BranchManagerDashboard ada tapi masih minimal

- [ ] Statistik cabang: total booking, revenue, agen aktif
- [ ] Daftar agen di bawah cabang + performa masing-masing
- [ ] Komisi cabang (fee_branch dari setiap booking)
- [ ] Laporan bulanan cabang
- [ ] Kelola sub agen di wilayah cabang
- [ ] Approve/tolak pendaftaran agen baru di cabang

### 5. Komisi Cabang Otomatis
> Saat ini hanya komisi agen & sub agen yang otomatis

- [ ] Hitung `fee_branch` otomatis dari `packages.fee_branch` saat booking confirmed
- [ ] Tabel `branch_commissions` atau tambah kolom `branch_id` di `agent_commissions`
- [ ] Admin: approve & bayar komisi cabang
- [ ] Dashboard cabang: lihat komisi pending & sudah dibayar

---

## Belum Ada, Harus Ada (Prioritas Menengah)

### 6. Target & Kuota Agen
- [ ] Admin set target bulanan per agen (jumlah booking atau nominal revenue)
- [ ] Portal agen: progress bar pencapaian target bulan ini
- [ ] Bonus otomatis jika target tercapai (tambah ke wallet)
- [ ] Laporan pencapaian target per periode

### 7. Sistem Referral & Rekrutmen Sub Agen
- [ ] Agen bisa generate link undangan dengan parameter agent_code
- [ ] Calon sub agen isi form pendaftaran via link tersebut
- [ ] Admin approval → sub agen langsung terhubung ke parent agen
- [ ] Komisi rekrutmen: agen dapat bonus saat sub agennya pertama booking

### 8. Leaderboard & Gamifikasi
- [ ] Papan peringkat agen berdasarkan total booking / revenue / jamaah
- [ ] Badge pencapaian (Agen Bintang, Top 10, dll.)
- [ ] Periode: bulanan, kuartalan, tahunan

### 9. Laporan & Analitik Lanjutan
- [ ] Laporan komisi per periode (export Excel/PDF)
- [ ] Laporan performa per cabang vs cabang lain
- [ ] Laporan konversi leads → booking per agen
- [ ] Analitik website agen (pengunjung unik, klik paket)
- [ ] Chart tren booking bulanan per paket

### 10. Manajemen Leads (CRM Sederhana)
- [ ] Form kontak di website agen/cabang masuk sebagai lead
- [ ] Pipeline: Leads → Prospek → Negosiasi → Booking
- [ ] Assign lead ke agen tertentu
- [ ] Reminder follow-up otomatis
- [ ] Riwayat komunikasi per lead

### 11. Notifikasi & Komunikasi Lebih Baik
- [ ] Email otomatis ke jamaah saat booking confirmed/berkas lengkap/keberangkatan H-7
- [ ] WA otomatis ke agen saat komisi disetujui atau ada booking baru
- [ ] Email tagihan keanggotaan ke agen/cabang sebelum expired
- [ ] Push notification (PWA) untuk agen

### 12. Portal Jamaah (Pelanggan)
- [ ] Jamaah bisa login dan lihat status booking sendiri
- [ ] Download invoice, manifest, sertifikat sendiri
- [ ] Upload dokumen (KTP, paspor, foto) secara mandiri
- [ ] Jadwal keberangkatan & itinerary
- [ ] Chat/tanya ke agen

---

## Belum Ada, Nice to Have (Prioritas Rendah)

### 13. Integrasi Payment Gateway
- [ ] Midtrans / Xendit untuk bayar online langsung di website
- [ ] Payment link otomatis dikirim ke jamaah via WA/email
- [ ] Bayar DP dan cicilan online
- [ ] Pembayaran keanggotaan agen online

### 14. Aplikasi Mobile (PWA atau React Native)
- [ ] Portal agen sebagai PWA (install di HP)
- [ ] Push notification keberangkatan & komisi
- [ ] Scan KTP jamaah via kamera
- [ ] Offline mode untuk cek data jamaah

### 15. Integrasi Pihak Ketiga
- [ ] Sinkronisasi data visa dengan sistem Kemenag
- [ ] Integrasi Google Calendar untuk jadwal keberangkatan
- [ ] WhatsApp Business API (bukan hanya template link)
- [ ] Integrasi e-mail massal (Mailchimp / SendGrid)

### 16. Multi-Bahasa & Multi-Mata Uang
- [ ] Bahasa: Indonesia, Arab, Inggris
- [ ] Mata uang: IDR, SAR, USD (untuk paket internasional)

### 17. Fitur Operasional Lanjutan
- [ ] Manajemen visa (status, nomor visa, tanggal berlaku)
- [ ] Manajemen hotel & akomodasi di Mekkah/Madinah
- [ ] Manajemen transportasi (bus, penerbangan detail)
- [ ] Checklist keberangkatan (paspor, visa, vaksin, dll.)
- [ ] Absensi jamaah saat keberangkatan

---

## Struktur Keanggotaan yang Diusulkan

### Paket Agen
| Paket | Harga/Tahun | Maks. Sub Agen | Komisi | Fitur |
|-------|-------------|----------------|--------|-------|
| Silver | Rp 500.000 | 5 | 2% | Dashboard + website dasar |
| Gold | Rp 1.500.000 | 20 | 3% | + Digital kit + laporan |
| Platinum | Rp 3.000.000 | Unlimited | 4% | + Priority support + leaderboard |

### Paket Cabang
| Paket | Harga/Tahun | Maks. Agen | Komisi Cabang | Fitur |
|-------|-------------|------------|---------------|-------|
| Reguler | Rp 5.000.000 | 50 | 1% | Dashboard cabang + website |
| Premium | Rp 12.000.000 | Unlimited | 2% | + CRM + laporan lanjutan |

---

## Timeline yang Direkomendasikan

### Fase 1 — Selesaikan Fondasi (1-2 bulan)
1. Sistem keanggotaan agen & cabang (bayar → approve → aktif)
2. Website agen & cabang yang fungsional penuh
3. Dashboard branch manager yang lengkap
4. Komisi cabang otomatis

### Fase 2 — Tingkatkan Produktivitas Agen (1-2 bulan)
5. Target & kuota agen
6. Sistem referral & rekrutmen sub agen
7. Manajemen leads (CRM sederhana)
8. Laporan & export data

### Fase 3 — Skalabilitas & Monetisasi (2-3 bulan)
9. Integrasi payment gateway (keanggotaan & booking online)
10. Portal jamaah mandiri
11. Notifikasi email & WA otomatis
12. Leaderboard & gamifikasi

### Fase 4 — Ekspansi (3-6 bulan)
13. PWA / aplikasi mobile
14. Integrasi Kemenag & sistem visa
15. Multi-bahasa
16. Fitur operasional lanjutan (visa, hotel, transportasi)

---

*Dokumen ini dibuat: 8 Mei 2026 — Perbarui secara berkala seiring perkembangan.*
