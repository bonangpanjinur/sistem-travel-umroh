## Analisis Error Vercel

Build gagal di tahap `tsc --noEmit` artifact `umrah-haji`. **30 error** dikelompokkan jadi 3 akar masalah:

### Akar 1 — Schema database tidak sinkron dengan kode (~70% error)
Kode memakai tabel/kolom yang **belum ada di database live** (cek via `information_schema` returns kosong):
- Tabel `customer_mahrams` — dipakai di `EditCustomerDialog.tsx`, `MahramForm.tsx`, `RoomingListPage.tsx`, `DepartureRoomingTab.tsx`, `AdminBookingCreate.tsx`
- Kolom `customers.district`, `customers.village` — dipakai di `EditCustomerDialog.tsx`
- Tabel `store_product_reviews` — dipakai di `useStore.ts` (3 hook)

Migrasi-nya ada di `.migration-backup/` (tidak ikut ter-apply saat migrasi ke Lovable Cloud) dan untuk `store_product_reviews` belum pernah ada migrasi sama sekali.

### Akar 2 — Type cast yang harus eksplisit
- `usePushSubscription.ts:63` — `urlBase64ToUint8Array()` mengembalikan `Uint8Array<ArrayBufferLike>`, tapi `pushManager.subscribe` butuh `BufferSource` (TS lib lebih ketat di TS 5.7+). Fix: cast `as BufferSource`.
- `useStore.ts` — `Partial<StoreCategory>` / `Partial<StoreShipment>` dipakai untuk `.insert()` yang butuh field wajib (`name`, `courier_name`). Fix: pisahkan branch insert vs update, atau cast payload `as any` (sudah pola lama di file).
- `useStore.ts` order/orderItems — bentuk join Supabase tidak match `StoreProduct` (cuma select `name, images`). Fix: ganti ke `as unknown as StoreOrder[]` (sesuai panduan TS).

### Akar 3 — Kontrak fungsi
- `AdminPushOutbox.tsx` 3 lokasi (line 93, 108, 119): pola `if (error) return toast.error(...)` → `toast.error` return `void`, sehingga branch lain tanpa return memicu TS7030. Fix: pecah jadi `if (err) { toast.error(...); return; }`.
- `JamaahKiblat.tsx:81-82` — `webkitCompassHeading` properti vendor Safari, tidak ada di lib DOM. Fix: cast `(event as any).webkitCompassHeading`.

---

## Rencana Eksekusi

### Tahap 1 — Migrasi DB (1 migration, fix ~22 error)

Buat satu migrasi yang menambahkan:

1. **Tabel `customer_mahrams`** dengan kolom: `customer_id`, `mahram_name`, `mahram_relation` (CHECK enum: suami/istri/ayah/ibu/anak/saudara/paman/kakek/nenek/cucu), `mahram_customer_id`, `notes`. Index pada `customer_id` dan `mahram_customer_id`. RLS:
   - SELECT/INSERT/UPDATE/DELETE: staf admin (`is_admin`, `operational`, `sales`, `branch_manager`) atau customer pemilik (`customer.user_id = auth.uid()`).

2. **Kolom `customers.district`, `customers.village`** (TEXT nullable).

3. **Tabel `store_product_reviews`** dengan kolom: `order_id` (FK store_orders), `product_id` (FK store_products), `user_id` (FK auth.users), `customer_id` (nullable FK customers), `rating` (1-5 CHECK), `comment`, `is_published` (default true), `admin_reply`, `admin_reply_at`. Unique `(order_id, product_id, user_id)`. Index pada `product_id` dan `is_published`. Trigger `update_updated_at_column`. RLS:
   - SELECT publik untuk `is_published = true`.
   - SELECT pemilik untuk review sendiri (`auth.uid() = user_id`).
   - INSERT/UPDATE pemilik (`auth.uid() = user_id`).
   - UPDATE staf admin untuk `admin_reply`, `admin_reply_at`, `is_published`.

Setelah migrasi sukses, `src/integrations/supabase/types.ts` ter-regenerate otomatis → semua error "Argument of type X is not assignable to parameter type" hilang.

### Tahap 2 — Patch type-cast (8 error sisa)

| File | Lokasi | Patch |
|---|---|---|
| `usePushSubscription.ts` | line 63 | `applicationServerKey: urlBase64ToUint8Array(...) as BufferSource` |
| `useStore.ts` | upsert kategori (117) | Cast `values as any` untuk `.insert([values])` branch |
| `useStore.ts` | upsert produk (188) | Cast payload `as any` (pola sudah dipakai untuk `delete category`) |
| `useStore.ts` | order list (234, 255, 335) | Ganti `as StoreOrder[]` → `as unknown as StoreOrder[]` |
| `useStore.ts` | upsertShipment (303) | Cast `values as any` untuk `.insert([values])` branch |
| `AdminPushOutbox.tsx` | line 93, 108, 119 | Pecah `return toast.error(...)` → `{ toast.error(...); return; }` |
| `JamaahKiblat.tsx` | line 81-82 | `(event as any).webkitCompassHeading` |

### Tahap 3 — Verifikasi

Karena harness build otomatis menjalankan typecheck, akan terlihat kalau masih ada error. Saya tidak menjalankan `tsc` manual.

### Tahap 4 — Lighthouse audit (setelah build hijau)

Dengan tool `browser--navigate_to_sandbox` + `browser--performance_profile`, audit 3 halaman:

1. **Landing** `/` — fokus LCP (hero image), CLS (font loading), FCP, INP.
2. **Jamaah Portal** `/jamaah` (perlu login) — fokus bundle size, lazy loading, react-query refetch.
3. **Admin Dashboard** `/admin` (perlu login) — fokus query parallelization, large lists, realtime overhead.

Output: tabel metrik per halaman + daftar bottleneck terurut dampak (LCP > CLS > INP > a11y > SEO). Lalu plan lanjutan untuk fix berdasarkan temuan (mis. preload font, lazy chunk hero, split admin route, dll.).

---

## Risiko & Asumsi

- **Asumsi**: migrasi `customer_mahrams` & `district/village` di `.migration-backup/` adalah definisi yang diinginkan (saya pakai versi RLS yang lebih ketat — versi backup pakai `USING (true)` permisif, akan saya perbaiki).
- **Risiko**: kalau ada FK lain ke tabel ini di kode yang belum saya scan, bisa muncul error baru. Mitigasi: setelah migrasi saya re-scan import sebelum lanjut Tahap 2.
- **Lighthouse**: butuh akun login untuk Jamaah & Admin. Kalau tidak punya akses test, audit hanya untuk Landing.

Sekitar 5-7 menit total sebelum mulai Lighthouse.