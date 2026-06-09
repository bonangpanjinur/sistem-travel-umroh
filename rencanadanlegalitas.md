# Rencana & Analisis: Fitur Dokumen & Legalitas

> Dokumen ini mencatat status fitur yang sudah ada, kekurangan, fitur yang harus ditambahkan, dan prioritas pengerjaan untuk modul **Dokumen & Legalitas** di portal admin Vinstour Travel.
>
> **Tanggal review:** 9 Juni 2026

---

## 1. Inventaris Fitur yang SUDAH Ada

| No | Fitur | Halaman/Route | Status |
|----|-------|---------------|--------|
| 1 | Generator PDF (7 jenis dokumen) | `/admin/documents-generator` | ✅ Berjalan |
| 2 | Verifikasi dokumen upload jamaah | `/admin/document-verification` | ✅ Berjalan |
| 3 | Manajemen jenis dokumen (CRUD) | `/admin/document-types` | ✅ Berjalan |
| 4 | Tracker kadaluarsa paspor & visa | `/admin/document-expiry-tracker` | ✅ Berjalan |
| 5 | Daftar jamaah dokumen belum lengkap | `/admin/documents-incomplete` | ⚠️ Parsial |
| 6 | Editor template invoice (multi-template) | `/admin/invoice-template` | ✅ Berjalan |
| 7 | PDF Layout Editor global + per-dokumen | `/admin/pdf-layout` | ✅ Berjalan |
| 8 | Riwayat dokumen per booking | `BookingDocumentHistory` (komponen) | ✅ Berjalan |
| 9 | Tombol aksi dokumen di booking detail | `BookingDocumentActions` (komponen) | ✅ Berjalan |
| 10 | Quick Invoice Sheet | `QuickInvoiceSheet` (komponen) | ✅ Berjalan |

### 1.1 Dokumen yang Bisa Di-generate Saat Ini

| Dokumen | Tab Generator | Kirim Email | Bulk |
|---------|--------------|-------------|------|
| Surat Izin Jamaah | `JamaahLeaveTab` | ✅ | ✅ |
| Surat Izin Karyawan | `EmployeeLeaveTab` | ✅ | ❌ |
| Surat Pengantar Paspor | `PassportLetterTab` | ✅ | ✅ |
| Invoice / Kwitansi | `InvoiceTab` | ✅ | ✅ |
| E-Ticket | `ETicketTab` | ✅ | ✅ |
| Sertifikat Umrah | `CertificateTab` | ✅ | ✅ |
| Surat Umum (bebas) | `GeneralLetterTab` | ✅ | ❌ |

---

## 2. Kekurangan & Gap yang Ditemukan

### 2.1 Desain & Kustomisasi Dokumen

| # | Kekurangan | Detail |
|---|-----------|--------|
| D1 | **Template hanya untuk Invoice** | Hanya Invoice yang punya editor visual template tersimpan. Surat izin, e-ticket, sertifikat, surat paspor, surat umum semuanya hardcoded di `document-generator.ts` — tidak bisa dikustomisasi tanpa mengubah kode |
| D2 | **Tidak ada sistem template per tipe dokumen** | Tidak bisa menyimpan beberapa variasi template (misal: template Surat Paspor versi A dan B), lalu memilih saat generate |
| D3 | **Tidak ada WYSIWYG drag-and-drop** | Pengguna tidak bisa menggeser elemen, mengubah posisi, atau menambah kotak/garis bebas di dokumen |
| D4 | **Pilihan ukuran kertas terbatas** | PDF Layout Editor ada orientasi portrait/landscape, tapi tidak ada pilihan ukuran kertas F4 (Folio) atau Letter — padahal dokumen resmi pemerintah Indonesia banyak yang pakai F4 |
| D5 | **Tidak ada font Arab/Islam** | Dokumen umroh/haji sering perlu tulisan Arab (Bismillah, doa, kalimat syahadat) — tidak tersedia |
| D6 | **Tidak bisa tambah elemen bebas** | Tidak ada fitur insert gambar, QR code, barcode, tabel, atau kotak teks bebas di luar struktur yang sudah ditentukan |

### 2.2 Branding Per Cabang & Agen

| # | Kekurangan | Detail |
|---|-----------|--------|
| B1 | **Tidak ada letterhead per cabang** | Semua dokumen menggunakan kop surat pusat Vinstour. Cabang di kota berbeda tidak bisa punya kop surat dengan alamat, nomor telepon, dan logo cabang sendiri |
| B2 | **Tidak ada upload tanda tangan per cabang** | Tanda tangan pimpinan cabang tidak bisa diupload dan di-embed otomatis ke dokumen — masih harus tanda tangan manual setelah print |
| B3 | **Logo tidak bisa berbeda per cabang** | Jika ada cabang yang punya brand/logo berbeda (franchise/mitra), tidak bisa disetel |
| B4 | **Tidak ada pengaturan warna per cabang** | Setiap cabang tidak bisa punya tema warna sendiri di dokumen |
| B5 | **Stempel/cap instansi tidak ada** | Tidak ada fitur upload stempel resmi dan embed ke PDF |

### 2.3 Koneksi ke Akun Agen & Cabang

| # | Kekurangan | Detail |
|---|-----------|--------|
| A1 | **Agen tidak bisa generate dokumen sendiri** | Portal agen tidak punya fitur generate dokumen — agen harus minta ke admin pusat |
| A2 | **Invoice tidak menampilkan nama agen** | Invoice yang dibuat tidak mencantumkan siapa agen yang merujuk/menangani booking, padahal ini penting untuk transparansi komisi |
| A3 | **Generator tidak bisa filter per agen/cabang** | Ketika bulk generate, tidak ada filter untuk generate dokumen khusus untuk jamaah dari agen X atau cabang Y |
| A4 | **Dokumen belum terhubung ke komisi agen** | Kwitansi tidak otomatis mencatat komponen komisi agen yang perlu dikurangkan dari total penerimaan |
| A5 | **Sub-agen tidak bisa tracking dokumen jamaah mereka** | Sub-agen tidak tahu apakah jamaah yang mereka daftarkan sudah upload dokumen atau belum |

### 2.4 Upload & Manajemen Dokumen Jamaah

| # | Kekurangan | Detail |
|---|-----------|--------|
| U1 | **Dokumen belum lengkap hanya cek KTP & Paspor** | `AdminIncompleteDocuments` hanya memeriksa KTP dan paspor — tidak cek foto 3x4, visa, surat mahram, dokumen vaksin, surat keterangan sehat, dsb. |
| U2 | **Tidak ada bulk verify** | Harus klik Approve satu per satu. Tidak bisa centang banyak dokumen lalu verify sekaligus |
| U3 | **Admin tidak bisa upload dokumen atas nama jamaah** | Jika jamaah membawa dokumen fisik ke kantor, admin tidak bisa upload ke akun jamaah tersebut |
| U4 | **Preview dokumen tidak inline** | Harus buka URL baru untuk melihat dokumen — tidak bisa preview langsung di dalam halaman verifikasi |
| U5 | **Tidak ada kompresi/resize otomatis** | Jamaah yang upload foto besar (>10MB dari kamera HP) akan error — tidak ada resize otomatis di sisi server |
| U6 | **Tidak ada batas waktu upload** | Tidak ada deadline: "dokumen harus diupload paling lambat H-30 sebelum keberangkatan" |
| U7 | **Filter di halaman verifikasi kurang lengkap** | Hanya bisa filter status dan tipe, tidak bisa filter per keberangkatan, per cabang, atau per agen |

### 2.5 Pengiriman & Distribusi Dokumen

| # | Kekurangan | Detail |
|---|-----------|--------|
| P1 | **Tidak bisa kirim dokumen via WhatsApp** | Hanya ada opsi kirim via email — padahal mayoritas jamaah Indonesia lebih responsif di WhatsApp. Integrasi Fonnte untuk kirim PDF sudah ada di modul lain tapi belum dihubungkan ke generator dokumen |
| P2 | **Tidak ada bulk send ke semua jamaah per keberangkatan** | Tidak bisa "kirim e-ticket ke semua jamaah keberangkatan 15 Juni sekaligus via WA" |
| P3 | **Jamaah tidak bisa download sendiri dari portal** | Portal jamaah (`/jamaah-info`) tidak punya halaman untuk download dokumen mereka (e-ticket, invoice, sertifikat) — jamaah harus minta ke agen/admin |
| P4 | **Tidak ada delivery tracking** | Admin tidak tahu apakah jamaah sudah membuka email/WhatsApp yang berisi dokumen |
| P5 | **Tidak ada paket dokumen per keberangkatan** | Tidak ada fitur "bungkus semua dokumen jamaah departure X menjadi satu ZIP dan kirim" |

### 2.6 Reminder & Notifikasi

| # | Kekurangan | Detail |
|---|-----------|--------|
| R1 | **Tracker kadaluarsa tanpa auto-reminder** | Halaman Tracker Kadaluarsa sudah ada, tapi tidak ada trigger otomatis kirim WhatsApp/email/push ke jamaah yang paspornya akan expired dalam 60/30/14 hari |
| R2 | **Tidak ada reminder upload dokumen** | Tidak ada sistem yang otomatis mengingatkan jamaah: "Kamu belum upload KTP, silakan upload sebelum H-30" |
| R3 | **Agen tidak diinformasikan soal dokumen jamaahnya** | Agen tidak dapat notifikasi jika jamaah yang mereka daftarkan belum melengkapi dokumen |
| R4 | **Tidak ada eskalasi otomatis** | Jika H-7 dan jamaah masih belum upload dokumen, tidak ada eskalasi ke manager/supervisor |

### 2.7 Nomor & Kode Dokumen

| # | Kekurangan | Detail |
|---|-----------|--------|
| N1 | **Tidak ada sistem penomoran surat otomatis** | Surat-surat yang dibuat tidak punya nomor resmi otomatis (contoh: `001/VT/UMROH/VI/2026`). Admin harus isi manual atau tidak diisi sama sekali |
| N2 | **Tidak ada counter per tipe dokumen** | Tidak bisa lacak "sudah berapa surat izin yang dikeluarkan bulan ini" |
| N3 | **Tidak ada register surat** | Tidak ada buku register/log semua surat yang pernah diterbitkan, dengan nomor dan tanggal |

### 2.8 Keamanan & Legalitas

| # | Kekurangan | Detail |
|---|-----------|--------|
| K1 | **Tidak ada QR code verifikasi keaslian** | Dokumen yang dicetak tidak punya QR code yang bisa discan untuk membuktikan keasliannya. Rawan pemalsuan dokumen |
| K2 | **Tidak ada tanda tangan digital (e-signature)** | Jamaah harus tanda tangan fisik — tidak bisa tanda tangan digital di portal |
| K3 | **Tidak ada audit trail lengkap** | Tidak ada log: siapa yang generate dokumen, kapan, apakah diubah, siapa yang approve |
| K4 | **Watermark tidak ada** | Draft dokumen tidak ada watermark "DRAFT" atau "COPY" |

### 2.9 Jenis Dokumen yang Belum Ada Generator-nya

| # | Dokumen | Keperluan |
|---|---------|-----------|
| J1 | **Surat Mahram** | Wajib untuk jamaah wanita tanpa mahram — formatnya baku dari Kemenag |
| J2 | **Kontrak/Perjanjian Perjalanan** | Dokumen legal antara travel & jamaah yang perlu TTD kedua pihak |
| J3 | **Surat Keterangan Lunas** | Bukti pelunasan biaya paket perjalanan |
| J4 | **Surat Kuasa** | Untuk keperluan pengurusan dokumen atas nama jamaah |
| J5 | **Lembar Pernyataan Kesehatan** | Jamaah menyatakan kondisi kesehatannya sebelum berangkat |
| J6 | **Manifest Keberangkatan** | Manifest ada di modul operasional tapi tidak ter-link dari menu Dokumen |
| J7 | **Surat Keterangan Telah Ibadah** | Untuk jamaah yang butuh bukti sudah melaksanakan ibadah (keperluan kantor, dll) |
| J8 | **Itinerary Perjalanan Resmi** | Itinerary ada di modul paket tapi tidak ada generator PDF yang bisa dikustom dan dikirim ke jamaah |

---

## 3. Daftar Fitur yang Harus Ditambahkan

### PRIORITAS 1 — Tinggi (Langsung Berpengaruh ke Operasional)

| ID | Fitur | Alasan Prioritas Tinggi |
|----|-------|------------------------|
| **F-01** | **Template desain per tipe dokumen** | Saat ini hanya invoice yang bisa dikustomisasi. Surat izin, e-ticket, sertifikat semua hardcoded. Admin perlu bisa ganti warna, font, posisi elemen tanpa coding |
| **F-02** | **Branding & letterhead per cabang** | Cabang yang berbeda kota butuh kop surat dengan alamat dan nomor telepon masing-masing. Tanpa ini semua dokumen terlihat dari pusat |
| **F-03** | **Upload tanda tangan & stempel per cabang** | Agar dokumen bisa langsung dicetak dan sah tanpa TTD manual — sangat umum di travel umroh profesional |
| **F-04** | **Kirim dokumen via WhatsApp (Fonnte)** | Mayoritas jamaah tidak buka email. Integrasi WA sudah ada, tinggal dihubungkan ke generator dokumen |
| **F-05** | **Jamaah bisa download dokumen di portal** | Portal jamaah perlu halaman "Dokumen Saya" — download e-ticket, invoice, sertifikat — tanpa harus minta ke agen/admin |
| **F-06** | **Auto-reminder kadaluarsa paspor/visa** | Tracker sudah ada tapi tidak ada aksi otomatis. Perlu cron job + WA/push ke jamaah & agen saat H-90, H-60, H-30 |
| **F-07** | **Auto-reminder upload dokumen belum lengkap** | Push/WA otomatis ke jamaah yang belum upload dokumen wajib sesuai deadline keberangkatan |
| **F-08** | **Bulk verify dokumen** | Checkbox multi-select di halaman verifikasi, lalu verify/reject sekaligus — sangat hemat waktu saat musim ramai |
| **F-09** | **Filter verifikasi per cabang & keberangkatan** | Staf cabang hanya perlu lihat dokumen jamaah yang masuk dari cabangnya, bukan semua |
| **F-10** | **Sistem penomoran surat otomatis** | Generator nomor resmi: `{kode}/{dept}/{jenis}/{bulan-romawi}/{tahun}` — tersimpan di database agar tidak dobel |

### PRIORITAS 2 — Sedang (Meningkatkan Kualitas Layanan)

| ID | Fitur | Keterangan |
|----|-------|-----------|
| **F-11** | **Portal agen: generate dokumen** | Agen bisa generate e-ticket, invoice, surat izin untuk jamaah yang mereka kelola — tanpa perlu telepon admin pusat |
| **F-12** | **Invoice mencantumkan nama agen & komisi** | Otomatis isi nama agen, kode agen, dan (opsional) besaran komisi di invoice |
| **F-13** | **Bulk send per keberangkatan** | "Kirim e-ticket ke semua jamaah departure 15 Juni via WhatsApp sekaligus" |
| **F-14** | **Generator Surat Mahram** | Format baku Kemenag — diisi otomatis dari data jamaah, tinggal cetak |
| **F-15** | **Generator Kontrak/Perjanjian Perjalanan** | Template kontrak dengan data booking otomatis, bisa e-sign jamaah di portal |
| **F-16** | **Generator Surat Keterangan Lunas** | Auto-generate saat payment_status = `paid` |
| **F-17** | **Upload dokumen oleh admin atas nama jamaah** | Admin bisa upload dokumen fisik jamaah yang datang ke kantor |
| **F-18** | **Preview inline di halaman verifikasi** | Lihat dokumen langsung di dalam modal — tanpa buka tab baru |
| **F-19** | **Deadline upload dengan notifikasi** | Setiap keberangkatan bisa diset deadline dokumen, jamaah diingatkan secara otomatis |
| **F-20** | **Sub-agen bisa tracking dokumen jamaahnya** | Halaman di portal sub-agen: daftar jamaah + status kelengkapan dokumen |

### PRIORITAS 3 — Rendah (Nice-to-Have, Jangka Panjang)

| ID | Fitur | Keterangan |
|----|-------|-----------|
| **F-21** | **QR code verifikasi keaslian dokumen** | QR di setiap dokumen, scan untuk verifikasi — mencegah pemalsuan |
| **F-22** | **E-signature jamaah di portal** | Jamaah tanda tangan digital di layar HP untuk kontrak perjalanan |
| **F-23** | **Audit trail dokumen** | Log lengkap: siapa generate, siapa kirim, kapan dibuka/download |
| **F-24** | **Kompresi file otomatis** | Resize foto yang diupload jamaah secara otomatis di server (misal max 2MB) |
| **F-25** | **Support ukuran F4 / Folio** | Untuk dokumen resmi pemerintah yang mensyaratkan kertas F4 |
| **F-26** | **Font Arab (latin transliterasi)** | Bismillah, doa perjalanan, dll — berguna untuk e-ticket dan sertifikat bernuansa islami |
| **F-27** | **Generator Itinerary PDF** | Bisa dikustomisasi per paket, include gambar destinasi, jadwal sholat, info hotel |
| **F-28** | **Watermark DRAFT / COPY** | Dokumen draft diberi watermark otomatis, dokumen final bersih |
| **F-29** | **Register surat (buku arsip digital)** | Semua dokumen yang pernah diterbitkan tercatat dengan nomor, tipe, tanggal, penerima |
| **F-30** | **Bulk download ZIP per keberangkatan** | Admin bisa download semua dokumen jamaah dalam satu keberangkatan sebagai ZIP |
| **F-31** | **Lembar Pernyataan Kesehatan** | Formulir kesehatan jamaah yang bisa diisi & ditandatangani digital |
| **F-32** | **Integrasi visa guide** | Panduan visa per negara tujuan — diupload oleh admin, bisa didownload jamaah |
| **F-33** | **Delivery tracking dokumen** | Tahu apakah WhatsApp/email yang berisi dokumen sudah dibuka jamaah |
| **F-34** | **Export Word (.docx)** | Untuk dokumen yang perlu diedit manual setelah generate (kontrak khusus, dll) |

---

## 4. Prioritas Sprint yang Disarankan

### Sprint DOC-1 (2 minggu) — Operasional Mendesak ✅ SELESAI
```
✅ F-04  Kirim dokumen via WhatsApp (Fonnte integration)
✅ F-05  Portal jamaah: halaman "Dokumen Saya" (JamaahDocuments)
✅ F-08  Bulk verify dokumen (checkbox multi-select + bulk action)
✅ F-09  Filter verifikasi per cabang & keberangkatan
✅ F-10  Penomoran surat otomatis (get_next_document_number RPC)
```

### Sprint DOC-2 (2 minggu) — Branding & Koneksi Cabang ✅ SELESAI
```
✅ F-02  Branding & letterhead per cabang
         → Tabel branches ditambah kolom: logo_url, letterhead_data
         → UI: BranchBrandingTab.tsx + tab "Branding" di AdminBranchDetail
✅ F-03  Upload tanda tangan & stempel per cabang
         → Tabel branches ditambah kolom: signature_url, stamp_url
         → UI: upload TTD & stempel di BranchBrandingTab (Supabase Storage)
✅ F-01  Template desain per tipe dokumen
         → Tabel: document_templates (CRUD penuh)
         → Halaman: AdminDocumentTemplates.tsx
         → Route: /admin/document-templates
✅ F-12  Invoice mencantumkan nama agen
         → InvoiceDataExtended ditambah agentName & agentCode
         → AdminDocumentGenerator.tsx fetch agent saat generate invoice
         → document-generator.ts render blok agen di PDF (warna amber)
```

### Sprint DOC-3 (2 minggu) — Generator Baru & Reminder ✅ SELESAI
```
✅ F-06  Auto-reminder kadaluarsa paspor/visa via WhatsApp (Fonnte)
         → Backend: POST /api/reminders/document-expiry (threshold + type filter)
         → Frontend: WA Reminder Panel di AdminDocumentExpiryTracker
         → State: reminderThreshold (30/60/90), reminderDocType (all/passport/visa)
         → Log: whatsapp_logs (trigger_type: document_expiry_*)
⏸  F-07  Auto-reminder upload dokumen (belum dikerjakan, masuk backlog)
✅ F-14  Generator Surat Mahram
         → generateSuratMahram() di document-generator.ts
         → MahramLetterTab.tsx (form: data jamaah + mahram + info trip)
         → Tab "Surat Mahram" di AdminDocumentGenerator
         → Nomor surat otomatis (prefix MAHRAM)
⏸  F-15  Generator Kontrak/Perjanjian Perjalanan (belum dikerjakan, masuk backlog)
✅ F-16  Generator Surat Keterangan Lunas
         → generateSuratLunas() di document-generator.ts (dengan cap LUNAS)
         → LunasLetterTab.tsx (reuse invoiceBookings, filter paid only)
         → Tab "Ket. Lunas" di AdminDocumentGenerator
         → Nomor surat otomatis (prefix LUNAS)
```

### Sprint DOC-4 (2 minggu) — Portal Agen & Distribusi
```
F-11  Portal agen: generate dokumen
F-13  Bulk send per keberangkatan
F-17  Admin upload dokumen atas nama jamaah
F-19  Deadline upload + notifikasi
F-20  Sub-agen tracking dokumen jamaah
```

### Sprint DOC-5 (3 minggu) — Keamanan & Fitur Lanjutan
```
F-21  QR code verifikasi keaslian
F-22  E-signature jamaah
F-23  Audit trail dokumen
F-24  Kompresi file otomatis
F-27  Generator Itinerary PDF
```

---

## 5. Catatan Teknis Penting

### Database yang Perlu Ditambahkan
```sql
-- Tabel penomoran surat otomatis
CREATE TABLE document_numbering (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year        int NOT NULL,
  month       int NOT NULL,
  doc_type    text NOT NULL,  -- 'surat_izin', 'invoice', 'kontrak', dll
  branch_id   uuid REFERENCES branches(id),
  last_number int NOT NULL DEFAULT 0,
  UNIQUE(year, month, doc_type, branch_id)
);

-- Template per tipe dokumen per cabang
CREATE TABLE document_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_type      text NOT NULL,
  branch_id     uuid REFERENCES branches(id),
  name          text NOT NULL,
  is_default    boolean DEFAULT false,
  settings_json jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz DEFAULT now()
);

-- Tanda tangan & stempel per cabang
ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS signature_url    text,   -- URL gambar TTD pimpinan
  ADD COLUMN IF NOT EXISTS stamp_url        text,   -- URL gambar stempel
  ADD COLUMN IF NOT EXISTS letterhead_data  jsonb;  -- Alamat, telepon, email cabang untuk kop surat

-- Deadline dokumen per keberangkatan
ALTER TABLE departures
  ADD COLUMN IF NOT EXISTS document_deadline_days int DEFAULT 30;  -- H-30 sebelum berangkat

-- Log pengiriman dokumen
CREATE TABLE document_send_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid REFERENCES bookings(id),
  customer_id     uuid REFERENCES customers(id),
  doc_type        text NOT NULL,
  channel         text NOT NULL,  -- 'email', 'whatsapp', 'portal'
  sent_at         timestamptz DEFAULT now(),
  sent_by_user_id uuid,
  status          text DEFAULT 'sent',  -- 'sent', 'delivered', 'opened', 'failed'
  error_message   text
);
```

### Komponen yang Perlu Dibuat
- `BranchLetterheadEditor` — editor kop surat per cabang
- `SignatureUploader` — upload & crop TTD + stempel
- `DocumentNumberGenerator` — service penomoran otomatis
- `DocumentTemplateSelector` — pilih template saat generate
- `JamaahDocumentPortal` — halaman portal jamaah untuk download dokumen
- `AgentDocumentPortal` — halaman portal agen untuk generate & track dokumen jamaahnya

### Integrasi yang Perlu Disambungkan
- **Fonnte (WhatsApp)** — sudah ada di modul WA, perlu di-hook ke `sendDocument(booking, channel)`
- **Cron jobs** — tambah job "document-reminder" ke cron scheduler untuk auto-reminder kadaluarsa
- **Push notifications** — sudah ada sistem push, perlu listener untuk event dokumen belum lengkap

---

## 6. Ringkasan Eksekutif

**Total kekurangan ditemukan:** 43 item (6 kategori desain, 5 branding, 5 koneksi agen, 7 upload, 5 distribusi, 4 reminder, 3 penomoran, 4 keamanan, 8 jenis dokumen baru)

**Dampak terbesar jika tidak diperbaiki:**
1. Agen tidak bisa mandiri → beban admin pusat tinggi
2. Jamaah tidak tahu status dokumennya → banyak yang berangkat dengan dokumen kurang
3. Dokumen terlihat tidak profesional (kop surat pusat semua, tidak ada TTD, tidak ada nomor surat)
4. Distribusi dokumen masih manual (chat satu-satu) → tidak scalable

**Rekomendasi urutan sprint:** DOC-1 → DOC-2 → DOC-3 → DOC-4 → DOC-5
