import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { 
  DollarSign, Users, Calendar, CreditCard, 
  TrendingUp, ArrowRight, Package, ShoppingCart, FileText,
  AlertTriangle, CheckCircle2, AlertCircle, Target, Trophy,
  Activity, Clock, ShieldCheck
} from "lucide-react";
import { Link } from "react-router-dom";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  ResponsiveContainer, Tooltip, XAxis
} from "recharts";
import { format } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { useDashboardStats, useRecentBookings, useUpcomingDepartures } from "@/hooks/useDashboardStats";
import { useRealtimeSubscription, useMultipleRealtimeSubscriptions } from "@/hooks/useRealtimeSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

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

  // Auto-refresh dashboard when bookings, payments, equipment, or documents change
  useMultipleRealtimeSubscriptions(
    ['bookings', 'payments', 'equipment_items', 'customer_documents', 'leads', 'audit_logs'],
    [
      ['admin-dashboard-stats'],
      ['admin-recent-bookings'],
      ['dashboard-stock-alerts'],
      ['dashboard-pending-documents'],
      ['dashboard-recent-audits'],
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

      {/* Phase 3: Analytics Row */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Lead Conversion Funnel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Konversi Leads ({stats?.conversionRate?.toFixed(1) || 0}%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats?.funnelData || []} layout="vertical" margin={{ left: -20 }}>
                    <XAxis type="number" hide />
                    <Tooltip 
                      cursor={{ fill: 'transparent' }}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20}>
                      {(stats?.funnelData || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1">
                  {(stats?.funnelData || []).slice(0, 4).map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground truncate">{entry.name}</span>
                      <span className="font-medium ml-1">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Agent Leaderboard */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Top 5 Agen
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="space-y-4">
                {(stats?.topAgents || []).length > 0 ? (
                  (stats?.topAgents || []).map((agent, index) => (
                    <div key={agent.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-bold">
                          {index + 1}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium leading-none">{agent.name}</span>
                          <span className="text-xs text-muted-foreground">{agent.bookings} bookings</span>
                        </div>
                      </div>
                      <span className="text-sm font-bold">{formatCurrency(agent.revenue)}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex h-[150px] items-center justify-center text-sm text-muted-foreground">
                    Belum ada data agen
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AR Aging / Receivables */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Piutang Tertunggak
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : (
              <div className="flex flex-col items-center">
                <div className="h-[150px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.arData || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={60}
                        dataKey="value"
                      >
                        <Cell fill="hsl(var(--primary))" />
                        <Cell fill="hsl(var(--destructive))" />
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full mt-2 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-primary" /> Terbayar
                    </span>
                    <span className="font-medium text-green-600">{formatCurrency(stats?.totalRevenue || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full bg-destructive" /> Piutang
                    </span>
                    <span className="font-medium text-destructive">{formatCurrency(stats?.totalOutstanding || 0)}</span>
                  </div>
                  <Button variant="ghost" size="sm" className="w-full mt-2 text-xs" asChild>
                    <Link to="/admin/finance/ar">Detail Piutang <ArrowRight className="ml-1 h-3 w-3" /></Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Booking Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Status Booking
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[160px] w-full" />
            ) : (
              <div className="flex items-center gap-4">
                <div className="w-[140px] h-[140px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats?.statusData || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        dataKey="value"
                      >
                        {(stats?.statusData || []).map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 space-y-2">
                  {(stats?.statusData || []).map((item, index) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Audit Log Integration (Phase 4) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" />
              Aktivitas Keamanan Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAudits && recentAudits.length > 0 ? (
                recentAudits.map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 border-b pb-3 last:border-0 last:pb-0">
                    <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                      log.severity === 'critical' ? 'bg-red-500' : 
                      log.severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex flex-col gap-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase text-muted-foreground">{log.action_type}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.created_at), 'HH:mm', { locale: idLocale })}
                        </span>
                      </div>
                      <p className="text-sm line-clamp-1">
                        <span className="font-medium">{log.table_name}</span>: {log.action}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-[150px] items-center justify-center text-sm text-muted-foreground">
                  Belum ada log aktivitas
                </div>
              )}
              <Button variant="ghost" size="sm" className="w-full text-xs" asChild>
                <Link to="/admin/security-audit">Lihat Semua Audit <Activity className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

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
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [
                      dataKey === 'revenue' ? formatCurrency(value) : value,
                      dataKey === 'revenue' ? 'Revenue' : 'Bookings'
                    ]}
                  />
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
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
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
