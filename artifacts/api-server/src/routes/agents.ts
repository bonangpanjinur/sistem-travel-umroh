import { Router } from 'express';
import { db } from '../lib/db.js';
import { sql } from 'drizzle-orm';
import { createUser, requireAuth, requireRole } from '../lib/auth.js';
import { pool } from '../lib/db.js';
import { logger } from '../lib/logger.js';
import { sendWA, credentialMessage } from '../lib/whatsapp.js';

const router = Router();

// ── POST /api/agents/create ─────────────────────────────────────────────────
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

    const tempPassword = Math.random().toString(36).slice(-12) + 'Aa1!';
    const user = await createUser(email, tempPassword, fullName, phone, { full_name: fullName });
    const userId = user.id;

    const year = new Date().getFullYear();
    const code = `AGT${year}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    const agentResult = await client.query(
      `INSERT INTO agents (
        user_id, agent_code, contact_name, email, phone, company_name, commission_rate,
        branch_id, parent_agent_id, is_active, status, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,true,'active',NOW(),NOW())
      RETURNING id`,
      [
        userId, code, fullName, email, phone ?? null, companyName ?? fullName,
        commissionRate ? parseFloat(commissionRate) : 5,
        branchId ?? null, parentAgentId ?? null,
      ]
    );

    const roleToAssign = parentAgentId ? 'sub_agent' : 'agent';
    await client.query(
      `INSERT INTO user_roles (user_id, role, branch_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
      [userId, roleToAssign, branchId ?? null]
    );

    await client.query(
      `UPDATE profiles SET role = $1 WHERE id = $2`,
      [roleToAssign, userId]
    );

    await client.query('COMMIT');

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

// ── POST /api/agents/tiers/refresh — batch recalculate semua membership tier ─
router.post('/tiers/refresh', requireAuth, async (req, res) => {
  const user = req.user!;
  if (!['super_admin', 'owner', 'admin'].includes(user.role)) {
    res.status(403).json({ success: false, error: 'Akses ditolak.' });
    return;
  }
  try {
    const result = await pool.query(`SELECT * FROM refresh_agent_membership_tiers()`);
    const changes = result.rows.filter((r: any) => r.old_tier !== r.new_tier);
    logger.info({ total: result.rowCount, changed: changes.length }, 'Manual agent tier refresh triggered');
    res.json({
      success: true,
      total_processed: result.rowCount ?? 0,
      total_changed: changes.length,
      changes,
    });
  } catch (err: any) {
    logger.error({ err }, 'Agent tier refresh failed');
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/agents/tiers/config — baca konfigurasi threshold tier ───────────
router.get('/tiers/config', requireAuth, async (_req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM agent_tier_config ORDER BY min_bookings ASC`);
    res.json({ success: true, config: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PUT /api/agents/tiers/config/:tier — update threshold tier ───────────────
router.put('/tiers/config/:tier', requireAuth, async (req, res) => {
  const user = req.user!;
  if (!['super_admin', 'owner'].includes(user.role)) {
    res.status(403).json({ success: false, error: 'Akses ditolak.' });
    return;
  }
  const { tier } = req.params;
  const { min_bookings, label, color, description } = req.body;
  if (!['bronze', 'silver', 'gold', 'platinum'].includes(tier as string)) {
    res.status(400).json({ success: false, error: 'Tier tidak valid.' });
    return;
  }
  try {
    const result = await pool.query(
      `UPDATE agent_tier_config
       SET min_bookings = COALESCE($1, min_bookings),
           label        = COALESCE($2, label),
           color        = COALESCE($3, color),
           description  = COALESCE($4, description),
           updated_at   = NOW()
       WHERE tier = $5
       RETURNING *`,
      [min_bookings ?? null, label ?? null, color ?? null, description ?? null, tier]
    );
    res.json({ success: true, config: result.rows[0] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/agents/tiers/stats — ringkasan distribusi tier ─────────────────
router.get('/tiers/stats', requireAuth, async (_req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        a.membership_tier AS tier,
        COUNT(*)          AS count,
        AVG(a.total_confirmed_bookings) AS avg_bookings,
        MAX(a.total_confirmed_bookings) AS max_bookings,
        MAX(a.membership_tier_updated_at) AS last_updated
      FROM agents a
      WHERE a.status = 'active'
      GROUP BY a.membership_tier
      ORDER BY
        CASE a.membership_tier
          WHEN 'platinum' THEN 1
          WHEN 'gold'     THEN 2
          WHEN 'silver'   THEN 3
          ELSE 4
        END
    `);
    res.json({ success: true, stats: result.rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/agents/commission-tiers/list ─────────────────────────────────
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

// ── POST /api/agents/invitation — buat token undangan sub-agen ──────────────
router.post('/invitation', requireAuth, async (req, res) => {
  const user = req.user!;
  // Only agents can generate invitation links
  if (!['agent', 'sub_agent', 'super_admin', 'owner'].includes(user.role)) {
    res.status(403).json({ success: false, error: 'Hanya agen yang bisa membuat undangan.' });
    return;
  }

  try {
    // Find the agent record for this user
    const agentRow = await pool.query(
      `SELECT id, agent_code FROM agents WHERE user_id = $1 LIMIT 1`,
      [user.sub]
    );
    if (!agentRow.rows[0]) {
      res.status(404).json({ success: false, error: 'Data agen tidak ditemukan.' });
      return;
    }
    const agentId = agentRow.rows[0].id;
    const agentCode = agentRow.rows[0].agent_code;

    // Create invitation token (expires 7 days)
    const result = await pool.query(
      `INSERT INTO agent_invitation_tokens (agent_id, expires_at)
       VALUES ($1, NOW() + INTERVAL '7 days')
       RETURNING id, token, expires_at`,
      [agentId]
    );
    const inv = result.rows[0];

    res.json({
      success: true,
      token: inv.token,
      agent_code: agentCode,
      expires_at: inv.expires_at,
    });
  } catch (err: any) {
    logger.error({ err }, 'agents/invitation create error');
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/agents/invitation/:token — validasi token ──────────────────────
router.get('/invitation/:token', async (req, res) => {
  const { token } = req.params;
  try {
    const result = await pool.query(
      `SELECT t.id, t.token, t.expires_at, t.used_at,
              a.id AS agent_id, a.agent_code, a.company_name, a.contact_name,
              b.name AS branch_name
       FROM agent_invitation_tokens t
       JOIN agents a ON a.id = t.agent_id
       LEFT JOIN branches b ON b.id = a.branch_id
       WHERE t.token = $1`,
      [token]
    );
    const inv = result.rows[0];
    if (!inv) {
      res.status(404).json({ success: false, error: 'Token tidak valid.' });
      return;
    }
    if (inv.used_at) {
      res.status(410).json({ success: false, error: 'Token sudah digunakan.' });
      return;
    }
    if (new Date(inv.expires_at) < new Date()) {
      res.status(410).json({ success: false, error: 'Token sudah kadaluarsa.' });
      return;
    }
    res.json({ success: true, invitation: inv });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/agents/invitation/register — daftar sub-agen via token ────────
router.post('/invitation/register', async (req, res) => {
  const { token, fullName, email, phone, companyName, ktpNumber, ktp_url } = req.body as {
    token: string;
    fullName: string;
    email: string;
    phone?: string;
    companyName?: string;
    ktpNumber?: string;
    ktp_url?: string;
  };

  if (!token || !fullName || !email || !phone) {
    res.status(400).json({ success: false, error: 'Token, nama, email, dan HP wajib diisi.' });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Validate token
    const invResult = await client.query(
      `SELECT t.id, t.agent_id, t.used_at, t.expires_at, a.branch_id, a.agent_code
       FROM agent_invitation_tokens t
       JOIN agents a ON a.id = t.agent_id
       WHERE t.token = $1
       FOR UPDATE`,
      [token]
    );
    const inv = invResult.rows[0];
    if (!inv) {
      res.status(404).json({ success: false, error: 'Token tidak valid.' });
      return;
    }
    if (inv.used_at) {
      res.status(410).json({ success: false, error: 'Token sudah digunakan.' });
      return;
    }
    if (new Date(inv.expires_at) < new Date()) {
      res.status(410).json({ success: false, error: 'Token sudah kadaluarsa.' });
      return;
    }

    // Check email not taken
    const emailCheck = await client.query(
      `SELECT id FROM auth.users WHERE email = $1 AND deleted_at IS NULL`,
      [email.toLowerCase().trim()]
    );
    if (emailCheck.rows.length > 0) {
      res.status(422).json({ success: false, error: 'Email sudah terdaftar.' });
      return;
    }

    // Insert pending agent (no user account yet — created by admin on approval)
    const year = new Date().getFullYear();
    const code = `AGT${year}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    const agentResult = await client.query(
      `INSERT INTO agents (
        agent_code, contact_name, email, phone, company_name,
        branch_id, parent_agent_id, is_active, status,
        commission_rate, created_at, updated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,false,'pending',5,NOW(),NOW())
      RETURNING id`,
      [
        code, fullName, email.toLowerCase().trim(), phone,
        companyName ?? fullName, inv.branch_id ?? null, inv.agent_id,
      ]
    );
    const newAgentId = agentResult.rows[0].id;

    // Mark token as used
    await client.query(
      `UPDATE agent_invitation_tokens
       SET used_at = NOW(), used_by_agent_id = $1
       WHERE id = $2`,
      [newAgentId, inv.id]
    );

    // Simpan ktp_number dan ktp_url ke kolom dedicated
    if (ktpNumber || ktp_url) {
      await client.query(
        `UPDATE agents SET ktp_number = COALESCE($1, ktp_number),
                           ktp_url    = COALESCE($2, ktp_url)
         WHERE id = $3`,
        [ktpNumber ?? null, ktp_url ?? null, newAgentId]
      );
    }

    await client.query('COMMIT');

    // Notify parent agent via WA
    const parentAgent = await pool.query(
      `SELECT a.phone, a.contact_name FROM agents a WHERE a.id = $1`,
      [inv.agent_id]
    );
    const parent = parentAgent.rows[0];
    if (parent?.phone) {
      const msg = `Halo ${parent.contact_name},\n\nAda calon sub-agen baru yang mendaftar via link Anda:\n*Nama:* ${fullName}\n*HP:* ${phone}\n*Email:* ${email}\n\nMenunggu approval admin. Kami akan memberitahu Anda setelah disetujui.`;
      sendWA(parent.phone, msg).catch(() => {});
    }

    res.json({
      success: true,
      message: 'Pendaftaran berhasil! Admin akan meninjau dan menghubungi Anda segera.',
      agentId: newAgentId,
    });
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'agents/invitation/register error');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ── GET /api/agents/:agentId/commission-tier ─────────────────────────────
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

// ── GET /api/agents/:id — detail agen ────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Agent info + profile
    const agentResult = await pool.query(
      `SELECT a.*,
              p.full_name, p.phone AS profile_phone, p.avatar_url,
              b.name AS branch_name, b.code AS branch_code,
              pa.agent_code AS parent_agent_code, pa.company_name AS parent_company_name
       FROM agents a
       LEFT JOIN profiles p ON p.id = a.user_id
       LEFT JOIN branches b ON b.id = a.branch_id
       LEFT JOIN agents pa ON pa.id = a.parent_agent_id
       WHERE a.id = $1`,
      [id]
    );
    const agent = agentResult.rows[0];
    if (!agent) {
      res.status(404).json({ success: false, error: 'Agen tidak ditemukan.' });
      return;
    }

    // Sub-agents
    const subAgentsResult = await pool.query(
      `SELECT a.id, a.agent_code, a.contact_name, a.company_name, a.email, a.phone,
              a.commission_rate, a.is_active, a.status, a.created_at,
              p.full_name
       FROM agents a
       LEFT JOIN profiles p ON p.id = a.user_id
       WHERE a.parent_agent_id = $1
       ORDER BY a.created_at DESC`,
      [id]
    );

    // Recent bookings
    const bookingsResult = await pool.query(
      `SELECT b.id, b.booking_code, b.total_price, b.status, b.created_at,
              b.adult_count, b.child_count,
              dep.departure_date,
              pk.name AS package_name
       FROM bookings b
       LEFT JOIN departures dep ON dep.id = b.departure_id
       LEFT JOIN packages pk ON pk.id = dep.package_id
       WHERE b.agent_id = $1
       ORDER BY b.created_at DESC
       LIMIT 20`,
      [id]
    );

    // Commission history
    const commissionsResult = await pool.query(
      `SELECT ac.id, ac.booking_id, ac.commission_amount, ac.status,
              ac.created_at, ac.paid_at, ac.notes,
              b.booking_code, b.total_price
       FROM agent_commissions ac
       LEFT JOIN bookings b ON b.id = ac.booking_id
       WHERE ac.agent_id = $1
       ORDER BY ac.created_at DESC
       LIMIT 30`,
      [id]
    );

    // Stats
    const statsResult = await pool.query(
      `SELECT
         COUNT(b.id)::int AS total_bookings,
         COALESCE(SUM(b.total_price),0) AS total_revenue,
         COALESCE(SUM(CASE WHEN ac.status IN ('approved','paid') THEN ac.commission_amount END),0) AS total_commission,
         COUNT(DISTINCT b.customer_id)::int AS total_jamaah
       FROM bookings b
       LEFT JOIN agent_commissions ac ON ac.booking_id = b.id AND ac.agent_id = $1
       WHERE b.agent_id = $1`,
      [id]
    );

    res.json({
      success: true,
      agent,
      sub_agents: subAgentsResult.rows,
      bookings: bookingsResult.rows,
      commissions: commissionsResult.rows,
      stats: statsResult.rows[0],
    });
  } catch (err: any) {
    logger.error({ err }, 'agents/:id GET error');
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── PATCH /api/agents/:id/status — suspend / aktifkan agen ───────────────────
router.patch('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: 'active' | 'suspended' | 'inactive' };

  if (!['active', 'suspended', 'inactive'].includes(status)) {
    res.status(400).json({ success: false, error: 'Status tidak valid. Gunakan: active, suspended, atau inactive.' });
    return;
  }

  const client = await pool.connect();
  try {
    const result = await client.query(
      `UPDATE agents
       SET status = $1, is_active = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING id, contact_name, phone, status`,
      [status, status === 'active', id]
    );
    const agent = result.rows[0];
    if (!agent) {
      res.status(404).json({ success: false, error: 'Agen tidak ditemukan.' });
      return;
    }

    // Kirim WA notifikasi
    if (agent.phone) {
      let msg = '';
      if (status === 'suspended') {
        msg = `Yth. ${agent.contact_name},\n\nAkun agen Anda di Vinstour Travel telah *ditangguhkan* sementara. Hubungi admin untuk informasi lebih lanjut.`;
      } else if (status === 'active') {
        msg = `Yth. ${agent.contact_name},\n\nAkun agen Anda di Vinstour Travel telah *diaktifkan kembali*. Selamat bekerja!`;
      }
      if (msg) sendWA(agent.phone, msg).catch(() => {});
    }

    res.json({ success: true, agent });
  } catch (err: any) {
    logger.error({ err }, 'agents/:id/status PATCH error');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ── POST /api/agents/:id/reset-password ─────────────────────────────────────
router.post('/:id/reset-password', async (req, res) => {
  const { id } = req.params;
  const { newPassword } = req.body as { newPassword?: string };
  try {
    const agentRow = await pool.query(
      `SELECT a.user_id, a.contact_name, a.phone FROM agents a WHERE a.id = $1`,
      [id]
    );
    const agent = agentRow.rows[0];
    if (!agent?.user_id) {
      res.status(404).json({ success: false, error: 'Agen tidak ditemukan atau belum punya akun.' });
      return;
    }

    const tempPass = newPassword || (Math.random().toString(36).slice(-10) + 'Aa1!');
    const hash = await (await import('../lib/auth.js')).hashPassword(tempPass);
    await pool.query(
      `UPDATE auth.users SET encrypted_password = $1, updated_at = NOW() WHERE id = $2`,
      [hash, agent.user_id]
    );

    if (agent.phone) {
      const msg = `Yth. ${agent.contact_name},\n\nPassword akun agen Anda telah direset oleh admin.\nPassword baru: *${tempPass}*\n\nSegera ganti password setelah login.`;
      sendWA(agent.phone, msg).catch(() => {});
    }

    res.json({ success: true, tempPassword: tempPass });
  } catch (err: any) {
    logger.error({ err }, 'agents/:id/reset-password error');
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/agents/:id/approve — approve pending sub-agen ─────────────────
router.post('/:id/approve', async (req, res) => {
  const { id } = req.params;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Get pending agent
    const agentRow = await client.query(
      `SELECT id, contact_name, email, phone, company_name, commission_rate,
              branch_id, parent_agent_id
       FROM agents WHERE id = $1 AND status = 'pending'`,
      [id]
    );
    const agent = agentRow.rows[0];
    if (!agent) {
      res.status(404).json({ success: false, error: 'Sub-agen pending tidak ditemukan.' });
      return;
    }

    // Create auth user
    const tempPass = Math.random().toString(36).slice(-10) + 'Aa1!';
    const user = await createUser(agent.email, tempPass, agent.contact_name, agent.phone ?? undefined);
    const userId = user.id;

    // Update agent: set user_id, status active
    await client.query(
      `UPDATE agents SET user_id = $1, status = 'active', is_active = true, updated_at = NOW()
       WHERE id = $2`,
      [userId, id]
    );

    // Assign sub_agent role
    await client.query(
      `INSERT INTO user_roles (user_id, role, branch_id) VALUES ($1, 'sub_agent', $2)
       ON CONFLICT DO NOTHING`,
      [userId, agent.branch_id ?? null]
    );
    await client.query(`UPDATE profiles SET role = 'sub_agent' WHERE id = $1`, [userId]);

    await client.query('COMMIT');

    // WA ke sub-agen
    if (agent.phone) {
      const msg = credentialMessage({
        recipientName: agent.contact_name,
        role: 'Sub-Agen',
        email: agent.email,
        password: tempPass,
      });
      sendWA(agent.phone, msg).catch(() => {});
    }

    // WA ke agen induk
    if (agent.parent_agent_id) {
      const parentRow = await pool.query(
        `SELECT phone, contact_name FROM agents WHERE id = $1`,
        [agent.parent_agent_id]
      );
      const parent = parentRow.rows[0];
      if (parent?.phone) {
        const msg = `Halo ${parent.contact_name},\n\nSub-agen *${agent.contact_name}* Anda telah disetujui dan kini aktif di Vinstour Travel.`;
        sendWA(parent.phone, msg).catch(() => {});
      }
    }

    res.json({ success: true, userId, tempPassword: tempPass });
  } catch (err: any) {
    await client.query('ROLLBACK');
    logger.error({ err }, 'agents/:id/approve error');
    res.status(500).json({ success: false, error: err.message });
  } finally {
    client.release();
  }
});

// ── POST /api/agents/:id/reject — tolak pending sub-agen ────────────────────
router.post('/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body as { reason?: string };

  try {
    const result = await pool.query(
      `UPDATE agents SET status = 'inactive', updated_at = NOW()
       WHERE id = $1 AND status = 'pending'
       RETURNING id, contact_name, phone`,
      [id]
    );
    const agent = result.rows[0];
    if (!agent) {
      res.status(404).json({ success: false, error: 'Sub-agen pending tidak ditemukan.' });
      return;
    }

    if (agent.phone) {
      const msg = `Yth. ${agent.contact_name},\n\nMohon maaf, pendaftaran sub-agen Anda di Vinstour Travel belum dapat disetujui.${reason ? `\nAlasan: ${reason}` : ''}\n\nHubungi kami untuk informasi lebih lanjut.`;
      sendWA(agent.phone, msg).catch(() => {});
    }

    res.json({ success: true });
  } catch (err: any) {
    logger.error({ err }, 'agents/:id/reject error');
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
