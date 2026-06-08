<<<<<<< HEAD
- [Supabase null vs undefined in types](supabase-null-undefined.md) — Supabase returns null for optional columns; TypeScript interfaces using undefined? must map null→undefined in queryFn.
- [Passenger Type Pricing](passenger-type-pricing.md) — price_adult (baru), child/infant_price_percent di departures+packages; perhitungan room-based sudah fix untuk anak/balita.
- [Migration Runner Pattern](migration-runner.md) — migrations di api-server/src/sql/ dengan step hardcoded di runMigrations.ts; file baru perlu step eksplisit.
- [SEO Architecture](seo-architecture.md) — useSEO hook di hooks/useSEO.ts; PackageDetail pakai useEffect manual (bukan hook) karena punya cleanup logic; siteTitle harus dari settings.company_name bukan hardcoded.
- [Branch & Agent Scoping](branch-agent-scoping.md) — JWT membawa branch_id+agent_id; supabaseProxy auto-inject branch_id filter untuk branch_manager; route order agents.ts KRITIS.
- [API server port](api-server-port.md) — Port 8080 dipegang Replit platform; API server harus PORT=3001, Vite proxy di vite.config.ts update ke localhost:3001.
- [rencanadarurat P1+P2 selesai](rencanadarurat-done.md) — Semua P1+P2 dari rencanadarurat.md selesai di sesi 9 Jun 2026; P3 belum. Migrations 33-35 applied.
=======
- [SQL migration file placement](sql-migration-placement.md) — SQL files for runner must live in `artifacts/api-server/src/sql/`, not root `sql/migrations/`
>>>>>>> 3e671702 (Add ability to send manual push notifications to staff with filtering)
