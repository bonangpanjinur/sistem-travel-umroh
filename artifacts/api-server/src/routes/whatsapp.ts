import { Router } from 'express';
import { pool } from '../lib/db.js';

const router = Router();

// ── Helper: normalize Indonesian phone ───────────────────────────────────────
function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  if (digits.startsWith('62')) return digits;
  return '62' + digits;
}

// ── Helper: send via Fonnte ───────────────────────────────────────────────────
async function sendFonnte(
  token: string,
  target: string,
  message: string,
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const form = new FormData();
  form.append('target', target);
  form.append('message', message);
  form.append('countryCode', '62');
  form.append('typing', 'true');

  const resp = await fetch('https://api.fonnte.com/send', {
    method: 'POST',
    headers: { Authorization: token },
    body: form,
  });
  const data = (await resp.json()) as {
    status?: boolean;
    id?: string;
    reason?: string;
    message?: string;
  };
  if (!resp.ok || data.status === false) {
    return { ok: false, error: data.reason || data.message || 'Fonnte error' };
  }
  return { ok: true, messageId: data.id };
}

type BookingLookupResult = {
  bookingCode: string;
  packageName: string;
  departureDate: string;
  remainingAmount: number;
  paidAmount: number;
  totalPrice: number;
  paymentDeadline: string;
  customerName: string;
  customerPhone: string;
};

// ── Helper: look up booking from Neon DB ─────────────────────────────────────
async function lookupBookingNeon(bookingId: string): Promise<BookingLookupResult | null> {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      `SELECT
         b.booking_code,
         b.remaining_amount,
         b.paid_amount,
         b.total_price,
         b.payment_deadline,
         pkg.name           AS package_name,
         dep.departure_date,
         c.full_name        AS customer_name,
         c.phone            AS customer_phone
       FROM bookings b
       LEFT JOIN departures dep ON dep.id = b.departure_id
       LEFT JOIN packages pkg   ON pkg.id = dep.package_id
       LEFT JOIN customers c    ON c.id   = b.customer_id
       WHERE b.id = $1
       LIMIT 1`,
      [bookingId],
    );
    const r = rows[0];
    if (!r) return null;
    return {
      bookingCode: r.booking_code || '-',
      packageName: r.package_name || '-',
      departureDate: r.departure_date
        ? new Date(r.departure_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
        : '-',
      remainingAmount: Number(r.remaining_amount || 0),
      paidAmount: Number(r.paid_amount || 0),
      totalPrice: Number(r.total_price || 0),
      paymentDeadline: r.payment_deadline
        ? new Date(r.payment_deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
        : '-',
      customerName: r.customer_name || 'Jamaah',
      customerPhone: r.customer_phone || '',
    };
  } finally {
    client.release();
  }
}

// ── Helper: look up booking from Supabase REST (fallback during migration) ────
async function lookupBookingSupabase(bookingId: string): Promise<BookingLookupResult | null> {
  const supabaseUrl = process.env['VITE_SUPABASE_URL'];
  const supabaseKey = process.env['VITE_SUPABASE_PUBLISHABLE_KEY'] || process.env['VITE_SUPABASE_ANON_KEY'];
  if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('placeholder')) return null;

  try {
    const url = `${supabaseUrl}/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&select=booking_code,remaining_amount,paid_amount,total_price,payment_deadline,customers(full_name,phone),departures(departure_date,packages(name))&limit=1`;
    const resp = await fetch(url, {
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: 'application/json',
      },
    });
    if (!resp.ok) return null;
    const data = (await resp.json()) as any[];
    const b = data?.[0];
    if (!b) return null;
    const dep = b.departures;
    const pkg = dep?.packages;
    const cust = Array.isArray(b.customers) ? b.customers[0] : b.customers;
    const depDate = dep?.departure_date;
    const deadline = b.payment_deadline;
    return {
      bookingCode: b.booking_code || '-',
      packageName: pkg?.name || '-',
      departureDate: depDate
        ? new Date(depDate).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
        : '-',
      remainingAmount: Number(b.remaining_amount || 0),
      paidAmount: Number(b.paid_amount || 0),
      totalPrice: Number(b.total_price || 0),
      paymentDeadline: deadline
        ? new Date(deadline).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
        : '-',
      customerName: cust?.full_name || 'Jamaah',
      customerPhone: cust?.phone || '',
    };
  } catch {
    return null;
  }
}

// ── Helper: look up booking — tries Neon first, falls back to Supabase ────────
async function lookupBooking(bookingId: string): Promise<BookingLookupResult | null> {
  const fromNeon = await lookupBookingNeon(bookingId);
  if (fromNeon) return fromNeon;
  return lookupBookingSupabase(bookingId);
}

// ── Message templates ─────────────────────────────────────────────────────────
const TEMPLATES: Record<string, (d: Record<string, any>) => string> = {
  booking_confirmation: (d) =>
    `Assalamu'alaikum *${d.name || 'Jamaah'}* 🤲\n\n` +
    `Alhamdulillah, booking Anda telah *dikonfirmasi*!\n\n` +
    `📋 *Kode Booking:* ${d.bookingCode || '-'}\n` +
    `✈️ *Paket:* ${d.packageName || '-'}\n` +
    `📅 *Tanggal Berangkat:* ${d.departureDate || '-'}\n\n` +
    `Silakan login ke portal jamaah untuk melihat detail lengkap.\n\nBarakallahu fiikum 🌙`,

  // alias: frontend kirim 'booking_confirmed'
  booking_confirmed: (d) => TEMPLATES['booking_confirmation'](d),

  payment_reminder: (d) =>
    `Assalamu'alaikum *${d.name || 'Jamaah'}* 🤲\n\n` +
    `Pengingat: masih ada *sisa pembayaran* untuk booking *${d.bookingCode || '-'}*.\n\n` +
    `💰 *Sisa Tagihan:* Rp ${Number(d.remainingAmount || 0).toLocaleString('id-ID')}\n` +
    `📅 *Batas Bayar:* ${d.paymentDeadline || '-'}\n\n` +
    `Segera selesaikan pembayaran agar perjalanan Anda dapat diproses.\nBarakallahu fiikum 🌙`,

  payment_confirmed: (d) =>
    `Assalamu'alaikum *${d.name || 'Jamaah'}* 🤲\n\n` +
    `✅ *Pembayaran dikonfirmasi!*\n\n` +
    `📋 *Kode Booking:* ${d.bookingCode || '-'}\n` +
    `💰 *Jumlah:* Rp ${Number(d.amount || d.paidAmount || 0).toLocaleString('id-ID')}\n` +
    `📦 *Paket:* ${d.packageName || '-'}\n\n` +
    `Barakallahu fiikum 🌙`,

  // alias: frontend kirim 'payment_received'
  payment_received: (d) => TEMPLATES['payment_confirmed'](d),

  departure_reminder: (d) =>
    `Assalamu'alaikum *${d.name || 'Jamaah'}* 🤲\n\n` +
    `✈️ Keberangkatan Anda tinggal *${d.daysUntilDeparture || '?'} hari lagi*!\n\n` +
    `📦 Pastikan dokumen dan perlengkapan sudah siap.\n` +
    `📅 *Tanggal Berangkat:* ${d.departureDate || '-'}\n\nSemoga ibadah Anda mabrur. Barakallahu fiikum 🌙`,

  document_ready: (d) =>
    `Assalamu'alaikum *${d.name || 'Jamaah'}* 🤲\n\n` +
    `📄 Dokumen *${d.documentType || ''}* Anda telah siap!\n\n` +
    `Silakan login ke portal jamaah untuk mengunduh dokumen Anda.\nBarakallahu fiikum 🌙`,

  custom: (d) => d.message || 'Pesan dari Vinstour Travel',
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/whatsapp/send
// ─────────────────────────────────────────────────────────────────────────────
router.post('/send', async (req, res) => {
  const token = process.env['FONNTE_TOKEN'];
  if (!token) {
    res.status(503).json({
      success: false,
      error: 'FONNTE_TOKEN belum dikonfigurasi. Tambahkan di Replit Secrets.',
    });
    return;
  }

  const { target, message, countryCode = '62' } = req.body as {
    target: string;
    message: string;
    countryCode?: string;
  };

  if (!target || !message) {
    res.status(400).json({ success: false, error: 'target dan message wajib diisi.' });
    return;
  }

  try {
    const result = await sendFonnte(token, normalizePhone(target), message);
    if (!result.ok) {
      res.status(502).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true, messageId: result.messageId });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/whatsapp/notification
// Body (opsi A — pakai booking_id): { type, booking_id }
// Body (opsi B — pakai data langsung): { phone, name, type, data: { ... } }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/notification', async (req, res) => {
  const token = process.env['FONNTE_TOKEN'];
  if (!token) {
    res.status(503).json({ success: false, error: 'FONNTE_TOKEN belum dikonfigurasi di Replit Secrets.' });
    return;
  }

  const {
    phone: rawPhone,
    name: rawName,
    type,
    data: payload = {},
    booking_id,
  } = req.body as {
    phone?: string;
    name?: string;
    type: string;
    data?: Record<string, any>;
    booking_id?: string;
  };

  let phone = rawPhone || '';
  let name = rawName || '';
  let templateData: Record<string, any> = { name, ...payload };

  // Opsi A: booking_id dikirim → look up data dari DB
  if (booking_id) {
    try {
      const bk = await lookupBooking(booking_id);
      if (!bk) {
        res.status(404).json({ success: false, error: `Booking ${booking_id} tidak ditemukan.` });
        return;
      }
      if (!bk.customerPhone) {
        res.status(422).json({
          success: false,
          error: `Nomor WhatsApp jamaah untuk booking ${bk.bookingCode} belum diisi di data customer.`,
        });
        return;
      }
      phone = bk.customerPhone;
      name = bk.customerName;
      templateData = {
        name: bk.customerName,
        bookingCode: bk.bookingCode,
        packageName: bk.packageName,
        departureDate: bk.departureDate,
        remainingAmount: bk.remainingAmount,
        paidAmount: bk.paidAmount,
        amount: bk.paidAmount,
        paymentDeadline: bk.paymentDeadline,
        ...payload,
      };
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Gagal mengambil data booking: ' + err.message });
      return;
    }
  }

  if (!phone) {
    res.status(400).json({ success: false, error: 'phone atau booking_id wajib diisi.' });
    return;
  }

  const builder = TEMPLATES[type] ?? TEMPLATES['custom'];
  const message = builder(templateData);
  const target = normalizePhone(phone);

  try {
    const result = await sendFonnte(token, target, message);
    if (!result.ok) {
      res.status(502).json({ success: false, sent: 0, failed: 1, error: result.error });
      return;
    }
    res.json({ success: true, sent: 1, failed: 0, messageId: result.messageId });
  } catch (err: any) {
    res.status(500).json({ success: false, sent: 0, failed: 1, error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/whatsapp/payment-reminder
// Body (opsi A — single booking): { booking_id }
// Body (opsi B — bulk):           { reminders: [{ phone, name, bookingCode, remainingAmount, paymentDeadline }] }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/payment-reminder', async (req, res) => {
  const token = process.env['FONNTE_TOKEN'];
  if (!token) {
    res.status(503).json({ success: false, error: 'FONNTE_TOKEN belum dikonfigurasi di Replit Secrets.' });
    return;
  }

  const { reminders = [], booking_id } = req.body as {
    reminders?: Array<{
      phone: string;
      name?: string;
      bookingCode?: string;
      remainingAmount?: number;
      paymentDeadline?: string;
    }>;
    booking_id?: string;
    reminder_type?: string;
  };

  // ── Opsi A: single booking_id → look up dari DB ───────────────────────────
  if (booking_id && reminders.length === 0) {
    try {
      const bk = await lookupBooking(booking_id);
      if (!bk) {
        res.status(404).json({ success: false, error: `Booking ${booking_id} tidak ditemukan.` });
        return;
      }
      if (!bk.customerPhone) {
        res.status(422).json({
          success: false,
          error: `Nomor WhatsApp jamaah untuk booking ${bk.bookingCode} belum diisi di data customer.`,
        });
        return;
      }
      if (bk.remainingAmount <= 0) {
        res.json({
          success: true,
          summary: { sent: 0, failed: 0 },
          message: `Booking ${bk.bookingCode} sudah lunas — reminder tidak dikirim.`,
        });
        return;
      }

      const message =
        `Assalamu'alaikum *${bk.customerName}* 🤲\n\n` +
        `Pengingat: masih ada *sisa pembayaran* untuk booking Anda.\n\n` +
        `📋 *Kode Booking:* ${bk.bookingCode}\n` +
        `✈️ *Paket:* ${bk.packageName}\n` +
        `💰 *Sisa Tagihan:* Rp ${bk.remainingAmount.toLocaleString('id-ID')}\n` +
        (bk.paymentDeadline !== '-'
          ? `📅 *Batas Bayar:* ${bk.paymentDeadline}\n`
          : '') +
        `\nSegera selesaikan pembayaran agar perjalanan Anda dapat diproses.\nBarakallahu fiikum 🌙`;

      const result = await sendFonnte(token, normalizePhone(bk.customerPhone), message);
      if (!result.ok) {
        res.status(502).json({ success: false, summary: { sent: 0, failed: 1 }, error: result.error });
        return;
      }
      res.json({
        success: true,
        summary: { sent: 1, failed: 0 },
        message: `Reminder tagihan terkirim ke ${bk.customerName}`,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Gagal mengambil data booking: ' + err.message });
    }
    return;
  }

  // ── Opsi B: bulk reminders array ─────────────────────────────────────────
  if (reminders.length === 0) {
    res.json({ success: true, summary: { sent: 0, failed: 0 }, message: 'Tidak ada penerima reminder.' });
    return;
  }

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    reminders.map(async (r) => {
      const message =
        `Assalamu'alaikum *${r.name || 'Jamaah'}* 🤲\n\n` +
        `Pengingat: masih ada *sisa pembayaran* untuk booking *${r.bookingCode || '-'}*.\n\n` +
        `💰 *Sisa Tagihan:* Rp ${Number(r.remainingAmount || 0).toLocaleString('id-ID')}\n` +
        `📅 *Batas Bayar:* ${r.paymentDeadline || '-'}\n\n` +
        `Segera selesaikan pembayaran agar perjalanan Anda dapat diproses.\nBarakallahu fiikum 🌙`;

      const result = await sendFonnte(token, normalizePhone(r.phone), message);
      if (!result.ok) { failed++; } else { sent++; }
    }),
  );

  res.json({ success: true, summary: { sent, failed }, total: reminders.length });
});

export default router;
