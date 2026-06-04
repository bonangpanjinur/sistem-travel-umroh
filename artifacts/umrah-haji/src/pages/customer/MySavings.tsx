import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import {
  Wallet, Calendar, Receipt, Upload,
  CheckCircle, Clock, AlertCircle, Plus, Eye,
  BanknoteIcon, Copy, CalendarClock, Plane
} from 'lucide-react';
import { SavingsScheduleList } from '@/components/savings/SavingsScheduleList';
import { SavingsConvertDialog } from '@/components/savings/SavingsConvertDialog';

// ── helpers ────────────────────────────────────────────────────────────────
const STATUS_CLS: Record<string, string> = {
  active:    'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  converted: 'bg-purple-100 text-purple-800',
  dp_paid:   'bg-yellow-100 text-yellow-800',
};
const STATUS_LABEL: Record<string, string> = {
  active:    'Aktif',
  completed: 'Lunas',
  cancelled: 'Dibatalkan',
  converted: 'Sudah Booking',
  dp_paid:   'Menunggu DP',
};
const PAY_CLS: Record<string, string> = {
  pending:  'bg-yellow-100 text-yellow-800',
  verified: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  paid:     'bg-green-100 text-green-800',
};
const PAY_LABEL: Record<string, string> = {
  pending:  'Menunggu',
  verified: 'Diterima',
  rejected: 'Ditolak',
  paid:     'Diterima',
};

export default function MySavings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [payDialogPlanId, setPayDialogPlanId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('transfer');
  const [payFile, setPayFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const [historyPlanId, setHistoryPlanId]       = useState<string | null>(null);
  const [convertPlan,   setConvertPlan]         = useState<any | null>(null);

  // ── queries ───────────────────────────────────────────────────────────────
  const { data: savingsPlans = [], isLoading } = useQuery({
    queryKey: ['my-savings-plans', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data: customer } = await supabase
        .from('customers').select('id').eq('user_id', user.id).single();
      if (!customer) return [];
      const { data, error } = await supabase
        .from('savings_plans')
        .select('*, package:packages(*)')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: historyPayments = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['savings-payments', historyPlanId],
    queryFn: async () => {
      if (!historyPlanId) return [];
      const { data, error } = await supabase
        .from('savings_payments')
        .select('*')
        .eq('savings_plan_id', historyPlanId)
        .order('payment_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!historyPlanId,
  });

  const { data: bankAccounts = [] } = useQuery({
    queryKey: ['bank-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_active', true)
        .order('is_primary', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const activePlan: any = savingsPlans.find((p: any) =>
    p.status === 'active' || p.status === 'dp_paid'
  );
  const payDialogPlan: any = savingsPlans.find((p: any) => p.id === payDialogPlanId);

  // ── payment mutation ──────────────────────────────────────────────────────
  const paymentMutation = useMutation({
    mutationFn: async ({ amount, proofUrl }: { amount: number; proofUrl?: string }) => {
      const planId = payDialogPlanId;
      if (!planId) throw new Error('No plan selected');
      const code = `SAV${Date.now().toString(36).toUpperCase()}`;
      const { error } = await supabase.from('savings_payments').insert({
        savings_plan_id: planId,
        amount,
        proof_url: proofUrl ?? null,
        payment_code: code,
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: payMethod,
        status: 'pending',
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('✅ Pembayaran berhasil dikirim, menunggu verifikasi admin');
      queryClient.invalidateQueries({ queryKey: ['savings-payments'] });
      setPayDialogPlanId(null);
      setPayAmount('');
      setPayFile(null);
    },
    onError: (e: Error) => toast.error('❌ ' + e.message),
  });

  const handleSubmitPayment = async () => {
    const amount = parseFloat(payAmount);
    if (!payAmount || isNaN(amount) || amount <= 0) {
      toast.error('Masukkan jumlah yang valid');
      return;
    }

    let proofUrl: string | undefined;

    if (payFile) {
      setUploading(true);
      try {
        const fileName = `${user?.id}/${payDialogPlanId}/${Date.now()}-${payFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, payFile);
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);
          proofUrl = urlData.publicUrl;
        }
        // If upload fails, continue without proof URL (silent, admin can follow up)
      } catch {
        // ignore upload error, submit payment without proof
      } finally {
        setUploading(false);
      }
    }

    await paymentMutation.mutateAsync({ amount, proofUrl });
  };

  // ── helpers ───────────────────────────────────────────────────────────────
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success('Disalin!'));
  };

  // ── auth guard ────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <Wallet className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">Silakan Login</h1>
          <p className="text-muted-foreground mb-6">Login untuk melihat tabungan umroh Anda</p>
          <Button asChild>
            <Link to="/auth/login?redirect=/customer/my-savings">Login</Link>
          </Button>
        </div>
      </DynamicPublicLayout>
    );
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <DynamicPublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Wallet className="h-7 w-7 text-primary" /> Tabungan Saya
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">Pantau progress tabungan umroh Anda</p>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link to="/savings"><Plus className="h-4 w-4 mr-1" /> Daftar Baru</Link>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-48" />)}
          </div>
        ) : savingsPlans.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Wallet className="h-14 w-14 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Belum Ada Tabungan</h3>
              <p className="text-muted-foreground mb-6 text-sm">
                Mulai perjalanan ibadah Anda dengan mendaftar tabungan umroh
              </p>
              <Button asChild><Link to="/savings">Lihat Paket Tabungan</Link></Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {savingsPlans.map((plan: any) => {
              const progress = plan.target_amount > 0 ? ((plan.paid_amount || 0) / plan.target_amount) * 100 : 0;
              const remaining = Math.max(0, plan.target_amount - (plan.paid_amount || 0));
              const isActive = plan.status === 'active' || plan.status === 'dp_paid';

              return (
                <div key={plan.id} className="space-y-3">
                <Card className={isActive ? 'border-primary/40 shadow-md' : ''}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg">{plan.package?.name}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Terdaftar: {new Date(plan.created_at!).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                      <Badge className={STATUS_CLS[plan.status ?? 'active']}>
                        {STATUS_LABEL[plan.status ?? 'active'] ?? plan.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress Tabungan</span>
                        <span className="font-semibold">{progress.toFixed(1)}%</span>
                      </div>
                      <Progress value={progress} className="h-3" />
                      <div className="flex justify-between text-sm">
                        <span className="text-green-600 font-medium">{formatCurrency(plan.paid_amount || 0)} terkumpul</span>
                        <span className="text-muted-foreground">Target: {formatCurrency(plan.target_amount)}</span>
                      </div>
                    </div>

                    {/* Stats grid */}
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      {[
                        { label: 'Cicilan/Bulan', value: formatCurrency(plan.monthly_amount) },
                        { label: 'Tenor', value: `${plan.tenor_months} Bulan` },
                        { label: 'Sisa', value: formatCurrency(remaining), cls: 'text-primary font-bold' },
                        { label: 'Target Lunas', value: new Date(plan.target_date).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }) },
                      ].map(s => (
                        <div key={s.label} className="p-3 rounded-lg bg-muted/50 text-center">
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                          <p className={`text-sm font-semibold mt-0.5 ${s.cls ?? ''}`}>{s.value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Z2: Proyeksi Lunas */}
                    {isActive && plan.monthly_amount > 0 && remaining > 0 && (() => {
                      const bulanSisa = Math.ceil(remaining / plan.monthly_amount);
                      const proyeksiLunas = new Date();
                      proyeksiLunas.setMonth(proyeksiLunas.getMonth() + bulanSisa);
                      const targetLunas = plan.target_date ? new Date(plan.target_date) : null;
                      const isAhead = targetLunas && proyeksiLunas <= targetLunas;
                      const selisihBulan = targetLunas
                        ? Math.abs(Math.round((proyeksiLunas.getTime() - targetLunas.getTime()) / (1000 * 60 * 60 * 24 * 30)))
                        : 0;
                      return (
                        <div className={`rounded-xl border p-3 ${isAhead ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                          <p className="text-xs font-semibold text-gray-600 mb-2 flex items-center gap-1.5">
                            📊 Proyeksi Lunas (berdasarkan cicilan bulanan)
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className={`text-base font-bold ${isAhead ? 'text-green-700' : 'text-amber-700'}`}>
                                {proyeksiLunas.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ≈ {bulanSisa} bulan lagi ({bulanSisa} × {formatCurrency(plan.monthly_amount)})
                              </p>
                            </div>
                            <div className={`text-right text-xs px-2 py-1 rounded-lg font-medium ${
                              isAhead ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                              {isAhead
                                ? `${selisihBulan} bln lebih cepat ✨`
                                : `${selisihBulan} bln melebihi target`}
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* DP status alert */}
                    {plan.dp_amount > 0 && (
                      <Alert className={
                        plan.dp_status === 'verified' ? 'border-green-200 bg-green-50' :
                        plan.dp_status === 'rejected' ? 'border-red-200 bg-red-50' :
                        'border-yellow-200 bg-yellow-50'
                      }>
                        {plan.dp_status === 'verified' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                         plan.dp_status === 'rejected' ? <AlertCircle className="h-4 w-4 text-red-600" /> :
                         <Clock className="h-4 w-4 text-yellow-600" />}
                        <AlertDescription className="text-sm">
                          <strong>DP {formatCurrency(plan.dp_amount)}:</strong>{' '}
                          {plan.dp_status === 'verified' ? 'Sudah diverifikasi ✓' :
                           plan.dp_status === 'rejected' ? 'Ditolak — hubungi admin' :
                           'Menunggu verifikasi admin'}
                        </AlertDescription>
                      </Alert>
                    )}

                    <Separator />

                    {/* Actions */}
                    <div className="flex gap-2 flex-wrap">
                      {isActive && (
                        <Button
                          className="flex-1"
                          onClick={() => { setPayDialogPlanId(plan.id); setPayAmount(String(plan.monthly_amount || '')); }}
                        >
                          <Upload className="h-4 w-4 mr-2" /> Bayar Cicilan
                        </Button>
                      )}
                      {/* Convert to booking — show for active/dp_paid plans not yet converted */}
                      {(plan.status === 'active' || plan.status === 'dp_paid') && !plan.converted_booking_id && (
                        <Button
                          variant="secondary"
                          className="flex-1"
                          onClick={() => setConvertPlan(plan)}
                        >
                          <Plane className="h-4 w-4 mr-2" /> Konversi ke Booking
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        className={isActive ? '' : 'flex-1'}
                        onClick={() => { setHistoryPlanId(plan.id); }}
                      >
                        <Eye className="h-4 w-4 mr-2" /> Riwayat
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Jadwal Cicilan Otomatis */}
                <SavingsScheduleList savingsPlanId={plan.id} />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Payment Dialog ── */}
      <Dialog open={!!payDialogPlanId} onOpenChange={open => { if (!open) { setPayDialogPlanId(null); setPayAmount(''); setPayFile(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Bayar Cicilan Tabungan</DialogTitle>
          </DialogHeader>
          {payDialogPlan && (
            <div className="space-y-4 py-2">
              {/* Suggested amount */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-center">
                <p className="text-xs text-muted-foreground">Cicilan yang disarankan</p>
                <p className="text-2xl font-bold text-primary">{formatCurrency(payDialogPlan.monthly_amount)}</p>
              </div>

              {/* Bank accounts */}
              {bankAccounts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium flex items-center gap-1.5">
                    <BanknoteIcon className="h-4 w-4 text-primary" /> Transfer ke rekening:
                  </p>
                  {bankAccounts.map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg text-sm">
                      <div>
                        <p className="font-semibold">{b.bank_name}</p>
                        <p className="font-mono text-base">{b.account_number}</p>
                        <p className="text-muted-foreground text-xs">{b.account_name}</p>
                      </div>
                      <Button size="sm" variant="ghost" className="h-8"
                        onClick={() => copyToClipboard(b.account_number)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Separator />

              {/* Amount */}
              <div className="space-y-1.5">
                <Label>Jumlah Transfer (Rp)</Label>
                <Input
                  type="number"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  placeholder="Masukkan jumlah"
                />
                <div className="flex gap-1.5 flex-wrap">
                  {[1, 2, 3].map(mul => (
                    <button key={mul} type="button"
                      className="text-xs px-2 py-1 rounded border bg-muted hover:bg-muted/80"
                      onClick={() => setPayAmount(String(payDialogPlan.monthly_amount * mul))}>
                      {mul}× = {formatCurrency(payDialogPlan.monthly_amount * mul)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Method */}
              <div className="space-y-1.5">
                <Label>Metode Pembayaran</Label>
                <Select value={payMethod} onValueChange={setPayMethod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transfer">Transfer Bank</SelectItem>
                    <SelectItem value="qris">QRIS</SelectItem>
                    <SelectItem value="cash">Tunai di Kantor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Optional file upload */}
              <div className="space-y-1.5">
                <Label>Bukti Transfer <span className="text-muted-foreground font-normal">(opsional)</span></Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={e => setPayFile(e.target.files?.[0] || null)}
                />
                <p className="text-xs text-muted-foreground">
                  {payFile ? `📎 ${payFile.name}` : 'Tidak wajib, bisa dilengkapi nanti'}
                </p>
              </div>

              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Pembayaran akan dikonfirmasi oleh admin dalam 1×24 jam kerja.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <div className="flex gap-2 mt-2">
            <Button variant="outline" className="flex-1" onClick={() => setPayDialogPlanId(null)}>Batal</Button>
            <Button
              className="flex-1"
              onClick={handleSubmitPayment}
              disabled={paymentMutation.isPending || uploading || !payAmount}
            >
              {uploading ? 'Mengupload...' : paymentMutation.isPending ? 'Mengirim...' : 'Kirim Pembayaran'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── History Dialog ── */}
      <Dialog open={!!historyPlanId} onOpenChange={open => { if (!open) setHistoryPlanId(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" /> Riwayat Pembayaran
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
            {loadingHistory ? (
              <Skeleton className="h-24" />
            ) : historyPayments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8 text-sm">Belum ada pembayaran.</p>
            ) : (
              historyPayments.map((pay: any) => (
                <div key={pay.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center ${
                      pay.status === 'verified' || pay.status === 'paid' ? 'bg-green-100' :
                      pay.status === 'rejected' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      {pay.status === 'verified' || pay.status === 'paid' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : pay.status === 'rejected' ? (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      ) : (
                        <Clock className="h-4 w-4 text-yellow-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{formatCurrency(pay.amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {pay.payment_date
                          ? new Date(pay.payment_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                          : '-'} · {pay.payment_method ?? 'Transfer'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={PAY_CLS[pay.status ?? 'pending']}>
                      {PAY_LABEL[pay.status ?? 'pending']}
                    </Badge>
                    {pay.notes && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-[120px] text-right">"{pay.notes}"</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Convert Savings to Booking Dialog ── */}
      {convertPlan && (
        <SavingsConvertDialog
          open={!!convertPlan}
          onOpenChange={(v) => { if (!v) setConvertPlan(null); }}
          savingsPlan={{
            id:            convertPlan.id,
            package_id:    convertPlan.package_id ?? null,
            paid_amount:   Number(convertPlan.paid_amount) || 0,
            target_amount: Number(convertPlan.target_amount) || 0,
            locked_price:  (convertPlan as any).locked_price ?? null,
          }}
        />
      )}
    </DynamicPublicLayout>
  );
}
