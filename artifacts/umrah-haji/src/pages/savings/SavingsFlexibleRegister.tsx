import { useState, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import {
  ChevronLeft, Wallet, Calculator, Calendar, User,
  Phone, AlertCircle, Check, Star,
} from 'lucide-react';

const TENOR_OPTIONS = [6, 12, 18, 24, 36];
const MIN_TARGET = 5_000_000;
const MAX_TARGET = 100_000_000;
const STEP_TARGET = 1_000_000;

export default function SavingsFlexibleRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [targetAmount, setTargetAmount] = useState(30_000_000);
  const [tenorMonths, setTenorMonths] = useState(12);
  const [dpPercent, setDpPercent] = useState(20);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: 'male' as 'male' | 'female',
    savingsLabel: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const monthlyAmount = useMemo(() => Math.ceil(targetAmount / tenorMonths), [targetAmount, tenorMonths]);
  const dpAmount = useMemo(() => Math.round(targetAmount * dpPercent / 100), [targetAmount, dpPercent]);
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + tenorMonths);
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }, [tenorMonths]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Silakan login terlebih dahulu');
      if (!formData.fullName.trim()) throw new Error('Nama lengkap harus diisi');
      if (targetAmount < MIN_TARGET) throw new Error(`Target minimal ${formatCurrency(MIN_TARGET)}`);

      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let customerId: string;
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({ user_id: user.id, full_name: formData.fullName, phone: formData.phone, gender: formData.gender })
          .select('id')
          .single();
        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      const targetDateCalc = new Date();
      targetDateCalc.setMonth(targetDateCalc.getMonth() + tenorMonths);

      const { data: plan, error } = await (supabase as any)
        .from('savings_plans')
        .insert({
          customer_id: customerId,
          package_id: null,
          target_amount: targetAmount,
          monthly_amount: monthlyAmount,
          tenor_months: tenorMonths,
          target_date: targetDateCalc.toISOString().split('T')[0],
          paid_amount: dpAmount,
          dp_amount: dpAmount,
          dp_status: dpAmount > 0 ? 'pending' : null,
          status: dpAmount > 0 ? 'dp_paid' : 'active',
          notes: formData.savingsLabel ? `Tujuan: ${formData.savingsLabel}` : 'Tabungan Fleksibel',
        })
        .select()
        .single();

      if (error) throw error;
      return plan;
    },
    onSuccess: (data: any) => {
      toast.success('Tabungan fleksibel berhasil didaftarkan!');
      queryClient.invalidateQueries({ queryKey: ['savings-plans'] });
      navigate(`/savings/success/${data.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth/login?redirect=/savings/register/flexible');
      return;
    }
    setIsSubmitting(true);
    await submitMutation.mutateAsync();
    setIsSubmitting(false);
  };

  return (
    <DynamicPublicLayout>
      {/* Breadcrumb */}
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-3">
          <Link to="/savings" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Kembali ke Daftar Paket Tabungan
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Star className="h-6 w-6 text-amber-600" />
            </div>
            <h1 className="text-2xl font-bold">Tabungan Fleksibel</h1>
          </div>
          <p className="text-muted-foreground">
            Tentukan sendiri target tabungan Anda tanpa terikat paket tertentu.
            Pilih paket saat tabungan sudah siap dikonversi ke booking.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-6">

              {/* Target Amount */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Wallet className="h-5 w-5" /> Target Tabungan
                  </CardTitle>
                  <CardDescription>Tentukan berapa total yang ingin Anda kumpulkan</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-1">Target Anda</p>
                    <p className="text-4xl font-bold text-primary">{formatCurrency(targetAmount)}</p>
                  </div>
                  <Slider
                    value={[targetAmount]}
                    onValueChange={(v) => setTargetAmount(v[0])}
                    min={MIN_TARGET}
                    max={MAX_TARGET}
                    step={STEP_TARGET}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatCurrency(MIN_TARGET)}</span>
                    <span>{formatCurrency(MAX_TARGET)}</span>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Atau masukkan nominal langsung</Label>
                    <Input
                      type="number"
                      min={MIN_TARGET}
                      max={MAX_TARGET}
                      step={STEP_TARGET}
                      value={targetAmount}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (v >= MIN_TARGET && v <= MAX_TARGET) setTargetAmount(v);
                      }}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Label Tujuan Tabungan (opsional)</Label>
                    <Input
                      placeholder="Contoh: Umroh bersama keluarga 2027"
                      value={formData.savingsLabel}
                      onChange={(e) => setFormData({ ...formData, savingsLabel: e.target.value })}
                      maxLength={100}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Tenor */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" /> Pilih Tenor Cicilan
                  </CardTitle>
                  <CardDescription>Tentukan berapa lama ingin menabung</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tenor dipilih:</span>
                    <span className="font-bold text-primary">{tenorMonths} Bulan</span>
                  </div>
                  <Slider
                    value={[tenorMonths]}
                    onValueChange={(v) => setTenorMonths(v[0])}
                    min={6}
                    max={36}
                    step={6}
                    className="py-4"
                  />
                  <div className="flex gap-2 flex-wrap">
                    {TENOR_OPTIONS.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTenorMonths(t)}
                        className={`px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                          tenorMonths === t
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:border-primary/40'
                        }`}
                      >
                        {t} bln
                      </button>
                    ))}
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Cicilan per Bulan</p>
                      <p className="text-2xl font-bold text-primary">{formatCurrency(monthlyAmount)}</p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground mb-1">Target Lunas</p>
                      <p className="text-lg font-semibold flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {targetDate}
                      </p>
                    </div>
                  </div>

                  {/* DP */}
                  <div>
                    <p className="text-sm font-medium mb-3">Pilih Down Payment Awal</p>
                    <div className="flex flex-wrap gap-2">
                      {[0, 10, 20, 25, 30].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDpPercent(pct)}
                          className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                            dpPercent === pct
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:border-primary/50'
                          }`}
                        >
                          <span className="font-bold">{pct === 0 ? 'Tanpa DP' : `${pct}%`}</span>
                          {pct > 0 && (
                            <span className="text-xs ml-1 text-muted-foreground">
                              {formatCurrency(Math.round(targetAmount * pct / 100))}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Personal Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" /> Data Pendaftar
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Nama Lengkap (sesuai KTP)</Label>
                    <Input
                      id="fullName"
                      placeholder="Masukkan nama lengkap"
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Nomor WhatsApp</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        placeholder="08xxxxxxxxxx"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Jenis Kelamin</Label>
                    <div className="flex gap-4">
                      {(['male', 'female'] as const).map((g) => (
                        <Button
                          key={g}
                          type="button"
                          variant={formData.gender === g ? 'default' : 'outline'}
                          onClick={() => setFormData({ ...formData, gender: g })}
                          className="flex-1"
                        >
                          {g === 'male' ? 'Laki-laki' : 'Perempuan'}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 z-10">
                <CardHeader className="bg-amber-600 text-white rounded-t-lg">
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" /> Tabungan Fleksibel
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tipe</span>
                    <span className="font-medium">Fleksibel (tanpa paket)</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Target</span>
                    <span className="font-semibold">{formatCurrency(targetAmount)}</span>
                  </div>
                  {dpAmount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Down Payment</span>
                      <span className="font-medium text-primary">{formatCurrency(dpAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tenor</span>
                    <span className="font-medium">{tenorMonths} Bulan</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Target Lunas</span>
                    <span className="font-medium">{targetDate}</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Cicilan / Bulan</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(monthlyAmount)}</span>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Pilih paket saat tabungan siap — bebas memilih paket apapun yang sesuai budget Anda
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2 pt-2">
                    {[
                      'Tidak terikat satu paket',
                      'Bebas pilih paket saat lunas',
                      'Dana aman tercatat',
                      'Cicilan fleksibel',
                    ].map((b) => (
                      <div key={b} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        {b}
                      </div>
                    ))}
                  </div>

                  <Button
                    type="submit"
                    className="w-full mt-2 bg-amber-600 hover:bg-amber-700"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Memproses...' : (
                      <><Wallet className="h-4 w-4 mr-2" />Daftar Tabungan Fleksibel</>
                    )}
                  </Button>

                  {!user && (
                    <p className="text-xs text-center text-muted-foreground">
                      Anda akan diminta login terlebih dahulu
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </DynamicPublicLayout>
  );
}
