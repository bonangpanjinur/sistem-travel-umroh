import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';

import { PackageSearch } from '@/components/packages/PackageSearch';
import { PackageCard } from '@/components/packages/PackageCard';
import { usePackages } from '@/hooks/usePackages';
import { useWebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useSEO } from '@/hooks/useSEO';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Grid3X3, List, SlidersHorizontal, Scale, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export default function PackageList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: packages = [], isLoading } = usePackages();
  const { data: settings } = useWebsiteSettings();

  const { data: packageGroups = [] } = useQuery({
    queryKey: ['public-package-groups'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('package_groups')
        .select('id,name,slug,color,display_order')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const siteTitle = settings?.company_name || "Vinstour Travel";
  const activePackages = packages.filter((p: any) => p.is_active !== false);

  useSEO({
    title: `Paket Umroh & Haji — ${siteTitle}`,
    description: activePackages.length > 0
      ? `Temukan ${activePackages.length} pilihan paket Umroh dan Haji terbaik dari ${siteTitle}. Tersedia berbagai pilihan paket reguler, plus, dan VIP dengan harga terjangkau.`
      : `Temukan pilihan paket Umroh dan Haji terbaik dari ${siteTitle}. Berbagai pilihan paket dengan layanan terpercaya.`,
    keywords: ['paket umroh', 'paket haji', 'umroh murah', 'haji plus', 'travel umroh', siteTitle.toLowerCase()],
    canonicalPath: '/packages',
    ogType: 'website',
    siteName: siteTitle,
    robots: 'index, follow',
    jsonLd: activePackages.length > 0 ? {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": `Paket Umroh & Haji — ${siteTitle}`,
      "description": `Daftar paket perjalanan ibadah Umroh dan Haji dari ${siteTitle}`,
      "url": `${typeof window !== 'undefined' ? window.location.origin : ''}/packages`,
      "numberOfItems": activePackages.length,
      "itemListElement": activePackages.slice(0, 20).map((pkg: any, idx: number) => ({
        "@type": "ListItem",
        "position": idx + 1,
        "name": pkg.name,
        "url": `${typeof window !== 'undefined' ? window.location.origin : ''}/packages/${pkg.id}-${pkg.name?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '')}`,
      })),
    } : undefined,
    schemaId: 'package-list',
  });
  
  const [sortBy, setSortBy] = useState('price_asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Group filter from URL
  const groupFilter = searchParams.get('group') || 'all';
  const setGroupFilter = (slug: string) => {
    const params = new URLSearchParams(searchParams);
    if (slug === 'all') params.delete('group'); else params.set('group', slug);
    setSearchParams(params);
  };
  
  // Design settings from database
  const cardLayout = settings?.package_card_layout || 'modern';
  const imageRatio = settings?.package_card_image_ratio || '16/10';
  const showAirline = settings?.package_card_show_airline ?? true;
  const showHotel = settings?.package_card_show_hotel ?? true;
  const showDuration = settings?.package_card_show_duration ?? true;
  const showDeparture = settings?.package_card_show_departure ?? true;

  // Filter from URL params
  const q = searchParams.get('q')?.toLowerCase() || '';
  const typeFilter = searchParams.get('type');
  const minPriceParam = searchParams.get('minPrice');
  const maxPriceParam = searchParams.get('maxPrice');
  const minPrice = minPriceParam ? Number(minPriceParam) : 0;
  const maxPrice = maxPriceParam ? Number(maxPriceParam) : Infinity;
  const durationFilter = searchParams.get('duration')?.split(',').filter(Boolean) || [];
  const currencyFilter = searchParams.get('currency') || 'all';

  // Helper: harga termurah dari semua tipe kamar (mengabaikan 0/null)
  const getStartingPrice = (p: any): number => {
    const candidates = [p.price_quad, p.price_triple, p.price_double, p.price_single]
      .map(v => Number(v) || 0)
      .filter(v => v > 0);
    return candidates.length > 0 ? Math.min(...candidates) : 0;
  };

  // Apply filters using useMemo for performance
  const filteredPackages = useMemo(() => {
    let result = [...packages];
    
    // Search keyword
    if (q) {
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        (p.description?.toLowerCase() || '').includes(q)
      );
    }

    // Package type
    if (typeFilter && typeFilter !== 'all') {
      result = result.filter(p => p.package_type === typeFilter);
    }

    // Currency filter
    if (currencyFilter && currencyFilter !== 'all') {
      result = result.filter(p => (p.currency || 'IDR').toUpperCase() === currencyFilter.toUpperCase());
    }

    // Price range — pakai harga termurah dan hanya apply bila user mengubah default
    if (minPrice > 0 || maxPrice !== Infinity) {
      result = result.filter(p => {
        const price = getStartingPrice(p);
        // Paket tabungan tanpa harga jamak tetap ditampilkan jika user tidak set min
        if (price === 0) return minPrice === 0;
        return price >= minPrice && price <= maxPrice;
      });
    }

    // Duration
    if (durationFilter.length > 0) {
      result = result.filter(p => {
        const d = p.duration_days || 0;
        if (durationFilter.includes('short') && d > 0 && d <= 9) return true;
        if (durationFilter.includes('21') && d >= 21) return true;
        if (durationFilter.includes('9') && d === 9) return true;
        if (durationFilter.includes('12') && d >= 10 && d <= 12) return true;
        if (durationFilter.includes('14') && d >= 13 && d <= 14) return true;
        // Paket tabungan (duration 0) dilewati saat filter durasi diaktifkan
        return false;
      });
    }

    // Group filter
    if (groupFilter && groupFilter !== 'all') {
      result = result.filter(p => (p as any).package_group?.slug === groupFilter);
    }

    // Sort packages
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return getStartingPrice(a) - getStartingPrice(b);
        case 'price_desc':
          return getStartingPrice(b) - getStartingPrice(a);
        case 'duration_asc':
          return a.duration_days - b.duration_days;
        case 'duration_desc':
          return b.duration_days - a.duration_days;
        case 'name_asc':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [packages, q, typeFilter, currencyFilter, minPrice, maxPrice, durationFilter, sortBy, groupFilter]);

  const handleFilterApplied = () => {
    setIsSheetOpen(false);
  };

  // Scroll to top when search params change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [searchParams]);

  return (
    <DynamicPublicLayout>

      {/* Header */}
      <section className="bg-primary py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Katalog Paket Umroh & Haji
          </h1>
          <p className="text-white/90 max-w-2xl mx-auto">
            Temukan paket perjalanan ibadah yang sesuai dengan kebutuhan dan budget Anda
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-6">
            <Button variant="secondary" size="sm" asChild className="gap-2">
              <Link to="/packages/compare">
                <Scale className="h-4 w-4" />
                Bandingkan Paket
              </Link>
            </Button>
            <Button variant="outline" size="sm" asChild className="gap-2 bg-white/10 text-white border-white/30 hover:bg-white/20">
              <Link to="/kalkulator">
                Kalkulator Biaya
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Group Filter Pills */}
      {packageGroups.length > 0 && (
        <section className="bg-background border-b">
          <div className="container mx-auto px-4 py-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              <button
                onClick={() => setGroupFilter('all')}
                className={cn(
                  "shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all border",
                  groupFilter === 'all'
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-primary"
                )}
              >
                Semua Paket
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                  groupFilter === 'all' ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                )}>
                  {packages.filter((p: any) => p.is_active !== false).length}
                </span>
              </button>
              {(packageGroups as any[]).map((grp: any) => {
                const count = packages.filter((p: any) => p.is_active !== false && (p as any).package_group?.slug === grp.slug).length;
                const active = groupFilter === grp.slug;
                return (
                  <button
                    key={grp.id}
                    onClick={() => setGroupFilter(grp.slug)}
                    className={cn(
                      "shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all border",
                      active
                        ? "text-white border-transparent shadow-sm"
                        : "bg-background border-border hover:border-transparent"
                    )}
                    style={active
                      ? { background: grp.color }
                      : { color: grp.color, borderColor: grp.color + '50' }
                    }
                  >
                    <span
                      className="inline-block h-2 w-2 rounded-full shrink-0"
                      style={{ background: active ? 'rgba(255,255,255,0.7)' : grp.color }}
                    />
                    {grp.name}
                    <span className={cn(
                      "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                      active ? "bg-white/20 text-white" : "bg-muted"
                    )}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Filter Bar */}
      <section className="border-b bg-background sticky top-16 z-40 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {/* Mobile Filter */}
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="md:hidden gap-2">
                    <SlidersHorizontal className="h-4 w-4" />
                    Filter
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle>Filter Paket</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 overflow-y-auto max-h-[calc(100vh-100px)] pr-2">
                    <PackageSearch onFilterApplied={handleFilterApplied} />
                  </div>
                </SheetContent>
              </Sheet>

              <p className="text-sm text-muted-foreground">
                Menampilkan <span className="font-medium text-foreground">{filteredPackages.length}</span> paket
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Currency filter */}
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Mata Uang</Label>
                <Select value={currencyFilter} onValueChange={(value) => {
                  const params = new URLSearchParams(searchParams);
                  if (value === 'all') params.delete('currency'); else params.set('currency', value);
                  setSearchParams(params);
                }}>
                  <SelectTrigger className="w-[120px] h-9">
                    <SelectValue placeholder="Mata Uang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua</SelectItem>
                    <SelectItem value="IDR">IDR</SelectItem>
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="SAR">SAR</SelectItem>
                    <SelectItem value="EUR">EUR</SelectItem>
                    <SelectItem value="MYR">MYR</SelectItem>
                    <SelectItem value="SGD">SGD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Sort */}
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Urutkan</Label>
                <Select value={sortBy} onValueChange={(value) => {
                  setSortBy(value);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}>
                  <SelectTrigger className="w-[160px] h-9">
                    <SelectValue placeholder="Urutkan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price_asc">Harga: Terendah</SelectItem>
                    <SelectItem value="price_desc">Harga: Tertinggi</SelectItem>
                    <SelectItem value="duration_asc">Durasi: Terpendek</SelectItem>
                    <SelectItem value="duration_desc">Durasi: Terlama</SelectItem>
                    <SelectItem value="name_asc">Nama: A-Z</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* View Toggle */}
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold">Tampilan</Label>
                <div className="flex items-center border rounded-md h-9 p-0.5 bg-muted/50">
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-8 bg-slate-50/50 min-h-screen">
        <div className="container mx-auto px-4">
          <div className="flex gap-8">
            {/* Sidebar - Desktop */}
            <aside className="hidden md:block w-72 flex-shrink-0">
              <div className="sticky top-32">
                <PackageSearch />
              </div>
            </aside>
            
            {/* Package Grid */}
            <div className="flex-1">
              {isLoading ? (
                <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="rounded-xl overflow-hidden border bg-card">
                      <Skeleton className="h-48 w-full" />
                      <div className="p-6 space-y-4">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                        <div className="flex justify-between pt-4">
                          <Skeleton className="h-8 w-24" />
                          <Skeleton className="h-10 w-28" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredPackages.length > 0 ? (
                <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'}`}>
                  {filteredPackages.map((pkg) => (
                    <PackageCard 
                      key={pkg.id} 
                      pkg={pkg} 
                      layout={cardLayout as any}
                      imageRatio={imageRatio as any}
                      viewMode={viewMode}
                      showAirline={showAirline}
                      showHotel={showHotel}
                      showDuration={showDuration}
                      showDeparture={showDeparture}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-24 bg-white rounded-2xl border border-dashed">
                  <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mx-auto mb-6">
                    <span className="text-5xl">🔍</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">
                    Tidak Ada Paket Ditemukan
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Maaf, kami tidak menemukan paket yang sesuai dengan kriteria filter Anda. Coba ubah filter atau reset pencarian.
                  </p>
                  <Button 
                    variant="outline" 
                    className="mt-6"
                    onClick={() => window.location.href = '/packages'}
                  >
                    Reset Semua Filter
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </DynamicPublicLayout>
  );
}
