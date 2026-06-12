# SQL Migrations — API Server (Neon Postgres / Replit)

Folder ini berisi semua file SQL yang dijalankan oleh `runMigrations.ts` saat server pertama kali start.

## Arsitektur Migrasi

```
runMigrations.ts (dijalankan sekali saat server start)
│
├── 00_auth_bootstrap.sql   ← WAJIB PERTAMA: auth schema, stub functions, _schema_migrations tracker
├── 01_schema.sql           ← Skema utama (7.483 baris, konsolidasi seluruh 001–068 fase)
├── 02_missing_tables.sql   ← Tabel tambahan yang belum ada di 01_schema
├── 03_bookings_columns.sql ← Kolom tambahan bookings
├── 04_gallery_media_type.sql
├── 05_equipment_*.sql      ← Equipment + hotel room functions
├── 06_*.sql                ← App settings + equipment schema
├── 07_*.sql                ← Trip timeline + profitabilitas
├── 08_menu_group_reorganization.sql  ← Reorganisasi menu_items (step 089)
├── 09_passenger_pricing.sql
├── 10–41_*.sql             ← Feature migrations (cancellation, SEO, WA, SDM, accounting, dll)
├── 062–086_*.sql           ← Sprint migrations (agent, push, guide, store, keuangan)
├── 87_session_version_profiles.sql   ← session_version + revoke_all_sessions()
├── 88_passenger_per_room_pricing.sql ← price_child/infant per room type + view
```

## Konvensi Penamaan

| Prefix | Keterangan |
|--------|------------|
| `00_`  | Bootstrap (dijalankan PERTAMA, sebelum tracker terbentuk) |
| `01_`  | Schema utama (sumber: `sql/MASTER_FRESH_INSTALL.sql`) |
| `02-09_` | Tabel/kolom tambahan awal |
| `10-41_` | Feature migrations dari supabase/migrations/ fase 10–32 |
| `062-089_` | Sprint migrations terbaru |
| `87-89_` | Migration terbaru yang belum masuk MASTER_FRESH_INSTALL |

## Cara Menambah Migration Baru

1. Buat file `artifacts/api-server/src/sql/NNN_nama_migration.sql`
   - Pastikan semua statement menggunakan `IF NOT EXISTS` / `OR REPLACE` (idempotent)
   - Akhiri dengan `SELECT 'NNN_nama_migration complete' AS result;`

2. Daftarkan di `artifacts/api-server/src/lib/runMigrations.ts`:
```typescript
const migrationNNNApplied = await isApplied(client, "NNN_nama_migration");
if (!migrationNNNApplied) {
  try {
    await runSqlFile(client, sqlPath("NNN_nama_migration.sql"), "NNN_nama_migration (deskripsi singkat)");
    await markApplied(client, "NNN_nama_migration");
  } catch (e: any) {
    logger.warn({ err: e?.message }, "runMigrations: NNN_nama_migration — skipping (non-fatal)");
  }
} else {
  logger.info("runMigrations: NNN_nama_migration — already applied, skipping");
}
```

## Catatan Penting

- `01_schema.sql` adalah sumber tunggal kebenaran untuk skema inti. Update file ini jika ada perubahan schema yang bersifat fondasi.
- Jangan edit `_schema_migrations` secara manual di DB production kecuali benar-benar darurat.
- File `MASTER_FRESH_INSTALL.sql` di root `sql/` adalah sumber untuk `01_schema.sql` — sinkronkan keduanya jika ada perubahan struktur tabel inti.
- RLS policies di SQL ini **terdefinisi di DB** tetapi **tidak di-enforce** untuk koneksi server-side (enforcement dilakukan oleh Express middleware di `auth.ts`).
