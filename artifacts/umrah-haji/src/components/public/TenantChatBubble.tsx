import { useState, useRef, useEffect } from "react";
import {
  Bot, Send, X, MessageCircle, RefreshCcw,
  Phone, ChevronDown, User,
} from "lucide-react";

// ─── Color presets ────────────────────────────────────────────────────────────
// Hardcoded strings so Tailwind never purges them

export const CHAT_COLOR_PRESETS = {
  violet:  { from: "from-violet-600",  to: "to-indigo-700",   label: "Ungu",    hex: "#7c3aed" },
  emerald: { from: "from-emerald-600", to: "to-teal-700",     label: "Hijau",   hex: "#059669" },
  blue:    { from: "from-blue-600",    to: "to-sky-700",      label: "Biru",    hex: "#2563eb" },
  rose:    { from: "from-rose-600",    to: "to-pink-700",     label: "Merah",   hex: "#e11d48" },
  amber:   { from: "from-amber-500",   to: "to-orange-600",   label: "Oranye",  hex: "#f59e0b" },
  cyan:    { from: "from-cyan-600",    to: "to-blue-700",     label: "Cyan",    hex: "#0891b2" },
  fuchsia: { from: "from-fuchsia-600", to: "to-purple-700",   label: "Merah Muda", hex: "#c026d3" },
  slate:   { from: "from-slate-700",   to: "to-slate-900",    label: "Abu-abu", hex: "#334155" },
} as const;

export type ChatColorPreset = keyof typeof CHAT_COLOR_PRESETS;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

// ─── FAQ knowledge base ───────────────────────────────────────────────────────

const FAQ: Record<string, string> = {
  "dokumen": "📋 *Dokumen yang diperlukan untuk Umroh:*\n\n1. **Paspor** — berlaku minimal 6 bulan\n2. **KTP** & **Kartu Keluarga**\n3. **Buku Nikah** (jika berangkat bersama pasangan)\n4. **Pas foto** 4×6 background putih\n5. **Sertifikat Vaksin Meningitis**\n\nUpload dokumen di portal jamaah setelah mendaftar ✅",
  "harga": "💰 Harga paket Umroh & Haji bervariasi tergantung fasilitas dan musim. Lihat **daftar paket lengkap** di halaman Paket kami atau hubungi kami untuk penawaran terbaik.",
  "cicilan": "💳 *Pembayaran dapat dilakukan via:*\n\n1. Transfer Bank\n2. Virtual Account\n3. Cicilan Tabungan bulanan\n4. Online (GoPay, QRIS, Kartu Kredit)\n\nHubungi kami untuk skema cicilan yang sesuai!",
  "visa": "🛂 *Proses Visa Umroh biasanya:*\n\n• Submit dokumen → 2-3 minggu sebelum berangkat\n• Proses visa: **5-10 hari kerja**\n• Notifikasi dikirim via WhatsApp & portal",
  "hotel": "🏨 *Hotel tersedia di Makkah & Madinah:*\n\n• **Makkah**: 50m–1km dari Masjidil Haram\n• **Madinah**: 100m–500m dari Masjid Nabawi\n• Bintang 3–5 sesuai paket yang dipilih",
  "jadwal": "📅 Durasi umroh biasanya **9–14 hari** mencakup:\n• Makkah: 5–8 hari\n• Madinah: 3–5 hari\n\nJadwal keberangkatan tersedia di halaman Paket.",
  "bagasi": "🧳 Ketentuan umum bagasi:\n• **Kabin**: 7 kg\n• **Terdaftar**: 20–32 kg (sesuai maskapai & paket)\n\nAir zam-zam boleh dibawa max 5 liter di bagasi.",
  "daftar": "✍️ *Cara mendaftar Umroh/Haji:*\n\n1. Pilih paket yang sesuai\n2. Hubungi kami atau klik **Daftar Sekarang**\n3. Isi formulir pendaftaran\n4. Bayar uang muka/DP\n5. Upload dokumen di portal\n\nTim kami akan segera menghubungi Anda!",
  "ibadah": "🕋 *Rukun Umroh:*\n1. Ihram dari miqat\n2. Thawaf 7x putaran Ka'bah\n3. Sa'i 7x antara Shafa–Marwa\n4. Tahallul (cukur rambut)",
  "refund": "💳 *Kebijakan pembatalan:*\n• H-90 s.d H-60: Refund 75%\n• H-60 s.d H-30: Refund 50%\n• H-30 s.d H-7: Refund 25%\n• < H-7: Tidak ada refund",
};

const SUGGESTED = [
  "Dokumen apa yang diperlukan?",
  "Berapa harga paket umroh?",
  "Cara daftar & DP berapa?",
  "Proses visa berapa lama?",
  "Ada cicilan?",
];

function findAnswer(q: string, siteName: string): string {
  const lower = q.toLowerCase();
  for (const [key, answer] of Object.entries(FAQ)) {
    if (lower.includes(key)) return answer;
  }
  if (lower.includes("haji")) {
    return `Untuk informasi haji, **${siteName}** menyediakan layanan Haji Khusus & Haji Plus. Silakan lihat halaman **Paket** atau hubungi kami langsung.`;
  }
  if (lower.includes("halo") || lower.includes("hi") || lower.includes("assalamu") || lower.includes("selamat")) {
    return `Wa'alaikumsalam warahmatullahi wabarakatuh! 🌙\n\nSelamat datang di **${siteName}**. Saya siap membantu pertanyaan seputar:\n\n• Paket Umroh & Haji\n• Dokumen & persyaratan\n• Harga & pembayaran\n• Proses visa\n\nSilakan ketik pertanyaan Anda!`;
  }
  if (lower.includes("terima kasih") || lower.includes("makasih")) {
    return "Wa iyyakum! Jazakallahu khairan 🤲\n\nJika ada pertanyaan lain, jangan ragu bertanya. Semoga Allah memudahkan perjalanan ibadah Anda. Aamiin!";
  }
  return `Terima kasih atas pertanyaannya 🤲\n\nUntuk jawaban lebih lengkap, silakan **chat langsung** dengan tim **${siteName}** via WhatsApp menggunakan tombol di bawah.\n\nTim kami siap membantu Anda!`;
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || "";

async function fetchAI(message: string, history: { role: string; content: string }[], siteName: string) {
  if (!API_BASE) return { answer: findAnswer(message, siteName), source: "faq" as const };
  try {
    const res = await fetch(`${API_BASE}/api/v1/chatbot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, conversationHistory: history }),
      signal: AbortSignal.timeout(7000),
    });
    if (!res.ok) throw new Error();
    return await res.json() as { answer: string; source: "ai" | "faq" };
  } catch {
    return { answer: findAnswer(message, siteName), source: "faq" as const };
  }
}

function formatContent(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .split("\n").join("<br/>");
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface TenantChatBubbleProps {
  waNumber?: string | null;
  siteName?: string | null;
  /** Key preset warna, lihat CHAT_COLOR_PRESETS */
  colorPreset?: string | null;
  /** Fallback manual gradient (digunakan jika colorPreset tidak ada) */
  gradientFrom?: string;
  gradientTo?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TenantChatBubble({
  waNumber,
  siteName,
  colorPreset,
  gradientFrom = "from-violet-600",
  gradientTo   = "to-indigo-700",
}: TenantChatBubbleProps) {
  // Resolve preset → gradient classes
  const preset = (colorPreset && colorPreset in CHAT_COLOR_PRESETS)
    ? CHAT_COLOR_PRESETS[colorPreset as ChatColorPreset]
    : null;
  const fromCls = preset?.from ?? gradientFrom;
  const toCls   = preset?.to   ?? gradientTo;

  const gradient = `bg-gradient-to-r ${fromCls} ${toCls}`;
  const btnGrad  = `bg-gradient-to-br ${fromCls} ${toCls}`;

  const cleanWa = (waNumber ?? "").replace(/\D/g, "");
  const name    = siteName || "Agen Kami";

  const [open,      setOpen]      = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [aiMode,    setAiMode]    = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const [messages,  setMessages]  = useState<Message[]>([{
    id: "welcome",
    role: "assistant",
    content: `Assalamu'alaikum! 🌙\n\nSelamat datang di **${name}**. Ada yang bisa saya bantu?\n\nTanya seputar paket, biaya, dokumen, atau info lainnya!`,
    timestamp: new Date(),
  }]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => {
    const t = setTimeout(() => setShowPulse(false), 8000);
    return () => clearTimeout(t);
  }, []);

  async function sendMessage(text?: string) {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
    const { answer, source } = await fetchAI(msg, history, name);
    if (source === "ai") setAiMode(true);
    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: answer,
      timestamp: new Date(),
    }]);
    setLoading(false);
  }

  function openWA() {
    const num  = cleanWa || "6281234567890";
    const text = encodeURIComponent(`Assalamu'alaikum, saya ingin bertanya tentang paket Umroh/Haji dari ${name}.`);
    window.open(`https://wa.me/${num}?text=${text}`, "_blank");
  }

  function reset() {
    setMessages([{
      id: "reset",
      role: "assistant",
      content: `Assalamu'alaikum! 🌙\n\nChat baru dimulai. Silakan tanyakan apa saja seputar paket Umroh & Haji di **${name}**!`,
      timestamp: new Date(),
    }]);
    setAiMode(false);
  }

  // Derive a ring/focus color from preset for the input
  const ringColor = preset ? "" : "";

  return (
    <>
      {/* Floating button */}
      {!open && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
          {showPulse && (
            <div className="bg-white rounded-2xl rounded-br-sm shadow-lg px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-100 animate-fade-in max-w-[220px] text-center">
              Chat dengan tim {name}! 💬
            </div>
          )}
          <button
            onClick={() => { setOpen(true); setShowPulse(false); }}
            className={`relative w-14 h-14 rounded-full ${btnGrad} shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center group`}
          >
            <MessageCircle className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
            {showPulse && (
              <span className={`absolute inset-0 rounded-full ${fromCls.replace("from-", "bg-").replace("-600", "-400").replace("-500", "-400")} opacity-40 animate-ping`} />
            )}
          </button>
        </div>
      )}

      {/* Chat panel */}
      {open && (
        <div className={`fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden transition-all duration-200 ${minimized ? "h-14" : "h-[520px]"}`}>

          {/* Header */}
          <div className={`${gradient} px-4 py-3 flex items-center justify-between shrink-0`}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">AI {name}</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-300 rounded-full" />
                  <p className="text-white/80 text-xs">{aiMode ? "AI aktif" : "Online · Siap membantu"}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={reset} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors" title="Reset chat">
                <RefreshCcw className="h-3.5 w-3.5 text-white" />
              </button>
              <button onClick={() => setMinimized(v => !v)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <ChevronDown className={`h-3.5 w-3.5 text-white transition-transform ${minimized ? "rotate-180" : ""}`} />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <X className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50">
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "assistant" ? btnGrad : "bg-gradient-to-br from-green-400 to-emerald-500"}`}>
                      {msg.role === "assistant" ? <Bot className="h-3.5 w-3.5 text-white" /> : <User className="h-3.5 w-3.5 text-white" />}
                    </div>
                    <div className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${msg.role === "user" ? `${gradient} text-white rounded-tr-sm` : "bg-white border rounded-tl-sm text-gray-800"}`}>
                      <div
                        dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                        className="whitespace-pre-wrap text-[13px]"
                      />
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <div className={`w-7 h-7 rounded-full ${btnGrad} flex items-center justify-center shrink-0`}>
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="bg-white border rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Suggested questions */}
              <div className="px-3 pt-2 pb-1 flex gap-1.5 overflow-x-auto scrollbar-hide bg-white border-t border-gray-50">
                {SUGGESTED.map(q => (
                  <button
                    key={q}
                    onClick={() => sendMessage(q)}
                    disabled={loading}
                    className="shrink-0 text-[11px] bg-gray-50 text-gray-700 px-2.5 py-1 rounded-full border border-gray-200 hover:bg-gray-100 transition-colors whitespace-nowrap disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Input + WA button */}
              <div className="px-3 pb-3 pt-2 bg-white space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ketik pertanyaan Anda..."
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && !loading && sendMessage()}
                    className="flex-1 text-sm border border-gray-200 rounded-full px-4 py-2 outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-100 transition-all bg-gray-50"
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={loading || !input.trim()}
                    className={`w-9 h-9 rounded-full ${btnGrad} disabled:opacity-40 flex items-center justify-center shrink-0 transition-all hover:shadow-md`}
                  >
                    {loading
                      ? <RefreshCcw className="h-4 w-4 text-white animate-spin" />
                      : <Send className="h-4 w-4 text-white" />}
                  </button>
                </div>
                <button
                  onClick={openWA}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-full bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  Chat Langsung via WhatsApp
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
