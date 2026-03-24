# Rencana Perbaikan Sistem Hak Akses (RBAC) yang Rinci

Dokumen ini menyajikan strategi komprehensif untuk meningkatkan sistem **Role-Based Access Control (RBAC)** pada aplikasi Umroh & Haji Magic. Tujuannya adalah untuk beralih dari izin tingkat modul yang luas ke izin tingkat tindakan yang granular (**Granular Permissions**).

---

## 1. Struktur Izin Granular (Granular Permissions)

Setiap modul akan dipecah menjadi tindakan spesifik menggunakan format `modul.tindakan`.

### A. Modul Booking & Jamaah
| Izin | Deskripsi | Target Pengguna |
| :--- | :--- | :--- |
| `bookings.view` | Melihat daftar dan detail booking | Semua Staf |
| `bookings.create` | Membuat reservasi baru | Sales, Admin |
| `bookings.edit` | Mengubah data booking (pax, paket) | Admin, Manager |
| `bookings.delete` | Menghapus data booking | Owner, Super Admin |
| `customers.view` | Melihat profil jamaah | Semua Staf |
| `customers.edit_sensitive` | Mengubah data paspor/NIK | Admin Dokumen |

### B. Modul Keuangan (Finance)
| Izin | Deskripsi | Target Pengguna |
| :--- | :--- | :--- |
| `payments.view` | Melihat riwayat pembayaran | Finance, Sales |
| `payments.create` | Input bukti bayar baru | Sales, Finance |
| `payments.verify` | Validasi & konfirmasi pembayaran | Finance Manager |
| `payments.refund` | Melakukan proses pengembalian dana | Finance Manager, Owner |
| `finance.reports` | Mengakses laporan laba rugi | Owner, Finance |

### C. Modul Operasional & Perlengkapan
| Izin | Deskripsi | Target Pengguna |
| :--- | :--- | :--- |
| `operational.manifest` | Mengelola manifest keberangkatan | Operasional |
| `operational.visa` | Update status pengurusan visa | Admin Visa |
| `equipment.inventory` | Kelola stok perlengkapan (kain ihram, tas) | Bagian Gudang |
| `equipment.distribute` | Catat serah terima perlengkapan ke jamaah | Bagian Gudang |

---

## 2. Definisi Role & Matriks Akses

Berikut adalah usulan pembagian tanggung jawab yang lebih spesifik untuk setiap Role:

| Modul | Super Admin | Finance | Sales | Operational | Agent |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Booking** | Full | View | Create/View | View | View Own |
| **Payment** | Full | Verify/Full | Create/View | - | - |
| **Inventory** | Full | View | - | Full | - |
| **Settings** | Full | - | - | - | - |
| **Reports** | Full | Finance Only | Sales Only | Ops Only | - |

---

## 3. Rekomendasi Implementasi Teknis

### A. Database (Supabase)
Gunakan tabel `permissions_list` untuk mendefinisikan semua kunci izin yang tersedia. Pastikan fungsi `check_permission` di database mendukung pengecekan ini untuk keamanan tingkat baris (RLS).

```sql
-- Contoh pengecekan di RLS
CREATE POLICY "Finance can verify payments"
ON public.payments
FOR UPDATE
USING (public.check_permission(auth.uid(), 'payments.verify'));
```

### B. Frontend (React)
Gunakan `PermissionGuard` yang sudah ada, namun tingkatkan penggunaannya hingga ke level tombol atau aksi spesifik, bukan hanya level halaman.

```tsx
// Contoh penggunaan di UI
<PermissionGuard permission="payments.verify">
  <Button onClick={handleVerify}>Verifikasi Pembayaran</Button>
</PermissionGuard>
```

### C. Audit Log
Setiap perubahan hak akses atau tindakan sensitif (seperti `payments.verify` atau `bookings.delete`) **WAJIB** dicatat dalam tabel `audit_logs` untuk keperluan pelacakan jika terjadi kesalahan.

---

## 4. Langkah Selanjutnya (Roadmap)

1.  **Migrasi Data**: Jalankan skrip migrasi untuk mengisi `permissions_list` dengan kunci granular.
2.  **Update UI**: Perbarui halaman `AdminRolePermissions.tsx` agar menampilkan tabel izin yang lebih detail (dikelompokkan per modul).
3.  **Refactor Hooks**: Pastikan `usePermissions` dapat menangani pengecekan array izin secara efisien.
4.  **Testing**: Lakukan uji coba dengan akun berbeda untuk memastikan tidak ada kebocoran akses.
