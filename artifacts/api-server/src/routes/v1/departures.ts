import { Router } from 'express';
import { requireApiKey } from '../../middlewares/apiKey.js';
import { db } from '../../lib/db.js';
import { departures, packages } from '@workspace/db/schema';
import { eq, gte, and } from 'drizzle-orm';

const router = Router();

const DEMO_DEPARTURES = [
  {
    id: 'demo-dep-1',
    departure_date: '2025-03-15',
    return_date: '2025-03-24',
    quota: 40,
    available_seats: 28,
    status: 'open',
    price_quad: 25000000,
    price_triple: 28000000,
    package: { id: 'demo-1', name: 'Paket Umroh Reguler', duration_days: 9 },
  },
  {
    id: 'demo-dep-2',
    departure_date: '2025-04-10',
    return_date: '2025-04-19',
    quota: 35,
    available_seats: 5,
    status: 'open',
    price_quad: 26000000,
    price_triple: 29000000,
    package: { id: 'demo-1', name: 'Paket Umroh Reguler', duration_days: 9 },
  },
];

router.get('/', requireApiKey('departures.read'), async (_req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0]!;
    const rows = await db
      .select({
        id: departures.id,
        departure_date: departures.departureDate,
        return_date: departures.returnDate,
        quota: departures.quota,
        available_seats: departures.availableSeats,
        status: departures.status,
        package_id: departures.packageId,
        package_name: packages.name,
        package_duration_days: packages.durationDays,
      })
      .from(departures)
      .leftJoin(packages, eq(departures.packageId, packages.id))
      .where(
        and(
          eq(departures.status, 'open'),
          gte(departures.departureDate, today),
        ),
      )
      .orderBy(departures.departureDate)
      .limit(100);

    if (rows.length === 0) {
      return res.json({ data: DEMO_DEPARTURES, source: 'demo' });
    }

    const data = rows.map((r) => ({
      id: r.id,
      departure_date: r.departure_date,
      return_date: r.return_date,
      quota: r.quota,
      available_seats: r.available_seats,
      status: r.status,
      package: {
        id: r.package_id,
        name: r.package_name,
        duration_days: r.package_duration_days,
      },
    }));

    return res.json({ data });
  } catch (err: any) {
    return res.json({ data: DEMO_DEPARTURES, source: 'demo', _error: err.message });
  }
});

export default router;
