import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { 
  Wallet, Plus, Search, TrendingUp, Users, CheckCircle, 
  Clock, Eye, CreditCard, AlertCircle, DollarSign
} from "lucide-react";

export default function AdminSavingsPlans() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [verifyPayment, setVerifyPayment] = useState<any>(null);
  const [manualPaymentOpen, setManualPaymentOpen] = useState(false);
  const [manualPaymentPlan, setManualPaymentPlan] = useState<any>(null);
  const [manualAmount, setManualAmount] = useState('');

  const { data: savingsPlans, isLoading } = useQuery({
    queryKey: ['admin-savings-plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_plans')
        .select(`
          *,
          customer:customers(id, full_name, phone, email),
          package:packages(id, name, code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ['savings-payments', selectedPlan?.id],
    enabled: !!selectedPlan,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_payments')
        .select('*')
        .eq('savings_plan_id', selectedPlan.id)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async ({ paymentId, status }: { paymentId: string; status: 'paid' | 'rejected' }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('savings_payments')
        .update({ 
          status,
          verified_by: user?.id,
          verified_at: new Date().toISOString()
        })
        .eq('id', paymentId);

      if (error) throw error;

      // If verified, update savings plan paid_amount
      if (status === 'paid') {
        const payment = payments?.find(p => p.id === paymentId);
        if (payment) {
          const newPaidAmount = (selectedPlan?.paid_amount || 0) + payment.amount;
          const newStatus = newPaidAmount >= selectedPlan?.target_amount ? 'completed' : 'active';
          
          await supabase
            .from('savings_plans')
            .update({ 
              paid_amount: newPaidAmount,
              status: newStatus
            })
            .eq('id', selectedPlan.id);
        }
      }
    },
    onSuccess: () => {
      toast.success("Pembayaran berhasil diverifikasi");
      queryClient.invalidateQueries({ queryKey: ['savings-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-savings-plans'] });
      setVerifyPayment(null);
    },
    onError: (error: any) => {
      toast.error(error.message || "Gagal memverifikasi");
    },
  });

  // Manual payment mutation
  const manualPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!manualPaymentPlan || !manualAmount) throw new Error('Data tidak lengkap');
      const amount = parseFloat(manualAmount);
      if (isNaN(amount) || amount <= 0) throw new Error('Jumlah tidak valid');

      const { data: paymentCode } = await supabase.rpc('generate_savings_payment_code');
      
      const { error } = await supabase.from('savings_payments').insert({
        savings_plan_id: manualPaymentPlan.id,
        amount,
        payment_code: paymentCode || `SAV${Date.now().toString(36).toUpperCase()}`,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash',
        status: 'paid',
        verified_at: new Date().toISOString(),
      });
      if (error) throw error;

      // Update savings plan
      const newPaid = (manualPaymentPlan.paid_amount || 0) + amount;
      const newStatus = newPaid >= manualPaymentPlan.target_amount ? 'completed' : 'active';
      await supabase.from('savings_plans').update({
        paid_amount: newPaid,
        remaining_amount: Math.max(0, manualPaymentPlan.target_amount - newPaid),
        status: newStatus,
      }).eq('id', manualPaymentPlan.id);
    },
    onSuccess: () => {
      toast.success('Pembayaran manual berhasil dicatat');
      queryClient.invalidateQueries({ queryKey: ['admin-savings-plans'] });
      queryClient.invalidateQueries({ queryKey: ['savings-payments'] });
      setManualPaymentOpen(false);
      setManualPaymentPlan(null);
      setManualAmount('');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filteredPlans = savingsPlans?.filter(plan => {
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matches = 
        plan.customer?.full_name?.toLowerCase().includes(search) ||
        plan.package?.name?.toLowerCase().includes(search);
      if (!matches) return false;
    }
    if (statusFilter !== "all" && plan.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-blue-500">Aktif</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Lunas</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Dibatalkan</Badge>;
      case 'converted':
        return <Badge className="bg-purple-500">Dikonversi</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-orange-500">Menunggu</Badge>;
      case 'paid':
        return <Badge className="bg-green-500">Terverifikasi</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Ditolak</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Stats
  const stats = {
    total: savingsPlans?.length || 0,
    active: savingsPlans?.filter(p => p.status === 'active').length || 0,
    completed: savingsPlans?.filter(p => p.status === 'completed').length || 0,
    totalValue: savingsPlans?.reduce((sum, p) => sum + (p.target_amount || 0), 0) || 0,
    totalPaid: savingsPlans?.reduce((sum, p) => sum + (p.paid_amount || 0), 0) || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Tabungan Umroh</h1>
          <p className="text-muted-foreground">Kelola rencana tabungan jamaah</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Wallet className="h-8 w-8 text-primary" />
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Tabungan</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Aktif</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Lunas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-lg font-bold">{formatCurrency(stats.totalPaid)}</p>
                <p className="text-sm text-muted-foreground">Total Terkumpul</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama jamaah atau paket..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="completed">Lunas</SelectItem>
                <SelectItem value="cancelled">Dibatalkan</SelectItem>
                <SelectItem value="converted">Dikonversi</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : !filteredPlans || filteredPlans.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Tidak ada tabungan yang cocok dengan filter.' 
                  : 'Belum ada rencana tabungan.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jamaah</TableHead>
                    <TableHead>Paket</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Tenor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPlans.map((plan) => {
                    const progress = ((plan.paid_amount || 0) / plan.target_amount) * 100;
                    return (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{plan.customer?.full_name}</p>
                            <p className="text-xs text-muted-foreground">{plan.customer?.phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{plan.package?.name}</p>
                            <p className="text-xs text-muted-foreground">{plan.package?.code}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-bold">{formatCurrency(plan.target_amount)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(plan.monthly_amount)}/bulan
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="w-32 space-y-1">
                            <Progress value={progress} className="h-2" />
                            <p className="text-xs text-muted-foreground">
                              {formatCurrency(plan.paid_amount || 0)} ({progress.toFixed(0)}%)
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p>{plan.tenor_months} bulan</p>
                            <p className="text-xs text-muted-foreground">
                              Target: {formatDate(plan.target_date)}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(plan.status)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          {plan.status === 'active' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setManualPaymentPlan(plan);
                                setManualAmount(String(plan.monthly_amount || 0));
                                setManualPaymentOpen(true);
                              }}
                            >
                              <DollarSign className="h-4 w-4 mr-1" />
                              Bayar
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedPlan(plan);
                              setPaymentDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Detail
                          </Button>
                          {plan.status === 'completed' && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => {
                                toast.info(`Konversi tabungan ${plan.customer?.full_name} ke booking — fitur akan tersedia segera`);
                              }}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Konversi
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Detail Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detail Tabungan</DialogTitle>
          </DialogHeader>
          
          {selectedPlan && (
            <div className="space-y-6">
              {/* Plan Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm text-muted-foreground">Jamaah</p>
                  <p className="font-medium">{selectedPlan.customer?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Paket</p>
                  <p className="font-medium">{selectedPlan.package?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Target</p>
                  <p className="font-bold text-lg">{formatCurrency(selectedPlan.target_amount)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Terbayar</p>
                  <p className="font-bold text-lg text-green-600">
                    {formatCurrency(selectedPlan.paid_amount || 0)}
                  </p>
                </div>
              </div>

              {/* Progress */}
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Progress Tabungan</span>
                  <span className="text-sm font-medium">
                    {(((selectedPlan.paid_amount || 0) / selectedPlan.target_amount) * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={((selectedPlan.paid_amount || 0) / selectedPlan.target_amount) * 100} 
                  className="h-3"
                />
              </div>

              {/* Payments List */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Riwayat Pembayaran
                </h3>
                
                {loadingPayments ? (
                  <Skeleton className="h-32" />
                ) : !payments || payments.length === 0 ? (
                  <p className="text-muted-foreground text-center py-6">
                    Belum ada pembayaran.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {payments.map((payment) => (
                      <div 
                        key={payment.id}
                        className="p-3 border rounded-lg flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{payment.payment_code}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(payment.payment_date)} • {payment.payment_method || 'Transfer'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(payment.amount)}</p>
                          <div className="flex items-center gap-2">
                            {getPaymentStatusBadge(payment.status)}
                            {payment.status === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => setVerifyPayment(payment)}
                              >
                                Verifikasi
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Verify Payment Dialog */}
      <Dialog open={!!verifyPayment} onOpenChange={() => setVerifyPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verifikasi Pembayaran</DialogTitle>
          </DialogHeader>
          
          {verifyPayment && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <p><strong>Kode:</strong> {verifyPayment.payment_code}</p>
                <p><strong>Jumlah:</strong> {formatCurrency(verifyPayment.amount)}</p>
                <p><strong>Tanggal:</strong> {formatDate(verifyPayment.payment_date)}</p>
                <p><strong>Metode:</strong> {verifyPayment.payment_method || '-'}</p>
                <p><strong>Bank:</strong> {verifyPayment.bank_name || '-'}</p>
              </div>

              {verifyPayment.proof_url && (
                <div>
                  <Label>Bukti Bayar</Label>
                  <a 
                    href={verifyPayment.proof_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Lihat Bukti
                  </a>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              variant="destructive"
              onClick={() => verifyMutation.mutate({ paymentId: verifyPayment?.id, status: 'rejected' })}
              disabled={verifyMutation.isPending}
            >
              Tolak
            </Button>
            <Button 
              onClick={() => verifyMutation.mutate({ paymentId: verifyPayment?.id, status: 'paid' })}
              disabled={verifyMutation.isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Verifikasi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}