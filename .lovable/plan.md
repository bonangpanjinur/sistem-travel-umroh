# Rencana Perbaikan: Sinkronisasi Seat Keberangkatan

## Akar Masalah

Kolom `departures.booked_count` saat ini di-update **manual** dari berbagai tempat di kode dan **tidak pernah dikurangi** saat ada perubahan, sehingga angka "kursi tersedia" yang tampil di **Jadwal Keberangkatan**, **Form Booking**, dan **Detail Paket** tidak pernah cocok dengan jumlah jemaah yang sesungguhnya terdaftar.

### Bug yang Teridentifikasi

1. **Tidak ada decrement saat booking di-cancel/refund**
   - `useUpdateBookingStatus` (src/hooks/useBookings.ts) hanya meng-update kolom `booking_status`, tidak menyentuh `departures.booked_count`.
   - `AdminBookingDetail.tsx` mengubah status ke `cancelled`/`refunded` tanpa mengembalikan kuota.
   - **Akibat:** booking yang dibatalkan tetap "memakan" seat selamanya.

2. **Tidak ada decrement saat booking dihapus**
   - Penghapusan booking dari admin tidak mengurangi `booked_count`.

3. **Increment manual tersebar di banyak tempat (race-condition prone)**
   - 5 lokasi melakukan pola read-then-write tanpa kunci:
     - `useBookingWizard.ts:222`
     - `useBookingWizardDynamic.ts:304`
     - `useBookingWizardSimple.ts:186`
     - `AdminBookingCreate.tsx:351`
     - `ChangePackageDialogV2.tsx:269` (update saat ganti paket)
   - Sudah ada RPC `increment_departure_booked` yang menangani lock, tetapi tidak dipakai.
   - **Akibat:** dua booking bersamaan bisa membuat hitungan meleset, dan validasi kuota bisa di-bypass.

4. **Pindah paket/keberangkatan rentan tidak konsisten**
   - `ChangePackageDialogV2` mengurangi old & menambah new tanpa transaksi atomik. Kalau salah satu gagal, hitungan rusak.

5. **Field `total_pax` tidak selalu sama dengan jumlah baris `booking_passengers`**
   - Increment memakai `totalPax` dari form, bukan dari count baris penumpang yang benar-benar masuk. Kalau sebagian insert penumpang gagal, angkanya mismatch.

6. **Tidak ada mekanisme rekonsiliasi**
   - Tidak ada cara bagi admin untuk memperbaiki angka `booked_count` yang sudah terlanjur menyimpang.

## Solusi

### A. Database (sumber kebenaran tunggal)

Ganti pendekatan "update manual dari aplikasi" menjadi **trigger otomatis** + RPC untuk operasi khusus.

1. **Trigger `sync_departure_booked_count`** pada tabel `bookings`:
   - `AFTER INSERT`: jika `booking_status` aktif (bukan `cancelled`/`refunded`), tambahkan `total_pax` ke `departures.booked_count` keberangkatan terkait.
   - `AFTER UPDATE`:
     - Jika `departure_id` berubah → kurangi dari yang lama, tambah ke yang baru.
     - Jika `booking_status` pindah aktif↔cancelled/refunded → tambah/kurangi sesuai.
     - Jika `total_pax` berubah → sesuaikan delta.
   - `AFTER DELETE`: jika sebelumnya aktif, kurangi.
   - Semua operasi dibungkus `SELECT … FOR UPDATE` agar aman concurrent.

2. **RPC `recalculate_departure_booked_count(p_departure_id uuid DEFAULT NULL)`**
   - Tanpa argumen → recompute semua keberangkatan.
   - Dengan argumen → recompute satu keberangkatan saja.
   - Formula:
     ```sql
     SUM(total_pax) WHERE booking_status NOT IN ('cancelled','refunded')
     ```
   - Dipakai untuk tombol "Sinkronkan Ulang" di UI dan untuk migration data yang sudah terlanjur menyimpang.

3. **Migration data**: Jalankan `recalculate_departure_booked_count()` sekali sebagai bagian dari migration untuk membenarkan angka eksisting.

### B. Frontend (pembersihan)

1. **Hapus semua update manual `booked_count`** di:
   - `useBookingWizard.ts`
   - `useBookingWizardDynamic.ts`
   - `useBookingWizardSimple.ts`
   - `AdminBookingCreate.tsx`
   - `ChangePackageDialogV2.tsx` (cukup update `bookings.departure_id`, trigger urus sisanya)

2. **Validasi kuota tetap di sisi aplikasi** (sebelum insert) untuk UX, tetapi jaminan akhir berasal dari trigger/constraint.

3. **Invalidate React Query** `['departures']` setelah mutasi booking agar tampilan sinkron.

### C. UI Tambahan

1. Di `AdminDepartures.tsx`, tambahkan tombol **"Sinkronkan Ulang Kuota"** (admin/owner) yang memanggil RPC `recalculate_departure_booked_count()` lalu invalidate cache.

2. Pada baris keberangkatan, tampilkan tooltip/badge bila terdeteksi mismatch (opsional fase berikutnya).

## Detail Teknis

### Migration SQL (ringkas)

```sql
-- 1. Trigger function
CREATE OR REPLACE FUNCTION public.sync_departure_booked_count()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
DECLARE
  v_old_active bool := false;
  v_new_active bool := false;
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN
    v_old_active := OLD.booking_status NOT IN ('cancelled','refunded');
  END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN
    v_new_active := NEW.booking_status NOT IN ('cancelled','refunded');
  END IF;

  -- Kurangi dari old departure jika sebelumnya aktif
  IF TG_OP = 'DELETE' OR (TG_OP='UPDATE' AND
      (OLD.departure_id IS DISTINCT FROM NEW.departure_id
       OR v_old_active <> v_new_active
       OR OLD.total_pax IS DISTINCT FROM NEW.total_pax)) THEN
    IF v_old_active AND OLD.departure_id IS NOT NULL THEN
      UPDATE departures
        SET booked_count = GREATEST(0, COALESCE(booked_count,0) - COALESCE(OLD.total_pax,0))
        WHERE id = OLD.departure_id;
    END IF;
  END IF;

  -- Tambah ke new departure jika sekarang aktif
  IF TG_OP = 'INSERT' OR (TG_OP='UPDATE' AND
      (OLD.departure_id IS DISTINCT FROM NEW.departure_id
       OR v_old_active <> v_new_active
       OR OLD.total_pax IS DISTINCT FROM NEW.total_pax)) THEN
    IF v_new_active AND NEW.departure_id IS NOT NULL THEN
      UPDATE departures
        SET booked_count = COALESCE(booked_count,0) + COALESCE(NEW.total_pax,0)
        WHERE id = NEW.departure_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER trg_sync_departure_booked_count
AFTER INSERT OR UPDATE OR DELETE ON bookings
FOR EACH ROW EXECUTE FUNCTION sync_departure_booked_count();

-- 2. Recalc RPC
CREATE OR REPLACE FUNCTION public.recalculate_departure_booked_count(p_departure_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public AS $$
BEGIN
  UPDATE departures d SET booked_count = sub.cnt
  FROM (
    SELECT departure_id, COALESCE(SUM(total_pax),0)::int AS cnt
    FROM bookings
    WHERE booking_status NOT IN ('cancelled','refunded')
      AND (p_departure_id IS NULL OR departure_id = p_departure_id)
    GROUP BY departure_id
  ) sub
  WHERE d.id = sub.departure_id
    AND (p_departure_id IS NULL OR d.id = p_departure_id);

  -- Departure tanpa booking aktif → 0
  UPDATE departures
    SET booked_count = 0
  WHERE (p_departure_id IS NULL OR id = p_departure_id)
    AND id NOT IN (
      SELECT departure_id FROM bookings
      WHERE booking_status NOT IN ('cancelled','refunded')
        AND departure_id IS NOT NULL
    );
END $$;

-- 3. Recalc data eksisting
SELECT recalculate_departure_booked_count();
```

### Perubahan File Frontend

- `src/hooks/useBookings.ts` — tidak berubah (status update sudah cukup, trigger urus sisanya).
- `src/hooks/useBookingWizard.ts` — hapus blok manual update `booked_count` (line 222-234).
- `src/hooks/useBookingWizardDynamic.ts` — sama, hapus update manual.
- `src/hooks/useBookingWizardSimple.ts` — sama.
- `src/pages/admin/AdminBookingCreate.tsx` — hapus update manual line 351.
- `src/components/admin/ChangePackageDialogV2.tsx` — hapus update manual line 269-310, cukup update `bookings.departure_id`.
- `src/pages/admin/AdminDepartures.tsx` — tambah tombol "Sinkronkan Ulang Kuota" yang memanggil `supabase.rpc('recalculate_departure_booked_count')`.
- Pastikan setelah cancel/refund di `AdminBookingDetail`, query `['departures']` di-invalidate.

## Urutan Implementasi

1. Migration SQL (trigger + RPC + recalc data).
2. Hapus update manual di 5 file frontend.
3. Tambah tombol "Sinkronkan Ulang Kuota" di `AdminDepartures.tsx`.
4. Tambah `queryClient.invalidateQueries(['departures'])` di hook update status booking.
5. QA: buat booking → cek seat berkurang; cancel → cek seat bertambah; ganti paket → cek dua keberangkatan ter-update; klik tombol sinkron → angka konsisten.

## Yang TIDAK Termasuk

- Migrasi `total_pax` agar otomatis = `COUNT(booking_passengers)` (perlu pembahasan terpisah karena bisa mempengaruhi laporan).
- Penanganan over-quota historis (booking lama yang melebihi kuota tidak akan ditolak, hanya dihitung).
