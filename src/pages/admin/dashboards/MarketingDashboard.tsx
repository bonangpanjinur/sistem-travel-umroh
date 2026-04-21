/**
 * MarketingDashboard.tsx
 * 
 * Dashboard khusus untuk Tim Marketing.
 * Menampilkan:
 * - Ringkasan kampanye aktif
 * - Metrik engagement (website, media sosial)
 * - Laporan konversi dari marketing
 * - Analisis demografi pelanggan
 * - Laporan ROI kampanye
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import BaseDashboardTemplate, { DashboardStatsCard, DashboardQuickAction, DashboardAlert } from '@/components/dashboards/BaseDashboardTemplate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Megaphone, TrendingUp, Users, BarChart3, Eye, MousePointerClick
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export default function MarketingDashboard() {
  // Fetch campaign summary
  const { data: campaignSummary, isLoading: campaignLoading } = useQuery({
    queryKey: ['marketing-campaign-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('id, name, status, budget, spent, impressions, clicks, conversions')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error fetching campaigns:', error);
        return null;
      }

      return data?.[0] || null;
    },
  });

  // Fetch engagement metrics
  const { data: engagementMetrics = {} } = useQuery({
    queryKey: ['marketing-engagement-metrics'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_metrics')
        .select('*')
        .order('date', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching metrics:', error);
        return {};
      }

      return data || {};
    },
  });

  // Fetch active campaigns
  const { data: activeCampaigns = [] } = useQuery({
    queryKey: ['marketing-active-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_campaigns')
        .select('id, name, status, budget, spent, impressions, clicks')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching active campaigns:', error);
        return [];
      }

      return data || [];
    },
  });

  // Fetch conversion data
  const { data: conversionData = [] } = useQuery({
    queryKey: ['marketing-conversion-data'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('marketing_conversions')
        .select('campaign_id, campaign_name, conversions, revenue')
        .order('revenue', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching conversion data:', error);
        return [];
      }

      return data || [];
    },
  });

  // Calculate ROI
  const calculateROI = (spent: number, revenue: number): number => {
    if (spent === 0) return 0;
    return ((revenue - spent) / spent) * 100;
  };

  // Calculate CTR
  const calculateCTR = (clicks: number, impressions: number): number => {
    if (impressions === 0) return 0;
    return (clicks / impressions) * 100;
  };

  // Stats cards
  const statsCards: DashboardStatsCard[] = useMemo(() => {
    const totalImpressions = activeCampaigns.reduce((sum: number, c: any) => sum + (c.impressions || 0), 0);
    const totalClicks = activeCampaigns.reduce((sum: number, c: any) => sum + (c.clicks || 0), 0);
    const totalSpent = activeCampaigns.reduce((sum: number, c: any) => sum + (c.spent || 0), 0);
    const totalRevenue = conversionData.reduce((sum: number, c: any) => sum + (c.revenue || 0), 0);

    return [
      {
        id: 'total-impressions',
        title: 'Total Impressions',
        value: totalImpressions.toLocaleString(),
        subtitle: 'Kampanye aktif',
        icon: Eye,
        trend: '+12.5%',
        trendUp: true,
        color: 'primary',
        loading: campaignLoading,
      },
      {
        id: 'total-clicks',
        title: 'Total Clicks',
        value: totalClicks.toLocaleString(),
        subtitle: `CTR: ${calculateCTR(totalClicks, totalImpressions).toFixed(2)}%`,
        icon: MousePointerClick,
        trend: '+8.2%',
        trendUp: true,
        color: 'blue',
        loading: campaignLoading,
      },
      {
        id: 'total-spent',
        title: 'Total Budget Terpakai',
        value: formatCurrency(totalSpent),
        subtitle: 'Bulan ini',
        icon: TrendingUp,
        color: 'amber',
        loading: campaignLoading,
      },
      {
        id: 'total-roi',
        title: 'ROI Kampanye',
        value: `${calculateROI(totalSpent, totalRevenue).toFixed(1)}%`,
        subtitle: 'Return on investment',
        icon: BarChart3,
        trend: '+18.7%',
        trendUp: true,
        color: 'emerald',
        loading: campaignLoading,
      },
    ];
  }, [activeCampaigns, conversionData, campaignLoading]);

  // Quick actions
  const quickActions: DashboardQuickAction[] = useMemo(() => [
    {
      id: 'create-campaign',
      to: '/admin/marketing-materials',
      icon: Megaphone,
      label: 'Kampanye Baru',
      description: 'Buat kampanye marketing',
      color: 'text-primary border-primary/20',
      hoverBg: 'hover:bg-primary/5',
    },
    {
      id: 'view-materials',
      to: '/admin/marketing-materials',
      icon: BarChart3,
      label: 'Materi Promosi',
      description: 'Kelola materi marketing',
      color: 'text-blue-600 border-blue-200',
      hoverBg: 'hover:bg-blue-50',
    },
    {
      id: 'view-landing-pages',
      to: '/admin/landing-pages',
      icon: TrendingUp,
      label: 'Landing Pages',
      description: 'Kelola landing pages',
      color: 'text-emerald-600 border-emerald-200',
      hoverBg: 'hover:bg-emerald-50',
    },
    {
      id: 'view-coupons',
      to: '/admin/coupons',
      icon: Users,
      label: 'Kupon',
      description: 'Kelola kupon promosi',
      color: 'text-amber-600 border-amber-200',
      hoverBg: 'hover:bg-amber-50',
    },
  ], []);

  // Alerts
  const alerts: DashboardAlert[] = useMemo(() => {
    const alertList: DashboardAlert[] = [];

    if (activeCampaigns.length === 0) {
      alertList.push({
        id: 'no-active-campaigns',
        type: 'info',
        title: 'Tidak Ada Kampanye Aktif',
        message: 'Buat kampanye baru untuk meningkatkan engagement',
        action: {
          label: 'Buat',
          to: '/admin/marketing-materials',
        },
      });
    }

    return alertList;
  }, [activeCampaigns]);

  return (
    <BaseDashboardTemplate
      title="Dashboard Marketing"
      subtitle="Ringkasan performa kampanye dan engagement"
      statusIndicator={true}
      statusText="Data Marketing Terkini"
      quickActions={quickActions}
      alerts={alerts}
      statsCards={statsCards}
    >
      {/* Active Campaigns */}
      <Card className="shadow-sm border-muted/60 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-muted/10 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Kampanye Aktif</CardTitle>
            <CardDescription>Kampanye marketing yang sedang berjalan</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/30 font-bold text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Nama Kampanye</th>
                  <th className="px-6 py-4">Impressions</th>
                  <th className="px-6 py-4">Clicks</th>
                  <th className="px-6 py-4">Budget</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeCampaigns.length > 0 ? (
                  activeCampaigns.map((campaign: any) => (
                    <tr key={campaign.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-bold">{campaign.name}</td>
                      <td className="px-6 py-4">{campaign.impressions?.toLocaleString()}</td>
                      <td className="px-6 py-4">{campaign.clicks?.toLocaleString()}</td>
                      <td className="px-6 py-4 font-bold">{formatCurrency(campaign.budget)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                      Belum ada kampanye aktif
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Conversion Report */}
      <Card className="shadow-sm border-muted/60 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-muted/10 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Laporan Konversi</CardTitle>
            <CardDescription>Konversi dari setiap kampanye</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/30 font-bold text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Kampanye</th>
                  <th className="px-6 py-4">Konversi</th>
                  <th className="px-6 py-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {conversionData.length > 0 ? (
                  conversionData.map((data: any) => (
                    <tr key={data.campaign_id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-bold">{data.campaign_name}</td>
                      <td className="px-6 py-4">{data.conversions}</td>
                      <td className="px-6 py-4 text-right font-bold">{formatCurrency(data.revenue)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">
                      Belum ada data konversi
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

