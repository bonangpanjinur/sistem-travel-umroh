
# Rencana Perbaikan: Build Errors, Detail Paket & PIC Booking

## Analisis Masalah

Ada **30+ build errors** yang disebabkan oleh tabel-tabel dan kolom yang direferensikan di kode tapi **tidak ada di database**:

### Tabel Tidak Ada di DB:
- `gallery_items` → dipakai di `GallerySection.tsx`
- `about_page_content` → dipakai di `useAboutPageContent.ts`
- `company_features` → dipakai di `CompanyFeaturesEditor.tsx`, `useCompanyFeatures.ts`
- `hero_stats` → dipakai di `HeroStatsEditor.tsx`, `useHeroStats.ts`
- `package_types` → dipakai di `usePackageTypes.ts`

### Kolom Tidak Ada di DB:
- `agents.location` → dipakai di `PICLocationMatcher.tsx`
- `agents.specialization` → dipakai di `PICLocationMatcher.tsx`
- `agents.avatar_url` → dipakai di `PICLocationMatcher.tsx`
- `website_settings.phone` → dipakai di `WhatsAppWidget.tsx` (seharusnya `footer_phone`)

### Relasi Tidak Ada:
- `packages` tidak punya FK `pic_id` ke `agents` → `PackageDetail.tsx` query `pic:agents(*)` gagal

---

## Rencana Implementasi

### 1. Fix Build Errors -- Tabel Tidak Ada (Bypass dengan Type Cast)

Karena tabel `gallery_items`, `about_page_content`, `company_features`, `hero_stats`, `package_types` belum ada di database, solusinya:
- Setiap hook/component yang query tabel ini **sudah punya fallback default** dan catch error
- Fix TS error dengan cast query result ke `any` sebelum return, karena Supabase types tidak mengenal tabel ini
- Contoh: `supabase.from('gallery_items' as any).select('*')...` lalu cast result

**File**: `GallerySection.tsx`, `useAboutPageContent.ts`, `useCompanyFeatures.ts`, `useHeroStats.ts`, `usePackageTypes.ts`, `CompanyFeaturesEditor.tsx`, `HeroStatsEditor.tsx`

### 2. Fix PICLocationMatcher -- Kolom Tidak Ada di `agents`

Tabel `agents` tidak punya `location`, `specialization`, `avatar_url`. Solusi:
- Ganti query untuk join data dari `branches` (yang punya `city`) atau `profiles` (yang punya `avatar_url`)
- Atau cast query ke `any` dan gunakan data yang tersedia
- Paling pragmatis: query `agents` hanya select kolom yang ada (`id, company_name, slug, branch_id`) lalu join `branches(city, name)` untuk lokasi

**File**: `PICLocationMatcher.tsx`

### 3. Fix WhatsAppWidget -- `phone` → `footer_phone`

`website_settings` tidak punya `phone`, tapi punya `footer_phone`.

**File**: `WhatsAppWidget.tsx` -- ganti `settings?.phone` → `settings?.footer_phone`

### 4. Fix PackageDetail -- Hapus Query `pic:agents(*)`

`packages` tidak punya FK ke `agents`. Hapus join `pic:agents(*)` dari query dan hapus section PIC di halaman detail (atau ganti dengan PICLocationMatcher yang sudah ada di sidebar).

**File**: `PackageDetail.tsx`

### 5. Tambah PIC Selection di Booking (Fitur Baru)

Tambah pilihan sumber booking (PIC) di `PackageBookingForm.tsx` dan teruskan ke `BookingWizard`:
- **Default**: "Pusat" (branch_id = null, agent_id = null)
- **Cabang**: Dropdown pilih cabang
- **Agen**: Dropdown pilih agen
- **Referral**: Input kode referral jamaah

Alur:
1. Di `PackageBookingForm.tsx`: tambah section "Sumber Pendaftaran" sebelum tombol submit
2. Pass `pic_type`, `branch_id`, `agent_id`, `referral_code` via URL params ke BookingWizard
3. Di `useBookingWizardDynamic.ts`: baca params dan include di booking insert (`branch_id`, `agent_id`)
4. Jika referral code diisi, lookup `referral_codes` table dan create `referral_usages` record setelah booking berhasil

**File**: `PackageBookingForm.tsx`, `BookingWizard.tsx`, `useBookingWizardDynamic.ts`

---

## Ringkasan File

| File | Perubahan |
|:---|:---|
| `GallerySection.tsx` | Cast `from('gallery_items' as any)` untuk bypass TS |
| `useAboutPageContent.ts` | Cast query ke `any` |
| `useCompanyFeatures.ts` | Cast query ke `any` |
| `useHeroStats.ts` | Cast query ke `any` |
| `usePackageTypes.ts` | Cast query ke `any` |
| `CompanyFeaturesEditor.tsx` | Cast query dan state ke `any` |
| `HeroStatsEditor.tsx` | Cast query dan state ke `any` |
| `WhatsAppWidget.tsx` | `phone` → `footer_phone` |
| `PICLocationMatcher.tsx` | Ganti query, join `branches` untuk lokasi |
| `PackageDetail.tsx` | Hapus `pic:agents(*)`, hapus PIC section yang error |
| `PackageBookingForm.tsx` | Tambah section PIC (Pusat/Cabang/Agen/Referral) |
| `BookingWizard.tsx` | Baca PIC params dari URL, pass ke hook |
| `useBookingWizardDynamic.ts` | Terima PIC data, include di booking insert + referral usage |

## Prioritas

| # | Prioritas | Item |
|:--|:----------|:-----|
| 1 | **KRITIS** | Fix 30+ build errors (type casts untuk tabel yang belum ada) |
| 2 | **KRITIS** | Fix PackageDetail.tsx (hapus invalid join) |
| 3 | **TINGGI** | Fix WhatsAppWidget (`footer_phone`) |
| 4 | **TINGGI** | Fix PICLocationMatcher (kolom yang tidak ada) |
| 5 | **TINGGI** | Tambah PIC selection di booking form |
| 6 | **TINGGI** | Teruskan PIC ke booking insert |
