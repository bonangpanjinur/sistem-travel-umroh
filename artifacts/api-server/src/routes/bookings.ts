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

export default router;
