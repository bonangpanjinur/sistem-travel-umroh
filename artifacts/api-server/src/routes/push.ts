import { Router } from 'express';
import webpush from 'web-push';
import { supabaseFetch, isSupabaseConfigured } from '../lib/supabase.js';

const router = Router();

// ─── VAPID helpers ────────────────────────────────────────────────────────────

function getVapidKeys() {
  const pub   = process.env['VAPID_PUBLIC_KEY'];
  const priv  = process.env['VAPID_PRIVATE_KEY'];
  const email = process.env['VAPID_EMAIL'] || 'mailto:admin@vinstour.com';
  return { pub, priv, email };
}

function isVapidConfigured() {
  const { pub, priv } = getVapidKeys();
  return Boolean(pub && priv);
}

function setupWebpush() {
  const { pub, priv, email } = getVapidKeys();
  webpush.setVapidDetails(email, pub!, priv!);
}

/** Send push to a list of subscription rows and return stale endpoints. */
async function fanout(
  subs: Array<{ endpoint: string; p256dh: string; auth_key: string }>,
  payload: string,
): Promise<{ sent: number; failed: number; stale: string[] }> {
  let sent = 0;
  let failed = 0;
  const stale: string[] = [];

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          payload,
          { TTL: 60 * 60 * 6 }, // 6-hour TTL for SOS
        );
        sent++;
      } catch (err: any) {
        failed++;
        if (err.statusCode === 404 || err.statusCode === 410) stale.push(sub.endpoint);
      }
    }),
  );

  return { sent, failed, stale };
}

/** Remove stale subscriptions from DB (fire-and-forget). */
function cleanStale(stale: string[]) {
  if (!stale.length) return;
  const list = stale.map((e) => `"${encodeURIComponent(e)}"`).join(',');
  supabaseFetch(`/push_subscriptions?endpoint=in.(${list})`, { method: 'DELETE' }).catch(() => {});
}

// ─── GET /api/push/vapid-public-key ──────────────────────────────────────────
router.get('/vapid-public-key', (_req, res) => {
  const { pub } = getVapidKeys();
  if (!pub) {
    res.status(503).json({ success: false, error: 'VAPID_PUBLIC_KEY belum dikonfigurasi di Replit Secrets.' });
    return;
  }
  res.json({ publicKey: pub });
});

// ─── POST /api/push/subscribe ─────────────────────────────────────────────────
// Accepts: { endpoint, keys: {p256dh, auth}, customer_id?, muthawif_id?, user_id? }
router.post('/subscribe', async (req, res) => {
  const { endpoint, keys, customer_id, muthawif_id, user_id } = req.body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    customer_id?: string;
    muthawif_id?: string;
    user_id?: string;
  };

  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    res.status(400).json({ success: false, error: 'endpoint dan keys.p256dh + keys.auth wajib diisi.' });
    return;
  }

  if (!isSupabaseConfigured()) {
    res.status(503).json({ success: false, error: 'Supabase belum dikonfigurasi.' });
    return;
  }

  try {
    const userAgent = req.headers['user-agent']?.slice(0, 200) ?? null;
    await supabaseFetch('/push_subscriptions', {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates' },
      body: JSON.stringify({
        endpoint,
        p256dh:      keys.p256dh,
        auth_key:    keys.auth,
        customer_id: customer_id  ?? null,
        muthawif_id: muthawif_id  ?? null,
        user_id:     user_id      ?? null,
        user_agent:  userAgent,
      }),
    });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/push/sos ───────────────────────────────────────────────────────
// Kirim push notifikasi SOS ke muthawif + tour leader dari departure yang sama.
// Body: { departure_id, emergency_type, customer_name, booking_code? }
router.post('/sos', async (req, res) => {
  if (!isVapidConfigured()) {
    res.status(503).json({ success: false, error: 'VAPID keys belum dikonfigurasi.' });
    return;
  }
  if (!isSupabaseConfigured()) {
    res.status(503).json({ success: false, error: 'Supabase belum dikonfigurasi.' });
    return;
  }

  const { departure_id, emergency_type = 'other', customer_name = 'Jamaah', booking_code } = req.body as {
    departure_id?: string;
    emergency_type?: string;
    customer_name?: string;
    booking_code?: string;
  };

  if (!departure_id) {
    res.status(400).json({ success: false, error: 'departure_id wajib diisi.' });
    return;
  }

  const emergencyLabels: Record<string, string> = {
    medical:  'Medis/Kesehatan',
    lost:     'Tersesat/Hilang',
    security: 'Keamanan',
    other:    'Darurat Lainnya',
  };
  const emergencyLabel = emergencyLabels[emergency_type] ?? 'Darurat';

  const title   = `🆘 SOS DARURAT — ${emergencyLabel}`;
  const body    = `${customer_name}${booking_code ? ` (${booking_code})` : ''} membutuhkan bantuan segera!`;
  const url     = '/muthawif/sos';
  const payload = JSON.stringify({ title, body, type: 'sos', url, tag: `sos-${Date.now()}`, timestamp: Date.now() });

  setupWebpush();

  // ── Step 1: Find muthawif assigned to this departure ─────────────────────
  let muthawifId: string | null = null;
  try {
    const deps = await supabaseFetch(
      `/departures?id=eq.${departure_id}&select=muthawif_id&limit=1`,
    );
    muthawifId = deps?.[0]?.muthawif_id ?? null;
  } catch { /* non-fatal */ }

  // ── Step 2: Find tour leader customer IDs in this departure ──────────────
  let tourLeaderCustomerIds: string[] = [];
  try {
    const bookings = await supabaseFetch(
      `/bookings?departure_id=eq.${departure_id}&select=customer_id&limit=50`,
    );
    const customerIds: string[] = (bookings || []).map((b: any) => b.customer_id).filter(Boolean);
    if (customerIds.length) {
      const idList = customerIds.map((id) => `"${id}"`).join(',');
      const tourLeaders = await supabaseFetch(
        `/customers?id=in.(${idList})&is_tour_leader=eq.true&select=id&limit=10`,
      );
      tourLeaderCustomerIds = (tourLeaders || []).map((c: any) => c.id).filter(Boolean);
    }
  } catch { /* non-fatal */ }

  // ── Step 3: Collect push subscriptions ───────────────────────────────────
  let subscriptions: Array<{ endpoint: string; p256dh: string; auth_key: string }> = [];

  // Subscriptions for muthawif (by muthawif_id)
  if (muthawifId) {
    try {
      const subs = await supabaseFetch(
        `/push_subscriptions?muthawif_id=eq.${muthawifId}&select=endpoint,p256dh,auth_key&limit=20`,
      );
      if (Array.isArray(subs)) subscriptions.push(...subs);
    } catch { /* non-fatal */ }
  }

  // Subscriptions for tour leaders (by customer_id)
  if (tourLeaderCustomerIds.length) {
    try {
      const idList = tourLeaderCustomerIds.map((id) => `"${id}"`).join(',');
      const subs = await supabaseFetch(
        `/push_subscriptions?customer_id=in.(${idList})&select=endpoint,p256dh,auth_key&limit=20`,
      );
      if (Array.isArray(subs)) subscriptions.push(...subs);
    } catch { /* non-fatal */ }
  }

  // De-duplicate by endpoint
  const seen = new Set<string>();
  subscriptions = subscriptions.filter((s) => {
    if (seen.has(s.endpoint)) return false;
    seen.add(s.endpoint);
    return true;
  });

  if (!subscriptions.length) {
    res.json({ success: true, sent: 0, failed: 0, message: 'Tidak ada subscriber push untuk departure ini.' });
    return;
  }

  // ── Step 4: Fan-out ───────────────────────────────────────────────────────
  const { sent, failed, stale } = await fanout(subscriptions, payload);
  cleanStale(stale);

  res.json({ success: true, sent, failed, total: subscriptions.length, muthawif_found: !!muthawifId });
});

// ─── POST /api/push/send — broadcast ke semua subscriber ────────────────────
router.post('/send', async (req, res) => {
  if (!isVapidConfigured()) {
    res.status(503).json({
      success: false,
      error: 'VAPID keys belum dikonfigurasi. Tambahkan VAPID_PUBLIC_KEY dan VAPID_PRIVATE_KEY di Replit Secrets. Generate dengan: npx web-push generate-vapid-keys',
    });
    return;
  }
  if (!isSupabaseConfigured()) {
    res.status(503).json({ success: false, error: 'Supabase belum dikonfigurasi.' });
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

  setupWebpush();
  const payload = JSON.stringify({ title, body, type, url, timestamp: Date.now() });
  const { sent, failed, stale } = await fanout(subscriptions, payload);
  cleanStale(stale);

  res.json({ success: true, sent, failed, total: subscriptions.length });
});

export default router;
