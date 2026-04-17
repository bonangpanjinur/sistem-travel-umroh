import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { 
  DollarSign, Users, Calendar, CreditCard, 
  TrendingUp, ArrowRight, Package, ShoppingCart, FileText,
  AlertTriangle, CheckCircle2, AlertCircle
} from "lucide-react";
import { Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import {
  AreaChart, Area, BarChart, Bar,
  ResponsiveContainer, XAxis
} from "recharts";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useDashboardStats, useRecentBookings, useUpcomingDepartures } from "@/hooks/useDashboardStats";
import { useRealtimeSubscription, useMultipleRealtimeSubscriptions } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

// Lazy load heavy chart components
const DashboardCharts = lazy(() => import('./DashboardCharts').then(m => ({ default: m.DashboardCharts })));

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function AdminDashboard() {
  const { branchId, hasRole } = useAuth();
  const effectiveBranchId = hasRole('super_admin') || hasRole('owner') ? null : branchId;
  const { data: stats, isLoading } = useDashboardStats(effectiveBranchId);
  const { data: recentBookings } = useRecentBookings(effectiveBranchId);
  const { data: upcomingDepartures } = useUpcomingDepartures(effectiveBranchId);

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

  // Fetch latest audit logs for Phase 4
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

  // Realtime hanya untuk bookings & payments (paling sering update). 
  // Sisanya pakai staleTime 5min — cukup hemat bandwidth.
  useMultipleRealtimeSubscriptions(
    ['bookings', 'payments'],
    [
      ['admin-dashboard-stats'],
      ['admin-recent-bookings'],
    ]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Selamat datang di Admin Panel</p>
        </div>
        <Button asChild>
          <Link to="/admin/analytics">
            Lihat Analytics Lengkap
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Quick Actions Section */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-4">
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4" asChild>
          <Link to="/admin/packages">
            <Package className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold">Tambah Paket</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4" asChild>
          <Link to="/admin/bookings">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-semibold">Verifikasi Bayar</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4" asChild>
          <Link to="/admin/customers">
            <Users className="h-5 w-5 text-green-600" />
            <span className="text-xs font-semibold">Tambah Jamaah</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto flex-col items-center gap-2 py-4" asChild>
          <Link to="/admin/documents-generator">
            <FileText className="h-5 w-5 text-amber-600" />
            <span className="text-xs font-semibold">Generate Dokumen</span>
          </Link>
        </Button>
      </div>

      {/* Stats Cards with Mini Charts */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCardWithChart
          title="Total Pendapatan"
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={DollarSign}
          loading={isLoading}
          chartData={stats?.monthlyRevenue || []}
          dataKey="revenue"
          color="hsl(var(--primary))"
        />
        <StatsCardWithChart
          title="Total Booking"
          value={stats?.totalBookings?.toString() || '0'}
          subtitle={`${stats?.pendingBookings || 0} pending`}
          icon={Calendar}
          loading={isLoading}
          chartData={stats?.monthlyRevenue || []}
          dataKey="bookings"
          color="hsl(var(--chart-2))"
          chartType="bar"
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
          highlight
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
              {recentBookings?.map((booking) => (
                <div 
                  key={booking.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div>
                    <p className="font-mono text-sm font-semibold">{booking.booking_code}</p>
                    <p className="text-sm text-muted-foreground">
                      {(booking.customer as any)?.full_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(booking.total_price)}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {({ pending: 'Menunggu', unpaid: 'Belum Bayar', partial: 'Sebagian', paid: 'Lunas', refunded: 'Dikembalikan' } as Record<string, string>)[booking.payment_status || ''] || booking.payment_status}
                    </p>
                  </div>
                </div>
              ))}
              {(!recentBookings || recentBookings.length === 0) && (
                <p className="text-center text-muted-foreground py-4">Belum ada booking</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Departures */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-medium">Keberangkatan Mendatang</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/packages">Lihat Semua</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingDepartures?.map((departure) => (
                <div 
                  key={departure.id} 
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Package className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{(departure.package as any)?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(departure.departure_date), 'dd MMM yyyy', { locale: idLocale })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">
                      {departure.booked_count || 0}/{departure.quota}
                    </p>
                    <p className="text-xs text-muted-foreground">pax</p>
                  </div>
                </div>
              ))}
              {(!upcomingDepartures || upcomingDepartures.length === 0) && (
                <p className="text-center text-muted-foreground py-4">Belum ada keberangkatan</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  loading?: boolean;
  highlight?: boolean;
}

function StatsCard({ title, value, subtitle, icon: Icon, loading, highlight }: StatsCardProps) {
  return (
    <Card className={highlight ? 'border-amber-300 bg-amber-50 dark:bg-amber-950/20' : ''}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <>
                <p className="text-2xl font-bold">{value}</p>
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </>
            )}
          </div>
          <div className={`p-3 rounded-full ${highlight ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-primary/10'}`}>
            <Icon className={`h-6 w-6 ${highlight ? 'text-amber-600' : 'text-primary'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatsCardWithChartProps extends StatsCardProps {
  chartData: Array<{ month: string; revenue?: number; bookings?: number }>;
  dataKey: string;
  color: string;
  chartType?: 'area' | 'bar';
}

function StatsCardWithChart({ 
  title, value, subtitle, icon: Icon, loading, chartData, dataKey, color, chartType = 'area' 
}: StatsCardWithChartProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24 mt-1" />
            ) : (
              <>
                <p className="text-2xl font-bold">{value}</p>
                {subtitle && (
                  <p className="text-xs text-muted-foreground">{subtitle}</p>
                )}
              </>
            )}
          </div>
          <div className="p-2 rounded-full bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
        </div>
        {!loading && chartData.length > 0 && (
          <div className="h-[60px] mt-2">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'area' ? (
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={color} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" hide />
                  <Area 
                    type="monotone" 
                    dataKey={dataKey} 
                    stroke={color} 
                    fillOpacity={1} 
                    fill={`url(#gradient-${dataKey})`}
                    strokeWidth={2}
                  />
                </AreaChart>
              ) : (
                <BarChart data={chartData}>
                  <XAxis dataKey="month" hide />
                  <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
