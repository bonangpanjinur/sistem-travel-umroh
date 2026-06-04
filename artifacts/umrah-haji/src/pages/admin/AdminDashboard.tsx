import { useState, useMemo } from "react";
import { useDashboardStats, useRecentBookings, useUpcomingDepartures } from "@/hooks/useDashboardStats";
import { useDashboardAlerts } from "@/hooks/useDashboardAlerts";
import { SuperAdminPanel } from "@/components/admin/SuperAdminPanel";
import { supabaseConfigSource } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, ShoppingCart, DollarSign, TrendingUp, 
  AlertCircle, ArrowRight, Package, Calendar,
  Building2, User, RefreshCcw, Filter, X,
  FileText, Briefcase, Plane, ClipboardCheck, Info,
  CheckCircle2, ExternalLink, Bell
} from "lucide-react";
import { formatCurrency, getBookingStatusLabel, getPaymentStatusLabel } from "@/lib/format";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DashboardCharts } from "./DashboardCharts";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function AdminDashboard() {
  const { branchId, hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin') || hasRole('owner');
  
  // Filter States
  const [hierarchyLevel, setHierarchyLevel] = useState<'all' | 'pusat' | 'cabang' | 'agen' | 'sub_agen'>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>(branchId || "all");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedSubAgent, setSelectedSubAgent] = useState<string>("all");
  
  // New Filter States for Periodic Stats
  const [jamaahFilter, setJamaahFilter] = useState<'all' | 'week' | 'month' | 'year' | '3months' | '6months' | '9months'>('all');
  const [soldFilter, setSoldFilter] = useState<'all' | 'week' | 'month' | 'year' | '3months' | '6months' | '9months'>('all');
  
  // Modal State
  const [isSoldModalOpen, setIsSoldModalOpen] = useState(false);

  const { data: stats, isLoading, refetch } = useDashboardStats({ 
    branchId: selectedBranch,
    agentId: selectedAgent,
    subAgentId: selectedSubAgent,
    hierarchyLevel: hierarchyLevel
  });
  
  const { data: recentBookings, isLoading: loadingBookings } = useRecentBookings(selectedBranch);
  const { data: upcomingDepartures, isLoading: loadingDepartures } = useUpcomingDepartures(selectedBranch);
  const { data: alerts, isLoading: loadingAlerts } = useDashboardAlerts();

  // Calculate periodic stats
  const periodicStats = useMemo(() => {
    if (!stats) return { 
      jamaah: { week: 0, month: 0, year: 0, m3: 0, m6: 0, m9: 0 },
      sold: { week: 0, month: 0, year: 0, m3: 0, m6: 0, m9: 0 }
    };
    
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const currentYear = now.getFullYear();

    // Helper to get sum for last X months
    const getSumLastMonths = (data: any[], count: number, key: string) => {
      const monthsToInclude: string[] = [];
      for (let i = 0; i < count; i++) {
        monthsToInclude.push(format(subMonths(monthStart, i), 'MMM yyyy', { locale: idLocale }));
      }
      return data?.filter((m: any) => monthsToInclude.includes(m.month))
        .reduce((sum: number, m: any) => sum + (m[key] || 0), 0) || 0;
    };

    // Format: "21 Apr - 27 Apr" (matching the format from useDashboardStats)
    const currentWeekKey = `${format(weekStart, 'dd MMM', { locale: idLocale })} - ${format(weekEnd, 'dd MMM', { locale: idLocale })}`;
    const currentMonthKey = format(monthStart, 'MMM yyyy', { locale: idLocale });
    
    // Jamaah
    const jamaahWeek = stats.weeklyJamaahData?.find((w: any) => w.week === currentWeekKey)?.jamaah || 0;
    const jamaahMonth = stats.monthlyJamaahData?.find((m: any) => m.month === currentMonthKey)?.jamaah || 0;
    const jamaahYear = stats.monthlyJamaahData?.filter((m: any) => m.month.endsWith(currentYear.toString()))
      .reduce((sum: number, m: any) => sum + m.jamaah, 0) || 0;
    const jamaah3m = getSumLastMonths(stats.monthlyJamaahData, 3, 'jamaah');
    const jamaah6m = getSumLastMonths(stats.monthlyJamaahData, 6, 'jamaah');
    const jamaah9m = getSumLastMonths(stats.monthlyJamaahData, 9, 'jamaah');

    // Sold
    const soldWeek = stats.weeklySoldData?.find((w: any) => w.week === currentWeekKey)?.sold || 0;
    const soldMonth = stats.monthlySoldData?.find((m: any) => m.month === currentMonthKey)?.sold || 0;
    const soldYear = stats.monthlySoldData?.filter((m: any) => m.month.endsWith(currentYear.toString()))
      .reduce((sum: number, m: any) => sum + m.sold, 0) || 0;
    const sold3m = getSumLastMonths(stats.monthlySoldData, 3, 'sold');
    const sold6m = getSumLastMonths(stats.monthlySoldData, 6, 'sold');
    const sold9m = getSumLastMonths(stats.monthlySoldData, 9, 'sold');

    return {
      jamaah: { week: jamaahWeek, month: jamaahMonth, year: jamaahYear, m3: jamaah3m, m6: jamaah6m, m9: jamaah9m },
      sold: { week: soldWeek, month: soldMonth, year: soldYear, m3: sold3m, m6: sold6m, m9: sold9m }
    };
  }, [stats]);

  const filteredJamaahCount = useMemo(() => {
    if (jamaahFilter === 'week') return periodicStats.jamaah.week;
    if (jamaahFilter === 'month') return periodicStats.jamaah.month;
    if (jamaahFilter === 'year') return periodicStats.jamaah.year;
    if (jamaahFilter === '3months') return periodicStats.jamaah.m3;
    if (jamaahFilter === '6months') return periodicStats.jamaah.m6;
    if (jamaahFilter === '9months') return periodicStats.jamaah.m9;
    return stats?.totalJamaah || 0;
  }, [jamaahFilter, periodicStats, stats]);

  const filteredSoldCount = useMemo(() => {
    if (soldFilter === 'week') return periodicStats.sold.week;
    if (soldFilter === 'month') return periodicStats.sold.month;
    if (soldFilter === 'year') return periodicStats.sold.year;
    if (soldFilter === '3months') return periodicStats.sold.m3;
    if (soldFilter === '6months') return periodicStats.sold.m6;
    if (soldFilter === '9months') return periodicStats.sold.m9;
    return stats?.soldPackagesCount || 0;
  }, [soldFilter, periodicStats, stats]);

  const getLabel = (filter: string) => {
    if (filter === 'week') return "Minggu Ini";
    if (filter === 'month') return "Bulan Ini";
    if (filter === '3months') return "3 Bulan Terakhir";
    if (filter === '6months') return "6 Bulan Terakhir";
    if (filter === '9months') return "9 Bulan Terakhir";
    if (filter === 'year') return "Tahun Ini";
    return "Total Keseluruhan";
  };

  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      {/* Header & Action Button */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard Ringkasan</h1>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <p className="text-sm font-medium">Sistem Berjalan Normal • {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => { refetch(); }} className="h-10 w-10 rounded-xl shadow-sm">
            <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </Button>
          <Button className="h-10 px-6 bg-primary hover:bg-primary/90 text-white font-semibold shadow-md rounded-xl transition-all hover:scale-105 active:scale-95" asChild>
            <Link to="/admin/analytics">Analisis Mendalam <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </div>
      </div>

      {/* Super Admin Quick-Access Panel */}
      {isSuperAdmin && (
        <SuperAdminPanel
          stats={{
            totalJamaah: stats?.totalJamaah,
            totalBookings: stats?.totalBookings,
            pendingPaymentsCount: stats?.pendingPaymentCount,
            upcomingDeparturesCount: upcomingDepartures?.length,
            totalPackages: stats?.soldPackagesCount,
            totalAgents: stats?.agents?.length,
          }}
          isLoading={isLoading}
          supabaseConnected={!!supabaseConfigSource.url}
        />
      )}

      {/* Quick Action Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="group hover:border-primary/50 transition-all cursor-pointer overflow-hidden relative">
          <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
            <Package className="h-24 w-24" />
          </div>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-100 rounded-xl text-amber-600 group-hover:scale-110 transition-transform">
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold">Tambah Paket</p>
              <p className="text-xs text-muted-foreground">Buat paket umroh baru</p>
            </div>
          </CardContent>
          <Link to="/admin/packages/create" className="absolute inset-0" />
        </Card>

        <Card className="group hover:border-blue-500/50 transition-all cursor-pointer overflow-hidden relative">
          <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
            <ShoppingCart className="h-24 w-24" />
          </div>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl text-blue-600 group-hover:scale-110 transition-transform">
              <ShoppingCart className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold">Verifikasi Bayar</p>
              <p className="text-xs text-muted-foreground">Cek bukti pembayaran</p>
            </div>
          </CardContent>
          <Link to="/admin/payments" className="absolute inset-0" />
        </Card>

        <Card className="group hover:border-emerald-500/50 transition-all cursor-pointer overflow-hidden relative">
          <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
            <Users className="h-24 w-24" />
          </div>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold">Tambah Jamaah</p>
              <p className="text-xs text-muted-foreground">Registrasi jamaah baru</p>
            </div>
          </CardContent>
          <Link to="/admin/customers/create" className="absolute inset-0" />
        </Card>

        <Card className="group hover:border-violet-500/50 transition-all cursor-pointer overflow-hidden relative">
          <div className="absolute right-[-10px] top-[-10px] opacity-5 group-hover:opacity-10 transition-opacity">
            <FileText className="h-24 w-24" />
          </div>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-violet-100 rounded-xl text-violet-600 group-hover:scale-110 transition-transform">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-bold">Generate Dokumen</p>
              <p className="text-xs text-muted-foreground">Cetak manifest & ID Card</p>
            </div>
          </CardContent>
          <Link to="/admin/documents-generator" className="absolute inset-0" />
        </Card>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {/* Alerts Section */}
        <Card className="lg:col-span-1 border-red-100 bg-red-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" /> STOK PERLENGKAPAN
              </CardTitle>
              <Link to="/admin/equipment" className="text-xs font-medium text-red-600 hover:underline flex items-center gap-1">
                Cek <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-red-700">
                {loadingAlerts ? <Skeleton className="h-8 w-24" /> : (alerts?.stockAlerts?.total || 0)}
              </p>
              <p className="text-sm text-red-600/80 font-medium">Total Item</p>
              {!loadingAlerts && alerts?.stockAlerts && (alerts.stockAlerts.outOfStock > 0 || alerts.stockAlerts.low > 0) && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {alerts.stockAlerts.outOfStock > 0 && (
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                      {alerts.stockAlerts.outOfStock} habis
                    </Badge>
                  )}
                  {alerts.stockAlerts.low > 0 && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700 bg-amber-50">
                      {alerts.stockAlerts.low} menipis
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Document Verification */}
        <Card className="lg:col-span-1 border-blue-100 bg-blue-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-blue-600">
                <ClipboardCheck className="h-4 w-4" /> VERIFIKASI DOKUMEN
              </CardTitle>
              <Link to="/admin/document-verification" className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1">
                Proses <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-blue-700">{loadingAlerts ? <Skeleton className="h-8 w-24" /> : (alerts?.pendingDocuments || 0)}</p>
              <p className="text-sm text-blue-600/80 font-medium">Menunggu</p>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Departures */}
        <Card className="lg:col-span-1 border-emerald-100 bg-emerald-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-600">
                <Plane className="h-4 w-4" /> KEBERANGKATAN TERDEKAT
              </CardTitle>
              <Link to="/admin/departures" className="text-xs font-medium text-emerald-600 hover:underline flex items-center gap-1">
                Lihat <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-emerald-700">{loadingDepartures ? <Skeleton className="h-8 w-24" /> : (upcomingDepartures?.length || 0)}</p>
              <p className="text-sm text-emerald-600/80 font-medium">Berangkat</p>
            </div>
          </CardContent>
        </Card>

        {/* Payment Reminder Alerts */}
        <Card className="lg:col-span-1 border-amber-100 bg-amber-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-600">
                <Bell className="h-4 w-4" /> PENGINGAT PELUNASAN
              </CardTitle>
              <Link to="/admin/pembayaran-reminder" className="text-xs font-medium text-amber-600 hover:underline flex items-center gap-1">
                Kelola <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {loadingAlerts ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-bold text-amber-700">
                  {(alerts?.paymentReminders?.dueToday ?? 0) + (alerts?.paymentReminders?.dueTomorrow ?? 0)}
                </p>
              )}
              <p className="text-sm text-amber-600/80 font-medium">Pending Hari Ini &amp; Besok</p>
              {!loadingAlerts && (alerts?.paymentReminders?.overdue ?? 0) > 0 && (
                <div className="pt-1">
                  <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                    {alerts!.paymentReminders!.overdue} lewat deadline
                  </Badge>
                </div>
              )}
              {!loadingAlerts && (alerts?.paymentReminders?.dueToday ?? 0) > 0 && (
                <div className="pt-1">
                  <Badge className="text-[10px] px-1.5 py-0 bg-amber-500 text-white">
                    {alerts!.paymentReminders!.dueToday} jatuh tempo hari ini
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Stats Section: Sold Packages & Periodic Jamaah */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Sold Packages Detail */}
        <Card className="bg-white border-none shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-amber-500" /> TOTAL BOOKING ({getLabel(soldFilter)})
            </CardTitle>
            <div className="flex items-center gap-2">
              <Dialog open={isSoldModalOpen} onOpenChange={setIsSoldModalOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 text-xs text-amber-600 font-semibold flex items-center gap-1">
                    Detail <ExternalLink className="h-3 w-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Daftar Total Booking</DialogTitle>
                    <DialogDescription>
                      Daftar booking dengan status 'Confirmed' atau 'Completed' yang dihitung sebagai total booking.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="mt-4">
                    {stats?.soldPackagesList && stats.soldPackagesList.length > 0 ? (
                      <div className="relative overflow-x-auto border rounded-lg">
                        <table className="w-full text-sm text-left">
                          <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                            <tr>
                              <th className="px-4 py-3 font-bold">Kode Booking</th>
                              <th className="px-4 py-3 font-bold">Nama Paket</th>
                              <th className="px-4 py-3 font-bold">Tanggal</th>
                              <th className="px-4 py-3 font-bold">Status</th>
                              <th className="px-4 py-3 font-bold text-right">Harga</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y">
                            {stats.soldPackagesList.map((item: any) => (
                              <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                <td className="px-4 py-3 font-medium">{item.booking_code}</td>
                                <td className="px-4 py-3">{item.package_name}</td>
                                <td className="px-4 py-3 text-xs">
                                  {item.created_at ? format(parseISO(item.created_at), 'dd MMM yyyy', { locale: idLocale }) : '-'}
                                </td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline" className="capitalize text-[10px]">
                                    {getBookingStatusLabel(item.status)}
                                  </Badge>
                                </td>
                                <td className="px-4 py-3 text-right font-bold text-primary">
                                  {formatCurrency(item.total_price)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-10 text-muted-foreground">
                        <p>Tidak ada data paket terjual.</p>
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
              <Select value={soldFilter} onValueChange={(v: any) => setSoldFilter(v)}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue placeholder="Filter Waktu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Waktu</SelectItem>
                  <SelectItem value="week">Minggu Ini</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                  <SelectItem value="3months">3 Bulan Terakhir</SelectItem>
                  <SelectItem value="6months">6 Bulan Terakhir</SelectItem>
                  <SelectItem value="9months">9 Bulan Terakhir</SelectItem>
                  <SelectItem value="year">Tahun Ini</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-4xl font-black text-amber-600">{isLoading ? <Skeleton className="h-10 w-16" /> : filteredSoldCount}</p>
                <p className="text-xs text-muted-foreground font-medium">Booking Terkonfirmasi</p>
              </div>
              <div className="hidden md:flex flex-col justify-center border-l pl-4">
                <p className="text-xs font-bold text-muted-foreground uppercase">Minggu Ini</p>
                <p className="text-2xl font-bold text-slate-700">{isLoading ? <Skeleton className="h-7 w-12" /> : periodicStats.sold.week}</p>
              </div>
              <div className="hidden md:flex flex-col justify-center border-l pl-4">
                <p className="text-xs font-bold text-muted-foreground uppercase">Bulan Ini</p>
                <p className="text-2xl font-bold text-slate-700">{isLoading ? <Skeleton className="h-7 w-12" /> : periodicStats.sold.month}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Jamaah Detail */}
        <Card className="bg-white border-none shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-blue-500" /> JUMLAH JAMAAH ({getLabel(jamaahFilter)})
            </CardTitle>
            <Select value={jamaahFilter} onValueChange={(v: any) => setJamaahFilter(v)}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Filter Waktu" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Waktu</SelectItem>
                <SelectItem value="week">Minggu Ini</SelectItem>
                <SelectItem value="month">Bulan Ini</SelectItem>
                <SelectItem value="3months">3 Bulan Terakhir</SelectItem>
                <SelectItem value="6months">6 Bulan Terakhir</SelectItem>
                <SelectItem value="9months">9 Bulan Terakhir</SelectItem>
                <SelectItem value="year">Tahun Ini</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <p className="text-4xl font-black text-blue-600">{isLoading ? <Skeleton className="h-10 w-16" /> : filteredJamaahCount}</p>
                <p className="text-xs text-muted-foreground font-medium">Pendaftaran Total</p>
              </div>
              <div className="hidden md:flex flex-col justify-center border-l pl-4">
                <p className="text-xs font-bold text-muted-foreground uppercase">Minggu Ini</p>
                <p className="text-2xl font-bold text-slate-700">{isLoading ? <Skeleton className="h-7 w-12" /> : periodicStats.jamaah.week}</p>
              </div>
              <div className="hidden md:flex flex-col justify-center border-l pl-4">
                <p className="text-xs font-bold text-muted-foreground uppercase">Bulan Ini</p>
                <p className="text-2xl font-bold text-slate-700">{isLoading ? <Skeleton className="h-7 w-12" /> : periodicStats.jamaah.month}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <DashboardCharts stats={stats} isLoading={isLoading} recentAudits={alerts?.recentAudits || []} />

      {/* Recent Activity & Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card className="shadow-sm border-none bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold">Pendaftaran Terbaru</CardTitle>
              <CardDescription>10 transaksi terakhir sistem</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-primary font-semibold" asChild>
              <Link to="/admin/bookings">Semua <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loadingBookings ? (
                Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : recentBookings && recentBookings.length > 0 ? (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                      <tr>
                        <th className="px-4 py-3 font-bold">Jamaah</th>
                        <th className="px-4 py-3 font-bold">Paket</th>
                        <th className="px-4 py-3 font-bold">Status</th>
                        <th className="px-4 py-3 font-bold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                  {recentBookings.map((booking: any) => (
                    <tr key={booking.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold">{booking.customer?.full_name}</div>
                        <div className="text-xs text-muted-foreground">{booking.booking_code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="max-w-[150px] truncate font-medium">
                          {booking.departure?.package?.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {booking.departure?.departure_date ? format(parseISO(booking.departure.departure_date), 'dd MMM yyyy', { locale: idLocale }) : '-'}
                        </div>
                      </td>
                          <td className="px-4 py-3">
                            <Badge variant={booking.booking_status === 'confirmed' ? 'default' : 'secondary'} className="capitalize text-[10px] font-bold">
                              {getBookingStatusLabel(booking.booking_status)}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-primary">
                            {formatCurrency(booking.total_price)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Info className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p>Belum ada data pendaftaran</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upcoming Departures List */}
        <Card className="shadow-sm border-none bg-card/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-bold">Jadwal Keberangkatan</CardTitle>
              <CardDescription>Grup yang akan segera berangkat</CardDescription>
            </div>
            <Button variant="ghost" size="sm" className="text-primary font-semibold" asChild>
              <Link to="/admin/departures">Jadwal <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loadingDepartures ? (
                Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)
              ) : upcomingDepartures && upcomingDepartures.length > 0 ? (
                <div className="space-y-3">
                  {upcomingDepartures.map((departure) => (
                    <div key={departure.id} className="flex items-center justify-between p-3 rounded-xl border bg-card hover:shadow-md transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary">
                          <span className="text-[10px] font-bold uppercase">{departure.departure_date ? format(parseISO(departure.departure_date), 'MMM') : ''}</span>
                          <span className="text-sm font-black leading-none">{departure.departure_date ? format(parseISO(departure.departure_date), 'dd') : ''}</span>
                        </div>
                        <div>
                          <div className="font-bold group-hover:text-primary transition-colors">{departure.package?.name}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Users className="h-3 w-3" /> {departure.booked_count} / {departure.quota} Jamaah
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                          {Math.round(((departure.booked_count ?? 0) / departure.quota) * 100)}% Terisi
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p>Belum ada jadwal keberangkatan</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
