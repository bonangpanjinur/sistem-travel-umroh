import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  MessageSquare, Bell, Zap, CheckCircle2, Clock, Send, Settings,
  RefreshCcw, AlertCircle, Play, Pause, Info, Phone, History,
  CreditCard, Plane, FileCheck, PiggyBank, Calendar, Activity,
  Terminal, BarChart3, Users
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

const TRIGGER_EVENTS = [
  {
    id: "payment_confirmed",
    icon: CreditCard,
    label: "Pembayaran Dikonfirmasi",
    desc: "Kirim WA otomatis setelah admin mengkonfirmasi pembayaran jamaah",
    template: `Assalamu'alaikum *{nama}*,

✅ *Pembayaran Anda Telah Dikonfirmasi!*

Terima kasih telah melakukan pembayaran sebesar *{jumlah}* untuk paket *{paket}*.

📋 Detail:
• Kode Booking: *{kode_booking}*
• Tanggal Konfirmasi: *{tanggal}*
• Status: ✅ Dikonfirmasi

Silakan login ke portal jamaah untuk melihat detail lengkap.

Barakallahu fiikum 🤲
_Tim Vinstour Travel_`,
    color: "text-green-600 bg-green-50",
    badge: "bg-green-100 text-green-700",
  },
  {
    id: "h7_departure",
    icon: Plane,
    label: "H-7 Keberangkatan",
    desc: "Kirim WA pengingat 7 hari sebelum keberangkatan (otomatis setiap pagi 07:00 WIB)",
    template: `Assalamu'alaikum *{nama}*,

✈️ *Pengingat — Keberangkatan H-7!*

Keberangkatan Anda ke Tanah Suci tinggal *7 hari lagi* pada *{tanggal_berangkat}*.

📦 Paket: *{paket}*
📋 Kode Booking: *{kode_booking}*

📋 *Persiapan yang perlu dilakukan:*
• ✅ Pastikan paspor masih berlaku min. 6 bulan
• ✅ Siapkan: KTP, buku nikah/KK, suntik meningitis
• ✅ Lunasi sisa pembayaran (jika ada)
• ✅ Packing sesuai kuota bagasi
• ✅ Unduh aplikasi & akses portal jamaah

Informasi lebih lanjut, hubungi kami.

Barakallahu fiikum 🤲
_Tim Vinstour Travel_`,
    color: "text-blue-600 bg-blue-50",
    badge: "bg-blue-100 text-blue-700",
  },
  {
    id: "h1_departure",
    icon: Calendar,
    label: "H-1 Keberangkatan",
    desc: "Kirim WA pengingat final 1 hari sebelum keberangkatan (otomatis setiap malam 06:00 WIB)",
    template: `Assalamu'alaikum *{nama}*,

🕋 *Besok Hari Keberangkatan!*

Alhamdulillah, besok Anda akan menjalani perjalanan ibadah yang mulia. Semoga menjadi haji/umroh yang mabrur.

📦 Paket: *{paket}*
📋 Kode Booking: *{kode_booking}*
📅 Keberangkatan: *{tanggal_berangkat}*

Bawa semua dokumen perjalanan dan pastikan kondisi fisik prima.

Barakallahu fiikum 🤲
_Tim Vinstour Travel_`,
    color: "text-orange-600 bg-orange-50",
    badge: "bg-orange-100 text-orange-700",
  },
  {
    id: "visa_approved",
    icon: FileCheck,
    label: "Visa Disetujui",
    desc: "Kirim WA notifikasi saat visa jamaah telah disetujui",
    template: `Assalamu'alaikum *{nama}*,

🎉 *Visa Anda Telah Disetujui!*

Alhamdulillah, visa Umroh/Haji Anda telah *disetujui* oleh Kedutaan Arab Saudi.

📋 Detail Visa:
• Nomor Visa: *{nomor_visa}*
• Tanggal Approved: *{tanggal}*

Visa Anda sudah tersimpan di portal jamaah.

Jazakallah khair 🤲
_Tim Vinstour Travel_`,
    color: "text-purple-600 bg-purple-50",
    badge: "bg-purple-100 text-purple-700",
  },
  {
    id: "savings_reminder",
    icon: PiggyBank,
    label: "Pengingat Cicilan Tabungan",
    desc: "Kirim WA 3 hari sebelum tanggal setor cicilan tabungan (otomatis setiap pagi 08:00 WIB)",
    template: `Assalamu'alaikum *{nama}*,

💰 *Pengingat Setoran Tabungan*

Tanggal setoran tabungan Umroh Anda akan jatuh tempo pada *{tanggal_jatuh_tempo}* (3 hari lagi).

📋 Detail Setoran:
• Jumlah: *{jumlah_cicilan}*
• Total Terkumpul: *{total_terkumpul}*

Silakan lakukan setoran tepat waktu agar perjalanan Anda tidak tertunda.

Barakallahu fiikum 🤲
_Tim Vinstour Travel_`,
    color: "text-amber-600 bg-amber-50",
    badge: "bg-amber-100 text-amber-700",
  },
  {
    id: "document_verified",
    icon: FileCheck,
    label: "Dokumen Diverifikasi",
    desc: "Kirim WA saat dokumen jamaah telah diverifikasi oleh admin",
    template: `Assalamu'alaikum *{nama}*,

📄 *Dokumen Anda Telah Diverifikasi!*

Dokumen *{nama_dokumen}* Anda telah berhasil diverifikasi dan dinyatakan ✅ *Valid*.

Silakan login ke portal jamaah untuk melihat status dokumen lengkap Anda.

Barakallahu fiikum 🤲
_Tim Vinstour Travel_`,
    color: "text-teal-600 bg-teal-50",
    badge: "bg-teal-100 text-teal-700",
  },
  {
    id: "doc_deadline_h3",
    icon: Clock,
    label: "Deadline Upload Dokumen H-3",
    desc: "Kirim WA pengingat 3 hari sebelum batas upload dokumen jamaah (otomatis setiap pagi 09:00 WIB)",
    template: `Assalamu'alaikum *{nama}*,

📄 *Pengingat — Batas Upload Dokumen H-3!*

Batas waktu pengumpulan dokumen perjalanan Anda untuk paket *{paket}* tinggal *3 hari lagi* pada *{deadline}*.

📋 Kode Booking: *{kode_booking}*

Dokumen yang perlu disiapkan:
• ✅ Paspor (scan halaman data diri)
• ✅ KTP / KK / Akta Lahir
• ✅ Foto 4x6 background putih
• ✅ Suntik meningitis (jika ada)
• ✅ Buku nikah / surat mahram (jika diperlukan)

Segera upload dokumen melalui portal jamaah atau hubungi agen Anda.

Barakallahu fiikum 🤲
_Tim Vinstour Travel_`,
    color: "text-yellow-600 bg-yellow-50",
    badge: "bg-yellow-100 text-yellow-700",
  },
  {
    id: "doc_deadline_h1",
    icon: AlertCircle,
    label: "Deadline Upload Dokumen H-1",
    desc: "Kirim WA urgensi 1 hari sebelum batas upload dokumen (otomatis setiap malam 06:30 WIB)",
    template: `Assalamu'alaikum *{nama}*,

⚠️ *SEGERA — Batas Upload Dokumen Besok!*

Batas pengumpulan dokumen perjalanan Anda untuk paket *{paket}* adalah *besok, {deadline}*.

📋 Kode Booking: *{kode_booking}*

Harap segera melengkapi dan mengupload dokumen Anda agar proses perjalanan ibadah tidak terganggu. Hubungi agen Anda jika membutuhkan bantuan.

Barakallahu fiikum 🤲
_Tim Vinstour Travel_`,
    color: "text-red-600 bg-red-50",
    badge: "bg-red-100 text-red-700",
  },
];

type ReminderStatus = {
  fonnte_token_set: boolean;
  configured: boolean;
  triggers: Record<string, boolean>;
  upcoming: { cicilan: number; departure_h7: number; departure_h1: number; doc_deadline_h3: number; doc_deadline_h1: number };
  next_run: string;
  cicilan_settings: { auto_enabled: boolean; reminder_days: number };
};

export default function AdminWAOtomatis() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("triggers");
  const [editingTrigger, setEditingTrigger] = useState<string | null>(null);
  const [editTemplate, setEditTemplate] = useState("");
  const [triggerStates, setTriggerStates] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("wa_otomatis_triggers") || "{}"); } catch { return {}; }
  });
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");
  const [triggeringDeparture, setTriggeringDeparture] = useState<null | 7 | 1>(null);
  const [triggeringDocDeadline, setTriggeringDocDeadline] = useState<null | 3 | 1>(null);

  // Load trigger states + templates from DB on mount
  useEffect(() => {
    (async () => {
      try {
        const keys = ["wa_otomatis_triggers", ...TRIGGER_EVENTS.map(t => `wa_template_${t.id}`)];
        const { data } = await supabase.from("app_settings").select("key,value").in("key", keys);
        if (!data?.length) return;
        for (const row of data) {
          const val = JSON.parse(row.value);
          if (row.key === "wa_otomatis_triggers") {
            setTriggerStates(val);
            localStorage.setItem("wa_otomatis_triggers", JSON.stringify(val));
          } else if (row.key.startsWith("wa_template_")) {
            localStorage.setItem(row.key, val);
          }
        }
      } catch {}
    })();
  }, []);

  // WA config status
  const { data: waConfig } = useQuery({
    queryKey: ["wa-config"],
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_config").select("*").eq("is_active", true).maybeSingle();
      return data;
    },
  });

  // Backend reminder status (FONNTE_TOKEN + upcoming counts)
  const { data: reminderStatus, refetch: refetchStatus, isLoading: statusLoading } = useQuery<ReminderStatus>({
    queryKey: ["reminder-status"],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/reminders/status`);
      if (!res.ok) throw new Error("Gagal cek status");
      return res.json();
    },
    retry: false,
    staleTime: 30_000,
  });

  // WA logs
  const { data: logs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["wa-otomatis-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return data || [];
    },
  });

  async function toggleTrigger(id: string, val: boolean) {
    const next = { ...triggerStates, [id]: val };
    setTriggerStates(next);
    localStorage.setItem("wa_otomatis_triggers", JSON.stringify(next));
    try {
      await supabase.from("app_settings").upsert(
        { key: "wa_otomatis_triggers", value: JSON.stringify(next), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    } catch {}
    toast.success(val
      ? `Trigger "${TRIGGER_EVENTS.find(t => t.id === id)?.label}" diaktifkan`
      : "Trigger dinonaktifkan");
  }

  function startEdit(trigger: typeof TRIGGER_EVENTS[0]) {
    const saved = localStorage.getItem(`wa_template_${trigger.id}`);
    setEditTemplate(saved || trigger.template);
    setEditingTrigger(trigger.id);
  }

  async function saveTemplate(id: string) {
    localStorage.setItem(`wa_template_${id}`, editTemplate);
    try {
      await supabase.from("app_settings").upsert(
        { key: `wa_template_${id}`, value: JSON.stringify(editTemplate), updated_at: new Date().toISOString() },
        { onConflict: "key" }
      );
    } catch {}
    setEditingTrigger(null);
    toast.success("Template berhasil disimpan");
  }

  // Send test via backend proxy (secure — token stays on server)
  async function sendTestWA(trigger: typeof TRIGGER_EVENTS[0]) {
    if (!testPhone) { toast.error("Masukkan nomor telepon untuk test"); return; }
    if (!reminderStatus?.fonnte_token_set) {
      toast.error("FONNTE_TOKEN belum dikonfigurasi di Replit Secrets");
      return;
    }
    setSendingTest(trigger.id);
    try {
      const msg = (localStorage.getItem(`wa_template_${trigger.id}`) || trigger.template)
        .replace(/{nama}/g, "Test User")
        .replace(/{jumlah}/g, "Rp 5.000.000")
        .replace(/{paket}/g, "Umroh Reguler Plus")
        .replace(/{kode_booking}/g, "VT-TEST-001")
        .replace(/{tanggal}/g, format(new Date(), "dd MMMM yyyy", { locale: idLocale }))
        .replace(/{tanggal_berangkat}/g, "15 Ramadhan 1447H")
        .replace(/{nomor_visa}/g, "V-12345")
        .replace(/{jumlah_cicilan}/g, "Rp 1.500.000")
        .replace(/{nama_paket}/g, "Tabungan Umroh Plus")
        .replace(/{total_terkumpul}/g, "Rp 12.000.000")
        .replace(/{tanggal_jatuh_tempo}/g, format(new Date(), "dd MMMM yyyy", { locale: idLocale }))
        .replace(/{nama_dokumen}/g, "Paspor")
        .replace(/\{[a-zA-Z_]\w*\}/g, "");

      const res = await fetch(`${API_BASE}/api/whatsapp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: testPhone, message: msg }),
      });
      const data = await res.json();
      if (data.success) toast.success(`Test WA berhasil dikirim! (trigger: ${trigger.label})`);
      else toast.error("Gagal kirim: " + (data.error || "unknown error"));
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setSendingTest(null);
    }
  }

  // Manual trigger for departure reminders
  async function manualTriggerDeparture(days: 7 | 1) {
    setTriggeringDeparture(days);
    try {
      const res = await fetch(`${API_BASE}/api/reminders/trigger-departure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const data = await res.json();
      if (data.success) {
        const { sent, failed, skipped, details } = data.result;
        toast.success(`H-${days} Departure: ${sent} terkirim, ${failed} gagal, ${skipped} dilewati`);
        if (details?.length) console.log("[Departure H-" + days + "]", details);
        queryClient.invalidateQueries({ queryKey: ["wa-otomatis-logs"] });
        refetchStatus();
      } else {
        toast.error("Gagal: " + (data.error || "unknown"));
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setTriggeringDeparture(null);
    }
  }

  // Manual trigger for doc deadline reminders
  async function manualTriggerDocDeadline(days: 3 | 1) {
    setTriggeringDocDeadline(days);
    try {
      const res = await fetch(`${API_BASE}/api/reminders/trigger-doc-deadline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days }),
      });
      const data = await res.json();
      if (data.success) {
        const { sent, failed, skipped, details } = data.result;
        toast.success(`Deadline H-${days}: ${sent} terkirim, ${failed} gagal, ${skipped} dilewati`);
        if (details?.length) console.log("[DocDeadline H-" + days + "]", details);
        queryClient.invalidateQueries({ queryKey: ["wa-otomatis-logs"] });
        refetchStatus();
      } else {
        toast.error("Gagal: " + (data.error || "unknown"));
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setTriggeringDocDeadline(null);
    }
  }

  const activeCount = Object.values(triggerStates).filter(Boolean).length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            WA Notifikasi Otomatis
          </h1>
          <p className="text-muted-foreground mt-1">Kelola trigger pengiriman WhatsApp otomatis ke jamaah</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <Badge className="gap-1 bg-green-100 text-green-700 border-0">
            <CheckCircle2 className="h-3 w-3" /> {activeCount} Trigger Aktif
          </Badge>
          {reminderStatus?.fonnte_token_set ? (
            <Badge className="gap-1 bg-blue-100 text-blue-700 border-0">
              <Phone className="h-3 w-3" /> Fonnte Aktif
            </Badge>
          ) : (
            <Badge className="gap-1 bg-red-100 text-red-700 border-0">
              <AlertCircle className="h-3 w-3" /> Fonnte Belum Dikonfigurasi
            </Badge>
          )}
        </div>
      </div>

      {/* Status Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Fonnte status */}
        <Card className={`border-2 md:col-span-1 ${reminderStatus?.fonnte_token_set ? "border-green-300 bg-green-50/50 dark:bg-green-950/20" : "border-red-300 bg-red-50/50 dark:bg-red-950/20"}`}>
          <CardContent className="p-4 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              {reminderStatus?.fonnte_token_set
                ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                : <AlertCircle className="h-5 w-5 text-red-500" />
              }
              <p className="font-semibold text-sm">FONNTE_TOKEN</p>
            </div>
            <p className="text-xs text-muted-foreground">
              {reminderStatus?.fonnte_token_set ? "✅ Terkonfigurasi di Replit Secrets" : "❌ Belum diset di Replit Secrets"}
            </p>
            <Button size="sm" variant="outline" className="h-7 text-xs mt-1" onClick={() => refetchStatus()}>
              <RefreshCcw className="h-3 w-3 mr-1" /> Refresh
            </Button>
          </CardContent>
        </Card>

        {/* Upcoming H-7 */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><Plane className="h-5 w-5 text-blue-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Jamaah H-7 Besok</p>
              <p className="text-2xl font-bold">{statusLoading ? "—" : (reminderStatus?.upcoming?.departure_h7 ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground">Siap dapat WA besok pagi</p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming H-1 */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg"><Calendar className="h-5 w-5 text-orange-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Jamaah H-1 Besok</p>
              <p className="text-2xl font-bold">{statusLoading ? "—" : (reminderStatus?.upcoming?.departure_h1 ?? 0)}</p>
              <p className="text-[10px] text-muted-foreground">Pengingat malam ini</p>
            </div>
          </CardContent>
        </Card>

        {/* Jadwal cron */}
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg"><Clock className="h-5 w-5 text-purple-600" /></div>
            <div>
              <p className="text-xs text-muted-foreground">Jadwal Otomatis</p>
              <p className="text-sm font-semibold">3× sehari</p>
              <p className="text-[10px] text-muted-foreground">06:00 · 07:00 · 08:00 WIB</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alert if Fonnte not set */}
      {!reminderStatus?.fonnte_token_set && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>FONNTE_TOKEN belum dikonfigurasi.</strong> Tambahkan token Fonnte di <strong>Replit → Secrets → FONNTE_TOKEN</strong> agar WA otomatis berfungsi. Dapatkan token di{" "}
            <a href="https://fonnte.com" target="_blank" rel="noreferrer" className="underline">fonnte.com</a>.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="triggers"><Bell className="h-4 w-4 mr-1" />Trigger Otomatis</TabsTrigger>
          <TabsTrigger value="manual"><Activity className="h-4 w-4 mr-1" />Kirim Manual</TabsTrigger>
          <TabsTrigger value="test"><Send className="h-4 w-4 mr-1" />Kirim Test</TabsTrigger>
          <TabsTrigger value="logs"><History className="h-4 w-4 mr-1" />Riwayat Pengiriman</TabsTrigger>
        </TabsList>

        {/* ── Tab 1: Trigger Settings ── */}
        <TabsContent value="triggers" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Aktifkan trigger yang diinginkan. Saat event terjadi, sistem akan otomatis mengirim WhatsApp ke jamaah. Perubahan disimpan ke database.
          </p>

          {/* Jadwal cron info */}
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-1">Jadwal Cron Otomatis</p>
                  <ul className="space-y-0.5">
                    <li>• <strong>06:00 WIB</strong> — H-1 Departure Reminder</li>
                    <li>• <strong>07:00 WIB</strong> — H-7 Departure Reminder</li>
                    <li>• <strong>08:00 WIB</strong> — Cicilan Tabungan + Batas Pembayaran</li>
                  </ul>
                  <p className="mt-1.5">Trigger <strong>Pembayaran Dikonfirmasi</strong> berjalan saat admin mengklik konfirmasi di halaman Pembayaran.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {TRIGGER_EVENTS.map(trigger => {
            const Icon = trigger.icon;
            const isActive = triggerStates[trigger.id] ?? false;
            const hasCustomTemplate = !!localStorage.getItem(`wa_template_${trigger.id}`);
            return (
              <Card key={trigger.id} className={`border-2 transition-all ${isActive ? "border-green-200 bg-green-50/30" : "border-border"}`}>
                <CardContent className="p-4">
                  {editingTrigger === trigger.id ? (
                    <div className="space-y-3">
                      <Label className="font-semibold">Edit Template — {trigger.label}</Label>
                      <Textarea
                        value={editTemplate}
                        onChange={e => setEditTemplate(e.target.value)}
                        rows={12}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Variabel: <code>{"{nama}"}</code>, <code>{"{jumlah}"}</code>, <code>{"{paket}"}</code>, <code>{"{kode_booking}"}</code>, <code>{"{tanggal}"}</code>, <code>{"{tanggal_berangkat}"}</code>
                      </p>
                      <div className="flex gap-2 flex-wrap">
                        <Button size="sm" onClick={() => saveTemplate(trigger.id)}>Simpan Template</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingTrigger(null)}>Batal</Button>
                        <Button size="sm" variant="ghost" onClick={() => {
                          localStorage.removeItem(`wa_template_${trigger.id}`);
                          setEditTemplate(trigger.template);
                          toast.info("Reset ke template default");
                        }}>Reset Default</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${trigger.color} shrink-0`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold">{trigger.label}</p>
                            {hasCustomTemplate && (
                              <Badge variant="outline" className="text-[10px]">Template Custom</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{trigger.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <Button size="sm" variant="outline" onClick={() => startEdit(trigger)}>
                          <Settings className="h-3 w-3 mr-1" />Edit
                        </Button>
                        <Switch checked={isActive} onCheckedChange={val => toggleTrigger(trigger.id, val)} />
                        {isActive
                          ? <Badge className={`${trigger.badge} border-0 text-[10px]`}><Play className="h-3 w-3 mr-0.5" />Aktif</Badge>
                          : <Badge className="bg-muted text-muted-foreground border-0 text-[10px]"><Pause className="h-3 w-3 mr-0.5" />Nonaktif</Badge>
                        }
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* ── Tab 2: Manual Trigger ── */}
        <TabsContent value="manual" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Plane className="h-4 w-4" /> Trigger Manual Departure Reminder
              </CardTitle>
              <CardDescription>
                Kirim WA H-7 atau H-1 sekarang juga ke semua jamaah yang keberangkatannya sesuai tanggal. Hanya berjalan jika trigger aktif.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!reminderStatus?.fonnte_token_set && (
                <Alert className="border-red-300 bg-red-50">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertDescription className="text-red-700 text-sm">FONNTE_TOKEN belum dikonfigurasi — kirim manual tidak bisa dilakukan.</AlertDescription>
                </Alert>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                {/* H-7 */}
                <Card className="border-blue-200 bg-blue-50/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Plane className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-semibold text-sm">H-7 Departure</p>
                        <p className="text-xs text-muted-foreground">Jamaah dengan keberangkatan 7 hari dari sekarang</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{reminderStatus?.upcoming?.departure_h7 ?? "—"} jamaah eligible</span>
                    </div>
                    {!triggerStates["h7_departure"] && (
                      <p className="text-xs text-amber-600">⚠️ Trigger H-7 belum diaktifkan di tab Trigger Otomatis</p>
                    )}
                    <Button
                      className="w-full"
                      disabled={!reminderStatus?.fonnte_token_set || triggeringDeparture === 7}
                      onClick={() => manualTriggerDeparture(7)}
                    >
                      {triggeringDeparture === 7
                        ? <><RefreshCcw className="h-4 w-4 mr-2 animate-spin" />Mengirim...</>
                        : <><Send className="h-4 w-4 mr-2" />Kirim H-7 Sekarang</>
                      }
                    </Button>
                  </CardContent>
                </Card>

                {/* H-1 */}
                <Card className="border-orange-200 bg-orange-50/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-5 w-5 text-orange-600" />
                      <div>
                        <p className="font-semibold text-sm">H-1 Departure</p>
                        <p className="text-xs text-muted-foreground">Jamaah yang berangkat besok</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{reminderStatus?.upcoming?.departure_h1 ?? "—"} jamaah eligible</span>
                    </div>
                    {!triggerStates["h1_departure"] && (
                      <p className="text-xs text-amber-600">⚠️ Trigger H-1 belum diaktifkan di tab Trigger Otomatis</p>
                    )}
                    <Button
                      className="w-full"
                      variant="secondary"
                      disabled={!reminderStatus?.fonnte_token_set || triggeringDeparture === 1}
                      onClick={() => manualTriggerDeparture(1)}
                    >
                      {triggeringDeparture === 1
                        ? <><RefreshCcw className="h-4 w-4 mr-2 animate-spin" />Mengirim...</>
                        : <><Send className="h-4 w-4 mr-2" />Kirim H-1 Sekarang</>
                      }
                    </Button>
                  </CardContent>
                </Card>

                {/* Doc Deadline H-3 */}
                <Card className="border-yellow-200 bg-yellow-50/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-yellow-600" />
                      <div>
                        <p className="font-semibold text-sm">Deadline Dokumen H-3</p>
                        <p className="text-xs text-muted-foreground">Jamaah dengan deadline upload dokumen 3 hari lagi</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{reminderStatus?.upcoming?.doc_deadline_h3 ?? "—"} keberangkatan eligible</span>
                    </div>
                    {!triggerStates["doc_deadline_h3"] && (
                      <p className="text-xs text-amber-600">⚠️ Trigger Deadline H-3 belum diaktifkan di tab Trigger Otomatis</p>
                    )}
                    <Button
                      className="w-full"
                      variant="outline"
                      disabled={!reminderStatus?.fonnte_token_set || triggeringDocDeadline === 3}
                      onClick={() => manualTriggerDocDeadline(3)}
                    >
                      {triggeringDocDeadline === 3
                        ? <><RefreshCcw className="h-4 w-4 mr-2 animate-spin" />Mengirim...</>
                        : <><Send className="h-4 w-4 mr-2" />Kirim Deadline H-3 Sekarang</>
                      }
                    </Button>
                  </CardContent>
                </Card>

                {/* Doc Deadline H-1 */}
                <Card className="border-red-200 bg-red-50/30">
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <div>
                        <p className="font-semibold text-sm">Deadline Dokumen H-1</p>
                        <p className="text-xs text-muted-foreground">Jamaah dengan deadline upload dokumen besok</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{reminderStatus?.upcoming?.doc_deadline_h1 ?? "—"} keberangkatan eligible</span>
                    </div>
                    {!triggerStates["doc_deadline_h1"] && (
                      <p className="text-xs text-amber-600">⚠️ Trigger Deadline H-1 belum diaktifkan di tab Trigger Otomatis</p>
                    )}
                    <Button
                      className="w-full"
                      variant="destructive"
                      disabled={!reminderStatus?.fonnte_token_set || triggeringDocDeadline === 1}
                      onClick={() => manualTriggerDocDeadline(1)}
                    >
                      {triggeringDocDeadline === 1
                        ? <><RefreshCcw className="h-4 w-4 mr-2 animate-spin" />Mengirim...</>
                        : <><Send className="h-4 w-4 mr-2" />Kirim Deadline H-1 Sekarang</>
                      }
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div className="space-y-2">
                <p className="text-sm font-medium">Jadwal Otomatis (Cron Server)</p>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { time: "06:00 WIB", label: "H-1 Departure Reminder", color: "text-orange-600" },
                    { time: "06:30 WIB", label: "Deadline Dokumen H-1", color: "text-red-600" },
                    { time: "07:00 WIB", label: "H-7 Departure Reminder", color: "text-blue-600" },
                    { time: "08:00 WIB", label: "Cicilan + Batas Pembayaran", color: "text-green-600" },
                    { time: "09:00 WIB", label: "Deadline Dokumen H-3", color: "text-yellow-600" },
                  ].map(({ time, label, color }) => (
                    <div key={time} className="flex items-center gap-3 p-2.5 bg-muted/50 rounded-lg">
                      <Clock className={`h-4 w-4 ${color} flex-shrink-0`} />
                      <span className="text-sm font-mono font-medium">{time}</span>
                      <span className="text-sm text-muted-foreground">—</span>
                      <span className="text-sm">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 3: Test ── */}
        <TabsContent value="test" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kirim Test WA</CardTitle>
              <CardDescription>
                Uji setiap template ke nomor tertentu. Pesan dikirim via backend server (token aman).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Nomor Telepon Penerima Test</Label>
                <Input
                  placeholder="Contoh: 08123456789"
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                />
              </div>

              {!reminderStatus?.fonnte_token_set && (
                <Alert className="border-amber-300 bg-amber-50">
                  <AlertCircle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-sm">
                    FONNTE_TOKEN belum diset di Replit Secrets — test tidak bisa dikirim.
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-3 md:grid-cols-2">
                {TRIGGER_EVENTS.map(trigger => {
                  const Icon = trigger.icon;
                  return (
                    <Card key={trigger.id} className="border">
                      <CardContent className="p-3 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded ${trigger.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <span className="text-sm font-medium">{trigger.label}</span>
                            {triggerStates[trigger.id] && (
                              <Badge className={`ml-1.5 ${trigger.badge} border-0 text-[9px]`}>Aktif</Badge>
                            )}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={sendingTest === trigger.id || !reminderStatus?.fonnte_token_set}
                          onClick={() => sendTestWA(trigger)}
                        >
                          {sendingTest === trigger.id
                            ? <RefreshCcw className="h-3 w-3 animate-spin" />
                            : <Send className="h-3 w-3" />
                          }
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab 4: Logs ── */}
        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Riwayat Pengiriman WA Otomatis
                <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["wa-otomatis-logs"] })}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Memuat riwayat...</p>
              ) : (logs as any[]).length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Belum ada riwayat pengiriman WA otomatis</p>
                  <p className="text-xs mt-1">Log akan muncul setelah reminder pertama dikirim</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Penerima</TableHead>
                      <TableHead>Trigger</TableHead>
                      <TableHead>Pesan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Waktu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(logs as any[]).map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{log.recipient_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{log.recipient_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {(log.trigger_type || "—").replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs">{log.message_content}</p>
                        </TableCell>
                        <TableCell>
                          {log.status === "sent" ? (
                            <Badge className="bg-green-100 text-green-700 border-0 text-[10px]">
                              <CheckCircle2 className="h-3 w-3 mr-0.5" />Terkirim
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 border-0 text-[10px]">
                              <AlertCircle className="h-3 w-3 mr-0.5" />Gagal
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {log.created_at ? format(parseISO(log.created_at), "dd MMM yyyy HH:mm", { locale: idLocale }) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
