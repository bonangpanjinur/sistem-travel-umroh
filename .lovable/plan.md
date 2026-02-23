# Analisis Kelengkapan Fitur: Admin, Cabang, Agen, dan Jamaah

## Status Keseluruhan

Sistem ini sudah sangat lengkap dengan 45+ halaman admin, portal agen mandiri, portal jamaah PWA, dan modul operasional. Berikut analisis per modul:

---

## FITUR YANG SUDAH DISELESAIKAN (Update Terbaru)

| No | Fitur / Bug Fix | Status | Lokasi |
|---|---|---|---|
| 1 | Fix redirect `/login` ke `/auth/login` | ✅ Selesai | `AgentLayout.tsx` |
| 2 | Tambah link Document Verification ke sidebar | ✅ Selesai | `AdminLayout.tsx` |
| 3 | Terjemahkan status booking di AgentDashboard | ✅ Selesai | `AgentDashboard.tsx` |
| 4 | Filter cabang di Dashboard untuk Branch Manager | ✅ Selesai | `AdminDashboard.tsx` |
| 5 | Notifikasi otomatis saat status komisi berubah | ✅ Selesai | Database Trigger |

---

## ADMIN PANEL - Status: 92% Lengkap

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

1. **Dashboard Super Admin tidak bisa pilih cabang** - Super Admin melihat total global, tapi belum ada dropdown untuk melihat dashboard cabang spesifik tanpa login sebagai branch manager.
2. **Tidak ada Audit Log viewer** - Tabel `audit_logs` ada di database, tapi tidak ada UI untuk melihatnya di admin panel.
3. **Belum ada notifikasi WhatsApp otomatis** - Halaman WhatsApp ada, tapi belum terintegrasi dengan event sistem (booking baru, payment verified, dll).
4. **Tidak ada export PDF untuk Laba/Rugi** - Fitur export hanya tersedia di beberapa halaman.
5. **Type Safety** - Masih banyak penggunaan `as any` di beberapa komponen admin yang perlu diperbaiki untuk kestabilan jangka panjang.

---

## CABANG (Branch) - Status: 75% Lengkap

### Fitur yang Sudah Ada

- CRUD cabang dengan kode, kota, kontak
- Website multi-tenant per cabang (`/b/:slug`)
- Pengaturan branding per cabang
- Isolasi data via RLS (branch_id)

### Fitur yang Kurang

1. **Branch Manager tidak bisa kelola staff cabangnya** - Sidebar "Karyawan" ada, tapi tidak ada filter per cabang di halaman HR.
2. **Laporan per cabang belum tersedia** - Reports menampilkan data global.
3. **Tidak ada fitur transfer jamaah antar cabang**.
4. **Manifest Generator** - Belum ada fitur untuk generate manifest jamaah per cabang untuk keperluan operasional.

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

1. **Agen tidak bisa lihat status pembayaran jamaahnya** - Hanya lihat booking_status, bukan progress pembayaran.
2. **Tidak ada notifikasi sistem untuk agen** - Selain komisi, agen belum mendapat notifikasi saat booking berubah status (misal: dokumen ditolak).
3. **Daftarkan jamaah hanya 1 orang per booking** - Tidak bisa mendaftarkan rombongan (multiple passengers) sekaligus.
4. **Tidak ada fitur download materi promosi** - Brosur digital, flyer, dll yang bisa di-share agen.

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

1. **Tidak ada riwayat pembayaran di portal jamaah** - Jamaah hanya lihat total terbayar, bukan detail per transaksi.
2. **Kontak darurat masih hardcoded** - Nomor di JamaahPortal.tsx masih statis.
3. **Tidak ada feedback/rating perjalanan** - Setelah selesai umroh, jamaah tidak bisa memberi rating atau testimoni.
4. **Settings customer belum punya fitur edit foto profil**.
5. **Tidak ada halaman FAQ/panduan umum** - Hanya ada Doa & Panduan, belum ada FAQ tentang proses umroh, dokumen yang diperlukan, dll.

---

## BUG YANG DITEMUKAN (Tersisa)

### BUG MEDIUM

1. **AgentWebsiteSettings menggunakan `as any` cast** (baris 28-30)
  - Query `website_settings` di-cast ke `any` untuk menghindari type error.

### BUG RENDAH

2. **AgentCommissions menggunakan `as any` untuk booking data** (baris 161-164).

---

## RENCANA PERBAIKAN YANG DIREKOMENDASIKAN

### Prioritas 1 - Fitur Operasional (Dampak Tinggi)

| No | Fitur | File / Modul | Tujuan |
|---|---|---|---|
| 1 | Filter Cabang di Halaman Karyawan | `AdminHR.tsx` | Branch manager bisa kelola staff sendiri |
| 2 | Detail Pembayaran di Portal Jamaah | `JamaahBookings.tsx` | Jamaah tahu transaksi mana yang sudah diverifikasi |
| 3 | Dynamic Emergency Contact | `JamaahPortal.tsx` | Ambil nomor dari `company_settings` |
| 4 | Manifest & Rooming List Generator | `AdminOperations.tsx` | Memudahkan operasional keberangkatan |

### Prioritas 2 - Pengembangan Agen & Sales

| No | Fitur | Effort |
|---|---|---|
| 5 | Registrasi jamaah rombongan (multi-passenger) | Tinggi |
| 6 | Download materi promosi (Digital Kit) | Sedang |
| 7 | Integrasi Notifikasi WhatsApp Otomatis | Tinggi |

### Prioritas 3 - User Experience & Branding

| No | Fitur | Effort |
|---|---|---|
| 8 | Rating/feedback setelah perjalanan | Sedang |
| 9 | Edit Foto Profil Jamaah | Rendah |
| 10 | Audit Log Viewer untuk Super Admin | Sedang |

---

## REKOMENDASI IMPLEMENTASI SEGERA

Saya merekomendasikan untuk fokus pada **Prioritas 1** karena fitur-fitur tersebut sangat krusial untuk operasional harian cabang dan kepercayaan jamaah terhadap status pembayaran mereka.

**Apakah Anda ingin saya mulai mengerjakan salah satu dari Prioritas 1 di atas?**
