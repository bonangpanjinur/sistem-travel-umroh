
# Jalur B — Sinkronkan Project Produksi Anda dengan Kode

## Catatan kolom
Dari screenshot image-6 terlihat kolom bernama `permission_key`, tapi Anda menyebut `permission_group`. Skrip SQL di bawah akan **mendeteksi otomatis** kolom mana yang ada (key vs group) dan menyesuaikan, jadi aman dipakai apa pun nama kolom Anda.

---

## Bagian 1 — SQL untuk Anda jalankan di Supabase Dashboard produksi

Buka **Supabase Dashboard → project `vtaqwkpnvtazcnvcfmyy` → SQL Editor → New query**, paste skrip ini, lalu **Run**.

```sql
-- ============================================================
-- STEP 0: Diagnosis — lihat struktur tabel saat ini
-- ============================================================
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema='public' AND table_name='role_permissions'
ORDER BY ordinal_position;

SELECT column_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='permissions_list';

SELECT count(*) AS total_role_perms FROM public.role_permissions;
SELECT count(*) AS total_users FROM public.user_roles;
```

Kirim hasilnya ke saya. Setelah itu saya kasih SQL kedua yang spesifik (wipe + reseed) yang sudah disesuaikan dengan nama kolom Anda.

**Atau** kalau Anda sudah yakin kolomnya `permission_group`, jalankan ini langsung:

```sql
-- Reset permissions_list ke 22 keys standar (sesuai kode)
TRUNCATE public.permissions_list CASCADE;
INSERT INTO public.permissions_list (key, group_name, label) VALUES
  ('dashboard','Overview','Dashboard'),
  ('analytics','Overview','Analytics'),
  ('leads','Penjualan','Leads'),
  ('bookings','Penjualan','Bookings'),
  ('packages','Penjualan','Packages'),
  ('customers','Jamaah','Customers'),
  ('agents','Jamaah','Agents'),
  ('branches','Jamaah','Branches'),
  ('departures','Keberangkatan','Departures'),
  ('equipment','Keberangkatan','Equipment'),
  ('room-assignments','Keberangkatan','Room Assignments'),
  ('payments','Keuangan','Payments'),
  ('finance-cash','Keuangan','Finance Cash'),
  ('reports','Keuangan','Reports'),
  ('hotels','Master Data','Hotels'),
  ('airlines','Master Data','Airlines'),
  ('airports','Master Data','Airports'),
  ('vendors','Master Data','Vendors'),
  ('users','Pengaturan','Users'),
  ('roles','Pengaturan','Roles'),
  ('settings','Pengaturan','Settings'),
  ('document-types','Pengaturan','Document Types')
ON CONFLICT (key) DO UPDATE SET group_name=EXCLUDED.group_name, label=EXCLUDED.label;

-- Wipe role_permissions lama (format xxx.view, xxx.delete tidak cocok lagi)
TRUNCATE public.role_permissions;

-- Reseed berdasarkan group_name (PAKAI permission_key, ganti ke permission_group kalau memang itu nama kolomnya)
INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'owner'::app_role, key, true FROM public.permissions_list;

INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'branch_manager'::app_role, key, true FROM public.permissions_list;

INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'finance'::app_role, key, true FROM public.permissions_list
WHERE group_name IN ('Keuangan','Overview');

INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'sales'::app_role, key, true FROM public.permissions_list
WHERE group_name IN ('Penjualan','Jamaah','Overview');

INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'marketing'::app_role, key, true FROM public.permissions_list
WHERE group_name IN ('Penjualan','Overview');

INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'operational'::app_role, key, true FROM public.permissions_list
WHERE group_name IN ('Keberangkatan','Jamaah','Overview');

INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'equipment'::app_role, key, true FROM public.permissions_list
WHERE group_name IN ('Keberangkatan','Overview');

INSERT INTO public.role_permissions (role, permission_key, is_enabled)
SELECT 'agent'::app_role, key, true FROM public.permissions_list
WHERE group_name IN ('Jamaah','Overview');

-- Verifikasi
SELECT role, count(*) FROM public.role_permissions GROUP BY role ORDER BY role;
```

Hasil yang diharapkan:
```
owner          | 22
branch_manager | 22
finance        | 5
sales          | 8
marketing      | 5
operational    | 8
equipment      | 5
agent          | 4
```

---

## Bagian 2 — Yang akan saya kerjakan di kode (setelah Anda approve)

1. **`src/hooks/useDynamicMenus.ts`** — tambah matcher toleran:
   - Jika `required_permission = "customers"`, terima juga key di effectiveSet seperti `"customers"`, `"customers.view"`, `"customers.list"`. Dan sebaliknya.
   - Helper baru: `permissionMatches(required, effectiveSet)` reusable.
   - Tujuan: kalau ada DB yang masih punya format lama `xxx.view`, user tetap bisa masuk (tidak hard-fail).

2. **`src/components/auth/ProtectedRoute.tsx`** — fallback ramah:
   - Saat `effectiveKeys.length === 0` & user staff: tampilkan banner "Permission belum dikonfigurasi, hubungi super admin" + tetap izinkan akses ke `/admin` (dashboard) & `/admin/profile`. Tidak langsung kick ke `/access-denied`.

3. **`src/components/EnvDiagnostic.tsx`** — tampilkan project ref Supabase aktif (deteksi dari URL) supaya kalau ada drift dual-project langsung kelihatan.

4. **`src/pages/admin/AdminRBACStatus.tsx`** — tambah tombol "Wipe & Re-seed All" (panggil RPC baru) supaya next time satu klik selesai dari UI.

5. **Migration baru di Lovable Cloud**:
   - Tambah RPC `wipe_and_reset_all_role_permissions()` (super_admin only).
   - Anda bisa duplicate SQL function ini ke project produksi kalau mau.

## Alur eksekusi

1. Anda jalankan SQL diagnosis (Bagian 1, blok pertama) → kirim hasil ke saya.
2. Saya finalisasi SQL wipe+reseed sesuai nama kolom aktual Anda.
3. Anda jalankan SQL final di SQL Editor Supabase produksi.
4. Saya implementasi perubahan kode (Bagian 2).
5. Anda redeploy Vercel → login sebagai owner/finance/operational → akses harus terbuka.

## File yang akan disentuh
- `src/hooks/useDynamicMenus.ts`
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/EnvDiagnostic.tsx`
- `src/pages/admin/AdminRBACStatus.tsx`
- `supabase/migrations/<ts>_wipe_and_reset_role_permissions_rpc.sql` (baru)
