import { useState, useMemo, type ReactNode } from "react";
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
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Bell, MessageCircle, Mail, CheckCircle2, Clock, RefreshCcw,
  Send, Users, AlertTriangle, Search, Filter, XCircle,
  CalendarClock, TrendingUp, Zap, Sparkles, Eye, BellOff,
  ExternalLink,
} from "lucide-react";
import { format, differenceInDays, parseISO, isPast, isWithinInterval, addDays } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const WA_TEMPLATE = `Assalamu'alaikum *{nama}* 🤲

⏰ *Pengingat Pelunasan Biaya Umroh/Haji*

Kami mengingatkan bahwa batas waktu pelunasan booking Anda *{kode}* akan jatuh tempo dalam *{hari} hari*, yaitu pada *{tanggal}*.

💰 Sisa Pembayaran: *{sisa}*

Mohon segera melakukan pelunasan agar keberangkatan Anda tidak terganggu.

Transfer ke rekening yang tertera di kontrak atau hubungi kami:
📱 WhatsApp: {wa_admin}

Barakallahu fiikum 🙏
_Tim Vinstour Travel_`;

const H_OPTIONS = [1, 3, 7, 14, 30] as const;

const CHANNEL_LABELS: Record<string, { label: string; icon: ReactNode; color: string }> = {
  wa:    { label: "WhatsApp", icon: <MessageCircle className="h-3 w-3" />, color: "text-emerald-700" },
  email: { label: "Email",    icon: <Mail className="h-3 w-3" />,          color: "text-blue-700"    },
};

// ─── Types ────────────────────────────────────────────────────────────────────

type ReminderStatus = "pending" | "sent" | "cancelled" | "failed";
type FilterStatus   = "all" | "pending" | "sent" | "cancelled" | "overdue";
type BulkWindow     = "3" | "7" | "14" | "30";

interface FlatReminder {
  id: string;
  booking_id: string;
  booking_code: string;
  phone: string;
  full_name: string | null;
  payment_deadline: string | null;
  remaining_amount: number | null;
  days_before: number;
  channel: "wa" | "email";
  reminder_type: string;
  status: ReminderStatus;
  sent_at: string | null;
  created_at: string;
  message_content: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** "h7_wa" → 7 */
function extractDaysBefore(reminderType: string): number {
  const m = reminderType.match(/^h(\d+)_/);
  return m ? parseInt(m[1], 10) : 0;
}

/** "h7_wa" → "wa" */
function extractChannel(reminderType: string): "wa" | "email" {
  return reminderType.endsWith("_email") ? "email" : "wa";
}

function buildWAMessage(r: FlatReminder, waAdminNum: string): string {
  const daysLeft = r.payment_deadline
    ? Math.max(0, differenceInDays(parseISO(r.payment_deadline), new Date()))
    : r.days_before;
  return WA_TEMPLATE
    .replace(/{nama}/g,    r.full_name || "Bapak/Ibu")
    .replace(/{kode}/g,    r.booking_code)
    .replace(/{hari}/g,    daysLeft.toString())
    .replace(/{tanggal}/g, r.payment_deadline
      ? format(parseISO(r.payment_deadline), "dd MMMM yyyy", { locale: idLocale }) : "-")
    .replace(/{sisa}/g,    r.remaining_amount ? formatCurrency(r.remaining_amount) : "-")
    .replace(/{wa_admin}/g, waAdminNum || "—");
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatusBadge({ status, isOverdue }: { status: ReminderStatus; isOverdue?: boolean }) {
  if (isOverdue && status === "pending")
    return <Badge className="bg-red-100 text-red-800 border-red-200 text-[11px] gap-1"><AlertTriangle className="h-3 w-3" />Lewat Deadline</Badge>;
  if (status === "pending")
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200 text-[11px] gap-1"><Clock className="h-3 w-3" />Pending</Badge>;
  if (status === "sent")
    return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[11px] gap-1"><CheckCircle2 className="h-3 w-3" />Terkirim</Badge>;
  if (status === "failed")
    return <Badge className="bg-red-100 text-red-800 border-red-200 text-[11px] gap-1"><XCircle className="h-3 w-3" />Gagal</Badge>;
  return <Badge variant="secondary" className="text-[11px] gap-1"><BellOff className="h-3 w-3" />Dibatalkan</Badge>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminLaporanReminder() {
  const queryClient = useQueryClient();

  // Filters & selection
  const [filterStatus,  setFilterStatus]  = useState<FilterStatus>("all");
  const [filterChannel, setFilterChannel] = useState<"all" | "wa" | "email">("all");
  const [dateRange,     setDateRange]     = useState<{ from: string; to: string }>({ from: "", to: "" });
  const [search,        setSearch]        = useState("");
  const [bulkWindow,    setBulkWindow]    = useState<BulkWindow>("7");
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());

  // Sending state
  const [sendingIds,    setSendingIds]    = useState<Set<string>>(new Set());
  const [isBulkSending, setIsBulkSending] = useState(false);

  // Auto-schedule state
  const [scheduleWindows, setScheduleWindows] = useState<number[]>([7, 3]);
  const [isScheduling,    setIsScheduling]    = useState(false);
  const [isPreviewing,    setIsPreviewing]    = useState(false);
  const [previewInfo,     setPreviewInfo]     = useState<{ new_count: number; existing_count: number } | null>(null);
  const [scheduleResult,  setScheduleResult]  = useState<{ created: number; skipped: number } | null>(null);

  function toggleWindow(val: number) {
    setScheduleWindows(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
    setPreviewInfo(null);
    setScheduleResult(null);
  }

  // ── WA config ──────────────────────────────────────────────────────────────
  const { data: waConfig } = useQuery({
    queryKey: ["wa-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("whatsapp_config")
        .select("*")
        .eq("is_active", true)
        .maybeSingle();
      return data as { sender_number?: string } | null;
    },
  });

  // ── Main data query — join payment_reminders → bookings → customers ────────
  const { data: reminders = [], isLoading, refetch } = useQuery({
    queryKey: ["laporan-reminder-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_reminders")
        .select(`
          id, booking_id, reminder_type, status, sent_at, created_at, message_content,
          booking:bookings!booking_id(
            booking_code, payment_deadline, total_price, paid_amount, remaining_amount,
            customer:customers!customer_id(full_name, phone)
          )
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;

      return ((data || []) as any[]).map((r): FlatReminder => {
        const bk     = r.booking || {};
        const cust   = bk.customer || {};
        const remain = bk.remaining_amount
          ?? Math.max(0, (bk.total_price || 0) - (bk.paid_amount || 0));
        return {
          id:               r.id,
          booking_id:       r.booking_id,
          booking_code:     bk.booking_code  || "—",
          phone:            cust.phone       || "",
          full_name:        cust.full_name   || null,
          payment_deadline: bk.payment_deadline || null,
          remaining_amount: remain || null,
          days_before:      extractDaysBefore(r.reminder_type),
          channel:          extractChannel(r.reminder_type),
          reminder_type:    r.reminder_type,
          status:           r.status        || "pending",
          sent_at:          r.sent_at       || null,
          created_at:       r.created_at,
          message_content:  r.message_content || null,
        };
      });
    },
  });

  // ── Mark sent mutation ──────────────────────────────────────────────────────
  const markSentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_reminders")
        .update({ status: "sent", sent_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["laporan-reminder-all"] }),
  });

  // ── Cancel mutation ─────────────────────────────────────────────────────────
  const cancelMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("payment_reminders")
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

  // ── Send single reminder ────────────────────────────────────────────────────
  async function sendOne(r: FlatReminder) {
    setSendingIds(prev => new Set(prev).add(r.id));
    try {
      const waAdmin = waConfig?.sender_number || "";
      if (r.channel === "wa") {
        // Try API server first
        try {
          const resp = await fetch("/api/whatsapp/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ target: r.phone, message: buildWAMessage(r, waAdmin) }),
          });
          const result = await resp.json().catch(() => ({}));
          if (result.success) {
            await markSentMutation.mutateAsync(r.id);
            toast.success(`Reminder dikirim ke ${r.full_name || r.phone}`);
            return;
          }
        } catch { /* fallback */ }

        // Fallback: open wa.me
        if (!r.phone) { toast.error("Nomor WhatsApp tidak tersedia"); return; }
        const phone = r.phone.replace(/^0/, "62").replace(/\D/g, "");
        const msg   = encodeURIComponent(buildWAMessage(r, waAdmin));
        window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
        toast.info("Pesan WA dibuka di tab baru — kirim secara manual");
        await markSentMutation.mutateAsync(r.id);

      } else {
        // Email: open mailto
        if (!r.phone) { toast.error("Email tidak tersedia"); return; }
        const subject = encodeURIComponent(`Pengingat Pembayaran Booking ${r.booking_code}`);
        const body    = encodeURIComponent(buildWAMessage(r, waAdmin));
        window.open(`mailto:${r.phone}?subject=${subject}&body=${body}`, "_blank");
        toast.info("Email dibuka di aplikasi mail — kirim secara manual");
        await markSentMutation.mutateAsync(r.id);
      }
    } finally {
      setSendingIds(prev => { const s = new Set(prev); s.delete(r.id); return s; });
    }
  }

  // ── Bulk send selected ──────────────────────────────────────────────────────
  async function sendBulkSelected() {
    const targets = reminders.filter(r => selectedIds.has(r.id) && r.status === "pending");
    if (!targets.length) { toast.info("Pilih pengingat pending terlebih dahulu"); return; }
    setIsBulkSending(true);
    let ok = 0, fail = 0;
    for (const r of targets) {
      try { await sendOne(r); ok++; } catch { fail++; }
      await new Promise(res => setTimeout(res, 800));
    }
    setIsBulkSending(false);
    setSelectedIds(new Set());
    toast.success(`Selesai: ${ok} terkirim, ${fail} gagal`);
  }

  // ── Bulk send — approaching deadline ───────────────────────────────────────
  async function sendApproaching() {
    const days   = parseInt(bulkWindow);
    const now    = new Date();
    const limit  = addDays(now, days);
    const targets = reminders.filter(r =>
      r.status === "pending" &&
      r.channel === "wa" &&
      r.payment_deadline &&
      isWithinInterval(parseISO(r.payment_deadline), { start: now, end: limit })
    );
    if (!targets.length) { toast.info(`Tidak ada booking jatuh tempo dalam ${days} hari ke depan`); return; }
    setIsBulkSending(true);
    let ok = 0, fail = 0;
    for (const r of targets) {
      try { await sendOne(r); ok++; } catch { fail++; }
      await new Promise(res => setTimeout(res, 800));
    }
    setIsBulkSending(false);
    toast.success(`Selesai: ${ok} terkirim, ${fail} gagal`);
  }

  // ── Auto-schedule (preview) ─────────────────────────────────────────────────
  async function previewAutoSchedule() {
    if (!scheduleWindows.length) { toast.info("Pilih minimal satu H- interval"); return; }
    setIsPreviewing(true);
    setPreviewInfo(null);
    try {
      // Fetch unpaid bookings with payment_deadline
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select("id, booking_code, payment_deadline, payment_status")
        .in("payment_status", ["pending", "partial"])
        .not("payment_deadline", "is", null);
      if (error) throw error;

      // Fetch existing pending reminders for these bookings
      const bkIds = (bookings || []).map((b: any) => b.id);
      if (!bkIds.length) { setPreviewInfo({ new_count: 0, existing_count: 0 }); return; }

      const { data: existing } = await supabase
        .from("payment_reminders")
        .select("booking_id, reminder_type")
        .in("booking_id", bkIds)
        .in("status", ["pending", "sent"]);

      const existSet = new Set(
        (existing || []).map((r: any) => `${r.booking_id}_${r.reminder_type}`)
      );

      let newCount = 0, existingCount = 0;
      for (const bk of (bookings || []) as any[]) {
        for (const days of scheduleWindows) {
          const key = `${bk.id}_h${days}_wa`;
          if (existSet.has(key)) existingCount++; else newCount++;
          const keyEmail = `${bk.id}_h${days}_email`;
          if (existSet.has(keyEmail)) existingCount++;
        }
      }
      setPreviewInfo({ new_count: newCount, existing_count: existingCount });
    } catch (e: any) {
      toast.error("Gagal preview: " + e.message);
    } finally {
      setIsPreviewing(false);
    }
  }

  // ── Auto-schedule (run) ─────────────────────────────────────────────────────
  async function runAutoSchedule() {
    if (!scheduleWindows.length) { toast.info("Pilih minimal satu H- interval"); return; }
    setIsScheduling(true);
    setScheduleResult(null);
    try {
      // Fetch unpaid bookings
      const { data: bookings, error: bkErr } = await supabase
        .from("bookings")
        .select(`
          id, booking_code, payment_deadline, payment_status,
          total_price, paid_amount, remaining_amount,
          customer:customers!customer_id(full_name, phone)
        `)
        .in("payment_status", ["pending", "partial"])
        .not("payment_deadline", "is", null);
      if (bkErr) throw bkErr;

      const bkIds = (bookings || []).map((b: any) => b.id);
      if (!bkIds.length) {
        setScheduleResult({ created: 0, skipped: 0 });
        toast.info("Tidak ada booking belum lunas yang memerlukan reminder");
        return;
      }

      // Fetch existing reminders
      const { data: existing } = await supabase
        .from("payment_reminders")
        .select("booking_id, reminder_type")
        .in("booking_id", bkIds)
        .in("status", ["pending", "sent"]);

      const existSet = new Set(
        (existing || []).map((r: any) => `${r.booking_id}_${r.reminder_type}`)
      );

      const toInsert: any[] = [];
      let skipped = 0;

      for (const bk of (bookings || []) as any[]) {
        const deadline = parseISO(bk.payment_deadline);
        const customer = bk.customer || {};
        const remain   = bk.remaining_amount
          ?? Math.max(0, (bk.total_price || 0) - (bk.paid_amount || 0));
        const daysLeft = differenceInDays(deadline, new Date());

        for (const days of scheduleWindows) {
          const scheduledAt = addDays(deadline, -days);
          const waMsg = WA_TEMPLATE
            .replace(/{nama}/g,    customer.full_name || "Bapak/Ibu")
            .replace(/{kode}/g,    bk.booking_code)
            .replace(/{hari}/g,    Math.max(0, daysLeft).toString())
            .replace(/{tanggal}/g, format(deadline, "dd MMMM yyyy", { locale: idLocale }))
            .replace(/{sisa}/g,    remain ? formatCurrency(remain) : "-")
            .replace(/{wa_admin}/g, waConfig?.sender_number || "—");

          const waKey    = `${bk.id}_h${days}_wa`;
          const emailKey = `${bk.id}_h${days}_email`;

          if (!existSet.has(waKey)) {
            toInsert.push({
              booking_id:      bk.id,
              reminder_type:   `h${days}_wa`,
              scheduled_at:    scheduledAt.toISOString(),
              status:          "pending",
              message_content: waMsg,
            });
          } else skipped++;

          if (!existSet.has(emailKey)) {
            toInsert.push({
              booking_id:      bk.id,
              reminder_type:   `h${days}_email`,
              scheduled_at:    scheduledAt.toISOString(),
              status:          "pending",
              message_content: waMsg,
            });
          } else skipped++;
        }
      }

      if (toInsert.length) {
        const { error: insErr } = await supabase
          .from("payment_reminders")
          .insert(toInsert);
        if (insErr) throw insErr;
      }

      const result = { created: toInsert.length, skipped };
      setScheduleResult(result);
      setPreviewInfo(null);
      toast.success(`Auto-jadwal selesai: ${result.created} dibuat, ${result.skipped} dilewati`);
      queryClient.invalidateQueries({ queryKey: ["laporan-reminder-all"] });
    } catch (e: any) {
      toast.error("Gagal menjadwalkan: " + e.message);
    } finally {
      setIsScheduling(false);
    }
  }

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total        = reminders.length;
    const pending      = reminders.filter(r => r.status === "pending").length;
    const sent         = reminders.filter(r => r.status === "sent").length;
    const cancelled    = reminders.filter(r => r.status === "cancelled").length;
    const overdue      = reminders.filter(r =>
      r.status === "pending" && r.payment_deadline && isPast(parseISO(r.payment_deadline))
    ).length;
    const approaching7 = reminders.filter(r =>
      r.status === "pending" &&
      r.payment_deadline &&
      isWithinInterval(parseISO(r.payment_deadline), { start: new Date(), end: addDays(new Date(), 7) })
    ).length;
    return { total, pending, sent, cancelled, overdue, approaching7 };
  }, [reminders]);

  // ── Filtered list ───────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = reminders;
    if (filterStatus === "pending")   list = list.filter(r => r.status === "pending");
    if (filterStatus === "sent")      list = list.filter(r => r.status === "sent");
    if (filterStatus === "cancelled") list = list.filter(r => r.status === "cancelled");
    if (filterStatus === "overdue")   list = list.filter(r =>
      r.status === "pending" && r.payment_deadline && isPast(parseISO(r.payment_deadline))
    );
    if (filterChannel !== "all") list = list.filter(r => r.channel === filterChannel);
    if (dateRange.from) {
      list = list.filter(r => r.payment_deadline && r.payment_deadline >= dateRange.from);
    }
    if (dateRange.to) {
      list = list.filter(r => r.payment_deadline && r.payment_deadline <= dateRange.to);
    }
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(r =>
        r.full_name?.toLowerCase().includes(q) ||
        r.booking_code.toLowerCase().includes(q) ||
        r.phone.includes(q)
      );
    }
    return list;
  }, [reminders, filterStatus, filterChannel, search]);

  const approachingCount = useMemo(() => {
    const days = parseInt(bulkWindow);
    return reminders.filter(r =>
      r.status === "pending" &&
      r.channel === "wa" &&
      r.payment_deadline &&
      isWithinInterval(parseISO(r.payment_deadline), { start: new Date(), end: addDays(new Date(), days) })
    ).length;
  }, [reminders, bulkWindow]);

  // ── Selection helpers ────────────────────────────────────────────────────────
  const pendingSelected          = Array.from(selectedIds).filter(id => reminders.find(r => r.id === id)?.status === "pending").length;
  const allFilteredPendingIds    = filtered.filter(r => r.status === "pending").map(r => r.id);
  const allPendingSelected       = allFilteredPendingIds.length > 0 && allFilteredPendingIds.every(id => selectedIds.has(id));

  function toggleSelectAll() {
    if (allPendingSelected) {
      setSelectedIds(prev => { const n = new Set(prev); allFilteredPendingIds.forEach(id => n.delete(id)); return n; });
    } else {
      setSelectedIds(prev => { const n = new Set(prev); allFilteredPendingIds.forEach(id => n.add(id)); return n; });
    }
  }

  function getUrgency(r: FlatReminder) {
    if (!r.payment_deadline) return null;
    const days = differenceInDays(parseISO(r.payment_deadline), new Date());
    if (days < 0) return "overdue";
    if (days <= 1) return "urgent";
    if (days <= 7) return "soon";
    return "ok";
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-amber-500" />
            Laporan Reminder Pembayaran
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Semua pengingat pembayaran lintas booking — pantau, filter, dan kirim massal
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 self-start">
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total",          value: stats.total,        icon: <Users          className="h-4 w-4 text-blue-600"   />, bg: "bg-blue-100"   },
          { label: "Pending",        value: stats.pending,      icon: <Clock          className="h-4 w-4 text-amber-600"  />, bg: "bg-amber-100"  },
          { label: "Lewat Deadline", value: stats.overdue,      icon: <AlertTriangle  className="h-4 w-4 text-red-600"    />, bg: "bg-red-100"    },
          { label: "Jatuh Tempo 7H", value: stats.approaching7, icon: <CalendarClock  className="h-4 w-4 text-orange-600" />, bg: "bg-orange-100" },
          { label: "Terkirim",       value: stats.sent,         icon: <CheckCircle2   className="h-4 w-4 text-emerald-600"/>, bg: "bg-emerald-100"},
          { label: "Dibatalkan",     value: stats.cancelled,    icon: <XCircle        className="h-4 w-4 text-gray-500"   />, bg: "bg-gray-100"   },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center gap-2">
                <div className={cn("w-8 h-8 rounded-full flex items-center justify-center shrink-0", s.bg)}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-xl font-bold leading-tight">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── WA config warning ──────────────────────────────────────────────── */}
      {!waConfig && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-500" />
          <div>
            <p className="font-semibold">Konfigurasi WhatsApp belum aktif</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Atur API WA di <strong>Pengaturan → Integrasi → WA Otomatis</strong> agar pengiriman otomatis berfungsi.
              Sementara ini, tombol Kirim akan membuka <strong>wa.me</strong> secara manual.
            </p>
          </div>
        </div>
      )}

      {/* ── Auto-schedule ──────────────────────────────────────────────────── */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-blue-600" />
            Auto-Jadwalkan Reminder
          </CardTitle>
          <CardDescription>
            Buat baris reminder otomatis untuk semua booking belum lunas yang mendekati jatuh tempo.
            Reminder yang sudah ada (pending/terkirim) dilewati otomatis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* H- selector */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
              Pilih interval H- yang akan dijadwalkan:
            </Label>
            <div className="flex flex-wrap gap-2">
              {H_OPTIONS.map(val => {
                const active = scheduleWindows.includes(val);
                const label  = val === 1 ? "H-1" : val === 3 ? "H-3" : val === 7 ? "H-7" : val === 14 ? "H-14" : "H-30";
                const desc   = val === 1 ? "Besok" : val === 3 ? "3 hari" : val === 7 ? "1 minggu" : val === 14 ? "2 minggu" : "1 bulan";
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => toggleWindow(val)}
                    className={cn(
                      "flex flex-col items-center justify-center w-16 h-14 rounded-lg border-2 text-xs font-semibold transition-all",
                      active
                        ? "border-blue-500 bg-blue-100 text-blue-700"
                        : "border-border bg-background text-muted-foreground hover:border-blue-300"
                    )}
                  >
                    <span className="text-sm font-bold">{label}</span>
                    <span className="text-[10px] font-normal">{desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview result */}
          {previewInfo && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-white border border-blue-100 text-sm">
              <Sparkles className="h-4 w-4 text-blue-500 shrink-0" />
              <div className="flex flex-wrap gap-4">
                <span>
                  <strong className="text-blue-700">{previewInfo.new_count}</strong>
                  <span className="text-muted-foreground ml-1">reminder baru akan dibuat</span>
                </span>
                <span className="text-muted-foreground">·</span>
                <span>
                  <strong className="text-gray-500">{previewInfo.existing_count}</strong>
                  <span className="text-muted-foreground ml-1">sudah ada (akan dilewati)</span>
                </span>
              </div>
            </div>
          )}

          {/* Schedule result */}
          {scheduleResult && (
            <div className="flex items-center gap-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <div className="flex flex-wrap gap-4">
                <span>
                  <strong className="text-emerald-700">{scheduleResult.created}</strong>
                  <span className="text-muted-foreground ml-1">reminder dibuat</span>
                </span>
                <span className="text-muted-foreground">·</span>
                <span>
                  <strong className="text-gray-500">{scheduleResult.skipped}</strong>
                  <span className="text-muted-foreground ml-1">dilewati (sudah ada)</span>
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={previewAutoSchedule}
              disabled={isPreviewing || isScheduling || !scheduleWindows.length}
              className="gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
            >
              {isPreviewing
                ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                : <Eye className="h-3.5 w-3.5" />}
              Preview
            </Button>
            <Button
              size="sm"
              onClick={runAutoSchedule}
              disabled={isScheduling || isPreviewing || !scheduleWindows.length}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isScheduling
                ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                : <Zap className="h-3.5 w-3.5" />}
              Jadwalkan Sekarang
              {scheduleWindows.length > 0 && (
                <span className="opacity-75 font-normal">
                  ({scheduleWindows.sort((a, b) => b - a).map(v => `H-${v}`).join(", ")})
                </span>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Bulk send — approaching deadline ───────────────────────────────── */}
      <Card className="border-amber-200 bg-amber-50/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-amber-600" />
            Kirim Massal — Mendekati Jatuh Tempo
          </CardTitle>
          <CardDescription>
            Kirim WA sekaligus ke semua reminder pending yang jatuh temponya dalam rentang hari tertentu
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <Select value={bulkWindow} onValueChange={v => setBulkWindow(v as BulkWindow)}>
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
              {isBulkSending
                ? <RefreshCcw className="h-4 w-4 animate-spin" />
                : <Send className="h-4 w-4" />}
              Kirim {approachingCount} Reminder WA
            </Button>
            {approachingCount === 0 && (
              <span className="text-sm text-muted-foreground">Tidak ada pending WA dalam rentang ini</span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Filter & Search ─────────────────────────────────────────────────── */}
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
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="overdue">Lewat Deadline</SelectItem>
                <SelectItem value="sent">Terkirim</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterChannel} onValueChange={v => setFilterChannel(v as any)}>
              <SelectTrigger className="w-[140px]">
                <Bell className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Channel</SelectItem>
                <SelectItem value="wa">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
              <Input
                type="date"
                className="w-[150px]"
                value={dateRange.from}
                onChange={e => setDateRange(prev => ({ ...prev, from: e.target.value }))}
              />
              <span className="text-muted-foreground">s/d</span>
              <Input
                type="date"
                className="w-[150px]"
                value={dateRange.to}
                onChange={e => setDateRange(prev => ({ ...prev, to: e.target.value }))}
              />
              {(dateRange.from || dateRange.to) && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDateRange({ from: "", to: "" })}
                  className="h-8 px-2 text-muted-foreground"
                >
                  Reset
                </Button>
              )}
            </div>

            {selectedIds.size > 0 && (
              <div className="flex gap-2 items-center flex-wrap">
                <Badge variant="secondary">{selectedIds.size} dipilih</Badge>
                <Button
                  size="sm"
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={isBulkSending || pendingSelected === 0}
                  onClick={sendBulkSelected}
                >
                  {isBulkSending
                    ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                    : <Send className="h-3.5 w-3.5" />}
                  Kirim ({pendingSelected})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => cancelMutation.mutate(Array.from(selectedIds))}
                  disabled={cancelMutation.isPending}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Batalkan
                </Button>
                <Button size="sm" variant="ghost" className="text-xs" onClick={() => setSelectedIds(new Set())}>
                  Batal Pilih
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Main Table ─────────────────────────────────────────────────────── */}
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
              <p className="font-semibold text-muted-foreground">Belum ada reminder</p>
              <p className="text-sm text-muted-foreground mt-1">
                {filterStatus !== "all" || filterChannel !== "all" || search
                  ? "Coba ubah filter atau hapus pencarian"
                  : "Gunakan Auto-Jadwalkan di atas untuk membuat reminder massal"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 pl-4">
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
                    <TableHead>Channel</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dikirim</TableHead>
                    <TableHead className="text-right pr-4">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(r => {
                    const urgency    = getUrgency(r);
                    const daysLeft   = r.payment_deadline
                      ? differenceInDays(parseISO(r.payment_deadline), new Date())
                      : null;
                    const isSending_ = sendingIds.has(r.id);
                    const isSelected = selectedIds.has(r.id);
                    const isOverdue  = urgency === "overdue";
                    const ch         = CHANNEL_LABELS[r.channel];

                    return (
                      <TableRow
                        key={r.id}
                        className={cn(
                          "transition-colors",
                          isSelected && "bg-blue-50/50 dark:bg-blue-950/20",
                          !isSelected && urgency === "overdue" && "bg-red-50/40 dark:bg-red-950/10",
                          !isSelected && urgency === "urgent"  && "bg-amber-50/40 dark:bg-amber-950/10",
                        )}
                      >
                        <TableCell className="pl-4">
                          {r.status === "pending" && (
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={checked => {
                                setSelectedIds(prev => {
                                  const next = new Set(prev);
                                  checked ? next.add(r.id) : next.delete(r.id);
                                  return next;
                                });
                              }}
                            />
                          )}
                        </TableCell>

                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{r.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{r.phone || "—"}</p>
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
                                urgency === "urgent"  && "text-amber-600",
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
                            : <span className="text-muted-foreground text-sm">—</span>}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline" className="text-xs font-bold">
                            H-{r.days_before}
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <span className={cn("flex items-center gap-1 text-xs font-medium", ch?.color)}>
                            {ch?.icon}
                            {ch?.label}
                          </span>
                        </TableCell>

                        <TableCell>
                          <StatusBadge status={r.status} isOverdue={isOverdue} />
                        </TableCell>

                        <TableCell>
                          {r.sent_at
                            ? <span className="text-xs text-muted-foreground">
                                {format(new Date(r.sent_at), "d MMM HH:mm", { locale: idLocale })}
                              </span>
                            : <span className="text-xs text-muted-foreground">—</span>}
                        </TableCell>

                        <TableCell className="text-right pr-4">
                          <div className="flex gap-1 justify-end">
                            {r.status === "pending" && r.channel === "wa" && (
                              <Button
                                size="sm"
                                className="h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                                disabled={isSending_ || isBulkSending}
                                onClick={() => sendOne(r)}
                              >
                                {isSending_
                                  ? <RefreshCcw className="h-3 w-3 animate-spin" />
                                  : <MessageCircle className="h-3 w-3" />}
                                Kirim WA
                              </Button>
                            )}
                            {r.status === "sent" && r.channel === "wa" && r.phone && (
                              <a
                                href={`https://wa.me/${r.phone.replace(/^0/, "62").replace(/\D/g, "")}?text=${encodeURIComponent(buildWAMessage(r, waConfig?.sender_number || ""))}`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                <Button size="sm" variant="outline" className="h-7 gap-1 text-xs">
                                  <ExternalLink className="h-3 w-3" />
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

      {/* ── WA Message Template Preview ─────────────────────────────────────── */}
      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-emerald-600" />
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
