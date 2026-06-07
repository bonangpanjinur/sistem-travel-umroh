/**
 * Integration health check — called by the hourly cron job.
 *
 * Flow per service:
 *  1. Read previous status from app_settings
 *  2. Run live connectivity test (same logic as /test/:service)
 *  3. Persist new status + timestamp + message
 *  4. If status degraded (ok → error), push an alert into the alert queue
 */

import { Pool } from 'pg';
import { logger } from './logger.js';

const SERVICES = ['gemini', 'midtrans'] as const;
type Service = (typeof SERVICES)[number];

const SERVICE_LABELS: Record<Service, string> = {
  gemini: 'Google Gemini AI',
  midtrans: 'Midtrans Payment Gateway',
};

// ── DB helpers ────────────────────────────────────────────────────────────────

async function getSetting(client: any, key: string): Promise<string> {
  const { rows } = await client.query(
    `SELECT value FROM app_settings WHERE key = $1`,
    [key],
  );
  return rows[0]?.value ?? '';
}

async function upsertSetting(client: any, key: string, value: string) {
  await client.query(
    `INSERT INTO app_settings (key, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
    [key, value],
  );
}

// ── Alert queue ───────────────────────────────────────────────────────────────

export interface IntegrationAlert {
  id: string;
  service: string;
  title: string;
  message: string;
  ts: string;
}

async function readAlertQueue(client: any): Promise<IntegrationAlert[]> {
  const raw = await getSetting(client, 'integration_health_alert_queue');
  if (!raw) return [];
  try {
    return JSON.parse(raw) as IntegrationAlert[];
  } catch {
    return [];
  }
}

async function writeAlertQueue(client: any, queue: IntegrationAlert[]) {
  await upsertSetting(client, 'integration_health_alert_queue', JSON.stringify(queue));
}

async function pushAlert(client: any, alert: Omit<IntegrationAlert, 'id'>) {
  const queue = await readAlertQueue(client);
  const newAlert: IntegrationAlert = { ...alert, id: Math.random().toString(36).slice(2) };
  // Keep last 20 alerts max
  const updated = [newAlert, ...queue].slice(0, 20);
  await writeAlertQueue(client, updated);
  logger.warn(
    { service: alert.service, message: alert.message },
    `Integration health alert: ${alert.title}`,
  );
}

// ── Public API: read / acknowledge alerts ──────────────────────────────────────

export async function getAlerts(pool: Pool): Promise<IntegrationAlert[]> {
  const client = await pool.connect();
  try {
    return await readAlertQueue(client);
  } finally {
    client.release();
  }
}

export async function ackAlerts(pool: Pool, ids: string[]): Promise<void> {
  const client = await pool.connect();
  try {
    const queue = await readAlertQueue(client);
    const remaining = ids.length === 0
      ? []                                          // ack all
      : queue.filter(a => !ids.includes(a.id));     // ack specific ids
    await writeAlertQueue(client, remaining);
  } finally {
    client.release();
  }
}

// ── Connectivity checks ───────────────────────────────────────────────────────

type HealthResult = { status: 'ok' | 'error' | 'unconfigured'; message: string };

async function checkGemini(client: any): Promise<HealthResult> {
  const dbKey = await getSetting(client, 'integration_gemini_api_key');
  const key = dbKey || process.env['GEMINI_API_KEY'] || '';
  if (!key) return { status: 'unconfigured', message: 'API key belum dikonfigurasi' };

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 10_000);
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'ping' }] }] }),
        signal: ctrl.signal,
      },
    );
    clearTimeout(timeout);
    if (!r.ok) {
      const d: any = await r.json().catch(() => ({}));
      return { status: 'error', message: d?.error?.message || `HTTP ${r.status}` };
    }
    return { status: 'ok', message: 'Gemini AI terhubung' };
  } catch (e: any) {
    return { status: 'error', message: e.name === 'AbortError' ? 'Timeout (10s)' : e.message };
  }
}

async function checkMidtrans(client: any): Promise<HealthResult> {
  const serverKey =
    (await getSetting(client, 'integration_midtrans_server_key')) ||
    process.env['MIDTRANS_SERVER_KEY'] ||
    '';
  if (!serverKey) return { status: 'unconfigured', message: 'Server key belum dikonfigurasi' };

  const mode = (await getSetting(client, 'integration_midtrans_mode')) || 'sandbox';
  const baseUrl =
    mode === 'production'
      ? 'https://api.midtrans.com/v2/charge'
      : 'https://api.sandbox.midtrans.com/v2/charge';

  try {
    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), 10_000);
    const r = await fetch(baseUrl, {
      method: 'OPTIONS',
      headers: { Authorization: `Basic ${Buffer.from(serverKey + ':').toString('base64')}` },
      signal: ctrl.signal,
    });
    clearTimeout(timeout);
    const ok = r.status < 500;
    return {
      status: ok ? 'ok' : 'error',
      message: `Midtrans ${mode} ${ok ? 'terhubung' : 'error'} (HTTP ${r.status})`,
    };
  } catch (e: any) {
    return { status: 'error', message: e.name === 'AbortError' ? 'Timeout (10s)' : e.message };
  }
}

const CHECKERS: Record<Service, (client: any) => Promise<HealthResult>> = {
  gemini: checkGemini,
  midtrans: checkMidtrans,
};

// ── Main export ───────────────────────────────────────────────────────────────

export async function runIntegrationHealthCheck(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    for (const service of SERVICES) {
      const prevStatus = await getSetting(client, `integration_${service}_health_status`);

      let result: HealthResult;
      try {
        result = await CHECKERS[service](client);
      } catch (e: any) {
        result = { status: 'error', message: e.message };
      }

      // Persist new status
      const ts = new Date().toISOString();
      await upsertSetting(client, `integration_${service}_health_status`, result.status);
      await upsertSetting(client, `integration_${service}_health_ts`, ts);
      await upsertSetting(client, `integration_${service}_health_msg`, result.message);

      logger.info(
        { service, prev: prevStatus, now: result.status, msg: result.message },
        'Integration health check complete',
      );

      // Alert only on degradation: ok → error
      if (prevStatus === 'ok' && result.status === 'error') {
        const label = SERVICE_LABELS[service];
        await pushAlert(client, {
          service,
          title: `Integrasi Error: ${label}`,
          message: `Koneksi ${label} GAGAL — ${result.message}. Periksa konfigurasi API key di Pengaturan Integrasi.`,
          ts,
        });
      }
    }
  } finally {
    client.release();
  }
}
