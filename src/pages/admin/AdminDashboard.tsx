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
  FileText, Briefcase, Plane, ClipboardCheck, Info
} from "lucide-react";
import { formatCurrency, getBookingStatusLabel, getPaymentStatusLabel } from "@/lib/format";
import { format, parseISO } from "date-fns";
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
  
  // Filter States
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

  const resetFilters = () => {
    setHierarchyLevel('all');
    setSelectedBranch(branchId || "all");
    setSelectedAgent("all");
    setSelectedSubAgent("all");
  };

  // Filter logic: Only show sub-agents if an agent is selected
  const agents = stats?.agents || [];
  const branches = stats?.branches || [];
  
  const topLevelAgents = useMemo(() => agents.filter(a => !a.parent_agent_id), [agents]);
  const subAgents = useMemo(() => {
    if (selectedAgent === "all") return [];
    return agents.filter(a => a.parent_agent_id === selectedAgent);
  }, [agents, selectedAgent]);

  // Derived labels for UI
  const getHierarchyLabel = () => {
    switch(hierarchyLevel) {
      case 'pusat': return "Pusat";
      case 'cabang': return "Cabang";
      case 'agen': return "Agen";
      case 'sub_agen': return "Sub-Agen";
      default: return "Semua Level";
    }
  };

  return (
    <div className="space-y-8 pb-10 animate-fade-in">
      {/* Header & Filters */}
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

        <div className="flex flex-wrap items-center gap-3 bg-card p-2 rounded-xl border shadow-sm">
          {/* Hierarchy Level Selector */}
          <Select value={hierarchyLevel} onValueChange={(v: any) => {
            setHierarchyLevel(v);
            // Reset lower levels when hierarchy changes
            if (v === 'pusat' || v === 'all') {
              setSelectedBranch("all");
              setSelectedAgent("all");
              setSelectedSubAgent("all");
            }
          }}>
            <SelectTrigger className="w-[140px] h-10 border-none shadow-none focus:ring-0">
              <Filter className="h-4 w-4 mr-2 text-primary" />
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

          {/* Branch Selector (Only for Super Admin or when Level is Cabang/All) */}
          {isSuperAdmin && (hierarchyLevel === 'all' || hierarchyLevel === 'cabang') && (
            <Select value={selectedBranch} onValueChange={setSelectedBranch}>
              <SelectTrigger className="w-[160px] h-10 border-none shadow-none focus:ring-0 border-l rounded-none pl-4">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Cabang" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Cabang</SelectItem>
                {branches.map(b => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Agent Selector (Only for Agen/Sub-Agen level) */}
          {(hierarchyLevel === 'agen' || hierarchyLevel === 'sub_agen' || hierarchyLevel === 'all') && (
            <Select value={selectedAgent} onValueChange={(v) => {
              setSelectedAgent(v);
              setSelectedSubAgent("all");
            }}>
              <SelectTrigger className="w-[160px] h-10 border-none shadow-none focus:ring-0 border-l rounded-none pl-4">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
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

          {/* Sub-Agent Selector (Only visible if Agen is selected and level is Sub-Agen/All) */}
          {(hierarchyLevel === 'sub_agen' || hierarchyLevel === 'all') && selectedAgent !== "all" && subAgents.length > 0 && (
            <Select value={selectedSubAgent} onValueChange={setSelectedSubAgent}>
              <SelectTrigger className="w-[160px] h-10 border-none shadow-none focus:ring-0 border-l rounded-none pl-4">
                <User className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Sub-Agen" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Sub-Agen</SelectItem>
                {subAgents.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.company_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <div className="flex items-center gap-1 ml-auto pl-2 border-l">
            <Button variant="ghost" size="icon" onClick={() => refetch()} className="h-9 w-9">
              <RefreshCcw className={cn("h-4 w-4", isLoading && "animate-spin")} />
            </Button>
            <Button variant="ghost" size="icon" onClick={resetFilters} className="h-9 w-9 text-destructive">
              <X className="h-4 w-4" />
            </Button>
            <Button className="h-9 px-4 ml-1 bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm" asChild>
              <Link to="/admin/analytics">Analisis Mendalam <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </div>
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

      {/* Alerts & Critical Status */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-red-100 bg-red-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-red-800 uppercase">Stok Kritis</p>
              <p className="text-sm font-medium">0 Item Habis • 0 Stok Rendah</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-red-600 hover:bg-red-100">
              <Link to="/admin/inventory">Cek <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-blue-100 bg-blue-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-800 uppercase">Verifikasi Dokumen</p>
              <p className="text-sm font-medium">{stats?.pendingPaymentCount || 0} Dokumen Menunggu</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-blue-600 hover:bg-blue-100">
              <Link to="/admin/document-verification">Proses <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-emerald-100 bg-emerald-50/30">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
              <Plane className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-emerald-800 uppercase">Keberangkatan Terdekat</p>
              <p className="text-sm font-medium">{(upcomingDepartures?.length || 0)} Grup Siap Berangkat</p>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-emerald-600 hover:bg-emerald-100">
              <Link to="/admin/departures">Lihat <ArrowRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Statistics Overview */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Total Pendapatan" 
          value={formatCurrency(stats?.totalRevenue || 0)}
          icon={DollarSign}
          loading={isLoading}
          color="amber"
          description={`Berdasarkan level ${getHierarchyLabel()}`}
        />
        <StatCard 
          title="Total Booking" 
          value={stats?.totalBookings || 0}
          icon={ShoppingCart}
          loading={isLoading}
          color="blue"
          description={`${stats?.pendingBookings || 0} menunggu konfirmasi`}
        />
        <StatCard 
          title="Total Jamaah" 
          value={stats?.totalPax || 0}
          icon={Users}
          loading={isLoading}
          color="emerald"
          description="Perhitungan per jemaah"
        />
        <StatCard 
          title="Piutang" 
          value={formatCurrency(stats?.totalOutstanding || 0)}
          icon={AlertCircle}
          loading={isLoading}
          color="red"
          description="Total tagihan belum lunas"
        />
      </div>

      {/* Charts Section */}
      <DashboardCharts 
        revenueData={stats?.monthlyRevenue || []} 
        jamaahDaily={stats?.dailyJamaahData || []}
        jamaahWeekly={stats?.weeklyJamaahData || []}
        jamaahMonthly={stats?.monthlyJamaahData || []}
        isLoading={isLoading} 
      />

      {/* Bottom Section: Recent Bookings & Upcoming Departures */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm border-muted/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Booking Terbaru</CardTitle>
              <CardDescription>5 transaksi terakhir yang masuk</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/bookings">Semua Booking</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingBookings ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/50 font-bold">
                    <tr>
                      <th className="px-4 py-3">Jamaah</th>
                      <th className="px-4 py-3">Total</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentBookings?.map((booking) => (
                      <tr key={booking.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{booking.customer?.full_name || 'N/A'}</td>
                        <td className="px-4 py-3 font-bold">{formatCurrency(booking.total_price)}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className={cn(
                            "font-semibold",
                            booking.booking_status === 'confirmed' ? "text-emerald-600 bg-emerald-50 border-emerald-100" :
                            booking.booking_status === 'pending' ? "text-amber-600 bg-amber-50 border-amber-100" : "text-muted-foreground"
                          )}>
                            {getBookingStatusLabel(booking.booking_status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {booking.created_at ? format(parseISO(booking.created_at), 'dd/MM/yy') : '-'}
                        </td>
                      </tr>
                    ))}
                    {(!recentBookings || recentBookings.length === 0) && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Tidak ada data booking</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-muted/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Jadwal Terdekat</CardTitle>
              <CardDescription>Keberangkatan yang akan datang</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/admin/departures">Semua Jadwal</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingDepartures ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-muted/50 font-bold">
                    <tr>
                      <th className="px-4 py-3">Paket</th>
                      <th className="px-4 py-3">Tanggal</th>
                      <th className="px-4 py-3">Sisa Kuota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {upcomingDepartures?.map((departure) => (
                      <tr key={departure.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 font-medium">{departure.package?.name || 'N/A'}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {departure.departure_date ? format(parseISO(departure.departure_date), 'dd MMMM yyyy', { locale: idLocale }) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full" 
                                style={{ width: `${((departure.booked_count || 0) / (departure.quota || 1)) * 100}%` }}
                              ></div>
                            </div>
                            <span className="font-bold">{(departure.quota || 0) - (departure.booked_count || 0)}</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {(!upcomingDepartures || upcomingDepartures.length === 0) && (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">Tidak ada jadwal keberangkatan</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, loading, color, description }: any) {
  const colorMap: Record<string, string> = {
    primary: "text-primary bg-primary/10",
    blue: "text-blue-600 bg-blue-50",
    emerald: "text-emerald-600 bg-emerald-50",
    amber: "text-amber-600 bg-amber-50",
    red: "text-red-600 bg-red-50",
  };

  const borderMap: Record<string, string> = {
    primary: "border-primary/20",
    blue: "border-blue-200",
    emerald: "border-emerald-200",
    amber: "border-amber-200",
    red: "border-red-200",
  };

  return (
    <Card className={cn("shadow-sm hover:shadow-md transition-all border-l-4", borderMap[color] || "border-l-primary")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
        <div className={cn("p-2 rounded-lg", colorMap[color] || colorMap.primary)}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            {description && <p className="text-[10px] text-muted-foreground mt-1 font-medium">{description}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
