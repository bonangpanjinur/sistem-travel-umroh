---
name: Supabase proxy migration
description: How Supabase was replaced with a local Express proxy backed by Replit Postgres — architecture, gotchas, and what still needs secrets.
---

## Architecture

- `artifacts/api-server/src/routes/supabaseProxy.ts` — PostgREST-compatible router mounted at root of Express (not under /api). Implements `/auth/v1/*` (token, signup, logout, user GET/PUT) and `/rest/v1/:table` (GET/POST/PATCH/DELETE) against Neon/Replit Postgres.
- `artifacts/umrah-haji/vite.config.ts` — Vite dev-server proxies `/auth/v1` and `/rest/v1` → `http://localhost:8080`. Frontend Supabase JS client hits these transparently.
- `artifacts/umrah-haji/src/integrations/supabase/client.ts` — resolves URL to `window.location.origin` when `VITE_SUPABASE_URL` env var is absent, so the proxy is used automatically in Replit without any env configuration.

## Gotchas

- Express 5 + path-to-regexp v8: wildcard `*` and `(.*)` are NOT valid route patterns. Use named params only (`/:table`). The OPTIONS handler had to be removed; global `cors()` middleware covers preflights instead.
- Missing tables return 400 from the DB → proxy now catches `does not exist` / code `42P01` and returns `[]` so the frontend handles it gracefully.
- `--env-file=../../.env` in the API start command: if the file doesn't exist the flag is silently ignored and the system environment (Replit's process.env, which includes `DATABASE_URL` pointing to Helium/Replit DB) is used — this is correct behavior, not an error.
- JWT token: the proxy issues HS256 JWTs signed with `APP_JWT_SECRET` env var (falls back to a hardcoded default for dev). Set `APP_JWT_SECRET` in Replit Secrets for production.

## External integrations still needing secrets (graceful 503 when missing)

- `MIDTRANS_SERVER_KEY` + `MIDTRANS_CLIENT_KEY` — payment gateway
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` — transactional email
- `GEMINI_API_KEY` or `OPENAI_API_KEY` — AI chatbot
- `APP_JWT_SECRET` — JWT signing (critical for security)

**Why:** These are optional for the app to load and render, but required for those features to work. Each route checks for the key and returns a helpful 503 if missing.

## Database

Uses Replit's built-in Postgres (Helium) via `DATABASE_URL` from the environment. Schema auto-provisioned on boot via `runMigrations.ts` (4 SQL migration files + payment sync trigger + booking totals backfill).
