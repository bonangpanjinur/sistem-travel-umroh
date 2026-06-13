# Database Blueprint — Vinstour Travel Portal (v2)
> Diperbarui dengan konteks database Supabase lama
> Semua policy menggunakan `public.has_role()` — tidak ada `role = 'admin'` langsung

---

## Prinsip Desain

1. **ENUM aman** — `public.app_role` untuk semua kolom role, tidak ada TEXT role
2. **RLS via helper** — semua policy pakai `public.has_role()` / `public.has_any_role()`
3. **Idempotent** — semua file `CREATE ... IF NOT EXISTS`
4. **No orphans** — semua FK jelas: CASCADE, SET NULL, atau RESTRICT
5. **Audit built-in** — `audit_logs` + `booking_status_history` untuk traceability
6. **Immutable journal** — double-entry enforced via trigger
7. **Single source of truth** — tidak ada duplikasi tabel dengan tujuan sama
8. **Equipment lengkap** — categories, variants, photos, stock history, opname

---

## Role Model

```sql
CREATE TYPE public.app_role AS ENUM (
  'super_admin',    -- akses penuh semua fitur & pengaturan sistem
  'owner',          -- pemilik perusahaan, akses semua laporan keuangan
  'it',             -- tim IT: manajemen user, RBAC, sistem
  'admin',          -- admin operasional harian
  'branch_manager', -- manajer cabang
  'finance',        -- tim keuangan & akuntansi
  'operational',    -- tim operasional keberangkatan
  'operator',       -- operator booking & data entry
  'sales',          -- tim penjualan / CS
  'marketing',      -- tim marketing & konten
  'equipment',      -- tim perlengkapan
  'agent',          -- agen mitra travel
  'sub_agent',      -- sub-agen di bawah agen
  'customer',       -- portal customer (legacy, pra-booking)
  'jamaah'          -- jamaah aktif (memiliki booking aktif)
);
```

---

## Domain 1: User & Security

```
auth.users                   — Supabase native (tidak dimodifikasi)

profiles
  id UUID PK → auth.users (CASCADE)
  email TEXT UNIQUE
  full_name TEXT
  phone TEXT
  avatar_url TEXT
  face_descriptor FLOAT8[]
  is_active BOOLEAN DEFAULT TRUE
  session_version INT DEFAULT 0
  last_sign_in_at TIMESTAMPTZ
  created_at, updated_at TIMESTAMPTZ

access_policies              — Kebijakan akses kustom per user/resource
  id UUID PK
  user_id UUID → auth.users (CASCADE)
  resource TEXT NOT NULL      -- 'departure', 'booking', 'report', etc.
  resource_id UUID            -- spesifik resource (NULL = semua)
  action TEXT NOT NULL        -- 'view', 'edit', 'export'
  is_allowed BOOLEAN DEFAULT TRUE
  granted_by UUID → auth.users
  expires_at TIMESTAMPTZ
  created_at TIMESTAMPTZ

activity_logs                — Log aktivitas umum (lebih granular dari audit_logs)
  id UUID PK
  user_id UUID → auth.users (SET NULL)
  action TEXT NOT NULL
  resource_type TEXT
  resource_id UUID
  description TEXT
  ip_address INET
  user_agent TEXT
  metadata JSONB
  created_at TIMESTAMPTZ

audit_logs                   — Immutable audit trail (before/after diff)
  id UUID PK
  user_id UUID → auth.users (SET NULL)
  actor_role public.app_role
  action TEXT NOT NULL
  table_name TEXT
  record_id UUID
  before_data JSONB
  after_data JSONB
  ip_address INET
  user_agent TEXT
  created_at TIMESTAMPTZ

login_attempts
  id UUID PK
  email TEXT NOT NULL
  ip_address INET
  user_agent TEXT
  success BOOLEAN DEFAULT FALSE
  failure_reason TEXT
  created_at TIMESTAMPTZ

otp_codes
  id UUID PK
  user_id UUID → auth.users (CASCADE)
  code TEXT NOT NULL
  purpose TEXT ('login','email_verify','phone_verify','password_reset')
  expires_at TIMESTAMPTZ
  used_at TIMESTAMPTZ
  attempts INT DEFAULT 0
  created_at TIMESTAMPTZ

dashboard_access_config      — Konfigurasi widget dashboard per role
  id UUID PK
  role public.app_role NOT NULL
  widget_key TEXT NOT NULL
  is_visible BOOLEAN DEFAULT TRUE
  sort_order INT DEFAULT 0
  config JSONB
  UNIQUE (role, widget_key)

dashboard_access_audit_log   — Log perubahan konfigurasi dashboard
  id UUID PK
  changed_by UUID → auth.users
  role public.app_role
  widget_key TEXT
  before_config JSONB
  after_config JSONB
  created_at TIMESTAMPTZ
```

---

## Domain 2: Roles & Permissions

```
user_roles
  id UUID PK
  user_id UUID → auth.users (CASCADE)
  role public.app_role NOT NULL
  branch_id UUID → branches (SET NULL)
  is_active BOOLEAN DEFAULT TRUE
  granted_by UUID → auth.users
  granted_at TIMESTAMPTZ
  expires_at TIMESTAMPTZ
  UNIQUE (user_id, role, branch_id)

permissions_list
  id UUID PK
  key TEXT UNIQUE NOT NULL
  label TEXT NOT NULL
  group_name TEXT
  description TEXT
  created_at TIMESTAMPTZ

role_permissions
  id UUID PK
  role public.app_role NOT NULL
  permission_key TEXT → permissions_list (CASCADE)
  can_view BOOLEAN DEFAULT FALSE
  can_create BOOLEAN DEFAULT FALSE
  can_edit BOOLEAN DEFAULT FALSE
  can_delete BOOLEAN DEFAULT FALSE
  UNIQUE (role, permission_key)

user_permission_overrides    — Override permission per-user
  id UUID PK
  user_id UUID → auth.users (CASCADE)
  permission_key TEXT → permissions_list (CASCADE)
  can_view BOOLEAN
  can_create BOOLEAN
  can_edit BOOLEAN
  can_delete BOOLEAN
  reason TEXT
  granted_by UUID → auth.users
  expires_at TIMESTAMPTZ
  UNIQUE (user_id, permission_key)

staff_invitations
  id UUID PK
  email TEXT NOT NULL
  role public.app_role NOT NULL
  invited_by UUID → auth.users
  branch_id UUID → branches
  token TEXT UNIQUE
  expires_at TIMESTAMPTZ
  accepted_at TIMESTAMPTZ
  created_at TIMESTAMPTZ
```

---

## Domain 3: Company & Branches

```
branches
  id UUID PK
  name TEXT NOT NULL
  code TEXT UNIQUE
  slug TEXT UNIQUE
  address TEXT
  city TEXT, province TEXT
  phone TEXT, email TEXT
  manager_id UUID → profiles
  is_active BOOLEAN DEFAULT TRUE
  logo_url TEXT
  description TEXT
  meta_data JSONB
  created_at, updated_at TIMESTAMPTZ

company_settings             — Key-value store konfigurasi global
  id UUID PK
  setting_key TEXT UNIQUE NOT NULL
  setting_value TEXT NOT NULL DEFAULT 'null'
  setting_type TEXT ('string','number','boolean','json','url')
  description TEXT
  is_public BOOLEAN DEFAULT FALSE
  updated_by UUID → auth.users
  created_at, updated_at TIMESTAMPTZ

company_features             — Feature flags per company/branch
  id UUID PK
  feature_key TEXT NOT NULL
  branch_id UUID → branches (SET NULL, NULL=global)
  is_enabled BOOLEAN DEFAULT FALSE
  config JSONB
  enabled_at TIMESTAMPTZ
  disabled_at TIMESTAMPTZ
  UNIQUE (feature_key, branch_id)
```

---

## Domain 4: Agent Network

```
agents
  id UUID PK
  user_id UUID → auth.users
  branch_id UUID → branches
  parent_agent_id UUID → agents    -- sub-agen
  agent_type TEXT ('agent','sub_agent') DEFAULT 'agent'
  agent_code TEXT UNIQUE
  slug TEXT UNIQUE
  company_name TEXT NOT NULL
  pic_name TEXT
  phone TEXT, email TEXT
  address TEXT, city TEXT, province TEXT
  status TEXT ('active','inactive','suspended','pending')
  commission_rate NUMERIC DEFAULT 0
  plan_type TEXT ('silver','gold','platinum')
  max_sub_agents INT
  logo_url TEXT
  website_url TEXT
  notes TEXT, meta_data JSONB
  joined_at, created_at, updated_at TIMESTAMPTZ

active_pics                  — PIC aktif yang sedang menangani booking/departure
  id UUID PK
  agent_id UUID → agents (CASCADE)
  user_id UUID → auth.users (SET NULL)
  full_name TEXT NOT NULL
  phone TEXT
  role TEXT DEFAULT 'pic'
  is_active BOOLEAN DEFAULT TRUE
  assigned_at TIMESTAMPTZ
  created_at, updated_at TIMESTAMPTZ

agent_wallets
  id UUID PK
  agent_id UUID UNIQUE → agents (CASCADE)
  balance NUMERIC DEFAULT 0 CHECK >= 0
  total_earned NUMERIC DEFAULT 0
  total_withdrawn NUMERIC DEFAULT 0
  created_at, updated_at TIMESTAMPTZ

agent_wallet_transactions
  id UUID PK
  wallet_id UUID → agent_wallets (CASCADE)
  type TEXT ('credit','debit')
  amount NUMERIC NOT NULL CHECK > 0
  description TEXT NOT NULL
  reference_type TEXT
  reference_id UUID
  balance_after NUMERIC DEFAULT 0
  created_at TIMESTAMPTZ

agent_commissions
  id UUID PK
  agent_id UUID → agents (CASCADE)
  booking_id UUID → bookings (SET NULL)
  amount NUMERIC NOT NULL
  rate NUMERIC NOT NULL
  type TEXT ('booking','referral','bonus')
  status TEXT ('pending','approved','paid','cancelled')
  paid_at TIMESTAMPTZ
  paid_to_wallet BOOLEAN DEFAULT FALSE
  notes TEXT
  created_at, updated_at TIMESTAMPTZ

membership_plans
  id UUID PK
  name TEXT NOT NULL
  type TEXT ('silver','gold','platinum') UNIQUE
  commission_base NUMERIC DEFAULT 0
  max_sub_agents INT DEFAULT 0
  monthly_fee NUMERIC DEFAULT 0
  features JSONB
  is_active BOOLEAN DEFAULT TRUE
  created_at, updated_at TIMESTAMPTZ

agent_commission_tiers
  id UUID PK
  name TEXT NOT NULL
  plan_type TEXT ('silver','gold','platinum')
  min_bookings INT DEFAULT 0
  max_bookings INT
  commission_rate NUMERIC DEFAULT 0
  bonus_amount NUMERIC DEFAULT 0
  is_active BOOLEAN DEFAULT TRUE
  created_at, updated_at TIMESTAMPTZ
```

---

## Domain 5: Customers / Jamaah

```
customers
  id UUID PK
  user_id UUID → auth.users
  branch_id UUID → branches
  agent_id UUID → agents
  customer_code TEXT UNIQUE
  full_name TEXT NOT NULL
  nik TEXT, passport_no TEXT, passport_expiry DATE
  gender public.gender_type
  birth_date DATE, birth_place TEXT
  phone TEXT, email TEXT
  address TEXT, city TEXT, province TEXT, postal_code TEXT
  nationality TEXT DEFAULT 'Indonesia'
  education TEXT, occupation TEXT
  emergency_contact_name TEXT
  emergency_contact_phone TEXT
  emergency_contact_relation TEXT
  photo_url TEXT
  health_notes TEXT
  status TEXT ('active','inactive','blacklisted')
  notes TEXT, meta_data JSONB
  created_at, updated_at TIMESTAMPTZ

customer_accounts            — Akun portal jamaah
  id UUID PK
  user_id UUID UNIQUE → auth.users (CASCADE)
  customer_id UUID → customers
  referred_by_agent_id UUID → agents
  referred_by_branch_id UUID → branches
  agent_slug TEXT, branch_slug TEXT
  loyalty_points INT DEFAULT 0
  total_bookings INT DEFAULT 0
  total_spent NUMERIC DEFAULT 0
  is_verified BOOLEAN DEFAULT FALSE
  verified_at TIMESTAMPTZ
  created_at, updated_at TIMESTAMPTZ

customer_documents
  id UUID PK
  customer_id UUID → customers (CASCADE)
  booking_id UUID → bookings (SET NULL)
  document_type TEXT ('ktp','passport','photo','family_card',
    'birth_certificate','marriage_cert','vaccination','other')
  file_url TEXT NOT NULL
  file_name TEXT, file_size INT, mime_type TEXT
  expiry_date DATE
  status public.document_status_type DEFAULT 'pending'
  notes TEXT
  verified_by UUID → auth.users
  verified_at TIMESTAMPTZ
  created_at, updated_at TIMESTAMPTZ

customer_family_relations    — Relasi keluarga (lebih luas dari mahrams)
  id UUID PK
  customer_id UUID → customers (CASCADE)
  related_customer_id UUID → customers (CASCADE)
  relation_type TEXT ('suami','istri','ayah','ibu','anak','mahram','saudara','other')
  notes TEXT
  created_at TIMESTAMPTZ
  UNIQUE (customer_id, related_customer_id)

customer_mahrams             — Relasi mahram spesifik (subset family_relations)
  id UUID PK
  customer_id UUID → customers (CASCADE)
  mahram_id UUID → customers (CASCADE)
  relationship TEXT NOT NULL
  notes TEXT
  created_at TIMESTAMPTZ
  UNIQUE (customer_id, mahram_id)

jamaah_qr_codes              — QR code identitas jamaah
  id UUID PK
  customer_id UUID → customers (CASCADE)
  departure_id UUID → departures (SET NULL)
  qr_code TEXT UNIQUE NOT NULL
  qr_url TEXT
  is_active BOOLEAN DEFAULT TRUE
  generated_at TIMESTAMPTZ DEFAULT NOW()
  expires_at TIMESTAMPTZ

jamaah_live_locations        — Tracking lokasi realtime jamaah
  id UUID PK
  customer_id UUID → customers (CASCADE)
  departure_id UUID → departures (SET NULL)
  latitude NUMERIC NOT NULL
  longitude NUMERIC NOT NULL
  accuracy NUMERIC
  location_name TEXT
  recorded_at TIMESTAMPTZ DEFAULT NOW()
  device_info TEXT
  -- Partisi by recorded_at untuk performa

haji_registrations           — Pendaftaran haji (SISKOHAT)
  id UUID PK
  customer_id UUID → customers (CASCADE)
  registration_number TEXT UNIQUE
  bpih_amount NUMERIC
  registration_year INT
  province TEXT
  regency TEXT
  queue_number INT
  status TEXT ('registered','waiting','called','departed','completed','cancelled')
  siskohat_sync_at TIMESTAMPTZ
  notes TEXT
  created_at, updated_at TIMESTAMPTZ

haji_waiting_progress        — Progress antrian haji
  id UUID PK
  registration_id UUID → haji_registrations (CASCADE)
  year INT NOT NULL
  current_position INT
  estimated_departure_year INT
  notes TEXT
  recorded_at TIMESTAMPTZ DEFAULT NOW()

muthawifs
  id UUID PK
  user_id UUID → auth.users
  branch_id UUID → branches
  full_name TEXT NOT NULL
  phone TEXT, email TEXT, nik TEXT
  gender public.gender_type
  specialization TEXT
  languages TEXT[]
  photo_url TEXT
  certification_no TEXT
  is_available BOOLEAN DEFAULT TRUE
  is_active BOOLEAN DEFAULT TRUE
  notes TEXT
  created_at, updated_at TIMESTAMPTZ
```

---

## Domain 6: Travel Catalog

```
airlines
  id UUID PK
  name TEXT NOT NULL
  iata_code TEXT UNIQUE
  icao_code TEXT
  logo_url TEXT
  country TEXT
  is_active BOOLEAN DEFAULT TRUE
  created_at, updated_at TIMESTAMPTZ

airports
  id UUID PK
  iata_code TEXT UNIQUE NOT NULL
  icao_code TEXT
  name TEXT NOT NULL
  city TEXT, country TEXT, country_code TEXT
  timezone TEXT
  latitude NUMERIC, longitude NUMERIC
  is_active BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ

hotels
  id UUID PK
  name TEXT NOT NULL
  city TEXT ('makkah','madinah','jeddah','other')
  address TEXT
  star_rating INT (1-5)
  distance_to_haram NUMERIC
  photo_url TEXT, photos TEXT[]
  amenities TEXT[]
  description TEXT
  is_active BOOLEAN DEFAULT TRUE
  created_at, updated_at TIMESTAMPTZ

hotel_room_capacities
  id UUID PK
  hotel_id UUID → hotels (CASCADE)
  room_type TEXT ('quad','triple','double','single')
  capacity INT DEFAULT 4
  UNIQUE (hotel_id, room_type)

vendors
  id UUID PK
  name TEXT NOT NULL
  vendor_type TEXT ('airline','hotel','transport','visa','insurance','catering','general')
  contact_person TEXT, phone TEXT, email TEXT
  address TEXT, country TEXT
  currency TEXT DEFAULT 'IDR'
  payment_terms TEXT, tax_number TEXT
  is_active BOOLEAN DEFAULT TRUE
  notes TEXT
  created_at, updated_at TIMESTAMPTZ

packages
  id UUID PK
  name TEXT NOT NULL
  code TEXT UNIQUE, slug TEXT UNIQUE
  package_type TEXT ('umroh','haji','wisata','haji_plus')
  duration_days INT DEFAULT 9
  airline_id UUID → airlines
  hotel_makkah_id UUID → hotels
  hotel_madinah_id UUID → hotels
  hotel_makkah_nights INT, hotel_madinah_nights INT
  room_type_default TEXT ('quad','triple','double','single')
  base_price_quad NUMERIC, base_price_triple NUMERIC
  base_price_double NUMERIC, base_price_single NUMERIC
  includes TEXT[], excludes TEXT[]
  description TEXT, highlights TEXT[]
  itinerary JSONB
  photo_url TEXT, photos TEXT[], thumbnail_url TEXT
  label_id UUID → package_labels
  group_id UUID → package_groups
  view_count INT DEFAULT 0
  is_published BOOLEAN DEFAULT FALSE
  is_featured BOOLEAN DEFAULT FALSE
  is_active BOOLEAN DEFAULT TRUE
  sort_order INT DEFAULT 0
  seo_title TEXT, seo_description TEXT, seo_keywords TEXT[]
  created_by UUID → auth.users
  created_at, updated_at TIMESTAMPTZ

package_labels
  id UUID PK
  name TEXT NOT NULL
  color TEXT, text_color TEXT
  sort_order INT DEFAULT 0
  created_at TIMESTAMPTZ

package_groups
  id UUID PK
  name TEXT NOT NULL
  slug TEXT UNIQUE
  description TEXT
  sort_order INT DEFAULT 0
  is_active BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ
```

---

## Domain 7: Package Departures

```
departures
  id UUID PK
  package_id UUID → packages (RESTRICT)
  airline_id UUID → airlines
  hotel_makkah_id UUID → hotels
  hotel_madinah_id UUID → hotels
  departure_date DATE NOT NULL
  return_date DATE NOT NULL
  quota INT DEFAULT 40
  available_seats INT DEFAULT 40
  status TEXT ('draft','open','full','closed','departed','completed','cancelled')
  price_quad NUMERIC, price_triple NUMERIC
  price_double NUMERIC, price_single NUMERIC
  flight_number TEXT, flight_number_return TEXT
  embarkation_city TEXT
  notes TEXT, internal_notes TEXT
  lead_pic UUID → profiles
  branch_id UUID → branches
  created_by UUID → auth.users
  created_at, updated_at TIMESTAMPTZ

departure_hotels             -- Hotel per departure (dari Supabase lama, ganti departure_multi_hotels)
  id UUID PK
  departure_id UUID → departures (CASCADE)
  hotel_id UUID → hotels (SET NULL)
  city TEXT NOT NULL
  check_in_date DATE, check_out_date DATE
  nights INT
  room_type TEXT
  notes TEXT
  sort_order INT DEFAULT 0

departure_itineraries        -- Itinerary per departure (dari Supabase lama, ganti trip_timeline)
  id UUID PK
  departure_id UUID → departures (CASCADE)
  day_number INT NOT NULL
  event_date DATE
  title TEXT NOT NULL
  description TEXT
  location TEXT
  event_type TEXT ('flight','hotel','ibadah','activity','transfer','free')
  sort_order INT DEFAULT 0
  created_at TIMESTAMPTZ

departure_checklists         -- Checklist operasional per departure
  id UUID PK
  departure_id UUID → departures (CASCADE)
  item TEXT NOT NULL
  category TEXT ('dokumen','perlengkapan','koordinasi','logistik','other')
  is_completed BOOLEAN DEFAULT FALSE
  completed_by UUID → auth.users
  completed_at TIMESTAMPTZ
  sort_order INT DEFAULT 0

manifests                    -- Manifest keberangkatan (daftar final jamaah)
  id UUID PK
  departure_id UUID UNIQUE → departures (CASCADE)
  manifest_number TEXT UNIQUE
  total_pax INT DEFAULT 0
  airline_id UUID → airlines
  flight_number TEXT
  departure_date DATE
  return_date DATE
  embarkation_city TEXT
  status TEXT ('draft','submitted','approved','finalized')
  submitted_at TIMESTAMPTZ
  approved_by UUID → auth.users
  approved_at TIMESTAMPTZ
  pdf_url TEXT
  notes TEXT
  created_at, updated_at TIMESTAMPTZ

departure_cost_items         -- HPP aktual per departure
  ...same as before...

departure_expenses           -- Pengeluaran operasional
  ...same as before...

departure_other_revenues     -- Pendapatan tambahan
  ...same as before...

departure_financial_summary  -- Summary profit/loss (auto-calculated)
  ...same as before, includes GENERATED columns...
```

---

## Domain 8: Transportation (Bus)

```
bus_providers                -- Penyedia bus / armada
  id UUID PK
  name TEXT NOT NULL
  contact_person TEXT
  phone TEXT, email TEXT
  address TEXT, city TEXT
  capacity INT DEFAULT 45
  fleet_count INT DEFAULT 1
  is_active BOOLEAN DEFAULT TRUE
  notes TEXT
  created_at, updated_at TIMESTAMPTZ

bus_assignments              -- Penugasan bus ke keberangkatan
  id UUID PK
  departure_id UUID → departures (CASCADE)
  provider_id UUID → bus_providers (SET NULL)
  bus_number TEXT
  license_plate TEXT
  driver_name TEXT
  driver_phone TEXT
  capacity INT
  route TEXT
  pickup_location TEXT
  pickup_time TIMESTAMPTZ
  departure_time TIMESTAMPTZ
  notes TEXT
  status TEXT ('scheduled','in_transit','completed','cancelled')
  created_at, updated_at TIMESTAMPTZ

bus_passengers               -- Penumpang per bus
  id UUID PK
  assignment_id UUID → bus_assignments (CASCADE)
  booking_passenger_id UUID → booking_passengers (SET NULL)
  seat_number TEXT
  notes TEXT
  checked_in_at TIMESTAMPTZ
  UNIQUE (assignment_id, seat_number)
```

---

## Domain 9: Bookings

```
bookings
  id UUID PK
  booking_code TEXT UNIQUE NOT NULL
  customer_id UUID → customers (RESTRICT)
  departure_id UUID → departures
  agent_id UUID → agents
  branch_id UUID → branches
  handled_by UUID → profiles
  coupon_id UUID → coupons
  status TEXT ('pending','confirmed','awaiting_documents',
    'documents_complete','visa_processing','completed','cancelled')
  room_type TEXT ('quad','triple','double','single')
  total_pax INT DEFAULT 1
  total_price NUMERIC DEFAULT 0
  discount_amount NUMERIC DEFAULT 0
  paid_amount NUMERIC DEFAULT 0
  remaining_amount NUMERIC GENERATED ALWAYS AS (...) STORED
  payment_status TEXT ('unpaid','partial','paid','refunded','overpaid')
  payment_deadline DATE
  special_requests TEXT, internal_notes TEXT
  cancelled_at TIMESTAMPTZ, cancellation_reason TEXT
  confirmed_at TIMESTAMPTZ, completed_at TIMESTAMPTZ
  source TEXT ('staff','portal','agent','website','api')
  created_at, updated_at TIMESTAMPTZ

booking_status_history       -- BARU: Log perubahan status booking
  id UUID PK
  booking_id UUID → bookings (CASCADE)
  from_status TEXT
  to_status TEXT NOT NULL
  changed_by UUID → auth.users (SET NULL)
  reason TEXT
  metadata JSONB
  created_at TIMESTAMPTZ DEFAULT NOW()

booking_transfers            -- BARU: Transfer booking ke departure/jamaah lain
  id UUID PK
  original_booking_id UUID → bookings (SET NULL)
  new_booking_id UUID → bookings (SET NULL)
  transfer_type TEXT ('departure_change','passenger_change','cancellation_transfer')
  reason TEXT
  approved_by UUID → auth.users
  approved_at TIMESTAMPTZ
  status TEXT ('pending','approved','rejected')
  notes TEXT
  created_at TIMESTAMPTZ

booking_passengers
  id UUID PK
  booking_id UUID → bookings (CASCADE)
  customer_id UUID → customers
  full_name TEXT NOT NULL
  nik TEXT, passport_no TEXT, passport_expiry DATE
  gender public.gender_type
  birth_date DATE, birth_place TEXT
  nationality TEXT DEFAULT 'Indonesia'
  mahram_of UUID → booking_passengers
  room_type TEXT
  seat_number TEXT
  is_lead_passenger BOOLEAN DEFAULT FALSE
  notes TEXT
  created_at, updated_at TIMESTAMPTZ

booking_line_items
  id UUID PK
  booking_id UUID → bookings (CASCADE)
  description TEXT NOT NULL
  category TEXT ('package','addon','insurance','visa','transport','other')
  quantity INT DEFAULT 1
  unit_price NUMERIC DEFAULT 0
  total_price NUMERIC DEFAULT 0
  notes TEXT
  created_at TIMESTAMPTZ

luggage                      -- BARU: Bagasi per jamaah per keberangkatan
  id UUID PK
  booking_passenger_id UUID → booking_passengers (CASCADE)
  departure_id UUID → departures (SET NULL)
  baggage_tag TEXT UNIQUE
  weight_kg NUMERIC
  pieces INT DEFAULT 1
  type TEXT ('check_in','cabin','fragile')
  status TEXT ('registered','checked_in','on_flight','arrived','claimed','lost')
  notes TEXT
  created_at, updated_at TIMESTAMPTZ

approval_configs, approval_requests
  ...same as before...

visa_applications
  ...same as before...

room_assignments
  ...same as before...

manasik_sessions
  ...same as before...
```

---

## Domain 10: Payments

```
bank_accounts
  ...same as before...

payments
  ...same as before...

coupons
  ...same as before...

savings_plans
  ...same as before...

savings_deposits
  ...same as before...

cash_transactions            -- Transaksi kas langsung (dari Supabase lama)
  id UUID PK
  type TEXT ('income','expense')
  category TEXT NOT NULL
  amount NUMERIC NOT NULL
  description TEXT NOT NULL
  reference_type TEXT
  reference_id UUID
  transaction_date DATE DEFAULT CURRENT_DATE
  created_by UUID → auth.users
  branch_id UUID → branches
  notes TEXT
  created_at TIMESTAMPTZ

loyalty_points               -- Poin per event
  id UUID PK
  customer_id UUID → customers (CASCADE)
  booking_id UUID → bookings
  points INT NOT NULL
  type TEXT ('earned','redeemed','expired','adjusted')
  description TEXT
  expires_at TIMESTAMPTZ
  created_at TIMESTAMPTZ

loyalty_transactions         -- BARU: Detail transaksi poin
  id UUID PK
  customer_id UUID → customers (CASCADE)
  loyalty_point_id UUID → loyalty_points
  type TEXT ('earn','redeem','expire')
  points INT NOT NULL
  balance_after INT NOT NULL
  reference_type TEXT
  reference_id UUID
  created_at TIMESTAMPTZ

loyalty_rewards              -- BARU: Hadiah yang bisa ditukar poin
  id UUID PK
  name TEXT NOT NULL
  description TEXT
  points_required INT NOT NULL
  reward_type TEXT ('discount','gift','upgrade','cash_voucher')
  value NUMERIC
  stock INT
  is_active BOOLEAN DEFAULT TRUE
  valid_until TIMESTAMPTZ
  created_at, updated_at TIMESTAMPTZ

loyalty_point_expiry         -- BARU: Jadwal expiry poin
  id UUID PK
  customer_id UUID → customers (CASCADE)
  points INT NOT NULL
  earned_at TIMESTAMPTZ NOT NULL
  expires_at TIMESTAMPTZ NOT NULL
  is_expired BOOLEAN DEFAULT FALSE
  expired_at TIMESTAMPTZ
```

---

## Domain 11: Finance

```
chart_of_accounts
  ...same as before...

journal_entries
  ...same as before...

journal_entry_lines          -- Dari Supabase lama (alias journal_lines)
  id UUID PK
  journal_id UUID → journal_entries (CASCADE)
  account_code TEXT → chart_of_accounts (RESTRICT)
  debit NUMERIC DEFAULT 0
  credit NUMERIC DEFAULT 0
  description TEXT
  currency TEXT DEFAULT 'IDR'
  exchange_rate NUMERIC DEFAULT 1
  created_at TIMESTAMPTZ

vendor_invoices, departure_cost_items, departure_expenses
commissions, cashflow_entries, payroll, payroll_slips
leave_requests, performance_reviews
  ...same as before...
```

---

## Domain 12: HR

```
departments                  -- BARU: Departemen internal
  id UUID PK
  name TEXT NOT NULL
  code TEXT UNIQUE
  branch_id UUID → branches
  head_id UUID → employees
  description TEXT
  is_active BOOLEAN DEFAULT TRUE
  created_at, updated_at TIMESTAMPTZ

employees
  id UUID PK
  user_id UUID → auth.users
  branch_id UUID → branches
  department_id UUID → departments (SET NULL)   -- Kolom baru
  employee_code TEXT UNIQUE
  full_name TEXT NOT NULL
  email TEXT, phone TEXT, nik TEXT
  gender public.gender_type
  birth_date DATE
  address TEXT
  position TEXT
  employment_type TEXT ('permanent','contract','part_time','intern')
  status TEXT ('active','inactive','on_leave','terminated')
  join_date DATE, resign_date DATE
  base_salary NUMERIC DEFAULT 0
  bank_name TEXT, bank_account_no TEXT, bank_account_name TEXT
  npwp TEXT                   -- Untuk laporan PPh21
  photo_url TEXT, notes TEXT
  created_at, updated_at TIMESTAMPTZ

attendance                   -- Periode absensi (header)
  id UUID PK
  period_month INT
  period_year INT
  branch_id UUID → branches
  status TEXT ('open','closed')
  created_at TIMESTAMPTZ
  UNIQUE (period_month, period_year, branch_id)

attendance_records           -- BARU: Detail absensi per karyawan per hari
  id UUID PK
  employee_id UUID → employees (CASCADE)
  attendance_date DATE NOT NULL
  check_in TIMESTAMPTZ
  check_out TIMESTAMPTZ
  work_hours NUMERIC
  type TEXT ('regular','overtime','wfh','sick','leave','holiday')
  notes TEXT
  verified_by UUID → auth.users
  created_at TIMESTAMPTZ
  UNIQUE (employee_id, attendance_date)

leave_requests
  ...same as before...

leave_quotas                 -- Jatah cuti per karyawan per tahun
  id UUID PK
  employee_id UUID → employees (CASCADE)
  year INT NOT NULL
  annual_quota INT DEFAULT 12
  annual_used INT DEFAULT 0
  sick_quota INT DEFAULT 12
  sick_used INT DEFAULT 0
  emergency_quota INT DEFAULT 5
  emergency_used INT DEFAULT 0
  UNIQUE (employee_id, year)

employee_devices             -- Device/HP karyawan
  id UUID PK
  employee_id UUID → employees (CASCADE)
  device_name TEXT
  device_type TEXT ('smartphone','tablet','laptop','other')
  serial_number TEXT
  imei TEXT
  os TEXT
  is_active BOOLEAN DEFAULT TRUE
  issued_at DATE
  returned_at DATE
  notes TEXT
  created_at TIMESTAMPTZ

hr_settings                  -- Pengaturan HR (hari kerja, jam, dsb)
  id UUID PK DEFAULT '00000000-0000-0000-0000-000000000003'
  work_days TEXT[] DEFAULT ARRAY['monday','tuesday','wednesday','thursday','friday']
  work_start TIME DEFAULT '08:00'
  work_end TIME DEFAULT '17:00'
  overtime_threshold NUMERIC DEFAULT 8
  annual_leave_quota INT DEFAULT 12
  sick_leave_quota INT DEFAULT 12
  created_at, updated_at TIMESTAMPTZ
```

---

## Domain 13: Equipment

```
equipment_categories         -- BARU: Kategori perlengkapan (hierarki)
  id UUID PK
  name TEXT NOT NULL
  slug TEXT UNIQUE
  parent_id UUID → equipment_categories (SET NULL)
  icon TEXT
  sort_order INT DEFAULT 0
  is_active BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ

equipment_items
  id UUID PK
  category_id UUID → equipment_categories (SET NULL)   -- Kolom baru
  name TEXT NOT NULL
  sku TEXT UNIQUE
  description TEXT
  stock_qty INT DEFAULT 0
  distributed_qty INT DEFAULT 0
  returned_qty INT DEFAULT 0
  available_qty INT GENERATED ALWAYS AS (...) STORED
  unit_cost NUMERIC DEFAULT 0
  photo_url TEXT
  is_active BOOLEAN DEFAULT TRUE
  created_at, updated_at TIMESTAMPTZ

equipment_variants           -- BARU: Varian per item (ukuran, warna, dll)
  id UUID PK
  item_id UUID → equipment_items (CASCADE)
  name TEXT NOT NULL
  sku TEXT UNIQUE
  size TEXT
  color TEXT
  stock_qty INT DEFAULT 0
  is_active BOOLEAN DEFAULT TRUE
  sort_order INT DEFAULT 0
  created_at TIMESTAMPTZ

equipment_distributions
  id UUID PK
  equipment_item_id UUID → equipment_items (RESTRICT)
  variant_id UUID → equipment_variants (SET NULL)     -- Kolom baru
  booking_passenger_id UUID → booking_passengers (SET NULL)
  departure_id UUID → departures (SET NULL)
  quantity INT DEFAULT 1
  distributed_at TIMESTAMPTZ DEFAULT NOW()
  distributed_by UUID → auth.users
  received_at TIMESTAMPTZ
  received_by_signature TEXT
  returned_at TIMESTAMPTZ
  return_condition TEXT ('good','damaged','lost')
  notes TEXT
  status TEXT ('pending','distributed','received','returned','lost')
  created_at, updated_at TIMESTAMPTZ

equipment_photos             -- BARU: Foto perlengkapan (kondisi, distribusi)
  id UUID PK
  distribution_id UUID → equipment_distributions (CASCADE)
  item_id UUID → equipment_items (SET NULL)
  photo_url TEXT NOT NULL
  photo_type TEXT ('item','distribution','return','damage')
  notes TEXT
  uploaded_by UUID → auth.users
  created_at TIMESTAMPTZ

equipment_stock_history      -- BARU: Riwayat perubahan stok
  id UUID PK
  item_id UUID → equipment_items (CASCADE)
  variant_id UUID → equipment_variants (SET NULL)
  type TEXT ('initial','restock','adjustment','loss','return')
  qty_before INT NOT NULL
  qty_change INT NOT NULL
  qty_after INT NOT NULL
  reason TEXT
  reference_type TEXT
  reference_id UUID
  created_by UUID → auth.users
  created_at TIMESTAMPTZ

equipment_stock_opname       -- BARU: Stock opname / inventarisasi
  id UUID PK
  item_id UUID → equipment_items (CASCADE)
  variant_id UUID → equipment_variants (SET NULL)
  opname_date DATE NOT NULL
  system_qty INT NOT NULL
  actual_qty INT NOT NULL
  difference INT GENERATED ALWAYS AS (actual_qty - system_qty) STORED
  notes TEXT
  verified_by UUID → auth.users
  created_at TIMESTAMPTZ

equipment_settings           -- BARU: Pengaturan sistem perlengkapan
  id UUID PK DEFAULT '00000000-0000-0000-0000-000000000004'
  auto_distribute BOOLEAN DEFAULT FALSE
  notify_on_low_stock BOOLEAN DEFAULT TRUE
  low_stock_threshold INT DEFAULT 5
  require_signature BOOLEAN DEFAULT FALSE
  created_at, updated_at TIMESTAMPTZ

equipment_notification_settings -- BARU: Notifikasi perlengkapan
  id UUID PK
  event_type TEXT ('low_stock','distribution_complete','return_due','damage_report')
  notify_roles public.app_role[]
  notify_emails TEXT[]
  is_active BOOLEAN DEFAULT TRUE
  created_at, updated_at TIMESTAMPTZ
```

---

## Domain 14: Marketing & CRM

```
leads
  ...same as before...

marketing_materials          -- BARU: Materi marketing (brosur, video)
  id UUID PK
  title TEXT NOT NULL
  description TEXT
  type TEXT ('brochure','video','banner','social_post','email_template','other')
  file_url TEXT
  thumbnail_url TEXT
  package_id UUID → packages (SET NULL)
  is_active BOOLEAN DEFAULT TRUE
  is_public BOOLEAN DEFAULT FALSE
  download_count INT DEFAULT 0
  created_by UUID → auth.users
  created_at, updated_at TIMESTAMPTZ

marketing_material_downloads -- BARU: Log download materi marketing
  id UUID PK
  material_id UUID → marketing_materials (CASCADE)
  downloaded_by UUID → auth.users (SET NULL)
  agent_id UUID → agents (SET NULL)
  ip_address INET
  created_at TIMESTAMPTZ

landing_pages               -- BARU: Landing page untuk kampanye
  id UUID PK
  slug TEXT UNIQUE NOT NULL
  title TEXT NOT NULL
  meta_description TEXT
  content JSONB               -- Blok konten (hero, features, CTA)
  package_id UUID → packages (SET NULL)
  agent_id UUID → agents (SET NULL)
  branch_id UUID → branches (SET NULL)
  view_count INT DEFAULT 0
  conversion_count INT DEFAULT 0
  is_active BOOLEAN DEFAULT TRUE
  seo_title TEXT
  created_by UUID → auth.users
  created_at, updated_at TIMESTAMPTZ

referral_codes, referral_usages, loyalty_points
  ...same as before...
```

---

## Domain 15: Website CMS

```
website_settings             -- Singleton (id fixed)
  ...same as before...

about_page_content           -- BARU: Konten halaman Tentang Kami
  id UUID PK DEFAULT '00000000-0000-0000-0000-000000000005'
  hero_title TEXT
  hero_subtitle TEXT
  hero_image_url TEXT
  vision TEXT
  mission TEXT[]
  history TEXT
  team_section JSONB
  certificates JSONB
  created_at, updated_at TIMESTAMPTZ

hero_stats                   -- BARU: Statistik hero section website
  id UUID PK
  label TEXT NOT NULL
  value TEXT NOT NULL
  icon TEXT
  sort_order INT DEFAULT 0
  is_active BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ

faq_knowledge_base           -- BARU: Knowledge base internal (berbeda dari FAQ publik)
  id UUID PK
  title TEXT NOT NULL
  content TEXT NOT NULL
  category TEXT NOT NULL
  tags TEXT[]
  is_internal BOOLEAN DEFAULT TRUE   -- TRUE = hanya staf
  view_count INT DEFAULT 0
  created_by UUID → auth.users
  created_at, updated_at TIMESTAMPTZ

offline_content              -- BARU: Konten offline untuk app jamaah
  id UUID PK
  departure_id UUID → departures (SET NULL)
  title TEXT NOT NULL
  content_type TEXT ('guide','doa','info','checklist','other')
  content TEXT NOT NULL
  media_urls TEXT[]
  is_active BOOLEAN DEFAULT TRUE
  created_at, updated_at TIMESTAMPTZ

faqs, testimonials, gallery_items, contact_page_content
banners, announcements, menu_items, media_gallery
  ...same as before...
```

---

## Domain 16: Notifications

```
notifications, notification_templates, push_subscriptions
push_outbox, email_logs, email_templates
whatsapp_config, wa_templates, wa_send_logs
wa_broadcast_campaigns, wa_broadcast_logs
sos_alerts
  ...same as before...
```

---

## Storage Buckets

```
agent-ktp             — dokumen KTP agen (private, signed URL)
customer-documents    — KTP, paspor, foto jamaah (private, signed URL)
trip-photos           — foto perjalanan (public read)
payment-proofs        — bukti transfer (private, signed URL)
equipment-photos      — foto perlengkapan (private)
website-assets        — aset website, logo, banner (public read)
marketing-materials   — brosur, materi marketing (mixed)
landing-pages         — aset landing page (public)
```

---

## Indeks Penting (Performance)

```sql
-- Booking lookups
CREATE INDEX ON bookings(customer_id);
CREATE INDEX ON bookings(departure_id);
CREATE INDEX ON bookings(agent_id);
CREATE INDEX ON bookings(payment_status);
CREATE INDEX ON bookings(booking_code);

-- Status history (hot read)
CREATE INDEX ON booking_status_history(booking_id, created_at DESC);

-- User role lookup (hot path untuk RLS)
CREATE INDEX ON user_roles(user_id, role) WHERE is_active = TRUE;

-- Public website queries
CREATE INDEX ON packages(is_published, is_featured, sort_order);
CREATE INDEX ON departures(status, departure_date);

-- Equipment stock
CREATE INDEX ON equipment_stock_history(item_id, created_at DESC);

-- Jamaah location (realtime, partisi by time)
CREATE INDEX ON jamaah_live_locations(customer_id, recorded_at DESC);
CREATE INDEX ON jamaah_live_locations(departure_id, recorded_at DESC);

-- Landing pages
CREATE INDEX ON landing_pages(slug);
CREATE INDEX ON landing_pages(agent_id);
```

---

## Tabel Yang TIDAK Dimasukkan (Deprecated/Redundant)

```
wa_feature_roadmap        — internal notes
admin_activity_log        — duplikasi audit_logs
financial_summary         — replaced by departure_financial_summary
whatsapp_logs             — duplikasi wa_send_logs
siskohat_sync_logs        — integrasi belum aktif
guide_* tables            — guide system belum aktif
onboarding_template_*     — belum aktif
career_history            — belum aktif
webhook_configs/logs      — belum aktif
discount_requests         — gunakan coupons
```
