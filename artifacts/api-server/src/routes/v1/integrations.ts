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

// Services that can be tested
const TESTABLE_SERVICES = ['gemini', 'midtrans'] as const;
type TestableService = (typeof TESTABLE_SERVICES)[number];

function maskValue(key: string, value: string): string {
  if (!value) return '';
  if (SENSITIVE_KEYS.has(key)) {
    if (value.length <= 8) return '••••••••';
    return value.slice(0, 4) + '••••••••' + value.slice(-4);
  }
  return value;
}

async function saveHealthStatus(
  client: any,
  service: TestableService,
  status: 'ok' | 'error' | 'unconfigured',
  message: string,
) {
  const ts = new Date().toISOString();
  await client.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [`integration_${service}_health_status`, status],
  );
  await client.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [`integration_${service}_health_ts`, ts],
  );
  await client.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [`integration_${service}_health_msg`, message],
  );
}

// ── GET /api/v1/settings/integrations ─────────────────────────────────────────
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

      const envStatus: Record<string, boolean> = {
        integration_gemini_api_key: !!process.env['GEMINI_API_KEY'],
        integration_openai_api_key: !!process.env['OPENAI_API_KEY'],
        integration_midtrans_server_key: !!process.env['MIDTRANS_SERVER_KEY'],
        integration_midtrans_client_key: !!process.env['MIDTRANS_CLIENT_KEY'],
        integration_smtp_host: !!process.env['SMTP_HOST'],
        integration_smtp_user: !!process.env['SMTP_USER'],
        integration_smtp_pass: !!process.env['SMTP_PASS'],
      };

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

// ── GET /api/v1/settings/integrations/health ──────────────────────────────────
// Returns persisted health status for each testable service.
router.get('/health', async (_req: any, res: any) => {
  const client = await pool.connect();
  try {
    const healthKeys: string[] = [];
    for (const svc of TESTABLE_SERVICES) {
      healthKeys.push(
        `integration_${svc}_health_status`,
        `integration_${svc}_health_ts`,
        `integration_${svc}_health_msg`,
      );
    }

    const { rows } = await client.query<{ key: string; value: string }>(
      `SELECT key, value FROM app_settings WHERE key = ANY($1)`,
      [healthKeys],
    );

    const byKey = Object.fromEntries(rows.map(r => [r.key, r.value]));

    // Also check if each service is configured at all (DB or env)
    const configKeys = [
      'integration_gemini_api_key',
      'integration_midtrans_server_key',
    ];
    const { rows: configRows } = await client.query<{ key: string; value: string }>(
      `SELECT key, value FROM app_settings WHERE key = ANY($1)`,
      [configKeys],
    );
    const configByKey = Object.fromEntries(configRows.map(r => [r.key, r.value]));

    const services: Record<string, {
      status: 'ok' | 'error' | 'unconfigured' | 'unknown';
      lastTested: string | null;
      message: string;
      configured: boolean;
    }> = {};

    for (const svc of TESTABLE_SERVICES) {
      const rawStatus = byKey[`integration_${svc}_health_status`] ?? '';
      const ts = byKey[`integration_${svc}_health_ts`] ?? null;
      const msg = byKey[`integration_${svc}_health_msg`] ?? '';

      // Determine if configured (DB or env var)
      let configured = false;
      if (svc === 'gemini') {
        configured = !!(configByKey['integration_gemini_api_key'] || process.env['GEMINI_API_KEY']);
      } else if (svc === 'midtrans') {
        configured = !!(configByKey['integration_midtrans_server_key'] || process.env['MIDTRANS_SERVER_KEY']);
      }

      const status = (['ok', 'error', 'unconfigured'].includes(rawStatus)
        ? rawStatus
        : 'unknown') as 'ok' | 'error' | 'unconfigured' | 'unknown';

      services[svc] = { status, lastTested: ts, message: msg, configured };
    }

    return res.json({ services });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── POST /api/v1/settings/integrations ────────────────────────────────────────
router.post('/', async (req: any, res: any) => {
  try {
    const body: Record<string, string> = req.body ?? {};
    const client = await pool.connect();
    try {
      let saved = 0;
      for (const key of INTEGRATION_KEYS) {
        if (!(key in body)) continue;
        const val: string = body[key] ?? '';
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

// ── POST /api/v1/settings/integrations/test/:service ──────────────────────────
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
      if (!key) {
        await saveHealthStatus(client, 'gemini', 'unconfigured', 'API key belum dikonfigurasi');
        return res.status(400).json({ ok: false, error: 'API key belum dikonfigurasi' });
      }
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
        const msg = d?.error?.message || `HTTP ${r.status}`;
        await saveHealthStatus(client, 'gemini', 'error', msg);
        return res.status(400).json({ ok: false, error: msg });
      }
      await saveHealthStatus(client, 'gemini', 'ok', 'Gemini AI terhubung');
      return res.json({ ok: true, message: 'Gemini AI terhubung' });
    }

    if (service === 'midtrans') {
      const serverKey = await getKey('integration_midtrans_server_key') || process.env['MIDTRANS_SERVER_KEY'] || '';
      const modeRow = await getKey('integration_midtrans_mode');
      const mode = modeRow || 'sandbox';
      if (!serverKey) {
        await saveHealthStatus(client, 'midtrans', 'unconfigured', 'Server key belum dikonfigurasi');
        return res.status(400).json({ ok: false, error: 'Server key belum dikonfigurasi' });
      }
      const baseUrl = mode === 'production'
        ? 'https://api.midtrans.com/v2/charge'
        : 'https://api.sandbox.midtrans.com/v2/charge';
      const r = await fetch(baseUrl, {
        method: 'OPTIONS',
        headers: { Authorization: `Basic ${Buffer.from(serverKey + ':').toString('base64')}` },
      });
      const ok = r.status < 500;
      const msg = `Midtrans ${mode} ${ok ? 'terhubung' : 'error'} (HTTP ${r.status})`;
      await saveHealthStatus(client, 'midtrans', ok ? 'ok' : 'error', msg);
      return res.json({ ok, message: msg });
    }

    return res.status(400).json({ ok: false, error: 'Service tidak dikenal: ' + service });
  } catch (e: any) {
    // Try to save error state
    if (TESTABLE_SERVICES.includes(service as TestableService)) {
      await saveHealthStatus(client, service as TestableService, 'error', e.message).catch(() => {});
    }
    return res.status(500).json({ ok: false, error: e.message });
  } finally {
    client.release();
  }
});

export default router;
