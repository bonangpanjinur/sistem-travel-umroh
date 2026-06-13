# Vinstour Travel Portal — Master Migration v3

Versi terbaru dan definitif dari schema database Vinstour.
Mencakup semua modul dari fase0 hingga fase32 plus fitur tambahan.

## Urutan Eksekusi

Jalankan file berikut secara berurutan di SQL Editor (Supabase / Neon / pg):

| # | File | Modul |
|---|------|-------|
| 1 | `v3_M01_foundation.sql` | Extensions, helpers, auth schema |
| 2 | `v3_M02_core_rbac.sql` | Profiles, RBAC, roles, permissions |
| 3 | `v3_M03_travel_catalog.sql` | Airlines, hotels, vendors, packages, departures |
| 4 | `v3_M04_orgs_agents.sql` | Branches, agents, muthawifs, employees |
| 5 | `v3_M05_customers_bookings.sql` | Customers, bookings, passengers, payments, leads |
| 6 | `v3_M06_operations.sql` | Notifikasi, WA config, visa, SOS, approvals, portal |
| 7 | `v3_M07_finance_hr.sql` | Keuangan, HR, payroll, accounting, company settings |
| 8 | `v3_M08_departure_financials.sql` | HPP, biaya realisasi, ringkasan keuangan keberangkatan |
| 9 | `v3_M09_ecommerce.sql` | Toko online, produk, pesanan, pengiriman, ulasan |
| 10 | `v3_M10_wa_communications.sql` | WA broadcast, kampanye, log, roadmap |
| 11 | `v3_M11_functions_rpc.sql` | Stored functions, triggers, RPCs |
| 12 | `v3_M12_seed_data.sql` | Data default & seed |

## Prinsip Keamanan

- **Tidak menghapus data**: tidak ada `DROP TABLE`, `TRUNCATE`, atau `DELETE`
- **Idempotent**: aman dijalankan berkali-kali (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `DROP POLICY IF EXISTS`)
- **ALTER TABLE aman**: semua kolom baru pakai `ADD COLUMN IF NOT EXISTS`
- **Production-safe**: setiap block DDL dibungkus error handler bila perlu

## Roles yang Tersedia

`super_admin`, `owner`, `admin`, `branch_manager`, `finance`,
`operational`, `sales`, `marketing`, `hr`, `equipment`,
`agent`, `sub_agent`, `customer`, `jamaah`, `visa_officer`, `it`

## Changelog v3 vs v2

- Konsolidasi semua fase (fase0–fase32) + migrasi bernomor (063–068)
- Tambah kolom `price_adult`, `child_price_percent`, `infant_price_percent` pada `departures` & `packages` (fase29)
- Tabel baru: `wa_broadcast_campaigns`, `wa_broadcast_logs` (fase32)
- Tabel baru: `departure_cost_items`, `departure_expenses`, `departure_other_revenues`, `departure_financial_summary` (fase28)
- Tabel baru: `hotel_room_capacities` (migrasi 065)
- Tabel baru: `package_hpp_templates` (migrasi 067)
- Kolom baru WA multiprovider di `whatsapp_config` (fase31)
- Role `it` ditambahkan ke semua policy relevan
