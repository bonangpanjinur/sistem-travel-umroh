import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { 
  Wallet, CreditCard, FileText, Search, 
  CheckCircle, XCircle, Clock, TrendingUp,
  Calendar, User, ArrowRight, Filter
} from 'lucide-react';

export default function AdminSavings() {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showVerifyDialog, setShowVerifyDialog] = useState(false);
  const [verifyPayment, setVerifyPayment] = useState<any>(null);
  const [verifyAction, setVerifyAction] = useState<'verify' | 'reject'>('verify');

  // Check permission
  const canManage = hasRole('super_admin') || hasRole('owner') || hasRole('finance');
  
  if (!canManage) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-16 text-center">
            <Wallet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Akses Ditolak</h2>
            <p className="text-muted-foreground">
              Anda tidak memiliki akses ke halaman ini
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch all savings plans
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['admin', 'savings-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_plans')
        .select(`
          *,
          package:packages(name, savings_target),
          customer:customers(full_name, phone, user:users(email))
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all payments
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['admin', 'savings-payments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_payments')
        .select(`
          *,
          savings_plan:savings_plans(
            id,
            customer:customers(full_name),
            package:packages(name)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });

  // Filter plans
  const filteredPlans = useMemo(() => {
    return plans.filter((plan: any) => {
      if (statusFilter !== 'all' && plan.status !== statusFilter) return false;
      if (searchTerm) {
        const name = plan.customer?.full_name?.toLowerCase() || '';
        const packageName = plan.package?.name?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        if (!name.includes(search) && !packageName.includes(search)) return false;
      }
      return true;
    });
  }, [plans, statusFilter, searchTerm]);

  // Filter payments
  const filteredPayments = useMemo(() => {
    return payments.filter((payment: any) => {
      if (statusFilter !== 'all' && payment.status !== statusFilter) return false;
      if (searchTerm) {
        const planName = payment.savings_plan?.customer?.full_name?.toLowerCase() || '';
        const search = searchTerm.toLowerCase();
        if (!planName.includes(search)) return false;
      }
      return true;
    });
  }, [payments, statusFilter, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const activePlans = plans.filter((p: any) => p.status === 'active');
    const totalTarget = activePlans.reduce((sum: number, p: any) => sum + (p.target_amount || 0), 0);
    const totalPaid = activePlans.reduce((sum: number, p: any) => sum + (p.paid_amount || 0), 0);
    const pendingPayments = payments.filter((p: any) => p.status === 'pending').length;
    
    return {
      totalPlans: plans.length,
      activePlans: activePlans.length,
      totalTarget,
      totalPaid,
      pendingPayments,
      conversionRate: plans.length > 0 
        ? ((plans.filter((p: any) => p.status === 'converted').length / plans.length * 100).toFixed(1)
        : 0,
    };
  }, [plans, payments]);

  // Verify payment mutation
  const verifyPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!verifyPayment) return;
      
      const updates = {
        status: verifyAction === 'verify' ? 'verified' : 'rejected',
        verified_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('savings_payments')
        .update(updates)
        .eq('id', verifyPayment.id);
      
      if (error) throw error;

      // Update paid_amount in savings_plans if verified
      if (verifyAction === 'verify') {
        const { data: payment } = await supabase
          .from('savings_payments')
          .select('amount, savings_plan_id')
          .eq('id', verifyPayment.id)
          .single();
        
        if (payment) {
          const { data: plan } = await supabase
            .from('savings_plans')
            .select('paid_amount')
            .eq('id', payment.savings_plan_id)
            .single();
          
          if (plan) {
            await supabase
              .from('savings_plans')
              .update({ paid_amount: plan.paid_amount + payment.amount })
              .eq('id', payment.savings_plan_id);
          }
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'savings-plans'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'savings-payments'] });
      toast.success(
        verifyAction === 'verify' 
          ? 'Pembayaran diverifikasi!' 
          : 'Pembayaran ditolak'
      );
      setShowVerifyDialog(false);
      setVerifyPayment(null);
    },
    onError: (error: Error) => {
      toast.error('Gagal: ' + error.message);
    },
  });

  const handleVerifyPayment = (payment: any, action: 'verify' | 'reject') => {
    setVerifyPayment(payment);
    setVerifyAction(action);
    setShowVerifyDialog(true);
  };

  // Verify DP mutation for savings_plans (dp_status field)
  const verifyDpMutation = useMutation({
    mutationFn: async ({ planId, action }: { planId: string; action: 'verify' | 'reject' }) => {
      const updates = {
        dp_status: action === 'verify' ? 'verified' : 'rejected',
        dp_payment_date: new Date().toISOString(),
        status: action === 'verify' ? 'active' : 'dp_paid', // If verified, go to active. If rejected, stay in dp_paid
      };
      
      const { error } = await supabase
        .from('savings_plans')
        .update(updates)
        .eq('id', planId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'savings-plans'] });
      toast.success('DP berhasil diverifikasi!');
    },
    onError: (error: Error) => {
      toast.error('Gagal: ' + error.message);
    },
  });

  const handleVerifyDp = (plan: any, action: 'verify' | 'reject') => {
    verifyDpMutation.mutate({ planId: plan.id, action });
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Wallet className="h-6 w-6" />
            Kelola Tabungan
          </h1>
          <p className="text-muted-foreground">Kelola rencana tabungan dan pembayaran customer</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Rencana</p>
            <p className="text-2xl font-bold">{stats.totalPlans}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Aktif</p>
            <p className="text-2xl font-bold text-primary">{stats.activePlans}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Target</p>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalTarget)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Total Terkumpul</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground mb-1">Menunggu Verifikasi</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.pendingPayments}</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="plans" className="space-y-4">
        <TabsList>
          <TabsTrigger value="plans" className="gap-2">
            <Wallet className="h-4 w-4" />
            Rencana Tabungan
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Pembayaran
            {stats.pendingPayments > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
                {stats.pendingPayments}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="h-4 w-4" />
            Laporan
          </TabsTrigger>
        </TabsList>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau paket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
            >
              Semua
            </Button>
            <Button
              variant={statusFilter === 'active' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('active')}
            >
              Aktif
            </Button>
            <Button
              variant={statusFilter === 'completed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('completed')}
            >
              Lunas
            </Button>
            <Button
              variant={statusFilter === 'cancelled' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('cancelled')}
            >
              Batal
            </Button>
          </div>
        </div>

        {/* Plans Tab */}
        <TabsContent value="plans">
          <Card>
            <CardHeader>
              <CardTitle>Rencana Tabungan</CardTitle>
            </CardHeader>
            <CardContent>
              {plansLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : filteredPlans.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Tidak ada rencana tabungan
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Paket</TableHead>
                      <TableHead>DP</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Cicilan/Bulan</TableHead>
                      <TableHead>Terbayar</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Target Date</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPlans.map((plan: any) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{plan.customer?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{plan.customer?.user?.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{plan.package?.name}</TableCell>
                        <TableCell>
                          {plan.dp_amount > 0 ? (
                            <div>
                              <p className="font-medium">{formatCurrency(plan.dp_amount)}</p>
                              <p className={`text-xs ${
                                plan.dp_status === 'verified' ? 'text-green-600' :
                                plan.dp_status === 'rejected' ? 'text-red-600' :
                                'text-yellow-600'
                              }`}>
                                {plan.dp_status === 'verified' ? '✓' : 
                                 plan.dp_status === 'rejected' ? '✗' : '⏳'}
                              </p>
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell>{formatCurrency(plan.target_amount)}</TableCell>
                        <TableCell>{formatCurrency(plan.monthly_amount)}</TableCell>
                        <TableCell className="text-green-600">
                          {formatCurrency(plan.paid_amount)}
                        </TableCell>
                        <TableCell>
                          <div className="w-24">
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-primary rounded-full"
                                style={{ 
                                  width: `${Math.min(100, (plan.paid_amount / plan.target_amount) * 100)}%` 
                                }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                              {((plan.paid_amount / plan.target_amount) * 100).toFixed(0)}%
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            plan.status === 'dp_paid' ? 'bg-yellow-100 text-yellow-800' :
                            plan.status === 'active' ? 'bg-green-100 text-green-800' :
                            plan.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            plan.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-purple-100 text-purple-800'
                          }>
                            {plan.status === 'dp_paid' ? 'Menunggu DP' : plan.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(plan.target_date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {/* Show Verify DP button if dp_status is pending */}
                            {plan.dp_amount > 0 && plan.dp_status === 'pending' && (
                              <>
                                <Button
                                  size="sm"
                                  className="h-8 bg-green-600 hover:bg-green-700"
                                  onClick={() => handleVerifyDp(plan, 'verify')}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Verify
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8"
                                  onClick={() => handleVerifyDp(plan, 'reject')}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Tolak
                                </Button>
                              </>
                            )}
                            {/* Show status badge with proper text */}
                            {plan.dp_amount > 0 && plan.dp_status !== 'pending' && (
                              <span className={`text-xs ${
                                plan.dp_status === 'verified' ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {plan.dp_status === 'verified' ? 'DP ✅' : 'DP ❌'}
                              </span>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle>Pembayaran Cicilan</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i) => (
                    <Skeleton key={i} className="h-16" />
                  ))}
                </div>
              ) : filteredPayments.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  Tidak ada pembayaran
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Kode</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Paket</TableHead>
                      <TableHead>Jumlah</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment: any) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-xs">
                          {payment.payment_code}
                        </TableCell>
                        <TableCell>
                          {payment.savings_plan?.customer?.full_name}
                        </TableCell>
                        <TableCell>
                          {payment.savings_plan?.package?.name}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell>
                          {new Date(payment.payment_date).toLocaleDateString('id-ID')}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            payment.status === 'verified' ? 'bg-green-100 text-green-800' :
                            payment.status === 'rejected' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {payment.status === 'verified' ? 'Diterima' :
                             payment.status === 'rejected' ? 'Ditolak' :
                             'Menunggu'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {payment.status === 'pending' && (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-green-600 border-green-600 hover:bg-green-50"
                                onClick={() => handleVerifyPayment(payment, 'verify')}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-red-600 border-red-600 hover:bg-red-50"
                                onClick={() => handleVerifyPayment(payment, 'reject')}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Ringkasan Tabungan</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Rencana</span>
                  <span className="font-medium">{stats.totalPlans}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rencana Aktif</span>
                  <span className="font-medium">{stats.activePlans}</span>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Target</span>
                  <span className="font-medium">{formatCurrency(stats.totalTarget)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Terkumpul</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(stats.totalPaid)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conversion Rate</span>
                  <span className="font-medium">{stats.conversionRate}%</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Status Pembayaran</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Menunggu</span>
                  <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                    {payments.filter((p: any) => p.status === 'pending').length}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diterima</span>
                  <Badge variant="outline" className="bg-green-100 text-green-800">
                    {payments.filter((p: any) => p.status === 'verified').length}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ditolak</span>
                  <Badge variant="outline" className="bg-red-100 text-red-800">
                    {payments.filter((p: any) => p.status === 'rejected').length}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Pembayaran</span>
                  <span className="font-medium">
                    {formatCurrency(payments.reduce((sum: number, p: any) => 
                      sum + (p.status === 'verified' ? p.amount : 0), 0))}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Verify Dialog */}
      {showVerifyDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-sm mx-4">
            <CardHeader>
              <CardTitle>
                {verifyAction === 'verify' ? 'Verifikasi Pembayaran' : 'Tolak Pembayaran'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">Jumlah</p>
                <p className="text-xl font-bold">
                  {formatCurrency(verifyPayment?.amount)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {verifyPayment?.payment_code}
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowVerifyDialog(false)}
                >
                  Batal
                </Button>
                <Button
                  className="flex-1"
                  variant={verifyAction === 'verify' ? 'default' : 'destructive'}
                  onClick={() => verifyPaymentMutation.mutate()}
                  disabled={verifyPaymentMutation.isPending}
                >
                  {verifyPaymentMutation.isPending 
                    ? 'Memproses...' 
                    : verifyAction === 'verify' 
                    ? 'Terima' 
                    : 'Tolak'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}