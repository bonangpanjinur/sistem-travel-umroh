import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp, TrendingDown, Target, DollarSign,
  Users, BookOpen, Award, RefreshCw, Calendar,
  ArrowUpRight, ArrowDownRight, Minus
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Bar
} from "recharts";
import { format, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";

// ─── Targets (bisa dipindah ke DB nanti) ──────────────────────────────────────
const MONTHLY_TARGETS = {
  bookings: 50,
  revenue: 2_500_000_000,
  leads: 200,
  conversion: 25, // persen
};

type Period = "this_month" | "last_month" | "this_quarter";

function getPeriodRange(period: Period): { start: string; end: string; label: string } {
  const now = new Date();
  if (period === "this_month") {
    return {
      start: startOfMonth(now).toISOString(),
      end: endOfMonth(now).toISOString(),
      label: format(now, "MMMM yyyy", { locale: idLocale }),
    };
  }
  if (period === "last_month") {
    const last = subMonths(now, 1);
    return {
      start: startOfMonth(last).toISOString(),
      end: endOfMonth(last).toISOString(),
      label: format(last, "MMMM yyyy", { locale: idLocale }),
    };
  }
  return {
    start: startOfQuarter(now).toISOString(),
    end: endOfQuarter(now).toISOString(),
    label: `Q${Math.ceil((now.getMonth() + 1) / 3)} ${now.getFullYear()}`,
  };
}

function AnimatedProgress({ value, color = "default" }: { value: number; color?: string }) {
  const [displayed, setDisplayed] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => setDisplayed(Math.min(100, value)), 100);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div className="relative">
      <Progress
        value={displayed}
        className={cn("h-3 transition-all duration-1000", color)}
      />
      {displayed >= 100 && (
        <span className="absolute -top-0.5 right-0 text-[9px] font-bold text-emerald-600 animate-pulse">
          ✓ TARGET
        </span>
      )}
    </div>
  );
}

function KPICard({
  title, actual, target, unit = "number", icon: Icon, color, trend,
}: {
  title: string;
  actual: number;
  target: number;
  unit?: "number" | "currency" | "percent";
  icon: any;
  color: string;
  trend?: number;
}) {
  const pct = target > 0 ? Math.round((actual / target) * 100) : 0;
  const fmt = (v: number) =>
    unit === "currency" ? formatCurrency(v) :
    unit === "percent" ? `${v.toFixed(1)}%` :
    v.toLocaleString("id-ID");

  const TrendIcon = (trend ?? 0) > 0 ? ArrowUpRight : (trend ?? 0) < 0 ? ArrowDownRight : Minus;
  const trendColor = (trend ?? 0) > 0 ? "text-emerald-500" : (trend ?? 0) < 0 ? "text-red-500" : "text-muted-foreground";

  return (
    <Card className="relative overflow-hidden">
      <div className={cn("absolute inset-0 opacity-5", color)} />
      <CardContent className="p-5 relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-2.5 rounded-xl", color)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
          <div className="text-right">
            {trend !== undefined && (
              <div className={cn("flex items-center gap-1 text-xs font-medium", trendColor)}>
                <TrendIcon className="h-3.5 w-3.5" />
                {Math.abs(trend)}% vs bulan lalu
              </div>
            )}
            <Badge
              variant="outline"
              className={cn(
                "mt-1 text-xs font-bold",
                pct >= 100 ? "border-emerald-500 text-emerald-600" :
                pct >= 70 ? "border-amber-500 text-amber-600" :
                "border-red-400 text-red-500"
              )}
            >
              {pct}%
            </Badge>
          </div>
        </div>

        <div className="space-y-1 mb-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-bold">{fmt(actual)}</p>
          <p className="text-xs text-muted-foreground">
            Target: <span className="font-semibold text-foreground">{fmt(target)}</span>
            {" · "}Sisa: <span className={cn("font-semibold", actual >= target ? "text-emerald-500" : "text-red-500")}>
              {actual >= target ? "✓ Tercapai" : fmt(target - actual)}
            </span>
          </p>
        </div>

        <AnimatedProgress value={pct} />
      </CardContent>
    </Card>
  );
}

export default function AdminKPIDashboard() {
  const [period, setPeriod] = useState<Period>("this_month");
  const range = getPeriodRange(period);

  const { data: kpiData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["kpi-dashboard", period],
    queryFn: async () => {
      const [bookingsRes, paymentsRes, leadsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id, total_price, booking_status, created_at")
          .gte("created_at", range.start)
          .lte("created_at", range.end),
        supabase
          .from("payments")
          .select("amount, status, created_at")
          .eq("status", "paid")
          .gte("created_at", range.start)
          .lte("created_at", range.end),
        supabase
          .from("leads")
          .select("id, status, created_at")
          .gte("created_at", range.start)
          .lte("created_at", range.end),
      ]);

      const bookings = bookingsRes.data || [];
      const payments = paymentsRes.data || [];
      const leads = leadsRes.data || [];

      const confirmedBookings = bookings.filter(b => !["cancelled"].includes(b.booking_status || ""));
      const revenue = payments.reduce((s, p) => s + (p.amount || 0), 0);
      const wonLeads = leads.filter(l => l.status === "won").length;
      const conversionRate = leads.length > 0 ? (wonLeads / leads.length) * 100 : 0;

      return {
        bookings: confirmedBookings.length,
        revenue,
        leads: leads.length,
        conversionRate,
        rawBookings: bookings,
        rawLeads: leads,
      };
    },
    staleTime: 1000 * 60 * 5,
  });

  // Last month for trend calculation
  const { data: prevData } = useQuery({
    queryKey: ["kpi-prev", period],
    queryFn: async () => {
      const prevRange = getPeriodRange("last_month");
      const [bookingsRes, leadsRes] = await Promise.all([
        supabase
          .from("bookings")
          .select("id")
          .gte("created_at", prevRange.start)
          .lte("created_at", prevRange.end),
        supabase
          .from("leads")
          .select("id")
          .gte("created_at", prevRange.start)
          .lte("created_at", prevRange.end),
      ]);
      return {
        bookings: (bookingsRes.data || []).length,
        leads: (leadsRes.data || []).length,
      };
    },
    staleTime: 1000 * 60 * 10,
  });

  // Weekly chart data from raw bookings
  const weeklyData = (() => {
    if (!kpiData?.rawBookings) return [];
    const weeks: Record<string, { week: string; bookings: number; leads: number }> = {};
    kpiData.rawBookings.forEach(b => {
      const w = format(new Date(b.created_at), "dd MMM");
      if (!weeks[w]) weeks[w] = { week: w, bookings: 0, leads: 0 };
      weeks[w].bookings++;
    });
    kpiData.rawLeads?.forEach((l: any) => {
      const w = format(new Date(l.created_at), "dd MMM");
      if (!weeks[w]) weeks[w] = { week: w, bookings: 0, leads: 0 };
      weeks[w].leads++;
    });
    return Object.values(weeks).slice(-14);
  })();

  // Target multiplier for quarterly periods
  const targetMultiplier = period === "this_quarter" ? 3 : 1;
  const targets = {
    bookings: MONTHLY_TARGETS.bookings * targetMultiplier,
    revenue: MONTHLY_TARGETS.revenue * targetMultiplier,
    leads: MONTHLY_TARGETS.leads * targetMultiplier,
    conversion: MONTHLY_TARGETS.conversion,
  };

  const bookingTrend = prevData?.bookings
    ? Math.round(((kpiData?.bookings ?? 0) - prevData.bookings) / Math.max(prevData.bookings, 1) * 100)
    : undefined;
  const leadTrend = prevData?.leads
    ? Math.round(((kpiData?.leads ?? 0) - prevData.leads) / Math.max(prevData.leads, 1) * 100)
    : undefined;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">KPI Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Target vs Aktual — <span className="font-medium text-foreground">{range.label}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">Bulan Ini</SelectItem>
              <SelectItem value="last_month">Bulan Lalu</SelectItem>
              <SelectItem value="this_quarter">Kuartal Ini</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isFetching}>
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-5 h-36 bg-muted/30 rounded-xl" />
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <KPICard
            title="Booking Terkonfirmasi"
            actual={kpiData?.bookings ?? 0}
            target={targets.bookings}
            icon={BookOpen}
            color="bg-blue-500"
            trend={bookingTrend}
          />
          <KPICard
            title="Pendapatan Masuk"
            actual={kpiData?.revenue ?? 0}
            target={targets.revenue}
            unit="currency"
            icon={DollarSign}
            color="bg-emerald-500"
          />
          <KPICard
            title="Lead Masuk"
            actual={kpiData?.leads ?? 0}
            target={targets.leads}
            icon={Users}
            color="bg-violet-500"
            trend={leadTrend}
          />
          <KPICard
            title="Konversi Lead"
            actual={kpiData?.conversionRate ?? 0}
            target={targets.conversion}
            unit="percent"
            icon={Award}
            color="bg-orange-500"
          />
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              Tren Booking Harian
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Belum ada data untuk periode ini
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={weeklyData}>
                  <defs>
                    <linearGradient id="bookingGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v) => [v, "Booking"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="bookings"
                    stroke="#3b82f6"
                    fill="url(#bookingGrad)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-500" />
              Tren Lead Harian
            </CardTitle>
          </CardHeader>
          <CardContent>
            {weeklyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Belum ada data untuk periode ini
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    formatter={(v) => [v, "Lead"]}
                  />
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
                  {
                    label: "Booking Terkonfirmasi",
                    target: targets.bookings,
                    actual: kpiData?.bookings ?? 0,
                    format: (v: number) => v.toLocaleString("id-ID"),
                  },
                  {
                    label: "Pendapatan (Rp)",
                    target: targets.revenue,
                    actual: kpiData?.revenue ?? 0,
                    format: formatCurrency,
                  },
                  {
                    label: "Lead Masuk",
                    target: targets.leads,
                    actual: kpiData?.leads ?? 0,
                    format: (v: number) => v.toLocaleString("id-ID"),
                  },
                  {
                    label: "Konversi Lead (%)",
                    target: targets.conversion,
                    actual: kpiData?.conversionRate ?? 0,
                    format: (v: number) => `${v.toFixed(1)}%`,
                  },
                ].map((row) => {
                  const pct = row.target > 0 ? Math.round((row.actual / row.target) * 100) : 0;
                  const statusColor =
                    pct >= 100 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30" :
                    pct >= 70 ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30" :
                    "bg-red-100 text-red-700 dark:bg-red-900/30";
                  const statusLabel = pct >= 100 ? "Tercapai" : pct >= 70 ? "On Track" : "Perlu Upaya";
                  return (
                    <tr key={row.label} className="hover:bg-muted/30 transition-colors">
                      <td className="p-4 font-medium">{row.label}</td>
                      <td className="p-4 text-right text-muted-foreground">{row.format(row.target)}</td>
                      <td className="p-4 text-right font-semibold">{row.format(row.actual)}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-24">
                            <AnimatedProgress value={pct} />
                          </div>
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
        Data diperbarui setiap 5 menit · Klik <RefreshCw className="inline h-3 w-3" /> untuk refresh manual
      </p>
    </div>
  );
}
