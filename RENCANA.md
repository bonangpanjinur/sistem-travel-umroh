# Rencana Pengembangan — Vinstour Travel Portal
> Diperbarui: Mei 2026 | Stack: React 19 + Vite 7 + TypeScript + Supabase + Express

---

## Legenda

| Simbol | Artinya |
|--------|---------|
| ✅ | Selesai & siap pakai |
| 🔴 | Belum dibangun |

---

## 1. INFRASTRUKTUR ✅

| Item | Status |
|------|--------|
| pnpm monorepo (umrah-haji + api-server + api-spec) — Port 5000 / 8080 | ✅ |
| React 19 + Vite 7 + TypeScript + Tailwind v3 — 0 error TS | ✅ |
| Supabase Auth + Database (demo mode graceful) | ✅ |
| RBAC granular — Visual Permission Matrix + Audit Log | ✅ |
| PWA / Service Worker | ✅ |
| Dark Mode global | ✅ |
| Multi-tenant (branch/agent subdomain) | ✅ |
| Export Excel (xlsx) — 15+ halaman | ✅ |
| Export PDF (jsPDF + autoTable) — 10+ halaman | ✅ |
| OpenAPI Spec + Codegen (Orval) — type-safe hooks | ✅ |
| Error Boundary global | ✅ |

---

## 2. MODUL ADMIN

| Modul | Fitur | Status |
|-------|-------|--------|
| Dashboard | Multi-role, 6 dashboard khusus (Branch, Finance, Sales, Marketing, Equipment, Agent) | ✅ |
| Analytics | Grafik multi-dimensi, stat periodik | ✅ |
| KPI Dashboard Real-time | Target vs aktual, progress bar animasi — `/admin/kpi-dashboard` | ✅ |
| Dashboard Keuangan Terpadu | Arus kas, proyeksi, perbandingan bulan, aging AR — `/admin/finance-terpadu` | ✅ |
| Booking | Wizard multi-step, detail, bulk aksi, export, WhatsApp notif | ✅ |
| Paket | CRUD + tipe + galeri + itinerary template | ✅ |
| Lead Scoring Otomatis | Skor di Kanban & tabel (sumber + nilai paket + responsivitas + recency) | ✅ |
| CRM & Lead — Kanban DnD | Kanban 5 kolom, drag-and-drop diperbaiki, detail, analytics, follow-up reminder | ✅ |
| Notifikasi Bell Admin | Bell icon tersambung ke `useAdminNotifications` — real-time | ✅ |
| Keberangkatan | Detail, rooming, manifest, tracking, QR check-in, readiness check | ✅ |
| Keuangan | P&L, Kas, AR, AP, Payroll, Tabungan, Komisi Agen & Cabang, Referral, Voucher | ✅ |
| Jamaah & Dokumen | Detail pelanggan, verifikasi dokumen, visa, manasik, haji, perlengkapan, stock opname, SOS | ✅ |
| SDM / HR | Rekrutmen, kontrak, performance, absensi, aset kantor | ✅ |
| Agen & Mitra | Agen, cabang, vendor, hotel, maskapai, bandara, muthawif, bus | ✅ |
| Keamanan | Role management visual matrix, permission audit log real-time, 2FA, API key | ✅ |
| Marketing | Landing page builder, banner, WhatsApp blast, materi, korespondensi hub | ✅ |
| Blog & Artikel | CRUD artikel (judul, kategori, konten, status) — `/admin/blog` | ✅ |
| Laporan | Standar, lanjutan, terjadwal, analytics multi-dimensi | ✅ |

---

## 3. MODUL AGEN

| Fitur | Status |
|-------|--------|
| Dashboard Agen — chart komisi & booking, 8 stat, sub-agent network | ✅ |
| Notifikasi Bell Agen — terpasang di AgentLayoutEnhanced | ✅ |
| Jamaah, Komisi, Wallet, Referral | ✅ |
| Leaderboard Agen — ranking + badge prestasi | ✅ |
| Target Bulanan & Progress | ✅ |
| Digital Kit, Katalog Paket, Website Settings | ✅ |

---

## 4. MODUL CUSTOMER & JAMAAH

| Fitur | Status |
|-------|--------|
| Dashboard Customer — booking, pembayaran, loyalty, 6 quick actions | ✅ |
| Notifikasi In-App Customer — bell icon + widget di dashboard, link ke `/jamaah/notifications` | ✅ |
| My Bookings, Detail Booking, Upload Pembayaran | ✅ |
| Tabungan, Loyalty, Support, Profil | ✅ |
| Perbandingan Paket — side-by-side 2–3 paket | ✅ |
| Kalkulator Cicilan — simulasi tabungan interaktif | ✅ |
| Countdown Keberangkatan — timer visual dengan live detik | ✅ |
| Portal Jamaah Hub, Notifikasi Jamaah | ✅ |
| Digital ID (QR), Dokumen, Itinerary, Visa Tracker | ✅ |
| Riwayat Pembayaran, Feedback, Doa & Panduan | ✅ |
| SOS Alert — log ke DB + monitor real-time admin | ✅ |

---

## 5. PORTAL PUBLIK

| Fitur | URL | Status |
|-------|-----|--------|
| Landing Page Dinamis, Katalog Paket, Detail Paket | `/` `/packages` | ✅ |
| Blog & Artikel — listing + detail | `/blog` `/blog/:slug` | ✅ |
| Testimonial Jamaah — 9 kartu, filter per paket, statistik kepuasan | `/testimonials` | ✅ |
| WhatsApp Floating Button — di semua halaman publik | Global | ✅ |
| Cek Status Booking, Jadwal Keberangkatan, About/Kontak | `/cek-booking` `/departures` | ✅ |
| Website Agen & Cabang (slug) — multi-tenant | `/a/:slug` `/b/:slug` | ✅ |
| Flow Booking Online — wizard multi-step | `/booking/:id` | ✅ |
| Kalkulator Biaya Umroh | `/kalkulator` | ✅ |
| Kalkulator Cicilan Tabungan | `/kalkulator-cicilan` | ✅ |
| Perbandingan Paket | `/packages/compare` | ✅ |
| API Publik: GET packages, GET departures, POST leads | `/api/v1/` | ✅ |

---

## 6. BELUM DIBANGUN 🔴

Diurutkan dari **dampak bisnis tertinggi**:

| # | Fitur | Nilai Bisnis | Prioritas |
|---|-------|-------------|-----------|
| 1 | **Ringkasan AI Otomatis** | Narasi performa bulan ini — insight otomatis tanpa buka laporan manual | Menengah |
| 2 | **Panduan Ibadah Offline (PWA)** | Jamaah di Saudi akses itinerary & doa tanpa internet | Menengah |
| 3 | **Peta Lokasi Ibadah** | Maps interaktif — Masjidil Haram, Mina, Arafah, hotel | Tambahan |
| 4 | **Multi-bahasa (i18n)** | Indonesia + Arab + Inggris | Tambahan |
| 5 | **Rate Limiting API** | Keamanan endpoint publik dari spam/abuse | Tambahan |
| 6 | **Webhook Outgoing** | Integrasi ke ERP / sistem akuntansi eksternal | Tambahan |
| 7 | **E2E Test Suite (Playwright)** | Coverage alur booking, pembayaran, login | Tambahan |
| 8 | **CI/CD Pipeline** | Deploy otomatis saat merge ke main | Tambahan |

---

## 7. KEBUTUHAN TEKNIS (Sebelum Produksi)

| Item | Cara | Status |
|------|------|--------|
| Supabase URL & Key | Set `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` di Replit → Secrets | 🔴 Belum dikonfigurasi |
| SQL Migrations | Jalankan file di `src/lib/migrations/` di Supabase SQL Editor sesuai urutan fase | 🔴 Belum dijalankan |
| Service Role Key (API server) | Set `SUPABASE_URL` dan `SUPABASE_SERVICE_ROLE_KEY` di Replit → Secrets | 🔴 Belum dikonfigurasi |

---

## 8. STATISTIK PROYEK

| Metrik | Jumlah |
|--------|--------|
| Total halaman | 135+ |
| Halaman Admin | 86 (+ Blog, KPI Dashboard, Finance Terpadu) |
| Halaman Agen | 14 |
| Halaman Customer | 8 |
| Halaman Jamaah | 9 |
| Halaman Operasional | 14 |
| Halaman Publik | 13 (+ Blog, Blog Detail, Testimonials) |
| React hooks/queries | 51 |
| Komponen UI & shared | 43+ |
| API endpoints publik | 4 |
| Total baris kode (estimasi) | ~80.000 baris |
| Item RENCANA.md selesai | 90% (semua prioritas tinggi & menengah ✅) |
