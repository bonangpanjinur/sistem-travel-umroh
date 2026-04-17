

## Akar masalah loading lambat (data konkret)

Dari network logs + DB inspection saya temukan **3 penyebab utama** yang masih membandel:

**1. `profiles` table = 0 rows + trigger `handle_new_user` TIDAK terpasang**
- Network log: `GET /profiles?...user_id=eq.560... → 406 (PGRST116, 0 rows)` berulang ≥6 kali per page load
- DB: `SELECT FROM pg_trigger WHERE tgname ILIKE '%new_user%'` → kosong
- Akibat: `useAuth.fetchUserData()` pakai `.single()` → throw error → catch block → tapi `Promise.all` short-circuit, jadi `setIsLoading(false)` tetap jalan TAPI `setProfile` tidak pernah ter-set, dan setiap re-render via `onAuthStateChange` (TOKEN_REFRESHED, dll) memicu fetch ulang yang gagal lagi.

**2. `useAuth` re-fetch setiap auth event**
- `onAuthStateChange` dipicu oleh: SIGNED_IN, TOKEN_REFRESHED, USER_UPDATED, INITIAL_SESSION → setiap event memanggil `fetchUserData()` ulang.
- Network log menunjukkan request `user_roles` & `profiles` 3-5× dalam 2 menit untuk user yang sama.
- Tidak ada caching di level React Query, semua state lokal.

**3. `useAdminNotifications` hook = realtime channel berat tapi datanya tidak dipakai**
- File `AdminLayoutDynamicImproved.tsx` kirim `notifications={[]}` hardcoded ke `<NotificationBell>` → hook tidak dipanggil di sini (✓ sudah benar).
- TAPI `AdminLayout.tsx` & `AdminLayoutDynamic.tsx` (file lama yang masih ada) MASIH memanggil `useAdminNotifications`. Bila ada route lain yang masih ref ke layout lama → channel realtime ke 4 tabel (bookings/payments/payments-update/employee_devices) ikut subscribe.

**4. Bug minor tapi mengganggu**
- `AdminDashboard` punya 4× realtime subscription (`useMultipleRealtimeSubscriptions` ke 6 tabel) → setiap UPDATE di tabel-tabel ini me-refetch 5 query.
- `AdminCustomers` query: `bookingQuery.eq('departure.package_id', ...)` — sintaks ini invalid di PostgREST (tidak bisa filter via dot di nested), kemungkinan mengembalikan error 400 saat filter aktif.
- Vite production: `process.env.NODE_ENV` di `useAdminNotifications.ts` bukan `import.meta.env.DEV` → log debug bisa nyala salah konteks.

---

## Rencana perbaikan (fokus, tidak menambah file baru)

### A. Perbaiki root cause profiles 406 (paling penting)
1. **Migration**: pasang ulang trigger `handle_new_user` ke `auth.users` (saat ini hilang setelah remix). Trigger akan auto-create row di `profiles` + `user_roles` saat signup.
2. **Backfill**: `INSERT INTO profiles (user_id, full_name) SELECT id, raw_user_meta_data->>'full_name' FROM auth.users WHERE id NOT IN (SELECT user_id FROM profiles);` — supaya user existing (anjaypai) dapat profile.
3. **`useAuth.fetchUserData`**: ganti `.single()` → `.maybeSingle()` agar 0 row tidak jadi 406 + error.

### B. Stop re-fetch berulang di useAuth
- Tambahkan guard: simpan `userId` terakhir yang sudah di-fetch di ref. Bila `onAuthStateChange` dipicu ulang dengan user yang sama (TOKEN_REFRESHED), skip fetchUserData.
- Pada `INITIAL_SESSION` event, setIsLoading(false) langsung tanpa fetch ulang bila data sudah ada.

### C. Bersihkan layout lama yang masih load notifications hook
- Pastikan tidak ada route yang masih pakai `AdminLayout.tsx` atau `AdminLayoutDynamic.tsx` (yang lama). Bila ada, redirect ke `AdminLayoutDynamicImproved`.
- Bila kedua file lama tidak dipakai sama sekali, hapus untuk eliminasi kebingungan.

### D. Optimasi AdminDashboard realtime
- Realtime ke 6 tabel berlebihan untuk dashboard. Kurangi ke `bookings` + `payments` saja (2 tabel paling sering update). Sisanya pakai `staleTime: 5min` saja → cukup refresh manual.

### E. Bug fix kecil
- `AdminCustomers`: hapus filter `bookingQuery.eq('departure.package_id', ...)` (invalid syntax) atau ganti ke RPC.
- `useAdminNotifications`: ganti `process.env.NODE_ENV` → `import.meta.env.DEV`.

### F. Tambah index yang masih kurang
- `CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);` — query `profiles?user_id=eq.X` tanpa index = full table scan.
- `CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);` — sama.

---

## File yang akan diubah

**Migration baru:**
- `supabase/migrations/<ts>_fix_profile_trigger_and_indexes.sql` — pasang trigger handle_new_user, backfill profiles, tambah 2 index.

**Diedit:**
- `src/hooks/useAuth.tsx` — `.maybeSingle()`, dedupe fetch via ref `lastFetchedUserId`.
- `src/hooks/useAdminNotifications.ts` — `import.meta.env.DEV`.
- `src/pages/admin/AdminDashboard.tsx` — kurangi realtime tabel.
- `src/pages/admin/AdminCustomers.tsx` — perbaiki filter package/departure (drop atau pakai RPC).
- `src/components/admin/AdminLayout.tsx` & `AdminLayoutDynamic.tsx` — bila tidak dipakai → hapus; bila masih dipakai → hapus pemanggilan `useAdminNotifications`.

---

## Hasil yang ditargetkan
- **0 error 406 berulang** di console.
- **Auth fetch hanya sekali** per session (bukan 3-5×).
- **Realtime channel turun** dari 6 tabel → 2 tabel di dashboard.
- **Loading dashboard** turun signifikan (perkiraan 2-3 detik → < 1 detik untuk super admin).
- **Trigger profile aktif** lagi → user baru otomatis punya profile + role.
- **Index baru** mempercepat lookup user_id berkali lipat.

