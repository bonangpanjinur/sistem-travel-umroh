import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import { BOOKING_STATUS_LABELS } from "@/lib/constants";
import { useAuth } from "@/hooks/useAuth";
import { useAgentByUserId, useAgentStats, useAgentRecentBookings, useAgentCommissions, useAgentWallet } from "@/hooks/useAgents";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, DollarSign, TrendingUp, Clock, Plus, Users2,
  ArrowRight, CheckCircle2, Package, ExternalLink, Wallet,
  Star, Target, BarChart3, Network, AlertCircle, CalendarCheck,
  ArrowUpRight, ArrowDownRight, Zap, ShoppingCart
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STATUS_COLORS: Record<string, string> = {
  pending: "#f59e0b",
  confirmed: "#10b981",
  processing: "#3b82f6",
  completed: "#6366f1",
  cancelled: "#ef4444",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  confirmed: "Konfirmasi",
  processing: "Proses",
  completed: "Selesai",
  cancelled: "Batal",
};

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  iconColor = "text-primary",
  iconBg = "bg-primary/10",
  trend,
  loading,
  format: fmt = "number",
}: {
  title: string;
  value: number;
  sub?: string;
  icon: React.ElementType;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: number; label: string };
  loading?: boolean;
  format?: "number" | "currency" | "percent";
}) {
  const displayValue =
    fmt === "currency"
      ? formatCurrency(value)
      : fmt === "percent"
      ? `${value.toFixed(1)}%`
      : value.toLocaleString("id-ID");

  return (
    <Card className="relative overflow-hidden">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground font-medium">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-28 mt-2" />
            ) : (
              <p className="text-2xl font-bold mt-1 truncate">{displayValue}</p>
            )}
            {sub && !loading && (
              <p className="text-xs text-muted-foreground mt-1">{sub}</p>
            )}
            {trend && !loading && (
              <div
                className={cn(
                  "flex items-center gap-1 text-xs mt-2 font-medium",
                  trend.value >= 0 ? "text-emerald-600" : "text-red-500"
                )}
              >
                {trend.value >= 0 ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                <span>
                  {Math.abs(trend.value)}% {trend.label}
                </span>
              </div>
            )}
          </div>
          <div className={cn("p-3 rounded-xl flex-shrink-0", iconBg)}>
            <Icon className={cn("h-5 w-5", iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionCard({
  to,
  icon: Icon,
  label,
  desc,
  variant = "default",
}: {
  to: string;
  icon: React.ElementType;
  label: string;
  desc: string;
  variant?: "default" | "primary";
}) {
  return (
    <Link to={to}>
      <Card
        className={cn(
          "group cursor-pointer hover:shadow-md transition-all duration-200 border",
          variant === "primary"
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-primary/20"
            : "hover:border-primary/40"
        )}
      >
        <CardContent className="p-4 flex items-center gap-3">
          <div
            className={cn(
              "p-2.5 rounded-lg transition-colors",
              variant === "primary"
                ? "bg-white/20 group-hover:bg-white/30"
                : "bg-primary/10 group-hover:bg-primary/20"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                variant === "primary" ? "text-primary-foreground" : "text-primary"
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "font-semibold text-sm",
                variant === "primary" ? "text-primary-foreground" : ""
              )}
            >
              {label}
            </p>
            <p
              className={cn(
                "text-xs truncate",
                variant === "primary" ? "text-primary-foreground/70" : "text-muted-foreground"
              )}
            >
              {desc}
            </p>
          </div>
          <ArrowRight
            className={cn(
              "h-4 w-4 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity",
              variant === "primary" ? "text-primary-foreground" : "text-primary"
            )}
          />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AgentDashboard() {
  const { user } = useAuth();
  const { data: agentData, isLoading: loadingAgent } = useAgentByUserId(user?.id);
  const { data: stats, isLoading: loadingStats } = useAgentStats(agentData?.id);
  const { data: recentBookings, isLoading: loadingBookings } = useAgentRecentBookings(agentData?.id);
  const { data: commissions, isLoading: loadingComm } = useAgentCommissions(agentData?.id);
  const { data: wallet } = useAgentWallet(agentData?.id);

  const isLoading = loadingAgent || loadingStats;

  // Sub-agent count
  const { data: subAgents } = useQuery({
    queryKey: ["agent-sub-count", agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agents")
        .select("id, company_name, is_active")
        .eq("parent_agent_id", agentData!.id);
      if (error) return [];
      return data || [];
    },
  });

  // Full booking data for charts
  const { data: allBookings } = useQuery({
    queryKey: ["agent-all-bookings-chart", agentData?.id],
    enabled: !!agentData?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, total_price, booking_status, created_at, departure:departures(package:packages(name))")
        .eq("agent_id", agentData!.id)
        .order("created_at", { ascending: true });
      if (error) return [];
      return data || [];
    },
  });

  // Monthly commission trend (last 6 months)
  const commissionTrend = useMemo(() => {
    const months: { month: string; komisi: number; booking: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const label = format(d, "MMM yy", { locale: idLocale });
      const mStart = startOfMonth(d);
      const mEnd = endOfMonth(d);

      const monthComm =
        commissions
          ?.filter((c) => {
            if (!c.created_at) return false;
            const dt = parseISO(c.created_at);
            return dt >= mStart && dt <= mEnd;
          })
          .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0;

      const monthBook =
        allBookings?.filter((b) => {
          if (!b.created_at) return false;
          const dt = parseISO(b.created_at);
          return dt >= mStart && dt <= mEnd;
        }).length || 0;

      months.push({ month: label, komisi: monthComm, booking: monthBook });
    }
    return months;
  }, [commissions, allBookings]);

  // Booking status distribution
  const statusDist = useMemo(() => {
    const counts: Record<string, number> = {};
    allBookings?.forEach((b) => {
      counts[b.booking_status || "pending"] =
        (counts[b.booking_status || "pending"] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([status, count]) => ({ status, count, label: STATUS_LABELS[status] || status }))
      .sort((a, b) => b.count - a.count);
  }, [allBookings]);

  // Top packages
  const topPackages = useMemo(() => {
    const pkgMap: Record<string, { name: string; count: number; revenue: number }> = {};
    allBookings?.forEach((b: any) => {
      const name = b.departure?.package?.name || "Tanpa Paket";
      if (!pkgMap[name]) pkgMap[name] = { name, count: 0, revenue: 0 };
      pkgMap[name].count++;
      pkgMap[name].revenue += Number(b.total_price || 0);
    });
    return Object.values(pkgMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [allBookings]);

  // Conversion rate (confirmed+completed / total)
  const conversionRate =
    stats && stats.totalBookings > 0
      ? ((stats.confirmedBookings / stats.totalBookings) * 100)
      : 0;

  // Commission collection rate (paid / total)
  const collectionRate =
    stats && stats.totalCommission > 0
      ? ((stats.paidCommission / stats.totalCommission) * 100)
      : 0;

  // This month bookings
  const thisMonthBookings = useMemo(() => {
    const mStart = startOfMonth(new Date());
    return allBookings?.filter((b) => b.created_at && parseISO(b.created_at) >= mStart).length || 0;
  }, [allBookings]);

  const thisMonthComm = useMemo(() => {
    const mStart = startOfMonth(new Date());
    return (
      commissions
        ?.filter((c) => c.created_at && parseISO(c.created_at) >= mStart)
        .reduce((sum, c) => sum + Number(c.commission_amount), 0) || 0
    );
  }, [commissions]);

  return (
    <div className="space-y-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">Dashboard Agent</h1>
            {agentData && (
              <Badge variant="outline" className="font-mono text-xs">
                {agentData.agent_code}
              </Badge>
            )}
            {agentData?.is_active === false && (
              <Badge variant="destructive" className="text-xs">
                <AlertCircle className="h-3 w-3 mr-1" />
                Nonaktif
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-0.5">
            Selamat datang,{" "}
            <span className="font-medium text-foreground">
              {loadingAgent ? "..." : agentData?.company_name || "Agent"}
            </span>
            {agentData && (
              <span className="ml-2 text-xs">
                · Rate komisi{" "}
                <span className="font-semibold text-primary">
                  {agentData.commission_rate}%
                </span>
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild className="bg-gradient-to-r from-primary to-primary/80 shadow-sm">
            <Link to="/agent/register">
              <Plus className="h-4 w-4 mr-2" />
              Daftarkan Jamaah
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/agent/register-group">
              <Users2 className="h-4 w-4 mr-2" />
              Rombongan
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Main Stats ─────────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Jamaah"
          value={stats?.totalBookings || 0}
          sub={`${stats?.confirmedBookings || 0} terkonfirmasi`}
          icon={Users}
          loading={isLoading}
        />
        <StatCard
          title="Total Komisi"
          value={stats?.totalCommission || 0}
          sub={`${collectionRate.toFixed(0)}% sudah cair`}
          icon={DollarSign}
          format="currency"
          loading={isLoading}
        />
        <StatCard
          title="Komisi Pending"
          value={stats?.pendingCommission || 0}
          sub="Menunggu persetujuan"
          icon={Clock}
          iconColor="text-amber-600"
          iconBg="bg-amber-100"
          format="currency"
          loading={isLoading}
        />
        <StatCard
          title="Komisi Cair"
          value={stats?.paidCommission || 0}
          sub="Total sudah dibayarkan"
          icon={TrendingUp}
          iconColor="text-emerald-600"
          iconBg="bg-emerald-100"
          format="currency"
          loading={isLoading}
        />
      </div>

      {/* ── Secondary Stats ────────────────────────────────────────────── */}
      <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
        <Card className="col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Bulan Ini</p>
            <p className="text-xl font-bold text-primary">{thisMonthBookings}</p>
            <p className="text-xs text-muted-foreground">booking baru</p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Komisi Bulan Ini</p>
            <p className="text-xl font-bold text-emerald-600">{formatCurrency(thisMonthComm)}</p>
            <p className="text-xs text-muted-foreground">akumulasi</p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Konversi</p>
            <p className="text-xl font-bold">{conversionRate.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground">booking dikonfirmasi</p>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground mb-1">Sub-Agent</p>
            <p className="text-xl font-bold">{subAgents?.length || 0}</p>
            <p className="text-xs text-muted-foreground">
              {subAgents?.filter((s) => s.is_active).length || 0} aktif
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Wallet Highlight ───────────────────────────────────────────── */}
      {wallet && (
        <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-primary/15">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Saldo Wallet</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(Number(wallet.balance || 0))}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" asChild>
                  <Link to="/agent/wallet">
                    <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                    Lihat Wallet
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Commission Trend Chart ─────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Tren Komisi & Booking</CardTitle>
                <CardDescription>6 bulan terakhir</CardDescription>
              </div>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {loadingComm ? (
              <Skeleton className="h-48 w-full" />
            ) : commissions?.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <BarChart3 className="h-8 w-8 opacity-30" />
                <p className="text-sm">Belum ada data komisi</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={commissionTrend} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorComm" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) =>
                      v >= 1_000_000
                        ? `${(v / 1_000_000).toFixed(1)}jt`
                        : v >= 1_000
                        ? `${(v / 1_000).toFixed(0)}rb`
                        : `${v}`
                    }
                  />
                  <Tooltip
                    formatter={(val: any, name: string) =>
                      name === "komisi" ? [formatCurrency(val), "Komisi"] : [val, "Booking"]
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="komisi"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill="url(#colorComm)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Booking Status Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Status Booking</CardTitle>
            <CardDescription>Distribusi seluruh booking</CardDescription>
          </CardHeader>
          <CardContent>
            {!allBookings || allBookings.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
                <ShoppingCart className="h-8 w-8 opacity-30" />
                <p className="text-sm">Belum ada booking</p>
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={statusDist}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={2}
                      dataKey="count"
                    >
                      {statusDist.map((entry) => (
                        <Cell
                          key={entry.status}
                          fill={STATUS_COLORS[entry.status] || "#94a3b8"}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val, _, props) => [val, props.payload.label]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5 mt-2">
                  {statusDist.map((s) => (
                    <div key={s.status} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: STATUS_COLORS[s.status] || "#94a3b8" }}
                        />
                        <span className="text-muted-foreground">{s.label}</span>
                      </div>
                      <span className="font-semibold">{s.count}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Bottom Section ─────────────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Bookings */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Booking Terbaru</CardTitle>
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                <Link to="/agent/jamaah">
                  Lihat semua <ArrowRight className="h-3 w-3 ml-1" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {loadingBookings ? (
              [1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)
            ) : !recentBookings?.length ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                <ShoppingCart className="h-8 w-8 opacity-30" />
                <p className="text-sm">Belum ada booking</p>
                <Button size="sm" asChild className="mt-1">
                  <Link to="/agent/register">
                    <Plus className="h-3.5 w-3.5 mr-1.5" />
                    Daftarkan Jamaah
                  </Link>
                </Button>
              </div>
            ) : (
              recentBookings.map((booking) => {
                const statusColor =
                  booking.booking_status === "confirmed"
                    ? "text-emerald-600 bg-emerald-50"
                    : booking.booking_status === "cancelled"
                    ? "text-red-600 bg-red-50"
                    : booking.booking_status === "completed"
                    ? "text-indigo-600 bg-indigo-50"
                    : "text-amber-600 bg-amber-50";
                return (
                  <div
                    key={booking.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-1.5 rounded-full bg-primary/10 flex-shrink-0">
                        <CalendarCheck className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-mono text-xs font-bold text-primary">
                          {booking.booking_code}
                        </p>
                        <p className="text-sm font-medium truncate">
                          {(booking.customer as any)?.full_name || "-"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                      <p className="font-semibold text-sm">{formatCurrency(booking.total_price)}</p>
                      <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", statusColor)}>
                        {BOOKING_STATUS_LABELS[booking.booking_status || ""] || booking.booking_status}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Conversion Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Tingkat Konversi
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Booking Terkonfirmasi</span>
                  <span className="font-semibold">{conversionRate.toFixed(1)}%</span>
                </div>
                <Progress value={conversionRate} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.confirmedBookings || 0} dari {stats?.totalBookings || 0} booking
                </p>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">Komisi Terkumpul</span>
                  <span className="font-semibold">{collectionRate.toFixed(1)}%</span>
                </div>
                <Progress value={collectionRate} className="h-2 [&>div]:bg-emerald-500" />
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrency(stats?.paidCommission || 0)} dari{" "}
                  {formatCurrency(stats?.totalCommission || 0)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Top Packages */}
          {topPackages.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500" />
                  Paket Terlaris
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {topPackages.map((pkg, i) => (
                    <div key={pkg.name} className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
                          i === 0
                            ? "bg-amber-100 text-amber-700"
                            : i === 1
                            ? "bg-slate-100 text-slate-600"
                            : "bg-orange-50 text-orange-600"
                        )}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{pkg.name}</p>
                        <p className="text-xs text-muted-foreground">{pkg.count} booking</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sub-agent Summary */}
          {(subAgents?.length || 0) > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Network className="h-4 w-4 text-primary" />
                    Jaringan Sub-Agent
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-6 text-xs" asChild>
                    <Link to="/agent/network">Lihat</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {subAgents?.slice(0, 4).map((sa) => (
                    <div key={sa.id} className="flex items-center justify-between text-xs">
                      <span className="truncate text-muted-foreground max-w-[140px]">
                        {sa.company_name}
                      </span>
                      <Badge
                        variant={sa.is_active ? "default" : "secondary"}
                        className="text-[10px] py-0 h-4"
                      >
                        {sa.is_active ? "Aktif" : "Nonaktif"}
                      </Badge>
                    </div>
                  ))}
                  {(subAgents?.length || 0) > 4 && (
                    <p className="text-xs text-muted-foreground pt-1">
                      +{subAgents!.length - 4} lainnya
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Quick Actions ──────────────────────────────────────────────── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
          Akses Cepat
        </h2>
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
          <QuickActionCard
            to="/agent/register"
            icon={Plus}
            label="Daftarkan Jamaah"
            desc="Booking baru"
            variant="primary"
          />
          <QuickActionCard
            to="/agent/register-group"
            icon={Users2}
            label="Rombongan"
            desc="Booking grup"
          />
          <QuickActionCard
            to="/agent/jamaah"
            icon={Users}
            label="Jamaah Saya"
            desc="Daftar jamaah"
          />
          <QuickActionCard
            to="/agent/commissions"
            icon={DollarSign}
            label="Komisi Saya"
            desc="Riwayat & status"
          />
          <QuickActionCard
            to="/agent/packages"
            icon={Package}
            label="Paket Umroh"
            desc="Katalog paket"
          />
          <QuickActionCard
            to="/agent/network"
            icon={Network}
            label="Jaringan"
            desc="Sub-agent saya"
          />
        </div>
      </div>
    </div>
  );
}
