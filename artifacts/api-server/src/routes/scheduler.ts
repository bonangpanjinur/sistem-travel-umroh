import { Router } from 'express';
import { logger } from '../lib/logger.js';

const router = Router();

const API_BASE = `http://localhost:${process.env['PORT'] || '8080'}`;

async function triggerJob(type: string): Promise<{ ok: boolean; result?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/reminders/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type }),
    });
    const data = await res.json() as any;
    return { ok: true, result: data };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

async function triggerDeparture(days: 7 | 1): Promise<{ ok: boolean; result?: any; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/api/reminders/trigger-departure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days }),
    });
    const data = await res.json() as any;
    return { ok: true, result: data };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

// POST /api/scheduler/run — trigger cron job secara manual
// Body: { job: 'cicilan' | 'payment' | 'departure_h7' | 'departure_h1' | 'all' }
router.post('/run', async (req, res) => {
  const { job = 'all' } = req.body as { job?: string };
  const results: Record<string, any> = {};

  try {
    logger.info({ job }, 'Manual scheduler trigger');

    if (job === 'cicilan' || job === 'all') {
      results['cicilan'] = await triggerJob('cicilan');
    }
    if (job === 'payment' || job === 'all') {
      results['payment'] = await triggerJob('payment');
    }
    if (job === 'departure_h7' || job === 'all') {
      results['departure_h7'] = await triggerDeparture(7);
    }
    if (job === 'departure_h1' || job === 'all') {
      results['departure_h1'] = await triggerDeparture(1);
    }

    const allOk = Object.values(results).every((r: any) => r.ok);
    res.json({
      success: allOk,
      job,
      results,
      triggered_at: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/scheduler/status — info cron jobs yang terdaftar
router.get('/status', (_req, res) => {
  res.json({
    success: true,
    jobs: [
      { name: 'cicilan', schedule: '0 1 * * *', description: 'Reminder cicilan — setiap hari 08:00 WIB' },
      { name: 'payment', schedule: '0 1 * * *', description: 'Reminder payment deadline — setiap hari 08:00 WIB' },
      { name: 'departure_h7', schedule: '0 0 * * *', description: 'WA blast H-7 keberangkatan — 07:00 WIB' },
      { name: 'departure_h1', schedule: '0 23 * * *', description: 'WA blast H-1 keberangkatan — 06:00 WIB' },
    ],
    note: 'POST /api/scheduler/run?job=cicilan|payment|departure_h7|departure_h1|all untuk trigger manual',
  });
});

export default router;
