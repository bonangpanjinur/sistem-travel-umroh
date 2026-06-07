import { Router } from 'express';
import { pool } from '../../lib/db.js';

const router = Router();

const INTEGRATION_KEYS = [
  'integration_gemini_api_key',
  'integration_openai_api_key',
  'integration_midtrans_server_key',
  'integration_midtrans_client_key',
  'integration_midtrans_mode',
  'integration_smtp_host',
  'integration_smtp_port',
  'integration_smtp_user',
  'integration_smtp_pass',
  'integration_smtp_from',
];

const SENSITIVE_KEYS = new Set([
  'integration_gemini_api_key',
  'integration_openai_api_key',
  'integration_midtrans_server_key',
  'integration_smtp_pass',
]);

function maskValue(key: string, value: string): string {
  if (!value) return '';
  if (SENSITIVE_KEYS.has(key)) {
    if (value.length <= 8) return '••••••••';
    return value.slice(0, 4) + '••••••••' + value.slice(-4);
  }
  return value;
}

// ── GET /api/v1/settings/integrations ─────────────────────────────────────────
// Returns all integration settings. Sensitive values are masked.
router.get('/', async (_req: any, res: any) => {
  try {
    const client = await pool.connect();
    try {
      const { rows } = await client.query<{ key: string; value: string }>(
        `SELECT key, value FROM app_settings WHERE key = ANY($1)`,
        [INTEGRATION_KEYS],
      );

      const settings: Record<string, string> = {};
      for (const key of INTEGRATION_KEYS) {
        const row = rows.find(r => r.key === key);
        const raw = row?.value ?? '';
        settings[key] = maskValue(key, raw);
      }

      // Also read env vars as fallback status
      const envStatus: Record<string, boolean> = {
        integration_gemini_api_key: !!process.env['GEMINI_API_KEY'],
        integration_openai_api_key: !!process.env['OPENAI_API_KEY'],
        integration_midtrans_server_key: !!process.env['MIDTRANS_SERVER_KEY'],
        integration_midtrans_client_key: !!process.env['MIDTRANS_CLIENT_KEY'],
        integration_smtp_host: !!process.env['SMTP_HOST'],
        integration_smtp_user: !!process.env['SMTP_USER'],
        integration_smtp_pass: !!process.env['SMTP_PASS'],
      };

      // Is-set: true if DB has a non-empty value OR env var is set
      const isSet: Record<string, boolean> = {};
      for (const key of INTEGRATION_KEYS) {
        const row = rows.find(r => r.key === key);
        isSet[key] = !!(row?.value) || !!(envStatus[key]);
      }

      return res.json({ settings, isSet, envStatus });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ── POST /api/v1/settings/integrations ────────────────────────────────────────
// Save one or more integration settings. Skip masked/unchanged values.
router.post('/', async (req: any, res: any) => {
  try {
    const body: Record<string, string> = req.body ?? {};
    const client = await pool.connect();
    try {
      let saved = 0;
      for (const key of INTEGRATION_KEYS) {
        if (!(key in body)) continue;
        const val: string = body[key] ?? '';
        // Skip if the submitted value still looks masked (user didn't change it)
        if (val.includes('••')) continue;
        await client.query(
          `INSERT INTO app_settings (key, value, updated_at)
           VALUES ($1, $2, NOW())
           ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
          [key, val],
        );
        saved++;
      }
      return res.json({ success: true, saved });
    } finally {
      client.release();
    }
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

// ── GET /api/v1/settings/integrations/status ──────────────────────────────────
// Test connectivity for a specific integration (gemini, midtrans, smtp)
router.post('/test/:service', async (req: any, res: any) => {
  const { service } = req.params;
  const client = await pool.connect();

  async function getKey(k: string): Promise<string> {
    const { rows } = await client.query(`SELECT value FROM app_settings WHERE key=$1`, [k]);
    return rows[0]?.value ?? '';
  }

  try {
    if (service === 'gemini') {
      const dbKey = await getKey('integration_gemini_api_key');
      const key = dbKey || process.env['GEMINI_API_KEY'] || '';
      if (!key) return res.status(400).json({ ok: false, error: 'API key belum dikonfigurasi' });
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hello' }] }] }),
        },
      );
      if (!r.ok) {
        const d: any = await r.json().catch(() => ({}));
        return res.status(400).json({ ok: false, error: d?.error?.message || `HTTP ${r.status}` });
      }
      return res.json({ ok: true, message: 'Gemini AI terhubung' });
    }

    if (service === 'midtrans') {
      const serverKey = await getKey('integration_midtrans_server_key') || process.env['MIDTRANS_SERVER_KEY'] || '';
      const modeRow = await getKey('integration_midtrans_mode');
      const mode = modeRow || 'sandbox';
      if (!serverKey) return res.status(400).json({ ok: false, error: 'Server key belum dikonfigurasi' });
      const baseUrl = mode === 'production'
        ? 'https://api.midtrans.com/v2/charge'
        : 'https://api.sandbox.midtrans.com/v2/charge';
      const r = await fetch(baseUrl, {
        method: 'OPTIONS',
        headers: { Authorization: `Basic ${Buffer.from(serverKey + ':').toString('base64')}` },
      });
      return res.json({ ok: r.status < 500, message: `Midtrans ${mode} terhubung (status ${r.status})` });
    }

    return res.status(400).json({ ok: false, error: 'Service tidak dikenal: ' + service });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  } finally {
    client.release();
  }
});

export default router;
