import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useChatbotFollowup, loadFollowupData, extractActionItems } from "@/hooks/useChatbotFollowup";
import { Link } from "react-router-dom";
import {
  Bot, Send, User, RefreshCcw, Home, ChevronRight,
  Sparkles, ThumbsUp, ThumbsDown, Copy,
  FileText, Share2, Download, Loader2, X, CheckCheck,
  Bell, BellOff, Clock, ArrowRight
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import jsPDF from "jspdf";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  liked?: boolean | null;
  logId?: string | null;
}

interface SummaryData {
  topics: string[];
  keyPoints: string[];
  indonesianSummary: string;
  generatedAt: Date;
}

const FAQ_KNOWLEDGE_BASE: Record<string, string> = {
  "dokumen": `📋 *Dokumen yang diperlukan untuk Umroh:*

1. **Paspor** — berlaku minimal 6 bulan dari tanggal keberangkatan
2. **KTP** (Kartu Tanda Penduduk)
3. **Kartu Keluarga** (KK)
4. **Buku Nikah** (bagi suami/istri yang berangkat bersama)
5. **Akta Lahir** (untuk anak yang belum menikah)
6. **Pas foto** — 4×6 cm, background putih, wajah 80% foto
7. **Sertifikat Vaksin Meningitis** dari Puskesmas/RS resmi
8. **Bukti tabungan** (untuk visa — saldo min. Rp 5 juta)

Pastikan semua dokumen di-scan dan di-upload ke portal jamaah ✅`,

  "bayar": `💰 *Cara pembayaran di Vinstour Travel:*

1. **Transfer Bank** — Transfer ke rekening Vinstour sesuai nominal
2. **Virtual Account** — Setiap jamaah mendapat nomor VA unik
3. **Online via Midtrans** — Kartu kredit, GoPay, QRIS, dll
4. **Cicilan Tabungan** — Program menabung bertahap

Setelah transfer, upload bukti di menu **Riwayat Pembayaran** atau hubungi admin untuk konfirmasi.

📞 Butuh bantuan? Chat dengan tim kami di menu **Chat** portal jamaah.`,

  "visa": `🛂 *Proses Visa Umroh:*

1. Submit dokumen lengkap ke admin (2-3 minggu sebelum berangkat)
2. Admin proses pengajuan visa ke kedubes Saudi Arabia
3. Verifikasi biometrik (sidik jari & foto) di kantor Kemenag
4. Visa biasanya selesai dalam **5-10 hari kerja**
5. Jamaah akan diberitahu via WhatsApp & portal

Pantau status visa di menu **Tracker Visa** → */jamaah/visa*`,

  "hotel": `🏨 *Info Hotel di Saudi Arabia:*

**Makkah:**
- Hotel bintang 3-5 sesuai paket yang dipilih
- Jarak ke Masjidil Haram: 50m–1km tergantung paket
- Fasilitas: AC, restoran halal, WiFi

**Madinah:**
- Hotel bintang 3-5 sesuai paket
- Jarak ke Masjid Nabawi: 100m–500m tergantung paket
- Program Arbain (40 sholat berjamaah) tersedia

Detail hotel Anda bisa dilihat di menu **Itinerary** portal jamaah.`,

  "jadwal": `📅 *Jadwal & Itinerary Umroh:*

Durasi umroh biasanya **9-14 hari** tergantung paket:
- Makkah: 5-8 hari (Thawaf, Sa'i, Wukuf, dll)
- Madinah: 3-5 hari (Ziarah, Arbain)
- Transit: 1-2 hari

Cek itinerary lengkap Anda di menu **Itinerary** → */jamaah/itinerary*`,

  "bagasi": `🧳 *Ketentuan Bagasi Umroh:*

**Bagasi Kabin:** 7 kg
**Bagasi Terdaftar:** 20–32 kg (sesuai maskapai & paket)

Tips packing:
- Pakaian ihram (2 set untuk pria)
- Pakaian tertutup & sopan
- Obat-obatan pribadi
- Air zam-zam boleh dibawa (max 5 liter di bagasi)
- Hindari bawa cairan >100ml di kabin

Cek status bagasi di menu **Status Bagasi** → */jamaah/bagasi*`,

  "ibadah": `🕋 *Panduan Ibadah Umroh:*

**Rukun Umroh:**
1. Ihram dari miqat
2. Thawaf (7x putaran Kabah)
3. Sa'i (7x antara Shafa–Marwa)
4. Tahallul (cukur rambut)

**Tips:**
- Pelajari doa-doa di menu *Doa & Panduan* → */jamaah/doa-panduan*
- Cek panduan lengkap di *Panduan Ibadah* → */jamaah/panduan-ibadah*
- Waktu terbaik thawaf: subuh & malam (lebih sepi)`,

  "zakat": `💝 *Informasi Zakat:*

Kalkulator zakat tersedia di menu **Kalkulator Zakat** → */jamaah/kalkulator-zakat*

**Zakat Fitrah:** Rp 40.000–60.000/orang (setara 2,5 kg beras)
**Zakat Maal:** 2,5% dari harta jika telah mencapai nisab (85 gram emas)
**Fidyah:** Rp 45.000/hari (untuk yang tidak bisa berpuasa)

Di Saudi Arabia, bisa bayar zakat langsung ke panitia zakat setempat.`,

  "kesehatan": `🏥 *Tips Kesehatan di Saudi Arabia:*

**Persiapan:**
- Vaksin meningitis (wajib)
- Vaksin influenza (dianjurkan)
- Bawa obat rutin secukupnya

**Di sana:**
- Cuaca sangat panas (40-50°C di musim panas)
- Minum air minimal 3-4 liter/hari
- Gunakan payung, sunscreen, masker
- Istirahat cukup, jangan memaksakan diri

Panduan kesehatan lengkap di *Panduan Ibadah* → tab Kesehatan`,

  "refund": `💳 *Kebijakan Refund & Pembatalan:*

- Pembatalan H-90 s.d H-60: Refund 75%
- Pembatalan H-60 s.d H-30: Refund 50%
- Pembatalan H-30 s.d H-7: Refund 25%
- Pembatalan < H-7: Tidak ada refund

Untuk pembatalan, hubungi tim admin segera melalui:
📞 WA: +62-xxx-xxxx-xxxx
📧 Email: cs@vinstour.id
🎟️ Buka tiket di *Hubungi Kami* → */customer/support*`,
};

const TOPIC_MAP: Record<string, string> = {
  dokumen: "Dokumen & Persyaratan",
  paspor: "Dokumen & Persyaratan",
  bayar: "Pembayaran & Cicilan",
  cicil: "Pembayaran & Cicilan",
  transfer: "Pembayaran & Cicilan",
  visa: "Proses Visa",
  hotel: "Info Hotel",
  jadwal: "Jadwal & Itinerary",
  itinerary: "Jadwal & Itinerary",
  bagasi: "Ketentuan Bagasi",
  ibadah: "Panduan Ibadah",
  thawaf: "Panduan Ibadah",
  tawaf: "Panduan Ibadah",
  zakat: "Zakat & Infaq",
  kesehatan: "Tips Kesehatan",
  haji: "Informasi Haji",
  refund: "Pembatalan & Refund",
  batal: "Pembatalan & Refund",
  sertifikat: "Sertifikat Umroh",
  referral: "Program Referral",
};

const SUGGESTED_QUESTIONS = [
  "Dokumen apa saja yang diperlukan?",
  "Bagaimana cara bayar cicilan?",
  "Berapa lama proses visa?",
  "Info hotel di Makkah?",
  "Ketentuan bagasi berapa kg?",
  "Panduan ibadah umroh?",
];

function findLocalAnswer(question: string): string {
  const q = question.toLowerCase();
  for (const [keyword, answer] of Object.entries(FAQ_KNOWLEDGE_BASE)) {
    if (q.includes(keyword)) return answer;
  }
  if (q.includes("haji")) return "Untuk informasi haji, cek nomor porsi Anda di menu **SISKOHAT** → */jamaah/siskohat*. Vinstour menyediakan layanan haji khusus dan plus yang bisa Anda lihat di halaman Paket.";
  if (q.includes("wa") || q.includes("whatsapp") || q.includes("chat")) return "Untuk chat langsung dengan pembimbing, gunakan menu **Chat** di portal jamaah → */jamaah/chat*. Tim kami siap membantu 24/7 InsyaAllah.";
  if (q.includes("sertifikat")) return "Sertifikat Umroh digital tersedia setelah perjalanan selesai di menu **Sertifikat** → */jamaah/sertifikat*";
  if (q.includes("referral")) return "Program referral tersedia di menu **Referral** → */jamaah/referral*. Ajak teman dan dapatkan poin bonus!";
  if (q.includes("halo") || q.includes("hi") || q.includes("assalamu") || q.includes("selamat")) return "Wa'alaikumsalam warahmatullahi wabarakatuh! 🌙\n\nSelamat datang di Chatbot Vinstour Travel. Saya siap membantu Anda dengan pertanyaan seputar:\n\n• Dokumen & persyaratan\n• Pembayaran & cicilan\n• Proses visa\n• Info hotel & jadwal\n• Panduan ibadah\n• Dan masih banyak lagi!\n\nSilakan ketik pertanyaan Anda atau pilih dari pertanyaan yang tersedia di bawah.";
  if (q.includes("terima kasih") || q.includes("makasih") || q.includes("jazak")) return "Wa iyyakum! Jazakallahu khairan 🤲\n\nJika ada pertanyaan lain, jangan ragu untuk bertanya. Semoga perjalanan ibadah Anda menjadi berkah dan mabrur. Barakallahu fiikum!";
  return `Terima kasih atas pertanyaan Anda 🤲\n\nSaya belum menemukan jawaban spesifik untuk pertanyaan tersebut. Silakan:\n\n1. Coba pertanyaan lain yang lebih spesifik\n2. Chat langsung dengan pembimbing → */jamaah/chat*\n3. Buat tiket dukungan → */customer/support*\n\nTim kami siap membantu Anda dengan lebih detail!`;
}

function buildLocalSummary(messages: Message[]): SummaryData {
  const userMessages = messages.filter(m => m.role === "user");
  const topicSet = new Set<string>();

  for (const msg of userMessages) {
    const q = msg.content.toLowerCase();
    for (const [kw, label] of Object.entries(TOPIC_MAP)) {
      if (q.includes(kw)) topicSet.add(label);
    }
  }

  const topics = Array.from(topicSet);
  const keyQAs = messages
    .filter(m => m.role === "user")
    .slice(0, 5)
    .map(m => m.content.trim())
    .filter(q => q.length > 5 && !q.toLowerCase().includes("halo") && !q.toLowerCase().includes("assalam"));

  const keyPoints = messages
    .filter(m => m.role === "assistant")
    .slice(1, 5)
    .map(m =>
      m.content
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/\*(.*?)\*/g, "$1")
        .split("\n")
        .find(l => l.trim().length > 20)?.trim() ?? ""
    )
    .filter(Boolean);

  const topicText = topics.length > 0
    ? `Dalam sesi ini, jamaah mendapatkan informasi mengenai: ${topics.join(", ")}.`
    : "Jamaah telah berkonsultasi dengan asisten virtual Vinstour Travel.";

  const countText = `Total ${userMessages.length} pertanyaan diajukan dan ${messages.filter(m => m.role === "assistant").length - 1} jawaban diberikan.`;

  const indonesianSummary = `${topicText} ${countText} Semoga informasi yang diberikan bermanfaat dan memperlancar persiapan ibadah. Barakallahu fiikum.`;

  return { topics, keyPoints, indonesianSummary, generatedAt: new Date() };
}

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";
const CHATBOT_STORAGE_KEY = "vinstour-chatbot-history";

const DEFAULT_GREETING: Message = {
  id: "1",
  role: "assistant",
  content: "Assalamu'alaikum warahmatullahi wabarakatuh! 🌙\n\nSaya adalah Asisten Virtual Vinstour Travel. Saya siap membantu Anda dengan pertanyaan seputar:\n\n• 📋 Dokumen & persyaratan\n• 💰 Pembayaran & cicilan\n• 🛂 Proses visa\n• 🏨 Info hotel & jadwal\n• 🕋 Panduan ibadah\n• 🧳 Ketentuan bagasi\n\nSilakan ketik pertanyaan Anda!",
  timestamp: new Date(),
};

function loadChatbotHistory(): Message[] {
  try {
    const saved = localStorage.getItem(CHATBOT_STORAGE_KEY);
    if (!saved) return [DEFAULT_GREETING];
    const parsed: any[] = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return [DEFAULT_GREETING];
    return parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) }));
  } catch {
    return [DEFAULT_GREETING];
  }
}

// Session ID persisted per browser tab so ratings can be linked
const CHATBOT_SESSION_ID = (() => {
  try {
    const k = "vinstour-chatbot-session";
    const existing = sessionStorage.getItem(k);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(k, id);
    return id;
  } catch {
    return "unknown";
  }
})();

async function fetchAIAnswer(
  message: string,
  history: { role: string; content: string }[],
  userId?: string
): Promise<{ answer: string; source: "ai" | "faq"; logId?: string | null }> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/chatbot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        conversationHistory: history,
        sessionId: CHATBOT_SESSION_ID,
        userId: userId ?? null,
        channel: "jamaah",
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    return { answer: data.answer, source: data.source === "faq" ? "faq" : "ai", logId: data.logId ?? null };
  } catch {
    return { answer: findLocalAnswer(message), source: "faq", logId: null };
  }
}

async function persistRating(logId: string, rating: 1 | -1): Promise<void> {
  try {
    await fetch(`${API_BASE}/api/v1/chatbot/rate`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logId, rating }),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    // non-critical
  }
}

async function fetchAISummary(messages: Message[]): Promise<string | null> {
  try {
    const conversation = messages
      .slice(1)
      .map(m => `${m.role === "user" ? "Jamaah" : "Asisten"}: ${m.content}`)
      .join("\n\n");
    const prompt = `Buat ringkasan percakapan berikut dalam Bahasa Indonesia yang singkat, jelas, dan bermanfaat (maksimal 4 kalimat). Sebutkan topik-topik utama yang dibahas dan poin-poin penting yang perlu diingat jamaah:\n\n${conversation}`;
    const res = await fetch(`${API_BASE}/api/v1/chatbot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, conversationHistory: [] }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error();
    const data = await res.json();
    return data.answer ?? null;
  } catch {
    return null;
  }
}

function stripMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/→ \*(.*?)\*/g, "→ $1")
    .replace(/#+\s/g, "")
    .trim();
}

const FOLLOWUP_DISMISSED_KEY = "vinstour-followup-card-dismissed";

export default function JamaahChatbot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>(loadChatbotHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(false);

  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [aiSummaryText, setAiSummaryText] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [copied, setCopied] = useState(false);

  // Follow-up reminder card state
  const [followupCardDismissed, setFollowupCardDismissed] = useState(
    () => sessionStorage.getItem(FOLLOWUP_DISMISSED_KEY) === "1"
  );
  const [schedulingFollowup, setSchedulingFollowup] = useState(false);

  const messageFeed = messages.map(m => ({ role: m.role, content: m.content }));
  const { scheduleFollowup, cancelFollowup, isScheduled } = useChatbotFollowup({
    messages: messageFeed,
    enabled: true,
  });

  const bottomRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    try {
      localStorage.setItem(CHATBOT_STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  async function sendMessage(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    const history = messages.slice(-8).map(m => ({ role: m.role, content: m.content }));
    const { answer, source, logId } = await fetchAIAnswer(msg, history, user?.id);
    if (source === "ai" && !aiMode) setAiMode(true);
    const botMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: answer,
      timestamp: new Date(),
      logId: logId ?? null,
    };
    setMessages(prev => [...prev, botMsg]);
    setLoading(false);
  }

  function rateMessage(msgId: string, liked: boolean) {
    setMessages(prev => prev.map(m => {
      if (m.id !== msgId) return m;
      // Persist to DB if we have a logId
      if (m.logId) persistRating(m.logId, liked ? 1 : -1);
      return { ...m, liked };
    }));
    toast.success(liked ? "Terima kasih atas feedback positifnya!" : "Terima kasih, kami akan terus meningkatkan kualitas jawaban");
  }

  function copyMessage(content: string) {
    navigator.clipboard.writeText(content);
    toast.success("Pesan disalin");
  }

  function clearChat() {
    const fresh: Message[] = [{
      id: Date.now().toString(),
      role: "assistant",
      content: "Chat baru dimulai. Silakan ajukan pertanyaan Anda! 🌙",
      timestamp: new Date(),
    }];
    setMessages(fresh);
    setSummaryData(null);
    setAiSummaryText(null);
    setFollowupCardDismissed(false);
    sessionStorage.removeItem(FOLLOWUP_DISMISSED_KEY);
    try { localStorage.setItem(CHATBOT_STORAGE_KEY, JSON.stringify(fresh)); } catch {}
  }

  function dismissFollowupCard() {
    setFollowupCardDismissed(true);
    sessionStorage.setItem(FOLLOWUP_DISMISSED_KEY, "1");
  }

  async function handleScheduleFollowup() {
    setSchedulingFollowup(true);
    await scheduleFollowup(messageFeed);
    setSchedulingFollowup(false);
    dismissFollowupCard();
  }

  async function openSummary() {
    const userMsgCount = messages.filter(m => m.role === "user").length;
    if (userMsgCount === 0) {
      toast.info("Belum ada percakapan untuk dirangkum. Mulai bertanya dahulu!");
      return;
    }
    setShowSummary(true);
    setGeneratingSummary(true);
    const local = buildLocalSummary(messages);
    setSummaryData(local);
    const aiText = await fetchAISummary(messages);
    setAiSummaryText(aiText);
    setGeneratingSummary(false);
  }

  function getSummaryText(): string {
    const sd = summaryData;
    if (!sd) return "";
    const dateStr = format(sd.generatedAt, "d MMMM yyyy, HH:mm", { locale: localeId });
    const lines = [
      "بسم الله الرحمن الرحيم",
      "",
      "RINGKASAN PERCAKAPAN",
      "Asisten Virtual Vinstour Travel",
      `Tanggal: ${dateStr}`,
      "",
      "--- TOPIK YANG DIBAHAS ---",
      sd.topics.length > 0 ? sd.topics.map(t => `• ${t}`).join("\n") : "• Konsultasi umum",
      "",
      "--- RINGKASAN ---",
      aiSummaryText ?? sd.indonesianSummary,
      ...(sd.keyPoints.length > 0 ? [
        "",
        "--- POIN PENTING ---",
        sd.keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n"),
      ] : []),
      "",
      "---",
      "Vinstour Travel | cs@vinstour.id",
      "Semoga ibadah Anda menjadi mabrur. Aamiin.",
    ];
    return lines.join("\n");
  }

  async function shareSummary() {
    const text = getSummaryText();
    if (!text) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Ringkasan Konsultasi Umroh — Vinstour",
          text,
        });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        toast.success("Ringkasan disalin ke clipboard!");
      }
    } catch {}
  }

  function downloadPDF() {
    if (!summaryData) return;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentW = pageW - margin * 2;
    let y = 20;

    const addText = (text: string, opts: {
      size?: number; bold?: boolean; color?: [number, number, number];
      align?: "left" | "center" | "right"; maxW?: number;
    } = {}) => {
      doc.setFontSize(opts.size ?? 11);
      doc.setFont("helvetica", opts.bold ? "bold" : "normal");
      doc.setTextColor(...(opts.color ?? [30, 30, 30]));
      const lines = doc.splitTextToSize(text, opts.maxW ?? contentW);
      const lineH = (opts.size ?? 11) * 0.45;
      if (y + lines.length * lineH > 275) { doc.addPage(); y = 20; }
      doc.text(lines, opts.align === "center" ? pageW / 2 : margin, y, { align: opts.align ?? "left" });
      y += lines.length * lineH + 2;
    };

    const addSpacer = (h = 4) => { y += h; };

    const addHRule = () => {
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.3);
      doc.line(margin, y, pageW - margin, y);
      y += 5;
    };

    const dateStr = format(summaryData.generatedAt, "d MMMM yyyy, HH:mm", { locale: localeId });

    doc.setFillColor(79, 56, 170);
    doc.rect(0, 0, pageW, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Ringkasan Percakapan", margin, 17);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Asisten Virtual Vinstour Travel", margin, 25);
    doc.text(`Tanggal: ${dateStr}`, margin, 31);
    y = 48;

    addText("Bismillahirrahmanirrahim", { size: 13, bold: true, color: [79, 56, 170], align: "center" });
    addSpacer(3);
    addHRule();

    addText("Topik yang Dibahas", { size: 12, bold: true, color: [79, 56, 170] });
    addSpacer(1);
    if (summaryData.topics.length > 0) {
      for (const t of summaryData.topics) {
        addText(`• ${t}`, { size: 10 });
      }
    } else {
      addText("• Konsultasi umum Umroh & Haji", { size: 10 });
    }
    addSpacer(4);

    addHRule();
    addText("Ringkasan", { size: 12, bold: true, color: [79, 56, 170] });
    addSpacer(1);
    addText(stripMarkdown(aiSummaryText ?? summaryData.indonesianSummary), { size: 10, maxW: contentW });
    addSpacer(4);

    if (summaryData.keyPoints.length > 0) {
      addHRule();
      addText("Poin Penting", { size: 12, bold: true, color: [79, 56, 170] });
      addSpacer(1);
      summaryData.keyPoints.forEach((p, i) => {
        addText(`${i + 1}. ${stripMarkdown(p)}`, { size: 10 });
      });
      addSpacer(4);
    }

    const userMsgs = messages.filter(m => m.role === "user");
    if (userMsgs.length > 0) {
      addHRule();
      addText("Pertanyaan yang Diajukan", { size: 12, bold: true, color: [79, 56, 170] });
      addSpacer(1);
      userMsgs.slice(0, 8).forEach((m, i) => {
        addText(`${i + 1}. ${m.content}`, { size: 9, color: [60, 60, 60] });
      });
      addSpacer(4);
    }

    addHRule();
    addText("Vinstour Travel | cs@vinstour.id", { size: 9, color: [120, 120, 120], align: "center" });
    addText("Semoga perjalanan ibadah Anda menjadi mabrur. Aamiin.", {
      size: 9, color: [120, 120, 120], align: "center"
    });

    const totalPages = (doc.internal as any).getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(160, 160, 160);
      doc.text(`Halaman ${i} dari ${totalPages}`, pageW / 2, 290, { align: "center" });
    }

    const filename = `ringkasan-konsultasi-${format(summaryData.generatedAt, "yyyyMMdd-HHmm")}.pdf`;
    doc.save(filename);
    toast.success("PDF berhasil diunduh!");
  }

  function formatContent(content: string) {
    return content
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.*?)\*/g, "<em>$1</em>")
      .replace(/→ \*(.*?)\*/g, "→ <code>$1</code>")
      .split("\n")
      .map((line, i) => `<span key="${i}">${line}</span>`)
      .join("<br/>");
  }

  const userMsgCount = messages.filter(m => m.role === "user").length;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-0">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <Link to="/jamaah"><Home className="h-5 w-5 text-muted-foreground" /></Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="font-semibold text-sm">Asisten Virtual</p>
                <p className="text-xs text-green-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
                  {aiMode ? "AI aktif" : "Online"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {/* Active reminder badge */}
            {isScheduled && (
              <div className="flex items-center gap-1 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-1">
                <Clock className="h-3 w-3 text-emerald-600" />
                <span className="text-[10px] text-emerald-700 font-medium">Pengingat aktif</span>
                <button
                  onClick={cancelFollowup}
                  className="text-emerald-500 hover:text-emerald-700 ml-0.5"
                  title="Batalkan pengingat"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            {userMsgCount >= 1 && (
              <Button
                size="sm"
                variant="outline"
                onClick={openSummary}
                className="h-8 px-2.5 text-xs gap-1.5 text-violet-700 border-violet-200 bg-violet-50 hover:bg-violet-100"
              >
                <FileText className="h-3.5 w-3.5" />
                Ringkasan
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={clearChat} className="h-8 w-8 p-0">
              <RefreshCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-40">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-gradient-to-br from-violet-500 to-indigo-600" : "bg-gradient-to-br from-green-400 to-emerald-500"}`}>
              {msg.role === "assistant" ? <Bot className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-white" />}
            </div>
            <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-white border shadow-sm rounded-tl-sm"}`}>
                <div dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }} className="whitespace-pre-wrap" />
              </div>
              {msg.role === "assistant" && (
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-50 hover:opacity-100" onClick={() => rateMessage(msg.id, true)}>
                    <ThumbsUp className={`h-3 w-3 ${msg.liked === true ? "fill-green-500 text-green-500" : ""}`} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-50 hover:opacity-100" onClick={() => rateMessage(msg.id, false)}>
                    <ThumbsDown className={`h-3 w-3 ${msg.liked === false ? "fill-red-500 text-red-500" : ""}`} />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 opacity-50 hover:opacity-100" onClick={() => copyMessage(msg.content)}>
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* 24-hour follow-up reminder opt-in card */}
        {userMsgCount >= 3 && !followupCardDismissed && !isScheduled && (
          <div className="mx-auto max-w-sm w-full">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                  <Bell className="h-4 w-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-amber-900">Pengingat Tindak Lanjut</p>
                  <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                    Kami akan mengingatkan Anda 24 jam lagi untuk menyelesaikan item penting dari konsultasi ini.
                  </p>
                  {(() => {
                    const items = extractActionItems(messageFeed);
                    if (items.length === 0) return null;
                    return (
                      <ul className="mt-2 space-y-1">
                        {items.slice(0, 2).map((item, i) => (
                          <li key={i} className="flex items-center gap-1.5 text-xs text-amber-800">
                            <ArrowRight className="h-3 w-3 shrink-0 text-amber-500" />
                            {item.label}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1.5"
                      onClick={handleScheduleFollowup}
                      disabled={schedulingFollowup}
                    >
                      {schedulingFollowup
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Bell className="h-3 w-3" />
                      }
                      Aktifkan Pengingat
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-amber-600 hover:text-amber-800 hover:bg-amber-100"
                      onClick={dismissFollowupCard}
                    >
                      Tidak, terima kasih
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="bg-white border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center">
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t p-3 space-y-2">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {SUGGESTED_QUESTIONS.map(q => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              className="shrink-0 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full border border-indigo-200 hover:bg-indigo-100 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Ketik pertanyaan Anda..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && sendMessage()}
            className="flex-1 rounded-full text-sm"
          />
          <Button
            size="icon"
            className="rounded-full bg-indigo-600 hover:bg-indigo-700 shrink-0"
            onClick={() => sendMessage()}
            disabled={loading || !input.trim()}
          >
            {loading ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Summary Dialog */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-lg w-[95vw] max-h-[85vh] flex flex-col p-0 gap-0 rounded-2xl overflow-hidden">
          {/* Dialog header */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 flex-shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle className="text-white text-base font-bold">Ringkasan Percakapan</DialogTitle>
                <DialogDescription className="text-white/70 text-xs mt-0.5">
                  {summaryData
                    ? format(summaryData.generatedAt, "d MMMM yyyy, HH:mm", { locale: localeId })
                    : "Memproses..."}
                </DialogDescription>
              </div>
              <button
                onClick={() => setShowSummary(false)}
                className="text-white/70 hover:text-white mt-0.5"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Dialog body */}
          <ScrollArea className="flex-1 overflow-y-auto">
            <div className="p-5 space-y-5" ref={summaryRef}>
              {/* Arabic greeting */}
              <div className="text-center py-3 bg-violet-50 rounded-xl border border-violet-100">
                <p className="text-lg font-semibold text-violet-800" style={{ fontFamily: "serif", direction: "rtl" }}>
                  بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيْمِ
                </p>
                <p className="text-xs text-violet-600 mt-1">Bismillahirrahmanirrahim</p>
              </div>

              {/* Topics covered */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Topik Dibahas</p>
                {generatingSummary && !summaryData ? (
                  <div className="flex gap-2 items-center text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Menganalisis percakapan...
                  </div>
                ) : summaryData?.topics && summaryData.topics.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {summaryData.topics.map(t => (
                      <Badge key={t} variant="secondary" className="bg-violet-100 text-violet-700 text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <Badge variant="secondary" className="bg-violet-100 text-violet-700 text-xs">
                    Konsultasi Umum
                  </Badge>
                )}
              </div>

              <Separator />

              {/* Summary text */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ringkasan</p>
                  {generatingSummary && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                  {!generatingSummary && aiSummaryText && (
                    <Badge variant="outline" className="text-[10px] text-violet-600 border-violet-200 h-4">
                      <Sparkles className="h-2.5 w-2.5 mr-1" /> AI
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {generatingSummary && !aiSummaryText && !summaryData
                    ? "Sedang membuat ringkasan..."
                    : aiSummaryText ?? summaryData?.indonesianSummary ?? ""}
                </p>
              </div>

              {/* Key points */}
              {summaryData && summaryData.keyPoints.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Poin Penting</p>
                    <ul className="space-y-2">
                      {summaryData.keyPoints.map((p, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-700">
                          <span className="w-5 h-5 rounded-full bg-violet-100 text-violet-700 text-xs flex items-center justify-center shrink-0 mt-0.5 font-medium">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed">{stripMarkdown(p)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </>
              )}

              {/* Stats */}
              <Separator />
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-muted/60 p-3 text-center">
                  <p className="text-lg font-bold text-violet-700">{userMsgCount}</p>
                  <p className="text-xs text-muted-foreground">Pertanyaan</p>
                </div>
                <div className="rounded-xl bg-muted/60 p-3 text-center">
                  <p className="text-lg font-bold text-violet-700">
                    {messages.filter(m => m.role === "assistant").length - 1}
                  </p>
                  <p className="text-xs text-muted-foreground">Jawaban Diberikan</p>
                </div>
              </div>

              {/* Footer note */}
              <p className="text-center text-xs text-muted-foreground pb-2">
                Semoga perjalanan ibadah Anda menjadi mabrur. Aamiin 🤲
              </p>
            </div>
          </ScrollArea>

          {/* Action buttons */}
          <div className="flex gap-2 p-4 border-t bg-gray-50/80 flex-shrink-0">
            <Button
              variant="outline"
              className="flex-1 gap-2 text-sm"
              onClick={shareSummary}
              disabled={generatingSummary || !summaryData}
            >
              {copied ? (
                <><CheckCheck className="h-4 w-4 text-green-500" /> Tersalin!</>
              ) : (
                <><Share2 className="h-4 w-4" /> Bagikan</>
              )}
            </Button>
            <Button
              className="flex-1 gap-2 text-sm bg-violet-600 hover:bg-violet-700"
              onClick={downloadPDF}
              disabled={generatingSummary || !summaryData}
            >
              <Download className="h-4 w-4" />
              Simpan PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
