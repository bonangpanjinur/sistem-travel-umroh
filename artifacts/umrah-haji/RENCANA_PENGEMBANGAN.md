# RENCANA PENGEMBANGAN LENGKAP
# Vinstour Travel — Umroh & Haji Management Portal

> Dokumen ini mencakup seluruh visi produk, arsitektur, dan roadmap pembangunan fitur
> dari sistem yang sudah ada hingga platform lengkap multi-portal.

---

## VISI PRODUK

Membangun ekosistem digital Umroh & Haji yang menyatukan:
- **Portal Admin** — pusat kendali seluruh operasional travel
- **Portal Agen** — dashboard agen dengan website publik milik sendiri
- **Portal Cabang** — dashboard cabang dengan website publik dan manajemen agen lokal
- **Portal Jamaah** — akun jamaah untuk tracking booking, dokumen, dan itinerary
- **Website Publik Agen/Cabang** — landing page dinamis yang bisa dikunjungi siapa saja,
  setiap booking yang masuk otomatis tercatat atas nama agen/cabang tersebut

---

## ARSITEKTUR SISTEM

```
┌─────────────────────────────────────────────────────────────────┐
│                        SUPABASE (Database + Auth)               │
│  auth.users · bookings · agents · branches · jamaah · packages  │
└────────────┬────────────────────────────────────────────────────┘
             │
    ┌────────┴──────────────────────────────────────────────┐
    │                  REACT FRONTEND (SPA)                 │
    │                                                       │
    │  /admin/*          → Portal Admin (semua role staff)  │
    │  /agent/*          → Portal Agen (role: agent)        │
    │  /branch/*         → Portal Cabang (role: branch_mgr) │
    │  /jamaah/*         → Portal Jamaah (role: customer)   │
    │  /a/{slug}         → Website Publik Agen              │
    │  /c/{slug}         → Website Publik Cabang            │
    │  /pesan/{slug}/*   → Flow Pemesanan via Agen/Cabang   │
    └───────────────────────────────────────────────────────┘
```

### Konsep Atribusi PIC Otomatis

Ketika jamaah membuka `vinstour.com/a/pak-budi` lalu memesan paket:
1. Slug agen tersimpan di `localStorage` + URL params
2. Saat jamaah daftar/login → akun customer dibuat dengan `referred_by_agent_id = pak-budi`
3. Saat booking dibuat → `agent_id` dan `branch_id` otomatis terisi dari agen tersebut
4. Komisi agen & cabang dihitung otomatis
5. Agen dan branch manager bisa melihat performa ini di dashboard masing-masing

---

## STATUS FITUR SAAT INI ✅

### Infrastruktur
- [x] Auth Supabase + RBAC multi-role (super_admin, owner, branch_manager, finance, sales, marketing, operational, equipment, agent)
- [x] Permission registry + menu dinamis per role
- [x] Route protection per permission

### Portal Admin — Lengkap
- [x] Dashboard multi-role dengan stats & alerts
- [x] Manajemen User, Role, RBAC Tools
- [x] Paket Umroh/Haji (CRUD + tipe paket)
- [x] Booking (wizard multi-step, detail, status)
- [x] Leads pipeline
- [x] Keberangkatan + Room Assignment + Manasik + Haji + Itinerary
- [x] Equipment & Stock Opname
- [x] Pembayaran + Finance (Cash, AR, AP) + Tabungan
- [x] Komisi Agen (auto-hitung, approve, bayar)
- [x] Laporan (reguler, advanced, scheduled)
- [x] Jamaah CRUD + Dokumen + Visa
- [x] Agen CRUD + Jaringan Sub-Agen
- [x] Cabang CRUD
- [x] Loyalitas & Referral
- [x] HR + Payroll
- [x] Generator Surat + Korespondensi
- [x] Marketing (Landing Page, Banner, WhatsApp, Materials)
- [x] Analytics
- [x] Master Data (Hotel, Maskapai, Bandara, Vendor, Muthawif, Bus)
- [x] Pengaturan Umum + Tampilan + 2FA + API Connect

### Portal Agen — Lengkap
- [x] Dashboard Agen
- [x] Daftar & kelola jamaah
- [x] Laporan komisi
- [x] Dompet & penarikan
- [x] Jaringan sub-agen
- [x] Digital kit promosi
- [x] Katalog paket
- [x] Notifikasi agen

### Fase 1 — Kode Selesai, Butuh SQL Migration
- [x] Sistem keanggotaan agen (Silver/Gold/Platinum)
- [x] Sistem keanggotaan cabang (Reguler/Premium)
- [x] Admin: approval keanggotaan
- [x] Halaman keanggotaan sisi agen
- [x] Komisi cabang otomatis
- [x] Admin: kelola & bayar komisi cabang
- [x] Branch Manager Dashboard (komisi + keanggotaan + ranking agen)
- [x] Website Settings agen (Branding/Hero/Kontak/Sosial/Testimoni/Galeri/SEO/QR)

> ⚠️ **PERLU DIJALANKAN:** `src/lib/migrations/fase1-membership-branch-commission.sql`
> di Supabase SQL Editor agar fitur-fitur di atas aktif.

---

## ROADMAP FASE 2 — Website Publik Agen & Cabang

**Estimasi: 3–5 sesi kerja**

### 2A — Website Publik Agen (`/a/{slug}`)

**Halaman:**
- `/a/{slug}` — Landing page agen (foto, profil, paket unggulan, testimoni, galeri)
- `/a/{slug}/paket` — Katalog semua paket yang dijual agen
- `/a/{slug}/paket/{id}` — Detail paket + tombol Pesan
- `/a/{slug}/tentang` — Profil lengkap agen + lokasi maps
- `/a/{slug}/kontak` — Form inquiry / WhatsApp langsung

**Komponen halaman:**
- Hero section (foto banner, nama agen, tagline)
- Badge keanggotaan (Silver/Gold/Platinum) jika aktif
- Stats mini: total jamaah diberangkatkan, rating, tahun bergabung
- Grid paket unggulan (dari paket yang dipilih agen)
- Testimoni jamaah
- Galeri foto keberangkatan
- Tombol WhatsApp langsung + share link
- QR code untuk cetak/digital kit
- View counter

**Atribusi:**
- Setiap kunjungan ke `/a/{slug}` menyimpan `agent_slug` ke localStorage
- Tombol "Pesan" membawa `?ref=agent_slug` di URL
- Jika jamaah register → `referred_by_agent_id` terisi otomatis

**SQL yang dibutuhkan:**
```sql
-- Sudah ada di fase1 migration
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS testimonials JSONB;
ALTER TABLE website_settings ADD COLUMN IF NOT EXISTS gallery_urls JSONB;
-- Tambahan baru:
ALTER TABLE agents ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS featured_package_ids JSONB DEFAULT '[]';
```

---

### 2B — Website Publik Cabang (`/c/{slug}`)

**Halaman:**
- `/c/{slug}` — Landing page cabang (logo, profil, daftar agen, paket)
- `/c/{slug}/paket` — Katalog paket cabang
- `/c/{slug}/paket/{id}` — Detail paket + Pesan
- `/c/{slug}/agen` — Daftar agen aktif di cabang ini
- `/c/{slug}/kontak` — Info kontak + maps

**Komponen:**
- Hero section cabang (logo, nama, slogan)
- Badge keanggotaan cabang
- Statistik cabang (jumlah agen, jamaah, keberangkatan)
- Grid agen aktif (foto + nama + rating)
- Paket unggulan cabang
- Testimoni & galeri
- Form inquiry → auto lead dengan branch_id

**SQL yang dibutuhkan:**
```sql
ALTER TABLE branches ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS website_description TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS website_banner_url TEXT;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS website_gallery JSONB DEFAULT '[]';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS website_testimonials JSONB DEFAULT '[]';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS featured_package_ids JSONB DEFAULT '[]';
ALTER TABLE branches ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;
```

---

### 2C — Flow Pemesanan Online (`/pesan/{slug}/*`)

Ini adalah alur lengkap dari website agen/cabang sampai booking tersimpan:

```
[Kunjungi /a/{slug}]
        ↓
[Pilih Paket → /a/{slug}/paket/{id}]
        ↓
[Klik "Pesan Sekarang"]
        ↓
[Cek: Sudah login sebagai jamaah?]
     ↙         ↘
[Belum]      [Sudah]
   ↓              ↓
[Register/Login    |
 sebagai jamaah]   |
   ↓               |
[Form Data Jamaah ←┘
 (nama, HP, email, NIK, passport)]
        ↓
[Pilih Jumlah Peserta / Mahram]
        ↓
[Ringkasan & Konfirmasi]
  - Paket yang dipilih
  - Total harga
  - PIC: nama agen (otomatis dari slug)
        ↓
[Upload Bukti Pembayaran DP]
        ↓
[Booking tersimpan]
  - booking.agent_id = agen dari slug
  - booking.branch_id = cabang agen
  - booking.status = pending_confirmation
  - Notif WhatsApp ke agen
  - Notif email ke jamaah
        ↓
[Jamaah diarahkan ke Portal Jamaah]
```

**Halaman yang dibutuhkan:**
- `PublicBookingWizard.tsx` — wizard 4 langkah
- `PublicLoginRegister.tsx` — register/login jamaah (role: customer)
- `PublicBookingConfirmation.tsx` — halaman konfirmasi & status

---

## ROADMAP FASE 3 — Portal Jamaah (Customer)

**Estimasi: 2–3 sesi kerja**

Portal jamaah adalah area private yang hanya bisa diakses setelah login dengan role `customer`.

### Halaman Portal Jamaah (`/jamaah/*`)

| Path | Halaman | Deskripsi |
|------|---------|-----------|
| `/jamaah` | Dashboard | Status booking aktif, tagihan, notifikasi |
| `/jamaah/booking` | Daftar Booking | Semua booking jamaah ini |
| `/jamaah/booking/{id}` | Detail Booking | Status, pembayaran, dokumen |
| `/jamaah/dokumen` | Dokumen Saya | Upload paspor, KTP, foto, dll |
| `/jamaah/pembayaran` | Pembayaran | Riwayat bayar, tagihan, upload bukti |
| `/jamaah/itinerary` | Itinerary | Jadwal perjalanan lengkap |
| `/jamaah/manasik` | Manasik | Jadwal & materi manasik |
| `/jamaah/profil` | Profil | Edit data diri, ubah password |
| `/jamaah/kontak` | Hubungi Agen | Chat/WA dengan agen PIC |

### Fitur Utama Portal Jamaah
- Tracking status booking real-time
- Upload dokumen (paspor, foto, dll) mandiri
- Riwayat & bukti pembayaran
- Download itinerary PDF
- Materi manasik digital
- Notifikasi via email/WA
- Akses kontak PIC agen langsung

### SQL yang Dibutuhkan
```sql
-- Tabel khusus akun jamaah (link ke auth.users)
CREATE TABLE IF NOT EXISTS customer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  customer_id UUID REFERENCES customers(id),
  referred_by_agent_id UUID REFERENCES agents(id),
  referred_by_branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Notifikasi jamaah
CREATE TABLE IF NOT EXISTS customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## ROADMAP FASE 4 — Performa & Analytics Agen/Cabang

**Estimasi: 1–2 sesi kerja**

### Dashboard Performa Agen (Enhanced)
- Grafik booking per bulan (chart)
- Ranking agen di seluruh sistem
- Ranking agen dalam satu cabang
- Total jamaah diberangkatkan all-time
- Konversi leads → booking
- Tren komisi bulanan
- Badge pencapaian (milestone)

### Dashboard Performa Cabang (Enhanced)
- Grafik booking cabang per bulan
- Ranking cabang se-Indonesia
- Leaderboard agen dalam cabang
- Total omzet cabang
- Komisi cabang kumulatif

### Admin: Laporan Multi-Dimensi
- Filter performa per agen
- Filter performa per cabang
- Filter per region/wilayah
- Export Excel/PDF

---

## ROADMAP FASE 5 — Notifikasi & Komunikasi

**Estimasi: 2 sesi kerja**

### WhatsApp Otomatis (Trigger-based)
| Event | Penerima | Pesan |
|-------|----------|-------|
| Booking baru masuk | Agen PIC | "Booking baru dari {nama_jamaah} untuk paket {paket}" |
| Booking dikonfirmasi | Jamaah | "Booking Anda telah dikonfirmasi. Kode: {booking_code}" |
| Pembayaran diterima | Jamaah | "Pembayaran Rp{jumlah} diterima. Sisa: Rp{sisa}" |
| Dokumen diverifikasi | Jamaah | "Dokumen paspor Anda telah diverifikasi ✓" |
| H-30 keberangkatan | Jamaah | "Persiapkan diri! Keberangkatan {tanggal}" |
| H-7 keberangkatan | Jamaah | "Checklist perlengkapan & jadwal kumpul" |
| Komisi disetujui | Agen | "Komisi Rp{jumlah} untuk booking {kode} telah disetujui" |

### Email Notifikasi
- Template email profesional (branded per travel agent)
- Booking confirmation email
- Payment receipt
- Departure reminder
- Document checklist

---

## ROADMAP FASE 6 — Mobile & PWA

**Estimasi: 3–4 sesi kerja**

### Progressive Web App
- Install to homescreen (manifest.json + service worker)
- Offline mode: cache itinerary & dokumen penting
- Push notification ke HP jamaah

### Mobile-Optimized Features
- QR code check-in saat manasik
- QR code check-in saat keberangkatan (departure gate)
- Upload foto dokumen via kamera HP
- Maps lokasi kumpul

---

## PRIORITAS EKSEKUSI

### Langkah Segera (Prerequisite)
```
1. Jalankan SQL migration Fase 1 di Supabase SQL Editor
   File: src/lib/migrations/fase1-membership-branch-commission.sql

2. Set env variables di Replit Secrets:
   - VITE_SUPABASE_URL
   - VITE_SUPABASE_PUBLISHABLE_KEY
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
```

### Urutan Pengerjaan yang Disarankan

```
[FASE 1] ✅ Keanggotaan + Komisi Cabang (kode selesai, tunggu SQL)
    ↓
[FASE 2A] Website Publik Agen (/a/{slug})
    ↓
[FASE 2B] Website Publik Cabang (/c/{slug})
    ↓
[FASE 2C] Flow Pemesanan Online (wizard booking publik)
    ↓
[FASE 3] Portal Jamaah (/jamaah/*)
    ↓
[FASE 4] Performa & Analytics Lanjutan
    ↓
[FASE 5] Notifikasi WhatsApp & Email Otomatis
    ↓
[FASE 6] Mobile PWA
```

---

## DETAIL TEKNIS ATRIBUSI PIC

### Mekanisme Slug & Tracking

```typescript
// 1. Saat masuk ke /a/{slug}
//    → simpan ke localStorage
localStorage.setItem('agent_ref', slug);
localStorage.setItem('agent_ref_ts', Date.now().toString());

// 2. Saat jamaah register
const agentRef = localStorage.getItem('agent_ref');
// → cari agent_id dari slug
// → simpan ke customer_accounts.referred_by_agent_id

// 3. Saat booking dibuat
const { data: agent } = await supabase
  .from('agents')
  .select('id, branch_id')
  .eq('slug', agentRef)
  .single();

await supabase.from('bookings').insert({
  ...bookingData,
  agent_id: agent.id,
  branch_id: agent.branch_id,
});
// → komisi agent otomatis terhitung
// → komisi branch otomatis terhitung
```

### Validasi Slug
- Slug dibuat dari nama agen/cabang (URL-friendly)
- Auto-generated saat agen/cabang dibuat
- Bisa dikustomisasi dari settings
- Contoh: "Pak Budi Santoso" → `pak-budi-santoso`
- Jika duplikat → tambah angka: `pak-budi-santoso-2`

---

## DATABASE SCHEMA TAMBAHAN (Ringkasan)

```sql
-- Fase 2: Website Publik
ALTER TABLE agents    ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE branches  ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE agents    ADD COLUMN IF NOT EXISTS featured_package_ids JSONB DEFAULT '[]';
ALTER TABLE branches  ADD COLUMN IF NOT EXISTS website_description TEXT;
ALTER TABLE branches  ADD COLUMN IF NOT EXISTS website_banner_url TEXT;
ALTER TABLE branches  ADD COLUMN IF NOT EXISTS website_gallery JSONB DEFAULT '[]';
ALTER TABLE branches  ADD COLUMN IF NOT EXISTS website_testimonials JSONB DEFAULT '[]';
ALTER TABLE branches  ADD COLUMN IF NOT EXISTS featured_package_ids JSONB DEFAULT '[]';
ALTER TABLE branches  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0;

-- Fase 3: Portal Jamaah
CREATE TABLE customer_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  customer_id UUID REFERENCES customers(id),
  referred_by_agent_id UUID REFERENCES agents(id),
  referred_by_branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE customer_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  title TEXT NOT NULL,
  message TEXT,
  type TEXT DEFAULT 'info' CHECK (type IN ('info','success','warning','error')),
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Fase 5: WhatsApp Log
CREATE TABLE whatsapp_message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_phone TEXT NOT NULL,
  recipient_name TEXT,
  template TEXT,
  message TEXT,
  status TEXT DEFAULT 'queued',
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  triggered_by TEXT,
  ref_id UUID,
  ref_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## FILE YANG AKAN DIBUAT PER FASE

### Fase 2A — Website Publik Agen
```
src/pages/public/
  AgentPublicPage.tsx          ← landing page utama /a/{slug}
  AgentPublicPackages.tsx      ← katalog paket /a/{slug}/paket
  AgentPublicPackageDetail.tsx ← detail paket /a/{slug}/paket/{id}
  AgentPublicContact.tsx       ← kontak /a/{slug}/kontak
  AgentPublicLayout.tsx        ← layout wrapper (navbar publik)

src/components/public/
  AgentHeroSection.tsx
  AgentStatsBar.tsx
  AgentPackageGrid.tsx
  AgentTestimonials.tsx
  AgentGallery.tsx
  PublicPackageCard.tsx
  AgentContactWidget.tsx

src/hooks/
  usePublicAgentProfile.ts     ← fetch data agen by slug (tanpa auth)
  usePublicPackages.ts         ← fetch paket publik

src/routes/
  PublicRoutes.tsx             ← update: tambah /a/:slug/*
```

### Fase 2B — Website Publik Cabang
```
src/pages/public/
  BranchPublicPage.tsx
  BranchPublicPackages.tsx
  BranchPublicAgents.tsx
  BranchPublicContact.tsx
  BranchPublicLayout.tsx

src/components/public/
  BranchHeroSection.tsx
  BranchAgentGrid.tsx
  BranchStatsBar.tsx
```

### Fase 2C — Flow Booking Publik
```
src/pages/public/
  PublicBookingWizard.tsx
  PublicLoginRegister.tsx
  PublicBookingConfirmation.tsx

src/hooks/
  usePublicBooking.ts
  useAgentRef.ts               ← localStorage ref tracking
```

### Fase 3 — Portal Jamaah
```
src/pages/jamaah/
  JamaahLayout.tsx
  JamaahDashboard.tsx
  JamaahBookings.tsx
  JamaahBookingDetail.tsx
  JamaahDokumen.tsx
  JamaahPembayaran.tsx
  JamaahItinerary.tsx
  JamaahManasik.tsx
  JamaahProfil.tsx

src/routes/
  JamaahRoutes.tsx

src/hooks/
  useJamaahAccount.ts
  useJamaahBookings.ts
  useJamaahDocuments.ts
  useJamaahNotifications.ts

src/lib/migrations/
  fase2-public-website.sql
  fase3-customer-portal.sql
```

---

*Dokumen ini diperbarui seiring progress pengembangan.*
*Vinstour Travel © 2025 — Semua hak cipta dilindungi.*
