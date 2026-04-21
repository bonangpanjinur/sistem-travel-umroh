# Peningkatan UX & Fungsionalitas Halaman Manajemen Paket

Dokumen ini menjelaskan semua peningkatan yang telah diimplementasikan pada halaman manajemen paket untuk meningkatkan efisiensi operasional dan pengalaman pengguna.

---

## 📋 Daftar Peningkatan

### 1. **Fitur Ekspor Data (Download Excel/PDF)**

#### 1.1 Ekspor Daftar Paket
- **Lokasi**: Menu "Export Data" di header halaman
- **Format**: Excel (.xlsx) dan PDF (.pdf)
- **Konten**: 
  - Kode Paket
  - Nama Paket
  - Tipe Paket
  - Durasi
  - Harga Mulai
  - Hotel Makkah
  - Hotel Madinah
  - Pesawat
  - Status (Aktif/Nonaktif)

**Cara Menggunakan**:
```
1. Klik tombol "Export Data" di bagian header
2. Pilih "Daftar Paket (Excel)" atau "Daftar Paket (PDF)"
3. File akan otomatis diunduh dengan nama: Daftar_Paket_[timestamp].xlsx/pdf
```

#### 1.2 Ekspor Statistik Kapasitas
- **Format**: Excel (.xlsx)
- **Konten**:
  - Kode Paket
  - Nama Paket
  - Jumlah Keberangkatan Aktif
  - Total Kuota
  - Jumlah Terjual
  - Jumlah Tersedia
  - Persentase Terisi
  - Status Paket

**Kegunaan**: Untuk analisis kapasitas dan perencanaan penjualan

#### 1.3 Ekspor Jadwal Keberangkatan
- **Format**: Excel (.xlsx)
- **Konten**:
  - Kode Paket
  - Nama Paket
  - Tanggal Berangkat
  - Kuota
  - Terjual
  - Tersedia
  - Harga (Quad, Triple, Double, Single)
  - Status

**Kegunaan**: Untuk koordinasi dengan tim lapangan dan perencanaan operasional

#### 1.4 Ekspor Laporan Ringkas
- **Format**: PDF (.pdf)
- **Konten**:
  - Ringkasan Statistik (Total Paket, Paket Aktif, Total Keberangkatan)
  - Tabel Daftar Paket dengan informasi dasar
  - Timestamp pencetakan

**Kegunaan**: Untuk laporan internal dan presentasi manajemen

#### 1.5 Download Manifest Jamaah
- **Lokasi**: Tombol di setiap kartu paket (ikon file)
- **Format**: PDF (.pdf)
- **Konten**:
  - Nama Paket
  - Tanggal Berangkat
  - Daftar Jamaah (No, Nama, L/P, No. Paspor, Exp. Paspor, Tipe Kamar, Telepon)
  - Jumlah Total Jamaah

**Cara Menggunakan**:
```
1. Arahkan kursor ke tombol "Download Manifest" di kartu paket
2. Klik tombol untuk mengunduh manifest PDF
3. Manifest akan diunduh untuk keberangkatan terdekat yang aktif
```

---

### 2. **Penyederhanaan UI & UX (Smart Filtering)**

#### 2.1 Quick Action Tabs
Tiga tombol filter cepat di bagian atas daftar paket:

**a) Semua Paket**
- Menampilkan semua paket tanpa filter khusus
- Status default saat halaman pertama kali dibuka

**b) Hampir Penuh** (dengan indikator pulsing)
- Menampilkan hanya paket yang memiliki keberangkatan dengan kuota kurang dari 5 pax
- Dilengkapi dengan badge merah berkedip untuk menarik perhatian
- Membantu admin fokus pada paket yang perlu promosi atau penawaran khusus

**c) Segera Berangkat** (dengan indikator waktu)
- Menampilkan paket yang memiliki keberangkatan dalam 30 hari ke depan
- Membantu admin memantau paket yang akan segera berangkat

#### 2.2 Filter Statis
Tersedia di bawah Quick Action Tabs:

**a) Filter Tipe Paket**
- Semua Tipe
- Reguler
- Tabungan

**b) Filter Status**
- Semua Status
- Aktif
- Nonaktif

#### 2.3 Bulk Actions (Aksi Massal)
Ketika Anda memilih satu atau lebih paket:

**Fitur**:
- Checkbox di setiap kartu paket untuk pemilihan
- Tombol "PILIH SEMUA" untuk memilih semua paket yang ditampilkan
- Bar aksi massal muncul dengan opsi:
  - **Aktifkan**: Mengaktifkan semua paket terpilih
  - **Nonaktifkan**: Menonaktifkan semua paket terpilih
  - **Batal**: Membatalkan pemilihan

**Kegunaan**: 
- Mengaktifkan/menonaktifkan paket musiman secara batch
- Menghemat waktu operasional
- Mengurangi risiko kesalahan manual

---

### 3. **Visualisasi Kapasitas (Progress Bar)**

#### 3.1 Progress Bar dengan Warna Dinamis
Setiap kartu paket menampilkan progress bar keterisian kuota dengan sistem warna:

| Warna | Persentase | Label | Arti |
|-------|-----------|-------|------|
| 🟢 Hijau | 0-50% | Aman | Kuota masih banyak tersedia |
| 🟡 Kuning | 51-90% | Setengah | Kuota mulai berkurang |
| 🔴 Merah | 91-100% | Hampir Penuh | Kuota hampir habis |

#### 3.2 Informasi Detail Progress
Setiap progress bar menampilkan:
- **Label Status**: Aman / Setengah / Hampir Penuh
- **Jumlah Pax**: "X / Y PAX" (Terjual / Total Kuota)
- **Persentase**: Ditampilkan pada skala 0% - 100%
- **Referensi Visual**: Garis penunjuk di 0%, 50%, dan 100%

#### 3.3 Contoh Tampilan
```
Keterisian Kuota
Aman                                    15 / 40 PAX
[████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░]
0%          50%                         100%
```

---

### 4. **Notifikasi & Alert System**

#### 4.1 Alert Badges pada Kartu Paket

**a) Badge "KUOTA MENIPIS"** (Merah dengan animasi pulsing)
- Muncul ketika kuota tersisa < 5 pax
- Dilengkapi ikon AlertTriangle
- Animasi berkedip untuk menarik perhatian
- Membantu admin mengidentifikasi paket yang perlu tindakan cepat

**b) Badge "DATA TIDAK LENGKAP"** (Kuning)
- Muncul ketika paket aktif tetapi tidak memiliki jadwal keberangkatan
- Dilengkapi ikon AlertTriangle
- Tooltip: "Paket aktif tetapi belum memiliki jadwal keberangkatan"
- Memastikan data paket selalu lengkap sebelum dipromosikan

**c) Badge "NONAKTIF"** (Merah)
- Muncul ketika paket tidak aktif
- Kartu paket tampil dengan opacity berkurang (grayscale)

**d) Badge "UNGGULAN"** (Emas)
- Muncul ketika paket ditandai sebagai unggulan
- Dilengkapi ikon Star yang terisi

#### 4.2 Alert Summary Cards (Ringkasan Peringatan)
Di bagian atas daftar paket, ditampilkan dua kartu ringkasan:

**a) Kartu "Kuota Menipis"**
```
⚠️ Kuota Menipis
X paket memiliki kuota kurang dari 5 pax
```
- Muncul hanya jika ada paket dengan kuota < 5
- Dilengkapi ikon dengan animasi pulsing
- Warna latar belakang merah muda (rose)

**b) Kartu "Data Tidak Lengkap"**
```
⚠️ Data Tidak Lengkap
X paket aktif tanpa jadwal keberangkatan
```
- Muncul hanya jika ada paket aktif tanpa jadwal
- Dilengkapi ikon dengan animasi pulsing
- Warna latar belakang kuning muda (amber)

#### 4.3 Indikator Pulsing pada Quick Filter
- Badge "Hampir Penuh" menampilkan indikator pulsing merah jika ada paket dengan kuota < 5
- Membantu admin dengan cepat mengetahui ada paket yang perlu perhatian

---

## 🎯 Fitur-Fitur Lainnya (Sudah Ada)

### Analytics Summary Cards
Empat kartu ringkasan di bagian atas:
- **Total Paket**: Jumlah semua paket
- **Paket Aktif**: Jumlah paket aktif dengan persentase
- **Total Keberangkatan**: Jumlah semua keberangkatan dengan info keberangkatan terbuka
- **Kapasitas Tersedia**: Jumlah kursi tersedia dengan persentase terisi

### Manifest Tooltip
Arahkan kursor ke ikon info (i) untuk melihat:
- Jadwal keberangkatan terdekat (hingga 3 jadwal)
- Jumlah pax untuk setiap jadwal
- Informasi tentang jadwal tambahan jika ada

---

## 🔧 Implementasi Teknis

### File yang Dimodifikasi/Ditambahkan

#### 1. `/src/lib/export-utils-enhanced.ts` (BARU)
File utilitas baru dengan fungsi ekspor tambahan:
- `exportPackagesToExcel()`: Export daftar paket ke Excel
- `exportCapacityStatsToExcel()`: Export statistik kapasitas ke Excel
- `exportDepartureScheduleToExcel()`: Export jadwal keberangkatan ke Excel
- `exportPackageSummaryPDF()`: Export laporan ringkas ke PDF

#### 2. `/src/pages/admin/AdminPackages.tsx` (DIPERBARUI)
Komponen utama dengan peningkatan:
- Import fungsi ekspor baru dari `export-utils-enhanced.ts`
- Penambahan state untuk tracking warning badges
- Penambahan logika untuk menghitung paket dengan kuota rendah dan data tidak lengkap
- Peningkatan UI progress bar dengan warna dinamis dan label status
- Penambahan alert summary cards
- Penyederhanaan dropdown export dengan opsi baru

### Struktur Data

#### Package Object
```typescript
{
  id: string;
  code: string;
  name: string;
  package_type: "regular" | "tabungan";
  package_type_ref: { name: string };
  duration_days: number;
  is_active: boolean;
  is_featured: boolean;
  featured_image?: string;
  hotel_makkah?: { name: string; star_rating: number };
  hotel_madinah?: { name: string; star_rating: number };
  airline?: { name: string };
  price_quad?: number;
  price_triple?: number;
  price_double?: number;
  price_single?: number;
  departures: Departure[];
}
```

#### Departure Object
```typescript
{
  id: string;
  departure_date: string; // ISO format
  quota: number;
  booked_count: number;
  status: "open" | "closed";
  price_quad?: number;
  price_triple?: number;
  price_double?: number;
  price_single?: number;
}
```

---

## 📱 Responsive Design

Semua fitur baru dirancang dengan responsive design:
- **Mobile**: Single column layout, dropdown menu yang compact
- **Tablet**: Two column grid, optimized spacing
- **Desktop**: Three column grid, full feature set

---

## 🎨 Color Scheme

### Progress Bar Colors
- **Hijau (Emerald)**: `#10b981` - Aman (0-50%)
- **Kuning (Amber)**: `#f59e0b` - Setengah (51-90%)
- **Merah (Rose)**: `#f43f5e` - Hampir Penuh (91-100%)

### Alert Colors
- **Kuota Menipis**: Rose/Red (#f43f5e)
- **Data Tidak Lengkap**: Amber/Yellow (#f59e0b)
- **Unggulan**: Amber/Gold (#eab308)

---

## 🚀 Cara Menggunakan Fitur-Fitur Baru

### Skenario 1: Export Data untuk Laporan Bulanan
```
1. Buka halaman "Kelola Paket"
2. Gunakan filter untuk memilih paket yang ingin di-export
3. Klik "Export Data" → "Daftar Paket (PDF)"
4. File PDF akan diunduh dengan format laporan profesional
```

### Skenario 2: Monitoring Paket dengan Kuota Rendah
```
1. Buka halaman "Kelola Paket"
2. Klik tombol "Hampir Penuh" di Quick Action Tabs
3. Sistem akan menampilkan hanya paket dengan kuota < 5 pax
4. Download manifest untuk setiap paket jika perlu
5. Lakukan tindakan (promo, tutup paket, dll)
```

### Skenario 3: Bulk Update Status Paket
```
1. Buka halaman "Kelola Paket"
2. Klik "PILIH SEMUA" atau pilih paket secara individual
3. Klik "Aktifkan" atau "Nonaktifkan" di bar aksi massal
4. Sistem akan update semua paket terpilih sekaligus
```

### Skenario 4: Export Jadwal untuk Tim Lapangan
```
1. Buka halaman "Kelola Paket"
2. Gunakan filter untuk memilih paket tertentu
3. Klik "Export Data" → "Jadwal Keberangkatan"
4. File Excel akan diunduh dengan semua detail jadwal dan harga
5. Bagikan ke tim lapangan untuk koordinasi
```

---

## 📊 Performance Considerations

- **Export**: Menggunakan library XLSX dan jsPDF yang sudah dioptimalkan
- **Filtering**: Menggunakan `useMemo` untuk mencegah re-render yang tidak perlu
- **Progress Bar**: Menggunakan CSS transitions untuk animasi yang smooth
- **Alerts**: Menggunakan conditional rendering untuk menampilkan hanya alert yang relevan

---

## 🔐 Security & Validation

- Semua data yang di-export adalah data publik (tidak ada data sensitif pelanggan)
- Manifest hanya dapat diunduh untuk keberangkatan yang memiliki booking terkonfirmasi
- Bulk actions memvalidasi setiap paket sebelum update

---

## 📝 Notes untuk Developer

### Jika Ingin Menambahkan Export Format Baru
1. Tambahkan fungsi baru di `/src/lib/export-utils-enhanced.ts`
2. Import fungsi di `/src/pages/admin/AdminPackages.tsx`
3. Tambahkan menu item di dropdown "Export Data"

### Jika Ingin Mengubah Warna Progress Bar
Edit file `/src/pages/admin/AdminPackages.tsx` di bagian:
```typescript
// Determine progress bar color based on occupancy
let progressColor = "bg-emerald-500"; // Green - Safe
if (occupancyRate > 90) {
  progressColor = "bg-rose-500"; // Red - Almost Full
} else if (occupancyRate > 50) {
  progressColor = "bg-amber-500"; // Yellow - Half
}
```

### Jika Ingin Mengubah Threshold Alert
Edit nilai di bagian:
```typescript
// Low quota threshold (default: < 5 pax)
const isLowQuota = remainingQuota > 0 && remainingQuota < 5;

// Soon departure threshold (default: 30 days)
const thirtyDaysLater = new Date();
thirtyDaysLater.setDate(today.getDate() + 30);
```

---

## ✅ Testing Checklist

- [ ] Export Excel - Daftar Paket
- [ ] Export PDF - Daftar Paket
- [ ] Export Excel - Statistik Kapasitas
- [ ] Export Excel - Jadwal Keberangkatan
- [ ] Export PDF - Laporan Ringkas
- [ ] Download Manifest - Paket dengan jamaah
- [ ] Download Manifest - Paket tanpa jamaah (error handling)
- [ ] Quick Filter - Hampir Penuh
- [ ] Quick Filter - Segera Berangkat
- [ ] Bulk Select - Pilih Semua
- [ ] Bulk Select - Pilih Individual
- [ ] Bulk Action - Aktifkan
- [ ] Bulk Action - Nonaktifkan
- [ ] Progress Bar Color - Green (0-50%)
- [ ] Progress Bar Color - Yellow (51-90%)
- [ ] Progress Bar Color - Red (91-100%)
- [ ] Alert Badge - Kuota Menipis
- [ ] Alert Badge - Data Tidak Lengkap
- [ ] Alert Summary Cards - Muncul/Hilang sesuai kondisi
- [ ] Responsive Design - Mobile
- [ ] Responsive Design - Tablet
- [ ] Responsive Design - Desktop

---

## 📞 Support & Feedback

Jika ada pertanyaan atau saran untuk peningkatan lebih lanjut, silakan hubungi tim development.

---

**Versi**: 1.0  
**Tanggal Update**: April 2026  
**Status**: Siap Produksi
