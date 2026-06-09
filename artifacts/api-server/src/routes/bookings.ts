import { Router } from 'express';
import { db } from '../lib/db.js';
import { pool } from '../lib/db.js';
import { sql } from 'drizzle-orm';
import { logger } from '../lib/logger.js';

const router = Router();

// ── Helper: recalculate booking payment totals ────────────────────────────────
async function recalcBookingTotals(bookingId: string): Promise<void> {
  await pool.query(`
    UPDATE bookings b
    SET
      paid_amount      = COALESCE((
        SELECT SUM(amount) FROM payments
        WHERE booking_id = b.id AND status IN ('paid','verified')
      ), 0),
      remaining_amount = GREATEST(0, b.total_price - COALESCE((
        SELECT SUM(amount) FROM payments
        WHERE booking_id = b.id AND status IN ('paid','verified')
      ), 0)),
      payment_status   = CASE
        WHEN COALESCE((SELECT SUM(amount) FROM payments WHERE booking_id = b.id AND status IN ('paid','verified')), 0) >= b.total_price AND b.total_price > 0 THEN 'paid'
        WHEN COALESCE((SELECT SUM(amount) FROM payments WHERE booking_id = b.id AND status IN ('paid','verified')), 0) > 0 THEN 'partial'
        ELSE 'pending'
      END,
      updated_at = NOW()
    WHERE b.id = $1
  `, [bookingId]);
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings/reserve-slot
// ─────────────────────────────────────────────────────────────────────────────
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
    if (!row?.result) {
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings/release-slot
// ─────────────────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/bookings/sync-payment-totals
// ─────────────────────────────────────────────────────────────────────────────
router.post('/sync-payment-totals', async (req, res) => {
  const start = Date.now();
  try {
    const result = await db.execute(sql`
      WITH recalc AS (
        SELECT
          b.id AS booking_id,
          b.total_price,
          COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0) AS correct_paid,
          GREATEST(0, b.total_price - COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0)) AS correct_remaining,
          CASE
            WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0) >= b.total_price AND b.total_price > 0 THEN 'paid'
            WHEN COALESCE(SUM(p.amount) FILTER (WHERE p.status IN ('paid','verified')), 0) > 0 THEN 'partial'
            ELSE 'pending'
          END AS correct_status
        FROM bookings b
        LEFT JOIN payments p ON p.booking_id = b.id
        GROUP BY b.id, b.total_price
      ),
      total_count AS (SELECT COUNT(*) AS cnt FROM recalc),
      updated AS (
        UPDATE bookings b
        SET paid_amount = r.correct_paid, remaining_amount = r.correct_remaining, payment_status = r.correct_status
        FROM recalc r
        WHERE b.id = r.booking_id
          AND (b.paid_amount IS DISTINCT FROM r.correct_paid OR b.remaining_amount IS DISTINCT FROM r.correct_remaining OR b.payment_status IS DISTINCT FROM r.correct_status)
        RETURNING b.id
      )
      SELECT (SELECT COUNT(*) FROM updated) AS updated_count, (SELECT cnt FROM total_count) AS total_processed
    `);
    const row = result.rows[0] as any;
    res.json({
      success: true,
      updatedCount: Number(row?.updated_count ?? 0),
      totalProcessed: Number(row?.total_processed ?? 0),
      durationMs: Date.now() - start,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/bookings/:id
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  if (!id) { res.status(400).json({ success: false, error: 'Booking ID wajib diisi.' }); return; }
  try {
    const client = await pool.connect();
    try {
      const { rowCount } = await client.query(`DELETE FROM bookings WHERE id = $1`, [id]);
      if (!rowCount) {
        res.status(404).json({ success: false, error: 'Booking tidak ditemukan.' });
        return;
      }
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (err: any) {
    logger.error({ err }, 'DELETE /bookings/:id error');
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/status
// Body: { status: string }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: string };
  if (!id || !status) { res.status(400).json({ success: false, error: 'id dan status wajib.' }); return; }
  try {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE bookings SET booking_status = $1, updated_at = NOW() WHERE id = $2`,
        [status, id]
      );
      res.json({ success: true });
    } finally {
      client.release();
    }

    // Fire push notification untuk booking confirmed (best-effort, non-blocking)
    if (status === 'confirmed' || status === 'pending') {
      fetch(`http://localhost:${process.env['PORT'] ?? 8080}/api/push/new-booking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: id }),
      }).catch(() => {});
    }
  } catch (err: any) {
    logger.error({ err }, 'PATCH /bookings/:id/status error');
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/notes
// Body: { notes: string }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/notes', async (req, res) => {
  const { id } = req.params;
  const { notes } = req.body as { notes: string };
  if (!id) { res.status(400).json({ success: false, error: 'Booking ID wajib diisi.' }); return; }
  try {
    const client = await pool.connect();
    try {
      await client.query(`UPDATE bookings SET notes = $1, updated_at = NOW() WHERE id = $2`, [notes ?? null, id]);
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (err: any) {
    logger.error({ err }, 'PATCH /bookings/:id/notes error');
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/deadline
// Body: { payment_deadline: string | null }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/deadline', async (req, res) => {
  const { id } = req.params;
  const { payment_deadline } = req.body as { payment_deadline: string | null };
  if (!id) { res.status(400).json({ success: false, error: 'Booking ID wajib diisi.' }); return; }
  try {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE bookings SET payment_deadline = $1, updated_at = NOW() WHERE id = $2`,
        [payment_deadline ?? null, id]
      );
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (err: any) {
    logger.error({ err }, 'PATCH /bookings/:id/deadline error');
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/cancel
// Body: { withRefund?: boolean, refundAmount?: number, refundMethod?: string,
//         accountInfo?: string, reason?: string, userId?: string }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/cancel', async (req, res) => {
  const { id } = req.params;
  const {
    withRefund = false,
    refundAmount = 0,
    refundMethod = 'transfer_bank',
    accountInfo,
    reason,
    userId,
    customerId,
  } = req.body as {
    withRefund?: boolean;
    refundAmount?: number;
    refundMethod?: string;
    accountInfo?: string;
    reason?: string;
    userId?: string;
    customerId?: string;
  };
  if (!id) { res.status(400).json({ success: false, error: 'Booking ID wajib diisi.' }); return; }

  const targetStatus = withRefund ? 'refunded' : 'cancelled';
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE bookings SET booking_status = $1, updated_at = NOW() WHERE id = $2`,
      [targetStatus, id]
    );
    let refundId: string | null = null;
    if (withRefund && refundAmount > 0) {
      const { rows } = await client.query(
        `INSERT INTO refunds (booking_id, customer_id, amount, refund_method, account_info, reason, status, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW(), NOW())
         RETURNING id`,
        [id, customerId ?? null, refundAmount, refundMethod, accountInfo ?? null, reason ?? null, userId ?? null]
      );
      refundId = rows[0]?.id ?? null;
    }
    await client.query('COMMIT');
    res.json({ success: true, targetStatus, refundId });
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'PATCH /bookings/:id/cancel error');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/bookings/:id/payments/:paymentId
// Hapus pembayaran lalu recalculate totals
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/:id/payments/:paymentId', async (req, res) => {
  const { id: bookingId, paymentId } = req.params;
  if (!bookingId || !paymentId) {
    res.status(400).json({ success: false, error: 'bookingId dan paymentId wajib.' });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      `DELETE FROM payments WHERE id = $1 AND booking_id = $2`,
      [paymentId, bookingId]
    );
    if (!rowCount) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: 'Pembayaran tidak ditemukan.' });
      return;
    }
    await client.query('COMMIT');
    await recalcBookingTotals(bookingId);
    res.json({ success: true });
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'DELETE /bookings/:id/payments/:paymentId error');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/payments/:paymentId/verify
// Body: { status: 'paid' | 'failed', notes?: string, verifiedBy?: string }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/payments/:paymentId/verify', async (req, res) => {
  const { id: bookingId, paymentId } = req.params;
  const { status, notes, verifiedBy } = req.body as {
    status: 'paid' | 'failed';
    notes?: string;
    verifiedBy?: string;
  };
  if (!bookingId || !paymentId || !status) {
    res.status(400).json({ success: false, error: 'bookingId, paymentId, dan status wajib.' });
    return;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const { rowCount } = await client.query(
      `UPDATE payments
       SET status = $1, verified_at = NOW(), verified_by = $2, notes = COALESCE($3, notes), updated_at = NOW()
       WHERE id = $4 AND booking_id = $5`,
      [status, verifiedBy ?? null, notes ?? null, paymentId, bookingId]
    );
    if (!rowCount) {
      await client.query('ROLLBACK');
      res.status(404).json({ success: false, error: 'Pembayaran tidak ditemukan.' });
      return;
    }
    await client.query('COMMIT');
    await recalcBookingTotals(bookingId);

    const { rows } = await client.query(
      `SELECT b.paid_amount, b.remaining_amount, b.payment_status, b.total_price
       FROM bookings b WHERE b.id = $1`,
      [bookingId]
    );
    const bk = rows[0];
    res.json({
      success: true,
      status,
      booking: bk ? {
        paidAmount: Number(bk.paid_amount),
        remainingAmount: Number(bk.remaining_amount),
        paymentStatus: bk.payment_status,
        totalPrice: Number(bk.total_price),
      } : null,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'PATCH /bookings/:id/payments/:paymentId/verify error');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/bookings/:id/passengers/:passengerId/room
// Body: { room_number: string | null }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id/passengers/:passengerId/room', async (req, res) => {
  const { passengerId } = req.params;
  const { room_number } = req.body as { room_number: string | null };
  if (!passengerId) { res.status(400).json({ success: false, error: 'passengerId wajib.' }); return; }
  try {
    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE booking_passengers SET room_number = $1 WHERE id = $2`,
        [room_number ?? null, passengerId]
      );
      res.json({ success: true });
    } finally {
      client.release();
    }
  } catch (err: any) {
    logger.error({ err }, 'PATCH /bookings/:id/passengers/:passengerId/room error');
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
