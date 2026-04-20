

## Bug & Inefisiensi yang Masih Tersisa

### 🔴 Bug 1 — Tabel `hero_stats` TIDAK ADA tapi tetap di-fetch (404 error)
Network log: `GET /rest/v1/hero_stats → 404 PGRST205 "Could not find the table 'public.hero_stats'"`.
- Hook `useHeroStats` swallow error & return `[]` ✓ — **tidak crash**, tapi tetap:
  - HTTP request 404 setiap kunjungan ke homepage `/`
  - Memboroskan round-trip
  - Meng-clutter network tab developer
- Kemungkinan migrasi belum dijalankan, atau kode masih reference tabel yang sudah dihapus.

### 🟡 Bug 2 — `loadGoogleFonts` di ThemeProvider override font async kita
Di `index.html` saya sudah ubah Google Fonts jadi `rel="preload"` (non-blocking) ✓.
**TAPI** `ThemeProvider.tsx` line 84-88 setiap kali settings load akan **ADD link `<link rel="stylesheet">` baru** dengan font yang sama (Inter, Plus Jakarta Sans) → **render-blocking lagi** + **duplikat download**.

Network log mengkonfirmasi: `website_settings` di-fetch saat `/` dimuat → trigger `loadGoogleFonts` → tambah link blocking. Optimisasi font async di index.html jadi **tidak efektif**.

### 🟡 Bug 3 — `applyMetaTags` & `loadGoogleFonts` jalan setiap settings update
`useEffect` deps `[settings, cssVariables, settingsHash]` — `settings` adalah objek baru tiap React Query refetch (walau staleTime). Setiap re-mount/refetch:
- Hapus & buat ulang `<link>` font (Bug 2)
- Update meta tags (relatif murah)
- Tulis localStorage 3 kali

Solusi: bandingkan `settingsHash` saja sebelum apply, atau pisah jadi 2 useEffect (CSS vars vs fonts vs meta).

### 🟢 Bug 4 — Tidak ada LoadingState fallback yang ringan
`LazyPage` pakai `<LoadingState />`. Cek apakah komponen ini berat (animasi/icon) — bila iya, first paint terhambat saat lazy chunk download.

### 🟡 Bug 5 — `useDashboardStats` tetap mem-fetch saat `enabled` tidak diset
Hook tidak punya guard `enabled: !!user`. Bila ada komponen yang mount sebelum user ready, tetap fire query → kemungkinan 401/RLS denied terbuang.

### 🟢 Bug 6 — Route `/:slug` catch-all di akhir public routes
`<Route path="/:slug" element={<StaticPage />} />` — catch SEMUA path yang tidak match, tapi diletakkan **sebelum** `*` NotFound. OK secara fungsi, tapi setiap typo URL → render `StaticPage` lalu 404 di dalam → boros render 1 page lazy chunk dulu sebelum tahu tidak ada.

---

## Rencana Perbaikan (fokus, low-risk)

### A. `src/hooks/useHeroStats.ts` — disable query bila tabel tidak ada
- Tambah `enabled: false` sementara (atau tambah cek apakah feature dipakai). 
- **Atau** lebih baik: `staleTime: Infinity` + cache hasil 404 supaya tidak retry. Saat ini `retry: 0` ✓ tapi tetap fire 1× setiap mount.
- **Solusi terbaik:** ganti `useQuery` jadi simple `return { data: [], isLoading: false }` sampai tabel di-create. Atau tambah migrasi `CREATE TABLE hero_stats`.

### B. `src/components/providers/ThemeProvider.tsx` — hentikan boros font load
- **Skip `loadGoogleFonts`** bila font sama dengan yang sudah ada di `<link rel="preload">` di `index.html` (Inter & Plus Jakarta Sans). 
- Cek nama font sebelum append link: bila sudah ada di document, skip.
- Tambahkan guard hash: hanya re-apply bila `settingsHash` berubah, bukan setiap render.

### C. `src/components/providers/ThemeProvider.tsx` — pisah useEffect by concern
- useEffect 1: CSS vars (deps: `cssVariables`)
- useEffect 2: Fonts (deps: `settings.heading_font, settings.body_font`)
- useEffect 3: Meta tags (deps: `settings.meta_title, settings.meta_description, settings.logo_url, settings.favicon_url, settings.primary_color`)
- localStorage write hanya saat `settingsHash` berubah (guard di awal).

### D. `src/hooks/useDashboardStats.ts` — guard enabled
- Tambah `enabled` param atau cek lewat user/role di hook agar tidak fire saat unauth.

### E. (Pilihan, opsional) Tanya user: buat migrasi `hero_stats` atau hapus fitur?
- Bila editor `HeroStatsEditor.tsx` masih dipakai admin untuk edit angka statistik → buat migrasi tabel.
- Bila tidak dipakai → hapus hook & komponen.

---

## File yang akan diubah
- `src/hooks/useHeroStats.ts` — short-circuit return tanpa query (sampai user pilih).
- `src/components/providers/ThemeProvider.tsx` — skip font load bila sudah preloaded di index.html, pisah useEffect.
- `src/hooks/useDashboardStats.ts` — tambah guard `enabled`.

## Hasil yang ditargetkan
- ✅ Hilangkan 1 HTTP 404 request setiap visit homepage.
- ✅ **Optimisasi font async di index.html jadi efektif** (sekarang dibatalkan oleh ThemeProvider).
- ✅ Meta tag & font tidak re-apply setiap re-render → kurang DOM mutation.
- ✅ Dashboard tidak fetch saat unauth.

## Pertanyaan untuk user (sebelum implementasi)
**Apakah fitur "Hero Stats" (statistik di banner homepage seperti "1000+ Jamaah") masih dipakai?**
- **Ya, mau dipakai** → saya buat migrasi tabel `hero_stats` (ada di kode tapi belum di DB).
- **Tidak / belum dibutuhkan** → saya hapus hook + komponen `HeroStatsEditor` agar tidak ada 404.
- **Skip dulu** → saya hanya silence query supaya tidak 404, fitur biarkan mati sementara.

