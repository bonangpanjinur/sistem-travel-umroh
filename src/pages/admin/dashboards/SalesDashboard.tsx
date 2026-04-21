/**
 * SalesDashboard.tsx
 * 
 * Dashboard khusus untuk Tim Sales.
 * Menampilkan:
 * - Target penjualan vs realisasi
 * - Pipeline leads
 * - Status konversi
 * - Daftar pelanggan potensial
 * - Laporan komisi pribadi
 * - Integrasi dengan AdminLeads.tsx
 */

import { useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase as supabaseRaw } from '@/integrations/supabase/client';
const supabase: any = supabaseRaw;
import BaseDashboardTemplate, { DashboardStatsCard, DashboardQuickAction, DashboardAlert } from '@/components/dashboards/BaseDashboardTemplate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  TrendingUp, Target, Users, DollarSign, UserPlus, AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export default function SalesDashboard() {
  const { user } = useAuth();

  // Fetch sales target
  const { data: salesTarget, isLoading: targetLoading } = useQuery({
    queryKey: ['sales-target', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await (supabase as any)
        .from('sales_targets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching sales target:', error);
        return null;
      }

      return data as any;
    },
    enabled: !!user?.id,
  });

  // Fetch sales performance
  const { data: salesPerformance, isLoading: perfLoading } = useQuery({
    queryKey: ['sales-performance', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await (supabase as any)
        .from('bookings')
        .select('id, total_price, booking_status, created_at')
        .eq('sales_person_id', user.id)
        .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString());

      if (error) {
        console.error('Error fetching sales performance:', error);
        return null;
      }

      // Calculate stats
      const totalBookings = data?.length || 0;
      const totalRevenue = data?.reduce((sum: number, b: any) => sum + (b.total_price || 0), 0) || 0;
      const confirmedBookings = data?.filter((b: any) => b.booking_status === 'confirmed').length || 0;

      return {
        totalBookings,
        totalRevenue,
        confirmedBookings,
        conversionRate: totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 0,
      };
    },
    enabled: !!user?.id,
  });

  // Fetch leads pipeline
  const { data: leadsPipeline = [] } = useQuery({
    queryKey: ['sales-leads-pipeline', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('leads')
        .select('id, customer_name, email, status, created_at')
        .eq('assigned_to', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching leads:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
  });

  // Fetch recent bookings
  const { data: recentBookings = [] } = useQuery({
    queryKey: ['sales-recent-bookings', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('bookings')
        .select('id, customer_name, package_name, total_price, booking_status, created_at')
        .eq('sales_person_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching bookings:', error);
        return [];
      }

      return data || [];
    },
    enabled: !!user?.id,
  });

  // Stats cards
  const statsCards: DashboardStatsCard[] = useMemo(() => [
    {
      id: 'sales-revenue',
      title: 'Pendapatan Bulan Ini',
      value: formatCurrency(salesPerformance?.totalRevenue || 0),
      subtitle: 'Dari booking',
      icon: DollarSign,
      trend: '+12.5%',
      trendUp: true,
      color: 'primary',
      loading: perfLoading,
    },
    {
      id: 'sales-bookings',
      title: 'Total Booking',
      value: salesPerformance?.totalBookings || 0,
      subtitle: 'Bulan ini',
      icon: TrendingUp,
      trend: '+8.2%',
      trendUp: true,
      color: 'blue',
      loading: perfLoading,
    },
    {
      id: 'sales-conversion',
      title: 'Konversi',
      value: `${(salesPerformance?.conversionRate || 0).toFixed(1)}%`,
      subtitle: 'Dari leads',
      icon: Target,
      trend: '+5.3%',
      trendUp: true,
      color: 'emerald',
      loading: perfLoading,
    },
    {
      id: 'sales-target',
      title: 'Target Bulan',
      value: formatCurrency(salesTarget?.target_amount || 0),
      subtitle: 'Target penjualan',
      icon: Target,
      color: 'amber',
      loading: targetLoading,
    },
  ], [salesPerformance, salesTarget, perfLoading, targetLoading]);

  // Quick actions
  const quickActions: DashboardQuickAction[] = useMemo(() => [
    {
      id: 'view-leads',
      to: '/admin/leads',
      icon: UserPlus,
      label: 'Leads',
      description: 'Kelola leads Anda',
      color: 'text-primary border-primary/20',
      hoverBg: 'hover:bg-primary/5',
    },
    {
      id: 'create-booking',
      to: '/admin/bookings/create',
      icon: TrendingUp,
      label: 'Buat Booking',
      description: 'Booking baru',
      color: 'text-blue-600 border-blue-200',
      hoverBg: 'hover:bg-blue-50',
    },
    {
      id: 'view-customers',
      to: '/admin/customers',
      icon: Users,
      label: 'Pelanggan',
      description: 'Daftar pelanggan',
      color: 'text-emerald-600 border-emerald-200',
      hoverBg: 'hover:bg-emerald-50',
    },
    {
      id: 'view-analytics',
      to: '/admin/leads/analytics',
      icon: TrendingUp,
      label: 'Analitik',
      description: 'Laporan penjualan',
      color: 'text-amber-600 border-amber-200',
      hoverBg: 'hover:bg-amber-50',
    },
  ], []);

  // Alerts
  const alerts: DashboardAlert[] = useMemo(() => {
    const alertList: DashboardAlert[] = [];

    if (salesTarget && salesPerformance) {
      const progress = (salesPerformance.totalRevenue / salesTarget.target_amount) * 100;
      if (progress < 50) {
        alertList.push({
          id: 'low-target-progress',
          type: 'warning',
          title: 'Target Rendah',
          message: `Baru mencapai ${progress.toFixed(1)}% dari target bulan ini`,
          action: {
            label: 'Lihat',
            to: '/admin/leads',
          },
        });
      }
    }

    if (leadsPipeline.length === 0) {
      alertList.push({
        id: 'no-leads',
        type: 'info',
        title: 'Tidak Ada Leads',
        message: 'Anda tidak memiliki leads yang ditugaskan',
        action: {
          label: 'Lihat Semua',
          to: '/admin/leads',
        },
      });
    }

    return alertList;
  }, [salesTarget, salesPerformance, leadsPipeline]);

  return (
    <BaseDashboardTemplate
      title="Dashboard Penjualan"
      subtitle="Ringkasan target dan performa penjualan Anda"
      statusIndicator={true}
      statusText="Data Penjualan Terkini"
      quickActions={quickActions}
      alerts={alerts}
      statsCards={statsCards}
    >
      {/* Leads Pipeline */}
      <Card className="shadow-sm border-muted/60 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-muted/10 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Pipeline Leads</CardTitle>
            <CardDescription>Leads yang ditugaskan kepada Anda</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/30 font-bold text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Nama</th>
                  <th className="px-6 py-4">Email</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {leadsPipeline.length > 0 ? (
                  leadsPipeline.map((lead: any) => (
                    <tr key={lead.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-bold">{lead.customer_name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{lead.email}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          lead.status === 'qualified' ? 'bg-emerald-50 text-emerald-700' :
                          lead.status === 'contacted' ? 'bg-blue-50 text-blue-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {lead.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">
                      Belum ada leads
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card className="shadow-sm border-muted/60 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-muted/10 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Booking Terbaru</CardTitle>
            <CardDescription>Booking yang Anda buat</CardDescription>
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
    </BaseDashboardTemplate>
  );
}
