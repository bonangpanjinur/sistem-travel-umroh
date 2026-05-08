# Rencana Pengembangan — Vinstour Travel Portal
> Diperbarui: Mei 2026 | Stack: React 19 + Vite 7 + TypeScript + Supabase + Express

---

## Legenda

| Simbol | Artinya |
|--------|---------|
| ✅ | Selesai & siap pakai |
| 🔧 | Ada tapi perlu perbaikan |
| 🔴 | Belum dibangun sama sekali |

---

## 1. SUDAH SELESAI ✅

### Infrastruktur
| Item | Catatan |
|------|---------|
| pnpm monorepo (umrah-haji + api-server + api-spec) | Port 5000 (web), 8080 (API) |
| React 19 + Vite 7 + TypeScript + Tailwind v3 | 0 error TS |
| Supabase Auth + Database (demo mode graceful) | Perlu set secrets untuk produksi |
| RBAC granular — Visual Permission Matrix + Audit Log | SuperAdmin, Admin, Keuangan, Marketing, Operasional, Agen |
| PWA / Service Worker | SW terdaftar |
| Dark Mode global | Toggle tersedia |
| Multi-tenant (branch/agent subdomain) | Slug per cabang & agen |
| Export Excel (xlsx) | 15+ halaman |
| Export PDF (jsPDF + autoTable) | 10+ halaman |
| OpenAPI Spec + Codegen (Orval) | Type-safe hooks |
| Error Boundary global | Handler terpasang |

### Modul Admin (83 halaman)
| Modul | Fitur |
|-------|-------|
| Dashboard | Multi-role, grafik, stat periodik, 6 dashboard khusus (Branch, Finance, Sales, Marketing, Equipment, Agent) |
| Booking | Wizard multi-step, detail, bulk aksi, export, WhatsApp notif |
| Paket | CRUD + tipe + galeri + itinerary template |
| Keberangkatan | Detail lengkap, rooming, manifest, tracking, QR check-in, readiness check |
| Keuangan | P&L, Kas, AR, AP, Payroll, Tabungan, Komisi Agen & Cabang, Referral, Voucher |
| CRM & Lead | Kanban 5 kolom, detail, analytics, follow-up reminder dengan urgency tiers |
| Jamaah & Dokumen | Detail pelanggan, verifikasi dokumen, visa, manasik, haji, perlengkapan, stock opname, SOS |
| SDM / HR | Rekrutmen, kontrak, performance, absensi, aset kantor |
| Agen & Mitra | Agen, cabang, vendor, hotel, maskapai, bandara, muthawif, bus |
| Keamanan | Role management visual matrix, permission audit log real-time, 2FA, API key |
| Marketing | Landing page builder, banner, WhatsApp blast, materi, korespondensi hub |
| Laporan | Standar, lanjutan, terjadwal, analytics multi-dimensi |

### Modul Agen (14 halaman)
| Fitur | Catatan |
|-------|---------|
| Dashboard Agen | Chart komisi & booking, 8 stat, sub-agent network, quick actions |
| Jamaah, Komisi, Wallet, Referral | Lengkap |
| Leaderboard Agen | Ranking + badge prestasi |
| Target Bulanan & Progress | Set target, pantau progress bar |
| Digital Kit, Katalog Paket, Website Settings | Tersedia |

### Modul Customer (8 halaman)
| Fitur | Catatan |
|-------|---------|
| Dashboard Customer | Booking, pembayaran, loyalty, 6 quick actions |
| My Bookings, Detail Booking, Upload Pembayaran | Lengkap |
| Tabungan, Loyalty, Support, Profil | Tersedia |
| Perbandingan Paket | Side-by-side 2–3 paket |
| Kalkulator Cicilan | Simulasi tabungan interaktif |
| Countdown Keberangkatan | Timer visual dengan live detik |

### Modul Jamaah — Saat Perjalanan (9 halaman)
| Fitur | Catatan |
|-------|---------|
| Digital ID (QR), Dokumen, Itinerary, Visa Tracker | Tersedia |
| Riwayat Pembayaran, Feedback, Doa & Panduan | Tersedia |
| Portal Hub Jamaah, Notifikasi | Tersedia |
| SOS Alert | Log ke DB + monitor real-time admin |

### Portal Publik & API
| Fitur | Catatan |
|-------|---------|
| Landing Page Dinamis, Katalog Paket, Detail Paket | Tersedia |
| Cek Status Booking, Keberangkatan, About/Kontak | Tersedia |
| Website Agen & Cabang (slug) | Multi-tenant |
| Flow Booking Online | Wizard multi-step |
| API: GET packages, GET departures, POST leads | API key auth |

### Kalkulator & Tools Publik
| Fitur | URL |
|-------|-----|
| Kalkulator Biaya Umroh | /kalkulator |
| Kalkulator Cicilan Tabungan | /kalkulator-cicilan |
| Perbandingan Paket | /packages/compare |

---

## 2. PERLU PERBAIKAN 🔧

| Item | Masalah | Prioritas |
|------|---------|-----------|
| Drag-and-Drop Kanban Lead | Kolom ada, tapi drag kartu antar kolom tidak berfungsi | Tinggi |
| Notifikasi Bell Icon (Agen) | Hook `useAdminNotifications` ada, tapi UI bell di layout agen belum dipasang | Menengah |
| Notifikasi In-App (Customer) | Hook ada, tampilan perlu diperkuat | Menengah |
| Live Chat / WhatsApp Button | Ada di landing builder, belum tersedia secara global di semua halaman publik | Rendah |
| Testimonial Halaman | Ada di landing builder, belum ada halaman stand-alone | Rendah |

---

## 3. BELUM DIBANGUN 🔴

Diurutkan dari **dampak bisnis tertinggi**:

### Prioritas Tinggi
| # | Fitur | Nilai Bisnis |
|---|-------|-------------|
| 1 | **Lead Scoring Otomatis** | Prioritas lead berdasarkan sumber, responsivitas, nilai paket — tampil sebagai skor di Kanban & tabel |
| 2 | **Notifikasi Bell Icon Global (Admin)** | Admin tahu booking baru, pembayaran masuk, follow-up jatuh tempo secara real-time |
| 3 | **KPI Dashboard Real-time** | Target vs aktual dengan progress bar animasi — semua modul (booking, komisi, lead) |

### Prioritas Menengah
| # | Fitur | Nilai Bisnis |
|---|-------|-------------|
| 4 | **Blog / Artikel Edukasi** | Konten SEO — trafik organik dari Google untuk keyword Umroh & Haji |
| 5 | **Dashboard Keuangan Terpadu** | Arus kas, proyeksi, perbandingan bulan dalam satu layar |
| 6 | **Ringkasan AI Otomatis** | Narasi performa bulan ini untuk admin — insight tanpa buka laporan |
| 7 | **Panduan Ibadah Offline (PWA)** | Jamaah di Saudi bisa akses itinerary & doa tanpa internet |

### Prioritas Tambahan
| # | Fitur | Nilai Bisnis |
|---|-------|-------------|
| 8 | **Peta Lokasi Ibadah** | Maps interaktif — Masjidil Haram, Mina, Arafah, hotel |
| 9 | **Multi-bahasa (i18n)** | Indonesia + Arab + Inggris |
| 10 | **WhatsApp Bot Otomatis** | Auto-reply berdasarkan keyword / status booking |
| 11 | **Live Chat Pembimbing** | Chat real-time jamaah ↔ muthawif/pembimbing saat di Saudi |
| 12 | **Rate Limiting API** | Keamanan endpoint publik dari spam/abuse |
| 13 | **Webhook Outgoing** | Integrasi ke ERP / sistem akuntansi eksternal |
| 14 | **E2E Test Suite (Playwright)** | Coverage alur booking, pembayaran, login |
| 15 | **CI/CD Pipeline** | Deploy otomatis saat merge ke main |

---

## 4. KEBUTUHAN TEKNIS (Sebelum Produksi)

| Item | Cara |
|------|------|
| Supabase URL & Key | Set `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` di Replit → Secrets |
| SQL Migrations | Jalankan file di `src/lib/migrations/` di Supabase SQL Editor sesuai urutan fase |
| Service Role Key (API server) | Set `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` di Replit → Secrets |

---

## 5. STATISTIK PROYEK

| Metrik | Jumlah |
|--------|--------|
| Total halaman | 130+ |
| Halaman Admin | 83 |
| Halaman Agen | 14 |
| Halaman Customer | 8 |
| Halaman Jamaah | 9 |
| Halaman Operasional | 14 |
| Halaman Publik | 10 |
| React hooks/queries | 51 |
| Komponen UI & shared | 43+ |
| API endpoints publik | 4 |
| Total baris kode (estimasi) | ~75.000 baris |
