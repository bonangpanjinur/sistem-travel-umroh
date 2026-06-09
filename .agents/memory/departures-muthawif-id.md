---
name: departures muthawif_id column
description: Kolom muthawif_id tidak ada di departures schema awal; trigger A5 yang bergantung pada kolom ini harus dibagi ke dua migration.
---

# departures.muthawif_id — Kolom Tidak Ada di Skema Awal

## Rule
Kolom `muthawif_id UUID REFERENCES muthawifs(id)` di tabel `departures` TIDAK ada di skema awal (`01_schema.sql` / MASTER_FRESH_INSTALL.sql).
Ditambahkan lewat **migration 081** (`081_departure_muthawif_id.sql`).

**Why:** Migration 080 membuat function `fn_auto_guide_channel_on_muthawif_assign()` dan mencoba `CREATE TRIGGER ... AFTER UPDATE OF muthawif_id ON departures`, tapi gagal dengan error `column "muthawif_id" of relation "departures" does not exist`. Migration split diperlukan.

**How to apply:**
- Trigger A5 (guide channel auto-init saat muthawif assign) butuh kolom ini ada dulu.
- Selalu tambahkan `ADD COLUMN IF NOT EXISTS muthawif_id` SEBELUM membuat trigger yang reference kolom itu.
- PackageDetail.tsx menggunakan `pkg.muthawif` (dari packages table, bukan departures) untuk tampilan publik — ini field berbeda.
- Di AdminDepartureDetail, gunakan kolom `departures.muthawif_id` untuk assign muthawif ke keberangkatan spesifik.

## Status
- migration 080: function dibuat ✅, trigger gagal ❌ (kolom belum ada)
- migration 081: ADD COLUMN + trigger ✅ — 6/6 statements OK
