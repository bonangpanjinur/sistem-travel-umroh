# Fitur Hapus Data Jamaah dengan Hak Akses Manajemen

## Ringkasan
Fitur ini memungkinkan pengguna dengan izin `customers.delete` untuk menghapus data jamaah melalui halaman detail customer. Sistem hak akses dapat diatur secara granular baik per role maupun per user individual.

## Fitur yang Ditambahkan

### 1. Tombol Hapus Jamaah
- **Lokasi**: Halaman Detail Customer (`/admin/customers/{id}`)
- **Tampilan**: Tombol berwarna merah dengan ikon trash di header halaman
- **Kondisi Tampil**: Hanya muncul jika pengguna memiliki permission `customers.delete`
- **Aksi**: Membuka dialog konfirmasi sebelum menghapus

### 2. Dialog Konfirmasi Hapus
- **Judul**: "Hapus Data Jamaah"
- **Pesan Peringatan**: Menampilkan nama jamaah dan informasi bahwa tindakan tidak dapat dibatalkan
- **Alert Khusus**: Peringatan bahwa menghapus data jamaah akan menghapus semua informasi terkait (booking, dokumen, pembayaran)
- **Tombol Aksi**:
  - **Batal**: Menutup dialog tanpa melakukan aksi
  - **Hapus Selamanya**: Melakukan penghapusan data

### 3. Sistem Hak Akses Terintegrasi
- **Permission Key**: `customers.delete`
- **Sumber Data**: 
  - Role-based permissions dari tabel `role_permissions`
  - User-level override dari tabel `user_permissions`
- **Prioritas Cek**: Admin/Owner → User-level override → Role-based permissions

## Cara Mengatur Hak Akses

### Mengatur Izin Per Role
1. Buka halaman **Admin → Role Permissions** (`/admin/role-permissions-enhanced`)
2. Pilih role yang ingin diatur (misal: `branch_manager`, `operational`, `sales`)
3. Cari permission **"Hapus Jamaah"** di bagian **Data Jamaah**
4. Centang checkbox untuk mengaktifkan izin
5. Klik **Simpan** untuk menyimpan perubahan

### Mengatur Izin Per User Individual
1. Buka halaman **Admin → User Permissions** (`/admin/user-permissions`)
2. Pilih pengguna dari daftar di sebelah kiri
3. Cari permission **"Hapus Jamaah"** di bagian **Data Jamaah**
4. Centang checkbox untuk memberikan izin atau lepas centang untuk mencabut izin
5. Klik **Berikan** untuk menyimpan perubahan

## Implementasi Teknis

### File yang Dimodifikasi

#### 1. `src/pages/admin/AdminCustomerDetail.tsx`
**Perubahan:**
- Import `useNavigate` dari `react-router-dom`
- Import `Trash2` icon dari `lucide-react`
- Import `usePermissionsEnhanced` hook
- Tambah state `deleteDialogOpen` untuk kontrol dialog
- Tambah mutation `deleteCustomerMutation` untuk handle penghapusan
- Tambah tombol "Hapus Jamaah" di header dengan permission check
- Tambah dialog konfirmasi hapus dengan warning message

**Kode Utama:**
```typescript
// Permission check
const { canPerformAction } = usePermissionsEnhanced();

// Mutation untuk hapus
const deleteCustomerMutation = useMutation({
  mutationFn: async () => {
    if (!canPerformAction('customers', 'delete')) {
      throw new Error('Anda tidak memiliki izin untuk menghapus jamaah');
    }
    
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', customerId);
    
    if (error) throw error;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['admin-customers'] });
    toast.success('Data jamaah berhasil dihapus');
    navigate('/admin/customers');
  },
  onError: (error: any) => {
    toast.error(error.message || 'Gagal menghapus data jamaah');
  },
});
```

### Database & RLS Policy
- **Tabel**: `customers`
- **Policy DELETE**: Sudah ada di migrasi `20260410000000_phase_1_2_fixes.sql`
  ```sql
  CREATE POLICY "Admins and operational can delete customers"
  ON public.customers FOR DELETE TO authenticated
  USING (is_admin(auth.uid()) OR has_role(auth.uid(), 'operational'));
  ```
- **Permission**: `customers.delete` sudah terdaftar di `permissions_list`

### Alur Kerja
1. Pengguna klik tombol "Hapus Jamaah"
2. Dialog konfirmasi muncul dengan warning message
3. Jika klik "Hapus Selamanya":
   - Cek permission `customers.delete` via `canPerformAction()`
   - Jika tidak ada izin → tampilkan error toast
   - Jika ada izin → lakukan delete ke database
   - Invalidate query `admin-customers`
   - Redirect ke halaman `/admin/customers`
   - Tampilkan success toast

## Keamanan

### Permission Check
- ✅ Frontend: Permission check via `usePermissionsEnhanced` hook
- ✅ Database: RLS policy pada tabel `customers`
- ✅ Audit: Aksi delete dapat di-track melalui database logs

### Validasi
- ✅ Dialog konfirmasi untuk mencegah aksi tidak sengaja
- ✅ Warning message tentang data terkait yang akan dihapus
- ✅ Disabled state saat proses penghapusan berlangsung

## Testing

### Test Case 1: User Tanpa Izin
1. Login sebagai user tanpa permission `customers.delete`
2. Buka halaman detail customer
3. **Expected**: Tombol "Hapus Jamaah" tidak tampil

### Test Case 2: User Dengan Izin
1. Login sebagai user dengan permission `customers.delete`
2. Buka halaman detail customer
3. Klik tombol "Hapus Jamaah"
4. **Expected**: Dialog konfirmasi muncul

### Test Case 3: Hapus Data Jamaah
1. Klik tombol "Hapus Jamaah"
2. Klik "Hapus Selamanya" di dialog
3. **Expected**: 
   - Loading state muncul
   - Success toast ditampilkan
   - Redirect ke `/admin/customers`
   - Data jamaah tidak lagi ada di list

### Test Case 4: Batal Hapus
1. Klik tombol "Hapus Jamaah"
2. Klik "Batal" di dialog
3. **Expected**: Dialog tertutup, tidak ada aksi delete

## Catatan Penting

1. **Cascade Delete**: Menghapus customer akan menghapus semua data terkait (booking, dokumen, pembayaran) karena foreign key constraints di database.

2. **Audit Trail**: Untuk tracking lengkap, pertimbangkan menambahkan soft delete atau audit logging di masa depan.

3. **Permission Inheritance**: Jika user memiliki role dengan permission `customers.delete`, izin akan otomatis tersedia. User-level override dapat digunakan untuk memberikan/mencabut izin individual.

4. **Super Admin & Owner**: Selalu memiliki akses penuh termasuk delete, terlepas dari setting permission.

## Referensi
- Permission System: `/src/hooks/usePermissionsEnhanced.tsx`
- Role Permissions Management: `/src/pages/admin/AdminRolePermissionsEnhanced.tsx`
- User Permissions Management: `/src/app/admin/user-permissions/page.tsx`
- Database Migrations: `/supabase/migrations/20260410000000_phase_1_2_fixes.sql`
