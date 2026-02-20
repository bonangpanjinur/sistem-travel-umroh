

# Rencana Perbaikan Bug - RLS Infinite Recursion dan Masalah Terkait

## Masalah Utama: Infinite Recursion di Database

Database mengeluarkan error **"infinite recursion detected in policy"** pada tabel `customers` dan `bookings`. Ini adalah bug CRITICAL yang menyebabkan banyak halaman gagal memuat data.

### Akar Masalah

Kebijakan keamanan database saling merujuk secara melingkar:

```text
customers policy "Sales can view relevant customers"
  --> query ke tabel bookings
    --> bookings policy "Users can view own bookings"
      --> query ke tabel customers  (LOOP!)

customers policy "Agents can view customers from their bookings"
  --> function agent_can_access_customer()
    --> query ke booking_passengers
      --> booking_passengers policy
        --> query ke bookings
          --> bookings policy
            --> query ke customers  (LOOP!)
```

### Dampak ke Pengguna
- Halaman **Customer Dashboard** gagal memuat booking
- Halaman **Booking Detail** (customer) error saat load passengers
- Halaman **Admin Booking Detail** bisa error untuk beberapa role
- Halaman **Admin Bookings** gagal untuk role sales
- Semua query yang melibatkan relasi customers-bookings berpotensi error

---

## Rencana Perbaikan

### Langkah 1: Buat Helper Functions (SECURITY DEFINER)

Buat fungsi-fungsi baru yang berjalan dengan hak akses tinggi (bypass RLS) sehingga tidak memicu recursion:

- `get_customer_user_id(customer_id)` - Ambil user_id dari customers tanpa kena RLS
- `get_booking_customer_ids_for_user(user_id)` - Ambil daftar customer_id dari bookings milik user tanpa kena RLS
- `is_sales_assigned(user_id)` - Cek apakah user adalah sales yang terkait

### Langkah 2: Perbaiki RLS Policy di `customers`

Ganti policy yang bermasalah:

**HAPUS:**
- "Sales can view relevant customers" (query ke bookings = recursion)
- "Agents can view customers from their bookings" (via function yang query bookings = recursion)

**GANTI DENGAN:**
- Policy baru yang menggunakan SECURITY DEFINER functions, sehingga pengecekan relasi ke bookings tidak melewati RLS customers lagi

### Langkah 3: Perbaiki RLS Policy di `bookings`

**HAPUS:**
- "Users can view own bookings" (query ke customers = recursion)
- Policy duplikat "Staff can view all bookings" (sudah tercakup oleh "Admins can manage bookings")

**GANTI DENGAN:**
- Policy "Users can view own bookings" yang menggunakan function `get_customer_user_id()` untuk cek kepemilikan tanpa query langsung ke tabel customers

### Langkah 4: Perbaiki RLS Policy di `booking_passengers`

**HAPUS:**
- "Users can view own booking passengers" (query ke bookings + customers = recursion chain)
- "Agents can view their booking passengers" (query ke bookings = bisa recursion)

**GANTI DENGAN:**
- Policy yang menggunakan SECURITY DEFINER function untuk cek kepemilikan

---

## Detail Teknis

### Database Migration (1 file SQL)

Isi migrasi:

1. **3 fungsi SECURITY DEFINER baru:**

```text
get_customer_user_id(uuid) -> uuid
  SELECT user_id FROM customers WHERE id = _customer_id

get_booking_customer_ids_for_user(uuid) -> uuid[]
  SELECT array_agg(customer_id) FROM bookings b 
  JOIN customers c ON c.id = b.customer_id WHERE c.user_id = _user_id

user_owns_booking(booking_id, user_id) -> boolean
  SELECT EXISTS(SELECT 1 FROM bookings b 
  JOIN customers c ON c.id = b.customer_id 
  WHERE b.id = _booking_id AND c.user_id = _user_id)
```

2. **Drop 5 policy lama** (yang menyebabkan recursion)
3. **Buat 5 policy pengganti** menggunakan functions di atas

### File Kode yang Diubah

Tidak ada perubahan kode frontend diperlukan - semua fix ada di level database. Query-query yang sudah ada akan otomatis bekerja setelah RLS diperbaiki.

---

## Ringkasan Perubahan

| Item | Tipe | Detail |
|------|------|--------|
| 3 SECURITY DEFINER functions | Baru | Memutus rantai recursion |
| 5 RLS policies | Hapus | Yang menyebabkan circular reference |
| 5 RLS policies | Baru | Pengganti yang aman dari recursion |
| 0 file frontend | - | Tidak perlu perubahan kode |

Semua perbaikan ada dalam satu migrasi database.

