# Umrah Haji - Portal Jamaah

A full-stack Umrah & Haji travel management platform for Indonesian travel agents — includes public booking portal, admin dashboard, jamaah (pilgrim) portal, operational management, and agent/branch tools.

## Run & Operate

- `pnpm --filter @workspace/umrah-haji run dev` — run the frontend (port from env)
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- Required env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase project credentials (frontend)
- Required env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase service credentials (backend)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v3, shadcn/ui, react-router-dom v7, @tanstack/react-query
- Backend: Express 5, Pino logger
- Database: Supabase (Postgres), accessed via REST API from backend
- Validation: Zod, Orval codegen from OpenAPI spec
- Auth: Supabase Auth (email/password, social)

## Where things live

- `artifacts/umrah-haji/` — React+Vite frontend artifact (previewPath: `/`)
- `artifacts/api-server/` — Express API server (previewPath: `/api`)
- `artifacts/umrah-haji/src/integrations/supabase/` — Supabase client + generated DB types
- `artifacts/umrah-haji/src/routes/` — Route modules (Admin, Agent, Customer, Operational, Public)
- `artifacts/api-server/src/routes/v1/` — Backend API routes (packages, departures, leads)
- `lib/api-spec/openapi.yaml` — OpenAPI source of truth
- `artifacts/umrah-haji/tailwind.config.ts` — Tailwind theme
- `artifacts/umrah-haji/supabase/migrations/` — SQL migrations (run in Supabase dashboard)

## Architecture decisions

- Multi-tenant SPA: tenant identity resolved dynamically from domain/subdomain at runtime
- Supabase used for auth + DB; backend uses service-role key for privileged REST calls
- API keys for public endpoints (leads, packages, departures) via `X-API-Key` header
- Frontend uses BrowserRouter with `basename={import.meta.env.BASE_URL}` for Replit proxy compatibility
- All Supabase calls gracefully degrade when credentials are missing (demo mode)
- `customer_mahrams` table supports multiple mahrams per jamaah; falls back gracefully if migration not yet run (error code 42P01 handled)

## Product

- Public landing page with package listings, departure schedule, savings program registration
- Jamaah portal: digital ID, itinerary, documents, payment history, doa & panduan
- Admin dashboard: full CRM (customers, packages, departures, payments, agents, branches)
- Departure detail: Kamar tab (DepartureRoomingTab) connects live to rooming data in DB
- Operational tools: manifest, check-in QR, rooming list (multi-select mahram-aware assign), bus/luggage management
- Invoice PDF: redesigned with status badge (LUNAS/CICILAN/BELUM LUNAS), paid/remaining amounts, dark header
- Customer edit dialog: new "Mahram" tab with multi-mahram list management (customer_mahrams table)
- Agent portal: commission, customer management, notifications

## User preferences

_Populate as you build._

## Gotchas

- Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` secrets for full functionality
- Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` for backend API routes
- Without Supabase credentials, the app runs in demo mode with static sample data
- `react-hook-form 7.51.0` has a peer warning with React 19 — safe to ignore, works correctly
- Run `supabase/migrations/20260506000001_customer_mahrams.sql` in Supabase SQL Editor for multi-mahram feature to persist

## Pointers

- See the `pnpm-workspace` skill for workspace structure
- Supabase types: `artifacts/umrah-haji/src/integrations/supabase/types.ts`
