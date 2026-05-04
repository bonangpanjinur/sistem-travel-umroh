# Langkah-Langkah Integrasi Komponen Baru

Dokumen ini menjelaskan cara mengintegrasikan komponen-komponen baru yang telah dibuat untuk mendukung perbaikan website.

## Daftar Komponen Baru

1. **PICProfileCard.tsx** - Kartu profil Person in Charge
2. **BookingOptionsCard.tsx** - Kartu pilihan cara pemesanan (online vs via PIC)
3. **TeamPage.tsx** - Halaman tim/PIC
4. **Database Migration** - Untuk mendukung fitur PIC

---

## Langkah 1: Jalankan Database Migration

### Untuk Development (Local Supabase)

```bash
# 1. Pastikan Supabase CLI terinstall
npm install -g supabase

# 2. Jalankan migration
supabase migration up

# 3. Verifikasi di Supabase dashboard
# Buka: http://localhost:54323 (jika menggunakan local)
```

### Untuk Production (Hosted Supabase)

```bash
# 1. Push migration ke production
supabase db push

# 2. Atau manual melalui Supabase dashboard:
# - Buka SQL Editor
# - Copy-paste isi file: supabase/migrations/20260309_add_pic_features.sql
# - Jalankan query
```

---

## Langkah 2: Integrasikan PICProfileCard ke PackageDetail

Edit file: `src/pages/packages/PackageDetail.tsx`

```typescript
// 1. Import komponen
import { PICProfileCard } from "@/components/packages/PICProfileCard";

// 2. Di dalam component, tambahkan query untuk PIC info
const { data: picInfo } = useQuery({
  queryKey: ['package-pic', id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('packages')
      .select(`
        *,
        pic:agents(
          id,
          agent_code,
          avatar_url,
          specialization,
          location,
          description
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },
  enabled: !!id,
});

// 3. Di sidebar (sebelum PackageBookingForm), tambahkan:
{picInfo?.pic && (
  <PICProfileCard
    picId={picInfo.pic.id}
    picName={picInfo.pic.agent_code}
    picSpecialization={picInfo.pic.specialization}
    picLocation={picInfo.pic.location}
    picDescription={picInfo.pic.description}
    picAvatarUrl={picInfo.pic.avatar_url}
    // Note: Perlu update database untuk menyimpan phone/whatsapp di agents table
  />
)}
```

---

## Langkah 3: Integrasikan BookingOptionsCard ke PackageDetail

Edit file: `src/pages/packages/PackageDetail.tsx`

```typescript
// 1. Import komponen
import { BookingOptionsCard } from "@/components/packages/BookingOptionsCard";

// 2. Tambahkan state untuk tracking pilihan booking
const [bookingOption, setBookingOption] = useState<'online' | 'pic' | null>(null);

// 3. Di sidebar (sebelum PackageBookingForm), tambahkan:
<BookingOptionsCard
  packageId={pkg.id}
  picName={picInfo?.pic?.agent_code}
  picWhatsapp={picInfo?.pic?.whatsapp}
  onOnlineBooking={() => {
    setBookingOption('online');
    // Scroll ke PackageBookingForm
  }}
  onPICBooking={() => {
    setBookingOption('pic');
  }}
/>

// 4. Tampilkan PackageBookingForm hanya jika pilih online
{bookingOption === 'online' && (
  <PackageBookingForm packageId={pkg.id} />
)}
```

---

## Langkah 4: Tambahkan Route untuk Team Page

Edit file: `src/routes/index.tsx` atau file routing Anda

```typescript
// Tambahkan route baru
import TeamPage from '@/pages/public/TeamPage';

const routes = [
  // ... existing routes
  {
    path: '/team',
    element: <TeamPage />,
  },
  // ... other routes
];
```

---

## Langkah 5: Update Navigation Links

Edit file: `src/components/layout/DynamicNavbar.tsx`

```typescript
const defaultNavLinks: NavLink[] = [
  { href: '/', label: 'Beranda' },
  { href: '/packages', label: 'Paket Umroh' },
  { href: '/departures', label: 'Jadwal' },
  { href: '/savings', label: 'Tabungan' },
  { href: '/team', label: 'Tim Kami' }, // NEW LINE
  { href: '/about', label: 'Tentang Kami' },
  { href: '/contact', label: 'Hubungi Kami' },
];
```

---

## Langkah 6: Update Database Schema untuk Agents

Pastikan agents table memiliki field yang diperlukan:

```sql
-- Verifikasi field ada di agents table
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agents';

-- Jika field belum ada, migration akan menambahkannya otomatis
```

---

## Langkah 7: Populate Data PIC

### Via Admin Panel

1. Login ke admin panel
2. Navigasi ke **Manajemen Agen**
3. Edit agen yang akan menjadi PIC:
   - Centang checkbox "Adalah PIC"
   - Upload foto/avatar
   - Isi specialization (misal: "Umroh Premium")
   - Isi location (misal: "Jakarta")
   - Isi description
4. Simpan

### Via SQL (Direct)

```sql
-- Update agents menjadi PIC
UPDATE public.agents 
SET 
  is_pic = true,
  avatar_url = 'https://example.com/avatar.jpg',
  specialization = 'Umroh Premium',
  location = 'Jakarta',
  description = 'Berpengalaman lebih dari 10 tahun dalam industri umroh'
WHERE agent_code = 'AGT001';
```

---

## Langkah 8: Assign PIC ke Packages

### Via Admin Panel

1. Login ke admin panel
2. Navigasi ke **Manajemen Paket**
3. Edit paket yang ingin assign PIC:
   - Pilih PIC dari dropdown
   - Simpan

### Via SQL (Direct)

```sql
-- Assign PIC ke package
UPDATE public.packages 
SET pic_id = (SELECT id FROM public.agents WHERE agent_code = 'AGT001')
WHERE id = 'package-id-here';
```

---

## Langkah 9: Testing

### Manual Testing Checklist

- [ ] Halaman Team (`/team`) terbuka dengan baik
- [ ] Daftar PIC ditampilkan dengan foto dan info
- [ ] Tombol WhatsApp berfungsi
- [ ] Tombol Email berfungsi
- [ ] Halaman Package Detail menampilkan PIC card
- [ ] Booking Options Card menampilkan dua opsi
- [ ] Klik "Online Booking" menampilkan form
- [ ] Klik "Konsultasi PIC" membuka WhatsApp

### Browser Testing

- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari
- [ ] Mobile (iOS)
- [ ] Mobile (Android)

---

## Langkah 10: Deployment

```bash
# 1. Commit semua perubahan
git add .
git commit -m "Integrasikan komponen PIC dan booking options"

# 2. Push ke repository
git push origin main

# 3. Verifikasi di staging (jika ada)
# Buka: https://staging.sistemtravelumroh.vercel.app

# 4. Deploy ke production
# Deployment akan otomatis trigger dari push ke main
# atau manual via Vercel dashboard

# 5. Verifikasi di production
# Buka: https://sistemtravelumroh.vercel.app
# Test semua fitur baru
```

---

## Troubleshooting

### Issue: PIC tidak muncul di package detail

**Solusi:**
1. Verifikasi package memiliki `pic_id` yang benar
2. Verifikasi agent dengan ID tersebut ada dan `is_pic = true`
3. Check browser console untuk error
4. Verifikasi RLS policies di Supabase

### Issue: WhatsApp link tidak berfungsi

**Solusi:**
1. Verifikasi format nomor WhatsApp (harus dengan kode negara)
2. Pastikan nomor WhatsApp aktif
3. Test di browser yang berbeda
4. Cek apakah WhatsApp Web tersedia di perangkat

### Issue: Team page tidak menampilkan anggota

**Solusi:**
1. Verifikasi ada agents dengan `is_pic = true`
2. Verifikasi agents memiliki `is_active = true`
3. Check browser console untuk error
4. Verifikasi RLS policies memungkinkan read access

### Issue: Migration gagal

**Solusi:**
1. Verifikasi syntax SQL
2. Pastikan field belum ada sebelumnya
3. Check Supabase logs untuk error detail
4. Jalankan migration secara manual via SQL Editor

---

## Rollback (Jika Diperlukan)

Jika ada masalah, rollback dengan:

```bash
# 1. Revert commit
git revert HEAD

# 2. Push revert
git push origin main

# 3. Rollback database (manual via Supabase dashboard)
# Atau jalankan SQL untuk drop columns/tables yang ditambahkan
```

---

## Verifikasi Akhir

Setelah semua langkah selesai, verifikasi:

1. ✅ Database migration berhasil
2. ✅ Komponen baru terintegrasi
3. ✅ Route `/team` berfungsi
4. ✅ Navigation link ditampilkan
5. ✅ PIC info ditampilkan di package detail
6. ✅ Booking options card ditampilkan
7. ✅ WhatsApp integration berfungsi
8. ✅ Responsive di semua device
9. ✅ Performance OK (tidak ada lag)
10. ✅ SEO meta tags updated

---

## Dokumentasi Tambahan

- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- [Rencana Perbaikan Lengkap](./pasted_content.txt)
- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)

---

**Last Updated:** 9 Maret 2026  
**Version:** 1.0
