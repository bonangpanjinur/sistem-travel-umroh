import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar, 
  DollarSign, 
  Target,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Search,
  Filter,
  Download,
  CalendarDays,
  Clock,
  Briefcase,
  ChevronRight,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  subMonths, 
  startOfQuarter, 
  endOfQuarter, 
  eachDayOfInterval, 
  isSameDay,
  subDays
} from "date-fns";
import { id } from "date-fns/locale";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";

const MONTHLY_TARGETS = {
  bookings: 150,
  revenue: 3500000000,
  leads: 500,
  conversion: 30
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
};

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

export default function AdminKPIDashboard() {
  const [period, setPeriod] = useState<"this_month" | "last_month" | "this_quarter">("this_month");
  
  const getRange = () => {
    const now = new Date();
    if (period === "this_month") return { start: startOfMonth(now).toISOString(), end: endOfMonth(now).toISOString() };
    if (period === "last_month") return { start: startOfMonth(subMonths(now, 1)).toISOString(), end: endOfMonth(subMonths(now, 1)).toISOString() };
    return { start: startOfQuarter(now).toISOString(), end: endOfQuarter(now).toISOString() };
  };

  const range = getRange();

  const { data: kpiData, isLoading, refetch } = useQuery({
    queryKey: ["admin-kpi", period],
    queryFn: async () => {
      const [bookingsRes, leadsRes, revenueRes] = await Promise.all([
        supabase.from("bookings").select("id, created_at, total_price, booking_status").gte("created_at", range.start).lte("created_at", range.end),
        supabase.from("leads").select("id, created_at").gte("created_at", range.start).lte("created_at", range.end),
        supabase.from("bookings").select("total_price").eq("booking_status", "confirmed").gte("created_at", range.start).lte("created_at", range.end)
      ]);

      const bookings = bookingsRes.data || [];
      const leads = leadsRes.data || [];
      const revenue = (revenueRes.data || []).reduce((sum, b) => sum + Number(b.total_price || 0), 0);
      
      const confirmedBookings = bookings.filter(b => b.booking_status === "confirmed").length;
      const conversionRate = leads.length > 0 ? (confirmedBookings / leads.length) * 100 : 0;

      return {
        bookings: confirmedBookings,
        leads: leads.length,
        revenue,
        conversionRate,
        rawBookings: bookings,
        rawLeads: leads
      };
    }
  });

  const { data: prevData } = useQuery({
    queryKey: ["admin-kpi-prev", period],
    queryFn: async () => {
      const now = new Date();
      let prevRange;
      if (period === "this_month") prevRange = { start: startOfMonth(subMonths(now, 1)).toISOString(), end: endOfMonth(subMonths(now, 1)).toISOString() };
      else if (period === "last_month") prevRange = { start: startOfMonth(subMonths(now, 2)).toISOString(), end: endOfMonth(subMonths(now, 2)).toISOString() };
      else prevRange = { start: startOfQuarter(subMonths(now, 3)).toISOString(), end: endOfQuarter(subMonths(now, 3)).toISOString() };

      const [bookingsRes, leadsRes] = await Promise.all([
        supabase.from("bookings").select("id").eq("booking_status", "confirmed").gte("created_at", prevRange.start).lte("created_at", prevRange.end),
        supabase.from("leads").select("id").gte("created_at", prevRange.start).lte("created_at", prevRange.end),
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
      if (!b.created_at) return;
      const w = format(new Date(b.created_at), "dd MMM");
      if (!weeks[w]) weeks[w] = { week: w, bookings: 0, leads: 0 };
      weeks[w].bookings++;
    });

    kpiData.rawLeads?.forEach((l: any) => {
      if (!l.created_at) return;
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
    : 0;

  const leadTrend = prevData?.leads
    ? Math.round(((kpiData?.leads ?? 0) - prevData.leads) / Math.max(prevData.leads, 1) * 100)
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6 p-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">KPI Dashboard</h1>
          <p className="text-muted-foreground">Pantau performa bisnis dan target penjualan secara real-time.</p>
        </div>
        
        <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-lg self-start">
          <Button 
            variant={period === "this_month" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setPeriod("this_month")}
            className="text-xs h-8"
          >
            Bulan Ini
          </Button>
          <Button 
            variant={period === "last_month" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setPeriod("last_month")}
            className="text-xs h-8"
          >
            Bulan Lalu
          </Button>
          <Button 
            variant={period === "this_quarter" ? "default" : "ghost"} 
            size="sm" 
            onClick={() => setPeriod("this_quarter")}
            className="text-xs h-8"
          >
            Kuartal Ini
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-blue-100 text-xs font-medium uppercase tracking-wider">Booking Terkonfirmasi</p>
                <h3 className="text-3xl font-bold mt-1">{kpiData?.bookings ?? 0}</h3>
              </div>
              <div className="p-2 bg-white/10 rounded-lg">
                <Target className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className={cn("flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full", bookingTrend >= 0 ? "bg-emerald-400/20 text-emerald-300" : "bg-red-400/20 text-red-300")}>
                {bookingTrend >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(bookingTrend)}%
              </div>
              <span className="text-blue-200 text-[10px]">vs periode lalu</span>
            </div>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-[10px] text-blue-100">
                <span>Progress Target</span>
                <span>{Math.round(((kpiData?.bookings ?? 0) / targets.bookings) * 100)}%</span>
              </div>
              <Progress value={((kpiData?.bookings ?? 0) / targets.bookings) * 100} className="h-1 bg-white/20 [&>div]:bg-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-emerald-600 to-teal-700 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-emerald-100 text-xs font-medium uppercase tracking-wider">Total Pendapatan</p>
                <h3 className="text-2xl font-bold mt-1 leading-tight">{formatCurrency(kpiData?.revenue ?? 0)}</h3>
              </div>
              <div className="p-2 bg-white/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-emerald-200 text-[10px]">Target: {formatCurrency(targets.revenue)}</span>
            </div>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-[10px] text-emerald-100">
                <span>Progress Target</span>
                <span>{Math.round(((kpiData?.revenue ?? 0) / targets.revenue) * 100)}%</span>
              </div>
              <Progress value={((kpiData?.revenue ?? 0) / targets.revenue) * 100} className="h-1 bg-white/20 [&>div]:bg-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-violet-600 to-purple-700 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-violet-100 text-xs font-medium uppercase tracking-wider">Lead Masuk</p>
                <h3 className="text-3xl font-bold mt-1">{kpiData?.leads ?? 0}</h3>
              </div>
              <div className="p-2 bg-white/10 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <div className={cn("flex items-center text-xs font-medium px-1.5 py-0.5 rounded-full", leadTrend >= 0 ? "bg-emerald-400/20 text-emerald-300" : "bg-red-400/20 text-red-300")}>
                {leadTrend >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                {Math.abs(leadTrend)}%
              </div>
              <span className="text-violet-200 text-[10px]">vs periode lalu</span>
            </div>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-[10px] text-violet-100">
                <span>Progress Target</span>
                <span>{Math.round(((kpiData?.leads ?? 0) / targets.leads) * 100)}%</span>
              </div>
              <Progress value={((kpiData?.leads ?? 0) / targets.leads) * 100} className="h-1 bg-white/20 [&>div]:bg-white" />
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-amber-500 to-orange-600 text-white">
          <CardContent className="p-6">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-amber-100 text-xs font-medium uppercase tracking-wider">Konversi Lead</p>
                <h3 className="text-3xl font-bold mt-1">{kpiData?.conversionRate.toFixed(1)}%</h3>
              </div>
              <div className="p-2 bg-white/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-amber-100 text-[10px]">Target Konversi: {targets.conversion}%</span>
            </div>
            <div className="mt-4 space-y-1">
              <div className="flex justify-between text-[10px] text-amber-100">
                <span>Status Konversi</span>
                <span>{kpiData?.conversionRate && kpiData.conversionRate >= targets.conversion ? "Di Atas Target" : "Di Bawah Target"}</span>
              </div>
              <Progress value={(kpiData?.conversionRate ?? 0) / targets.conversion * 100} className="h-1 bg-white/20 [&>div]:bg-white" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4 text-blue-500" />
              Tren Booking & Lead Harian
            </CardTitle>
            <CardDescription>Visualisasi aktivitas 14 hari terakhir dalam periode ini</CardDescription>
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
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} className="opacity-30" />
                    <XAxis dataKey="week" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ fontSize: 12, borderRadius: 12, border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                    />
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
