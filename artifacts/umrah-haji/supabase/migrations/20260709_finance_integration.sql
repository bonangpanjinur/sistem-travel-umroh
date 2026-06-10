-- =============================================================================
-- Finance Integration Migrations — 20260709
-- Consolidated migration for INT-07, INT-09, INT-14 prep, and v_financial_summary
-- All SQL for rencanakeuangan.md FASE PENTING (INT-05 to INT-09) goes here.
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- INT-09: Add pph21_amount & pph21_annual columns to payroll_records
-- These columns persist the computed PPh 21 per employee per period
-- so AdminLaporanPajak can aggregate actual (not estimated) tax obligations.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS pph21_amount   NUMERIC DEFAULT 0;
ALTER TABLE payroll_records ADD COLUMN IF NOT EXISTS pph21_annual   NUMERIC DEFAULT 0;

COMMENT ON COLUMN payroll_records.pph21_amount IS 'PPh 21 bulanan aktual (setelah PTKP & tarif progresif) — diisi saat Finalize Payroll';
COMMENT ON COLUMN payroll_records.pph21_annual IS 'PPh 21 tahunan estimasi (pph21_amount × 12)';

-- ─────────────────────────────────────────────────────────────────────────────
-- INT-07: Ensure departure_cost_items has notes column (used by auto-sync)
-- reference_id is used in DepartureBudgetTab for hotel contract dedup.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE departure_cost_items ADD COLUMN IF NOT EXISTS reference_id TEXT;
ALTER TABLE departure_cost_items ADD COLUMN IF NOT EXISTS notes       TEXT;

COMMENT ON COLUMN departure_cost_items.reference_id IS 'FK ke sumber data (hotel_contract.id, equipment_set.id, dll) — cegah import duplikat';
COMMENT ON COLUMN departure_cost_items.notes        IS 'Catatan auto-sync (sumber data, tanggal sync, jumlah item)';

-- ─────────────────────────────────────────────────────────────────────────────
-- INT-14 prep: Add approval workflow columns to departure_expenses
-- INT-14 = persetujuan realisasi biaya sebelum dicatat ke laporan keuangan.
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE departure_expenses ADD COLUMN IF NOT EXISTS approval_status   TEXT        DEFAULT 'approved';
ALTER TABLE departure_expenses ADD COLUMN IF NOT EXISTS approved_by       UUID        REFERENCES auth.users(id);
ALTER TABLE departure_expenses ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ;
ALTER TABLE departure_expenses ADD COLUMN IF NOT EXISTS rejected_reason   TEXT;

COMMENT ON COLUMN departure_expenses.approval_status IS 'Status persetujuan: draft | pending | approved | rejected';
COMMENT ON COLUMN departure_expenses.approved_by     IS 'User yang menyetujui / menolak';
COMMENT ON COLUMN departure_expenses.approved_at     IS 'Waktu persetujuan/penolakan';
COMMENT ON COLUMN departure_expenses.rejected_reason IS 'Alasan penolakan jika approval_status = rejected';

-- Backfill: entri lama dianggap sudah approved
UPDATE departure_expenses
SET approval_status = 'approved'
WHERE approval_status IS NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- INT-01 / INT-02: Recreate v_financial_summary view
-- Agregasi per keberangkatan: revenue, HPP rencana, HPP realisasi, vendor cost,
-- budget rencana vs aktual. Dipakai di AdminFinancePL & AdminAdvancedReports.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_financial_summary AS
SELECT
  d.id                                                                  AS departure_id,
  d.departure_date,
  d.return_date,
  d.quota,
  d.booked_count,
  p.id                                                                  AS package_id,
  p.name                                                                AS package_name,
  p.price_per_pax,

  -- ── Revenue ───────────────────────────────────────────────────────────────
  (d.booked_count * COALESCE(p.price_per_pax, 0))                     AS revenue_plan,
  COALESCE((
    SELECT SUM(pay.amount)
    FROM bookings b
    JOIN payments pay ON pay.booking_id = b.id
    WHERE b.departure_id = d.id
      AND pay.payment_status = 'approved'
  ), 0)                                                                 AS revenue_realized,

  -- ── HPP Rencana (departure_cost_items) ────────────────────────────────────
  COALESCE((
    SELECT SUM(dci.total_cost_idr)
    FROM departure_cost_items dci
    WHERE dci.departure_id = d.id
  ), 0)                                                                 AS hpp_planned,

  -- ── HPP Realisasi Lapangan (departure_expenses) ───────────────────────────
  COALESCE((
    SELECT SUM(de.amount)
    FROM departure_expenses de
    WHERE de.departure_id = d.id
      AND COALESCE(de.approval_status, 'approved') != 'rejected'
  ), 0)                                                                 AS hpp_realized,

  -- ── Vendor Cost formal AP (vendor_costs) ──────────────────────────────────
  COALESCE((
    SELECT SUM(vc.amount)
    FROM vendor_costs vc
    WHERE vc.departure_id = d.id
  ), 0)                                                                 AS vendor_cost_total,

  -- ── Budget Rencana vs Aktual (departure_budgets) ──────────────────────────
  COALESCE((
    SELECT SUM(db.planned_amount)
    FROM departure_budgets db
    WHERE db.departure_id = d.id
  ), 0)                                                                 AS budget_planned,

  COALESCE((
    SELECT SUM(db.actual_amount)
    FROM departure_budgets db
    WHERE db.departure_id = d.id
  ), 0)                                                                 AS budget_actual,

  -- ── Computed margins ──────────────────────────────────────────────────────
  ((d.booked_count * COALESCE(p.price_per_pax, 0)) - COALESCE((
    SELECT SUM(dci.total_cost_idr)
    FROM departure_cost_items dci
    WHERE dci.departure_id = d.id
  ), 0))                                                                AS gross_margin_plan,

  COALESCE((
    SELECT SUM(pay.amount)
    FROM bookings b
    JOIN payments pay ON pay.booking_id = b.id
    WHERE b.departure_id = d.id
      AND pay.payment_status = 'approved'
  ), 0)
  - COALESCE((
    SELECT SUM(de.amount)
    FROM departure_expenses de
    WHERE de.departure_id = d.id
      AND COALESCE(de.approval_status, 'approved') != 'rejected'
  ), 0)                                                                 AS gross_margin_realized

FROM departures d
LEFT JOIN packages p ON d.package_id = p.id;

-- Grant read access to authenticated users (Supabase RLS still applies per table)
GRANT SELECT ON v_financial_summary TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Index helpers for the subqueries above (jika belum ada)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_departure_cost_items_departure_id ON departure_cost_items(departure_id);
CREATE INDEX IF NOT EXISTS idx_departure_expenses_departure_id   ON departure_expenses(departure_id);
CREATE INDEX IF NOT EXISTS idx_vendor_costs_departure_id         ON vendor_costs(departure_id);
CREATE INDEX IF NOT EXISTS idx_departure_budgets_departure_id    ON departure_budgets(departure_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period            ON payroll_records(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_payroll_records_employee_period   ON payroll_records(employee_id, period_year, period_month);
