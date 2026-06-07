import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { subMonths, startOfMonth, endOfMonth } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ResetPasswordDialog from "@/components/admin/ResetPasswordDialog";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import {
  ArrowLeft, Building2, MapPin, Phone, Mail, Globe, UserCircle2,
  Users, Network, BarChart3, Loader2, Plus, KeyRound, CheckCircle2,
  Copy, MessageCircle, TrendingUp, Plane, CalendarDays, Star,
  DollarSign, Receipt, Download,
} from "lucide-react";

interface BranchDetailData {
  branch: Record<string, any>;
  staff: StaffMember[];
  agents: AgentRow[];
  departureStats: DepartureStat[];
  recentDepartures: DepartureRow[];
  bookingStats: { total_bookings: number; total_revenue: string };
}

interface StaffMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string | null;
  jabatan: string | null;
}

interface AgentRow {
  id: string;
  agent_code: string;
  contact_name: string;
  email: string;
  phone: string | null;
  company_name: string;
  commission_rate: number;
  is_active: boolean;
  status: string;
  created_at: string;
}

interface DepartureStat {
  status: string;
  count: number;
  total_quota: number;
  filled_seats: number;
}

interface DepartureRow {
  id: string;
  departure_date: string;
  return_date: string | null;
  status: string;
  quota: number;
  available_seats: number;
  package_name: string;
  package_type: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  operational: "Operasional",
  sales: "Sales",
  finance: "Keuangan",
  hr: "HR",
  marketing: "Marketing",
  equipment: "Perlengkapan",
  visa_officer: "Visa Officer",
};

const STATUS_DEPARTURE_LABELS: Record<string, { label: string; color: string }> = {
  upcoming:   { label: "Akan Datang",  color: "bg-blue-100 text-blue-800" },
  ongoing:    { label: "Berlangsung",  color: "bg-green-100 text-green-800" },
  completed:  { label: "Selesai",      color: "bg-gray-100 text-gray-700" },
  cancelled:  { label: "Dibatalkan",   color: "bg-red-100 text-red-800" },
  full:       { label: "Penuh",        color: "bg-orange-100 text-orange-800" },
};

const STATUS_AGENT_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active:    { label: "Aktif",      variant: "default" },
  pending:   { label: "Menunggu",   variant: "secondary" },
  suspended: { label: "Ditangguh", variant: "destructive" },
  inactive:  { label: "Nonaktif",  variant: "outline" },
};

function formatCurrency(val: string | number) {
  const n = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(n)) return "Rp 0";
  return "Rp " + n.toLocaleString("id-ID");
}

export default function AdminBranchDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [resetUser, setResetUser] = useState<{ userId: string; label: string; phone?: string } | null>(null);

  const { data, isLoading, error } = useQuery<BranchDetailData>({
    queryKey: ["branch-detail", id],
    queryFn: async () => {
      const res = await fetch(`/api/branches/${id}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || "Gagal memuat data cabang");
      return json;
    },
    enabled: !!id,
  });

  const { data: branchCommissions = [] } = useQuery({
    queryKey: ["branch-commissions-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const { data: d } = await (supabase as any)
        .from("branch_commissions")
        .select("id, commission_amount, commission_rate, status, created_at, paid_at, payment_reference, notes")
        .eq("branch_id", id)
        .order("created_at", { ascending: false });
      return d ?? [];
    },
  });

  const { data: monthlyRevenue = [] } = useQuery({
    queryKey: ["branch-monthly-revenue-detail", id],
    enabled: !!id,
    queryFn: async () => {
      const result = [];
      for (let i = 5; i >= 0; i--) {
        const d = subMonths(new Date(), i);
        const s = startOfMonth(d).toISOString();
        const e = endOfMonth(d).toISOString();
        const [bkRes, pendRes] = await Promise.all([
          (supabase as any).from("bookings").select("total_price")
            .eq("branch_id", id).gte("created_at", s).lte("created_at", e)
            .in("status", ["confirmed", "processing", "completed"]),
          (supabase as any).from("bookings").select("id", { count: "exact", head: true })
            .eq("branch_id", id).gte("created_at", s).lte("created_at", e),
        ]);
        const revenue = (bkRes.data ?? []).reduce((sum: number, b: any) => sum + Number(b.total_price || 0), 0);
        result.push({
          bulan: format(d, "MMM yy", { locale: localeId }),
          revenue,
          booking: pendRes.count ?? 0,
        });
      }
      return result;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/branches")}>
          <ArrowLeft className="h-4 w-4 mr-1" />Kembali
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{(error as Error)?.message || "Cabang tidak ditemukan"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { branch, staff, agents, departureStats, recentDepartures, bookingStats } = data;

  const totalDepartures = departureStats.reduce((s, d) => s + d.count, 0);
  const upcomingCount = departureStats.find(d => d.status === "upcoming")?.count ?? 0;
  const completedCount = departureStats.find(d => d.status === "completed")?.count ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/branches")}>
          <ArrowLeft className="h-4 w-4 mr-1" />Cabang
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{branch.name}</h1>
            <Badge variant="outline" className="font-mono text-xs">{branch.code}</Badge>
            <Badge variant={branch.is_active ? "default" : "secondary"}>
              {branch.is_active ? "Aktif" : "Nonaktif"}
            </Badge>
          </div>
          {branch.city && (
            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
              <MapPin className="h-3 w-3" />
              {branch.city}{branch.province ? `, ${branch.province}` : ""}
            </p>
          )}
        </div>
        {branch.manager_user_id && (
          <Button
            size="sm" variant="outline"
            onClick={() => setResetUser({
              userId: branch.manager_user_id,
              label: `Manager ${branch.name} (${branch.manager_email})`,
              phone: branch.manager_phone,
            })}
          >
            <KeyRound className="h-4 w-4 mr-1" />Reset Password Manager
          </Button>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<Users className="h-4 w-4 text-blue-600" />} label="Staff" value={staff.length} />
        <StatCard icon={<Network className="h-4 w-4 text-emerald-600" />} label="Agent" value={agents.length} />
        <StatCard icon={<Plane className="h-4 w-4 text-violet-600" />} label="Keberangkatan" value={totalDepartures} />
        <StatCard icon={<TrendingUp className="h-4 w-4 text-orange-600" />} label="Total Booking" value={bookingStats.total_bookings} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="info">
        <TabsList className="grid grid-cols-5 w-full max-w-2xl">
          <TabsTrigger value="info">
            <Building2 className="h-4 w-4 mr-1 hidden sm:inline" />Info
          </TabsTrigger>
          <TabsTrigger value="staff">
            <Users className="h-4 w-4 mr-1 hidden sm:inline" />Staff <span className="ml-1 text-xs opacity-70">({staff.length})</span>
          </TabsTrigger>
          <TabsTrigger value="agents">
            <Network className="h-4 w-4 mr-1 hidden sm:inline" />Agent <span className="ml-1 text-xs opacity-70">({agents.length})</span>
          </TabsTrigger>
          <TabsTrigger value="stats">
            <BarChart3 className="h-4 w-4 mr-1 hidden sm:inline" />Statistik
          </TabsTrigger>
          <TabsTrigger value="keuangan">
            <DollarSign className="h-4 w-4 mr-1 hidden sm:inline" />Keuangan
          </TabsTrigger>
        </TabsList>

        {/* === TAB INFO === */}
        <TabsContent value="info" className="space-y-4 mt-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Informasi Cabang</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <InfoRow label="Nama" value={branch.name} />
                <InfoRow label="Kode" value={<span className="font-mono">{branch.code}</span>} />
                {branch.city && <InfoRow label="Kota" value={branch.city} />}
                {branch.province && <InfoRow label="Provinsi" value={branch.province} />}
                {branch.address && <InfoRow label="Alamat" value={branch.address} />}
                {branch.phone && <InfoRow label="Telepon" value={branch.phone} />}
                {branch.email && <InfoRow label="Email" value={branch.email} />}
                {branch.slug && (
                  <InfoRow label="Slug Website" value={<span className="font-mono text-primary text-xs">/b/{branch.slug}</span>} />
                )}
                <InfoRow label="Status" value={
                  <Badge variant={branch.is_active ? "default" : "secondary"}>
                    {branch.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                } />
                <InfoRow label="Dibuat" value={branch.created_at ? format(new Date(branch.created_at), "d MMM yyyy", { locale: localeId }) : "-"} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <UserCircle2 className="h-4 w-4" />Branch Manager
                </CardTitle>
              </CardHeader>
              <CardContent>
                {branch.manager_user_id ? (
                  <div className="space-y-2 text-sm">
                    <InfoRow label="Nama" value={branch.manager_name || "—"} />
                    <InfoRow label="Email" value={branch.manager_email || "—"} />
                    {branch.manager_phone && <InfoRow label="Telepon" value={branch.manager_phone} />}
                    <div className="pt-2">
                      <Button
                        size="sm" variant="outline"
                        onClick={() => setResetUser({
                          userId: branch.manager_user_id,
                          label: `${branch.manager_name} (${branch.manager_email})`,
                          phone: branch.manager_phone,
                        })}
                      >
                        <KeyRound className="h-3 w-3 mr-1" />Reset Password
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-amber-600 flex items-center gap-2">
                    <UserCircle2 className="h-4 w-4" />Belum ada manager yang ditetapkan
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* === TAB STAFF === */}
        <TabsContent value="staff" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{staff.length} anggota staff</p>
            <Button size="sm" onClick={() => setAddStaffOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />Tambah Staff
            </Button>
          </div>

          {staff.length === 0 ? (
            <EmptyState icon={<Users className="h-10 w-10" />} label="Belum ada staff di cabang ini" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {staff.map(s => (
                <Card key={s.id}>
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{s.email}</p>
                      {s.phone && <p className="text-xs text-muted-foreground">{s.phone}</p>}
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {ROLE_LABELS[s.role] || s.role}
                      </Badge>
                    </div>
                    <Button
                      size="icon" variant="ghost" className="h-7 w-7 flex-shrink-0"
                      title="Reset Password"
                      onClick={() => setResetUser({ userId: s.user_id, label: `${s.full_name} (${s.email})`, phone: s.phone ?? undefined })}
                    >
                      <KeyRound className="h-3.5 w-3.5" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* === TAB AGENT === */}
        <TabsContent value="agents" className="mt-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">{agents.length} agent terhubung</p>
            <Button size="sm" variant="outline" asChild>
              <Link to="/admin/agents">Kelola Semua Agent</Link>
            </Button>
          </div>

          {agents.length === 0 ? (
            <EmptyState icon={<Network className="h-10 w-10" />} label="Belum ada agent yang terhubung ke cabang ini" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {agents.map(a => {
                const statusInfo = STATUS_AGENT_LABELS[a.status] ?? { label: a.status, variant: "outline" as const };
                return (
                  <Card key={a.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-primary">{a.agent_code}</span>
                            <Badge variant={statusInfo.variant} className="text-xs">{statusInfo.label}</Badge>
                          </div>
                          <p className="font-medium text-sm mt-0.5 truncate">{a.contact_name || a.company_name}</p>
                          {a.company_name && a.contact_name && (
                            <p className="text-xs text-muted-foreground truncate">{a.company_name}</p>
                          )}
                          <p className="text-xs text-muted-foreground truncate">{a.email}</p>
                        </div>
                        <div className="text-right text-xs flex-shrink-0">
                          <p className="text-muted-foreground">Komisi</p>
                          <p className="font-semibold">{a.commission_rate}%</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* === TAB STATISTIK === */}
        <TabsContent value="stats" className="space-y-5 mt-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={<TrendingUp className="h-4 w-4 text-emerald-600" />}
              label="Total Pendapatan"
              value={formatCurrency(bookingStats.total_revenue)}
              small
            />
            <StatCard
              icon={<Plane className="h-4 w-4 text-blue-600" />}
              label="Akan Datang"
              value={upcomingCount}
            />
            <StatCard
              icon={<CheckCircle2 className="h-4 w-4 text-gray-500" />}
              label="Selesai"
              value={completedCount}
            />
            <StatCard
              icon={<Star className="h-4 w-4 text-orange-500" />}
              label="Total Keberangkatan"
              value={totalDepartures}
            />
          </div>

          {/* Departure status breakdown */}
          {departureStats.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Status Keberangkatan</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {departureStats.map(stat => {
                    const info = STATUS_DEPARTURE_LABELS[stat.status] ?? { label: stat.status, color: "bg-gray-100 text-gray-700" };
                    const fillRate = stat.total_quota > 0 ? Math.round((stat.filled_seats / stat.total_quota) * 100) : 0;
                    return (
                      <div key={stat.status} className="flex items-center justify-between gap-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${info.color}`}>{info.label}</span>
                        <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all"
                            style={{ width: `${Math.min(fillRate, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-20 text-right">
                          {stat.filled_seats}/{stat.total_quota} kursi
                        </span>
                        <span className="text-xs font-medium w-8 text-right">{stat.count}x</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent departures */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />Keberangkatan Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentDepartures.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada keberangkatan</p>
              ) : (
                <div className="divide-y">
                  {recentDepartures.map(dep => {
                    const info = STATUS_DEPARTURE_LABELS[dep.status] ?? { label: dep.status, color: "bg-gray-100 text-gray-700" };
                    const filled = (dep.quota ?? 0) - (dep.available_seats ?? 0);
                    return (
                      <div key={dep.id} className="py-2.5 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{dep.package_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {dep.departure_date ? format(new Date(dep.departure_date), "d MMM yyyy", { locale: localeId }) : "—"}
                            {dep.return_date ? ` – ${format(new Date(dep.return_date), "d MMM yyyy", { locale: localeId })}` : ""}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-muted-foreground">{filled}/{dep.quota}</span>
                          <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${info.color}`}>{info.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TAB KEUANGAN === */}
        <TabsContent value="keuangan" className="space-y-5 mt-4">
          {/* KPI Cards */}
          {(() => {
            const komisiPending   = branchCommissions.filter((c: any) => c.status === "pending").reduce((s: number, c: any) => s + Number(c.commission_amount || 0), 0);
            const komisiApproved  = branchCommissions.filter((c: any) => c.status === "approved").reduce((s: number, c: any) => s + Number(c.commission_amount || 0), 0);
            const komisiPaid      = branchCommissions.filter((c: any) => c.status === "paid").reduce((s: number, c: any) => s + Number(c.commission_amount || 0), 0);
            const totalRevenue    = Number(bookingStats.total_revenue || 0);
            const totalBookings   = bookingStats.total_bookings;

            function exportCommCSV() {
              if (!branchCommissions.length) return;
              const rows = branchCommissions.map((c: any, i: number) => ({
                No: i + 1,
                Tanggal: format(new Date(c.created_at), "dd/MM/yyyy"),
                Nominal: Number(c.commission_amount || 0),
                Rate: c.commission_rate ?? "-",
                Status: c.status,
                "Tgl Dibayar": c.paid_at ? format(new Date(c.paid_at), "dd/MM/yyyy") : "-",
                Referensi: c.payment_reference || "-",
                Catatan: c.notes || "-",
              }));
              const header = Object.keys(rows[0]).join(",");
              const body = rows.map((r: any) => Object.values(r).map((v: any) => JSON.stringify(v ?? "")).join(",")).join("\n");
              const blob = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8;" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
              a.download = `Komisi_${branch.code}_${format(new Date(), "yyyyMMdd")}.csv`; a.click();
            }

            const STATUS_KOMISI: Record<string, { label: string; cls: string }> = {
              pending:  { label: "Pending",    cls: "bg-amber-100 text-amber-800" },
              approved: { label: "Disetujui",  cls: "bg-blue-100 text-blue-800" },
              paid:     { label: "Dibayar",    cls: "bg-emerald-100 text-emerald-800" },
              rejected: { label: "Ditolak",    cls: "bg-red-100 text-red-800" },
            };

            return (
              <>
                {/* Summary cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs text-muted-foreground">Total Revenue</span>
                      </div>
                      <p className="font-bold text-lg text-emerald-700">{formatCurrency(totalRevenue)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{totalBookings} booking</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Receipt className="h-4 w-4 text-amber-600" />
                        <span className="text-xs text-muted-foreground">Komisi Pending</span>
                      </div>
                      <p className="font-bold text-lg text-amber-700">{formatCurrency(komisiPending)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{branchCommissions.filter((c: any) => c.status === "pending").length} transaksi</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="h-4 w-4 text-blue-600" />
                        <span className="text-xs text-muted-foreground">Komisi Disetujui</span>
                      </div>
                      <p className="font-bold text-lg text-blue-700">{formatCurrency(komisiApproved)}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs text-muted-foreground">Komisi Dibayar</span>
                      </div>
                      <p className="font-bold text-lg text-emerald-700">{formatCurrency(komisiPaid)}</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Monthly revenue chart */}
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />Tren Revenue 6 Bulan Terakhir
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {monthlyRevenue.every((m: any) => m.revenue === 0) ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Belum ada data revenue</p>
                    ) : (
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={monthlyRevenue} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="bulan" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => v >= 1_000_000 ? `${(v / 1_000_000).toFixed(0)}jt` : `${(v / 1_000).toFixed(0)}rb`} />
                          <Tooltip formatter={(v: number) => formatCurrency(v)} />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="revenue" name="Revenue (Rp)" fill="#10b981" radius={[3, 3, 0, 0]} />
                          <Bar dataKey="booking" name="Booking" fill="#6366f1" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Commission history */}
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Receipt className="h-4 w-4" />Riwayat Komisi Cabang
                    </CardTitle>
                    <Button size="sm" variant="outline" onClick={exportCommCSV} disabled={!branchCommissions.length}>
                      <Download className="h-3.5 w-3.5 mr-1" />Export CSV
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {branchCommissions.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">Belum ada data komisi cabang</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Tanggal</th>
                              <th className="text-right py-2 px-3 text-xs font-medium text-muted-foreground">Nominal</th>
                              <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Rate</th>
                              <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Referensi</th>
                              <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Tgl Dibayar</th>
                            </tr>
                          </thead>
                          <tbody>
                            {branchCommissions.slice(0, 20).map((c: any) => {
                              const st = STATUS_KOMISI[c.status] ?? { label: c.status, cls: "bg-gray-100 text-gray-700" };
                              return (
                                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/30">
                                  <td className="py-2 px-3 text-xs">{format(new Date(c.created_at), "dd MMM yyyy", { locale: localeId })}</td>
                                  <td className="py-2 px-3 text-right font-semibold text-emerald-700">{formatCurrency(c.commission_amount)}</td>
                                  <td className="py-2 px-3 text-center text-xs">{c.commission_rate != null ? `${c.commission_rate}%` : "—"}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                                  </td>
                                  <td className="py-2 px-3 text-xs font-mono">{c.payment_reference || "—"}</td>
                                  <td className="py-2 px-3 text-xs">{c.paid_at ? format(new Date(c.paid_at), "dd MMM yyyy", { locale: localeId }) : "—"}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {branchCommissions.length > 20 && (
                          <p className="text-xs text-muted-foreground text-center mt-2">Menampilkan 20 dari {branchCommissions.length} data</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>
      </Tabs>

      {/* Dialog Tambah Staff */}
      <AddStaffDialog
        open={addStaffOpen}
        onOpenChange={setAddStaffOpen}
        branchId={id!}
        branchName={branch.name}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ["branch-detail", id] })}
      />

      {/* Dialog Reset Password */}
      {resetUser && (
        <ResetPasswordDialog
          open={!!resetUser}
          onOpenChange={open => !open && setResetUser(null)}
          userId={resetUser.userId}
          userLabel={resetUser.label}
          userPhone={resetUser.phone}
        />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function StatCard({ icon, label, value, small }: { icon: React.ReactNode; label: string; value: string | number; small?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className={`font-bold ${small ? "text-sm" : "text-2xl"}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-muted-foreground flex-shrink-0">{label}</span>
      <span className="text-right font-medium">{value ?? "—"}</span>
    </div>
  );
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
      <div className="mb-3 opacity-40">{icon}</div>
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ─── AddStaffDialog ───────────────────────────────────────────────

interface AddStaffDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: string;
  branchName: string;
  onSuccess: () => void;
}

interface CreatedStaff {
  email: string;
  tempPassword: string;
  jabatan: string;
  waSent: boolean;
}

const JABATAN_OPTIONS = [
  { value: "operational", label: "Operasional" },
  { value: "sales", label: "Sales" },
  { value: "finance", label: "Keuangan" },
  { value: "hr", label: "HR" },
  { value: "marketing", label: "Marketing" },
];

function AddStaffDialog({ open, onOpenChange, branchId, branchName, onSuccess }: AddStaffDialogProps) {
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", jabatan: "" });
  const [created, setCreated] = useState<CreatedStaff | null>(null);
  const [copied, setCopied] = useState(false);

  const mut = useMutation({
    mutationFn: async () => {
      if (!form.fullName || !form.email || !form.jabatan) {
        throw new Error("Nama, email, dan jabatan wajib diisi");
      }
      const res = await fetch(`/api/branches/${branchId}/staff`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: form.fullName, email: form.email, phone: form.phone || null, jabatan: form.jabatan }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Gagal menambah staff");
      return data as CreatedStaff;
    },
    onSuccess: (data) => {
      setCreated(data);
      onSuccess();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleClose = (open: boolean) => {
    if (!open) {
      setForm({ fullName: "", email: "", phone: "", jabatan: "" });
      setCreated(null);
      setCopied(false);
    }
    onOpenChange(open);
  };

  const copyCredentials = () => {
    if (!created) return;
    navigator.clipboard.writeText(`Email: ${created.email}\nPassword: ${created.tempPassword}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tambah Staff — {branchName}</DialogTitle>
        </DialogHeader>

        {created ? (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Staff berhasil ditambahkan sebagai <strong>{ROLE_LABELS[created.jabatan] || created.jabatan}</strong>!
              </AlertDescription>
            </Alert>
            <div className="rounded-lg border p-4 space-y-2 text-sm">
              <p className="font-semibold flex items-center gap-1.5">
                <KeyRound className="h-4 w-4" />Kredensial Login
              </p>
              <InfoRow label="Email" value={<span className="font-mono">{created.email}</span>} />
              <InfoRow label="Password" value={<span className="font-mono">{created.tempPassword}</span>} />
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" variant="outline" onClick={copyCredentials} className="flex-1">
                  {copied ? <CheckCircle2 className="h-3 w-3 mr-1 text-green-600" /> : <Copy className="h-3 w-3 mr-1" />}
                  {copied ? "Tersalin" : "Salin Kredensial"}
                </Button>
                <span className={`text-xs flex items-center gap-1 ${created.waSent ? "text-green-700" : "text-amber-600"}`}>
                  <MessageCircle className="h-3 w-3" />
                  {created.waSent ? "WA terkirim" : "Kirim manual"}
                </span>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Selesai</Button>
            </DialogFooter>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div>
                <Label>Nama Lengkap *</Label>
                <Input value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} placeholder="Nama lengkap" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Email *</Label>
                  <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@..." />
                </div>
                <div>
                  <Label>Telepon (WA)</Label>
                  <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="08xx" />
                </div>
              </div>
              <div>
                <Label>Jabatan / Divisi *</Label>
                <Select value={form.jabatan} onValueChange={v => setForm({ ...form, jabatan: v })}>
                  <SelectTrigger><SelectValue placeholder="Pilih jabatan" /></SelectTrigger>
                  <SelectContent>
                    {JABATAN_OPTIONS.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>Batal</Button>
              <Button onClick={() => mut.mutate()} disabled={mut.isPending}>
                {mut.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                Tambah Staff
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
