/**
 * /api/v1/guide/audio — REST endpoints for audio session lifecycle
 * WebSocket relay is handled separately by audioRelay.ts
 */

import { Router } from 'express';
import { pool } from '../../lib/db.js';
import { getSessionStats } from '../../lib/audioRelay.js';

const router = Router();

// ── POST /api/v1/guide/audio/sessions — start a new audio session ─────────────
router.post('/sessions', async (req: any, res: any) => {
  const { departure_id, title = 'Sesi Audio', session_type = 'general', speaker_user_id } = req.body;
  if (!departure_id) return res.status(400).json({ error: 'departure_id wajib diisi' });

  const client = await pool.connect();
  try {
    const { rows } = await client.query<{ id: string }>(
      `INSERT INTO guide_audio_sessions
         (departure_id, title, session_type, status, current_speaker_user_id, started_by)
       VALUES ($1, $2, $3, 'active', $4, $4)
       RETURNING id`,
      [departure_id, title, session_type, speaker_user_id || null],
    );
    return res.json({ ok: true, session: rows[0] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── GET /api/v1/guide/audio/sessions/:departure_id — active sessions ──────────
router.get('/sessions/:departure_id', async (req: any, res: any) => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT s.*, u.raw_user_meta_data->>'full_name' AS speaker_name
       FROM guide_audio_sessions s
       LEFT JOIN auth.users u ON u.id = s.current_speaker_user_id
       WHERE s.departure_id = $1 AND s.status = 'active'
       ORDER BY s.started_at DESC`,
      [req.params.departure_id],
    );
    // Enrich with live WS stats
    const wsStats = getSessionStats();
    const enriched = rows.map(r => ({
      ...r,
      ws_listeners: wsStats.find(s => s.id === r.id)?.listenerCount ?? 0,
    }));
    return res.json({ sessions: enriched });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── PATCH /api/v1/guide/audio/sessions/:id/speaker — update floor holder ──────
router.patch('/sessions/:id/speaker', async (req: any, res: any) => {
  const { speaker_user_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE guide_audio_sessions SET current_speaker_user_id = $1 WHERE id = $2 AND status = 'active'`,
      [speaker_user_id || null, req.params.id],
    );
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── DELETE /api/v1/guide/audio/sessions/:id — end session ────────────────────
router.delete('/sessions/:id', async (req: any, res: any) => {
  const client = await pool.connect();
  try {
    await client.query(
      `UPDATE guide_audio_sessions
       SET status = 'ended', ended_at = now(), current_speaker_user_id = NULL
       WHERE id = $1`,
      [req.params.id],
    );
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── GET /api/v1/guide/audio/ws-stats — live relay stats (admin) ───────────────
router.get('/ws-stats', (_req: any, res: any) => {
  return res.json({ sessions: getSessionStats() });
});

export default router;
