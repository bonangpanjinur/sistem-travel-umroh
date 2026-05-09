import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  MessageSquare, Bell, Zap, CheckCircle2, Clock, Send, Settings,
  RefreshCcw, AlertCircle, Play, Pause, Info, Phone, History,
  CreditCard, Plane, FileCheck, PiggyBank, Calendar
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";

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
  },
  {
    id: "h7_departure",
    icon: Plane,
    label: "H-7 Keberangkatan",
    desc: "Kirim WA pengingat 7 hari sebelum keberangkatan jamaah",
    template: `Assalamu'alaikum *{nama}*,

✈️ *Pengingat — Keberangkatan H-7!*

Keberangkatan Anda ke Tanah Suci tinggal *7 hari lagi* pada *{tanggal_berangkat}*.

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
• Berlaku Hingga: *{berlaku}*

Visa Anda sudah tersimpan di portal jamaah.

Jazakallah khair 🤲
_Tim Vinstour Travel_`,
    color: "text-purple-600 bg-purple-50",
  },
  {
    id: "savings_reminder",
    icon: PiggyBank,
    label: "Pengingat Cicilan Tabungan",
    desc: "Kirim WA 3 hari sebelum tanggal setor cicilan tabungan",
    template: `Assalamu'alaikum *{nama}*,

💰 *Pengingat Setoran Tabungan*

Tanggal setoran tabungan Umroh Anda akan jatuh tempo pada *{tanggal_jatuh_tempo}* (3 hari lagi).

📋 Detail Setoran:
• Jumlah: *{jumlah_cicilan}*
• Rencana Tabungan: *{nama_paket}*
• Total Terkumpul: *{total_terkumpul}*

Silakan lakukan setoran tepat waktu agar perjalanan Anda tidak tertunda.

Barakallahu fiikum 🤲
_Tim Vinstour Travel_`,
    color: "text-amber-600 bg-amber-50",
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
  },
  {
    id: "h1_departure",
    icon: Calendar,
    label: "H-1 Keberangkatan",
    desc: "Kirim WA pengingat final 1 hari sebelum keberangkatan",
    template: `Assalamu'alaikum *{nama}*,

🕋 *Besok Hari Keberangkatan!*

Alhamdulillah, besok Anda akan menjalani perjalanan ibadah yang mulia. Semoga menjadi haji/umroh yang mabrur.

📍 *Titik Kumpul:* [Nama Tempat]
⏰ *Waktu Berkumpul:* [Jam WIB]
📅 *Keberangkatan:* {tanggal_berangkat}

Bawa semua dokumen perjalanan dan pastikan kondisi fisik prima.

Barakallahu fiikum 🤲
_Tim Vinstour Travel_`,
    color: "text-orange-600 bg-orange-50",
  },
];

export default function AdminWAOtomatis() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("triggers");
  const [editingTrigger, setEditingTrigger] = useState<string | null>(null);
  const [editTemplate, setEditTemplate] = useState("");
  const [triggerStates, setTriggerStates] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("wa_otomatis_triggers") || "{}");
    } catch { return {}; }
  });
  const [sendingTest, setSendingTest] = useState<string | null>(null);
  const [testPhone, setTestPhone] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const keys = ['wa_otomatis_triggers', ...TRIGGER_EVENTS.map(t => `wa_template_${t.id}`)];
        const { data } = await supabase.from('app_settings').select('key,value').in('key', keys);
        if (!data?.length) return;
        for (const row of data) {
          const val = JSON.parse(row.value);
          if (row.key === 'wa_otomatis_triggers') {
            setTriggerStates(val);
            localStorage.setItem('wa_otomatis_triggers', JSON.stringify(val));
          } else if (row.key.startsWith('wa_template_')) {
            localStorage.setItem(row.key, val);
          }
        }
      } catch {}
    })();
  }, []);

  const { data: waConfig } = useQuery({
    queryKey: ["wa-config"],
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_config").select("*").eq("is_active", true).maybeSingle();
      return data;
    },
  });

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
      await supabase.from('app_settings').upsert(
        { key: 'wa_otomatis_triggers', value: JSON.stringify(next), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    } catch {}
    toast.success(val ? `Trigger "${TRIGGER_EVENTS.find(t => t.id === id)?.label}" diaktifkan` : `Trigger dinonaktifkan`);
  }

  function startEdit(trigger: typeof TRIGGER_EVENTS[0]) {
    const savedTemplate = localStorage.getItem(`wa_template_${trigger.id}`);
    setEditTemplate(savedTemplate || trigger.template);
    setEditingTrigger(trigger.id);
  }

  async function saveTemplate(id: string) {
    localStorage.setItem(`wa_template_${id}`, editTemplate);
    try {
      await supabase.from('app_settings').upsert(
        { key: `wa_template_${id}`, value: JSON.stringify(editTemplate), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
    } catch {}
    setEditingTrigger(null);
    toast.success("Template berhasil disimpan");
  }

  async function sendTestWA(trigger: typeof TRIGGER_EVENTS[0]) {
    if (!testPhone) { toast.error("Masukkan nomor telepon untuk test"); return; }
    if (!waConfig?.api_key) { toast.error("Konfigurasi WA belum diatur. Pergi ke menu WhatsApp untuk setup."); return; }
    setSendingTest(trigger.id);
    try {
      const { sendWhatsAppMessage } = await import("@/lib/whatsapp-notifier");
      const msg = (localStorage.getItem(`wa_template_${trigger.id}`) || trigger.template)
        .replace(/{nama}/g, "Test User")
        .replace(/{jumlah}/g, "Rp 5.000.000")
        .replace(/{paket}/g, "Umroh Reguler")
        .replace(/{kode_booking}/g, "VT-TEST-001")
        .replace(/{tanggal}/g, format(new Date(), "dd MMMM yyyy", { locale: idLocale }))
        .replace(/{tanggal_berangkat}/g, "15 Ramadhan 1447H")
        .replace(/{nomor_visa}/g, "V-12345")
        .replace(/{berlaku}/g, "31 Des 2026")
        .replace(/{jumlah_cicilan}/g, "Rp 1.500.000")
        .replace(/{nama_paket}/g, "Tabungan Umroh Plus")
        .replace(/{total_terkumpul}/g, "Rp 12.000.000")
        .replace(/{tanggal_jatuh_tempo}/g, format(new Date(), "dd MMMM yyyy", { locale: idLocale }))
        .replace(/{nama_dokumen}/g, "Paspor");

      const result = await sendWhatsAppMessage({ token: waConfig.api_key, target: testPhone, message: msg });
      if (result.success) toast.success("Test WA berhasil dikirim!");
      else toast.error("Gagal kirim test: " + result.error);
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setSendingTest(null);
    }
  }

  const activeCount = Object.values(triggerStates).filter(Boolean).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="h-6 w-6 text-amber-500" />
            WA Notifikasi Otomatis
          </h1>
          <p className="text-muted-foreground mt-1">Kelola trigger pengiriman WhatsApp otomatis ke jamaah</p>
        </div>
        <div className="flex gap-2 items-center">
          <Badge className="gap-1 bg-green-100 text-green-700 border-0">
            <CheckCircle2 className="h-3 w-3" /> {activeCount} Aktif
          </Badge>
          {waConfig ? (
            <Badge className="gap-1 bg-blue-100 text-blue-700 border-0">
              <Phone className="h-3 w-3" /> WA Terhubung
            </Badge>
          ) : (
            <Badge className="gap-1 bg-red-100 text-red-700 border-0">
              <AlertCircle className="h-3 w-3" /> WA Belum Dikonfigurasi
            </Badge>
          )}
        </div>
      </div>

      {!waConfig && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Konfigurasi WhatsApp (Fonnte) belum diatur. Pergi ke <strong>Menu → WhatsApp</strong> untuk menghubungkan API key terlebih dahulu.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="triggers"><Bell className="h-4 w-4 mr-1" />Trigger Otomatis</TabsTrigger>
          <TabsTrigger value="test"><Send className="h-4 w-4 mr-1" />Kirim Test</TabsTrigger>
          <TabsTrigger value="logs"><History className="h-4 w-4 mr-1" />Riwayat Pengiriman</TabsTrigger>
        </TabsList>

        <TabsContent value="triggers" className="space-y-4 mt-4">
          <p className="text-sm text-muted-foreground">
            Aktifkan trigger yang diinginkan. Saat event terjadi, sistem akan otomatis mengirim WhatsApp ke jamaah yang bersangkutan.
          </p>
          {TRIGGER_EVENTS.map(trigger => {
            const Icon = trigger.icon;
            const isActive = triggerStates[trigger.id] ?? false;
            const hasCustomTemplate = !!localStorage.getItem(`wa_template_${trigger.id}`);
            return (
              <Card key={trigger.id} className={`border-2 transition-all ${isActive ? "border-green-200 bg-green-50/30" : "border-border"}`}>
                <CardContent className="p-4">
                  {editingTrigger === trigger.id ? (
                    <div className="space-y-3">
                      <Label className="font-semibold">Edit Template Pesan — {trigger.label}</Label>
                      <Textarea
                        value={editTemplate}
                        onChange={e => setEditTemplate(e.target.value)}
                        rows={10}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">
                        Variabel tersedia: {"{nama}"}, {"{jumlah}"}, {"{paket}"}, {"{kode_booking}"}, {"{tanggal}"}, {"{tanggal_berangkat}"}
                      </p>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => saveTemplate(trigger.id)}>Simpan Template</Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingTrigger(null)}>Batal</Button>
                        <Button size="sm" variant="ghost" onClick={() => { localStorage.removeItem(`wa_template_${trigger.id}`); setEditTemplate(trigger.template); toast.info("Reset ke template default"); }}>Reset Default</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex gap-3 flex-1">
                        <div className={`p-2 rounded-lg ${trigger.color} shrink-0`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{trigger.label}</p>
                            {hasCustomTemplate && <Badge variant="outline" className="text-[10px]">Template Custom</Badge>}
                          </div>
                          <p className="text-sm text-muted-foreground">{trigger.desc}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" variant="outline" onClick={() => startEdit(trigger)}>
                          <Settings className="h-3 w-3 mr-1" />Edit Template
                        </Button>
                        <Switch checked={isActive} onCheckedChange={val => toggleTrigger(trigger.id, val)} />
                        {isActive ? (
                          <Badge className="bg-green-100 text-green-700 border-0 text-[10px]"><Play className="h-3 w-3 mr-0.5" />Aktif</Badge>
                        ) : (
                          <Badge className="bg-muted text-muted-foreground border-0 text-[10px]"><Pause className="h-3 w-3 mr-0.5" />Nonaktif</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="test" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Kirim Test WA</CardTitle>
              <CardDescription>Uji coba pengiriman pesan ke nomor tertentu sebelum mengaktifkan trigger</CardDescription>
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
                          <span className="text-sm font-medium">{trigger.label}</span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={sendingTest === trigger.id || !waConfig}
                          onClick={() => sendTestWA(trigger)}
                        >
                          {sendingTest === trigger.id ? <RefreshCcw className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                Riwayat Pengiriman WA
                <Button size="sm" variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ["wa-otomatis-logs"] })}>
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <p className="text-sm text-muted-foreground text-center py-8">Memuat riwayat...</p>
              ) : logs.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p>Belum ada riwayat pengiriman WA otomatis</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Penerima</TableHead>
                      <TableHead>Pesan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Waktu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{log.recipient_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{log.recipient_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs">{log.message_content}</p>
                        </TableCell>
                        <TableCell>
                          {log.status === "sent" ? (
                            <Badge className="bg-green-100 text-green-700 border-0 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-0.5" />Terkirim</Badge>
                          ) : log.status === "failed" ? (
                            <Badge className="bg-red-100 text-red-700 border-0 text-[10px]"><AlertCircle className="h-3 w-3 mr-0.5" />Gagal</Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700 border-0 text-[10px]"><Clock className="h-3 w-3 mr-0.5" />Pending</Badge>
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
