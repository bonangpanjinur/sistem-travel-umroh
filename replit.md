# Vinstour Travel — Umroh & Haji Management Portal

A full-featured travel management system for Umroh & Haji services (Vinstour Travel). Supports jamaah booking, admin management, agent commissions, operational tracking, and a public-facing portal.

## Run & Operate

- `pnpm --filter @workspace/umrah-haji run dev` — run the frontend (port assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Required Environment Variables

### Frontend (Vite — prefix with `VITE_`)
- `VITE_SUPABASE_URL` — Supabase project URL (required for auth and database)
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key

### API Server
- `SUPABASE_URL` — Supabase project URL (required for API key validation)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (required for API key validation)
- `PORT` — assigned automatically by workflow

> **Note:** The app runs in demo mode without Supabase credentials. Auth is disabled and API routes return sample data. For production, all Supabase env vars must be set.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v3, react-router-dom, @tanstack/react-query
- Backend: Express 5, pino logging
- Database: Supabase (PostgreSQL) — accessed directly via @supabase/supabase-js client
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/`)
- Build: esbuild (API server)

## Where things live

- `artifacts/umrah-haji/src/` — React frontend source
  - `pages/` — all page components (admin, agent, customer, jamaah, operational, public)
  - `routes/` — route modules (AdminRoutes, PublicRoutes, etc.)
  - `hooks/` — data hooks (all Supabase queries)
  - `components/` — UI components
  - `integrations/supabase/` — Supabase client and type definitions
- `artifacts/api-server/src/routes/v1/` — Public API routes (packages, departures, leads)
- `lib/api-spec/openapi.yaml` — API contract (source of truth)

## Architecture decisions

- Supabase is the primary data store — all hooks call Supabase directly from the frontend
- The Express API server (`/api/v1/`) serves as a public-facing API with optional API key auth via Supabase
- API key auth bypasses gracefully when Supabase is not configured (demo/dev mode)
- Theme and SEO metadata are stored in localStorage and applied before React renders (prevents flash)
- BrowserRouter uses `import.meta.env.BASE_URL` as basename for correct path-based routing on Replit

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run `pnpm install` after pulling changes that add new dependencies
- The frontend uses Tailwind CSS v3 (PostCSS plugin), not Tailwind v4
- Do not use `@tailwindcss/vite` plugin — use the postcss approach in `vite.config.ts`
