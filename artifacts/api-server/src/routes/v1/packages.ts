import { Router } from 'express';
import { requireApiKey } from '../../middlewares/apiKey.js';
import { supabaseFetch, isSupabaseConfigured } from '../../lib/supabase.js';

const router = Router();

const DEMO_PACKAGES = [
  {
    id: 'demo-1',
    name: 'Paket Umroh Reguler',
    package_type: 'umroh_reguler',
    duration_days: 9,
    price_quad: 25000000,
    price_triple: 28000000,
    price_double: 32000000,
    price_single: 40000000,
    description: 'Paket umroh reguler dengan fasilitas lengkap dan pembimbing berpengalaman.',
    is_active: true,
  },
  {
    id: 'demo-2',
    name: 'Paket Umroh Plus Istanbul',
    package_type: 'umroh_plus',
    duration_days: 14,
    price_quad: 38000000,
    price_triple: 42000000,
    price_double: 48000000,
    price_single: 60000000,
    description: 'Umroh plus wisata Istanbul — menggabungkan ibadah dan wisata islami.',
    is_active: true,
  },
];

router.get('/', requireApiKey('packages.read'), async (req, res) => {
  try {
    if (!isSupabaseConfigured()) {
      return res.json({ data: DEMO_PACKAGES, source: 'demo' });
    }
    const data = await supabaseFetch(
      '/packages?is_active=eq.true&select=id,name,package_type,duration_days,price_quad,price_triple,price_double,price_single,description,is_active&order=name.asc',
    );
    return res.json({ data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', requireApiKey('packages.read'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!isSupabaseConfigured()) {
      const pkg = DEMO_PACKAGES.find(p => p.id === id);
      if (!pkg) return res.status(404).json({ error: 'Package not found' });
      return res.json({ data: pkg, source: 'demo' });
    }
    const rows = await supabaseFetch(
      `/packages?id=eq.${encodeURIComponent(id as string)}&select=*&limit=1`,
    );
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(404).json({ error: 'Package not found' });
    }
    return res.json({ data: rows[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
