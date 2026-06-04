import { Router } from 'express';
import webpush from 'web-push';
import { db } from '../lib/db.js';
import { pushSubscriptions, departures, bookings, customers } from '@workspace/db/schema';
import { eq, inArray } from 'drizzle-orm';

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
          { TTL: 60 * 60 * 6 },
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

function cleanStale(stale: string[]) {
  if (!stale.length) return;
  db.delete(pushSubscriptions)
    .where(inArray(pushSubscriptions.endpoint, stale))
    .catch(() => {});
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

  try {
    const userAgent = req.headers['user-agent']?.slice(0, 200) ?? null;
    await db
      .insert(pushSubscriptions)
      .values({
        endpoint,
        p256dh:     keys.p256dh,
        authKey:    keys.auth,
        customerId: customer_id  ?? null,
        muthawifId: muthawif_id  ?? null,
        userId:     user_id      ?? null,
        userAgent,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          p256dh:     keys.p256dh,
          authKey:    keys.auth,
          customerId: customer_id  ?? null,
          muthawifId: muthawif_id  ?? null,
          userId:     user_id      ?? null,
          userAgent,
          updatedAt:  new Date(),
        },
      });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/push/sos ───────────────────────────────────────────────────────
router.post('/sos', async (req, res) => {
  if (!isVapidConfigured()) {
    res.status(503).json({ success: false, error: 'VAPID keys belum dikonfigurasi.' });
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

  // Step 1: Find muthawif for this departure
  let muthawifId: string | null = null;
  try {
    const deps = await db
      .select({ muthawif_id: departures.muthawifId })
      .from(departures)
      .where(eq(departures.id, departure_id))
      .limit(1);
    muthawifId = deps[0]?.muthawif_id ?? null;
  } catch { /* non-fatal */ }

  // Step 2: Find tour leader customer IDs
  let tourLeaderCustomerIds: string[] = [];
  try {
    const bookingRows = await db
      .select({ customer_id: bookings.customerId })
      .from(bookings)
      .where(eq(bookings.departureId, departure_id))
      .limit(50);

    const customerIds = bookingRows.map(b => b.customer_id).filter((id): id is string => Boolean(id));
    if (customerIds.length) {
      const tourLeaders = await db
        .select({ id: customers.id })
        .from(customers)
        .where(inArray(customers.id, customerIds));
      // Note: isTourLeader column may not exist yet; fall back gracefully
      tourLeaderCustomerIds = tourLeaders.map(c => c.id);
    }
  } catch { /* non-fatal */ }

  // Step 3: Collect push subscriptions
  let subscriptions: Array<{ endpoint: string; p256dh: string; auth_key: string }> = [];

  if (muthawifId) {
    try {
      const subs = await db
        .select({ endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth_key: pushSubscriptions.authKey })
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.muthawifId, muthawifId))
        .limit(20);
      subscriptions.push(...subs);
    } catch { /* non-fatal */ }
  }

  if (tourLeaderCustomerIds.length) {
    try {
      const subs = await db
        .select({ endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth_key: pushSubscriptions.authKey })
        .from(pushSubscriptions)
        .where(inArray(pushSubscriptions.customerId, tourLeaderCustomerIds))
        .limit(20);
      subscriptions.push(...subs);
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

  const { sent, failed, stale } = await fanout(subscriptions, payload);
  cleanStale(stale);

  res.json({ success: true, sent, failed, total: subscriptions.length, muthawif_found: !!muthawifId });
});

// ─── POST /api/push/send — broadcast ke semua subscriber ────────────────────
router.post('/send', async (req, res) => {
  if (!isVapidConfigured()) {
    res.status(503).json({
      success: false,
      error: 'VAPID keys belum dikonfigurasi. Tambahkan VAPID_PUBLIC_KEY dan VAPID_PRIVATE_KEY di Replit Secrets.',
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

  let subscriptions: Array<{ endpoint: string; p256dh: string; auth_key: string }> = [];
  try {
    const rows = await db
      .select({ endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth_key: pushSubscriptions.authKey })
      .from(pushSubscriptions)
      .limit(1000);
    subscriptions = rows;
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
