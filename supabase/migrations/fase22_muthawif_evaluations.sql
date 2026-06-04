-- Fase 22: Tabel penilaian jamaah oleh muthawif
-- Muthawif dapat memberi rating & catatan per jamaah selama keberangkatan

CREATE TABLE IF NOT EXISTS muthawif_jamaah_evaluations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  muthawif_id   uuid        NOT NULL REFERENCES muthawifs(id) ON DELETE CASCADE,
  departure_id  uuid        NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  customer_id   uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  booking_id    uuid        REFERENCES bookings(id) ON DELETE SET NULL,
  rating        smallint    NOT NULL CHECK (rating BETWEEN 1 AND 5),
  kategori      text        NOT NULL DEFAULT 'umum'
                            CHECK (kategori IN ('umum','ibadah','kesehatan','disiplin','sosial')),
  catatan       text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),

  UNIQUE (muthawif_id, departure_id, customer_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mje_departure  ON muthawif_jamaah_evaluations (departure_id);
CREATE INDEX IF NOT EXISTS idx_mje_muthawif   ON muthawif_jamaah_evaluations (muthawif_id);
CREATE INDEX IF NOT EXISTS idx_mje_customer   ON muthawif_jamaah_evaluations (customer_id);

-- RLS
ALTER TABLE muthawif_jamaah_evaluations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "muthawif_eval_select" ON muthawif_jamaah_evaluations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "muthawif_eval_insert" ON muthawif_jamaah_evaluations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "muthawif_eval_update" ON muthawif_jamaah_evaluations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "muthawif_eval_delete" ON muthawif_jamaah_evaluations
  FOR DELETE TO authenticated USING (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_mje_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_mje_updated_at
  BEFORE UPDATE ON muthawif_jamaah_evaluations
  FOR EACH ROW EXECUTE FUNCTION update_mje_updated_at();

COMMENT ON TABLE muthawif_jamaah_evaluations IS
  'Penilaian muthawif per jamaah per keberangkatan — rating 1-5 + catatan per kategori';
