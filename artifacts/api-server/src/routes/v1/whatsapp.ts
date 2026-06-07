import { Router } from 'express';
import { db, pool } from '../../lib/db.js';
import { waTemplates, waSendLogs, appSettings } from '@workspace/db/schema';
import { eq, sql, and, or, desc } from 'drizzle-orm';

const router = Router();

// ─── whatsapp_config helper (direct DB) ──────────────────────────────────

// ─── Provider config type ────────────────────────────────────────────────
interface WAProviderConfig {
  provider: string;
  api_key: string | null;
  sender_number: string | null;
  is_active: boolean;
  provider_config: Record<string, any>;
  display_name: string | null;
}

// ─── Load active config from DB ───────────────────────────────────────────
async function loadActiveConfig(): Promise<WAProviderConfig | null> {
  try {
    const { rows } = await pool.query(`
      SELECT provider, api_key, sender_number, is_active, provider_config, display_name
      FROM whatsapp_config
      WHERE is_active = true
      ORDER BY updated_at DESC
      LIMIT 1
    `);
    return (rows[0] as WAProviderConfig) ?? null;
  } catch {
    return null;
  }
}

// ─── Phone normaliser ────────────────────────────────────────────────────
function normalisePhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('0')) return '62' + d.slice(1);
  if (!d.startsWith('62')) return '62' + d;
  return d;
}

// ─── Provider adapters ───────────────────────────────────────────────────
type SendResult = { success: boolean; messageId?: string; error?: string };

async function sendFonnte(cfg: WAProviderConfig, phone: string, message: string): Promise<SendResult> {
  const token = cfg.api_key || (cfg.provider_config['api_token'] as string) || process.env['FONNTE_TOKEN'];
  if (!token) return { success: false, error: 'Token Fonnte belum dikonfigurasi' };
  const form = new FormData();
  form.append('target', normalisePhone(phone));
  form.append('message', message);
  form.append('countryCode', '62');
  form.append('typing', 'true');
  try {
    const resp = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: token },
      body: form,
    });
    const data = (await resp.json()) as any;
    if (!resp.ok || data.status === false) return { success: false, error: data.reason || data.message || 'Fonnte error' };
    return { success: true, messageId: data.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function sendWablas(cfg: WAProviderConfig, phone: string, message: string): Promise<SendResult> {
  const token = cfg.api_key || (cfg.provider_config['api_token'] as string);
  const domain = (cfg.provider_config['domain'] as string) || 'solo.wablas.com';
  if (!token) return { success: false, error: 'Token Wablas belum dikonfigurasi' };
  try {
    const resp = await fetch(`https://${domain}/api/send-message`, {
      method: 'POST',
      headers: { Authorization: token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: normalisePhone(phone), message, isGroup: false }),
    });
    const data = (await resp.json()) as any;
    if (!resp.ok || data.status === false) return { success: false, error: data.message || 'Wablas error' };
    return { success: true, messageId: data.data?.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function sendWatzap(cfg: WAProviderConfig, phone: string, message: string): Promise<SendResult> {
  const apiKey   = cfg.api_key || (cfg.provider_config['api_key'] as string);
  const phoneId  = cfg.provider_config['phone_no_id'] as string;
  if (!apiKey || !phoneId) return { success: false, error: 'API key atau Phone Number ID Watzap belum dikonfigurasi' };
  try {
    const resp = await fetch('https://api.watzap.id/v1/send_message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey, phone_no_id: phoneId, number: normalisePhone(phone), message }),
    });
    const data = (await resp.json()) as any;
    if (!resp.ok || data.status !== 200) return { success: false, error: data.message || 'Watzap error' };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function sendUltraMsg(cfg: WAProviderConfig, phone: string, message: string): Promise<SendResult> {
  const token      = cfg.api_key || (cfg.provider_config['token'] as string);
  const instanceId = cfg.provider_config['instance_id'] as string;
  if (!token || !instanceId) return { success: false, error: 'Instance ID atau Token UltraMsg belum dikonfigurasi' };
  try {
    const resp = await fetch(`https://api.ultramsg.com/${instanceId}/messages/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token, to: '+' + normalisePhone(phone), body: message }),
    });
    const data = (await resp.json()) as any;
    if (!resp.ok || data.error) return { success: false, error: data.error || 'UltraMsg error' };
    return { success: true, messageId: data.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function sendMetaCloud(cfg: WAProviderConfig, phone: string, message: string): Promise<SendResult> {
  const token   = cfg.api_key || (cfg.provider_config['access_token'] as string);
  const phoneId = cfg.provider_config['phone_number_id'] as string;
  const version = (cfg.provider_config['api_version'] as string) || 'v19.0';
  if (!token || !phoneId) return { success: false, error: 'Access Token atau Phone Number ID Meta belum dikonfigurasi' };
  try {
    const resp = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalisePhone(phone),
        type: 'text',
        text: { preview_url: false, body: message },
      }),
    });
    const data = (await resp.json()) as any;
    if (!resp.ok || data.error) return { success: false, error: data.error?.message || 'Meta Cloud API error' };
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Meta WABA Interactive List Message (up to 10 items) ─────────────────────
interface MetaMenuRow { id: string; title: string; description?: string }
async function sendMetaInteractiveList(
  cfg: WAProviderConfig,
  phone: string,
  opts: {
    bodyText: string;
    footerText?: string;
    buttonText: string;
    sectionTitle: string;
    rows: MetaMenuRow[];
  },
): Promise<SendResult> {
  const token   = cfg.api_key || (cfg.provider_config['access_token'] as string);
  const phoneId = cfg.provider_config['phone_number_id'] as string;
  const version = (cfg.provider_config['api_version'] as string) || 'v19.0';
  if (!token || !phoneId) return { success: false, error: 'Access Token atau Phone Number ID Meta belum dikonfigurasi' };
  const payload: Record<string, any> = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: normalisePhone(phone),
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: opts.bodyText.slice(0, 1024) },
      action: {
        button: opts.buttonText.slice(0, 20),
        sections: [{
          title: opts.sectionTitle.slice(0, 24),
          rows: opts.rows.slice(0, 10).map(r => ({
            id: r.id.slice(0, 200),
            title: r.title.slice(0, 24),
            ...(r.description ? { description: r.description.slice(0, 72) } : {}),
          })),
        }],
      },
    },
  };
  if (opts.footerText) {
    payload['interactive']['footer'] = { text: opts.footerText.slice(0, 60) };
  }
  try {
    const resp = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await resp.json()) as any;
    if (!resp.ok || data.error) return { success: false, error: data.error?.message || 'Meta interactive list error' };
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Meta WABA Interactive Button Message (up to 3 buttons) ──────────────────
async function sendMetaInteractiveButtons(
  cfg: WAProviderConfig,
  phone: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
): Promise<SendResult> {
  const token   = cfg.api_key || (cfg.provider_config['access_token'] as string);
  const phoneId = cfg.provider_config['phone_number_id'] as string;
  const version = (cfg.provider_config['api_version'] as string) || 'v19.0';
  if (!token || !phoneId) return { success: false, error: 'Access Token atau Phone Number ID Meta belum dikonfigurasi' };
  try {
    const resp = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalisePhone(phone),
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText.slice(0, 1024) },
          action: {
            buttons: buttons.slice(0, 3).map(b => ({
              type: 'reply',
              reply: { id: b.id.slice(0, 256), title: b.title.slice(0, 20) },
            })),
          },
        },
      }),
    });
    const data = (await resp.json()) as any;
    if (!resp.ok || data.error) return { success: false, error: data.error?.message || 'Meta interactive buttons error' };
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

async function sendCustom(cfg: WAProviderConfig, phone: string, message: string): Promise<SendResult> {
  const endpoint   = cfg.provider_config['endpoint_url'] as string;
  const authHeader = cfg.api_key || (cfg.provider_config['auth_header'] as string);
  const bodyTpl    = (cfg.provider_config['body_template'] as string)
    || '{"target":"{phone}","message":"{message}"}';
  if (!endpoint) return { success: false, error: 'Endpoint URL Custom belum dikonfigurasi' };
  const body = bodyTpl
    .replace(/\{phone\}/g, normalisePhone(phone))
    .replace(/\{message\}/g, message.replace(/"/g, '\\"'));
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authHeader) headers['Authorization'] = authHeader;
  try {
    const resp = await fetch(endpoint, { method: 'POST', headers, body });
    if (!resp.ok) return { success: false, error: `HTTP ${resp.status} dari endpoint custom` };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── Main dispatch ────────────────────────────────────────────────────────
async function dispatchSend(cfg: WAProviderConfig, phone: string, message: string): Promise<SendResult> {
  switch (cfg.provider) {
    case 'fonnte':    return sendFonnte(cfg, phone, message);
    case 'wablas':    return sendWablas(cfg, phone, message);
    case 'watzap':    return sendWatzap(cfg, phone, message);
    case 'ultramsg':  return sendUltraMsg(cfg, phone, message);
    case 'meta':      return sendMetaCloud(cfg, phone, message);
    case 'custom':    return sendCustom(cfg, phone, message);
    default:          return { success: false, error: `Provider "${cfg.provider}" tidak dikenal` };
  }
}

// ─── Fallback to env-var Fonnte config ───────────────────────────────────
function envFonnteConfig(): WAProviderConfig | null {
  const token = process.env['FONNTE_TOKEN'];
  if (!token) return null;
  return { provider: 'fonnte', api_key: token, sender_number: null, is_active: true, provider_config: {}, display_name: 'Fonnte (env)' };
}

async function getActiveConfig(): Promise<WAProviderConfig | null> {
  const dbCfg = await loadActiveConfig().catch(() => null);
  return dbCfg ?? envFonnteConfig();
}

// ═══════════════════════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════════════════════

// ─── GET /api/v1/whatsapp/status ──────────────────────────────────────────
router.get('/status', async (_req, res) => {
  const cfg = await getActiveConfig();
  if (!cfg) {
    res.json({ configured: false, active: false, provider: null, device: null });
    return;
  }
  if (cfg.provider === 'fonnte') {
    try {
      const token = cfg.api_key || process.env['FONNTE_TOKEN'];
      const resp = await fetch('https://api.fonnte.com/device', {
        method: 'POST',
        headers: { Authorization: token! },
        body: new FormData(),
      });
      const data = (await resp.json()) as any;
      res.json({ configured: true, active: data.status === 'connect', provider: cfg.provider, device: data });
      return;
    } catch {
      res.json({ configured: true, active: false, provider: cfg.provider, device: null });
      return;
    }
  }
  res.json({ configured: true, active: cfg.is_active, provider: cfg.provider, device: null });
});

// ─── GET /api/v1/whatsapp/provider ────────────────────────────────────────
// Returns safe config (no raw api_key) for the admin UI
router.get('/provider', async (_req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, provider, display_name, sender_number, is_active, provider_config, updated_at
      FROM whatsapp_config
      ORDER BY updated_at DESC
    `);
    const envFonnte = envFonnteConfig();
    res.json({
      configs: rows.map(r => ({ ...r, api_key: '••••••••' })),
      env_fonnte_configured: !!envFonnte,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/v1/whatsapp/provider ───────────────────────────────────────
// Saves (upsert) provider config. api_key is saved to DB server-side only.
router.post('/provider', async (req, res) => {
  const {
    id,
    provider,
    display_name,
    api_key,
    sender_number,
    is_active,
    provider_config,
  } = req.body as {
    id?: string;
    provider: string;
    display_name?: string;
    api_key?: string;
    sender_number?: string;
    is_active?: boolean;
    provider_config?: Record<string, any>;
  };

  if (!provider) {
    res.status(400).json({ error: 'provider wajib diisi' });
    return;
  }

  const includeApiKey = api_key && !api_key.startsWith('••');

  try {
    let newId: string;
    if (id) {
      const setClauses = [
        `provider = $1`,
        `display_name = $2`,
        `sender_number = $3`,
        `is_active = $4`,
        `provider_config = $5`,
        `updated_at = NOW()`,
      ];
      const vals: any[] = [provider, display_name || null, sender_number || null, is_active ?? false, JSON.stringify(provider_config || {})];
      if (includeApiKey) { setClauses.push(`api_key = $${vals.length + 1}`); vals.push(api_key); }
      vals.push(id);
      const { rows } = await pool.query(
        `UPDATE whatsapp_config SET ${setClauses.join(', ')} WHERE id = $${vals.length} RETURNING id`,
        vals,
      );
      newId = rows[0]?.id ?? id;
    } else {
      const cols = ['provider', 'display_name', 'sender_number', 'is_active', 'provider_config', 'updated_at'];
      const vals: any[] = [provider, display_name || null, sender_number || null, is_active ?? false, JSON.stringify(provider_config || {}), new Date()];
      if (includeApiKey) { cols.push('api_key'); vals.push(api_key); }
      const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
      const { rows } = await pool.query(
        `INSERT INTO whatsapp_config (${cols.join(', ')}) VALUES (${placeholders}) RETURNING id`,
        vals,
      );
      newId = rows[0]?.id;
    }

    // If set as active, deactivate all others
    if (is_active && newId) {
      await pool.query(`UPDATE whatsapp_config SET is_active = false WHERE id != $1`, [newId]);
    }

    res.json({ success: true, id: newId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── DELETE /api/v1/whatsapp/provider/:id ────────────────────────────────
router.delete('/provider/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM whatsapp_config WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── Non-destructive provider test ───────────────────────────────────────
type TestResult = { success: boolean; message?: string; error?: string; device?: any };

async function testProvider(cfg: WAProviderConfig): Promise<TestResult> {
  const { provider } = cfg;

  // ── Fonnte: check device status (no message sent) ──
  if (provider === 'fonnte') {
    const token = cfg.api_key || process.env['FONNTE_TOKEN'];
    if (!token) return { success: false, error: 'Token Fonnte belum dikonfigurasi' };
    try {
      const resp = await fetch('https://api.fonnte.com/device', {
        method: 'POST',
        headers: { Authorization: token },
        body: new FormData(),
      });
      const data = (await resp.json()) as any;
      const ok = data.status === 'connect';
      return {
        success: ok,
        device: data,
        message: ok ? `Terhubung — ${data.name || data.device || 'OK'}` : undefined,
        error:   !ok ? (data.reason || data.message || 'Device tidak terhubung') : undefined,
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  // ── Meta: validate token via Graph API (no message sent) ──
  if (provider === 'meta') {
    const token   = cfg.api_key;
    const phoneId = cfg.provider_config['phone_number_id'] as string;
    const version = (cfg.provider_config['api_version'] as string) || 'v19.0';
    if (!token)   return { success: false, error: 'Access Token Meta belum dikonfigurasi' };
    if (!phoneId) return { success: false, error: 'Phone Number ID Meta belum dikonfigurasi' };
    try {
      const resp = await fetch(
        `https://graph.facebook.com/${version}/${phoneId}?fields=display_phone_number,verified_name,quality_rating&access_token=${token}`,
      );
      const data = (await resp.json()) as any;
      if (data.error) return { success: false, error: data.error.message || 'Token Meta tidak valid' };
      const label = [data.display_phone_number, data.verified_name].filter(Boolean).join(' · ');
      return { success: true, message: `Terhubung — ${label || phoneId}`, device: data };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  // ── UltraMsg: check instance status (no message sent) ──
  if (provider === 'ultramsg') {
    const token      = cfg.api_key;
    const instanceId = cfg.provider_config['instance_id'] as string;
    if (!token || !instanceId) return { success: false, error: 'Instance ID atau Token UltraMsg belum dikonfigurasi' };
    try {
      const resp = await fetch(`https://api.ultramsg.com/${instanceId}/instance/status?token=${token}`);
      const data = (await resp.json()) as any;
      if (data.error) return { success: false, error: data.error };
      const connected = data.status?.accountStatus?.status === 'authenticated';
      return {
        success: connected,
        device: data,
        message: connected ? `Terhubung — ${data.status?.accountInfo?.pushname || 'OK'}` : undefined,
        error:   !connected ? (data.status?.accountStatus?.substatus || 'Instance tidak terhubung') : undefined,
      };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  // ── Wablas: check device info (no message sent) ──
  if (provider === 'wablas') {
    const token  = cfg.api_key;
    const domain = (cfg.provider_config['domain'] as string) || 'solo.wablas.com';
    if (!token) return { success: false, error: 'Token Wablas belum dikonfigurasi' };
    try {
      const resp = await fetch(`https://${domain}/api/device/info`, { headers: { Authorization: token } });
      const data = (await resp.json()) as any;
      if (!resp.ok || data.status === false) return { success: false, error: data.message || 'Koneksi Wablas gagal' };
      return { success: true, message: `Terhubung — ${data.data?.name || data.data?.device || 'OK'}`, device: data.data };
    } catch (e: any) { return { success: false, error: e.message }; }
  }

  // ── Custom: check endpoint reachability (no message sent) ──
  if (provider === 'custom') {
    const endpoint = cfg.provider_config['endpoint_url'] as string;
    if (!endpoint) return { success: false, error: 'Endpoint URL Custom belum dikonfigurasi' };
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6000);
      const resp = await fetch(endpoint, { method: 'HEAD', signal: controller.signal }).catch(() =>
        fetch(endpoint, { method: 'OPTIONS', signal: controller.signal }),
      );
      clearTimeout(t);
      const ok = resp.status < 500;
      return { success: ok, message: ok ? `Endpoint terjangkau (HTTP ${resp.status})` : undefined, error: !ok ? `HTTP ${resp.status}` : undefined };
    } catch (e: any) { return { success: false, error: `Endpoint tidak dapat dijangkau: ${e.message}` }; }
  }

  // ── Watzap / other: send actual test message (no status API available) ──
  const result = await dispatchSend(cfg, cfg.sender_number || '6281234567890', '[Test] Koneksi WA dari Vinstour Travel 🚀');
  return { success: result.success, error: result.error };
}

// ─── POST /api/v1/whatsapp/provider/test ────────────────────────────────
// Test connection with provided credentials (not saved to DB)
router.post('/provider/test', async (req, res) => {
  const { provider, api_key, sender_number, provider_config = {} } = req.body as {
    provider: string;
    api_key?: string;
    sender_number?: string;
    provider_config?: Record<string, any>;
  };
  if (!provider) { res.status(400).json({ success: false, error: 'provider wajib diisi' }); return; }
  const cfg: WAProviderConfig = {
    provider,
    api_key: (api_key && !api_key.startsWith('••')) ? api_key : null,
    sender_number: sender_number || null,
    is_active: true,
    provider_config,
    display_name: null,
  };
  // For Fonnte with env fallback
  if (provider === 'fonnte' && !cfg.api_key) cfg.api_key = process.env['FONNTE_TOKEN'] || null;
  const result = await testProvider(cfg);
  res.json(result);
});

// ─── POST /api/v1/whatsapp/provider/:id/test ─────────────────────────────
// Test a saved provider config (loads api_key from DB, updates last_test result)
router.post('/provider/:id/test', async (req, res) => {
  const { id } = req.params;
  try {
    const { rows } = await pool.query(
      `SELECT provider, api_key, sender_number, is_active, provider_config, display_name
       FROM whatsapp_config WHERE id = $1`,
      [id],
    );
    if (!rows[0]) { res.status(404).json({ success: false, error: 'Konfigurasi tidak ditemukan' }); return; }
    const cfg = rows[0] as WAProviderConfig;
    // Fonnte env fallback
    if (cfg.provider === 'fonnte' && !cfg.api_key) cfg.api_key = process.env['FONNTE_TOKEN'] || null;

    const result = await testProvider(cfg);

    // Persist test result
    await pool.query(
      `UPDATE whatsapp_config SET last_tested_at = NOW(), last_test_ok = $1 WHERE id = $2`,
      [result.success, id],
    );

    res.json(result);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ─── GET /api/v1/whatsapp/settings ────────────────────────────────────────
router.get('/settings', async (_req, res) => {
  try {
    const rows = await db.select().from(appSettings).where(or(
      eq(appSettings.key, 'wa_sender_number'),
      eq(appSettings.key, 'wa_is_active'),
    ));
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json({ senderNumber: settings['wa_sender_number'] || '', isActive: settings['wa_is_active'] === 'true' });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/v1/whatsapp/settings ───────────────────────────────────────
router.post('/settings', async (req, res) => {
  const { senderNumber = '', isActive = false } = req.body as { senderNumber?: string; isActive?: boolean };
  try {
    for (const [key, value] of [['wa_sender_number', senderNumber], ['wa_is_active', String(isActive)]] as [string, string][]) {
      const existing = await db.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
      if (existing.length > 0) {
        await db.update(appSettings).set({ value, updatedAt: new Date() }).where(eq(appSettings.key, key));
      } else {
        await db.insert(appSettings).values({ key, value });
      }
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/whatsapp/templates ───────────────────────────────────────
router.get('/templates', async (_req, res) => {
  try {
    const rows = await db.select().from(waTemplates).orderBy(sql`name asc`);
    res.json({ templates: rows.map(r => ({
      id: r.id, code: r.code, name: r.name,
      message_template: r.messageTemplate, variables: r.variables, is_active: r.isActive, created_at: r.createdAt,
    })) });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/v1/whatsapp/templates ──────────────────────────────────────
router.post('/templates', async (req, res) => {
  const { code, name, message_template, variables = [], is_active = true } = req.body as {
    code: string; name: string; message_template: string; variables?: string[]; is_active?: boolean;
  };
  if (!code || !name || !message_template) { res.status(400).json({ error: 'code, name, message_template wajib diisi' }); return; }
  try {
    const [row] = await db.insert(waTemplates).values({ code: code.toUpperCase(), name, messageTemplate: message_template, variables, isActive: is_active }).returning();
    res.json({ success: true, template: { id: row.id, code: row.code, name: row.name } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PUT /api/v1/whatsapp/templates/:id ───────────────────────────────────
router.put('/templates/:id', async (req, res) => {
  const { name, message_template, variables, is_active } = req.body as {
    name?: string; message_template?: string; variables?: string[]; is_active?: boolean;
  };
  try {
    const patch: Partial<typeof waTemplates.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined) patch.name = name;
    if (message_template !== undefined) patch.messageTemplate = message_template;
    if (variables !== undefined) patch.variables = variables;
    if (is_active !== undefined) patch.isActive = is_active;
    await db.update(waTemplates).set(patch).where(eq(waTemplates.id, req.params.id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── DELETE /api/v1/whatsapp/templates/:id ────────────────────────────────
router.delete('/templates/:id', async (req, res) => {
  try {
    await db.delete(waTemplates).where(eq(waTemplates.id, req.params.id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/v1/whatsapp/send ───────────────────────────────────────────
router.post('/send', async (req, res) => {
  const cfg = await getActiveConfig();
  if (!cfg) {
    res.status(503).json({ success: false, error: 'Tidak ada provider WA yang aktif. Konfigurasi di panel Admin → Integrasi WA.' });
    return;
  }
  const { phone, message, recipientName, templateCode } = req.body as {
    phone: string; message: string; recipientName?: string; templateCode?: string;
  };
  if (!phone || !message) { res.status(400).json({ success: false, error: 'phone dan message wajib diisi' }); return; }

  const result = await dispatchSend(cfg, phone, message);
  const now = new Date();
  try {
    await db.insert(waSendLogs).values({
      recipientPhone: normalisePhone(phone),
      recipientName: recipientName || null,
      messageContent: message,
      status: result.success ? 'sent' : 'failed',
      errorMessage: result.error || null,
      sentAt: result.success ? now : null,
      templateCode: templateCode || null,
      messageId: result.messageId || null,
    });
  } catch { /* non-critical */ }

  if (result.success) {
    res.json({ success: true, messageId: result.messageId });
  } else {
    res.status(502).json({ success: false, error: result.error });
  }
});

// ─── POST /api/v1/whatsapp/send-bulk ──────────────────────────────────────
router.post('/send-bulk', async (req, res) => {
  const cfg = await getActiveConfig();
  if (!cfg) {
    res.status(503).json({ success: false, error: 'Tidak ada provider WA yang aktif.' });
    return;
  }
  const { recipients = [], templateCode = 'CUSTOM', departureId } = req.body as {
    recipients: Array<{ phone: string; message: string; name?: string }>;
    templateCode?: string;
    departureId?: string;
  };
  if (!recipients.length) { res.json({ success: true, sent: 0, failed: 0, results: [] }); return; }

  const results: Array<{ phone: string; name?: string; status: string; errorMessage?: string; messageId?: string }> = [];

  for (let i = 0; i < recipients.length; i++) {
    const { phone, message, name } = recipients[i];
    const r = await dispatchSend(cfg, phone, message);
    results.push({ phone, name, status: r.success ? 'sent' : 'failed', errorMessage: r.error, messageId: r.messageId });
    if (i < recipients.length - 1) await new Promise(resolve => setTimeout(resolve, 1200));
  }

  try {
    const now = new Date();
    await db.insert(waSendLogs).values(
      results.map(r => ({
        recipientPhone: normalisePhone(r.phone),
        recipientName: r.name || null,
        messageContent: recipients.find(rec => rec.phone === r.phone)?.message || '',
        status: r.status,
        errorMessage: r.errorMessage || null,
        sentAt: r.status === 'sent' ? now : null,
        templateCode,
        departureId: departureId || null,
        messageId: r.messageId || null,
      })),
    );
  } catch { /* non-critical */ }

  const sent = results.filter(r => r.status === 'sent').length;
  const failed = results.filter(r => r.status === 'failed').length;
  res.json({ success: true, sent, failed, total: recipients.length, results });
});

// ─── GET /api/v1/whatsapp/logs ────────────────────────────────────────────
router.get('/logs', async (req, res) => {
  const page     = Math.max(0, parseInt(String(req.query.page   || '0')));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '50'))));
  const search   = String(req.query.search || '').trim();
  const status   = String(req.query.status || '').trim();
  const template = String(req.query.template || '').trim();

  try {
    const conditions = [];
    if (search) {
      conditions.push(or(
        sql`recipient_phone ilike ${'%' + search + '%'}`,
        sql`recipient_name ilike ${'%' + search + '%'}`,
        sql`message_content ilike ${'%' + search + '%'}`,
      )!);
    }
    if (status && status !== 'all') conditions.push(eq(waSendLogs.status, status));
    if (template && template !== 'all') conditions.push(eq(waSendLogs.templateCode, template));
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(waSendLogs).where(where),
      db.select().from(waSendLogs).where(where).orderBy(desc(waSendLogs.createdAt)).limit(pageSize).offset(page * pageSize),
    ]);

    res.json({
      total: countRow[0]?.count ?? 0,
      page, pageSize,
      logs: rows.map(r => ({
        id: r.id,
        recipient_phone: r.recipientPhone,
        recipient_name: r.recipientName,
        message_content: r.messageContent,
        status: r.status,
        error_message: r.errorMessage,
        sent_at: r.sentAt,
        template_code: r.templateCode,
        departure_id: r.departureId,
        message_id: r.messageId,
        created_at: r.createdAt,
      })),
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});


// ═══════════════════════════════════════════════════════════════════════════
//  WEBHOOK — delivery receipts + incoming messages + chatbot auto-reply
// ═══════════════════════════════════════════════════════════════════════════

// ─── POST /api/v1/whatsapp/webhook ───────────────────────────────────────────
// Receives events from WA providers (Fonnte, Wablas, etc.)
router.post('/webhook', async (req, res) => {
  const body = req.body as any;
  // ── Delivery receipt (status update) ──────────────────────────────────────
  // Fonnte sends: { id, phone, status } where status = 'sent'|'delivered'|'read'
  const msgId  = body.id || body.message_id || body.messageId;
  const status = body.status || body.delivery_status;

  if (msgId && status && ['delivered', 'read', 'sent', 'failed'].includes(status)) {
    try {
      await pool.query(
        `UPDATE wa_send_logs SET status = $1, updated_at = NOW() WHERE message_id = $2`,
        [status, msgId],
      );
    } catch { /* non-critical */ }
    res.json({ ok: true, type: 'delivery_receipt' });
    return;
  }

  // ── Normalize Meta WABA Cloud API webhook format ──────────────────────────
  // Meta sends: { object: 'whatsapp_business_account', entry: [{ changes: [{ value: {...} }] }] }
  if (body.object === 'whatsapp_business_account' || body.entry?.[0]?.changes) {
    try {
      const changeVal = body.entry?.[0]?.changes?.[0]?.value;
      // Delivery/status update from Meta
      const metaStatus = changeVal?.statuses?.[0];
      if (metaStatus && !changeVal?.messages?.[0]) {
        const statusMap: Record<string, string> = { sent: 'sent', delivered: 'delivered', read: 'read', failed: 'failed' };
        body.id = metaStatus.id;
        body.status = statusMap[metaStatus.status] ?? metaStatus.status;
      }
      // Incoming message from Meta
      const msg = changeVal?.messages?.[0];
      if (msg) {
        body.phone    = body.phone || msg.from;
        body.name     = body.name  || changeVal.contacts?.[0]?.profile?.name;
        body.id       = body.id    || msg.id;
        body.provider = 'meta';
        if (msg.type === 'text') {
          body.message = body.message || msg.text?.body;
        } else if (msg.type === 'interactive') {
          const ir = msg.interactive as any;
          // list_reply / button_reply: id format = "menu_1" → extract digit
          if (ir.type === 'list_reply') {
            const extracted = (ir.list_reply?.id as string)?.replace(/^menu_/, '');
            body.message = /^\d+$/.test(extracted || '') ? extracted : ir.list_reply?.title;
          } else if (ir.type === 'button_reply') {
            const extracted = (ir.button_reply?.id as string)?.replace(/^menu_/, '');
            body.message = /^\d+$/.test(extracted || '') ? extracted : ir.button_reply?.title;
          }
        }
      }
    } catch { /* non-critical */ }
  }

  // ── Incoming message ───────────────────────────────────────────────────────
  // Fonnte incoming: { phone, message, name }
  const fromPhone = body.phone || body.from || body.sender;
  const message   = body.message || body.text || body.body;

  if (fromPhone && message) {
    const phone = normalisePhone(fromPhone);
    const name  = body.name || body.pushname || body.contact_name || null;
    const provider: string = body.provider || 'fonnte';

    let matchedKeyword: { id: string; reply_message: string } | null = null;
    const msgLower = message.toLowerCase().trim();
    let botMenuReply: string | null = null;
    // Interactive list payload for Meta WABA (set when trigger matches + interactive mode on)
    let interactiveListPayload: {
      bodyText: string; footerText?: string; buttonText: string;
      sectionTitle: string; rows: MetaMenuRow[];
    } | null = null;

    try {
      // ── Check bot menu ─────────────────────────────────────────────────────
      const { rows: menuConfig } = await pool.query(
        `SELECT key, value FROM app_settings
         WHERE key IN (
           'wa_bot_menu_enabled','wa_bot_menu_trigger','wa_bot_menu_header','wa_bot_menu_footer',
           'wa_bot_menu_interactive','wa_bot_menu_button_text','wa_bot_menu_section_title'
         )`,
      );
      const mCfg: Record<string, string> = {};
      for (const r of menuConfig) mCfg[r.key] = r.value;
      const menuEnabled     = mCfg['wa_bot_menu_enabled'] !== 'false';
      const menuTrigger     = (mCfg['wa_bot_menu_trigger'] || 'menu').toLowerCase().trim();
      const menuHeader      = mCfg['wa_bot_menu_header']  || "Assalamu'alaikum! 👋 Selamat datang.\n\nSilakan pilih menu:";
      const menuFooter      = mCfg['wa_bot_menu_footer']  || '';
      const useInteractive  = mCfg['wa_bot_menu_interactive'] === 'true' && provider === 'meta';
      const buttonText      = mCfg['wa_bot_menu_button_text']   || 'Pilih Menu';
      const sectionTitle    = mCfg['wa_bot_menu_section_title'] || 'Layanan Kami';

      if (menuEnabled) {
        // 1. User sent the trigger word (e.g. "menu") → show the menu list
        if (msgLower === menuTrigger || msgLower.includes(menuTrigger)) {
          const { rows: menuItems } = await pool.query(
            `SELECT menu_number, label, description FROM wa_bot_menu_items WHERE is_active = true ORDER BY sort_order ASC, menu_number ASC`,
          );
          if (menuItems.length > 0) {
            if (useInteractive) {
              // Build Meta WABA interactive list message
              interactiveListPayload = {
                bodyText: menuHeader,
                footerText: menuFooter || undefined,
                buttonText,
                sectionTitle,
                rows: menuItems.map((m: any) => ({
                  id: `menu_${m.menu_number}`,
                  title: `${m.menu_number}. ${m.label}`.slice(0, 24),
                  description: (m.description as string) || undefined,
                })),
              };
            } else {
              // Plain text fallback
              const lines = menuItems.map((m: any) => `${m.menu_number}. ${m.label}`).join('\n');
              botMenuReply = `${menuHeader}\n\n${lines}${menuFooter}`;
            }
          }
        }
        // 2. User sent a number → find matching menu item and reply
        else {
          const numMatch = msgLower.match(/^(\d+)$/);
          if (numMatch) {
            const num = parseInt(numMatch[1]);
            const { rows: menuItems } = await pool.query(
              `SELECT id, reply_message FROM wa_bot_menu_items WHERE menu_number = $1 AND is_active = true LIMIT 1`,
              [num],
            );
            if (menuItems[0]) {
              botMenuReply = menuItems[0].reply_message.replace(/\{portal_url\}/g, 'portal jamaah kami');
              await pool.query(
                `UPDATE wa_bot_menu_items SET trigger_count = trigger_count + 1 WHERE id = $1`,
                [menuItems[0].id],
              ).catch(() => {});
            }
          }
        }
      }
    } catch { /* non-critical */ }

    try {
      // ── Match chatbot keywords (only if no bot menu match) ────────────────
      if (!botMenuReply && !interactiveListPayload) {
        const { rows: keywords } = await pool.query(
          `SELECT id, keyword, match_type, reply_message
           FROM wa_chatbot_keywords
           WHERE is_active = true
           ORDER BY priority DESC`,
        );

        for (const kw of keywords) {
          const k = (kw.keyword as string).toLowerCase();
          const matched =
            kw.match_type === 'exact'      ? msgLower === k :
            kw.match_type === 'startswith' ? msgLower.startsWith(k) :
            msgLower.includes(k);
          if (matched) { matchedKeyword = kw; break; }
        }
      }
    } catch { /* non-critical */ }

    const autoReply = botMenuReply ?? (matchedKeyword?.reply_message.replace(/\{portal_url\}/g, 'portal jamaah kami') ?? null);
    const hasMatch = !!(interactiveListPayload || botMenuReply || matchedKeyword);

    let incomingId: string | null = null;
    try {
      const { rows } = await pool.query(
        `INSERT INTO wa_incoming_messages
           (from_phone, from_name, message, message_id, provider, chatbot_matched, chatbot_keyword_id)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING id`,
        [phone, name, message, body.id || null, provider,
          hasMatch, matchedKeyword?.id || null],
      );
      incomingId = rows[0]?.id;
    } catch { /* non-critical */ }

    // Upsert contact
    try {
      await pool.query(
        `INSERT INTO wa_contacts (phone, name, last_reply_at, message_count)
         VALUES ($1, $2, NOW(), 1)
         ON CONFLICT (phone) DO UPDATE SET
           name = COALESCE(EXCLUDED.name, wa_contacts.name),
           last_reply_at = NOW(),
           message_count = wa_contacts.message_count + 1,
           updated_at = NOW()`,
        [phone, name],
      );
    } catch { /* non-critical */ }

    // Auto-reply: Meta WABA interactive list, plain bot menu, or chatbot keyword
    if (interactiveListPayload) {
      // Use Meta WABA interactive list message for menu display
      const cfg = await getActiveConfig().catch(() => null);
      if (cfg && cfg.provider === 'meta') {
        const sendResult = await sendMetaInteractiveList(cfg, phone, interactiveListPayload);
        if (sendResult.success && incomingId) {
          const listSummary = `[Menu Interaktif: ${interactiveListPayload.rows.length} pilihan]`;
          await pool.query(
            `UPDATE wa_incoming_messages SET is_replied = true, reply_message = $1, replied_at = NOW() WHERE id = $2`,
            [listSummary, incomingId],
          ).catch(() => {});
        }
      }
    } else if (autoReply) {
      const cfg = await getActiveConfig().catch(() => null);
      if (cfg) {
        const sendResult = await dispatchSend(cfg, phone, autoReply);
        if (sendResult.success && incomingId) {
          try {
            await pool.query(
              `UPDATE wa_incoming_messages
               SET is_replied = true, reply_message = $1, replied_at = NOW()
               WHERE id = $2`,
              [autoReply, incomingId],
            );
            if (matchedKeyword) {
              await pool.query(
                `UPDATE wa_chatbot_keywords SET trigger_count = trigger_count + 1 WHERE id = $1`,
                [matchedKeyword.id],
              );
            }
          } catch { /* non-critical */ }
        }
      }
    }

    res.json({
      ok: true, type: 'incoming',
      matched_chatbot: hasMatch,
      matched_bot_menu: !!(interactiveListPayload || botMenuReply),
      interactive_list_sent: !!interactiveListPayload,
    });
    return;
  }

  res.json({ ok: true, type: 'unknown' });
});

// ─── GET /api/v1/whatsapp/webhook (Fonnte verification) ──────────────────────
router.get('/webhook', (req, res) => {
  res.send('OK');
});

// ═══════════════════════════════════════════════════════════════════════════
//  CHATBOT KEYWORDS CRUD
// ═══════════════════════════════════════════════════════════════════════════

router.get('/chatbot', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, keyword, match_type, reply_message, is_active, priority, trigger_count, created_at, updated_at
       FROM wa_chatbot_keywords ORDER BY priority DESC, created_at ASC`,
    );
    res.json({ keywords: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/chatbot', async (req, res) => {
  const { keyword, match_type = 'contains', reply_message, is_active = true, priority = 0 } = req.body as any;
  if (!keyword || !reply_message) {
    res.status(400).json({ error: 'keyword dan reply_message wajib diisi' });
    return;
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO wa_chatbot_keywords (keyword, match_type, reply_message, is_active, priority)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [keyword.toLowerCase().trim(), match_type, reply_message, is_active, priority],
    );
    res.json({ success: true, keyword: rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/chatbot/:id', async (req, res) => {
  const { keyword, match_type, reply_message, is_active, priority } = req.body as any;
  const sets: string[] = ['updated_at = NOW()'];
  const vals: any[] = [];
  const push = (expr: string, v: any) => { vals.push(v); sets.push(`${expr} = $${vals.length}`); };
  if (keyword     !== undefined) push('keyword',       keyword.toLowerCase().trim());
  if (match_type  !== undefined) push('match_type',    match_type);
  if (reply_message !== undefined) push('reply_message', reply_message);
  if (is_active   !== undefined) push('is_active',     is_active);
  if (priority    !== undefined) push('priority',      priority);
  vals.push(req.params.id);
  try {
    await pool.query(`UPDATE wa_chatbot_keywords SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/chatbot/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM wa_chatbot_keywords WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  INBOX — incoming messages
// ═══════════════════════════════════════════════════════════════════════════

router.get('/inbox', async (req, res) => {
  const page     = Math.max(0, parseInt(String(req.query.page || '0')));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '30'))));
  const unread   = req.query.unread === 'true';
  const search   = String(req.query.search || '').trim();

  try {
    const conditions: string[] = [];
    const vals: any[] = [];
    if (unread) { vals.push(false); conditions.push(`is_read = $${vals.length}`); }
    if (search) {
      vals.push('%' + search + '%');
      conditions.push(`(from_phone ILIKE $${vals.length} OR from_name ILIKE $${vals.length} OR message ILIKE $${vals.length})`);
    }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM wa_incoming_messages ${where}`, vals);
    vals.push(pageSize, page * pageSize);
    const { rows } = await pool.query(
      `SELECT * FROM wa_incoming_messages ${where}
       ORDER BY received_at DESC LIMIT $${vals.length - 1} OFFSET $${vals.length}`,
      vals,
    );
    res.json({ total: countRes.rows[0]?.total ?? 0, page, pageSize, messages: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/inbox/:id/read', async (req, res) => {
  try {
    await pool.query(`UPDATE wa_incoming_messages SET is_read = true WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/inbox/read-all', async (_req, res) => {
  try {
    await pool.query(`UPDATE wa_incoming_messages SET is_read = true WHERE is_read = false`);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/inbox/:id/reply', async (req, res) => {
  const { message } = req.body as { message: string };
  if (!message) { res.status(400).json({ error: 'message wajib diisi' }); return; }
  try {
    const { rows } = await pool.query(
      `SELECT from_phone FROM wa_incoming_messages WHERE id = $1`, [req.params.id],
    );
    if (!rows[0]) { res.status(404).json({ error: 'Pesan tidak ditemukan' }); return; }
    const cfg = await getActiveConfig();
    if (!cfg) { res.status(503).json({ error: 'Tidak ada provider WA aktif' }); return; }
    const result = await dispatchSend(cfg, rows[0].from_phone, message);
    if (!result.success) { res.status(502).json({ error: result.error }); return; }
    await pool.query(
      `UPDATE wa_incoming_messages
       SET is_replied = true, is_read = true, reply_message = $1, replied_at = NOW()
       WHERE id = $2`,
      [message, req.params.id],
    );
    res.json({ success: true, messageId: result.messageId });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/inbox/unread-count', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS count FROM wa_incoming_messages WHERE is_read = false`,
    );
    res.json({ count: rows[0]?.count ?? 0 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  CONTACTS
// ═══════════════════════════════════════════════════════════════════════════

router.get('/contacts', async (req, res) => {
  const page     = Math.max(0, parseInt(String(req.query.page || '0')));
  const pageSize = Math.min(200, Math.max(1, parseInt(String(req.query.pageSize || '50'))));
  const search   = String(req.query.search || '').trim();
  const optOut   = req.query.opt_out;

  try {
    const conds: string[] = [];
    const vals: any[] = [];
    if (search) {
      vals.push('%' + search + '%');
      conds.push(`(phone ILIKE $${vals.length} OR name ILIKE $${vals.length})`);
    }
    if (optOut !== undefined) {
      vals.push(optOut === 'true');
      conds.push(`opt_out = $${vals.length}`);
    }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM wa_contacts ${where}`, vals);
    vals.push(pageSize, page * pageSize);
    const { rows } = await pool.query(
      `SELECT wc.*, c.full_name AS customer_name, c.email AS customer_email
       FROM wa_contacts wc
       LEFT JOIN customers c ON c.id = wc.customer_id
       ${where}
       ORDER BY wc.updated_at DESC
       LIMIT $${vals.length - 1} OFFSET $${vals.length}`,
      vals,
    );
    res.json({ total: countRes.rows[0]?.total ?? 0, page, pageSize, contacts: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// POST /contacts/sync — sync from customers table
router.post('/contacts/sync', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, full_name, phone FROM customers WHERE phone IS NOT NULL AND phone != ''`,
    );
    let synced = 0;
    let skipped = 0;
    for (const c of rows) {
      const phone = normalisePhone(c.phone);
      if (!phone || phone.length < 10) { skipped++; continue; }
      await pool.query(
        `INSERT INTO wa_contacts (phone, name, customer_id)
         VALUES ($1,$2,$3)
         ON CONFLICT (phone) DO UPDATE SET
           name = COALESCE(EXCLUDED.name, wa_contacts.name),
           customer_id = COALESCE(EXCLUDED.customer_id, wa_contacts.customer_id),
           updated_at = NOW()`,
        [phone, c.full_name, c.id],
      ).catch(() => skipped++);
      synced++;
    }
    res.json({ success: true, synced, skipped, total: rows.length });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.patch('/contacts/:id', async (req, res) => {
  const { name, tags, notes, opt_out } = req.body as any;
  const sets: string[] = ['updated_at = NOW()'];
  const vals: any[] = [];
  const push = (col: string, v: any) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
  if (name    !== undefined) push('name',    name);
  if (tags    !== undefined) push('tags',    tags);
  if (notes   !== undefined) push('notes',   notes);
  if (opt_out !== undefined) push('opt_out', opt_out);
  vals.push(req.params.id);
  try {
    await pool.query(`UPDATE wa_contacts SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/contacts/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM wa_contacts WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
//  BOT MENU — interactive numbered menu
// ═══════════════════════════════════════════════════════════════════════════

// ─── GET /api/v1/whatsapp/bot-menu ────────────────────────────────────────
router.get('/bot-menu', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, menu_number, label, reply_message, is_active, sort_order, trigger_count, created_at, updated_at
       FROM wa_bot_menu_items ORDER BY sort_order ASC, menu_number ASC`,
    );
    res.json({ items: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/whatsapp/bot-menu/config ─────────────────────────────────
router.get('/bot-menu/config', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT key, value FROM app_settings
       WHERE key IN (
         'wa_bot_menu_enabled','wa_bot_menu_trigger','wa_bot_menu_header','wa_bot_menu_footer',
         'wa_bot_menu_interactive','wa_bot_menu_button_text','wa_bot_menu_section_title'
       )`,
    );
    const cfg: Record<string, string> = {};
    for (const r of rows) cfg[r.key] = r.value;
    res.json({
      enabled:       cfg['wa_bot_menu_enabled'] !== 'false',
      trigger:       cfg['wa_bot_menu_trigger']       || 'menu',
      header:        cfg['wa_bot_menu_header']        || "Assalamu'alaikum! 👋 Selamat datang.\n\nSilakan pilih menu:",
      footer:        cfg['wa_bot_menu_footer']        || '',
      interactive:   cfg['wa_bot_menu_interactive']   === 'true',
      button_text:   cfg['wa_bot_menu_button_text']   || 'Pilih Menu',
      section_title: cfg['wa_bot_menu_section_title'] || 'Layanan Kami',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/v1/whatsapp/bot-menu/config ────────────────────────────────
router.post('/bot-menu/config', async (req, res) => {
  const { enabled, trigger, header, footer, interactive, button_text, section_title } = req.body as {
    enabled?: boolean; trigger?: string; header?: string; footer?: string;
    interactive?: boolean; button_text?: string; section_title?: string;
  };
  try {
    const entries: [string, string][] = [
      ['wa_bot_menu_enabled',       String(enabled ?? true)],
      ['wa_bot_menu_trigger',       (trigger || 'menu').toLowerCase().trim()],
      ['wa_bot_menu_header',        header || ''],
      ['wa_bot_menu_footer',        footer || ''],
      ['wa_bot_menu_interactive',   String(interactive ?? false)],
      ['wa_bot_menu_button_text',   (button_text || 'Pilih Menu').slice(0, 20)],
      ['wa_bot_menu_section_title', (section_title || 'Layanan Kami').slice(0, 24)],
    ];
    for (const [key, value] of entries) {
      await pool.query(
        `INSERT INTO app_settings (key, value) VALUES ($1,$2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
        [key, value],
      );
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/v1/whatsapp/bot-menu ───────────────────────────────────────
router.post('/bot-menu', async (req, res) => {
  const { menu_number, label, description, reply_message, is_active = true, sort_order = 0 } = req.body as {
    menu_number: number; label: string; description?: string; reply_message: string;
    is_active?: boolean; sort_order?: number;
  };
  if (!menu_number || !label || !reply_message) {
    res.status(400).json({ error: 'menu_number, label, reply_message wajib diisi' });
    return;
  }
  try {
    const { rows } = await pool.query(
      `INSERT INTO wa_bot_menu_items (menu_number, label, description, reply_message, is_active, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [menu_number, label.trim(), (description || '').trim(), reply_message.trim(), is_active, sort_order],
    );
    res.json({ success: true, item: rows[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PUT /api/v1/whatsapp/bot-menu/:id ───────────────────────────────────
router.put('/bot-menu/:id', async (req, res) => {
  const { menu_number, label, description, reply_message, is_active, sort_order } = req.body as any;
  const sets: string[] = ['updated_at = NOW()'];
  const vals: any[] = [];
  const push = (col: string, v: any) => { vals.push(v); sets.push(`${col} = $${vals.length}`); };
  if (menu_number   !== undefined) push('menu_number',   menu_number);
  if (label         !== undefined) push('label',         label.trim());
  if (description   !== undefined) push('description',   description.trim());
  if (reply_message !== undefined) push('reply_message', reply_message.trim());
  if (is_active     !== undefined) push('is_active',     is_active);
  if (sort_order    !== undefined) push('sort_order',    sort_order);
  vals.push(req.params.id);
  try {
    await pool.query(`UPDATE wa_bot_menu_items SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── DELETE /api/v1/whatsapp/bot-menu/:id ────────────────────────────────
router.delete('/bot-menu/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM wa_bot_menu_items WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// =============================================================================
// META WABA TEMPLATE BROADCAST
// =============================================================================

// ─── sendMetaTemplate: send one template message ─────────────────────────────
async function sendMetaTemplate(
  cfg: WAProviderConfig,
  phone: string,
  templateName: string,
  languageCode: string,
  bodyParams: string[],
  headerParams?: string[],
): Promise<SendResult> {
  const token   = cfg.api_key || (cfg.provider_config['access_token'] as string);
  const phoneId = cfg.provider_config['phone_number_id'] as string;
  const version = (cfg.provider_config['api_version'] as string) || 'v19.0';
  if (!token || !phoneId) return { success: false, error: 'Access Token atau Phone Number ID Meta belum dikonfigurasi' };

  const components: any[] = [];
  if (headerParams && headerParams.length > 0) {
    components.push({
      type: 'header',
      parameters: headerParams.map(v => ({ type: 'text', text: v })),
    });
  }
  if (bodyParams.length > 0) {
    components.push({
      type: 'body',
      parameters: bodyParams.map(v => ({ type: 'text', text: v })),
    });
  }

  try {
    const resp = await fetch(`https://graph.facebook.com/${version}/${phoneId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalisePhone(phone),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(components.length > 0 ? { components } : {}),
        },
      }),
    });
    const data = (await resp.json()) as any;
    if (!resp.ok || data.error) return { success: false, error: data.error?.message || 'Meta template send error' };
    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── GET /api/v1/whatsapp/meta-templates ─────────────────────────────────────
// Fetch approved templates from Meta Graph API
router.get('/meta-templates', async (_req, res) => {
  const cfg = await getActiveConfig();
  if (!cfg) {
    res.status(503).json({ error: 'Tidak ada provider WA yang aktif.' });
    return;
  }
  if (cfg.provider !== 'meta') {
    res.status(400).json({ error: 'Fitur ini hanya tersedia untuk provider Meta WABA Cloud API.', not_meta: true });
    return;
  }
  const token   = cfg.api_key || (cfg.provider_config['access_token'] as string);
  const wabaId  = cfg.provider_config['waba_id'] as string;
  const version = (cfg.provider_config['api_version'] as string) || 'v19.0';

  if (!token) {
    res.status(400).json({ error: 'Access Token belum dikonfigurasi.' });
    return;
  }
  if (!wabaId) {
    res.status(400).json({ error: 'WABA ID belum dikonfigurasi. Tambahkan di Konfigurasi Provider WA → Meta → WABA ID.', missing_waba_id: true });
    return;
  }

  try {
    const url = `https://graph.facebook.com/${version}/${wabaId}/message_templates?` +
      `status=APPROVED&fields=name,language,category,components,status&limit=100`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = (await resp.json()) as any;
    if (!resp.ok || data.error) {
      res.status(502).json({ error: data.error?.message || 'Gagal fetch template dari Meta', raw: data });
      return;
    }
    res.json({ templates: data.data || [], paging: data.paging });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/v1/whatsapp/broadcast-template ────────────────────────────────
// Send a template broadcast to a list of recipients
router.post('/broadcast-template', async (req, res) => {
  const cfg = await getActiveConfig();
  if (!cfg) {
    res.status(503).json({ error: 'Tidak ada provider WA yang aktif.' });
    return;
  }
  if (cfg.provider !== 'meta') {
    res.status(400).json({ error: 'Template broadcast hanya tersedia untuk provider Meta WABA.' });
    return;
  }

  const {
    broadcast_name = '',
    template_name,
    template_lang = 'id',
    variable_map = {},  // { "1": "field_path", "2": "field_path" } e.g. {"1":"full_name","2":"package_name"}
    recipients = [],    // [{ booking_id, phone, full_name, package_name, departure_date, booking_code, ... }]
  } = req.body as {
    broadcast_name?: string;
    template_name: string;
    template_lang?: string;
    variable_map?: Record<string, string>;
    recipients: Array<Record<string, string>>;
  };

  if (!template_name) {
    res.status(400).json({ error: 'template_name wajib diisi' });
    return;
  }
  if (!recipients.length) {
    res.status(400).json({ error: 'Minimal satu penerima diperlukan' });
    return;
  }

  // Create broadcast record
  let broadcastId: string | null = null;
  try {
    const { rows } = await pool.query(
      `INSERT INTO wa_template_broadcasts
         (name, template_name, template_lang, variable_map, status, total_recipients, started_at)
       VALUES ($1,$2,$3,$4,'sending',$5,NOW())
       RETURNING id`,
      [broadcast_name || `Template Broadcast ${new Date().toLocaleDateString('id-ID')}`,
       template_name, template_lang, JSON.stringify(variable_map), recipients.length],
    );
    broadcastId = rows[0]?.id;
  } catch { /* non-critical */ }

  // Send to all recipients
  let sentCount = 0;
  let failedCount = 0;
  const results: Array<{ phone: string; status: string; messageId?: string; error?: string }> = [];

  // Resolve variable_map keys → values for a given recipient
  function resolveVars(recipient: Record<string, string>): string[] {
    const nums = Object.keys(variable_map)
      .map(k => parseInt(k))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);
    return nums.map(n => recipient[variable_map[String(n)] || ''] || '');
  }

  for (let i = 0; i < recipients.length; i++) {
    const r = recipients[i];
    const phone = r.phone;
    if (!phone) { failedCount++; continue; }

    const bodyParams = resolveVars(r);
    const sendResult = await sendMetaTemplate(cfg, phone, template_name, template_lang, bodyParams);

    if (sendResult.success) { sentCount++; } else { failedCount++; }
    results.push({ phone, status: sendResult.success ? 'sent' : 'failed', messageId: sendResult.messageId, error: sendResult.error });

    // Log recipient
    if (broadcastId) {
      await pool.query(
        `INSERT INTO wa_template_broadcast_recipients
           (broadcast_id, booking_id, phone, full_name, resolved_vars, status, error_message, message_id, sent_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          broadcastId,
          r.booking_id || null,
          normalisePhone(phone),
          r.full_name || null,
          JSON.stringify(bodyParams.reduce((acc, v, idx) => ({ ...acc, [idx + 1]: v }), {})),
          sendResult.success ? 'sent' : 'failed',
          sendResult.error || null,
          sendResult.messageId || null,
          sendResult.success ? new Date() : null,
        ],
      ).catch(() => {});
    }

    // Rate limit: 1 message / 1.2 seconds
    if (i < recipients.length - 1) await new Promise(r => setTimeout(r, 1200));
  }

  // Update broadcast record
  if (broadcastId) {
    await pool.query(
      `UPDATE wa_template_broadcasts
       SET status = 'done', sent_count = $1, failed_count = $2, finished_at = NOW(), updated_at = NOW()
       WHERE id = $3`,
      [sentCount, failedCount, broadcastId],
    ).catch(() => {});
  }

  res.json({ success: true, broadcast_id: broadcastId, sent: sentCount, failed: failedCount, results });
});

// ─── GET /api/v1/whatsapp/template-broadcasts ────────────────────────────────
router.get('/template-broadcasts', async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, name, template_name, template_lang, status,
              total_recipients, sent_count, failed_count,
              started_at, finished_at, created_at
       FROM wa_template_broadcasts
       ORDER BY created_at DESC
       LIMIT 50`,
    );
    res.json({ broadcasts: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── GET /api/v1/whatsapp/template-broadcasts/:id/recipients ─────────────────
router.get('/template-broadcasts/:id/recipients', async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, phone, full_name, resolved_vars, status, error_message, message_id, sent_at
       FROM wa_template_broadcast_recipients
       WHERE broadcast_id = $1
       ORDER BY created_at ASC`,
      [req.params.id],
    );
    res.json({ recipients: rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;

