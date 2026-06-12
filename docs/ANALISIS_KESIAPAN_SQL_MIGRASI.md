# Analisis Kesiapan SQL untuk Migrasi ke Neon Postgres (Replit)
> Dibuat: 12 Juni 2026 | Reviewer: Agent Analisis

---

## Ringkasan Eksekutif

Proyek Vinstour Travel Portal memiliki **tiga lapisan file SQL** yang harus sinkron:

| Lapisan | Lokasi | Jumlah File | Tujuan |
|---------|--------|-------------|--------|
| **Supabase migrations** | `supabase/migrations/` | 60+ fase file | Riwayat migrasi Supabase asli |
| **Master konsolidasi** | `sql/migrations/` + `sql/MASTER_FRESH_INSTALL.sql` | 85 file + 1 master | Fresh install gabungan (7.483 baris) |
| **API Server migrations** | `artifacts/api-server/src/sql/` | 41 file | Migrasi runtime Express/Neon |

**Status keseluruhan: ⚠️ SIAP DENGAN PERBAIKAN WAJIB** — Ada 1 isu kritis dan 4 isu tinggi yang harus diselesaikan sebelum deployment.

---

## TEMUAN KRITIS 🔴

### KRITIS-1: `01_schema.sql` TIDAK ADA di `src/sql/`

**File**: `artifacts/api-server/src/sql/01_schema.sql`  
**Status**: ❌ FILE HILANG

**Penjelasan:**  
`runMigrations.ts` memanggil `sqlPath("01_schema.sql")` sebagai **Step 1** — ini adalah seluruh skema inti (30+ tabel, indexes, triggers, seed data). File ini seharusnya berisi 7.483 baris dari `sql/MASTER_FRESH_INSTALL.sql`.

File ini hanya dibuat saat **build time** oleh `build.mjs`:
```js
// build.mjs baris ~80
await cp(rootSql, path.resolve(sqlDist, "01_schema.sql")); 
// → dist/sql/01_schema.sql ✅ (ada setelah build)
// → src/sql/01_schema.sql ❌ (tidak pernah dibuat)
```

**Dampak:**
- Server yang belum pernah di-build tidak punya `01_schema.sql` di `src/sql/`
- Saat dev mode berjalan tanpa `dist/`, schema utama tidak teraplikasikan
- Database baru akan kosong (hanya punya tabel auth bootstrap)
- Semua fitur gagal karena tabel seperti `bookings`, `packages`, `customers`, dll tidak ada

**Perbaikan Wajib:**
```bash
cp sql/MASTER_FRESH_INSTALL.sql artifacts/api-server/src/sql/01_schema.sql
```
Kemudian update `build.mjs` agar juga menyalin dari `src/sql/01_schema.sql` ke `dist/sql/01_schema.sql`.

---

## TEMUAN TINGGI 🟠

### TINGGI-1: 2 Migration Terbaru Tidak Terdaftar di `runMigrations.ts`

#### a) `20260603_add_session_version_to_profiles.sql`

**Lokasi**: `sql/migrations/20260603_add_session_version_to_profiles.sql`  
**Status**: ❌ Tidak ada di `api-server/src/sql/` dan tidak dipanggil di `runMigrations.ts`

**Isi migration:**
```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS session_version INTEGER DEFAULT 1;

CREATE OR REPLACE FUNCTION revoke_all_sessions(target_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE profiles SET session_version = session_version + 1 WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Dampak:** Kolom `session_version` tidak ada di Neon DB → fitur revoke session (logout paksa semua device) gagal diam-diam.

#### b) `passenger-type-pricing.sql`

**Lokasi**: `sql/migrations/passenger-type-pricing.sql`  
**Status**: ❌ Tidak ada di `api-server/src/sql/` dan tidak dipanggil di `runMigrations.ts`

**Isi migration (kolom penting):**
```sql
ALTER TABLE departures
  ADD COLUMN IF NOT EXISTS price_child_quad    BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_child_triple  BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_child_double  BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_child_single  BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_infant_quad   BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_infant_triple BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_infant_double BIGINT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS price_infant_single BIGINT DEFAULT NULL;

CREATE OR REPLACE VIEW v_booking_passenger_summary AS ...
```

**Dampak:** Kolom harga per-tipe-kamar (quad/triple/double/single) untuk anak & bayi tidak ada di Neon DB → kalkulasi harga multi-passenger tidak akurat.

---

### TINGGI-2: Konflik Kolom Passenger Pricing

**File terdampak:**
- `sql/migrations/passenger-type-pricing.sql` → kolom granular per kamar (`price_child_quad`, dll)
- `artifacts/api-server/src/sql/09_passenger_pricing.sql` → hanya `price_adult` + persentase

**Masalah:**
- `09_passenger_pricing.sql` **sudah terdaftar** di `runMigrations.ts` (Step 1h) dengan 3 kolom
- `passenger-type-pricing.sql` **belum terdaftar** dengan 8 kolom tambahan + 2 kolom yang sama
- Jika `09` dijalankan dulu, kolom `child_price_percent` sudah ada → migration baru aman karena `IF NOT EXISTS`
- **Tapi kolom granular `price_child_quad` dll tidak pernah dibuat**

**Risiko urutan jika keduanya ditambahkan:**
```
09_passenger_pricing.sql → menambah: price_adult, child_price_percent, infant_price_percent
passenger-type-pricing   → menambah: price_child_quad...price_infant_single, child_price_percent (DUPLICATE - safe IF NOT EXISTS)
```

---

### TINGGI-3: `08_menu_group_reorganization.sql` Ada di `src/sql/` Tapi Tidak Dipanggil

**File**: `artifacts/api-server/src/sql/08_menu_group_reorganization.sql` (305 baris)  
**Status**: ⚠️ FILE ADA tapi tidak terdaftar di `runMigrations.ts`

File ini berisi reorganisasi lengkap `menu_items` — mengubah grup menu dari struktur lama ke struktur baru (Beranda, Produk & Paket, Perlengkapan, Laporan, dll). Tanpa migration ini, tampilan sidebar admin menggunakan struktur grup yang sudah lama/salah.

**Bukti:** Pencarian di `runMigrations.ts`:
```bash
grep "08_menu" runMigrations.ts → ❌ tidak ditemukan
```

---

### TINGGI-4: 286 Referensi `auth.uid()` di Schema Utama

**File**: `sql/MASTER_FRESH_INSTALL.sql` (akan menjadi `01_schema.sql`)

```
286 × auth.uid() / auth.role() / auth.jwt()
407 × CREATE POLICY / ENABLE ROW LEVEL SECURITY
 62 × REFERENCES auth.users
```

**Status:** ⚠️ DITANGANI TAPI FRAGIL

Saat ini ditangani oleh `00_auth_bootstrap.sql` yang menciptakan:
- Schema `auth` dan tabel `auth.users`
- Fungsi stub: `auth.uid()`, `auth.role()`, `auth.jwt()`, `auth.email()`
- Role PostgreSQL: `authenticated`, `anon`

RLS policy **terdefinisi di DB** tapi **tidak di-enforce** karena query dilakukan server-side (Express middleware yang enforce auth). Ini membuat **RLS menjadi dekoratif** di lingkungan Neon.

**Risiko:** Jika `00_auth_bootstrap` gagal/terlewat, seluruh schema gagal karena `auth.uid()` tidak terdefinisi.

---

## TEMUAN MEDIUM 🟡

### MEDIUM-1: Urutan Eksekusi Tidak Sesuai Label di `runMigrations.ts`

Label komentar di source berbeda dengan urutan eksekusi aktual:

```
Komentar    Step    File SQL                      Urutan Actual
─────────   ──────  ────────────────────────────  ──────────────
Step 1a   → ✅     00_auth_bootstrap              1
Step 1b   → ✅     01_schema                      2  
Step 1c   → ✅     02_missing_tables              3
Step 1f   → ⚠️     06_app_settings_compat         4  ← dieksekusi sebelum 1d & 1e
Step 1d   → ⚠️     04_gallery_media_type          5  ← seharusnya sebelum 1f
Step 1e   → ⚠️     05_equipment_migrations        6  ← seharusnya sebelum 1f
```

`04_gallery_media_type` menambah kolom `media_type` ke `media_gallery` — tidak bergantung pada `06_app_settings_compat`, jadi tidak menimbulkan error saat ini. Tapi inkonsistensi label membingungkan saat debugging.

---

### MEDIUM-2: Duplikasi Nama File di `sql/migrations/`

| File | Lokasi |
|------|--------|
| `062_agent_status_branch_staff.sql` | `sql/migrations/` **DAN** `api-server/src/sql/` |
| `062_equipment_size_and_return.sql` | Hanya `sql/migrations/` (di-cover oleh `05_equipment_and_recent_migrations.sql`) |

Dua file berbeda dengan prefix `062_` di folder yang sama menyebabkan kebingungan tentang urutan dan cakupan.

---

### MEDIUM-3: RLS Aktif di Neon Tapi Tidak Di-enforce

39 `CREATE POLICY` dan 25 `GRANT TO authenticated` ada di file sql api-server. Ini menambah overhead DB (PostgreSQL tetap evaluasi policy per-row meski server bypass RLS karena tidak `SET ROLE`). 

Di Neon/PostgreSQL standar, koneksi dari aplikasi berjalan sebagai superuser/owner, sehingga RLS **tidak aktif secara otomatis**. Policy hanya aktif jika koneksi eksplisit `SET LOCAL ROLE = authenticated`.

---

## TEMUAN RENDAH 🟢

### RENDAH-1: Komentar Header Outdated

`sql/MASTER_FRESH_INSTALL.sql` baris 1-5:
```sql
-- Jalankan file ini SATU KALI di Supabase SQL Editor untuk fresh database.
```
Sudah tidak akurat — file ini dijalankan via Express/Neon, bukan Supabase SQL Editor.

### RENDAH-2: 60 File `sql/migrations/` Tidak Terindividual di `runMigrations.ts`

60 file migrations pertama (001–068) dikonsolidasi ke `MASTER_FRESH_INSTALL.sql` → `01_schema.sql`. Ini by design, tapi:
- Sulit debug jika satu bagian schema gagal
- Pesan error hanya menyebut "01_schema" bukan file spesifik

### RENDAH-3: File `08_menu_group_reorganization.sql` Ambigu

Apakah ini pengganti atau tambahan dari menu yang ada di `MASTER_FRESH_INSTALL.sql`? Perlu klarifikasi.

---

## PETA RISIKO

```
KRITIS-1     ████████████████████  01_schema.sql hilang → DB kosong
TINGGI-1a    ████████████████      session_version tidak ada → revoke session gagal  
TINGGI-1b    ████████████████      price_child_quad dll tidak ada → pricing salah
TINGGI-2     ████████████          konflik kolom passenger pricing
TINGGI-3     ████████████          menu tidak terorganisir
TINGGI-4     ████████              auth.uid() fragil tapi ditangani
MEDIUM-1     ████████              urutan eksekusi tidak konsisten
MEDIUM-2     ████                  duplikasi nama file membingungkan
MEDIUM-3     ████                  RLS tidak di-enforce (informational)
RENDAH-*     ██                    komentar/dokumentasi outdated
```

---

## RENCANA PERBAIKAN

### Prioritas 1 — WAJIB sebelum server bisa berjalan

| # | Aksi | File Target | Estimasi |
|---|------|-------------|----------|
| P1.1 | Copy `sql/MASTER_FRESH_INSTALL.sql` → `artifacts/api-server/src/sql/01_schema.sql` | `src/sql/01_schema.sql` (baru) | 5 menit |
| P1.2 | Perbarui `build.mjs` agar copy dari `src/sql/01_schema.sql` ke `dist/sql/01_schema.sql` (bukan dari root) | `build.mjs` | 10 menit |

### Prioritas 2 — WAJIB sebelum fitur berfungsi penuh

| # | Aksi | File Target | Estimasi |
|---|------|-------------|----------|
| P2.1 | Buat `artifacts/api-server/src/sql/87_session_version_profiles.sql` | File baru | 5 menit |
| P2.2 | Registrasi `87_session_version_profiles` di `runMigrations.ts` | `runMigrations.ts` | 5 menit |
| P2.3 | Buat `artifacts/api-server/src/sql/88_passenger_per_room_pricing.sql` | File baru | 10 menit |
| P2.4 | Registrasi `88_passenger_per_room_pricing` di `runMigrations.ts` | `runMigrations.ts` | 5 menit |
| P2.5 | Registrasi `08_menu_group_reorganization.sql` di `runMigrations.ts` | `runMigrations.ts` | 5 menit |

### Prioritas 3 — DISARANKAN untuk kebersihan kode

| # | Aksi | File Target | Estimasi |
|---|------|-------------|----------|
| P3.1 | Perbaiki urutan dan label komentar Step di `runMigrations.ts` | `runMigrations.ts` | 15 menit |
| P3.2 | Update header komentar `MASTER_FRESH_INSTALL.sql` | `MASTER_FRESH_INSTALL.sql` | 2 menit |
| P3.3 | Tambah README di `artifacts/api-server/src/sql/` tentang konvensi penamaan | `src/sql/README.md` (baru) | 10 menit |

### Prioritas 4 — INFORMATIONAL (tidak perlu segera)

| # | Aksi | Catatan |
|---|------|---------|
| P4.1 | Pertimbangkan mengaktifkan RLS di Neon dengan `SET ROLE` pada setiap query | Perlu refactor besar di `supabaseProxy.ts` |
| P4.2 | Rename `062_agent_status_branch_staff.sql` di `sql/migrations/` → `062a_...` | Untuk menghindari ambiguitas |

---

## CHECKLIST PELAKSANAAN

```
[ ] P1.1 — Salin MASTER_FRESH_INSTALL.sql ke src/sql/01_schema.sql
[ ] P1.2 — Update build.mjs (sumber copy 01_schema.sql)
[ ] P2.1 — Buat 87_session_version_profiles.sql
[ ] P2.2 — Daftarkan di runMigrations.ts
[ ] P2.3 — Buat 88_passenger_per_room_pricing.sql
[ ] P2.4 — Daftarkan di runMigrations.ts
[ ] P2.5 — Daftarkan 08_menu_group_reorganization.sql di runMigrations.ts
[ ] P3.1 — Perbaiki urutan label Step di runMigrations.ts
[ ] P3.2 — Update header MASTER_FRESH_INSTALL.sql
[ ] P3.3 — Buat README di src/sql/
```

---

## DIAGRAM ALUR MIGRASI SETELAH PERBAIKAN

```
Server Start
    │
    ▼
00_auth_bootstrap     ← auth schema + stub functions + _schema_migrations tracker
    │
    ▼
01_schema             ← MASTER_FRESH_INSTALL (30+ tabel, indexes, triggers, seed)
    │
    ▼
02 → 06               ← Tambalan tabel/kolom yang hilang + compat fixes
    │
    ▼
07 → 41               ← Feature migrations (equipment, menu, SDM, WA, accounting)
    │
    ▼
062 → 086             ← Sprint migrations (tour guide, store, keuangan, dll)
    │
    ▼
87_session_version    ← [BARU] session_version + revoke_all_sessions()
    │
    ▼  
88_passenger_pricing  ← [BARU] price_child_quad + price_infant_* per room type
    │
    ▼
✅ DB Siap
```

---

*Dokumen ini dibuat berdasarkan analisis statis 41 file SQL di `artifacts/api-server/src/sql/`, 85 file di `sql/migrations/`, dan 1.183 baris `runMigrations.ts`.*
