import { useState, useMemo } from "react";
import { useDashboardStats, useRecentBookings, useUpcomingDepartures } from "@/hooks/useDashboardStats";
import { useDashboardAlerts } from "@/hooks/useDashboardAlerts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Users, ShoppingCart, DollarSign, TrendingUp, 
  AlertCircle, ArrowRight, Package, Calendar,
  Building2, User, RefreshCcw, Filter, X,
  FileText, Briefcase, Plane, ClipboardCheck, Info,
  CheckCircle2
} from "lucide-react";
import { formatCurrency, getBookingStatusLabel, getPaymentStatusLabel } from "@/lib/format";
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { id as idLocale } from "date-fns/locale";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DashboardCharts } from "./DashboardCharts";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function AdminDashboard() {
  const { branchId, hasRole } = useAuth();
  const isSuperAdmin = hasRole('super_admin') || hasRole('owner');
  
  // Filter States - Kept for internal logic but hidden from UI
  const [hierarchyLevel, setHierarchyLevel] = useState<'all' | 'pusat' | 'cabang' | 'agen' | 'sub_agen'>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>(branchId || "all");
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [selectedSubAgent, setSelectedSubAgent] = useState<string>("all");

  const { data: stats, isLoading, refetch } = useDashboardStats({ 
    branchId: selectedBranch,
    agentId: selectedAgent,
    subAgentId: selectedSubAgent,
    hierarchyLevel: hierarchyLevel
  });
  
  const { data: recentBookings, isLoading: loadingBookings } = useRecentBookings(selectedBranch);
  const { data: upcomingDepartures, isLoading: loadingDepartures } = useUpcomingDepartures(selectedBranch);
  const { data: alerts } = useDashboardAlerts();

  // Calculate periodic jamaah stats
  const periodicJamaahStats = useMemo(() => {
    if (!stats?.dailyJamaahData) return { week: 0, month: 0, year: 0 };
    
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const monthStart = startOfMonth(now);
    const yearStart = startOfYear(now);

    let weekCount = 0;
    let monthCount = 0;
    let yearCount = 0;

    // We need the raw customer data or use the dailyJamaahData if it covers enough range
    // Since useDashboardStats fetches last 6 months by default, we can use that
    
    // For simplicity, let's use the aggregated data from stats if available
    // But wait, useDashboardStats already provides weeklyJamaahData and monthlyJamaahData
    
    const currentWeekKey = format(weekStart, 'dd MMM', { locale: idLocale });
    const currentMonthKey = format(monthStart, 'MMM yyyy', { locale: idLocale });
    
    const weekData = stats.weeklyJamaahData?.find((w: any) => w.week.startsWith(currentWeekKey));
    const monthData = stats.monthlyJamaahData?.find((m: any) => m.month === currentMonthKey);
    
    // For year, we sum all months in the current year
    const currentYear = now.getFullYear();
    const yearData = stats.monthlyJamaahData?.filter((m: any) => m.month.endsWith(currentYear.toString()))
      .reduce((sum: number, m: any) => sum + m.jamaah, 0) || 0;

    return {
      week: weekData?.jamaah || 0,
      month: monthData?.jamaah || 0,
      year: yearData || stats.totalJamaah || 0
    };
  }, [stats]);

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
          <Link to="/admin/payments/verification" className="absolute inset-0" />
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
          <Link to="/admin/reports" className="absolute inset-0" />
        </Card>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Alerts Section */}
        <Card className="lg:col-span-1 border-red-100 bg-red-50/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" /> STOK KRITIS
              </CardTitle>
              <Link to="/admin/equipment" className="text-xs font-medium text-red-600 hover:underline flex items-center gap-1">
                Cek <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-2xl font-bold text-red-700">
                {alerts?.stockAlerts?.critical || 0} Item Habis • {alerts?.stockAlerts?.low || 0}
              </p>
              <p className="text-sm text-red-600/80 font-medium">Stok Rendah</p>
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
              <p className="text-2xl font-bold text-blue-700">{alerts?.pendingDocuments || 0} Dokumen</p>
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
              <p className="text-2xl font-bold text-emerald-700">{upcomingDepartures?.length || 0} Grup Siap</p>
              <p className="text-sm text-emerald-600/80 font-medium">Berangkat</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* New Stats Section: Sold Packages & Periodic Jamaah */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-primary text-primary-foreground shadow-lg border-none">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 opacity-90">
              <CheckCircle2 className="h-4 w-4" /> PAKET TERJUAL
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-black">{stats?.soldPackagesCount || 0}</p>
              <p className="text-xs opacity-80 font-medium">Total paket terkonfirmasi</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-blue-500" /> JAMAAH MINGGU INI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-black text-blue-600">{periodicJamaahStats.week}</p>
              <p className="text-xs text-muted-foreground font-medium">Pendaftaran baru</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-emerald-500" /> JAMAAH BULAN INI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-black text-emerald-600">{periodicJamaahStats.month}</p>
              <p className="text-xs text-muted-foreground font-medium">Pendaftaran baru</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border-none shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 text-amber-500" /> JAMAAH TAHUN INI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              <p className="text-3xl font-black text-amber-600">{periodicJamaahStats.year}</p>
              <p className="text-xs text-muted-foreground font-medium">Total pendaftaran</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <DashboardCharts stats={stats} isLoading={isLoading} />

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
                      {recentBookings.map((booking) => (
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
                          {Math.round((departure.booked_count / departure.quota) * 100)}% Terisi
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
