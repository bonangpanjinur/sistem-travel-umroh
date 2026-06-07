-- Migration 028: leave_requests + leave_quotas tables for ESS Cuti/Izin feature

-- ── leave_requests: one row per leave application ────────────────────────────
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID        NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  leave_type       TEXT        NOT NULL DEFAULT 'annual'
                               CHECK (leave_type IN ('annual','sick','maternity','paternity','emergency','unpaid','other')),
  start_date       DATE        NOT NULL,
  end_date         DATE        NOT NULL,
  total_days       INTEGER     NOT NULL DEFAULT 1,
  reason           TEXT        NOT NULL DEFAULT '',
  status           TEXT        NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending','approved','rejected','cancelled')),
  rejection_reason TEXT,
  approved_at      TIMESTAMPTZ,
  approved_by      UUID,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leave_requests_dates_check CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status      ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date  ON public.leave_requests(start_date);

-- ── leave_quotas: annual quota per employee per year ──────────────────────────
CREATE TABLE IF NOT EXISTS public.leave_quotas (
  id            UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   UUID    NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  year          INTEGER NOT NULL,
  annual_quota  INTEGER NOT NULL DEFAULT 12,
  carry_over    INTEGER NOT NULL DEFAULT 0,
  annual_used   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, year)
);

CREATE INDEX IF NOT EXISTS idx_leave_quotas_employee_id ON public.leave_quotas(employee_id);

-- ── trigger: auto-update updated_at on leave_requests ─────────────────────────
CREATE OR REPLACE FUNCTION public.set_leave_requests_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER trg_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_leave_requests_updated_at();

-- ── trigger: auto-compute total_days from date range ──────────────────────────
CREATE OR REPLACE FUNCTION public.compute_leave_total_days()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.total_days = (NEW.end_date - NEW.start_date) + 1;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_leave_requests_total_days ON public.leave_requests;
CREATE TRIGGER trg_leave_requests_total_days
  BEFORE INSERT OR UPDATE OF start_date, end_date ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.compute_leave_total_days();
