import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { 
  DollarSign, Users, Calendar, CreditCard, 
  ArrowRight, Package, ShoppingCart, FileText,
  AlertTriangle, AlertCircle, Filter, X, Building2, User
} from "lucide-react";
import { Link } from "react-router-dom";
import { lazy, Suspense, useState, useMemo, useCallback, memo } from "react";
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

// Memoized Stats Card for performance
const StatsCard = memo(({ title, value, subtitle, icon: Icon, loading, highlight, trend }: any) => (
  <Card className={highlight ? "border-primary/50 bg-primary/5" : "transition-all hover:shadow-md"}>
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
));

StatsCard.displayName = "StatsCard";

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

  const { data: stats, isLoading } = useDashboardStats(filters);
  const { data: recentBookings } = useRecentBookings(filters.branchId);
  const { data: upcomingDepartures } = useUpcomingDepartures(filters.branchId);

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
    staleTime: 1000 * 60 * 15,
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
    staleTime: 1000 * 60 * 15,
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

  const resetFilters = useCallback(() => {
    setSelectedBranch(branchId || "all");
    setSelectedAgent("all");
    setDateRange({
      from: subMonths(new Date(), 6),
      to: new Date(),
    });
  }, [branchId]);

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
        <Card className="bg-muted/30 border-dashed animate-in fade-in slide-in-from-top-2 duration-300">
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
        <QuickActionButton to="/admin/packages" icon={Package} label="Tambah Paket" color="text-primary" hoverBg="hover:bg-primary/5" />
        <QuickActionButton to="/admin/bookings" icon={ShoppingCart} label="Verifikasi Bayar" color="text-blue-600" hoverBg="hover:bg-blue-50" />
        <QuickActionButton to="/admin/customers" icon={Users} label="Tambah Jamaah" color="text-green-600" hoverBg="hover:bg-green-50" />
        <QuickActionButton to="/admin/documents-generator" icon={FileText} label="Generate Dokumen" color="text-amber-600" hoverBg="hover:bg-amber-50" />
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
        {((stockAlerts?.critical || 0) > 0 || (stockAlerts?.low || 0) > 0) && (
          <AlertWidget 
            title="Peringatan Stok Perlengkapan" 
            icon={AlertTriangle} 
            colorClass="border-amber-200 bg-amber-50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200"
            link="/admin/equipment"
            linkLabel="Kelola Stok"
          >
            {(stockAlerts?.critical || 0) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Status Habis:</span>
                <Badge variant="destructive">{stockAlerts.critical} item</Badge>
              </div>
            )}
            {(stockAlerts?.low || 0) > 0 && (
              <div className="flex items-center justify-between">
                <span className="text-sm">Status Kritis (≤5):</span>
                <Badge variant="outline" className="border-amber-300">{stockAlerts.low} item</Badge>
              </div>
            )}
          </AlertWidget>
        )}

        {/* Pending Documents Widget */}
        {(pendingDocuments || 0) > 0 && (
          <AlertWidget 
            title="Dokumen Menunggu Verifikasi" 
            icon={AlertCircle} 
            colorClass="border-blue-200 bg-blue-50 dark:bg-blue-950/20 text-blue-900 dark:text-blue-200"
            link="/admin/document-verification"
            linkLabel="Verifikasi Dokumen"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">Total Pending:</span>
              <Badge className="bg-blue-600 dark:bg-blue-700">{pendingDocuments} dokumen</Badge>
            </div>
            <p className="text-xs opacity-80">Segera periksa dan verifikasi dokumen jamaah</p>
          </AlertWidget>
        )}
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
        <RecentDataCard 
          title="Booking Terbaru" 
          link="/admin/bookings" 
          data={recentBookings} 
          renderItem={(booking: any) => (
            <div key={booking.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
              <div>
                <p className="font-mono text-sm font-semibold">{booking.booking_code}</p>
                <p className="text-sm text-muted-foreground">{(booking.customer as any)?.full_name}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold">{formatCurrency(booking.total_price)}</p>
                <Badge variant={booking.payment_status === 'paid' ? 'default' : 'outline'} className="text-[10px] h-5">
                  {booking.payment_status}
                </Badge>
              </div>
            </div>
          )}
          emptyLabel="Tidak ada booking terbaru"
        />

        <RecentDataCard 
          title="Keberangkatan Terdekat" 
          link="/admin/departures" 
          data={upcomingDepartures} 
          renderItem={(departure: any) => (
            <div key={departure.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
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
          )}
          emptyLabel="Tidak ada keberangkatan terdekat"
        />
      </div>
    </div>
  );
}

// Helper Components for cleaner code and better performance
const QuickActionButton = memo(({ to, icon: Icon, label, color, hoverBg }: any) => (
  <Button variant="outline" className={`h-auto flex-col items-center gap-2 py-4 transition-colors ${hoverBg}`} asChild>
    <Link to={to}>
      <Icon className={`h-5 w-5 ${color}`} />
      <span className="text-xs font-semibold">{label}</span>
    </Link>
  </Button>
));
QuickActionButton.displayName = "QuickActionButton";

const AlertWidget = memo(({ title, icon: Icon, colorClass, children, link, linkLabel }: any) => (
  <Card className={`border ${colorClass}`}>
    <CardHeader className="pb-3">
      <CardTitle className="text-base font-medium flex items-center gap-2">
        <Icon className="h-5 w-5" />
        {title}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-2">
        {children}
        <Button variant="outline" size="sm" className="w-full mt-2 bg-transparent" asChild>
          <Link to={link}>{linkLabel}</Link>
        </Button>
      </div>
    </CardContent>
  </Card>
));
AlertWidget.displayName = "AlertWidget";

const RecentDataCard = memo(({ title, link, data, renderItem, emptyLabel }: any) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-base font-medium">{title}</CardTitle>
      <Button variant="ghost" size="sm" asChild>
        <Link to={link}>Lihat Semua</Link>
      </Button>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        {data?.length ? data.map(renderItem) : (
          <div className="text-center py-8 text-muted-foreground text-sm">
            {emptyLabel}
          </div>
        )}
      </div>
    </CardContent>
  </Card>
));
RecentDataCard.displayName = "RecentDataCard";
