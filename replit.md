# Umrah Haji - Portal Jamaah

A full-stack Umrah & Haji travel management platform for Indonesian travel agents — includes public booking portal, admin dashboard, jamaah (pilgrim) portal, operational management, and agent/branch tools.

## Run & Operate

- `pnpm --filter @workspace/umrah-haji run dev` — run the frontend (port from env)
- `pnpm --filter @workspace/api-server run dev` — run the API server
- `pnpm run typecheck` — full typecheck across all packages
- Required env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase project credentials (frontend)
- Required env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Supabase service credentials (backend)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS v3, shadcn/ui, react-router-dom v7, @tanstack/react-query
- Backend: Express 5, Pino logger
- Database: Supabase (Postgres), accessed via REST API from backend
- Auth: Supabase Auth (email/password)

## Where things live

- `artifacts/umrah-haji/` — React+Vite frontend artifact (previewPath: `/`)
- `artifacts/api-server/` — Express API server (previewPath: `/api`)
- `artifacts/umrah-haji/src/integrations/supabase/` — Supabase client + generated DB types
- `artifacts/umrah-haji/src/routes/` — Route modules (Admin, Agent, Customer, Operational, Public)
- `artifacts/umrah-haji/src/lib/migrations/` — SQL migration files (run in Supabase SQL Editor)
- `artifacts/umrah-haji/src/lib/document-generator.ts` — PDF generators (invoice, manifest, e-ticket, certificate)
- `artifacts/umrah-haji/src/components/admin/DocumentSettingsForm.tsx` — PDF design settings panel

## Architecture decisions

- Multi-tenant SPA: tenant identity resolved dynamically from domain/subdomain at runtime
- Supabase used for auth + DB; all calls degrade gracefully in demo mode (no credentials)
- `customer_mahrams` supports multiple mahrams per jamaah (suami/istri/anak/ayah/ibu/saudara) with `relation_category` column (added via `multi-mahram-rooming.sql`)
- `useDynamicMenus` falls back to `ROLE_DEFAULT_PERMISSIONS` when DB is unreachable so sidebar always works
- `role_permissions` table drives the sidebar via `get_user_effective_permissions_v2` RPC; AdminRoleManagement has "Terapkan Default" button

## Product

- Public landing page with package listings, departure schedule, savings program registration
- Jamaah portal: digital ID, itinerary, documents, payment history, doa & panduan
- Admin dashboard: full CRM (customers, packages, departures, payments, agents, branches)
- Departure detail: jamaah tab → "Kelola Kamar" switches to kamar tab, "Buka Rooming" opens /admin/room-assignments
- Operational rooming: assign dialog shows multi-mahram tags + "+ Keluarga" auto-select button
- Invoice PDF: LUNAS watermark, package/departure info bar, passenger summary, status badge
- AdminBookingCreate: PassengerCard shows mahram relationships (from customer_mahrams)
- AdminSettings → Tampilan: merged with DocumentSettingsForm (invoice color, manifest layout, font, watermark)
- AdminRoleManagement: "Terapkan Default" seeds role_permissions from ROLE_DEFAULT_PERMISSIONS

## Gotchas

- Run `artifacts/umrah-haji/src/lib/migrations/multi-mahram-rooming.sql` in Supabase SQL Editor for multi-mahram + rooming enhancements
- Without Supabase credentials, the app runs in demo mode with static sample data
- `react-hook-form 7.51.0` has a peer warning with React 19 — safe to ignore

## Pointers

- See `artifacts/umrah-haji/src/lib/admin-menu-registry.ts` for ROLE_DEFAULT_PERMISSIONS and RECOMMENDED_MENUS
- Supabase types: `artifacts/umrah-haji/src/integrations/supabase/types.ts`
