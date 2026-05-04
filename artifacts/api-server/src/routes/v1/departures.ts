import { Router } from 'express';
import { requireApiKey } from '../../middlewares/apiKey.js';
import { supabaseFetch, isSupabaseConfigured } from '../../lib/supabase.js';

const router = Router();

const DEMO_DEPARTURES = [
  {
    id: 'demo-dep-1',
    departure_date: '2025-03-15',
    return_date: '2025-03-24',
    quota: 40,
    booked_count: 12,
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
    booked_count: 30,
    status: 'open',
    price_quad: 26000000,
    price_triple: 29000000,
    package: { id: 'demo-1', name: 'Paket Umroh Reguler', duration_days: 9 },
  },
];

router.get('/', requireApiKey('departures.read'), async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.json({ data: DEMO_DEPARTURES, source: 'demo' });
    }
    const today = new Date().toISOString().split('T')[0];
    const data = await supabaseFetch(
      `/departures?status=eq.open&departure_date=gte.${today}&select=id,departure_date,return_date,quota,booked_count,status,price_quad,price_triple,price_double,price_single,package:packages(id,name,duration_days)&order=departure_date.asc`,
    );
    res.json({ data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
