

## Akar masalah loading lambat (yang sebenarnya)

Network requests sebenarnya cepat (`profiles`, `user_roles`, `menu_items` semua < 1s, status 200). Auth dedupe sudah jalan. Tapi user tetap merasa lambat karena **parse + execute JavaScript di browser yang lama**, bukan jaringan.

### Penyebab #1 — `import * as LucideIcons from 'lucide-react'` (KRITIS)

Di `src/components/admin/AdminLayoutDynamicImproved.tsx` baris 14 dan `src/components/admin/CommandPalette.tsx` baris 12:

```ts
import * as LucideIcons from 'lucide-react';  // ⚠️ memuat ~1500 ikon
```

**Dampak:** `lucide-react` punya ribuan ikon. Wildcard import membuat **setiap ikon** di-bundle ke layout admin (file yang dimuat eager, bukan lazy). Estimasi: **+2-5 MB JS** yang harus diunduh, di-parse, dan dieksekusi browser sebelum sidebar muncul. Ini sebabnya layout terasa "berat" walaupun network selesai cepat.

Kita sebenarnya hanya butuh **47 ikon** (sesuai `RECOMMENDED_MENUS`).

### Penyebab #2 — `useDashboardStats` mengirim 5 query paralel besar

`bookings` di-fetch tanpa `.limit()`, tanpa pagination → bisa ratusan/ribuan baris di-load lalu di-loop 6× di JS untuk hitung statistik (revenue, status, payment, agen, AR aging, monthly trend). Ini bottleneck CPU client untuk tenant dengan banyak data.

### Penyebab #3 — `recharts` di-eager-load di Dashboard

Dashboard import `AreaChart, BarChart, PieChart, ResponsiveContainer` dari `recharts` (~200KB gzip) langsung di top-level. Walaupun `AdminDashboard` sudah `React.lazy`, recharts tetap masuk ke chunk dashboard yang besar.

### Penyebab #4 — `AdminLayoutDynamicImproved` BUKAN lazy

`AdminRoutes.tsx` baris 4: `import AdminLayout from "@/components/admin/AdminLayoutDynamicImproved";` — eager. Berarti seluruh layout (+ wildcard lucide + CommandPalette) di-load bersama route shell, sebelum apa pun di-render.

### Penyebab #5 — Realtime subscription instance baru tiap mount

`useMultipleRealtimeSubscriptions` di Dashboard pakai `Math.random()` untuk channel ID → setiap mount = channel WebSocket baru. Untuk Strict Mode dev / re-render = membuat & menutup WS berkali-kali.

---

## Rencana perbaikan (fokus pada bundle & CPU)

### A. Hilangkan wildcard `lucide-react` (dampak terbesar)
- Di `AdminLayoutDynamicImproved.tsx`: ganti `import * as LucideIcons` dengan **icon registry kecil** — Map dari nama ikon → komponen, hanya untuk 47 ikon yang dipakai di `RECOMMENDED_MENUS`. File: `src/lib/admin-menu-icons.ts` (baru).
- Di `CommandPalette.tsx`: pakai registry yang sama.
- Hasil: bundle layout turun **2-5 MB → ~50 KB** untuk ikon. Parse JS turun drastis.

### B. Lazy-load `AdminLayoutDynamicImproved`
- Ubah `import AdminLayout from "..."` di `AdminRoutes.tsx` jadi `lazy(() => import("..."))`, bungkus dalam `Suspense`.
- Dampak: shell admin di-split keluar dari main bundle.

### C. Optimasi `useDashboardStats`
- Tambahkan `.limit(500)` dan filter `created_at >= 6 bulan terakhir` pada query bookings (cukup untuk dashboard).
- Pisahkan query AR aging ke RPC ringan (atau tetap, karena sudah parallel).
- Tambah `staleTime: 1000 * 60 * 10` (10 menit) — dashboard tidak perlu fresh per detik.

### D. Lazy-load chart-chart berat di Dashboard
- Ekstrak komponen chart (Funnel, Top Agents, AR Pie, Status Pie, Monthly Area) jadi `React.lazy` per komponen, atau pisah ke 1 file `DashboardCharts.tsx` yang di-lazy. Recharts tidak perlu blocking initial paint.

### E. Stabilkan realtime channel ID
- Hapus `Math.random()` di `useRealtimeSubscription.ts`, pakai `table` saja sebagai ID (Supabase JS klien sudah dedupe channel).
- Bonus: kurangi WS reconnect saat re-render.

### F. Optimasi kecil tambahan
- `AdminAirlines.tsx` & halaman master data lain: tambah `staleTime: 1000 * 60 * 5` (data master jarang berubah).
- `useDynamicMenus`: query `menu_items` sudah `staleTime: Infinity` ✓ — tapi tambah `select('id,key,label,path,icon,group_name,sort_order,required_permission')` eksplisit (drop kolom `created_at/updated_at` yang tidak dipakai → response lebih kecil).

---

## File yang akan diubah

**Baru:**
- `src/lib/admin-menu-icons.ts` — registry 47 ikon eksplisit (named import dari lucide-react).

**Diedit:**
- `src/components/admin/AdminLayoutDynamicImproved.tsx` — hapus wildcard import, pakai `getMenuIcon(name)` dari registry baru.
- `src/components/admin/CommandPalette.tsx` — sama.
- `src/routes/AdminRoutes.tsx` — `AdminLayout` jadi lazy.
- `src/hooks/useDashboardStats.ts` — limit 500 + filter 6 bulan + staleTime 10 menit.
- `src/pages/admin/AdminDashboard.tsx` — pisah/lazy chart components, atau bungkus chart dalam `Suspense` + `lazy(() => import("./DashboardCharts"))`.
- `src/hooks/useRealtimeSubscription.ts` — channel ID stabil (tanpa Math.random).
- `src/hooks/useDynamicMenus.ts` — select kolom eksplisit.

---

## Hasil yang ditargetkan
- **Initial JS bundle layout admin** turun ~70% (dari ~5 MB → ~1-1.5 MB).
- **Time-to-interactive** dashboard: dari ~3-5 detik → < 1.5 detik.
- **Tidak ada perubahan fungsional** — semua menu, ikon, chart tetap tampil sama.
- **WebSocket lebih stabil** (tidak buka/tutup berkali-kali).
- **Master data pages** terasa instan saat navigasi ulang (cache 5 menit).

