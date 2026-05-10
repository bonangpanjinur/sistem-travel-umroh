import { Router } from 'express';
import { requireApiKey } from '../../middlewares/apiKey.js';
import { db } from '../../lib/db.js';
import { packages } from '@workspace/db/schema';
import { eq } from 'drizzle-orm';

const router = Router();

const DEMO_PACKAGES = [
  {
    id: 'demo-1',
    name: 'Paket Umroh Reguler',
    type: 'umroh',
    duration_days: 9,
    price_quad: 25000000,
    price_triple: 28000000,
    price_double: 32000000,
    price: 40000000,
    description: 'Paket umroh reguler dengan fasilitas lengkap dan pembimbing berpengalaman.',
    is_active: true,
  },
  {
    id: 'demo-2',
    name: 'Paket Umroh Plus Istanbul',
    type: 'umroh_plus',
    duration_days: 14,
    price_quad: 38000000,
    price_triple: 42000000,
    price_double: 48000000,
    price: 60000000,
    description: 'Umroh plus wisata Istanbul — menggabungkan ibadah dan wisata islami.',
    is_active: true,
  },
];

router.get('/', requireApiKey('packages.read'), async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: packages.id,
        name: packages.name,
        type: packages.type,
        duration_days: packages.durationDays,
        price_quad: packages.priceQuad,
        price_triple: packages.priceTriple,
        price_double: packages.priceDouble,
        price: packages.price,
        description: packages.description,
        is_active: packages.isActive,
      })
      .from(packages)
      .where(eq(packages.isActive, true))
      .orderBy(packages.name);

    if (rows.length === 0) {
      return res.json({ data: DEMO_PACKAGES, source: 'demo' });
    }
    return res.json({ data: rows });
  } catch (err: any) {
    // Fall back to demo data if DB query fails
    return res.json({ data: DEMO_PACKAGES, source: 'demo', _error: err.message });
  }
});

router.get('/:id', requireApiKey('packages.read'), async (req, res) => {
  try {
    const { id } = req.params;
    const rows = await db
      .select()
      .from(packages)
      .where(eq(packages.id, id as string))
      .limit(1);

    if (rows.length === 0) {
      const demo = DEMO_PACKAGES.find(p => p.id === id);
      if (demo) return res.json({ data: demo, source: 'demo' });
      return res.status(404).json({ error: 'Package not found' });
    }
    return res.json({ data: rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
