# Gap Analysis — Vinstour Travel Portal
> Membandingkan: Codebase Aktual vs Database Lama (Supabase) vs Blueprint Baru

---

## 1. Fitur yang Ada di Codebase tapi Belum Ada Tabelnya

### A. E-Commerce / Toko Online

Codebase memiliki halaman dan permissions lengkap untuk toko online:
```
PERMISSIONS.STORE, STORE_PRODUCTS, STORE_ORDERS, STORE_CATEGORIES
STORE_SUPPLIERS, STORE_PURCHASE_ORDERS, STORE_SALES_REPORT
STORE_STOCK_MOVEMENTS, STORE_STOCK_OPNAME
```

Tapi **belum ada tabel** di migration baru:
| Tabel | Status | Prioritas |
|-------|--------|-----------|
| `store_products` | ❌ Belum ada | TINGGI |
| `store_categories` | ❌ Belum ada | TINGGI |
| `store_orders` | ❌ Belum ada | TINGGI |
| `store_order_items` | ❌ Belum ada | TINGGI |
| `store_suppliers` | ❌ Belum ada | MEDIUM |
| `store_purchase_orders` | ❌ Belum ada | MEDIUM |
| `store_stock_movements` | ❌ Belum ada | MEDIUM |
| `store_stock_opname_sessions` | ❌ Belum ada | LOW |

### B. Blog & Artikel

Permission `PERMISSIONS.BLOG` ada, halaman `/admin/blog` ada, tapi:
| Tabel | Status |
|-------|--------|
| `blog_posts` / `articles` | ❌ Belum ada |
| `blog_categories` | ❌ Belum ada |
| `blog_tags` | ❌ Belum ada |

### C. Office Assets / Aset Kantor

Permission `PERMISSIONS.OFFICE_ASSETS` dan halaman `/admin/office-assets` ada, tapi:
| Tabel | Status |
|-------|--------|
| `office_assets` | ❌ Belum ada |
| `asset_maintenance_logs` | ❌ Belum ada |

### D. Support / Tiket

Permission `PERMISSIONS.SUPPORT` ada, tapi:
| Tabel | Status |
|-------|--------|
| `support_tickets` | ❌ Belum ada |
| `support_messages` | ❌ Belum ada |

### E. Approval Workflow

Permission `PERMISSIONS.APPROVALS`, `APPROVAL_CONFIGS` ada, dan tabel sudah di blueprint:
| Tabel | Status di Migration |
|-------|---------------------|
| `approval_configs` | ✅ Ada di 013_bookings.sql |
| `approval_requests` | ✅ Ada di 013_bookings.sql |

### F. Contrak Vendor

Permission `PERMISSIONS.VENDOR_CONTRACTS` ada, tapi:
| Tabel | Status |
|-------|--------|
| `vendor_contracts` | ❌ Belum ada |

### G. Cancellation Policies

Permission `PERMISSIONS.CANCELLATION_POLICIES` ada, tapi:
| Tabel | Status |
|-------|--------|
| `cancellation_policies` | ❌ Belum ada |

### H. SISKOHAT Integration

Permission `PERMISSIONS.SISKOHAT`, `SISKOHAT_EXPORT` ada, tapi:
| Tabel | Status |
|-------|--------|
| `siskohat_registrations` | ❌ Belum ada |
| `siskohat_sync_logs` | ❌ Belum ada |

### I. Virtual Account

Permission `PERMISSIONS.VIRTUAL_ACCOUNT` ada, tapi:
| Tabel | Status |
|-------|--------|
| `virtual_accounts` | ❌ Belum ada |

### J. AI / Chatbot

Permissions: `GEMINI_AI`, `SENTIMEN_FEEDBACK`, `PREDIKSI_SEAT`:
| Tabel | Status |
|-------|--------|
| `chatbot_conversations` | ❌ Belum ada |
| `chatbot_messages` | ❌ Belum ada |
| `sentiment_analysis_logs` | ❌ Belum ada |
| `seat_prediction_logs` | ❌ Belum ada |

### K. Recruitment & HR

Permission HR ada, halaman recruitment ada, tapi:
| Tabel | Status |
|-------|--------|
| `job_openings` | ❌ Belum ada |
| `job_applications` | ❌ Belum ada |
| `training_sessions` | ❌ Belum ada |
| `training_participants` | ❌ Belum ada |
| `employee_contracts` | ❌ Belum ada |
| `warning_letters` (SP) | ❌ Belum ada |

### L. Correspondence Hub

Permission `PERMISSIONS.WHATSAPP` untuk hub korespondensi, tapi tidak ada tabel:
| Tabel | Status |
|-------|--------|
| `correspondence_log` | ❌ Belum ada |

---

## 2. Tabel yang Belum Ada di Migration tapi Ada di Supabase Lama

Berdasarkan daftar tabel Supabase lama yang diberikan:

| Tabel Supabase Lama | Status di Migration Baru | Catatan |
|--------------------|-------------------------|---------|
| `booking_status_history` | ✅ Ada (di 030_seed_admin.sql) | Ditambahkan terlambat |
| `booking_transfers` | ❌ Belum di migration | Di blueprint saja |
| `departure_hotels` | ⚠️ Ada sbg `departure_multi_hotels` (012) | Nama berbeda |
| `departure_itineraries` | ⚠️ Ada sbg `trip_timeline` (012) | Nama berbeda |
| `departure_checklists` | ❌ Belum di migration | Di blueprint saja |
| `manifests` | ❌ Belum di migration | Di blueprint saja |
| `luggage` | ❌ Belum di migration | Di blueprint saja |
| `customer_family_relations` | ❌ Belum di migration | Di blueprint saja |
| `jamaah_qr_codes` | ❌ Belum di migration | Di blueprint saja |
| `jamaah_live_locations` | ❌ Belum di migration | Di blueprint saja |
| `haji_registrations` | ❌ Belum di migration | Di blueprint saja |
| `haji_waiting_progress` | ❌ Belum di migration | Di blueprint saja |
| `bus_providers` | ❌ Belum di migration | Di blueprint saja |
| `bus_assignments` | ❌ Belum di migration | Di blueprint saja |
| `bus_passengers` | ❌ Belum di migration | Di blueprint saja |
| `cash_transactions` | ❌ Belum di migration | Di blueprint saja |
| `loyalty_transactions` | ❌ Belum di migration | Di blueprint saja |
| `loyalty_rewards` | ❌ Belum di migration | Di blueprint saja |
| `loyalty_point_expiry` | ❌ Belum di migration | Di blueprint saja |
| `departments` | ❌ Belum di migration | Di blueprint saja |
| `attendance_records` | ❌ Belum di migration | Di blueprint saja |
| `leave_quotas` | ❌ Belum di migration | Di blueprint saja |
| `employee_devices` | ❌ Belum di migration | Di blueprint saja |
| `hr_settings` | ❌ Belum di migration | Di 030 seed saja |
| `equipment_categories` | ❌ Belum di migration | Di blueprint saja |
| `equipment_variants` | ❌ Belum di migration | Di blueprint saja |
| `equipment_photos` | ❌ Belum di migration | Di blueprint saja |
| `equipment_stock_history` | ❌ Belum di migration | Di blueprint saja |
| `equipment_stock_opname` | ❌ Belum di migration | Di blueprint saja |
| `equipment_settings` | ❌ Belum di migration | Di 030 seed saja |
| `equipment_notification_settings` | ❌ Belum di migration | Di blueprint saja |
| `marketing_materials` | ❌ Belum di migration | Di blueprint saja |
| `marketing_material_downloads` | ❌ Belum di migration | Di blueprint saja |
| `landing_pages` | ❌ Belum di migration | Di blueprint saja |
| `about_page_content` | ❌ Belum di migration | Di 030 seed saja |
| `hero_stats` | ❌ Belum di migration | Di 030 seed saja |
| `faq_knowledge_base` | ❌ Belum di migration | Di blueprint saja |
| `offline_content` | ❌ Belum di migration | Di blueprint saja |
| `company_features` | ❌ Belum di migration | Di blueprint saja |
| `access_policies` | ❌ Belum di migration | Di blueprint saja |
| `activity_logs` | ❌ Belum di migration | Digabung audit_logs |
| `dashboard_access_config` | ❌ Belum di migration | Di 030 seed saja (tanpa tabel) |
| `dashboard_access_audit_log` | ❌ Belum di migration | Di blueprint saja |
| `active_pics` | ❌ Belum di migration | Di blueprint saja |
| `journal_entry_lines` | ⚠️ Ada sbg `journal_lines` (016) | Nama berbeda |
| `attendance` (header) | ❌ Belum di migration | Di blueprint saja |

---

## 3. Permission yang Belum Dimodelkan di role_permissions

Dari `permissions.ts` ada 176+ permission keys, tapi `029_seed_permissions.sql` hanya mencakup sekitar 50 permission per role. Permission berikut belum ada di `role_permissions`:

| Permission Key | Status |
|----------------|--------|
| `analytics` | ❌ Belum di seed |
| `kpi-dashboard` | ❌ Belum di seed |
| `ai-summary` | ❌ Belum di seed |
| `package-types` | ❌ Belum di seed |
| `coupons` | ❌ Belum di seed |
| `departures.manage` | ❌ Belum di seed |
| `room-assignments` | ❌ Belum di seed |
| `haji` | ❌ Belum di seed |
| `manasik` | ❌ Belum di seed |
| `absensi-digital` | ❌ Belum di seed |
| `departure-tracking` | ❌ Belum di seed |
| `sos-alerts` | ❌ Belum di seed |
| `lapangan` | ❌ Belum di seed |
| `manifest-jamaah` | ❌ Belum di seed |
| `wa-blast-keberangkatan` | ❌ Belum di seed |
| Semua permission Komunikasi/WA | ❌ Belum di seed |
| Semua permission Akuntansi (K-01 s/d K-13) | ❌ Belum di seed |
| Semua permission AI & Analytics | ❌ Belum di seed |
| Semua permission E-Commerce | ❌ Belum di seed |
| Semua permission Dokumen & Legalitas | ❌ Belum di seed |

**Estimasi:** ~130 permission keys belum di-seed ke `role_permissions`.

---

## 4. Role yang Tidak Terdefinisi dengan Jelas

### Role `admin` — Ambigu

**Masalah:** Role `admin` ada di ENUM `app_role`, tapi:
- Tidak ada di `isStaff()` helper di `useAuth.tsx`
- Tidak ada di `isAdmin()` helper
- Di migration RLS ada di beberapa policy tapi tidak konsisten

**Kemungkinan:**
1. `admin` adalah role internal yang tidak punya user (hanya konsep)
2. `admin` seharusnya sama dengan `branch_manager` level
3. `admin` adalah role terpisah yang belum diimplementasi

**Rekomendasi:** Definisikan `admin` secara eksplisit. Opsi:
- **Opsi A:** `admin` = kombinasi `operator + sales + operational` tapi tanpa `finance`
- **Opsi B:** `admin` = `branch_manager` tanpa scope cabang (admin kantor pusat)
- **Opsi C:** Hapus `admin` dari ENUM dan gunakan kombinasi role lain

### Role `operator` — Kurang Terdefinisi

`operator` ada di beberapa policy tapi tidak konsisten dengan apa yang boleh dilakukan.

---

## 5. Menu yang Tidak Terlindungi

| Menu | Masalah |
|------|---------|
| `/admin/correspondence` | Permission `whatsapp` terlalu generik |
| `/admin/hpp-terpadu` | Permission `laporan-pajak` tidak sesuai domain |
| `/admin/laporan-cabang` | Permission `laba-rugi` tidak spesifik |
| `/admin/chatbot-stats` | Sama permission dengan `/admin/gemini-ai` |
| `/admin/chat-logs` | Sama permission dengan `/admin/gemini-ai` |
| Beberapa halaman laporan | Permission `reports` digunakan untuk halaman yang berbeda fungsinya |

---

## 6. Tabel yang Tidak Digunakan (Kandidat Deprecated)

| Tabel | Alasan |
|-------|--------|
| `trip_timeline` | Digantikan `departure_itineraries` (nama dari Supabase lama lebih tepat) |
| `departure_multi_hotels` | Digantikan `departure_hotels` (nama dari Supabase lama) |
| `journal_lines` | Harus diganti ke `journal_entry_lines` (nama canonical dari Supabase lama) |
| `baggage_reference_items` | Fungsinya overlap dengan `luggage` table |
| `package_type_equipment` | Bisa digabung ke `equipment_items.applicable_package_types` |

---

## 7. Ringkasan Gap dan Prioritas

### Prioritas KRITIS (harus ada sebelum go-live)
- ✅ `booking_status_history` — sudah di 030
- ❌ `departure_checklists` — operasional penting
- ❌ `manifests` — compliance keberangkatan
- ❌ `bus_providers/assignments/passengers` — transportasi
- ❌ `haji_registrations/waiting_progress` — fitur haji
- ❌ `equipment_categories/variants/stock_history` — inventaris lengkap
- ❌ `departments` + `attendance_records` — HR dasar
- ❌ `dashboard_access_config` tabel formal — digunakan di 030 seed tapi tidak ada tabelnya
- ❌ `activity_logs` — audit tracking umum
- ❌ Semua permission keys di `permissions_list` + `role_permissions` (~130 belum di-seed)

### Prioritas TINGGI (perlu sebelum full launch)
- ❌ `store_products/orders/categories` — e-commerce
- ❌ `blog_posts` — konten marketing
- ❌ `training_sessions` + `training_participants` — HR lengkap
- ❌ `support_tickets` — customer service
- ❌ `vendor_contracts` — manajemen vendor
- ❌ `cancellation_policies` — kebijakan bisnis
- ❌ `landing_pages` — marketing digital

### Prioritas MEDIUM (bisa setelah launch)
- ❌ `chatbot_conversations` — AI chatbot
- ❌ `siskohat_registrations` — integrasi Kemenag
- ❌ `virtual_accounts` — payment gateway
- ❌ `office_assets` — manajemen aset

---

## Rekomendasi Tindakan

1. **Selesaikan migration 031-040** untuk tabel-tabel yang missing kritis
2. **Revisi `isStaff()` dan `isAdmin()`** di `useAuth.tsx` — tambahkan role `admin` dan `operator`
3. **Seed semua permission keys** dari `permissions.ts` ke tabel `permissions_list`
4. **Seed `role_permissions`** yang lebih lengkap (~176 permission × 15 role)
5. **Unify nama tabel**: `departure_itineraries` (bukan trip_timeline), `departure_hotels` (bukan departure_multi_hotels), `journal_entry_lines` (bukan journal_lines)
6. **Definisikan role `admin` secara eksplisit** dan tambahkan ke helper functions
