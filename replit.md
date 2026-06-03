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

Buat di startup — gunakan di halaman `/login`:

| Field | Value |
|-------|-------|
| Email | `admin@vinstour.com` |
| Password | `Admin@Vinstour2024!` |
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
