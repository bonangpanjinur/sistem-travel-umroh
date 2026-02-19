
# Roadmap Penyempurnaan Menyeluruh - Fase 2

## Ringkasan

14 poin perbaikan yang mencakup website builder, multi-tenant branch/agent websites, penyempurnaan UX di berbagai modul, penambahan fitur keuangan, HR lengkap, dan konsolidasi fitur jamaah. Dibagi menjadi 8 blok kerja berurutan.

---

## BLOK A: Penyempurnaan Document Generator & Jamaah (Poin 4, 11)

### Masalah
- Document Generator sudah punya filter bertingkat (Paket -> Keberangkatan) tapi belum ada filter tambahan tahun/bulan
- Menu Dokumen (verifikasi) terpisah dari menu Jamaah, padahal lebih logis digabung
- Di halaman detail jamaah belum bisa langsung generate surat

### Rencana
1. **Tambah filter tahun & bulan** di Document Generator agar keberangkatan bisa disaring lebih spesifik
2. **Hapus menu "Dokumen" terpisah** dari sidebar admin, integrasikan verifikasi dokumen langsung ke halaman detail jamaah (sudah ada sebagian di `AdminCustomerDetail.tsx`)
3. **Tambah tombol "Generate Surat"** di halaman detail setiap jamaah -- dropdown pilih jenis surat (Cuti, Paspor, dll), lalu auto-fill data jamaah dan keberangkatan terkait
4. **Perbaikan UX**: Tambah search/filter di daftar jamaah per keberangkatan di document generator

### Detail Teknis
- Tambah state `filterYear` dan `filterMonth` untuk memfilter `allDepartures`
- Hapus route `/admin/documents` dan entry sidebar "Dokumen", pindahkan tab verifikasi ke `AdminCustomerDetail`
- Buat komponen `CustomerDocumentActions` dengan dropdown generate surat yang memanggil fungsi dari `document-generator.ts`
- Query `bookings` jamaah untuk mendapatkan `departure_id` terkait secara otomatis

---

## BLOK B: Penyempurnaan Booking & Pembayaran UX (Poin 6, 7)

### Masalah Booking
- Filter hanya status booking dan status pembayaran, belum ada filter paket, keberangkatan, tanggal, cabang
- Tampilan list kurang informatif

### Masalah Pembayaran
- Filter hanya status dan search text, belum ada filter metode pembayaran, rentang tanggal, rentang jumlah

### Rencana Booking
1. Tambah filter: **Paket**, **Keberangkatan**, **Rentang Tanggal Booking**, **Cabang**
2. Tampilkan filter panel yang lebih rapi dengan chip aktif
3. Perbaiki card booking agar lebih visual: progress bar pembayaran, highlight deadline
4. Tambah pagination (tampilkan 20 per halaman)

### Rencana Pembayaran
1. Tambah filter: **Metode Pembayaran**, **Rentang Tanggal**, **Rentang Jumlah**
2. Perbaiki tabel dengan row highlight untuk pending items
3. Tambah summary card untuk total per metode
4. Tampilkan bukti pembayaran inline (thumbnail)

### Detail Teknis
- Tambah state filter di `AdminBookings.tsx`: `packageFilter`, `departureFilter`, `dateRange`, `branchFilter`
- Query tetap client-side filtering (data < 1000 biasanya)
- Di `AdminPayments.tsx`: Tambah `methodFilter`, `dateRange`, `amountRange`
- Tambah komponen `FilterChips` untuk menampilkan filter aktif dengan tombol clear

---

## BLOK C: Penyempurnaan Paket (Poin 8, 9)

### Masalah
- Upload gambar paket hanya input URL, belum ada file upload + preview
- Form paket biasa dan tabungan menggunakan form yang sama, tipe "tabungan" tidak muncul di pilihan tipe paket

### Rencana
1. **Upload Gambar**: Ganti input URL dengan file upload ke bucket `website-assets`, tampilkan preview gambar
2. **Preview di Card**: Gambar yang diupload langsung tampil di card paket
3. **Pisahkan UX Tabungan**: Tampilkan field khusus tabungan (target tabungan, cicilan bulanan) saat tipe = tabungan
4. **Tambah opsi "tabungan"** di dropdown tipe paket
5. **Wizard/stepper**: Bagi form menjadi 2 langkah -- Info Dasar lalu Pricing & Detail

### Detail Teknis
- Buat fungsi upload ke bucket `website-assets` di `PackageForm.tsx`
- Tambah state `previewImage` untuk menampilkan preview sebelum submit
- Tambah conditional rendering field tabungan (target_amount, monthly_installment) saat `package_type === 'tabungan'`
- Pastikan `<SelectItem value="tabungan">Tabungan</SelectItem>` ada di pilihan tipe

---

## BLOK D: CRM Leads Penyempurnaan (Poin 5)

### Analisis Kekurangan CRM Saat Ini
1. **Kanban tidak bisa drag-and-drop** -- hanya bisa ubah status dari detail page atau tombol next
2. **Tidak ada reminder follow-up** -- follow_up_date ada tapi tidak ada notifikasi/highlight
3. **Riwayat interaksi** disimpan di field `notes` sebagai text biasa, sulit di-track
4. **Tidak ada assigned_to tracking** yang visible -- lead sudah bisa auto-assign tapi tidak terlihat siapa yang handle
5. **Filter di Kanban** terbatas -- belum ada filter sumber, tanggal, paket diminati
6. **Tidak ada estimasi nilai** -- belum bisa melihat total potensi revenue di pipeline
7. **Konversi** langsung dari detail page tapi belum smooth

### Rencana
1. **Highlight overdue follow-ups** -- warnai card merah jika follow_up_date sudah lewat
2. **Tampilkan assigned_to** di card lead (nama sales yang handle)
3. **Tambah filter** di Kanban: sumber, paket, assigned_to, tanggal
4. **Pipeline value** -- tampilkan total estimasi nilai per kolom kanban
5. **Quick action** di card lead: tombol telepon (tel:), WhatsApp (wa.me), email
6. **Activity timeline** terpisah dari notes -- buat tab timeline di detail
7. **Bulk action** -- select multiple leads untuk assign/ubah status massal

### Detail Teknis
- Tambah query JOIN profiles untuk `assigned_to` di lead list
- Hitung pipeline value dari `packages.price_quad` per `package_interest`
- Highlight logic: `follow_up_date < today && status not in ['won', 'lost']`
- Tambah filter state: `sourceFilter`, `packageFilter`, `assignedFilter`

---

## BLOK E: Keuangan - Input Kas & Gaji (Poin 10)

### Masalah
- Menu keuangan hanya ada P&L per keberangkatan dan Vendor
- Belum ada pencatatan kas umum, pengeluaran operasional, pendapatan lain, dan pembayaran gaji

### Rencana
1. **Buat tabel `cash_transactions`** -- untuk mencatat semua transaksi kas (pemasukan, pengeluaran, gaji)
2. **Halaman Kas & Keuangan** dengan tab:
   - **Kas Masuk/Keluar**: Form input transaksi, daftar transaksi, saldo kas
   - **Pembayaran Gaji**: Generate slip gaji per karyawan, bayar manual/batch
   - **Ringkasan**: Total pemasukan, pengeluaran, saldo per bulan
3. **Kategori Transaksi**: Operasional, Marketing, Gaji, Lain-lain (configurable)
4. **Export** laporan keuangan ke Excel

### Detail Teknis
- Tabel `cash_transactions`: id, transaction_date, type (income/expense), category, description, amount, reference_id, created_by, branch_id
- Tabel `salary_payments`: id, employee_id, period_month, period_year, base_salary, deductions, overtime_pay, total_pay, status, paid_at
- Halaman baru: `AdminFinanceCash.tsx`
- Tambah menu sidebar di grup Keuangan

---

## BLOK F: Agent & Sub-Agent Management (Poin 12)

### Masalah
- Admin hanya bisa melihat/toggle agent, tidak bisa tambah agent baru
- Belum ada konsep sub-agent
- Dashboard cabang belum bisa kelola agent

### Rencana
1. **Tambah tombol "Tambah Agent"** di halaman Admin Agents -- form registrasi agent oleh admin/staff
2. **Buat field `parent_agent_id`** di tabel agents untuk relasi sub-agent
3. **Admin bisa tambah agent + sub-agent** dengan pilih parent
4. **Dashboard cabang** bisa tambah agent yang otomatis terelasi dengan `branch_id` cabang
5. **Dashboard agent** hanya bisa tambah sub-agent (di bawah dirinya)
6. **Tampilkan hierarki** agent -> sub-agent di tabel admin

### Detail Teknis
- ALTER TABLE agents ADD COLUMN parent_agent_id UUID REFERENCES agents(id)
- Form "Tambah Agent": buat user baru + profile + user_role(agent) + agents record
- Filter agent by branch_id untuk dashboard cabang
- Di AgentDashboard: query sub-agents WHERE parent_agent_id = current_agent_id

---

## BLOK G: HR Lengkap (Poin 13)

### Masalah
- Departemen dan posisi hardcoded di frontend
- Jadwal kerja placeholder (belum implementasi)
- Tidak ada perhitungan gaji otomatis, potongan kehadiran, lembur
- Absensi foto wajah sudah ada tapi flow belum lengkap

### Rencana
1. **Tabel `departments`** dan **`positions`** -- dinamis, bisa dikelola admin
2. **Tabel `work_schedules`** -- hari kerja, jam masuk/keluar per karyawan/departemen
3. **Pengaturan kehadiran**: potongan per hari tidak masuk tanpa alasan (configurable)
4. **Pengaturan lembur**: rate lembur per jam, rate hari libur (1.5x, 2x)
5. **Tab Pengaturan HR** di halaman HR:
   - Kelola departemen & posisi
   - Atur jam kerja default
   - Atur potongan & lembur
6. **Auto-hitung gaji** berdasarkan kehadiran: gaji pokok - potongan + lembur
7. **Generate slip gaji** per bulan
8. **Tab Jadwal Kerja** -- tampilkan kalender kehadiran per karyawan

### Detail Teknis
- Tabel `departments` (id, name, code)
- Tabel `positions` (id, department_id, name, level)  
- Tabel `work_schedules` (id, employee_id, day_of_week, start_time, end_time, is_day_off)
- Tabel `hr_settings` (id, absent_deduction_per_day, overtime_rate_per_hour, holiday_overtime_multiplier, work_start_time, work_end_time)
- Tabel `salary_slips` (id, employee_id, period, base_salary, total_present, total_absent, total_late, total_overtime_hours, deductions, overtime_pay, net_salary)
- Implementasi perhitungan di frontend atau database function

---

## BLOK H: Website Builder & Multi-Tenant Website (Poin 1, 2, 3)

### Catatan
Ini adalah fitur terbesar dan paling kompleks. Drag-and-drop website builder dan multi-tenant website (setiap cabang/agent punya website sendiri) memerlukan arsitektur yang signifikan.

### Rencana Fase 1 (Realistis)
1. **Admin Appearance sudah ada** -- perkuat dengan:
   - Drag-and-drop reorder sections homepage (sudah ada sebagian di PageBuilder)
   - Tambah section types baru: Custom HTML, Galeri, Video, Counter
2. **Per-Branch/Agent Settings**: Duplikasi `website_settings` per branch_id/agent_id
3. **Subdomain routing**: `/branch/:slug` dan `/agent/:slug` menampilkan website versi branch/agent
4. **Default tampilan** dari settings utama, branch/agent bisa override

### Rencana Dashboard Cabang & Agent (Poin 3)
- Cabang: login, lihat data jamaah, input data, cek komisi agent, atur profil kantor
- Agent: login, lihat jamaah sendiri, cek komisi, tambah sub-agent, atur profil

### Detail Teknis
- Tambah kolom `branch_id` dan `agent_id` (nullable) di `website_settings` -- NULL = settings utama
- Route `/b/:branchSlug` dan `/a/:agentSlug` untuk website per entity
- `DynamicPublicLayout` query settings berdasarkan slug
- Dashboard cabang sudah ada route di `AdminRoutes`, perlu diperkaya kontennya

---

## Blok I: Analisis & Penyempurnaan Lainnya (Poin 14)

### Temuan dari Analisis Kode
1. **Bulk Actions di Booking** -- tombol sudah ada tapi fungsi masih placeholder ("Fitur segera hadir")
2. **Export button** di Booking dan Payment -- belum terimplementasi
3. **Jadwal Kerja** di HR -- tab ada tapi isinya placeholder
4. **Tipe paket "tabungan"** tidak muncul di pilihan form
5. **Lead Analytics** ada halaman tapi perlu dipastikan data akurat
6. **Sidebar nav** terlalu panjang, beberapa menu bisa dikelompokkan lebih baik

### Rencana
1. Implementasikan bulk actions yang sudah placeholder
2. Implementasikan export Excel/PDF yang sudah ada tombolnya
3. Pastikan semua halaman placeholder diisi konten yang berfungsi
4. Review dan fix minor bugs yang ditemukan

---

## Urutan Pengerjaan

| Prioritas | Blok | Fokus | Estimasi |
|-----------|------|-------|----------|
| 1 | Blok A | Document Generator + Jamaah consolidation | 2-3 pesan |
| 2 | Blok B | Booking & Payment UX | 2-3 pesan |
| 3 | Blok C | Paket (upload + tabungan) | 1-2 pesan |
| 4 | Blok D | CRM Leads penyempurnaan | 2-3 pesan |
| 5 | Blok E | Keuangan - Kas & Gaji | 2-3 pesan |
| 6 | Blok F | Agent & Sub-Agent | 1-2 pesan |
| 7 | Blok G | HR Lengkap | 3-4 pesan |
| 8 | Blok H | Website Builder & Multi-tenant | 3-5 pesan |
| 9 | Blok I | Fix placeholder & bugs | 1-2 pesan |

**Total estimasi: 17-27 pesan**

Rekomendasi: Mulai dari Blok A karena langsung memperbaiki pain point document generator dan konsolidasi menu jamaah. Kemudian lanjut Blok B-D untuk UX improvement yang berdampak langsung ke operasional harian.
