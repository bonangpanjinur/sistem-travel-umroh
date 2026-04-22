

## Perbaikan 6 Issue Frontend & Backend

### 1. Dashboard "Stok Rendah" menampilkan 0 padahal ada stok
**Akar masalah:** `useDashboardAlerts.ts` mem-fetch hanya `equipment_items` dengan `stock_quantity <= 5` lalu menampilkan `total` — jika tidak ada stok kritis, totalnya 0 walau ada banyak item.

**Fix:** Ubah hook untuk fetch SEMUA equipment lalu hitung breakdown (total, low, critical, outOfStock). Card di dashboard menampilkan `total` (jumlah seluruh item) dengan badge tambahan untuk critical/low.

- File: `src/hooks/useDashboardAlerts.ts` — hapus filter `.lte('stock_quantity', 5)`, hitung breakdown setelah fetch.
- File: `src/pages/admin/AdminDashboard.tsx` — perbaiki label & angka card "Stok Kritis" jadi: total item, sub-info: "X kritis, Y menipis".

### 2. Kanban Board CRM Leads bertumpuk di viewport menengah
**Akar masalah:** Layout `grid lg:grid-cols-5` memaksa 5 kolom dalam viewport ~889px sehingga `min-w-[280px]` saling tumpuk.

**Fix:** Ganti ke `flex` horizontal scrollable dengan column fixed-width. Tambahkan:
- Background lembut per kolom (warna sesuai status), header sticky di atas
- Card lead lebih rapi: avatar bulat, nama bold, badge sumber kecil, nominal pipeline di kanan
- Drop zone visual yang jelas, scroll-snap untuk navigasi mobile

- File: `src/pages/admin/AdminLeads.tsx` (bagian TabsContent "kanban", baris ~331-377) — ganti `grid lg:grid-cols-5` → `flex gap-4 overflow-x-auto snap-x snap-mandatory`, kolom `w-[300px] flex-shrink-0 snap-start` dengan `bg-muted/30 rounded-xl p-3`.

### 3. Kupon "Berlaku" tidak berfungsi (tanggal tidak tersimpan saat edit)
**Akar masalah:** Form `CouponForm.tsx` baris 71-72 set `defaultValues.valid_from = couponData?.valid_from || ""`. Database menyimpan timestamp ISO (`2026-01-01T00:00:00+00:00`), tapi `<input type="date">` butuh format `YYYY-MM-DD`. Akibatnya field kosong saat edit & user mengira fitur tidak berfungsi.

**Fix:**
- Slice timestamp ke `YYYY-MM-DD` di `defaultValues`.
- Tambah validasi Zod: `valid_until` harus ≥ `valid_from` jika keduanya diisi.
- Tampilkan badge "Akan kadaluarsa dalam X hari" di list kupon untuk kejelasan.

- File: `src/components/admin/forms/CouponForm.tsx` — fix defaultValues dengan helper `toDateInput(iso)`, tambah validasi cross-field di schema.

### 4. Itinerary tidak muncul di Frontend Detail Paket
**Akar masalah:** `PackageDetail.tsx` baris 110 hanya membaca `pkg.itinerary` (kolom JSONB di tabel `packages`). Admin meng-link itinerary di level *departure* via tabel `departure_itineraries` → `template_id` → `itinerary_templates.days` (JSONB).

**Fix:** Tambah query `departure_itineraries` untuk paket aktif:
- Query departure_itineraries JOIN itinerary_templates untuk semua departure paket ini
- Logic: tampilkan itinerary dari departure yang terpilih/expanded; fallback ke `pkg.itinerary` jika tidak ada
- Update tab "Itinerary" baris 241-264 untuk merender `template.days` (jsonb array) atau `customized_days`

- File: `src/pages/packages/PackageDetail.tsx` — tambah query, modifikasi tab itinerary.

### 5. Daftar Jemaah kosong di Detail Keberangkatan
**Akar masalah:** Query baris 82-112 filter `booking.booking_status = 'confirmed'`. Booking yang baru dibuat berstatus `pending` (menunggu pembayaran) sehingga tidak muncul, padahal kuota sudah ter-increment.

**Fix:**
- Ganti filter menjadi `.in("booking.booking_status", ["confirmed", "pending", "paid_partial"])` — kecuali `cancelled`
- Tambahkan kolom "Status Booking" + "Status Bayar" di tabel agar admin tahu kondisinya
- Tampilkan summary di header: "X confirmed, Y pending"

- File: `src/pages/admin/AdminDepartureDetail.tsx` baris 82-112 (query) dan baris 572-625 (table).

### 6. Edge Function `send-payment-reminder` returns non-2xx
**Akar masalah:** Fungsi sudah return 200 untuk error wrap, tapi mungkin ada error sebelum `serve` callback (cold start crash) atau masalah deployment. Perlu deploy ulang + cek logs.

**Fix:**
- Deploy ulang fungsi `send-payment-reminder` 
- Cek `edge_function_logs` untuk error sebenarnya
- Tambahkan handler 404/missing config yang lebih graceful
- Frontend di `AdminPayments.tsx` sudah handle `data?.success`, jadi cukup kembalikan struktur konsisten

- File: `supabase/functions/send-payment-reminder/index.ts` — tambah validasi config WhatsApp di awal, return jelas jika belum dikonfigurasi.
- Deploy via `supabase--deploy_edge_functions`.

### Catatan Keamanan
Token Supabase yang Anda kirim (`sbp_...`) sudah TER-EKSPOS di chat. **Segera rotasi** di Supabase Dashboard → Account → Access Tokens. Saya tidak menyimpan/menggunakan token tersebut — deployment edge function sudah otomatis dengan kredensial internal Lovable Cloud.

### File Diubah
1. `src/hooks/useDashboardAlerts.ts`
2. `src/pages/admin/AdminDashboard.tsx` (card Stok)
3. `src/pages/admin/AdminLeads.tsx` (kanban layout)
4. `src/components/admin/forms/CouponForm.tsx` (date format fix)
5. `src/pages/packages/PackageDetail.tsx` (itinerary query)
6. `src/pages/admin/AdminDepartureDetail.tsx` (passenger filter)
7. `supabase/functions/send-payment-reminder/index.ts` (graceful config check) + redeploy

### Tidak Diubah
- Schema database (semua tabel sudah benar)
- RLS policies
- Auth flow
- UI primitives

