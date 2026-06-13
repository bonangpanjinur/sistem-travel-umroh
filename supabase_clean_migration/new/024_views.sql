-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration v2
-- FILE 024: Views — Computed/aggregated read-only views
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. v_booking_detail — Detail booking lengkap (join semua tabel terkait)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_booking_detail AS
SELECT
  b.id,
  b.booking_code,
  b.status,
  b.payment_status,
  b.room_type,
  b.total_pax,
  b.total_price,
  b.discount_amount,
  b.paid_amount,
  b.remaining_amount,
  b.payment_deadline,
  b.source,
  b.created_at,
  b.confirmed_at,
  b.cancelled_at,
  b.cancellation_reason,
  -- Customer
  c.id              AS customer_id,
  c.full_name       AS customer_name,
  c.phone           AS customer_phone,
  c.email           AS customer_email,
  c.passport_no     AS customer_passport,
  -- Departure
  d.id              AS departure_id,
  d.departure_date,
  d.return_date,
  d.status          AS departure_status,
  d.quota,
  d.available_seats,
  -- Package
  p.id              AS package_id,
  p.name            AS package_name,
  p.package_type,
  p.duration_days,
  -- Agent
  ag.id             AS agent_id,
  ag.company_name   AS agent_name,
  -- Branch
  br.id             AS branch_id,
  br.name           AS branch_name,
  -- Airline
  al.name           AS airline_name,
  al.iata_code      AS airline_iata,
  -- Hotels
  hm.name           AS hotel_makkah_name,
  hn.name           AS hotel_madinah_name
FROM public.bookings b
  LEFT JOIN public.customers  c  ON c.id  = b.customer_id
  LEFT JOIN public.departures d  ON d.id  = b.departure_id
  LEFT JOIN public.packages   p  ON p.id  = d.package_id
  LEFT JOIN public.agents     ag ON ag.id = b.agent_id
  LEFT JOIN public.branches   br ON br.id = b.branch_id
  LEFT JOIN public.airlines   al ON al.id = d.airline_id
  LEFT JOIN public.hotels     hm ON hm.id = d.hotel_makkah_id
  LEFT JOIN public.hotels     hn ON hn.id = d.hotel_madinah_id;

-- ---------------------------------------------------------------------------
-- 2. v_agent_performance — Performa agen (booking + komisi)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_agent_performance AS
SELECT
  ag.id,
  ag.agent_code,
  ag.company_name,
  ag.agent_type,
  ag.plan_type,
  ag.status,
  ag.branch_id,
  br.name            AS branch_name,
  COUNT(b.id)        AS total_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'confirmed')  AS confirmed_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'completed')  AS completed_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'cancelled')  AS cancelled_bookings,
  COALESCE(SUM(b.total_price) FILTER (WHERE b.status NOT IN ('cancelled')), 0) AS total_revenue,
  COALESCE(SUM(ac.amount) FILTER (WHERE ac.status = 'paid'), 0)                AS total_commission_paid,
  COALESCE(SUM(ac.amount) FILTER (WHERE ac.status = 'pending'), 0)             AS pending_commission,
  aw.balance         AS wallet_balance
FROM public.agents ag
  LEFT JOIN public.branches          br ON br.id = ag.branch_id
  LEFT JOIN public.bookings          b  ON b.agent_id = ag.id
  LEFT JOIN public.agent_commissions ac ON ac.agent_id = ag.id
  LEFT JOIN public.agent_wallets     aw ON aw.agent_id = ag.id
GROUP BY ag.id, br.name, aw.balance;

-- ---------------------------------------------------------------------------
-- 3. v_departure_summary — Ringkasan departure untuk admin
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_departure_summary AS
SELECT
  d.id,
  d.departure_date,
  d.return_date,
  d.status,
  d.quota,
  d.available_seats,
  d.quota - d.available_seats   AS sold_seats,
  ROUND(((d.quota - d.available_seats)::NUMERIC / NULLIF(d.quota, 0)) * 100, 1) AS occupancy_pct,
  p.name                        AS package_name,
  p.package_type,
  p.duration_days,
  al.name                       AS airline_name,
  al.iata_code                  AS airline_iata,
  hm.name                       AS hotel_makkah,
  hn.name                       AS hotel_madinah,
  br.name                       AS branch_name,
  -- Financial summary
  dfs.revenue_gross,
  dfs.revenue_paid,
  dfs.revenue_outstanding,
  dfs.hpp_total,
  dfs.gross_profit,
  dfs.gross_margin_pct,
  -- Counts
  COUNT(b.id) FILTER (WHERE b.status NOT IN ('cancelled'))  AS active_bookings,
  COUNT(b.id) FILTER (WHERE b.status = 'cancelled')         AS cancelled_bookings
FROM public.departures d
  LEFT JOIN public.packages             p   ON p.id  = d.package_id
  LEFT JOIN public.airlines             al  ON al.id = d.airline_id
  LEFT JOIN public.hotels               hm  ON hm.id = d.hotel_makkah_id
  LEFT JOIN public.hotels               hn  ON hn.id = d.hotel_madinah_id
  LEFT JOIN public.branches             br  ON br.id = d.branch_id
  LEFT JOIN public.departure_financial_summary dfs ON dfs.departure_id = d.id
  LEFT JOIN public.bookings             b   ON b.departure_id = d.id
GROUP BY d.id, p.name, p.package_type, p.duration_days,
         al.name, al.iata_code, hm.name, hn.name, br.name,
         dfs.revenue_gross, dfs.revenue_paid, dfs.revenue_outstanding,
         dfs.hpp_total, dfs.gross_profit, dfs.gross_margin_pct;

-- ---------------------------------------------------------------------------
-- 4. v_customer_portal — Data jamaah untuk portal (tanpa data sensitif)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_customer_portal AS
SELECT
  c.id,
  c.customer_code,
  c.full_name,
  c.phone,
  c.email,
  c.gender,
  c.birth_date,
  c.passport_no,
  c.passport_expiry,
  c.photo_url,
  c.status,
  ca.loyalty_points,
  ca.total_bookings,
  ca.total_spent,
  ca.is_verified
FROM public.customers c
  LEFT JOIN public.customer_accounts ca ON ca.customer_id = c.id;

-- ---------------------------------------------------------------------------
-- 5. v_financial_overview — Ringkasan keuangan harian
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_financial_overview AS
SELECT
  DATE_TRUNC('month', p.payment_date)::DATE  AS month,
  COUNT(p.id)                                 AS payment_count,
  SUM(p.amount) FILTER (WHERE p.status = 'verified')   AS total_verified,
  SUM(p.amount) FILTER (WHERE p.status = 'pending')    AS total_pending,
  SUM(p.amount) FILTER (WHERE p.status = 'refunded')   AS total_refunded,
  COUNT(b.id) FILTER (WHERE b.payment_status = 'paid') AS fully_paid_bookings,
  COUNT(b.id) FILTER (WHERE b.payment_status = 'partial') AS partial_bookings,
  SUM(b.remaining_amount) FILTER (WHERE b.status NOT IN ('cancelled')) AS total_outstanding_ar
FROM public.payments p
  RIGHT JOIN public.bookings b ON b.id = p.booking_id
GROUP BY DATE_TRUNC('month', p.payment_date)::DATE
ORDER BY month DESC;
