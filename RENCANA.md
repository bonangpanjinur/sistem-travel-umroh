# Rencana Pengembangan — Vinstour Travel Portal
> Diperbarui: Mei 2026 | Stack: React 19 + Vite 7 + TypeScript + Supabase + Express

---

## Legenda

| Simbol | Artinya |
|--------|---------|
| ✅ | Selesai & terhubung ke data nyata |
| ⚠️ | UI ada tapi ada catatan penting (lihat keterangan) |
| 🔴 | Belum dibangun / tidak berfungsi |

---

## 1. INFRASTRUKTUR

| Item | Status | Catatan |
|------|--------|---------|
| pnpm monorepo (umrah-haji + api-server + api-spec) — Port 5000 / 8080 | ✅ | |
| React 19 + Vite 7 + TypeScript + Tailwind v3 — 0 error TS | ✅ | Typecheck pass setelah 7 bugfix deployment |
| Supabase Auth + Database (demo mode graceful) | ✅ | App jalan tanpa Supabase, tapi fitur mati |
| RBAC granular — Visual Permission Matrix + Audit Log | ✅ | |
| PWA / Service Worker | ✅ | |
| Dark Mode global | ✅ | |
| Multi-tenant (branch/agent subdomain) | ✅ | |
| Export Excel (xlsx) — 15+ halaman | ✅ | |
| Export PDF (jsPDF + autoTable) — 10+ halaman | ✅ | |
| OpenAPI Spec + Codegen (Orval) — type-safe hooks | ✅ | |
| Error Boundary global | ✅ | |

---

## 2. MODUL ADMIN

| Modul | Fitur | Status | Catatan |
|-------|-------|--------|---------|
| Dashboard Utama | Multi-role, stat periodik, filter branch/agent | ✅ | Query Supabase nyata |
| Analytics | Grafik multi-dimensi | ✅ | |
| KPI Dashboard | Target vs aktual, progress bar animasi | ⚠️ | Target (`bookings: 150`, `revenue: 3,5M`) **hardcoded** di kode — belum bisa diubah dari UI |
| **Dashboard Keuangan Terpadu** | Arus kas, proyeksi, perbandingan bulan, aging AR | ✅ | **Diperbaiki Mei 2026** — kini query dari `payments`, `cash_transactions`, `vendor_costs`, `bookings` nyata |
| Booking | Wizard multi-step, detail, bulk aksi, export, WhatsApp notif | ✅ | |
| Paket | CRUD + tipe + galeri + itinerary template | ✅ | |
| Lead Scoring Otomatis | Skor di Kanban & tabel | ✅ | |
| CRM & Lead — Kanban DnD | Kanban 5 kolom, drag-and-drop, follow-up reminder | ✅ | |
| Notifikasi Bell Admin | Tersambung ke `useAdminNotifications` | ✅ | |
| Keberangkatan | Detail, rooming, manifest, tracking, QR check-in | ✅ | |
| Keuangan P&L | Per keberangkatan dari `vendor_costs` + `bookings` | ✅ | |
| Keuangan Kas | Transaksi kas masuk/keluar dari `cash_transactions` | ✅ | |
| Keuangan AR | Piutang dari `bookings.remaining_amount` | ✅ | |
| Keuangan AP, Payroll, Tabungan, Komisi, Referral, Voucher | CRUD + tabel | ✅ | |
| Virtual Account | Generate VA per customer | ⚠️ | Nomor VA disimpan di **localStorage** — hilang jika ganti device/browser. Belum terhubung payment gateway nyata |
| Midtrans Config | Konfigurasi payment gateway | ⚠️ | Config disimpan di **localStorage**. Tidak ada integrasi Midtrans Snap yang nyata |
| Email Templates | Template email konfirmasi, reminder, dll | ⚠️ | Template UI lengkap, tapi endpoint `/api/email/send` **tidak ada** di Express server — email tidak terkirim |
| AI Summary | Narasi performa bulanan | ⚠️ | Narasi di-generate dari **snapshot data dummy hardcoded**, bukan dari Supabase nyata |
| Rekomendasi Paket | Engine scoring paket | ✅ | Scoring dari data paket Supabase nyata |
| Cicilan Reminder | WA blast reminder jatuh tempo | ✅ | Query dari `bookings`, kirim via Fonnte API |
| WA Otomatis | Trigger otomatis untuk event booking/bayar | ⚠️ | Pengaturan trigger disimpan di **localStorage** |
| WhatsApp Blast & Log | Blast massal, template, log kirim | ✅ | Terhubung ke `whatsapp_config` + Fonnte API |
| Jamaah & Dokumen | Detail pelanggan, verifikasi dokumen, visa, manasik, haji, perlengkapan | ✅ | |
| Stock Opname Perlengkapan | Stok & distribusi perlengkapan jamaah | ✅ | |
| SOS Monitor | Monitor alert SOS jamaah real-time | ✅ | |
| SDM / HR | Rekrutmen, kontrak, performance, absensi, aset | ✅ | |
| Agen & Mitra | Agen, cabang, vendor, hotel, maskapai, bandara, muthawif, bus | ✅ | |
| Keamanan | Role management, permission matrix, audit log, 2FA, API key | ✅ | |
| Marketing | Landing page builder, banner, WA blast, materi, korespondensi | ✅ | |
| Blog & Artikel | CRUD artikel — `/admin/blog` | ✅ | |
| Laporan | Standar, lanjutan, terjadwal, analytics | ✅ | |
| Webhook Outgoing | CRUD webhook, test ping, log — `/admin/webhooks` | ✅ | |

---

## 3. MODUL AGEN

| Fitur | Status | Catatan |
|-------|--------|---------|
| Dashboard Agen — chart komisi & booking, 8 stat, sub-agent network | ✅ | |
| Notifikasi Bell Agen | ✅ | |
| Jamaah, Komisi, Wallet, Referral | ✅ | |
| Leaderboard Agen | ✅ | |
| Target Bulanan & Progress | ⚠️ | Target disimpan di **localStorage** per browser |
| Digital Kit, Katalog Paket, Website Settings | ✅ | |

---

## 4. MODUL CUSTOMER & JAMAAH

| Fitur | Status | Catatan |
|-------|--------|---------|
| Dashboard Customer | ✅ | |
| Notifikasi In-App Customer | ✅ | |
| My Bookings, Detail Booking, Upload Pembayaran | ✅ | |
| Tabungan, Loyalty, Support, Profil | ✅ | |
| Perbandingan Paket | ✅ | |
| Kalkulator Cicilan | ✅ | |
| Countdown Keberangkatan | ✅ | |
| Portal Jamaah Hub, Notifikasi Jamaah | ✅ | |
| Digital ID (QR), Dokumen, Itinerary, Visa Tracker | ✅ | |
| Riwayat Pembayaran, Feedback, Doa & Panduan | ✅ | |
| SOS Alert | ✅ | Log ke DB + monitor admin real-time |
| Peta Lokasi Ibadah | ✅ | 14 lokasi Makkah & Madinah — `/jamaah/peta-lokasi` |
| Jurnal Ibadah, Doa Counter, Target Ibadah, Badges | ⚠️ | Data disimpan di **localStorage** — tidak tersinkron antar device |

---

## 5. PORTAL PUBLIK

| Fitur | URL | Status |
|-------|-----|--------|
| Landing Page Dinamis, Katalog Paket, Detail Paket | `/` `/packages` | ✅ |
| Blog & Artikel | `/blog` `/blog/:slug` | ✅ |
| Testimonial Jamaah | `/testimonials` | ✅ |
| WhatsApp Floating Button | Global | ✅ |
| Cek Status Booking, Jadwal Keberangkatan, About/Kontak | `/cek-booking` `/departures` | ✅ |
| Website Agen & Cabang (slug) | `/a/:slug` `/b/:slug` | ✅ |
| Flow Booking Online — wizard multi-step | `/booking/:id` | ✅ |
| Kalkulator Biaya Umroh | `/kalkulator` | ✅ |
| Kalkulator Cicilan Tabungan | `/kalkulator-cicilan` | ✅ |
| Perbandingan Paket | `/packages/compare` | ✅ |
| API Publik: GET packages, GET departures, POST leads | `/api/v1/` | ✅ |

---

## 6. PEKERJAAN YANG SUDAH SELESAI

| # | Fitur | Deskripsi | Status |
|---|-------|-----------|--------|
| 1 | **Fix TypeScript Deployment** | 7 error TS yang menyebabkan deploy gagal | ✅ Selesai Mei 2026 |
| 2 | **Finance Terpadu — Data Nyata** | Ganti semua data hardcoded/random dengan query Supabase nyata (`payments`, `cash_transactions`, `vendor_costs`, `bookings`) | ✅ Selesai Mei 2026 |
| 3 | **KPI Target Bisa Diatur Admin** | Target `bookings/revenue/leads/conversion` disimpan ke `company_settings` Supabase — admin ubah via dialog "Atur Target", berlaku untuk semua admin, fallback ke default jika belum diset | ✅ Selesai Mei 2026 |
| 4 | **Panduan Ibadah Offline (PWA)** | Jamaah akses itinerary & doa tanpa internet | ✅ |
| 5 | **Peta Lokasi Ibadah** | 14 lokasi Makkah & Madinah — `/jamaah/peta-lokasi` | ✅ |
| 6 | **Multi-bahasa (i18n)** | Indonesia + Arab + Inggris — 80+ kunci terjemahan | ✅ |
| 7 | **Rate Limiting API** | `express-rate-limit` di endpoint publik | ✅ |
| 8 | **Webhook Outgoing** | CRUD webhook ke ERP eksternal, test ping, log | ✅ |

---

## 7. YANG BELUM SELESAI / PERLU DIPERBAIKI

> Diurutkan dari yang paling kritis untuk operasional nyata

### 🔴 PRIORITAS TINGGI

| # | Item | Masalah | Solusi |
|---|------|---------|--------|
| P1 | ~~Dashboard Keuangan Terpadu~~ | ~~Data hardcoded/random~~ | ✅ **Selesai Mei 2026** |
| P2 | ~~KPI Target bisa diatur~~ | ~~`MONTHLY_TARGETS` hardcoded di kode~~ | ✅ **Selesai Mei 2026** — disimpan ke `company_settings`, dialog "Atur Target" di UI |
| P3 | ~~**Email Engine di API Server**~~ | ~~`/api/email/send` tidak ada~~ | ✅ **Selesai** — endpoint Express + Nodemailer sudah ada. Set `SMTP_HOST/PORT/USER/PASS/FROM` di Replit Secrets untuk mengaktifkan |
| P4 | **SQL Migrations ke Supabase** | 12 file SQL belum dijalankan — banyak tabel belum ada | Jalankan urut di Supabase SQL Editor (lihat §8) — semua file ada di folder `migrations/` |
| P5 | **Supabase Env Vars** | App jalan demo mode tanpa credential | Set 4 env vars di Replit Secrets (lihat §9) |

### 🟡 PRIORITAS MENENGAH

| # | Item | Masalah | Solusi |
|---|------|---------|--------|
| M1 | ~~**Konfigurasi Midtrans**~~ | ~~Tersimpan di localStorage~~ | ✅ **Selesai** — sync ke `app_settings` Supabase (fallback localStorage jika offline) |
| M2 | ~~**Virtual Account**~~ | ~~Nomor VA di localStorage~~ | ✅ **Selesai** — sync ke tabel `virtual_accounts` Supabase |
| M3 | ~~**WA Otomatis trigger**~~ | ~~Config di localStorage~~ | ✅ **Selesai** — trigger state & template sync ke `app_settings` Supabase |
| M4 | ~~**Target Agen Bulanan**~~ | ~~Di localStorage per browser~~ | ✅ **Selesai** — sync ke `agent_monthly_targets` Supabase |
| M5 | ~~**Jurnal & Ibadah Jamaah**~~ | ~~Doa counter, jurnal, target ibadah di localStorage~~ | ✅ **Selesai** — sync ke `jamaah_doa_sessions`, `jamaah_jurnal`, `jamaah_ibadah_targets/logs` Supabase |

### 🟢 PRIORITAS RENDAH

| # | Item | Masalah |
|---|------|---------|
| L1 | **AI Summary** | Narasi dari angka dummy — ganti dengan data Supabase nyata |
| L2 | **File Duplikat** | 5 halaman duplikat (`AdminPackages-Enhanced`, `AdminReports_Updated`, dll) — perlu dibersihkan |
| L3 | **Midtrans Snap Nyata** | Integrasi payment gateway online agar customer tidak perlu upload bukti manual |

---

## 8. SQL MIGRATIONS — URUTAN EKSEKUSI

> Semua file SQL sekarang terpusat di folder **`migrations/`** di root project.

Jalankan file-file ini di **Supabase SQL Editor** sesuai urutan:

```
1.  migrations/fase1-membership-branch-commission.sql
2.  migrations/fase2-public-website.sql
3.  migrations/fase3-customer-portal.sql
4.  migrations/fase4-6-analytics-notif-operational.sql
5.  migrations/whatsapp-tables.sql
6.  migrations/dashboard-access-config.sql
7.  migrations/hr-enhancements.sql
8.  migrations/operational-integration.sql
9.  migrations/flexible-rooming-groups.sql
10. migrations/multi-mahram-rooming.sql
11. migrations/phase4-push-visa.sql
12. migrations/phase5-rbac-improvements.sql
13. migrations/fase6-app-settings-va-targets-jamaah.sql  ← BARU (untuk M1–M5)
```

Lihat `migrations/README.md` untuk instruksi lengkap.

---

## 9. ENVIRONMENT VARIABLES (Wajib Sebelum Produksi)

| Variabel | Lokasi | Cara Set |
|----------|--------|----------|
| `VITE_SUPABASE_URL` | Frontend (Vite) | Replit Secrets → nama `VITE_SUPABASE_URL` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Frontend (Vite) | Replit Secrets → nama `VITE_SUPABASE_PUBLISHABLE_KEY` |
| `SUPABASE_URL` | API Server | Replit Secrets → nama `SUPABASE_URL` |
| `SUPABASE_SERVICE_ROLE_KEY` | API Server | Replit Secrets → nama `SUPABASE_SERVICE_ROLE_KEY` |

---

## 10. STATISTIK PROYEK

| Metrik | Jumlah |
|--------|--------|
| Total halaman | 140+ |
| Halaman Admin | 87 |
| Halaman Agen | 14 |
| Halaman Customer | 8 |
| Halaman Jamaah | 10 |
| Halaman Operasional | 14 |
| Halaman Publik | 13 |
| React hooks/queries | 52+ |
| Komponen UI & shared | 45+ |
| API endpoints publik | 4 |
| Konteks i18n | 3 bahasa (ID, EN, AR), 80+ kunci |
| Total baris kode (estimasi) | ~85.000 baris |
| File SQL migration | 12 file |
| Fitur pakai data nyata Supabase | ~85% |
| Fitur pakai localStorage (perlu dipindah ke DB) | ~8 fitur |
| Fitur backend belum ada (email) | 1 endpoint |
