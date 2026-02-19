
# Analisis Keseluruhan Sistem & Perbaikan

## Temuan Bug dan Error

### 1. [BUG] CustomSectionEditor - Ref Warning pada Select
Console menunjukkan error: "Function components cannot be given refs" dari `CustomSectionEditor.tsx`. Komponen `Select` dari Radix UI digunakan langsung di dalam loop tanpa wrapper `forwardRef`. Selain itu, tombol "Simpan" hanya `console.log` -- tidak menyimpan data ke database.

**Perbaikan**: Ganti penggunaan `Select` langsung menjadi wrapped component yang benar, dan implementasi penyimpanan ke `website_settings` (custom_sections JSON).

### 2. [BUG] Departures tanpa Package
2 dari 3 keberangkatan memiliki `package_id = NULL`, menyebabkan data paket tidak tampil di dashboard dan halaman publik. Ini menunjukkan validasi saat membuat departure tidak mewajibkan paket.

**Perbaikan**: Tambahkan validasi di `DepartureForm.tsx` untuk mewajibkan `package_id`.

### 3. [BUG] Tenant Hero/CTA Tidak Menggunakan Tenant Settings
`ModernHeroSection` dan `ModernCTASection` memanggil `useWebsiteSettings()` (settings utama), bukan settings tenant. Jika digunakan di `/b/slug` atau `/a/slug`, data yang ditampilkan selalu dari settings utama, bukan tenant.

**Perbaikan**: Buat context provider atau tambahkan prop opsional `settings` ke komponen-komponen hero/CTA agar bisa menerima data tenant.

### 4. [BUG] DynamicHeroSection Juga Hardcode ke Main Settings
Sama seperti poin 3, `DynamicHeroSection` memanggil `useWebsiteSettings()` langsung. Semua section components pada halaman tenant menampilkan data utama, bukan data khusus tenant.

---

## Peningkatan yang Diperlukan

### 5. [IMPROVE] Role-Based Sidebar Filtering Tidak Lengkap
`AdminLayout.tsx` menampilkan grup berdasarkan `allowedRoles`, tetapi hanya beberapa grup yang punya filter ini (Keuangan, SDM, Master Data, Laporan, Pengaturan). Grup seperti "Sales & CRM", "Jamaah & Agent", dan "Support" terlihat oleh semua role admin termasuk marketing yang seharusnya tidak bisa akses booking.

**Perbaikan**: Tambahkan `allowedRoles` ke setiap grup/item nav yang sesuai dengan Role Access Matrix.

### 6. [IMPROVE] Slug Uniqueness Hanya Client-Side
BranchForm memvalidasi format slug dengan regex, tetapi tidak cek apakah slug sudah digunakan sebelum submit. Error duplikat hanya muncul dari database constraint.

**Perbaikan**: Tambahkan pengecekan real-time ke database saat user mengetik slug (`debounced query`).

### 7. [IMPROVE] Leaked Password Protection Disabled
Linter mendeteksi bahwa proteksi password bocor belum diaktifkan. Ini berarti user bisa menggunakan password yang sudah bocor di data breach publik.

**Perbaikan**: Aktifkan leaked password protection melalui konfigurasi auth.

### 8. [IMPROVE] CustomSectionEditor Tidak Persisten
Pengaturan hero options (Bismillah, Search Widget, Statistik) dan statistik custom hanya disimpan di state lokal. Refresh halaman = hilang.

**Perbaikan**: Simpan data ke kolom `custom_sections` (JSONB) di `website_settings`.

---

## Detail Teknis Perbaikan

### File yang Dimodifikasi

| File | Perubahan |
|------|-----------|
| `CustomSectionEditor.tsx` | Fix ref warning, implementasi save ke DB |
| `ModernHeroSection.tsx` | Tambah props `settings` opsional |
| `ModernCTASection.tsx` | Tambah props `settings` opsional |
| `DynamicHeroSection.tsx` | Tambah props `settings` opsional |
| `DynamicCTASection.tsx` | Tambah props `settings` opsional |
| `Index.tsx` | Pass settings ke section components |
| `BranchWebsite.tsx` | Pass tenant settings ke section components |
| `AgentWebsite.tsx` | Pass tenant settings ke section components |
| `AdminLayout.tsx` | Tambah `allowedRoles` ke semua nav groups |
| `BranchForm.tsx` | Tambah debounced slug uniqueness check |
| `AdminAgents.tsx` | Tambah debounced slug uniqueness check |
| `DepartureForm.tsx` | Wajibkan package_id |

### Urutan Implementasi

1. Fix CustomSectionEditor ref warning dan persistence
2. Fix tenant settings propagation ke semua section components
3. Fix role-based sidebar filtering di AdminLayout
4. Tambah slug uniqueness validation
5. Fix departure package_id validation
6. Aktifkan leaked password protection
