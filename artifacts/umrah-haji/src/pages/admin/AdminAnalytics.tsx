import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  Filter, X, ArrowUpRight, ArrowDownRight, 
  Download, RefreshCcw, Activity, ShoppingBag,
  MapPin, Briefcase
} from "lucide-react";
import { 
  format, subMonths, startOfMonth, endOfMonth, 
  eachMonthOfInterval, parseISO, subDays, startOfYear 
} from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const COLORS = [
  'hsl(var(--primary))', 
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
];

export default function AdminAnalytics() {
  const { branchId, hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin') || hasRole('owner');

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });
  
  // Filter States
  const [hierarchyLevel, setHierarchyLevel] = useState<'all' | 'pusat' | 'cabang' | 'agen' | 'sub_agen'>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>(branchId || "all");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedSubAgent, setSelectedSubAgent] = useState<string>("all");

  const { data: agents } = useQuery({
    queryKey: ['analytics-agents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agents')
        .select('id, company_name, parent_agent_id, branch_id')
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings, isLoading: loadingBookings, refetch } = useQuery({
    queryKey: ['analytics-bookings', dateRange, selectedBranch, selectedAgent, selectedSubAgent, hierarchyLevel],
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
          agent_id,
          departure_id,
          branch:branches(name),
          departure:departures(id, package_id, package:packages(name))
        `)
        .gte('created_at', dateRange?.from?.toISOString() || subMonths(new Date(), 6).toISOString())
        .lte('created_at', dateRange?.to?.toISOString() || new Date().toISOString())
        .limit(5000);
      
      // Hierarchy Logic
      if (hierarchyLevel === 'pusat') {
        query = query.is('branch_id', null).is('agent_id', null);
      } else if (hierarchyLevel === 'cabang') {
        if (selectedBranch !== "all") query = query.eq('branch_id', selectedBranch);
        else query = query.not('branch_id', 'is', null);
      } else if (hierarchyLevel === 'agen') {
        if (selectedAgent !== "all") query = query.eq('agent_id', selectedAgent);
        else {
          const topLevelAgentIds = (agents || []).filter(a => !a.parent_agent_id).map(a => a.id);
          if (topLevelAgentIds.length > 0) query = query.in('agent_id', topLevelAgentIds);
          else query = query.not('agent_id', 'is', null);
        }
      } else if (hierarchyLevel === 'sub_agen') {
        if (selectedSubAgent !== "all") query = query.eq('agent_id', selectedSubAgent);
        else {
          const subAgentIds = (agents || []).filter(a => a.parent_agent_id !== null).map(a => a.id);
          if (subAgentIds.length > 0) query = query.in('agent_id', subAgentIds);
          else query = query.eq('agent_id', 'none'); // No sub-agents exist
        }
      } else {
        if (selectedBranch !== "all") query = query.eq('branch_id', selectedBranch);
        if (selectedAgent !== "all") query = query.eq('agent_id', selectedAgent);
        if (selectedSubAgent !== "all") query = query.eq('agent_id', selectedSubAgent);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!agents || hierarchyLevel === 'all' || hierarchyLevel === 'pusat' || hierarchyLevel === 'cabang'
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

  const topLevelAgents = useMemo(() => (agents || []).filter(a => !a.parent_agent_id), [agents]);
  const subAgentsList = useMemo(() => {
    if (selectedAgent === "all") return [];
    return (agents || []).filter(a => a.parent_agent_id === selectedAgent);
  }, [agents, selectedAgent]);

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
      const paxCount = branchBookings.reduce((sum, b) => sum + (b.total_pax || 0), 0);
      
      return {
        name: branch.name,
        revenue,
        bookings: bookingCount,
        pax: paxCount
      };
    }).filter(b => b.bookings > 0).sort((a, b) => b.revenue - a.revenue);
  }, [bookings, branches]);

  // Calculate package popularity
  const packageData = useMemo(() => {
    if (!bookings) return [];
    
    const packageMap: Record<string, { name: string, count: number, revenue: number, pax: number }> = {};
    bookings.forEach(b => {
      const pkgId = (b.departure as any)?.package_id || 'unknown';
      const pkgName = (b.departure as any)?.package?.name || 'Paket Tidak Diketahui';
      
      if (!packageMap[pkgId]) {
        packageMap[pkgId] = { name: pkgName, count: 0, revenue: 0, pax: 0 };
      }
      packageMap[pkgId].count += 1;
      packageMap[pkgId].revenue += (b.paid_amount || 0);
      packageMap[pkgId].pax += (b.total_pax || 0);
    });

    return Object.values(packageMap)
      .sort((a, b) => b.pax - a.pax)
      .slice(0, 5);
  }, [bookings]);

  // Summary statistics
  const stats = useMemo(() => {
    const totalRevenue = bookings?.reduce((sum, b) => sum + (b.paid_amount || 0), 0) || 0;
    const totalPotential = bookings?.reduce((sum, b) => sum + (b.total_price || 0), 0) || 0;
    const totalBookings = bookings?.length || 0;
    const totalPax = bookings?.reduce((sum, b) => sum + (b.total_pax || 0), 0) || 0;
    
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
    setHierarchyLevel('all');
    setSelectedBranch(branchId || "all");
    setSelectedAgent("all");
    setSelectedSubAgent("all");
  };

  return (
    <div className="space-y-6 pb-10 animate-fade-in bg-slate-50/50 -m-4 p-4 md:-m-8 md:p-8 min-h-screen">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary/10 rounded-xl">
              <Activity className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Analytics Dashboard</h1>
              <p className="text-slate-500 font-medium">Wawasan mendalam tentang performa bisnis Vins Tour Travel</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => refetch()} className="h-10 bg-white border-slate-200 hover:bg-slate-50">
            <RefreshCcw className={cn("h-4 w-4 mr-2 text-slate-500", loadingBookings && "animate-spin")} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" className="h-10 bg-white border-slate-200 hover:bg-slate-50">
            <Download className="h-4 w-4 mr-2 text-slate-500" />
            Export Data
          </Button>
          <DateRangePicker 
            date={dateRange} 
            setDate={setDateRange} 
            className="bg-white rounded-md shadow-sm border-slate-200"
          />
        </div>
      </div>

      {/* Filter Toolbar */}
      <Card className="border-none shadow-sm bg-white/80 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-lg">
              {[
                { label: '7H', val: 7 },
                { label: '30H', val: 30 },
                { label: 'Tahun Ini', val: 'year' as const }
              ].map((f) => (
                <button
                  key={f.label}
                  onClick={() => setQuickFilter(f.val)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-md transition-all hover:text-primary focus:outline-none"
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="h-8 w-[1px] bg-slate-200 hidden md:block" />

            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-400" />
                <Select value={hierarchyLevel} onValueChange={(v: any) => setHierarchyLevel(v)}>
                  <SelectTrigger className="w-[140px] h-9 bg-white border-slate-200">
                    <SelectValue placeholder="Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Level</SelectItem>
                    <SelectItem value="pusat">Pusat</SelectItem>
                    <SelectItem value="cabang">Cabang</SelectItem>
                    <SelectItem value="agen">Agen</SelectItem>
                    <SelectItem value="sub_agen">Sub-Agen</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isSuperAdmin && (hierarchyLevel === 'all' || hierarchyLevel === 'cabang') && (
                <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                  <SelectTrigger className="w-[180px] h-9 bg-white border-slate-200">
                    <SelectValue placeholder="Pilih Cabang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Cabang</SelectItem>
                    {branches?.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(hierarchyLevel === 'all' || hierarchyLevel === 'agen') && (
                <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                  <SelectTrigger className="w-[180px] h-9 bg-white border-slate-200">
                    <SelectValue placeholder="Pilih Agen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Agen</SelectItem>
                    {topLevelAgents.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedAgent !== "all" && (hierarchyLevel === 'all' || hierarchyLevel === 'sub_agen') && (
                <Select value={selectedSubAgent} onValueChange={setSelectedSubAgent}>
                  <SelectTrigger className="w-[180px] h-9 bg-white border-slate-200">
                    <SelectValue placeholder="Pilih Sub-Agen" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Sub-Agen</SelectItem>
                    {subAgentsList.map(a => (
                      <SelectItem key={a.id} value={a.id}>{a.company_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              <Button 
                variant="ghost" 
                size="sm" 
                onClick={resetFilters}
                className="text-slate-500 hover:text-red-500 h-9 px-3"
              >
                <X className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalRevenue)}
          description="Total pendapatan diterima"
          icon={DollarSign}
          loading={loadingBookings}
          trend="+12.5%"
          trendUp={true}
          color="emerald"
        />
        <StatCard
          title="Total Booking"
          value={stats.totalBookings}
          description={`${stats.confirmedBookings} pesanan terkonfirmasi`}
          icon={ShoppingBag}
          loading={loadingBookings}
          trend="+8.2%"
          trendUp={true}
          color="blue"
        />
        <StatCard
          title="Total Jamaah"
          value={stats.totalPax}
          description="Perhitungan per jemaah"
          icon={Users}
          loading={loadingBookings}
          trend="+15.3%"
          trendUp={true}
          color="primary"
        />
        <StatCard
          title="Conversion Rate"
          value={`${stats.conversionRate}%`}
          description="Rasio booking terkonfirmasi"
          icon={TrendingUp}
          loading={loadingBookings}
          trend="+2.4%"
          trendUp={true}
          color="amber"
        />
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="ringkasan" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-white border border-slate-200 p-1 h-11">
            <TabsTrigger value="ringkasan" className="px-6 py-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Ringkasan</TabsTrigger>
            <TabsTrigger value="penjualan" className="px-6 py-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Penjualan</TabsTrigger>
            <TabsTrigger value="produk" className="px-6 py-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Produk</TabsTrigger>
            <TabsTrigger value="cabang" className="px-6 py-2 rounded-md data-[state=active]:bg-primary data-[state=active]:text-white transition-all">Cabang</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="ringkasan" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-4">
                <div>
                  <CardTitle className="text-lg font-bold text-slate-800">Tren Revenue & Piutang</CardTitle>
                  <CardDescription>Visualisasi pendapatan vs potensi pendapatan</CardDescription>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 px-3 py-1">
                  Update Realtime
                </Badge>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={monthlyData}>
                      <defs>
                        <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#64748b'}} 
                        dy={10}
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#64748b'}}
                        tickFormatter={(value) => `Rp${value/1000000}jt`}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="revenue" 
                        name="Revenue" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={3}
                        fillOpacity={1} 
                        fill="url(#colorRevenue)" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="potentialRevenue" 
                        name="Potensi" 
                        stroke="#94a3b8" 
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        fill="transparent" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-50 pb-4">
                <CardTitle className="text-lg font-bold text-slate-800">Paket Terpopuler</CardTitle>
                <CardDescription>Berdasarkan jumlah jemaah</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-6">
                  {packageData.map((pkg, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm",
                        i === 0 ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600"
                      )}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{pkg.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="bg-slate-50 text-slate-600 border-slate-100 text-[10px] font-semibold">
                            {pkg.count} Booking
                          </Badge>
                          <span className="text-[10px] text-slate-400 font-medium">•</span>
                          <span className="text-[10px] text-slate-500 font-bold">{pkg.pax} Jamaah</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(pkg.revenue)}</p>
                      </div>
                    </div>
                  ))}
                  {packageData.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                      <Package className="h-12 w-12 mb-3 opacity-20" />
                      <p className="text-sm font-medium">Belum ada data paket</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="penjualan" className="space-y-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-slate-50">
              <CardTitle className="text-lg font-bold text-slate-800">Pertumbuhan Booking & Jamaah</CardTitle>
              <CardDescription>Analisis volume transaksi bulanan</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="h-[400px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="month" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 12, fill: '#64748b'}} 
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fontSize: 12, fill: '#64748b'}} 
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                    <Bar dataKey="bookings" name="Total Booking" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} barSize={40} />
                    <Bar dataKey="pax" name="Total Jamaah" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="produk" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-lg font-bold text-slate-800">Kontribusi Revenue per Paket</CardTitle>
                <CardDescription>Distribusi pendapatan berdasarkan jenis paket</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 flex flex-col items-center">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={packageData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="revenue"
                        nameKey="name"
                      >
                        {packageData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full mt-4">
                  {packageData.map((pkg, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs font-medium text-slate-600 truncate">{pkg.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="border-b border-slate-50">
                <CardTitle className="text-lg font-bold text-slate-800">Efisiensi Penjualan Paket</CardTitle>
                <CardDescription>Rasio jemaah per booking per paket</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={packageData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                      <XAxis type="number" hide />
                      <YAxis 
                        dataKey="name" 
                        type="category" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 11, fill: '#64748b'}} 
                        width={100}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="pax" name="Jamaah" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="cabang" className="space-y-6">
          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-50 pb-4">
              <div>
                <CardTitle className="text-lg font-bold text-slate-800">Matriks Performa Cabang</CardTitle>
                <CardDescription>Detail statistik operasional per cabang</CardDescription>
              </div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                <MapPin className="h-3.5 w-3.5" />
                {branchData.length} Cabang Aktif
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Nama Cabang</th>
                      <th className="px-6 py-4 text-center">Total Booking</th>
                      <th className="px-6 py-4 text-center">Total Jamaah</th>
                      <th className="px-6 py-4 text-right">Revenue</th>
                      <th className="px-6 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {branchData.map((branch, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              <Building2 className="h-4 w-4" />
                            </div>
                            <span className="font-bold text-slate-800">{branch.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Badge variant="outline" className="font-semibold text-slate-600 border-slate-200">
                            {branch.bookings}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="font-bold text-blue-600">{branch.pax}</span>
                        </td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">
                          {formatCurrency(branch.revenue)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary hover:bg-primary/5 font-semibold">
                            Detail
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {branchData.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                          <Briefcase className="h-10 w-10 mx-auto mb-2 opacity-20" />
                          <p className="text-sm font-medium">Tidak ada data performa cabang</p>
                        </td>
                      </tr>
                    )}
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
  const colorMap: Record<string, { text: string, bg: string, border: string, icon: string }> = {
    primary: { text: "text-primary", bg: "bg-primary/5", border: "border-primary/20", icon: "text-primary" },
    blue: { text: "text-blue-700", bg: "bg-blue-50", border: "border-blue-100", icon: "text-blue-600" },
    emerald: { text: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-100", icon: "text-emerald-600" },
    amber: { text: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100", icon: "text-amber-600" },
  };

  const currentTheme = colorMap[color] || colorMap.primary;

  return (
    <Card className="relative overflow-hidden border-none shadow-sm hover:shadow-md transition-all group bg-white">
      <div className={cn("absolute top-0 left-0 w-1 h-full", color === 'primary' ? 'bg-primary' : `bg-${color}-500`)} />
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</CardTitle>
        <div className={cn("p-2 rounded-xl transition-all group-hover:scale-110 group-hover:rotate-3", currentTheme.bg, currentTheme.icon)}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-32 bg-slate-100" />
            <Skeleton className="h-4 w-24 bg-slate-50" />
          </div>
        ) : (
          <>
            <div className="text-2xl font-extrabold tracking-tight text-slate-900">{value}</div>
            <div className="flex items-center gap-2 mt-2">
              {trend && (
                <div className={cn(
                  "flex items-center text-[11px] font-bold px-1.5 py-0.5 rounded-full", 
                  trendUp ? "text-emerald-700 bg-emerald-50" : "text-red-700 bg-red-50"
                )}>
                  {trendUp ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                  {trend}
                </div>
              )}
              {description && <p className="text-[11px] text-slate-500 font-semibold">{description}</p>}
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
      <div className="bg-white/95 backdrop-blur-md border border-slate-100 p-4 rounded-xl shadow-xl min-w-[180px] ring-1 ring-black/5">
        <p className="text-xs font-black text-slate-800 mb-3 border-b border-slate-50 pb-2 uppercase tracking-wider">{label}</p>
        <div className="space-y-2.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[11px] font-bold text-slate-500">{entry.name}:</span>
              </div>
              <span className="text-[11px] font-black text-slate-900">
                {typeof entry.value === 'number' && (entry.name.toLowerCase().includes('revenue') || entry.name.toLowerCase().includes('potensi')) 
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

// Missing icon component for table
function Building2({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/>
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/>
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/>
      <path d="M10 6h4"/>
      <path d="M10 10h4"/>
      <path d="M10 14h4"/>
      <path d="M10 18h4"/>
    </svg>
  );
}
