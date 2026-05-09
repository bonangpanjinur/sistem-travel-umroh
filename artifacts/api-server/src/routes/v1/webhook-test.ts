import { Router } from 'express';
import crypto from 'crypto';

const router = Router();

// POST /api/v1/webhook-test
// Proxy: server-side forward to target URL (avoid CORS & mixed-content issues from browser)
router.post('/', async (req, res) => {
  const { target_url, secret, payload } = req.body as {
    target_url: string;
    secret?: string;
    payload: Record<string, unknown>;
  };

  if (!target_url) {
    res.status(400).json({ success: false, error: 'target_url wajib diisi.' });
    return;
  }

  if (!/^https?:\/\/.+/.test(target_url)) {
    res.status(400).json({ success: false, error: 'target_url harus dimulai dengan http:// atau https://' });
    return;
  }

  const body = JSON.stringify(payload ?? {});

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Vinstour-Webhook/1.0',
    'X-Vinstour-Event': String((payload as any)?.event ?? 'webhook.test'),
    'X-Vinstour-Timestamp': String(Date.now()),
  };

  // Tambahkan signature HMAC-SHA256 jika secret tersedia
  if (secret) {
    const signature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');
    headers['X-Vinstour-Signature'] = `sha256=${signature}`;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  try {
    const upstream = await fetch(target_url, {
      method: 'POST',
      headers,
      body,
      signal: controller.signal,
    });
    clearTimeout(timeout);
    res.status(upstream.ok ? 200 : 502).json({
      success: upstream.ok,
      status_code: upstream.status,
      status_text: upstream.statusText,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    const isTimeout = err.name === 'AbortError';
    res.status(504).json({
      success: false,
      error: isTimeout ? 'Timeout 10 detik — server tujuan tidak merespons.' : err.message,
    });
  }
});

export default router;
