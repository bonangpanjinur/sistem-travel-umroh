import { Router } from 'express';
import { requireApiKey } from '../../middlewares/apiKey.js';
import { supabaseFetch, isSupabaseConfigured } from '../../lib/supabase.js';

const router = Router();

router.post('/', requireApiKey('leads.write'), async (req, res) => {
  try {
    const { name, phone, email, package_interest, message, source } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required' });
    }

    const payload = {
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: email ? String(email).trim() : null,
      package_id: package_interest || null,
      notes: message ? String(message).trim() : null,
      source: source || 'api',
      status: 'new',
    };

    if (!isSupabaseConfigured()) {
      return res.status(201).json({
        data: { id: crypto.randomUUID(), ...payload, created_at: new Date().toISOString() },
        source: 'demo',
        message: 'Lead recorded (demo mode — connect Supabase to persist)',
      });
    }

    const rows = await supabaseFetch('/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const created = Array.isArray(rows) ? rows[0] : rows;
    return res.status(201).json({ data: created });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
