-- Migration 046: Komisi bertingkat agen otomatis (P5)
-- Kalkulasi komisi by volume dengan tiered rate
-- Tier: Bronze (< 5 booking) → Silver (5-14) → Gold (15-29) → Platinum (30+)

-- Tabel tier komisi agen
CREATE TABLE IF NOT EXISTS agent_commission_tiers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name       TEXT NOT NULL,
  min_bookings    INT  NOT NULL DEFAULT 0,
  max_bookings    INT,
  commission_rate NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  bonus_amount    NUMERIC(15,2) NOT NULL DEFAULT 0,
  description     TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agent_commission_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_agent_commission_tiers" ON agent_commission_tiers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid()
      AND role IN ('super_admin','owner','admin','finance'))
  );

CREATE POLICY "agent_read_commission_tiers" ON agent_commission_tiers
  FOR SELECT USING (is_active = TRUE);

-- Seed data tier komisi default
INSERT INTO agent_commission_tiers (tier_name, min_bookings, max_bookings, commission_rate, bonus_amount, description)
VALUES
  ('Bronze',   0,  4,    5.00,        0, 'Agen baru — s.d. 4 booking konfirmasi per bulan'),
  ('Silver',   5,  14,   6.50,   500000, 'Agen aktif — 5-14 booking per bulan + bonus Rp 500.000'),
  ('Gold',     15, 29,   8.00, 1500000, 'Agen senior — 15-29 booking per bulan + bonus Rp 1.500.000'),
  ('Platinum', 30, NULL, 10.00, 3000000, 'Agen elite — 30+ booking per bulan + bonus Rp 3.000.000')
ON CONFLICT DO NOTHING;

-- Kolom tier_level di tabel agents (jika belum ada)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'commission_tier'
  ) THEN
    ALTER TABLE agents ADD COLUMN commission_tier TEXT NOT NULL DEFAULT 'Bronze'
      CHECK (commission_tier IN ('Bronze','Silver','Gold','Platinum'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'monthly_bookings_count'
  ) THEN
    ALTER TABLE agents ADD COLUMN monthly_bookings_count INT NOT NULL DEFAULT 0;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'agents' AND column_name = 'tier_updated_at'
  ) THEN
    ALTER TABLE agents ADD COLUMN tier_updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- Fungsi: hitung tier berdasarkan jumlah booking bulan ini
CREATE OR REPLACE FUNCTION get_agent_tier(p_bookings_count INT)
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_tier TEXT := 'Bronze';
BEGIN
  SELECT tier_name INTO v_tier
  FROM agent_commission_tiers
  WHERE is_active = TRUE
    AND min_bookings <= p_bookings_count
    AND (max_bookings IS NULL OR max_bookings >= p_bookings_count)
  ORDER BY min_bookings DESC
  LIMIT 1;
  RETURN COALESCE(v_tier, 'Bronze');
END;
$$;

-- Fungsi: hitung komisi dengan tier
CREATE OR REPLACE FUNCTION calculate_tiered_commission(
  p_agent_id UUID,
  p_booking_amount NUMERIC,
  p_month_key TEXT DEFAULT NULL
)
RETURNS TABLE(
  tier        TEXT,
  rate        NUMERIC,
  commission  NUMERIC,
  bonus       NUMERIC,
  total       NUMERIC
) LANGUAGE plpgsql AS $$
DECLARE
  v_month      TEXT := COALESCE(p_month_key, TO_CHAR(NOW(), 'YYYY-MM'));
  v_count      INT  := 0;
  v_tier       TEXT;
  v_rate       NUMERIC;
  v_bonus      NUMERIC;
BEGIN
  -- Hitung jumlah booking bulan ini untuk agen ini
  SELECT COUNT(*) INTO v_count
  FROM bookings b
  WHERE b.agent_id = p_agent_id
    AND b.status IN ('confirmed','completed')
    AND TO_CHAR(b.created_at, 'YYYY-MM') = v_month;

  -- Ambil tier dan rate
  SELECT tier_name, commission_rate, bonus_amount
  INTO v_tier, v_rate, v_bonus
  FROM agent_commission_tiers
  WHERE is_active = TRUE
    AND min_bookings <= v_count
    AND (max_bookings IS NULL OR max_bookings >= v_count)
  ORDER BY min_bookings DESC
  LIMIT 1;

  v_tier  := COALESCE(v_tier, 'Bronze');
  v_rate  := COALESCE(v_rate, 5.00);
  v_bonus := COALESCE(v_bonus, 0);

  RETURN QUERY SELECT
    v_tier,
    v_rate,
    ROUND(p_booking_amount * v_rate / 100, 0),
    v_bonus,
    ROUND(p_booking_amount * v_rate / 100, 0) + v_bonus;
END;
$$;

-- Trigger: auto-update tier agen saat komisi baru dicatat
CREATE OR REPLACE FUNCTION tg_auto_update_agent_tier()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_month     TEXT := TO_CHAR(NOW(), 'YYYY-MM');
  v_count     INT  := 0;
  v_new_tier  TEXT;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM bookings b
  WHERE b.agent_id = NEW.agent_id
    AND b.status IN ('confirmed','completed')
    AND TO_CHAR(b.created_at, 'YYYY-MM') = v_month;

  v_new_tier := get_agent_tier(v_count);

  UPDATE agents
  SET commission_tier = v_new_tier,
      monthly_bookings_count = v_count,
      tier_updated_at = NOW()
  WHERE id = NEW.agent_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_update_agent_tier ON agent_commissions;
CREATE TRIGGER trg_auto_update_agent_tier
  AFTER INSERT OR UPDATE ON agent_commissions
  FOR EACH ROW
  EXECUTE FUNCTION tg_auto_update_agent_tier();

SELECT 'Migration 046 completed — agent_commission_tiers + tiered commission system' AS result;
