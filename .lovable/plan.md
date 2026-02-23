
# Perbaikan Bug Kritis: Menu Admin Hilang (Race Condition)

## Akar Masalah

Masalah utama kenapa menu admin (Keuangan, Karyawan, dll) selalu hilang setelah ada perubahan kode terletak di **satu file**: `useAuth.tsx`.

### Kronologi Bug

Saat aplikasi di-refresh atau kode berubah (hot-reload), urutan yang terjadi:

1. `onAuthStateChange` dipanggil -- user terdeteksi sudah login
2. `fetchUserData()` dipanggil untuk mengambil profil dan roles dari database (butuh waktu ~200-500ms)
3. **TANPA menunggu** `fetchUserData` selesai, `setIsLoading(false)` langsung dijalankan
4. `ProtectedRoute` melihat: `isLoading = false`, `user = ada`, tapi `roles = []` (kosong!)
5. Karena roles kosong, cek `isAdmin()` gagal -- user dianggap **bukan admin**
6. User di-redirect ke halaman `/` (beranda)

Inilah kenapa menu admin hilang: bukan menu-nya yang hilang, tapi **seluruh halaman admin** tidak bisa diakses karena sistem mengira user tidak punya role apapun.

```text
Timeline:
  t=0ms   onAuthStateChange fires
  t=1ms   fetchUserData() called (async, NOT awaited)
  t=2ms   setIsLoading(false) -- TOO EARLY!
  t=3ms   ProtectedRoute renders: roles=[] --> REDIRECT to "/"
  t=300ms fetchUserData completes: roles=['super_admin'] --> TOO LATE
```

## Bug Lain yang Ditemukan

### BUG 2: Role `operational` dan `equipment` Tidak Bisa Akses Admin

`ADMIN_ROLES` di `AdminRoutes.tsx` hanya berisi: `super_admin, owner, branch_manager, finance, sales, marketing`. Padahal sidebar `AdminLayout.tsx` sudah punya menu "Produk & Operasional" untuk role `operational`. Staff operasional tidak bisa masuk admin panel sama sekali.

### BUG 3: Redirect Loop untuk Admin Saat Role Belum Termuat

Di `ProtectedRoute.tsx`, jika `isAdmin()` return `false` (karena race condition), user diarahkan ke `/`. Tapi saat roles akhirnya termuat, tidak ada mekanisme untuk kembali ke `/admin`.

## Rencana Perbaikan

### Fix 1: Hapus Race Condition di `useAuth.tsx` (CRITICAL)

Pindahkan `setIsLoading(false)` dari callback `onAuthStateChange` ke dalam `fetchUserData`. Ini memastikan `isLoading` tetap `true` sampai roles benar-benar termuat.

**Perubahan di `useAuth.tsx`:**
- Hapus `setIsLoading(false)` di baris 42 (di dalam `onAuthStateChange`)
- Tambahkan `setIsLoading(false)` di blok `else` (baris 38-41) untuk kasus user logout
- `fetchUserData` sudah punya `finally { setIsLoading(false) }` di baris 86-88, jadi untuk kasus user login, loading flag akan diset `false` setelah roles benar-benar selesai dimuat

```text
SEBELUM:
  onAuthStateChange -> fetchUserData() (no await) -> setIsLoading(false) // BUG

SESUDAH:
  onAuthStateChange -> fetchUserData() (no await)
  fetchUserData -> fetch profile -> fetch roles -> finally { setIsLoading(false) } // BENAR
```

### Fix 2: Tambah `operational` dan `equipment` ke ADMIN_ROLES di `AdminRoutes.tsx`

Tambahkan kedua role ini agar staff operasional dan equipment bisa masuk admin panel sesuai menu yang sudah disiapkan di sidebar.

### Fix 3: Tambah State `rolesLoaded` di `ProtectedRoute.tsx`

Sebagai pengaman tambahan, cek bahwa jika user ada tapi roles masih kosong DAN sedang loading, jangan redirect. Ini sudah otomatis teratasi oleh Fix 1, tapi sebagai safety net tambahan.

## Detail Teknis per File

| File | Perubahan |
|------|-----------|
| `src/hooks/useAuth.tsx` | Hapus `setIsLoading(false)` prematur di baris 42. Pindahkan ke `else` block saja. |
| `src/routes/AdminRoutes.tsx` | Tambah `'operational'` dan `'equipment'` ke array `ADMIN_ROLES` |

**Total: 2 file diubah, 0 file baru, 0 migrasi database**

Perbaikan ini minimal dan terfokus -- hanya mengubah 2 baris di 2 file -- sehingga sangat kecil kemungkinan merusak fitur lain.
