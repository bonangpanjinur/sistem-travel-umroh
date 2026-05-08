# SQL Migrations — Vinstour Travel Portal

Jalankan file-file ini secara **berurutan** di Supabase SQL Editor.

## Urutan Eksekusi

| # | File | Keterangan |
|---|------|-----------|
| 1 | `fase1-membership-branch-commission.sql` | Tabel dasar: profiles, packages, bookings, payments, agents, branches, commissions |
| 2 | `fase2-public-website.sql` | Tabel publik: blog, testimonials, landing page settings |
| 3 | `fase3-customer-portal.sql` | Portal customer: tabungan, loyalty, support tickets |
| 4 | `fase4-6-analytics-notif-operational.sql` | Analytics, notifikasi, operasional keberangkatan |
| 5 | `whatsapp-tables.sql` | Konfigurasi & log WhatsApp (Fonnte) |
| 6 | `dashboard-access-config.sql` | Konfigurasi akses dashboard per role |
| 7 | `hr-enhancements.sql` | Modul SDM/HR: rekrutmen, kontrak, absensi |
| 8 | `operational-integration.sql` | Integrasi operasional: rooming, manifest |
| 9 | `flexible-rooming-groups.sql` | Grup kamar fleksibel |
| 10 | `multi-mahram-rooming.sql` | Penempatan kamar multi-mahram |
| 11 | `phase4-push-visa.sql` | Proses push visa & tracking |
| 12 | `phase5-rbac-improvements.sql` | Penyempurnaan RBAC & audit log |
| 13 | `fase6-app-settings-va-targets-jamaah.sql` | **Baru:** app_settings, virtual_accounts, agent_monthly_targets, jamaah_doa_sessions, jamaah_jurnal, jamaah_ibadah_targets/logs |

## Cara Menjalankan

1. Buka [Supabase Dashboard](https://app.supabase.com) → pilih project Anda
2. Klik **SQL Editor** di sidebar kiri
3. Klik **New query**
4. Copy-paste isi file SQL, lalu klik **Run**
5. Ulangi untuk setiap file sesuai urutan di atas

## Environment Variables yang Diperlukan

Setelah migrasi selesai, set variabel berikut di **Replit Secrets**:

| Nama Secret | Keterangan |
|-------------|-----------|
| `VITE_SUPABASE_URL` | URL project Supabase (contoh: `https://xxx.supabase.co`) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/public key dari Supabase |
| `SUPABASE_URL` | URL yang sama untuk API server |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (jangan expose ke frontend!) |
| `SMTP_HOST` | Host SMTP untuk email (contoh: `smtp.gmail.com`) |
| `SMTP_PORT` | Port SMTP (umumnya `587` untuk TLS) |
| `SMTP_USER` | Username/email SMTP |
| `SMTP_PASS` | Password SMTP atau App Password |
| `SMTP_FROM` | Alamat pengirim (contoh: `noreply@vinstour.com`) |
