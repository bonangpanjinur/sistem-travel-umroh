import { Router } from 'express';
import { db } from '../../lib/db.js';
import { appSettings, faqs, chatbotLogs } from '@workspace/db/schema';
import { eq, and, sql, or } from 'drizzle-orm';

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

// ─── Default system prompt per channel ───────────────────────────────────────
const DEFAULT_CHANNEL_PROMPTS: Record<string, string> = {
  widget: `Kamu adalah Asisten Virtual Vinstour Travel di website publik. Jawab pertanyaan calon jamaah secara singkat dan menarik. Dorong mereka untuk mendaftar atau menghubungi agen. Gunakan bahasa yang ramah dan persuasif.`,
  jamaah: `Kamu adalah Asisten Virtual Vinstour Travel untuk jamaah yang sudah terdaftar. Bantu mereka dengan pertanyaan spesifik tentang perjalanan mereka: dokumen, jadwal, pembayaran, visa, hotel, dll. Gunakan bahasa yang personal dan supportif.`,
};

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

function findFAQAnswerResult(question: string): { answer: string; isUnanswered: boolean } {
  const q = question.toLowerCase();
  for (const [key, answer] of Object.entries(FAQ_KNOWLEDGE)) {
    if (q.includes(key)) return { answer, isUnanswered: false };
  }
  if (q.includes('haji') || q.includes('porsi'))
    return { answer: 'Untuk haji, cek nomor porsi Anda di menu SISKOHAT → /jamaah/siskohat. Vinstour menyediakan layanan haji khusus dan plus dengan pembimbing berpengalaman.', isUnanswered: false };
  if (q.includes('halo') || q.includes('hi') || q.includes('assalamu') || q.includes('selamat'))
    return { answer: "Wa'alaikumsalam warahmatullahi wabarakatuh! 🌙\n\nSelamat datang di Asisten Virtual Vinstour Travel. Saya siap membantu!\n\nSilakan ajukan pertanyaan Anda.", isUnanswered: false };
  if (q.includes('terima kasih') || q.includes('makasih') || q.includes('jazak'))
    return { answer: 'Wa iyyakum! Jazakallahu khairan 🤲\n\nSemoga perjalanan ibadah Anda menjadi mabrur. Barakallahu fiikum!', isUnanswered: false };
  if (q.includes('chat') || q.includes('whatsapp') || q.includes('pembimbing'))
    return { answer: 'Untuk chat langsung dengan pembimbing, gunakan menu Chat → /jamaah/chat. Tim kami siap membantu 24/7 InsyaAllah! 🤝', isUnanswered: false };
  if (q.includes('sertifikat'))
    return { answer: 'Sertifikat Umroh digital tersedia setelah perjalanan selesai → /jamaah/sertifikat 🎓', isUnanswered: false };
  if (q.includes('referral') || q.includes('promo') || q.includes('bonus'))
    return { answer: 'Program referral tersedia di menu Referral → /jamaah/referral. Ajak keluarga & teman dan dapatkan poin bonus! 🎁', isUnanswered: false };
  if (q.includes('sos') || q.includes('darurat') || q.includes('emergency'))
    return { answer: '🆘 Dalam keadaan darurat, gunakan tombol SOS di portal jamaah Anda. Muthawif dan tim Vinstour akan merespons secepatnya.', isUnanswered: false };
  return {
    answer: `Terima kasih atas pertanyaan Anda 🤲\n\nSaya belum memiliki informasi spesifik tentang hal ini. Silakan:\n1. Chat langsung dengan pembimbing → /jamaah/chat\n2. Buat tiket dukungan → /customer/support\n\nTim kami siap membantu Anda!`,
    isUnanswered: true,
  };
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
  if (!res.ok) {
    const errData: any = await res.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Gemini HTTP ${res.status}`);
  }
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

// ─── Fetch admin-configured system prompt from Neon DB (cached 60s) ───────────
let cachedAdminConfig: {
  systemPrompt: string;
  model: string;
  enableFAQContext: boolean;
  channelPrompts: Record<string, string>;
  geminiApiKey?: string;
  ts: number;
} | null = null;

async function getAdminConfig(): Promise<{
  systemPrompt: string;
  model: string;
  enableFAQContext: boolean;
  channelPrompts: Record<string, string>;
  geminiApiKey?: string;
}> {
  const now = Date.now();
  if (cachedAdminConfig && now - cachedAdminConfig.ts < 60_000) {
    return {
      systemPrompt: cachedAdminConfig.systemPrompt,
      model: cachedAdminConfig.model,
      enableFAQContext: cachedAdminConfig.enableFAQContext,
      channelPrompts: cachedAdminConfig.channelPrompts,
      geminiApiKey: cachedAdminConfig.geminiApiKey,
    };
  }

  const defaults = { systemPrompt: DEFAULT_SYSTEM_PROMPT, model: 'gemini-2.0-flash', enableFAQContext: true, channelPrompts: {} };

  try {
    const rows = await db
      .select({ key: appSettings.key, value: appSettings.value })
      .from(appSettings)
      .where(eq(appSettings.key, 'gemini_chatbot_config'));

    let systemPrompt = DEFAULT_SYSTEM_PROMPT;
    let model = 'gemini-2.0-flash';
    let enableFAQContext = true;
    let channelPrompts: Record<string, string> = {};
    let geminiApiKey: string | undefined;

    for (const row of rows) {
      if (row.key === 'gemini_chatbot_config') {
        try {
          const cfg = JSON.parse(row.value);
          if (cfg.systemPrompt) systemPrompt = cfg.systemPrompt;
          if (cfg.model && ALLOWED_GEMINI_MODELS.has(cfg.model)) model = cfg.model;
          if (typeof cfg.enableFAQContext === 'boolean') enableFAQContext = cfg.enableFAQContext;
          if (cfg.channelPrompts && typeof cfg.channelPrompts === 'object') {
            channelPrompts = cfg.channelPrompts;
          }
          if (cfg.geminiApiKey && typeof cfg.geminiApiKey === 'string') {
            geminiApiKey = cfg.geminiApiKey;
          }
        } catch {}
      }
    }

    cachedAdminConfig = { systemPrompt, model, enableFAQContext, channelPrompts, geminiApiKey, ts: now };
    return { systemPrompt, model, enableFAQContext, channelPrompts, geminiApiKey };
  } catch {
    return defaults;
  }
}

// ─── Fetch published FAQs as knowledge-base context (cached 60s) ──────────────
let cachedFAQContext: { text: string; count: number; ts: number } | null = null;

async function getFAQContext(): Promise<{ text: string; count: number }> {
  const now = Date.now();
  if (cachedFAQContext && now - cachedFAQContext.ts < 60_000) {
    return { text: cachedFAQContext.text, count: cachedFAQContext.count };
  }

  try {
    const faqRows = await db
      .select({ question: faqs.question, answer: faqs.answer, category: faqs.category })
      .from(faqs)
      .where(eq(faqs.isPublished, true))
      .orderBy(faqs.sortOrder)
      .limit(60);

    if (!faqRows.length) {
      cachedFAQContext = { text: '', count: 0, ts: now };
      return { text: '', count: 0 };
    }

    const byCategory: Record<string, Array<{ question: string; answer: string }>> = {};
    for (const faq of faqRows) {
      const cat = faq.category || 'Umum';
      if (!byCategory[cat]) byCategory[cat] = [];
      byCategory[cat].push({ question: faq.question, answer: faq.answer });
    }

    const lines: string[] = ['=== FAQ & KNOWLEDGE BASE ==='];
    for (const [category, items] of Object.entries(byCategory)) {
      lines.push(`\n[${category}]`);
      for (const { question, answer } of items) {
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
    cachedFAQContext = { text, count: faqRows.length, ts: now };
    return { text, count: faqRows.length };
  } catch {
    return { text: '', count: 0 };
  }
}

function invalidateFAQCache() {
  cachedFAQContext = null;
}

function invalidateAdminConfigCache() {
  cachedAdminConfig = null;
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
  isUnanswered?: boolean;
}): Promise<string | null> {
  try {
    const rows = await db
      .insert(chatbotLogs)
      .values({
        sessionId: params.sessionId || null,
        message: params.message,
        answer: params.answer,
        source: params.source,
        userId: params.userId || null,
        customerId: params.customerId || null,
        channel: params.channel || 'jamaah',
        isUnanswered: params.isUnanswered || false,
      })
      .returning({ id: chatbotLogs.id });
    return rows[0]?.id ?? null;
  } catch {
    return null;
  }
}

// ─── POST /api/v1/chatbot ─────────────────────────────────────────────────────
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

    const [adminConfig, faqCtx] = await Promise.all([
      getAdminConfig(),
      getFAQContext(),
    ]);

    const channelSpecificPrompt = adminConfig.channelPrompts[channel] || DEFAULT_CHANNEL_PROMPTS[channel] || '';
    const baseSystemPrompt = clientSystemPrompt || channelSpecificPrompt || adminConfig.systemPrompt;
    const model = (clientModel && ALLOWED_GEMINI_MODELS.has(clientModel)) ? clientModel : adminConfig.model;

    const promptParts: string[] = [baseSystemPrompt];
    if (adminConfig.enableFAQContext && faqCtx.text) {
      promptParts.push(faqCtx.text);
    }
    const systemPrompt = promptParts.join('\n\n');

    let answer = '';
    let source = 'faq';
    let isUnanswered = false;

    // Try Gemini — env var takes priority, DB key as fallback
    let geminiKey = process.env['GEMINI_API_KEY'];
    if (!geminiKey && adminConfig.geminiApiKey) {
      geminiKey = adminConfig.geminiApiKey;
    }
    if (geminiKey) {
      try {
        answer = await callGemini(geminiKey, systemPrompt, message, conversationHistory, model);
        source = 'gemini';
      } catch { /* fall through */ }
    }

    // Try OpenAI
    if (!answer) {
      const openaiKey = process.env['OPENAI_API_KEY'];
      if (openaiKey) {
        try {
          answer = await callOpenAI(openaiKey, systemPrompt, message, conversationHistory);
          source = 'openai';
        } catch { /* fall through */ }
      }
    }

    // Local FAQ fallback
    if (!answer) {
      const result = findFAQAnswerResult(message);
      answer = result.answer;
      source = 'faq';
      isUnanswered = result.isUnanswered;
    }

    const logId = await logToDB({ sessionId, message, answer, source, userId, customerId, channel, isUnanswered });

    return res.json({ answer, source, logId, faqCount: faqCtx.count, isUnanswered });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/v1/chatbot/test ────────────────────────────────────────────────
// Server-side test — validates the GEMINI_API_KEY env var
router.post('/test', async (req: any, res: any) => {
  try {
    const { message = 'Apa saja paket umroh yang tersedia?', model: reqModel } = req.body;
    const geminiKey = process.env['GEMINI_API_KEY'];
    if (!geminiKey) {
      return res.status(400).json({ ok: false, error: 'GEMINI_API_KEY belum dikonfigurasi di environment secrets.' });
    }
    const model = (reqModel && ALLOWED_GEMINI_MODELS.has(reqModel)) ? reqModel : 'gemini-2.0-flash';
    try {
      const answer = await callGemini(geminiKey, DEFAULT_SYSTEM_PROMPT, message, [], model);
      return res.json({ ok: true, answer, model, source: 'gemini' });
    } catch (e: any) {
      return res.status(400).json({ ok: false, error: e.message });
    }
  } catch {
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// ─── GET /api/v1/chatbot/config ───────────────────────────────────────────────
router.get('/config', async (_req: any, res: any) => {
  try {
    const config = await getAdminConfig();
    const geminiKeySet = !!process.env['GEMINI_API_KEY'];
    const isDatabaseKeySet = !!config.geminiApiKey;
    // Do not send the actual API key back to the frontend
    const { geminiApiKey, ...configWithoutKey } = config;
    return res.json({ ...configWithoutKey, geminiKeySet, isDatabaseKeySet });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/v1/chatbot/config ──────────────────────────────────────────────
// Save chatbot config (system prompt, model, etc.) to app_settings
router.post('/config', async (req: any, res: any) => {
  try {
    const { model, systemPrompt, botName, greeting, enableLeadCapture, enableFAQContext, channelPrompts, geminiApiKey } = req.body;

    if (model && !ALLOWED_GEMINI_MODELS.has(model)) {
      return res.status(400).json({ error: 'Model tidak valid.' });
    }

    const cfg: Record<string, any> = {};
    if (systemPrompt !== undefined) cfg.systemPrompt = systemPrompt;
    if (model !== undefined) cfg.model = model;
    if (botName !== undefined) cfg.botName = botName;
    if (greeting !== undefined) cfg.greeting = greeting;
    if (enableLeadCapture !== undefined) cfg.enableLeadCapture = enableLeadCapture;
    if (enableFAQContext !== undefined) cfg.enableFAQContext = enableFAQContext;
    if (channelPrompts !== undefined) cfg.channelPrompts = channelPrompts;
    if (geminiApiKey !== undefined) cfg.geminiApiKey = geminiApiKey;

    await db
      .insert(appSettings)
      .values({ key: 'gemini_chatbot_config', value: JSON.stringify(cfg) })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value: JSON.stringify(cfg), updatedAt: new Date() },
      });

    invalidateAdminConfigCache();
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
}

// ─── PATCH /api/v1/chatbot/rate ───────────────────────────────────────────────
router.patch('/rate', async (req: any, res: any) => {
  const { logId, rating } = req.body;

  if (!logId || (rating !== 1 && rating !== -1)) {
    return res.status(400).json({ error: 'logId dan rating (1 atau -1) wajib diisi.' });
  }

  try {
    await db
      .update(chatbotLogs)
      .set({ rating })
      .where(eq(chatbotLogs.id, logId));
    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/v1/chatbot/invalidate-faq ─────────────────────────────────────
router.post('/invalidate-faq', async (_req: any, res: any) => {
  invalidateFAQCache();
  return res.json({ success: true, message: 'FAQ cache invalidated' });
});

// ─── GET /api/v1/chatbot/faq-status ──────────────────────────────────────────
router.get('/faq-status', async (_req: any, res: any) => {
  const faqCtx = await getFAQContext();
  return res.json({
    faqCount: faqCtx.count,
    hasContext: faqCtx.text.length > 0,
    cachedAt: cachedFAQContext?.ts ? new Date(cachedFAQContext.ts).toISOString() : null,
  });
});

// ─── GET /api/v1/chatbot/channel-prompts ─────────────────────────────────────
router.get('/channel-prompts', async (_req: any, res: any) => {
  const config = await getAdminConfig();
  return res.json({
    channelPrompts: config.channelPrompts,
    defaults: DEFAULT_CHANNEL_PROMPTS,
  });
});

// ─── GET /api/v1/chatbot/stats ────────────────────────────────────────────────
router.get('/stats', async (req: any, res: any) => {
  try {
    const range = Math.min(Math.max(Number(req.query.range) || 14, 1), 90);
    const since = new Date();
    since.setDate(since.getDate() - range);
    const sinceIso = since.toISOString();

    const [total, totalInRange, bySource, bySourceInRange, ratings, unansweredInRange, byDay] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(chatbotLogs),
      db.select({ count: sql<number>`count(*)` }).from(chatbotLogs)
        .where(sql`created_at >= ${sinceIso}`),
      db.select({ source: chatbotLogs.source, count: sql<number>`count(*)` })
        .from(chatbotLogs).groupBy(chatbotLogs.source),
      db.select({ source: chatbotLogs.source, count: sql<number>`count(*)` })
        .from(chatbotLogs).where(sql`created_at >= ${sinceIso}`).groupBy(chatbotLogs.source),
      db.select({
        positive: sql<number>`count(*) filter (where rating = 1)`,
        negative: sql<number>`count(*) filter (where rating = -1)`,
        total: sql<number>`count(*) filter (where rating is not null)`,
      }).from(chatbotLogs),
      db.select({ count: sql<number>`count(*)` }).from(chatbotLogs)
        .where(and(sql`created_at >= ${sinceIso}`, eq(chatbotLogs.isUnanswered, true))),
      db.execute(sql`
        SELECT date_trunc('day', created_at) AS day, source, count(*) AS count
        FROM chatbot_logs
        WHERE created_at >= ${sinceIso}
        GROUP BY 1, 2
        ORDER BY 1
      `),
    ]);

    // Build daily breakdown for the full range
    const dayMap: Record<string, Record<string, number>> = {};
    for (let i = 0; i < range; i++) {
      const d = new Date();
      d.setDate(d.getDate() - (range - 1 - i));
      dayMap[d.toISOString().slice(0, 10)] = { gemini: 0, openai: 0, faq: 0 };
    }
    for (const row of byDay.rows as any[]) {
      const d = new Date(row.day).toISOString().slice(0, 10);
      if (dayMap[d]) dayMap[d][row.source] = Number(row.count);
    }
    const byDayArr = Object.entries(dayMap).map(([date, sources]) => ({
      date,
      gemini: sources.gemini || 0,
      openai: sources.openai || 0,
      faq: sources.faq || 0,
      total: (sources.gemini || 0) + (sources.openai || 0) + (sources.faq || 0),
    }));

    return res.json({
      total: Number(total[0]?.count || 0),
      totalInRange: Number(totalInRange[0]?.count || 0),
      bySource: bySource.map(r => ({ source: r.source, count: Number(r.count) })),
      bySourceInRange: bySourceInRange.map(r => ({ source: r.source, count: Number(r.count) })),
      ratings: {
        positive: Number(ratings[0]?.positive || 0),
        negative: Number(ratings[0]?.negative || 0),
        total: Number(ratings[0]?.total || 0),
      },
      unanswered: Number(unansweredInRange[0]?.count || 0),
      byDay: byDayArr,
      range,
    });
  } catch (e) {
    console.error('stats error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/v1/chatbot/unanswered ───────────────────────────────────────────
router.get('/unanswered', async (req: any, res: any) => {
  try {
    const range = Math.min(Math.max(Number(req.query.range) || 30, 1), 90);
    const since = new Date();
    since.setDate(since.getDate() - range);

    const logs = await db
      .select({ id: chatbotLogs.id, message: chatbotLogs.message, createdAt: chatbotLogs.createdAt })
      .from(chatbotLogs)
      .where(and(eq(chatbotLogs.isUnanswered, true), sql`created_at >= ${since.toISOString()}`))
      .orderBy(sql`created_at desc`)
      .limit(500);

    const map = new Map<string, { normalized: string; display: string; count: number; lastSeen: string; logIds: string[] }>();
    for (const log of logs) {
      if (!log.message?.trim()) continue;
      const key = log.message.toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 100);
      const existing = map.get(key);
      const ts = log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString();
      if (existing) {
        existing.count++;
        existing.logIds.push(log.id);
        if (log.message.length > existing.display.length) existing.display = log.message;
        if (ts > existing.lastSeen) existing.lastSeen = ts;
      } else {
        map.set(key, { normalized: key, display: log.message.trim(), count: 1, lastSeen: ts, logIds: [log.id] });
      }
    }

    const entries = Array.from(map.values())
      .sort((a, b) => b.count - a.count || b.lastSeen.localeCompare(a.lastSeen))
      .slice(0, 15);

    return res.json({ entries, range });
  } catch {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/v1/chatbot/logs ─────────────────────────────────────────────────
router.get('/logs', async (req: any, res: any) => {
  try {
    const page = Math.max(0, Number(req.query.page) || 0);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize) || 30, 1), 200);
    const search = (req.query.search as string || '').trim();
    const source = req.query.source as string || '';
    const channel = req.query.channel as string || '';
    const rating = req.query.rating as string || '';
    const unansweredOnly = req.query.unanswered === '1';

    const conditions: any[] = [];
    if (source) conditions.push(eq(chatbotLogs.source, source));
    if (channel) conditions.push(eq(chatbotLogs.channel, channel));
    if (rating === 'positive') conditions.push(eq(chatbotLogs.rating, 1));
    else if (rating === 'negative') conditions.push(eq(chatbotLogs.rating, -1));
    else if (rating === 'unrated') conditions.push(sql`rating is null`);
    if (unansweredOnly) conditions.push(eq(chatbotLogs.isUnanswered, true));
    if (search) {
      const s = search.replace(/'/g, "''");
      conditions.push(
        or(
          sql`message ilike ${'%' + s + '%'}`,
          sql`answer ilike ${'%' + s + '%'}`,
          sql`session_id ilike ${'%' + s + '%'}`,
        )
      );
    }

    const whereClause = conditions.length > 0
      ? conditions.length === 1
        ? conditions[0]
        : and(...conditions)
      : undefined;

    const [countResult, rows] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(chatbotLogs).where(whereClause),
      db.select({
        id: chatbotLogs.id,
        sessionId: chatbotLogs.sessionId,
        message: chatbotLogs.message,
        answer: chatbotLogs.answer,
        source: chatbotLogs.source,
        rating: chatbotLogs.rating,
        isUnanswered: chatbotLogs.isUnanswered,
        channel: chatbotLogs.channel,
        createdAt: chatbotLogs.createdAt,
      })
        .from(chatbotLogs)
        .where(whereClause)
        .orderBy(sql`created_at desc`)
        .limit(pageSize)
        .offset(page * pageSize),
    ]);

    const total = Number(countResult[0]?.count || 0);
    const logs = rows.map(r => ({
      id: r.id,
      session_id: r.sessionId,
      message: r.message,
      answer: r.answer,
      source: r.source,
      rating: r.rating,
      is_unanswered: r.isUnanswered,
      channel: r.channel,
      created_at: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));

    return res.json({ logs, total, page, pageSize });
  } catch (e) {
    console.error('logs error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/v1/chatbot/sessions/:sessionId ──────────────────────────────────
router.get('/sessions/:sessionId', async (req: any, res: any) => {
  try {
    const { sessionId } = req.params;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required' });

    const rows = await db.select({
      id: chatbotLogs.id,
      sessionId: chatbotLogs.sessionId,
      message: chatbotLogs.message,
      answer: chatbotLogs.answer,
      source: chatbotLogs.source,
      rating: chatbotLogs.rating,
      isUnanswered: chatbotLogs.isUnanswered,
      channel: chatbotLogs.channel,
      createdAt: chatbotLogs.createdAt,
    })
      .from(chatbotLogs)
      .where(eq(chatbotLogs.sessionId, sessionId))
      .orderBy(sql`created_at asc`)
      .limit(200);

    const logs = rows.map(r => ({
      id: r.id,
      session_id: r.sessionId,
      message: r.message,
      answer: r.answer,
      source: r.source,
      rating: r.rating,
      is_unanswered: r.isUnanswered,
      channel: r.channel,
      created_at: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
    }));

    return res.json({ logs, sessionId });
  } catch (e) {
    console.error('session replay error:', e);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/v1/chatbot/faqs ────────────────────────────────────────────────
router.post('/faqs', async (req: any, res: any) => {
  try {
    const { question, answer, category = 'Umum', is_published = true } = req.body;
    if (!question?.trim() || !answer?.trim()) {
      return res.status(400).json({ error: 'question and answer are required' });
    }

    const existing = await db.select({ sortOrder: faqs.sortOrder }).from(faqs)
      .orderBy(sql`sort_order desc`).limit(1);
    const maxOrder = existing[0]?.sortOrder ?? 0;

    const rows = await db.insert(faqs).values({
      question: question.trim(),
      answer: answer.trim(),
      category,
      isPublished: is_published,
      sortOrder: maxOrder + 1,
    }).returning({ id: faqs.id });

    return res.json({ ok: true, id: rows[0]?.id });
  } catch (e: any) {
    return res.status(500).json({ error: e.message || 'Internal server error' });
  }
});

export default router;
