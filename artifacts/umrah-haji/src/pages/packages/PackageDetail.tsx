import { useParams, Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { slugify, extractIdFromSlug } from '@/lib/slug';
import { useQuery } from '@tanstack/react-query';
import { trackPackageView } from '@/hooks/useRecentlyViewedPackages';
import { supabase } from '@/integrations/supabase/client';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { formatPackageType } from '@/lib/format';
import { PackageBookingFormSimple } from '@/components/packages/PackageBookingFormSimple';

import { 
  Clock, MapPin, Plane, Building2, Users, 
  Check, X, Star, ChevronLeft, ChevronDown, Calendar as CalendarIcon,
  ArrowRight, Info, ShieldCheck, Globe, FileText, ChevronRight,
  Image as ImageIcon, Share2, Link2, MessageCircle, StarIcon,
  ThumbsUp
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function PackageDetail() {
  const [openDepartureId, setOpenDepartureId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [lightboxPhoto, setLightboxPhoto] = useState<any>(null);
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
          departures(
            *,
            airline:airlines(*),
            departure_airport:airports!departures_departure_airport_id_fkey(*),
            arrival_airport:airports!departures_arrival_airport_id_fkey(*)
          )
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch cancellation policy (package-specific first, then global fallback)
  const { data: cancellationPolicy } = useQuery({
    queryKey: ['pkg-cancellation-policy-public', id],
    queryFn: async () => {
      if (!id) return null;
      const { data: ownPolicy } = await (supabase as any)
        .from('cancellation_policies')
        .select('id, name, is_global, sections')
        .eq('package_id', id)
        .maybeSingle();
      if (ownPolicy) return { ...ownPolicy, isGlobal: false };
      const { data: globalPolicy } = await (supabase as any)
        .from('cancellation_policies')
        .select('id, name, is_global, sections')
        .eq('is_global', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      return globalPolicy ? { ...globalPolicy, isGlobal: true } : null;
    },
    enabled: !!id,
  });

  // Fetch package gallery photos
  const { data: galleryPhotos = [] } = useQuery({
    queryKey: ['package-gallery-public', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await (supabase as any)
        .from('media_gallery')
        .select('id, title, media_url, order_index')
        .eq('package_id', id)
        .eq('type', 'package_gallery')
        .eq('is_active', true)
        .order('order_index', { ascending: true });
      if (error && error.code !== '42P01') throw error;
      return data || [];
    },
    enabled: !!id,
  });

  // Fetch package reviews
  const { data: reviews = [] } = useQuery({
    queryKey: ['package-reviews-public', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await (supabase as any)
        .from('package_reviews')
        .select('id, rating, comment, reviewer_name, created_at')
        .eq('package_id', id)
        .order('created_at', { ascending: false });
      if (error && error.code !== '42P01') return [];
      return data || [];
    },
    enabled: !!id,
  });

  // Share helpers
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const [copyDone, setCopyDone] = useState(false);
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  };
  const handleWhatsAppShare = () => {
    const text = encodeURIComponent(`Cek paket umroh/haji "${pkg?.name}" di sini: ${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Fetch itinerary linked to the currently selected departure (if any)
  const { data: departureItinerary } = useQuery({
    queryKey: ['departure-itinerary-public', openDepartureId],
    queryFn: async () => {
      if (!openDepartureId) return null;
      const { data, error } = await supabase
        .from('departure_itineraries')
        .select(`
          customized_days,
         itinerary_template:itinerary_templates(id, name, description, duration_days, days)
        `)
        .eq('departure_id', openDepartureId)
        .maybeSingle();
      if (error && (error as any).code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!openDepartureId,
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

  useEffect(() => {
    if (pkg) {
      const upcomingDepartures = (pkg.departures || [])
        .filter((d: any) => new Date(d.departure_date) > new Date() && d.status === 'open')
        .sort((a: any, b: any) => new Date(a.departure_date).getTime() - new Date(b.departure_date).getTime());

      if (upcomingDepartures.length > 0 && !openDepartureId) {
        setOpenDepartureId(upcomingDepartures[0].id);
      }
    }
  }, [pkg, openDepartureId]);

  // Track this package view in recently viewed history
  useEffect(() => {
    if (pkg) {
      trackPackageView({
        id: pkg.id,
        name: pkg.name,
        package_type: pkg.package_type,
        duration_days: pkg.duration_days,
        price_quad: pkg.price_quad,
        currency: pkg.currency || 'IDR',
        featured_image: pkg.featured_image ?? null,
      });
    }
  }, [pkg?.id]);

  // Inject SEO meta tags dynamically
  useEffect(() => {
    if (!pkg) return;

    const siteTitle = "Vinstour Travel";
    const metaTitle = (pkg as any).meta_title || `${pkg.name} — ${siteTitle}`;
    const metaDesc = (pkg as any).meta_description || pkg.description || `Paket ${pkg.name} selama ${pkg.duration_days} hari bersama ${siteTitle}.`;
    const keywords: string[] = (pkg as any).keywords ?? [];

    document.title = metaTitle;

    const setMeta = (name: string, content: string, prop = false) => {
      const attr = prop ? "property" : "name";
      let el = document.querySelector<HTMLMetaElement>(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", metaDesc);
    if (keywords.length > 0) setMeta("keywords", keywords.join(", "));

    // Open Graph
    setMeta("og:title", metaTitle, true);
    setMeta("og:description", metaDesc, true);
    setMeta("og:type", "product", true);
    if (pkg.featured_image) setMeta("og:image", pkg.featured_image, true);
    setMeta("og:url", window.location.href, true);

    // Twitter Card
    setMeta("twitter:card", "summary_large_image");
    setMeta("twitter:title", metaTitle);
    setMeta("twitter:description", metaDesc);
    if (pkg.featured_image) setMeta("twitter:image", pkg.featured_image);

    return () => {
      document.title = siteTitle;
    };
  }, [pkg]);

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

  // Logic to get dynamic data from departures
  const getDynamicData = () => {
    if (!upcomingDepartures || upcomingDepartures.length === 0) return null;

    // 1. Get lowest prices from all departures
    const lowestPrices = {
      quad: Math.min(...upcomingDepartures.map((d: any) => d.price_quad).filter((p: number) => p > 0)) || 0,
      triple: Math.min(...upcomingDepartures.map((d: any) => d.price_triple).filter((p: number) => p > 0)) || 0,
      double: Math.min(...upcomingDepartures.map((d: any) => d.price_double).filter((p: number) => p > 0)) || 0,
      single: Math.min(...upcomingDepartures.map((d: any) => d.price_single).filter((p: number) => p > 0)) || 0,
    };

    // 2. Get hotel/airline from the departure with the highest price (highest tier)
    const highestTierDeparture = [...upcomingDepartures].reduce((prev: any, current: any) => {
      const maxPrev = Math.max(prev.price_quad || 0, prev.price_triple || 0, prev.price_double || 0, prev.price_single || 0);
      const maxCurrent = Math.max(current.price_quad || 0, current.price_triple || 0, current.price_double || 0, current.price_single || 0);
      return (maxCurrent > maxPrev) ? current : prev;
    }, upcomingDepartures[0]);

    return {
      lowestPrices,
      highestTierDeparture
    };
  };

  const dynamicData = getDynamicData();

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
            <div className="flex flex-wrap gap-4 text-sm items-center justify-between">
              <div className="flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-1"><Clock className="h-4 w-4" />{pkg.duration_days} Hari</span>
                {(dynamicData?.highestTierDeparture?.airline || pkg.airline) && (
                  <span className="flex items-center gap-1">
                    <Plane className="h-4 w-4" />
                    {(dynamicData?.highestTierDeparture?.airline as any)?.name || (pkg.airline as any).name}
                  </span>
                )}
              </div>
              {/* Share Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleWhatsAppShare}
                  className="flex items-center gap-1.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded-full px-3 py-1.5 transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </button>
                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-1.5 text-xs bg-white/20 hover:bg-white/30 text-white rounded-full px-3 py-1.5 backdrop-blur-sm transition-colors"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  {copyDone ? 'Tersalin!' : 'Salin Link'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                <TabsTrigger value="hotels">Hotel</TabsTrigger>
                <TabsTrigger value="flight">Penerbangan</TabsTrigger>
                <TabsTrigger value="departures">Jadwal</TabsTrigger>
                <TabsTrigger value="foto">
                  Foto {galleryPhotos.length > 0 && <span className="ml-1 text-xs bg-primary/15 text-primary rounded-full px-1.5">{galleryPhotos.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="ulasan">
                  Ulasan {reviews.length > 0 && <span className="ml-1 text-xs bg-primary/15 text-primary rounded-full px-1.5">{reviews.length}</span>}
                </TabsTrigger>
                <TabsTrigger value="syarat">Syarat & Ketentuan</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-primary" />
                      Deskripsi Paket
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div 
                      className="text-muted-foreground leading-relaxed whitespace-pre-wrap prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{ 
                        __html: pkg.description?.replace(/\n/g, '<br />') || 'Nikmati perjalanan ibadah yang nyaman dan penuh keberkahan dengan paket ini.' 
                      }}
                    />
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

              <TabsContent value="itinerary" className="mt-6 space-y-4">
                {/* Departure selector */}
                {upcomingDepartures.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    <span className="text-xs text-muted-foreground whitespace-nowrap font-medium">Pilih Tanggal:</span>
                    {upcomingDepartures.map((dep: any) => (
                      <button
                        key={dep.id}
                        onClick={() => setOpenDepartureId(dep.id)}
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-colors",
                          openDepartureId === dep.id
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-muted/40 text-muted-foreground border-muted hover:border-primary/40"
                        )}
                      >
                        {new Date(dep.departure_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </button>
                    ))}
                  </div>
                )}

                {/* Show which departure is selected */}
                {openDepartureId && upcomingDepartures.length > 0 && (() => {
                  const selDep = upcomingDepartures.find((d: any) => d.id === openDepartureId);
                  if (!selDep) return null;
                  return (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-primary/5 border border-primary/20 rounded-lg px-3 py-2">
                      <CalendarIcon className="h-3.5 w-3.5 text-primary" />
                      <span>Itinerary untuk keberangkatan <span className="font-semibold text-primary">{new Date(selDep.departure_date).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span></span>
                    </div>
                  );
                })()}

                <Card>
                  <CardHeader>
                    <CardTitle>Jadwal Perjalanan</CardTitle>
                    {departureItinerary?.itinerary_template?.name && (
                      <p className="text-xs text-muted-foreground">
                        Template: <span className="font-semibold">{departureItinerary.itinerary_template.name}</span>
                      </p>
                    )}
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const customized = Array.isArray(departureItinerary?.customized_days)
                        ? (departureItinerary!.customized_days as any[])
                        : null;
                      const templateDays = Array.isArray(departureItinerary?.itinerary_template?.days)
                        ? (departureItinerary!.itinerary_template!.days as any[])
                        : null;
                      const days = customized ?? templateDays ?? itinerary;

                      if (!days || days.length === 0) {
                        return (
                          <div className="text-center py-8 space-y-2">
                            <CalendarIcon className="h-10 w-10 mx-auto text-muted-foreground/30" />
                            <p className="text-muted-foreground text-sm">
                              {openDepartureId
                                ? "Itinerary untuk tanggal ini belum tersedia. Silakan hubungi kami untuk informasi lengkap."
                                : "Pilih tanggal keberangkatan untuk melihat itinerary."}
                            </p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          {days.map((day: any, i: number) => (
                            <div key={i} className="flex gap-4 pb-4 border-b last:border-0">
                              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <span className="font-bold text-primary text-sm">Hari {day.day || i + 1}</span>
                              </div>
                              <div className="flex-1">
                                <h4 className="font-semibold">{day.title || day.name || `Hari ${i + 1}`}</h4>
                                {day.description && (
                                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{day.description}</p>
                                )}
                                {Array.isArray(day.activities) && day.activities.length > 0 && (
                                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                                    {day.activities.map((act: any, ai: number) => (
                                      <li key={ai} className="flex items-start gap-2">
                                        {act.time && <span className="text-xs text-primary font-mono w-12 shrink-0 mt-0.5">{act.time}</span>}
                                        <span>{typeof act === 'string' ? act : act.activity || act.title || act.name}</span>
                                        {act.location && <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0"><MapPin className="h-2.5 w-2.5" />{act.location}</span>}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="hotels" className="mt-6">
                <div className="grid gap-6">
                  {(dynamicData?.highestTierDeparture?.hotel_makkah || pkg.hotel_makkah) && (
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Hotel Mekkah</CardTitle></CardHeader>
                      <CardContent>
                        <div className="flex gap-4">
                          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                            {((dynamicData?.highestTierDeparture?.hotel_makkah || pkg.hotel_makkah) as any).image_url ? (
                              <img src={((dynamicData?.highestTierDeparture?.hotel_makkah || pkg.hotel_makkah) as any).image_url} alt={((dynamicData?.highestTierDeparture?.hotel_makkah || pkg.hotel_makkah) as any).name} className="w-full h-full object-cover" />
                            ) : (
                              <Building2 className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold">{((dynamicData?.highestTierDeparture?.hotel_makkah || pkg.hotel_makkah) as any).name}</h4>
                            <div className="flex items-center gap-1 my-1">
                              {Array.from({ length: ((dynamicData?.highestTierDeparture?.hotel_makkah || pkg.hotel_makkah) as any).star_rating || 4 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-accent text-accent" />)}
                            </div>
                            {((dynamicData?.highestTierDeparture?.hotel_makkah || pkg.hotel_makkah) as any).distance_to_masjid && (
                              <p className="text-sm text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1" />{((dynamicData?.highestTierDeparture?.hotel_makkah || pkg.hotel_makkah) as any).distance_to_masjid} dari Masjidil Haram</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  {(dynamicData?.highestTierDeparture?.hotel_madinah || pkg.hotel_madinah) && (
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />Hotel Madinah</CardTitle></CardHeader>
                      <CardContent>
                        <div className="flex gap-4">
                          <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                            {((dynamicData?.highestTierDeparture?.hotel_madinah || pkg.hotel_madinah) as any).image_url ? (
                              <img src={((dynamicData?.highestTierDeparture?.hotel_madinah || pkg.hotel_madinah) as any).image_url} alt={((dynamicData?.highestTierDeparture?.hotel_madinah || pkg.hotel_madinah) as any).name} className="w-full h-full object-cover" />
                            ) : (
                              <Building2 className="h-8 w-8 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-semibold">{((dynamicData?.highestTierDeparture?.hotel_madinah || pkg.hotel_madinah) as any).name}</h4>
                            <div className="flex items-center gap-1 my-1">
                              {Array.from({ length: ((dynamicData?.highestTierDeparture?.hotel_madinah || pkg.hotel_madinah) as any).star_rating || 4 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-accent text-accent" />)}
                            </div>
                            {((dynamicData?.highestTierDeparture?.hotel_madinah || pkg.hotel_madinah) as any).distance_to_masjid && (
                              <p className="text-sm text-muted-foreground"><MapPin className="h-3 w-3 inline mr-1" />{((dynamicData?.highestTierDeparture?.hotel_madinah || pkg.hotel_madinah) as any).distance_to_masjid} dari Masjid Nabawi</p>
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

              <TabsContent value="flight" className="mt-6">
                <div className="grid gap-6">
                  {upcomingDepartures.length > 0 ? (
                    <div className="space-y-6">
                      {upcomingDepartures.map((dep: any, idx: number) => (
                        <Card key={dep.id} className={cn(idx > 0 && "opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all")}>
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Plane className="h-5 w-5 text-primary" />
                                Informasi Penerbangan
                              </CardTitle>
                              <Badge variant="outline">
                                {new Date(dep.departure_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-col md:flex-row gap-6 items-center">
                              {/* Airline Logo & Name */}
                              <div className="flex flex-col items-center text-center space-y-2 min-w-[150px]">
                                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border p-2">
                                  {dep.airline?.logo_url ? (
                                    <img src={dep.airline.logo_url} alt={dep.airline.name} className="w-full h-full object-contain" />
                                  ) : (
                                    <Plane className="h-8 w-8 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <p className="font-bold text-sm">{dep.airline?.name || pkg.airline?.name || 'Maskapai'}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{dep.flight_number || 'TBA'}</p>
                                </div>
                              </div>

                              {/* Route Visualization */}
                              <div className="flex-1 w-full">
                                <div className="flex items-center justify-between relative px-2">
                                  <div className="text-center z-10 bg-white px-2">
                                    <p className="text-2xl font-black text-primary">{dep.departure_airport?.code || 'CGK'}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{dep.departure_airport?.city || 'Jakarta'}</p>
                                  </div>
                                  
                                  <div className="flex-1 flex flex-col items-center justify-center relative">
                                    <div className="w-full h-[2px] bg-dashed border-t-2 border-dashed border-muted-foreground/30 absolute top-1/2 -translate-y-1/2" />
                                    <div className="bg-white p-1 z-10 rounded-full border shadow-sm">
                                      <Plane className="h-4 w-4 text-primary rotate-90" />
                                    </div>
                                    {dep.departure_time && (
                                      <span className="text-[10px] font-bold text-muted-foreground mt-6 bg-muted/50 px-2 py-0.5 rounded-full">
                                        {dep.departure_time}
                                      </span>
                                    )}
                                  </div>

                                  <div className="text-center z-10 bg-white px-2">
                                    <p className="text-2xl font-black text-primary">{dep.arrival_airport?.code || 'JED'}</p>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">{dep.arrival_airport?.city || 'Jeddah'}</p>
                                  </div>
                                </div>
                                
                                <div className="mt-6 grid grid-cols-2 gap-4">
                                  <div className="bg-muted/30 p-3 rounded-lg border border-dashed">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Keberangkatan</p>
                                    <p className="text-xs font-semibold">{dep.departure_airport?.name || 'Soekarno-Hatta Intl'}</p>
                                  </div>
                                  <div className="bg-muted/30 p-3 rounded-lg border border-dashed">
                                    <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Kedatangan</p>
                                    <p className="text-xs font-semibold">{dep.arrival_airport?.name || 'King Abdulaziz Intl'}</p>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t flex items-center gap-2 text-xs text-muted-foreground">
                              <Info className="h-3.5 w-3.5 text-primary" />
                              <span>Informasi penerbangan dapat berubah sewaktu-waktu sesuai kebijakan maskapai.</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="py-12 text-center">
                        <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-20" />
                        <p className="text-muted-foreground">Detail penerbangan akan diinformasikan segera.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Foto Galeri Tab */}
              <TabsContent value="foto" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5 text-primary" />
                      Galeri Foto
                      {galleryPhotos.length > 0 && (
                        <span className="text-sm font-normal text-muted-foreground">({galleryPhotos.length} foto)</span>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {galleryPhotos.length === 0 ? (
                      <div className="text-center py-10 space-y-2">
                        <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground/20" />
                        <p className="text-muted-foreground text-sm">Galeri foto paket ini belum tersedia.</p>
                        <p className="text-xs text-muted-foreground">Foto akan ditambahkan segera.</p>
                      </div>
                    ) : (
                      <>
                        <div className="columns-2 sm:columns-3 gap-3 space-y-3">
                          {galleryPhotos.map((photo: any, idx: number) => (
                            <div
                              key={photo.id}
                              className="break-inside-avoid rounded-xl overflow-hidden cursor-pointer group relative"
                              onClick={() => setLightboxPhoto(photo)}
                            >
                              <img
                                src={photo.media_url}
                                alt={photo.title || `Foto ${idx + 1}`}
                                className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                                loading="lazy"
                              />
                              {photo.title && (
                                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <p className="text-white text-xs font-medium line-clamp-1">{photo.title}</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                        <p className="text-xs text-muted-foreground text-center mt-4">Klik foto untuk memperbesar</p>
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Lightbox */}
                {lightboxPhoto && (
                  <div
                    className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
                    onClick={() => setLightboxPhoto(null)}
                  >
                    <button
                      className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                      onClick={() => setLightboxPhoto(null)}
                    >
                      <X className="h-5 w-5" />
                    </button>
                    {/* Prev / Next */}
                    {galleryPhotos.length > 1 && (
                      <>
                        <button
                          className="absolute left-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                          onClick={e => {
                            e.stopPropagation();
                            const idx = galleryPhotos.findIndex((p: any) => p.id === lightboxPhoto.id);
                            setLightboxPhoto(galleryPhotos[(idx - 1 + galleryPhotos.length) % galleryPhotos.length]);
                          }}
                        >
                          <ChevronLeft className="h-5 w-5" />
                        </button>
                        <button
                          className="absolute right-4 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-white/10 hover:bg-white/30 flex items-center justify-center text-white transition-colors"
                          onClick={e => {
                            e.stopPropagation();
                            const idx = galleryPhotos.findIndex((p: any) => p.id === lightboxPhoto.id);
                            setLightboxPhoto(galleryPhotos[(idx + 1) % galleryPhotos.length]);
                          }}
                        >
                          <ChevronRight className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    <img
                      src={lightboxPhoto.media_url}
                      alt={lightboxPhoto.title}
                      className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain"
                      onClick={e => e.stopPropagation()}
                    />
                    {lightboxPhoto.title && (
                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-4 py-2 rounded-full whitespace-nowrap">
                        {lightboxPhoto.title} <span className="text-white/50 ml-2">({galleryPhotos.findIndex((p: any) => p.id === lightboxPhoto.id) + 1}/{galleryPhotos.length})</span>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* ── Ulasan Tab ─────────────────────────────────────────── */}
              <TabsContent value="ulasan" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <StarIcon className="h-5 w-5 text-amber-400" />
                      Ulasan Jamaah
                      {reviews.length > 0 && (
                        <Badge variant="secondary" className="ml-1">{reviews.length} ulasan</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reviews.length === 0 ? (
                      <div className="text-center py-12 space-y-3">
                        <StarIcon className="h-12 w-12 mx-auto text-muted-foreground/30" />
                        <p className="font-medium text-muted-foreground">Belum ada ulasan untuk paket ini</p>
                        <p className="text-sm text-muted-foreground">Jadilah yang pertama memberikan ulasan setelah perjalanan Anda!</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Rating summary */}
                        {(() => {
                          const avg = reviews.reduce((s: number, r: any) => s + (r.rating || 0), 0) / reviews.length;
                          const dist = [5, 4, 3, 2, 1].map(n => ({
                            stars: n,
                            count: reviews.filter((r: any) => r.rating === n).length,
                          }));
                          return (
                            <div className="flex items-center gap-8 p-4 bg-muted/30 rounded-xl">
                              <div className="text-center">
                                <p className="text-4xl font-black text-amber-500">{avg.toFixed(1)}</p>
                                <div className="flex items-center gap-0.5 justify-center mt-1">
                                  {[1, 2, 3, 4, 5].map(n => (
                                    <Star key={n} className={cn("h-4 w-4", n <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30")} />
                                  ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{reviews.length} ulasan</p>
                              </div>
                              <div className="flex-1 space-y-1.5">
                                {dist.map(({ stars, count }) => (
                                  <div key={stars} className="flex items-center gap-2">
                                    <span className="text-xs w-4 text-right text-muted-foreground">{stars}</span>
                                    <Star className="h-3 w-3 fill-amber-400 text-amber-400 shrink-0" />
                                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-amber-400 rounded-full transition-all"
                                        style={{ width: reviews.length > 0 ? `${(count / reviews.length) * 100}%` : '0%' }}
                                      />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-5">{count}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}

                        {/* Review list */}
                        <div className="space-y-4">
                          {reviews.map((review: any) => (
                            <div key={review.id} className="border rounded-xl p-4 space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                    {(review.reviewer_name || 'A').charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-sm">{review.reviewer_name || 'Anonim'}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {new Date(review.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-0.5">
                                  {[1, 2, 3, 4, 5].map(n => (
                                    <Star key={n} className={cn("h-4 w-4", n <= (review.rating || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/20")} />
                                  ))}
                                </div>
                              </div>
                              {review.comment && (
                                <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Syarat & Ketentuan Tab */}
              <TabsContent value="syarat" className="mt-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <ShieldCheck className="h-5 w-5 text-primary" />
                          Syarat & Ketentuan
                        </CardTitle>
                        {cancellationPolicy && (
                          <div className="flex items-center gap-1.5 mt-1">
                            {cancellationPolicy.isGlobal ? (
                              <span className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-full px-2 py-0.5">
                                <Globe className="h-3 w-3" />
                                Aturan Umum
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                <ShieldCheck className="h-3 w-3" />
                                Aturan Khusus Paket Ini
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!cancellationPolicy ? (
                      <div className="text-center py-10 space-y-2">
                        <FileText className="h-10 w-10 mx-auto text-muted-foreground/30" />
                        <p className="text-sm text-muted-foreground">Informasi syarat & ketentuan akan segera tersedia.</p>
                        <p className="text-xs text-muted-foreground">Silakan hubungi kami untuk keterangan lebih lanjut.</p>
                      </div>
                    ) : (
                      <div className="space-y-5">
                        {(cancellationPolicy.sections as any[]).map((section: any, si: number) => (
                          <div key={si}>
                            <h4 className="text-sm font-bold uppercase tracking-wide text-foreground mb-2 pb-1 border-b">
                              {section.title}
                            </h4>
                            <ul className="space-y-1.5">
                              {(section.items as string[]).filter((item: string) => item.trim()).map((item: string, ii: number) => (
                                <li key={ii} className="flex items-start gap-2 text-sm text-muted-foreground">
                                  <ChevronRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                  <span>{item}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground italic border-t pt-3 mt-3">
                          Dengan melakukan pendaftaran, Anda dianggap telah membaca, memahami, dan menyetujui seluruh syarat & ketentuan di atas.
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
                                onClick={() => {
                                  const next = isOpen ? null : dep.id;
                                  setOpenDepartureId(next);
                                  if (next) setActiveTab("itinerary");
                                }}
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
                                        <div className="h-8 w-8 rounded bg-muted flex items-center justify-center overflow-hidden">
                                          {dep.airline?.logo_url ? (
                                            <img src={dep.airline.logo_url} alt={dep.airline.name} className="w-full h-full object-contain p-1" />
                                          ) : (
                                            <Plane className="h-4 w-4 text-primary" />
                                          )}
                                        </div>
                                        <div>
                                          <p className="text-xs text-muted-foreground">Maskapai</p>
                                          <p className="text-sm font-bold">{dep.airline?.name || pkg.airline?.name || '-'}</p>
                                        </div>
                                      </div>
                                      {dep.flight_number && (
                                        <p className="text-[10px] mt-1 text-muted-foreground font-mono px-2">Flight: {dep.flight_number}</p>
                                      )}
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
            <PackageBookingFormSimple pkg={pkg} />
          </div>
        </div>
      </div>
    </DynamicPublicLayout>
  );
}
