import { Router } from 'express';
import { pool } from '../../lib/db.js';
import { runIntegrationHealthCheck } from '../../lib/integrationHealthCheck.js';
import { getAlerts } from '../../lib/integrationHealthCheck.js';

const router = Router();

// ── GET /api/v1/system/health ──────────────────────────────────────────────────
// Returns current health status, last-run info, and alert queue for the dashboard.
router.get('/health', async (_req: any, res: any) => {
  const client = await pool.connect();
  try {
    const SERVICES = ['gemini', 'midtrans'];
    const keys: string[] = [];
    for (const svc of SERVICES) {
      keys.push(
        `integration_${svc}_health_status`,
        `integration_${svc}_health_ts`,
        `integration_${svc}_health_msg`,
      );
    }

    const { rows } = await client.query<{ key: string; value: string; updated_at: string }>(
      `SELECT key, value, updated_at FROM app_settings WHERE key = ANY($1)`,
      [keys],
    );
    const byKey = Object.fromEntries(rows.map(r => [r.key, { value: r.value, updatedAt: r.updated_at }]));

    const services: Record<string, {
      status: string; lastTested: string | null; message: string; configured: boolean;
    }> = {};

    // Check configured
    const configKeys = ['integration_gemini_api_key', 'integration_midtrans_server_key'];
    const { rows: cfgRows } = await client.query<{ key: string; value: string }>(
      `SELECT key, value FROM app_settings WHERE key = ANY($1)`,
      [configKeys],
    );
    const cfgByKey = Object.fromEntries(cfgRows.map(r => [r.key, r.value]));

    for (const svc of SERVICES) {
      const statusEntry = byKey[`integration_${svc}_health_status`];
      services[svc] = {
        status: statusEntry?.value || 'unknown',
        lastTested: statusEntry?.updatedAt || byKey[`integration_${svc}_health_ts`]?.value || null,
        message: byKey[`integration_${svc}_health_msg`]?.value || '',
        configured: svc === 'gemini'
          ? !!(cfgByKey['integration_gemini_api_key'] || process.env['GEMINI_API_KEY'])
          : !!(cfgByKey['integration_midtrans_server_key'] || process.env['MIDTRANS_SERVER_KEY']),
      };
    }

    const alerts = await getAlerts(pool);

    // Cron schedule info (static, matches cron.ts registration)
    const cronJobs = [
      { name: 'Cicilan & Payment Deadline', schedule: '0 1 * * *', description: 'Setiap hari 08:00 WIB' },
      { name: 'H-7 Departure Reminder', schedule: '0 0 * * *', description: 'Setiap hari 07:00 WIB' },
      { name: 'H-1 Departure Reminder', schedule: '0 23 * * *', description: 'Setiap hari 06:00 WIB' },
      { name: 'Integration Health Check', schedule: '0 * * * *', description: 'Setiap jam tepat' },
    ];

    return res.json({ services, alerts, cronJobs });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  } finally {
    client.release();
  }
});

// ── POST /api/v1/system/health-check/run ──────────────────────────────────────
// Manually trigger the integration health check (same as hourly cron job).
router.post('/health-check/run', async (_req: any, res: any) => {
  try {
    const started = Date.now();
    await runIntegrationHealthCheck(pool);
    const elapsed = Date.now() - started;

    // Return updated statuses
    const client = await pool.connect();
    let services: Record<string, { status: string; lastTested: string | null; message: string }> = {};
    try {
      const SERVICES = ['gemini', 'midtrans'];
      const keys = SERVICES.flatMap(s => [
        `integration_${s}_health_status`,
        `integration_${s}_health_ts`,
        `integration_${s}_health_msg`,
      ]);
      const { rows } = await client.query<{ key: string; value: string }>(
        `SELECT key, value FROM app_settings WHERE key = ANY($1)`,
        [keys],
      );
      const byKey = Object.fromEntries(rows.map(r => [r.key, r.value]));
      for (const svc of SERVICES) {
        services[svc] = {
          status: byKey[`integration_${svc}_health_status`] || 'unknown',
          lastTested: byKey[`integration_${svc}_health_ts`] || null,
          message: byKey[`integration_${svc}_health_msg`] || '',
        };
      }
    } finally {
      client.release();
    }

    return res.json({ ok: true, elapsed, services });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
