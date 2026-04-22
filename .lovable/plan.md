

## Fix Build Errors + Loading Speed Optimization

### Status Plan Sebelumnya
✅ Selesai: #1 Build errors awal, #2 Export Excel+PDF, #3 Hirarki agen (sebagian), #4 HR error 400, #5 Reports tabs (sebagian), #6 User filter (sebagian), proper TS types untuk dashboard tables
⚠️ Belum tuntas: 5 build error baru dari `fromExtra`, optimasi loading, sidebar polish, lazy-load dialog berat

---

### Bagian A — Fix 5 Build Errors (Wajib)

**Akar masalah:** Helper `fromExtra()` di `src/integrations/supabase/extra-tables.ts` memakai trik `makeTypedFrom` thunk yang gagal meng-extract tipe `Insert`/`Update`/`Row` — TypeScript meresolve jadi `never` & `never[]`, sehingga:
- `.insert({ role: ... })` → "role does not exist in type never[]"
- `.update({ enabled_modules: ... })` → "not assignable to never"
- `.select() data` → `enabled_modules` tidak ada (jadi `null` saja)

**Fix:** Tulis ulang `extra-tables.ts` dengan pendekatan langsung — pakai tipe `PostgrestQueryBuilder` dari `@supabase/postgrest-js` dan inject Row/Insert/Update kita secara eksplisit, tanpa membangun objek Database sintetis.

```ts
// Pseudocode struktur baru
import type { PostgrestQueryBuilder } from '@supabase/postgrest-js';

type ExtraSchema<T extends ExtraTableName> = {
  Row: ExtraTables[T]['Row'];
  Insert: ExtraTables[T]['Insert'];
  Update: ExtraTables[T]['Update'];
  Relationships: [];
};

export function fromExtra<T extends ExtraTableName>(table: T):
  PostgrestQueryBuilder<any, ExtraSchema<T>, T> {
  return (supabase as any).from(table);
}
```

Ini menjaga type-safety untuk `.insert()`, `.update()`, dan `.select()` tanpa kehilangan parameter.

**Tambahan kecil:**
- `useDashboardAccess.ts` baris 82-89: `dynamicConfig` diketik `null`, bukan `null | Row`. Akan ditambahkan generic eksplisit ke `useQuery<DashboardAccessConfigRow | null>` agar narrowing benar.

---

### Bagian B — Optimasi Loading (Penyebab Lambat)

Setelah membaca arsitektur, ini penyebab loading lama yang nyata:

1. **`useDashboardAccess` query jalan di setiap halaman admin** walau user bukan super_admin yang butuh konfigurasi → 1 request blocking ke `dashboard_access_config` per role saat initial.
   - Fix: Pindahkan query hanya saat dialog DashboardAccessManager dibuka, bukan global.

2. **`AdminLayoutImproved` & route admin masih eager-import banyak halaman.**
   - Fix: Konversi `UserPermissionsManager` dan `DashboardAccessManagerPanel` ke `React.lazy` (sesuai rencana #8 yg belum tuntas) — keduanya bundle besar tapi jarang dipakai.

3. **`useWebsiteSettings` masih dipakai di beberapa komponen** padahal sudah ada versi `useWebsiteSettingsOptimized` dengan default + cache.
   - Fix: Audit & migrate ke versi optimized di `DynamicNavbar`, `DynamicFooter`, `BranchWebsite`, `AgentWebsite`, `LandingPage`.

4. **React Query default staleTime 0** → setiap mount halaman, semua query dianggap stale & refetch.
   - Fix: Set default global `staleTime: 5 * 60 * 1000` di `QueryClient` di `src/App.tsx`, override per-query yang butuh fresh.

5. **Vite belum split vendor chunk dengan benar** untuk Recharts/Radix yang besar.
   - Fix: Verifikasi `manualChunks` di `vite.config.ts` (vendor-react, vendor-ui, vendor-supabase, vendor-charts).

6. **Realtime subscription di hook auth** menyebabkan re-render saat session refresh.
   - Audit `useAuth.tsx` apakah ada `onAuthStateChange` yang trigger refetch tidak perlu.

---

### File yang Diubah

**Build fix:**
- `src/integrations/supabase/extra-tables.ts` — rewrite `fromExtra` dengan PostgrestQueryBuilder
- `src/hooks/dashboards/useDashboardAccess.ts` — generic eksplisit untuk useQuery

**Optimasi loading:**
- `src/App.tsx` — set default `staleTime` di QueryClient
- `src/hooks/dashboards/useDashboardAccess.ts` — `enabled: false` di luar konteks dashboard manager
- `src/pages/admin/AdminUsers.tsx` — lazy-load `UserPermissionsManager`
- `src/pages/admin/DashboardAccessManager.tsx` — lazy-load `DashboardAccessManagerPanel`
- `src/components/layout/DynamicNavbar.tsx` — pakai `useWebsiteSettingsOptimized`
- `src/components/layout/DynamicFooter.tsx` — sama
- `src/pages/public/BranchWebsite.tsx`, `AgentWebsite.tsx`, `LandingPage.tsx` — sama
- `vite.config.ts` — verifikasi manualChunks untuk vendor splitting

**Tidak diubah:** struktur DB, RLS, auth flow, komponen UI primitives.

### Yang Belum Akan Ditangani (Saran Sesudah Ini)
- Polish sidebar (search box, persistent collapse) — UI nice-to-have, low impact
- Migration cleanup `menu_items` redundansi laporan — perlu konfirmasi data live
- Bulk action di `UserPermissionsManager` (Pilih Semua Grup) — fitur enhancement, bukan blocker

