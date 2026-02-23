# Analisis Kelengkapan Fitur: Admin, Cabang, Agen, dan Jamaah

## Status Keseluruhan

Sistem ini sudah sangat lengkap dengan 45+ halaman admin, portal agen mandiri, portal jamaah PWA, dan modul operasional. Berikut analisis per modul:

---

## ADMIN PANEL - Status: 90% Lengkap

### Fitur yang Sudah Ada

- Dashboard dengan statistik real-time dan chart
- CRUD Paket, Keberangkatan, Hotel, Maskapai, Bandara, Muthawif
- Manajemen Booking (buat, detail, verifikasi)
- Pembayaran (verifikasi, filter lanjutan, progress bar)
- Keuangan: Laba/Rugi per keberangkatan, Kas & Gaji, Vendor
- CRM Leads dengan pipeline dan analytics
- Manajemen Jamaah, Agent (termasuk hierarki sub-agen)
- SDM/HR lengkap (absensi, gaji, potongan, face recognition)
- Loyalty, Referral, Kupon, Tabungan
- Support Tickets, WhatsApp integration
- Appearance/Branding multi-template
- Role & Permission management
- Security Audit, 2FA Settings
- Reports, Advanced Reports, Scheduled Reports
- Document Generator, Offline Content
- Multi-cabang dengan isolasi data

### Fitur yang Kurang/Perlu Diperbaiki

1. **Dashboard tidak filter per cabang** - Branch Manager melihat data semua cabang, bukan hanya cabangnya
2. **Tidak ada Audit Log viewer** - Tabel `audit_logs` ada di database, tapi tidak ada UI untuk melihatnya di admin panel
3. **Belum ada notifikasi WhatsApp otomatis** - Halaman WhatsApp ada, tapi belum terintegrasi dengan event sistem (booking baru, payment verified, dll)
4. **Tidak ada export PDF untuk Laba/Rugi** - Fitur export hanya tersedia di beberapa halaman
5. **Tidak ada halaman verifikasi dokumen khusus** - `AdminDocumentVerification.tsx` ada tapi tidak terdaftar di sidebar (hanya ada di route)

---

## CABANG (Branch) - Status: 75% Lengkap

### Fitur yang Sudah Ada

- CRUD cabang dengan kode, kota, kontak
- Website multi-tenant per cabang (`/b/:slug`)
- Pengaturan branding per cabang
- Isolasi data via RLS (branch_id)

### Fitur yang Kurang

1. **Branch Manager tidak bisa kelola staff cabangnya** - Sidebar "Karyawan" ada, tapi tidak ada filter per cabang di halaman HR
2. **Dashboard cabang tidak ada** - Branch Manager melihat dashboard global, bukan ringkasan cabangnya sendiri
3. **Laporan per cabang belum tersedia** - Reports menampilkan data global
4. **Tidak ada fitur transfer jamaah antar cabang**
  &nbsp;

---

## AGEN (Agent Portal) - Status: 85% Lengkap

### Fitur yang Sudah Ada

- Dashboard dengan statistik komisi
- Daftarkan jamaah baru (booking + customer + komisi otomatis)
- Data jamaah dengan status kelengkapan dokumen
- Riwayat komisi (total, pending, dibayar)
- Dompet digital dengan tarik dana
- Lihat paket tersedia
- Website agen mandiri (`/a/:slug`)
- Hierarki sub-agen

### Fitur yang Kurang

1. **Agen tidak bisa lihat status pembayaran jamaahnya** - Hanya lihat booking_status, bukan progress pembayaran
2. **Tidak ada notifikasi untuk agen** - Saat komisi disetujui atau booking berubah status, agen tidak mendapat notifikasi
3. **Daftarkan jamaah hanya 1 orang per booking** - Tidak bisa mendaftarkan rombongan (multiple passengers)
4. **Tidak ada fitur download materi promosi** - Brosur digital, flyer, dll
5. **AgentLayout redirect ke `/login` bukan `/auth/login**` - Bug: halaman login ada di `/auth/login`, tapi redirect ke `/login` (404)

---

## JAMAAH (Customer/Jamaah Portal) - Status: 80% Lengkap

### Fitur yang Sudah Ada

- Customer Dashboard dengan quick actions
- Portal Jamaah PWA (countdown, SOS, live location)
- Digital ID dengan QR Code
- Itinerary perjalanan
- Doa dan Panduan
- Dokumen jamaah
- My Bookings, Payment Upload
- Loyalty Points, Tabungan
- Support Tickets
- Notifikasi (sudah filter per user_id)

### Fitur yang Kurang

1. **Tidak ada riwayat pembayaran di portal jamaah** - Jamaah hanya lihat total terbayar, bukan detail per transaksi
2. **Kontak darurat masih hardcoded** - Nomor di JamaahPortal.tsx masih statis
3. **Tidak ada feedback/rating perjalanan** - Setelah selesai umroh, jamaah tidak bisa memberi rating atau testimoni
4. **Settings customer belum punya fitur edit foto profil**
5. **Tidak ada halaman FAQ/panduan umum** - Hanya ada Doa & Panduan, belum ada FAQ tentang proses umroh, dokumen yang diperlukan, dll

---

## BUG YANG DITEMUKAN

### BUG KRITIS

1. **AgentLayout redirect salah** (`src/pages/agent/AgentLayout.tsx` baris 31)
  - Redirect ke `/login` padahal route login ada di `/auth/login`
  - Efek: Agen yang belum login akan melihat halaman 404

### BUG MEDIUM

2. **Sidebar "Dokumen & Surat" tidak punya link ke Document Verification**
  - `AdminDocumentVerification.tsx` ada dan route terdaftar, tapi tidak ada di sidebar
  - Halaman ini tidak bisa diakses kecuali tahu URL langsung
3. **AgentWebsiteSettings menggunakan `as any` cast** (baris 28-30)
  - Query `website_settings` di-cast ke `any` untuk menghindari type error

### BUG RENDAH

4. **AgentDashboard label "confirmed" tidak diterjemahkan** (baris 159)
  - Menampilkan `booking_status` mentah ("confirmed") bukan label Indonesia ("Dikonfirmasi")
5. **AgentCommissions menggunakan `as any` untuk booking data** (baris 161-164)

---

## RENCANA PERBAIKAN YANG DIREKOMENDASIKAN

### Prioritas 1 - Bug Fix (Tidak merusak fitur lain)


| No  | Fix                                          | File                 | Perubahan                             |
| --- | -------------------------------------------- | -------------------- | ------------------------------------- |
| 1   | Fix redirect `/login` ke `/auth/login`       | `AgentLayout.tsx`    | Ubah baris 31                         |
| 2   | Tambah link Document Verification ke sidebar | `AdminLayout.tsx`    | Tambah item di grup "Dokumen & Surat" |
| 3   | Terjemahkan status booking di AgentDashboard | `AgentDashboard.tsx` | Gunakan `BOOKING_STATUS_LABELS`       |


### Prioritas 2 - Fitur Penting (Dampak tinggi, effort rendah)


| No  | Fitur                                                  | File                 | Perubahan                     |
| --- | ------------------------------------------------------ | -------------------- | ----------------------------- |
| 4   | Tambah filter cabang di Dashboard untuk Branch Manager | `AdminDashboard.tsx` | Filter stats by branch_id     |
| 5   | Tambah notifikasi agen saat komisi berubah             | Trigger database     | Insert ke tabel notifications |


### Prioritas 3 - Nice to Have (Effort tinggi)


| No  | Fitur                                                    | Effort |
| --- | -------------------------------------------------------- | ------ |
| 6   | Dashboard khusus per cabang                              | Sedang |
| 7   | Registrasi jamaah rombongan (multi-passenger) untuk agen | Tinggi |
| 8   | Riwayat pembayaran detail di portal jamaah               | Sedang |
| 9   | Rating/feedback setelah perjalanan                       | Sedang |
| 10  | Kontak darurat dari company_settings                     | Rendah |


---

## REKOMENDASI IMPLEMENTASI SEGERA

Saya merekomendasikan untuk segera memperbaiki **3 bug** di Prioritas 1 karena:

- Effort sangat kecil (masing-masing hanya 1-3 baris)
- Tidak ada risiko merusak fitur lain
- Memperbaiki pengalaman pengguna langsung

**Total: 3 file diubah, 0 file baru, 0 migrasi database**

Apakah Anda ingin saya lanjutkan dengan perbaikan Prioritas 1 saja, atau termasuk Prioritas 2?