import { Router } from 'express';
import { pool } from '../lib/db.js';
import { sendWA } from '../lib/whatsapp.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();

/**
 * POST /api/documents/next-number
 * Atomically generate the next formatted document number.
 * Body: { doc_type: string, prefix: string, branch_key?: string }
 * Returns: { number: "001/CUTI-JMH/VI/2026" }
 */
router.post('/next-number', requireAuth, async (req, res) => {
  const { doc_type, prefix, branch_key = 'global' } = req.body;
  if (!doc_type || !prefix) {
    res.status(400).json({ error: 'doc_type and prefix are required' });
    return;
  }
  try {
    const { rows } = await pool.query<{ number: string }>(
      `SELECT get_next_document_number($1, $2, $3) AS number`,
      [doc_type, prefix, branch_key]
    );
    res.json({ number: rows[0].number });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/documents/send-wa
 * Send a WhatsApp message via the active WA provider.
 * Body: { phone: string, message: string }
 * Returns: { success: true, messageId? } | { success: false, error }
 */
router.post('/send-wa', requireAuth, async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) {
    res.status(400).json({ error: 'phone and message are required' });
    return;
  }
  const result = await sendWA(phone, message);
  if (result.success) {
    res.json({ success: true, messageId: result.messageId });
  } else {
    res.status(502).json({ success: false, error: result.error });
  }
});

/**
 * GET /api/documents/numbering-stats
 * Returns document count stats per type for current month.
 */
router.get('/numbering-stats', requireAuth, async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT doc_type, branch_key, last_number, year, month
      FROM document_numbering
      WHERE year = EXTRACT(YEAR FROM now())::int
        AND month = EXTRACT(MONTH FROM now())::int
      ORDER BY doc_type, branch_key
    `);
    res.json({ data: rows });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
