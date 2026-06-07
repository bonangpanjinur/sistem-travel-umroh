import { Router } from 'express';
import { db } from '../lib/db.js';
import { sql } from 'drizzle-orm';
import { createUser } from '../lib/auth.js';
import { pool } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import { sendWA, credentialMessage } from '../lib/whatsapp.js';

const router = Router();

/**
 * POST /api/agents/create
 * Create a new agent using native Postgres (no Supabase).
 */
router.post('/create', async (req, res) => {
  const {
    fullName, email, phone, companyName, commissionRate,
    bankName, bankAccountNumber, bankAccountName, npwp,
    branchId, parentAgentId,
  } = req.body as {
    fullName: string;
    email: string;
    phone?: string;
    companyName?: string;
    commissionRate?: string;
    bankName?: string;
    bankAccountNumber?: string;
    bankAccountName?: string;
    npwp?: string;
    branchId?: string | null;
    parentAgentId?: string | null;
  };

  if (!fullName || !email) {
    res.status(400).json({ success: false, error: 'fullName dan email wajib diisi.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Step 1: Create auth user
    const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';
    const user = await createUser(email, tempPassword, fullName, phone, { full_name: fullName });
    const userId = user.id;

    // Step 2: Generate agent code
    const year = new Date().getFullYear();
    const code = `AGT${year}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    // Step 3: Insert agent record
    const agentResult = await client.query(
      `INSERT INTO agents (
        user_id, agent_code, contact_name, email, phone, company_name, commission_rate,
        branch_id, parent_agent_id, is_active, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,NOW(),NOW())
      RETURNING id`,
      [
        userId, code, fullName, email, phone ?? null, companyName ?? fullName,
        commissionRate ? parseFloat(commissionRate) : 5,
        branchId ?? null, parentAgentId ?? null,
      ]
    );

    // Step 4: Assign agent role
    await client.query(
      `INSERT INTO user_roles (user_id, role, branch_id) VALUES ($1, 'agent', $2) ON CONFLICT DO NOTHING`,
      [userId, branchId ?? null]
    );

    // Step 5: Update profile role
    await client.query(
      `UPDATE profiles SET role = 'agent' WHERE id = $1`,
      [userId]
    );

    await client.query('COMMIT');

    // Kirim kredensial via WA (non-blocking, tidak gagalkan request jika WA error)
    if (phone) {
      const role = parentAgentId ? 'Sub-Agen' : 'Agen';
      const msg = credentialMessage({ recipientName: fullName, role, email, password: tempPassword });
      sendWA(phone, msg).then(result => {
        if (!result.success) logger.warn({ result, phone }, 'Gagal kirim WA kredensial agen');
      }).catch(() => {});
    }

    res.json({
      success: true,
      agentCode: code,
      email,
      userId,
      agentId: agentResult.rows[0]?.id,
      tempPassword,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'agents/create error');
    if (err.code === '23505') {
      res.status(422).json({ success: false, error: 'Email sudah terdaftar.' });
      return;
    }
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

/**
 * GET /api/agents/:agentId/commission-tier
 */
router.get('/:agentId/commission-tier', async (req, res) => {
  const { agentId } = req.params;
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const start = (req.query.start as string) || defaultStart;
  const end   = (req.query.end   as string) || defaultEnd;

  try {
    const result = await db.execute(
      sql`SELECT calculate_tiered_commission(${agentId}::uuid, ${start}::date, ${end}::date) AS result`
    );
    const row = (result.rows[0] as any)?.result ?? null;
    res.json({ success: true, agentId, period: { start, end }, commission: row });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/agents/commission-tiers/list
 */
router.get('/commission-tiers/list', async (_req, res) => {
  try {
    const result = await db.execute(
      sql`SELECT * FROM agent_commission_tiers ORDER BY min_bookings ASC`
    );
    res.json({ success: true, tiers: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
