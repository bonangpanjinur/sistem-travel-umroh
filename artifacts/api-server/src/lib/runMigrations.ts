import { pool } from "./db";
import { logger } from "./logger";

/**
 * Runs one-time idempotent SQL statements against the Neon/Postgres database
 * at server startup. Safe to re-run on every boot — all statements use
 * CREATE OR REPLACE / IF NOT EXISTS / DROP … IF EXISTS guards.
 */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    // ── Check whether the payments table exists before touching it ────────────
    const { rows } = await client.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name   = 'payments'
      ) AS exists
    `);

    if (!rows[0]?.exists) {
      logger.info("runMigrations: payments table not found — skipping trigger setup (schema not applied yet)");
      return;
    }

    // ── Trigger function: recalculate booking totals ──────────────────────────
    await client.query(`
      CREATE OR REPLACE FUNCTION sync_booking_payment_totals()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      DECLARE
        v_booking_id   UUID;
        v_total_price  NUMERIC;
        v_paid_amount  NUMERIC;
        v_remaining    NUMERIC;
        v_pay_status   TEXT;
      BEGIN
        IF TG_OP = 'DELETE' THEN
          v_booking_id := OLD.booking_id;
        ELSE
          v_booking_id := NEW.booking_id;
        END IF;

        IF v_booking_id IS NULL THEN
          RETURN COALESCE(NEW, OLD);
        END IF;

        SELECT total_price INTO v_total_price
        FROM bookings WHERE id = v_booking_id;

        IF NOT FOUND THEN
          RETURN COALESCE(NEW, OLD);
        END IF;

        SELECT COALESCE(SUM(amount), 0) INTO v_paid_amount
        FROM payments
        WHERE booking_id = v_booking_id
          AND status IN ('paid', 'verified');

        v_remaining := GREATEST(0, v_total_price - v_paid_amount);

        v_pay_status :=
          CASE
            WHEN v_paid_amount >= v_total_price AND v_total_price > 0 THEN 'paid'
            WHEN v_paid_amount > 0                                    THEN 'partial'
            ELSE                                                           'pending'
          END;

        UPDATE bookings
        SET
          paid_amount      = v_paid_amount,
          remaining_amount = v_remaining,
          payment_status   = v_pay_status
        WHERE id = v_booking_id;

        RETURN COALESCE(NEW, OLD);
      END;
      $$
    `);

    // ── Attach trigger (idempotent: drop + recreate) ──────────────────────────
    await client.query(`
      DROP TRIGGER IF EXISTS trg_sync_booking_payment_totals ON payments
    `);
    await client.query(`
      CREATE TRIGGER trg_sync_booking_payment_totals
        AFTER INSERT OR UPDATE OF amount, status OR DELETE
        ON payments
        FOR EACH ROW
        EXECUTE FUNCTION sync_booking_payment_totals()
    `);

    logger.info("runMigrations: payment sync trigger installed successfully");
  } catch (err) {
    // Log but don't crash the server — the app still works without the trigger
    logger.error({ err }, "runMigrations: failed to apply migrations");
  } finally {
    client.release();
  }
}
