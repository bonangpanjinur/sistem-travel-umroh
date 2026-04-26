# Rencana Perbaikan Produk & Operasional

Berikut tujuh isu yang dibahas, masing-masing dengan akar masalah dan solusi.

## 1. Error 401 pada Edge Function (`send-whatsapp-notification` & `send-payment-reminder`)

**Akar masalah**: Kedua fungsi tidak punya blok konfigurasi di `supabase/config.toml`, sehingga default `verify_jwt = true` aktif. Frontend memanggil via `supabase.functions.invoke` tanpa session yang valid (atau sesi expired) → 401 → response undefined → `Cannot read properties of undefined (reading 'payload')`.

**Solusi**:
- Tambah blok `[functions.send-whatsapp-notification]` dan `[functions.send-payment-reminder]` dengan `verify_jwt = false` di `supabase/config.toml` (kedua fungsi sudah pakai service-role key & bukan endpoint publik berbahaya — hanya dipanggil admin internal).
- Frontend memanggil via `supabase.functions.invoke` (sudah benar) — tidak perlu ubah call-site.

## 2. Buat Paket Tipe "Tabungan" & Pembedaan di Database

**Status**: Enum `package_type` sudah punya nilai `tabungan` dan kolom `savings_target` / `savings_installment` sudah ada di tabel `packages`.

**Solusi**:
- Pastikan default seed di tabel `package_types` mencakup baris `tabungan` (saat ini kosong → frontend pakai 4 default hardcoded tanpa tabungan). Migration: insert `package_types` dengan code = `tabungan`, name = `Paket Tabungan`.
- Form pembuatan paket di `AdminPackages` (PackageForm) sudah memetakan `package_type`. Tambah kondisional: jika type = `tabungan`, tampilkan field `savings_target` & `savings_installment` (jumlah bulan), serta sembunyikan field harga ihram/quad bila tidak relevan (tetap simpan untuk fallback).
- Filter di `AdminPackages` sudah memisah `regular` vs `tabungan` (sudah berfungsi via `pkg.package_type !== "tabungan"`).
- Tambah default `tabungan` di hook `usePackageTypes` `DEFAULT_PACKAGE_TYPES`.

## 3. Filter Paket di Frontend Tidak Berfungsi

**Akar masalah** di `src/pages/packages/PackageList.tsx`:
- Filter harga hanya cek `price_quad` — paket yang harganya disimpan di `price_triple/double/single` saja akan dianggap 0 dan ter-exclude saat `minPrice > 0`.
- Default `minPrice` di `PackageSearch` = `10.000.000` → paket murah/tabungan ter-filter keluar otomatis sebelum user interaksi.
- Filter durasi hanya match nilai `[9, 12, 14, 21+]` literal — paket berdurasi lain (mis. 10, 13) tidak pernah lolos saat checkbox dipilih.
- Tipe `tabungan` belum ada di dropdown filter `PackageSearch`.

**Solusi**:
- Helper `getStartingPrice(pkg)` = min dari harga yang non-null/non-zero (`price_quad`, `price_triple`, `price_double`, `price_single`); pakai untuk filter & sort `price_asc/desc`.
- Default `minPrice/maxPrice` di `PackageSearch` & `PackageList` jadi `0` dan `Infinity` (tampilkan slider tetap, tapi jangan apply filter sampai user geser).
- Indikator "filter aktif" hanya di-apply jika user benar-benar mengubah dari default.
- Filter durasi: ubah jadi range (≤9, 10–12, 13–14, ≥15) atau tambah opsi "Semua Durasi"; sertakan paket `tabungan` tanpa durasi.
- Tambah opsi `Tabungan` ke select `Jenis Paket`.

## 4. Daftar Jamaah Keberangkatan: Nomor Kamar Tidak Terintegrasi

**Akar masalah** di `AdminDepartureDetail.tsx` (query `booking_passengers` baris 155-170): tidak join ke `room_assignments` / `room_occupants`, sehingga `p.room_number` selalu `"-"` walau admin sudah set di menu Kamar.

**Solusi**:
- Tambah join via `room_occupants` → `room_assignments`:
  ```
  room_occupants:room_occupants(
    room_assignment:room_assignments(room_number, room_type, floor, hotel_id)
  )
  ```
- Mapping: `passenger.room_number = occupant.room_assignment?.room_number`. Untuk multi-hotel (Makkah/Madinah), tampilkan dua kolom atau gabung "MK: 301 / MD: 215".
- Sama untuk export PDF/Excel di `AdminDepartureDetail` & `RoomingListPage` (sudah pakai `room_number` dari kolom legacy `booking_passengers.room_number` — gantikan dengan data dari `room_assignments` sebagai sumber kebenaran).

## 5. Statistik Jamaah per Periode Default = "Hari Ini"

**Akar masalah** di `AdminBookings.tsx` baris 78: `useState<string>("today")`. User butuh angka realtime keseluruhan saat pertama buka.

**Solusi**:
- Ubah default `periodPreset` ke `"all"`.
- Tambah `SelectItem value="all">Semua Waktu</SelectItem>` di dropdown.
- Di `periodRange` useMemo, untuk `"all"` return `{ from: new Date(0), to: endOfDay(now), label: "Semua Waktu" }` (atau skip filter `gte/lte` di query).

## 6. Pairing Kamar Quad — Sesama Jenis & Mahram (Suami/Istri/Anak)

**Status saat ini** (`AdminRoomAssignments.tsx` baris 815-863): Sudah ada deteksi spouse (suami/istri) sebagai mahram lawan jenis, tapi belum mendukung pasangan orangtua-anak dan belum berlaku konsisten untuk kamar Quad (4 orang).

**Solusi**:
- Untuk kamar **single/double/triple/quad**: izinkan jenis kelamin sama murni, **atau** semua occupant dalam satu kamar adalah satu kelompok mahram (suami+istri+anak).
- Tambah deteksi mahram parent-child:
  - Field referensi mahram di `customers`: gunakan `family_head_id` atau tambah kolom `mahram_customer_id` (uuid, nullable, ref `customers.id`) — ATAU group melalui `booking_passengers.booking_id` yang sama (semua jamaah satu booking dianggap satu keluarga/mahram).
  - Kriteria pairing yang valid pada satu kamar: (a) semua gender sama, ATAU (b) semua occupant dalam satu `booking_id` (asumsi satu booking = satu keluarga) ATAU (c) sudah ditandai `marital_status='married'` & nama spouse cocok ATAU (d) masuk grup mahram via kolom baru.
- UI di pairing modal: filter kandidat berdasarkan aturan di atas; tampilkan badge "Mahram" / "Sesama Gender". Validasi auto-assign pakai aturan yang sama.
- Auto-assign quad: prioritaskan satu booking dulu, isi sisa kuota dengan jamaah sesama gender dari booking lain.

## 7. Error di Menu Perlengkapan

Error `Cannot read properties of undefined (reading 'payload')` di EquipmentPage berasal dari panggilan `send-payment-reminder` (401) — bukan logika equipment. Setelah perbaikan (1) selesai, error ini hilang otomatis.

Warning aksesibilitas `DialogContent requires a DialogTitle`: tambahkan `<DialogTitle>` (atau `VisuallyHidden`) ke dialog yang relevan di `EquipmentPage` / sub-komponennya — non-blocking tapi diperbaiki sekalian.

---

## Detail Teknis (untuk implementasi)

**File yang akan diubah**:
- `supabase/config.toml` — tambah `verify_jwt = false` untuk 2 fungsi
- `supabase/migrations/...sql` — seed `package_types`, optional kolom `mahram_customer_id`
- `src/hooks/usePackageTypes.ts` — tambah default tabungan
- `src/components/admin/forms/PackageForm.tsx` — field tabungan kondisional
- `src/components/packages/PackageSearch.tsx` — default price 0/Infinity, opsi tabungan, durasi range
- `src/pages/packages/PackageList.tsx` — helper `getStartingPrice`, fix filter
- `src/pages/admin/AdminBookings.tsx` — default period "all" + opsi
- `src/pages/admin/AdminDepartureDetail.tsx` — join `room_occupants` & `room_assignments`
- `src/pages/operational/RoomingListPage.tsx` — sumber `room_number` dari `room_assignments`
- `src/pages/admin/AdminRoomAssignments.tsx` — perluasan logic mahram (booking_id-based + parent-child)
- `src/pages/operational/EquipmentPage.tsx` — tambah `DialogTitle` (a11y)

**Catatan**: Tidak ada perubahan skema breaking; semua filter & default backward-compatible.