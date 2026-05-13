import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useWebsiteSettings } from "@/hooks/useWebsiteSettingsOptimized";
import { usePackages } from "@/hooks/usePackages";
import { ChatPackageCard, extractPackageIds } from "@/components/chat/ChatPackageCard";
import { useFaqSuggestions, getCategories, CATEGORY_EMOJI, type FaqSuggestion } from "@/hooks/useFaqSuggestions";
import {
  Bot, Send, X, MessageCircle, RefreshCcw,
  Phone, ChevronDown, Sparkles, User, Search,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const FAQ_KNOWLEDGE_BASE: Record<string, string> = {
  "dokumen": "📋 *Dokumen yang diperlukan untuk Umroh:*\n\n1. **Paspor** — berlaku minimal 6 bulan\n2. **KTP** & **Kartu Keluarga**\n3. **Buku Nikah** (jika berangkat bersama pasangan)\n4. **Pas foto** 4×6 background putih\n5. **Sertifikat Vaksin Meningitis**\n\nUpload dokumen di portal jamaah setelah mendaftar ✅",
  "harga": "💰 Harga paket Umroh & Haji bervariasi tergantung fasilitas dan musim. Lihat [daftar paket lengkap](/packages) di halaman Paket kami atau hubungi agen terdekat untuk penawaran terbaik.",
  "cicilan": "💳 *Pembayaran dapat dilakukan via:*\n\n1. Transfer Bank\n2. Virtual Account\n3. Cicilan Tabungan bulanan\n4. Online (GoPay, QRIS, Kartu Kredit)\n\nHubungi agen kami untuk skema cicilan yang sesuai!",
  "visa": "🛂 *Proses Visa Umroh biasanya:*\n\n• Submit dokumen → 2-3 minggu sebelum berangkat\n• Proses visa: **5-10 hari kerja**\n• Notifikasi dikirim via WhatsApp & portal\n\nPantau status visa di [portal jamaah](/jamaah).",
  "hotel": "🏨 *Hotel tersedia di Makkah & Madinah:*\n\n• **Makkah**: 50m–1km dari Masjidil Haram\n• **Madinah**: 100m–500m dari Masjid Nabawi\n• Bintang 3–5 sesuai paket yang dipilih\n\nDetail hotel ada di [deskripsi masing-masing paket](/packages).",
  "jadwal": "📅 Durasi umroh biasanya **9–14 hari** mencakup:\n• Makkah: 5–8 hari\n• Madinah: 3–5 hari\n\nJadwal keberangkatan tersedia di [halaman Paket](/packages).",
  "bagasi": "🧳 Ketentuan umum bagasi:\n• **Kabin**: 7 kg\n• **Terdaftar**: 20–32 kg (sesuai maskapai & paket)\n\nAir zam-zam boleh dibawa max 5 liter di bagasi.",
  "daftar": "✍️ *Cara mendaftar Umroh/Haji:*\n\n1. Pilih paket yang sesuai di [halaman Paket](/packages)\n2. Hubungi agen atau klik **Daftar Sekarang**\n3. Isi formulir pendaftaran\n4. Bayar uang muka/DP\n5. Upload dokumen di portal\n\nProses selesai! Tim kami akan menghubungi Anda.",
  "ibadah": "🕋 *Rukun Umroh:*\n1. Ihram dari miqat\n2. Thawaf 7x putaran Ka'bah\n3. Sa'i 7x antara Shafa–Marwa\n4. Tahallul (cukur rambut)\n\nPanduan lengkap tersedia di [portal jamaah](/jamaah).",
  "refund": "💳 *Kebijakan pembatalan:*\n• H-90 s.d H-60: Refund 75%\n• H-60 s.d H-30: Refund 50%\n• H-30 s.d H-7: Refund 25%\n• < H-7: Tidak ada refund\n\nHubungi tim kami segera jika perlu membatalkan.",
};

const SUGGESTED = [
  "Dokumen apa yang diperlukan?",
  "Berapa harga paket umroh?",
  "Cara daftar & DP berapa?",
  "Proses visa berapa lama?",
  "Ada cicilan?",
];

function findAnswer(q: string): string {
  const lower = q.toLowerCase();
  for (const [key, answer] of Object.entries(FAQ_KNOWLEDGE_BASE)) {
    if (lower.includes(key)) return answer;
  }
  if (lower.includes("haji")) return "Untuk informasi haji, kami menyediakan layanan Haji Khusus & Haji Plus. Silakan lihat halaman **Paket** atau hubungi agen kami untuk info pendaftaran.";
  if (lower.includes("halo") || lower.includes("hi") || lower.includes("assalamu") || lower.includes("selamat")) {
    return "Wa'alaikumsalam warahmatullahi wabarakatuh! 🌙\n\nSelamat datang di **Vinstour Travel**. Saya siap membantu pertanyaan Anda seputar:\n\n• Paket Umroh & Haji\n• Dokumen & persyaratan\n• Harga & pembayaran\n• Proses visa\n\nSilakan ketik pertanyaan Anda!";
  }
  if (lower.includes("terima kasih") || lower.includes("makasih")) {
    return "Wa iyyakum! Jazakallahu khairan 🤲\n\nJika ada pertanyaan lain, jangan ragu bertanya. Semoga Allah memudahkan perjalanan ibadah Anda. Aamiin!";
  }
  return "Terima kasih atas pertanyaannya 🤲\n\nUntuk jawaban yang lebih lengkap, silakan **chat langsung dengan agen kami** menggunakan tombol di bawah, atau kunjungi halaman **Paket** untuk info lengkap.\n\nTim kami siap membantu!";
}

const API_BASE = (import.meta as any).env?.VITE_API_URL || "";

async function fetchAI(message: string, history: { role: string; content: string }[]) {
  if (!API_BASE) return { answer: findAnswer(message), source: "faq" as const };
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
    return { answer: findAnswer(message), source: "faq" as const };
  }
}

function formatContent(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((\/[^)]*)\)/g,
      '<a href="$2" onclick="event.stopPropagation()" style="color:#6d28d9;text-decoration:underline;font-weight:500;cursor:pointer;" onclick="window.location.href=\'$2\'">$1</a>'
    )
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]*)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#6d28d9;text-decoration:underline;font-weight:500;">$1</a>'
    )
    .split("\n")
    .join("<br/>");
}

export function FloatingChatBubble() {
  const { data: settings } = useWebsiteSettings();
  const { data: packages = [] } = usePackages();
  const waNumber = (settings as any)?.footer_whatsapp?.replace(/\D/g, "") || "";
  const siteName = (settings as any)?.site_name || "Vinstour Travel";

  const { data: faqSuggestions = [] } = useFaqSuggestions();

  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiMode, setAiMode] = useState(false);
  const [showPulse, setShowPulse] = useState(true);
  const [activeSuggestCat, setActiveSuggestCat] = useState<string>("all");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Assalamu'alaikum! 🌙\n\nSelamat datang di **${siteName}**. Ada yang bisa saya bantu?\n\nTanya seputar paket, biaya, dokumen, atau info lainnya!`,
      timestamp: new Date(),
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Autocomplete state ──────────────────────────────────────────────────
  const [autoIdx, setAutoIdx] = useState(-1);
  const [showAuto, setShowAuto] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const autoDropRef = useRef<HTMLDivElement>(null);

  const STATIC_AUTOCOMPLETE: FaqSuggestion[] = [
    { id: "s1", question: "Berapa harga paket umroh?", answer: "", category: "Paket" },
    { id: "s2", question: "Dokumen apa saja yang diperlukan untuk umroh?", answer: "", category: "Dokumen" },
    { id: "s3", question: "Bagaimana cara mendaftar paket umroh?", answer: "", category: "Pendaftaran" },
    { id: "s4", question: "Proses visa umroh berapa lama?", answer: "", category: "Visa" },
    { id: "s5", question: "Apakah tersedia cicilan atau tabungan?", answer: "", category: "Pembayaran" },
    { id: "s6", question: "Apa saja yang termasuk dalam paket?", answer: "", category: "Paket" },
    { id: "s7", question: "Apakah masih ada kursi tersedia?", answer: "", category: "Umum" },
    { id: "s8", question: "Bagaimana cara pembayaran DP?", answer: "", category: "Pembayaran" },
    { id: "s9", question: "Hotel berapa bintang dan jaraknya ke Masjidil Haram?", answer: "", category: "Paket" },
    { id: "s10", question: "Bagaimana kebijakan pembatalan dan refund?", answer: "", category: "Pembatalan" },
  ];

  const faqPool: FaqSuggestion[] = faqSuggestions.length > 0 ? faqSuggestions : STATIC_AUTOCOMPLETE;

  const autoResults = useMemo((): FaqSuggestion[] => {
    const q = input.trim().toLowerCase();
    if (q.length < 2) return [];
    const words = q.split(/\s+/).filter(w => w.length >= 2);
    if (words.length === 0) return [];
    return faqPool
      .filter(faq => {
        const haystack = faq.question.toLowerCase();
        return words.some(w => haystack.includes(w));
      })
      .sort((a, b) => {
        const aStarts = a.question.toLowerCase().startsWith(q) ? -1 : 0;
        const bStarts = b.question.toLowerCase().startsWith(q) ? 1 : 0;
        return aStarts + bStarts;
      })
      .slice(0, 6);
  }, [input, faqPool]);

  useEffect(() => {
    setShowAuto(autoResults.length > 0);
    setAutoIdx(-1);
  }, [autoResults]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        autoDropRef.current && !autoDropRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        setShowAuto(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setShowAuto(false);
    setAutoIdx(-1);
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);

    const history = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
    const { answer, source } = await fetchAI(msg, history);
    if (source === "ai") setAiMode(true);

    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: "assistant",
      content: answer,
      timestamp: new Date(),
    }]);
    setLoading(false);
  }

  // Select an autocomplete suggestion → send directly
  const selectAutoResult = (faq: FaqSuggestion) => {
    setShowAuto(false);
    setAutoIdx(-1);
    sendMessage(faq.question);
  };

  // Keyboard navigation for autocomplete
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showAuto && autoResults.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setAutoIdx(i => Math.min(i + 1, autoResults.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setAutoIdx(i => Math.max(i - 1, -1));
        return;
      }
      if (e.key === "Enter" && autoIdx >= 0) {
        e.preventDefault();
        selectAutoResult(autoResults[autoIdx]);
        return;
      }
      if (e.key === "Escape") {
        setShowAuto(false);
        setAutoIdx(-1);
        return;
      }
    }
    if (e.key === "Enter" && !loading) sendMessage();
  };

  function openWA() {
    const num = waNumber || "6281234567890";
    const text = encodeURIComponent("Assalamu'alaikum, saya ingin bertanya tentang paket Umroh/Haji dari Vinstour Travel.");
    window.open(`https://wa.me/${num}?text=${text}`, "_blank");
  }

  function reset() {
    setMessages([{
      id: "reset",
      role: "assistant",
      content: `Assalamu'alaikum! 🌙\n\nChat baru dimulai. Silakan tanyakan apa saja seputar paket Umroh & Haji!`,
      timestamp: new Date(),
    }]);
    setAiMode(false);
  }

  return (
    <>
      {/* Floating Button */}
      {!open && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
          {showPulse && (
            <div className="bg-white rounded-2xl rounded-br-sm shadow-lg px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-100 animate-fade-in max-w-[200px] text-center">
              Ada pertanyaan? Tanya AI kami! 💬
            </div>
          )}
          <button
            onClick={() => { setOpen(true); setShowPulse(false); }}
            className="relative w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-indigo-700 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center group"
          >
            <MessageCircle className="h-6 w-6 text-white group-hover:scale-110 transition-transform" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white" />
            {showPulse && (
              <span className="absolute inset-0 rounded-full bg-indigo-400 opacity-40 animate-ping" />
            )}
          </button>
        </div>
      )}

      {/* Chat Panel */}
      {open && (
        <div className={`fixed bottom-6 right-6 z-50 w-[360px] max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col overflow-hidden transition-all duration-200 ${minimized ? "h-14" : "h-[520px]"}`}>

          {/* Header */}
          <div className="bg-gradient-to-r from-violet-600 to-indigo-700 px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">AI {siteName}</p>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  <p className="text-violet-100 text-xs">{aiMode ? "AI aktif" : "Online · Siap membantu"}</p>
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
                {messages.map(msg => {
                  const pkgIds = msg.role === "assistant" ? extractPackageIds(msg.content) : [];
                  return (
                    <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "assistant" ? "bg-gradient-to-br from-violet-500 to-indigo-600" : "bg-gradient-to-br from-green-400 to-emerald-500"}`}>
                        {msg.role === "assistant" ? <Bot className="h-3.5 w-3.5 text-white" /> : <User className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <div className="flex flex-col gap-2 max-w-[82%]">
                        <div className={`rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm ${msg.role === "user" ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-white border rounded-tl-sm text-gray-800"}`}>
                          <div
                            dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                            className="whitespace-pre-wrap text-[13px]"
                            onClick={(e) => {
                              const target = e.target as HTMLElement;
                              if (target.tagName === "A") {
                                e.preventDefault();
                                const href = target.getAttribute("href") || "";
                                if (href.startsWith("/")) window.location.href = href;
                                else if (href.startsWith("http")) window.open(href, "_blank", "noopener,noreferrer");
                              }
                            }}
                          />
                        </div>
                        {pkgIds.length > 0 && (
                          <div className="flex flex-col gap-2">
                            {pkgIds.map(id => (
                              <ChatPackageCard key={id} packageId={id} packages={packages as any[]} accentColor="#6d28d9" />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {loading && (
                  <div className="flex gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shrink-0">
                      <Bot className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="bg-white border rounded-2xl rounded-tl-sm px-3 py-2.5 shadow-sm">
                      <div className="flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Dynamic FAQ Suggestions */}
              {messages.length <= 2 && !loading && (() => {
                const cats = getCategories(faqSuggestions);
                const hasDynamic = faqSuggestions.length > 0;
                const visibleFaqs = activeSuggestCat === "all"
                  ? faqSuggestions.slice(0, 5)
                  : faqSuggestions.filter(f => f.category === activeSuggestCat).slice(0, 5);
                const staticQ = SUGGESTED;
                return (
                  <div className="bg-white border-t border-gray-100 px-3 pt-2 pb-1 space-y-1.5">
                    {hasDynamic && cats.length > 1 && (
                      <div className="flex gap-1 overflow-x-auto scrollbar-hide pb-0.5">
                        <button
                          onClick={() => setActiveSuggestCat("all")}
                          className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap ${activeSuggestCat === "all" ? "bg-indigo-600 text-white border-indigo-600" : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"}`}
                        >
                          Semua
                        </button>
                        {cats.map(cat => (
                          <button
                            key={cat}
                            onClick={() => setActiveSuggestCat(cat)}
                            className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors whitespace-nowrap ${activeSuggestCat === cat ? "bg-indigo-600 text-white border-indigo-600" : "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100"}`}
                          >
                            {CATEGORY_EMOJI[cat] ?? "💬"} {cat}
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
                      {hasDynamic
                        ? visibleFaqs.map(faq => (
                            <button
                              key={faq.id}
                              onClick={() => sendMessage(faq.question)}
                              disabled={loading}
                              className="shrink-0 text-[11px] bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full border border-violet-200 hover:bg-violet-100 transition-colors whitespace-nowrap disabled:opacity-50 max-w-[200px] truncate"
                              title={faq.question}
                            >
                              {faq.question}
                            </button>
                          ))
                        : staticQ.map(q => (
                            <button
                              key={q}
                              onClick={() => sendMessage(q)}
                              disabled={loading}
                              className="shrink-0 text-[11px] bg-violet-50 text-violet-700 px-2.5 py-1 rounded-full border border-violet-200 hover:bg-violet-100 transition-colors whitespace-nowrap disabled:opacity-50"
                            >
                              {q}
                            </button>
                          ))
                      }
                    </div>
                  </div>
                );
              })()}

              {/* Input */}
              <div className="px-3 pb-3 pt-2 bg-white space-y-2">
                <div className="relative">
                  {/* Autocomplete dropdown */}
                  {showAuto && autoResults.length > 0 && (
                    <div
                      ref={autoDropRef}
                      className="absolute bottom-full left-0 right-0 mb-1.5 bg-white border border-indigo-100 rounded-2xl shadow-xl overflow-hidden z-50"
                      style={{ animation: "fadeIn 0.12s ease-out" }}
                    >
                      <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-indigo-50 bg-indigo-50/60">
                        <Search className="h-3 w-3 text-indigo-400 shrink-0" />
                        <span className="text-[10px] text-indigo-600 font-semibold">Saran dari FAQ</span>
                        <span className="ml-auto text-[9px] text-indigo-300">↑↓ · Esc</span>
                      </div>
                      {autoResults.map((faq, idx) => (
                        <button
                          key={faq.id}
                          onMouseDown={e => { e.preventDefault(); selectAutoResult(faq); }}
                          onMouseEnter={() => setAutoIdx(idx)}
                          className={`w-full text-left px-3 py-2 flex items-start gap-2 transition-colors ${
                            idx === autoIdx ? "bg-indigo-50" : "hover:bg-gray-50"
                          }`}
                        >
                          <span className="text-[11px] mt-0.5 shrink-0">
                            {CATEGORY_EMOJI[faq.category] ?? "💬"}
                          </span>
                          <span className={`text-[12px] leading-snug line-clamp-2 ${
                            idx === autoIdx ? "text-indigo-700" : "text-gray-700"
                          }`}>{faq.question}</span>
                          {faq.category && (
                            <span className={`ml-auto shrink-0 text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                              idx === autoIdx
                                ? "bg-indigo-100 text-indigo-600"
                                : "bg-gray-100 text-gray-400"
                            }`}>
                              {faq.category}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Ketik pertanyaan Anda..."
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleInputKeyDown}
                      onFocus={() => autoResults.length > 0 && setShowAuto(true)}
                      autoComplete="off"
                      className="flex-1 text-sm border border-gray-200 rounded-full px-4 py-2 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all bg-gray-50"
                    />
                    <button
                      onClick={() => sendMessage()}
                      disabled={loading || !input.trim()}
                      className="w-9 h-9 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 flex items-center justify-center shrink-0 transition-colors"
                    >
                      {loading ? <RefreshCcw className="h-4 w-4 text-white animate-spin" /> : <Send className="h-4 w-4 text-white" />}
                    </button>
                  </div>
                </div>

                {/* WA Button */}
                <button
                  onClick={openWA}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-full bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
                >
                  <Phone className="h-4 w-4" />
                  Chat Langsung dengan Agen (WhatsApp)
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
