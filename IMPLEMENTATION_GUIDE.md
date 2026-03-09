# Panduan Implementasi Perbaikan Website Umroh

**Tanggal:** 9 Maret 2026  
**Status:** Dalam Proses Implementasi

## Ringkasan Perbaikan

Dokumen ini menjelaskan implementasi perbaikan website berdasarkan rencana perbaikan sistemtravelumroh.vercel.app. Perbaikan dibagi menjadi 4 fase utama dengan fokus pada kredibilitas, konten visual, alur booking hybrid, dan integrasi PIC (Person in Charge).

---

## FASE 1: Konsolidasi Identitas Brand dan Informasi Kontak

### Status: ✅ SUDAH TERSEDIA

Sistem untuk mengelola brand identity dan informasi kontak sudah terintegrasi dalam aplikasi.

### Komponen yang Terlibat

1. **Admin Panel** (`/admin/appearance`)
   - Lokasi: `src/pages/admin/AdminAppearance.tsx`
   - Tab "Branding" untuk mengatur:
     - Nama perusahaan
     - Tagline
     - Logo dan Favicon
     - Informasi kontak (alamat, telepon, email, WhatsApp)
     - Social media links

2. **Frontend Components**
   - `DynamicNavbar.tsx`: Menampilkan brand name dan logo di header
   - `DynamicFooter.tsx`: Menampilkan informasi kontak di footer
   - `ContactPage.tsx`: Halaman kontak lengkap dengan form dan info kontak

3. **Database**
   - Table: `website_settings`
   - Fields yang relevan:
     - `company_name`: Nama perusahaan
     - `tagline`: Tagline perusahaan
     - `logo_url`: URL logo
     - `footer_phone`: Nomor telepon
     - `footer_email`: Email
     - `footer_address`: Alamat kantor
     - `footer_whatsapp`: Nomor WhatsApp
     - `social_instagram`, `social_facebook`, `social_youtube`, `social_tiktok`

### Implementasi Manual

Untuk memperbarui informasi brand dan kontak:

1. Login ke admin panel (`/admin`)
2. Navigasi ke **Pengaturan Tampilan** → Tab **Branding**
3. Update field-field berikut:
   - **Nama Perusahaan**: Ganti "UmrohTravel" dengan nama brand yang sesuai
   - **Tagline**: Ganti dengan tagline perusahaan
   - **Logo**: Upload logo perusahaan
   - **Informasi Kontak**: Update alamat, telepon, email, WhatsApp
   - **Social Media**: Tambahkan link ke akun social media

4. Klik **Simpan** untuk menyimpan perubahan

### Verifikasi

Setelah update, verifikasi di:
- Header website (logo dan nama perusahaan)
- Footer website (informasi kontak)
- Halaman Kontak (`/contact`)

---

## FASE 2: Optimalisasi Konten Visual

### Status: ⏳ PERLU IMPLEMENTASI

Fase ini mencakup penggantian gambar placeholder dengan gambar relevan dan pembuatan galeri.

### Komponen yang Diperlukan

1. **Galeri Foto/Video**
   - Lokasi: Buat di `src/components/home/GallerySection.tsx`
   - Fitur:
     - Grid galeri responsif
     - Modal untuk preview gambar
     - Support untuk foto dan video
     - Lazy loading untuk performa

2. **Hero Image Management**
   - Update `PackageDetail.tsx` untuk menampilkan featured image paket
   - Implementasi image fallback yang lebih baik

### Implementasi

```bash
# 1. Buat komponen galeri
# File: src/components/home/GallerySection.tsx

# 2. Tambahkan galeri ke homepage
# File: src/pages/Index.tsx

# 3. Upload gambar ke Supabase Storage
# Gunakan admin panel atau API
```

### Database Migration

Tidak diperlukan migration database untuk fase ini. Gunakan storage Supabase yang sudah ada.

---

## FASE 3: Alur Pemesanan Hybrid (Booking Online & Via PIC)

### Status: ⏳ PERLU IMPLEMENTASI

Fase ini menambahkan opsi booking via PIC (Person in Charge) sebagai alternatif booking online.

### Komponen yang Diperlukan

1. **Hybrid Booking Form**
   - Lokasi: Update `src/components/packages/PackageBookingForm.tsx`
   - Tambahkan dua tombol:
     - "Lanjutkan Booking Online" (existing flow)
     - "Konsultasi/Booking via PIC" (new flow)

2. **PIC Selection Component**
   - Lokasi: Buat di `src/components/packages/PICSelector.tsx`
   - Fitur:
     - Menampilkan daftar PIC yang tersedia
     - Filter berdasarkan lokasi (opsional)
     - Tombol untuk chat via WhatsApp

3. **PIC WhatsApp Integration**
   - Generate WhatsApp message dengan detail paket
   - Link langsung ke WhatsApp PIC

### Implementasi

```typescript
// Contoh struktur data PIC
interface PIC {
  id: string;
  name: string;
  phone: string;
  whatsapp: string;
  email: string;
  location?: string;
  specialization?: string;
  avatar_url?: string;
}

// Tambahkan field ke packages table
// pic_id: UUID REFERENCES public.agents(id)
```

### Database Migration

Buat file migration: `supabase/migrations/20260309_add_pic_to_packages.sql`

```sql
-- Add PIC field to packages
ALTER TABLE public.packages ADD COLUMN pic_id UUID REFERENCES public.agents(id);

-- Add index untuk performa
CREATE INDEX idx_packages_pic_id ON public.packages(pic_id);
```

---

## FASE 4: Fitur PIC (Person in Charge)

### Status: ⏳ PERLU IMPLEMENTASI

Fase ini menampilkan profil PIC di halaman detail paket dan membuat halaman tim.

### Komponen yang Diperlukan

1. **PIC Profile Card**
   - Lokasi: Buat di `src/components/packages/PICProfileCard.tsx`
   - Tampilkan di `PackageDetail.tsx`
   - Fitur:
     - Foto PIC
     - Nama dan spesialisasi
     - Nomor WhatsApp
     - Tombol untuk chat langsung

2. **Team Page**
   - Lokasi: Buat di `src/pages/public/TeamPage.tsx`
   - Fitur:
     - Grid daftar semua PIC
     - Filter berdasarkan lokasi/spesialisasi
     - Detail profile setiap PIC
     - Link ke social media

3. **Admin PIC Management**
   - Lokasi: Update `src/pages/admin/AdminAgents.tsx`
   - Tambahkan field:
     - Avatar/Foto
     - Spesialisasi
     - Lokasi
     - Deskripsi singkat

### Implementasi

```typescript
// Update agents table dengan field tambahan
interface Agent {
  id: string;
  user_id: string;
  company_name: string;
  agent_code: string;
  phone: string;
  email: string;
  // NEW FIELDS:
  avatar_url?: string;
  specialization?: string;
  location?: string;
  description?: string;
  is_pic?: boolean; // Flag untuk PIC
}
```

### Database Migration

Buat file migration: `supabase/migrations/20260309_enhance_agents_for_pic.sql`

```sql
-- Add PIC-related fields to agents
ALTER TABLE public.agents 
ADD COLUMN avatar_url TEXT,
ADD COLUMN specialization VARCHAR(255),
ADD COLUMN location VARCHAR(255),
ADD COLUMN description TEXT,
ADD COLUMN is_pic BOOLEAN DEFAULT false;

-- Create index untuk filter PIC
CREATE INDEX idx_agents_is_pic ON public.agents(is_pic);
CREATE INDEX idx_agents_location ON public.agents(location);
```

### Update Navigation

Tambahkan link ke Team Page di navigation:

```typescript
// src/components/layout/DynamicNavbar.tsx
const defaultNavLinks: NavLink[] = [
  { href: '/', label: 'Beranda' },
  { href: '/packages', label: 'Paket Umroh' },
  { href: '/departures', label: 'Jadwal' },
  { href: '/savings', label: 'Tabungan' },
  { href: '/team', label: 'Tim Kami' }, // NEW
  { href: '/about', label: 'Tentang Kami' },
  { href: '/contact', label: 'Hubungi Kami' },
];
```

---

## Prioritas Implementasi

### Tinggi (Segera)
1. ✅ Fase 1: Brand & Kontak (Sudah tersedia, tinggal update data)
2. ⏳ Fase 3: Hybrid Booking (Penting untuk meningkatkan konversi)
3. ⏳ Fase 4: PIC Profile (Penting untuk kredibilitas)

### Sedang
4. ⏳ Fase 2: Galeri Visual (Meningkatkan engagement)

---

## Checklist Implementasi

### Fase 1: Brand & Kontak
- [ ] Login ke admin panel
- [ ] Update nama perusahaan
- [ ] Update tagline
- [ ] Upload logo
- [ ] Update informasi kontak (alamat, telepon, email)
- [ ] Update nomor WhatsApp
- [ ] Tambahkan social media links
- [ ] Verifikasi di frontend

### Fase 2: Galeri Visual
- [ ] Buat komponen GallerySection.tsx
- [ ] Upload gambar ke Supabase Storage
- [ ] Integrasikan ke homepage
- [ ] Test responsive design

### Fase 3: Hybrid Booking
- [ ] Buat database migration untuk pic_id di packages
- [ ] Update PackageBookingForm.tsx dengan dua opsi
- [ ] Buat PICSelector.tsx
- [ ] Integrasikan WhatsApp API
- [ ] Test booking flow

### Fase 4: PIC Management
- [ ] Buat database migration untuk agent fields
- [ ] Update AdminAgents.tsx untuk manage PIC
- [ ] Buat PICProfileCard.tsx
- [ ] Buat TeamPage.tsx
- [ ] Update navigation
- [ ] Test PIC profile display

---

## Testing

### Manual Testing
1. Test brand consistency di semua halaman
2. Test booking flow (online dan via PIC)
3. Test PIC profile display
4. Test responsive design di mobile

### Automated Testing
```bash
# Run test suite
npm run test

# Build untuk production
npm run build
```

---

## Deployment

```bash
# 1. Commit changes
git add .
git commit -m "Implementasi perbaikan website fase 1-4"

# 2. Push ke repository
git push origin main

# 3. Deploy ke Vercel (jika menggunakan Vercel)
# Deployment akan otomatis trigger dari push

# 4. Verifikasi di production
# Buka https://sistemtravelumroh.vercel.app
```

---

## Support & Troubleshooting

### Issue: Logo tidak muncul di header
- Verifikasi URL logo di admin panel
- Check Supabase Storage permissions
- Clear browser cache

### Issue: WhatsApp link tidak berfungsi
- Verifikasi format nomor WhatsApp (harus dengan kode negara)
- Test di browser yang berbeda
- Pastikan nomor WhatsApp aktif

### Issue: Gambar galeri loading lambat
- Implementasi lazy loading
- Optimize image size
- Gunakan CDN untuk image delivery

---

## Referensi

- [Rencana Perbaikan Lengkap](./pasted_content.txt)
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [TailwindCSS Documentation](https://tailwindcss.com/docs)

---

## Catatan Penting

1. **Data Consistency**: Pastikan semua informasi brand dan kontak konsisten di semua halaman
2. **Mobile Responsiveness**: Test semua perubahan di mobile device
3. **Performance**: Monitor loading time setelah menambahkan galeri
4. **SEO**: Update meta tags di admin panel untuk SEO yang lebih baik
5. **Backup**: Backup database sebelum melakukan migration

---

**Last Updated:** 9 Maret 2026  
**Version:** 1.0
