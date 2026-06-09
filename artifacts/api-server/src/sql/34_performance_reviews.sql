-- Migration 034: performance_reviews table
-- Menyimpan penilaian kinerja karyawan per periode (quarterly/monthly)

CREATE TABLE IF NOT EXISTS performance_reviews (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id      UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  reviewer_id      UUID REFERENCES auth.users(id),
  review_period    TEXT NOT NULL,
  quality          INTEGER CHECK (quality BETWEEN 1 AND 5),
  productivity     INTEGER CHECK (productivity BETWEEN 1 AND 5),
  initiative       INTEGER CHECK (initiative BETWEEN 1 AND 5),
  teamwork         INTEGER CHECK (teamwork BETWEEN 1 AND 5),
  attendance       INTEGER CHECK (attendance BETWEEN 1 AND 5),
  overall_score    NUMERIC(3,2) GENERATED ALWAYS AS (
    (quality + productivity + initiative + teamwork + attendance)::NUMERIC / 5
  ) STORED,
  strengths        TEXT,
  improvements     TEXT,
  goals            TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (employee_id, review_period)
);

CREATE INDEX IF NOT EXISTS idx_pr_employee   ON performance_reviews(employee_id);
CREATE INDEX IF NOT EXISTS idx_pr_period     ON performance_reviews(review_period);
CREATE INDEX IF NOT EXISTS idx_pr_score      ON performance_reviews(overall_score);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION set_performance_reviews_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_pr_updated_at ON performance_reviews;
CREATE TRIGGER trg_pr_updated_at
  BEFORE UPDATE ON performance_reviews
  FOR EACH ROW EXECUTE FUNCTION set_performance_reviews_updated_at();
