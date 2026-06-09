import { Router, type Request, type Response } from "express";
import { pool } from "../lib/db.js";
import { requireAuth } from "../lib/auth.js";
import { logger } from "../lib/logger.js";
import crypto from "crypto";
import webpush from "web-push";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function genQrToken(): string {
  return crypto.randomBytes(24).toString("base64url");
}

// ── Push notification helpers (Fase 2 — otomatis kirim ke jamaah) ─────────────

function isVapidReady(): boolean {
  return Boolean(process.env["VAPID_PUBLIC_KEY"] && process.env["VAPID_PRIVATE_KEY"]);
}

function initWebpush() {
  const pub   = process.env["VAPID_PUBLIC_KEY"]!;
  const priv  = process.env["VAPID_PRIVATE_KEY"]!;
  const email = process.env["VAPID_EMAIL"] || "mailto:admin@vinstour.com";
  webpush.setVapidDetails(email, pub, priv);
}

/**
 * Kirim push notification ke semua jamaah (push_subscriptions via customer_id)
 * yang memiliki booking aktif di departure_id tersebut.
 * Fire-and-forget — tidak memblokir response PATCH.
 */
async function fireJamaahPush(
  departureId: string,
  title: string,
  body: string,
  type: string,
  url: string = "/jamaah/program-live",
): Promise<void> {
  if (!isVapidReady()) return;
  try {
    initWebpush();
    const { rows } = await pool.query<{ endpoint: string; p256dh: string; auth_key: string }>(
      `SELECT DISTINCT ps.endpoint, ps.p256dh, ps.auth_key
       FROM push_subscriptions ps
       JOIN bookings b ON b.customer_id = ps.customer_id
       WHERE b.departure_id = $1
         AND ps.customer_id IS NOT NULL
         AND b.booking_status NOT IN ('cancelled')
       LIMIT 200`,
      [departureId],
    );
    if (!rows.length) return;

    const payload = JSON.stringify({
      title,
      body,
      type,
      url,
      tag: `guide-${departureId}-${Date.now()}`,
      timestamp: Date.now(),
    });

    const stale: string[] = [];
    await Promise.allSettled(
      rows.map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
            payload,
            { TTL: 60 * 60 * 4 },
          );
        } catch (err: any) {
          if (err.statusCode === 404 || err.statusCode === 410) stale.push(sub.endpoint);
        }
      }),
    );

    if (stale.length) {
      pool.query(
        `DELETE FROM push_subscriptions WHERE endpoint = ANY($1)`,
        [stale],
      ).catch(() => {});
    }

    logger.info({ departureId, sent: rows.length - stale.length, stale: stale.length }, "guide.push.jamaah");
  } catch (err: any) {
    logger.warn({ err: err.message, departureId }, "guide.push.jamaah — non-fatal error");
  }
}

/** Buat pesan notifikasi berdasarkan perubahan live status / lokasi */
function buildPushMessage(
  itemTitle: string,
  liveStatus?: string,
  delayMinutes?: number,
  locationChangedTo?: string,
  liveNotes?: string,
): { title: string; body: string; type: string } | null {
  const parts: string[] = [];
  let type = "program_update";

  if (liveStatus === "ongoing") {
    return {
      title: `▶️ ${itemTitle} — Sedang Berlangsung`,
      body: liveNotes || "Item program sudah dimulai.",
      type,
    };
  }
  if (liveStatus === "done") {
    return {
      title: `✅ ${itemTitle} — Selesai`,
      body: liveNotes || "Item program telah selesai.",
      type,
    };
  }
  if (liveStatus === "delayed") {
    type = "warning";
    const delay = delayMinutes && delayMinutes > 0 ? ` (terlambat ${delayMinutes} menit)` : "";
    return {
      title: `⚠️ ${itemTitle} — Ditunda${delay}`,
      body: liveNotes || "Jadwal mengalami keterlambatan.",
      type,
    };
  }
  if (locationChangedTo) {
    return {
      title: `📍 Lokasi Berubah — ${itemTitle}`,
      body: `Lokasi baru: ${locationChangedTo}${liveNotes ? `\n${liveNotes}` : ""}`,
      type,
    };
  }
  if (liveNotes) {
    parts.push(liveNotes);
  }
  if (!parts.length) return null;
  return { title: `📢 Update: ${itemTitle}`, body: parts.join(" · "), type };
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

    // ── Otomatis kirim push notification ke jamaah (fire-and-forget) ──────────
    const updated = rows[0];
    const msg = buildPushMessage(
      updated.title,
      live_status,
      live_status === "delayed" ? (delay_minutes ?? updated.delay_minutes) : undefined,
      location_changed_to || undefined,
      live_notes || undefined,
    );
    if (msg && updated.departure_id) {
      fireJamaahPush(updated.departure_id, msg.title, msg.body, msg.type).catch(() => {});
    }

    res.json({ item: updated });
  } catch (err: any) {
    logger.error(err, "guide.program.patch");
    res.status(500).json({ error: err.message });
  }
});

export default router;

// ═══════════════════════════════════════════════════════════════════════════════
// FASE 3 — Sub-grup Rombongan & Admin Monitor Lapangan
// ═══════════════════════════════════════════════════════════════════════════════

// ── GET /api/v1/guide/subgroups/:departureId ─────────────────────────────────
router.get("/subgroups/:departureId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { departureId } = req.params;
    const { rows } = await pool.query(
      `SELECT sg.*,
              COUNT(DISTINCT sm.customer_id) AS member_count
       FROM guide_subgroups sg
       LEFT JOIN guide_subgroup_members sm ON sm.subgroup_id = sg.id
       WHERE sg.departure_id = $1
       GROUP BY sg.id
       ORDER BY sg.created_at`,
      [departureId]
    );
    res.json({ subgroups: rows });
  } catch (err: any) {
    logger.error(err, "guide.subgroups.list");
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/v1/guide/subgroups/:id/members ──────────────────────────────────
router.get("/subgroups/:id/members", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { rows } = await pool.query(
      `SELECT sm.customer_id, c.full_name, c.nik, c.phone
       FROM guide_subgroup_members sm
       JOIN customers c ON c.id = sm.customer_id
       WHERE sm.subgroup_id = $1
       ORDER BY c.full_name`,
      [req.params.id]
    );
    res.json({ members: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/v1/guide/subgroups ─────────────────────────────────────────────
router.post("/subgroups", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { departure_id, name, color } = req.body;
    if (!departure_id || !name) { res.status(400).json({ error: "departure_id dan name wajib diisi" }); return; }
    const { rows } = await pool.query(
      `INSERT INTO guide_subgroups (departure_id, name, color, created_by) VALUES ($1,$2,$3,$4) RETURNING *`,
      [departure_id, name, color || "#6b7280", req.user!.sub]
    );
    res.json({ subgroup: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/v1/guide/subgroups/:id ────────────────────────────────────────
router.patch("/subgroups/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, color } = req.body;
    const sets: string[] = []; const vals: any[] = []; let i = 1;
    if (name !== undefined) { sets.push(`name = $${i++}`); vals.push(name); }
    if (color !== undefined) { sets.push(`color = $${i++}`); vals.push(color); }
    if (!sets.length) { res.status(400).json({ error: "Tidak ada field yang diupdate" }); return; }
    vals.push(req.params.id);
    const { rows } = await pool.query(`UPDATE guide_subgroups SET ${sets.join(", ")} WHERE id = $${i} RETURNING *`, vals);
    if (!rows[0]) { res.status(404).json({ error: "Sub-grup tidak ditemukan" }); return; }
    res.json({ subgroup: rows[0] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/v1/guide/subgroups/:id ───────────────────────────────────────
router.delete("/subgroups/:id", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(`DELETE FROM guide_subgroups WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/v1/guide/subgroups/:id/members ─────────────────────────────────
router.post("/subgroups/:id/members", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const { customer_ids }: { customer_ids: string[] } = req.body;
    if (!Array.isArray(customer_ids) || !customer_ids.length) { res.status(400).json({ error: "customer_ids wajib diisi" }); return; }
    const values = customer_ids.map((cid, i) => `($1, $${i + 2})`).join(", ");
    await pool.query(
      `INSERT INTO guide_subgroup_members (subgroup_id, customer_id) VALUES ${values} ON CONFLICT DO NOTHING`,
      [req.params.id, ...customer_ids]
    );
    res.json({ success: true, added: customer_ids.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/v1/guide/subgroups/:id/members/:customerId ───────────────────
router.delete("/subgroups/:id/members/:customerId", requireAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    await pool.query(`DELETE FROM guide_subgroup_members WHERE subgroup_id = $1 AND customer_id = $2`, [req.params.id, req.params.customerId]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/v1/guide/admin/overview — ringkasan semua rombongan aktif ────────
router.get("/admin/overview", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  if (!["super_admin", "owner", "admin", "branch_manager", "operational"].includes(user.role)) {
    res.status(403).json({ error: "Akses ditolak" }); return;
  }
  try {
    const { rows } = await pool.query(`
      WITH departure_stats AS (
        SELECT
          d.id,
          d.departure_date,
          d.return_date,
          d.status,
          d.booked_count,
          d.quota,
          p.name AS package_name,
          p.package_type,
          -- SOS aktif
          (SELECT COUNT(*) FROM sos_alerts sa
           WHERE sa.departure_id = d.id AND sa.status IN ('active','pending')) AS active_sos,
          -- Last broadcast
          (SELECT gb.title FROM guide_broadcasts gb
           WHERE gb.departure_id = d.id ORDER BY gb.created_at DESC LIMIT 1) AS last_broadcast_title,
          (SELECT gb.created_at FROM guide_broadcasts gb
           WHERE gb.departure_id = d.id ORDER BY gb.created_at DESC LIMIT 1) AS last_broadcast_at,
          (SELECT gb.message_type FROM guide_broadcasts gb
           WHERE gb.departure_id = d.id ORDER BY gb.created_at DESC LIMIT 1) AS last_broadcast_type,
          -- Guide location active
          (SELECT COUNT(*) FROM guide_locations gl
           WHERE gl.departure_id = d.id AND gl.is_active = true
             AND (gl.shared_until IS NULL OR gl.shared_until > NOW())) AS active_guide_locations,
          -- Last session attendance
          (SELECT ROUND(100.0 * COUNT(CASE WHEN gsa.status = 'present' THEN 1 END) / NULLIF(COUNT(*),0))
           FROM guide_sessions gs
           JOIN guide_session_attendance gsa ON gsa.session_id = gs.id
           WHERE gs.departure_id = d.id
             AND gs.id = (SELECT id FROM guide_sessions WHERE departure_id = d.id ORDER BY started_at DESC LIMIT 1)
          ) AS last_session_attendance_pct
        FROM departures d
        LEFT JOIN packages p ON p.id = d.package_id
        WHERE d.status IN ('open','active','departed')
          AND d.departure_date >= NOW() - INTERVAL '30 days'
        ORDER BY d.departure_date
      )
      SELECT * FROM departure_stats
    `);
    res.json({ departures: rows });
  } catch (err: any) {
    logger.error(err, "guide.admin.overview");
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/v1/guide/admin/:departureId/overview — detail satu rombongan ─────
router.get("/admin/:departureId/overview", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const user = req.user!;
  if (!["super_admin", "owner", "admin", "branch_manager", "operational"].includes(user.role)) {
    res.status(403).json({ error: "Akses ditolak" }); return;
  }
  try {
    const { departureId } = req.params;
    const [depRes, broadcastsRes, sessionsRes, locationsRes] = await Promise.all([
      pool.query(
        `SELECT d.*, p.name AS package_name FROM departures d
         LEFT JOIN packages p ON p.id = d.package_id WHERE d.id = $1`,
        [departureId]
      ),
      pool.query(
        `SELECT * FROM guide_broadcasts WHERE departure_id = $1 ORDER BY created_at DESC LIMIT 20`,
        [departureId]
      ),
      pool.query(
        `SELECT gs.*,
                COUNT(CASE WHEN gsa.status = 'present' THEN 1 END) AS present_count,
                COUNT(CASE WHEN gsa.status = 'absent'  THEN 1 END) AS absent_count,
                COUNT(*) AS total_registered
         FROM guide_sessions gs
         LEFT JOIN guide_session_attendance gsa ON gsa.session_id = gs.id
         WHERE gs.departure_id = $1
         GROUP BY gs.id
         ORDER BY gs.created_at DESC LIMIT 10`,
        [departureId]
      ),
      pool.query(
        `SELECT gl.*, u.email AS guide_email
         FROM guide_locations gl
         JOIN auth.users u ON u.id = gl.user_id
         WHERE gl.departure_id = $1 AND gl.is_active = true
           AND (gl.shared_until IS NULL OR gl.shared_until > NOW())`,
        [departureId]
      ),
    ]);
    res.json({
      departure:  depRes.rows[0] || null,
      broadcasts: broadcastsRes.rows,
      sessions:   sessionsRes.rows,
      locations:  locationsRes.rows,
    });
  } catch (err: any) {
    logger.error(err, "guide.admin.departureOverview");
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/v1/guide/subgroups/auto-split ───────────────────────────────────
// Body: { departure_id, num_groups, strategy: "mahram_aware"|"gender_balanced"|"random", replace_existing }
router.post("/subgroups/auto-split", requireAuth, async (req: Request, res: Response): Promise<void> => {
  const client = await pool.connect();
  try {
    const { departure_id, num_groups, strategy = "mahram_aware", replace_existing = false } = req.body;
    if (!departure_id || !num_groups || num_groups < 1 || num_groups > 50) {
      res.status(400).json({ error: "departure_id dan num_groups (1–50) wajib diisi" });
      return;
    }

    // 1) Ambil semua customer yang punya booking aktif di keberangkatan ini
    const { rows: bookingRows } = await client.query(
      `SELECT DISTINCT b.customer_id, c.full_name, c.gender
       FROM bookings b
       JOIN customers c ON c.id = b.customer_id
       WHERE b.departure_id = $1
         AND b.booking_status NOT IN ('cancelled','refunded')
       ORDER BY c.full_name`,
      [departure_id]
    );

    if (bookingRows.length === 0) {
      res.status(400).json({ error: "Tidak ada jamaah di keberangkatan ini" });
      return;
    }

    // 2) Ambil pasangan mahram (bidirectional)
    const customerIds = bookingRows.map((r: any) => r.customer_id);
    const { rows: mahramRows } = await client.query(
      `SELECT cm.customer_id, cm.mahram_customer_id
       FROM customer_mahrams cm
       WHERE cm.customer_id = ANY($1::uuid[])
         AND cm.mahram_customer_id = ANY($1::uuid[])`,
      [customerIds]
    );

    // Build mahram pair map: customerId → mahramId
    const mahramMap = new Map<string, string>();
    for (const r of mahramRows) {
      mahramMap.set(r.customer_id, r.mahram_customer_id);
    }

    // 3) Algoritma pembagian
    const n = parseInt(String(num_groups), 10);
    const groups: { customers: Array<{ customer_id: string; full_name: string; gender: string }> }[] = Array.from({ length: n }, () => ({ customers: [] }));
    const assigned = new Set<string>();
    const customerMap = new Map(bookingRows.map((r: any) => [r.customer_id, r]));

    let groupIdx = 0;
    function assignToGroup(customer: any, targetIdx?: number) {
      if (assigned.has(customer.customer_id)) return;
      const idx = targetIdx !== undefined ? targetIdx : groupIdx;
      groups[idx].customers.push(customer);
      assigned.add(customer.customer_id);
      if (targetIdx === undefined) groupIdx = (groupIdx + 1) % n;
    }

    function assignWithMahram(c: any) {
      if (assigned.has(c.customer_id)) return;
      const currentGroup = groupIdx;
      assignToGroup(c);
      // Pasangkan mahram ke grup yang sama
      const partnerId = mahramMap.get(c.customer_id);
      if (partnerId && !assigned.has(partnerId)) {
        const partner = customerMap.get(partnerId);
        if (partner) assignToGroup(partner, currentGroup);
      }
    }

    if (strategy === "random") {
      const shuffled = [...bookingRows].sort(() => Math.random() - 0.5);
      for (const c of shuffled) assignWithMahram(c);
    } else if (strategy === "gender_balanced") {
      // Interleave L/P agar tiap grup gender-balanced, mahram tetap satu grup
      const males = bookingRows.filter((r: any) => r.gender === "L");
      const females = bookingRows.filter((r: any) => r.gender === "P");
      const others = bookingRows.filter((r: any) => r.gender !== "L" && r.gender !== "P");
      const interleaved: any[] = [];
      for (let i = 0; i < Math.max(males.length, females.length); i++) {
        if (i < males.length) interleaved.push(males[i]);
        if (i < females.length) interleaved.push(females[i]);
      }
      interleaved.push(...others);
      for (const c of interleaved) assignWithMahram(c);
    } else {
      // mahram_aware: urut nama, pasangan mahram selalu satu grup
      for (const c of bookingRows) assignWithMahram(c);
    }

    // 4) Simpan ke database dalam satu transaksi
    await client.query("BEGIN");

    if (replace_existing) {
      await client.query(`DELETE FROM guide_subgroups WHERE departure_id = $1`, [departure_id]);
    }

    const COLORS = [
      "#3b82f6","#ef4444","#22c55e","#f59e0b","#8b5cf6",
      "#ec4899","#14b8a6","#f97316","#6366f1","#84cc16",
    ];

    const createdGroups: any[] = [];
    for (let i = 0; i < groups.length; i++) {
      const { rows: sgRows } = await client.query(
        `INSERT INTO guide_subgroups (departure_id, name, color, created_by) VALUES ($1,$2,$3,$4) RETURNING *`,
        [departure_id, `Grup ${i + 1}`, COLORS[i % COLORS.length], req.user!.sub]
      );
      const sg = sgRows[0];
      const members = groups[i].customers;
      if (members.length > 0) {
        const vals = members.map((_, j) => `($1, $${j + 2})`).join(", ");
        await client.query(
          `INSERT INTO guide_subgroup_members (subgroup_id, customer_id) VALUES ${vals} ON CONFLICT DO NOTHING`,
          [sg.id, ...members.map(m => m.customer_id)]
        );
      }
      createdGroups.push({ ...sg, member_count: members.length, members });
    }

    await client.query("COMMIT");
    res.json({ success: true, groups: createdGroups, total_assigned: assigned.size });
  } catch (err: any) {
    await client.query("ROLLBACK").catch(() => {});
    logger.error(err, "guide.subgroups.autoSplit");
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});
