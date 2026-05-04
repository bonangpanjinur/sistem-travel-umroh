# Rencana Pengembangan Fitur Distribusi Perlengkapan Terstruktur

Dokumen ini merinci rencana teknis untuk mengimplementasikan alur distribusi perlengkapan yang lebih terstruktur dan *user-friendly* di halaman **Manajemen Perlengkapan**.

## Alur Pengguna (User Flow)

Alur yang akan diimplementasikan mengikuti urutan logis operasional:
1.  **Pilih Paket**: Admin memilih paket umrah/haji yang tersedia.
2.  **Pilih Tanggal Keberangkatan**: Muncul daftar tanggal keberangkatan yang terkait dengan paket tersebut.
3.  **List Jamaah**: Menampilkan daftar jamaah yang terdaftar pada keberangkatan yang dipilih.
4.  **Detail Jamaah**: Memilih salah satu jamaah untuk melihat detail dan status perlengkapannya.
5.  **Checklist Perlengkapan**: Menampilkan daftar perlengkapan (Data Master) dengan checkbox untuk menandai apa yang didistribusikan.
6.  **Simpan**: Menyimpan status distribusi ke database.

---

## Rencana Implementasi Teknis

### 1. Perubahan Komponen `DistributionTab.tsx`
Komponen ini akan diubah menjadi *wizard-like interface* atau *multi-step navigation*:

- **Step 1: Pemilihan Grup (Paket & Tanggal)**
  - Menggunakan `Select` component untuk memilih `package_id`.
  - Setelah paket dipilih, filter daftar `departure_id` yang hanya milik paket tersebut.
  - Data diambil dari tabel `packages` dan `departures`.

- **Step 2: Daftar Jamaah**
  - Menampilkan `DataTable` berisi jamaah dari `booking_passengers` yang terhubung ke `departure_id` yang dipilih.
  - Menambahkan kolom status ringkasan (misal: "3/5 Item Terdistribusi").

- **Step 3: Panel Distribusi (Modal atau Expandable)**
  - Saat jamaah diklik, tampilkan daftar semua item dari `equipment_items`.
  - Setiap item memiliki `Checkbox`.
  - Logika *Initial State*: Checkbox tercentang jika data sudah ada di `equipment_distributions`.

### 2. Integrasi Data (Supabase)
Query yang akan digunakan:
- **Fetch Packages**: `supabase.from('packages').select('*')`
- **Fetch Departures**: `supabase.from('departures').select('*').eq('package_id', selectedPackageId)`
- **Fetch Passengers**: 
  ```typescript
  supabase
    .from('booking_passengers')
    .select('customer:customers(id, full_name), booking:bookings(departure_id)')
    .eq('booking.departure_id', selectedDepartureId)
  ```
- **Fetch Existing Distributions**: 
  ```typescript
  supabase
    .from('equipment_distributions')
    .select('*')
    .eq('customer_id', selectedCustomerId)
    .eq('departure_id', selectedDepartureId)
  ```

### 3. Logika Penyimpanan (Batch Update)
- Implementasi fungsi `handleSaveDistributions` yang akan melakukan `upsert` ke tabel `equipment_distributions`.
- Mengurangi `stock_quantity` di `equipment_items` secara otomatis saat item baru ditandai sebagai terdistribusi.

---

## Metrik Keberhasilan (Success Criteria)

| Kriteria | Deskripsi |
| :--- | :--- |
| **Akurasi Data** | Distribusi tercatat tepat pada jamaah di grup keberangkatan yang benar. |
| **Efisiensi** | Admin tidak perlu mencari nama jamaah secara manual dari seluruh database. |
| **User Experience** | Alur linear memudahkan staf gudang yang baru untuk memahami proses. |
| **Traceability** | Riwayat distribusi dapat dilacak per paket dan per tanggal keberangkatan. |

---

## Langkah Selanjutnya (Next Steps)
1.  [ ] Modifikasi `DistributionTab.tsx` untuk mendukung *Step Navigation*.
2.  [ ] Buat sub-komponen `CustomerSelection.tsx`.
3.  [ ] Buat sub-komponen `EquipmentChecklist.tsx`.
4.  [ ] Implementasi fungsi `useMutation` untuk penyimpanan batch.
5.  [ ] Testing dengan data dummy jamaah dan paket.
