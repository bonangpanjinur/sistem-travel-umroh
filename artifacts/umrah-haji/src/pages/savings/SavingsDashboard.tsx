import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { 
  Wallet, Calendar, TrendingUp, Clock, Upload, 
  ChevronRight, ArrowUpCircle, ArrowDownCircle, 
  History, Home, LogOut, CheckCircle, AlertCircle
} from 'lucide-react';
import { useEffect } from 'react';
import { SavingsConvertDialog } from '@/components/savings/SavingsConvertDialog';
import { SavingsScheduleList } from '@/components/savings/SavingsScheduleList';
import { Plane } from 'lucide-react';

export default function SavingsDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [convertOpen, setConvertOpen] = useState(false);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth/login?redirect=/savings/dashboard');
    }
  }, [user, navigate]);

  // Fetch customer's savings plans
  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['savings-plans', 'my'],
    queryFn: async () => {
      if (!user) return [];
      
      // First get customer ID
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();
      
      if (!customer) return [];
      
      const { data, error } = await supabase
        .from('savings_plans')
        .select(`
          *,
          package:packages(*)
        `)
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch payments for the plans
  const { data: payments = [] } = useQuery({
    queryKey: ['savings-payments', 'my', plans.map(p => p.id)],
    queryFn: async () => {
      if (!plans.length) return [];
      
      const planIds = plans.map(p => p.id);
      const { data, error } = await supabase
        .from('savings_payments')
        .select('*')
        .in('savings_plan_id', planIds)
        .order('payment_date', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: plans.length > 0,
  });

  // Calculate progress - include DP status
  const activePlan = useMemo(() => {
    return plans.find((p: any) => p.status === 'active' || p.status === 'dp_paid') as any;
  }, [plans]);

  const progress = useMemo(() => {
    if (!activePlan) return 0;
    return Math.min(100, (activePlan.paid_amount / activePlan.target_amount) * 100);
  }, [activePlan]);

  // Get status label
  const getStatusLabel = (plan: any) => {
    if (plan.status === 'dp_paid') return 'Menunggu Verifikasi DP';
    if (plan.status === 'active') return 'Aktif';
    if (plan.status === 'completed') return 'Lunas';
    if (plan.status === 'cancelled') return 'Dibatalkan';
    if (plan.status === 'converted') return 'Dikonversi';
    return plan.status;
  };

  // Submit payment mutation
  const submitPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!activePlan || !paymentAmount) {
        throw new Error('Invalid data');
      }

      // Generate payment code
      const { data: paymentCode } = await supabase.rpc('generate_savings_payment_code');
      
      // For now, create without file upload (simplified)
      const { error } = await supabase
        .from('savings_payments')
        .insert({
          savings_plan_id: activePlan.id,
          payment_code: paymentCode || `PAY${Date.now()}`,
          amount: parseFloat(paymentAmount),
          payment_date: new Date().toISOString().split('T')[0],
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-plans'] });
      queryClient.invalidateQueries({ queryKey: ['savings-payments'] });
      toast.success('Pembayaran cicilan berhasil submitted!');
      setShowPaymentForm(false);
      setPaymentAmount('');
      setPaymentProof(null);
    },
    onError: (error: Error) => {
      toast.error('Gagal: ' + error.message);
    },
  });

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error('Masukkan jumlah pembayaran');
      return;
    }
    setIsSubmitting(true);
    await submitPaymentMutation.mutateAsync();
    setIsSubmitting(false);
  };

  if (!user) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Silakan Login</h1>
          <p className="text-muted-foreground mb-8">Anda perlu login untuk melihat tabungan</p>
          <Button asChild>
            <Link to="/auth/login?redirect=/savings/dashboard">Login</Link>
          </Button>
        </div>
      </DynamicPublicLayout>
    );
  }

  if (isLoading) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <Skeleton className="h-64 w-full mb-4" />
          <Skeleton className="h-32 w-full" />
        </div>
      </DynamicPublicLayout>
    );
  }

  if (!plans.length) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Wallet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">Belum Ada Tabungan</h1>
          <p className="text-muted-foreground mb-8">
            Anda belum terdaftar dalam program tabungan apapun
          </p>
          <Button asChild>
            <Link to="/savings">Lihat Paket Tabungan</Link>
          </Button>
        </div>
      </DynamicPublicLayout>
    );
  }

  return (
    <DynamicPublicLayout>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Tabungan Saya</h1>
        <p className="text-muted-foreground mb-8">Kelola rencana tabungan umroh Anda</p>

        {/* Active Plan Card */}
        {activePlan && (
          <Card className="mb-8">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  {activePlan.package?.name || 'Tabungan'}
                </CardTitle>
                <Badge variant="secondary" className={`${
                  activePlan.status === 'dp_paid' ? 'bg-yellow-100 text-yellow-800' :
                  activePlan.status === 'completed' ? 'bg-green-100 text-green-800' :
                  activePlan.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {getStatusLabel(activePlan)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress Tabungan</span>
                  <span className="font-medium">{progress.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{formatCurrency(activePlan.paid_amount)}</span>
                  <span>{formatCurrency(activePlan.target_amount)}</span>
                </div>
              </div>

              <Separator />

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Cicilan/Bulan</p>
                  <p className="text-lg font-bold">{formatCurrency(activePlan.monthly_amount)}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Tenor</p>
                  <p className="text-lg font-bold">{activePlan.tenor_months} Bulan</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Sisa</p>
                  <p className="text-lg font-bold text-primary">
                    {formatCurrency(activePlan.target_amount - activePlan.paid_amount)}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground mb-1">Target Lunas</p>
                  <p className="text-lg font-bold flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(activePlan.target_date).toLocaleDateString('id-ID', {
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>

              {/* DP Status Alert */}
              {activePlan.dp_amount > 0 && (
                <div className={`p-4 rounded-lg ${
                  activePlan.dp_status === 'verified' ? 'bg-green-50 border border-green-200' :
                  activePlan.dp_status === 'rejected' ? 'bg-red-50 border border-red-200' :
                  'bg-yellow-50 border border-yellow-200'
                }`}>
                  <div className="flex items-center gap-2">
                    {activePlan.dp_status === 'verified' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : activePlan.dp_status === 'rejected' ? (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-600" />
                    )}
                    <div>
                      <p className="font-medium">Down Payment (DP): {formatCurrency(activePlan.dp_amount)}</p>
                      <p className="text-sm">
                        {activePlan.dp_status === 'verified' ? 'Terverifikasi ✓' : 
                         activePlan.dp_status === 'rejected' ? 'Ditolak - Silakan hubungi admin' :
                         'Menunggu verifikasi admin'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Actions */}
              <div className="flex gap-3">
                <Button 
                  className="flex-1" 
                  onClick={() => setShowPaymentForm(!showPaymentForm)}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Pembayaran
                </Button>
                <Button variant="outline" asChild>
                  <Link to={`/savings/success/${activePlan.id}`}>
                    Detail
                  </Link>
                </Button>
                {activePlan.paid_amount > 0 && activePlan.status !== 'converted' && (
                  <Button variant="default" onClick={() => setConvertOpen(true)}>
                    <Plane className="h-4 w-4 mr-2" />
                    Konversi ke Booking
                  </Button>
                )}
              </div>

              {/* Payment Form */}
              {showPaymentForm && (
                <form onSubmit={handleSubmitPayment} className="p-4 bg-muted/30 rounded-lg space-y-4">
                  <h4 className="font-medium">Upload Bukti Pembayaran</h4>
                  <div className="space-y-2">
                    <Label>Jumlah Transfer (Rp)</Label>
                    <Input
                      type="number"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={activePlan.monthly_amount?.toString()}
                      min={1}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bukti Transfer</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Upload bukti transfer (jpg, png)
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={() => setShowPaymentForm(false)}
                    >
                      Batal
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={isSubmitting || !paymentAmount}
                    >
                      {isSubmitting ? 'Mengirim...' : 'Kirim'}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        {payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Riwayat Pembayaran
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div 
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {payment.status === 'verified' ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : payment.status === 'rejected' ? (
                        <AlertCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <Clock className="h-5 w-5 text-yellow-600" />
                      )}
                      <div>
                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {payment.payment_code} • {new Date(payment.payment_date).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                    <Badge 
                      variant="secondary"
                      className={
                        payment.status === 'verified' 
                          ? 'bg-green-100 text-green-800'
                          : payment.status === 'rejected'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }
                    >
                      {payment.status === 'verified' 
                        ? 'Diterima' 
                        : payment.status === 'rejected'
                        ? 'Ditolak'
                        : 'Menunggu'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Other Plans */}
        {plans.filter(p => p.status !== 'active').length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Riwayat Tabungan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {plans.filter(p => p.status !== 'active').map((plan) => (
                <div 
                  key={plan.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{plan.package?.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(plan.target_amount)} • {plan.tenor_months} bulan
                    </p>
                  </div>
                  <Badge variant="outline">
                    {plan.status === 'completed' ? 'Lunas' : 
                     plan.status === 'cancelled' ? 'Dibatalkan' : 
                     'Dikonversi'}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </DynamicPublicLayout>
  );
}