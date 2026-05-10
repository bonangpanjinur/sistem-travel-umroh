import { Router } from 'express';

const router = Router();

/**
 * POST /api/whatsapp/send
 * Proxy WhatsApp messages through Fonnte so the API token stays server-side.
 * Body: { target, message, countryCode? }
 */
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

  // Normalise Indonesian phone number
  const digits = target.replace(/\D/g, '');
  const phone = digits.startsWith('0') ? '62' + digits.slice(1) : digits.startsWith('62') ? digits : '62' + digits;

  try {
    const form = new FormData();
    form.append('target', phone);
    form.append('message', message);
    form.append('countryCode', countryCode);
    form.append('typing', 'true');

    const resp = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: { Authorization: token },
      body: form,
    });

    const data = await resp.json() as { status?: boolean; id?: string; reason?: string; message?: string };

    if (!resp.ok || data.status === false) {
      res.status(502).json({ success: false, error: data.reason || data.message || 'Fonnte error' });
      return;
    }

    res.json({ success: true, messageId: data.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/whatsapp/notification
 * Send a structured WhatsApp notification about a booking or departure.
 * The frontend passes all needed data — no DB query needed here.
 * Body: { phone, name, type, data: { bookingCode, packageName, ... } }
 */
router.post('/notification', async (req, res) => {
  const token = process.env['FONNTE_TOKEN'];
  if (!token) {
    res.status(503).json({ success: false, error: 'FONNTE_TOKEN belum dikonfigurasi di Replit Secrets.' });
    return;
  }

  const { phone, name, type, data: payload = {} } = req.body as {
    phone: string;
    name?: string;
    type: string;
    data?: Record<string, any>;
  };

  if (!phone) {
    res.status(400).json({ success: false, error: 'phone wajib diisi.' });
    return;
  }

  const templates: Record<string, (d: Record<string, any>) => string> = {
    booking_confirmation: (d) =>
      `Assalamu'alaikum ${d.name || 'Jamaah'} 🤲\n\nAlhamdulillah, booking Anda telah dikonfirmasi!\n\n` +
      `📋 *Kode Booking:* ${d.bookingCode || '-'}\n` +
      `✈️ *Paket:* ${d.packageName || '-'}\n` +
      `📅 *Tanggal Berangkat:* ${d.departureDate || '-'}\n\n` +
      `Silakan login ke portal jamaah untuk melihat detail lengkap.\n\nBarakallahu fiikum 🌙`,

    payment_reminder: (d) =>
      `Assalamu'alaikum ${d.name || 'Jamaah'} 🤲\n\n` +
      `Pengingat: masih ada sisa pembayaran untuk booking *${d.bookingCode || '-'}*.\n\n` +
      `💰 *Sisa Tagihan:* Rp ${Number(d.remainingAmount || 0).toLocaleString('id-ID')}\n` +
      `📅 *Batas Bayar:* ${d.paymentDeadline || '-'}\n\n` +
      `Segera selesaikan pembayaran agar perjalanan Anda dapat diproses.\nBarakallahu fiikum 🌙`,

    payment_confirmed: (d) =>
      `Assalamu'alaikum ${d.name || 'Jamaah'} 🤲\n\n` +
      `✅ Pembayaran Anda sebesar *Rp ${Number(d.amount || 0).toLocaleString('id-ID')}* telah dikonfirmasi!\n\n` +
      `📋 *Kode Booking:* ${d.bookingCode || '-'}\n\nBarakallahu fiikum 🌙`,

    departure_reminder: (d) =>
      `Assalamu'alaikum ${d.name || 'Jamaah'} 🤲\n\n` +
      `✈️ Keberangkatan Anda tinggal *${d.daysUntilDeparture || '?'} hari lagi*!\n\n` +
      `📦 Pastikan dokumen dan perlengkapan sudah siap.\n` +
      `📅 *Tanggal Berangkat:* ${d.departureDate || '-'}\n\nSemoga ibadah Anda mabrur. Barakallahu fiikum 🌙`,

    document_ready: (d) =>
      `Assalamu'alaikum ${d.name || 'Jamaah'} 🤲\n\n` +
      `📄 Dokumen *${d.documentType || ''}* Anda telah siap!\n\n` +
      `Silakan login ke portal jamaah untuk mengunduh dokumen Anda.\nBarakallahu fiikum 🌙`,

    custom: (d) => d.message || 'Pesan dari Vinstour Travel',
  };

  const builder = templates[type] ?? templates['custom'];
  const message = builder({ name, ...payload });

  // Proxy through /send logic
  const digits = phone.replace(/\D/g, '');
  const target = digits.startsWith('0') ? '62' + digits.slice(1) : digits.startsWith('62') ? digits : '62' + digits;

  try {
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

    const result = await resp.json() as { status?: boolean; id?: string; reason?: string; message?: string };

    if (!resp.ok || result.status === false) {
      res.status(502).json({ success: false, sent: 0, failed: 1, error: result.reason || 'Fonnte error' });
      return;
    }

    res.json({ success: true, sent: 1, failed: 0, messageId: result.id });
  } catch (err: any) {
    res.status(500).json({ success: false, sent: 0, failed: 1, error: err.message });
  }
});

/**
 * POST /api/whatsapp/payment-reminder
 * Bulk payment reminder — accepts list of recipients.
 * Body: { reminders: [{ phone, name, bookingCode, remainingAmount, paymentDeadline }] }
 */
router.post('/payment-reminder', async (req, res) => {
  const token = process.env['FONNTE_TOKEN'];
  if (!token) {
    res.status(503).json({ success: false, error: 'FONNTE_TOKEN belum dikonfigurasi di Replit Secrets.' });
    return;
  }

  const { reminders = [], booking_id } = req.body as {
    reminders?: Array<{ phone: string; name?: string; bookingCode?: string; remainingAmount?: number; paymentDeadline?: string }>;
    booking_id?: string;
    reminder_type?: string;
  };

  if (booking_id && reminders.length === 0) {
    // Single booking reminder — caller must pass phone via reminders array
    res.status(400).json({ success: false, error: 'Kirim reminders array dengan data kontak.' });
    return;
  }

  if (reminders.length === 0) {
    res.json({ success: true, summary: { sent: 0, failed: 0 }, message: 'Tidak ada penerima reminder.' });
    return;
  }

  let sent = 0;
  let failed = 0;

  await Promise.allSettled(
    reminders.map(async (r) => {
      const message =
        `Assalamu'alaikum ${r.name || 'Jamaah'} 🤲\n\n` +
        `Pengingat: masih ada sisa pembayaran untuk booking *${r.bookingCode || '-'}*.\n\n` +
        `💰 *Sisa Tagihan:* Rp ${Number(r.remainingAmount || 0).toLocaleString('id-ID')}\n` +
        `📅 *Batas Bayar:* ${r.paymentDeadline || '-'}\n\n` +
        `Segera selesaikan pembayaran agar perjalanan Anda dapat diproses.\nBarakallahu fiikum 🌙`;

      const digits = (r.phone || '').replace(/\D/g, '');
      const target = digits.startsWith('0') ? '62' + digits.slice(1) : digits.startsWith('62') ? digits : '62' + digits;

      const form = new FormData();
      form.append('target', target);
      form.append('message', message);
      form.append('countryCode', '62');

      const resp = await fetch('https://api.fonnte.com/send', {
        method: 'POST',
        headers: { Authorization: token },
        body: form,
      });
      const result = await resp.json() as { status?: boolean };
      if (!resp.ok || result.status === false) { failed++; } else { sent++; }
    }),
  );

  res.json({ success: true, summary: { sent, failed }, total: reminders.length });
});

export default router;
