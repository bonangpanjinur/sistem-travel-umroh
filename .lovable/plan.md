
# Rencana Perbaikan UX Perlengkapan, Keberangkatan, Itinerary & Kamar

## 1. Perbaikan Halaman Perlengkapan (Produk & Operasional)

### A. Tampilan Utama: Ringkasan Stok Perlengkapan
Menambahkan tampilan ringkasan stok di bagian atas halaman sebelum filter keberangkatan:
- Menampilkan setiap item perlengkapan sebagai kartu kecil: **Nama Item | Stok Tersedia | Total Terdistribusi**
- Menggunakan `Progress` bar untuk visualisasi rasio distribusi vs stok

### B. Perbedaan Perlengkapan Berdasarkan Gender & Usia
Menambahkan kolom `category` dan `applicable_gender` pada tabel `equipment_items`:
- `category`: enum `general`, `male_only`, `female_only`, `child_only`
- Saat distribusi, filter otomatis perlengkapan berdasarkan gender jamaah (data dari `customers.gender`)
- Contoh: **Ihram** hanya muncul untuk laki-laki, **Mukena** hanya untuk perempuan
- Query `booking_passengers` akan di-join dengan `customers` untuk mendapatkan `gender`

### C. Status Distribusi di Daftar Jamaah
- Kolom status menampilkan: **"3/5 item"** dengan badge **Lengkap** (hijau) / **Belum Lengkap** (kuning) / **Belum Ada** (merah)
- Tambahkan ikon gender (Laki/Perempuan/Anak) di samping nama jamaah
- Progress bar per jamaah tetap ada

### D. Bulk Distribution
- Tombol "Bagikan Semua" untuk mendistribusikan semua item sekaligus ke semua jamaah yang belum lengkap
- Tetap mempertahankan distribusi per-jamaah via drawer

---

## 2. Fix Error Itinerary: `departure_itineraries` Not Found

### Masalah
Tabel `departure_itineraries` belum ada di database (tidak ada migration yang membuatnya). Kode di `LinkItineraryForm.tsx` menggunakan `(supabase as any)` untuk bypass type checking, tapi tabelnya memang tidak ada.

### Solusi
Membuat migration SQL:
```sql
CREATE TABLE public.departure_itineraries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id UUID NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.itinerary_templates(id) ON DELETE CASCADE,
  customized_days JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(departure_id)
);

ALTER TABLE public.departure_itineraries ENABLE ROW LEVEL SECURITY;

-- RLS policies (admin only)
CREATE POLICY "Admin can manage departure itineraries"
  ON public.departure_itineraries FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

NOTIFY pgrst, 'reload schema';
```

---

## 3. Perbaikan Tampilan Harga di Tabel Keberangkatan

### Masalah
Harga ditampilkan vertikal dengan label Q/T/D/S yang kecil dan sulit dibaca.

### Solusi
Mengubah tampilan harga menjadi **grid 2x2 yang lebih compact**:
- Menggunakan layout grid dengan label yang lebih jelas
- Format: `Q 25jt | T 28jt` (baris 1), `D 32jt | S 45jt` (baris 2)
- Warna label berbeda per tipe kamar untuk pembeda visual
- Tooltip tetap menampilkan harga penuh saat hover

---

## 4. Rencana Perbaikan UX Pengaturan Kamar

### Masalah Saat Ini
- Duplikasi UI: Stats cards DAN tabs menampilkan info yang sama
- Pairing hanya untuk Double, tapi tidak ada fitur grouping untuk Quad/Triple
- Tidak ada drag-and-drop atau visual room assignment

### Rencana Perbaikan
1. **Hapus duplikasi**: Gabungkan stats cards dengan tab selector menjadi satu komponen ringkasan
2. **Visual Room Cards**: Setiap kamar ditampilkan sebagai "card" dengan slot kosong yang bisa diisi jamaah
   - Quad: 4 slot, Triple: 3 slot, Double: 2 slot, Single: 1 slot
3. **Auto-assign**: Tombol untuk otomatis mengelompokkan jamaah berdasarkan gender ke kamar yang tersedia
4. **Gender Filter**: Filter jamaah berdasarkan gender saat pairing/grouping
5. **Room Number Batch Input**: Input nomor kamar secara batch untuk beberapa kamar sekaligus

*Catatan: Implementasi visual room cards akan dilakukan bertahap. Pada tahap pertama, fokus pada penghapusan duplikasi UI dan penambahan auto-assign.*

---

## Detail Teknis

### Migration Database
1. Tambah kolom `category` pada `equipment_items` (default: `'general'`)
2. Buat tabel `departure_itineraries`
3. `NOTIFY pgrst, 'reload schema'`

### File yang Dimodifikasi
| File | Perubahan |
|:---|:---|
| `src/pages/operational/EquipmentPage.tsx` | Tambah ringkasan stok, filter gender, bulk action |
| `src/components/operational/equipment/EquipmentDistributionDrawer.tsx` | Filter item berdasarkan gender jamaah |
| `src/pages/admin/AdminDepartures.tsx` | Perbaiki layout harga grid 2x2 |
| `src/components/admin/forms/LinkItineraryForm.tsx` | Tidak perlu diubah (hanya butuh tabel) |
| `src/pages/admin/AdminRoomAssignments.tsx` | Hapus duplikasi stats/tabs, tambah auto-assign |

### File Baru
| File | Deskripsi |
|:---|:---|
| Migration SQL | Tabel `departure_itineraries` + kolom `category` di `equipment_items` |
