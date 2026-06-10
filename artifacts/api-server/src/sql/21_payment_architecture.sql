-- =============================================================================
-- 21_payment_architecture.sql
-- Unified Payment Architecture: manual, transfer bukti, payment gateway
-- =============================================================================

-- ── bank_accounts ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bank_accounts (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name       TEXT        NOT NULL,
  account_number  TEXT        NOT NULL,
  account_name    TEXT        NOT NULL,
  branch          TEXT,
  is_primary      BOOLEAN     NOT NULL DEFAULT FALSE,
  is_active       BOOLEAN     NOT NULL DEFAULT TRUE,
  notes           TEXT,
  logo_url        TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_accounts_primary ON bank_accounts (is_primary, is_active);

-- ── Add rejection_notes to payments (safe ALTER) ──────────────────────────────
ALTER TABLE payments ADD COLUMN IF NOT EXISTS rejection_notes TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS gateway_name    TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS proof_filename  TEXT;

-- ── payment_page_tokens — shareable one-time payment page links ───────────────
CREATE TABLE IF NOT EXISTS payment_page_tokens (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID        NOT NULL,
  token           TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '72 hours',
  used_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_tokens_booking ON payment_page_tokens (booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_tokens_token   ON payment_page_tokens (token);

-- ── Trigger: auto-sync paid_amount / remaining_amount / payment_status ────────
CREATE OR REPLACE FUNCTION sync_booking_paid_amount()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_total      NUMERIC(15,2);
  v_paid       NUMERIC(15,2);
  v_remaining  NUMERIC(15,2);
  v_pay_status TEXT;
BEGIN
  -- Work on correct booking_id
  IF TG_OP = 'DELETE' THEN
    -- Use OLD row
    SELECT COALESCE(SUM(amount), 0)
    INTO v_paid
    FROM payments
    WHERE booking_id = OLD.booking_id AND status = 'verified';

    SELECT total_price INTO v_total FROM bookings WHERE id = OLD.booking_id;
    v_remaining  := GREATEST(0, COALESCE(v_total, 0) - v_paid);
    v_pay_status := CASE
      WHEN v_paid = 0                       THEN 'unpaid'
      WHEN v_paid >= COALESCE(v_total, 0)   THEN 'paid'
      ELSE                                       'partial'
    END;
    UPDATE bookings
    SET paid_amount      = v_paid,
        remaining_amount = v_remaining,
        payment_status   = v_pay_status,
        updated_at       = NOW()
    WHERE id = OLD.booking_id;
    RETURN OLD;
  END IF;

  SELECT COALESCE(SUM(amount), 0)
  INTO v_paid
  FROM payments
  WHERE booking_id = NEW.booking_id AND status = 'verified';

  SELECT total_price INTO v_total FROM bookings WHERE id = NEW.booking_id;
  v_remaining  := GREATEST(0, COALESCE(v_total, 0) - v_paid);
  v_pay_status := CASE
    WHEN v_paid = 0                       THEN 'unpaid'
    WHEN v_paid >= COALESCE(v_total, 0)   THEN 'paid'
    ELSE                                       'partial'
  END;

  UPDATE bookings
  SET paid_amount      = v_paid,
      remaining_amount = v_remaining,
      payment_status   = v_pay_status,
      updated_at       = NOW()
  WHERE id = NEW.booking_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_booking_paid_amount ON payments;
CREATE TRIGGER trg_sync_booking_paid_amount
  AFTER INSERT OR UPDATE OF status, amount OR DELETE
  ON payments
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_paid_amount();

-- ── Default bank account seed (can be overridden in admin) ────────────────────
INSERT INTO bank_accounts (bank_name, account_number, account_name, is_primary, is_active, notes)
VALUES ('BCA', '1234567890', 'PT Vinstour Travel', TRUE, TRUE, 'Rekening utama')
ON CONFLICT DO NOTHING;
