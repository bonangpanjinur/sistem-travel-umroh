import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as supabaseRaw } from "@/integrations/supabase/client";
const supabase: any = supabaseRaw;
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/format";
import {
  Target, Settings2, TrendingUp, TrendingDown, DollarSign,
  Users, Package, RefreshCw, CheckCircle2, AlertCircle, Loader2,
  BarChart3, Calendar,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, subMonths,
  parseISO, addMonths,
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTHS = Array.from({ length: 13 }, (_, i) => {
  const d = i === 0 ? new Date() : subMonths(new Date(), i - 1 === 0 ? 0 : i);
  const key = format(i === 0 ? addMonths(new Date(), 1) : i === 1 ? new Date() : subMonths(new Date(), i - 1), "yyyy-MM");
  return { value: format(subMonths(new Date(), Math.max(i - 1, 0)), "yyyy-MM"), label: format(subMonths(new Date(), Math.max(i - 1, 0)), "MMMM yyyy", { locale: localeId }) };
}).filter((m, i, arr) => arr.findIndex(x => x.value === m.value) === i).slice(0, 12);

const THIS_MONTH = format(new Date(), "yyyy-MM");

interface Targets {
  bookings_target: number;
  revenue_target: number;
  new_customers_target: number;
  agents_booking_target: number;
  conversion_target: number;
  notes: string;
}

const DEFAULT_TARGETS: Targets = {
  bookings_target: 50,
  revenue_target: 500_000_000,
  new_customers_target: 100,
  agents_booking_target: 30,
  conversion_target: 25,
  notes: "",
};

// ─── Animated progress bar ───────────────────────────────────────────────────

function AnimBar({ value }: { value: number }) {
  return (
    <div className="w-full bg-secondary h-1.5 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value, 100)}%` }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className={cn(
          "h-full rounded-full",
          value >= 100 ? "bg-emerald-500" : value >= 70 ? "bg-amber-500" : "bg-red-500"
        )}
      />
    </div>
  );
}

// ─── KPI Card ────────────────────────────────────────────────────────────────

function KpiCard({
  label, actual, target, format: fmt, icon: Icon, gradient, prev,
}: {
  label: string; actual: number; target: number;
  format: (v: number) => string; icon: any; gradient: string; prev?: number;
}) {
  const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
  const trend = prev !== undefined && prev > 0
    ? Math.round(((actual - prev) / prev) * 100)
    : null;

  return (
    <Card className={`relative overflow-hidden border-none text-white ${gradient}`}>
      <CardContent className="p-5">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-white/70 text-xs font-medium uppercase tracking-wider">{label}</p>
            <h3 className="text-2xl font-bold mt-1 leading-tight">{fmt(actual)}</h3>
            <p className="text-white/60 text-xs mt-0.5">Target: {fmt(target)}</p>
          </div>
          <div className="p-2 bg-white/10 rounded-lg shrink-0">
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
        {trend !== null && (
          <div className="mt-2 flex items-center gap-1.5">
            <div className={cn("flex items-center text-[11px] font-medium px-1.5 py-0.5 rounded-full",
              trend >= 0 ? "bg-emerald-400/20 text-emerald-100" : "bg-red-400/20 text-red-200")}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
              {Math.abs(trend)}%
            </div>
            <span className="text-white/50 text-[10px]">vs bulan lalu</span>
          </div>
        )}
        <div className="mt-3 space-y-1">
          <div className="flex justify-between text-[10px] text-white/60">
            <span>Progress</span><span>{pct}%</span>
          </div>
          <AnimBar value={pct} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Set Target Dialog ────────────────────────────────────────────────────────

function TargetDialog({
  open, onClose, current, onSave, isSaving, monthLabel,
}: {
  open: boolean; onClose: () => void; current: Targets;
  onSave: (v: Targets) => void; isSaving: boolean; monthLabel: string;
}) {
  const [form, setForm] = useState<Targets>(current);

  useEffect(() => { if (open) setForm(current); }, [open, current]);

  const set = (key: keyof Targets, raw: string) => {
    if (key === "notes") { setForm(f => ({ ...f, notes: raw })); return; }
    const n = parseFloat(raw.replace(/[^0-9.]/g, "")) || 0;
    setForm(f => ({ ...f, [key]: n }));
  };

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" />
            Atur Target KPI — {monthLabel}
          </DialogTitle>
          <DialogDescription>
            Target ini berlaku khusus untuk cabang Anda dan hanya bisa dilihat
            oleh branch manager dan admin pusat.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Target Booking Terkonfirmasi</Label>
            <Input type="number" min={1} value={form.bookings_target}
              onChange={e => set("bookings_target", e.target.value)} />
            <p className="text-xs text-muted-foreground">Jumlah booking terkonfirmasi bulan ini</p>
          </div>
          <div className="space-y-1.5">
            <Label>Target Pendapatan (Rp)</Label>
            <Input type="number" min={0} value={form.revenue_target}
              onChange={e => set("revenue_target", e.target.value)} />
            <p className="text-xs text-muted-foreground">= {formatCurrency(form.revenue_target)}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Target Customer Baru</Label>
            <Input type="number" min={0} value={form.new_customers_target}
              onChange={e => set("new_customers_target", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Target Agen Aktif Booking</Label>
            <Input type="number" min={0} value={form.agents_booking_target}
              onChange={e => set("agents_booking_target", e.target.value)} />
            <p className="text-xs text-muted-foreground">Jumlah agen yang harus menghasilkan minimal 1 booking</p>
          </div>
          <div className="space-y-1.5">
            <Label>Target Konversi Lead (%)</Label>
            <Input type="number" min={0} max={100} step={0.5} value={form.conversion_target}
              onChange={e => set("conversion_target", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Catatan (opsional)</Label>
            <Textarea rows={2} value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="cth: Target dinaikkan karena musim haji..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Batal</Button>
          <Button onClick={() => onSave(form)} disabled={isSaving}>
            {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Menyimpan…</> : "Simpan Target"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BranchKPITargets() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(THIS_MONTH);
  const [showDialog, setShowDialog] = useState(false);

  const monthLabel = format(
    new Date(selectedMonth + "-01"),
    "MMMM yyyy", { locale: localeId }
  );
  const rangeStart = startOfMonth(new Date(selectedMonth + "-01")).toISOString();
  const rangeEnd   = endOfMonth(new Date(selectedMonth + "-01")).toISOString();
  const prevMonthKey = format(subMonths(new Date(selectedMonth + "-01"), 1), "yyyy-MM");
  const prevStart = startOfMonth(new Date(prevMonthKey + "-01")).toISOString();
  const prevEnd   = endOfMonth(new Date(prevMonthKey + "-01")).toISOString();

  // 1. Get branch
  const { data: branch } = useQuery({
    queryKey: ["branch-for-kpi", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("branches")
        .select("id, name, city").eq("manager_user_id", user!.id).maybeSingle();
      return data;
    },
  });
  const bId = branch?.id;

  // 2. Saved targets for selected month
  const { data: savedTarget, isLoading: loadingTarget } = useQuery({
    queryKey: ["branch-kpi-target", bId, selectedMonth],
    enabled: !!bId,
    queryFn: async () => {
      const { data, error } = await supabase.from("branch_monthly_targets")
        .select("*").eq("branch_id", bId).eq("month_key", selectedMonth).maybeSingle();
      if (error?.code === "42P01") return null;
      return data;
    },
  });

  const activeTargets: Targets = savedTarget
    ? {
        bookings_target: savedTarget.bookings_target,
        revenue_target: Number(savedTarget.revenue_target),
        new_customers_target: savedTarget.new_customers_target,
        agents_booking_target: savedTarget.agents_booking_target,
        conversion_target: Number(savedTarget.conversion_target),
        notes: savedTarget.notes || "",
      }
    : DEFAULT_TARGETS;

  // 3. Actuals for selected month
  const { data: actuals, isLoading: loadingActuals, refetch } = useQuery({
    queryKey: ["branch-kpi-actuals", bId, selectedMonth],
    enabled: !!bId,
    queryFn: async () => {
      const [bookingsRes, prevBookingsRes, customersRes, agentsRes, leadsRes] = await Promise.all([
        supabase.from("bookings").select("id, total_price, status, agent_id")
          .eq("branch_id", bId).gte("created_at", rangeStart).lte("created_at", rangeEnd),
        supabase.from("bookings").select("id, total_price, status")
          .eq("branch_id", bId).gte("created_at", prevStart).lte("created_at", prevEnd)
          .in("status", ["confirmed","completed"]),
        supabase.from("bookings").select("customer_id")
          .eq("branch_id", bId).gte("created_at", rangeStart).lte("created_at", rangeEnd),
        supabase.from("agents").select("id, name, user_id")
          .eq("branch_id", bId).eq("status", "active"),
        supabase.from("leads").select("id")
          .eq("branch_id", bId).gte("created_at", rangeStart).lte("created_at", rangeEnd)
          .catch(() => ({ data: [] })),
      ]);

      const bookings = bookingsRes.data ?? [];
      const confirmed = bookings.filter((b: any) => ["confirmed","completed"].includes(b.status));
      const revenue = confirmed.reduce((s: number, b: any) => s + Number(b.total_price ?? 0), 0);
      const prevRevenue = (prevBookingsRes.data ?? []).reduce((s: number, b: any) => s + Number(b.total_price ?? 0), 0);
      const prevConfirmed = (prevBookingsRes.data ?? []).length;
      const uniqueCustomers = new Set(confirmed.map((b: any) => b.customer_id)).size;
      const agents = agentsRes.data ?? [];
      const agentsWithBooking = new Set(confirmed.map((b: any) => b.agent_id).filter(Boolean)).size;
      const leads = (leadsRes as any)?.data?.length ?? 0;
      const conversion = leads > 0 ? (confirmed.length / leads) * 100 : 0;

      // Per-agent breakdown
      const agentMap: Record<string, { name: string; bookings: number; revenue: number }> = {};
      agents.forEach((a: any) => { agentMap[a.id] = { name: a.name, bookings: 0, revenue: 0 }; });
      confirmed.forEach((b: any) => {
        if (b.agent_id && agentMap[b.agent_id]) {
          agentMap[b.agent_id].bookings++;
          agentMap[b.agent_id].revenue += Number(b.total_price ?? 0);
        }
      });
      const agentStats = Object.entries(agentMap)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.bookings - a.bookings);

      return {
        bookings: confirmed.length,
        revenue,
        newCustomers: uniqueCustomers,
        agentsWithBooking,
        conversion,
        prevBookings: prevConfirmed,
        prevRevenue,
        agentStats,
        totalAgents: agents.length,
      };
    },
    staleTime: 3 * 60 * 1000,
  });

  // 4. Historical data for chart (last 6 months)
  const { data: history = [] } = useQuery({
    queryKey: ["branch-kpi-history", bId],
    enabled: !!bId,
    queryFn: async () => {
      const results = await Promise.all(
        Array.from({ length: 6 }, (_, i) => {
          const m = subMonths(new Date(), i);
          const key = format(m, "yyyy-MM");
          const s = startOfMonth(m).toISOString();
          const e = endOfMonth(m).toISOString();
          return supabase.from("bookings").select("total_price, status")
            .eq("branch_id", bId).gte("created_at", s).lte("created_at", e)
            .in("status", ["confirmed","completed"])
            .then(({ data }: any) => ({
              month: format(m, "MMM", { locale: localeId }),
              bookings: (data ?? []).length,
              revenue: (data ?? []).reduce((s: number, b: any) => s + Number(b.total_price ?? 0), 0),
            }));
        })
      );
      return results.reverse();
    },
    staleTime: 10 * 60 * 1000,
  });

  // 5. Historical targets for table
  const { data: allTargets = [] } = useQuery({
    queryKey: ["branch-kpi-all-targets", bId],
    enabled: !!bId,
    queryFn: async () => {
      const { data, error } = await supabase.from("branch_monthly_targets")
        .select("*").eq("branch_id", bId).order("month_key", { ascending: false }).limit(12);
      if (error?.code === "42P01") return [];
      return data ?? [];
    },
  });

  // 6. Save targets
  const saveMutation = useMutation({
    mutationFn: async (targets: Targets) => {
      const payload = { ...targets, branch_id: bId, month_key: selectedMonth, set_by: user?.id, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("branch_monthly_targets")
        .upsert(payload, { onConflict: "branch_id,month_key" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branch-kpi-target", bId, selectedMonth] });
      queryClient.invalidateQueries({ queryKey: ["branch-kpi-all-targets", bId] });
      toast.success("Target KPI cabang berhasil disimpan");
      setShowDialog(false);
    },
    onError: (err: any) => {
      toast.error(`Gagal menyimpan: ${err.message}`);
    },
  });

  const isLoading = loadingTarget || loadingActuals;
  const t = activeTargets;
  const a = actuals;

  const pct = (actual: number, target: number) =>
    target > 0 ? Math.round((actual / target) * 100) : 0;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Target className="h-6 w-6 text-primary" /> Target KPI Cabang
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            {branch?.name || "—"} · Target bisa diatur mandiri per bulan
            {savedTarget
              ? <span className="ml-2 text-emerald-600 font-medium">· Target dari database ✓</span>
              : <span className="ml-2 text-amber-600 font-medium">· Menggunakan target default</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-44 h-9">
              <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map(m => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => setShowDialog(true)} className="gap-2">
            <Settings2 className="h-4 w-4" /> Atur Target
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard
            label="Booking Terkonfirmasi"
            actual={a?.bookings ?? 0}
            target={t.bookings_target}
            format={v => v.toLocaleString("id-ID")}
            icon={Package}
            gradient="bg-gradient-to-br from-blue-600 to-indigo-700"
            prev={a?.prevBookings}
          />
          <KpiCard
            label="Total Pendapatan"
            actual={a?.revenue ?? 0}
            target={t.revenue_target}
            format={formatCurrency}
            icon={DollarSign}
            gradient="bg-gradient-to-br from-emerald-600 to-teal-700"
            prev={a?.prevRevenue}
          />
          <KpiCard
            label="Customer Baru"
            actual={a?.newCustomers ?? 0}
            target={t.new_customers_target}
            format={v => v.toLocaleString("id-ID")}
            icon={Users}
            gradient="bg-gradient-to-br from-violet-600 to-purple-700"
          />
          <KpiCard
            label="Agen Aktif Booking"
            actual={a?.agentsWithBooking ?? 0}
            target={t.agents_booking_target}
            format={v => `${v} / ${a?.totalAgents ?? 0}`}
            icon={TrendingUp}
            gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          />
        </div>
      )}

      {/* Summary Table + Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress Table */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" /> Ringkasan {monthLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{[1,2,3,4,5].map(i=><Skeleton key={i} className="h-8"/>)}</div>
            ) : (
              <div className="divide-y">
                {[
                  { label: "Booking",        actual: a?.bookings??0,          target: t.bookings_target,       fmt: (v:number)=>v.toLocaleString("id-ID") },
                  { label: "Pendapatan",     actual: a?.revenue??0,           target: t.revenue_target,        fmt: formatCurrency },
                  { label: "Customer Baru",  actual: a?.newCustomers??0,      target: t.new_customers_target,  fmt: (v:number)=>v.toLocaleString("id-ID") },
                  { label: "Agen Aktif",     actual: a?.agentsWithBooking??0, target: t.agents_booking_target, fmt: (v:number)=>v.toLocaleString("id-ID") },
                  { label: "Konversi",       actual: a?.conversion??0,        target: t.conversion_target,     fmt: (v:number)=>`${v.toFixed(1)}%` },
                ].map(row => {
                  const p = pct(row.actual, row.target);
                  const color = p >= 100 ? "text-emerald-600" : p >= 70 ? "text-amber-600" : "text-red-500";
                  return (
                    <div key={row.label} className="px-4 py-3">
                      <div className="flex justify-between items-center text-sm mb-1.5">
                        <span className="font-medium">{row.label}</span>
                        <span className={cn("font-bold text-xs", color)}>{p}%</span>
                      </div>
                      <AnimBar value={p} />
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>Aktual: {row.fmt(row.actual)}</span>
                        <span>Target: {row.fmt(row.target)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Booking trend chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-blue-500" /> Tren Booking 6 Bulan Terakhir
            </CardTitle>
            <CardDescription>Booking terkonfirmasi per bulan</CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                Belum ada data historis
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={history} barSize={32}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 10, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
                    formatter={(v: any) => [v, "Booking"]}
                  />
                  <Bar dataKey="bookings" radius={[6,6,0,0]}>
                    {history.map((_, i) => (
                      <Cell key={i} fill={i === history.length - 1 ? "#3b82f6" : "#93c5fd"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-agent performance */}
      {(a?.agentStats?.length ?? 0) > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-500" /> Performa Per Agen — {monthLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agen</TableHead>
                  <TableHead className="text-right">Booking</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(a?.agentStats ?? []).map((ag: any) => (
                  <TableRow key={ag.id}>
                    <TableCell className="font-medium">{ag.name}</TableCell>
                    <TableCell className="text-right">{ag.bookings}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(ag.revenue)}</TableCell>
                    <TableCell className="text-center">
                      {ag.bookings > 0
                        ? <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-xs">Aktif</Badge>
                        : <Badge variant="outline" className="text-slate-400 text-xs">Belum booking</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Historical targets */}
      {allTargets.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" /> Riwayat Target yang Ditetapkan
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Bulan</TableHead>
                    <TableHead className="text-right">Booking</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">Customer</TableHead>
                    <TableHead className="text-right">Agen Aktif</TableHead>
                    <TableHead>Catatan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allTargets.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium whitespace-nowrap">
                        {format(new Date(t.month_key + "-01"), "MMMM yyyy", { locale: localeId })}
                      </TableCell>
                      <TableCell className="text-right">{t.bookings_target.toLocaleString("id-ID")}</TableCell>
                      <TableCell className="text-right text-sm">{formatCurrency(Number(t.revenue_target))}</TableCell>
                      <TableCell className="text-right">{t.new_customers_target}</TableCell>
                      <TableCell className="text-right">{t.agents_booking_target}</TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-xs truncate">{t.notes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <TargetDialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        current={activeTargets}
        onSave={v => saveMutation.mutate(v)}
        isSaving={saveMutation.isPending}
        monthLabel={monthLabel}
      />
    </div>
  );
}
