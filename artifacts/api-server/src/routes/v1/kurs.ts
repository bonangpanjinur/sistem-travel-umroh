import { Router } from 'express';

const kursRouter = Router();

// SAR tidak tersedia di Frankfurter (ECB) — SAR dipatok tetap ke USD (1 USD = 3.75 SAR)
// Ambil mata uang ECB terlebih dahulu, lalu hitung SAR dari USD
const ECB_CURRENCIES = ['USD', 'EUR', 'MYR', 'SGD', 'GBP'];
const SAR_USD_PEG = 3.75; // 1 USD = 3.75 SAR (peg resmi Arab Saudi)

// Cache sederhana — update tiap 1 jam
let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 60 * 60 * 1000; // 1 jam

kursRouter.get('/', async (_req, res) => {
  try {
    // Gunakan cache jika masih segar
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return res.json(cache.data);
    }

    const url = `https://api.frankfurter.app/latest?from=IDR&to=${ECB_CURRENCIES.join(',')}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Frankfurter API error: ${response.status}`);
    }

    const data = await response.json() as { rates: Record<string, number>; [key: string]: unknown };

    // Hitung SAR dari USD: 1 IDR = X USD, maka 1 IDR = X * 3.75 SAR
    const usdRate = data.rates['USD'] ?? 0;
    const sarRate = usdRate * SAR_USD_PEG;
    data.rates['SAR'] = sarRate;

    cache = { data, timestamp: Date.now() };
    return res.json(data);
  } catch (err) {
    // Jika gagal dan ada cache lama, kembalikan cache
    if (cache) {
      return res.json({ ...(cache.data as object), _stale: true });
    }
    return res.status(502).json({ error: 'Gagal mengambil data kurs', detail: String(err) });
  }
});

export default kursRouter;
