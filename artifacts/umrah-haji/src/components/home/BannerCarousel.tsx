import { useEffect, useCallback, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, ArrowRight, Crown, Zap, Leaf, Star } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Banner {
  id: string;
  title: string | null;
  subtitle: string | null;
  cta_text: string | null;
  cta_url: string | null;
  image_url: string;
  sort_order: number;
  is_active: boolean;
}

const AUTOPLAY_DELAY = 5000;

const DEMO_BANNERS: Banner[] = [
  {
    id: 'demo-1',
    title: 'Wujudkan Ibadah Suci Anda',
    subtitle: 'Layanan Umroh & Haji terpercaya dengan pengalaman lebih dari 15 tahun',
    cta_text: 'Lihat Paket',
    cta_url: '/packages',
    image_url: 'https://images.unsplash.com/photo-1591604129939-f1efa4d9f7fa?q=80&w=2070',
    sort_order: 1,
    is_active: true,
  },
  {
    id: 'demo-2',
    title: 'Paket Umroh Plus Istanbul',
    subtitle: 'Gabungkan ibadah suci dengan wisata islami yang menakjubkan',
    cta_text: 'Daftar Sekarang',
    cta_url: '/packages',
    image_url: 'https://images.unsplash.com/photo-1564769625905-50e93615e769?q=80&w=2070',
    sort_order: 2,
    is_active: true,
  },
  {
    id: 'demo-3',
    title: 'Haji Reguler & Khusus',
    subtitle: 'Bimbingan ibadah haji dengan pembimbing berpengalaman dan fasilitas terbaik',
    cta_text: 'Pelajari Lebih Lanjut',
    cta_url: '/packages',
    image_url: 'https://images.unsplash.com/photo-1609599006353-e629aaabfeae?q=80&w=2070',
    sort_order: 3,
    is_active: true,
  },
];

export type BannerTemplate = 'classic' | 'modern' | 'luxury' | 'islamic' | 'futuristic' | 'nature' | 'royal';

interface BannerCarouselProps {
  compact?: boolean;
  template?: BannerTemplate;
}

// ─── Theme config map ─────────────────────────────────────────────────────────
const themeConfig: Record<BannerTemplate, {
  wrapperBg: string;
  overlayClass: string;
  sectionHeight: string;
  titleClass: string;
  subtitleClass: string;
  ctaClass: string;
  prevNextClass: string;
  dotActive: string;
  dotInactive: string;
  contentAlign: string;
  badge?: { icon: React.ElementType; text: string; className: string };
  borderClass?: string;
  glowClass?: string;
}> = {
  classic: {
    wrapperBg: 'bg-primary/90',
    overlayClass: 'bg-gradient-to-r from-primary/80 via-primary/60 to-transparent',
    sectionHeight: 'min-h-[320px] md:min-h-[420px]',
    titleClass: 'text-2xl md:text-4xl lg:text-5xl font-bold text-white leading-tight drop-shadow-lg',
    subtitleClass: 'text-sm md:text-lg text-white/90 drop-shadow-md',
    ctaClass: 'inline-flex items-center gap-2 px-7 py-3 bg-white text-primary rounded-full font-bold text-sm md:text-base hover:bg-white/90 transition shadow-xl',
    prevNextClass: 'w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-sm border border-white/20',
    dotActive: 'w-6 h-2 bg-white',
    dotInactive: 'w-2 h-2 bg-white/50 hover:bg-white/75',
    contentAlign: 'items-center',
    badge: { icon: Star, text: 'Terpercaya Sejak 2010', className: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold mb-3 backdrop-blur-sm border border-white/20' },
  },
  modern: {
    wrapperBg: 'bg-white',
    overlayClass: 'bg-gradient-to-r from-white/90 via-white/70 to-transparent',
    sectionHeight: 'min-h-[280px] md:min-h-[380px]',
    titleClass: 'text-2xl md:text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight',
    subtitleClass: 'text-sm md:text-base text-slate-600',
    ctaClass: 'inline-flex items-center gap-2 px-7 py-3 bg-primary text-white rounded-lg font-bold text-sm md:text-base hover:bg-primary/90 transition shadow-lg shadow-primary/20',
    prevNextClass: 'w-9 h-9 rounded-lg bg-white/80 hover:bg-white text-slate-700 shadow-md border border-slate-200',
    dotActive: 'w-6 h-2 bg-primary rounded-full',
    dotInactive: 'w-2 h-2 bg-slate-300 rounded-full hover:bg-slate-400',
    contentAlign: 'items-center',
    borderClass: 'border-b-4 border-primary',
  },
  luxury: {
    wrapperBg: 'bg-[#faf9f6]',
    overlayClass: 'bg-gradient-to-r from-[#1a2e25]/80 via-[#1a2e25]/50 to-transparent',
    sectionHeight: 'min-h-[320px] md:min-h-[440px]',
    titleClass: 'text-2xl md:text-4xl lg:text-5xl font-serif italic text-white leading-tight',
    subtitleClass: 'text-sm md:text-base text-white/80 font-light',
    ctaClass: 'inline-flex items-center gap-2 px-7 py-3 bg-gradient-to-r from-amber-500 to-amber-400 text-black rounded-full font-bold text-sm md:text-base hover:from-amber-400 hover:to-amber-300 transition shadow-[0_4px_20px_rgba(217,119,6,0.4)]',
    prevNextClass: 'w-9 h-9 rounded-full bg-amber-500/20 hover:bg-amber-500/40 text-amber-400 border border-amber-500/30 backdrop-blur-sm',
    dotActive: 'w-6 h-2 bg-amber-400',
    dotInactive: 'w-2 h-2 bg-amber-400/40 hover:bg-amber-400/70',
    contentAlign: 'items-end pb-10',
    badge: { icon: Crown, text: 'Layanan Eksklusif & Premium', className: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-400 text-xs font-semibold mb-3 tracking-wider uppercase' },
    glowClass: 'after:absolute after:bottom-0 after:left-0 after:right-0 after:h-1 after:bg-gradient-to-r after:from-amber-600 after:to-transparent',
  },
  islamic: {
    wrapperBg: 'bg-primary/5',
    overlayClass: 'bg-gradient-to-r from-primary/75 via-primary/50 to-transparent',
    sectionHeight: 'min-h-[300px] md:min-h-[400px]',
    titleClass: 'text-2xl md:text-4xl lg:text-5xl font-black text-white leading-tight',
    subtitleClass: 'text-sm md:text-base text-white/90',
    ctaClass: 'inline-flex items-center gap-2 px-7 py-3 bg-white text-primary rounded-2xl font-bold text-sm md:text-base hover:bg-white/90 transition shadow-xl shadow-primary/20',
    prevNextClass: 'w-9 h-9 rounded-2xl bg-white/25 hover:bg-white/40 text-white border border-white/30 backdrop-blur-sm',
    dotActive: 'w-6 h-2 bg-white rounded-full',
    dotInactive: 'w-2 h-2 bg-white/50 rounded-full hover:bg-white/75',
    contentAlign: 'items-center',
    badge: { icon: Star, text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', className: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-sm font-arabic mb-3 backdrop-blur-sm' },
  },
  futuristic: {
    wrapperBg: 'bg-[#050505]',
    overlayClass: 'bg-gradient-to-r from-[#050505]/90 via-[#050505]/60 to-transparent',
    sectionHeight: 'min-h-[320px] md:min-h-[440px]',
    titleClass: 'text-2xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tighter',
    subtitleClass: 'text-sm md:text-base text-gray-400 font-light',
    ctaClass: 'inline-flex items-center gap-2 px-7 py-3 bg-primary text-black font-bold text-sm md:text-base hover:bg-primary/80 transition clip-futuristic',
    prevNextClass: 'w-9 h-9 bg-white/5 hover:bg-white/10 text-primary border border-white/10 backdrop-blur-sm',
    dotActive: 'w-6 h-2 bg-primary',
    dotInactive: 'w-2 h-2 bg-white/20 hover:bg-white/40',
    contentAlign: 'items-center',
    badge: { icon: Zap, text: 'Next-Gen Umrah Experience', className: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-primary text-xs font-bold tracking-widest uppercase mb-3 backdrop-blur-md' },
    glowClass: 'after:absolute after:inset-0 after:bg-[radial-gradient(ellipse_at_top-left,rgba(var(--primary-rgb),0.15),transparent_60%)] after:pointer-events-none',
  },
  nature: {
    wrapperBg: 'bg-[#fdfcf8]',
    overlayClass: 'bg-gradient-to-r from-[#2c3e2d]/80 via-[#2c3e2d]/50 to-transparent',
    sectionHeight: 'min-h-[300px] md:min-h-[420px]',
    titleClass: 'text-2xl md:text-4xl lg:text-5xl font-serif text-white leading-tight',
    subtitleClass: 'text-sm md:text-base text-white/85 font-light',
    ctaClass: 'inline-flex items-center gap-2 px-7 py-3 bg-emerald-700 hover:bg-emerald-600 text-white rounded-2xl font-medium text-sm md:text-base transition shadow-xl shadow-emerald-900/30',
    prevNextClass: 'w-9 h-9 rounded-full bg-white/20 hover:bg-white/40 text-white border border-white/20 backdrop-blur-sm',
    dotActive: 'w-6 h-2 bg-emerald-400 rounded-full',
    dotInactive: 'w-2 h-2 bg-white/40 rounded-full hover:bg-white/60',
    contentAlign: 'items-center',
    badge: { icon: Leaf, text: 'Perjalanan Penuh Berkah', className: 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-700/40 text-emerald-200 text-xs font-medium border border-emerald-500/30 mb-3 backdrop-blur-sm' },
  },
  royal: {
    wrapperBg: 'bg-[#0a0a0a]',
    overlayClass: 'bg-gradient-to-r from-[#0a0a0a]/90 via-[#0a0a0a]/60 to-transparent',
    sectionHeight: 'min-h-[340px] md:min-h-[480px]',
    titleClass: 'text-2xl md:text-4xl lg:text-6xl font-serif text-white leading-tight',
    subtitleClass: 'text-sm md:text-base text-gray-400',
    ctaClass: 'inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-400 text-black rounded-full font-bold text-sm md:text-base hover:from-amber-500 hover:to-amber-300 transition shadow-[0_0_20px_rgba(217,119,6,0.35)] hover:scale-105',
    prevNextClass: 'w-9 h-9 rounded-full bg-amber-500/10 hover:bg-amber-500/25 text-amber-400 border border-amber-500/30 backdrop-blur-sm',
    dotActive: 'w-6 h-2 bg-amber-400 rounded-full',
    dotInactive: 'w-2 h-2 bg-amber-400/30 rounded-full hover:bg-amber-400/60',
    contentAlign: 'items-center',
    badge: { icon: Crown, text: 'Royal Experience', className: 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-bold tracking-[0.2em] uppercase mb-3' },
    borderClass: 'ring-2 ring-amber-500/20',
  },
};

export function BannerCarousel({ compact = false, template = 'classic' }: BannerCarouselProps) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const { data: fetchedBanners } = useQuery({
    queryKey: ['public-banners'],
    queryFn: async (): Promise<Banner[]> => {
      try {
        const { data, error } = await (supabase as any)
          .from('banners')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true });
        if (error || !data || data.length === 0) return [];
        return data as Banner[];
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const banners = (fetchedBanners && fetchedBanners.length > 0) ? fetchedBanners : DEMO_BANNERS;
  const cfg = themeConfig[template] ?? themeConfig.classic;
  const BadgeIcon = cfg.badge?.icon;

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    onSelect();
    return () => { emblaApi.off('select', onSelect); };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!emblaApi || banners.length <= 1) return;
    const interval = setInterval(() => emblaApi.scrollNext(), AUTOPLAY_DELAY);
    return () => clearInterval(interval);
  }, [emblaApi, banners.length]);

  return (
    <section className={`relative w-full overflow-hidden ${cfg.wrapperBg} ${cfg.borderClass ?? ''} ${cfg.glowClass ?? ''}`}>
      {/* Futuristic clip-path style */}
      {template === 'futuristic' && (
        <style dangerouslySetInnerHTML={{ __html: `.clip-futuristic { clip-path: polygon(0 0, 100% 0, 95% 100%, 0 100%); }` }} />
      )}

      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {banners.map((banner) => (
            <div key={banner.id} className="relative flex-[0_0_100%] min-w-0">
              <div
                className={`relative w-full ${cfg.sectionHeight}`}
                style={{ minHeight: compact ? '180px' : undefined }}
              >
                {/* Background image */}
                <img
                  src={banner.image_url}
                  alt={banner.title ?? 'Banner'}
                  className={`absolute inset-0 w-full h-full object-cover ${
                    template === 'islamic' ? 'opacity-30 grayscale' : ''
                  } ${template === 'futuristic' ? 'opacity-40' : ''}`}
                  loading="lazy"
                />

                {/* Islamic pattern overlay */}
                {template === 'islamic' && (
                  <div
                    className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/islamic-art.png")' }}
                  />
                )}

                {/* Futuristic grid overlay */}
                {template === 'futuristic' && (
                  <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/carbon-fibre.png")' }} />
                )}

                {/* Royal paper texture */}
                {template === 'royal' && (
                  <div className="absolute inset-0 opacity-10 pointer-events-none"
                    style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/black-paper.png")' }} />
                )}

                {/* Nature leaf decoration */}
                {template === 'nature' && (
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-emerald-200/10 pointer-events-none hidden lg:block">
                    <Leaf className="w-48 h-48 rotate-45" />
                  </div>
                )}

                {/* Luxury gold line */}
                {template === 'luxury' && (
                  <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-amber-500/80 via-amber-400/40 to-transparent pointer-events-none" />
                )}

                {/* Gradient overlay */}
                <div className={`absolute inset-0 ${cfg.overlayClass} flex ${cfg.contentAlign}`}>
                  <div className={`px-8 md:px-14 lg:px-20 max-w-2xl w-full ${
                    template === 'royal' ? 'pt-6' : ''
                  }`}>

                    {/* Badge */}
                    {cfg.badge && BadgeIcon && !compact && (
                      <div className={cfg.badge.className}>
                        <BadgeIcon className="h-3 w-3" />
                        <span>{cfg.badge.text}</span>
                      </div>
                    )}

                    {banner.title && (
                      <h2 className={cfg.titleClass}>
                        {banner.title}
                      </h2>
                    )}

                    {banner.subtitle && !compact && (
                      <p className={`mt-2 mb-5 ${cfg.subtitleClass}`}>
                        {banner.subtitle}
                      </p>
                    )}

                    {banner.cta_text && banner.cta_url && !compact && (
                      <a href={banner.cta_url} className={cfg.ctaClass}>
                        {banner.cta_text}
                        <ArrowRight className="h-4 w-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Prev / Next */}
      {banners.length > 1 && (
        <>
          <button
            onClick={() => emblaApi?.scrollPrev()}
            className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center transition-all ${cfg.prevNextClass}`}
            aria-label="Sebelumnya"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => emblaApi?.scrollNext()}
            className={`absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center transition-all ${cfg.prevNextClass}`}
            aria-label="Berikutnya"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          {/* Dots */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 items-center">
            {scrollSnaps.map((_, index) => (
              <button
                key={index}
                onClick={() => emblaApi?.scrollTo(index)}
                className={`rounded-full transition-all duration-300 ${
                  index === selectedIndex ? cfg.dotActive : cfg.dotInactive
                }`}
                aria-label={`Slide ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
