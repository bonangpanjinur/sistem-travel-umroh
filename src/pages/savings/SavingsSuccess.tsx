import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { 
  CheckCircle, Wallet, Calendar, Receipt,
  Home, User, ArrowRight
} from 'lucide-react';

export default function SavingsSuccess() {
  const { planId } = useParams<{ planId: string }>();

  const { data: plan, isLoading } = useQuery({
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

              <div className="flex justify-between items-center pt-4 border-t">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  Menunggu Pembayaran
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Next Steps */}
          <Card className="text-left mb-8">
            <CardHeader>
              <CardTitle className="text-lg">Langkah Selanjutnya</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">1</span>
                </div>
                <div>
                  <h4 className="font-medium">Lakukan Pembayaran Cicilan Pertama</h4>
                  <p className="text-sm text-muted-foreground">
                    Transfer cicilan ke rekening yang tertera di halaman profil Anda
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">2</span>
                </div>
                <div>
                  <h4 className="font-medium">Upload Bukti Transfer</h4>
                  <p className="text-sm text-muted-foreground">
                    Kirim bukti pembayaran melalui halaman tabungan saya
                  </p>
                </div>
              </div>
              
              <div className="flex gap-4 items-start">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold">3</span>
                </div>
                <div>
                  <h4 className="font-medium">Pantau Progress Tabungan</h4>
                  <p className="text-sm text-muted-foreground">
                    Lihat progress dan riwayat pembayaran di dashboard Anda
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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
