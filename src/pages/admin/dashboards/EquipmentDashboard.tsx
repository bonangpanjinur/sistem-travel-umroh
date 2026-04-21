/**
 * EquipmentDashboard.tsx
 * 
 * Dashboard khusus untuk Tim Perlengkapan.
 * Menampilkan:
 * - Daftar peralatan yang tersedia/digunakan
 * - Jadwal pemeliharaan rutin
 * - Laporan kerusakan dan perbaikan
 * - Riwayat penggunaan peralatan
 * - Notifikasi stok rendah
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase as supabaseRaw } from '@/integrations/supabase/client';
const supabase: any = supabaseRaw;
import BaseDashboardTemplate, { DashboardStatsCard, DashboardQuickAction, DashboardAlert } from '@/components/dashboards/BaseDashboardTemplate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Backpack, AlertTriangle, CheckCircle2, Wrench, Clock, TrendingDown
} from 'lucide-react';

export default function EquipmentDashboard() {
  // Fetch equipment inventory
  const { data: equipmentInventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ['equipment-inventory'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment')
        .select('id, name, category, status, quantity, condition')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching equipment:', error);
        return [];
      }

      return data || [];
    },
  });

  // Fetch maintenance schedule
  const { data: maintenanceSchedule = [] } = useQuery({
    queryKey: ['equipment-maintenance-schedule'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_maintenance')
        .select('id, equipment_name, maintenance_date, maintenance_type, status')
        .gte('maintenance_date', new Date().toISOString())
        .order('maintenance_date', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error fetching maintenance schedule:', error);
        return [];
      }

      return data || [];
    },
  });

  // Fetch damage reports
  const { data: damageReports = [] } = useQuery({
    queryKey: ['equipment-damage-reports'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipment_damage')
        .select('id, equipment_name, damage_date, description, status, severity')
        .order('damage_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching damage reports:', error);
        return [];
      }

      return data || [];
    },
  });

  // Calculate stats
  const stats = useMemo(() => {
    const totalEquipment = equipmentInventory.length;
    const availableEquipment = equipmentInventory.filter((e: any) => e.status === 'available').length;
    const inUseEquipment = equipmentInventory.filter((e: any) => e.status === 'in_use').length;
    const damageCount = equipmentInventory.filter((e: any) => e.condition === 'damaged').length;
    const lowStockCount = equipmentInventory.filter((e: any) => e.quantity < 5).length;

    return {
      totalEquipment,
      availableEquipment,
      inUseEquipment,
      damageCount,
      lowStockCount,
    };
  }, [equipmentInventory]);

  // Stats cards
  const statsCards: DashboardStatsCard[] = useMemo(() => [
    {
      id: 'total-equipment',
      title: 'Total Perlengkapan',
      value: stats.totalEquipment,
      subtitle: 'Dalam inventaris',
      icon: Backpack,
      color: 'primary',
      loading: inventoryLoading,
    },
    {
      id: 'available-equipment',
      title: 'Tersedia',
      value: stats.availableEquipment,
      subtitle: 'Siap digunakan',
      icon: CheckCircle2,
      trend: '+5.2%',
      trendUp: true,
      color: 'emerald',
      loading: inventoryLoading,
    },
    {
      id: 'in-use-equipment',
      title: 'Sedang Digunakan',
      value: stats.inUseEquipment,
      subtitle: 'Dalam penggunaan',
      icon: Clock,
      color: 'blue',
      loading: inventoryLoading,
    },
    {
      id: 'damaged-equipment',
      title: 'Rusak',
      value: stats.damageCount,
      subtitle: 'Perlu perbaikan',
      icon: AlertTriangle,
      color: 'amber',
      loading: inventoryLoading,
    },
  ], [stats, inventoryLoading]);

  // Quick actions
  const quickActions: DashboardQuickAction[] = useMemo(() => [
    {
      id: 'view-equipment',
      to: '/admin/equipment',
      icon: Backpack,
      label: 'Lihat Inventaris',
      description: 'Kelola perlengkapan',
      color: 'text-primary border-primary/20',
      hoverBg: 'hover:bg-primary/5',
    },
    {
      id: 'schedule-maintenance',
      to: '/admin/equipment',
      icon: Wrench,
      label: 'Jadwal Pemeliharaan',
      description: 'Kelola jadwal maintenance',
      color: 'text-blue-600 border-blue-200',
      hoverBg: 'hover:bg-blue-50',
    },
    {
      id: 'report-damage',
      to: '/admin/equipment',
      icon: AlertTriangle,
      label: 'Lapor Kerusakan',
      description: 'Buat laporan kerusakan',
      color: 'text-amber-600 border-amber-200',
      hoverBg: 'hover:bg-amber-50',
    },
    {
      id: 'view-history',
      to: '/admin/equipment',
      icon: TrendingDown,
      label: 'Riwayat',
      description: 'Lihat riwayat penggunaan',
      color: 'text-emerald-600 border-emerald-200',
      hoverBg: 'hover:bg-emerald-50',
    },
  ], []);

  // Alerts
  const alerts: DashboardAlert[] = useMemo(() => {
    const alertList: DashboardAlert[] = [];

    if (stats.damageCount > 0) {
      alertList.push({
        id: 'damaged-equipment',
        type: 'critical',
        title: 'Perlengkapan Rusak',
        message: `${stats.damageCount} perlengkapan dalam kondisi rusak`,
        action: {
          label: 'Lihat',
          to: '/admin/equipment',
        },
      });
    }

    if (stats.lowStockCount > 0) {
      alertList.push({
        id: 'low-stock',
        type: 'warning',
        title: 'Stok Rendah',
        message: `${stats.lowStockCount} item memiliki stok rendah`,
        action: {
          label: 'Lihat',
          to: '/admin/equipment',
        },
      });
    }

    if (maintenanceSchedule.length > 0) {
      alertList.push({
        id: 'maintenance-due',
        type: 'info',
        title: 'Pemeliharaan Terjadwal',
        message: `${maintenanceSchedule.length} pemeliharaan akan datang`,
        action: {
          label: 'Lihat',
          to: '/admin/equipment',
        },
      });
    }

    return alertList;
  }, [stats, maintenanceSchedule]);

  return (
    <BaseDashboardTemplate
      title="Dashboard Perlengkapan"
      subtitle="Manajemen inventaris dan pemeliharaan perlengkapan"
      statusIndicator={true}
      statusText="Data Perlengkapan Terkini"
      quickActions={quickActions}
      alerts={alerts}
      statsCards={statsCards}
    >
      {/* Maintenance Schedule */}
      <Card className="shadow-sm border-muted/60 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-muted/10 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Jadwal Pemeliharaan</CardTitle>
            <CardDescription>Pemeliharaan rutin yang akan datang</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/30 font-bold text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Perlengkapan</th>
                  <th className="px-6 py-4">Jenis Pemeliharaan</th>
                  <th className="px-6 py-4">Tanggal</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {maintenanceSchedule.length > 0 ? (
                  maintenanceSchedule.map((maintenance: any) => (
                    <tr key={maintenance.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-bold">{maintenance.equipment_name}</td>
                      <td className="px-6 py-4">{maintenance.maintenance_type}</td>
                      <td className="px-6 py-4 text-muted-foreground">{maintenance.maintenance_date}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          maintenance.status === 'scheduled' ? 'bg-blue-50 text-blue-700' :
                          maintenance.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {maintenance.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                      Tidak ada jadwal pemeliharaan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Damage Reports */}
      <Card className="shadow-sm border-muted/60 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-muted/10 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Laporan Kerusakan</CardTitle>
            <CardDescription>Kerusakan perlengkapan yang dilaporkan</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/30 font-bold text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Perlengkapan</th>
                  <th className="px-6 py-4">Deskripsi</th>
                  <th className="px-6 py-4">Severity</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {damageReports.length > 0 ? (
                  damageReports.map((report: any) => (
                    <tr key={report.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-bold">{report.equipment_name}</td>
                      <td className="px-6 py-4 text-muted-foreground">{report.description}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          report.severity === 'critical' ? 'bg-red-50 text-red-700' :
                          report.severity === 'high' ? 'bg-amber-50 text-amber-700' :
                          'bg-blue-50 text-blue-700'
                        }`}>
                          {report.severity?.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          report.status === 'completed' ? 'bg-emerald-50 text-emerald-700' :
                          report.status === 'in_progress' ? 'bg-blue-50 text-blue-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {report.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                      Tidak ada laporan kerusakan
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

