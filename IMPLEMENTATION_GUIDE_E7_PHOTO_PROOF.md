# Implementasi Fitur E7: Foto Bukti Distribusi Perlengkapan

## Overview
Fitur E7 menambahkan kemampuan untuk mengupload dan menampilkan foto bukti serah terima (distribusi) perlengkapan kepada jamaah. Ini memastikan transparansi dan dokumentasi yang lebih baik dalam proses distribusi perlengkapan.

## File yang Ditambahkan

### 1. Database Migration
**File:** `supabase/migrations/066_equipment_distribution_photo.sql`

Menambahkan kolom dan fungsi ke database:
- `distribution_photo_url` — URL foto bukti serah terima
- `distribution_photo_uploaded_at` — Waktu foto diunggah
- `distribution_photo_uploaded_by` — User ID yang mengunggah foto
- **RPC Functions:**
  - `update_distribution_photo()` — Update foto untuk satu distribusi
  - `bulk_update_distribution_photos()` — Update foto untuk multiple distribusi
  - `get_distribution_with_photo()` — Retrieve distribusi dengan detail foto

### 2. Frontend Components

#### A. EquipmentDistributionDrawerWithPhoto.tsx
**File:** `artifacts/umrah-haji/src/components/operational/equipment/EquipmentDistributionDrawerWithPhoto.tsx`

Komponen dialog untuk distribusi perlengkapan dengan fitur upload foto:
- Upload foto untuk setiap item perlengkapan
- Preview foto sebelum menyimpan
- Integrasi dengan Supabase Storage
- Validasi ukuran dan foto sebelum penyimpanan

**Fitur Utama:**
- 📸 Upload foto bukti serah terima untuk setiap perlengkapan
- 👁️ Preview foto dalam modal
- ✅ Validasi foto dan ukuran
- 🗑️ Hapus foto jika diperlukan
- 📊 Progress tracking dengan foto

**Cara Menggunakan:**
```tsx
import { EquipmentDistributionDialogWithPhoto } from "@/components/operational/equipment/EquipmentDistributionDrawerWithPhoto";

<EquipmentDistributionDialogWithPhoto
  open={open}
  onOpenChange={setOpen}
  jamaahId={jamaahId}
  jamaahName={jamaahName}
  jamaahGender={gender}
  jamaahType={type}
  departureId={departureId}
/>
```

#### B. EquipmentConfirmationTabWithPhoto.tsx
**File:** `artifacts/umrah-haji/src/components/operational/equipment/EquipmentConfirmationTabWithPhoto.tsx`

Tab konfirmasi penerimaan dengan tampilan foto bukti:
- Menampilkan status foto untuk setiap jamaah
- Progress bar untuk foto bukti
- Gallery preview foto
- Statistik foto bukti

**Fitur Utama:**
- 📸 Tampilkan status foto untuk setiap item
- 📊 Progress tracking foto bukti
- 🖼️ Preview foto dalam modal
- ⚠️ Alert jika foto belum lengkap
- 📈 Statistik foto per jamaah

**Cara Menggunakan:**
```tsx
import { EquipmentConfirmationTabWithPhoto } from "@/components/operational/equipment/EquipmentConfirmationTabWithPhoto";

<EquipmentConfirmationTabWithPhoto departureId={departureId} />
```

## Implementasi Steps

### Step 1: Apply Database Migration
```bash
# Jalankan migration di Supabase
supabase migration up
```

Atau jika menggunakan SQL langsung:
```sql
-- Copy isi dari 066_equipment_distribution_photo.sql
-- Jalankan di Supabase SQL Editor
```

### Step 2: Configure Supabase Storage
1. Buka Supabase Dashboard → Storage
2. Buat bucket baru bernama `equipment-photos`
3. Set Public Access: **Public**
4. Set Row Level Security (RLS):
   ```sql
   -- Allow authenticated users to upload
   CREATE POLICY "Allow authenticated upload" ON storage.objects
   FOR INSERT TO authenticated
   WITH CHECK (bucket_id = 'equipment-photos');

   -- Allow public read
   CREATE POLICY "Allow public read" ON storage.objects
   FOR SELECT TO public
   USING (bucket_id = 'equipment-photos');
   ```

### Step 3: Update Component Imports
Ganti import di file yang menggunakan EquipmentDistribution:

**Sebelum:**
```tsx
import { EquipmentDistributionDialog } from "@/components/operational/equipment/EquipmentDistributionDrawer";
import { EquipmentConfirmationTab } from "@/components/operational/equipment/EquipmentConfirmationTab";
```

**Sesudah:**
```tsx
import { EquipmentDistributionDialogWithPhoto } from "@/components/operational/equipment/EquipmentDistributionDrawerWithPhoto";
import { EquipmentConfirmationTabWithPhoto } from "@/components/operational/equipment/EquipmentConfirmationTabWithPhoto";
```

### Step 4: Update Component Usage
Ganti penggunaan komponen di parent component:

```tsx
// Dalam file yang menggunakan equipment distribution
<EquipmentDistributionDialogWithPhoto
  open={open}
  onOpenChange={setOpen}
  jamaahId={jamaahId}
  jamaahName={jamaahName}
  jamaahGender={gender}
  jamaahType={type}
  departureId={departureId}
/>

// Dan untuk confirmation tab
<EquipmentConfirmationTabWithPhoto departureId={departureId} />
```

## Database Schema

### Kolom Baru di `equipment_distributions`
```sql
ALTER TABLE equipment_distributions ADD COLUMN IF NOT EXISTS
  distribution_photo_url TEXT,
  distribution_photo_uploaded_at TIMESTAMPTZ,
  distribution_photo_uploaded_by UUID REFERENCES auth.users(id);
```

### Indexes
```sql
-- Untuk query cepat distribusi dengan foto
CREATE INDEX idx_equip_dist_with_photo
  ON equipment_distributions (departure_id, distribution_photo_url)
  WHERE distribution_photo_url IS NOT NULL;

-- Untuk tracking uploader
CREATE INDEX idx_equip_dist_photo_uploader
  ON equipment_distributions (distribution_photo_uploaded_by, distribution_photo_uploaded_at DESC)
  WHERE distribution_photo_url IS NOT NULL;
```

## API Endpoints / RPC Functions

### 1. update_distribution_photo()
Update foto untuk satu distribusi
```sql
SELECT update_distribution_photo(
  p_distribution_id := 'uuid-here',
  p_photo_url := 'https://storage.url/photo.jpg',
  p_uploader_id := 'user-uuid' -- optional
);
```

### 2. bulk_update_distribution_photos()
Update foto untuk multiple distribusi
```sql
SELECT bulk_update_distribution_photos(
  p_distribution_ids := ARRAY['uuid1', 'uuid2'],
  p_photo_urls := ARRAY['url1', 'url2'],
  p_uploader_id := 'user-uuid' -- optional
);
```

### 3. get_distribution_with_photo()
Retrieve distribusi dengan detail foto
```sql
SELECT * FROM get_distribution_with_photo('distribution-uuid');
```

## Storage Structure

Foto disimpan di Supabase Storage dengan struktur:
```
equipment-photos/
├── distribution-{departure_id}-{jamaah_id}-{equipment_id}-{timestamp}.jpg
```

Contoh:
```
equipment-photos/distribution-abc123-def456-ghi789-1704067200000.jpg
```

## UI/UX Features

### Distribution Dialog
- ✅ Checkbox untuk setiap perlengkapan
- 📸 Upload button untuk foto bukti
- 👁️ Preview foto
- 🗑️ Hapus foto
- ⚠️ Validasi ukuran sebelum simpan
- 📊 Progress bar

### Confirmation Tab
- 📊 Stats cards (Total, Confirmed, Photos)
- 📈 Progress bars untuk konfirmasi dan foto
- ⚠️ Alert banner jika foto belum lengkap
- 🖼️ Gallery preview foto
- 🔍 Search jamaah
- 📋 Table dengan status foto

## Validation Rules

1. **Foto Upload:**
   - Format: JPEG, PNG, WebP
   - Max size: 5MB (configurable)
   - Required: No (optional)

2. **Penyimpanan:**
   - Foto URL disimpan saat distribusi dibuat
   - Bisa diupdate kapan saja
   - Bisa dihapus (set NULL)

3. **Konfirmasi:**
   - Foto tidak required untuk konfirmasi
   - Tapi recommended untuk transparansi

## Error Handling

```tsx
// Upload error
toast.error(`Gagal upload foto: ${error.message}`);

// Storage error
toast.error("Gagal menyimpan: storage error");

// Network error
toast.error("Koneksi terputus, coba lagi");
```

## Performance Considerations

1. **Image Optimization:**
   - Compress foto sebelum upload
   - Gunakan thumbnail untuk preview
   - Lazy load foto di table

2. **Storage:**
   - Set cache control: 3600 detik
   - Use CDN untuk delivery cepat
   - Archive old photos setelah 1 tahun

3. **Database:**
   - Indexes untuk query cepat
   - Batch operations untuk bulk update
   - Pagination untuk large datasets

## Testing Checklist

- [ ] Upload foto berhasil
- [ ] Preview foto tampil benar
- [ ] Hapus foto berfungsi
- [ ] Validasi ukuran bekerja
- [ ] Konfirmasi tanpa foto berfungsi
- [ ] Bulk confirm dengan foto bekerja
- [ ] Search jamaah dengan foto bekerja
- [ ] Mobile responsiveness OK
- [ ] Storage cleanup berfungsi
- [ ] Error handling bekerja

## Future Enhancements

1. **Batch Upload:**
   - Upload multiple foto sekaligus
   - Drag & drop interface

2. **Photo Editing:**
   - Crop, rotate, filter foto
   - Add watermark

3. **Verification:**
   - AI-powered photo verification
   - Duplicate detection

4. **Reporting:**
   - Export foto dengan report
   - Generate PDF dengan foto
   - Photo gallery per departure

5. **Analytics:**
   - Track photo upload time
   - Identify missing photos
   - Generate compliance report

## Support & Troubleshooting

### Foto tidak tersimpan
- Check Supabase Storage bucket permissions
- Verify user authentication
- Check browser console for errors

### Upload lambat
- Compress foto sebelum upload
- Check internet connection
- Verify Supabase region

### Foto tidak tampil
- Check storage URL validity
- Verify CORS settings
- Check image format support

## References

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [React Query Documentation](https://tanstack.com/query/latest)
- [Sonner Toast Documentation](https://sonner.emilkowal.ski/)
