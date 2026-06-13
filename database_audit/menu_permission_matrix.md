# Menu Permission Matrix — Vinstour Travel Portal
> Berdasarkan admin-menu-registry.ts, CustomerRoutes.tsx, dan AdminRoutes.tsx

---

## Format
| Menu | Path | Permission Key | Role Minimum yang Diizinkan |

---

## Group: Beranda

| Menu | Path | Permission Key | Role Minimum |
|------|------|----------------|-------------|
| Dashboard | `/admin` | `dashboard` | operator, sales, finance, operational, equipment, marketing, branch_manager, owner, super_admin |
| Analytics | `/admin/analytics` | `analytics` | admin, owner, super_admin |
| KPI Real-time | `/admin/kpi-dashboard` | `kpi-dashboard` | admin, owner, branch_manager, super_admin |
| Ringkasan AI | `/admin/ai-summary` | `ai-summary` | admin, owner, super_admin |

---

## Group: Penjualan

| Menu | Path | Permission Key | Role Minimum |
|------|------|----------------|-------------|
| Leads & Prospek | `/admin/leads` | `leads` | sales, operator, admin, branch_manager |
| Leads Chat Widget | `/admin/chat-leads` | `chat-leads` | sales, admin |
| Booking | `/admin/bookings` | `bookings` | operator, sales, admin, branch_manager, finance |
| Kupon & Promo | `/admin/coupons` | `coupons` | admin, marketing |

---

## Group: Operasional

| Menu | Path | Permission Key | Role Minimum |
|------|------|----------------|-------------|
| Paket Umroh & Haji | `/admin/packages` | `packages` | admin, marketing, operational |
| Tipe Paket | `/admin/package-types` | `package-types` | admin, it |
| Jadwal Keberangkatan | `/admin/departures` | `departures` | admin, operational, branch_manager |
| Kamar & Rooming | `/admin/room-assignments` | `room-assignments` | admin, operational |
| Manifest Jamaah | `/admin/manifest` | `manifest-jamaah` | admin, operational |
| Perlengkapan | `/admin/equipment` | `equipment` | equipment, operational, admin |
| Manajemen Haji | `/admin/haji` | `haji` | admin, operational |
| Manasik | `/admin/manasik` | `manasik` | admin, operational |
| Absensi Digital | `/admin/absensi` | `absensi-digital` | operational, admin |
| Tracking Real-time | `/admin/departure-tracking` | `departure-tracking` | operational, admin |
| Template Itinerary | `/admin/itinerary-templates` | `itinerary-templates` | admin, operational |
| Monitor SOS | `/admin/sos-alerts` | `sos-alerts` | operational, admin |
| Monitor Lapangan | `/admin/lapangan` | `lapangan` | operational, admin |
| Setting Perlengkapan | `/admin/equipment-settings` | `equipment-settings` | admin, equipment |
| Broadcast WA Keberangkatan | `/admin/wa-blast` | `wa-blast-keberangkatan` | operational, admin |

---

## Group: Jamaah & Agen

| Menu | Path | Permission Key | Role Minimum |
|------|------|----------------|-------------|
| Data Jamaah | `/admin/customers` | `customers` | operator, sales, admin, branch_manager |
| Agen | `/admin/agents` | `agents` | admin, sales, branch_manager |
| Cabang | `/admin/branches` | `branches` | admin, super_admin, owner |
| Keanggotaan | `/admin/memberships` | `memberships` | admin |
| Program Loyalitas | `/admin/loyalty` | `loyalty` | admin, marketing |
| Referral | `/admin/referrals` | `referrals` | admin, marketing |
| Visa | `/admin/visa` | `visa` | admin, operational |
| Komisi Cabang | `/admin/branch-commissions` | `branch-commissions` | finance, branch_manager, owner |
| Laporan Komisi Agen | `/admin/agent-commission-report` | `agent-commission-report` | admin, finance |
| Master Laporan Komisi | `/admin/master-komisi` | `master-komisi` | finance, owner |
| Perbandingan Cabang | `/admin/branch-comparison` | `branch-comparison` | owner, finance, super_admin |

---

## Group: Keuangan

| Menu | Path | Permission Key | Role Minimum |
|------|------|----------------|-------------|
| Dashboard Keuangan | `/admin/finance-terpadu` | `finance-terpadu` | finance, admin, owner |
| Pembayaran | `/admin/payments` | `payments` | finance, admin, operator |
| Verifikasi Transfer | `/admin/payment-verification` | `payment-verification` | finance, admin |
| Rekening Bank | `/admin/bank-accounts` | `bank-accounts` | finance, admin |
| Monitor Refund | `/admin/refunds` | `refunds` | finance, owner |
| Kas & Bank | `/admin/finance-cash` | `finance-cash` | finance, admin |
| Piutang (AR) | `/admin/finance/ar` | `finance-ar` | finance |
| Hutang (AP) | `/admin/finance/ap` | `finance-ap` | finance |
| Program Tabungan | `/admin/savings` | `savings` | finance, admin, operator |
| Virtual Account | `/admin/virtual-account` | `virtual-account` | finance, admin |
| Reminder Cicilan | `/admin/cicilan-reminder` | `cicilan-reminder` | finance, admin |
| Generator Cicilan | `/admin/cicilan-generator` | `cicilan-generator` | finance, admin |
| WA Blast Tagihan | `/admin/wa-blast-tagihan` | `wa-blast-tagihan` | finance, admin |
| Chart of Accounts | `/admin/coa` | `coa` | finance |

---

## Group: Akuntansi

| Menu | Path | Permission Key | Role Minimum |
|------|------|----------------|-------------|
| K-01 Jurnal Umum | `/admin/finance/jurnal` | `jurnal-umum` | finance |
| K-02 Buku Besar | `/admin/finance/buku-besar` | `buku-besar` | finance, owner |
| K-03 Neraca Saldo | `/admin/finance/neraca-saldo` | `neraca-saldo` | finance, owner |
| K-04 Laba Rugi | `/admin/finance/laba-rugi` | `laba-rugi` | finance, owner |
| K-05 Neraca | `/admin/finance/neraca` | `neraca` | finance, owner |
| K-06 Arus Kas | `/admin/finance/arus-kas` | `arus-kas` | finance, owner |
| K-11 Anggaran & Budget | `/admin/finance/budget` | `budget` | finance, admin |
| K-12 Rekonsiliasi Bank | `/admin/finance/rekonsiliasi` | `rekonsiliasi` | finance |
| K-13 Laporan Pajak | `/admin/finance/laporan-pajak` | `laporan-pajak` | finance, owner |
| HPP Terpadu | `/admin/finance/hpp-terpadu` | `laporan-pajak` | finance, admin |
| Laporan per Cabang | `/admin/finance/laporan-cabang` | `laba-rugi` | finance, owner, branch_manager |

---

## Group: Laporan

| Menu | Path | Permission Key | Role Minimum |
|------|------|----------------|-------------|
| Laporan P&L | `/admin/finance` | `finance` | finance, owner |
| Laporan Terpusat | `/admin/reports-central` | `reports` | admin, finance |
| Laporan Detail | `/admin/reports` | `reports` | admin, finance |
| Laporan Lanjutan | `/admin/advanced-reports` | `advanced-reports` | admin, finance, owner |
| Laporan Terjadwal | `/admin/scheduled-reports` | `scheduled-reports` | admin, finance |
| Laporan Keuangan | `/admin/laporan/keuangan` | `laporan-keuangan` | finance, owner |
| Laporan Keberangkatan | `/admin/laporan/keberangkatan` | `laporan-keberangkatan` | admin, operational |
| Performa Agen | `/admin/laporan/agen` | `laporan-agen` | admin, finance |
| Monitoring Tabungan | `/admin/laporan/tabungan` | `monitoring-tabungan` | finance, admin |
| Laporan Reminder | `/admin/laporan/reminder` | `laporan-reminder` | finance, admin |

---

## Group: Konten

| Menu | Path | Permission Key | Role Minimum |
|------|------|----------------|-------------|
| Blog & Artikel | `/admin/blog` | `blog` | marketing, admin |
| Pengumuman | `/admin/announcements` | `announcements` | admin, marketing |
| Banner Carousel | `/admin/banners` | `banners` | admin, marketing |
| Landing Page | `/admin/landing-pages` | `landing-pages` | marketing, it |
| FAQ Manager | `/admin/faq-manager` | `faq-manager` | marketing, admin |

---

## Group: Komunikasi

| Menu | Path | Permission Key | Role Minimum |
|------|------|----------------|-------------|
| Materi Marketing | `/admin/marketing-materials` | `marketing-materials` | marketing, admin |
| WhatsApp Blast | `/admin/whatsapp` | `whatsapp` | marketing, admin |
| WA Otomatis | `/admin/wa-otomatis` | `wa-otomatis` | admin |
| Broadcast Tersegmentasi | `/admin/wa-broadcast` | `wa-broadcast` | marketing, admin |
| Konfigurasi Provider WA | `/admin/wa-provider` | `wa-provider` | it, admin |
| Roadmap WA | `/admin/wa-roadmap` | `wa-roadmap` | it, admin |
| Chatbot Auto-Reply | `/admin/wa-chatbot` | `wa-chatbot` | it, admin |
| Inbox WA | `/admin/wa-inbox` | `wa-inbox` | admin, sales |
| Kontak WA | `/admin/wa-contacts` | `wa-contacts` | admin, marketing |
| Bot Menu Interaktif | `/admin/wa-bot-menu` | `wa-bot-menu` | it, admin |
| Broadcast Template WABA | `/admin/wa-template-broadcast` | `wa-template-broadcast` | admin, marketing |
| Broadcast Terjadwal | `/admin/wa-scheduled-broadcast` | `wa-scheduled-broadcast` | marketing, admin |
| Template Email | `/admin/email-templates` | `email-templates` | admin, marketing |
| Push Notifikasi | `/admin/push-notifications` | `push-notifications` | admin |

---

## Group: AI & Analytics

| Menu | Path | Permission Key | Role Minimum |
|------|------|----------------|-------------|
| Gemini AI Chatbot | `/admin/gemini-ai` | `gemini-ai` | admin, it |
| Statistik Chatbot | `/admin/chatbot-stats` | `gemini-ai` | admin |
| Log Percakapan | `/admin/chat-logs` | `gemini-ai` | admin |
| Analisis Sentimen | `/admin/sentimen-feedback` | `sentimen-feedback` | marketing, admin |
| Prediksi Seat | `/admin/prediksi-seat` | `prediksi-seat` | admin, operational |
| Smart Notifikasi | `/admin/smart-notif` | `smart-notif` | admin |
| Rekomendasi Paket AI | `/admin/rekomendasi-paket` | `rekomendasi-paket` | admin, marketing |

---

## Group: Dokumen & Legalitas

| Menu | Path | Permission Key | Role Minimum |
|------|------|----------------|-------------|
| Verifikasi Dokumen | `/admin/document-verification` | `document-verification` | admin, operational |
| Jenis Dokumen | `/admin/document-types` | `document-types` | admin, it |
| Generator Surat | `/admin/documents-generator` | `documents-generator` | admin |
| Generator Proposal | `/admin/proposal-generator` | `proposal-generator` | admin, sales |
| Tracker Dokumen Jamaah | `/admin/document-expiry-tracker` | `document-expiry-tracker` | admin, operational |
| Hub Korespondensi | `/admin/correspondence` | `whatsapp` | admin |
| Konten Offline | `/admin/offline-content` | `offline-content` | admin, operational |
| Tiket Support | `/admin/support` | `support` | admin, operator |
| Aturan Pembatalan | `/admin/aturan-pembatalan` | `cancellation-policies` | admin |
| Aset Kantor | `/admin/office-assets` | `office-assets` | admin, finance |

---

## Group: SDM

| Menu | Path | Permission Key | Role Minimum |
|------|------|----------------|-------------|
| SDM / HR | `/admin/hr` | `hr` | admin, branch_manager |
| Absensi Karyawan | `/admin/hr/attendance` | `hr` | admin, branch_manager |
| Rekap Absensi | `/admin/hr/attendance-summary` | `hr` | admin, branch_manager |
| Pelatihan / Training | `/admin/hr/training` | `training` | admin, branch_manager |
| Notifikasi Training | `/admin/hr/training-notifications` | `training` | admin |
| Recruitment & Onboarding | `/admin/hr/recruitment` | `hr` | admin, branch_manager |
| Kontrak & SP | `/admin/hr/contracts` | `surat-peringatan` | admin, branch_manager |
| Laporan SDM | `/admin/hr/reports` | `hr` | admin, branch_manager, owner |

---

## Group: Master Data

| Menu | Path | Permission Key | Role Minimum |
|------|------|----------------|-------------|
| Maskapai | `/admin/airlines` | `airlines` | admin, it |
| Bandara | `/admin/airports` | `airports` | admin, it |
| Hotel | `/admin/hotels` | `hotels` | admin, operational |
| Bus & Vendor | `/admin/bus-providers` | `bus-providers` | admin, operational |
| Kurs Mata Uang | `/admin/exchange-rates` | `exchange-rates` | finance, admin |
| Supplier Toko | `/admin/store-suppliers` | `store-suppliers` | admin, finance |

---

## Group: E-Commerce / Toko

| Menu | Path | Permission Key | Role Minimum |
|------|------|----------------|-------------|
| Dashboard Toko | `/admin/store` | `store` | admin |
| Produk Toko | `/admin/store/products` | `store-products` | admin |
| Order Toko | `/admin/store/orders` | `store-orders` | admin, operator |
| Kategori Toko | `/admin/store/categories` | `store-categories` | admin |
| Purchase Order | `/admin/store/purchase-orders` | `store-purchase-orders` | admin, finance |
| Laporan Penjualan | `/admin/store/sales-report` | `store-sales-report` | admin, finance |
| Stok & Opname | `/admin/store/stock` | `store-stock-movements` | admin, equipment |

---

## Group: Integrasi

| Menu | Path | Permission Key | Role Minimum |
|------|------|----------------|-------------|
| API Connect | `/admin/api-connect` | `api-connect` | it |
| Log Aktivitas | `/admin/activity-log` | `activity-log` | it, super_admin |
| Webhooks | `/admin/webhooks` | `webhooks` | it |
| Midtrans | `/admin/midtrans` | `midtrans` | it, finance |
| Xendit | `/admin/xendit` | `xendit` | it, finance |
| Supabase Setup | `/admin/supabase-setup` | `supabase-setup` | it |
| Railway Guide | `/admin/railway` | `supabase-setup` | it |

---

## Group: Pengaturan

| Menu | Path | Permission Key | Role Minimum |
|------|------|----------------|-------------|
| Pengaturan Umum | `/admin/settings` | `settings` | it, super_admin |
| Appearance & Branding | `/admin/settings/appearance` | `appearance` | it, admin |
| Keamanan & 2FA | `/admin/settings/security` | `2fa` | semua (own profile) |
| PWA Settings | `/admin/settings/pwa` | `pwa-settings` | it |
| Simulator Akses | `/admin/settings/access-simulator` | `rbac-tools` | it, super_admin |
| RBAC Management | `/admin/settings/rbac` | `rbac-tools` | it, super_admin |
| RBAC Status | `/admin/settings/rbac-status` | `rbac-status` | it, super_admin |

---

## Portal Jamaah (CustomerRoutes.tsx)

| Menu / Path | Auth Required | Role yang Diizinkan |
|-------------|:------------:|---------------------|
| `/jamaah` (home) | ❌ | Semua (publik) |
| `/jamaah/welcome` | ❌ | Semua |
| `/jamaah/paket` | ❌ | Semua |
| `/jamaah/doa-panduan` | ❌ | Semua |
| `/jamaah/waktu-sholat` | ❌ | Semua |
| `/jamaah/kiblat` | ❌ | Semua |
| `/jamaah/al-quran` | ❌ | Semua |
| `/jamaah/profil` | ✅ | customer, jamaah, super_admin |
| `/jamaah/booking` | ✅ | customer, jamaah, super_admin |
| `/jamaah/itinerary` | ✅ | jamaah, super_admin |
| `/jamaah/documents` | ✅ | customer, jamaah, super_admin |
| `/jamaah/payment-history` | ✅ | customer, jamaah, super_admin |
| `/jamaah/digital-id` | ✅ | jamaah, super_admin |
| `/jamaah/checkin` | ✅ | jamaah, super_admin |

---

## Portal Khusus

| Portal | Path | Role yang Diizinkan |
|--------|------|---------------------|
| Muthawif Dashboard | `/muthawif/dashboard` | operational, branch_manager, super_admin, owner |
| Muthawif Laporan | `/muthawif/laporan-harian` | operational, super_admin |
| Muthawif Siaran | `/muthawif/siaran` | operational, super_admin |
| Tour Leader | `/tour-leader` | operational, branch_manager, super_admin, owner |
| Tour Leader Broadcast | `/tour-leader/broadcast` | operational, super_admin |
| Tour Leader Program | `/tour-leader/program` | operational, super_admin |

---

## Catatan: Menu Tanpa Perlindungan yang Jelas

> ⚠️ Beberapa menu menggunakan permission key yang sama untuk beberapa halaman berbeda. Ini mengurangi granularitas kontrol akses:

| Menu | Permission Key | Masalah |
|------|----------------|---------|
| Statistik Chatbot | `gemini-ai` | Sama dengan Gemini AI Chatbot |
| Log Percakapan | `gemini-ai` | Sama dengan Gemini AI Chatbot |
| Hub Korespondensi | `whatsapp` | Menggunakan permission WA umum |
| HPP Terpadu | `laporan-pajak` | Tidak sesuai domain |
| Laporan per Cabang | `laba-rugi` | Tidak spesifik |

**Rekomendasi:** Buat permission key terpisah untuk setiap halaman yang punya fungsi berbeda.
