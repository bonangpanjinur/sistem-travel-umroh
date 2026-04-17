# Analisis Akar Masalah: Error RPC `bulk_sync_menu_items`

**Tanggal**: 17 April 2026
**Penulis**: Manus AI

## 1. Ringkasan Masalah

Terjadi error `400 (Bad Request)` pada pemanggilan fungsi Remote Procedure Call (RPC) `public.bulk_sync_menu_items` di Supabase. Error ini muncul saat aplikasi frontend mencoba melakukan sinkronisasi daftar menu. Log konsol menunjukkan pesan `POST https://vtaqwkpnvtazcnvcfmyy.supabase.co/rest/v1/rpc/bulk_sync_menu_items 400 (Bad Request)`.

## 2. Investigasi dan Temuan

Investigasi dilakukan dengan menganalisis kode sumber proyek `vinstourtravel`, khususnya bagian yang terkait dengan pemanggilan RPC Supabase dan definisi skema database.

### 2.1. Kode Frontend

Fungsi `bulk_sync_menu_items` dipanggil di `src/hooks/useAuth.tsx` saat pengguna login, khususnya jika pengguna memiliki peran admin atau staf. Pemanggilan ini bertujuan untuk menyinkronkan daftar menu yang direkomendasikan (`RECOMMENDED_MENUS`) ke database Supabase. Data `RECOMMENDED_MENUS` didefinisikan di `src/hooks/useSyncMenusFixed.ts`.

Pada `src/hooks/useAuth.tsx`, baris kode yang relevan adalah:

```typescript
supabase.rpc(\'bulk_sync_menu_items\', {
  _menu_items: JSON.stringify(RECOMMENDED_MENUS)
})
  .then(() => console.log(\'Menu sync completed\'))
  .catch((err: any) => console.error(\'Menu sync failed:\', err));
```

Ini menunjukkan bahwa array objek menu (`RECOMMENDED_MENUS`) diubah menjadi string JSON menggunakan `JSON.stringify()` sebelum dikirim sebagai parameter `_menu_items` ke fungsi RPC.

### 2.2. Skema Database Supabase

Definisi fungsi `public.bulk_sync_menu_items` ditemukan dalam file migrasi Supabase terbaru, `supabase/migrations/20260417_enhanced_menu_access_control.sql`. Definisi fungsi tersebut adalah sebagai berikut:

```sql
CREATE OR REPLACE FUNCTION public.bulk_sync_menu_items(
  _menu_items JSONB
)
RETURNS TABLE(synced_count INTEGER, failed_count INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _synced_count INTEGER := 0;
  _failed_count INTEGER := 0;
  _item JSONB;
BEGIN
  -- Only admins can sync menu items
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION \'Only admins can sync menu items\';
  END IF;

  FOR _item IN SELECT jsonb_array_elements(_menu_items)
  LOOP
    BEGIN
      PERFORM public.sync_menu_item(
        _item->>\'key\',
        _item->>\'label\',
        _item->>\'path\',
        _item->>\'icon\',
        _item->>\'group_name\',
        (_item->>\'sort_order\')::INTEGER,
        _item->>\'required_permission\'
      );
      _synced_count := _synced_count + 1;
    EXCEPTION WHEN OTHERS THEN
      _failed_count := _failed_count + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT _synced_count, _failed_count;
END;
$$;
```

Perhatikan bahwa parameter `_menu_items` diharapkan bertipe `JSONB`, bukan `TEXT`.

Selain itu, fungsi `sync_menu_item` yang dipanggil di dalam `bulk_sync_menu_items` memiliki validasi untuk `required_permission`:

```sql
IF NOT EXISTS (SELECT 1 FROM public.permissions_list WHERE key = _required_permission) THEN
  RAISE EXCEPTION \'Permission % does not exist\', _required_permission;
END IF;
```

Ini berarti setiap `required_permission` yang dikirim harus ada di tabel `public.permissions_list`. Ketika membandingkan `RECOMMENDED_MENUS` dari `useSyncMenusFixed.ts` dengan seed data di `20260417_enhanced_menu_access_control.sql`, ditemukan ketidaksesuaian pada format permission key. Misalnya, `RECOMMENDED_MENUS` menggunakan `menu_dashboard`, sedangkan seed data menggunakan `dashboard.view`.

## 3. Akar Masalah

Ada dua akar masalah utama yang menyebabkan error `400 (Bad Request)`:

1.  **Ketidaksesuaian Tipe Data Parameter RPC**: Frontend mengirimkan parameter `_menu_items` sebagai string JSON (`TEXT`) setelah di-`JSON.stringify()`, sementara fungsi RPC `public.bulk_sync_menu_items` di database mengharapkan tipe data `JSONB`. Supabase secara otomatis menolak permintaan dengan tipe data yang tidak sesuai, menghasilkan error `400 Bad Request`.
2.  **Ketidaksesuaian Permission Key**: Daftar menu yang dikirim dari frontend (`RECOMMENDED_MENUS`) menggunakan format permission key yang tidak valid atau tidak ada dalam tabel `public.permissions_list` di database. Hal ini akan menyebabkan fungsi `sync_menu_item` (yang dipanggil oleh `bulk_sync_menu_items`) memicu `RAISE EXCEPTION` karena permission tidak ditemukan, yang kemudian ditangkap sebagai error oleh frontend dan berkontribusi pada kegagalan RPC.

## 4. Dampak

*   Menu dinamis tidak dapat disinkronkan dengan benar ke database.
*   Pengguna admin/staf mungkin tidak melihat daftar menu yang diperbarui atau lengkap.
*   Pengalaman pengguna terganggu karena fungsionalitas menu yang tidak konsisten.

## 5. Rekomendasi Perbaikan

Untuk mengatasi masalah ini, diperlukan perubahan pada kode frontend dan penyesuaian data:

1.  **Modifikasi Pemanggilan RPC di Frontend**: Ubah pemanggilan `supabase.rpc(\'bulk_sync_menu_items\', { _menu_items: JSON.stringify(RECOMMENDED_MENUS) })` menjadi `supabase.rpc(\'bulk_sync_menu_items\', { _menu_items: RECOMMENDED_MENUS })` di `src/hooks/useAuth.tsx` dan `src/hooks/useSyncMenusFixed.ts`. Ini akan mengirimkan array objek JavaScript secara langsung, yang akan diinterpretasikan oleh Supabase sebagai `JSONB`.
2.  **Perbarui Permission Key di `RECOMMENDED_MENUS`**: Sesuaikan semua `required_permission` dalam array `RECOMMENDED_MENUS` di `src/hooks/useSyncMenusFixed.ts` agar sesuai dengan key yang valid di tabel `public.permissions_list` (misalnya, ubah `menu_dashboard` menjadi `dashboard.view`).
3.  **Hapus Redundansi**: Hapus `useSyncMenus` yang tidak digunakan lagi dan pastikan hanya `useSyncMenusFixed` yang relevan yang digunakan. Atau, gabungkan logika yang diperlukan ke dalam satu hook yang lebih robust.

Implementasi perbaikan ini akan memastikan bahwa data menu disinkronkan dengan benar dan sesuai dengan skema database yang ada, menyelesaikan error `400 Bad Request`.
