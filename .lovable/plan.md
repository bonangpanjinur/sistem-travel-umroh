
# Rencana Perbaikan Bug Dashboard & Halaman Terkait

## Masalah yang Ditemukan

### BUG 1: RLS Recursion Masih Ada di Tabel `payments` (CRITICAL)

Policy "Users can view own payments" di tabel `payments` masih menggunakan subquery langsung:
```text
EXISTS (SELECT 1 FROM bookings b JOIN customers c ON c.id = b.customer_id 
WHERE b.id = payments.booking_id AND c.user_id = auth.uid())
```

Subquery ini melewati RLS pada tabel `bookings` dan `customers`, yang bisa memicu infinite recursion saat user biasa (jamaah) mencoba melihat pembayarannya. Halaman yang terdampak:
- `/my-bookings/:id/payment` (PaymentUpload)
- `/my-bookings/:id` (BookingDetail - bagian riwayat pembayaran)

### BUG 2: RLS Recursion di `booking_status_history` (CRITICAL)

Policy "Users can view own booking history" punya pola yang sama persis - JOIN langsung ke `bookings` + `customers` tanpa SECURITY DEFINER.

### BUG 3: RLS Recursion di `customer_documents` (MEDIUM)

Beberapa policy di `customer_documents` melakukan query langsung ke tabel yang dilindungi RLS:
- "Users can view own documents" - query ke `customers`
- "Agents can view/update documents" - query ke `booking_passengers` + `bookings` + `agents`

Ini bisa gagal saat jamaah atau agen mencoba melihat/upload dokumen.

### BUG 4: `AdminAnalytics` Crash pada `created_at` null (LOW)

Di `AdminAnalytics.tsx` baris 91, `parseISO(b.created_at)` akan crash jika `created_at` null karena TypeScript type menunjukkan field ini nullable.

### BUG 5: Dashboard Query Tanpa Batas (LOW)

`useDashboardStats` mengambil SEMUA bookings tanpa limit. Dengan pertumbuhan data, ini bisa memperlambat dashboard admin secara signifikan.

---

## Rencana Perbaikan

### Langkah 1: Fix RLS Recursion (Database Migration)

Buat SECURITY DEFINER function baru dan ganti policy yang bermasalah:

**Function baru:**
- `user_owns_payment(payment_id, user_id)` - cek kepemilikan payment tanpa trigger RLS

**Policy yang di-drop & diganti:**

| Tabel | Policy Lama | Policy Baru |
|-------|------------|-------------|
| `payments` | "Users can view own payments" (direct JOIN) | Gunakan `user_owns_booking(booking_id, auth.uid())` via subquery pada booking_id |
| `booking_status_history` | "Users can view own booking history" (direct JOIN) | Gunakan `user_owns_booking(booking_id, auth.uid())` |
| `customer_documents` | "Users can view own documents" (query customers) | Gunakan `get_customer_user_id(customer_id) = auth.uid()` |
| `customer_documents` | "Agents can view/update documents" (chain JOIN) | Gunakan `agent_can_access_customer(customer_id, auth.uid())` yang sudah SECURITY DEFINER |

### Langkah 2: Fix AdminAnalytics null safety (Frontend)

Tambahkan null check pada `parseISO`:
```typescript
const date = b.created_at ? parseISO(b.created_at) : new Date();
```

### Langkah 3: Optimasi Dashboard Query (Frontend)

Tidak dilakukan sekarang - data masih sedikit dan ini bukan bug fungsional. Bisa dioptimasi nanti.

---

## Detail Teknis

### Database Migration (1 file SQL)

1. Drop 4 policy lama yang menyebabkan recursion
2. Buat 4 policy baru menggunakan SECURITY DEFINER functions yang sudah ada (`user_owns_booking`, `get_customer_user_id`, `agent_can_access_customer`)
3. Tidak perlu buat function baru - function yang sudah ada sudah cukup

### File Frontend yang Diubah

| File | Perubahan |
|------|-----------|
| `src/pages/admin/AdminAnalytics.tsx` | Tambah null check pada `parseISO(b.created_at)` |

Total: **1 migrasi database** + **1 file frontend**
