# Rencana Pengembangan Lanjutan — Vinstour Travel Portal
> Dibuat: Mei 2026 | Versi: 1.0  
> Stack: React 19 + Vite 7 + TypeScript + Supabase + Express  
> Status Saat Ini: Fase 1–15 selesai, 140+ halaman aktif

---

## Legenda

| Simbol | Artinya |
|--------|---------|
| ✅ | Selesai |
| 🔄 | Sebagian ada / perlu penyempurnaan |
| 🔴 | Belum dibangun |
| 🔗 | Titik integrasi antar-portal/role |

---

## Prinsip Integrasi Lintas-Role

Setiap fitur harus menjangkau **semua role yang relevan** tanpa silo:

```
Admin Pusat (super_admin, owner, admin, finance, operational)
    ↕ Kelola, approve, monitor
Cabang (branch_manager)
    ↕ Visibilitas cabang, approval lokal
Agen (agent, sub_agent)
    ↕ Input data, lihat status
Jamaah/Customer (jamaah, customer)
    ↕ Self-service, notifikasi real-time
Muthawif (operational di lapangan)
    ↕ Monitor & respons di lapangan
```

---

## FITUR 01 — SOS Real-time Terhubung ke Admin & Muthawif
> **Prioritas: TINGGI** | Dampak: Keselamatan jiwa jamaah

### Masalah Saat Ini
- Tombol SOS di `/jamaah` ada, tapi alert **tidak muncul real-time** di panel admin/muthawif
- `AdminSOSAlerts.tsx` hanya polling manual (refresh button), bukan Supabase Realtime
- Muthawif tidak mendapat notifikasi SOS sama sekali

### Solusi — Integrasi Lintas Role

#### 🟢 Portal Jamaah (`/jamaah`)
- **`JamaahPortal.tsx`** — Tombol SOS sudah ada, pastikan insert ke tabel `sos_alerts` dengan `latitude`, `longitude`, `emergency_type`, `customer_id`
- Setelah submit: tampilkan konfirmasi "SOS Terkirim — Tim sedang merespons" + nomor darurat
- Countdown 30 detik untuk batalkan (cegah salah tekan)
- Status SOS bisa dipantau jamaah di halaman baru `/jamaah/sos-status`

#### 🔴 Halaman Baru: `/jamaah/sos-status`
- File: `src/pages/jamaah/JamaahSOSStatus.tsx`
- Tampilkan: status penanganan (active → responding → resolved), nama petugas yang merespons, pesan dari admin
- Supabase Realtime: subscribe UPDATE pada row SOS milik jamaah ini

#### 🟢 Panel Admin (`/admin/sos-alerts`)
- **`AdminSOSAlerts.tsx`** — tambah Supabase Realtime channel `sos-realtime`
- Subscribe `INSERT` → toast merah + bunyi alert + badge merah di sidebar
- Subscribe `UPDATE` → refresh otomatis status card
- Wajib tambah: tombol "Hubungi via WA", assign ke muthawif dari halaman ini

#### 🔴 Halaman Baru: `/muthawif/sos`
- File: `src/pages/muthawif/MuthawifSOS.tsx`
- Muthawif terima notifikasi real-time SOS jamaah di kelompok mereka
- Filter hanya SOS dari jamaah yang terdaftar di keberangkatan yang sama
- Tombol: "Saya Tangani" (ubah status → responding), "Selesai" (→ resolved), input catatan penanganan

#### 🔗 Titik Integrasi
- `useAdminNotifications.ts` → tambah type `sos_alert`, subscribe tabel `sos_alerts` INSERT
- `NotificationBell.tsx` → ikon `AlertTriangle` merah untuk SOS, badge berkedip
- `MuthawifDashboard.tsx` → widget "SOS Aktif" di bagian atas dashboard
- `BranchDashboard.tsx` → counter SOS aktif di cabang masing-masing

### SQL yang Dibutuhkan
```sql
-- Pastikan tabel sos_alerts sudah ada dengan kolom:
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS assigned_muthawif_id UUID REFERENCES muthawifs(id);
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS response_notes TEXT;
ALTER TABLE sos_alerts ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ;

-- RLS: muthawif lihat SOS dari jamaah di keberangkatan mereka
CREATE POLICY "muthawif_view_sos" ON sos_alerts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM muthawifs m
      JOIN bookings b ON b.departure_id = m.departure_id
      JOIN customers c ON c.id = b.customer_id
      WHERE m.user_id = auth.uid() AND c.id = sos_alerts.customer_id
    )
  );
```

### File yang Dimodifikasi / Dibuat
| File | Aksi |
|------|------|
| `src/pages/jamaah/JamaahPortal.tsx` | Perbaiki tombol SOS → insert lengkap + konfirmasi |
| `src/pages/jamaah/JamaahSOSStatus.tsx` | **BARU** — status real-time SOS jamaah |
| `src/pages/admin/AdminSOSAlerts.tsx` | Tambah Supabase Realtime + assign muthawif |
| `src/pages/muthawif/MuthawifSOS.tsx` | **BARU** — panel SOS khusus muthawif |
| `src/components/admin/AdminLayoutImproved.tsx` | Badge SOS merah di sidebar |
| `src/hooks/useAdminNotifications.ts` | Tambah listener `sos_alerts` INSERT |
| `src/routes/CustomerRoutes.tsx` | Daftarkan `/jamaah/sos-status` |
| `src/routes/OperationalRoutes.tsx` | Daftarkan `/muthawif/sos` |

---

## FITUR 02 — Notifikasi Otomatis Perubahan Status Visa
> **Prioritas: TINGGI** | Dampak: Pengalaman jamaah, transparansi

### Masalah Saat Ini
- Admin update status visa di halaman jamaah, tapi **jamaah tidak mendapat notifikasi otomatis**
- `JamaahVisaTracker.tsx` hanya query manual, tidak subscribe realtime
- Tidak ada log riwayat perubahan status visa

### Solusi — Integrasi Lintas Role

#### 🟢 Admin (`/admin/customers/:id` atau `AdminVisaManagement.tsx`)
- Saat admin ubah `visa_status` → otomatis:
  1. Insert ke tabel `visa_status_logs` (riwayat perubahan)
  2. Insert ke tabel `customer_notifications` untuk jamaah terkait
  3. Trigger WA otomatis via `whatsapp-notifier` dengan template visa

#### 🔄 Portal Jamaah (`/jamaah/visa`)
- **`JamaahVisaTracker.tsx`** — tambah Supabase Realtime subscribe UPDATE pada row visa milik user
- Saat status berubah: banner animasi muncul "Status visa Anda diperbarui!"
- Tambah accordion **Riwayat Perubahan Status** (query `visa_status_logs`)

#### 🔴 Notifikasi In-App Jamaah
- `JamaahNotifications.tsx` — pastikan notif visa masuk ke feed notifikasi jamaah
- Bell notifikasi di bottom nav jamaah berubah warna/badge saat ada update visa

#### 🔗 Titik Integrasi
- `AdminVisaManagement.tsx` → hook `useVisaStatusUpdate` yang trigger notif + WA + log
- `JamaahVisaTracker.tsx` → Supabase Realtime channel `visa-updates-{customerId}`
- `AdminBookingDetail.tsx` → shortcut ubah visa dengan konfirmasi pengiriman notif WA
- `BranchDashboard.tsx` → widget "Visa Pending" untuk jamaah di cabang ini

### SQL yang Dibutuhkan
```sql
CREATE TABLE IF NOT EXISTS visa_status_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON visa_status_logs(customer_id);
ALTER TABLE visa_status_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_view_own_visa_logs" ON visa_status_logs
  FOR SELECT USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "admin_manage_visa_logs" ON visa_status_logs
  FOR ALL USING (EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role IN ('super_admin','owner','admin','operational')));
```

### File yang Dimodifikasi / Dibuat
| File | Aksi |
|------|------|
| `src/pages/jamaah/JamaahVisaTracker.tsx` | Tambah Realtime + riwayat log |
| `src/pages/admin/AdminVisaManagement.tsx` | Tambah trigger notif + WA + log saat update |
| `src/hooks/useVisaStatusUpdate.ts` | **BARU** — hook update visa + notif + WA |
| `src/pages/jamaah/JamaahNotifications.tsx` | Pastikan notif visa masuk feed |
| `src/lib/whatsapp-notifier.ts` | Tambah template `VISA_STATUS_CHANGED` |

---

## FITUR 03 — Integrasi SISKOHAT Kemenag
> **Prioritas: TINGGI** | Dampak: Wajib untuk produk Haji, kepatuhan regulasi

### Masalah Saat Ini
- `JamaahSISKOHAT.tsx` sudah ada (cek nomor porsi mandiri) tapi menggunakan data statis
- **Tidak ada halaman admin** untuk kelola/sinkronisasi data SISKOHAT
- Tidak ada pipeline sinkronisasi data jamaah Haji ke format SISKOHAT Kemenag

### Solusi — Integrasi Lintas Role

#### 🔴 Admin SISKOHAT (`/admin/siskohat`)
- File: `src/pages/admin/AdminSISKOHAT.tsx`
- Tab 1: **Data Porsi** — tabel semua jamaah haji + nomor porsi + status antrian
- Tab 2: **Sinkronisasi** — export data jamaah dalam format CSV/Excel sesuai template Kemenag (nama lengkap sesuai paspor, NIK, tempat lahir, embarkasi, dll)
- Tab 3: **Embarkasi** — konfigurasi kode embarkasi per cabang/keberangkatan
- Tab 4: **Monitoring Kuota** — kuota haji per embarkasi + progress terpakai
- Tombol "Export Template Kemenag" → generate file Excel dengan format kolom resmi SISKOHAT

#### 🔄 Portal Jamaah (`/jamaah/siskohat`)
- **`JamaahSISKOHAT.tsx`** — upgrade: tampilkan data dari tabel internal bukan statis
- Tambah: nomor porsi dari profil customer, estimasi keberangkatan berdasarkan antrian
- Link ke dokumen panduan SISKOHAT resmi Kemenag

#### 🔗 Titik Integrasi
- `AdminHajiManagement.tsx` → tambah tab "SISKOHAT" yang link ke `/admin/siskohat`
- `AdminBookings.tsx` → kolom "Nomor Porsi Haji" untuk booking tipe Haji
- `BranchDashboard.tsx` → widget "Jamaah Haji — Status Porsi" (data cabang)
- `AdminCustomerDetail.tsx` → section SISKOHAT dengan input nomor porsi

### SQL yang Dibutuhkan
```sql
ALTER TABLE customers ADD COLUMN IF NOT EXISTS nomor_porsi_haji TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS embarkasi_kode TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS estimasi_keberangkatan_haji INTEGER; -- tahun

CREATE TABLE IF NOT EXISTS siskohat_sync_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sync_type TEXT NOT NULL, -- 'export', 'manual_input'
  record_count INTEGER,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  exported_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### File yang Dimodifikasi / Dibuat
| File | Aksi |
|------|------|
| `src/pages/admin/AdminSISKOHAT.tsx` | **BARU** — panel admin kelola + export SISKOHAT |
| `src/pages/jamaah/JamaahSISKOHAT.tsx` | Upgrade: data dari DB, bukan statis |
| `src/pages/admin/AdminHajiManagement.tsx` | Tambah tab SISKOHAT |
| `src/pages/admin/AdminCustomerDetail.tsx` | Input nomor porsi haji |
| `src/routes/AdminRoutes.tsx` | Daftarkan `/admin/siskohat` |

---

## FITUR 04 — Approval Workflow Berjenjang
> **Prioritas: MENENGAH** | Dampak: Kontrol bisnis, compliance internal

### Masalah Saat Ini
- Booking, refund, dan diskon **langsung diproses** tanpa rantai persetujuan
- Branch manager tidak bisa approve diskon besar — harus eskalasi manual ke WhatsApp
- Tidak ada audit trail persetujuan

### Solusi — Integrasi Lintas Role

#### Tipe Approval yang Didukung
1. **Refund** — Customer → CS → Finance → Owner (tergantung nominal)
2. **Diskon Booking** — Agen → Branch Manager → Admin (tergantung %)
3. **Pembatalan Booking** — Customer/Agen → CS → Admin
4. **Vendor Invoice** — Operational → Finance → Owner (di atas threshold)

#### 🔴 Admin — Approval Center (`/admin/approvals`)
- File: `src/pages/admin/AdminApprovals.tsx`
- Inbox approval: semua request masuk berdasarkan role user
- Filter: tipe, status (pending/approved/rejected), tanggal, nominal
- Aksi: Approve dengan catatan, Reject dengan alasan, Eskalasi ke level atas
- History: audit trail lengkap per request

#### 🔴 Branch Manager — Approval Diskon (`/cabang/approvals`)
- File: `src/pages/branch/BranchApprovals.tsx`
- Khusus approval diskon dari agen binaan cabang
- Batas wewenang (misal: branch_manager bisa approve diskon s/d 10%)
- Di atas batas → otomatis eskalasi ke admin pusat

#### 🔄 Agen — Request Diskon
- `BranchDiskon.tsx` sudah ada, integrasikan dengan workflow ini
- Agen submit request → masuk inbox branch manager → notif realtime

#### 🔴 Customer — Status Refund
- Halaman baru: `src/pages/customer/CustomerRefundStatus.tsx`
- Customer lihat progress approval refund mereka (step tracker visual)
- Notif otomatis setiap perubahan status

#### 🔗 Titik Integrasi
- `useAdminNotifications.ts` → listener `approval_requests` INSERT
- Semua portal: badge "Approval Menunggu" di nav jika ada pending request
- `AdminBookingDetail.tsx` → button "Ajukan Refund" yang masuk ke workflow
- `BranchDashboard.tsx` → widget "Approval Pending" count
- Email otomatis ke approver saat ada request masuk

### SQL yang Dibutuhkan
```sql
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('refund','discount','cancellation','vendor_invoice')),
  reference_id UUID, -- booking_id / invoice_id / dll
  reference_code TEXT,
  requester_id UUID NOT NULL REFERENCES auth.users(id),
  requester_role TEXT NOT NULL,
  amount NUMERIC(15,2),
  percentage NUMERIC(5,2),
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','escalated','cancelled')),
  current_level INTEGER NOT NULL DEFAULT 1, -- level approval saat ini
  max_level INTEGER NOT NULL DEFAULT 2,
  branch_id UUID REFERENCES branches(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('approved','rejected','escalated','noted')),
  level INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS approval_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL,
  level INTEGER NOT NULL,
  required_role TEXT NOT NULL,
  amount_threshold NUMERIC(15,2),
  percentage_threshold NUMERIC(5,2),
  is_active BOOLEAN DEFAULT TRUE
);
```

### File yang Dimodifikasi / Dibuat
| File | Aksi |
|------|------|
| `src/pages/admin/AdminApprovals.tsx` | **BARU** — approval inbox admin |
| `src/pages/branch/BranchApprovals.tsx` | **BARU** — approval inbox branch |
| `src/pages/customer/CustomerRefundStatus.tsx` | **BARU** — tracking refund customer |
| `src/hooks/useApprovalWorkflow.ts` | **BARU** — logic workflow approval |
| `src/pages/admin/AdminBookingDetail.tsx` | Integrasi tombol refund + cancel ke workflow |
| `src/pages/branch/BranchDiskon.tsx` | Upgrade ke workflow berjenjang |
| `src/routes/AdminRoutes.tsx` | Daftarkan `/admin/approvals` |
| `src/routes/BranchRoutes.tsx` | Daftarkan `/cabang/approvals` |
| `src/lib/permissions.ts` | Tambah `APPROVALS` permission |

---

## FITUR 05 — Manajemen Kontrak Vendor
> **Prioritas: MENENGAH** | Dampak: Kontrol operasional, cegah kontrak expired

### Masalah Saat Ini
- `AdminVendors.tsx` hanya CRUD data vendor dasar (nama, kontak, bank)
- **Tidak ada pencatatan kontrak** — tanggal mulai, akhir, nilai, lampiran
- Tidak ada reminder untuk kontrak yang hampir expired

### Solusi — Integrasi Lintas Role

#### 🔴 Admin — Kontrak Vendor (`/admin/vendor-contracts`)
- File: `src/pages/admin/AdminVendorContracts.tsx`
- CRUD kontrak per vendor: nomor kontrak, tanggal mulai-akhir, nilai, jenis layanan, lampiran PDF
- Dashboard: kontrak aktif, akan expired (30 hari), sudah expired
- Timeline visual kontrak per vendor
- Bulk reminder WA/Email ke vendor terkait kontrak hampir expired

#### 🔄 Admin Vendor (`/admin/vendors`)
- **`AdminVendors.tsx`** — tambah kolom "Kontrak Aktif" + badge expired status
- Quick link ke daftar kontrak vendor tersebut

#### 🔗 Titik Integrasi
- `useAdminNotifications.ts` → listener tabel `vendor_contracts` untuk kontrak < 30 hari expired
- Sidebar Admin → badge "Kontrak Expired" jika ada yang sudah lewat batas
- `AdminDashboard.tsx` → widget "Kontrak Vendor — Akan Habis"
- `BranchDashboard.tsx` → kontrak vendor yang berkaitan dengan cabang ini
- Laporan terjadwal → otomatis kirim daftar kontrak akan expired ke owner setiap minggu

### SQL yang Dibutuhkan
```sql
CREATE TABLE IF NOT EXISTS vendor_contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vendor_id UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
  contract_number TEXT NOT NULL,
  service_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  value NUMERIC(15,2),
  currency TEXT DEFAULT 'IDR',
  payment_terms TEXT,
  auto_renew BOOLEAN DEFAULT FALSE,
  document_url TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('draft','active','expired','terminated')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON vendor_contracts(vendor_id);
CREATE INDEX ON vendor_contracts(end_date);
CREATE INDEX ON vendor_contracts(status);
```

### File yang Dimodifikasi / Dibuat
| File | Aksi |
|------|------|
| `src/pages/admin/AdminVendorContracts.tsx` | **BARU** — CRUD kontrak + reminder |
| `src/pages/admin/AdminVendors.tsx` | Tambah kolom status kontrak + quick link |
| `src/hooks/useAdminNotifications.ts` | Listener kontrak expired |
| `src/routes/AdminRoutes.tsx` | Daftarkan `/admin/vendor-contracts` |
| `src/lib/permissions.ts` | Tambah `VENDOR_CONTRACTS` permission |

---

## FITUR 06 — Budget vs Realisasi per Keberangkatan
> **Prioritas: MENENGAH** | Dampak: Kontrol biaya operasional

### Masalah Saat Ini
- `AdminFinancePL.tsx` ada P&L per keberangkatan, tapi hanya **realisasi** (dari `vendor_costs`)
- **Tidak ada perencanaan budget** di awal sebelum keberangkatan
- Tidak ada perbandingan plan vs actual + selisih (variance)

### Solusi — Integrasi Lintas Role

#### 🔴 Admin — Budget Keberangkatan (`/admin/departures/:id/budget`)
- Tab baru di `AdminDepartureDetail.tsx`: "Budget & Realisasi"
- Form input budget per kategori: hotel, tiket, visa, katering, transportasi, handling, dll
- Tabel perbandingan: Budget | Realisasi | Variance | Variance %
- Status: On Budget / Over Budget / Under Budget
- Grafik bar: budget vs realisasi per kategori

#### 🔗 Titik Integrasi
- `AdminDepartures.tsx` → kolom baru "Status Budget" (icon hijau/merah/abu)
- `AdminDepartureDetail.tsx` → tab "Budget" di samping tab Jemaah, Kamar, dll
- `BranchDashboard.tsx` → widget "Budget Keberangkatan" untuk keberangkatan di cabang ini
- `AdminFinancePL.tsx` → link ke budget detail per keberangkatan
- `AdminFinanceTerpadu.tsx` → grafik aggregasi semua keberangkatan budget vs realisasi
- Export Excel: template budget keberangkatan

### SQL yang Dibutuhkan
```sql
CREATE TABLE IF NOT EXISTS departure_budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  departure_id UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (
    category IN ('hotel','tiket','visa','katering','transportasi','handling','manasik','perlengkapan','lainnya')
  ),
  description TEXT,
  budgeted_amount NUMERIC(15,2) NOT NULL DEFAULT 0,
  pax_count INTEGER,
  per_pax_amount NUMERIC(15,2),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(departure_id, category)
);

CREATE INDEX ON departure_budgets(departure_id);
```

### File yang Dimodifikasi / Dibuat
| File | Aksi |
|------|------|
| `src/pages/admin/AdminDepartureDetail.tsx` | Tambah tab "Budget & Realisasi" |
| `src/pages/admin/AdminDepartures.tsx` | Tambah kolom status budget |
| `src/pages/admin/AdminFinancePL.tsx` | Link ke budget detail |
| `src/pages/admin/AdminFinanceTerpadu.tsx` | Grafik aggregasi budget vs realisasi |
| `src/hooks/useDepartureBudget.ts` | **BARU** — hook CRUD budget + kalkulasi variance |
| `src/lib/permissions.ts` | Tambah `DEPARTURE_BUDGET` permission |

---

## FITUR 07 — Modul Pelatihan Produk untuk Agen
> **Prioritas: MENENGAH** | Dampak: Kualitas agen, konsistensi penjualan

### Masalah Saat Ini
- Agen baru tidak ada onboarding terstruktur
- Tidak ada library materi product knowledge, script jual, SOP
- Tidak ada tracking progress belajar agen

### Solusi — Integrasi Lintas Role

#### 🔴 Admin — Kelola Materi Pelatihan (`/admin/training`)
- File: `src/pages/admin/AdminTraining.tsx`
- CRUD modul pelatihan: judul, deskripsi, konten (teks/video YouTube/PDF)
- Kategorisasi: Product Knowledge, Script Penjualan, SOP Operasional, Regulasi Haji/Umroh
- Assign modul ke: semua agen, agen cabang tertentu, atau agen spesifik
- Dashboard: progress agen (siapa sudah selesai modul apa)
- Quiz per modul: soal pilihan ganda, nilai minimum lulus
- Sertifikat otomatis PDF jika semua modul selesai

#### 🔴 Portal Agen — Akses Pelatihan (`/agent/training`)
- File: `src/pages/agent/AgentTraining.tsx`
- Daftar modul yang diwajibkan + progress bar
- Buka materi: video embed, PDF viewer, teks markdown
- Quiz interaktif dengan feedback langsung
- Download sertifikat digital jika lulus
- Notif: "Ada modul pelatihan baru dari admin"

#### 🔗 Titik Integrasi
- `AgentDashboard.tsx` → widget "Pelatihan — X modul belum selesai" + CTA
- `AdminAgents.tsx` → kolom "Sertifikat Pelatihan" + progress %
- `BranchAgen.tsx` → filter agen: "Belum Selesai Pelatihan"
- `useAdminNotifications.ts` → notif saat agen selesaikan semua modul
- `AgentLayoutEnhanced.tsx` → menu "Pelatihan" di sidebar agen

### SQL yang Dibutuhkan
```sql
CREATE TABLE IF NOT EXISTS training_modules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (
    category IN ('product_knowledge','script_penjualan','sop','regulasi','lainnya')
  ),
  content_type TEXT NOT NULL CHECK (content_type IN ('text','video','pdf','mixed')),
  content_url TEXT,
  content_text TEXT,
  duration_minutes INTEGER,
  is_mandatory BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_quizzes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- [{text, is_correct}]
  explanation TEXT,
  order_index INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS agent_training_progress (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  module_id UUID NOT NULL REFERENCES training_modules(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'not_started'
    CHECK (status IN ('not_started','in_progress','completed','failed')),
  quiz_score INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(agent_id, module_id)
);
```

### File yang Dimodifikasi / Dibuat
| File | Aksi |
|------|------|
| `src/pages/admin/AdminTraining.tsx` | **BARU** — kelola modul + quiz + progress agen |
| `src/pages/agent/AgentTraining.tsx` | **BARU** — portal belajar agen + quiz + sertifikat |
| `src/pages/agent/AgentDashboard.tsx` | Widget progress pelatihan |
| `src/pages/admin/AdminAgents.tsx` | Kolom sertifikat + progress |
| `src/pages/branch/BranchAgen.tsx` | Filter agen berdasarkan status pelatihan |
| `src/pages/agent/AgentLayoutEnhanced.tsx` | Menu "Pelatihan" |
| `src/routes/AdminRoutes.tsx` | Daftarkan `/admin/training` |
| `src/routes/AgentRoutes.tsx` | Daftarkan `/agent/training` |

---

## FITUR 08 — Video Testimoni & 360° Hotel di Website Publik
> **Prioritas: MENENGAH** | Dampak: Konversi, kepercayaan calon jamaah

### Masalah Saat Ini
- `/testimonials` hanya teks, tidak ada video
- Halaman paket tidak ada preview visual hotel Makkah/Madinah
- Tidak ada manajemen konten video dari admin

### Solusi — Integrasi Lintas Role

#### 🔴 Admin — Kelola Video & Virtual Tour (`/admin/media-gallery`)
- File: `src/pages/admin/AdminMediaGallery.tsx`
- Tab "Video Testimoni": input URL YouTube/Vimeo, thumbnail, nama jamaah, paket, durasi
- Tab "Virtual Tour Hotel": embed 360° viewer (Google Street View URL atau Matterport)
- Tab "Foto Hotel": galeri foto per hotel, dikaitkan ke hotel di `hotels` table
- Aktifkan/nonaktifkan konten dari UI

#### 🔴 Website Publik — Testimoni Video (`/testimonials`)
- Upgrade `src/pages/public/Testimonials.tsx` (atau buat baru)
- Grid: testimoni teks + kartu video YouTube embed
- Filter: tipe paket, tahun keberangkatan

#### 🔴 Website Publik — Detail Paket + 360° Hotel
- Halaman `/packages/:idSlug` — tambah section "Lihat Hotel"
- Embed iframe 360° virtual tour dari data yang diinput admin
- Carousel foto hotel dari `media_gallery`

#### 🔗 Titik Integrasi
- `AdminHotels.tsx` → tab "Galeri & Virtual Tour" per hotel
- `AdminPackageDetail.tsx` → pilih hotel yang mana yang tampilkan virtual tour
- `PublicPackageDetail.tsx` → section hotel dengan foto + virtual tour

### SQL yang Dibutuhkan
```sql
CREATE TABLE IF NOT EXISTS media_gallery (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('video_testimonial','virtual_tour','hotel_photo')),
  title TEXT,
  description TEXT,
  media_url TEXT NOT NULL, -- YouTube URL, 360 URL, atau Supabase Storage URL
  thumbnail_url TEXT,
  hotel_id UUID REFERENCES hotels(id) ON DELETE SET NULL,
  package_id UUID REFERENCES packages(id) ON DELETE SET NULL,
  jamaah_name TEXT, -- untuk video testimoni
  departure_year INTEGER,
  duration_seconds INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  order_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON media_gallery(type);
CREATE INDEX ON media_gallery(hotel_id);
CREATE INDEX ON media_gallery(package_id);
```

### File yang Dimodifikasi / Dibuat
| File | Aksi |
|------|------|
| `src/pages/admin/AdminMediaGallery.tsx` | **BARU** — kelola video + virtual tour |
| `src/pages/public/Testimonials.tsx` | Upgrade: tambah section video |
| `src/pages/public/PublicPackageDetail.tsx` | Tambah section virtual tour hotel |
| `src/pages/admin/AdminHotels.tsx` | Tab galeri & virtual tour per hotel |
| `src/routes/AdminRoutes.tsx` | Daftarkan `/admin/media-gallery` |

---

## FITUR 09 — Jaringan Sub-Agen Multi-Level
> **Prioritas: RENDAH** | Dampak: Pertumbuhan jaringan, pendapatan komisi bertingkat

### Masalah Saat Ini
- `AgentNetwork.tsx` sudah ada tapi belum ada sistem rekrut + komisi bertingkat
- Sub-agen bisa daftar tapi tidak ada tracking komisi override dari booking sub-agen

### Solusi — Integrasi Lintas Role

#### 🔄 Portal Agen — Rekrut Sub-Agen (`/agent/network`)
- **`AgentNetwork.tsx`** — tambah:
  - Form undang sub-agen via email/WA (link registrasi dengan ref agen)
  - Struktur pohon visual (tree view) jaringan sub-agen
  - Performa sub-agen: booking bulan ini, komisi yang dihasilkan
  - Komisi override: % dari booking sub-agen yang masuk ke agen senior

#### 🔴 Admin — Kelola Hierarki Agen
- **`AdminAgents.tsx`** — tambah kolom "Agen Induk" + tampilkan pohon jaringan
- Konfigurasi komisi override: super_admin set % per level

#### 🔗 Titik Integrasi
- `AdminCommissions.tsx` → kalkulasi otomatis komisi bertingkat saat booking dikonfirmasi
- `AgentCommissions.tsx` → breakdown: komisi langsung + komisi override dari sub-agen
- `BranchAgen.tsx` → tampilkan jaringan sub-agen per agen binaan cabang
- `AgentDashboard.tsx` → widget "Jaringan Saya: X agen, Y booking bulan ini"

### SQL yang Dibutuhkan
```sql
ALTER TABLE agents ADD COLUMN IF NOT EXISTS parent_agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;
ALTER TABLE agents ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

CREATE TABLE IF NOT EXISTS agent_override_commissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id), -- agen yang dapat override
  sub_agent_id UUID NOT NULL REFERENCES agents(id), -- agen yang buat booking
  override_percentage NUMERIC(5,2) NOT NULL,
  override_amount NUMERIC(15,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### File yang Dimodifikasi / Dibuat
| File | Aksi |
|------|------|
| `src/pages/agent/AgentNetwork.tsx` | Upgrade: tree view + rekrut + performa sub-agen |
| `src/pages/admin/AdminAgents.tsx` | Kolom agen induk + pohon jaringan |
| `src/pages/agent/AgentCommissions.tsx` | Tambah komisi override dari sub-agen |
| `src/hooks/useAgentNetwork.ts` | **BARU** — hook tree jaringan + komisi bertingkat |

---

## FITUR 10 — Kalkulator Berat Bagasi Mandiri Jamaah
> **Prioritas: RENDAH** | Dampak: Kenyamanan jamaah, cegah overweight di bandara

### Masalah Saat Ini
- `JamaahBagasi.tsx` hanya tracking status kiriman bagasi dari admin
- Tidak ada kalkulator mandiri: jamaah input daftar bawaan → estimasi berat

### Solusi — Integrasi Lintas Role

#### 🔄 Portal Jamaah (`/jamaah/bagasi`)
- **`JamaahBagasi.tsx`** — tambah tab "Kalkulator Bawaan":
  - Input daftar barang + berat estimasi (database referensi berat barang umum)
  - Hitung total vs kuota bagasi (dari data booking jamaah)
  - Warning jika mendekati atau melebihi kuota
  - Rekomendasi: barang yang bisa ditinggal/dikirim terpisah

#### 🔗 Titik Integrasi
- `AdminBookingDetail.tsx` → input kuota bagasi yang diizinkan per jamaah
- `AdminDepartureDetail.tsx` → lihat estimasi total bagasi seluruh jamaah (untuk koordinasi maskapai)
- Data kuota bagasi dari tabel `bookings` (tambah kolom `bagasi_kg_allowed`)

### SQL yang Dibutuhkan
```sql
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS bagasi_kg_allowed INTEGER DEFAULT 23;

CREATE TABLE IF NOT EXISTS baggage_reference_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  estimated_weight_kg NUMERIC(5,2) NOT NULL,
  is_mandatory BOOLEAN DEFAULT FALSE
);

-- Seed data barang umum
INSERT INTO baggage_reference_items (name, category, estimated_weight_kg, is_mandatory) VALUES
  ('Koper besar (kosong)', 'koper', 3.5, true),
  ('Baju ihram + sabuk', 'pakaian', 0.8, true),
  ('Al-Quran', 'ibadah', 0.5, false),
  ('Sajadah travel', 'ibadah', 0.3, false),
  ('Sandal', 'alas_kaki', 0.4, true),
  ('Obat-obatan pribadi', 'kesehatan', 0.5, false)
ON CONFLICT DO NOTHING;
```

### File yang Dimodifikasi / Dibuat
| File | Aksi |
|------|------|
| `src/pages/jamaah/JamaahBagasi.tsx` | Tambah tab kalkulator bawaan |
| `src/pages/admin/AdminBookingDetail.tsx` | Input kuota bagasi per jamaah |
| `src/pages/admin/AdminDepartureDetail.tsx` | Widget total estimasi bagasi |
| `src/hooks/useBaggageCalculator.ts` | **BARU** — hook kalkulasi + referensi berat |

---

## Ringkasan — Semua File Baru yang Dibuat

### Halaman Baru
| File | Portal | URL |
|------|--------|-----|
| `JamaahSOSStatus.tsx` | Jamaah | `/jamaah/sos-status` |
| `MuthawifSOS.tsx` | Muthawif | `/muthawif/sos` |
| `AdminSISKOHAT.tsx` | Admin | `/admin/siskohat` |
| `AdminApprovals.tsx` | Admin | `/admin/approvals` |
| `BranchApprovals.tsx` | Cabang | `/cabang/approvals` |
| `CustomerRefundStatus.tsx` | Customer | `/customer/refund-status` |
| `AdminVendorContracts.tsx` | Admin | `/admin/vendor-contracts` |
| `AdminTraining.tsx` | Admin | `/admin/training` |
| `AgentTraining.tsx` | Agen | `/agent/training` |
| `AdminMediaGallery.tsx` | Admin | `/admin/media-gallery` |

### Hook Baru
| File | Fungsi |
|------|--------|
| `useVisaStatusUpdate.ts` | Update visa + notif + WA + log |
| `useApprovalWorkflow.ts` | Logika multi-level approval |
| `useDepartureBudget.ts` | CRUD budget + variance kalkulasi |
| `useAgentNetwork.ts` | Tree jaringan sub-agen + komisi |
| `useBaggageCalculator.ts` | Kalkulator bagasi + referensi berat |

---

## Ringkasan — Tabel Database Baru

| Tabel | Fitur |
|-------|-------|
| `visa_status_logs` | Riwayat perubahan status visa |
| `siskohat_sync_logs` | Log export SISKOHAT |
| `approval_requests` | Request approval semua tipe |
| `approval_actions` | Audit trail aksi per approval |
| `approval_configs` | Konfigurasi aturan approval |
| `vendor_contracts` | Kontrak per vendor |
| `departure_budgets` | Budget per kategori per keberangkatan |
| `training_modules` | Modul pelatihan agen |
| `training_quizzes` | Soal quiz per modul |
| `agent_training_progress` | Progress belajar per agen |
| `media_gallery` | Video testimoni + virtual tour |
| `agent_override_commissions` | Komisi bertingkat sub-agen |
| `baggage_reference_items` | Referensi berat barang bawaan |

> **Kolom tambahan di tabel existing:**
> `sos_alerts.assigned_muthawif_id`, `customers.nomor_porsi_haji`, `customers.embarkasi_kode`,
> `bookings.bagasi_kg_allowed`, `agents.parent_agent_id`, `agents.level`

---

## Urutan Eksekusi Pengerjaan

```
BATCH 1 (Dikerjakan Bersamaan — Independen):
  → FITUR 01: SOS Real-time
  → FITUR 02: Notifikasi Visa Otomatis

BATCH 2 (Setelah Batch 1 selesai):
  → FITUR 03: SISKOHAT Kemenag
  → FITUR 04: Approval Workflow

BATCH 3:
  → FITUR 05: Kontrak Vendor
  → FITUR 06: Budget vs Realisasi

BATCH 4:
  → FITUR 07: Modul Pelatihan Agen
  → FITUR 08: Video & Virtual Tour

BATCH 5 (Setelah semua di atas selesai):
  → FITUR 09: Sub-Agen Multi-Level
  → FITUR 10: Kalkulator Bagasi
```

---

## Catatan Teknis Umum

- Semua tabel baru: **wajib aktifkan RLS** + buat policy per role
- Semua INSERT notifikasi: lewat `useAdminNotifications.ts` — tambahkan tipe baru, jangan buat channel terpisah
- Routing: lazy import di file Routes, daftarkan di menu `menu_items` via SQL seed
- WhatsApp: gunakan pola `whatsapp-notifier.ts` yang sudah ada
- PDF/Excel: gunakan `jspdf` + `jspdf-autotable` / `xlsx` yang sudah terinstall
- Semua halaman baru harus: **mobile-responsive**, **dark mode ready**, **loading skeleton**
- TypeScript: gunakan `(supabase as any)` untuk tabel baru yang belum di-type database
- Setiap fitur baru: tambahkan permission key di `src/lib/permissions.ts`
