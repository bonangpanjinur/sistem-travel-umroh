import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MessageCircle, X, Send, Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { buildPackageContext } from "@/lib/packageContext";
import { usePackages } from "@/hooks/usePackages";
import { ChatPackageCard, extractPackageIds } from "@/components/chat/ChatPackageCard";

function formatBotMessage(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(
      /\[([^\]]+)\]\((\/[^)]*)\)/g,
      '<a href="$2" style="color:#059669;text-decoration:underline;font-weight:600;cursor:pointer;">$1</a>'
    )
    .replace(
      /\[([^\]]+)\]\((https?:\/\/[^)]*)\)/g,
      '<a href="$2" target="_blank" rel="noopener noreferrer" style="color:#059669;text-decoration:underline;font-weight:600;">$1</a>'
    )
    .split("\n")
    .join("<br/>");
}

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  ts: Date;
};

const FAQ_REPLIES: Record<string, string> = {
  default: "Terima kasih sudah menghubungi kami! Tim kami akan segera membantu Anda. Silakan tinggalkan nama dan nomor HP.",
  umroh: "Kami memiliki berbagai paket Umroh mulai dari reguler, plus, hingga VIP. Durasi 9–15 hari. Mau info paket tertentu?",
  haji: "Kami melayani Haji Reguler dan Haji Plus (ONH Plus). Untuk info lebih lanjut, tim kami siap membantu!",
  harga: "Harga paket Umroh mulai Rp 25 juta/orang (sudah termasuk tiket, hotel, visa). Mau saya kirimkan detail?",
  visa: "Proses visa Umroh biasanya 7–14 hari kerja. Kami bantu urus dari awal sampai jadi!",
  daftar: "Klik tombol 'Daftar Sekarang' di halaman paket, atau isi nama & nomor HP dan tim kami akan menghubungi Anda.",
  dokumen: "Dokumen yang diperlukan: Paspor (min. 6 bulan), KTP, KK, Pas foto 4×6, Vaksin Meningitis. Upload di menu Dokumen.",
  bayar: "Pembayaran bisa via Transfer Bank, Virtual Account, atau cicilan. Setelah transfer, upload bukti di portal jamaah.",
};

function getFaqReply(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("umroh") || t.includes("umrah")) return FAQ_REPLIES.umroh;
  if (t.includes("haji")) return FAQ_REPLIES.haji;
  if (t.includes("harga") || t.includes("biaya") || t.includes("berapa")) return FAQ_REPLIES.harga;
  if (t.includes("visa")) return FAQ_REPLIES.visa;
  if (t.includes("daftar") || t.includes("booking") || t.includes("pesan")) return FAQ_REPLIES.daftar;
  if (t.includes("dokumen") || t.includes("paspor") || t.includes("syarat")) return FAQ_REPLIES.dokumen;
  if (t.includes("bayar") || t.includes("cicil") || t.includes("transfer")) return FAQ_REPLIES.bayar;
  if (t.includes("halo") || t.includes("hi") || t.includes("assalamu") || t.includes("selamat"))
    return "Wa'alaikumsalam! 🌙 Selamat datang. Saya siap membantu informasi Umroh & Haji. Silakan ketik pertanyaan Anda!";
  if (t.includes("terima kasih") || t.includes("makasih"))
    return "Wa iyyakum! Jazakallahu khairan 🤲 Semoga perjalanan ibadah Anda menjadi mabrur!";
  return FAQ_REPLIES.default;
}

interface GeminiConfig {
  apiKey: string;
  model: string;
  systemPrompt: string;
  botName: string;
  greeting: string;
  enableLeadCapture: boolean;
  packageContext?: string;
}

interface ChatWidgetProps {
  tenantName?: string;
  waNumber?: string;
}

const SUGGESTION_CHIPS = [
  { label: "💰 Cek harga paket", text: "Berapa harga paket umroh?" },
  { label: "🪑 Sisa kursi tersedia?", text: "Apakah masih ada kursi tersedia?" },
  { label: "📝 Cara daftar?", text: "Bagaimana cara mendaftar?" },
  { label: "📄 Dokumen apa saja?", text: "Dokumen apa saja yang diperlukan?" },
  { label: "💳 Cara bayar?", text: "Bagaimana cara pembayarannya?" },
];

export default function ChatWidget({ tenantName = "Vinstour Travel", waNumber }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [geminiConfig, setGeminiConfig] = useState<GeminiConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "" });
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [unread, setUnread] = useState(0);
  const [reactions, setReactions] = useState<Record<string, string>>({});
  const [pickerOpen, setPickerOpen] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const historyRef = useRef<{ role: string; text: string }[]>([]);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const { data: packages = [] } = usePackages();

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    }).catch(() => {});
  };

  const REACTION_EMOJIS = ["👍", "🙏", "❤️", "😊", "🤔"];

  const clearConversation = () => {
    const greeting = geminiConfig?.greeting
      ? geminiConfig.greeting
      : `Halo! Selamat datang di ${tenantName}. Ada yang bisa saya bantu? 😊`;
    setMessages([{ id: Date.now().toString(), role: "bot", text: greeting, ts: new Date() }]);
    setInput("");
    setTyping(false);
    setReactions({});
    setPickerOpen(null);
    setShowLeadForm(false);
    setLeadCaptured(false);
    setLeadForm({ name: "", phone: "" });
    historyRef.current = [];
    setConfirmClear(false);
  };

  const pickReaction = (msgId: string, emoji: string) => {
    setReactions(prev => prev[msgId] === emoji ? (({ [msgId]: _, ...rest }) => rest)(prev) : { ...prev, [msgId]: emoji });
    setPickerOpen(null);
  };

  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const notes = [
        { freq: 880, start: 0,    dur: 0.18 },
        { freq: 1109, start: 0.12, dur: 0.18 },
        { freq: 1320, start: 0.24, dur: 0.28 },
      ];
      notes.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, ctx.currentTime + start);
        gain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + dur);
        osc.onended = () => { osc.disconnect(); gain.disconnect(); };
      });
      setTimeout(() => ctx.close(), 800);
    } catch {}
  };

  const scrollToBottom = () => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShowScrollBtn(distFromBottom > 80);
  };

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (open) setUnread(0);
  }, [open]);

  useEffect(() => {
    if (!configLoaded) loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const supabaseAny = supabase as any;
      const [settingsResult, packageContext] = await Promise.all([
        supabaseAny
          .from("app_settings")
          .select("key,value")
          .in("key", ["gemini_api_key", "gemini_chatbot_config"]),
        buildPackageContext(),
      ]);

      let apiKey = "";
      let cfg: any = {};
      if (settingsResult.data?.length) {
        for (const row of settingsResult.data) {
          if (row.key === "gemini_api_key") apiKey = JSON.parse(row.value) || "";
          if (row.key === "gemini_chatbot_config") cfg = JSON.parse(row.value) || {};
        }
      }

      const basePrompt = cfg.systemPrompt || `Kamu adalah asisten virtual ${tenantName} untuk perjalanan Umroh dan Haji. Bantu calon jamaah dengan ramah dalam Bahasa Indonesia. Jawab singkat dan informatif (max 4 kalimat).`;
      const enrichedPrompt = packageContext
        ? `${basePrompt}\n\n${packageContext}`
        : basePrompt;

      const config: GeminiConfig = {
        apiKey,
        model: cfg.model || "gemini-2.0-flash",
        systemPrompt: enrichedPrompt,
        botName: cfg.botName || tenantName,
        greeting: cfg.greeting || `Halo! Selamat datang di ${tenantName}. Ada yang bisa saya bantu? 😊`,
        enableLeadCapture: cfg.enableLeadCapture ?? true,
        packageContext,
      };
      setGeminiConfig(config);
      setMessages([{ id: "1", role: "bot", text: config.greeting, ts: new Date() }]);
    } catch {
      setGeminiConfig(null);
      setMessages([{ id: "1", role: "bot", text: `Halo! Selamat datang di ${tenantName}. Ada yang bisa saya bantu? 😊`, ts: new Date() }]);
    }
    setConfigLoaded(true);
  }

  async function callGemini(userText: string, config: GeminiConfig): Promise<string> {
    const contents = [
      ...historyRef.current.slice(-6).map(h => ({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }],
      })),
      { role: "user", parts: [{ text: userText }] },
    ];
    const body = {
      system_instruction: { parts: [{ text: config.systemPrompt }] },
      contents,
      generationConfig: { maxOutputTokens: 400, temperature: 0.75 },
    };
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.model || "gemini-2.0-flash"}:generateContent?key=${config.apiKey}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data: any = await res.json();
    const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!answer) throw new Error("Empty response");
    return answer;
  }

  const sendChip = (text: string) => {
    if (typing) return;
    setInput(text);
    setTimeout(() => {
      sendMessageText(text);
    }, 0);
  };

  const sendMessageText = async (userText: string) => {
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: userText, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    historyRef.current.push({ role: "user", text: userText });

    let replyText = "";
    try {
      if (geminiConfig?.apiKey) {
        replyText = await callGemini(userText, geminiConfig);
      } else {
        await new Promise(r => setTimeout(r, 800 + Math.random() * 600));
        replyText = getFaqReply(userText);
      }
    } catch {
      replyText = getFaqReply(userText);
    }

    historyRef.current.push({ role: "bot", text: replyText });

    const botMsg: Message = { id: (Date.now() + 1).toString(), role: "bot", text: replyText, ts: new Date() };
    setMessages(prev => [...prev, botMsg]);
    setTyping(false);
    playChime();
    setOpen(prev => { if (!prev) setUnread(u => u + 1); return prev; });

    if (geminiConfig?.enableLeadCapture && !leadCaptured && messages.length >= 3) {
      setShowLeadForm(true);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || typing) return;
    await sendMessageText(input.trim());
  };

  const saveLead = async () => {
    if (!leadForm.name || !leadForm.phone) return;
    setSavingLead(true);
    try {
      await (supabase as any).from("chat_leads").insert({
        name: leadForm.name, phone: leadForm.phone,
        source: "chat_widget", created_at: new Date().toISOString(),
      });
    } catch {}
    setSavingLead(false);
    setLeadCaptured(true);
    setShowLeadForm(false);
    setMessages(prev => [...prev, {
      id: Date.now().toString(), role: "bot",
      text: `Terima kasih ${leadForm.name}! Tim kami akan segera menghubungi Anda di ${leadForm.phone}. 🎉`,
      ts: new Date(),
    }]);
  };

  const waLink = waNumber
    ? `https://wa.me/${waNumber.replace(/\D/g, "")}?text=Halo%20${encodeURIComponent(tenantName)}%2C%20saya%20ingin%20informasi%20paket%20Umroh`
    : null;

  const displayBotName = geminiConfig?.botName || tenantName;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open && (
        <div className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border flex flex-col" style={{ height: 480 }}>
          {/* Header */}
          <div className="bg-primary rounded-t-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Bot className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{displayBotName}</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <p className="text-white/80 text-[10px]">
                    {geminiConfig?.apiKey ? "AI Gemini Aktif" : "Online — Balas dalam menit"}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Clear conversation */}
              {confirmClear ? (
                <div className="flex items-center gap-1">
                  <span className="text-white/80 text-[10px]">Hapus?</span>
                  <button
                    onClick={clearConversation}
                    className="text-[10px] bg-red-500 hover:bg-red-600 text-white rounded px-1.5 py-0.5 font-medium transition-colors"
                  >
                    Ya
                  </button>
                  <button
                    onClick={() => setConfirmClear(false)}
                    className="text-white/70 hover:text-white transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmClear(true)}
                  className="text-white/60 hover:text-white transition-colors"
                  title="Hapus percakapan"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2" />
                  </svg>
                </button>
              )}
              <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors ml-1">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50 relative">
            {messages.map((m, idx) => {
              const hasBotReplyAfter = messages.slice(idx + 1).some(n => n.role === "bot");
              const isRead = hasBotReplyAfter;
              const isSent = !hasBotReplyAfter && m.role === "user";
              return (
                <div key={m.id} className={cn("flex items-end gap-1.5", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                  {m.role === "bot" && (
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0 mb-auto mt-0.5">
                      <Bot className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2 min-w-0">
                  <div className="relative group">
                    {/* Copy button */}
                    <button
                      onClick={() => copyMessage(m.id, m.text)}
                      title="Salin pesan"
                      className={cn(
                        "absolute -top-2 z-10 w-6 h-6 rounded-full border bg-white shadow-sm flex items-center justify-center transition-all",
                        "opacity-0 group-hover:opacity-100 hover:scale-110",
                        m.role === "user" ? "-left-2" : "-right-2",
                        copiedId === m.id ? "border-green-400" : "border-gray-200"
                      )}
                    >
                      {copiedId === m.id ? (
                        <svg className="h-3 w-3 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg className="h-3 w-3 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                      )}
                    </button>

                    <div className={cn(
                      "max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                      m.role === "user" ? "bg-primary text-white rounded-br-sm" : "bg-white border rounded-bl-sm"
                    )}>
                      {m.role === "bot" ? (
                        <div
                          className="text-[13px] leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: formatBotMessage(m.text) }}
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
                      ) : (
                        <p>{m.text}</p>
                      )}
                      <div className={cn("flex items-center gap-0.5 mt-0.5", m.role === "user" ? "justify-end" : "justify-start")}>
                        <span className={cn("text-[9px]", m.role === "user" ? "text-white/60" : "text-muted-foreground")}>
                          {format(m.ts, "h:mm aa")}
                        </span>
                        {m.role === "user" && (
                          <span className={cn("text-[10px] leading-none", isRead ? "text-white" : "text-white/40")} title={isRead ? "Dibaca" : "Terkirim"}>
                            {isRead ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Reaction button — only on bot messages */}
                    {m.role === "bot" && (
                      <div className="absolute -bottom-2 right-1 flex items-center gap-1">
                        {/* Selected reaction badge */}
                        {reactions[m.id] && (
                          <button
                            onClick={() => pickReaction(m.id, reactions[m.id])}
                            className="text-[13px] bg-white border rounded-full w-5 h-5 flex items-center justify-center shadow-sm hover:scale-110 transition-transform"
                            title="Klik untuk hapus reaksi"
                          >
                            {reactions[m.id]}
                          </button>
                        )}
                        {/* Smiley trigger */}
                        {!reactions[m.id] && (
                          <button
                            onClick={() => setPickerOpen(pickerOpen === m.id ? null : m.id)}
                            className="text-[11px] bg-white border rounded-full w-5 h-5 items-center justify-center shadow-sm opacity-0 group-hover:opacity-100 transition-all hover:scale-110 flex"
                            title="Tambah reaksi"
                          >
                            🙂
                          </button>
                        )}
                        {/* Emoji picker popup */}
                        {pickerOpen === m.id && (
                          <div className="absolute bottom-6 left-0 bg-white border rounded-2xl shadow-lg px-2 py-1.5 flex gap-1.5 z-10">
                            {REACTION_EMOJIS.map(e => (
                              <button
                                key={e}
                                onClick={() => pickReaction(m.id, e)}
                                className="text-[18px] hover:scale-125 transition-transform"
                              >
                                {e}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {m.role === "bot" && extractPackageIds(m.text).length > 0 && (
                    <div className="flex flex-col gap-2 pb-2">
                      {extractPackageIds(m.text).map(id => (
                        <ChatPackageCard key={id} packageId={id} packages={packages as any[]} accentColor="#7c3aed" />
                      ))}
                    </div>
                  )}
                  </div>
                </div>
              );
            })}
            {typing && (
              <div className="flex items-end gap-1.5">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Bot className="h-3 w-3 text-white" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-gray-400 font-medium ml-1">{displayBotName} <span className="italic">sedang mengetik...</span></span>
                  <div className="bg-white border rounded-2xl rounded-bl-sm px-3 py-2">
                    <div className="flex gap-1 items-center">
                      {[0, 1, 2].map(i => (
                        <div key={i} className="w-1.5 h-1.5 bg-primary/60 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Lead Capture */}
            {showLeadForm && !leadCaptured && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-blue-800">🎯 Tinggalkan kontak Anda</p>
                <input
                  placeholder="Nama lengkap" value={leadForm.name}
                  onChange={e => setLeadForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <input
                  placeholder="Nomor HP / WhatsApp" value={leadForm.phone} type="tel"
                  onChange={e => setLeadForm(f => ({ ...f, phone: e.target.value }))}
                  className="w-full text-xs border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
                <Button size="sm" className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700"
                  onClick={saveLead} disabled={savingLead || !leadForm.name || !leadForm.phone}>
                  {savingLead ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Hubungi Saya
                </Button>
              </div>
            )}
            <div ref={endRef} />

            {/* Scroll to bottom button */}
            {showScrollBtn && (
              <button
                onClick={scrollToBottom}
                className="sticky bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-primary text-white text-[11px] font-medium px-3 py-1 rounded-full shadow-lg hover:bg-primary/90 transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 z-10"
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12l7 7 7-7" />
                </svg>
                Pesan terbaru
              </button>
            )}
          </div>

          {/* WA CTA */}
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="mx-3 mb-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-xl py-2 transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Chat via WhatsApp
            </a>
          )}

          {/* Suggestion Chips */}
          {messages.length <= 2 && !typing && (
            <div className="px-3 pt-2 pb-1 flex flex-wrap gap-1.5">
              {SUGGESTION_CHIPS.map((chip) => (
                <button
                  key={chip.text}
                  onClick={() => sendChip(chip.text)}
                  disabled={typing}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 hover:border-primary/50 transition-colors font-medium whitespace-nowrap disabled:opacity-50"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 pt-2 pb-3 border-t flex flex-col gap-1.5">
            <div className="flex gap-2">
              <input
                className={cn(
                  "flex-1 text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 transition-colors",
                  input.length >= 280
                    ? "border-red-400 focus:ring-red-300"
                    : "focus:ring-primary/30"
                )}
                placeholder="Ketik pesan..."
                value={input}
                maxLength={300}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
              />
              <Button
                size="icon"
                className="h-9 w-9 rounded-xl shrink-0"
                onClick={sendMessage}
                disabled={!input.trim() || typing || input.length > 300}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {input.length > 0 && (
              <p className={cn(
                "text-[10px] text-right pr-1 transition-colors",
                input.length >= 300 ? "text-red-500 font-semibold" :
                input.length >= 280 ? "text-orange-400 font-medium" :
                "text-muted-foreground"
              )}>
                {input.length}/300
                {input.length >= 300 && " — batas karakter tercapai"}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all relative",
          "bg-primary hover:scale-105 active:scale-95",
          open && "rotate-180"
        )}
      >
        {open ? <X className="h-6 w-6 text-white" /> : <MessageCircle className="h-6 w-6 text-white" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5">
            {/* Pulsing ring */}
            <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75" />
            {/* Solid badge */}
            <span className="relative flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold shadow-md">
              {unread > 9 ? "9+" : unread}
            </span>
          </span>
        )}
      </button>
    </div>
  );
}
