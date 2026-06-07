import { pool } from './db.js';
import { logger } from './logger.js';

interface WAConfig {
  provider: string;
  api_key: string | null;
  sender_number: string | null;
  is_active: boolean;
  provider_config: Record<string, any>;
}

async function loadActiveWAConfig(): Promise<WAConfig | null> {
  try {
    const { rows } = await pool.query(`
      SELECT provider, api_key, sender_number, is_active, provider_config
      FROM whatsapp_config
      WHERE is_active = true
      ORDER BY updated_at DESC
      LIMIT 1
    `);
    return (rows[0] as WAConfig) ?? null;
  } catch {
    return null;
  }
}

function normalisePhone(phone: string): string {
  const d = phone.replace(/\D/g, '');
  if (d.startsWith('0')) return '62' + d.slice(1);
  if (!d.startsWith('62')) return '62' + d;
  return d;
}

export type WASendResult = { success: boolean; messageId?: string; error?: string };

async function sendFonnte(token: string, phone: string, message: string): Promise<WASendResult> {
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
    if (!resp.ok || data.status === false) {
      return { success: false, error: data.reason || data.message || 'Fonnte error' };
    }
    return { success: true, messageId: data.id };
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}

/**
 * Kirim pesan WhatsApp menggunakan provider aktif dari DB.
 * Fallback ke FONNTE_TOKEN env var jika tidak ada konfigurasi DB.
 * Tidak throw — selalu return { success, error }.
 */
export async function sendWA(phone: string, message: string): Promise<WASendResult> {
  if (!phone) return { success: false, error: 'Nomor HP tidak ada' };

  try {
    const cfg = await loadActiveWAConfig();

    if (cfg?.provider === 'fonnte') {
      const token = cfg.api_key || (cfg.provider_config['api_token'] as string) || process.env['FONNTE_TOKEN'];
      if (!token) return { success: false, error: 'Token Fonnte belum dikonfigurasi' };
      return sendFonnte(token, phone, message);
    }

    const envToken = process.env['FONNTE_TOKEN'];
    if (envToken) {
      return sendFonnte(envToken, phone, message);
    }

    return { success: false, error: 'Konfigurasi WhatsApp belum diatur' };
  } catch (e: any) {
    logger.warn({ err: e }, 'sendWA error (non-fatal)');
    return { success: false, error: e.message };
  }
}

/**
 * Template pesan kredensial untuk akun baru.
 */
export function credentialMessage(params: {
  recipientName: string;
  role: string;
  email: string;
  password: string;
  loginUrl?: string;
}): string {
  const url = params.loginUrl ?? 'https://app.vinstour.com/login';
  return (
    `Halo *${params.recipientName}*,\n\n` +
    `Akun ${params.role} Anda di Vinstour Travel telah berhasil dibuat. ` +
    `Berikut informasi login Anda:\n\n` +
    `🔑 *Email*: ${params.email}\n` +
    `🔐 *Password*: ${params.password}\n` +
    `🌐 *Login*: ${url}\n\n` +
    `_Segera ganti password setelah login pertama untuk keamanan akun Anda._\n\n` +
    `Terima kasih,\n*Tim Vinstour Travel*`
  );
}
