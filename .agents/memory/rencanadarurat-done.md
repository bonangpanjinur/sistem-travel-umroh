---
name: rencanadarurat P1+P2 completed
description: Status penyelesaian semua item P1 dan P2 dari rencanadarurat.md (9 Jun 2026)
---

## Item Selesai

**P1-A** — Migration `33_departure_pl_triggers.sql`: trigger `trg_booking_refresh_pl` (on bookings.status/total_price/departure_id) dan `trg_payment_refresh_pl` (on payments INSERT/UPDATE/DELETE) yang auto-call `recalculate_departure_financial_summary()`.

**P1-B** — Migration `34_performance_reviews.sql`: tabel `performance_reviews` dengan `UNIQUE(employee_id, review_period)` dan GENERATED `overall_score`. AdminHR.tsx: baris 312 dari placeholder array `[]` → `useQuery` dari Supabase. `saveReviewMutation` dari `console.log` placeholder → `supabase.from("performance_reviews").upsert()` dengan `onConflict: "employee_id,review_period"`.

**P1-C** — `AdminPayroll.tsx`: tambah `overtime_hours: number; overtime_pay: number;` ke `PayrollData` interface. State `overtimeHours: Record<string, number>`. Formula: `(salary/173) × 1.5 × jam`. Kolom "Lembur (jam)" + "Uang Lembur" di tabel Slips dengan `<Input type="number">` per row. PDF slip menampilkan baris "Uang Lembur (N jam × 1,5×)" di seksi PENDAPATAN.

**P1-D** — `DepartureCostItemsCard.tsx`: banner margin di antara CardHeader dan CardContent. Merah jika `hpp_per_pax > min(prices)`, kuning jika `hpp_per_pax > midPrice × 0.85`.

**P2-A** — Migration `33_auto_commission_booking_confirmed` sudah ada dan applied sebelum sesi ini.

**P2-B** — `useBookingWizardDynamic.ts` line 472 sudah insert ke `booking_line_items` saat booking submit. Tidak perlu perubahan.

**P2-C** — Migration `35_equipment_unit_cost.sql`: `ALTER TABLE equipment_items ADD COLUMN IF NOT EXISTS unit_cost INTEGER DEFAULT 0`. `EquipmentRealizationTab.tsx`: query tambah `unit_cost`, interface tambah `unit_cost` + `total_cost` fields, mutation `importToHPPMutation` yang DELETE+INSERT ke `departure_cost_items` (category='perlengkapan') lalu call `recalculate_departure_financial_summary`. Button "Impor Biaya ke HPP" visible hanya saat `selectedDeparture` ada.

**P2-D** — `PackageList.tsx`: filter aktif dengan `todayStr = new Date().toISOString().split("T")[0]`; paket disembunyikan jika SEMUA departure-nya `departure_date < today` atau status `cancelled`.

**BUG FIX** — `AdminRoutes.tsx`: deklarasi ganda `const AdminSDMLaporan` di baris 136+142 → baris 142 dihapus. Route `hr/laporan` duplikat di baris 1029-1038 juga dihapus.

## Masih Belum Dikerjakan (P3)

- P3-A: Bulk Edit HPP Cost Items (~4 jam)
- P3-B: Analytics Conversion Rate per Paket (~3 jam)
- P3-C: Rekonsiliasi Otomatis Pembayaran (~4 jam)
- P3-D: General Ledger / Chart of Accounts (~5-7 hari)
- P3-E: PO Equipment + Serial Number (~3 jam)

**Why:** Semua P1+P2 adalah bug/gap yang menghalangi operasional. P3 adalah enhancements.
**How to apply:** Lihat rencanadarurat.md bagian "🟡 PRIORITAS 3" untuk detail implementasi P3.
