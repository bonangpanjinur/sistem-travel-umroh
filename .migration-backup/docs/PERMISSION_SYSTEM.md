# Sistem Izin Akses (RBAC & Overrides)

Dokumen ini menjelaskan implementasi sistem izin akses yang baru di `vinstourtravel`, yang menggabungkan *Role-Based Access Control* (RBAC) dengan kemampuan penimpaan (*override*) per pengguna.

## Arsitektur Backend (Database)

Sistem ini dibangun di atas fungsi PostgreSQL dan tabel-tabel berikut:

1.  **`permissions_list`**: Daftar master semua kunci izin (misal: `bookings.view`, `payments.manage`).
2.  **`role_permissions`**: Definisi izin standar untuk setiap peran (`super_admin`, `finance`, dll).
3.  **`user_permissions_overrides`**: Menyimpan penimpaan manual untuk pengguna tertentu. Jika ada data di sini, ia akan mengabaikan pengaturan dari peran.
4.  **`menu_access_audit`**: Mencatat setiap upaya akses (berhasil/gagal) untuk keperluan audit keamanan.

### Fungsi Utama (RPC)

*   `get_user_effective_permission(p_user_id, p_permission_key)`: Mengecek apakah pengguna memiliki izin tertentu.
*   `get_user_all_effective_permissions(p_user_id)`: Mengambil semua izin aktif untuk pengguna tersebut (gabungan peran + override).

## Implementasi Frontend (React)

### 1. Hook `useHasPermission`
Gunakan hook ini untuk mengecek izin di dalam komponen:

```tsx
const { hasPermission, isLoading } = useHasPermission('bookings.view');
if (hasPermission) {
  return <BookingTable />;
}
```

### 2. `ProtectedRoute`
Gunakan di dalam routing untuk membatasi akses halaman:

```tsx
<Route 
  path="payments" 
  element={
    <ProtectedRoute permission="payments.view">
      <AdminPayments />
    </ProtectedRoute>
  } 
/>
```

## Manajemen Admin

Administrator dapat mengelola izin melalui halaman **Manajemen User**. 
*   **Role-based**: Izin standar yang didapat dari peran pengguna.
*   **Override**: Izin yang diubah secara manual (ditandai dengan badge "Override").
*   **Reset**: Tombol untuk menghapus semua penimpaan dan kembali ke standar peran.

## Audit Keamanan

Semua upaya akses dicatat secara otomatis dan dapat dipantau melalui menu **Security & Audit** pada tab **Menu Access Audit**.
