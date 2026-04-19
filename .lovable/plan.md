

## Akar masalah ditemukan

### 1. Build error & runtime error `Cannot access '_' before initialization`
**Penyebab:** `AdminAnalytics.tsx` query `bookings` dengan kolom `package_id` & relasi `package:packages(name)` — **kolom itu tidak ada di tabel `bookings`**. Yang ada: `departure_id`. Relasi ke package: `bookings → departures → packages`.

Akibatnya:
- TypeScript error 25 baris (semua `b.created_at`, `b.paid_amount`, dll dianggap `SelectQueryError`).
- Runtime: query gagal di Supabase → bundle JS chunk `admin-crm` corrupt saat tree-shaking (variable `_` dari recharts/destructuring tidak terinisialisasi karena modul gagal evaluate). Inilah error `Cannot access '_' before initialization`.

### 2. Loading admin lama
- Error #1 menyebabkan **AdminAnalytics & seluruh chunk yang share modul-nya GAGAL load** → React Suspense fallback nyantol → terlihat "loading lama" / blank.
- `EquipmentPage.tsx` line 220: `supabase.rpc('decrement_stock', ...)` — **RPC tidak terdaftar di DB** (TS error: `'decrement_stock' is not assignable`). Setiap kali halaman equipment diakses, mutation gagal & lemparkan error tambahan.

### 3. Loading lama secara umum
Cascading dari #1: chunk admin gagal di-evaluate → React error boundary fallback berulang kali → user lihat halaman blank / spinner panjang.

---

## Rencana perbaikan (minimal, fokus fix bug)

### A. `src/pages/admin/AdminAnalytics.tsx`
- **Hapus** `package_id` dari select.
- **Ganti** relasi `package:packages(name)` jadi `departure:departures(id, package_id, package:packages(name))`.
- Update semua referensi:
  - `b.package_id` → `b.departure?.package_id`
  - `(b.package as any)?.name` → `(b.departure as any)?.package?.name`
- Tidak ada perubahan UI/fungsional.

### B. `src/pages/operational/EquipmentPage.tsx`
- **Hapus** pemanggilan `supabase.rpc('decrement_stock', ...)` (line 218-222) yang tidak ada.
- Pakai langsung pola fallback yang sudah ada: SELECT current stock → UPDATE dengan nilai hasil hitungan. (Race condition tetap ada tapi tidak crash; fix atomik sebenarnya butuh bikin RPC baru — di luar scope sekarang.)

### C. Verifikasi tidak ada file lain yang pakai `bookings.package_id`
- Quick search & fix kalau ada (umumnya hooks lain sudah benar pakai `departure.package_id`).

---

## File yang akan diubah
- `src/pages/admin/AdminAnalytics.tsx` — fix select + referensi package via departure.
- `src/pages/operational/EquipmentPage.tsx` — hapus RPC `decrement_stock` yang tidak ada.

## Hasil yang ditargetkan
- ✅ Build error 25 baris hilang.
- ✅ Runtime error `Cannot access '_' before initialization` hilang (karena chunk berhasil evaluate).
- ✅ Halaman admin tidak blank / loading menggantung.
- ✅ Halaman equipment tidak error saat distribute.

