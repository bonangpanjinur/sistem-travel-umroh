-- Migration 084: Upgrade v_financial_summary VIEW (v2)
-- Menambahkan departure_cost_items (HPP planned) dan departure_expenses (HPP realisasi)
-- Sebelumnya: hanya vendor_costs yang masuk total biaya — sekarang lengkap 3 sumber biaya

CREATE OR REPLACE VIEW v_financial_summary AS
SELECT
  d.id                AS departure_id,
  d.departure_date,
  d.return_date,
  p.name              AS package_name,
  p.code              AS package_code,
  COALESCE(d.quota, 0) AS quota,

  COUNT(DISTINCT b.id) AS total_bookings,
  COUNT(DISTINCT bp.id) AS total_pax,

  -- ── Revenue ──────────────────────────────────────────────────────
  COALESCE(SUM(pay.amount) FILTER (
    WHERE pay.status IN ('verified', 'paid', 'approved')
  ), 0) AS collected_revenue,

  COALESCE(SUM(pay.amount) FILTER (
    WHERE pay.status IN ('pending', 'dp_paid')
  ), 0) AS outstanding_ar,

  -- Total omzet (harga booking × jumlah booking)
  COALESCE(SUM(DISTINCT b.total_price) FILTER (WHERE b.status != 'cancelled'), 0) AS gross_booking_value,

  -- ── HPP Planned (dari departure_cost_items) ───────────────────────
  -- Ini adalah rencana HPP yang diisi admin sebelum keberangkatan
  COALESCE((
    SELECT SUM(dci.total_cost_idr)
    FROM departure_cost_items dci
    WHERE dci.departure_id = d.id
  ), 0) AS hpp_planned,

  -- ── HPP Realisasi (dari departure_expenses) ────────────────────────
  -- Pengeluaran aktual saat operasional berjalan
  COALESCE((
    SELECT SUM(de.amount_idr)
    FROM departure_expenses de
    WHERE de.departure_id = d.id
  ), 0) AS hpp_realized,

  -- ── Vendor Costs / AP ──────────────────────────────────────────────
  -- Tagihan formal vendor yang sudah dibuat
  COALESCE((
    SELECT SUM(vc.amount)
    FROM vendor_costs vc
    WHERE vc.departure_id = d.id
  ), 0) AS total_ap_vendor,

  -- Vendor costs yang sudah lunas
  COALESCE((
    SELECT SUM(vc.paid_amount)
    FROM vendor_costs vc
    WHERE vc.departure_id = d.id AND vc.status = 'paid'
  ), 0) AS ap_paid,

  -- ── Net Profit (Revenue - Realisasi - AP) ─────────────────────────
  COALESCE(SUM(pay.amount) FILTER (
    WHERE pay.status IN ('verified', 'paid', 'approved')
  ), 0)
  - COALESCE((SELECT SUM(de.amount_idr) FROM departure_expenses de WHERE de.departure_id = d.id), 0)
  - COALESCE((SELECT SUM(vc.amount) FROM vendor_costs vc WHERE vc.departure_id = d.id), 0)
    AS net_profit_realized,

  -- ── Margin % ──────────────────────────────────────────────────────
  CASE
    WHEN COALESCE(SUM(pay.amount) FILTER (WHERE pay.status IN ('verified', 'paid', 'approved')), 0) > 0
    THEN ROUND(
      (
        COALESCE(SUM(pay.amount) FILTER (WHERE pay.status IN ('verified', 'paid', 'approved')), 0)
        - COALESCE((SELECT SUM(de.amount_idr) FROM departure_expenses de WHERE de.departure_id = d.id), 0)
        - COALESCE((SELECT SUM(vc.amount) FROM vendor_costs vc WHERE vc.departure_id = d.id), 0)
      )
      / SUM(pay.amount) FILTER (WHERE pay.status IN ('verified', 'paid', 'approved')) * 100,
      2
    )
    ELSE 0
  END AS net_margin_pct,

  -- ── HPP Budget Variance ───────────────────────────────────────────
  -- Selisih antara HPP planned vs realisasi (negatif = over budget)
  COALESCE((
    SELECT SUM(dci.total_cost_idr) FROM departure_cost_items dci WHERE dci.departure_id = d.id
  ), 0)
  - COALESCE((
    SELECT SUM(de.amount_idr) FROM departure_expenses de WHERE de.departure_id = d.id
  ), 0) AS hpp_variance

FROM departures d
LEFT JOIN packages p            ON p.id = d.package_id
LEFT JOIN bookings b            ON b.departure_id = d.id AND b.status != 'cancelled'
LEFT JOIN booking_passengers bp ON bp.booking_id = b.id
LEFT JOIN payments pay          ON pay.booking_id = b.id
GROUP BY d.id, d.departure_date, d.return_date, p.name, p.code, d.quota;

GRANT SELECT ON v_financial_summary TO authenticated;
GRANT SELECT ON v_financial_summary TO anon;

COMMENT ON VIEW v_financial_summary IS
  'v2 (migration 084): Revenue + HPP Planned (departure_cost_items) + HPP Realized (departure_expenses) + AP Vendor (vendor_costs). Tiga sumber biaya keberangkatan tergabung.';
