
## Perbaikan Multi-Issue (7 Item)

Saat ini build aplikasi gagal karena 3 file rusak (ditulis dalam 1 baris dengan `\n` literal). Ini akan diperbaiki bersama 7 item permintaan Anda.

### 1. Build Errors (Wajib lebih dulu)
File berikut korup dan akan ditulis ulang dengan format multi-line yang benar:
- `src/hooks/dashboards/index.ts`
- `src/hooks/dashboards/useDashboardRouter.ts`
- `src/pages/admin/DashboardRedirect.tsx`

### 2. Kas & Bank — Export Excel + PDF
Pada `AdminFinanceCash.tsx`, tombol Export saat ini hanya Excel. Akan diubah menjadi dropdown dua pilihan: **Export Excel** dan **Export PDF** (memakai `exportToExcel` & `exportToPDF` yang sudah ada di `src/lib/export-utils.ts`). Header laporan akan mencakup periode bulan, total pemasukan, pengeluaran, dan saldo.

### 3. Hirarki Pusat → Cabang → Agen → Sub-Agen
Struktur backend sudah mendukung (kolom `parent_agent_id`, `branch_id`, RLS branch-scoping). Yang akan ditingkatkan:
- Halaman **Agent** (`AdminAgents.tsx`): tampilan tree hirarki yang lebih jelas (Pusat sebagai akar → Cabang → Agen → Sub-Agen) dengan indentasi visual & badge level.
- Form tambah agen sudah punya field `parent_agent_id`; akan diberi label "Induk Agen (kosongkan jika agen langsung)" dan dropdown sub-agen otomatis muncul saat memilih induk.
- Konfirmasi: tidak perlu mengubah skema database.

### 4. Error Menu HR — `validate_employee_user_sync`
Function ada di DB tapi gagal dengan 400 (kemungkinan masalah parameter `Args: never` vs cara dipanggil). Perbaikan:
- Ubah panggilan jadi `supabase.rpc('validate_employee_user_sync')` tanpa cast `as any` & menelan error dengan graceful fallback (sudah parsial). Akan ditambahkan migration untuk **memastikan function ada dengan signature yang benar dan grant execute ke `authenticated`** (kemungkinan permission grant yang hilang).

### 5. Menu Laporan Redundan
Saat ini ada 3 menu di grup Laporan: Laporan, Laporan Lanjutan, Laporan Terjadwal. Akan digabung menjadi **1 menu "Laporan"** dengan tab di dalam halaman:
- Tab 1: Ringkasan (dari `AdminReports`)
- Tab 2: Lanjutan (dari `AdminAdvancedReports`)
- Tab 3: Terjadwal (dari `AdminScheduledReports`)

Migration akan menghapus 2 entry menu redundan dari tabel `menu_items` dan registry `admin-menu-registry.ts` diperbarui. Route lama tetap ada agar tidak memutus link.

### 6. Manajemen User & Hak Akses — Penyempurnaan
- Tambah filter cepat: filter per role, filter per cabang.
- Pada `UserPermissionsManager`: tambah aksi **"Pilih Semua Grup"** dan **"Cabut Semua Grup"** per kategori (lebih efisien untuk admin), badge yang jelas membedakan default vs override, dan tombol **"Salin dari User Lain"** (template).
- Tampilkan ringkasan jumlah permission aktif/dicabut di header dialog.
- Audit log otomatis (sudah ada via `logUserPermissionChange`) tetap dipertahankan.

### 7. Penyempurnaan Sidebar
- Group baru terurut konsisten (Overview → Sales → Produk → Keuangan → Jamaah → SDM → Dokumen → Laporan → Master Data → Support → Pengaturan).
- Auto-expand grup yang berisi route aktif saat reload.
- State expand/collapse grup disimpan ke `localStorage` agar persistent antar sesi.
- Tooltip pada mode collapsed menampilkan label menu.
- Search box sidebar memfilter menu real-time.

### 8. Optimasi Kecepatan
- **Lazy-load dialog berat**: `UserPermissionsManager` dan `DashboardAccessManagerPanel` dipindah ke `React.lazy` (saat ini eager).
- **Tambah index DB** untuk query yang sering dipakai: `user_permissions(user_id)`, `menu_items(group_name, sort_order)` (cek dulu, jika belum ada).
- **React Query staleTime** dinaikkan untuk data master (branches, permissions_list, menu_items) dari default ke 30 menit.
- **Prefetch route** pada hover link sidebar (memakai dynamic import warm-up).
- **Hapus realtime subscription** yang tidak terpakai (sudah dilakukan di `useDynamicMenus`, audit ulang hook lain).
- Kompresi bundle: pastikan `vite.config.ts` mengaktifkan `splitVendorChunkPlugin` (cek & tambah jika perlu).

---

### Detail Teknis

**Files yang akan diubah:**
- `src/hooks/dashboards/index.ts` — perbaiki format
- `src/hooks/dashboards/useDashboardRouter.ts` — perbaiki format
- `src/pages/admin/DashboardRedirect.tsx` — perbaiki format
- `src/pages/admin/AdminFinanceCash.tsx` — tambah export PDF
- `src/pages/admin/AdminAgents.tsx` — tampilan hirarki tree
- `src/pages/admin/AdminHR.tsx` — perbaikan call RPC
- `src/pages/admin/AdminReports.tsx` — gabungkan jadi 3 tab (atau buat wrapper baru)
- `src/pages/admin/AdminUsers.tsx` — filter & lazy-load dialog
- `src/components/admin/UserPermissionsManager.tsx` — bulk actions
- `src/components/admin/AdminLayoutImproved.tsx` — sidebar persistence + search
- `src/lib/admin-menu-registry.ts` — sinkron dengan menu baru
- `src/routes/AdminRoutes.tsx` — redirect route lama ke tab baru
- `vite.config.ts` — chunk splitting

**Migration baru:**
1. `fix_validate_employee_user_sync_grants.sql` — pastikan function ada & grant execute
2. `cleanup_reports_menu_redundancy.sql` — hapus `advanced-reports` & `scheduled-reports` dari `menu_items`, tambah index `idx_user_permissions_user_id` jika belum ada

**Tidak diubah:** struktur tabel agen/cabang, RLS policies, auth flow, API endpoint.

### Catatan
- Route `/admin/advanced-reports` & `/admin/scheduled-reports` tetap valid (redirect ke `/admin/reports?tab=...`) agar bookmark lama tidak putus.
- Akses kontrol hirarki Pusat-Cabang-Agen-SubAgen sudah didukung RLS; perubahan hanya di UI.
