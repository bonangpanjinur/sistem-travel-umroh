-- Migration 085: departure_expenses Approval Workflow (INT-14)
-- Pastikan kolom approval sudah ada (ditambahkan via 20260709_finance_integration.sql)
-- Migration ini menambahkan index + default nilai untuk kolom approval

-- Tambahkan kolom approval jika belum ada (idempotent)
ALTER TABLE departure_expenses
  ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending_approval',
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Backfill: set semua existing records ke 'approved' (sudah ada sebelum workflow ini)
UPDATE departure_expenses
SET approval_status = 'approved'
WHERE approval_status IS NULL OR approval_status = '';

-- Index untuk performa query per approval_status
CREATE INDEX IF NOT EXISTS idx_departure_expenses_approval_status
  ON departure_expenses(approval_status);

-- Index untuk filter pending approval per departure
CREATE INDEX IF NOT EXISTS idx_departure_expenses_dep_approval
  ON departure_expenses(departure_id, approval_status);
