import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { toast } from "sonner";
import { 
  Search, Filter, Send, History, Settings, Info, CheckCircle2, 
  XCircle, Clock, ChevronRight, Download, Eye, RefreshCw, 
  LayoutDashboard, MessagesSquare, Phone, User, Calendar, 
  ScrollText, Smile, TrendingUp, BrainCircuit, Sparkles,
  FileSearch, FileCog, FileText, FileOutput, ShieldAlert,
  WifiOff, LifeBuoy, ClipboardList, Briefcase, UserCog,
  Wallet, Hotel, Plane, Building, Store, PersonStanding,
  Bus, Database, Layout, Smartphone, Share2, MessageCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PERMISSIONS } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

const TEMPLATES = [
  { id: "custom", name: "Kustom", message: "" },
  { id: "promo",  name: "Promo Paket", message: "Assalamu'alaikum [nama], dapatkan penawaran spesial paket [paket] hanya untuk Anda!" },
  { id: "remind", name: "Reminder Pembayaran", message: "Assalamu'alaikum [nama], kami ingatkan untuk pembayaran paket [paket] yang akan jatuh tempo." },
  { id: "info",   name: "Info Keberangkatan", message: "Assalamu'alaikum [nama], berikut informasi terkait keberangkatan Anda untuk paket [paket]." },
];

export default function AdminWABroadcast() {
  const qc = useQueryClient();
  const [tab, setTab] = useState("broadcast");
  
  // ── Log detail state ──────────────────────────────────────────────────────
  const [logsOpenId,   setLogsOpenId]   = useState<string | null>(null);
  const [logsSearch,   setLogsSearch]   = useState("");
  const [logsFilter,   setLogsFilter]   = useState<"all" | "sent" | "failed">("all");

  // ── Broadcast state ───────────────────────────────────────────────────────
  const [campaignName, setCampaignName] = useState("");
  const [templateId,   setTemplateId]   = useState("custom");
  const [message,      setMessage]      = useState("");
  const [scheduledAt,  setScheduledAt]  = useState<string | null>(null);
  
  const [selectedPackages,   setSelectedPackages]   = useState<Set<string>>(new Set());
  const [selectedDepartures, setSelectedDepartures] = useState<Set<string>>(new Set());
  const [selectedPayStatus,  setSelectedPayStatus]  = useState<Set<string>>(new Set());
  const [selectedBookStatus, setSelectedBookStatus] = useState<Set<string>>(new Set());
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());

  const [sending,      setSending]      = useState(false);
  const [sentCount,    setSentCount]    = useState(0);
  const [totalToSend,  setTotalToSend]  = useState(0);

  // ── Execute-from-history state ────────────────────────────────────────────
  const [executingId,  setExecutingId]  = useState<string | null>(null);
  const [execSent,     setExecSent]     = useState(0);

  // ── Data fetching ─────────────────────────────────────────────────────────
  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["wa-broadcast-recipients"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, payment_status, status,
          customer:profiles(full_name, phone_number),
          package:packages(name),
          departure:departures(departure_date)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const packages = useMemo(() => {
    const names = new Set<string>();
    bookings.forEach((b: any) => { if (b.package?.name) names.add(b.package.name); });
    return Array.from(names).sort();
  }, [bookings]);

  const departures = useMemo(() => {
    const dates = new Set<string>();
    bookings.forEach((b: any) => { if (b.departure?.departure_date) dates.add(b.departure.departure_date); });
    return Array.from(dates).sort();
  }, [bookings]);

  const filteredRecipients = useMemo(() => {
    return bookings.filter((b: any) => {
      if (selectedPackages.size && !selectedPackages.has(b.package?.name)) return false;
      if (selectedDepartures.size && !selectedDepartures.has(b.departure?.departure_date)) return false;
      if (selectedPayStatus.size && !selectedPayStatus.has(b.payment_status)) return false;
      if (selectedBookStatus.size && !selectedBookStatus.has(b.status)) return false;
      return true;
    });
  }, [bookings, selectedPackages, selectedDepartures, selectedPayStatus, selectedBookStatus]);

  const withPhone = useMemo(() => {
    return filteredRecipients.filter((r: any) => r.customer?.phone_number);
  }, [filteredRecipients]);

  useEffect(() => {
    setSelectedRecipients(new Set(withPhone.map((r: any) => r.id)));
  }, [withPhone]);

  function buildMessage(recipient: any) {
    let msg = message;
    msg = msg.replace(/\[nama\]/gi, recipient.customer?.full_name || "");
    msg = msg.replace(/\[paket\]/gi, recipient.package?.name || "");
    msg = msg.replace(/\[kode\]/gi, recipient.booking_code || "");
    return msg;
  }

  function handleTemplateChange(id: string) {
    setTemplateId(id);
    const tpl = TEMPLATES.find(t => t.id === id);
    if (tpl && tpl.id !== "custom") setMessage(tpl.message);
    if (tpl?.id === "custom") setMessage("");
  }

  // ── Toggle helpers ──────────────────────────────────────────────────────────
  function toggleSet(set: Set<string>, val: string, setter: (s: Set<string>) => void) {
    setter(new Set(Array.from(set).includes(val) ? Array.from(set).filter(i => i !== val) : [...Array.from(set), val]));
  }

  // ── Campaign save mutation ──────────────────────────────────────────────────
  const saveCampaign = useMutation({
    mutationFn: async (status: "draft" | "scheduled") => {
      const { data: { user } } = await supabase.auth.getUser();
      const payload: any = {
        name: campaignName || `Broadcast ${format(new Date(), "dd MMM yyyy HH:mm", { locale: idLocale })}`,
        segment_filters: {
          package_ids: [...selectedPackages],
          departure_ids: [...selectedDepartures],
          payment_statuses: [...selectedPayStatus],
          booking_statuses: [...selectedBookStatus],
        },
        message_template: message,
        status,
        total_recipients: selectedRecipients.size,
        created_by: user?.id,
      };
      if (status === "scheduled" && scheduledAt) {
        payload.scheduled_at = new Date(scheduledAt).toISOString();
      }
      const { data, error } = await (supabase as any)
        .from("wa_broadcast_campaigns")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;
      return (data as any).id as string;
    },
  });

  // ── Send blast ──────────────────────────────────────────────────────────────
  async function handleSend() {
    const toSend = withPhone.filter((r: any) => selectedRecipients.has(r.id));
    if (!toSend.length) { toast.error("Pilih minimal satu penerima"); return; }
    if (!message.trim()) { toast.error("Pesan tidak boleh kosong"); return; }

    setSending(true);
    setSentCount(0);
    setTotalToSend(toSend.length);

    // Save campaign first
    let campaignId: string | null = null;
    try {
      campaignId = await saveCampaign.mutateAsync("sending" as any);
    } catch (e) {
      // Campaign save failed but continue with send
    }

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toSend.length; i++) {
      const r = toSend[i] as any;
      try {
        const resp = await fetch("/api/v1/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: r.phone_number || r.customer?.phone_number,
            message: buildMessage(r),
          }),
        });
        const result = await resp.json().catch(() => ({ success: false }));
        if (result.success || resp.ok) successCount++;
        else failCount++;

        // Log per recipient
        if (campaignId) {
          (supabase as any).from("wa_broadcast_logs").insert({
            campaign_id: campaignId,
            booking_id: r.id,
            phone: r.phone_number || r.customer?.phone_number,
            message: buildMessage(r),
            status: (result.success || resp.ok) ? "sent" : "failed",
            sent_at: new Date().toISOString(),
            error_msg: result.message || null,
          }).then(() => {});
        }
      } catch {
        failCount++;
      }
      setSentCount(i + 1);
      if (i < toSend.length - 1) await new Promise(res => setTimeout(res, 1200));
    }

    // Update campaign status
    if (campaignId) {
      await (supabase as any).from("wa_broadcast_campaigns").update({
        status: "done",
        sent_at: new Date().toISOString(),
        success_count: successCount,
        fail_count: failCount,
      }).eq("id", campaignId);
    }

    setSending(false);
    qc.invalidateQueries({ queryKey: ["broadcast-campaigns"] });

    if (failCount === 0) {
      toast.success(`✅ ${successCount} pesan WA berhasil dikirim`);
    } else if (successCount > 0) {
      toast.success(`${successCount} berhasil, ${failCount} gagal`);
    } else {
      toast.error("Semua pesan gagal. Pastikan Provider WA sudah dikonfigurasi.");
    }
  }

  async function handleSchedule() {
    if (!scheduledAt) { toast.error("Pilih waktu penjadwalan"); return; }
    try {
      await saveCampaign.mutateAsync("scheduled");
      qc.invalidateQueries({ queryKey: ["broadcast-campaigns"] });
      toast.success("Kampanye dijadwalkan");
      setTab("histori");
    } catch (e: any) {
      toast.error("Gagal menyimpan jadwal: " + e.message);
    }
  }

  // ── Campaign history ────────────────────────────────────────────────────────
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
    queryKey: ["broadcast-campaigns"],
    enabled: tab === "histori",
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("wa_broadcast_campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      return (data || []) as any[];
    },
  });

  // ── Campaign log detail ────────────────────────────────────────────────────
  const { data: campaignLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["broadcast-logs", logsOpenId],
    enabled: !!logsOpenId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("wa_broadcast_logs")
        .select(`
          id, phone, message, status, sent_at, error_msg, created_at,
          booking:bookings(id, booking_code, customer:profiles(full_name))
        `)
        .eq("campaign_id", logsOpenId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []).map((l: any) => ({
        id:          l.id,
        phone:       l.phone  || "-",
        message:     l.message || "",
        status:      l.status as "queued" | "sent" | "failed",
        sentAt:      l.sent_at,
        errorMsg:    l.error_msg,
        bookingCode: l.booking?.booking_code || "-",
        fullName:    l.booking?.customer?.full_name || "-",
      }));
    },
  });

  // Derived log stats + filtered rows
  const logStats = useMemo(() => {
    const sent   = campaignLogs.filter((l: any) => l.status === "sent").length;
    const failed = campaignLogs.filter((l: any) => l.status === "failed").length;
    const queued = campaignLogs.filter((l: any) => l.status === "queued").length;
    return { sent, failed, queued, total: campaignLogs.length };
  }, [campaignLogs]);

  const filteredLogs = useMemo(() => {
    return campaignLogs.filter((l: any) => {
      if (logsFilter !== "all" && l.status !== logsFilter) return false;
      if (logsSearch) {
        const q = logsSearch.toLowerCase();
        return l.fullName.toLowerCase().includes(q) ||
               l.phone.toLowerCase().includes(q)    ||
               l.bookingCode.toLowerCase().includes(q);
      }
      return true;
    });
  }, [campaignLogs, logsFilter, logsSearch]);

  function downloadLogsCSV(campaignName: string) {
    const rows = [
      ["No", "Nama", "Kode Booking", "Nomor HP", "Status", "Waktu Kirim", "Error"],
      ...campaignLogs.map((l: any, i: number) => [
        i + 1,
        l.fullName,
        l.bookingCode,
        l.phone,
        l.status,
        l.sentAt ? format(parseISO(l.sentAt), "dd/MM/yyyy HH:mm:ss") : "-",
        l.errorMsg || "",
      ]),
    ];
    const csv  = rows.map(r => r.map((v: any) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `log-broadcast-${campaignName.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">WhatsApp Broadcast</h1>
          <p className="text-muted-foreground">Kirim pesan massal ke jamaah berdasarkan segmentasi</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTab("histori")}>
            <History className="w-4 h-4 mr-2" />
            Histori
          </Button>
          <Button onClick={() => setTab("broadcast")}>
            <Send className="w-4 h-4 mr-2" />
            Buat Baru
          </Button>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="broadcast">Kirim Broadcast</TabsTrigger>
          <TabsTrigger value="histori">Histori Kampanye</TabsTrigger>
        </TabsList>

        <TabsContent value="broadcast" className="space-y-6 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Penerima & Segmentasi</CardTitle>
                  <CardDescription>Pilih filter untuk menentukan siapa yang akan menerima pesan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Paket</label>
                      <div className="flex flex-wrap gap-2 border rounded-md p-2 min-h-[40px]">
                        {packages.map(p => (
                          <Badge 
                            key={p} 
                            variant={selectedPackages.has(p) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleSet(selectedPackages, p, setSelectedPackages)}
                          >
                            {p}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Status Pembayaran</label>
                      <div className="flex flex-wrap gap-2 border rounded-md p-2 min-h-[40px]">
                        {["unpaid", "partial", "paid"].map(s => (
                          <Badge 
                            key={s} 
                            variant={selectedPayStatus.has(s) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleSet(selectedPayStatus, s, setSelectedPayStatus)}
                          >
                            {s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-md">
                    <div className="p-2 bg-muted/50 border-b flex justify-between items-center">
                      <span className="text-sm font-medium">{withPhone.length} Jamaah Terfilter</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          if (selectedRecipients.size === withPhone.length) setSelectedRecipients(new Set());
                          else setSelectedRecipients(new Set(withPhone.map((r: any) => r.id)));
                        }}
                      >
                        {selectedRecipients.size === withPhone.length ? "Unselect All" : "Select All"}
                      </Button>
                    </div>
                    <ScrollArea className="h-[300px]">
                      <div className="p-2 space-y-1">
                        {withPhone.map((r: any) => (
                          <div key={r.id} className="flex items-center gap-3 p-2 hover:bg-muted/30 rounded-md">
                            <Checkbox 
                              checked={selectedRecipients.has(r.id)}
                              onCheckedChange={() => {
                                const next = new Set(selectedRecipients);
                                next.has(r.id) ? next.delete(r.id) : next.add(r.id);
                                setSelectedRecipients(next);
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{r.customer?.full_name}</p>
                              <p className="text-xs text-muted-foreground">{r.customer?.phone_number} · {r.package?.name}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px]">{r.payment_status}</Badge>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pesan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Template</label>
                    <Select value={templateId} onValueChange={handleTemplateChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih template" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATES.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-medium">Isi Pesan</label>
                      <span className="text-[10px] text-muted-foreground">Gunakan [nama], [paket], [kode] untuk personalisasi</span>
                    </div>
                    <textarea 
                      className="w-full min-h-[200px] p-3 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="Tulis pesan Anda di sini..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Aksi</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Nama Kampanye</label>
                    <Input 
                      placeholder="Contoh: Promo Ramadhan 2024" 
                      value={campaignName}
                      onChange={(e) => setCampaignName(e.target.value)}
                    />
                  </div>
                  <div className="p-4 bg-primary/5 rounded-lg border border-primary/10">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Total Penerima</span>
                      <span className="font-bold">{selectedRecipients.size}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Estimasi Waktu</span>
                      <span>~{Math.ceil(selectedRecipients.size * 1.5 / 60)} menit</span>
                    </div>
                  </div>
                  <Button 
                    className="w-full" 
                    size="lg" 
                    disabled={sending || !selectedRecipients.size || !message.trim()}
                    onClick={handleSend}
                  >
                    {sending ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Mengirim ({sentCount}/{totalToSend})
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Kirim Sekarang
                      </>
                    )}
                  </Button>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t"></span></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Atau Jadwalkan</span></div>
                  </div>
                  <div className="space-y-2">
                    <Input 
                      type="datetime-local" 
                      onChange={(e) => setScheduledAt(e.target.value)}
                    />
                    <Button 
                      variant="outline" 
                      className="w-full"
                      disabled={sending || !selectedRecipients.size || !message.trim() || !scheduledAt}
                      onClick={handleSchedule}
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Jadwalkan
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {sending && (
                <Card className="border-primary">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Progress Pengiriman</span>
                      <span className="text-sm font-bold">{Math.round((sentCount / totalToSend) * 100)}%</span>
                    </div>
                    <Progress value={(sentCount / totalToSend) * 100} className="h-2" />
                    <p className="text-[10px] text-center text-muted-foreground">
                      Jangan tutup halaman ini selama proses pengiriman berlangsung.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="histori" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Nama Kampanye</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Target</th>
                      <th className="text-left p-4 font-medium">Berhasil/Gagal</th>
                      <th className="text-left p-4 font-medium">Waktu</th>
                      <th className="text-right p-4 font-medium">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {campaigns.map((c: any) => (
                      <tr key={c.id} className="hover:bg-muted/20">
                        <td className="p-4 font-medium">{c.name}</td>
                        <td className="p-4">
                          <Badge variant={c.status === 'done' ? 'default' : c.status === 'scheduled' ? 'outline' : 'secondary'}>
                            {c.status}
                          </Badge>
                        </td>
                        <td className="p-4">{c.total_recipients}</td>
                        <td className="p-4 text-xs">
                          <span className="text-green-600 font-bold">{c.success_count || 0}</span> / <span className="text-red-600 font-bold">{c.fail_count || 0}</span>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {c.sent_at ? format(parseISO(c.sent_at), "dd/MM/yyyy HH:mm") : "-"}
                        </td>
                        <td className="p-4 text-right">
                          <Button variant="ghost" size="sm" onClick={() => setLogsOpenId(c.id)}>
                            <Eye className="w-4 h-4 mr-1" /> Detail
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {campaigns.length === 0 && !campaignsLoading && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">Belum ada histori kampanye</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Log Detail Dialog */}
      <Dialog open={!!logsOpenId} onOpenChange={(open) => !open && setLogsOpenId(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Detail Log Broadcast</DialogTitle>
            <DialogDescription>
              Riwayat pengiriman pesan untuk kampanye ini
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="p-3 border rounded-lg bg-muted/30">
              <p className="text-[10px] uppercase text-muted-foreground font-bold">Total</p>
              <p className="text-xl font-bold">{logStats.total}</p>
            </div>
            <div className="p-3 border rounded-lg bg-green-50 border-green-100">
              <p className="text-[10px] uppercase text-green-600 font-bold">Berhasil</p>
              <p className="text-xl font-bold text-green-700">{logStats.sent}</p>
            </div>
            <div className="p-3 border rounded-lg bg-red-50 border-red-100">
              <p className="text-[10px] uppercase text-red-600 font-bold">Gagal</p>
              <p className="text-xl font-bold text-red-700">{logStats.failed}</p>
            </div>
            <div className="p-3 border rounded-lg bg-blue-50 border-blue-100">
              <p className="text-[10px] uppercase text-blue-600 font-bold">Antrean</p>
              <p className="text-xl font-bold text-blue-700">{logStats.queued}</p>
            </div>
          </div>

          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Cari nama, nomor, atau kode booking..." 
                className="pl-9"
                value={logsSearch}
                onChange={(e) => setLogsSearch(e.target.value)}
              />
            </div>
            <Select value={logsFilter} onValueChange={(v: any) => setLogsFilter(v)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="sent">Berhasil</SelectItem>
                <SelectItem value="failed">Gagal</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => downloadLogsCSV(campaigns.find((c: any) => c.id === logsOpenId)?.name || "log")}>
              <Download className="w-4 h-4 mr-2" /> Export CSV
            </Button>
          </div>

          <div className="flex-1 overflow-hidden border rounded-md">
            <ScrollArea className="h-full">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium">Jamaah</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Waktu</th>
                    <th className="text-left p-3 font-medium">Pesan</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map((l: any) => (
                    <tr key={l.id} className="hover:bg-muted/10">
                      <td className="p-3">
                        <p className="font-medium">{l.fullName}</p>
                        <p className="text-[10px] text-muted-foreground">{l.phone} · {l.bookingCode}</p>
                      </td>
                      <td className="p-3">
                        {l.status === 'sent' ? (
                          <Badge variant="default" className="text-[10px]">Sent</Badge>
                        ) : l.status === 'failed' ? (
                          <div className="space-y-1">
                            <Badge variant="destructive" className="text-[10px]">Failed</Badge>
                            {l.errorMsg && <p className="text-[9px] text-red-500 max-w-[150px] truncate">{l.errorMsg}</p>}
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">Queued</Badge>
                        )}
                      </td>
                      <td className="p-3 text-[10px] text-muted-foreground whitespace-nowrap">
                        {l.sentAt ? format(parseISO(l.sentAt), "dd/MM HH:mm:ss") : "-"}
                      </td>
                      <td className="p-3">
                        <p className="text-[10px] text-muted-foreground line-clamp-2 max-w-[200px] italic">"{l.message}"</p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </ScrollArea>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setLogsOpenId(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
