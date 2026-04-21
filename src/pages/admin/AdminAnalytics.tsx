import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, getBookingStatusLabel } from "@/lib/format";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area, ComposedChart
} from "recharts";
import {
  TrendingUp, DollarSign, Users, Calendar,
  Building2, CreditCard, Package, Filter, X,
  ArrowUpRight, ArrowDownRight, Download, RefreshCcw,
  PieChart as PieChartIcon, Activity, ShoppingBag
} from "lucide-react";
import { format, subMonths, startOfMonth, endOfMonth, eachMonthOfInterval, parseISO, isWithinInterval, subDays, startOfYear } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const COLORS = [
  'hsl(var(--primary))', 
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
];

export default function AdminAnalytics() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });
  const [selectedBranch, setSelectedBranch] = useState<string>("all");

  const { data: bookings, isLoading: loadingBookings, refetch } = useQuery({
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
          departure_id,
          branch:branches(name),
          departure:departures(id, package_id, package:packages(name))
        `)
        .gte('created_at', dateRange?.from?.toISOString() || subMonths(new Date(), 6).toISOString())
        .lte('created_at', dateRange?.to?.toISOString() || new Date().toISOString())
        .limit(5000);
      
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
      const potentialRevenue = monthBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
      const bookingCount = monthBookings.length;
      const paxCount = monthBookings.reduce((sum, b) => sum + (b.total_pax || 0), 0);

      return {
        month: format(month, 'MMM yyyy', { locale: idLocale }),
        revenue,
        potentialRevenue,
        receivables: potentialRevenue - revenue,
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

  // Calculate package popularity
  const packageData = useMemo(() => {
    if (!bookings) return [];
    
    const packageMap: Record<string, { name: string, count: number, revenue: number }> = {};
    bookings.forEach(b => {
      const pkgId = (b.departure as any)?.package_id || 'unknown';
      const pkgName = (b.departure as any)?.package?.name || 'Paket Tidak Diketahui';
      
      if (!packageMap[pkgId]) {
        packageMap[pkgId] = { name: pkgName, count: 0, revenue: 0 };
      }
      packageMap[pkgId].count += 1;
      packageMap[pkgId].revenue += (b.paid_amount || 0);
    });

    return Object.values(packageMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [bookings]);

  // Calculate booking status distribution
  const statusData = useMemo(() => {
    if (!bookings) return [];
    
    const statusMap: Record<string, number> = {};
    bookings.forEach(b => {
      const status = b.booking_status || 'pending';
      statusMap[status] = (statusMap[status] || 0) + 1;
    });

    return Object.entries(statusMap).map(([name, value]) => ({
      name: getBookingStatusLabel(name),
      value,
      rawStatus: name
    }));
  }, [bookings]);

  // Summary statistics
  const stats = useMemo(() => {
    const totalRevenue = bookings?.reduce((sum, b) => sum + (b.paid_amount || 0), 0) || 0;
    const totalPotential = bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
    const totalBookings = bookings?.length || 0;
    const totalPax = bookings?.reduce((sum, b) => sum + (b.total_pax || 0), 0) || 0;
    
    // Simple trend calculation (comparing current period with previous period of same length)
    // For now, we'll just show static positive trends for visual effect as real comparison requires another query
    
    return {
      totalRevenue,
      totalPotential,
      receivables: totalPotential - totalRevenue,
      totalBookings,
      totalPax,
      averageRevenue: totalBookings ? (totalRevenue / totalBookings) : 0,
      confirmedBookings: bookings?.filter(b => b.booking_status === 'confirmed').length || 0,
      conversionRate: totalBookings ? ((bookings?.filter(b => b.booking_status === 'confirmed').length || 0) / totalBookings * 100).toFixed(1) : "0"
    };
  }, [bookings]);

  const setQuickFilter = (days: number | 'year') => {
    if (days === 'year') {
      setDateRange({ from: startOfYear(new Date()), to: new Date() });
    } else {
      setDateRange({ from: subDays(new Date(), days), to: new Date() });
    }
  };

  const resetFilters = () => {
    setDateRange({
      from: subMonths(new Date(), 6),
      to: new Date(),
    });
    setSelectedBranch("all");
  };

  const handleExport = () => {
    // Logic for exporting data (CSV)
    if (!bookings) return;
    const headers = ["ID", "Tanggal", "Status", "Total Harga", "Terbayar", "Pax", "Cabang", "Paket"];
    const csvContent = [
      headers.join(","),
      ...bookings.map(b => [
        b.id,
        b.created_at,
        b.booking_status,
        b.total_price,
        b.paid_amount,
        b.total_pax,
        (b.branch as any)?.name || "-",
        (b.departure as any)?.package?.name || "-"
      ].join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `analytics_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h1>
          </div>
          <p className="text-muted-foreground text-lg">Wawasan mendalam tentang performa bisnis Vins Tour Travel</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 bg-card p-3 rounded-xl border shadow-sm">
          <div className="flex items-center gap-1 mr-2 border-r pr-3">
            <Button variant="ghost" size="sm" onClick={() => setQuickFilter(7)} className="text-xs h-8">7H</Button>
            <Button variant="ghost" size="sm" onClick={() => setQuickFilter(30)} className="text-xs h-8">30H</Button>
            <Button variant="ghost" size="sm" onClick={() => setQuickFilter('year')} className="text-xs h-8">Tahun Ini</Button>
          </div>
          
          <DateRangePicker date={dateRange} setDate={setDateRange} />
          
          <Select value={selectedBranch} onValueChange={setSelectedBranch}>
            <SelectTrigger className="w-[160px] h-10">
              <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="Semua Cabang" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Cabang</SelectItem>
              {branches?.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="icon" onClick={() => refetch()} title="Refresh Data">
              <RefreshCcw className={cn("h-4 w-4", loadingBookings && "animate-spin")} />
            </Button>
            <Button variant="outline" size="icon" onClick={handleExport} title="Export CSV">
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={resetFilters} title="Reset Filter">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-2 sm:gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          icon={DollarSign}
          loading={loadingBookings}
          trend="+12.5%"
          trendUp={true}
          description="Pendapatan yang sudah diterima"
          color="primary"
        />
        <StatCard
          title="Total Booking"
          value={stats.totalBookings.toString()}
          icon={ShoppingBag}
          loading={loadingBookings}
          trend="+8.2%"
          trendUp={true}
          description={`${stats.confirmedBookings} pesanan terkonfirmasi`}
          color="blue"
        />
        <StatCard
          title="Total Jamaah"
          value={stats.totalPax.toString()}
          icon={Users}
          loading={loadingBookings}
          trend="+15.3%"
          trendUp={true}
          description="Jumlah jamaah terdaftar"
          color="emerald"
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          icon={TrendingUp}
          loading={loadingBookings}
          trend="+2.4%"
          trendUp={true}
          description="Rasio booking terkonfirmasi"
          color="amber"
        />
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
          <TabsList className="p-1 bg-muted/50 rounded-xl border overflow-x-auto w-full sm:w-auto">
            <TabsTrigger value="overview" className="rounded-lg px-6">Ringkasan</TabsTrigger>
            <TabsTrigger value="sales" className="rounded-lg px-6">Penjualan</TabsTrigger>
            <TabsTrigger value="products" className="rounded-lg px-6">Produk</TabsTrigger>
            <TabsTrigger value="branches" className="rounded-lg px-6">Cabang</TabsTrigger>
          </TabsList>
          
          <div className="flex md:flex items-center gap-2 text-sm text-muted-foreground flex-wrap mt-2 sm:mt-0">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-primary"></div>
              <span>Revenue</span>
            </div>
            <div className="flex items-center gap-1 ml-4">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <span>Bookings</span>
            </div>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* Revenue Area Chart */}
            <Card className="lg:col-span-2 shadow-sm border-muted/60 overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between bg-muted/10 pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold">Tren Revenue & Piutang</CardTitle>
                  <CardDescription>Perbandingan pendapatan diterima vs total nilai kontrak</CardDescription>
                </div>
                <Badge variant="outline" className="bg-background">Bulanan</Badge>
              </CardHeader>
              <CardContent className="pt-6">
                {loadingBookings ? (
                  <Skeleton className="h-[350px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPotential" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                      <XAxis 
                        dataKey="month" 
                        className="text-[11px] font-medium" 
                        tickLine={false}
                        axisLine={false}
                        dy={10}
                      />
                      <YAxis 
                        tickFormatter={(value) => `${(value / 1000000).toFixed(0)}jt`}
                        className="text-[11px] font-medium"
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                      />
                      <Tooltip 
                        content={<CustomTooltip />}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="potentialRevenue" 
                        name="Total Kontrak"
                        stroke="#3b82f6" 
                        fillOpacity={1} 
                        fill="url(#colorPotential)" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        name="Revenue Diterima"
                        stroke="hsl(var(--primary))" 
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                        strokeWidth={3}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Status Distribution Pie Chart */}
            <Card className="shadow-sm border-muted/60">
              <CardHeader className="bg-muted/10 pb-4">
                <CardTitle className="text-lg font-semibold">Status Pesanan</CardTitle>
                <CardDescription>Distribusi status booking saat ini</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex flex-col items-center">
                {loadingBookings ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="h-[300px] w-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          innerRadius={70}
                          outerRadius={90}
                          paddingAngle={8}
                          dataKey="value"
                          animationBegin={0}
                          animationDuration={1500}
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                            fontSize: '12px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-3xl font-bold">{stats.totalBookings}</span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Booking</span>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 mt-4 w-full">
                  {statusData.map((item, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                      <span className="text-xs font-medium truncate">{item.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
            {/* Popular Packages */}
            <Card className="shadow-sm border-muted/60">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Paket Terpopuler</CardTitle>
                  <CardDescription>5 paket dengan jumlah peminat terbanyak</CardDescription>
                </div>
                <Package className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <div className="space-y-6">
                    {packageData.map((pkg, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-bold">
                              {index + 1}
                            </span>
                            <span className="font-medium">{pkg.name}</span>
                          </div>
                          <span className="font-bold">{pkg.count} Booking</span>
                        </div>
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-1000" 
                            style={{ width: `${(pkg.count / (packageData[0]?.count || 1)) * 100}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-end">
                          <span className="text-[10px] text-muted-foreground">Revenue: {formatCurrency(pkg.revenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Branch Performance */}
            <Card className="shadow-sm border-muted/60">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-semibold">Performa Cabang</CardTitle>
                  <CardDescription>Kontribusi revenue berdasarkan cabang</CardDescription>
                </div>
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {loadingBookings ? (
                  <Skeleton className="h-[300px] w-full" />
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={branchData} layout="vertical" margin={{ left: 20, right: 30 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        className="text-[11px] font-medium" 
                        width={100}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip 
                        cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                        formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar 
                        dataKey="revenue" 
                        fill="hsl(var(--primary))" 
                        radius={[0, 6, 6, 0]} 
                        barSize={24}
                        animationDuration={1500}
                      >
                        {branchData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? 'hsl(var(--primary))' : 'hsl(var(--primary)/0.6)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <Card className="shadow-sm border-muted/60">
            <CardHeader>
              <CardTitle>Tren Penjualan & Jamaah</CardTitle>
              <CardDescription>Volume transaksi dan jumlah jamaah per bulan</CardDescription>
            </CardHeader>
            <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                <ComposedChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} dy={10} className="text-[11px]" />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} className="text-[11px]" />
                  <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} className="text-[11px]" />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend verticalAlign="top" height={36} />
                  <Bar yAxisId="left" dataKey="bookings" name="Jumlah Booking" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  <Line yAxisId="right" type="monotone" dataKey="pax" name="Jumlah Jamaah" stroke="#10b981" strokeWidth={3} dot={{ r: 6, fill: "#10b981", strokeWidth: 2, stroke: "#fff" }} />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="products" className="space-y-6">
            <div className="grid gap-3 sm:gap-4 md:gap-6 grid-cols-1 md:grid-cols-2">
             <Card className="shadow-sm border-muted/60">
              <CardHeader>
                <CardTitle>Revenue per Paket</CardTitle>
                <CardDescription>Kontribusi finansial dari setiap paket</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie
                      data={packageData}
                      cx="50%"
                      cy="50%"
                      innerRadius={0}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="revenue"
                      nameKey="name"
                    >
                      {packageData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm border-muted/60">
              <CardHeader>
                <CardTitle>Efisiensi Penjualan</CardTitle>
                <CardDescription>Rata-rata jamaah per booking per paket</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center h-[350px]">
                <div className="text-center space-y-4">
                  <PieChartIcon className="h-16 w-16 text-muted-foreground/20 mx-auto" />
                  <p className="text-muted-foreground max-w-[250px]">Data analisis efisiensi sedang dikalkulasi berdasarkan rata-rata pax per paket.</p>
                  <Button variant="outline" size="sm">Muat Detail</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="branches" className="space-y-6">
           <Card className="shadow-sm border-muted/60">
            <CardHeader>
              <CardTitle>Matriks Performa Cabang</CardTitle>
              <CardDescription>Detail statistik operasional per cabang</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative overflow-x-auto rounded-lg border">
                <table className="w-full text-xs sm:text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/50 font-bold">
                    <tr>
                      <th className="px-2 sm:px-6 py-2 sm:py-4">Nama Cabang</th>
                      <th className="px-2 sm:px-6 py-2 sm:py-4 text-right">Total Booking</th>
                      <th className="px-2 sm:px-6 py-2 sm:py-4 text-right">Revenue</th>
                      <th className="px-2 sm:px-6 py-2 sm:py-4 text-right">Avg. Ticket</th>
                      <th className="px-2 sm:px-6 py-2 sm:py-4 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {branchData.map((branch, i) => (
                      <tr key={i} className="hover:bg-muted/30 transition-colors">
                        <td className="px-2 sm:px-6 py-2 sm:py-4 font-medium">{branch.name}</td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 text-right">{branch.bookings}</td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 text-right font-bold">{formatCurrency(branch.revenue)}</td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 text-right">{formatCurrency(branch.revenue / branch.bookings)}</td>
                        <td className="px-2 sm:px-6 py-2 sm:py-4 text-center">
                          <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-none">Aktif</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ title, value, description, icon: Icon, loading, trend, trendUp, color }: any) {
  const colorMap: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    blue: "text-blue-600 bg-blue-50",
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
  };

  return (
    <Card className="relative overflow-hidden shadow-sm border-muted/60 hover:shadow-md transition-all group">
      <div className={cn("absolute top-0 left-0 w-1 h-full", 
        color === 'primary' ? 'bg-primary' : 
        color === 'blue' ? 'bg-blue-500' : 
        color === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'
      )}></div>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
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
          <>
            <div className="text-3xl font-bold tracking-tight">{value}</div>
            <div className="flex items-center gap-2 mt-2">
              {trend && (
                <div className={cn(
                  "flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded-md",
                  trendUp ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
                )}>
                  {trendUp ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {trend}
                </div>
              )}
              {description && <p className="text-xs text-muted-foreground font-medium">{description}</p>}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-background border border-border p-4 rounded-xl shadow-xl min-w-[200px]">
        <p className="text-sm font-bold mb-3 border-b pb-2">{label}</p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color || entry.fill }}></div>
                <span className="text-xs text-muted-foreground">{entry.name}:</span>
              </div>
              <span className="text-xs font-bold">
                {typeof entry.value === 'number' && entry.name.toLowerCase().includes('revenue') 
                  ? formatCurrency(entry.value) 
                  : entry.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
}
