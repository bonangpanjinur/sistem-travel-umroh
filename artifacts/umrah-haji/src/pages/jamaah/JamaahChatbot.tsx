import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import {
  Bot, Send, User, RefreshCcw, Home, ChevronRight,
  Mic, Sparkles, ThumbsUp, ThumbsDown, Copy
} from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  liked?: boolean | null;
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

const SUGGESTED_QUESTIONS = [
  "Dokumen apa saja yang diperlukan?",
  "Bagaimana cara bayar cicilan?",
  "Berapa lama proses visa?",
  "Info hotel di Makkah?",
  "Ketentuan bagasi berapa kg?",
  "Panduan ibadah umroh?",
];

function findAnswer(question: string): string {
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

export default function JamaahChatbot() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "Assalamu'alaikum warahmatullahi wabarakatuh! 🌙\n\nSaya adalah Asisten Virtual Vinstour Travel. Saya siap membantu Anda dengan pertanyaan seputar:\n\n• 📋 Dokumen & persyaratan\n• 💰 Pembayaran & cicilan\n• 🛂 Proses visa\n• 🏨 Info hotel & jadwal\n• 🕋 Panduan ibadah\n• 🧳 Ketentuan bagasi\n\nSilakan ketik pertanyaan Anda!",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function sendMessage(text?: string) {
    const msg = (text || input).trim();
    if (!msg) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: msg, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setTimeout(() => {
      const answer = findAnswer(msg);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: answer,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
      setLoading(false);
    }, 800 + Math.random() * 500);
  }

  function rateMessage(msgId: string, liked: boolean) {
    setMessages(prev => prev.map(m => m.id === msgId ? { ...m, liked } : m));
    toast.success(liked ? "Terima kasih atas feedback positifnya!" : "Terima kasih, kami akan terus meningkatkan kualitas jawaban");
  }

  function copyMessage(content: string) {
    navigator.clipboard.writeText(content);
    toast.success("Pesan disalin");
  }

  function clearChat() {
    setMessages([{
      id: "new",
      role: "assistant",
      content: "Chat baru dimulai. Silakan ajukan pertanyaan Anda! 🌙",
      timestamp: new Date(),
    }]);
  }

  function formatContent(content: string) {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/→ \*(.*?)\*/g, '→ <code>$1</code>')
      .split('\n')
      .map((line, i) => `<span key="${i}">${line}</span>`)
      .join('<br/>');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-0">
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
                <p className="text-xs text-green-500 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />Online</p>
              </div>
            </div>
          </div>
          <Button size="sm" variant="ghost" onClick={clearChat}><RefreshCcw className="h-4 w-4" /></Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-32">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-gradient-to-br from-violet-500 to-indigo-600" : "bg-gradient-to-br from-green-400 to-emerald-500"}`}>
              {msg.role === "assistant" ? <Bot className="h-4 w-4 text-white" /> : <User className="h-4 w-4 text-white" />}
            </div>
            <div className={`max-w-[85%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
              <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-indigo-600 text-white rounded-tr-sm" : "bg-white border shadow-sm rounded-tl-sm"}`}>
                <div
                  dangerouslySetInnerHTML={{ __html: formatContent(msg.content) }}
                  className="whitespace-pre-wrap"
                />
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
    </div>
  );
}
