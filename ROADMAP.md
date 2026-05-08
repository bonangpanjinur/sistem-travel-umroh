# Vinstour Travel — Roadmap & Status Fitur Lengkap

> Dokumen ini mencatat seluruh fitur yang **sudah dikerjakan**, **sudah ada di app**, dan **belum/perlu ditingkatkan** pada portal manajemen Umroh & Haji Vinstour Travel.
> Diperbarui: Mei 2026

---

## Legenda Status

| Simbol | Artinya |
|--------|---------|
| ✅ | Selesai & siap pakai |
| 🔧 | Ada tapi perlu peningkatan |
| 🔴 | Stub/kosong, belum dibangun |
| 💡 | Ide fitur baru, belum dibangun |

---

## YANG DIKERJAKAN DALAM SESI INI ✨

| Tanggal | Fitur | File Utama | Detail |
|---------|-------|------------|--------|
| Mei 2026 | **Admin Role Management Enhanced** | `AdminRoleManagementEnhanced.tsx` | 7-tab layout: Matriks, Izin per Role, Pemetaan Menu, Sinkron Menu, Audit Log, Ringkasan, Panduan |
| Mei 2026 | **Visual Permission Matrix v2** | `RolePermissionMatrix.tsx` | Filter grup, export Excel, mode comparison 2 role side-by-side, indikator inherited (teal), AlertDialog konfirmasi bulk reset |
| Mei 2026 | **Role Editor v2** | `AdminRoleManagement.tsx` | Salin dari role lain, badge jumlah user per role, progress bar, bulk enable/disable dengan AlertDialog |
| Mei 2026 | **Permission Audit Log Real-time** | `PermissionAuditLog.tsx` | Timeline visual, auto-refresh 30 detik, stat cards, filter (scope/aksi/role/tanggal/search), diff highlight, expand metadata, export CSV |
| Mei 2026 | **Agent Dashboard Enhanced** | `AgentDashboard.tsx` | Charts (AreaChart tren komisi, PieChart status booking), 8 stat cards, top paket, jaringan sub-agent, progress bar konversi & koleksi, 6 quick actions |

---

## 1. MODUL ADMIN

### 1.1 Dashboard & Analitik

| Fitur | Status | Catatan |
|-------|--------|---------|
| Dashboard Utama Admin | ✅ | Filter hierarki (pusat/cabang/agen), grafik, alert, stat periodis |
| Dashboard Branch Manager | ✅ | Stat + quick actions khusus cabang |
| Dashboard Sales | ✅ | Pipeline lead + target penjualan |
| Dashboard Keuangan | ✅ | Stat keuangan real-time |
| Dashboard Marketing | ✅ | Lead + kampanye + konversi |
| Dashboard Perlengkapan | ✅ | Stok + status kesiapan |
| Grafik Dashboard (recharts) | ✅ | Booking, revenue, jamaah per bulan |
| Analytics Lengkap | ✅ | AreaChart, PieChart, BarChart, export Excel/PDF, filter date range |
| Analytics Lead & Konversi | ✅ | Funnel, sumber lead, win rate |
| Laporan Standar | ✅ | Export Excel + PDF |
| Laporan Lanjutan | ✅ | Multi-dimensi |
| Laporan Terjadwal | ✅ | Dijadwalkan otomatis |
| KPI Progress Bar Real-time | 💡 | Belum ada target vs aktual dengan progress visual |
| Ringkasan AI Otomatis | 💡 | Belum ada — narasi performa bulan ini |

### 1.2 Manajemen Booking

| Fitur | Status | Catatan |
|-------|--------|---------|
| Daftar Booking | ✅ | Filter status/paket/cabang/tanggal, paginasi, bulk action |
| Detail Booking | ✅ | Edit status, timeline, dokumen, WhatsApp notif |
| Buat Booking Baru (Wizard) | ✅ | Multi-step wizard |
| Export Booking Excel/PDF | ✅ | Dynamic export dengan styling |
| Bulk Konfirmasi / Pembatalan | ✅ | Dengan AlertDialog |
| Notifikasi WhatsApp Otomatis | ✅ | Saat status booking berubah |

### 1.3 Manajemen Paket

| Fitur | Status | Catatan |
|-------|--------|---------|
| Daftar Paket (Enhanced) | ✅ | Filter, bulk on/off, analytics per paket, export |
| Detail Paket | ✅ | Galeri, departur terkait, statistik |
| Form Paket Regular | ✅ | Form lengkap dengan validasi |
| Form Paket Tabungan | ✅ | Khusus tabungan haji/umroh |
| Tipe Paket | ✅ | CRUD tipe paket |
| Template Itinerary | ✅ | Builder itinerary |
| Perbandingan Paket (Customer) | 💡 | Belum ada — compare 2-3 paket side-by-side |

### 1.4 Manajemen Keberangkatan

| Fitur | Status | Catatan |
|-------|--------|---------|
| Daftar Keberangkatan | ✅ | Filter, status, kapasitas |
| Detail Keberangkatan | ✅ | Manifest, kamar, dokumen, timeline — sangat lengkap |
| Tracking Keberangkatan | ✅ | Update posisi grup secara manual |
| Rooming List | ✅ | Versi standar + improved |
| Penugasan Kamar | ✅ | Assign jamaah ke kamar |
| Manifest Penerbangan | ✅ | Print-ready |
| Manajemen Bus | ✅ | Penugasan bus + seat |
| Timeline Perjalanan | ✅ | Hari per hari |
| Readiness Check | ✅ | Cek kesiapan sebelum berangkat |
| QR Code Check-in | ✅ | Generate & scan |
| Check-in Digital | ✅ | Proses check-in jamaah |

### 1.5 Keuangan & Pembayaran

| Fitur | Status | Catatan |
|-------|--------|---------|
| Verifikasi Pembayaran | ✅ | Approve/reject bukti transfer, WhatsApp notif |
| Tambah Pembayaran Manual | ✅ | Dialog form admin |
| Laporan P&L | ✅ | Laba rugi per periode |
| Kas & Bank | ✅ | Arus kas, rekonsiliasi |
| Hutang (AP) | ✅ | Manajemen hutang vendor |
| Piutang (AR) | ✅ | Manajemen piutang customer |
| Payroll Karyawan | ✅ | Gaji + tunjangan |
| Tabungan Haji/Umroh | ✅ | Plan + monitoring cicilan |
| Laporan Komisi Agen | ✅ | Per agen, export |
| Komisi Cabang | ✅ | Perhitungan otomatis |
| Program Referral | ✅ | Tracking referral + reward |
| Voucher / Kupon Diskon | ✅ | Create, apply, monitor |
| Dashboard Keuangan Terpadu | 💡 | Belum ada — arus kas, proyeksi, perbandingan bulan |

### 1.6 CRM & Lead Management

| Fitur | Status | Catatan |
|-------|--------|---------|
| Daftar Lead (Kanban + List) | ✅ | 5 kolom Kanban: Baru → Dihubungi → Follow Up → Negosiasi → Closing |
| Detail Lead | ✅ | Riwayat aktivitas, ubah status, assign paket |
| Analytics Lead | ✅ | Funnel, sumber, win rate, nilai pipeline |
| Tambah Lead Cepat | ✅ | Dialog form inline |
| Drag-and-Drop Kanban | 🔧 | Kolom ada, tapi drag card antar kolom belum berfungsi |
| Follow-up Reminder | ✅ | Banner collapsible di AdminLeads + halaman /admin/follow-up dengan KPI & urgency tiers |
| Lead Scoring Otomatis | 💡 | Belum ada — prioritas lead berdasarkan engagement |

### 1.7 Jamaah & Dokumen

| Fitur | Status | Catatan |
|-------|--------|---------|
| Detail Pelanggan Lengkap | ✅ | Riwayat booking, pembayaran, dokumen |
| Daftar Pelanggan | ✅ | Filter + export |
| Generator Dokumen (PDF) | ✅ | Template visa, paspor, dll |
| Tipe Dokumen | ✅ | CRUD kategori dokumen |
| Verifikasi Dokumen | ✅ | Approve/reject per jamaah |
| Manajemen Visa | ✅ | Status proses visa |
| Manajemen Haji | ✅ | Khusus paket haji |
| Manasik Online | ✅ | Materi manasik digital |
| Perlengkapan Jamaah | ✅ | Koper, seragam, perlengkapan lainnya |
| Stock Opname | ✅ | Cek stok perlengkapan |
| SOS Alert | ✅ | Alert darurat jamaah |

### 1.8 SDM (HR)

| Fitur | Status | Catatan |
|-------|--------|---------|
| Manajemen HR Lengkap | ✅ | File terbesar (1763 baris) — rekrutmen, kontrak, performance |
| Absensi Karyawan | ✅ | Clock-in/out, laporan kehadiran |
| Aset Kantor | ✅ | Inventaris aset |

### 1.9 Agen & Mitra

| Fitur | Status | Catatan |
|-------|--------|---------|
| Daftar Agen | ✅ | Filter, komisi rate, sub-agen, status |
| Daftar Cabang | ✅ | Hierarki cabang |
| Vendor & Hotel | ✅ | Mitra akomodasi |
| Maskapai & Bandara | ✅ | Master data penerbangan |
| Muthawif | ✅ | Pembimbing ibadah |
| Bus Provider | ✅ | Mitra transportasi |
| Leaderboard Agen | 💡 | Belum ada — ranking + badge prestasi |

### 1.10 Pengaturan & Keamanan

| Fitur | Status | Catatan |
|-------|--------|---------|
| Pengaturan Umum | ✅ | Info perusahaan, notifikasi, dll |
| Manajemen Pengguna | ✅ | CRUD user, assign role |
| **Role Management Visual Matrix** | ✅ | **Dikerjakan sesi ini** |
| **Permission Audit Log Real-time** | ✅ | **Dikerjakan sesi ini** |
| Two-Factor Authentication (2FA) | ✅ | TOTP-based |
| Security Audit Log | ✅ | Login events, IP, perangkat |
| Koneksi API Publik | ✅ | Generate & revoke API key |
| Pengaturan Branding / Tampilan | ✅ | Logo, warna, font |
| Template Email | ✅ | Editor template |
| WhatsApp Integration | ✅ | Template + kirim massal |
| Push Notification | ✅ | Web push |
| Pengumuman Internal | ✅ | Broadcast ke semua user |
| Banner Promosi | ✅ | Jadwal tampil di website |

### 1.11 Loyalty, Membership & Tabungan

| Fitur | Status | Catatan |
|-------|--------|---------|
| Program Loyalitas | ✅ | Poin, tier, reward |
| Membership Tier | ✅ | Bronze/Silver/Gold |
| Tabungan Haji Syariah | ✅ | Cicilan + proyeksi keberangkatan |
| Kalkulator Tabungan Interaktif | 💡 | Belum ada di sisi customer |

### 1.12 Landing Page & Website

| Fitur | Status | Catatan |
|-------|--------|---------|
| Landing Page Builder | ✅ | Drag section, preview, publish |
| Halaman Statis | ✅ | About, Team, Contact |
| Materi Marketing | ✅ | Brosur digital, download |
| Website Cabang | ✅ | Subdomain/slug per cabang |
| Website Agen | ✅ | Subdomain/slug per agen |
| Korespondensı Hub | ✅ | Pusat pesan & surat |
| Blog / Artikel Edukasi | 💡 | Belum ada — panduan Umroh/Haji, SEO |
| Kalkulator Biaya Umroh | 💡 | Belum ada — estimasi biaya interaktif |

---

## 2. MODUL AGEN

| Fitur | Status | Catatan |
|-------|--------|---------|
| **Dashboard Agen** | ✅ | **Dikerjakan sesi ini** — chart, 8 stat, distribusi booking, top paket, sub-agent network, quick actions |
| Daftar Jamaah Saya | ✅ | Filter, detail per jamaah |
| Daftarkan Jamaah Baru | ✅ | Form lengkap |
| Daftarkan Rombongan | ✅ | Bulk register |
| Komisi Saya | ✅ | Riwayat, status, export Excel/PDF |
| Wallet Agen | ✅ | Saldo, riwayat transaksi |
| Jaringan Sub-Agen | ✅ | Struktur hierarki |
| Katalog Paket | ✅ | Lihat paket aktif |
| Digital Kit | ✅ | Brosur, banner, materi marketing |
| Membership Agen | ✅ | Tier + benefit |
| Referral Saya | ✅ | Tracking link referral |
| Pengaturan Website Agen | ✅ | Subdomain, tampilan |
| Pengaturan Profil | ✅ | Data perusahaan, rekening |
| Leaderboard / Peringkat Agen | 💡 | Belum ada — ranking sesama agen |
| Target Bulanan & Progress | 💡 | Belum ada — set target, pantau progress |
| Notifikasi Bell Icon | 🔧 | Hook ada, belum ada tampilan di layout |

---

## 3. MODUL CUSTOMER

| Fitur | Status | Catatan |
|-------|--------|---------|
| Dashboard Customer | ✅ | Status booking, pembayaran, poin loyalitas |
| Daftar Booking Saya | ✅ | Status, tanggal, paket |
| Detail Booking | ✅ | Timeline, dokumen, pembayaran |
| Upload Bukti Pembayaran | ✅ | Dengan preview gambar |
| Tabungan Saya | ✅ | Progress cicilan, riwayat |
| Loyalty Points | ✅ | Poin, histori, redeem |
| Tiket Support | ✅ | Buat & pantau tiket |
| Pengaturan Profil | ✅ | Form profil + mahram + ganti password |
| Countdown Keberangkatan | 💡 | Belum ada — timer visual di dashboard customer |
| Perbandingan Paket | 💡 | Belum ada — bandingkan 2-3 paket side-by-side |
| Kalkulator Cicilan | 💡 | Belum ada — simulasi tabungan interaktif |
| Notifikasi In-App | 🔧 | Hook ada, tampilan perlu diperkuat |

---

## 4. MODUL JAMAAH (Saat Perjalanan)

| Fitur | Status | Catatan |
|-------|--------|---------|
| Digital ID Jamaah | ✅ | QR code, data lengkap, print |
| Dokumen Digital | ✅ | Upload, lihat, download |
| Itinerary Perjalanan | ✅ | Jadwal hari per hari |
| Tracker Status Visa | ✅ | Update real-time |
| Riwayat Pembayaran | ✅ | Detail transaksi |
| Feedback & Rating | ✅ | Bintang + komentar |
| Doa & Panduan Ibadah | ✅ | Panduan digital |
| Notifikasi Jamaah | ✅ | Push + in-app |
| Portal Hub Jamaah | ✅ | Navigasi semua fitur jamaah |
| Panduan Ibadah Offline | 💡 | Belum ada — akses tanpa internet di Saudi |
| Peta Lokasi Ibadah | 💡 | Belum ada — Masjidil Haram, Mina, Arafah |
| Live Chat Pembimbing | 💡 | Belum ada |

---

## 5. MODUL OPERASIONAL

| Fitur | Status | Catatan |
|-------|--------|---------|
| Dashboard Operasional | ✅ | Overview semua departur berjalan |
| Rooming List | ✅ | Assign kamar per jamaah |
| Manajemen Bus | ✅ | Seat assignment |
| Timeline Perjalanan | ✅ | Jadwal operasional |
| Manajemen Perlengkapan | ✅ | Distribusi koper, seragam |
| Manajemen Bagasi | ✅ | Tracking bagasi |
| Manifest Penerbangan | ✅ | Print-ready |
| QR Code Sistem | ✅ | Generate batch |
| Check-in Digital | ✅ | Scan QR jamaah |
| Readiness Check | ✅ | Cek kesiapan departur |
| Aset Kantor | ✅ | Inventaris kantor |
| Dokumen Operasional | ✅ | Via AdminDocumentGenerator |

---

## 6. PORTAL PUBLIK

| Fitur | Status | Catatan |
|-------|--------|---------|
| Landing Page Dinamis | ✅ | Section-based, SEO meta title/description |
| Katalog Paket | ✅ | Filter tipe, harga, ketersediaan |
| Detail Paket | ✅ | Galeri, fasilitas, form booking |
| Halaman Keberangkatan | ✅ | Jadwal departur mendatang |
| Cek Status Booking | ✅ | Tanpa login, pakai kode booking |
| Halaman About, Tim, Kontak | ✅ | Konten statis |
| Website Cabang / Agen | ✅ | Multi-tenant by slug |
| Flow Booking Online | ✅ | Wizard multi-step |
| Testimonial | 🔧 | Ada di landing builder, belum stand-alone |
| Blog / Artikel | 💡 | Belum ada |
| Kalkulator Biaya | 💡 | Belum ada |
| Live Chat / WhatsApp Button | 🔧 | Ada di landing builder, belum global |

---

## 7. API PUBLIK & BACKEND

| Fitur | Status | Catatan |
|-------|--------|---------|
| GET /api/v1/packages | ✅ | List paket dengan filter |
| GET /api/v1/departures | ✅ | List keberangkatan |
| POST /api/v1/leads | ✅ | Submit lead dari website |
| API Key Authentication | ✅ | Supabase-based, graceful bypass di dev |
| Rate Limiting | 💡 | Belum ada |
| Webhook Outgoing | 💡 | Belum ada — notifikasi ke ERP/akuntansi eksternal |

---

## 8. INFRASTRUKTUR & TEKNIS

| Fitur | Status | Catatan |
|-------|--------|---------|
| Monorepo pnpm workspaces | ✅ | umrah-haji + api-server + api-spec |
| OpenAPI Spec + Codegen (Orval) | ✅ | Type-safe hooks dari spesifikasi |
| React 19 + Vite 7 + Tailwind v3 | ✅ | Stack stabil |
| Supabase Auth + Database | ✅ | Dengan demo mode graceful |
| RBAC Granular | ✅ | Visual matrix + audit log |
| Real-time Subscription | ✅ | Hook siap pakai |
| PWA / Service Worker | ✅ | SW terdaftar |
| Dark Mode | ✅ | Toggle global |
| Multi-tenant | ✅ | Branch/Agent subdomain |
| Export Excel (xlsx) | ✅ | Di 15+ halaman |
| Export PDF (jsPDF + autoTable) | ✅ | Di 10+ halaman |
| Error Boundary | ✅ | Global error handler |
| E2E Testing | 💡 | Belum ada coverage |
| CI/CD Pipeline | 💡 | Belum ada |

---

## 9. FITUR TERBAIK YANG DIREKOMENDASIKAN 💡

Diurutkan dari **dampak tertinggi** untuk bisnis:

### 🔴 Prioritas Tinggi

| # | Fitur | Nilai Bisnis | Estimasi |
|---|-------|-------------|---------|
| 1 | **Drag-and-Drop Kanban Lead** | Sales tim lebih produktif, tidak perlu klik dropdown | Sedang |
| 2 | **Leaderboard Agen** | Gamifikasi — ranking, badge, hadiah — motivasi agen | Kecil |
| 3 | **Notifikasi Bell Icon Global** | UX kritis — admin/agen tahu ada booking baru, pembayaran masuk | Sedang |
| 4 | **Kalkulator Biaya Umroh** | Di landing page — estimasi cepat → konversi lead naik | Kecil |
| 5 | **Target Bulanan Agen** | Set target booking/komisi, progress bar — gamifikasi agen | Kecil |

### 🟡 Prioritas Menengah

| # | Fitur | Nilai Bisnis | Estimasi |
|---|-------|-------------|---------|
| 6 | **MyBookings Customer (Enhanced)** | Timeline visual, countdown keberangkatan, upload dokumen per booking | Sedang |
| 7 | **Perbandingan Paket** | Bantu customer memutuskan — tabel fitur side-by-side | Kecil |
| 8 | **Follow-up Lead Reminder** | Alert di dashboard jika ada follow-up jatuh tempo | Kecil |
| 9 | **Dashboard KPI Real-time** | Target vs aktual dengan progress bar animasi | Sedang |
| 10 | **Kalkulator Cicilan Tabungan** | Simulasi: target keberangkatan → cicilan bulanan | Kecil |
| 11 | **Blog / Artikel Edukasi** | Konten SEO — trafik organik dari Google | Besar |

### 🟢 Prioritas Tambahan

| # | Fitur | Nilai Bisnis | Estimasi |
|---|-------|-------------|---------|
| 12 | **Panduan Ibadah Offline (PWA)** | Jamaah di Saudi bisa akses tanpa internet | Besar |
| 13 | **Multi-bahasa (i18n)** | Indonesia + Arab + Inggris | Besar |
| 14 | **WhatsApp Bot Otomatis** | Auto-reply berdasarkan keyword/status | Besar |
| 15 | **Peta Lokasi Ibadah** | Google Maps — Masjidil Haram, Mina, Arafah | Sedang |
| 16 | **Rate Limiting API** | Keamanan endpoint publik | Kecil |
| 17 | **Webhook Outgoing** | Integrasi ERP/akuntansi eksternal | Sedang |
| 18 | **E2E Test Suite** | Playwright — alur booking, pembayaran, login | Besar |
| 19 | **Lead Scoring Otomatis** | Prioritas lead berdasarkan engagement & profil | Besar |
| 20 | **Countdown Keberangkatan** | Widget visual di dashboard customer | Kecil |

---

## 10. STATISTIK PROYEK

| Metrik | Jumlah |
|--------|--------|
| Total file halaman | 130+ |
| Halaman Admin | 83 |
| Halaman Agen | 14 |
| Halaman Customer | 8 |
| Halaman Jamaah | 9 |
| Halaman Operasional | 14 |
| Halaman Publik | 10 |
| Total baris kode (halaman) | ~72.000 baris |
| React hooks/queries | 51 |
| Komponen UI & shared | 43+ |
| API endpoints publik | 4 |

---

*Dokumen dihasilkan dari analisis menyeluruh seluruh codebase Vinstour Travel — Mei 2026.*
