import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { db } from '../../lib/db.js';
import { waTemplates, waSendLogs, appSettings } from '@workspace/db/schema';
import { eq, sql, and, or, desc } from 'drizzle-orm';

const router = Router();

// ─── Supabase admin client (reads whatsapp_config server-side) ───────────
function getSupabaseAdmin() {
  const url = process.env['SUPABASE_URL'];
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY'] || process.env['SUPABASE_ANON_KEY'];
  if (!url || !key) return null;
  return createClient(url, key);
}

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
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;
  const { data } = await supabase
    .from('whatsapp_config')
    .select('provider, api_key, sender_number, is_active, provider_config, display_name')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return data as WAProviderConfig | null;
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
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(503).json({ error: 'Supabase belum dikonfigurasi di server' });
    return;
  }
  try {
    const { data, error } = await supabase.rpc('get_wa_config_safe');
    if (error) throw error;
    const envFonnte = envFonnteConfig();
    res.json({
      configs: data || [],
      env_fonnte_configured: !!envFonnte,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/v1/whatsapp/provider ───────────────────────────────────────
// Saves (upsert) provider config. api_key is saved to DB server-side only.
router.post('/provider', async (req, res) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(503).json({ error: 'Supabase belum dikonfigurasi di server' });
    return;
  }
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

  try {
    const payload: Record<string, any> = {
      provider,
      display_name: display_name || null,
      sender_number: sender_number || null,
      is_active: is_active ?? false,
      provider_config: provider_config || {},
      updated_at: new Date().toISOString(),
    };
    // Only update api_key if a new value is provided (not masked)
    if (api_key && !api_key.startsWith('••')) {
      payload['api_key'] = api_key;
    }

    let result;
    if (id) {
      result = await supabase.from('whatsapp_config').update(payload).eq('id', id).select('id').single();
    } else {
      result = await supabase.from('whatsapp_config').insert(payload).select('id').single();
    }
    if (result.error) throw result.error;

    // If set as active, deactivate all others
    if (is_active && result.data?.id) {
      await supabase.from('whatsapp_config')
        .update({ is_active: false })
        .neq('id', result.data.id);
    }

    res.json({ success: true, id: result.data?.id });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── DELETE /api/v1/whatsapp/provider/:id ────────────────────────────────
router.delete('/provider/:id', async (req, res) => {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    res.status(503).json({ error: 'Supabase belum dikonfigurasi' });
    return;
  }
  const { error } = await supabase.from('whatsapp_config').delete().eq('id', req.params.id);
  if (error) { res.status(500).json({ error: error.message }); return; }
  res.json({ success: true });
});

// ─── POST /api/v1/whatsapp/provider/test ────────────────────────────────
// Test connection with given credentials (not saved)
router.post('/provider/test', async (req, res) => {
  const { provider, api_key, sender_number, provider_config = {} } = req.body as {
    provider: string;
    api_key?: string;
    sender_number?: string;
    provider_config?: Record<string, any>;
  };
  const testPhone = sender_number || '6281234567890';
  const testMsg   = '[Test] Koneksi WA berhasil dari Vinstour Travel Portal 🚀';
  const cfg: WAProviderConfig = {
    provider,
    api_key: api_key || null,
    sender_number: sender_number || null,
    is_active: true,
    provider_config,
    display_name: null,
  };

  if (provider === 'fonnte') {
    // Test via device endpoint (no message sent)
    const token = api_key || process.env['FONNTE_TOKEN'];
    if (!token) { res.json({ success: false, error: 'Token belum diisi' }); return; }
    try {
      const resp = await fetch('https://api.fonnte.com/device', {
        method: 'POST',
        headers: { Authorization: token },
        body: new FormData(),
      });
      const data = (await resp.json()) as any;
      res.json({
        success: data.status === 'connect',
        device: data,
        error: data.status !== 'connect' ? (data.reason || 'Device tidak terhubung') : undefined,
      });
    } catch (e: any) {
      res.json({ success: false, error: e.message });
    }
    return;
  }

  // For other providers, send test message to sender_number
  const result = await dispatchSend(cfg, testPhone, testMsg);
  res.json(result);
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

export default router;
