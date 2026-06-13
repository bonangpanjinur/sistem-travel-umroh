# Vinstour Travel — Umroh & Haji Management Portal

Sistem manajemen perjalanan umroh & haji lengkap untuk Vinstour Travel. Mencakup booking jamaah, panel admin, komisi agen, tracking operasional, dan portal publik.

> **Rencana lengkap, status semua halaman, dan catatan teknis ada di [`rencana.md`](./rencana.md)**

---

## Cara Menjalankan

```bash
# Frontend (port 5000) — via Replit workflow "Start application"
pnpm --filter @workspace/umrah-haji run dev

# API Server (port 3001) — via Replit workflow "Start API server"
pnpm --filter @workspace/api-server run dev

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
- **Database**: Replit PostgreSQL — `DATABASE_URL` set automatically by Replit
- **Auth**: JWT custom (bcrypt password hash, auth.users + profiles + user_roles tables)
- **Supabase Compatibility**: `supabaseProxy.ts` implements PostgREST `/rest/v1/*` dan `/auth/v1/*`
- **Build**: esbuild (API server), Vite (frontend)

---

## Where things live

```
artifacts/umrah-haji/src/
├── pages/admin/           # Admin panel pages
├── pages/jamaah/          # Jamaah portal pages
├── components/            # Shared UI components
├── hooks/                 # React hooks (useAuth, etc.)
└── integrations/supabase/ # Supabase-compatible client (proxied to Express)

artifacts/api-server/src/
├── routes/                # Express API routes
│   ├── supabaseProxy.ts   # PostgREST-compatible /rest/v1/* and /auth/v1/* proxy
│   ├── functions.ts       # Ported Supabase Edge Functions
│   └── v1/                # API v1 routes (chatbot, payments, whatsapp, etc.)
├── lib/
│   ├── auth.ts            # JWT signing/verification, bcrypt
│   ├── db.ts              # Drizzle ORM + pg Pool
│   └── runMigrations.ts   # Auto-applies SQL migrations on startup
└── sql/                   # SQL migration files (001–095+)

lib/
  db/          — Drizzle schema
  api-zod/     — Zod validation schemas
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

| Secret | Keterangan | Status |
|--------|-----------|--------|
| `DATABASE_URL` | Replit PostgreSQL connection string | ✅ Auto-provisioned |
| `APP_JWT_SECRET` | Secret untuk signing JWT token | ✅ Set |
| `FONNTE_TOKEN` | Token WhatsApp Fonnte | Opsional |
| `MIDTRANS_SERVER_KEY` | Midtrans server key | Opsional |
| `MIDTRANS_CLIENT_KEY` | Midtrans client key | Opsional |
| `XENDIT_SECRET_KEY` | Xendit payment key | Opsional |
| `VAPID_PUBLIC_KEY` | VAPID public key untuk push notif | Opsional |
| `VAPID_PRIVATE_KEY` | VAPID private key | Opsional |
| `GEMINI_API_KEY` | Google Gemini AI untuk chatbot | Opsional |
| `OPENAI_API_KEY` | OpenAI untuk chatbot fallback | Opsional |
| `SMTP_HOST` | SMTP server email | Opsional |
| `SMTP_USER` | SMTP username | Opsional |
| `SMTP_PASS` | SMTP password | Opsional |

---

## Arsitektur Auth

- Frontend menggunakan `@supabase/supabase-js` client yang **diarahkan ke Express lokal** (`window.location.origin`)
- Express mengimplementasi `/auth/v1/token`, `/auth/v1/signup`, `/auth/v1/user` secara penuh
- JWT ditandatangani dengan `APP_JWT_SECRET`, berlaku 7 hari
- Password di-hash dengan bcrypt (10 rounds)
- Tidak ada koneksi ke Supabase cloud — semua data di Replit PostgreSQL

---

## Gotchas

- Jalankan `pnpm run typecheck:libs` dahulu sebelum typecheck api-server
- Frontend pakai Tailwind CSS v3 (PostCSS plugin), bukan Tailwind v4 — jangan gunakan `@tailwindcss/vite`
- RLS policy `authenticated` role tidak berlaku di Neon/Replit PostgreSQL — akses dikontrol di Express middleware
- Supabase JOIN syntax (`?select=*,profiles(*)`) di-support terbatas di proxy
- `room_assignments` + `room_occupants` = hotel room system; `booking_passengers.room_number` = pairing system — dua sistem terpisah

## User Preferences

- Language: Bahasa Indonesia throughout UI
- Dates: Indonesian locale (date-fns `id`)
- Currency: IDR formatted with `formatCurrency()`
- File rencana tunggal: `rencana.md` — jangan buat file rencana/catatan lain
- Tailwind v3 via PostCSS — jangan gunakan `@tailwindcss/vite`
- Semua tabel baru wajib RLS + policy per role (didefinisikan di SQL migration)
- Notifikasi admin: tambah listener di `useAdminNotifications.ts`, jangan buat channel baru
