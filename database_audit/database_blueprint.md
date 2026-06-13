# Database Blueprint — Vinstour Travel Portal
> Desain database baru yang bersih untuk sistem Travel Umroh & Haji
> Semua policy menggunakan `public.has_role()` — tidak ada `role = 'admin'` langsung

---

## Prinsip Desain

1. **ENUM aman** — `public.app_role` untuk semua kolom role, tidak ada TEXT role
2. **RLS via helper** — semua policy pakai `public.has_role()` / `public.has_any_role()`
3. **Idempotent** — semua file `CREATE ... IF NOT EXISTS`
4. **No orphans** — semua FK jelas: CASCADE, SET NULL, atau RESTRICT
5. **Audit built-in** — `audit_logs` menerima INSERT dari trigger di semua tabel kritis
6. **Immutable journal** — double-entry enforced via trigger
7. **Single source of truth** — tidak ada duplikasi tabel dengan tujuan sama

---

## Role Model

```sql
CREATE TYPE public.app_role AS ENUM (
  'super_admin',    -- akses penuh semua fitur
  'owner',          -- pemilik perusahaan
  'it',             -- tim IT, manajemen sistem
  'admin',          -- admin operasional
  'branch_manager', -- manajer cabang
  'finance',        -- tim keuangan
  'operational',    -- tim operasional keberangkatan
  'operator',       -- operator booking
  'sales',          -- tim penjualan
  'marketing',      -- tim marketing
  'equipment',      -- tim perlengkapan
  'agent',          -- agen mitra
  'sub_agent',      -- sub-agen di bawah agen
  'customer',       -- portal customer (legacy)
  'jamaah'          -- jamaah aktif (memiliki booking)
);
```

### Helper Functions
```sql
-- Cek apakah user memiliki role tertentu
CREATE FUNCTION public.has_role(uid UUID, r public.app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND role = r AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Cek apakah user memiliki salah satu dari banyak role
CREATE FUNCTION public.has_any_role(uid UUID, roles public.app_role[])
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = uid AND role = ANY(roles) AND is_active = TRUE
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Shortcut: apakah user adalah admin atau di atasnya
CREATE FUNCTION public.is_staff(uid UUID)
RETURNS BOOLEAN AS $$
  SELECT public.has_any_role(uid, ARRAY[
    'super_admin','owner','it','admin','branch_manager',
    'finance','operational','operator','sales','marketing','equipment'
  ]::public.app_role[]);
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

---

## Domain 1: Authentication
> Dikelola sepenuhnya oleh Supabase Auth

**auth.users** — Supabase native, tidak dimodifikasi

---

## Domain 2: Profiles

```
profiles
  id UUID PK → auth.users.id (CASCADE)
  email TEXT UNIQUE
  full_name TEXT
  phone TEXT
  avatar_url TEXT
  face_descriptor FLOAT8[]      -- untuk face recognition
  is_active BOOLEAN DEFAULT TRUE
  session_version INT DEFAULT 0  -- invalidasi session
  last_sign_in_at TIMESTAMPTZ
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

-- TIDAK ADA kolom role di sini → semua role di user_roles
```

---

## Domain 3: Roles

```
user_roles
  id UUID PK
  user_id UUID → auth.users (CASCADE)
  role public.app_role NOT NULL
  branch_id UUID → branches (SET NULL)   -- scope ke cabang (opsional)
  is_active BOOLEAN DEFAULT TRUE
  granted_by UUID → auth.users (SET NULL)
  granted_at TIMESTAMPTZ DEFAULT NOW()
  expires_at TIMESTAMPTZ                 -- role sementara
  UNIQUE (user_id, role, branch_id)

-- RLS: SELECT → authenticated; INSERT/UPDATE/DELETE → super_admin, it
-- Policy: USING (public.has_any_role(auth.uid(), ARRAY['super_admin','it']))
```

---

## Domain 4: Permissions

```
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
  updated_at TIMESTAMPTZ
  UNIQUE (role, permission_key)
```

---

## Domain 5: Branches

```
branches
  id UUID PK
  name TEXT NOT NULL
  code TEXT UNIQUE
  slug TEXT UNIQUE
  address TEXT
  city TEXT
  province TEXT
  phone TEXT
  email TEXT
  manager_id UUID → profiles (SET NULL)
  is_active BOOLEAN DEFAULT TRUE
  logo_url TEXT
  description TEXT
  meta_data JSONB
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

---

## Domain 6: Agents

```
agents
  id UUID PK
  user_id UUID → auth.users (SET NULL)
  branch_id UUID → branches (SET NULL)
  parent_agent_id UUID → agents (SET NULL)   -- untuk sub-agen
  agent_type TEXT CHECK IN ('agent','sub_agent') DEFAULT 'agent'
  agent_code TEXT UNIQUE
  slug TEXT UNIQUE
  company_name TEXT NOT NULL
  pic_name TEXT
  phone TEXT
  email TEXT
  address TEXT
  city TEXT
  province TEXT
  status TEXT CHECK IN ('active','inactive','suspended','pending')
  commission_rate NUMERIC DEFAULT 0
  plan_type TEXT CHECK IN ('silver','gold','platinum') DEFAULT 'silver'
  max_sub_agents INT
  logo_url TEXT
  website_url TEXT
  notes TEXT
  meta_data JSONB
  joined_at TIMESTAMPTZ
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

agent_wallets
  id UUID PK
  agent_id UUID UNIQUE → agents (CASCADE)
  balance NUMERIC DEFAULT 0
  total_earned NUMERIC DEFAULT 0
  total_withdrawn NUMERIC DEFAULT 0
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

agent_wallet_transactions
  id UUID PK
  wallet_id UUID → agent_wallets (CASCADE)
  type TEXT CHECK IN ('credit','debit')
  amount NUMERIC NOT NULL
  description TEXT
  reference_type TEXT
  reference_id UUID
  created_at TIMESTAMPTZ

agent_commissions
  id UUID PK
  agent_id UUID → agents (CASCADE)
  booking_id UUID → bookings (SET NULL)
  amount NUMERIC NOT NULL
  rate NUMERIC NOT NULL
  status TEXT CHECK IN ('pending','approved','paid','cancelled')
  paid_at TIMESTAMPTZ
  notes TEXT
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

---

## Domain 7: Sub Agents
> Diakomodasi di tabel `agents` dengan kolom `parent_agent_id` + `agent_type = 'sub_agent'`

---

## Domain 8: Jamaah (Customers)

```
customers
  id UUID PK
  user_id UUID → auth.users (SET NULL)
  branch_id UUID → branches (SET NULL)
  agent_id UUID → agents (SET NULL)
  customer_code TEXT UNIQUE
  full_name TEXT NOT NULL
  nik TEXT
  passport_no TEXT
  passport_expiry DATE
  gender TEXT CHECK IN ('male','female')
  birth_date DATE
  birth_place TEXT
  phone TEXT
  email TEXT
  address TEXT, city TEXT, province TEXT, postal_code TEXT
  nationality TEXT DEFAULT 'Indonesia'
  education TEXT
  occupation TEXT
  emergency_contact_name TEXT
  emergency_contact_phone TEXT
  emergency_contact_relation TEXT
  photo_url TEXT
  health_notes TEXT
  status TEXT CHECK IN ('active','inactive','blacklisted')
  notes TEXT
  meta_data JSONB
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

customer_accounts
  id UUID PK
  user_id UUID UNIQUE → auth.users (CASCADE)
  customer_id UUID → customers (SET NULL)
  referred_by_agent_id UUID → agents (SET NULL)
  referred_by_branch_id UUID → branches (SET NULL)
  agent_slug TEXT
  branch_slug TEXT
  loyalty_points INT DEFAULT 0
  total_bookings INT DEFAULT 0
  total_spent NUMERIC DEFAULT 0
  is_verified BOOLEAN DEFAULT FALSE
  verified_at TIMESTAMPTZ
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

customer_documents
  id UUID PK
  customer_id UUID → customers (CASCADE)
  booking_id UUID → bookings (SET NULL)
  document_type TEXT CHECK IN ('ktp','passport','photo','family_card',
    'birth_certificate','marriage_cert','vaccination','other')
  file_url TEXT NOT NULL
  file_name TEXT, file_size INT, mime_type TEXT
  expiry_date DATE
  status TEXT CHECK IN ('pending','verified','rejected','expired')
  notes TEXT
  verified_by UUID → auth.users (SET NULL)
  verified_at TIMESTAMPTZ
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

customer_mahrams
  id UUID PK
  customer_id UUID → customers (CASCADE)
  mahram_id UUID → customers (CASCADE)
  relationship TEXT NOT NULL
  notes TEXT
  created_at TIMESTAMPTZ
  UNIQUE (customer_id, mahram_id)

muthawifs
  id UUID PK
  user_id UUID → auth.users (SET NULL)
  branch_id UUID → branches (SET NULL)
  full_name TEXT NOT NULL
  phone TEXT, email TEXT, nik TEXT
  gender TEXT CHECK IN ('male','female')
  specialization TEXT
  languages TEXT[]
  photo_url TEXT
  certification_no TEXT
  is_available BOOLEAN DEFAULT TRUE
  is_active BOOLEAN DEFAULT TRUE
  notes TEXT
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

---

## Domain 9: Packages

```
airlines
  id UUID PK
  name TEXT NOT NULL
  iata_code TEXT UNIQUE
  icao_code TEXT
  logo_url TEXT
  country TEXT
  is_active BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

airports
  id UUID PK
  iata_code TEXT NOT NULL UNIQUE
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
  city TEXT CHECK IN ('makkah','madinah','jeddah','other')
  address TEXT
  star_rating INT CHECK BETWEEN 1 AND 5
  distance_to_haram NUMERIC
  photo_url TEXT
  photos TEXT[]
  amenities TEXT[]
  description TEXT
  is_active BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

hotel_room_capacities
  id UUID PK
  hotel_id UUID → hotels (CASCADE)
  room_type TEXT CHECK IN ('quad','triple','double','single')
  capacity INT DEFAULT 4
  UNIQUE (hotel_id, room_type)

vendors
  id UUID PK
  name TEXT NOT NULL
  vendor_type TEXT CHECK IN ('airline','hotel','transport','visa',
    'insurance','catering','general')
  contact_person TEXT, phone TEXT, email TEXT
  address TEXT, country TEXT
  currency TEXT DEFAULT 'IDR'
  payment_terms TEXT
  tax_number TEXT
  is_active BOOLEAN DEFAULT TRUE
  notes TEXT
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

packages
  id UUID PK
  name TEXT NOT NULL
  code TEXT UNIQUE
  slug TEXT UNIQUE
  package_type TEXT CHECK IN ('umroh','haji','wisata','haji_plus')
  duration_days INT DEFAULT 9
  airline_id UUID → airlines (SET NULL)
  hotel_makkah_id UUID → hotels (SET NULL)
  hotel_madinah_id UUID → hotels (SET NULL)
  hotel_makkah_nights INT DEFAULT 4
  hotel_madinah_nights INT DEFAULT 4
  room_type_default TEXT CHECK IN ('quad','triple','double','single')
  base_price_quad NUMERIC DEFAULT 0
  base_price_triple NUMERIC DEFAULT 0
  base_price_double NUMERIC DEFAULT 0
  base_price_single NUMERIC DEFAULT 0
  includes TEXT[], excludes TEXT[]
  description TEXT, highlights TEXT[]
  itinerary JSONB
  photo_url TEXT, photos TEXT[], thumbnail_url TEXT
  label_id UUID → package_labels (SET NULL)
  group_id UUID → package_groups (SET NULL)
  view_count INT DEFAULT 0
  is_published BOOLEAN DEFAULT FALSE
  is_featured BOOLEAN DEFAULT FALSE
  sort_order INT DEFAULT 0
  seo_title TEXT, seo_description TEXT, seo_keywords TEXT[]
  created_by UUID → auth.users (SET NULL)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

---

## Domain 10: Package Departures

```
departures
  id UUID PK
  package_id UUID → packages (RESTRICT)
  airline_id UUID → airlines (SET NULL)
  hotel_makkah_id UUID → hotels (SET NULL)
  hotel_madinah_id UUID → hotels (SET NULL)
  departure_date DATE NOT NULL
  return_date DATE NOT NULL
  quota INT DEFAULT 40
  available_seats INT DEFAULT 40
  status TEXT CHECK IN ('draft','open','full','closed','departed','completed','cancelled')
  price_quad NUMERIC, price_triple NUMERIC
  price_double NUMERIC, price_single NUMERIC
  flight_number TEXT, flight_number_return TEXT
  embarkation_city TEXT
  notes TEXT, internal_notes TEXT
  lead_pic UUID → profiles (SET NULL)
  branch_id UUID → branches (SET NULL)
  created_by UUID → auth.users (SET NULL)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

departure_multi_hotels
  id UUID PK
  departure_id UUID → departures (CASCADE)
  city TEXT NOT NULL
  hotel_id UUID → hotels (SET NULL)
  check_in_date DATE, check_out_date DATE
  nights INT
  notes TEXT
  sort_order INT DEFAULT 0

trip_timeline
  id UUID PK
  departure_id UUID → departures (CASCADE)
  day_number INT NOT NULL
  event_date DATE
  title TEXT NOT NULL
  description TEXT
  location TEXT
  event_type TEXT CHECK IN ('flight','hotel','ibadah','activity','transfer','free')
  sort_order INT DEFAULT 0
  created_at TIMESTAMPTZ

departure_cost_items
  id UUID PK
  departure_id UUID → departures (CASCADE)
  vendor_id UUID → vendors (SET NULL)
  item_name TEXT NOT NULL
  item_type TEXT CHECK IN ('per_pax','fixed','per_room','per_night')
  quantity INT DEFAULT 1
  unit_cost_usd NUMERIC DEFAULT 0
  unit_cost_idr NUMERIC DEFAULT 0
  exchange_rate NUMERIC DEFAULT 1
  total_cost_idr NUMERIC DEFAULT 0
  is_planned BOOLEAN DEFAULT FALSE   -- rencana vs aktual
  notes TEXT
  invoice_id UUID → vendor_invoices (SET NULL)
  created_by UUID → auth.users (SET NULL)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

departure_expenses
  id UUID PK
  departure_id UUID → departures (CASCADE)
  category TEXT CHECK IN ('operational','transport','meals','guide',
    'commission','insurance','other')
  description TEXT NOT NULL
  amount_idr NUMERIC DEFAULT 0
  amount_usd NUMERIC DEFAULT 0
  exchange_rate NUMERIC DEFAULT 1
  expense_date DATE DEFAULT CURRENT_DATE
  vendor_id UUID → vendors (SET NULL)
  receipt_url TEXT
  approved_by UUID → auth.users (SET NULL)
  approved_at TIMESTAMPTZ
  status TEXT CHECK IN ('pending','approved','rejected')
  created_by UUID → auth.users (SET NULL)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

departure_financial_summary
  id UUID PK
  departure_id UUID UNIQUE → departures (CASCADE)
  quota INT DEFAULT 0
  pax_confirmed INT DEFAULT 0
  pax_cancelled INT DEFAULT 0
  revenue_gross NUMERIC DEFAULT 0
  revenue_paid NUMERIC DEFAULT 0
  revenue_outstanding NUMERIC DEFAULT 0
  revenue_refunded NUMERIC DEFAULT 0
  hpp_total NUMERIC DEFAULT 0
  expense_total NUMERIC DEFAULT 0
  other_revenue_total NUMERIC DEFAULT 0
  gross_profit NUMERIC GENERATED ALWAYS AS (...) STORED
  gross_margin_pct NUMERIC GENERATED ALWAYS AS (...) STORED
  last_calculated_at TIMESTAMPTZ DEFAULT NOW()
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

---

## Domain 13: Bookings

```
bookings
  id UUID PK
  booking_code TEXT UNIQUE NOT NULL
  customer_id UUID → customers (RESTRICT)
  departure_id UUID → departures (SET NULL)
  agent_id UUID → agents (SET NULL)
  branch_id UUID → branches (SET NULL)
  handled_by UUID → profiles (SET NULL)
  coupon_id UUID → coupons (SET NULL)
  status TEXT CHECK IN ('pending','confirmed','awaiting_documents',
    'documents_complete','visa_processing','completed','cancelled')
  room_type TEXT CHECK IN ('quad','triple','double','single')
  total_pax INT DEFAULT 1
  total_price NUMERIC DEFAULT 0
  discount_amount NUMERIC DEFAULT 0
  paid_amount NUMERIC DEFAULT 0
  remaining_amount NUMERIC GENERATED ALWAYS AS (...) STORED
  payment_status TEXT CHECK IN ('unpaid','partial','paid','refunded','overpaid')
  payment_deadline DATE
  special_requests TEXT, internal_notes TEXT
  cancelled_at TIMESTAMPTZ, cancellation_reason TEXT
  confirmed_at TIMESTAMPTZ, completed_at TIMESTAMPTZ
  source TEXT CHECK IN ('staff','portal','agent','website','api')
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

---

## Domain 14: Booking Participants

```
booking_passengers (= booking participants)
  id UUID PK
  booking_id UUID → bookings (CASCADE)
  customer_id UUID → customers (SET NULL)
  full_name TEXT NOT NULL
  nik TEXT, passport_no TEXT, passport_expiry DATE
  gender TEXT CHECK IN ('male','female')
  birth_date DATE
  birth_place TEXT
  nationality TEXT DEFAULT 'Indonesia'
  mahram_of UUID → booking_passengers (SET NULL)  -- relasi mahram
  room_type TEXT CHECK IN ('quad','triple','double','single')
  seat_number TEXT
  is_lead_passenger BOOLEAN DEFAULT FALSE
  notes TEXT
  created_at TIMESTAMPTZ

room_assignments
  id UUID PK
  departure_id UUID → departures (CASCADE)
  room_number TEXT NOT NULL
  room_type TEXT CHECK IN ('quad','triple','double','single')
  hotel_id UUID → hotels (SET NULL)
  floor INT
  notes TEXT
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

visa_applications
  id UUID PK
  booking_id UUID → bookings (CASCADE)
  passenger_id UUID → booking_passengers (SET NULL)
  application_date DATE
  status TEXT CHECK IN ('pending','submitted','processing','approved','rejected','expired')
  visa_number TEXT
  visa_expiry DATE
  submitted_at TIMESTAMPTZ
  approved_at TIMESTAMPTZ
  rejection_reason TEXT
  document_url TEXT
  notes TEXT
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

---

## Domain 15: Payments

```
bank_accounts
  id UUID PK
  bank_name TEXT NOT NULL
  account_number TEXT NOT NULL
  account_name TEXT NOT NULL
  branch_name TEXT
  is_primary BOOLEAN DEFAULT FALSE
  is_active BOOLEAN DEFAULT TRUE
  qr_code_url TEXT
  notes TEXT
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

payments
  id UUID PK
  payment_code TEXT UNIQUE NOT NULL
  booking_id UUID → bookings (RESTRICT)
  amount NUMERIC NOT NULL
  payment_date DATE NOT NULL
  payment_method TEXT CHECK IN ('transfer','cash','virtual_account',
    'credit_card','debit_card','qris','other')
  bank_account_id UUID → bank_accounts (SET NULL)
  proof_url TEXT
  notes TEXT
  status TEXT CHECK IN ('pending','verified','rejected','refunded')
  confirmed_by UUID → auth.users (SET NULL)
  confirmed_at TIMESTAMPTZ
  rejected_reason TEXT
  created_by UUID → auth.users (SET NULL)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

coupons
  id UUID PK
  code TEXT UNIQUE NOT NULL
  name TEXT NOT NULL
  description TEXT
  discount_type TEXT CHECK IN ('percentage','fixed')
  discount_value NUMERIC NOT NULL
  min_booking_value NUMERIC DEFAULT 0
  max_discount NUMERIC
  max_usage INT
  usage_count INT DEFAULT 0
  usage_per_user INT DEFAULT 1
  valid_from TIMESTAMPTZ
  valid_until TIMESTAMPTZ
  applicable_to TEXT CHECK IN ('all','package','departure')
  package_ids UUID[]
  is_active BOOLEAN DEFAULT TRUE
  created_by UUID → auth.users (SET NULL)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

savings_plans
  id UUID PK
  customer_id UUID → customers (CASCADE)
  agent_id UUID → agents (SET NULL)
  branch_id UUID → branches (SET NULL)
  plan_code TEXT UNIQUE NOT NULL
  target_package_id UUID → packages (SET NULL)
  target_amount NUMERIC NOT NULL
  saved_amount NUMERIC DEFAULT 0
  monthly_target NUMERIC
  status TEXT CHECK IN ('active','paused','completed','cancelled','converted')
  started_at DATE
  target_date DATE
  converted_booking_id UUID → bookings (SET NULL)
  converted_at TIMESTAMPTZ
  notes TEXT
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

savings_deposits
  id UUID PK
  plan_id UUID → savings_plans (CASCADE)
  deposit_code TEXT UNIQUE NOT NULL
  amount NUMERIC NOT NULL
  deposit_date DATE NOT NULL DEFAULT CURRENT_DATE
  payment_method TEXT CHECK IN ('transfer','cash','virtual_account','other')
  proof_url TEXT
  status TEXT CHECK IN ('pending','verified','rejected')
  verified_by UUID → auth.users (SET NULL)
  verified_at TIMESTAMPTZ
  notes TEXT
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

---

## Domain 16: Finance

```
chart_of_accounts (COA)
  id UUID PK
  code TEXT UNIQUE NOT NULL
  name TEXT NOT NULL
  type TEXT CHECK IN ('asset','liability','equity','revenue','cogs','expense')
  parent_code TEXT → chart_of_accounts (SET NULL)
  description TEXT
  is_active BOOLEAN DEFAULT TRUE
  sort_order INT DEFAULT 0
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

journal_entries
  id UUID PK
  entry_number TEXT UNIQUE
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE
  type TEXT CHECK IN ('general','sales','purchase','payment','receipt','adjustment')
  description TEXT NOT NULL
  reference_type TEXT    -- 'booking', 'payment', 'vendor_invoice', etc.
  reference_id UUID
  total_debit NUMERIC DEFAULT 0
  total_credit NUMERIC DEFAULT 0
  status TEXT CHECK IN ('draft','posted','voided')
  posted_by UUID → auth.users
  posted_at TIMESTAMPTZ
  notes TEXT
  created_by UUID → auth.users
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

journal_lines
  id UUID PK
  journal_id UUID → journal_entries (CASCADE)
  account_code TEXT → chart_of_accounts (RESTRICT)
  debit NUMERIC DEFAULT 0
  credit NUMERIC DEFAULT 0
  description TEXT
  currency TEXT DEFAULT 'IDR'
  exchange_rate NUMERIC DEFAULT 1
  created_at TIMESTAMPTZ

vendor_invoices
  id UUID PK
  vendor_id UUID → vendors (RESTRICT)
  departure_id UUID → departures (SET NULL)
  invoice_number TEXT NOT NULL
  invoice_date DATE NOT NULL
  due_date DATE
  amount_usd NUMERIC DEFAULT 0
  amount_idr NUMERIC DEFAULT 0
  exchange_rate NUMERIC DEFAULT 1
  currency TEXT DEFAULT 'IDR'
  status TEXT CHECK IN ('pending','approved','paid','disputed','cancelled')
  description TEXT, file_url TEXT
  paid_at TIMESTAMPTZ, paid_by UUID → auth.users
  approved_by UUID → auth.users, approved_at TIMESTAMPTZ
  notes TEXT
  created_by UUID → auth.users
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

commissions
  id UUID PK
  type TEXT CHECK IN ('agent','branch','referral','employee')
  booking_id UUID → bookings (SET NULL)
  agent_id UUID → agents (SET NULL)
  branch_id UUID → branches (SET NULL)
  employee_id UUID → employees (SET NULL)
  commission_rate NUMERIC DEFAULT 0
  commission_amount NUMERIC DEFAULT 0
  currency TEXT DEFAULT 'IDR'
  status TEXT CHECK IN ('pending','approved','paid','cancelled')
  paid_at TIMESTAMPTZ, paid_by UUID → auth.users
  notes TEXT
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

payroll
  id UUID PK
  period_month INT CHECK BETWEEN 1 AND 12
  period_year INT
  branch_id UUID → branches (SET NULL)
  total_gross NUMERIC DEFAULT 0
  total_deduction NUMERIC DEFAULT 0
  total_net NUMERIC DEFAULT 0
  employee_count INT DEFAULT 0
  status TEXT CHECK IN ('draft','finalized','paid','cancelled')
  finalized_by UUID → auth.users, finalized_at TIMESTAMPTZ
  paid_at TIMESTAMPTZ, notes TEXT
  created_by UUID → auth.users
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
  UNIQUE (period_month, period_year, branch_id)

payroll_slips
  id UUID PK
  payroll_id UUID → payroll (CASCADE)
  employee_id UUID → employees (RESTRICT)
  base_salary NUMERIC DEFAULT 0
  allowances NUMERIC DEFAULT 0
  overtime NUMERIC DEFAULT 0
  bonus NUMERIC DEFAULT 0
  gross_salary NUMERIC DEFAULT 0
  bpjs_tk NUMERIC DEFAULT 0
  bpjs_kes NUMERIC DEFAULT 0
  income_tax NUMERIC DEFAULT 0
  other_deductions NUMERIC DEFAULT 0
  net_salary NUMERIC DEFAULT 0
  components JSONB    -- detail breakdown
  paid_at TIMESTAMPTZ
  notes TEXT
  created_at TIMESTAMPTZ
  UNIQUE (payroll_id, employee_id)

cashflow_entries
  id UUID PK
  entry_date DATE DEFAULT CURRENT_DATE
  type TEXT CHECK IN ('inflow','outflow')
  category TEXT NOT NULL
  description TEXT NOT NULL
  amount NUMERIC DEFAULT 0
  reference_type TEXT
  reference_id UUID
  notes TEXT
  created_by UUID → auth.users
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

---

## Domain 17: Equipment

```
equipment_items
  id UUID PK
  name TEXT NOT NULL
  category TEXT CHECK IN ('koper','seragam','gelang','mukena','sajadah',
    'tas','perlengkapan_ibadah','lainnya')
  description TEXT
  sku TEXT UNIQUE
  stock_qty INT DEFAULT 0
  distributed_qty INT DEFAULT 0
  returned_qty INT DEFAULT 0
  available_qty INT GENERATED ALWAYS AS (stock_qty - distributed_qty + returned_qty) STORED
  unit_cost NUMERIC DEFAULT 0
  photo_url TEXT
  is_active BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

equipment_distributions
  id UUID PK
  equipment_item_id UUID → equipment_items (RESTRICT)
  booking_passenger_id UUID → booking_passengers (SET NULL)
  departure_id UUID → departures (SET NULL)
  quantity INT DEFAULT 1
  distributed_at TIMESTAMPTZ DEFAULT NOW()
  distributed_by UUID → auth.users (SET NULL)
  received_at TIMESTAMPTZ
  received_by_signature TEXT
  returned_at TIMESTAMPTZ
  return_condition TEXT CHECK IN ('good','damaged','lost')
  notes TEXT
  status TEXT CHECK IN ('pending','distributed','received','returned','lost')
  photo_url TEXT    -- foto kondisi saat return
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

---

## Domain 18: Marketing

```
leads
  id UUID PK
  full_name TEXT NOT NULL
  phone TEXT, email TEXT
  source TEXT CHECK IN ('website','whatsapp','referral','walk_in',
    'social_media','agent','other')
  interest TEXT
  package_id UUID → packages (SET NULL)
  branch_id UUID → branches (SET NULL)
  agent_id UUID → agents (SET NULL)
  assigned_to UUID → auth.users (SET NULL)
  status TEXT CHECK IN ('new','contacted','interested','negotiating',
    'converted','lost','inactive')
  notes TEXT
  last_contact TIMESTAMPTZ
  converted_at TIMESTAMPTZ
  customer_id UUID → customers (SET NULL)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

referral_codes
  id UUID PK
  code TEXT UNIQUE NOT NULL
  owner_type TEXT CHECK IN ('agent','branch','customer')
  owner_id UUID NOT NULL
  discount_percent NUMERIC DEFAULT 0
  commission_percent NUMERIC DEFAULT 0
  usage_count INT DEFAULT 0
  max_usage INT
  is_active BOOLEAN DEFAULT TRUE
  expires_at TIMESTAMPTZ
  created_at TIMESTAMPTZ

referral_usages
  id UUID PK
  referral_code_id UUID → referral_codes (RESTRICT)
  booking_id UUID → bookings (SET NULL)
  used_by UUID → auth.users (SET NULL)
  discount_applied NUMERIC DEFAULT 0
  commission_earned NUMERIC DEFAULT 0
  created_at TIMESTAMPTZ

loyalty_points
  id UUID PK
  customer_id UUID → customers (CASCADE)
  booking_id UUID → bookings (SET NULL)
  points INT NOT NULL
  type TEXT CHECK IN ('earned','redeemed','expired','adjusted')
  description TEXT
  expires_at TIMESTAMPTZ
  created_at TIMESTAMPTZ
```

---

## Domain 19: CRM

```
contact_messages
  id UUID PK
  full_name TEXT NOT NULL
  phone TEXT, email TEXT
  subject TEXT
  message TEXT NOT NULL
  source TEXT DEFAULT 'website'
  is_read BOOLEAN DEFAULT FALSE
  replied_at TIMESTAMPTZ
  replied_by UUID → auth.users (SET NULL)
  created_at TIMESTAMPTZ
```

---

## Domain 20: Notifications

```
notifications
  id UUID PK
  user_id UUID → auth.users (CASCADE)
  title TEXT NOT NULL
  message TEXT
  type TEXT CHECK IN ('booking','payment','system','reminder','marketing')
  reference_type TEXT
  reference_id UUID
  is_read BOOLEAN DEFAULT FALSE
  read_at TIMESTAMPTZ
  created_at TIMESTAMPTZ

notification_templates
  id UUID PK
  key TEXT UNIQUE NOT NULL
  title TEXT NOT NULL
  body TEXT NOT NULL
  channel TEXT CHECK IN ('in_app','push','email','whatsapp')
  variables JSONB    -- daftar variabel yang tersedia
  is_active BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

push_subscriptions
  id UUID PK
  user_id UUID → auth.users (CASCADE)
  endpoint TEXT NOT NULL
  p256dh TEXT NOT NULL
  auth TEXT NOT NULL
  created_at TIMESTAMPTZ
  UNIQUE (user_id, endpoint)

push_outbox
  id UUID PK
  user_id UUID → auth.users (SET NULL)
  title TEXT NOT NULL
  body TEXT
  url TEXT
  status TEXT CHECK IN ('pending','sent','failed')
  attempts INT DEFAULT 0
  sent_at TIMESTAMPTZ
  error TEXT
  created_at TIMESTAMPTZ

email_logs
  id UUID PK
  to_email TEXT NOT NULL
  subject TEXT NOT NULL
  template_key TEXT
  status TEXT CHECK IN ('pending','sent','failed')
  error TEXT
  sent_at TIMESTAMPTZ
  created_at TIMESTAMPTZ

announcements
  id UUID PK
  message TEXT NOT NULL
  bg_color TEXT DEFAULT '#000000'
  text_color TEXT DEFAULT '#ffffff'
  link_url TEXT, link_text TEXT
  is_active BOOLEAN DEFAULT TRUE
  starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ
  sort_order INT DEFAULT 0
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

banners
  id UUID PK
  title TEXT, subtitle TEXT
  image_url TEXT NOT NULL
  link_url TEXT
  is_active BOOLEAN DEFAULT TRUE
  sort_order INT DEFAULT 0
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

whatsapp_config
  id UUID PK
  provider TEXT DEFAULT 'official'
  api_url TEXT
  api_token TEXT
  phone_number TEXT
  business_id TEXT
  is_active BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

wa_templates
  id UUID PK
  name TEXT UNIQUE NOT NULL
  category TEXT CHECK IN ('marketing','utility','authentication')
  language TEXT DEFAULT 'id'
  header TEXT, body TEXT NOT NULL, footer TEXT
  variables TEXT[]
  status TEXT CHECK IN ('draft','pending','approved','rejected')
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

wa_send_logs
  id UUID PK
  template_id UUID → wa_templates (SET NULL)
  recipient_phone TEXT NOT NULL
  recipient_name TEXT
  variables JSONB
  status TEXT CHECK IN ('pending','sent','delivered','read','failed')
  sent_at TIMESTAMPTZ
  error TEXT
  created_at TIMESTAMPTZ

wa_broadcast_campaigns
  id UUID PK
  name TEXT NOT NULL
  template_id UUID → wa_templates (SET NULL)
  target_filter JSONB
  scheduled_at TIMESTAMPTZ
  sent_count INT DEFAULT 0
  failed_count INT DEFAULT 0
  status TEXT CHECK IN ('draft','scheduled','running','completed','cancelled')
  created_by UUID → auth.users (SET NULL)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

wa_broadcast_logs
  id UUID PK
  campaign_id UUID → wa_broadcast_campaigns (CASCADE)
  recipient_phone TEXT NOT NULL
  status TEXT CHECK IN ('pending','sent','failed')
  sent_at TIMESTAMPTZ
  error TEXT
  created_at TIMESTAMPTZ

sos_alerts
  id UUID PK
  customer_id UUID → customers (SET NULL)
  departure_id UUID → departures (SET NULL)
  message TEXT
  location_lat NUMERIC, location_lng NUMERIC
  status TEXT CHECK IN ('active','acknowledged','resolved')
  acknowledged_by UUID → auth.users (SET NULL)
  acknowledged_at TIMESTAMPTZ
  resolved_at TIMESTAMPTZ
  created_at TIMESTAMPTZ
```

---

## Domain 21: Audit Logs

```
audit_logs
  id UUID PK
  user_id UUID → auth.users (SET NULL)
  actor_role public.app_role
  action TEXT NOT NULL    -- 'INSERT','UPDATE','DELETE','LOGIN','EXPORT'
  table_name TEXT
  record_id UUID
  before_data JSONB
  after_data JSONB
  ip_address INET
  user_agent TEXT
  created_at TIMESTAMPTZ DEFAULT NOW()

rbac_audit_trail
  id UUID PK
  changed_by UUID → auth.users (SET NULL)
  target_user_id UUID → auth.users (SET NULL)
  action TEXT CHECK IN ('role_granted','role_revoked','permission_changed')
  role public.app_role
  details JSONB
  created_at TIMESTAMPTZ
```

---

## Domain 22: Website CMS

```
website_settings
  id UUID PK DEFAULT '00000000-0000-0000-0000-000000000001'
  site_name TEXT
  tagline TEXT
  logo_url TEXT, favicon_url TEXT
  primary_color TEXT, secondary_color TEXT
  contact_phone TEXT, contact_email TEXT, contact_address TEXT
  social_wa TEXT, social_ig TEXT, social_fb TEXT, social_yt TEXT
  meta_description TEXT, meta_keywords TEXT[]
  google_analytics_id TEXT
  is_maintenance BOOLEAN DEFAULT FALSE
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

faqs
  id UUID PK
  question TEXT NOT NULL
  answer TEXT NOT NULL
  category TEXT
  is_published BOOLEAN DEFAULT TRUE
  sort_order INT DEFAULT 0
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

testimonials
  id UUID PK
  customer_name TEXT NOT NULL
  customer_photo TEXT
  rating INT CHECK BETWEEN 1 AND 5
  content TEXT NOT NULL
  package_type TEXT
  departure_year INT
  is_featured BOOLEAN DEFAULT FALSE
  is_published BOOLEAN DEFAULT TRUE
  sort_order INT DEFAULT 0
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

gallery_items
  id UUID PK
  title TEXT
  image_url TEXT NOT NULL
  category TEXT
  sort_order INT DEFAULT 0
  is_active BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ

contact_page_content
  id UUID PK DEFAULT '00000000-0000-0000-0000-000000000002'
  address TEXT, phone TEXT, email TEXT
  maps_embed_url TEXT
  office_hours TEXT
  whatsapp TEXT
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

menu_items
  id UUID PK
  label TEXT NOT NULL
  icon TEXT, path TEXT
  permission TEXT
  parent_id UUID → menu_items (CASCADE)
  sort_order INT DEFAULT 0
  is_active BOOLEAN DEFAULT TRUE
  roles public.app_role[]    -- role mana yang bisa lihat menu ini
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

---

## Domain 23: System Settings

```
company_settings
  id UUID PK
  setting_key TEXT UNIQUE NOT NULL
  setting_value TEXT NOT NULL DEFAULT 'null'
  setting_type TEXT CHECK IN ('string','number','boolean','json','url')
  description TEXT
  is_public BOOLEAN DEFAULT FALSE
  updated_by UUID → auth.users (SET NULL)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

staff_invitations
  id UUID PK
  email TEXT NOT NULL
  role public.app_role NOT NULL
  invited_by UUID → auth.users (SET NULL)
  branch_id UUID → branches (SET NULL)
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex')
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '7 days'
  accepted_at TIMESTAMPTZ
  created_at TIMESTAMPTZ

otp_codes
  id UUID PK
  user_id UUID → auth.users (CASCADE)
  code TEXT NOT NULL
  purpose TEXT CHECK IN ('login','email_verify','phone_verify','password_reset')
  expires_at TIMESTAMPTZ NOT NULL
  used_at TIMESTAMPTZ
  created_at TIMESTAMPTZ

user_2fa_settings
  id UUID PK
  user_id UUID UNIQUE → auth.users (CASCADE)
  totp_secret TEXT
  is_enabled BOOLEAN DEFAULT FALSE
  backup_codes TEXT[]
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

membership_plans
  id UUID PK
  name TEXT NOT NULL
  type TEXT CHECK IN ('silver','gold','platinum') UNIQUE
  commission_base NUMERIC DEFAULT 0
  max_sub_agents INT DEFAULT 0
  monthly_fee NUMERIC DEFAULT 0
  features JSONB
  is_active BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
```

---

## Storage Buckets (Supabase Storage)

```
agent-ktp         — dokumen KTP agen (private, signed URL)
customer-documents — KTP, paspor, foto jamaah (private, signed URL)
trip-photos       — foto perjalanan (public read)
payment-proofs    — bukti transfer (private, signed URL)
equipment-photos  — foto kondisi perlengkapan (private)
website-assets    — aset website, logo, banner (public read)
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

-- Payment tracking
CREATE INDEX ON payments(booking_id);
CREATE INDEX ON payments(status);

-- User role lookup (hot path untuk RLS)
CREATE INDEX ON user_roles(user_id, role) WHERE is_active = TRUE;

-- Public website queries
CREATE INDEX ON packages(is_published, is_featured, sort_order);
CREATE INDEX ON departures(status, departure_date);

-- Journal balance
CREATE INDEX ON journal_lines(journal_id);
CREATE INDEX ON journal_lines(account_code);
```
