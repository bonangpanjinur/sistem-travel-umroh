import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import {
  MessageSquare, Settings, FileText, History, Send, Plus, Edit, Trash2,
  Eye, Users, Zap, CheckCircle, XCircle, AlertCircle, Loader2,
  RefreshCw, Phone, Info, Search, RotateCcw, Bell, ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { id } from "date-fns/locale";
import { renderTemplate, DEFAULT_TEMPLATES, normalisePhone, type WASendLog } from "@/lib/whatsapp-notifier";
import { formatCurrency } from "@/lib/format";

// ─── API helpers ────────────────────────────────────────────────────────────
const API = "/api/v1/whatsapp";

async function apiFetch<T = any>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "API error");
  return data;
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface WATemplate {
  id: string;
  code: string;
  name: string;
  message_template: string;
  variables: string[];
  is_active: boolean;
}

interface WALog {
  id: string;
  recipient_phone: string;
  recipient_name?: string | null;
  message_content: string;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  template_code?: string | null;
  departure_id?: string | null;
  created_at: string;
}

interface Jamaah {
  id: string;
  full_name: string;
  phone: string | null;
  booking_code?: string;
  payment_status?: string;
  remaining?: number;
}

interface WASettings {
  senderNumber: string;
  isActive: boolean;
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

// ─── Component ───────────────────────────────────────────────────────────────
export default function AdminWhatsApp() {
  const queryClient = useQueryClient();

  // ── Bulk send state ────────────────────────────────────────────────────────
  const [bulkDeparture, setBulkDeparture]   = useState("");
  const [bulkTemplate,  setBulkTemplate]    = useState<keyof typeof DEFAULT_TEMPLATES>("DEPARTURE_REMINDER");
  const [bulkCustomMsg, setBulkCustomMsg]   = useState("");
  const [useCustomMsg,  setUseCustomMsg]    = useState(false);
  const [selectedJamaah, setSelectedJamaah] = useState<Set<string>>(new Set());
  const [bulkProgress,   setBulkProgress]   = useState(0);
  const [bulkTotal,      setBulkTotal]      = useState(0);
  const [bulkSending,    setBulkSending]    = useState(false);
  const [bulkResults,    setBulkResults]    = useState<Array<{ phone: string; name?: string; status: string; errorMessage?: string }>>([]);
  const [bulkJamaahSearch, setBulkJamaahSearch] = useState("");

  // ── Reminder state ─────────────────────────────────────────────────────────
  const [reminderDeparture, setReminderDeparture] = useState("");
  const [reminderType,      setReminderType]      = useState<"7d" | "1d">("7d");
  const [reminderSending,   setReminderSending]   = useState(false);

  // ── Auto triggers (localStorage) ───────────────────────────────────────────
  const [triggers, setTriggers] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem("wa_auto_triggers") || "{}"); }
    catch { return {}; }
  });
  const saveTriggers = (next: Record<string, boolean>) => {
    setTriggers(next);
    localStorage.setItem("wa_auto_triggers", JSON.stringify(next));
    toast.success("Pengaturan auto-trigger disimpan");
  };

  // ── Template dialog ────────────────────────────────────────────────────────
  const [editTemplate,          setEditTemplate]          = useState<WATemplate | null>(null);
  const [isTemplateDialogOpen,  setIsTemplateDialogOpen]  = useState(false);

  // ── Test send ──────────────────────────────────────────────────────────────
  const [testPhone,   setTestPhone]   = useState("");
  const [testMessage, setTestMessage] = useState("Assalamu'alaikum, ini pesan test dari VinstourTravel. 🕌");
  const [testSending, setTestSending] = useState(false);

  // ── Logs state ─────────────────────────────────────────────────────────────
  const [logSearch,       setLogSearch]       = useState("");
  const [logStatusFilter, setLogStatusFilter] = useState("all");

  // ── Config state ───────────────────────────────────────────────────────────
  const [senderNumber, setSenderNumber] = useState("");
  const [isActive,     setIsActive]     = useState(false);

  // ─── Queries ─────────────────────────────────────────────────────────────

  const { data: waStatus } = useQuery({
    queryKey: ["wa-status"],
    queryFn: () => apiFetch<{ configured: boolean; active: boolean; device: any }>("/status"),
    refetchInterval: 30_000,
  });

  const failedBulkCount = bulkResults.filter(r => r.status === "failed").length;
  const noPhoneCount = (jamaahList as Jamaah[]).filter(j => !j.phone).length;

  const { data: waSettings } = useQuery({
    queryKey: ["wa-settings"],
    queryFn: () => apiFetch<WASettings>("/settings"),
  });

  // Update local state when settings are loaded
  useMemo(() => {
    if (waSettings) {
      setSenderNumber(waSettings.senderNumber);
      setIsActive(waSettings.isActive);
    }
  }, [waSettings]);

  const { data: templates = [] } = useQuery({
    queryKey: ["wa-templates"],
    queryFn: async () => {
      const d = await apiFetch<{ templates: WATemplate[] }>("/templates");
      return d.templates;
    },
  });

  const { data: logsData, refetch: refetchLogs } = useQuery({
    queryKey: ["wa-logs"],
    queryFn: () => apiFetch<{ logs: WALog[]; total: number }>("/logs?pageSize=200"),
  });
  const logs = logsData?.logs ?? [];

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
      const list: Jamaah[] = [];
      (data || []).forEach((row: any) => {
        const c = row.customer;
        const b = row.booking;
        if (c?.id && !seen.has(c.id)) {
          seen.add(c.id);
          list.push({ id: c.id, full_name: c.full_name, phone: c.phone, booking_code: b?.booking_code, payment_status: b?.payment_status, remaining: b?.remaining_amount });
        }
      });
      setSelectedJamaah(new Set(list.map(j => j.id)));
      return list;
    },
  });

  // ─── Mutations ───────────────────────────────────────────────────────────

  const saveSettingsMutation = useMutation({
    mutationFn: () => apiFetch("/settings", { method: "POST", body: JSON.stringify({ senderNumber, isActive }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["wa-settings"] }); toast.success("Pengaturan disimpan"); },
    onError: (e: Error) => toast.error("Gagal: " + e.message),
  });

  const saveTemplateMutation = useMutation({
    mutationFn: async (data: Partial<WATemplate>) => {
      if (editTemplate?.id) {
        return apiFetch(`/templates/${editTemplate.id}`, { method: "PUT", body: JSON.stringify(data) });
      }
      return apiFetch("/templates", { method: "POST", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wa-templates"] });
      toast.success("Template disimpan");
      setIsTemplateDialogOpen(false);
      setEditTemplate(null);
    },
    onError: (e: Error) => toast.error("Gagal: " + e.message),
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (id: string) => apiFetch(`/templates/${id}`, { method: "DELETE" }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["wa-templates"] }); toast.success("Template dihapus"); },
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const getDepInfo = (depId: string) => (departures as any[]).find((d: any) => d.id === depId) as any;

  const getRenderedPreview = useCallback((jamaahName = "Ahmad Fauzi") => {
    const dep = getDepInfo(bulkDeparture);
    const depDate   = dep ? format(new Date(dep.departure_date), "dd MMM yyyy", { locale: id }) : "[tanggal]";
    const pkgName   = dep?.package?.name || "[nama paket]";
    const daysLeft  = dep ? differenceInDays(new Date(dep.departure_date), new Date()) : 0;
    const flightNo  = dep?.flight_number || "[no penerbangan]";
    const hotelMakkah = dep?.hotel_makkah?.name || "[hotel makkah]";
    const vars = {
      nama: jamaahName, nama_paket: pkgName, tanggal_berangkat: depDate,
      sisa_hari: String(Math.max(daysLeft, 0)), nomor_penerbangan: flightNo,
      hotel_makkah: hotelMakkah, titik_kumpul: "[titik kumpul]",
      nomor_cs: senderNumber || "[nomor CS]", kode_booking: "[B-12345]",
      total_harga: "Rp 25.000.000", terbayar: "Rp 10.000.000", sisa_bayar: "Rp 15.000.000",
      jumlah_bayar: "Rp 5.000.000", tanggal_bayar: depDate, total_terbayar: "Rp 10.000.000",
      jenis_dokumen: "Surat Paspor", tanggal_ambil: depDate, lokasi_ambil: "Kantor Cabang",
      isi_pesan: bulkCustomMsg || "[pesan kustom]",
    };
    if (useCustomMsg && bulkCustomMsg) return renderTemplate(bulkCustomMsg, vars);
    return renderTemplate(DEFAULT_TEMPLATES[bulkTemplate]?.template || "", vars);
  }, [bulkDeparture, bulkTemplate, bulkCustomMsg, useCustomMsg, senderNumber, departures]);

  // ─── Bulk send (via API — token stays server-side) ───────────────────────

  const handleBulkSend = async () => {
    if (!waStatus?.configured) { toast.error("FONNTE_TOKEN belum dikonfigurasi di server"); return; }
    const targets = (jamaahList as Jamaah[]).filter(j => selectedJamaah.has(j.id) && j.phone);
    if (!targets.length) { toast.error("Tidak ada jamaah yang dipilih atau tidak ada nomor HP"); return; }

    setBulkSending(true); setBulkResults([]); setBulkProgress(0); setBulkTotal(targets.length);

    const dep     = getDepInfo(bulkDeparture);
    const depDate = dep ? format(new Date(dep.departure_date), "dd MMM yyyy", { locale: id }) : "-";
    const pkgName = dep?.package?.name || "-";
    const daysLeft = dep ? differenceInDays(new Date(dep.departure_date), new Date()) : 0;

    const recipients = targets.map(j => {
      const vars = {
        nama: j.full_name, nama_paket: pkgName, tanggal_berangkat: depDate,
        sisa_hari: String(Math.max(daysLeft, 0)), nomor_penerbangan: dep?.flight_number || "-",
        hotel_makkah: dep?.hotel_makkah?.name || "-", titik_kumpul: "-",
        nomor_cs: senderNumber || "-", kode_booking: j.booking_code || "-",
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

    // Send in batches of 10 via API (API handles 1s delay internally)
    // We poll progress by sending smaller chunks and updating progress
    const CHUNK = 10;
    let allResults: typeof bulkResults = [];

    for (let i = 0; i < recipients.length; i += CHUNK) {
      const chunk = recipients.slice(i, i + CHUNK);
      try {
        const res = await apiFetch<{ results: typeof bulkResults }>("/send-bulk", {
          method: "POST",
          body: JSON.stringify({
            recipients: chunk,
            templateCode: useCustomMsg ? "CUSTOM" : bulkTemplate,
            departureId: bulkDeparture,
          }),
        });
        allResults = [...allResults, ...res.results];
        setBulkResults([...allResults]);
        setBulkProgress(Math.round((Math.min(i + CHUNK, recipients.length) / recipients.length) * 100));
      } catch (e: any) {
        toast.error("Terjadi kesalahan: " + e.message);
      }
    }

    const sent   = allResults.filter(r => r.status === "sent").length;
    const failed = allResults.filter(r => r.status === "failed").length;
    toast.success(`Selesai: ${sent} terkirim, ${failed} gagal`);
    setBulkSending(false);
    refetchLogs();
  };

  const handleResendFailed = async () => {
    const failed = bulkResults.filter(r => r.status === "failed" && r.phone);
    if (!failed.length) return;
    toast.info(`Mengirim ulang ${failed.length} pesan gagal...`);
    const originalRecipients = (jamaahList as Jamaah[]).filter(j => selectedJamaah.has(j.id) && j.phone);
    const retries = failed.map(f => {
      const orig = originalRecipients.find(j => normalisePhone(j.phone || "") === normalisePhone(f.phone));
      return { phone: f.phone, message: orig ? getRenderedPreview(orig.full_name) : "Test", name: f.name };
    });
    try {
      const res = await apiFetch<{ results: typeof bulkResults }>("/send-bulk", {
        method: "POST",
        body: JSON.stringify({ recipients: retries, templateCode: "RESEND", departureId: bulkDeparture }),
      });
      const newResults = bulkResults.map(r => {
        if (r.status !== "failed") return r;
        const retry = res.results.find(x => normalisePhone(x.phone) === normalisePhone(r.phone));
        return retry ? { ...r, status: retry.status, errorMessage: retry.errorMessage } : r;
      });
      setBulkResults(newResults);
      const sent = res.results.filter(r => r.status === "sent").length;
      toast.success(`Resend selesai: ${sent} berhasil`);
      refetchLogs();
    } catch (e: any) {
      toast.error("Resend gagal: " + e.message);
    }
  };

  // ─── Reminder send ───────────────────────────────────────────────────────

  const handleSendReminder = async () => {
    if (!waStatus?.configured || !reminderDeparture) {
      toast.error("Pilih keberangkatan dan pastikan FONNTE_TOKEN sudah dikonfigurasi di server");
      return;
    }
    const dep = getDepInfo(reminderDeparture);
    if (!dep) return;
    setReminderSending(true);
    const daysLeft = differenceInDays(new Date(dep.departure_date), new Date());

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

    try {
      const res = await apiFetch<{ sent: number; failed: number }>("/send-bulk", {
        method: "POST",
        body: JSON.stringify({
          recipients: targets,
          templateCode: `DEPARTURE_REMINDER_H${reminderType === "7d" ? "7" : "1"}`,
          departureId: reminderDeparture,
        }),
      });
      toast.success(`Reminder H-${reminderType === "7d" ? "7" : "1"} terkirim: ${res.sent} berhasil, ${res.failed} gagal`);
      refetchLogs();
    } catch (e: any) {
      toast.error("Gagal: " + e.message);
    }
    setReminderSending(false);
  };

  // ─── Test send ───────────────────────────────────────────────────────────

  const handleTestSend = async () => {
    if (!testPhone) { toast.error("Nomor tujuan harus diisi"); return; }
    if (!waStatus?.configured) { toast.error("FONNTE_TOKEN belum dikonfigurasi di server"); return; }
    setTestSending(true);
    try {
      await apiFetch("/send", {
        method: "POST",
        body: JSON.stringify({ phone: testPhone, message: testMessage, templateCode: "TEST" }),
      });
      toast.success("Pesan test berhasil dikirim! ✅");
      refetchLogs();
    } catch (e: any) {
      toast.error("Gagal: " + e.message);
    }
    setTestSending(false);
  };

  // ─── Template save ───────────────────────────────────────────────────────

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

  // ─── Derived state ───────────────────────────────────────────────────────

  const filteredJamaah = useMemo(() => {
    if (!bulkJamaahSearch) return jamaahList;
    const q = bulkJamaahSearch.toLowerCase();
    return (jamaahList as Jamaah[]).filter(j => j.full_name?.toLowerCase().includes(q) || j.phone?.includes(q));
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

  const sentCount         = logs.filter(l => l.status === "sent").length;
  const failedCount       = logs.filter(l => l.status === "failed").length;
  const failedBulkCount   = bulkResults.filter(r => r.status === "failed").length;
  const noPhoneCount      = (jamaahList as Jamaah[]).filter(j => !j.phone).length;

  // ─── Render ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-green-500/10">
          <MessageSquare className="h-7 w-7 text-green-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Notifikasi</h1>
          <p className="text-muted-foreground text-sm">Kirim notifikasi otomatis & massal ke jamaah via WhatsApp (Fonnte)</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant={waStatus?.configured ? (waStatus.active ? "default" : "secondary") : "destructive"} className="gap-1">
            {waStatus?.configured
              ? waStatus.active
                ? <><CheckCircle className="h-3 w-3" /> Terhubung</>
                : <><XCircle className="h-3 w-3" /> Tidak aktif</>
              : <><AlertCircle className="h-3 w-3" /> Token belum disetel</>}
          </Badge>
          {waSettings?.senderNumber && (
            <Badge variant="outline" className="text-xs gap-1">
              <Phone className="h-3 w-3" />{waSettings.senderNumber}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="bulk" className="space-y-4">
        <TabsList className="inline-flex h-9 flex-wrap w-full md:w-auto gap-0.5">
          <TabsTrigger value="bulk"      className="gap-1.5 text-xs"><Users    className="h-3.5 w-3.5" />Kirim Massal</TabsTrigger>
          <TabsTrigger value="reminder"  className="gap-1.5 text-xs"><Bell     className="h-3.5 w-3.5" />Reminder</TabsTrigger>
          <TabsTrigger value="auto"      className="gap-1.5 text-xs"><Zap      className="h-3.5 w-3.5" />Auto Trigger</TabsTrigger>
          <TabsTrigger value="templates" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Template</TabsTrigger>
          <TabsTrigger value="test"      className="gap-1.5 text-xs"><Send     className="h-3.5 w-3.5" />Test Kirim</TabsTrigger>
          <TabsTrigger value="logs"      className="gap-1.5 text-xs"><History  className="h-3.5 w-3.5" />Log ({logs.length})</TabsTrigger>
          <TabsTrigger value="config"    className="gap-1.5 text-xs"><Settings className="h-3.5 w-3.5" />Pengaturan</TabsTrigger>
        </TabsList>

        {/* ── BULK SEND ────────────────────────────────────────────────── */}
        <TabsContent value="bulk" className="space-y-4">
          {!waStatus?.configured && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                FONNTE_TOKEN belum dikonfigurasi. Buka tab <strong>Pengaturan</strong> untuk instruksi setup.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            {/* Left: Form */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Pilih Keberangkatan & Pesan</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Keberangkatan</Label>
                    <Select value={bulkDeparture} onValueChange={setBulkDeparture}>
                      <SelectTrigger><SelectValue placeholder="Pilih keberangkatan..." /></SelectTrigger>
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
                        <SelectTrigger><SelectValue /></SelectTrigger>
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
                      disabled={bulkSending || !bulkDeparture || !waStatus?.configured || selectedJamaah.size === 0}
                      className="flex-1 gap-2"
                    >
                      {bulkSending
                        ? <><Loader2 className="h-4 w-4 animate-spin" />Mengirim... {bulkProgress}%</>
                        : <><Send className="h-4 w-4" />Kirim ke {selectedJamaah.size} Jamaah</>}
                    </Button>
                    {failedBulkCount > 0 && !bulkSending && (
                      <Button variant="outline" size="icon" onClick={handleResendFailed} title={`Kirim ulang ${failedBulkCount} gagal`}>
                        <RotateCcw className="h-4 w-4 text-amber-600" />
                      </Button>
                    )}
                  </div>

                  {bulkSending && (
                    <div className="space-y-1">
                      <Progress value={bulkProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground text-center">
                        {Math.round(bulkProgress * bulkTotal / 100)}/{bulkTotal} pesan
                      </p>
                    </div>
                  )}

                  {bulkResults.length > 0 && !bulkSending && (
                    <div className="text-sm space-y-1">
                      <p className="font-medium">Hasil pengiriman:</p>
                      <div className="flex gap-2">
                        <Badge className="gap-1"><CheckCircle className="h-3 w-3" />{bulkResults.filter(r => r.status === "sent").length} terkirim</Badge>
                        {failedBulkCount > 0 && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{failedBulkCount} gagal</Badge>}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Preview */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />Preview Pesan
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
                    {(jamaahList as Jamaah[]).length > 0 && (
                      <span className="ml-2 text-sm font-normal text-muted-foreground">
                        ({selectedJamaah.size}/{(jamaahList as Jamaah[]).length} dipilih)
                      </span>
                    )}
                  </CardTitle>
                  <div className="flex gap-1.5">
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedJamaah(new Set((jamaahList as Jamaah[]).map(j => j.id)))}>Semua</Button>
                    <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => setSelectedJamaah(new Set())}>Reset</Button>
                  </div>
                </div>
                {(jamaahList as Jamaah[]).length > 0 && (
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
                {!bulkDeparture ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Pilih keberangkatan terlebih dahulu</div>
                ) : loadingJamaah ? (
                  <div className="p-6 text-center text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />Memuat jamaah...</div>
                ) : (jamaahList as Jamaah[]).length === 0 ? (
                  <div className="p-6 text-center text-sm text-muted-foreground">Tidak ada jamaah untuk keberangkatan ini</div>
                ) : (
                  <>
                    {noPhoneCount > 0 && (
                      <Alert className="mx-4 mt-4 mb-0">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-xs">{noPhoneCount} jamaah tidak memiliki nomor HP dan akan dilewati</AlertDescription>
                      </Alert>
                    )}
                    <ScrollArea className="h-72">
                      <div className="p-2 space-y-1">
                        {(filteredJamaah as Jamaah[]).map(j => (
                          <div
                            key={j.id}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${selectedJamaah.has(j.id) ? "bg-primary/10" : "hover:bg-muted/50"} ${!j.phone ? "opacity-50" : ""}`}
                            onClick={() => {
                              if (!j.phone) return;
                              const next = new Set(selectedJamaah);
                              if (next.has(j.id)) next.delete(j.id); else next.add(j.id);
                              setSelectedJamaah(next);
                            }}
                          >
                            <Checkbox checked={selectedJamaah.has(j.id)} disabled={!j.phone} onCheckedChange={() => {}} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{j.full_name}</p>
                              <p className="text-xs text-muted-foreground">{j.phone || "Tidak ada HP"}</p>
                            </div>
                            {j.payment_status && (
                              <Badge variant={j.payment_status === "lunas" ? "default" : "secondary"} className="text-[10px] h-4 shrink-0">
                                {j.payment_status}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── REMINDER ─────────────────────────────────────────────────── */}
        <TabsContent value="reminder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" />Kirim Pengingat Keberangkatan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Keberangkatan</Label>
                  <Select value={reminderDeparture} onValueChange={setReminderDeparture}>
                    <SelectTrigger><SelectValue placeholder="Pilih keberangkatan..." /></SelectTrigger>
                    <SelectContent>
                      {(departures as any[]).map((d: any) => {
                        const daysLeft = differenceInDays(new Date(d.departure_date), new Date());
                        return (
                          <SelectItem key={d.id} value={d.id}>
                            {d.package?.name} — {format(new Date(d.departure_date), "dd MMM yyyy", { locale: id })}
                            {daysLeft >= 0 && daysLeft <= 14 && ` (H-${daysLeft})`}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Jenis Pengingat</Label>
                  <Select value={reminderType} onValueChange={v => setReminderType(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="7d">H-7 (7 hari sebelum berangkat)</SelectItem>
                      <SelectItem value="1d">H-1 (1 hari sebelum berangkat)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleSendReminder}
                disabled={reminderSending || !reminderDeparture || !waStatus?.configured}
                className="gap-2"
              >
                {reminderSending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Mengirim...</>
                  : <><Bell className="h-4 w-4" />Kirim Reminder H-{reminderType === "7d" ? "7" : "1"}</>}
              </Button>

              <div className="rounded-lg border bg-muted/30 p-4">
                <p className="text-sm font-medium mb-2">Preview Template Pengingat:</p>
                <pre className="text-xs font-mono whitespace-pre-wrap text-muted-foreground">
                  {renderTemplate(DEFAULT_TEMPLATES.DEPARTURE_REMINDER.template, {
                    nama: "Ahmad Fauzi", sisa_hari: reminderType === "7d" ? "7" : "1",
                    tanggal_berangkat: "25 Des 2025", nomor_penerbangan: "GA-891",
                    hotel_makkah: "Swissotel Makkah", titik_kumpul: "Bandara Soekarno-Hatta T3",
                    nomor_cs: senderNumber || "0812-XXXX-XXXX",
                  })}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AUTO TRIGGER ──────────────────────────────────────────────── */}
        <TabsContent value="auto" className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Auto-trigger mengirim WA otomatis saat event tertentu terjadi (booking baru, pembayaran, dll). Pengaturan ini tersimpan di browser. Integrasi dengan webhook memerlukan konfigurasi tambahan di server.
            </AlertDescription>
          </Alert>
          <div className="grid gap-3">
            {AUTO_TRIGGERS.map(trigger => (
              <Card key={trigger.key} className="p-4">
                <div className="flex items-start gap-3">
                  <Switch
                    id={trigger.key}
                    checked={!!triggers[trigger.key]}
                    onCheckedChange={v => saveTriggers({ ...triggers, [trigger.key]: v })}
                    className="mt-0.5"
                  />
                  <div className="flex-1">
                    <Label htmlFor={trigger.key} className="cursor-pointer font-medium">{trigger.label}</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">{trigger.desc}</p>
                    <Badge variant="outline" className="mt-1 text-[10px] h-5">{trigger.template}</Badge>
                  </div>
                  {triggers[trigger.key] && <Badge className="gap-1 shrink-0"><CheckCircle className="h-3 w-3" />Aktif</Badge>}
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* ── TEMPLATES ─────────────────────────────────────────────────── */}
        <TabsContent value="templates" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Template tersimpan di database. Template default tersedia di kode (DEFAULT_TEMPLATES).</p>
            </div>
            <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2" onClick={() => setEditTemplate(null)}>
                  <Plus className="h-4 w-4" />Tambah Template
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-xl">
                <DialogHeader><DialogTitle>{editTemplate ? "Edit Template" : "Tambah Template Baru"}</DialogTitle></DialogHeader>
                <form onSubmit={handleSaveTemplate} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="code">Kode *</Label>
                      <Input id="code" name="code" defaultValue={editTemplate?.code} placeholder="BOOKING_CONFIRM" required className="uppercase" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Nama *</Label>
                      <Input id="name" name="name" defaultValue={editTemplate?.name} placeholder="Konfirmasi Booking" required />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="message_template">Isi Template *</Label>
                    <Textarea id="message_template" name="message_template" defaultValue={editTemplate?.message_template} rows={8} placeholder={"Assalamu'alaikum {nama} 🕌\n\n..."} className="font-mono text-sm" required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="variables">Variabel (pisahkan dengan koma)</Label>
                    <Input id="variables" name="variables" defaultValue={editTemplate?.variables?.join(", ")} placeholder="nama, kode_booking, nomor_cs" />
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>Batal</Button>
                    <Button type="submit" disabled={saveTemplateMutation.isPending}>
                      {saveTemplateMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan...</> : "Simpan"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {templates.length === 0 ? (
            <Card className="p-8 text-center text-muted-foreground text-sm">
              Belum ada template kustom. Klik "Tambah Template" untuk membuat.
            </Card>
          ) : (
            <div className="grid gap-3">
              {templates.map(tpl => (
                <Card key={tpl.id} className={`p-4 ${!tpl.is_active ? "opacity-60" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs font-mono">{tpl.code}</Badge>
                        <span className="font-medium text-sm">{tpl.name}</span>
                        {!tpl.is_active && <Badge variant="secondary" className="text-xs">Nonaktif</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground font-mono line-clamp-2">{tpl.message_template}</p>
                      {tpl.variables?.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {tpl.variables.map(v => (
                            <span key={v} className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{"{" + v + "}"}</span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => { setEditTemplate(tpl); setIsTemplateDialogOpen(true); }}
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => { if (confirm("Hapus template ini?")) deleteTemplateMutation.mutate(tpl.id); }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Default templates (read-only reference) */}
          <div className="mt-4">
            <p className="text-sm font-medium mb-2 text-muted-foreground">Template Bawaan (read-only):</p>
            <div className="grid gap-2">
              {Object.entries(DEFAULT_TEMPLATES).map(([key, tpl]) => (
                <div key={key} className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/20 text-sm">
                  <Badge variant="outline" className="text-xs font-mono shrink-0">{key}</Badge>
                  <span className="text-muted-foreground">{tpl.name}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* ── TEST KIRIM ────────────────────────────────────────────────── */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Test Kirim Pesan</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {!waStatus?.configured && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>FONNTE_TOKEN belum dikonfigurasi. Test tidak bisa dilakukan.</AlertDescription>
                </Alert>
              )}
              <div className="space-y-1.5">
                <Label>Nomor Tujuan</Label>
                <Input value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="08123456789" />
              </div>
              <div className="space-y-1.5">
                <Label>Pesan</Label>
                <Textarea value={testMessage} onChange={e => setTestMessage(e.target.value)} rows={5} className="font-mono text-sm" />
              </div>
              <Button onClick={handleTestSend} disabled={testSending || !waStatus?.configured} className="gap-2">
                {testSending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Mengirim...</>
                  : <><Send className="h-4 w-4" />Kirim Test</>}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── LOGS ─────────────────────────────────────────────────────── */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex gap-2 flex-1">
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cari nomor, nama..."
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={logStatusFilter} onValueChange={setLogStatusFilter}>
                <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="sent">Terkirim</SelectItem>
                  <SelectItem value="failed">Gagal</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex gap-2 text-sm">
                <Badge className="gap-1"><CheckCircle className="h-3 w-3" />{sentCount}</Badge>
                {failedCount > 0 && <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />{failedCount}</Badge>}
              </div>
              <Button variant="ghost" size="icon" onClick={() => refetchLogs()}><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </div>

          <Card>
            <div className="rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Penerima</TableHead>
                    <TableHead>Pesan</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Waktu</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Tidak ada riwayat pengiriman</TableCell></TableRow>
                  ) : filteredLogs.map(log => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{log.recipient_name || "-"}</p>
                          <p className="text-xs text-muted-foreground font-mono">{log.recipient_phone}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="text-sm max-w-xs truncate" title={log.message_content}>{log.message_content}</p>
                        {log.error_message && <p className="text-xs text-destructive mt-0.5">{log.error_message}</p>}
                      </TableCell>
                      <TableCell>
                        {log.template_code && <Badge variant="outline" className="text-[10px] font-mono">{log.template_code}</Badge>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={log.status === "sent" ? "default" : log.status === "failed" ? "destructive" : "secondary"} className="gap-1">
                          {log.status === "sent" ? <CheckCircle className="h-3 w-3" /> : log.status === "failed" ? <XCircle className="h-3 w-3" /> : null}
                          {log.status === "sent" ? "Terkirim" : log.status === "failed" ? "Gagal" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {log.sent_at
                          ? format(new Date(log.sent_at), "dd MMM yy HH:mm", { locale: id })
                          : format(new Date(log.created_at), "dd MMM yy HH:mm", { locale: id })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ── CONFIG ───────────────────────────────────────────────────── */}
        <TabsContent value="config" className="space-y-4">
          {/* Token status card */}
          <Card className={`border-2 ${waStatus?.configured ? "border-green-500/30 bg-green-500/5" : "border-amber-500/30 bg-amber-500/5"}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck className={`h-5 w-5 ${waStatus?.configured ? "text-green-600" : "text-amber-600"}`} />
                Status FONNTE_TOKEN
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant={waStatus?.configured ? "default" : "secondary"} className="gap-1 text-sm px-3 py-1">
                  {waStatus?.configured
                    ? <><CheckCircle className="h-4 w-4" /> Token sudah dikonfigurasi</>
                    : <><AlertCircle className="h-4 w-4" /> Token belum disetel</>}
                </Badge>
                {waStatus?.configured && (
                  <Badge variant={waStatus.active ? "default" : "secondary"} className="gap-1">
                    {waStatus.active ? <><CheckCircle className="h-3 w-3" /> Device terhubung</> : <><XCircle className="h-3 w-3" /> Device offline</>}
                  </Badge>
                )}
              </div>

              {waStatus?.device && (
                <div className="text-sm grid grid-cols-2 gap-2 p-3 rounded-lg bg-background border">
                  {Object.entries(waStatus.device).slice(0, 6).map(([k, v]) => (
                    <div key={k}><span className="text-muted-foreground">{k}:</span> <span className="font-mono">{String(v)}</span></div>
                  ))}
                </div>
              )}

              {!waStatus?.configured && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="space-y-2">
                    <p className="font-medium">Cara mengatur FONNTE_TOKEN:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Daftar di <a href="https://fonnte.com" target="_blank" rel="noopener noreferrer" className="underline text-primary inline-flex items-center gap-0.5">fonnte.com <ExternalLink className="h-3 w-3" /></a></li>
                      <li>Hubungkan nomor WhatsApp di menu <strong>Device → Add Device</strong></li>
                      <li>Salin token dari halaman Device</li>
                      <li>Di Replit, buka panel <strong>Secrets</strong> (ikon gembok 🔒)</li>
                      <li>Tambahkan secret baru: key = <code className="bg-muted px-1 rounded">FONNTE_TOKEN</code>, value = token Anda</li>
                      <li>Restart server agar token terbaca</li>
                    </ol>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Sender settings */}
          <Card>
            <CardHeader><CardTitle className="text-base">Pengaturan Pengirim</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Nomor WhatsApp Pengirim</Label>
                <Input
                  value={senderNumber}
                  onChange={e => setSenderNumber(e.target.value)}
                  placeholder="08xxxxxxxxxx"
                />
                <p className="text-xs text-muted-foreground">Nomor ini digunakan sebagai info kontak CS di dalam template pesan</p>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                <Switch id="is_active" checked={isActive} onCheckedChange={setIsActive} />
                <div>
                  <Label htmlFor="is_active" className="cursor-pointer">Aktifkan Notifikasi WhatsApp</Label>
                  <p className="text-xs text-muted-foreground">Matikan untuk sementara tanpa mengubah konfigurasi token</p>
                </div>
              </div>

              <Button onClick={() => saveSettingsMutation.mutate()} disabled={saveSettingsMutation.isPending} className="gap-2">
                {saveSettingsMutation.isPending
                  ? <><Loader2 className="h-4 w-4 animate-spin" />Menyimpan...</>
                  : "Simpan Pengaturan"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
