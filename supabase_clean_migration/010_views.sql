-- =============================================================================
-- VINSTOUR TRAVEL PORTAL — Clean Migration Chain
-- FILE 010: Views
-- Run AFTER 009. All CREATE OR REPLACE — idempotent.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. v_bookings_full — Booking dengan detail customer, departure, package, agent
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_bookings_full AS
SELECT
  b.id,
  b.booking_code,
  b.status,
  b.payment_status,
  b.total_price,
  b.paid_amount,
  b.remaining_amount,
  b.discount_amount,
  b.total_pax,
  b.room_type,
  b.payment_deadline,
  b.source,
  b.created_at,
  b.updated_at,

  -- Customer
  c.full_name           AS customer_name,
  c.phone               AS customer_phone,
  c.email               AS customer_email,
  c.nik                 AS customer_nik,
  c.passport_no         AS customer_passport,

  -- Departure
  d.departure_date,
  d.return_date,
  d.available_seats,
  d.status              AS departure_status,

  -- Package
  p.name                AS package_name,
  p.code                AS package_code,
  p.package_type,
  p.duration_days,

  -- Airline
  a.name                AS airline_name,
  a.iata_code           AS airline_code,

  -- Agent
  ag.company_name       AS agent_name,
  ag.agent_code,

  -- Branch
  br.name               AS branch_name,
  br.code               AS branch_code,

  -- Handler
  pr.full_name          AS handled_by_name

FROM public.bookings b
LEFT JOIN public.customers c   ON c.id  = b.customer_id
LEFT JOIN public.departures d  ON d.id  = b.departure_id
LEFT JOIN public.packages p    ON p.id  = d.package_id
LEFT JOIN public.airlines a    ON a.id  = d.airline_id
LEFT JOIN public.agents ag     ON ag.id = b.agent_id
LEFT JOIN public.branches br   ON br.id = b.branch_id
LEFT JOIN public.profiles pr   ON pr.id = b.handled_by;

-- ---------------------------------------------------------------------------
-- 2. v_departures_with_stats — Departure + booking & seat summary
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_departures_with_stats AS
SELECT
  d.id,
  d.departure_date,
  d.return_date,
  d.quota,
  d.available_seats,
  d.status,
  d.price_quad,
  d.price_triple,
  d.price_double,
  d.price_single,
  d.flight_number,
  d.embarkation_city,
  d.created_at,

  -- Package
  p.name                AS package_name,
  p.code                AS package_code,
  p.package_type,
  p.duration_days,
  p.photo_url           AS package_photo,

  -- Airline
  a.name                AS airline_name,
  a.iata_code           AS airline_code,
  a.logo_url            AS airline_logo,

  -- Hotels
  hm.name               AS hotel_makkah_name,
  hm.star_rating        AS hotel_makkah_stars,
  hmd.name              AS hotel_madinah_name,
  hmd.star_rating       AS hotel_madinah_stars,

  -- Branch
  br.name               AS branch_name,

  -- Booking stats
  COALESCE(bs.total_bookings,   0) AS total_bookings,
  COALESCE(bs.confirmed_pax,    0) AS confirmed_pax,
  COALESCE(bs.revenue_collected, 0) AS revenue_collected,

  -- Computed
  d.quota - d.available_seats   AS seats_sold

FROM public.departures d
LEFT JOIN public.packages p    ON p.id  = d.package_id
LEFT JOIN public.airlines a    ON a.id  = d.airline_id
LEFT JOIN public.hotels hm     ON hm.id = d.hotel_makkah_id
LEFT JOIN public.hotels hmd    ON hmd.id = d.hotel_madinah_id
LEFT JOIN public.branches br   ON br.id = d.branch_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                                                  AS total_bookings,
    COALESCE(SUM(total_pax) FILTER (WHERE status = 'confirmed'), 0)  AS confirmed_pax,
    COALESCE(SUM(paid_amount) FILTER (WHERE status NOT IN ('cancelled')), 0) AS revenue_collected
  FROM public.bookings
  WHERE departure_id = d.id
) bs ON TRUE;

-- ---------------------------------------------------------------------------
-- 3. v_customers_summary — Customer with booking/payment aggregates
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_customers_summary AS
SELECT
  c.id,
  c.customer_code,
  c.full_name,
  c.phone,
  c.email,
  c.gender,
  c.city,
  c.province,
  c.nationality,
  c.status,
  c.passport_no,
  c.passport_expiry,
  c.created_at,

  -- Branch / Agent
  br.name               AS branch_name,
  ag.company_name       AS agent_name,

  -- Booking summary
  COALESCE(bs.total_bookings,  0)  AS total_bookings,
  COALESCE(bs.completed,       0)  AS completed_trips,
  COALESCE(bs.total_paid,      0)  AS total_paid,
  COALESCE(bs.total_remaining, 0)  AS total_remaining

FROM public.customers c
LEFT JOIN public.branches br ON br.id = c.branch_id
LEFT JOIN public.agents   ag ON ag.id = c.agent_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                            AS total_bookings,
    COUNT(*) FILTER (WHERE status = 'completed') AS completed,
    COALESCE(SUM(paid_amount),       0) AS total_paid,
    COALESCE(SUM(remaining_amount),  0) AS total_remaining
  FROM public.bookings
  WHERE customer_id = c.id
) bs ON TRUE;

-- ---------------------------------------------------------------------------
-- 4. v_departure_pl — Departure P&L report view
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_departure_pl AS
SELECT
  d.id                        AS departure_id,
  d.departure_date,
  d.return_date,
  d.quota,
  d.status                    AS departure_status,
  p.name                      AS package_name,
  p.package_type,
  a.name                      AS airline_name,
  br.name                     AS branch_name,

  COALESCE(fs.pax_confirmed,      0) AS pax_confirmed,
  COALESCE(fs.pax_cancelled,      0) AS pax_cancelled,
  COALESCE(fs.revenue_gross,      0) AS revenue_gross,
  COALESCE(fs.revenue_paid,       0) AS revenue_paid,
  COALESCE(fs.revenue_outstanding,0) AS revenue_outstanding,
  COALESCE(fs.revenue_refunded,   0) AS revenue_refunded,
  COALESCE(fs.hpp_total,          0) AS hpp_total,
  COALESCE(fs.expense_total,      0) AS expense_total,
  COALESCE(fs.other_revenue_total,0) AS other_revenue_total,
  COALESCE(fs.gross_profit,       0) AS gross_profit,
  COALESCE(fs.gross_margin_pct,   0) AS gross_margin_pct,
  fs.last_calculated_at

FROM public.departures d
LEFT JOIN public.packages   p  ON p.id  = d.package_id
LEFT JOIN public.airlines   a  ON a.id  = d.airline_id
LEFT JOIN public.branches   br ON br.id = d.branch_id
LEFT JOIN public.departure_financial_summary fs ON fs.departure_id = d.id;

-- ---------------------------------------------------------------------------
-- 5. v_payments_pending — Payments awaiting verification
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_payments_pending AS
SELECT
  py.id,
  py.amount,
  py.payment_date,
  py.payment_method,
  py.reference_no,
  py.proof_url,
  py.is_dp,
  py.created_at,

  b.booking_code,
  b.total_price,
  b.paid_amount,

  c.full_name           AS customer_name,
  c.phone               AS customer_phone,

  p.name                AS package_name,
  d.departure_date,

  ba.bank_name,
  ba.account_number

FROM public.payments py
JOIN public.bookings b        ON b.id  = py.booking_id
JOIN public.customers c       ON c.id  = b.customer_id
LEFT JOIN public.departures d ON d.id  = b.departure_id
LEFT JOIN public.packages p   ON p.id  = d.package_id
LEFT JOIN public.bank_accounts ba ON ba.id = py.bank_account_id
WHERE py.status = 'pending';

-- ---------------------------------------------------------------------------
-- 6. v_agents_performance — Agent booking and revenue summary
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_agents_performance AS
SELECT
  ag.id,
  ag.agent_code,
  ag.company_name,
  ag.status,
  ag.commission_rate,
  ag.plan_type,
  br.name               AS branch_name,

  COALESCE(bs.total_bookings,    0) AS total_bookings,
  COALESCE(bs.confirmed,         0) AS confirmed_bookings,
  COALESCE(bs.total_revenue,     0) AS total_revenue,
  COALESCE(bs.total_commissions, 0) AS total_commissions_paid

FROM public.agents ag
LEFT JOIN public.branches br ON br.id = ag.branch_id
LEFT JOIN LATERAL (
  SELECT
    COUNT(*)                               AS total_bookings,
    COUNT(*) FILTER (WHERE b.status = 'confirmed') AS confirmed,
    COALESCE(SUM(b.total_price), 0)        AS total_revenue,
    COALESCE(SUM(cm.commission_amount), 0) AS total_commissions
  FROM public.bookings b
  LEFT JOIN public.commissions cm ON cm.booking_id = b.id AND cm.agent_id = ag.id
  WHERE b.agent_id = ag.id
) bs ON TRUE;

-- ---------------------------------------------------------------------------
-- 7. v_wa_send_logs_full — WA send log with customer & booking context
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_wa_send_logs_full AS
SELECT
  wl.id,
  wl.phone,
  wl.message,
  wl.status,
  wl.sent_at,
  wl.error_message,
  wl.context_type,
  wl.created_at,

  c.full_name           AS customer_name,
  b.booking_code,
  t.name                AS template_name,
  t.code                AS template_code,
  wc.display_name       AS provider_name,
  wc.provider,
  pr.full_name          AS sent_by_name

FROM public.wa_send_logs wl
LEFT JOIN public.customers c         ON c.id  = wl.customer_id
LEFT JOIN public.bookings  b         ON b.id  = wl.booking_id
LEFT JOIN public.wa_templates t      ON t.id  = wl.template_id
LEFT JOIN public.whatsapp_config wc  ON wc.id = wl.config_id
LEFT JOIN public.profiles pr         ON pr.id = wl.sent_by;

-- ---------------------------------------------------------------------------
-- 8. v_inventory_alerts — Equipment items with low stock alerts
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_inventory_alerts AS
SELECT
  e.id,
  e.name,
  e.category,
  e.stock_quantity,
  e.unit,
  CASE
    WHEN e.stock_quantity = 0 THEN 'out_of_stock'
    WHEN e.stock_quantity < 10 THEN 'low_stock'
    ELSE 'ok'
  END AS stock_status
FROM public.equipment_items e
WHERE e.is_active = TRUE
ORDER BY e.stock_quantity ASC;

-- ---------------------------------------------------------------------------
-- 9. v_upcoming_departures — Departures in the next 90 days
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_upcoming_departures AS
SELECT
  d.id,
  d.departure_date,
  d.return_date,
  d.quota,
  d.available_seats,
  d.quota - d.available_seats AS seats_sold,
  d.status,
  d.flight_number,
  p.name              AS package_name,
  p.package_type,
  a.name              AS airline_name,
  a.logo_url          AS airline_logo,
  p.photo_url         AS package_photo,
  p.base_price_quad,
  p.base_price_triple,
  p.base_price_double,
  p.base_price_single,
  hm.name             AS hotel_makkah,
  hm.star_rating      AS makkah_stars,
  hmd.name            AS hotel_madinah,
  hmd.star_rating     AS madinah_stars,
  p.duration_days

FROM public.departures d
JOIN  public.packages p    ON p.id  = d.package_id
LEFT JOIN public.airlines a  ON a.id  = d.airline_id
LEFT JOIN public.hotels hm   ON hm.id = d.hotel_makkah_id
LEFT JOIN public.hotels hmd  ON hmd.id = d.hotel_madinah_id
WHERE d.status IN ('open','full')
  AND d.departure_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '90 days'
ORDER BY d.departure_date ASC;

-- Grant SELECT on all views
GRANT SELECT ON public.v_bookings_full            TO authenticated;
GRANT SELECT ON public.v_departures_with_stats    TO authenticated, anon;
GRANT SELECT ON public.v_customers_summary        TO authenticated;
GRANT SELECT ON public.v_departure_pl             TO authenticated;
GRANT SELECT ON public.v_payments_pending         TO authenticated;
GRANT SELECT ON public.v_agents_performance       TO authenticated;
GRANT SELECT ON public.v_wa_send_logs_full        TO authenticated;
GRANT SELECT ON public.v_inventory_alerts         TO authenticated;
GRANT SELECT ON public.v_upcoming_departures      TO authenticated, anon;

SELECT '010_views: OK' AS result;
