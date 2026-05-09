import { Router } from 'express';
import webpush from 'web-push';
import { supabaseFetch, isSupabaseConfigured } from '../lib/supabase.js';

const router = Router();

function getVapidKeys() {
  const pub = process.env['VAPID_PUBLIC_KEY'];
  const priv = process.env['VAPID_PRIVATE_KEY'];
  const email = process.env['VAPID_EMAIL'] || 'mailto:admin@vinstour.com';
  return { pub, priv, email };
}

function isVapidConfigured() {
  const { pub, priv } = getVapidKeys();
  return Boolean(pub && priv);
}

// GET /api/push/vapid-public-key — frontend ambil public key untuk subscribe
router.get('/vapid-public-key', (_req, res) => {
  const { pub } = getVapidKeys();
  if (!pub) {
    res.status(503).json({
      success: false,
      error: 'VAPID_PUBLIC_KEY belum dikonfigurasi di Replit Secrets.',
    });
    return;
  }
  res.json({ publicKey: pub });
});

// POST /api/push/subscribe — simpan subscription browser push
router.post('/subscribe', async (req, res) => {
  const { endpoint, keys, customer_id } = req.body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    customer_id?: string;
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ success: false, error: 'endpoint dan keys.p256dh + keys.auth wajib diisi.' });
    return;
  }

  if (!isSupabaseConfigured()) {
    res.status(503).json({
      success: false,
      error: 'Supabase belum dikonfigurasi. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.',
    });
    return;
  }

  try {
    const userAgent = req.headers['user-agent']?.slice(0, 200) ?? null;
    await supabaseFetch('/push_subscriptions', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        endpoint,
        p256dh: keys.p256dh,
        auth_key: keys.auth,
        customer_id: customer_id ?? null,
        user_agent: userAgent,
      }),
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/push/send — kirim browser push ke semua subscriber
router.post('/send', async (req, res) => {
  if (!isVapidConfigured()) {
    res.status(503).json({
      success: false,
      error:
        'VAPID keys belum dikonfigurasi. Tambahkan VAPID_PUBLIC_KEY dan VAPID_PRIVATE_KEY di Replit Secrets. ' +
        'Generate dengan: npx web-push generate-vapid-keys',
    });
    return;
  }

  if (!isSupabaseConfigured()) {
    res.status(503).json({
      success: false,
      error: 'Supabase belum dikonfigurasi. Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.',
    });
    return;
  }

  const { title, body, type = 'info', url = '/' } = req.body as {
    title: string;
    body: string;
    type?: string;
    url?: string;
  };

  if (!title || !body) {
    res.status(400).json({ success: false, error: 'title dan body wajib diisi.' });
    return;
  }

  const { pub, priv, email } = getVapidKeys();
  webpush.setVapidDetails(email, pub!, priv!);

  let subscriptions: Array<{ endpoint: string; p256dh: string; auth_key: string }> = [];
  try {
    subscriptions = await supabaseFetch('/push_subscriptions?select=endpoint,p256dh,auth_key&limit=1000');
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Gagal mengambil daftar subscriber: ' + err.message });
    return;
  }

  if (!subscriptions.length) {
    res.json({ success: true, sent: 0, failed: 0, message: 'Belum ada subscriber browser push.' });
    return;
  }

  const payload = JSON.stringify({ title, body, type, url, timestamp: Date.now() });
  let sent = 0;
  let failed = 0;
  const stale: string[] = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth_key },
          },
          payload,
          { TTL: 60 * 60 * 24 },
        );
        sent++;
      } catch (err: any) {
        failed++;
        // 404/410 = subscription expired, remove it
        if (err.statusCode === 404 || err.statusCode === 410) {
          stale.push(sub.endpoint);
        }
      }
    }),
  );

  // Hapus subscription kedaluwarsa
  if (stale.length) {
    supabaseFetch(
      `/push_subscriptions?endpoint=in.(${stale.map((e) => `"${encodeURIComponent(e)}"`).join(',')})`,
      { method: 'DELETE' },
    ).catch(() => {});
  }

  res.json({ success: true, sent, failed, total: subscriptions.length });
});

export default router;
