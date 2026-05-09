import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, X, Send, User, Bot, Loader2, PhoneCall } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";

type Message = {
  id: string;
  role: "user" | "bot";
  text: string;
  ts: Date;
};

const BOT_RESPONSES: Record<string, string> = {
  default: "Terima kasih sudah menghubungi kami! Tim kami akan segera membantu Anda. Silakan tinggalkan nama dan nomor HP untuk kami hubungi lebih lanjut.",
  umroh: "Kami memiliki berbagai paket Umroh mulai dari paket reguler, plus, hingga VIP. Durasi bervariasi 9–15 hari. Mau tahu paket yang mana?",
  haji: "Kami melayani Haji Reguler dan Haji Plus (ONH Plus). Masa tunggu bervariasi. Mau info lebih lanjut?",
  harga: "Harga paket Umroh mulai dari Rp 25 juta per orang (sudah termasuk tiket, hotel, visa). Mau saya kirimkan brosur lengkap?",
  visa: "Proses visa Umroh biasanya 7–14 hari kerja. Kami bantu urus dari awal sampai jadi!",
  daftar: "Untuk mendaftar, Anda bisa klik tombol 'Daftar Sekarang' di halaman paket, atau isi form di bawah dan tim kami akan menghubungi Anda.",
};

function getBotReply(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("umroh") || t.includes("umrah")) return BOT_RESPONSES.umroh;
  if (t.includes("haji")) return BOT_RESPONSES.haji;
  if (t.includes("harga") || t.includes("biaya") || t.includes("berapa")) return BOT_RESPONSES.harga;
  if (t.includes("visa")) return BOT_RESPONSES.visa;
  if (t.includes("daftar") || t.includes("booking") || t.includes("pesan")) return BOT_RESPONSES.daftar;
  return BOT_RESPONSES.default;
}

interface ChatWidgetProps {
  tenantName?: string;
  waNumber?: string;
}

export default function ChatWidget({ tenantName = "Vinstour Travel", waNumber }: ChatWidgetProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    id: "1", role: "bot",
    text: `Halo! Selamat datang di ${tenantName}. Ada yang bisa kami bantu? 😊`,
    ts: new Date(),
  }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [leadCaptured, setLeadCaptured] = useState(false);
  const [leadForm, setLeadForm] = useState({ name: "", phone: "" });
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [savingLead, setSavingLead] = useState(false);
  const [unread, setUnread] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (!open && messages.length > 1) setUnread(messages.filter(m => m.role === "bot").length - 1);
    if (open) setUnread(0);
  }, [open, messages]);

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text: input.trim(), ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const reply = getBotReply(userMsg.text);
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: "bot", text: reply, ts: new Date() };
      setMessages(prev => [...prev, botMsg]);
      setTyping(false);
      if (!leadCaptured && messages.length >= 3) setShowLeadForm(true);
    }, 1000 + Math.random() * 800);
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
    const confirmMsg: Message = {
      id: Date.now().toString(), role: "bot",
      text: `Terima kasih ${leadForm.name}! Tim kami akan segera menghubungi Anda di ${leadForm.phone}. 🎉`,
      ts: new Date(),
    };
    setMessages(prev => [...prev, confirmMsg]);
  };

  const waLink = waNumber
    ? `https://wa.me/${waNumber.replace(/\D/g, "")}?text=Halo%20${encodeURIComponent(tenantName)}%2C%20saya%20ingin%20informasi%20paket%20Umroh`
    : null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {/* Chat Window */}
      {open && (
        <div className="w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border flex flex-col" style={{ height: 480 }}>
          {/* Header */}
          <div className="bg-primary rounded-t-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <MessageCircle className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">{tenantName}</p>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                  <p className="text-white/80 text-[10px]">Online — Balas dalam menit</p>
                </div>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {messages.map(m => (
              <div key={m.id} className={cn("flex items-end gap-1.5", m.role === "user" ? "flex-row-reverse" : "flex-row")}>
                {m.role === "bot" && (
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Bot className="h-3 w-3 text-white" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                  m.role === "user" ? "bg-primary text-white rounded-br-sm" : "bg-white border rounded-bl-sm"
                )}>
                  <p>{m.text}</p>
                  <p className={cn("text-[9px] mt-0.5", m.role === "user" ? "text-white/60 text-right" : "text-muted-foreground")}>
                    {format(m.ts, "HH:mm")}
                  </p>
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex items-end gap-1.5">
                <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Bot className="h-3 w-3 text-white" />
                </div>
                <div className="bg-white border rounded-2xl rounded-bl-sm px-3 py-2">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Lead Capture Form */}
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
                <Button size="sm" className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-700" onClick={saveLead} disabled={savingLead || !leadForm.name || !leadForm.phone}>
                  {savingLead ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                  Hubungi Saya
                </Button>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* WA CTA */}
          {waLink && (
            <a href={waLink} target="_blank" rel="noopener noreferrer"
              className="mx-3 mb-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-xl py-2 transition-colors">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              Chat via WhatsApp
            </a>
          )}

          {/* Input */}
          <div className="p-3 border-t flex gap-2">
            <input
              className="flex-1 text-sm border rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Ketik pesan..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendMessage()}
            />
            <Button size="icon" className="h-9 w-9 rounded-xl shrink-0" onClick={sendMessage} disabled={!input.trim() || typing}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          "w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all",
          "bg-primary hover:scale-105 active:scale-95",
          open && "rotate-180"
        )}
      >
        {open ? <X className="h-6 w-6 text-white" /> : <MessageCircle className="h-6 w-6 text-white" />}
        {!open && unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>
    </div>
  );
}
