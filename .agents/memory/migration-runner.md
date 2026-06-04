---
name: Migration Runner Pattern
description: Cara kerja runMigrations.ts dan bagaimana menambah migration baru di API server.
---

## Pattern

Migration runner (`artifacts/api-server/src/lib/runMigrations.ts`) TIDAK auto-discover file dari folder. Setiap migration harus:
1. SQL file ditaruh di `artifacts/api-server/src/sql/<NN>_name.sql`
2. Step eksplisit ditambah di `runMigrations.ts` dengan pola:
   ```typescript
   const applied = await isApplied(client, "NN_name");
   if (!applied) {
     await runSqlFile(client, sqlPath("NN_name.sql"), "description");
     await markApplied(client, "NN_name");
   } else { logger.info("... already applied, skipping"); }
   ```

**Why:** Build script meng-copy `src/sql/` ke `dist/sql/` pada build time. File di `supabase/migrations/` adalah dokumentasi/referensi saja, tidak auto-diapply.

## File SQL yang ada (per session)
- `00` auth bootstrap, `01` full schema, `02-04` missing tables/columns
- `05-06` equipment, `07` profitabilitas menu, `08` menu reorganization (belum ada step!)
- `09` passenger pricing (ditambah)

## Gotcha
- `supabase/migrations/` → referensi dokumentasi saja
- `artifacts/api-server/src/sql/` → yang actual dijalankan
- Jalankan migration dengan restart "Start API server" workflow
