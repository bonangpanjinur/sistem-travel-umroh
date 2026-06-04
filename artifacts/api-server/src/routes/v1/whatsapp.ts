import { Router } from 'express';
import { db } from '../../lib/db.js';
import { waTemplates, waSendLogs, appSettings } from '@workspace/db/schema';
import { eq, sql, and, or, desc } from 'drizzle-orm';

const router = Router();

// ─── helper: normalise phone ───────────────────────────────────────────────
function normalisePhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('0')) return '62' + d.slice(1);
  if (!d.startsWith('62')) return '62' + d;
  return d;
}

// ─── helper: send one message via Fonnte ──────────────────────────────────
async function fonntePost(
  token: string,
  target: string,
  message: string,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const form = new FormData();
  form.append('target', normalisePhone(target));
  form.append('message', message);
  form.append('countryCode', '62');
  form.append('typing', 'true');
  try {
    const resp = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: token },
      body: form,
    });
    const data = (await resp.json()) as { status?: boolean; id?: string; reason?: string; message?: string };
    if (!resp.ok || data.status === false) return { success: false, error: data.reason || data.message || 'Fonnte error' };
    return { success: true, messageId: data.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

// ─── GET /api/v1/whatsapp/status ──────────────────────────────────────────
// Returns whether FONNTE_TOKEN is configured and device info from Fonnte
router.get('/status', async (_req, res) => {
  const token = process.env['FONNTE_TOKEN'];
  if (!token) {
    res.json({ configured: false, active: false, device: null });
    return;
  }
  try {
    const form = new FormData();
    const resp = await fetch('https://api.fonnte.com/device', {
      method: 'POST',
      headers: { Authorization: token },
      body: form,
    });
    const data = (await resp.json()) as any;
    res.json({ configured: true, active: data.status === 'connect', device: data });
  } catch {
    res.json({ configured: true, active: false, device: null });
  }
});

// ─── GET /api/v1/whatsapp/settings ────────────────────────────────────────
router.get('/settings', async (_req, res) => {
  try {
    const rows = await db
      .select()
      .from(appSettings)
      .where(
        or(
          eq(appSettings.key, 'wa_sender_number'),
          eq(appSettings.key, 'wa_is_active'),
        ),
      );
    const settings: Record<string, string> = {};
    for (const r of rows) settings[r.key] = r.value;
    res.json({
      senderNumber: settings['wa_sender_number'] || '',
      isActive: settings['wa_is_active'] === 'true',
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── POST /api/v1/whatsapp/settings ───────────────────────────────────────
router.post('/settings', async (req, res) => {
  const { senderNumber = '', isActive = false } = req.body as { senderNumber?: string; isActive?: boolean };
  try {
    for (const [key, value] of [
      ['wa_sender_number', senderNumber],
      ['wa_is_active', String(isActive)],
    ] as [string, string][]) {
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
      id: r.id,
      code: r.code,
      name: r.name,
      message_template: r.messageTemplate,
      variables: r.variables,
      is_active: r.isActive,
      created_at: r.createdAt,
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
  if (!code || !name || !message_template) {
    res.status(400).json({ error: 'code, name, message_template wajib diisi' });
    return;
  }
  try {
    const [row] = await db.insert(waTemplates).values({
      code: code.toUpperCase(),
      name,
      messageTemplate: message_template,
      variables,
      isActive: is_active,
    }).returning();
    res.json({ success: true, template: { id: row.id, code: row.code, name: row.name } });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// ─── PUT /api/v1/whatsapp/templates/:id ───────────────────────────────────
router.put('/templates/:id', async (req, res) => {
  const { id } = req.params;
  const { name, message_template, variables, is_active } = req.body as {
    name?: string; message_template?: string; variables?: string[]; is_active?: boolean;
  };
  try {
    const patch: Partial<typeof waTemplates.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined) patch.name = name;
    if (message_template !== undefined) patch.messageTemplate = message_template;
    if (variables !== undefined) patch.variables = variables;
    if (is_active !== undefined) patch.isActive = is_active;
    await db.update(waTemplates).set(patch).where(eq(waTemplates.id, id));
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
// Single WA send — token stays server-side
router.post('/send', async (req, res) => {
  const token = process.env['FONNTE_TOKEN'];
  if (!token) {
    res.status(503).json({ success: false, error: 'FONNTE_TOKEN belum dikonfigurasi di Replit Secrets.' });
    return;
  }
  const { phone, message, recipientName, templateCode } = req.body as {
    phone: string; message: string; recipientName?: string; templateCode?: string;
  };
  if (!phone || !message) {
    res.status(400).json({ success: false, error: 'phone dan message wajib diisi' });
    return;
  }
  const result = await fonntePost(token, phone, message);
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
  } catch { /* log failure is non-critical */ }
  if (result.success) {
    res.json({ success: true, messageId: result.messageId });
  } else {
    res.status(502).json({ success: false, error: result.error });
  }
});

// ─── POST /api/v1/whatsapp/send-bulk ──────────────────────────────────────
// Bulk send — processes sequentially with 1s delay; streams progress via returned summary
router.post('/send-bulk', async (req, res) => {
  const token = process.env['FONNTE_TOKEN'];
  if (!token) {
    res.status(503).json({ success: false, error: 'FONNTE_TOKEN belum dikonfigurasi di Replit Secrets.' });
    return;
  }
  const { recipients = [], templateCode = 'CUSTOM', departureId } = req.body as {
    recipients: Array<{ phone: string; message: string; name?: string }>;
    templateCode?: string;
    departureId?: string;
  };
  if (!recipients.length) {
    res.json({ success: true, sent: 0, failed: 0, results: [] });
    return;
  }

  const results: Array<{ phone: string; name?: string; status: string; errorMessage?: string; messageId?: string }> = [];

  for (let i = 0; i < recipients.length; i++) {
    const { phone, message, name } = recipients[i];
    const r = await fonntePost(token, phone, message);
    results.push({ phone, name, status: r.success ? 'sent' : 'failed', errorMessage: r.error, messageId: r.messageId });
    // small delay to avoid Fonnte rate limiting
    if (i < recipients.length - 1) await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Persist logs to DB in one batch
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
// Paginated WA send history with optional filters
router.get('/logs', async (req, res) => {
  const page     = Math.max(0, parseInt(String(req.query.page   || '0')));
  const pageSize = Math.min(100, Math.max(1, parseInt(String(req.query.pageSize || '50'))));
  const search   = String(req.query.search || '').trim();
  const status   = String(req.query.status || '').trim();
  const template = String(req.query.template || '').trim();

  try {
    const conditions = [];
    if (search) {
      conditions.push(
        or(
          sql`recipient_phone ilike ${'%' + search + '%'}`,
          sql`recipient_name ilike ${'%' + search + '%'}`,
          sql`message_content ilike ${'%' + search + '%'}`,
        )!,
      );
    }
    if (status && status !== 'all') conditions.push(eq(waSendLogs.status, status));
    if (template && template !== 'all') conditions.push(eq(waSendLogs.templateCode, template));

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRow, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(waSendLogs).where(where),
      db.select().from(waSendLogs).where(where).orderBy(sql`created_at desc`).limit(pageSize).offset(page * pageSize),
    ]);

    res.json({
      total: countRow[0]?.count ?? 0,
      page,
      pageSize,
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
