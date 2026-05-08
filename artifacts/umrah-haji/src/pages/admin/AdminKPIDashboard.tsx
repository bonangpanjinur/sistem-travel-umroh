import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area
} from "recharts";
import {
  TrendingUp, TrendingDown, Users, Calendar, DollarSign, Target,
  RefreshCw, Settings2, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import {
  format, startOfMonth, endOfMonth, subMonths,
  startOfQuarter, endOfQuarter
} from "date-fns";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

const SETTINGS_KEY = "kpi_targets_monthly";

const DEFAULT_TARGETS = {
  bookings: 150,
  revenue: 3_500_000_000,
  leads: 500,
  conversion: 30,
};

type KpiTargets = typeof DEFAULT_TARGETS;

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);

const AnimatedProgress = ({ value }: { value: number }) => (
  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
    <motion.div
      initial={{ width: 0 }}
      animate={{ width: `${Math.min(value, 100)}%` }}
      transition={{ duration: 1, ease: "easeOut" }}
      className={cn(
        "h-full rounded-full",
        value >= 100 ? "bg-emerald-500" : value >= 70 ? "bg-amber-500" : "bg-red-500"
      )}
    />
  </div>
);

function SetTargetDialog({
  open,
  onClose,
  current,
  onSave,
  isSaving,
}: {
  open: boolean;
  onClose: () => void;
  current: KpiTargets;
  onSave: (v: KpiTargets) => void;
  isSaving: boolean;
}) {
  const [form, setForm] = useState<KpiTargets>(current);

  useEffect(() => {
    if (open) setForm(current);
  }, [open, current]);

  const set = (key: keyof KpiTargets, raw: string) => {
    const num = parseFloat(raw.replace(/[^0-9.]/g, "")) || 0;
    setForm((f) => ({ ...f, [key]: num }));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-primary" /> Atur Target KPI Bulanan
          </DialogTitle>
          <DialogDescription>
            Target ini digunakan sebagai patokan progress di KPI Dashboard.
            Disimpan ke database dan berlaku untuk semua admin.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="t-bookings">Target Booking Terkonfirmasi</Label>
            <Input
              id="t-bookings"
              type="number"
              min={1}
              value={form.bookings}
              onChange={(e) => set("bookings", e.target.value)}
              placeholder="cth: 150"
            />
            <p className="text-xs text-muted-foreground">Jumlah booking terkonfirmasi per bulan</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-revenue">Target Pendapatan (Rp)</Label>
            <Input
              id="t-revenue"
              type="number"
              min={0}
              value={form.revenue}
              onChange={(e) => set("revenue", e.target.value)}
              placeholder="cth: 3500000000"
            />
            <p className="text-xs text-muted-foreground">
              = {formatCurrency(form.revenue)} per bulan
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-leads">Target Lead Masuk</Label>
            <Input
              id="t-leads"
              type="number"
              min={1}
              value={form.leads}
              onChange={(e) => set("leads", e.target.value)}
              placeholder="cth: 500"
            />
            <p className="text-xs text-muted-foreground">Jumlah lead baru per bulan</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="t-conv">Target Konversi Lead (%)</Label>
            <Input
              id="t-conv"
              type="number"
              min={0}
              max={100}
              step={0.5}
              value={form.conversion}
              onChange={(e) => set("conversion", e.target.value)}
              placeholder="cth: 30"
            />
            <p className="text-xs text-muted-foreground">Persentase lead yang menjadi booking</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Batal</Button>
          <Button onClick={() => onSave(form)} disabled={isSaving}>
            {isSaving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menyimpan…</> : "Simpan Target"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminKPIDashboard() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const canEditTargets = hasRole("super_admin") || hasRole("owner") || hasRole("admin");

  const [period, setPeriod] = useState<"this_month" | "last_month" | "this_quarter">("this_month");
  const [showTargetDialog, setShowTargetDialog] = useState(false);

  const getRange = () => {
    const now = new Date();
    if (period === "this_month") return { start: startOfMonth(now).toISOString(), end: endOfMonth(now).toISOString() };
    if (period === "last_month") return { start: startOfMonth(subMonths(now, 1)).toISOString(), end: endOfMonth(subMonths(now, 1)).toISOString() };
    return { start: startOfQuarter(now).toISOString(), end: endOfQuarter(now).toISOString() };
  };

  const range = getRange();

  const { data: savedTargets, isLoading: loadingTargets } = useQuery({
    queryKey: ["kpi-targets"],
    queryFn: async () => {
      const { data } = await supabase
        .from("company_settings")
        .select("setting_value")
        .eq("setting_key", SETTINGS_KEY)
        .maybeSingle();
      if (data?.setting_value && typeof data.setting_value === "object") {
        const v = data.setting_value as Record<string, number>;
        return {
          bookings: v.bookings ?? DEFAULT_TARGETS.bookings,
          revenue: v.revenue ?? DEFAULT_TARGETS.revenue,
          leads: v.leads ?? DEFAULT_TARGETS.leads,
          conversion: v.conversion ?? DEFAULT_TARGETS.conversion,
        } as KpiTargets;
      }
      return DEFAULT_TARGETS;
    },
    staleTime: 5 * 60 * 1000,
  });

  const activeTargets: KpiTargets = savedTargets ?? DEFAULT_TARGETS;

  const saveTargetsMutation = useMutation({
    mutationFn: async (targets: KpiTargets) => {
      const { error } = await supabase
        .from("company_settings")
        .upsert(
          {
            setting_key: SETTINGS_KEY,
            setting_value: targets as any,
            setting_type: "json",
            description: "Target KPI bulanan — bookings, revenue, leads, conversion",
            updated_at: new Date().toISOString(),
          },
          { onConflict: "setting_key" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kpi-targets"] });
      toast.success("Target KPI berhasil disimpan ke database");
      setShowTargetDialog(false);
    },
    onError: (err: any) => {
      toast.error(`Gagal menyimpan target: ${err.message}`);
    },
  });

  const { data: kpiData, isLoading, refetch } = useQuery({
    queryKey: ["admin-kpi", period],
    queryFn: async () => {
      const [bookingsRes, leadsRes, revenueRes] = await Promise.all([
        supabase.from("bookings").select("id, created_at, total_price, booking_status")
          .gte("created_at", range.start).lte("created_at", range.end),
        supabase.from("leads").select("id, created_at")
          .gte("created_at", range.start).lte("created_at", range.end),
        supabase.from("bookings").select("total_price")
          .eq("booking_status", "confirmed")
          .gte("created_at", range.start).lte("created_at", range.end),
      ]);

      const bookings = bookingsRes.data ?? [];
      const leads = leadsRes.data ?? [];
      const revenue = (revenueRes.data ?? []).reduce((sum, b) => sum + Number(b.total_price ?? 0), 0);
      const confirmedBookings = bookings.filter(b => b.booking_status === "confirmed").length;
      const conversionRate = leads.length > 0 ? (confirmedBookings / leads.length) * 100 : 0;

      return { bookings: confirmedBookings, leads: leads.length, revenue, conversionRate, rawBookings: bookings, rawLeads: leads };
    },
  });

  const { data: prevData } = useQuery({
    queryKey: ["admin-kpi-prev", period],
    queryFn: async () => {
      const now = new Date();
      let prevRange: { start: string; end: string };
      if (period === "this_month") prevRange = { start: startOfMonth(subMonths(now, 1)).toISOString(), end: endOfMonth(subMonths(now, 1)).toISOString() };
      else if (period === "last_month") prevRange = { start: startOfMonth(subMonths(now, 2)).toISOString(), end: endOfMonth(subMonths(now, 2)).toISOString() };
      else prevRange = { start: startOfQuarter(subMonths(now, 3)).toISOString(), end: endOfQuarter(subMonths(now, 3)).toISOString() };

      const [bookingsRes, leadsRes] = await Promise.all([
        supabase.from("bookings").select("id").eq("booking_status", "confirmed").gte("created_at", prevRange.start).lte("created_at", prevRange.end),
        supabase.from("leads").select("id").gte("created_at", prevRange.start).lte("created_at", prevRange.end),
      ]);
      return { bookings: (bookingsRes.data ?? []).length, leads: (leadsRes.data ?? []).length };
    },
    staleTime: 10 * 60 * 1000,
  });

  const weeklyData = (() => {
    if (!kpiData?.rawBookings) return [];
    const days: Record<string, { week: string; bookings: number; leads: number }> = {};
    kpiData.rawBookings.forEach(b => {
      if (!b.created_at) return;
      const w = format(new Date(b.created_at), "dd MMM");
      if (!days[w]) days[w] = { week: w, bookings: 0, leads: 0 };
      days[w].bookings++;
    });
    kpiData.rawLeads?.forEach((l: any) => {
      if (!l.created_at) return;
      const w = format(new Date(l.created_at), "dd MMM");
      if (!days[w]) days[w] = { week: w, bookings: 0, leads: 0 };
      days[w].leads++;
    });
    return Object.values(days).slice(-14);
  })();

  const targetMultiplier = period === "this_quarter" ? 3 : 1;
  const targets: KpiTargets = {
    bookings: activeTargets.bookings * targetMultiplier,
    revenue: activeTargets.revenue * targetMultiplier,
    leads: activeTargets.leads * targetMultiplier,
    conversion: activeTargets.conversion,
  };

  const bookingTrend = prevData?.bookings
    ? Math.round(((kpiData?.bookings ?? 0) - prevData.bookings) / Math.max(prevData.bookings, 1) * 100)
    : 0;
  const leadTrend = prevData?.leads
    ? Math.round(((kpiData?.leads ?? 0) - prevData.leads) / Math.max(prevData.leads, 1) * 100)
    : 0;

  if (isLoading || loadingTargets) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-72" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KPI Dashboard</h1>
          <p className="text-muted-foreground text-sm">
            Pantau performa bisnis vs target secara real-time.{" "}
            {savedTargets ? (
              <span className="text-emerald-600 font-medium">Target dari database ✓</span>
            ) : (
              <span className="text-amber-600 font-medium">Menggunakan target default</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Period selector */}
          <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
            {(["this_month", "last_month", "this_quarter"] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "ghost"}
                size="sm"
                onClick={() => setPeriod(p)}
                className="text-xs h-8"
              >
                {p === "this_month" ? "Bulan Ini" : p === "last_month" ? "Bulan Lalu" : "Kuartal Ini"}
              </Button>
            ))}
            <div className="w-px h-4 bg-border mx-1" />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Set Target button — admin only */}
          {canEditTargets && (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowTargetDialog(true)}
            >
              <Settings2 className="h-4 w-4" />
              Atur Target
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Booking */}
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Booking Terkonfirmasi</p>
                <h3 className="text-3xl font-bold mt-1">{kpiData?.bookings ?? 0}</h3>
                <p className="text-blue-200 text-xs mt-0.5">Target: {targets.bookings.toLocaleString("id-ID")}</p>
              </div>
              <div className="p-2 bg-white/10 rounded-lg">
                <Target className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className={cn("flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full", bookingTrend >= 0 ? "bg-emerald-400/20 text-emerald-300" : "bg-red-400/20 text-red-300")}>
                {bookingTrend >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(bookingTrend)}%
              </div>
              <span className="text-blue-200 text-[10px]">vs periode lalu</span>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-[10px] text-blue-100">
                <span>Progress</span>
                <span>{targets.bookings > 0 ? Math.round(((kpiData?.bookings ?? 0) / targets.bookings) * 100) : 0}%</span>
              </div>
              <Progress value={targets.bookings > 0 ? ((kpiData?.bookings ?? 0) / targets.bookings) * 100 : 0} className="h-1 bg-white/20 [&>div]:bg-white" />
            </div>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Total Pendapatan</p>
                <h3 className="text-2xl font-bold mt-1 leading-tight">{formatCurrency(kpiData?.revenue ?? 0)}</h3>
                <p className="text-emerald-200 text-xs mt-0.5">Target: {formatCurrency(targets.revenue)}</p>
              </div>
              <div className="p-2 bg-white/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-[10px] text-emerald-100">
                <span>Progress</span>
                <span>{targets.revenue > 0 ? Math.round(((kpiData?.revenue ?? 0) / targets.revenue) * 100) : 0}%</span>
              </div>
              <Progress value={targets.revenue > 0 ? ((kpiData?.revenue ?? 0) / targets.revenue) * 100 : 0} className="h-1 bg-white/20 [&>div]:bg-white" />
            </div>
          </CardContent>
        </Card>

        {/* Leads */}
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-violet-600 to-purple-700 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-violet-100 text-xs font-medium uppercase tracking-wider">Lead Masuk</p>
                <h3 className="text-3xl font-bold mt-1">{kpiData?.leads ?? 0}</h3>
                <p className="text-violet-200 text-xs mt-0.5">Target: {targets.leads.toLocaleString("id-ID")}</p>
              </div>
              <div className="p-2 bg-white/10 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className={cn("flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full", leadTrend >= 0 ? "bg-emerald-400/20 text-emerald-300" : "bg-red-400/20 text-red-300")}>
                {leadTrend >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(leadTrend)}%
              </div>
              <span className="text-violet-200 text-[10px]">vs periode lalu</span>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-[10px] text-violet-100">
                <span>Progress</span>
                <span>{targets.leads > 0 ? Math.round(((kpiData?.leads ?? 0) / targets.leads) * 100) : 0}%</span>
              </div>
              <Progress value={targets.leads > 0 ? ((kpiData?.leads ?? 0) / targets.leads) * 100 : 0} className="h-1 bg-white/20 [&>div]:bg-white" />
            </div>
          </CardContent>
        </Card>

        {/* Conversion */}
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-amber-100 text-xs font-medium uppercase tracking-wider">Konversi Lead</p>
                <h3 className="text-3xl font-bold mt-1">{(kpiData?.conversionRate ?? 0).toFixed(1)}%</h3>
                <p className="text-amber-200 text-xs mt-0.5">Target: {targets.conversion}%</p>
              </div>
              <div className="p-2 bg-white/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Badge className={cn("text-[10px] font-semibold border-0", (kpiData?.conversionRate ?? 0) >= targets.conversion ? "bg-emerald-400/30 text-emerald-100" : "bg-red-400/20 text-red-200")}>
                {(kpiData?.conversionRate ?? 0) >= targets.conversion ? "Di Atas Target ✓" : "Di Bawah Target"}
              </Badge>
            </div>
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-[10px] text-amber-100">
                <span>Progress</span>
                <span>{targets.conversion > 0 ? Math.round(((kpiData?.conversionRate ?? 0) / targets.conversion) * 100) : 0}%</span>
              </div>
              <Progress value={targets.conversion > 0 ? ((kpiData?.conversionRate ?? 0) / targets.conversion) * 100 : 0} className="h-1 bg-white/20 [&>div]:bg-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Tren Booking & Lead Harian
            </CardTitle>
            <CardDescription>Aktivitas dalam periode ini (maks 14 titik terakhir)</CardDescription>
          </CardHeader>
          <CardContent>
            {weeklyData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground text-sm border-2 border-dashed rounded-xl">
                Belum ada data untuk periode ini
              </div>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyData}>
                    <defs>
                      <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 12, border: "none", boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }} />
                    <Area type="monotone" dataKey="bookings" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorBookings)" name="Booking" />
                    <Area type="monotone" dataKey="leads" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorLeads)" name="Lead" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Distribusi Lead Harian
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Belum ada data
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} formatter={(v) => [v, "Lead"]} />
                  <Bar dataKey="leads" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Summary Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="h-4 w-4 text-primary" />
            Ringkasan Pencapaian KPI
          </CardTitle>
          <CardDescription>
            Target {period === "this_quarter" ? "kuartal (3× target bulanan)" : "bulanan"} yang tersimpan di database
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="text-left p-4 font-semibold">Metrik</th>
                  <th className="text-right p-4 font-semibold">Target</th>
                  <th className="text-right p-4 font-semibold">Aktual</th>
                  <th className="text-right p-4 font-semibold">Progress</th>
                  <th className="text-right p-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {[
                  { label: "Booking Terkonfirmasi", target: targets.bookings, actual: kpiData?.bookings ?? 0, fmt: (v: number) => v.toLocaleString("id-ID") },
                  { label: "Pendapatan (Rp)", target: targets.revenue, actual: kpiData?.revenue ?? 0, fmt: formatCurrency },
                  { label: "Lead Masuk", target: targets.leads, actual: kpiData?.leads ?? 0, fmt: (v: number) => v.toLocaleString("id-ID") },
                  { label: "Konversi Lead (%)", target: targets.conversion, actual: kpiData?.conversionRate ?? 0, fmt: (v: number) => `${v.toFixed(1)}%` },
                ].map((row) => {
                  const pct = row.target > 0 ? Math.round((row.actual / row.target) * 100) : 0;
                  const statusColor = pct >= 100 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30" : pct >= 70 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30" : "bg-red-100 text-red-700 dark:bg-red-900/30";
                  const statusLabel = pct >= 100 ? "Tercapai ✓" : pct >= 70 ? "On Track" : "Perlu Upaya";
                  return (
                    <tr key={row.label} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">{row.label}</td>
                      <td className="p-4 text-right text-muted-foreground">{row.fmt(row.target)}</td>
                      <td className="p-4 text-right font-semibold">{row.fmt(row.actual)}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-24"><AnimatedProgress value={pct} /></div>
                          <span className="text-xs font-bold w-10 text-right">{pct}%</span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className={cn("text-xs px-2 py-1 rounded-full font-medium", statusColor)}>
                          {statusLabel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        Data diperbarui otomatis · Klik <RefreshCw className="inline h-3 w-3" /> untuk refresh manual
        {canEditTargets && " · Klik \"Atur Target\" untuk mengubah target KPI"}
      </p>

      {/* Set Target Dialog */}
      <SetTargetDialog
        open={showTargetDialog}
        onClose={() => setShowTargetDialog(false)}
        current={activeTargets}
        onSave={(v) => saveTargetsMutation.mutate(v)}
        isSaving={saveTargetsMutation.isPending}
      />
    </div>
  );
}
