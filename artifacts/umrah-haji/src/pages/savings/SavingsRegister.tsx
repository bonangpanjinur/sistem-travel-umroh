import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { formatCurrency, formatPackageType } from '@/lib/format';
import { toast } from 'sonner';
import { 
  ChevronLeft, Clock, Plane, Building2, Wallet, 
  Calculator, Calendar, User, Phone, AlertCircle, Check
} from 'lucide-react';

const TENOR_OPTIONS = [6, 12, 18, 24, 36];

export default function SavingsRegister() {
  const { packageId } = useParams<{ packageId: string }>() as { packageId: string };
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [tenorMonths, setTenorMonths] = useState(12);
  const [dpAmount, setDpAmount] = useState<number>(0);
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    gender: 'male' as 'male' | 'female',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch package details
  const { data: pkg, isLoading } = useQuery({
    queryKey: ['package', packageId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          airline:airlines(*),
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(*),
          hotel_madinah:hotels!packages_hotel_madinah_id_fkey(*)
        `)
        .eq('id', packageId)
        .single();

      if (error) {
        console.error('[savings-register-package] query error:', error);
        throw error;
      }
      return data;
    },
    enabled: !!packageId,
  });

  // Calculate monthly payment
  const { targetAmount, monthlyAmount, targetDate } = useMemo(() => {
    if (!pkg) return { targetAmount: 0, monthlyAmount: 0, targetDate: '' };
    
    // Use savings_target for tabungan packages
    const target = pkg.savings_target && pkg.savings_target > 0 ? pkg.savings_target : 0;
    
    if (target <= 0) {
      return { targetAmount: 0, monthlyAmount: 0, targetDate: '' };
    }
    
    const monthly = Math.ceil(target / tenorMonths);
    
    const date = new Date();
    date.setMonth(date.getMonth() + tenorMonths);
    const formattedDate = date.toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });

    return { targetAmount: target, monthlyAmount: monthly, targetDate: formattedDate };
  }, [pkg, tenorMonths]);

  // Calculate DP options (10%, 20%, 25%, 30% of target)
  const dpOptions = useMemo(() => {
    if (!pkg || targetAmount <= 0) return [];
    return [
      { value: Math.round(targetAmount * 0.1), label: '10%' },
      { value: Math.round(targetAmount * 0.2), label: '20%' },
      { value: Math.round(targetAmount * 0.25), label: '25%' },
      { value: Math.round(targetAmount * 0.3), label: '30%' },
    ].filter(d => d.value > 0);
  }, [targetAmount, pkg]);

  // Set default DP when options change
  useEffect(() => {
    if (dpOptions.length > 0 && dpAmount === 0) {
      setDpAmount(dpOptions[1]?.value || dpOptions[0]?.value || 0);
    }
  }, [dpOptions]);

  // Submit mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user || !pkg) throw new Error('Data tidak lengkap');

      // First, get or create customer record
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
          .insert({
            user_id: user.id,
            full_name: formData.fullName,
            phone: formData.phone,
            gender: formData.gender,
          })
          .select('id')
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Calculate target date
      const targetDateCalc = new Date();
      targetDateCalc.setMonth(targetDateCalc.getMonth() + tenorMonths);

      // Validate target amount before creating savings plan
      if (targetAmount <= 0) {
        throw new Error('Target tabungan tidak valid. Silakan hubungi admin.');
      }

      // Create savings plan with DP
      const { data: savingsPlan, error: savingsError } = await supabase
        .from('savings_plans')
        .insert({
          customer_id: customerId,
          package_id: pkg.id,
          target_amount: targetAmount,
          monthly_amount: monthlyAmount,
          tenor_months: tenorMonths,
          target_date: targetDateCalc.toISOString().split('T')[0],
          paid_amount: dpAmount, // DP is the first payment
          dp_amount: dpAmount,
          dp_status: dpAmount > 0 ? 'pending' : null,
          status: dpAmount > 0 ? 'dp_paid' : 'active', // If DP paid, status is dp_paid
        } as any)
        .select()
        .single();

      if (savingsError) throw savingsError;
      return savingsPlan;
    },
    onSuccess: (data) => {
      toast.success('Pendaftaran tabungan berhasil!');
      queryClient.invalidateQueries({ queryKey: ['savings-plans'] });
      navigate(`/savings/success/${data.id}`);
    },
    onError: (error: Error) => {
      toast.error('Gagal mendaftar: ' + error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      navigate(`/auth/login?redirect=/savings/register/${packageId}`);
      return;
    }

    if (!formData.fullName.trim()) {
      toast.error('Nama lengkap harus diisi');
      return;
    }

    if (targetAmount <= 0) {
      toast.error('Harga paket tidak valid untuk tabungan');
      return;
    }

    setIsSubmitting(true);
    await submitMutation.mutateAsync();
    setIsSubmitting(false);
  };

  if (isLoading) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64" />
              <Skeleton className="h-48" />
            </div>
            <Skeleton className="h-96" />
          </div>
        </div>
      </DynamicPublicLayout>
    );
  }

  if (!pkg) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Paket Tidak Ditemukan</h1>
          <Button asChild>
            <Link to="/savings">Kembali ke Daftar Paket</Link>
          </Button>
        </div>
      </DynamicPublicLayout>
    );
  }

  return (
    <DynamicPublicLayout>
      {/* Breadcrumb */}
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-3">
          <Link to="/savings" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Kembali ke Daftar Paket
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-8 flex items-center gap-3">
          <Wallet className="h-8 w-8 text-primary" />
          Daftar Tabungan Umroh
        </h1>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Package Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Paket yang Dipilih</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <img
                      src={pkg.featured_image || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=200'}
                      alt={pkg.name}
                      className="w-32 h-24 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <Badge className="mb-2">{formatPackageType(pkg.package_type)}</Badge>
                      <h3 className="font-semibold text-lg">{pkg.name}</h3>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {pkg.duration_days} Hari
                        </span>
                        {pkg.airline && (
                          <span className="flex items-center gap-1">
                            <Plane className="h-4 w-4" />
                            {pkg.airline.name}
                          </span>
                        )}
                        {pkg.hotel_makkah && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-4 w-4" />
                            {pkg.hotel_makkah.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tenor Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    Pilih Tenor Cicilan
                  </CardTitle>
                  <CardDescription>
                    Tentukan berapa lama Anda ingin menyelesaikan tabungan
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
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
                    
                    <div className="flex justify-between text-xs text-muted-foreground">
                      {TENOR_OPTIONS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTenorMonths(t)}
                          className={`px-3 py-1 rounded ${tenorMonths === t ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}
                        >
                          {t} bln
                        </button>
                      ))}
                    </div>
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

                  {/* DP Selection */}
                  {dpOptions.length > 0 && (
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Pilih Down Payment (DP)</p>
                      <div className="flex flex-wrap gap-2">
                        {dpOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setDpAmount(opt.value)}
                            className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                              dpAmount === opt.value 
                                ? 'border-primary bg-primary/10 text-primary' 
                                : 'border-muted-200 hover:border-primary/50'
                            }`}
                          >
                            <span className="font-bold">{opt.label}</span>
                            <span className="text-sm ml-1 text-muted-foreground">
                              {formatCurrency(opt.value)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />
                </CardContent>
              </Card>

              {/* Personal Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Data Pendaftar
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
                      <Button
                        type="button"
                        variant={formData.gender === 'male' ? 'default' : 'outline'}
                        onClick={() => setFormData({ ...formData, gender: 'male' })}
                        className="flex-1"
                      >
                        Laki-laki
                      </Button>
                      <Button
                        type="button"
                        variant={formData.gender === 'female' ? 'default' : 'outline'}
                        onClick={() => setFormData({ ...formData, gender: 'female' })}
                        className="flex-1"
                      >
                        Perempuan
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Summary */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24 z-10 max-h-[calc(100vh-120px)] overflow-y-auto">
                <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
                  <CardTitle>Ringkasan Tabungan</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paket</span>
                    <span className="font-medium">{pkg.name}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Target</span>
                    <span className="font-medium">{formatCurrency(targetAmount)}</span>
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

                  <Separator />

                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Cicilan / Bulan</span>
                    <span className="text-2xl font-bold text-primary">{formatCurrency(monthlyAmount)}</span>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Harga paket akan dikunci sesuai harga saat pendaftaran
                    </AlertDescription>
                  </Alert>

                  <div className="space-y-2 pt-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary" />
                      Cicilan fleksibel
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary" />
                      Dana tercatat aman
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary" />
                      Prioritas kuota saat lunas
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full mt-4" 
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      'Memproses...'
                    ) : (
                      <>
                        <Wallet className="h-4 w-4 mr-2" />
                        Daftar Sekarang
                      </>
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
