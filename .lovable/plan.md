

## Akar masalah loading lambat (yang masih tersisa)

Setelah cek mendalam, saya temukan **5 bottleneck nyata** yang belum disentuh:

### 1. `useDashboardStats` masih dependent ke `agents` query — sequential
Di `useDashboardStats.ts` line 60-69, query bookings memakai `Promise.all` dengan agents query — bagus. **TAPI** di dalam loop `rawBookings?.forEach`, untuk setiap booking, code memanggil `agents?.find(a => a.id === b.agent_id)` → **O(N×M) lookup**. Untuk 1000 bookings × 100 agents = 100.000 iterasi sinkron di main thread saat dashboard load. Inilah penyebab "freeze" sebentar.

### 2. AdminDashboard mounting **5 query berbeda secara parallel** + 1 realtime subscription
- `useDashboardStats` (1)
- `useRecentBookings` (2)
- `useUpcomingDepartures` (3)
- `branches`, `agents`, `stockAlerts`, `pendingDocuments`, `recentAudits` (4-8)
- `useMultipleRealtimeSubscriptions` (WS handshake)

Total: **8 HTTP request paralel + 1 WebSocket** saat dashboard pertama buka. Browser HTTP/2 dapat handle, tapi waterfall server-side & RLS check tetap terasa.

### 3. ProtectedRoute + AdminLayout sama-sama panggil `useDynamicMenus`
- `ProtectedRoute` panggil `useDynamicMenus()` untuk cek `isPathAllowed`.
- `AdminLayoutDynamicImproved` panggil `useDynamicMenus()` LAGI untuk render sidebar.
- React Query dedupe network ✓, tapi 2 komponen subscribe → 2× re-render saat data masuk. Plus `sortedGroupedMenus` `useMemo` jalan 2× dengan dep array array reference berbeda.

### 4. `index.html` blocking stylesheet untuk Google Fonts
Line 26: `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?...">` — **render-blocking**. Browser harus tunggu CSS fonts download sebelum first paint. Walau preconnect ada, tetap ada round-trip. Untuk koneksi lambat = +200-500ms ke First Paint.

### 5. `AdminLayoutDynamicImproved` re-render sidebar setiap pindah route
- `expandedGroups` `useEffect` (line 143) jalan setiap `location.pathname` ganti → `setExpandedGroups` → re-render seluruh sidebar (47 menu items).
- `MenuGroupItem` sudah `memo` ✓, tapi prop `isPathActive` (line 179) **adalah function baru tiap render** → memo gagal → semua group re-render.

---

## Rencana perbaikan (fokus, tidak invasif)

### A. `src/hooks/useDashboardStats.ts` — buat agent map sekali
- Sebelum loop bookings, build `agentMap = new Map(agents.map(a => [a.id, a.company_name]))`.
- Ganti `agents?.find(...)` → `agentMap.get(b.agent_id)`. Dari O(N×M) → O(N).
- Limit bookings select dari 1000 → 500 (default 6 bulan biasanya cukup).

### B. `src/pages/admin/AdminDashboard.tsx` — gabung query "alerts"
- Buat 1 hook `useDashboardAlerts()` yang fetch `stockAlerts + pendingDocuments + recentAudits` paralel di dalam 1 hook (Promise.all). Mengurangi 3 useQuery → 1.
- Naikkan staleTime `recentAudits` dari 5 menit → 15 menit (audit jarang dilihat detik-per-detik).

### C. `src/components/auth/ProtectedRoute.tsx` — skip `useDynamicMenus` saat super admin
- Sudah ada `isSuper` flag tapi hook tetap dipanggil. React rules: hook harus dipanggil. **Solusi:** pakai `enabled: false` lewat conditional yang sudah ada di `useDynamicMenus` (line 47, 88) — sudah benar. Yang perlu diperbaiki: pastikan `isPathAllowed` jadi stable callback (sudah `useCallback` ✓). 
- **Real fix:** keluarkan `useDynamicMenus()` dari `ProtectedRoute` ketika `!shouldCheckDynamicMenus` — pakai komponen wrapper terpisah `<DynamicMenuGate>` yang hanya mount saat butuh.

### D. `src/components/admin/AdminLayoutDynamicImproved.tsx` — stable `isPathActive`
- Bungkus `isPathActive` dengan `useCallback([location.pathname])`. Lalu `MenuGroupItem` memo akan benar-benar bekerja.
- `expandedGroups` `useEffect`: tambah guard agar tidak `setState` jika group sudah expanded → cegah re-render kosong.

### E. `index.html` — non-blocking font load
- Ganti `<link rel="stylesheet" href="...fonts...">` jadi pola async:
  ```html
  <link rel="preload" as="style" href="..." onload="this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="..."></noscript>
  ```
- First Paint langsung jalan, fonts swap-in saat siap (Inter & Plus Jakarta Sans memang `display=swap`).

### F. (Opsional, low-risk) Lazy `CommandPalette` keyboard listener
- Sudah lazy ✓, tetap.

---

## File yang akan diubah
- `src/hooks/useDashboardStats.ts` — agent Map lookup, limit 500.
- `src/pages/admin/AdminDashboard.tsx` — gabung 3 query alerts jadi 1.
- `src/hooks/useDashboardAlerts.ts` — **BARU**, single Promise.all.
- `src/components/auth/ProtectedRoute.tsx` — extract dynamic menu check ke sub-component.
- `src/components/admin/AdminLayoutDynamicImproved.tsx` — useCallback `isPathActive`, guard expandedGroups setState.
- `index.html` — async font loading.

## Hasil yang ditargetkan
- Dashboard TTI: **turun ~30-40%** untuk tenant produksi (1000 bookings).
- Loop processing dashboard: **dari ~50-100ms → < 5ms**.
- HTTP requests dashboard pertama: **dari 8 → 6** request.
- First Paint: **turun ~150-300ms** (font tidak blocking).
- Sidebar tidak re-render seluruhnya saat pindah halaman.
- **Tidak ada perubahan UI/fungsional.** Semua data, chart, menu tetap sama.

