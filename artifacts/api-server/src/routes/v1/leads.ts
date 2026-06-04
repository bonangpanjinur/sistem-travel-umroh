import { Router } from 'express';
import { requireApiKey } from '../../middlewares/apiKey.js';
import { db } from '../../lib/db.js';
import { leads } from '@workspace/db/schema';

const router = Router();

router.post('/', requireApiKey('leads.write'), async (req, res) => {
  try {
    const { name, phone, email, package_interest, message, source } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: 'name and phone are required' });
    }

    const inserted = await db
      .insert(leads)
      .values({
        name: String(name).trim(),
        phone: String(phone).trim(),
        email: email ? String(email).trim() : null,
        packageId: package_interest || null,
        notes: message ? String(message).trim() : null,
        source: source || 'api',
        status: 'new',
      })
      .returning();

    return res.status(201).json({ data: inserted[0] });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
