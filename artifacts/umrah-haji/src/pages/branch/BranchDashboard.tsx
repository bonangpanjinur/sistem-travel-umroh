import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import {
  Users, DollarSign, Package, TrendingUp, Building2,
  ArrowRight, CheckCircle2, Clock, AlertCircle, BarChart3, CalendarRange, Bell,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function BranchDashboard() {
  const { user, branchId } = useAuth();
  const navigate = useNavigate();
  const today = new Date();
  const [dateFrom, setDateFrom] = useState<string>(format(startOfMonth(today), "yyyy-MM-dd"));
  const [dateTo, setDateTo] = useState<string>(format(endOfMonth(today), "yyyy-MM-dd"));
  const [newBookingCount, setNewBookingCount] = useState(0);
  const lastSeenRef = useRef<string | null>(null);

  const { data: branchData } = useQuery({
    queryKey: ["branch-data", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("branches")
        .select("id, name, city, province")
        .eq("manager_user_id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  const bId = branchData?.id || branchId;

  const { data: newBookingsCheck } = useQuery({
    queryKey: ["branch-new-bookings-poll", bId],
    enabled: !!bId,
    refetchInterval: 30_000,
    queryFn: async () => {
      const storageKey = `branch_last_booking_${bId}`;
      const after = lastSeenRef.current
        || localStorage.getItem(storageKey)
        || new Date(Date.now() - 86_400_000).toISOString();
      const { data } = await supabase
        .from("bookings")
        .select("id, booking_code, created_at, customer:customers(full_name)")
        .eq("branch_id", bId)
        .gt("created_at", after)
        .order("created_at", { ascending: false })
        .limit(10);
      return { items: data || [], after };
    },
  });

  useEffect(() => {
    if (!newBookingsCheck?.items?.length || !bId) return;
    const newest: string | null = newBookingsCheck.items[0].created_at ?? null;
    const storageKey = `branch_last_booking_${bId}`;
    const lastSeen = lastSeenRef.current || localStorage.getItem(storageKey);

    if (lastSeen && newest && newest > lastSeen) {
      const fresh = newBookingsCheck.items.filter((b: any) => b.created_at > lastSeen);
      if (fresh.length > 0) {
        setNewBookingCount(c => c + fresh.length);
        const names = fresh.slice(0, 2).map((b: any) => b.booking_code || "—").join(", ");
        toast.info(
          `${fresh.length} booking baru masuk: ${names}${fresh.length > 2 ? " ..." : ""}`,
          { action: { label: "Lihat", onClick: () => navigate("/cabang/bookings") }, duration: 6000 }
        );
      }
    }
    if (newest) {
      lastSeenRef.current = newest;
      localStorage.setItem(storageKey, newest);
    }
  }, [newBookingsCheck, bId, navigate]);

  const { data: stats, isLoading } = useQuery({
    queryKey: ["branch-stats", bId, dateFrom, dateTo],
    enabled: !!bId,
    queryFn: async () => {
      const startMonth = new Date(`${dateFrom}T00:00:00`).toISOString();
      const endMonth = new Date(`${dateTo}T23:59:59`).toISOString();

      const [bookingsRes, agentsRes, customersRes, revenueRes, pendingDiskon, komisiRes] = await Promise.all([
        supabase.from("bookings").select("id, status, total_price, created_at", { count: "exact" })
          .eq("branch_id", bId).gte("created_at", startMonth).lte("created_at", endMonth),
        (supabase as any).from("agents").select("id", { count: "exact" }).eq("branch_id", bId).eq("status", "active"),
        (supabase as any).from("customers").select("id", { count: "exact" }).eq("branch_id", bId),
        supabase.from("bookings").select("total_price")
          .eq("branch_id", bId).in("status", ["confirmed", "processing", "completed"])
          .gte("created_at", startMonth).lte("created_at", endMonth),
        (supabase as any).from("discount_requests").select("id", { count: "exact" })
          .eq("branch_id", bId).eq("status", "pending"),
        (supabase as any).from("branch_commissions").select("commission_amount, status")
          .eq("branch_id", bId),
      ]);

      const revenue = (revenueRes.data || []).reduce((s: number, b: any) => s + Number(b.total_price || 0), 0);
      const komisiPending = (komisiRes.data || [])
        .filter((k: any) => k.status === "pending")
        .reduce((s: number, k: any) => s + Number(k.commission_amount || 0), 0);
      const komisiDibayar = (komisiRes.data || [])
        .filter((k: any) => k.status === "paid")
        .reduce((s: number, k: any) => s + Number(k.commission_amount || 0), 0);
      return {
        bookings: bookingsRes.count || 0,
        confirmed: (bookingsRes.data || []).filter((b: any) => ["confirmed", "processing", "completed"].includes(b.status)).length,
        agents: agentsRes.count || 0,
        customers: customersRes.count || 0,
        revenue,
        pendingDiskon: pendingDiskon.count || 0,
        komisiPending,
        komisiDibayar,
      };
    },
  });

  const { data: recentBookings = [], isLoading: loadingBookings } = useQuery({
    queryKey: ["branch-recent-bookings", bId],
    enabled: !!bId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_code, status, total_price, created_at, customer:customers(full_name)")
        .eq("branch_id", bId)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: chartData = [] } = useQuery({
    queryKey: ["branch-chart", bId],
    enabled: !!bId,
    queryFn: async () => {
      const result = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const s = startOfMonth(d).toISOString();
        const e = endOfMonth(d).toISOString();
        const { data } = await supabase.from("bookings").select("total_price")
          .eq("branch_id", bId).gte("created_at", s).lte("created_at", e)
          .in("status", ["confirmed", "processing", "completed"]);
        const total = (data || []).reduce((sum: number, b: any) => sum + Number(b.total_price || 0), 0);
        result.push({ month: format(d, "MMM", { locale: localeId }), revenue: total });
      }
      return result;
    },
  });

  const STATUS_STYLE: Record<string, string> = {
    confirmed: "bg-green-100 text-green-700",
    processing: "bg-blue-100 text-blue-700",
    completed: "bg-emerald-100 text-emerald-700",
    pending: "bg-yellow-100 text-yellow-700",
    cancelled: "bg-red-100 text-red-700",
  };

  const KPI = [
    { label: "Booking Periode", value: stats?.bookings ?? 0, sub: `${stats?.confirmed ?? 0} konfirmasi`, icon: Package, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Revenue Periode", value: formatCurrency(stats?.revenue ?? 0), sub: "Booking confirmed", icon: DollarSign, color: "text-green-600", bg: "bg-green-50" },
    { label: "Agen Aktif", value: stats?.agents ?? 0, sub: "di cabang ini", icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Total Jamaah", value: stats?.customers ?? 0, sub: "terdaftar", icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Komisi Pending", value: formatCurrency(stats?.komisiPending ?? 0), sub: "menunggu pembayaran", icon: Clock, color: "text-orange-600", bg: "bg-orange-50" },
    { label: "Komisi Dibayar", value: formatCurrency(stats?.komisiDibayar ?? 0), sub: "telah dicairkan", icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {branchData?.name || "Dashboard Cabang"}
          </h1>
          <p className="text-sm text-muted-foreground">{branchData?.city}, {branchData?.province}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {newBookingCount > 0 && (
            <button
              onClick={() => { setNewBookingCount(0); navigate("/cabang/bookings"); }}
              className="relative inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
            >
              <Bell className="h-4 w-4" />
              {newBookingCount} booking baru
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-blue-500 animate-ping" />
            </button>
          )}
          {(stats?.pendingDiskon ?? 0) > 0 && (
            <Link to="/cabang/diskon">
              <Badge className="bg-red-100 text-red-700 border-red-200 cursor-pointer hover:bg-red-200 gap-1">
                <AlertCircle className="h-3 w-3" />
                {stats?.pendingDiskon} diskon pending
              </Badge>
            </Link>
          )}
        </div>
      </div>

      {/* Date Range Filter */}
      <Card>
        <CardContent className="p-3 flex flex-wrap items-end gap-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <CalendarRange className="h-4 w-4 text-primary" /> Periode:
          </div>
          <div className="space-y-1">
            <Label htmlFor="from" className="text-xs">Dari</Label>
            <Input id="from" type="date" value={dateFrom} max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)} className="h-8 w-40" />
          </div>
          <div className="space-y-1">
            <Label htmlFor="to" className="text-xs">Sampai</Label>
            <Input id="to" type="date" value={dateTo} min={dateFrom}
              onChange={(e) => setDateTo(e.target.value)} className="h-8 w-40" />
          </div>
          <div className="flex gap-1 ml-auto">
            <Button variant="outline" size="sm" onClick={() => {
              setDateFrom(format(startOfMonth(new Date()), "yyyy-MM-dd"));
              setDateTo(format(endOfMonth(new Date()), "yyyy-MM-dd"));
            }}>Bulan Ini</Button>
            <Button variant="outline" size="sm" onClick={() => {
              const last = subMonths(new Date(), 1);
              setDateFrom(format(startOfMonth(last), "yyyy-MM-dd"));
              setDateTo(format(endOfMonth(last), "yyyy-MM-dd"));
            }}>Bulan Lalu</Button>
            <Button variant="outline" size="sm" onClick={() => {
              setDateFrom(format(subMonths(new Date(), 2), "yyyy-MM-dd"));
              setDateTo(format(new Date(), "yyyy-MM-dd"));
            }}>3 Bulan</Button>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {KPI.map((k) => {
          const Icon = k.icon;
          return (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="flex items-start gap-2">
                  <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", k.bg)}>
                    <Icon className={cn("h-4 w-4", k.color)} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{k.label}</p>
                    {isLoading ? <Skeleton className="h-6 w-20 mt-1" /> : (
                      <p className="font-bold text-base leading-tight">{k.value}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground">{k.sub}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Revenue — 6 Bulan Terakhir
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000000).toFixed(0)}jt`} />
              <Tooltip formatter={(v: any) => [formatCurrency(v), "Revenue"]} />
              <Area type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" fill="url(#colorRev)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {[
          { label: "Laporan Revenue", href: "/cabang/laporan", icon: DollarSign, color: "text-green-600 bg-green-50" },
          { label: "Performa Agen", href: "/cabang/agen", icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "Rekap Booking", href: "/cabang/bookings", icon: Package, color: "text-purple-600 bg-purple-50" },
          { label: "Approval Diskon", href: "/cabang/diskon", icon: CheckSquare, color: "text-amber-600 bg-amber-50" },
        ].map((a) => {
          const Icon = a.icon;
          return (
            <Link key={a.href} to={a.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-3 flex items-center gap-2">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", a.color.split(" ")[1])}>
                    <Icon className={cn("h-4 w-4", a.color.split(" ")[0])} />
                  </div>
                  <span className="text-xs font-medium">{a.label}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground ml-auto" />
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Booking Terbaru</CardTitle>
            <Link to="/cabang/bookings">
              <Button variant="ghost" size="sm" className="text-xs h-7">Lihat semua <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {loadingBookings ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : recentBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Belum ada booking bulan ini</p>
          ) : (
            <div className="space-y-2">
              {recentBookings.map((b: any) => (
                <div key={b.id} className="flex items-center justify-between gap-2 py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{b.customer?.full_name || "-"}</p>
                    <p className="text-xs text-muted-foreground">{b.booking_code}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{formatCurrency(Number(b.total_price || 0))}</span>
                    <Badge className={cn("text-[10px]", STATUS_STYLE[b.status] || "bg-gray-100 text-gray-600")}>
                      {b.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CheckSquare({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
