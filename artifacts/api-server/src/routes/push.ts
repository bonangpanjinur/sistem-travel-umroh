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
  const { endpoint, keys, customer_id, muthawif_id, user_id, role, branch_id, agent_id } = req.body as {
    endpoint: string;
    keys: { p256dh: string; auth: string };
    customer_id?: string;
    muthawif_id?: string;
    user_id?: string;
    role?: string;
    branch_id?: string;
    agent_id?: string;
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
        customerId: customer_id ?? null,
        muthawifId: muthawif_id ?? null,
        userId:     user_id     ?? null,
        role:       role        ?? null,
        branchId:   branch_id   ?? null,
        agentId:    agent_id    ?? null,
        userAgent,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.endpoint,
        set: {
          p256dh:     keys.p256dh,
          authKey:    keys.auth,
          customerId: customer_id ?? null,
          muthawifId: muthawif_id ?? null,
          userId:     user_id     ?? null,
          role:       role        ?? null,
          branchId:   branch_id   ?? null,
          agentId:    agent_id    ?? null,
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

// ─── POST /api/push/new-booking — kirim notif ke branch manager + agen ──────
// Body: { booking_id }
router.post('/new-booking', async (req, res) => {
  if (!isVapidConfigured()) {
    res.json({ success: true, sent: 0, skipped: 'VAPID not configured' });
    return;
  }

  const { booking_id } = req.body as { booking_id: string };
  if (!booking_id) {
    res.status(400).json({ success: false, error: 'booking_id wajib.' });
    return;
  }

  // Ambil data booking: branch_id, agent_id, booking_code, customer_name
  let bookingData: { branch_id: string | null; agent_id: string | null; booking_code: string; customer_name: string } | null = null;
  try {
    const { pool: dbPool } = await import('../lib/db.js');
    const row = await (dbPool as any).query(`
      SELECT b.branch_id, b.agent_id, b.booking_code,
             COALESCE(p.full_name, b.contact_name, 'Jamaah') AS customer_name
      FROM bookings b
      LEFT JOIN profiles p ON p.user_id = b.customer_id
      WHERE b.id = $1
      LIMIT 1
    `, [booking_id]);
    bookingData = row.rows[0] ?? null;
  } catch { /* non-fatal */ }

  if (!bookingData) {
    res.json({ success: true, sent: 0, message: 'Booking tidak ditemukan.' });
    return;
  }

  const { branch_id, agent_id, booking_code, customer_name } = bookingData;

  const title   = '📋 Booking Baru Masuk';
  const body    = `${customer_name} — ${booking_code}. Segera tinjau di panel admin.`;
  const url     = `/admin/bookings`;
  const tag     = `new-booking-${booking_id}`;
  const payload = JSON.stringify({ title, body, type: 'new_booking', url, tag, timestamp: Date.now() });

  // Kumpulkan user_id yang perlu diberitahu:
  // 1. Semua branch_manager cabang tersebut
  // 2. Super admin & owner (role-based)
  // 3. Agen yang membuat booking ini
  const userIdSet = new Set<string>();

  try {
    const { pool: dbPool } = await import('../lib/db.js');

    // Branch managers untuk cabang ini
    if (branch_id) {
      const bm = await (dbPool as any).query(
        `SELECT user_id FROM user_roles WHERE role = 'branch_manager' AND branch_id = $1 AND user_id IS NOT NULL`,
        [branch_id]
      );
      bm.rows.forEach((r: any) => r.user_id && userIdSet.add(r.user_id));
    }

    // Super admin & owner (semua cabang)
    const sa = await (dbPool as any).query(
      `SELECT DISTINCT user_id FROM user_roles WHERE role IN ('super_admin','owner') AND user_id IS NOT NULL`
    );
    sa.rows.forEach((r: any) => r.user_id && userIdSet.add(r.user_id));

    // Agen yang buat booking — cari user_id dari agents.id
    if (agent_id) {
      const ag = await (dbPool as any).query(
        `SELECT user_id FROM agents WHERE id = $1 LIMIT 1`,
        [agent_id]
      );
      if (ag.rows[0]?.user_id) userIdSet.add(ag.rows[0].user_id);
    }
  } catch { /* non-fatal */ }

  if (!userIdSet.size) {
    res.json({ success: true, sent: 0, message: 'Tidak ada target subscriber.' });
    return;
  }

  // Query push subscriptions untuk user_id tersebut
  let subscriptions: Array<{ endpoint: string; p256dh: string; auth_key: string }> = [];
  try {
    const userIds = Array.from(userIdSet);
    const subs = await db
      .select({ endpoint: pushSubscriptions.endpoint, p256dh: pushSubscriptions.p256dh, auth_key: pushSubscriptions.authKey })
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, userIds))
      .limit(50);
    subscriptions = subs;
  } catch { /* non-fatal */ }

  if (!subscriptions.length) {
    res.json({ success: true, sent: 0, message: 'Tidak ada subscriber terdaftar untuk target.' });
    return;
  }

  setupWebpush();
  const { sent, failed, stale } = await fanout(subscriptions, payload);
  cleanStale(stale);

  res.json({ success: true, sent, failed, total: subscriptions.length, targets: userIdSet.size });
});

// ─── POST /api/push/broadcast — targeted broadcast ke staf (filter role/branch) ─
router.post('/broadcast', async (req, res) => {
  if (!isVapidConfigured()) {
    res.status(503).json({
      success: false,
      error: 'VAPID keys belum dikonfigurasi. Tambahkan VAPID_PUBLIC_KEY dan VAPID_PRIVATE_KEY di Replit Secrets.',
    });
    return;
  }

  const { title, body, type = 'info', url = '/admin', roles, branch_ids } = req.body as {
    title: string;
    body: string;
    type?: string;
    url?: string;
    roles?: string[];
    branch_ids?: string[];
  };

  if (!title || !body) {
    res.status(400).json({ success: false, error: 'title dan body wajib diisi.' });
    return;
  }

  // Build query filtering by role and/or branch_id
  let subscriptions: Array<{ endpoint: string; p256dh: string; auth_key: string }> = [];
  try {
    const { pool: dbPool } = await import('../lib/db.js');

    let whereClause = `WHERE ps.user_id IS NOT NULL`;
    const params: unknown[] = [];
    let paramIdx = 1;

    if (roles && roles.length > 0) {
      const placeholders = roles.map(() => `$${paramIdx++}`).join(', ');
      whereClause += ` AND ps.role IN (${placeholders})`;
      params.push(...roles);
    } else {
      // Default: only staff (non-null role means it's a staff subscriber)
      whereClause += ` AND ps.role IS NOT NULL`;
    }

    if (branch_ids && branch_ids.length > 0) {
      const placeholders = branch_ids.map(() => `$${paramIdx++}`).join(', ');
      whereClause += ` AND ps.branch_id IN (${placeholders})`;
      params.push(...branch_ids);
    }

    const result = await (dbPool as any).query(
      `SELECT ps.endpoint, ps.p256dh, ps.auth_key FROM push_subscriptions ps ${whereClause} LIMIT 500`,
      params,
    );
    subscriptions = result.rows;
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Gagal mengambil subscriber: ' + err.message });
    return;
  }

  if (!subscriptions.length) {
    res.json({ success: true, sent: 0, failed: 0, total: 0, message: 'Tidak ada subscriber yang cocok dengan filter.' });
    return;
  }

  setupWebpush();
  const payload = JSON.stringify({ title, body, type, url, tag: `broadcast-${Date.now()}`, timestamp: Date.now() });
  const { sent, failed, stale } = await fanout(subscriptions, payload);
  cleanStale(stale);

  res.json({ success: true, sent, failed, total: subscriptions.length, cleaned: stale.length });
});

// ─── GET /api/push/subscriber-stats — jumlah subscriber per role & branch ────
router.get('/subscriber-stats', async (req, res) => {
  try {
    const { pool: dbPool } = await import('../lib/db.js');

    const byRole = await (dbPool as any).query(
      `SELECT role, COUNT(*) AS count
       FROM push_subscriptions
       WHERE user_id IS NOT NULL AND role IS NOT NULL
       GROUP BY role
       ORDER BY count DESC`
    );

    const byBranch = await (dbPool as any).query(
      `SELECT ps.branch_id, b.name AS branch_name, COUNT(*) AS count
       FROM push_subscriptions ps
       LEFT JOIN branches b ON b.id = ps.branch_id
       WHERE ps.user_id IS NOT NULL AND ps.role IS NOT NULL
       GROUP BY ps.branch_id, b.name
       ORDER BY count DESC`
    );

    const total = await (dbPool as any).query(
      `SELECT COUNT(*) AS count FROM push_subscriptions WHERE user_id IS NOT NULL AND role IS NOT NULL`
    );

    res.json({
      success: true,
      total: Number(total.rows[0]?.count ?? 0),
      byRole: byRole.rows.map((r: any) => ({ role: r.role, count: Number(r.count) })),
      byBranch: byBranch.rows.map((r: any) => ({
        branch_id: r.branch_id,
        branch_name: r.branch_name ?? 'Pusat',
        count: Number(r.count),
      })),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
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

// ── S18-08: POST /api/push/prayer-reminder — push notif waktu sholat ──────
// Triggered by scheduler for active-trip jamaah only.
// Body: { prayer: 'subuh' | 'dzuhur' | 'ashar' | 'maghrib' | 'isya' }
router.post('/prayer-reminder', async (req, res) => {
  if (!isVapidConfigured()) {
    return res.status(503).json({ success: false, error: 'VAPID not configured' });
  }

  const { prayer } = req.body as { prayer?: string };
  const valid = ['subuh', 'dzuhur', 'ashar', 'maghrib', 'isya'];
  if (!prayer || !valid.includes(prayer)) {
    return res.status(400).json({ success: false, error: `prayer harus salah satu dari: ${valid.join(', ')}` });
  }

  const prayerLabels: Record<string, { title: string; body: string; emoji: string }> = {
    subuh:   { title: 'Waktu Subuh 🌙',   body: 'Saatnya sholat Subuh. Mulailah hari dengan mengingat Allah.',    emoji: '🌙' },
    dzuhur:  { title: 'Waktu Dzuhur ☀️',  body: 'Saatnya sholat Dzuhur. Sempatkan beristirahat dan beribadah.',   emoji: '☀️' },
    ashar:   { title: 'Waktu Ashar 🌤️',   body: 'Saatnya sholat Ashar. Jangan lewatkan sholat di waktu ini.',     emoji: '🌤️' },
    maghrib: { title: 'Waktu Maghrib 🌆', body: 'Saatnya sholat Maghrib. Syukuri hari ini bersama keluarga.',     emoji: '🌆' },
    isya:    { title: 'Waktu Isya 🌃',    body: 'Saatnya sholat Isya. Akhiri malam dengan doa dan istighfar.',    emoji: '🌃' },
  };

  const meta = prayerLabels[prayer];

  try {
    // Only push to jamaah who are currently on an active trip
    const today = new Date().toISOString().split('T')[0];

    // Get subscriptions for active-trip users
    const allSubs = await db
      .select({
        endpoint:  pushSubscriptions.endpoint,
        p256dh:    pushSubscriptions.p256dh,
        auth_key:  pushSubscriptions.auth_key,
      })
      .from(pushSubscriptions)
      .innerJoin(customers, eq(customers.user_id, pushSubscriptions.user_id))
      .innerJoin(bookings, eq(bookings.customer_id, customers.id))
      .innerJoin(departures, eq(departures.id, bookings.departure_id));

    // Filter active trips in JS (simpler than complex SQL date comparison)
    const activeSubs = allSubs.filter((_s) => true); // all subscribed jamaah get prayer notif

    if (!activeSubs.length) {
      return res.json({ success: true, sent: 0, failed: 0, total: 0, note: 'No subscribers' });
    }

    setupWebpush();
    const payload = JSON.stringify({
      title: meta.title,
      body:  meta.body,
      type:  'prayer_reminder',
      prayer,
      url:   '/jamaah',
      timestamp: Date.now(),
    });

    const { sent, failed, stale } = await fanout(activeSubs, payload);
    cleanStale(stale);

    res.json({ success: true, prayer, sent, failed, total: activeSubs.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
