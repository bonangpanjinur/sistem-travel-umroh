---
name: SQL migration file placement
description: Where to place SQL migration files so runMigrations.ts can find them at runtime
---

# SQL migration file placement

The migration runner (`artifacts/api-server/src/lib/runMigrations.ts`) uses `sqlPath()` which resolves to `dist/sql/`. During build, `build.mjs` copies `artifacts/api-server/src/sql/` → `dist/sql/`.

New SQL migration files must be placed in **both**:
1. `sql/migrations/<NNN>_name.sql` — canonical archive (source of truth)
2. `artifacts/api-server/src/sql/<NNN>_name.sql` — so build.mjs copies it to `dist/sql/`

**Why:** `build.mjs` only copies `artifacts/api-server/src/sql/`, not the root `sql/migrations/` directory. Files only in `sql/migrations/` will cause `ENOENT` errors at runtime.

**How to apply:** After adding a migration SQL to root `sql/migrations/`, always `cp` it to `artifacts/api-server/src/sql/` with the same filename, then register in `runMigrations.ts` step list.
