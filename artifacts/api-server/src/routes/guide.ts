import { Router, type Request, type Response } from "express";
import { pool } from "../lib/db.js";
import { requireAuth } from "../lib/auth.js";
import { logger } from "../lib/logger.js";
import crypto from "crypto";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function genQrToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

// ── Channels ──────────────────────────────────────────────────────────────────

// GET /api/v1/guide/channels/:departureId
router.get("/channels/:departureId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { departureId } = req.params;
    const { rows } = await pool.query(
      `SELECT * FROM guide_channels WHERE departure_id = $1 AND is_active = true ORDER BY created_at`,
      [departureId]
    );
    if (rows.length === 0) {
      const insert = await pool.query(
        `INSERT INTO guide_channels (departure_id, name, channel_type, created_by)
         VALUES ($1, 'Seluruh Rombongan', 'all', $2)
         ON CONFLICT DO NOTHING RETURNING *`,
        [departureId, (req as any).user?.id]
      );
      res.json({ channels: insert.rows });
      return;
    }
    res.json({ channels: rows });
  } catch (err: any) {
    logger.error(err, "guide.channels.get");
    res.status(500).json({ error: err.message });
  }
});

// ── Broadcasts ────────────────────────────────────────────────────────────────

// GET /api/v1/guide/broadcasts/:departureId
router.get("/broadcasts/:departureId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { departureId } = req.params;
    const userId = (req as any).user?.id;
    const { rows } = await pool.query(
      `SELECT gb.*,
              au.email AS sender_email,
              p.full_name AS sender_name,
              (SELECT COUNT(*) FROM guide_broadcast_reads gbr WHERE gbr.broadcast_id = gb.id)::int AS read_count,
              EXISTS(SELECT 1 FROM guide_broadcast_reads gbr WHERE gbr.broadcast_id = gb.id AND gbr.user_id = $2) AS is_read
       FROM guide_broadcasts gb
       LEFT JOIN auth.users au ON au.id = gb.sender_user_id
       LEFT JOIN profiles p ON p.id = gb.sender_user_id
       WHERE gb.departure_id = $1
         AND (gb.expires_at IS NULL OR gb.expires_at > now())
       ORDER BY gb.is_pinned DESC, gb.created_at DESC
       LIMIT 100`,
      [departureId, userId]
    );
    res.json({ broadcasts: rows });
  } catch (err: any) {
    logger.error(err, "guide.broadcasts.get");
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/guide/broadcasts
router.post("/broadcasts", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { departure_id, channel_id, sender_role, message_type, title, body, is_pinned, expires_minutes } = req.body;
    if (!departure_id || !body) {
      res.status(400).json({ error: "departure_id dan body wajib diisi" });
      return;
    }
    const expiresAt = expires_minutes
      ? new Date(Date.now() + expires_minutes * 60000).toISOString()
      : null;
    const { rows } = await pool.query(
      `INSERT INTO guide_broadcasts (departure_id, channel_id, sender_user_id, sender_role, message_type, title, body, is_pinned, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [departure_id, channel_id || null, user.id, sender_role || "tour_leader", message_type || "info", title || null, body, is_pinned || false, expiresAt]
    );
    res.json({ broadcast: rows[0] });
  } catch (err: any) {
    logger.error(err, "guide.broadcasts.post");
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/guide/broadcasts/:id/read
router.post("/broadcasts/:id/read", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    await pool.query(
      `INSERT INTO guide_broadcast_reads (broadcast_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
      [req.params.id, userId]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/guide/broadcasts/read-all
router.post("/broadcasts/read-all", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user?.id;
    const { departure_id } = req.body;
    await pool.query(
      `INSERT INTO guide_broadcast_reads (broadcast_id, user_id)
       SELECT id, $2 FROM guide_broadcasts WHERE departure_id = $1
       ON CONFLICT DO NOTHING`,
      [departure_id, userId]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Sessions / Absensi ────────────────────────────────────────────────────────

// GET /api/v1/guide/sessions/:departureId
router.get("/sessions/:departureId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { departureId } = req.params;
    const { rows } = await pool.query(
      `SELECT gs.*,
              (SELECT COUNT(*) FROM guide_session_attendance gsa WHERE gsa.session_id = gs.id AND gsa.status = 'present')::int AS present_count,
              (SELECT COUNT(*) FROM guide_session_attendance gsa WHERE gsa.session_id = gs.id)::int AS total_count
       FROM guide_sessions gs
       WHERE gs.departure_id = $1
       ORDER BY gs.created_at DESC
       LIMIT 50`,
      [departureId]
    );
    res.json({ sessions: rows });
  } catch (err: any) {
    logger.error(err, "guide.sessions.get");
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/guide/sessions
router.post("/sessions", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { departure_id, session_type, title, location, scheduled_at } = req.body;
    if (!departure_id || !title) {
      res.status(400).json({ error: "departure_id dan title wajib diisi" });
      return;
    }
    const qrToken = genQrToken();
    const qrExpiresAt = new Date(Date.now() + 30 * 60000).toISOString();
    const { rows } = await pool.query(
      `INSERT INTO guide_sessions (departure_id, session_type, title, location, scheduled_at, started_at, qr_token, qr_expires_at, created_by)
       VALUES ($1, $2, $3, $4, $5, now(), $6, $7, $8) RETURNING *`,
      [departure_id, session_type || "custom", title, location || null, scheduled_at || null, qrToken, qrExpiresAt, user.id]
    );
    res.json({ session: rows[0] });
  } catch (err: any) {
    logger.error(err, "guide.sessions.post");
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/guide/sessions/:id/refresh-qr
router.post("/sessions/:id/refresh-qr", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const qrToken = genQrToken();
    const qrExpiresAt = new Date(Date.now() + 30 * 60000).toISOString();
    const { rows } = await pool.query(
      `UPDATE guide_sessions SET qr_token = $1, qr_expires_at = $2 WHERE id = $3 RETURNING *`,
      [qrToken, qrExpiresAt, req.params.id]
    );
    res.json({ session: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/guide/sessions/:id/end
router.post("/sessions/:id/end", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(`UPDATE guide_sessions SET ended_at = now() WHERE id = $1`, [req.params.id]);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/guide/sessions/:id/attendance
router.get("/sessions/:id/attendance", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT gsa.*, c.full_name AS customer_name, c.phone AS customer_phone
       FROM guide_session_attendance gsa
       JOIN customers c ON c.id = gsa.customer_id
       WHERE gsa.session_id = $1
       ORDER BY gsa.check_in_at ASC NULLS LAST, c.full_name ASC`,
      [req.params.id]
    );
    res.json({ attendance: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/guide/sessions/:id/checkin — jamaah scan QR
router.post("/sessions/:id/checkin", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { qr_token, customer_id } = req.body;
    const { rows: sessionRows } = await pool.query(
      `SELECT * FROM guide_sessions WHERE id = $1`,
      [req.params.id]
    );
    const session = sessionRows[0];
    if (!session) {
      res.status(404).json({ error: "Sesi tidak ditemukan" });
      return;
    }
    if (session.ended_at) {
      res.status(400).json({ error: "Sesi sudah berakhir" });
      return;
    }
    if (qr_token && session.qr_token !== qr_token) {
      res.status(400).json({ error: "Token QR tidak valid" });
      return;
    }
    if (session.qr_expires_at && new Date(session.qr_expires_at) < new Date()) {
      res.status(400).json({ error: "Token QR sudah kedaluwarsa. Minta guide untuk refresh QR." });
      return;
    }
    const custId = customer_id || (req as any).user?.customer_id;
    if (!custId) {
      res.status(400).json({ error: "customer_id wajib diisi" });
      return;
    }
    await pool.query(
      `INSERT INTO guide_session_attendance (session_id, customer_id, status, check_in_at, check_in_method)
       VALUES ($1, $2, 'present', now(), 'qr_scan')
       ON CONFLICT (session_id, customer_id)
       DO UPDATE SET status = 'present', check_in_at = now(), check_in_method = 'qr_scan'`,
      [req.params.id, custId]
    );
    res.json({ ok: true, session_title: session.title });
  } catch (err: any) {
    logger.error(err, "guide.sessions.checkin");
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/guide/sessions/:id/attendance/:customerId — input manual
router.post("/sessions/:id/attendance/:customerId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, notes } = req.body;
    await pool.query(
      `INSERT INTO guide_session_attendance (session_id, customer_id, status, check_in_at, check_in_method, notes)
       VALUES ($1, $2, $3, now(), 'manual', $4)
       ON CONFLICT (session_id, customer_id)
       DO UPDATE SET status = $3, check_in_at = now(), check_in_method = 'manual', notes = $4`,
      [req.params.id, req.params.customerId, status || "present", notes || null]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Locations ─────────────────────────────────────────────────────────────────

// GET /api/v1/guide/locations/:departureId
router.get("/locations/:departureId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT gl.*, p.full_name AS guide_name
       FROM guide_locations gl
       LEFT JOIN profiles p ON p.id = gl.user_id
       WHERE gl.departure_id = $1 AND gl.is_active = true
         AND (gl.shared_until IS NULL OR gl.shared_until > now())
       ORDER BY gl.updated_at DESC`,
      [req.params.departureId]
    );
    res.json({ locations: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/v1/guide/locations
router.post("/locations", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const { departure_id, role, label, latitude, longitude, share_hours } = req.body;
    const sharedUntil = share_hours
      ? new Date(Date.now() + share_hours * 3600000).toISOString()
      : new Date(Date.now() + 4 * 3600000).toISOString();
    await pool.query(
      `UPDATE guide_locations SET is_active = false WHERE user_id = $1 AND departure_id = $2`,
      [user.id, departure_id]
    );
    const { rows } = await pool.query(
      `INSERT INTO guide_locations (departure_id, user_id, role, label, latitude, longitude, shared_until)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [departure_id, user.id, role || "tour_leader", label || null, latitude, longitude, sharedUntil]
    );
    res.json({ location: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/v1/guide/locations/:id — stop sharing location
router.delete("/locations/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(
      `UPDATE guide_locations SET is_active = false, shared_until = now() WHERE id = $1`,
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Program Harian Live ───────────────────────────────────────────────────────

// GET /api/v1/guide/program/:departureId — program hari ini + besok
router.get("/program/:departureId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { departureId } = req.params;
    const { date } = req.query;
    const targetDate = date ? String(date) : new Date().toISOString().split("T")[0];

    const { rows } = await pool.query(
      `SELECT * FROM trip_timeline
       WHERE departure_id = $1
         AND (event_date = $2::date OR event_date = ($2::date + INTERVAL '1 day')::date)
       ORDER BY event_date, sort_order, event_time`,
      [departureId, targetDate]
    );
    res.json({ program: rows, date: targetDate });
  } catch (err: any) {
    logger.error(err, "guide.program.get");
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/v1/guide/program/:itemId — update status/catatan item program
router.patch("/program/:itemId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { live_status, delay_minutes, live_notes, location_changed_to, event_time } = req.body;
    const sets: string[] = ["updated_at = now()"];
    const vals: any[] = [];
    let i = 1;

    if (live_status !== undefined) { sets.push(`live_status = $${i++}`); vals.push(live_status); }
    if (delay_minutes !== undefined) { sets.push(`delay_minutes = $${i++}`); vals.push(delay_minutes); }
    if (live_notes !== undefined) { sets.push(`live_notes = $${i++}`); vals.push(live_notes); }
    if (location_changed_to !== undefined) { sets.push(`location_changed_to = $${i++}`); vals.push(location_changed_to); }
    if (event_time !== undefined) { sets.push(`event_time = $${i++}`); vals.push(event_time); }

    vals.push(req.params.itemId);
    const { rows } = await pool.query(
      `UPDATE trip_timeline SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`,
      vals
    );

    if (!rows[0]) {
      res.status(404).json({ error: "Item tidak ditemukan" });
      return;
    }
    res.json({ item: rows[0] });
  } catch (err: any) {
    logger.error(err, "guide.program.patch");
    res.status(500).json({ error: err.message });
  }
});

export default router;
