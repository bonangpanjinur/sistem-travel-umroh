# v2 Master Migration — Vinstour Travel Portal

## Tentang Folder Ini

Folder `supabase_clean_migration/` berisi dua set file:

| Set | Prefix | Keterangan |
|-----|--------|-----------|
| **Legacy** | `00_` – `11_` | Schema awal (Supabase-era, referensi saja) |
| **v2 Current** | `v2_P01` – `v2_P12` | **Schema ideal terkini** ← jalankan ini |

## Cara Menjalankan v2

Jalankan file dalam urutan numerik P01 → P12. Semua file idempotent (aman dijalankan ulang).

```sql
-- Di Neon SQL Editor / psql
\i v2_P01_alter_core_tables.sql
\i v2_P02_travel_lookup.sql
\i v2_P03_packages_departures.sql
\i v2_P04_customers.sql
\i v2_P05_bookings_payments.sql
\i v2_P06_finance_accounting.sql
\i v2_P07_hr_sdm.sql
\i v2_P08_equipment_rooms.sql
\i v2_P09_savings_portal_guide.sql
\i v2_P10_wa_crm_docs.sql
\i v2_P11_store_marketing_loyalty.sql
\i v2_P12_views_indexes_fixes.sql  -- ← jalankan terakhir
```

Atau via `psql` sekaligus:
```bash
for f in supabase_clean_migration/v2_P*.sql; do
  echo "=== Running $f ==="
  psql "$DATABASE_URL" -f "$f"
done
```

## Apa yang Dilakukan Setiap File

| File | Modul | Tipe Operasi |
|------|-------|-------------|
| `v2_P01` | Auth & Organisasi | `ALTER TABLE` profiles, branches, agents, employees, muthawifs |
| `v2_P02` | Travel Lookup | `CREATE TABLE` airports (baru), extend airlines/hotels, agent tier config |
| `v2_P03` | Paket & Keberangkatan | `ALTER TABLE` packages + departures (13 kolom baru), create departure_muthawifs |
| `v2_P04` | Pelanggan | `ALTER TABLE` customers (15 kolom baru), create visa_applications |
| `v2_P05` | Booking & Pembayaran | `ALTER TABLE` bookings (12 kolom baru), fix passenger_type CHECK, create virtual_accounts |
| `v2_P06` | Keuangan & Akuntansi | `CREATE TABLE` COA, departure_cost_items, journal_entries, **cash_transactions** |
| `v2_P07` | SDM / HR | `CREATE TABLE` payroll, leave, disciplinary, career, attendance |
| `v2_P08` | Perlengkapan & Kamar | `CREATE TABLE` equipment_items, room_assignments, hotel_contracts |
| `v2_P09` | Tabungan & Portal Jamaah | `CREATE TABLE` savings, guide system, ibadah, SOS alerts |
| `v2_P10` | WA & Dokumen | `CREATE TABLE` WhatsApp tables, notifications, leads, documents |
| `v2_P11` | Store & Loyalty | `CREATE TABLE` store, coupons, **loyalty_rewards**, **agent_wallets**, **QR codes**, **referral** |
| `v2_P12` | Views & Index | `CREATE VIEW` alias, global indexes, bug-fix triggers — **jalankan terakhir** |

## Prinsip Keamanan

- ✅ Semua `ALTER TABLE` pakai `ADD COLUMN IF NOT EXISTS`
- ✅ Semua `CREATE TABLE` pakai `IF NOT EXISTS`
- ✅ Semua `CREATE INDEX` pakai `IF NOT EXISTS`
- ✅ Semua policy didahului `DROP POLICY IF EXISTS`
- ✅ Semua trigger dibungkus `DO $$ BEGIN IF NOT EXISTS ... END $$`
- ❌ Tidak ada `DROP TABLE`, `TRUNCATE`, atau `DELETE`
- ❌ Tidak ada `ALTER TABLE ... DROP COLUMN`

## Tabel Baru (tidak ada sebelumnya)

| Tabel | File | Keterangan |
|-------|------|-----------|
| `airports` | P02 | Bandara Indonesia + Arab Saudi |
| `cash_transactions` | P06 | Transaksi kas harian |
| `loyalty_rewards` | P11 | Program poin jamaah |
| `loyalty_transactions` | P11 | Log poin loyalty |
| `agent_wallets` | P11 | Saldo komisi agen |
| `agent_wallet_transactions` | P11 | Log transaksi wallet |
| `jamaah_qr_codes` | P11 | QR identity / check-in |
| `referral_codes` | P11 | Kode referral |
| `referral_usages` | P11 | Log penggunaan referral |

## View Aliases (P12)

| View | Mengarah ke | Bug yang Diperbaiki |
|------|------------|---------------------|
| `savings_payments` | `savings_deposits` | BUG-03 |
| `attendance_records` | `attendance` | BUG-05 |
| `audit_logs` | `document_audit_logs` + `dashboard_access_audit_log` | BUG-08 |

## Bug yang Diperbaiki

| ID | Masalah | Solusi |
|----|---------|--------|
| BUG-02 | Departures tanpa hotel/airport FK | ALTER TABLE departures (P03) |
| BUG-03 | `savings_payments` tidak ada | View alias (P12) |
| BUG-05 | `attendance_records` tidak ada | View alias (P12) |
| BUG-06 | Bookings tanpa branch_id/sales_id | ALTER TABLE bookings (P05) |
| BUG-08 | `audit_logs` tidak ada | View alias (P12) |
| BUG-10 | `cash_transactions` tidak ada | CREATE TABLE (P06) |
| BUG-14 | passenger_type CHECK tidak terima English | ALTER CONSTRAINT (P05) |

## Referensi

- Analisis lengkap §17–§24 ada di `rencanasql.md`
- Schema sumber aktual: `artifacts/api-server/dist/sql/01_schema.sql`
- Numbered migrations: `artifacts/api-server/dist/sql/001_*.sql` s.d. `095_*.sql`
