# Fitur Pengaturan Fee PIC (Cabang, Agen, Sub Agen, Referral Jemaah)

## Daftar Isi
1. [Pengenalan](#pengenalan)
2. [Struktur Database](#struktur-database)
3. [Implementasi Frontend](#implementasi-frontend)
4. [Penggunaan di Backend](#penggunaan-di-backend)
5. [Utility Functions](#utility-functions)
6. [Contoh Penggunaan](#contoh-penggunaan)
7. [Integrasi dengan Sistem Komisi](#integrasi-dengan-sistem-komisi)

---

## Pengenalan

Fitur **PIC Fee** memungkinkan administrator untuk mengatur fee standar untuk setiap tipe PIC (Person In Charge) secara dinamis untuk setiap paket umroh/haji. Setiap paket dapat memiliki nilai fee yang berbeda untuk:

- **Fee Cabang**: Komisi yang diberikan kepada cabang
- **Fee Agen**: Komisi yang diberikan kepada agen
- **Fee Sub Agen**: Komisi yang diberikan kepada sub agen
- **Fee Referral Jemaah**: Komisi yang diberikan kepada jemaah yang mereferensikan

### Contoh Konfigurasi

```
Paket: Umroh 12 Hari
├── Fee Cabang: Rp 4.000.000
├── Fee Agen: Rp 3.000.000
├── Fee Sub Agen: Rp 2.500.000
└── Fee Referral Jemaah: Rp 2.000.000

Paket: Haji Plus 40 Hari
├── Fee Cabang: Rp 5.000.000
├── Fee Agen: Rp 4.000.000
├── Fee Sub Agen: Rp 3.000.000
└── Fee Referral Jemaah: Rp 2.500.000
```

---

## Struktur Database

### Migration File
File: `supabase/migrations/20260322235241_add_pic_fees_to_packages.sql`

```sql
ALTER TABLE public.packages
ADD COLUMN fee_branch NUMERIC DEFAULT 0,
ADD COLUMN fee_agent NUMERIC DEFAULT 0,
ADD COLUMN fee_sub_agent NUMERIC DEFAULT 0,
ADD COLUMN fee_referral NUMERIC DEFAULT 0;

ALTER TABLE public.packages
ALTER COLUMN fee_branch SET NOT NULL,
ALTER COLUMN fee_agent SET NOT NULL,
ALTER COLUMN fee_sub_agent SET NOT NULL,
ALTER COLUMN fee_referral SET NOT NULL;
```

### TypeScript Types
File: `src/integrations/supabase/types.ts`

Kolom-kolom baru ditambahkan ke tabel `packages`:

```typescript
packages: {
  Row: {
    // ... existing fields ...
    fee_branch: number;
    fee_agent: number;
    fee_sub_agent: number;
    fee_referral: number;
  }
  Insert: {
    // ... existing fields ...
    fee_branch?: number;
    fee_agent?: number;
    fee_sub_agent?: number;
    fee_referral?: number;
  }
  Update: {
    // ... existing fields ...
    fee_branch?: number;
    fee_agent?: number;
    fee_sub_agent?: number;
    fee_referral?: number;
  }
}
```

---

## Implementasi Frontend

### PackageForm Component
File: `src/components/admin/forms/PackageForm.tsx`

Komponen form untuk menambah/edit paket sekarang memiliki section baru untuk pengaturan fee PIC:

```tsx
{/* Pengaturan Fee PIC */}
<div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
  <h4 className="text-sm font-semibold text-green-900 uppercase tracking-wide">
    Pengaturan Fee PIC
  </h4>
  <p className="text-xs text-green-800 mb-4">
    Tentukan fee standar untuk setiap tipe PIC (dalam Rupiah)
  </p>
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {/* Input untuk fee_branch */}
    {/* Input untuk fee_agent */}
    {/* Input untuk fee_sub_agent */}
    {/* Input untuk fee_referral */}
  </div>
</div>
```

### Validation Schema
Menggunakan Zod untuk validasi:

```typescript
const packageSchema = z.object({
  // ... existing fields ...
  fee_branch: z.coerce.number().min(0, "Fee cabang tidak boleh negatif").default(0),
  fee_agent: z.coerce.number().min(0, "Fee agen tidak boleh negatif").default(0),
  fee_sub_agent: z.coerce.number().min(0, "Fee sub agen tidak boleh negatif").default(0),
  fee_referral: z.coerce.number().min(0, "Fee referral jemaah tidak boleh negatif").default(0),
});
```

---

## Penggunaan di Backend

### Menyimpan Fee saat Membuat/Edit Paket

```typescript
const mutation = useMutation({
  mutationFn: async (values: PackageFormValues) => {
    const { 
      fee_branch, 
      fee_agent, 
      fee_sub_agent, 
      fee_referral, 
      ...rest 
    } = values;
    
    const payload: any = {
      ...rest,
      // ... other fields ...
      fee_branch,
      fee_agent,
      fee_sub_agent,
      fee_referral,
    };

    if (isEditing && packageData) {
      const { error } = await supabase
        .from("packages")
        .update(payload)
        .eq("id", packageData.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("packages")
        .insert(payload);
      if (error) throw error;
    }
  },
});
```

### Mengambil Data Fee dari Database

```typescript
// Mengambil satu paket dengan fee-nya
const { data: pkg, error } = await supabase
  .from("packages")
  .select("*")
  .eq("id", packageId)
  .single();

if (pkg) {
  console.log("Fee Cabang:", pkg.fee_branch);
  console.log("Fee Agen:", pkg.fee_agent);
  console.log("Fee Sub Agen:", pkg.fee_sub_agent);
  console.log("Fee Referral:", pkg.fee_referral);
}
```

---

## Utility Functions

File: `src/lib/picFeeCalculator.ts`

Utility functions yang tersedia untuk mempermudah penggunaan fee PIC:

### 1. `getPICFee(pkg, picType)`
Mendapatkan fee untuk tipe PIC tertentu.

```typescript
import { getPICFee } from "@/lib/picFeeCalculator";

const branchFee = getPICFee(package, "cabang");      // 4000000
const agentFee = getPICFee(package, "agen");         // 3000000
const subAgentFee = getPICFee(package, "sub_agen");  // 2500000
const referralFee = getPICFee(package, "referral");  // 2000000
```

### 2. `getAllPICFees(pkg)`
Mendapatkan semua fee breakdown untuk sebuah paket.

```typescript
import { getAllPICFees } from "@/lib/picFeeCalculator";

const fees = getAllPICFees(package);
// Output:
// [
//   { picType: "cabang", picName: "Cabang", fee: 4000000, currency: "IDR" },
//   { picType: "agen", picName: "Agen", fee: 3000000, currency: "IDR" },
//   { picType: "sub_agen", picName: "Sub Agen", fee: 2500000, currency: "IDR" },
//   { picType: "referral", picName: "Referral Jemaah", fee: 2000000, currency: "IDR" }
// ]
```

### 3. `getTotalPICFees(pkg)`
Menghitung total fee dari semua tipe PIC.

```typescript
import { getTotalPICFees } from "@/lib/picFeeCalculator";

const totalFee = getTotalPICFees(package);
// Output: 11500000 (4000000 + 3000000 + 2500000 + 2000000)
```

### 4. `formatRupiah(amount)`
Format nilai fee ke format Rupiah yang readable.

```typescript
import { formatRupiah } from "@/lib/picFeeCalculator";

const formatted = formatRupiah(4000000);
// Output: "Rp 4.000.000"
```

### 5. `isAllPICFeesConfigured(pkg)`
Validasi bahwa semua fee sudah dikonfigurasi.

```typescript
import { isAllPICFeesConfigured } from "@/lib/picFeeCalculator";

if (isAllPICFeesConfigured(package)) {
  console.log("Semua fee sudah dikonfigurasi");
} else {
  console.log("Ada fee yang belum dikonfigurasi");
}
```

### 6. `getUnconfiguredPICFees(pkg)`
Mendapatkan PIC fee yang belum dikonfigurasi.

```typescript
import { getUnconfiguredPICFees } from "@/lib/picFeeCalculator";

const unconfigured = getUnconfiguredPICFees(package);
// Output: ["Cabang", "Agen"] (jika fee_branch dan fee_agent masih 0)
```

### 7. `getPICFeeSummary(pkg)`
Membuat ringkasan fee untuk ditampilkan di UI.

```typescript
import { getPICFeeSummary } from "@/lib/picFeeCalculator";

const summary = getPICFeeSummary(package);
// Output: "Cabang: Rp 4.000.000 | Agen: Rp 3.000.000 | Sub Agen: Rp 2.500.000 | Referral Jemaah: Rp 2.000.000"
```

---

## Contoh Penggunaan

### Contoh 1: Menampilkan Fee di Halaman Detail Paket

```tsx
import { getAllPICFees, formatRupiah } from "@/lib/picFeeCalculator";

export function PackageDetailCard({ pkg }: { pkg: Package }) {
  const fees = getAllPICFees(pkg);

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Pengaturan Fee PIC</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {fees.map((fee) => (
          <div key={fee.picType} className="p-3 border rounded-lg">
            <p className="text-sm text-muted-foreground">{fee.picName}</p>
            <p className="text-lg font-bold">{formatRupiah(fee.fee)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Contoh 2: Menampilkan Warning jika Fee Belum Lengkap

```tsx
import { getUnconfiguredPICFees } from "@/lib/picFeeCalculator";
import { AlertCircle } from "lucide-react";

export function PackageWarning({ pkg }: { pkg: Package }) {
  const unconfigured = getUnconfiguredPICFees(pkg);

  if (unconfigured.length === 0) return null;

  return (
    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex gap-3">
      <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="font-semibold text-yellow-900">Fee Belum Lengkap</p>
        <p className="text-sm text-yellow-800">
          Berikut fee yang belum dikonfigurasi: {unconfigured.join(", ")}
        </p>
      </div>
    </div>
  );
}
```

### Contoh 3: Menggunakan Fee dalam Perhitungan Komisi

```tsx
import { getPICFee } from "@/lib/picFeeCalculator";

interface CommissionCalculation {
  packageId: string;
  picType: "cabang" | "agen" | "sub_agen" | "referral";
  quantity: number;
}

export async function calculateCommission(
  calculation: CommissionCalculation,
  packages: Package[]
) {
  const pkg = packages.find(p => p.id === calculation.packageId);
  if (!pkg) throw new Error("Paket tidak ditemukan");

  const fee = getPICFee(pkg, calculation.picType);
  const totalCommission = fee * calculation.quantity;

  return {
    packageName: pkg.name,
    picType: calculation.picType,
    feePerUnit: fee,
    quantity: calculation.quantity,
    totalCommission,
  };
}
```

---

## Integrasi dengan Sistem Komisi

### Skenario: Menghitung Komisi Booking

Ketika ada booking baru, sistem dapat menggunakan fee yang telah dikonfigurasi:

```typescript
// 1. Ambil data booking dan paket
const booking = await supabase
  .from("bookings")
  .select("*, packages(*)")
  .eq("id", bookingId)
  .single();

// 2. Tentukan tipe PIC dari booking
const picType = booking.pic_source; // "cabang", "agen", "sub_agen", atau "referral"

// 3. Ambil fee dari paket
const fee = getPICFee(booking.packages, picType);

// 4. Simpan komisi ke database
await supabase.from("agent_commissions").insert({
  booking_id: booking.id,
  agent_id: booking.agent_id,
  commission_amount: fee,
  status: "pending",
});
```

### Skenario: Laporan Komisi per Paket

```typescript
import { getTotalPICFees, getAllPICFees } from "@/lib/picFeeCalculator";

export async function generatePackageCommissionReport(packageId: string) {
  // Ambil paket
  const pkg = await supabase
    .from("packages")
    .select("*")
    .eq("id", packageId)
    .single();

  // Ambil semua booking untuk paket ini
  const bookings = await supabase
    .from("bookings")
    .select("*")
    .eq("package_id", packageId);

  // Hitung total komisi per tipe PIC
  const feeBreakdown = getAllPICFees(pkg.data);
  const totalFees = getTotalPICFees(pkg.data);

  return {
    packageName: pkg.data.name,
    totalBookings: bookings.data.length,
    feeBreakdown,
    totalFeesPerBooking: totalFees,
    estimatedTotalCommission: totalFees * bookings.data.length,
  };
}
```

---

## Checklist Implementasi

- [x] Tambah kolom fee ke tabel packages di database
- [x] Update TypeScript types
- [x] Tambah input fields di PackageForm
- [x] Tambah validation schema
- [x] Buat utility functions untuk fee calculation
- [ ] Integrasikan dengan sistem komisi (opsional, sesuai kebutuhan)
- [ ] Tambah halaman laporan komisi per paket (opsional)
- [ ] Tambah warning/validation di admin dashboard (opsional)

---

## Catatan Penting

1. **Nilai Default**: Semua fee diatur ke 0 secara default. Admin harus mengkonfigurasi nilai fee untuk setiap paket.

2. **Validasi**: Sistem akan mencegah nilai fee negatif melalui validation schema.

3. **Fleksibilitas**: Setiap paket dapat memiliki fee yang berbeda, memungkinkan strategi pricing yang fleksibel.

4. **Integrasi Masa Depan**: Utility functions dirancang untuk memudahkan integrasi dengan sistem komisi, laporan, dan analitik di masa depan.

5. **Currency**: Fee diasumsikan dalam Rupiah (IDR). Jika ada perubahan currency, update `formatRupiah()` function.

---

## Support & Troubleshooting

### Masalah: Fee tidak tersimpan
**Solusi**: Pastikan migration sudah dijalankan di database Supabase Anda.

### Masalah: Kolom fee tidak muncul di form
**Solusi**: Clear browser cache dan reload halaman.

### Masalah: Nilai fee menampilkan NaN
**Solusi**: Pastikan nilai fee sudah dikonfigurasi di database (bukan NULL atau undefined).

---

**Terakhir diupdate**: 22 Maret 2026
**Versi**: 1.0
