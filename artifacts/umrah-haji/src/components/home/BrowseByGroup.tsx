import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePackages } from '@/hooks/usePackages';
import { Link } from 'react-router-dom';
import { ArrowRight, FolderOpen } from 'lucide-react';
import { useMemo } from 'react';
import { WebsiteSettings } from '@/hooks/useWebsiteSettings';
import { useTheme } from '@/lib/themes/useTheme';
import { Skeleton } from '@/components/ui/skeleton';

interface BrowseByGroupProps {
  settings?: WebsiteSettings;
}

const KAABA_BG =
  'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?w=800&auto=format&fit=crop&q=60';

const PATTERN_SVG = encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80">
    <polygon points="40,2 78,21 78,59 40,78 2,59 2,21" fill="none" stroke="white" stroke-width="1.2" stroke-opacity="0.25"/>
    <polygon points="40,14 66,27 66,53 40,66 14,53 14,27" fill="none" stroke="white" stroke-width="0.8" stroke-opacity="0.18"/>
    <circle cx="40" cy="40" r="5" fill="white" fill-opacity="0.12"/>
  </svg>`
);

function getGridClass(n: number) {
  if (n <= 2) return 'grid-cols-1 sm:grid-cols-2';
  if (n === 3) return 'grid-cols-1 sm:grid-cols-3';
  if (n === 4) return 'grid-cols-2 sm:grid-cols-4';
  return 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5';
}

export function BrowseByGroup({ settings }: BrowseByGroupProps) {
  const { isDark } = useTheme(settings);
  const isRoyal = isDark;

  const { data: packageGroups = [], isLoading: isLoadingGroups } = useQuery({
    queryKey: ['public-package-groups'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('package_types')
        .select('id,name,color,description,display_order')
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  const { data: packages = [], isLoading: isLoadingPkgs } = usePackages();

  const groupsWithCount = useMemo(() => {
    return (packageGroups as any[])
      .map(grp => ({
        ...grp,
        count: packages.filter(
          (p: any) => p.is_active !== false && (p as any).package_group?.slug === grp.slug
        ).length,
      }))
      .filter(g => g.count > 0);
  }, [packageGroups, packages]);

  const isLoading = isLoadingGroups || isLoadingPkgs;

  if (!isLoading && groupsWithCount.length === 0) return null;

  const gridClass = getGridClass(groupsWithCount.length);

  return (
    <section className={`py-20 transition-colors duration-500 ${isRoyal ? 'bg-[#0d0d0d]' : 'bg-slate-50'}`}>
      <div className="container mx-auto px-4">
        {/* Section header */}
        <div className="text-center mb-12">
          <span
            className={`${isRoyal ? 'text-amber-500' : 'text-primary'} font-semibold text-sm uppercase tracking-wider inline-flex items-center gap-2`}
          >
            <FolderOpen className="h-4 w-4" /> Kategori Perjalanan
          </span>
          <h2
            className={`text-3xl md:text-4xl font-bold mt-2 mb-4 ${isRoyal ? 'text-white font-serif' : 'text-foreground'}`}
          >
            Temukan Paket Sesuai Kebutuhan Anda
          </h2>
          <p className={`${isRoyal ? 'text-gray-400' : 'text-muted-foreground'} max-w-xl mx-auto`}>
            Jelajahi berbagai kategori perjalanan ibadah — dari Ramadhan, Reguler, hingga Haji Plus — dan temukan yang paling tepat untuk Anda.
          </p>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className={`grid gap-4 ${gridClass}`}>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} className="rounded-2xl aspect-[4/3] w-full" />
            ))}
          </div>
        ) : (
          <div className={`grid gap-4 ${gridClass}`}>
            {groupsWithCount.map((grp: any) => (
              <Link
                key={grp.id}
                to={`/packages?group=${grp.slug}`}
                className="group relative overflow-hidden rounded-2xl aspect-[4/3] block"
                aria-label={`Lihat paket ${grp.name}`}
              >
                {/* Mecca bg image (subtle, very dark) */}
                <div
                  className="absolute inset-0 bg-cover bg-center scale-105 group-hover:scale-110 transition-transform duration-700"
                  style={{ backgroundImage: `url(${KAABA_BG})` }}
                />

                {/* Color overlay */}
                <div
                  className="absolute inset-0 transition-opacity duration-300 group-hover:opacity-80"
                  style={{
                    background: `linear-gradient(145deg, ${grp.color}e8 0%, ${grp.color}b0 60%, ${grp.color}70 100%)`,
                  }}
                />

                {/* Islamic geometric pattern */}
                <div
                  className="absolute inset-0 opacity-20"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,${PATTERN_SVG}")`,
                    backgroundSize: '80px 80px',
                  }}
                />

                {/* Bottom gradient for text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                {/* Package count — top right */}
                <div className="absolute top-3 right-3">
                  <span className="bg-white/20 backdrop-blur-sm border border-white/30 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
                    {grp.count} paket
                  </span>
                </div>

                {/* Text content — bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <h3 className="text-white font-black text-xl leading-tight mb-1 drop-shadow-sm">
                    {grp.name}
                  </h3>
                  {grp.description && (
                    <p className="text-white/70 text-xs line-clamp-1 mb-3">{grp.description}</p>
                  )}
                  <span className="inline-flex items-center gap-1 text-white/90 text-xs font-bold group-hover:gap-2.5 transition-all duration-200">
                    Lihat Paket
                    <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>

                {/* Hover border glow */}
                <div
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ring-2 ring-inset ring-white/20"
                />
              </Link>
            ))}
          </div>
        )}

        {/* View all link */}
        {!isLoading && groupsWithCount.length > 0 && (
          <div className="text-center mt-10">
            <Link
              to="/packages"
              className={`inline-flex items-center gap-2 text-sm font-bold transition-colors ${
                isRoyal ? 'text-amber-500 hover:text-amber-400' : 'text-primary hover:text-primary/80'
              }`}
            >
              Lihat Semua Paket
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
