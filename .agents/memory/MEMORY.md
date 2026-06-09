
- [Equipment queued status flow](equipment-queued-status.md) — trigger auto-queue saat booking confirmed; UI harus fetch queued+distributed bersama, bukan hanya distributed
- [bookings.status vs booking_status alias](bookings-status-column.md) — trigger DB harus pakai `status`, bukan `booking_status` (itu hanya alias di views/RPCs)
- [departures muthawif_id column](departures-muthawif-id.md) — kolom muthawif_id di departures TIDAK ADA di skema awal; ditambahkan migration 081. Trigger A5 gagal di 080 karena kolom belum ada.

- [Sprint C migration 082](sprint-c-migration.md) — departure_muthawifs (C4/C6), hotel_contracts+hotel_vouchers (C7), sos_escalation_log (C8) ada di 082_sprint_c.sql; WA departure trigger IDs pakai pola h{N}_departure (h60/h45/h30/h14/h7/h1).
- [Sprint D migration 083](sprint-d-migration.md) — height_cm+weight_kg+clothing_size+suggest_clothing_size() di customers (083_sprint_d_height_clothing_size.sql). D5=DepartureVisaSummary+visaDeadline prop. D7=DepartureCommissionCard di keuangan tab. AdminOnboarding.tsx pernah punya duplicate mutation code (merge artifact) — sudah fix.


- [Passenger Type Pricing](passenger-type-pricing.md) — price_adult (baru), child/infant_price_percent di departures+packages; perhitungan room-based sudah fix untuk anak/balita.
- [Migration Runner Pattern](migration-runner.md) — migrations di api-server/src/sql/ dengan step hardcoded di runMigrations.ts; file baru perlu step eksplisit.
- [SEO Architecture](seo-architecture.md) — useSEO hook di hooks/useSEO.ts; PackageDetail pakai useEffect manual (bukan hook) karena punya cleanup logic; siteTitle harus dari settings.company_name bukan hardcoded.
- [Branch & Agent Scoping](branch-agent-scoping.md) — JWT membawa branch_id+agent_id; supabaseProxy auto-inject branch_id filter untuk branch_manager; route order agents.ts KRITIS.
- [API server port](api-server-port.md) — Port 8080 dipegang Replit platform; API server harus PORT=3001, Vite proxy di vite.config.ts update ke localhost:3001.
- [SDM Implementation Status](sdm-status.md) — SDM-1-01(payroll)✅ SDM-1-02(training tab)✅ SDM-1-03(SP)✅ SDM-1-04(karir)✅ SDM-2-02(kontrak)✅ — ESS portal(SDM-2-01) & Analytics(SDM-2-03) belum diimplementasi; unknown tables pakai `(supabase as any).from()`.

