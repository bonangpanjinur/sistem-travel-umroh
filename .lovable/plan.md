
Saya sudah telusuri kode frontend, migration, dan backend aktif. Do I know what the issue is? Ya.

Masalah utama yang saya temukan

1. Arsitektur izin akses bentrok.
- Frontend terbaru memakai `get_user_all_effective_permissions` + `user_permissions_overrides`.
- Backend aktif justru memakai `user_permissions`, `permissions_list`, `menu_items`, `check_user_permission`, `bulk_sync_menu_items(text)`.
- Di backend aktif, `user_permissions_overrides`, `role_permissions`, dan RPC `get_user_all_effective_permissions` tidak ada.
- Ini menjelaskan sekaligus:
  - modal “Kelola Izin” tidak bekerja benar,
  - build error TypeScript,
  - sidebar/layout tidak benar-benar mengikuti izin user.

2. Sinkronisasi menu saat login salah arah.
- `useAuth` dan hook sync mengirim array ke `bulk_sync_menu_items`, padahal backend aktif masih mengharapkan `text`.
- Selain itu `RECOMMENDED_MENUS` di kode sudah tertinggal dari data/rute aktif:
  - kode masih memakai permission generik seperti `operational`, `reports`, `settings`
  - data aktif di backend sudah granular seperti `document-verification`, `finance-ar`, `branches`, dll
- Kalau dibiarkan, sinkronisasi menu justru berisiko merusak menu/permission yang sudah benar.

3. Dashboard sebenarnya ada di backend.
- Menu `/admin` ada di `menu_items` aktif.
- Jadi “dashboard hilang” kemungkinan besar bukan data hilang, tetapi masalah render/sidebar:
  - sidebar terlalu bergantung ke query DB tanpa fallback kuat,
  - state buka/tutup mobile/desktop tidak tegas,
  - filter izin belum benar-benar dipakai.

4. Sidebar dan guard akses belum sinkron.
- `useDynamicMenus` membaca revocation, tetapi saat ini tetap `return menus` dan `isPathAllowed()` selalu `true`.
- `ProtectedRoute` juga sedang dibypass.
- Akibatnya, pengaturan izin tidak konsisten antara tampilan menu dan akses URL langsung.

5. Loading lambat dan console berisik.
- Auth masih fetch data secara serial lalu auto-sync menu setiap login.
- Layout memasang notification hook, tetapi `NotificationBell` malah dikasih data kosong.
- Ada fetch/realtime yang tidak membantu render awal, tapi tetap membebani.

6. Error `validate_employee_user_sync` 400 memang nyata.
- `AdminHR.tsx` memanggil RPC itu.
- Di backend aktif, function tersebut tidak ada.
- Ini menunjukkan migration drift dari riwayat perubahan sebelumnya.

7. Ada bug rute/kompilasi lain yang ikut mengganggu stabilitas.
- `AdminDashboard` masih punya link typo `/admin/documents-verification`, padahal rute aktif `/admin/document-verification`.
- Ada blocker build lain di `AdminDepartures.tsx`.
- Selama blocker ini belum dibereskan, validasi akses end-to-end akan selalu tidak stabil.

Rencana perbaikan

1. Satukan kontrak backend untuk akses per user
- Jadikan `user_permissions` + `permissions_list` + `menu_items` sebagai sumber kebenaran tunggal.
- Super admin tetap bypass penuh.
- Customer tetap default dan tidak ikut skema izin rinci.
- User non-customer bisa diatur per user dari tombol “Izin”.
- Saya akan menyesuaikan frontend agar berhenti memakai tabel/RPC yang sudah tidak ada.
- Saya juga akan memulihkan `validate_employee_user_sync` atau membuat query HR fail-safe supaya error 400 hilang.

2. Buat satu logika izin yang dipakai bersama sidebar dan route
- `useDynamicMenus` akan benar-benar memfilter menu berdasarkan `user_permissions` aktif:
  - `super_admin` → semua menu tampil
  - user lain → menu disembunyikan jika ada override `is_enabled = false`
  - jika belum ada override → default tampil untuk staff
- Guard URL akan memakai mapping yang sama, jadi user yang dicabut izinnya tidak bisa masuk lewat URL manual.
- Halaman terblokir akan tampil sebagai “Akses Ditolak”, bukan kosong/404 yang membingungkan.

3. Bangun satu registry menu admin yang konsisten
- Satu definisi menu dipakai bersama untuk:
  - seed/update `menu_items`
  - label di modal izin
  - sidebar
  - command palette
  - mapping route-to-permission
  - fallback saat query menu gagal
- Saya akan cocokkan seluruh entry dengan `AdminRoutes.tsx` supaya Dashboard, Users, Master Data, HR, Dokumen, dst lengkap dan tidak drift lagi.

4. Rapikan modal “Izin” di Manajemen User
- Tetap fokus di `Manajemen User > Izin`.
- UI akan dibuat lebih jelas:
  - header ringkas user + role
  - statistik aktif/nonaktif/manual
  - search
  - grouping mengikuti sidebar
  - bulk action per grup
  - indikator “default” vs “manual override”
- Untuk super admin, modal akan dibuat read-only/full access indicator karena super admin harus selalu bisa akses semua fitur.
- Halaman `AdminUserPermissions` yang terpisah akan disederhanakan: redirect ke manajemen user atau dibiarkan hidden agar flow tidak duplikat.

5. Rapikan UX sidebar
- Pisahkan state:
  - `mobileOpen` untuk drawer mobile
  - `desktopCollapsed` untuk desktop
- Simpan preferensi collapse desktop.
- Tutup drawer otomatis setelah klik menu di mobile.
- Pastikan grup Overview terbuka jelas dan Dashboard selalu terlihat pertama.
- Tambahkan fallback loading/skeleton yang stabil supaya sidebar tidak tampak kosong saat data belum datang.

6. Kurangi loading awal
- Paralelkan fetch profile + roles di auth.
- Hentikan auto-sync menu saat login; sinkronisasi menu dipindah ke data seed/backend, bukan proses auth.
- Kurangi subscription/query yang tidak dipakai saat render awal.
- Pass data notifikasi yang benar ke `NotificationBell`, atau matikan hook yang tidak dipakai.

7. Bereskan blocker build dan bug turunan
- Samakan pemanggilan `bulk_sync_menu_items` dengan signature backend aktif, atau hilangkan kebutuhan sync saat login sama sekali.
- Perbaiki typo route di dashboard.
- Perbaiki compile blockers di `AdminDepartures.tsx`.
- Re-check file function yang ikut ditandai build agar aplikasi kembali build bersih sebelum QA fitur akses.

Keamanan yang akan dijaga
- Hide/show di UI hanya untuk UX; pembatasan data tetap mengandalkan backend/RLS.
- Izin tidak akan disimpan di localStorage/sessionStorage.
- Perubahan izin per user tetap dicatat ke audit log.
- Hak edit izin akan disamakan antara UI dan backend agar tidak ada tombol yang terlihat bisa dipakai tapi sebenarnya ditolak.

Hasil yang ditargetkan
- Dashboard muncul konsisten.
- Tombol “Izin” benar-benar bekerja.
- Perubahan izin super admin pada user langsung tercermin di sidebar dan akses halaman user tersebut.
- Super admin selalu bisa membuka semua fitur.
- Sidebar mobile/desktop jelas dan enak dipakai.
- Loading awal lebih cepat.
- Error console `validate_employee_user_sync 400` hilang.
- Error `core.js ... payload` akan saya validasi ulang setelah arsitektur izin dan subscription dirapikan; kemungkinan besar itu gejala sekunder dari alur async yang sekarang rusak.

Urutan implementasi yang saya sarankan
1. Sinkronkan backend contract dan hapus referensi frontend ke tabel/RPC yang sudah tidak ada.
2. Rapikan registry menu dan seed data menu/permission.
3. Hubungkan modal izin ke arsitektur aktif.
4. Terapkan filtering sidebar + guard path.
5. Rapikan sidebar UX dan loading.
6. Selesaikan blocker build lain, lalu QA end-to-end seluruh alur user management dan akses halaman.
