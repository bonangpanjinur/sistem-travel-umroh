import { useState, useEffect } from "react";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  Bot, Key, CheckCircle2, AlertCircle, Eye, EyeOff,
  Loader2, ExternalLink, Send, RefreshCcw, Sparkles,
  MessageSquare, Settings, Info, Zap, Package, Database
} from "lucide-react";
import { buildPackageContext } from "@/lib/packageContext";

const DEFAULT_SYSTEM_PROMPT = `Kamu adalah Asisten Virtual yang ramah dan informatif untuk layanan perjalanan Umroh dan Haji.
Bantu calon jamaah dengan pertanyaan seputar:
- Paket Umroh dan Haji (reguler, plus, VIP)
- Persyaratan dokumen (paspor, visa, vaksin)
- Informasi pembayaran dan cicilan
- Jadwal keberangkatan dan hotel
- Panduan ibadah dan manasik
Gunakan Bahasa Indonesia yang sopan dan hangat. Jawab singkat tapi lengkap (max 5 kalimat).
Selalu ajak calon jamaah untuk mendaftar atau menghubungi tim jika butuh info lebih lanjut.`;

export default function AdminGeminiAI() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState("gemini-2.0-flash");
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [botName, setBotName] = useState("Asisten Vinstour");
  const [greeting, setGreeting] = useState("Halo! Selamat datang. Ada yang bisa saya bantu? 😊");
  const [enableLeadCapture, setEnableLeadCapture] = useState(true);

  const GEMINI_MODELS = [
    {
      id: "gemini-2.0-flash",
      name: "Gemini 2.0 Flash",
      desc: "Tercepat & terbaru — direkomendasikan (butuh billing aktif)",
      badge: "Terbaru",
      badgeColor: "bg-purple-100 text-purple-700",
    },
    {
      id: "gemini-1.5-flash",
      name: "Gemini 1.5 Flash",
      desc: "Cepat & andal — tersedia di free tier tanpa billing",
      badge: "Gratis",
      badgeColor: "bg-green-100 text-green-700",
    },
    {
      id: "gemini-1.5-flash-8b",
      name: "Gemini 1.5 Flash-8B",
      desc: "Paling ringan — kuota gratis tertinggi, ideal untuk volume tinggi",
      badge: "Hemat",
      badgeColor: "bg-blue-100 text-blue-700",
    },
    {
      id: "gemini-1.5-pro",
      name: "Gemini 1.5 Pro",
      desc: "Paling cerdas — jawaban paling akurat, kuota lebih terbatas",
      badge: "Pro",
      badgeColor: "bg-amber-100 text-amber-700",
    },
  ];
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testInput, setTestInput] = useState("Apa saja paket umroh yang tersedia?");
  const [testResult, setTestResult] = useState<{ answer: string; source: string } | null>(null);
  const [configured, setConfigured] = useState(false);
  const [packageContext, setPackageContext] = useState("");
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [packageCount, setPackageCount] = useState(0);

  useEffect(() => {
    loadPackageContext();
  }, []);

  async function loadPackageContext() {
    setLoadingPackages(true);
    try {
      const ctx = await buildPackageContext();
      setPackageContext(ctx);
      const matches = ctx.match(/^📦/gm);
      setPackageCount(matches?.length || 0);
    } catch {
      setPackageContext("");
    }
    setLoadingPackages(false);
  }

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("key,value")
          .in("key", ["gemini_api_key", "gemini_chatbot_config"]);
        if (data?.length) {
          for (const row of data) {
            if (row.key === "gemini_api_key") {
              const val = JSON.parse(row.value);
              if (val) { setApiKey(val); setConfigured(true); }
            }
            if (row.key === "gemini_chatbot_config") {
              const cfg = JSON.parse(row.value);
              if (cfg.model) setModel(cfg.model);
              if (cfg.systemPrompt) setSystemPrompt(cfg.systemPrompt);
              if (cfg.botName) setBotName(cfg.botName);
              if (cfg.greeting) setGreeting(cfg.greeting);
              if (typeof cfg.enableLeadCapture === "boolean") setEnableLeadCapture(cfg.enableLeadCapture);
            }
          }
        }
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!apiKey.trim()) { toast.error("Masukkan Gemini API Key terlebih dahulu"); return; }
    setSaving(true);
    try {
      await supabase.from("app_settings").upsert([
        { key: "gemini_api_key", value: JSON.stringify(apiKey.trim()), updated_at: new Date().toISOString() },
        {
          key: "gemini_chatbot_config",
          value: JSON.stringify({ model, systemPrompt, botName, greeting, enableLeadCapture }),
          updated_at: new Date().toISOString(),
        },
      ], { onConflict: "key" });
      setConfigured(true);
      toast.success("Konfigurasi Gemini AI berhasil disimpan!");
    } catch {
      toast.error("Gagal menyimpan konfigurasi");
    }
    setSaving(false);
  }

  async function testGemini() {
    if (!apiKey.trim()) { toast.error("Masukkan API Key terlebih dahulu"); return; }
    setTesting(true);
    setTestResult(null);
    try {
      const enrichedPrompt = packageContext
        ? `${systemPrompt}\n\n${packageContext}`
        : systemPrompt;
      const body = {
        system_instruction: { parts: [{ text: enrichedPrompt }] },
        contents: [{ role: "user", parts: [{ text: testInput }] }],
        generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
      };
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
        { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any)?.error?.message || `HTTP ${res.status}`);
      }
      const data: any = await res.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (answer) {
        setTestResult({ answer, source: "gemini" });
        toast.success("Koneksi Gemini AI berhasil!");
      } else {
        throw new Error("Tidak ada jawaban dari Gemini");
      }
    } catch (e: any) {
      toast.error(`Test gagal: ${e.message}`);
      setTestResult({ answer: `Error: ${e.message}`, source: "error" });
    }
    setTesting(false);
  }

  async function resetToDefault() {
    setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
    toast.success("System prompt direset ke default");
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Gemini AI Chatbot
          </h1>
          <p className="text-muted-foreground mt-1">Konfigurasi chatbot cerdas berbasis Google Gemini AI (gratis)</p>
        </div>
        <div className="flex gap-2">
          {configured ? (
            <Badge className="gap-1 bg-green-100 text-green-700 border-0">
              <CheckCircle2 className="h-3 w-3" /> Aktif
            </Badge>
          ) : (
            <Badge className="gap-1 bg-amber-100 text-amber-700 border-0">
              <AlertCircle className="h-3 w-3" /> Belum Dikonfigurasi
            </Badge>
          )}
          <Badge className={`gap-1 border-0 ${GEMINI_MODELS.find(m => m.id === model)?.badgeColor || "bg-purple-100 text-purple-700"}`}>
            <Zap className="h-3 w-3" /> {GEMINI_MODELS.find(m => m.id === model)?.name || model}
          </Badge>
        </div>
      </div>

      {/* Info Banner */}
      <Alert className="bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-800 text-sm">
          <strong>Gratis!</strong> Gemini 2.0 Flash tersedia gratis di Google AI Studio — 15 request/menit, 1 juta token/hari.
          Dapatkan API key di{" "}
          <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer"
            className="underline font-medium inline-flex items-center gap-1">
            aistudio.google.com <ExternalLink className="h-3 w-3" />
          </a>
        </AlertDescription>
      </Alert>

      {/* API Key */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="h-4 w-4 text-purple-500" /> Gemini API Key
          </CardTitle>
          <CardDescription>Kunci API dari Google AI Studio untuk mengaktifkan chatbot cerdas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Key</Label>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder="AIzaSy..."
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                className="pr-10 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setShowKey(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Key disimpan secara aman di database. Format: AIzaSy... (39 karakter)
            </p>
          </div>

          <div className="flex gap-2 items-center">
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-purple-600 hover:underline flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" /> Buat API Key di Google AI Studio
            </a>
            <span className="text-muted-foreground text-xs">·</span>
            <span className="text-xs text-muted-foreground">Gratis, tidak perlu kartu kredit</span>
          </div>
        </CardContent>
      </Card>

      {/* Model Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-500" /> Pilih Model Gemini
          </CardTitle>
          <CardDescription>Sesuaikan model dengan kuota & kebutuhan akun Google AI Anda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {GEMINI_MODELS.map(m => (
              <button
                key={m.id}
                type="button"
                onClick={() => setModel(m.id)}
                className={`text-left rounded-xl border-2 p-3 transition-all ${
                  model === m.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-white hover:border-primary/40"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-semibold">{m.name}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${m.badgeColor}`}>
                    {m.badge}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-snug">{m.desc}</p>
                {model === m.id && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-primary font-semibold">
                    <CheckCircle2 className="h-3 w-3" /> Dipilih
                  </div>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Jika mengalami error kuota pada Gemini 2.0 Flash, coba beralih ke <strong>Gemini 1.5 Flash</strong> yang tersedia gratis tanpa billing.
          </p>
        </CardContent>
      </Card>

      {/* Test */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-500" /> Test Koneksi
          </CardTitle>
          <CardDescription>Kirim pesan uji coba untuk memverifikasi API key Anda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={testInput}
              onChange={e => setTestInput(e.target.value)}
              placeholder="Ketik pertanyaan uji coba..."
              className="text-sm"
              onKeyDown={e => e.key === "Enter" && testGemini()}
            />
            <Button onClick={testGemini} disabled={testing || !apiKey.trim()} size="sm" className="gap-1.5 whitespace-nowrap">
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Test
            </Button>
          </div>
          {testResult && (
            <div className={`rounded-xl p-3 text-sm space-y-1 ${testResult.source === "error" ? "bg-red-50 border border-red-200" : "bg-green-50 border border-green-200"}`}>
              <div className="flex items-center gap-1.5">
                {testResult.source === "error"
                  ? <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                  : <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                <span className={`text-xs font-semibold ${testResult.source === "error" ? "text-red-700" : "text-green-700"}`}>
                  {testResult.source === "error" ? "Gagal" : `${GEMINI_MODELS.find(m => m.id === model)?.name || model} — Berhasil`}
                </span>
              </div>
              <p className={`text-xs leading-relaxed whitespace-pre-wrap ${testResult.source === "error" ? "text-red-800" : "text-green-900"}`}>
                {testResult.answer}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chatbot Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Settings className="h-4 w-4 text-gray-500" /> Pengaturan Chatbot
          </CardTitle>
          <CardDescription>Sesuaikan persona dan perilaku chatbot Anda</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Bot</Label>
              <Input value={botName} onChange={e => setBotName(e.target.value)} placeholder="Asisten Vinstour" />
            </div>
            <div className="space-y-2">
              <Label>Pesan Sambutan</Label>
              <Input value={greeting} onChange={e => setGreeting(e.target.value)} placeholder="Halo! Ada yang bisa saya bantu?" />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>System Prompt (Kepribadian Bot)</Label>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={resetToDefault}>
                <RefreshCcw className="h-3 w-3" /> Reset Default
              </Button>
            </div>
            <Textarea
              value={systemPrompt}
              onChange={e => setSystemPrompt(e.target.value)}
              rows={6}
              className="text-sm font-mono resize-none"
              placeholder="Instruksi perilaku chatbot..."
            />
            <p className="text-xs text-muted-foreground">
              Instruksi yang dikirim ke Gemini untuk mengatur kepribadian dan fokus topik chatbot.
            </p>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Lead Capture Otomatis</p>
              <p className="text-xs text-muted-foreground">Tampilkan form kontak setelah beberapa pesan untuk menangkap prospek</p>
            </div>
            <Switch checked={enableLeadCapture} onCheckedChange={setEnableLeadCapture} />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <Button onClick={save} disabled={saving} className="gap-2 min-w-36">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
        </Button>
      </div>

      {/* Package Context Preview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="h-4 w-4 text-green-500" /> Konteks Paket Otomatis
              </CardTitle>
              <CardDescription>Data paket aktif yang otomatis diinjeksi ke Gemini setiap sesi chat</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {packageCount > 0 && (
                <Badge className="bg-green-100 text-green-700 border-0 gap-1">
                  <Package className="h-3 w-3" /> {packageCount} paket
                </Badge>
              )}
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={loadPackageContext} disabled={loadingPackages}>
                {loadingPackages ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCcw className="h-3 w-3" />}
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPackages ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat data paket...
            </div>
          ) : packageContext ? (
            <ScrollArea className="h-48 w-full">
              <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed bg-gray-50 rounded-lg p-3">
                {packageContext}
              </pre>
            </ScrollArea>
          ) : (
            <div className="py-6 text-center text-sm text-muted-foreground space-y-1">
              <Package className="h-8 w-8 mx-auto text-gray-300 mb-2" />
              <p>Belum ada paket aktif di database.</p>
              <p className="text-xs">Tambahkan paket di menu <strong>Paket Perjalanan</strong> untuk mengisi konteks chatbot.</p>
            </div>
          )}
          {packageContext && (
            <p className="text-xs text-muted-foreground mt-2">
              Data ini otomatis ditambahkan ke system prompt Gemini sehingga chatbot dapat menjawab pertanyaan tentang harga, jadwal, dan ketersediaan paket secara akurat.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Status Info */}
      <Card className="bg-gray-50 border-dashed">
        <CardContent className="p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Cara Kerja</p>
          <div className="space-y-2">
            {[
              { icon: "1", text: "Pengunjung membuka chat widget di halaman publik" },
              { icon: "2", text: "Chatbot membaca konfigurasi Gemini + data paket aktif dari database" },
              { icon: "3", text: "Data paket diinjeksi ke system prompt → Gemini menjawab dengan harga & jadwal real" },
              { icon: "4", text: "Jika API key tidak tersedia, bot menggunakan FAQ lokal sebagai fallback" },
            ].map(item => (
              <div key={item.icon} className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {item.icon}
                </span>
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
