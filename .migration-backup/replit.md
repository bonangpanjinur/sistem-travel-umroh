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

## Recent Major Changes (Batch 2 — May 2026)

### 1. SQL Migrations Added
- `src/lib/migrations/hr-enhancements.sql` — New tables: `payroll_records`, `leave_requests`, `leave_quotas`, `performance_reviews`. Extended `employees` table with payroll-related columns.
- `src/lib/migrations/operational-integration.sql` — New tables: `generated_documents`, `jamaah_checklist`. New view: `jamaah_operational_status`. Extended `equipment_distributions` and `room_assignments` with `departure_id`.

### 2. AdminSettings — Complete UI/UX Overhaul
- **Replaced** tabs layout with **left sidebar navigation** design.
- 9 sections: Profil & Akun, Data Perusahaan, Rekening Bank, Dokumen & Surat, Notifikasi, Tampilan, Menu Sidebar, Keamanan, Zona Bahaya.
- Added new Data Perusahaan fields: tagline, kota, website, nomor izin PPIU.
- Improved bank account cards with icon, edit/delete buttons.
- Notifikasi section with WhatsApp & Email toggle settings.
- Tampilan section with color picker and light/dark mode.
- Keamanan section with 2FA, log, sesi links.

### 3. AdminHR — Enhanced with 3 New Tabs
- **Penggajian**: Payroll management with monthly salary processing, summary stats (total, paid, unpaid), employee salary table, payment history.
- **Cuti & Izin**: Leave request management with status cards (pending/approved/rejected), leave quota tracking per employee with progress bars.
- **Kinerja**: Performance review system with 5-dimension scoring (kualitas, produktivitas, inisiatif, teamwork, kehadiran), grade criteria (A-E), quarterly/annual review periods.
- Tab list is now horizontally scrollable to accommodate all 9 tabs.

### 4. AdminDocumentGenerator — Bulk Generation Tab
- Added **"Generate Massal"** tab as first tab — shows all jamaah in a departure as a table.
- Each row has quick-download buttons: Cuti, Paspor, Invoice, E-Ticket, Sertifikat.
- Documents generated instantly per-jamaah without switching tabs.
- Sertifikat only available after return date.
- Tab list is now horizontally scrollable.

### 5. OperationalDashboard — Enhanced Integration View
- Added 4-stat quick row: Check-in, Manifest, Luggage, Kamar.
- Added **Payment Progress** bar showing overall payment completion rate.
- Added **6 module cards** linking to: Kamar/Rooming, Perlengkapan, Manifest, Luggage, Generate Dokumen, Keuangan — each showing live stats.
- Upcoming Departures enhanced with: days-remaining badge, fill-rate progress bar, quick links to Rooming and Manifest per departure.

## App Architecture (umrah-haji)

### Key Pages
- `/` — Landing page
- `/admin/*` — Admin pages (Dashboard, HR, Settings, Documents, Finance, etc.)
- `/operational/*` — Operational pages (Dashboard, Manifest, Rooming, Equipment, etc.)
- `/finance/*` — Finance pages
- `/hr/*` — Employee-facing HR pages

### Key Files
- `src/pages/admin/AdminSettings.tsx` — System settings (sidebar nav layout)
- `src/pages/admin/AdminHR.tsx` — HR management (9 tabs incl. Payroll, Leave, Performance)
- `src/pages/admin/AdminDocumentGenerator.tsx` — Document generator (8 tabs incl. Bulk)
- `src/pages/operational/OperationalDashboard.tsx` — Operational overview
- `src/pages/operational/RoomingListPage.tsx` — Room assignment per jamaah
- `src/pages/operational/EquipmentPage.tsx` — Equipment distribution
- `src/lib/document-generator.ts` — jsPDF-based document generation (cuti, paspor, invoice, e-ticket, sertifikat)
- `src/lib/migrations/` — SQL migration files for Supabase

### Demo Mode
App runs in demo mode when Supabase is not configured (no VITE_SUPABASE_URL). All data comes from mock/empty states.
