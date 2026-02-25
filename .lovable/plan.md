

# Fix Build Errors - 22 Edge Function TS Errors + 8 Frontend TS Errors

## Ringkasan Masalah

Build gagal karena **30 TypeScript errors** di 2 kategori:
1. **Edge Functions (22 errors)**: Type safety issues di 3 file Deno
2. **Frontend (8+ errors)**: Form type mismatches dan CustomSectionEditor type issue

Menu admin **tidak hilang** karena masalah sidebar/routing, tapi karena **build gagal total** sehingga aplikasi tidak bisa di-render sama sekali.

---

## Rencana Perbaikan

### 1. Edge Function: `create-agent/index.ts` (1 error)

**Error:** `'err' is of type 'unknown'` di baris 158

**Fix:** Cast `err` ke `Error` type:
```typescript
} catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
```

### 2. Edge Function: `send-whatsapp-notification/index.ts` (10 errors)

**Error:** `'booking' is possibly 'null'` dan property access pada joined data

**Fix:** Tambahkan null guard setelah `.single()` query dan sebelum akses properties. File ini sebenarnya sudah punya helper `getCustomer()` untuk handle array joins. Masalahnya adalah akses langsung ke `booking.total_price`, `booking.departure` dll tanpa null check.

Solusi: Tambahkan `if (!booking) break;` setelah setiap query `.single()`.

### 3. Edge Function: `send-whatsapp-trigger/index.ts` (11 errors)

**Error:** Supabase join mengembalikan array `{ full_name, phone }[]` tapi kode mengakses sebagai objek tunggal (`.customer?.phone`).

**Fix:** Untuk setiap handler function, extract item pertama dari array join:
- `handleBookingCreated`: `const customer = Array.isArray(booking.customer) ? booking.customer[0] : booking.customer;`
- `handlePaymentVerified`: Same pattern untuk nested joins
- `handleDocumentRejected`: Same pattern
- `handleCommissionPaid`: Same pattern
- Final catch: Cast `error` ke `Error` type

### 4. Frontend Forms (6 files)

**Error:** Zod schema menghasilkan tipe dengan field optional (`code?: string`) yang tidak cocok dengan Supabase Insert type yang memerlukan field required (`code: string`).

**Files:**
- `AirlineForm.tsx`: `code` dan `name` required di Insert tapi optional di Zod output
- `AirportForm.tsx`: `city`, `code`, `country` required
- `BranchForm.tsx`: `code`, `name` required
- `CouponForm.tsx`: `code`, `discount_value`, `name` required
- `DepartureForm.tsx`: `departure_date` required
- `HotelForm.tsx`: `city`, `name` required

**Fix:** Untuk setiap form, cast payload insert menggunakan `as AirlineInsert` (sudah di-cast tapi Zod output type tidak match). Solusi paling aman: tambahkan explicit spread dengan required fields:
```typescript
const insertPayload: AirlineInsert = {
  code: values.code!,
  name: values.name!,
  ...values,
};
```
Atau lebih simpel: cast `as unknown as AirlineInsert` pada payload insert saja.

### 5. Frontend: `CustomSectionEditor.tsx` (1 error)

**Error:** `Record<string, unknown>` tidak bisa di-assign ke `CustomSection[]`

**Fix:** Ubah baris 128 dari:
```typescript
updateSettings.mutate({ custom_sections: customSections as unknown as Record<string, unknown> });
```
Menjadi:
```typescript
updateSettings.mutate({ custom_sections: customSections as unknown as CustomSection[] });
```

---

## Detail Teknis


| File | Errors | Tipe Fix |
|------|--------|----------|
| `supabase/functions/create-agent/index.ts` | 1 | Cast error type |
| `supabase/functions/send-whatsapp-notification/index.ts` | 10 | Null guards |
| `supabase/functions/send-whatsapp-trigger/index.ts` | 11 | Array join handling + error cast |
| `src/components/admin/forms/AirlineForm.tsx` | 1 | Type assertion |
| `src/components/admin/forms/AirportForm.tsx` | 1 | Type assertion |
| `src/components/admin/forms/BranchForm.tsx` | 1 | Type assertion |
| `src/components/admin/forms/CouponForm.tsx` | 1 | Type assertion |
| `src/components/admin/forms/DepartureForm.tsx` | 1 | Type assertion |
| `src/components/admin/forms/HotelForm.tsx` | 1 | Type assertion |
| `src/components/admin/appearance/CustomSectionEditor.tsx` | 1 | Type assertion |

**Total: 10 file diperbaiki, 0 file baru, 0 migrasi database**

Setelah semua error ini diperbaiki, build akan berhasil dan semua menu admin akan kembali tampil normal karena aplikasi bisa di-render kembali.

