import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  MessageSquare, Settings, FileText, History, Send, Plus, Edit, Trash2,
  Eye, EyeOff, Users, Zap, CheckCircle, XCircle, AlertCircle, Loader2,
  RefreshCw, Phone, Copy, Info
} from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  sendWhatsAppMessage, sendWhatsAppBulk, DEFAULT_TEMPLATES, renderTemplate,
  normalisePhone, WASendLog
} from "@/lib/whatsapp-notifier";
import { formatCurrency } from "@/lib/format";

interface WhatsAppConfig {
  id: string;
  provider: string;
  api_key: string | null;
  sender_number: string | null;
  is_active: boolean;
}

interface WhatsAppTemplate {
  id: string;
  code: string;
  name: string;
  message_template: string;
  variables: string[];
  is_active: boolean;
}

interface WhatsAppLog {
  id: string;
  recipient_phone: string;
  message_content: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

interface Jamaah {
  id: string;
  full_name: string;
  phone: string | null;
  phone2?: string | null;
}

const AUTO_TRIGGERS = [
  { key: "on_booking_created",  label: "Booking Baru Dibuat",        template: "BOOKING_CONFIRM",   desc: "Kirim konfirmasi booking saat booking baru dibuat" },
  { key: "on_payment_verified", label: "Pembayaran Diverifikasi",     template: "PAYMENT_CONFIRM",   desc: "Kirim konfirmasi setiap kali pembayaran diverifikasi" },
  { key: "on_payment_lunas",    label: "Pembayaran Lunas",            template: "PAYMENT_LUNAS",     desc: "Kirim notifikasi saat jamaah lunas" },
  { key: "on_document_ready",   label: "Dokumen Siap",                template: "DOCUMENT_READY",    desc: "Kirim notifikasi saat dokumen digenerate" },
  { key: "on_departure_7d",     label: "7 Hari Sebelum Berangkat",   template: "DEPARTURE_REMINDER", desc: "Kirim pengingat H-7 keberangkatan" },
  { key: "on_departure_1d",     label: "1 Hari Sebelum Berangkat",   template: "DEPARTURE_REMINDER", desc: "Kirim pengingat H-1 keberangkatan" },
];

export default function AdminWhatsApp() {
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey]             = useState(false);
  const [testPhone, setTestPhone]               = useState("");
  const [testMessage, setTestMessage]           = useState("Assalamu'alaikum, ini pesan test dari UmrahTravel. 🕌");
  const [editTemplate, setEditTemplate]         = useState<WhatsAppTemplate | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [apiKey, setApiKey]                     = useState("");
  const [senderNumber, setSenderNumber]         = useState("");
  const [isActive, setIsActive]                 = useState(false);
  const [provider, setProvider]                 = useState("fonnte");

  // Bulk send state
  const [bulkDeparture, setBulkDeparture]       = useState("");
  const [bulkTemplate, setBulkTemplate]         = useState<keyof typeof DEFAULT_TEMPLATES>("DEPARTURE_REMINDER");
  const [bulkCustomMsg, setBulkCustomMsg]       = useState("");
  const [useCustomMsg, setUseCustomMsg]         = useState(false);
  const [selectedJamaah, setSelectedJamaah]     = useState<Set<string>>(new Set());
  const [bulkProgress, setBulkProgress]         = useState(0);
  const [bulkTotal, setBulkTotal]               = useState(0);
  const [bulkSending, setBulkSending]           = useState(false);
  const [bulkLogs, setBulkLogs]                 = useState<WASendLog[]>([]);

  // Auto-trigger state (stored in localStorage)
  const [triggers, setTriggers] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("wa_auto_triggers") || "{}"); }
    catch { return {}; }
  });

  const saveTriggers = (next: Record<string, boolean>) => {
    setTriggers(next);
    localStorage.setItem("wa_auto_triggers", JSON.stringify(next));
    toast.success("Pengaturan auto-trigger disimpan");
  };

  // ─── Queries ───────────────────────────────────────────────────────────────

  const { data: config } = useQuery({
    queryKey: ["whatsapp-config"],
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_config" as any).select("*").maybeSingle();
      const c = data as unknown as WhatsAppConfig | null;
      if (c) {
        setApiKey(c.api_key || "");
        setSenderNumber(c.sender_number || "");
        setIsActive(c.is_active || false);
        setProvider(c.provider || "fonnte");
      }
      return c;
    },
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_templates" as any).select("*").order("name");
      return (data || []) as unknown as WhatsAppTemplate[];
    },
  });

  const { data: logs = [], refetch: refetchLogs } = useQuery({
    queryKey: ["whatsapp-logs"],
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_logs" as any).select("*").order("created_at", { ascending: false }).limit(200);
      return (data || []) as unknown as WhatsAppLog[];
    },
  });

  const { data: departures = [] } = useQuery({
    queryKey: ["departures-for-wa"],
    queryFn: async () => {
      const { data } = await supabase.from("departures").select("id, departure_date, package:packages(name)").order("departure_date", { ascending: false }).limit(20);
      return data || [];
    },
  });

  const { data: jamaahList = [] } = useQuery({
    queryKey: ["jamaah-for-wa", bulkDeparture],
    enabled: !!bulkDeparture,
    queryFn: async () => {
      const { data } = await supabase
        .from("booking_passengers")
        .select("id, customer:customers(id, full_name, phone)")
        .eq("booking.departure_id", bulkDeparture as any)
        .limit(200);
      // Flatten
      const seen = new Set<string>();
      const list: Jamaah[] = [];
      (data || []).forEach((row: any) => {
        const c = row.customer;
        if (c && c.id && !seen.has(c.id)) {
          seen.add(c.id);
          list.push({ id: c.id, full_name: c.full_name, phone: c.phone });
        }
      });
      // auto-select all
      setSelectedJamaah(new Set(list.map(j => j.id)));
      return list;
    },
  });

  // ─── Mutations ─────────────────────────────────────────────────────────────

  const saveConfigMutation = useMutation({
    mutationFn: async () => {
      const payload = { provider, api_key: apiKey, sender_number: senderNumber, is_active: isActive };
      if (config?.id) {
        const { error } = await supabase.from("whatsapp_config" as any).update(payload).eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("whatsapp_config" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config"] });
      toast.success("Konfigurasi WhatsApp berhasil disimpan");
    },
    onError: (e: Error) => toast.error("Gagal: " + e.message),
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (templateData: Partial<WhatsAppTemplate>) => {
      if (editTemplate?.id) {
        const { error } = await supabase.from("whatsapp_templates" as any).update(templateData).eq("id", editTemplate.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("whatsapp_templates" as any).insert(templateData as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      toast.success("Template berhasil disimpan");
      setIsTemplateDialogOpen(false);
      setEditTemplate(null);
    },
    onError: (e: Error) => toast.error("Gagal: " + e.message),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_templates" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      toast.success("Template dihapus");
    },
  });

  // ─── Test Send (direct Fonnte) ────────────────────────────────────────────

  const handleTestSend = async () => {
    if (!apiKey) { toast.error("API key belum diisi"); return; }
    if (!testPhone) { toast.error("Nomor tujuan harus diisi"); return; }
    toast.info("Mengirim pesan test...");
    const result = await sendWhatsAppMessage({ token: apiKey, target: testPhone, message: testMessage });
    if (result.success) toast.success("Pesan test berhasil dikirim! ✅");
    else toast.error("Gagal: " + result.error);
  };

  // ─── Bulk Send ────────────────────────────────────────────────────────────

  const handleBulkSend = async () => {
    if (!apiKey) { toast.error("API key belum dikonfigurasi"); return; }
    const targets = jamaahList.filter(j => selectedJamaah.has(j.id) && j.phone);
    if (targets.length === 0) { toast.error("Tidak ada jamaah yang dipilih atau tidak ada nomor HP"); return; }

    setBulkSending(true);
    setBulkLogs([]);
    setBulkProgress(0);
    setBulkTotal(targets.length);

    const deps = departures.find(d => d.id === bulkDeparture);
    const depDate = deps ? format(new Date((deps as any).departure_date), "dd MMM yyyy", { locale: id }) : "-";
    const pkgName = (deps as any)?.package?.name || "-";

    const recipients = targets.map(j => {
      let message = "";
      if (useCustomMsg && bulkCustomMsg) {
        message = renderTemplate(bulkCustomMsg, { nama: j.full_name, nama_paket: pkgName, tanggal_berangkat: depDate });
      } else {
        const tplDef = DEFAULT_TEMPLATES[bulkTemplate];
        message = renderTemplate(tplDef.template, {
          nama: j.full_name,
          nama_paket: pkgName,
          tanggal_berangkat: depDate,
          sisa_hari: "-",
          nomor_penerbangan: "-",
          hotel_makkah: "-",
          titik_kumpul: "-",
          nomor_cs: senderNumber || "-",
          kode_booking: "-",
          total_harga: "-",
          terbayar: "-",
          sisa_bayar: "-",
          jumlah_bayar: "-",
          tanggal_bayar: depDate,
          total_terbayar: "-",
          jenis_dokumen: "-",
          tanggal_ambil: "-",
          lokasi_ambil: "-",
          isi_pesan: bulkCustomMsg || "-",
        });
      }
      return { phone: j.phone!, message, name: j.full_name };
    });

    const results = await sendWhatsAppBulk(apiKey, recipients, (done, total) => {
      setBulkProgress(Math.round((done / total) * 100));
    });

    setBulkLogs(results);
    setBulkSending(false);

    const sent = results.filter(r => r.status === "sent").length;
    const failed = results.filter(r => r.status === "failed").length;
    toast.success(`Selesai: ${sent} terkirim, ${failed} gagal`);
  };

  const handleSaveTemplate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const variablesStr = fd.get("variables") as string;
    saveTemplateMutation.mutate({
      code: fd.get("code") as string,
      name: fd.get("name") as string,
      message_template: fd.get("message_template") as string,
      variables: variablesStr ? variablesStr.split(",").map(v => v.trim()) : [],
      is_active: true,
    });
  };

  const sentCount = logs.filter(l => l.status === "sent").length;
  const failedCount = logs.filter(l => l.status === "failed").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-green-500/10">
          <MessageSquare className="h-7 w-7 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Notifikasi</h1>
          <p className="text-muted-foreground text-sm">Kirim notifikasi otomatis & massal ke jamaah via WhatsApp</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={config?.is_active ? "default" : "secondary"} className="gap-1">
            {config?.is_active
              ? <><CheckCircle className="h-3 w-3" /> Aktif</>
              : <><XCircle className="h-3 w-3" /> Nonaktif</>}
          </Badge>
          {config?.api_key && (
            <Badge variant="outline" className="text-xs gap-1">
              <Phone className="h-3 w-3" />{config.sender_number || "No number"}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="config" className="space-y-4">
        <TabsList className="inline-flex h-9 flex-wrap w-full md:w-auto gap-0.5">
          <TabsTrigger value="config" className="gap-1.5 text-xs"><Settings className="h-3.5 w-3.5" />Konfigurasi</TabsTrigger>
          <TabsTrigger value="bulk" className="gap-1.5 text-xs"><Users className="h-3.5 w-3.5" />Kirim Massal</TabsTrigger>
          <TabsTrigger value="auto" className="gap-1.5 text-xs"><Zap className="h-3.5 w-3.5" />Auto Trigger</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Template</TabsTrigger>
          <TabsTrigger value="test" className="gap-1.5 text-xs"><Send className="h-3.5 w-3.5" />Test Kirim</TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5 text-xs"><History className="h-3.5 w-3.5" />Log ({logs.length})</TabsTrigger>
        </TabsList>

        {/* ── CONFIG ─────────────────────────────────────────────────────── */}
        <TabsContent value="config" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Gunakan <strong>Fonnte</strong> — daftar di <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer" className="underline text-primary">fonnte.com</a>, hubungkan nomor WhatsApp, lalu salin token API ke sini. Pesan dikirim langsung dari browser tanpa server tambahan.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Konfigurasi API WhatsApp</CardTitle>
              <CardDescription>Atur provider dan API token untuk pengiriman notifikasi</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fonnte">Fonnte (Recommended)</SelectItem>
                      <SelectItem value="wablas">Wablas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nomor Pengirim (WhatsApp)</Label>
                  <Input
                    value={senderNumber}
                    onChange={e => setSenderNumber(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>API Token / Key *</Label>
                <div className="flex gap-2">
                  <Input
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="Token dari dashboard Fonnte"
                  />
                  <Button type="button" variant="outline" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  {apiKey && (
                    <Button type="button" variant="outline" size="icon" onClick={() => { navigator.clipboard.writeText(apiKey); toast.success("Token disalin"); }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Token dari menu Device di dashboard Fonnte</p>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
                <div>
                  <Label htmlFor="is_active" className="cursor-pointer">Aktifkan Notifikasi WhatsApp</Label>
                  <p className="text-xs text-muted-foreground">Matikan untuk sementara tanpa menghapus konfigurasi</p>
                </div>
              </div>

              <Button onClick={() => saveConfigMutation.mutate()} disabled={saveConfigMutation.isPending} className="w-full">
                {saveConfigMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</> : "Simpan Konfigurasi"}
              </Button>
            </CardContent>
          </Card>

          {/* Panduan */}
          <Card>
            <CardHeader><CardTitle className="text-base">Panduan Setup Fonnte</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {[
                "Buka fonnte.com dan daftar akun baru",
                "Masuk ke menu Device > Add Device",
                "Scan QR Code dengan WhatsApp yang akan digunakan sebagai pengirim",
                "Setelah terhubung, salin token dari halaman Device",
                "Tempel token di field API Token di atas, lalu klik Simpan",
                "Lakukan Test Kirim untuk memastikan integrasi berjalan",
              ].map((step, i) => (
                <div key={i} className="flex gap-2">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-xs flex items-center justify-center shrink-0 font-semibold">{i + 1}</span>
                  <span>{step}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── BULK SEND ──────────────────────────────────────────────────── */}
        <TabsContent value="bulk" className="space-y-4">
          {!config?.api_key && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>API Token belum dikonfigurasi. Buka tab Konfigurasi untuk setup.</AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pilih Keberangkatan & Pesan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Keberangkatan</Label>
                  <Select value={bulkDeparture} onValueChange={setBulkDeparture}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih keberangkatan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {departures.map((dep: any) => (
                        <SelectItem key={dep.id} value={dep.id}>
                          {dep.package?.name} — {format(new Date(dep.departure_date), "dd MMM yyyy", { locale: id })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center gap-2">
                  <Switch id="useCustom" checked={useCustomMsg} onCheckedChange={setUseCustomMsg} />
                  <Label htmlFor="useCustom" className="cursor-pointer">Tulis pesan sendiri</Label>
                </div>

                {useCustomMsg ? (
                  <div className="space-y-2">
                    <Label>Pesan Kustom</Label>
                    <Textarea
                      value={bulkCustomMsg}
                      onChange={e => setBulkCustomMsg(e.target.value)}
                      rows={6}
                      placeholder="Assalamu'alaikum {nama}...&#10;Gunakan {nama}, {nama_paket}, {tanggal_berangkat}"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Variabel: {"{nama}"}, {"{nama_paket}"}, {"{tanggal_berangkat}"}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label>Template Pesan</Label>
                    <Select value={bulkTemplate} onValueChange={v => setBulkTemplate(v as any)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(DEFAULT_TEMPLATES).map(([key, tpl]) => (
                          <SelectItem key={key} value={key}>{tpl.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="p-3 rounded-lg bg-muted/50 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {DEFAULT_TEMPLATES[bulkTemplate]?.template}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleBulkSend}
                  disabled={bulkSending || !bulkDeparture || !config?.api_key || selectedJamaah.size === 0}
                  className="w-full gap-2"
                >
                  {bulkSending
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Mengirim... {bulkProgress}%</>
                    : <><Send className="h-4 w-4" />Kirim ke {selectedJamaah.size} Jamaah</>}
                </Button>

                {bulkSending && (
                  <div className="space-y-1">
                    <Progress value={bulkProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-center">
                      {Math.round(bulkProgress * bulkTotal / 100)}/{bulkTotal} pesan terkirim
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Jamaah ({jamaahList.length})</CardTitle>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedJamaah(new Set(jamaahList.map(j => j.id)))}>
                      Pilih Semua
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedJamaah(new Set())}>
                      Hapus Pilihan
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!bulkDeparture ? (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    Pilih keberangkatan terlebih dahulu
                  </div>
                ) : jamaahList.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 text-sm">Tidak ada jamaah di keberangkatan ini</div>
                ) : (
                  <div className="space-y-1 max-h-72 overflow-y-auto">
                    {jamaahList.map(j => (
                      <div key={j.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 text-sm">
                        <Checkbox
                          checked={selectedJamaah.has(j.id)}
                          onCheckedChange={checked => {
                            const next = new Set(selectedJamaah);
                            if (checked) next.add(j.id); else next.delete(j.id);
                            setSelectedJamaah(next);
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{j.full_name}</p>
                          <p className="text-xs text-muted-foreground">{j.phone ? normalisePhone(j.phone) : "⚠️ No HP kosong"}</p>
                        </div>
                        {!j.phone && <Badge variant="destructive" className="text-[10px] h-4">No HP</Badge>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bulk result logs */}
          {bulkLogs.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Hasil Pengiriman</CardTitle>
                  <div className="flex gap-2 text-sm">
                    <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" />{bulkLogs.filter(l => l.status === "sent").length} terkirim</Badge>
                    <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{bulkLogs.filter(l => l.status === "failed").length} gagal</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {bulkLogs.map((log, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm p-1.5 rounded">
                      {log.status === "sent"
                        ? <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                        : <XCircle className="h-4 w-4 text-destructive shrink-0" />}
                      <span className="font-mono text-xs">{log.phone}</span>
                      {log.errorMessage && <span className="text-destructive text-xs ml-auto">{log.errorMessage}</span>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── AUTO TRIGGER ──────────────────────────────────────────────── */}
        <TabsContent value="auto" className="space-y-4">
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              Auto-trigger mengirim notifikasi secara otomatis saat event tertentu terjadi (misal: pembayaran diverifikasi). Pastikan API token sudah dikonfigurasi dan notifikasi dalam status <strong>Aktif</strong>.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Auto Trigger</CardTitle>
              <CardDescription>Pilih event mana yang akan memicu notifikasi WhatsApp otomatis ke jamaah</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {AUTO_TRIGGERS.map(trigger => (
                <div key={trigger.key} className="flex items-center justify-between p-3 rounded-xl border hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{trigger.label}</p>
                      <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                        {DEFAULT_TEMPLATES[trigger.template as keyof typeof DEFAULT_TEMPLATES]?.name || trigger.template}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{trigger.desc}</p>
                  </div>
                  <Switch
                    checked={!!triggers[trigger.key]}
                    onCheckedChange={checked => saveTriggers({ ...triggers, [trigger.key]: checked })}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Template per Trigger</CardTitle>
              <CardDescription>Template yang digunakan untuk setiap auto trigger (bisa dikustomisasi di tab Template)</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {AUTO_TRIGGERS.map(trigger => (
                    <TableRow key={trigger.key}>
                      <TableCell className="text-sm font-medium">{trigger.label}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {DEFAULT_TEMPLATES[trigger.template as keyof typeof DEFAULT_TEMPLATES]?.name || trigger.template}
                      </TableCell>
                      <TableCell>
                        <Badge variant={triggers[trigger.key] ? "default" : "secondary"} className="text-xs">
                          {triggers[trigger.key] ? "Aktif" : "Nonaktif"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TEMPLATES ────────────────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Template Pesan Kustom</CardTitle>
                <CardDescription>Template tersimpan di database, bisa digunakan untuk test kirim atau event kustom</CardDescription>
              </div>
              <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setEditTemplate(null)}><Plus className="h-4 w-4 mr-1" />Tambah</Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editTemplate ? "Edit Template" : "Tambah Template"}</DialogTitle>
                    <DialogDescription>Gunakan {"{variable}"} untuk variabel dinamis seperti {"{nama}"}, {"{kode_booking}"}</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSaveTemplate} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Kode Template</Label>
                        <Input name="code" placeholder="BOOKING_CONFIRM" defaultValue={editTemplate?.code || ""} required />
                      </div>
                      <div className="space-y-2">
                        <Label>Nama Template</Label>
                        <Input name="name" placeholder="Konfirmasi Booking" defaultValue={editTemplate?.name || ""} required />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Isi Pesan</Label>
                      <Textarea name="message_template" placeholder="Assalamu'alaikum {nama}..." rows={6} defaultValue={editTemplate?.message_template || ""} required className="font-mono text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label>Variabel (pisahkan koma)</Label>
                      <Input name="variables" placeholder="nama, kode_booking, total_harga" defaultValue={editTemplate?.variables?.join(", ") || ""} />
                    </div>
                    <DialogFooter>
                      <Button type="submit" disabled={saveTemplateMutation.isPending}>
                        {saveTemplateMutation.isPending ? "Menyimpan..." : "Simpan"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {/* Built-in templates info */}
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Ada <strong>{Object.keys(DEFAULT_TEMPLATES).length} template bawaan</strong> (Booking Confirm, Payment Confirm, Lunas, Document Ready, Departure Reminder, dll) yang sudah tersedia tanpa perlu membuat manual.
                </AlertDescription>
              </Alert>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Kode</TableHead>
                    <TableHead>Nama</TableHead>
                    <TableHead>Variabel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Belum ada template kustom. Template bawaan tersedia di tab Kirim Massal.</TableCell></TableRow>
                  ) : templates.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.code}</TableCell>
                      <TableCell className="text-sm">{t.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {t.variables?.map(v => <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant={t.is_active ? "default" : "secondary"} className="text-xs">{t.is_active ? "Aktif" : "Nonaktif"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditTemplate(t); setIsTemplateDialogOpen(true); }}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTemplateMutation.mutate(t.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TEST SEND ─────────────────────────────────────────────────── */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Test Kirim Langsung</CardTitle>
              <CardDescription>Kirim pesan langsung ke nomor tertentu menggunakan API token yang tersimpan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!config?.api_key && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>API Token belum dikonfigurasi.</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label>Nomor Tujuan *</Label>
                <Input
                  value={testPhone}
                  onChange={e => setTestPhone(e.target.value)}
                  placeholder="0812-3456-7890"
                />
                {testPhone && (
                  <p className="text-xs text-muted-foreground">Format dikirim: {normalisePhone(testPhone)}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Pesan *</Label>
                <Textarea
                  value={testMessage}
                  onChange={e => setTestMessage(e.target.value)}
                  rows={5}
                  placeholder="Isi pesan test..."
                />
              </div>
              <Button onClick={handleTestSend} disabled={!testPhone || !testMessage || !config?.api_key} className="w-full gap-2">
                <Send className="h-4 w-4" />
                Kirim Test
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LOGS ──────────────────────────────────────────────────────── */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex gap-3">
            <Card className="flex-1 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <div><p className="text-xs text-muted-foreground">Terkirim</p><p className="text-xl font-bold">{sentCount}</p></div>
              </div>
            </Card>
            <Card className="flex-1 p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-destructive" />
                <div><p className="text-xs text-muted-foreground">Gagal</p><p className="text-xl font-bold">{failedCount}</p></div>
              </div>
            </Card>
            <Card className="flex-1 p-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <div><p className="text-xs text-muted-foreground">Total Pesan</p><p className="text-xl font-bold">{logs.length}</p></div>
              </div>
            </Card>
            <Button variant="outline" size="icon" onClick={() => refetchLogs()} className="self-start mt-0.5 h-9 w-9">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Waktu</TableHead>
                    <TableHead>Nomor</TableHead>
                    <TableHead>Pesan</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Belum ada log pengiriman</TableCell></TableRow>
                  ) : logs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs whitespace-nowrap">{format(new Date(log.created_at), "dd MMM HH:mm", { locale: id })}</TableCell>
                      <TableCell className="font-mono text-xs">{log.recipient_phone}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="text-xs truncate">{log.message_content}</p>
                        {log.error_message && <p className="text-xs text-destructive">{log.error_message}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.status === "sent" ? "default" : log.status === "failed" ? "destructive" : "secondary"} className="text-xs">
                          {log.status === "sent" ? "Terkirim" : log.status === "failed" ? "Gagal" : "Pending"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
