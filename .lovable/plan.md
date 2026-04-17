

## Akar masalah yang masih tersisa

### 1. Urutan group tidak rapi — "Overview" tidak di atas
`useDynamicMenus` order by `group_name ASC` (alfabetis). Hasilnya: Dokumen, Jamaah, Keuangan, Laporan, Master Data, **Overview**, Pengaturan, Produk... → Overview di tengah, bukan paling atas.

DB tidak punya kolom `group_sort_order`. Solusi paling cepat & robust: **tetapkan urutan group di frontend** lewat array konstan, sort grup berdasarkan posisi di array. Tidak perlu migrasi DB.

Urutan target:
1. Overview
2. Produk & Operasional
3. Jamaah & Agent
4. Keuangan & Akuntansi
5. Sales & CRM
6. SDM (HR)
7. Dokumen & Surat
8. Master Data
9. Support & Komunikasi
10. Laporan
11. Pengaturan

### 2. Halaman lambat — pola sama berulang
**Akar:** banyak halaman fetch SEMUA data lalu filter/aggregate di JS, tanpa `staleTime`, dan halaman analytics eager-import `recharts` (~200 KB gzip).

| Halaman | Masalah konkret |
|---|---|
| `AdminAnalytics` | recharts top-level + 3 query bookings/payments tanpa staleTime |
| `AdminLeadAnalytics` | recharts top-level + fetch SEMUA leads (no limit, no period filter di SQL) |
| `AdminAdvancedReports` | recharts top-level |
| `AdminFinancePL` | fetch SEMUA bookings + SEMUA vendor_costs (no filter departure_id) |
| `AdminFinanceAR` | fetch SEMUA bookings (no limit, no pagination) |
| `AdminFinanceAP` | sama dengan AR |
| `AdminPayroll` | query berat realtime tiap bulan |
| `AdminSupportTickets` | tickets + responses tanpa staleTime, refetch tiap navigasi |

---

## Rencana perbaikan

### A. Urutkan group menu (dampak visual langsung)
**File:** `src/hooks/useDynamicMenus.ts`
- Tambah konstanta `GROUP_ORDER` (array di atas).
- Setelah `groupedMenus.reduce(...)`, sort grup: `groupedMenus.sort((a,b) => GROUP_ORDER.indexOf(a.name) - GROUP_ORDER.indexOf(b.name))`. Group yang tidak ada di array tetap di akhir.

### B. Lazy-load `recharts` di halaman analytics
**File:** `AdminAnalytics.tsx`, `AdminLeadAnalytics.tsx`, `AdminAdvancedReports.tsx`
- Ekstrak blok chart ke komponen terpisah di file yang sama (atau file `*Charts.tsx`), pakai `React.lazy` + `Suspense` dengan skeleton fallback.
- Halaman utama tampil instan; chart muncul setelah JS chart termuat.

### C. Optimasi query data berat
**`AdminFinancePL.tsx`:**
- Filter bookings & vendor_costs by `departure_id IN (...)` setelah dapat list departures (pakai `.in('departure_id', depIds)`), bukan fetch semua.
- Tambah `staleTime: 1000 * 60 * 5`.

**`AdminFinanceAR.tsx` & `AdminFinanceAP.tsx`:**
- Tambah `.limit(200)` + filter outstanding > 0 default (pakai `.gt('total_price - paid_amount', 0)` via RPC sederhana, atau cukup `.limit(200).order('created_at desc')` agar UI ringan).
- Tambah `staleTime: 1000 * 60 * 5`.

**`AdminLeadAnalytics.tsx`:**
- Filter SQL by period (`gte('created_at', startDate)`) — jangan fetch semua leads.
- Tambah `staleTime: 1000 * 60 * 5`.

**`AdminAnalytics.tsx`:**
- Tambah `staleTime: 1000 * 60 * 5` (sudah filter by period, tapi belum cache).

**`AdminSupportTickets.tsx`:**
- Tambah `staleTime: 1000 * 60 * 2` di kedua query.
- Tambah `.limit(100).order('created_at', { ascending: false })` agar tidak load semua.

**`AdminPayroll.tsx`:**
- Tambah `staleTime: 1000 * 60 * 10` (gaji bulanan tidak berubah per detik).

### D. Bonus: Skeleton fallback yang lebih ringan
- Suspense fallback `LoadingState` saat ini full-screen spinner. Untuk halaman dalam Outlet, pakai skeleton kartu (tampak lebih responsif).

---

## File yang akan diubah

**Diedit:**
- `src/hooks/useDynamicMenus.ts` — tambah `GROUP_ORDER`, sort grup.
- `src/pages/admin/AdminAnalytics.tsx` — lazy-load chart section + staleTime.
- `src/pages/admin/AdminLeadAnalytics.tsx` — lazy-load chart + filter SQL by period + staleTime.
- `src/pages/admin/AdminAdvancedReports.tsx` — lazy-load chart section.
- `src/pages/admin/AdminFinancePL.tsx` — query terbatas by departure_id + staleTime.
- `src/pages/admin/AdminFinanceAR.tsx` — limit 200 + staleTime.
- `src/pages/admin/AdminFinanceAP.tsx` — limit 200 + staleTime.
- `src/pages/admin/AdminSupportTickets.tsx` — limit 100 + staleTime.
- `src/pages/admin/AdminPayroll.tsx` — staleTime 10 menit.

---

## Hasil yang ditargetkan
- **Group "Overview" tampil paling atas**, urutan grup konsisten & natural.
- **Halaman analytics**: time-to-first-paint < 1 detik (chart muncul progresif).
- **Halaman finance**: query payload turun drastis untuk tenant dengan banyak booking.
- **Navigasi balik ke halaman yang sama**: instan (cache 5-10 menit).
- **Tidak ada perubahan fungsional** — semua data, chart, filter tetap sama.

