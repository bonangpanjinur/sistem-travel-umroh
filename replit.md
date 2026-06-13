
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

# Vinstour Travel — Umroh & Haji Management Portal

Sistem manajemen perjalanan umroh & haji lengkap untuk Vinstour Travel. Mencakup booking jamaah, panel admin, komisi agen, tracking operasional, dan portal publik.


> **Rencana lengkap, status semua halaman, dan catatan teknis ada di [`rencana.md`](./rencana.md)**

---

## Cara Menjalankan

```bash
# Frontend (port 5000) — via Replit workflow "Start application"
PORT=5000 pnpm --filter @workspace/umrah-haji run dev

# API Server (port 8080) — via Replit workflow "Start API server"
PORT=8080 pnpm --filter @workspace/api-server run dev

# Install semua dependencies
pnpm install

# Typecheck semua paket
pnpm run typecheck:libs && pnpm run typecheck
```

---

## Stack

- **Monorepo**: pnpm workspaces, Node.js 20, TypeScript 5.9
- **Frontend**: React 19 + Vite 7, Tailwind CSS v3, react-router-dom v7, @tanstack/react-query v5
- **Backend**: Express 5, pino logging, bcryptjs + JWT auth
- **Database**: Neon PostgreSQL (Replit integration) — `DATABASE_URL` di Replit Secrets
- **Auth**: JWT custom (bcrypt password hash, auth.users + profiles + user_roles tables)
- **Supabase Compatibility**: `supabaseProxy.ts` implements PostgREST `/rest/v1/*` dan `/auth/v1/*`
- **Build**: esbuild (API server), Vite (frontend)

---

## Struktur Direktori



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

```
artifacts/
  umrah-haji/src/   — Frontend React (pages, routes, hooks, components)
  api-server/src/   — Express API (routes/, lib/auth, lib/db, supabaseProxy)
lib/
  api-spec/         — openapi.yaml (source of truth)
  api-zod/          — Zod schemas (auto-generated)
  db/               — Drizzle schema
sql/migrations/     — SQL migrations (001–061) canonical
```

---


## Akun Admin Default (Dev)

Gunakan di halaman `/login` atau `/admin/login`:

| Field | Value |
|-------|-------|
| Email | `superadmin@vinstour.com` |
| Password | `Admin@Vinstour2025` |
| Role | `super_admin` |

> **Ganti password** segera setelah login pertama di `/admin/users`.

---

## Environment Variables (Replit Secrets)

| Secret | Keterangan | Wajib? |
|--------|-----------|--------|
| `DATABASE_URL` | Neon PostgreSQL connection string | ✅ Sudah ada |
| `APP_JWT_SECRET` | Secret untuk signing JWT token | 🔧 Set untuk production |
| `FONNTE_TOKEN` | Token WhatsApp Fonnte | Opsional |
| `MIDTRANS_SERVER_KEY` | Midtrans server key | Opsional |
| `MIDTRANS_CLIENT_KEY` | Midtrans client key | Opsional |
| `VAPID_PUBLIC_KEY` | VAPID public key untuk push notif | Opsional |
| `VAPID_PRIVATE_KEY` | VAPID private key | Opsional |
| `GEMINI_API_KEY` | Google Gemini AI | Opsional |
| `SMTP_HOST` | SMTP server email | Opsional |
| `SMTP_USER` | SMTP username | Opsional |
| `SMTP_PASS` | SMTP password | Opsional |

---

## Migrasi Supabase → Neon (Selesai)

- ✅ Database schema di-apply otomatis saat startup via `runMigrations.ts`
- ✅ Auth (`/auth/v1/*`) diimplementasi di Express dengan bcrypt + JWT
- ✅ REST (`/rest/v1/*`) diimplementasi di Express via PostgREST-compatible proxy
- ✅ Supabase JS client di frontend diarahkan ke proxy lokal (localOrigin fallback)
- ✅ Secrets sensitif (Midtrans, WA, VAPID, Gemini) di backend saja

---

## User Preferences


### Demo Mode
App runs in demo mode when Supabase is not configured (no VITE_SUPABASE_URL). All data comes from mock/empty states.


- File rencana tunggal: `rencana.md` — jangan buat file rencana/catatan lain
- Tailwind v3 via PostCSS — jangan gunakan `@tailwindcss/vite`
- Semua tabel baru wajib RLS + policy per role (didefinisikan di SQL migration)
- Notifikasi admin: tambah listener di `useAdminNotifications.ts`, jangan buat channel baru

---

## Gotchas

- Jalankan `pnpm run typecheck:libs` dahulu sebelum typecheck api-server
- Frontend pakai Tailwind CSS v3 (PostCSS plugin), bukan Tailwind v4 — jangan gunakan `@tailwindcss/vite`
- Aset Kantor admin: `/admin/office-assets` (bukan `/operational/assets`)
- Quick Menu Grid "Portal Jamaah" → `/jamaah-info`
- RLS policy `authenticated` role tidak berlaku di Neon (tidak ada Supabase auth) — akses dikontrol di Express middleware
- Supabase JOIN syntax (`?select=*,profiles(*)`) di-support terbatas — proxy mengembalikan `*` untuk query dengan join

