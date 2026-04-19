import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { 
  DollarSign, Users, Calendar, CreditCard, 
  ArrowRight, Package, ShoppingCart, FileText,
  AlertTriangle, AlertCircle, Filter, X, Building2, User,
  TrendingUp, TrendingDown, Activity, Bell, CheckCircle2,
  Clock, ArrowUpRight, RefreshCw
} from "lucide-react";
import { Link } from "react-router-dom";
import { lazy, Suspense, useState, useMemo, useCallback, memo } from "react";
import { format, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useDashboardStats, useRecentBookings, useUpcomingDepartures } from "@/hooks/useDashboardStats";
import { useDashboardAlerts } from "@/hooks/useDashboardAlerts";
import { useMultipleRealtimeSubscriptions } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Area, AreaChart, ResponsiveContainer } from "recharts";

// Lazy load heavy chart components
const DashboardCharts = lazy(() => import('./DashboardCharts').then(m => ({ default: m.DashboardCharts })));

// Enhanced Stats Card with Sparkline and Interactivity
const StatsCard = memo(({ title, value, subtitle, icon: Icon, loading, highlight, trend, trendUp, sparklineData, color }: any) => {
  const colorMap: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    blue: "text-blue-600 bg-blue-50",
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
  };

  return (
    <Card className={cn(
      "relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1 group",
      highlight ? "border-primary/50 bg-primary/5" : "border-muted/60"
    )}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
        <div className={cn("p-2 rounded-lg transition-transform group-hover:scale-110", colorMap[color] || colorMap.primary)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            <div className="flex items-center gap-2 mt-1">
              {trend && (
                <div className={cn(
                  "flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md",
                  trendUp ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
                )}>
                  {trendUp ? <TrendingUp className="h-3 w-3 mr-0.5" /> : <TrendingDown className="h-3 w-3 mr-0.5" />}
                  {trend}
                </div>
              )}
              {subtitle && <p className="text-[10px] text-muted-foreground font-medium">{subtitle}</p>}
            </div>
            
            {/* Mini Sparkline for visual trend */}
            {sparklineData && (
              <div className="h-10 w-full mt-4 opacity-50 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData}>
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={trendUp ? "#10b981" : "#ef4444"} 
                      fill={trendUp ? "#10b981" : "#ef4444"} 
                      fillOpacity={0.1} 
                      strokeWidth={2} 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

StatsCard.displayName = "StatsCard";

// Interactive Quick Action Button
const QuickActionButton = ({ to, icon: Icon, label, color, hoverBg, description }: any) => (
  <Link to={to} className="block group">
    <Card className={cn("h-full transition-all duration-300 border-muted/60 group-hover:border-primary/30 group-hover:shadow-md overflow-hidden")}>
      <CardContent className={cn("p-4 flex items-center gap-4", hoverBg)}>
        <div className={cn("p-3 rounded-xl transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm bg-white border", color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold group-hover:text-primary transition-colors truncate">{label}</p>
          <p className="text-[10px] text-muted-foreground truncate">{description || "Klik untuk akses cepat"}</p>
        </div>
        <ArrowUpRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
      </CardContent>
    </Card>
  </Link>
);

export default function AdminDashboard() {
  const { branchId, hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin') || hasRole('owner');
  
  // Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>(branchId || "all");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });

  // Memoize filters to prevent unnecessary re-fetches
  const filters = useMemo(() => ({
    branchId: selectedBranch === "all" ? null : selectedBranch,
    agentId: selectedAgent === "all" ? null : selectedAgent,
    startDate: dateRange?.from,
    endDate: dateRange?.to,
  }), [selectedBranch, selectedAgent, dateRange]);

  const { data: stats, isLoading, refetch } = useDashboardStats(filters);
  const { data: recentBookings } = useRecentBookings(filters.branchId);
  const { data: upcomingDepartures } = useUpcomingDepartures(filters.branchId);

  // Real-time indicators
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Fetch Branches for Filter - Cached
  const { data: branches } = useQuery({
    queryKey: ['dashboard-branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('id, name').eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Fetch Agents for Filter - Cached
  const { data: agents } = useQuery({
    queryKey: ['dashboard-agents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agents').select('id, company_name').limit(100);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  // Combined alerts query (stockAlerts + pendingDocuments + recentAudits)
  const { data: alerts } = useDashboardAlerts();
  const stockAlerts = alerts?.stockAlerts;
  const pendingDocuments = alerts?.pendingDocuments;
  const recentAudits = alerts?.recentAudits;

  useMultipleRealtimeSubscriptions(
    ['bookings', 'payments'],
    [
      ['admin-dashboard-stats'],
      ['admin-recent-bookings'],
    ]
  );

  const resetFilters = useCallback(() => {
    setSelectedBranch(branchId || "all");
    setSelectedAgent("all");
    setDateRange({
      from: subMonths(new Date(), 6),
      to: new Date(),
    });
  }, [branchId]);

  // Mock sparkline data for visual effect
  const mockSparkline = [
    { value: 10 }, { value: 25 }, { value: 15 }, { value: 30 }, { value: 45 }, { value: 35 }, { value: 50 }
  ];

  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl border border-primary/20 shadow-sm">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard Ringkasan</h1>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <p className="text-sm font-medium">Sistem Berjalan Normal • {format(new Date(), 'HH:mm')}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-card p-2.5 rounded-xl border shadow-sm">
          <Button 
            variant={showFilters ? "secondary" : "outline"} 
            onClick={() => setShowFilters(!showFilters)}
            className="h-10 relative"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
            {(selectedBranch !== (branchId || "all") || selectedAgent !== "all") && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full bg-primary text-white">!</Badge>
            )}
          </Button>
          
          <Button variant="outline" size="icon" onClick={handleRefresh} className="h-10 w-10" title="Refresh Data">
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
          </Button>
          
          <Button asChild className="h-10 shadow-sm">
            <Link to="/admin/analytics">
              Analisis Mendalam
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="bg-muted/30 border-dashed animate-in fade-in slide-in-from-top-2 duration-300">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Rentang Tanggal
                </label>
                <DateRangePicker date={dateRange} setDate={setDateRange} className="w-full" />
              </div>

              {isSuperAdmin && (
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> Cabang
                  </label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semua Cabang" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Cabang</SelectItem>
                      {branches?.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Agen
                </label>
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semua Agen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Agen</SelectItem>
                    {agents?.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button variant="ghost" onClick={resetFilters} className="text-xs h-10 w-full md:w-auto">
                  <X className="mr-2 h-3 w-3" /> Reset Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Section */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <QuickActionButton to="/admin/packages" icon={Package} label="Tambah Paket" color="text-primary" hoverBg="hover:bg-primary/5" description="Buat paket umroh baru" />
        <QuickActionButton to="/admin/bookings" icon={ShoppingCart} label="Verifikasi Bayar" color="text-blue-600" hoverBg="hover:bg-blue-50" description="Cek bukti pembayaran" />
        <QuickActionButton to="/admin/customers" icon={Users} label="Tambah Jamaah" color="text-green-600" hoverBg="hover:bg-green-50" description="Registrasi jamaah baru" />
        <QuickActionButton to="/admin/documents-generator" icon={FileText} label="Generate Dokumen" color="text-amber-600" hoverBg="hover:bg-amber-50" description="Cetak manifest & ID Card" />
      </div>

      {/* System Alerts / Health Widgets */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-red-100 bg-red-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-red-800 uppercase">Stok Kritis</p>
              <p className="text-sm font-medium">{stockAlerts?.critical || 0} Item Habis • {stockAlerts?.low || 0} Stok Rendah</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-red-600 hover:bg-red-100">
              <Link to="/admin/equipment">Cek <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card className="border-blue-100 bg-blue-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-800 uppercase">Verifikasi Dokumen</p>
              <p className="text-sm font-medium">{pendingDocuments || 0} Dokumen Menunggu</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-blue-600 hover:bg-blue-100">
              <Link to="/admin/documents/verification">Proses <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-emerald-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-emerald-800 uppercase">Keberangkatan Terdekat</p>
              <p className="text-sm font-medium">{upcomingDepartures?.length || 0} Grup Siap Berangkat</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-emerald-600 hover:bg-emerald-100">
              <Link to="/admin/departures">Lihat <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Pendapatan"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={DollarSign}
          loading={isLoading}
          trend="+12.5%"
          trendUp={true}
          sparklineData={mockSparkline}
          color="primary"
          subtitle="Revenue diterima"
        />
        <StatsCard
          title="Total Booking"
          value={stats?.totalBookings?.toString() || "0"}
          icon={ShoppingCart}
          loading={isLoading}
          trend="+8.2%"
          trendUp={true}
          sparklineData={mockSparkline.map(d => ({ value: d.value * 0.8 }))}
          color="blue"
          subtitle="Pesanan masuk"
        />
        <StatsCard
          title="Total Jamaah"
          value={stats?.totalPax?.toString() || "0"}
          icon={Users}
          loading={isLoading}
          trend="+15.3%"
          trendUp={true}
          sparklineData={mockSparkline.map(d => ({ value: d.value * 1.2 }))}
          color="emerald"
          subtitle="Jamaah terdaftar"
        />
        <StatsCard
          title="Piutang"
          value={formatCurrency(stats?.totalOutstanding || 0)}
          icon={CreditCard}
          loading={isLoading}
          trend="-2.4%"
          trendUp={false}
          sparklineData={mockSparkline.map(d => ({ value: 50 - d.value }))}
          color="amber"
          subtitle="Belum terbayar"
        />
      </div>

      {/* Charts Section */}
      <Suspense fallback={<Skeleton className="h-[400px] w-full rounded-xl" />}>
        <DashboardCharts 
          stats={stats} 
          isLoading={isLoading} 
          recentAudits={recentAudits || []} 
        />
      </Suspense>

      {/* Recent Activity & Upcoming Departures Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bookings Table */}
        <Card className="shadow-sm border-muted/60 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between bg-muted/10 pb-4">
            <div>
              <CardTitle className="text-lg font-bold">Booking Terbaru</CardTitle>
              <CardDescription>Transaksi terakhir yang masuk ke sistem</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/bookings">Semua <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/30 font-bold text-muted-foreground">
                  <tr>
                    <th className="px-6 py-4">Jamaah / Paket</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentBookings && recentBookings.length > 0 ? (
                    recentBookings.map((booking: any) => (
                      <tr key={booking.id} className="hover:bg-muted/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold group-hover:text-primary transition-colors">{booking.customer_name || 'Jamaah'}</span>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[200px]">{booking.package_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className={cn(
                            "text-[10px] font-bold border-none",
                            booking.booking_status === 'confirmed' ? "bg-emerald-50 text-emerald-700" : 
                            booking.booking_status === 'pending' ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"
                          )}>
                            {booking.booking_status?.toUpperCase()}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-right font-bold">
                          {formatCurrency(booking.total_price)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">Belum ada data booking</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Departures */}
        <Card className="shadow-sm border-muted/60 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between bg-muted/10 pb-4">
            <div>
              <CardTitle className="text-lg font-bold">Jadwal Terdekat</CardTitle>
              <CardDescription>Grup yang akan segera berangkat</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/departures">Jadwal <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-4">
              {upcomingDepartures && upcomingDepartures.length > 0 ? (
                upcomingDepartures.map((departure: any) => (
                  <div key={departure.id} className="flex items-center gap-4 p-3 rounded-xl border border-muted/60 hover:border-primary/30 hover:shadow-sm transition-all group">
                    <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-primary/5 border border-primary/10 text-primary">
                      <span className="text-[10px] font-bold uppercase">{format(new Date(departure.departure_date), 'MMM', { locale: idLocale })}</span>
                      <span className="text-lg font-bold leading-none">{format(new Date(departure.departure_date), 'dd')}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate group-hover:text-primary transition-colors">{departure.package_name}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" /> {departure.booked_count}/{departure.quota} Pax
                        </span>
                        <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" /> {format(new Date(departure.departure_date), 'yyyy')}
                        </span>
                      </div>
                    </div>
                    <Badge className="bg-blue-50 text-blue-700 border-none text-[10px]">SIAP</Badge>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                  <Calendar className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-sm">Tidak ada jadwal terdekat</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
