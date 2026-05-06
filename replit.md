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
