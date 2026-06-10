/**
 * /api/v1/payments
 *
 * Unified payment architecture:
 *   - Gateway status check (Midtrans / Xendit pluggable)
 *   - Public booking summary by booking code
 *   - Transfer proof upload (base64 → disk)
 *   - Transfer confirmation submit (public, no-auth)
 *   - Admin: list pending proofs, verify (approve/reject)
 *   - Admin: list payments for a booking
 *   - Bank accounts CRUD
 *   - Payment page token (shareable link without login)
 */

import { Router } from 'express';
import { pool } from '../../lib/db.js';
import { logger } from '../../lib/logger.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';

const router = Router();

// ── Uploads dir ──────────────────────────────────────────────────────────────
const UPLOADS_DIR = join(process.cwd(), 'uploads', 'payment-proofs');
if (!existsSync(UPLOADS_DIR)) {
  try { mkdirSync(UPLOADS_DIR, { recursive: true }); } catch { /* ignore */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatRp(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

function normalisePhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('0')) return '62' + d.slice(1);
  if (!d.startsWith('62')) return '62' + d;
  return d;
}

// ── GET /api/v1/payments/gateway-status ──────────────────────────────────────
// Public — which gateways are configured?
router.get('/gateway-status', async (_req, res) => {
  const midtransKey = process.env['MIDTRANS_SERVER_KEY'] || process.env['MIDTRANS_CLIENT_KEY'];
  const xenditKey   = process.env['XENDIT_SECRET_KEY'];

  // Also check DB app_settings overrides
  let midtransEnabled = !!midtransKey;
  let xenditEnabled   = !!xenditKey;
  let midtransClientKey: string | null = process.env['MIDTRANS_CLIENT_KEY'] || null;
  let midtransIsProduction = (process.env['MIDTRANS_ENV'] === 'production');

  try {
    const { rows } = await pool.query(
      `SELECT key, value FROM app_settings WHERE key IN ('midtrans_config','xendit_config')`,
    );
    for (const row of rows) {
      if (row.key === 'midtrans_config') {
        const cfg = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
        if (cfg.client_key) midtransClientKey = cfg.client_key;
        if (cfg.enabled === false) midtransEnabled = false;
        else if (cfg.client_key) midtransEnabled = true;
        if (cfg.is_production) midtransIsProduction = true;
      }
      if (row.key === 'xendit_config') {
        const cfg = typeof row.value === 'string' ? JSON.parse(row.value) : row.value;
        if (cfg.secret_key || cfg.enabled) xenditEnabled = true;
        if (cfg.enabled === false) xenditEnabled = false;
      }
    }
  } catch { /* non-critical */ }

  res.json({
    midtrans: {
      enabled: midtransEnabled,
      client_key: midtransClientKey,
      is_production: midtransIsProduction,
    },
    xendit: {
      enabled: xenditEnabled,
    },
    any_gateway: midtransEnabled || xenditEnabled,
  });
});

// ── GET /api/v1/payments/bank-accounts ───────────────────────────────────────
// Public — show active bank accounts for transfer
router.get('/bank-accounts', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, bank_name, account_number, account_name,
              branch_name, notes,
              is_primary, is_active
       FROM bank_accounts
       WHERE is_active = TRUE
       ORDER BY is_primary DESC, bank_name ASC`,
    );
    res.json({ accounts: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/v1/payments/booking-summary/:bookingCode ────────────────────────
// Public — summary for payment page (no auth required)
router.get('/booking-summary/:bookingCode', async (req, res) => {
  const { bookingCode } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT
         b.id, b.booking_code, b.total_price, b.paid_amount, b.remaining_amount,
         b.payment_status, b.status as booking_status, b.created_at,
         p.full_name as customer_name, p.phone as customer_phone, p.email as customer_email,
         pk.name as package_name,
         d.departure_date
       FROM bookings b
       LEFT JOIN profiles p   ON p.id   = b.customer_id
       LEFT JOIN departures d ON d.id   = b.departure_id
       LEFT JOIN packages pk  ON pk.id  = d.package_id
       WHERE b.booking_code = $1
         AND b.status <> 'cancelled'
       LIMIT 1`,
      [bookingCode.toUpperCase()],
    );
    if (!rows.length) {
      res.status(404).json({ error: 'Booking tidak ditemukan' });
      return;
    }
    const b = rows[0];
    res.json({
      booking: {
        id:              b.id,
        booking_code:    b.booking_code,
        total_price:     Number(b.total_price),
        paid_amount:     Number(b.paid_amount),
        remaining_amount: Number(b.remaining_amount),
        payment_status:  b.payment_status,
        booking_status:  b.booking_status,
        customer_name:   b.customer_name,
        customer_phone:  b.customer_phone,
        customer_email:  b.customer_email,
        package_name:    b.package_name,
        departure_date:  b.departure_date,
        created_at:      b.created_at,
      },
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/v1/payments/upload-proof ───────────────────────────────────────
// Upload file bukti transfer (base64 JSON body)
// Body: { filename: string, mimeType: string, data: string (base64) }
router.post('/upload-proof', async (req, res) => {
  const { filename, mimeType, data } = req.body as {
    filename?: string;
    mimeType?: string;
    data?: string;
  };

  if (!data) {
    res.status(400).json({ error: 'Field data (base64) wajib diisi' });
    return;
  }

  const allowedMime = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (mimeType && !allowedMime.includes(mimeType)) {
    res.status(400).json({ error: 'Format file tidak didukung. Gunakan JPG, PNG, WebP, atau PDF.' });
    return;
  }

  try {
    const buf = Buffer.from(data.replace(/^data:[^;]+;base64,/, ''), 'base64');
    if (buf.length > 5 * 1024 * 1024) {
      res.status(400).json({ error: 'Ukuran file maksimal 5 MB' });
      return;
    }
    const ext     = mimeType === 'application/pdf' ? '.pdf'
                  : mimeType === 'image/png'       ? '.png'
                  : mimeType === 'image/webp'      ? '.webp'
                  : '.jpg';
    const safeName = `${Date.now()}-${randomUUID().slice(0, 8)}${ext}`;
    writeFileSync(join(UPLOADS_DIR, safeName), buf);
    res.json({ success: true, url: `/uploads/payment-proofs/${safeName}`, filename: safeName });
  } catch (e: any) {
    logger.error({ err: e }, 'upload-proof error');
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/v1/payments/transfer-confirm ───────────────────────────────────
// Public (no auth) — submit transfer confirmation
// Body: { booking_id, booking_code, amount, payment_method, bank_name, account_name, account_number, notes, proof_url, proof_filename, customer_name }
router.post('/transfer-confirm', async (req, res) => {
  const {
    booking_id, booking_code, amount, payment_method = 'transfer',
    bank_name, account_name, account_number, notes,
    proof_url, proof_filename, customer_name,
  } = req.body;

  if (!booking_id && !booking_code) {
    res.status(400).json({ error: 'booking_id atau booking_code diperlukan' });
    return;
  }
  if (!amount || isNaN(Number(amount))) {
    res.status(400).json({ error: 'Jumlah pembayaran tidak valid' });
    return;
  }

  const client = await pool.connect();
  try {
    // Resolve booking
    let bkRow: any;
    if (booking_id) {
      const { rows } = await client.query(
        `SELECT id, booking_code, total_price, paid_amount, remaining_amount FROM bookings WHERE id = $1 AND status <> 'cancelled'`,
        [booking_id],
      );
      bkRow = rows[0];
    } else {
      const { rows } = await client.query(
        `SELECT id, booking_code, total_price, paid_amount, remaining_amount FROM bookings WHERE booking_code = $1 AND status <> 'cancelled'`,
        [String(booking_code).toUpperCase()],
      );
      bkRow = rows[0];
    }
    if (!bkRow) {
      res.status(404).json({ error: 'Booking tidak ditemukan atau sudah dibatalkan' });
      return;
    }

    // Generate payment code
    const payCode = `TRF-${bkRow.booking_code}-${Date.now().toString(36).toUpperCase()}`;

    const { rows: inserted } = await client.query(
      `INSERT INTO payments
         (booking_id, payment_code, amount, status, payment_method,
          bank_name, account_name, account_number, notes, proof_url, proof_filename,
          payment_date, created_at, updated_at)
       VALUES ($1,$2,$3,'pending',$4,$5,$6,$7,$8,$9,$10,CURRENT_DATE,NOW(),NOW())
       RETURNING id`,
      [
        bkRow.id, payCode, Number(amount), payment_method,
        bank_name || null, account_name || null, account_number || null,
        notes || null, proof_url || null, proof_filename || null,
      ],
    );

    const paymentId = inserted[0]?.id;

    // Notify admin in-app
    try {
      await client.query(
        `INSERT INTO notifications (user_id, title, body, type, data, created_at)
         SELECT ur.user_id,
                'Konfirmasi Transfer Baru',
                $1,
                'payment_proof',
                $2::jsonb,
                NOW()
         FROM user_roles ur
         WHERE ur.role IN ('finance','admin','super_admin','owner')`,
        [
          `${customer_name || 'Jamaah'} mengkonfirmasi transfer ${formatRp(Number(amount))} untuk booking ${bkRow.booking_code}`,
          JSON.stringify({ payment_id: paymentId, booking_id: bkRow.id, booking_code: bkRow.booking_code }),
        ],
      );
    } catch { /* non-critical */ }

    res.json({ success: true, payment_id: paymentId, payment_code: payCode });
  } catch (e: any) {
    logger.error({ err: e }, 'transfer-confirm error');
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── POST /api/v1/payments/manual ─────────────────────────────────────────────
// Admin: record manual payment (cash, EDC, etc) — directly verified
router.post('/manual', async (req, res) => {
  const {
    booking_id, amount, payment_method = 'cash',
    bank_name, account_name, account_number, notes,
    payment_date, verified_by,
  } = req.body;

  if (!booking_id || !amount) {
    res.status(400).json({ error: 'booking_id dan amount diperlukan' });
    return;
  }

  const client = await pool.connect();
  try {
    const { rows: bk } = await client.query(
      `SELECT booking_code FROM bookings WHERE id = $1`,
      [booking_id],
    );
    if (!bk.length) {
      res.status(404).json({ error: 'Booking tidak ditemukan' });
      return;
    }
    const payCode = `MNL-${bk[0].booking_code}-${Date.now().toString(36).toUpperCase()}`;

    const { rows } = await client.query(
      `INSERT INTO payments
         (booking_id, payment_code, amount, status, payment_method,
          bank_name, account_name, account_number, notes,
          payment_date, verified_at, verified_by, created_at, updated_at)
       VALUES ($1,$2,$3,'verified',$4,$5,$6,$7,$8,$9,NOW(),$10,NOW(),NOW())
       RETURNING id, payment_code`,
      [
        booking_id, payCode, Number(amount), payment_method,
        bank_name || null, account_name || null, account_number || null,
        notes || null,
        payment_date || new Date().toISOString().split('T')[0],
        verified_by || null,
      ],
    );
    res.json({ success: true, payment: rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── GET /api/v1/payments/pending-proofs ──────────────────────────────────────
// Admin: list pending transfer confirmations awaiting verification
router.get('/pending-proofs', async (req, res) => {
  const limit  = Math.min(parseInt(String(req.query.limit  || '50')), 200);
  const offset = parseInt(String(req.query.offset || '0'));
  const status = (req.query.status as string) || 'pending';

  try {
    const { rows } = await pool.query(
      `SELECT
         p.id, p.payment_code, p.amount, p.status, p.payment_method,
         p.bank_name, p.account_name, p.account_number, p.notes,
         p.proof_url, p.proof_filename, p.rejection_notes,
         p.payment_date, p.verified_at, p.created_at,
         b.booking_code, b.total_price, b.paid_amount, b.remaining_amount,
         pr.full_name as customer_name, pr.phone as customer_phone
       FROM payments p
       JOIN bookings b  ON b.id = p.booking_id
       LEFT JOIN profiles pr ON pr.id = b.customer_id
       WHERE ($1 = 'all' OR p.status = $1)
         AND p.payment_method NOT IN ('midtrans','xendit','midtrans_snap')
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [status, limit, offset],
    );
    res.json({ payments: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── GET /api/v1/payments/booking/:bookingId ───────────────────────────────────
// List all payments for a booking
router.get('/booking/:bookingId', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, payment_code, amount, status, payment_method,
              bank_name, proof_url, notes, payment_date,
              verified_at, rejection_notes, gateway_name, created_at
       FROM payments
       WHERE booking_id = $1
       ORDER BY created_at DESC`,
      [req.params.bookingId],
    );
    res.json({ payments: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/v1/payments/:paymentId/verify ──────────────────────────────────
// Admin: approve or reject a pending payment proof
router.post('/:paymentId/verify', async (req, res) => {
  const { action, notes, verified_by } = req.body as {
    action: 'approve' | 'reject';
    notes?: string;
    verified_by?: string;
  };
  if (!['approve', 'reject'].includes(action)) {
    res.status(400).json({ error: 'action harus "approve" atau "reject"' });
    return;
  }

  const client = await pool.connect();
  try {
    const newStatus = action === 'approve' ? 'verified' : 'rejected';
    const { rowCount } = await client.query(
      `UPDATE payments
       SET status           = $1,
           rejection_notes  = CASE WHEN $1 = 'rejected' THEN $2 ELSE rejection_notes END,
           verified_at      = CASE WHEN $1 = 'verified' THEN NOW() ELSE verified_at END,
           verified_by      = CASE WHEN $1 = 'verified' THEN $3 ELSE verified_by END,
           notes            = COALESCE($4, notes),
           updated_at       = NOW()
       WHERE id = $5 AND status = 'pending'`,
      [newStatus, notes || null, verified_by || null, notes || null, req.params.paymentId],
    );
    if (!rowCount) {
      res.status(404).json({ error: 'Pembayaran tidak ditemukan atau sudah diproses' });
      return;
    }
    res.json({ success: true, status: newStatus });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── GET /api/v1/payments/bank-accounts/admin ─────────────────────────────────
router.get('/bank-accounts/admin', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM bank_accounts ORDER BY is_primary DESC, bank_name ASC`,
    );
    res.json({ accounts: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/v1/payments/bank-accounts ──────────────────────────────────────
router.post('/bank-accounts', async (req, res) => {
  const { bank_name, account_number, account_name, branch, branch_name, is_primary, notes } = req.body;
  const effectiveBranch = branch_name || branch || null;
  if (!bank_name || !account_number || !account_name) {
    res.status(400).json({ error: 'bank_name, account_number, dan account_name wajib diisi' });
    return;
  }
  const client = await pool.connect();
  try {
    if (is_primary) {
      await client.query(`UPDATE bank_accounts SET is_primary = FALSE`);
    }
    const { rows } = await client.query(
      `INSERT INTO bank_accounts (bank_name, account_number, account_name, branch_name, is_primary, notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [bank_name, account_number, account_name, effectiveBranch, !!is_primary, notes || null],
    );
    res.json({ success: true, account: rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── PUT /api/v1/payments/bank-accounts/:id ────────────────────────────────────
router.put('/bank-accounts/:id', async (req, res) => {
  const { bank_name, account_number, account_name, branch, branch_name, is_primary, is_active, notes } = req.body;
  const effectiveBranch = branch_name || branch || null;
  const client = await pool.connect();
  try {
    if (is_primary) {
      await client.query(`UPDATE bank_accounts SET is_primary = FALSE`);
    }
    const { rows } = await client.query(
      `UPDATE bank_accounts
       SET bank_name=$1, account_number=$2, account_name=$3, branch_name=$4,
           is_primary=$5, is_active=$6, notes=COALESCE($7, notes), updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [bank_name, account_number, account_name, effectiveBranch,
       !!is_primary, is_active !== false, notes || null, req.params.id],
    );
    if (!rows.length) { res.status(404).json({ error: 'Rekening tidak ditemukan' }); return; }
    res.json({ success: true, account: rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── DELETE /api/v1/payments/bank-accounts/:id ────────────────────────────────
router.delete('/bank-accounts/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM bank_accounts WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ── POST /api/v1/payments/generate-token ─────────────────────────────────────
// Admin: create a shareable payment page token for a booking
router.post('/generate-token', async (req, res) => {
  const { booking_id } = req.body;
  if (!booking_id) { res.status(400).json({ error: 'booking_id diperlukan' }); return; }
  try {
    const { rows } = await pool.query(
      `INSERT INTO payment_page_tokens (booking_id, expires_at)
       VALUES ($1, NOW() + INTERVAL '72 hours')
       RETURNING token, expires_at`,
      [booking_id],
    );
    res.json({ token: rows[0].token, expires_at: rows[0].expires_at });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
