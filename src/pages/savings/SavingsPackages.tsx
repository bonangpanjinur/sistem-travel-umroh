import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatPackageType } from '@/lib/format';
import { 
  Wallet, Clock, Building2, Plane, 
  Calculator, TrendingUp, Shield, CheckCircle 
} from 'lucide-react';

export default function SavingsPackages() {
  // Fetch savings-compatible packages (tabungan type only)
  const { data: packages = [], isLoading } = useQuery({
    queryKey: ['packages', 'savings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select('*')
        .eq('package_type', 'tabungan')
        .eq('is_active', true)
        .order('savings_target', { ascending: true });

      if (error) throw error;
      // Filter packages that have a valid savings target
      return (data || []).filter(pkg => pkg.savings_target && pkg.savings_target > 0);

    },
  });

  return (
    <DynamicPublicLayout>
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary to-primary/80 py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/20 mb-6">
            <Wallet className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Tabungan Umroh
          </h1>
          <p className="text-white/90 max-w-2xl mx-auto text-lg">
            Wujudkan impian beribadah ke Tanah Suci dengan menabung secara bertahap. 
            Pilih paket dan tentukan tenor cicilan sesuai kemampuan Anda.
          </p>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-12 bg-muted/30 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calculator className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Cicilan Fleksibel</h3>
                <p className="text-sm text-muted-foreground">Tenor 6-36 bulan sesuai kemampuan</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Harga Terkunci</h3>
                <p className="text-sm text-muted-foreground">Harga paket tidak berubah selama menabung</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Dana Aman</h3>
                <p className="text-sm text-muted-foreground">Tercatat rapi di sistem kami</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold mb-1">Prioritas Kuota</h3>
                <p className="text-sm text-muted-foreground">Dapat kuota saat tabungan lunas</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Packages Grid */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8">Pilih Paket Tabungan</h2>
          
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <Skeleton className="h-48 w-full" />
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : packages.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <Card key={pkg.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative h-48">
                    <img
                      src={pkg.featured_image || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=600'}
                      alt={pkg.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3">
                      <Badge>{formatPackageType(pkg.package_type)}</Badge>
                    </div>
                  </div>
                  
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-1">{pkg.name}</CardTitle>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {pkg.duration_days} Hari
                      </span>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <div className="pt-2 border-t">
                      <p className="text-sm text-muted-foreground mb-1">Target Tabungan</p>
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(pkg.savings_target)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Cicilan mulai dari {formatCurrency(Math.round(pkg.savings_target / 12))}/bulan (tenor 12 bulan)
                      </p>
                    </div>
                  </CardContent>
                  
                  <CardFooter>
                    <Button asChild className="w-full">
                      <Link to={`/savings/register/${pkg.id}`}>
                        <Wallet className="h-4 w-4 mr-2" />
                        Mulai Menabung
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-12 w-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Belum Ada Paket Tersedia</h3>
              <p className="text-muted-foreground">
                Hubungi kami untuk informasi lebih lanjut tentang program tabungan umroh.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 bg-muted/50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Ada Pertanyaan?</h2>
          <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
            Tim kami siap membantu menjelaskan program tabungan umroh dan membantu Anda memilih paket yang tepat.
          </p>
          <Button variant="outline" size="lg">
            Hubungi Kami
          </Button>
        </div>
      </section>
    </DynamicPublicLayout>
  );
}
