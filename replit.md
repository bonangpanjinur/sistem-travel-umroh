# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Umrah & Haji travel portal (UmrahTravel) — a full-featured travel management system for Umrah and Haji packages, bookings, jamaah management, and more.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (+ Supabase for auth/storage)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui, wouter + react-router-dom

## Artifacts

- `artifacts/umrah-haji` — Main web app (UmrahTravel portal, served at `/`)
- `artifacts/api-server` — Express backend API (served at `/api`)
- `artifacts/mockup-sandbox` — Design/mockup sandbox

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Environment Variables Required

- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/public key
- `SUPABASE_URL` — Supabase URL (for API server)
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key (for API server)

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
