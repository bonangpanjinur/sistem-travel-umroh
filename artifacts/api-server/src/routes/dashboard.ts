import { Router } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

async function dbQuery(sql: string, params: any[] = []): Promise<any[]> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(sql, params);
    return rows;
  } catch {
    return [];
  } finally {
    client.release();
  }
}

// GET /api/dashboard/stats — ringkasan statistik untuk dashboard admin
router.get('/stats', async (_req, res) => {
  try {
    const [
      bookingStats,
      paymentStats,
      departureStats,
      customerStats,
    ] = await Promise.all([
      dbQuery(`
        SELECT
          COUNT(*) FILTER (WHERE status NOT IN ('cancelled','rejected')) AS total_active,
          COUNT(*) FILTER (WHERE status = 'confirmed') AS confirmed,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending,
          COUNT(*) FILTER (WHERE status IN ('cancelled','rejected')) AS cancelled,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days' AND status NOT IN ('cancelled','rejected')) AS new_30d
        FROM bookings
      `),
      dbQuery(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE status = 'verified'), 0) AS total_verified,
          COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0) AS total_pending,
          COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
          COALESCE(SUM(amount) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days' AND status = 'verified'), 0) AS revenue_30d
        FROM payments
      `),
      dbQuery(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE status = 'open') AS open,
          COUNT(*) FILTER (WHERE status = 'full') AS full,
          COUNT(*) FILTER (WHERE departure_date >= NOW() AND departure_date <= NOW() + INTERVAL '30 days') AS upcoming_30d
        FROM departures
      `),
      dbQuery(`
        SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS new_30d
        FROM customers
      `),
    ]);

    res.json({
      success: true,
      data: {
        bookings: bookingStats[0] || {},
        payments: paymentStats[0] || {},
        departures: departureStats[0] || {},
        customers: customerStats[0] || {},
        generated_at: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/booking-trend?days=30 — tren booking harian
router.get('/booking-trend', async (req, res) => {
  const days = Math.min(Number(req.query.days) || 30, 90);
  try {
    const rows = await dbQuery(`
      SELECT
        DATE(created_at AT TIME ZONE 'Asia/Jakarta') AS date,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE status NOT IN ('cancelled','rejected')) AS active
      FROM bookings
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY 1
      ORDER BY 1 ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/dashboard/revenue-trend?days=30 — tren pendapatan harian
router.get('/revenue-trend', async (req, res) => {
  const days = Math.min(Number(req.query.days) || 30, 90);
  try {
    const rows = await dbQuery(`
      SELECT
        DATE(created_at AT TIME ZONE 'Asia/Jakarta') AS date,
        COALESCE(SUM(amount) FILTER (WHERE status = 'verified'), 0) AS revenue
      FROM payments
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY 1
      ORDER BY 1 ASC
    `);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
