# Dokumentasi Fitur Keencan - Implementasi

## Ringkasan

Dokumen ini menjelaskan implementasi tiga feature yang diminta:

---

## 1. Pindah Paket - Denda dan Penambahan Biaya

### Status: ✅ SUDAH DIIMPLEMENTASIKAN

### Komponen:
- **Database**: `supabase/migrations/20260423050000_add_package_change_settings.sql` - Default settings
- **Database**: `supabase/migrations/20260423060000_create_package_change_rules.sql` - Package change rules table
- **UI Dialog**: `src/components/admin/ChangePackageDialog.tsx` - Dialog pindah paket v1
- **UI Dialog**: `src/components/admin/ChangePackageDialogV2.tsx` - Dialog pindah paket v2 (enhanced)
- **Hook**: `src/hooks/usePackageChangeRules.ts` - Hook untuk manage rules
- **Service**: `src/services/packageChangeRulesService.ts` - Service functions

### Konfigurasi:
- `package_change_deadline_days` - Default: 60 hari (H-60)
- `package_change_penalty_fee` - Default: 0 (denda tetap)

### Cara Menggunakan:
1. Buka booking di admin panel
2. Klik tombol "Pindah Paket"
3. Sistem akan menghitung denda berdasarkan:
   - Jumlah hari menuju keberangkatan
   - Rule khusus paket (jika ada)
   - Default settings
4. Jika dikenakan denda, akan ada notifikasi dan konfirmasi

---

## 2. Harga Dewasa, Anak, Balita per Keberanglement

### Status: ✅ DIIMPLEMENTASIKAN (Migration + Form)

### Database:
**File**: `supabase/migrations/20260423080000_add_age_based_pricing.sql`

Kolom yang ditambahkan ke tabel `departures`:
- `price_adult` - Harga dewasa (> 12 tahun)
- `price_child` - Harga anak (2-12 tahun)  
- `price_infant` - Harga balita (< 2 tahun)

### Form Admin:
**File**: `src/components/admin/forms/DepartureForm.tsx`

Field yang ditambahkan:
- `price_adult` - Input number
- `price_child` - Input number
- `price_infant` - Input number

Lokasi di form: Setelah section "Harga Khusus Keberanglement" ada section baru "Harga Berdasarkan Usia"

### Cara Menggunakan:
1. Buka **Manajemen Paket** → **Keberangkatan**
2. Tambah/Edit keberangkatan
3. Isi harga berdasarkan usia di section baru
4. Harga ini akan digunakan saat perhitungan booking dengan kategori usia

---

## 3. Tampilan Logo di Dokumen/Surat

### Status: ✅ SUDAH DIIMPLEMENTASIKAN

### Database Settings:
**File**: `supabase/migrations/20260423033528_add_document_letterhead_settings.sql`

Setting yang tersedia:
- `letterhead_show_logo` - Tampilkan logo di kop surat (default: true)
- `letterhead_show_website` - Tampilkan website di kop surat (default: true)
- `company_city` - Kota untuk tanda tangan
- `company_website` - Website perusahaan

### Document Generator:
**File**: `src/lib/document-generator-v2.ts`

Fungsi `addLetterhead()` menggunakan:
```typescript
if (settings.letterhead_show_logo && company.logo) {
  // Tambahkan logo ke dokumen
}
```

### Admin Form:
**File**: `src/components/admin/DocumentSettingsForm.tsx`

Toggle options untuk:
- [x] Tampilkan Logo di Kop Surat
- [x] Tampilkan Website di Kop Surat

### Cara Menggunakan:
1. Buka menu **Pengaturan** → **Pengaturan Dokumen & Kop Surat**
2. Toggle "Tampilkan Logo di Kop Surat" = ON
3. Simpan pengaturan
4. Generate dokumen (surat, invoice, e-ticket, sertifikat)
5. Logo akan muncul sesuai pengaturan

---

## Catatan

1. **Pindah Paket**: Jika user inginupgrade ke paket yang lebih mahal, belum ada logic tambahan untuk perhitungan selisih harga. Saat ini hanya denda jika terlambat ganti paket.

2. **Harga Usia**: Untuk menggunakan harga usia di booking flow, perlu ada modifikasi lebih lanjut di komponen booking untuk mendeteksi kategori usia customer dan menggunakan kolom harga yang sesuai.

3. **Logo Dokumen**: Pastikan:
   - Company logo sudah diupload di pengaturan branding
   - `letterhead_show_logo` = true
   - Menggunakan document-generator-v2 (bukan versi lama)