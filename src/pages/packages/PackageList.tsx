import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { DynamicPublicLayout } from '@/components/layout/DynamicPublicLayout';
import { PackageSearch } from '@/components/packages/PackageSearch';
import { PackageCard } from '@/components/packages/PackageCard';
import { usePackages } from '@/hooks/usePackages';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Grid3X3, List, SlidersHorizontal, LayoutGrid, Square, RectangleHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';

export default function PackageList() {
  const [searchParams] = useSearchParams();
  const { data: packages = [], isLoading } = usePackages();
  const [sortBy, setSortBy] = useState('price_asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  
  // Card Design Options
  const [cardLayout, setCardLayout] = useState<'modern' | 'classic' | 'minimal'>('modern');
  const [imageRatio, setImageRatio] = useState<'16/10' | '1/1' | '3/4' | '9/6'>('16/10');

  // Filter from URL params
  const q = searchParams.get('q')?.toLowerCase() || '';
  const typeFilter = searchParams.get('type');
  const minPrice = Number(searchParams.get('minPrice')) || 0;
  const maxPrice = Number(searchParams.get('maxPrice')) || Infinity;
  const durationFilter = searchParams.get('duration')?.split(',').filter(Boolean) || [];

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

    // Price range
    result = result.filter(p => {
      const price = p.price_quad || 0;
      return price >= minPrice && price <= maxPrice;
    });

    // Duration
    if (durationFilter.length > 0) {
      result = result.filter(p => {
        const d = p.duration_days.toString();
        if (durationFilter.includes('21') && p.duration_days >= 21) return true;
        return durationFilter.includes(d);
      });
    }

    // Sort packages
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price_asc':
          return (a.price_quad || 0) - (b.price_quad || 0);
        case 'price_desc':
          return (b.price_quad || 0) - (a.price_quad || 0);
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
  }, [packages, q, typeFilter, minPrice, maxPrice, durationFilter, sortBy]);

  const handleFilterApplied = () => {
    setIsSheetOpen(false);
  };

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
        </div>
      </section>

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
              {/* Card Customizer - Desktop */}
              <div className="hidden lg:flex items-center gap-4 mr-4 border-r pr-4">
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold">Desain Card</Label>
                  <Tabs value={cardLayout} onValueChange={(v: any) => setCardLayout(v)} className="h-8">
                    <TabsList className="h-8 p-0.5">
                      <TabsTrigger value="modern" className="text-[10px] px-2 h-7">Modern</TabsTrigger>
                      <TabsTrigger value="classic" className="text-[10px] px-2 h-7">Classic</TabsTrigger>
                      <TabsTrigger value="minimal" className="text-[10px] px-2 h-7">Minimal</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                
                <div className="flex flex-col gap-1">
                  <Label className="text-[10px] uppercase text-muted-foreground font-bold">Rasio Foto</Label>
                  <div className="flex items-center border rounded-md h-8 p-0.5 bg-muted/50">
                    <Button 
                      variant={imageRatio === '16/10' ? 'secondary' : 'ghost'} 
                      size="icon" className="h-7 w-7" 
                      onClick={() => setImageRatio('16/10')}
                      title="16:10"
                    >
                      <RectangleHorizontal className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant={imageRatio === '1/1' ? 'secondary' : 'ghost'} 
                      size="icon" className="h-7 w-7" 
                      onClick={() => setImageRatio('1/1')}
                      title="1:1"
                    >
                      <Square className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant={imageRatio === '3/4' ? 'secondary' : 'ghost'} 
                      size="icon" className="h-7 w-7" 
                      onClick={() => setImageRatio('3/4')}
                      title="3:4"
                    >
                      <div className="w-2.5 h-3.5 border-2 border-current rounded-[1px]" />
                    </Button>
                    <Button 
                      variant={imageRatio === '9/6' ? 'secondary' : 'ghost'} 
                      size="icon" className="h-7 w-7" 
                      onClick={() => setImageRatio('9/6')}
                      title="9:6"
                    >
                      <div className="w-3.5 h-2.5 border-2 border-current rounded-[1px]" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Sort */}
              <div className="flex flex-col gap-1">
                <Label className="text-[10px] uppercase text-muted-foreground font-bold lg:hidden">Urutkan</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
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
                <Label className="text-[10px] uppercase text-muted-foreground font-bold lg:hidden">Tampilan</Label>
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
                      layout={cardLayout}
                      imageRatio={imageRatio}
                      viewMode={viewMode}
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
