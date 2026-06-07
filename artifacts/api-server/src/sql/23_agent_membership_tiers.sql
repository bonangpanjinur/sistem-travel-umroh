-- =============================================================================
-- 23 — Membership Tier Otomatis Agen (Bronze → Silver → Gold → Platinum)
-- =============================================================================
-- Tambah kolom membership_tier ke agents, tabel konfigurasi threshold,
-- fungsi batch-recalculate, dan trigger real-time per booking.

-- ─── 1. Kolom membership_tier di agents ──────────────────────────────────────
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS membership_tier TEXT NOT NULL DEFAULT 'bronze'
    CHECK (membership_tier IN ('bronze', 'silver', 'gold', 'platinum'));

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS membership_tier_updated_at TIMESTAMPTZ;

ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS total_confirmed_bookings INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_agents_membership_tier
  ON agents(membership_tier);

-- ─── 2. Tabel konfigurasi threshold tier ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS agent_tier_config (
  tier         TEXT      PRIMARY KEY
                         CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum')),
  min_bookings INTEGER   NOT NULL DEFAULT 0,
  label        TEXT      NOT NULL,
  color        TEXT      NOT NULL DEFAULT '#6b7280',
  description  TEXT,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO agent_tier_config (tier, min_bookings, label, color, description) VALUES
  ('bronze',    0,  'Bronze',   '#cd7f32', 'Agen baru — belum memenuhi syarat tier lebih tinggi'),
  ('silver',    5,  'Silver',   '#9ca3af', 'Minimal 5 booking confirmed/completed'),
  ('gold',     15,  'Gold',     '#d97706', 'Minimal 15 booking confirmed/completed'),
  ('platinum', 30,  'Platinum', '#7c3aed', 'Minimal 30 booking confirmed/completed')
ON CONFLICT (tier) DO NOTHING;

-- ─── 3. Fungsi batch-recalculate semua agen ──────────────────────────────────
CREATE OR REPLACE FUNCTION refresh_agent_membership_tiers()
RETURNS TABLE (
  agent_id      UUID,
  agent_code    TEXT,
  old_tier      TEXT,
  new_tier      TEXT,
  booking_count BIGINT
) AS $$
DECLARE
  _platinum_min INT;
  _gold_min     INT;
  _silver_min   INT;
BEGIN
  SELECT min_bookings INTO _platinum_min FROM agent_tier_config WHERE tier = 'platinum';
  SELECT min_bookings INTO _gold_min     FROM agent_tier_config WHERE tier = 'gold';
  SELECT min_bookings INTO _silver_min   FROM agent_tier_config WHERE tier = 'silver';

  RETURN QUERY
  WITH booking_counts AS (
    SELECT
      a.id            AS aid,
      a.agent_code    AS acode,
      a.membership_tier AS old_t,
      COUNT(b.id)     AS cnt
    FROM agents a
    LEFT JOIN bookings b
      ON  b.agent_id = a.id
      AND b.booking_status IN ('confirmed', 'completed')
    WHERE a.status = 'active'
    GROUP BY a.id, a.agent_code, a.membership_tier
  ),
  classified AS (
    SELECT
      aid,
      acode,
      old_t,
      cnt,
      CASE
        WHEN cnt >= _platinum_min THEN 'platinum'
        WHEN cnt >= _gold_min     THEN 'gold'
        WHEN cnt >= _silver_min   THEN 'silver'
        ELSE 'bronze'
      END AS new_t
    FROM booking_counts
  )
  UPDATE agents a
  SET
    membership_tier            = c.new_t,
    membership_tier_updated_at = NOW(),
    total_confirmed_bookings   = c.cnt::INTEGER,
    updated_at                 = NOW()
  FROM classified c
  WHERE a.id = c.aid
  RETURNING
    a.id         AS agent_id,
    c.acode      AS agent_code,
    c.old_t      AS old_tier,
    c.new_t      AS new_tier,
    c.cnt        AS booking_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to service_role (used by API server)
GRANT EXECUTE ON FUNCTION refresh_agent_membership_tiers() TO service_role;
GRANT EXECUTE ON FUNCTION refresh_agent_membership_tiers() TO authenticated;

-- ─── 4. Trigger fungsi — real-time update per booking ────────────────────────
CREATE OR REPLACE FUNCTION trg_booking_update_agent_tier()
RETURNS TRIGGER AS $$
DECLARE
  _agent_id     UUID;
  _cnt          BIGINT;
  _new_tier     TEXT;
  _platinum_min INT;
  _gold_min     INT;
  _silver_min   INT;
BEGIN
  _agent_id := COALESCE(NEW.agent_id, OLD.agent_id);
  IF _agent_id IS NULL THEN RETURN NEW; END IF;

  -- Skip jika tidak ada perubahan relevan (booking_status dan agent_id sama)
  IF TG_OP = 'UPDATE'
     AND OLD.booking_status IS NOT DISTINCT FROM NEW.booking_status
     AND OLD.agent_id IS NOT DISTINCT FROM NEW.agent_id
  THEN
    RETURN NEW;
  END IF;

  -- Baca threshold dari config
  SELECT min_bookings INTO _platinum_min FROM agent_tier_config WHERE tier = 'platinum';
  SELECT min_bookings INTO _gold_min     FROM agent_tier_config WHERE tier = 'gold';
  SELECT min_bookings INTO _silver_min   FROM agent_tier_config WHERE tier = 'silver';

  -- Hitung booking confirmed/completed untuk agen ini
  SELECT COUNT(*) INTO _cnt
  FROM bookings
  WHERE agent_id = _agent_id
    AND booking_status IN ('confirmed', 'completed');

  -- Tentukan tier baru
  IF     _cnt >= COALESCE(_platinum_min, 30) THEN _new_tier := 'platinum';
  ELSIF  _cnt >= COALESCE(_gold_min,     15) THEN _new_tier := 'gold';
  ELSIF  _cnt >= COALESCE(_silver_min,    5) THEN _new_tier := 'silver';
  ELSE                                            _new_tier := 'bronze';
  END IF;

  -- Update agents hanya jika tier berubah
  UPDATE agents
  SET
    membership_tier            = _new_tier,
    membership_tier_updated_at = NOW(),
    total_confirmed_bookings   = _cnt::INTEGER,
    updated_at                 = NOW()
  WHERE id = _agent_id
    AND membership_tier IS DISTINCT FROM _new_tier;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 5. Install trigger ───────────────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_update_agent_tier ON bookings;
CREATE TRIGGER trg_update_agent_tier
  AFTER INSERT OR UPDATE OF booking_status, agent_id ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trg_booking_update_agent_tier();

-- ─── 6. Seed awal — jalankan recalculate untuk data existing ─────────────────
DO $$
BEGIN
  PERFORM refresh_agent_membership_tiers();
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'Initial agent tier calculation skipped: %', SQLERRM;
END;
$$;
