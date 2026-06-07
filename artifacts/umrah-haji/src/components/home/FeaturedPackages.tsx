import { useQuery } from '@tanstack/react-query';
import { useTheme } from '@/lib/themes/useTheme';
import { supabase } from '@/integrations/supabase/client';
import { usePackages } from '@/hooks/usePackages';
import { PackageCard } from '@/components/packages/PackageCard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Crown, Star, Flame, Tag } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { WebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useMemo } from 'react';
import { Package } from '@/types/database';
import { useTenant } from '@/contexts/TenantContext';

interface FeaturedPackagesProps {
  settings?: WebsiteSettings;
}

function getPackageMinPrice(pkg: any): number {
  const deps = pkg.departures || [];
  let min = Infinity;
  deps.forEach((d: any) => {
    [d.price_quad, d.price_triple, d.price_double, d.price_single]
      .filter((p) => p && p > 0)
      .forEach((p) => { if (p < min) min = p; });
  });
  if (min === Infinity) {
    [pkg.price_quad, pkg.price_triple, pkg.price_double, pkg.price_single]
      .filter((p) => p && p > 0)
      .forEach((p) => { if (p < min) min = p; });
  }
  return min === Infinity ? 0 : min;
}

export function FeaturedPackages({ settings }: FeaturedPackagesProps) {
  const { data: packages = [], isLoading } = usePackages();
  const { tenant } = useTenant();
  const { isDark } = useTheme(settings); const isRoyal = isDark;
  const layout = settings?.package_card_layout || 'modern';
  const imageRatio = settings?.package_card_image_ratio || '16/10';
  const showAirline = settings?.package_card_show_airline ?? true;
  const showHotel = settings?.package_card_show_hotel ?? true;
  const showDuration = settings?.package_card_show_duration ?? true;
  const showDeparture = settings?.package_card_show_departure ?? true;
  const packageCount = settings?.featured_packages_count || 3;

  // Auto-compute popular by booking count
  const { data: popularityMap } = useQuery({
    queryKey: ['package-popularity'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bookings')
        .select('total_pax, departure:departures(package_id)')
        .neq('booking_status', 'cancelled');
      if (error) throw error;
      const map: Record<string, number> = {};
      (data || []).forEach((b: any) => {
        const pid = b.departure?.package_id;
        if (pid) map[pid] = (map[pid] || 0) + (b.total_pax || 0);
      });
      return map;
    },
    staleTime: 1000 * 60 * 10,
  });

  const groups = useMemo(() => {
    if (!packages.length) return { featured: [], popular: [], cheapest: [] };

    const featured = packages.filter((p: any) => p.is_featured).slice(0, packageCount);

    // Manual popular override, else auto by booking pax count
    const manualPopular = packages.filter((p: any) => p.is_popular);
    const popular = manualPopular.length
      ? manualPopular.slice(0, packageCount)
      : [...packages]
          .sort((a, b) => (popularityMap?.[b.id] || 0) - (popularityMap?.[a.id] || 0))
          .filter((p) => (popularityMap?.[p.id] || 0) > 0)
          .slice(0, packageCount);

    // Manual cheapest override, else auto by lowest price
    const manualCheapest = packages.filter((p: any) => p.is_cheapest);
    const cheapest = manualCheapest.length
      ? manualCheapest.slice(0, packageCount)
      : [...packages]
          .map((p) => ({ p, price: getPackageMinPrice(p) }))
          .filter((x) => x.price > 0)
          .sort((a, b) => a.price - b.price)
          .slice(0, packageCount)
          .map((x) => x.p);

    return { featured, popular, cheapest };
  }, [packages, popularityMap, packageCount]);

  // Fallback if no featured: use first N
  const displayFeatured = groups.featured.length > 0 ? groups.featured : packages.slice(0, packageCount);

  const renderGrid = (list: Package[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {list.map((pkg) => (
        <PackageCard
          key={pkg.id}
          pkg={pkg}
          isRoyal={isRoyal}
          layout={layout}
          imageRatio={imageRatio}
          showAirline={showAirline}
          showHotel={showHotel}
          showDuration={showDuration}
          showDeparture={showDeparture}
        />
      ))}
    </div>
  );

  const renderSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: packageCount }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden border bg-card">
          <Skeleton className="h-48 w-full" />
          <div className="p-6 space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <section className={`py-20 pb-24 transition-colors duration-500 ${isRoyal ? 'bg-background text-foreground' : 'bg-muted/30'}`}>
      <div className="container mx-auto px-4 space-y-20">
        {/* Featured */}
        <div>
          <div className="text-center mb-12">
            {isRoyal && (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold tracking-widest uppercase mb-4">
                <Crown className="h-3 w-3" />
                Royal Selection
              </div>
            )}
            <span className={`${isRoyal ? 'text-amber-500' : 'text-primary'} font-semibold text-sm uppercase tracking-wider inline-flex items-center gap-2`}>
              <Star className="h-4 w-4" /> Paket Unggulan
            </span>
            <h2 className={`text-3xl md:text-4xl font-bold mt-2 mb-4 ${isRoyal ? 'text-white font-serif' : 'text-foreground'}`}>
              Pilihan Paket Terbaik Untuk Anda
            </h2>
            <p className={`${isRoyal ? 'text-gray-400' : 'text-muted-foreground'} max-w-2xl mx-auto`}>
              Temukan berbagai pilihan paket Umroh dan Haji dengan fasilitas terbaik, harga kompetitif, dan pelayanan profesional.
            </p>
          </div>
          {isLoading ? renderSkeleton() : displayFeatured.length > 0 ? renderGrid(displayFeatured) : (
            <div className="text-center py-12"><p className="text-muted-foreground">Belum ada paket tersedia.</p></div>
          )}
        </div>

        {/* Popular */}
        {!isLoading && groups.popular.length > 0 && (
          <div>
            <div className="text-center mb-12">
              <span className={`${isRoyal ? 'text-amber-500' : 'text-primary'} font-semibold text-sm uppercase tracking-wider inline-flex items-center gap-2`}>
                <Flame className="h-4 w-4" /> Paket Terpopuler
              </span>
              <h2 className={`text-3xl md:text-4xl font-bold mt-2 mb-4 ${isRoyal ? 'text-white font-serif' : 'text-foreground'}`}>
                Paling Diminati Jamaah
              </h2>
              <p className={`${isRoyal ? 'text-gray-400' : 'text-muted-foreground'} max-w-2xl mx-auto`}>
                Paket dengan jumlah pemesan terbanyak.
              </p>
            </div>
            {renderGrid(groups.popular)}
          </div>
        )}

        {/* Cheapest */}
        {!isLoading && groups.cheapest.length > 0 && (
          <div>
            <div className="text-center mb-12">
              <span className={`${isRoyal ? 'text-amber-500' : 'text-primary'} font-semibold text-sm uppercase tracking-wider inline-flex items-center gap-2`}>
                <Tag className="h-4 w-4" /> Paket Termurah
              </span>
              <h2 className={`text-3xl md:text-4xl font-bold mt-2 mb-4 ${isRoyal ? 'text-white font-serif' : 'text-foreground'}`}>
                Hemat Tanpa Kompromi
              </h2>
              <p className={`${isRoyal ? 'text-gray-400' : 'text-muted-foreground'} max-w-2xl mx-auto`}>
                Pilihan paket dengan harga paling terjangkau.
              </p>
            </div>
            {renderGrid(groups.cheapest)}
          </div>
        )}

        {/* View All */}
        <div className="text-center">
          <Button asChild variant="outline" size="lg" className={`gap-2 ${isRoyal ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10 rounded-full px-8' : ''}`}>
            <Link to={
              tenant.type === 'agent'  && tenant.id ? `/packages?agent_id=${tenant.id}&pic_source=agen` :
              tenant.type === 'branch' && tenant.id ? `/packages?branch_id=${tenant.id}&pic_source=cabang` :
              '/packages'
            }>
              Lihat Semua Paket
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
