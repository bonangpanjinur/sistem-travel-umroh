---
name: Passenger Type Pricing
description: Harga per tipe penumpang (dewasa/anak/balita) di departures dan packages.
---

## Keputusan

- `departures` sebelumnya hanya punya `price_child` dan `price_infant` (dari migration sebelumnya), tapi TIDAK punya `price_adult`. Column `price_adult` ditambah via migration `09_passenger_pricing`.
- Ditambah `child_price_percent` (default 75) dan `infant_price_percent` (default 10) ke `departures` dan `packages`.
- Di `packages`, field ini adalah global default; di `departures`, bisa di-override per jadwal keberangkatan.

**Why:** Untuk Umroh/Wisata (room-based), anak dan balita sebelumnya selalu membayar harga kamar penuh. Sekarang price_child/infant digunakan jika diisi; jika 0, sistem hitung dari persentase × harga kamar.

**How to apply:** Saat booking dibuat (admin atau publik), `getPassengerPrice(type, roomType)` menentukan harga: adult = room price, child = price_child atau room×child%, infant = price_infant atau room×infant%.

## File yang diubah

- `artifacts/api-server/src/sql/09_passenger_pricing.sql` — SQL migration
- `artifacts/api-server/src/lib/runMigrations.ts` — Step 1h tambah file ini
- `artifacts/umrah-haji/src/integrations/supabase/types.ts` — Row/Insert/Update untuk departures dan packages
- `artifacts/umrah-haji/src/components/admin/forms/DepartureForm.tsx` — Zod + UI percentage section
- `artifacts/umrah-haji/src/components/admin/forms/PackageForm.tsx` — Zod + UI default percentage
- `artifacts/umrah-haji/src/hooks/useBookingWizardDynamic.ts` — Fix room-based price calc untuk anak/balita
- `artifacts/umrah-haji/src/pages/admin/AdminBookingCreate.tsx` — Interface + query + getPassengerPrice + totalPrice
