# Rencana Perbaikan Sistem Hak Akses (RBAC) yang Rinci

Dokumen ini menyajikan strategi komprehensif untuk meningkatkan sistem **Role-Based Access Control (RBAC)** pada aplikasi Umroh & Haji Magic. Tujuannya adalah untuk beralih dari izin tingkat modul yang luas ke izin tingkat tindakan yang granular (**Granular Permissions**).

---

## 1. Struktur Izin Granular (Granular Permissions)

Setiap modul akan dipecah menjadi tindakan spesifik menggunakan format `modul.tindakan`.

### A. Modul Booking & Jamaah
| Izin | Deskripsi | Target Pengguna |
| :--- | :--- | :--- |
| `bookings.view_all` | Melihat **semua** booking dari semua cabang/agen. | Owner, Super Admin |
| `bookings.view_branch` | Melihat booking yang terkait dengan **cabang** pengguna. | Branch Manager |
| `bookings.view_own` | Melihat booking yang terkait dengan **diri sendiri** (sebagai agen). | Agent |
| `bookings.create` | Membuat reservasi baru. | Sales, Admin |
| `bookings.edit` | Mengubah data booking (pax, paket). | Admin, Manager |
| `bookings.approve` | Menyetujui atau mengonfirmasi booking. | Manager, Owner |
| `bookings.delete` | Menghapus data booking. | Owner, Super Admin |
| `customers.view` | Melihat profil jamaah. | Semua Staf |
| `customers.edit_sensitive` | Mengubah data paspor/NIK. | Admin Dokumen |

### B. Modul Keuangan (Finance)
| Izin | Deskripsi | Target Pengguna |
| :--- | :--- | :--- |
| `payments.view_all` | Melihat **semua** riwayat pembayaran. | Finance, Owner |
| `payments.view_branch` | Melihat pembayaran yang terkait dengan **cabang** pengguna. | Branch Manager |
| `payments.view_own` | Melihat pembayaran yang terkait dengan booking **milik agen**. | Agent |
| `payments.create` | Input bukti bayar baru. | Sales, Finance |
| `payments.verify` | **Validasi & konfirmasi pembayaran.** | **Finance Manager** |
| `payments.refund` | Melakukan proses pengembalian dana. | Finance Manager, Owner |
| `finance.reports` | Mengakses laporan laba rugi. | Owner, Finance |

### C. Modul Operasional & Perlengkapan
| Izin | Deskripsi | Target Pengguna |
| :--- | :--- | :--- |
| `operational.manifest` | Mengelola manifest keberangkatan | Operasional |
| `operational.visa` | Update status pengurusan visa | Admin Visa |
| `equipment.inventory` | Kelola stok perlengkapan (kain ihram, tas) | Bagian Gudang |
| `equipment.distribute` | Catat serah terima perlengkapan ke jamaah | Bagian Gudang |

---

## 2. Definisi Role & Matriks Akses

Berikut adalah usulan pembagian tanggung jawab yang lebih spesifik untuk setiap Role.

### Matriks Akses Staf Inti
| Modul | Super Admin | Owner | Branch Manager | Finance | Operational | Sales | Marketing | Equipment |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Dashboard** | Full | Full | View | View | View | View | View | View |
| **Analytics** | Full | Full | View | View | View | View | View | - |
| **Booking** | Full | Full | View Branch | View All | View All | Create/View | - | View All |
| **Payment** | Full | Full | View Branch | Verify/Full | - | Create/View | - | - |
| **Customer** | Full | Full | View | View | View | View | - | View |
| **Leads** | Full | Full | View | - | - | Create/Edit/View | Create/Edit/View | - |
| **Package** | Full | Full | Edit/View | - | Edit/View | View | View | - |
| **Departure** | Full | Full | Edit/View | - | Edit/View | View | View | View |
| **Users** | Full | Full | - | - | - | - | - | - |
| **Agents** | Full | Full | Edit/View | - | - | - | - | - |
| **Master Data** | Full | Full | Manage | - | Manage | - | - | - |
| **Settings** | Full | Full | Manage | - | - | - | - | - |
| **Reports** | Full | Full | View | View | View | View | View | - |
| **Operational** | Full | Full | Manage | - | Manage | - | - | Manage |
| **Marketing** | Full | Full | Manage | - | - | Manage | Manage | - |

### Pembatasan Khusus untuk Agen & Manajer Cabang
Sesuai permintaan, peran **Agent** dan **Branch Manager** memiliki hak akses yang sangat terbatas dan bersifat **read-only** pada data yang relevan, kecuali untuk beberapa tindakan spesifik yang diperlukan untuk operasional mereka.

| Peran | Izin yang Diberikan (Contoh) | Izin yang **DITOLAK** (Contoh) |
| :--- | :--- | :--- |
| **Branch Manager** | `bookings.view_branch`<br>`payments.view_branch`<br>`customers.view`<br>`packages.edit` (hanya paket cabang)<br>`departures.edit` (hanya keberangkatan cabang)<br>`agents.edit` (hanya agen di bawah cabang)<br>`master_data.manage` (terbatas pada data relevan cabang)<br>`settings.manage` (terbatas pada pengaturan cabang) | `bookings.approve`<br>`bookings.delete`<br>`payments.verify`<br>`payments.refund`<br>`users.create/edit/delete` (kecuali user di bawah cabang) |
| **Agent** | `bookings.view_own`<br>`payments.view_own`<br>`customers.view` (pelanggan yang terkait)<br>`leads.create/edit/view` (leads yang dibuat/ditugaskan) | `bookings.approve`<br>`bookings.edit`<br>`bookings.delete`<br>`payments.verify`<br>`payments.refund`<br>`packages.create/edit/delete` |

---

## 3. Rekomendasi Implementasi Teknis

### A. Database (Supabase)
Gunakan tabel `permissions_list` untuk mendefinisikan semua kunci izin yang tersedia. Pastikan fungsi `check_permission` di database mendukung pengecekan ini untuk keamanan tingkat baris (RLS).

```sql
-- Contoh RLS untuk Finance
CREATE POLICY "Finance can verify payments"
ON public.payments
FOR UPDATE
USING (public.check_permission(auth.uid(), 'payments.verify'));
```

### Implementasi Read-Only untuk Agen & Cabang
Untuk menerapkan akses `view_own` dan `view_branch`, RLS pada tabel `bookings` harus diperketat.

```sql
-- Contoh RLS untuk Agent (Read-Only)
CREATE POLICY "Agents can view their own bookings"
ON public.bookings
FOR SELECT
USING (
  public.check_permission(auth.uid(), 'bookings.view_own') AND
  agent_id = (SELECT id FROM public.agents WHERE user_id = auth.uid())
);

-- Contoh RLS untuk Branch Manager (Read-Only)
CREATE POLICY "Branch Managers can view bookings in their branch"
ON public.bookings
FOR SELECT
USING (
  public.check_permission(auth.uid(), 'bookings.view_branch') AND
  branch_id = (SELECT branch_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'branch_manager')
);

-- Pastikan tidak ada policy UPDATE/DELETE untuk role Agent & Branch Manager
-- di tabel bookings dan payments.
```

### Matriks Izin Edit & Delete

Berikut adalah rincian izin `edit` dan `delete` untuk setiap modul, yang melengkapi matriks akses di atas:

| Modul | Izin Edit | Peran yang Memiliki Izin Edit | Izin Delete | Peran yang Memiliki Izin Delete |
| :--- | :--- | :--- | :--- | :--- |
| **Booking** | `bookings.edit` | Super Admin, Owner, Admin, Branch Manager (terbatas cabang) | `bookings.delete` | Super Admin, Owner |
| **Customer** | `customers.edit` | Super Admin, Owner, Admin, Branch Manager (terbatas cabang), Sales (terbatas pelanggan sendiri) | `customers.delete` | Super Admin, Owner |
| **Payment** | `payments.edit` | Super Admin, Owner, Finance | `payments.delete` | Super Admin, Owner, Finance (dengan audit) |
| **Leads** | `leads.edit` | Super Admin, Owner, Admin, Sales, Marketing | `leads.delete` | Super Admin, Owner, Admin |
| **Package** | `packages.edit` | Super Admin, Owner, Admin, Operational, Branch Manager (terbatas cabang) | `packages.delete` | Super Admin, Owner |
| **Departure** | `departures.edit` | Super Admin, Owner, Admin, Operational, Branch Manager (terbatas cabang) | `departures.delete` | Super Admin, Owner |
| **Users** | `users.edit` | Super Admin | `users.delete` | Super Admin |
| **Agents** | `agents.edit` | Super Admin, Owner, Admin, Branch Manager (terbatas cabang) | `agents.delete` | Super Admin, Owner |
| **Master Data** | `master_data.manage` | Super Admin, Owner, Admin, Operational, Branch Manager | `master_data.manage` | Super Admin, Owner, Admin, Operational, Branch Manager |
| **Settings** | `settings.manage` | Super Admin, Owner, Admin, Branch Manager | `settings.manage` | Super Admin, Owner, Admin |
| **Operational** | `operational.manage` | Super Admin, Owner, Admin, Operational, Branch Manager | `operational.manage` | Super Admin, Owner, Admin, Operational |
| **Marketing** | `marketing.manage` | Super Admin, Owner, Admin, Marketing, Sales | `marketing.manage` | Super Admin, Owner, Admin |

### B. Frontend (React)
Gunakan `PermissionGuard` yang sudah ada, namun tingkatkan penggunaannya hingga ke level tombol atau aksi spesifik, bukan hanya level halaman.

```tsx
// Contoh penggunaan di UI untuk tombol Edit
<PermissionGuard permission="bookings.edit">
  <Button onClick={handleEditBooking}>Edit Booking</Button>
</PermissionGuard>

// Contoh penggunaan di UI untuk tombol Delete
<PermissionGuard permission="bookings.delete">
  <Button variant="destructive" onClick={handleDeleteBooking}>Hapus Booking</Button>
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


---

## 3. Rekomendasi Implementasi Teknis

### A. Database (Supabase)
Gunakan tabel `permissions_list` untuk mendefinisikan semua kunci izin yang tersedia. Pastikan fungsi `check_permission` di database mendukung pengecekan ini untuk keamanan tingkat baris (RLS).

```sql
-- Contoh RLS untuk Finance
CREATE POLICY "Finance can verify payments"
ON public.payments
FOR UPDATE
USING (public.check_permission(auth.uid(), 'payments.verify'));
```

### Implementasi Read-Only untuk Agen & Cabang
Untuk menerapkan akses `view_own` dan `view_branch`, RLS pada tabel `bookings` harus diperketat.

```sql
-- Contoh RLS untuk Agent (Read-Only)
CREATE POLICY "Agents can view their own bookings"
ON public.bookings
FOR SELECT
USING (
  public.check_permission(auth.uid(), 'bookings.view_own') AND
  agent_id = (SELECT id FROM public.agents WHERE user_id = auth.uid())
);

-- Contoh RLS untuk Branch Manager (Read-Only)
CREATE POLICY "Branch Managers can view bookings in their branch"
ON public.bookings
FOR SELECT
USING (
  public.check_permission(auth.uid(), 'bookings.view_branch') AND
  branch_id = (SELECT branch_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'branch_manager')
);

-- Pastikan tidak ada policy UPDATE/DELETE untuk role Agent & Branch Manager
-- di tabel bookings dan payments.
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
