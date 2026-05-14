-- Migration 042: v_financial_summary VIEW
-- Dibutuhkan oleh: AdminAdvancedReports
-- Tanpa ini: halaman Advanced Reports gagal load / data kosong

CREATE OR REPLACE VIEW v_financial_summary AS
  SELECT
    d.id                AS departure_id,
    d.departure_date,
    d.return_date,
    p.name              AS package_name,
    COALESCE(d.quota, 0) AS quota,
    COUNT(DISTINCT b.id) AS total_bookings,
    COUNT(DISTINCT b.id) AS booked_count,
    COUNT(DISTINCT bp.id) AS total_pax,
    COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'paid'), 0) AS total_revenue,
    COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'paid'), 0) AS gross_revenue,
    COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'paid'), 0) AS collected_amount,
    COALESCE(SUM(pay.amount) FILTER (WHERE pay.status IN ('pending','dp_paid')), 0) AS outstanding_amount,
    COALESCE(SUM(vc.amount), 0) AS total_vendor_costs,
    COALESCE(SUM(pay.amount) FILTER (WHERE pay.status = 'paid'), 0)
      - COALESCE(SUM(vc.amount), 0) AS net_profit
  FROM departures d
  LEFT JOIN packages p     ON p.id = d.package_id
  LEFT JOIN bookings b     ON b.departure_id = d.id AND b.status != 'cancelled'
  LEFT JOIN booking_passengers bp ON bp.booking_id = b.id
  LEFT JOIN payments pay   ON pay.booking_id = b.id
  LEFT JOIN vendor_costs vc ON vc.departure_id = d.id
  GROUP BY d.id, d.departure_date, d.return_date, p.name, d.quota;

-- Grant akses baca kepada role authenticated
GRANT SELECT ON v_financial_summary TO authenticated;
GRANT SELECT ON v_financial_summary TO anon;
