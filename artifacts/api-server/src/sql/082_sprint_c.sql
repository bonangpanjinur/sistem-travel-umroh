-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 082 — Sprint C: departure_muthawifs, hotel_contracts,
--   hotel_vouchers, sos_escalation_log
-- ─────────────────────────────────────────────────────────────────────────────

-- ── C4: Multi-muthawif per departure ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departure_muthawifs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  departure_id   UUID NOT NULL REFERENCES departures(id) ON DELETE CASCADE,
  muthawif_id    UUID NOT NULL REFERENCES muthawifs(id) ON DELETE CASCADE,
  role           TEXT NOT NULL DEFAULT 'muthawif'
                   CHECK (role IN ('lead','muthawif','assistant')),
  notes          TEXT,
  assigned_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (departure_id, muthawif_id)
);

CREATE INDEX IF NOT EXISTS idx_dep_muthawifs_departure ON departure_muthawifs(departure_id);
CREATE INDEX IF NOT EXISTS idx_dep_muthawifs_muthawif  ON departure_muthawifs(muthawif_id);

-- ── C7: Hotel contracts ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotel_contracts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hotel_id        UUID REFERENCES hotels(id) ON DELETE SET NULL,
  departure_id    UUID REFERENCES departures(id) ON DELETE SET NULL,
  contract_number TEXT,
  contract_date   DATE,
  check_in_date   DATE,
  check_out_date  DATE,
  room_type       TEXT,
  total_rooms     INT DEFAULT 0,
  price_per_room  NUMERIC(15,2) DEFAULT 0,
  total_value     NUMERIC(15,2) GENERATED ALWAYS AS (total_rooms * price_per_room) STORED,
  currency        TEXT NOT NULL DEFAULT 'IDR',
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','confirmed','active','completed','cancelled')),
  notes           TEXT,
  document_url    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotel_contracts_hotel     ON hotel_contracts(hotel_id);
CREATE INDEX IF NOT EXISTS idx_hotel_contracts_departure ON hotel_contracts(departure_id);

-- ── C7: Hotel vouchers ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotel_vouchers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id     UUID NOT NULL REFERENCES hotel_contracts(id) ON DELETE CASCADE,
  voucher_number  TEXT,
  issued_date     DATE,
  valid_from      DATE,
  valid_until     DATE,
  room_type       TEXT,
  rooms_allocated INT DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active','used','expired','cancelled')),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hotel_vouchers_contract ON hotel_vouchers(contract_id);

-- ── C8: SOS escalation log ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sos_escalation_log (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sos_alert_id   UUID NOT NULL REFERENCES sos_alerts(id) ON DELETE CASCADE,
  escalated_to   TEXT NOT NULL,  -- 'team_leader' | 'admin_pusat' | 'emergency_services'
  escalated_by   TEXT,           -- user_id or 'system'
  reason         TEXT,
  notified_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged   BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sos_escalation_alert ON sos_escalation_log(sos_alert_id);

-- ── Update trigger for hotel_contracts.updated_at ────────────────────────────
CREATE OR REPLACE FUNCTION trg_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_hotel_contracts_updated_at'
  ) THEN
    CREATE TRIGGER set_hotel_contracts_updated_at
      BEFORE UPDATE ON hotel_contracts
      FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
  END IF;
END $$;
