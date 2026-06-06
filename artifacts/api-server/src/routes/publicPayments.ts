/**
 * /api/public/payments
 *
 * Endpoint publik (tanpa autentikasi) untuk menerima konfirmasi pembayaran
 * dari portal transaksi (/transaksi/:token).
 *
 * POST /api/public/payments
 *   Body: { booking_id, customer_name, amount, payment_method, bank_name, account_name, notes }
 *   Actions:
 *     1. Verifikasi booking ada dan tidak cancelled
 *     2. Insert payment record (status = 'pending')
 *     3. Insert notifikasi in-app ke admin
 *     4. Kirim WhatsApp ke semua staf finance (fire-and-forget setelah response)
 */

import { Router } from 'express';
import { pool } from '../lib/db.js';
import { logger } from '../lib/logger.js';

const router = Router();

// ── Helper: get Fonnte token ──────────────────────────────────────────────────
async function getFonnteToken(): Promise<string | null> {
  if (process.env['FONNTE_TOKEN']) return process.env['FONNTE_TOKEN'];
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT api_key FROM whatsapp_config WHERE is_active = true AND api_key IS NOT NULL ORDER BY updated_at DESC LIMIT 1`,
    );
    return rows[0]?.api_key ?? null;
  } catch {
    return null;
  } finally {
    client.release();
  }
}

// ── Helper: normalize Indonesian phone ───────────────────────────────────────
function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('62')) return digits;
  return '62' + digits;
}

// ── Helper: send WA via Fonnte ────────────────────────────────────────────────
async function sendFonnte(token: string, target: string, message: string): Promise<boolean> {
  const form = new FormData();
  form.append('target', target);
  form.append('message', message);
  form.append('countryCode', '62');
  form.append('typing', 'true');
  try {
    const resp = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: token },
      body: form,
    });
    const data = (await resp.json()) as { status?: boolean; reason?: string };
    return resp.ok && data.status !== false;
  } catch {
    return false;
  }
}

// ── Helper: format rupiah ─────────────────────────────────────────────────────
function formatRupiah(amount: number): string {
  return 'Rp ' + amount.toLocaleString('id-ID');
}

// ── Helper: kirim WA ke semua staf finance (fire-and-forget) ─────────────────
async function notifyFinanceViaWA(params: {
  bookingId: string;
  bookingCode: string;
  customerName: string;
  amount: number;
}): Promise<void> {
  const { bookingId, bookingCode, customerName, amount } = params;
  try {
    const fonnteToken = await getFonnteToken();
    if (!fonnteToken) {
      logger.info('[PublicPayments] Fonnte tidak dikonfigurasi, skip WA notifikasi');
      return;
    }

    const { rows: roleRows } = await pool.query(
      `SELECT user_id FROM user_roles WHERE role = 'finance'`,
    );
    if (roleRows.length === 0) return;

    const userIds = roleRows.map((r: any) => r.user_id);

    const { rows: profileRows } = await pool.query(
      `SELECT phone FROM profiles WHERE user_id = ANY($1) AND phone IS NOT NULL AND phone <> ''`,
      [userIds],
    );
    if (profileRows.length === 0) return;

    const tanggal = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const baseUrl = process.env['VITE_PUBLIC_URL'] || process.env['REPLIT_DEV_DOMAIN'] || '';
    const adminLink = baseUrl ? `https://${baseUrl}/admin/bookings/${bookingId}` : `/admin/bookings/${bookingId}`;

    const message =
      `🔔 *Bukti Pembayaran Masuk – Perlu Verifikasi*\n\n` +
      `📋 Booking : *${bookingCode}*\n` +
      `👤 Jamaah  : ${customerName}\n` +
      `💰 Nominal : *${formatRupiah(amount)}*\n` +
      `📅 Waktu   : ${tanggal}\n\n` +
      `🔗 Klik untuk verifikasi:\n${adminLink}\n\n` +
      `_Mohon segera diverifikasi. Terima kasih._`;

    for (const profile of profileRows) {
      const phone = normalizePhone(profile.phone);
      const sent = await sendFonnte(fonnteToken, phone, message);
      if (!sent) {
        logger.warn({ phone }, '[PublicPayments] Gagal kirim WA ke finance');
      }
    }

    logger.info(
      { bookingCode, financeCount: profileRows.length },
      '[PublicPayments] WA finance terkirim',
    );
  } catch (err) {
    logger.error({ err }, '[PublicPayments] Error saat kirim WA finance');
  }
}

// ── POST /api/public/payments ─────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { booking_id, customer_name, amount, payment_method, bank_name, account_name, notes } =
    req.body ?? {};

  if (!booking_id || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
    return res.status(400).json({
      success: false,
      error: 'booking_id dan amount wajib diisi dengan benar',
    });
  }

  const amountNum = Number(amount);

  const client = await pool.connect();
  try {
    // 1. Verifikasi booking
    const { rows: bookingRows } = await client.query(
      `SELECT id, booking_code, booking_status FROM bookings WHERE id = $1 LIMIT 1`,
      [booking_id],
    );
    if (bookingRows.length === 0) {
      return res.status(404).json({ success: false, error: 'Booking tidak ditemukan' });
    }
    const booking = bookingRows[0];
    if (booking.booking_status === 'cancelled') {
      return res
        .status(400)
        .json({ success: false, error: 'Booking sudah dibatalkan, tidak dapat menerima pembayaran' });
    }

    // 2. Generate payment code (gunakan Postgres function jika ada, fallback ke timestamp)
    let paymentCode: string;
    try {
      const { rows: codeRows } = await client.query(`SELECT generate_payment_code() AS code`);
      paymentCode = codeRows[0]?.code ?? `PAY-PUB-${Date.now()}`;
    } catch {
      paymentCode = `PAY-PUB-${Date.now()}`;
    }

    // 3. Insert payment record dengan status pending
    await client.query(
      `INSERT INTO payments (booking_id, payment_code, amount, payment_method, bank_name, account_name, notes, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
      [
        booking_id,
        paymentCode,
        amountNum,
        payment_method ?? null,
        bank_name ?? null,
        account_name ?? null,
        notes ?? null,
      ],
    );

    // 4. Insert notifikasi in-app ke admin (fire-and-forget)
    client
      .query(
        `INSERT INTO notifications (title, message, type, target_role, booking_id, is_read)
         VALUES ($1, $2, 'info', 'admin', $3, false)`,
        [
          'Bukti Pembayaran Baru (Portal Publik)',
          `Jamaah ${customer_name ?? 'Pelanggan'} mengirim konfirmasi pembayaran untuk booking ${booking.booking_code} sebesar ${formatRupiah(amountNum)} melalui portal publik. Harap verifikasi segera.`,
          booking_id,
        ],
      )
      .catch((err: any) =>
        logger.warn({ err }, '[PublicPayments] Gagal insert notifikasi admin'),
      );

    // 5. Kirim response lebih dulu, baru kirim WA (non-blocking)
    res.json({ success: true, payment_code: paymentCode });

    notifyFinanceViaWA({
      bookingId: booking_id,
      bookingCode: booking.booking_code,
      customerName: customer_name ?? 'Pelanggan',
      amount: amountNum,
    });
  } catch (err: any) {
    logger.error({ err }, '[PublicPayments] Error submit payment publik');
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: 'Gagal menyimpan pembayaran. Silakan coba lagi.' });
    }
  } finally {
    client.release();
  }
});

export default router;
