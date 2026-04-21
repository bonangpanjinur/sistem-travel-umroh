# Setup Guide: Dashboard Access Configuration Tables

## Ringkasan Masalah

Fitur "Pengaturan Dashboard Per Role" memerlukan dua tabel di Supabase:
- `dashboard_access_config` - Menyimpan konfigurasi akses dashboard per peran
- `dashboard_access_audit_log` - Audit trail untuk perubahan konfigurasi

Jika tabel ini belum ada, Anda akan melihat error 404 di console browser:
```
Failed to load resource: the server responded with a status of 404
Error fetching config: Object
Error fetching audit log: Object
```

## Solusi: Jalankan Migration SQL

### Langkah 1: Buka Supabase Dashboard

1. Kunjungi [https://app.supabase.com](https://app.supabase.com)
2. Login dengan akun Anda
3. Pilih project VinsTourTravel

### Langkah 2: Buka SQL Editor

1. Di sidebar kiri, klik **SQL Editor**
2. Klik tombol **New Query** atau **+** untuk membuat query baru

### Langkah 3: Copy SQL Migration

Buka file `src/lib/migrations/dashboard-access-config.sql` dan copy seluruh kontennya.

### Langkah 4: Jalankan Query

1. Paste SQL ke SQL Editor
2. Klik tombol **Run** atau tekan `Ctrl+Enter`
3. Tunggu hingga query selesai dijalankan

Anda akan melihat pesan sukses jika tabel berhasil dibuat.

### Langkah 5: Verifikasi Tabel

1. Di sidebar kiri, klik **Table Editor**
2. Pastikan Anda melihat tabel baru:
   - `dashboard_access_config`
   - `dashboard_access_audit_log`

## Apa yang Dilakukan Migration?

Migration SQL akan:

1. **Membuat tabel `dashboard_access_config`**
   - Menyimpan konfigurasi modul dashboard per peran
   - Kolom: `role`, `enabled_modules`, `disabled_modules`, `default_dashboard`, dll.

2. **Membuat tabel `dashboard_access_audit_log`**
   - Mencatat setiap perubahan konfigurasi
   - Kolom: `role`, `action`, `module_key`, `changed_by`, `changed_at`, dll.

3. **Membuat indexes untuk performa**
   - Index pada `role` untuk query cepat
   - Index pada `changed_at` untuk audit log

4. **Mengaktifkan Row Level Security (RLS)**
   - Super admin dapat melihat dan mengubah semua konfigurasi
   - Staff hanya dapat melihat konfigurasi untuk peran mereka sendiri

5. **Memasukkan konfigurasi default**
   - Semua peran sudah memiliki konfigurasi default yang sesuai
   - Super admin dan owner memiliki akses ke semua modul

## Setelah Setup

### Untuk Super Admin

1. Navigasi ke `/admin/dashboard-access`
2. Pilih peran dari dropdown
3. Enable/disable modul dashboard sesuai kebutuhan
4. Set default dashboard untuk setiap peran
5. Lihat audit trail untuk melihat riwayat perubahan

### Untuk Staff User

1. Login dengan akun staff
2. Sistem otomatis mengarahkan ke dashboard default untuk peran mereka
3. Hanya dapat mengakses modul yang di-enable oleh super admin

## Troubleshooting

### Error: "relation 'dashboard_access_config' does not exist"

**Penyebab:** Tabel belum dibuat

**Solusi:** Jalankan migration SQL sesuai langkah di atas

### Error: "permission denied for schema public"

**Penyebab:** User Supabase tidak memiliki permission yang cukup

**Solusi:** 
1. Pastikan Anda login sebagai owner atau admin project
2. Atau gunakan service role key untuk menjalankan migration

### Tabel sudah ada tapi masih error

**Penyebab:** RLS policy terlalu ketat atau table sudah ada dengan struktur berbeda

**Solusi:**
1. Buka Table Editor
2. Klik tabel `dashboard_access_config`
3. Klik tab **RLS** dan verifikasi policies
4. Atau drop tabel dan jalankan migration ulang

## File Terkait

- `src/lib/migrations/dashboard-access-config.sql` - Migration SQL
- `src/components/admin/DashboardAccessManagerPanel.tsx` - UI untuk manage akses
- `src/hooks/dashboards/useDashboardAccess.ts` - Hook untuk check akses
- `DASHBOARD_IMPLEMENTATION_GUIDE.md` - Panduan lengkap implementasi

## Bantuan Lebih Lanjut

Jika masih ada masalah:
1. Cek console browser untuk error message yang lebih detail
2. Buka Supabase dashboard dan cek logs
3. Verifikasi RLS policies di table settings
4. Pastikan user memiliki role yang sesuai di tabel `user_roles`
