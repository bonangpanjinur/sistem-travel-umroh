import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { slugify, extractIdFromSlug } from '@/lib/slug';
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
  Check, X, Star, ChevronLeft, ChevronDown, Calendar as CalendarIcon
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

export default function PackageDetail() {
  const { idSlug } = useParams<{ idSlug: string }>();
  const navigate = useNavigate();
  const id = extractIdFromSlug(idSlug || '');

  const { data: pkg, isLoading } = useQuery({
    queryKey: ['package', id],
    queryFn: async () => {
      if (!id) return null;
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

  // Redirect to correct slug if name changed or slug is missing
  useEffect(() => {
    if (pkg && idSlug) {
      const correctSlug = `${pkg.id}-${slugify(pkg.name)}`;
      if (idSlug !== correctSlug) {
        navigate(`/packages/${correctSlug}`, { replace: true });
      }
    }
  }, [pkg, idSlug, navigate]);

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

  const [openDepartureId, setOpenDepartureId] = useState<string | null>(upcomingDepartures.length > 0 ? upcomingDepartures[0].id : null);

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
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CalendarIcon className="h-5 w-5 text-primary" />
                      Jadwal Keberangkatan
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {upcomingDepartures.length > 0 ? (
                      <div className="space-y-3">
                        {upcomingDepartures.map((dep: any) => {
                          const isOpen = openDepartureId === dep.id;
                          const availableSeats = dep.quota - (dep.booked_count || 0);
                          const isAlmostFull = availableSeats < 5;
                          const duration = dep.return_date 
                            ? Math.ceil((new Date(dep.return_date).getTime() - new Date(dep.departure_date).getTime()) / (1000 * 60 * 60 * 24))
                            : pkg.duration_days;

                          return (
                            <div 
                              key={dep.id} 
                              className={cn(
                                "border rounded-xl overflow-hidden transition-all duration-300",
                                isOpen ? "ring-2 ring-primary/20 border-primary" : "hover:border-primary/30"
                              )}
                            >
                              <button
                                onClick={() => setOpenDepartureId(isOpen ? null : dep.id)}
                                className="w-full flex items-center justify-between p-4 bg-white hover:bg-muted/30 transition-colors"
                              >
                                <div className="flex items-center gap-4">
                                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex flex-col items-center justify-center text-primary">
                                    <span className="text-xs font-bold uppercase">{new Date(dep.departure_date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                                    <span className="text-lg font-black leading-none">{new Date(dep.departure_date).getDate()}</span>
                                  </div>
                                  <div className="text-left">
                                    <p className="font-bold text-base">{new Date(dep.departure_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric' })}</p>
                                    <div className="flex items-center gap-3 mt-0.5">
                                      <span className="text-xs flex items-center gap-1 text-muted-foreground">
                                        <Clock className="h-3 w-3" /> {duration} Hari
                                      </span>
                                      <span className={cn(
                                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                                        isAlmostFull ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                                      )}>
                                        {availableSeats} Sisa Kursi
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <ChevronDown className={cn("h-5 w-5 text-muted-foreground transition-transform duration-300", isOpen && "rotate-180")} />
                              </button>

                              <div className={cn(
                                "grid transition-all duration-300 ease-in-out",
                                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                              )}>
                                <div className="overflow-hidden">
                                  <div className="p-4 bg-muted/20 border-t grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Detail Perjalanan</p>
                                      <div className="space-y-2 mt-2">
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="text-muted-foreground">Berangkat:</span>
                                          <span className="font-semibold">{new Date(dep.departure_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                        </div>
                                        {dep.return_date && (
                                          <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Kembali:</span>
                                            <span className="font-semibold">{new Date(dep.return_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Transportasi</p>
                                      <div className="mt-2 flex items-center gap-3 p-2 rounded-lg bg-white border">
                                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center">
                                          <Plane className="h-4 w-4 text-primary" />
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Maskapai</p>
                                          <p className="text-sm font-bold">{(dep.airline as any)?.name || pkg.airline?.name || '-'}</p>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="space-y-1">
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status Kuota</p>
                                      <div className="mt-2 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                          <span className="text-muted-foreground">Terisi: {dep.booked_count || 0}</span>
                                          <span className="text-muted-foreground">Total: {dep.quota}</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                          <div 
                                            className={cn("h-full transition-all duration-500", isAlmostFull ? "bg-destructive" : "bg-primary")}
                                            style={{ width: `${((dep.booked_count || 0) / dep.quota) * 100}%` }}
                                          />
                                        </div>
                                        {isAlmostFull && (
                                          <p className="text-[10px] text-destructive font-bold animate-pulse">SEGERA HABIS! Sisa {availableSeats} kursi lagi.</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <CalendarIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-30" />
                        <p className="text-muted-foreground font-medium">Belum ada jadwal keberangkatan tersedia</p>
                        <p className="text-sm text-muted-foreground mt-1">Silakan hubungi kami untuk informasi lebih lanjut</p>
                      </div>
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
