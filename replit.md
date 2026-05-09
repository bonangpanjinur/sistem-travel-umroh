# Vinstour Travel — Umroh & Haji Management Portal

Sistem manajemen perjalanan umroh & haji lengkap untuk Vinstour Travel. Mencakup booking jamaah, panel admin, komisi agen, tracking operasional, dan portal publik.

> **Rencana lengkap, status semua halaman, dan catatan teknis ada di [`RENCANA.md`](./RENCANA.md)**

---

## Cara Menjalankan

```bash
# Frontend (port 5000)
pnpm --filter @workspace/umrah-haji run dev

# API Server (port 8080)
PORT=8080 pnpm --filter @workspace/api-server run dev

# Typecheck semua paket
pnpm run typecheck

# Build library (wajib sebelum typecheck api-server)
pnpm run typecheck:libs
```

---

## Stack

- **Monorepo**: pnpm workspaces, Node.js 24, TypeScript 5.9
- **Frontend**: React 19 + Vite 7, Tailwind CSS v3, react-router-dom, @tanstack/react-query
- **Backend**: Express 5, pino logging
- **Database**: Supabase (PostgreSQL) via `@supabase/supabase-js`
- **API codegen**: Orval dari OpenAPI spec di `lib/api-spec/`
- **Build**: esbuild (API server)

---

## Struktur Direktori

```
artifacts/
  umrah-haji/src/   — Frontend React (pages, routes, hooks, components)
  api-server/src/   — Public API Express (routes/v1/)
lib/
  api-spec/         — openapi.yaml (source of truth)
  api-zod/          — Zod schemas (auto-generated)
  db/               — Drizzle schema
```

---

## Environment Variables yang Diperlukan

Lihat detail lengkap di **RENCANA.md → Bagian 3**.

| Secret | Keterangan |
|--------|-----------|
| `VITE_SUPABASE_URL` | URL project Supabase |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Anon/public key Supabase |
| `SUPABASE_URL` | URL untuk API server |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (server only) |

> App berjalan dalam **demo mode** tanpa Supabase. Auth tidak aktif, data tidak tersimpan.

---

## User Preferences

- File rencana tunggal: `RENCANA.md` — jangan buat file rencana/catatan lain
- Tailwind v3 via PostCSS — jangan gunakan `@tailwindcss/vite`
- Semua tabel Supabase baru wajib RLS + policy per role
- Notifikasi admin: tambah listener di `useAdminNotifications.ts`, jangan buat channel baru

---

## Gotchas

- Jalankan `pnpm run typecheck:libs` dahulu sebelum typecheck api-server
- Frontend pakai Tailwind CSS v3 (PostCSS plugin), bukan Tailwind v4
- Jangan gunakan `@tailwindcss/vite` plugin
- Aset Kantor admin: `/admin/office-assets` (bukan `/operational/assets`)
- Quick Menu Grid "Portal Jamaah" → `/jamaah-info`
