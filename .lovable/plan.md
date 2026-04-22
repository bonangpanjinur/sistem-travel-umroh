

## Analisis: Kenapa Daftar Jemaah Kosong di Detail Keberangkatan

### Temuan Awal
Saya sudah memeriksa kode `AdminDepartureDetail.tsx` (query passenger di baris 82-112) dan struktur database. Berikut kemungkinan penyebabnya, diurut dari yang paling mungkin:

### Kemungkinan 1: Filter PostgREST nested join salah perilaku (PALING MUNGKIN)
Query saat ini:
```ts
.from("booking_passengers")
.select("..., booking:bookings!inner(..., departure_id)")
.eq("booking.departure_id", id)
.in("booking.booking_status", ["confirmed","pending","processing","completed"])
```

Masalah: di PostgREST, `.eq("booking.departure_id", ...)` pada relasi nested **hanya mem-filter baris di dalam join**, bukan baris induk. Walau ada `!inner`, kombinasi `.eq` + `.in` pada kolom relasi sering menghasilkan nol baris karena kondisi tidak ter-AND dengan benar pada engine. Akibatnya semua passenger ter-filter habis.

### Kemungkinan 2: `booking_passengers` tidak terisi saat booking dibuat
Booking utama (1 jamaah utama) tersimpan di `bookings.customer_id`, tapi baris di `booking_passengers` baru dibuat untuk passenger tambahan. Kalau wizard hanya membuat booking 1 pax tanpa insert ke `booking_passengers`, tabel jemaah akan kosong walau booking sudah confirmed. Perlu diverifikasi di `useBookingWizard.ts`, `useBookingWizardSimple.ts`, dan `useBookingWizardDynamic.ts`.

### Kemungkinan 3: Status booking tidak ter-cover
Filter hanya menerima: `confirmed, pending, processing, completed`. Kalau status setelah konfirmasi adalah `paid`, `active`, `verified`, atau lainnya, baris akan ter-skip.

### Kemungkinan 4: RLS policy
Policy `Staff can view all passengers` menerima role `super_admin, owner, branch_manager, sales, finance, operational`. Kalau user login dengan role lain (mis. `admin` saja, `marketing`), passengers tidak akan terlihat.

### Kemungkinan 5: Ordering salah (`booking.booking_code`)
`.order('booking.booking_code')` pada relasi nested di PostgREST butuh sintaks `{ foreignTable: 'booking' }`. Tanpa itu, query bisa error atau dijalankan dengan urutan yang membuat `inner join` gagal mengikat.

---

## Rencana Perbaikan

### Langkah 1: Refactor query passenger (paling penting)
Ganti pendekatan dari "ambil semua passenger lalu filter via nested" menjadi "ambil booking_id dari departure dulu, lalu ambil passenger berdasarkan booking_id":

```ts
// 1) Ambil semua booking pada departure ini
const { data: bookings } = await supabase
  .from("bookings")
  .select("id, booking_code, room_type, booking_status, payment_status")
  .eq("departure_id", id)
  .not("booking_status", "in", "(cancelled,refunded)"); 
  // include semua status aktif (confirmed/pending/processing/paid/completed)

// 2) Ambil passengers via booking_id list
const { data: passengers } = await supabase
  .from("booking_passengers")
  .select("id, is_main_passenger, room_preference, passenger_type, customer:customers(...)")
  .in("booking_id", bookings.map(b => b.id))
  .order("is_main_passenger", { ascending: false });
```

Lalu gabungkan booking dan passenger di sisi client. Pendekatan ini menghilangkan ambiguitas filter nested PostgREST.

### Langkah 2: Fallback untuk booking tanpa passenger row
Kalau booking utama tidak punya baris `booking_passengers` (1 pax saja), buat virtual passenger dari `bookings.customer_id` agar tetap muncul di tabel jemaah dan manifest PDF.

### Langkah 3: Perluas daftar status yang dianggap "aktif"
Ganti whitelist menjadi blacklist: tampilkan semua kecuali `cancelled` dan `refunded`. Ini lebih tahan terhadap variasi status.

### Langkah 4: Diagnosa data aktual
Tambah panel debug ringkas (sementara) atau gunakan query langsung untuk memverifikasi:
- Apakah `bookings` punya `departure_id` yang benar?
- Apakah `booking_passengers.booking_id` terisi?
- Apa status booking yang sebenarnya setelah konfirmasi?

### Langkah 5: Verifikasi flow konfirmasi booking
Cek `AdminBookings.tsx` (baris 286-289) — bulk confirm hanya update `booking_status = 'confirmed'` tapi tidak menyentuh `booking_passengers`. Pastikan saat booking dibuat, semua pax (termasuk yang utama) di-insert ke `booking_passengers`. Jika tidak, perlu trigger DB atau penyesuaian wizard.

### Langkah 6: Perbaiki ordering nested
Ganti:
```ts
.order('booking.booking_code', ...)
```
menjadi:
```ts
.order('booking_code', { foreignTable: 'booking', ascending: true })
```
(jika tetap memakai pendekatan nested join).

---

## File yang Akan Disentuh
- `src/pages/admin/AdminDepartureDetail.tsx` — refactor query passenger, fallback virtual passenger, perluas status
- `src/hooks/useBookingWizard.ts`, `useBookingWizardSimple.ts`, `useBookingWizardDynamic.ts` — pastikan jamaah utama selalu di-insert ke `booking_passengers`
- (opsional) Migration: trigger `after insert on bookings` untuk auto-create `booking_passengers` baris jamaah utama jika belum ada

## Hasil yang Diharapkan
- Tab "Jemaah" menampilkan seluruh peserta dari semua booking pada keberangkatan tersebut, terlepas dari status pembayaran (selain cancelled/refunded)
- Manifest PDF dan Rooming List PDF berisi data jamaah yang lengkap
- Counter `Kuota & Jemaah` cocok dengan jumlah baris di tabel jemaah

