# v0_missing_tables — Tabel yang Tidak Ada di Migration Manapun

## ⚠️ Konteks Penting

File-file di folder ini adalah **tabel yang ditemukan hilang** saat audit mendalam (Juni 2025).
Tabel-tabel ini **direferensikan** di trigger, RLS policy, FK constraint, dan RPC function
di seluruh 74 file migration yang ada — tetapi tidak pernah punya `CREATE TABLE` sendiri.

**Penyebab:** Tabel-tabel ini kemungkinan dibuat langsung via **Supabase Dashboard**
(bukan via migration file) sehingga tidak pernah tercatat di codebase.

## Urutan Eksekusi

File harus dijalankan **setelah** `v1_foundation/fase0_foundation.sql` (karena
perlu `profiles`, `customers`, `bookings`, `departures`, dll sudah ada), tapi
**sebelum** `v2_sprint_phases/`, `v3_numbered_features/`, dan `v4_patches/`.

```
v1_foundation/fase0_foundation.sql           ← jalankan dulu
v0_missing_tables/001_core_business_tables.sql
v0_missing_tables/002_documents_and_access.sql
v0_missing_tables/003_catalog_tables.sql
v0_missing_tables/004_operational_tables.sql
v2_sprint_phases/fase16_new_tables.sql       ← baru lanjut ke sini
...
```

## Isi File

### 001_core_business_tables.sql
| Tabel | Deskripsi | Direferensikan Di |
|---|---|---|
| `airlines` | Katalog maskapai penerbangan | `departures` (FK), `manifests` |
| `payments` | Rekaman pembayaran booking jamaah | fase23, fase24, fase25, v4_patches trigger |
| `departure_hotels` | Assignment hotel per keberangkatan | 066b, delete_departure_safely |
| `loyalty_points` | Poin & tier loyalitas pelanggan | jamaah_badges trigger, apply_tier_discount |
| `agent_commissions` | Rekaman komisi agen per booking | v4_patches/20260511000842 trigger |

### 002_documents_and_access.sql
| Tabel | Deskripsi | Direferensikan Di |
|---|---|---|
| `customer_documents` | Dokumen jamaah (paspor, KTP, visa, dll) | fase27 RLS, jamaah_badges trigger |
| `referral_codes` | Kode referral agen/pengguna | patches/20260511040151, patches/20260511033505 |
| `referral_usages` | Riwayat penggunaan kode referral | patches/20260511040151 |
| `ticket_responses` | Balasan dalam tiket support | patches/20260511040151 |
| `audit_logs` | Log audit aktivitas sistem | patches/20260511033505 |
| `user_permissions` | Override permission per-user | setup/20260513121035 (Supabase Realtime) |

### 003_catalog_tables.sql
| Tabel | Deskripsi | Direferensikan Di |
|---|---|---|
| `package_types` | Jenis paket (Economy/Standard/VIP/VVIP) | `package_type_equipment` FK, `package_hpp_templates` |
| `equipment_items` | Katalog item perlengkapan ibadah | `equipment_distributions` FK, `package_type_equipment` FK |
| `theme_presets` | Preset tema visual website | v4_patches/20260511053018 ALTER TABLE |

### 004_operational_tables.sql
| Tabel | Deskripsi | Direferensikan Di |
|---|---|---|
| `bus_assignments` | Penugasan bus jamaah | delete_departure_safely |
| `itineraries` | Jadwal perjalanan harian | delete_departure_safely |
| `manifests` | Manifest penerbangan | delete_departure_safely |
| `luggage` | Tracking bagasi jamaah | delete_departure_safely |
| `vendor_costs` | Biaya vendor per keberangkatan | delete_departure_safely |
| `jamaah_live_locations` | GPS tracking jamaah di lapangan | delete_departure_safely |
| `room_assignment_audit` | Audit trail perubahan kamar | delete_departure_safely |
| `savings_payments` | Setoran tabungan haji/umroh | v4_patches trigger (tr_apply_payment_to_schedule) |

## Catatan Skema

- Semua tabel menggunakan `uuid_generate_v4()` untuk PK — butuh ekstensi `uuid-ossp`
- Semua tabel punya RLS policy — **hanya untuk Supabase** (gunakan app-level auth di Neon)
- `payments.transaction_id` dan `payments.payment_type` sudah di-include dalam CREATE TABLE
  (tidak perlu jalankan fase23 ALTER TABLE untuk tabel baru)
- `theme_presets` sudah include semua kolom yang ditambahkan oleh `v4_patches/20260511053018`
  (tidak perlu jalankan ALTER TABLE lagi jika pakai file ini)
- `equipment_items` adalah katalog item; `equipment` (di fase16) adalah inventaris fisik stok

## Seed Data Included

| Tabel | Jumlah Seed |
|---|---|
| `package_types` | 4 rows (economy, standard, vip, vvip) |
| `equipment_items` | 12 rows (koper, buku, pakaian, aksesoris) |
| `theme_presets` | 7 rows (default blue, emerald, royal, golden, midnight, rose, slate) |
