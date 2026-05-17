import { Router } from 'express';
import { db } from '../lib/db.js';
import { sql } from 'drizzle-orm';

const router = Router();

/**
 * POST /api/bookings/reserve-slot
 * P7: Server-side seat lock — menghindari race condition saat booking bersamaan.
 * Memanggil DB function reserve_departure_slot(p_departure_id, p_pax, p_user_id).
 *
 * Body: { departureId: string, pax: number, userId?: string }
 * Returns: { success: boolean, availableSeats?: number, error?: string }
 */
router.post('/reserve-slot', async (req, res) => {
  const { departureId, pax, userId } = req.body as {
    departureId: string;
    pax: number;
    userId?: string;
  };

  if (!departureId || !pax || pax < 1) {
    res.status(400).json({ success: false, error: 'departureId dan pax (min 1) wajib diisi.' });
    return;
  }

  try {
    const result = await db.execute(
      sql`SELECT reserve_departure_slot(${departureId}::uuid, ${pax}::integer, ${userId ?? null}::uuid) AS result`
    );
    const row = result.rows[0] as any;
    const ok = row?.result;
    if (!ok) {
      res.status(409).json({ success: false, error: 'Slot tidak tersedia. Kursi habis atau keberangkatan sudah ditutup.' });
      return;
    }
    const seatRow = await db.execute(
      sql`SELECT available_seats FROM departures WHERE id = ${departureId}::uuid`
    );
    const available = (seatRow.rows[0] as any)?.available_seats ?? null;
    res.json({ success: true, availableSeats: available });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/bookings/release-slot
 * Melepas reserved slot (misal jika user cancel sebelum konfirmasi).
 *
 * Body: { departureId: string, pax: number }
 */
router.post('/release-slot', async (req, res) => {
  const { departureId, pax } = req.body as { departureId: string; pax: number };
  if (!departureId || !pax) {
    res.status(400).json({ success: false, error: 'departureId dan pax wajib diisi.' });
    return;
  }
  try {
    await db.execute(
      sql`UPDATE departures SET available_seats = LEAST(quota, available_seats + ${pax}::integer), updated_at = NOW() WHERE id = ${departureId}::uuid`
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/bookings/sync-payment-totals
 * Super-admin / owner utility: recalculates paid_amount, remaining_amount, and
 * payment_status for every booking by summing only confirmed payments
 * (status IN ('paid','verified')). Idempotent — only rows that need correction
 * are touched.
 *
 * Returns: { success, updatedCount, totalProcessed, durationMs }
 */
router.post('/sync-payment-totals', async (req, res) => {
  const start = Date.now();
  try {
    const result = await db.execute(sql`
      WITH recalc AS (
        SELECT
          b.id                                                                              AS booking_id,
          b.total_price,
          COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0)        AS correct_paid,
          GREATEST(
            0,
            b.total_price
              - COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0)
          )                                                                                 AS correct_remaining,
          CASE
            WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0)
                   >= b.total_price AND b.total_price > 0                                  THEN 'paid'
            WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0)
                   > 0                                                                      THEN 'partial'
            ELSE                                                                                 'pending'
          END                                                                               AS correct_status
        FROM bookings b
        LEFT JOIN payments p ON p.booking_id = b.id
        GROUP BY b.id, b.total_price
      ),
      total_count AS (SELECT COUNT(*) AS cnt FROM recalc),
      updated AS (
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
        RETURNING b.id
      )
      SELECT
        (SELECT COUNT(*) FROM updated)    AS updated_count,
        (SELECT cnt FROM total_count)     AS total_processed
    `);

    const row = result.rows[0] as any;
    res.json({
      success: true,
      updatedCount:    Number(row?.updated_count    ?? 0),
      totalProcessed:  Number(row?.total_processed  ?? 0),
      durationMs:      Date.now() - start,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
