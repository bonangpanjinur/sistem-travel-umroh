/**
 * FinanceDashboard.tsx
 * 
 * Dashboard khusus untuk Tim Keuangan.
 * Menampilkan:
 * - Ringkasan P&L
 * - Laporan arus kas
 * - Daftar transaksi masuk/keluar
 * - Status pembayaran pelanggan
 * - Laporan pengeluaran operasional
 * - Integrasi dengan AdminFinancePL.tsx
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase as supabaseRaw } from '@/integrations/supabase/client';
const supabase: any = supabaseRaw;
import BaseDashboardTemplate, { DashboardStatsCard, DashboardQuickAction, DashboardAlert } from '@/components/dashboards/BaseDashboardTemplate';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  DollarSign, TrendingUp, TrendingDown, CreditCard, Wallet, AlertTriangle
} from 'lucide-react';
import { formatCurrency } from '@/lib/format';

export default function FinanceDashboard() {
  // Fetch financial summary
  const { data: financialSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['finance-summary'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('financial_summary')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching financial summary:', error);
        return null;
      }

      return data as any;
    },
  });

  // Fetch recent transactions
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['finance-recent-transactions'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('transactions')
        .select('id, description, type, amount, transaction_date, status')
        .order('transaction_date', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error fetching transactions:', error);
        return [];
      }

      return data || [];
    },
  });

  // Fetch outstanding payments
  const { data: outstandingPayments = [] } = useQuery({
    queryKey: ['finance-outstanding-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('id, customer_name, booking_id, amount, due_date, status')
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(10);

      if (error) {
        console.error('Error fetching outstanding payments:', error);
        return [];
      }

      return data || [];
    },
  });

  // Fetch expense summary
  const { data: expenseSummary = {} } = useQuery({
    queryKey: ['finance-expense-summary'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('expenses')
        .select('category, amount')
        .order('category', { ascending: true });

      if (error) {
        console.error('Error fetching expenses:', error);
        return {};
      }

      // Group by category
      const grouped: Record<string, number> = {};
      (data || []).forEach((exp: any) => {
        grouped[exp.category] = (grouped[exp.category] || 0) + exp.amount;
      });

      return grouped;
    },
  });

  // Stats cards
  const statsCards: DashboardStatsCard[] = useMemo(() => [
    {
      id: 'total-revenue',
      title: 'Total Pendapatan',
      value: formatCurrency(financialSummary?.total_revenue || 0),
      subtitle: 'Bulan ini',
      icon: TrendingUp,
      trend: '+12.5%',
      trendUp: true,
      color: 'primary',
      loading: summaryLoading,
    },
    {
      id: 'total-expenses',
      title: 'Total Pengeluaran',
      value: formatCurrency(financialSummary?.total_expenses || 0),
      subtitle: 'Bulan ini',
      icon: TrendingDown,
      trend: '+5.2%',
      trendUp: false,
      color: 'blue',
      loading: summaryLoading,
    },
    {
      id: 'net-profit',
      title: 'Laba Bersih',
      value: formatCurrency((financialSummary?.total_revenue || 0) - (financialSummary?.total_expenses || 0)),
      subtitle: 'Bulan ini',
      icon: DollarSign,
      trend: '+18.7%',
      trendUp: true,
      color: 'emerald',
      loading: summaryLoading,
    },
    {
      id: 'outstanding',
      title: 'Piutang',
      value: formatCurrency(financialSummary?.total_outstanding || 0),
      subtitle: 'Belum terbayar',
      icon: CreditCard,
      color: 'amber',
      loading: summaryLoading,
    },
  ], [financialSummary, summaryLoading]);

  // Quick actions
  const quickActions: DashboardQuickAction[] = useMemo(() => [
    {
      id: 'view-pl',
      to: '/admin/finance',
      icon: DollarSign,
      label: 'Laporan P&L',
      description: 'Lihat profit & loss',
      color: 'text-primary border-primary/20',
      hoverBg: 'hover:bg-primary/5',
    },
    {
      id: 'view-cash',
      to: '/admin/finance-cash',
      icon: Wallet,
      label: 'Kas & Bank',
      description: 'Manajemen kas',
      color: 'text-blue-600 border-blue-200',
      hoverBg: 'hover:bg-blue-50',
    },
    {
      id: 'view-ar',
      to: '/admin/finance/ar',
      icon: TrendingUp,
      label: 'Piutang',
      description: 'Piutang jamaah',
      color: 'text-emerald-600 border-emerald-200',
      hoverBg: 'hover:bg-emerald-50',
    },
    {
      id: 'view-ap',
      to: '/admin/finance/ap',
      icon: TrendingDown,
      label: 'Hutang',
      description: 'Hutang vendor',
      color: 'text-amber-600 border-amber-200',
      hoverBg: 'hover:bg-amber-50',
    },
  ], []);

  // Alerts
  const alerts: DashboardAlert[] = useMemo(() => {
    const alertList: DashboardAlert[] = [];

    if (outstandingPayments.length > 0) {
      const totalOutstanding = outstandingPayments.reduce((sum, p: any) => sum + p.amount, 0);
      alertList.push({
        id: 'outstanding-payments',
        type: 'warning',
        title: 'Piutang Menunggu',
        message: `${outstandingPayments.length} pembayaran menunggu - ${formatCurrency(totalOutstanding)}`,
        action: {
          label: 'Lihat',
          to: '/admin/finance/ar',
        },
      });
    }

    return alertList;
  }, [outstandingPayments]);

  return (
    <BaseDashboardTemplate
      title="Dashboard Keuangan"
      subtitle="Ringkasan laporan keuangan dan arus kas"
      statusIndicator={true}
      statusText="Data Keuangan Terkini"
      quickActions={quickActions}
      alerts={alerts}
      statsCards={statsCards}
    >
      {/* Recent Transactions */}
      <Card className="shadow-sm border-muted/60 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-muted/10 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Transaksi Terbaru</CardTitle>
            <CardDescription>Transaksi masuk dan keluar</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/30 font-bold text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Deskripsi</th>
                  <th className="px-6 py-4">Tipe</th>
                  <th className="px-6 py-4 text-right">Jumlah</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentTransactions.length > 0 ? (
                  recentTransactions.map((transaction: any) => (
                    <tr key={transaction.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4">{transaction.description}</td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          transaction.type === 'income' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {transaction.type === 'income' ? 'MASUK' : 'KELUAR'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-xs font-bold px-2 py-1 rounded ${
                          transaction.status === 'completed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                        }`}>
                          {transaction.status?.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-10 text-center text-muted-foreground">
                      Belum ada transaksi
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Outstanding Payments */}
      <Card className="shadow-sm border-muted/60 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-muted/10 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Piutang Menunggu</CardTitle>
            <CardDescription>Pembayaran yang belum diterima</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/30 font-bold text-muted-foreground">
                <tr>
                  <th className="px-6 py-4">Jamaah</th>
                  <th className="px-6 py-4">Jumlah</th>
                  <th className="px-6 py-4">Jatuh Tempo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {outstandingPayments.length > 0 ? (
                  outstandingPayments.map((payment: any) => (
                    <tr key={payment.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-6 py-4 font-bold">{payment.customer_name}</td>
                      <td className="px-6 py-4 font-bold">{formatCurrency(payment.amount)}</td>
                      <td className="px-6 py-4 text-muted-foreground">{payment.due_date}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3} className="px-6 py-10 text-center text-muted-foreground">
                      Tidak ada piutang menunggu
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Expense Summary */}
      <Card className="shadow-sm border-muted/60 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-muted/10 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">Ringkasan Pengeluaran</CardTitle>
            <CardDescription>Pengeluaran berdasarkan kategori</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
            {Object.entries(expenseSummary).map(([category, amount]: [string, any]) => (
              <div key={category} className="p-4 rounded-lg border border-muted/60 hover:border-primary/30 transition-colors">
                <p className="text-xs font-bold text-muted-foreground uppercase mb-1">{category}</p>
                <p className="text-lg font-bold">{formatCurrency(amount)}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </BaseDashboardTemplate>
  );
}
