# Rencana Perbaikan Operasional — Portal Umrah Haji

**Tanggal:** 4 Juni 2026  
**Fokus:** Operasional inti (Paket, Keberangkatan, Perlengkapan, Kamar, Booking)

---

## Analisis Masalah

### ❌ MASALAH KRITIS

#### 1. Modal "Tambah Jamaah Baru" — Tombol Terpotong
- `DialogContent` menggunakan `overflow-hidden` tanpa max-height yang responsif
- Form body tidak bisa di-scroll → tombol Simpan & Batal terpotong di bawah layar
- Terjadi di halaman Buat Booking (`/admin/bookings/create`)
- **File:** `src/pages/admin/AdminBookingCreate.tsx` (baris ~1151)

#### 2. Menu Sidebar — Terlalu Banyak Group (16 group, 80+ item)
- **"Keberangkatan"** memiliki 11 item menu terpisah (Tracking, SOS, Rooming, Manifest, Haji, Manasik, Itinerary, Absensi, WA Blast, Muthawif) — sangat membingungkan
- **"Perlengkapan"** memiliki 4 item terpisah (Perlengkapan, Master, Setting, Stock Opname) — padahal bisa jadi tab di 1 halaman
- **"Produk & Paket"** terpisah dari **"Keberangkatan"** padahal workflow-nya berurutan
- User harus scroll sidebar panjang untuk menemukan menu yang dibutuhkan

#### 3. Perlengkapan — 4 Menu Terpisah Tidak Perlu
- `Perlengkapan`, `Master Perlengkapan`, `Setting Perlengkapan`, `Stock Opname` seharusnya jadi tab dalam satu halaman
- Navigasi ke 4 halaman berbeda hanya untuk kelola perlengkapan sangat tidak efisien

#### 4. Booking Detail — Navigasi ke Rooming & Equipment Terputus
- Dari halaman detail booking tidak ada link langsung ke "Kamar" atau "Perlengkapan"
- Dari halaman detail keberangkatan tidak ada shortcut ke rooming jamaah keberangkatan tersebut

#### 5. `AddCustomerDialog` (Data Jamaah) — Tidak Scrollable
- Form panjang (12 field) di modal `max-w-md` tanpa overflow-y-auto
- Tidak ada indikator field mana yang wajib vs opsional yang jelas

---

## Rencana Implementasi (Per Fase)

---

### FASE 1 — Fix Modal Booking: Tombol Tidak Terlihat ✅ PRIORITAS TERTINGGI

**Target file:** `src/pages/admin/AdminBookingCreate.tsx`

**Masalah:** `DialogContent` menggunakan `overflow-hidden` sehingga form tidak bisa di-scroll. Dengan 4 field besar (h-12) + header + footer, konten melebihi tinggi layar dan tombol terpotong.

**Solusi:**
- Ubah `DialogContent` → tambah `max-h-[90vh] flex flex-col`
- Header tetap di atas (tidak scroll)
- Form body → `overflow-y-auto flex-1`
- Footer selalu terlihat di bawah

**Estimasi:** 10 menit

---

### FASE 2 — Konsolidasi Menu Sidebar: Dari 16 Group → 9 Group ✅ PRIORITAS TINGGI

**Target file:** `src/lib/admin-menu-registry.ts`

**Perubahan struktur:**

| Sebelum | Sesudah |
|---|---|
| Beranda (4 item) | Beranda (4 item) — tetap |
| Penjualan (4 item) | Penjualan (4 item) — tetap |
| Produk & Paket (2 item) | **OPERASIONAL** (gabungan: 10 item) |
| Keberangkatan (11 item) | ↑ (masuk ke Operasional) |
| Perlengkapan (4 item) | ↑ (masuk ke Operasional, hanya 1 item utama) |
| Jamaah & Agen (9 item) | Jamaah & Agen (5 item, rapikan) |
| Keuangan (11 item) | Keuangan (7 item utama) |
| Laporan (9 item) | Laporan (5 item utama) |
| Konten (5) + Komunikasi (5) | Konten & Komunikasi (7 item gabungan) |
| AI & Analytics (7 item) | AI & Analytics (4 item utama) |
| Dokumen & Legalitas (10 item) | Dokumen & Legal (6 item) |
| SDM (2 item) | → masuk ke Pengaturan |
| Master Data (7 item) | Master Data (4 item utama) |
| Integrasi (2 item) | → masuk ke Pengaturan |
| Pengaturan (6 item) | Pengaturan (8 item, absorb SDM & Integrasi) |

**Group OPERASIONAL baru (urutan logis workflow):**
1. 📦 Paket Umroh & Haji
2. 🏷️ Tipe Paket
3. ✈️ Jadwal Keberangkatan
4. 🛏️ Kamar & Rooming
5. 📋 Manifest Jamaah
6. 🗺️ Manajemen Haji
7. 📚 Manasik & Itinerary
8. 🎒 Perlengkapan
9. ✅ Absensi Digital
10. 🧑‍✈️ Dashboard Muthawif

**Estimasi:** 20 menit

---

### FASE 3 — Perlengkapan: Unified Page dengan Tabs ✅ PRIORITAS MENENGAH

**Target file:** `src/pages/admin/AdminEquipmentMaster.tsx` (atau buat wrapper page)

**Masalah:** 4 menu terpisah untuk satu domain = 4 URL berbeda yang membingungkan.

**Solusi:** Buat halaman `/admin/equipment` sebagai hub tunggal dengan tabs:
- Tab 1: **Distribusi** (daftar stok & distribusi per keberangkatan)
- Tab 2: **Master Item** (CRUD barang perlengkapan)
- Tab 3: **Stock Opname** (perhitungan fisik stok)
- Tab 4: **Pengaturan** (kategori, threshold minimum)

Menu sidebar hanya tampil 1 item: "Perlengkapan" → redirect ke `/admin/equipment`

**Estimasi:** 30 menit

---

### FASE 4 — Departure Detail: Shortcut ke Rooming & Equipment ✅ PRIORITAS MENENGAH

**Target file:** `src/pages/admin/AdminDepartureDetail.tsx`

**Masalah:** Dari halaman detail keberangkatan tidak ada akses cepat ke:
- Rooming jamaah keberangkatan ini
- Cek kesiapan perlengkapan
- Manifest jamaah

**Solusi:** Tambah action bar di bagian atas detail keberangkatan:
- Tombol "Lihat Rooming" → `/admin/room-assignments?departure=XXX`
- Tombol "Perlengkapan" → `/admin/equipment?departure=XXX`
- Tombol "Manifest" → `/admin/manifest?departure=XXX`
- Badge status: jumlah jamaah belum di-assign kamar

**Estimasi:** 20 menit

---

### FASE 5 — AddCustomerDialog: UI Responsif & Scrollable ✅ PRIORITAS MENENGAH

**Target file:** `src/components/admin/AddCustomerDialog.tsx`

**Perbaikan:**
- Tambah `overflow-y-auto max-h-[85vh]` pada konten dialog
- Pisahkan visually antara "Data Wajib" (nama, gender, telepon) vs "Data Pelengkap" (alamat, status nikah, dll)
- Tambah `ScrollArea` untuk form body
- Field wajib ditandai dengan badge merah kecil, bukan hanya asterisk
- Tombol sticky di bawah (tidak ikut scroll)

**Estimasi:** 15 menit

---

### FASE 6 — Booking Flow: Perbaikan Kecil UX ✅ PRIORITAS RENDAH

**Perbaikan:**
- Di step jamaah booking create: tambah preview foto avatar jamaah yang dipilih
- Filter keberangkatan hanya tampilkan yang masih ada kuota
- Tambah badge "Sisa Kuota: X" di pilihan keberangkatan
- Tambah konfirmasi sebelum submit booking (ringkasan jamaah + total harga)

---

## Urutan Implementasi

```
FASE 1 → FASE 2 → FASE 5 → FASE 3 → FASE 4 → FASE 6
  (fix)   (menu)  (dialog)  (equip)  (depart)  (booking)
```

---

## File-File yang Akan Diubah

| File | Fase | Jenis Perubahan |
|---|---|---|
| `src/pages/admin/AdminBookingCreate.tsx` | 1 | Fix overflow modal |
| `src/lib/admin-menu-registry.ts` | 2 | Restrukturisasi groups |
| `src/pages/operational/EquipmentPage.tsx` | 3 | Unified tabs page |
| `src/pages/admin/AdminDepartureDetail.tsx` | 4 | Tambah action shortcuts |
| `src/components/admin/AddCustomerDialog.tsx` | 5 | Fix scroll + UI polish |
| `src/pages/admin/AdminBookingCreate.tsx` | 6 | UX improvements |
