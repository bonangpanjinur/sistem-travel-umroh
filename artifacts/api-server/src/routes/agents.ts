import { Router } from 'express';

const router = Router();

/**
 * POST /api/agents/create
 * Create a new agent. If SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set,
 * creates both the auth user and the agent record via Supabase Admin API.
 * Otherwise returns a clear error so the frontend can handle it.
 */
router.post('/create', async (req, res) => {
  const supabaseUrl = process.env['SUPABASE_URL'];
  const serviceKey  = process.env['SUPABASE_SERVICE_ROLE_KEY'];

  if (!supabaseUrl || !serviceKey) {
    res.status(503).json({
      success: false,
      error: 'Server belum terkonfigurasi untuk membuat agent. Tambahkan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di Replit Secrets.',
    });
    return;
  }

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

  try {
    // Step 1: Create auth user via Supabase Admin API
    const createUserRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password: Math.random().toString(36).slice(-12) + 'Aa1!',
        email_confirm: true,
        user_metadata: { full_name: fullName },
      }),
    });

    const authUser = await createUserRes.json() as { id?: string; error?: string; msg?: string };
    if (!createUserRes.ok || !authUser.id) {
      throw new Error(authUser.error || authUser.msg || 'Gagal membuat user auth');
    }

    const userId = authUser.id;

    // Step 2: Generate agent code
    const year = new Date().getFullYear();
    const code = `AGT${year}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    // Step 3: Insert agent record
    const agentRes = await fetch(`${supabaseUrl}/rest/v1/agents`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        user_id: userId,
        agent_code: code,
        full_name: fullName,
        email,
        phone: phone || null,
        company_name: companyName || null,
        commission_rate: commissionRate ? parseFloat(commissionRate) : 5,
        bank_name: bankName || null,
        bank_account_number: bankAccountNumber || null,
        bank_account_name: bankAccountName || null,
        npwp: npwp || null,
        branch_id: branchId || null,
        parent_agent_id: parentAgentId || null,
        is_active: true,
      }),
    });

    const agentRows = await agentRes.json() as any[];
    if (!agentRes.ok) {
      throw new Error('Gagal membuat record agent: ' + JSON.stringify(agentRows));
    }

    // Step 4: Assign agent role
    await fetch(`${supabaseUrl}/rest/v1/user_roles`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, role: 'agent', branch_id: branchId || null }),
    });

    // Step 5: Create profile
    await fetch(`${supabaseUrl}/rest/v1/profiles`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id: userId, full_name: fullName, role: 'agent' }),
    });

    // Step 6: Send password reset email so agent can set their password
    await fetch(`${supabaseUrl}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type: 'recovery', email }),
    }).catch(() => {}); // Non-fatal

    res.json({
      success: true,
      agentCode: code,
      email,
      userId,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/agents/:agentId/commission-tier
 * P5: Kalkulasi komisi bertingkat berdasarkan volume booking agen.
 * Memanggil DB function calculate_tiered_commission(p_agent_id, p_period_start, p_period_end).
 *
 * Query params opsional: ?start=YYYY-MM-DD&end=YYYY-MM-DD (default: bulan berjalan)
 */
router.get('/:agentId/commission-tier', async (req, res) => {
  const { agentId } = req.params;
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const defaultEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  const start = (req.query.start as string) || defaultStart;
  const end   = (req.query.end   as string) || defaultEnd;

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.status(503).json({ success: false, error: 'Supabase belum dikonfigurasi.' });
    return;
  }

  try {
    const rpcRes = await fetch(`${supabaseUrl}/rest/v1/rpc/calculate_tiered_commission`, {
      method: 'POST',
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_agent_id: agentId, p_period_start: start, p_period_end: end }),
      signal: AbortSignal.timeout(15000),
    });

    if (!rpcRes.ok) {
      const errText = await rpcRes.text();
      throw new Error(`DB error: ${rpcRes.status} — ${errText}`);
    }

    const data = await rpcRes.json();
    res.json({ success: true, agentId, period: { start, end }, commission: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/agents/commission-tiers/list
 * P5: Daftar semua tier komisi yang terdaftar.
 */
router.get('/commission-tiers/list', async (_req, res) => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    res.status(503).json({ success: false, error: 'Supabase belum dikonfigurasi.' });
    return;
  }

  try {
    const tiersRes = await fetch(
      `${supabaseUrl}/rest/v1/agent_commission_tiers?select=*&order=min_bookings.asc`,
      {
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
        signal: AbortSignal.timeout(10000),
      }
    );
    if (!tiersRes.ok) throw new Error(`HTTP ${tiersRes.status}`);
    const tiers = await tiersRes.json();
    res.json({ success: true, tiers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

