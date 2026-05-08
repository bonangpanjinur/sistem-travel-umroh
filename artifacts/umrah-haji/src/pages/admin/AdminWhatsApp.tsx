import { useState, useMemo } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  MessageSquare, Settings, FileText, History, Send, Plus, Edit, Trash2,
  Eye, EyeOff, Users, Zap, CheckCircle, XCircle, AlertCircle, Loader2,
  RefreshCw, Phone, Copy, Info, Search, RotateCcw, Bell, Filter,
  SlidersHorizontal, Calendar, MessageCircle
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import {
  sendWhatsAppMessage, sendWhatsAppBulk, DEFAULT_TEMPLATES, renderTemplate,
  normalisePhone, type WASendLog
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
  recipient_name?: string | null;
  message_content: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  template_code?: string | null;
  departure_id?: string | null;
}

interface Jamaah {
  id: string;
  full_name: string;
  phone: string | null;
}

const AUTO_TRIGGERS = [
  { key: "on_booking_created",  label: "Booking Baru Dibuat",      template: "BOOKING_CONFIRM",    desc: "Konfirmasi booking saat booking baru dibuat" },
  { key: "on_payment_verified", label: "Pembayaran Diverifikasi",  template: "PAYMENT_CONFIRM",    desc: "Konfirmasi setiap kali pembayaran diverifikasi" },
  { key: "on_payment_lunas",    label: "Pembayaran Lunas",         template: "PAYMENT_LUNAS",      desc: "Notifikasi saat jamaah lunas sepenuhnya" },
  { key: "on_document_ready",   label: "Dokumen Siap",             template: "DOCUMENT_READY",     desc: "Notifikasi saat dokumen digenerate" },
  { key: "on_equipment_ready",  label: "Perlengkapan Siap Ambil",  template: "EQUIPMENT_READY",    desc: "Notifikasi saat perlengkapan siap diambil" },
  { key: "on_departure_7d",     label: "H-7 Keberangkatan",        template: "DEPARTURE_REMINDER", desc: "Pengingat 7 hari sebelum keberangkatan" },
  { key: "on_departure_1d",     label: "H-1 Keberangkatan",        template: "DEPARTURE_REMINDER", desc: "Pengingat 1 hari sebelum keberangkatan" },
];

export default function AdminWhatsApp() {
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey]   = useState(false);
  const [testPhone, setTestPhone]     = useState("");
  const [testMessage, setTestMessage] = useState("Assalamu'alaikum, ini pesan test dari UmrahTravel. 🕌");
  const [editTemplate, setEditTemplate] = useState<WhatsAppTemplate | null>(null);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [apiKey, setApiKey]           = useState("");
  const [senderNumber, setSenderNumber] = useState("");
  const [isActive, setIsActive]       = useState(false);
  const [provider, setProvider]       = useState("fonnte");

  const [bulkDeparture, setBulkDeparture]   = useState("");
  const [bulkTemplate, setBulkTemplate]     = useState<keyof typeof DEFAULT_TEMPLATES>("DEPARTURE_REMINDER");
  const [bulkCustomMsg, setBulkCustomMsg]   = useState("");
  const [useCustomMsg, setUseCustomMsg]     = useState(false);
  const [selectedJamaah, setSelectedJamaah] = useState<Set<string>>(new Set());
  const [bulkProgress, setBulkProgress]     = useState(0);
  const [bulkTotal, setBulkTotal]           = useState(0);
  const [bulkSending, setBulkSending]       = useState(false);
  const [bulkLogs, setBulkLogs]             = useState<(WASendLog & { name?: string })[]>([]);
  const [bulkJamaahSearch, setBulkJamaahSearch] = useState("");

  const [logSearch, setLogSearch]     = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState<string>("all");

  // Reminder scheduler
  const [reminderDeparture, setReminderDeparture] = useState("");
  const [reminderType, setReminderType] = useState<"7d" | "1d">("7d");
  const [reminderSending, setReminderSending] = useState(false);

  const [triggers, setTriggers] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("wa_auto_triggers") || "{}"); }
    catch { return {}; }
  });

  const saveTriggers = (next: Record<string, boolean>) => {
    setTriggers(next);
    localStorage.setItem("wa_auto_triggers", JSON.stringify(next));
    toast.success("Pengaturan auto-trigger disimpan");
  };

  // ─── Queries ──────────────────────────────────────────────────────────────

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
      const { data } = await supabase
        .from("whatsapp_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      return (data || []) as unknown as WhatsAppLog[];
    },
  });

  const { data: departures = [] } = useQuery({
    queryKey: ["departures-for-wa"],
    queryFn: async () => {
      const { data } = await supabase
        .from("departures")
        .select("id, departure_date, return_date, flight_number, hotel_makkah:hotels!departures_hotel_makkah_id_fkey(name), package:packages(name)")
        .order("departure_date", { ascending: false })
        .limit(30);
      return data || [];
    },
  });

  // Fixed: use !inner join and proper filter
  const { data: jamaahList = [], isLoading: loadingJamaah } = useQuery({
    queryKey: ["jamaah-for-wa", bulkDeparture],
    enabled: !!bulkDeparture,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_passengers")
        .select(`
          customer_id,
          customer:customers(id, full_name, phone),
          booking:bookings!inner(departure_id, booking_code, payment_status, total_price, paid_amount, remaining_amount)
        `)
        .eq("booking.departure_id", bulkDeparture)
        .neq("booking.booking_status", "cancelled" as any);
      
      if (error) throw error;

      const seen = new Set<string>();
      const list: (Jamaah & { booking_code?: string; payment_status?: string; remaining?: number })[] = [];
      (data || []).forEach((row: any) => {
        const c = row.customer;
        const b = row.booking;
        if (c && c.id && !seen.has(c.id)) {
          seen.add(c.id);
          list.push({ id: c.id, full_name: c.full_name, phone: c.phone, booking_code: b?.booking_code, payment_status: b?.payment_status, remaining: b?.remaining_amount });
        }
      });
      setSelectedJamaah(new Set(list.map(j => j.id)));
      return list;
    },
  });

  // ─── Mutations ────────────────────────────────────────────────────────────

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

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getDepInfo = (depId: string) => departures.find((d: any) => d.id === depId) as any;

  const getRenderedPreview = (jamaahName = "Ahmad Fauzi") => {
    const dep = getDepInfo(bulkDeparture);
    const depDate = dep ? format(new Date(dep.departure_date), "dd MMM yyyy", { locale: id }) : "[tanggal]";
    const pkgName = dep?.package?.name || "[nama paket]";
    const daysLeft = dep ? differenceInDays(new Date(dep.departure_date), new Date()) : 0;
    const flightNo = dep?.flight_number || "[no penerbangan]";
    const hotelMakkah = dep?.hotel_makkah?.name || "[hotel makkah]";

    const vars = {
      nama: jamaahName,
      nama_paket: pkgName,
      tanggal_berangkat: depDate,
      sisa_hari: String(Math.max(daysLeft, 0)),
      nomor_penerbangan: flightNo,
      hotel_makkah: hotelMakkah,
      titik_kumpul: "[titik kumpul]",
      nomor_cs: senderNumber || "[nomor CS]",
      kode_booking: "[B-12345]",
      total_harga: "Rp 25.000.000",
      terbayar: "Rp 10.000.000",
      sisa_bayar: "Rp 15.000.000",
      jumlah_bayar: "Rp 5.000.000",
      tanggal_bayar: format(new Date(), "dd MMM yyyy", { locale: id }),
      total_terbayar: "Rp 10.000.000",
      jenis_dokumen: "Surat Paspor",
      tanggal_ambil: depDate,
      lokasi_ambil: "Kantor Cabang",
      isi_pesan: bulkCustomMsg || "[pesan kustom]",
    };

    if (useCustomMsg && bulkCustomMsg) {
      return renderTemplate(bulkCustomMsg, vars);
    }
    return renderTemplate(DEFAULT_TEMPLATES[bulkTemplate]?.template || "", vars);
  };

  // Save bulk send results to DB
  const saveLogsToDB = async (results: (WASendLog & { name?: string })[], departureId: string, templateCode: string) => {
    try {
      const rows = results.map(r => ({
        recipient_phone: r.phone,
        recipient_name: r.name || null,
        message_content: r.message,
        status: r.status,
        error_message: r.errorMessage || null,
        sent_at: r.sentAt?.toISOString() || null,
        template_code: templateCode,
        departure_id: departureId,
      }));
      await supabase.from("whatsapp_logs" as any).insert(rows as any);
    } catch (err) {
      console.warn("Gagal menyimpan log WA:", err);
    }
  };

  // ─── Bulk Send ────────────────────────────────────────────────────────────

  const handleBulkSend = async () => {
    if (!apiKey) { toast.error("API key belum dikonfigurasi"); return; }
    const targets = jamaahList.filter((j: any) => selectedJamaah.has(j.id) && j.phone);
    if (targets.length === 0) { toast.error("Tidak ada jamaah yang dipilih atau tidak ada nomor HP"); return; }

    setBulkSending(true);
    setBulkLogs([]);
    setBulkProgress(0);
    setBulkTotal(targets.length);

    const dep = getDepInfo(bulkDeparture);
    const depDate = dep ? format(new Date(dep.departure_date), "dd MMM yyyy", { locale: id }) : "-";
    const pkgName = dep?.package?.name || "-";
    const daysLeft = dep ? differenceInDays(new Date(dep.departure_date), new Date()) : 0;

    const recipients = (targets as any[]).map(j => {
      const vars = {
        nama: j.full_name, nama_paket: pkgName, tanggal_berangkat: depDate,
        sisa_hari: String(Math.max(daysLeft, 0)),
        nomor_penerbangan: dep?.flight_number || "-",
        hotel_makkah: dep?.hotel_makkah?.name || "-",
        titik_kumpul: "-", nomor_cs: senderNumber || "-",
        kode_booking: j.booking_code || "-",
        total_harga: "-", terbayar: "-",
        sisa_bayar: j.remaining != null ? formatCurrency(j.remaining) : "-",
        jumlah_bayar: "-", tanggal_bayar: depDate, total_terbayar: "-",
        jenis_dokumen: "-", tanggal_ambil: "-", lokasi_ambil: "-",
        isi_pesan: bulkCustomMsg || "-",
      };
      const message = useCustomMsg && bulkCustomMsg
        ? renderTemplate(bulkCustomMsg, vars)
        : renderTemplate(DEFAULT_TEMPLATES[bulkTemplate]?.template || "", vars);
      return { phone: j.phone!, message, name: j.full_name };
    });

    const results = await sendWhatsAppBulk(apiKey, recipients, (done, total) => {
      setBulkProgress(Math.round((done / total) * 100));
    });

    const namedResults = results.map((r, i) => ({ ...r, name: recipients[i]?.name }));
    setBulkLogs(namedResults);
    setBulkSending(false);

    const sent = results.filter(r => r.status === "sent").length;
    const failed = results.filter(r => r.status === "failed").length;
    toast.success(`Selesai: ${sent} terkirim, ${failed} gagal`);

    // Persist to DB
    await saveLogsToDB(namedResults, bulkDeparture, useCustomMsg ? "CUSTOM" : bulkTemplate);
    queryClient.invalidateQueries({ queryKey: ["whatsapp-logs"] });
  };

  const handleResendFailed = async () => {
    const failed = bulkLogs.filter(l => l.status === "failed" && l.phone);
    if (!failed.length || !apiKey) return;
    toast.info(`Mengirim ulang ${failed.length} pesan gagal...`);
    const results = await sendWhatsAppBulk(apiKey, failed.map(f => ({ phone: f.phone, message: f.message, name: f.name })), () => {});
    const namedResults = results.map((r, i) => ({ ...r, name: failed[i]?.name }));
    const newLogs = bulkLogs.map(l => {
      if (l.status !== "failed") return l;
      const retry = namedResults.find(r => r.phone === l.phone);
      return retry ? { ...l, status: retry.status, errorMessage: retry.errorMessage } : l;
    });
    setBulkLogs(newLogs);
    const sent = results.filter(r => r.status === "sent").length;
    toast.success(`Resend selesai: ${sent} berhasil`);
    await saveLogsToDB(namedResults, bulkDeparture, "RESEND");
    queryClient.invalidateQueries({ queryKey: ["whatsapp-logs"] });
  };

  // ─── Reminder Scheduler ───────────────────────────────────────────────────

  const handleSendReminder = async () => {
    if (!apiKey || !reminderDeparture) {
      toast.error("Pilih keberangkatan dan pastikan API token sudah dikonfigurasi");
      return;
    }
    const dep = getDepInfo(reminderDeparture);
    if (!dep) return;

    setReminderSending(true);
    const daysLeft = differenceInDays(new Date(dep.departure_date), new Date());

    // Get jamaah for departure
    const { data: passengers } = await supabase
      .from("booking_passengers")
      .select("customer_id, customer:customers(id, full_name, phone), booking:bookings!inner(departure_id, booking_code)")
      .eq("booking.departure_id", reminderDeparture)
      .neq("booking.booking_status", "cancelled" as any);

    const targets = (passengers || [])
      .filter((p: any) => p.customer?.phone)
      .map((p: any) => ({
        phone: p.customer.phone as string,
        message: renderTemplate(DEFAULT_TEMPLATES.DEPARTURE_REMINDER.template, {
          nama: p.customer.full_name,
          sisa_hari: String(Math.max(daysLeft, 0)),
          tanggal_berangkat: format(new Date(dep.departure_date), "dd MMM yyyy", { locale: id }),
          nomor_penerbangan: dep.flight_number || "-",
          hotel_makkah: dep.hotel_makkah?.name || "-",
          titik_kumpul: "-",
          nomor_cs: senderNumber || "-",
        }),
        name: p.customer.full_name,
      }));

    if (!targets.length) {
      toast.error("Tidak ada jamaah dengan nomor HP untuk keberangkatan ini");
      setReminderSending(false);
      return;
    }

    const results = await sendWhatsAppBulk(apiKey, targets, () => {});
    const sent = results.filter(r => r.status === "sent").length;
    const failed = results.filter(r => r.status === "failed").length;
    toast.success(`Reminder H-${reminderType === "7d" ? "7" : "1"} terkirim: ${sent} berhasil, ${failed} gagal`);
    await saveLogsToDB(results.map((r, i) => ({ ...r, name: targets[i]?.name })), reminderDeparture, `DEPARTURE_REMINDER_H${reminderType === "7d" ? "7" : "1"}`);
    queryClient.invalidateQueries({ queryKey: ["whatsapp-logs"] });
    setReminderSending(false);
  };

  // ─── Test Send ────────────────────────────────────────────────────────────

  const handleTestSend = async () => {
    if (!apiKey) { toast.error("API key belum diisi"); return; }
    if (!testPhone) { toast.error("Nomor tujuan harus diisi"); return; }
    toast.info("Mengirim pesan test...");
    const result = await sendWhatsAppMessage({ token: apiKey, target: testPhone, message: testMessage });
    if (result.success) {
      toast.success("Pesan test berhasil dikirim! ✅");
      await supabase.from("whatsapp_logs" as any).insert({
        recipient_phone: normalisePhone(testPhone),
        message_content: testMessage,
        status: "sent",
        template_code: "TEST",
      });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-logs"] });
    } else {
      toast.error("Gagal: " + result.error);
    }
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

  // ─── Derived state ────────────────────────────────────────────────────────

  const filteredJamaah = useMemo(() => {
    if (!bulkJamaahSearch) return jamaahList;
    const q = bulkJamaahSearch.toLowerCase();
    return jamaahList.filter((j: any) => j.full_name?.toLowerCase().includes(q) || j.phone?.includes(q));
  }, [jamaahList, bulkJamaahSearch]);

  const filteredLogs = useMemo(() => {
    let result = logs;
    if (logStatusFilter !== "all") result = result.filter(l => l.status === logStatusFilter);
    if (logSearch) {
      const q = logSearch.toLowerCase();
      result = result.filter(l =>
        l.recipient_phone?.includes(q) ||
        (l.recipient_name as string | undefined)?.toLowerCase().includes(q) ||
        l.message_content?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [logs, logStatusFilter, logSearch]);

  const sentCount   = logs.filter(l => l.status === "sent").length;
  const failedCount = logs.filter(l => l.status === "failed").length;
  const noPhoneCount = jamaahList.filter((j: any) => !j.phone).length;
  const failedBulkCount = bulkLogs.filter(l => l.status === "failed").length;

  return (
    <div className="space-y-6">
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
          {config?.sender_number && (
            <Badge variant="outline" className="text-xs gap-1">
              <Phone className="h-3 w-3" />{config.sender_number}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="bulk" className="space-y-4">
        <TabsList className="inline-flex h-9 flex-wrap w-full md:w-auto gap-0.5">
          <TabsTrigger value="bulk"      className="gap-1.5 text-xs"><Users      className="h-3.5 w-3.5" />Kirim Massal</TabsTrigger>
          <TabsTrigger value="reminder"  className="gap-1.5 text-xs"><Bell       className="h-3.5 w-3.5" />Reminder</TabsTrigger>
          <TabsTrigger value="auto"      className="gap-1.5 text-xs"><Zap        className="h-3.5 w-3.5" />Auto Trigger</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs"><FileText   className="h-3.5 w-3.5" />Template</TabsTrigger>
          <TabsTrigger value="test"      className="gap-1.5 text-xs"><Send       className="h-3.5 w-3.5" />Test Kirim</TabsTrigger>
          <TabsTrigger value="logs"      className="gap-1.5 text-xs"><History    className="h-3.5 w-3.5" />Log ({logs.length})</TabsTrigger>
          <TabsTrigger value="config"    className="gap-1.5 text-xs"><Settings   className="h-3.5 w-3.5" />Konfigurasi</TabsTrigger>
        </TabsList>

        {/* ── BULK SEND ──────────────────────────────────────────────────── */}
        <TabsContent value="bulk" className="space-y-4">
          {!config?.api_key && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>API Token belum dikonfigurasi. Buka tab Konfigurasi untuk setup.</AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* Left: Form */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Pilih Keberangkatan & Pesan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Keberangkatan</Label>
                    <Select value={bulkDeparture} onValueChange={setBulkDeparture}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih keberangkatan..." />
                      </SelectTrigger>
                      <SelectContent>
                        {(departures as any[]).map((dep: any) => {
                          const daysLeft = differenceInDays(new Date(dep.departure_date), new Date());
                          return (
                            <SelectItem key={dep.id} value={dep.id}>
                              <div className="flex items-center gap-2">
                                {dep.package?.name} — {format(new Date(dep.departure_date), "dd MMM yyyy", { locale: id })}
                                {daysLeft >= 0 && daysLeft <= 14 && (
                                  <Badge variant="destructive" className="text-[10px] h-4">H-{daysLeft}</Badge>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  <div className="flex items-center gap-2">
                    <Switch id="useCustom" checked={useCustomMsg} onCheckedChange={setUseCustomMsg} />
                    <Label htmlFor="useCustom" className="cursor-pointer text-sm">Tulis pesan sendiri</Label>
                  </div>

                  {useCustomMsg ? (
                    <div className="space-y-1.5">
                      <Label>Pesan Kustom</Label>
                      <Textarea
                        value={bulkCustomMsg}
                        onChange={e => setBulkCustomMsg(e.target.value)}
                        rows={5}
                        placeholder={"Assalamu'alaikum {nama}...\nGunakan {nama}, {nama_paket}, {tanggal_berangkat}"}
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Variabel: {"{nama}"}, {"{nama_paket}"}, {"{tanggal_berangkat}"}, {"{sisa_hari}"}, {"{nomor_cs}"}</p>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
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
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button
                      onClick={handleBulkSend}
                      disabled={bulkSending || !bulkDeparture || !config?.api_key || selectedJamaah.size === 0}
                      className="flex-1 gap-2"
                    >
                      {bulkSending
                        ? <><Loader2 className="h-4 w-4 animate-spin" />Mengirim... {bulkProgress}%</>
                        : <><Send className="h-4 w-4" />Kirim ke {selectedJamaah.size} Jamaah</>}
                    </Button>
                    {failedBulkCount > 0 && !bulkSending && (
                      <Button variant="outline" size="icon" onClick={handleResendFailed} title={`Kirim ulang ${failedBulkCount} pesan gagal`}>
                        <RotateCcw className="h-4 w-4 text-amber-600" />
                      </Button>
                    )}
                  </div>

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

              {/* Preview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    Preview Pesan
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm font-mono whitespace-pre-wrap max-h-48 overflow-y-auto text-green-900 dark:text-green-100">
                    {getRenderedPreview()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5">Preview dengan data contoh — akan disesuaikan per jamaah saat dikirim</p>
                </CardContent>
              </Card>
            </div>

            {/* Right: Jamaah list */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    Jamaah
                    {jamaahList.length > 0 && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({selectedJamaah.size}/{jamaahList.length} dipilih)
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedJamaah(new Set((jamaahList as any[]).map(j => j.id)))}>
                      Semua
                    </Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedJamaah(new Set())}>
                      Reset
                    </Button>
                  </div>
                </div>
                {jamaahList.length > 0 && (
                  <div className="relative mt-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Cari nama atau nomor HP..."
                      value={bulkJamaahSearch}
                      onChange={e => setBulkJamaahSearch(e.target.value)}
                      className="pl-8 h-8 text-sm"
                    />
                  </div>
                )}
              </CardHeader>
              <CardContent className="p-0">
                {loadingJamaah ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : !bulkDeparture ? (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    Pilih keberangkatan terlebih dahulu
                  </div>
                ) : jamaahList.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 text-sm">Tidak ada jamaah di keberangkatan ini</div>
                ) : (
                  <>
                    {noPhoneCount > 0 && (
                      <div className="px-3 pb-2">
                        <Alert className="py-2">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <AlertDescription className="text-xs">{noPhoneCount} jamaah tidak memiliki nomor HP — tidak akan terkirim</AlertDescription>
                        </Alert>
                      </div>
                    )}
                    <ScrollArea className="h-[340px]">
                      <div className="space-y-px px-2 pb-2">
                        {(filteredJamaah as any[]).map(j => (
                          <div key={j.id} className={`flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/50 text-sm transition-colors ${selectedJamaah.has(j.id) ? 'bg-primary/5' : ''}`}>
                            <Checkbox
                              checked={selectedJamaah.has(j.id)}
                              disabled={!j.phone}
                              onCheckedChange={checked => {
                                const next = new Set(selectedJamaah);
                                if (checked) next.add(j.id); else next.delete(j.id);
                                setSelectedJamaah(next);
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate text-sm">{j.full_name}</p>
                              <p className="text-xs text-muted-foreground">{j.phone ? normalisePhone(j.phone) : "⚠️ No HP kosong"}</p>
                            </div>
                            {j.payment_status && (
                              <Badge variant={j.payment_status === 'paid' ? 'default' : j.payment_status === 'partial' ? 'secondary' : 'outline'} className="text-[10px] h-4">
                                {j.payment_status === 'paid' ? 'Lunas' : j.payment_status === 'partial' ? 'DP' : 'Belum'}
                              </Badge>
                            )}
                            {!j.phone && <Badge variant="destructive" className="text-[10px] h-4">No HP</Badge>}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bulk send results */}
          {bulkLogs.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Hasil Pengiriman</CardTitle>
                  <div className="flex gap-2 text-sm">
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" />{bulkLogs.filter(l => l.status === "sent").length} terkirim
                    </Badge>
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="h-3 w-3" />{failedBulkCount} gagal
                    </Badge>
                    {failedBulkCount > 0 && (
                      <Button variant="outline" size="sm" className="h-6 text-xs gap-1" onClick={handleResendFailed}>
                        <RotateCcw className="h-3 w-3" />Kirim Ulang Gagal
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-52 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama</TableHead>
                        <TableHead>Nomor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Keterangan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bulkLogs.map((log, i) => (
                        <TableRow key={i} className={log.status === "sent" ? "bg-green-50/30 dark:bg-green-950/10" : "bg-red-50/30 dark:bg-red-950/10"}>
                          <TableCell className="text-sm font-medium">{log.name || '-'}</TableCell>
                          <TableCell className="font-mono text-xs">{log.phone}</TableCell>
                          <TableCell>
                            <Badge variant={log.status === "sent" ? "default" : "destructive"} className="text-xs gap-1">
                              {log.status === "sent" ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                              {log.status === "sent" ? "Terkirim" : "Gagal"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{log.errorMessage || (log.status === "sent" ? "OK" : "-")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ── REMINDER SCHEDULER ────────────────────────────────────────── */}
        <TabsContent value="reminder" className="space-y-4">
          <Alert>
            <Bell className="h-4 w-4" />
            <AlertDescription>
              Kirim pesan pengingat keberangkatan (H-7 atau H-1) ke semua jamaah dalam satu keberangkatan sekaligus. Template menggunakan <strong>Pengingat Keberangkatan</strong> dengan variabel tanggal, flight, dan hotel otomatis terisi.
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Kirim Reminder Keberangkatan</CardTitle>
                <CardDescription>Pilih keberangkatan dan jenis reminder yang ingin dikirim</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Keberangkatan</Label>
                  <Select value={reminderDeparture} onValueChange={setReminderDeparture}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih keberangkatan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(departures as any[]).map((dep: any) => {
                        const daysLeft = differenceInDays(new Date(dep.departure_date), new Date());
                        return (
                          <SelectItem key={dep.id} value={dep.id}>
                            <div className="flex items-center gap-2">
                              {dep.package?.name} — {format(new Date(dep.departure_date), "dd MMM yyyy", { locale: id })}
                              {daysLeft >= 0 && (
                                <Badge variant={daysLeft <= 7 ? "destructive" : "secondary"} className="text-[10px] h-4">H-{daysLeft}</Badge>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {reminderDeparture && (
                    <div className="p-2.5 rounded-lg bg-muted/40 text-xs space-y-1 text-muted-foreground">
                      {(() => {
                        const dep = getDepInfo(reminderDeparture);
                        if (!dep) return null;
                        const daysLeft = differenceInDays(new Date(dep.departure_date), new Date());
                        return (
                          <>
                            <p>Keberangkatan: <strong>{format(new Date(dep.departure_date), "dd MMM yyyy", { locale: id })}</strong></p>
                            <p>Sisa: <strong className={daysLeft <= 7 ? "text-red-600" : ""}>{daysLeft} hari</strong></p>
                            <p>Flight: {dep.flight_number || '-'} | Hotel Makkah: {dep.hotel_makkah?.name || '-'}</p>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label>Jenis Reminder</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: "7d", label: "H-7", desc: "7 hari sebelum keberangkatan" },
                      { value: "1d", label: "H-1", desc: "1 hari sebelum keberangkatan" },
                    ].map(opt => (
                      <div
                        key={opt.value}
                        onClick={() => setReminderType(opt.value as "7d" | "1d")}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-colors ${reminderType === opt.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                      >
                        <p className="font-bold text-sm">{opt.label}</p>
                        <p className="text-xs text-muted-foreground">{opt.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleSendReminder}
                  disabled={reminderSending || !reminderDeparture || !config?.api_key}
                  className="w-full gap-2"
                >
                  {reminderSending
                    ? <><Loader2 className="h-4 w-4 animate-spin" />Mengirim Reminder...</>
                    : <><Bell className="h-4 w-4" />Kirim Reminder H-{reminderType === "7d" ? "7" : "1"}</>}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview Pesan Reminder</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-xl p-3 text-sm font-mono whitespace-pre-wrap text-green-900 dark:text-green-100">
                  {reminderDeparture
                    ? renderTemplate(DEFAULT_TEMPLATES.DEPARTURE_REMINDER.template, {
                        nama: "Ahmad Fauzi",
                        sisa_hari: reminderType === "7d" ? "7" : "1",
                        tanggal_berangkat: (() => {
                          const dep = getDepInfo(reminderDeparture);
                          return dep ? format(new Date(dep.departure_date), "dd MMM yyyy", { locale: id }) : "[tanggal]";
                        })(),
                        nomor_penerbangan: (getDepInfo(reminderDeparture) as any)?.flight_number || "[flight]",
                        hotel_makkah: (getDepInfo(reminderDeparture) as any)?.hotel_makkah?.name || "[hotel]",
                        titik_kumpul: "[titik kumpul]",
                        nomor_cs: senderNumber || "[nomor CS]",
                      })
                    : DEFAULT_TEMPLATES.DEPARTURE_REMINDER.template}
                </div>
                <p className="text-xs text-muted-foreground mt-2">Template bawaan "Pengingat Keberangkatan" — edit di tab Template</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── AUTO TRIGGER ──────────────────────────────────────────────── */}
        <TabsContent value="auto" className="space-y-4">
          <Alert>
            <Zap className="h-4 w-4" />
            <AlertDescription>
              Auto-trigger mengirim notifikasi secara otomatis saat event tertentu terjadi. Pastikan API token dikonfigurasi dan status <strong>Aktif</strong>.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Auto Trigger</CardTitle>
              <CardDescription>Pilih event mana yang akan memicu notifikasi WhatsApp otomatis</CardDescription>
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
                      {triggers[trigger.key] && <Badge className="text-[10px] h-4 bg-green-100 text-green-800">Aktif</Badge>}
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
        </TabsContent>

        {/* ── TEMPLATES ────────────────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Template Pesan Kustom</CardTitle>
                <CardDescription>Template tersimpan di database, bisa digunakan untuk kirim massal atau event kustom</CardDescription>
              </div>
              <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => setEditTemplate(null)}>
                    <Plus className="h-4 w-4 mr-1" />Tambah
                  </Button>
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
              <Alert className="mb-4">
                <Info className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Ada <strong>{Object.keys(DEFAULT_TEMPLATES).length} template bawaan</strong> (Booking, Payment, Lunas, Document Ready, Departure Reminder, dll) yang tersedia tanpa perlu membuat manual.
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
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Belum ada template kustom.</TableCell></TableRow>
                  ) : templates.map(t => (
                    <TableRow key={t.id}>
                      <TableCell className="font-mono text-xs">{t.code}</TableCell>
                      <TableCell className="text-sm">{t.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {t.variables?.slice(0, 4).map(v => <Badge key={v} variant="secondary" className="text-xs">{v}</Badge>)}
                          {(t.variables?.length || 0) > 4 && <Badge variant="outline" className="text-xs">+{(t.variables?.length || 0) - 4}</Badge>}
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
              <CardDescription>Kirim pesan langsung ke nomor tertentu menggunakan API token tersimpan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!config?.api_key && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>API Token belum dikonfigurasi.</AlertDescription>
                </Alert>
              )}
              <div className="space-y-1.5">
                <Label>Nomor Tujuan *</Label>
                <Input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="0812-3456-7890" />
                {testPhone && <p className="text-xs text-muted-foreground">Format: {normalisePhone(testPhone)}</p>}
              </div>
              <div className="space-y-1.5">
                <Label>Pesan *</Label>
                <Textarea value={testMessage} onChange={e => setTestMessage(e.target.value)} rows={5} />
              </div>
              <Button onClick={handleTestSend} disabled={!testPhone || !testMessage || !config?.api_key} className="w-full gap-2">
                <Send className="h-4 w-4" />Kirim Test
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LOGS ──────────────────────────────────────────────────────── */}
        <TabsContent value="logs" className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Terkirim", value: sentCount,   icon: CheckCircle, color: "text-green-500"  },
              { label: "Gagal",    value: failedCount,  icon: XCircle,    color: "text-destructive" },
              { label: "Total",    value: logs.length,  icon: MessageCircle, color: "text-primary"  },
            ].map(s => (
              <Card key={s.label} className="p-4">
                <div className="flex items-center gap-2">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="text-xl font-bold">{s.value}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <CardTitle className="text-base">Riwayat Pengiriman</CardTitle>
                <div className="flex gap-2 ml-auto flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input placeholder="Cari nama atau nomor..." value={logSearch} onChange={e => setLogSearch(e.target.value)} className="pl-8 h-8 text-sm w-44" />
                  </div>
                  <Select value={logStatusFilter} onValueChange={setLogStatusFilter}>
                    <SelectTrigger className="h-8 w-28 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      <SelectItem value="sent">Terkirim</SelectItem>
                      <SelectItem value="failed">Gagal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetchLogs()}>
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              {(logSearch || logStatusFilter !== "all") && (
                <p className="text-xs text-muted-foreground">Menampilkan {filteredLogs.length} dari {logs.length} log</p>
              )}
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Waktu</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>Nomor</TableHead>
                      <TableHead>Template</TableHead>
                      <TableHead>Pesan</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Tidak ada log</TableCell></TableRow>
                    ) : filteredLogs.slice(0, 200).map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">{format(new Date(log.created_at), "dd MMM HH:mm", { locale: id })}</TableCell>
                        <TableCell className="text-sm">{(log.recipient_name as string | undefined) || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{log.recipient_phone}</TableCell>
                        <TableCell className="text-xs">
                          {(log.template_code as string | undefined) && (
                            <Badge variant="outline" className="text-[10px]">{(log.template_code as string | undefined)}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="text-xs truncate max-w-[200px]">{log.message_content}</p>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── CONFIG ─────────────────────────────────────────────────────── */}
        <TabsContent value="config" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Gunakan <strong>Fonnte</strong> — daftar di <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer" className="underline text-primary">fonnte.com</a>, hubungkan nomor WhatsApp, lalu salin token API ke sini.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>Konfigurasi API WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Provider</Label>
                  <Select value={provider} onValueChange={setProvider}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fonnte">Fonnte (Recommended)</SelectItem>
                      <SelectItem value="wablas">Wablas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Nomor Pengirim (WhatsApp)</Label>
                  <Input value={senderNumber} onChange={e => setSenderNumber(e.target.value)} placeholder="08xxxxxxxxxx" />
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

              <Card className="bg-muted/20">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Panduan Setup Fonnte</CardTitle></CardHeader>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
