# Fitur Aturan Denda Pindah Paket (Package Change Rules)

## Daftar Isi
1. [Gambaran Umum](#gambaran-umum)
2. [Arsitektur](#arsitektur)
3. [Database Schema](#database-schema)
4. [Cara Kerja](#cara-kerja)
5. [Implementasi Frontend](#implementasi-frontend)
6. [Implementasi Backend](#implementasi-backend)
7. [Contoh Penggunaan](#contoh-penggunaan)
8. [Panduan Admin](#panduan-admin)

## Gambaran Umum

Fitur **Package Change Rules** memungkinkan sistem untuk mengelola aturan denda yang dinamis dan fleksibel ketika jamaah ingin pindah paket atau tanggal keberangkatan. Setiap paket dapat memiliki aturan denda yang berbeda berdasarkan jangka waktu sebelum keberangkatan (H-X).

### Fitur Utama
- ✅ Aturan denda per paket (tidak global)
- ✅ Jangka waktu dinamis (H-60, H-40, H-30, dll)
- ✅ Tipe denda fleksibel (tetap/Rp atau persen/%)
- ✅ Sistem prioritas otomatis (memilih aturan yang paling sesuai)
- ✅ UI admin untuk mengelola aturan
- ✅ Perhitungan denda otomatis saat pindah paket

## Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React)                      │
├─────────────────────────────────────────────────────────┤
│  • PackageChangeRulesManager.tsx (Admin UI)             │
│  • ChangePackageDialogV2.tsx (Customer/Admin Dialog)    │
│  • usePackageChangeRules.ts (React Query Hooks)         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Services Layer (TypeScript)                 │
├─────────────────────────────────────────────────────────┤
│  • packageChangeRulesService.ts                         │
│    - getPackageChangeRules()                            │
│    - calculatePackageChangePenalty()                    │
│    - createPackageChangeRule()                          │
│    - updatePackageChangeRule()                          │
│    - deletePackageChangeRule()                          │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Supabase (Backend/Database)                 │
├─────────────────────────────────────────────────────────┤
│  • Table: package_change_rules                          │
│  • RLS Policies                                         │
│  • Triggers (updated_at)                                │
└─────────────────────────────────────────────────────────┘
```

## Database Schema

### Table: `package_change_rules`

```sql
CREATE TABLE public.package_change_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES public.packages(id) ON DELETE CASCADE,
    min_days_before_departure INTEGER NOT NULL,  -- H-X format
    penalty_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    penalty_type VARCHAR(20) DEFAULT 'fixed',    -- 'fixed' or 'percentage'
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Indeks
```sql
CREATE INDEX idx_package_change_rules_package_id 
ON public.package_change_rules(package_id);
```

### RLS Policies
- **SELECT**: Authenticated users dapat membaca semua rules
- **INSERT/UPDATE/DELETE**: Hanya super_admin yang dapat mengelola

## Cara Kerja

### 1. Menyimpan Aturan Denda

Admin dapat membuat beberapa aturan untuk satu paket dengan jangka waktu berbeda:

**Contoh untuk Paket Umroh Premium:**
- H-60: Denda Rp 500.000
- H-40: Denda Rp 1.000.000
- H-30: Denda Rp 2.000.000
- H-14: Denda Rp 3.000.000

### 2. Perhitungan Denda Otomatis

Ketika jamaah ingin pindah paket, sistem akan:

1. **Hitung sisa hari** keberangkatan dari hari ini
2. **Cari aturan yang berlaku** dengan H-X tertinggi yang masih ≤ sisa hari
3. **Tentukan denda** berdasarkan aturan yang dipilih

**Contoh Skenario:**

```
Aturan yang ada:
- H-60: Rp 500.000
- H-40: Rp 1.000.000
- H-30: Rp 2.000.000

Skenario 1: Sisa 45 hari
→ H-60 berlaku (45 < 60)
→ Denda: Rp 500.000

Skenario 2: Sisa 35 hari
→ H-40 berlaku (35 < 40)
→ Denda: Rp 1.000.000

Skenario 3: Sisa 20 hari
→ H-30 berlaku (20 < 30)
→ Denda: Rp 2.000.000

Skenario 4: Sisa 70 hari
→ Tidak ada aturan yang berlaku (70 > 60)
→ Denda: Rp 0 (Gratis)
```

### 3. Pencatatan Denda

Ketika denda berlaku, sistem akan:
1. Update `bookings.departure_id` ke keberangkatan baru
2. Buat record `payments` baru dengan tipe "other"
3. Tandai status pembayaran sebagai "pending"

## Implementasi Frontend

### Component: PackageChangeRulesManager

**Lokasi:** `src/components/admin/packages/PackageChangeRulesManager.tsx`

**Fitur:**
- Tampilkan semua aturan denda untuk paket tertentu
- Tambah aturan denda baru
- Edit aturan denda yang ada
- Hapus aturan denda
- Validasi input

**Penggunaan:**
```tsx
import { PackageChangeRulesManager } from "@/components/admin/packages/PackageChangeRulesManager";

<PackageChangeRulesManager
  packageId="uuid-paket"
  packageName="Umroh Premium"
  isOpen={isOpen}
  onClose={handleClose}
/>
```

### Component: ChangePackageDialogV2

**Lokasi:** `src/components/admin/ChangePackageDialogV2.tsx`

**Fitur:**
- Dialog untuk pindah paket/keberangkatan
- Tampilkan informasi denda secara real-time
- Pilih keberangkatan baru
- Konfirmasi perubahan

**Penggunaan:**
```tsx
import { ChangePackageDialogV2 } from "@/components/admin/ChangePackageDialogV2";

<ChangePackageDialogV2
  isOpen={isOpen}
  onClose={handleClose}
  bookingId="uuid-booking"
  currentPackageId="uuid-paket"
  currentDepartureId="uuid-keberangkatan"
  currentDepartureDate="2026-06-15"
/>
```

### Hook: usePackageChangeRules

**Lokasi:** `src/hooks/usePackageChangeRules.ts`

**Hooks Tersedia:**

```typescript
// Fetch rules untuk paket tertentu
const { data: rules } = usePackageChangeRules(packageId);

// Fetch semua rules (admin)
const { data: allRules } = useAllPackageChangeRules();

// Hitung penalty untuk booking
const { data: penaltyInfo } = useCalculatePackageChangePenalty(packageId, departureDate);

// Create rule
const createMutation = useCreatePackageChangeRule();

// Update rule
const updateMutation = useUpdatePackageChangeRule();

// Delete rule
const deleteMutation = useDeletePackageChangeRule();
```

## Implementasi Backend

### Service: packageChangeRulesService

**Lokasi:** `src/services/packageChangeRulesService.ts`

**Fungsi Utama:**

```typescript
// Get rules untuk paket
getPackageChangeRules(packageId: string): Promise<PackageChangeRule[]>

// Hitung penalty
calculatePackageChangePenalty(
  packageId: string,
  departureDateString: string
): Promise<PackageChangePenalty | null>

// CRUD operations
createPackageChangeRule(...)
updatePackageChangeRule(...)
deletePackageChangeRule(...)
```

### Algoritma Perhitungan Penalty

```typescript
function calculatePackageChangePenalty(packageId, departureDate) {
  // 1. Ambil semua rules untuk paket
  const rules = await getPackageChangeRules(packageId);
  
  // 2. Hitung sisa hari
  const daysToDeparture = differenceInDays(departureDate, today);
  
  // 3. Sort rules by min_days_before_departure (descending)
  const sortedRules = rules.sort((a, b) => 
    b.min_days_before_departure - a.min_days_before_departure
  );
  
  // 4. Cari rule yang berlaku
  for (const rule of sortedRules) {
    if (daysToDeparture < rule.min_days_before_departure) {
      // Rule ini berlaku
      return {
        applicable: true,
        penaltyAmount: rule.penalty_amount,
        ...
      };
    }
  }
  
  // 5. Tidak ada rule yang berlaku
  return { applicable: false, penaltyAmount: 0, ... };
}
```

## Contoh Penggunaan

### Contoh 1: Admin Membuat Aturan Denda

```tsx
const { mutate: createRule } = useCreatePackageChangeRule();

createRule({
  packageId: "pkg-123",
  minDaysBeforeDeparture: 60,
  penaltyAmount: 500000,
  penaltyType: 'fixed',
  description: 'Denda untuk pindah paket kurang dari 60 hari'
});
```

### Contoh 2: Menampilkan Denda saat Pindah Paket

```tsx
const { data: penaltyInfo } = useCalculatePackageChangePenalty(
  currentPackageId,
  currentDepartureDate
);

if (penaltyInfo?.applicable) {
  console.log(`Denda: ${penaltyInfo.penaltyAmount}`);
  console.log(`Alasan: ${penaltyInfo.reason}`);
}
```

### Contoh 3: Mengintegrasikan ke Admin Booking Detail

```tsx
import { ChangePackageDialogV2 } from "@/components/admin/ChangePackageDialogV2";

export function AdminBookingDetail() {
  const [isChangePackageOpen, setIsChangePackageOpen] = useState(false);
  const { data: booking } = useQuery(...);

  return (
    <div>
      <Button onClick={() => setIsChangePackageOpen(true)}>
        Pindah Paket
      </Button>

      <ChangePackageDialogV2
        isOpen={isChangePackageOpen}
        onClose={() => setIsChangePackageOpen(false)}
        bookingId={booking.id}
        currentPackageId={booking.departure?.package_id}
        currentDepartureId={booking.departure_id}
        currentDepartureDate={booking.departure?.departure_date}
      />
    </div>
  );
}
```

## Panduan Admin

### Cara Mengelola Aturan Denda

1. **Buka Package Management** → Pilih paket → Klik "Aturan Denda"
2. **Tambah Aturan Baru:**
   - Tentukan H-X (hari sebelum keberangkatan)
   - Pilih tipe denda (Tetap/Rp atau Persen/%)
   - Masukkan nominal denda
   - Tambahkan keterangan (opsional)
   - Klik "Tambah Aturan"

3. **Edit Aturan:**
   - Klik tombol Edit pada aturan yang ingin diubah
   - Ubah data sesuai kebutuhan
   - Klik "Perbarui Aturan"

4. **Hapus Aturan:**
   - Klik tombol Hapus pada aturan yang ingin dihapus
   - Konfirmasi penghapusan

### Best Practices

1. **Urutan Aturan:** Buat aturan dari H-X terbesar ke terkecil untuk kemudahan
2. **Konsistensi:** Pastikan nominal denda meningkat seiring berkurangnya sisa hari
3. **Komunikasi:** Informasikan aturan denda kepada jamaah saat booking
4. **Review Berkala:** Review aturan denda secara berkala sesuai kebijakan perusahaan

### Contoh Konfigurasi Rekomendasi

**Paket Umroh Reguler:**
- H-90: Rp 0 (Gratis)
- H-60: Rp 500.000
- H-30: Rp 1.500.000
- H-14: Rp 3.000.000

**Paket Umroh Premium:**
- H-90: Rp 0 (Gratis)
- H-60: Rp 1.000.000
- H-40: Rp 2.000.000
- H-20: Rp 4.000.000

**Paket Haji Plus:**
- H-180: Rp 0 (Gratis)
- H-120: Rp 2.000.000
- H-60: Rp 5.000.000
- H-30: Rp 10.000.000

## Migration & Setup

### 1. Run Migration

```bash
# Migration file: 20260423060000_create_package_change_rules.sql
# Jalankan melalui Supabase Dashboard atau CLI
```

### 2. Verifikasi Tabel

```sql
SELECT * FROM public.package_change_rules LIMIT 1;
```

### 3. Test Service

```typescript
import { getPackageChangeRules } from "@/services/packageChangeRulesService";

const rules = await getPackageChangeRules("pkg-123");
console.log(rules);
```

## Troubleshooting

### Issue: Denda tidak muncul saat pindah paket

**Solusi:**
1. Pastikan aturan denda sudah dibuat untuk paket tersebut
2. Periksa tanggal keberangkatan saat ini
3. Verifikasi bahwa sisa hari < min_days_before_departure

### Issue: Aturan denda tidak tersimpan

**Solusi:**
1. Periksa RLS policies di Supabase
2. Pastikan user adalah super_admin
3. Lihat console untuk error message

### Issue: Perhitungan denda salah

**Solusi:**
1. Verifikasi algoritma di `calculatePackageChangePenalty()`
2. Periksa timezone setting
3. Debug dengan console.log() untuk tracking flow

## Future Enhancements

- [ ] Support untuk denda persen (%) dari harga paket
- [ ] Denda per rute/destinasi
- [ ] Denda per tipe ruangan (quad, triple, double, single)
- [ ] Approval workflow untuk pindah paket
- [ ] Notifikasi otomatis ke jamaah tentang denda
- [ ] Report denda pindah paket
- [ ] Bulk import aturan denda dari Excel
