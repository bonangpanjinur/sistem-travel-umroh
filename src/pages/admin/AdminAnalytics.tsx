import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/format";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import {
  TrendingUp, DollarSign, Users, Calendar,
  Building2, CreditCard, Package, Filter, X
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isWithinInterval } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  const { data: bookings, isLoading: loadingBookings } = useQuery({
    queryKey: ['analytics-bookings', dateRange, selectedBranch],
    queryFn: async () => {
      let query = supabase
        .from('bookings')
        .select(`
          id,
          total_price,
          paid_amount,
          booking_status,
          payment_status,
          created_at,
          total_pax,
          branch_id,
          branch:branches(name)
        `)
        .gte('created_at', dateRange?.from?.toISOString() || subMonths(new Date(), 6).toISOString())
        .lte('created_at', dateRange?.to?.toISOString() || new Date().toISOString())
        .limit(2000);
      
      if (selectedBranch !== "all") {
        query = query.eq('branch_id', selectedBranch);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: branches } = useQuery({
    queryKey: ['analytics-branches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('id, name')
        .eq('is_active', true);
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate monthly revenue data
  const monthlyData = useMemo(() => {
    if (!bookings || !dateRange?.from || !dateRange?.to) return [];
    
    const months = eachMonthOfInterval({
      start: dateRange.from,
      end: dateRange.to
    });

    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthBookings = bookings.filter(b => {
        if (!b.created_at) return false;
        const date = parseISO(b.created_at);
        return date >= monthStart && date <= monthEnd;
      });

      const revenue = monthBookings.reduce((sum, b) => sum + (b.paid_amount || 0), 0);
      const bookingCount = monthBookings.length;
      const paxCount = monthBookings.reduce((sum, b) => sum + (b.total_pax || 0), 0);

      return {
        month: format(month, 'MMM yyyy', { locale: idLocale }),
        revenue,
        bookings: bookingCount,
        pax: paxCount
      };
    });
  }, [bookings, dateRange]);

  // Calculate branch statistics
  const branchData = useMemo(() => {
    if (!bookings || !branches) return [];
    
    return branches.map(branch => {
      const branchBookings = bookings.filter(b => b.branch_id === branch.id);
      const revenue = branchBookings.reduce((sum, b) => sum + (b.paid_amount || 0), 0);
      const bookingCount = branchBookings.length;
      
      return {
        name: branch.name,
        revenue,
        bookings: bookingCount
      };
    }).filter(b => b.bookings > 0).sort((a, b) => b.revenue - a.revenue);
  }, [bookings, branches]);

  // Calculate booking status distribution
  const statusData = useMemo(() => {
    if (!bookings) return [];
    
    const statusMap: Record<string, number> = {};
    bookings.forEach(b => {
      const status = b.booking_status || 'pending';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });

    return Object.entries(statusMap).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value
    }));
  }, [bookings]);

  // Summary statistics
  const stats = useMemo(() => ({
    totalRevenue: bookings?.reduce((sum, b) => sum + (b.paid_amount || 0), 0) || 0,
    totalBookings: bookings?.length || 0,
    totalPax: bookings?.reduce((sum, b) => sum + (b.total_pax || 0), 0) || 0,
    averageRevenue: bookings?.length 
      ? (bookings.reduce((sum, b) => sum + (b.paid_amount || 0), 0) / bookings.length) 
      : 0,
    confirmedBookings: bookings?.filter(b => b.booking_status === 'confirmed').length || 0,
  }), [bookings]);

  const resetFilters = () => {
    setDateRange({
      from: subMonths(new Date(), 6),
      to: new Date(),
    });
    setSelectedBranch("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics Dashboard</h1>
          <p className="text-muted-foreground">Statistik dan analisis performa bisnis</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Semua Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Cabang</SelectItem>
              {branches?.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={resetFilters} title="Reset Filter">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          loading={loadingBookings}
          trend={stats.totalRevenue > 0 ? "+12%" : undefined}
        />
        <StatCard
          title="Total Booking"
          value={stats.totalBookings.toString()}
          icon={Calendar}
          loading={loadingBookings}
          subtitle={`${stats.confirmedBookings} confirmed`}
        />
        <StatCard
          title="Total Jamaah"
          value={stats.totalPax.toString()}
          icon={Users}
          loading={loadingBookings}
        />
        <StatCard
          title="Rata-rata per Booking"
          value={formatCurrency(stats.averageRevenue)}
          icon={TrendingUp}
          loading={loadingBookings}
        />
      </div>

      <Tabs defaultValue="revenue" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid md:grid-cols-4">
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="bookings">Booking Trends</TabsTrigger>
          <TabsTrigger value="branches">Per Cabang</TabsTrigger>
          <TabsTrigger value="status">Status</TabsTrigger>
        </TabsList>

        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DollarSign className="h-4 w-4 text-primary" />
                Revenue Bulanan
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBookings ? (
                <Skeleton className="h-[350px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                    <XAxis dataKey="month" className="text-[10px]" />
                    <YAxis 
                      tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`}
                      className="text-[10px]"
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="revenue" 
                      stroke="hsl(var(--primary))" 
                      fillOpacity={1} 
                      fill="url(#colorRevenue)" 
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  Jumlah Booking per Bulan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis dataKey="month" className="text-[10px]" />
                      <YAxis className="text-[10px]" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar dataKey="bookings" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-green-500" />
                  Jumlah Jamaah per Bulan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis dataKey="month" className="text-[10px]" />
                      <YAxis className="text-[10px]" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Line type="monotone" dataKey="pax" stroke="hsl(var(--chart-3))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="branches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-amber-500" />
                Revenue per Cabang
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingBookings ? (
                <Skeleton className="h-[350px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={branchData} layout="vertical" margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                    <XAxis type="number" tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`} className="text-[10px]" />
                    <YAxis dataKey="name" type="category" className="text-[10px]" width={100} />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="status" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Distribusi Status Booking</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center">
                {loadingBookings ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <>
                    <div className="h-[250px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {statusData.map((entry, index) => (
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
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, loading, trend }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
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
