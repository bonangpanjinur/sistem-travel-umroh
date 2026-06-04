import { Router } from 'express';
import nodemailer from 'nodemailer';

const router = Router();

// POST /api/v1/test-smtp
// Kirim email test menggunakan konfigurasi SMTP yang diberikan (dari UI atau env)
router.post('/', async (req, res) => {
  const { host, port, user, pass, to, from } = req.body as {
    host?: string;
    port?: string | number;
    user?: string;
    pass?: string;
    to: string;
    from?: string;
  };

  // Fallback ke env vars jika tidak diberikan dari body
  const smtpHost = host || process.env.SMTP_HOST;
  const smtpPort = Number(port || process.env.SMTP_PORT || 587);
  const smtpUser = user || process.env.SMTP_USER;
  const smtpPass = pass || process.env.SMTP_PASS;
  const smtpFrom = from || process.env.SMTP_FROM || smtpUser;

  if (!smtpHost || !smtpUser || !smtpPass) {
    res.status(400).json({
      success: false,
      error: 'Konfigurasi SMTP tidak lengkap. Pastikan Host, Username, dan Password sudah diisi.',
    });
    return;
  }

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    res.status(400).json({
      success: false,
      error: 'Alamat email tujuan tidak valid.',
    });
    return;
  }

  const secure = smtpPort === 465;

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure,
    auth: { user: smtpUser, pass: smtpPass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 10_000,
  });

  try {
    await transporter.verify();
  } catch (err: any) {
    res.status(502).json({
      success: false,
      error: `Gagal terhubung ke server SMTP: ${err.message}`,
      detail: { host: smtpHost, port: smtpPort, user: smtpUser },
    });
    return;
  }

  try {
    const info = await transporter.sendMail({
      from: `"Vinstour Travel" <${smtpFrom}>`,
      to,
      subject: '✅ Test Email dari Vinstour',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px;">
          <div style="text-align:center;margin-bottom:20px;">
            <div style="width:48px;height:48px;background:#16a34a;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;">
              <span style="font-size:24px;">✅</span>
            </div>
          </div>
          <h2 style="text-align:center;color:#111827;margin:0 0 8px;">Email Test Berhasil!</h2>
          <p style="text-align:center;color:#6b7280;margin:0 0 24px;">Konfigurasi SMTP Anda berfungsi dengan baik.</p>
          <div style="background:#f9fafb;border-radius:8px;padding:16px;margin-bottom:16px;">
            <table style="width:100%;font-size:14px;color:#374151;">
              <tr><td style="padding:4px 0;font-weight:600;width:120px;">SMTP Host</td><td>${smtpHost}</td></tr>
              <tr><td style="padding:4px 0;font-weight:600;">Port</td><td>${smtpPort}</td></tr>
              <tr><td style="padding:4px 0;font-weight:600;">Pengirim</td><td>${smtpFrom}</td></tr>
              <tr><td style="padding:4px 0;font-weight:600;">Penerima</td><td>${to}</td></tr>
              <tr><td style="padding:4px 0;font-weight:600;">Waktu</td><td>${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })} WIB</td></tr>
            </table>
          </div>
          <p style="font-size:12px;color:#9ca3af;text-align:center;margin:0;">
            Email ini dikirim otomatis dari Vinstour Travel Portal untuk mengetes konfigurasi SMTP Anda.
          </p>
        </div>
      `,
      text: `Test Email Berhasil!\n\nKonfigurasi SMTP Anda berfungsi dengan baik.\n\nHost: ${smtpHost}\nPort: ${smtpPort}\nPengirim: ${smtpFrom}\nPenerima: ${to}\nWaktu: ${new Date().toISOString()}`,
    });

    res.json({
      success: true,
      message_id: info.messageId,
      accepted: info.accepted,
      detail: { host: smtpHost, port: smtpPort, from: smtpFrom, to },
    });
  } catch (err: any) {
    res.status(502).json({
      success: false,
      error: `Gagal mengirim email: ${err.message}`,
    });
  }
});

export default router;
