import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, Bell, CheckCircle2, Clock, Search, RefreshCcw,
  PiggyBank, MessageSquare, Send, FileSpreadsheet, Users, TrendingUp
} from "lucide-react";
import { format, parseISO, differenceInDays, addMonths, isBefore } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { formatCurrency } from "@/lib/format";
import { toast } from "sonner";
import * as XLSX from "xlsx";

type SavingsPlan = {
  id: string;
  customer_id: string;
  target_amount: number;
  installment_amount: number;
  installment_day: number;
  start_date: string;
  status: string;
  next_payment_date: string | null;
  last_payment_date: string | null;
  total_saved: number;
  customer: { full_name: string; phone: string; email: string } | null;
  payments_count: number;
  days_overdue: number;
};

function urgencyLevel(daysOverdue: number) {
  if (daysOverdue <= 0) return "ok";
  if (daysOverdue <= 7) return "warning";
  if (daysOverdue <= 30) return "danger";
  return "critical";
}

function UrgencyBadge({ days }: { days: number }) {
  const level = urgencyLevel(days);
  if (level === "ok") return <Badge className="bg-green-100 text-green-800 border border-green-200 text-[10px]"><CheckCircle2 className="h-3 w-3 mr-0.5" />Tepat Waktu</Badge>;
  if (level === "warning") return <Badge className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px]"><Clock className="h-3 w-3 mr-0.5" />Terlambat {days}h</Badge>;
  if (level === "danger") return <Badge className="bg-orange-100 text-orange-800 border border-orange-200 text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />Terlambat {days}h</Badge>;
  return <Badge className="bg-red-100 text-red-800 border border-red-200 text-[10px]"><AlertTriangle className="h-3 w-3 mr-0.5" />Kritis {days}h</Badge>;
}

export default function AdminMonitoringTabungan() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("overdue");
  const [sendingIds, setSendingIds] = useState<Set<string>>(new Set());

  // Fetch active savings plans
  const { data: rawPlans = [], isLoading, refetch } = useQuery({
    queryKey: ["monitoring-tabungan"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("savings_plans")
        .select(`
          id, customer_id, target_amount, installment_amount, installment_day,
          start_date, status, next_payment_date, last_payment_date,
          customer:profiles(full_name, phone, email),
          savings_payments(id, status, amount, payment_date)
        `)
        .in("status", ["active", "dp_paid"])
        .order("next_payment_date", { ascending: true, nullsFirst: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Enrich with overdue calc
  const plans: SavingsPlan[] = useMemo(() => {
    const today = new Date();
    return rawPlans.map((p: any) => {
      const payments = p.savings_payments || [];
      const totalSaved = payments
        .filter((py: any) => py.status === "verified" || py.status === "paid")
        .reduce((s: number, py: any) => s + (py.amount || 0), 0);

      let daysOverdue = 0;
      if (p.next_payment_date) {
        const nextDate = parseISO(p.next_payment_date);
        if (isBefore(nextDate, today)) {
          daysOverdue = differenceInDays(today, nextDate);
        }
      } else if (p.start_date && p.installment_day) {
        // Calculate from start_date + installment_day
        const expectedDate = new Date(today.getFullYear(), today.getMonth(), p.installment_day);
        if (isBefore(expectedDate, today)) {
          daysOverdue = differenceInDays(today, expectedDate);
        }
      }

      return {
        ...p,
        total_saved: totalSaved,
        payments_count: payments.length,
        days_overdue: daysOverdue,
        customer: Array.isArray(p.customer) ? p.customer[0] : p.customer,
      };
    });
  }, [rawPlans]);

  // Filter
  const filtered = useMemo(() => {
    let list = plans;
    if (filterStatus === "overdue") list = list.filter(p => p.days_overdue > 0);
    if (filterStatus === "critical") list = list.filter(p => p.days_overdue > 30);
    if (filterStatus === "warning") list = list.filter(p => p.days_overdue > 0 && p.days_overdue <= 30);
    if (filterStatus === "ok") list = list.filter(p => p.days_overdue === 0);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.customer?.full_name?.toLowerCase().includes(q) ||
        p.customer?.phone?.includes(q)
      );
    }
    return [...list].sort((a, b) => b.days_overdue - a.days_overdue);
  }, [plans, filterStatus, search]);

  // Summary
  const summary = useMemo(() => ({
    total: plans.length,
    overdue: plans.filter(p => p.days_overdue > 0).length,
    critical: plans.filter(p => p.days_overdue > 30).length,
    onTime: plans.filter(p => p.days_overdue === 0).length,
    totalTarget: plans.reduce((s, p) => s + (p.target_amount || 0), 0),
    totalSaved: plans.reduce((s, p) => s + (p.total_saved || 0), 0),
  }), [plans]);

  // Send WA reminder
  async function sendReminder(plan: SavingsPlan) {
    if (!plan.customer?.phone) {
      toast.error("Nomor HP tidak tersedia");
      return;
    }
    const phone = plan.customer.phone.replace(/\D/g, "").replace(/^0/, "62");
    const progress = plan.target_amount > 0 ? ((plan.total_saved / plan.target_amount) * 100).toFixed(0) : "0";
    const pesan = encodeURIComponent(
      `Halo ${plan.customer.full_name}, kami mengingatkan bahwa setoran tabungan Umroh/Haji Anda sebesar *${formatCurrency(plan.installment_amount)}* ` +
      `sudah jatuh tempo${plan.days_overdue > 0 ? ` dan telah melewati ${plan.days_overdue} hari` : ""}.\n\n` +
      `📊 Progress tabungan Anda: *${progress}%* (${formatCurrency(plan.total_saved)} dari ${formatCurrency(plan.target_amount)})\n\n` +
      `Segera lakukan pembayaran agar posisi Anda tetap terjaga. Terima kasih 🙏`
    );
    window.open(`https://wa.me/${phone}?text=${pesan}`, "_blank");

    // Log reminder to DB
    try {
      await supabase.from("savings_reminders").insert({
        savings_plan_id: plan.id,
        sent_at: new Date().toISOString(),
        channel: "whatsapp",
      });
      queryClient.invalidateQueries({ queryKey: ["monitoring-tabungan"] });
    } catch (_) {}

    toast.success(`Reminder WA dikirim ke ${plan.customer.full_name}`);
  }

  // Bulk send to all overdue
  async function sendBulkReminders() {
    const overdueList = filtered.filter(p => p.days_overdue > 0 && p.customer?.phone);
    if (!overdueList.length) {
      toast.info("Tidak ada yang perlu diingatkan");
      return;
    }
    let sent = 0;
    for (const plan of overdueList) {
      if (plan.customer?.phone) {
        const phone = plan.customer.phone.replace(/\D/g, "").replace(/^0/, "62");
        const pesan = encodeURIComponent(
          `Halo ${plan.customer.full_name}, setoran tabungan Anda sebesar ${formatCurrency(plan.installment_amount)} telah melewati batas ${plan.days_overdue} hari. Segera lakukan pembayaran. Terima kasih 🙏`
        );
        // For bulk, we just open tabs (limited by browser)
        if (sent < 3) window.open(`https://wa.me/${phone}?text=${pesan}`, "_blank");
        sent++;
      }
    }
    toast.success(`${sent} pesan WA siap dikirim (${sent > 3 ? "hanya 3 tab terbuka, sisanya manual" : "semua tab terbuka"})`);
  }

  function exportExcel() {
    const rows = filtered.map((p, i) => ({
      "No": i + 1,
      "Nama Jamaah": p.customer?.full_name || "-",
      "No HP": p.customer?.phone || "-",
      "Target Tabungan": p.target_amount,
      "Total Disetor": p.total_saved,
      "Progress (%)": p.target_amount > 0 ? ((p.total_saved / p.target_amount) * 100).toFixed(1) : "0",
      "Cicilan/bln": p.installment_amount,
      "Next Payment": p.next_payment_date ? format(parseISO(p.next_payment_date), "dd MMM yyyy", { locale: idLocale }) : "-",
      "Hari Terlambat": p.days_overdue,
      "Status": p.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws["!cols"] = [{ wch: 5 }, { wch: 25 }, { wch: 16 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 14 }, { wch: 12 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monitoring Tabungan");
    XLSX.writeFile(wb, `monitoring-tabungan-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast.success("File Excel berhasil diunduh");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Monitoring Tabungan Aktif</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Pantau jamaah yang terlambat setor dan kirim reminder otomatis via WhatsApp</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCcw className="h-4 w-4 mr-1.5" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={exportExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-1.5" /> Excel
          </Button>
          {summary.overdue > 0 && (
            <Button size="sm" variant="destructive" onClick={sendBulkReminders}>
              <Send className="h-4 w-4 mr-1.5" /> Kirim Semua Reminder ({summary.overdue})
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-muted">
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Total Tabungan Aktif</p>
              <p className="text-2xl font-bold mt-1">{summary.total}</p>
              <p className="text-xs text-muted-foreground">{summary.onTime} tepat waktu</p>
            </CardContent>
          </Card>
          <Card className={summary.overdue > 0 ? "border-amber-300 bg-amber-50/30 dark:bg-amber-950/10" : ""}>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Terlambat Setor</p>
              <p className="text-2xl font-bold mt-1 text-amber-600">{summary.overdue}</p>
              <p className="text-xs text-muted-foreground">{summary.critical} kritis (&gt;30 hari)</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Total Target</p>
              <p className="text-xl font-bold mt-1">{formatCurrency(summary.totalTarget)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5">
              <p className="text-xs text-muted-foreground">Total Terkumpul</p>
              <p className="text-xl font-bold mt-1 text-emerald-600">{formatCurrency(summary.totalSaved)}</p>
              <Progress value={summary.totalTarget > 0 ? (summary.totalSaved / summary.totalTarget) * 100 : 0} className="h-1.5 mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Cari nama atau nomor HP..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Status</SelectItem>
            <SelectItem value="overdue">Terlambat (semua)</SelectItem>
            <SelectItem value="warning">Terlambat 1–30 hari</SelectItem>
            <SelectItem value="critical">Kritis (&gt;30 hari)</SelectItem>
            <SelectItem value="ok">Tepat Waktu</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="py-3 px-4 border-b">
          <CardTitle className="text-sm font-medium">
            {filtered.length} tabungan ditampilkan
            {filterStatus === "overdue" && summary.overdue > 0 && (
              <Badge className="ml-2 bg-amber-100 text-amber-800 border border-amber-200 text-[10px]">
                <AlertTriangle className="h-3 w-3 mr-0.5" />{summary.overdue} perlu reminder
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-muted-foreground">
              <PiggyBank className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">
                {filterStatus === "overdue" ? "🎉 Semua tabungan tepat waktu!" : "Tidak ada data ditemukan"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Jamaah</TableHead>
                    <TableHead>No HP</TableHead>
                    <TableHead className="text-right">Target</TableHead>
                    <TableHead className="text-right">Terkumpul</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead className="text-right">Cicilan/bln</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const pct = p.target_amount > 0 ? (p.total_saved / p.target_amount) * 100 : 0;
                    const level = urgencyLevel(p.days_overdue);
                    return (
                      <TableRow key={p.id} className={
                        level === "critical" ? "bg-red-50/50 dark:bg-red-950/10" :
                        level === "danger" ? "bg-orange-50/40 dark:bg-orange-950/10" :
                        level === "warning" ? "bg-amber-50/30 dark:bg-amber-950/10" : ""
                      }>
                        <TableCell className="font-medium">{p.customer?.full_name || "-"}</TableCell>
                        <TableCell className="text-xs font-mono">{p.customer?.phone || "-"}</TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(p.target_amount)}</TableCell>
                        <TableCell className="text-right text-xs text-emerald-600 font-medium">{formatCurrency(p.total_saved)}</TableCell>
                        <TableCell className="min-w-28">
                          <div className="space-y-1">
                            <Progress value={pct} className="h-2" />
                            <p className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-xs">{formatCurrency(p.installment_amount)}</TableCell>
                        <TableCell className="text-xs whitespace-nowrap">
                          {p.next_payment_date
                            ? format(parseISO(p.next_payment_date), "dd MMM yyyy", { locale: idLocale })
                            : "-"}
                        </TableCell>
                        <TableCell><UrgencyBadge days={p.days_overdue} /></TableCell>
                        <TableCell className="text-center">
                          {p.customer?.phone && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1.5 text-green-700 border-green-300 hover:bg-green-50"
                              onClick={() => sendReminder(p)}
                            >
                              <MessageSquare className="h-3.5 w-3.5" /> WA
                            </Button>
                          )}
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
    </div>
  );
}
