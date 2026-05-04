# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## App

This is the **Umrah Haji - Portal Jamaah** app — a management portal for Umrah & Haji travel services built in Indonesian. The app has:

- A public-facing landing page with Islamic design (emerald green & gold theme)
- Customer portal (booking, savings plans, jamaah profiles)
- Admin dashboard with role-based access (super_admin, owner, branch_manager, finance, sales, marketing, operational, equipment, agent)
- Agent portal
- Supabase backend (auth, database, RLS)

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **Frontend**: React + Vite + React Router v6 (artifact: `umrah-haji` at `/`)
- **API framework**: Express 5 (artifact: `api-server` at `/api`)
- **Database**: Supabase (external) + PostgreSQL + Drizzle ORM (Replit local)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **CSS**: Tailwind CSS v3 + PostCSS
- **UI components**: Radix UI + shadcn/ui

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Environment Variables

The app uses Supabase as its backend. The following env vars are needed for full functionality:
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/publishable key

These have hardcoded fallbacks pointing to the original Lovable Cloud project, so the app works without them set.

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifact Structure

- `artifacts/umrah-haji/` — React + Vite frontend (preview path: `/`)
- `artifacts/api-server/` — Express API server (preview path: `/api`)
- `artifacts/mockup-sandbox/` — Design mockup sandbox (preview path: `/__mockup`)
