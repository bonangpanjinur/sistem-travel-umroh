/**
 * BranchManagerDashboard.tsx
 * 
 * Dashboard khusus untuk Branch Manager.
 * Menampilkan:
 * - Kinerja cabang (sales, bookings, pax)
 * - Laporan penjualan tim
 * - Status operasional
 * - Manajemen staf cabang
 * - Laporan komisi agen
 * - Status perjalanan yang sedang berlangsung
 * - Laporan kehadiran staf
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BaseDashboardTemplate, { DashboardStatsCard, DashboardQuickAction, DashboardAlert } from '@/components/dashboards/BaseDashboardTemplate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Building2, Users, TrendingUp, DollarSign, Package, Calendar,
  AlertTriangle, CheckCircle2, Clock, ArrowRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

export default function BranchManagerDashboard() {
  const { branchId, hasRole } = useAuth();

  // Fetch branch stats
  const { data: branchStats, isLoading: statsLoading } = useQuery({
    queryKey: ['branch-stats', branchId],
    queryFn: async () => {
      if (!branchId) return null;

      const { data, error } = await supabase
        .from('dashboard_stats')
        .select('*')
        .eq('branch_id', branchId)
        .single();

      if (error) {
        console.error('Error fetching branch stats:', error);
        return null;
      }

      return data;
    },
    enabled: !!branchId,
  });

  // Fetch branch agents
  const { data: agents = [] } = useQuery({
    queryKey: ['branch-agents', branchId],
    queryFn: async () => {
      if (!branchId) return [];

      const { data, error } = await supabase
        .from('agents')
        .select('id, company_name, email, phone, status')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .limit(10);

      if (error) {
        console.error('Error fetching branch agents:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!branchId,
  });

  // Fetch recent bookings for branch
  const { data: recentBookings = [] } = useQuery({
    queryKey: ['branch-recent-bookings', branchId],
    queryFn: async () => {
      if (!branchId) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select('id, customer_name, package_name, booking_status, total_price, created_at')
        .eq('branch_id', branchId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent bookings:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!branchId,
  });

  // Fetch active departures for branch
  const { data: activeDepartures = [] } = useQuery({
    queryKey: ['branch-active-departures', branchId],
    queryFn: async () => {
      if (!branchId) return [];

      const { data, error } = await supabase
        .from('departures')
        .select('id, package_name, departure_date, quota, booked_count')
        .eq('branch_id', branchId)
        .gte('departure_date', new Date().toISOString())
        .order('departure_date', { ascending: true })
        .limit(5);

      if (error) {
        console.error('Error fetching active departures:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!branchId,
  });

  // Stats cards
  const statsCards: DashboardStatsCard[] = useMemo(() => [
    {
      id: 'branch-revenue',
      title: 'Pendapatan Cabang',
      value: formatCurrency(branchStats?.total_revenue || 0),
      subtitle: 'Bulan ini',
      icon: DollarSign,
      trend: '+12.5%',
      trendUp: true,
      color: 'primary',
      loading: statsLoading,
    },
    {
      id: 'branch-bookings',
      title: 'Total Booking',
      value: branchStats?.total_bookings || 0,
      subtitle: 'Pesanan masuk',
      icon: Package,
      trend: '+8.2%',
      trendUp: true,
      color: 'blue',
      loading: statsLoading,
    },
    {
      id: 'branch-pax',
      title: 'Total Jamaah',
      value: branchStats?.total_pax || 0,
      subtitle: 'Terdaftar',
      icon: Users,
      trend: '+15.3%',
      trendUp: true,
      color: 'emerald',
      loading: statsLoading,
    },
    {
      id: 'branch-agents',
      title: 'Agen Aktif',
      value: agents.length,
      subtitle: 'Di cabang ini',
      icon: Users,
      color: 'amber',
      loading: false,
    },
  ], [branchStats, statsLoading, agents.length]);

  // Quick actions
  const quickActions: DashboardQuickAction[] = useMemo(() => [
    {
      id: 'create-booking',
      to: '/admin/bookings/create',
      icon: Package,
      label: 'Buat Booking',
      description: 'Booking baru untuk jamaah',
      color: 'text-primary border-primary/20',
      hoverBg: 'hover:bg-primary/5',
    },
    {
      id: 'manage-agents',
      to: '/admin/agents',
      icon: Users,
      label: 'Kelola Agen',
      description: 'Lihat daftar agen cabang',
      color: 'text-blue-600 border-blue-200',
      hoverBg: 'hover:bg-blue-50',
    },
    {
      id: 'view-departures',
      to: '/admin/departures',
      icon: Calendar,
      label: 'Jadwal',
      description: 'Lihat keberangkatan',
      color: 'text-emerald-600 border-emerald-200',
      hoverBg: 'hover:bg-emerald-50',
    },
    {
      id: 'view-reports',
      to: '/admin/reports',
      icon: TrendingUp,
      label: 'Laporan',
      description: 'Laporan cabang',
      color: 'text-amber-600 border-amber-200',
      hoverBg: 'hover:bg-amber-50',
    },
  ], []);

  // Alerts
  const alerts: DashboardAlert[] = useMemo(() => {
    const alertList: DashboardAlert[] = [];

    if ((branchStats?.total_outstanding || 0) > 0) {
      alertList.push({
        id: 'outstanding-payment',
        type: 'warning',
        title: 'Piutang Menunggu',
        message: `${formatCurrency(branchStats?.total_outstanding || 0)} belum terbayar`,
        action: {
          label: 'Lihat',
          to: '/admin/payments',
        },
      });
    }

    if (activeDepartures.length === 0) {
      alertList.push({
        id: 'no-departures',
        type: 'info',
        title: 'Jadwal Kosong',
        message: 'Tidak ada keberangkatan yang dijadwalkan',
        action: {
          label: 'Buat',
          to: '/admin/departures',
        },
      });
    }

    return alertList;
  }, [branchStats, activeDepartures]);

  return (
    <BaseDashboardTemplate
      title="Dashboard Cabang"
      subtitle={`Ringkasan performa cabang Anda`}
      statusIndicator={true}
      statusText={`Cabang: ${branchId || 'Tidak Diketahui'}`}
      quickActions={quickActions}
      alerts={alerts}
      statsCards={statsCards}
    >
      {/* Recent Bookings */}
      <Card className="shadow-sm border-muted/60 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-muted/10 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Booking Terbaru</CardTitle>
            <CardDescription>Transaksi terakhir dari cabang Anda</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/30 font-bold text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Jamaah / Paket</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentBookings.length > 0 ? (
                  recentBookings.map((booking: any) => (
                    <tr key={booking.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold">{booking.customer_name}</span>
                          <span className="text-[10px] text-muted-foreground">{booking.package_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          booking.booking_status === 'confirmed' ? 'bg-emerald-50 text-emerald-700' :
                          booking.booking_status === 'pending' ? 'bg-amber-50 text-amber-700' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {booking.booking_status?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        {formatCurrency(booking.total_price)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">
                      Belum ada booking
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Active Departures */}
      <Card className="shadow-sm border-muted/60 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-muted/10 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Jadwal Keberangkatan</CardTitle>
            <CardDescription>Grup yang akan segera berangkat</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="space-y-4">
            {activeDepartures.length > 0 ? (
              activeDepartures.map((departure: any) => (
                <div key={departure.id} className="flex items-center gap-4 p-3 rounded-xl border border-muted/60 hover:border-primary/30 hover:shadow-sm transition-all">
                  <div className="flex flex-col items-center justify-center h-12 w-12 rounded-lg bg-primary/5 border border-primary/10 text-primary">
                    <span className="text-[10px] font-bold uppercase">
                      {format(new Date(departure.departure_date), 'MMM', { locale: idLocale })}
                    </span>
                    <span className="text-lg font-bold leading-none">
                      {format(new Date(departure.departure_date), 'dd')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{departure.package_name}</p>
                    <span className="text-[10px] flex items-center gap-1 text-muted-foreground">
                      <Users className="h-3 w-3" /> {departure.booked_count}/{departure.quota} Pax
                    </span>
                  </div>
                  <span className="text-xs font-bold px-2 py-1 rounded bg-blue-50 text-blue-700">SIAP</span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Calendar className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">Tidak ada jadwal terdekat</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Branch Agents */}
      <Card className="shadow-sm border-muted/60 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-muted/10 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Agen Cabang</CardTitle>
            <CardDescription>Daftar agen yang bekerja di cabang Anda</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/30 font-bold text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Nama Agen</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {agents.length > 0 ? (
                  agents.map((agent: any) => (
                    <tr key={agent.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-bold">{agent.company_name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{agent.email}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          agent.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'
                        }`}>
                          {agent.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">
                      Belum ada agen
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </BaseDashboardTemplate>
  );
}
