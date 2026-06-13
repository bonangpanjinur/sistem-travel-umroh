# setup/ — Supabase-Only Setup Files

## Purpose
Contains SQL files that are **specific to Supabase infrastructure** and will not work
on standard PostgreSQL (Neon, RDS, etc.). These configure Supabase-managed services:
Realtime subscriptions and PostgREST schema cache.

## ⚠️ Important
**Skip this folder entirely** if you are running on:
- Neon PostgreSQL
- Amazon RDS
- Any non-Supabase PostgreSQL host

These files will either **fail** or be **silently ignored** outside Supabase.

## Contents

| File | Purpose | Supabase Feature |
|---|---|---|
| `20260513121035_4ec556b0.sql` | Enables Realtime for `website_settings`, `user_permissions`, `user_roles` — so frontend receives live updates without polling | Supabase Realtime (`ALTER PUBLICATION supabase_realtime`) |
| `20260513121224_d1eabedd.sql` | Enables Realtime for `role_permissions` — live RBAC updates | Supabase Realtime (`ALTER PUBLICATION supabase_realtime`) |
| `20260513230859_41afb4ce.sql` | Creates PostgREST DDL watch event trigger (`pgrst_watch_ddl_end`, `pgrst_watch_drop`) — auto-reloads PostgREST schema cache after any DDL change | Supabase PostgREST (`NOTIFY pgrst`) |

## Usage (Supabase only)
```sql
-- Only on Supabase — run after all schema migrations:
\i setup/20260513121035_4ec556b0.sql
\i setup/20260513121224_d1eabedd.sql
\i setup/20260513230859_41afb4ce.sql
```

## Alternatives for Non-Supabase Hosts
| Supabase Feature | Neon / Standard PG Equivalent |
|---|---|
| Supabase Realtime | Use Postgres `LISTEN/NOTIFY` or a separate WebSocket service |
| PostgREST DDL watch | Not needed if using Drizzle ORM / custom API (no PostgREST) |
| `auth.uid()` in RLS | Replace with application-level access control via JWT claims |
| `auth.users` FK | Replace with your own `users` table |

## Rollback
```sql
-- Disable realtime:
ALTER PUBLICATION supabase_realtime DROP TABLE public.website_settings;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_permissions;
ALTER PUBLICATION supabase_realtime DROP TABLE public.user_roles;
ALTER PUBLICATION supabase_realtime DROP TABLE public.role_permissions;

-- Remove DDL watch triggers:
DROP EVENT TRIGGER IF EXISTS pgrst_watch_ddl_end;
DROP EVENT TRIGGER IF EXISTS pgrst_watch_drop;
DROP FUNCTION IF EXISTS public.pgrst_watch_ddl();
```
