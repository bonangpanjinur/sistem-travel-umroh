import { Router } from 'express';
import nodemailer from 'nodemailer';

const router = Router();

function buildTransporter() {
  const host = process.env['SMTP_HOST'];
  const port = Number(process.env['SMTP_PORT'] || '587');
  const user = process.env['SMTP_USER'];
  const pass = process.env['SMTP_PASS'];
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

const EMAIL_FROM = process.env['SMTP_FROM'] || process.env['SMTP_USER'] || 'noreply@vinstour.com';

const TEMPLATES: Record<string, (data: Record<string, any>) => { subject: string; html: string }> = {
  booking_confirmation: (d) => ({
    subject: `Konfirmasi Booking ${d.bookingCode} - ${d.packageName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#1e40af">✅ Booking Dikonfirmasi</h2>
        <p>Assalamu'alaikum <strong>${d.customerName}</strong>,</p>
        <p>Booking Anda telah berhasil dikonfirmasi.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold">Kode Booking</td><td style="padding:8px">${d.bookingCode}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Paket</td><td style="padding:8px">${d.packageName}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold">Tanggal Berangkat</td><td style="padding:8px">${d.departureDate}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Total Biaya</td><td style="padding:8px">Rp ${Number(d.totalPrice).toLocaleString('id-ID')}</td></tr>
        </table>
        <p>Silakan login ke portal jamaah untuk melihat detail lengkap.</p>
        <p style="color:#6b7280;font-size:12px">Barakallahu fiikum 🤲<br><em>Tim Vinstour Travel</em></p>
      </div>
    `,
  }),
  payment_verified: (d) => ({
    subject: `Pembayaran Dikonfirmasi - Booking ${d.bookingCode}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#16a34a">✅ Pembayaran Dikonfirmasi</h2>
        <p>Assalamu'alaikum <strong>${d.customerName}</strong>,</p>
        <p>Pembayaran sebesar <strong>Rp ${Number(d.amount || 0).toLocaleString('id-ID')}</strong> telah berhasil dikonfirmasi.</p>
        <p>Kode Booking: <strong>${d.bookingCode}</strong></p>
        <p style="color:#6b7280;font-size:12px">Barakallahu fiikum 🤲<br><em>Tim Vinstour Travel</em></p>
      </div>
    `,
  }),
  payment_reminder: (d) => ({
    subject: `Pengingat Pembayaran - Booking ${d.bookingCode}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#d97706">⚠️ Pengingat Pembayaran</h2>
        <p>Assalamu'alaikum <strong>${d.customerName}</strong>,</p>
        <p>Masih ada sisa pembayaran sebesar <strong>Rp ${Number(d.remainingAmount || 0).toLocaleString('id-ID')}</strong> untuk booking <strong>${d.bookingCode}</strong>.</p>
        <p>Batas pembayaran: <strong>${d.paymentDeadline}</strong></p>
        <p style="color:#6b7280;font-size:12px">Barakallahu fiikum 🤲<br><em>Tim Vinstour Travel</em></p>
      </div>
    `,
  }),
  departure_reminder: (d) => ({
    subject: `H-${d.daysUntilDeparture} Keberangkatan - ${d.packageName}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#2563eb">✈️ Pengingat Keberangkatan H-${d.daysUntilDeparture}</h2>
        <p>Assalamu'alaikum <strong>${d.customerName}</strong>,</p>
        <p>Keberangkatan Anda ke Tanah Suci tinggal <strong>${d.daysUntilDeparture} hari lagi</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold">Paket</td><td style="padding:8px">${d.packageName}</td></tr>
          <tr><td style="padding:8px;font-weight:bold">Tanggal Berangkat</td><td style="padding:8px">${d.departureDate}</td></tr>
          <tr><td style="padding:8px;background:#f3f4f6;font-weight:bold">Bandara</td><td style="padding:8px">${d.departureAirport || '-'}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:12px">Barakallahu fiikum 🤲<br><em>Tim Vinstour Travel</em></p>
      </div>
    `,
  }),
  document_ready: (d) => ({
    subject: `Dokumen Siap - ${d.documentType || 'Dokumen'} Anda`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
        <h2 style="color:#7c3aed">📄 Dokumen Siap</h2>
        <p>Assalamu'alaikum <strong>${d.customerName}</strong>,</p>
        <p>Dokumen <strong>${d.documentType || ''}</strong> Anda telah siap dan dapat diakses melalui portal jamaah.</p>
        <p style="color:#6b7280;font-size:12px">Barakallahu fiikum 🤲<br><em>Tim Vinstour Travel</em></p>
      </div>
    `,
  }),
  custom: (d) => ({
    subject: d.subject || 'Pesan dari Vinstour Travel',
    html: d.body
      ? `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">${d.body}</div>`
      : '<p>Tidak ada konten.</p>',
  }),
};

router.post('/send', async (req, res) => {
  const { to, toName, template, data = {}, subject, body } = req.body as {
    to: string;
    toName?: string;
    template: string;
    data?: Record<string, any>;
    subject?: string;
    body?: string;
  };

  if (!to) {
    return res.status(400).json({ success: false, error: 'Alamat email penerima (to) wajib diisi.' });
  }

  const transporter = buildTransporter();
  if (!transporter) {
    return res.status(503).json({
      success: false,
      error: 'Email belum dikonfigurasi. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS di Replit Secrets.',
    });
  }

  const builder = TEMPLATES[template] ?? TEMPLATES['custom'];
  const built = builder({ ...data, subject, body });

  try {
    const info = await transporter.sendMail({
      from: `"Vinstour Travel" <${EMAIL_FROM}>`,
      to: toName ? `"${toName}" <${to}>` : to,
      subject: subject || built.subject,
      html: built.html,
    });
    return res.json({ success: true, messageId: info.messageId });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Gagal mengirim email.' });
  }
});

export default router;
