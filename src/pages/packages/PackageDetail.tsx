import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPackageType } from '@/lib/format';
import { PackageBookingForm } from '@/components/packages/PackageBookingForm';

import { 
  Clock, MapPin, Plane, Building2, Users, 
  Check, X, Star, ChevronLeft
} from 'lucide-react';

export default function PackageDetail() {
  const { id } = useParams<{ id: string }>();

  const { data: pkg, isLoading } = useQuery({
    queryKey: ['package', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('packages')
        .select(`
          *,
          airline:airlines(*),
          hotel_makkah:hotels!packages_hotel_makkah_id_fkey(*),
          hotel_madinah:hotels!packages_hotel_madinah_id_fkey(*),
          muthawif:muthawifs(*),
          departures(*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <DynamicPublicLayout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-[400px] w-full rounded-xl mb-8" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-3/4" />
            </div>
            <Skeleton className="h-[300px]" />
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
          <p className="text-muted-foreground mb-8">Paket yang Anda cari tidak tersedia atau sudah dihapus.</p>
          <Button asChild><Link to="/packages">Kembali ke Katalog</Link></Button>
        </div>
      </DynamicPublicLayout>
    );
  }

  const includes = Array.isArray(pkg.includes) ? pkg.includes : [];
  const excludes = Array.isArray(pkg.excludes) ? pkg.excludes : [];
  const itinerary = Array.isArray(pkg.itinerary) ? pkg.itinerary : [];

  const upcomingDepartures = (pkg.departures || [])
    .filter((d: any) => new Date(d.departure_date) > new Date() && d.status === 'open')
    .sort((a: any, b: any) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime());

  return (
    <DynamicPublicLayout>
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-3">
          <Link to="/packages" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
            <ChevronLeft className="h-4 w-4 mr-1" />Kembali ke Katalog
          </Link>
        </div>
      </div>

      <div className="relative h-[300px] md:h-[400px] overflow-hidden">
        <img src={pkg.featured_image || 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=1200'} alt={pkg.name} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
          <div className="container mx-auto">
            <Badge className="mb-2">{formatPackageType(pkg.package_type)}</Badge>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">{pkg.name}</h1>
            <div className="flex flex-wrap gap-4 text-sm">
              <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{pkg.duration_days} Hari</span>
              {pkg.airline && <span className="flex items-center gap-1"><Plane className="h-4 w-4" />{(pkg.airline as any).name}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                <TabsTrigger value="hotels">Hotel</TabsTrigger>
                <TabsTrigger value="departures">Jadwal</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                <Card>
                  <CardHeader><CardTitle>Deskripsi Paket</CardTitle></CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground leading-relaxed">{pkg.description || 'Nikmati perjalanan ibadah yang nyaman dan penuh keberkahan dengan paket ini.'}</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Check className="h-5 w-5 text-primary" />Termasuk</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {includes.length > 0 ? includes.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />{item}</li>
                        )) : (
                          <>
                            <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-primary mt-0.5" />Tiket pesawat PP</li>
                            <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-primary mt-0.5" />Hotel sesuai paket</li>
                            <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-primary mt-0.5" />Visa umroh</li>
                            <li className="flex items-start gap-2 text-sm"><Check className="h-4 w-4 text-primary mt-0.5" />Muthawif berpengalaman</li>
                          </>
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-lg flex items-center gap-2"><X className="h-5 w-5 text-destructive" />Tidak Termasuk</CardTitle></CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {excludes.length > 0 ? excludes.map((item: string, i: number) => (
                          <li key={i} className="flex items-start gap-2 text-sm"><X className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />{item}</li>
                        )) : (
                          <>
                            <li className="flex items-start gap-2 text-sm"><X className="h-4 w-4 text-destructive mt-0.5" />Pengeluaran pribadi</li>
                            <li className="flex items-start gap-2 text-sm"><X className="h-4 w-4 text-destructive mt-0.5" />Handling/tip guide</li>
                            <li className="flex items-start gap-2 text-sm"><X className="h-4 w-4 text-destructive mt-0.5" />Laundry</li>
                          </>
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="itinerary" className="mt-6">
                <Card>
                  <CardHeader><CardTitle>Jadwal Perjalanan</CardTitle></CardHeader>
                  <CardContent>
                    {itinerary.length > 0 ? (
                      <div className="space-y-4">
                        {itinerary.map((day: any, i: number) => (
                          <div key={i} className="flex gap-4 pb-4 border-b last:border-0">
                            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="font-bold text-primary">Hari {i + 1}</span>
                            </div>
                            <div>
                              <h4 className="font-semibold">{day.title}</h4>
                              <p className="text-sm text-muted-foreground">{day.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">Itinerary lengkap akan diberikan setelah pendaftaran.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="hotels" className="mt-6">
                <div className="grid gap-6">
                  {pkg.hotel_makkah && (
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Hotel Mekkah</CardTitle></CardHeader>
                      <CardContent>
                        <div className="flex gap-4">
                          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center"><Building2 className="h-8 w-8 text-muted-foreground" /></div>
                          <div>
                            <h4 className="font-semibold">{(pkg.hotel_makkah as any).name}</h4>
                            <div className="flex items-center gap-1 my-1">
                              {Array.from({ length: (pkg.hotel_makkah as any).star_rating || 4 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-accent text-accent" />)}
                            </div>
                            {(pkg.hotel_makkah as any).distance_to_masjid && (
                              <p className="text-sm text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1" />{(pkg.hotel_makkah as any).distance_to_masjid} dari Masjidil Haram</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {pkg.hotel_madinah && (
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Hotel Madinah</CardTitle></CardHeader>
                      <CardContent>
                        <div className="flex gap-4">
                          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center"><Building2 className="h-8 w-8 text-muted-foreground" /></div>
                          <div>
                            <h4 className="font-semibold">{(pkg.hotel_madinah as any).name}</h4>
                            <div className="flex items-center gap-1 my-1">
                              {Array.from({ length: (pkg.hotel_madinah as any).star_rating || 4 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-accent text-accent" />)}
                            </div>
                            {(pkg.hotel_madinah as any).distance_to_masjid && (
                              <p className="text-sm text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1" />{(pkg.hotel_madinah as any).distance_to_masjid} dari Masjid Nabawi</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {!pkg.hotel_makkah && !pkg.hotel_madinah && (
                    <Card><CardContent className="py-8 text-center text-muted-foreground">Informasi hotel akan diupdate segera.</CardContent></Card>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="departures" className="mt-6">
                <Card>
                  <CardHeader><CardTitle>Jadwal Keberangkatan</CardTitle></CardHeader>
                  <CardContent>
                    {upcomingDepartures.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingDepartures.slice(0, 5).map((dep: any) => (
                          <div key={dep.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                              <p className="font-medium">{new Date(dep.departure_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                              <p className="text-sm text-muted-foreground"><Users className="h-3 w-3 inline mr-1" />Sisa kuota: {dep.quota - (dep.booked_count || 0)} seat</p>
                            </div>
                            <Button asChild size="sm"><Link to={`/booking/${pkg.id}?departure=${dep.id}`}>Pilih</Link></Button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">Belum ada jadwal keberangkatan tersedia.</p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <PackageBookingForm pkg={pkg} />

          </div>
        </div>
      </div>
    </DynamicPublicLayout>
  );
}
