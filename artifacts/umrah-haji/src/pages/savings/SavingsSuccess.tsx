import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';
import { 
  CheckCircle, Wallet, Calendar, Receipt,
  Home, User, ArrowRight, Building2, Copy, CalendarClock
} from 'lucide-react';
import { SavingsScheduleList } from '@/components/savings/SavingsScheduleList';
import { useState } from 'react';

export default function SavingsSuccess() {
  const { planId } = useParams<{ planId: string }>() as { planId: string };
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Fetch plan
  const { data: plan, isLoading } = useQuery<any>({
    queryKey: ['savings-plan', planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('savings_plans')
        .select(`
          *,
          package:packages(*),
          customer:customers(*)
        `)
        .eq('id', planId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!planId,
  });

  // Fetch bank accounts for payment instructions
  const { data: bankAccounts } = useQuery<any>({
    queryKey: ['bank-accounts', 'primary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('is_primary', true)
        .limit(1)
        .single();
      
      if (error) return null;
      return data;
    },
  });

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Nomor rekening disalin!');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (isLoading) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-2xl mx-auto">
            <Skeleton className="h-48 w-full mb-6" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </DynamicPublicLayout>
    );
  }

  if (!plan) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold mb-4">Data Tidak Ditemukan</h1>
          <Button asChild>
            <Link to="/savings">Kembali ke Daftar Paket</Link>
          </Button>
        </div>
      </DynamicPublicLayout>
    );
  }

  return (
    <DynamicPublicLayout>
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-2xl mx-auto text-center">
          {/* Success Icon */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 mb-6">
            <CheckCircle className="h-12 w-12 text-primary" />
          </div>

          <h1 className="text-3xl font-bold mb-4">Pendaftaran Berhasil!</h1>
          <p className="text-muted-foreground mb-8">
            Selamat! Anda telah terdaftar dalam program tabungan umroh. 
            Silakan lakukan pembayaran cicilan pertama untuk memulai.
          </p>

          {/* Plan Summary Card */}
          <Card className="text-left mb-8">
            <CardHeader className="bg-primary text-primary-foreground rounded-t-lg">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Ringkasan Tabungan
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paket</span>
                <span className="font-medium">{plan.package?.name}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nama Pendaftar</span>
                <span className="font-medium">{plan.customer?.full_name}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Target</span>
                <span className="font-bold text-primary">{formatCurrency(plan.target_amount)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cicilan / Bulan</span>
                <span className="font-medium">{formatCurrency(plan.monthly_amount)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tenor</span>
                <span className="font-medium">{plan.tenor_months} Bulan</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Target Lunas</span>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {new Date(plan.target_date).toLocaleDateString('id-ID', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>

              {/* DP Info - Show if DP was paid */}
              {plan.dp_amount > 0 && (
                <>
                  <div className="border-t pt-4 mt-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Down Payment (DP)</span>
                      <span className="font-bold text-primary">{formatCurrency(plan.dp_amount)}</span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-muted-foreground">Status DP</span>
                      <span className={`font-medium ${
                        plan.dp_status === 'verified' ? 'text-green-600' : 
                        plan.dp_status === 'rejected' ? 'text-red-600' : 'text-orange-600'
                      }`}>
                        {plan.dp_status === 'verified' ? 'Terverifikasi' : 
                         plan.dp_status === 'rejected' ? 'Ditolak' : 'Menunggu Verifikasi'}
                      </span>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Menunggu Pembayaran
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Payment Instructions */}
          {bankAccounts && (
            <Card className="text-left mb-8 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Instruksi Pembayaran
                </CardTitle>
                <CardDescription>
                  Silakan transfer cicilan pertama ke rekening berikut:
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm text-muted-foreground mb-1">Bank</p>
                  <p className="text-lg font-bold">{bankAccounts.bank_name}</p>
                  
                  <p className="text-sm text-muted-foreground mt-3 mb-1">Nomor Rekening</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xl font-mono font-bold tracking-wider">
                      {bankAccounts.account_number}
                    </p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => copyToClipboard(bankAccounts.account_number, 0)}
                    >
                      <Copy className={`h-4 w-4 ${copiedIndex === 0 ? 'text-green-600' : ''}`} />
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-3 mb-1">Nama Rekening</p>
                  <p className="text-lg font-medium">{bankAccounts.account_name}</p>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Catatan:</strong> Transfer tepat hingga 3 digit terakhir 
                    agar pembayaran dapat diverifikasi otomatis. Nominal yang harus dibayar:{' '}
                    <strong className="font-bold">{formatCurrency(plan.monthly_amount)}</strong>
                  </p>
                </div>

                <Button 
                  className="w-full" 
                  asChild
                >
                  <Link to="/savings/dashboard">
                    <Wallet className="h-4 w-4 mr-2" />
                    Upload Bukti Transfer
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Jadwal Cicilan yang Digenerate Otomatis */}
          <div className="text-left mb-8">
            <div className="flex items-center gap-2 mb-3">
              <CalendarClock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Jadwal Cicilan Anda</h2>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Jadwal setoran bulanan telah digenerate secara otomatis. Bayar sesuai jadwal agar tabungan Anda tetap on-track.
            </p>
            <SavingsScheduleList savingsPlanId={planId} />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild variant="outline" size="lg">
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Ke Beranda
              </Link>
            </Button>
            <Button asChild size="lg">
              <Link to="/savings/dashboard">
                <User className="h-4 w-4 mr-2" />
                Lihat Tabungan Saya
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </DynamicPublicLayout>
  );
}
