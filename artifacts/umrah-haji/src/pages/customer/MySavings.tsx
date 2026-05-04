import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { 
  Wallet, Calendar, Receipt, Upload, 
  CheckCircle, Clock, AlertCircle, Plus, Eye
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  converted: 'bg-purple-100 text-purple-800',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  verified: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

export default function MySavings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [uploadingProof, setUploadingProof] = useState(false);

  // Fetch user's savings plans
  const { data: savingsPlans = [], isLoading } = useQuery({
    queryKey: ['my-savings-plans', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get customer first
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
      return data;
    },
    enabled: !!user,
  });

  // Fetch payments for selected plan
  const { data: payments = [] } = useQuery({
    queryKey: ['savings-payments', selectedPlan],
    queryFn: async () => {
      if (!selectedPlan) return [];

      const { data, error } = await supabase
        .from('savings_payments')
        .select('*')
        .eq('savings_plan_id', selectedPlan)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!selectedPlan,
  });

  // Payment mutation
  const paymentMutation = useMutation({
    mutationFn: async ({ amount, proofUrl }: { amount: number; proofUrl: string }) => {
      if (!selectedPlan) throw new Error('No plan selected');

      const { data, error } = await supabase
        .from('savings_payments')
        .insert({
          savings_plan_id: selectedPlan,
          amount,
          proof_url: proofUrl,
          payment_code: `SAV${Date.now()}`, // Temporary, will be replaced by DB function
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Pembayaran berhasil disubmit, menunggu verifikasi');
      queryClient.invalidateQueries({ queryKey: ['savings-payments', selectedPlan] });
      setPaymentDialogOpen(false);
      setPaymentAmount('');
    },
    onError: (error: Error) => {
      toast.error('Gagal submit pembayaran: ' + error.message);
    },
  });

  const handleUploadProof = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPlan) return;

    setUploadingProof(true);
    try {
      const fileName = `${user?.id}/${selectedPlan}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      await paymentMutation.mutateAsync({
        amount: parseFloat(paymentAmount),
        proofUrl: urlData.publicUrl,
      });
    } catch (error: any) {
      toast.error('Gagal upload bukti: ' + error.message);
    } finally {
      setUploadingProof(false);
    }
  };

  if (!user) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Wallet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">Silakan Login</h1>
          <p className="text-muted-foreground mb-6">
            Login untuk melihat tabungan umroh Anda
          </p>
          <Button asChild>
            <Link to="/auth/login?redirect=/customer/my-savings">Login</Link>
          </Button>
        </div>
      </DynamicPublicLayout>
    );
  }

  return (
    <DynamicPublicLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              <Wallet className="h-8 w-8 text-primary" />
              Tabungan Saya
            </h1>
            <p className="text-muted-foreground">
              Pantau progress tabungan umroh Anda
            </p>
          </div>
          <Button asChild>
            <Link to="/savings">
              <Plus className="h-4 w-4 mr-2" />
              Daftar Tabungan Baru
            </Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-6">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : savingsPlans.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Wallet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Belum Ada Tabungan</h3>
              <p className="text-muted-foreground mb-6">
                Mulai perjalanan ibadah Anda dengan mendaftar tabungan umroh
              </p>
              <Button asChild>
                <Link to="/savings">Lihat Paket Tabungan</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {savingsPlans.map((plan) => {
              const progress = ((plan.paid_amount || 0) / plan.target_amount) * 100;
              
              return (
                <Card key={plan.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{plan.package?.name}</CardTitle>
                        <CardDescription>
                          Terdaftar: {new Date(plan.created_at).toLocaleDateString('id-ID')}
                        </CardDescription>
                      </div>
                      <Badge className={STATUS_COLORS[plan.status || 'active']}>
                        {plan.status === 'active' ? 'Aktif' : 
                         plan.status === 'completed' ? 'Lunas' :
                         plan.status === 'converted' ? 'Sudah Booking' : 'Dibatalkan'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={progress} className="h-3" />
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Terkumpul: <span className="font-medium text-primary">{formatCurrency(plan.paid_amount || 0)}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Target: <span className="font-medium">{formatCurrency(plan.target_amount)}</span>
                        </span>
                      </div>
                    </div>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Cicilan/Bulan</p>
                        <p className="font-semibold">{formatCurrency(plan.monthly_amount)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Tenor</p>
                        <p className="font-semibold">{plan.tenor_months} Bulan</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Sisa</p>
                        <p className="font-semibold text-primary">{formatCurrency(plan.remaining_amount || 0)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground">Target Lunas</p>
                        <p className="font-semibold">
                          {new Date(plan.target_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3">
                      {plan.status === 'active' && (
                        <Dialog open={paymentDialogOpen && selectedPlan === plan.id} onOpenChange={(open) => {
                          setPaymentDialogOpen(open);
                          if (open) setSelectedPlan(plan.id);
                        }}>
                          <DialogTrigger asChild>
                            <Button onClick={() => setSelectedPlan(plan.id)}>
                              <Upload className="h-4 w-4 mr-2" />
                              Bayar Cicilan
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Bayar Cicilan Tabungan</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="p-4 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground">Cicilan yang disarankan:</p>
                                <p className="text-2xl font-bold text-primary">{formatCurrency(plan.monthly_amount)}</p>
                              </div>
                              
                              <div className="space-y-2">
                                <Label>Jumlah Pembayaran</Label>
                                <Input
                                  type="number"
                                  placeholder="Masukkan jumlah"
                                  value={paymentAmount}
                                  onChange={(e) => setPaymentAmount(e.target.value)}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label>Upload Bukti Transfer</Label>
                                <Input
                                  type="file"
                                  accept="image/*"
                                  onChange={handleUploadProof}
                                  disabled={!paymentAmount || uploadingProof}
                                />
                              </div>

                              {uploadingProof && (
                                <p className="text-sm text-muted-foreground text-center">
                                  Mengupload...
                                </p>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" onClick={() => setSelectedPlan(plan.id)}>
                            <Eye className="h-4 w-4 mr-2" />
                            Riwayat Pembayaran
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Riwayat Pembayaran</DialogTitle>
                          </DialogHeader>
                          <div className="max-h-96 overflow-y-auto">
                            {payments.length === 0 ? (
                              <p className="text-center text-muted-foreground py-8">
                                Belum ada pembayaran
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {payments.map((payment) => (
                                  <div 
                                    key={payment.id} 
                                    className="flex items-center justify-between p-4 border rounded-lg"
                                  >
                                    <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Receipt className="h-5 w-5 text-primary" />
                                      </div>
                                      <div>
                                        <p className="font-medium">{formatCurrency(payment.amount)}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {new Date(payment.payment_date).toLocaleDateString('id-ID')}
                                        </p>
                                      </div>
                                    </div>
                                    <Badge className={PAYMENT_STATUS_COLORS[payment.status || 'pending']}>
                                      {payment.status === 'verified' ? 'Terverifikasi' :
                                       payment.status === 'rejected' ? 'Ditolak' : 'Menunggu'}
                                    </Badge>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DynamicPublicLayout>
  );
}
