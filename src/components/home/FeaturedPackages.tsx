import { usePackages } from '@/hooks/usePackages';
import { PackageCard } from '@/components/packages/PackageCard';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Crown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { WebsiteSettings } from '@/hooks/useWebsiteSettings';

interface FeaturedPackagesProps {
  settings?: WebsiteSettings;
}

export function FeaturedPackages({ settings }: FeaturedPackagesProps) {
  const { data: packages = [], isLoading } = usePackages();
  const isRoyal = settings?.template === 'royal';
  
  const packageCount = settings?.featured_packages_count || 3;
  
  // Get featured packages or first N
  const featuredPackages = packages
    .filter(p => p.is_featured)
    .slice(0, packageCount);
  
  const displayPackages = featuredPackages.length > 0 
    ? featuredPackages 
    : packages.slice(0, packageCount);

  return (
    <section className={`py-20 pb-24 transition-colors duration-500 ${isRoyal ? 'bg-[#0a0a0a] text-white' : 'bg-muted/30'}`}>
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-12">
          {isRoyal && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs font-bold tracking-widest uppercase mb-4">
              <Crown className="h-3 w-3" />
              Royal Selection
            </div>
          )}
          <span className={`${isRoyal ? 'text-amber-500' : 'text-primary'} font-semibold text-sm uppercase tracking-wider block`}>
            Paket Unggulan
          </span>
          <h2 className={`text-3xl md:text-4xl font-bold mt-2 mb-4 ${isRoyal ? 'text-white font-serif' : 'text-foreground'}`}>
            Pilihan Paket Terbaik Untuk Anda
          </h2>
          <p className={`${isRoyal ? 'text-gray-400' : 'text-muted-foreground'} max-w-2xl mx-auto`}>
            Temukan berbagai pilihan paket Umroh dan Haji dengan fasilitas terbaik, 
            harga kompetitif, dan pelayanan profesional.
          </p>
        </div>

        {/* Package Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: packageCount }).map((_, i) => (
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
        ) : displayPackages.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayPackages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} isRoyal={isRoyal} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Belum ada paket tersedia saat ini.</p>
          </div>
        )}

        {/* View All Button */}
        <div className="text-center mt-12">
          <Button 
            asChild 
            variant={isRoyal ? "outline" : "outline"} 
            size="lg" 
            className={`gap-2 ${isRoyal ? 'border-amber-500/30 text-amber-500 hover:bg-amber-500/10 rounded-full px-8' : ''}`}
          >
            <Link to="/packages">
              Lihat Semua Paket
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
