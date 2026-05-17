import { pool } from "./db";
import { logger } from "./logger";

/**
 * Runs idempotent SQL statements against the Neon/Postgres database at server
 * startup. Safe to re-run on every boot — all statements use CREATE OR REPLACE /
 * IF NOT EXISTS / DROP … IF EXISTS guards, and the backfill only touches rows
 * whose stored values differ from the computed truth.
 */
export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    // ── Guard: skip everything if payments table doesn't exist yet ────────────
    const { rows: tableCheck } = await client.query<{ exists: boolean }>(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name   = 'payments'
      ) AS exists
    `);

    if (!tableCheck[0]?.exists) {
      logger.info("runMigrations: payments table not found — skipping (schema not applied yet)");
      return;
    }

    // ── 1. Trigger function: recalculate booking totals on every payment change ─
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

        v_remaining  := GREATEST(0, v_total_price - v_paid_amount);
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

    await client.query(`DROP TRIGGER IF EXISTS trg_sync_booking_payment_totals ON payments`);
    await client.query(`
      CREATE TRIGGER trg_sync_booking_payment_totals
        AFTER INSERT OR UPDATE OF amount, status OR DELETE
        ON payments
        FOR EACH ROW
        EXECUTE FUNCTION sync_booking_payment_totals()
    `);

    logger.info("runMigrations: payment sync trigger installed");

    // ── 2. One-time backfill: fix any bookings whose totals are out of sync ────
    const { rowCount } = await client.query(`
      WITH recalc AS (
        SELECT
          b.id                                                                    AS booking_id,
          b.total_price,
          COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0)
                                                                                  AS correct_paid,
          GREATEST(
            0,
            b.total_price -
            COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0)
          )                                                                       AS correct_remaining,
          CASE
            WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0)
                   >= b.total_price AND b.total_price > 0                         THEN 'paid'
            WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0)
                   > 0                                                             THEN 'partial'
            ELSE                                                                        'pending'
          END                                                                     AS correct_status
        FROM bookings b
        LEFT JOIN payments p ON p.booking_id = b.id
        GROUP BY b.id, b.total_price
      )
      UPDATE bookings b
      SET
        paid_amount      = r.correct_paid,
        remaining_amount = r.correct_remaining,
        payment_status   = r.correct_status
      FROM recalc r
      WHERE b.id = r.booking_id
        AND (
          b.paid_amount      IS DISTINCT FROM r.correct_paid      OR
          b.remaining_amount IS DISTINCT FROM r.correct_remaining OR
          b.payment_status   IS DISTINCT FROM r.correct_status
        )
    `);

    if ((rowCount ?? 0) > 0) {
      logger.info({ fixed: rowCount }, "runMigrations: backfilled out-of-sync booking totals");
    } else {
      logger.info("runMigrations: all booking totals are already in sync — no backfill needed");
    }
  } catch (err) {
    logger.error({ err }, "runMigrations: failed — app continues without trigger/backfill");
  } finally {
    client.release();
  }
}
