# Panduan Super Admin: Manajemen Hak Akses (RBAC)
**Versi**: 1.0  
**Tanggal**: 16 April 2026

---

## 1. Pengenalan Sistem RBAC

Sistem **Role-Based Access Control (RBAC)** memungkinkan Super Admin untuk mengatur hak akses setiap pengguna dan role dalam aplikasi Umrah Haji Magic. Sistem ini dibangun dengan arsitektur **User-Centric** di mana izin individual pengguna adalah sumber kebenaran utama.

### 1.1 Konsep Dasar

**Role** adalah kumpulan izin yang dapat diberikan kepada pengguna. Contoh: `branch_manager`, `finance`, `sales`, dll.

**Permission** adalah izin spesifik untuk melakukan tindakan tertentu. Contoh: `bookings.view_all`, `payments.verify`, dll.

**User** dapat memiliki **multiple roles** dan dapat memiliki **permission overrides** (izin tambahan atau pembatasan).

### 1.2 Hirarki Kontrol Akses

```
Super Admin (Bypass Semua)
    ↓
Role-Based Permissions (Template)
    ↓
User-Level Overrides (Individual)
    ↓
Effective Permission (Hasil Akhir)
```

---

## 2. Mengakses Manajemen Hak Akses

### 2.1 Menu Super Admin

Sebagai Super Admin, Anda dapat mengakses fitur manajemen hak akses melalui:

1. **Sidebar Menu** → **Sistem & Pengaturan** → **Manajemen Pengguna**
2. **Sidebar Menu** → **Sistem & Pengaturan** → **Manajemen Role & Izin**

### 2.2 Halaman Utama Manajemen Pengguna

Halaman ini menampilkan daftar semua pengguna dalam sistem dengan informasi:
- Nama lengkap
- Email
- Nomor telepon
- Role yang dimiliki
- Tanggal dibuat

---

## 3. Mengelola Role Pengguna

### 3.1 Menambahkan Role ke Pengguna

**Langkah-langkah:**

1. Buka halaman **Manajemen Pengguna**
2. Cari pengguna yang ingin diberi role
3. Klik tombol **Tambah Role** pada baris pengguna
4. Dialog akan muncul dengan form:
   - **Jenis Role**: Pilih role yang ingin diberikan
   - **Kantor Cabang** (opsional): Tentukan cabang jika role memerlukan assignment cabang
5. Klik **Simpan**

**Catatan**: Ketika role diberikan, semua izin dari template role akan otomatis disalin ke pengguna.

### 3.2 Mengedit Role Pengguna

**Langkah-langkah:**

1. Di halaman **Manajemen Pengguna**, cari pengguna
2. Pada kolom Role, klik tombol **Edit** (ikon pensil) pada role yang ingin diubah
3. Dialog akan muncul dengan form untuk mengubah:
   - Jenis role
   - Kantor cabang
4. Klik **Update**

### 3.3 Menghapus Role dari Pengguna

**Langkah-langkah:**

1. Di halaman **Manajemen Pengguna**, cari pengguna
2. Pada kolom Role, klik tombol **Hapus** (ikon trash) pada role yang ingin dihapus
3. Konfirmasi penghapusan
4. Role akan dihapus, tetapi izin individual yang sudah diberikan akan tetap ada

**Catatan**: Menghapus role tidak menghapus izin individual yang sudah diberikan. Gunakan "Reset Izin" jika ingin menghapus semua izin.

---

## 4. Mengelola Izin Individual Pengguna

### 4.1 Membuka Dialog Izin Khusus

**Langkah-langkah:**

1. Di halaman **Manajemen Pengguna**, cari pengguna
2. Klik tombol **Izin Khusus** (ikon shield) pada baris pengguna
3. Dialog besar akan muncul menampilkan semua izin pengguna

### 4.2 Struktur Dialog Izin Khusus

Dialog dibagi menjadi 2 tab:

#### Tab 1: Izin Pengguna
Menampilkan semua izin individual pengguna yang dapat diubah:

- **Search Box**: Cari izin berdasarkan nama atau kode
- **Grouped by Category**: Izin dikelompokkan berdasarkan kategori (Booking, Keuangan, dll)
- **Toggle Checkbox**: Aktifkan/nonaktifkan izin individual
- **Save Button**: Simpan perubahan

#### Tab 2: Peran Pengguna
Menampilkan role yang dimiliki pengguna:

- **Daftar Role**: Menampilkan semua role yang dimiliki
- **Tambah Role**: Tombol untuk menambahkan role baru
- **Hapus Role**: Tombol untuk menghapus role
- **Reset Izin**: Tombol untuk mereset semua izin ke default berdasarkan role

### 4.3 Mengubah Izin Individual

**Untuk Memberikan Izin Tambahan:**

1. Buka dialog **Izin Khusus**
2. Cari izin yang ingin diberikan
3. Centang checkbox izin tersebut
4. Klik **Simpan Perubahan**

**Untuk Mencabut Izin:**

1. Buka dialog **Izin Khusus**
2. Cari izin yang ingin dicabut
3. Hapus centang pada checkbox izin tersebut
4. Klik **Simpan Perubahan**

### 4.4 Mereset Izin ke Default

**Langkah-langkah:**

1. Buka dialog **Izin Khusus** → Tab **Peran Pengguna**
2. Klik tombol **Reset Izin**
3. Konfirmasi: "Ini akan mereset semua izin ke default berdasarkan role yang dimiliki"
4. Semua izin individual akan dihapus dan diganti dengan izin default dari role

---

## 5. Mengelola Role & Template Izin

### 5.1 Membuka Halaman Manajemen Role

**Langkah-langkah:**

1. Buka menu **Sistem & Pengaturan** → **Manajemen Role & Izin**
2. Halaman akan menampilkan daftar role dengan template izin mereka

### 5.2 Struktur Halaman Manajemen Role

- **Role List**: Daftar semua role yang dapat dikonfigurasi
- **Permission Matrix**: Tabel yang menampilkan izin per role
- **Toggle Switches**: Aktifkan/nonaktifkan izin untuk setiap role
- **Save Button**: Simpan perubahan

### 5.3 Mengubah Template Izin Role

**Langkah-langkah:**

1. Di halaman **Manajemen Role & Izin**, pilih role dari dropdown
2. Tabel akan menampilkan semua izin untuk role tersebut
3. Untuk mengubah izin:
   - **Aktifkan**: Centang checkbox izin
   - **Nonaktifkan**: Hapus centang checkbox izin
4. Klik **Simpan Perubahan**

**Catatan Penting**: Mengubah template role hanya mempengaruhi pengguna baru yang diberikan role tersebut. Pengguna yang sudah memiliki role tidak akan terpengaruh secara otomatis. Gunakan fitur "Sinkronisasi" untuk memperbarui izin pengguna yang sudah ada.

---

## 6. Daftar Role & Izin

### 6.1 Role yang Tersedia

| Role | Deskripsi | Penggunaan |
|------|-----------|-----------|
| `super_admin` | Super Admin dengan akses penuh | Hanya untuk administrator sistem |
| `owner` | Pemilik bisnis dengan akses penuh | Pemilik perusahaan |
| `branch_manager` | Manajer cabang | Kepala kantor cabang |
| `finance` | Staf keuangan | Tim akuntansi dan pembayaran |
| `operational` | Staf operasional | Tim operasional keberangkatan |
| `sales` | Staf penjualan | Tim sales dan booking |
| `marketing` | Staf marketing | Tim marketing dan leads |
| `equipment` | Staf perlengkapan | Tim manajemen perlengkapan |
| `agent` | Agen penjualan | Agen eksternal |
| `customer` | Pelanggan | Pengguna akhir/jamaah |

### 6.2 Kategori Izin

#### Booking & Jamaah (7 izin)
- `bookings.view_all`: Lihat semua booking dari semua cabang
- `bookings.view_branch`: Lihat booking cabang pengguna
- `bookings.view_own`: Lihat booking milik pengguna sendiri
- `bookings.create`: Buat booking baru
- `bookings.edit`: Edit booking
- `bookings.approve`: Setujui booking
- `bookings.delete`: Hapus booking

#### Keuangan & Pembayaran (7 izin)
- `payments.view_all`: Lihat semua pembayaran
- `payments.view_branch`: Lihat pembayaran cabang
- `payments.view_own`: Lihat pembayaran sendiri
- `payments.create`: Buat pembayaran
- `payments.verify`: Verifikasi pembayaran
- `payments.refund`: Proses refund
- `finance.reports`: Akses laporan keuangan

#### Data Jamaah (5 izin)
- `customers.view`: Lihat jamaah
- `customers.create`: Buat jamaah baru
- `customers.edit`: Edit data jamaah
- `customers.edit_sensitive`: Edit data sensitif (paspor/NIK)
- `customers.delete`: Hapus jamaah

#### Operasional (4 izin)
- `operational.manifest`: Kelola manifest
- `operational.visa`: Update status visa
- `operational.view`: Lihat operasional
- `operational.manage`: Kelola operasional

#### Perlengkapan (2 izin)
- `equipment.inventory`: Kelola stok perlengkapan
- `equipment.distribute`: Catat serah terima perlengkapan

#### Leads & Marketing (4 izin)
- `leads.view`: Lihat leads
- `leads.create`: Buat leads
- `leads.edit`: Edit leads
- `leads.delete`: Hapus leads

#### Paket & Keberangkatan (8 izin)
- `packages.view`: Lihat paket
- `packages.create`: Buat paket
- `packages.edit`: Edit paket
- `packages.delete`: Hapus paket
- `departures.view`: Lihat keberangkatan
- `departures.create`: Buat keberangkatan
- `departures.edit`: Edit keberangkatan
- `departures.delete`: Hapus keberangkatan

#### Sistem & Pengaturan (14 izin)
- `users.view`: Lihat pengguna
- `users.create`: Buat pengguna
- `users.edit`: Edit pengguna
- `users.delete`: Hapus pengguna
- `agents.view`: Lihat agen
- `agents.create`: Buat agen
- `agents.edit`: Edit agen
- `agents.delete`: Hapus agen
- `master_data.view`: Lihat master data
- `master_data.manage`: Kelola master data
- `settings.view`: Lihat pengaturan
- `settings.manage`: Kelola pengaturan
- `dashboard.view`: Akses dashboard
- `analytics.view`: Lihat analytics
- `reports.view`: Lihat laporan

---

## 7. Skenario Penggunaan

### Skenario 1: Membuat User Baru dengan Role Finance

**Tujuan**: Menambahkan karyawan baru sebagai staf keuangan

**Langkah-langkah:**

1. Buka **Manajemen Pengguna**
2. Cari user baru (sudah dibuat di auth system)
3. Klik **Tambah Role**
4. Pilih role `finance`
5. Pilih cabang (jika diperlukan)
6. Klik **Simpan**
7. User akan otomatis mendapat izin: `payments.view_all`, `payments.verify`, `finance.reports`, dll

### Skenario 2: Memberikan Akses Khusus ke User

**Tujuan**: Memberikan izin tambahan `bookings.approve` ke user yang biasanya hanya bisa lihat booking

**Langkah-langkah:**

1. Buka **Manajemen Pengguna**
2. Cari user yang dituju
3. Klik **Izin Khusus**
4. Tab **Izin Pengguna** akan terbuka
5. Cari `bookings.approve`
6. Centang checkbox
7. Klik **Simpan Perubahan**
8. User sekarang bisa approve booking

### Skenario 3: Membatasi Akses User

**Tujuan**: Mencabut izin `payments.refund` dari user finance tertentu

**Langkah-langkah:**

1. Buka **Manajemen Pengguna**
2. Cari user yang dituju
3. Klik **Izin Khusus**
4. Tab **Izin Pengguna** akan terbuka
5. Cari `payments.refund`
6. Hapus centang checkbox
7. Klik **Simpan Perubahan**
8. User tidak bisa lagi proses refund

### Skenario 4: Mengubah Template Role

**Tujuan**: Menambahkan izin `analytics.view` ke semua user dengan role `branch_manager`

**Langkah-langkah:**

1. Buka **Manajemen Role & Izin**
2. Pilih role `branch_manager` dari dropdown
3. Cari `analytics.view` di tabel
4. Centang checkbox
5. Klik **Simpan Perubahan**
6. Pengguna baru yang diberikan role `branch_manager` akan mendapat izin ini
7. Untuk pengguna yang sudah ada, gunakan fitur "Sinkronisasi" (jika tersedia) atau reset izin mereka

---

## 8. Best Practices

### 8.1 Prinsip Least Privilege

- Berikan hanya izin yang dibutuhkan untuk melakukan pekerjaan
- Jangan berikan izin admin ke semua user
- Review izin secara berkala

### 8.2 Manajemen Role

- Gunakan role sebagai template, bukan untuk kasus individual
- Jika banyak user memerlukan izin khusus, pertimbangkan membuat role baru
- Dokumentasikan alasan perubahan role/izin

### 8.3 Audit & Monitoring

- Periksa audit log secara berkala untuk melihat perubahan role/izin
- Monitor user dengan izin sensitif (payments.refund, users.delete, dll)
- Buat laporan bulanan tentang perubahan akses

### 8.4 Security

- Jangan bagikan akun super admin
- Gunakan password yang kuat
- Enable 2FA jika tersedia
- Logout setelah selesai bekerja

---

## 9. Troubleshooting

### Masalah: User tidak bisa akses fitur meskipun sudah diberi role

**Solusi:**

1. Verifikasi role sudah diberikan di **Manajemen Pengguna**
2. Periksa apakah role memiliki izin yang diperlukan di **Manajemen Role & Izin**
3. Minta user untuk logout dan login kembali (refresh cache)
4. Periksa browser console untuk error messages

### Masalah: Mengubah template role tidak berpengaruh ke user yang sudah ada

**Solusi:**

1. Ini adalah behavior yang diharapkan (user permissions adalah source of truth)
2. Untuk memperbarui user yang sudah ada, gunakan fitur "Reset Izin" atau beri izin individual
3. Atau gunakan fitur "Sinkronisasi" jika tersedia

### Masalah: User mendapat izin yang tidak seharusnya

**Solusi:**

1. Buka **Manajemen Pengguna** → **Izin Khusus**
2. Cari izin yang tidak seharusnya ada
3. Hapus centang checkbox
4. Klik **Simpan Perubahan**

---

## 10. FAQ

**Q: Bisakah user memiliki multiple roles?**  
A: Ya, user dapat memiliki multiple roles. Izin akan digabungkan dari semua role.

**Q: Apa yang terjadi jika user memiliki role dengan izin yang bertentangan?**  
A: Sistem menggunakan logika OR (permissive), jadi jika salah satu role memberikan izin, user akan mendapat akses.

**Q: Bisakah saya membuat role custom?**  
A: Tidak, role sudah didefinisikan di sistem. Namun Anda dapat menggunakan izin individual untuk customization.

**Q: Bagaimana jika saya ingin memberikan akses sementara?**  
A: Berikan izin individual, lalu cabut setelah periode tertentu. Audit log akan mencatat perubahan.

**Q: Apakah super admin bisa dinonaktifkan?**  
A: Super admin memiliki bypass otomatis dan tidak dapat dinonaktifkan. Hanya bisa dihapus dari role.

---

## 11. Kontak & Support

Untuk pertanyaan atau masalah terkait manajemen hak akses:

- **Email**: support@umrah-haji-magic.com
- **Internal Chat**: #admin-support
- **Documentation**: https://docs.umrah-haji-magic.com/rbac

---

**Versi**: 1.0  
**Last Updated**: 16 April 2026  
**Prepared by**: Manus AI
