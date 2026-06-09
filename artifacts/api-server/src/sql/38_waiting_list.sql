-- Migration 081: departure_waiting_list — daftar tunggu per keberangkatan

CREATE TABLE IF NOT EXISTS departure_waiting_list (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id    UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  customer_email  TEXT,
  room_type       TEXT NOT NULL DEFAULT 'quad' CHECK (room_type IN ('single','double','triple','quad')),
  num_seats       INTEGER NOT NULL DEFAULT 1 CHECK (num_seats > 0),
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'waiting'
                    CHECK (status IN ('waiting','notified','converted','cancelled')),
  notified_at     TIMESTAMPTZ,
  converted_at    TIMESTAMPTZ,
  booking_id      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dwl_departure ON departure_waiting_list(departure_id);
CREATE INDEX IF NOT EXISTS idx_dwl_status    ON departure_waiting_list(status);
CREATE INDEX IF NOT EXISTS idx_dwl_created   ON departure_waiting_list(created_at DESC);
