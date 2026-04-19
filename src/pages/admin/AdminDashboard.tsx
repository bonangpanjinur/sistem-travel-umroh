import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { 
  DollarSign, Users, Calendar, CreditCard, 
  TrendingUp, ArrowRight, Package, ShoppingCart, FileText,
  AlertTriangle, CheckCircle2, AlertCircle, Filter, X, Building2, User
} from "lucide-react";
import { Link } from "react-router-dom";
import { lazy, Suspense, useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  ResponsiveContainer, XAxis
} from "recharts";
import { format, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useDashboardStats, useRecentBookings, useUpcomingDepartures } from "@/hooks/useDashboardStats";
import { useMultipleRealtimeSubscriptions } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Lazy load heavy chart components
const DashboardCharts = lazy(() => import('./DashboardCharts').then(m => ({ default: m.DashboardCharts })));

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

  const filters = useMemo(() => ({
    branchId: selectedBranch === "all" ? null : selectedBranch,
    agentId: selectedAgent === "all" ? null : selectedAgent,
    startDate: dateRange?.from,
    endDate: dateRange?.to,
  }), [selectedBranch, selectedAgent, dateRange]);

  const { data: stats, isLoading } = useDashboardStats(filters);
  const { data: recentBookings } = useRecentBookings(filters.branchId);
  const { data: upcomingDepartures } = useUpcomingDepartures(filters.branchId);

  // Fetch Branches for Filter
  const { data: branches } = useQuery({
    queryKey: ['dashboard-branches'],
    queryFn: async () => {
      const { data, error } = await supabase.from('branches').select('id, name').eq('is_active', true);
      if (error) throw error;
      return data;
    },
    enabled: isSuperAdmin,
  });

  // Fetch Agents for Filter
  const { data: agents } = useQuery({
    queryKey: ['dashboard-agents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('agents').select('id, company_name').limit(100);
      if (error) throw error;
      return data;
    },
  });

  // Fetch inventory stock alerts
  const { data: stockAlerts } = useQuery({
    queryKey: ['dashboard-stock-alerts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_items')
        .select('id, name, stock_quantity')
        .lte('stock_quantity', 5);
      if (error) throw error;
      const critical = (data || []).filter((item: any) => item.stock_quantity === 0);
      const low = (data || []).filter((item: any) => item.stock_quantity > 0 && item.stock_quantity <= 5);
      return { critical: critical.length, low: low.length, total: (data || []).length };
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch pending document verification count
  const { data: pendingDocuments } = useQuery({
    queryKey: ['dashboard-pending-documents'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('customer_documents')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      if (error) throw error;
      return count || 0;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch latest audit logs
  const { data: recentAudits } = useQuery({
    queryKey: ['dashboard-recent-audits'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 5,
  });

  useMultipleRealtimeSubscriptions(
    ['bookings', 'payments'],
    [
      ['admin-dashboard-stats'],
      ['admin-recent-bookings'],
    ]
  );

  const resetFilters = () => {
    setSelectedBranch(branchId || "all");
    setSelectedAgent("all");
    setDateRange({
      from: subMonths(new Date(), 6),
      to: new Date(),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Selamat datang di Admin Panel</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={showFilters ? "secondary" : "outline"} 
            onClick={() => setShowFilters(!showFilters)}
            className="relative"
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
            {(selectedBranch !== (branchId || "all") || selectedAgent !== "all") && (
              <Badge className="ml-2 h-5 w-5 p-0 flex items-center justify-center rounded-full">!</Badge>
            )}
          </Button>
          <Button asChild>
            <Link to="/admin/analytics">
              Lihat Analytics Lengkap
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <Card className="bg-muted/30 border-dashed">
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
              <div className="space-y-2">
                <label className="text-xs font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Rentang Tanggal
                </label>
                <DateRangePicker date={dateRange} setDate={setDateRange} className="w-full" />
              </div>

              {isSuperAdmin && (
                <div className="space-y-2">
                  <label className="text-xs font-medium flex items-center gap-1">
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
                <label className="text-xs font-medium flex items-center gap-1">
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
                <Button variant="ghost" onClick={resetFilters} className="text-xs h-10">
                  <X className="mr-2 h-3 w-3" /> Reset Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Section */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4 hover:bg-primary/5 transition-colors" asChild>
          <Link to="/admin/packages">
            <Package className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold">Tambah Paket</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4 hover:bg-blue-50 transition-colors" asChild>
          <Link to="/admin/bookings">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-semibold">Verifikasi Bayar</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4 hover:bg-green-50 transition-colors" asChild>
          <Link to="/admin/customers">
            <Users className="h-5 w-5 text-green-600" />
            <span className="text-xs font-semibold">Tambah Jamaah</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4 hover:bg-amber-50 transition-colors" asChild>
          <Link to="/admin/documents-generator">
            <FileText className="h-5 w-5 text-amber-600" />
            <span className="text-xs font-semibold">Generate Dokumen</span>
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Pendapatan"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={DollarSign}
          loading={isLoading}
          trend={stats?.totalRevenue > 0 ? "+12.5%" : undefined}
        />
        <StatsCard
          title="Total Booking"
          value={stats?.totalBookings?.toString() || '0'}
          subtitle={`${stats?.pendingBookings || 0} pending`}
          icon={Calendar}
          loading={isLoading}
        />
        <StatsCard
          title="Total Jamaah"
          value={stats?.totalPax?.toString() || '0'}
          subtitle={`${stats?.customerCount || 0} customers`}
          icon={Users}
          loading={isLoading}
        />
        <StatsCard
          title="Pending Verifikasi"
          value={stats?.pendingPaymentCount?.toString() || '0'}
          subtitle={formatCurrency(stats?.pendingPaymentAmount || 0)}
          icon={CreditCard}
          loading={isLoading}
          highlight={stats?.pendingPaymentCount > 0}
        />
      </div>

      {/* Alert Widgets */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Stock Alert Widget */}
        {(stockAlerts?.critical || 0) > 0 || (stockAlerts?.low || 0) > 0 ? (
          <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-5 w-5" />
                Peringatan Stok Perlengkapan
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(stockAlerts?.critical || 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-900 dark:text-amber-200">Status Habis:</span>
                    <Badge variant="destructive">{stockAlerts.critical} item</Badge>
                  </div>
                )}
                {(stockAlerts?.low || 0) > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-amber-900 dark:text-amber-200">Status Kritis (≤5):</span>
                    <Badge variant="outline" className="border-amber-300 text-amber-900 dark:text-amber-200">{stockAlerts.low} item</Badge>
                  </div>
                )}
                <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                  <Link to="/admin/equipment">Kelola Stok</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Pending Documents Widget */}
        {(pendingDocuments || 0) > 0 ? (
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center gap-2 text-blue-900 dark:text-blue-200">
                <AlertCircle className="h-5 w-5" />
                Dokumen Menunggu Verifikasi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-blue-900 dark:text-blue-200">Total Pending:</span>
                  <Badge className="bg-blue-600 dark:bg-blue-700">{pendingDocuments} dokumen</Badge>
                </div>
                <p className="text-xs text-blue-800 dark:text-blue-300">Segera periksa dan verifikasi dokumen jamaah</p>
                <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                  <Link to="/admin/document-verification">Verifikasi Dokumen</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>

      {/* Charts Row - Lazy Loaded */}
      <Suspense fallback={
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-[300px] w-full" />
          <Skeleton className="h-[300px] w-full" />
        </div>
      }>
        <DashboardCharts stats={stats} isLoading={isLoading} recentAudits={recentAudits || []} />
      </Suspense>

      {/* Recent Data */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Booking Terbaru</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/bookings">Lihat Semua</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentBookings?.length ? (
                recentBookings.map((booking) => (
                  <div 
                    key={booking.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-mono text-sm font-semibold">{booking.booking_code}</p>
                      <p className="text-sm text-muted-foreground">
                        {(booking.customer as any)?.full_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold">{formatCurrency(booking.total_price)}</p>
                      <Badge variant={booking.payment_status === 'paid' ? 'default' : 'outline'} className="text-[10px] h-5">
                        {booking.payment_status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Tidak ada booking terbaru
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Departures */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Keberangkatan Terdekat</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/departures">Lihat Semua</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDepartures?.length ? (
                upcomingDepartures.map((departure) => (
                  <div 
                    key={departure.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{(departure.package as any)?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(departure.departure_date), 'dd MMMM yyyy', { locale: idLocale })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-medium">{departure.booked_count} / {departure.quota} Pax</p>
                      <div className="w-20 h-1.5 bg-secondary rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-primary" 
                          style={{ width: `${Math.min(100, (departure.booked_count / departure.quota) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Tidak ada keberangkatan terdekat
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatsCard({ title, value, subtitle, icon: Icon, loading, highlight, trend }: any) {
  return (
    <Card className={highlight ? "border-primary/50 bg-primary/5" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${highlight ? "text-primary" : "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            <div className="flex items-center gap-2 mt-1">
              {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
              {trend && (
                <span className="text-[10px] font-medium text-green-600 bg-green-100 px-1.5 py-0.5 rounded-full">
                  {trend}
                </span>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
