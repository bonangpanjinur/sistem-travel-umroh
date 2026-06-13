-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 005: Finance, HR, E-Commerce & Communications Tables
--   chart_of_accounts, journal_entries, journal_lines, vendor_invoices,
--   commissions, payroll, payroll_slips, payroll_components,
--   leave_requests, performance_reviews,
--   company_settings, loyalty_points, withdrawal_requests,
--   departure_cost_items, departure_expenses, departure_other_revenues,
--   departure_financial_summary, cashflow_entries, scheduled_reports,
--   ar_reminder_log,
--   store_categories, store_products, store_product_variants,
--   store_orders, store_order_items, store_order_payments,
--   store_shipments, store_product_reviews,
--   whatsapp_config, wa_templates, wa_send_logs, whatsapp_logs,
--   wa_broadcast_campaigns, wa_broadcast_logs, wa_feature_roadmap
-- Run AFTER 004. Idempotent — IF NOT EXISTS throughout.
-- RLS policies: see 009_rls_policies.sql
-- Triggers:     see 008_triggers.sql
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. CHART_OF_ACCOUNTS — Bagan akun keuangan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code         TEXT        NOT NULL UNIQUE,
  name         TEXT        NOT NULL,
  type         TEXT        NOT NULL
                           CHECK (type IN ('asset','liability','equity','revenue','cogs','expense')),
  parent_code  TEXT        REFERENCES public.chart_of_accounts(code) ON DELETE SET NULL,
  description  TEXT,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 2. JOURNAL_ENTRIES — Jurnal akuntansi (double-entry)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_number   TEXT        UNIQUE,
  entry_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  type           TEXT        NOT NULL DEFAULT 'general'
                             CHECK (type IN ('general','sales','purchase','payment',
                                              'receipt','adjustment')),
  description    TEXT        NOT NULL,
  reference_type TEXT,
  reference_id   UUID,
  total_debit    NUMERIC     NOT NULL DEFAULT 0,
  total_credit   NUMERIC     NOT NULL DEFAULT 0,
  status         TEXT        NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft','posted','voided')),
  posted_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  posted_at      TIMESTAMPTZ,
  voided_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  voided_at      TIMESTAMPTZ,
  notes          TEXT,
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 3. JOURNAL_LINES — Baris jurnal (debit/kredit)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.journal_lines (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id     UUID        NOT NULL REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  account_code   TEXT        NOT NULL REFERENCES public.chart_of_accounts(code) ON DELETE RESTRICT,
  debit          NUMERIC     NOT NULL DEFAULT 0,
  credit         NUMERIC     NOT NULL DEFAULT 0,
  description    TEXT,
  currency       TEXT        NOT NULL DEFAULT 'IDR',
  exchange_rate  NUMERIC     NOT NULL DEFAULT 1,
  amount_foreign NUMERIC,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.journal_lines ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 4. VENDOR_INVOICES — Tagihan dari vendor / supplier
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_invoices (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id      UUID        NOT NULL REFERENCES public.vendors(id) ON DELETE RESTRICT,
  departure_id   UUID        REFERENCES public.departures(id) ON DELETE SET NULL,
  invoice_number TEXT        NOT NULL,
  invoice_date   DATE        NOT NULL,
  due_date       DATE,
  amount_usd     NUMERIC     NOT NULL DEFAULT 0,
  amount_idr     NUMERIC     NOT NULL DEFAULT 0,
  exchange_rate  NUMERIC     NOT NULL DEFAULT 1,
  currency       TEXT        NOT NULL DEFAULT 'IDR',
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','approved','paid','disputed','cancelled')),
  description    TEXT,
  file_url       TEXT,
  paid_at        TIMESTAMPTZ,
  paid_by        UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at    TIMESTAMPTZ,
  notes          TEXT,
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.vendor_invoices ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 5. COMMISSIONS — Komisi agen & karyawan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commissions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type             TEXT        NOT NULL DEFAULT 'agent'
                               CHECK (type IN ('agent','branch','referral','employee')),
  booking_id       UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  agent_id         UUID        REFERENCES public.agents(id) ON DELETE SET NULL,
  branch_id        UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  employee_id      UUID        REFERENCES public.employees(id) ON DELETE SET NULL,
  commission_rate  NUMERIC     NOT NULL DEFAULT 0,
  commission_amount NUMERIC    NOT NULL DEFAULT 0,
  currency         TEXT        NOT NULL DEFAULT 'IDR',
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','paid','cancelled')),
  paid_at          TIMESTAMPTZ,
  paid_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 6. PAYROLL — Periode penggajian
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payroll (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  period_month    INTEGER     NOT NULL CHECK (period_month BETWEEN 1 AND 12),
  period_year     INTEGER     NOT NULL CHECK (period_year BETWEEN 2020 AND 2099),
  branch_id       UUID        REFERENCES public.branches(id) ON DELETE SET NULL,
  total_gross     NUMERIC     NOT NULL DEFAULT 0,
  total_deduction NUMERIC     NOT NULL DEFAULT 0,
  total_net       NUMERIC     NOT NULL DEFAULT 0,
  employee_count  INTEGER     NOT NULL DEFAULT 0,
  status          TEXT        NOT NULL DEFAULT 'draft'
                              CHECK (status IN ('draft','finalized','paid','cancelled')),
  finalized_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  finalized_at    TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (period_month, period_year, branch_id)
);

ALTER TABLE public.payroll ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 7. PAYROLL_SLIPS — Slip gaji individual per karyawan per periode
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payroll_slips (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_id       UUID        NOT NULL REFERENCES public.payroll(id) ON DELETE CASCADE,
  employee_id      UUID        NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  base_salary      NUMERIC     NOT NULL DEFAULT 0,
  allowances       NUMERIC     NOT NULL DEFAULT 0,
  overtime         NUMERIC     NOT NULL DEFAULT 0,
  bonus            NUMERIC     NOT NULL DEFAULT 0,
  gross_salary     NUMERIC     NOT NULL DEFAULT 0,
  bpjs_tk          NUMERIC     NOT NULL DEFAULT 0,
  bpjs_kes         NUMERIC     NOT NULL DEFAULT 0,
  income_tax       NUMERIC     NOT NULL DEFAULT 0,
  other_deductions NUMERIC     NOT NULL DEFAULT 0,
  net_salary       NUMERIC     NOT NULL DEFAULT 0,
  components       JSONB,
  paid_at          TIMESTAMPTZ,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (payroll_id, employee_id)
);

ALTER TABLE public.payroll_slips ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 8. LEAVE_REQUESTS — Pengajuan cuti karyawan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type     TEXT        NOT NULL DEFAULT 'annual'
                             CHECK (leave_type IN ('annual','sick','personal','emergency','unpaid')),
  start_date     DATE        NOT NULL,
  end_date       DATE        NOT NULL,
  days_count     INTEGER,
  reason         TEXT,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','approved','rejected','cancelled')),
  reviewed_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at    TIMESTAMPTZ,
  reviewer_notes TEXT,
  attachment_url TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 9. PERFORMANCE_REVIEWS — Penilaian kinerja karyawan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.performance_reviews (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id    UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  reviewer_id    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  period_month   INTEGER     CHECK (period_month BETWEEN 1 AND 12),
  period_year    INTEGER,
  overall_score  NUMERIC     CHECK (overall_score BETWEEN 0 AND 100),
  kpi_scores     JSONB,
  strengths      TEXT,
  improvements   TEXT,
  notes          TEXT,
  status         TEXT        NOT NULL DEFAULT 'draft'
                             CHECK (status IN ('draft','submitted','acknowledged')),
  submitted_at   TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 10. COMPANY_SETTINGS — Konfigurasi sistem global (key-value store)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.company_settings (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key   TEXT        NOT NULL UNIQUE,
  setting_value TEXT        NOT NULL DEFAULT 'null',
  setting_type  TEXT        NOT NULL DEFAULT 'string'
                            CHECK (setting_type IN ('string','number','boolean','json','url')),
  description   TEXT,
  is_public     BOOLEAN     NOT NULL DEFAULT FALSE,
  updated_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 11. LOYALTY_POINTS — Program poin loyalitas jamaah
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.loyalty_points (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id      UUID        NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  booking_id       UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  points           INTEGER     NOT NULL,
  type             TEXT        NOT NULL DEFAULT 'earned'
                               CHECK (type IN ('earned','redeemed','expired','adjusted')),
  description      TEXT,
  expires_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 12. WITHDRAWAL_REQUESTS — Permintaan pencairan tabungan / komisi
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type             TEXT        NOT NULL DEFAULT 'savings'
                               CHECK (type IN ('savings','commission','refund')),
  reference_id     UUID        NOT NULL,
  amount           NUMERIC     NOT NULL CHECK (amount > 0),
  bank_name        TEXT        NOT NULL,
  account_number   TEXT        NOT NULL,
  account_name     TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','processing','completed','rejected')),
  requested_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at      TIMESTAMPTZ,
  transfer_proof   TEXT,
  rejection_reason TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 13. DEPARTURE_COST_ITEMS — Komponen HPP per keberangkatan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departure_cost_items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id     UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  vendor_id        UUID        REFERENCES public.vendors(id) ON DELETE SET NULL,
  item_name        TEXT        NOT NULL,
  item_type        TEXT        NOT NULL DEFAULT 'per_pax'
                               CHECK (item_type IN ('per_pax','fixed','per_room','per_night')),
  quantity         INTEGER     NOT NULL DEFAULT 1,
  unit_cost_usd    NUMERIC     NOT NULL DEFAULT 0,
  unit_cost_idr    NUMERIC     NOT NULL DEFAULT 0,
  exchange_rate    NUMERIC     NOT NULL DEFAULT 1,
  total_cost_idr   NUMERIC     NOT NULL DEFAULT 0,
  notes            TEXT,
  invoice_id       UUID        REFERENCES public.vendor_invoices(id) ON DELETE SET NULL,
  created_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.departure_cost_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 14. DEPARTURE_EXPENSES — Pengeluaran operasional per keberangkatan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departure_expenses (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id     UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  category         TEXT        NOT NULL DEFAULT 'operational'
                               CHECK (category IN ('operational','transport','meals','guide',
                                                    'commission','insurance','other')),
  description      TEXT        NOT NULL,
  amount_idr       NUMERIC     NOT NULL DEFAULT 0,
  amount_usd       NUMERIC     NOT NULL DEFAULT 0,
  exchange_rate    NUMERIC     NOT NULL DEFAULT 1,
  expense_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  vendor_id        UUID        REFERENCES public.vendors(id) ON DELETE SET NULL,
  receipt_url      TEXT,
  approved_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at      TIMESTAMPTZ,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','rejected')),
  created_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.departure_expenses ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 15. DEPARTURE_OTHER_REVENUES — Pendapatan tambahan per keberangkatan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departure_other_revenues (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id   UUID        NOT NULL REFERENCES public.departures(id) ON DELETE CASCADE,
  source         TEXT        NOT NULL DEFAULT 'other'
                             CHECK (source IN ('shop','tips','upgrade','insurance','other')),
  description    TEXT        NOT NULL,
  amount_idr     NUMERIC     NOT NULL DEFAULT 0,
  received_date  DATE        NOT NULL DEFAULT CURRENT_DATE,
  notes          TEXT,
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.departure_other_revenues ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 16. DEPARTURE_FINANCIAL_SUMMARY — Ringkasan keuangan keberangkatan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departure_financial_summary (
  id                   UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id         UUID        NOT NULL UNIQUE REFERENCES public.departures(id) ON DELETE CASCADE,
  quota                INTEGER     NOT NULL DEFAULT 0,
  pax_confirmed        INTEGER     NOT NULL DEFAULT 0,
  pax_cancelled        INTEGER     NOT NULL DEFAULT 0,
  revenue_gross        NUMERIC     NOT NULL DEFAULT 0,
  revenue_paid         NUMERIC     NOT NULL DEFAULT 0,
  revenue_outstanding  NUMERIC     NOT NULL DEFAULT 0,
  revenue_refunded     NUMERIC     NOT NULL DEFAULT 0,
  hpp_total            NUMERIC     NOT NULL DEFAULT 0,
  expense_total        NUMERIC     NOT NULL DEFAULT 0,
  other_revenue_total  NUMERIC     NOT NULL DEFAULT 0,
  gross_profit         NUMERIC     GENERATED ALWAYS AS
                         (revenue_gross - hpp_total - expense_total + other_revenue_total) STORED,
  gross_margin_pct     NUMERIC     GENERATED ALWAYS AS
                         (CASE WHEN revenue_gross > 0
                               THEN ROUND(((revenue_gross - hpp_total - expense_total + other_revenue_total)
                                           / revenue_gross * 100)::NUMERIC, 2)
                               ELSE 0 END) STORED,
  last_calculated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.departure_financial_summary ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 17. CASHFLOW_ENTRIES — Laporan arus kas (manual entries)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cashflow_entries (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date     DATE        NOT NULL DEFAULT CURRENT_DATE,
  type           TEXT        NOT NULL DEFAULT 'inflow'
                             CHECK (type IN ('inflow','outflow')),
  category       TEXT        NOT NULL,
  description    TEXT        NOT NULL,
  amount         NUMERIC     NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id   UUID,
  notes          TEXT,
  created_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.cashflow_entries ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 18. SCHEDULED_REPORTS — Konfigurasi laporan terjadwal (auto-generate)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT        NOT NULL,
  report_type     TEXT        NOT NULL,
  schedule_cron   TEXT        NOT NULL,
  recipients      TEXT[],
  parameters      JSONB,
  last_run_at     TIMESTAMPTZ,
  next_run_at     TIMESTAMPTZ,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 19. AR_REMINDER_LOG — Log pengiriman reminder piutang
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ar_reminder_log (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   UUID        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  channel      TEXT        NOT NULL DEFAULT 'whatsapp'
                           CHECK (channel IN ('whatsapp','email','sms','push')),
  message      TEXT,
  status       TEXT        NOT NULL DEFAULT 'sent'
                           CHECK (status IN ('sent','failed','pending')),
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ar_reminder_log ENABLE ROW LEVEL SECURITY;

-- ===========================================================================
-- E-COMMERCE — Toko Online
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 20. STORE_CATEGORIES — Kategori produk toko
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_categories (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT        NOT NULL,
  slug         TEXT        UNIQUE,
  description  TEXT,
  icon         TEXT,
  image_url    TEXT,
  parent_id    UUID        REFERENCES public.store_categories(id) ON DELETE SET NULL,
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  is_active    BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.store_categories ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 21. STORE_PRODUCTS — Produk toko online
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_products (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id     UUID        REFERENCES public.store_categories(id) ON DELETE SET NULL,
  name            TEXT        NOT NULL,
  slug            TEXT        UNIQUE,
  description     TEXT,
  base_price      NUMERIC     NOT NULL DEFAULT 0,
  sale_price      NUMERIC,
  sku             TEXT        UNIQUE,
  stock_quantity  INTEGER     NOT NULL DEFAULT 0,
  weight_gram     INTEGER,
  images          TEXT[],
  thumbnail_url   TEXT,
  tags            TEXT[],
  is_published    BOOLEAN     NOT NULL DEFAULT FALSE,
  is_featured     BOOLEAN     NOT NULL DEFAULT FALSE,
  sort_order      INTEGER     NOT NULL DEFAULT 0,
  meta_data       JSONB,
  created_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 22. STORE_PRODUCT_VARIANTS — Varian produk (ukuran, warna, dll)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_product_variants (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID        NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  name           TEXT        NOT NULL,
  sku            TEXT        UNIQUE,
  price          NUMERIC,
  stock_quantity INTEGER     NOT NULL DEFAULT 0,
  attributes     JSONB,
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.store_product_variants ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 23. STORE_ORDERS — Pesanan toko
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_orders (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number     TEXT        NOT NULL UNIQUE,
  customer_id      UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  guest_name       TEXT,
  guest_phone      TEXT,
  guest_email      TEXT,
  total_amount     NUMERIC     NOT NULL DEFAULT 0,
  discount_amount  NUMERIC     NOT NULL DEFAULT 0,
  shipping_amount  NUMERIC     NOT NULL DEFAULT 0,
  grand_total      NUMERIC     NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','processing','shipped',
                                                  'delivered','cancelled','refunded')),
  payment_status   TEXT        NOT NULL DEFAULT 'unpaid'
                               CHECK (payment_status IN ('unpaid','partial','paid','refunded')),
  shipping_name    TEXT,
  shipping_phone   TEXT,
  shipping_address TEXT,
  shipping_city    TEXT,
  shipping_province TEXT,
  shipping_postal  TEXT,
  notes            TEXT,
  coupon_id        UUID        REFERENCES public.coupons(id) ON DELETE SET NULL,
  processed_by     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.store_orders ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 24. STORE_ORDER_ITEMS — Item dalam pesanan toko
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_order_items (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID        NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  product_id       UUID        NOT NULL REFERENCES public.store_products(id) ON DELETE RESTRICT,
  variant_id       UUID        REFERENCES public.store_product_variants(id) ON DELETE SET NULL,
  product_name     TEXT        NOT NULL,
  variant_name     TEXT,
  quantity         INTEGER     NOT NULL DEFAULT 1,
  unit_price       NUMERIC     NOT NULL DEFAULT 0,
  total_price      NUMERIC     GENERATED ALWAYS AS (quantity * unit_price) STORED,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.store_order_items ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 25. STORE_ORDER_PAYMENTS — Pembayaran pesanan toko
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_order_payments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID        NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  amount           NUMERIC     NOT NULL CHECK (amount > 0),
  payment_method   TEXT        NOT NULL DEFAULT 'transfer',
  reference_no     TEXT,
  proof_url        TEXT,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','verified','rejected')),
  verified_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  verified_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.store_order_payments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 26. STORE_SHIPMENTS — Pengiriman pesanan toko
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_shipments (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id         UUID        NOT NULL REFERENCES public.store_orders(id) ON DELETE CASCADE,
  courier          TEXT,
  service          TEXT,
  tracking_number  TEXT,
  shipped_at       TIMESTAMPTZ,
  estimated_arrival DATE,
  delivered_at     TIMESTAMPTZ,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','packed','shipped','in_transit',
                                                  'delivered','returned','failed')),
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.store_shipments ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 27. STORE_PRODUCT_REVIEWS — Ulasan produk oleh pembeli
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.store_product_reviews (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   UUID        NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  order_id     UUID        REFERENCES public.store_orders(id) ON DELETE SET NULL,
  customer_id  UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  rating       INTEGER     NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title        TEXT,
  content      TEXT,
  photos       TEXT[],
  is_published BOOLEAN     NOT NULL DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.store_product_reviews ENABLE ROW LEVEL SECURITY;

-- ===========================================================================
-- WHATSAPP & COMMUNICATIONS
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 28. WHATSAPP_CONFIG — Konfigurasi provider gateway WhatsApp
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  provider        TEXT        NOT NULL DEFAULT 'fonnte'
                              CHECK (provider IN ('fonnte','wablas','waboxapp','twilio',
                                                    'meta_cloud','other')),
  display_name    TEXT        NOT NULL DEFAULT 'WhatsApp Gateway',
  sender_number   TEXT,
  api_key         TEXT,
  provider_config JSONB,
  is_active       BOOLEAN     NOT NULL DEFAULT FALSE,
  last_tested_at  TIMESTAMPTZ,
  last_test_ok    BOOLEAN,
  updated_by      UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 29. WA_TEMPLATES — Template pesan WhatsApp
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wa_templates (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  code          TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  category      TEXT        NOT NULL DEFAULT 'notification'
                            CHECK (category IN ('notification','marketing','transactional','reminder')),
  type          TEXT        NOT NULL DEFAULT 'text'
                            CHECK (type IN ('text','image','document','button')),
  body          TEXT        NOT NULL,
  header        TEXT,
  footer        TEXT,
  buttons       JSONB,
  variables     TEXT[],
  language      TEXT        NOT NULL DEFAULT 'id',
  is_active     BOOLEAN     NOT NULL DEFAULT TRUE,
  is_approved   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by    UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wa_templates ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 30. WA_SEND_LOGS — Log setiap pengiriman pesan WhatsApp
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wa_send_logs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  config_id        UUID        REFERENCES public.whatsapp_config(id) ON DELETE SET NULL,
  template_id      UUID        REFERENCES public.wa_templates(id) ON DELETE SET NULL,
  booking_id       UUID        REFERENCES public.bookings(id) ON DELETE SET NULL,
  customer_id      UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  phone            TEXT        NOT NULL,
  message          TEXT        NOT NULL,
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','sent','delivered','failed','bounced')),
  provider_msg_id  TEXT,
  provider_status  TEXT,
  error_message    TEXT,
  sent_at          TIMESTAMPTZ,
  delivered_at     TIMESTAMPTZ,
  sent_by          UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  context_type     TEXT,
  context_id       UUID,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wa_send_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 31. WHATSAPP_LOGS — Alias view for legacy compatibility
--     (References wa_send_logs as the canonical table)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id     UUID        NOT NULL REFERENCES public.wa_send_logs(id) ON DELETE CASCADE,
  extra_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.whatsapp_logs IS
  'Legacy compatibility table — canonical log is wa_send_logs. Use wa_send_logs for new queries.';

ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 32. WA_BROADCAST_CAMPAIGNS — Kampanye broadcast WhatsApp massal
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wa_broadcast_campaigns (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT        NOT NULL,
  template_id      UUID        REFERENCES public.wa_templates(id) ON DELETE SET NULL,
  config_id        UUID        REFERENCES public.whatsapp_config(id) ON DELETE SET NULL,
  filter_criteria  JSONB,
  message_body     TEXT        NOT NULL,
  scheduled_at     TIMESTAMPTZ,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  total_targets    INTEGER     NOT NULL DEFAULT 0,
  total_sent       INTEGER     NOT NULL DEFAULT 0,
  total_failed     INTEGER     NOT NULL DEFAULT 0,
  status           TEXT        NOT NULL DEFAULT 'draft'
                               CHECK (status IN ('draft','scheduled','running',
                                                  'completed','cancelled','failed')),
  created_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wa_broadcast_campaigns ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 33. WA_BROADCAST_LOGS — Log individual per penerima broadcast
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wa_broadcast_logs (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id  UUID        NOT NULL REFERENCES public.wa_broadcast_campaigns(id) ON DELETE CASCADE,
  customer_id  UUID        REFERENCES public.customers(id) ON DELETE SET NULL,
  phone        TEXT        NOT NULL,
  full_name    TEXT,
  message      TEXT,
  status       TEXT        NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','sent','delivered','failed')),
  provider_id  TEXT,
  error        TEXT,
  sent_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wa_broadcast_logs ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- 34. WA_FEATURE_ROADMAP — Roadmap pengembangan fitur WhatsApp
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.wa_feature_roadmap (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  phase        INTEGER     NOT NULL,
  code         TEXT        NOT NULL UNIQUE,
  title        TEXT        NOT NULL,
  description  TEXT,
  status       TEXT        NOT NULL DEFAULT 'planned'
                           CHECK (status IN ('planned','in_progress','done','cancelled')),
  sort_order   INTEGER     NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.wa_feature_roadmap ENABLE ROW LEVEL SECURITY;

-- Grant permissions
DO $$
BEGIN
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;
  GRANT ALL    ON ALL TABLES IN SCHEMA public TO service_role;
  GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated, anon, service_role;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'GRANT on tables/sequences skipped: %', SQLERRM;
END;
$$;

SELECT '005_tables_finance: OK' AS result;
