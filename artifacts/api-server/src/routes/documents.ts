import { Router } from 'express';
import { pool } from '../lib/db.js';
import { sendWA } from '../lib/whatsapp.js';
import { requireAuth } from '../lib/auth.js';

const router = Router();

// ─── Nomor Dokumen ─────────────────────────────────────────────────────────────
router.post('/next-number', requireAuth, async (req, res) => {
  const { doc_type, prefix, branch_key = 'global' } = req.body;
  if (!doc_type || !prefix) { res.status(400).json({ error: 'doc_type and prefix are required' }); return; }
  try {
    const { rows } = await pool.query<{ number: string }>(
      `SELECT get_next_document_number($1, $2, $3) AS number`,
      [doc_type, prefix, branch_key]
    );
    res.json({ number: rows[0].number });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── Kirim WA ─────────────────────────────────────────────────────────────────
router.post('/send-wa', requireAuth, async (req, res) => {
  const { phone, message } = req.body;
  if (!phone || !message) { res.status(400).json({ error: 'phone and message are required' }); return; }
  const result = await sendWA(phone, message);
  if (result.success) res.json({ success: true, messageId: result.messageId });
  else res.status(502).json({ success: false, error: result.error });
});

// ─── Numbering Stats ──────────────────────────────────────────────────────────
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
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── F-23: Audit Trail ─────────────────────────────────────────────────────────
/**
 * POST /api/documents/audit
 * Log a document event (generate, send_wa, send_email, verify, reject, upload, view)
 */
router.post('/audit', requireAuth, async (req, res) => {
  const {
    event_type, doc_type, booking_id, customer_id, customer_name,
    booking_code, channel, recipient, metadata = {}
  } = req.body;
  if (!event_type) { res.status(400).json({ error: 'event_type required' }); return; }
  try {
    const user = (req as any).user;
    await pool.query(`
      INSERT INTO document_audit_logs
        (event_type, doc_type, booking_id, customer_id, customer_name, booking_code,
         performed_by, performed_by_name, channel, recipient, metadata)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
    `, [
      event_type, doc_type || null, booking_id || null, customer_id || null,
      customer_name || null, booking_code || null,
      user?.id || null, user?.full_name || user?.email || null,
      channel || null, recipient || null, JSON.stringify(metadata)
    ]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

/**
 * GET /api/documents/audit
 * Query audit logs (admin only)
 */
router.get('/audit', requireAuth, async (req, res) => {
  const { search, event_type, doc_type, limit = '100', offset = '0' } = req.query as Record<string, string>;
  try {
    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(customer_name ILIKE $${params.length} OR booking_code ILIKE $${params.length})`);
    }
    if (event_type) { params.push(event_type); conditions.push(`event_type = $${params.length}`); }
    if (doc_type) { params.push(doc_type); conditions.push(`doc_type = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const lim = Math.min(parseInt(limit) || 100, 500);
    const off = parseInt(offset) || 0;

    const { rows, rowCount } = await pool.query(`
      SELECT * FROM document_audit_logs
      ${where}
      ORDER BY created_at DESC
      LIMIT ${lim} OFFSET ${off}
    `, params);

    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*)::int AS total FROM document_audit_logs ${where}`, params
    );
    res.json({ data: rows, total: countRows[0]?.total || rowCount });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── F-21: QR Verifikasi Keaslian ─────────────────────────────────────────────
/**
 * POST /api/documents/verify-tokens
 * Issue a verification token for a document
 */
router.post('/verify-tokens', requireAuth, async (req, res) => {
  const { doc_type, booking_id, customer_id, customer_name, booking_code, package_name, departure_date } = req.body;
  if (!doc_type) { res.status(400).json({ error: 'doc_type required' }); return; }
  try {
    // Upsert: one token per (booking_id, doc_type) to avoid duplicates
    const { rows } = await pool.query(`
      INSERT INTO document_verify_tokens
        (doc_type, booking_id, customer_id, customer_name, booking_code, package_name, departure_date, issued_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      ON CONFLICT DO NOTHING
      RETURNING token
    `, [doc_type, booking_id || null, customer_id || null, customer_name || null,
        booking_code || null, package_name || null, departure_date || null,
        (req as any).user?.id || null]);

    // If conflict, fetch existing
    if (!rows[0]) {
      const { rows: existing } = await pool.query(
        `SELECT token FROM document_verify_tokens WHERE booking_id=$1 AND doc_type=$2 LIMIT 1`,
        [booking_id, doc_type]
      );
      res.json({ token: existing[0]?.token });
      return;
    }
    res.json({ token: rows[0].token });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

/**
 * GET /api/documents/verify/:token
 * Public endpoint — no auth required. Returns document info if token valid.
 */
router.get('/verify/:token', async (req, res) => {
  const { token } = req.params;
  if (!token || token.length < 10) { res.status(400).json({ error: 'Invalid token' }); return; }
  try {
    const { rows } = await pool.query(
      `SELECT * FROM document_verify_tokens WHERE token = $1 LIMIT 1`,
      [token]
    );
    if (!rows[0]) { res.status(404).json({ error: 'Token tidak ditemukan' }); return; }
    const row = rows[0];
    res.json({
      doc_type: row.doc_type,
      customer_name: row.customer_name,
      booking_code: row.booking_code,
      package_name: row.package_name,
      departure_date: row.departure_date,
      issued_at: row.issued_at,
    });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── F-22: E-Signature Jamaah ─────────────────────────────────────────────────
/**
 * GET /api/documents/signature/:customerId
 * Get existing signature (auth required)
 */
router.get('/signature/:customerId', requireAuth, async (req, res) => {
  const { customerId } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT signature_base64, signed_at FROM customer_signatures WHERE customer_id=$1 LIMIT 1`,
      [customerId]
    );
    res.json({ signature: rows[0] || null });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

/**
 * POST /api/documents/signature/:customerId
 * Save/update signature (auth required)
 */
router.post('/signature/:customerId', requireAuth, async (req, res) => {
  const { customerId } = req.params;
  const { signature_base64 } = req.body;
  if (!signature_base64) { res.status(400).json({ error: 'signature_base64 required' }); return; }
  if (!signature_base64.startsWith('data:image/png;base64,')) {
    res.status(400).json({ error: 'signature_base64 must be a PNG data URL' });
    return;
  }
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket?.remoteAddress || null;
  const userAgent = req.headers['user-agent'] || null;
  try {
    await pool.query(`
      INSERT INTO customer_signatures (customer_id, signature_base64, ip_address, user_agent)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (customer_id)
      DO UPDATE SET signature_base64=$2, signed_at=NOW(), ip_address=$3, user_agent=$4
    `, [customerId, signature_base64, ipAddress, userAgent]);
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// ─── F-24: Kompresi info (compression done client-side) ───────────────────────
/**
 * GET /api/documents/compress-info
 * Returns recommended compression settings for the frontend.
 */
router.get('/compress-info', (_req, res) => {
  res.json({
    maxSizeMb: 2,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.8,
  });
});

export default router;
