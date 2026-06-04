import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Bell, MessageCircle, CheckCircle2, Clock, RefreshCcw,
  Send, Users, AlertTriangle, Search, Filter, XCircle,
  CalendarClock, TrendingUp, ChevronDown
} from "lucide-react";
import { format, differenceInDays, parseISO, isPast, isWithinInterval, addDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

const WA_TEMPLATE = `Assalamu'alaikum *{nama}*,

⏰ *Pengingat Pelunasan Biaya Umroh/Haji*

Kami mengingatkan bahwa batas waktu pelunasan booking Anda *{kode}* akan jatuh tempo dalam *{hari} hari*, yaitu pada *{tanggal}*.

💰 Sisa Pembayaran: *{sisa}*

Mohon segera melakukan pelunasan agar keberangkatan Anda tidak terganggu.

Transfer ke rekening yang tertera di kontrak atau hubungi kami:
📱 WhatsApp: {wa_admin}

Barakallahu fiikum 🤲
_Tim Vinstour Travel_`;

type Reminder = {
  id: string;
  booking_id: string;
  booking_code: string;
  phone: string;
  full_name: string | null;
  payment_deadline: string | null;
  remaining_amount: number | null;
  days_before: number;
  status: "pending" | "sent" | "cancelled";
  sent_at: string | null;
  created_at: string;
};

type FilterStatus = "all" | "pending" | "sent" | "cancelled" | "overdue";
type BulkWindow = "3" | "7" | "14" | "30";

function StatusBadge({ status, isOverdue }: { status: Reminder["status"]; isOverdue?: boolean }) {
  if (isOverdue && status === "pending") {
    return <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">Lewat Deadline</Badge>;
  }
  if (status === "pending") return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Pending</Badge>;
  if (status === "sent") return <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Terkirim</Badge>;
  return <Badge variant="secondary" className="text-xs">Dibatalkan</Badge>;
}

export default function AdminLaporanReminder() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [bulkWindow, setBulkWindow] = useState<BulkWindow>("7");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [isBulkSending, setIsBulkSending] = useState(false);

  const { data: waConfig } = useQuery({
    queryKey: ["wa-config"],
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_config").select("*").eq("is_active", true).maybeSingle();
      return data;
    },
  });

  const { data: reminders = [], isLoading, refetch } = useQuery({
    queryKey: ["laporan-reminder-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_deadline_reminders")
        .select("*")
        .order("payment_deadline", { ascending: true });
      if (error) throw error;
      return (data || []) as Reminder[];
    },
  });

  const markSentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_deadline_reminders")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laporan-reminder-all"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("payment_deadline_reminders")
        .update({ status: "cancelled" })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pengingat dibatalkan");
      setSelectedIds(new Set());
      queryClient.invalidateQueries({ queryKey: ["laporan-reminder-all"] });
    },
  });

  function buildMessage(r: Reminder): string {
    const daysLeft = r.payment_deadline
      ? differenceInDays(parseISO(r.payment_deadline), new Date())
      : r.days_before;
    return WA_TEMPLATE
      .replace(/{nama}/g, r.full_name || "Bapak/Ibu")
      .replace(/{kode}/g, r.booking_code)
      .replace(/{hari}/g, Math.max(0, daysLeft).toString())
      .replace(/{tanggal}/g, r.payment_deadline
        ? format(parseISO(r.payment_deadline), "dd MMMM yyyy", { locale: idLocale }) : "-")
      .replace(/{sisa}/g, r.remaining_amount ? formatCurrency(r.remaining_amount) : "-")
      .replace(/{wa_admin}/g, waConfig?.sender_number || "—");
  }

  async function sendOne(r: Reminder) {
    setSendingIds(prev => new Set(prev).add(r.id));
    try {
      const resp = await fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: r.phone, message: buildMessage(r) }),
      });
      const result = await resp.json();
      if (result.success) {
        await markSentMutation.mutateAsync(r.id);
        toast.success(`Reminder dikirim ke ${r.full_name || r.phone}`);
      } else {
        toast.error("Gagal kirim: " + (result.error || result.message));
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setSendingIds(prev => { const s = new Set(prev); s.delete(r.id); return s; });
    }
  }

  async function sendBulkSelected() {
    const targets = reminders.filter(r => selectedIds.has(r.id) && r.status === "pending");
    if (targets.length === 0) { toast.info("Pilih pengingat pending terlebih dahulu"); return; }
    setIsBulkSending(true);
    let ok = 0, fail = 0;
    for (const r of targets) {
      try {
        const resp = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: r.phone, message: buildMessage(r) }),
        });
        const res = await resp.json();
        if (res.success) { await markSentMutation.mutateAsync(r.id); ok++; } else { fail++; }
      } catch { fail++; }
      await new Promise(res => setTimeout(res, 1200));
    }
    setIsBulkSending(false);
    setSelectedIds(new Set());
    toast.success(`Selesai: ${ok} terkirim, ${fail} gagal`);
  }

  async function sendApproaching() {
    const days = parseInt(bulkWindow);
    const now = new Date();
    const limit = addDays(now, days);
    const targets = reminders.filter(r =>
      r.status === "pending" &&
      r.payment_deadline &&
      isWithinInterval(parseISO(r.payment_deadline), { start: now, end: limit })
    );
    if (targets.length === 0) { toast.info(`Tidak ada booking jatuh tempo dalam ${days} hari ke depan`); return; }
    setIsBulkSending(true);
    let ok = 0, fail = 0;
    for (const r of targets) {
      try {
        const resp = await fetch("/api/whatsapp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ target: r.phone, message: buildMessage(r) }),
        });
        const res = await resp.json();
        if (res.success) { await markSentMutation.mutateAsync(r.id); ok++; } else { fail++; }
      } catch { fail++; }
      await new Promise(res => setTimeout(res, 1200));
    }
    setIsBulkSending(false);
    toast.success(`Selesai: ${ok} terkirim, ${fail} gagal`);
  }

  // Computed stats
  const stats = useMemo(() => {
    const total = reminders.length;
    const pending = reminders.filter(r => r.status === "pending").length;
    const sent = reminders.filter(r => r.status === "sent").length;
    const cancelled = reminders.filter(r => r.status === "cancelled").length;
    const overduePending = reminders.filter(r =>
      r.status === "pending" && r.payment_deadline && isPast(parseISO(r.payment_deadline))
    ).length;
    const approaching7 = reminders.filter(r =>
      r.status === "pending" && r.payment_deadline &&
      isWithinInterval(parseISO(r.payment_deadline), { start: new Date(), end: addDays(new Date(), 7) })
    ).length;
    return { total, pending, sent, cancelled, overduePending, approaching7 };
  }, [reminders]);

  // Filter logic
  const filtered = useMemo(() => {
    let list = reminders;
    if (filterStatus === "pending") list = list.filter(r => r.status === "pending");
    else if (filterStatus === "sent") list = list.filter(r => r.status === "sent");
    else if (filterStatus === "cancelled") list = list.filter(r => r.status === "cancelled");
    else if (filterStatus === "overdue") list = list.filter(r =>
      r.status === "pending" && r.payment_deadline && isPast(parseISO(r.payment_deadline))
    );
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.full_name?.toLowerCase().includes(q) ||
        r.booking_code.toLowerCase().includes(q) ||
        r.phone.includes(q)
      );
    }
    return list;
  }, [reminders, filterStatus, search]);

  const approachingCount = useMemo(() => {
    const days = parseInt(bulkWindow);
    return reminders.filter(r =>
      r.status === "pending" && r.payment_deadline &&
      isWithinInterval(parseISO(r.payment_deadline), { start: new Date(), end: addDays(new Date(), days) })
    ).length;
  }, [reminders, bulkWindow]);

  const pendingSelected = Array.from(selectedIds).filter(id => {
    const r = reminders.find(x => x.id === id);
    return r?.status === "pending";
  }).length;

  const allFilteredPendingIds = filtered.filter(r => r.status === "pending").map(r => r.id);
  const allPendingSelected = allFilteredPendingIds.length > 0 &&
    allFilteredPendingIds.every(id => selectedIds.has(id));

  function toggleSelectAll() {
    if (allPendingSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allFilteredPendingIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        allFilteredPendingIds.forEach(id => next.add(id));
        return next;
      });
    }
  }

  function getDeadlineUrgency(r: Reminder) {
    if (!r.payment_deadline) return null;
    const days = differenceInDays(parseISO(r.payment_deadline), new Date());
    if (days < 0) return "overdue";
    if (days <= 1) return "urgent";
    if (days <= 7) return "soon";
    return "ok";
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-amber-500" />
            Laporan Reminder
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Semua reminder pembayaran lintas booking — pantau, filter, dan kirim massal
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 self-start">
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total", value: stats.total, color: "blue", icon: <Users className="h-4 w-4 text-blue-600" />, bg: "bg-blue-100" },
          { label: "Pending", value: stats.pending, color: "amber", icon: <Clock className="h-4 w-4 text-amber-600" />, bg: "bg-amber-100" },
          { label: "Lewat Deadline", value: stats.overduePending, color: "red", icon: <AlertTriangle className="h-4 w-4 text-red-600" />, bg: "bg-red-100" },
          { label: "Jatuh Tempo 7H", value: stats.approaching7, color: "orange", icon: <CalendarClock className="h-4 w-4 text-orange-600" />, bg: "bg-orange-100" },
          { label: "Terkirim", value: stats.sent, color: "green", icon: <CheckCircle2 className="h-4 w-4 text-green-600" />, bg: "bg-green-100" },
          { label: "Dibatalkan", value: stats.cancelled, color: "gray", icon: <XCircle className="h-4 w-4 text-gray-500" />, bg: "bg-gray-100" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center", s.bg)}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-xl font-bold">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* WA Warning */}
      {!waConfig && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-semibold">Konfigurasi WhatsApp diperlukan</p>
            <p className="text-xs text-amber-700 mt-0.5">Atur API WhatsApp di <strong>Integrasi → WA Otomatis</strong> untuk mengaktifkan pengiriman.</p>
          </div>
        </div>
      )}

      {/* Bulk Send — Approaching Deadline */}
      <Card className="border-amber-200 bg-amber-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            Kirim Massal — Mendekati Jatuh Tempo
          </CardTitle>
          <CardDescription>
            Kirim WA sekaligus ke semua pending yang jatuh tempo dalam rentang hari tertentu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={bulkWindow} onValueChange={(v) => setBulkWindow(v as BulkWindow)}>
              <SelectTrigger className="w-[180px]">
                <CalendarClock className="h-4 w-4 mr-2 text-amber-600" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">Dalam 3 hari</SelectItem>
                <SelectItem value="7">Dalam 7 hari</SelectItem>
                <SelectItem value="14">Dalam 14 hari</SelectItem>
                <SelectItem value="30">Dalam 30 hari</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={sendApproaching}
              disabled={isBulkSending || approachingCount === 0}
              className="gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isBulkSending ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Kirim {approachingCount} Reminder
            </Button>
            {approachingCount === 0 && (
              <span className="text-sm text-muted-foreground">Tidak ada pending dalam rentang ini</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filter & Search + Bulk Actions */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, kode booking, nomor HP..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={v => { setFilterStatus(v as FilterStatus); setSelectedIds(new Set()); }}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Lewat Deadline</SelectItem>
                <SelectItem value="sent">Terkirim</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>
            {selectedIds.size > 0 && (
              <div className="flex gap-2 items-center">
                <Badge variant="secondary">{selectedIds.size} dipilih</Badge>
                <Button
                  size="sm"
                  className="gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                  disabled={isBulkSending || pendingSelected === 0}
                  onClick={sendBulkSelected}
                >
                  {isBulkSending ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  Kirim ({pendingSelected})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => cancelMutation.mutate(Array.from(selectedIds))}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Batalkan
                </Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setSelectedIds(new Set())}>
                  Hapus Pilihan
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                Daftar Semua Reminder
                <Badge variant="secondary">{filtered.length}</Badge>
              </CardTitle>
              <CardDescription>
                Reminder pembayaran terjadwal dan terkirim dari semua booking
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-muted-foreground">
              <RefreshCcw className="h-6 w-6 animate-spin mr-2" />
              Memuat data...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-medium text-muted-foreground">Belum ada reminder</p>
              <p className="text-sm text-muted-foreground mt-1">
                {filterStatus !== "all" ? "Coba ubah filter status" : "Reminder akan muncul saat jamaah mendaftar via halaman Cek Booking"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allPendingSelected}
                        onCheckedChange={toggleSelectAll}
                        disabled={allFilteredPendingIds.length === 0}
                      />
                    </TableHead>
                    <TableHead>Jamaah</TableHead>
                    <TableHead>Kode Booking</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>Sisa Bayar</TableHead>
                    <TableHead>H-</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dikirim</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => {
                    const urgency = getDeadlineUrgency(r);
                    const daysLeft = r.payment_deadline
                      ? differenceInDays(parseISO(r.payment_deadline), new Date())
                      : null;
                    const isSending = sendingIds.has(r.id);
                    const isSelected = selectedIds.has(r.id);
                    const isOverdue = urgency === "overdue";

                    return (
                      <TableRow
                        key={r.id}
                        className={cn(
                          isSelected && "bg-blue-50/50",
                          !isSelected && urgency === "overdue" && "bg-red-50/40",
                          !isSelected && urgency === "urgent" && "bg-amber-50/40",
                        )}
                      >
                        <TableCell>
                          {r.status === "pending" && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={checked => {
                                setSelectedIds(prev => {
                                  const next = new Set(prev);
                                  if (checked) next.add(r.id); else next.delete(r.id);
                                  return next;
                                });
                              }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{r.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{r.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">
                            {r.booking_code}
                          </code>
                        </TableCell>
                        <TableCell>
                          {r.payment_deadline ? (
                            <div>
                              <p className={cn(
                                "text-sm font-medium",
                                urgency === "overdue" && "text-red-600",
                                urgency === "urgent" && "text-amber-600",
                              )}>
                                {format(parseISO(r.payment_deadline), "d MMM yyyy", { locale: idLocale })}
                              </p>
                              <p className={cn(
                                "text-xs",
                                urgency === "overdue" ? "text-red-500" : "text-muted-foreground"
                              )}>
                                {daysLeft === null ? "" :
                                  daysLeft < 0 ? `Lewat ${Math.abs(daysLeft)} hari` :
                                  daysLeft === 0 ? "Hari ini!" :
                                  `${daysLeft} hari lagi`}
                              </p>
                            </div>
                          ) : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell>
                          {r.remaining_amount
                            ? <span className="text-sm font-semibold text-amber-700">{formatCurrency(r.remaining_amount)}</span>
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">H-{r.days_before}</Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={r.status} isOverdue={isOverdue} />
                        </TableCell>
                        <TableCell>
                          {r.sent_at ? (
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(r.sent_at), "d MMM HH:mm", { locale: idLocale })}
                            </span>
                          ) : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {r.status === "pending" && (
                              <Button
                                size="sm"
                                variant="default"
                                className="h-7 gap-1 bg-green-600 hover:bg-green-700 text-white text-xs"
                                disabled={isSending || isBulkSending}
                                onClick={() => sendOne(r)}
                              >
                                {isSending
                                  ? <RefreshCcw className="h-3 w-3 animate-spin" />
                                  : <MessageCircle className="h-3 w-3" />}
                                Kirim
                              </Button>
                            )}
                            {r.status === "sent" && (
                              <a
                                href={`https://wa.me/${r.phone}?text=${encodeURIComponent(buildMessage(r))}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                                  <MessageCircle className="h-3 w-3" />
                                  Ulang
                                </Button>
                              </a>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Template Preview */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-600" />
            Template Pesan WhatsApp
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans bg-muted/50 rounded-lg p-4">
            {WA_TEMPLATE}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
