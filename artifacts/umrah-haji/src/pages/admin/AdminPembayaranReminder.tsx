import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  Bell, MessageCircle, CheckCircle2, Clock, RefreshCcw,
  Send, Users, AlertTriangle, Search, Filter, Calendar
} from "lucide-react";
import { format, differenceInDays, parseISO, isPast } from "date-fns";
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
  status: 'pending' | 'sent' | 'cancelled';
  sent_at: string | null;
  created_at: string;
};

export default function AdminPembayaranReminder() {
  const queryClient = useQueryClient();
  const [filterStatus, setFilterStatus] = useState<string>("pending");
  const [search, setSearch] = useState("");
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());
  const [sendingAll, setSendingAll] = useState(false);

  const { data: waConfig } = useQuery({
    queryKey: ["wa-config"],
    queryFn: async () => {
      const { data } = await supabase.from("whatsapp_config").select("*").eq("is_active", true).maybeSingle();
      return data;
    },
  });

  const { data: reminders = [], isLoading, refetch } = useQuery({
    queryKey: ["payment-deadline-reminders", filterStatus],
    queryFn: async () => {
      let q = supabase
        .from("payment_deadline_reminders")
        .select("*")
        .order("payment_deadline", { ascending: true });
      if (filterStatus !== "all") q = q.eq("status", filterStatus);
      const { data, error } = await q;
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-deadline-reminders"] }),
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_deadline_reminders")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pengingat dibatalkan");
      queryClient.invalidateQueries({ queryKey: ["payment-deadline-reminders"] });
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
        ? format(parseISO(r.payment_deadline), "dd MMMM yyyy", { locale: idLocale })
        : "-")
      .replace(/{sisa}/g, r.remaining_amount ? formatCurrency(r.remaining_amount) : "-")
      .replace(/{wa_admin}/g, waConfig?.sender_number || "—");
  }

  async function sendReminder(r: Reminder) {
    if (!waConfig?.api_key) { toast.error("Konfigurasi WA belum diatur di menu Integrasi"); return; }
    setSendingIds(prev => new Set(prev).add(r.id));
    try {
      const { sendWhatsAppMessage } = await import("@/lib/whatsapp-notifier");
      const result = await sendWhatsAppMessage({
        token: waConfig.api_key,
        target: r.phone,
        message: buildMessage(r),
      });
      if (result.success) {
        await markSentMutation.mutateAsync(r.id);
        toast.success(`Reminder dikirim ke ${r.full_name || r.phone}`);
      } else {
        toast.error("Gagal kirim: " + result.error);
      }
    } catch (e: any) {
      toast.error("Error: " + e.message);
    } finally {
      setSendingIds(prev => { const s = new Set(prev); s.delete(r.id); return s; });
    }
  }

  async function sendAllPending() {
    const pendingList = reminders.filter(r => r.status === "pending");
    if (pendingList.length === 0) { toast.info("Tidak ada pengingat pending"); return; }
    if (!waConfig?.api_key) { toast.error("Konfigurasi WA belum diatur"); return; }
    setSendingAll(true);
    let ok = 0, fail = 0;
    for (const r of pendingList) {
      try {
        const { sendWhatsAppMessage } = await import("@/lib/whatsapp-notifier");
        const res = await sendWhatsAppMessage({ token: waConfig.api_key, target: r.phone, message: buildMessage(r) });
        if (res.success) { await markSentMutation.mutateAsync(r.id); ok++; } else { fail++; }
      } catch { fail++; }
      await new Promise(res => setTimeout(res, 1200));
    }
    setSendingAll(false);
    toast.success(`Selesai: ${ok} terkirim, ${fail} gagal`);
  }

  const filtered = reminders.filter(r =>
    !search ||
    r.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    r.booking_code.toLowerCase().includes(search.toLowerCase()) ||
    r.phone.includes(search)
  );

  const pendingCount = reminders.filter(r => r.status === "pending").length;
  const overduePending = reminders.filter(r =>
    r.status === "pending" && r.payment_deadline && isPast(parseISO(r.payment_deadline))
  ).length;
  const sentCount = reminders.filter(r => r.status === "sent").length;

  const getDeadlineUrgency = (r: Reminder) => {
    if (!r.payment_deadline) return null;
    const days = differenceInDays(parseISO(r.payment_deadline), new Date());
    if (days < 0) return "overdue";
    if (days <= 1) return "urgent";
    if (days <= r.days_before) return "soon";
    return "ok";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-amber-500" />
            Pengingat Pelunasan
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Permintaan pengingat pelunasan dari jamaah via halaman Cek Booking
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
          {pendingCount > 0 && (
            <Button
              size="sm"
              onClick={sendAllPending}
              disabled={sendingAll || !waConfig?.api_key}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              {sendingAll ? (
                <RefreshCcw className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Kirim Semua Pending ({pendingCount})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overduePending}</p>
                <p className="text-xs text-muted-foreground">Lewat Deadline</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{sentCount}</p>
                <p className="text-xs text-muted-foreground">Terkirim</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{reminders.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!waConfig?.api_key && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-semibold">Konfigurasi WhatsApp diperlukan</p>
            <p className="text-xs text-amber-700 mt-0.5">Atur API key WhatsApp di <strong>Integrasi → WA Otomatis</strong> untuk mengaktifkan pengiriman otomatis.</p>
          </div>
        </div>
      )}

      {/* Filter & Search */}
      <Card>
        <CardContent className="pt-5 pb-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, kode booking, atau nomor HP..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="sent">Terkirim</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Daftar Pengingat
            <Badge variant="secondary" className="ml-2">{filtered.length}</Badge>
          </CardTitle>
          <CardDescription>Permintaan pengingat yang didaftarkan jamaah secara mandiri</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <RefreshCcw className="h-6 w-6 animate-spin mr-2" />
              Memuat data...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Bell className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-medium text-muted-foreground">Belum ada pengingat</p>
              <p className="text-sm text-muted-foreground mt-1">
                Pengingat akan muncul di sini saat jamaah mendaftar via halaman Cek Booking
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jamaah</TableHead>
                    <TableHead>Kode Booking</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Sisa Bayar</TableHead>
                    <TableHead>H-</TableHead>
                    <TableHead>Status</TableHead>
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
                    return (
                      <TableRow
                        key={r.id}
                        className={cn(
                          urgency === "overdue" && "bg-red-50/50",
                          urgency === "urgent" && "bg-amber-50/50",
                        )}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{r.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{r.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{r.booking_code}</code>
                        </TableCell>
                        <TableCell>
                          {r.payment_deadline ? (
                            <div>
                              <p className={cn("text-sm font-medium", urgency === "overdue" && "text-red-600", urgency === "urgent" && "text-amber-600")}>
                                {format(parseISO(r.payment_deadline), "d MMM yyyy", { locale: idLocale })}
                              </p>
                              <p className={cn("text-xs", urgency === "overdue" ? "text-red-500" : "text-muted-foreground")}>
                                {daysLeft === null ? "" : daysLeft < 0 ? `Lewat ${Math.abs(daysLeft)} hari` : daysLeft === 0 ? "Hari ini!" : `${daysLeft} hari lagi`}
                              </p>
                            </div>
                          ) : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>
                        <TableCell>
                          {r.remaining_amount ? (
                            <span className="text-sm font-semibold text-amber-700">{formatCurrency(r.remaining_amount)}</span>
                          ) : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">H-{r.days_before}</Badge>
                        </TableCell>
                        <TableCell>
                          {r.status === "pending" && (
                            <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-xs">Pending</Badge>
                          )}
                          {r.status === "sent" && (
                            <div>
                              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">Terkirim</Badge>
                              {r.sent_at && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {format(new Date(r.sent_at), "d MMM HH:mm", { locale: idLocale })}
                                </p>
                              )}
                            </div>
                          )}
                          {r.status === "cancelled" && (
                            <Badge variant="secondary" className="text-xs">Batal</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {r.status === "pending" && (
                              <>
                                <Button
                                  size="sm"
                                  variant="default"
                                  className="h-8 gap-1.5 bg-green-600 hover:bg-green-700 text-white"
                                  disabled={isSending || !waConfig?.api_key}
                                  onClick={() => sendReminder(r)}
                                >
                                  {isSending ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> : <MessageCircle className="h-3.5 w-3.5" />}
                                  <span className="text-xs">Kirim WA</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 text-xs text-muted-foreground"
                                  onClick={() => cancelMutation.mutate(r.id)}
                                >
                                  Batal
                                </Button>
                              </>
                            )}
                            {r.status === "sent" && (
                              <a
                                href={`https://wa.me/${r.phone}?text=${encodeURIComponent(buildMessage(r))}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                                  <MessageCircle className="h-3.5 w-3.5" />
                                  Kirim Ulang
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
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-green-600" />
            Template Pesan WA
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
