# Umrah Haji — Portal Jamaah

Full-stack travel management web app for Umroh & Haji packages — booking, departure management, rooming lists, invoices, and operational tooling.


## Run & Operate

```bash
pnpm --filter @workspace/umrah-haji run dev    # React frontend (Vite)
pnpm --filter @workspace/api-server run dev    # Express API server
```

**Required env vars** (add to Replit Secrets):
- `VITE_SUPABASE_URL` — Supabase project URL
- `VITE_SUPABASE_PUBLISHABLE_KEY` — Supabase anon key

## Stack

- **Frontend**: React 18 + Vite 7, TypeScript, shadcn/ui, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, auth, realtime)
- **State**: @tanstack/react-query
- **PDF**: jsPDF + jspdf-autotable
- **DnD**: @hello-pangea/dnd
- **Date**: date-fns (Indonesian locale)
- **Monorepo**: pnpm workspaces

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


## Where things live

```
artifacts/umrah-haji/src/
├── pages/admin/           # Admin panel pages
│   ├── AdminDepartureDetail.tsx   # 6 tabs: info, jamaah, rooming, perlengkapan, itinerary, operasional
│   ├── AdminBookingDetail.tsx     # Booking detail + invoice PDF
│   ├── AdminBookingCreate.tsx     # Admin booking form (4 steps + passenger type per slot)
│   └── AdminRoomAssignments.tsx   # Kamar & Rooming (double=pair, triple/quad=grouped by room_number)
├── components/departure/
│   └── DepartureRoomingTab.tsx    # Rooming tab for departure detail (links to room_assignments table)
├── components/booking/steps/
│   └── StepPassengersDynamic.tsx  # Public booking step (has passengerType per jamaah)
├── hooks/
│   └── useBookingWizardDynamic.ts # Booking wizard hook (saves adult/child/infant counts)
├── lib/
│   ├── document-generator.ts      # PDF generators incl. generateInvoice (redesigned green/Islamic theme)
│   └── migrations/
│       └── passenger-type-pricing.sql  # SQL for price_child/price_infant columns in departures
└── integrations/supabase/types.ts # Source of truth for DB schema types
```


## Architecture decisions

- **Supabase as backend**: No custom API layer for most operations; Supabase client called directly from React
- **Rooming dual system**: `booking_passengers.room_number` (grouping for triple/quad) + `roommate_id` (pairing for double only). Room_number is the source of truth for multi-person rooms.
- **Passenger type**: `booking_passengers.passenger_type` (adult/child/infant) already exists; `bookings.adult_count/child_count/infant_count` also persisted. SQL migration available for price_child/price_infant columns in departures.
- **Invoice PDF**: Redesigned with emerald green + gold Islamic theme in `generateInvoice()` using jsPDF, no images required
- **Rooming list tab**: DepartureRoomingTab queries `room_assignments` + `room_occupants` (hotel room system), separate from `booking_passengers` pairing system

## Product

- Admin portal: booking management, departure details, rooming list, invoices, equipment, itinerary
- Public portal: package browsing + 4-step booking wizard with room type + passenger type selection
- Operational: check-in QR scan, manifest PDF export, rooming list PDF/Excel export
- Documents: invoice PDF (green/Islamic theme), leave letters, e-tickets

## User preferences

- Language: Bahasa Indonesia throughout UI
- Dates: Indonesian locale (date-fns `id`)
- Currency: IDR formatted with `formatCurrency()`

## Gotchas

- Supabase secrets must be set in Replit Secrets (not .env) before any DB calls work
- `room_assignments` + `room_occupants` = hotel room system; `booking_passengers.room_number` = pairing system — these are two separate systems
- For triple/quad rooms, grouping is via `room_number` (not `roommate_id`); `roommate_id` is only used for double room pairing
- Run `passenger-type-pricing.sql` in Supabase SQL Editor if you want per-type pricing (child/infant price columns)

## Pointers

- shadcn/ui docs: https://ui.shadcn.com
- Supabase JS: https://supabase.com/docs/reference/javascript
- jsPDF: https://rawgit.com/MrRio/jsPDF/master/docs/index.html

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

