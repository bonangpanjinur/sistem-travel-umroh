import { useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase as supabaseRaw } from '@/integrations/supabase/client';
import { useBranchCommissions, useBranchCommissionStats, useApproveBranchCommission, usePayBranchCommission } from '@/hooks/useBranchCommissions';
import { useBranchMembership } from '@/hooks/useMemberships';
import BaseDashboardTemplate, { DashboardStatsCard, DashboardQuickAction, DashboardAlert } from '@/components/dashboards/BaseDashboardTemplate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2, Users, TrendingUp, DollarSign, Package, Calendar,
  CheckCircle2, Clock, CreditCard, Crown, Star
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';

const supabase: any = supabaseRaw;

function PayCommissionDialog({ open, onClose, onConfirm, loading }: { open: boolean; onClose: () => void; onConfirm: (ref: string) => void; loading: boolean }) {
  const [ref, setRef] = useState("");
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Tandai Komisi Lunas</DialogTitle></DialogHeader>
        <div className="space-y-2">
          <Label>Referensi Pembayaran (opsional)</Label>
          <Input value={ref} onChange={e => setRef(e.target.value)} placeholder="No. transfer / kode referensi" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={() => onConfirm(ref)} disabled={loading}>{loading ? "Memproses..." : "Tandai Lunas"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MembershipBadge({ membership }: { membership: any }) {
  if (!membership) return <Badge variant="outline" className="text-xs">Tidak Berlangganan</Badge>;
  const status = membership.status;
  const plan = membership.membership_plans;
  const variant = status === 'active' ? 'default' : status === 'pending' ? 'secondary' : 'destructive';
  return (
    <Badge variant={variant} className="gap-1 text-xs">
      <Crown className="h-3 w-3" />
      {plan?.name || 'Keanggotaan'} — {status === 'active' ? 'Aktif' : status === 'pending' ? 'Menunggu' : 'Tidak Aktif'}
    </Badge>
  );
}

export default function BranchManagerDashboard() {
  const { branchId } = useAuth();

  const { data: membership } = useBranchMembership(branchId || undefined);
  const { data: commissionStats } = useBranchCommissionStats(branchId || undefined);
  const { data: commissions = [] } = useBranchCommissions(branchId || undefined);
  const approveComm = useApproveBranchCommission();
  const payComm = usePayBranchCommission();
  const [payTarget, setPayTarget] = useState<any>(null);

  // Fetch branch stats
  const { data: branchBookings = [], isLoading: statsLoading } = useQuery({
    queryKey: ['branch-bookings-stats', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const { data } = await supabase
        .from('bookings')
        .select('id, total_price, booking_status, created_at, customers(full_name), agents(company_name)')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!branchId,
  });

  const { data: agents = [] } = useQuery({
    queryKey: ['branch-agents-perf', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const { data } = await supabase
        .from('agents')
        .select('id, company_name, agent_code, email, phone, is_active, commission_rate')
        .eq('branch_id', branchId)
        .order('company_name');
      return data || [];
    },
    enabled: !!branchId,
  });

  const { data: agentBookingCounts = [] } = useQuery({
    queryKey: ['branch-agent-bookings', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const { data } = await supabase
        .from('bookings')
        .select('agent_id, total_price, booking_status')
        .eq('branch_id', branchId);
      return data || [];
    },
    enabled: !!branchId,
  });

  const { data: activeDepartures = [] } = useQuery({
    queryKey: ['branch-active-departures', branchId],
    queryFn: async () => {
      if (!branchId) return [];
      const { data } = await supabase
        .from('departures')
        .select('id, departure_date, quota, booked_count, packages(name)')
        .eq('branch_id', branchId)
        .gte('departure_date', new Date().toISOString())
        .order('departure_date', { ascending: true })
        .limit(5);
      return data || [];
    },
    enabled: !!branchId,
  });

  // Computed stats
  const totalRevenue = branchBookings.filter((b: any) => b.booking_status === 'confirmed').reduce((s: number, b: any) => s + Number(b.total_price), 0);
  const totalBookings = branchBookings.length;
  const confirmedBookings = branchBookings.filter((b: any) => b.booking_status === 'confirmed').length;
  const recentBookings = branchBookings.slice(0, 5);

  // Agent performance map
  const agentPerfMap = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    agentBookingCounts.forEach((b: any) => {
      if (!b.agent_id) return;
      if (!map[b.agent_id]) map[b.agent_id] = { count: 0, revenue: 0 };
      map[b.agent_id].count++;
      if (b.booking_status === 'confirmed') map[b.agent_id].revenue += Number(b.total_price);
    });
    return map;
  }, [agentBookingCounts]);

  const statsCards: DashboardStatsCard[] = useMemo(() => [
    { id: 'revenue', title: 'Pendapatan Cabang', value: formatCurrency(totalRevenue), subtitle: 'Dari booking confirmed', icon: DollarSign, color: 'primary', loading: statsLoading },
    { id: 'bookings', title: 'Total Booking', value: totalBookings, subtitle: `${confirmedBookings} terkonfirmasi`, icon: Package, color: 'blue', loading: statsLoading },
    { id: 'agents', title: 'Agen Aktif', value: agents.filter((a: any) => a.is_active).length, subtitle: 'Di cabang ini', icon: Users, color: 'emerald', loading: false },
    { id: 'commission', title: 'Komisi Pending', value: formatCurrency(commissionStats?.pending || 0), subtitle: `${commissionStats?.pendingCount || 0} transaksi`, icon: DollarSign, color: 'amber', loading: false },
  ], [totalRevenue, totalBookings, confirmedBookings, agents, commissionStats, statsLoading]);

  const quickActions: DashboardQuickAction[] = useMemo(() => [
    { id: 'create-booking', to: '/admin/bookings/create', icon: Package, label: 'Buat Booking', description: 'Booking baru jamaah', color: 'text-primary border-primary/20', hoverBg: 'hover:bg-primary/5' },
    { id: 'manage-agents', to: '/admin/agents', icon: Users, label: 'Kelola Agen', description: 'Daftar agen cabang', color: 'text-blue-600 border-blue-200', hoverBg: 'hover:bg-blue-50' },
    { id: 'departures', to: '/admin/departures', icon: Calendar, label: 'Jadwal', description: 'Keberangkatan', color: 'text-emerald-600 border-emerald-200', hoverBg: 'hover:bg-emerald-50' },
    { id: 'reports', to: '/admin/reports', icon: TrendingUp, label: 'Laporan', description: 'Laporan cabang', color: 'text-amber-600 border-amber-200', hoverBg: 'hover:bg-amber-50' },
  ], []);

  const alerts: DashboardAlert[] = useMemo(() => {
    const list: DashboardAlert[] = [];
    if ((commissionStats?.pendingCount || 0) > 0) {
      list.push({ id: 'pending-comm', type: 'warning', title: 'Komisi Cabang Menunggu', message: `${commissionStats?.pendingCount} komisi senilai ${formatCurrency(commissionStats?.pending || 0)} belum disetujui`, action: { label: 'Lihat', to: '/admin/branch-commissions' } });
    }
    if (!membership || membership.status !== 'active') {
      list.push({ id: 'no-membership', type: 'info', title: 'Keanggotaan Cabang', message: 'Aktifkan keanggotaan cabang untuk semua fitur', action: { label: 'Daftar', to: '/admin/memberships' } });
    }
    if (activeDepartures.length === 0) {
      list.push({ id: 'no-departures', type: 'info', title: 'Jadwal Kosong', message: 'Tidak ada keberangkatan terdekat', action: { label: 'Buat', to: '/admin/departures' } });
    }
    return list;
  }, [commissionStats, membership, activeDepartures]);

  const pendingCommissions = commissions.filter((c: any) => c.status === 'pending');
  const approvedCommissions = commissions.filter((c: any) => c.status === 'approved');

  return (
    <BaseDashboardTemplate
      title="Dashboard Cabang"
      subtitle="Ringkasan performa dan komisi cabang Anda"
      statusIndicator={true}
      statusText={<MembershipBadge membership={membership} /> as any}
      quickActions={quickActions}
      alerts={alerts}
      statsCards={statsCards}
    >
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Performa Agen</TabsTrigger>
          <TabsTrigger value="commissions">Komisi Cabang</TabsTrigger>
          <TabsTrigger value="departures">Jadwal</TabsTrigger>
        </TabsList>

        {/* Overview */}
        <TabsContent value="overview" className="mt-4 space-y-4">
          <Card className="shadow-sm border-muted/60 overflow-hidden">
            <CardHeader className="bg-muted/10 pb-4">
              <CardTitle className="text-lg font-bold">Booking Terbaru</CardTitle>
              <CardDescription>Transaksi terakhir dari cabang</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs uppercase text-muted-foreground font-bold">
                    <tr>
                      <th className="px-4 py-3 text-left">Jamaah</th>
                      <th className="px-4 py-3 text-left">Agen</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {recentBookings.length > 0 ? recentBookings.map((b: any) => (
                      <tr key={b.id} className="hover:bg-muted/20">
                        <td className="px-4 py-3 font-medium">{b.customers?.full_name || "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{b.agents?.company_name || "—"}</td>
                        <td className="px-4 py-3">
                          <Badge variant={b.booking_status === 'confirmed' ? 'default' : 'secondary'} className="text-xs">
                            {b.booking_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-bold">{formatCurrency(Number(b.total_price))}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={4} className="py-10 text-center text-muted-foreground">Belum ada booking</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Agent Performance */}
        <TabsContent value="agents" className="mt-4">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 pb-4">
              <CardTitle className="text-lg font-bold">Performa Agen</CardTitle>
              <CardDescription>Ranking booking & revenue per agen di cabang ini</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-xs uppercase text-muted-foreground font-bold">
                    <tr>
                      <th className="px-4 py-3 text-left">#</th>
                      <th className="px-4 py-3 text-left">Agen</th>
                      <th className="px-4 py-3 text-center">Total Booking</th>
                      <th className="px-4 py-3 text-right">Revenue</th>
                      <th className="px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {agents.length > 0 ? agents
                      .map((a: any) => ({ ...a, perf: agentPerfMap[a.id] || { count: 0, revenue: 0 } }))
                      .sort((a: any, b: any) => b.perf.revenue - a.perf.revenue)
                      .map((a: any, idx: number) => (
                        <tr key={a.id} className="hover:bg-muted/20">
                          <td className="px-4 py-3 text-muted-foreground font-mono">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-semibold">{a.company_name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{a.agent_code}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center font-bold">{a.perf.count}</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCurrency(a.perf.revenue)}</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant={a.is_active ? 'default' : 'secondary'} className="text-xs">
                              {a.is_active ? 'Aktif' : 'Nonaktif'}
                            </Badge>
                          </td>
                        </tr>
                      )) : (
                        <tr><td colSpan={5} className="py-10 text-center text-muted-foreground">Belum ada agen</td></tr>
                      )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Commissions */}
        <TabsContent value="commissions" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "Pending", value: commissionStats?.pending || 0, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Disetujui", value: commissionStats?.approved || 0, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "Lunas", value: commissionStats?.paid || 0, color: "text-emerald-600", bg: "bg-emerald-50" },
            ].map(s => (
              <Card key={s.label}><CardContent className="p-4">
                <div className={`rounded-lg p-3 ${s.bg}`}>
                  <p className={`text-base font-bold ${s.color}`}>{formatCurrency(s.value)}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent></Card>
            ))}
          </div>

          {[...pendingCommissions, ...approvedCommissions].length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Belum ada komisi yang perlu ditindaklanjuti</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {[...pendingCommissions, ...approvedCommissions].map((c: any) => (
                <Card key={c.id}><CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-semibold">{c.bookings?.booking_code || "—"}</p>
                      <p className="text-sm text-muted-foreground">{c.bookings?.customers?.full_name || "—"} · {formatDate(c.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-emerald-600">{formatCurrency(Number(c.commission_amount))}</span>
                      <Badge variant={c.status === 'pending' ? 'secondary' : 'default'}>{c.status === 'pending' ? 'Pending' : 'Disetujui'}</Badge>
                      {c.status === 'pending' && (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => approveComm.mutate(c.id)} disabled={approveComm.isPending}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />Setujui
                        </Button>
                      )}
                      {c.status === 'approved' && (
                        <Button size="sm" onClick={() => setPayTarget(c)} disabled={payComm.isPending}>
                          <CreditCard className="h-4 w-4 mr-1" />Bayar
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent></Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Departures */}
        <TabsContent value="departures" className="mt-4">
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 pb-4">
              <CardTitle className="text-lg font-bold">Jadwal Keberangkatan</CardTitle>
              <CardDescription>Grup yang akan segera berangkat</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {activeDepartures.length > 0 ? activeDepartures.map((d: any) => (
                <div key={d.id} className="flex items-center gap-4 p-3 rounded-xl border hover:border-primary/30 hover:shadow-sm transition-all">
                  <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-primary/5 border border-primary/10 text-primary">
                    <span className="text-[10px] font-bold uppercase">{format(new Date(d.departure_date), 'MMM', { locale: idLocale })}</span>
                    <span className="text-lg font-bold leading-none">{format(new Date(d.departure_date), 'dd')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{d.packages?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" />{d.booked_count}/{d.quota} Pax</p>
                  </div>
                  <Badge variant={d.booked_count >= d.quota ? 'destructive' : 'default'}>
                    {d.booked_count >= d.quota ? 'Penuh' : 'Tersedia'}
                  </Badge>
                </div>
              )) : (
                <div className="py-10 text-center text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Tidak ada jadwal terdekat</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PayCommissionDialog
        open={!!payTarget}
        onClose={() => setPayTarget(null)}
        loading={payComm.isPending}
        onConfirm={ref => {
          if (!payTarget) return;
          payComm.mutate({ id: payTarget.id, paymentReference: ref }, { onSuccess: () => setPayTarget(null) });
        }}
      />
    </BaseDashboardTemplate>
  );
}
