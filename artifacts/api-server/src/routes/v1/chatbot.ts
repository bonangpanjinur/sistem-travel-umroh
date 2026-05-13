import { Router } from 'express';
import { supabaseFetch, isSupabaseConfigured } from '../../lib/supabase.js';

const router = Router();

// ─── Default system prompt ────────────────────────────────────────────────────
const DEFAULT_SYSTEM_PROMPT = `Kamu adalah Asisten Virtual Vinstour Travel — perusahaan perjalanan Umroh dan Haji terpercaya di Indonesia.
Bantu jamaah dengan ramah, sopan, dan informatif dalam Bahasa Indonesia.
Fokus pada: dokumen persyaratan, pembayaran, visa, info hotel, jadwal ibadah, panduan manasik, dan logistik perjalanan.
Gunakan emoji secukupnya. Berikan jawaban ringkas (max 5 kalimat) namun lengkap.
Jika ditanya di luar topik perjalanan umroh/haji, arahkan dengan sopan ke topik yang relevan.
Selalu akhiri dengan ajakan untuk bertanya lebih lanjut jika masih ada yang kurang jelas.

STRUKTUR URL WEBSITE — gunakan format Markdown untuk link yang bisa diklik:
- Daftar semua paket: [Lihat Semua Paket](/packages)
- Portal jamaah: [Portal Jamaah](/jamaah)
- Cek status booking: [Cek Booking](/cek-booking)
- Hubungi kami: [Kontak Kami](/hubungi-kami)
Format link: [teks](/path)`;

// ─── FAQ fallback (tanpa AI) ──────────────────────────────────────────────────
const FAQ_KNOWLEDGE: Record<string, string> = {
  dokumen: `📋 Dokumen yang diperlukan untuk Umroh:\n1. Paspor berlaku min. 6 bulan\n2. KTP & Kartu Keluarga\n3. Buku Nikah (jika suami/istri berangkat bersama)\n4. Akta Lahir (untuk anak di bawah umur)\n5. Pas foto 4×6 background putih, wajah 80%\n6. Sertifikat Vaksin Meningitis\n7. Bukti tabungan (min. Rp 5 juta)\n\nUpload semua dokumen di menu Dokumen → /jamaah/documents ✅`,
  bayar: `💰 Cara Pembayaran:\n1. Transfer Bank ke rekening resmi Vinstour\n2. Virtual Account — nomor VA unik per jamaah\n3. Online via Midtrans (kartu kredit, GoPay, QRIS)\n4. Cicilan Tabungan bertahap\n\nSetelah transfer, upload bukti di menu Riwayat Pembayaran.`,
  visa: `🛂 Proses Visa Umroh:\n1. Submit dokumen lengkap ke admin (2-3 minggu sebelum berangkat)\n2. Admin proses ke kedubes Saudi Arabia\n3. Verifikasi biometrik (sidik jari & foto)\n4. Visa selesai dalam 5-10 hari kerja\n5. Notifikasi via WhatsApp & portal\n\nPantau status visa di Tracker Visa → /jamaah/visa`,
  hotel: `🏨 Info Hotel:\n- Makkah: Bintang 3-5, jarak 50m–1km ke Masjidil Haram sesuai paket\n- Madinah: Bintang 3-5, jarak 100m–500m ke Masjid Nabawi\n\nDetail hotel ada di Itinerary Anda → /jamaah/itinerary`,
  jadwal: `📅 Jadwal Ibadah:\nDurasi umroh 9-14 hari:\n- Makkah: 5-8 hari (Thawaf, Sa'i, dll)\n- Madinah: 3-5 hari (Ziarah, Arbain)\n\nCek itinerary lengkap di /jamaah/itinerary`,
  bagasi: `🧳 Ketentuan Bagasi:\n- Kabin: 7 kg\n- Bagasi terdaftar: 20–32 kg (sesuai maskapai)\n- Tips: bawa pakaian ihram, obat pribadi, air zamzam max 5L di bagasi`,
  ibadah: `🕋 Rukun Umroh:\n1. Ihram dari miqat\n2. Thawaf 7x keliling Ka'bah\n3. Sa'i 7x antara Shafa-Marwah\n4. Tahallul (cukur rambut)\n\nPanduan lengkap di /jamaah/panduan-ibadah`,
  manasik: `🎓 Manasik Digital:\nIkuti jadwal manasik online dan offline yang tersedia di portal Anda → /jamaah/manasik`,
  kesehatan: `🏥 Tips Kesehatan:\n- Vaksin meningitis (wajib) & influenza (dianjurkan)\n- Minum air 3-4 liter/hari, cuaca Saudi 40-50°C\n- Bawa payung, sunscreen, masker, obat pribadi`,
  refund: `💳 Kebijakan Refund:\n- H-90 s.d H-60: refund 75%\n- H-60 s.d H-30: refund 50%\n- H-30 s.d H-7: refund 25%\n- < H-7: tidak ada refund\n\nHubungi admin via CS → /customer/support`,
};

function findFAQAnswer(question: string): string {
  const q = question.toLowerCase();
  for (const [key, answer] of Object.entries(FAQ_KNOWLEDGE)) {
    if (q.includes(key)) return answer;
  }
  if (q.includes('haji') || q.includes('porsi'))
    return 'Untuk haji, cek nomor porsi Anda di menu SISKOHAT → /jamaah/siskohat. Vinstour menyediakan layanan haji khusus dan plus dengan pembimbing berpengalaman.';
  if (q.includes('halo') || q.includes('hi') || q.includes('assalamu') || q.includes('selamat'))
    return "Wa'alaikumsalam warahmatullahi wabarakatuh! 🌙\n\nSelamat datang di Asisten Virtual Vinstour Travel. Saya siap membantu!\n\nSilakan ajukan pertanyaan Anda.";
  if (q.includes('terima kasih') || q.includes('makasih') || q.includes('jazak'))
    return 'Wa iyyakum! Jazakallahu khairan 🤲\n\nSemoga perjalanan ibadah Anda menjadi mabrur. Barakallahu fiikum!';
  if (q.includes('chat') || q.includes('whatsapp') || q.includes('pembimbing'))
    return 'Untuk chat langsung dengan pembimbing, gunakan menu Chat → /jamaah/chat. Tim kami siap membantu 24/7 InsyaAllah! 🤝';
  if (q.includes('sertifikat'))
    return 'Sertifikat Umroh digital tersedia setelah perjalanan selesai → /jamaah/sertifikat 🎓';
  if (q.includes('referral') || q.includes('promo') || q.includes('bonus'))
    return 'Program referral tersedia di menu Referral → /jamaah/referral. Ajak keluarga & teman dan dapatkan poin bonus! 🎁';
  if (q.includes('sos') || q.includes('darurat') || q.includes('emergency'))
    return '🆘 Dalam keadaan darurat, gunakan tombol SOS di portal jamaah Anda. Muthawif dan tim Vinstour akan merespons secepatnya.';
  return `Terima kasih atas pertanyaan Anda 🤲\n\nSaya belum memiliki informasi spesifik tentang hal ini. Silakan:\n1. Chat langsung dengan pembimbing → /jamaah/chat\n2. Buat tiket dukungan → /customer/support\n\nTim kami siap membantu Anda!`;
}

// ─── AI providers ─────────────────────────────────────────────────────────────

const ALLOWED_GEMINI_MODELS = new Set([
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
]);

async function callGemini(
  apiKey: string,
  systemPrompt: string,
  message: string,
  history: any[],
  model = 'gemini-2.0-flash',
): Promise<string> {
  const safeModel = ALLOWED_GEMINI_MODELS.has(model) ? model : 'gemini-2.0-flash';
  const contents = [
    ...history.slice(-8).map((h: any) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    })),
    { role: 'user', parts: [{ text: message }] },
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 600, temperature: 0.7 },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
  const data: any = await res.json();
  const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!answer) throw new Error('Empty Gemini response');
  return answer;
}

async function callOpenAI(apiKey: string, systemPrompt: string, message: string, history: any[]): Promise<string> {
  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-8),
    { role: 'user', content: message },
  ];
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 600, temperature: 0.7 }),
  });
  if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
  const data: any = await res.json();
  const answer = data.choices?.[0]?.message?.content;
  if (!answer) throw new Error('Empty OpenAI response');
  return answer;
}

// ─── Fetch admin-configured system prompt from Supabase (cached 60s) ──────────
let cachedAdminConfig: {
  systemPrompt: string;
  model: string;
  enableFAQContext: boolean;
  ts: number;
} | null = null;

async function getAdminConfig(): Promise<{
  systemPrompt: string;
  model: string;
  enableFAQContext: boolean;
}> {
  const now = Date.now();
  if (cachedAdminConfig && now - cachedAdminConfig.ts < 60_000) {
    return {
      systemPrompt: cachedAdminConfig.systemPrompt,
      model: cachedAdminConfig.model,
      enableFAQContext: cachedAdminConfig.enableFAQContext,
    };
  }
  if (!isSupabaseConfigured()) {
    return { systemPrompt: DEFAULT_SYSTEM_PROMPT, model: 'gemini-2.0-flash', enableFAQContext: true };
  }

  try {
    const rows: any[] = await supabaseFetch(
      `/app_settings?key=in.("gemini_chatbot_config")&select=key,value&limit=1`,
    );
    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    let model = 'gemini-2.0-flash';
    let enableFAQContext = true;
    for (const row of rows || []) {
      if (row.key === 'gemini_chatbot_config') {
        try {
          const cfg = JSON.parse(row.value);
          if (cfg.systemPrompt) systemPrompt = cfg.systemPrompt;
          if (cfg.model && ALLOWED_GEMINI_MODELS.has(cfg.model)) model = cfg.model;
          if (typeof cfg.enableFAQContext === 'boolean') enableFAQContext = cfg.enableFAQContext;
        } catch {}
      }
    }
    cachedAdminConfig = { systemPrompt, model, enableFAQContext, ts: now };
    return { systemPrompt, model, enableFAQContext };
  } catch {
    return { systemPrompt: DEFAULT_SYSTEM_PROMPT, model: 'gemini-2.0-flash', enableFAQContext: true };
  }
}

// ─── Fetch published FAQs as knowledge-base context (cached 60s) ──────────────
let cachedFAQContext: { text: string; count: number; ts: number } | null = null;

async function getFAQContext(): Promise<{ text: string; count: number }> {
  const now = Date.now();
  if (cachedFAQContext && now - cachedFAQContext.ts < 60_000) {
    return { text: cachedFAQContext.text, count: cachedFAQContext.count };
  }
  if (!isSupabaseConfigured()) return { text: '', count: 0 };

  try {
    const faqs: any[] = await supabaseFetch(
      `/faqs?is_published=eq.true&select=question,answer,category&order=sort_order.asc&limit=60`,
    );

    if (!faqs?.length) {
      cachedFAQContext = { text: '', count: 0, ts: now };
      return { text: '', count: 0 };
    }

    // Group by category
    const byCategory: Record<string, Array<{ question: string; answer: string }>> = {};
    for (const faq of faqs) {
      const cat = (faq.category as string) || 'Umum';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({ question: faq.question, answer: faq.answer });
    }

    const lines: string[] = ['=== FAQ & KNOWLEDGE BASE ==='];
    for (const [category, items] of Object.entries(byCategory)) {
      lines.push(`\n[${category}]`);
      for (const { question, answer } of items) {
        // Strip HTML tags and collapse whitespace
        const cleanAnswer = answer
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        lines.push(`T: ${question}`);
        lines.push(`J: ${cleanAnswer}`);
      }
    }
    lines.push('\n=== AKHIR FAQ ===');
    lines.push(
      'Gunakan FAQ di atas sebagai referensi utama. ' +
      'Jika pertanyaan sesuai FAQ, jawab berdasarkan data tersebut. ' +
      'Jika tidak ada dalam FAQ, gunakan pengetahuan umum tentang umroh/haji.',
    );

    const text = lines.join('\n');
    cachedFAQContext = { text, count: faqs.length, ts: now };
    return { text, count: faqs.length };
  } catch {
    return { text: '', count: 0 };
  }
}

// ─── Invalidate FAQ cache (called after admin saves FAQ) ─────────────────────
function invalidateFAQCache() {
  cachedFAQContext = null;
}

// ─── Log message pair to chatbot_logs (fire-and-forget) ──────────────────────
async function logToDB(params: {
  sessionId?: string;
  message: string;
  answer: string;
  source: string;
  userId?: string;
  customerId?: string;
  channel?: string;
}): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const rows: any[] = await supabaseFetch('/chatbot_logs', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        session_id:  params.sessionId  || null,
        message:     params.message,
        answer:      params.answer,
        source:      params.source,
        user_id:     params.userId     || null,
        customer_id: params.customerId || null,
        channel:     params.channel    || 'jamaah',
      }),
    });
    return rows?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

// ─── POST /api/v1/chatbot ─────────────────────────────────────────────────────
// Body: { message, conversationHistory?, systemPrompt?, model?, sessionId?, userId?, customerId?, channel? }
router.post('/', async (req: any, res: any) => {
  try {
    const {
      message,
      conversationHistory = [],
      systemPrompt: clientSystemPrompt,
      model: clientModel,
      sessionId,
      userId,
      customerId,
      channel = 'jamaah',
    } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Fetch admin config and FAQ context concurrently
    const [adminConfig, faqCtx] = await Promise.all([
      getAdminConfig(),
      getFAQContext(),
    ]);

    // Client-provided system prompt takes priority (allows per-widget customisation)
    const baseSystemPrompt = clientSystemPrompt || adminConfig.systemPrompt;
    const model = (clientModel && ALLOWED_GEMINI_MODELS.has(clientModel)) ? clientModel : adminConfig.model;

    // ── Build enriched system prompt: base + FAQ knowledge base ──────────────
    const promptParts: string[] = [baseSystemPrompt];

    if (adminConfig.enableFAQContext && faqCtx.text) {
      promptParts.push(faqCtx.text);
    }

    const systemPrompt = promptParts.join('\n\n');

    let answer = '';
    let source = 'faq';

    // Try Gemini (env key) ────────────────────────────────────────────────────
    const geminiKey = process.env['GEMINI_API_KEY'];
    if (geminiKey) {
      try {
        answer = await callGemini(geminiKey, systemPrompt, message, conversationHistory, model);
        source = 'gemini';
      } catch { /* fall through */ }
    }

    // Try OpenAI ──────────────────────────────────────────────────────────────
    if (!answer) {
      const openaiKey = process.env['OPENAI_API_KEY'];
      if (openaiKey) {
        try {
          answer = await callOpenAI(openaiKey, systemPrompt, message, conversationHistory);
          source = 'openai';
        } catch { /* fall through */ }
      }
    }

    // Local FAQ fallback ──────────────────────────────────────────────────────
    if (!answer) {
      answer = findFAQAnswer(message);
      source = 'faq';
    }

    // Log to DB (fire-and-forget — don't block the response) ─────────────────
    const logId = await logToDB({ sessionId, message, answer, source, userId, customerId, channel });

    return res.json({ answer, source, logId, faqCount: faqCtx.count });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/v1/chatbot/rate ───────────────────────────────────────────────
// Body: { logId, rating }  — 1 = 👍  -1 = 👎
router.patch('/rate', async (req: any, res: any) => {
  const { logId, rating } = req.body;

  if (!logId || (rating !== 1 && rating !== -1)) {
    return res.status(400).json({ error: 'logId dan rating (1 atau -1) wajib diisi.' });
  }
  if (!isSupabaseConfigured()) {
    return res.status(503).json({ error: 'Supabase belum dikonfigurasi.' });
  }

  try {
    await supabaseFetch(`/chatbot_logs?id=eq.${logId}`, {
      method: 'PATCH',
      body: JSON.stringify({ rating }),
    });
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/v1/chatbot/invalidate-faq ─────────────────────────────────────
// Called by admin after saving FAQ to immediately refresh the cache
router.post('/invalidate-faq', async (_req: any, res: any) => {
  invalidateFAQCache();
  return res.json({ success: true, message: 'FAQ cache invalidated' });
});

// ─── GET /api/v1/chatbot/faq-status ──────────────────────────────────────────
// Returns current FAQ cache status
router.get('/faq-status', async (_req: any, res: any) => {
  const faqCtx = await getFAQContext();
  return res.json({
    faqCount: faqCtx.count,
    hasContext: faqCtx.text.length > 0,
    cachedAt: cachedFAQContext?.ts ? new Date(cachedFAQContext.ts).toISOString() : null,
  });
});

export default router;
